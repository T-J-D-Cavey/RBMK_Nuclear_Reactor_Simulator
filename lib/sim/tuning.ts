// Every reactor-physics number lives here. Section numbers refer to ai/high-level-plan.md.
// Reactivity is counted in "points": 1 point = 1% of one rod's boron (bible §10.4).
// This file must not import anything (lib/types.ts imports it).

// The calm starting state (bible §5: roughly steady with default rods and two pumps).
// Constants marked "derived" below are solved from this state so it stays balanced when others change.
export const REFERENCE_STATE = {
  radioactivity: 100,
  reactorTemp: 330,
  fuelTemp: 530, // runs hotter than the reactor at steady radioactivity (§6)
  steam: 100,
  rodBoron: 6 * 40 + 4 * 55, // default rods
  tipsIn: 10,
  flow: 2, // two pumps running
} as const

const TUNING_BASE = {
  // --- Integration ---
  substeps: 20, // per 1 s tick

  // --- §5 Reactivity and radioactivity ---
  generationTime: 100, // Λ: dR/dt = R·ρ/Λ. A balance of +10 points grows radioactivity ~10%/s
  source: 0.05, // radioactivity/s that is always present, so it never sticks at zero
  maxRadioactivity: 50000,
  voidPerSteam: 0.5, // red card: points per unit of steam in the core (§16: proportional)
  noise: {
    sigma: 0.8, // points per √s
    tau: 60, // s: slow, correlated drift (stationary s.d. = sigma·√(tau/2) ≈ 4.4 points)
  },

  // --- §10 Control rods ---
  rodFullStrokeSeconds: 18,
  tipWorth: 10, // red card per rod whose tip is in the core (= boron in the first 10% of travel)

  // --- §6 Fuel effect on reactivity (continuous curve) ---
  // Brake: slope rises with temperature, sMax·F/(F + halfTemp): weak when cool, mild mid-range, firm when hot.
  fuelBrakeMaxSlope: 0.5, // points per degree, approached when fuel is very hot
  fuelBrakeHalfTemp: 250,
  // Strong red card when very cold (restart lever, §9): coldCoeff·(coldBelow − F)².
  fuelColdBelow: 120,
  fuelColdCoeff: 0.0045,

  // --- §6 Temperatures (lagged heat balance, never exponential) ---
  fuelHeatPerRadioactivity: 0.4, // °/s of fuel heating per unit of radioactivity
  fuelToReactorRate: 0.4, // 1/s: heat flow ∝ gap (fuel responds within ~2.5 s)
  reactorShare: 0.05, // reactor bulk heats this much slower than the fuel cools (heat capacity ratio)
  dryOutTransfer: 0.75, // with no flow, fuel-to-coolant transfer degrades to this fraction (§7)
  coolantInletTemp: 10,
  ambientTemp: 3,
  passiveCooling: 0.0003, // 1/s, capped
  passiveCoolingMax: 3,
  minTemp: 5,

  // --- §7 Pumps and cooling ---
  pumpRampSeconds: 4, // flow takes a few seconds to build or die away
  pumpFlowHalf: 1.5, // effective cooling = flow/(flow + half): diminishing returns per pump
  pumpHeatInShare: 0.5, // cooling also removes this share of the heat arriving from the fuel (scales with radioactivity)

  // --- §8 Steam (follows reactor temperature only) ---
  boilingTemp: 90,
  steamChaseRate: 1.0, // 1/s
  // Steam per degree above boiling × exp(−k·(flow − 2)): 1 at two pumps
  // (zero flow alone ≈ ×1.65, one pump ≈ ×1.28, three ≈ ×0.78, four ≈ ×0.61).
  steamFlowK: 0.25,
  // Boiling escalation as flow → 0 (§7): × (1 + esc·(1 − flow)²·((T − boil)/scale)³).
  // Sharp in temperature, so with no flow the danger arrives as the reactor heats, not instantly.
  boilingEscalation: 0.25,
  boilingEscalationScale: 500,

  // --- §8 Turbine-powered pumps ---
  turbineSteamPerPump: 35, // steam needed per pump the turbine can power
  turbineHysteresis: 0.25, // in pumps: supply holds until steam has clearly moved

  // --- §9 Xenon ---
  xenonWorthPerPercent: 4.0, // blue card: points at 1% xenon (400 at the cap)
  xenonBuildBelow: 50,
  xenonBuildRate: 0.42, // %/s at radioactivity 0, scaled by how far below the build level
  xenonBurnAbove: 70,
  xenonBurnRate: 0.06, // %/s per unit of radioactivity above the burn level
} as const

const fuelBrake = (F: number) =>
  TUNING_BASE.fuelBrakeMaxSlope * (F - TUNING_BASE.fuelBrakeHalfTemp * Math.log(1 + F / TUNING_BASE.fuelBrakeHalfTemp))

const pumpEffect = (flow: number) => flow / (flow + TUNING_BASE.pumpFlowHalf)

function derive() {
  const r = REFERENCE_STATE
  const t = TUNING_BASE
  // Base excess reactivity of the fuel: makes the reference balance exactly zero.
  const baseExcess =
    r.rodBoron - r.tipsIn * t.tipWorth - t.voidPerSteam * r.steam + fuelBrake(r.fuelTemp)
  // Fuel heating is set so the reference fuel/reactor gap holds.
  const gap = r.fuelTemp - r.reactorTemp
  const fuelHeat = (t.fuelToReactorRate * gap) / r.radioactivity
  // Pump cooling coefficient that balances the reference reactor temperature.
  const heatIn = t.reactorShare * t.fuelToReactorRate * gap
  const passive = Math.min((r.reactorTemp - t.ambientTemp) * t.passiveCooling, t.passiveCoolingMax)
  const eff = pumpEffect(r.flow)
  const pumpTempCoeff = (heatIn - passive - eff * t.pumpHeatInShare * heatIn) / (eff * (r.reactorTemp - t.coolantInletTemp))
  // Steam per degree that gives the reference steam at the reference temperature, two pumps.
  const steamPerDegree = r.steam / (r.reactorTemp - t.boilingTemp)
  return { baseExcess, fuelHeat, pumpTempCoeff, steamPerDegree }
}

export const TUNING = { ...TUNING_BASE, fuelHeatPerRadioactivity: derive().fuelHeat, ...derive() }

export { fuelBrake, pumpEffect }
