"use client"
import { Button } from "@/components/ui/button"
import type { GameState } from "@/lib/types"
import { Flame, Radiation, TrendingDown } from "lucide-react"
import { useRouter } from "next/navigation"
import IncidentReport from "./incident-report"

interface GameOverScreenProps {
  gameState: GameState
  onReset: () => void
}

// A separate presentation for each way the shift can end badly (bible §11, §15).
const ENDINGS = {
  meltdown: {
    title: "Meltdown",
    stamp: "Meltdown",
    lead: "The core overheated faster than the pumps could carry the heat away, and the reactor temperature passed its limit.",
  },
  explosion: {
    title: "Core Explosion",
    stamp: "Core destroyed",
    lead: "Steam flashed faster than the channels could hold it. With little water flowing, the runaway ended the way it did on 26 April 1986.",
  },
  performance: {
    title: "Removed from Post",
    stamp: "Dismissed",
    lead: "By order of the station director you are relieved of duty. The grid did not get the power it asked for.",
  },
} as const

export default function GameOverScreen({ gameState }: GameOverScreenProps) {
  const router = useRouter()
  const cause = gameState.gameOverCause ?? (gameState.gameOverReason?.includes("MELTDOWN") ? "meltdown" : "performance")
  const isMeltdown = cause === "meltdown"
  const isExplosion = cause === "explosion"
  const ending = ENDINGS[cause]

  const handleReturnToMenu = () => {
    localStorage.removeItem("chernobyl-game-state")
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {isExplosion && <div className="ws5-flash pointer-events-none fixed inset-0 z-10 bg-white" aria-hidden="true" />}

      <div className="max-w-2xl w-full space-y-6 text-center">
        {/* Reactor Visual */}
        <div className="flex justify-center mb-8">
          {isExplosion ? (
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              <div className="ws5-shock-ring absolute inset-0 rounded-full border-8 border-orange-400" aria-hidden="true" />
              <div
                className="w-full h-full rounded-full bg-orange-500 animate-pulse relative"
                style={{
                  boxShadow: "0 0 140px 70px rgb(249 115 22 / 0.7), 0 0 60px 20px rgb(255 255 255 / 0.5)",
                }}
              >
                <div className="w-full h-full rounded-full border-8 border-primary flex items-center justify-center bg-orange-600/80 backdrop-blur">
                  <Flame className="w-24 h-24 md:w-32 md:h-32 text-background animate-pulse" />
                </div>
              </div>
            </div>
          ) : isMeltdown ? (
            <div
              className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-destructive animate-pulse relative"
              style={{
                boxShadow: "0 0 100px 50px var(--color-destructive)",
              }}
            >
              <div className="w-full h-full rounded-full border-8 border-primary flex items-center justify-center bg-destructive/80 backdrop-blur">
                <Radiation className="w-24 h-24 md:w-32 md:h-32 text-background animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-muted border-8 border-primary flex items-center justify-center relative">
              <TrendingDown className="w-24 h-24 md:w-32 md:h-32 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Game Over Message */}
        <div className={`bg-card border-4 p-6 md:p-8 space-y-6 ${cause === "performance" ? "border-primary" : "border-destructive"}`}>
          <h1
            className={`text-4xl md:text-6xl font-bold font-mono uppercase leading-tight ${
              cause === "performance" ? "text-foreground" : "text-destructive"
            }`}
          >
            {ending.title}
          </h1>

          <p className="text-lg md:text-xl font-mono text-foreground leading-relaxed">{gameState.gameOverReason}</p>
          <p className="text-sm md:text-base font-mono text-muted-foreground leading-relaxed">{ending.lead}</p>

          <IncidentReport
            gameState={gameState}
            title="Incident report"
            stamp={ending.stamp}
            stampClassName={cause === "performance" ? "text-neutral-700" : "text-red-700"}
          />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button
              size="lg"
              variant="outline"
              className="uppercase font-mono tracking-wider px-8 border-2 border-primary w-full sm:w-auto bg-transparent"
              onClick={handleReturnToMenu}
            >
              Return to Homepage
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
