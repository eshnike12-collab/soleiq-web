import { apiHandler } from "@/server/http";
import { getAdminOverview } from "@/server/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hospitalSlug: string }> }
) {
  const { hospitalSlug } = await params;
  return apiHandler(request, () => {
    const url = new URL(request.url);
    return getAdminOverview(hospitalSlug, {
      search: url.searchParams.get("search") || undefined,
      cursor: url.searchParams.get("cursor") || undefined,
      limit: url.searchParams.get("limit") || undefined,
    });
  });
}
