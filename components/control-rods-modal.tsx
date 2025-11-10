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

  const handleApply = () => {
    const updatedRods = controlRods.map((rod, idx) => ({
      ...rod,
      insertion: rod.stuck ? rod.insertion : Math.max(0, Math.min(100, tempValues[idx] || 0)),
    }))
    onUpdate(updatedRods)
    onOpenChange(false)
  }

  const handleAZ5 = () => {
    const newValues = controlRods.map((rod) => (rod.stuck ? tempValues[rod.id - 1] : 100))
    setTempValues(newValues)
  }

  const handleMouseDown = (idx: number, e: React.MouseEvent) => {
    if (!controlRods[idx].stuck) {
      e.preventDefault()
      setIsDragging(idx)
    }
  }

  const handleMouseMove = (e: React.MouseEvent | MouseEvent, idx: number, containerHeight: number) => {
    if (isDragging === idx) {
      const container = document.getElementById(`rod-container-${idx}`)
      if (container) {
        const rect = container.getBoundingClientRect()
        const y = Math.max(0, Math.min(containerHeight, e.clientY - rect.top))
        const percentage = Math.round((y / containerHeight) * 100)
        const newValues = [...tempValues]
        newValues[idx] = percentage
        setTempValues(newValues)
      }
    }
  }

  const handleMouseUp = () => {
    setIsDragging(null)
  }

  useEffect(() => {
    if (isDragging !== null) {
      const container = document.getElementById(`rod-container-${isDragging}`)
      if (container) {
        const containerHeight = container.clientHeight

        const handleMove = (e: MouseEvent) => handleMouseMove(e, isDragging, containerHeight)
        const handleUp = () => setIsDragging(null)

        document.addEventListener("mousemove", handleMove)
        document.addEventListener("mouseup", handleUp)

        return () => {
          document.removeEventListener("mousemove", handleMove)
          document.removeEventListener("mouseup", handleUp)
        }
      }
    }
  }, [isDragging, tempValues])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-primary max-w-[95vw] w-full max-h-screen h-screen overflow-y-auto p-2 sm:p-4">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-mono uppercase text-center">Control Rods</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="bg-background border-2 border-border p-2 text-[10px] sm:text-xs leading-relaxed">
            <p>
              {
                "Drag the LEVER HANDLES to adjust rod insertion (0-100%). Rods are 95% Boron (decreases radioactivity) and 5% Graphite tips (increases radioactivity). Use AZ5 button for emergency full insertion."
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
              AZ-5 EMERGENCY SCRAM
            </Button>
          </div>

          <div className="flex justify-center gap-1 sm:gap-2 p-2">
            {controlRods.map((rod, idx) => {
              const currentInsertion = tempValues[idx] ?? rod.insertion
              return (
                <div key={rod.id} className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <Label className="font-mono text-[10px] sm:text-xs font-bold">R{rod.id}</Label>
                    {rod.stuck && <AlertCircle className="h-3 w-3 text-destructive" />}
                  </div>

                  <div className="w-6 sm:w-8 h-2 sm:h-3 bg-accent border border-primary rounded-t" />

                  <div
                    id={`rod-container-${idx}`}
                    className="relative w-6 sm:w-8 h-48 sm:h-56 bg-muted border-2 border-border rounded-b"
                  >
                    <div
                      className={`absolute top-0 left-0 w-full ${rod.stuck ? "bg-destructive" : "bg-primary"}`}
                      style={{
                        height: `${currentInsertion}%`,
                      }}
                    />

                    <div
                      className={`absolute left-1/2 -translate-x-1/2 w-10 sm:w-12 h-5 sm:h-6 border-2 flex items-center justify-center text-[9px] sm:text-[11px] font-mono font-bold ${
                        rod.stuck
                          ? "bg-destructive border-destructive text-destructive-foreground cursor-not-allowed"
                          : "bg-primary border-primary text-primary-foreground cursor-grab active:cursor-grabbing hover:bg-opacity-80"
                      }`}
                      style={{
                        top: `${currentInsertion}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      onMouseDown={(e) => handleMouseDown(idx, e)}
                    >
                      {currentInsertion}%
                    </div>
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
