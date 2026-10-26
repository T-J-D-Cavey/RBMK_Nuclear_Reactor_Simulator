"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { GripSwitch, JewelLamp } from "@/components/switchgear"

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

// One switch: a pistol-grip switch with an ON lamp in the bay's own colour, a hint and what it covers
function SoundSwitch({ id, name, hint, covers, on, onToggle, edge }: {
  id: string
  edge: "green" | "orange"
  name: string
  hint: string
  covers: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className={`cr-module cr-module-${edge} p-3 flex flex-col items-center gap-3`}>
      <Label htmlFor={id} className="cr-dymo">
        {name}
      </Label>
      <div aria-hidden="true">
        <JewelLamp colour={edge === "green" ? "green" : "amber"} lit={on} caption="On" />
      </div>
      <GripSwitch id={id} on={on} offLegend="Off" onLegend="On" label={name} describedBy={`${id}-covers`} onToggle={onToggle} />
      <div id={`${id}-covers`} className="cr-note w-full flex-1 mt-2 px-3 py-2 uppercase !text-[11px] space-y-0.5">
        <p className="font-bold">{hint}</p>
        <p>{covers}</p>
      </div>
    </div>
  )
}

export default function SoundModal({ open, onOpenChange, alarmsEnabled, effectsEnabled, soundVolume, onAlarmsUpdate, onEffectsUpdate, onVolumeUpdate }: SoundModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cr-dialog sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Sound</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SoundSwitch
              id="effects-toggle"
              name="Sound Effects"
              hint="Recommended"
              covers="Reactor hum, rods, pumps, turbine, new warnings and the shift log printer."
              on={effectsEnabled}
              onToggle={() => onEffectsUpdate(!effectsEnabled)}
              edge="green"
            />
            <SoundSwitch
              id="alarms-toggle"
              name="Alarms"
              hint="Not recommended for iOS devices: No volume control"
              covers="Warnings and emergency events."
              on={alarmsEnabled}
              onToggle={() => onAlarmsUpdate(!alarmsEnabled)}
              edge="orange"
            />
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

          <span className="cr-lens-bezel w-full">
            <button onClick={() => onOpenChange(false)} className="cr-lens w-full h-12">
              Close
            </button>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
