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
import { useElementHeight, useMediaQuery, usePinnedTop, useViewportHeight } from "@/hooks/use-element-height"

const COLUMN_GAP = 16 // px between the panels in a side column (gap-4)
// From here up the side columns sit either side of the control desk instead of below it
const DESK_PADDING = 24 // px around the desk and its side columns (p-6)
const BESIDE_DESK_QUERY = "(min-width: 1536px)" // Tailwind 2xl

export default function GamePage() {
  const { gameState, isLoaded, updateGameState, resetGame, togglePause } = useGameState()
  // Local state:
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showSoundModal, setShowSoundModal] = useState(false)
  const router = useRouter()
  // The radioactivity balance is as tall as the chart recorder (owner, 2026-10-14)
  const [chartRef, chartHeight] = useElementHeight<HTMLElement>()
  // ...and the dosimeter as tall as the rod display beside it, from medium screens up
  const [rodsRef, rodsHeight] = useElementHeight<HTMLElement>()
  // Wide screens make each side column the camera's height (owner, 2026-10-16): the chart recorder takes whatever the
  // camera leaves after the dosimeter, by shortening its bands (down to half), and the balance follows the recorder.
  const wide = useMediaQuery("(min-width: 1280px)") // Tailwind xl
  // Wider still, the side columns move up beside the control desk, so nothing is below the fold (layout trial)
  const besideDesk = useMediaQuery(BESIDE_DESK_QUERY)
  const [cameraRef, cameraHeight] = useElementHeight<HTMLDivElement>()
  const [doseRef, doseHeight] = useElementHeight<HTMLElement>()
  // Beside the desk, the chart recorder gives way so the camera column is no taller than the desk (or the window)
  const [deskRef, deskHeight] = useElementHeight<HTMLDivElement>()
  const viewportHeight = useViewportHeight()
  const chartFit = !(cameraHeight && doseHeight)
    ? null
    : besideDesk
      ? deskHeight && viewportHeight ? Math.max(deskHeight, viewportHeight - 2 * DESK_PADDING) - 2 * COLUMN_GAP - doseHeight - cameraHeight : null
      : wide ? cameraHeight - COLUMN_GAP - doseHeight : null
  // Wide screens pin both side columns while the page scrolls
  const [leftColumnRef, leftColumnTop] = usePinnedTop<HTMLDivElement>()
  const [rightColumnRef, rightColumnTop] = usePinnedTop<HTMLDivElement>()

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

  // The control desk, and the panels hung beside it (wide screens) or on the monitor wall below it
  const desk = (
    <>
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
    </>
  )
  const camera = (
    <ReactorCamera
      variant="inline"
      radioactivity={gameState.radioactivity}
      reactorTemp={gameState.reactorTemp}
      elapsedSeconds={getShiftElapsedSeconds(gameState.gameTime, gameState.timeLimit, gameState.mode)}
      clockStartMs={getCameraClockStartMs(gameState.mode)}
    />
  )
  const chart = (
    <ChartRecorder
      radioactivity={gameState.radioactivity}
      reactorTemp={gameState.reactorTemp}
      steamVolume={gameState.steamVolume}
      gameTime={gameState.gameTime}
      isPaused={gameState.isPaused}
      fitHeight={chartFit}
    />
  )
  const dosimeter = <Dosimeter radioactivity={gameState.radioactivity} second={gameState.gameTime} matchHeight={besideDesk ? null : rodsHeight} />
  const cards = <ReactivityCards gameState={gameState} height={chartHeight} />
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
      
      {besideDesk ? (
        /* Wide screens (layout trial): the control desk in the middle at its usual max width, the balance and the rod
           display to its left, the chart recorder, camera and dosimeter to its right, all scrolling with the page.
           The chart recorder shortens its bands so that column is no taller than the desk or the window, and the
           balance stays as tall as the chart. Each side column takes what the desk leaves, between 17rem and 26rem;
           the desk gives way first, down to the breakpoint. */
        <div className="flex-1 p-6 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${controlRoomBackground})` }}>
          <div className="grid gap-4 items-start justify-center grid-cols-[clamp(17rem,calc((100%_-_74rem)/2),26rem)_minmax(0,72rem)_clamp(17rem,calc((100%_-_74rem)/2),26rem)]">
            <div className="col-start-2 row-start-1 min-w-0 space-y-6" ref={deskRef}>{desk}</div>
            <div className="col-start-1 row-start-1 flex flex-col gap-4 min-w-0">
              <aside className="min-w-0">{cards}</aside>
              <aside className="min-w-0" ref={rodsRef}>{rods}</aside>
            </div>
            <div className="col-start-3 row-start-1 flex flex-col gap-4 min-w-0">
              <aside className="min-w-0" ref={chartRef}>{chart}</aside>
              <div className="min-w-0" ref={cameraRef}>{camera}</div>
              <aside className="min-w-0" ref={doseRef}>{dosimeter}</aside>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top Half - the control desk: control panel, then the alarm monitor and shift log, in the control room */}
          <div className="flex-1 px-3 py-4 sm:p-4 md:p-6 space-y-5 md:space-y-6 bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${controlRoomBackground})`}}>
            {desk}
          </div>

          <div className="cr-rail" aria-hidden="true" />

          {/* Reactor camera + side panels (WS3 presentation).
              Wide screens (xl): three columns, so the camera sits on the control panel's centre line (same max width),
              with the red and blue cards to its left and the chart recorder to its right. Each side column is a quarter
              of the row (half the camera's width, so never wider or taller than the camera) between 18rem and 36rem;
              the row stops growing at 36 + 72 + 36rem plus the gaps, for very wide screens (owner, 2026-10-14).
              Medium (md): the camera on top, then the cards and the chart recorder side by side. Phones: stacked, the
              cards below the chart. The rod display sits below the cards and the dosimeter below the chart recorder, each
              at the same width; on phones the dosimeter comes last (owner, 2026-10-16). Each side column is one pinned
              stack on wide screens; below that its wrapper is `contents`, so each panel is placed in the grid itself. */}
          <div className="w-full cr-monitor-wall px-3 py-5 sm:px-4 md:py-8">
            <div className="mx-auto w-full max-w-6xl xl:max-w-[146rem] grid grid-cols-1 md:grid-cols-2 gap-4 items-start xl:grid-cols-[clamp(18rem,calc((100%_-_2rem)/4),36rem)_minmax(0,72rem)_clamp(18rem,calc((100%_-_2rem)/4),36rem)]">
              <div className="w-full min-w-0 max-w-6xl mx-auto md:col-span-2 md:row-start-1 xl:col-span-1 xl:col-start-2 xl:row-start-1" ref={cameraRef}>
                {camera}
              </div>
              <div className="contents xl:flex xl:flex-col xl:gap-4 xl:col-start-3 xl:row-start-1 xl:sticky xl:w-full xl:min-w-0" ref={rightColumnRef} style={{ top: rightColumnTop }}>
                <aside className="w-full min-w-0 max-w-xl md:max-w-none mx-auto xl:mx-0 md:col-start-2 md:row-start-2" ref={chartRef}>
                  {chart}
                </aside>
                <aside className="w-full min-w-0 max-w-xl md:max-w-none mx-auto xl:mx-0 order-last md:order-none md:col-start-2 md:row-start-3" ref={doseRef}>
                  {dosimeter}
                </aside>
              </div>
              {/* Legasov's red and blue cards (owner, 2026-10-13), then the rod display */}
              <div className="contents xl:flex xl:flex-col xl:gap-4 xl:col-start-1 xl:row-start-1 xl:sticky xl:w-full xl:min-w-0" ref={leftColumnRef} style={{ top: leftColumnTop }}>
                <aside className="w-full min-w-0 max-w-xl md:max-w-none mx-auto xl:mx-0 md:col-start-1 md:row-start-2">
                  {cards}
                </aside>
                <aside className="w-full min-w-0 max-w-xl md:max-w-none mx-auto xl:mx-0 md:col-start-1 md:row-start-3" ref={rodsRef}>
                  {rods}
                </aside>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
