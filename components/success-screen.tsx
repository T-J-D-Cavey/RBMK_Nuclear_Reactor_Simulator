"use client"

import { Button } from "@/components/ui/button"
import type { GameState } from "@/lib/types"
import { formatTime } from "@/lib/game-utils"
import { Atom, Star } from "lucide-react"
import { useRouter } from "next/navigation"

interface SuccessScreenProps {
  gameState: GameState
  onReset: () => void
}

export function SuccessScreen({ gameState, onReset }: SuccessScreenProps) {
  const router = useRouter()

  const handleReturnToMenu = () => {
    localStorage.removeItem("chernobyl-game-state")
    router.push("/")
  }

  const handlePlayAgain = () => {
    localStorage.removeItem("chernobyl-game-state")
    onReset()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6 text-center">
        {/* Success Visual */}
        <div className="flex justify-center mb-8">
          <div
            className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-accent animate-pulse relative"
            style={{
              boxShadow: "0 0 100px 50px var(--color-accent)",
            }}
          >
            <div className="w-full h-full rounded-full border-8 border-primary flex items-center justify-center bg-accent/80 backdrop-blur">
              <Atom className="w-24 h-24 md:w-32 md:h-32 text-background" />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-card border-4 border-accent p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Star className="w-8 h-8 text-accent" />
              <h1 className="text-4xl md:text-6xl font-bold font-mono uppercase text-accent leading-tight">
                Mission Success
              </h1>
              <Star className="w-8 h-8 text-accent" />
            </div>
            <p className="text-lg md:text-xl font-mono text-foreground leading-relaxed">
              Reactor stable. Your shift is over, good job!
            </p>
          </div>

          {/* Difficulty Badge */}
          <div className="inline-block bg-background border-2 border-accent px-6 py-2">
            <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Difficulty</div>
            <div className="text-xl font-mono font-bold text-accent">
              {gameState.difficultyIsHard ? "HARD MODE" : "EASY MODE"}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto pt-4">
            <div className="bg-background border-2 border-border p-4">
              <div className="text-xs text-muted-foreground font-mono uppercase mb-2">Time Limit</div>
              <div className="text-xl md:text-2xl font-mono font-bold">{formatTime(gameState.timeLimit)}</div>
            </div>

            <div className="bg-background border-2 border-border p-4">
              <div className="text-xs text-muted-foreground font-mono uppercase mb-2">Final Performance</div>
              <div className="text-xl md:text-2xl font-mono font-bold text-accent">
                {Math.round(gameState.performance)}%
              </div>
            </div>

            <div className="bg-background border-2 border-border p-4">
              <div className="text-xs text-muted-foreground font-mono uppercase mb-2">Reactor Temp</div>
              <div className="text-xl md:text-2xl font-mono font-bold">{Math.round(gameState.reactorTemp)}°</div>
            </div>

            <div className="bg-background border-2 border-border p-4">
              <div className="text-xs text-muted-foreground font-mono uppercase mb-2">Events Handled</div>
              <div className="text-xl md:text-2xl font-mono font-bold">{gameState.eventHistory.length}</div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-sm">
            <div className="bg-background border-2 border-border p-3">
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Radioactivity</div>
              <div className="text-lg font-mono font-bold">{Math.round(gameState.radioactivity)}</div>
            </div>

            <div className="bg-background border-2 border-border p-3">
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Final Power</div>
              <div className="text-lg font-mono font-bold">{Math.round(gameState.powerOutput)} MW</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              onClick={handlePlayAgain}
              size="lg"
              className="uppercase font-mono tracking-wider px-8 border-2 border-accent bg-accent hover:bg-accent/90"
            >
              Play Again
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="uppercase font-mono tracking-wider px-8 border-2 border-primary w-full sm:w-auto bg-transparent"
              onClick={handleReturnToMenu}
            >
              Return to Menu
            </Button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-sm text-muted-foreground font-mono space-y-1">
          <p className="text-xs">{"© 1986 SKALA CONTROL SYSTEMS"}</p>
        </div>
      </div>
    </div>
  )
}
