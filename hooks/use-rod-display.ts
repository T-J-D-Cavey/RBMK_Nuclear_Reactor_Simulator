import { useEffect, useReducer, useRef } from "react"
import type { ControlRod } from "@/lib/types"
import { DRIVE_MIN_PLAY_MS, DRIVE_START_DELAY_MS } from "@/lib/rod-drive-voices"
import { TUNING } from "@/lib/sim/tuning"

export interface RodDisplay {
  insertion: number // where to draw the rod, 0-100%
  moving: boolean // travelling, as far as the display is concerned
}

// How the rod display shows each rod. A rod sent off from rest stays where it was, and doesn't show as moving,
// until the drive sound starts (DRIVE_START_DELAY_MS after the order, once the confirmation clunk has played), so
// the display and the sound start together; after that it follows the rod's actual position. A short move (a few %)
// arrives before that hold is over, so it then shows as moving for as long as its travel takes, and at least as long
// as the drive sound plays: otherwise the rod would just jump.
export function useRodDisplay(rods: ControlRod[]): RodDisplay[] {
  const last = useRef(new Map<number, { target: number; insertion: number }>())
  const holds = useRef(new Map<number, { at: number; until: number }>())
  const movingUntil = useRef(new Map<number, number>())
  const [, rerender] = useReducer((n: number) => n + 1, 0)

  const now = Date.now()
  for (const rod of rods) {
    const before = last.current.get(rod.id)
    // A new order for a rod that was at rest (not a new game, which moves the rods themselves): hold its marker
    if (before && rod.target !== before.target && before.insertion === before.target && rod.insertion === before.insertion) {
      const until = now + DRIVE_START_DELAY_MS
      const travelMs = (Math.abs(rod.target - before.insertion) * TUNING.rodFullStrokeSeconds * 1000) / 100
      holds.current.set(rod.id, { at: before.insertion, until })
      movingUntil.current.set(rod.id, until + Math.max(DRIVE_MIN_PLAY_MS, travelMs))
    }
    last.current.set(rod.id, { target: rod.target, insertion: rod.insertion })
  }
  for (const [id, hold] of holds.current) if (hold.until <= now) holds.current.delete(id)
  for (const [id, until] of movingUntil.current) if (until <= now) movingUntil.current.delete(id)

  // Redraw when the earliest hold or short move runs out
  const nextRelease = Math.min(...[...holds.current.values()].map((hold) => hold.until), ...movingUntil.current.values())
  useEffect(() => {
    if (!Number.isFinite(nextRelease)) return
    const timer = window.setTimeout(rerender, Math.max(0, nextRelease - Date.now()))
    return () => window.clearTimeout(timer)
  }, [nextRelease])

  return rods.map((rod) => {
    const hold = holds.current.get(rod.id)
    if (hold) return { insertion: hold.at, moving: false }
    const travelling = rod.insertion !== rod.target || movingUntil.current.has(rod.id)
    return { insertion: rod.insertion, moving: !rod.stuck && travelling }
  })
}
