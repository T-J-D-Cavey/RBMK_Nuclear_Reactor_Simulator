"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { Warning } from "@/lib/game-utils"
import { type Line, type TypedLine, useTypewriter } from "@/hooks/use-typewriter"
import { useReveal } from "@/hooks/use-reveal"
import { usePrefersReducedMotion } from "@/components/presentation-use-reduced-motion"
import { type Segment, TypedSegments } from "@/components/typed-text"

const ALL_CLEAR: Line = { key: "all-clear", text: "ALL SYSTEMS STABLE." }
const CHARS_PER_SECOND = 90
const FULL_WARNINGS = 3 // warnings of typical length the screen holds, with the prompt line under them (owner, 2026-10-24)
const TYPICAL_CHARS = 84 // a typical warning with its "> " prompt (they run from about 40 to 120), for sizing the screen

// "WARNING" in inverse video, the rest in plain phosphor.
function segmentsFor(text: string): Segment[] {
  const tag = /^WARNING:\s*/.exec(text)
  if (!tag) return [{ text }]
  return [{ text: "WARNING", className: "ws5-crt-inverse" }, { text: `: ${text.slice(tag[0].length)}` }]
}

// The plant computer's alarm monitor (owner, 2026-10-12): an 80s green-phosphor screen the controller glances
// at. The warnings are computer-generated, so each types itself out like a command line. A warning keeps its
// line while it lasts and new ones are added at the bottom. The header counts the warnings, so a hidden screen
// still shows how many there are. The header's "See Warning" key (revealSignal) opens it and scrolls it into view.
export default function AlarmScreen({ warnings, revealSignal = 0 }: { warnings: Warning[]; revealSignal?: number }) {
  const [visible, setVisible] = useState(true)
  const reduced = usePrefersReducedMotion()
  const section = useRef<HTMLElement>(null)
  useReveal(revealSignal, visible, useCallback(() => setVisible(true), []), section)

  const order = useRef<string[]>([])
  const present = new Set(warnings.map((warning) => warning.key))
  order.current = [
    ...order.current.filter((key) => present.has(key)),
    ...warnings.map((warning) => warning.key).filter((key) => !order.current.includes(key)),
  ]
  const text = new Map(warnings.map((warning) => [warning.key, warning.text]))
  const lines: Line[] = warnings.length ? order.current.map((key) => ({ key, text: text.get(key) ?? "" })) : [ALL_CLEAR]

  // Typing carries on while the screen is hidden, so reopening it doesn't type everything again.
  const typed = useTypewriter(lines, { charsPerSecond: CHARS_PER_SECOND, typeExisting: true, instant: reduced })

  const count = warnings.length
  const Chevron = visible ? ChevronUp : ChevronDown

  return (
    <section ref={section} id="alarm-monitor" className="ws3-cam-bezel rounded-md p-2 sm:p-2.5">
      <button
        onClick={() => setVisible(!visible)}
        aria-expanded={visible}
        className="w-full flex items-center justify-between gap-2 px-1 pb-2 text-left"
      >
        <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-200 truncate">
          SKALA · Alarm Monitor
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span
            className={`retro-lamp inline-block w-2.5 h-2.5 shrink-0 ${count ? "bg-red-500 text-red-500 on" : "bg-green-500 text-green-500 on"}`}
          />
          <span className={`font-mono text-[10px] sm:text-xs font-bold uppercase ${count ? "text-red-400" : "text-green-400"}`}>
            {count ? `${count} Warning${count > 1 ? "s" : ""}` : "All systems stable"}
          </span>
          <Chevron className="h-5 w-5 ml-1 text-neutral-300" />
        </span>
      </button>

      {visible && <Screen typed={typed} warnings={warnings} />}
    </section>
  )
}

// The screen is a fixed height for its width (owner, 2026-10-24): room for a few warnings of typical length and the
// prompt, so a narrow screen, where each warning wraps onto more lines, is taller. When the warnings don't all fit,
// the screen scrolls like a terminal: the newest line stays at the bottom and the oldest go off the top. The player
// can drag the text (or use the scroll bar, the mouse wheel or the arrow keys) to read back, a whole line at a time.
function Screen({ typed, warnings }: { typed: TypedLine[]; warnings: Warning[] }) {
  const typing = typed.some((line) => line.typing)
  const count = warnings.length

  const viewportRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null) // one invisible character, for the screen's width in characters
  const thumbRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const top = useRef(0) // how far the text is scrolled up, in px
  const pinned = useRef(true) // following the newest line
  const lineHeight = useRef(20)
  const drag = useRef<{ y: number; from: number; scale: number } | null>(null)
  const wheel = useRef(0) // wheel travel not yet a whole line
  const [height, setHeight] = useState<number | null>(null)
  const [canScroll, setCanScroll] = useState(false)
  const [readingBack, setReadingBack] = useState(false)

  const maxTop = () => Math.max(0, (textRef.current?.offsetHeight ?? 0) - (viewportRef.current?.clientHeight ?? 0))

  // Put the text where it should be, and the scroll bar's thumb to match
  const sync = useCallback(() => {
    const text = textRef.current
    const viewport = viewportRef.current
    if (!text || !viewport) return
    const end = maxTop()
    if (pinned.current || top.current >= end) {
      top.current = end
      pinned.current = true
    }
    top.current = Math.max(0, top.current)
    text.style.transform = `translateY(${-top.current}px)`
    setCanScroll(end > 0)
    setReadingBack(!pinned.current)
    const thumb = thumbRef.current
    const track = trackRef.current
    if (thumb && track && end > 0) {
      const room = track.clientHeight
      const size = Math.max(10, (room * viewport.clientHeight) / text.offsetHeight)
      thumb.style.height = `${size}px`
      thumb.style.transform = `translateY(${((room - size) * top.current) / end}px)`
    }
  }, [])

  // Every render may have typed, added or cleared a line
  useLayoutEffect(sync)

  const scrollTo = useCallback(
    (y: number) => {
      const end = maxTop()
      top.current = Math.max(0, Math.min(end, y))
      pinned.current = top.current >= end
      sync()
    },
    [sync],
  )
  // Whole lines, as a terminal scrolls; the very bottom is wherever the newest line ends
  const scrollToLine = useCallback(
    (y: number) => {
      const lh = lineHeight.current
      const end = maxTop()
      scrollTo(y >= end - lh / 2 ? end : Math.round(y / lh) * lh)
    },
    [scrollTo],
  )

  const measure = useCallback(() => {
    const viewport = viewportRef.current
    const text = textRef.current
    const probe = probeRef.current
    if (!viewport || !text || !probe) return
    const style = getComputedStyle(text)
    const lh = (lineHeight.current = parseFloat(style.lineHeight) || lineHeight.current)
    const charWidth = probe.getBoundingClientRect().width || 8
    const perLine = Math.max(1, Math.floor(text.clientWidth / charWidth) - 2) // wrapped lines are indented past the prompt
    const linesPerWarning = Math.ceil(TYPICAL_CHARS / perLine)
    const gap = 4 // space-y-1
    setHeight(Math.round(FULL_WARNINGS * (linesPerWarning * lh + gap) + lh))
  }, [])

  useLayoutEffect(measure, [measure])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    let width = viewport.clientWidth
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (viewport.clientWidth !== width) {
        width = viewport.clientWidth
        measure()
      }
      sync()
    })
    observer?.observe(viewport)
    if (textRef.current) observer?.observe(textRef.current)
    // The terminal font may arrive after the first measure, and it changes the screen's width in characters
    document.fonts?.ready.then(measure)
    return () => observer?.disconnect()
  }, [measure, sync])

  // Mouse wheel scrolls the screen, not the page, until the screen reaches its end. Needs a non-passive listener.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const onWheel = (e: WheelEvent) => {
      const end = maxTop()
      const dy = e.deltaMode === 1 ? e.deltaY * lineHeight.current : e.deltaY
      if (!end || (dy < 0 && top.current <= 0) || (dy > 0 && top.current >= end)) return
      e.preventDefault()
      wheel.current += dy
      const lines = Math.trunc(wheel.current / lineHeight.current)
      if (!lines) return
      wheel.current -= lines * lineHeight.current
      scrollToLine(top.current + lines * lineHeight.current)
    }
    viewport.addEventListener("wheel", onWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", onWheel)
  }, [scrollToLine])

  // Dragging the text moves it with the finger; dragging the thumb moves it the other way, by the bar's scale
  const startDrag = (e: PointerEvent<HTMLElement>, scale: number) => {
    if (!canScroll || e.button !== 0) return
    e.stopPropagation()
    drag.current = { y: e.clientY, from: top.current, scale }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onDragMove = (e: PointerEvent<HTMLElement>) => {
    if (drag.current) scrollToLine(drag.current.from + (e.clientY - drag.current.y) * drag.current.scale)
  }
  const endDrag = () => {
    drag.current = null
  }
  const thumbScale = () => {
    const track = trackRef.current?.clientHeight ?? 1
    const thumb = thumbRef.current?.offsetHeight ?? 0
    return maxTop() / Math.max(1, track - thumb)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const lh = lineHeight.current
    const page = Math.max(lh, Math.floor((viewportRef.current?.clientHeight ?? 0) / lh - 1) * lh)
    const steps: Record<string, number> = { ArrowDown: lh, ArrowUp: -lh, PageDown: page, PageUp: -page }
    let next: number | null = null
    if (e.key in steps) next = top.current + steps[e.key]
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = maxTop()
    if (next === null || !canScroll) return
    e.preventDefault()
    scrollToLine(next)
  }

  return (
    <div className="ws5-crt-screen px-3 py-2.5 sm:px-4 sm:py-3">
      <div
        ref={viewportRef}
        tabIndex={canScroll ? 0 : -1}
        role="group"
        aria-label={canScroll ? "Alarm monitor. Drag it, or use the arrow keys, to read earlier warnings." : "Alarm monitor"}
        className={`ws5-crt-viewport pr-5 ${canScroll ? "ws5-crt-draggable" : ""}`}
        style={{ height: height ?? undefined }}
        onPointerDown={(e) => startDrag(e, -1)}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <span ref={probeRef} className="ws5-crt-text text-base sm:text-lg invisible absolute" aria-hidden="true">
          M
        </span>
        <div ref={textRef} className="ws5-crt-text text-base sm:text-lg leading-tight space-y-1" aria-hidden="true">
          {typed.map((line) => (
            <div key={line.key} className="pl-[2ch] -indent-[2ch]">
              <span className="ws5-crt-dim">&gt; </span>
              <TypedSegments
                segments={segmentsFor(line.text)}
                shown={line.shown}
                cursor={line.typing ? <span className="ws5-crt-cursor" /> : null}
              />
            </div>
          ))}
          {!typing && (
            <div>
              <span className="ws5-crt-dim">&gt; </span>
              <span className="ws5-crt-cursor ws5-crt-cursor-blink" />
            </div>
          )}
        </div>

        {/* A text-mode scroll bar down the right edge, drawn in the phosphor: arrows that step a line, and a thumb */}
        {canScroll && (
          <div className="ws5-crt-scrollbar ws5-crt-text" aria-hidden="true">
            <button type="button" tabIndex={-1} className="ws5-crt-arrow" onPointerDown={(e) => e.stopPropagation()} onClick={() => scrollToLine(top.current - lineHeight.current)}>
              ▲
            </button>
            <div ref={trackRef} className="ws5-crt-track">
              <div
                ref={thumbRef}
                className="ws5-crt-thumb"
                onPointerDown={(e) => startDrag(e, thumbScale())}
                onPointerMove={onDragMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            </div>
            <button type="button" tabIndex={-1} className="ws5-crt-arrow" onPointerDown={(e) => e.stopPropagation()} onClick={() => scrollToLine(top.current + lineHeight.current)}>
              ▼
            </button>
          </div>
        )}

        {/* Reading back: the way to the newest line, in inverse video */}
        {readingBack && (
          <button
            type="button"
            className="ws5-crt-latest ws5-crt-text text-sm sm:text-base"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => scrollTo(maxTop())}
          >
            ▼ LATEST
          </button>
        )}
      </div>
      <ul className="sr-only" aria-live="polite">
        {count ? warnings.map((warning) => <li key={warning.key}>{warning.text}</li>) : <li>All systems stable.</li>}
      </ul>
    </div>
  )
}
