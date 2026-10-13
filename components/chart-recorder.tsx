"use client"

import { useEffect, useRef, useState } from "react"

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
  className?: string
}

type Key = "rad" | "temp" | "steam"

interface Band {
  key: Key
  label: string
  unit: string
  color: string
  top: number
  height: number
  /** value -> 0..1 (may exceed 1 when off scale) */
  scale: (v: number) => number
  max: number
  ticks: { v: number; label: string; warn?: boolean }[]
}

// Radioactivity: linear 0–500 on the lower 80% of the band, then logarithmic 500–5000 on the top 20%.
const RAD_LINEAR_MAX = 500
const RAD_LOG_MAX = 5000
const radScale = (v: number) => {
  if (v <= 0) return 0
  if (v <= RAD_LINEAR_MAX) return (0.8 * v) / RAD_LINEAR_MAX
  return 0.8 + (0.2 * Math.log10(v / RAD_LINEAR_MAX)) / Math.log10(RAD_LOG_MAX / RAD_LINEAR_MAX)
}

// SVG geometry (viewBox units)
const VB_W = 320
const PLOT_L = 30
const PLOT_R = 300
const PAPER_L = 4
const PAPER_R = 316

const BANDS: Band[] = [
  {
    key: "rad",
    label: "Radioactivity",
    unit: "",
    color: "#c81e1e",
    top: 26,
    height: 128,
    scale: radScale,
    max: RAD_LOG_MAX,
    ticks: [
      { v: 0, label: "0" },
      { v: 50, label: "50", warn: true },
      { v: 250, label: "250", warn: true },
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
    top: 182,
    height: 70,
    scale: (v) => Math.max(0, v) / 1200,
    max: 1200,
    ticks: [
      { v: 0, label: "0" },
      { v: 400, label: "400" },
      { v: 800, label: "800", warn: true },
      { v: 1200, label: "1200", warn: true },
    ],
  },
  {
    key: "steam",
    label: "Steam",
    unit: "",
    color: "#15803d",
    top: 280,
    height: 70,
    scale: (v) => Math.max(0, v) / 600,
    max: 600,
    ticks: [
      { v: 0, label: "0" },
      { v: 300, label: "300", warn: true },
      { v: 600, label: "600" },
    ],
  },
]

const VB_H = 372

const yFor = (band: Band, v: number) => {
  const f = Math.min(1, Math.max(0, band.scale(v)))
  return band.top + band.height * (1 - f)
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
  className = "",
}: ChartRecorderProps) {
  const [samples, setSamples] = useState<Sample[]>([])

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

  const step = (PLOT_R - PLOT_L) / Math.max(1, windowSamples - 1)
  const latestN = samples.length ? samples[samples.length - 1].n : 0
  const xFor = (n: number) => PLOT_R - (latestN - n) * step

  // Moving paper grid: a minor line every 10 samples, major every 60, tied to sample numbers so it scrolls.
  const gridLines: { x: number; major: boolean }[] = []
  for (let n = latestN; n > latestN - windowSamples; n--) {
    if (n % 10 === 0) gridLines.push({ x: xFor(n), major: n % 60 === 0 })
  }
  // Sprocket holes, also moving with the paper.
  const holes: number[] = []
  for (let n = latestN; n > latestN - windowSamples - 8; n--) {
    if (n % 8 === 0) {
      const x = xFor(n)
      if (x > PAPER_L + 3) holes.push(x)
    }
  }

  const current = samples[samples.length - 1]

  return (
    <div className={`cr-panel cr-screws p-3 sm:p-4 space-y-2 ${className}`}>
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
          viewBox={`0 0 ${VB_W} ${VB_H}`}
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
                <rect x={PLOT_L} y={b.top - 1} width={PLOT_R - PLOT_L + 1} height={b.height + 2} />
              </clipPath>
            ))}
          </defs>

          {/* Paper */}
          <rect x={PAPER_L} y={2} width={PAPER_R - PAPER_L} height={VB_H - 4} fill="#efe7cf" />

          {/* Sprocket holes */}
          {holes.map((x) => (
            <g key={`h${x}`}>
              <circle cx={x} cy={9} r={2} fill="#3f3f46" />
              <circle cx={x} cy={VB_H - 9} r={2} fill="#3f3f46" />
            </g>
          ))}

          {BANDS.map((b) => {
            const over = current ? b.scale(current[b.key]) > 1 : false
            const points = samples.map((s) => `${xFor(s.n).toFixed(1)},${yFor(b, s[b.key]).toFixed(1)}`).join(" ")
            const penY = current ? yFor(b, current[b.key]) : yFor(b, 0)
            return (
              <g key={b.key}>
                {/* Band label */}
                <text x={PLOT_L} y={b.top - 7} fontSize="9" fontFamily="monospace" fill={b.color} fontWeight="bold">
                  {b.label.toUpperCase()}
                </text>
                {b.key === "rad" && (
                  <text x={PLOT_R} y={b.top - 7} fontSize="7" fontFamily="monospace" fill="#6b6b5a" textAnchor="end">
                    LIN 0–500 · LOG ABOVE
                  </text>
                )}

                {/* Log region tint for radioactivity */}
                {b.key === "rad" && (
                  <rect
                    x={PLOT_L}
                    y={b.top}
                    width={PLOT_R - PLOT_L}
                    height={b.height * 0.2}
                    fill="#c81e1e"
                    opacity="0.05"
                  />
                )}

                {/* Band frame */}
                <rect
                  x={PLOT_L}
                  y={b.top}
                  width={PLOT_R - PLOT_L}
                  height={b.height}
                  fill="none"
                  stroke="#8a9a7a"
                  strokeWidth="0.6"
                />

                {/* Moving vertical grid */}
                {gridLines.map((g) => (
                  <line
                    key={`${b.key}-g${g.x}`}
                    x1={g.x}
                    x2={g.x}
                    y1={b.top}
                    y2={b.top + b.height}
                    stroke="#7d9470"
                    strokeWidth={g.major ? 0.7 : 0.3}
                    opacity={g.major ? 0.7 : 0.5}
                  />
                ))}

                {/* Horizontal scale ticks */}
                {b.ticks.map((t) => {
                  const y = yFor(b, t.v)
                  return (
                    <g key={`${b.key}-t${t.v}`}>
                      <line
                        x1={PLOT_L}
                        x2={PLOT_R}
                        y1={y}
                        y2={y}
                        stroke={t.warn ? "#b45309" : "#7d9470"}
                        strokeWidth={t.warn ? 0.6 : 0.35}
                        strokeDasharray={t.warn ? "3 2" : undefined}
                        opacity="0.8"
                      />
                      <text
                        x={PLOT_L - 3}
                        y={y + 2.5}
                        fontSize="7"
                        fontFamily="monospace"
                        fill={t.warn ? "#b45309" : "#55604a"}
                        textAnchor="end"
                      >
                        {t.label}
                      </text>
                    </g>
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

                {/* Pen carriage */}
                <polygon
                  points={`${PLOT_R + 1},${penY} ${PLOT_R + 8},${penY - 4} ${PLOT_R + 8},${penY + 4}`}
                  fill={b.color}
                  stroke="#1f1f1f"
                  strokeWidth="0.4"
                />

                {/* Off-scale indicator */}
                {over && (
                  <g className="ws3-chart-offscale">
                    <rect
                      x={PLOT_R - 64}
                      y={b.top + 2}
                      width={62}
                      height={11}
                      fill="#c81e1e"
                      rx="1"
                    />
                    <text
                      x={PLOT_R - 33}
                      y={b.top + 10}
                      fontSize="7.5"
                      fontFamily="monospace"
                      fill="#fff"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      ▲ OFF SCALE
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Time axis labels (relative to the pens) */}
          {[180, 120, 60, 0].map((age) => {
            if (age > windowSamples) return null
            const x = PLOT_R - age * step
            return (
              <text
                key={`ax${age}`}
                x={x}
                y={VB_H - 16}
                fontSize="7"
                fontFamily="monospace"
                fill="#55604a"
                textAnchor={age === 0 ? "end" : "middle"}
              >
                {age === 0 ? "NOW" : `-${age / 60} MIN`}
              </text>
            )
          })}

          {/* Paper edge shading */}
          <rect x={PAPER_L} y={2} width={PAPER_R - PAPER_L} height={VB_H - 4} fill="url(#ws3-paper-shade)" />

          {isPaused && (
            <text
              x={(PLOT_L + PLOT_R) / 2}
              y={VB_H / 2}
              fontSize="16"
              fontFamily="monospace"
              fill="#b45309"
              opacity="0.55"
              textAnchor="middle"
              fontWeight="bold"
              transform={`rotate(-12 ${(PLOT_L + PLOT_R) / 2} ${VB_H / 2})`}
            >
              CHART STOPPED
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}
