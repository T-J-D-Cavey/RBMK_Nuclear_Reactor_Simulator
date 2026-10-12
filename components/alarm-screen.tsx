"use client"

import { useRef, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { Warning } from "@/lib/game-utils"
import { type Line, useTypewriter } from "@/hooks/use-typewriter"
import { usePrefersReducedMotion } from "@/components/presentation-use-reduced-motion"
import { type Segment, TypedSegments } from "@/components/typed-text"

const ALL_CLEAR: Line = { key: "all-clear", text: "ALL SYSTEMS STABLE." }
const CHARS_PER_SECOND = 90

// "WARNING" in inverse video, the rest in plain phosphor.
function segmentsFor(text: string): Segment[] {
  const tag = /^WARNING:\s*/.exec(text)
  if (!tag) return [{ text }]
  return [{ text: "WARNING", className: "ws5-crt-inverse" }, { text: `: ${text.slice(tag[0].length)}` }]
}

// The plant computer's alarm monitor (owner, 2026-10-12): an 80s green-phosphor screen the controller glances
// at. The warnings are computer-generated, so each types itself out like a command line. A warning keeps its
// line while it lasts and new ones are added at the bottom. The header counts the warnings, so a hidden screen
// still shows how many there are.
export default function AlarmScreen({ warnings }: { warnings: Warning[] }) {
  const [visible, setVisible] = useState(true)
  const reduced = usePrefersReducedMotion()

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
  const typing = typed.some((line) => line.typing)

  const count = warnings.length
  const Chevron = visible ? ChevronUp : ChevronDown

  return (
    <section className="ws3-cam-bezel rounded-md p-2 sm:p-2.5">
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

      {visible && (
        <div className="ws5-crt-screen min-h-[7rem] px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="ws5-crt-text text-base sm:text-lg leading-tight space-y-1" aria-hidden="true">
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
          <ul className="sr-only" aria-live="polite">
            {count ? warnings.map((warning) => <li key={warning.key}>{warning.text}</li>) : <li>All systems stable.</li>}
          </ul>
        </div>
      )}
    </section>
  )
}
