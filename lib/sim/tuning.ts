// Every reactor-physics number lives here, plus (at the end, separately) the shift's events and power
// targets. Section numbers refer to ai/high-level-plan.md.
// Reactivity is counted in "points". Rods are measured in % of one rod's boron (bible §10.4), and each 1% is
// worth `rodWorth` points against the other cards.
// This file must not import anything (lib/types.ts imports it).

// The balanced reference state: exactly steady with these rods and two pumps. The engine is calibrated here.
// Constants marked "derived" below are solved from this state so it stays balanced when others change. The rods mirror
// each other left and right, so the core is level (MAINTENANCE_TUNING's rod balance).
const REFERENCE_RODS = [40, 55, 40, 40, 55, 55, 40, 40, 55, 40]
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

// The game starts off balance (owner request, bible §5): 22% of rod further out than the reference, so radioactivity
// climbs from the start and the player soon feels they need to act. The rod balance starts a little off centre to the
// right, a small job the player can do straight away (owner, 2026-11-04). Each side holds 219%, so the lean has no
// effect on the boron that counts, and the opening climb is exactly what it was before the balance existed: only the
// edge rods' share of each side leans it. All ten tips are in.
export const STARTING_RODS = [28, 49, 40, 44, 58, 38, 38, 38, 60, 45]

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
  // Events (owner, 2026-11-03): a few different kinds (every kind on Hard) plus a few of any kind drawn at random, in
  // a random order at random times, never two at once and never closer than EVENT_TUNING.minEventGap. Hard's are longer.
  differentKinds: number // this many of the four kinds, once each: power cut, signal loss, pump trip, rod jam
  extraEvents: number // more, each of any kind
  firstEventAfter: number // no event starts before this; the last ends by the end of the shift (owner, 2026-11-02)
  lastNoticeBefore: number // no target change is announced this close to the end of the shift
  powerCutSeconds: Range
  signalLossSeconds: Range // the reactor hall's readings are dark this long (owner, 2026-10-30)
  rodJamRods: Range // rods a jam takes
  rodJamSeconds: Range // a jam frees again after this long (owner, 2026-10-30; permanent from 2026-10-16)
  pumpTripSeconds: Range

  // Target changes (owner, 2026-11-02): their own track, alongside the events. The next notice comes once the player
  // has been on target for the settle time, so a target never moves just as it is reached, and never sits for long.
  firstNotice: Range // when the shift's first notice comes; it is always a plain change
  settleSeconds: Range // on target without a break this long before the next notice
  giveUpSeconds: number // a target not reached by then is moved on anyway; the clock stops in a power cut or signal loss
  targetRange: Range // MW
  targetMaxStep: number // largest single change, MW
  targetMinStep: number // smallest change worth announcing, MW
}

const EASY_EVENTS: ShiftEventTuning = {
  differentKinds: 3,
  extraEvents: 0, // 3 in 15 minutes, never the same kind twice (owner, 2026-11-03)
  firstEventAfter: 60,
  lastNoticeBefore: 120,
  powerCutSeconds: [20, 45],
  signalLossSeconds: [45, 75],
  rodJamRods: [3, 4],
  rodJamSeconds: [60, 120],
  pumpTripSeconds: [60, 90],

  firstNotice: [30, 60],
  settleSeconds: [20, 40], // owner, 2026-11-06 (was 10–30)
  giveUpSeconds: 180, // owner, 2026-11-03 (was 240)
  // Big swings are the heart of the game (owner, 2026-11-03): a wider range and bigger steps, every target as likely
  targetRange: [1000, 10000],
  targetMaxStep: 2000, // owner, 2026-11-06 (was 3,000)
  targetMinStep: 750,
}

const HARD_EVENTS: ShiftEventTuning = {
  differentKinds: 4,
  extraEvents: 0, // 4 in 30 minutes: one of each kind (owner, 2026-11-06; was two more)
  firstEventAfter: 60,
  lastNoticeBefore: 120,
  powerCutSeconds: [45, 75],
  signalLossSeconds: [75, 120],
  rodJamRods: [4, 5],
  rodJamSeconds: [90, 180],
  pumpTripSeconds: [60, 120],

  firstNotice: [20, 40],
  settleSeconds: [10, 30], // owner, 2026-11-04 (was 30–60)
  giveUpSeconds: 180, // owner, 2026-11-03 (was 240)
  // At 12,000 MW (steam 240) radioactivity swings by hundreds every minute however it is steered (bot, 2026-11-03)
  targetRange: [300, 11000],
  targetMaxStep: 4000,
  targetMinStep: 1000,
}

// The machines' maintenance jobs (ai/machine-maintenance-plan.md). Starting values, for tuning at playtest.
export const MAINTENANCE_TUNING = {
  // Both drifts: about 1.5 jobs each in an Easy shift, and left alone they reach their limits 90 s apart, so their two
  // shift log messages don't arrive together (owner, 2026-11-05)
  vacuumFallSeconds: 555, // full vacuum to worst, in a straight line, in every turbine mode (§3)
  vacuumOutputLoss: 0.12, // of output, at worst vacuum
  ejectorRecoverySeconds: 20, // back to full vacuum from any reading
  rodParkSeconds: 300, // a rod left parked this long can go slow (§5, owner, 2026-11-05)
  rodSlowCheckSeconds: 60, // from then on it may go, this often
  rodSlowChance: 0.5, // the odds each time
  rodFreeingMove: 1, // % from where it was parked, in or out: this much counts as moving it, and restarts its clock
  slowRodSpeed: 0.6, // of normal speed: a full stroke in 30 s, not 18 s
  edgeRods: [1, 2, 9, 10] as readonly number[], // far from the core's centre line, so they can tilt it most (§6)
  middleRodPull: 0.4, // of an edge rod's pull on the balance needle
  balanceFullTravel: 100, // weighted % of difference between the sides that puts the needle hard over
  balanceEffect: 0.15, // with the needle hard over, the heavy side counts this much less and the light side more
  pumpDriftSeconds: 645, // the pump needle, centre to limit (§4)
  pumpTransferLoss: 0.1, // fuel-to-reactor heat transfer lost at the limit (owner, 2026-11-05; was 0.2: it set the size of the balancer's kick). Never a cut in cooling: that makes more steam, so more output (§10)
  balancerLockSeconds: 8, // the pump switches don't act, and flow dips, for this long
  balancerFlowDip: 0.1, // of the pumps' cooling, during the lock
  balancerGlideSeconds: 25, // then the needle glides back to centre
}

export const EVENT_TUNING = {
  easy: EASY_EVENTS,
  hard: HARD_EVENTS,
  minEventGap: 70, // seconds from the end of one event to the start of the next, at the least (owner, 2026-11-03)
  targetNotice: 60, // a target change is announced this long before it takes effect (§13)
  unit1TestTarget: 12000, // MW: above any normal target in either mode, so it reads as out of the ordinary (owner, 2026-11-06)
  // Advance warning in the shift log (§12); a pump trip comes unannounced
  warningLead: { "power-cut": 40, "signal-loss": 30, "rod-stuck": 25 } as Partial<Record<string, number>>,
  turbineTripSeconds: 5, // sustained over-pressure (OVR-P lamp) while on the grid trips the turbine (§12; owner, 2026-11-06, was 20)
  // A rod sent in from 0% while steam is high jams with only its graphite tip in the core, as the rods did when AZ-5
  // was pressed on 26 April 1986 (owner, 2026-10-16). Permanent, unlike an event jam.
  steamJamInsertion: 1, // %
  hotFuelJamSeconds: [30, 60] as Range, // how long fuel reaching its high warning jams the slow rods (owner, 2026-11-06)
}
