"use client"

import { useElementSize } from "@/hooks/use-element-height"

// The machines' dials (owner, 2026-11-04: Turbine B2, Pumps B2, Rods A2). The turbine and pumps share one arc dial, the
// rods a strip dial, so they read as a different kind of measurement. Each draws to the width it is given, and a modal
// and the main page share these, so the two can't differ.

const SCALE_FEW_BELOW = 210 // px: narrower than this an arc shows fewer numbers, larger

const round = (n: number) => Math.round(n * 10) / 10

// --- Arc dial ---

const PIVOT = { x: 120, y: 138 }
const SWEEP = 44 // degrees either side of upright
const SCALE_RADIUS = 126
const BAND_RADIUS = 131

type Zone = readonly [number, number] // from and to along the scale, 0 at the left end and 1 at the right

// The pump band's green is the "not yet" zone: the needle within 30% of centre.
const ARCS = {
  vacuum: {
    label: "TURBINE VACUUM",
    numbers: [[0, "0"], [0.25, "25"], [0.5, "50"], [0.75, "75"], [1, "100"]],
    fewNumbers: [[0, "0"], [0.5, "50"], [1, "100"]],
    green: [[0.4, 1]],
    amber: [[0.15, 0.4]],
    red: [[0, 0.15]],
  },
  pumps: {
    label: "PUMP BALANCE",
    numbers: [[0, "100"], [0.25, "50"], [0.5, "0"], [0.75, "50"], [1, "100"]],
    fewNumbers: [[0, "100"], [0.5, "0"], [1, "100"]],
    green: [[0.35, 0.65]],
    amber: [[0.125, 0.35], [0.65, 0.875]],
    red: [[0, 0.125], [0.875, 1]],
  },
} satisfies Record<string, { label: string; numbers: [number, string][]; fewNumbers: [number, string][]; green: Zone[]; amber: Zone[]; red: Zone[] }>

const angleAt = (along: number) => -SWEEP + 2 * SWEEP * along

function point(angle: number, radius: number) {
  const a = (angle * Math.PI) / 180
  return { x: round(PIVOT.x + radius * Math.sin(a)), y: round(PIVOT.y - radius * Math.cos(a)) }
}

function arc(from: number, to: number, radius: number) {
  const a = point(angleAt(from), radius)
  const b = point(angleAt(to), radius)
  return `M${a.x} ${a.y} A${radius} ${radius} 0 0 1 ${b.x} ${b.y}`
}

function ticks(count: number, major: boolean) {
  return Array.from({ length: count + 1 }, (_, i) => i)
    .filter((i) => (i % (count / 4) === 0) === major)
    .map((i) => {
      const a = point(angleAt(i / count), SCALE_RADIUS - (major ? 10 : 5))
      const b = point(angleAt(i / count), SCALE_RADIUS)
      return `M${a.x} ${a.y} L${b.x} ${b.y}`
    })
    .join(" ")
}

// A cream paper face in a black case, with a plain black lip across the bottom hiding the pivot. `value` is 0 to 1 for
// the vacuum, 1 being full; for the pumps it is -1 to 1, 0 being centre.
export function ArcDial({ kind, value, className = "" }: { kind: keyof typeof ARCS; value: number; className?: string }) {
  const [ref, size] = useElementSize<HTMLDivElement>()
  const dial = ARCS[kind]
  const few = size !== null && size.width < SCALE_FEW_BELOW
  const along = kind === "vacuum" ? Math.max(0, Math.min(1, value)) : (Math.max(-1, Math.min(1, value)) + 1) / 2
  const count = few ? 10 : 20
  const reading = kind === "vacuum" ? `${Math.round(along * 100)}%` : value === 0 ? "centred" : `${Math.round(Math.abs(value) * 100)}% towards loop ${value < 0 ? 1 : 2}`
  const band = (zones: readonly Zone[]) => zones.map(([from, to]) => arc(from, to, BAND_RADIUS)).join(" ")

  return (
    <div ref={ref} className={`cr-dial-case ${className}`}>
      <div className="cr-dial-paper">
        <svg viewBox="0 0 240 112" className="block w-full h-auto" role="img" aria-label={`${dial.label.toLowerCase()}: ${reading}`}>
          <path d={band(dial.green)} fill="none" stroke="#2f8f57" strokeWidth={6} />
          <path d={band(dial.amber)} fill="none" stroke="#d98a12" strokeWidth={6} />
          <path d={band(dial.red)} fill="none" stroke="#b42318" strokeWidth={6} />
          <path d={arc(0, 1, SCALE_RADIUS)} fill="none" stroke="#1c1b18" strokeWidth={1} />
          <path d={ticks(count, false)} fill="none" stroke="#1c1b18" strokeWidth={0.8} />
          <path d={ticks(count, true)} fill="none" stroke="#1c1b18" strokeWidth={1.6} />
          {(few ? dial.fewNumbers : dial.numbers).map(([at, number], i) => {
            const p = point(angleAt(at), 103)
            return (
              <text key={i} x={p.x} y={p.y + 3.5} className="cr-dial-number" textAnchor="middle">
                {number}
              </text>
            )
          })}
          {kind === "pumps" && (
            <>
              <text x={8} y={few ? 88 : 90} className="cr-dial-word" textAnchor="start">LOOP 1</text>
              <text x={232} y={few ? 88 : 90} className="cr-dial-word" textAnchor="end">LOOP 2</text>
            </>
          )}
          <text x={120} y={few ? 86 : 91} className={`cr-dial-word cr-dial-name ${few ? "is-few" : ""}`} textAnchor="middle">
            {dial.label}
          </text>
          <g className="cr-dial-needle" style={{ transform: `rotate(${angleAt(along)}deg)`, transformOrigin: `${PIVOT.x}px ${PIVOT.y}px` }}>
            <line x1={PIVOT.x} y1={PIVOT.y} x2={PIVOT.x} y2={14} stroke="#111" strokeWidth={1.5} strokeLinecap="round" />
            <circle cx={PIVOT.x} cy={PIVOT.y} r={9} fill="#1f1f1d" />
          </g>
          <rect x={0} y={97} width={240} height={15} fill="#1c1b19" />
        </svg>
      </div>
    </div>
  )
}

// --- Strip dial ---

const STRIP_INSET = 14 // the scale's ends, in from the strip's sides
const STRIP_WIDEST = 440
const STRIP_NARROWEST = 200

// A cream strip in a black case with a sliding hairline pointer and no colour zones, as the rod balance is plain: a
// right-heavy core leans right. `value` is -1 (left) to 1 (right). The scale is drawn for the strip's width, so its
// lines and words keep their weight on a phone.
export function StripDial({ value }: { value: number }) {
  const [ref, size] = useElementSize<HTMLDivElement>()
  const width = Math.round(Math.max(STRIP_NARROWEST, Math.min(STRIP_WIDEST, (size?.width ?? STRIP_WIDEST) - 12)))
  const x = (along: number) => round(STRIP_INSET + (width - 2 * STRIP_INSET) * along)
  const count = width > 300 ? 40 : 20
  const scale = (major: boolean) =>
    Array.from({ length: count + 1 }, (_, i) => i)
      .filter((i) => (i % (count / 4) === 0) === major)
      .map((i) => `M${x(i / count)} ${major ? 16 : 20} L${x(i / count)} 26`)
      .join(" ")
  const clamped = Math.max(-1, Math.min(1, value))
  const middle = x(0.5)
  const reading = clamped === 0 ? "balanced" : `${Math.round(Math.abs(clamped) * 100)}% to the ${clamped < 0 ? "left" : "right"}`

  return (
    <div ref={ref} className="cr-dial-case w-full">
      <div className="cr-dial-strip">
        <svg viewBox={`0 0 ${width} 58`} className="block w-full h-auto" role="img" aria-label={`Rod balance: ${reading}`}>
          <rect x={STRIP_INSET} y={27} width={width - 2 * STRIP_INSET} height={5} fill="#b9bdb6" />
          <path d={scale(false)} fill="none" stroke="#1c1b18" strokeWidth={0.8} />
          <path d={scale(true)} fill="none" stroke="#1c1b18" strokeWidth={1.5} />
          <text x={x(0)} y={12} className="cr-dial-word" textAnchor="start">LEFT</text>
          <text x={middle} y={12} className="cr-dial-word" textAnchor="middle">BALANCED</text>
          <text x={x(1)} y={12} className="cr-dial-word" textAnchor="end">RIGHT</text>
          <text x={middle} y={45} className="cr-dial-word" textAnchor="middle">ROD BALANCE</text>
          <g className="cr-dial-needle" style={{ transform: `translateX(${round(x((clamped + 1) / 2) - middle)}px)` }}>
            <line x1={middle} y1={13} x2={middle} y2={47} stroke="#111" strokeWidth={1.5} />
            <path d={`M${middle - 5} 56 L${middle} 46 L${middle + 5} 56 Z`} fill="#111" />
          </g>
        </svg>
      </div>
    </div>
  )
}
