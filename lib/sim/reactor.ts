// Pure reactor physics (bible §5–§11, §16). No React, no hidden randomness: callers pass an Rng.
import { type ControlRod, type GameOverCause, type GameState, type WaterPump, THRESHOLDS } from "../types"
import { TUNING as T, fuelEffect, pumpEffect } from "./tuning"
import { gaussian, type Rng } from "./rng"

export interface ReactivityCards {
  base: number
  void: number // red: steam in the core
  tips: number // red: graphite tips in the core
  boron: number // blue (negative)
  xenon: number // blue (negative)
  fuel: number // 0 at normal running; blue when hotter, red when cooler (strongly when very cold)
  noise: number
  total: number
}

const TIP_EPSILON = 1e-6

export function rodBoron(rods: ControlRod[]): number {
  return rods.reduce((sum, rod) => sum + rod.insertion, 0)
}

// Rod margin = total insertion across all ten rods (bible §10.2). Uses actual positions.
export const getRodMargin = rodBoron

export function tipsInCore(rods: ControlRod[]): number {
  return rods.filter((rod) => rod.insertion > TIP_EPSILON).length
}

export { fuelEffect }

export function getReactivityCards(state: GameState): ReactivityCards {
  const cards = {
    base: T.baseExcess,
    void: T.voidPerSteam * state.steamVolume,
    tips: T.rodWorth * T.tipWorth * tipsInCore(state.controlRods),
    boron: -T.rodWorth * rodBoron(state.controlRods),
    xenon: -T.xenonWorthPerPercent * state.xenon,
    fuel: fuelEffect(state.fuelTemp),
    noise: state.reactivityNoise,
  }
  return { ...cards, total: Object.values(cards).reduce((a, b) => a + b, 0) }
}

export function totalFlow(pumps: WaterPump[]): number {
  return pumps.reduce((sum, pump) => sum + pump.flow, 0)
}

// Steam per degree above boiling for a given flow: 1 from one pump upwards, more below that (bible §7, §8).
function steamFlowFactor(flow: number): number {
  return Math.exp(T.steamZeroFlowK * (1 - Math.min(flow, 1)))
}

export function steamTarget(reactorTemp: number, flow: number): number {
  const above = reactorTemp - T.boilingTemp
  if (above <= 0) return 0
  const lowFlow = Math.max(0, 1 - flow) ** 2
  return above * T.steamPerDegree * steamFlowFactor(flow) * (1 + T.boilingEscalation * lowFlow * (above / T.boilingEscalationScale) ** 3)
}

// How many pumps the turbine can power from current steam, held steady near thresholds (bible §8).
export function nextTurbineCapacity(current: number, steam: number): number {
  const raw = steam / T.turbineSteamPerPump
  let cap = Math.max(0, Math.min(4, Math.round(current)))
  while (cap < 4 && raw >= cap + 1 + T.turbineHysteresis) cap++
  while (cap > 0 && raw < cap - T.turbineHysteresis) cap--
  return cap
}

// The spin a turbine has left, in pumps' worth, the moment its steam is shut off: what that steam could power.
export function turbineCoastStart(steam: number): number {
  return Math.min(4, steam / T.turbineSteamPerPump)
}

// Decide which pumps receive power this second (PWR lamps).
export function supplyPumps(state: GameState): { pumps: WaterPump[]; capacity: number } {
  if (state.mainsPower) {
    return { pumps: state.waterPumps.map((p) => ({ ...p, powered: !p.tripped })), capacity: state.turbinePumpCapacity }
  }
  if (state.turbineMode !== "pumps") {
    return { pumps: state.waterPumps.map((p) => ({ ...p, powered: false })), capacity: 0 }
  }
  // A coasting turbine powers what its remaining spin allows; otherwise steam decides (bible §8).
  const capacity =
    state.turbineCoast !== null ? Math.ceil(state.turbineCoast - 1e-9) : nextTurbineCapacity(state.turbinePumpCapacity, state.steamVolume)
  // Turbine power goes to pumps the player has switched ON first.
  const order = [...state.waterPumps].filter((p) => !p.tripped).sort((a, b) => Number(b.on) - Number(a.on) || a.id - b.id)
  const suppliedIds = new Set(order.slice(0, capacity).map((p) => p.id))
  return { pumps: state.waterPumps.map((p) => ({ ...p, powered: suppliedIds.has(p.id) })), capacity }
}

export interface PhysicsResult {
  state: GameState
  ending: GameOverCause | null
}

// Advance the reactor by one second of game time.
export function advanceReactor(input: GameState, rng: Rng): PhysicsResult {
  const supply = supplyPumps(input)
  const s: GameState = {
    ...input,
    controlRods: input.controlRods.map((r) => ({ ...r })),
    waterPumps: supply.pumps,
    turbinePumpCapacity: supply.capacity,
    turbineCoast: input.turbineCoast === null ? null : Math.max(0, input.turbineCoast - 4 / T.turbineCoastSeconds),
  }

  // Slow correlated drift in the balance (Ornstein–Uhlenbeck), updated once per second.
  s.reactivityNoise += -s.reactivityNoise / T.noise.tau + T.noise.sigma * gaussian(rng)

  const dt = 1 / T.substeps
  const rodStep = (100 / T.rodFullStrokeSeconds) * dt
  const flowStep = dt / T.pumpRampSeconds
  let ending: GameOverCause | null = null

  for (let i = 0; i < T.substeps && !ending; i++) {
    // Rods travel toward their ordered position; jammed rods stay where they are (bible §10.3).
    for (const rod of s.controlRods) {
      if (rod.stuck) continue
      const delta = rod.target - rod.insertion
      rod.insertion = Math.abs(delta) <= rodStep ? rod.target : rod.insertion + Math.sign(delta) * rodStep
    }

    // Flow ramps toward 1 when a pump is on and powered, toward 0 otherwise (bible §7).
    for (const pump of s.waterPumps) {
      const goal = pump.on && pump.powered ? 1 : 0
      pump.flow = pump.flow < goal ? Math.min(goal, pump.flow + flowStep) : Math.max(goal, pump.flow - flowStep)
    }
    const flow = totalFlow(s.waterPumps)

    // Radioactivity: exponential in the net balance, plus a source term (bible §5).
    const rho = getReactivityCards(s).total
    const R = s.radioactivity
    s.radioactivity = Math.min(T.maxRadioactivity, R * Math.exp((rho / T.generationTime) * dt) + T.source * dt)

    // Fuel heated by radioactivity; heat flows to the reactor in proportion to the gap (bible §6).
    const transfer = T.fuelToReactorRate * (flow > 0.5 ? 1 : T.dryOutTransfer + (1 - T.dryOutTransfer) * (flow / 0.5))
    const fuelToReactor = transfer * (s.fuelTemp - s.reactorTemp)
    const heatIn = T.reactorShare * fuelToReactor
    const cooling =
      flow > 0
        ? pumpEffect(flow) * (T.pumpTempCoeff * Math.max(0, s.reactorTemp - T.coolantInletTemp) + T.pumpHeatInShare * Math.max(0, heatIn))
        : 0
    const passive = Math.min(Math.max(0, s.reactorTemp - T.ambientTemp) * T.passiveCooling, T.passiveCoolingMax)
    s.fuelTemp = Math.max(T.minTemp, s.fuelTemp + (T.fuelHeatPerRadioactivity * R - fuelToReactor) * dt)
    s.reactorTemp = Math.max(T.minTemp, s.reactorTemp + (heatIn - cooling - passive) * dt)

    // Steam follows reactor temperature only (bible §8).
    s.steamVolume = Math.max(0, s.steamVolume + (steamTarget(s.reactorTemp, flow) - s.steamVolume) * T.steamChaseRate * dt)

    s.xenon = Math.max(0, Math.min(100, s.xenon + xenonRate(R) * dt))

    ending = checkEnding(s)
  }

  return { state: s, ending }
}

// Xenon %/s: builds at low radioactivity (faster the lower), burns off faster the higher it is (bible §9).
export function xenonRate(radioactivity: number): number {
  const R = Math.max(0, radioactivity)
  if (R <= T.xenonTurnover) return T.xenonBuildRate * ((T.xenonTurnover - R) / T.xenonTurnover)
  return -Math.min(T.xenonBurnMax, T.xenonBurnRate * (R - T.xenonTurnover))
}

export function checkEnding(s: GameState): GameOverCause | null {
  // Steam only triggers the explosion; reactor temperature only triggers meltdown (bible §11).
  if (s.steamVolume >= THRESHOLDS.steamVolume.explosion) return "explosion"
  if (s.reactorTemp >= THRESHOLDS.reactorTemp.meltdown) return "meltdown"
  return null
}
