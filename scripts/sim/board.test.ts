// Checks for Legasov's board (lib/reactivity-board.ts) against real reactor states: every card is the same push,
// so each column is its side's total, and level columns mean a balanced reactor. Run: node --run sim:test
import { test } from "node:test"
import assert from "node:assert/strict"
import { BOARD_CARDS, CARD_POINTS, type Board, readBoard } from "../../lib/reactivity-board"
import { advanceReactor, getReactivityCards } from "../../lib/sim/reactor"
import { seededRng } from "../../lib/sim/rng"
import { createNewGame } from "../../lib/game-loop"
import type { GameState } from "../../lib/types"
import { baseState, setPumps, setRods } from "./harness"
import { makeBot, playGame } from "./bot"

const column = (board: Board, side: "red" | "blue") =>
  BOARD_CARDS.filter((card) => card.side === side).reduce((sum, card) => sum + board.cards[card.key], 0)

// The board as the panel shows it: one reading per second, each from the one before.
function boards(states: GameState[]): Board[] {
  const out: Board[] = []
  for (const s of states) out.push(readBoard(getReactivityCards(s), out[out.length - 1]))
  return out
}

function physics(start: GameState, seconds: number, change: (s: GameState) => GameState): GameState[] {
  const rng = seededRng(1)
  const states: GameState[] = []
  let s = change(start)
  for (let t = 0; t < seconds; t++) {
    const result = advanceReactor(s, rng)
    s = result.state
    states.push(s)
    if (result.ending) break
  }
  return states
}

test("balanced reference: level columns, fission 17 (tips included), steam 6, rods 23", () => {
  const board = readBoard(getReactivityCards(baseState()))
  assert.equal(column(board, "red"), column(board, "blue"))
  assert.equal(board.lead, 0)
  assert.deepEqual(
    { fission: board.cards.fission, void: board.cards.void, rods: board.cards.rods, coolFuel: board.cards["cool-fuel"], hotFuel: board.cards["hot-fuel"] },
    { fission: 17, void: 6, rods: 23, coolFuel: 0, hotFuel: 0 },
  )
})

test("whole bot shifts: columns add up, cards track each contributor's size, and near balance the columns are level", () => {
  for (const mode of ["easy", "hard"] as const) {
    for (const seed of [1, 2, 3]) {
      const run = playGame(createNewGame(mode), makeBot(), seed)
      const all = boards(run.states)
      all.forEach((board, t) => {
        const cards = getReactivityCards(run.states[t])
        assert.equal(column(board, "red"), board.matched + Math.max(0, board.lead), `${mode} ${seed} t${t}: red column`)
        assert.equal(column(board, "blue"), board.matched + Math.max(0, -board.lead), `${mode} ${seed} t${t}: blue column`)
        for (const card of BOARD_CARDS) {
          const exact = board.strengths[card.key] / CARD_POINTS
          assert.ok(Math.abs(board.cards[card.key] - exact) <= 1, `${mode} ${seed} t${t}: ${card.key} ${board.cards[card.key]} cards for ${exact.toFixed(2)}`)
        }
        if (Math.abs(cards.total - cards.noise) < 4) assert.equal(board.lead, 0, `${mode} ${seed} t${t}: balanced but columns differ`)
      })
      // Counts hold near a rounding point: a contributor changes count at most once every few seconds on average.
      const changes = all.slice(1).reduce((n, board, i) => n + BOARD_CARDS.filter((c) => board.cards[c.key] !== all[i].cards[c.key]).length, 0)
      assert.ok(changes / all.length < 0.25, `${mode} ${seed}: ${changes} count changes in ${all.length} s`)
    }
  }
})

test("big moves show as a gap: pumps off and rods pulled lift red, a collapse lifts blue", () => {
  const most = (states: GameState[]) => boards(states).reduce((a, b) => (Math.abs(b.lead) > Math.abs(a) ? b.lead : a), 0)
  assert.ok(most(physics(baseState(), 120, (s) => setPumps(s, 0))) >= 3, "all pumps off")
  assert.ok(most(physics(baseState(), 120, (s) => setRods(s, 0))) >= 5, "all rods yanked to 0%")
  assert.ok(most(physics(baseState(), 120, (s) => setRods(s, s.controlRods.map((r) => r.insertion + 20)))) <= -5, "all rods in 20%")
})

test("fuel cards follow the fuel's push: red below normal, blue above, none at normal", () => {
  const at = (fuelTemp: number) => readBoard(getReactivityCards(baseState({ fuelTemp })))
  assert.equal(at(530).cards["cool-fuel"] + at(530).cards["hot-fuel"], 0)
  assert.ok(at(0).cards["cool-fuel"] >= 12, "very cold fuel: lots of red cards")
  assert.ok(at(1200).cards["hot-fuel"] >= 8, "very hot fuel: lots of blue cards")
  assert.equal(at(0).cards["hot-fuel"], 0)
  assert.equal(at(1200).cards["cool-fuel"], 0)
})
