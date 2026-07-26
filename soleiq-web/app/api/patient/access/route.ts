import { apiHandler } from "@/server/http";
import {
  createShareToken,
  getPatientAccessSummary,
  revokeConsent,
} from "@/server/patient-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(request, (meta) => getPatientAccessSummary(meta.requestId));
}

export async function POST(request: Request) {
  return apiHandler(request, async () => createShareToken(await request.json()));
}

export async function DELETE(request: Request) {
  return apiHandler(request, async (meta) => {
    const body = await request.json();
    return revokeConsent(body.consentId, body.reason ?? "", meta.requestId);
  });
}

