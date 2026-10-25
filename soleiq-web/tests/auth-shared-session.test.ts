import { describe, expect, it } from "vitest";
import { createElement, useContext } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthContext, useAuth, type AuthState } from "@/lib/auth";

/**
 * Every page gates itself with AuthGate, and AuthGate reads useAuth(). When
 * useAuth() owned its own state, each navigation re-ran a getUser() round trip
 * plus a profile and memberships query before the destination could paint, on
 * a session that had not changed. AuthProvider in the root layout resolves it
 * once; these tests pin the part that makes that work — that useAuth() prefers
 * the shared value over starting its own resolution.
 *
 * renderToStaticMarkup runs useState and useContext but not useEffect, which
 * is exactly the boundary of interest: the context plumbing, not the network.
 */

const RESOLVED: AuthState = {
  loading: false,
  userId: "user-1",
  profile: null,
  memberships: [],
  configurationError: null,
};

/** Renders whatever useAuth() returned, so it can be asserted from markup. */
function Probe() {
  const auth = useAuth();
  return createElement(
    "span",
    null,
    `loading=${auth.loading} userId=${auth.userId ?? "none"}`
  );
}

describe("useAuth with a provider above it", () => {
  it("returns the shared value instead of its own initial state", () => {
    const html = renderToStaticMarkup(
      createElement(AuthContext.Provider, { value: RESOLVED }, createElement(Probe))
    );
    expect(html).toContain("userId=user-1");
    // The whole point: a page under the provider is not left waiting.
    expect(html).toContain("loading=false");
  });

  it("does not report loading once the provider has resolved", () => {
    // A second, independent consumer sees the same settled state — this is
    // what stops N components on one page each doing their own round trips.
    const Two = () => createElement("div", null, createElement(Probe), createElement(Probe));
    const html = renderToStaticMarkup(
      createElement(AuthContext.Provider, { value: RESOLVED }, createElement(Two))
    );
    expect(html.match(/loading=false/g)).toHaveLength(2);
    expect(html).not.toContain("loading=true");
  });

  it("still works with no provider, rather than hanging forever", () => {
    // Rendered outside AuthProvider, useAuth falls back to resolving for
    // itself: loading starts true and its effect would do the round trips.
    const html = renderToStaticMarkup(createElement(Probe));
    expect(html).toContain("loading=true");
    expect(html).toContain("userId=none");
  });

  it("the context default is null, so absence is distinguishable", () => {
    // `null` rather than a fabricated AuthState is what lets useAuth tell
    // "no provider" apart from "provider says nobody is signed in".
    const Peek = () => {
      const ctx = useContext(AuthContext);
      return createElement("span", null, ctx === null ? "absent" : "present");
    };
    expect(renderToStaticMarkup(createElement(Peek))).toContain("absent");
  });
});
