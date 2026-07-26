import { NextResponse } from "next/server";
import { DomainError } from "@/server/errors";
import { requestMeta } from "@/server/http";
import { exportExactReport } from "@/server/reports";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hospitalSlug: string; reportId: string }> }
) {
  const { hospitalSlug, reportId } = await params;
  const meta = requestMeta(request);
  try {
    const organizationPatientId =
      new URL(request.url).searchParams.get("organizationPatientId") ?? "";
    const data = await exportExactReport(
      hospitalSlug,
      organizationPatientId,
      reportId,
      meta.requestId
    );
    return new NextResponse(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          report: data.report,
          enrollment: data.enrollment,
          hospital: {
            id: data.hospital.id,
            displayName: data.hospital.displayName,
          },
          notice:
            "Photo-based screening support only; not a diagnosis or substitute for examination.",
        },
        null,
        2
      ),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="soleiq-report-${reportId}.json"`,
          "cache-control": "private, no-store",
          "x-request-id": meta.requestId,
        },
      }
    );
  } catch (error) {
    const status = error instanceof DomainError ? error.status : 500;
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error instanceof DomainError ? error.code : "INTERNAL_ERROR",
          message:
            error instanceof DomainError
              ? error.message
              : "The export could not be created.",
        },
        requestId: meta.requestId,
      },
      { status, headers: { "x-request-id": meta.requestId } }
    );
  }
}
