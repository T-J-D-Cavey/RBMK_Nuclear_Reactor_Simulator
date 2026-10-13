"use client"

import { useRef } from "react"
import type { GameState } from "@/lib/types"
import { getReactivityCards } from "@/lib/sim/reactor"
import { BOARD_BUDGET, BOARD_CARDS, readBoard } from "@/lib/reactivity-board"

// Legasov's board from the show (owner, 2026-10-13): red cards push radioactivity up, blue cards push it down,
// and the reactor is steady while the two stacks balance. Which cards are in play and how the white blocks show
// the balance: lib/reactivity-board.ts. The arrows show whether a card is getting stronger or weaker.

const TREND = 0.5 // points of change over the window that earn an arrow
const WINDOW = 10 // seconds of game time

export default function ReactivityCards({ gameState, className = "" }: { gameState: GameState; className?: string }) {
  const board = readBoard(getReactivityCards(gameState))

  // One sample per game second, so the arrows compare against about ten seconds ago.
  const history = useRef<{ time: number; strengths: Record<string, number> }[]>([])
  const last = history.current[history.current.length - 1]
  if (!last || last.time !== gameState.gameTime) {
    history.current = [...history.current, { time: gameState.gameTime, strengths: board.strengths }].slice(-(WINDOW + 1))
  }
  const before = history.current[0]?.strengths ?? board.strengths

  return (
    <div className={`cr-panel cr-screws p-3 sm:p-4 space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="cr-plate">Legasov&apos;s Board of Balance</div>
      </div>

      <div className="cr-card-rack p-2 sm:p-2.5" role="group" aria-label="Red and blue cards">
        <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3">
          {(["red", "blue"] as const).map((side) => (
            <ul key={side} className="flex flex-col" aria-label={side === "red" ? "Red cards: push radioactivity up" : "Blue cards: push radioactivity down"}>
              {BOARD_CARDS.filter((card) => card.side === side).map((card) => {
                if (!board.inPlay[card.key]) {
                  return (
                    <li key={card.key} className="cr-card-shelf">
                      <div className="cr-card cr-card-empty" title={`${card.title}: not in play`}>
                        <span className="sr-only">{card.title}: not in play</span>
                      </div>
                    </li>
                  )
                }
                const now = board.strengths[card.key]
                const change = now - (before[card.key] ?? now)
                const trend = card.steady ? 0 : change >= TREND ? 1 : change <= -TREND ? -1 : 0
                const lit = board.blocks[card.key] ?? 0
                return (
                  <li key={card.key} className="cr-card-shelf">
                    <div className={`cr-card ${side === "red" ? "cr-card-red" : "cr-card-blue"}`} title={card.note}>
                      <div className="flex items-start justify-between gap-1">
                        <span className="cr-card-title">{card.title}</span>
                        {trend !== 0 && (
                          <span className="cr-card-trend" aria-label={trend > 0 ? "getting stronger" : "getting weaker"}>
                            {trend > 0 ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                      <span className="cr-card-meter" aria-label={`${lit} of ${BOARD_BUDGET} blocks`}>
                        {Array.from({ length: BOARD_BUDGET }, (_, i) => (
                          <span key={i} className={i < lit ? "on" : ""} />
                        ))}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          ))}
        </div>
        <p className={`cr-card-verdict ${board.lean === "red" ? "is-red" : board.lean === "blue" ? "is-blue" : ""}`} aria-live="polite">
          {board.verdict}
        </p>
      </div>
    </div>
  )
}
