import { z } from "zod";
import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Emails a care-circle invitee that someone shared their SoleIQ results
 * with them. Best-effort: access itself never depends on this email —
 * the grant activates when the invitee signs in with the invited address.
 * Without RESEND_API_KEY the route still succeeds with emailSent: false.
 */

const NotifySchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["family", "caregiver", "clinician"]),
  inviterName: z.string().trim().max(160).optional(),
});

export async function POST(request: Request) {
  return apiHandler(request, async (meta) => {
    enforceRateLimit(`care-invite:${meta.ip ?? "unknown"}`, 10, 60_000);
    const { user } = await requireAuth();
    const body = NotifySchema.parse(await request.json());

    const inviter = body.inviterName || user.email || "A SoleIQ patient";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.soleiqhealth.com";

    let emailSent = false;
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SoleIQ <onboarding@resend.dev>",
            to: [body.email.toLowerCase()],
            subject: `${inviter} shared their SoleIQ foot-check results with you`,
            text: [
              `${inviter} added you to their SoleIQ care circle as ${
                body.role === "clinician" ? "a clinician" : `a ${body.role} member`
              }.`,
              "",
              `To see their results, sign in to SoleIQ with this email address (${body.email.toLowerCase()}):`,
              appUrl,
              "",
              body.role === "clinician"
                ? "You'll see the clinical detail view of their reports."
                : "You'll see their results exactly as they see them.",
              "",
              "If you don't have an account yet, create one with this same email — access connects automatically.",
            ].join("\n"),
          }),
        });
        emailSent = response.ok;
      } catch {
        /* grant already exists; email is best effort */
      }
    }

    return { emailSent };
  });
}
