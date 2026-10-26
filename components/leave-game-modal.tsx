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

        {/* Laid out like every other dialog, so red still means back out: quitting is amber, for caution
            (owner, 2026-10-26) */}
        <div className="flex gap-3">
          <span className="cr-lens-bezel flex-1">
            <button onClick={onConfirm} className="cr-lens cr-lens-amber w-full h-12">
              Quit
            </button>
          </span>
          <span className="cr-lens-bezel flex-1">
            <button onClick={() => onOpenChange(false)} className="cr-lens cr-lens-red w-full h-12">
              Cancel
            </button>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
