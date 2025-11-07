import { type GameState, THRESHOLDS } from "./types"
import { getRadioactivityFromRods } from "./game-utils"

export function calculateGameTick(state: GameState): Partial<GameState> {
  if (state.isPaused || state.isGameOver) {
    return {}
  }

  let newState = { ...state }

  // 1. Calculate radioactivity changes
  newState = calculateRadioactivity(newState)

  // 2. Calculate temperature changes
  newState = calculateTemperatures(newState)

  // 3. Calculate steam changes
  newState = calculateSteam(newState)

  // 4. Calculate power output
  newState = calculatePower(newState)

  // 5. Calculate performance
  newState = calculatePerformance(newState)

  // 6. Calculate xenon changes
  newState = calculateXenon(newState)

  return newState
}

function calculateRadioactivity(state: GameState): GameState {
  let radioactivityChange = 0

  // Control Rods affect radioactivity (inverse/quick)
  radioactivityChange += getRadioactivityFromRods(state.controlRods)

  // Fuel Temperature affects radioactivity (inverse/slow)
  // Higher fuel temp reduces radioactivity
  if (state.fuelTemp > 100) {
    radioactivityChange -= (state.fuelTemp - 100) * 0.05
  }

  // Xenon affects radioactivity (inverse/slow)
  // Higher xenon reduces radioactivity
  radioactivityChange -= state.xenon * 0.08

  // Steam Volume affects radioactivity (direct/quick)
  // High steam slightly increases radioactivity
  if (state.steamVolume > 50) {
    radioactivityChange += (state.steamVolume - 50) * 0.3
  }

  const newRadioactivity = Math.max(0, state.radioactivity + radioactivityChange)

  return { ...state, radioactivity: newRadioactivity }
}

function calculateTemperatures(state: GameState): GameState {
  let reactorTempChange = 0
  let fuelTempChange = 0

  // Radioactivity affects Reactor Temp (direct/quick)
  // Higher radioactivity increases reactor temp
  reactorTempChange += state.radioactivity * 0.7

  // Water Pumps affect Reactor Temp (inverse/moderate)
  // Each pump reduces temp when ON and POWERED
  const activePumps = state.waterPumps.filter((pump) => pump.on && pump.powered)
  reactorTempChange -= activePumps.length * 0.5

  // Reactor Temp affects Fuel Temp (direct/slow)
  // High reactor temp slowly increases fuel temp
  if (state.reactorTemp > 200) {
    fuelTempChange += (state.reactorTemp - 200) * 0.02
  } else {
    // Cool down fuel temp if reactor is cool
    fuelTempChange -= (200 - state.reactorTemp) * 0.01
  }

  const newReactorTemp = Math.max(0, state.reactorTemp + reactorTempChange)
  const newFuelTemp = Math.max(0, Math.min(1000, state.fuelTemp + fuelTempChange))

  return { ...state, reactorTemp: newReactorTemp, fuelTemp: newFuelTemp }
}

function calculateSteam(state: GameState): GameState {
  let steamChange = 0

  // Reactor Temp affects Steam Volume (direct/very quick/exponential)
  // The rate of change is proportional to the square of reactor temp
  if (state.reactorTemp > 200) {
    const tempFactor = (state.reactorTemp - 200) / 100
    steamChange += Math.pow(tempFactor, 2) * 2
  } else {
    // Steam decreases if reactor is cool
    steamChange -= (200 - state.reactorTemp) * 0.05
  }

  const newSteam = Math.max(0, Math.min(200, state.steamVolume + steamChange))

  return { ...state, steamVolume: newSteam }
}

function calculatePower(state: GameState): GameState {
  // Power Output = Steam Volume × 50 (if turbine connected)
  const newPowerOutput = state.turbineConnected ? state.steamVolume * 50 : 0

  return { ...state, powerOutput: newPowerOutput }
}

function calculatePerformance(state: GameState): GameState {
  let performanceChange = 0

  // Check if power output is within ±5% of target
  const tolerance = state.powerTarget * THRESHOLDS.powerTolerance
  const lowerBound = state.powerTarget - tolerance
  const upperBound = state.powerTarget + tolerance

  if (state.powerOutput >= lowerBound && state.powerOutput <= upperBound) {
    // Within range: increase performance
    performanceChange = 0.1 // +1% every 10 seconds
  } else {
    // Outside range: decrease performance
    performanceChange = -0.2 // -1% every 5 seconds
  }

  const newPerformance = Math.max(0, Math.min(100, state.performance + performanceChange))

  return { ...state, performance: newPerformance }
}

function calculateXenon(state: GameState): GameState {
  let xenonChange = 0

  // Xenon Generation: Produced only when radioactivity < 50
  if (state.radioactivity < 50) {
    xenonChange += 0.5
  }

  // Xenon Reduction: Decreases when radioactivity > 150
  if (state.radioactivity > 150) {
    if (state.radioactivity > 250) {
      // Faster reduction if radioactivity > 250
      xenonChange -= 1.5
    } else {
      xenonChange -= 0.8
    }
  }

  const newXenon = Math.max(0, Math.min(200, state.xenon + xenonChange))

  return { ...state, xenon: newXenon }
}
