import { apiHandler } from "@/server/http";
import { getDoctorWorklist } from "@/server/reports";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hospitalSlug: string }> }
) {
  const { hospitalSlug } = await params;
  return apiHandler(request, () => {
    const url = new URL(request.url);
    return getDoctorWorklist(hospitalSlug, {
      search: url.searchParams.get("search") || undefined,
      risk: url.searchParams.get("risk") || undefined,
      unreviewed: url.searchParams.get("unreviewed") || undefined,
      cursor: url.searchParams.get("cursor") || undefined,
      limit: url.searchParams.get("limit") || undefined,
    });
  });
}
