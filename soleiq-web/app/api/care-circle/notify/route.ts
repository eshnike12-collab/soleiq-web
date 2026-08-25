import { z } from "zod";
import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";
import { appBaseUrl, sendEmail } from "@/server/email/client";
import {
  careCircleInviteSubject,
  renderCareCircleInviteHtml,
  renderCareCircleInviteText,
} from "@/server/email/templates/careCircleInvite";

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

    const invite = {
      inviterName: body.inviterName || user.email || "A SoleIQ patient",
      inviteeEmail: body.email.toLowerCase(),
      role: body.role,
      appUrl: appBaseUrl(),
    };

    // One email path for the whole app — see server/email/client.ts. This
    // used to be a raw fetch to the Resend REST API with its own hardcoded
    // sender, which meant two places to change the from-address and only a
    // plain-text body.
    const result = await sendEmail({
      to: body.email.toLowerCase(),
      subject: careCircleInviteSubject(invite),
      html: renderCareCircleInviteHtml(invite),
      text: renderCareCircleInviteText(invite),
    });

    return { emailSent: result.ok };
  });
}
