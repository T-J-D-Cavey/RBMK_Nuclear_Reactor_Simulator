"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, openOnDialog } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { StripDial } from "@/components/machine-dials"
import MachineGuide from "@/components/machine-guide"
import { rodBalance } from "@/lib/sim/reactor"
import { MAINTENANCE_TUNING } from "@/lib/sim/tuning"
import { MACHINE_GUIDES } from "@/lib/tutorial"
import type { ControlRod } from "@/lib/types"

interface ControlRodsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  controlRods: ControlRod[]
  onOrderRod: (idx: number, target: number) => void
  onAZ5: () => void
  onGuideChange: (open: boolean) => void // the shift foreman has come or gone: the game pauses while he talks
}

export default function ControlRodsModal({ open, onOpenChange, controlRods, onOrderRod, onAZ5, onGuideChange }: ControlRodsModalProps) {
  // The lever in the player's hand. It goes with the pointer and the rod gets its order as it's let go, so overshooting
  // on the way sends the rod nowhere. Only the lever itself can be picked up, and it moves by as far as the pointer does:
  // with no Apply to stop it, a tap on a channel or the edge of a grip mustn't send a rod anywhere.
  const [held, setHeld] = useState<{ idx: number; value: number } | null>(null)
  const grip = useRef({ y: 0, from: 0, height: 1, value: 0 })

  const anySlow = controlRods.some((rod) => rod.slow && !rod.stuck)

  // AZ-5 takes effect with a single press: every rod that isn't jammed is driven toward 100% (bible §10).
  const handleAZ5 = () => {
    onAZ5()
    onOpenChange(false)
  }

  const handleStart = (idx: number, e: React.MouseEvent | React.TouchEvent) => {
    if (controlRods[idx].stuck) return
    // touching the lever shouldn't scroll the modal or select text
    if (!("touches" in e)) e.preventDefault()
    const from = Math.round(controlRods[idx].target)
    grip.current = {
      y: "touches" in e ? e.touches[0].clientY : e.clientY,
      from,
      height: e.currentTarget.parentElement?.clientHeight ?? 1,
      value: from,
    }
    setHeld({ idx, value: from })
  }

  const heldRod = held?.idx ?? null
  useEffect(() => {
    if (heldRod === null) return
    const move = (e: MouseEvent | TouchEvent) => {
      // Prevent scrolling on mobile while dragging
      if (e.cancelable) e.preventDefault()
      const y = "touches" in e ? e.touches[0].clientY : e.clientY
      const value = Math.max(0, Math.min(100, Math.round(grip.current.from + ((y - grip.current.y) / grip.current.height) * 100)))
      grip.current.value = value
      setHeld({ idx: heldRod, value })
    }
    const letGo = () => {
      if (grip.current.value !== grip.current.from) onOrderRod(heldRod, grip.current.value)
      setHeld(null)
    }
    const interrupted = () => setHeld(null) // the system took the touch away: nothing was decided

    // { passive: false } is required to allow e.preventDefault() in touch events
    document.addEventListener("mousemove", move)
    document.addEventListener("mouseup", letGo)
    document.addEventListener("touchmove", move, { passive: false })
    document.addEventListener("touchend", letGo)
    document.addEventListener("touchcancel", interrupted)

    return () => {
      document.removeEventListener("mousemove", move)
      document.removeEventListener("mouseup", letGo)
      document.removeEventListener("touchmove", move)
      document.removeEventListener("touchend", letGo)
      document.removeEventListener("touchcancel", interrupted)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heldRod])

  // Levers show where each rod has been ordered to go (the panel shows where it actually is)
  const setPosition = (rod: ControlRod, idx: number) => (held?.idx === idx && !rod.stuck ? held.value : Math.round(rod.target))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="cr-dialog sm:max-w-2xl w-full max-h-[90dvh] overflow-y-auto p-4 sm:p-6 [--dlg-pad:1rem] sm:[--dlg-pad:1.5rem] select-none"
        onOpenAutoFocus={openOnDialog}
      >
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Control Rods</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-stretch gap-3">
            {/* The needle follows the rods themselves, not the levers: it moves only once they do */}
            <div className="cr-module cr-bay-screws flex-1 min-w-0 p-2 flex items-center" data-tutorial="rods-needle">
              <StripDial value={rodBalance(controlRods)} />
            </div>

            {/* AZ-5: a red button inside a hazard-striped guard */}
            <div className="cr-hazard shrink-0 rounded-[3px] p-2 flex flex-col items-center justify-center gap-1.5" data-tutorial="rods-az5">
              <span className="cr-round-bezel">
                <button onClick={handleAZ5} className="cr-round-key cr-az5 w-14 h-14 sm:w-16 sm:h-16" aria-label="AZ-5 emergency insertion">
                  AZ-5
                </button>
              </span>
            </div>
          </div>

          {/* The levers in fabric-lined channels (owner, 2026-11-04: Rods A2), with one SKALA strip under the bank for
              the set positions (owner, 2026-10-27: prototype A). A lamp pulses behind the channel's gap: yellow for a
              slow rod, red for a jam, which takes priority. The lever and its plate are hardware and never change.
              The shift foreman frames the yellow channels, or the whole bank if there are none to show. */}
          <div className="cr-module cr-bay-screws p-2 sm:p-3 sm:pb-2.5 flex flex-col gap-3">
            <div data-tutorial={anySlow ? undefined : "rods-slow"}>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-x-1 gap-y-4 justify-items-center" data-tutorial="rods-levers">
              {controlRods.map((rod, idx) => (
                  <div key={rod.id} className="flex flex-col items-center gap-1 w-full" data-tutorial={MAINTENANCE_TUNING.edgeRods.includes(rod.id) ? "rods-edge" : undefined}>
                    <Label className="cr-plate !px-1.5 !py-1 !text-[0.7rem] !tracking-[0.1em]">R{rod.id}</Label>

                    {/* Top Cap: the drive housing */}
                    <div className="w-8 sm:w-[30px] h-2 sm:h-3 rounded-t-sm bg-gradient-to-b from-neutral-500 to-neutral-800 border border-black/70" />

                    {/* Rod Track */}
                    <div
                      data-tutorial={rod.slow && !rod.stuck ? "rods-slow" : undefined}
                      className="cr-rod-slot relative w-8 sm:w-[30px] h-36 sm:h-48 rounded-b-sm"
                    >
                      {(rod.stuck || rod.slow) && <span className={`cr-rod-lamp ${rod.stuck ? "is-jammed" : "is-slow"}`} aria-hidden="true" />}

                      {/* Draggable Lever Handle, inside a transparent fingertip-sized grab area */}
                      <div
                        className={`absolute z-[1] left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-11 flex items-center justify-center touch-none ${
                          rod.stuck ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
                        }`}
                        style={{
                          top: `${setPosition(rod, idx)}%`,
                        }}
                        onMouseDown={(e) => handleStart(idx, e)}
                        onTouchStart={(e) => handleStart(idx, e)}
                      >
                        <div className="w-12 sm:w-10 h-4 sm:h-5 cr-lever" />
                      </div>
                    </div>
                  </div>
              ))}
            </div>
            </div>

            <div className="ws3-cam-bezel rounded-md px-1.5 pt-1.5 pb-1">
              <div className="ws5-crt-screen ws5-crt-text pt-1 pb-1.5 text-[20px] sm:text-[22px] leading-none" style={{ borderRadius: "10px / 8px" }}>
                <div className="relative z-[1] grid grid-cols-5 sm:grid-cols-10 gap-y-1 text-center tabular-nums">
                  {controlRods.map((rod, idx) => (
                    <span key={rod.id} aria-label={`Rod ${rod.id}: ${rod.stuck ? "jammed" : `${setPosition(rod, idx)}%`}`}>
                      {rod.stuck ? <span className="ws5-crt-inverse">JAM</span> : setPosition(rod, idx)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="cr-skala-chin !pt-1" aria-hidden="true">
                <span>SKALA · Rod set position %</span>
                <span className="flex-1" />
                <span className="ws5-manual-vent" />
                <span className="ws5-manual-vent" />
              </div>
            </div>
          </div>
        </div>

        <MachineGuide steps={MACHINE_GUIDES.rods} onOpenChange={onGuideChange} />
      </DialogContent>
    </Dialog>
  )
}
