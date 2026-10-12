// The Safety Test (bible §14): a scripted 30-minute recreation of the night of the Unit 4 turbine rundown
// test. Same reactor physics as every mode. The script only sends orders, sets targets (with the usual
// notice) and makes the automated control changes the procedure calls for. Each automated change happens
// once and is announced as it happens; the player can reverse it and the script never undoes that.
// No random events: every disruption is scripted.
import { type GameState, type LogSource, getShiftTime } from "./types"
import { addLog } from "./game-utils"
import { EVENT_TUNING } from "./sim/tuning"

export const SAFETY_TEST_PHASES: Record<number, string> = {
  1: "Briefing and power reduction",
  2: "Kiev's delay",
  3: "Shift change: reduction to test output",
  4: "Raise the power",
  5: "The test",
  6: "After the test",
}

// Every message comes from a person (owner, 2026-10-12), so the procedure is read out by a test supervisor and
// the automated changes are reported by the crew who make them. Kiev keeps its name here: it is the night of the
// real test (bible §14), whereas Easy and Hard have a plain "GRID CONTROLLER".
const ROLES = {
  procedure: { source: "procedure", from: "TEST SUPERVISOR" },
  deputy: { source: "engineer", from: "DEPUTY CHIEF ENGINEER" },
  kiev: { source: "grid", from: "KIEV GRID CONTROLLER" },
  foreman: { source: "engineer", from: "SHIFT FOREMAN" },
  srce: { source: "engineer", from: "SENIOR REACTOR CONTROL ENGINEER" },
  pumps: { source: "engineer", from: "PUMP OPERATOR" },
  turbine: { source: "engineer", from: "TURBINE OPERATOR" },
} satisfies Record<string, { source: LogSource; from: string }>

type Action = "pumps-on" | "turbine-to-pumps" | "mains-off" | "mains-on"

interface ScriptStep {
  at: number // shift time (s). The night clock reads 01:00:00 + at.
  role: keyof typeof ROLES
  text: string
  phase?: number // this step opens a new phase
  order?: string // the standing order shown above the log from now on
  target?: number | null // announce a target change (usual notice), or null: no grid target from now on
  action?: Action
}

// Targets follow the physics: with two pumps, xenon builds once radioactivity is below ~50, i.e. output
// below ~1,550 MW. Kiev's hold (~1,000 MW) builds it slowly; the test band (700 → 500 MW) builds it fast,
// so that raising output to 1,000 MW for the test takes the rod margin below its minimum.
export const SAFETY_TEST_SCRIPT: ScriptStep[] = [
  // Phase 1: briefing and power reduction (00–03 min)
  {
    at: 0,
    phase: 1,
    role: "procedure",
    text: "Unit 4 turbine rundown test. When the turbine's steam is shut off, can it keep the cooling pumps running while it coasts down, for the minute before the diesel generators start? Follow the procedure step by step.",
  },
  {
    at: 15,
    role: "deputy",
    text: "Begin the power reduction. Bring output down to 3,500 MW.",
    order: "Reduce output to about half: 3,500 MW, then 2,500 MW.",
    target: 3500,
  },
  {
    at: 100,
    role: "deputy",
    text: "Keep going. 2,500 MW, half power.",
    order: "Reduce output to 2,500 MW (half power).",
    target: 2500,
  },
  // Phase 2: Kiev's delay (03–10 min)
  {
    at: 180,
    phase: 2,
    role: "kiev",
    text: "Kiev to Unit 4: you may not start the test until the evening peak has passed. Stay on the grid at 1,000 MW and hold it there until we release you.",
    order: "Hold 1,000 MW until Kiev releases the unit.",
    target: 1000,
  },
  {
    at: 330,
    role: "srce",
    text: "At this level xenon builds up in the core. Radioactivity will sag: we will have to draw rods to hold output.",
  },
  {
    at: 480,
    role: "foreman",
    text: "Xenon is still climbing. Keep drawing rods to hold 1,000 MW, and watch the rod margin.",
  },
  // Phase 3: shift change and reduction to the test output (10–16 min)
  {
    at: 600,
    phase: 3,
    role: "foreman",
    text: "Shift change: the night shift is on duty. Kiev has released the unit. Continue the reduction to the test level.",
  },
  {
    at: 615,
    role: "deputy",
    text: "Bring it down to 700 MW for the test.",
    order: "Reduce output to 700 MW.",
    target: 700,
  },
  {
    at: 780,
    role: "deputy",
    text: "Lower. 500 MW.",
    order: "Reduce output to 500 MW.",
    target: 500,
  },
  {
    at: 870,
    role: "srce",
    text: "Xenon is near its peak. Radioactivity will keep falling unless rods come out.",
  },
  // Phase 4: "Raise the power." (16–22 min)
  {
    at: 960,
    phase: 4,
    role: "deputy",
    text: "This is taking too long. Raise the power to 1,000 MW: the test needs it. Pull rods if you have to.",
    order: "Raise output to 1,000 MW for the test.",
    target: 1000,
  },
  {
    at: 1110,
    role: "srce",
    text: "Watch the rod margin. Regulations say that below the minimum we must shut the reactor down.",
  },
  {
    at: 1125,
    role: "deputy",
    text: "No. Another three months waiting for this test? Hold 1,000 MW. We run the test tonight.",
  },
  // Phase 5: the test (22–25 min). The clock reads 01:23:04 as the test begins.
  {
    at: 1320,
    phase: 5,
    role: "procedure",
    text: "Test step 1: start all four main circulation pumps.",
    order: "Test preparations: all four pumps on, then the turbine to the pumps.",
    action: "pumps-on",
  },
  {
    at: 1350,
    role: "procedure",
    text: "Test step 2: switch the turbine to power the pumps.",
    target: null,
    action: "turbine-to-pumps",
  },
  {
    at: 1384,
    role: "procedure",
    text: "Test begins. Station power to the pumps is cut: the coasting turbine is now their only supply.",
    order: "Test in progress: only the turbine powers the pumps. Keep the reactor under control.",
    action: "mains-off",
  },
  // Phase 6: after the test (25–30 min)
  {
    at: 1500,
    phase: 6,
    role: "procedure",
    text: "Test complete. Station power to the pumps is restored.",
    order: "No more orders. Keep the reactor safe until the shift ends at 01:30.",
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
  const role = ROLES[step.role]
  let s = addLog(state, role.source, step.text, role.from)
  if (step.target === null) {
    s = { ...s, powerTarget: null, pendingTarget: null }
  } else if (step.target !== undefined) {
    s = { ...s, pendingTarget: { target: step.target, at: now + EVENT_TUNING.targetNotice, source: role.source, from: role.from } }
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
        "Turbine disconnected from the grid and supplying the station pumps, as the procedure requires. No grid target from now on.",
        ROLES.turbine.from,
      )
    case "mains-off":
      return { ...s, mainsPower: false }
    case "mains-on":
      return { ...s, mainsPower: true }
    default:
      return s
  }
}

// What the procedure log's header shows above the paper: the current phase and the standing order.
export function getSafetyTestStatus(state: Pick<GameState, "scriptStep">): { phase: number; name: string; order: string | null } {
  const done = SAFETY_TEST_SCRIPT.slice(0, Math.max(1, state.scriptStep))
  const phase = [...done].reverse().find((step) => step.phase)?.phase ?? 1
  const order = [...done].reverse().find((step) => step.order)?.order ?? null
  return { phase, name: SAFETY_TEST_PHASES[phase], order }
}
