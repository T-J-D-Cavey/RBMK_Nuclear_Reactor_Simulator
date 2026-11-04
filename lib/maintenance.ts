// The machines' maintenance jobs (ai/machine-maintenance-plan.md): occasional work that keeps a machine at its best.
// Left alone, each penalty stops at a limit and nothing ever stops working. Pure, so the game and the bot share it.
import type { GameState } from "./types"
import { addLog } from "./game-utils"
import { MAINTENANCE_TUNING } from "./sim/tuning"

const TURBINE_OPERATOR = "TURBINE OPERATOR"

// What the turbine makes of its steam: air in the condenser costs output, not the pumps it can power (plan §3)
export const vacuumOutputFactor = (vacuum: number) => 1 - MAINTENANCE_TUNING.vacuumOutputLoss * (1 - vacuum)

// Pressing at full vacuum or during a recovery does nothing, in any turbine mode
export const canRunEjector = (s: Pick<GameState, "vacuum" | "ejectorSeconds">) => s.vacuum < 1 && s.ejectorSeconds === 0

export const runEjector = (s: Pick<GameState, "vacuum" | "ejectorSeconds">): Pick<GameState, "ejectorSeconds"> | null =>
  canRunEjector(s) ? { ejectorSeconds: MAINTENANCE_TUNING.ejectorRecoverySeconds } : null

// Air leaks in steadily whatever the turbine is doing, and the ejector clears it in the same time from any reading
function advanceVacuum(s: GameState): GameState {
  if (s.ejectorSeconds > 0) {
    return { ...s, vacuum: s.vacuum + (1 - s.vacuum) / s.ejectorSeconds, ejectorSeconds: s.ejectorSeconds - 1 }
  }
  return { ...s, vacuum: Math.max(0, s.vacuum - 1 / MAINTENANCE_TUNING.vacuumFallSeconds) }
}

// One message at the worst reading, and another only after the ejector has been run
function reportVacuum(s: GameState): GameState {
  if (s.vacuum > 0) return s.vacuumReported ? { ...s, vacuumReported: false } : s
  if (s.vacuumReported) return s
  return addLog({ ...s, vacuumReported: true }, "engineer", "Condenser vacuum is at its worst. We're losing output until the air ejector is run.", TURBINE_OPERATOR)
}

// One second of the machines' clocks
export function advanceMaintenance(s: GameState): GameState {
  return reportVacuum(advanceVacuum(s))
}
