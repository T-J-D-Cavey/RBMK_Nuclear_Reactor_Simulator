"use client"

import type { GameState } from "@/lib/types"
import EndScreen from "./end-screen"
import IncidentReport from "./incident-report"

interface SuccessScreenProps {
  gameState: GameState
  onReset: () => void
}

export function SuccessScreen({ gameState }: SuccessScreenProps) {
  const isTest = gameState.mode === "safety_test"

  return (
    <EndScreen
      kind="success"
      gameState={gameState}
      title={isTest ? "Unit 4 Survives" : "Shift Complete"}
      message={isTest ? "Rundown test complete. Reactor stable." : "Reactor stable. Hand over to the next shift."}
      lead={isTest ? "On the real night, the same test ended in disaster." : "Good work, comrade."}
      report={
        <IncidentReport
          gameState={gameState}
          title={isTest ? "Test report" : "Shift report"}
          stamp={isTest ? "Test complete" : "Shift complete"}
          stampClassName="text-emerald-800"
        />
      }
    />
  )
}
