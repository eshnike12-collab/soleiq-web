import { apiHandler } from "@/server/http";
import { acceptShareToken } from "@/server/patient-access";

export async function POST(request: Request) {
  return apiHandler(request, async () => {
    const body = await request.json();
    return acceptShareToken(body.token);
  });
}

