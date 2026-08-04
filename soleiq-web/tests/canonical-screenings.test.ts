/**
 * Regression tests for the report-history query.
 *
 * The bug these pin down: the reports query ordered ascending and THEN
 * limited to 50, which selects the OLDEST fifty rows. Every check a patient
 * completed after their fiftieth silently stopped appearing in History,
 * Timeline and Compare — the save had worked and the report existed, it was
 * simply never fetched. Because the symptom only shows up past a row count
 * nobody hits while testing, it reads as "history randomly stops updating".
 *
 * Callers depend on the returned array being OLDEST-FIRST (Timeline treats
 * the last element as the most recent check; History reverses it). So the fix
 * has to satisfy both: newest fifty by query, oldest-first on return.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

interface QueryCapture {
  table: string;
  order?: { column: string; ascending: boolean };
  limit?: number;
}

const captured: QueryCapture[] = [];
let reportRows: any[] = [];

/** Minimal thenable stand-in for the PostgREST builder chain. */
function builder(table: string, rows: () => any[]) {
  const capture: QueryCapture = { table };
  captured.push(capture);
  const chain: any = {
    select: () => chain,
    neq: () => chain,
    eq: () => chain,
    in: () => chain,
    order: (column: string, opts?: { ascending?: boolean }) => {
      capture.order = { column, ascending: opts?.ascending !== false };
      return chain;
    },
    limit: (n: number) => {
      capture.limit = n;
      return chain;
    },
    then: (resolve: (v: any) => void) => resolve({ data: rows(), error: null }),
  };
  return chain;
}

const supabaseMock = {
  auth: { getUser: async () => ({ data: { user: { id: "patient-1" } } }) },
  from: (table: string) =>
    builder(table, () => (table === "reports" ? reportRows : [])),
  storage: {
    from: () => ({ createSignedUrls: async () => ({ data: [] }) }),
  },
};

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => supabaseMock,
  isSupabaseConfigured: () => true,
}));

const { listMyCanonicalChecks } = await import("@/lib/canonicalScreenings");

const makeReport = (index: number) => ({
  id: `report-${index}`,
  screening_session_id: `session-${index}`,
  status: "released",
  risk_level: "clear",
  patient_summary: { overall: { headline: `check ${index}` } },
  hospital_name_snapshot: "Test Hospital",
  finalized_at: null,
  // index 0 is the newest, matching a descending query result.
  created_at: new Date(Date.UTC(2026, 0, 1) - index * 86_400_000).toISOString(),
  screening_sessions: null,
});

describe("listMyCanonicalChecks", () => {
  beforeEach(() => {
    captured.length = 0;
    reportRows = [];
  });

  it("asks the database for the NEWEST reports, not the oldest", async () => {
    reportRows = [makeReport(0)];
    await listMyCanonicalChecks();

    const reportsQuery = captured.find((c) => c.table === "reports");
    expect(reportsQuery).toBeDefined();
    expect(reportsQuery!.limit).toBe(50);
    // Ascending + LIMIT is the bug: it returns the oldest N rows, so recent
    // checks fall outside the window once a patient passes the limit.
    expect(reportsQuery!.order).toEqual({
      column: "created_at",
      ascending: false,
    });
  });

  it("still returns checks oldest-first, because callers index off the end", async () => {
    // Rows arrive newest-first from a descending query.
    reportRows = [makeReport(0), makeReport(1), makeReport(2)];
    const checks = await listMyCanonicalChecks();

    expect(checks.map((c) => c.reportId)).toEqual([
      "report-2",
      "report-1",
      "report-0",
    ]);
    // Timeline reads the most recent check as the LAST element.
    expect(checks[checks.length - 1].reportId).toBe("report-0");
    expect(checks[0].startedAt).toBeLessThan(checks[checks.length - 1].startedAt);
  });

  it("falls back to the report timestamp when the session embed is absent", async () => {
    // screening_sessions embeds as null whenever RLS hides the session row.
    reportRows = [makeReport(0)];
    const checks = await listMyCanonicalChecks();
    expect(checks[0].startedAt).toBe(Date.parse(reportRows[0].created_at));
  });
});
