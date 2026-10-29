"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DifficultyModal } from "@/components/difficulty-modal"
import type { GameMode } from "@/lib/types"
import { createNewGame } from "@/lib/game-loop"
import { TUTORIAL_KEY } from "@/lib/tutorial"
import RisingParticles from "@/components/rising-particles"

// The mode menu has its own history entry, so Back (or a phone's swipe back) closes it and stays on this page rather
// than leaving it (owner, 2026-10-29). Same URL; only this flag in the entry's state.
const MENU_ENTRY = "rbmkModeMenu"
const menuEntryIsCurrent = () => Boolean(window.history.state?.[MENU_ENTRY])

export default function HomePage() {
  const [showDifficultyModal, setShowDifficultyModal] = useState(false)
  const router = useRouter()

  // The menu is open exactly while its entry is the current one: Back closes it, Forward (or a reload) reopens it
  useEffect(() => {
    const sync = () => setShowDifficultyModal(menuEntryIsCurrent())
    sync()
    window.addEventListener("popstate", sync)
    return () => window.removeEventListener("popstate", sync)
  }, [])

  const handleStartGame = () => {
    if (!menuEntryIsCurrent()) window.history.pushState({ [MENU_ENTRY]: true }, "")
    setShowDifficultyModal(true)
  }

  // Closed with its X, Escape or a tap outside: step back off its entry, as the Back button would
  const handleMenuOpenChange = (open: boolean) => {
    if (open) return handleStartGame()
    setShowDifficultyModal(false)
    if (menuEntryIsCurrent()) window.history.back()
  }

  const handleSelectDifficulty = (mode: GameMode) => {
    // Countdown modes start at their time limit; Free mode counts up from 0. Every game opens with the control-room
    // briefing, paused until it ends (owner, 2026-10-29).
    const newGameState = { ...createNewGame(mode), isPaused: true }

    localStorage.setItem("chernobyl-game-state", JSON.stringify(newGameState))
    localStorage.setItem(TUTORIAL_KEY, "1")
    setShowDifficultyModal(false)
    // The game takes the menu's place in the history, so Back from the game comes here with the menu closed
    router.replace("/game")
  }

  const controlRoomBackground = "control_room_background.jpg"

  return (
    <div
      className={`relative min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat ${showDifficultyModal ? "cr-home-menu-open" : ""}`}
      style={{ backgroundImage: `url(${controlRoomBackground})` }}
    >
      {/* Atmosphere: dark vignette + faint scanlines over the control room */}
      <div className="ws3-home-vignette absolute inset-0 pointer-events-none" aria-hidden="true" />
      {/* The end screen's emergency beacon, mounted on the ceiling, and embers drifting up the room (owner, 2026-10-14) */}
      <div className="cr-beacon cr-beacon-ceiling" aria-hidden="true" />
      <div className="cr-beacon-glow" aria-hidden="true" />
      <RisingParticles kind="embers" start="drifting" />

      <div className="relative max-w-2xl w-full space-y-8 text-center">
        {/* Title on a CRT monitor */}
        <div className="ws3-crt-panel px-4 py-6 sm:px-8 sm:py-8">
          <div className="ws3-crt-sweep" aria-hidden="true" />
          <div className="relative space-y-3 sm:space-y-4">
            <h1 className="ws3-crt-title text-6xl md:text-8xl font-bold tracking-tight text-reactor-green uppercase font-mono">
              R B M K
            </h1>
            <p className="ws3-crt-subtitle text-lg sm:text-xl md:text-2xl text-reactor-green font-mono">Nuclear Reactor Control Simulation</p>
          </div>
        </div>

        {/* Start console: just big enough for its two keys (plan §21.4) */}
        <div className="cr-panel cr-screws mx-auto w-full max-w-xs sm:max-w-none sm:w-fit px-5 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-stretch sm:items-center">
            <span className="cr-lens-bezel w-full sm:w-auto">
              <button onClick={handleStartGame} className="cr-lens w-full sm:w-52 h-14 !text-lg">
                Start Game
              </button>
            </span>
            <span className="cr-lens-bezel w-full sm:w-auto">
              <Link href="/instructions" className="cr-lens cr-lens-amber w-full sm:w-48 h-14 !text-base">
                How to Play
              </Link>
            </span>
          </div>
        </div>
      </div>

      <DifficultyModal open={showDifficultyModal} onOpenChange={handleMenuOpenChange} onSelectDifficulty={handleSelectDifficulty} />
    </div>
  )
}
