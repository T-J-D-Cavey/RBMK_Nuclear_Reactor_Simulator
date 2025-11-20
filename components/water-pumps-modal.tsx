"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { WaterPump } from "@/lib/types"
import { Power } from "lucide-react"

interface WaterPumpsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  waterPumps: WaterPump[]
  onUpdate: (pumps: WaterPump[]) => void
}

export default function WaterPumpsModal({ open, onOpenChange, waterPumps, onUpdate }: WaterPumpsModalProps) {
  const [tempStates, setTempStates] = useState<boolean[]>([])

  useEffect(() => {
    if (open) {
      setTempStates(waterPumps.map((pump) => pump.on))
    }
  }, [open, waterPumps])

  const handleApply = () => {
    const updatedPumps = waterPumps.map((pump, idx) => ({
      ...pump,
      on: tempStates[idx],
    }))
    onUpdate(updatedPumps)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-primary max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono uppercase text-center">Water Pumps</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-background border-2 border-border p-3 text-xs leading-relaxed text-center">
            <p>
              {
                "Toggle water pumps On/Off. Pumps reduce reactor temperature when both ON and POWERED."
              }
            </p>
          </div>

          {waterPumps.map((pump, idx) => (
            <div key={pump.id} className="flex items-center justify-between bg-background border-2 border-border p-4">
              <div className="space-y-1">
                <Label htmlFor={`pump-${pump.id}`} className="font-mono uppercase text-sm">
                  Pump {pump.id}
                </Label>
                <div className="flex items-center gap-2">
                  <Power className={`h-4 w-4 ${pump.powered ? "text-accent" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-mono ${pump.powered ? "text-accent" : "text-muted-foreground"}`}>
                    {pump.powered ? "POWERED" : "NO POWER"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  const newStates = [...tempStates]
                  newStates[idx] = !newStates[idx]
                  setTempStates(newStates)
                }}
                className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all ${
                  (tempStates[idx] ?? pump.on)
                    ? "bg-accent border-accent hover:bg-accent/80"
                    : "bg-muted border-muted-foreground hover:bg-muted/80"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-foreground" fill="currentColor">
                  <circle cx="12" cy="12" r="2" />
                  <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="2" />
                  <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
                  <line x1="4.22" y1="4.22" x2="7.05" y2="7.05" stroke="currentColor" strokeWidth="2" />
                  <line x1="16.95" y1="16.95" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" />
                  <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="2" />
                  <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
                  <line x1="4.22" y1="19.78" x2="7.05" y2="16.95" stroke="currentColor" strokeWidth="2" />
                  <line x1="16.95" y1="7.05" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
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
