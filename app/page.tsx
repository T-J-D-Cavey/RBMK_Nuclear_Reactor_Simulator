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

        {/* Start console */}
        <div className="cr-panel cr-screws mx-auto max-w-xl px-5 py-6 sm:px-10 sm:py-8 space-y-6">
          <div className="cr-note px-4 py-3 !text-[0.8rem] sm:!text-[0.9rem] uppercase tracking-wide text-center space-y-1">
            <p>Run a flawed reactor through the night shift.</p>
            <p>Meet the grid&apos;s demand. Keep the core intact.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-stretch sm:items-end">
            <div className="flex flex-col items-center gap-2">
              <span className="cr-plate w-full sm:w-auto">
                <span className="retro-lamp on cr-blink inline-block w-2 h-2 bg-green-400 text-green-400" aria-hidden="true" />
                Ready
              </span>
              <span className="cr-bezel w-full sm:w-auto">
                <button onClick={handleStartGame} className="cr-key cr-key-green-lit w-full sm:w-52 h-14 !text-lg">
                  Start Shift
                </button>
              </span>
            </div>

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
