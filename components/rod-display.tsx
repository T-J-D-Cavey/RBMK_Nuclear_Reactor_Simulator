"use client"

import type { ControlRod, GameState } from "@/lib/types"
import { isAz5LampLit } from "@/lib/game-utils"
import { type RodDisplay as RodView, useRodDisplay } from "@/hooks/use-rod-display"

// The rod position display: a map of the core seen from above (owner, 2026-11-04, replacing the ring from the show's
// mimic panel), each rod with its number and insertion, and the AZ-5 lamp by the nameplate. It sits below the
// radioactivity balance.

type Lamp = "in" | "moving" | "out" | "jammed"

const LEGEND: { lamp: Lamp; label: string }[] = [
  { lamp: "in", label: "Inserted" },
  { lamp: "moving", label: "Moving" },
  { lamp: "out", label: "Withdrawn" },
  { lamp: "jammed", label: "Jammed" },
]

// Where each rod sits on the map, in % of its width and height: left edge (R1–2), left centre (R3–5), right centre
// (R6–8), right edge (R9–10), the same left to right as the levers. Each edge rod is level with the gap between two
// centre rods. Drawn close together, low on the map, to leave its top for the rod balance needle (owner, 2026-11-04:
// Rod widget A2). Fixed lenses can't overlap (owner, 2026-10-16): they are 14% wide and tall (globals.css:
// .cr-rod-cell), and each socket adds 4px a side.
const CORE_MAP: readonly (readonly [number, number])[] = [
  [20, 46.5],
  [20, 68.5],
  [40, 35.5],
  [40, 57.5],
  [40, 79.5],
  [60, 35.5],
  [60, 57.5],
  [60, 79.5],
  [80, 46.5],
  [80, 68.5],
]

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
        <div className={`cr-rod-az5 ${az5Lit ? "is-lit" : ""}`}>
          <span aria-hidden="true">AZ-5</span>
          <span className="sr-only">AZ-5 {az5Lit ? "pressed" : "not pressed"}</span>
        </div>
      </div>

      <div className="cr-rod-face cr-bay-screws p-3 sm:p-4 flex flex-col gap-3">
        <ul className="cr-rod-map" aria-label="Control rod positions">
          {rods.map((rod, i) => {
            const view = views[i]
            const lamp = lampFor(rod, view)
            const [left, top] = CORE_MAP[i]
            const position = Math.round(view.insertion)
            return (
              <li
                key={rod.id}
                className={`cr-rod-cell is-${lamp}`}
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span className="cr-rod-id" aria-hidden="true">R{rod.id}</span>
                <span className="cr-rod-pos" aria-hidden="true">{position}%</span>
                <span className="sr-only">
                  Rod {rod.id}: {position}% inserted, {LEGEND.find((entry) => entry.lamp === lamp)?.label.toLowerCase()}
                </span>
              </li>
            )
          })}
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
