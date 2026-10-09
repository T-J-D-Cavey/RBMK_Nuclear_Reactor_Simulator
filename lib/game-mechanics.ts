import { type GameOverCause, type GameState, THRESHOLDS, getPowerTolerance } from "./types"
import { advanceReactor, getRodMargin } from "./sim/reactor"
import type { Rng } from "./sim/rng"

export interface TickResult {
  updates: Partial<GameState>
  ending: GameOverCause | null
}

// One second of game time. The reactor physics live in lib/sim (see ai/implementation-plan.md).
export function calculateGameTick(state: GameState, rng: Rng = Math.random): TickResult {
  if (state.isPaused || state.isGameOver) {
    return { updates: {}, ending: null }
  }

  const physics = advanceReactor(state, rng)
  let newState = physics.state

  newState = calculatePower(newState)
  newState = calculatePerformance(newState)
  newState = updateStats(newState)

  return { updates: newState, ending: physics.ending }
}

function calculatePower(state: GameState): GameState {
  // Power Output = Steam Volume × 50, only while the turbine feeds the grid (bible §8)
  const newPowerOutput = state.turbineMode === "grid" ? state.steamVolume * 50 : 0

  return { ...state, powerOutput: newPowerOutput, turbineConnected: state.turbineMode === "grid" }
}

export function isPowerOnTarget(state: Pick<GameState, "powerOutput" | "powerTarget">): boolean {
  if (state.powerTarget === null) return true
  const tolerance = getPowerTolerance(state.powerTarget)
  return Math.abs(state.powerOutput - state.powerTarget) <= tolerance
}

function calculatePerformance(state: GameState): GameState {
  // If mode does not use power targets (Free Mode), maintain 100% performance
  if (state.powerTarget === null) {
    return { ...state, performance: 100 }
  }

  // Within ±10% of target (never tighter than ±200 MW): +1% every 5 seconds, otherwise -1% every 5 seconds
  const performanceChange = isPowerOnTarget(state) ? 0.2 : -0.2

  const newPerformance = Math.max(0, Math.min(100, state.performance + performanceChange))

  return { ...state, performance: newPerformance }
}

export function isInDanger(state: GameState): boolean {
  return (
    state.radioactivity >= THRESHOLDS.radioactivity.highWarning ||
    state.reactorTemp >= THRESHOLDS.reactorTemp.warning ||
    state.steamVolume >= THRESHOLDS.steamVolume.highWarning
  )
}

function updateStats(state: GameState): GameState {
  const stats = state.stats
  return {
    ...state,
    stats: {
      ...stats,
      peakRadioactivity: Math.max(stats.peakRadioactivity, state.radioactivity),
      peakReactorTemp: Math.max(stats.peakReactorTemp, state.reactorTemp),
      peakSteam: Math.max(stats.peakSteam, state.steamVolume),
      lowestRodMargin: Math.min(stats.lowestRodMargin, getRodMargin(state.controlRods)),
      secondsInDanger: stats.secondsInDanger + (isInDanger(state) ? 1 : 0),
    },
  }
}
