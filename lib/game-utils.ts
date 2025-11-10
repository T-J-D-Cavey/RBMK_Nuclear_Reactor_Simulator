import { type GameState, type ControlRod, THRESHOLDS } from "./types"

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export function getRadioactivityFromRods(rods: ControlRod[]): number {
  let totalChange = 0

  rods.forEach((rod) => {
    const insertion = rod.insertion

    if (insertion > 0 && insertion <= 5) {
      // Graphite tips only - increases radioactivity
      totalChange += 4
    } else if (insertion > 5) {
    // Boron dominant - decreases radioactivity
      totalChange -= insertion * 0.2
    } else {
      // No insertion, no affect
      totalChange += 0
    }
  })

  return totalChange
}

export function checkWarnings(state: GameState): string[] {
  const warnings: string[] = []

  if (state.radioactivity >= THRESHOLDS.radioactivity.highWarning) {
    warnings.push("WARNING: High radioactivity. Reactor temperature expected to spike. Recommend to increase insertion of control rods to reduce radioactivity.")
  }

  if (state.radioactivity <= THRESHOLDS.radioactivity.lowWarning) {
    warnings.push("WARNING: Low radioactivity. Xenon levels are expected to spike, further reducing radioactivity. Recommend reducing control rod insertion to increase radioactivity")
  }

  if (state.reactorTemp >= THRESHOLDS.reactorTemp.warning) {
    warnings.push("WARNING: High reactor temperature. Steam levels and radioactivity expected to spike. Recommend turning on more water pumpts to cool reactor")
  }

  if (state.fuelTemp >= THRESHOLDS.fuelTemp.highWarning) {
    warnings.push("WARNING: High fuel temperature. Radioactivity may drop as a result. Recommend turning on more water pumpts to cool fuel")
  }

  if (state.fuelTemp <= THRESHOLDS.fuelTemp.lowWarning) {
    warnings.push("WARNING: Low fuel temperature. Radiation is expected to spike. Recommended turning off some water pumps to increase reactor and fuel temperature")
  }

  if (state.steamVolume >= THRESHOLDS.steamVolume.highWarning) {
    warnings.push("WARNING: High steam pressure. Please disconnect turbine to avoid damage to the transmission infrastructure")
  }

  if (state.steamVolume <= THRESHOLDS.steamVolume.lowWarning) {
    warnings.push("WARNING: Low steam pressure causing reduced power generation. Recommend turning off some water pumps to increase reactor temperature and reducing control rod insertion to increase radioactivity")
  }

  if (state.performance < 50) {
    warnings.push("WARNING: Our power station is reporting low grid target performance. Review power targets")
  }

  return warnings
}

export function checkGameOver(state: GameState): {
  isGameOver: boolean
  reason: string | null
} {
  if (state.reactorTemp >= THRESHOLDS.reactorTemp.meltdown) {
    return {
      isGameOver: true,
      reason: "MELTDOWN - Reactor temperature exceeded safe limits",
    }
  }

  if (state.performance <= THRESHOLDS.performance.gameOver) {
    return {
      isGameOver: true,
      reason: "PERFORMANCE FAILURE - Unable to meet power requirements",
    }
  }

  return { isGameOver: false, reason: null }
}

export function getGlowIntensity(radioactivity: number): number {
  // Returns a value between 0.3 and 1 based on radioactivity (0-500)
  return Math.min(0.3 + (radioactivity / 500) * 0.7, 1)
}
