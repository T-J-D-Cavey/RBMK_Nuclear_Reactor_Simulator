"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { GameMode } from "@/lib/types"

interface DifficultyModalProps {
  open: boolean
  onSelectDifficulty: (mode: GameMode) => void
  onOpenChange: (open: boolean) => void
}

// What to expect, not what will happen (owner, 2026-10-13): no event counts or target sizes.
const MODES: { mode: GameMode; name: string; specs: string[]; lamp: string; key: string; action: string }[] = [
  {
    mode: "easy",
    name: "Easy Mode",
    specs: ["Shorter shift", "Steady demands", "Fewer surprises"],
    lamp: "bg-green-400 text-green-400",
    key: "cr-key-green",
    action: "Start Easy",
  },
  {
    mode: "hard",
    name: "Hard Mode",
    specs: ["Longer shift", "Tougher demands", "More to deal with"],
    lamp: "bg-red-500 text-red-500",
    key: "cr-key-red-lit",
    action: "Start Hard",
  },
  {
    mode: "free",
    name: "Free Mode",
    specs: ["No time limit", "No demands", "Learn the reactor"],
    lamp: "bg-sky-400 text-sky-400",
    key: "cr-key-blue",
    action: "Start Free",
  },
  {
    mode: "safety_test",
    name: "Safety Test",
    specs: ["The night of 26 April 1986", "Follow the test team's orders", "Can you save Unit 4?"],
    lamp: "bg-amber-400 text-amber-400",
    key: "cr-key-amber-lit",
    action: "Begin Test",
  },
]

export function DifficultyModal({ open, onSelectDifficulty, onOpenChange }: DifficultyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cr-dialog sm:max-w-2xl max-h-[90dvh] overflow-y-auto" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Select Mode</DialogTitle>
          <DialogDescription className="text-center font-mono text-xs sm:text-sm text-neutral-700 pt-1">
            Same reactor in every mode. Only the workload changes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODES.map(({ mode, name, specs, lamp, key, action }) => (
            <div key={mode} className="cr-module p-3 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className={`retro-lamp on inline-block w-3 h-3 shrink-0 ${lamp}`} aria-hidden="true" />
                <h3 className="cr-plate flex-1 !justify-start !text-sm">{name}</h3>
              </div>
              <ul className="cr-note px-3 py-2 space-y-0.5 uppercase flex-1">
                {specs.map((spec) => (
                  <li key={spec}>{spec}</li>
                ))}
              </ul>
              <span className="cr-bezel w-full">
                <button data-mode={mode} onClick={() => onSelectDifficulty(mode)} className={`cr-key ${key} w-full h-11`}>
                  {action}
                </button>
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
