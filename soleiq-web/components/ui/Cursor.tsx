"use client";

import { useEffect, useRef } from "react";

/**
 * A small square that follows the pointer and lights the background grid.
 *
 * IT NEVER CHANGES SIZE OR SHAPE. There is no hover state, and deliberately
 * no machinery for one: no state table, no hover-target selectors, no
 * `data-cursor` hooks, no label, no icon, no element nudging. Those were
 * removed rather than neutralised, so nothing can quietly switch back on.
 *
 * The one thing it still does on hover is nothing at all.
 *
 * `mix-blend-mode: difference` (in CSS) inverts it against whatever is behind,
 * so it reads as a black dot on the cream screens and stays visible on dark
 * camera views. Kept on purpose: a solid-black dot would vanish against the
 * dark capture surfaces, which in this app is where a patient is aiming a camera at their foot.
 *
 * Safety rule: the native cursor is only hidden once this one is genuinely
 * running and has a real pointer position, so anything that fails leaves the
 * user with their normal pointer rather than none. Touch and reduced-motion
 * never get it at all.
 */

const LERP = 0.15;
/** Diameter of the lit patch of grid, in px. */
const LIGHT = 620;

export function Cursor({ enabled = true }: { enabled?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridWindowRef = useRef<HTMLDivElement>(null);
  const gridLinesRef = useRef<HTMLDivElement>(null);

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
    let live = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!live) {
        // First real pointer position: place the square there without sliding
        // in from the middle of the screen, then take over the cursor.
        live = true;
        pos.x = target.x;
        pos.y = target.y;
        root.classList.add("has-custom-cursor");
        box.style.opacity = "1";
        grid.style.opacity = "1";
      }
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
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerenter", onEnter);
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
      <div ref={boxRef} className="cursor-box" aria-hidden="true" />
    </>
  );
}
