"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ControlRod } from "@/lib/types"
import { AlertCircle } from "lucide-react"

interface ControlRodsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  controlRods: ControlRod[]
  onUpdate: (rods: ControlRod[]) => void
}

export default function ControlRodsModal({ open, onOpenChange, controlRods, onUpdate }: ControlRodsModalProps) {
  const [tempValues, setTempValues] = useState<number[]>([])
  const [isDragging, setIsDragging] = useState<number | null>(null)

  // Levers show where each rod has been ordered to go (the panel shows where it actually is).
  // Initialise only when the modal opens: rods move every second and must not reset a lever mid-drag.
  useEffect(() => {
    if (open) {
      setTempValues(controlRods.map((rod) => rod.target))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleApply = () => {
    const updatedRods = controlRods.map((rod, idx) =>
      rod.stuck ? rod : { ...rod, target: Math.max(0, Math.min(100, tempValues[idx] ?? rod.target)) },
    )
    onUpdate(updatedRods)
    onOpenChange(false)
  }

  // AZ-5 takes effect with a single press: every rod that isn't jammed is driven toward 100% (bible §10).
  const handleAZ5 = () => {
    onUpdate(controlRods.map((rod) => (rod.stuck ? rod : { ...rod, target: 100 })))
    onOpenChange(false)
  }

  const setLeverFromPointer = (idx: number, clientY: number) => {
    const container = document.getElementById(`rod-container-${idx}`)
    if (!container) return
    const rect = container.getBoundingClientRect()
    const y = Math.max(0, Math.min(container.clientHeight, clientY - rect.top))
    const percentage = Math.round((y / container.clientHeight) * 100)
    setTempValues((prev) => {
      const next = [...prev]
      next[idx] = percentage
      return next
    })
  }

  // A drag can start anywhere on the rod's track or the handle's enlarged grab area.
  const handleStart = (idx: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!controlRods[idx].stuck) {
      // touching the lever shouldn't scroll the modal or select text
      e.stopPropagation()
      if (!("touches" in e)) e.preventDefault()
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
      setLeverFromPointer(idx, clientY)
      setIsDragging(idx)
    }
  }

  const handleMove = (e: MouseEvent | TouchEvent, idx: number) => {
    // Prevent scrolling on mobile while dragging
    if (e.cancelable) e.preventDefault()
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    setLeverFromPointer(idx, clientY)
  }

  useEffect(() => {
    if (isDragging !== null) {
      const container = document.getElementById(`rod-container-${isDragging}`)
      if (container) {
        const handleMoveEvent = (e: MouseEvent | TouchEvent) => handleMove(e, isDragging)
        const handleEnd = () => setIsDragging(null)

        // { passive: false } is required to allow e.preventDefault() in touch events
        document.addEventListener("mousemove", handleMoveEvent)
        document.addEventListener("mouseup", handleEnd)
        document.addEventListener("touchmove", handleMoveEvent, { passive: false })
        document.addEventListener("touchend", handleEnd)

        return () => {
          document.removeEventListener("mousemove", handleMoveEvent)
          document.removeEventListener("mouseup", handleEnd)
          document.removeEventListener("touchmove", handleMoveEvent)
          document.removeEventListener("touchend", handleEnd)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-primary max-w-2xl w-full max-h-[90vh] overflow-y-auto p-2 sm:p-6 select-none">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-mono uppercase text-center">Control Rods</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-background border-2 border-border p-2 text-[10px] sm:text-xs leading-relaxed text-center">
            <p>
              Drag the LEVERS to adjust rod insertion (0-100%). A higher insertion percentage for any rod will reduce
              radioactivity.
            </p>
            <p className="mt-1">Rods take about 18 seconds to travel their full length.</p>
            <p className="mt-1 font-bold">Use AZ5 button for emergency full insertion.</p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleAZ5}
              size="sm"
              variant="destructive"
              className="uppercase font-mono tracking-wider px-8 py-2 text-sm sm:text-base border-2"
            >
              AZ-5
            </Button>
          </div>

          {/* GRID LAYOUT */}
          <div className="grid grid-cols-5 gap-x-1 gap-y-4 p-2 justify-items-center">
            {controlRods.map((rod, idx) => {
              const currentInsertion = tempValues[idx] ?? rod.insertion
              return (
                <div key={rod.id} className="flex flex-col items-center gap-1 w-full">
                  
                  {/* Header Label */}
                  <div className="flex items-center gap-1 h-5">
                    <Label className="font-mono text-xs sm:text-sm font-bold">R{rod.id}</Label>
                    {rod.stuck && <AlertCircle className="h-3 w-3 text-destructive" />}
                  </div>

                  {/* Top Cap */}
                  <div className="w-8 sm:w-6 h-2 sm:h-3 bg-accent border border-primary rounded-t" />

                  {/* Rod Track */}
                  <div
                    id={`rod-container-${idx}`}
                    className={`relative w-8 sm:w-6 h-36 sm:h-48 bg-muted border-2 border-border rounded-b touch-none ${
                      rod.stuck ? "cursor-not-allowed" : "cursor-grab"
                    }`}
                    onMouseDown={(e) => handleStart(idx, e)}
                    onTouchStart={(e) => handleStart(idx, e)}
                  >
                    <div
                      className={`absolute top-0 left-0 w-full ${rod.stuck ? "bg-destructive" : "bg-primary"}`}
                      style={{
                        height: `${currentInsertion}%`,
                      }}
                    />

                    {/* Draggable Lever Handle, inside a transparent fingertip-sized grab area */}
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-11 flex items-center justify-center touch-none ${
                        rod.stuck ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
                      }`}
                      style={{
                        top: `${currentInsertion}%`,
                      }}
                      onMouseDown={(e) => handleStart(idx, e)}
                      onTouchStart={(e) => handleStart(idx, e)}
                    >
                      <div
                        className={`w-12 sm:w-10 h-4 sm:h-5 rounded-sm shadow-sm ${rod.stuck ? "bg-destructive" : "bg-foreground"}`}
                      />
                    </div>
                  </div>

                  <span className="font-mono text-[10px] sm:text-xs font-bold mt-1">{currentInsertion}%</span>
                </div>
              )
            })}
          </div>

          <div className="flex gap-4 pt-4">
            <Button onClick={handleApply} className="flex-1 uppercase font-mono h-10 sm:h-11">
              Apply Changes
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 uppercase font-mono border-2 h-10 sm:h-11"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
