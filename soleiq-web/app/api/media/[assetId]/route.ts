import { apiHandler } from "@/server/http";
import { getAuthorizedMediaUrl } from "@/server/screenings";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  return apiHandler(request, (meta) =>
    getAuthorizedMediaUrl(assetId, meta.requestId)
  );
}
