import { describe, expect, it, vi } from "vitest";
import { TimeoutError, withTimeout } from "@/lib/withTimeout";

/**
 * The language switcher hung forever on mobile. The cause was not an error —
 * it was the absence of one: a dynamic `import()` whose request neither
 * completes nor fails leaves its promise permanently pending, so `.catch()`
 * and `.finally()` never run and the spinner never clears.
 *
 * These lock in the deadline that makes that impossible.
 */
describe("withTimeout", () => {
  it("passes a fast result straight through", async () => {
    await expect(withTimeout(Promise.resolve("en"), 1000)).resolves.toBe("en");
  });

  it("rejects a promise that NEVER settles — the actual hang", async () => {
    vi.useFakeTimers();
    // No resolve, no reject. Exactly what a hung chunk request looks like.
    const forever = new Promise<string>(() => {});
    const raced = withTimeout(forever, 8000, "locale bn");
    const assertion = expect(raced).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
    vi.useRealTimers();
  });

  it("names what timed out, so the log says which locale", async () => {
    vi.useFakeTimers();
    const raced = withTimeout(new Promise<string>(() => {}), 500, "locale ar");
    const assertion = expect(raced).rejects.toThrow(/locale ar/);
    await vi.advanceTimersByTimeAsync(500);
    await assertion;
    vi.useRealTimers();
  });

  it("still surfaces a genuine rejection rather than masking it as a timeout", async () => {
    // A 404 on a locale bundle must stay a 404 in the logs.
    const failed = Promise.reject(new Error("404 chunk not found"));
    await expect(withTimeout(failed, 1000)).rejects.toThrow("404 chunk not found");
  });

  it("does not leave a timer running after a fast success", async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(global, "clearTimeout");
    await withTimeout(Promise.resolve(1), 5000);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    vi.useRealTimers();
  });
});
