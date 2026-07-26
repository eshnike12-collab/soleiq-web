import { NextResponse } from "next/server";

/** Retired duplicate per-image persistence path. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "The legacy per-image analyzer is retired. Use the canonical four-photo screening workflow.",
    },
    { status: 410 }
  );
}
