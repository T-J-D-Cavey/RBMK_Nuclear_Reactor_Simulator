// Legasov's board (components/reactivity-cards.tsx): the engine's contributors as two columns of cards. Pure, so the
// harness can check it against real reactor states.
//
// Every card is worth the same push on radioactivity, CARD_POINTS (owner, 2026-10-14), so a contributor gets cards in
// proportion to its push and each column's height is its side's total. Equal sides always give equal columns: the
// shared height comes from the smaller side and the difference is added on the same scale, so rounding alone never
// makes one column taller. Under half a card is no card. Counts only change once a value is clearly past the
// rounding point, so they don't flicker.
//
// The fuel answers within seconds, so the two sides usually sit within a card of each other; a lead of a few points
// moves radioactivity about 1% a second, and slow drifts like that show in the arrows. A gap of a card or more is
// where the reactor goes prompt and moves fast (lib/sim/tuning.ts: promptAbove). (A line under the board reading
// the exact balance was tried and removed: it changed too often, owner 2026-10-14.)
import type { ReactivityCards } from "./sim/reactor"

export type BoardSide = "red" | "blue"
export interface BoardCard {
  key: string
  side: BoardSide
  title: string
  tag: string // the short name printed on the board
  note: string
  strength: (c: ReactivityCards) => number // push in points, 0 when out of play
}

// Bottom of each column first: the big, slow contributors carry the stack.
export const BOARD_CARDS: BoardCard[] = [
  {
    key: "fission",
    side: "red",
    title: "Nuclear fission",
    tag: "Fission",
    note: "The uranium and graphite in the core, including the graphite tip of every rod in the core. A rod leaving 0% adds its tip before its boron arrives.",
    strength: (c) => c.base + c.tips,
  },
  { key: "void", side: "red", title: "Positive void coefficient", tag: "Steam", note: "Steam in the core: less water, so more neutrons. It grows as the core boils, and fast with no water flowing.", strength: (c) => c.void },
  { key: "cool-fuel", side: "red", title: "Cool fuel", tag: "Cool fuel", note: "Fuel cooler than normal pushes radioactivity up, strongly when very cold.", strength: (c) => Math.max(0, c.fuel) },
  { key: "rods", side: "blue", title: "Control rods", tag: "Control rods", note: "Boron in the rods. The further in, the stronger.", strength: (c) => -c.boron },
  { key: "xenon", side: "blue", title: "Xenon poisoning", tag: "Xenon", note: "Builds at low radioactivity and burns away as it rises.", strength: (c) => -c.xenon },
  { key: "hot-fuel", side: "blue", title: "Negative temperature coefficient", tag: "Hot fuel", note: "Fuel hotter than normal pushes radioactivity down.", strength: (c) => Math.max(0, -c.fuel) },
]

export const CARD_POINTS = 10 // one card: one rod moved 20%, and the size of lead where the reactor goes prompt
const STICK = 0.1 // cards past the rounding point before a count changes

export interface Board {
  strengths: Record<string, number> // points
  cards: Record<string, number> // whole cards per contributor
  matched: number // cards both columns share
  lead: number // extra cards on the leading column: + red, − blue
}

// Round, but keep the previous count until the value is STICK past the rounding point.
function sticky(exact: number, previous: number | undefined): number {
  if (previous !== undefined && Math.abs(exact - previous) < 0.5 + STICK) return previous
  return Math.round(exact) || 0 // never −0
}

// Split a column's cards among its contributors: each rounded on its own (none under half a card), then nudged by
// the largest remainders until they add up to the column.
function share(total: number, exact: number[], previous: (number | undefined)[]): number[] {
  const out = exact.map((e, i) => sticky(e, previous[i]))
  const remainder = (i: number) => exact[i] - out[i]
  let sum = out.reduce((a, b) => a + b, 0)
  while (sum < total) {
    const candidates = exact.map((_, i) => i).filter((i) => exact[i] > 0)
    if (candidates.length === 0) break
    out[candidates.reduce((a, b) => (remainder(b) > remainder(a) ? b : a))]++
    sum++
  }
  while (sum > total) {
    const candidates = out.map((_, i) => i).filter((i) => out[i] > 0)
    out[candidates.reduce((a, b) => (remainder(b) < remainder(a) ? b : a))]--
    sum--
  }
  return out
}

// `previous` is the board from a moment ago, so counts hold steady near a rounding point.
export function readBoard(cards: ReactivityCards, previous?: Board): Board {
  const strengths = Object.fromEntries(BOARD_CARDS.map((card) => [card.key, Math.max(0, card.strength(cards))]))
  const sideTotal = (side: BoardSide) => BOARD_CARDS.filter((card) => card.side === side).reduce((sum, card) => sum + strengths[card.key], 0)
  const red = sideTotal("red") / CARD_POINTS
  const blue = sideTotal("blue") / CARD_POINTS
  const matched = sticky(Math.min(red, blue), previous?.matched)
  const lead = sticky(red - blue, previous?.lead)

  const counts: Record<string, number> = {}
  for (const side of ["red", "blue"] as const) {
    const column = BOARD_CARDS.filter((card) => card.side === side)
    const total = matched + Math.max(0, side === "red" ? lead : -lead)
    share(
      total,
      column.map((card) => strengths[card.key] / CARD_POINTS),
      column.map((card) => previous?.cards[card.key]),
    ).forEach((n, i) => (counts[column[i].key] = n))
  }

  // The random drift in the balance is left off: never more than about 4 points, under half a card.
  return { strengths, cards: counts, matched, lead }
}
