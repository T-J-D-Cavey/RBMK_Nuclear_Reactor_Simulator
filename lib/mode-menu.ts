// How each mode is described to the player: the mode menu and How to Play both read this, so they always match.
// What to expect, not what will happen (owner, 2026-10-13): no event counts or target sizes. Listed Easy, Hard,
// Safety Test, Free (owner, 2026-10-20).
import type { GameMode } from "./types"

export const MODE_MENU_TAGLINE = "Same flawed reactor in every mode"

export const MODE_MENU: { mode: GameMode; name: string; specs: string[]; lamp: string; key: string; action: string }[] = [
  {
    mode: "easy",
    name: "Easy Mode",
    specs: ["Shorter shift", "Steady demands", "Fewer surprises"],
    lamp: "bg-green-400 text-green-400",
    key: "cr-lens-green",
    action: "Start Easy",
  },
  {
    mode: "hard",
    name: "Hard Mode",
    specs: ["Longer shift", "Tougher demands", "More to deal with"],
    lamp: "bg-red-500 text-red-500",
    key: "cr-lens-red",
    action: "Start Hard",
  },
  {
    mode: "safety_test",
    name: "Safety Test",
    specs: ["The night of 26 April 1986", "Follow the test team's orders", "Can you save Unit 4?"],
    lamp: "bg-amber-400 text-amber-400",
    key: "cr-lens-amber",
    action: "Begin Test",
  },
  {
    mode: "free",
    name: "Free Mode",
    specs: ["No time limit", "No demands", "Learn the reactor"],
    lamp: "bg-sky-400 text-sky-400",
    key: "cr-lens-blue",
    action: "Start Free",
  },
]
