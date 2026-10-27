"use client"

import { useState, type ReactNode } from "react"
import { Cctv, Home, Pause, Play, Volume2, VolumeX } from "lucide-react"

import { type GameState, getShiftTime } from "@/lib/types"
import type { SoundEffect } from "@/lib/sound-cues"
import { formatTime, checkEventWarnings, checkWarnings, getWarningFlags } from "@/lib/game-utils"
import { isPowerOnTarget } from "@/lib/game-mechanics"
import { useRodDisplay } from "@/hooks/use-rod-display"
import { getCameraClockStartMs, getShiftElapsedSeconds } from "./reactor-camera"
import ReactorCameraView from "./reactor-camera-view"
import ControlRodsModal from "./control-rods-modal"
import WaterPumpsModal from "./water-pumps-modal"
import TurbineModal from "./turbine-modal"

interface ControlPanelProps {
  gameState: GameState
  onTogglePause: () => void
  updateGameState: (updates: Partial<GameState>) => void
  onHomeClick: () => void
  onSoundClick: () => void
  onSoundEffect: (effect: SoundEffect) => void // confirmations and AZ-5 (bible §15)
  logLampLit: boolean // a new shift-log message hasn't been seen yet
  onSeeWarnings: () => void
  onSeeLog: () => void
}

// The compact desk (owner, 2026-10-23, "machine keys"): a thin nameplate strip over one row of keys, the readings three
// across, then the three machines. It looks the same on every screen; the page keeps it narrow (DESK_WIDTH).

// An illuminated push key: the cap is the lamp (plan §21.5). Red flashes while any warning is active or a major event
// runs; amber while a new shift-log message is unseen. The lit layer is always mounted, so it keeps time with the
// nameplate lamps' flasher; a lit lamp only shows it.
function LampKey({ lit, colour, label, ariaLabel, onClick, className = "" }: { lit: boolean; colour: "red" | "amber"; label: string; ariaLabel: string; onClick: () => void; className?: string }) {
  return (
    <span className={`cr-bezel w-full ${className}`}>
      <button className={`cr-key cr-key-lamp cr-key-lamp-${colour} w-full h-8 px-2 !text-[0.75rem] !tracking-[0.08em]`} aria-label={ariaLabel} onClick={onClick}>
        <span aria-hidden="true" className={`cr-key-lit ${lit ? "on" : ""}`} />
        <span className="relative">{label}</span>
      </button>
    </span>
  )
}

// A readout bay: engraved plate above, instrument below. A reading that can warn has a red lens for its nameplate,
// lit from behind and flashing while the value is in a warning band (owner, 2026-10-23).
function Bay({ label, warn, className = "", children }: { label: string; warn?: boolean; className?: string; children: ReactNode }) {
  const lamp = warn !== undefined
  return (
    <div className={`cr-module min-w-0 p-1.5 flex flex-col gap-1.5 ${className}`}>
      <div className={`cr-plate cr-plate-compact ${lamp ? `cr-plate-lens ${warn ? "on" : ""}` : ""}`}>
        {label}
        {/* Always mounted, so every lamp's flasher keeps time with the others; a warning only shows it */}
        {lamp && (
          <span aria-hidden="true" className={`cr-plate-lit ${warn ? "on" : ""}`}>
            {label}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

// One machine: its status window above, and a key with its name that opens its controls
function Machine({ label, ariaLabel, disabled, onOpen, children }: { label: string; ariaLabel: string; disabled: boolean; onOpen: () => void; children: ReactNode }) {
  return (
    <div className="cr-module min-w-0 p-1.5 flex flex-col gap-1.5">
      {children}
      <span className="cr-bezel w-full">
        <button onClick={onOpen} disabled={disabled} aria-label={ariaLabel} className="cr-key w-full h-8 px-1 !text-[0.8rem] !tracking-[0.12em]">
          {label}
        </button>
      </span>
    </div>
  )
}

export default function ControlPanel({ gameState, onTogglePause, updateGameState, onHomeClick, onSoundClick, onSoundEffect, logLampLit, onSeeWarnings, onSeeLog }: ControlPanelProps) {
  const [rodsModalOpen, setRodsModalOpen] = useState(false)
  const [pumpsModalOpen, setPumpsModalOpen] = useState(false)
  const [turbineModalOpen, setTurbineModalOpen] = useState(false)
  const rodDisplay = useRodDisplay(gameState.controlRods)
  const [showReactorView, setShowReactorView] = useState(false)

  const isOnTarget = isPowerOnTarget(gameState)

  const hasWarnings = checkWarnings(gameState).length > 0 || checkEventWarnings(gameState).length > 0
  // A rod jam never ends, so its lamp comes from the jammed-rods warning instead (owner, 2026-10-16)
  const majorEvent = gameState.activeEvents.some((event) => event.type === "power-cut" || event.type === "pump-trip")

  // Same thresholds as the warning list in the message area
  const flags = getWarningFlags(gameState)
  const lowRadioactivityWarning = flags.lowRadioactivity
  const highRadioactivityWarning = flags.highRadioactivity
  const highReactorTempWarning = flags.highReactorTemp
  const highSteamWarning = flags.highSteam
  const lowSteamWarning = flags.lowSteam
  const highXenonWarning = flags.highXenon
  const lowFuelTempWarning = flags.lowFuelTemp

  const paused = gameState.isPaused
  const vfd = "font-mono font-bold vfd-display !px-1 !py-0.5 text-center text-sm"
  const led = "led-display !px-0 !py-1 text-center text-sm"
  const unit = <span className="text-[0.6rem] tracking-[0.1em] opacity-75 ml-1">MW</span>

  return (
    <div>
      <div className="cr-panel cr-screws p-3 space-y-2.5">
        {/* Header: the nameplate strip, then home, pause, the warning and message keys, camera and sound */}
        <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-x-1.5 gap-y-2.5">
          {/* Large capitals in the same strip: the fixed leading keeps the strip as tall as it was with 11px text */}
          <h1 className="cr-nameplate col-span-6 row-start-1 py-1 text-center text-[18px] leading-[16.5px] !tracking-[0.2em] whitespace-nowrap">
            Reactor Control System
          </h1>

          <span className="cr-bezel col-start-1 row-start-2">
            <button className="cr-key cr-key-cream w-[34px] h-8 px-0" title="Return to Menu" aria-label="Return to menu" onClick={onHomeClick}>
              <Home className="h-4 w-4" />
            </button>
          </span>
          <span className="cr-bezel col-start-6 row-start-2">
            <button className="cr-key cr-key-grey w-[34px] h-8 px-0" title="Sound Settings" aria-label="Sound settings" onClick={onSoundClick}>
              {gameState.alarmsEnabled || gameState.effectsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </span>

          <LampKey
            lit={hasWarnings || majorEvent}
            colour="red"
            label="Warning"
            ariaLabel="Show the alarm monitor"
            onClick={onSeeWarnings}
            className="col-start-3 row-start-2"
          />
          <LampKey
            lit={logLampLit}
            colour="amber"
            label="Message"
            ariaLabel="Show the shift log"
            onClick={onSeeLog}
            className="col-start-4 row-start-2"
          />

          {/* Pause lights while the simulation is paused */}
          <span className="cr-bezel col-start-2 row-start-2">
            <button
              onClick={onTogglePause}
              aria-label={paused ? "Resume" : "Pause"}
              className={`cr-key ${paused ? "cr-key-red-lit" : "cr-key-red [--cap-ink:#fecaca]"} w-[34px] h-8 px-0 !text-[0.75rem] !tracking-[0.08em]`}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
          </span>
          <span className="cr-bezel col-start-5 row-start-2">
            <button
              onClick={() => setShowReactorView(true)}
              aria-label="View the reactor camera"
              className="cr-key cr-key-teal w-[34px] h-8 px-0 !text-[0.75rem] !tracking-[0.08em]"
            >
              <Cctv className="h-4 w-4" />
            </button>
          </span>
        </div>

        {/* The readings, then the machines */}
        <div className="grid gap-2.5">
          <div className="grid grid-cols-3 gap-1.5">
            {/* Output and target on one meter, as a setpoint is shown beside its reading */}
            <Bay label="Power · Output / Target" className="col-span-2">
              <div className="cr-screen-bezel">
                <div className={`${led} grid grid-cols-2`}>
                  <span className={isOnTarget ? "led-green" : "text-red-500"}>
                    {Math.round(gameState.powerOutput)}
                    {unit}
                  </span>
                  <span className="led-amber border-l border-white/10">
                    {gameState.powerTarget !== null ? (
                      <>
                        {gameState.powerTarget}
                        {unit}
                      </>
                    ) : (
                      "N/A"
                    )}
                  </span>
                </div>
              </div>
            </Bay>

            <Bay label="Performance">
              {/* With no target, performance holds its value (Free mode stays at 100%; the Safety Test freezes it) */}
              <div className="cr-screen-bezel">
                <div className={`${led} ${gameState.performance >= 70 ? "led-green" : gameState.performance >= 40 ? "led-amber" : ""}`}>
                  {`${Math.round(gameState.performance)}%`}
                </div>
              </div>
            </Bay>

            <Bay label="Radioactivity" warn={lowRadioactivityWarning || highRadioactivityWarning}>
              <div className={vfd}>{Math.round(gameState.radioactivity)}</div>
            </Bay>

            <Bay label="Reactor Temp" warn={highReactorTempWarning}>
              <div className={vfd}>{Math.round(gameState.reactorTemp)}°</div>
            </Bay>

            <Bay label="Fuel Temp" warn={lowFuelTempWarning}>
              <div className={vfd}>{Math.round(gameState.fuelTemp)}°</div>
            </Bay>

            <Bay label="Steam" warn={highSteamWarning || lowSteamWarning}>
              <div className={vfd}>{Math.round(gameState.steamVolume)}</div>
            </Bay>

            <Bay label="Xenon" warn={highXenonWarning}>
              <div className={vfd}>{Math.round(gameState.xenon)}%</div>
            </Bay>

            <Bay label="Time">
              <div className="cr-screen-bezel">
                <div className={`${led} led-amber !text-[0.8rem]`}>{formatTime(gameState.gameTime)}</div>
              </div>
            </Bay>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {/* Water pumps: on (green) over powered (amber), one column per pump */}
            <Machine label="Pumps" ariaLabel="Manage the water pumps" disabled={paused} onOpen={() => !paused && setPumpsModalOpen(true)}>
              <div className="h-9 bg-black/80 border-2 border-neutral-800 rounded-md shadow-inner flex items-center justify-center">
                <div className="grid grid-cols-4 gap-x-1.5">
                  {gameState.waterPumps.map((pump, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5 items-center">
                      <div className={`retro-lamp w-2.5 h-2.5 rounded-full ${pump.on ? "bg-emerald-400 text-emerald-400 on" : "bg-emerald-900/20"}`} />
                      <div className={`retro-lamp w-2.5 h-2.5 rounded-full ${pump.powered ? "bg-amber-400 text-amber-400 on" : "bg-amber-900/20"}`} />
                    </div>
                  ))}
                </div>
              </div>
            </Machine>

            {/* Control rods: each rod's insertion on the VFD (0% at the top), the ten bars across its full width */}
            <Machine label="Rods" ariaLabel="Manage the control rods" disabled={paused} onOpen={() => !paused && setRodsModalOpen(true)}>
              <div className={`h-9 vfd-display !px-0 !py-0.5 w-full relative flex flex-col justify-between`}>
                <div className="w-full border-t-2 border-black/60 h-0"></div>
                <div className="absolute left-1 right-1 top-1 bottom-1 flex justify-between">
                  {gameState.controlRods.map((rod, idx) => (
                    <div key={rod.id} className="relative w-full h-full">
                      <div
                        className={`
                          absolute left-[10%] right-[10%] h-[2px] bg-black transition-all duration-1000 ease-linear
                          ${rod.stuck ? "animate-[pulse_0.5s_ease-in-out_infinite]" : ""}
                        `}
                        style={{
                          // Position based on the rod's actual (travelling) insertion %, held back until the drive sound starts.
                          // 0% is top, 100% is bottom.
                          top: `${rodDisplay[idx].insertion}%`,
                          transform: "translateY(-50%)", // Centers the bar on the exact % point
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="w-full border-b-2 border-black/60 h-0"></div>
              </div>
            </Machine>

            {/* Turbine: on the grid (green), over-pressure (red, flashing at steam 300 and above), feeding the pumps (amber) */}
            <Machine label="Turbine" ariaLabel="Manage the turbine" disabled={paused} onOpen={() => !paused && setTurbineModalOpen(true)}>
              <div className={`h-9 bg-black/80 border-2 border-neutral-800 rounded-md shadow-inner flex items-center justify-center gap-1.5`}>
                <div className="flex flex-col gap-1 items-center">
                  <div className={`retro-lamp w-2.5 h-2.5 rounded-full ${gameState.turbineConnected ? "bg-emerald-400 text-emerald-400 on shadow-[0_0_10px_currentColor]" : "bg-emerald-900/20"}`} />
                  <span className="text-[7.5px] font-mono text-neutral-500 leading-none">CONN</span>
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <div
                    className={`retro-lamp w-2.5 h-2.5 rounded-full transition-all ${
                      highSteamWarning ? "bg-red-500 text-red-500 on animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_15px_currentColor]" : "bg-red-950/20"
                    }`}
                  />
                  <span className="text-[7.5px] font-mono text-neutral-500 leading-none">OVR-P</span>
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <div className={`retro-lamp w-2.5 h-2.5 rounded-full ${gameState.turbineMode === "pumps" ? "bg-amber-400 text-amber-400 on shadow-[0_0_10px_currentColor]" : "bg-amber-900/20"}`} />
                  <span className="text-[7.5px] font-mono text-neutral-500 leading-none">PUMPS</span>
                </div>
              </div>
            </Machine>
          </div>
        </div>
      </div>
      {/* Modals */}
      <ControlRodsModal
        open={rodsModalOpen}
        onOpenChange={setRodsModalOpen}
        controlRods={gameState.controlRods}
        onUpdate={(rods, az5) => {
          updateGameState(az5 ? { controlRods: rods, az5PressedAt: getShiftTime(gameState) } : { controlRods: rods })
          onSoundEffect(az5 ? "az5" : "rodConfirm")
        }}
      />

      <WaterPumpsModal
        open={pumpsModalOpen}
        onOpenChange={setPumpsModalOpen}
        waterPumps={gameState.waterPumps}
        onUpdate={(pumps) => {
          updateGameState({ waterPumps: pumps })
          onSoundEffect("pumpConfirm")
        }}
      />

      <TurbineModal
        open={turbineModalOpen}
        onOpenChange={setTurbineModalOpen}
        turbineMode={gameState.turbineMode}
        onUpdate={(mode) => {
          updateGameState({ turbineMode: mode, turbineConnected: mode === "grid" })
          onSoundEffect("turbineConfirm")
        }}
      />

      {/* Fullscreen reactor view: the camera in its own control panel */}
      {showReactorView && (
        <ReactorCameraView
          radioactivity={gameState.radioactivity}
          reactorTemp={gameState.reactorTemp}
          elapsedSeconds={getShiftElapsedSeconds(gameState.gameTime, gameState.timeLimit, gameState.mode)}
          clockStartMs={getCameraClockStartMs(gameState.mode)}
          onBack={() => setShowReactorView(false)}
        />
      )}
    </div>
  )
}
