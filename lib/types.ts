import { REFERENCE_STATE, STARTING_RODS, TUNING } from "./sim/tuning"

export interface ControlRod {
  id: number
  insertion: number // actual position, 0-100% (moves toward target at rod speed)
  target: number // ordered position set by the lever modal / AZ-5, 0-100%
  stuck: boolean
  slow: boolean // left parked too long: it travels slower until moved properly (lib/maintenance)
  parkedAt: number // internal: where it was last moved to, by enough to count
  parkedSeconds: number // internal: how long since then
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

// Sets a message's ink colour in the shift log. Who sent it is always a named person (`from`): the
// computer's own warnings go on the alarm screen, never in the log (owner, 2026-10-12).
export type LogSource = "grid" | "engineer" | "procedure" | "alarm"

export interface LogEntry {
  id: string
  time: number // shift time (seconds since the shift started) when logged
  source: LogSource // sets the colour in the message area
  from: string // who is speaking, e.g. "GRID CONTROLLER"
  text: string
}

export interface GameStats {
  peakRadioactivity: number
  peakReactorTemp: number
  peakSteam: number
  lowestRodMargin: number
  emergenciesHandled: number
  targetChanges: number
  highestOutput: number
  lowestOutput: number
  secondsInDanger: number
}

// Shift events (bible §12): power cuts, signal losses from the reactor hall, pump trips and rod jams. Power cuts and
// signal losses are the major emergencies. A grid hold is a kind of target change (owner, 2026-10-30), kept here
// because it runs as an active event while its narrow window lasts.
export type EventKind = "power-cut" | "signal-loss" | "rod-stuck" | "pump-trip" | "grid-hold"
export type ShiftEventKind = Exclude<EventKind, "grid-hold">
export const SHIFT_EVENT_KINDS: readonly ShiftEventKind[] = ["power-cut", "signal-loss", "pump-trip", "rod-stuck"]

export interface GameEvent {
  id: string
  type: EventKind
  timestamp: number // gameTime when it started
  duration: number // seconds
  data?: {
    affectedPumps?: number[] // pump ids
    affectedRods?: number[] // rod indices (0-9)
  }
}

// One event in this shift's plan (shift time = seconds since the shift started)
export interface ScheduledEvent {
  at: number
  kind: ShiftEventKind
  warned: boolean // advance warning already given
  duration: number // drawn when the shift is planned, so no two events overlap
}

// Where the grid's target changes have got to (bible §13, owner 2026-11-02). They run on their own, alongside the
// events: the next notice comes once the player has been on target for a while, or when the grid gives up waiting.
export interface TargetTrack {
  phase: "waiting" | "notice" | "settling" | "holding"
  noticeAt: number // waiting: shift time the next notice is due
  takesEffectAt: number // notice: when the change takes effect
  since: number // settling/holding: when the give-up clock started (it stops during a power cut or signal loss)
  steady: number // settling/holding: seconds on target without a break
  need: number // settling: the settle time drawn; holding: how long the hold must be held
  hold: boolean // the change in hand (or the last one) is a hold
  changes: number // announced so far
  holdsLeft: number
}

// A target change the grid (or the Safety Test script) has announced but which is not yet in force.
export interface PendingTargetChange {
  target: number
  at: number // shift time when it takes effect
  source: LogSource
  from: string
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
  turbineTrips: boolean // sustained over-pressure trips the turbine off the grid (bible §12)
  performanceAffectsGameOver: boolean
}

// Every mode runs identical reactor physics (bible §11); modes differ only in workload.
export const GAME_MODE_CONFIGS: Record<GameMode, GameModeConfig> = {
  easy: {
    id: "easy",
    name: "Easy Mode",
    badgeText: "EASY MODE",
    description: "15 minute shift: one major emergency and smaller power target changes.",
    hasTimer: true,
    timerMode: "countdown",
    timeLimit: 900,
    hasPowerTarget: true,
    defaultPowerTarget: 5000,
    hasRandomEvents: true,
    turbineTrips: true,
    performanceAffectsGameOver: true,
  },
  hard: {
    id: "hard",
    name: "Hard Mode",
    badgeText: "HARD MODE",
    description: "30 minute shift: two tougher major emergencies and larger power target changes.",
    hasTimer: true,
    timerMode: "countdown",
    timeLimit: 1800,
    hasPowerTarget: true,
    defaultPowerTarget: 5000,
    hasRandomEvents: true,
    turbineTrips: true,
    performanceAffectsGameOver: true,
  },
  free: {
    id: "free",
    name: "Free Mode",
    badgeText: "FREE MODE",
    description: "Unlimited time, no power grid targets, and no events. Same reactor physics as every mode.",
    hasTimer: false,
    timerMode: "countup",
    timeLimit: null,
    hasPowerTarget: false,
    defaultPowerTarget: null,
    hasRandomEvents: false,
    turbineTrips: false,
    performanceAffectsGameOver: false,
  },
  safety_test: {
    id: "safety_test",
    name: "Safety Test",
    badgeText: "SAFETY TEST",
    description: "Historical scenario: the night of the Unit 4 turbine rundown test. Scripted orders, no random events.",
    hasTimer: true,
    timerMode: "countdown",
    timeLimit: 1200,
    hasPowerTarget: true,
    defaultPowerTarget: 5000,
    hasRandomEvents: false,
    turbineTrips: false,
    performanceAffectsGameOver: true,
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
  // internal: null while steam drives the turbine. Once its steam is shut off (the Safety Test), the pumps' worth
  // of spin it has left, running down to 0 whatever the steam (bible §8, §14).
  turbineCoast: number | null
  overpressureSeconds: number // internal: consecutive seconds of high steam while connected to the grid
  turbineTripped: boolean // the turbine tripped off the grid and the player hasn't set it since (sounds the event alarm)
  vacuum: number // the condenser's vacuum, 1 (full) to 0 (worst): air leaking in costs output (lib/maintenance)
  ejectorSeconds: number // internal: seconds of the air ejector's run left, 0 while it isn't running
  vacuumReported: boolean // internal: the turbine operator has reported the worst vacuum since it last rose
  rodBalanceReported: boolean // internal: the reactor technician has reported the needle hard over since it came back
  pumpBalance: number // the circulation balance needle, -1 (towards loop 1) to 1 (loop 2), 0 at centre: only its size matters
  pumpDrift: 1 | -1 // internal: which way the needle is drifting, changing each time it is balanced
  balancerLock: number // internal: seconds left of the balancer's lock on the pump switches, 0 while it isn't running
  balancerGlide: number // internal: seconds left of the needle's glide back to centre, after the lock
  pumpBalanceReported: boolean // internal: the pump operator has reported the needle at its limit since it left it
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

  // Events and targets (bible §12–§14)
  activeEvents: GameEvent[]
  eventHistory: GameEvent[]
  eventPlan: ScheduledEvent[] | null // this shift's upcoming events; planned on the first tick (Easy/Hard)
  targetTrack: TargetTrack | null // this shift's target changes (Easy/Hard); started on the first tick
  nextTargetChangeAt: number | null // unused since target changes joined the event plan (2026-10-19); kept for old saves
  pendingTarget: PendingTargetChange | null // announced, not yet in force
  scriptStep: number // Safety Test: index of the next script step to run
  scriptLastRanAt: number | null // Safety Test: when the step before it ran (null: that step was skipped)

  // Shift time of the last AZ-5 press (null: never), for the rod display's AZ-5 lamp
  az5PressedAt: number | null

  // Warnings
  warnings: string[]

  // Message log (grid controller, engineers, procedure, alarms)
  log: LogEntry[]

  // Incident report
  stats: GameStats

  // Audio: the sound modal's two switches (bible §15). Nothing plays while paused or once the shift is over.
  alarmsEnabled: boolean // the alarms for warnings and emergency events
  effectsEnabled: boolean // every other sound: the reactor hum, and the WS7 sound effects
  soundVolume: number
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

  controlRods: STARTING_RODS.map((insertion, i) => ({
    id: i + 1,
    insertion,
    target: insertion,
    stuck: false,
    slow: false,
    parkedAt: insertion,
    parkedSeconds: 0,
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
  turbineCoast: null,
  overpressureSeconds: 0,
  turbineTripped: false,
  vacuum: 1,
  ejectorSeconds: 0,
  vacuumReported: false,
  rodBalanceReported: false,
  pumpBalance: 0,
  pumpDrift: 1,
  balancerLock: 0,
  balancerGlide: 0,
  pumpBalanceReported: false,
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
  eventPlan: null,
  targetTrack: null,
  nextTargetChangeAt: null,
  pendingTarget: null,
  scriptStep: 0,
  scriptLastRanAt: null,

  az5PressedAt: null,

  warnings: [],

  log: [],

  stats: {
    peakRadioactivity: REFERENCE_STATE.radioactivity,
    peakReactorTemp: REFERENCE_STATE.reactorTemp,
    peakSteam: REFERENCE_STATE.steam,
    lowestRodMargin: STARTING_RODS.reduce((a, b) => a + b, 0),
    emergenciesHandled: 0,
    targetChanges: 0,
    highestOutput: 5000,
    lowestOutput: 5000,
    secondsInDanger: 0,
  },

  alarmsEnabled: false,
  effectsEnabled: false,
  soundVolume: 1,
}

// Warning levels, set from harness runs (owner, 2026-10-14; plan §6). The high ones sit above anything a competent
// player needs, even Hard's largest target on four pumps (radioactivity ≈285). Hot fuel has no warning: it only
// slows a rise, so it isn't a risk worth an alarm (owner, 2026-10-14).
export const THRESHOLDS = {
  radioactivity: {
    highWarning: 350,
    lowWarning: 20, // owner, 2026-11-03 (was 50)
  },
  reactorTemp: {
    warning: 800,
    meltdown: 1200,
  },
  fuelTemp: {
    lowWarning: TUNING.fuelColdBelow, // where very cold fuel starts to push radioactivity up (§9)
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
    holdFactor: 0.5, // a grid "hold" request halves the window while it lasts (bible §12)
  },
} as const

export function getPowerTolerance(powerTarget: number, hold = false): number {
  const { minimum, fraction, holdFactor } = THRESHOLDS.powerTolerance
  return Math.max(minimum, powerTarget * fraction) * (hold ? holdFactor : 1)
}

export function isGridHoldActive(state: Pick<GameState, "activeEvents">): boolean {
  return state.activeEvents.some((event) => event.type === "grid-hold")
}

// Seconds since the shift started, in every mode (countdown modes count gameTime down from timeLimit).
export function getShiftTime(state: Pick<GameState, "gameTime" | "timeLimit" | "mode">): number {
  const config = GAME_MODE_CONFIGS[state.mode]
  if (config && config.timerMode === "countdown" && state.timeLimit !== null) return Math.max(0, state.timeLimit - state.gameTime)
  return Math.max(0, state.gameTime)
}
