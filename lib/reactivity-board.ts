// Legasov's board (components/reactivity-cards.tsx): which of the engine's cards are in play, and how the white
// blocks show the balance. Pure, so the harness can check it against real reactor states.
//
// While the balance holds, each side has BOARD_BUDGET blocks. When one side outweighs the other, the losing side
// loses blocks, more the bigger the imbalance, so the winning stack is visibly bigger (owner, 2026-10-13). Each
// side's blocks are shared among its cards by how hard each card pushes. The real cards are hundreds of points
// each, while what moves radioactivity is a difference of a few points, so the blocks follow the difference.
import type { ReactivityCards } from "./sim/reactor"

export type BoardSide = "red" | "blue"
export interface BoardCard {
  key: string
  side: BoardSide
  title: string
  note: string
  strength: (c: ReactivityCards) => number // push in points, 0 when out of play
  steady?: boolean // never changes, so no arrow
}

export const BOARD_CARDS: BoardCard[] = [
  { key: "fission", side: "red", title: "Nuclear fission", note: "The uranium fuel itself, the biggest red card. Always in play.", strength: (c) => c.base, steady: true },
  { key: "void", side: "red", title: "Positive void coefficient", note: "Steam in the core: less water, so more neutrons. It grows as the core boils, and fast with no water flowing.", strength: (c) => c.void },
  { key: "tips", side: "red", title: "Graphite tips", note: "The tip of every rod in the core. A rod leaving 0% pushes up before its boron arrives.", strength: (c) => c.tips },
  { key: "cold-fuel", side: "red", title: "Cold fuel", note: "Fuel cooler than normal pushes radioactivity up.", strength: (c) => Math.max(0, c.fuel) },
  { key: "rods", side: "blue", title: "Control rods", note: "Boron in the rods, the biggest blue card. The further in, the stronger.", strength: (c) => -c.boron },
  { key: "hot-fuel", side: "blue", title: "Negative temperature coefficient", note: "Fuel hotter than normal pushes radioactivity down.", strength: (c) => Math.max(0, -c.fuel) },
  { key: "xenon", side: "blue", title: "Xenon poisoning", note: "Builds at low radioactivity and burns away as it rises.", strength: (c) => -c.xenon },
]

export const BOARD_BUDGET = 8 // blocks per side while balanced (and the most one card can show)
// Imbalance (points) at which the losing side has lost 1, 2, … 8 blocks. One point moves radioactivity about 1% a
// second, so the first block goes at a barely noticeable drift and the last at a collapse or a runaway.
const LOSS_STEPS = [0.3, 1, 2, 4, 8, 16, 40, 100]
const IN_PLAY = 0.5 // points: below this a card is off the board

export interface Board {
  strengths: Record<string, number>
  inPlay: Record<string, boolean>
  blocks: Record<string, number>
  lean: BoardSide | null // the side that outweighs the other, null while balanced
  verdict: string
}

// Share `blocks` among cards so they add up to the side's blocks. Every card in play gets one first (strongest
// first, while blocks last), so a small card that matters, like cold fuel, is never blank; the rest go by strength
// (largest remainder).
function share(blocks: number, strengths: number[]): number[] {
  const out = strengths.map(() => 0)
  const byStrength = strengths.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0])
  let left = blocks
  for (const [, i] of byStrength) {
    if (left <= 0) break
    out[i] = 1
    left--
  }
  const total = strengths.reduce((a, b) => a + b, 0)
  if (left <= 0 || total <= 0) return out
  const exact = strengths.map((s) => (s / total) * left)
  const whole = exact.map(Math.floor)
  let rest = left - whole.reduce((a, b) => a + b, 0)
  const order = exact.map((e, i) => [e - whole[i], i] as const).sort((a, b) => b[0] - a[0])
  for (const [, i] of order) {
    if (rest <= 0) break
    whole[i]++
    rest--
  }
  return out.map((n, i) => Math.min(BOARD_BUDGET, n + whole[i]))
}

export function readBoard(cards: ReactivityCards): Board {
  const strengths = Object.fromEntries(BOARD_CARDS.map((card) => [card.key, card.strength(cards)]))
  const inPlay = Object.fromEntries(BOARD_CARDS.map((card) => [card.key, card.key === "fission" || strengths[card.key] >= IN_PLAY]))
  const net = cards.total
  const lost = LOSS_STEPS.filter((step) => Math.abs(net) >= step).length
  const lean: BoardSide | null = lost === 0 ? null : net > 0 ? "red" : "blue"
  const blocks: Record<string, number> = {}
  for (const side of ["red", "blue"] as const) {
    const playing = BOARD_CARDS.filter((card) => card.side === side && inPlay[card.key])
    const budget = lean && lean !== side ? BOARD_BUDGET - lost : BOARD_BUDGET
    share(budget, playing.map((card) => strengths[card.key])).forEach((n, i) => (blocks[playing[i].key] = n))
  }
  const verdict =
    lean === null ? "Balanced: radioactivity steady" : lean === "red" ? "Red outweighs blue: radioactivity rising" : "Blue outweighs red: radioactivity falling"
  return { strengths, inPlay, blocks, lean, verdict }
}
