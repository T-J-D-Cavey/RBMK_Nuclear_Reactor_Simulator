// Shift events and power targets (bible §12–§13): the shift's plan, advance warnings, emergencies, smaller
// events, announced target changes and the turbine trip. Pure: randomness is injected, so the scenario
// harness can replay whole shifts (scripts/sim). Numbers live in EVENT_TUNING (lib/sim/tuning.ts).
import {
  type EventKind,
  type GameEvent,
  type GameMode,
  type GameState,
  type LogSource,
  type PlannedKind,
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
const REACTOR_TECHNICIAN = "REACTOR TECHNICIAN"

export const isMajorEvent = (kind: EventKind) => MAJOR_EVENT_KINDS.includes(kind)

const between = (rng: Rng, [lo, hi]: Range) => lo + rng() * (hi - lo)
const wholeBetween = (rng: Rng, [lo, hi]: Range) => Math.min(hi, lo + Math.floor(rng() * (hi - lo + 1)))

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

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const isMajorKind = (kind: PlannedKind) => kind !== "target-change" && isMajorEvent(kind)

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// How long a planned thing keeps the player busy: an event's length, or a target change's notice.
function plannedDuration(kind: PlannedKind, tuning: ShiftEventTuning, rng: Rng): number {
  switch (kind) {
    case "power-cut":
      return Math.round(between(rng, tuning.powerCutSeconds))
    case "pump-trip":
      return Math.round(between(rng, tuning.pumpTripSeconds))
    case "grid-hold":
      return Math.round(between(rng, tuning.gridHoldSeconds))
    case "rod-stuck":
      return 0 // the jam is instant; its warning stays on the alarm screen
    case "target-change":
      return EVENT_TUNING.targetNotice
  }
}

// The least time from the start of `a` to the start of `b` when `b` comes next. One event at a time, each with
// a pause after it (longer after a major emergency). The grid can announce a change during a pump trip, but not
// during a hold or a power cut. A change is in force before the next is announced, a hold is requested or a major
// emergency is warned of. A major emergency's advance warning also comes after `a` is over.
function separation(a: ScheduledEvent, b: ScheduledEvent, tuning: ShiftEventTuning): number {
  const lasts = a.duration ?? 0
  let busy = 0
  if (a.kind === "target-change") {
    if (b.kind === "grid-hold") busy = lasts + EVENT_TUNING.holdAfterTargetChange
    else if (b.kind === "target-change") busy = lasts + EVENT_TUNING.eventGap
    else if (isMajorKind(b.kind)) busy = lasts
  } else if (!(a.kind === "pump-trip" && b.kind === "target-change")) {
    busy = lasts + (isMajorKind(a.kind) ? EVENT_TUNING.majorQuiet : EVENT_TUNING.eventGap)
  }
  return Math.max(tuning.minGap, busy + (EVENT_TUNING.warningLead[b.kind] ?? 0))
}

// The shift's plan (owner, 2026-10-19): always the same number of things, made of the major emergencies (at most one
// of each kind, as a rod jam is permanent), a random number of smaller events (pump trips, hold requests) and target
// changes for the rest. The order is random. Spare time is shared out almost evenly between them, so the shift
// neither clusters nor goes quiet for long, and nothing is ever dropped. Major emergencies keep out of the first few
// minutes and apart from each other; nothing starts in the last couple of minutes.
export function planShiftEvents(tuning: ShiftEventTuning, shiftLength: number, rng: Rng): ScheduledEvent[] {
  const from = tuning.firstAfter
  const to = shiftLength - tuning.lastStartBefore
  const majors = shuffle(rng, ["power-cut", "rod-stuck"] as EventKind[]).slice(0, tuning.majors)
  const minors = wholeBetween(rng, tuning.minorCounts)
  const targets = Math.max(0, tuning.totalEvents - majors.length - minors)
  let best: { items: ScheduledEvent[]; slack: number } | null = null
  for (let tries = 0; tries < 500; tries++) {
    const minorKinds = Array.from({ length: minors }, (): EventKind => (rng() < 0.5 ? "pump-trip" : "grid-hold"))
    const kinds = shuffle<PlannedKind>(rng, [...majors, ...minorKinds, ...Array<PlannedKind>(targets).fill("target-change")])
    const items: ScheduledEvent[] = kinds.map((kind) => ({ at: 0, kind, warned: false, duration: plannedDuration(kind, tuning, rng) }))
    const gaps = items.slice(1).map((b, i) => separation(items[i], b, tuning))
    const slack = to - from - sum(gaps)
    // One share of the spare time before each thing and one after the last, each share 1–2 parts
    const shares = Array.from({ length: items.length + 1 }, () => 1 + rng())
    const unit = Math.max(0, slack) / sum(shares)
    let t = from
    items.forEach((item, i) => {
      t += shares[i] * unit + (i ? gaps[i - 1] : 0)
      item.at = Math.round(t)
    })
    const m = items.filter((e) => isMajorKind(e.kind))
    const placed = m.every((e, i) => e.at >= tuning.firstMajorAfter && (i === 0 || e.at - m[i - 1].at >= tuning.majorSpacing))
    if (slack >= 0 && placed) return items
    // Never reached in practice (scripts/sim checks thousands of shifts); keeps the roomiest plan just in case
    if (!best || slack > best.slack) best = { items, slack }
  }
  return best!.items
}

// --- Per-second driver (Easy and Hard) ---

// The plan spaces everything out, so a planned thing normally starts on time. As a safety net, an event waits while
// another runs, and a target change waits while one is pending or a hold or power cut runs.
function canStart(state: GameState, item: ScheduledEvent): boolean {
  if (item.kind !== "target-change") return state.activeEvents.length === 0
  return !state.pendingTarget && !state.activeEvents.some((e) => e.type === "grid-hold" || e.type === "power-cut")
}

export function runShiftEvents(state: GameState, rng: Rng): GameState {
  const tuning = shiftEventTuning(state.mode)
  if (!tuning || state.timeLimit === null) return state
  const now = getShiftTime(state)
  let s = state.eventPlan ? state : startShift(state, tuning, now, rng)

  // Brief warning before a major emergency (bible §12), e.g. grid instability before a power cut.
  let plan = (s.eventPlan ?? []).map((e) => {
    const lead = EVENT_TUNING.warningLead[e.kind]
    if (!lead || e.warned || now < e.at - lead) return e
    const warning = e.kind === "target-change" ? undefined : WARNINGS[e.kind]
    if (warning) s = addLog(s, warning.source, warning.text, warning.from)
    return { ...e, warned: true }
  })

  const [next, ...rest] = plan
  if (next && next.at <= now && canStart(s, next)) {
    plan = rest
    s = next.kind === "target-change" ? announceTargetChange(s, tuning, now, rng) : startEvent(s, next.kind, tuning, rng, next.duration)
  }
  return { ...s, eventPlan: plan }
}

function startShift(state: GameState, tuning: ShiftEventTuning, now: number, rng: Rng): GameState {
  const plan = planShiftEvents(tuning, state.timeLimit ?? 0, rng).filter((e) => e.at > now)
  let s: GameState = { ...state, eventPlan: plan, nextTargetChangeAt: null }
  if (now <= 5 && s.powerTarget !== null) {
    s = addLog(
      s,
      "grid",
      `Unit 4, your shift has started. Hold output at ${formatMW(s.powerTarget)}. The grid controller will let us know if they need any adjustments in power output`,
      SHIFT_FOREMAN,
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
    from: REACTOR_TECHNICIAN,
    text: "Detected pressure fluctuations in the fuel channels. Control rod movement may be impacted.",
  },
}

// Start an event now, lasting as long as planned (or a fresh draw). Exported so tests can trigger one directly.
export function startEvent(state: GameState, kind: EventKind, tuning: ShiftEventTuning, rng: Rng, planned?: number): GameState {
  const now = getShiftTime(state)
  const base = { id: `event-${kind}-${now}`, type: kind, timestamp: state.gameTime }
  let s = state
  switch (kind) {
    case "power-cut": {
      // The pumps' normal supply is lost; the turbine can still supply them (bible §8)
      s = addLog({ ...s, mainsPower: false }, "engineer", "Power cut detected. Recommend disconnecting turbine to power the pumps.", HEAD_ENGINEER)
      return begin(s, { ...base, duration: planned ?? Math.round(between(rng, tuning.powerCutSeconds)) })
    }
    case "rod-stuck": {
      // Only rods that still move: one the player has already jammed can't jam again.
      const free = s.controlRods.flatMap((rod, i) => (rod.stuck ? [] : [i]))
      if (!free.length) return s
      const rods = pickDistinct(rng, free.length, wholeBetween(rng, tuning.rodJamRods)).map((k) => free[k])
      const names = rods.map((i) => i + 1).join(", ")
      // A jammed rod stops wherever it is, including mid-travel, for the rest of the shift (owner, 2026-10-16).
      // The event itself is over at once: the warning on the alarm screen stays while the rods are jammed.
      s = { ...s, controlRods: s.controlRods.map((rod, i) => (rods.includes(i) ? { ...rod, stuck: true, target: rod.insertion } : rod)) }
      s = addLog(s, "engineer", `Control rods ${names} are stuck in position and can't be moved due to a ruptured fuel channel.`, HEAD_ENGINEER)
      return begin(s, { ...base, duration: 0, data: { affectedRods: rods } })
    }
    case "pump-trip": {
      const running = s.waterPumps.filter((p) => p.on && !p.tripped)
      const pool = running.length ? running : s.waterPumps.filter((p) => !p.tripped)
      if (!pool.length) return s
      const pump = pool[Math.floor(rng() * pool.length)]
      s = { ...s, waterPumps: s.waterPumps.map((p) => (p.id === pump.id ? { ...p, tripped: true } : p)) }
      s = addLog(s, "alarm", `Pump ${pump.id} has tripped. Switch on a standby pump to keep the flow up.`, PUMP_OPERATOR)
      return begin(s, { ...base, duration: planned ?? Math.round(between(rng, tuning.pumpTripSeconds)), data: { affectedPumps: [pump.id] } })
    }
    case "grid-hold": {
      if (s.powerTarget === null) return s
      const duration = planned ?? Math.round(between(rng, tuning.gridHoldSeconds))
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
    case "rod-stuck":
      break // the rods stay jammed (owner, 2026-10-16)
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

// --- Rods jammed by high steam (every mode) ---

// A rod sent into the core from 0% while steam is high jams with just its graphite tip in (owner, 2026-10-16),
// as the rods did when AZ-5 was pressed on 26 April 1986. That covers lever orders and AZ-5 alike. No message:
// nobody saw it coming, so only the alarm screen's jammed-rods warning reports it.
export function jamRodsInHighSteam(state: GameState): GameState {
  if (state.steamVolume < THRESHOLDS.steamVolume.highWarning) return state
  if (!state.controlRods.some((rod) => !rod.stuck && rod.insertion === 0 && rod.target > 0)) return state
  const at = EVENT_TUNING.steamJamInsertion
  return {
    ...state,
    controlRods: state.controlRods.map((rod) => (!rod.stuck && rod.insertion === 0 && rod.target > 0 ? { ...rod, insertion: at, target: at, stuck: true } : rod)),
  }
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
// wording, 2026-10-12: the warning doesn't give the number). When it happens is up to the shift's plan.
function announceTargetChange(state: GameState, tuning: ShiftEventTuning, now: number, rng: Rng): GameState {
  if (state.powerTarget === null) return state
  const target = nextTarget(state.powerTarget, tuning, rng)
  const s: GameState = { ...state, pendingTarget: { target, at: now + EVENT_TUNING.targetNotice, source: "grid", from: GRID_CONTROLLER } }
  return addLog(s, "grid", "We may soon require an adjustment in your power output.", GRID_CONTROLLER)
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

export function checkTurbineTrip(prev: GameState): GameState {
  // The trip's alarm sounds until the player next sets the turbine (back to the grid, or to the pumps)
  const state = prev.turbineTripped && prev.turbineMode !== "idle" ? { ...prev, turbineTripped: false } : prev
  if (!GAME_MODE_CONFIGS[state.mode]?.turbineTrips) return state.overpressureSeconds ? { ...state, overpressureSeconds: 0 } : state
  const over = state.turbineMode === "grid" && state.steamVolume >= THRESHOLDS.steamVolume.highWarning
  const seconds = over ? state.overpressureSeconds + 1 : 0
  if (seconds < EVENT_TUNING.turbineTripSeconds) return seconds === state.overpressureSeconds ? state : { ...state, overpressureSeconds: seconds }
  const s: GameState = { ...state, overpressureSeconds: 0, turbineMode: "idle", turbineConnected: false, turbineTripped: true }
  return addLog(
    s,
    "alarm",
    `Turbine disconnection implemented as per protocol. We can only reconnect turbine to grid once steam drops below ${THRESHOLDS.steamVolume.highWarning}.`,
    TURBINE_OPERATOR,
  )
}
