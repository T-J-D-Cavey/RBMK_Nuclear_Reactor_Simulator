// Bible acceptance checks for shift events, power targets and the Safety Test (ai/high-level-plan.md
// §12–§14), run through the real game loop (lib/game-loop). Run: node --run sim:test
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  type GameMode,
  type GameState,
  type TargetTrack,
  GAME_MODE_CONFIGS,
  MAJOR_EVENT_KINDS,
  SHIFT_EVENT_KINDS,
  THRESHOLDS,
  getPowerTolerance,
  getShiftTime,
  isGridHoldActive,
} from "../../lib/types"
import { EVENT_TUNING } from "../../lib/sim/tuning"
import { seededRng } from "../../lib/sim/rng"
import { getRodMargin } from "../../lib/sim/reactor"
import { advanceGame, createNewGame } from "../../lib/game-loop"
import { isPowerOnTarget } from "../../lib/game-mechanics"
import {
  AZ5_LAMP_SECONDS,
  SIGNAL_DARK_AFTER,
  checkEventWarnings,
  formatMW,
  getAlarms,
  getHallSignal,
  getReactorWarnings,
  getWarningFlags,
  isAz5LampLit,
} from "../../lib/game-utils"
import { applyPendingTarget, checkTurbineTrip, planShiftEvents, runShiftEvents, startEvent } from "../../lib/game-events"
import {
  AZ5_ORDER,
  CREW_ACTS_SECONDS,
  DEPUTY_ORDER,
  DEPUTY_REACTS_SECONDS,
  DEPUTY_WITHDRAWAL,
  RODS_OUT_BELOW,
  SAFETY_TEST_SCRIPT,
} from "../../lib/safety-test"
import { REFERENCE_STATE } from "../../lib/sim/tuning"
import { makeBot, playGame, type GameRun } from "./bot"
import { az5 } from "./harness"

const isMajor = (kind: string) => (MAJOR_EVENT_KINDS as readonly string[]).includes(kind)
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// A game in the given mode with no planned events or target changes, starting from the balanced rods.
function quietGame(mode: GameMode): GameState {
  const s = createNewGame(mode)
  const rods = s.controlRods.map((r, i) => ({ ...r, insertion: REFERENCE_STATE.rods[i], target: REFERENCE_STATE.rods[i] }))
  const parked: TargetTrack = { phase: "waiting", noticeAt: Number.MAX_SAFE_INTEGER, takesEffectAt: 0, since: 0, steady: 0, need: 0, hold: false, changes: 0, holdsLeft: 0 }
  return { ...s, controlRods: rods, eventPlan: [], targetTrack: parked, nextTargetChangeAt: null }
}

const step = (s: GameState, seconds: number, rng = seededRng(1)) => {
  for (let i = 0; i < seconds; i++) s = advanceGame(s, rng)
  return s
}

// Whole shifts played by the competent bot, shared by several checks (computed once).
const played = new Map<GameMode, GameRun[]>()
function shifts(mode: GameMode): GameRun[] {
  if (!played.has(mode)) played.set(mode, SEEDS.map((seed) => playGame(createNewGame(mode), makeBot(), seed)))
  return played.get(mode)!
}

// Target changes seen in a run: when announced, when in force, from and to, and whether a grid hold set it (a hold
// names its target and sets it at once, at its notice; an announced change was pending first).
function targetChanges(run: GameRun, which: "announced" | "hold" | "all" = "announced") {
  const changes: { announced: number; effective: number; from: number; to: number; hold: boolean }[] = []
  let announced = -1
  run.states.forEach((s, i) => {
    const prev = run.states[i - 1]
    if (s.pendingTarget && !prev?.pendingTarget) announced = i + 1
    if (prev && s.powerTarget !== prev.powerTarget && s.powerTarget !== null && prev.powerTarget !== null) {
      const hold = !prev.pendingTarget
      if (which === "all" || hold === (which === "hold")) changes.push({ announced, effective: i + 1, from: prev.powerTarget, to: s.powerTarget, hold })
    }
  })
  return changes
}

// ---------- §12 Random emergency events ----------

test("§12 the shift's events: one of each kind (two on Hard) and a few more, random order and times, never two at once", () => {
  for (const mode of ["easy", "hard"] as const) {
    const tuning = EVENT_TUNING[mode]
    const length = GAME_MODE_CONFIGS[mode].timeLimit!
    const firstKinds = new Set<string>()
    const extraKinds = new Set<string>()
    const gaps: number[] = []
    for (let seed = 1; seed <= 2000; seed++) {
      const plan = planShiftEvents(tuning, length, seededRng(seed))
      const why = `${mode} seed ${seed}: ${plan.map((e) => `${e.kind}@${e.at}+${e.duration}`).join(" ")}`
      assert.equal(plan.length, 4 * tuning.eachKind + tuning.extraEvents, why)
      for (const kind of SHIFT_EVENT_KINDS) {
        const n = plan.filter((e) => e.kind === kind).length
        assert.ok(n >= tuning.eachKind && n <= tuning.eachKind + tuning.extraEvents, why)
        if (n > tuning.eachKind) extraKinds.add(kind)
      }
      firstKinds.add(plan[0].kind)
      // None in the first minute, the last over by the end, each as long as its kind lasts, and never two at once
      assert.ok(plan[0].at >= tuning.firstEventAfter && plan.at(-1)!.at + plan.at(-1)!.duration <= length, why)
      for (let i = 1; i < plan.length; i++) {
        assert.ok(plan[i].at >= plan[i - 1].at + plan[i - 1].duration, why)
        gaps.push(plan[i].at - plan[i - 1].at - plan[i - 1].duration)
      }
    }
    assert.equal(firstKinds.size, 4, `${mode}: any kind can come first`)
    assert.equal(extraKinds.size, 4, `${mode}: the extras can be of any kind`)
    // Random times: some events come back to back, others with minutes between
    assert.ok(Math.min(...gaps) < 5 && Math.max(...gaps) > 240, `${mode}: gaps ${Math.min(...gaps)}–${Math.max(...gaps)} s`)
  }
})

test("§12 a typical shift: every planned event happens, warned of in advance where it has a warning, never two at once", () => {
  const warnings: Record<string, string> = {
    "power-cut": "Reports of power cable damage",
    "signal-loss": "Electricians are reporting faults",
    "rod-stuck": "Detected pressure fluctuations",
  }
  for (const mode of ["easy", "hard"] as const) {
    const tuning = EVENT_TUNING[mode]
    for (const run of shifts(mode).filter((r) => r.final.hasWon)) {
      const events = run.final.eventHistory.filter((e) => e.type !== "grid-hold")
      assert.equal(events.length, 4 * tuning.eachKind + tuning.extraEvents, `${mode}: ${events.length} events`)
      const majors = events.filter((e) => isMajor(e.type)).length
      assert.equal(run.final.stats.emergenciesHandled, majors, "power cuts and signal losses count as emergencies handled")
      for (const event of events.filter((e) => e.type in warnings)) {
        const startedAt = (run.final.timeLimit ?? 0) - event.timestamp
        const warning = run.final.log.findLast((l) => l.time <= startedAt && l.text.startsWith(warnings[event.type]))
        assert.ok(warning && startedAt - warning.time >= EVENT_TUNING.warningLead[event.type]!, `${mode}: ${event.type} at ${startedAt}s warned at ${warning?.time}s`)
      }
      for (const s of run.states) {
        const running = s.activeEvents.filter((e) => e.type !== "grid-hold").map((e) => e.type)
        assert.ok(running.length <= 1, `${mode}: ${running.join(", ")} at once`)
      }
    }
  }
})

test("§12 a turbine trip only happens after a visible over-pressure warning", () => {
  // High steam while on the grid: the OVR-P lamp and a countdown warning show for 20 s before the trip.
  let s: GameState = { ...quietGame("easy"), steamVolume: 350 }
  for (let second = 1; second < EVENT_TUNING.turbineTripSeconds; second++) {
    s = checkTurbineTrip(s)
    assert.equal(s.turbineMode, "grid")
    assert.ok(getWarningFlags(s).highSteam, "OVR-P lamp lit")
    assert.ok(checkEventWarnings(s).some((w) => w.includes("Turbine over-pressure")), "countdown shown")
  }
  s = checkTurbineTrip(s)
  assert.equal(s.turbineMode, "idle")
  assert.ok(s.log.at(-1)?.text.startsWith("Turbine disconnection implemented"))
  // Steam dropping back below the warning resets the count; off the grid, or in Free mode, it never trips.
  let dip: GameState = { ...quietGame("easy"), steamVolume: 350 }
  for (let i = 0; i < 15; i++) dip = checkTurbineTrip(dip)
  dip = checkTurbineTrip({ ...dip, steamVolume: 250 })
  for (let i = 0; i < 15; i++) dip = checkTurbineTrip({ ...dip, steamVolume: 350 })
  assert.equal(dip.turbineMode, "grid")
  let free: GameState = { ...quietGame("free"), steamVolume: 350 }
  for (let i = 0; i < 60; i++) free = checkTurbineTrip(free)
  assert.equal(free.turbineMode, "grid")
})

test("alarms: a warning with its own alarm doesn't also sound the general alarm; events sound the event alarm", () => {
  const calm = quietGame("easy")
  assert.deepEqual(getAlarms(calm), { general: false, event: false, highRadioactivity: false, highReactorTemp: false, highSteamOrXenon: false })
  // Own alarms start exactly at the warning, and only they sound
  const hot = { ...calm, radioactivity: THRESHOLDS.radioactivity.highWarning, reactorTemp: THRESHOLDS.reactorTemp.warning, xenon: THRESHOLDS.xenon.highWarning }
  assert.deepEqual(getAlarms(hot), { general: false, event: false, highRadioactivity: true, highReactorTemp: true, highSteamOrXenon: true })
  let overpressure: GameState = { ...calm, steamVolume: THRESHOLDS.steamVolume.highWarning }
  overpressure = checkTurbineTrip(overpressure)
  assert.ok(checkEventWarnings(overpressure).length > 0, "countdown shown")
  assert.equal(getAlarms(overpressure).general, false, "the countdown shares the steam alarm")
  assert.equal(getAlarms(overpressure).highSteamOrXenon, true)
  // Warnings without one sound the general alarm
  for (const other of [{ fuelTemp: THRESHOLDS.fuelTemp.lowWarning }, { radioactivity: THRESHOLDS.radioactivity.lowWarning }]) {
    assert.equal(getAlarms({ ...calm, ...other }).general, true, JSON.stringify(other))
  }
  assert.equal(getAlarms({ ...calm, controlRods: calm.controlRods.map((r) => ({ ...r, insertion: 10, target: 10 })) }).general, true, "low rod margin")
  // Power cuts, pump trips and signal losses sound the event alarm while they last; grid holds and target changes don't
  const rng = seededRng(1)
  for (const kind of ["power-cut", "pump-trip", "signal-loss"] as const) {
    let s = startEvent(calm, kind, EVENT_TUNING.easy, rng)
    assert.equal(getAlarms(s).event, true, kind)
    s = step(s, s.activeEvents[0].duration + 1, rng)
    assert.equal(getAlarms(s).event, false, `${kind} over`)
  }
  assert.equal(getAlarms(startEvent(calm, "grid-hold", EVENT_TUNING.easy, rng)).event, false, "grid hold")
  // A rod jam sounds the event alarm too, and its jammed-rods warning doesn't also sound the general alarm
  const jam = step(startEvent(calm, "rod-stuck", EVENT_TUNING.easy, rng), 1, rng)
  assert.equal(getAlarms(jam).event, true, "rod jam: event alarm")
  assert.equal(getAlarms(jam).general, false, "rod jam: no general alarm")
  assert.equal(getAlarms(step(jam, jam.activeEvents[0].duration - 2, rng)).event, true, "rod jam: still sounding while it lasts")
  assert.equal(getAlarms(step(jam, jam.activeEvents[0].duration, rng)).event, false, "rod jam over")
  // A rod jammed by high steam sounds the general alarm, during a rod jam too
  const steamJam = { ...calm, controlRods: calm.controlRods.map((r, i) => (i === 0 ? { ...r, stuck: true } : r)) }
  assert.deepEqual([getAlarms(steamJam).general, getAlarms(steamJam).event], [true, false], "steam jam: general alarm")
  const both = startEvent(steamJam, "rod-stuck", EVENT_TUNING.easy, rng)
  assert.deepEqual([getAlarms(both).general, getAlarms(both).event], [true, true], "steam jam during a rod jam: both")
  const announced = applyPendingTarget({ ...calm, pendingTarget: { target: 6000, at: 0, source: "grid", from: "GRID CONTROLLER" } })
  assert.equal(announced.powerTarget, 6000)
  assert.equal(getAlarms(announced).event, false, "target change")
  // A turbine trip sounds it until the player sets the turbine again
  let trip: GameState = { ...calm, steamVolume: 350 }
  for (let i = 0; i < EVENT_TUNING.turbineTripSeconds; i++) trip = checkTurbineTrip(trip)
  assert.equal(trip.turbineMode, "idle")
  trip = checkTurbineTrip({ ...trip, steamVolume: 250 })
  assert.equal(getAlarms(trip).event, true, "still tripped while left idle")
  trip = checkTurbineTrip({ ...trip, turbineMode: "pumps" })
  assert.equal(getAlarms(trip).event, false, "reset by the player")
})

test("§12 a rod jam stops rods where they are, even mid-travel, until it ends; then they move again", () => {
  const rng = seededRng(3)
  let s = quietGame("easy")
  s = { ...s, controlRods: s.controlRods.map((r) => ({ ...r, target: 100 })) }
  s = step(s, 2, rng)
  const logged = s.log.length
  s = startEvent(s, "rod-stuck", EVENT_TUNING.easy, rng)
  assert.equal(s.log.length, logged + 1, "the head engineer reports the jam")
  const jam = s.activeEvents[0]
  const [lo, hi] = EVENT_TUNING.easy.rodJamSeconds
  assert.ok(jam.duration >= lo && jam.duration <= hi, `lasts ${jam.duration} s`)
  const jammed = jam.data!.affectedRods!
  const stoppedAt = jammed.map((i) => s.controlRods[i].insertion)
  assert.ok(stoppedAt.every((p) => p > 0 && p < 100), `stopped mid-travel at ${stoppedAt}`)
  s = step(s, jam.duration - 1, rng)
  jammed.forEach((i, k) => {
    assert.ok(s.controlRods[i].stuck, "still jammed")
    assert.equal(s.controlRods[i].insertion, stoppedAt[k], "still where it stopped")
  })
  assert.ok(s.controlRods.filter((_, i) => !jammed.includes(i)).every((r) => r.insertion === 100))
  const warning = checkEventWarnings(s).find((w) => w.startsWith("WARNING: Issue detected with control rods"))
  assert.ok(warning && jammed.every((i) => warning.includes(String(i + 1))), `warning names the rods: ${warning}`)
  // It ends: the rods are free where they stopped, the head engineer says so, and the warning clears
  s = step(s, 1, rng)
  assert.equal(s.activeEvents.length, 0)
  jammed.forEach((i, k) => assert.deepEqual([s.controlRods[i].stuck, s.controlRods[i].insertion], [false, stoppedAt[k]]))
  assert.equal(s.log.length, logged + 2)
  assert.ok(s.log.at(-1)!.text.startsWith("The ruptured fuel channel has been repaired") && jammed.every((i) => s.log.at(-1)!.text.includes(String(i + 1))))
  assert.ok(!checkEventWarnings(s).some((w) => w.includes("control rod")), "the warning clears")
  assert.equal(s.stats.emergenciesHandled, 0, "a smaller event is not a major emergency")
  // ...and they answer the levers again
  s = step({ ...s, controlRods: s.controlRods.map((r) => ({ ...r, target: 100 })) }, 20, rng)
  assert.ok(s.controlRods.every((r) => r.insertion === 100))
})

test("§12 a rod jam frees only its own rods: one jammed by high steam stays jammed", () => {
  const base = quietGame("easy")
  const pre = { ...base, controlRods: base.controlRods.map((r, i) => (i === 0 ? { ...r, stuck: true } : r)) }
  let s = startEvent(pre, "rod-stuck", EVENT_TUNING.easy, seededRng(2))
  assert.ok(!s.activeEvents[0].data!.affectedRods!.includes(0))
  s = step(s, s.activeEvents[0].duration + 1)
  assert.deepEqual(s.controlRods.map((r) => r.stuck), [true, false, false, false, false, false, false, false, false, false])
})

test("§12 a rod jam takes 3–4 rods on Easy, 4–5 on Hard, never one already jammed", () => {
  for (const mode of ["easy", "hard"] as const) {
    const [lo, hi] = EVENT_TUNING[mode].rodJamRods
    const counts = new Set<number>()
    for (let seed = 1; seed <= 40; seed++) {
      const s = startEvent(quietGame(mode), "rod-stuck", EVENT_TUNING[mode], seededRng(seed))
      const n = s.controlRods.filter((r) => r.stuck).length
      assert.ok(n >= lo && n <= hi, `${mode} seed ${seed}: ${n} rods`)
      counts.add(n)
    }
    assert.equal(counts.size, 2, `${mode}: both sizes occur`)
  }
  // Eight rods already jammed by the player: the event can only take the other two
  const base = quietGame("hard")
  const pre = { ...base, controlRods: base.controlRods.map((r, i) => (i < 8 ? { ...r, stuck: true } : r)) }
  const s = startEvent(pre, "rod-stuck", EVENT_TUNING.hard, seededRng(1))
  assert.deepEqual(s.activeEvents[0].data!.affectedRods, [8, 9])
  assert.ok(s.controlRods.every((r) => r.stuck))
})

test("a rod sent in from 0% while steam is high jams at 1%, by lever or AZ-5, with no message", () => {
  const base = quietGame("free")
  const rods = (s: GameState, at: number[], to: number[]): GameState => ({
    ...s,
    controlRods: s.controlRods.map((r, i) => ({ ...r, insertion: at[i], target: to[i] })),
  })
  const at = [0, 0, 0, 50, 50, 50, 100, 100, 100, 100]
  // Lever: rod 1 ordered in, rod 2 left out, rod 4 ordered further in
  const lever = rods({ ...base, steamVolume: THRESHOLDS.steamVolume.highWarning }, at, [40, 0, 0, 100, 50, 50, 100, 100, 100, 100])
  let s = step(lever, 3)
  assert.deepEqual([s.controlRods[0].insertion, s.controlRods[0].stuck], [EVENT_TUNING.steamJamInsertion, true], "rod 1 jammed at 1%")
  assert.deepEqual([s.controlRods[1].insertion, s.controlRods[1].stuck], [0, false], "rod 2 untouched")
  assert.ok(!s.controlRods[3].stuck && s.controlRods[3].insertion > 50, "a rod already in moves as usual")
  assert.equal(s.log.length, 0, "no shift log message")
  assert.ok(checkEventWarnings(s).some((w) => w === "WARNING: Issue detected with control rod 1."), "the warning reports it")
  assert.equal(getAlarms(s).general, true)
  // AZ-5: every rod at 0% jams with its tip in; the rest go in
  s = step(az5(rods({ ...base, steamVolume: 350 }, at, at)), 20)
  assert.deepEqual(s.controlRods.map((r) => r.stuck), [true, true, true, false, false, false, false, false, false, false])
  assert.ok(s.controlRods.slice(0, 3).every((r) => r.insertion === EVENT_TUNING.steamJamInsertion))
  assert.ok(s.controlRods.slice(3).every((r) => r.insertion === 100))
  // Below the high-steam warning a rod leaves 0% as usual
  s = step(rods({ ...base, steamVolume: THRESHOLDS.steamVolume.highWarning - 1 }, at, [40, 0, 0, 50, 50, 50, 100, 100, 100, 100]), 3)
  assert.ok(!s.controlRods[0].stuck && s.controlRods[0].insertion > 10)
})

test("the AZ-5 lamp stays lit for 5 s after a press", () => {
  let s: GameState = { ...quietGame("easy"), az5PressedAt: 0 }
  assert.equal(isAz5LampLit(s), true)
  s = step(s, AZ5_LAMP_SECONDS - 1)
  assert.equal(isAz5LampLit(s), true)
  s = step(s, 1)
  assert.equal(isAz5LampLit(s), false)
  assert.equal(isAz5LampLit(quietGame("easy")), false, "never pressed")
})

test("§12 a power cut takes the pumps' mains supply; the turbine can supply them; it counts as handled", () => {
  const rng = seededRng(5)
  let s = startEvent(quietGame("easy"), "power-cut", EVENT_TUNING.easy, rng)
  const cut = s.activeEvents[0]
  assert.ok(cut.duration >= 20 && cut.duration <= 45)
  s = step(s, 1, rng)
  assert.ok(s.waterPumps.every((p) => !p.powered), "no supply on the grid")
  assert.ok(checkEventWarnings(s).some((w) => w.startsWith("WARNING: No mains power detected.")), "the alarm screen says why the lamp is lit")
  assert.equal(getAlarms(s).general, false, "it shares the event alarm")
  s = step({ ...s, turbineMode: "pumps", turbineConnected: false }, 2, rng)
  assert.ok(s.waterPumps.filter((p) => p.powered).length >= 2, "turbine supplies the ON pumps")
  assert.equal(s.powerOutput, 0)
  s = step(s, cut.duration, rng)
  assert.equal(s.mainsPower, true)
  assert.ok(!checkEventWarnings(s).some((w) => w.includes("mains power")), "the warning clears with the event")
  assert.equal(s.stats.emergenciesHandled, 1)
  assert.ok(s.log.some((l) => l.text.startsWith("Incoming power restored")))
})

test("§12 a signal loss darkens every reactor-hall reading and the alarms on them, then they return; it counts as handled", () => {
  const rng = seededRng(6)
  // A hot, high reactor: its warnings and alarms show until the signal goes
  const hot: GameState = { ...quietGame("hard"), radioactivity: 400, reactorTemp: 850 }
  assert.ok(getAlarms(hot).highRadioactivity && getAlarms(hot).highReactorTemp)
  let s = startEvent(hot, "signal-loss", EVENT_TUNING.hard, rng)
  const loss = s.activeEvents[0]
  const [lo, hi] = EVENT_TUNING.hard.signalLossSeconds
  assert.ok(loss.duration >= lo && loss.duration <= hi, `lasts ${loss.duration} s`)
  assert.ok(s.log.at(-1)!.text.startsWith("I think we've lost the electrics to the reactor hall"))
  // A flicker, then ERR, then dark
  const phases: string[] = []
  for (let i = 0; i < SIGNAL_DARK_AFTER + 2; i++) {
    phases.push(getHallSignal(s))
    s = advanceGame({ ...s, radioactivity: 400, reactorTemp: 850 }, rng)
  }
  assert.deepEqual([...new Set(phases)], ["flicker", "error", "dark"])
  // The alarm computer can't see the reactor either: only the signal loss itself, on the event alarm
  const reactorKeys = ["highRadioactivity", "lowRadioactivity", "highReactorTemp", "lowFuelTemp", "highSteam", "lowSteam", "highXenon"]
  assert.ok(!getReactorWarnings(s).some((w) => reactorKeys.includes(w.key)), getReactorWarnings(s).map((w) => w.key).join())
  assert.ok(checkEventWarnings(s).some((w) => w.startsWith("WARNING: No incoming signal being received from reactor hall")))
  const alarms = getAlarms(s)
  assert.deepEqual([alarms.event, alarms.highRadioactivity, alarms.highReactorTemp], [true, false, false])
  // It ends: readings and warnings back, the technician says so
  s = step({ ...s, radioactivity: 100, reactorTemp: 600 }, loss.duration, rng)
  assert.equal(getHallSignal(s), "live")
  assert.ok(!checkEventWarnings(s).some((w) => w.includes("reactor hall")))
  assert.ok(s.log.some((l) => l.text.startsWith("Electrics to the reactor hall are back")))
  assert.equal(s.stats.emergenciesHandled, 1)
})

test("§12 a pump trip takes one running pump out for a while", () => {
  const rng = seededRng(7)
  let s = startEvent(quietGame("hard"), "pump-trip", EVENT_TUNING.hard, rng)
  const trip = s.activeEvents[0]
  const id = trip.data!.affectedPumps![0]
  assert.ok(s.waterPumps.find((p) => p.id === id)!.on, "a running pump trips")
  s = step(s, 5, rng)
  const pump = s.waterPumps.find((p) => p.id === id)!
  assert.ok(!pump.powered && pump.flow === 0, "PWR lamp off and no flow")
  assert.ok(checkEventWarnings(s).includes("WARNING: Ongoing water pump issue detected."), "the alarm screen says why the lamp is lit")
  assert.equal(getAlarms(s).general, false, "it shares the event alarm")
  s = step(s, trip.duration, rng)
  const back = s.waterPumps.find((p) => p.id === id)!
  assert.ok(!back.tripped && back.powered && back.flow === 1, "back in service")
  assert.ok(!checkEventWarnings(s).some((w) => w.includes("water pump")), "the warning clears with the event")
  assert.equal(s.stats.emergenciesHandled, 0, "a smaller event is not a major emergency")
})

test("§12 a grid hold request sets a new target, half a change's step away, and halves the tolerance", () => {
  assert.equal(getPowerTolerance(5000, true), 250)
  const before = quietGame("hard")
  const s = startEvent({ ...before, powerOutput: before.powerTarget! }, "grid-hold", EVENT_TUNING.hard, seededRng(1))
  const target = s.powerTarget!
  const size = Math.abs(target - before.powerTarget!)
  assert.ok(size >= EVENT_TUNING.hard.targetMinStep * EVENT_TUNING.holdStepFactor, `hold step ${size} MW`)
  assert.ok(size <= EVENT_TUNING.hard.targetMaxStep * EVENT_TUNING.holdStepFactor, `hold step ${size} MW`)
  const tolerance = getPowerTolerance(target, true)
  // The new target as any change confirms it, then what the hold means (owner, 2026-10-30)
  assert.equal(s.log.at(-2)!.text, `New power output requested to be ${formatMW(target)}.`)
  assert.ok(s.log.at(-1)!.text.startsWith("This is a hold request") && s.log.at(-1)!.text.includes(formatMW(tolerance)), s.log.at(-1)!.text)
  assert.equal(isPowerOnTarget({ ...s, powerOutput: target + tolerance + 10 }), false)
  assert.equal(isPowerOnTarget({ ...s, powerOutput: target + tolerance - 10 }), true)
  // It has no set length: only the target track lifts it
  assert.equal(isGridHoldActive(step(s, 10)), true)
})

// ---------- §13 Power targets ----------

// The target track on its own, second by second, with output held on target or at nothing (no physics, no events)
function trackTick(state: GameState, seconds: number, onTarget: boolean, rng = seededRng(1)): GameState {
  let s = state
  for (let i = 0; i < seconds; i++) {
    s = applyPendingTarget({ ...s, gameTime: s.gameTime - 1 })
    s = runShiftEvents({ ...s, powerOutput: onTarget && s.powerTarget !== null ? s.powerTarget : 0 }, rng)
  }
  return s
}
const trackOf = (s: GameState) => s.targetTrack!
const freshTrack = (mode: GameMode): GameState => ({ ...quietGame(mode), targetTrack: null })
const NOTICE = "We may soon require an adjustment in your power output."

test("§13 the first change comes early and is plain: a minute's notice with no number, then the new target", () => {
  for (const mode of ["easy", "hard"] as const) {
    const tuning = EVENT_TUNING[mode]
    const firsts = new Set<number>()
    for (let seed = 1; seed <= 20; seed++) {
      const rng = seededRng(seed)
      let s = freshTrack(mode)
      const before = s.powerTarget
      while (!s.pendingTarget && getShiftTime(s) < 200) s = trackTick(s, 1, true, rng)
      const at = getShiftTime(s)
      firsts.add(at)
      assert.ok(at >= tuning.firstNotice[0] && at <= tuning.firstNotice[1], `${mode}: first notice at ${at} s`)
      assert.equal(s.log.at(-1)!.text, NOTICE)
      assert.equal(s.powerTarget, before, "the notice gives no number")
      s = trackTick(s, EVENT_TUNING.targetNotice, true, rng)
      assert.notEqual(s.powerTarget, before)
      assert.equal(isGridHoldActive(s), false, "the first change is never a hold")
      assert.equal(s.log.at(-1)!.text, `New power output requested to be ${formatMW(s.powerTarget!)}.`)
    }
    assert.ok(firsts.size > 5, `${mode}: the first notice comes at different times`)
  }
})

test("§13 the next change waits until output has been on target for the settle time, or the grid gives up waiting", () => {
  const tuning = EVENT_TUNING.easy
  let s = freshTrack("easy")
  while (s.targetTrack?.phase !== "settling") s = trackTick(s, 1, true)
  const need = trackOf(s).need
  assert.ok(need >= tuning.settleSeconds[0] && need <= tuning.settleSeconds[1], `settle ${need} s`)

  // On target, but not without a break: no notice yet
  let broken = trackTick(s, need - 1, true)
  broken = trackTick(broken, 1, false)
  broken = trackTick(broken, need - 1, true)
  assert.equal(trackOf(broken).phase, "settling")
  // On target for the whole settle time: the notice follows
  broken = trackTick(broken, 2, true)
  assert.equal(trackOf(broken).phase, "notice")
  assert.equal(broken.log.at(-1)!.text, NOTICE)

  // Never on target: the grid moves on after the give-up time
  let off = trackTick(s, tuning.giveUpSeconds - 1, false)
  assert.equal(trackOf(off).phase, "settling")
  off = trackTick(off, 2, false)
  assert.equal(trackOf(off).phase, "notice")

  // ...a clock that stops while a power cut (or signal loss) is on
  const cut: GameState = { ...s, activeEvents: [{ id: "cut", type: "power-cut", timestamp: s.gameTime, duration: 100000 }] }
  let paused = trackTick(cut, tuning.giveUpSeconds + 60, false)
  assert.equal(trackOf(paused).phase, "settling", "no notice while the power cut is on")
  paused = trackTick({ ...paused, activeEvents: [] }, tuning.giveUpSeconds - 1, false)
  assert.equal(trackOf(paused).phase, "settling")
  paused = trackTick(paused, 2, false)
  assert.equal(trackOf(paused).phase, "notice")
})

test("§13 a hold: the usual notice, then the new target and the narrow window together; lifted once it has been held", () => {
  const tuning = EVENT_TUNING.hard
  let s = freshTrack("hard")
  while (s.targetTrack?.phase !== "settling") s = trackTick(s, 1, true)
  s = { ...s, targetTrack: { ...trackOf(s), holdsLeft: 99 } } // so the next change is a hold
  while (trackOf(s).phase !== "notice") s = trackTick(s, 1, true)
  const before = s.powerTarget!
  assert.ok(trackOf(s).hold)
  assert.equal(s.log.at(-1)!.text, NOTICE, "the same notice as any change")
  assert.equal(s.pendingTarget, null)
  assert.equal(s.powerTarget, before, "the target stays until the hold starts")

  s = trackTick(s, EVENT_TUNING.targetNotice, false)
  const target = s.powerTarget!
  const size = Math.abs(target - before)
  assert.ok(size >= tuning.targetMinStep * EVENT_TUNING.holdStepFactor && size <= tuning.targetMaxStep * EVENT_TUNING.holdStepFactor, `hold step ${size} MW`)
  assert.equal(isGridHoldActive(s), true, "the narrow window comes with the new target")
  assert.equal(s.log.at(-2)!.text, `New power output requested to be ${formatMW(target)}.`)
  assert.ok(s.log.at(-1)!.text.startsWith("This is a hold request"))
  const need = trackOf(s).need
  assert.ok(need >= tuning.holdForSeconds[0] && need <= tuning.holdForSeconds[1], `held for ${need} s`)

  // Not lifted while output is outside the narrow window; lifted once it has been inside for the hold time
  s = trackTick(s, 100, false)
  assert.equal(isGridHoldActive(s), true)
  s = trackTick(s, need - 1, true)
  assert.equal(isGridHoldActive(s), true)
  s = trackTick(s, 1, true)
  assert.equal(isGridHoldActive(s), false)
  assert.equal(s.log.at(-1)!.text, "Hold lifted. Normal tolerance restored.")
  assert.equal(trackOf(s).phase, "settling", "the settle time then runs before the next notice")
})

test("§13 nothing is announced in the last two minutes", () => {
  const last = EVENT_TUNING.easy.lastNoticeBefore
  // Due just inside the last two minutes: never announced
  const late = trackTick({ ...freshTrack("easy"), gameTime: last - 1 }, 60, true)
  assert.equal(late.pendingTarget, null)
  assert.ok(!late.log.some((l) => l.text === NOTICE))
  // Due just before them: announced
  const inTime = trackTick({ ...freshTrack("easy"), gameTime: last + 3 }, 2, true)
  assert.ok(inTime.pendingTarget)
})

test("§13 a typical shift has its holds, each at a new target half a target change's step away", () => {
  for (const mode of ["easy", "hard"] as const) {
    const tuning = EVENT_TUNING[mode]
    const counts: number[] = []
    for (const run of shifts(mode).filter((r) => r.final.hasWon)) {
      for (const c of targetChanges(run, "hold")) {
        const size = Math.abs(c.to - c.from)
        assert.ok(size >= tuning.targetMinStep * EVENT_TUNING.holdStepFactor && size <= tuning.targetMaxStep * EVENT_TUNING.holdStepFactor, `${mode}: hold step ${size} MW`)
        assert.ok(c.to >= tuning.targetRange[0] && c.to <= tuning.targetRange[1], `${mode}: hold target ${c.to}`)
      }
      const holds = run.states.filter((s, i) => i > 0 && s.activeEvents.some((e) => e.type === "grid-hold") && !run.states[i - 1].activeEvents.some((e) => e.type === "grid-hold")).length
      assert.equal(targetChanges(run, "hold").length, holds, `${mode}: every hold changes the target`)
      // Spread across the shift, they nearly always all fit in (2 on Easy, 4 on Hard; owner, 2026-11-02)
      assert.ok(holds >= tuning.holds - 1 && holds <= tuning.holds, `${mode}: ${holds} holds`)
      counts.push(holds)
    }
    assert.ok(mean(counts) >= tuning.holds - 0.3, `${mode}: ${mean(counts).toFixed(2)} holds a shift`)
  }
})

test("§13 tolerance is ±10% of the target, never tighter than ±200 MW, in every mode", () => {
  assert.equal(getPowerTolerance(5000), 500)
  assert.equal(getPowerTolerance(10000), 1000)
  assert.equal(getPowerTolerance(1000), 200)
  assert.equal(isPowerOnTarget({ powerOutput: 5490, powerTarget: 5000, activeEvents: [] }), true)
  assert.equal(isPowerOnTarget({ powerOutput: 5510, powerTarget: 5000, activeEvents: [] }), false)
})

test("§13 target changes are warned 60 s ahead, within range, never right after the last; Hard's are bigger", () => {
  const sizes: Record<string, number[]> = { easy: [], hard: [] }
  for (const mode of ["easy", "hard"] as const) {
    const tuning = EVENT_TUNING[mode]
    for (const run of shifts(mode)) {
      const changes = targetChanges(run)
      // A shift that ends early (the bot fired) has fewer changes
      changes.forEach((c, i) => {
        assert.equal(c.effective - c.announced, EVENT_TUNING.targetNotice, `${mode}: notice ${c.effective - c.announced}s`)
        const size = Math.abs(c.to - c.from)
        assert.ok(size <= tuning.targetMaxStep && size >= tuning.targetMinStep, `${mode}: change of ${size} MW`)
        assert.ok(c.to >= tuning.targetRange[0] && c.to <= tuning.targetRange[1], `${mode}: target ${c.to}`)
        sizes[mode].push(size)
        if (i > 0) {
          const gap = c.effective - changes[i - 1].effective
          assert.ok(gap >= EVENT_TUNING.targetNotice + tuning.settleSeconds[0], `${mode}: changes ${gap}s apart`)
        }
      })
    }
  }
  assert.ok(mean(sizes.hard) > mean(sizes.easy), `sizes: easy ${mean(sizes.easy)}, hard ${mean(sizes.hard)}`)
})

test("§13 a competent player meets the targets on Easy and Hard, and Hard is harder", () => {
  // Survival over 40 seeds (ten can hold several losses by chance). With the events and target changes of 2026-11-02
  // the bot survives about 99% of Easy shifts and about 70% of Hard ones (200 seeds each; the owner accepted ~74% in
  // the trial), so at most 2 of 40 may be lost on Easy and 14 of 40 on Hard.
  const lost = (mode: GameMode) =>
    Array.from({ length: 40 }, (_, i) => i + 1)
      .map((seed) => (seed <= SEEDS.length ? shifts(mode)[seed - 1] : playGame(createNewGame(mode), makeBot(), seed)))
      .filter((run) => !run.final.hasWon)
  for (const [mode, most] of [["easy", 2], ["hard", 14]] as const) {
    const l = lost(mode)
    assert.ok(l.length <= most, `${mode}: the bot lost ${l.length} of 40 (${l.map((run) => run.final.gameOverCause)})`)
  }
  const onTarget = (mode: GameMode) =>
    shifts(mode).map((run) => {
      const timed = run.states.filter((s) => s.powerTarget !== null)
      return timed.filter((s) => isPowerOnTarget(s)).length / timed.length
    })
  const easy = mean(onTarget("easy"))
  const hard = mean(onTarget("hard"))
  // 73% over 40 seeds before every hold moved the target and the shift opened with a change (owner, 2026-10-29); 71% after.
  // With a change every 3 minutes or so on Easy (2026-11-02) there is more to chase: 70% over 200 seeds, 67% over these ten.
  assert.ok(easy >= 0.65, `easy on target ${(100 * easy).toFixed(0)}%`)
  assert.ok(hard >= 0.45 && hard < easy, `hard on target ${(100 * hard).toFixed(0)}% (easy ${(100 * easy).toFixed(0)}%)`)
  // Nearly every target that stays in force for two minutes is reached.
  for (const mode of ["easy", "hard"] as const) {
    let held = 0
    let met = 0
    for (const run of shifts(mode)) {
      const changes = targetChanges(run, "all")
      changes.forEach((c, i) => {
        const end = (changes[i + 1]?.effective ?? run.states.length) - 1
        if (end - c.effective < 120) return
        held++
        if (run.states.slice(c.effective - 1, end).some((s) => isPowerOnTarget(s))) met++
      })
    }
    assert.ok(met >= held * 0.9, `${mode}: ${met} of ${held} targets reached`)
  }
})

test("§13 a low target visibly risks xenon build-up", () => {
  const start: GameState = { ...quietGame("hard"), powerTarget: 500 }
  const run = playGame(start, makeBot(), 1, seededRng(1), 300)
  assert.ok(run.final.xenon > 20, `xenon ${run.final.xenon.toFixed(0)}% after 5 min at 500 MW`)
})

// ---------- §14 Safety Test ----------

const safety = (opts = {}) => playGame(createNewGame("safety_test"), makeBot(opts), 1)
const stepAt = (action: string) => SAFETY_TEST_SCRIPT.find((step) => step.action === action)!.at
const PUMPS_ON = stepAt("pumps-on")
const TURBINE_SWITCH = stepAt("turbine-to-pumps")
const STAND_BY = SAFETY_TEST_SCRIPT.find((step) => step.target === null)!.at
const MAINS_OFF = stepAt("mains-off")
const MAINS_ON = stepAt("mains-on")
const RAISE = SAFETY_TEST_SCRIPT.findLast((step) => step.target != null && step.at < PUMPS_ON)!.at

test("§14 every phase is triggered in order; each automated change happens once, as it is announced", () => {
  const run = safety()
  // A conditional step runs only if its condition held when it was due (the script runs after that second's physics).
  // A waiting step or a follow-up may run at any point in the test, or never. Silent steps log nothing.
  const waits = (step: (typeof SAFETY_TEST_SCRIPT)[number]) => step.waitsUntil !== undefined || step.after !== undefined
  const due = SAFETY_TEST_SCRIPT.filter(
    (step) => step.text !== undefined && (!step.onlyIf || waits(step) || step.onlyIf(run.states[step.at - 1])),
  )
  const scripted = run.final.log
    .map((l) => ({ time: l.time, index: SAFETY_TEST_SCRIPT.findIndex((step) => step.text === l.text) }))
    .filter((l) => l.index >= 0)
  const logged = scripted.map((l) => l.index)
  assert.deepEqual(logged, [...logged].sort((a, b) => a - b), "logged in script order")
  assert.equal(new Set(logged).size, logged.length, "no script step logged twice")
  due.forEach((step) => {
    const entry = scripted.find((l) => SAFETY_TEST_SCRIPT[l.index] === step)
    if (waits(step)) {
      assert.ok(!entry || (entry.time >= step.at && entry.time <= (step.waitsUntil ?? MAINS_ON)), `waiting step logged at ${entry?.time}s`)
    } else {
      assert.ok(entry && Math.abs(entry.time - step.at) <= 1, `step at ${step.at}s logged at ${entry?.time}s`)
    }
  })
  assert.equal(scripted.filter((l) => !waits(SAFETY_TEST_SCRIPT[l.index])).length, due.filter((step) => !waits(step)).length)
  const at = (t: number) => run.states[t - 1]
  assert.ok(at(PUMPS_ON).waterPumps.every((p) => p.on), "pumps switched on with the announcement")
  assert.equal(at(TURBINE_SWITCH).turbineMode, "pumps")
  assert.equal(at(MAINS_OFF).mainsPower, false)
  assert.equal(at(MAINS_ON).mainsPower, true)
  // The turbine supplies the pumps as soon as it is switched (owner, 2026-10-27), so the switch comes with the test:
  // every pump keeps station power until then, and the crew put the turbine back on the grid when it is over
  assert.equal(TURBINE_SWITCH, MAINS_OFF, "switched in the same second as the test begins")
  assert.ok(at(TURBINE_SWITCH - 1).waterPumps.every((p) => p.powered), "all four pumps powered up to the test")
  assert.equal(at(MAINS_ON).turbineMode, "grid")
  assert.ok(at(MAINS_ON + 5).waterPumps.every((p) => p.powered), "station power runs every pump after the test")
  assert.ok(Math.min(...SAFETY_TEST_SCRIPT.map((step) => step.target ?? Infinity)) >= 700, "no target below 700 MW")
  // The test itself lasts 120 s (owner, 2026-10-21; was 75 s), starting at the same time, so the survival time
  // after it is shorter
  assert.equal(MAINS_ON - MAINS_OFF, 120, "the test lasts 120 s")
  assert.ok(run.final.timeLimit! - MAINS_ON >= 110, "nearly 2 minutes from test complete to the end")
  assert.ok(!run.final.log.some((l) => l.text === AZ5_ORDER), "handled well, no AZ-5 order")
  assert.equal(run.final.eventHistory.length, 0, "no random events")
})

test("§14 the player can reverse an automated change and the script never undoes it", () => {
  const rng = seededRng(2)
  const bot = makeBot()
  let s = createNewGame("safety_test")
  for (let t = 0; t < PUMPS_ON + 5; t++) s = advanceGame(bot.act(s), rng)
  s = { ...s, waterPumps: s.waterPumps.map((p, i) => ({ ...p, on: i < 2 })) }
  for (let t = 0; t < 30; t++) s = advanceGame(s, rng)
  assert.equal(s.waterPumps.filter((p) => p.on).length, 2)
  s = { ...s, turbineMode: "grid", turbineConnected: true }
  for (let t = 0; t < 20 && !s.isGameOver; t++) s = advanceGame(s, rng)
  assert.equal(s.turbineMode, "grid")
  assert.equal(s.waterPumps.filter((p) => p.on).length, 2)
})

test("§14 no grid target from test step 2: the display shows N/A and performance is frozen", () => {
  const run = safety()
  const after = run.states.slice(STAND_BY)
  assert.ok(after.every((s) => s.powerTarget === null))
  assert.ok(after.every((s) => s.performance === after[0].performance))
})

test("§14 on two pumps, the xenon from phases 2–3 takes the rod margin below its minimum while holding the test output", () => {
  const run = safety()
  const phase4 = run.states.slice(RAISE, PUMPS_ON)
  const lowest = Math.min(...phase4.map((s) => getRodMargin(s.controlRods)))
  assert.ok(lowest < 200, `lowest rod margin in phase 4: ${lowest}`)
  assert.ok(run.states[PUMPS_ON - 1].xenon > 80, `xenon ${run.states[719].xenon.toFixed(0)}% when the test begins`)
})

test("§14 surviving to the end is possible with skilful play; ignoring the test ends in disaster", () => {
  assert.ok(safety().final.hasWon, "rods inserted as the test begins")
  assert.ok(safety({ testResponse: "az5" }).final.hasWon, "AZ-5 as the test begins (no rod parked at 0%)")
  assert.ok(safety({ testResponse: "none" }).final.isGameOver, "doing nothing")
})

test("§14 a reactor collapsed when the test begins: the rods are ordered out, and only AZ-5 saves it", () => {
  // Player error: rods driven in at 700 s and left there, so radioactivity falls to 0 and xenon fills the core.
  const collapsed = (respond: (s: GameState) => GameState) => {
    const rng = seededRng(1)
    const bot = makeBot()
    let s = createNewGame("safety_test")
    for (let t = 0; t < 700; t++) s = advanceGame(bot.act(s), rng)
    s = { ...s, controlRods: s.controlRods.map((r) => ({ ...r, target: 40 })) }
    while (getShiftTime(s) < MAINS_OFF) s = advanceGame(s, rng)
    assert.ok(s.radioactivity < RODS_OUT_BELOW && s.xenon > 99, `R ${s.radioactivity.toFixed(1)}, xenon ${s.xenon.toFixed(0)}%`)
    while (getShiftTime(s) < MAINS_OFF + DEPUTY_REACTS_SECONDS + CREW_ACTS_SECONDS) s = advanceGame(s, rng)
    assert.ok(s.controlRods.every((r) => r.target < r.insertion), "every rod ordered out with the announcement")
    while (!s.isGameOver && !s.hasWon) s = advanceGame(respond(s), rng)
    return s
  }
  assert.equal(collapsed((s) => s).gameOverCause, "explosion", "doing nothing")
  const az5Late = (s: GameState) => (s.radioactivity > 400 && !s.controlRods.every((r) => r.target === 100) ? az5(s) : s)
  assert.ok(collapsed(az5Late).hasWon, "AZ-5 once radioactivity runs away")
  // The AZ-5 order still comes after the forced withdrawal, and obeying it within a few seconds completes the test
  const obey = (s: GameState) => {
    const order = s.log.find((l) => l.text === AZ5_ORDER)
    return order && getShiftTime(s) >= order.time + 5 && !s.controlRods.every((r) => r.target === 100) ? az5(s) : s
  }
  const obeyed = collapsed(obey)
  assert.ok(obeyed.hasWon && obeyed.log.some((l) => l.text.startsWith("Test complete")), "AZ-5 5 s after the order")
})

test("§14 radioactivity below 50 at any point in the test: the deputy orders rods out, once, unless it already ran away", () => {
  const deputyOrders = (run: GameRun) => run.final.log.filter((l) => l.text === DEPUTY_WITHDRAWAL)
  // The orders take a moment (owner, 2026-10-22): the deputy speaks a few seconds after the dip, and the rods start
  // moving a few seconds after him
  const timeline = (run: GameRun) => {
    const said = run.final.log.filter((l) => l.text === DEPUTY_ORDER)
    const withdrawn = deputyOrders(run)
    assert.ok(said.length === 1 && withdrawn.length === 1, "the deputy speaks once, and the rods are withdrawn once")
    assert.equal(withdrawn[0].time - said[0].time, CREW_ACTS_SECONDS, "the crew acts a few seconds after his order")
    const noticed = said[0].time - DEPUTY_REACTS_SECONDS
    assert.ok(run.states[noticed - 1].radioactivity < RODS_OUT_BELOW, "he speaks a few seconds after radioactivity dips below 50")
    const before = run.states[withdrawn[0].time - 2].controlRods
    const after = run.states[withdrawn[0].time - 1].controlRods
    assert.ok(after.some((r, i) => r.target < before[i].target), "the rods are ordered out only then")
    return { noticed, withdrawnAt: withdrawn[0].time }
  }
  // Four pumps: the test begins above 50, and steering radioactivity down mid-test brings the deputy in
  const steered = safety({ pumps: 4 })
  const { noticed } = timeline(steered)
  assert.ok(noticed > MAINS_OFF && steered.states[MAINS_OFF - 1].radioactivity >= RODS_OUT_BELOW, `noticed mid-test (at ${noticed})`)
  assert.ok(steered.final.hasWon, "AZ-5 after the withdrawal saves the reactor")
  // AZ-5 as the test begins, with no danger showing, is no way out: he pulls those rods out, and AZ-5 again saves it
  const precaution = safety({ pumps: 4, testResponse: "az5" })
  assert.equal(deputyOrders(precaution).length, 1, "precautionary AZ-5 overruled")
  assert.ok(precaution.final.hasWon, "AZ-5 again after the withdrawal")
  // Once it has run away he stands down for good: the AZ-5 the crew ordered is never overruled
  const ranAway = safety({ pumps: 4, testResponse: "late-az5" })
  assert.ok(ranAway.final.log.some((l) => l.text === AZ5_ORDER), "the AZ-5 order came")
  assert.ok(ranAway.states.slice(MAINS_OFF, MAINS_ON).some((s) => s.radioactivity < RODS_OUT_BELOW), "below 50 after AZ-5")
  assert.equal(deputyOrders(ranAway).length, 0)
  assert.ok(ranAway.final.hasWon)
  // Two pumps: below 50 as the test begins, so he notices at once, and doing nothing then is a disaster
  const ignored = safety({ testResponse: "none" })
  assert.equal(timeline(ignored).withdrawnAt, MAINS_OFF + DEPUTY_REACTS_SECONDS + CREW_ACTS_SECONDS)
  assert.equal(ignored.final.gameOverCause, "explosion")
})

test("§14 the deputy's withdrawal leaves time to see the surge: warning 6 s or more after his order; AZ-5 then saves it", () => {
  // Sized to the reactor (owner, 2026-10-22): pulling every rod to 0% from ~35% in made radioactivity jump from 50 to
  // ~2,000 in about 2 s, and after a late AZ-5 it exploded even with AZ-5 pressed again 3 s after the warning.
  const rodsIn = (by: number) => (s: GameState) => ({ ...s, controlRods: s.controlRods.map((r) => ({ ...r, target: r.target + by })) })
  const cases: [string, number, number | null, (s: GameState) => GameState][] = [
    ["2 pumps, xenon-poisoned", 2, null, (s) => s],
    ["4 pumps, steered down", 4, MAINS_OFF, rodsIn(4)],
    ["4 pumps, AZ-5 late in the test", 4, MAINS_OFF + 40, az5],
  ]
  for (const [name, pumps, at, before] of cases) {
    const play = (az5After: number | null) => {
      const rng = seededRng(1)
      const bot = makeBot({ pumps, testResponse: "none" })
      let s = createNewGame("safety_test")
      let order: number | null = null
      let warning: number | null = null
      while (!s.isGameOver && !s.hasWon) {
        const t = getShiftTime(s)
        s = bot.act(s)
        if (t === at) s = before(s)
        if (az5After !== null && warning !== null && t === warning + az5After) s = az5(s)
        s = advanceGame(s, rng)
        order ??= s.log.find((l) => l.text === DEPUTY_WITHDRAWAL)?.time ?? null
        if (order !== null && warning === null && s.radioactivity >= THRESHOLDS.radioactivity.highWarning) warning = getShiftTime(s)
      }
      return { order, warning, final: s }
    }
    const ignored = play(null)
    assert.ok(ignored.order !== null && ignored.warning !== null, `${name}: the deputy stepped in and it ran away`)
    assert.ok(ignored.warning! - ignored.order! >= 6, `${name}: warning only ${ignored.warning! - ignored.order!} s after the order`)
    assert.equal(ignored.final.gameOverCause, "explosion", `${name}: ignored`)
    assert.ok(getShiftTime(ignored.final) < MAINS_ON, `${name}: lost within the test`)
    assert.ok(play(3).final.hasWon, `${name}: AZ-5 3 s after the warning saves it`)
  }
})

test("§11/§14 a Safety Test runaway with the pumps unpowered ends in an explosion", () => {
  // Player error: the turbine goes back on the grid as the test begins, so nothing powers the pumps.
  const rng = seededRng(1)
  const bot = makeBot({ testResponse: "none" })
  let s = createNewGame("safety_test")
  for (let t = 0; t < MAINS_OFF + 2; t++) s = advanceGame(bot.act(s), rng)
  s = { ...s, turbineMode: "grid", turbineConnected: true }
  while (!s.isGameOver && !s.hasWon) s = advanceGame(s, rng)
  assert.equal(s.gameOverCause, "explosion")
})

// A test the player ignores, until they press AZ-5 `delay` seconds after the AZ-5 order (null: never)
function orderedTest(opts: Parameters<typeof makeBot>[0], delay: number | null) {
  const rng = seededRng(1)
  const bot = makeBot(opts)
  let s = createNewGame("safety_test")
  let orderedAt: number | null = null
  while (!s.isGameOver && !s.hasWon) {
    orderedAt ??= s.log.find((l) => l.text === AZ5_ORDER)?.time ?? null
    const obey = delay !== null && orderedAt !== null && getShiftTime(s) >= orderedAt + delay
    s = advanceGame(bot.act(obey && !s.controlRods.every((r) => r.target === 100) ? az5(s) : s), rng)
  }
  return { final: s, orderedAt }
}

test("§14 a runaway during the test brings one AZ-5 order, with time to act; AZ-5 then completes the test", () => {
  for (const pumps of [2, 4]) {
    const { orderedAt, final } = orderedTest({ pumps, testResponse: "none" }, null)
    assert.ok(orderedAt !== null && orderedAt > MAINS_OFF && orderedAt < MAINS_ON, `${pumps} pumps: ordered at ${orderedAt}`)
    const order = final.log.filter((l) => l.text === AZ5_ORDER)
    assert.equal(order.length, 1, "ordered once")
    assert.equal(order[0].from, "SENIOR REACTOR CONTROL ENGINEER")
    assert.equal(final.gameOverCause, "explosion", `${pumps} pumps: ignoring the order`)
    assert.ok(getShiftTime(final) - orderedAt >= 10, `${pumps} pumps: only ${getShiftTime(final) - orderedAt} s to act`)
    const obeyed = orderedTest({ pumps, testResponse: "none" }, 5).final
    assert.ok(obeyed.hasWon, `${pumps} pumps: AZ-5 5 s after the order saves the reactor`)
    assert.ok(obeyed.log.some((l) => l.text.startsWith("Test complete")), "and the test still completes")
  }
})
