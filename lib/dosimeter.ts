// The control room's low-range dosimeter (owner, 2026-10-16). Its scale stopped at 1,000 µR/s, which is 3.6 R/h:
// on 26 April 1986 it was pinned there, and Dyatlov read it as "3.6 roentgen: not great, not terrible".
// It measures the air in the control room, which the reactor's shielding keeps at background: the needle sits just
// off zero with the odd random blip, whatever the reactor does in normal running. Only very high radioactivity,
// well past the high-radioactivity warning, gets through to it, and a runaway pins it.

export const DOSIMETER_LIMIT = 1000 // µR/s, the end of the scale
export const LEAK_ABOVE = 500 // radioactivity: below this the room stays at background
export const LEAK_PER_RADIOACTIVITY = 1 // µR/s per point of radioactivity above LEAK_ABOVE: pinned from 1,500
const BACKGROUND = 6 // µR/s, the needle's resting point
const JITTER = 3 // µR/s either way, every second
const BLIP_CHANCE = 0.12 // a blip in about one second in eight
const BLIP = [12, 45] as const // µR/s on top of the background

// µR/s to R/h
export function toRoentgenPerHour(microRPerSecond: number): number {
  return (microRPerSecond * 3600) / 1_000_000
}

// Two fixed random numbers in [0, 1) for a game second, so the reading only changes when the second does (it stays
// put while paused, and re-renders don't make it jump).
function noise(second: number): [number, number] {
  let h = Math.imul(Math.floor(second) ^ 0x9e3779b9, 0x85ebca6b)
  const next = () => {
    h ^= h >>> 15
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 13
    h = Math.imul(h, 0x27d4eb2f)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
  return [next(), next()]
}

export interface DoseReading {
  microRPerSecond: number // what the needle shows, never past the end of the scale
  pegged: boolean // the true dose is at or beyond the end of the scale
}

export function readDosimeter(radioactivity: number, second: number): DoseReading {
  const [a, b] = noise(second)
  const background = BACKGROUND + (a * 2 - 1) * JITTER + (b < BLIP_CHANCE ? BLIP[0] + (b / BLIP_CHANCE) * (BLIP[1] - BLIP[0]) : 0)
  const dose = background + Math.max(0, radioactivity - LEAK_ABOVE) * LEAK_PER_RADIOACTIVITY
  return { microRPerSecond: Math.min(DOSIMETER_LIMIT, Math.max(0, dose)), pegged: dose >= DOSIMETER_LIMIT }
}
