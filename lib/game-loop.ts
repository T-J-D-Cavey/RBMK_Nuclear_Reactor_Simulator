// One second of the whole game: reactor physics, the clock, events (or the Safety Test script), warnings
// and endings. Pure, so the React hook and the scenario harness (scripts/sim) run exactly the same loop.
import { type GameMode, type GameState, GAME_MODE_CONFIGS, INITIAL_GAME_STATE } from "./types"
import { calculateGameTick } from "./game-mechanics"
import { checkEventWarnings, checkGameOver, checkWarnings } from "./game-utils"
import { applyPendingTarget, checkTurbineTrip, expireEvents, runShiftEvents } from "./game-events"
import { runSafetyTest } from "./safety-test"
import type { Rng } from "./sim/rng"

// A fresh game in the given mode. Events are planned on the first tick.
export function createNewGame(mode: GameMode): GameState {
  const config = GAME_MODE_CONFIGS[mode] ?? GAME_MODE_CONFIGS.easy
  return {
    ...structuredClone(INITIAL_GAME_STATE),
    mode: config.id,
    difficultyIsHard: config.id === "hard",
    timeLimit: config.timeLimit,
    gameTime: config.hasTimer ? (config.timeLimit ?? 900) : 0,
    powerTarget: config.defaultPowerTarget,
  }
}

export function advanceGame(prev: GameState, rng: Rng = Math.random): GameState {
  if (prev.isPaused || prev.isGameOver || prev.hasWon) return prev
  const config = GAME_MODE_CONFIGS[prev.mode] ?? GAME_MODE_CONFIGS.easy

  const { updates, ending } = calculateGameTick(prev, rng)

  // Countdown for timed modes, count-up for Free mode
  const isCountUp = config.timerMode === "countup"
  const gameTime = isCountUp ? prev.gameTime + 1 : Math.max(0, prev.gameTime - 1)
  let s: GameState = { ...prev, ...updates, gameTime }

  // Victory: the shift's countdown reached zero (a disaster in the final second still counts)
  if (!ending && !isCountUp && config.hasTimer && gameTime === 0) {
    return { ...s, hasWon: true, isPaused: true }
  }

  s = expireEvents(s)
  s = checkTurbineTrip(s)
  s = applyPendingTarget(s)
  s = s.mode === "safety_test" ? runSafetyTest(s) : runShiftEvents(s, rng)

  // Both kinds of warning, so the general alarm sounds for either
  s = { ...s, warnings: [...checkWarnings(s), ...checkEventWarnings(s)] }

  const gameOver = checkGameOver(s, ending)
  if (gameOver.isGameOver) {
    s = { ...s, isGameOver: true, gameOverReason: gameOver.reason, gameOverCause: gameOver.cause }
  }
  return s
}
