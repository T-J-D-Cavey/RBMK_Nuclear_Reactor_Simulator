"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface DifficultyModalProps {
  open: boolean
  onSelectDifficulty: (isHard: boolean) => void
}

export function DifficultyModal({ open, onSelectDifficulty }: DifficultyModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-card border-4 border-primary max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono uppercase text-center">Select Difficulty</DialogTitle>
          <DialogDescription className="text-center font-mono text-sm pt-2">
            Choose your challenge level to begin reactor management
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Easy Mode */}
          <div className="bg-background border-2 border-border p-4 space-y-2">
            <h3 className="font-mono font-bold text-lg uppercase text-accent">Easy Mode</h3>
            <ul className="text-sm font-mono space-y-1 text-muted-foreground">
              <li>• 15 minute countdown</li>
              <li>• Standard reactor behavior</li>
              <li>• Recommended for beginners</li>
            </ul>
            <Button
              onClick={() => onSelectDifficulty(false)}
              className="w-full uppercase font-mono tracking-wider border-2 border-primary mt-2"
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
              <li>• More aggressive mechanics</li>
              <li>• For experienced operators</li>
            </ul>
            <Button
              onClick={() => onSelectDifficulty(true)}
              variant="destructive"
              className="w-full uppercase font-mono tracking-wider border-2 border-destructive mt-2"
              size="lg"
            >
              Start Hard
            </Button>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground font-mono pt-4">
          Survive until the countdown reaches zero to win
        </p>
      </DialogContent>
    </Dialog>
  )
}
