import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { createCanonicalScreening } from "@/server/screenings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Media persistence plus the inline analysis call can exceed the default
// serverless window; match the standalone analysis route's budget.
export const maxDuration = 60;

export async function POST(request: Request) {
  return apiHandler(request, async (meta) => {
    enforceRateLimit(`screening:${meta.ip ?? "unknown"}`, 10, 60_000);
    const body = await request.json();
    return createCanonicalScreening(body, meta.requestId);
  });
}

