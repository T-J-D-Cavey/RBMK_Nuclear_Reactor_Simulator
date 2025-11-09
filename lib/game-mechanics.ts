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

  // Uranium fuel is naturally radioactive and always produces baseline radioactivity
  radioactivityChange += 0.15 // Constant baseline positive radioactivity

  radioactivityChange += getRadioactivityFromRods(state.controlRods) * 0.05

  // Fuel Temperature affects radioactivity (inverse/slow)
  // Higher fuel temp reduces radioactivity
  if (state.fuelTemp > 700 && state.fuelTemp < 900) {
    radioactivityChange -= (state.fuelTemp - 700) * 0.01
  }
  if (state.fuelTemp >= 900) {
    radioactivityChange -= (state.fuelTemp - 900) * 0.05
  }
  // Lower fuel temp increases radioactivity
  if (state.fuelTemp < 200 && state.fuelTemp > 90) {
    radioactivityChange += (200 - state.fuelTemp) * 0.01
  }
  if (state.fuelTemp <= 90) {
    radioactivityChange += (90 - state.fuelTemp) * 0.05
  }

  // Xenon affects radioactivity (inverse/fast)
  // Higher xenon reduces radioactivity
  radioactivityChange -= state.xenon * 0.01

  // Steam Volume affects radioactivity (direct/quick)
  // High steam slightly increases radioactivity
  if (state.steamVolume > 20) {
    radioactivityChange += (state.steamVolume) * 0.02
  }

  const newRadioactivity = Math.max(0, Math.min(400, state.radioactivity + radioactivityChange))

  return { ...state, radioactivity: newRadioactivity }
}

function calculateTemperatures(state: GameState): GameState {
  let reactorTempChange = 0
  let fuelTempChange = 0

  reactorTempChange -= 0.1 // This ensures the temp seeks to drop even if all the pumps are off, as long as there is no radioactivity

  // Radioactivity affects Reactor Temp (direct/quick)
  // Higher radioactivity increases reactor temp
  reactorTempChange += state.radioactivity * 0.02

  // Water Pumps affect Reactor Temp (inverse/quick)
  // Each pump reduces temp when ON and POWERED
  const activePumps = state.waterPumps.filter((pump) => pump.on && pump.powered)
  reactorTempChange -= activePumps.length

  // Reactor Temp affects Fuel Temp (direct/slow)
  // Tim: replacing this code with logic below:
  /*
  if (state.reactorTemp > 90) {
    fuelTempChange += (state.reactorTemp - 90) * 0.005
  } else {
    // Cool down fuel temp if reactor is cool
    fuelTempChange -= (90 - state.reactorTemp) * 0.5
  }
  */
  // New logic:
  // Calculate the difference between the two temperatures
  const tempGap = state.reactorTemp - state.fuelTemp 

  // Use a small coefficient (0.005) to simulate slow thermal transfer (lag)
  // The fuel temperature moves only 0.5% closer to the reactor temperature each second.
  const THERMAL_TRANSFER_RATE = 0.005 
  fuelTempChange = tempGap * THERMAL_TRANSFER_RATE

  const newReactorTemp = Math.max(0, state.reactorTemp + reactorTempChange)
  const newFuelTemp = Math.max(0, Math.min(1000, state.fuelTemp + fuelTempChange))

  return { ...state, reactorTemp: newReactorTemp, fuelTemp: newFuelTemp }
}

/*
Tim: Hiding this whilst I try an alternative: 
function calculateSteam(state: GameState): GameState {
  let steamChange = 0

  // Reactor Temp affects Steam Volume (direct/quick)
  // The rate of change is proportional to the square of reactor temp above threshold
  if (state.reactorTemp >= 90) {
    const tempFactor = (state.reactorTemp - 90) / 100
    steamChange += Math.pow(tempFactor, 2) * 0.01
  } else {
    // Steam decreases if reactor is below production threshold
    steamChange -= (90 - state.reactorTemp) * 0.01
  }

  const newSteam = Math.max(0, Math.min(200, state.steamVolume + steamChange))

  return { ...state, steamVolume: newSteam }
}
*/

function calculateSteam(state: GameState): GameState {
  let steamChange = 0;
  const temp = state.reactorTemp;

  // --- Tier 1: Below Cold Threshold (Temp < 90) - RAPID DECREASE ---
  if (temp < 90) {
    // Steam rapidly condenses when the reactor is cold.
    steamChange -= (90 - temp) * 0.5;

  // --- Tier 2: Operational Zone (90 <= Temp <= 800) - QUICK CHASE TARGET ---
  // Tim: this will break if the thresholds are adjusted. Current reactor temp warning threshold is 800:
  } else {
    
    // 1. Calculate the ideal STEAM volume for the current temperature.
    // We'll define the linear relationship:
    // Temp 90  -> Target Steam 0
    // Temp 800 -> Target Steam 400 (A high, but non-max value for the operational zone)
    
    const MIN_TEMP = 90;
    const MAX_OPERATIONAL_TEMP = 800;
    const MAX_OPERATIONAL_STEAM = 300; // Define max steam capacity for the operational range

    // Normalized ratio of temperature within the operational range (0 to 1)
    const tempRatio = (temp - MIN_TEMP) / (MAX_OPERATIONAL_TEMP - MIN_TEMP); 
    
    // Target steam volume for this exact temperature
    const steamTarget = Math.max(0, tempRatio * MAX_OPERATIONAL_STEAM);

    // 2. Calculate the difference (the gap we need to close)
    const steamGap = steamTarget - state.steamVolume;

    // 3. Apply Aggressive Correction (0.5 means 50% of the gap is closed per second)
    const CHASE_RATE = 0.5; 
    steamChange = steamGap * CHASE_RATE;

  } 

  // Max steam volume is 600 units
  const MAX_STEAM = 600; 
  const newSteam = Math.max(0, Math.min(MAX_STEAM, state.steamVolume + steamChange));

  return { ...state, steamVolume: newSteam };
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
    performanceChange = 0.2 // +1% every 5 seconds
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
  if (state.radioactivity <= 10) {
    xenonChange += 1
  }

  if (state.radioactivity > 10 && state.radioactivity <= 50) {
    xenonChange += 0.01
  }

  // Xenon Reduction: Decreases when radioactivity > 150
  if (state.radioactivity > 150) {
    if (state.radioactivity > 250) {
      // Faster reduction if radioactivity > 250
      xenonChange -= 1
    } else {
      xenonChange -= 0.01
    }
  }

  const newXenon = Math.max(0, Math.min(200, state.xenon + xenonChange))

  return { ...state, xenon: newXenon }
}
