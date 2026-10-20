// The rod-drive sound (bible §15): one voice per moving rod, up to three. The drive starts once the confirmation
// clunk has played, and voices that start together are a split second apart. A voice stops as soon as its rod has
// arrived, with no fade-out (owner, 2026-10-20: the fade made the end of a move tail away), but never before it has
// played for DRIVE_MIN_PLAY_MS. So a small move, whose rod arrives before the drive has even started, is still heard.
// Takes its audio elements and timers from outside so it can be checked without a browser (scripts/sim/sounds.test.ts).

export const DRIVE_START_DELAY_MS = 1250 // after the order, so the drive follows the confirmation sound (owner)
export const DRIVE_STAGGER_MS = 300 // gap between voices starting together
export const DRIVE_MIN_PLAY_MS = 1000 // the shortest a voice plays, however small the move

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

type VoiceState = "idle" | "starting" | "playing"

interface Voice {
  audio: DriveAudio
  offset: number
  state: VoiceState
  timer: unknown // the start delay, then the shortest play
  short: boolean // still inside its shortest play
  arrived: boolean // its rod has arrived: stop once the shortest play is over
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
    this.voices = audios.map((audio, i) => ({ audio, offset: offsets[i] ?? 0, state: "idle", timer: null, short: false, arrived: false }))
  }

  setVolume(level: number) {
    this.level = level
    for (const voice of this.voices) if (voice.state === "playing") voice.audio.volume = level
  }

  // How many rods are moving
  setCount(count: number) {
    const wanted = Math.max(0, Math.min(count, this.voices.length))
    let starting = 0
    this.voices.forEach((voice, i) => {
      if (i < wanted) {
        voice.arrived = false
        if (voice.state === "idle") {
          voice.state = "starting"
          voice.timer = this.timers.setTimeout(() => this.start(voice), DRIVE_START_DELAY_MS + starting++ * DRIVE_STAGGER_MS)
        }
      } else if (voice.state !== "idle") {
        voice.arrived = true
        this.stopIfDone(voice)
      }
    })
  }

  // Every voice off at once: paused, or the sound effects switched off
  silence() {
    for (const voice of this.voices) {
      this.clear(voice)
      voice.audio.pause()
      voice.state = "idle"
      voice.short = false
      voice.arrived = false
    }
  }

  dispose() {
    this.silence()
  }

  private start(voice: Voice) {
    voice.state = "playing"
    voice.short = true
    voice.audio.currentTime = voice.offset
    voice.audio.volume = this.level
    const played = voice.audio.play()
    if (played) played.catch((e) => console.warn("Rod drive blocked", e))
    voice.timer = this.timers.setTimeout(() => {
      voice.timer = null
      voice.short = false
      this.stopIfDone(voice)
    }, DRIVE_MIN_PLAY_MS)
  }

  private stopIfDone(voice: Voice) {
    if (!voice.arrived || voice.state !== "playing" || voice.short) return
    voice.audio.pause()
    voice.state = "idle"
    voice.arrived = false
  }

  private clear(voice: Voice) {
    if (voice.timer !== null) this.timers.clearTimeout(voice.timer)
    voice.timer = null
  }
}
