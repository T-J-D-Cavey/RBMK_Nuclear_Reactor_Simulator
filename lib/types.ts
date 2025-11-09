export interface ControlRod {
  id: number
  insertion: number // 0-100%
  stuck: boolean
}

export interface WaterPump {
  id: number
  on: boolean
  powered: boolean
}

export interface GameEvent {
  id: string
  type: "target-change" | "power-cut" | "rod-stuck"
  message: string
  timestamp: number
  duration?: number // in milliseconds
  data?: {
    newTarget?: number
    affectedPumps?: number[]
    affectedRods?: number[]
  }
}

export interface GameState {
  // Core metrics
  radioactivity: number
  reactorTemp: number
  fuelTemp: number
  xenon: number
  steamVolume: number

  // Power & performance
  powerTarget: number
  powerOutput: number
  performance: number

  // Controls
  controlRods: ControlRod[]
  waterPumps: WaterPump[]
  turbineConnected: boolean

  // Game state
  isPaused: boolean
  isGameOver: boolean
  gameOverReason: string | null
  gameTime: number // in seconds

  // Events
  activeEvents: GameEvent[]
  eventHistory: GameEvent[]
  lastEventTime: number

  // Warnings
  warnings: string[]
}

export const INITIAL_GAME_STATE: GameState = {
  radioactivity: 100,
  reactorTemp: 330,
  fuelTemp: 330,
  xenon: 1,
  steamVolume: 100,

  powerTarget: 5000,
  powerOutput: 5000,
  performance: 100,

  controlRods: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    insertion: i < 5 ? 40 : 0, // First 5 rods inserted at 40%, remaining 15 fully removed
    stuck: false,
  })),

  waterPumps: Array.from({ length: 4 }, (_, i) => ({
    id: i + 1,
    on: i < 2, // Only first 2 pumps on, but this provides adequate cooling
    powered: true,
  })),

  turbineConnected: true,

  isPaused: false,
  isGameOver: false,
  gameOverReason: null,
  gameTime: 0,

  activeEvents: [],
  eventHistory: [],
  lastEventTime: 0,

  warnings: [],
}

export const THRESHOLDS = {
  radioactivity: {
    warning: 250,
  },
  reactorTemp: {
    warning: 800,
    meltdown: 1200,
  },
  fuelTemp: {
    warning: 900,
  },
  steamVolume: {
    warning: 300,
  },
  performance: {
    gameOver: 0,
  },
  powerTolerance: 0.1, // 10%
} as const
