"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ArcDial } from "@/components/machine-dials"
import MachineGuide from "@/components/machine-guide"
import { GripSwitch, JewelLamp, JobKey } from "@/components/switchgear"
import { MACHINE_GUIDES } from "@/lib/tutorial"
import type { WaterPump } from "@/lib/types"

interface WaterPumpsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  waterPumps: WaterPump[]
  balance: number // the circulation balance needle
  balancerReady: boolean // the balancer's key can be pressed
  locked: boolean // the balancer has the pump switches
  onRunBalancer: () => void
  onUpdate: (pumps: WaterPump[]) => void
  onGuideChange: (open: boolean) => void // the shift foreman has come or gone: the game pauses while he talks
}

export default function WaterPumpsModal({ open, onOpenChange, waterPumps, balance, balancerReady, locked, onRunBalancer, onUpdate, onGuideChange }: WaterPumpsModalProps) {
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
      {/* Opens on the first switch, not the first key in the page: the balancer runs at once, so Enter mustn't press it by accident */}
      <DialogContent
        className="cr-dialog sm:max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-6 [--dlg-pad:1rem] sm:[--dlg-pad:1.5rem] gap-3 sm:gap-4"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          document.getElementById(`pump-${waterPumps[0].id}`)?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Water Pumps</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* The balancer runs at once, like AZ-5, with no Apply, and carries on if the modal closes. Its key is dark until
              it can run again, and the switches stay free throughout: only Apply waits for the lock to end, so nothing can
              reach the pumps during it (owner, 2026-11-05). */}
          <div className="cr-module cr-bay-screws p-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 max-w-60" data-tutorial="pumps-needle">
              <ArcDial kind="pumps" value={balance} />
            </div>
            <JobKey ready={balancerReady} ariaLabel="Run the circulation balancer" tutorial="pumps-balancer" onRun={onRunBalancer} />
          </div>

          {/* One switchgear bay per pump: ON lights when the switch is on and the pump has power. Lamps beside the switch,
              so the whole modal fits a phone with its address bar showing (owner, 2026-11-05). */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3" data-tutorial="pumps-bays">
            {waterPumps.map((pump, idx) => {
              const on = tempStates[idx] ?? pump.on
              return (
                <div key={pump.id} className="cr-module cr-bay-screws cr-pump-bay p-2 pb-2.5 flex flex-col items-center gap-1">
                  <Label htmlFor={`pump-${pump.id}`} className="cr-dymo">
                    Pump {pump.id}
                  </Label>

                  <div className="flex items-center justify-center gap-3 sm:gap-6 w-full">
                    <div className="flex flex-col gap-2.5 pt-3" aria-hidden="true">
                      <JewelLamp beside colour="green" lit={on && pump.powered} caption="On" />
                      <JewelLamp beside colour="amber" lit={pump.powered} caption="Power" />
                      <JewelLamp beside colour="red" lit={pump.tripped} caption="Trip" />
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
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 pt-1">
            <span className="cr-lens-bezel flex-1">
              <button onClick={handleApply} disabled={locked} className="cr-lens cr-lens-dark w-full h-12">
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

        <MachineGuide steps={MACHINE_GUIDES.pumps} onOpenChange={onGuideChange} />
      </DialogContent>
    </Dialog>
  )
}
