"use client"
import type { GameState } from "@/lib/types"
import EndScreen from "./end-screen"
import IncidentReport from "./incident-report"

interface GameOverScreenProps {
  gameState: GameState
  onReset: () => void
}

// A separate presentation for each way the shift can end badly (bible §11, §15).
const ENDINGS = {
  meltdown: {
    title: "Meltdown",
    stamp: "Meltdown",
    lead: undefined,
  },
  explosion: {
    title: "Core Explosion",
    stamp: "Core destroyed",
    lead: "The runaway ended the way it did on 26 April 1986.",
  },
  performance: {
    title: "Removed from Post",
    stamp: "Dismissed",
    lead: "By order of Deputy Chief Engineer, you are relieved of duty.",
  },
} as const

export default function GameOverScreen({ gameState }: GameOverScreenProps) {
  const cause = gameState.gameOverCause ?? (gameState.gameOverReason?.includes("MELTDOWN") ? "meltdown" : "performance")
  const ending = ENDINGS[cause]

  return (
    <EndScreen
      kind={cause}
      gameState={gameState}
      title={ending.title}
      message={gameState.gameOverReason ?? ending.title}
      lead={ending.lead}
      report={
        <IncidentReport
          gameState={gameState}
          title="Incident report"
          stamp={ending.stamp}
          stampClassName={cause === "performance" ? "text-neutral-700" : "text-red-700"}
        />
      }
    />
  )
}
