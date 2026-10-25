import { NextResponse } from "next/server";
import {
  FOOT_ANALYSIS_SYSTEM_PROMPT,
  buildPatientContext,
} from "@/lib/foot-analysis-prompt";
import {
  enforceScreeningSafety,
  PHOTO_SCREENING_JSON_SCHEMA,
  PhotoScreeningSchema,
} from "@/lib/photoScreening";
import { requireAuth } from "@/server/auth";
import { enforceRateLimit } from "@/server/rate-limit";
import { callAnthropic } from "@/server/anthropic";
import { requestMeta } from "@/server/http";
import { DomainError } from "@/server/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,/;
const MAX_REQUEST_BYTES = 24 * 1024 * 1024;
const MAX_IMAGE_DATA_URL_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const meta = requestMeta(request);
  try {
    const { user } = await requireAuth();
    enforceRateLimit(`foot-analysis:${user.id}:${meta.ip ?? "unknown"}`, 6, 60_000);
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        { error: error.message, requestId: meta.requestId },
      { status: error.status }
      );
    }
    throw error;
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { error: "The photo set is too large.", requestId: meta.requestId },
      { status: 413 }
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    // Same wording the shared client uses for a revoked key or an empty
    // balance: from the patient's side these are one situation, and none of
    // them is about their photographs.
    return NextResponse.json(
      {
        error:
          "Photo analysis is not configured correctly. This is on us, not your photos.",
      },
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
    images.some(
      (image: any) =>
        !IMAGE_PATTERN.test(image?.dataUrl ?? "") ||
        image.dataUrl.length > MAX_IMAGE_DATA_URL_BYTES
    ) ||
    images.reduce(
      (total: number, image: any) => total + (image?.dataUrl?.length ?? 0),
      0
    ) > MAX_REQUEST_BYTES
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

  // Retries 429/5xx/529 with backoff, classifies everything else, and logs
  // the upstream error type and rate-limit headers server-side. See
  // server/anthropic.ts — the client never receives the upstream message,
  // which can echo the prompt back to the browser.
  const result = await callAnthropic(
    {
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
    },
    {
      event: "analysis.provider_failed",
      requestId: meta.requestId,
      // Inside the route's 60s maxDuration, with room for the response.
      budgetMs: 50_000,
    }
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.failure.clientMessage },
      { status: result.failure.clientStatus }
    );
  }
  const payload = result.payload;

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
    console.error(
      JSON.stringify({
        level: "error",
        event: "analysis.schema_invalid",
        requestId: meta.requestId,
      })
    );
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
