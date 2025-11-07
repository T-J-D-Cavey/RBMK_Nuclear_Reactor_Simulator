"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-primary max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono uppercase text-center">Control Rods</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-background border-2 border-border p-3 text-xs leading-relaxed">
            <p>
              {
                "Adjust insertion percentage (0-100%). Rods are 95% Boron (decreases radioactivity) and 5% Graphite tips (increases radioactivity)."
              }
            </p>
          </div>

          {controlRods.map((rod, idx) => (
            <div key={rod.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={`rod-${rod.id}`} className="font-mono uppercase text-sm">
                  Rod {rod.id}
                </Label>
                {rod.stuck && (
                  <div className="flex items-center gap-1 text-destructive text-xs font-mono">
                    <AlertCircle className="h-3 w-3" />
                    STUCK
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Slider
                  id={`rod-${rod.id}`}
                  min={0}
                  max={100}
                  step={1}
                  value={[tempValues[idx] ?? rod.insertion]}
                  onValueChange={(value) => {
                    const newValues = [...tempValues]
                    newValues[idx] = value[0]
                    setTempValues(newValues)
                  }}
                  disabled={rod.stuck}
                  className="flex-1"
                />
                <span className="font-mono text-lg font-bold min-w-[3.5rem] text-right">
                  {tempValues[idx] ?? rod.insertion}%
                </span>
              </div>
              {/* Visual indicator */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${rod.stuck ? "bg-destructive" : "bg-accent"}`}
                  style={{ width: `${rod.insertion}%` }}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleApply} className="flex-1 uppercase font-mono">
              Apply
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 uppercase font-mono border-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
