// The Safety Test (bible §14): a scripted 20-minute recreation of the night of the Unit 4 turbine rundown
// test. Same reactor physics as every mode. The script only sends orders, sets targets (with the usual
// notice) and makes the automated control changes the procedure calls for. Each automated change happens
// once and is announced as it happens; the player can reverse it and the script never undoes that.
// No random events: every disruption is scripted.
import { type GameState, type LogSource, THRESHOLDS, getShiftTime } from "./types"
import { FIRST_LOG_AT, addLog } from "./game-utils"
import { EVENT_TUNING } from "./sim/tuning"
import { turbineCoastStart } from "./sim/reactor"

// Every message comes from a person (owner, 2026-10-12), so the procedure is read out by a test supervisor and
// the automated changes are reported by the crew who make them. Kiev keeps its name here: it is the night of the
// real test (bible §14), whereas Easy and Hard have a plain "GRID CONTROLLER".
const ROLES = {
  procedure: { source: "procedure", from: "TEST SUPERVISOR" },
  deputy: { source: "engineer", from: "DEPUTY CHIEF ENGINEER" },
  kiev: { source: "grid", from: "GRID CONTROLLER" },
  foreman: { source: "engineer", from: "SHIFT FOREMAN" },
  srce: { source: "engineer", from: "SENIOR REACTOR CONTROL ENGINEER" },
  pumps: { source: "engineer", from: "PUMP OPERATOR" },
  turbine: { source: "engineer", from: "TURBINE OPERATOR" },
} satisfies Record<string, { source: LogSource; from: string }>

type Action = "pumps-on" | "turbine-to-pumps" | "mains-off" | "rods-out" | "mains-on"

interface ScriptStep {
  at: number // shift time (s). The night clock reads 01:07:00 + at.
  role: keyof typeof ROLES
  text: string
  target?: number | null // announce a target change (usual notice), or null: no grid target from now on
  action?: Action
  onlyIf?: (s: GameState) => boolean // a conditional step: checked when it is due, and skipped for good if false
  waitsUntil?: number // with onlyIf: instead of being skipped, the step waits for its condition until this time
  givesUpIf?: (s: GameState) => boolean // with waitsUntil: the step stops waiting, skipped for good, once this holds
}

// The reactor is starting to run away: the high-radioactivity warning, which comes 16–28 s before the reactor is
// lost when the test is ignored, or the steam warning (only 2–4 s before, so a backstop).
export const runningAway = (s: GameState) =>
  s.steamVolume >= THRESHOLDS.steamVolume.highWarning || s.radioactivity >= THRESHOLDS.radioactivity.highWarning
export const AZ5_ORDER = "Engage all control rods. AZ-5 now."

// The test begins as the clock reads 01:23:04, as it did on the night, and lasts 120 s (owner, 2026-10-21; was
// 75 s): long enough that even a slow creep from low radioactivity runs away if the player does nothing.
export const TEST_STARTS = 964
export const TEST_ENDS = TEST_STARTS + 120

// If radioactivity falls below this at any point in the test, the deputy orders every rod out to save it (owner,
// 2026-10-21; was only at the start, below 35). Steering the test gently down is no escape: the player has to
// handle a real surge with the pumps running down.
export const RODS_OUT_BELOW = 50

// The deputy stands down for good once the reactor is running away (the AZ-5 order then follows), so he never
// overrules an AZ-5 the crew ordered. An AZ-5 pressed while nothing showed danger is no way out (owner,
// 2026-10-21): radioactivity falls below 50 and he pulls those rods out too.
const deputyStandsDown = runningAway

// Targets follow the physics: xenon creeps up below radioactivity 80 and builds faster the lower it is. That is
// below ~3,700 MW with two pumps but only ~2,100 MW with four, so pumps decide who falls into the pit (owner,
// 2026-10-16: 5,000 → 3,000 → 2,000, Kiev's hold at 2,000, then 1,500 for the test). On two pumps the hold and
// the test output build xenon to ~100% and take the rod margin below its minimum; a player running four pumps
// holds 2,000 MW with almost no xenon and reaches the test with about 30%.
export const SAFETY_TEST_SCRIPT: ScriptStep[] = [
  // Phase 1: briefing and power reduction (00–04 min)
  {
    at: FIRST_LOG_AT,
    role: "procedure",
    text: "Unit 4 turbine rundown test about to start. Follow the procedure step by step.",
  },
  {
    at: 15,
    role: "deputy",
    text: "Let's get ready for power reduction. I'll want it brought down to 3,000 MW shortly. Don't mess this up!",
    target: 3000,
  },
  {
    at: 135,
    role: "deputy",
    text: "Get on with it! 2,000 MW next",
    target: 2000,
  },
  // Phase 2: Kiev's delay (04–08 min)
  {
    at: 255,
    role: "kiev",
    text: "We have orders to delay your safety test until peak demand has passed. We'll need you to stay on the grid at current power and hold it till we confirm.",
  },
  // {
  //   at: 345,
  //   role: "deputy",
  //   text: "Bunch of amateurs. Get it done!",
  // },
  // {
  //   at: 430,
  //   role: "deputy",
  //   text: "I want this done already!",
  // },
  // Phase 3: shift change, Kiev's release and reduction to the test output (08–12 min)
  {
    at: 300,
    role: "foreman",
    text: "Shift change: the night shift is on duty. Get them up to speed on the test instructions. Some instructions are crossed out. Not sure if they are to be included.",
  },
  {
    at: 490,
    role: "kiev",
    text: "Grid demand has dropped. You may now proceed with your test.",
  },
  {
    at: 505,
    role: "deputy",
    text: "We've been cleared to run the test. Now is it too much to ask that you all know what you're doing? Bring it down to 1,500 MW",
    target: 1500,
  },
  {
    at: 700,
    role: "deputy",
    text: "You should have finished by now. Bunch of amatuers!",
  },
  {
    at: 800,
    role: "srce",
    text: "We've been at low power for too long. We should stop.",
  },
  {
    at: 815,
    role: "deputy",
    text: "Never mind that. Hold 1,500 MW. We run the test tonight.",
  },
    {
    at: 870,
    role: "deputy",
    text: "Right we're doing the test. Get ready everyone",
  },
  // Phase 5: the test (15–18 min), with 4 minutes left. The clock reads 01:23:04 as the test begins, as it did on the night.
  {
    at: 900,
    role: "procedure",
    text: "Test step 1: Turn on all remaining circulation pumps.",
    action: "pumps-on",
  },
  {
    at: 930,
    role: "procedure",
    text: "Test step 2: switch the turbine to power the pumps.",
    target: null,
    action: "turbine-to-pumps",
  },
  {
    at: TEST_STARTS,
    role: "procedure",
    text: "Test begins. Station power to the pumps is cut: coasting turbine is powering the pumps.",
    action: "mains-off",
  },
  // The deputy watches the whole test, and orders the rods out once if radioactivity falls below 50.
  {
    at: TEST_STARTS,
    role: "deputy",
    text: "What have you done? You're choking my reactor! bring it back up, we are finishing this test.",
    action: "rods-out",
    onlyIf: (s) => s.radioactivity < RODS_OUT_BELOW && !deputyStandsDown(s),
    waitsUntil: TEST_ENDS,
    givesUpIf: deputyStandsDown,
  },
  // If the reactor starts to run away during the test, the senior reactor control engineer orders AZ-5, in a
  // hurry (owner, 2026-10-20). Advice only: the test carries on, and the pumps stay on the coasting turbine.
  {
    at: TEST_STARTS,
    role: "srce",
    text: AZ5_ORDER,
    onlyIf: runningAway,
    waitsUntil: TEST_ENDS,
  },
  // Phase 6: after the test (18–20 min). Surviving the test, by any use of the rods, completes it.
  {
    at: TEST_ENDS,
    role: "procedure",
    text: "Test complete. Station power to the pumps is restored. No more orders: keep the reactor stable until end of shift",
    action: "mains-on",
  },
]

// Run every script step that is due (each runs exactly once: scriptStep only moves forward). A waiting step holds
// back the steps after it until its condition holds, it gives up, or its wait is over.
export function runSafetyTest(state: GameState): GameState {
  const now = getShiftTime(state)
  let s = state
  let step = state.scriptStep
  while (step < SAFETY_TEST_SCRIPT.length && SAFETY_TEST_SCRIPT[step].at <= now) {
    const next = SAFETY_TEST_SCRIPT[step]
    if (next.waitsUntil !== undefined && now < next.waitsUntil && !next.onlyIf?.(s) && !next.givesUpIf?.(s)) break
    s = runStep(s, next, now)
    step++
  }
  return step === state.scriptStep ? s : { ...s, scriptStep: step }
}

function runStep(state: GameState, step: ScriptStep, now: number): GameState {
  if (step.onlyIf && !step.onlyIf(state)) return state
  const role = ROLES[step.role]
  let s = addLog(state, role.source, step.text, role.from)
  if (step.target === null) {
    s = { ...s, powerTarget: null, pendingTarget: null }
  } else if (step.target !== undefined) {
    // The test supervisor confirms the station's own orders when they take effect (owner); Kiev confirms its own.
    const confirm = step.role === "kiev" ? role : ROLES.procedure
    s = { ...s, pendingTarget: { target: step.target, at: now + EVENT_TUNING.targetNotice, source: confirm.source, from: confirm.from } }
  }
  switch (step.action) {
    case "pumps-on":
      s = { ...s, waterPumps: s.waterPumps.map((p) => ({ ...p, on: true })) }
      return addLog(s, ROLES.pumps.source, "All remaining pumps switched on.", ROLES.pumps.from)
    case "turbine-to-pumps":
      s = { ...s, turbineMode: "pumps", turbineConnected: false }
      return addLog(
        s,
        ROLES.turbine.source,
        "Turbine disconnected from the grid and supplying the station pumps.",
        ROLES.turbine.from,
      )
    case "mains-off":
      // The test itself: steam to the turbine is shut off, so it coasts down while it powers the pumps.
      return { ...s, mainsPower: false, turbineCoast: turbineCoastStart(s.steamVolume) }
    case "rods-out":
      // Jammed rods stay where they are (bible §10.3); the rest travel out at the usual drive speed.
      s = { ...s, controlRods: s.controlRods.map((r) => (r.stuck ? r : { ...r, target: 0 })) }
      return addLog(s, ROLES.srce.source, "Withdrawing all control rods to 0%, on the Deputy Chief Engineer's order.", ROLES.srce.from)
    case "mains-on":
      return { ...s, mainsPower: true, turbineCoast: null }
    default:
      return s
  }
}
