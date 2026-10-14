// The rod-drive sound (bible §15): one voice per moving rod, up to three. The drive starts once the confirmation
// clunk has played, voices that start together are a split second apart, and a voice whose rod has arrived fades
// out rather than stopping dead. Takes its audio elements
// and timers from outside so it can be checked without a browser (scripts/sim/sounds.test.ts).

export const DRIVE_START_DELAY_MS = 1250 // after the order, so the drive follows the confirmation sound (owner)
export const DRIVE_STAGGER_MS = 300 // gap between voices starting together
export const DRIVE_FADE_MS = 600 // fade-out once a voice's rod has arrived
const FADE_STEPS = 12

export interface DriveAudio {
  play(): Promise<void> | void
  pause(): void
  volume: number
  currentTime: number
}

export interface DriveTimers {
  setTimeout(fn: () => void, ms: number): unknown
  clearTimeout(id: unknown): void
}

type VoiceState = "idle" | "starting" | "playing" | "fading"

interface Voice {
  audio: DriveAudio
  offset: number
  state: VoiceState
  timer: unknown
}

const browserTimers: DriveTimers = {
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id as number),
}

export class RodDriveVoices {
  private voices: Voice[]
  private timers: DriveTimers
  private level = 1

  constructor(audios: DriveAudio[], offsets: number[], timers: DriveTimers = browserTimers) {
    this.timers = timers
    this.voices = audios.map((audio, i) => ({ audio, offset: offsets[i] ?? 0, state: "idle", timer: null }))
  }

  setVolume(level: number) {
    this.level = level
    for (const voice of this.voices) if (voice.state === "playing") voice.audio.volume = level
  }

  // How many rods are moving (0 when paused or the sound effects are off)
  setCount(count: number) {
    const wanted = Math.max(0, Math.min(count, this.voices.length))
    let starting = 0
    this.voices.forEach((voice, i) => {
      if (i < wanted) {
        if (voice.state === "fading") {
          this.clear(voice)
          voice.audio.volume = this.level
          voice.state = "playing"
        } else if (voice.state === "idle") {
          voice.state = "starting"
          voice.timer = this.timers.setTimeout(() => this.start(voice), DRIVE_START_DELAY_MS + starting++ * DRIVE_STAGGER_MS)
        }
      } else if (voice.state === "starting") {
        this.clear(voice)
        voice.state = "idle"
      } else if (voice.state === "playing") {
        this.fade(voice)
      }
    })
  }

  dispose() {
    for (const voice of this.voices) {
      this.clear(voice)
      voice.audio.pause()
      voice.state = "idle"
    }
  }

  private start(voice: Voice) {
    voice.timer = null
    voice.state = "playing"
    voice.audio.currentTime = voice.offset
    voice.audio.volume = this.level
    const played = voice.audio.play()
    if (played) played.catch((e) => console.warn("Rod drive blocked", e))
  }

  private fade(voice: Voice) {
    voice.state = "fading"
    const from = voice.audio.volume
    let step = 0
    const tick = () => {
      step++
      if (step >= FADE_STEPS) {
        voice.audio.pause()
        voice.audio.volume = this.level
        voice.state = "idle"
        voice.timer = null
        return
      }
      voice.audio.volume = from * (1 - step / FADE_STEPS)
      voice.timer = this.timers.setTimeout(tick, DRIVE_FADE_MS / FADE_STEPS)
    }
    voice.timer = this.timers.setTimeout(tick, DRIVE_FADE_MS / FADE_STEPS)
  }

  private clear(voice: Voice) {
    if (voice.timer !== null) this.timers.clearTimeout(voice.timer)
    voice.timer = null
  }
}
