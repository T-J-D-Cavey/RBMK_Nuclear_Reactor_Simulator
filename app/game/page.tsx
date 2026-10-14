"use client"

import { useState } from "react"
import { useGameState } from "@/hooks/use-game-state"
import ControlPanel from "@/components/control-panel"
import MessageArea from "@/components/message-area"
import GameOverScreen from "@/components/game-over-screen"
import { SuccessScreen } from "@/components/success-screen"
import { LeaveGameModal } from "@/components/leave-game-modal"
import { useAudioManager } from "@/hooks/use-audio-manager"
import { useShiftLogLamp } from "@/hooks/use-shift-log-lamp"
import { getAlarms, getEventWarnings, getReactorWarnings } from "@/lib/game-utils"
import { rodsMoving } from "@/lib/sound-cues"
import SoundModal from "@/components/sound-modal"
import { useRouter } from "next/navigation"
import ReactorCamera, { getCameraClockStartMs, getShiftElapsedSeconds } from "@/components/reactor-camera"
import ChartRecorder from "@/components/chart-recorder"
import ReactivityCards from "@/components/reactivity-cards"
import { useElementHeight } from "@/hooks/use-element-height"

export default function GamePage() {
  const { gameState, isLoaded, updateGameState, resetGame, togglePause } = useGameState()
  // Local state:
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showSoundModal, setShowSoundModal] = useState(false)
  const router = useRouter()
  // The board of balance is as tall as the chart recorder (owner, 2026-10-14)
  const [chartRef, chartHeight] = useElementHeight<HTMLElement>()

  // Header keys that bring the alarm monitor or the shift log into view, and the shift log's lamp (plan §21.5)
  const [alarmRevealSignal, setAlarmRevealSignal] = useState(0)
  const [logRevealSignal, setLogRevealSignal] = useState(0)
  const logLamp = useShiftLogLamp(gameState.log[gameState.log.length - 1]?.id, isLoaded)
  const handleSeeWarnings = () => setAlarmRevealSignal((n) => n + 1)
  const handleSeeLog = () => {
    logLamp.dismiss()
    setLogRevealSignal((n) => n + 1)
  }

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
  const alarms = getAlarms(gameState)
  // Silent while paused and once the shift is over; the player's two switches are kept for when play resumes
  const audioLive = !gameState.isPaused && !gameState.isGameOver && !gameState.hasWon
  const { initializeAudio, playEffect } = useAudioManager({
    alarmsOn: gameState.alarmsEnabled && audioLive,
    effectsOn: gameState.effectsEnabled && audioLive,
    soundVolume: gameState.soundVolume,
    generalAlarmIsNeeded: alarms.general,
    eventAlarm: alarms.event,
    highRadAlarm: alarms.highRadioactivity,
    highReactorTempAlarm: alarms.highReactorTemp,
    highSteamOrXenon: alarms.highSteamOrXenon,
    loaded: isLoaded,
    rodsMoving: rodsMoving(gameState.controlRods),
    warningKeys: [...getReactorWarnings(gameState), ...getEventWarnings(gameState)].map((warning) => warning.key),
    lastLogId: gameState.log[gameState.log.length - 1]?.id,
  })
  const handleInteraction = () => {
    initializeAudio();
  }

  // Until the saved game is loaded (browser only), show the empty control room: the server renders the same, so
  // there is no hydration mismatch and no flash of a fresh game before the saved one appears.
  if (!isLoaded) {
    return <div className="min-h-screen bg-black bg-cover bg-center" style={{ backgroundImage: `url(${controlRoomBackground})` }} />
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
      {/* MODALS */}
      <LeaveGameModal open={showLeaveModal} onOpenChange={setShowLeaveModal} onConfirm={handleConfirmLeave} />

      <SoundModal
       open={showSoundModal}
       onOpenChange={setShowSoundModal}
       alarmsEnabled={gameState.alarmsEnabled}
       effectsEnabled={gameState.effectsEnabled}
       soundVolume={gameState.soundVolume}
       onAlarmsUpdate={(alarmsEnabled) => updateGameState({ alarmsEnabled })}
       onEffectsUpdate={(effectsEnabled) => updateGameState({ effectsEnabled })}
       onVolumeUpdate={(soundVolume) => updateGameState({ soundVolume })}
      />
      
      {/* Top Half - the control desk: control panel, then the alarm monitor and shift log, in the control room */}
      <div className="flex-1 px-3 py-4 sm:p-4 md:p-6 space-y-5 md:space-y-6 bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${controlRoomBackground})`}}>
        <ControlPanel
          gameState={gameState}
          onTogglePause={togglePause}
          updateGameState={updateGameState}
          onHomeClick={handleHomeClick}
          onSoundClick={handleSoundModalToggle}
          onSoundEffect={playEffect}
          logLampLit={logLamp.lit}
          onSeeWarnings={handleSeeWarnings}
          onSeeLog={handleSeeLog}
        />

        {/* Message Area */}
        <MessageArea
          gameState={gameState}
          alarmRevealSignal={alarmRevealSignal}
          logRevealSignal={logRevealSignal}
          onLogInView={logLamp.setInView}
        />
      </div>

      <div className="cr-rail" aria-hidden="true" />

      {/* Reactor camera + side panels (WS3 presentation).
          Wide screens (xl): three columns, so the camera sits on the control panel's centre line (same max width),
          with the red and blue cards to its left and the chart recorder to its right. Each side column is a quarter
          of the row (half the camera's width, so never wider or taller than the camera) between 18rem and 36rem;
          the row stops growing at 36 + 72 + 36rem plus the gaps, for very wide screens (owner, 2026-10-14).
          Medium (md): the camera on top, then the cards and the chart recorder side by side. Phones: stacked, the
          cards below the chart. */}
      <div className="w-full cr-monitor-wall px-3 py-5 sm:px-4 md:py-8">
        <div className="mx-auto w-full max-w-6xl xl:max-w-[146rem] grid grid-cols-1 md:grid-cols-2 gap-4 items-start xl:grid-cols-[clamp(18rem,calc((100%_-_2rem)/4),36rem)_minmax(0,72rem)_clamp(18rem,calc((100%_-_2rem)/4),36rem)]">
          <div className="w-full min-w-0 max-w-6xl mx-auto md:col-span-2 md:row-start-1 xl:col-span-1 xl:col-start-2 xl:row-start-1">
            <ReactorCamera
              variant="inline"
              radioactivity={gameState.radioactivity}
              reactorTemp={gameState.reactorTemp}
              elapsedSeconds={getShiftElapsedSeconds(gameState.gameTime, gameState.timeLimit, gameState.mode)}
              clockStartMs={getCameraClockStartMs(gameState.mode)}
            />
          </div>
          <aside className="w-full min-w-0 max-w-xl md:max-w-none mx-auto md:col-start-2 md:row-start-2 xl:col-start-3 xl:row-start-1 xl:mx-0 xl:sticky xl:top-4" ref={chartRef}>
            <ChartRecorder
              radioactivity={gameState.radioactivity}
              reactorTemp={gameState.reactorTemp}
              steamVolume={gameState.steamVolume}
              gameTime={gameState.gameTime}
              isPaused={gameState.isPaused}
            />
          </aside>
          {/* Legasov's red and blue cards (owner, 2026-10-13) */}
          <aside className="w-full min-w-0 max-w-xl md:max-w-none mx-auto md:col-start-1 md:row-start-2 xl:col-start-1 xl:row-start-1 xl:justify-self-end xl:mx-0 xl:sticky xl:top-4">
            <ReactivityCards gameState={gameState} height={chartHeight} />
          </aside>
        </div>
      </div>
    </div>
  )
}
