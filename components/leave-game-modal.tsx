"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface LeaveGameModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function LeaveGameModal({ open, onOpenChange, onConfirm }: LeaveGameModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-4 border-destructive bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-xl font-bold">
            <AlertTriangle className="h-6 w-6" />
            QUIT GAME?
          </DialogTitle>
          <DialogDescription className="text-base font-mono pt-4">
            You'll lose your progress if you quite the simulation. Press the pause button to save:
          </DialogDescription>
        </DialogHeader>
        <div className="px-6">
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground font-mono">
            <li>Current performance score</li>
            <li>Game time and statistics</li>
            <li>Control rod and pump configurations</li>
            <li>Active events and event history</li>
          </ul>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-mono">
            CANCEL - Stay in Control
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="font-mono font-bold">
            CONFIRM - Abandon Reactor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
