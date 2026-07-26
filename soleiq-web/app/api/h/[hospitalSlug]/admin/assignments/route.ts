import { apiHandler } from "@/server/http";
import { createCareAssignment } from "@/server/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hospitalSlug: string }> }
) {
  const { hospitalSlug } = await params;
  return apiHandler(request, async (meta) =>
    createCareAssignment(
      hospitalSlug,
      await request.json(),
      meta.requestId
    )
  );
}
