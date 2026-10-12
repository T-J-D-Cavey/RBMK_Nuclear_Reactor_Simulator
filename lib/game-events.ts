// Shift events and power targets (bible §12–§13): the shift's plan, advance warnings, emergencies, smaller
// events, announced target changes and the turbine trip. Pure: randomness is injected, so the scenario
// harness can replay whole shifts (scripts/sim). Numbers live in EVENT_TUNING (lib/sim/tuning.ts).
import {
  type EventKind,
  type GameEvent,
  type GameMode,
  type GameState,
  type LogSource,
  type ScheduledEvent,
  GAME_MODE_CONFIGS,
  MAJOR_EVENT_KINDS,
  THRESHOLDS,
  getPowerTolerance,
  getShiftTime,
} from "./types"
import { EVENT_TUNING, type ShiftEventTuning } from "./sim/tuning"
import { addLog, formatMW } from "./game-utils"
import type { Rng } from "./sim/rng"

type Range = readonly [number, number]

// Who sends each message. Every message comes from a person (owner, 2026-10-12).
const GRID_CONTROLLER = "GRID CONTROLLER"
const HEAD_ENGINEER = "HEAD ENGINEER"
const SHIFT_FOREMAN = "SHIFT FOREMAN"
const PUMP_OPERATOR = "PUMP OPERATOR"
const TURBINE_OPERATOR = "TURBINE OPERATOR"

export const isMajorEvent = (kind: EventKind) => MAJOR_EVENT_KINDS.includes(kind)

const between = (rng: Rng, [lo, hi]: Range) => lo + rng() * (hi - lo)
const wholeBetween = (rng: Rng, [lo, hi]: Range) => Math.min(hi, lo + Math.floor(rng() * (hi - lo + 1)))

function pickCount(rng: Rng, table: ShiftEventTuning["majorCounts"]): number {
  let roll = rng()
  for (const [count, weight] of table) {
    roll -= weight
    if (roll < 0) return count
  }
  return table[table.length - 1][0]
}

function pickDistinct(rng: Rng, n: number, count: number): number[] {
  const pool = Array.from({ length: n }, (_, i) => i)
  const picked: number[] = []
  while (picked.length < Math.min(n, count)) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  return picked.sort((a, b) => a - b)
}

export function shiftEventTuning(mode: GameMode): ShiftEventTuning | null {
  if (!GAME_MODE_CONFIGS[mode]?.hasRandomEvents) return null
  return mode === "hard" ? EVENT_TUNING.hard : EVENT_TUNING.easy
}

// --- The shift's plan ---

// n start times over [from, to], each in its own slot, so consecutive starts are at least `gap` apart.
function spread(rng: Rng, n: number, from: number, to: number, gap: number): number[] {
  if (n <= 0 || to <= from) return []
  const slot = (to - from) / n
  const jitter = n === 1 ? slot : Math.max(0, slot - gap)
  return Array.from({ length: n }, (_, i) => from + i * slot + rng() * jitter)
}

// A budget of major emergencies (power cuts, rod jams) and smaller events (pump trips, hold requests),
// none in the first few minutes, sensibly spaced (bible §12). Kinds are random: no fixed alternation.
export function planShiftEvents(tuning: ShiftEventTuning, shiftLength: number, rng: Rng): ScheduledEvent[] {
  const end = shiftLength - tuning.lastStartBefore
  const majors = spread(rng, pickCount(rng, tuning.majorCounts), tuning.firstMajorAfter, end, tuning.majorSpacing).map(
    (at) => ({ at, kind: (rng() < 0.5 ? "power-cut" : "rod-stuck") as EventKind }),
  )
  const smalls: { at: number; kind: EventKind }[] = []
  const wanted = pickCount(rng, tuning.smallCounts)
  for (let tries = 0; smalls.length < wanted && tries < 200; tries++) {
    const at = between(rng, [tuning.firstSmallAfter, end])
    if ([...majors, ...smalls].every((e) => Math.abs(e.at - at) >= tuning.smallSpacing)) {
      smalls.push({ at, kind: rng() < 0.5 ? "pump-trip" : "grid-hold" })
    }
  }
  return [...majors, ...smalls].map((e) => ({ ...e, at: Math.round(e.at), warned: false })).sort((a, b) => a.at - b.at)
}

// --- Per-second driver (Easy and Hard) ---

// Shift time at which the running events are over and the next one may start.
function freeAt(state: GameState, now: number): number {
  let t = -Infinity
  for (const event of state.activeEvents) {
    const startedAt = now - Math.abs(event.timestamp - state.gameTime)
    t = Math.max(t, startedAt + event.duration + EVENT_TUNING.eventGap)
  }
  return t
}

export function runShiftEvents(state: GameState, rng: Rng): GameState {
  const tuning = shiftEventTuning(state.mode)
  if (!tuning || state.timeLimit === null) return state
  const now = getShiftTime(state)
  let s = state.eventPlan ? state : startShift(state, tuning, now, rng)

  // One event at a time: an event due while another runs waits until shortly after it ends, and a hold
  // request waits until an announced target change has been in force for a while. Anything pushed past
  // the end of the shift is dropped.
  const busyUntil = freeAt(s, now)
  const lastStart = state.timeLimit - tuning.lastStartBefore / 2
  const settledAt = s.pendingTarget ? s.pendingTarget.at + EVENT_TUNING.holdAfterTargetChange : -Infinity
  let plan = (s.eventPlan ?? [])
    .map((e) => {
      let at = Math.max(e.at, busyUntil)
      if (e.kind === "grid-hold") at = Math.max(at, settledAt)
      return at === e.at ? e : { ...e, at: Math.round(at) }
    })
    .filter((e) => e.at <= lastStart)
    .sort((a, b) => a.at - b.at)

  // Brief warning before a major emergency (bible §12), e.g. grid instability before a power cut.
  plan = plan.map((e) => {
    const lead = EVENT_TUNING.warningLead[e.kind]
    if (!lead || e.warned || now < e.at - lead) return e
    const warning = WARNINGS[e.kind]
    if (warning) s = addLog(s, warning.source, warning.text, warning.from)
    return { ...e, warned: true }
  })

  if (plan.length && plan[0].at <= now && s.activeEvents.length === 0) {
    const [next, ...rest] = plan
    plan = rest
    s = startEvent(s, next.kind, tuning, rng)
  }
  s = { ...s, eventPlan: plan }

  return announceTargetChange(s, tuning, now, rng)
}

function startShift(state: GameState, tuning: ShiftEventTuning, now: number, rng: Rng): GameState {
  const plan = planShiftEvents(tuning, state.timeLimit ?? 0, rng).filter((e) => e.at > now)
  const firstChange = Math.round(between(rng, tuning.targetInterval))
  let s: GameState = { ...state, eventPlan: plan, nextTargetChangeAt: Math.max(now, firstChange - EVENT_TUNING.targetNotice) }
  if (now <= 5 && s.powerTarget !== null) {
    s = addLog(
      s,
      "grid",
      `Unit 4, your shift has started. Hold output at ${formatMW(s.powerTarget)}, within ±${formatMW(getPowerTolerance(s.powerTarget))}.`,
      GRID_CONTROLLER,
    )
  }
  return s
}

const WARNINGS: Partial<Record<EventKind, { source: LogSource; from: string; text: string }>> = {
  "power-cut": {
    source: "grid",
    from: GRID_CONTROLLER,
    text: "Reports of power cable damage nearby. Advise that you prepare for emergency backup generation in the event of a powercut.",
  },
  "rod-stuck": {
    source: "engineer",
    from: SHIFT_FOREMAN,
    text: "Detected pressure fluctuations in the fuel channels. Control rod movement may be impacted.",
  },
}

// Start an event now. Exported so tests can trigger one directly.
export function startEvent(state: GameState, kind: EventKind, tuning: ShiftEventTuning, rng: Rng): GameState {
  const now = getShiftTime(state)
  const base = { id: `event-${kind}-${now}`, type: kind, timestamp: state.gameTime }
  let s = state
  switch (kind) {
    case "power-cut": {
      // The pumps' normal supply is lost; the turbine can still supply them (bible §8)
      s = addLog({ ...s, mainsPower: false }, "engineer", "Power cut detected. Recommend disconnecting turbine to power the pumps.", HEAD_ENGINEER)
      return begin(s, { ...base, duration: Math.round(between(rng, tuning.powerCutSeconds)) })
    }
    case "rod-stuck": {
      const rods = pickDistinct(rng, s.controlRods.length, wholeBetween(rng, tuning.rodJamRods))
      const names = rods.map((i) => i + 1).join(", ")
      // A jammed rod stops wherever it is, including mid-travel, and stays there once freed (bible §10, §12)
      s = { ...s, controlRods: s.controlRods.map((rod, i) => (rods.includes(i) ? { ...rod, stuck: true, target: rod.insertion } : rod)) }
      s = addLog(s, "engineer", `Control rods ${names} are stuck in position and can't be moved due to a ruptured fuel channel.`, HEAD_ENGINEER)
      return begin(s, { ...base, duration: Math.round(between(rng, tuning.rodJamSeconds)), data: { affectedRods: rods } })
    }
    case "pump-trip": {
      const running = s.waterPumps.filter((p) => p.on && !p.tripped)
      const pool = running.length ? running : s.waterPumps.filter((p) => !p.tripped)
      if (!pool.length) return s
      const pump = pool[Math.floor(rng() * pool.length)]
      s = { ...s, waterPumps: s.waterPumps.map((p) => (p.id === pump.id ? { ...p, tripped: true } : p)) }
      s = addLog(s, "alarm", `Pump ${pump.id} has tripped. Switch on a standby pump to keep the flow up.`, PUMP_OPERATOR)
      return begin(s, { ...base, duration: Math.round(between(rng, tuning.pumpTripSeconds)), data: { affectedPumps: [pump.id] } })
    }
    case "grid-hold": {
      if (s.powerTarget === null) return s
      const duration = Math.round(between(rng, tuning.gridHoldSeconds))
      const minutes = Math.max(1, Math.round(duration / 60))
      s = addLog(
        s,
        "grid",
        `We need you to hold power at ${formatMW(s.powerTarget)}, within ±${formatMW(getPowerTolerance(s.powerTarget, true))}, for about ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        GRID_CONTROLLER,
      )
      return begin(s, { ...base, duration })
    }
  }
}

function begin(s: GameState, event: GameEvent): GameState {
  return { ...s, activeEvents: [...s.activeEvents, event], eventHistory: [...s.eventHistory, event] }
}

// --- Ending events (every mode) ---

export function expireEvents(state: GameState): GameState {
  const ended = state.activeEvents.filter((event) => Math.abs(event.timestamp - state.gameTime) >= event.duration)
  if (!ended.length) return state
  let s: GameState = { ...state, activeEvents: state.activeEvents.filter((event) => !ended.includes(event)) }
  for (const event of ended) s = endEvent(s, event)
  return s
}

function endEvent(state: GameState, event: GameEvent): GameState {
  let s = state
  switch (event.type) {
    case "power-cut":
      s = { ...s, mainsPower: true }
      s = addLog(
        s,
        "engineer",
        s.turbineMode === "grid" ? "Station power restored." : "Station power restored. Reconnect the turbine to the grid when ready.",
        HEAD_ENGINEER,
      )
      break
    case "rod-stuck": {
      const rods = event.data?.affectedRods ?? []
      s = { ...s, controlRods: s.controlRods.map((rod, i) => (rods.includes(i) ? { ...rod, stuck: false } : rod)) }
      s = addLog(s, "engineer", `Control rods ${rods.map((i) => i + 1).join(", ")} are free again. They stay where they stopped.`, HEAD_ENGINEER)
      break
    }
    case "pump-trip": {
      const pumps = event.data?.affectedPumps ?? []
      s = { ...s, waterPumps: s.waterPumps.map((p) => (pumps.includes(p.id) ? { ...p, tripped: false } : p)) }
      s = addLog(s, "engineer", `Pump ${pumps.join(", ")} is back in service.`, PUMP_OPERATOR)
      break
    }
    case "grid-hold":
      s = addLog(s, "grid", "Hold lifted. Normal tolerance restored.", GRID_CONTROLLER)
      break
  }
  if (isMajorEvent(event.type)) s = { ...s, stats: { ...s.stats, emergenciesHandled: s.stats.emergenciesHandled + 1 } }
  return s
}

// --- Power targets (bible §13) ---

// Smaller steps than before, within the mode's range, never trivially small; low targets are kept rarely.
export function nextTarget(current: number, tuning: ShiftEventTuning, rng: Rng): number {
  const [min, max] = tuning.targetRange
  const lo = Math.max(min, current - tuning.targetMaxStep)
  const hi = Math.min(max, current + tuning.targetMaxStep)
  for (let tries = 0; tries < 50; tries++) {
    const target = Math.min(max, Math.max(min, Math.round(between(rng, [lo, hi]) / 100) * 100))
    if (Math.abs(target - current) < tuning.targetMinStep) continue
    // A low target is a xenon trap: good tension, used sparingly.
    if (target < tuning.lowTargetBelow && rng() >= tuning.lowTargetChance) continue
    return target
  }
  const towardMiddle = current < (min + max) / 2 ? 1 : -1
  return Math.min(max, Math.max(min, current + towardMiddle * tuning.targetMinStep))
}

// The grid warns that demand has changed and confirms the new target when it takes effect, 60 s later (owner
// wording, 2026-10-12: the warning doesn't give the number). It waits while a major emergency or a hold
// runs, or once a major emergency has been warned of, so crises don't pile up.
function announceTargetChange(state: GameState, tuning: ShiftEventTuning, now: number, rng: Rng): GameState {
  const current = state.powerTarget
  if (current === null || state.pendingTarget || state.nextTargetChangeAt === null || now < state.nextTargetChangeAt) return state
  if (state.activeEvents.some((e) => isMajorEvent(e.type) || e.type === "grid-hold")) return state
  if ((state.eventPlan ?? []).some((e) => e.warned)) return state
  const target = nextTarget(current, tuning, rng)
  const at = now + EVENT_TUNING.targetNotice
  const s: GameState = {
    ...state,
    pendingTarget: { target, at, source: "grid", from: GRID_CONTROLLER },
    nextTargetChangeAt: at + Math.round(between(rng, tuning.targetInterval)) - EVENT_TUNING.targetNotice,
  }
  return addLog(
    s,
    "grid",
    "We may soon require an adjustment in your power output.",
    GRID_CONTROLLER,
  )
}

// An announced change takes effect when its notice runs out (every mode with targets, incl. the Safety Test).
export function applyPendingTarget(state: GameState): GameState {
  const pending = state.pendingTarget
  if (!pending || getShiftTime(state) < pending.at) return state
  return addLog(
    { ...state, powerTarget: pending.target, pendingTarget: null },
    pending.source,
    `New power output requested to be ${formatMW(pending.target)}.`,
    pending.from,
  )
}

// --- Turbine trip (bible §12): a consequence of sustained over-pressure, never random ---

export function checkTurbineTrip(state: GameState): GameState {
  if (!GAME_MODE_CONFIGS[state.mode]?.turbineTrips) return state.overpressureSeconds ? { ...state, overpressureSeconds: 0 } : state
  const over = state.turbineMode === "grid" && state.steamVolume >= THRESHOLDS.steamVolume.highWarning
  const seconds = over ? state.overpressureSeconds + 1 : 0
  if (seconds < EVENT_TUNING.turbineTripSeconds) return seconds === state.overpressureSeconds ? state : { ...state, overpressureSeconds: seconds }
  const s: GameState = { ...state, overpressureSeconds: 0, turbineMode: "idle", turbineConnected: false }
  return addLog(
    s,
    "alarm",
    `Turbine disconnection implemented as per protocol. We can only reconnect turbine to grid once steam drops below ${THRESHOLDS.steamVolume.highWarning}.`,
    TURBINE_OPERATOR,
  )
}
