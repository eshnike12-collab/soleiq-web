#!/usr/bin/env node
/**
 * Diagnose screenings that saved but never produced a report.
 *
 * A patient whose check is affected sees nothing in History even though the
 * save reported success, so this classifies every stuck session into the
 * three states that need different responses:
 *
 *   recoverable      Session is "analyzing", all four photos are present in
 *                    storage, and its outbox event is unprocessed. The next
 *                    successful save sweeps it automatically (see
 *                    sweepPendingAnalyses in server/screenings.ts) and the
 *                    report appears. Nothing to do by hand.
 *
 *   photos missing   media_assets rows point at storage objects that are
 *                    gone. The pre-fix save path deleted uploaded objects on
 *                    failure but could not delete their rows — patients have
 *                    no DELETE policy on media_assets — so the row outlived
 *                    the file. Not recoverable: the photos no longer exist.
 *                    These need a decision (re-screen the patient, or delete
 *                    the dead rows as an admin), not a retry.
 *
 *   needs a new save Session left "analyzing" state without a report.
 *                    complete_screening_analysis only accepts "analyzing", so
 *                    the event can never complete; the patient must re-run
 *                    the check.
 *
 * Strictly read-only. Prints ids and counts, never patient data or images.
 *
 *   node scripts/repair-screening-backlog.mjs
 *   node scripts/repair-screening-backlog.mjs --env=.env.production.local
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const ENV_FILE = process.argv.find((a) => a.startsWith("--env="))?.slice(6) ?? ".env.local";

function loadEnv(file) {
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8")
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        })
    );
  } catch {
    return {};
  }
}

const env = { ...loadEnv(ENV_FILE), ...process.env };
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    `NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required ` +
      `(looked in ${ENV_FILE} and the environment).`
  );
  process.exit(1);
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function objectExists(bucket, path) {
  const dir = path.split("/").slice(0, -1).join("/");
  const name = path.split("/").pop();
  const { data } = await sb.storage.from(bucket).list(dir, { limit: 200, search: name });
  return (data ?? []).some((o) => o.name === name);
}

async function main() {
  const { data: pending, error } = await sb
    .from("outbox_events")
    .select("id, aggregate_id, attempts")
    .eq("event_type", "analysis_requested")
    .is("processed_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  if (!pending?.length) {
    console.log("No unprocessed analysis events — every saved check has a report.");
    return;
  }
  console.log(`${pending.length} unprocessed analysis event(s).\n`);

  const recoverable = [];
  const photosMissing = [];
  const needsNewSave = [];

  for (const event of pending) {
    const { data: session } = await sb
      .from("screening_sessions")
      .select("id, status")
      .eq("id", event.aggregate_id)
      .maybeSingle();
    if (!session) continue;

    if (session.status !== "analyzing") {
      needsNewSave.push(`${session.id}  (status ${session.status})`);
      continue;
    }
    const { data: assets } = await sb
      .from("media_assets")
      .select("storage_bucket, storage_path")
      .eq("screening_session_id", session.id)
      .eq("asset_type", "photo");
    if ((assets ?? []).length !== 4) {
      photosMissing.push(`${session.id}  (${assets?.length ?? 0}/4 photo rows)`);
      continue;
    }
    let gone = 0;
    for (const a of assets) {
      if (!(await objectExists(a.storage_bucket, a.storage_path))) gone++;
    }
    if (gone) {
      photosMissing.push(`${session.id}  (${gone}/4 objects gone from storage)`);
      continue;
    }
    if (event.attempts >= 3) {
      needsNewSave.push(`${session.id}  (dead-lettered after ${event.attempts} attempts)`);
      continue;
    }
    recoverable.push(`${session.id}  (attempts ${event.attempts})`);
  }

  const section = (title, rows, note) => {
    console.log(`${title}: ${rows.length}`);
    for (const r of rows) console.log(`   ${r}`);
    if (rows.length && note) console.log(`   -> ${note}`);
    console.log();
  };

  section(
    "recoverable",
    recoverable,
    "drains automatically — each successful save sweeps these until its 20 s budget runs out"
  );
  section(
    "photos missing (NOT recoverable)",
    photosMissing,
    "the image files are gone; re-screen the patient or delete the dead rows as an admin"
  );
  section(
    "needs a fresh save",
    needsNewSave,
    "the session left 'analyzing', so its queued event can never complete"
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
