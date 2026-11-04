// Shift events and power targets (bible §12–§13): the shift's plan of events and their advance warnings, the target
// changes and holds that run alongside them, and the turbine trip. Pure: randomness is injected, so the scenario
// harness can replay whole shifts (scripts/sim). Numbers live in EVENT_TUNING (lib/sim/tuning.ts).
import {
  type EventKind,
  type GameEvent,
  type GameMode,
  type GameState,
  type LogSource,
  type ScheduledEvent,
  type ShiftEventKind,
  type TargetTrack,
  GAME_MODE_CONFIGS,
  SHIFT_EVENT_KINDS,
  THRESHOLDS,
  getPowerTolerance,
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

function eventDuration(kind: ShiftEventKind, tuning: ShiftEventTuning, rng: Rng): number {
  const range = { "power-cut": tuning.powerCutSeconds, "signal-loss": tuning.signalLossSeconds, "pump-trip": tuning.pumpTripSeconds, "rod-stuck": tuning.rodJamSeconds }[kind]
  return Math.round(between(rng, range))
}

// The shift's events (owner, 2026-11-03): a few different kinds (Easy 3 of the 4, Hard all 4) and a few more of any
// kind (Hard 2), in a random order at random times, never two at once and at least minEventGap apart. The free time
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
    hold: false,
    changes: 0,
    holdsLeft: tuning.holds,
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
  if (next && next.at <= now && !s.activeEvents.some((event) => event.type !== "grid-hold")) {
    plan = rest
    s = startEvent(s, next.kind, tuning, rng, next.duration)
  }
  return { ...s, eventPlan: plan }
}

// --- Target changes (bible §13, owner 2026-11-02) ---

// The grid's target changes run on their own track, whatever the events are doing. Each gives the same notice, with
// no number, then takes effect; a hold also narrows the window until it is lifted, once the player has held it. The
// next notice waits until the player has been on target for the settle time, so a target never moves just as it is
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
      t.hold = t.changes > 0 && holdNext(t, tuning, now, end, rng)
      if (t.hold) t.holdsLeft--
      t.changes++
      s = t.hold ? addLog(s, "grid", TARGET_NOTICE, GRID_CONTROLLER) : announceTargetChange(s, tuning, now, rng)
      t = { ...t, phase: "notice", takesEffectAt: now + EVENT_TUNING.targetNotice }
      break
    }
    case "notice": {
      // A plain change has just taken effect (applyPendingTarget runs first); a hold brings its target now
      if (now < t.takesEffectAt) break
      if (t.hold) s = startEvent(s, "grid-hold", tuning, rng)
      t = { ...t, phase: t.hold ? "holding" : "settling", since: now, steady: 0, need: Math.round(between(rng, t.hold ? tuning.holdForSeconds : tuning.settleSeconds)) }
      break
    }
    case "settling":
    case "holding": {
      if (s.activeEvents.some((event) => event.type === "power-cut" || event.type === "signal-loss")) t.since++
      t.steady = isPowerOnTarget(s) ? t.steady + 1 : 0
      if (t.steady < t.need && now - t.since < tuning.giveUpSeconds) break
      if (t.phase === "settling") {
        t = { ...t, phase: "waiting", noticeAt: now + 1 }
        break
      }
      s = addLog({ ...s, activeEvents: s.activeEvents.filter((event) => event.type !== "grid-hold") }, "grid", "Hold lifted. Normal tolerance restored.", GRID_CONTROLLER)
      t = { ...t, phase: "settling", since: now, steady: 0, need: Math.round(between(rng, tuning.settleSeconds)) }
      break
    }
  }
  return { ...s, targetTrack: t }
}

// The shift's holds are spread over the changes still likely to come: each change is a hold with a chance of the
// holds left over the changes left, and certainly once there are no more changes than holds left
function holdNext(t: TargetTrack, tuning: ShiftEventTuning, now: number, end: number, rng: Rng): boolean {
  if (t.holdsLeft <= 0) return false
  const changesLeft = 1 + Math.floor(Math.max(0, end - now) / tuning.changeEverySeconds)
  return t.holdsLeft >= changesLeft || rng() < t.holdsLeft / changesLeft
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
    case "grid-hold": {
      if (s.powerTarget === null) return s
      // A hold is a target change with a narrower window (owner, 2026-10-30): after the usual notice, the new target
      // and the narrow window come in together, and the grid says what the hold means. The step is half a target
      // change's, so it is quick to reach (owner, 2026-10-29). It lasts until the target track lifts it.
      const target = nextTarget(s.powerTarget, tuning, rng, EVENT_TUNING.holdStepFactor)
      s = addLog(countTargetChange({ ...s, powerTarget: target }), "grid", targetConfirmation(target), GRID_CONTROLLER)
      s = addLog(
        s,
        "grid",
        `This is a hold request: keep output within ±${formatMW(getPowerTolerance(target, true))} until we lift the hold.`,
        GRID_CONTROLLER,
      )
      return begin(s, { ...base, duration: 0 })
    }
  }
}

function begin(s: GameState, event: GameEvent): GameState {
  return { ...s, activeEvents: [...s.activeEvents, event], eventHistory: [...s.eventHistory, event] }
}

// --- Ending events (every mode) ---

// A grid hold has no set length: the target track lifts it once it has been held (runTargetTrack)
export function expireEvents(state: GameState): GameState {
  const ended = state.activeEvents.filter((event) => event.type !== "grid-hold" && Math.abs(event.timestamp - state.gameTime) >= event.duration)
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
  // Every event counts, smaller ones too (owner, 2026-11-04). A grid hold never comes here: it counts as a target change.
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

// --- Power targets (bible §13) ---

// A step within the mode's range, never trivially small. Every target in the range is as likely as any other, low ones
// included (owner, 2026-11-03): big swings are the heart of the game. A grid hold scales the step range down
// (stepFactor).
export function nextTarget(current: number, tuning: ShiftEventTuning, rng: Rng, stepFactor = 1): number {
  const [min, max] = tuning.targetRange
  const maxStep = tuning.targetMaxStep * stepFactor
  const minStep = tuning.targetMinStep * stepFactor
  const lo = Math.max(min, current - maxStep)
  const hi = Math.min(max, current + maxStep)
  for (let tries = 0; tries < 50; tries++) {
    const target = Math.min(max, Math.max(min, Math.round(between(rng, [lo, hi]) / 100) * 100))
    if (Math.abs(target - current) >= minStep) return target
  }
  const towardMiddle = current < (min + max) / 2 ? 1 : -1
  return Math.min(max, Math.max(min, current + towardMiddle * Math.ceil(minStep / 100) * 100))
}

// The grid warns that demand has changed and confirms the new target when it takes effect, 60 s later (owner
// wording, 2026-10-12: the warning doesn't give the number). When it happens is up to the shift's plan. A grid
// hold gives the same notice and confirmation.
const TARGET_NOTICE = "We may soon require an adjustment in your power output."
const targetConfirmation = (target: number) => `New power output requested to be ${formatMW(target)}.`
const countTargetChange = (s: GameState): GameState => ({ ...s, stats: { ...s.stats, targetChanges: s.stats.targetChanges + 1 } })

function announceTargetChange(state: GameState, tuning: ShiftEventTuning, now: number, rng: Rng): GameState {
  if (state.powerTarget === null) return state
  const target = nextTarget(state.powerTarget, tuning, rng)
  const s: GameState = { ...state, pendingTarget: { target, at: now + EVENT_TUNING.targetNotice, source: "grid", from: GRID_CONTROLLER } }
  return addLog(s, "grid", TARGET_NOTICE, GRID_CONTROLLER)
}

// An announced change takes effect when its notice runs out (every mode with targets, incl. the Safety Test).
export function applyPendingTarget(state: GameState): GameState {
  const pending = state.pendingTarget
  if (!pending || getShiftTime(state) < pending.at) return state
  return addLog(countTargetChange({ ...state, powerTarget: pending.target, pendingTarget: null }), pending.source, targetConfirmation(pending.target), pending.from)
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
