export interface ControlRod {
  id: number
  insertion: number // 0-100%
  currentlyFullyRemoved: boolean
  justReinserted: boolean
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
  gameTime: number // 15 minutes in seconds (easy mode default)
  difficultyIsHard: boolean
  hasWon: boolean
  timeLimit: number // 15 minutes default (easy mode)

  // Events
  activeEvents: GameEvent[]
  eventHistory: GameEvent[]
  lastEventTime: number
  justHadPowerCut: boolean

  // Warnings
  warnings: string[]
}

export const INITIAL_GAME_STATE: GameState = {
  radioactivity: 100,
  reactorTemp: 330,
  fuelTemp: 330,
  xenon: 0,
  steamVolume: 100,

  powerTarget: 5000,
  powerOutput: 5000,
  performance: 100,

  controlRods: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    insertion: i < 6 ? 37 : 44,
    stuck: false,
    currentlyFullyRemoved: false,
    justReinserted: false
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
  gameTime: 900, // 15 minutes in seconds (easy mode default)
  difficultyIsHard: false,
  hasWon: false,
  timeLimit: 900, // 15 minutes default (easy mode)

  activeEvents: [],
  eventHistory: [],
  lastEventTime: 900, // Match initial gameTime (easy mode)
  justHadPowerCut: false,

  warnings: [],
}

export const THRESHOLDS = {
  radioactivity: {
    highWarning: 250,
    lowWarning: 50,
  },
  reactorTemp: {
    warning: 800,
    meltdown: 1200,
  },
  fuelTemp: {
    highWarning: 900,
    lowWarning: 90,
  },
  steamVolume: {
    highWarning: 300,
    lowWarning: 0,
  },
  performance: {
    gameOver: 0,
  },
  powerTolerance: 0.1, // 10%
} as const
