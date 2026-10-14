"use client"

import { useEffect, useRef } from "react"
import { GAME_MODE_CONFIGS, THRESHOLDS, type GameMode } from "@/lib/types"
import { getClockStartSeconds } from "@/lib/game-utils"
import { usePrefersReducedMotion } from "./presentation-use-reduced-motion"

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// The radiation picture fades in from just below the high-radioactivity warning (owner, 2026-10-14).
const RADIATION_GLOW_START = 320
const RADIATION_GLOW_FULL = 520

export function getRadioactivityOpacity(value: number): number {
  if (value <= RADIATION_GLOW_START) return 0
  if (value >= RADIATION_GLOW_FULL) return 1
  return (value - RADIATION_GLOW_START) / (RADIATION_GLOW_FULL - RADIATION_GLOW_START)
}

export function getTemperatureOpacity(value: number): number {
  if (value <= 600) return 0
  if (value >= 800) return 1
  return (value - 600) / 200
}

/** Interference starts at the high-radioactivity warning and is at full strength by this level. */
const INTERFERENCE_START = THRESHOLDS.radioactivity.highWarning
const INTERFERENCE_FULL = 600

export function getInterferenceIntensity(radioactivity: number): number {
  if (radioactivity <= INTERFERENCE_START) return 0
  const t = Math.min(1, (radioactivity - INTERFERENCE_START) / (INTERFERENCE_FULL - INTERFERENCE_START))
  return Math.pow(t, 0.8)
}

/**
 * Seconds elapsed since the shift started, derived from game state fields.
 * Countdown modes: timeLimit - gameTime. Count-up (Free): gameTime.
 */
export function getShiftElapsedSeconds(gameTime: number, timeLimit: number | null, mode: GameMode): number {
  const config = GAME_MODE_CONFIGS[mode]
  if (config && config.timerMode === "countdown" && timeLimit !== null) {
    return Math.max(0, timeLimit - gameTime)
  }
  return Math.max(0, gameTime)
}

/** Default camera clock start: 26-04-1986 00:00:00 (UTC is used purely as a fixed, timezone-free clock). */
export const CAMERA_CLOCK_START_MS = Date.UTC(1986, 3, 26, 0, 0, 0)

/** The Safety Test's camera starts at 01:07:00, so the test begins at 01:23:04 as it did. Other modes: 00:00:00. */
export function getCameraClockStartMs(mode: GameMode): number {
  return CAMERA_CLOCK_START_MS + getClockStartSeconds(mode) * 1000
}

const pad = (n: number) => String(n).padStart(2, "0")

export function formatCameraTimestamp(elapsedSeconds: number, clockStartMs: number = CAMERA_CLOCK_START_MS): string {
  const d = new Date(clockStartMs + Math.max(0, Math.floor(elapsedSeconds)) * 1000)
  return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(
    d.getUTCMinutes(),
  )}:${pad(d.getUTCSeconds())}`
}

/* ------------------------------------------------------------------ */
/* Speckle canvas (only runs while interference > 0)                   */
/* ------------------------------------------------------------------ */

const SPECKLE_RES = 320

function SpeckleCanvas({ intensity, reducedMotion }: { intensity: number; reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity
  const active = intensity > 0

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (!active) {
      ctx.clearRect(0, 0, SPECKLE_RES, SPECKLE_RES)
      return
    }

    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const draw = () => {
      const i = intensityRef.current
      ctx.clearRect(0, 0, SPECKLE_RES, SPECKLE_RES)
      // White speckles: few at first, a blizzard at full strength.
      const count = Math.floor(15 + 1100 * i * i + 150 * i)
      for (let n = 0; n < count; n++) {
        const x = Math.random() * SPECKLE_RES
        const y = Math.random() * SPECKLE_RES
        const big = Math.random() < 0.12 + 0.25 * i
        const s = big ? 2 : 1
        ctx.fillStyle = `rgba(255,255,255,${0.45 + Math.random() * 0.55})`
        ctx.fillRect(x, y, s, s)
      }
      // Occasional horizontal streaks (radiation hits on the camera tube).
      const streaks = Math.floor(i * 6 * Math.random())
      for (let n = 0; n < streaks; n++) {
        const y = Math.random() * SPECKLE_RES
        const x = Math.random() * SPECKLE_RES
        const len = 8 + Math.random() * 60 * i
        ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.5})`
        ctx.fillRect(x, y, len, 1)
      }
      if (!cancelled) timer = setTimeout(draw, reducedMotion ? 1500 : 85)
    }

    draw()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [active, reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      width={SPECKLE_RES}
      height={SPECKLE_RES}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: active ? Math.min(1, 0.35 + intensity * 0.65) : 0 }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* ReactorCamera                                                       */
/* ------------------------------------------------------------------ */

export interface ReactorCameraProps {
  radioactivity: number
  reactorTemp: number
  /** Seconds since the shift started; drives the on-screen timestamp (see getShiftElapsedSeconds). */
  elapsedSeconds: number
  /** "inline": sits in the game page layout. "fullscreen": fills a `fixed inset-0` container supplied by the parent. */
  variant?: "inline" | "fullscreen"
  /** Optional clock start (ms since epoch, read as UTC). Defaults to 26-04-1986 00:00:00. */
  clockStartMs?: number
  className?: string
}

export default function ReactorCamera({
  radioactivity,
  reactorTemp,
  elapsedSeconds,
  variant = "inline",
  clockStartMs = CAMERA_CLOCK_START_MS,
  className = "",
}: ReactorCameraProps) {
  const reducedMotion = usePrefersReducedMotion()
  const interference = getInterferenceIntensity(radioactivity)
  const timestamp = formatCameraTimestamp(elapsedSeconds, clockStartMs)
  const isFullscreen = variant === "fullscreen"

  const monitor = (
    <div
      className={`ws3-cam-bezel relative w-full p-2 sm:p-3 md:p-4 ${isFullscreen ? "" : "rounded-lg"}`}
      style={isFullscreen ? { width: "min(100%, calc(100dvh - 4rem))" } : undefined}
    >
      {/* The screen */}
      <div className="@container ws3-cam-screen relative isolate w-full aspect-square overflow-hidden bg-gray-900">
        {/* 1. BASE LAYER (Always Visible) */}
        <img
          src="/new_reactor_image_cropped.jpg"
          alt="Reactor hall, seen from above on a security camera"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* 2. TEMPERATURE LAYER (Dynamic Opacity) */}
        <img
          src="/new_reactor_image_high_temp_cropped.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 pointer-events-none mix-blend-screen"
          style={{ opacity: getTemperatureOpacity(reactorTemp) }}
        />

        {/* 3. RADIOACTIVITY LAYER (Dynamic Opacity) */}
        <img
          src="/new_reactor_image_high_radioactivity_cropped.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-500 pointer-events-none mix-blend-screen"
          style={{ opacity: getRadioactivityOpacity(radioactivity) }}
        />

        {/* --- CCTV treatment (all pointer-events-none, above the picture) --- */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          {/* Static / snow (only above the high-radioactivity warning) */}
          <div
            className="ws3-cam-static-wrap absolute inset-0 overflow-hidden transition-opacity duration-700"
            style={{ opacity: interference > 0 ? 0.12 + interference * 0.5 : 0 }}
            aria-hidden="true"
          >
            {interference > 0 && <div className="ws3-cam-static absolute -inset-1/2" />}
          </div>
          <SpeckleCanvas intensity={interference} reducedMotion={reducedMotion} />

          {/* Scanlines */}
          <div className="ws3-cam-scanlines absolute inset-0" aria-hidden="true" />
          {/* Faint flicker */}
          <div className="ws3-cam-flicker absolute inset-0" aria-hidden="true" />
          {/* Vignette + tube curvature */}
          <div className="ws3-cam-vignette absolute inset-0" aria-hidden="true" />

          {/* Hairline crack, bottom-right corner */}
          <svg
            className="absolute bottom-0 right-0 w-[22%] h-[22%] opacity-40"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M100 62 L86 66 L78 61 L69 70 L58 72 L50 80 L41 83 L33 94 L29 100"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="0.6"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M69 70 L66 79 L60 86 M50 80 L47 74 L40 71 M86 66 L88 76 L84 84"
              fill="none"
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* On-screen display */}
          <div className="ws3-cam-osd absolute inset-0 p-[3.5%] flex flex-col justify-between font-mono uppercase text-white text-[9px] @xs:text-[11px] @md:text-sm @3xl:text-lg leading-tight">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 truncate">CAM 04 – REACTOR HALL – UNIT 4</span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="ws3-cam-rec-dot inline-block rounded-full bg-red-600 w-[0.8em] h-[0.8em]" />
                REC
              </span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <span className="tabular-nums">{timestamp}</span>
              {interference > 0.15 && (
                <span className="ws3-cam-signal shrink-0 text-amber-300">SIGNAL DEGRADED</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bezel details */}
      <div className="flex items-center justify-between pt-1.5 sm:pt-2 px-1 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-neutral-500 select-none">
        <span>CCTV · VK-4</span>
        <span className="flex items-center gap-1.5">
          <span className="retro-lamp on inline-block w-2 h-2 bg-green-500 text-green-500" />
          PWR
        </span>
      </div>
    </div>
  )

  if (isFullscreen) {
    return (
      <div className={`w-full h-full flex justify-center items-center p-4 ${className}`}>
        {monitor}
      </div>
    )
  }

  return <div className={`w-full ${className}`}>{monitor}</div>
}
