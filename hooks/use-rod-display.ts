import { useEffect, useReducer, useRef } from "react"
import type { ControlRod } from "@/lib/types"
import { DRIVE_START_DELAY_MS } from "@/lib/rod-drive-voices"

export interface RodDisplay {
  insertion: number // where to draw the rod, 0-100%
  moving: boolean // travelling, as far as the display is concerned
}

// How the rod display shows each rod. A rod sent off from rest stays where it was, and doesn't show as moving,
// until the drive sound starts (DRIVE_START_DELAY_MS after the order, once the confirmation clunk has played), so
// the display and the sound start together; after that it follows the rod's actual position.
export function useRodDisplay(rods: ControlRod[]): RodDisplay[] {
  const last = useRef(new Map<number, { target: number; insertion: number }>())
  const holds = useRef(new Map<number, { at: number; until: number }>())
  const [, rerender] = useReducer((n: number) => n + 1, 0)

  const now = Date.now()
  for (const rod of rods) {
    const before = last.current.get(rod.id)
    // A new order for a rod that was at rest (not a new game, which moves the rods themselves): hold its marker
    if (before && rod.target !== before.target && before.insertion === before.target && rod.insertion === before.insertion) {
      holds.current.set(rod.id, { at: before.insertion, until: now + DRIVE_START_DELAY_MS })
    }
    last.current.set(rod.id, { target: rod.target, insertion: rod.insertion })
  }
  for (const [id, hold] of holds.current) if (hold.until <= now) holds.current.delete(id)

  // Redraw when the earliest hold runs out
  const nextRelease = Math.min(...[...holds.current.values()].map((hold) => hold.until))
  useEffect(() => {
    if (!Number.isFinite(nextRelease)) return
    const timer = window.setTimeout(rerender, Math.max(0, nextRelease - Date.now()))
    return () => window.clearTimeout(timer)
  }, [nextRelease])

  return rods.map((rod) => {
    const hold = holds.current.get(rod.id)
    if (hold) return { insertion: hold.at, moving: false }
    return { insertion: rod.insertion, moving: !rod.stuck && rod.insertion !== rod.target }
  })
}
