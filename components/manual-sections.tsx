"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { usePrefersReducedMotion } from "./presentation-use-reduced-motion"

export interface ManualSection {
  id: string
  title: string
  content: ReactNode
}

const TILT = [-0.9, 0.6, -0.4, 0.8, -0.6] // each sheet sits on its clipboard a little askew

// The Operating Manual in sections (owner, 2026-11-09: option D). A row of clipboards under the header picks the
// section; the open one is lifted and bright and the rest are dimmed. Below a wide screen they become a strip that
// swipes. Under the computer: Leave Training on the left, and two keyboard arrow keys on the right that step through
// the sections, as the keyboard's own arrow keys do. Every section stays in the page, hidden, so it is all there to
// read for search engines and screen readers that list the page.
export default function ManualSections({ sections, chin }: { sections: ManualSection[]; chin: ReactNode }) {
  const [index, setIndex] = useState(0)
  const reduced = usePrefersReducedMotion()
  const stripRef = useRef<HTMLDivElement>(null)
  const moved = useRef(false)
  const last = sections.length - 1

  const go = useCallback((to: number) => {
    moved.current = true
    setIndex(Math.max(0, Math.min(last, to)))
  }, [last])

  // The keyboard's arrow keys turn the pages too, unless something else has already used the key (the shift
  // foreman's sheet does) or the focus is in a field
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1))
      else if (event.key === "ArrowRight") setIndex((i) => Math.min(last, i + 1))
      else return
      moved.current = true
      event.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [last])

  // A new section: the strip brings its clipboard into view, and a reader scrolled down the last section goes back up
  // to the clipboards so the new one reads from its top
  useEffect(() => {
    if (!moved.current) return
    const strip = stripRef.current
    if (!strip) return
    const behavior = reduced ? "auto" : "smooth"
    const tab = strip.querySelectorAll<HTMLElement>('[role="tab"]')[index]
    if (tab && strip.scrollWidth > strip.clientWidth) {
      strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior })
    }
    const top = strip.getBoundingClientRect().top
    if (top < 0) window.scrollTo({ top: window.scrollY + top - 12, behavior })
  }, [index, reduced])

  return (
    <>
      <div ref={stripRef} role="tablist" aria-label="Manual sections" data-tutorial="manual-tabs" className="cr-manual-tabs">
        {sections.map((section, i) => (
          <button
            key={section.id}
            id={`manual-tab-${section.id}`}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-controls={`manual-panel-${section.id}`}
            tabIndex={i === index ? 0 : -1}
            onClick={() => go(i)}
            className="cr-manual-tab"
          >
            <span className="cr-board">
              <span className="cr-board-clip" aria-hidden="true" />
              <span className="cr-paper cr-paper-ruled" style={{ transform: `rotate(${TILT[i % TILT.length]}deg)` }}>
                <span className="cr-form-line flex justify-between gap-1.5" aria-hidden="true">
                  <span>Section</span>
                  <span>No. {String(i + 1).padStart(2, "0")}</span>
                </span>
                <span className="cr-typed cr-manual-tab-title">{section.title}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* The monitor */}
      <div data-tutorial="manual-screen" className="ws3-cam-bezel rounded-[10px] px-2.5 pt-2.5 sm:px-[18px] sm:pt-[18px]">
        <div className="ws5-manual-screen">
          <div className="ws5-crt-text relative z-[1] px-[18px] pt-6 pb-7 sm:px-[52px] sm:pt-10 sm:pb-12">
            {sections.map((section, i) => (
              <div
                key={section.id}
                id={`manual-panel-${section.id}`}
                role="tabpanel"
                aria-labelledby={`manual-tab-${section.id}`}
                hidden={i !== index}
              >
                {section.content}
              </div>
            ))}
          </div>
        </div>
        {chin}
      </div>

      {/* Leave Training on the left, the arrow keys on the right */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="cr-lens-bezel flex-1 min-w-0 sm:flex-none">
          <Link href="/" className="cr-lens w-full sm:w-60 h-12 !text-[0.95rem] !tracking-[0.14em] sm:!text-[1.05rem] sm:!tracking-[0.22em]">
            Leave Training
          </Link>
        </span>
        <div className="cr-arrow-well">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous section"
            className="cr-key cr-key-cream cr-key-sculpted cr-arrow-key"
          >
            <ArrowLeft strokeWidth={2.6} className="size-[22px]" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === last}
            aria-label="Next section"
            className="cr-key cr-key-cream cr-key-sculpted cr-arrow-key"
          >
            <ArrowRight strokeWidth={2.6} className="size-[22px]" />
          </button>
        </div>
      </div>
    </>
  )
}
