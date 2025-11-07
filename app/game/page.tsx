"use client"

import { useState } from "react"
import { useGameState } from "@/hooks/use-game-state"
import ControlPanel from "@/components/control-panel"
import ReactorDisplay from "@/components/reactor-display"
import MessageArea from "@/components/message-area"
import GameOverScreen from "@/components/game-over-screen"
import { LeaveGameModal } from "@/components/leave-game-modal"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function GamePage() {
  const { gameState, updateGameState, resetGame, togglePause } = useGameState()
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const router = useRouter()

  const handleHomeClick = () => {
    setShowLeaveModal(true)
  }

  const handleConfirmLeave = () => {
    resetGame()
    setShowLeaveModal(false)
    router.push("/")
  }

  if (gameState.isGameOver) {
    return <GameOverScreen gameState={gameState} onReset={resetGame} />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Home Button with warning modal */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="border-2 border-primary bg-card hover:bg-card/80"
          title="Return to Menu"
          onClick={handleHomeClick}
        >
          <Home className="h-5 w-5" />
        </Button>
      </div>

      <LeaveGameModal open={showLeaveModal} onOpenChange={setShowLeaveModal} onConfirm={handleConfirmLeave} />

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
