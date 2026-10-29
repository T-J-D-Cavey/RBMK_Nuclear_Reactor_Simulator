"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { GameMode } from "@/lib/types"
import { MODE_MENU, MODE_MENU_TAGLINE } from "@/lib/mode-menu"

interface DifficultyModalProps {
  open: boolean
  onSelectDifficulty: (mode: GameMode) => void
  onOpenChange: (open: boolean) => void
}

// Each sheet sits on its clipboard a little askew
const SHEET_TILT = [-0.8, 0.6, 0.4, -0.5]

// Every mode is its own panel (owner, 2026-10-27: prototype A): its shift order on a clipboard, a SKALA screen
// listing what to expect, and the key that starts it. Stacked on a phone (prototype D), 2×2 on a medium screen, and
// four in a row on a wide one so the whole menu fits without scrolling (owner, 2026-10-27).
export function DifficultyModal({ open, onSelectDifficulty, onOpenChange }: DifficultyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Centred by margins, not a transform, and it fades in without zooming: on phones a scrolling dialog that is
          transformed sometimes left a SKALA screen or a key unpainted until it was scrolled away and back (2026-10-29) */}
      <DialogContent
        className="cr-dialog cr-mode-dialog inset-0 m-auto h-fit translate-x-0 translate-y-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 max-h-[90dvh] overflow-y-auto p-4 sm:p-6 [--dlg-pad:1rem] sm:[--dlg-pad:1.5rem]"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Select Mode</DialogTitle>
          <DialogDescription className="text-center font-mono text-xs sm:text-sm text-neutral-700 pt-1">
            {MODE_MENU_TAGLINE}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {MODE_MENU.map(({ mode, name, specs, key, action }, idx) => (
            <div key={mode} className="cr-panel cr-screws px-3.5 pt-4 pb-3.5 sm:px-4 sm:pt-[18px] sm:pb-4 flex flex-col gap-3 sm:gap-3.5">
              <div className="cr-board">
                <span className="cr-board-clip" aria-hidden="true" />
                <div
                  className="cr-paper cr-paper-ruled px-3 pt-3 pb-2 sm:px-3.5 sm:pt-3.5 sm:pb-2.5 lg:px-3"
                  style={{ transform: `rotate(${SHEET_TILT[idx % SHEET_TILT.length]}deg)` }}
                >
                  <div className="cr-form-line flex justify-between gap-2" aria-hidden="true">
                    {/* Four across, a sheet is too narrow for the whole printed heading */}
                    <span>
                      <span className="lg:hidden">Unit 4 · </span>Shift order
                    </span>
                    <span>No. {String(idx + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="cr-typed mt-1 sm:mt-1.5 text-[27px] sm:text-[30px] lg:text-[21px] xl:text-[23px] leading-none">{name}</h3>
                </div>
              </div>

              <div className="ws3-cam-bezel cr-skala flex-1 flex flex-col">
                <div className="ws5-crt-screen ws5-crt-text flex-1 px-3 pt-2.5 pb-3 sm:px-4 sm:pt-3 sm:pb-3.5 lg:px-3 text-[19px] sm:text-[20px] lg:text-[18px] leading-[1.2]">
                  <ul className="ws5-manual-list relative z-[1] text-pretty">
                    {specs.map((spec) => (
                      <li key={spec}>{spec}</li>
                    ))}
                  </ul>
                </div>
                {/* The chin sets its own display, which beats Tailwind's hidden, so a wrapper hides it on a phone */}
                <div className="hidden sm:block" aria-hidden="true">
                  <div className="cr-skala-chin">
                    <span className="ws5-manual-vent" />
                    <span className="ws5-manual-vent" />
                    <span className="ws5-manual-vent" />
                    <span className="flex-1" />
                    <span>SKALA</span>
                  </div>
                </div>
              </div>

              <span className="cr-lens-bezel w-full">
                <button data-mode={mode} onClick={() => onSelectDifficulty(mode)} className={`cr-lens ${key} w-full h-[46px] sm:h-[50px]`}>
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
