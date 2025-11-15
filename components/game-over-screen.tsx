"use client"
import { Button } from "@/components/ui/button"
import type { GameState } from "@/lib/types"
import { formatTime } from "@/lib/game-utils"
import { Flame, TrendingDown } from "lucide-react"
import { useRouter } from "next/navigation"

interface GameOverScreenProps {
  gameState: GameState
  onReset: () => void
}

export default function GameOverScreen({ gameState, onReset }: GameOverScreenProps) {
  const router = useRouter()
  const isMeltdown = gameState.gameOverReason?.includes("MELTDOWN")

  const handleReturnToMenu = () => {
    localStorage.removeItem("chernobyl-game-state")
    router.push("/")
  }

  const handleTryAgain = () => {
    localStorage.removeItem("chernobyl-game-state")
    onReset()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6 text-center">
        {/* Reactor Visual */}
        <div className="flex justify-center mb-8">
          {isMeltdown ? (
            <div
              className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-destructive animate-pulse relative"
              style={{
                boxShadow: "0 0 100px 50px var(--color-destructive)",
              }}
            >
              <div className="w-full h-full rounded-full border-8 border-primary flex items-center justify-center bg-destructive/80 backdrop-blur">
                <Flame className="w-24 h-24 md:w-32 md:h-32 text-background animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-muted border-8 border-primary flex items-center justify-center relative">
              <TrendingDown className="w-24 h-24 md:w-32 md:h-32 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Game Over Message */}
        <div className="bg-card border-4 border-destructive p-6 md:p-8 space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold font-mono uppercase text-destructive leading-tight">
            Game Over
          </h1>

          <p className="text-lg md:text-xl font-mono text-foreground leading-relaxed">{gameState.gameOverReason}</p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto pt-4">
            <div className="bg-background border-2 border-border p-4">
              <div className="text-xs text-muted-foreground font-mono uppercase mb-2">Time Remaining</div>
              <div className="text-xl md:text-2xl font-mono font-bold">{formatTime(gameState.gameTime)}</div>
            </div>

            <div className="bg-background border-2 border-border p-4">
              <div className="text-xs text-muted-foreground font-mono uppercase mb-2">Final Performance</div>
              <div className="text-xl md:text-2xl font-mono font-bold">{Math.round(gameState.performance)}%</div>
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
              onClick={handleTryAgain}
              size="lg"
              className="uppercase font-mono tracking-wider px-8 border-2 border-primary"
            >
              Try Again
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

        {/* Footnote */}
        <p className="text-xs text-muted-foreground font-mono">{"Game state automatically saved to local storage"}</p>
      </div>
    </div>
  )
}
