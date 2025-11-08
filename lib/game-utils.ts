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
    // (Tim: below it was "totalChange -= (insertion -10) * 0.2"
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

  if (state.radioactivity >= THRESHOLDS.radioactivity.warning) {
    warnings.push("HIGH RADIOACTIVITY")
  }

  if (state.reactorTemp >= THRESHOLDS.reactorTemp.warning) {
    warnings.push("HIGH REACTOR TEMPERATURE")
  }

  if (state.fuelTemp >= THRESHOLDS.fuelTemp.warning) {
    warnings.push("HIGH FUEL TEMPERATURE")
  }

  if (state.steamVolume >= THRESHOLDS.steamVolume.warning) {
    warnings.push("HIGH STEAM PRESSURE")
  }

  if (state.performance < 50) {
    warnings.push("LOW PERFORMANCE")
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
