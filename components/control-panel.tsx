"use client"

import { useState, type ReactNode } from "react"
import { ArrowLeft, Cctv, Home, Volume2, VolumeX } from "lucide-react"

import { type GameState, getShiftTime } from "@/lib/types"
import type { SoundEffect } from "@/lib/sound-cues"
import { formatTime, checkEventWarnings, checkWarnings, getWarningFlags } from "@/lib/game-utils"
import { isPowerOnTarget } from "@/lib/game-mechanics"
import { useRodDisplay } from "@/hooks/use-rod-display"
import ReactorCamera, { getCameraClockStartMs, getShiftElapsedSeconds } from "./reactor-camera"
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

// A header lamp with the key beside it that brings its machine into view (plan §21.5). The red lamp flashes while
// any warning is active or a major event runs; the amber one while a new shift-log message is unseen.
function Annunciator({ lit, colour, label, ariaLabel, onClick }: { lit: boolean; colour: "red" | "amber"; label: string; ariaLabel: string; onClick: () => void }) {
  const on = colour === "red" ? "bg-red-500 text-red-500" : "bg-amber-400 text-amber-400"
  const off = colour === "red" ? "bg-red-950/30" : "bg-amber-950/30"
  return (
    <div className="flex items-center justify-center gap-2 min-w-0">
      <span className="cr-lamp-bezel">
        <span
          aria-hidden="true"
          className={`retro-lamp block w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all ${lit ? `${on} on animate-[pulse_0.8s_ease-in-out_infinite] motion-reduce:animate-none shadow-[0_0_15px_currentColor]` : off}`}
        />
      </span>
      <span className="cr-bezel">
        <button className={`cr-key ${colour === "red" ? "cr-key-maroon" : "cr-key-mustard"} h-9 px-2.5 sm:px-3 !text-[0.72rem] sm:!text-[0.8rem] !tracking-[0.1em]`} aria-label={ariaLabel} onClick={onClick}>
          {label}
        </button>
      </span>
    </div>
  )
}

// A readout bay: engraved plate above, instrument below. Flashes red while its value is in a warning band.
function Bay({ label, warn = false, className = "", children }: { label: string; warn?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`cr-module p-2 md:p-2.5 space-y-2 transition-all ${warn ? "!border-red-600 animate-border-flash" : ""} ${className}`}>
      <div className="cr-plate">{label}</div>
      {children}
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

  return (
    <div className="@container max-w-6xl mx-auto">
      <div className="cr-panel cr-screws p-3 sm:p-4 md:p-6 space-y-3 md:space-y-4">
        {/* Header: menu keys, nameplate, then the warning and shift-log lamps with the keys that bring each machine
            into view (plan §21.5). A wide panel (60rem+, measured on the panel, so it holds when the side columns sit
            beside it): one row, both keys on the left. Narrower: home, nameplate and sound (so the nameplate stays
            centred), then the two lamps. The key group is `contents` when narrower so each key is placed in the grid
            on its own. */}
        <div className="grid grid-cols-[auto_1fr_auto] @min-[60rem]:grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-3">
          <div className="contents @min-[60rem]:flex @min-[60rem]:col-start-1 @min-[60rem]:row-start-1 items-center gap-2">
            <span className="cr-bezel col-start-1 row-start-1">
              <button className="cr-key cr-key-cream size-9" title="Return to Menu" aria-label="Return to menu" onClick={onHomeClick}>
                <Home className="h-[18px] w-[18px]" />
              </button>
            </span>
            <span className="cr-bezel col-start-3 row-start-1 justify-self-end">
              <button className="cr-key cr-key-grey size-9" title="Sound Settings" aria-label="Sound settings" onClick={onSoundClick}>
                {gameState.alarmsEnabled || gameState.effectsEnabled ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
              </button>
            </span>
          </div>

          <div className="col-start-2 row-start-1 flex justify-center min-w-0">
            <h1 className="cr-nameplate px-3 py-2 md:px-6 md:py-2.5 text-[13px] !tracking-[0.12em] min-[400px]:text-sm sm:text-lg sm:!tracking-[0.2em] md:text-2xl @min-[68rem]:text-3xl whitespace-nowrap">
              Reactor Control System
            </h1>
          </div>

          <div className="col-span-3 row-start-2 @min-[60rem]:col-span-1 @min-[60rem]:col-start-3 @min-[60rem]:row-start-1 grid grid-cols-2 @min-[60rem]:flex @min-[60rem]:justify-end items-center gap-2 @min-[60rem]:gap-4">
            <Annunciator lit={hasWarnings || majorEvent} colour="red" label="See Warning" ariaLabel="Show the alarm monitor" onClick={onSeeWarnings} />
            <Annunciator lit={logLampLit} colour="amber" label="See Message" ariaLabel="Show the shift log" onClick={onSeeLog} />
          </div>
        </div>

        {/* Main Readouts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {/* Current Power Output */}
          <Bay label="Power Output">
            <div className="cr-screen-bezel">
              <div
                className={`!pl-0 !pr-0 text-center led-display text-sm md:text-lg ${isOnTarget ? "led-green" : "text-red-500"}`}
              >
                {Math.round(gameState.powerOutput)} MW
              </div>
            </div>
          </Bay>

          {/* Power Target */}
          <Bay label="Power Target">
            <div className="cr-screen-bezel">
              <div className="!pl-0 !pr-0 text-center led-display led-amber text-sm md:text-lg">
                {gameState.powerTarget !== null ? `${gameState.powerTarget} MW` : "N/A"}
              </div>
            </div>
          </Bay>

          <Bay label="Performance">
            {/* With no target, performance holds its value (Free mode stays at 100%; the Safety Test freezes it) */}
            <div className="cr-screen-bezel">
              <div
                className={`!pl-0 !pr-0 text-center led-display text-sm md:text-lg ${
                  gameState.performance >= 70 ? "led-green" : gameState.performance >= 40 ? "led-amber" : ""
                }`}
              >
                {`${Math.round(gameState.performance)}%`}
              </div>
            </div>
          </Bay>

          {/* Time */}
          <Bay label="Time">
            <div className="cr-screen-bezel">
              <div className="!pl-0 !pr-0 text-center led-display led-amber text-sm md:text-lg">
                {formatTime(gameState.gameTime)}
              </div>
            </div>
          </Bay>
        </div>

        {/* Secondary Readouts */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 text-sm">
          <Bay label="Radioactivity" warn={lowRadioactivityWarning || highRadioactivityWarning}>
            <div className="font-mono vfd-display">{Math.round(gameState.radioactivity)}</div>
          </Bay>

          <Bay label="Reactor Temp" warn={highReactorTempWarning}>
            <div className="font-mono font-bold vfd-display">{Math.round(gameState.reactorTemp)}°</div>
          </Bay>

          <Bay label="Fuel Temp" warn={lowFuelTempWarning}>
            <div className="font-mono font-bold vfd-display">{Math.round(gameState.fuelTemp)}°</div>
          </Bay>

          <Bay label="Steam" warn={highSteamWarning || lowSteamWarning}>
            <div className="font-mono font-bold vfd-display">{Math.round(gameState.steamVolume)}</div>
          </Bay>

          <Bay label="Xenon" warn={highXenonWarning}>
            <div className="font-mono font-bold vfd-display">{Math.round(gameState.xenon)}%</div>
          </Bay>

          {/* Reactor view key */}
          <Bay label="CCTV" className="flex flex-col">
            <span className="cr-bezel w-full flex-1">
              <button onClick={() => setShowReactorView(true)} className="cr-key cr-key-teal w-full min-h-8 !text-[0.78rem] !tracking-[0.12em]">
                <Cctv className="w-4 h-4" />
                View Reactor
              </button>
            </span>
          </Bay>
        </div>

        {/* Control panel buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 text-sm">
          {/* PAUSE BUTTON  -  LED SCREEN */}

          <div className="cr-module p-2 md:p-2.5 flex flex-col gap-2 min-h-[13rem]">
            {/* Top Section: Label & Status Text */}
            <div className="space-y-2">
              <div className="cr-plate">Simulation</div>
              {/* A small "screen" showing current status */}
              <div className="cr-screen-bezel">
                <div className="led-display !px-2 md:!px-4 text-center h-16 flex items-center justify-center">
                  <span
                    className={`!pl-0 !pr-0 text-center text-sm md:text-lg whitespace-nowrap ${gameState.isPaused ? "text-red-500" : "led-green"}`}
                  >
                    {gameState.isPaused ? "• PAUSED •" : "RUNNING..."}
                  </span>
                </div>
              </div>
            </div>

            {/* PAUSE BUTTON  -  The Physical Button */}
            <div className="w-full flex-1 flex items-center justify-center">
              <span className="cr-bezel">
                <button
                  onClick={onTogglePause}
                  className={`cr-key w-32 h-12 ${gameState.isPaused ? "cr-key-red-lit" : "cr-key-red"}`}
                >
                  {gameState.isPaused ? "RESUME" : "PAUSE"}
                </button>
              </span>
            </div>
          </div>

          {/* WATER PUMPS (Lights Above, Button Below)*/}

          <div className="cr-module p-2 md:p-2.5 flex flex-col gap-2 min-h-[13rem]">
            {/* Top Section: Label & Lights Grid */}
            <div className="space-y-2">
              <div className="cr-plate">Water Pumps</div>

              {/* The Lamp Grid Container */}
              <div className="bg-black/80 border-2 border-neutral-800 rounded-md p-2 shadow-inner h-16 flex items-center justify-center">
                {/* NEW FLEX WRAPPER: Holds Labels (Left) and Grid (Right) */}
                <div className="flex items-center gap-4">
                  {/* 1. The Labels Column */}
                  <div className="flex flex-col gap-3 text-right">
                    {/* Top Label (Aligns with Pump ON) */}
                    <span className="text-[9px] font-mono text-neutral-500 leading-3">ON</span>

                    {/* Bottom Label (Aligns with Pump POWERED) */}
                    <span className="text-[9px] font-mono text-neutral-500 leading-3">PWR</span>
                  </div>

                  {/* 2. The Existing Lights Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {gameState.waterPumps.map((pump, idx) => (
                      <div key={idx} className="flex flex-col gap-3 items-center">
                        {/* Top Row: Pump ON */}
                        <div
                          className={`
                              retro-lamp w-3 h-3 rounded-full
                              ${pump.on ? "bg-emerald-400 text-emerald-400 on" : "bg-emerald-900/20"}
                            `}
                        />

                        {/* Bottom Row: Pump POWERED */}
                        <div
                          className={`
                              retro-lamp w-3 h-3 rounded-full
                              ${pump.powered ? "bg-amber-400 text-amber-400 on" : "bg-amber-900/20"}
                            `}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: The Physical Button */}
            <div className="w-full flex-1 flex items-center justify-center">
              <span className="cr-bezel">
                <button
                  data-manage
                  onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
                  disabled={gameState.isPaused}
                  className="cr-key w-32 h-12"
                >
                  MANAGE
                </button>
              </span>
            </div>
          </div>

          {/* CONTROL RODS (Display Top, Button/Light Bottom) */}

          <div className="cr-module p-2 md:p-2.5 flex flex-col gap-2 min-h-[13rem]">
            {/* Top Section: Label & VFD Display Screen */}
            <div className="space-y-2 w-full">
              <div className="cr-plate">Control Rods</div>

              {/* VFD Green Screen */}
              <div className="vfd-display h-16 w-full relative flex flex-col justify-between py-1">
                <div className="w-full border-t-2 border-black/60 h-0"></div>
                {/* Rod Indicators Container */}
                <div className="absolute inset-y-0 left-3 right-3 top-1 bottom-1 flex justify-between">
                  {gameState.controlRods.map((rod, idx) => (
                    <div key={rod.id} className="relative w-full h-full border-r border-black/5 last:border-r-0">
                      <div
                        className={`
                          absolute w-full text-center font-bold leading-none text-xs transition-all duration-1000 ease-linear
                          ${rod.stuck ? "animate-[pulse_0.5s_ease-in-out_infinite]" : ""}
                        `}
                        style={{
                          // Position based on the rod's actual (travelling) insertion %, held back until the drive sound starts.
                          // 0% is top, 100% is bottom. We clamp slightly to keep it inside the lines.
                          top: `${rodDisplay[idx].insertion}%`,
                          transform: "translateY(-50%)", // Centers the dash on the exact % point
                        }}
                      >
                        -
                      </div>
                    </div>
                  ))}
                </div>

                <div className="w-full border-b-2 border-black/60 h-0"></div>
              </div>
            </div>

            {/* Bottom Section: Button (Left) & Warning Light (Right) */}
            <div className="w-full flex-1 flex items-center justify-between gap-3">
              {/* The Button */}
              <span className="cr-bezel flex-1 min-w-0 max-w-[8.5rem]">
                <button
                  data-manage
                  onClick={() => !gameState.isPaused && setRodsModalOpen(true)}
                  disabled={gameState.isPaused}
                  className="cr-key w-full h-12"
                >
                  MANAGE
                </button>
              </span>

              {/* The Status Light */}
              <div className="flex flex-col items-center justify-center gap-1 pr-2">
                <div className="p-1.5 rounded-full border border-white/10 shadow-inner">
                  <div
                    className={`
                      retro-lamp w-5 h-5 rounded-full transition-all duration-300
                      ${
                        gameState.controlRods.some((r) => r.stuck)
                          ? "bg-red-500 text-red-500 on animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_15px_currentColor]"
                          : "bg-red-950/30"
                      }
                    `}
                  />
                </div>
                <span className="text-[8px] font-mono text-neutral-500 tracking-widest">JAM</span>
              </div>
            </div>
          </div>

          {/* 4. TURBINE (2 Lights Top, Toggle Bottom)   */}

          <div className="cr-module p-2 md:p-2.5 flex flex-col gap-2 min-h-[13rem]">
            {/* Top Section: Label & Status Lights */}
            <div className="space-y-2 w-full">
              <div className="cr-plate">Turbine</div>

              {/* The Lamp Display Container */}
              <div className="bg-black/80 border-2 border-neutral-800 rounded-md p-2 shadow-inner h-16 flex items-center justify-center">
                <div className="flex gap-5">
                  {/* Light 1: Connection Status (Green) */}
                  <div className="flex flex-col gap-1.5 items-center">
                    <div
                      className={`
                                retro-lamp w-4 h-4 rounded-full
                                ${
                                  gameState.turbineConnected
                                    ? "bg-emerald-400 text-emerald-400 on shadow-[0_0_10px_currentColor]"
                                    : "bg-emerald-900/20"
                                }
                              `}
                    />
                    <span className="text-[9px] font-mono text-neutral-500">CONN</span>
                  </div>

                  {/* Light 2: High Steam Warning (Red Flashing) */}
                  {/* Logic: Flashes if steam is 'High' (at or above 300) */}
                  <div className="flex flex-col gap-1.5 items-center">
                    <div
                      className={`
                                retro-lamp w-4 h-4 rounded-full transition-all
                                ${
                                  highSteamWarning
                                    ? "bg-red-500 text-red-500 on animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_15px_currentColor]"
                                    : "bg-red-950/20"
                                }
                              `}
                    />
                    <span className="text-[9px] font-mono text-neutral-500">OVR-P</span>
                  </div>

                  {/* Light 3: Turbine supplying station pumps (Amber) */}
                  <div className="flex flex-col gap-1.5 items-center">
                    <div
                      className={`
                                retro-lamp w-4 h-4 rounded-full
                                ${
                                  gameState.turbineMode === "pumps"
                                    ? "bg-amber-400 text-amber-400 on shadow-[0_0_10px_currentColor]"
                                    : "bg-amber-900/20"
                                }
                              `}
                    />
                    <span className="text-[9px] font-mono text-neutral-500">PUMPS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: The Physical Button */}
            <div className="w-full flex-1 flex items-center justify-center">
              <span className="cr-bezel">
                <button
                  data-manage
                  onClick={() => !gameState.isPaused && setTurbineModalOpen(true)}
                  disabled={gameState.isPaused}
                  className="cr-key w-32 h-12"
                >
                  MANAGE
                </button>
              </span>
            </div>
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

      {/* Fullscreen reactor view modal */}
      {showReactorView && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Back button */}
          <div className="absolute top-4 left-4 z-10">
            <span className="cr-bezel">
              <button onClick={() => setShowReactorView(false)} className="cr-key cr-key-black h-10 px-3" aria-label="Back to the control panel">
                <ArrowLeft className="h-5 w-5" />
                Back
              </button>
            </span>
          </div>

          {/* Reactor view (security camera) */}
          <ReactorCamera
            variant="fullscreen"
            radioactivity={gameState.radioactivity}
            reactorTemp={gameState.reactorTemp}
            elapsedSeconds={getShiftElapsedSeconds(gameState.gameTime, gameState.timeLimit, gameState.mode)}
            clockStartMs={getCameraClockStartMs(gameState.mode)}
          />
        </div>
      )}
    </div>
  )
}
