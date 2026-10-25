import { apiHandler } from "@/server/http";
import { revokeCareCircleGrant } from "@/server/patientClaim";

export async function POST(request: Request) {
  return apiHandler(request, async (meta) =>
    revokeCareCircleGrant(await request.json(), meta.requestId)
  );
}
