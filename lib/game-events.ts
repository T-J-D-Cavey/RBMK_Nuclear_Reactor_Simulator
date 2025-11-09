import type { GameEvent, GameState } from "./types"

const EVENT_MIN_INTERVAL = 180 // 3 minutes in seconds
const EVENT_MAX_INTERVAL = 360 // 6 minutes in seconds

export function shouldTriggerEvent(state: GameState): boolean {
  const timeSinceLastEvent = state.gameTime - state.lastEventTime

  // Don't trigger events in the first minute
  if (state.gameTime < 60) {
    return false
  }

  // Random chance after minimum interval
  if (timeSinceLastEvent >= EVENT_MIN_INTERVAL) {
    const probability = Math.min(
      (timeSinceLastEvent - EVENT_MIN_INTERVAL) / (EVENT_MAX_INTERVAL - EVENT_MIN_INTERVAL),
      1,
    )
    return Math.random() < probability * 0.1 // 10% max chance per tick
  }

  return false
}

export function generateRandomEvent(state: GameState): GameEvent | null {
  // Event type weights: 50% target change, 25% power cut, 25% rod stuck
  const roll = Math.random()

  if (roll <= 0.6) {
    return generateTargetChangeEvent(state)
  } else if (roll <= 0.8) {
    return generatePowerCutEvent(state)
  } else {
    return generateRodStuckEvent(state)
  }
}

function generateTargetChangeEvent(state: GameState): GameEvent {
  // Target range: 1600 to 12000 MW (a difference of 10400)
  const range = 10400;
  const minTarget = 1600;

  // 1. Calculate a random number between 1600 and 12000
  // 2. Divide by 100, round to the nearest whole number (e.g., 55.4 -> 55, 55.6 -> 56)
  // 3. Multiply by 100 to get the final rounded target (e.g., 56 -> 5600)
  const newTarget = Math.round((Math.random() * range + minTarget) / 100) * 100;

  return {
    id: `event-${Date.now()}`,
    type: "target-change",
    message: `⚡ INCOMING: Power target changed to ${newTarget} MW`,
    timestamp: state.gameTime,
    data: { newTarget },
  }
}

function generatePowerCutEvent(state: GameState): GameEvent {
  // Duration between 60 seconds and 10 minutes
  // Tim: debug: const duration = (Math.random() * 590 + 60) * 1000
  // Tim: debug: const durationSeconds = Math.round(duration / 1000)

  // Duration between 60 seconds and 10 minutes (600 seconds)
  const duration = Math.random() * 590 + 60 // Range 10s to 600s
  const durationSeconds = Math.round(duration)

  return {
    id: `event-${Date.now()}`,
    type: "power-cut",
    message: `⚡ WARNING: Power cut detected! Pumps offline for ${durationSeconds}s`,
    timestamp: state.gameTime,
    duration,
    data: { affectedPumps: [0, 1, 2, 3] },
  }
}

function generateRodStuckEvent(state: GameState): GameEvent {
  // Duration between 60 seconds and 10 minutes
  // Tim: debug: const duration = (Math.random() * 590 + 60) * 1000
  // Tim: debug: const durationSeconds = Math.round(duration / 1000)

   // Duration between 60 seconds and 10 minutes (600 seconds)
  const duration = Math.random() * 590 + 60 // Range 10s to 600s
  const durationSeconds = Math.round(duration)

  // Select 1-2 random rods
  const numRods = Math.random() < 0.5 ? 1 : 2
  const affectedRods: number[] = []

  while (affectedRods.length < numRods) {
    const rodIdx = Math.floor(Math.random() * 5)
    if (!affectedRods.includes(rodIdx)) {
      affectedRods.push(rodIdx)
    }
  }

  const rodNumbers = affectedRods.map((idx) => idx + 1)

  return {
    id: `event-${Date.now()}`,
    type: "rod-stuck",
    message: `⚡ WARNING: Control rod${numRods > 1 ? "s" : ""} ${rodNumbers.join(", ")} stuck for ${durationSeconds}s`,
    timestamp: state.gameTime,
    duration,
    data: { affectedRods },
  }
}

export function applyEvent(state: GameState, event: GameEvent): Partial<GameState> {
  const updates: Partial<GameState> = {
    activeEvents: [...state.activeEvents, event],
    lastEventTime: state.gameTime,
    eventHistory: [...state.eventHistory, event],
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
  const nowInSeconds = state.gameTime;
  // Tim Debug: const now = Date.now()
  const updates: Partial<GameState> = {}

  // Check for expired events
  const expiredEvents = state.activeEvents.filter((event) => {
    if (!event.duration) return false
    // Tim Debug: const eventTimestamp = event.timestamp * 1000 // Convert to milliseconds
    // Tim Debug: return now - eventTimestamp >= event.duration
      return nowInSeconds >= (event.timestamp + event.duration)
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
