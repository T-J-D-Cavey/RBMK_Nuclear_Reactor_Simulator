import {
  type EventKind,
  type GameState,
  type GameOverCause,
  type LogEntry,
  type LogSource,
  THRESHOLDS,
  GAME_MODE_CONFIGS,
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

const LOG_LIMIT = 60

// Every message is sent by a named person (`from`); the computer's warnings go on the alarm screen instead.
export function addLog(state: GameState, source: LogSource, text: string, from: string): GameState {
  const last = state.log[state.log.length - 1]
  const entry: LogEntry = {
    id: String((last ? Number(last.id) || 0 : 0) + 1),
    time: getShiftTime(state),
    source,
    from,
    text,
  }
  return { ...state, log: [...state.log, entry].slice(-LOG_LIMIT) }
}

// The Safety Test's clocks (camera and procedure log) read 01:07:00 at the start, so the test begins at
// 01:23:04 as it did on 26 April 1986. Every other mode starts at 00:00:00.
export const SAFETY_TEST_CLOCK_START = 4020

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

// Every warning condition in one place, so the panel's flashing borders and the message area agree.
export function getWarningFlags(state: GameState) {
  return {
    highRadioactivity: state.radioactivity >= THRESHOLDS.radioactivity.highWarning,
    lowRadioactivity: state.radioactivity <= THRESHOLDS.radioactivity.lowWarning,
    highReactorTemp: state.reactorTemp >= THRESHOLDS.reactorTemp.warning,
    lowFuelTemp: state.fuelTemp <= THRESHOLDS.fuelTemp.lowWarning,
    highSteam: state.steamVolume >= THRESHOLDS.steamVolume.highWarning,
    lowSteam: state.steamVolume <= THRESHOLDS.steamVolume.lowWarning,
    highXenon: state.xenon >= THRESHOLDS.xenon.highWarning,
    lowRodMargin: getRodMargin(state.controlRods) < THRESHOLDS.rodMargin.minimum,
    lowPerformance: state.powerTarget !== null && state.performance < 10,
  }
}

// One line on the computer's alarm screen. The key stays the same while the condition lasts, so the screen
// types a warning out once and a countdown in it updates in place.
export interface Warning {
  key: string
  text: string
}

type WarningFlag = keyof ReturnType<typeof getWarningFlags>

const REACTOR_WARNINGS: [WarningFlag, string][] = [
  ["highRadioactivity", "WARNING: High radioactivity. Reactor temperature expected to spike. Recommend to increase insertion of control rods to reduce radioactivity."],
  ["lowRadioactivity", "WARNING: Low radioactivity. Xenon levels are expected to spike, further reducing radioactivity. Recommend reducing control rod insertion to increase radioactivity"],
  ["highReactorTemp", "WARNING: High reactor temperature. Steam levels and radioactivity expected to spike. Recommend turning on more water pumps to cool reactor"],
  ["lowFuelTemp", "WARNING: Low fuel temperature. Radiation is expected to spike. Recommended turning off some water pumps to increase reactor and fuel temperature"],
  ["highSteam", "WARNING: High steam pressure. Disconnect turbine to avoid damage to the transmission infrastructure"],
  ["lowSteam", "WARNING: Low steam pressure causing reduced power generation. Recommend turning off some water pumps to increase reactor temperature and reducing control rod insertion to increase radioactivity"],
  ["highXenon", "WARNING: High xenon levels detected, lowering radioactivity. Recommend reducing control rod insertion to increase radioactivity."],
  ["lowRodMargin", "WARNING: Rod margin below minimum. Too few control rods in the core. Recommend inserting control rods."],
]

// Warnings about the reactor's own condition.
export function getReactorWarnings(state: GameState): Warning[] {
  const flags = getWarningFlags(state)
  return REACTOR_WARNINGS.filter(([flag]) => flags[flag]).map(([key, text]) => ({ key, text }))
}

export function checkWarnings(state: GameState): string[] {
  return getReactorWarnings(state).map((warning) => warning.text)
}

// Warnings about the shift rather than the reactor itself. They are computer-generated too, so they share the
// alarm screen with the reactor warnings; the shift log only holds messages from people.
export function getEventWarnings(state: GameState): Warning[] {
  const warnings: Warning[] = []
  if (getWarningFlags(state).lowPerformance) {
    warnings.push({ key: "lowPerformance", text: "WARNING: Our power station is reporting low grid target performance. Review power targets" })
  }
  // Jammed rods never free again (owner, 2026-10-16), so this warning, and the general alarm, last the rest of the
  // shift. The player can switch the alarms off.
  const jammed = state.controlRods.filter((rod) => rod.stuck).map((rod) => rod.id)
  if (jammed.length) {
    const rods = jammed.length === 1 ? `Control rod ${jammed[0]} is` : `Control rods ${jammed.join(", ")} are`
    warnings.push({ key: "jammedRods", text: `WARNING: ${rods} jammed and can't be moved. Control radioactivity with the remaining rods.` })
  }
  // Sustained over-pressure trips the turbine off the grid (bible §12): count down so it never comes unannounced.
  if (state.overpressureSeconds > 0 && state.turbineMode === "grid" && GAME_MODE_CONFIGS[state.mode]?.turbineTrips) {
    const left = Math.max(0, EVENT_TUNING.turbineTripSeconds - state.overpressureSeconds)
    warnings.push({
      key: "turbineOverpressure",
      text: `WARNING: Turbine over-pressure. The turbine will trip off the grid in ${left} s unless steam falls below ${THRESHOLDS.steamVolume.highWarning}.`,
    })
  }
  return warnings
}

export function checkEventWarnings(state: GameState): string[] {
  return getEventWarnings(state).map((warning) => warning.text)
}

// Warnings with an alarm sound of their own (owner, 2026-10-14). Every other warning sounds the general alarm
// instead. The turbine over-pressure countdown only runs while steam is high, so it shares the steam alarm.
const OWN_ALARM_WARNINGS = new Set(["highRadioactivity", "highReactorTemp", "highSteam", "highXenon", "turbineOverpressure"])
// Events that sound the event alarm while they last. A grid hold doesn't, and target changes aren't events (owner, 2026-10-14).
// A rod jam doesn't either: it never ends, so its warning sounds the general alarm instead (owner, 2026-10-16).
const EVENT_ALARM_KINDS: readonly EventKind[] = ["power-cut", "pump-trip"]

// Which alarm sounds are on: one per alarm, read straight from the warnings so a sound starts and stops with its warning.
export function getAlarms(state: GameState) {
  const flags = getWarningFlags(state)
  const warnings = [...getReactorWarnings(state), ...getEventWarnings(state)]
  return {
    general: warnings.some((warning) => !OWN_ALARM_WARNINGS.has(warning.key)),
    event: state.turbineTripped || state.activeEvents.some((event) => EVENT_ALARM_KINDS.includes(event.type)),
    highRadioactivity: flags.highRadioactivity,
    highReactorTemp: flags.highReactorTemp,
    highSteamOrXenon: flags.highSteam || flags.highXenon,
  }
}

// The rod display's AZ-5 lamp lights for a few seconds after a press, as on the panel in the show (owner, 2026-10-16)
export const AZ5_LAMP_SECONDS = 5

export function isAz5LampLit(state: GameState): boolean {
  return state.az5PressedAt !== null && getShiftTime(state) - state.az5PressedAt < AZ5_LAMP_SECONDS
}

export const GAME_OVER_REASONS: Record<GameOverCause, string> = {
  meltdown: "MELTDOWN - Reactor temperature has exceeded maximum limits. Uranium fuel is melting down. Initiate emergency stations",
  explosion: "CORE EXPLOSION - Steam pressure has torn the reactor apart. The core is open. The stack is burning.",
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
