"use client";

import { useEffect, useRef } from "react";

type CursorState = "default" | "text" | "link" | "canvas" | "pressed";

/** Text and headings: the square grows and goes hollow over these. */
const TEXT_SELECTOR = "h1,h2,h3,h4,p,li,dt,dd,blockquote,label,figcaption";
const LINK_SELECTOR =
  'a,button,[role="button"],[role="tab"],input,textarea,select,summary';

/**
 * Does following this take you off the app?
 *
 * Worked out from the element rather than declared on it, so a link added later
 * is marked without anyone remembering to. `href` is read through the anchor's
 * own resolved `hostname`, which handles relative URLs for free. `mailto:` and
 * `tel:` are left out: they hand off to another app rather than navigating
 * anywhere, and an arrow would be saying the wrong thing.
 */
function leavesTheSite(el: HTMLElement): boolean {
  if (el.getAttribute("target") === "_blank") return true;
  const a = el as HTMLAnchorElement;
  if (!a.href || typeof a.hostname !== "string" || !a.hostname) return false;
  if (a.protocol !== "http:" && a.protocol !== "https:") return false;
  return a.hostname !== window.location.hostname;
}

const LERP = 0.15;
/** Diameter of the lit patch of grid, in px. */
const LIGHT = 620;
/** How far a control lifts under the pointer. */
const LIFT_PX = 3;

/**
 * The pointer treatment from soleiqhealth.com, brought across to the app: a
 * small white square that follows the cursor, lights the background grid around
 * it, and grows into a large hollow square over text and controls.
 *
 * `mix-blend-mode: difference` inverts it against whatever is behind, so it
 * stays visible on the cream screens and on the dark camera views with no
 * per-screen bookkeeping.
 *
 * Safety rule, and it matters more here than on the marketing site: the native
 * cursor is only hidden once this one is genuinely running and has a real
 * pointer position. Anything that fails leaves the patient with their normal
 * pointer rather than none. Touch and reduced-motion never get it at all.
 */
export function Cursor({ enabled = true }: { enabled?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridWindowRef = useRef<HTMLDivElement>(null);
  const gridLinesRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<CursorState | null>(null);
  const nudgedRef = useRef<HTMLElement | null>(null);
  /** Elements still animating back, so re-hovering can cancel the cleanup. */
  const pendingRef = useRef(new Map<HTMLElement, number>());

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const box = boxRef.current;
    const grid = gridRef.current;
    const gridWindow = gridWindowRef.current;
    const gridLines = gridLinesRef.current;
    if (!box || !grid || !gridWindow || !gridLines) return;

    const root = document.documentElement;
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos = { ...target };
    let pressed = false;
    let live = false;
    let raf = 0;

    // Geometry is written inline rather than left to a stylesheet: this element
    // is the pointer, and it must never end up invisible because a rule lost a
    // cascade fight. `data-state` is kept for styling hooks and for testing.
    const STATES: Record<CursorState, { size: number; hollow: boolean }> = {
      default: { size: 11, hollow: false },
      text: { size: 38, hollow: true },
      link: { size: 48, hollow: true },
      canvas: { size: 25, hollow: true },
      pressed: { size: 9, hollow: false },
    };

    const apply = (state: CursorState) => {
      if (stateRef.current === state) return;
      stateRef.current = state;
      const { size, hollow } = STATES[state];
      box.dataset.state = state;
      box.style.width = `${size}px`;
      box.style.height = `${size}px`;
      box.style.background = hollow ? "transparent" : "#ffffff";
      box.style.borderWidth = hollow ? "1.5px" : "0px";
      // The square stays empty unless an element asks for a word by name.
      if (labelRef.current && state !== "link") labelRef.current.style.opacity = "0";
    };

    /**
     * Undoes whatever the last hovered element was given.
     *
     * The class carries the transition, so it has to outlive the value it is
     * animating back to — removed a frame later and the element would snap home
     * instead of settling. It is cleared after the transition instead, and
     * re-hovering in the meantime cancels the pending removal.
     */
    const clearNudge = () => {
      const el = nudgedRef.current;
      if (!el) return;
      // Leaves faster than it arrives, so moving between two paragraphs does
      // not leave both of them lit while one catches up with the other.
      el.style.transitionDuration = "0.1s";
      el.style.transform = "none";
      el.style.filter = "none";
      const settle = window.setTimeout(() => {
        el.classList.remove("cursor-nudge", "cursor-dim");
        el.style.transform = "";
        el.style.filter = "";
        el.style.transitionDuration = "";
      }, 320);
      pendingRef.current.set(el, settle);
      nudgedRef.current = null;
    };

    const hold = (el: HTMLElement, className: "cursor-nudge" | "cursor-dim") => {
      const pending = pendingRef.current.get(el);
      if (pending !== undefined) {
        window.clearTimeout(pending);
        pendingRef.current.delete(el);
      }
      nudgedRef.current = el;
      el.style.transform = "";
      el.style.filter = "";
      el.style.transitionDuration = "";
      el.classList.add(className);
    };

    /** A control lifts under the pointer. */
    const setLift = (el: HTMLElement) => {
      if (nudgedRef.current === el) return;
      clearNudge();
      // Never shove a whole layout block around — only leaf-ish controls.
      if (el.getBoundingClientRect().height > window.innerHeight * 0.7) return;
      hold(el, "cursor-nudge");
      el.style.transform = `translate3d(0, -${LIFT_PX}px, 0)`;
    };

    /**
     * Text that goes nowhere does not move. Moving it says "this does
     * something", which is a promise a paragraph cannot keep — so it only
     * deepens in colour, and the class does that with no transform at all.
     */
    const setDim = (el: HTMLElement) => {
      if (nudgedRef.current === el) return;
      clearNudge();
      if (el.getBoundingClientRect().height > window.innerHeight * 0.7) return;
      hold(el, "cursor-dim");
    };

    const resolve = (el: HTMLElement | null) => {
      box.dataset.icon = "";
      if (pressed) return apply("pressed");
      if (!el || typeof el.closest !== "function") return apply("default");

      const link = el.closest(LINK_SELECTOR) as HTMLElement | null;
      if (link) {
        apply("link");
        setLift(link);
        if (labelRef.current) {
          const custom = link.dataset.cursorLabel ?? "";
          labelRef.current.textContent = custom;
          labelRef.current.style.opacity = custom ? "1" : "0";
        }
        // A mark inside the ring instead of a word. Anything that leaves the
        // app gets the arrow automatically; `data-cursor-icon` overrides that.
        box.dataset.icon =
          link.dataset.cursorIcon ?? (leavesTheSite(link) ? "arrow" : "");
        return;
      }
      if (el.closest('[data-cursor="canvas"]')) {
        apply("canvas");
        clearNudge();
        return;
      }
      const text = el.closest(TEXT_SELECTOR) as HTMLElement | null;
      if (text) {
        apply("text");
        // Only ever the innermost block, so one string of text lights at a time.
        if (!text.querySelector(TEXT_SELECTOR)) setDim(text);
        else clearNudge();
        return;
      }
      apply("default");
      clearNudge();
    };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!live) {
        // First real pointer position: place the square there without a slide
        // in from the middle of the screen, then take over the cursor.
        live = true;
        pos.x = target.x;
        pos.y = target.y;
        root.classList.add("has-custom-cursor");
        box.style.opacity = "1";
        grid.style.opacity = "1";
        stateRef.current = null;
        apply("default");
      }
      resolve(e.target as HTMLElement | null);
    };

    const onDown = () => {
      pressed = true;
      apply("pressed");
    };
    const onUp = (e: PointerEvent) => {
      pressed = false;
      stateRef.current = null; // force the next resolve to write through
      resolve(e.target as HTMLElement | null);
    };
    const onLeave = () => {
      root.classList.remove("has-custom-cursor");
      box.style.opacity = "0";
      grid.style.opacity = "0";
    };
    const onEnter = () => {
      if (!live) return;
      root.classList.add("has-custom-cursor");
      box.style.opacity = "1";
      grid.style.opacity = "1";
    };

    let lastX = -1;
    let lastY = -1;
    const tick = () => {
      pos.x += (target.x - pos.x) * LERP;
      pos.y += (target.y - pos.y) * LERP;
      box.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;

      // The grid light follows the raw pointer, not the eased square: the light
      // should feel attached to the hand, and the square trailing it is the
      // part that reads as motion.
      //
      // Moving the light is two transforms, never a mask position. Animating a
      // mask's centre re-rasterises a full-viewport layer every frame. The
      // window carries a fixed mask and is translated; the grid inside
      // counter-translates by the same amount, so the lines stay pinned to the
      // viewport while the hole moves.
      const gx = Math.round(target.x);
      const gy = Math.round(target.y);
      if (gx !== lastX || gy !== lastY) {
        lastX = gx;
        lastY = gy;
        const ox = gx - LIGHT / 2;
        const oy = gy - LIGHT / 2;
        gridWindow.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
        gridLines.style.transform = `translate3d(${-ox}px, ${-oy}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);

    const pending = pendingRef.current;
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
      clearNudge();
      root.classList.remove("has-custom-cursor");
    };
  }, [enabled]);

  return (
    <>
      <div ref={gridRef} className="cursor-grid" aria-hidden="true">
        <div ref={gridWindowRef} className="cursor-grid-window">
          <div ref={gridLinesRef} className="cursor-grid-lines" />
        </div>
      </div>
      <div ref={boxRef} className="cursor-box" data-state="default" aria-hidden="true">
        <span ref={labelRef} className="cursor-label" />
      </div>
    </>
  );
}
