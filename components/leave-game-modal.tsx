"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"

interface LeaveGameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function LeaveGameModal({ open, onOpenChange, onConfirm }: LeaveGameModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cr-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="cr-dialog-title cr-dialog-title-danger">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            End Simulation?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="cr-note px-3 py-2.5 uppercase text-center !text-[0.8rem] mt-2">
              Quitting ends this shift for good.
              <br />
              To keep it, pause and close the tab instead.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="cr-hazard h-2.5 rounded-[2px]" aria-hidden="true" />

        <div className="flex gap-3">
          <span className="cr-bezel flex-1">
            <button onClick={() => onOpenChange(false)} className="cr-key cr-key-cream w-full h-11">
              Cancel
            </button>
          </span>
          <span className="cr-bezel flex-1">
            <button onClick={onConfirm} className="cr-key cr-key-red-lit w-full h-11">
              Quit
            </button>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
