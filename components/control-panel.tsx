"use client"

import { useState } from "react"

import type { GameState } from "@/lib/types"
import { formatTime } from "@/lib/game-utils"
import { checkWarnings } from "@/lib/game-utils"
import { Button } from "@/components/ui/button"
import { Pause, Play } from "lucide-react"
import ControlRodsModal from "./control-rods-modal"
import WaterPumpsModal from "./water-pumps-modal"
import TurbineModal from "./turbine-modal"

interface ControlPanelProps {
  gameState: GameState
  onTogglePause: () => void
  updateGameState: (updates: Partial<GameState>) => void
  onEnabledUpdate: (soundEnabled: boolean) => void
}

export default function ControlPanel({ gameState, onTogglePause, updateGameState, onEnabledUpdate }: ControlPanelProps) {
  const [rodsModalOpen, setRodsModalOpen] = useState(false)
  const [pumpsModalOpen, setPumpsModalOpen] = useState(false)
  const [turbineModalOpen, setTurbineModalOpen] = useState(false)



  const powerTolerance = 0.1 // 10%
  const lowerBound = gameState.powerTarget * (1 - powerTolerance)
  const upperBound = gameState.powerTarget * (1 + powerTolerance)
  const isOnTarget = gameState.powerOutput >= lowerBound && gameState.powerOutput <= upperBound

  const warnings = checkWarnings(gameState)
  const hasWarnings = warnings.length > 0
  const majorEvent = gameState.activeEvents.some((event) => 
    event.type === "power-cut" || event.type === "rod-stuck"
  )

  const lowRadioactivityWarning = gameState.radioactivity < 50
  const highRadioactivityWarning = gameState.radioactivity > 250
  const highReactorTempWarning = gameState.reactorTemp > 800
  const highSteamWarning = gameState.steamVolume > 300
  const lowSteamWarning = gameState.steamVolume <= 0
  const lowPerformanceWarning = gameState.performance < 30
  const highXenonWarning = gameState.xenon > 50
  const lowFuelTempWarning = gameState.fuelTemp < 49

  const currentlyPaused = gameState.isPaused

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-card border-4 border-primary p-4 md:p-6 space-y-4">
        {/* Title with Warning Lights */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-4">
            <div className={`retro-lamp w-5 h-5 rounded-full transition-all flex-shrink-0 ${hasWarnings || majorEvent ? "bg-red-500 text-red-500 on animate-[pulse_0.8s_ease-in-out_infinite] shadow-[0_0_15px_currentColor]" : "bg-red-950/30"}`}/>
            <h1 className="text-lg md:text-3xl font-bold font-mono uppercase tracking-wider">
              Reactor Control System
            </h1>
            <div className={`retro-lamp w-5 h-5 rounded-full transition-all flex-shrink-0 ${hasWarnings || majorEvent ? "bg-red-500 text-red-500 on animate-[pulse_0.8s_ease-in-out_infinite] shadow-[0_0_15px_currentColor]" : "bg-red-950/30"}`}/>
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
            <div className="text-xs text-muted-foreground font-mono uppercase">Fuel Temp</div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 text-sm">

            {/* PAUSE BUTTON  -  LED SCREEN */}

            <div className="bg-background border-3 border-border p-3 flex flex-col h-48">

              {/* Top Section: Label & Status Text */}
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  PAUSE SIMULATION
                </div>
                {/* A small "screen" showing current status */}
                <div className="led-display text-center h-16 flex items-center justify-center">
                  <span className={`!pl-0 !pr-0 text-center text-sm md:text-lg ${gameState.isPaused ? "text-red-500" : "led-green"}`}>
                    {gameState.isPaused ? "• PAUSED •" : "RUNNING..."}
                  </span>
                </div>
              </div>

              {/* PAUSE BUTTON  -  The Physical Button */}
              <div className="w-full flex-1 flex items-center justify-center">
                <button
                  onClick={() => {
                    onEnabledUpdate(currentlyPaused ? true : false)
                    onTogglePause()
                  }}
                  className={`
                    w-32 h-12 mx-auto font-mono font-bold text-sm tracking-wider rounded transition-all duration-100
                    border-t border-white/20 flex items-center justify-center
                    active:translate-y-[4px] active:shadow-none
                    ${gameState.isPaused 
                      ? "bg-red-600 text-white shadow-[0_4px_0_#7f1d1d] shadow-red-500/40" 
                      : "bg-[#5a1a1a] text-red-200/30 shadow-[0_4px_0_#360f0f]"
                    }
                  `}
                >
                  {gameState.isPaused ? "RESUME" : "PAUSE"}
                </button>
              </div>
            </div>


       {/* WATER PUMPS (Lights Above, Button Below)*/}

       <div className="bg-background border-3 border-border p-3 flex flex-col h-48">

           {/* Top Section: Label & Lights Grid */}
           <div className="space-y-2">
               <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                 WATER PUMPS
               </div>

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
                <button
                 onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
                 disabled={gameState.isPaused}
                 className={`
                   w-32 h-12 mx-auto font-mono font-bold text-sm tracking-wider rounded transition-all duration-100
                   border-t border-white/20 flex flex-col items-center justify-center leading-none
                   active:translate-y-[4px] active:shadow-none
                   disabled:opacity-50 disabled:cursor-not-allowed
                   bg-slate-700 text-slate-200 shadow-[0_4px_0_#1e293b]
                 `}
                >
                  MANAGE
                </button>
            </div>
          </div>


              {/* CONTROL RODS (Display Top, Button/Light Bottom) */}

          <div className="bg-background border-3 border-border p-3 flex flex-col h-48">

            {/* Top Section: Label & VFD Display Screen */}
            <div className="space-y-2 w-full">
              <div>
                 <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  CONTROL RODS
                </div>
              </div>

              {/* VFD Green Screen */}
              <div className="vfd-display h-16 w-full relative flex flex-col justify-between py-1">

                <div className="w-full border-t-2 border-black/60 h-0"></div>
                {/* Rod Indicators Container */}
                <div className="absolute inset-y-0 left-3 right-3 top-1 bottom-1 flex justify-between">
                  {gameState.controlRods.map((rod) => (
                    <div key={rod.id} className="relative w-full h-full border-r border-black/5 last:border-r-0">
                      <div
                        className={`
                          absolute w-full text-center font-bold leading-none text-xs transition-all duration-500 ease-out
                          ${rod.stuck ? "animate-[pulse_0.5s_ease-in-out_infinite]" : ""}
                        `}
                        style={{ 
                          // Position based on insertion %. 
                          // 0% is top, 100% is bottom. We clamp slightly to keep it inside the lines.
                          top: `${rod.insertion}%`, 
                          transform: 'translateY(-50%)' // Centers the dash on the exact % point
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
              <button
                onClick={() => !gameState.isPaused && setRodsModalOpen(true)}
                disabled={gameState.isPaused}
                className={`
                  w-32 h-12 font-mono font-bold text-sm tracking-wider rounded transition-all duration-100
                  border-t border-white/20 flex flex-col items-center justify-center leading-none
                  active:translate-y-[4px] active:shadow-none
                  disabled:opacity-50 disabled:cursor-not-allowed
                  bg-slate-700 text-slate-200 shadow-[0_4px_0_#292524]
                `}
              >
                <span className="font-mono font-bold text-sm">MANAGE</span>
              </button>

              {/* The Status Light */}
              <div className="flex flex-col items-center justify-center gap-1 pr-2">
                <div className="p-1.5 rounded-full border border-white/10 shadow-inner">
                  <div 
                    className={`
                      retro-lamp w-5 h-5 rounded-full transition-all duration-300
                      ${gameState.controlRods.some(r => r.stuck)
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

                  <div className="bg-background border-3 border-border p-3 flex flex-col h-48">
                    {/* Top Section: Label & Status Lights */}
                    <div className="space-y-2 w-full">

                        <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                          Turbine
                        </div>


                      {/* The Lamp Display Container */}
                      <div className="bg-black/80 border-2 border-neutral-800 rounded-md p-2 shadow-inner h-16 flex items-center justify-center">
                        <div className="flex gap-8">

                          {/* Light 1: Connection Status (Green) */}
                          <div className="flex flex-col gap-1.5 items-center">
                            <div 
                              className={`
                                retro-lamp w-4 h-4 rounded-full
                                ${gameState.turbineConnected 
                                  ? "bg-emerald-400 text-emerald-400 on shadow-[0_0_10px_currentColor]" 
                                  : "bg-emerald-900/20"
                                }
                              `} 
                            />
                            <span className="text-[9px] font-mono text-neutral-500">CONN</span>
                          </div>

                          {/* Light 2: High Steam Warning (Red Flashing) */}
                          {/* Logic: Flashes if steam is 'High' (e.g. > 250) */}
                          <div className="flex flex-col gap-1.5 items-center">
                            <div 
                              className={`
                                retro-lamp w-4 h-4 rounded-full transition-all
                                ${highSteamWarning 
                                  ? "bg-red-500 text-red-500 on animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_15px_currentColor]" 
                                  : "bg-red-950/20"
                                }
                              `} 
                            />
                            <span className="text-[9px] font-mono text-neutral-500">OVR-P</span>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* Bottom Section: The Physical Button */}
                    <div className="w-full flex-1 flex items-center justify-center">
                      <button
                        // Assuming you have a function like toggleTurbine in your updates
                        onClick={() => !gameState.isPaused && setTurbineModalOpen(true)}
                        disabled={gameState.isPaused}
                        className={`
                          w-32 h-12 mx-auto font-mono font-bold text-sm tracking-wider rounded transition-all duration-100
                          border-t border-white/20 flex flex-col items-center justify-center leading-none
                          active:translate-y-[4px] active:shadow-none
                          disabled:opacity-50 disabled:cursor-not-allowed
                          bg-slate-700 text-slate-200 shadow-[0_4px_0_#27272a]
                        `}
                      >
                        <span>MANAGE</span>
                      </button>
                    </div>
                  </div>
                </div>
      </div>
        {/* Modals */}
       <ControlRodsModal
         open={rodsModalOpen}
         onOpenChange={setRodsModalOpen}
         controlRods={gameState.controlRods}
         onUpdate={(rods) => updateGameState({ controlRods: rods })}
       />

       <WaterPumpsModal
         open={pumpsModalOpen}
         onOpenChange={setPumpsModalOpen}
         waterPumps={gameState.waterPumps}
         onUpdate={(pumps) => updateGameState({ waterPumps: pumps })}
       />

       <TurbineModal
         open={turbineModalOpen}
         onOpenChange={setTurbineModalOpen}
         turbineConnected={gameState.turbineConnected}
         onUpdate={(connected) => updateGameState({ turbineConnected: connected })}
       />
       </div>
  )
}
