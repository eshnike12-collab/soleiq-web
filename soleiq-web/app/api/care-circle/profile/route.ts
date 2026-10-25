import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";
import { getCaregiverProfile, saveCaregiverProfile } from "@/server/careCircleAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The caregiver's own profile — the name and relationship a patient sees when
 * deciding whether to approve them.
 *
 * Own-row only, enforced by RLS on caregiver_profiles. A patient can read the
 * profile of someone who has asked them for access, and nobody else's.
 */
export async function GET(request: Request) {
  return apiHandler(request, async () => ({
    profile: await getCaregiverProfile(),
  }));
}

export async function POST(request: Request) {
  return apiHandler(request, async (meta) => {
    const { user } = await requireAuth();
    enforceRateLimit(`caregiver-profile:${user.id}`, 20, 60_000);
    void meta;
    return saveCaregiverProfile(await request.json());
  });
}
