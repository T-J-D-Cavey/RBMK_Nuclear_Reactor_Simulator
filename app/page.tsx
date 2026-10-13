"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DifficultyModal } from "@/components/difficulty-modal"
import type { GameMode } from "@/lib/types"
import { createNewGame } from "@/lib/game-loop"

export default function HomePage() {
  const [showDifficultyModal, setShowDifficultyModal] = useState(false)
  const router = useRouter()

  const handleStartGame = () => {
    setShowDifficultyModal(true)
  }

  const handleSelectDifficulty = (mode: GameMode) => {
    // Countdown modes start at their time limit; Free mode counts up from 0
    const newGameState = createNewGame(mode)

    localStorage.setItem("chernobyl-game-state", JSON.stringify(newGameState))
    setShowDifficultyModal(false)
    router.push("/game")
  }

  const controlRoomBackground = "control_room_background.jpg"

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${controlRoomBackground})`}}>
      {/* Atmosphere: dark vignette + faint scanlines over the control room */}
      <div className="ws3-home-vignette absolute inset-0 pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-2xl w-full space-y-8 text-center">
        {/* Title on a CRT monitor */}
        <div className="ws3-crt-panel px-4 py-6 sm:px-8 sm:py-8">
          <div className="ws3-crt-sweep" aria-hidden="true" />
          <div className="relative space-y-3 sm:space-y-4">
            <h1 className="ws3-crt-title text-6xl md:text-8xl font-bold tracking-tight text-reactor-blue uppercase font-mono">
              R B M K
            </h1>
            <p className="ws3-crt-subtitle text-lg sm:text-xl md:text-2xl text-reactor-blue font-mono">Nuclear Reactor Control Simulation</p>
          </div>
        </div>

        {/* Start console: just big enough for its two keys (plan §21.4) */}
        <div className="cr-panel cr-screws mx-auto w-full max-w-xs sm:max-w-none sm:w-fit px-5 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-stretch sm:items-center">
            <span className="cr-bezel w-full sm:w-auto">
              <button onClick={handleStartGame} className="cr-key cr-key-green-lit w-full sm:w-52 h-14 !text-lg">
                Start Shift
              </button>
            </span>
            <span className="cr-bezel w-full sm:w-auto">
              <Link href="/instructions" className="cr-key cr-key-cream w-full sm:w-44 h-14 !text-base">
                How to Play
              </Link>
            </span>
          </div>
        </div>
      </div>

      <DifficultyModal open={showDifficultyModal} onOpenChange={setShowDifficultyModal} onSelectDifficulty={handleSelectDifficulty} />
    </div>
  )
}
