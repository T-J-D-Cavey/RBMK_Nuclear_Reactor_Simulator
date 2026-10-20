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
  // A runaway during the test made the test supervisor scrap it, so it never completed
  const testOutcome = gameState.testScrapped ? "Test scrapped" : "Test complete"

  return (
    <EndScreen
      kind="success"
      gameState={gameState}
      title={isTest ? "Unit 4 Survives" : "Shift Complete"}
      message={
        isTest
          ? gameState.testScrapped
            ? "Rundown test scrapped. Reactor stable."
            : "Rundown test complete. Reactor stable."
          : "Reactor stable. Hand over to the next shift."
      }
      lead={isTest ? "On the real night, the same test ended in disaster." : "Good work, comrade."}
      report={
        <IncidentReport
          gameState={gameState}
          title={isTest ? "Test report" : "Shift report"}
          stamp={isTest ? testOutcome : "Shift complete"}
          stampClassName="text-emerald-800"
        />
      }
    />
  )
}
