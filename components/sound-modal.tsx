"use client"

import type { ComponentType } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { BellOff, BellRing, Volume2, VolumeX } from "lucide-react"

interface SoundModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alarmsEnabled: boolean
  effectsEnabled: boolean
  soundVolume: number
  onAlarmsUpdate: (alarmsEnabled: boolean) => void
  onEffectsUpdate: (effectsEnabled: boolean) => void
  onVolumeUpdate: (soundVolume: number) => void
}

// One switch: round key, nameplate, a hint, what it covers and an ON/OFF readout
function SoundSwitch({ id, name, hint, covers, on, OnIcon, OffIcon, onToggle, edge }: {
  id: string
  edge: "green" | "orange"
  name: string
  hint: string
  covers: string
  on: boolean
  OnIcon: ComponentType<{ className?: string }>
  OffIcon: ComponentType<{ className?: string }>
  onToggle: () => void
}) {
  return (
    <div className={`cr-module cr-module-${edge} p-3 space-y-3`}>
      <div className="flex items-center gap-4">
        <span className="cr-round-bezel shrink-0">
          <button
            id={id}
            aria-pressed={on}
            aria-label={name}
            aria-describedby={`${id}-covers`}
            onClick={onToggle}
            className={`cr-round-key w-16 h-16 ${on ? "on" : ""}`}
          >
            {on ? <OnIcon className="w-8 h-8" /> : <OffIcon className="w-8 h-8" />}
          </button>
        </span>
        <div className="flex-1 min-w-0 space-y-2">
          <Label htmlFor={id} className="cr-plate">
            {name}
          </Label>
          <div className="cr-screen-bezel">
            <div className={`led-display text-center text-base ${on ? "led-green" : ""}`}>{on ? "ON" : "OFF"}</div>
          </div>
        </div>
      </div>
      <div id={`${id}-covers`} className="cr-note px-3 py-2 uppercase !text-[11px] space-y-0.5">
        <p className="font-bold">{hint}</p>
        <p>{covers}</p>
      </div>
    </div>
  )
}

export default function SoundModal({ open, onOpenChange, alarmsEnabled, effectsEnabled, soundVolume, onAlarmsUpdate, onEffectsUpdate, onVolumeUpdate }: SoundModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cr-dialog sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Sound</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Two switches (bible §15): every other sound first (owner, 2026-10-19), then the alarms, recommended for new players */}
          <SoundSwitch
            id="effects-toggle"
            name="Sound Effects"
            hint="Recommended"
            covers="Reactor hum, rods, pumps, turbine, new warnings and the shift log printer."
            on={effectsEnabled}
            OnIcon={Volume2}
            OffIcon={VolumeX}
            onToggle={() => onEffectsUpdate(!effectsEnabled)}
            edge="green"
          />
          <SoundSwitch
            id="alarms-toggle"
            name="Alarms"
            hint="Recommended for new operators"
            covers="Warnings and emergency events."
            on={alarmsEnabled}
            OnIcon={BellRing}
            OffIcon={BellOff}
            onToggle={() => onAlarmsUpdate(!alarmsEnabled)}
            edge="orange"
          />

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
