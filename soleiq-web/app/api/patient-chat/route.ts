import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { chatAsPatient } from "@/server/patientAssistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The patient's own assistant.
 *
 * This route previously returned 410: the legacy version took an auth UID as
 * a parameter and assembled the retired visit model. The replacement takes no
 * identity from the request at all — `chatAsPatient` reads the signed-in
 * session and assembles that person's records under their own RLS context, so
 * there is nothing here to point at another patient.
 */
export async function POST(request: Request) {
  return apiHandler(request, async (meta) => {
    // Vision calls are expensive and this endpoint accepts uploads.
    enforceRateLimit(`patient-chat:${meta.ip ?? "unknown"}`, 20, 60_000);
    return chatAsPatient(await request.json());
  });
}
