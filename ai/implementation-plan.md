# RBMK Simulator – Implementation Plan

Status: **IN PROGRESS.** This file maps [high-level-plan.md](high-level-plan.md) (the "bible") onto code. If this file and the high-level plan disagree, the high-level plan wins. Fix this file, not the bible.

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

- **Sounds (WS7):** an agent can't audition audio, so please pick clips on Pixabay (searches: "relay click", "heavy switch", "electric motor loop", "emergency button") and drop them in `public/sounds/`.
- **Tuning:** all numbers in the bible are starting targets. Checkpoints A and B are where you tell us how it *feels*; we then adjust `tuning.ts` and re-run the harness.

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
