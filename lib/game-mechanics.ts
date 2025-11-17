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
  radioactivityChange += 2 // Constant baseline positive radioactivity

  radioactivityChange += getRadioactivityFromRods(state.controlRods) * 0.05

  // Fuel Temperature affects radioactivity (inverse/slow)
  // Higher fuel temp reduces radioactivity
  if (state.fuelTemp > 700) {
    radioactivityChange -= (state.fuelTemp - 700) * 0.01
  }
  // Lower fuel temp increases radioactivity
  if (state.fuelTemp < 120 && state.fuelTemp > 50) {
    radioactivityChange += (120 - state.fuelTemp) * 0.01
  }
  if (state.fuelTemp <= 50) {
    radioactivityChange += (50 - state.fuelTemp) * 0.19
  }

  // Xenon affects radioactivity (inverse/fast)
  // Higher xenon reduces radioactivity
  radioactivityChange -= state.xenon * 0.065

  // Steam Volume affects radioactivity (direct/quick)
  // High steam slightly increases radioactivity
  if (state.steamVolume > 20) {
    radioactivityChange += (state.steamVolume) * 0.02
  }

  const newRadioactivity = Math.max(0, Math.min(1000, state.radioactivity + radioactivityChange))

  return { ...state, radioactivity: newRadioactivity }
}

function calculateTemperatures(state: GameState): GameState {
    let reactorTempChange = 0
    let fuelTempChange = 0
    const R = state.radioactivity;

    // Generate a random ambient sea temperature between 1 and 5 degrees Celsius
    // This value represents the lowest temperature the reactor can naturally cool to.
    const AMBIENT_SEA_TEMP = Math.floor(Math.random() * 4) + 1; // Random integer between 1 and 5

    // 1. DYNAMIC PASSIVE COOLING (Faster at higher temps, slows as it approaches ambient)
    // Cooling rate is proportional to the temperature difference from ambient.
    // Max cooling rate capped for realism and to ensure meltdown is possible.
    const MAX_PASSIVE_COOLING_RATE = 3; // Maximum temp decrease per second (e.g., 2 units/sec)
    const COOLING_COEFFICIENT = 0.0003; // Adjust this to fine-tune how quickly it cools down

    if (state.reactorTemp > AMBIENT_SEA_TEMP) {
        const tempDifference = state.reactorTemp - AMBIENT_SEA_TEMP;
        // The cooling rate increases with tempDifference, capped at MAX_PASSIVE_COOLING_RATE
        reactorTempChange -= Math.min(tempDifference * COOLING_COEFFICIENT, MAX_PASSIVE_COOLING_RATE);
    }
    // If reactorTemp is at or below ambient, it won't naturally cool further.
    // It might even slightly warm up towards ambient if below it, but we handle the floor later.


    // 2. RADIOACTIVE HEATING (4-Tier Continuous Scaling Logic) - UNCHANGED from your logic
    let R_heat_factor = 0;

    const THRESHOLD_1 = 50;  // Tier 1/2 transition (Rate increases from 0.01 to 0.021)
    const THRESHOLD_2 = 150; // Tier 2/3 transition (Rate increases from 0.021 to 0.03)
    const THRESHOLD_3 = 250; // Tier 3/4 transition (Rate increases from 0.03 to 0.09)

    // --- TIER 1 BASELINE (R up to 50: Rate 0.01) ---
    if (R <= THRESHOLD_1) {
        R_heat_factor = R * 0.01;
    } else {
        R_heat_factor = THRESHOLD_1 * 0.01;
    }

    // --- TIER 2 ACCELERATION (R > 50: Total Rate 0.021) ---
    if (R > THRESHOLD_1) {
        const R_excess_1 = Math.min(R, THRESHOLD_2) - THRESHOLD_1;
        R_heat_factor += R_excess_1 * 0.032;
    }

    // --- TIER 3 ACCELERATION (R > 150: Total Rate 0.03) ---
    if (R > THRESHOLD_2) {
        const R_excess_2 = Math.min(R, THRESHOLD_3) - THRESHOLD_2;
        R_heat_factor += R_excess_2 * 0.013;
    }

    // --- TIER 4 ACCELERATION (R > 250: Total Rate 0.09) ---
    if (R > THRESHOLD_3) {
        const R_excess_3 = R - THRESHOLD_3;
        R_heat_factor += R_excess_3 * 0.045;
    }

    // Add the total calculated heat factor to the temperature change
    reactorTempChange += R_heat_factor;


    // 3. WATER PUMPS AFFECT REACTOR TEMP (Inverse/Quick) - UNCHANGED
    const activePumps = state.waterPumps.filter((pump) => pump.on && pump.powered)
    reactorTempChange -= (activePumps.length + 0.002) // Cooling rate matches number of active pumps (1:1)


    // 4. THERMAL LAG (Reactor Temp affects Fuel Temp) - UNCHANGED
    const tempGap = state.reactorTemp - state.fuelTemp
    const THERMAL_TRANSFER_RATE = 0.03
    fuelTempChange = tempGap * THERMAL_TRANSFER_RATE

    // 5. APPLY CHANGES AND LIMITS
    // Reactor Temp is now floored by the AMBIENT_SEA_TEMP
    const newReactorTemp = Math.max(5, state.reactorTemp + reactorTempChange)
    const newFuelTemp = Math.max(5, state.fuelTemp + fuelTempChange)

    return { ...state, reactorTemp: newReactorTemp, fuelTemp: newFuelTemp }
}


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

    // If all water pumps are turned off, steam rapidly rises in relation to radioactivity
    const activePumps = state.waterPumps.filter((pump) => pump.on && pump.powered)
    
    if(activePumps.length === 0) {
      steamChange += state.radioactivity * 0.1
    }

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
  if (state.xenon > 250) {
    const newXenon = state.xenon;
    return { ...state, xenon: newXenon }
  }
  // Xenon Generation: Produced only when radioactivity < 50
  if (state.radioactivity <= 10) {
    xenonChange += 0.5
  }

  if (state.radioactivity > 10 && state.radioactivity < 50) {
    xenonChange += 0.25
  }

  // Xenon Reduction: Decreases when radioactivity > 150
  if (state.radioactivity > 90) {
    if (state.radioactivity > 150) {
      // Faster reduction if radioactivity > 250
      xenonChange -= 24
    } else {
      xenonChange -= 16
    }
  }

  const newXenon = Math.max(0, Math.min(100, state.xenon + xenonChange))

  return { ...state, xenon: newXenon }
}
