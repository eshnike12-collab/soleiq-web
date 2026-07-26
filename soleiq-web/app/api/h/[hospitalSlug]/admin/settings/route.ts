import { apiHandler } from "@/server/http";
import {
  createFacility,
  updateHospitalSettings,
} from "@/server/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ hospitalSlug: string }> }
) {
  const { hospitalSlug } = await params;
  return apiHandler(request, async (meta) =>
    updateHospitalSettings(
      hospitalSlug,
      await request.json(),
      meta.requestId
    )
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hospitalSlug: string }> }
) {
  const { hospitalSlug } = await params;
  return apiHandler(request, async (meta) =>
    createFacility(hospitalSlug, await request.json(), meta.requestId)
  );
}
