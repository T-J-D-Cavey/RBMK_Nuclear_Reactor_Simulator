# RBMK Simulator – Implementation Plan

Status: **IN PROGRESS. WS1–WS3 are built. Mechanics iterations 1 (§10) and 2 (§12) are done, along with the message-area split (§11.1); waiting on the owner's next manual tests.** This file maps [high-level-plan.md](high-level-plan.md) (the "bible") onto code. If this file and the high-level plan disagree, the high-level plan wins. Fix this file, not the bible.

---

## 0. Start here (for a new session)

1. **Read, in order:**
   1. bible §0–§2 (how to use the plan, pillars, guardrails);
   2. this file's §7 (done / left to do) and §8 (open questions);
   3. **the owner's playtest results**: `ai/manual-test-results.MD`;
   4. **§10 (the next step):** iteration 1 changes worked out from those results.
2. **Check the baseline** before changing anything (commands in §9). All 34 acceptance checks should pass, and `tsc` should be clean.
3. **Next job: read the owner's newest results in `ai/manual-test-results.MD` (written after iteration 2, §12), then plan and make the next iteration the same way.** Open candidates are listed in §12.4. Iterating in small steps is deliberate: the owner wants to measure each change's effect, so don't add extra tuning while you're there. In general, turn each item of playtest feedback into one of:
   - a tuning change in `lib/sim/tuning.ts`;
   - a model change in `lib/sim/reactor.ts`;
   - a UI fix.

   Re-run the checks after each change. If feedback conflicts with an acceptance check in the bible, **stop and ask the owner**; don't quietly change the check. If the fix is purely numeric, edit `tuning.ts` and use `sim:trace` to confirm the scenario feels as described.
4. When the owner is happy with the feel (possibly after several §10-style iterations), move on to **WS4 (events and targets)**, then WS5, WS6 and WS7, following §4 and §7.
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
- **Fuel effect:** a continuous curve counted from normal running temperature (0 at `REFERENCE_STATE.fuelTemp`). It's blue when hotter, strengthening as fuel heats, and red when cooler, with an extra strong red card below ~120° (§6, §9). Because the hot brake and the cold push are one curve, the xenon cap is derived against the cold push (`xenonCapBelowExcess`).
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
- 2026-10-11: Owner's three manual tests (`ai/manual-test-results.MD`) were reviewed and replayed headlessly. Iteration 1 is planned in §10: two mechanics changes plus their bookkeeping, and five UI/text fixes. Nothing has been changed in code yet.
- 2026-10-12: **Iteration 1 built** (§10.2–§10.4). 34/34 checks pass with no assertion loosened; `tsc` is clean; `next build` passes.
  - M1 `fuelBrakeMaxSlope` 0.5 → 0.3. M2 `steamFlowK` 0.25 → 0.15. `xenonWorthPerPercent` is now derived (`xenonCapBelowExcess` = 33, giving ≈3.5 per %).
  - Test set-ups: new `steadyAt(target)` helper in `scripts/sim/harness.ts` replaces the hard-coded "low" (≈70) and "high" (≈180) rods. `allPumpsLostHighR` uses `steadyAt(185)`. The fragile AZ-5 set-up is now rods 1–6 at 0% and rods 7–10 at 100%, one pump (steam ≈270; AZ-5 spikes radioactivity ×1.5).
  - New scenarios `ownerPumpSwitch` and `ownerCooldownRestart`:

    | Scenario | Before | After |
    |---|---|---|
    | `ownerPumpSwitch` (2→1 pumps) | peaks at 132, drifts back to ~100 | jumps to ~127 within 10 s, then keeps creeping up with reactor temperature (129 at t=120); back to 100 on 2 pumps |
    | `ownerCooldownRestart` | peaks at 1,734, settles ~500 | peaks at ~2,000, swings, then sits ~630–760 with reactor temperature climbing toward meltdown |

  - UI: U1–U5 done.
- 2026-10-12: **Fuel card re-counted from normal running** (owner decision; reasons in bible §6 and changelog v2.1).
  - `fuelEffect` now lives in `tuning.ts` and reads 0 at 530°, so base excess is 310 instead of 384.
  - Xenon is derived from base excess plus the push from fully cold fuel, so its value is unchanged (≈3.51 per %).
  - **Behaviour is identical:** traces of six scenarios matched the previous code row for row (1,472 rows), and all 34 checks pass. Only the `fuel` and `base` card values in traces change.

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
| 15 | Message area: sources, teletype/log feel, timestamps | 🟡 | The owner's two-box split is done (§11.1). Sources, teletype feel and timestamps are WS5. `LogEntry` type and `state.log` exist but nothing writes to them yet. |
| 15 | End screens per ending + incident report | 🟡 | WS5. `state.stats` tracks peaks, lowest rod margin and seconds in danger. `emergenciesHandled` is never incremented yet (WS4 should do it when a major event ends). |
| 15 | How to Play rewrite (red/blue cards, tips, rod travel, ±10%, same physics) | ⬜ | WS5. `app/instructions/page.tsx` still describes the old mechanics. |
| 15 | README update | ⬜ | WS5. The README still describes the old mechanics; its "Fixes" list is now partly done. |
| 15 | Sounds | ⬜ | WS7. Waiting on the owner's Pixabay picks. |

---

## 8. Open questions (for the owner)

From the engine tuning (raised at Checkpoint A; the owner's playtest file may answer some):

1. ~~**Too forgiving with rods out?**~~ **Answered (test 2): yes, the hot-fuel brake is too strong.** Addressed by §10 M1.
2. **Pump-loss timing.** Losing every pump explodes ~21 s later from a hot state (radioactivity ≈185), at the short end of the bible's 30–60 s. From the normal state it takes ~104 s. *Still open; re-check after §10 (M2 changes the zero-flow steam factor).*
   - Levers: `boilingEscalation`, `pumpRampSeconds`.
3. **Rod sensitivity.** One rod moved 10% shifts radioactivity ~13% and settles in ~20 s. *After §10 M1 this becomes ~+24%. Owner to judge at the iteration 1 playtest.*
   - Levers: `generationTime`, fuel brake.
4. **Oscillation.** In some hot, low-flow states radioactivity swings up and down every few seconds before settling. *Seen in test 2 ("another huge swing"). Deferred to §10.5 D1, together with spike size and fuel speed.*
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

---

## 10. Mechanics iteration 1 (from the owner's manual tests): DONE 2026-10-12

Source: `ai/manual-test-results.MD`, with three tests: Easy, Free (extremes) and Hard (hands-off). Each test was replayed in the headless sim with today's tuning, so every change below rests on a measured cause rather than a guess. The candidate changes were also trialled on a scratch copy of the engine (the repo was not touched); the "Expected" numbers come from those trials.

**Scope rule for this iteration:** two feel changes to the mechanics (M1, M2), plus the bookkeeping they need to keep the existing behaviour intact. Everything else is deferred (§10.5), so the next playtest can tell what each change did. UI/text fixes (§10.3) don't touch the sim, so they can go in the same round.

### 10.1 What the tests showed

| # | Owner observation | What the sim shows is happening | Action |
|---|---|---|---|
| 1 | Pumps became the main control. Switching 3↔2 pumps jumps radioactivity, so rods could be left alone (tests 1, 2). | A pump switch kicks radioactivity much harder than a rod: 2→1 pumps is +32% within 7 s, 2→3 is −22%, 2→4 is −37%, while moving one rod 10% is only +13%. In the long run radioactivity drifts back to ~100 while steam changes a lot (1 pump: steam 222; 3 pumps: 57). So pumps also buy power output *without* radioactivity. | M1 + M2 |
| 2 | With 1 pump off, steam/power shot up but radioactivity didn't rise; it dropped slightly (test 1). | Confirmed. 2→1 pumps: radioactivity peaks at 132, then sinks back to ~98 over 10 min as steam climbs to 222. Cause: fuel temperature follows reactor temperature up, and at normal fuel temperature the hot-fuel brake (−0.34 points/°) is stronger than the extra steam (+0.21 to +0.27 points/°). **This contradicts bible §5**, which says that in the normal range the steam effect is the bigger of the two. | M1 |
| 3 | Big gap between fuel (657) and reactor (434) temperature without any spike. "Fuel temp should be pegged to radioactivity" (test 1). | The gap already *is* set by radioactivity: fuel − reactor ≈ 2 × radioactivity, so ~200° in normal running (657 − 434 ≈ radioactivity 111). Fuel rose because reactor temperature rose when a pump went off. Bible §6 requires this ("more pumps lower fuel temperature as well"). After M1, a fuel rise from losing a pump comes with a radioactivity rise, which should read as cause and effect. | No change now; question in §10.5 D4 |
| 4 | Hot-fuel brake too strong: rods nearly all out, radioactivity ~500, fuel hot, no problem (test 2). | Confirmed. Rods at 5% with 3 or 4 pumps settles at radioactivity ~390, reactor ~900–1,000°, with no meltdown. Only 2 pumps melts down. | M1 |
| 5 | After cooling down, rods to ~10%: radioactivity 0 → ~1,200 in a few seconds, then down to ~250, fuel >1,100, more big swings. "Crazy, but don't change too many things at once. I like the exponential element" (test 2). | Reproduced: 0 → 1,734 in ~6 s, then 183, 1,045, and settling ~500 with fuel ~1,450°. Cause: rods at 10% are net zero (tip +10 = boron 10), and the base excess (+433) is just over the full xenon load (−400). Once radioactivity passes a few hundred, xenon burns off in ~2 s (bible §9 wants this). The fuel heats at ~0.8°/s per unit of radioactivity, so ~1,400°/s at the peak, and the brake slams it back down: that's the swing. | Not this iteration (owner's call). See D1. |
| 6 | Fuel temperature changes too fast (test 2). | Mostly a symptom of #5: the fuel heats in proportion to radioactivity, so a 1,700 spike heats it at ~1,400°/s. In normal running it settles in ~2.5 s. **Trial: slowing the fuel alone (to ~7 s) makes the #5 spike about 3× bigger** (peak ~5,100, then a dip to ~1) because the brake arrives later. Fuel speed and spike size are one problem and must be changed together. | Deferred to D1 |
| 7 | After AZ-5 temperatures stayed put with no pumps (expected a slow fall), and fell slower than expected with all pumps (test 2: "maybe it makes sense"). | After AZ-5: 0 pumps, reactor 332° → 285° in 10 min (passive cooling is almost nil); 4 pumps, 332° → 182° in 1 min and ~100° in 2 min. | Deferred to D2 |
| 8 | Turned 3 of 4 pumps off; just before meltdown, AZ-5 + pumps on rescued it: "more evidence pumps are overpowered" (test 2). | A rescue by fast rod insertion plus restoring flow is required by bible §7. It happened in the overly forgiving, brake-dominated state of #4. | Re-check after M1/M2; no direct change |
| 9 | Hard, hands-off: almost completely stable for 13 min. Wants a slow uptick that forces a change after a minute or two, maybe via starting rod insertion (test 3). | Hands-off radioactivity stays within 82–118 for 15 min on every seed. **Trial: starting one rod 2–5% further out gives a +2–12% step within ~30 s, then flat.** The reactor settles too fast for a rod offset to show as a slow climb. | Deferred to D3 (needs a different lever) |
| 10 | UI/text items (tests 1, 3). | — | §10.3 |

### 10.2 Iteration 1: mechanics changes

**M1. Weaker hot-fuel brake.** In `lib/sim/tuning.ts`, change `fuelBrakeMaxSlope` from 0.5 to **0.3**.
- *Fixes:* observations 2 and 4, and part of 1.
- *Why 0.3:* it's the strength at which both observations flip. Losing a pump now raises radioactivity (steam beats brake, as bible §5 says), and rods left nearly all out with hot fuel ends in meltdown even with 4 pumps. 0.35 was also trialled: it fixes #2, but with 4 pumps rods-out still just survives (reactor ~1,200°).
- *Required bookkeeping (no change in feel intended):*
  - **Keep the xenon pit escapable.** Base excess is derived from the brake, so a weaker brake shrinks it from 433 to ~384, below the full xenon load of 400. In a trial with nothing else changed, the poisoned reactor never restarted and 11 checks failed.
    - Fix: derive `xenonWorthPerPercent` in `derive()` from base excess, so full xenon stays **33 points** below base excess (today's margin): `(baseExcess − 33) / 100`, ≈3.5 per % at a brake of 0.3.
    - Escaping the pit still needs rods (nearly) all out, exactly as now. Keep 33 as a named constant (e.g. `xenonCapBelowExcess`).
  - **Re-pick the setups of acceptance tests that use hard-coded rod positions.** They were picked for the old brake, and the same rods now give a different state:
    - the "low radioactivity" setup in the four-pumps test falls into the xenon pit;
    - `allPumpsLostHighR` starts at radioactivity ~290 instead of ~185, and explodes in 4 s;
    - the "fragile" AZ-5 setup (rods 1–7 at 0%, one pump) melts down before the test starts.

    Prefer setups that settle to a *target radioactivity* (e.g. a uniform offset from the default rods), so future tuning doesn't break them. Trial results:
    - an offset to radioactivity ~70 passes the four-pumps check (71 → 13);
    - an offset to ~180 passes both pump-loss checks (explosion after 20 s; AZ-5 at +5 s saves it).
  - **The fragile AZ-5 test needs a new setup.** Seven rods at 0% with one pump no longer survives anywhere, even with the other three rods at 100%. Try 2 pumps, or fewer rods parked at 0%. **Do not loosen any check.** If no state with most rods at 0% is both survivable and steamy, stop and ask the owner.
- *Expected (trial, with M2):*
  - one rod moved 10% shifts radioactivity ~+24% (was +13%), so rods matter more;
  - hands-off drift is wider: radioactivity 70–131 over 15 min (was 82–118);
  - rods at 5% with 2/3/4 pumps melts down after ~60/75/95 s;
  - the test 2 sequence peaks ~2,000 (was ~1,700); left alone afterwards, it melts down ~2.5 min later.

**M2. Smaller instant steam change per pump.** In `lib/sim/tuning.ts`, change `steamFlowK` from 0.25 to **0.15**.
- *Fixes:* observation 1.
- *Why it rides with M1:* M1 alone makes a pump switch kick radioactivity even harder (2→1 pumps +50%, 2→4 −53% within 30 s), which the owner has already flagged as wrong. Testing M1 alone would just show a known-bad pump feel.
- *Expected (trial, M1 + M2):*

  | Pumps | Kick within 30 s | After 10 min |
  |---|---|---|
  | 2→1 | +28% | +33% (reactor ~670°, steam 281) |
  | 2→3 | −21% | −14% |
  | 2→4 | −37% | −20% |

  A pump switch is now about one 10–12% rod move; today it's about 2.5×. Pump changes now affect radioactivity in the direction bible §7 describes, so holding radioactivity needs rods.
- *Watch:* this also cuts the zero-flow steam factor from ×1.65 to ×1.35.
  - Losing all pumps from normal now explodes after ~74 s (today ~78 s).
  - Losing all pumps from radioactivity ~180 explodes after ~20 s (today ~14 s; bible: roughly 30–60 s; §8 Q2 is still open).
  - Four pumps at low radioactivity now collapses it hard (71 → 13 in a minute). Bible §7 wants this direction; the owner judges the amount.

**Out of scope for M1/M2:** fuel heating speed, xenon burn rate, `generationTime`, the tip, passive cooling, the starting state. Don't touch them in this iteration.

### 10.3 Iteration 1: UI/text fixes (no mechanics)

| # | Change | Where |
|---|---|---|
| U1 | Remove the sentence "Rods take about 18 seconds to travel their full length." | `components/control-rods-modal.tsx:114` |
| U2 | Remove "Flow takes a few seconds to start and stop." from the pumps modal text | `components/water-pumps-modal.tsx:48` |
| U3 | Wide screens (`xl`): put the reactor camera centred under the control panel (same centre line) and the chart recorder to its *right*, not pushing the camera left. Keep the camera effects. Narrower screens stay exactly as they are. One way: a three-column grid with an empty left column the same width as the chart recorder. | `app/game/page.tsx` (camera + side panel block) |
| U4 | Homepage title box: keep the black flickering CRT background, the "R B M K" H1 and "Nuclear Reactor Control Simulation". Remove the added lines "ChNPP · Unit 4 · SKALA", "26-04-1986" and "> Operator console ready_". | `app/page.tsx` (~lines 52–62) |
| U5 | Power cut message becomes: "⚡ UPDATE FROM HEAD ENGINEER: Power cut detected. Recommend disconnecting turbine to power the pumps." | `lib/game-events.ts:114` |

### 10.4 How to check iteration 1

1. `node --run sim:test`: all checks pass, with only the re-picked setups changed (no assertion loosened). Then `npx tsc --noEmit -p .`.
2. Add two named scenarios to `scripts/sim/scenarios.ts` so the owner's tests can be replayed in every later iteration:
   - `ownerPumpSwitch`: default start, 2→1 pumps at t=10, back to 2 at t=120;
   - `ownerCooldownRestart`: AZ-5 at t=10, all pumps off at t=60, all four on at t=180, all rods to 10% at t=360.

   Note their key numbers in §6 before and after the change. Today's: 2→1 pumps peaks at 132 and drifts to ~98; the restart peaks at 1,734, falls to 183, and settles ~500 with fuel ~1,450°.
3. Update §6 and §7.
4. **Owner playtest:** repeat the same three tests. Questions to answer:
   - Are rods now the main control, with pumps a secondary lever?
   - Does losing a pump now make radioactivity rise?
   - Is rods-out with hot fuel now dangerous?
   - Is the reactor too twitchy in normal running?

### 10.5 Deferred: candidates for iteration 2 (decide after the playtest)

- **D1. Fuel speed, spike size and swings (observations 5, 6; §8 Q4).** Change these together, because slowing the fuel alone makes the spike much worse (§10.1 #6). Candidates, to pick one or two after M1's effect is known:
  - slower fuel (`fuelToReactorRate`, while keeping heat delivered to the reactor per degree of gap the same via `reactorShare`), *plus* something that limits spike growth;
  - a cap on how fast xenon can burn off. The bible wants "seconds", not "instant";
  - a smaller gap between base excess and full xenon, so the restart is gentler.

  The owner likes the exponential element, so it stays.
- **D2. Cooling after shutdown (observation 7).** `passiveCooling` (today ≈ nil: 47° in 10 min), and possibly a stronger pump cooling term at low radioactivity. Low priority; the owner was unsure.
- **D3. Slow uptick at the start of a shift (observation 9).** *Done in iteration 2 as M6 (§12).* A rod offset gives a quick step, not a climb (trial). Options, to choose after M1, which already widens the drift:
  - (a) start the slow drift term (`reactivityNoise`) at a small positive value and lengthen its time constant, so it builds over the first couple of minutes;
  - (b) make the bible §5 baseline drift larger and slower, so hands-off play needs a correction within ~2 min, in a random direction.

  Check with `node --run sim:shift`. The owner should pick (a), a deliberate "upward" start, or (b), "it wanders".
- **D4. Fuel–reactor gap (observation 3).** *Answered in iteration 2 (§12.1): keep it.* Question for the owner after iteration 1: is a ~200° gap in normal running still surprising once fuel and radioactivity move together? If so, the reference gap in `REFERENCE_STATE` can be reduced. That shifts the fuel brake's operating point, so it's a tuning change on its own.

---

## 11. Owner ideas queued for later workstreams

Ideas the owner has asked for, recorded with the workstream they belong to. They don't touch the reactor physics, so they don't interfere with tuning iterations.

### 11.1 Split the message area: reactor warnings vs events (WS5). DONE 2026-10-12 (built early, in iteration 2)

**Idea (owner, 2026-10-12):**
- The red box keeps only warnings about the reactor's own condition: the "noisy" ones about low radioactivity, high xenon and so on.
- Everything else (events, warnings that an event is coming, grid and engineer messages) goes in the other box, which changes from green to another colour.
- An experienced player can then collapse the reactor warnings and keep the events box open, because that's the one they need to watch.

**Today** (`components/message-area.tsx`):
- **Red box:** collapsible, titled "N Warnings". It lists every message from `checkWarnings` (`lib/game-utils.ts`).
- **Green box:** always visible, using the `accent` colour. It lists `activeEvents` messages (power cut, rod jam, target change).
- **When both are empty:** "All systems stable".

**Change:**

1. **Reactor warnings box (red, collapsible, as now).** It keeps only the warnings about reactor variables:
   - high/low radioactivity;
   - high reactor temperature;
   - high/low fuel temperature;
   - high/low steam;
   - high xenon;
   - rod margin below minimum.

   It keeps its count header when collapsed, so a hidden box still shows how many warnings are active.
2. **Events box (new colour, collapsible like the warnings box, with its own count header; owner, 2026-10-12).** It holds everything that isn't about a reactor variable:
   - active events: power cut, rod jam, and in WS4 pump trip, turbine trip, grid hold request;
   - the low grid performance warning, moved out of `checkWarnings`;
   - announcements and advance warnings: target changes with notice, "grid instability reported" (WS4);
   - Safety Test procedure messages (WS6).

   As WS5 builds the log, this box becomes the teletype log with sources and timestamps (bible §15).
3. **Colour:** anything but green, distinct from the red warnings and readable in the existing panel style. Suggestion: the reactor-blue used in the homepage title (teletype/CRT feel). **Owner confirms the colour when it's built.**
4. **Where things are decided:**
   - Split `checkWarnings` into reactor warnings and the low-performance message. The panel's warning lamp (`hasWarnings` in `control-panel.tsx`) should still light for both.
   - WS4 and WS6 messages must go to the events box, not the warnings list.
   - The high-steam warning stays a reactor warning. The turbine trip it can lead to (WS4) is an event.
5. **Not changing:** both boxes start open at the beginning of a game. Remembering the player's collapsed choice between games is out of scope unless the owner asks.

**Timing:**
- This belongs to WS5 (message area). It can be done earlier on its own, since it touches no mechanics.
- WS4 must route its new messages into the events box either way.
- It fits bible §15 ("distinguish message sources visually… keep it compact"), so the bible doesn't need changing.

**Check:**
- Each box collapses and expands independently.
- Collapse the warnings box during a power cut: the power-cut message, target-change notices and low-performance warning stay visible.
- The panel's warning lamp still lights.
- Narrow screens: both boxes stack without horizontal scrolling.

---

## 12. Mechanics iteration 2: DONE 2026-10-12

Source: the owner's Free-mode test after iteration 1 (`ai/manual-test-results.MD`, which now holds only this test). Trials were run on a scratch copy of the engine before anything changed in the repo.

### 12.1 What the test showed

| # | Owner observation | What the sim shows | Action |
|---|---|---|---|
| 1 | Start too balanced; nothing to do at first. Suggests starting one rod a little further out. | In iteration 1, a rod offset gave a step then flat. With M5 it gives a step and then a slow creep: rod 1 at 35% → radioactivity ~113, creeping to ~118. Power output climbs steadily (5,000 → ~6,200 MW) and leaves ±10% of 5,000 MW after ~94 s. | M6 |
| 2 | Reactor temperature is below fuel temperature from the start: should fuel always be hotter? | Yes. Heat is made in the fuel and can only flow from hot to cold, so fuel must stay hotter than the coolant while radioactivity is up, like a radiator stays hotter than the room. Real RBMK fuel runs hundreds of degrees above its ~280°C coolant. The gap is set by radioactivity (fuel − reactor ≈ 2 × radioactivity). Trial of a smaller gap (D4): 150° made normal running twitchier and doubled the restart spike; 100° let hands-off runs collapse to 0. | Keep the gap (D4 closed) |
| 3 | With 1 pump: slow rise to ~13,000 MW and fuel ~900° with no warnings, then everything levels off. "The loop is too muted and gradual." The owner suggested making reactor temperature follow fuel temperature faster, and possibly giving steam more effect, though maybe not yet. | Reproduced: 1 pump levels off at radioactivity 133, reactor 683°, steam 287 and fuel 949°, just under the 300 steam, 800° reactor and 900° fuel warnings. **Faster following** (`reactorShare` ×2, ×3) reaches the *same* plateau sooner (90% after 223 s / 156 s instead of 424 s), because the plateau is set by how strong the loop is, not how fast. It also made losing all pumps explode after 12 s / 9 s from a hot state (bible: 30–60 s) and broke 2–3 checks. **More steam effect** (+20%) lifts the plateau to radioactivity ~200, reactor ~1,020° and steam ~450, with warnings after ~4 min. Normal 2-pump running, rod sensitivity, the restart spike and pump-loss timing are unchanged, and all checks pass. | M5 (not faster following) |

### 12.2 Changes made

- **M5. Steam has more effect on radioactivity.** `voidPerSteam` 0.5 → **0.6** in `lib/sim/tuning.ts`.
- **M6. The game starts slightly off balance.**
  - `STARTING_RODS` in `tuning.ts`: rod 1 starts at 35% instead of 40%. `INITIAL_GAME_STATE` uses it.
  - The engine is still calibrated on the balanced `REFERENCE_STATE` (rods now listed in `REFERENCE_STATE.rods`).
  - In the harness, `baseState()` is the balanced reference state, and the new `gameStart()` is the real starting state.
  - New check: the game start needs no correction for tens of seconds, power output leaves ±10% within 45–180 s, and it keeps creeping up.
  - The bible §5 check was updated with the owner's request (changelog v2.2).
- **U6. Message area split (§11.1).**
  - Two collapsible boxes, both starting open: reactor warnings (red) and events (new deep "event blue" `--event` token in `app/globals.css`, with a radio icon).
  - The low-performance warning moved from `checkWarnings` to the new `checkEventWarnings` (`lib/game-utils.ts`).
  - The panel's warning lamp and the general alarm still respond to both kinds of warning.

### 12.3 Results

- 35/35 checks pass. `tsc` is clean and `next build` passes.
- Owner scenarios:

  | Scenario | After iteration 1 | After iteration 2 |
  |---|---|---|
  | 1 pump from normal | 90% of the rise after 424 s; levels off at radioactivity 133, steam 287, no warnings | warnings after ~258 s; levels off at radioactivity ~200, reactor ~1,020°, steam ~450 |
  | Hands-off from the game start | flat | output leaves ±10% after ~94 s |

- Hands-off reference drift is unchanged (76–132 over 15 min).
- `sim:shift`: the hands-off Easy shift now ends in an explosion at 584 s. Under the old event scheduler a power cut cut all pumps and nobody responded. That's the bible §7 behaviour, not a regression.

### 12.4 Still open (candidates for the next iteration)

- **D1. Fuel speed, spike size and swings.** Unchanged and untested this round.
- **D2. Cooling after shutdown.** Unchanged. Note that faster fuel-to-reactor following (trialled in §12.1 #3) would also speed up cooling with pumps on, but it shortens pump-loss timing.
- **§8 Q2. Pump-loss timing.** ~18 s from a hot state (bible: 30–60 s). Still short.
- **"Gradual" part of observation #3.** M5 makes the 1-pump climb go further but not faster. If the owner still finds it slow, faster following could be revisited *together with* a fix for pump-loss timing.

