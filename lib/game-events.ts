// Shift events and power targets (bible §12–§13): the shift's plan of events and their advance warnings, the target
// changes that run alongside them, and the turbine trip. Pure: randomness is injected, so the scenario
// harness can replay whole shifts (scripts/sim). Numbers live in EVENT_TUNING (lib/sim/tuning.ts).
import {
  type ControlRod,
  type EventKind,
  type GameEvent,
  type GameMode,
  type GameState,
  type LogSource,
  type OneOffTarget,
  type ScheduledEvent,
  type ScheduledOneOff,
  type TargetTrack,
  GAME_MODE_CONFIGS,
  ONE_OFF_TARGETS,
  SHIFT_EVENT_KINDS,
  THRESHOLDS,
  getShiftTime,
} from "./types"
import { EVENT_TUNING, type ShiftEventTuning } from "./sim/tuning"
import { FIRST_LOG_AT, addLog, formatMW } from "./game-utils"
import { isPowerOnTarget } from "./game-mechanics"
import type { Rng } from "./sim/rng"

type Range = readonly [number, number]

// Who sends each message. Every message comes from a person (owner, 2026-10-12).
const GRID_CONTROLLER = "GRID CONTROLLER"
const HEAD_ENGINEER = "HEAD ENGINEER"
const SHIFT_FOREMAN = "SHIFT FOREMAN"
const PUMP_OPERATOR = "PUMP OPERATOR"
const TURBINE_OPERATOR = "TURBINE OPERATOR"
const REACTOR_TECHNICIAN = "REACTOR TECHNICIAN"
const UNIT_1 = "UNIT 1"

const between = (rng: Rng, [lo, hi]: Range) => lo + rng() * (hi - lo)
const wholeBetween = (rng: Rng, [lo, hi]: Range) => Math.min(hi, lo + Math.floor(rng() * (hi - lo + 1)))
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

function pickDistinct(rng: Rng, n: number, count: number): number[] {
  const pool = Array.from({ length: n }, (_, i) => i)
  const picked: number[] = []
  while (picked.length < Math.min(n, count)) picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  return picked.sort((a, b) => a - b)
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function shiftEventTuning(mode: GameMode): ShiftEventTuning | null {
  if (!GAME_MODE_CONFIGS[mode]?.hasRandomEvents) return null
  return mode === "hard" ? EVENT_TUNING.hard : EVENT_TUNING.easy
}

// --- The shift's events ---

function eventDuration(kind: EventKind, tuning: ShiftEventTuning, rng: Rng): number {
  const range = { "power-cut": tuning.powerCutSeconds, "signal-loss": tuning.signalLossSeconds, "pump-trip": tuning.pumpTripSeconds, "rod-stuck": tuning.rodJamSeconds }[kind]
  return Math.round(between(rng, range))
}

// The shift's events (owner, 2026-11-03): a few different kinds (Easy 3 of the 4, Hard all 4; extraEvents can add more
// of any kind), in a random order at random times, never two at once and at least minEventGap apart. The free time
// is shared out at random points and the events laid end to end between them, each gap topped up to the minimum, so
// every arrangement is as likely as any other. The first starts a minute in at the earliest. They run right up to the
// end of the shift, with the last one over by then (owner, 2026-11-02). Target changes run separately (runTargetTrack).
export function planShiftEvents(tuning: ShiftEventTuning, shiftLength: number, rng: Rng): ScheduledEvent[] {
  const kinds = shuffle(rng, [
    ...shuffle(rng, SHIFT_EVENT_KINDS).slice(0, tuning.differentKinds),
    ...Array.from({ length: tuning.extraEvents }, () => SHIFT_EVENT_KINDS[Math.floor(rng() * SHIFT_EVENT_KINDS.length)]),
  ])
  const durations = kinds.map((kind) => eventDuration(kind, tuning, rng))
  const gap = EVENT_TUNING.minEventGap
  const free = Math.max(0, shiftLength - tuning.firstEventAfter - sum(durations) - gap * (kinds.length - 1))
  const points = kinds.map(() => rng() * free).sort((a, b) => a - b)
  let laid = 0
  return kinds.map((kind, i) => {
    const at = Math.round(tuning.firstEventAfter + points[i] + laid + gap * i)
    laid += durations[i]
    return { at, kind, warned: false, duration: durations[i] }
  })
}

// --- Per-second driver (Easy and Hard) ---

export function runShiftEvents(state: GameState, rng: Rng): GameState {
  const tuning = shiftEventTuning(state.mode)
  if (!tuning || state.timeLimit === null) return state
  const now = getShiftTime(state)
  let s = state.eventPlan && state.targetTrack ? state : startShift(state, tuning, now, rng)

  // The shift's opening order, a few seconds into play
  if (s.log.length === 0 && now >= FIRST_LOG_AT && s.powerTarget !== null) {
    s = addLog(
      s,
      "grid",
      `Unit 4, your shift has started. Hold output at ${formatMW(s.powerTarget)}. The grid controller will let us know if they need any adjustments in power output`,
      SHIFT_FOREMAN,
    )
  }

  s = runEvents(s, tuning, now, rng)
  return runTargetTrack(s, tuning, now, rng)
}

function startShift(state: GameState, tuning: ShiftEventTuning, now: number, rng: Rng): GameState {
  const eventPlan = state.eventPlan ?? planShiftEvents(tuning, state.timeLimit ?? 0, rng).filter((e) => e.at > now)
  const targetTrack: TargetTrack = state.targetTrack ?? {
    phase: "waiting",
    noticeAt: Math.max(now, Math.round(between(rng, tuning.firstNotice))),
    takesEffectAt: 0,
    since: 0,
    steady: 0,
    need: 0,
    changes: 0,
    oneOffs: planOneOffs(tuning, state.timeLimit ?? 0, rng),
    returnTo: null,
  }
  return { ...state, eventPlan, targetTrack, nextTargetChangeAt: null }
}

// Each event is warned of in advance where it has a warning (bible §12), e.g. grid instability before a power cut,
// and starts on time. The plan never overlaps two; as a safety net, one waits while another runs.
function runEvents(state: GameState, tuning: ShiftEventTuning, now: number, rng: Rng): GameState {
  let s = state
  let plan = (s.eventPlan ?? []).map((e) => {
    const lead = EVENT_TUNING.warningLead[e.kind]
    if (!lead || e.warned || now < e.at - lead) return e
    const warning = WARNINGS[e.kind]
    if (warning) s = addLog(s, warning.source, warning.text, warning.from)
    return { ...e, warned: true }
  })
  const [next, ...rest] = plan
  if (next && next.at <= now && !s.activeEvents.length) {
    plan = rest
    s = startEvent(s, next.kind, tuning, rng, next.duration)
  }
  return { ...s, eventPlan: plan }
}

// --- Target changes (bible §13, owner 2026-11-02) ---

// The grid's target changes run on their own track, whatever the events are doing. Each gives the same notice, with
// no number, then takes effect. The next notice waits until the player has been on target for the settle time, so a target never moves just as it is
// reached, and never sits unchanged for long. One never reached is moved on after giveUpSeconds, a clock that stops
// while a power cut or signal loss puts the target out of reach or out of sight. Nothing is announced in the last
// couple of minutes.
function runTargetTrack(state: GameState, tuning: ShiftEventTuning, now: number, rng: Rng): GameState {
  if (!state.targetTrack || state.powerTarget === null) return state
  const end = (state.timeLimit ?? 0) - tuning.lastNoticeBefore
  let s = state
  let t: TargetTrack = { ...state.targetTrack }
  switch (t.phase) {
    case "waiting": {
      if (now < t.noticeAt || now > end || s.pendingTarget) break
      // Never the first change, and an ordinary change always comes between two one-offs (owner, 2026-11-06)
      const [oneOff, ...laterOneOffs] = t.oneOffs
      const oneOffDue = oneOff && now >= oneOff.dueAt && t.changes > 0 && t.returnTo === null
      t.changes++
      if (oneOffDue) {
        t = { ...t, oneOffs: laterOneOffs, returnTo: s.powerTarget }
        s = announceOneOff(s, oneOff.kind, now)
      } else {
        s = announceTargetChange(s, t.returnTo ?? s.powerTarget, tuning, now, rng)
        t.returnTo = null
      }
      t = { ...t, phase: "notice", takesEffectAt: now + EVENT_TUNING.targetNotice }
      break
    }
    case "notice": {
      // The change has just taken effect (applyPendingTarget runs first)
      if (now < t.takesEffectAt) break
      t = { ...t, phase: "settling", since: now, steady: 0, need: Math.round(between(rng, tuning.settleSeconds)) }
      break
    }
    case "settling": {
      if (s.activeEvents.some((event) => event.type === "power-cut" || event.type === "signal-loss")) t.since++
      t.steady = isPowerOnTarget(s) ? t.steady + 1 : 0
      if (t.steady >= t.need || now - t.since >= tuning.giveUpSeconds) t = { ...t, phase: "waiting", noticeAt: now + 1 }
      break
    }
  }
  return { ...s, targetTrack: t }
}

// The shift's one-off targets, each once and in either order, at random times. Each is due early enough to fit in even
// if the grid has to give up waiting along the way: the last by one slowest gap between changes before the notices stop,
// and the first by more, as an ordinary change has to come between them. A player failing every target may miss the
// second, but will have been fired by then.
function planOneOffs(tuning: ShiftEventTuning, shiftLength: number, rng: Rng): ScheduledOneOff[] {
  const slowestGap = EVENT_TUNING.targetNotice + tuning.giveUpSeconds
  const lastNotice = shiftLength - tuning.lastNoticeBefore
  const [first, second] = shuffle(rng, ONE_OFF_TARGETS)
  const firstAt = between(rng, [slowestGap / 2, lastNotice - 2.5 * slowestGap])
  return [
    { kind: first, dueAt: Math.round(firstAt) },
    { kind: second, dueAt: Math.round(between(rng, [firstAt, lastNotice - slowestGap])) },
  ]
}

const WARNINGS: Partial<Record<EventKind, { source: LogSource; from: string; text: string }>> = {
  "power-cut": {
    source: "grid",
    from: GRID_CONTROLLER,
    text: "Reports of power cable damage in your sector. Your incoming power supply may be affected",
  },
  "rod-stuck": {
    source: "engineer",
    from: REACTOR_TECHNICIAN,
    text: "Detected pressure fluctuations in the fuel channels. Control rod movement may be impacted.",
  },
  "signal-loss": {
    source: "engineer",
    from: SHIFT_FOREMAN,
    text: "Electricians are reporting faults on the cabling to the reactor hall.",
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
      s = addLog({ ...s, mainsPower: false }, "engineer", "We've lost grid mains power to the pumps!", HEAD_ENGINEER)
      return begin(s, { ...base, duration: planned ?? Math.round(between(rng, tuning.powerCutSeconds)) })
    }
    case "signal-loss": {
      // The link to the reactor hall is down (owner, 2026-10-30): every reading taken there goes dark, so the player
      // has only power output to go on. The reactor itself runs on as usual (getHallSignal, lib/game-utils).
      s = addLog(s, "engineer", "I think we've lost the electrics to the reactor hall. None of the reactor instruments are reaching the control room.", HEAD_ENGINEER)
      return begin(s, { ...base, duration: planned ?? Math.round(between(rng, tuning.signalLossSeconds)) })
    }
    case "rod-stuck": {
      // Only rods that still move: one the player has already jammed can't jam again.
      const free = s.controlRods.flatMap((rod, i) => (rod.stuck ? [] : [i]))
      if (!free.length) return s
      const rods = pickDistinct(rng, free.length, wholeBetween(rng, tuning.rodJamRods)).map((k) => free[k])
      const names = rods.map((i) => i + 1).join(", ")
      // A jammed rod stops wherever it is, including mid-travel, until the jam ends (owner, 2026-10-30). The warning
      // on the alarm screen stays while the rods are jammed.
      s = { ...s, controlRods: s.controlRods.map((rod, i) => (rods.includes(i) ? { ...rod, stuck: true, target: rod.insertion } : rod)) }
      s = addLog(s, "engineer", `Control rods ${names} are stuck in position and can't be moved due to a ruptured fuel channel.`, HEAD_ENGINEER)
      return begin(s, { ...base, duration: planned ?? Math.round(between(rng, tuning.rodJamSeconds)), data: { affectedRods: rods } })
    }
    case "pump-trip": {
      const running = s.waterPumps.filter((p) => p.on && !p.tripped)
      const pool = running.length ? running : s.waterPumps.filter((p) => !p.tripped)
      if (!pool.length) return s
      const pump = pool[Math.floor(rng() * pool.length)]
      s = { ...s, waterPumps: s.waterPumps.map((p) => (p.id === pump.id ? { ...p, tripped: true } : p)) }
      s = addLog(s, "alarm", `Pump ${pump.id} has tripped! Is it in use?`, PUMP_OPERATOR)
      return begin(s, { ...base, duration: planned ?? Math.round(between(rng, tuning.pumpTripSeconds)), data: { affectedPumps: [pump.id] } })
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
        // A turbine on the pumps keeps supplying them, steam-limited, until the player switches it back
        s.turbineMode === "pumps" ? "Incoming power restored and available for water pumps, power output from turbine can be exported to grid on your orders." : "Incoming power to water pumps restored.",
        HEAD_ENGINEER,
      )
      break
    case "rod-stuck": {
      // Only the jam's own rods free, where they stopped; a rod jammed by high steam stays jammed
      const rods = event.data?.affectedRods ?? []
      s = { ...s, controlRods: s.controlRods.map((rod, i) => (rods.includes(i) ? { ...rod, stuck: false } : rod)) }
      const names = rods.map((i) => i + 1).join(", ")
      s = addLog(s, "engineer", `The ruptured fuel channel has been repaired. Control rods ${names} can be moved again.`, HEAD_ENGINEER)
      break
    }
    case "pump-trip": {
      const pumps = event.data?.affectedPumps ?? []
      s = { ...s, waterPumps: s.waterPumps.map((p) => (pumps.includes(p.id) ? { ...p, tripped: false } : p)) }
      s = addLog(s, "engineer", `Pump ${pumps.join(", ")} is back in service.`, PUMP_OPERATOR)
      break
    }
    case "signal-loss":
      s = addLog(s, "engineer", "Electrics to the reactor hall are back. Reactor instruments are reading again.", REACTOR_TECHNICIAN)
      break
  }
  // Every event counts, smaller ones too (owner, 2026-11-04)
  return { ...s, stats: { ...s.stats, emergenciesHandled: s.stats.emergenciesHandled + 1 } }
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

// --- Rods jammed by hot fuel (every mode) ---

// Fuel reaching its high warning jams every rod that has gone slow, where it is, for a while (owner, 2026-11-06). It
// happens as the fuel gets there, so a rod that goes slow while it's already hot is safe until the next time. No message:
// the alarm screen reports both the hot fuel and the rods. Physical, so it happens with the hall's signal lost too.
export function jamSlowRodsInHotFuel(prev: GameState, state: GameState, rng: Rng): GameState {
  const high = THRESHOLDS.fuelTemp.highWarning
  if (prev.fuelTemp >= high || state.fuelTemp < high) return state
  const jams = (rod: ControlRod) => rod.slow && !rod.stuck
  if (!state.controlRods.some(jams)) return state
  const jamSeconds = Math.round(between(rng, EVENT_TUNING.hotFuelJamSeconds))
  return { ...state, controlRods: state.controlRods.map((rod) => (jams(rod) ? { ...rod, stuck: true, target: rod.insertion, jamSeconds } : rod)) }
}

// A hot-fuel jam frees itself, however hot the fuel still is. Any other jam has no time on it here.
export function freeHotFuelJams(state: GameState): GameState {
  if (!state.controlRods.some((rod) => rod.jamSeconds > 0)) return state
  return {
    ...state,
    controlRods: state.controlRods.map((rod) => (rod.jamSeconds > 0 ? { ...rod, jamSeconds: rod.jamSeconds - 1, stuck: rod.jamSeconds > 1 } : rod)),
  }
}

// --- Power targets (bible §13) ---

// A step within the mode's range, never trivially small. Every target in the range is as likely as any other, low ones
// included (owner, 2026-11-03): big swings are the heart of the game.
export function nextTarget(current: number, tuning: ShiftEventTuning, rng: Rng): number {
  const [min, max] = tuning.targetRange
  const minStep = tuning.targetMinStep
  const lo = Math.max(min, current - tuning.targetMaxStep)
  const hi = Math.min(max, current + tuning.targetMaxStep)
  for (let tries = 0; tries < 50; tries++) {
    const target = Math.min(max, Math.max(min, Math.round(between(rng, [lo, hi]) / 100) * 100))
    if (Math.abs(target - current) >= minStep) return target
  }
  const towardMiddle = current < (min + max) / 2 ? 1 : -1
  return Math.min(max, Math.max(min, current + towardMiddle * Math.ceil(minStep / 100) * 100))
}

// The grid warns that demand has changed and confirms the new target when it takes effect, 60 s later (owner
// wording, 2026-10-12: the warning doesn't give the number). When it happens is up to the shift's plan.
const TARGET_NOTICE = "We may soon require an adjustment in your power output."
const targetConfirmation = (target: number) => `New power output requested to be ${formatMW(target)}.`
const countTargetChange = (s: GameState): GameState => ({ ...s, stats: { ...s.stats, targetChanges: s.stats.targetChanges + 1 } })

// The next target is drawn from `base`: the target in force, or after a one-off the target it replaced, as 0 MW or
// Unit 1's high target would otherwise pull every target after it to one end of the range.
function announceTargetChange(state: GameState, base: number | null, tuning: ShiftEventTuning, now: number, rng: Rng): GameState {
  if (base === null) return state
  const target = nextTarget(base, tuning, rng)
  const s: GameState = { ...state, pendingTarget: { target, at: now + EVENT_TUNING.targetNotice, source: "grid", from: GRID_CONTROLLER } }
  return addLog(s, "grid", TARGET_NOTICE, GRID_CONTROLLER)
}

// A one-off follows the same notice period and target rules as any other change; what's different is who asks and why.
function announceOneOff(state: GameState, oneOff: OneOffTarget, now: number): GameState {
  const { target, from, notice, confirmation } = ONE_OFF_DETAILS[oneOff]
  const s: GameState = { ...state, pendingTarget: { target, at: now + EVENT_TUNING.targetNotice, source: "grid", from, confirmation } }
  return addLog(s, "grid", notice, from)
}

const ONE_OFF_DETAILS: Record<OneOffTarget, { target: number; from: string; notice: string; confirmation: string }> = {
  "grid-oversupply": {
    target: 0,
    from: GRID_CONTROLLER,
    notice: TARGET_NOTICE,
    confirmation: `The grid is over-supplied. New power output requested to be ${formatMW(0)}. Disconnect your turbine from the grid.`,
  },
  "unit-1-test": {
    target: EVENT_TUNING.unit1TestTarget,
    from: UNIT_1,
    notice: "Unit 4, Unit 1 here. We're about to start a low-power safety test, so we'll need you to cover our output.",
    confirmation: `Our safety test is under way. We need ${formatMW(EVENT_TUNING.unit1TestTarget)} from you to cover it.`,
  },
}

// An announced change takes effect when its notice runs out (every mode with targets, incl. the Safety Test).
export function applyPendingTarget(state: GameState): GameState {
  const pending = state.pendingTarget
  if (!pending || getShiftTime(state) < pending.at) return state
  return addLog(countTargetChange({ ...state, powerTarget: pending.target, pendingTarget: null }), pending.source, pending.confirmation ?? targetConfirmation(pending.target), pending.from)
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
