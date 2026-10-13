"use client"

import type { CSSProperties, ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { GameState } from "@/lib/types"
import { useTypewriter } from "@/hooks/use-typewriter"
import { usePrefersReducedMotion } from "@/components/presentation-use-reduced-motion"
import { formatCameraTimestamp, getCameraClockStartMs, getShiftElapsedSeconds } from "@/components/reactor-camera"

export type EndingKind = "explosion" | "meltdown" | "performance" | "success"

const LOOK: Record<EndingKind, { ann: string; tint: string; flash: boolean }> = {
  explosion: { ann: "#dc2626", tint: "rgba(255, 110, 30, 0.35)", flash: true },
  meltdown: { ann: "#dc2626", tint: "rgba(220, 38, 38, 0.3)", flash: true },
  performance: { ann: "#d97706", tint: "rgba(217, 119, 6, 0.12)", flash: true },
  success: { ann: "#15803d", tint: "rgba(52, 211, 153, 0.16)", flash: false },
}

interface EndScreenProps {
  kind: EndingKind
  gameState: GameState
  /** Text on the backlit annunciator window */
  title: string
  /** The plant computer's last message, typed on the green screen */
  message: string
  /** One optional line under the message */
  lead?: string
  /** The paper report (IncidentReport) */
  report: ReactNode
}

// Deterministic particle field: embers after an explosion, glowing fallout after a meltdown.
function Particles({ kind }: { kind: "explosion" | "meltdown" }) {
  const count = kind === "explosion" ? 34 : 24
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const size = 2 + ((i * 7) % 5)
        const duration = 5 + ((i * 13) % 7)
        const style = {
          left: `${(i * 37 + 11) % 100}%`,
          width: size,
          height: size,
          animationDuration: `${duration}s`,
          animationDelay: kind === "explosion" ? `${0.4 + ((i * 0.23) % 3)}s` : `${-((i * 0.9) % duration)}s`,
          "--drift": `${((i * 29) % 90) - 45}px`,
        } as CSSProperties
        return <span key={i} className={`cr-ember ${kind === "meltdown" ? "cr-ember-fallout" : ""}`} style={style} />
      })}
    </div>
  )
}

// The reactor hall camera, playing out how the shift ended.
function EndCamera({ kind, timestamp, reduced }: { kind: EndingKind; timestamp: string; reduced: boolean }) {
  const hot = kind === "meltdown" || kind === "explosion"
  const picture = (
    <div className={`absolute inset-0 ${kind === "meltdown" ? "cr-cam-haze" : ""}`}>
      <img src="/new_reactor_image_cropped.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
      {hot && (
        <img
          src="/new_reactor_image_high_temp_cropped.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover mix-blend-screen"
          style={{ opacity: kind === "meltdown" ? 0.8 : 0.6 }}
        />
      )}
      {kind === "meltdown" && (
        <img
          src="/new_reactor_image_high_radioactivity_cropped.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-40"
        />
      )}
      {kind === "meltdown" && <div className="cr-cam-heat absolute inset-0" />}
      {kind === "meltdown" && (
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="ws3-cam-static absolute -inset-1/2" />
        </div>
      )}
    </div>
  )

  const osd = (
    <div className="ws3-cam-osd absolute inset-0 p-[3.5%] flex flex-col justify-between font-mono uppercase text-white text-[10px] sm:text-xs leading-tight">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate">CAM 04 – REACTOR HALL – UNIT 4</span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="ws3-cam-rec-dot inline-block rounded-full bg-red-600 w-[0.8em] h-[0.8em]" />
          REC
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="tabular-nums">{timestamp}</span>
        {kind === "meltdown" && <span className="ws3-cam-signal shrink-0 text-amber-300">SIGNAL DEGRADED</span>}
        {kind === "success" && <span className="shrink-0 text-green-300">ALL STABLE</span>}
      </div>
    </div>
  )

  return (
    <div className="ws3-cam-bezel rounded-lg p-2 sm:p-3">
      <div className="ws3-cam-screen relative isolate w-full aspect-[16/10] overflow-hidden bg-black">
        {/* The live picture. Dismissal: the monitor is switched off. Success: it warms up. */}
        <div className={`absolute inset-0 ${kind === "performance" ? "cr-crt-off" : kind === "success" ? "cr-crt-on" : ""}`}>
          {picture}
          <div className="ws3-cam-scanlines absolute inset-0" />
          <div className="ws3-cam-flicker absolute inset-0" />
          {osd}
        </div>

        {/* Explosion: white-out, then the camera is gone */}
        {kind === "explosion" && (
          <>
            <div className="cr-cam-whiteout absolute inset-0" />
            <div className="cr-cam-dead absolute inset-0 bg-neutral-900">
              <div className="absolute inset-0 overflow-hidden opacity-80">
                <div className="ws3-cam-static absolute -inset-1/2" />
              </div>
              {!reduced && <div className="cr-cam-roll absolute inset-0" />}
              <div className="ws3-cam-osd absolute inset-0 flex flex-col items-center justify-center gap-1 font-mono uppercase text-white">
                <span className="ws3-cam-signal text-xl sm:text-3xl font-bold tracking-[0.3em]">No Signal</span>
                <span className="text-[10px] sm:text-xs opacity-80">CAM 04 – Reactor hall</span>
              </div>
            </div>
          </>
        )}

        <div className="ws3-cam-vignette absolute inset-0 pointer-events-none" />
      </div>

      <div className="flex items-center justify-between pt-1.5 sm:pt-2 px-1 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-neutral-500 select-none">
        <span>CCTV · VK-4</span>
        <span className="flex items-center gap-1.5">
          <span
            className={`retro-lamp on inline-block w-2 h-2 ${
              kind === "performance" ? "bg-amber-500 text-amber-500" : kind === "explosion" ? "bg-red-500 text-red-500" : "bg-green-500 text-green-500"
            }`}
          />
          {kind === "performance" ? "STBY" : kind === "explosion" ? "FAULT" : "PWR"}
        </span>
      </div>

      {/* Heat haze for the meltdown picture */}
      {kind === "meltdown" && (
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <filter id="cr-heat-haze">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.045" numOctaves="2" seed="4">
              {!reduced && (
                <animate attributeName="baseFrequency" dur="5s" values="0.012 0.045;0.016 0.06;0.012 0.045" repeatCount="indefinite" />
              )}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="6" />
          </filter>
        </svg>
      )}
    </div>
  )
}

// The end of a shift, however it ended (bible §11, §15): the camera, the annunciator, the plant computer's last
// message and the paper report.
export default function EndScreen({ kind, gameState, title, message, lead, report }: EndScreenProps) {
  const router = useRouter()
  const reduced = usePrefersReducedMotion()
  const look = LOOK[kind]
  const disaster = kind === "explosion" || kind === "meltdown"
  const timestamp = formatCameraTimestamp(
    getShiftElapsedSeconds(gameState.gameTime, gameState.timeLimit, gameState.mode),
    getCameraClockStartMs(gameState.mode),
  )

  const [line] = useTypewriter([{ key: "end", text: message.toUpperCase() }], {
    charsPerSecond: 70,
    delayMs: disaster ? 1600 : 900,
    typeExisting: true,
    instant: reduced,
  })

  const handleReturnToMenu = () => {
    localStorage.removeItem("chernobyl-game-state")
    router.push("/")
  }

  const delay = (s: number) => ({ "--delay": `${s}s` }) as CSSProperties

  return (
    <div
      className="cr-end-room relative min-h-screen overflow-hidden bg-black"
      style={{ backgroundImage: "url(control_room_background.jpg)", "--end-tint": look.tint } as CSSProperties}
    >
      {disaster && <div className="cr-beacon" aria-hidden="true" />}
      {disaster && <Particles kind={kind} />}
      {kind === "explosion" && <div className="ws5-flash pointer-events-none fixed inset-0 z-50 bg-white" aria-hidden="true" />}

      <div className={`relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6 ${kind === "explosion" ? "cr-shake" : ""}`}>
        <EndCamera kind={kind} timestamp={timestamp} reduced={reduced} />

        <h1
          className={`cr-annunciator ${look.flash ? "cr-annunciator-flash" : ""} cr-rise-in px-4 py-4 sm:py-5 text-3xl sm:text-5xl text-center`}
          style={{ "--ann": look.ann, ...delay(disaster ? 1.2 : 0.6) } as CSSProperties}
        >
          {title}
        </h1>

        <div className="cr-panel-dark cr-screws cr-rise-in p-4 sm:p-6 space-y-5" style={delay(disaster ? 1.5 : 0.9)}>
          {/* The plant computer's last word */}
          <div className="ws5-crt-screen px-3 py-3 sm:px-4 min-h-[4.5rem]">
            <div className="ws5-crt-text text-lg sm:text-xl leading-tight pl-[2ch] -indent-[2ch]" aria-hidden="true">
              <span className="ws5-crt-dim">&gt; </span>
              {line ? line.text.slice(0, line.shown) : ""}
              <span className={`ws5-crt-cursor ${line && !line.typing ? "ws5-crt-cursor-blink" : ""}`} />
            </div>
            <p className="sr-only">{message}</p>
          </div>

          {lead && <p className="font-mono text-sm text-neutral-300 leading-relaxed text-center">{lead}</p>}

          {report}

          <div className="flex justify-center pt-1">
            <span className="cr-bezel w-full sm:w-auto">
              <button onClick={handleReturnToMenu} className="cr-key cr-key-cream w-full sm:w-56 h-12">
                Main Menu
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
