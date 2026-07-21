import { NextResponse } from "next/server";
import { FOOT_ANALYSIS_SYSTEM_PROMPT } from "@/lib/foot-analysis-prompt";
import {
  enforceScreeningSafety,
  PHOTO_SCREENING_JSON_SCHEMA,
  PhotoScreeningSchema,
} from "@/lib/photoScreening";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,/;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Photo analysis is not configured. Add ANTHROPIC_API_KEY on the server." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const images = Array.isArray(body?.images) ? body.images : [];
  const expected = new Set([
    "right-top",
    "right-sole",
    "left-top",
    "left-sole",
  ]);
  const received = new Set(
    images.map((image: any) => `${image?.side}-${image?.surface}`)
  );
  if (
    images.length !== 4 ||
    [...expected].some((key) => !received.has(key)) ||
    images.some((image: any) => !IMAGE_PATTERN.test(image?.dataUrl ?? ""))
  ) {
    return NextResponse.json(
      { error: "Four valid foot photos are required: top and sole of both feet." },
      { status: 400 }
    );
  }

  const content: any[] = [
    {
      type: "text",
      text:
        buildPatientContext(body?.context, body?.symptoms) +
        "\n\nCheck image quality first. If any photo is unusable or shows the wrong surface, request a retake and do not provide a confident screening result.",
    },
  ];
  for (const image of images) {
    content.push({
      type: "text",
      text: `Image label: ${image.side} foot, ${image.surface} surface.`,
    });
    const parsedImage = parseDataUrl(image.dataUrl);
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: parsedImage.mediaType,
        data: parsedImage.data,
      },
    });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_VISION_MODEL ?? "claude-sonnet-4-6",
      max_tokens: 4096,
      system: FOOT_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: {
        format: {
          type: "json_schema",
          schema: PHOTO_SCREENING_JSON_SCHEMA,
        },
      },
    }),
  });

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    console.error("[soleiq] Anthropic photo analysis failed", upstream.status, payload);
    return NextResponse.json(
      { error: "The photo analysis service could not complete this check." },
      { status: 502 }
    );
  }

  const outputText = payload?.content?.find(
    (item: any) => item.type === "text"
  )?.text;
  if (!outputText) {
    return NextResponse.json(
      { error: "The photo analysis service returned no result." },
      { status: 502 }
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(outputText);
  } catch {
    return NextResponse.json(
      { error: "The photo analysis service returned an unreadable result." },
      { status: 502 }
    );
  }
  const parsed = PhotoScreeningSchema.safeParse(parsedJson);
  if (!parsed.success) {
    console.error("[soleiq] Invalid photo analysis response", parsed.error.flatten());
    return NextResponse.json(
      { error: "The photo analysis response did not pass safety validation." },
      { status: 502 }
    );
  }

  return NextResponse.json(
    enforceScreeningSafety(parsed.data, {
      pain: Boolean(body?.symptoms?.pain),
      numbness: body?.symptoms?.numbness,
    })
  );
}

/**
 * Format the questionnaire answers into the patient-context block the
 * prompt expects. Everything is optional; unstated answers are omitted
 * rather than sent as "unknown" noise. Free-text values are length-capped
 * because they end up inside the model prompt.
 */
function buildPatientContext(context: any, symptoms: any): string {
  const clip = (value: unknown, max = 80) =>
    String(value ?? "").slice(0, max);
  const lines: string[] = [];

  if (context && typeof context === "object") {
    if (context.age) lines.push(`Age: ${clip(context.age, 6)}`);
    if (context.diabetes && typeof context.diabetes === "object") {
      const d = context.diabetes;
      const parts = [clip(d.type, 20).replace("_", " ")];
      if (d.yearDiagnosed) {
        const years = new Date().getFullYear() - Number(d.yearDiagnosed);
        if (Number.isFinite(years) && years >= 0) parts.push(`about ${years} years`);
      }
      if (d.hba1c) parts.push(`most recent HbA1c ${clip(d.hba1c, 6)}`);
      if (d.glucoseCategory) parts.push(`recent glucose: ${clip(d.glucoseCategory, 30).replace(/_/g, " ")}`);
      lines.push(`Diabetes: ${parts.join(", ")}`);
    }
    if (context.numbness && context.numbness !== "neither") {
      lines.push(`Numbness in feet: ${clip(context.numbness, 10)}`);
    }
    if (context.pad && typeof context.pad === "object" && context.pad.status && context.pad.status !== "none") {
      lines.push(
        `Circulation (peripheral artery disease): ${clip(context.pad.status, 12)}${context.pad.restPain ? ", has rest pain" : ""}${context.pad.claudication ? ", leg pain when walking" : ""}`
      );
    }
    if (Array.isArray(context.priorEvents) && context.priorEvents.length > 0) {
      const events = context.priorEvents
        .slice(0, 4)
        .map((e: any) => `${clip(e.type, 12)} on ${clip(e.side, 6)} foot (${clip(e.region, 16).replace(/_/g, " ")}, ${clip(e.year, 6)})`)
        .join("; ");
      lines.push(`Past foot events: ${events}`);
    }
    if (context.smoking) lines.push("Smokes: yes");
    if (Array.isArray(context.painPoints) && context.painPoints.length > 0) {
      lines.push(`Reported pain locations: ${context.painPoints.slice(0, 6).map((p: any) => clip(p, 24)).join(", ")}`);
    }
  }

  lines.push(
    `Reported symptoms today: pain=${Boolean(symptoms?.pain)}; numbness=${clip(symptoms?.numbness ?? "not reported", 16)}`
  );

  return "Patient questionnaire summary (use per the system prompt; do not repeat verbatim):\n" + lines.join("\n");
}

function parseDataUrl(dataUrl: string): {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
} {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data URL.");
  return {
    mediaType: match[1] as "image/jpeg" | "image/png" | "image/webp",
    data: match[2],
  };
}
