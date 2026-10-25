import { apiHandler } from "@/server/http";
import { claimPatientRecord, requestNewClaimLink } from "@/server/patientClaim";

/**
 * The claim itself, and the "send me a new link" request.
 *
 * Both live under /api/patient rather than the hospital namespace: the caller
 * is the patient, who has no organization membership at this point.
 */
export async function POST(request: Request) {
  return apiHandler(request, async (meta) => {
    const body = await request.json();
    if (body?.action === "request_new_link") {
      return requestNewClaimLink(String(body.token ?? ""), meta.requestId);
    }
    return claimPatientRecord(body);
  });
}
