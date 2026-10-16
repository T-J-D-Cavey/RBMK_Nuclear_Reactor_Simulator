// Every reactor-physics number lives here, plus (at the end, separately) the shift's events and power
// targets. Section numbers refer to ai/high-level-plan.md.
// Reactivity is counted in "points". Rods are measured in % of one rod's boron (bible §10.4), and each 1% is
// worth `rodWorth` points against the other cards.
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

// The game starts off balance (owner request, bible §5): rods 1–3 sit 12%, 6% and 4% further out than the
// reference, so radioactivity climbs from the start and the player soon feels they need to act. (Doubled
// from 6/3/2 when rods were halved in strength, plan §20, so the start is unchanged.)
const STARTING_OFFSETS = [12, 6, 4]
export const STARTING_RODS = REFERENCE_RODS.map((v, i) => v - (STARTING_OFFSETS[i] ?? 0))

const TUNING_BASE = {
  // --- Integration ---
  substeps: 20, // per 1 s tick

  // --- §5 Reactivity and radioactivity ---
  // Λ: dR/dt = R·ρ/Λ for a small balance: +10 points grows radioactivity ~3%/s. Slow like a real reactor's delayed
  // neutrons (owner, 2026-10-14; was 100), so a creep needs a balance big enough to show on Legasov's board, and the
  // random drift jitters half as much.
  generationTime: 300,
  // Beyond this balance (either way) the reactor goes "prompt": each point over it acts as if Λ were
  // promptGenerationTime, so big pushes (the graphite tips under AZ-5, rods yanked out) still act within seconds.
  // Ten points is one card on the board. A threshold of 5 or 8 points made the bot's shifts oscillate.
  promptAbove: 10,
  promptGenerationTime: 60,
  source: 0.05, // radioactivity/s that is always present, so it never sticks at zero
  maxRadioactivity: 50000,
  voidPerSteam: 0.6, // red card: points per unit of steam in the core (§16: proportional)
  noise: {
    sigma: 0.2, // points per √s
    tau: 60, // s: slow, correlated drift (stationary s.d. = sigma·√(tau/2) ≈ 1.1 points)
  },

  // --- §10 Control rods ---
  rodFullStrokeSeconds: 18,
  // Points per 1% of one rod's boron. Half the other cards' scale (owner, plan §20 step 7b): one rod moved 10%
  // shifts radioactivity by about a fifth at first, so a single small move is no longer decisive.
  rodWorth: 0.5,
  tipWorth: 10, // red card per rod whose tip is in the core, in % of boron (= the boron in the first 10% of travel)

  // --- §6 Fuel effect on reactivity (continuous curve) ---
  // Counted from normal running: 0 at the reference fuel temperature (a healthy reactor), blue when
  // hotter, red when cooler. Per degree it is mild up to about firmsAt, then firms up over ~firmWidth
  // degrees to hotSlope. Always weaker than the steam a rise produces, with two pumps or fewer, so hot fuel
  // never stops the loop: only rods and pumps do (owner, §5–§6). Very hot fuel just slows the rise.
  fuelBrakeMildSlope: 0.13, // points per degree in the normal range
  fuelBrakeHotSlope: 0.17, // points per degree once fuel is very hot
  fuelBrakeFirmsAt: 1300, // °
  fuelBrakeFirmWidth: 100, // °
  // Above about capAt the brake stops growing (owner, plan §20 step 7c): fuel hotter than this gives no extra
  // brake, so with rods pulled right out nothing slows the runaway and it ends in seconds, not in big swings.
  fuelBrakeCapAt: 2000, // °
  fuelBrakeCapWidth: 100, // °: the brake levels off smoothly over about this range
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
  // Flow changes steam per degree only between no flow and one pump (owner, §7): × exp(k·(1 − min(flow, 1))),
  // so 1 from one pump upwards and ≈ ×1.35 at zero flow. Extra pumps lower steam only by cooling the reactor.
  steamZeroFlowK: 0.3,
  // Boiling escalation as flow → 0 (§7): × (1 + esc·(1 − flow)²·((T − boil)/scale)³).
  // Sharp in temperature, so with no flow the danger arrives as the reactor heats, not instantly.
  boilingEscalation: 0.25,
  boilingEscalationScale: 500,

  // --- §8 Turbine-powered pumps ---
  // Steam needed per pump the turbine can power: all four from steam ≈106 (owner chose 25 over 20, because at
  // 20 or 22 an ignored Safety Test gets its pumps back too soon to run away; plan §20.3).
  turbineSteamPerPump: 25,
  turbineHysteresis: 0.25, // in pumps: supply holds until steam has clearly moved
  // With its steam shut off (the Safety Test), the turbine coasts: it starts with what its steam was powering
  // and runs down at four pumps' worth per this many seconds, whatever the steam (owner, plan §20 step 7b).
  turbineCoastSeconds: 45,

  // --- §9 Xenon ---
  // Blue card. Its worth is derived: full xenon sits this many points below everything pushing up in a
  // cold reactor with rods out, so a poisoned reactor can always restart with rods (nearly) all out (§9).
  xenonCapBelowExcess: 33,
  // One threshold (owner, plan §21 step 8b): at or below it xenon builds, faster the closer radioactivity is to
  // 0; above it xenon burns off, slowly just above, at a medium rate by 100, fast by 120 and fastest from 130.
  xenonTurnover: 80,
  xenonBuildRate: 0.3, // %/s at radioactivity 0, falling linearly to 0 at the turnover
  xenonBurnRate: 0.06, // %/s per unit of radioactivity above the turnover (1.2 %/s at 100)
  xenonBurnMax: 2.4, // %/s up to 120 (a full load in ~40 s)
  // Above 120 burn-off climbs steeply to this rate at xenonWipeAt, and stays there: a full load gone in ~10 s
  // (owner, 2026-10-15; was 33, ~3 s). Below the ~18 %/s that all ten rods driving in can cancel, so a surge
  // with xenon left can still be caught.
  xenonWipeFrom: 120,
  xenonWipeAt: 130,
  xenonWipeRate: 10,
} as const

// The brake's shape, measured from 0°: the integral of the per-degree slope above (a smooth step), levelling off
// at the cap (fuel temperature is smoothly limited to about capAt before the curve is applied).
const softplus = (x: number) => (x > 30 ? x : Math.log1p(Math.exp(x)))
const fuelBrake = (fuelTemp: number) => {
  const { fuelBrakeMildSlope: mild, fuelBrakeHotSlope: hot, fuelBrakeFirmsAt: at, fuelBrakeFirmWidth: w } = TUNING_BASE
  const { fuelBrakeCapAt: cap, fuelBrakeCapWidth: capWidth } = TUNING_BASE
  const F = cap - capWidth * softplus((cap - fuelTemp) / capWidth)
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
  const baseExcess = t.rodWorth * (r.rodBoron - r.tipsIn * t.tipWorth) - t.voidPerSteam * r.steam
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

// --- §12–§13 Shift events and power targets (not reactor physics: the engine never reads these) ---
// Times are seconds of shift time. Starting values from the bible, to tune in playtests (Checkpoint B).

type Range = readonly [number, number]

export interface ShiftEventTuning {
  majorCounts: readonly (readonly [count: number, weight: number])[] // power cuts and rod jams per shift (at most one of each)
  smallCounts: readonly (readonly [count: number, weight: number])[] // pump trips and grid hold requests
  firstMajorAfter: number // no major emergency in the first few minutes
  firstSmallAfter: number
  majorSpacing: number // at least this long between the starts of two major emergencies
  smallSpacing: number // smaller events keep this far from every other planned event
  lastStartBefore: number // nothing is planned to start this close to the end of the shift
  powerCutSeconds: Range
  rodJamRods: Range // rods a jam takes; jams are permanent (owner, 2026-10-16)
  pumpTripSeconds: Range
  gridHoldSeconds: Range
  targetRange: Range // MW
  targetMaxStep: number // largest single change, MW
  targetMinStep: number // smallest change worth announcing, MW
  targetInterval: Range // between two target changes taking effect
  lowTargetBelow: number // targets below this risk the xenon pit, so they are rarer (§13)
  lowTargetChance: number // chance a low target is kept when one is drawn
}

const EASY_EVENTS: ShiftEventTuning = {
  majorCounts: [[1, 1]], // one per 15-minute shift: a power cut or a rod jam (owner, 2026-10-16)
  smallCounts: [[1, 0.5], [2, 0.5]],
  firstMajorAfter: 180,
  firstSmallAfter: 120,
  majorSpacing: 240,
  smallSpacing: 150,
  lastStartBefore: 90,
  powerCutSeconds: [20, 45],
  rodJamRods: [2, 3],
  pumpTripSeconds: [60, 90],
  gridHoldSeconds: [90, 150],
  targetRange: [2000, 8000],
  targetMaxStep: 1500,
  targetMinStep: 500,
  targetInterval: [240, 300],
  lowTargetBelow: 3000,
  lowTargetChance: 0.3,
}

const HARD_EVENTS: ShiftEventTuning = {
  majorCounts: [[2, 1]], // one power cut and one rod jam per 30-minute shift (owner, 2026-10-16)
  smallCounts: [[4, 0.5], [5, 0.5]], // one more than before majors were capped, to keep the workload up
  firstMajorAfter: 180,
  firstSmallAfter: 120,
  majorSpacing: 240,
  smallSpacing: 150,
  lastStartBefore: 90,
  powerCutSeconds: [30, 60],
  rodJamRods: [3, 4],
  pumpTripSeconds: [60, 120],
  gridHoldSeconds: [120, 180],
  targetRange: [500, 10000],
  targetMaxStep: 2500,
  targetMinStep: 500,
  targetInterval: [120, 180],
  lowTargetBelow: 2000,
  lowTargetChance: 0.3,
}

export const EVENT_TUNING = {
  easy: EASY_EVENTS,
  hard: HARD_EVENTS,
  targetNotice: 60, // the grid announces a target change this long before it takes effect (§13)
  eventGap: 20, // an event due while another is running waits until this long after it ends
  holdAfterTargetChange: 90, // a hold request waits this long after a target change, so the player can settle
  warningLead: { "power-cut": 40, "rod-stuck": 25 } as Partial<Record<string, number>>, // advance warning (§12)
  turbineTripSeconds: 20, // sustained over-pressure (OVR-P lamp) while on the grid trips the turbine (§12)
  // A rod sent in from 0% while steam is high jams with only its graphite tip in the core, as the rods did when AZ-5
  // was pressed on 26 April 1986 (owner, 2026-10-16). Permanent, like an event jam.
  steamJamInsertion: 1, // %
}
