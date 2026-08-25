import { Resend } from "resend";

/**
 * The one place email leaves this app.
 *
 * Everything about delivery lives here — the API key, the sender, the failure
 * policy — so a caller only has to describe the message. There was previously
 * a second path (a raw `fetch` to the Resend REST API inside the care-circle
 * route, with its own hardcoded sender); it now goes through this instead, so
 * changing the from-address is one edit rather than a search.
 *
 * FAILURE POLICY: sending never throws.
 *
 * That is deliberate and it is the important decision in this file. Email here
 * is a notification about work that has already completed and been saved. A
 * report is released, stored, and visible in the app whether or not the mail
 * server is reachable; letting a Resend outage propagate would turn a
 * cosmetic failure into a failed assessment. Callers get a result object and
 * can log it. Nobody has to remember a try/catch.
 */

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text alternative. Always send one — some clients show only this. */
  text: string;
  replyTo?: string;
}

export type EmailResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: "not_configured" | "send_failed"; detail?: string };

/** `EMAIL_FROM` should be a verified sender on the connected domain. */
const DEFAULT_FROM = "SoleIQ Health <reports@soleiqhealth.com>";

export function emailFrom(): string {
  return process.env.EMAIL_FROM || DEFAULT_FROM;
}

/**
 * Canonical origin for links inside emails.
 *
 * `APP_BASE_URL` first because an email is read outside any request context —
 * a relative URL or a preview-deployment origin would send patients somewhere
 * that is not their app. Falls back to the site URL the auth emails already
 * use, so a project that has configured one does not have to configure two.
 */
export function appBaseUrl(): string {
  const raw =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://app.soleiqhealth.com";
  return raw.replace(/\/+$/, "");
}

/** True when a key is present. Never reveals the key itself. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

let client: Resend | null = null;
function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  // Cached across invocations in the same server process.
  if (!client) client = new Resend(key);
  return client;
}

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const api = resend();
  if (!api) {
    // Local development without a key is a supported state, not an error.
    console.info("[email] RESEND_API_KEY not set — skipping send:", message.subject);
    return { ok: false, reason: "not_configured" };
  }

  try {
    const { data, error } = await api.emails.send({
      from: emailFrom(),
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });
    if (error) {
      // Log the provider's reason, never the payload: these messages carry
      // patient names and results.
      console.error("[email] send rejected:", error.name, error.message);
      return { ok: false, reason: "send_failed", detail: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (cause) {
    console.error(
      "[email] send threw:",
      cause instanceof Error ? cause.message : "unknown error"
    );
    return {
      ok: false,
      reason: "send_failed",
      detail: cause instanceof Error ? cause.message : undefined,
    };
  }
}
