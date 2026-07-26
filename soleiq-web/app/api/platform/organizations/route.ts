import { apiHandler } from "@/server/http";
import { createOrganization } from "@/server/platform";

export async function POST(request: Request) {
  return apiHandler(request, async () => createOrganization(await request.json()));
}

