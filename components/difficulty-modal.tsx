"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { GameMode } from "@/lib/types"

interface DifficultyModalProps {
  open: boolean
  onSelectDifficulty: (mode: GameMode) => void
  onOpenChange: (open: boolean) => void
}

export function DifficultyModal({ open, onSelectDifficulty, onOpenChange }: DifficultyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-4 border-primary max-w-md max-h-[90dvh] overflow-y-auto"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono uppercase text-center">Select Mode</DialogTitle>
          <DialogDescription className="text-center font-mono text-sm pt-2">
            The reactor obeys the same physics in every mode. Modes differ only in your workload: shift length, grid
            demands and emergencies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Easy Mode */}
          <div className="bg-background border-2 border-border p-4 space-y-2">
            <h3 className="font-mono font-bold text-lg uppercase text-accent">Easy Mode</h3>
            <ul className="text-sm font-mono space-y-1 text-muted-foreground">
              <li>• 15 minute shift</li>
              <li>• About 1 major emergency per shift</li>
              <li>• Smaller, less frequent power target changes</li>
            </ul>
            <Button
              onClick={() => onSelectDifficulty("easy")}
              className="w-full uppercase font-mono tracking-wider border-2 border-primary mt-2 cursor-pointer"
              size="lg"
            >
              Start Easy
            </Button>
          </div>

          {/* Hard Mode */}
          <div className="bg-background border-2 border-destructive p-4 space-y-2">
            <h3 className="font-mono font-bold text-lg uppercase text-destructive">Hard Mode</h3>
            <ul className="text-sm font-mono space-y-1 text-muted-foreground">
              <li>• 30 minute shift</li>
              <li>• About 3 major emergencies per shift</li>
              <li>• Larger, more frequent power target changes</li>
            </ul>
            <Button
              onClick={() => onSelectDifficulty("hard")}
              variant="destructive"
              className="w-full uppercase font-mono tracking-wider border-2 border-destructive mt-2 cursor-pointer"
              size="lg"
            >
              Start Hard
            </Button>
          </div>

          {/* Free Mode */}
          <div className="bg-background border-2 border-sky-500 p-4 space-y-2">
            <h3 className="font-mono font-bold text-lg uppercase text-sky-600 dark:text-sky-400">Free Mode (Sandbox)</h3>
            <ul className="text-sm font-mono space-y-1 text-muted-foreground">
              <li>• Unlimited time (counts up from 00:00:00)</li>
              <li>• No grid power targets or random events</li>
              <li>• Unlimited practice with active reactor physics</li>
            </ul>
            <Button
              onClick={() => onSelectDifficulty("free")}
              className="w-full uppercase font-mono tracking-wider border-2 border-sky-600 bg-sky-600 hover:bg-sky-700 text-white font-bold mt-2 cursor-pointer shadow-sm"
              size="lg"
            >
              Start Free Mode
            </Button>
          </div>

          {/* Historical scenario: Safety Test */}
          <div className="ws3-historical-card relative p-4 space-y-2 text-amber-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-800">
                Historical scenario · 25–26 April 1986
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black px-1.5 py-0.5 border border-amber-800">
                In development
              </span>
            </div>
            <h3 className="font-mono font-bold text-lg uppercase text-amber-900">Safety Test</h3>
            <ul className="text-sm font-mono space-y-1 text-amber-900/80">
              <li>• 30 minute scripted recreation of the night of the Unit 4 turbine rundown test</li>
              <li>• Orders come from the test procedure, not random events</li>
              <li>• No random emergencies</li>
            </ul>
            <Button
              onClick={() => onSelectDifficulty("safety_test")}
              className="w-full uppercase font-mono tracking-wider border-2 border-amber-900 bg-amber-800 hover:bg-amber-900 text-amber-50 font-bold mt-2 cursor-pointer shadow-sm"
              size="lg"
            >
              Begin Safety Test
            </Button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground font-mono pt-2">
          Survive until the shift ends, or test the physics indefinitely in Free Mode
        </p>
      </DialogContent>
    </Dialog>
  )
}
