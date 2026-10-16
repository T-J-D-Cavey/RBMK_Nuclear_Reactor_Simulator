"use client"

import type { ControlRod, GameState } from "@/lib/types"
import { isAz5LampLit } from "@/lib/game-utils"
import { type RodDisplay as RodView, useRodDisplay } from "@/hooks/use-rod-display"

// The rod position display, after the circular mimic panel in the show (owner, 2026-10-16): the ten rods in a ring,
// each with its number and insertion, and the AZ-5 lamp in the middle. It sits below the radioactivity balance.

type Lamp = "in" | "moving" | "out" | "jammed"

const LEGEND: { lamp: Lamp; label: string }[] = [
  { lamp: "in", label: "Inserted" },
  { lamp: "moving", label: "Moving" },
  { lamp: "out", label: "Withdrawn" },
  { lamp: "jammed", label: "Jammed" },
]

// Fixed lenses can't overlap (owner, 2026-10-16). The closest neighbours (R2 and R3, and the three pairs like them)
// are RING_RADIUS × (cos 36° − cos 72°) ≈ 20% of the ring apart one way and less the other. A lens is 14% wide
// (globals.css: .cr-rod-cell) and its socket adds 4px a side, so they are at least 5px apart on the narrowest ring
// (≈216px) and 15px on the widest (24rem). The outermost socket edges stay inside the ring.
const RING_RADIUS = 40 // % of the ring's width, from its centre to each rod's centre

// A jam shows above everything; a rod at 0% has no tip in the core, so it shows as withdrawn.
function lampFor(rod: ControlRod, view: RodView): Lamp {
  if (rod.stuck) return "jammed"
  if (view.moving) return "moving"
  return view.insertion === 0 ? "out" : "in"
}

export default function RodDisplay({ gameState, className = "" }: { gameState: GameState; className?: string }) {
  const views = useRodDisplay(gameState.controlRods)
  const az5Lit = isAz5LampLit(gameState)
  const rods = gameState.controlRods

  return (
    <div className={`cr-panel cr-screws p-3 sm:p-4 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="cr-plate">Control Rod Positions</div>
      </div>

      <div className="cr-rod-face p-3 sm:p-4 flex flex-col gap-3">
        <ul className="cr-rod-ring" aria-label="Control rod positions">
          {rods.map((rod, i) => {
            const view = views[i]
            const lamp = lampFor(rod, view)
            const angle = (i / rods.length) * 2 * Math.PI // rod 1 at the top, then clockwise
            const position = Math.round(view.insertion)
            return (
              <li
                key={rod.id}
                className={`cr-rod-cell is-${lamp}`}
                style={{ left: `${50 + RING_RADIUS * Math.sin(angle)}%`, top: `${50 - RING_RADIUS * Math.cos(angle)}%` }}
              >
                <span className="cr-rod-id" aria-hidden="true">R{rod.id}</span>
                <span className="cr-rod-pos" aria-hidden="true">{position}%</span>
                <span className="sr-only">
                  Rod {rod.id}: {position}% inserted, {LEGEND.find((entry) => entry.lamp === lamp)?.label.toLowerCase()}
                </span>
              </li>
            )
          })}
          <li className={`cr-rod-az5 ${az5Lit ? "is-lit" : ""}`}>
            <span aria-hidden="true">AZ-5</span>
            <span className="sr-only">AZ-5 {az5Lit ? "pressed" : "not pressed"}</span>
          </li>
        </ul>

        <ul className="cr-rod-legend" aria-hidden="true">
          {LEGEND.map((entry) => (
            <li key={entry.lamp} className={`is-${entry.lamp}`}>
              <span className="cr-rod-swatch" />
              {entry.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
