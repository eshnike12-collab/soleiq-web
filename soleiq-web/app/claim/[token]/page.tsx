import { ClaimRecord } from "@/components/claim/ClaimRecord";

export const dynamic = "force-dynamic";

/**
 * Where a claim link lands.
 *
 * Deliberately NOT behind AuthGate. Someone arriving here may have no account
 * at all, and bouncing them to /login would lose the token out of the URL —
 * the same failure the password-recovery path in AuthGate exists to prevent.
 * The page explains the offer first and asks for a sign-in second, carrying
 * the token through in `next` so it survives the round trip.
 */
export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ClaimRecord token={token} />;
}
