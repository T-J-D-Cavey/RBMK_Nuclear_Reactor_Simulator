"use client"

import { useState } from "react"
import { useGameState } from "@/hooks/use-game-state"
import ControlPanel from "@/components/control-panel"
import ReactorDisplay from "@/components/reactor-display"
import MessageArea from "@/components/message-area"
import GameOverScreen from "@/components/game-over-screen"
import { SuccessScreen } from "@/components/success-screen"
import { LeaveGameModal } from "@/components/leave-game-modal"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Volume, VolumeX } from "lucide-react"

export default function GamePage() {
  const { gameState, updateGameState, resetGame, togglePause } = useGameState()
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const router = useRouter()

  const controlRoomBackground = "control_room_background.jpg"
  // const reactorRoomBackground = "reactor_hall_background.jpg" // old to be removed when new display is workign as expected

  const reactorFromAboveNormal = "new_reactor_image_cropped.jpg"
  const reactorFromAboveRadioactive = "new_reactor_image_high_radioactivity_cropped.jpg"
  const reactorFromAboveTemp = "new_reactor_image_high_temp_cropped.jpg"

  // Helper to map 200-600 range to 0.0-1.0 opacity
  const getRadioactivityOpacity = (value) => {
    if (value <= 150) return 0;
    if (value >= 350) return 1;
    return (value - 150) / 200;
  };

    // Helper to map 700-900 range to 0.0-1.0 opacity
  const getTemperatureOpacity = (value) => {
    if (value <= 600) return 0;
    if (value >= 800) return 1;
    return (value - 600) / 200;
  };

  const handleHomeClick = () => {
    setShowLeaveModal(true)
  }

  const handleConfirmLeave = () => {
    resetGame()
    setShowLeaveModal(false)
    router.push("/")
  }

  if (gameState.hasWon) {
    return <SuccessScreen gameState={gameState} onReset={resetGame} />
  }

  if (gameState.isGameOver) {
    return <GameOverScreen gameState={gameState} onReset={resetGame} />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
          {/* Home Button with warning modal */}
        <div className="flex flex-col absolute top-4 left-4 z-50 space-y-2">
            <Button
              variant="outline"
              size="icon"
              className="border-2 border-primary bg-card hover:bg-card/80"
              title="Return to Menu"
              onClick={handleHomeClick}
            >
              <Home className="h-5 w-5" />
            </Button>

            {/* Volume toggle */}
            <Button
              variant="outline"
              size="icon"
              className="border-2 border-primary bg-card hover:bg-card/80"
              title="Turn sound on / off"
              // Add your volume toggle handler here: onClick={handleVolumeToggle}
            >
              <VolumeX className="h-5 w-5" />
              {/* I will togle between the VolumeX and Volume component depeneidng on volume on state */}
            </Button>
        </div>

      <LeaveGameModal open={showLeaveModal} onOpenChange={setShowLeaveModal} onConfirm={handleConfirmLeave} />

      {/* Top Half - Control Panel */}
      <div className="flex-1 p-4 md:p-6 border-b-4 border-primary bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${controlRoomBackground})`}}>
        <ControlPanel gameState={gameState} onTogglePause={togglePause} updateGameState={updateGameState} />
      </div>

      {/* Message Area */}
      <MessageArea gameState={gameState} />

      {/* Bottom Half - Reactor Display 
      <div className="flex-1 p-4 md:p-6 flex items-center justify-center bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${reactorRoomBackground})`}}>
        <ReactorDisplay gameState={gameState} updateGameState={updateGameState} />
      </div>*/}

      {/* New reactor display being tested: */}
      <div className="w-full bg-background rounded-lg flex justify-center items-center">
            <div className="relative w-full max-w-6xl border-l-4 border-r-4 border-b-4 border-primary aspect-square overflow-hidden rounded-lg shadow-lg bg-gray-900">

            {/* 1. BASE LAYER (Always Visible) */}
            <img 
              src={reactorFromAboveNormal} 
              alt="Reactor Base" 
              className="absolute inset-0 w-full h-full object-cover z-0"
            />

            {/* 2. TEMPERATURE LAYER (Dynamic Opacity) */}
            <img 
              src={reactorFromAboveTemp} 
              alt="Heat Overlay" 
              className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-500 pointer-events-none mix-blend-screen"
              style={{ opacity: getTemperatureOpacity(gameState.reactorTemp) }}
            />

            {/* 3. RADIOACTIVITY LAYER (Dynamic Opacity) */}
            <img 
              src={reactorFromAboveRadioactive} 
              alt="Radiation Overlay" 
              className="absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-500 pointer-events-none mix-blend-screen"
              style={{ opacity: getRadioactivityOpacity(gameState.radioactivity) }}
            />

          </div>
        </div>
        <div className="text-sm text-reactor-blue font-mono space-y-1 bg-black text-center">
          <p className="text-xs">{"© 1986 SKALA CONTROL SYSTEMS"}</p>
        </div>
    </div>
  )
}
