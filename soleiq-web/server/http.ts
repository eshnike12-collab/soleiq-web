import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "./errors";

export interface RequestMeta {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

export function requestMeta(request: Request): RequestMeta {
  return {
    requestId: request.headers.get("x-request-id")?.slice(0, 128) || randomUUID(),
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  };
}

export async function apiHandler<T>(
  request: Request,
  operation: (meta: RequestMeta) => Promise<T>
) {
  const meta = requestMeta(request);
  try {
    const data = await operation(meta);
    return NextResponse.json(
      { ok: true, data, requestId: meta.requestId },
      { headers: { "x-request-id": meta.requestId } }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "The request was invalid.",
            details: error.flatten(),
          },
          requestId: meta.requestId,
        },
        { status: 400, headers: { "x-request-id": meta.requestId } }
      );
    }
    if (error instanceof DomainError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          requestId: meta.requestId,
        },
        { status: error.status, headers: { "x-request-id": meta.requestId } }
      );
    }

    // Do not log request bodies, tokens, signed URLs, prompts, or PHI.
    console.error(
      JSON.stringify({
        level: "error",
        event: "request.failed",
        requestId: meta.requestId,
        error: error instanceof Error ? error.name : "UnknownError",
      })
    );
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "The request could not be completed.",
        },
        requestId: meta.requestId,
      },
      { status: 500, headers: { "x-request-id": meta.requestId } }
    );
  }
}

