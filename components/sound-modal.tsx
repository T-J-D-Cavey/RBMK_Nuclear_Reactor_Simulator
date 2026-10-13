"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Volume2, VolumeX } from "lucide-react"

interface SoundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  soundEnabled: boolean
  soundVolume: number
  onEnabledUpdate: (soundEnabled: boolean) => void
  onVolumeUpdate: (soundVolume: number) => void
}

export default function SoundModal({ open, onOpenChange, soundEnabled, soundVolume, onEnabledUpdate, onVolumeUpdate }: SoundModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cr-dialog sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Sound</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="cr-module p-3 flex items-center gap-4">
            <span className="cr-round-bezel shrink-0">
              <button
                id="sound-toggle"
                aria-pressed={soundEnabled}
                aria-label="Sound effects"
                onClick={() => onEnabledUpdate(!soundEnabled)}
                className={`cr-round-key w-16 h-16 ${soundEnabled ? "on" : ""}`}
              >
                {soundEnabled ? <Volume2 className="w-8 h-8" /> : <VolumeX className="w-8 h-8" />}
              </button>
            </span>
            <div className="flex-1 space-y-2">
              <Label htmlFor="sound-toggle" className="cr-plate">
                Sound Effects
              </Label>
              <div className="cr-screen-bezel">
                <div className={`led-display text-center text-base ${soundEnabled ? "led-green" : ""}`}>{soundEnabled ? "ON" : "OFF"}</div>
              </div>
            </div>
          </div>

          {/* VOLUME FADER */}
          <div className="cr-module p-3 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="volume-slider" className="cr-plate">
                Volume
              </Label>
              <span className="font-mono font-bold text-sm tabular-nums">{Math.round(soundVolume * 100)}%</span>
            </div>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={soundVolume}
              onChange={(e) => onVolumeUpdate(parseFloat(e.target.value))}
              className="cr-fader"
            />
          </div>

          <span className="cr-bezel w-full">
            <button onClick={() => onOpenChange(false)} className="cr-key cr-key-cream w-full h-11">
              Close
            </button>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
