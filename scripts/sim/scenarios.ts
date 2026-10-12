// Named scenarios shared by the trace tool and the acceptance tests. Bible sections in brackets.
import type { GameState } from "../../lib/types"
import { az5, baseState, run, runQuiet, setPumps, setRods, settle, steadyAt, type RunResult } from "./harness"

export interface Scenario {
  description: string
  run: () => RunResult
}

// A collapsed, fully poisoned reactor: radioactivity ~0, xenon just at the cap, fuel still warm.
export function poisonedState(): GameState {
  const collapse = runQuiet(setRods(baseState(), 70, { instant: true }), 1200)
  return collapse.samples.find((x) => x.X >= 100)!.state
}

export const scenarios: Record<string, Scenario> = {
  steady: {
    description: "[§5] Default start, hands off, with noise",
    run: () => run(baseState(), 300),
  },
  steadyQuiet: {
    description: "[§5] Default start, hands off, no noise",
    run: () => runQuiet(baseState(), 120),
  },
  pumps0: {
    description: "[§7] Default start, all pumps off at t=10",
    run: () => runQuiet(baseState(), 180, { 10: (s) => setPumps(s, 0) }),
  },
  pumps1: {
    description: "[§7] Default start, one pump at t=10",
    run: () => runQuiet(baseState(), 300, { 10: (s) => setPumps(s, 1) }),
  },
  pumps3: {
    description: "[§7] Default start, three pumps at t=10",
    run: () => runQuiet(baseState(), 300, { 10: (s) => setPumps(s, 3) }),
  },
  pumps4: {
    description: "[§7] Default start, four pumps at t=10",
    run: () => runQuiet(baseState(), 300, { 10: (s) => setPumps(s, 4) }),
  },
  pumps4LowR: {
    description: "[§7] Low radioactivity (rods deeper), then four pumps at t=60",
    run: () => runQuiet(setRods(baseState(), [50, 50, 50, 50, 50, 50, 55, 55, 55, 55]), 300, { 60: (s) => setPumps(s, 4) }),
  },
  pullOneRod: {
    description: "[§5] Rod 1 from 40% to 30% at t=10",
    run: () => runQuiet(baseState(), 200, { 10: (s) => setRods(s, s.controlRods.map((r, i) => (i === 0 ? 30 : r.target))) }),
  },
  az5Normal: {
    description: "[§10] AZ-5 from the default state",
    run: () => runQuiet(baseState(), 120, { 10: az5 }),
  },
  tipFromZero: {
    description: "[§10] Rod 1 parked at 0% (others compensate), then inserted to 30% at t=30",
    run: () =>
      runQuiet(settle(setRods(baseState(), [0, 45, 45, 45, 45, 45, 55, 55, 55, 55], { instant: true }), 300), 90, {
        30: (s) => setRods(s, s.controlRods.map((r, i) => (i === 0 ? 30 : r.target))),
      }),
  },
  allPumpsLostHighR: {
    description: "[§7/§11] Running hot (R≈185), all pumps lost at t=30, no response",
    run: () => runQuiet(steadyAt(185, 2, 600), 180, { 30: (s) => setPumps(s, 0) }),
  },
  collapse: {
    description: "[§9] Rods driven deep at t=10: collapse into the xenon pit",
    run: () => runQuiet(baseState(), 900, { 10: (s) => setRods(s, 70) }),
  },
  restart: {
    description: "[§9] Poisoned + collapsed; rods fully out and four pumps cooling the fuel at t=0",
    run: () => runQuiet(poisonedState(), 600, { 0: (s) => setPumps(setRods(s, 0), 4) }),
  },
  restartNoCatch: {
    description: "[§9] As restart, but the player never re-inserts rods",
    run: () => runQuiet(poisonedState(), 900, { 0: (s) => setPumps(setRods(s, 0), 4) }),
  },
  // Replays of the owner's manual tests (ai/manual-test-results.MD), kept for comparing tuning iterations.
  ownerPumpSwitch: {
    description: "[owner test 1] Default start, 2→1 pumps at t=10, back to 2 at t=120",
    run: () => runQuiet(baseState(), 300, { 10: (s) => setPumps(s, 1), 120: (s) => setPumps(s, 2) }),
  },
  ownerCooldownRestart: {
    description: "[owner test 2] AZ-5 at t=10, pumps off at t=60, all four on at t=180, all rods to 10% at t=360",
    run: () =>
      runQuiet(baseState(), 700, {
        10: az5,
        60: (s) => setPumps(s, 0),
        180: (s) => setPumps(s, 4),
        360: (s) => setRods(s, 10),
      }),
  },
  az5AllOut: {
    description: "[§10/§11] Fragile: rods at 0%, one pump, cold fuel and climbing; AZ-5 at t=0",
    run: () => {
      const start = runQuiet(poisonedState(), 2000, { 0: (s) => setPumps(setRods(s, 0), 4) })
      // Find the moment radioactivity first passes 60 on the restart, then cut flow and press AZ-5.
      const idx = start.samples.findIndex((x) => x.R > 60)
      const at = start.samples[Math.max(0, idx)].state
      return runQuiet(setPumps(at, 1, { instant: true }), 120, { 0: az5 })
    },
  },
}
