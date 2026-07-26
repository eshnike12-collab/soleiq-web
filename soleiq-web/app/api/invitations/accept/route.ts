import { apiHandler } from "@/server/http";
import { acceptInvitation } from "@/server/invitations";
import { enforceRateLimit } from "@/server/rate-limit";

export async function POST(request: Request) {
  return apiHandler(request, async (meta) => {
    enforceRateLimit(`invite:${meta.ip ?? "unknown"}`, 20, 60_000);
    return acceptInvitation(await request.json());
  });
}

