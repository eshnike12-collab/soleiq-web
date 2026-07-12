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
      text: `Reported symptoms: pain=${Boolean(body?.symptoms?.pain)}; numbness=${body?.symptoms?.numbness ?? "not reported"}. Check image quality first. If any photo is unusable or shows the wrong surface, request a retake and do not provide a confident screening result.`,
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
