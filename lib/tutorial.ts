// The control-room briefing at the start of every game (owner, 2026-10-29): the shift foreman, Aleksandr Akimov (the
// same SHIFT FOREMAN who signs the shift log), walks the player round
// the desk, each reading followed by the control that moves it. A step lights every element on the game page marked
// data-tutorial="<target>". Pure, so the order and the guide's placement can be checked without a browser.
import type { GameMode } from "./types"

// Set by the home page when a game starts; the game page shows the briefing while it is set, paused at second zero
export const TUTORIAL_KEY = "rbmk-briefing-due"

export interface TutorialStep {
  id: string
  title: string
  text: string
  targets: string[]
  merge?: boolean // one frame round all the targets, rather than one each
  atTop?: boolean // the hand-over: back at the top of the page, so Begin shift moves nothing (owner, 2026-10-29)
}

const step = (id: string, title: string, text: string, targets: string[] = [], merge = false): TutorialStep => ({ id, title, text, targets, merge })

export function tutorialSteps(mode: GameMode): TutorialStep[] {
  const free = mode === "free"
  const test = mode === "safety_test"
  return [
    step(
      "welcome",
      "Welcome to Unit 4",
      test
        ? "I'm Aleksandr Akimov, shift foreman. Tonight is the safety test. Before it starts I'll walk you round the desk; the previous shift will keep things steady till we're done. Close me any time if you know the panel."
        : "I'm Aleksandr Akimov, shift foreman. Before your shift starts I'll walk you round the desk; the previous shift will keep things steady till we're done. Close me any time if you know the panel.",
    ),
    step(
      "radioactivity",
      "Radioactivity",
      "How hard the core is working. Everything you do is about keeping this steady: above 350 is dangerous, and below 50 xenon starts to poison the core.",
      ["radioactivity"],
    ),
    step(
      "rods",
      "Control rods",
      "Your brakes. Push rods in and radioactivity falls; pull them out and it climbs. They take a few seconds to travel, so make small moves and wait.",
      ["rods"],
    ),
    step(
      "temperature",
      "Reactor & fuel temperature",
      "The heat in the core: alarms at 800°, meltdown at 1,200°. Beside it, the fuel: hot fuel slows the reaction, and very cold fuel speeds it up.",
      ["reactor-temp", "fuel-temp"],
      true,
    ),
    step(
      "pumps",
      "Water pumps",
      "Pumps carry the heat away. More pumps keep the core cooler but make less steam, so you need more radioactivity for the same power.",
      ["pumps"],
    ),
    step(
      "steam",
      "Steam",
      "Boiling water becomes steam, and steam makes power. But in this reactor more steam speeds the reaction up. Above 300 you're in trouble.",
      ["steam"],
    ),
    step(
      "turbine",
      "Turbine",
      "Steam spins the turbine, power output is based on steam volume when the turbine is connected to the grid. If incoming mains power fails, switch the turbine to power the pumps to keep the water flowing.",
      ["turbine"],
    ),
    step(
      "power",
      free ? "Power output" : "Power output & target",
      free
        ? "Green is the power you're sending to the grid. In Free mode there's no target, so try different outputs and watch how the reactor answers."
        : test
          ? "Output is what you're sending; target is what you've been ordered to produce. Stay within 10% of the target or output changes to red and performance drops."
          : "Output is what you're sending; target is what the grid needs. Stay within 10% of the target or output changes to red and performance drops.",
      ["power"],
    ),
    // Free mode has no target, so performance never moves
    ...(free
      ? []
      : [
          step(
            "performance",
            "Performance",
            "It rises while you're on target and falls while you're off it. If it reaches zero, you're relieved of your post.",
            ["performance"],
          ),
        ]),
    step(
      "time",
      "Shift clock",
      free
        ? "How long you've been on shift. In Free mode there's no time limit."
        : test
          ? "Time left on tonight's shift. Follow the orders and keep the reactor together until it runs out."
          : "Time left on your shift. Keep the reactor safe and on target until it runs out.",
      ["time"],
    ),
    step(
      "xenon",
      "Xenon",
      "Xenon builds up while radioactivity is below 80 and it burns off when radioactivity is above 80. It acts as a brake on radioactivity but it can quickly burn off, so make sure you have another brake in place when it does",
      ["xenon"],
    ),
    step(
      "messages",
      "Alarm monitor & shift log",
      "Warnings appear on the alarm monitor; orders and news print on the shift log. The Warning and Message keys bring them into view.",
      ["messages"],
    ),
    step(
      "desk-keys",
      "Desk keys",
      "Home leaves the shift. Pause stops the clock. The camera key shows the reactor hall, and the speaker sets alarms and sound.",
      ["desk-keys"],
      true,
    ),
    step(
      "chart-camera",
      "Chart recorder & camera",
      "The chart recorder traces the last three minutes of radioactivity, temperature and steam, and the camera watches the reactor hall.",
      ["chart", "camera"],
    ),
    step(
      "instruments",
      "More instruments",
      "The balance shows what's pushing radioactivity up or down, the rod display shows where each rod sits, and the dosimeter reads the radiation dose.",
      ["balance", "rod-display", "dosimeter"],
    ),
    {
      ...step(
        "begin",
        "Your shift",
        free
          ? "That's the desk. The clock starts when you press Begin shift. No demands tonight: take your time and learn the reactor."
          : test
            ? "That's the desk. The night begins when you press Begin shift. Follow the orders, and keep your eyes on the reactor."
            : "That's the desk. The clock starts when you press Begin shift. Good luck, comrade.",
      ),
      atTop: true,
    },
  ]
}

// --- Where the guide goes ---

export interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

export interface GuidePlan {
  scrollY: number
  dock: "top" | "bottom"
  corner: "left" | "right" // which side the engineer stands; on a phone the guide spans the width and he is always left
}

export const GUIDE_EDGE = 16 // gap between the guide, the subject and the screen's edges, px

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))

// The guide sits on an edge of the screen (owner, 2026-10-29): on a phone across the bottom (or the top), wider in the
// bottom corner opposite the subject (or the top corner). The page scrolls as little as it can so the subject is
// clear of the guide; a subject too tall to clear it is shown from its top. `subject` is in page coordinates.
export function planGuide(
  subject: Box,
  view: { width: number; height: number; scrollY: number; maxScroll: number },
  guide: { width: number; height: number },
  phone: boolean,
): GuidePlan {
  const corner: GuidePlan["corner"] = phone || (subject.left + subject.right) / 2 >= view.width / 2 ? "left" : "right"
  const clamp = (y: number) => Math.min(view.maxScroll, Math.max(0, y))
  const band = (dock: GuidePlan["dock"]): Box => {
    const top = dock === "bottom" ? view.height - guide.height - GUIDE_EDGE : GUIDE_EDGE
    const left = phone ? 0 : corner === "left" ? GUIDE_EDGE : view.width - guide.width - GUIDE_EDGE
    return { top, bottom: top + guide.height, left, right: phone ? view.width : left + guide.width }
  }

  const height = subject.bottom - subject.top
  const candidates: GuidePlan[] = []
  for (const dock of ["bottom", "top"] as const) {
    const g = band(dock)
    // Where the subject must sit to clear the guide; if it can't, from its top
    const regionTop = dock === "top" ? g.bottom + GUIDE_EDGE : GUIDE_EDGE
    const regionBottom = dock === "bottom" ? g.top - GUIDE_EDGE : view.height - GUIDE_EDGE
    let fit = view.scrollY
    if (height > regionBottom - regionTop || subject.top - fit < regionTop) fit = subject.top - regionTop
    else if (subject.bottom - fit > regionBottom) fit = subject.bottom - regionBottom
    candidates.push({ scrollY: clamp(fit), dock, corner })
    // Staying put is fine when the subject is already in view and the guide's corner misses it
    if (subject.top - view.scrollY >= 0 && subject.bottom - view.scrollY <= view.height) candidates.push({ scrollY: view.scrollY, dock, corner })
  }

  const score = (plan: GuidePlan) => {
    const g = band(plan.dock)
    const s = { ...subject, top: subject.top - plan.scrollY, bottom: subject.bottom - plan.scrollY }
    const covered = overlap(s, g)
    // A phone keeps him at the bottom unless the subject can't be cleared there; wider, the shorter scroll wins
    return (covered > 0 ? 1e6 + covered : 0) + Math.abs(plan.scrollY - view.scrollY) + (plan.dock === "top" ? (phone ? 1e5 : 1) : 0)
  }
  return candidates.reduce((best, plan) => (score(plan) < score(best) ? plan : best))
}
