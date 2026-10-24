"use client"

import { useEffect, useRef, useState } from "react"
import { useElementSize } from "@/hooks/use-element-height"

/* ------------------------------------------------------------------ */
/* Types and scales                                                    */
/* ------------------------------------------------------------------ */

interface Sample {
  n: number // monotonically increasing sample number (one per game tick)
  rad: number
  temp: number
  steam: number
}

export interface ChartRecorderProps {
  radioactivity: number
  reactorTemp: number
  steamVolume: number
  /** Game clock (seconds). A new sample is taken each time this changes. */
  gameTime: number
  /** While paused, no samples are taken (the paper stops). */
  isPaused: boolean
  /** Length of paper shown, in samples (= seconds at one tick per second). Default 180 (3 minutes). */
  windowSamples?: number
  /** Wide screens: the panel's height in px, met by making the bands shorter (never taller, never under half). */
  fitHeight?: number | null
  className?: string
}

type Key = "rad" | "temp" | "steam"

interface Band {
  key: Key
  label: string
  unit: string
  color: string
  /** value -> 0..1 (may exceed 1 when off scale) */
  scale: (v: number) => number
  max: number
  ticks: { v: number; label: string; warn?: boolean }[] // warn: a warning threshold, in pale red (not the scale's ends)
}

// Radioactivity: linear 0–500 on the lower 80% of the band, then logarithmic 500–5000 on the top 20%.
const RAD_LINEAR_MAX = 500
const RAD_LOG_MAX = 5000
const radScale = (v: number) => {
  if (v <= 0) return 0
  if (v <= RAD_LINEAR_MAX) return (0.8 * v) / RAD_LINEAR_MAX
  return 0.8 + (0.2 * Math.log10(v / RAD_LINEAR_MAX)) / Math.log10(RAD_LOG_MAX / RAD_LINEAR_MAX)
}

// SVG geometry (viewBox units). Only the paper is in the window, and everything on it moves with it (owner,
// 2026-10-24): the printed grid, the sprocket holes and the traces. The scale numbers sit on the housing to its
// left, the over-range lamps to its right, the radioactivity scale note above and the time marks below.
const VB_W = 320
const SCALE_W = 22 // the housing left of the paper, for the scale numbers
const PAPER_L = SCALE_W
const PAPER_R = 310 // the housing right of the paper holds the over-range lamps
const PEN_X = 298 // the pens write here; the paper to their right is still blank
const LAMP_X = (PAPER_R + VB_W) / 2
const HOUSING_INK = "#a3a39a" // engraving on the housing
const WARN_INK = "#f87171" // a warning threshold: its dashed line on the paper and its number on the housing (owner, 2026-10-24)

const BANDS: Band[] = [
  {
    key: "rad",
    label: "Radioactivity",
    unit: "",
    color: "#c81e1e",
    scale: radScale,
    max: RAD_LOG_MAX,
    ticks: [
      { v: 0, label: "0" },
      { v: 50, label: "50", warn: true },
      { v: 350, label: "350", warn: true },
      { v: 500, label: "500" },
      { v: 1000, label: "1k" },
      { v: 5000, label: "5k" },
    ],
  },
  {
    key: "temp",
    label: "Reactor Temp",
    unit: "°",
    color: "#1d4ed8",
    scale: (v) => Math.max(0, v) / 1200,
    max: 1200,
    ticks: [
      { v: 0, label: "0" },
      { v: 400, label: "400" },
      { v: 800, label: "800", warn: true },
      { v: 1200, label: "1200" }, // the top of the scale, so grey like the other ends (owner, 2026-10-24)
    ],
  },
  {
    key: "steam",
    label: "Steam",
    unit: "",
    color: "#15803d",
    scale: (v) => Math.max(0, v) / 600,
    max: 600,
    ticks: [
      { v: 0, label: "0" },
      { v: 300, label: "300", warn: true },
      { v: 600, label: "600" },
    ],
  },
]

// Window height: the three bands (full heights below) plus fixed margins: the housing strips above and below the
// paper, and the paper's own margins (the sprocket holes) and the blank paper between bands. On wide screens the
// bands shrink, down to half, so the recorder and the dosimeter below it come to the camera's height (owner,
// 2026-10-16); the type and the pens keep their size. At full height the window is as tall as it was when the band
// labels were on the paper, so the bands took over the room the labels left.
const BAND_HEIGHTS: Record<Key, number> = { rad: 148, temp: 81, steam: 81 }
const TOP_STRIP = 12 // housing above the paper: the radioactivity scale note
const BOTTOM_STRIP = 12 // housing below the paper: the time marks
const PAPER_MARGIN = 11 // paper above the first band and below the last, with the sprocket holes
const FIRST_BAND_TOP = TOP_STRIP + PAPER_MARGIN
const BAND_GAP = 14 // blank paper between bands, enough to keep one band's 0 clear of the next band's top number
const FIXED_H = FIRST_BAND_TOP + 2 * BAND_GAP + PAPER_MARGIN + BOTTOM_STRIP
const FULL_BANDS_H = BAND_HEIGHTS.rad + BAND_HEIGHTS.temp + BAND_HEIGHTS.steam
const VB_H = FIXED_H + FULL_BANDS_H // 372, the paper at full height
const MIN_VB_H = FIXED_H + FULL_BANDS_H / 2
const LABEL_GAP = 7.5 // scale labels closer than this would run together

interface Layout {
  top: number
  height: number
}

function layoutBands(vbH: number): Record<Key, Layout> {
  const k = (vbH - FIXED_H) / FULL_BANDS_H
  const out = {} as Record<Key, Layout>
  let top = FIRST_BAND_TOP
  for (const b of BANDS) {
    out[b.key] = { top, height: BAND_HEIGHTS[b.key] * k }
    top += out[b.key].height + BAND_GAP
  }
  return out
}

const yFor = (band: Band, at: Layout, v: number) => {
  const f = Math.min(1, Math.max(0, band.scale(v)))
  return at.top + at.height * (1 - f)
}

// Which scale labels have room: warning levels first, then the rest, each only if clear of those already shown.
// Every tick keeps its line.
function visibleLabels(band: Band, at: Layout): Set<number> {
  const shown: number[] = []
  const order = [...band.ticks.filter((t) => t.warn), ...band.ticks.filter((t) => !t.warn)]
  for (const t of order) {
    const y = yFor(band, at, t.v)
    if (shown.every((v) => Math.abs(yFor(band, at, v) - y) >= LABEL_GAP)) shown.push(t.v)
  }
  return new Set(shown)
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ChartRecorder({
  radioactivity,
  reactorTemp,
  steamVolume,
  gameTime,
  isPaused,
  windowSamples = 180,
  fitHeight = null,
  className = "",
}: ChartRecorderProps) {
  const [samples, setSamples] = useState<Sample[]>([])

  // The paper's height to meet fitHeight: everything but the paper keeps its size, so take that off first.
  const [panelRef, panelSize] = useElementSize<HTMLDivElement>()
  const [paperRef, paperSize] = useElementSize<SVGSVGElement>()
  // Sizes are whole pixels, so ignore changes under a couple of units: otherwise a 1px wobble could keep resizing it.
  const fitted = useRef(VB_H)
  let wanted = VB_H
  if (fitHeight && panelSize && paperSize && paperSize.width > 0) {
    const room = fitHeight - (panelSize.height - paperSize.height)
    wanted = Math.min(VB_H, Math.max(MIN_VB_H, (room * VB_W) / paperSize.width))
  }
  if (Math.abs(wanted - fitted.current) >= 2 || wanted === VB_H || wanted === MIN_VB_H) fitted.current = wanted
  const vbH = fitted.current
  const layout = layoutBands(vbH)

  // Latest values, read when a tick arrives (so the sampling effect depends only on the clock).
  const latest = useRef({ rad: radioactivity, temp: reactorTemp, steam: steamVolume })
  latest.current = { rad: radioactivity, temp: reactorTemp, steam: steamVolume }
  const lastTime = useRef<number | null>(null)
  const counter = useRef(0)

  useEffect(() => {
    if (isPaused) return
    const prevTime = lastTime.current
    if (prevTime === gameTime) return
    lastTime.current = gameTime
    const jumped = prevTime !== null && Math.abs(gameTime - prevTime) > 5 // new game / reset
    counter.current += 1
    const s: Sample = { n: counter.current, ...latest.current }
    setSamples((prev) => {
      const base = jumped ? [] : prev
      const next = base.length >= windowSamples ? base.slice(base.length - windowSamples + 1) : base.slice()
      next.push(s)
      return next
    })
  }, [gameTime, isPaused, windowSamples])

  const step = (PEN_X - PAPER_L) / Math.max(1, windowSamples - 1)
  const latestN = samples.length ? samples[samples.length - 1].n : 0
  const xFor = (n: number) => PEN_X - (latestN - n) * step

  // Printed on the paper, so tied to sample numbers and moving with it: the grid (a minor line every 10 samples,
  // major every 60) and the sprocket holes, across the whole paper, including the blank paper still to reach the pens.
  const firstN = latestN + Math.ceil((PAPER_R - PEN_X) / step)
  const gridLines: { x: number; major: boolean }[] = []
  const holes: number[] = []
  for (let n = firstN; xFor(n) > PAPER_L - 3; n--) {
    const x = xFor(n)
    if (n % 10 === 0 && x > PAPER_L && x < PAPER_R) gridLines.push({ x, major: n % 60 === 0 })
    if (n % 8 === 0) holes.push(x)
  }

  const current = samples[samples.length - 1]
  const paperTop = TOP_STRIP
  const paperBottom = vbH - BOTTOM_STRIP

  return (
    <div ref={panelRef} className={`cr-panel cr-screws p-3 sm:p-4 space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="cr-plate">Chart Recorder</div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-muted-foreground">
          <span
            className={`retro-lamp inline-block w-2.5 h-2.5 ${
              isPaused ? "bg-amber-500 text-amber-500 on" : "bg-green-500 text-green-500 on"
            }`}
          />
          {isPaused ? "Paper stopped" : `Last ${Math.round(windowSamples / 60)} min`}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono uppercase">
        {BANDS.map((b) => {
          const v = current ? current[b.key] : b.key === "rad" ? radioactivity : b.key === "temp" ? reactorTemp : steamVolume
          return (
            <div key={b.key} className="bg-background border-2 border-border px-1.5 py-1 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <span className="inline-block w-3 h-0.5 shrink-0" style={{ background: b.color }} />
                <span className="truncate text-muted-foreground">{b.label}</span>
              </div>
              <div className="font-bold tabular-nums" style={{ color: b.color }}>
                {Math.round(v)}
                {b.unit}
              </div>
            </div>
          )
        })}
      </div>

      {/* Paper */}
      <div className="ws3-chart-window relative bg-neutral-800 border-2 border-neutral-900 p-1">
        <svg
          ref={paperRef}
          viewBox={`0 0 ${VB_W} ${vbH}`}
          className="block w-full h-auto"
          role="img"
          aria-label={`Strip chart of the last ${Math.round(windowSamples / 60)} minutes: radioactivity, reactor temperature and steam`}
        >
          <defs>
            <linearGradient id="ws3-paper-shade" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity="0.18" />
              <stop offset="0.08" stopColor="#000" stopOpacity="0" />
              <stop offset="0.92" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.12" />
            </linearGradient>
            {BANDS.map((b) => (
              <clipPath key={b.key} id={`ws3-clip-${b.key}`}>
                <rect x={PAPER_L} y={layout[b.key].top - 1} width={PEN_X - PAPER_L + 1} height={layout[b.key].height + 2} />
              </clipPath>
            ))}
            <clipPath id="ws3-clip-paper">
              <rect x={PAPER_L} y={paperTop} width={PAPER_R - PAPER_L} height={paperBottom - paperTop} />
            </clipPath>
          </defs>

          {/* Housing above the paper: how the radioactivity band is scaled */}
          <text x={PAPER_R} y={TOP_STRIP - 3.5} fontSize="7" fontFamily="monospace" fill={HOUSING_INK} textAnchor="end">
            RADIOACTIVITY: LIN 0–500 · LOG ABOVE
          </text>

          {/* The paper, and everything printed or drawn on it, which moves with it */}
          <g clipPath="url(#ws3-clip-paper)">
            <rect x={PAPER_L} y={paperTop} width={PAPER_R - PAPER_L} height={paperBottom - paperTop} fill="#efe7cf" />

            {holes.map((x) => (
              <g key={`h${x}`}>
                <circle cx={x} cy={paperTop + 5.5} r={2} fill="#3f3f46" />
                <circle cx={x} cy={paperBottom - 5.5} r={2} fill="#3f3f46" />
              </g>
            ))}

            {BANDS.map((b) => {
              const at = layout[b.key]
              const points = samples.map((s) => `${xFor(s.n).toFixed(1)},${yFor(b, at, s[b.key]).toFixed(1)}`).join(" ")
              return (
                <g key={b.key}>
                  {/* Log region tint for radioactivity */}
                  {b.key === "rad" && (
                    <rect x={PAPER_L} y={at.top} width={PAPER_R - PAPER_L} height={at.height * 0.2} fill="#c81e1e" opacity="0.05" />
                  )}

                  {/* The band's printed grid: its edges and scale lines across the paper, and the time lines */}
                  {[at.top, at.top + at.height].map((y) => (
                    <line key={`${b.key}-e${y}`} x1={PAPER_L} x2={PAPER_R} y1={y} y2={y} stroke="#8a9a7a" strokeWidth="0.6" />
                  ))}
                  {gridLines.map((g) => (
                    <line
                      key={`${b.key}-g${g.x}`}
                      x1={g.x}
                      x2={g.x}
                      y1={at.top}
                      y2={at.top + at.height}
                      stroke="#7d9470"
                      strokeWidth={g.major ? 0.7 : 0.3}
                      opacity={g.major ? 0.7 : 0.5}
                    />
                  ))}
                  {b.ticks.map((t) => {
                    const y = yFor(b, at, t.v)
                    return (
                      <line
                        key={`${b.key}-t${t.v}`}
                        x1={PAPER_L}
                        x2={PAPER_R}
                        y1={y}
                        y2={y}
                        stroke={t.warn ? WARN_INK : "#7d9470"}
                        strokeWidth={t.warn ? 0.6 : 0.35}
                        strokeDasharray={t.warn ? "3 2" : undefined}
                        opacity="0.8"
                      />
                    )
                  })}

                  {/* Trace */}
                  {samples.length > 1 && (
                    <polyline
                      points={points}
                      fill="none"
                      stroke={b.color}
                      strokeWidth={b.key === "rad" ? 1.6 : 1.1}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      clipPath={`url(#ws3-clip-${b.key})`}
                      opacity="0.9"
                    />
                  )}
                </g>
              )
            })}

            {/* Paper edge shading */}
            <rect x={PAPER_L} y={paperTop} width={PAPER_R - PAPER_L} height={paperBottom - paperTop} fill="url(#ws3-paper-shade)" />
          </g>

          {BANDS.map((b) => {
            const at = layout[b.key]
            const labels = visibleLabels(b, at)
            const over = current ? b.scale(current[b.key]) > 1 : false
            const penY = current ? yFor(b, at, current[b.key]) : yFor(b, at, 0)
            return (
              <g key={b.key}>
                {/* Scale numbers engraved on the housing; a warning threshold's number in the pale red of its dashed line */}
                {b.ticks.map(
                  (t) =>
                    labels.has(t.v) && (
                      <text
                        key={`${b.key}-l${t.v}`}
                        x={PAPER_L - 2.5}
                        y={yFor(b, at, t.v) + 2.5}
                        fontSize="7"
                        fontFamily="monospace"
                        fill={t.warn ? WARN_INK : HOUSING_INK}
                        textAnchor="end"
                      >
                        {t.label}
                      </text>
                    ),
                )}

                {/* Pen carriage, riding over the paper */}
                <polygon
                  points={`${PEN_X + 1},${penY} ${PEN_X + 8},${penY - 4} ${PEN_X + 8},${penY + 4}`}
                  fill={b.color}
                  stroke="#1f1f1f"
                  strokeWidth="0.4"
                />

                {/* Over-range lamp on the housing, at the top of the band: flashes while the pen is off the scale */}
                <circle
                  cx={LAMP_X}
                  cy={at.top + 4}
                  r={2.6}
                  fill={over ? "#ef4444" : "#3b1111"}
                  stroke="#111"
                  strokeWidth="0.5"
                  className={over ? "ws3-chart-offscale" : undefined}
                >
                  <title>{over ? `${b.label} off scale` : `${b.label} over-range lamp`}</title>
                </circle>
              </g>
            )
          })}

          {/* Housing below the paper: time marks, relative to the pens */}
          {[180, 120, 60, 0].map((age) => {
            if (age > windowSamples) return null
            const x = Math.max(PAPER_L, PEN_X - age * step)
            return (
              <g key={`ax${age}`}>
                <line x1={x} x2={x} y1={paperBottom + 0.5} y2={paperBottom + 3} stroke={HOUSING_INK} strokeWidth="0.6" />
                <text
                  x={x}
                  y={vbH - 2}
                  fontSize="7"
                  fontFamily="monospace"
                  fill={HOUSING_INK}
                  textAnchor={x <= PAPER_L ? "start" : "middle"}
                >
                  {age === 0 ? "NOW" : `-${age / 60} MIN`}
                </text>
              </g>
            )
          })}

          {isPaused && (
            <text
              x={(PAPER_L + PAPER_R) / 2}
              y={vbH / 2}
              fontSize="16"
              fontFamily="monospace"
              fill="#b45309"
              opacity="0.55"
              textAnchor="middle"
              fontWeight="bold"
              transform={`rotate(-12 ${(PAPER_L + PAPER_R) / 2} ${vbH / 2})`}
            >
              CHART STOPPED
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
