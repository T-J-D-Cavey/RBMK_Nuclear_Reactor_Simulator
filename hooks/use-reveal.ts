"use client"

import { type RefObject, useEffect, useRef } from "react"
import { usePrefersReducedMotion } from "@/components/presentation-use-reduced-motion"

// The header's "See Warning" / "See Message" keys (plan §21.5): each press bumps a counter. The machine opens if
// it was collapsed, and once it has rendered open it scrolls to the middle of the screen.
export function useReveal(signal: number, visible: boolean, open: () => void, ref: RefObject<HTMLElement | null>) {
  const reduced = usePrefersReducedMotion()
  const pending = useRef(false)

  useEffect(() => {
    if (!signal) return
    pending.current = true
    open()
  }, [signal, open])

  useEffect(() => {
    if (!pending.current || !visible) return
    pending.current = false
    ref.current?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" })
  }, [signal, visible, reduced, ref])
}
