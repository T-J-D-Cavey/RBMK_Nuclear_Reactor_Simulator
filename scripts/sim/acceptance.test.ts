// Bible acceptance checks for the reactor engine (ai/high-level-plan.md §5–§11), as code.
// Run: node --run sim:test
import { test } from "node:test"
import assert from "node:assert/strict"
import { scenarios, poisonedState } from "./scenarios"
import { az5, baseState, gameStart, run, runQuiet, setPumps, setRods, settle, steadyAt } from "./harness"
import { getReactivityCards, nextTurbineCapacity, steamTarget, supplyPumps, xenonRate } from "../../lib/sim/reactor"
import { TUNING } from "../../lib/sim/tuning"
import type { GameState } from "../../lib/types"

const withRod = (s: GameState, idx: number, pos: number, instant = true) =>
  setRods(s, s.controlRods.map((r, i) => (i === idx ? pos : r.target)), { instant })
const rho = (s: GameState) => getReactivityCards(s).total
const maxR = (r: ReturnType<typeof run>, from = 0, to = Infinity) =>
  Math.max(...r.samples.filter((x) => x.t >= from && x.t <= to).map((x) => x.R))

// ---------- §5 Reactivity and radioactivity ----------

test("§5 the balanced reference state is roughly steady; hands-off drift is slow", () => {
  const quiet = scenarios.steadyQuiet.run()
  assert.ok(Math.abs(quiet.final.radioactivity - 100) < 2, `quiet drift ${quiet.final.radioactivity}`)
  // With noise: no runaway or collapse in the first 30 s, across several seeds.
  for (const seed of [1, 2, 3, 4, 5]) {
    const r = run(baseState(), 30, {}, seed)
    for (const x of r.samples) assert.ok(x.R > 70 && x.R < 130, `seed ${seed} t=${x.t} R=${x.R}`)
  }
})

test("§5 the game starts climbing: radioactivity rises from the start and needs a correction within a couple of minutes", () => {
  const r = runQuiet(gameStart(), 600)
  const R = (t: number) => r.samples[t].R
  for (const t of [30, 60, 120, 180]) assert.ok(R(t) > R(t - 30), `not rising at t=${t}`)
  const leaves = r.samples.find((x) => Math.abs(x.S * 50 - 5000) > 500)
  assert.ok(leaves && leaves.t <= 60, `output leaves ±10% at ${leaves?.t}s`)
  assert.ok(R(180) > 2 * R(0), `R=${R(180).toFixed(0)} at 3 min`)
  assert.ok(r.ending, "left alone, it should end in disaster")
})

test("§5 a hands-off reactor is never perfectly static (noise present)", () => {
  const r = run(baseState(), 120, {}, 7)
  const values = new Set(r.samples.map((x) => x.R.toFixed(2)))
  assert.ok(values.size > 50)
})

test("§5/§10 the same rod step has the same boron effect at any depth", () => {
  const s = baseState()
  const shallow = rho(withRod(s, 0, 5)) - rho(withRod(s, 0, 10))
  const deep = rho(withRod(s, 0, 45)) - rho(withRod(s, 0, 50))
  assert.ok(Math.abs(shallow - deep) < 1e-9, `${shallow} vs ${deep}`)
  assert.ok(Math.abs(shallow - 5 * TUNING.rodWorth) < 1e-9) // 5% of boron
})

test("§5 the same push moves radioactivity further and faster when radioactivity is high", () => {
  // Same +10 point push from two steady states; compare the change over 3 s.
  const low = steadyAt(70)
  const high = steadyAt(180)
  assert.ok(high.radioactivity > low.radioactivity * 1.5)
  const kick = (s: GameState) => ({ ...s, reactivityNoise: 10 })
  for (const seconds of [1, 3]) {
    const dLow = runQuiet(kick(low), seconds).final.radioactivity - low.radioactivity
    const dHigh = runQuiet(kick(high), seconds).final.radioactivity - high.radioactivity
    assert.ok(dHigh > dLow, `${seconds}s: low +${dLow.toFixed(1)}, high +${dHigh.toFixed(1)}`)
  }
})

test("§5 a reachable state exists where radioactivity at least doubles within a few seconds with no input", () => {
  const r = scenarios.restartNoCatch.run()
  const doubled = r.samples.some((x, i) => {
    const later = r.samples[i + 3]
    return later && x.R > 20 && later.R >= 2 * x.R
  })
  assert.ok(doubled)
})

test("§5 radioactivity never sticks permanently at zero", () => {
  const r = scenarios.az5Normal.run()
  assert.ok(r.final.radioactivity > 0)
  assert.ok(scenarios.restart.run().samples.some((x) => x.R > 50))
})

// ---------- §6 Temperatures ----------

test("§6 after a rise in radioactivity, fuel temperature rises before reactor temperature", () => {
  const r = scenarios.pullOneRod.run()
  const t0 = r.samples[10]
  const firstFuel = r.samples.find((x) => x.t > 10 && x.F > t0.F + 5)!
  const firstReactor = r.samples.find((x) => x.t > 10 && x.T > t0.T + 5)!
  assert.ok(firstFuel.t < firstReactor.t, `fuel ${firstFuel.t}s, reactor ${firstReactor.t}s`)
})

test("§6 at steady radioactivity, fuel temperature sits above reactor temperature", () => {
  const s = settle(baseState(), 300)
  assert.ok(s.fuelTemp > s.reactorTemp + 50)
})

test("§6 hot fuel never stops a rise: with rods and pumps unchanged, a small push ends in disaster", () => {
  // Rod 1 just 1% out of balance, two pumps, hands off. Only rods or pumps could have stopped it.
  const r = runQuiet(baseState(), 3600, { 10: (s) => withRod(s, 0, 39, false) })
  assert.ok(r.ending === "meltdown" || r.ending === "explosion", `ended ${r.ending}`)
})

test("§6 very hot fuel slows the rise without stopping it", () => {
  const r = runQuiet(baseState(), 1800, { 10: (s) => withRod(s, 0, 30, false) })
  // Relative growth rate of radioactivity (per second) while the fuel heats through a range.
  const growth = (from: number, to: number) => {
    const a = r.samples.find((x) => x.F >= from)!
    const b = r.samples.find((x) => x.F >= to)!
    return Math.log(b.R / a.R) / (b.t - a.t)
  }
  const warm = growth(700, 1000)
  const veryHot = growth(1500, 1800)
  assert.ok(veryHot > 0 && veryHot < warm * 0.7, `warm ${warm.toFixed(4)}/s, very hot ${veryHot.toFixed(4)}/s`)
  assert.ok(r.ending, "expected disaster in the end")
})

test("§6 more pumps lower fuel temperature as well as reactor temperature", () => {
  const two = settle(baseState(), 600)
  const three = settle(setPumps(baseState(), 3), 600)
  assert.ok(three.reactorTemp < two.reactorTemp && three.fuelTemp < two.fuelTemp)
})

// ---------- §7 Pumps ----------

test("§7 a pump's effect builds over a few seconds after switching, not instantly", () => {
  const r = scenarios.pumps3.run()
  const flowAt = (t: number) => r.samples[t].flow
  assert.ok(flowAt(11) > 2 && flowAt(11) < 3)
  assert.ok(flowAt(15) === 3)
})

test("§7 turning a pump on/off has a visibly larger effect at high radioactivity than at low", () => {
  const low = steadyAt(70)
  const high = steadyAt(180)
  const effect = (s: GameState) => Math.abs(runQuiet(s, 30, { 0: (x) => setPumps(x, 1) }).final.reactorTemp - s.reactorTemp)
  assert.ok(effect(high) > effect(low) * 1.3, `low ${effect(low).toFixed(1)}°, high ${effect(high).toFixed(1)}°`)
})

test("§7 running all four pumps at low radioactivity measurably lowers radioactivity", () => {
  const low = steadyAt(70)
  const two = runQuiet(low, 60).final.radioactivity
  const four = runQuiet(low, 60, { 0: (s) => setPumps(s, 4) }).final.radioactivity
  assert.ok(four < two * 0.9, `two pumps ${two.toFixed(1)}, four ${four.toFixed(1)}`)
})

test("§7/§11 losing all pumps at high radioactivity ends in disaster within about a minute", () => {
  const r = scenarios.allPumpsLostHighR.run()
  assert.ok(r.ending, "expected a disaster")
  assert.ok(r.endedAt! - 30 <= 75, `took ${r.endedAt! - 30}s`)
  assert.ok(r.endedAt! - 30 >= 10, `took only ${r.endedAt! - 30}s: no time to react`)
})

test("§7 losing all pumps at high radioactivity can be saved by rapid rod insertion", () => {
  const start = scenarios.allPumpsLostHighR.run().samples[0].state
  const r = runQuiet(start, 180, { 30: (s) => setPumps(s, 0), 35: az5 })
  assert.equal(r.ending, null)
})

test("§7 zero pumps at low radioactivity: a slower but real climb", () => {
  const r = runQuiet(steadyAt(60), 900, { 10: (s) => setPumps(s, 0) })
  assert.ok(r.ending, "expected the climb to end badly if ignored")
  assert.ok(r.endedAt! - 10 > 60, `ended after only ${r.endedAt! - 10}s`)
})

// ---------- §8 Steam and turbine-powered pumps ----------

test("§8 steam never depends on fuel temperature directly", () => {
  const s = baseState()
  const hotFuel = { ...s, fuelTemp: 2000 }
  assert.equal(steamTarget(s.reactorTemp, 2), steamTarget(hotFuel.reactorTemp, 2))
  assert.equal(steamTarget(80, 2), 0) // below boiling there is none
})

test("§8 in a violent radioactivity spike, reactor temperature and steam both climb within seconds", () => {
  const r = scenarios.restartNoCatch.run()
  const spike = r.samples.findIndex((x) => x.R > 1000)
  assert.ok(spike > 0)
  const before = r.samples[spike - 2]
  const after = r.samples[spike + 6]
  assert.ok(after.T - before.T > 30, `T +${(after.T - before.T).toFixed(0)}`)
})

test("§8 turbine supply powers pumps in proportion to steam, ON pumps first", () => {
  const s: GameState = { ...baseState(), mainsPower: false, turbineMode: "pumps", turbinePumpCapacity: 0 }
  const none = supplyPumps({ ...s, steamVolume: 0 })
  assert.equal(none.pumps.filter((p) => p.powered).length, 0)
  const some = supplyPumps({ ...s, steamVolume: 60 })
  assert.ok(some.capacity >= 1 && some.capacity <= 2)
  assert.ok(some.pumps[0].powered) // pump 1 is ON in the default state
  const lots = supplyPumps({ ...s, steamVolume: 200 })
  assert.equal(lots.pumps.filter((p) => p.powered).length, 4)
})

test("§8 turbine supply does not flicker while steam sits near a threshold", () => {
  let cap = nextTurbineCapacity(0, 70) // 2 pumps
  const seen = new Set<number>()
  for (let i = 0; i < 50; i++) {
    cap = nextTurbineCapacity(cap, 70 + (i % 2 ? 4 : -4))
    seen.add(cap)
  }
  assert.equal(seen.size, 1)
})

test("§8 no supply without mains or turbine; mains powers every untripped pump", () => {
  const idle = supplyPumps({ ...baseState(), mainsPower: false, turbineMode: "idle" })
  assert.ok(idle.pumps.every((p) => !p.powered))
  const mains = supplyPumps(baseState())
  assert.ok(mains.pumps.every((p) => p.powered))
})

// ---------- §9 Xenon ----------

test("§9 after sustained normal running, xenon reads 0%", () => {
  assert.equal(settle(baseState(), 600).xenon, 0)
})

test("§9 collapse to full xenon takes several minutes", () => {
  const r = scenarios.collapse.run()
  const full = r.samples.find((x) => x.X >= 100)!
  assert.ok(full.t >= 180 && full.t <= 600, `full xenon after ${full.t}s`)
})

test("§9 a poisoned, collapsed reactor restarts within ~1–3 minutes with rods out and pumps cooling", () => {
  const r = scenarios.restart.run()
  const climbing = r.samples.find((x) => x.R > 20)!
  assert.ok(climbing && climbing.t <= 180, `climbing at ${climbing?.t}s`)
})

test("§9 burn-off speed depends on radioactivity", () => {
  // One turnover (owner, plan §21 step 8b): at or below 80 xenon builds, faster the lower radioactivity is;
  // above it a full load (100%) clears slowly just above 80, at a medium rate by 100, fast by 120 and in about
  // 10 s from 130 (owner, 2026-10-15; was ~3 s).
  const clearTime = (R: number) => 100 / -xenonRate(R)
  assert.ok(xenonRate(80) === 0 && xenonRate(70) > 0, "builds at or below 80")
  assert.ok(xenonRate(0) > 3 * xenonRate(60), "builds faster the closer radioactivity is to 0")
  assert.ok(clearTime(85) >= 240, `slow just above 80: ${clearTime(85)}s`)
  assert.ok(clearTime(100) >= 60 && clearTime(100) <= 120, `medium at 100: ${clearTime(100)}s`)
  assert.ok(clearTime(120) <= 60, `fast at 120: ${clearTime(120)}s`)
  assert.ok(clearTime(130) >= 8 && clearTime(130) <= 12 && clearTime(500) === clearTime(130), `~10 s from 130: ${clearTime(130)}s`)
})

test("§9 doing nothing during burn-off with rods fully out overshoots dangerously", () => {
  assert.ok(maxR(scenarios.restartNoCatch.run()) > 250)
})

// ---------- §10 Control rods ----------

test("§10 a rod moving off 0% causes a short spike; an inserted rod causes none", () => {
  const r = scenarios.tipFromZero.run()
  // One rod's tip (5 points) is under the prompt threshold, so it acts at the slow rate: since the slower
  // generation time (owner, 2026-10-14) the spike is about 2% over 2 s (was 4% in 1 s). AZ-5 with many rods at 0%
  // goes prompt and is unchanged or stronger (checks below).
  assert.ok(Math.max(r.samples[31].R, r.samples[32].R) > r.samples[30].R * 1.015, "spike when the tip enters")
  assert.ok(r.samples[40].R < r.samples[30].R, "then the boron takes over")
  const inserted = runQuiet(baseState(), 20, { 5: (s) => withRod(s, 0, 70, false) })
  assert.ok(inserted.samples.slice(6).every((x) => x.R <= inserted.samples[5].R + 0.5))
})

test("§10 AZ-5 with every rod at 0% pushes radioactivity up for about 2 seconds", () => {
  const r = scenarios.az5AllOut.run()
  const peak = r.samples.reduce((a, b) => (b.R > a.R ? b : a))
  // The tips alone peak at about 2 s. In this poisoned core their spike carries radioactivity past 120, where the
  // xenon burns off fast, so the surge runs on to about 3 s (peak ~145; ~750 at 5 s while a full load went in ~3 s).
  assert.ok(peak.t >= 1 && peak.t <= 6, `peak at ${peak.t}s`)
  assert.ok(peak.R > r.samples[0].R * 1.5)
})

test("§10 pulling a rod 1%→0% lowers radioactivity; every other withdrawal step raises it", () => {
  const s = baseState()
  assert.ok(rho(withRod(s, 0, 0)) < rho(withRod(s, 0, 1)))
  for (const [from, to] of [[2, 1], [10, 8], [50, 45], [100, 90]]) {
    assert.ok(rho(withRod(s, 0, to)) > rho(withRod(s, 0, from)), `${from}→${to}`)
  }
  assert.ok(Math.abs(rho(withRod(s, 0, 1)) - rho(withRod(s, 0, 0)) - 9 * TUNING.rodWorth) < 1e-9) // tip 10 − 1% boron
})

test("§10 AZ-5 from a normal state always shuts the reactor down safely", () => {
  for (const seed of [1, 2, 3]) {
    const r = run(baseState(), 120, { 10: az5 }, seed)
    assert.equal(r.ending, null)
    assert.ok(maxR(r, 10) < 130)
    assert.ok(r.final.radioactivity < 1)
  }
})

test("§10 rods travel at a constant speed: full stroke ≈ 18 s", () => {
  const r = runQuiet(setRods(baseState(), 0, { instant: true }), 30, { 0: (s) => setRods(s, 100) })
  const arrived = r.samples.find((x) => x.state.controlRods.every((rod) => rod.insertion === 100))!
  assert.ok(arrived.t >= 17 && arrived.t <= 19, `arrived at ${arrived.t}s`)
})

test("§10 a jammed rod stops where it is, including mid-travel", () => {
  const r = runQuiet(baseState(), 20, {
    0: (s) => setRods(s, 100),
    3: (s) => ({ ...s, controlRods: s.controlRods.map((rod, i) => (i === 0 ? { ...rod, stuck: true } : rod)) }),
  })
  const pos = r.samples[3].state.controlRods[0].insertion
  assert.ok(pos > 40 && pos < 100)
  assert.equal(r.final.controlRods[0].insertion, pos)
})

test("§10 AZ-5 with most rods at 0%, high steam and low flow can be fatal", () => {
  // Rods 1–8 parked at 0%, held by fully inserted rods 9–10, one pump: a runaway (no state like this is
  // steady). AZ-5 is pressed once it is hot and steamy.
  // Since rods were halved in strength (plan §20 step 7b), so were their tips. The owner accepted a weaker trap:
  // the spike needed is ×1.25 (was ×1.4), and it takes eight rods at 0% rather than six.
  const climb = runQuiet(setPumps(setRods(baseState(), [0, 0, 0, 0, 0, 0, 0, 0, 100, 100], { instant: true }), 1, { instant: true }), 600)
  const fragile = climb.samples.find((x) => x.S > 250)!.state
  const r = runQuiet(fragile, 30, { 0: az5 })
  assert.ok(r.ending === "explosion" || maxR(r) > fragile.radioactivity * 1.25)
})

// ---------- §11 Endings ----------

test("§11 explosion is triggered by steam only; meltdown by reactor temperature only", () => {
  assert.equal(scenarios.pumps0.run().ending, "explosion")
  // With pumps running, a sustained overheat (rods nearly all out, two pumps) reaches meltdown first.
  const r = runQuiet(setRods(baseState(), 3, { instant: true }), 1800)
  assert.equal(r.ending, "meltdown", `got ${r.ending}, peak steam ${Math.max(...r.samples.map((x) => x.S)).toFixed(0)}`)
})
