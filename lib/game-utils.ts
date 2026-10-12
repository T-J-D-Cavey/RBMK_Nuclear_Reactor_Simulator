import {
  type GameState,
  type GameOverCause,
  type LogEntry,
  type LogSource,
  THRESHOLDS,
  GAME_MODE_CONFIGS,
  getPowerTolerance,
  getShiftTime,
} from "./types"
import { getRodMargin } from "./sim/reactor"
import { EVENT_TUNING } from "./sim/tuning"

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

// "6,500 MW"
export function formatMW(value: number): string {
  return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} MW`
}

// "2:05"
export function formatMinutes(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

// --- Message log (bible §15): who said what, and when ---

export const LOG_SOURCE_LABELS: Record<LogSource, string> = {
  grid: "GRID CONTROLLER",
  engineer: "HEAD ENGINEER",
  procedure: "TEST PROCEDURE",
  alarm: "ALARM",
  system: "SYSTEM",
}

const LOG_LIMIT = 60

export function addLog(state: GameState, source: LogSource, text: string, from?: string): GameState {
  const last = state.log[state.log.length - 1]
  const entry: LogEntry = {
    id: String((last ? Number(last.id) || 0 : 0) + 1),
    time: getShiftTime(state),
    source,
    text,
    ...(from ? { from } : {}),
  }
  return { ...state, log: [...state.log, entry].slice(-LOG_LIMIT) }
}

// The Safety Test's clocks (camera and procedure log) read 01:00:00 at the start, so the test begins at
// 01:23:04 as it did on 26 April 1986. Every other mode starts at 00:00:00.
export const SAFETY_TEST_CLOCK_START = 3600

export function getClockStartSeconds(mode: GameState["mode"]): number {
  return mode === "safety_test" ? SAFETY_TEST_CLOCK_START : 0
}

// Log timestamps match a clock the player can see: the Safety Test's night clock, otherwise the panel's TIME.
export function formatLogTime(state: Pick<GameState, "mode" | "timeLimit">, entry: Pick<LogEntry, "time">): string {
  if (state.mode === "safety_test") return formatTime(SAFETY_TEST_CLOCK_START + entry.time)
  const config = GAME_MODE_CONFIGS[state.mode]
  if (config && config.timerMode === "countdown" && state.timeLimit !== null) return formatTime(Math.max(0, state.timeLimit - entry.time))
  return formatTime(entry.time)
}

// Ongoing conditions pinned at the top of the events box: running events and announced target changes.
export interface StatusLine {
  key: string
  source: LogSource
  text: string
}

export function getStatusLines(state: GameState): StatusLine[] {
  const lines: StatusLine[] = []
  for (const event of state.activeEvents) {
    let text = event.message
    if (event.type === "grid-hold" && state.powerTarget !== null) {
      const left = event.duration - Math.abs(event.timestamp - state.gameTime)
      text = `GRID HOLD: keep output within ±${formatMW(getPowerTolerance(state.powerTarget, true))} of ${formatMW(state.powerTarget)} (${formatMinutes(left)} left).`
    }
    const source: LogSource = event.type === "grid-hold" ? "grid" : event.type === "pump-trip" ? "alarm" : "engineer"
    lines.push({ key: event.id, source, text })
  }
  if (state.pendingTarget) {
    const left = Math.max(0, state.pendingTarget.at - getShiftTime(state))
    lines.push({
      key: "pending-target",
      source: state.pendingTarget.source,
      text: `NEW TARGET: ${formatMW(state.pendingTarget.target)} in ${left} s.`,
    })
  }
  return lines
}


// Every warning condition in one place, so the panel's flashing borders and the message area agree.
export function getWarningFlags(state: GameState) {
  return {
    highRadioactivity: state.radioactivity >= THRESHOLDS.radioactivity.highWarning,
    lowRadioactivity: state.radioactivity <= THRESHOLDS.radioactivity.lowWarning,
    highReactorTemp: state.reactorTemp >= THRESHOLDS.reactorTemp.warning,
    highFuelTemp: state.fuelTemp >= THRESHOLDS.fuelTemp.highWarning,
    lowFuelTemp: state.fuelTemp <= THRESHOLDS.fuelTemp.lowWarning,
    highSteam: state.steamVolume >= THRESHOLDS.steamVolume.highWarning,
    lowSteam: state.steamVolume <= THRESHOLDS.steamVolume.lowWarning,
    highXenon: state.xenon >= THRESHOLDS.xenon.highWarning,
    lowRodMargin: getRodMargin(state.controlRods) < THRESHOLDS.rodMargin.minimum,
    lowPerformance: state.powerTarget !== null && state.performance < 10,
  }
}

// Warnings about the reactor's own condition (the collapsible red box).
export function checkWarnings(state: GameState): string[] {
  const warnings: string[] = []
  const flags = getWarningFlags(state)

  if (flags.highRadioactivity) {
    warnings.push("WARNING: High radioactivity. Reactor temperature expected to spike. Recommend to increase insertion of control rods to reduce radioactivity.")
  }

  if (flags.lowRadioactivity) {
    warnings.push("WARNING: Low radioactivity. Xenon levels are expected to spike, further reducing radioactivity. Recommend reducing control rod insertion to increase radioactivity")
  }

  if (flags.highReactorTemp) {
    warnings.push("WARNING: High reactor temperature. Steam levels and radioactivity expected to spike. Recommend turning on more water pumps to cool reactor")
  }

  if (flags.highFuelTemp) {
    warnings.push("WARNING: High fuel temperature. Radioactivity may drop as a result. Recommend turning on more water pumps to cool fuel")
  }

  if (flags.lowFuelTemp) {
    warnings.push("WARNING: Low fuel temperature. Radiation is expected to spike. Recommended turning off some water pumps to increase reactor and fuel temperature")
  }

  if (flags.highSteam) {
    warnings.push("WARNING: High steam pressure. Disconnect turbine to avoid damage to the transmission infrastructure")
  }

  if (flags.lowSteam) {
    warnings.push("WARNING: Low steam pressure causing reduced power generation. Recommend turning off some water pumps to increase reactor temperature and reducing control rod insertion to increase radioactivity")
  }

  if (flags.highXenon) {
    warnings.push("WARNING: High xenon levels detected, lowering radioactivity. Recommend reducing control rod insertion to increase radioactivity.")
  }

  if (flags.lowRodMargin) {
    warnings.push("WARNING: Rod margin below minimum. Too few control rods in the core: radioactivity is being held by something less reliable than boron. Recommend inserting control rods.")
  }

  return warnings
}

// Warnings about the shift rather than the reactor itself: shown in the events box, not the reactor
// warnings box, so a player can hide the reactor warnings and still see these (plan §11.1).
export function checkEventWarnings(state: GameState): string[] {
  const warnings: string[] = []
  if (getWarningFlags(state).lowPerformance) {
    warnings.push("WARNING: Our power station is reporting low grid target performance. Review power targets")
  }
  // Sustained over-pressure trips the turbine off the grid (bible §12): count down so it never comes unannounced.
  if (state.overpressureSeconds > 0 && state.turbineMode === "grid" && GAME_MODE_CONFIGS[state.mode]?.turbineTrips) {
    const left = Math.max(0, EVENT_TUNING.turbineTripSeconds - state.overpressureSeconds)
    warnings.push(
      `WARNING: Turbine over-pressure. The turbine will trip off the grid in ${left} s unless steam falls below ${THRESHOLDS.steamVolume.highWarning}.`,
    )
  }
  return warnings
}

export const GAME_OVER_REASONS: Record<GameOverCause, string> = {
  meltdown: "MELTDOWN - Reactor temperature has exceeded maximum limits. Uranium fuel is melting down. Initiate emergency stations",
  explosion: "CORE EXPLOSION - Steam pressure has torn the reactor apart. The upper biological shield has been lifted and the core is open to the sky",
  performance: "UNACCEPTABLE POWER GRID PERFORMANCE - You have been removed from your post due to poor performance meeting grid targets",
}

export function checkGameOver(
  state: GameState,
  reactorEnding: GameOverCause | null = null,
): {
  isGameOver: boolean
  cause: GameOverCause | null
  reason: string | null
} {
  const ending = (cause: GameOverCause) => ({ isGameOver: true, cause, reason: GAME_OVER_REASONS[cause] })

  if (reactorEnding) return ending(reactorEnding)
  if (state.steamVolume >= THRESHOLDS.steamVolume.explosion) return ending("explosion")
  if (state.reactorTemp >= THRESHOLDS.reactorTemp.meltdown) return ending("meltdown")

  const modeConfig = GAME_MODE_CONFIGS[state.mode || "easy"] || GAME_MODE_CONFIGS.easy

  if (modeConfig.performanceAffectsGameOver && state.powerTarget !== null && state.performance <= THRESHOLDS.performance.gameOver) {
    return ending("performance")
  }

  return { isGameOver: false, cause: null, reason: null }
}

export function getGlowIntensity(radioactivity: number): number {
  // Returns a value between 0.3 and 1 based on radioactivity (0-500)
  return Math.min(0.3 + (radioactivity / 500) * 0.7, 1)
}
