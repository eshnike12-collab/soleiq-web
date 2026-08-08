import { useEffect, useRef, type RefObject } from 'react'

/**
 * Whether the pointer is actually over this element.
 *
 * Each canvas keeps its own pointer, and reports it as (0, 0) until one enters
 * — which is the middle of that canvas, not "nowhere". So a panel the pointer
 * had never visited was being dented dead centre by a cursor sitting somewhere
 * else on the page entirely. Checking a real enter/leave is the only thing that
 * distinguishes "the pointer is at the middle" from "there is no pointer here".
 *
 * A ref rather than state: this is read inside a render loop, and it must not
 * re-render the tree sixty times a second.
 */
export function usePointerInside(ref: RefObject<HTMLElement | null>) {
  const inside = useRef(false)
  /** Set on the frame the pointer arrives, so the dent can start where it is. */
  const justEntered = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const enter = () => {
      inside.current = true
      justEntered.current = true
    }
    const leave = () => {
      inside.current = false
    }
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
    }
  }, [ref])

  return { inside, justEntered }
}
