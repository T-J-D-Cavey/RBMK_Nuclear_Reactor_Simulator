"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { GameMode } from "@/lib/types"
import { MODE_MENU, MODE_MENU_TAGLINE } from "@/lib/mode-menu"

interface DifficultyModalProps {
  open: boolean
  onSelectDifficulty: (mode: GameMode) => void
  onOpenChange: (open: boolean) => void
}

export function DifficultyModal({ open, onSelectDifficulty, onOpenChange }: DifficultyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cr-dialog sm:max-w-2xl max-h-[90dvh] overflow-y-auto" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Select Mode</DialogTitle>
          <DialogDescription className="text-center font-mono text-xs sm:text-sm text-neutral-700 pt-1">
            {MODE_MENU_TAGLINE}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODE_MENU.map(({ mode, name, specs, lamp, key, action }) => (
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
              <span className="cr-lens-bezel w-full">
                <button data-mode={mode} onClick={() => onSelectDifficulty(mode)} className={`cr-lens ${key} w-full h-12`}>
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
