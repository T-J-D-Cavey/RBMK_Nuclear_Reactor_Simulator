"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Volume, Volume2, VolumeX } from "lucide-react" // Added Volume2 for variety if needed

interface SoundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  soundEnabled: boolean
  soundVolume: number
  onEnabledUpdate: (soundEnabled: boolean) => void
  onVolumeUpdate: (soundVolume: number) => void
}

export default function SoundModal({ open, onOpenChange, soundEnabled, soundVolume, onEnabledUpdate, onVolumeUpdate }: SoundModalProps) {

  const handleSoundEnabledChange = (isSoundEnabled: boolean) => {
    onEnabledUpdate(isSoundEnabled)
  }

  const handleSoundVolumeChange = (newVolume: number) => {
    onVolumeUpdate(newVolume)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-4 border-primary max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-mono uppercase text-center">Sound Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-background border-2 border-border p-3 text-xs leading-relaxed text-center">
            <p>
              This game has optional sound effects. Enable sound effects by pressing the speaker icon button. Adjust the volume of the sount effects by using the slider. 
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 bg-background border-2 border-border p-6">
            <Label htmlFor="sound-toggle" className="font-mono uppercase text-base">
              {soundEnabled ? "Sound Enabled" : "Sound Disabled"}
            </Label>
            <button
              id="sound-toggle"
              onClick={() => handleSoundEnabledChange(!soundEnabled)}
              className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all ${
                soundEnabled
                  ? "bg-accent border-accent hover:bg-accent/80"
                  : "bg-muted border-muted-foreground hover:bg-muted/80"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-12 h-12 text-foreground" /> : <VolumeX className="w-12 h-12 text-foreground" />}
            </button>
          </div>

          {/* VOLUME SLIDER */}
          <div className="flex flex-col items-center gap-4 bg-background border-2 border-border p-6">
            <Label htmlFor="volume-slider" className="font-mono uppercase text-base">
              Sound Volume: {Math.round(soundVolume * 100)}%
            </Label>
            <input 
              id="volume-slider"
              type="range" 
              min="0" max="1" step="0.01" 
              value={soundVolume}
              onChange={(e) => {
                  handleSoundVolumeChange(parseFloat(e.target.value));
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="bg-background border-2 border-border p-4">
            <div className="text-xs text-muted-foreground font-mono uppercase mb-2">Sound Effects</div>
            <div className={`text-lg font-mono font-bold ${soundEnabled ? "text-accent" : "text-muted-foreground"}`}>
              {soundEnabled ? "SOUND EFFECTS ARE TURNED ON" : "SOUND EFFECTS ARE TURNED OFF"}
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 uppercase font-mono border-2 w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
