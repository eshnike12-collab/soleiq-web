"""
SQLite metadata store for scans and their frames.

Plain `sqlite3` from the standard library — no ORM, no migration framework,
no new dependency. `CREATE TABLE IF NOT EXISTS` plus a short additive
`ALTER TABLE` list (see MIGRATIONS) is the whole migration story, and a
debugging database you can open with any SQLite browser is worth more here
than a framework.

Concurrency: reconstruction runs on a worker thread, so connections are
per-call rather than shared, and WAL is enabled so a read (the debug UI) never
blocks a write (a scan in progress).
"""

from __future__ import annotations

import json
import logging
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from .config import CONFIG

log = logging.getLogger("soleiq.store.db")

SCHEMA_VERSION = 4

SCHEMA = """
create table if not exists scans (
    scan_id          text primary key,
    created_at       integer not null,          -- epoch ms
    updated_at       integer not null,
    status           text    not null,          -- see STATUSES below
    side             text,                      -- 'left' | 'right' | null
    raw_video_path   text,
    total_frames     integer not null default 0,
    accepted_frames  integer not null default 0,
    rejected_frames  integer not null default 0,
    failure_reason   text,                      -- verbatim message on failure
    failure_stage    text,                      -- which step it died in
    recon_job_id     text,
    artifacts_json   text,                      -- {glb, cameras, quality} paths
    quality_json     text,                      -- the service's quality.json
    viewpoint_spread integer,                   -- distinct viewpoints in the accepted set
    bank_id          text                       -- frames accumulate across scans sharing this
);

create table if not exists frames (
    scan_id          text    not null references scans(scan_id) on delete cascade,
    frame_index      integer not null,
    timestamp_ms     integer not null,          -- position within the video
    image_path       text    not null,
    width            integer,
    height           integer,
    blur_score       real,
    brightness_score real,
    skin_fraction    real,
    similarity_prev  real,                      -- 1.0 == identical to previous kept frame
    novelty_score    real,                      -- 1 - max sim vs the recent accepted window; 0 == a copy
    accepted         integer not null,          -- 0 | 1, quality only
    reject_reason    text,                      -- null when accepted
    banked           integer,                   -- 1 when saved into the bank
    bank_reason      text,                      -- why a quality-passing frame was not banked
    primary key (scan_id, frame_index)
);

create index if not exists frames_scan_idx     on frames(scan_id);
create index if not exists frames_accepted_idx on frames(scan_id, accepted);
create index if not exists scans_created_idx   on scans(created_at desc);

create table if not exists schema_meta (
    key   text primary key,
    value text not null
);
"""

# Lifecycle. Kept as plain strings so the DB is readable without the code.
STATUSES = (
    "created",       # row exists, nothing uploaded yet
    "uploaded",      # raw video on disk
    "extracting",    # pulling frames out of the video
    "scoring",       # computing per-frame quality
    "banked",        # frames kept and added to the bank; more still needed
    "reconstructing",
    "done",
    "failed",
)


def _now_ms() -> int:
    return int(time.time() * 1000)


# Columns added after the first release. Applied to existing databases on
# open, so a debugging session started last week keeps its scans instead of
# hitting "no such column". Additive only — nothing here drops or rewrites.
MIGRATIONS: tuple[tuple[str, str, str], ...] = (
    ("frames", "novelty_score", "real"),
    ("scans", "viewpoint_spread", "integer"),
    ("scans", "bank_id", "text"),
    ("frames", "banked", "integer"),
    ("frames", "bank_reason", "text"),
)


# Indexes over migrated columns. These cannot live in SCHEMA: on an existing
# database `create table if not exists` is a no-op, so the column does not
# exist yet when the script runs and the index creation fails outright.
POST_MIGRATION_INDEXES = (
    "create index if not exists scans_bank_idx on scans(bank_id)",
)


def _migrate(conn: sqlite3.Connection) -> None:
    for table, column, coltype in MIGRATIONS:
        existing = {r[1] for r in conn.execute(f"pragma table_info({table})")}
        if column not in existing:
            conn.execute(f"alter table {table} add column {column} {coltype}")
            log.info("db migration: added %s.%s", table, column)
    for stmt in POST_MIGRATION_INDEXES:
        conn.execute(stmt)


def init_db(db_path: Path | None = None) -> Path:
    """Create the database and its parent directory if absent. Idempotent."""
    path = db_path or CONFIG.db_path
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)
        conn.execute(
            "insert into schema_meta(key, value) values('version', ?) "
            "on conflict(key) do update set value = excluded.value",
            (str(SCHEMA_VERSION),),
        )
        conn.commit()
    return path


@contextmanager
def connect(db_path: Path | None = None) -> Iterator[sqlite3.Connection]:
    path = db_path or CONFIG.db_path
    conn = sqlite3.connect(path, timeout=15)
    conn.row_factory = sqlite3.Row
    # WAL lets the debug UI read while a scan is still being written.
    conn.execute("pragma journal_mode=WAL")
    conn.execute("pragma foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Scans
# ---------------------------------------------------------------------------

def create_scan(
    scan_id: str, side: str | None = None, bank_id: str | None = None
) -> None:
    now = _now_ms()
    with connect() as c:
        c.execute(
            "insert into scans(scan_id, created_at, updated_at, status, side, bank_id) "
            "values(?,?,?,?,?,?)",
            (scan_id, now, now, "created", side, bank_id),
        )


# ---------------------------------------------------------------------------
# Banks
#
# A bank is every scan sharing a bank_id — normally one patient's one foot.
# Its accepted frames accumulate across attempts, so a scan that fell short
# tops up the pile rather than starting a new one. Reconstruction runs on the
# whole bank, not on the last attempt.
# ---------------------------------------------------------------------------

def bank_scan_ids(bank_id: str) -> list[str]:
    with connect() as c:
        rows = c.execute(
            "select scan_id from scans where bank_id = ? order by created_at",
            (bank_id,),
        ).fetchall()
    return [r["scan_id"] for r in rows]


def get_bank_frames(bank_id: str) -> list[dict]:
    """Every accepted frame in the bank, oldest scan first.

    Ordered by the scan's creation time then frame index, so the sequence
    still reflects capture order within each attempt — which matters, since
    neighbouring frames of one sweep are the pairs that match best.
    """
    with connect() as c:
        rows = c.execute(
            "select f.* from frames f "
            "join scans s on s.scan_id = f.scan_id "
            "where s.bank_id = ? and f.banked = 1 "
            "order by s.created_at, f.frame_index",
            (bank_id,),
        ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["accepted"] = bool(d["accepted"])
        out.append(d)
    return out


def bank_summary(bank_id: str) -> dict:
    with connect() as c:
        row = c.execute(
            "select count(*) as scans, "
            "       coalesce(sum(total_frames), 0) as sampled "
            "from scans where bank_id = ?",
            (bank_id,),
        ).fetchone()
        acc = c.execute(
            "select count(*) as n from frames f join scans s on s.scan_id = f.scan_id "
            "where s.bank_id = ? and f.banked = 1",
            (bank_id,),
        ).fetchone()
    return {
        "bank_id": bank_id,
        "scans": row["scans"],
        "sampled_frames": row["sampled"],
        "accepted_frames": acc["n"],
    }


def update_scan(scan_id: str, **fields: Any) -> None:
    """Patch a scan row. Unknown keys raise rather than being silently dropped."""
    allowed = {
        "status", "side", "raw_video_path", "total_frames", "accepted_frames",
        "rejected_frames", "failure_reason", "failure_stage", "recon_job_id",
        "artifacts_json", "quality_json", "viewpoint_spread", "bank_id",
    }
    bad = set(fields) - allowed
    if bad:
        raise ValueError(f"unknown scan fields: {sorted(bad)}")
    if not fields:
        return
    cols = ", ".join(f"{k} = ?" for k in fields)
    with connect() as c:
        c.execute(
            f"update scans set {cols}, updated_at = ? where scan_id = ?",
            (*fields.values(), _now_ms(), scan_id),
        )


def get_scan(scan_id: str) -> dict | None:
    with connect() as c:
        row = c.execute("select * from scans where scan_id = ?", (scan_id,)).fetchone()
    return _scan_row(row) if row else None


def list_scans(limit: int = 100) -> list[dict]:
    with connect() as c:
        rows = c.execute(
            "select * from scans order by created_at desc limit ?", (limit,)
        ).fetchall()
    return [_scan_row(r) for r in rows]


def _scan_row(row: sqlite3.Row) -> dict:
    d = dict(row)
    for key in ("artifacts_json", "quality_json"):
        raw = d.pop(key)
        d[key.replace("_json", "")] = json.loads(raw) if raw else None
    return d


# ---------------------------------------------------------------------------
# Frames
# ---------------------------------------------------------------------------

def insert_frames(scan_id: str, frames: list[dict]) -> None:
    if not frames:
        return
    with connect() as c:
        c.executemany(
            "insert or replace into frames("
            " scan_id, frame_index, timestamp_ms, image_path, width, height,"
            " blur_score, brightness_score, skin_fraction, similarity_prev,"
            " novelty_score, accepted, reject_reason"
            ") values(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                (
                    scan_id, f["frame_index"], f["timestamp_ms"], f["image_path"],
                    f.get("width"), f.get("height"), f.get("blur_score"),
                    f.get("brightness_score"), f.get("skin_fraction"),
                    f.get("similarity_prev"), f.get("novelty_score"),
                    1 if f["accepted"] else 0, f.get("reject_reason"),
                )
                for f in frames
            ],
        )


def set_banked(scan_id: str, decisions: dict[int, tuple[bool, str | None]]) -> None:
    """Record which of a scan's frames were admitted to the bank.

    Separate from `accepted` on purpose: "sharp and well lit" and "shows an
    angle we do not already have" are different questions, and the debug UI
    has to be able to tell them apart. A frame can pass quality and still not
    be banked.
    """
    if not decisions:
        return
    with connect() as c:
        c.executemany(
            "update frames set banked = ?, bank_reason = ? "
            "where scan_id = ? and frame_index = ?",
            [(1 if ok else 0, reason, scan_id, idx)
             for idx, (ok, reason) in decisions.items()],
        )


def get_frames(scan_id: str, accepted_only: bool = False) -> list[dict]:
    sql = "select * from frames where scan_id = ?"
    args: tuple = (scan_id,)
    if accepted_only:
        sql += " and accepted = 1"
    sql += " order by frame_index"
    with connect() as c:
        rows = c.execute(sql, args).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["accepted"] = bool(d["accepted"])
        out.append(d)
    return out


def reject_summary(scan_id: str) -> dict[str, int]:
    """Counts per reject reason — the first thing to look at on a failed scan."""
    with connect() as c:
        rows = c.execute(
            "select coalesce(reject_reason,'accepted') as reason, count(*) as n "
            "from frames where scan_id = ? group by reason order by n desc",
            (scan_id,),
        ).fetchall()
    return {r["reason"]: r["n"] for r in rows}
