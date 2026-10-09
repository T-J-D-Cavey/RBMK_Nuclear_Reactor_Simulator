"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Power } from "lucide-react"
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

  const status = connected ? "CONNECTED" : supplyPumps ? "SUPPLYING PUMPS" : "DISCONNECTED"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-primary max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono uppercase text-center">Turbine Control</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-background border-2 border-border p-3 text-xs leading-relaxed text-center">
            <p>
              {
                "Toggle turbine connection. When connected, converts steam into power output. When disconnected, the turbine can instead supply the station pumps if their normal supply is lost: more steam powers more pumps, and power output is 0."
              }
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 bg-background border-2 border-border p-6">
            <Label htmlFor="turbine" className="font-mono uppercase text-base">
              Turbine Connection
            </Label>
            <button
              onClick={() => setConnected(!connected)}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                connected
                  ? "bg-accent border-accent hover:bg-accent/80"
                  : "bg-muted border-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Power className="w-12 h-12 text-foreground" />
            </button>
          </div>

          <div
            className={`flex items-center justify-between bg-background border-2 border-border p-4 transition-opacity ${
              connected ? "opacity-50" : ""
            }`}
          >
            <div className="space-y-1">
              <Label className="font-mono uppercase text-sm">Supply Station Pumps</Label>
              <div className="text-xs font-mono text-muted-foreground">
                {connected ? "Disconnect from the grid first" : "Turbine powers the pumps from steam"}
              </div>
            </div>
            <button
              onClick={() => !connected && setSupplyPumps(!supplyPumps)}
              disabled={connected}
              className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all disabled:cursor-not-allowed ${
                !connected && supplyPumps
                  ? "bg-accent border-accent hover:bg-accent/80"
                  : "bg-muted border-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Power className="w-10 h-10 text-foreground" />
            </button>
          </div>

          <div className="bg-background border-2 border-border p-4">
            <div className="text-xs text-muted-foreground font-mono uppercase mb-2">Status</div>
            <div className={`text-lg font-mono font-bold ${connected || supplyPumps ? "text-accent" : "text-muted-foreground"}`}>
              {status}
            </div>
          </div>

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
