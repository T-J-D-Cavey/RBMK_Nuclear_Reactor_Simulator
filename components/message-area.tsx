"use client"

import type { GameState } from "@/lib/types"
import { getEventWarnings, getReactorWarnings } from "@/lib/game-utils"
import AlarmScreen from "@/components/alarm-screen"
import ShiftLogPrinter from "@/components/shift-log-printer"

interface MessageAreaProps {
  gameState: GameState
  // The header's "See Warning" / "See Message" keys bump these to bring a machine into view (plan §21.5)
  alarmRevealSignal?: number
  logRevealSignal?: number
  onLogInView?: (inView: boolean) => void
  wide?: boolean // the dashboard runs it the full width of the page, instead of at most 72rem
}

// Two machines, one for each kind of message (owner, 2026-10-12), always stacked:
// - the plant computer's alarm monitor: computer-generated warnings about the reactor and the shift, typed out
//   on a green screen;
// - the shift log teleprinter: messages from people, printed on paper with the newest at the top, in every
//   mode including the Safety Test.
// Each collapses on its own, so an experienced player can hide the warnings and keep the log (plan §11.1).
export default function MessageArea({ gameState, alarmRevealSignal, logRevealSignal, onLogInView, wide = false }: MessageAreaProps) {
  const warnings = [...getReactorWarnings(gameState), ...getEventWarnings(gameState)]

  return (
    <div className={`${wide ? "" : "max-w-6xl"} mx-auto cr-panel cr-screws p-3 sm:p-4 md:px-6 space-y-3`}>
      <AlarmScreen warnings={warnings} revealSignal={alarmRevealSignal} />
      <ShiftLogPrinter gameState={gameState} revealSignal={logRevealSignal} onInView={onLogInView} />
    </div>
  )
}
