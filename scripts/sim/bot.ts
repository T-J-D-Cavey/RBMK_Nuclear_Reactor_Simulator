// Scripted players for whole-game runs (events, targets, Safety Test). A bot reads only what the panel
// shows (radioactivity and its trend, output, target, temperatures, steam, lamps) and acts every few
// seconds, like a person. It is a yardstick for "a competent player can…" checks, not part of the game.
import { type ControlRod, type GameState, getShiftTime } from "../../lib/types"
import { advanceGame } from "../../lib/game-loop"
import { SAFETY_TEST_SCRIPT } from "../../lib/safety-test"
import { seededRng, type Rng } from "../../lib/sim/rng"
import { TUNING } from "../../lib/sim/tuning"

// Safety Test: from the first test step (all pumps on) a careful operator stops chasing output.
const TEST_PREP_AT = SAFETY_TEST_SCRIPT.find((step) => step.action === "pumps-on")?.at ?? Infinity

export interface BotOptions {
  cadence: number // seconds between looks at the panel
  minRod: number // a competent player never parks a rod below 1% (tips out of the core: bible §10)
  pumps: number // pumps to keep running
  allocation: "even" | "pull-out" // "pull-out": withdraws the shallowest rods all the way first (reckless)
  testResponse: "insert" | "az5" | "late-az5" | "none" // Safety Test: what to do when the test begins
}

const DEFAULTS: BotOptions = { cadence: 3, minRod: 1, pumps: 2, allocation: "even", testResponse: "insert" }

export interface Bot {
  act: (s: GameState) => GameState
  options: BotOptions
}

// Radioactivity giving a steady output with two pumps (rule of thumb a player learns: ~5,000 MW at 100).
function radioactivityFor(output: number): number {
  return (Math.max(0, output) / 20.8 + 80) / 3.2
}

export function makeBot(options: Partial<BotOptions> = {}): Bot {
  const o = { ...DEFAULTS, ...options }
  const history: number[] = []
  const outputs: number[] = []
  let correction = 0 // learnt offset (log scale) between the rule of thumb and reality
  let survival = false // Safety Test: the test has begun; only safety matters now
  let heldR: number | null = null // Safety Test: radioactivity held through the test preparations

  const act = (input: GameState): GameState => {
    let s = input
    history.push(Math.max(1e-3, s.radioactivity))
    outputs.push(s.powerOutput)
    const now = getShiftTime(s)
    if (now % o.cadence !== 0) return s
    const testPrep = s.mode === "safety_test" && now >= TEST_PREP_AT

    // --- Housekeeping: power cuts, trips, the turbine ---
    if (s.mode === "safety_test" && !s.mainsPower && !survival) {
      survival = true
      if (o.testResponse === "az5") return az5(s)
    }
    if (!survival) {
      if (!s.mainsPower && s.turbineMode === "grid") s = { ...s, turbineMode: "pumps", turbineConnected: false }
      if (s.mainsPower && s.turbineMode !== "grid" && s.powerTarget !== null && s.steamVolume < 280 && !testPrep) {
        s = { ...s, turbineMode: "grid", turbineConnected: true }
      }
      s = keepPumps(s, testPrep ? 4 : o.pumps) // follows the procedure: four pumps for the test
    }

    // --- How far is radioactivity from where it should be? ---
    const R = s.radioactivity
    let goal: number
    if (survival) {
      if (o.testResponse === "none") return s
      if (o.testResponse === "late-az5") return R > 400 && !s.controlRods.every((r) => r.target === 100) ? az5(s) : s
      goal = 5
    } else if (testPrep) {
      heldR ??= R
      goal = heldR
    } else if (s.powerTarget !== null) {
      // Output lags radioactivity by a couple of minutes, so steer by where output is heading: aim
      // radioactivity past the target while output is far off, and ease off as the trend closes the gap.
      // The bot only uses a target the player can see. The Safety Test's orders give the new target with their
      // notice, so it is chased shortly before it takes effect. In Easy and Hard the grid's warning gives no number
      // (bible §13), so the bot waits for the confirmation.
      const pending = s.mode === "safety_test" && s.pendingTarget && s.pendingTarget.at - now <= 20 ? s.pendingTarget.target : null
      const target = pending ?? s.powerTarget
      if (s.turbineMode !== "grid") {
        // No output while the turbine is off the grid (e.g. supplying the pumps in a power cut): hold the
        // radioactivity that will give the target once it is reconnected.
        goal = radioactivityFor(target) * Math.exp(correction)
      } else {
        const back = Math.min(10, outputs.length - 1)
        const trend = back > 0 ? (outputs[outputs.length - 1] - outputs[outputs.length - 1 - back]) / back : 0
        const heading = s.powerOutput + 40 * trend
        const demand = Math.max(0.2 * target, Math.min(2.5 * target + 1000, target + 2 * (target - heading)))
        // Learn the rule of thumb's error slowly, and only once output has settled near the target.
        if (Math.abs(40 * trend) < 0.05 * target + 50 && Math.abs(s.powerOutput - target) < 0.2 * target + 200) {
          const err = Math.log(Math.max(100, s.powerOutput) / Math.max(100, target))
          correction = Math.max(-0.5, Math.min(0.5, correction - 0.003 * err * o.cadence))
        }
        goal = radioactivityFor(demand) * Math.exp(correction)
      }
    } else {
      goal = 100 // Free mode: hold normal running
    }
    if (s.reactorTemp > 750 || s.steamVolume > 270 || s.fuelTemp > 1100) goal = Math.min(goal, R * 0.8)
    // Xenon burns off fast above 120 (bible §9), so while the gauge shows any, hold normal running at most.
    if (s.xenon > 0.5) goal = Math.min(goal, 90)

    // AZ-5 as a last resort (never needed if the loop works; safe because no rod is parked at 0%).
    if (o.allocation === "even" && (R > 900 || s.steamVolume > 500 || s.reactorTemp > 1100)) return az5(s)

    // --- Inner loop: set the growth rate, allowing for rod travel still under way ---
    const back = Math.min(3, history.length - 1)
    const growth = back > 0 ? Math.log(history[history.length - 1] / history[history.length - 1 - back]) / back : 0
    const wanted = Math.max(-0.04, Math.min(0.04, Math.log(goal / R) / 10))
    const inFlight = s.controlRods.reduce((sum, r) => sum + (r.target - r.insertion), 0)
    // % of boron to add (negative: withdraw): the balance change needed, in points, over what 1% is worth
    const change = (TUNING.generationTime * (growth - wanted)) / TUNING.rodWorth - inFlight
    if (Math.abs(change) < 0.5) return s
    return { ...s, controlRods: moveRods(s.controlRods, change, o) }
  }

  return { act, options: o }
}

function az5(s: GameState): GameState {
  return { ...s, controlRods: s.controlRods.map((r) => (r.stuck ? r : { ...r, target: 100 })) }
}

function keepPumps(s: GameState, wanted: number): GameState {
  const running = s.waterPumps.filter((p) => p.on && !p.tripped).length
  if (running === wanted) return s
  let toChange = wanted - running
  return {
    ...s,
    waterPumps: s.waterPumps.map((p) => {
      if (toChange > 0 && !p.on && !p.tripped) {
        toChange--
        return { ...p, on: true }
      }
      if (toChange < 0 && p.on && !p.tripped) {
        toChange++
        return { ...p, on: false }
      }
      return p
    }),
  }
}

// Add `change` % of boron (whole percent per rod, like the lever modal).
function moveRods(rods: ControlRod[], change: number, o: BotOptions): ControlRod[] {
  const next = rods.map((r) => ({ ...r }))
  const free = next.filter((r) => !r.stuck)
  if (!free.length) return rods
  let left = Math.round(change)
  if (o.allocation === "even") {
    // Spread over every free rod, one percent at a time, never below minRod.
    for (let guard = 0; left !== 0 && guard < 2000; guard++) {
      const candidates = free.filter((r) => (left > 0 ? r.target < 100 : r.target > o.minRod))
      if (!candidates.length) break
      const pick = candidates.reduce((a, b) => (left > 0 ? (b.target < a.target ? b : a) : b.target > a.target ? b : a))
      pick.target += Math.sign(left)
      left -= Math.sign(left)
    }
  } else {
    // Reckless: withdraw the shallowest rod all the way out first; insert the deepest rod first.
    for (let guard = 0; left !== 0 && guard < 2000; guard++) {
      const candidates = free.filter((r) => (left > 0 ? r.target < 100 && r.target > 0 : r.target > 0))
      const pool = candidates.length ? candidates : free.filter((r) => (left > 0 ? r.target < 100 : r.target > 0))
      if (!pool.length) break
      const pick = pool.reduce((a, b) => (left > 0 ? (b.target > a.target ? b : a) : b.target < a.target ? b : a))
      pick.target += Math.sign(left)
      left -= Math.sign(left)
    }
  }
  return next
}

export interface GameRun {
  final: GameState
  states: GameState[] // one per second, after the tick
}

// Play a whole game with a bot (or hands off with no bot) through the real game loop.
export function playGame(start: GameState, bot: Bot | null, seed = 1, rng: Rng = seededRng(seed), maxSeconds = 4000): GameRun {
  let s = start
  const states: GameState[] = []
  for (let t = 0; t < maxSeconds && !s.isGameOver && !s.hasWon; t++) {
    if (bot) s = bot.act(s)
    s = advanceGame(s, rng)
    states.push(s)
  }
  return { final: s, states }
}
