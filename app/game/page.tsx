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
import { isPowerOnTarget } from "@/lib/game-mechanics"
import SoundModal from "@/components/sound-modal"
import { useRouter } from "next/navigation"
import ReactorCamera, { getCameraClockStartMs, getShiftElapsedSeconds } from "@/components/reactor-camera"
import ChartRecorder from "@/components/chart-recorder"
import ReactivityCards from "@/components/reactivity-cards"
import RodDisplay from "@/components/rod-display"
import Dosimeter from "@/components/dosimeter"
import { useElementHeight, useMediaQuery } from "@/hooks/use-element-height"

// From here up the page is a dashboard (owner, 2026-10-23): the chart recorder and the reactor camera either side of the
// control panel, the alarm monitor and shift log across the full width below them, then the radioactivity balance, the
// rod display and the dosimeter in one row. Narrower, everything stacks below the panel.
const DASHBOARD_QUERY = "(min-width: 1024px)" // Tailwind lg

export default function GamePage() {
  const { gameState, isLoaded, updateGameState, resetGame, togglePause } = useGameState()
  // Local state:
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showSoundModal, setShowSoundModal] = useState(false)
  const router = useRouter()
  // The radioactivity balance is as tall as the chart recorder beside it on medium screens (owner, 2026-10-14)
  const [chartRef, chartHeight] = useElementHeight<HTMLElement>()
  // ...and the dosimeter as tall as the rod display beside it (on the dashboard, the balance too)
  const [rodsRef, rodsHeight] = useElementHeight<HTMLElement>()
  const dashboard = useMediaQuery(DASHBOARD_QUERY)
  // On the dashboard the chart recorder (by shortening its bands, down to half) and the camera (by widening its screen)
  // are no taller than the panel between them, so the alarm monitor sits right under the panel (owner, 2026-10-23)
  const [panelRef, panelHeight] = useElementHeight<HTMLDivElement>()
  const sideFit = dashboard && panelHeight ? panelHeight : null

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
    powerOnTarget: gameState.powerTarget === null ? null : isPowerOnTarget(gameState),
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

  const panel = (
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
  )
  // The alarm monitor and the shift log
  const messages = (
    <MessageArea
      gameState={gameState}
      alarmRevealSignal={alarmRevealSignal}
      logRevealSignal={logRevealSignal}
      onLogInView={logLamp.setInView}
      wide={dashboard}
    />
  )
  const camera = (
    <ReactorCamera
      variant="inline"
      radioactivity={gameState.radioactivity}
      reactorTemp={gameState.reactorTemp}
      elapsedSeconds={getShiftElapsedSeconds(gameState.gameTime, gameState.timeLimit, gameState.mode)}
      clockStartMs={getCameraClockStartMs(gameState.mode)}
      fitHeight={sideFit}
    />
  )
  const chart = (
    <ChartRecorder
      radioactivity={gameState.radioactivity}
      reactorTemp={gameState.reactorTemp}
      steamVolume={gameState.steamVolume}
      gameTime={gameState.gameTime}
      isPaused={gameState.isPaused}
      fitHeight={sideFit}
    />
  )
  const dosimeter = <Dosimeter radioactivity={gameState.radioactivity} second={gameState.gameTime} matchHeight={rodsHeight} />
  const cards = <ReactivityCards gameState={gameState} height={dashboard ? rodsHeight : chartHeight} />
  const rods = <RodDisplay gameState={gameState} />

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

      {dashboard ? (
        /* Dashboard (lg up). The panel keeps its narrow phone size (at most 28rem) between the chart recorder and the
           camera, which share what is left, at least 17rem each; the panel gives way first, down to the breakpoint.
           Below them the alarm monitor and shift log run the full width, then the balance, the rod display and the
           dosimeter share one row. All of it stops growing at 1,400px and stays centred, so log lines stay short enough to
           scan and the side widgets stay no taller than the panel (owner, 2026-10-23). */
        <div className="flex-1 p-6 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${controlRoomBackground})` }}>
          <div className="mx-auto max-w-[87.5rem] space-y-4">
            <div className="grid gap-4 items-start grid-cols-[minmax(17rem,1fr)_minmax(0,28rem)_minmax(17rem,1fr)]">
              <aside className="min-w-0" ref={chartRef}>{chart}</aside>
              <div className="min-w-0" ref={panelRef}>{panel}</div>
              <div className="min-w-0">{camera}</div>
            </div>
            {messages}
            <div className="grid grid-cols-3 gap-4 items-start">
              <aside className="min-w-0">{cards}</aside>
              <aside className="min-w-0" ref={rodsRef}>{rods}</aside>
              <aside className="min-w-0">{dosimeter}</aside>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top half - the control desk: the control panel (as narrow as on a phone), then the alarm monitor and shift
              log, in the control room */}
          <div className="flex-1 px-3 py-4 sm:p-4 md:p-6 space-y-5 md:space-y-6 bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${controlRoomBackground})`}}>
            <div className="max-w-[28rem] mx-auto">{panel}</div>
            {messages}
          </div>

          <div className="cr-rail" aria-hidden="true" />

          {/* Reactor camera + side panels (WS3 presentation). Medium (md): the camera on top, then the cards and the
              chart recorder side by side, the rod display below the cards and the dosimeter below the chart recorder.
              Phones: stacked, the cards below the chart and the dosimeter last (owner, 2026-10-16). */}
          <div className="w-full cr-monitor-wall px-3 py-5 sm:px-4 md:py-8">
            <div className="mx-auto w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="w-full min-w-0 md:col-span-2 md:row-start-1">
                {camera}
              </div>
              <aside className="w-full min-w-0 max-w-xl md:max-w-none mx-auto md:col-start-2 md:row-start-2" ref={chartRef}>
                {chart}
              </aside>
              <aside className="w-full min-w-0 max-w-xl md:max-w-none mx-auto order-last md:order-none md:col-start-2 md:row-start-3">
                {dosimeter}
              </aside>
              {/* Legasov's red and blue cards (owner, 2026-10-13), then the rod display */}
              <aside className="w-full min-w-0 max-w-xl md:max-w-none mx-auto md:col-start-1 md:row-start-2">
                {cards}
              </aside>
              <aside className="w-full min-w-0 max-w-xl md:max-w-none mx-auto md:col-start-1 md:row-start-3" ref={rodsRef}>
                {rods}
              </aside>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
