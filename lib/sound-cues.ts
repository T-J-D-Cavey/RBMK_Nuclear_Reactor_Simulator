// When the sound effects play (bible §15, plan §8 Q5). Pure, so the triggers can be checked without a browser;
// hooks/use-audio-manager.ts plays the clips.
import type { ControlRod, EventKind, GameEvent, TurbineMode } from "./types"

const button = (clip: 1 | 2 | 3 | 4 | 5) => `/sounds/button-press-${clip}.mp3`

// Clips the owner provided, served from public/sounds. To change what a key sounds like, change it here.
export const SOUND_EFFECT_FILES = {
  // Every Cancel and Close, and the X on any modal: always this one (owner, 2026-11-05)
  cancel: button(5),

  // Every other key: a mixture of the other four (owner, 2026-11-05)
  rodsApply: button(1),
  turbineApply: button(2),
  pumpsApply: button(3),
  quit: button(4),
  homeKey: button(2),
  pauseKey: button(3),
  warningKey: button(1),
  messageKey: button(4),
  cameraKey: button(2),
  soundKey: button(3),
  machineKey: button(1),
  guideKey: button(4),
  screenToggle: button(2),
  mainMenu: button(4),

  pumpSwitch: "/sounds/pump-confirm.mp3", // a pump's switch, as it turns
  turbineSelectIdleOrPumps: "/sounds/electricity sound 1.mp3", // the turbine's mode selector, as it reaches a position
  turbineSelectGrid: "/sounds/electricity sound 2.mp3",
  turbineVacuumRun: "/sounds/turbine-vacume-run.mp3",
  waterBalancerRun: "/sounds/water-balancer-run.mp3",

  // As an event starts (owner, 2026-11-05). The turbine trip borrows the selector's Grid clip, as it falls off the grid.
  powerCutEvent: "/sounds/power cut event.mp3",
  pumpTripEvent: "/sounds/pump trip event.mp3",
  reactorHallEvent: "/sounds/reactor hall event.mp3",
  turbineTrip: "/sounds/electricity sound 2.mp3",

  az5: "/sounds/az5.mp3",
  warningBleep: "/sounds/warning-bleep.mp3",
  shiftLogPrinter: "/sounds/shift-log-printer.mp3",
  targetInside: "/sounds/target-inside.mp3",
  targetOutside: "/sounds/target-outside.mp3",
} satisfies Record<string, string>

export type SoundEffect = keyof typeof SOUND_EFFECT_FILES

// The clips long enough to stop and pick up again with the game: the rest are over in a moment or two
export const LONG_EFFECTS: SoundEffect[] = ["turbineVacuumRun", "waterBalancerRun", "powerCutEvent", "reactorHallEvent"]

export const TURBINE_SELECT_EFFECTS: Record<TurbineMode, SoundEffect> = {
  idle: "turbineSelectIdleOrPumps",
  pumps: "turbineSelectIdleOrPumps",
  grid: "turbineSelectGrid",
}

// The events with a clip of their own. A rod jam and a grid hold have none. A turbine trip isn't an event in this
// list, so it has its own trigger (turbineTripCue).
const EVENT_EFFECTS: Partial<Record<EventKind, SoundEffect>> = {
  "power-cut": "powerCutEvent",
  "pump-trip": "pumpTripEvent",
  "signal-loss": "reactorHallEvent",
}

// The clips for events that have started since the last reading, so each sounds once, as it starts
export function eventCues(knownIds: string[], events: GameEvent[]): SoundEffect[] {
  return events.flatMap((event) => {
    const effect = EVENT_EFFECTS[event.type]
    return effect && !knownIds.includes(event.id) ? [effect] : []
  })
}

// The power output has come back inside its target range, or gone outside it (owner, 2026-10-20). Each reading is
// whether the output is on target, or null when there is no target (Free mode, the Safety Test after the turbine
// goes to the pumps). Gaining or losing a target is not a move in or out, so it plays nothing.
export function targetCue(prev: boolean | null, next: boolean | null): "targetInside" | "targetOutside" | null {
  if (prev === null || next === null || prev === next) return null
  return next ? "targetInside" : "targetOutside"
}

// Once, as the turbine trips, not for as long as its flag stays up. Each reading is null until the save has loaded.
export function turbineTripCue(prev: boolean | null, next: boolean): "turbineTrip" | null {
  return prev === false && next ? "turbineTrip" : null
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
