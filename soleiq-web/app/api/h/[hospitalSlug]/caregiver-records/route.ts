import { apiHandler } from "@/server/http";
import { createCaregiverPatientRecord } from "@/server/patientClaim";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ hospitalSlug: string }> }
) {
  const { hospitalSlug } = await params;
  return apiHandler(request, async (meta) =>
    createCaregiverPatientRecord(hospitalSlug, await request.json(), meta.requestId)
  );
}
