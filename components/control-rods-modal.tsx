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

  useEffect(() => {
    if (open) {
      setTempValues(controlRods.map((rod) => rod.insertion))
    }
  }, [open, controlRods])

/*
  const handleApply = () => {
    const updatedRods = controlRods.map((rod, idx) => ({
      ...rod,
      insertion: rod.stuck ? rod.insertion : Math.max(0, Math.min(100, tempValues[idx] || 0)),
      wasFullyRemoved: rod.insertion == 0 ? true : false;
    }))
    onUpdate(updatedRods)
    onOpenChange(false)
  }
  */
  const handleApply = () => {
      const updatedRods = controlRods.map((rod, idx) => {
          
          // 1. Calculate the NEW insertion value first
          const newInsertion = rod.stuck 
              ? rod.insertion 
              : Math.max(0, Math.min(100, tempValues[idx] || 0));
  
          // --- Calculate NEW Flag Values ---
          
          // A. currentlyFullyRemoved: TRUE if the new insertion value is 0.
          const newCurrentlyFullyRemoved = newInsertion === 0;
  
          // B. justReinserted: TRUE if the rod *was* fully removed (old state) 
          //    AND the new insertion value is > 0.
          const newJustReinserted = rod.currentlyFullyRemoved && newInsertion > 0;
          
          // 3. Return the new rod object with updated properties
          return {
              ...rod,
              insertion: newInsertion, 
              currentlyFullyRemoved: newCurrentlyFullyRemoved,
              justReinserted: newJustReinserted
          };
      });
      
      // Pass the state update to your state management system
      onUpdate(updatedRods);
      onOpenChange(false);
  }

  const handleAZ5 = () => {
    const newValues = controlRods.map((rod) => (rod.stuck ? tempValues[rod.id - 1] : 100))
    setTempValues(newValues)
  }

  const handleStart = (idx: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!controlRods[idx].stuck) {
      e.preventDefault()
      setIsDragging(idx)
    }
  }

  const handleMove = (e: MouseEvent | TouchEvent, idx: number, containerHeight: number) => {
    if (isDragging === idx) {
      const container = document.getElementById(`rod-container-${idx}`)
      if (container) {
        const rect = container.getBoundingClientRect()
        const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
        const y = Math.max(0, Math.min(containerHeight, clientY - rect.top))
        const percentage = Math.round((y / containerHeight) * 100)
        const newValues = [...tempValues]
        newValues[idx] = percentage
        setTempValues(newValues)
      }
    }
  }

  useEffect(() => {
    if (isDragging !== null) {
      const container = document.getElementById(`rod-container-${isDragging}`)
      if (container) {
        const containerHeight = container.clientHeight

        const handleMoveEvent = (e: MouseEvent | TouchEvent) => handleMove(e, isDragging, containerHeight)
        const handleEnd = () => setIsDragging(null)

        document.addEventListener("mousemove", handleMoveEvent)
        document.addEventListener("mouseup", handleEnd)
        document.addEventListener("touchmove", handleMoveEvent)
        document.addEventListener("touchend", handleEnd)

        return () => {
          document.removeEventListener("mousemove", handleMoveEvent)
          document.removeEventListener("mouseup", handleEnd)
          document.removeEventListener("touchmove", handleMoveEvent)
          document.removeEventListener("touchend", handleEnd)
        }
      }
    }
  }, [isDragging, tempValues])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-primary max-w-[95vw] w-full max-h-screen h-auto overflow-y-auto p-2 sm:p-4">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-mono uppercase text-center">Control Rods</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="bg-background border-2 border-border p-2 text-[10px] sm:text-xs leading-relaxed text-center">
            <p>
              {
                "Drag the LEVERS to adjust rod insertion (0-100%)."
              }
            </p>
                      <p>
              {
                "Use AZ5 button for emergency full insertion."
              }
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleAZ5}
              size="sm"
              variant="destructive"
              className="uppercase font-mono tracking-wider px-4 py-2 text-sm sm:text-base border-2"
            >
              AZ-5
            </Button>
          </div>

          <div className="flex justify-center gap-2 p-2">
            {controlRods.map((rod, idx) => {
              const currentInsertion = tempValues[idx] ?? rod.insertion
              return (
                <div key={rod.id} className="flex flex-col items-center gap-1 min-w-7">
                  <div className="flex items-center gap-1">
                    <Label className="font-mono text-[10px] sm:text-xs font-bold">R{rod.id}</Label>
                    {rod.stuck && <AlertCircle className="h-3 w-3 text-destructive" />}
                  </div>

                  <div className="w-4 sm:w-5 h-2 sm:h-3 bg-accent border border-primary rounded-t" />

                  <div
                    id={`rod-container-${idx}`}
                    className="relative w-4 sm:w-5 h-48 sm:h-56 bg-muted border-2 border-border rounded-b"
                  >
                    <div
                      className={`absolute top-0 left-0 w-full ${rod.stuck ? "bg-destructive" : "bg-primary"}`}
                      style={{
                        height: `${currentInsertion}%`,
                      }}
                    />

                    {/* Thin draggable lever line */}
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 w-5 sm:w-4 h-1 ${
                        rod.stuck
                          ? "bg-destructive cursor-not-allowed"
                          : "bg-foreground cursor-grab active:cursor-grabbing hover:bg-primary"
                      }`}
                      style={{
                        top: `${currentInsertion}%`,

                      }}
                      onMouseDown={(e) => handleStart(idx, e)}
                      onTouchStart={(e) => handleStart(idx, e)}
                    />
                  </div>

                  <span className="font-mono text-[10px] sm:text-xs font-bold">{currentInsertion}%</span>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleApply} className="flex-1 uppercase font-mono text-xs sm:text-sm">
              Apply
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 uppercase font-mono border-2 text-xs sm:text-sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
