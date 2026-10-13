# RBMK Simulator – Implementation Plan

Status: **IN PROGRESS. WS1–WS6 are built; only WS7 (sounds, waiting on the owner's clip picks) is left. Mechanics iterations 1 (§10), 2 (§12), 3 (§13), 4 (§14), 5 (§15) and 6 (§16) are done, along with the message-area split (§11.1). WS4 (events and targets), WS5 (log, end screens, How to Play, README) and WS6 (Safety Test) were built on 2026-10-12 (§17) without touching the reactor physics. Iteration 7 (§20) is planned in three steps from the owner's playtests 2–4. Step 7a (pumps act on steam only below one pump, the turbine powering more pumps per unit of steam, and a Free-mode welcome message) is built. Waiting on the owner's manual test of 7a before step 7b (half-strength rods).** This file maps [high-level-plan.md](high-level-plan.md) (the "bible") onto code. If this file and the high-level plan disagree, the high-level plan wins. Fix this file, not the bible.

---

## 0. Start here (for a new session)

1. **Read, in order:**
   1. bible §0–§2 (how to use the plan, pillars, guardrails);
   2. this file's §7 (done / left to do) and §8 (open questions);
   3. **the owner's playtest results**: `ai/manual-test-results.MD`;
   4. **§20 (the next step):** iteration 7, planned in three steps. Do the next step that isn't marked done, and only after the owner has playtested the one before.
2. **Check the baseline** before changing anything (commands in §9). All 53 acceptance checks should pass (36 physics in `acceptance.test.ts`, 17 events/targets/Safety Test in `events.test.ts`), and `tsc` should be clean.
3. **Next job: read the owner's newest results in `ai/manual-test-results.MD` (written after step 7a, §20.3), then carry on with §20: step 7b if the owner is happy with 7a, otherwise re-plan from the results.** Events, targets and Safety Test questions are in §17.5. Iterating in small steps is deliberate: the owner wants to measure each change's effect, so don't add extra tuning while you're there. In general, turn each item of playtest feedback into one of:
   - a tuning change in `lib/sim/tuning.ts`;
   - a model change in `lib/sim/reactor.ts`;
   - a UI fix.

   Re-run the checks after each change. If feedback conflicts with an acceptance check in the bible, **stop and ask the owner**; don't quietly change the check. If the fix is purely numeric, edit `tuning.ts` and use `sim:trace` to confirm the scenario feels as described.
   - Event and target numbers live in `EVENT_TUNING` (end of `lib/sim/tuning.ts`); the Safety Test script is `lib/safety-test.ts`. A physics change can move what the Safety Test's targets demand, so re-run `sim:test` (its §14 checks play the whole test with a bot).
4. WS4, WS5 and WS6 are built (§17). WS7 (sounds) waits on the owner's Pixabay picks (§8 Q5).
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
- **Fuel effect:** a continuous curve counted from normal running temperature (0 at `REFERENCE_STATE.fuelTemp`). It's blue when hotter (mild per degree, firming a little above ~1,300°, but always weaker than the steam that comes with it, so it never stops a rise), and red when cooler, with an extra strong red card below ~120° (§6, §9). Because the hot brake and the cold push are one curve, the xenon cap is derived against the cold push (`xenonCapBelowExcess`).
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
- 2026-10-12: **WS4, WS5 and WS6 built** (details in §17). The owner asked for as many next steps as made sense before the next round of manual tests. **No reactor physics changed:** every `TUNING` value is as iteration 6 left it, so the owner's next Free-mode test still measures iteration 6.
  - One pure game loop (`lib/game-loop.ts`) now drives the React hook and the harness alike.
  - 53/53 checks pass (17 new, for bible §12–§14). `tsc` is clean and `next build` passes.
- 2026-10-12: **Message area rebuilt from the owner's Easy-mode playtest** (details in §18). Only the notification items were done; the owner's other notes in that test (pumps on turbine power, pump strength) wait for more testing. **No physics or event numbers changed.**
  - Warnings are typed on a green-screen computer monitor; the shift log is a teleprinter printing on paper, newest at the top, four messages in view.
  - Every log message now comes from a named person. New target-change wording, which no longer gives the number in advance. The owner kept it: bible §13 updated (changelog v2.7), and the bot no longer chases a grid target before it is confirmed (§18.3).
  - Owner follow-up: the two machines always stack, the alarm monitor's "All clear" label is gone, and the shift log has the chart recorder's housing.
  - 53/53 checks pass, `tsc` is clean, and the UI was checked in headless Chrome at 1400 px and 390 px.
- 2026-10-13: **Iteration 7 planned (§20) from the owner's tests 2–4, and step 7a built.**
  - Pumps change steam per degree only below one pump (C1, owner's idea; bible changelog v2.10).
  - The turbine powers a pump per 25 steam, was 35 (C4). The owner picked 25 over 20 to keep the Safety Test's climax (§20.3).
  - Free mode opens with a welcome from the Plant Director (C5).
  - 53/53 checks pass; `tsc` is clean. Waiting on the owner's playtest before step 7b (half-strength rods).

---

## 7. Status: done and left to do (by bible section)

✅ built and checked · 🟡 partly done · ⬜ not started

| Bible § | Item | Status | Notes / where |
|---|---|---|---|
| 5 | Reactivity balance, exponential radioactivity, source term, proportional noise | ✅ | `lib/sim/reactor.ts`, `lib/sim/tuning.ts`. **Feel unconfirmed** (Checkpoint A). |
| 6 | Radioactivity → fuel → reactor chain; continuous fuel-temperature curve | ✅ | |
| 7 | Pump cooling scales with flow/temperature/heat; flow ramps ~4 s; dry-out; boiling escalation at zero flow | ✅ | Timing: see §8 Q2. Since §20 (7a), flow changes steam per degree only below one pump. |
| 8 | Steam follows reactor temperature only | ✅ | |
| 8 | Turbine "Supply station pumps" (steam-based capacity, ON pumps first, no flicker, PUMPS lamp, output 0) | ✅ | `components/turbine-modal.tsx`, `control-panel.tsx`. One pump per 25 steam since §20 (7a). |
| 9 | Xenon build/burn, 0% in normal running, restart route | ✅ | |
| 10 | Linear boron, graphite tips (+10 while insertion > 0), rod travel ~18 s, jams freeze mid-travel | ✅ | |
| 10 | One-press AZ-5 (closes modal); live rod travel on panel; no text selection; touch grab area | ✅ | `components/control-rods-modal.tsx`. **Not yet tested on a real phone.** |
| 10 | Rod-margin warning (minimum 200 of 1000) | ✅ | `THRESHOLDS.rodMargin` in `lib/types.ts`. |
| 11 | Identical physics in every mode | ✅ | The engine has no mode branches. |
| 11 | Core explosion (steam ≥ 600) and its own end screen | ✅ | Flash and shock ring, own title, incident report (WS5). |
| 11/15 | Mode menu wording describes workload | ✅ | `components/difficulty-modal.tsx` (WS3); `GAME_MODE_CONFIGS` descriptions now match. |
| 12 | Event budget (Easy ≈1, Hard ≈3 major per shift), no early emergencies, warnings before majors | ✅ | `planShiftEvents` / `runShiftEvents` in `lib/game-events.ts`; numbers in `EVENT_TUNING` (§17.1). |
| 12 | Power cut cuts mains only (turbine can supply pumps); shorter | ✅ | Easy 20–45 s, Hard 30–60 s. Warned 40 s ahead ("grid instability"). |
| 12 | Rod jam as today, freezing rods mid-travel | ✅ | Warned 25 s ahead ("pressure fluctuations"). |
| 12 | Single pump trip event | ✅ | A running pump trips for 60–90 s (Hard 60–120 s); the pump modal shows TRIPPED. |
| 12 | Turbine trip after sustained over-pressure | ✅ | `checkTurbineTrip`: 20 s of OVR-P on the grid, with a countdown warning. Easy and Hard only. |
| 12 | Grid "hold" request (halves tolerance) | ✅ | `getPowerTolerance(target, hold)`; no new target is announced during a hold. |
| 13 | ±10% tolerance (min ±200 MW), shared by panel and performance | ✅ | `getPowerTolerance` in `lib/types.ts`, `isPowerOnTarget` in `lib/game-mechanics.ts`. |
| 13 | Smaller, less frequent, warned target changes | ✅ | 60 s warning via `pendingTarget`; the number comes with the confirmation (bible v2.7, §18.3). Low targets kept rarely (§17.1). |
| 14 | Safety Test mode | ✅ | `lib/safety-test.ts` (§17.3). The test's rundown is kept as built (owner, §17.5). |
| 15 | CCTV reactor camera (inline + fullscreen), radiation interference | ✅ | `components/reactor-camera.tsx`. The Safety Test's clock starts at 01:10:00. |
| 15 | Chart recorder side panel, wide-screen layout | ✅ | `components/chart-recorder.tsx`, `app/game/page.tsx`. Narrow-screen layout checked by reading classes only. |
| 15 | Homepage CRT treatment; Safety Test "historical scenario" card | ✅ | `app/page.tsx`, `difficulty-modal.tsx` (no longer "In development"). |
| 15 | Message area: sources, teletype/log feel, timestamps | ✅ | Rebuilt as an alarm monitor and a shift-log teleprinter (§18): `components/message-area.tsx`, `alarm-screen.tsx`, `shift-log-printer.tsx`. |
| 15 | End screens per ending + incident report | ✅ | `components/incident-report.tsx`, `game-over-screen.tsx`, `success-screen.tsx`. |
| 15 | How to Play rewrite (red/blue cards, tips, rod travel, ±10%, same physics) | ✅ | `app/instructions/page.tsx`; numbers read from `THRESHOLDS`, `TUNING` and `EVENT_TUNING`. |
| 15 | README update | ✅ | Describes the current game; "Still to come" lists the sounds. |
| 15 | Sounds | ⬜ | WS7. Waiting on the owner's Pixabay picks. |

---

## 8. Open questions (for the owner)

From the engine tuning (raised at Checkpoint A; the owner's playtest file may answer some):

1. ~~**Too forgiving with rods out?**~~ **Answered (test 2): yes, the hot-fuel brake is too strong.** Addressed by §10 M1.
2. **Pump-loss timing.** Losing every pump explodes ~21 s later from a hot state (radioactivity ≈185), at the short end of the bible's 30–60 s. From the normal state it takes ~104 s. *Still open; re-check after §10 (M2 changes the zero-flow steam factor).*
   - Levers: `boilingEscalation`, `pumpRampSeconds`.
3. **Rod sensitivity.** One rod moved 10% shifts radioactivity ~13% and settles in ~20 s. *After §10 M1 this becomes ~+24%; after §14 M8, +38% at 30 s; after §15 M10, +52% at 30 s and it never settles (+170% at 200 s).*
   - Levers: `generationTime`, fuel brake.
4. **Oscillation.** In some hot, low-flow states radioactivity swings up and down every few seconds before settling. *Seen in test 2 ("another huge swing"). Deferred to §10.5 D1, together with spike size and fuel speed.*
   - Lever: `fuelToReactorRate`.
5. **Sounds (WS7).** Pick clips on Pixabay (searches: "relay click", "heavy switch", "electric motor loop", "emergency button") and put them in `public/sounds/`.

Decisions made without the owner that they may want to revisit:

- **Rod-margin minimum = 200** (the sum of all ten insertions, out of 1000).
- **Jams:** a jammed rod keeps its position when the jam clears; it doesn't resume its old order.
- **Tripped pumps** show their PWR lamp off.
- **Safety Test camera clock** now starts at 01:10:00 (was 01:00:00 for the 30-minute test), so the test still begins at 01:23:04 as it did on the night and the shift ends at 01:30. The procedure log uses the same clock.
- **Safety Test card text** says orders come from the test supervisor, the Deputy Chief Engineer and the Kiev grid controller.
- **WS4–WS6 choices** (event numbers, timings, script targets): listed in §17.4.

---

## 9. How to run things

Run these from the project folder in a terminal (VS Code: *Terminal → New Terminal*). They need Node 24+ and no extra installs.

| Command | What it does |
|---|---|
| `node --run sim:test` | Runs the 53 automated acceptance checks: bible §5–§11 (physics) and §12–§14 (events, targets, Safety Test). Prints ✔/✖ per check and a pass/fail count. |
| `node --run sim:trace -- <scenario> [every]` | Prints a second-by-second table (R, fuel, reactor temp, steam, xenon, balance, flow, rod margin) for one scenario, e.g. `node --run sim:trace -- pumps0 5`. Run it with no scenario name to list them all. |
| `node --run sim:shift [-- seed]` | Plays hands-off Easy, Hard and Safety Test games through the real game loop (`lib/game-loop.ts`) and prints how each ended, its stats and its full message log. |
| `npx tsc --noEmit -p .` | Type check (the real gate; the build ignores type errors). |
| `npm run dev` | Starts the game locally at http://localhost:3000. |
| `npx next build` | Production build, as Vercel runs it. |

Files: physics tests in `scripts/sim/acceptance.test.ts`, event/target/Safety Test tests in `scripts/sim/events.test.ts`, named scenarios in `scripts/sim/scenarios.ts`, helpers in `scripts/sim/harness.ts`, scripted players in `scripts/sim/bot.ts` (§17.1). `scripts/sim/register.mjs` lets Node run the TypeScript directly.

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

---

## 13. Mechanics iteration 3: DONE 2026-10-12

Source: the owner repeated the 1-pump Free-mode test after iteration 2 and reported it in chat.

### 13.1 What the test showed

- **Observation:** with 1 pump, everything still levels off.
  - Fuel temperature rises, then stops; reactor temperature and steam follow, so radioactivity stops climbing.
  - "The feedback loop no longer exists... the hot fuel brake is too strong. 1 pump on should result in a disaster, not a steady state."
  - The owner accepts the fuel–reactor gap as permanent.
- **Why:** as the fuel heats, the brake grows faster than the extra steam push (the gap means fuel rises ~2° per unit of radioactivity on top of the reactor's rise). So the loop always finds a balance point.
- **New owner rule:** one pump left alone ends in disaster. Bible §7's 1-pump row was updated (changelog v2.3).

### 13.2 Change made

**M7. Weaker hot-fuel brake:** `fuelBrakeMaxSlope` 0.3 → **0.27**. Xenon worth follows automatically (derived), so the xenon pit stays escapable.

Trials:

| Brake | 1 pump, left alone | Side effects |
|---|---|---|
| 0.3 (before) | levels off at reactor ~1,020° | — |
| **0.27** | meltdown ~7.5–8.5 min after the switch (reference start) or ~7 min (game start); first warning ~3 min | normal 2-pump running unchanged |
| 0.28 | meltdown after 9–12 min | — |
| 0.25 | meltdown after 5–6 min | — |
| 0.22 | meltdown after ~4 min | hands-off 2-pump runs collapse to 0 on some seeds; too unstable |

### 13.3 Results

- 35/35 checks pass and `tsc` is clean.
- **Test set-up changes (no assertion loosened):**
  - **"Zero pumps at low radioactivity"** started at normal radioactivity (100) despite its name. It now starts at a genuinely low level (`steadyAt(60)`), where the zero-pump climb takes ~96 s. From 100 it had dropped to exactly 60 s, right at the check's edge.
  - **`az5AllOut`** now presses AZ-5 when the restart first passes radioactivity 20 instead of 60, before xenon starts burning off. The peak is at 2 s, ×4.7, which is the bible's "about 2 seconds".
    - From 60, the tip push still ended at ~2 s, but xenon burning off kept radioactivity rising for another 4 s. That's bible §9 behaviour, not the tip.
- **Side effects to watch in the playtest:**
  - **3 pumps left alone from the balanced reference state** slide down: the low-radioactivity warning appears after ~5 min, xenon builds, and the reactor falls into the pit by ~10 min. That's the mirror image of the 1-pump runaway.
    - From the real game start, which creeps up, 3 pumps settles at radioactivity ~74.
    - Bible §7 calls 2–3 pumps the "normal operating band", so this needs the owner's view.
  - **A single rod move now goes slightly further:** 10% gives +30% at 30 s and +41% after 200 s (was +26% / +31%).
  - **The cooldown-and-restart sequence peaks higher** (~2,400 vs ~2,000) and melts down sooner if left alone.
  - **`sim:shift`:** an ignored power cut cuts all pumps and explodes ~45 s later (bible §7). Hands-off Hard ended on performance.

### 13.4 Still open (candidates for the next iteration)

- **D1. Fuel speed, spike size and swings.** Unchanged; the spike is now a bit bigger.
- **D2. Cooling after shutdown.** Unchanged.
- **§8 Q2. Pump-loss timing.** ~17 s from a hot state (bible: 30–60 s). Still short.
- **3-pump slide** (above). Owner to judge.

---

## 14. Mechanics iteration 4: DONE 2026-10-12

Source: the owner's Free-mode test after iteration 3 (`ai/manual-test-results.MD`). Trials were run on a scratch copy of the engine before anything changed in the repo.

### 14.1 What the test showed

| # | Owner observation | What the sim shows | Action |
|---|---|---|---|
| 1 | Still too easy at the start: 9 min in, radioactivity steady ~120. Suggests rod 1 a further 4% out. | Reproduced: the game start creeps to ~126 and stops. | Fixed by M8 (the start now keeps climbing). Start offset left at 5%: a further 4% fails the bible §5 start check (output leaves ±10% after 36 s, check needs ≥45 s). |
| 2 | **The core loop doesn't work.** Pulling rod 1 out 2%, 4%, then 6%: radioactivity rises a little (~155) and stalls; fuel stops ~750°, reactor temperature and steam barely move, and the extra steam (175, 8,700 MW) doesn't push radioactivity up. Suspects the hot-fuel brake acting through the fuel–reactor gap before the reactor has heated. | Confirmed. From the balanced state, rod 1 out 2% gives only +12% after 15 min; 10% gives ~+47% and stops. Fuel rises ~5° per unit of radioactivity (reactor ~3° plus the gap ~2°), and the brake there (~0.18 points/°) took back nearly everything the extra steam added. The owner's reading of the gap is right: the brake works on fuel, which moves further than the reactor. | M8 |
| 3 | Radioactivity drops 20% (155 → 130) with no input: "no idea why". | That's the random drift: its spread was ~4.4 points, worth ±20–30% of radioactivity, which hid the player's own moves. | M9 |

### 14.2 Changes made

- **M8. Brake reshaped: mild in the normal range, firm when hot.** `fuelBrakeMaxSlope`/`fuelBrakeHalfTemp` replaced by `fuelBrakeMildSlope` **0.16** points/°, `fuelBrakeHotSlope` **0.24**, `fuelBrakeFirmsAt` **900°** (the high fuel warning) and `fuelBrakeFirmWidth` **80°**, a smooth step between the two slopes (`fuelBrake` in `lib/sim/tuning.ts`).
  - The steam loop now beats the brake through the normal range, so a rise keeps feeding itself for minutes. With two pumps it's caught once fuel is past ~900°; with one pump it isn't.
  - The cold push (the same curve below normal) gets a little stronger; xenon worth is derived from it, so the pit stays escapable (restart begins at 16 s, was 15 s).
  - Trials: mild 0.14–0.15 made the balanced state itself run away; 0.17–0.175 still stalled early. Hot 0.20–0.22 broke the fragile AZ-5 check; 0.24 passes and keeps one pump fatal.
- **M9. Smaller random drift.** `noise.sigma` 0.8 → **0.2** (spread ~1.1 points). Hands-off balanced runs now stay within ~89–113 over 15 min (was 64–137). Still never static (bible §5).

### 14.3 Results

- 35/35 checks pass, no test changed. `tsc` is clean.
- Owner replay (game start, then rod 1 to 33/31/29% at 9 / 11 / 13 min, no noise):

  | | Before | After |
  |---|---|---|
  | 9 min, no input | R 126, fuel 660°, steam 133 (6,650 MW) | R 156, fuel 803°, steam 167 (8,350 MW), still rising |
  | 18 min | R 150, fuel 785°, steam 164 | R 186, fuel 971° (fuel warning), steam 212 (10,600 MW) |

- From the balanced state, rod 1 out 2% / 5%: +11% / +28% at 2 min and +33% / +62% at 15 min (was +8% / +19% and +12% / +26%). One rod 10%: +38% at 30 s, +66% at 200 s (was +30% / +41%).
- The game start, hands off: output leaves ±10% at 62 s (was 77 s) and climbs to ~9,000 MW over 15 min, levelling at ~9,250 MW (fuel ~860°) by 30 min.
- 1 pump left alone: meltdown after ~7 min (balanced state) / ~6 min (game start). Unchanged.
- Pump-loss timing, explosion vs meltdown: unchanged (hot state ~17 s; normal ~56 s).
- Cooldown-and-restart peak ~2,170 (was ~2,400).
- `sim:shift`: hands-off Easy explodes after an ignored power cut (as before); hands-off Hard ends on performance.

### 14.4 Still open (candidates for the next iteration)

- **Pump switches kick harder again.** Because the loop now amplifies every push, 2→1 / 2→3 / 2→4 pumps moves radioactivity +54% / −31% / −57% within 30 s (iteration 1: +28% / −21% / −37%). Rods are amplified equally, so a pump switch is still worth about one 10% rod move, but 3 pumps from the balanced state now slides into the xenon pit within ~5 min (from the game start it settles ~62). Owner to judge.
- **Over-inserting slides down** (as before): rod 1 in 5% from balanced runs down into the pit over ~15 min. Bible §5 wants this direction.
- **D1. Fuel speed, spike size and swings.** Unchanged.
- **D2. Cooling after shutdown.** Unchanged.
- **§8 Q2. Pump-loss timing.** ~17 s from a hot state (bible: 30–60 s). Still short.

---

## 15. Mechanics iteration 5: DONE 2026-10-12

Source: the owner's Free-mode test after iteration 4 (reported in chat), plus an owner decision.

### 15.1 What the test showed

- **Observation:** game start still felt balanced. Restarted with rod 1 a further 5% out (30%): radioactivity 160 at 3 min, 170 at 5 min, 180 at 9 min, with steam ~200 (~10,000 MW) and fuel passing 900° at 8 min. "Where is the feedback loop... steam and its effect on rad is not enough."
- **Sim:** matched (165 / 176 / 182 at 3 / 5 / 9 min). The brake was already firming from ~820°, and with two pumps it caught the rise.
- **Trials:**
  - Stronger steam push alone (`voidPerSteam` 0.8) made the climb twice as big, but it still slowed down and stopped (~310, reactor ~990°).
  - Steam formation growing faster than linear with temperature gave the accelerating loop, but every run exploded, broke 4–5 checks and would change bible §16.
- **Owner decision** (bible changelog v2.5): hot fuel never stops the loop. Very hot fuel may make it "less exponential", but the only ways out are rod insertion and water pumps. The bible §6 "self-limiting" check was replaced.

### 15.2 Changes made

- **M10. Brake always weaker than the steam loop.** `fuelBrakeMildSlope` 0.16 → **0.13**, `fuelBrakeHotSlope` 0.24 → **0.17**, `fuelBrakeFirmsAt` 900° → **1,300°**, `fuelBrakeFirmWidth` 80° → **100°**. Steam is unchanged (still proportional, still linear in temperature at normal flow), so bible §11 and §16 hold: with pumps running, an overheat ends in meltdown.
  - Trials: mild 0.14 / hot 0.18 still stalled (a hands-off start reached R ~355, reactor ~1,130° at 20 min and barely moving). 0.12 made the hands-off start too fast and broke the start check.
- **M11. Starting offset 5% → 3%** (`STARTING_RODS`: rod 1 at 37%). With the stronger loop, 5% left ±10% too soon for the bible §5 start check. 3% leaves it at 72 s.
- **Tests:**
  - The §6 "self-limiting" check is replaced by two new checks: "hot fuel never stops a rise" (rod 1 out 1%, two pumps, hands off → disaster within an hour; it melts down at ~19 min) and "very hot fuel slows the rise without stopping it" (relative growth 0.0013/s at fuel 1,500–1,800° vs 0.0036/s at 700–1,000°).
  - The fragile AZ-5 check (rods 1–6 at 0%, one pump) can no longer settle, because no such state is steady. It now presses AZ-5 during the runaway, when steam first passes 250 (79 s in). Assertion unchanged.
  - Note: `steadyAt()` now finds a state on its way up, not a true steady state, for anything above the balanced reference. The tests that use it still check what they say.

### 15.3 Results

- 36/36 checks pass; `tsc` is clean.
- **Game start, hands off:** 121 / 149 / 194 / 325 at 1 / 3 / 5 / 9 min; output leaves ±10% at 72 s; meltdown ~13.5 min (12 seeds with noise: 13–15 min). Warnings: fuel 900° at ~5 min, radioactivity 250 at ~6.7 min, reactor 800° and steam 300 at ~8.5 min.
- **Owner's test (rod 1 to 30%):** 169 / 261 / 348 / 402 at 1 / 3 / 5 / 7 min; meltdown ~8 min.
- **Rescue trials (rod 1 at 30%):**
  - At 3 min, rod 1 back to 40%: not enough (meltdown ~12 min).
  - At 3 min, rod 1 to 50%: holds ~190–260 for 10 min, still creeping.
  - At 5 min, all rods +5% / +10%, AZ-5, or 4 pumps: stops it, then slides to 0 (xenon pit) unless the player steers back.
- **1 pump:** meltdown ~3 min (was ~7). **0 pumps:** unchanged timing (hot ~17 s, normal ~45 s).
- **Pump kicks within 30 s:** 2→1 +80%, 2→3 −42%, 2→4 −82%. One rod 10%: +52%. Pumps and rods are both amplified; the ratio is unchanged.
- **Downward:** rod 1 in 2% from balanced slides to 0 within 5–10 min; 3 pumps from the game start slides to 0 in ~5 min.
- Cooldown-and-restart peak ~3,000 (was ~2,170).
- `sim:shift`: hands-off Easy and Hard both explode after an ignored power cut.

### 15.4 Still open (candidates for the next iteration)

- **Over-correction slides into the pit.** Any decisive correction (several rods, AZ-5, extra pumps) stops a runaway but then collapses radioactivity unless the player steers back. Owner to judge whether that's the intended "vice versa" or too harsh.
- **Pump kicks are large** (above). Owner to judge.
- **D1. Restart spike** now peaks ~3,000. **D2. Cooling after shutdown.** **§8 Q2. Pump-loss timing.** Unchanged.

---

## 16. Mechanics iteration 6: DONE 2026-10-12

Source: the owner's test after iteration 5 (reported in chat).

- **Observation:** the start (rod 1 at 37%) still felt balanced. Rod 1 pulled to 30% took radioactivity over 200 within two minutes: "just about fast enough for the user to feel they need to act". The owner asked for the equivalent of rod 1 at 29%, spread over three rods (3%, 3%, 2% further out than the iteration 5 start).
- **Change M12:** `STARTING_RODS` is now the reference minus `STARTING_OFFSETS` [6, 3, 2]. Rods 1–3 start at 34 / 37 / 38%; the rest are unchanged (40% and 55%).
- **Bible §5 start check rewritten** at the owner's request (changelog v2.6). The new test checks that radioactivity rises every 30 s for the first 3 min, output leaves ±10% within 60 s, radioactivity has doubled by 3 min, and hands-off ends in disaster.
- **Results:** 36/36 checks pass; `tsc` is clean.
  - Game start, hands off: radioactivity 152 at 10 s (a quick step from the rods), then 177 / 222 / 277 / 360 at 1 / 2 / 3 / 5 min.
  - Output leaves ±10% at 25 s.
  - Warnings: fuel 900° at ~110 s, radioactivity 250 at ~150 s, reactor 800° and steam 300 at ~4.3 min.
  - Meltdown at ~7.5 min (6 noise seeds: 448–476 s).

---

## 17. WS4, WS5 and WS6: built 2026-10-12

Source: the owner asked for as many next steps as made sense before the next round of manual tests. The owner's next Free-mode test (header only in `ai/manual-test-results.MD`) still measures physics iteration 6: **nothing in `TUNING` changed.**

### 17.1 WS4: events and targets (bible §12–§13)

**One game loop.** `advanceGame(state, rng)` in `lib/game-loop.ts` is one second of the whole game:

1. physics, power and performance (`calculateGameTick`);
2. the clock, and victory at 0;
3. events ending, the turbine trip and an announced target taking effect;
4. either the shift's events (Easy/Hard) or the Safety Test script;
5. warnings and endings.

The React hook and the harness both call it, so `sim:test` and `sim:shift` exercise the real game. `createNewGame(mode)` builds a fresh game (used by the home page and the hook's reset). The old `lastEventTime`/`justHadPowerCut` fields are gone, and old saves migrate.

**The shift's plan** (`planShiftEvents`, on the first tick):
- **Budget.** Major emergencies (power cuts, rod jams) and smaller events (pump trips, grid hold requests) per the table below. Kinds are random, with no alternation.
- **Placement.**
  - No major emergency in the first 3 min, and majors are at least 4 min apart.
  - Smaller events start after 2 min and keep 2.5 min clear of every other planned event.
  - Nothing is planned in the last 90 s.
- **At runtime** (`runShiftEvents`), one event runs at a time:
  - An event due while another runs waits until 20 s after it ends.
  - A hold request waits until a target change has been in force for 90 s.
  - Anything pushed past the end of the shift is dropped.
- **Warnings.** The grid reports instability 40 s before a power cut, and the shift foreman reports pressure fluctuations 25 s before a rod jam. Pump trips and holds come without warning.

| (`EVENT_TUNING`) | Easy (15 min) | Hard (30 min) |
|---|---|---|
| Major emergencies | 1 (80%) or 2 (20%) | 2 (20%), 3 (60%) or 4 (20%) |
| Smaller events | 1 or 2 | 3 or 4 |
| Power cut | 20–45 s | 30–60 s |
| Rod jam | 4–7 rods, 30–90 s | 5–8 rods, 60–180 s |
| Pump trip (one running pump) | 60–90 s | 60–120 s |
| Grid hold (tolerance halved) | 90–150 s | 120–180 s |
| Target range | 2,000–8,000 MW | 500–10,000 MW |
| Target change | 500–1,500 MW, every 4–5 min | 500–2,500 MW, every 2–3 min |
| Low targets (kept 30% of the times one is drawn) | below 3,000 MW | below 2,000 MW |

**Target changes.** The Kiev grid controller announces each change 60 s ahead ("Increase output to 6,500 MW…"), held in `pendingTarget`. *Since §18 the grid controller only warns, and gives the number when it confirms the change.* The grid waits while a major emergency or hold runs, and once a major emergency has been warned of. A hold request halves the window (`getPowerTolerance(target, hold)`).

**Turbine trip** (Easy and Hard only, since Free and the Safety Test have no events):
- 20 consecutive seconds of OVR-P (steam ≥ 300) while on the grid trips the turbine to "disconnected".
- A countdown warning shows in the events box the whole time.
- There is no lockout: the player can reconnect at once.

**Emergencies handled** counts major emergencies that ran their course.

**Bot yardstick** (`scripts/sim/bot.ts`). A scripted player that reads only the panel and acts every 3 s:
- It uses a rule of thumb for which radioactivity gives which output, and watches the output trend, easing off as output closes in.
- It chases an announced target 20 s before it takes effect, responds to power cuts, trips and jams, and never parks a rod below 1%. *Since §18.3 it chases early only in the Safety Test, whose orders give the number; the results below are from before that.*
- Over 20 shifts per mode: **Easy** survived 20/20, on target 87% of the time (lowest 76%), final performance 98%. **Hard** survived 20/20, on target 69% (lowest 46%), final performance 88% (lowest 24%).
- The hardest Hard runs are low targets: xenon builds, and climbing back out overshoots as it burns off (the §13 "xenon trap").
- Every planned major emergency fired (21/21 Easy, 59/59 Hard). A few late hold requests were pushed past the end and dropped (4 of 72 smaller events on Hard).

### 17.2 WS5: message log, end screens, How to Play, README (bible §15)

- **Message area** (`components/message-area.tsx`). The red reactor-warnings box is unchanged. The blue box is now the **Shift Log**:
  - **Pinned lines:** running events, an announced target with its countdown, the over-pressure countdown and low performance.
  - **The log below:** a teletype of messages, newest last. The newest line types itself in.
  - **Timestamps** match the panel's TIME, so a countdown in Easy/Hard.
  - **Senders:** each line shows who spoke, e.g. KIEV GRID CONTROLLER, HEAD ENGINEER, SHIFT FOREMAN, PUMP HALL, TURBINE HALL or SYSTEM, coloured by kind.
  - **Collapsing:** when collapsed, the header keeps its active count and shows NEW when a message arrives.
  - **Safety Test:** the box is a typed procedure sheet headed by "Phase n of 6" and the standing orders, with night-clock timestamps.
- **End screens:**
  - Meltdown, core explosion (white flash and shock ring), removed from post, and success, each with its own title, text and stamp.
  - All share a typed **incident report** (`components/incident-report.tsx`): mode, shift time, final performance, peak radioactivity, reactor temperature and steam, lowest rod margin (flagged below 200), emergencies handled and time in danger.
- **How to Play** (`app/instructions/page.tsx`) is rewritten around the red and blue cards, covering every item bible §15 lists, plus events, the Safety Test and endings. Numbers come from `THRESHOLDS`, `TUNING` and `EVENT_TUNING`, so they track tuning.
- **README:** rewritten to match the game.
- **Small fixes:**
  - The performance readout shows the real value when there is no target (it freezes in the Safety Test after the turbine switch, and stays at 100% in Free mode).
  - The panel's warning lamp lights during a pump trip.
  - The pump modal says TRIPPED for a tripped pump.

### 17.3 WS6: Safety Test (bible §14)

`lib/safety-test.ts` holds the script. Each step logs a message from a named role. It may also announce a target (the usual 60 s notice) or make one automated change, which happens once. The player can reverse any change and the script never undoes it. There are no random events.

*Superseded by §19 (20-minute test, Test Supervisor gives the targets). The table below is the original 30-minute build.*

- **Clock.** The night clock (camera and log) reads 01:00:00 at the start, so the test begins at 01:23:04.
- **Performance** can remove the player from post (`performanceAffectsGameOver` is now true).

| Shift time | Night clock | Phase | Who | What |
|---|---|---|---|---|
| 0:00 | 01:00 | 1 Briefing and power reduction | Test procedure | The test's purpose |
| 0:15 / 1:40 | 01:00 / 01:01 | | Deputy Chief Engineer | Targets 3,500, then 2,500 MW |
| 3:00 | 01:03 | 2 Kiev's delay | Kiev Grid Controller | Test postponed: hold 1,000 MW |
| 5:30 / 8:00 | 01:05 / 01:08 | | Senior Reactor Control Engineer / Shift Foreman | Xenon is building: draw rods, watch the margin |
| 10:00 | 01:10 | 3 Shift change: reduction to test output | Shift Foreman, Deputy Chief Engineer | Targets 700, then 500 MW (13:00) |
| 16:00 | 01:16 | 4 Raise the power | Deputy Chief Engineer | Target 1,000 MW; the margin warning; "We run the test tonight" |
| 22:00 | 01:22 | 5 The test | Test procedure | **Automatic:** all four pumps on |
| 22:30 | 01:22:30 | | Test procedure | **Automatic:** turbine off the grid, supplying the pumps; no target from now on (N/A, performance frozen) |
| 23:04 | 01:23:04 | | Test procedure | Test begins: the pumps' mains supply is cut |
| 25:00 | 01:25 | 6 After the test | Test procedure | Test complete: mains restored; no more orders |

**Why these targets.** With two pumps, steady output is about 900 MW at radioactivity 40, 1,240 MW at 45, 1,570 MW at 50 and 2,500 MW at 64. Xenon builds only below radioactivity 50, so Kiev's 1,000 MW builds it slowly and the 700 → 500 MW test band builds it fast.

**Bot results:**
- **Following the targets:** xenon reaches 47% by 10:00 and 100% by about 16:15. The rod margin drops below 200 from about 13:50 and sits around 115 through phase 4. The bot ends with 95% performance.
- **Inserting rods, or pressing AZ-5, as the test begins** (no rod at 0%): survives.
- **Doing nothing once the test begins:** xenon burns off in seconds (radioactivity peaks around 4,800) and the reactor melts down about 80 s into the test.
- **Turbine put back on the grid during the test** (nothing powers the pumps): core explosion about 55 s in.

### 17.4 Decisions made without the owner (please review)

- All the WS4 numbers in the §17.1 table, including the pump-trip and hold durations (the bible gives none) and the warning lead times.
- The grid hold ("hold your current output", bible §12) keeps the current target and halves its tolerance; the target itself doesn't change.
- The turbine trips after 20 s of over-pressure, with no lockout. There are no turbine trips in Free mode or the Safety Test.
- One event at a time, plus the wait rules in §17.1.
- Log timestamps follow the panel clock (night clock in the Safety Test). Reactor warnings stay out of the log, per the owner's §11.1 split.
- Every line of the Safety Test script: wording, targets and timings. The bible's phase timings are kept, and the test begins at 01:23:04.

### 17.5 Open questions for the owner

1. **Answered 2026-10-12: keep it as built (option c) for now.** The owner may revisit after the physics playtests. Bible §11's example ("the Safety Test rundown") is knowingly not met by the scripted rundown. Its physics still holds: a Safety Test runaway with the pumps unpowered explodes (checked in `events.test.ts`).

   **The Safety Test's rundown doesn't reach the show's ending.**
   - **What happens now.** Bible §8 and §14 say the turbine powers pumps in proportion to steam. So once the test begins, steam is low, flow collapses and the runaway starts, but the steam it makes powers the pumps again within about 40 s.
   - **Result.** A test ignored ends in **meltdown**, not explosion. Any AZ-5, however late and even with rods parked at 0%, saves the reactor.
   - **The bible conflict.** Bible §11 expects "the Safety Test rundown" to be a low-flow runaway ending in an explosion.
   - **Options** (no code changed yet):
     - **(a) A real rundown.** When the test begins, the turbine's steam is shut off, so its pump supply runs down over ~45 s whatever the steam is. Measured with the extreme case (no supply at all): ignoring it explodes about 55 s in. Prompt rods or AZ-5 still save it. *A late AZ-5 still saves it too, even with rods at 0%,* because steam is low when it is pressed. Needs a bible change (§14 phase 5, perhaps §8).
     - **(b) Turbine inertia.** The supply follows steam but can only add a pump every few seconds, so a fast runaway outruns the pumps. This keeps bible §8's rule but also changes power cuts in Easy/Hard.
     - **(c) Keep it as built.**
   - **A deadly late AZ-5** (the show's actual ending) would also need physics changes, e.g. a stronger tip or slower rods. That is the owner's call, after the physics playtests.
2. **Event feel** (Checkpoint B): budgets, durations, warning lead times, hold tolerance, the 20 s turbine trip with no lockout, and the target sizes and intervals.
3. **Low targets on Hard** (down to 500 MW) are a real xenon trap for the bot. Are they too punishing at 30% frequency?

### 17.6 What to test (Checkpoints B and C)

- **Free mode (physics, iteration 6):** as planned in `ai/manual-test-results.MD`. The only visible change in Free mode is the new end screen.
- **Checkpoint B, full Easy and Hard shifts.**
  - Do emergencies feel memorable rather than constant?
  - Does 60 s of notice make target changes plannable?
  - Are the warnings (grid instability, pressure fluctuations, turbine over-pressure countdown) noticed in time?
  - Is the Shift Log readable and compact? Is collapsing the warnings box and keeping the log open useful?
- **Checkpoint C, the Safety Test end to end.**
  - Is each phase and order clear?
  - Is the xenon pressure felt in phases 2–4?
  - Does phase 4 push the rod margin under its minimum?
  - How does the test itself feel (see question 1 above)?
- **Everywhere:** the end screens and incident report, How to Play, and the message area on a phone.

---

## 18. Message area rework: built 2026-10-12

Source: the owner's Easy-mode playtest (test two in `ai/manual-test-results.MD`). The owner asked for the notification changes only, and wants more testing before the other notes in that test are acted on. Nothing in `TUNING` or `EVENT_TUNING` changed.

### 18.1 What changed

- **Two machines, one per kind of message** (`components/message-area.tsx`). They always stack, the alarm monitor above the shift log (owner). Each still collapses on its own.
  - **Alarm monitor** (`components/alarm-screen.tsx`): the plant computer's screen, "SKALA" after the footer's "© 1986 SKALA CONTROL SYSTEMS". It has green phosphor, scanlines and the VT323 terminal font (`next/font`, no new npm package). Every computer-generated warning types itself out like a command line, with "WARNING" in inverse video. A warning keeps its line while it lasts, new ones are added at the bottom, and the turbine countdown updates in place. With no warnings it reads "ALL SYSTEMS STABLE." The header's status lamp reads "All systems stable" in green, or "N Warnings" in red (owner, restored after it was briefly removed).
  - **Shift log teleprinter** (`components/shift-log-printer.tsx`): printed on the chart recorder's paper, with sprocket holes. Every message is in one ink and in capitals, in a larger type (owner: no colour printers then). The lines of one message sit close together, with a gap and a faint rule between messages (owner). Blank paper always fills the window.
    - **Housing** is the alarm monitor's dark bezel, headed "SKALA · Shift Log" in every mode, the Safety Test included (owner, test five: the phase and orders card is gone and its instructions are in the messages). Its yellow "Printing" lamp is dark when idle. The old ink key and the "Teleprinter · Unit 4" plate label are gone (owner).
    - **No typing effect** (owner): a new message is printed out of sight under the print head while the lamp flashes three times (1.2 s) and then shines (0.8 s). Then the paper feeds down by the message's height (0.45 s) to show it whole. Messages that arrive together print one after another.
    - Two messages are in view, with the top half of the next line showing at the roller (owner: less clutter, and it looks like a roll that goes on). A new message feeds the line that was on top down to about halfway. Older ones are on the roll below.
    - The window's height is fixed for the paper's width and never changes as messages arrive (owner): only the paper moves. It is sized for two messages of typical length (110 characters with time and sender; the median is about 107) plus the half line. A longer message takes more of the window, as it would on a real roll.
    - To read back, drag the paper (mouse or finger), use the mouse wheel, or focus it and use the arrow keys. There is no scrollbar. "Back to latest" returns to the top, and a new message rolls the paper back anyway. Read-back only works once there are more than two messages.
    - Screen readers get the latest messages as plain text.
  - The alarm monitor's typing: `hooks/use-typewriter.ts` and `components/typed-text.tsx`. Reduced motion shows everything at once, on both machines.
- **No more pinned lines.** The running-event summaries, the grid-hold countdown, "NEW TARGET: … in N s" and the "N ACTIVE" count are gone. Everything on the paper is a message someone sent. `getStatusLines` and `GameEvent.message` were removed.
- **Every message comes from a named person** (`LogEntry.from` is now required; the `system` source is gone):

  | Was | Now |
  |---|---|
  | KIEV GRID CONTROLLER (Easy/Hard) | GRID CONTROLLER |
  | SYSTEM: station power restored; rods free again | HEAD ENGINEER |
  | SYSTEM: pump back in service; PUMP HALL | PUMP OPERATOR |
  | TURBINE HALL | TURBINE OPERATOR |
  | TEST PROCEDURE (Safety Test) | TEST SUPERVISOR |
  | SYSTEM "Automatic: all four pumps switched on" | PUMP OPERATOR: "All four pumps switched on, as the procedure requires." |
  | SYSTEM "Automatic: turbine disconnected…" | TURBINE OPERATOR: "Turbine disconnected from the grid and supplying the station pumps, as the procedure requires. No grid target from now on." |

  Old saves keep their log: unsigned "system" lines are migrated (`hooks/use-game-state.ts`).
- **Target-change wording** (owner's text):
  - **Warning:** "Grid demand has changed. We may require an adjustment in your power output. Confirmation to follow shortly."
  - **When the target takes effect, 60 s later:** "Confirmed that a change is required: new power output requested to be X MW."
  - The Safety Test's target confirmations use the same wording.
- How to Play and the README now describe the new target-change flow.

### 18.2 Decisions made without the owner (please review)

- **Safety Test keeps "KIEV GRID CONTROLLER".** Bible §14 names the role, and phase 2 is "Kiev's delay". Easy and Hard use "GRID CONTROLLER".
- **The new senders:** PUMP OPERATOR, TURBINE OPERATOR and TEST SUPERVISOR. PUMP HALL and TURBINE HALL were places, and the test procedure is a document, not a person.
- **The low-performance and turbine over-pressure warnings moved to the alarm monitor**, since they are computer-generated. Before, they were in the events box (§11.1), so hiding the warnings kept them visible. Now hiding the alarm monitor hides them too.
- ~~**Safety Test phase and standing orders** stay visible on a typed card above the paper.~~ Reversed by the owner (test five): the card is removed and the Safety Test log looks and behaves like Easy and Hard. Instructions that were only on the card are now in the messages (the 3,500 MW step, "Keep the reactor under control" at the test, and "keep the reactor safe until 01:30" after it). Bible §14 no longer asks for the phase to be shown (changelog v2.8).
- "a adjustment" was corrected to "an adjustment".
- **Typing speeds:** the monitor types 90 characters a second. The teleprinter prints each message in 2 s (lamp flashing 1.2 s, then steady 0.8 s), then the paper feeds in 0.45 s.

### 18.3 Target changes no longer give the number in advance. Answered 2026-10-12: keep it

- **The conflict.** The new wording gives no number or direction, and the "NEW TARGET in N s" line is gone, so the player learns the target only when it takes effect. Bible §13 said the notice gave the number so the player could plan a manoeuvre.
- **Owner's decision: keep it.**
  - Bible §13 now describes warned changes, and its acceptance check asks for Hard targets to be met once confirmed (changelog v2.7).
  - The bot (`scripts/sim/bot.ts`) only uses a target a player can see. It still chases a Safety Test target 20 s early, because those orders state the number, but in Easy and Hard it waits for the confirmation.
  - The §13 test is now named "warned 60 s ahead". No assertion changed, and all 53 checks pass.
- **What it costs the bot**, over 20 shifts per mode:

  | | Chasing early (before) | Waiting for confirmation (now) |
  |---|---|---|
  | Easy, time on target | 87% (lowest 76%) | 82% (lowest 71%) |
  | Easy, final performance | 98% (lowest 88%) | 96% (lowest 84%) |
  | Hard, time on target | 69% (lowest 46%) | 59% (lowest 39%) |
  | Hard, final performance | 88% (lowest 24%) | 76% (lowest 0%) |
  | Shifts lost | 0 / 40 | 1 / 40 (Hard, removed from post) |

- **Worth watching at Checkpoint B:** Hard is noticeably harder now. The tests' 10 seeds all still survive. Event and target numbers are unchanged, so it's the owner's call whether Hard's target sizes or intervals need easing.

### 18.4 How it was checked

- `node --run sim:test`: 53/53. `npx tsc --noEmit -p .` is clean.
- Headless Chrome, driven over the DevTools protocol with no new dependency, at 1400 px and 390 px (touch):
  - the paper feeds −48 px → 0 then prints;
  - four messages are fully in view;
  - mouse drag, touch drag and wheel all read back without scrolling the page;
  - "Back to latest" works;
  - warnings type out in the VT323 font;
  - the Safety Test card shows.
- **Not changed, already there:** the game page has a React hydration mismatch, because it reads the saved game from localStorage on its first client render. Next's dev overlay shows it as "1 Issue".

---

## 19. Safety Test playtest 2: built 2026-10-12

From the owner's "Test five: safety test" notes in `ai/manual-test-results.MD`.

### 19.1 Changes

- **Xenon creep (physics, bible §9).** New `xenonCreepBelow: 100` and `xenonCreepRate: 0.03` in `lib/sim/tuning.ts`. Below radioactivity 100 xenon creeps up, rising linearly to 0.03 %/s at radioactivity 50. Below 50 the old build-up is added on top, so the rate at 0 is now 0.45 %/s (was 0.42). `xenonBurnAbove` moved from 70 to 100. Clearing a full load takes 167 s at radioactivity 110, 56 s at 130 and 4 s at 500. With two pumps, radioactivity 100 is about 5,000 MW, so any steady output below that now builds a little xenon.
- **Safety Test is 20 minutes** (`timeLimit: 1200`). The script in `lib/safety-test.ts` is shortened phase by phase. The night clock starts at 01:10:00, so the test still begins at 01:23:04 and the shift ends at 01:30.
- **Messages.** The deputy chief engineer still gives the station's target orders. When each takes effect, the "New power output requested to be …" confirmation now comes from the TEST SUPERVISOR (it came from whoever gave the order); Kiev still confirms its own. The xenon explanations (SRCE at 5:30 and 14:30, foreman at 8:00) are removed. The deputy chief engineer says "Bunch of amateurs. Get it done!" and "I want this done already!" during Kiev's hold instead.
- **Test harness.** `steadyAt` holds xenon at 0 while it settles, because below 100 there is no longer a true steady state. Without this it silently settled at ~100 for every target below 100. The §9 burn-off check now measures at 110 and 130 (was 80 and 100), and also checks that xenon creeps just below 100.

| Shift time | Night clock | Phase | Who | What |
|---|---|---|---|---|
| 0:00 | 01:10:00 | 1 Briefing and power reduction | Test Supervisor | The test is about to start |
| 0:15 / 1:15 | 01:10 / 01:11 | | Deputy Chief Engineer | Targets 3,500, then 2,500 MW (each confirmed by the Test Supervisor 60 s later) |
| 2:15 | 01:12:15 | 2 Kiev's delay | Kiev Grid Controller | Hold 1,000 MW |
| 3:40 / 5:10 | 01:13 / 01:15 | | Deputy Chief Engineer | "Bunch of amateurs. Get it done!" / "I want this done already!" |
| 6:15 | 01:16:15 | 3 Shift change: reduction to test output | Shift Foreman, Deputy Chief Engineer | Targets 700 (6:30), then 500 MW (7:45) |
| 9:00 | 01:19 | 4 Raise the power | Deputy, SRCE | Target 1,000 MW; margin warning (11:00); "We run the test tonight" (11:15) |
| 12:00 | 01:22 | 5 The test (8 min left) | Test Supervisor | **Automatic:** all four pumps on |
| 12:30 | 01:22:30 | | Test Supervisor | **Automatic:** turbine supplies the pumps; no target from now on |
| 13:04 | 01:23:04 | | Test Supervisor | Test begins: the pumps' mains supply is cut |
| 15:00 | 01:25 | 6 After the test | Test Supervisor | Test complete: mains restored |

### 19.2 Results (bot, seed 1)

- **Safety Test:** xenon reaches 42% by the shift change (6:15), 71% at "raise the power" (9:00) and 96% as the pumps come on (12:00). The rod margin drops below 200 at about 10:00 and is 130 as the pumps come on. The bot survives. All 53 checks pass.
- **Easy / Hard (seeds 1–3):** all survive. Peak xenon on Easy is 0–2% and on Hard 1–8% (was 0% everywhere). Final performance is within a few points of before.

### 19.3 Open

- Nothing. (The owner's cut-off note about the power target at the 8-minutes-left mark can be ignored, per the owner.)

---

## 20. Mechanics iteration 7: planned 2026-10-13, in three steps

Source: the owner's tests 2 (Easy), 3 (Free, extremes) and 4 (Hard) in `ai/manual-test-results.MD`. Test five (Safety Test) was done in §19. Each observation was replayed on a scratch copy of the engine (the repo was not touched), and each candidate was trialled there with all 53 checks.

**Order (owner, 2026-10-13):** one physics step per playtest.
- **7a:** pumps (C1), plus two changes that don't touch the reactor's feel: the turbine's pump supply (C4) and a Free-mode welcome (C5).
- **Then the owner tests.**
- **7b:** consider half-strength rods (C2).
- **Then more testing.**
- **7c:** a cap on the hot-fuel brake (C3), re-tuned after 7b.

### 20.1 What the tests showed

| # | Owner observation | What the sim shows | Action |
|---|---|---|---|
| 1 | Pumps are overpowered (tests 2, 4). They work as a throttle: 1 pump to make radioactivity spike, 2 to hold it, 3 to make it plummet. Owner's idea: pumps change steam only between no pumps and at least one; above that they only cool, and more slowly. | Confirmed. From the balanced state, 2→3 pumps is −33% at 10 s, −48% at 30 s and 0 by 2 min. 2→4 is −53% / −87%. 2→1 is +52% / +79%, then meltdown at 170 s. The fast part is the direct steam change per pump (`steamFlowK`): steam per degree changes the moment flow changes, before the reactor cools. Since iterations 5–6 the loop amplifies every push, so that instant step snowballs. The §19 xenon creep adds to the slide. | C1 (7a) |
| 2 | During a power cut, the turbine powered only 3 pumps with steam around 85; 4,500 MW should run 4 pumps (test 2). | At 35 steam per pump, plus the no-flicker margin, the turbine powers 1 pump from steam 45, 2 from 80, 3 from 115 and 4 from 150 (7,500 MW). At 85 it powers 2. | C4 (7a) |
| 3 | Free mode shows no shift log, so a Free-mode player never learns it exists. The owner wants a welcome message from the Plant Director (test 3). | The log appears only once it has a message, and Free mode has none. | C5 (7a) |
| 4 | Rods are too powerful: moving one rod is more than enough, and radioactivity either plummets or shoots up (test 4). | One rod 10% out is +48% at 10 s and +110% at 2 min; 10% in is −41% / −100%. On the lever, 1% of travel is about 2 px (192 px track on desktop, 144 px on phones), so a "small" nudge is easily 10%. | C2 (7b) |
| 5 | With rads very high, AZ-5 brings it straight back down (test 4). | From radioactivity 400 in a runaway, AZ-5 halves it in 2 s and takes it under 100 in 3 s. Half-strength rods make that 3 s / 4 s; adding slower rods (25 s stroke) makes it 4 s / 5 s. That is the safe case: the rods are mid-core and their tips are already in. The deadly case, rods parked at 0%, is unchanged. | No change; revisit after 7b if the owner still wants it |
| 6 | No cap on the hot-fuel brake: all rods out with 4 pumps gave radioactivity and fuel over 3,500, then radioactivity plummeted and the pumps cooled the fuel. The reactor should heat faster from such hot fuel. It took 3 big swings before temperature built up (test 3). | Reproduced: 4 pumps, then all rods out from the cooled reactor. Radioactivity 3,493 and fuel 4,028°, down to 185, then swings of 2,695 / 627 / 1,799 / 925, and meltdown ~54 s after the rods came out. With every rod out, the brake must cover ~370 points, which takes fuel at ~3,300°. | C3 (7c) |

### 20.2 The changes

**C1. Pumps act on steam only between no flow and one pump (step 7a; owner's idea; bible §5, §7, §16, changelog v2.10).**
- Steam per degree above boiling no longer depends on flow once at least one pump's worth of water is moving.
  - Below that it rises toward ×1.35 at zero flow, as before.
  - Boiling escalation as flow → 0 is unchanged.
  - Extra pumps act only through cooling, so steam follows the reactor down over minutes.
- In `lib/sim/reactor.ts` the steam flow factor is `exp(k·(1 − min(flow, 1)))`. In `tuning.ts`, `steamFlowK` (0.15) is replaced by `steamZeroFlowK` **0.3** (zero flow ×1.35, the same as before).
- Trial: pump switch from the balanced state, radioactivity at +10 / +30 / +60 / +120 s:

  | Switch | Before | After (trial) |
  |---|---|---|
  | 2→1 | +52% / +79% / +149% / +318%, meltdown at 170 s | +3% / +15% / +37% / +99%, meltdown at ~4.6 min |
  | 2→3 | −33% / −48% / −85% / −100% | −2% / −8% / −21% / −62% |
  | 2→4 | −53% / −87% / −100% / −100% | −3% / −14% / −32% / −98% |

- Unchanged in the trial:
  - losing every pump (explodes after ~48 s hot, ~56 s from normal);
  - the hands-off start (meltdown ~7.5 min);
  - rods;
  - the fragile AZ-5 case.
- All 53 checks passed. 3 pumps left alone still slides to 0, but over 3–5 min rather than 2, slow enough to correct with rods.

**C4. The turbine powers a pump per 20 steam instead of 35 (step 7a; `turbineSteamPerPump`, bible §8 unchanged).** *Built as 25, not 20: see §20.3.*
- With the no-flicker margin, the turbine now powers 1 pump from steam 25 (1,250 MW), 2 from 45, 3 from 65 and 4 from 85 (4,250 MW).
- All 53 checks passed in trial.
- The Safety Test's test output (~1,000 MW, steam 20) still powers no pumps, but a runaway in the test gets pumps back sooner.

**C5. Free-mode welcome (step 7a; no physics).**
- On the first tick of a Free-mode game, the PLANT DIRECTOR logs: "Welcome to your induction. It's the late shift and we're expecting a nice quiet night. Keep things stable."
- The shift log appears as soon as it has a message, so it now shows in Free mode too.
- It's logged on the first tick (`lib/game-loop.ts`) rather than in `createNewGame`, so the teleprinter prints it like any other message.

**C2. Half-strength rods (step 7b; consider after the 7a playtest).**
- Each rod's boron and tip count half as much against the other cards.
  - Equivalent: every other card ×2 and `generationTime` ×2, which keeps bible §10.4's points table as written. Choose whichever reads better when built.
  - Base excess and xenon worth are derived, so they follow.
- Starting offsets double to [12, 6, 4], which keeps the game start exactly as it is.
- Trial: one rod 10% out is +23% at 10 s (was +48%); 10% in is −22% (was −41%). The restart spike from the xenon pit falls from ~4,400 to ~1,300, which also helps the old D1.
- Costs, checked in trial:
  - The AZ-5 trap needs 8 or more rods parked at 0% with one pump; 6 is enough today. That's nearer the real night, but harder to trigger.
  - The fragile AZ-5 check needs a new set-up; don't loosen it.
  - Two checks hard-code "1 point per %" and need updating.
  - Re-check the bot's rod rule of thumb (§14 checks).
- Keeping the tip at 10 points (20% of travel) was also trialled. It broke two §14 checks and the §8 spike check, so it's not recommended.
- A cheaper, complementary option, if the owner wants it: finer lever control (e.g. arrow keys nudge a lever 1%). It doesn't change the look, but the lever modal is a bible §2 guardrail, so the owner decides.

**C3. Cap the hot-fuel brake (step 7c; re-pick the number after 7b).**
- The brake stops growing above a cap temperature (a smooth knee, ~100° wide).
- Trial at today's rod strength, cap 2,000°:
  - all rods out (both versions of test 3) melts down ~9–11 s after the order, with no swings;
  - the hands-off start melts down at ~7 min (was ~7.5);
  - catching a xenon-pit restart is unaffected (only the case that was already fatal gets faster).
- Downside: in the last seconds radioactivity pins at its 50,000 ceiling and fuel reads tens of thousands of degrees.
- Two checks need set-up fixes because they assume the run survives: the rod-travel check, which starts with every rod out, and the §8 spike check, which reads 6 s past the spike.
- A 1,600° cap was too low. The hands-off start melted down at ~5 min, and it broke "very hot fuel slows the rise".
- After C2, an all-rods-out reactor balances at fuel ~1,900° rather than ~3,300°, so the cap must be re-picked then.
- It needs a bible §6 / §16 wording change ("firms a little once very hot, and stops growing above ~X°").

**Trialled and dropped:**
- **Pumps strip less of the heat arriving from the fuel** (`pumpHeatInShare` 0.5 → 0.2), the owner's "reactor heats faster with a large gap". Test 3 melted down at 42 s instead of 53, the swings stayed, and normal play got twitchier. C3 does this job better.

### 20.3 Step 7a: results (built 2026-10-13)

- **C1** as planned: `steamZeroFlowK` 0.3 in `tuning.ts`, `steamFlowFactor` in `reactor.ts`. Measured on the real engine, pump kicks match the §20.2 trial exactly. Rods, the AZ-5 cases, the hands-off start (meltdown at 459 s) and pump loss (explosion after 48 s hot, 56 s from normal) are unchanged.
- **C4 changed from plan: 25 steam per pump, not 20 (owner decision).**
  - **Why.** C1 and C4 passed every check separately, but at 20 together an ignored Safety Test survived. The first pump came back at steam 25 (it was 45), before boiling escalation could build. Radioactivity then sat around 90, below the xenon burn-off level of 100 (§19), so the full xenon load never burned off and nothing ran away. The edge is between 22 (survives) and 23 (melts down).
  - **The owner chose 25:** 1 pump from steam ≈31, 2 from ≈56, 3 from ≈81 (≈4,050 MW) and 4 from ≈106 (≈5,300 MW).
  - **The alternative** was 20 everywhere plus a real Safety Test rundown, in which the turbine's supply coasts down once the test begins (§17.5 option (a)). It's still open if 25 doesn't feel right.
  - **Watch:** 25 is only a little above the edge, so re-check the "ignoring the test ends in disaster" check after 7b and 7c.
- **C5.** The welcome is logged at 00:00:10, from PLANT DIRECTOR. The owner wanted to see it print, not appear at once.
  - The shift log now shows in every mode from the start (`components/message-area.tsx`).
  - Before, Free mode's log only mounted once it had a message, and a message already there on mount counts as printed, so it appeared without the print animation.
- **Text.** How to Play's pump card and the README's pump line now say pumps work over minutes by cooling, and that losing every pump makes water boil far more readily. Bible §5, §7, §8 and §16 were updated (changelog v2.10).
- **Checks.** 53/53 pass with no test changed, and `tsc` is clean.
  - Safety Test bot: survives with rods or AZ-5 as the test begins; ignoring the test melts down.
  - `sim:shift` hands-off games all melt down, as designed: Easy at 7:05, Hard at 24:48, Safety Test at 01:17:29.
- **Unchanged and still open:** test 3's swings (C3), rod strength (C2), AZ-5 at high radioactivity (§20.1 #5).

### 20.4 Step 7a: what to test

- **Pumps:** do rods now feel like the main control, with pumps a slow, secondary lever? Does switching 2↔3 still let you steer radioactivity without rods? Does 1 pump still feel dangerous (it should run away, just more slowly)? Does 0 pumps still feel as violent?
- **Power cut:** with the turbine supplying the pumps, do 3 run from about 4,050 MW and all 4 from about 5,300 MW? Does nursing the pumps still feel like a decision?
- **Safety Test:** does the test still bite if you don't respond?
- **Free mode:** does the Plant Director's welcome print at the start?
- Then decide whether to go ahead with step 7b (half-strength rods).
