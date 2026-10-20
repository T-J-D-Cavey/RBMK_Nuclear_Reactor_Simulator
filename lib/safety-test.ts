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
}

// If the reactor has collapsed by the time the test begins, the deputy orders every rod out to save the test.
export const RODS_OUT_BELOW = 35

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
    at: 964,
    role: "procedure",
    text: "Test begins. Station power to the pumps is cut: coasting turbine is powering the pumps.",
    action: "mains-off",
  },
  {
    at: 964,
    role: "deputy",
    text: "What have you done? You're choking my reactor! bring it back up, we are finishing this test.",
    action: "rods-out",
    onlyIf: (s) => s.radioactivity < RODS_OUT_BELOW,
  },
  // Phase 6: after the test (18–20 min). The test lasts 75 s (owner, 2026-10-20): long enough that a player who
  // does nothing loses the reactor, unless steam scraps the test first (TEST_SCRAPPED).
  {
    at: 1039,
    role: "procedure",
    text: "Test complete. Station power to the pumps is restored. No more orders: keep the reactor stable until end of shift",
    action: "mains-on",
  },
]

// If steam reaches its warning level while the test runs (after the cut, before "Test complete"), the test
// supervisor scraps it (owner, 2026-10-20), so the player knows they must act. It takes the place of "Test
// complete": the station's supply to the pumps comes back and no more script steps run.
export const TEST_SCRAPPED: ScriptStep = {
  at: 0, // not on the clock: triggered by steam
  role: "procedure",
  text: "Scrap test, AZ-5 and turn on all pumps asap!",
  action: "mains-on",
}
export const runningAway = (s: GameState) =>
  s.steamVolume >= THRESHOLDS.steamVolume.highWarning || s.radioactivity >= THRESHOLDS.radioactivity.highWarning
const MAINS_OFF_STEP = SAFETY_TEST_SCRIPT.findIndex((step) => step.action === "mains-off")
const MAINS_ON_STEP = SAFETY_TEST_SCRIPT.findIndex((step) => step.action === "mains-on")

// Run every script step that is due (each runs exactly once: scriptStep only moves forward).
export function runSafetyTest(state: GameState): GameState {
  const now = getShiftTime(state)
  let s = state
  let step = state.scriptStep
  while (step < SAFETY_TEST_SCRIPT.length && SAFETY_TEST_SCRIPT[step].at <= now) {
    s = runStep(s, SAFETY_TEST_SCRIPT[step], now)
    step++
  }
  const testRunning = step > MAINS_OFF_STEP && step <= MAINS_ON_STEP
  if (testRunning && runningAway(s)) {
    s = { ...runStep(s, TEST_SCRAPPED, now), testScrapped: true }
    step = MAINS_ON_STEP + 1
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
      return addLog(s, ROLES.pumps.source, "All four pumps switched on, as the procedure requires.", ROLES.pumps.from)
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
