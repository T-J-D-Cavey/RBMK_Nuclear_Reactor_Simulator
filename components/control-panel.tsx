"use client"

import type { GameState } from "@/lib/types"
import { formatTime } from "@/lib/game-utils"
import { Button } from "@/components/ui/button"
import { Pause, Play } from "lucide-react"

interface ControlPanelProps {
  gameState: GameState
  onTogglePause: () => void
}

export default function ControlPanel({ gameState, onTogglePause }: ControlPanelProps) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-card border-4 border-primary p-4 md:p-6 space-y-4">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold font-mono uppercase tracking-wider">Reactor Control System</h1>
        </div>

        {/* Main Readouts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Current Power Output */}
          <div className="bg-background border-2 border-border p-3 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Power Output</div>
            <div className="led-display led-green text-lg md:text-xl">{Math.round(gameState.powerOutput)} MW</div>
          </div>

          {/* Power Target */}
          <div className="bg-background border-2 border-border p-3 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Target</div>
            <div className="led-display led-amber text-lg md:text-xl">{gameState.powerTarget} MW</div>
          </div>

          {/* Performance */}
          <div className="bg-background border-2 border-border p-3 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Performance</div>
            <div
              className={`led-display text-lg md:text-xl ${
                gameState.performance >= 70 ? "led-green" : gameState.performance >= 40 ? "led-amber" : ""
              }`}
            >
              {Math.round(gameState.performance)}%
            </div>
          </div>

          {/* Time */}
          <div className="bg-background border-2 border-border p-3 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Time</div>
            <div className="led-display text-lg md:text-xl">{formatTime(gameState.gameTime)}</div>
          </div>
        </div>

        {/* Secondary Readouts */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 text-sm">
          <div className="bg-background border-2 border-border p-2 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Radioactivity</div>
            <div className="font-mono font-bold">{Math.round(gameState.radioactivity)}</div>
          </div>

          <div className="bg-background border-2 border-border p-2 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Reactor Temp</div>
            <div className="font-mono font-bold">{Math.round(gameState.reactorTemp)}°</div>
          </div>

          <div className="bg-background border-2 border-border p-2 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Fuel Temp</div>
            <div className="font-mono font-bold">{Math.round(gameState.fuelTemp)}°</div>
          </div>

          <div className="bg-background border-2 border-border p-2 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Steam</div>
            <div className="font-mono font-bold">{Math.round(gameState.steamVolume)}</div>
          </div>

          <div className="bg-background border-2 border-border p-2 space-y-1">
            <div className="text-xs text-muted-foreground font-mono uppercase">Xenon</div>
            <div className="font-mono font-bold">{Math.round(gameState.xenon)}</div>
          </div>
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
