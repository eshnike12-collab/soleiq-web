import { apiHandler } from "@/server/http";
import { updateMembership } from "@/server/admin";

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ hospitalSlug: string; membershipId: string }> }
) {
  const { hospitalSlug, membershipId } = await params;
  return apiHandler(request, async (meta) =>
    updateMembership(
      hospitalSlug,
      membershipId,
      await request.json(),
      meta.requestId
    )
  );
}
