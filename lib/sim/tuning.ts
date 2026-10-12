// Every reactor-physics number lives here. Section numbers refer to ai/high-level-plan.md.
// Reactivity is counted in "points": 1 point = 1% of one rod's boron (bible §10.4).
// This file must not import anything (lib/types.ts imports it).

// The balanced reference state: exactly steady with these rods and two pumps. The engine is calibrated here.
// Constants marked "derived" below are solved from this state so it stays balanced when others change.
const REFERENCE_RODS = [40, 40, 40, 40, 40, 40, 55, 55, 55, 55]
export const REFERENCE_STATE = {
  radioactivity: 100,
  reactorTemp: 330,
  fuelTemp: 530, // runs hotter than the reactor at steady radioactivity (§6)
  steam: 100,
  rods: REFERENCE_RODS,
  rodBoron: REFERENCE_RODS.reduce((a, b) => a + b, 0),
  tipsIn: 10,
  flow: 2, // two pumps running
} as const

// The game starts off balance (owner request, bible §5): rods 1–3 sit 6%, 3% and 2% further out than the
// reference, so radioactivity climbs from the start and the player soon feels they need to act.
const STARTING_OFFSETS = [6, 3, 2]
export const STARTING_RODS = REFERENCE_RODS.map((v, i) => v - (STARTING_OFFSETS[i] ?? 0))

const TUNING_BASE = {
  // --- Integration ---
  substeps: 20, // per 1 s tick

  // --- §5 Reactivity and radioactivity ---
  generationTime: 100, // Λ: dR/dt = R·ρ/Λ. A balance of +10 points grows radioactivity ~10%/s
  source: 0.05, // radioactivity/s that is always present, so it never sticks at zero
  maxRadioactivity: 50000,
  voidPerSteam: 0.6, // red card: points per unit of steam in the core (§16: proportional)
  noise: {
    sigma: 0.2, // points per √s
    tau: 60, // s: slow, correlated drift (stationary s.d. = sigma·√(tau/2) ≈ 1.1 points)
  },

  // --- §10 Control rods ---
  rodFullStrokeSeconds: 18,
  tipWorth: 10, // red card per rod whose tip is in the core (= boron in the first 10% of travel)

  // --- §6 Fuel effect on reactivity (continuous curve) ---
  // Counted from normal running: 0 at the reference fuel temperature (a healthy reactor), blue when
  // hotter, red when cooler. Per degree it is mild up to about firmsAt, then firms up over ~firmWidth
  // degrees to hotSlope. Always weaker than the steam a rise produces, with two pumps or fewer, so hot fuel
  // never stops the loop: only rods and pumps do (owner, §5–§6). Very hot fuel just slows the rise.
  fuelBrakeMildSlope: 0.13, // points per degree in the normal range
  fuelBrakeHotSlope: 0.17, // points per degree once fuel is very hot
  fuelBrakeFirmsAt: 1300, // °
  fuelBrakeFirmWidth: 100, // °
  // Extra red card when very cold (restart lever, §9): coldCoeff·(coldBelow − F)².
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
  // (zero flow alone ≈ ×1.35, one pump ≈ ×1.16, three ≈ ×0.86, four ≈ ×0.74).
  steamFlowK: 0.15,
  // Boiling escalation as flow → 0 (§7): × (1 + esc·(1 − flow)²·((T − boil)/scale)³).
  // Sharp in temperature, so with no flow the danger arrives as the reactor heats, not instantly.
  boilingEscalation: 0.25,
  boilingEscalationScale: 500,

  // --- §8 Turbine-powered pumps ---
  turbineSteamPerPump: 35, // steam needed per pump the turbine can power
  turbineHysteresis: 0.25, // in pumps: supply holds until steam has clearly moved

  // --- §9 Xenon ---
  // Blue card. Its worth is derived: full xenon sits this many points below everything pushing up in a
  // cold reactor with rods out, so a poisoned reactor can always restart with rods (nearly) all out (§9).
  xenonCapBelowExcess: 33,
  xenonBuildBelow: 50,
  xenonBuildRate: 0.42, // %/s at radioactivity 0, scaled by how far below the build level
  xenonBurnAbove: 70,
  xenonBurnRate: 0.06, // %/s per unit of radioactivity above the burn level
} as const

// The brake's shape, measured from 0°: the integral of the per-degree slope above (a smooth step).
const softplus = (x: number) => (x > 30 ? x : Math.log1p(Math.exp(x)))
const fuelBrake = (F: number) => {
  const { fuelBrakeMildSlope: mild, fuelBrakeHotSlope: hot, fuelBrakeFirmsAt: at, fuelBrakeFirmWidth: w } = TUNING_BASE
  return mild * F + (hot - mild) * w * (softplus((F - at) / w) - softplus(-at / w))
}

// The fuel card (§6, §9): 0 at normal running temperature, plus the extra push when very cold.
const fuelEffect = (fuelTemp: number) => {
  const F = Math.max(0, fuelTemp)
  const veryCold = TUNING_BASE.fuelColdCoeff * Math.max(0, TUNING_BASE.fuelColdBelow - F) ** 2
  return veryCold - (fuelBrake(F) - fuelBrake(REFERENCE_STATE.fuelTemp))
}

const pumpEffect = (flow: number) => flow / (flow + TUNING_BASE.pumpFlowHalf)

function derive() {
  const r = REFERENCE_STATE
  const t = TUNING_BASE
  // Base excess reactivity of the fuel: makes the reference balance exactly zero (the fuel card is 0 there).
  const baseExcess = r.rodBoron - r.tipsIn * t.tipWorth - t.voidPerSteam * r.steam
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
  // Xenon points per 1% (the cap is 100%). Measured against base excess plus the push from fuel
  // fully cooled to 0° (not counting the extra very-cold push).
  const coldRodsOutPush = baseExcess + fuelBrake(r.fuelTemp)
  const xenonWorthPerPercent = (coldRodsOutPush - t.xenonCapBelowExcess) / 100
  return { baseExcess, fuelHeat, pumpTempCoeff, steamPerDegree, xenonWorthPerPercent }
}

const derived = derive()
export const TUNING = { ...TUNING_BASE, fuelHeatPerRadioactivity: derived.fuelHeat, ...derived }

export { fuelEffect, pumpEffect }
