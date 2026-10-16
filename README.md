# R B M K - Nuclear Reactor Simulation

Manage a nuclear reactor in real time. Control the forces involved to meet power targets and avoid a nuclear disaster. [Open the Simulation here](https://rbmk-simulator.vercel.app/)

- [The game](#the-game)
- [Architecture](#architecture)
- [Testing: outcome-led checks and simulated players](#testing-outcome-led-checks-and-simulated-players)

---

## The game

You are the reactor control engineer on Unit 4. Deliver the power output the grid asks for. Don't let the reactor fail either way: a **meltdown** (reactor temperature reaches 1,200°) or a **core explosion** (steam reaches 600). If your performance falls to 0%, you are **removed from your post**.

### Modes

Every mode runs the same physics. Only the workload changes.

| Mode | Shift | Workload |
| --- | --- | --- |
| **Easy** | 15 min | About one major emergency; small, infrequent target changes |
| **Hard** | 30 min | About three major emergencies; larger, more frequent target changes |
| **Free** | Unlimited | Sandbox: no targets, no events |
| **Safety Test** | 20 min | A scripted recreation of the Unit 4 turbine rundown test (25–26 April 1986) |

### Red cards and blue cards

The model follows Legasov's courtroom explanation. Every second, the cards in play decide whether radioactivity (the fission level) grows or shrinks, in proportion to its current level.

- **Red (push up):** steam in the core (positive void coefficient), graphite rod tips entering the core, cold fuel.
- **Blue (push down):** boron in the control rods, xenon, hot fuel (only a mild brake).

Radioactivity heats the fuel. The fuel heats the reactor, the reactor boils water into steam, and the steam pushes radioactivity up again. A rise left alone feeds itself into disaster. A fall feeds itself into the xenon pit. Power output is steam × 50 MW while the turbine is on the grid, so it lags behind radioactivity.

### Controls

- **Control rods (×10):** drag levers to order positions; rods travel at a fixed speed. Don't park rods at 0%: a rod leaving 0% puts its graphite tip into the core, a brief red spike.
- **AZ-5:** drives every working rod in. It is safe from a normal state, and deadly with rods parked out, high steam and little flow.
- **Water pumps (×4):** more flow cools the reactor and slowly lowers steam. Zero pumps ends in a steam explosion.
- **Turbine:** turns steam into output. When disconnected it can power the pumps during a power cut.

Stay within ±10% of the target (never tighter than ±200 MW) and performance climbs. Outside that band it falls. The grid warns of each target change 60 s ahead. In Easy and Hard the shift brings emergencies too: power cuts, control rod jams, pump trips, grid holds and turbine trips. Full rules are on the in-game **How to Play** page.

---

## Architecture

A Next.js 16 / React 19 app (Tailwind, shadcn/ui), deployed on Vercel. The key design choice: **everything that decides what happens is plain, pure TypeScript with no React.** The UI only shows the state and sends the player's inputs. That split is what makes the testing below possible.

```
                ┌──────────────────────────── lib/ (pure, no React) ────────────────────────────┐
 player input → │  advanceGame(state, rng)  ── one second of the whole game                     │ → new GameState
                │     ├─ sim/reactor.ts     reactor physics (cards, temperatures, steam, xenon) │
                │     ├─ game-events.ts     emergencies, power targets, turbine trip            │
                │     ├─ safety-test.ts     the scripted Safety Test                            │
                │     └─ game-utils.ts      warnings, logging, game-over checks                 │
                └───────────────────────────────────────────────────────────────────────────────┘
                         ▲ every second (hooks/use-game-state.ts)       ▲ thousands of times a second (scripts/sim)
                    the browser game                                the test harness and bots
```

### Mechanics (`lib/`)

- **`lib/game-loop.ts`**: `advanceGame` is one second of the whole game as a single pure function. It runs reactor physics, the clock, events or the Safety Test script, warnings and endings. The browser and the test harness call the same function.
- **`lib/sim/reactor.ts`**: the reactor physics. It turns the state into a set of "reactivity cards" and steps radioactivity, fuel and reactor temperature, steam, xenon, rod travel and pump flow forward one second.
- **`lib/sim/tuning.ts`**: every physics number lives in one file, with comments pointing to the design section each serves. Some constants are *derived*, solved from a balanced reference state so the reactor stays calibrated when other numbers change. Event and power target numbers live there too (`EVENT_TUNING`).
- **`lib/sim/rng.ts`**: randomness is always passed in, never hidden. The game uses `Math.random` and the tests use a seeded generator, so any shift can be replayed exactly.
- **`lib/game-events.ts`** and **`lib/safety-test.ts`**: the shift's plan of emergencies, announced target changes and the Safety Test's timed script of orders and automated changes.
- **`lib/reactivity-board.ts`**, **`lib/sound-cues.ts`**, **`lib/rod-drive-voices.ts`**, **`lib/hum-bed.ts`**: pure logic behind the on-screen card board and the sound design (which cue plays when, and how voices overlap). The UI and audio layers only render them.
- **`lib/types.ts`**: the `GameState` shape, mode configs and thresholds.

### UI (`app/`, `components/`, `hooks/`)

- **`app/`**: the home page with mode selection, the game (`/game`) and How to Play (`/instructions`).
- **`hooks/use-game-state.ts`**: ticks `advanceGame` once a second and saves the game to `localStorage`, so a refresh resumes the shift.
- **`components/`**: the control panel and its modals (rods, pumps, turbine), the chart recorder, the red/blue card board, the alarm monitor, the shift log teleprinter, the reactor camera and the end screens. The incident report is styled as a paper end-of-shift report.
- **`hooks/use-audio-manager.ts`**: alarms, the reactor hum and sound effects, driven by the pure cue logic in `lib/`.

### Design documents (`ai/`)

- **`ai/high-level-plan.md`** is the design "bible", the source of truth for what the player should experience. It is organised by area (reactivity, temperatures, pumps, turbine, xenon, rods, events, targets, Safety Test, presentation). Each section gives the change, the player outcome, what must be preserved, and **acceptance checks**.
- **`ai/implementation-plan.md`** maps the bible onto code and records each iteration. If the two disagree, the bible wins.
- **`ai/high-level-plan-changelog.md`** records why the design changed.

---

## Testing: outcome-led checks and simulated players

The physics, events and Safety Test are tested against **what the player should experience**, not against implementation details. Every acceptance check in the bible is written as observable behaviour. Each one is an automated test named after its bible section:

```
✔ §6 hot fuel never stops a rise: with rods and pumps unchanged, a small push ends in disaster
✔ §7 losing all pumps at high radioactivity can be saved by rapid rod insertion
✔ §9 collapse to full xenon takes several minutes
✔ §13 a competent player meets the targets on Easy and Hard, and Hard is harder
✔ §14 surviving to the end is possible with skilful play; ignoring the test ends in disaster
✔ §14 a reactor collapsed when the test begins: every rod is ordered out, and only AZ-5 saves it
```

There are 67 checks across physics, events and targets, the Safety Test, the card board and sound cues. Because the game is pure functions with injected randomness, the whole suite plays many minutes of reactor time and runs in about a second. That changes how the game is developed:

- **Every change is checked against the design.** A tuning tweak to the xenon rate or a reworded Safety Test step is run against all 67 outcomes before it ships. If a change breaks one, the test shows which promise to the player it broke.
- **Changes can be trialled before they are made.** Candidate tuning values can be run against the full suite in a scratch copy, so a proposal comes with evidence of its effects on the whole reactor, not just the part it targets. Combinations are re-checked together, because the reactor is one coupled system: two changes that each pass alone can fail together.
- **Bots play the game.** `scripts/sim/bot.ts` is a scripted "competent player". It reads only what the panel shows (radioactivity and its trend, output, target, temperatures, steam, lamps) and acts every few seconds, like a person. Its play style can be varied: cadence, number of pumps, a reckless rod-pulling strategy, or how it responds when the Safety Test begins. So claims like "a competent player meets the targets on Easy" or "Hard is harder" are measured over whole simulated shifts through the real game loop, not guessed.
- **Instant traces for tuning by eye.** Any physics scenario prints second by second, so the feel of a change (how fast a runaway builds, how long a xenon pit lasts) can be read before anyone plays it.

### Running it

Node 24, no extra installs: the harness uses Node's built-in test runner and TypeScript support.

| Command | What it does |
| --- | --- |
| `node --run sim:test` | Runs every acceptance check |
| `node --run sim:trace -- <scenario>` | Prints a second-by-second trace (`steady`, `pumps0`–`pumps4`, `collapse`, `restart`) |
| `node --run sim:shift [-- seed]` | Plays hands-off Easy, Hard and Safety Test shifts through the real game loop and prints their logs |
| `npx tsc --noEmit -p .` | Type check (the Next build ignores type errors, so this is the real gate) |
| `npm run dev` | Runs the game locally |

---

## Sound

The sound key in the header has two switches that share one volume: **Alarms**, which sound while a warning or emergency lasts, and **Sound effects** (reactor hum, control clicks, rod drives, AZ-5, warning bleeps and the shift log teleprinter). Nothing plays while the game is paused.

## Accreditations

Sound effects and 'control room' image obtained from [Pixabay](https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=80493)
