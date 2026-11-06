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
    <div className={`cr-sound-bay cr-module cr-module-${edge} cr-bay-screws p-2 sm:p-3 flex flex-col items-center gap-2 sm:gap-3`}>
      <Label htmlFor={id} className="cr-dymo">
        {name}
      </Label>
      <div aria-hidden="true">
        <JewelLamp colour={edge === "green" ? "green" : "amber"} lit={on} caption="On" />
      </div>
      <GripSwitch id={id} on={on} offLegend="Off" onLegend="On" label={name} describedBy={`${id}-covers`} onToggle={onToggle} />
      <div id={`${id}-covers`} className="cr-note w-full flex-1 mt-1 sm:mt-2 px-2 py-1.5 sm:px-3 sm:py-2 uppercase !text-[10px] sm:!text-[11px] !leading-snug space-y-0.5">
        <p className="font-bold">{hint}</p>
        <p>{covers}</p>
      </div>
    </div>
  )
}

// The two switches make no sound of their own: all they do is turn sound on or off (owner, 2026-11-05)
export default function SoundModal({ open, onOpenChange, alarmsEnabled, effectsEnabled, soundVolume, onAlarmsUpdate, onEffectsUpdate, onVolumeUpdate }: SoundModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cr-dialog sm:max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-6 [--dlg-pad:1rem] sm:[--dlg-pad:1.5rem]">
        <DialogHeader>
          <DialogTitle className="cr-dialog-title">Sound</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Side by side even on a phone, so the whole dialog fits one screen */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
          <div className="cr-module cr-bay-screws p-2.5 sm:p-3 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="volume-slider" className="cr-plate">
                Volume
              </Label>
              {/* A small fixed-width screen, as the chart recorder's; the figure sits to the right like a readout */}
              <div className="cr-screen-bezel">
                <div
                  className="ws5-crt-screen ws5-crt-text w-[6ch] px-1.5 py-px text-right text-[15px] leading-none tabular-nums"
                  style={{ borderRadius: "4px / 3px" }}
                >
                  <span className="relative z-[1]">{Math.round(soundVolume * 100)}%</span>
                </div>
              </div>
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
