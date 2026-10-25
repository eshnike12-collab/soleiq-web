import { describe, expect, it } from "vitest";
import { createReportStream } from "@/lib/reportStreamEngine";
import type { ReportStreamRow } from "@/lib/reportStream";

/**
 * A controllable stand-in for the Supabase client, plus a manual clock, so
 * the fallback can be exercised without waiting five real seconds.
 */
function harness(rows: ReportStreamRow[][] = []) {
  const timers: { id: number; fn: () => void; due: number }[] = [];
  let clock = 0;
  let nextId = 1;

  const handlers: Record<string, (m: any) => void> = {};
  let subscribeCb: ((status: string) => void) | null = null;
  let removed = 0;
  let queries = 0;
  const pages = [...rows];
  const emitted: ReportStreamRow[] = [];
  const statuses: string[] = [];

  const channel: any = {
    on(_event: string, filter: any, handler: (m: any) => void) {
      handlers[filter.event] = handler;
      return channel;
    },
    subscribe(cb: (status: string) => void) {
      subscribeCb = cb;
      return channel;
    },
  };

  const query: any = {
    select: () => query,
    order: () => query,
    limit: () => query,
    eq: () => query,
    then: (resolve: any) => {
      queries += 1;
      const data = pages.length ? pages.shift() : [];
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  };

  const client: any = {
    channel: () => channel,
    removeChannel: () => { removed += 1; },
    from: () => query,
  };

  const stream = (watchReportId?: string) =>
    createReportStream({
      client,
      watchReportId,
      onChange: (row) => emitted.push(row),
      onStatus: (s) => statuses.push(s),
      setTimeout: (fn, ms) => {
        const id = nextId++;
        timers.push({ id, fn, due: clock + ms });
        return id;
      },
      clearTimeout: (h) => {
        const i = timers.findIndex((t) => t.id === h);
        if (i >= 0) timers.splice(i, 1);
      },
      now: () => clock,
      subscribeTimeoutMs: 8000,
    });

  /** Let every queued microtask settle. A poll is async: it awaits the query,
      then schedules the next timer in its `finally`, so the clock must not
      move until that has happened. */
  const drain = async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  };

  /** Advance the clock, running anything that comes due. */
  const advance = async (ms: number) => {
    await drain();
    clock += ms;
    for (let guard = 0; guard < 50; guard += 1) {
      const due = timers.filter((t) => t.due <= clock);
      if (due.length === 0) break;
      for (const t of due) {
        timers.splice(timers.indexOf(t), 1);
        t.fn();
      }
      await drain();
    }
    await drain();
  };

  return {
    stream, advance, emitted, statuses,
    fire: (event: "INSERT" | "UPDATE", row: ReportStreamRow) =>
      handlers[event]?.({ new: row }),
    subscribeWith: (s: string) => subscribeCb?.(s),
    get removed() { return removed; },
    get queries() { return queries; },
    get pending() { return timers.length; },
  };
}

const row = (id: string, status: string): ReportStreamRow => ({ id, status });

describe("realtime path", () => {
  it("reports realtime once subscribed and delivers INSERT and UPDATE", async () => {
    const h = harness();
    h.stream();
    h.subscribeWith("SUBSCRIBED");
    expect(h.statuses).toContain("realtime");

    h.fire("INSERT", row("r1", "preliminary"));
    h.fire("UPDATE", row("r1", "released"));
    expect(h.emitted.map((r) => r.status)).toEqual(["preliminary", "released"]);
  });

  it("does not poll while realtime is healthy", async () => {
    const h = harness();
    h.stream();
    h.subscribeWith("SUBSCRIBED");
    await h.advance(60_000);
    expect(h.queries).toBe(0);
  });
});

describe("fallback — the case that would otherwise fail silently", () => {
  it("polls when the channel errors", async () => {
    // An unpublished table reports SUBSCRIBED and then delivers nothing;
    // a dead socket reports CHANNEL_ERROR. This covers the second.
    const h = harness([[row("r1", "preliminary")], [row("r1", "released")]]);
    h.stream();
    h.subscribeWith("CHANNEL_ERROR");
    await h.advance(0);
    expect(h.statuses).toContain("polling");
    expect(h.queries).toBe(1);

    await h.advance(5_000);
    expect(h.emitted).toEqual([row("r1", "released")]);
  });

  it("polls when subscribe never calls back at all", async () => {
    const h = harness([[row("r1", "preliminary")]]);
    h.stream();
    await h.advance(8_000);
    expect(h.statuses).toContain("polling");
    expect(h.queries).toBeGreaterThan(0);
  });

  it("does not re-emit an unchanged report on every poll", async () => {
    // The bug this prevents: a dashboard refreshing every five seconds
    // forever because the poll treats "still here" as "changed".
    const h = harness([
      [row("r1", "preliminary")],
      [row("r1", "preliminary")],
      [row("r1", "preliminary")],
    ]);
    h.stream();
    h.subscribeWith("CHANNEL_ERROR");
    await h.advance(0);
    await h.advance(5_000);
    await h.advance(5_000);
    expect(h.emitted).toEqual([]);
  });

  it("backs off to 15s after the first minute", async () => {
    const h = harness([[row("r1", "preliminary")]]);
    h.stream();
    h.subscribeWith("CHANNEL_ERROR");
    await h.advance(0);
    const before = h.queries;
    // Past the backoff threshold, a 5s tick must no longer be enough.
    await h.advance(60_000);
    const afterMinute = h.queries;
    await h.advance(5_000);
    expect(h.queries).toBe(afterMinute);
    await h.advance(10_000);
    expect(h.queries).toBeGreaterThan(afterMinute);
    expect(afterMinute).toBeGreaterThan(before);
  });
});

describe("watching one report", () => {
  it("stops polling once that report is released", async () => {
    const h = harness([[row("r1", "preliminary")], [row("r1", "released")]]);
    h.stream("r1");
    h.subscribeWith("CHANNEL_ERROR");
    await h.advance(0);
    await h.advance(5_000);
    expect(h.emitted).toEqual([row("r1", "released")]);
    expect(h.statuses).toContain("stopped");

    const settled = h.queries;
    await h.advance(60_000);
    expect(h.queries).toBe(settled);
  });

  it("ignores a different report's events", async () => {
    const h = harness();
    h.stream("r1");
    h.subscribeWith("SUBSCRIBED");
    h.fire("UPDATE", row("other", "released"));
    expect(h.emitted).toEqual([]);
    h.fire("UPDATE", row("r1", "released"));
    expect(h.emitted).toEqual([row("r1", "released")]);
  });
});

describe("cleanup", () => {
  it("removes the channel and cancels timers on dispose", async () => {
    const h = harness([[row("r1", "preliminary")]]);
    const s = h.stream();
    h.subscribeWith("CHANNEL_ERROR");
    await h.advance(0);
    s.dispose();
    expect(h.removed).toBe(1);
    const after = h.queries;
    await h.advance(60_000);
    expect(h.queries).toBe(after);
  });

  it("emits nothing after dispose", async () => {
    const h = harness();
    const s = h.stream();
    h.subscribeWith("SUBSCRIBED");
    s.dispose();
    h.fire("UPDATE", row("r1", "released"));
    expect(h.emitted).toEqual([]);
  });
});
