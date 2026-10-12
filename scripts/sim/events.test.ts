// Bible acceptance checks for shift events, power targets and the Safety Test (ai/high-level-plan.md
// §12–§14), run through the real game loop (lib/game-loop). Run: node --run sim:test
import { test } from "node:test"
import assert from "node:assert/strict"
import { type GameMode, type GameState, GAME_MODE_CONFIGS, MAJOR_EVENT_KINDS, getPowerTolerance } from "../../lib/types"
import { EVENT_TUNING } from "../../lib/sim/tuning"
import { seededRng } from "../../lib/sim/rng"
import { getRodMargin } from "../../lib/sim/reactor"
import { advanceGame, createNewGame } from "../../lib/game-loop"
import { isPowerOnTarget } from "../../lib/game-mechanics"
import { checkEventWarnings, getWarningFlags } from "../../lib/game-utils"
import { checkTurbineTrip, planShiftEvents, runShiftEvents, startEvent } from "../../lib/game-events"
import { SAFETY_TEST_SCRIPT, getSafetyTestStatus } from "../../lib/safety-test"
import { REFERENCE_STATE } from "../../lib/sim/tuning"
import { makeBot, playGame, type GameRun } from "./bot"

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

test("§12 the shift's plan: ≈1 major emergency on Easy, ≈3 on Hard, none early, sensibly spaced", () => {
  for (const mode of ["easy", "hard"] as const) {
    const tuning = EVENT_TUNING[mode]
    const length = GAME_MODE_CONFIGS[mode].timeLimit!
    const majors: number[] = []
    const smalls: number[] = []
    for (let seed = 1; seed <= 400; seed++) {
      const plan = planShiftEvents(tuning, length, seededRng(seed))
      const m = plan.filter((e) => isMajor(e.kind))
      majors.push(m.length)
      smalls.push(plan.length - m.length)
      for (const e of m) assert.ok(e.at >= 180, `${mode} seed ${seed}: major at ${e.at}s`)
      for (let i = 1; i < m.length; i++) assert.ok(m[i].at - m[i - 1].at >= tuning.majorSpacing - 1, `${mode} seed ${seed}: majors ${m[i - 1].at}s, ${m[i].at}s`)
      for (const e of plan) assert.ok(e.at <= length - tuning.lastStartBefore, `${mode} seed ${seed}: event at ${e.at}s`)
      for (const e of plan.filter((x) => !isMajor(x.kind))) {
        assert.ok(plan.every((o) => o === e || Math.abs(o.at - e.at) >= tuning.smallSpacing - 1), `${mode} seed ${seed}: small event crowded`)
      }
    }
    const [lo, hi] = mode === "easy" ? [0.9, 1.4] : [2.7, 3.3]
    assert.ok(mean(majors) >= lo && mean(majors) <= hi, `${mode}: ${mean(majors).toFixed(2)} majors per shift`)
    const [slo, shi] = mode === "easy" ? [1, 2] : [2.5, 4]
    assert.ok(mean(smalls) >= slo && mean(smalls) <= shi, `${mode}: ${mean(smalls).toFixed(2)} smaller events per shift`)
  }
})

test("§12 a typical shift shows the budgeted emergencies, each major warned of in advance", () => {
  for (const mode of ["easy", "hard"] as const) {
    let budgeted = 0
    let happened = 0
    for (const run of shifts(mode)) {
      const plan = run.states[0].eventPlan ?? []
      budgeted += plan.filter((e) => isMajor(e.kind)).length
      const fired = run.final.eventHistory.filter((e) => isMajor(e.type))
      happened += fired.length
      for (const event of fired) {
        const startedAt = (run.final.timeLimit ?? 0) - event.timestamp
        const warning = run.final.log.find((l) =>
          event.type === "power-cut" ? l.text.startsWith("Grid instability") : l.text.startsWith("Pressure fluctuations"),
        )
        assert.ok(warning, `${mode}: no warning before the ${event.type} at ${startedAt}s`)
      }
      const warnings = run.final.log.filter((l) => l.text.startsWith("Grid instability"))
      const cuts = run.final.eventHistory.filter((e) => e.type === "power-cut")
      cuts.forEach((cut, i) => {
        const startedAt = (run.final.timeLimit ?? 0) - cut.timestamp
        assert.ok(warnings[i] && startedAt - warnings[i].time >= 30, `${mode}: power cut at ${startedAt}s warned at ${warnings[i]?.time}s`)
      })
    }
    assert.ok(happened >= budgeted * 0.9 && happened <= budgeted, `${mode}: ${happened} of ${budgeted} budgeted majors happened`)
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
  assert.ok(s.log.at(-1)?.text.startsWith("Turbine tripped"))
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

test("§12 a rod jammed mid-travel stays where it stopped until the jam clears, and after", () => {
  const rng = seededRng(3)
  let s = quietGame("easy")
  s = { ...s, controlRods: s.controlRods.map((r) => ({ ...r, target: 100 })) }
  s = step(s, 2, rng)
  s = startEvent(s, "rod-stuck", EVENT_TUNING.easy, rng)
  const jam = s.activeEvents[0]
  const jammed = jam.data!.affectedRods!
  const stoppedAt = jammed.map((i) => s.controlRods[i].insertion)
  assert.ok(stoppedAt.every((p) => p > 40 && p < 100), `stopped mid-travel at ${stoppedAt}`)
  for (let t = 0; t < jam.duration - 1; t++) {
    s = step(s, 1, rng)
    jammed.forEach((i, k) => assert.equal(s.controlRods[i].insertion, stoppedAt[k]))
  }
  s = step(s, 5, rng)
  assert.ok(s.controlRods.every((r) => !r.stuck), "jam cleared")
  jammed.forEach((i, k) => assert.equal(s.controlRods[i].insertion, stoppedAt[k], "stays where it stopped"))
  assert.ok(s.controlRods.filter((_, i) => !jammed.includes(i)).every((r) => r.insertion === 100))
  assert.equal(s.stats.emergenciesHandled, 1)
})

test("§12 a power cut takes the pumps' mains supply; the turbine can supply them; it counts as handled", () => {
  const rng = seededRng(5)
  let s = startEvent(quietGame("easy"), "power-cut", EVENT_TUNING.easy, rng)
  const cut = s.activeEvents[0]
  assert.ok(cut.duration >= 20 && cut.duration <= 45)
  s = step(s, 1, rng)
  assert.ok(s.waterPumps.every((p) => !p.powered), "no supply on the grid")
  s = step({ ...s, turbineMode: "pumps", turbineConnected: false }, 2, rng)
  assert.ok(s.waterPumps.filter((p) => p.powered).length >= 2, "turbine supplies the ON pumps")
  assert.equal(s.powerOutput, 0)
  s = step(s, cut.duration, rng)
  assert.equal(s.mainsPower, true)
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
  s = step(s, trip.duration, rng)
  const back = s.waterPumps.find((p) => p.id === id)!
  assert.ok(!back.tripped && back.powered && back.flow === 1, "back in service")
  assert.equal(s.stats.emergenciesHandled, 0, "a smaller event is not a major emergency")
})

test("§12 a grid hold request halves the tolerance and the grid announces nothing new meanwhile", () => {
  assert.equal(getPowerTolerance(5000, true), 250)
  let s = startEvent({ ...quietGame("hard"), powerOutput: 5300 }, "grid-hold", EVENT_TUNING.hard, seededRng(1))
  assert.equal(isPowerOnTarget(s), false)
  assert.equal(isPowerOnTarget({ ...s, powerOutput: 5200 }), true)
  s = runShiftEvents({ ...s, nextTargetChangeAt: 0 }, seededRng(1))
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

test("§13 target changes are announced 60 s ahead, smaller than before, within range; Hard's are bigger and more frequent", () => {
  const sizes: Record<string, number[]> = { easy: [], hard: [] }
  const gaps: Record<string, number[]> = { easy: [], hard: [] }
  for (const mode of ["easy", "hard"] as const) {
    const tuning = EVENT_TUNING[mode]
    for (const run of shifts(mode)) {
      const changes = targetChanges(run)
      assert.ok(changes.length >= (mode === "easy" ? 2 : 7), `${mode}: only ${changes.length} target changes`)
      changes.forEach((c, i) => {
        assert.equal(c.effective - c.announced, EVENT_TUNING.targetNotice, `${mode}: notice ${c.effective - c.announced}s`)
        const size = Math.abs(c.to - c.from)
        assert.ok(size <= tuning.targetMaxStep && size >= tuning.targetMinStep, `${mode}: change of ${size} MW`)
        assert.ok(c.to >= tuning.targetRange[0] && c.to <= tuning.targetRange[1], `${mode}: target ${c.to}`)
        sizes[mode].push(size)
        if (i > 0) {
          const gap = c.effective - changes[i - 1].effective
          assert.ok(gap >= tuning.targetInterval[0], `${mode}: changes ${gap}s apart`)
          gaps[mode].push(gap)
        }
      })
    }
  }
  assert.ok(mean(sizes.hard) > mean(sizes.easy), `sizes: easy ${mean(sizes.easy)}, hard ${mean(sizes.hard)}`)
  assert.ok(mean(gaps.hard) < mean(gaps.easy), `gaps: easy ${mean(gaps.easy)}s, hard ${mean(gaps.hard)}s`)
})

test("§13 a competent player meets the targets on Easy and Hard, and Hard is harder", () => {
  const onTarget = (mode: GameMode) =>
    shifts(mode).map((run) => {
      assert.ok(run.final.hasWon, `${mode}: the bot did not survive (${run.final.gameOverCause})`)
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

test("§14 every phase is triggered in order; each automated change happens once, as it is announced", () => {
  const run = safety()
  const scripted = run.final.log.filter((l) => SAFETY_TEST_SCRIPT.some((step) => step.text === l.text))
  assert.equal(scripted.length, SAFETY_TEST_SCRIPT.length, "every script step logged exactly once")
  SAFETY_TEST_SCRIPT.forEach((step, i) => assert.ok(Math.abs(scripted[i].time - step.at) <= 1, `step at ${step.at}s logged at ${scripted[i].time}s`))
  const phases = run.states.map((s) => getSafetyTestStatus(s).phase)
  assert.deepEqual([...new Set(phases)], [1, 2, 3, 4, 5, 6])
  const at = (t: number) => run.states[t - 1]
  assert.ok(at(1320).waterPumps.every((p) => p.on), "pumps switched on with the announcement")
  assert.equal(at(1350).turbineMode, "pumps")
  assert.equal(at(1384).mainsPower, false)
  assert.equal(at(1500).mainsPower, true)
  assert.equal(run.final.eventHistory.length, 0, "no random events")
})

test("§14 the player can reverse an automated change and the script never undoes it", () => {
  const rng = seededRng(2)
  const bot = makeBot()
  let s = createNewGame("safety_test")
  for (let t = 0; t < 1325; t++) s = advanceGame(bot.act(s), rng)
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
  const after = run.states.slice(1350)
  assert.ok(after.every((s) => s.powerTarget === null))
  assert.ok(after.every((s) => s.performance === after[0].performance))
})

test("§14 with the xenon from phases 2–3, holding the test output takes the rod margin below its minimum", () => {
  const run = safety()
  const phase4 = run.states.slice(960, 1320)
  const lowest = Math.min(...phase4.map((s) => getRodMargin(s.controlRods)))
  assert.ok(lowest < 200, `lowest rod margin in phase 4: ${lowest}`)
  assert.ok(run.states[1319].xenon > 80, `xenon ${run.states[1319].xenon.toFixed(0)}% when the test begins`)
})

test("§14 surviving to the end is possible with skilful play; ignoring the test ends in disaster", () => {
  assert.ok(safety().final.hasWon, "rods inserted as the test begins")
  assert.ok(safety({ testResponse: "az5" }).final.hasWon, "AZ-5 as the test begins (no rod parked at 0%)")
  assert.ok(safety({ testResponse: "none" }).final.isGameOver, "doing nothing")
})

test("§11/§14 a Safety Test runaway with the pumps unpowered ends in an explosion", () => {
  // Player error: the turbine goes back on the grid as the test begins, so nothing powers the pumps.
  const rng = seededRng(1)
  const bot = makeBot({ testResponse: "none" })
  let s = createNewGame("safety_test")
  for (let t = 0; t < 1386; t++) s = advanceGame(bot.act(s), rng)
  s = { ...s, turbineMode: "grid", turbineConnected: true }
  while (!s.isGameOver && !s.hasWon) s = advanceGame(s, rng)
  assert.equal(s.gameOverCause, "explosion")
})
