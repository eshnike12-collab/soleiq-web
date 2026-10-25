import { apiHandler } from "@/server/http";
import { cancelClaimInvitation } from "@/server/patientClaim";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hospitalSlug: string }> }
) {
  const { hospitalSlug } = await params;
  return apiHandler(request, async (meta) =>
    cancelClaimInvitation(hospitalSlug, await request.json(), meta.requestId)
  );
}
