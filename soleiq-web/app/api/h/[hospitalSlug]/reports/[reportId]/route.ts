import { apiHandler } from "@/server/http";
import { getExactReport, reviewExactReport } from "@/server/reports";

export const dynamic = "force-dynamic";

type RouteParams = { hospitalSlug: string; reportId: string };

export async function GET(
  request: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { hospitalSlug, reportId } = await params;
  return apiHandler(request, (meta) => {
    const organizationPatientId =
      new URL(request.url).searchParams.get("organizationPatientId") ?? "";
    return getExactReport(
      hospitalSlug,
      organizationPatientId,
      reportId,
      meta.requestId
    );
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<RouteParams> }
) {
  const { hospitalSlug, reportId } = await params;
  return apiHandler(request, async (meta) =>
    reviewExactReport(
      hospitalSlug,
      reportId,
      await request.json(),
      meta.requestId
    )
  );
}
