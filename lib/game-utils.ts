import { type GameState, type GameOverCause, THRESHOLDS, GAME_MODE_CONFIGS } from "./types"
import { getRodMargin } from "./sim/reactor"

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}


// Every warning condition in one place, so the panel's flashing borders and the message area agree.
export function getWarningFlags(state: GameState) {
  return {
    highRadioactivity: state.radioactivity >= THRESHOLDS.radioactivity.highWarning,
    lowRadioactivity: state.radioactivity <= THRESHOLDS.radioactivity.lowWarning,
    highReactorTemp: state.reactorTemp >= THRESHOLDS.reactorTemp.warning,
    highFuelTemp: state.fuelTemp >= THRESHOLDS.fuelTemp.highWarning,
    lowFuelTemp: state.fuelTemp <= THRESHOLDS.fuelTemp.lowWarning,
    highSteam: state.steamVolume >= THRESHOLDS.steamVolume.highWarning,
    lowSteam: state.steamVolume <= THRESHOLDS.steamVolume.lowWarning,
    highXenon: state.xenon >= THRESHOLDS.xenon.highWarning,
    lowRodMargin: getRodMargin(state.controlRods) < THRESHOLDS.rodMargin.minimum,
    lowPerformance: state.powerTarget !== null && state.performance < 10,
  }
}

export function checkWarnings(state: GameState): string[] {
  const warnings: string[] = []
  const flags = getWarningFlags(state)

  if (flags.highRadioactivity) {
    warnings.push("WARNING: High radioactivity. Reactor temperature expected to spike. Recommend to increase insertion of control rods to reduce radioactivity.")
  }

  if (flags.lowRadioactivity) {
    warnings.push("WARNING: Low radioactivity. Xenon levels are expected to spike, further reducing radioactivity. Recommend reducing control rod insertion to increase radioactivity")
  }

  if (flags.highReactorTemp) {
    warnings.push("WARNING: High reactor temperature. Steam levels and radioactivity expected to spike. Recommend turning on more water pumps to cool reactor")
  }

  if (flags.highFuelTemp) {
    warnings.push("WARNING: High fuel temperature. Radioactivity may drop as a result. Recommend turning on more water pumps to cool fuel")
  }

  if (flags.lowFuelTemp) {
    warnings.push("WARNING: Low fuel temperature. Radiation is expected to spike. Recommended turning off some water pumps to increase reactor and fuel temperature")
  }

  if (flags.highSteam) {
    warnings.push("WARNING: High steam pressure. Disconnect turbine to avoid damage to the transmission infrastructure")
  }

  if (flags.lowSteam) {
    warnings.push("WARNING: Low steam pressure causing reduced power generation. Recommend turning off some water pumps to increase reactor temperature and reducing control rod insertion to increase radioactivity")
  }

  if (flags.highXenon) {
    warnings.push("WARNING: High xenon levels detected, lowering radioactivity. Recommend reducing control rod insertion to increase radioactivity.")
  }

  if (flags.lowRodMargin) {
    warnings.push("WARNING: Rod margin below minimum. Too few control rods in the core: radioactivity is being held by something less reliable than boron. Recommend inserting control rods.")
  }

  if (flags.lowPerformance) {
    warnings.push("WARNING: Our power station is reporting low grid target performance. Review power targets")
  }

  return warnings
}

export const GAME_OVER_REASONS: Record<GameOverCause, string> = {
  meltdown: "MELTDOWN - Reactor temperature has exceeded maximum limits. Uranium fuel is melting down. Initiate emergency stations",
  explosion: "CORE EXPLOSION - Steam pressure has torn the reactor apart. The upper biological shield has been lifted and the core is open to the sky",
  performance: "UNACCEPTABLE POWER GRID PERFORMANCE - You have been removed from your post due to poor performance meeting grid targets",
}

export function checkGameOver(
  state: GameState,
  reactorEnding: GameOverCause | null = null,
): {
  isGameOver: boolean
  cause: GameOverCause | null
  reason: string | null
} {
  const ending = (cause: GameOverCause) => ({ isGameOver: true, cause, reason: GAME_OVER_REASONS[cause] })

  if (reactorEnding) return ending(reactorEnding)
  if (state.steamVolume >= THRESHOLDS.steamVolume.explosion) return ending("explosion")
  if (state.reactorTemp >= THRESHOLDS.reactorTemp.meltdown) return ending("meltdown")

  const modeConfig = GAME_MODE_CONFIGS[state.mode || "easy"] || GAME_MODE_CONFIGS.easy

  if (modeConfig.performanceAffectsGameOver && state.powerTarget !== null && state.performance <= THRESHOLDS.performance.gameOver) {
    return ending("performance")
  }

  return { isGameOver: false, cause: null, reason: null }
}

export function getGlowIntensity(radioactivity: number): number {
  // Returns a value between 0.3 and 1 based on radioactivity (0-500)
  return Math.min(0.3 + (radioactivity / 500) * 0.7, 1)
}
