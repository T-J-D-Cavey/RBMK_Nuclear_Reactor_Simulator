"use client"

import type { CSSProperties } from "react"
import { DOSIMETER_LIMIT, readDosimeter, toRoentgenPerHour } from "@/lib/dosimeter"

// The control room dosimeter (owner, 2026-10-16): a needle meter with two scales, µR/s and R/h, that stops at
// 1,000 µR/s = 3.6 R/h. It sits below the chart recorder, at the same width, and from medium screens up is at least
// as tall as the rod display beside it (matchHeight). Past the end of the scale the needle rests against its stop and
// the LIMIT lamp lights.

const PIVOT = { x: 120, y: 142 }
const SWEEP = 50 // degrees either side of upright
const R_PER_HOUR_MARKS = [0, 1, 2, 3, 3.6]
const RED_FROM = 3 // R/h: the red band runs from here to the end of the scale

// Degrees from upright for a reading in µR/s
const angleFor = (microRPerSecond: number) => -SWEEP + (2 * SWEEP * Math.min(DOSIMETER_LIMIT, Math.max(0, microRPerSecond))) / DOSIMETER_LIMIT
const fromRoentgenPerHour = (rPerHour: number) => (rPerHour * 1_000_000) / 3600

function point(angle: number, radius: number) {
  const a = (angle * Math.PI) / 180
  return { x: PIVOT.x + radius * Math.sin(a), y: PIVOT.y - radius * Math.cos(a) }
}

function arc(from: number, to: number, radius: number) {
  const a = point(from, radius)
  const b = point(to, radius)
  return `M${a.x} ${a.y} A${radius} ${radius} 0 0 1 ${b.x} ${b.y}`
}

function Tick({ value, inner, outer, width }: { value: number; inner: number; outer: number; width: number }) {
  const a = point(angleFor(value), inner)
  const b = point(angleFor(value), outer)
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1c1b18" strokeWidth={width} />
}

// It reads the control room's air, so it sits at background until radioactivity is very high (lib/dosimeter.ts).
export default function Dosimeter({
  radioactivity,
  second,
  matchHeight,
  className = "",
}: {
  radioactivity: number
  second: number // the game clock: the background's random blips change once a game second
  matchHeight?: number | null
  className?: string
}) {
  const reading = readDosimeter(radioactivity, second)
  const rPerHour = toRoentgenPerHour(reading.microRPerSecond)
  const needle = angleFor(reading.microRPerSecond)

  return (
    <div
      className={`cr-panel cr-screws p-3 sm:p-4 flex flex-col gap-2 md:min-h-[var(--match-height)] ${className}`}
      style={matchHeight ? ({ "--match-height": `${matchHeight}px` } as CSSProperties) : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="cr-plate">Radiation Dosimeter</div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground">
          <span className={`retro-lamp inline-block w-2.5 h-2.5 ${reading.pegged ? "bg-red-500 text-red-500 on" : "bg-red-950/40"}`} aria-hidden="true" />
          Limit
        </div>
      </div>

      <div className="cr-dose-bezel flex-1 flex items-center justify-center p-2 sm:p-3">
        <div className="cr-dose-face w-full max-w-[30rem]">
          <svg viewBox="0 0 240 160" className="block w-full h-auto" role="img" aria-label={`Dosimeter: ${rPerHour.toFixed(1)} roentgen per hour${reading.pegged ? ", at the end of its scale" : ""}`}>
            {/* Red band at the top of the scale */}
            <path d={arc(angleFor(fromRoentgenPerHour(RED_FROM)), SWEEP, 109)} fill="none" stroke="#b42318" strokeWidth={6} />

            {/* Outer scale: µR/s */}
            <path d={arc(-SWEEP, SWEEP, 112)} fill="none" stroke="#1c1b18" strokeWidth={1} />
            {Array.from({ length: 21 }, (_, i) => i * 50).map((v) => (
              <Tick key={v} value={v} inner={v % 200 === 0 ? 100 : 105} outer={112} width={v % 200 === 0 ? 1.6 : 0.8} />
            ))}
            {[0, 200, 400, 600, 800, 1000].map((v) => {
              const p = point(angleFor(v), 89)
              return (
                <text key={v} x={p.x} y={p.y} className="cr-dose-num" textAnchor="middle" dominantBaseline="middle">
                  {v}
                </text>
              )
            })}

            {/* Inner scale: R/h, ending at 3.6 */}
            <path d={arc(-SWEEP, SWEEP, 70)} fill="none" stroke="#1c1b18" strokeWidth={0.8} />
            {R_PER_HOUR_MARKS.map((r) => (
              <Tick key={r} value={fromRoentgenPerHour(r)} inner={70} outer={76} width={1.2} />
            ))}
            {R_PER_HOUR_MARKS.map((r) => {
              const p = point(angleFor(fromRoentgenPerHour(r)), 60)
              return (
                <text key={r} x={p.x} y={p.y} className={`cr-dose-num is-small ${r === 3.6 ? "is-red" : ""}`} textAnchor="middle" dominantBaseline="middle">
                  {r}
                </text>
              )
            })}

            <text x={PIVOT.x} y={116} className="cr-dose-unit" textAnchor="middle">OUTER µR/s · INNER R/h</text>
            <text x={PIVOT.x} y={126} className="cr-dose-legend" textAnchor="middle">DOSIMETER · RANGE I</text>

            {/* Needle: rotates about the pivot; pinned against the stop it trembles */}
            <g className="cr-dose-needle" style={{ transform: `rotate(${needle}deg)`, transformOrigin: `${PIVOT.x}px ${PIVOT.y}px` }}>
              <g className={reading.pegged ? "cr-dose-pegged" : undefined} style={{ transformOrigin: `${PIVOT.x}px ${PIVOT.y}px` }}>
                <line x1={PIVOT.x} y1={PIVOT.y + 12} x2={PIVOT.x} y2={PIVOT.y - 114} stroke="#111" strokeWidth={1.4} strokeLinecap="round" />
                <rect x={PIVOT.x - 3} y={PIVOT.y + 6} width={6} height={10} rx={1} fill="#111" />
              </g>
            </g>
            <circle cx={PIVOT.x} cy={PIVOT.y} r={7} fill="#1f1f1d" />
            <circle cx={PIVOT.x - 1.5} cy={PIVOT.y - 1.5} r={2.2} fill="#5a5a55" />
          </svg>
        </div>
      </div>
    </div>
  )
}
