"use client"

import { useState } from "react"

import type { GameState } from "@/lib/types"
import { formatTime } from "@/lib/game-utils"
import { checkWarnings } from "@/lib/game-utils"
import { Button } from "@/components/ui/button"
import { Pause, Play } from "lucide-react"

interface ControlPanelProps {
  gameState: GameState
  onTogglePause: () => void
}

export default function ControlPanel({ gameState, onTogglePause }: ControlPanelProps) {
  const [rodsModalOpen, setRodsModalOpen] = useState(false)
  const [pumpsModalOpen, setPumpsModalOpen] = useState(false)
  const [turbineModalOpen, setTurbineModalOpen] = useState(false)



  const powerTolerance = 0.1 // 10%
  const lowerBound = gameState.powerTarget * (1 - powerTolerance)
  const upperBound = gameState.powerTarget * (1 + powerTolerance)
  const isOnTarget = gameState.powerOutput >= lowerBound && gameState.powerOutput <= upperBound

  const warnings = checkWarnings(gameState)
  const hasWarnings = warnings.length > 0

  const lowRadioactivityWarning = gameState.radioactivity < 50
  const highRadioactivityWarning = gameState.radioactivity > 250
  const highReactorTempWarning = gameState.reactorTemp > 800
  const highSteamWarning = gameState.steamVolume > 300
  const lowSteamWarning = gameState.steamVolume <= 0
  const lowPerformanceWarning = gameState.performance < 30
  const highXenonWarning = gameState.xenon > 50
  const lowFuelTempWarning = gameState.fuelTemp < 49



  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-card border-4 border-primary p-4 md:p-6 space-y-4">
        {/* Title with Warning Lights */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4">
            <div
              className={`w-4 h-4 md:w-6 md:h-6 rounded-full transition-all flex-shrink-0 border-red-900 border-2 ${
                hasWarnings ? "bg-red-600 animate-warning-flash" : "bg-red-900"
              }`}
            />

            <h1 className="text-2xl md:text-3xl font-bold font-mono uppercase tracking-wider">
              Reactor Control System
            </h1>

            <div
              className={`w-4 h-4 md:w-6 md:h-6 rounded-full transition-all flex-shrink-0 border-red-900 border-2 ${
                hasWarnings ? "bg-red-600 animate-warning-flash" : "bg-red-900"
              }`}
            />
          </div>
        </div>

        {/* Main Readouts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Current Power Output */}
          <div className="bg-background border-3 border-border p-3 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Power Output</div>
            <div className={`!pl-0 !pr-0 text-center led-display text-sm md:text-lg ${isOnTarget ? "led-green" : "text-red-500"}`}>
              {Math.round(gameState.powerOutput)} MW
            </div>
          </div>

          {/* Power Target */}
          <div className="bg-background border-3 border-border p-3 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Power Target</div>
            <div className="!pl-0 !pr-0 text-center led-display led-amber text-sm md:text-lg">{gameState.powerTarget} MW</div>
          </div>

          <div className={"bg-background p-3 space-y-1 transition-all border-3 border-border"}>
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Performance</div>
            <div
              className={`!pl-0 !pr-0 text-center led-display text-sm md:text-lg ${
                gameState.performance >= 70 ? "led-green" : gameState.performance >= 40 ? "led-amber" : ""
              }`}
            >
              {Math.round(gameState.performance)}%
            </div>
          </div>

          {/* Time */}
          <div className="bg-background border-3 border-border p-3 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Time</div>
            <div className="!pl-0 !pr-0 text-center led-display led-amber text-sm md:text-lg">{formatTime(gameState.gameTime)}</div>
          </div>
        </div>

        {/* Secondary Readouts */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 text-sm">
          <div
            className={`bg-background p-2 space-y-1 transition-all ${
              lowRadioactivityWarning || highRadioactivityWarning
                ? "border-3 border-red-600 animate-border-flash"
                : "border-3 border-border"
            }`}
          >
            <div className="text-xs text-muted-foreground font-mono uppercase">Radioactivity</div>
            <div className="font-mono vfd-display">{Math.round(gameState.radioactivity)}</div>
          </div>

          <div
            className={`bg-background p-2 space-y-1 transition-all ${
              highReactorTempWarning ? "border-3 border-red-600 animate-border-flash" : "border-3 border-border"
            }`}
          >
            <div className="text-xs text-muted-foreground font-mono uppercase">Reactor Temp</div>
            <div className="font-mono font-bold vfd-display">{Math.round(gameState.reactorTemp)}°</div>
          </div>

          <div
            className={`bg-background p-2 space-y-1 transition-all ${
              lowFuelTempWarning ? "border-3 border-red-600 animate-border-flash" : "border-3 border-border"
            }`}
          >
            <div className="text-xs text-muted-foreground font-mono uppercase">Fuel Temperature</div>
            <div className="font-mono font-bold vfd-display">{Math.round(gameState.fuelTemp)}°</div>
          </div>

          <div
            className={`bg-background p-2 space-y-1 transition-all ${
              highSteamWarning || lowSteamWarning ? "border-3 border-red-600 animate-border-flash" : "border-3 border-border"
            }`}
          >
            <div className="text-xs text-muted-foreground font-mono uppercase">Steam</div>
            <div className="font-mono font-bold vfd-display">{Math.round(gameState.steamVolume)}</div>
          </div>

          <div
            className={`bg-background p-2 space-y-1 transition-all ${
              highXenonWarning ? "border-3 border-red-600 animate-border-flash" : "border-3 border-border"
            }`}
          >
            <div className="text-xs text-muted-foreground font-mono uppercase">Xenon</div>
            <div className="font-mono font-bold vfd-display">{Math.round(gameState.xenon)}%</div>
          </div>
        </div>  


        

        {/* Control panel buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 bg-neutral-900 rounded-lg border-4 border-neutral-800">

              {/* --- 1. PAUSE BUTTON (State Dependent Color & Glow) --- */}
              <button
                onClick={onTogglePause}
                className={`
                  btn-retro w-full h-32 flex flex-col items-center justify-center rounded-md border border-white/5
                  ${gameState.isPaused 
                    ? "shadow-[0_0_20px_rgba(220,38,38,0.6)] border-red-500/50" // External red glow when paused
                    : ""
                  }
                `}
              >
                <div className="text-xs text-neutral-400 font-mono mb-2 tracking-widest uppercase">Sys. Pause</div>

                {/* The Physical Light/Button Face */}
                <div 
                  className={`
                    w-16 h-16 rounded flex items-center justify-center transition-colors duration-200 border-2
                    ${gameState.isPaused 
                      ? "bg-red-600 border-red-400 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]" // Lit state
                      : "bg-red-900/40 border-red-900/60" // Dim state
                    }
                  `}
                >
                  <span className={`font-bold font-mono text-lg ${gameState.isPaused ? "text-white drop-shadow-md" : "text-red-900/50"}`}>
                    {gameState.isPaused ? "HALT" : "RUN"}
                  </span>
                </div>
              </button>


              {/* --- 2. WATER PUMPS (Indicator Array) --- */}
              <button
                onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
                disabled={gameState.isPaused}
                className="btn-retro w-full h-32 flex flex-col items-center justify-between py-3 px-2 rounded-md border border-white/5 bg-neutral-800"
              >
                <div className="text-xs text-neutral-400 font-mono tracking-widest uppercase">Pumps</div>

                {/* The Lamp Grid */}
                <div className="grid grid-cols-4 gap-x-3 gap-y-2 p-2 bg-black/40 rounded inset-shadow">

                  {gameState.waterPumps.map((pump, idx) => (
                    <div key={idx} className="flex flex-col gap-2 items-center">
                      {/* Top Row: Pump ON (Green/Emerald) */}
                      <div 
                        className={`
                          retro-lamp w-4 h-4 rounded-full
                          ${pump.on 
                            ? "bg-emerald-400 text-emerald-400 on" // Bright/Glow
                            : "bg-emerald-900/30" // Dim
                          }
                        `} 
                      />

                      {/* Bottom Row: Pump POWERED (Amber/Yellow) */}
                      <div 
                        className={`
                          retro-lamp w-4 h-4 rounded-full
                          ${pump.powered 
                            ? "bg-amber-400 text-amber-400 on" 
                            : "bg-amber-900/30"
                          }
                        `} 
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-neutral-500 font-mono">STATUS / PWR</div>
              </button>


              {/* --- 3. CONTROL RODS (Standard Industrial Button) --- */}
              <button
                onClick={() => !gameState.isPaused && setRodsModalOpen(true)}
                disabled={gameState.isPaused}
                className="btn-retro w-full h-32 flex flex-col items-center justify-center rounded-md border border-white/5 group"
              >
                <div className="text-xs text-neutral-400 font-mono mb-3 tracking-widest uppercase">Core Rods</div>

              </button>


              {/* --- 4. TURBINE (Toggle Switch Style) --- */}
              <button
                onClick={() => !gameState.isPaused && setTurbineModalOpen(true)}
                disabled={gameState.isPaused}
                className="btn-retro w-full h-32 flex flex-col items-center justify-center rounded-md border border-white/5 relative overflow-hidden"
              >
              </button>

            </div>

         {/* Pause Button */}
         <div className="flex justify-center pt-2">
           <Button
             onClick={onTogglePause}
             size="lg"
             variant={gameState.isPaused ? "default" : "outline"}
             className="uppercase font-mono tracking-wider px-8 border-2 border-primary"
           >
             {gameState.isPaused ? (
               <>
                 <Play className="mr-2 h-5 w-5" />
                 Resume
               </>
             ) : (
               <>
                 <Pause className="mr-2 h-5 w-5" />
                 Pause
               </>
             )}
           </Button>
         </div>
      </div>
    </div>
  )
}
