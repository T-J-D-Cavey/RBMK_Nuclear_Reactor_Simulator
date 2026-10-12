// Runs whole hands-off shifts through the real game loop (lib/game-loop: engine + events + game over) and
// prints how each ended and what happened. Usage: node --run sim:shift [-- seed]
import type { GameMode } from "../../lib/types"
import { advanceGame, createNewGame } from "../../lib/game-loop"
import { formatLogTime } from "../../lib/game-utils"
import { seededRng } from "../../lib/sim/rng"

const seed = Number(process.argv[2] ?? 1)
for (const mode of ["easy", "hard", "safety_test"] as GameMode[]) {
  const rng = seededRng(seed)
  let s = createNewGame(mode)
  while (!s.isGameOver && !s.hasWon) s = advanceGame(s, rng)
  const ended = s.isGameOver ? s.gameOverCause : "survived"
  console.log(`\n=== ${mode} (seed ${seed}): ${ended} at ${formatLogTime(s, { time: (s.timeLimit ?? 0) - s.gameTime })}, R ${s.radioactivity.toFixed(0)}, perf ${s.performance.toFixed(0)}%`)
  console.log(`  stats ${JSON.stringify(s.stats, (_, v) => (typeof v === "number" ? Math.round(v) : v))}`)
  for (const entry of s.log) console.log(`  [${formatLogTime(s, entry)}] ${(entry.from ?? entry.source).toUpperCase()}: ${entry.text}`)
}
