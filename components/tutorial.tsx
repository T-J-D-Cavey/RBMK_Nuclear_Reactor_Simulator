"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { type Box, type GuidePlan, type TutorialStep, GUIDE_EDGE, planGuide } from "@/lib/tutorial"
import { useMediaQuery } from "@/hooks/use-element-height"
import { usePrefersReducedMotion } from "./presentation-use-reduced-motion"
import TutorialEngineer from "./tutorial-engineer"

const PHONE_QUERY = "(max-width: 639px)" // below Tailwind sm the guide spans the screen's width
const RING_PAD = 6 // the frame stands this far off its subject, px
const TYPE_MS = 11 // one character typed every so often, as the engineer speaks

type Hole = { left: number; top: number; width: number; height: number }

const targetsOf = (step: TutorialStep) =>
  step.targets
    .flatMap((name) => Array.from(document.querySelectorAll<HTMLElement>(`[data-tutorial="${name}"]`)))
    .filter((element) => element.getClientRects().length > 0)

const union = (boxes: Box[]): Box => ({
  top: Math.min(...boxes.map((b) => b.top)),
  bottom: Math.max(...boxes.map((b) => b.bottom)),
  left: Math.min(...boxes.map((b) => b.left)),
  right: Math.max(...boxes.map((b) => b.right)),
})

// Where the frames are on screen now: one round each subject, or one round them all
function readHoles(step: TutorialStep): Hole[] {
  const boxes = targetsOf(step).map((element) => element.getBoundingClientRect())
  if (!boxes.length) return []
  return (step.merge ? [union(boxes)] : boxes).map((b) => ({
    left: Math.round(b.left - RING_PAD),
    top: Math.round(b.top - RING_PAD),
    width: Math.round(b.right - b.left + 2 * RING_PAD),
    height: Math.round(b.bottom - b.top + 2 * RING_PAD),
  }))
}

// The control-room briefing (owner, 2026-10-29), given by the shift foreman, Aleksandr Akimov. The room goes dark but
// for what he is talking about, framed in amber; he stands on an edge of the screen with his words on a typed sheet, and the page scrolls each subject into
// view clear of him. Close, or Begin shift on the last sheet, ends it.
export default function Tutorial({ steps, onFinish }: { steps: TutorialStep[]; onFinish: () => void }) {
  const [index, setIndex] = useState(0)
  const [chars, setChars] = useState(0)
  const [holes, setHoles] = useState<Hole[]>([])
  const [plan, setPlan] = useState<GuidePlan>({ scrollY: 0, dock: "bottom", corner: "left" })
  const [resizes, setResizes] = useState(0)
  const phone = useMediaQuery(PHONE_QUERY)
  const reduced = usePrefersReducedMotion()
  const guideRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const step = steps[index]
  const last = index === steps.length - 1

  // However the briefing ends, the shift starts at the top of the page, where the desk is
  const finish = useCallback(() => {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
    onFinish()
  }, [onFinish, reduced])
  const next = useCallback(() => (last ? finish() : setIndex((i) => i + 1)), [last, finish])
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  // His words type out as he speaks; all at once for reduced motion
  useEffect(() => {
    const length = step.text.length
    if (reduced) {
      setChars(length)
      return
    }
    const start = performance.now()
    setChars(0)
    const timer = setInterval(() => {
      const typed = Math.min(length, Math.floor((performance.now() - start) / TYPE_MS))
      setChars(typed)
      if (typed >= length) clearInterval(timer)
    }, 30)
    return () => clearInterval(timer)
  }, [step.id, step.text, reduced])

  useEffect(() => {
    const onResize = () => setResizes((n) => n + 1)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Each step: scroll its subject into view clear of the guide, and put the guide on the edge that leaves it clear.
  // A group too tall to clear him (the instruments, stacked on a phone) is shown from its first member.
  useLayoutEffect(() => {
    const guide = guideRef.current
    const boxes = targetsOf(step).map((element) => element.getBoundingClientRect())
    if (!guide || !boxes.length) {
      setPlan((p) => ({ ...p, dock: "bottom", corner: "left" }))
      if (step.atTop && window.scrollY > 0) window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
      return
    }
    const scrollY = window.scrollY
    const inPage = (b: Box): Box => ({ top: b.top + scrollY - RING_PAD, bottom: b.bottom + scrollY + RING_PAD, left: b.left - RING_PAD, right: b.right + RING_PAD })
    const size = { width: guide.offsetWidth, height: guide.offsetHeight }
    const view = { width: window.innerWidth, height: window.innerHeight, scrollY, maxScroll: document.documentElement.scrollHeight - window.innerHeight }
    const all = inPage(union(boxes))
    const subject = all.bottom - all.top <= view.height - size.height - 3 * GUIDE_EDGE ? all : inPage(boxes[0])
    const placed = planGuide(subject, view, size, phone)
    setPlan(placed)
    if (Math.abs(placed.scrollY - scrollY) > 1) window.scrollTo({ top: placed.scrollY, behavior: reduced ? "auto" : "smooth" })
  }, [step, phone, reduced, resizes])

  // The frames follow their subjects while the page scrolls or the layout moves
  useEffect(() => {
    let frame = 0
    let seen = ""
    const track = () => {
      const now = readHoles(step)
      const key = JSON.stringify(now)
      if (key !== seen) {
        seen = key
        setHoles(now)
      }
      frame = requestAnimationFrame(track)
    }
    track()
    return () => cancelAnimationFrame(frame)
  }, [step])

  // Keyboard: Next has focus from the start, and focus stays on the sheet
  useEffect(() => {
    if (!guideRef.current?.contains(document.activeElement)) nextRef.current?.focus({ preventScroll: true })
  }, [index])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") finish()
    else if (event.key === "ArrowRight") next()
    else if (event.key === "ArrowLeft") prev()
    else if (event.key === "Tab") {
      const keys = Array.from(guideRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])
      const at = keys.indexOf(document.activeElement as HTMLButtonElement)
      event.preventDefault()
      keys[(at + (event.shiftKey ? keys.length - 1 : 1)) % keys.length]?.focus()
    } else return
    event.preventDefault()
  }

  const left = phone || plan.corner === "left"
  const guideStyle: CSSProperties = phone
    ? { left: 0, right: 0, [plan.dock]: 0 }
    : { [plan.corner]: GUIDE_EDGE, [plan.dock]: GUIDE_EDGE, width: 540 }
  const talking = chars < step.text.length

  return (
    <>
      {/* The room behind is out of reach until the briefing ends; a click there hands focus back to the sheet */}
      <div
        className="fixed inset-0 z-[60]"
        aria-hidden="true"
        onMouseDown={(event) => {
          event.preventDefault()
          nextRef.current?.focus({ preventScroll: true })
        }}
      />
      <svg className="fixed inset-0 z-[60] w-full h-full pointer-events-none" aria-hidden="true">
        <defs>
          <mask id="cr-tut-mask">
            <rect width="100%" height="100%" fill="white" />
            {holes.map((h, i) => (
              <rect key={i} x={h.left} y={h.top} width={h.width} height={h.height} rx="6" fill="black" />
            ))}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(4, 7, 9, 0.74)" mask="url(#cr-tut-mask)" />
      </svg>
      {holes.map((h, i) => (
        <div key={`${step.id}-${i}`} className="cr-tut-ring" style={{ left: h.left, top: h.top, width: h.width, height: h.height }} aria-hidden="true" />
      ))}

      <div
        ref={guideRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-tut-title"
        aria-describedby="cr-tut-text"
        onKeyDown={handleKeyDown}
        className="fixed z-[61] flex flex-col pointer-events-none"
        style={guideStyle}
      >
        <div className={`cr-tut-card pointer-events-auto ${phone ? "ml-[74px] mr-2 mt-2" : left ? "ml-[140px] w-[390px]" : "mr-[140px] w-[390px] self-end"}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="cr-tut-meta">
              Shift foreman · {String(index + 1).padStart(2, "0")} / {steps.length}
            </span>
            <button className="cr-tut-close" onClick={finish} aria-label="Close the briefing and start the shift">
              <X className="size-4" />
            </button>
          </div>
          <h2 id="cr-tut-title" className="cr-tut-title">
            {step.title}
          </h2>
          {/* The full text holds the sheet's size while it types out; screen readers get it whole */}
          <p id="cr-tut-text" className="cr-tut-text relative">
            <span className="invisible" aria-hidden="true">
              {step.text}
            </span>
            <span className="absolute inset-0" aria-hidden="true">
              {step.text.slice(0, chars)}
            </span>
            <span className="sr-only">{step.text}</span>
          </p>
          <div className="cr-tut-footer">
            <button className="cr-tut-btn" onClick={prev} disabled={index === 0}>
              ‹ Previous
            </button>
            <button ref={nextRef} className="cr-tut-btn" onClick={next}>
              {last ? "Begin shift ›" : "Next ›"}
            </button>
          </div>
          <span className={`cr-tut-tail ${left ? "cr-tut-tail-left" : "cr-tut-tail-right"}`} aria-hidden="true" />
        </div>
        <TutorialEngineer
          talking={talking}
          flip={!left}
          className={phone ? "w-[89px] h-[126px] -mt-[14px]" : `w-[141px] h-[200px] -mt-[96px] ${left ? "self-start" : "self-end"}`}
        />
      </div>
    </>
  )
}
