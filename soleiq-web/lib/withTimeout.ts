/**
 * A deadline for any promise.
 *
 * WHY THIS IS A SHARED HELPER AND NOT AN INLINE setTimeout
 *
 * The language switcher hung forever on mobile, and the cause was not an
 * error — it was the absence of one. `import()` for a code-split chunk can
 * leave its promise permanently pending when the request neither completes
 * nor fails: a dropped connection mid-transfer, a proxy that holds the socket
 * open, or later a service worker serving a cache-first strategy with no
 * network fallback. `.catch()` and `.finally()` never run, because nothing
 * ever settles. The UI waits on a promise that will never answer.
 *
 * Rejecting is deliberately the behaviour, rather than resolving to a
 * fallback: the caller then handles a timeout on the same path it already
 * handles a failure, so there is one recovery path instead of two.
 *
 * Every async boundary in this app gets one of these. A loading state without
 * a deadline is a bug waiting for a bad network.
 */

export class TimeoutError extends Error {
  constructor(public readonly ms: number, label?: string) {
    super(
      label
        ? `${label} did not finish within ${ms}ms`
        : `Operation did not finish within ${ms}ms`
    );
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms, label)), ms);
  });
  // clearTimeout in finally so a fast success does not hold a timer — and,
  // more importantly in a test environment, does not keep the event loop
  // alive after the assertion has already passed.
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
