import { z } from "zod";
import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";
import { invalid } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Where care-team feedback lands. */
const FEEDBACK_RECIPIENT = "eshnike12@gmail.com";

const FeedbackSchema = z.object({
  category: z.enum(["bug", "question", "suggestion"]),
  message: z.string().trim().min(3).max(4000),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  return apiHandler(request, async (meta) => {
    enforceRateLimit(`feedback:${meta.ip ?? "unknown"}`, 5, 60_000);
    const { supabase, user } = await requireAuth();
    const body = FeedbackSchema.parse(await request.json());

    // Best-effort role for triage: first active hospital membership, else
    // patient (covers guests too).
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    const role = membership?.role ?? "patient";
    const contactEmail = body.contactEmail || user.email || null;

    // 1. Durable record first — feedback must never be lost.
    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: user.id,
      role,
      category: body.category,
      message: body.message,
      contact_email: contactEmail,
    });
    if (insertError) {
      throw invalid(`Feedback could not be saved: ${insertError.message}`);
    }

    // 2. Email delivery — best effort via Resend; a missing key or a send
    //    failure never fails the request (the row is already saved).
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
            from: "SoleIQ Feedback <onboarding@resend.dev>",
            to: [FEEDBACK_RECIPIENT],
            reply_to: contactEmail ?? undefined,
            subject: `[SoleIQ feedback] ${body.category} from a ${role}`,
            text: [
              `Category: ${body.category}`,
              `Role: ${role}`,
              `Contact: ${contactEmail ?? "not provided"}`,
              `User id: ${user.id}`,
              "",
              body.message,
            ].join("\n"),
          }),
        });
        emailSent = response.ok;
        if (!response.ok) {
          console.error(
            JSON.stringify({
              level: "error",
              event: "feedback.email_failed",
              requestId: meta.requestId,
              status: response.status,
            })
          );
        }
      } catch {
        /* saved to the table; email is best effort */
      }
    }

    return {
      saved: true,
      emailSent,
      note: emailSent
        ? undefined
        : "Feedback was saved; email delivery is pending configuration (RESEND_API_KEY).",
    };
  });
}
