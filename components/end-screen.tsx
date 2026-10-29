"use client"

import { useLayoutEffect, type CSSProperties, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import type { GameState } from "@/lib/types"
import { useTypewriter } from "@/hooks/use-typewriter"
import { usePrefersReducedMotion } from "@/components/presentation-use-reduced-motion"
import { formatCameraTimestamp, getCameraClockStartMs, getShiftElapsedSeconds } from "@/components/reactor-camera"
import RisingParticles from "@/components/rising-particles"

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

// Meltdown: after a few seconds of heat haze the heat cracks the camera's glass (owner, 2026-10-24). Three stages,
// each at its own time (s): a star of cracks from a first fracture, then its cracks run on toward the edges, then a
// second fracture lower left. Each crack is drawn outward from its fracture, on a 160 x 100 screen.
const MELTDOWN_CRACKS: { at: number; impact?: [number, number]; paths: string[] }[] = [
  {
    at: 4,
    impact: [112, 30],
    paths: [
      "M112 30 L116.5 27.9 L123 24.9 L127.9 23.4 L134.8 21.4 L141.6 19.9",
      "M112 30 L115 34.5 L119.9 39.4 L125 44.1",
      "M112 30 L111.6 34.2 L110.2 42.1 L108.8 48.6 L105.5 55.9",
      "M112 30 L109.3 37.1 L108.2 41.3 L107.3 46.9",
      "M112 30 L104.9 29.3 L101.1 29.3 L94.8 29.4 L89.2 30.3",
      "M112 30 L107.3 27.4 L102.3 22.8",
      "M112 30 L108.8 25.5 L105.5 21.3 L102.4 17.1",
      "M112 30 L113.7 22.2 L116 14.8",
      "M112 30 L117.2 27 L124 22.6 L129.4 18.1",
      "M116.5 27.9 L115.3 30.7 L115 34.5",
      "M115 34.5 L114.2 35.5 L111.6 34.2",
      "M109.3 37.1 L105.8 32.9 L104.9 29.3",
      "M108.8 25.5 L110.4 24.3 L113.7 22.2",
    ],
  },
  {
    at: 5.6,
    paths: [
      "M112 30 L119.1 33.4 L125.8 37.7 L130.4 39.3 L135.2 39.9 L138.7 40.5 L143.2 41.9 L148.7 44.2 L152.7 46.8 L156.8 49.2 L164.3 51.7",
      "M112 30 L115.6 37.1 L120.7 43.3 L126.7 48.5 L132.8 54.1 L138.3 58.1 L142.5 60.3",
      "M112 30 L107.5 35.7 L103.2 41.3 L101.5 44.6 L99.3 52.3 L96.1 58.5 L93.7 61.4 L87.6 66.1",
      "M112 30 L106.4 29.2 L99.8 26.8 L94.4 25.7 L89.2 23.6 L83.3 21.6 L77.3 18.7 L72.9 16 L67.7 13.8 L63.7 10.7 L57.3 5.2 L52.6 -1 L50.1 -4.8",
      "M112 30 L108.4 24.8 L103.7 18.2 L101 14.6 L98.7 10.9 L95.6 5.6 L93.2 0.1 L91.8 -5.1",
      "M112 30 L112.6 23.8 L112.5 16.8 L112.8 12 L111.9 6.4 L112.1 -0.9 L113.8 -8.7",
      "M127.9 23.4 L127.8 32.3 L125 44.1",
      "M125 44.1 L117.2 47 L108.8 48.6",
      "M116 14.8 L124 15.5 L129.4 18.1",
    ],
  },
  {
    at: 7.4,
    impact: [44, 72],
    paths: [
      "M44 72 L48.7 71.1 L56.8 69.1 L63.6 68.4 L69.1 67.6 L72.8 66.5 L80.3 66.2",
      "M44 72 L49.6 74.3 L53.8 76.2 L58.1 77.2 L62.8 78.7 L68.8 80.5 L77.1 81.2 L82.7 81.1 L86.2 80.2",
      "M44 72 L43.2 76.7 L41.1 83.7 L38.6 88.8",
      "M44 72 L38 75.1 L33.4 77.7 L28.2 80.7 L22.4 83.2 L16 85.5 L9 86.6 L1.4 85.8",
      "M44 72 L36 70.4 L30.7 70.4 L25.5 69.5 L18.8 67.4 L11.4 63.9",
      "M44 72 L37.2 69 L30.4 64.8 L25.2 60.7",
      "M44 72 L44.4 64.2 L43.9 56.4 L43.3 49.6 L41.9 44.3",
      "M44 72 L50.7 67.7 L55.3 65.3 L61.4 60.5",
      "M49.6 74.3 L44.9 74.4 L43.2 76.7",
      "M43.2 76.7 L39.2 76.5 L38 75.1",
      "M38 75.1 L36 71.9 L36 70.4",
      "M44.4 64.2 L46.1 66.9 L50.7 67.7",
      "M50.7 67.7 L50.4 68.3 L48.7 71.1",
      "M82.7 81.1 L85.4 84.9 L88.5 87.9 L90.3 89.7 L92.3 92.1 L94.7 94.2 L97.8 97.2",
      "M28.2 80.7 L24.5 80.1 L20.2 78.7 L17.9 77.4 L14.8 74.8 L12.3 72 L9.6 67.9",
      "M30.4 64.8 L27.7 65.2 L22.6 67.1 L20.2 68.4",
      "M43.3 49.6 L44.6 47.5 L46.1 43.6 L47.4 40.4 L47.8 37.3",
      "M119.9 39.4 L120 44.1 L120.4 48.7 L119.7 53 L117.8 57.5 L115.8 61.7",
      "M33.4 77.7 L32.9 81.4 L32.4 85 L32.6 87.8 L33 90.4 L34 93.8 L36.1 97.7",
      "M119.9 39.4 L119.3 44.2 L118.1 47.7 L117.7 52.6",
      "M55.3 65.3 L58 66.5 L62.6 67.8 L67.3 70",
    ],
  },
]

// The cracked glass: a dark edge under a bright hairline for each crack, and a frosted chip where the glass first gave
function MeltdownCracks() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="cr-crack-chip">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {MELTDOWN_CRACKS.map(({ at, impact, paths }) => (
        <g key={at} className="cr-crack" style={{ "--at": `${at}s` } as CSSProperties}>
          {impact && <circle className="cr-crack-flash" cx={impact[0]} cy={impact[1]} r="9" fill="url(#cr-crack-chip)" />}
          {impact && <circle cx={impact[0]} cy={impact[1]} r="4" fill="url(#cr-crack-chip)" />}
          {paths.map((d) => (
            <path key={`edge ${d}`} d={d} pathLength={1} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" strokeLinejoin="round" transform="translate(0.2 0.25)" />
          ))}
          {paths.map((d) => (
            <path key={`line ${d}`} d={d} pathLength={1} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.28" strokeLinejoin="round" />
          ))}
        </g>
      ))}
    </svg>
  )
}

// The reactor hall camera, playing out how the shift ended.
function EndCamera({ kind, timestamp, reduced }: { kind: EndingKind; timestamp: string; reduced: boolean }) {
  const hot = kind === "meltdown" || kind === "explosion"
  // Explosion: the hall is gone once the white-out peaks, so the picture can't show through as the white-out fades
  const picture = (
    <div className={`absolute inset-0 ${kind === "meltdown" ? "cr-cam-haze" : kind === "explosion" ? "cr-cam-blown" : ""}`}>
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
          {kind === "meltdown" ? (
            // The glass is on the camera, so its cracks sit over the picture but not under the haze, and the picture
            // jolts as each fracture gives
            <div className="cr-crack-jolt absolute inset-0">
              {picture}
              <MeltdownCracks />
            </div>
          ) : (
            picture
          )}
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

  // The end screen replaces the game page in place, so the browser keeps the player's scroll position (usually
  // well down the page on a phone). Start at the top, with the camera in view. iOS Safari needs more than one
  // scroll: it restores the old position when it reloads a discarded tab (the ended game is saved, so a reload
  // opens here), and it ignores a scroll while a flick is still coasting. So turn off its scroll restoration,
  // scroll before the first paint, and again a frame and a moment later.
  useLayoutEffect(() => {
    const restoration = history.scrollRestoration
    history.scrollRestoration = "manual"
    const toTop = () => window.scrollTo(0, 0)
    toTop()
    const frame = requestAnimationFrame(toTop)
    const late = setTimeout(toTop, 250)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(late)
      history.scrollRestoration = restoration
    }
  }, [])
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
    router.replace("/") // as leaving mid-game: the finished game leaves the history
  }

  const delay = (s: number) => ({ "--delay": `${s}s` }) as CSSProperties

  return (
    <div
      className="cr-end-room relative min-h-screen overflow-hidden bg-black"
      style={{ backgroundImage: "url(control_room_background.jpg)", "--end-tint": look.tint } as CSSProperties}
    >
      {disaster && <div className="cr-beacon" aria-hidden="true" />}
      {/* Embers burst up after an explosion; glowing fallout drifts after a meltdown */}
      {disaster && <RisingParticles kind={kind === "explosion" ? "embers" : "fallout"} start={kind === "explosion" ? "burst" : "drifting"} />}
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
            <span className="cr-lens-bezel w-full sm:w-auto">
              <button onClick={handleReturnToMenu} className="cr-lens w-full sm:w-56 h-12">
                Main Menu
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
