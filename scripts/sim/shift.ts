// Runs whole hands-off Easy and Hard shifts through the real game tick (engine + events + game over). Usage: node --run sim:shift
import { INITIAL_GAME_STATE, GAME_MODE_CONFIGS, type GameState } from "../../lib/types"
import { calculateGameTick } from "../../lib/game-mechanics"
import { checkGameOver, checkWarnings } from "../../lib/game-utils"
import { shouldTriggerEvent, generateRandomEvent, applyEvent, updateActiveEvents } from "../../lib/game-events"
for (const mode of ["easy", "hard"] as const) {
  const cfg = GAME_MODE_CONFIGS[mode]
  let s: GameState = { ...structuredClone(INITIAL_GAME_STATE), mode, difficultyIsHard: mode === "hard", gameTime: cfg.timeLimit!, lastEventTime: cfg.timeLimit!, timeLimit: cfg.timeLimit }
  const types: string[] = []
  while (s.gameTime > 0 && !s.isGameOver) {
    const { updates, ending } = calculateGameTick(s)
    s = { ...s, ...updates, gameTime: s.gameTime - 1 }
    s = { ...s, ...updateActiveEvents(s) }
    if (shouldTriggerEvent(s)) { const e = generateRandomEvent(s); if (e) { types.push(`${s.gameTime}:${e.type}`); s = { ...s, ...applyEvent(s, e) } } }
    s.warnings = checkWarnings(s)
    const go = checkGameOver(s, ending)
    if (go.isGameOver) { s.isGameOver = true; s.gameOverCause = go.cause }
  }
  console.log(mode, "ended", s.isGameOver ? s.gameOverCause : "survived", "at", s.gameTime, "R", s.radioactivity.toFixed(0), "perf", s.performance.toFixed(0), "mains", s.mainsPower, "\n  events", types.join(" "), "\n  stats", JSON.stringify(s.stats))
}
