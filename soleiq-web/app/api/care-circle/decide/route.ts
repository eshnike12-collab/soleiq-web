import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";
import { decideRequest } from "@/server/careCircleAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The patient approves or declines a request.
 *
 * Authorization is in the database: `decide_care_circle_request` re-derives
 * the patient from auth.uid() and refuses a row that is not theirs, so this
 * route carries no access logic of its own.
 */
export async function POST(request: Request) {
  return apiHandler(request, async (meta) => {
    const { user } = await requireAuth();
    enforceRateLimit(`care-decide:${user.id}`, 60, 60_000);
    return decideRequest(await request.json(), meta.requestId);
  });
}
