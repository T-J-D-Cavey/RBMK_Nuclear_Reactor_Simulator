import type { GameEvent, GameState } from "./types"

const EVENT_MIN_INTERVAL = 120 // 2 minutes in seconds  
const EVENT_MAX_INTERVAL = 240 // 4 minutes in seconds 


export function shouldTriggerEvent(state: GameState): boolean {
  const timeSinceLastEvent = state.lastEventTime - state.gameTime

  // Hard mode: 30min = 1800s, so first minute is when gameTime > 1740
  // Easy mode: 15min = 900s, so first minute is when gameTime > 840
  
  if ((state.difficultyIsHard && state.gameTime > 1770) || (!state.difficultyIsHard && state.gameTime > 870)) { 
    return false
  }
  

  const hasActivePowerCut = state.activeEvents.some((e) => e.type === "power-cut")
  const hasActiveRodStuck = state.activeEvents.some((e) => e.type === "rod-stuck")

  if (hasActivePowerCut || hasActiveRodStuck) {
    return false
  }

  // Random chance after minimum interval
  if (timeSinceLastEvent >= EVENT_MIN_INTERVAL) {
    const probability = Math.min(
      (timeSinceLastEvent - EVENT_MIN_INTERVAL) / (EVENT_MAX_INTERVAL - EVENT_MIN_INTERVAL),
      1,
    )
    return Math.random() < 0.01 + probability * 0.99 
  }

  return false
}

export function generateRandomEvent(state: GameState): GameEvent | null {
  const hasActivePowerCut = state.activeEvents.some((e) => e.type === "power-cut")
  const hasActiveRodStuck = state.activeEvents.some((e) => e.type === "rod-stuck")

  // If there's an active disruptive event, don't generate target changes
  if (hasActivePowerCut || hasActiveRodStuck) {
    return null
  }

  // Event type weights: 50% target change, 25% power cut, 25% rod stuck
  const roll = Math.random()

  if (roll <= 0.33) {
    if(!state.justHadPowerCut) {
      return generatePowerCutEvent(state)
    } else {
      return generateRodStuckEvent(state)
    }
  } else {
    return generateTargetChangeEvent(state)
  } 
}

function generateTargetChangeEvent(state: GameState): GameEvent {
  // Target range: 1600 to 12000 MW (a difference of 10400)
  const range = state.difficultyIsHard ? 10000 : 6000
  const minTarget = state.difficultyIsHard ? 1000 : 2000

  // 1. Calculate a random number between the ranges
  // 2. Divide by 100, round to the nearest whole number (e.g., 55.4 -> 55, 55.6 -> 56)
  // 3. Multiply by 100 to get the final rounded target (e.g., 56 -> 5600)
  const newTarget = Math.round((Math.random() * range + minTarget) / 100) * 100

  return {
    id: `event-${Date.now()}`,
    type: "target-change",
    message: `⚡ INCOMING FROM GRID CONTROLLER: Power target changed to ${newTarget} MW`,
    timestamp: state.gameTime,
    data: { newTarget },
  }
}

function generatePowerCutEvent(state: GameState): GameEvent {
  const duration = state.difficultyIsHard ? Math.random() * 60 + 30 : Math.random() * 40 + 20
  const durationSeconds = Math.round(duration)

  return {
    id: `event-${Date.now()}`,
    type: "power-cut",
    message: `⚡ UPDATE FROM HEAD ENGINEER: Power cut detected. Pumps are not powered, so they're not moving cooling water through the core.`,
    timestamp: state.gameTime,
    duration,
    data: { affectedPumps: [0, 1, 2, 3] },
  }
}

function generateRodStuckEvent(state: GameState): GameEvent {
  const duration = state.difficultyIsHard ? Math.random() * 120 + 60 : Math.random() * 60 + 30
  const durationSeconds = Math.round(duration)

  // Select random rods
  const numRods = state.difficultyIsHard
    ? Math.floor(Math.random() * (8 - 5 + 1)) + 5
    : Math.floor(Math.random() * (7 - 4 + 1)) + 4
  const affectedRods: number[] = []

  while (affectedRods.length < numRods) {
    const rodIdx = Math.floor(Math.random() * 10)
    if (!affectedRods.includes(rodIdx)) {
      affectedRods.push(rodIdx)
    }
  }

  const rodNumbers = affectedRods.map((idx) => idx + 1).sort((a, b) => a - b)

  return {
    id: `event-${Date.now()}`,
    type: "rod-stuck",
    message: `⚡ UPDATE FROM HEAD ENGINEER: Control rod${numRods > 1 ? "s" : ""} ${rodNumbers.join(", ")} are stuck in position and can't be moved due to a ruptured fuel rod`,
    timestamp: state.gameTime,
    duration,
    data: { affectedRods },
  }
}

export function applyEvent(state: GameState, event: GameEvent): Partial<GameState> {
  let activeEvents = [...state.activeEvents]

  if (event.type === "target-change") {
    // Remove any existing target-change events
    activeEvents = activeEvents.filter((e) => e.type !== "target-change")
  }

  let justHadPowerCutChange = false
  let newValueForPowerCutCheck = ""
  
  if(event.type === "rod-stuck" || event.type === "power-cut") {
    justHadPowerCutChange = true
  }

  const updates: Partial<GameState> = {
    activeEvents: [...activeEvents, event],
    lastEventTime: state.gameTime,
    eventHistory: [...state.eventHistory, event],
    justHadPowerCut: justHadPowerCutChange ? (event.type === "rod-stuck" ? false : true) : state.justHadPowerCut,
  }

  switch (event.type) {
    case "target-change":
      if (event.data?.newTarget) {
        updates.powerTarget = event.data.newTarget
      }
      break

    case "power-cut":
      if (event.data?.affectedPumps) {
        const newPumps = state.waterPumps.map((pump, idx) => {
          if (event.data!.affectedPumps!.includes(idx)) {
            return { ...pump, powered: false }
          }
          return pump
        })
        updates.waterPumps = newPumps
      }
      break

    case "rod-stuck":
      if (event.data?.affectedRods) {
        const newRods = state.controlRods.map((rod, idx) => {
          if (event.data!.affectedRods!.includes(idx)) {
            return { ...rod, stuck: true }
          }
          return rod
        })
        updates.controlRods = newRods
      }
      break
  }

  return updates
}

export function updateActiveEvents(state: GameState): Partial<GameState> {
  const nowInSeconds = state.gameTime
  const updates: Partial<GameState> = {}

  // Check for expired events
  const expiredEvents = state.activeEvents.filter((event) => {
    if (!event.duration) return false
    return event.timestamp - nowInSeconds >= event.duration
  })

  if (expiredEvents.length > 0) {
    // Remove expired events
    updates.activeEvents = state.activeEvents.filter((event) => !expiredEvents.includes(event))

    // Restore affected systems
    let newPumps = [...state.waterPumps]
    let newRods = [...state.controlRods]

    expiredEvents.forEach((event) => {
      if (event.type === "power-cut" && event.data?.affectedPumps) {
        newPumps = newPumps.map((pump, idx) => {
          if (event.data!.affectedPumps!.includes(idx)) {
            return { ...pump, powered: true }
          }
          return pump
        })
      }

      if (event.type === "rod-stuck" && event.data?.affectedRods) {
        newRods = newRods.map((rod, idx) => {
          if (event.data!.affectedRods!.includes(idx)) {
            return { ...rod, stuck: false }
          }
          return rod
        })
      }
    })

    updates.waterPumps = newPumps
    updates.controlRods = newRods
  }

  return updates
}
