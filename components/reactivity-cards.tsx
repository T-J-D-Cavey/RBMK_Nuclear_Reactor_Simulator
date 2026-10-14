"use client"

import { useRef, type CSSProperties } from "react"
import type { GameState } from "@/lib/types"
import { getReactivityCards } from "@/lib/sim/reactor"
import { BOARD_CARDS, type Board, type BoardSide, readBoard } from "@/lib/reactivity-board"
import { useElementSize } from "@/hooks/use-element-height"

// The radioactivity balance, Legasov's board from the show (owner, 2026-10-13; renamed 2026-10-14): red cards push
// radioactivity up, blue cards push it down, and the reactor is steady while the two columns are level. Every card
// is the same push, so a contributor's cards are its size (lib/reactivity-board.ts). The arrows show whether a
// contributor is getting stronger or weaker.

const TREND = 0.5 // points of change over the window that earn an arrow
const WINDOW = 10 // seconds of game time
const FULL_CARDS = 32 // a column this tall fills the rack; a taller one makes every card thinner so it still fits
const MIN_PITCH = 3 // px per card at the thinnest
const FALLBACK_STACK_PX = 192 // before the rack has been measured
const FALLBACK_WIDTH_PX = 320
const BRACKET_PX = 16 // the strip between a stack and its tags (globals.css: .cr-card-brackets)

interface Group {
  key: string
  title: string
  tag: string
  note: string
  count: number
  trend: number
  from: number // px from the bottom of the column
  height: number
  label: number // px from the bottom to the tag's centre
}

// The tags' type grows with the rack, so a wide screen doesn't leave them small (owner, 2026-10-14)
function tagFontPx(rackWidth: number) {
  return Math.min(19.2, Math.max(9.6, rackWidth * 0.034 - 4))
}

// Room for one tag: two lines of title and the count, and its padding
function labelPx(fontPx: number) {
  return Math.ceil(fontPx * 2.6 + 6)
}

// Bottom to top, each tag as close to its group's middle as the tags below and above allow.
function placeLabels(groups: Group[], stackPx: number, label: number) {
  let floor = label / 2
  for (const g of groups) {
    g.label = Math.max(g.from + g.height / 2, floor)
    floor = g.label + label
  }
  let ceiling = stackPx - label / 2
  for (let i = groups.length - 1; i >= 0; i--) {
    groups[i].label = Math.min(groups[i].label, ceiling)
    ceiling = groups[i].label - label
  }
}

export default function ReactivityCards({ gameState, height, className = "" }: { gameState: GameState; height?: number | null; className?: string }) {
  const [stackRef, measured] = useElementSize<HTMLDivElement>()
  const stackPx = measured?.height ?? FALLBACK_STACK_PX
  const fontPx = tagFontPx(measured?.width ?? FALLBACK_WIDTH_PX)
  const tagRoom = labelPx(fontPx)

  // Counts hold steady near a rounding point, so the board needs the one from the previous game second.
  const last = useRef<{ time: number; board: Board; before?: Board } | null>(null)
  const before = last.current && last.current.time !== gameState.gameTime ? last.current.board : last.current?.before
  const board = readBoard(getReactivityCards(gameState), before)
  last.current = { time: gameState.gameTime, board, before }

  // One sample per game second, so the arrows compare against about ten seconds ago.
  const history = useRef<{ time: number; strengths: Record<string, number> }[]>([])
  const newest = history.current[history.current.length - 1]
  if (!newest || newest.time !== gameState.gameTime) {
    history.current = [...history.current, { time: gameState.gameTime, strengths: board.strengths }].slice(-(WINDOW + 1))
  }
  const then = history.current[0]?.strengths ?? board.strengths

  // Whole pixels, so every card is exactly the same height.
  const columnCards = (side: BoardSide) => BOARD_CARDS.filter((card) => card.side === side).reduce((sum, card) => sum + board.cards[card.key], 0)
  const pitch = Math.max(MIN_PITCH, Math.floor(stackPx / Math.max(FULL_CARDS, columnCards("red"), columnCards("blue"))))
  const gap = pitch >= 6 ? 2 : 1

  const column = (side: BoardSide) => {
    let from = 0
    const groups: Group[] = []
    for (const card of BOARD_CARDS.filter((c) => c.side === side)) {
      const count = board.cards[card.key]
      if (count === 0) continue
      const change = board.strengths[card.key] - (then[card.key] ?? board.strengths[card.key])
      groups.push({ ...card, count, trend: change >= TREND ? 1 : change <= -TREND ? -1 : 0, from, height: count * pitch, label: 0 })
      from += count * pitch
    }
    placeLabels(groups, stackPx, tagRoom)
    return (
      <div className={`cr-card-column is-${side}`}>
        <ul aria-label={side === "red" ? "Red cards: push radioactivity up" : "Blue cards: push radioactivity down"}>
          {groups.map((g, i) => (
            <li key={g.key} className={`cr-card-group cr-card-${side} ${i % 2 ? "is-alt" : ""}`} style={{ bottom: g.from, height: g.height }} title={`${g.title}: ${g.note}`}>
              {Array.from({ length: g.count }, (_, n) => (
                <span key={n} className="cr-card" style={{ height: pitch - gap, marginTop: gap }} />
              ))}
              <span className="sr-only">
                {g.title}: {g.count} {g.count === 1 ? "card" : "cards"}
                {g.trend > 0 ? ", getting stronger" : g.trend < 0 ? ", getting weaker" : ""}
              </span>
            </li>
          ))}
        </ul>
        {/* A bracket along each group's cards, joined to its tag */}
        <svg className="cr-card-brackets" viewBox={`0 0 ${BRACKET_PX} ${stackPx}`} preserveAspectRatio="none" aria-hidden="true">
          {groups.map((g) => {
            const x = (v: number) => (side === "red" ? v : BRACKET_PX - v) // red: the stack is on the right
            // Pulled in a little at each end, so neighbouring brackets don't run together.
            const top = stackPx - (g.from + g.height) + gap + 1.5
            const bottom = Math.max(top + 1, stackPx - g.from - 1.5)
            const middle = (top + bottom) / 2
            const tag = stackPx - g.label
            return (
              <path
                key={g.key}
                d={`M${x(15)} ${top} H${x(11)} V${bottom} H${x(15)} M${x(11)} ${middle} H${x(6)} L${x(0)} ${tag}`}
                className={`cr-card-bracket is-${side}`}
              />
            )
          })}
        </svg>
        {groups.map((g, i) => (
          <div key={g.key} className="cr-card-label" style={{ bottom: g.label - tagRoom / 2, height: tagRoom }} aria-hidden="true" title={`${g.title}: ${g.note}`}>
            <span className={`cr-card-tag cr-card-${side} ${i % 2 ? "is-alt" : ""}`}>
              {g.tag} <span className="cr-card-count">
                ×{g.count}
                {g.trend !== 0 && <span className="cr-card-trend">{g.trend > 0 ? " ▲" : " ▼"}</span>}
              </span>
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`cr-panel cr-screws p-3 sm:p-4 flex flex-col gap-2 ${className}`} style={height ? { height } : undefined}>
      <div className="flex items-center justify-between gap-2">
        <div className="cr-plate">Radioactivity Balance</div>
      </div>

      <div className="cr-card-rack p-2 sm:p-2.5 flex-1 min-h-0 flex flex-col" role="group" aria-label="Red and blue cards. Every card is the same push.">
        <div ref={stackRef} className="grid grid-cols-2 flex-1 min-h-[12rem]" style={{ "--tag-font": `${fontPx}px` } as CSSProperties}>
          {column("red")}
          {column("blue")}
        </div>
      </div>
    </div>
  )
}
