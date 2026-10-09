# RBMK Simulator – Implementation Plan

Status: **IN PROGRESS. WS1–WS3 are built and waiting on Checkpoint A (owner playtest feedback).** This file maps [high-level-plan.md](high-level-plan.md) (the "bible") onto code. If this file and the high-level plan disagree, the high-level plan wins. Fix this file, not the bible.

---

## 0. Start here (for a new session)

1. **Read, in order:**
   1. bible §0–§2 (how to use the plan, pillars, guardrails);
   2. this file's §7 (done / left to do) and §8 (open questions);
   3. **the owner's playtest results**: a separate Markdown file in `ai/` written by the owner, e.g. `ai/playtest-results.md`. If that name doesn't exist, look for the newest file in `ai/` that isn't one of the plan files.
2. **Check the baseline** before changing anything (commands in §9). All 34 acceptance checks should pass, and `tsc` should be clean.
3. **Next job: Checkpoint A follow-up.** Turn each item of playtest feedback into one of:
   - a tuning change in `lib/sim/tuning.ts`;
   - a model change in `lib/sim/reactor.ts`;
   - a UI fix.

   Re-run the checks after each change. If feedback conflicts with an acceptance check in the bible, **stop and ask the owner**; don't quietly change the check. If the fix is purely numeric, edit `tuning.ts` and use `sim:trace` to confirm the scenario feels as described.
4. When the owner is happy with the feel, move on to **WS4 (events and targets)**, then WS5, WS6 and WS7, following §4 and §7.
5. **House rules:**
   - Never commit. The owner commits.
   - No new npm dependencies (see §2).
   - `npx tsc --noEmit -p .` is the type gate, because `next.config.mjs` ignores type errors during the build.
   - Update §6 (progress log) and §7 (status) of this file when you finish something.

---

## 1. Why a separate implementation plan

The high-level plan says *what* the player experiences. Three things need deciding before code is written:

1. **Sections 5–10 are one coupled system.** They all live in a single tick function, so they must be built together and checked together. They can't be split across people.
2. **Most acceptance checks are numerical behaviours** ("doubles within a few seconds", "restarts within 1–3 minutes"). They need a repeatable, headless way to check them, not just "play it and see".
3. **Several areas touch the same files** (`control-panel.tsx`, `types.ts`, `use-game-state.ts`). Parallel work needs clear file ownership.

---

## 2. Architecture decisions

| Decision | Why |
|---|---|
| New pure simulation core in `lib/sim/` (no React, no `Math.random` hidden inside: RNG injected) | Lets the scenario harness run the real physics headlessly and reproducibly. |
| One tick = 1 s of game time, integrated as **20 sub-steps of 0.05 s** | Exponential radioactivity and rod travel need small steps to stay stable and to make a ~2 s tip spike visible. The UI still updates once a second. |
| **All tuning constants in one object** (`lib/sim/tuning.ts`) | Tuning is expected to take several passes (bible §13). One place, with comments mapping each constant to the bible section it serves. |
| Rods store **ordered position** (`target`) and **actual position** (`insertion`) | The lever modal shows `target` and the panel shows `insertion` (bible §10.3). The old `justReinserted` / `currentlyFullyRemoved` flags and the +50 hack in `use-game-state.ts` are removed. |
| Pumps gain internal `flow` (0–1, ramps over seconds) and `tripped`; station-level `mainsPower` flag | Separates "the player switched it on" (ON lamp), "it receives power from any source" (PWR lamp), and "water is moving" (internal). |
| Turbine gains `turbineMode: "grid" \| "pumps" \| "idle"` (replaces the meaning of `turbineConnected`, which is kept as a derived field for compatibility) | Bible §8. |
| `gameOverCause: "meltdown" \| "explosion" \| "performance"` alongside the existing reason text | Separate end screens (bible §11, §15). |
| `stats` object on state (peaks, lowest rod margin, emergencies handled, seconds in danger) | Incident report (bible §15). |
| `log: LogEntry[]` with `source` (grid / engineer / procedure / alarm / system) and game-time timestamp | Needed by announced target changes (§13), event warnings (§12), Safety Test (§14) and the teletype message area (§15). |
| Saved games: loader merges old saves onto the new initial state and rebuilds missing rod/pump fields | Players with an old save in `localStorage` must not crash. |
| **No new npm dependencies.** Scenario harness runs with Node 24's built-in TypeScript support and `node:test` | The repo has both `package-lock.json` and `pnpm-lock.yaml`. Adding a package risks the two lockfiles disagreeing on Vercel. |

### Model structure (the shape is fixed here; numbers live in `tuning.ts`)

Every quantity below is a red or blue "card", in **points** (1 point = 1% of one rod's boron; bible §10.4).

- **Balance ρ** = base excess + void(steam) + tips − boron − xenon + fuelEffect(fuelTemp) + small correlated noise.
- **Radioactivity:** dR/dt = R · ρ / Λ + source. Exponential (§5, §16).
- **Fuel:** dF/dt = q·R − h(flow)·(F − T). The gap-driven transfer h drops at zero flow (dry-out, §7).
- **Reactor:** dT/dt = m·h·(F − T) − cooling(flow, T, heat-in) − passive.
- **Cooling:** effFlow(flow) × (c₁·(T − inlet) + c₂·heat-in). Diminishing returns per pump (§7).
- **Steam:** chases a target that is 0 below boiling. Above boiling it is set by (T − boiling) × perDegree(flow), with extra escalation as flow → 0 (§7, §8). It never depends on fuel temperature directly.
- **Xenon:** builds below R_build, faster the lower R is. Burns above R_burn at a rate ∝ (R − R_burn) (§9).
- **Fuel effect:** a continuous curve. A weak brake when cool, strengthening as fuel heats, and a strong red card below ~100° (§6, §9).
- **Rods:** constant travel speed (full stroke ~18 s). Boron is linear in insertion. The tip is +10 whenever insertion > 0 (§10).
- **Endings:** meltdown at T ≥ 1200. Explosion at steam ≥ ~600 (double the 300 warning) (§11).

---

## 3. Scenario harness (the acceptance checks, as code)

`scripts/sim/` holds a runner that drives `lib/sim` with scripted inputs and a seeded RNG:

- `node --run sim:test` runs every scenario as an assertion. Each test names the bible section and the acceptance check it covers.
- `node --run sim:trace -- <scenario>` prints a second-by-second table (R, F, T, S, X, ρ and its cards) for tuning by eye.

The scenarios are the bible's acceptance checks for §5–§11. Examples: steady hands-off start; the same rod step at different depths; the tip spike and AZ-5 from all-0%; the 0/1/2/3/4 pump feel; losing all pumps at high R; the xenon pit then restart within 1–3 min; burn-off speed at three radioactivity levels; explosion vs meltdown by flow.

**Engine work is "done" when every scenario passes *and* the owner has playtested Free mode** (checkpoint A below).

---

## 4. Workstreams, ownership and order

| # | Workstream | Bible | Owner | Files (exclusive while active) | Depends on |
|---|---|---|---|---|---|
| WS1 | Reactor engine + harness | 5, 6, 7, 8 (steam, turbine supply), 9, 10 (mechanics), 11 (explosion), 16 | Lead | `lib/**`, `hooks/use-game-state.ts`, `scripts/sim/**`, `package.json` scripts | — |
| WS2 | Control UI for the new mechanics | 2 (exceptions 1–4), 8, 10 | Lead | `components/control-panel.tsx`, `control-rods-modal.tsx`, `turbine-modal.tsx`, `water-pumps-modal.tsx` | WS1 state shape |
| WS3 | Presentation (no mechanics) | 15: camera, chart recorder, wide-screen layout, homepage, mode menu cards and wording (incl. §11 wording) | Sub-agent, in parallel | new `components/reactor-camera.tsx`, `components/chart-recorder.tsx`; `app/game/page.tsx`, `app/page.tsx`, `components/difficulty-modal.tsx`, appended rules in `app/globals.css` | none |
| — | **Checkpoint A: owner playtests Free mode** (feel, tuning) | | Owner | | WS1–WS3 |
| WS4 | Events and targets | 12, 13 | Lead | `lib/game-events.ts`, `lib/sim/tuning.ts` (events block) | Checkpoint A |
| WS5 | Message log styling, end screens, incident report, How to Play, README | 15 | Lead or sub-agent | `components/message-area.tsx`, `game-over-screen.tsx`, `success-screen.tsx`, `app/instructions/page.tsx`, `README.md` | WS1 (stats, log) |
| — | **Checkpoint B: owner playtests full Easy and Hard shifts** | | Owner | | WS4 |
| WS6 | Safety Test mode | 14 | Lead | new `lib/safety-test.ts`; mode config | WS4 |
| WS7 | Sounds | 15 | Owner picks Pixabay clips → lead wires them in | `hooks/use-audio-manager.ts`, `public/sounds/` | owner's clips |
| — | **Checkpoint C: owner plays Safety Test end to end** | | Owner | | WS6 |

Rules for parallel work: a file belongs to one workstream at a time. Shared types (`lib/types.ts`) are changed only by the lead. Nothing is committed by agents; the owner commits.

---

## 5. Open items for the owner

See §8 for the full list of open questions.

---

## 6. Progress log

- 2026-10-09: Plan written. WS1 and WS3 started.
- 2026-10-09: **WS1, WS2 and WS3 done; waiting on Checkpoint A.**
  - **WS1:** engine in `lib/sim/`. 34/34 acceptance checks pass (`node --run sim:test`).
  - **WS2:**
    - rod modal: ordered positions, one-press AZ-5, no text selection, fingertip grab area / drag from anywhere on the track;
    - panel: live rod travel, turbine PUMPS lamp, shared ±10% tolerance and warning thresholds;
    - turbine modal: "Supply station pumps".
  - **WS3:** CCTV reactor camera (inline + fullscreen), chart recorder side panel, CRT homepage title, workload-based mode cards, Safety Test card (IN DEVELOPMENT).
  - **Early from WS5:** a minimal distinct explosion end screen.
  - **Still on the old behaviour until WS4:** event scheduling and target sizes. Power cuts now cut mains so the turbine can supply the pumps, and jams freeze rods mid-travel.
  - **Not yet:** turbine trip on sustained over-pressure (WS4).
  - **Tuning notes for Checkpoint A:**
    - With 3–4 pumps, even all rods out settles below meltdown (hot fuel is a strong brake). Only 2 pumps + rods out melts down.
    - Losing every pump from a hot state (R≈185) explodes ~21 s later; from the normal state, ~104 s.
  - Tools: `node --run sim:trace -- <scenario>` prints a second-by-second table; `node --run sim:shift` runs hands-off Easy/Hard shifts.
- 2026-10-09: Owner ran a first playtest. Feedback is being collected in a separate file in `ai/` for the next session (see §0). The plan was restructured with §7–§9 for handover.

---

## 7. Status: done and left to do (by bible section)

✅ built and checked · 🟡 partly done · ⬜ not started

| Bible § | Item | Status | Notes / where |
|---|---|---|---|
| 5 | Reactivity balance, exponential radioactivity, source term, proportional noise | ✅ | `lib/sim/reactor.ts`, `lib/sim/tuning.ts`. **Feel unconfirmed** (Checkpoint A). |
| 6 | Radioactivity → fuel → reactor chain; continuous fuel-temperature curve | ✅ | |
| 7 | Pump cooling scales with flow/temperature/heat; flow ramps ~4 s; dry-out; boiling escalation at zero flow | ✅ | Timing: see §8 Q2. |
| 8 | Steam follows reactor temperature only | ✅ | |
| 8 | Turbine "Supply station pumps" (steam-based capacity, ON pumps first, no flicker, PUMPS lamp, output 0) | ✅ | `components/turbine-modal.tsx`, `control-panel.tsx`. Only matters during a power cut until WS6. |
| 9 | Xenon build/burn, 0% in normal running, restart route | ✅ | |
| 10 | Linear boron, graphite tips (+10 while insertion > 0), rod travel ~18 s, jams freeze mid-travel | ✅ | |
| 10 | One-press AZ-5 (closes modal); live rod travel on panel; no text selection; touch grab area | ✅ | `components/control-rods-modal.tsx`. **Not yet tested on a real phone.** |
| 10 | Rod-margin warning (minimum 200 of 1000) | ✅ | `THRESHOLDS.rodMargin` in `lib/types.ts`. |
| 11 | Identical physics in every mode | ✅ | The engine has no mode branches. |
| 11 | Core explosion (steam ≥ 600) and its own end screen | 🟡 | Minimal distinct visual + title only. Full incident report is WS5. |
| 11/15 | Mode menu wording describes workload | ✅ | `components/difficulty-modal.tsx` (WS3). |
| 12 | Event budget (Easy ≈1, Hard ≈3 major per shift), no early emergencies, warnings before majors | ⬜ | WS4. **Still the old scheduler** in `lib/game-events.ts` (event every 2–4 min, old 1-in-3 power-cut/jam rule). |
| 12 | Power cut cuts mains only (turbine can supply pumps) | ✅ | Durations still the old ones (WS4). |
| 12 | Single pump trip event | ⬜ | WS4. `WaterPump.tripped` exists in state and the engine honours it; nothing sets it yet. |
| 12 | Turbine trip after sustained over-pressure | ⬜ | WS4. `overpressureSeconds` field exists, unused. |
| 12 | Grid "hold" request (halves tolerance) | ⬜ | WS4. |
| 13 | ±10% tolerance (min ±200 MW), shared by panel and performance | ✅ | `getPowerTolerance` in `lib/types.ts`, `isPowerOnTarget` in `lib/game-mechanics.ts`. |
| 13 | Smaller, less frequent, announced target changes | ⬜ | WS4. Uses `state.log` for announcements. |
| 14 | Safety Test mode | ⬜ | WS6. Menu card exists (IN DEVELOPMENT). Selecting it currently gives a plain 30-min shift with a fixed 5000 MW target and no events (`GAME_MODE_CONFIGS.safety_test`). |
| 15 | CCTV reactor camera (inline + fullscreen), radiation interference | ✅ | `components/reactor-camera.tsx`. |
| 15 | Chart recorder side panel, wide-screen layout | ✅ | `components/chart-recorder.tsx`, `app/game/page.tsx`. Narrow-screen layout checked by reading classes only. |
| 15 | Homepage CRT treatment; Safety Test "historical scenario" card | ✅ | `app/page.tsx`, `difficulty-modal.tsx`. |
| 15 | Message area: sources, teletype/log feel, timestamps | ⬜ | WS5. `LogEntry` type and `state.log` exist but nothing writes to them yet. |
| 15 | End screens per ending + incident report | 🟡 | WS5. `state.stats` tracks peaks, lowest rod margin and seconds in danger. `emergenciesHandled` is never incremented yet (WS4 should do it when a major event ends). |
| 15 | How to Play rewrite (red/blue cards, tips, rod travel, ±10%, same physics) | ⬜ | WS5. `app/instructions/page.tsx` still describes the old mechanics. |
| 15 | README update | ⬜ | WS5. The README still describes the old mechanics; its "Fixes" list is now partly done. |
| 15 | Sounds | ⬜ | WS7. Waiting on the owner's Pixabay picks. |

---

## 8. Open questions (for the owner)

From the engine tuning (raised at Checkpoint A; the owner's playtest file may answer some):

1. **Too forgiving with rods out?** With 3–4 pumps, even all rods withdrawn settles below meltdown (the hot-fuel brake is strong). Only 2 pumps with rods out melts down. Should rods-out be deadlier?
   - Levers: `fuelBrakeMaxSlope`, `voidPerSteam`.
2. **Pump-loss timing.** Losing every pump explodes ~21 s later from a hot state (radioactivity ≈185), at the short end of the bible's 30–60 s. From the normal state it takes ~104 s.
   - Levers: `boilingEscalation`, `pumpRampSeconds`.
3. **Rod sensitivity.** One rod moved 10% shifts radioactivity ~13% and settles in ~20 s. Is that right?
   - Levers: `generationTime`, fuel brake.
4. **Oscillation.** In some hot, low-flow states radioactivity swings up and down every few seconds before settling. Acceptable as "twitchy", or should it be damped?
   - Lever: `fuelToReactorRate`.
5. **Sounds (WS7).** Pick clips on Pixabay (searches: "relay click", "heavy switch", "electric motor loop", "emergency button") and put them in `public/sounds/`.

Decisions made without the owner that they may want to revisit:

- **Rod-margin minimum = 200** (the sum of all ten insertions, out of 1000).
- **Jams:** a jammed rod keeps its position when the jam clears; it doesn't resume its old order.
- **Tripped pumps** show their PWR lamp off.
- **Safety Test camera clock** starts at 26-04-1986 00:00:00 like the other modes. It could start nearer 01:00 via the `clockStartMs` prop.
- **Safety Test card text** says orders come from the test procedure. Check this still matches once WS6 is built.

---

## 9. How to run things

Run these from the project folder in a terminal (VS Code: *Terminal → New Terminal*). They need Node 24+ and no extra installs.

| Command | What it does |
|---|---|
| `node --run sim:test` | Runs the 34 automated acceptance checks (bible §5–§11). Prints ✔/✖ per check and a pass/fail count. |
| `node --run sim:trace -- <scenario> [every]` | Prints a second-by-second table (R, fuel, reactor temp, steam, xenon, balance, flow, rod margin) for one scenario, e.g. `node --run sim:trace -- pumps0 5`. Run it with no scenario name to list them all. |
| `node --run sim:shift` | Runs a hands-off Easy and Hard shift through the real game loop (engine + events + game over) and prints how each ended. |
| `npx tsc --noEmit -p .` | Type check (the real gate; the build ignores type errors). |
| `npm run dev` | Starts the game locally at http://localhost:3000. |
| `npx next build` | Production build, as Vercel runs it. |

Files: tests in `scripts/sim/acceptance.test.ts`, named scenarios in `scripts/sim/scenarios.ts`, helpers in `scripts/sim/harness.ts`. `scripts/sim/register.mjs` lets Node run the TypeScript directly.
