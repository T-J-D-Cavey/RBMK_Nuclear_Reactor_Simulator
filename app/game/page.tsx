"use client"

import { useState } from "react"
import { useGameState } from "@/hooks/use-game-state"
import ControlPanel from "@/components/control-panel"
import MessageArea from "@/components/message-area"
import GameOverScreen from "@/components/game-over-screen"
import { SuccessScreen } from "@/components/success-screen"
import { LeaveGameModal } from "@/components/leave-game-modal"
import { useAudioManager } from "@/hooks/use-audio-manager"
import { THRESHOLDS } from "@/lib/types" 
import SoundModal from "@/components/sound-modal"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Volume2, VolumeX } from "lucide-react"
import ReactorCamera, { getCameraClockStartMs, getShiftElapsedSeconds } from "@/components/reactor-camera"
import ChartRecorder from "@/components/chart-recorder"

export default function GamePage() {
  const { gameState, updateGameState, resetGame, togglePause } = useGameState()
  // Local state:
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showSoundModal, setShowSoundModal] = useState(false)
  const router = useRouter()

  // BACKGROUND IMAGE LOGIC:
  const controlRoomBackground = "control_room_background.jpg" 

  const handleSoundModalToggle = () => {
    setShowSoundModal(!showSoundModal)
  }

  const handleHomeClick = () => {
    setShowLeaveModal(true)
  }

  const handleConfirmLeave = () => {
    resetGame()
    setShowLeaveModal(false)
    router.push("/")
  }

  // --- AUDIO LOGIC ---
  const generalAlarmIsNeeded = gameState.warnings.length > 0
  const powerCutOrRodStuckAlarm = gameState.activeEvents.some((event) => event.type === "power-cut" || event.type === "rod-stuck");
  const highRadAlarm = gameState.radioactivity > THRESHOLDS.radioactivity.highWarning
  const highReactorTempAlarm = gameState.reactorTemp > THRESHOLDS.reactorTemp.warning
  const highSteamOrXenon = gameState.steamVolume > THRESHOLDS.steamVolume.highWarning || gameState.xenon > THRESHOLDS.xenon.highWarning
  const { initializeAudio } = useAudioManager({
    soundEnabled: gameState.soundEnabled,
    soundVolume: gameState.soundVolume,
    generalAlarmIsNeeded: generalAlarmIsNeeded,
    powerCutOrRodStuckAlarm: powerCutOrRodStuckAlarm,
    highRadAlarm: highRadAlarm,
    highReactorTempAlarm: highReactorTempAlarm,
    highSteamOrXenon: highSteamOrXenon,
  })
  const handleInteraction = () => {
    initializeAudio();
  }

  if(gameState.isPaused) {
    // needs testing in case unpausing is needed: updateGameState({soundsoundEnabled: false})
  }

  if (gameState.hasWon) {
    return <SuccessScreen gameState={gameState} onReset={resetGame} />
  }

  if (gameState.isGameOver) {
    return <GameOverScreen gameState={gameState} onReset={resetGame} />
  }

  return (
    <div 
      className="min-h-screen bg-background flex flex-col relative"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
        {/* Home Button and Volume Toggle Top Left */}
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
              title="Sound Settings"
              onClick={handleSoundModalToggle}
            >
              {gameState.soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
        </div>

      {/* MODALS */}
      <LeaveGameModal open={showLeaveModal} onOpenChange={setShowLeaveModal} onConfirm={handleConfirmLeave} />

      <SoundModal
       open={showSoundModal}
       onOpenChange={setShowSoundModal}
       soundEnabled={gameState.soundEnabled}
       soundVolume={gameState.soundVolume}
       onEnabledUpdate={(soundEnabled) => updateGameState({ soundEnabled })}
       onVolumeUpdate={(soundVolume) => updateGameState({ soundVolume })}
      />
      
      {/* Top Half - Control Panel */}
      <div className="flex-1 p-4 md:p-6 border-b-4 border-primary bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${controlRoomBackground})`}}>
        <ControlPanel gameState={gameState} onTogglePause={togglePause} updateGameState={updateGameState} />
      </div>

      {/* Message Area */}
      <MessageArea gameState={gameState} />

      {/* Reactor camera + side panels (WS3 presentation).
          Wide screens: three columns, so the camera sits on the control panel's centre line (same max width)
          with the chart recorder to its right; the empty left column balances it. Narrower: stacked. */}
      <div className="w-full bg-black px-2 py-3 sm:px-4 md:py-6">
        <div className="mx-auto w-full flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(18rem,1fr)_minmax(0,72rem)_minmax(18rem,1fr)] xl:items-start">
          <div className="w-full min-w-0 max-w-6xl mx-auto xl:col-start-2">
            <ReactorCamera
              variant="inline"
              radioactivity={gameState.radioactivity}
              reactorTemp={gameState.reactorTemp}
              elapsedSeconds={getShiftElapsedSeconds(gameState.gameTime, gameState.timeLimit, gameState.mode)}
              clockStartMs={getCameraClockStartMs(gameState.mode)}
            />
          </div>
          <aside className="w-full min-w-0 max-w-xl mx-auto xl:col-start-3 xl:mx-0 xl:max-w-[22rem] xl:sticky xl:top-4">
            <ChartRecorder
              radioactivity={gameState.radioactivity}
              reactorTemp={gameState.reactorTemp}
              steamVolume={gameState.steamVolume}
              gameTime={gameState.gameTime}
              isPaused={gameState.isPaused}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
