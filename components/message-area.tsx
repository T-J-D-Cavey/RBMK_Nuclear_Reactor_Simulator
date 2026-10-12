"use client"

import { GAME_MODE_CONFIGS, type GameState } from "@/lib/types"
import { getEventWarnings, getReactorWarnings } from "@/lib/game-utils"
import AlarmScreen from "@/components/alarm-screen"
import ShiftLogPrinter from "@/components/shift-log-printer"

interface MessageAreaProps {
  gameState: GameState
}

// Two machines, one for each kind of message (owner, 2026-10-12), always stacked:
// - the plant computer's alarm monitor: computer-generated warnings about the reactor and the shift, typed out
//   on a green screen;
// - the shift log teleprinter: messages from people, printed on paper with the newest at the top. In the
//   Safety Test it is the test procedure.
// Each collapses on its own, so an experienced player can hide the warnings and keep the log (plan §11.1).
export default function MessageArea({ gameState }: MessageAreaProps) {
  const warnings = [...getReactorWarnings(gameState), ...getEventWarnings(gameState)]
  const showLog = gameState.log.length > 0 || gameState.mode === "safety_test" || GAME_MODE_CONFIGS[gameState.mode]?.hasRandomEvents

  return (
    <div className="border-y-4 border-primary bg-card p-3 md:p-4">
      <div className="max-w-6xl mx-auto space-y-3">
        <AlarmScreen warnings={warnings} />
        {showLog && <ShiftLogPrinter gameState={gameState} />}
      </div>
    </div>
  )
}
