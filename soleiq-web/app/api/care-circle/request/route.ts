import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";
import { requestAccess } from "@/server/careCircleAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A caregiver asks a patient for access.
 *
 * RATE LIMITED PER USER, not per IP, and that is the security control rather
 * than a politeness measure. The response is identical whether or not the
 * address belongs to a patient, so the only remaining way to turn this into a
 * patient-list oracle is volume: enumerate a list of addresses and read the
 * answers out of the resulting emails or audit trail. A per-account ceiling
 * makes that expensive and makes it visible in the audit log.
 *
 * Keyed on the user id, because an IP is shared by a household, a hospital
 * and a mobile network — limiting by IP would punish a ward full of
 * legitimate caregivers and barely inconvenience a script behind a proxy.
 */
export async function POST(request: Request) {
  return apiHandler(request, async (meta) => {
    const { user } = await requireAuth();
    // 5 an hour. A real caregiver asks one or two people, ever.
    enforceRateLimit(`care-request:${user.id}`, 5, 60 * 60_000);
    // A coarse IP ceiling as well, so one actor cannot simply create accounts.
    enforceRateLimit(`care-request-ip:${meta.ip ?? "unknown"}`, 20, 60 * 60_000);
    return requestAccess(await request.json(), meta.requestId);
  });
}
