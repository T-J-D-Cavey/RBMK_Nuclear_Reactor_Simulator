"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Power, Zap } from "lucide-react"
import type { TurbineMode } from "@/lib/types"

interface TurbineModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turbineMode: TurbineMode
  onUpdate: (mode: TurbineMode) => void
}

export default function TurbineModal({ open, onOpenChange, turbineMode, onUpdate }: TurbineModalProps) {
  const [connected, setConnected] = useState(false)
  const [supplyPumps, setSupplyPumps] = useState(false)

  useEffect(() => {
    if (open) {
      setConnected(turbineMode === "grid")
      setSupplyPumps(turbineMode === "pumps")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleApply = () => {
    onUpdate(connected ? "grid" : supplyPumps ? "pumps" : "idle")
    onOpenChange(false)
  }

  const status = connected ? "ON GRID" : supplyPumps ? "PUMPS" : "IDLE"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cr-dialog sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Turbine</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="cr-note px-3 py-2 uppercase space-y-1">
            <p>
              <span className="font-bold">Grid:</span> steam becomes power output.
            </p>
            <p>
              <span className="font-bold">Pumps:</span> off grid, steam can run the pumps if their supply fails. More steam,
              more pumps. Output is 0.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="cr-module p-2.5 flex flex-col items-center gap-3">
              <Label htmlFor="turbine" className="cr-plate w-full">
                Grid
              </Label>
              <span className="cr-round-bezel">
                <button
                  id="turbine"
                  aria-pressed={connected}
                  onClick={() => setConnected(!connected)}
                  className={`cr-round-key w-16 h-16 ${connected ? "on" : ""}`}
                >
                  <Power className="w-8 h-8" />
                </button>
              </span>
            </div>

            <div className={`cr-module p-2.5 flex flex-col items-center gap-3 transition-opacity ${connected ? "opacity-60" : ""}`}>
              <Label htmlFor="turbine-pumps" className="cr-plate w-full">
                Pumps
              </Label>
              <span className="cr-round-bezel">
                <button
                  id="turbine-pumps"
                  aria-pressed={!connected && supplyPumps}
                  onClick={() => !connected && setSupplyPumps(!supplyPumps)}
                  disabled={connected}
                  title={connected ? "Disconnect from the grid first" : undefined}
                  className={`cr-round-key w-16 h-16 ${!connected && supplyPumps ? "on" : ""}`}
                >
                  <Zap className="w-8 h-8" />
                </button>
              </span>
              {connected && <span className="font-mono text-[10px] font-bold uppercase text-neutral-700 -mt-1">Leave grid first</span>}
            </div>
          </div>

          <div className="cr-module p-2.5 flex items-center gap-3">
            <div className="cr-plate">Status</div>
            <div className="cr-screen-bezel flex-1">
              <div className={`led-display text-center text-base ${connected || supplyPumps ? "led-green" : "led-amber"}`}>
                {status}
              </div>
            </div>
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
