"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DifficultyModal } from "@/components/difficulty-modal"
import { INITIAL_GAME_STATE } from "@/lib/types"

export default function HomePage() {
  const [showDifficultyModal, setShowDifficultyModal] = useState(false)
  const router = useRouter()

  const handleStartGame = () => {
    setShowDifficultyModal(true)
  }

  const handleSelectDifficulty = (isHard: boolean) => {
    // Easy = 15 minutes (900s), Hard = 30 minutes (1800s)
    const timeLimit = isHard ? 1800 : 900

    const newGameState = {
      ...INITIAL_GAME_STATE,
      difficultyIsHard: isHard,
      timeLimit,
      gameTime: timeLimit, // Start countdown at the time limit
      lastEventTime: timeLimit, // Initialize to same value as gameTime
    }

    localStorage.setItem("chernobyl-game-state", JSON.stringify(newGameState))
    setShowDifficultyModal(false)
    router.push("/game")
  }

  const controlRoomBackground = "control_room_background.jpg"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${controlRoomBackground})`}}>
      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-reactor-blue uppercase font-mono">
            R B M K
          </h1>
          <p className="text-xl md:text-2xl text-reactor-blue font-mono">Nuclear Reactor Control Simulation</p>
        </div>

        {/* Control Panel Style Box */}
        <div className="bg-card border-4 border-primary p-8 md:p-12 space-y-6 shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-led-green rounded-full animate-pulse" />
              <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">SYSTEM STATUS: STABLE</span>
            </div>

            <p className="text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
              {
                "Manage a flawed RBMK nuclear reactor in real-time. Maintain balance and deliver the required power output whilst avoiding catastrophic failure."
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              onClick={handleStartGame}
              size="lg"
              className="w-full sm:w-auto uppercase font-mono tracking-wider text-lg px-8 py-6 bg-primary hover:bg-primary/90 border-2 border-primary"
            >
              Start Game
            </Button>

            <Link href="/instructions">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto uppercase font-mono tracking-wider text-lg px-8 py-6 border-2 border-primary hover:bg-primary/10 bg-transparent"
              >
                How to Play
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-sm text-reactor-blue font-mono space-y-1">
          <p className="text-xs">{"© 1986 SKALA CONTROL SYSTEMS"}</p>
        </div>
      </div>

      <DifficultyModal open={showDifficultyModal} onSelectDifficulty={handleSelectDifficulty} />
    </div>
  )
}
