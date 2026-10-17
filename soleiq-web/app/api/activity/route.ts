import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Records that the signed-in user opened the app today.
 *
 * Takes no body and no identity from the request — `record_user_activity()`
 * derives the row from auth.uid(), so there is no parameter a caller could
 * use to write somebody else's activity, or to inflate a day that is not
 * today.
 *
 * Always answers 204, even on failure. This is a dashboard metric firing on
 * every page load; a failed write must be invisible to the person using the
 * product, and an un-migrated database must not fill the console with errors
 * on every navigation.
 */
export async function POST() {
  try {
    const { supabase } = await requireAuth();
    await supabase.rpc("record_user_activity");
  } catch {
    /* Not recorded. Never surfaced. */
  }
  return new NextResponse(null, { status: 204 });
}
