import { REFERENCE_STATE } from "./sim/tuning"

export interface ControlRod {
  id: number
  insertion: number // actual position, 0-100% (moves toward target at rod speed)
  target: number // ordered position set by the lever modal / AZ-5, 0-100%
  stuck: boolean
}

export interface WaterPump {
  id: number
  on: boolean // switched on by the player
  powered: boolean // receiving power from any source (mains or turbine)
  flow: number // internal: 0-1, ramps over a few seconds after starting / stopping
  tripped: boolean // pump has failed (pump trip event)
}

// "grid": turbine feeds the grid. "pumps": disconnected, supplying station pumps. "idle": disconnected.
export type TurbineMode = "grid" | "pumps" | "idle"

export type GameOverCause = "meltdown" | "explosion" | "performance"

export type LogSource = "grid" | "engineer" | "procedure" | "alarm" | "system"

export interface LogEntry {
  id: string
  time: number // gameTime when logged
  source: LogSource
  text: string
}

export interface GameStats {
  peakRadioactivity: number
  peakReactorTemp: number
  peakSteam: number
  lowestRodMargin: number
  emergenciesHandled: number
  secondsInDanger: number
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

export type GameMode = "easy" | "hard" | "free" | "safety_test"

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
  safety_test: {
    id: "safety_test",
    name: "Safety Test",
    badgeText: "SAFETY TEST",
    description: "Historical scenario: the night of the Unit 4 turbine rundown test. (In development)",
    hasTimer: true,
    timerMode: "countdown",
    timeLimit: 1800,
    hasPowerTarget: true,
    defaultPowerTarget: 5000,
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
  turbineMode: TurbineMode
  turbineConnected: boolean // derived: turbineMode === "grid" (kept for existing UI/saves)
  mainsPower: boolean // the pumps' normal (station) supply is available
  turbinePumpCapacity: number // internal: pumps the turbine can currently power (held steady near thresholds)
  overpressureSeconds: number // internal: consecutive seconds of high steam while connected to the grid
  reactivityNoise: number // internal: slow random drift in the reactivity balance

  // Game state
  mode: GameMode
  isPaused: boolean
  isGameOver: boolean
  gameOverReason: string | null
  gameOverCause: GameOverCause | null
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

  // Message log (grid controller, engineers, procedure, alarms)
  log: LogEntry[]

  // Incident report
  stats: GameStats

  // Audio
  soundEnabled: boolean
  soundVolume: number
  soundEnabledWhenPaused: boolean
}

export const INITIAL_GAME_STATE: GameState = {
  radioactivity: REFERENCE_STATE.radioactivity,
  reactorTemp: REFERENCE_STATE.reactorTemp,
  fuelTemp: REFERENCE_STATE.fuelTemp,
  xenon: 0,
  steamVolume: REFERENCE_STATE.steam,

  powerTarget: 5000,
  powerOutput: 5000,
  performance: 100,

  controlRods: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    insertion: i < 6 ? 40 : 55,
    target: i < 6 ? 40 : 55,
    stuck: false,
  })),

  waterPumps: Array.from({ length: 4 }, (_, i) => ({
    id: i + 1,
    on: i < 2, // Only first 2 pumps on, but this provides adequate cooling
    powered: true,
    flow: i < 2 ? 1 : 0,
    tripped: false,
  })),

  turbineMode: "grid",
  turbineConnected: true,
  mainsPower: true,
  turbinePumpCapacity: 0,
  overpressureSeconds: 0,
  reactivityNoise: 0,

  mode: "easy",
  isPaused: false,
  isGameOver: false,
  gameOverReason: null,
  gameOverCause: null,
  gameTime: 900, // 15 minutes in seconds (easy mode default)
  difficultyIsHard: false,
  hasWon: false,
  timeLimit: 900, // 15 minutes default (easy mode)

  activeEvents: [],
  eventHistory: [],
  lastEventTime: 900, // Match initial gameTime (easy mode)
  justHadPowerCut: true,

  warnings: [],

  log: [],

  stats: {
    peakRadioactivity: REFERENCE_STATE.radioactivity,
    peakReactorTemp: REFERENCE_STATE.reactorTemp,
    peakSteam: REFERENCE_STATE.steam,
    lowestRodMargin: 460,
    emergenciesHandled: 0,
    secondsInDanger: 0,
  },

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
    explosion: 600, // core explosion (bible §11): about double the high-steam warning
  },
  performance: {
    gameOver: 0,
  },
  xenon: {
    highWarning: 50,
  },
  rodMargin: {
    minimum: 200, // total insertion across all 10 rods (0-1000); the game's "15-rod minimum" (bible §10.2)
  },
  powerTolerance: {
    fraction: 0.1, // ±10% of target (bible §13)
    minimum: 200, // never tighter than ±200 MW
  },
} as const

export function getPowerTolerance(powerTarget: number): number {
  return Math.max(THRESHOLDS.powerTolerance.minimum, powerTarget * THRESHOLDS.powerTolerance.fraction)
}
