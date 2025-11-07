"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
          <div className="bg-background border-2 border-border p-3 text-xs leading-relaxed">
            <p>
              {
                "Toggle pumps On/Off. Pumps reduce reactor temperature when both ON and powered. Each pump reduces temp by ~0.5 units/second."
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
              <Switch
                id={`pump-${pump.id}`}
                checked={tempStates[idx] ?? pump.on}
                onCheckedChange={(checked) => {
                  const newStates = [...tempStates]
                  newStates[idx] = checked
                  setTempStates(newStates)
                }}
                className="data-[state=checked]:bg-accent"
              />
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
