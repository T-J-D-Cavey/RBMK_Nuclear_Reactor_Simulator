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

export type GameMode = "easy" | "hard" | "free" | "power_test"

export interface GameModeConfig {
  id: GameMode
  name: string
  badgeText: string
  description: string
  hasTimer: boolean
  timerMode: "countdown" | "countup"
  timeLimit: number | null // in seconds (e.g. 900 for easy, 1800 for hard, null for free)
  hasPowerTarget: boolean
  defaultPowerTarget: number | null // e.g. 5000 for standard, null for free
  hasRandomEvents: boolean
  performanceAffectsGameOver: boolean
}

export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  easy: {
    id: "easy",
    name: "Easy Mode",
    badgeText: "EASY MODE",
    description: "15 minute countdown with stable reactor mechanics and standard grid targets.",
    hasTimer: true,
    timerMode: "countdown",
    timeLimit: 900,
    hasPowerTarget: true,
    defaultPowerTarget: 5000,
    hasRandomEvents: true,
    performanceAffectsGameOver: true,
  },
  hard: {
    id: "hard",
    name: "Hard Mode",
    badgeText: "HARD MODE",
    description: "30 minute countdown with challenging reactor mechanics and volatile grid targets.",
    hasTimer: true,
    timerMode: "countdown",
    timeLimit: 1800,
    hasPowerTarget: true,
    defaultPowerTarget: 5000,
    hasRandomEvents: true,
    performanceAffectsGameOver: true,
  },
  free: {
    id: "free",
    name: "Free Mode",
    badgeText: "FREE MODE",
    description: "Unlimited time, no power grid targets, and no random events. Full reactor physics active.",
    hasTimer: false,
    timerMode: "countup",
    timeLimit: null,
    hasPowerTarget: false,
    defaultPowerTarget: null,
    hasRandomEvents: false,
    performanceAffectsGameOver: false,
  },
  power_test: {
    id: "power_test",
    name: "Power Test",
    badgeText: "POWER TEST",
    description: "Simulate the safety test conditions. (Coming Soon)",
    hasTimer: false,
    timerMode: "countup",
    timeLimit: null,
    hasPowerTarget: false,
    defaultPowerTarget: 200,
    hasRandomEvents: false,
    performanceAffectsGameOver: false,
  },
}

export interface GameState {
  // Core metrics
  radioactivity: number
  reactorTemp: number
  fuelTemp: number
  xenon: number
  steamVolume: number

  // Power & performance
  powerTarget: number | null
  powerOutput: number
  performance: number

  // Controls
  controlRods: ControlRod[]
  waterPumps: WaterPump[]
  turbineConnected: boolean

  // Game state
  mode: GameMode
  isPaused: boolean
  isGameOver: boolean
  gameOverReason: string | null
  gameTime: number // countdown or countup in seconds
  difficultyIsHard: boolean // retained for backwards compatibility
  hasWon: boolean
  timeLimit: number | null

  // Events
  activeEvents: GameEvent[]
  eventHistory: GameEvent[]
  lastEventTime: number
  justHadPowerCut: boolean

  // Warnings
  warnings: string[]

  // Audio
  soundEnabled: boolean
  soundVolume: number
  soundEnabledWhenPaused: boolean
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
    insertion: i < 6 ? 40 : 55,
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

  mode: "easy",
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
  justHadPowerCut: true,

  warnings: [],
  
  soundEnabled: false,
  soundVolume: 1,
  soundEnabledWhenPaused: false,
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
    lowWarning: 49,
  },
  steamVolume: {
    highWarning: 300,
    lowWarning: 0,
  },
  performance: {
    gameOver: 0,
  },
  xenon: {
    highWarning: 50,
  },
  powerTolerance: 500
} as const
