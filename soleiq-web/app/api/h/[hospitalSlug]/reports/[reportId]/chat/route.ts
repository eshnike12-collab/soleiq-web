import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { chatAboutReport } from "@/server/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hospitalSlug: string; reportId: string }> }
) {
  const { hospitalSlug, reportId } = await params;
  return apiHandler(request, async (meta) => {
    enforceRateLimit(`report-chat:${meta.ip ?? "unknown"}`, 20, 60_000);
    const body = await request.json();
    return chatAboutReport(hospitalSlug, reportId, body, meta.requestId);
  });
}
