// When the sound effects play (bible §15, plan §8 Q5). Pure, so the triggers can be checked without a browser;
// hooks/use-audio-manager.ts plays the clips.
import type { ControlRod } from "./types"

export type SoundEffect = "rodConfirm" | "turbineConfirm" | "pumpConfirm" | "az5" | "warningBleep" | "shiftLogPrinter"

// Clips the owner provided (2026-10-14), served from public/sounds. Rods and the turbine share a switch clunk.
export const SOUND_EFFECT_FILES: Record<SoundEffect, string> = {
  rodConfirm: "/sounds/switch-confirm.mp3",
  turbineConfirm: "/sounds/switch-confirm.mp3",
  pumpConfirm: "/sounds/pump-confirm.mp3",
  az5: "/sounds/az5.mp3",
  warningBleep: "/sounds/warning-bleep.mp3",
  shiftLogPrinter: "/sounds/shift-log-printer.mp3",
}

// The rod drive: one voice per moving rod, at most three (owner). The clip is 104 s, longer than any rod's travel
// (a full stroke takes ~18 s), so it never needs to loop. Each voice starts at a different point in it so two
// voices never play the same sound a fraction of a second apart.
export const ROD_DRIVE_FILE = "/sounds/rod-drive.mp3"
export const ROD_DRIVE_OFFSETS = [0, 35, 70] // seconds into the clip, one per voice

// Rods still travelling to their ordered position. A jammed rod's order is where it stopped, so it doesn't count.
export function rodsMoving(rods: ControlRod[]): number {
  return rods.filter((rod) => !rod.stuck && rod.insertion !== rod.target).length
}

// A warning that clears and comes back within this long doesn't bleep again, so a reading hovering at its warning
// level doesn't bleep every other second.
export const WARNING_REBLEEP_MS = 10_000

// Whether a new warning has appeared since the last reading. `goneAt` remembers when each warning last cleared.
export function newWarningAppeared(prev: string[], next: string[], goneAt: Map<string, number>, now: number): boolean {
  for (const key of prev) if (!next.includes(key)) goneAt.set(key, now)
  return next.some((key) => {
    if (prev.includes(key)) return false
    const gone = goneAt.get(key)
    return gone === undefined || now - gone >= WARNING_REBLEEP_MS
  })
}
