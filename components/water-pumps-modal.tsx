"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { GripSwitch, JewelLamp } from "@/components/switchgear"
import type { WaterPump } from "@/lib/types"

interface WaterPumpsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  waterPumps: WaterPump[]
  onUpdate: (pumps: WaterPump[]) => void
}

export default function WaterPumpsModal({ open, onOpenChange, waterPumps, onUpdate }: WaterPumpsModalProps) {
  const [tempStates, setTempStates] = useState<boolean[]>([])

  // Initialise only when the modal opens: pump flow changes every second and must not reset choices.
  useEffect(() => {
    if (open) {
      setTempStates(waterPumps.map((pump) => pump.on))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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
      <DialogContent className="cr-dialog sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Water Pumps</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="cr-note px-3 py-2 uppercase text-center">A pump cools the core only when ON and POWERED.</div>

          {/* One switchgear bay per pump: ON lights when the switch is on and the pump has power */}
          <div className="grid grid-cols-2 gap-3">
            {waterPumps.map((pump, idx) => {
              const on = tempStates[idx] ?? pump.on
              return (
                <div key={pump.id} className="cr-module p-2.5 pb-4 flex flex-col items-center gap-3">
                  <Label htmlFor={`pump-${pump.id}`} className="cr-dymo">
                    Pump {pump.id}
                  </Label>

                  <div className="flex gap-2.5 sm:gap-4" aria-hidden="true">
                    <JewelLamp colour="green" lit={on && pump.powered} caption="On" />
                    <JewelLamp colour="amber" lit={pump.powered} caption="Power" />
                    <JewelLamp colour="red" lit={pump.tripped} caption="Trip" />
                  </div>
                  <span id={`pump-${pump.id}-status`} className="sr-only">
                    {pump.powered ? "Powered" : pump.tripped ? "Tripped" : "No power"}
                  </span>

                  <GripSwitch
                    id={`pump-${pump.id}`}
                    on={on}
                    offLegend="Off"
                    onLegend="On"
                    label={`Pump ${pump.id}`}
                    describedBy={`pump-${pump.id}-status`}
                    onToggle={() => {
                      const newStates = [...tempStates]
                      newStates[idx] = !newStates[idx]
                      setTempStates(newStates)
                    }}
                  />
                </div>
              )
            })}
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
