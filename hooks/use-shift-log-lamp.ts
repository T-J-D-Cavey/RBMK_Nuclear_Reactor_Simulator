"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const FLASH_MS = 15000 // a new message flashes the header lamp for this long at most
const SEEN_MS = 3000 // or until the shift log has been in view this long (long enough to watch it print)

// The header's shift-log lamp (plan §21.5): flashes when a new message arrives, until the player has seen the log
// or 15 s have passed. Messages already in the log when the game loads don't count as new.
export function useShiftLogLamp(lastId: string | undefined, enabled: boolean) {
  const started = useRef(false)
  const known = useRef<string | undefined>(undefined)
  const [since, setSince] = useState<number | null>(null)
  const [inViewSince, setInViewSince] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (!started.current) {
      started.current = true
      known.current = lastId
      return
    }
    if (lastId === known.current) return
    known.current = lastId
    if (lastId !== undefined) setSince(Date.now())
  }, [enabled, lastId])

  useEffect(() => {
    if (since === null) return
    let end = since + FLASH_MS
    if (inViewSince !== null) end = Math.min(end, Math.max(since, inViewSince) + SEEN_MS)
    const timer = window.setTimeout(() => setSince(null), Math.max(0, end - Date.now()))
    return () => window.clearTimeout(timer)
  }, [since, inViewSince])

  const setInView = useCallback((inView: boolean) => setInViewSince((t) => (inView ? (t ?? Date.now()) : null)), [])
  const dismiss = useCallback(() => setSince(null), [])

  return { lit: since !== null, setInView, dismiss }
}
