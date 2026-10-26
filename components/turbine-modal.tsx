"use client"

import type React from "react"
import { Fragment, useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { TurbineMode } from "@/lib/types"

interface TurbineModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turbineMode: TurbineMode
  onUpdate: (mode: TurbineMode) => void
}

// The rotary selector's three positions (owner, 2026-10-26: prototype D). One knob makes the modes exclusive.
// Lamp colours match the turbine lamps on the control panel: grid green, pumps amber; idle is red (owner, 2026-10-26).
const POSITIONS: { mode: TurbineMode; label: string; angle: number; lamp: "green" | "amber" | "red" }[] = [
  { mode: "pumps", label: "Pumps", angle: -60, lamp: "amber" },
  { mode: "idle", label: "Idle", angle: 0, lamp: "red" },
  { mode: "grid", label: "Grid", angle: 60, lamp: "green" },
]

// Legends sit on a circle around the knob's centre (140, 136) in the 280 x 214 selector
const LEGEND_RADIUS = 108

// Dragging the knob sideways turns it one position per this many pixels, once past a small dead zone
const DETENT_PX = 40
const DRAG_DEAD_ZONE_PX = 6

// The lit tile under the selector
const TILES: { mode: TurbineMode; label: string; lit: "green" | "amber" | "red" }[] = [
  { mode: "grid", label: "On Grid", lit: "green" },
  { mode: "pumps", label: "Pumps", lit: "amber" },
  { mode: "idle", label: "Idle", lit: "red" },
]

export default function TurbineModal({ open, onOpenChange, turbineMode, onUpdate }: TurbineModalProps) {
  const [mode, setMode] = useState<TurbineMode>("idle")

  useEffect(() => {
    if (open) {
      setMode(turbineMode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleApply = () => {
    onUpdate(mode)
    onOpenChange(false)
  }

  const current = POSITIONS.findIndex((p) => p.mode === mode)
  const turnTo = (index: number) => setMode(POSITIONS[Math.max(0, Math.min(POSITIONS.length - 1, index))].mode)

  // Press and drag left or right to turn the knob through its detents; it stops at Pumps and Grid.
  // A drag swallows the click that follows it, so only a plain click turns the knob one step clockwise.
  const drag = useRef<{ x: number; from: number; moved: boolean } | null>(null)
  const dragged = useRef(false)

  const handleKnobClick = () => {
    if (dragged.current) {
      dragged.current = false
      return
    }
    // Wraps from Grid back to Pumps
    setMode(POSITIONS[(current + 1) % POSITIONS.length].mode)
  }

  const handleKnobKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault()
      turnTo(current - 1)
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault()
      turnTo(current + 1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cr-dialog sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Turbine</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="cr-note px-3 py-2 uppercase space-y-1">
            <p>
              <span className="font-bold">Grid:</span> steam becomes power output.
            </p>
            <p>
              <span className="font-bold">Pumps:</span> off grid, steam can run the pumps if their supply fails. More steam,
              more pumps. Output is 0.
            </p>
          </div>

          <div className="cr-module p-2.5 flex flex-col items-center gap-2.5">
            <span className="cr-plate">Mode Selector</span>

            <div className="cr-selector">
              <span className="cr-selector-plate" aria-hidden="true" />
              {POSITIONS.map((p) => {
                const rad = (p.angle * Math.PI) / 180
                const selected = p.mode === mode
                return (
                  <Fragment key={p.mode}>
                    <span
                      className="cr-selector-tick"
                      style={{ transform: `rotate(${p.angle}deg) translateY(-66px)` }}
                      aria-hidden="true"
                    />
                    <button
                      aria-pressed={selected}
                      onClick={() => setMode(p.mode)}
                      className={`cr-selector-legend ${selected ? "on" : ""}`}
                      style={{
                        left: `${Math.round(140 + LEGEND_RADIUS * Math.sin(rad))}px`,
                        top: `${Math.round(136 - LEGEND_RADIUS * Math.cos(rad))}px`,
                      }}
                    >
                      <span className={`cr-jewel cr-jewel-${p.lamp} cr-jewel-steady ${selected ? "on" : ""}`} />
                      {p.label}
                    </button>
                  </Fragment>
                )
              })}
              <button
                onClick={handleKnobClick}
                onKeyDown={handleKnobKey}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  dragged.current = false
                  drag.current = { x: e.clientX, from: current, moved: false }
                }}
                onPointerMove={(e) => {
                  const d = drag.current
                  if (!d) return
                  const dx = e.clientX - d.x
                  if (Math.abs(dx) > DRAG_DEAD_ZONE_PX) d.moved = true
                  if (d.moved) turnTo(d.from + Math.round(dx / DETENT_PX))
                }}
                onPointerUp={() => {
                  dragged.current = drag.current?.moved ?? false
                  drag.current = null
                }}
                onPointerCancel={() => {
                  drag.current = null
                }}
                aria-label="Turn the turbine mode selector"
                className="cr-selector-knob"
                style={{ transform: `rotate(${POSITIONS[current]?.angle ?? 0}deg)` }}
              >
                <span className="cr-selector-knob-face" />
                <span className="cr-selector-knob-bar" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full px-1 pb-1">
              {TILES.map((t) => (
                <span key={t.mode} className={`cr-mode-tile ${t.mode === mode ? `on-${t.lit}` : ""}`}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <span className="cr-lens-bezel flex-1">
              <button onClick={handleApply} className="cr-lens w-full h-12">
                Apply
              </button>
            </span>
            <span className="cr-lens-bezel flex-1">
              <button onClick={() => onOpenChange(false)} className="cr-lens cr-lens-red w-full h-12">
                Cancel
              </button>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
