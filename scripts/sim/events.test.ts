// Bible acceptance checks for shift events, power targets and the Safety Test (ai/high-level-plan.md
// §12–§14), run through the real game loop (lib/game-loop). Run: node --run sim:test
import { test } from "node:test"
import assert from "node:assert/strict"
import { type GameMode, type GameState, GAME_MODE_CONFIGS, MAJOR_EVENT_KINDS, THRESHOLDS, getPowerTolerance, getShiftTime } from "../../lib/types"
import { EVENT_TUNING } from "../../lib/sim/tuning"
import { seededRng } from "../../lib/sim/rng"
import { getRodMargin } from "../../lib/sim/reactor"
import { advanceGame, createNewGame } from "../../lib/game-loop"
import { isPowerOnTarget } from "../../lib/game-mechanics"
import { AZ5_LAMP_SECONDS, checkEventWarnings, getAlarms, getWarningFlags, isAz5LampLit } from "../../lib/game-utils"
import { applyPendingTarget, checkTurbineTrip, planShiftEvents, runShiftEvents, startEvent } from "../../lib/game-events"
import { RODS_OUT_BELOW, SAFETY_TEST_SCRIPT, TEST_SCRAPPED } from "../../lib/safety-test"
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
  return { ...s, controlRods: rods, eventPlan: [], nextTargetChangeAt: null }
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

// Target changes seen in a run: when announced, when in force, from and to.
function targetChanges(run: GameRun) {
  const changes: { announced: number; effective: number; from: number; to: number }[] = []
  let announced = -1
  run.states.forEach((s, i) => {
    const prev = run.states[i - 1]
    if (s.pendingTarget && !prev?.pendingTarget) announced = i + 1
    if (prev && s.powerTarget !== prev.powerTarget && s.powerTarget !== null && prev.powerTarget !== null) {
      changes.push({ announced, effective: i + 1, from: prev.powerTarget, to: s.powerTarget })
    }
  })
  return changes
}

// ---------- §12 Random emergency events ----------

test("§12 the shift's plan: always the same number of things, one major emergency on Easy, one of each on Hard, sensibly spaced", () => {
  for (const mode of ["easy", "hard"] as const) {
    const tuning = EVENT_TUNING[mode]
    const length = GAME_MODE_CONFIGS[mode].timeLimit!
    const minorCounts = new Set<number>()
    const firstKinds = new Set<string>()
    for (let seed = 1; seed <= 2000; seed++) {
      const plan = planShiftEvents(tuning, length, seededRng(seed))
      const why = `${mode} seed ${seed}: ${plan.map((e) => `${e.kind}@${e.at}`).join(" ")}`
      assert.equal(plan.length, tuning.totalEvents, why)
      const m = plan.filter((e) => isMajor(e.kind))
      // At most one of each kind (owner, 2026-10-16): Easy draws one, Hard both
      assert.equal(m.length, tuning.majors, why)
      assert.equal(new Set(m.map((e) => e.kind)).size, m.length, why)
      firstKinds.add(m[0].kind)
      const minors = plan.filter((e) => e.kind === "pump-trip" || e.kind === "grid-hold").length
      assert.ok(minors >= tuning.minorCounts[0] && minors <= tuning.minorCounts[1], why)
      minorCounts.add(minors)
      for (const e of m) assert.ok(e.at >= tuning.firstMajorAfter, why)
      for (let i = 1; i < m.length; i++) assert.ok(m[i].at - m[i - 1].at >= tuning.majorSpacing, why)
      for (const e of plan) assert.ok(e.at >= tuning.firstAfter && e.at <= length - tuning.lastStartBefore, why)
      for (let i = 1; i < plan.length; i++) {
        const [a, b] = [plan[i - 1], plan[i]]
        assert.ok(b.at - a.at >= tuning.minGap, `${why}: ${b.at - a.at}s apart`)
        // One event at a time, and a major emergency's warning comes after the thing before it is over
        if (a.kind !== "target-change" && b.kind !== "target-change") assert.ok(b.at >= a.at + a.duration!, why)
        if (isMajor(b.kind)) assert.ok(b.at - EVENT_TUNING.warningLead[b.kind]! >= a.at + a.duration!, why)
        if (a.kind === "target-change" && b.kind === "grid-hold") assert.ok(b.at - a.at >= a.duration! + EVENT_TUNING.holdAfterTargetChange, why)
      }
    }
    assert.equal(firstKinds.size, 2, `${mode}: either kind can come first`)
    assert.equal(minorCounts.size, 2, `${mode}: both numbers of smaller events occur`)
  }
})

test("§12 a typical shift shows every planned thing, each major warned of in advance", () => {
  for (const mode of ["easy", "hard"] as const) {
    for (const run of shifts(mode).filter((r) => r.final.hasWon)) {
      // Nothing is dropped: every planned event happens, and every planned target change is announced and in force
      const tuning = EVENT_TUNING[mode]
      const changes = targetChanges(run).length
      assert.equal(run.final.eventHistory.length + changes, tuning.totalEvents, `${mode}: ${run.final.eventHistory.length} events, ${changes} changes`)
      const fired = run.final.eventHistory.filter((e) => isMajor(e.type))
      assert.equal(fired.length, tuning.majors, `${mode}: ${fired.length} majors`)
      for (const event of fired) {
        const startedAt = (run.final.timeLimit ?? 0) - event.timestamp
        const warning = run.final.log.find((l) =>
          event.type === "power-cut" ? l.text.startsWith("Reports of power cable damage") : l.text.startsWith("Detected pressure fluctuations"),
        )
        assert.ok(warning && startedAt - warning.time >= EVENT_TUNING.warningLead[event.type]!, `${mode}: ${event.type} at ${startedAt}s warned at ${warning?.time}s`)
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
  // Power cuts and pump trips sound the event alarm while they last; grid holds and target changes don't
  const rng = seededRng(1)
  for (const kind of ["power-cut", "pump-trip", "grid-hold"] as const) {
    let s = startEvent(calm, kind, EVENT_TUNING.easy, rng)
    assert.equal(getAlarms(s).event, kind !== "grid-hold", kind)
    s = step(s, s.activeEvents[0].duration + 1, rng)
    assert.equal(getAlarms(s).event, false, `${kind} over`)
  }
  // A rod jam never ends, so it sounds the general alarm through its warning instead (owner, 2026-10-16)
  const jam = step(startEvent(calm, "rod-stuck", EVENT_TUNING.easy, rng), 1, rng)
  assert.equal(getAlarms(jam).event, false, "rod jam: no event alarm")
  assert.equal(getAlarms(jam).general, true, "rod jam: general alarm")
  assert.equal(getAlarms(step(jam, 300, rng)).general, true, "rod jam: still sounding later")
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

test("§12 a rod jam is permanent: rods stop where they are, even mid-travel, and never free again", () => {
  const rng = seededRng(3)
  let s = quietGame("easy")
  s = { ...s, controlRods: s.controlRods.map((r) => ({ ...r, target: 100 })) }
  s = step(s, 2, rng)
  const logged = s.log.length
  s = startEvent(s, "rod-stuck", EVENT_TUNING.easy, rng)
  assert.equal(s.log.length, logged + 1, "the head engineer reports the jam")
  const jammed = s.activeEvents[0].data!.affectedRods!
  const stoppedAt = jammed.map((i) => s.controlRods[i].insertion)
  assert.ok(stoppedAt.every((p) => p > 0 && p < 100), `stopped mid-travel at ${stoppedAt}`)
  s = step(s, 1, rng)
  assert.equal(s.activeEvents.length, 0, "the event itself is over at once")
  assert.equal(s.stats.emergenciesHandled, 1)
  s = step(s, 300, rng)
  jammed.forEach((i, k) => {
    assert.ok(s.controlRods[i].stuck, "still jammed")
    assert.equal(s.controlRods[i].insertion, stoppedAt[k], "still where it stopped")
  })
  assert.ok(s.controlRods.filter((_, i) => !jammed.includes(i)).every((r) => r.insertion === 100))
  assert.equal(s.log.length, logged + 1, "no all-clear message")
  const warning = checkEventWarnings(s).find((w) => w.startsWith("WARNING: Issue detected with control rods"))
  assert.ok(warning && jammed.every((i) => warning.includes(String(i + 1))), `warning names the rods: ${warning}`)
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
  assert.ok(s.log.some((l) => l.text.startsWith("Station power restored")))
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

test("§12 a grid hold request halves the tolerance and the grid announces nothing new meanwhile", () => {
  assert.equal(getPowerTolerance(5000, true), 250)
  let s = startEvent({ ...quietGame("hard"), powerOutput: 5300 }, "grid-hold", EVENT_TUNING.hard, seededRng(1))
  assert.equal(isPowerOnTarget(s), false)
  assert.equal(isPowerOnTarget({ ...s, powerOutput: 5200 }), true)
  s = runShiftEvents({ ...s, eventPlan: [{ at: 0, kind: "target-change", warned: false }] }, seededRng(1))
  assert.equal(s.pendingTarget, null)
})

// ---------- §13 Power targets ----------

test("§13 tolerance is ±10% of the target, never tighter than ±200 MW, in every mode", () => {
  assert.equal(getPowerTolerance(5000), 500)
  assert.equal(getPowerTolerance(10000), 1000)
  assert.equal(getPowerTolerance(1000), 200)
  assert.equal(isPowerOnTarget({ powerOutput: 5490, powerTarget: 5000, activeEvents: [] }), true)
  assert.equal(isPowerOnTarget({ powerOutput: 5510, powerTarget: 5000, activeEvents: [] }), false)
})

test("§13 target changes are warned 60 s ahead, smaller than before, within range; Hard's are bigger", () => {
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
          assert.ok(gap >= EVENT_TUNING.targetNotice + EVENT_TUNING.eventGap, `${mode}: changes ${gap}s apart`)
        }
      })
    }
  }
  assert.ok(mean(sizes.hard) > mean(sizes.easy), `sizes: easy ${mean(sizes.easy)}, hard ${mean(sizes.hard)}`)
})

test("§13 a competent player meets the targets on Easy and Hard, and Hard is harder", () => {
  // The bot survives every Easy shift. On Hard it is fired in about 15% of shifts (6 of 40 seeds, both before and
  // after rod jams became permanent, 2026-10-16), so it must survive at least 8 of the 10.
  assert.ok(shifts("easy").every((run) => run.final.hasWon), "easy: the bot did not survive")
  const lost = shifts("hard").filter((run) => !run.final.hasWon)
  assert.ok(lost.length <= 2, `hard: the bot lost ${lost.length} of ${SEEDS.length} (${lost.map((run) => run.final.gameOverCause)})`)
  const onTarget = (mode: GameMode) =>
    shifts(mode).map((run) => {
      const timed = run.states.filter((s) => s.powerTarget !== null)
      return timed.filter((s) => isPowerOnTarget(s)).length / timed.length
    })
  const easy = mean(onTarget("easy"))
  const hard = mean(onTarget("hard"))
  assert.ok(easy >= 0.75, `easy on target ${(100 * easy).toFixed(0)}%`)
  assert.ok(hard >= 0.5 && hard < easy, `hard on target ${(100 * hard).toFixed(0)}% (easy ${(100 * easy).toFixed(0)}%)`)
  // Nearly every target that stays in force for two minutes is reached.
  for (const mode of ["easy", "hard"] as const) {
    let held = 0
    let met = 0
    for (const run of shifts(mode)) {
      const changes = targetChanges(run)
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
const MAINS_OFF = stepAt("mains-off")
const MAINS_ON = stepAt("mains-on")
const RAISE = SAFETY_TEST_SCRIPT.findLast((step) => step.target != null && step.at < PUMPS_ON)!.at

test("§14 every phase is triggered in order; each automated change happens once, as it is announced", () => {
  const run = safety()
  // A conditional step runs only if its condition held when it was due (the script runs after that second's physics).
  const due = SAFETY_TEST_SCRIPT.filter((step) => !step.onlyIf || step.onlyIf(run.states[step.at - 1]))
  const scripted = run.final.log.filter((l) => SAFETY_TEST_SCRIPT.some((step) => step.text === l.text))
  assert.equal(scripted.length, due.length, "every due script step logged exactly once")
  due.forEach((step, i) => assert.ok(Math.abs(scripted[i].time - step.at) <= 1, `step at ${step.at}s logged at ${scripted[i].time}s`))
  const at = (t: number) => run.states[t - 1]
  assert.ok(at(PUMPS_ON).waterPumps.every((p) => p.on), "pumps switched on with the announcement")
  assert.equal(at(TURBINE_SWITCH).turbineMode, "pumps")
  assert.equal(at(MAINS_OFF).mainsPower, false)
  assert.equal(at(MAINS_ON).mainsPower, true)
  assert.ok(Math.min(...SAFETY_TEST_SCRIPT.map((step) => step.target ?? Infinity)) >= 700, "no target below 700 MW")
  // The test itself lasts 75 s (owner, 2026-10-20), leaving a few minutes of survival after it
  assert.equal(MAINS_ON - MAINS_OFF, 75, "the test lasts 75 s")
  assert.ok(run.final.timeLimit! - MAINS_ON >= 120, "at least 2 minutes from test complete to the end")
  assert.equal(run.final.testScrapped, false, "handled well, the test is not scrapped")
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

test("§14 no grid target from the turbine switch: the display shows N/A and performance is frozen", () => {
  const run = safety()
  const after = run.states.slice(TURBINE_SWITCH)
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

test("§14 a reactor collapsed when the test begins: every rod is ordered out, and only AZ-5 saves it", () => {
  // Player error: rods driven in at 700 s and left there, so radioactivity falls to 0 and xenon fills the core.
  const collapsed = (respond: (s: GameState) => GameState) => {
    const rng = seededRng(1)
    const bot = makeBot()
    let s = createNewGame("safety_test")
    for (let t = 0; t < 700; t++) s = advanceGame(bot.act(s), rng)
    s = { ...s, controlRods: s.controlRods.map((r) => ({ ...r, target: 40 })) }
    while (getShiftTime(s) < MAINS_OFF) s = advanceGame(s, rng)
    assert.ok(s.radioactivity < RODS_OUT_BELOW && s.xenon > 99, `R ${s.radioactivity.toFixed(1)}, xenon ${s.xenon.toFixed(0)}%`)
    assert.ok(s.controlRods.every((r) => r.target === 0), "every rod ordered out with the announcement")
    while (!s.isGameOver && !s.hasWon) s = advanceGame(respond(s), rng)
    return s
  }
  assert.ok(collapsed((s) => s).isGameOver, "doing nothing")
  const az5Late = (s: GameState) => (s.radioactivity > 400 && !s.controlRods.every((r) => r.target === 100) ? az5(s) : s)
  assert.ok(collapsed(az5Late).hasWon, "AZ-5 once radioactivity runs away")
})

test("§14 a Safety Test runaway with the pumps unpowered ends in disaster, even once the test is scrapped", () => {
  // Player error: the turbine goes back on the grid as the test begins, so nothing powers the pumps. (The
  // explosion from a runaway with no flow is §11's check, in acceptance.test.ts.)
  const rng = seededRng(1)
  const bot = makeBot({ testResponse: "none" })
  let s = createNewGame("safety_test")
  for (let t = 0; t < MAINS_OFF + 2; t++) s = advanceGame(bot.act(s), rng)
  s = { ...s, turbineMode: "grid", turbineConnected: true }
  while (!s.isGameOver && !s.hasWon) s = advanceGame(s, rng)
  assert.ok(s.isGameOver)
})

// A runaway during the test, then a player who does as the scrap message says, `delay` seconds after it appears
function scrappedTest(opts: Parameters<typeof makeBot>[0], delay: number | null) {
  const rng = seededRng(1)
  const bot = makeBot(opts)
  let s = createNewGame("safety_test")
  let scrappedAt: number | null = null
  while (!s.isGameOver && !s.hasWon) {
    if (s.testScrapped) scrappedAt ??= getShiftTime(s)
    const obey = delay !== null && scrappedAt !== null && getShiftTime(s) >= scrappedAt + delay
    s = obey && !s.controlRods.every((r) => r.target === 100) ? { ...az5(s), waterPumps: s.waterPumps.map((p) => ({ ...p, on: true })) } : s
    s = advanceGame(bot.act(s), rng)
  }
  return { final: s, scrappedAt }
}

test("§14 a runaway during the test scraps it: one order to AZ-5 in place of 'Test complete', with time to act", () => {
  for (const pumps of [2, 4]) {
    const ignored = scrappedTest({ pumps, testResponse: "none" }, null)
    const { scrappedAt, final } = ignored
    assert.ok(scrappedAt !== null && scrappedAt > MAINS_OFF && scrappedAt < MAINS_ON, `${pumps} pumps: scrapped at ${scrappedAt}`)
    const lines = final.log.map((l) => l.text)
    assert.equal(lines.filter((text) => text === TEST_SCRAPPED.text).length, 1, "scrapped once")
    assert.ok(!lines.some((text) => text.startsWith("Test complete")), "never 'Test complete'")
    assert.ok(final.isGameOver, `${pumps} pumps: ignoring the order still ends in disaster`)
    assert.ok(getShiftTime(final) - scrappedAt >= 10, `${pumps} pumps: only ${getShiftTime(final) - scrappedAt} s to act`)
    const obeyed = scrappedTest({ pumps, testResponse: "none" }, 5)
    assert.ok(obeyed.final.hasWon, `${pumps} pumps: AZ-5 and all pumps 5 s after the order saves the reactor`)
    assert.ok(obeyed.final.mainsPower, "the station's supply comes back with the order")
  }
})
