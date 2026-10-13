"use client"

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { GameState, LogEntry } from "@/lib/types"
import { formatLogTime } from "@/lib/game-utils"
import { usePrefersReducedMotion } from "@/components/presentation-use-reduced-motion"
import { useReveal } from "@/hooks/use-reveal"

const FULL_MESSAGES = 2 // messages wholly in view (owner); older ones are on the roll below
const PEEK_LINES = 0.5 // the top half of the next line down shows at the roller, so the roll looks like it goes on
const TYPICAL_CHARS = 110 // a typical message with its time and sender (the median is about 107), for sizing the window
const FLASH_MS = 1200 // the Printing lamp flashes three times as the message starts printing
const PRINT_MS = 800 // then shines steadily while it finishes
const FEED_MS = 450 // then the paper feeds to show the printed message
const FEED_EASING = "cubic-bezier(0.2, 0.7, 0.3, 1)"

type Lamp = "off" | "flash" | "on"
type Stage = "idle" | "flash" | "print" | "feed"

// The shift log as a teleprinter (owner, 2026-10-12): every message comes from a person and is printed in
// capitals, in one ink, on the chart recorder's paper. A new message is printed out of sight under the print head
// while the Printing lamp flashes and then shines; then the paper feeds down to show it whole at the top, and the
// message that was on top drops to about halfway. Two messages are in view, with half a line of the next showing
// at the roller and the rest of the roll below it. The player can drag the paper (or use the mouse wheel or arrow
// keys) to read back. The housing matches the alarm monitor's. The Safety Test uses the same log: its orders are
// messages on the paper (owner). The header's "See Message" key (revealSignal) opens it and scrolls it into view, and
// onInView tells the header's shift-log lamp whether the open paper is on screen (plan §21.5).
export default function ShiftLogPrinter({
  gameState,
  revealSignal = 0,
  onInView,
}: {
  gameState: GameState
  revealSignal?: number
  onInView?: (inView: boolean) => void
}) {
  const [visible, setVisible] = useState(true)
  const [lamp, setLamp] = useState<Lamp>("off")
  const section = useRef<HTMLElement>(null)
  useReveal(revealSignal, visible, useCallback(() => setVisible(true), []), section)

  useEffect(() => {
    const el = section.current
    if (!onInView || !el || !visible || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => onInView(entry.isIntersecting), { threshold: 0.5 })
    observer.observe(el)
    return () => {
      observer.disconnect()
      onInView(false)
    }
  }, [onInView, visible])

  // Unread marker while the log is collapsed
  const log = gameState.log
  const lastId = log[log.length - 1]?.id
  const [seenId, setSeenId] = useState<string | undefined>(lastId)
  useEffect(() => {
    if (visible) setSeenId(lastId)
  }, [visible, lastId])
  const hasUnread = !visible && lastId !== undefined && lastId !== seenId

  const Chevron = visible ? ChevronUp : ChevronDown
  const lit = visible ? lamp : "off"

  return (
    <section ref={section} id="shift-log" className="ws3-cam-bezel rounded-md p-2 sm:p-2.5">
      <button
        onClick={() => setVisible(!visible)}
        aria-expanded={visible}
        className="w-full flex items-center justify-between gap-2 px-1 pb-2 text-left cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-200 truncate">
            SKALA · Shift Log
          </span>
          {hasUnread && <span className="ws5-unread font-mono text-[10px] font-bold uppercase">New</span>}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span
            className={`retro-lamp inline-block w-2.5 h-2.5 shrink-0 ${
              lit === "off" ? "bg-yellow-900" : `bg-yellow-400 text-yellow-400 on ${lit === "flash" ? "ws5-lamp-flash" : ""}`
            }`}
          />
          <span className={`font-mono text-[10px] sm:text-xs font-bold uppercase ${lit === "off" ? "text-neutral-400" : "text-yellow-300"}`}>
            Printing
          </span>
          <Chevron className="h-5 w-5 ml-1 text-neutral-300" />
        </span>
      </button>

      {visible && <Paper gameState={gameState} onLamp={setLamp} />}
    </section>
  )
}

// Which messages are on the paper, and what the printer is doing. Messages already in the log when the paper
// appears are on it from the start. Each new one goes through flash, print and feed before the next starts, so a
// burst of messages prints in order. Reduced motion puts each on the paper at once.
function usePrintQueue(log: LogEntry[], reduced: boolean) {
  const printedIds = useRef<Set<string> | null>(null)
  if (printedIds.current === null) printedIds.current = new Set(log.map((entry) => entry.id))
  const printed = printedIds.current
  const [stage, setStage] = useState<Stage>("idle")
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const waiting = log.find((entry) => !printed.has(entry.id))?.id

  useEffect(() => {
    if (stage === "idle") {
      if (!waiting) return
      if (reduced) {
        printed.add(waiting)
        rerender()
      } else {
        setStage("flash")
      }
      return
    }
    const timer = window.setTimeout(
      () => {
        if (stage === "flash") return setStage("print")
        if (stage === "feed") return setStage("idle")
        if (waiting) printed.add(waiting) // printed: now the paper feeds to show it
        setStage("feed")
      },
      { flash: FLASH_MS, print: PRINT_MS, feed: FEED_MS }[stage],
    )
    return () => window.clearTimeout(timer)
  }, [stage, waiting, reduced, printed])

  return { onPaper: log.filter((entry) => printed.has(entry.id)), stage }
}

function Paper({ gameState, onLamp }: { gameState: GameState; onLamp: (lamp: Lamp) => void }) {
  const reduced = usePrefersReducedMotion()
  const { onPaper, stage } = usePrintQueue(gameState.log, reduced)
  const entries = onPaper.reverse() // newest at the top
  const newest = entries[0]?.id

  // The housing's lamp: flashes as a message starts printing, then shines until the paper has fed.
  useLayoutEffect(() => onLamp(stage === "flash" ? "flash" : stage === "idle" ? "off" : "on"), [stage, onLamp])
  useEffect(() => () => onLamp("off"), [onLamp])

  const viewportRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLDivElement>(null) // an invisible one-line message, for sizing the window
  const offset = useRef(0) // paper position: 0 shows the newest line, negative reads back
  const windowHeight = useRef(0)
  const lineHeight = useRef(22)
  const hasEarlier = useRef(false) // some printed text is below the window
  const drag = useRef<{ y: number; from: number } | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [canReadBack, setCanReadBack] = useState(false)
  const [readingBack, setReadingBack] = useState(false)

  // Reading back stops a line below the oldest message, not at the end of the blank paper under it.
  const printedEnd = () => {
    const last = paperRef.current?.querySelector<HTMLElement>("[data-entry]:last-child")
    return last ? last.offsetTop + last.offsetHeight + lineHeight.current : 0
  }
  const lowest = () => (hasEarlier.current ? Math.min(0, windowHeight.current - printedEnd()) : 0)

  const moveTo = useCallback((y: number, animate: boolean) => {
    offset.current = y
    const paper = paperRef.current
    if (paper) {
      paper.style.transition = animate ? `transform ${FEED_MS}ms ${FEED_EASING}` : "none"
      paper.style.transform = `translateY(${y}px)`
    }
    setReadingBack(y < -1)
  }, [])

  // The window is a fixed height for the paper's width, so it never changes as messages come and go (owner): room
  // for two messages of typical length and half of the first line of the next. Only the paper moves.
  const measure = useCallback(() => {
    const paper = paperRef.current
    const probe = probeRef.current
    if (!paper || !probe) return
    const style = getComputedStyle(paper)
    const top = parseFloat(style.paddingTop) || 0
    const lh = (lineHeight.current = parseFloat(style.lineHeight) || lineHeight.current)
    const gap = parseFloat(getComputedStyle(probe).paddingTop) || 0 // space above a message's text
    const charWidth = probe.firstElementChild?.getBoundingClientRect().width || 9
    const textWidth = paper.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)
    const linesPerMessage = Math.max(1, Math.round(TYPICAL_CHARS / Math.max(1, Math.floor(textWidth / charWidth))))
    const message = probe.offsetHeight + (linesPerMessage - 1) * lh
    const next = Math.round(top + FULL_MESSAGES * message + gap + PEEK_LINES * lh)
    windowHeight.current = next
    const last = paper.querySelector<HTMLElement>("[data-entry]:last-child")
    hasEarlier.current = !!last && last.offsetTop + last.offsetHeight > next + 1 // some printed text is out of sight
    setHeight(next)
    setCanReadBack(hasEarlier.current)
    if (offset.current < lowest()) moveTo(lowest(), false)
  }, [moveTo])

  useLayoutEffect(measure, [measure, entries.length, newest])

  useEffect(() => {
    const paper = paperRef.current
    if (!paper || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => measure())
    observer.observe(paper)
    return () => observer.disconnect()
  }, [measure])

  // A message has been printed: it starts out of sight above the window, and the paper feeds down by its height
  // to show it.
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

  const recent = gameState.log.slice(-(FULL_MESSAGES + 1))

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
          <div ref={probeRef} className="ws5-printer-entry invisible absolute">
            <span>M</span>
          </div>
          {entries.map((entry) => (
            <div key={entry.id} data-entry={entry.id} className="ws5-printer-entry break-words">
              <span className="tabular-nums">[{formatLogTime(gameState, entry)}] </span>
              <span className="font-bold">{entry.from}: </span>
              {entry.text}
            </div>
          ))}
        </div>

        {/* Print head above the newest line, roller below the oldest */}
        <div className="ws5-print-head" />
        <div className="ws5-printer-roller" />
      </div>

      {/* The printer's base plate: how to read back, or the way back to the newest message */}
      <div className="flex items-center justify-end gap-2 px-1 pt-1 h-5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
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
