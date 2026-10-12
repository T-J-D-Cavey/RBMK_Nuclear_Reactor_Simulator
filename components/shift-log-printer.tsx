"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { GameState, LogEntry, LogSource } from "@/lib/types"
import { formatLogTime } from "@/lib/game-utils"
import { getSafetyTestStatus } from "@/lib/safety-test"
import { useTypewriter } from "@/hooks/use-typewriter"
import { usePrefersReducedMotion } from "@/components/presentation-use-reduced-motion"
import { type Segment, TypedSegments } from "@/components/typed-text"

const VISIBLE_MESSAGES = 4 // the rest have fed out of sight below the window
const MIN_LINES = 4 // blank paper the window shows before the shift has said much
const FEED_MS = 450
const CHARS_PER_SECOND = 70
const FEED_EASING = "cubic-bezier(0.2, 0.7, 0.3, 1)"

// Ink by kind of sender (bible §15: distinguish message sources visually). The paper is always cream, so these
// are fixed colours rather than theme tokens.
const INK: Record<LogSource, string> = {
  grid: "text-blue-800",
  engineer: "text-amber-800",
  procedure: "text-stone-900",
  alarm: "text-red-700",
}

// The ink key above the paper, like the chart recorder's legend: who has spoken, and when they last did.
const INK_KEY: { source: LogSource; label: string; swatch: string }[] = [
  { source: "grid", label: "Grid", swatch: "bg-blue-800" },
  { source: "engineer", label: "Station crew", swatch: "bg-amber-800" },
  { source: "alarm", label: "Urgent", swatch: "bg-red-700" },
]

function segmentsFor(gameState: GameState, entry: LogEntry): Segment[] {
  return [
    { text: `[${formatLogTime(gameState, entry)}] `, className: "ws5-printer-stamp tabular-nums" },
    { text: `${entry.from}: `, className: `font-bold ${INK[entry.source] ?? INK.engineer}` },
    { text: entry.text },
  ]
}

// The shift log as a teleprinter (owner, 2026-10-12): every message comes from a person and is printed on the
// chart recorder's paper. The newest line prints at the top, the paper feeds down to make room for it, and the
// oldest of the four in view feeds out of sight below. The player can drag the paper (or use the mouse wheel or
// arrow keys) to read back. The housing matches the chart recorder: status lamp, ink key, dark paper window.
// In the Safety Test it is the test procedure, with the phase and standing orders on a card above the paper.
export default function ShiftLogPrinter({ gameState }: { gameState: GameState }) {
  const [visible, setVisible] = useState(true)
  const [printing, setPrinting] = useState(false)
  const isTest = gameState.mode === "safety_test"
  const status = isTest ? getSafetyTestStatus(gameState) : null

  // Unread marker while the log is collapsed
  const log = gameState.log
  const lastId = log[log.length - 1]?.id
  const [seenId, setSeenId] = useState<string | undefined>(lastId)
  useEffect(() => {
    if (visible) setSeenId(lastId)
  }, [visible, lastId])
  const hasUnread = !visible && lastId !== undefined && lastId !== seenId

  const Chevron = visible ? ChevronUp : ChevronDown
  const lit = visible && printing

  return (
    <section className="bg-card border-4 border-primary p-3 space-y-2">
      <button
        onClick={() => setVisible(!visible)}
        aria-expanded={visible}
        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider">{isTest ? "Test Procedure" : "Shift Log"}</span>
          {hasUnread && <span className="ws5-unread font-mono text-[10px] font-bold uppercase">New</span>}
        </span>
        <span className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono uppercase text-muted-foreground">
          <span
            className={`retro-lamp inline-block w-2.5 h-2.5 ${lit ? "bg-amber-500 text-amber-500 on ws5-lamp-blink" : "bg-green-500 text-green-500 on"}`}
          />
          {lit ? "Printing" : "On line"}
          <Chevron className="h-5 w-5 ml-1 text-foreground" />
        </span>
      </button>

      {visible && (
        <>
          {status ? (
            <div className="ws5-procedure-sheet border-2 px-3 py-1.5 font-mono text-xs sm:text-sm text-amber-950 space-y-0.5">
              <div className="font-bold uppercase tracking-wide">
                Phase {status.phase} of 6 · {status.name}
              </div>
              {status.order && (
                <div>
                  <span className="font-bold uppercase">Orders: </span>
                  {status.order}
                </div>
              )}
            </div>
          ) : (
            <InkKey gameState={gameState} />
          )}
          <Paper gameState={gameState} onPrinting={setPrinting} />
        </>
      )}
    </section>
  )
}

function InkKey({ gameState }: { gameState: GameState }) {
  return (
    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono uppercase">
      {INK_KEY.map((key) => {
        const last = gameState.log.findLast((entry) => entry.source === key.source)
        return (
          <div key={key.source} className="bg-background border-2 border-border px-1.5 py-1 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className={`inline-block w-3 h-0.5 shrink-0 ${key.swatch}`} />
              <span className="truncate text-muted-foreground">{key.label}</span>
            </div>
            <div className={`font-bold tabular-nums ${INK[key.source]}`}>{last ? formatLogTime(gameState, last) : "—"}</div>
          </div>
        )
      })}
    </div>
  )
}

function Paper({ gameState, onPrinting }: { gameState: GameState; onPrinting: (printing: boolean) => void }) {
  const reduced = usePrefersReducedMotion()
  const segments = new Map(gameState.log.map((entry) => [entry.id, segmentsFor(gameState, entry)]))
  const lines = gameState.log.map((entry) => ({ key: entry.id, text: (segments.get(entry.id) ?? []).map((segment) => segment.text).join("") }))
  // Oldest first, so a burst of messages prints in order; shown newest first.
  const printed = useTypewriter(lines, { charsPerSecond: CHARS_PER_SECOND, delayMs: FEED_MS, instant: reduced }).reverse()
  const newest = printed[0]?.key

  // The housing's lamp shows when a line is feeding or printing.
  const printing = printed.some((line) => line.typing)
  useEffect(() => onPrinting(printing), [printing, onPrinting])
  useEffect(() => () => onPrinting(false), [onPrinting])

  const viewportRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const offset = useRef(0) // paper position: 0 shows the newest line, negative reads back
  const windowHeight = useRef(0)
  const lineHeight = useRef(22)
  const hasEarlier = useRef(false) // more than four messages, so some have fed out of sight
  const drag = useRef<{ y: number; from: number } | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [canReadBack, setCanReadBack] = useState(false)
  const [readingBack, setReadingBack] = useState(false)

  const lowest = () => (hasEarlier.current ? Math.min(0, windowHeight.current - (paperRef.current?.offsetHeight ?? 0)) : 0)

  const moveTo = useCallback((y: number, animate: boolean) => {
    offset.current = y
    const paper = paperRef.current
    if (paper) {
      paper.style.transition = animate ? `transform ${FEED_MS}ms ${FEED_EASING}` : "none"
      paper.style.transform = `translateY(${y}px)`
    }
    setReadingBack(y < -1)
  }, [])

  // The window shows the newest four messages (or a few blank lines before there are four).
  const measure = useCallback(() => {
    const paper = paperRef.current
    if (!paper) return
    const style = getComputedStyle(paper)
    const top = parseFloat(style.paddingTop) || 0
    lineHeight.current = parseFloat(style.lineHeight) || lineHeight.current
    const rows = paper.querySelectorAll<HTMLElement>("[data-entry]")
    let h = top
    for (let i = 0; i < Math.min(VISIBLE_MESSAGES, rows.length); i++) h += rows[i].offsetHeight
    // A few pixels spare, so the roller shading falls below the last line of text rather than across it
    const next = Math.ceil(Math.max(h, top + MIN_LINES * lineHeight.current)) + 6
    windowHeight.current = next
    hasEarlier.current = rows.length > VISIBLE_MESSAGES
    setHeight(next)
    setCanReadBack(hasEarlier.current)
    if (offset.current < lowest()) moveTo(lowest(), false)
  }, [moveTo])

  useLayoutEffect(measure, [measure, printed.length, newest])

  useEffect(() => {
    const paper = paperRef.current
    if (!paper || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => measure())
    observer.observe(paper)
    return () => observer.disconnect()
  }, [measure])

  // A new message: the paper starts where it was, then feeds down by the new line's height while it prints.
  const lastNewest = useRef(newest)
  useLayoutEffect(() => {
    if (newest === lastNewest.current) return
    lastNewest.current = newest
    const paper = paperRef.current
    const row = paper?.querySelector<HTMLElement>("[data-entry]")
    if (!paper || !row || reduced) return moveTo(0, false)
    moveTo(offset.current - row.offsetHeight, false)
    void paper.offsetHeight // commit the start position before animating
    moveTo(0, true)
  }, [newest, reduced, moveTo])

  // Mouse wheel moves the paper, not the page, until the paper reaches its end. Needs a non-passive listener.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const onWheel = (e: WheelEvent) => {
      const dy = e.deltaMode === 1 ? e.deltaY * lineHeight.current : e.deltaY
      const next = Math.max(lowest(), Math.min(0, offset.current - dy))
      if (Math.abs(next - offset.current) < 0.5) return
      e.preventDefault()
      moveTo(next, false)
    }
    viewport.addEventListener("wheel", onWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", onWheel)
  }, [moveTo])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!canReadBack || e.button !== 0) return
    drag.current = { y: e.clientY, from: offset.current }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) moveTo(Math.max(lowest(), Math.min(0, drag.current.from + e.clientY - drag.current.y)), false)
  }
  const endDrag = () => {
    drag.current = null
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const page = windowHeight.current * 0.75
    const steps: Record<string, number> = { ArrowDown: -lineHeight.current, ArrowUp: lineHeight.current, PageDown: -page, PageUp: page }
    let next: number | null = null
    if (e.key in steps) next = offset.current + steps[e.key]
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = lowest()
    if (next === null) return
    e.preventDefault()
    moveTo(Math.max(lowest(), Math.min(0, next)), !reduced)
  }

  const recent = gameState.log.slice(-VISIBLE_MESSAGES)

  return (
    <div className="ws3-chart-window bg-neutral-800 border-2 border-neutral-900 p-1">
      <div
        ref={viewportRef}
        tabIndex={0}
        role="group"
        aria-label="Shift log paper. Drag it, or use the arrow keys, to read earlier messages."
        className={`ws5-printer-viewport ${canReadBack ? "ws5-printer-draggable" : ""}`}
        style={{ height: height ?? undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <div ref={paperRef} className="ws5-printer-paper font-mono" aria-hidden="true">
          {printed.map((line) => (
            <div key={line.key} data-entry={line.key} className="break-words">
              <TypedSegments
                segments={segments.get(line.key) ?? []}
                shown={line.shown}
                reserve
                cursor={line.typing ? <span className="ws5-print-cursor" /> : null}
              />
            </div>
          ))}
        </div>

        {/* Print head above the newest line, roller below the oldest */}
        <div className="ws5-print-head" />
        <div className="ws5-printer-roller" />
      </div>

      {/* The printer's base plate: how to read back, or the way back to the newest message */}
      <div className="flex items-center justify-between gap-2 px-1 pt-1 h-5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
        <span>Teleprinter · Unit 4</span>
        {readingBack ? (
          <button type="button" className="font-bold uppercase tracking-wider text-neutral-200 hover:text-white" onClick={() => moveTo(0, !reduced)}>
            ▲ Back to latest
          </button>
        ) : (
          canReadBack && <span>Drag paper ▲ to read back</span>
        )}
      </div>

      <ol className="sr-only" role="log" aria-live="polite">
        {recent.map((entry) => (
          <li key={entry.id}>
            {formatLogTime(gameState, entry)}, {entry.from}: {entry.text}
          </li>
        ))}
      </ol>
    </div>
  )
}
