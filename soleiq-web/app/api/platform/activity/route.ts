import { z } from "zod";
import { apiHandler } from "@/server/http";
import { requirePlatformAdminContext } from "@/server/platform";
import { gatherPlatformSeries } from "@/server/platformReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  range: z.enum(["1d", "7d", "30d", "365d", "all"]).default("30d"),
});

/**
 * Usage time series for the platform dashboard.
 *
 * The platform-admin check runs FIRST and throws for anyone else; only then
 * does the gatherer touch the service-role client, which bypasses RLS. The
 * authorization is that ordering, not anything inside the gatherer.
 *
 * Aggregate counts per bucket — no user id, no name, nothing clinical.
 */
export async function GET(request: Request) {
  return apiHandler(request, async () => {
    await requirePlatformAdminContext();
    const { searchParams } = new URL(request.url);
    const { range } = QuerySchema.parse({
      range: searchParams.get("range") ?? undefined,
    });
    return gatherPlatformSeries(range);
  });
}
