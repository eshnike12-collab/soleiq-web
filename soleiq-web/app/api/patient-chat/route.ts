import { NextResponse } from "next/server";

/**
 * The legacy assistant accepted an auth UID and assembled the deprecated visit
 * model. It remains disabled until a hospital-scoped, report-ID-based assistant
 * is clinically validated.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "The legacy patient-record assistant is retired during the canonical report migration.",
    },
    { status: 410 }
  );
}
