import { z } from "zod";
import { apiHandler } from "@/server/http";
import { sendEmail } from "@/server/email/client";
import { escapeHtml } from "@/server/email/templates/reportSummary";
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

    // 2. Email delivery — best effort through the shared client. A missing
    //    key or a send failure never fails the request; the row is saved.
    //    This was a third hand-rolled fetch to the Resend REST API, each with
    //    its own sender string. They all go through server/email/client.ts now.
    const internal = [
      `Category: ${body.category}`,
      `Role: ${role}`,
      `Contact: ${contactEmail ?? "not provided"}`,
      `User id: ${user.id}`,
      "",
      body.message,
    ].join("\n");

    const result = await sendEmail({
      to: FEEDBACK_RECIPIENT,
      subject: `[SoleIQ feedback] ${body.category} from a ${role}`,
      text: internal,
      // Internal routing mail, deliberately not the patient-facing template:
      // <pre> keeps the message body exactly as it was typed.
      html: `<pre style="font:14px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;">${escapeHtml(internal)}</pre>`,
      ...(contactEmail ? { replyTo: contactEmail } : {}),
    });
    const emailSent = result.ok;
    if (!emailSent && result.reason !== "not_configured") {
      console.error(
        JSON.stringify({
          level: "error",
          event: "feedback.email_failed",
          requestId: meta.requestId,
          reason: result.reason,
        })
      );
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
