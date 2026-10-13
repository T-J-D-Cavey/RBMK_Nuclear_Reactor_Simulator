"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
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

          <div className="grid grid-cols-2 gap-3">
            {waterPumps.map((pump, idx) => {
              const on = tempStates[idx] ?? pump.on
              return (
                <div key={pump.id} className="cr-module p-2.5 flex flex-col items-center gap-2.5">
                  <Label htmlFor={`pump-${pump.id}`} className="cr-plate w-full">
                    Pump {pump.id}
                  </Label>

                  <span className="cr-round-bezel">
                    <button
                      id={`pump-${pump.id}`}
                      aria-pressed={on}
                      onClick={() => {
                        const newStates = [...tempStates]
                        newStates[idx] = !newStates[idx]
                        setTempStates(newStates)
                      }}
                      className={`cr-round-key w-16 h-16 ${on ? "on" : ""}`}
                    >
                      <svg viewBox="0 0 24 24" className="w-9 h-9" fill="currentColor" aria-hidden="true">
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
                  </span>

                  <div className="w-full flex items-center justify-between gap-2 font-mono text-[10px] sm:text-[11px] font-bold uppercase">
                    <span className={on ? "text-green-800" : "text-neutral-600"}>{on ? "On" : "Off"}</span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`retro-lamp inline-block w-2.5 h-2.5 ${
                          pump.powered
                            ? "bg-amber-400 text-amber-400 on"
                            : pump.tripped
                              ? "bg-red-500 text-red-500 on animate-[pulse_1s_ease-in-out_infinite]"
                              : "bg-amber-900/30"
                        }`}
                      />
                      <span className={pump.powered ? "text-amber-800" : pump.tripped ? "text-red-700" : "text-neutral-600"}>
                        {pump.powered ? "Powered" : pump.tripped ? "Tripped" : "No power"}
                      </span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 pt-1">
            <span className="cr-bezel flex-1">
              <button onClick={handleApply} className="cr-key cr-key-green w-full h-11">
                Apply
              </button>
            </span>
            <span className="cr-bezel flex-1">
              <button onClick={() => onOpenChange(false)} className="cr-key cr-key-cream w-full h-11">
                Cancel
              </button>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
