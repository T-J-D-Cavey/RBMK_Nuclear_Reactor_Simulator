"use client"

import { useEffect, useReducer, useRef } from "react"

export interface Line {
  key: string
  text: string
}

export interface TypedLine extends Line {
  shown: number // characters typed so far
  typing: boolean
}

interface Options {
  charsPerSecond: number
  /** Pause before each line starts, e.g. while the paper feeds. */
  delayMs?: number
  /** Type out the lines already there when the component mounts. Otherwise they appear complete. */
  typeExisting?: boolean
  /** Reduced motion: every line appears complete at once. */
  instant?: boolean
}

const FRAME_MS = 33

// Types lines out one at a time, in the order given. Lines still waiting their turn are left out. Once a line
// is complete it stays complete even if its text changes, so a countdown updates in place. A line that goes
// away and comes back is typed again.
export function useTypewriter(lines: Line[], { charsPerSecond, delayMs = 0, typeExisting = false, instant = false }: Options): TypedLine[] {
  // Characters typed per line; Infinity once complete.
  const progress = useRef<Map<string, number> | null>(null)
  if (progress.current === null) {
    progress.current = new Map(typeExisting ? [] : lines.map((line) => [line.key, Infinity]))
  }
  const typed = progress.current
  const [, rerender] = useReducer((n: number) => n + 1, 0)

  const present = new Set(lines.map((line) => line.key))
  for (const key of [...typed.keys()]) if (!present.has(key)) typed.delete(key)

  const current = lines.find((line) => (typed.get(line.key) ?? 0) !== Infinity)
  const latestText = useRef(new Map<string, string>())
  latestText.current = new Map(lines.map((line) => [line.key, line.text]))

  useEffect(() => {
    if (!current) return
    const key = current.key
    if (instant) {
      for (const k of latestText.current.keys()) typed.set(k, Infinity)
      rerender()
      return
    }
    const start = performance.now() + delayMs
    let timer = 0
    const step = () => {
      const text = latestText.current.get(key)
      if (text === undefined) return
      const n = Math.max(0, ((performance.now() - start) / 1000) * charsPerSecond)
      typed.set(key, n >= text.length ? Infinity : n)
      rerender()
      if (n < text.length) timer = window.setTimeout(step, FRAME_MS)
    }
    timer = window.setTimeout(step, Math.max(FRAME_MS, delayMs))
    return () => window.clearTimeout(timer)
  }, [current?.key, instant, charsPerSecond, delayMs, typed])

  const out: TypedLine[] = []
  for (const line of lines) {
    const n = typed.get(line.key) ?? 0
    const done = n === Infinity
    out.push({ ...line, shown: done ? line.text.length : Math.floor(n), typing: !done })
    if (!done) break
  }
  return out
}
