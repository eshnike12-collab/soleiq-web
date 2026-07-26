import { apiHandler } from "@/server/http";
import { enrollPatient } from "@/server/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hospitalSlug: string }> }
) {
  const { hospitalSlug } = await params;
  return apiHandler(request, async (meta) =>
    enrollPatient(hospitalSlug, await request.json(), meta.requestId)
  );
}
