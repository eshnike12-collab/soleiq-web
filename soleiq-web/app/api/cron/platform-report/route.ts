import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { appBaseUrl, sendEmail } from "@/server/email/client";
import {
  monthlyReportSubject,
  renderMonthlyReportHtml,
  renderMonthlyReportText,
} from "@/server/email/templates/monthlyReport";
import { gatherMonthlyStats, platformReportRecipient } from "@/server/monthlyReport";
import { previousMonthWindow } from "@/lib/monthlyReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Monthly platform report for the operator.
 *
 * FAIL CLOSED, same as the reminder sweep: with no CRON_SECRET configured this
 * refuses every request including Vercel's own. The report is aggregate-only,
 * but an open endpoint is still an open endpoint.
 *
 * ONE RECIPIENT. The address is a constant with an env override, not anything
 * derived from a request — there is no parameter a caller could use to have
 * this report delivered somewhere else.
 *
 * SENDER NOTE. `from` stays on the verified soleiqhealth.com domain because
 * Resend will only send from a domain proved by DNS, and gmail.com cannot be
 * proved by anyone. contact.soleiq@gmail.com is set as reply-to instead, so
 * replies land in that mailbox.
 */

/** The address a reply should reach. */
function replyTo(): string {
  return process.env.PLATFORM_REPORT_REPLY_TO?.trim() || "contact.soleiq@gmail.com";
}

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  return secretMatches(token, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const window = previousMonthWindow(new Date());
    const stats = await gatherMonthlyStats(window);
    const data = {
      monthLabel: window.label,
      stats,
      dashboardUrl: `${appBaseUrl()}/platform`,
    };

    const result = await sendEmail({
      to: platformReportRecipient(),
      replyTo: replyTo(),
      subject: monthlyReportSubject(data),
      html: renderMonthlyReportHtml(data),
      text: renderMonthlyReportText(data),
    });

    // Counts only in the log, never the recipient or the figures.
    console.info(
      "[platform-report] monthly sweep:",
      JSON.stringify({
        month: window.label,
        sent: result.ok,
        reason: result.ok ? null : result.reason,
        partial: stats.partial,
      })
    );

    return NextResponse.json({
      ok: result.ok,
      month: window.label,
      partial: stats.partial,
      ...(result.ok ? {} : { reason: result.reason }),
    });
  } catch (cause) {
    console.error(
      "[platform-report] monthly sweep failed:",
      cause instanceof Error ? cause.message : "unknown error"
    );
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
