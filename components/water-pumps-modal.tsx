"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, openOnDialog } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ArcDial } from "@/components/machine-dials"
import MachineGuide from "@/components/machine-guide"
import { GripSwitch, JewelLamp, JobKey } from "@/components/switchgear"
import { useSoundEffect } from "@/hooks/use-sound-effect"
import { MACHINE_GUIDES } from "@/lib/tutorial"
import type { WaterPump } from "@/lib/types"

interface WaterPumpsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  waterPumps: WaterPump[]
  switches: boolean[] // where the switches are set: ahead of the pumps during the balancer's lock
  balance: number // the circulation balance needle
  balancerReady: boolean // the balancer's key can be pressed
  onRunBalancer: () => void
  onThrowSwitch: (idx: number) => void
  onGuideChange: (open: boolean) => void // the shift foreman has come or gone: the game pauses while he talks
}

export default function WaterPumpsModal({ open, onOpenChange, waterPumps, switches, balance, balancerReady, onRunBalancer, onThrowSwitch, onGuideChange }: WaterPumpsModalProps) {
  const playSound = useSoundEffect()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="cr-dialog sm:max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-6 [--dlg-pad:1rem] sm:[--dlg-pad:1.5rem] gap-3 sm:gap-4"
        onOpenAutoFocus={openOnDialog}
      >
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Water Pumps</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* The balancer carries on if the modal closes. Its key is dark until it can run again, and the switches stay
              free throughout, but nothing reaches the pumps during its lock: they act as it ends (owner, 2026-11-06). */}
          <div className="cr-module cr-bay-screws p-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 max-w-60" data-tutorial="pumps-needle">
              <ArcDial kind="pumps" value={balance} />
            </div>
            <JobKey ready={balancerReady} ariaLabel="Run the circulation balancer" tutorial="pumps-balancer" onRun={onRunBalancer} />
          </div>

          {/* One switchgear bay per pump: ON lights when the pump is on and has power. Lamps beside the switch, so the whole
              modal fits a phone with its address bar showing (owner, 2026-11-05). */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3" data-tutorial="pumps-bays">
            {waterPumps.map((pump, idx) => (
                <div key={pump.id} className="cr-module cr-bay-screws cr-pump-bay p-2 pb-2.5 flex flex-col items-center gap-1">
                  <Label htmlFor={`pump-${pump.id}`} className="cr-dymo">
                    Pump {pump.id}
                  </Label>

                  <div className="flex items-center justify-center gap-3 sm:gap-6 w-full">
                    <div className="flex flex-col gap-2.5 pt-3" aria-hidden="true">
                      <JewelLamp beside colour="green" lit={pump.on && pump.powered} caption="On" />
                      <JewelLamp beside colour="amber" lit={pump.powered} caption="Power" />
                      <JewelLamp beside colour="red" lit={pump.tripped} caption="Trip" />
                    </div>
                    <span id={`pump-${pump.id}-status`} className="sr-only">
                      {pump.powered ? "Powered" : pump.tripped ? "Tripped" : "No power"}
                    </span>

                    <GripSwitch
                      id={`pump-${pump.id}`}
                      on={switches[idx]}
                      offLegend="Off"
                      onLegend="On"
                      label={`Pump ${pump.id}`}
                      describedBy={`pump-${pump.id}-status`}
                      onToggle={() => {
                        playSound("pumpSwitch")
                        onThrowSwitch(idx)
                      }}
                    />
                  </div>
                </div>
            ))}
          </div>
        </div>

        <MachineGuide steps={MACHINE_GUIDES.pumps} onOpenChange={onGuideChange} />
      </DialogContent>
    </Dialog>
  )
}
