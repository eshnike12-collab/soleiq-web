import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  careCircleRequestSubject,
  renderCareCircleRequestHtml,
  renderCareCircleRequestText,
} from "@/server/email/templates/careCircleRequest";
import {
  careCircleDecisionSubject,
  renderCareCircleDecisionHtml,
  renderCareCircleDecisionText,
} from "@/server/email/templates/careCircleDecision";

const request = {
  requesterName: "Dana Whitfield",
  relationship: "district nurse",
  organization: "Riverside Community Health",
  reviewUrl: "https://app.soleiqhealth.com/access?request=abc",
};

describe("request email tells the patient who is asking", () => {
  it("names the requester, their claim and their organization", () => {
    const html = renderCareCircleRequestHtml(request);
    expect(html).toContain("Dana Whitfield");
    expect(html).toContain("district nurse");
    expect(html).toContain("Riverside Community Health");
  });

  it("labels the relationship as an unverified claim", () => {
    // Presenting "district nurse" as fact is how someone is talked into
    // approving a stranger.
    for (const body of [
      renderCareCircleRequestHtml(request),
      renderCareCircleRequestText(request),
    ]) {
      expect(body).toMatch(/not verified|They say they are|they told us/i);
    }
  });

  it("says plainly that nothing is shared yet", () => {
    expect(renderCareCircleRequestHtml(request)).toMatch(
      /cannot see anything/i
    );
  });

  it("carries no clinical content about the patient", () => {
    const DISCLAIMER =
      /SoleIQ is a wellness monitoring tool and is not a substitute for\s+professional medical diagnosis\./g;
    for (const body of [
      renderCareCircleRequestHtml(request),
      renderCareCircleRequestText(request),
    ]) {
      expect(body.replace(DISCLAIMER, "")).not.toMatch(
        /ulcer|wound|risk level|urgent|callus|redness|diagnos/i
      );
    }
  });

  it("keeps the patient's name out of the subject line", () => {
    // A subject is visible on a lock screen.
    expect(careCircleRequestSubject()).not.toMatch(/Dana|Whitfield/);
  });

  it("omits the organization row when none was given", () => {
    const html = renderCareCircleRequestHtml({ ...request, organization: null });
    expect(html).not.toMatch(/Organization/);
  });

  it("escapes a requester name containing markup", () => {
    const html = renderCareCircleRequestHtml({
      ...request,
      requesterName: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("decision email", () => {
  it("is sent either way and says which", () => {
    expect(careCircleDecisionSubject(true)).toMatch(/approved/i);
    expect(careCircleDecisionSubject(false)).toMatch(/not approved/i);
  });

  it("reveals nothing about the patient on a decline", () => {
    // A decline must not even confirm that a particular person uses SoleIQ.
    const html = renderCareCircleDecisionHtml({
      approved: false,
      appUrl: "https://app.soleiqhealth.com",
    });
    const text = renderCareCircleDecisionText({
      approved: false,
      appUrl: "https://app.soleiqhealth.com",
    });
    for (const body of [html, text]) {
      expect(body).not.toMatch(/@(?!soleiqhealth)[\w.-]+\.[a-z]{2,}/i);
      expect(body).toMatch(/Nothing has been shared/i);
    }
  });

  it("only offers the app link when approved", () => {
    expect(
      renderCareCircleDecisionHtml({ approved: true, appUrl: "https://x.test" })
    ).toContain("https://x.test");
    expect(
      renderCareCircleDecisionHtml({ approved: false, appUrl: "https://x.test" })
    ).not.toContain("https://x.test");
  });
});

/**
 * The migration is the access control. These read it as text — a schema test
 * without a database — because the properties below are the ones whose
 * failure is silent and severe.
 */
describe("migration 00015 keeps the gate shut", () => {
  const sql = readFileSync(
    "supabase/migrations/00015_caregiver_initiated_access.sql",
    "utf8"
  );

  it("still requires status = 'active' in has_care_circle_access", () => {
    const fn = sql.slice(sql.indexOf("function public.has_care_circle_access"));
    expect(fn).toContain("g.status = 'active'");
    // The new statuses must not appear in the gate.
    expect(fn).not.toContain("pending_patient_approval");
  });

  it("gives caregivers no direct INSERT on grants", () => {
    const policy = sql.slice(sql.indexOf("care_grants_insert_patient"));
    expect(policy).toContain("direction = 'patient_invited'");
    expect(policy).toContain("p.linked_user_id = auth.uid()");
  });

  it("lets the non-patient side move a row only to revoked", () => {
    const policy = sql.slice(
      sql.indexOf("care_grants_revoke_either"),
      sql.indexOf("-- 4. The request path")
    );
    expect(policy).toContain("with check (status = 'revoked')");
  });

  it("stores a token hash and never a token", () => {
    expect(sql).toContain("token_hash text");
    expect(sql).not.toMatch(/\btoken text\b/);
  });

  it("revokes the request function from anon", () => {
    expect(sql).toContain(
      "revoke all on function public.request_care_circle_access(text, text, timestamptz) from anon"
    );
  });

  it("returns the same value whether or not the patient exists", () => {
    const fn = sql.slice(
      sql.indexOf("function public.request_care_circle_access"),
      sql.indexOf("revoke all on function public.request_care_circle_access")
    );
    // Every exit from the lookup is the identical row.
    const returns = fn.match(/return query select [^;]+;/g) ?? [];
    expect(returns.length).toBeGreaterThanOrEqual(4);
    for (const statement of returns) {
      expect(statement).toBe("return query select true;");
    }
  });

  it("refuses to approve an expired request", () => {
    const fn = sql.slice(sql.indexOf("function public.decide_care_circle_request"));
    expect(fn).toContain("expires_at < now()");
    expect(fn).toContain("request expired");
  });

  it("spends the token on any decision", () => {
    const fn = sql.slice(sql.indexOf("function public.decide_care_circle_request"));
    expect(fn).toContain("token_hash = null");
  });
});
