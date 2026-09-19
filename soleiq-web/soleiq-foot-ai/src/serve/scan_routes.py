"""
Local debugging API for scans.

    POST   /scans                        upload a video -> {scan_id}
    GET    /scans                        list scans, newest first
    GET    /scans/{id}                   one scan + every frame + reject summary
    GET    /scans/{id}/video             the raw video as uploaded
    GET    /scans/{id}/frames/{n}/image  one extracted frame, accepted or not
    GET    /scans/{id}/artifact/{name}   model.glb / cameras.json / quality.json
    DELETE /scans/{id}                   purge files and rows
    GET    /debug                        a plain HTML page over the above

Local-only by design: files come off this machine's disk and metadata out of a
local SQLite file. Nothing here talks to a cloud service.
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import Depends, APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse

from src.store import db
from src.store.config import CONFIG
from src.store import scan_service as svc

import re

# Bank ids come from the client; they end up in SQL parameters and log lines,
# so they are constrained rather than trusted.
_SAFE_ID = re.compile(r"[A-Za-z0-9._-]{1,64}")

from .scan_auth import (
    bank_for,
    debug_ui_enabled,
    require_bank_owner,
    require_scan_auth,
)


def _scope_to_scan(auth: dict | None, scan_id: str) -> None:
    """A caller may only touch scans in a bank they own.

    Without this, any authenticated user could address any scan id — the same
    enumeration hole the auth exists to close, one step further in. Raises 404
    rather than 403 so the response cannot be used to test whether an id
    exists.
    """
    if auth is None:
        return
    row = db.get_scan(scan_id)
    if row is None:
        raise HTTPException(404, "Not found.")
    require_bank_owner(auth, row.get("bank_id"))


def _loopback_only(auth: dict | None, what: str) -> None:
    """Cross-patient views stay off the public surface entirely.

    Listing every scan, or rendering them all as a gallery, spans every
    patient in the database. No end-user token widens to that, so these are
    reachable only from the machine running the service. 404, not 403: the
    route should be indistinguishable from one that does not exist.
    """
    if auth is not None:
        raise HTTPException(404, "Not found.")

log = logging.getLogger("soleiq.serve.scans")
router = APIRouter(tags=["scans"])

ARTIFACTS = {"model.glb", "cameras.json", "quality.json"}


def _scan_or_404(scan_id: str) -> dict:
    row = db.get_scan(scan_id)
    if not row:
        raise HTTPException(404, "no such scan")
    return row


def _safe_under(path: Path, root: Path) -> bool:
    try:
        return path.resolve().is_relative_to(root.resolve())
    except (OSError, ValueError):
        return False


@router.post("/scans")
async def create_scan(
    video: UploadFile = File(...),
    # Full-resolution originals captured at the moments the client's quality
    # gate accepted. Optional: an older browser sends none and the service
    # falls back to extracting from the video.
    stills: list[UploadFile] = File(default=[]),
    side: str = Form("right"),
    foot_length_mm: float | None = Form(None),
    bank_id: str | None = Form(None),
    auth: dict | None = Depends(require_scan_auth)):
    """Accept one scan video and start processing. Returns immediately.

    `bank_id` pools usable frames across attempts — normally one value per
    patient per foot. Omit it and the scan is its own bank of one.
    """
    if side not in ("left", "right"):
        raise HTTPException(422, "side must be 'left' or 'right'")
    # The bank is derived from the VERIFIED token subject. The client used to
    # compute it in the browser and post it as a form field, which let any
    # authenticated user name someone else's bank and read their frames. The
    # caller may still choose a foot; it may not choose an identity.
    derived = bank_for(auth, side)
    if derived is not None:
        if bank_id is not None and bank_id != derived:
            log.warning(
                "ignoring client-supplied bank_id %r for subject bank %r",
                bank_id, derived,
            )
        bank_id = derived
    if bank_id is not None and not _SAFE_ID.fullmatch(bank_id):
        raise HTTPException(422, "bank_id must be 1-64 chars of [A-Za-z0-9._-]")

    scan_id = svc.create_scan(side, bank_id)
    try:
        svc.save_video(scan_id, video.file, video.filename or "video.webm")
    except Exception as e:  # noqa: BLE001
        db.update_scan(scan_id, status="failed", failure_stage="upload",
                       failure_reason=str(e))
        raise HTTPException(400, str(e)) from None

    saved_stills = svc.save_stills(scan_id, stills)

    svc.submit(scan_id, foot_length_mm=foot_length_mm, side=side)
    log.info("scan %s queued for processing (bank %s)", scan_id, bank_id or "-")
    return {"scan_id": scan_id, "bank_id": bank_id, "stills_received": saved_stills}


@router.get("/scans")
async def list_scans(limit: int = 100,
    auth: dict | None = Depends(require_scan_auth)):
    _loopback_only(auth, "Listing all scans")
    return {"scans": db.list_scans(limit)}


@router.get("/scans/{scan_id}")
async def get_scan(scan_id: str,
    auth: dict | None = Depends(require_scan_auth)):
    _scope_to_scan(auth, scan_id)
    row = _scan_or_404(scan_id)
    frames = db.get_frames(scan_id)
    bank_id = row.get("bank_id")
    bank = db.bank_summary(bank_id) if bank_id else None
    if bank:
        bank["required_frames"] = CONFIG.min_accepted_frames
        bank["required_viewpoints"] = CONFIG.min_viewpoints
        bank["short_by"] = max(
            0, CONFIG.min_accepted_frames - bank["accepted_frames"]
        )
    return {
        **row,
        "bank": bank,
        "reject_summary": db.reject_summary(scan_id),
        "frames": [
            {**f, "image_url": f"/scans/{scan_id}/frames/{f['frame_index']}/image"}
            for f in frames
        ],
        "video_url": f"/scans/{scan_id}/video" if row.get("raw_video_path") else None,
        "thresholds": {
            "analysis_width": CONFIG.analysis_width,
            "blur_min": CONFIG.blur_min,
            "brightness_min": CONFIG.brightness_min,
            "brightness_max": CONFIG.brightness_max,
            "skin_fraction_min": CONFIG.skin_fraction_min,
            "duplicate_max_similarity": CONFIG.duplicate_max_similarity,
            "target_frames": CONFIG.target_frames,
            "novelty_window": CONFIG.novelty_window,
            "viewpoint_radius": CONFIG.viewpoint_radius,
            "min_viewpoints": CONFIG.min_viewpoints,
            "min_accepted_frames": CONFIG.min_accepted_frames,
            "bank_novelty_min": CONFIG.bank_novelty_min,
        },
    }


@router.get("/scans/{scan_id}/video")
async def get_video(scan_id: str,
    auth: dict | None = Depends(require_scan_auth)):
    _scope_to_scan(auth, scan_id)
    row = _scan_or_404(scan_id)
    path = Path(row.get("raw_video_path") or "")
    if not path.exists():
        raise HTTPException(404, "no video on disk for this scan")
    return FileResponse(path)


@router.get("/scans/{scan_id}/frames/{index}/image")
async def get_frame_image(scan_id: str, index: int,
    auth: dict | None = Depends(require_scan_auth)):
    _scope_to_scan(auth, scan_id)
    _scan_or_404(scan_id)
    rows = [f for f in db.get_frames(scan_id) if f["frame_index"] == index]
    if not rows:
        raise HTTPException(404, "no such frame")
    path = Path(rows[0]["image_path"])
    # The path came from our own writer, but it is still a filesystem read
    # driven by a URL parameter, so confirm it is inside the data directory.
    if not _safe_under(path, CONFIG.data_dir) or not path.exists():
        raise HTTPException(404, "frame image missing on disk")
    return FileResponse(path, media_type="image/jpeg")


@router.get("/scans/{scan_id}/artifact/{name}")
async def get_artifact(scan_id: str, name: str,
    auth: dict | None = Depends(require_scan_auth)):
    _scope_to_scan(auth, scan_id)
    if name not in ARTIFACTS:
        raise HTTPException(404, "no such artifact")
    _scan_or_404(scan_id)
    path = svc.paths_for(scan_id)["artifacts"] / name
    if not path.exists():
        raise HTTPException(404, "artifact not produced for this scan")
    media = "model/gltf-binary" if name.endswith(".glb") else "application/json"
    return FileResponse(path, media_type=media)


@router.delete("/scans/{scan_id}")
async def delete_scan(scan_id: str,
    auth: dict | None = Depends(require_scan_auth)):
    _scope_to_scan(auth, scan_id)
    return {"deleted": svc.delete_scan(scan_id)}


# ---------------------------------------------------------------------------
# Debug page — deliberately one file of plain HTML with no build step
# ---------------------------------------------------------------------------

@router.get("/banks/{bank_id}")
async def get_bank(bank_id: str,
    auth: dict | None = Depends(require_scan_auth)):
    """What the bank holds and what it still needs."""
    require_bank_owner(auth, bank_id)
    if not _SAFE_ID.fullmatch(bank_id):
        raise HTTPException(422, "bad bank_id")
    scans = db.bank_scan_ids(bank_id)
    if not scans:
        raise HTTPException(404, f"no scans in bank {bank_id}")
    summary = db.bank_summary(bank_id)
    frames = db.get_bank_frames(bank_id)
    summary["required_frames"] = CONFIG.min_accepted_frames
    summary["required_viewpoints"] = CONFIG.min_viewpoints
    summary["short_by"] = max(0, CONFIG.min_accepted_frames - summary["accepted_frames"])
    summary["scan_ids"] = scans
    summary["frames"] = [
        {**f, "image_url": f"/scans/{f['scan_id']}/frames/{f['frame_index']}/image"}
        for f in frames
    ]
    return summary


@router.delete("/banks/{bank_id}")
async def delete_bank(bank_id: str,
    auth: dict | None = Depends(require_scan_auth)):
    """Delete every scan in the bank, with its video and frames.

    Patient photographs are PHI. A bank accumulates them across attempts, so
    deleting one scan is no longer enough to erase a foot — this is the call
    that actually does.
    """
    require_bank_owner(auth, bank_id)
    if not _SAFE_ID.fullmatch(bank_id):
        raise HTTPException(422, "bad bank_id")
    scans = db.bank_scan_ids(bank_id)
    if not scans:
        raise HTTPException(404, f"no scans in bank {bank_id}")
    deleted = [sid for sid in scans if svc.delete_scan(sid)]
    log.info("bank %s deleted: %d scans removed", bank_id, len(deleted))
    return {"bank_id": bank_id, "deleted_scans": deleted}


@router.get("/debug", response_class=HTMLResponse)
async def debug_page(auth: dict | None = Depends(require_scan_auth)):
    # Renders raw patient frames, so it is disabled unless explicitly asked
    # for, and never in a deployed config.
    if not debug_ui_enabled():
        raise HTTPException(404, "Not found.")
    _loopback_only(auth, "The debug gallery")
    return _DEBUG_HTML


_DEBUG_HTML = """<!doctype html>
<meta charset="utf-8"><title>SoleIQ scan debug</title>
<style>
 body{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;background:#0f1115;color:#d7dae0}
 header{padding:12px 16px;background:#171a21;border-bottom:1px solid #272b34}
 h1{font-size:14px;margin:0;font-weight:600}
 main{display:grid;grid-template-columns:minmax(280px,340px) 1fr;height:calc(100vh - 45px)}
 #list{overflow:auto;border-right:1px solid #272b34}
 #detail{overflow:auto;padding:16px}
 .scan{padding:10px 14px;border-bottom:1px solid #21242c;cursor:pointer}
 .scan:hover{background:#171a21}
 .scan.sel{background:#1d2130}
 .id{color:#8ab4f8}
 .badge{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px}
 .done{background:#12351f;color:#7ee2a8}.failed{background:#3a1620;color:#ff9aa8}
 .busy{background:#33290f;color:#f2c86b}
 .banked{background:#122b35;color:#7ecfe2}
 table{border-collapse:collapse;width:100%;margin-top:10px}
 th,td{padding:4px 8px;border-bottom:1px solid #21242c;text-align:right;white-space:nowrap}
 th:first-child,td:first-child{text-align:left}
 th{color:#8b93a1;font-weight:500;position:sticky;top:0;background:#0f1115}
 tr.rej{color:#ff9aa8} tr.acc{color:#7ee2a8}
 .err{background:#2a1218;border:1px solid #5b2230;padding:10px;border-radius:6px;margin:10px 0;color:#ffb3be;white-space:pre-wrap}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:10px}
 .fr{border:1px solid #272b34;border-radius:5px;overflow:hidden;background:#171a21}
 .fr img{width:100%;display:block;aspect-ratio:4/3;object-fit:cover}
 .fr.rej{border-color:#5b2230}.fr.acc{border-color:#1f5133}.fr.warn{border-color:#5b4a22}
 .cap{padding:3px 5px;font-size:10px;line-height:1.35}
 .kv{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:8px 0}
 .kv b{color:#8b93a1;font-weight:500}
 .filters{margin-top:12px;display:flex;gap:6px}
 .flt{font:inherit;background:#171a21;color:#8b93a1;border:1px solid #272b34;
      border-radius:5px;padding:3px 10px;cursor:pointer}
 .flt.on{background:#1d2130;color:#d7dae0;border-color:#3b4152}
 a{color:#8ab4f8}
</style>
<header><h1>SoleIQ — local scan debug</h1></header>
<main><div id="list">loading…</div><div id="detail">select a scan</div></main>
<script>
const q=(s)=>document.querySelector(s);
const cls=(st)=>st==='done'?'done':st==='failed'?'failed':st==='banked'?'banked':'busy';
async function loadList(){
  const {scans}=await (await fetch('/scans')).json();
  q('#list').innerHTML = scans.length ? scans.map(s=>`
    <div class="scan" data-id="${s.scan_id}">
      <div><span class="id">${s.scan_id.slice(0,12)}</span>
        <span class="badge ${cls(s.status)}">${s.status}</span></div>
      <div style="color:#8b93a1">${new Date(s.created_at).toLocaleString()} · ${s.side||'?'}</div>
      <div style="color:#8b93a1">${s.accepted_frames}/${s.total_frames} accepted${
        s.viewpoint_spread==null?'':` · ${s.viewpoint_spread} viewpoints`}</div>
    </div>`).join('') : '<div class="scan">no scans yet</div>';
  [...document.querySelectorAll('.scan[data-id]')].forEach(el=>
    el.onclick=()=>{document.querySelectorAll('.scan').forEach(e=>e.classList.remove('sel'));
                    el.classList.add('sel'); loadScan(el.dataset.id)});
}
// Sampling cadence, read back from what was actually stored rather than from
// the configured interval — the point of the debug page is to show what
// happened, not what was meant to happen.
function cadence(frames){
  const ts=frames.map(f=>f.timestamp_ms).sort((a,b)=>a-b);
  if(ts.length<2) return {n:ts.length,dur:0,median:0,min:0,max:0};
  const gaps=[]; for(let i=1;i<ts.length;i++) gaps.push(ts[i]-ts[i-1]);
  const srt=[...gaps].sort((a,b)=>a-b);
  return {n:ts.length, dur:ts[ts.length-1]-ts[0],
          median:srt[Math.floor(srt.length/2)], min:srt[0], max:srt[srt.length-1]};
}
let FILTER='all';
async function loadScan(id){
  window.__scanId=id;
  const s=await (await fetch('/scans/'+id)).json();
  window.__scan=s;
  const t=s.thresholds;
  const cad=cadence(s.frames);
  const spread=s.viewpoint_spread;
  const spreadOk=spread!=null && spread>=t.min_viewpoints;
  const shown=s.frames.filter(f=>FILTER==='all'?true:FILTER==='bank'?f.banked
    :FILTER==='acc'?f.accepted:!f.accepted);
  const rows=s.frames.map(f=>`<tr class="${f.accepted?'acc':'rej'}">
      <td>${f.frame_index}</td><td>${f.timestamp_ms}</td>
      <td>${(f.blur_score??0).toFixed(1)}</td><td>${(f.brightness_score??0).toFixed(1)}</td>
      <td>${(f.skin_fraction??0).toFixed(3)}</td>
      <td>${f.similarity_prev==null?'–':f.similarity_prev.toFixed(3)}</td>
      <td>${f.novelty_score==null?'–':f.novelty_score.toFixed(3)}</td>
      <td>${f.accepted?'pass':f.reject_reason}</td>
      <td>${f.banked?'BANKED':(f.bank_reason||'–')}</td></tr>`).join('');
  q('#detail').innerHTML=`
    <div><span class="id">${s.scan_id}</span> <span class="badge ${cls(s.status)}">${s.status}</span></div>
    ${s.failure_reason?`<div class="err"><b>failed at ${s.failure_stage||'?'}</b>\\n${s.failure_reason}</div>`:''}
    <div class="kv">
      <b>created</b><span>${new Date(s.created_at).toLocaleString()}</span>
      <b>side</b><span>${s.side||'–'}</span>
      <b>frames</b><span>${s.accepted_frames} accepted / ${s.rejected_frames} rejected / ${s.total_frames} total</span>
      <b>rejects</b><span>${Object.entries(s.reject_summary).map(([k,v])=>k+'='+v).join('  ')||'–'}</span>
      <b>viewpoints</b><span style="color:${spread==null?'#8b93a1':spreadOk?'#7ee2a8':'#ff9aa8'}">${
        spread==null?'– (scan predates diversity checking)'
        :`${spread} distinct / ${t.min_viewpoints} required ${spreadOk?'✓':'✗ NOT ENOUGH VARIATION'}`
      }<br><span style="color:#8b93a1;font-size:11px">appearance clusters at radius ${t.viewpoint_radius}, not measured angles</span></span>
      <b>bank</b><span>${s.bank ? `<a href="/banks/${s.bank.bank_id}" target="_blank">${s.bank.bank_id}</a> — `
        + `<b style="color:${s.bank.accepted_frames>=s.bank.required_frames?'#7ee2a8':'#f2c86b'}">`
        + `${s.bank.accepted_frames}/${s.bank.required_frames} frames</b> pooled across `
        + `${s.bank.scans} scan${s.bank.scans===1?'':'s'}`
        + (s.bank.short_by ? ` · ${s.bank.short_by} more needed` : ' · ready')
        : 'not banked (standalone scan)'}</span>
      <b>cadence</b><span>${cad.n} sampled over ${(cad.dur/1000).toFixed(1)}s · median gap ${cad.median}ms (${cad.min}–${cad.max}ms)</span>
      <b>video</b><span>${s.video_url?`<a href="${s.video_url}" target="_blank">${s.raw_video_path}</a>`:'–'}</span>
      <b>model</b><span>${s.artifacts?`<a href="/scans/${s.scan_id}/artifact/model.glb">model.glb</a>`:'–'}</span>
      <b>bank rule</b><span>a frame is saved only if it differs from every frame already banked (novelty ≥ ${t.bank_novelty_min})</span>
      <b>thresholds</b><span>blur≥${t.blur_min} · luma ${t.brightness_min}–${t.brightness_max} · skin≥${t.skin_fraction_min} · dup>${t.duplicate_max_similarity} · @${t.analysis_width}px
        <br>novelty window ${t.novelty_window} · viewpoint radius ${t.viewpoint_radius} · ≥${t.min_viewpoints} viewpoints · ≥${t.min_accepted_frames} frames</span>
    </div>
    <div class="filters">
      ${['all','bank','acc','rej'].map(k=>`<button class="flt ${FILTER===k?'on':''}" data-f="${k}">${
        k==='all'?`all (${s.frames.length})`
        :k==='bank'?`banked (${s.frames.filter(f=>f.banked).length})`
        :k==='acc'?`quality pass (${s.frames.filter(f=>f.accepted).length})`
        :`rejected (${s.frames.filter(f=>!f.accepted).length})`}</button>`).join('')}
    </div>
    <div class="grid">${shown.map(f=>`
      <div class="fr ${f.banked?'acc':f.accepted?'warn':'rej'}">
        <img loading="lazy" src="${f.image_url}">
        <div class="cap">#${f.frame_index} ${f.accepted?'accept':f.reject_reason}<br>
          b${(f.blur_score??0).toFixed(0)} l${(f.brightness_score??0).toFixed(0)} s${(f.skin_fraction??0).toFixed(2)}
          n${f.novelty_score==null?'–':f.novelty_score.toFixed(3)}</div>
      </div>`).join('')}</div>
    <table><thead><tr><th>#</th><th>t(ms)</th><th>blur</th><th>luma</th><th>skin</th><th>sim</th><th>novelty</th><th>quality</th><th>bank</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
  [...document.querySelectorAll('.flt')].forEach(b=>
    b.onclick=()=>{FILTER=b.dataset.f; loadScan(window.__scanId)});
}
loadList(); setInterval(loadList, 4000);
</script>
"""
