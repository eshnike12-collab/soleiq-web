import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CLAIM_TTL_DAYS,
  TOKEN_PATTERN,
  classifyClaimError,
} from "@/lib/claimOutcome";
import {
  patientClaimInviteSubject,
  renderPatientClaimInviteHtml,
  renderPatientClaimInviteText,
} from "@/server/email/templates/patientClaimInvite";

const MIGRATION = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/00016_caregiver_created_records.sql"
  ),
  "utf8"
);

describe("claim failure classification", () => {
  it("tells a caregiver following the link apart from a dead link", () => {
    // The single most important distinction on that page: one means "give this
    // to the patient", the other means "ask for a new one".
    expect(
      classifyClaimError({
        message: "signed-in account does not match the invited email",
      })
    ).toBe("email_mismatch");
    expect(
      classifyClaimError({ message: "claim link is invalid or expired" })
    ).toBe("invalid_or_expired");
  });

  it("recognises an account that already has its own record", () => {
    expect(
      classifyClaimError({
        message: "this account is already linked to another patient record",
      })
    ).toBe("account_already_linked");
    // And by SQLSTATE, if the wording ever changes.
    expect(classifyClaimError({ code: "23505" })).toBe("account_already_linked");
  });

  it("recognises a record someone else already owns", () => {
    expect(classifyClaimError({ message: "record already claimed" })).toBe(
      "already_claimed"
    );
  });

  it("prefers the specific message over the generic code", () => {
    // 'already linked to another patient' is raised WITH 23505, and
    // 'does not match the invited email' WITH 42501; message wins either way.
    expect(
      classifyClaimError({
        code: "23505",
        message: "this account is already linked to another patient record",
      })
    ).toBe("account_already_linked");
    expect(
      classifyClaimError({
        code: "42501",
        message: "signed-in account does not match the invited email",
      })
    ).toBe("email_mismatch");
  });

  it("degrades to unknown rather than guessing", () => {
    expect(classifyClaimError({})).toBe("unknown");
    expect(classifyClaimError({ message: "connection reset" })).toBe("unknown");
  });
});

describe("token shape", () => {
  it("is the 64-char hex the rest of the product uses", () => {
    expect(TOKEN_PATTERN.test("a".repeat(64))).toBe(true);
    expect(TOKEN_PATTERN.test("a".repeat(63))).toBe(false);
    expect(TOKEN_PATTERN.test("g".repeat(64))).toBe(false);
  });

  it("matches the pattern server/invitations.ts accepts", () => {
    const invitations = readFileSync(
      path.join(process.cwd(), "server/invitations.ts"),
      "utf8"
    );
    expect(invitations).toContain("[a-f0-9]{64}");
  });
});

describe("the invitation email answers the patient's four questions", () => {
  const data = {
    patientName: "Rina Patel",
    caregiverName: "Dev Patel",
    organizationName: "Riverside Foot Clinic",
    checkCount: 2,
    claimUrl: "https://example.test/claim/" + "a".repeat(64),
    expiresInDays: CLAIM_TTL_DAYS,
    invitedEmail: "rina@example.test",
  };

  it("says who created it and where", () => {
    const text = renderPatientClaimInviteText(data);
    expect(text).toContain("Dev Patel");
    expect(text).toContain("Riverside Foot Clinic");
    expect(text).toContain("Rina Patel");
  });

  it("says what is already in it, as a number", () => {
    expect(renderPatientClaimInviteText(data)).toContain("2 foot checks");
    expect(
      renderPatientClaimInviteText({ ...data, checkCount: 1 })
    ).toContain("one foot check");
    expect(
      renderPatientClaimInviteText({ ...data, checkCount: 0 })
    ).toContain("No foot checks have been done yet");
  });

  it("says that claiming makes them the owner", () => {
    expect(renderPatientClaimInviteText(data)).toContain("the record becomes yours");
  });

  it("says they can remove that caregiver afterwards", () => {
    // The brief's hard requirement, and the thing most likely to be dropped
    // when copy gets trimmed.
    const text = renderPatientClaimInviteText(data);
    expect(text).toMatch(/remove them at any time/i);
    expect(renderPatientClaimInviteHtml(data)).toMatch(/remove them at any time/i);
  });

  it("names the address that must be signed in as", () => {
    expect(renderPatientClaimInviteText(data)).toContain("rina@example.test");
    expect(renderPatientClaimInviteHtml(data)).toContain("rina@example.test");
  });

  it("states the expiry", () => {
    expect(renderPatientClaimInviteText(data)).toContain(String(CLAIM_TTL_DAYS));
  });

  it("escapes anything that came from a text field", () => {
    const html = renderPatientClaimInviteHtml({
      ...data,
      caregiverName: '<script>alert(1)</script>',
      patientName: 'Rina "The Boss" <b>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("carries the disclaimer and a subject", () => {
    expect(renderPatientClaimInviteText(data)).toContain("not provide a diagnosis");
    expect(patientClaimInviteSubject().length).toBeGreaterThan(10);
  });
});

/**
 * The migration cannot be executed here — there is no Postgres in this
 * environment — so these assert the invariants that make the handover safe and
 * would be silently lost in an edit. They are a guard, not a substitute for
 * running it.
 */
describe("claim_patient_record invariants (read from the migration)", () => {
  it("is one transactional function, not a sequence of calls", () => {
    expect(MIGRATION).toContain("create or replace function public.claim_patient_record");
    expect(MIGRATION).toContain("language plpgsql");
  });

  it("requires the session to be the invited email", () => {
    // This is what stops a caregiver claiming on the patient's behalf.
    expect(MIGRATION).toContain("from auth.users where id = auth.uid()");
    expect(MIGRATION).toContain("auth_email <> invite.invited_email");
    expect(MIGRATION).toContain(
      "signed-in account does not match the invited email"
    );
  });

  it("looks the token up only by hash, never by value", () => {
    expect(MIGRATION).toContain("encode(digest(lower(raw_token), 'sha256'), 'hex')");
    // No column stores the usable token.
    expect(MIGRATION).not.toMatch(/\btoken\s+text\b/);
  });

  it("locks the invitation row before deciding", () => {
    expect(MIGRATION).toMatch(/where token_hash = encode[\s\S]{0,120}for update/);
  });

  it("refuses a second patient record for one account", () => {
    expect(MIGRATION).toContain(
      "this account is already linked to another patient record"
    );
  });

  it("leaves the creating caregiver's grant active and revocable", () => {
    // Status is deliberately NOT written: re-activating a grant the patient
    // had already revoked would hand access back without their say.
    const block = MIGRATION.slice(
      MIGRATION.indexOf("update public.patient_access_grants"),
      MIGRATION.indexOf("update public.patient_claim_invitations\n  set claimed_at")
    );
    expect(block).toContain("invitee_user_id = coalesce(invitee_user_id, granted_by)");
    // Only the SET clause: `status = 'active'` belongs in the WHERE, where it
    // correctly scopes the update to grants the patient has not revoked.
    const setClause = block.slice(block.indexOf("set "), block.indexOf("where"));
    expect(setClause).not.toMatch(/status\s*=/);
    expect(block).toMatch(/where[\s\S]*status = 'active'/);
  });

  it("burns the token on claim and on cancellation", () => {
    expect(MIGRATION).toMatch(/set claimed_at = now\(\)[\s\S]{0,80}token_hash = null/);
    expect(MIGRATION).toMatch(/set cancelled_at = now\(\), token_hash = null/);
  });

  it("guards every audit write against a caller with no membership", () => {
    // write_audit_event raises on an organization the caller is not a member
    // of, and the patient claiming is never a member — an unguarded call would
    // roll the whole claim back.
    const calls = MIGRATION.match(/perform public\.write_audit_event\(/g) ?? [];
    const guards = MIGRATION.match(/public\.has_active_membership\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(4);
    // One guard per call that passes an organization it did not itself verify.
    expect(guards.length).toBeGreaterThanOrEqual(3);
  });

  it("audits every custody change", () => {
    for (const action of [
      "patient.record_created_by_caregiver",
      "patient.claim_invited",
      "patient.claim_cancelled",
      "patient.record_claimed",
    ]) {
      expect(MIGRATION, action).toContain(action);
    }
  });

  it("revokes execute from anon as well as public", () => {
    // Supabase's default privileges grant execute to anon on new functions,
    // so revoking from `public` alone would leave these callable unauthenticated.
    expect(MIGRATION).toContain("from anon");
    expect(MIGRATION).toContain("grant execute on function %s to authenticated");
  });

  it("adds no new patients or grants RLS policy", () => {
    // Operating an unclaimed record goes through the grant and the existing
    // patients_care_circle_read policy. Widening a policy here would be the
    // wrong fix and is what this test exists to catch.
    expect(MIGRATION).not.toMatch(/create policy \w+ on public\.patients/);
    expect(MIGRATION).not.toMatch(/create policy \w+ on public\.patient_access_grants/);
  });

  it("keeps the creating caregiver's grant an ordinary caregiver grant", () => {
    // Not a new role, not a privileged flag — which is precisely why the
    // patient's ordinary revoke works on it.
    expect(MIGRATION).toContain("'caregiver', 'active', 'caregiver_created'");
  });

  it("only ever leaves one open invitation per record", () => {
    expect(MIGRATION).toContain("patient_claim_invitations_one_open_idx");
    expect(MIGRATION).toMatch(
      /where claimed_at is null and cancelled_at is null/
    );
  });
});
