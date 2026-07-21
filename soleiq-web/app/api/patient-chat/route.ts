import { NextRequest, NextResponse } from "next/server";
import { serverUserClient } from "@/lib/serverSupabase";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/patient-chat — per-patient AI assistant for doctors/caregivers.
 *
 * The browser sends its Supabase JWT; we build the patient's record with a
 * client scoped to THAT token, so Postgres RLS decides what this viewer may
 * see (assigned doctor / admin / the patient themself). If RLS returns
 * nothing, the assistant has nothing to talk about and we say so — the
 * server never uses a privileged key to read patient data.
 */

const MAX_MESSAGES = 30;
const MAX_MESSAGE_CHARS = 4000;

const SYSTEM_PROMPT = `You are the patient-record assistant inside SoleIQ, a diabetic foot-screening tool. You are talking to this patient's doctor or caregiver. You are given ONE patient's record: their intake questionnaire and every saved photo-screening result, newest last.

Rules:
- Answer only from the record provided. When the record doesn't contain the answer, say plainly that it isn't in the record — never invent findings, measurements, dates, or trends.
- The screening results come from photo analysis: surface-level, screening-grade signal, not a diagnosis. Frame answers accordingly ("the photo check flagged…", "the record shows…").
- You may summarize trends across visits (levels over time, recurring findings, gaps between checks) and point out care-relevant patterns (e.g. repeat findings at the same site, worsening levels, long gaps since the last photos).
- Be concise and clinical; short paragraphs or tight bullet lists. The reader is a professional — plain clinical vocabulary is fine.
- If asked for a treatment plan or diagnosis, give what the record supports (observations, screening levels, guidance already issued) and defer clinical decisions to the clinician's own judgment and in-person exam.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The assistant is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 }
    );
  }

  const jwt =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? null;
  const sb = serverUserClient(jwt);
  if (!sb) {
    return NextResponse.json({ error: "Sign in to use the assistant." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const patientAuthUid = typeof body?.patientAuthUid === "string" ? body.patientAuthUid : "";
  const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
  if (!patientAuthUid || rawMessages.length === 0) {
    return NextResponse.json(
      { error: "patientAuthUid and at least one message are required." },
      { status: 400 }
    );
  }
  const messages = rawMessages
    .slice(-MAX_MESSAGES)
    .filter(
      (m: any) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content).slice(0, MAX_MESSAGE_CHARS),
    }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "The last message must be from the user." }, { status: 400 });
  }

  // ---- Build the record under the caller's RLS ---------------------------
  const [{ data: patient }, { data: visits }] = await Promise.all([
    sb
      .from("patients")
      .select(
        "full_name, age, sex, conditions, diabetes, prior_events, numbness, pad, smoking, alcohol, pain_present, pain_points, created_at"
      )
      .eq("auth_uid", patientAuthUid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("visits")
      .select(
        "started_at, completed_at, captured_images(captured_at, side, view), analysis_results(scored_at, risk_level, screening_level, screening_result)"
      )
      .eq("auth_uid", patientAuthUid)
      .not("completed_at", "is", null)
      .order("started_at", { ascending: true })
      .limit(20),
  ]);

  if (!patient && (!visits || visits.length === 0)) {
    return NextResponse.json({
      reply:
        "I can't see any record for this patient. Either they have no saved checks yet, or your account isn't assigned to them.",
    });
  }

  const record = buildRecord(patient, visits ?? []);

  // ---- Ask Claude --------------------------------------------------------
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_VISION_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 1500,
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        { type: "text", text: record, cache_control: { type: "ephemeral" } },
      ],
      messages,
    }),
  });

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    console.error("[soleiq] patient-chat upstream failed", upstream.status, payload);
    return NextResponse.json(
      { error: "The assistant could not answer right now. Try again." },
      { status: 502 }
    );
  }
  const reply = payload?.content?.find((item: any) => item.type === "text")?.text;
  if (!reply) {
    return NextResponse.json(
      { error: "The assistant returned no answer." },
      { status: 502 }
    );
  }
  return NextResponse.json({ reply });
}

// ---------------------------------------------------------------------------

function buildRecord(patient: any, visits: any[]): string {
  const lines: string[] = ["PATIENT RECORD", ""];

  if (patient) {
    lines.push("Intake questionnaire:");
    if (patient.full_name) lines.push(`- Name: ${patient.full_name}`);
    if (patient.age) lines.push(`- Age: ${patient.age}${patient.sex ? `, ${patient.sex}` : ""}`);
    if (Array.isArray(patient.conditions) && patient.conditions.length)
      lines.push(`- Conditions: ${patient.conditions.join(", ")}`);
    if (patient.diabetes)
      lines.push(`- Diabetes: ${JSON.stringify(patient.diabetes)}`);
    if (patient.pad) lines.push(`- PAD/circulation: ${JSON.stringify(patient.pad)}`);
    if (Array.isArray(patient.prior_events) && patient.prior_events.length)
      lines.push(`- Prior foot events: ${JSON.stringify(patient.prior_events)}`);
    if (patient.numbness && patient.numbness !== "neither")
      lines.push(`- Numbness: ${patient.numbness}`);
    if (patient.smoking) lines.push("- Smokes: yes");
    if (patient.pain_present)
      lines.push(
        `- Pain reported${Array.isArray(patient.pain_points) && patient.pain_points.length ? ` at: ${patient.pain_points.join(", ")}` : ""}`
      );
    lines.push("");
  } else {
    lines.push("Intake questionnaire: not on file.", "");
  }

  if (visits.length === 0) {
    lines.push("Saved photo checks: none.");
    return lines.join("\n");
  }

  let lastPhoto: number | null = null;
  lines.push(`Saved photo checks (${visits.length}, oldest first):`);
  for (const visit of visits) {
    const date = visit.started_at?.slice(0, 10) ?? "unknown date";
    const analysis = visit.analysis_results?.[0];
    const screening = analysis?.screening_result;
    const photoTimes = (visit.captured_images ?? [])
      .map((image: any) => Date.parse(image.captured_at))
      .filter((t: number) => Number.isFinite(t));
    for (const t of photoTimes) lastPhoto = Math.max(lastPhoto ?? 0, t);

    lines.push(`\n[Visit ${date}] photos: ${(visit.captured_images ?? []).length}`);
    if (screening) {
      lines.push(`  Level: ${screening.overall?.level ?? analysis?.screening_level ?? "?"}`);
      lines.push(`  Headline: ${screening.overall?.headline ?? ""}`);
      for (const f of screening.findings ?? []) {
        lines.push(
          `  Finding (${f.concern}): ${f.what_we_saw} — ${f.location_plain} [${f.foot} foot, ${f.surface}]`
        );
      }
      for (const note of screening.personal_notes ?? []) lines.push(`  Note: ${note}`);
      for (const good of screening.looks_good ?? []) lines.push(`  Healthy: ${good}`);
    } else if (analysis) {
      lines.push(`  Risk level: ${analysis.risk_level}`);
    } else {
      lines.push("  No analysis saved for this visit.");
    }
  }

  lines.push(
    `\nMost recent photos taken: ${lastPhoto ? new Date(lastPhoto).toISOString().slice(0, 10) : "unknown"}`
  );
  lines.push(`Today's date: ${new Date().toISOString().slice(0, 10)}`);
  return lines.join("\n");
}
