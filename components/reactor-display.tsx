"use client"

import { useState } from "react"
import type { GameState } from "@/lib/types"
import { getGlowIntensity } from "@/lib/game-utils"
import ControlRodsModal from "./control-rods-modal"
import WaterPumpsModal from "./water-pumps-modal"
import TurbineModal from "./turbine-modal"

interface ReactorDisplayProps {
  gameState: GameState
  updateGameState: (updates: Partial<GameState>) => void
}

export default function ReactorDisplay({ gameState, updateGameState }: ReactorDisplayProps) {
  const [rodsModalOpen, setRodsModalOpen] = useState(false)
  const [pumpsModalOpen, setPumpsModalOpen] = useState(false)
  const [turbineModalOpen, setTurbineModalOpen] = useState(false)

  const glowIntensity = getGlowIntensity(gameState.radioactivity)

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Control Rods - Top of Reactor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-2 md:gap-4 z-20">
        {gameState.controlRods.map((rod) => (
          <button
            key={rod.id}
            onClick={() => !gameState.isPaused && setRodsModalOpen(true)}
            disabled={gameState.isPaused}
            className="group relative cursor-pointer disabled:cursor-not-allowed"
            title={`Control Rod ${rod.id}: ${rod.insertion}%${rod.stuck ? " (STUCK)" : ""}`}
          >
            {/* Rod shaft */}
            <div
              className="w-6 md:w-8 bg-primary border-2 border-primary transition-all duration-500 group-hover:bg-primary/80"
              style={{
                height: `${Math.max(20, rod.insertion * 1.5)}px`,
              }}
            />
            {/* Rod indicator */}
            <div
              className={`absolute -bottom-6 left-1/2 -translate-x-1/2 w-8 h-1 ${
                rod.stuck ? "bg-destructive" : "bg-accent"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Reactor Core */}
      <div className="relative flex items-center justify-center pt-24 md:pt-32 pb-24 md:pb-32">
        <div
          className="w-48 h-48 md:w-72 md:h-72 rounded-full bg-accent transition-all duration-1000 relative"
          style={{
            opacity: glowIntensity,
            boxShadow: `0 0 ${glowIntensity * 100}px ${glowIntensity * 50}px var(--color-glow-green)`,
          }}
        >
          <div className="w-full h-full rounded-full border-4 md:border-8 border-primary flex items-center justify-center bg-accent">
            <span className="text-3xl md:text-5xl font-bold font-mono text-background select-none">RBMK</span>
          </div>

          {/* Water Pipes - Around Reactor */}
          {/* Top Pipe */}
          <button
            onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
            disabled={gameState.isPaused}
            className="absolute -top-8 md:-top-12 left-1/2 -translate-x-1/2 cursor-pointer disabled:cursor-not-allowed group"
            title="Water Pumps"
          >
            <div
              className={`w-6 md:w-8 h-16 md:h-20 border-4 rounded transition-colors ${
                gameState.waterPumps[0].on && gameState.waterPumps[0].powered
                  ? "bg-blue-500 border-blue-600"
                  : "bg-muted border-border"
              } group-hover:opacity-80`}
            />
          </button>

          {/* Right Pipe */}
          <button
            onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
            disabled={gameState.isPaused}
            className="absolute -right-8 md:-right-12 top-1/2 -translate-y-1/2 cursor-pointer disabled:cursor-not-allowed group"
            title="Water Pumps"
          >
            <div
              className={`w-16 md:w-20 h-6 md:h-8 border-4 rounded transition-colors ${
                gameState.waterPumps[1].on && gameState.waterPumps[1].powered
                  ? "bg-blue-500 border-blue-600"
                  : "bg-muted border-border"
              } group-hover:opacity-80`}
            />
          </button>

          {/* Bottom Pipe */}
          <button
            onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
            disabled={gameState.isPaused}
            className="absolute -bottom-8 md:-bottom-12 left-1/2 -translate-x-1/2 cursor-pointer disabled:cursor-not-allowed group"
            title="Water Pumps"
          >
            <div
              className={`w-6 md:w-8 h-16 md:h-20 border-4 rounded transition-colors ${
                gameState.waterPumps[2].on && gameState.waterPumps[2].powered
                  ? "bg-blue-500 border-blue-600"
                  : "bg-muted border-border"
              } group-hover:opacity-80`}
            />
          </button>

          {/* Left Pipe */}
          <button
            onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
            disabled={gameState.isPaused}
            className="absolute -left-8 md:-left-12 top-1/2 -translate-y-1/2 cursor-pointer disabled:cursor-not-allowed group"
            title="Water Pumps"
          >
            <div
              className={`w-16 md:w-20 h-6 md:h-8 border-4 rounded transition-colors ${
                gameState.waterPumps[3].on && gameState.waterPumps[3].powered
                  ? "bg-blue-500 border-blue-600"
                  : "bg-muted border-border"
              } group-hover:opacity-80`}
            />
          </button>
        </div>
      </div>

      {/* Turbine - Bottom Right */}
      <button
        onClick={() => !gameState.isPaused && setTurbineModalOpen(true)}
        disabled={gameState.isPaused}
        className="absolute bottom-0 right-0 cursor-pointer disabled:cursor-not-allowed group"
        title={`Turbine: ${gameState.turbineConnected ? "Connected" : "Disconnected"}`}
      >
        <div
          className={`w-24 h-24 md:w-32 md:h-32 rounded-lg border-4 flex items-center justify-center transition-all ${
            gameState.turbineConnected ? "bg-accent border-accent-foreground" : "bg-muted border-border"
          } group-hover:opacity-80`}
        >
          <div className="space-y-1">
            <div className="w-12 md:w-16 h-2 bg-background rounded" />
            <div className="w-12 md:w-16 h-2 bg-background rounded" />
            <div className="w-12 md:w-16 h-2 bg-background rounded" />
          </div>
        </div>
      </button>

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
