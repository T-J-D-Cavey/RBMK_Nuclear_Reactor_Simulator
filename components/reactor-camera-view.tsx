"use client"

import { ArrowLeft } from "lucide-react"
import ReactorCamera, { getInterferenceIntensity } from "./reactor-camera"

// The full reactor camera view: the CCTV monitor set in its own control panel (owner, 2026-10-27: prototype A, and C
// on a phone). Back is the only control on it. Everything else is read-only panel furniture, so the player never
// wonders whether it can be pressed: status lamps, a signal meter, a talkback grille, vents and a service note.

interface ReactorCameraViewProps {
  radioactivity: number
  reactorTemp: number
  elapsedSeconds: number
  clockStartMs: number
  onBack: () => void
}

// The signal meter's needle (0–1): steady near the top of the scale, falling into the red as interference builds
const signalStrength = (interference: number) => 0.82 - 0.75 * interference

function SignalMeter({ signal, className = "" }: { signal: number; className?: string }) {
  return (
    <svg viewBox="0 0 150 92" role="img" aria-label={`Signal ${Math.round(signal * 100)}%`} className={className}>
      <rect x="1" y="1" width="148" height="90" rx="4" fill="#efe9d6" stroke="#1d1d1b" strokeWidth="2" />
      <path d="M25 70 A50 50 0 0 1 125 70" fill="none" stroke="#2b2a24" strokeWidth="1.5" />
      <path d="M25 70 A50 50 0 0 1 31.7 45" fill="none" stroke="#c81e1e" strokeWidth="4" />
      <path d="M25 70 L31 70 M39.6 34.6 L43.9 38.9 M75 20 L75 26 M110.4 34.6 L106.1 38.9 M125 70 L119 70" stroke="#2b2a24" strokeWidth="1.5" />
      <text x="22" y="82" fontFamily="var(--font-plate), sans-serif" fontSize="9" fontWeight="700" fill="#2b2a24">0</text>
      <text x="117" y="82" fontFamily="var(--font-plate), sans-serif" fontSize="9" fontWeight="700" fill="#2b2a24">100</text>
      <text x="75" y="84" textAnchor="middle" fontFamily="var(--font-plate), sans-serif" fontSize="10" fontWeight="700" letterSpacing="1.5" fill="#2b2a24">
        SIGNAL %
      </text>
      <line
        x1="75"
        y1="70"
        x2="75"
        y2="25"
        stroke="#111"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ transform: `rotate(${(signal - 0.5) * 180}deg)`, transformOrigin: "75px 70px", transition: "transform 600ms ease-out" }}
      />
      <circle cx="75" cy="70" r="4.5" fill="#1d1d1b" />
    </svg>
  )
}

function StatusLamps({ interference, column }: { interference: number; column: boolean }) {
  const lamps = [
    { caption: "Pwr", className: "cr-jewel-green on" },
    { caption: "Rec", className: "cr-jewel-red cr-jewel-steady on" },
    { caption: "Interf.", className: `cr-jewel-amber ${interference > 0 ? "on" : ""}` },
  ]
  return (
    <div className={column ? "flex flex-col gap-3 px-0.5" : "flex justify-around self-stretch"}>
      {lamps.map(({ caption, className }) => (
        <span key={caption} className={`flex items-center ${column ? "gap-2" : "flex-col gap-1.5"}`}>
          <span className={`cr-jewel ${className}`} />
          <span className="cr-caption">{caption}</span>
        </span>
      ))}
    </div>
  )
}

function ServiceNote({ className = "" }: { className?: string }) {
  return (
    <div className={`cr-paper px-3 pt-4 pb-3 text-xs leading-normal rotate-[1.5deg] ${className}`} aria-hidden="true">
      <span className="cr-tape w-[54px] left-1/2 -top-[9px] -ml-[27px] -rotate-[4deg]" />
      <div className="cr-form-line">Service record</div>
      <div className="cr-typed text-[13px]">VK-4 monitor</div>
      <div className="cr-typed text-[13px]">Checked 03.86</div>
    </div>
  )
}

function Louvres({ count, className = "" }: { count: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-[7px] ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="cr-louvre" />
      ))}
    </div>
  )
}

export default function ReactorCameraView({ radioactivity, reactorTemp, elapsedSeconds, clockStartMs, onBack }: ReactorCameraViewProps) {
  const interference = getInterferenceIntensity(radioactivity)
  const signal = signalStrength(interference)

  // Panel kit classes set their own display, which beats Tailwind's hidden, so a wrapper shows or hides each Back
  const back = (wrapper: string, height: string) => (
    <div className={wrapper}>
      <span className="cr-lens-bezel flex w-full">
        <button onClick={onBack} className={`cr-lens w-full ${height} px-5 text-lg lg:text-base`} aria-label="Back to the control panel">
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
      </span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a09] p-2.5 lg:p-3.5 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Reactor camera">
      <div className="cr-panel cr-screws min-h-full flex flex-col gap-3.5 lg:gap-[18px] px-3.5 pt-[18px] pb-4 lg:px-7 lg:py-[22px]">
        {/* Header: Back sits here on a large screen, at the bottom (where a thumb reaches) on a phone */}
        <div className="flex items-center gap-[18px]">
          {back("hidden lg:block", "h-[46px]")}
          <h1 className="cr-nameplate flex-1 text-center px-3 py-2 lg:py-2.5 text-[19px] lg:text-[26px]">Reactor Camera</h1>
          <div className="hidden lg:block">
            <span className="cr-plate w-32 !text-xs">CCTV · VK-4</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-3.5 lg:gap-6 min-h-0">
          {/* Left (large screen): read-only status */}
          <div className="cr-module hidden lg:flex w-[200px] xl:w-[220px] shrink-0 px-3.5 py-4 flex-col items-center gap-[18px]">
            <span className="cr-plate self-stretch">Status</span>
            <StatusLamps interference={interference} column={false} />
            <SignalMeter signal={signal} className="w-[170px] h-auto" />
            <span className="flex-1" />
            <span className="cr-grille w-[120px] h-[120px]" aria-hidden="true" />
            <span className="cr-caption">Talkback</span>
          </div>

          {/* The monitor, in a dark bay. On a large screen the bay sizes the square screen to whichever of its sides
              is shorter; on a phone it is as wide as the panel. */}
          <div className="cr-monitor-wall lg:flex-1 lg:min-h-[16rem] rounded-md p-2.5 lg:p-0 flex items-center justify-center lg:[container-type:size] shadow-[inset_0_3px_10px_#000,0_1px_0_rgba(255,255,255,0.45)]">
            <div className="w-full max-w-[34rem] lg:max-w-none lg:w-[min(100cqw_-_1.25rem,100cqh_-_3.5rem)]">
              <ReactorCamera radioactivity={radioactivity} reactorTemp={reactorTemp} elapsedSeconds={elapsedSeconds} clockStartMs={clockStartMs} />
            </div>
          </div>

          {/* Phone: the status lamps, meter and grille in one module under the monitor */}
          <div className="cr-module lg:hidden p-3 flex items-center gap-3">
            <StatusLamps interference={interference} column={true} />
            <SignalMeter signal={signal} className="w-[140px] h-auto shrink-0" />
            <span className="cr-grille w-[66px] h-[66px] shrink-0 ml-auto mr-1 [background-size:8px_8px,auto]" aria-hidden="true" />
          </div>

          {/* Right (large screen): no controls, only the panel's furniture */}
          <div className="cr-module hidden lg:flex w-[200px] xl:w-[220px] shrink-0 px-3.5 py-4 flex-col gap-4">
            <span className="cr-plate">Unit 4 · Hall</span>
            <Louvres count={7} className="px-2.5 py-1" />
            <ServiceNote className="mx-1.5 mt-2" />
            <span className="flex-1" />
            <div className="cr-blank h-[120px]" aria-hidden="true" />
          </div>
        </div>

        {/* Phone: vents, the service note, then Back */}
        <Louvres count={3} className="lg:hidden px-[60px] !gap-1.5" />
        <ServiceNote className="lg:hidden mx-auto w-[min(100%,15rem)] mt-1" />
        {back("lg:hidden", "h-[54px]")}
      </div>
    </div>
  )
}
