"use client"

import { Button } from "@/components/ui/button"
import type { GameState } from "@/lib/types"
import { Atom, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import IncidentReport from "./incident-report"

interface SuccessScreenProps {
  gameState: GameState
  onReset: () => void
}

export function SuccessScreen({ gameState }: SuccessScreenProps) {
  const router = useRouter()
  const isTest = gameState.mode === "safety_test"

  const handleReturnToMenu = () => {
    localStorage.removeItem("chernobyl-game-state")
    router.push("/")
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
                {isTest ? "Unit 4 Survives" : "Mission Success"}
              </h1>
              <Star className="w-8 h-8 text-accent" />
            </div>
            <p className="text-lg md:text-xl font-mono text-foreground leading-relaxed">
              {isTest
                ? "The test is over and Unit 4 is intact. On the real night, the same test ended in disaster."
                : "Reactor stable. Your shift is over, good job!"}
            </p>
          </div>

          <IncidentReport
            gameState={gameState}
            title={isTest ? "Test report" : "Shift report"}
            stamp={isTest ? "Test complete" : "Shift complete"}
            stampClassName="text-emerald-800"
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
