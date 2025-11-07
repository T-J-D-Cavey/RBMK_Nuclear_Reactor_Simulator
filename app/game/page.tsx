"use client"

import { useGameState } from "@/hooks/use-game-state"
import ControlPanel from "@/components/control-panel"
import ReactorDisplay from "@/components/reactor-display"
import MessageArea from "@/components/message-area"
import GameOverScreen from "@/components/game-over-screen"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function GamePage() {
  const { gameState, updateGameState, resetGame, togglePause } = useGameState()

  if (gameState.isGameOver) {
    return <GameOverScreen gameState={gameState} onReset={resetGame} />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Home Button */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/">
          <Button
            variant="outline"
            size="icon"
            className="border-2 border-primary bg-card hover:bg-card/80"
            title="Return to Menu"
          >
            <Home className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Top Half - Control Panel */}
      <div className="flex-1 p-4 md:p-6 border-b-4 border-primary">
        <ControlPanel gameState={gameState} onTogglePause={togglePause} />
      </div>

      {/* Message Area */}
      <MessageArea gameState={gameState} />

      {/* Bottom Half - Reactor Display */}
      <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
        <ReactorDisplay gameState={gameState} updateGameState={updateGameState} />
      </div>
    </div>
  )
}
