import { DomainError } from "./errors";

interface Bucket {
  count: number;
  resetsAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Process-local limiter for development and a second line of defense.
 * Production deployments should provide a shared Redis/edge implementation.
 */
export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    throw new DomainError(
      "RATE_LIMITED",
      "Too many requests. Please try again shortly.",
      429
    );
  }
  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetsAt <= now) buckets.delete(bucketKey);
    }
  }
}

