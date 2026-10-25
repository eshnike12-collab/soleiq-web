import {
  isRelevantChange,
  isSettled,
  pollIntervalFor,
  shouldKeepPolling,
  type ReportStreamRow,
} from "./reportStream";

/**
 * The subscribe / fall back / de-duplicate machinery, with React and the real
 * Supabase client factored out.
 *
 * Separated from useReportStream so it can actually be tested. The parts most
 * likely to be wrong — does a dead channel fall back, does polling re-fire the
 * same event forever, does a settled report stop the timer, does unmounting
 * remove the channel — are exactly the parts a hook makes unreachable from a
 * node test runner without pulling in a DOM and a renderer.
 *
 * Timers are injected for the same reason: the fallback waits five seconds,
 * and a test that genuinely waits five seconds is a test nobody runs.
 */

export type StreamStatus = "connecting" | "realtime" | "polling" | "stopped";

/** The slice of the Supabase client this needs. */
export interface StreamClient {
  channel(name: string): StreamChannel;
  removeChannel(channel: unknown): unknown;
  from(table: string): StreamQuery;
}

export interface StreamChannel {
  on(event: string, filter: unknown, handler: (message: any) => void): StreamChannel;
  subscribe(callback: (status: string) => void): StreamChannel;
}

export interface StreamQuery {
  select(columns: string): StreamQuery;
  order(column: string, options: { ascending: boolean }): StreamQuery;
  limit(count: number): StreamQuery;
  eq(column: string, value: unknown): StreamQuery;
  then: Promise<{ data: unknown; error: unknown }>["then"];
}

export interface StreamDeps {
  client: StreamClient;
  onChange: (row: ReportStreamRow) => void;
  onStatus?: (status: StreamStatus) => void;
  watchReportId?: string;
  /** Injected for tests. Default to the real ones. */
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
  now?: () => number;
  /** How long to wait for SUBSCRIBED before falling back. */
  subscribeTimeoutMs?: number;
}

export interface ReportStream {
  dispose(): void;
}

const DEFAULT_SUBSCRIBE_TIMEOUT_MS = 8_000;

export function createReportStream(deps: StreamDeps): ReportStream {
  const {
    client,
    onChange,
    onStatus,
    watchReportId,
    subscribeTimeoutMs = DEFAULT_SUBSCRIBE_TIMEOUT_MS,
  } = deps;
  const schedule = deps.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
  const unschedule = deps.clearTimeout ?? ((h) => clearTimeout(h as never));
  const now = deps.now ?? (() => Date.now());

  let disposed = false;
  let pollTimer: unknown = null;
  let subscribeTimer: unknown = null;
  const startedAt = now();
  /** Last seen status per report, so a steady poll reports real changes only. */
  const seen = new Map<string, string | null>();
  let watched: ReportStreamRow | null = null;
  let status: StreamStatus = "connecting";

  const setStatus = (next: StreamStatus) => {
    if (disposed || status === next) return;
    status = next;
    onStatus?.(next);
  };

  const stopPolling = () => {
    if (pollTimer !== null) {
      unschedule(pollTimer);
      pollTimer = null;
    }
  };

  const emit = (row: ReportStreamRow) => {
    if (disposed) return;
    if (!isRelevantChange(row, watchReportId)) return;
    if (watchReportId && row.id === watchReportId) watched = row;
    onChange(row);
    if (watchReportId && isSettled(row)) {
      stopPolling();
      setStatus("stopped");
    }
  };

  const pollOnce = async () => {
    if (disposed) return;
    try {
      let query = client
        .from("reports")
        .select(
          "id, status, screening_session_id, organization_patient_id, finalized_at, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(watchReportId ? 1 : 20);
      if (watchReportId) query = query.eq("id", watchReportId);
      const { data, error } = (await query) as {
        data: ReportStreamRow[] | null;
        error: unknown;
      };
      if (error || !data) return;

      for (const row of data) {
        const first = !seen.has(row.id);
        const previous = seen.get(row.id);
        seen.set(row.id, row.status ?? null);
        // The first pass populates the map rather than observing it; emitting
        // then would fire once for every report that already existed.
        if (!first && previous !== (row.status ?? null)) emit(row);
        else if (watchReportId && row.id === watchReportId) watched = row;
      }
    } catch {
      /* A failed poll is not worth surfacing; the next may succeed. */
    } finally {
      if (disposed) return;
      if (!shouldKeepPolling(watched, watchReportId)) {
        setStatus("stopped");
        return;
      }
      pollTimer = schedule(() => void pollOnce(), pollIntervalFor(now() - startedAt));
    }
  };

  const startPolling = () => {
    if (disposed || pollTimer !== null || status === "stopped") return;
    setStatus("polling");
    void pollOnce();
  };

  // No `filter` on the subscription: RLS already scopes which rows reach this
  // client, and a filter here would be a second copy of that rule.
  const channel = client
    .channel(`reports-stream-${watchReportId ?? "all"}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "reports" },
      (message: any) => emit(message.new as ReportStreamRow)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "reports" },
      (message: any) => emit(message.new as ReportStreamRow)
    )
    .subscribe((channelStatus: string) => {
      if (disposed) return;
      if (channelStatus === "SUBSCRIBED") {
        if (subscribeTimer !== null) unschedule(subscribeTimer);
        stopPolling();
        setStatus("realtime");
        return;
      }
      if (
        channelStatus === "CHANNEL_ERROR" ||
        channelStatus === "TIMED_OUT" ||
        channelStatus === "CLOSED"
      ) {
        // Socket gone, or the table is not published. Either way the page has
        // to keep resolving, so fall back rather than wait.
        startPolling();
      }
    });

  // Belt and braces: `subscribe` is not guaranteed to call back at all, and a
  // channel that simply never answers must still fall back.
  subscribeTimer = schedule(() => {
    if (!disposed) startPolling();
  }, subscribeTimeoutMs);

  return {
    dispose() {
      disposed = true;
      stopPolling();
      if (subscribeTimer !== null) unschedule(subscribeTimer);
      client.removeChannel(channel);
    },
  };
}
