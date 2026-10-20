// Checks for the sound effect triggers (lib/sound-cues.ts), the rod drive's voices (lib/rod-drive-voices.ts) and the
// hum (lib/hum-bed.ts),
// against the real engine where it matters. No browser: audio elements and timers are fakes on a manual clock.
// Run: node --run sim:test
import { test } from "node:test"
import assert from "node:assert/strict"
import { DRIVE_MIN_PLAY_MS, DRIVE_STAGGER_MS, DRIVE_START_DELAY_MS, type DriveAudio, type DriveTimers, RodDriveVoices } from "../../lib/rod-drive-voices"
import { HUM_ENTRY_MS, HUM_GAIN, HUM_PLAY_MS, HumBed } from "../../lib/hum-bed"
import { newWarningAppeared, ROD_DRIVE_OFFSETS, rodsMoving, targetCue, WARNING_REBLEEP_MS } from "../../lib/sound-cues"
import { advanceReactor } from "../../lib/sim/reactor"
import { seededRng } from "../../lib/sim/rng"
import { createNewGame } from "../../lib/game-loop"
import { getEventWarnings, getReactorWarnings } from "../../lib/game-utils"
import type { GameState } from "../../lib/types"
import { az5, baseState } from "./harness"
import { makeBot, playGame } from "./bot"

// A manual clock: timers fire only when the test moves time on
class Clock implements DriveTimers {
  now = 0
  private next = 1
  private queue = new Map<number, { at: number; fn: () => void }>()
  setTimeout(fn: () => void, ms: number) {
    const id = this.next++
    this.queue.set(id, { at: this.now + ms, fn })
    return id
  }
  clearTimeout(id: unknown) {
    this.queue.delete(id as number)
  }
  advance(ms: number) {
    const end = this.now + ms
    for (;;) {
      let first: [number, { at: number; fn: () => void }] | null = null
      for (const entry of this.queue) if (entry[1].at <= end && (!first || entry[1].at < first[1].at)) first = entry
      if (!first) break
      this.queue.delete(first[0])
      this.now = first[1].at
      first[1].fn()
    }
    this.now = end
  }
}

class FakeAudio implements DriveAudio {
  volume = 1
  currentTime = 0
  duration = 120
  playing = false
  startedAt: number[] = []
  stoppedAt: number[] = []
  private clock: Clock
  constructor(clock: Clock) {
    this.clock = clock
  }
  play() {
    this.playing = true
    this.startedAt.push(this.clock.now)
  }
  pause() {
    if (this.playing) this.stoppedAt.push(this.clock.now)
    this.playing = false
  }
}

function voices() {
  const clock = new Clock()
  const audios = ROD_DRIVE_OFFSETS.map(() => new FakeAudio(clock))
  const drive = new RodDriveVoices(audios, ROD_DRIVE_OFFSETS, clock)
  drive.setVolume(0.8)
  return { clock, audios, drive, playing: () => audios.filter((a) => a.playing).length }
}

test("rod drive: one voice per moving rod, at most three, after the confirmation and a split second apart", () => {
  const D = DRIVE_START_DELAY_MS
  const one = voices()
  one.drive.setCount(1)
  assert.equal(one.playing(), 0, "silent while the confirmation clunk plays")
  one.clock.advance(D)
  assert.equal(one.playing(), 1)
  assert.deepEqual(one.audios[0].startedAt, [D])
  assert.equal(one.audios[0].volume, 0.8)

  const two = voices()
  two.drive.setCount(2)
  two.clock.advance(2000)
  assert.deepEqual(two.audios.map((a) => a.startedAt), [[D], [D + DRIVE_STAGGER_MS], []])

  const many = voices()
  many.drive.setCount(10)
  many.clock.advance(2000)
  assert.equal(many.playing(), 3)
  assert.deepEqual(many.audios.map((a) => a.startedAt), [[D], [D + DRIVE_STAGGER_MS], [D + 2 * DRIVE_STAGGER_MS]])
  // Each voice plays from a different point in the clip, so they never repeat each other
  assert.deepEqual(many.audios.map((a) => a.currentTime), ROD_DRIVE_OFFSETS)
})

test("rod drive: a voice whose rod has arrived stops there, with no fade; the others carry on", () => {
  const { clock, audios, drive } = voices()
  drive.setCount(3)
  clock.advance(3000)
  drive.setCount(1)
  assert.deepEqual(audios.map((a) => a.playing), [true, false, false])
  assert.deepEqual(audios[1].stoppedAt, [3000])
  assert.equal(audios[0].volume, 0.8)
  drive.setCount(0)
  assert.equal(audios[0].playing, false)
})

test("rod drive: a rod ordered again keeps its voice; a move shorter than the start delay is still heard", () => {
  const a = voices()
  a.drive.setCount(2)
  a.clock.advance(1000)
  a.drive.setCount(1) // the second rod arrives before its voice has started...
  a.drive.setCount(2) // ...and is ordered again
  a.clock.advance(5000)
  assert.equal(a.audios[1].playing, true)
  assert.equal(a.audios[1].startedAt.length, 1, "started once, not restarted")

  // A small move: the rod arrives before the drive starts, so the voice plays its shortest run and stops
  const D = DRIVE_START_DELAY_MS
  const c = voices()
  c.drive.setCount(1)
  c.clock.advance(500)
  c.drive.setCount(0)
  c.clock.advance(D)
  assert.deepEqual(c.audios[0].startedAt, [D])
  assert.equal(c.audios[0].playing, true)
  c.clock.advance(DRIVE_MIN_PLAY_MS)
  assert.deepEqual(c.audios[0].stoppedAt, [D + DRIVE_MIN_PLAY_MS])

  // Voices that start together are all heard, even when their rods arrive first
  const b = voices()
  b.drive.setCount(3)
  b.drive.setCount(1)
  b.clock.advance(5000)
  assert.deepEqual(b.audios.map((x) => x.startedAt.length), [1, 1, 1])
  assert.deepEqual(b.audios.map((x) => x.playing), [true, false, false])
})

test("rod drive: silenced at once when paused or the effects go off, even a voice still to start", () => {
  const { clock, audios, drive } = voices()
  drive.setCount(1)
  clock.advance(DRIVE_START_DELAY_MS + 200)
  drive.setCount(2)
  drive.silence()
  clock.advance(5000)
  assert.deepEqual(audios.map((a) => a.playing), [false, false, false])
  assert.deepEqual(audios[1].startedAt, [], "the second voice never starts")
})

// The engine's rods, one tick a second, fed to the drive as the game page does
function driveThrough(start: GameState, seconds: number) {
  const rng = seededRng(1)
  const { clock, drive, playing } = voices()
  let s = start
  const counts: number[] = []
  const heard: number[] = []
  for (let t = 0; t < seconds; t++) {
    counts.push(rodsMoving(s.controlRods))
    drive.setCount(rodsMoving(s.controlRods))
    clock.advance(900) // late in the second: after the start delay from the second before
    heard.push(playing())
    clock.advance(100)
    s = advanceReactor(s, rng).state
  }
  return { counts, heard }
}

test("rod drive follows the engine: sound lasts as long as each rod moves", () => {
  const s = baseState()
  const rods = s.controlRods.map((r) => r.insertion)
  // Rods 1 and 2 move 20% (~3.6 s at 18 s a stroke), rod 3 moves 50% (~9 s)
  const ordered = { ...s, controlRods: s.controlRods.map((r, i) => ({ ...r, target: i < 2 ? rods[i] + 20 : i === 2 ? rods[i] + 50 : r.insertion })) }
  const { counts, heard } = driveThrough(ordered, 14)
  // Rods 1 and 2 arrive in the 4th second; rod 3 in the 9th or 10th (rounding in the engine's sub-steps)
  assert.deepEqual(counts.slice(0, 9), [3, 3, 3, 3, 1, 1, 1, 1, 1])
  assert.ok(counts.slice(10).every((c) => c === 0) && counts[9] <= 1)
  assert.deepEqual(heard, [0, ...counts.slice(1)], "1.25 s after the order, one voice per moving rod, stopped within the second a rod arrives")
})

test("rod drive: a jammed rod falls silent; AZ-5 runs three voices until the last rod is in", () => {
  const s = baseState()
  const ordered = { ...s, controlRods: s.controlRods.map((r, i) => (i < 2 ? { ...r, target: r.insertion + 40 } : r)) }
  // Jam rod 1 after 2 s, as the rod-jam event does (its order becomes where it stopped)
  const rng = seededRng(1)
  let t = advanceReactor(advanceReactor(ordered, rng).state, rng).state
  assert.equal(rodsMoving(t.controlRods), 2)
  t = { ...t, controlRods: t.controlRods.map((r, i) => (i === 0 ? { ...r, stuck: true, target: r.insertion } : r)) }
  assert.equal(rodsMoving(t.controlRods), 1)

  const shut = az5(baseState())
  const furthest = Math.max(...baseState().controlRods.map((r) => 100 - r.insertion))
  const { counts, heard } = driveThrough(shut, 25)
  const lastMoving = counts.findLastIndex((c) => c > 0)
  assert.equal(counts[0], 10)
  assert.equal(lastMoving + 1, Math.ceil((furthest / 100) * 18), "the drive stops when the furthest rod arrives")
  assert.equal(heard[0], 0)
  assert.ok(heard.slice(1, lastMoving + 1).every((h, i) => h === Math.min(3, counts[i + 1])))
  assert.equal(heard[lastMoving + 1], 0)
})

test("target cues: one sound coming back inside the target range, another going outside; none when a target comes or goes", () => {
  assert.equal(targetCue(false, true), "targetInside")
  assert.equal(targetCue(true, false), "targetOutside")
  assert.equal(targetCue(true, true), null)
  assert.equal(targetCue(false, false), null)
  assert.equal(targetCue(null, false), null)
  assert.equal(targetCue(true, null), null)
})

test("warning bleep: once per new warning, not again for one that flickers at its level", () => {
  const goneAt = new Map<string, number>()
  assert.equal(newWarningAppeared([], ["highSteam"], goneAt, 0), true)
  assert.equal(newWarningAppeared(["highSteam"], ["highSteam"], goneAt, 1000), false)
  assert.equal(newWarningAppeared(["highSteam"], ["highSteam", "lowPerformance"], goneAt, 2000), true)
  assert.equal(newWarningAppeared(["highSteam", "lowPerformance"], ["lowPerformance"], goneAt, 3000), false, "a warning clearing is silent")
  assert.equal(newWarningAppeared(["lowPerformance"], ["highSteam", "lowPerformance"], goneAt, 5000), false, "back within 10 s")
  assert.equal(newWarningAppeared(["highSteam", "lowPerformance"], ["lowPerformance"], goneAt, 6000), false)
  assert.equal(newWarningAppeared(["lowPerformance"], ["highSteam", "lowPerformance"], goneAt, 6000 + WARNING_REBLEEP_MS), true, "back after 10 s")
})

// How often the bleep and the printer would sound in real shifts (the bot playing Hard, and the Safety Test)
test("bleeps and printer sounds in a bot shift are occasional, not constant", () => {
  for (const mode of ["hard", "safety_test"] as const) {
    const { states } = playGame(createNewGame(mode), makeBot(), 3)
    const goneAt = new Map<string, number>()
    let prev: string[] = []
    let bleeps = 0
    let prints = 0
    let lastLog = states[0].log.at(-1)?.id
    states.forEach((s, t) => {
      const keys = [...getReactorWarnings(s), ...getEventWarnings(s)].map((w) => w.key)
      if (newWarningAppeared(prev, keys, goneAt, t * 1000)) bleeps++
      prev = keys
      const id = s.log.at(-1)?.id
      if (id !== lastLog && id !== undefined) prints++
      lastLog = id
    })
    const minutes = states.length / 60
    console.log(`  ${mode}: ${minutes.toFixed(1)} min, ${bleeps} warning bleeps, ${prints} printer sounds`)
    assert.ok(bleeps / minutes < 2, `${mode}: under two bleeps a minute`)
    assert.ok(prints / minutes < 3, `${mode}: under three printer sounds a minute`)
  }
})

test("hum: three voices that dip at different times, points in the clip and levels, never all quiet", () => {
  const clock = new Clock()
  const audios = [0, 1, 2].map(() => new FakeAudio(clock))
  const rng = seededRng(7)
  const hum = new HumBed(audios, clock, rng)
  hum.setVolume(0.8)
  hum.start()
  clock.advance(0)
  assert.equal(audios[0].playing, true, "the first voice comes in at once")
  clock.advance(HUM_ENTRY_MS[2])

  const offsets = new Set<number>()
  const peaks: number[] = []
  let quietest = Infinity
  for (let t = 0; t < 10 * 60_000; t += 100) {
    clock.advance(100)
    const level = audios.reduce((sum, a) => sum + (a.playing ? a.volume : 0), 0)
    quietest = Math.min(quietest, level)
    for (const a of audios) {
      assert.ok(a.volume >= 0 && a.volume <= 0.8 * HUM_GAIN[1] + 1e-9, "no voice above its top level")
      if (a.playing) offsets.add(Math.round(a.currentTime))
    }
    peaks.push(Math.max(...audios.map((a) => (a.playing ? a.volume : 0))))
  }
  assert.ok(quietest > 0.5, `the hum never drops away (quietest ${quietest.toFixed(2)})`)
  assert.ok(offsets.size > 10, "passes start at many points in the clip")
  const starts = audios.map((a) => a.startedAt)
  for (let i = 1; i < 3; i++) assert.notDeepEqual(starts[i].slice(0, 5), starts[0].slice(0, 5), "voices don't restart together")
  for (const a of audios) {
    assert.ok(a.startedAt.length >= (10 * 60_000) / HUM_PLAY_MS[1] - 1, "each voice keeps coming back")
    assert.ok(a.currentTime + HUM_PLAY_MS[0] / 1000 <= a.duration + 1e-9, "a pass never runs over the loop point")
  }

  hum.stop()
  assert.ok(audios.every((a) => !a.playing), "stop silences every voice")
  clock.advance(60_000)
  assert.ok(audios.every((a) => !a.playing), "and they stay silent")
})
