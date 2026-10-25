import { NextResponse } from "next/server";
import { DomainError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { requestMeta } from "@/server/http";
import { chatAsPatient } from "@/server/patientAssistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The patient's own assistant, streamed.
 *
 * Takes no identity from the request — `chatAsPatient` reads the signed-in
 * session and assembles that person's records under their own RLS context, so
 * there is nothing here to point at another patient.
 *
 * TWO FAILURE SHAPES, on purpose:
 *
 *   Before the first token, nothing has been sent, so a failure is an
 *   ordinary JSON error response with a real status code — which is what the
 *   client's existing error handling expects.
 *
 *   After the first token the status line is already 200 and cannot be taken
 *   back. A mid-stream failure is therefore reported in-band as a final
 *   `\n[error]` marker; the client shows what arrived plus a short notice
 *   rather than pretending the answer finished.
 */
export async function POST(request: Request) {
  const meta = requestMeta(request);
  try {
    // Vision calls are expensive and this endpoint accepts uploads.
    enforceRateLimit(`patient-chat:${meta.ip ?? "unknown"}`, 20, 60_000);
    const { firstToken, rest } = await chatAsPatient(await request.json());

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(firstToken));
        try {
          for await (const chunk of rest) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch {
          // Already streaming: the only honest move is to mark the answer
          // incomplete rather than let it look finished.
          controller.enqueue(encoder.encode("\n[error]"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store, no-transform",
        // Proxies that buffer would defeat the point of streaming.
        "x-accel-buffering": "no",
        "x-request-id": meta.requestId,
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: error.code, message: error.message },
          requestId: meta.requestId,
        },
        { status: error.status }
      );
    }
    // Never leak an unexpected error's text — it can carry prompt content.
    console.error(
      JSON.stringify({
        level: "error",
        event: "patient_chat.failed",
        requestId: meta.requestId,
        error: error instanceof Error ? error.name : "UnknownError",
      })
    );
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "The assistant could not answer just now. Please try again.",
        },
        requestId: meta.requestId,
      },
      { status: 500 }
    );
  }
}
