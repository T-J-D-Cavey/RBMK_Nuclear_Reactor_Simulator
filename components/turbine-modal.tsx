"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Power } from "lucide-react"

interface TurbineModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turbineConnected: boolean
  onUpdate: (connected: boolean) => void
}

export default function TurbineModal({ open, onOpenChange, turbineConnected, onUpdate }: TurbineModalProps) {
  const [tempState, setTempState] = useState(false)

  useEffect(() => {
    if (open) {
      setTempState(turbineConnected)
    }
  }, [open, turbineConnected])

  const handleApply = () => {
    onUpdate(tempState)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-primary max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono uppercase text-center">Turbine Control</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-background border-2 border-border p-3 text-xs leading-relaxed">
            <p>
              {
                "Toggle turbine connection. When connected, converts steam into power output. Power Output = Steam Volume × 50 MW."
              }
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 bg-background border-2 border-border p-6">
            <Label htmlFor="turbine" className="font-mono uppercase text-base">
              Turbine Connection
            </Label>
            <button
              onClick={() => setTempState(!tempState)}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                tempState
                  ? "bg-accent border-accent hover:bg-accent/80"
                  : "bg-muted border-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Power className="w-12 h-12 text-foreground" />
            </button>
          </div>

          <div className="bg-background border-2 border-border p-4">
            <div className="text-xs text-muted-foreground font-mono uppercase mb-2">Status</div>
            <div className={`text-lg font-mono font-bold ${tempState ? "text-accent" : "text-muted-foreground"}`}>
              {tempState ? "CONNECTED" : "DISCONNECTED"}
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
