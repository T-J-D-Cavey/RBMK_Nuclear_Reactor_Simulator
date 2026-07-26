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
      <DialogContent className="bg-card border-4 border-primary max-w-md max-h-[90vh] overflow-y-auto" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono uppercase text-center">Select Mode</DialogTitle>
          <DialogDescription className="text-center font-mono text-sm pt-2">
            Choose your challenge level or play freely to begin reactor management
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Easy Mode */}
          <div className="bg-background border-2 border-border p-4 space-y-2">
            <h3 className="font-mono font-bold text-lg uppercase text-accent">Easy Mode</h3>
            <ul className="text-sm font-mono space-y-1 text-muted-foreground">
              <li>• 15 minute countdown</li>
              <li>• More stable reactor mechanics</li>
              <li>• Recommended for beginners</li>
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
              <li>• 30 minute countdown</li>
              <li>• Challenging reactor mechanics</li>
              <li>• For experienced operators</li>
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
        </div>

        <p className="text-xs text-center text-muted-foreground font-mono pt-2">
          Survive until the countdown reaches zero, or test physics indefinitely in Free Mode
        </p>
      </DialogContent>
    </Dialog>
  )
}
