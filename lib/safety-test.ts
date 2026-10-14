// The Safety Test (bible §14): a scripted 20-minute recreation of the night of the Unit 4 turbine rundown
// test. Same reactor physics as every mode. The script only sends orders, sets targets (with the usual
// notice) and makes the automated control changes the procedure calls for. Each automated change happens
// once and is announced as it happens; the player can reverse it and the script never undoes that.
// No random events: every disruption is scripted.
import { type GameState, type LogSource, getShiftTime } from "./types"
import { addLog } from "./game-utils"
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

// Targets follow the physics: with two pumps, xenon creeps up below radioactivity 80 (output below ~3,700 MW)
// and builds faster the lower it is. Output takes a minute or two to follow radioactivity, so each target is in
// force for about two minutes, in steps of about a third (owner, 2026-10-14: never below 700 MW). Kiev's hold
// (1,500 MW) builds xenon steadily; the test band (1,000 → 700 MW) builds it faster, so that raising output
// back to 1,000 MW for the test takes the rod margin below its minimum.
export const SAFETY_TEST_SCRIPT: ScriptStep[] = [
  // Phase 1: briefing and power reduction (00–04 min)
  {
    at: 0,
    role: "procedure",
    text: "Unit 4 turbine rundown test about to start. Follow the procedure step by step.",
  },
  {
    at: 15,
    role: "deputy",
    text: "Let's get ready for power reduction. I'll want it brought down to 3,500 MW shortly. Don't mess this up!",
    target: 3500,
  },
  {
    at: 135,
    role: "deputy",
    text: "Get on with it! 2,500 MW next",
    target: 2500,
  },
  // Phase 2: Kiev's delay (04–08 min)
  {
    at: 255,
    role: "kiev",
    text: "We have orders to delay your safety test until the evening peak has passed. We'll need you to stay on the grid at low power and hold it till we confirm.",
    target: 1500,
  },
  {
    at: 345,
    role: "deputy",
    text: "Bunch of amateurs. Get it done!",
  },
  {
    at: 430,
    role: "deputy",
    text: "I want this done already!",
  },
  // Phase 3: shift change and reduction to the test output (08–12 min)
  {
    at: 480,
    role: "foreman",
    text: "Shift change: the night shift is on duty. Get them up to speed on the test's progress.",
  },
  {
    at: 495,
    role: "deputy",
    text: "Bring it down to 1,000 MW for the test.",
    target: 1000,
  },
  {
    at: 615,
    role: "deputy",
    text: "Lower. 700 MW.",
    target: 700,
  },
  // Phase 4: "Raise the power." (12–15 min)
  {
    at: 720,
    role: "deputy",
    text: "This is taking too long. We're running the test tonight or you're toast.",
    target: 1000,
  },
  {
    at: 840,
    role: "srce",
    text: "Watch the rod margin. Regulations say that below the minimum we must shut the reactor down.",
  },
  {
    at: 855,
    role: "deputy",
    text: "No. Another three months waiting for this test? Hold 1,000 MW. We run the test tonight.",
  },
  // Phase 5: the test (15–18 min), with 4 minutes left. The clock reads 01:23:04 as the test begins, as it did on the night.
  {
    at: 900,
    role: "procedure",
    text: "Test step 1: start all four main circulation pumps.",
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
    text: "Test begins. Station power to the pumps is cut: the coasting turbine is now their only supply. Keep the reactor under control.",
    action: "mains-off",
  },
  {
    at: 964,
    role: "deputy",
    text: "Radioactivity's collapsed! Pull out every rod that's left, all of them, now! We are finishing this test.",
    action: "rods-out",
    onlyIf: (s) => s.radioactivity < RODS_OUT_BELOW,
  },
  // Phase 6: after the test (18–20 min)
  {
    at: 1080,
    role: "procedure",
    text: "Test complete. Station power to the pumps is restored. No more orders: keep the reactor stable until the shift ends at 01:27.",
    action: "mains-on",
  },
]

// Run every script step that is due (each runs exactly once: scriptStep only moves forward).
export function runSafetyTest(state: GameState): GameState {
  const now = getShiftTime(state)
  let s = state
  let step = state.scriptStep
  while (step < SAFETY_TEST_SCRIPT.length && SAFETY_TEST_SCRIPT[step].at <= now) {
    s = runStep(s, SAFETY_TEST_SCRIPT[step], now)
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
      return addLog(s, ROLES.pumps.source, "All four pumps switched on, as the procedure requires.", ROLES.pumps.from)
    case "turbine-to-pumps":
      s = { ...s, turbineMode: "pumps", turbineConnected: false }
      return addLog(
        s,
        ROLES.turbine.source,
        "Turbine disconnected from the grid and supplying the station pumps, as the test requires.",
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
