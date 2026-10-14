// The reactor hall hum (bible §15): three voices of the same clip, each playing a while from a random point in it at
// its own level, then dipping and coming back straight away somewhere else. The dips are shallow and short (owner,
// 2026-10-14) and staggered so they never line up, which hides that it's one short clip on a loop; a voice waits to
// dip until another is in full. Takes its audio elements, timers and random numbers from outside so it can be checked
// without a browser (scripts/sim/sounds.test.ts).
import type { DriveAudio, DriveTimers } from "./rod-drive-voices"

export const HUM_TICK_MS = 100 // how often the fades step
export const HUM_FADE_MS: [number, number] = [1000, 2000] // each fade in or out
export const HUM_FADE_FLOOR = 0.4 // how far a fade dips, as a share of the pass's level
export const HUM_PLAY_MS: [number, number] = [14_000, 28_000] // a whole pass, fades included
export const HUM_GAIN: [number, number] = [0.5, 0.8] // a pass's level, against the volume setting (owner)
export const HUM_ENTRY_MS = [0, 4000, 9000] // when each voice first comes in after the hum starts

export interface HumAudio extends DriveAudio {
  duration: number // NaN until the clip's length is known
}

interface Pass {
  fadeIn: number
  fadeOut: number
  length: number
  gain: number
  floorIn: number // a voice's first pass comes in from silence, later ones from the dip
  elapsed: number
}

interface Voice {
  audio: HumAudio
  pass: Pass | null
  passes: number
  timer: unknown
}

const browserTimers: DriveTimers = {
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id as number),
}

export class HumBed {
  private voices: Voice[]
  private timers: DriveTimers
  private random: () => number
  private level = 1
  private running = false

  constructor(audios: HumAudio[], timers: DriveTimers = browserTimers, random: () => number = Math.random) {
    this.timers = timers
    this.random = random
    this.voices = audios.map((audio) => ({ audio, pass: null, passes: 0, timer: null }))
  }

  setVolume(level: number) {
    this.level = level
    for (const voice of this.voices) this.applyVolume(voice)
  }

  start() {
    if (this.running) return
    this.running = true
    this.voices.forEach((voice, i) => {
      voice.timer = this.timers.setTimeout(() => this.begin(voice), HUM_ENTRY_MS[i] ?? 0)
    })
  }

  stop() {
    this.running = false
    for (const voice of this.voices) {
      this.clear(voice)
      voice.audio.pause()
      voice.pass = null
      voice.passes = 0
    }
  }

  private between([low, high]: [number, number]) {
    return low + this.random() * (high - low)
  }

  // A new pass: a random point in the clip, a random length and level
  private begin(voice: Voice) {
    voice.timer = null
    if (!this.running) return
    const pass: Pass = {
      fadeIn: this.between(HUM_FADE_MS),
      fadeOut: this.between(HUM_FADE_MS),
      length: this.between(HUM_PLAY_MS),
      gain: this.between(HUM_GAIN),
      floorIn: voice.passes === 0 ? 0 : HUM_FADE_FLOOR,
      elapsed: 0,
    }
    voice.pass = pass
    voice.passes++
    // Start far enough from the end that the pass doesn't run over the loop point, if the clip is long enough
    const clipSeconds = voice.audio.duration
    const room = Number.isFinite(clipSeconds) ? clipSeconds - pass.length / 1000 : 0
    voice.audio.currentTime = room > 0 ? this.random() * room : 0
    this.applyVolume(voice)
    const played = voice.audio.play()
    if (played) played.catch((e) => console.warn("Hum blocked", e))
    voice.timer = this.timers.setTimeout(() => this.step(voice), HUM_TICK_MS)
  }

  private step(voice: Voice) {
    voice.timer = null
    const pass = voice.pass
    if (!pass || !this.running) return
    pass.elapsed += HUM_TICK_MS
    // Don't start fading out until another voice is in full, so the fades never all line up and the hum never drops
    if (pass.elapsed > pass.length - pass.fadeOut && pass.elapsed - HUM_TICK_MS <= pass.length - pass.fadeOut) {
      if (!this.voices.some((other) => other !== voice && this.inFull(other))) pass.length += HUM_TICK_MS
    }
    if (pass.elapsed >= pass.length) {
      voice.audio.pause()
      this.begin(voice) // at the bottom of the dip: jump to a new point and come back up
      return
    }
    this.applyVolume(voice)
    voice.timer = this.timers.setTimeout(() => this.step(voice), HUM_TICK_MS)
  }

  // Past its fade-in and not yet fading out
  private inFull(voice: Voice) {
    const pass = voice.pass
    return pass !== null && pass.elapsed >= pass.fadeIn && pass.elapsed <= pass.length - pass.fadeOut
  }

  private applyVolume(voice: Voice) {
    const pass = voice.pass
    if (!pass) return
    const fadingIn = pass.floorIn + (1 - pass.floorIn) * Math.min(1, pass.elapsed / pass.fadeIn)
    const fadingOut = HUM_FADE_FLOOR + (1 - HUM_FADE_FLOOR) * Math.min(1, (pass.length - pass.elapsed) / pass.fadeOut)
    voice.audio.volume = Math.max(0, Math.min(1, this.level * pass.gain * Math.min(fadingIn, fadingOut)))
  }

  private clear(voice: Voice) {
    if (voice.timer !== null) this.timers.clearTimeout(voice.timer)
    voice.timer = null
  }
}
