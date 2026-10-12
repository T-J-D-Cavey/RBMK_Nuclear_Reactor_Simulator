// Headless driver for the reactor engine: scripted inputs, seeded randomness, per-second traces.
import { INITIAL_GAME_STATE, type GameState, type GameOverCause } from "../../lib/types"
import { REFERENCE_STATE } from "../../lib/sim/tuning"
import { advanceReactor, getReactivityCards, getRodMargin, totalFlow } from "../../lib/sim/reactor"
import { seededRng, type Rng } from "../../lib/sim/rng"

export interface Sample {
  t: number
  R: number
  F: number
  T: number
  S: number
  X: number
  rho: number
  flow: number
  margin: number
  state: GameState
}

export interface RunResult {
  samples: Sample[]
  ending: GameOverCause | null
  endedAt: number | null
  final: GameState
}

// Inputs applied at given seconds (before that second is simulated).
export type Script = Record<number, (s: GameState) => GameState>

// The balanced reference state (exactly steady), which physics tests start from.
export function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...setRods(gameStart(), [...REFERENCE_STATE.rods], { instant: true }), ...overrides }
}

// The state a real game starts in (slightly off balance on purpose, bible §5), in Free mode.
export function gameStart(): GameState {
  return { ...structuredClone(INITIAL_GAME_STATE), mode: "free", powerTarget: null }
}

export function setRods(s: GameState, positions: number | number[], { instant = false } = {}): GameState {
  const list = Array.isArray(positions) ? positions : Array(10).fill(positions)
  return {
    ...s,
    controlRods: s.controlRods.map((r, i) => ({
      ...r,
      target: list[i],
      insertion: instant ? list[i] : r.insertion,
    })),
  }
}

export function setPumps(s: GameState, count: number, { instant = false } = {}): GameState {
  return {
    ...s,
    waterPumps: s.waterPumps.map((p, i) => ({ ...p, on: i < count, flow: instant ? (i < count ? 1 : 0) : p.flow })),
  }
}

export function az5(s: GameState): GameState {
  return { ...s, controlRods: s.controlRods.map((r) => (r.stuck ? r : { ...r, target: 100 })) }
}

export function sample(t: number, s: GameState): Sample {
  return {
    t,
    R: s.radioactivity,
    F: s.fuelTemp,
    T: s.reactorTemp,
    S: s.steamVolume,
    X: s.xenon,
    rho: getReactivityCards(s).total,
    flow: totalFlow(s.waterPumps),
    margin: getRodMargin(s.controlRods),
    state: s,
  }
}

export function run(start: GameState, seconds: number, script: Script = {}, seed = 1, rng?: Rng): RunResult {
  const random = rng ?? seededRng(seed)
  let s = start
  const samples: Sample[] = [sample(0, s)]
  for (let t = 0; t < seconds; t++) {
    if (script[t]) s = script[t](s)
    const result = advanceReactor(s, random)
    s = result.state
    samples.push(sample(t + 1, s))
    if (result.ending) return { samples, ending: result.ending, endedAt: t + 1, final: s }
  }
  return { samples, ending: null, endedAt: null, final: s }
}

// Run with no randomness at all (noise off): isolates the deterministic physics.
export function runQuiet(start: GameState, seconds: number, script: Script = {}): RunResult {
  return run(start, seconds, script, 0, () => 0.25) // gaussian(0.25, 0.25) = 0
}

// Settle a state with no player input so tests start from equilibrium, not from arbitrary numbers.
export function settle(s: GameState, seconds = 600): GameState {
  return runQuiet(s, seconds).final
}

// A settled state at roughly the target radioactivity, found by shifting every default rod by the same
// amount. Keeps test set-ups meaningful when tuning changes what a fixed set of rod positions produces.
export function steadyAt(target: number, pumps = 2, seconds = 400): GameState {
  const start = setPumps(baseState(), pumps, { instant: true })
  const defaults = start.controlRods.map((r) => r.target)
  const at = (offset: number) =>
    settle(setRods(start, defaults.map((v) => Math.max(0, Math.min(100, v + offset))), { instant: true }), seconds)
  // More rod in → lower settled radioactivity, so bisect on the offset.
  let lo = -60
  let hi = 60
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    if (at(mid).radioactivity > target) lo = mid
    else hi = mid
  }
  return at((lo + hi) / 2)
}

export function formatTrace(result: RunResult, every = 1): string {
  const rows = result.samples.filter((x, i) => i % every === 0 || i === result.samples.length - 1)
  const f = (n: number, w = 7, d = 0) => n.toFixed(d).padStart(w)
  const header = "     t       R       F       T       S      X     rho   flow  margin"
  const body = rows.map((x) => `${f(x.t, 6)}${f(x.R, 8, 1)}${f(x.F, 8)}${f(x.T, 8)}${f(x.S, 8, 1)}${f(x.X, 7, 1)}${f(x.rho, 8, 1)}${f(x.flow, 7, 2)}${f(x.margin, 8)}`)
  const end = result.ending ? `\n*** ${result.ending.toUpperCase()} at t=${result.endedAt}s` : ""
  return [header, ...body].join("\n") + end
}
