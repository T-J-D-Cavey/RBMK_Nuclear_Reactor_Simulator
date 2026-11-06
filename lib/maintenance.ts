// The machines' maintenance jobs (ai/machine-maintenance-plan.md): occasional work that keeps a machine at its best.
// Left alone, each penalty stops at a limit and nothing ever stops working. Pure, so the game and the bot share it.
import type { GameState } from "./types"
import { addLog } from "./game-utils"
import { rodBalance } from "./sim/reactor"
import type { Rng } from "./sim/rng"
import { MAINTENANCE_TUNING } from "./sim/tuning"

const TURBINE_OPERATOR = "TURBINE OPERATOR"
const REACTOR_TECHNICIAN = "REACTOR TECHNICIAN"
const PUMP_OPERATOR = "PUMP OPERATOR"
const BALANCE_FIXED_BELOW = 0.9 // the needle has properly left its limit, so a rod hovering there can't send a message a second

// What the turbine makes of its steam: air in the condenser costs output, not the pumps it can power (plan §3)
export const vacuumOutputFactor = (vacuum: number) => 1 - MAINTENANCE_TUNING.vacuumOutputLoss * (1 - vacuum)

// Pressing at full vacuum or during a recovery does nothing, in any turbine mode
export const canRunEjector = (s: Pick<GameState, "vacuum" | "ejectorSeconds">) => s.vacuum < 1 && s.ejectorSeconds === 0

export const runEjector = (s: Pick<GameState, "vacuum" | "ejectorSeconds">): Pick<GameState, "ejectorSeconds"> | null =>
  canRunEjector(s) ? { ejectorSeconds: MAINTENANCE_TUNING.ejectorRecoverySeconds } : null

// Air leaks in steadily whatever the turbine is doing, and the ejector clears it in the same time from any reading
function advanceVacuum(s: GameState): GameState {
  if (s.ejectorSeconds > 0) {
    return { ...s, vacuum: s.vacuum + (1 - s.vacuum) / s.ejectorSeconds, ejectorSeconds: s.ejectorSeconds - 1 }
  }
  return { ...s, vacuum: Math.max(0, s.vacuum - 1 / MAINTENANCE_TUNING.vacuumFallSeconds) }
}

// One message at the worst reading, and another only after the ejector has been run
function reportVacuum(s: GameState): GameState {
  if (s.vacuum > 0) return s.vacuumReported ? { ...s, vacuumReported: false } : s
  if (s.vacuumReported) return s
  return addLog({ ...s, vacuumReported: true }, "engineer", "Condenser vacuum is at its worst. We're losing output until the air ejector is run.", TURBINE_OPERATOR)
}

// A rod left parked can go slow, because a drive that never moves can stick (plan §5). From rodParkSeconds on it may
// go, at even odds each minute (owner, 2026-11-05). Only a move of at least rodFreeingMove from where it was parked
// restarts its clock, and a slow rod stays that way for the whole of that move: it recovers on arrival. A jammed rod's
// clock waits for it. A rod fully out has nothing to stick in (owner, 2026-11-05), so it can't go slow, and its clock
// starts when it's back in the core.
function exerciseRods(s: GameState, rng: Rng): GameState {
  const { rodParkSeconds, rodSlowCheckSeconds, rodSlowChance, rodFreeingMove } = MAINTENANCE_TUNING
  return {
    ...s,
    controlRods: s.controlRods.map((rod) => {
      if (rod.stuck) return rod
      if (rod.insertion === 0) return { ...rod, slow: false, parkedAt: 0, parkedSeconds: 0 }
      const moved = Math.abs(rod.insertion - rod.parkedAt) >= rodFreeingMove
      if (moved && (!rod.slow || rod.insertion === rod.target)) return { ...rod, slow: false, parkedAt: rod.insertion, parkedSeconds: 0 }
      const parkedSeconds = rod.parkedSeconds + 1
      const due = parkedSeconds >= rodParkSeconds && (parkedSeconds - rodParkSeconds) % rodSlowCheckSeconds === 0
      return { ...rod, parkedSeconds, slow: rod.slow || (due && rng() < rodSlowChance) }
    }),
  }
}

// One message with the needle hard over, and another only after the sides have been evened up
function reportRodBalance(s: GameState): GameState {
  const reading = Math.abs(rodBalance(s.controlRods))
  if (reading < BALANCE_FIXED_BELOW) return s.rodBalanceReported ? { ...s, rodBalanceReported: false } : s
  if (reading < 1 || s.rodBalanceReported) return s
  return addLog({ ...s, rodBalanceReported: true }, "engineer", "The rod banks are badly out of balance. Even up the two sides and the rods will answer properly.", REACTOR_TECHNICIAN)
}

// The balancer can't start during its own run, or with no pump running. It can at dead centre, for the usual cost.
export const canRunBalancer = (s: Pick<GameState, "balancerLock" | "balancerGlide" | "waterPumps">) =>
  s.balancerLock === 0 && s.balancerGlide === 0 && s.waterPumps.some((pump) => pump.on && pump.powered)

export const runBalancer = (s: Pick<GameState, "balancerLock" | "balancerGlide" | "waterPumps">): Pick<GameState, "balancerLock"> | null =>
  canRunBalancer(s) ? { balancerLock: MAINTENANCE_TUNING.balancerLockSeconds } : null

// Where the pump switches are set. They stay free during the balancer's lock, but nothing reaches the pumps until it ends.
export const pumpSwitches = (s: Pick<GameState, "waterPumps" | "pumpOrders">) => s.pumpOrders ?? s.waterPumps.map((pump) => pump.on)

// A pump switch acts at once, except during the lock: then the pumps keep running as they were, and the switches take
// effect as it ends (owner, 2026-11-06: no Apply key to hold them back any more).
export function throwPumpSwitch(s: Pick<GameState, "balancerLock" | "waterPumps" | "pumpOrders">, idx: number): Pick<GameState, "waterPumps"> | Pick<GameState, "pumpOrders"> {
  const switches = pumpSwitches(s).map((on, i) => (i === idx ? !on : on))
  return s.balancerLock > 0 ? { pumpOrders: switches } : { waterPumps: s.waterPumps.map((pump, i) => ({ ...pump, on: switches[i] })) }
}

// The needle drifts to its limit and stops. The balancer locks the pumps, then glides it back to centre, and a power
// cut part way through doesn't stop it.
function advancePumpBalance(s: GameState): GameState {
  if (s.balancerLock > 0) {
    const balancerLock = s.balancerLock - 1
    const next = { ...s, balancerLock, balancerGlide: balancerLock === 0 ? MAINTENANCE_TUNING.balancerGlideSeconds : 0 }
    if (balancerLock > 0 || !s.pumpOrders) return next
    return { ...next, waterPumps: s.waterPumps.map((pump, i) => ({ ...pump, on: s.pumpOrders![i] })), pumpOrders: null }
  }
  if (s.balancerGlide > 0) {
    const pumpBalance = s.pumpBalance - s.pumpBalance / s.balancerGlide
    const balancerGlide = s.balancerGlide - 1
    return { ...s, pumpBalance, balancerGlide, pumpDrift: balancerGlide === 0 ? (s.pumpDrift === 1 ? -1 : 1) : s.pumpDrift }
  }
  return { ...s, pumpBalance: Math.max(-1, Math.min(1, s.pumpBalance + s.pumpDrift / MAINTENANCE_TUNING.pumpDriftSeconds)) }
}

// One message with the needle at its limit, and another only after it has been balanced
function reportPumpBalance(s: GameState): GameState {
  if (Math.abs(s.pumpBalance) < 1) return s.pumpBalanceReported ? { ...s, pumpBalanceReported: false } : s
  if (s.pumpBalanceReported) return s
  return addLog({ ...s, pumpBalanceReported: true }, "engineer", "Circulation is as far out of balance as it gets. The fuel will run hot until it's rebalanced.", PUMP_OPERATOR)
}

// One second of the machines' clocks
export function advanceMaintenance(s: GameState, rng: Rng): GameState {
  return reportPumpBalance(advancePumpBalance(reportRodBalance(exerciseRods(reportVacuum(advanceVacuum(s)), rng))))
}
