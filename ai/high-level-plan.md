# RBMK Simulator – High-Level Design Plan (v1, for review)

Status: **DRAFT – awaiting approval.** Nothing in this document has been implemented.

This document is the source of truth for *what* we are changing and *what the player should experience*. It deliberately does not say *how* to implement anything. A later implementation plan will map each section to code.

---

## 0. How future agents should use this document

- Work on **one section at a time** (sections 3–13 are self-contained areas). Read Section 1 (pillars) and Section 2 (guardrails) before any section.
- Each section has: **Change** → **Player outcome** → **Must preserve** → **Acceptance checks**. Acceptance checks describe observable behaviour, not code. Numbers given are *initial tuning targets*, not hard requirements.
- If a change in one area forces a change in another (the reactor is one coupled system), note it and check the other section's acceptance checks still hold. Do not silently change behaviour owned by another section.
- Anything not described here is out of scope. If you think something else should change, flag it rather than doing it.

---

## 1. Design pillars

1. **It should feel like operating the reactor from the show.** Every mechanic should map to something the show explains: Legasov's courtroom "red cards and blue cards" (things that push power up vs. things that push it down), xenon poisoning, the positive void coefficient, too few rods in the core, and AZ-5's graphite tips.
2. **Fragility grows with mistakes.** A well-run reactor is forgiving. As the player withdraws rods, runs at low power, loses cooling or lets steam build, the same small input produces bigger, faster consequences.
3. **Difficulty comes from the reactor, not from dice.** Random emergencies become rarer and more meaningful.
4. **Always a way back.** No state short of game-over is unrecoverable. In particular, a collapsed, xenon-poisoned reactor can always be restarted with the right (risky) actions.
5. **Readable cause and effect.** When something happens, the player should be able to see why: through readouts, trends, warnings and messages.

---

## 2. Guardrails (do not change)

- The reactor control interface: button appearance/style, the "MANAGE" button → modal method of control, the lever-drag control rods modal, the pump toggle modal, the AZ-5 button.
- **10 control rods. 4 water pumps.** Same set of controls (rods, pumps, turbine, pause).
- The existing displayed variables: radioactivity, reactor temperature, fuel temperature, steam, xenon, power output, power target, performance, time. **No new player-facing reactor variables.** (Internal helper values are fine if they are not new gauges.)
- Easy, Hard and Free modes continue to exist.
- Meltdown remains a game-over at the existing reactor-temperature limit.

**One explicitly requested exception:** the turbine modal gains the option to power the pumps (Section 8).

---

## 3. Research summary (what we are simulating)

**The show / real sequence (compressed):**
1. Unit 4 is scheduled for a safety test: can the turbine, coasting down after steam is cut off, power the cooling pumps for the ~minute before diesel generators start?
2. Power is reduced to about half. Kiev's grid controller then asks them to **hold power for ~10 hours**, delaying the test into the night shift.
3. During the reduction, power **collapses to near zero** (operator/regulator error). **Xenon** builds up and poisons the core.
4. Under pressure from the deputy chief engineer, operators **withdraw almost all control rods** to get power back. They only reach ~200 MW thermal, well below the planned test power. The rods-in-core margin falls far below the 15-rod minimum.
5. **Extra circulation pumps** are started for the test. More water in the core means less steam, which in an RBMK *reduces* reactivity, forcing yet more rod withdrawal.
6. The test begins. Steam to the turbine is shut off. The turbine slows, the pumps it powers slow, **coolant flow drops, water boils into steam, steam adds reactivity, power rises.**
7. AZ-5 is pressed. Rods begin entering from fully withdrawn; their **graphite tips displace water first and add reactivity**. Power spikes to many times rated output in seconds. Steam explosion.

**RBMK characteristics that matter for the game:**
| Characteristic | Game meaning |
|---|---|
| Positive void coefficient: steam in the core increases reactivity | Steam is a "red card". More steam → more power → more heat → more steam. |
| Void effect dominates at **low power**; fuel temperature (Doppler) effect stabilises at **high power** | Low power is the unstable, dangerous regime. High power is self-steadying. |
| Few rods in the core makes the void effect far worse and the AZ-5 tip effect dangerous | Withdrawn rods = fragile reactor. Rod margin is the player's safety buffer. |
| Rods take many seconds to travel (~18 s) | Rods are not instant brakes. |
| Hot fuel is less reactive; cold fuel more reactive | Fuel temperature is a gentle brake when hot and the restart lever when cold. |
| Xenon builds after power reductions / at low power, burns off at higher power | The xenon pit, and the dangerous temptation to pull rods to escape it. |
| Fission heat is produced in the fuel, then passes to the coolant/graphite | Supports the proposed "radioactivity → fuel → reactor → steam" chain. |
| Power changes exponentially: the rate of change is proportional to current power | The genuine source of "it ran away in seconds". |

---

## 4. Current-state assessment

**Current relationships (as implemented):**
- Radioactivity changes by a *fixed* amount each second: a constant baseline, minus a fixed amount per % of rod insertion, minus xenon, plus a little for steam, plus/minus fuel-temperature effects only at the extremes (above ~600° or below ~100°).
- Reactor temperature is heated by radioactivity (in uneven tiers) and cooled by a fixed amount per pump.
- Fuel temperature simply lags behind reactor temperature.
- Steam chases a target set by reactor temperature; with zero pumps, steam additionally rises in proportion to radioactivity.
- Xenon rises slowly (mostly random walk) below ~65 radioactivity and is wiped out almost instantly above ~110.
- Graphite tip: +50 radioactivity / +20° whenever a rod moves off exactly 0%.

**What works and must be preserved:**
- The xenon pit loop, the xenon cap, and the cold-fuel restart route.
- The all-pumps-off escalation feel.
- The graphite tip concept, AZ-5, rod jams, power cuts, target changes.
- Steam → turbine → power output → performance against target.

**Problems found:**
1. **No genuine exponential behaviour.** Because changes are fixed amounts rather than proportional to current power, the reactor never "runs away" or "collapses" on its own; it drifts linearly. Rods have the same effect at 20 radioactivity as at 400.
2. **Temperature chain is backwards.** Heat appears in the reactor and then soaks into the fuel. The fuel's stabilising effect therefore arrives late and only at extremes.
3. **Pump cooling ignores conditions.** Each pump removes the same heat regardless of how hot or how powerful the reactor is. Pumps have no effect on steam/void except the special zero-pump case, so "more water → less reactivity" (central to the test) does not exist.
4. **Rods are uniform and instant.** All insertion depths are equally effective, rods move instantly, and the tip effect is avoidable by leaving a rod at 1%.
5. **Easy and Hard have identical reactor mechanics** despite the menu promising "more stable" vs "challenging" mechanics. Only events and targets differ.
6. **Random events are frequent and severe.** An event roughly every 2–4 minutes; about 1 in 3 is a power cut or rod jam. Hard mode can jam 5–8 of 10 rods for up to 3 minutes. A 30-minute game can see 3–4 major emergencies.
7. **Hard-mode targets can jump by thousands of MW at once** (range 500–10,000 MW). Tolerance is a fixed ±500 MW, which is generous at high targets and huge at low ones; the README says "within 10%".
8. **Only one way to lose to the reactor** (meltdown). The show's actual ending, an explosive power excursion, has no equivalent.
9. Smaller: heating tiers are uneven (the "acceleration" tier is actually gentler), a few warning thresholds differ slightly between panel and warning list, and the "Power Test" mode placeholder already exists.

---

## 5. Reactivity and radioactivity (the core change)

**Change:** Replace "radioactivity changes by fixed amounts" with a **reactivity balance**, Legasov's red and blue cards. Each second, every factor contributes a push up or down:

- **Red (raise power):** steam/void, cold fuel, xenon burning off, graphite tips entering, rods being withdrawn.
- **Blue (lower power):** rod insertion, xenon, hot fuel, water (more pumps = less void).

The net balance sets the **rate** at which radioactivity grows or shrinks **in proportion to its current level**. A positive balance compounds; a negative one decays. A small, constant **source term** keeps radioactivity from ever being exactly zero, so a dead reactor can always be restarted.

**Fragility:** the *strength* of the red cards increases as the reactor gets into worse states:
- fewer rods in the core (low rod margin) → steam's push becomes much stronger;
- lower power → steam's push dominates the fuel-temperature brake;
- less coolant flow → steam forms more readily.

**Player outcome:**
- At healthy power with rods reasonably inserted, the reactor is calm. Changes respond within seconds and settle.
- As the player pulls rods or drops to low power, the reactor becomes twitchy. The same lever movement causes faster, larger swings.
- In truly bad states (rods out, low flow, rising steam), power can go from "fine" to "catastrophic" in seconds.
- Over-inserting rods or flooding the core with water at low power makes radioactivity **collapse quickly**, sliding toward the xenon pit.

**Must preserve:** baseline drift so a hands-off reactor is never perfectly static; some small randomness (now proportional, not fixed).

**Acceptance checks:**
- Starting state with default rods and two pumps is roughly steady; hands-off drift is slow (tens of seconds before a correction is needed on Hard).
- An identical rod change produces a visibly larger and faster response when most rods are withdrawn than when most are inserted.
- There exists a reachable state where radioactivity at least doubles within a few seconds with no player input.
- Radioactivity never sticks permanently at zero.

---

## 6. Temperatures: fuel and reactor

**Assessment of the proposed chain:** **Adopt it.** "Radioactivity → fuel temperature → reactor temperature → steam" matches reality (fission heat is produced in the fuel and passes to coolant and graphite). It also fixes the gameplay problem that the fuel brake arrives too late. The current chain should be reversed.

**Change:**
- **Radioactivity heats the fuel.** Fuel temperature responds fairly quickly (seconds) and runs hotter than the reactor while at power.
- **Fuel heats the reactor.** Heat flows from fuel to reactor in proportion to the gap between them. Reactor temperature is slower and steadier, representing the bulk of coolant and graphite.
- **Fuel temperature feeds back on reactivity continuously:** hotter fuel is a gentle, always-present blue card that steadies the reactor at high power. Very cold fuel gives the strong red card used for restarting (Section 9).
- **Meltdown stays on reactor temperature** at the existing limit, so players' existing understanding holds.

**Not exponential:** fuel and reactor temperature are heat balances. They should follow power with lag. They rise very fast only *because* power is very high, never through their own exponential rule.

**Player outcome:** Fuel temperature becomes a meaningful early warning: it climbs first when power rises and tells the player what the reactor temperature is about to do. Reactor temperature is the "you have this long" gauge.

**Acceptance checks:**
- After a power increase, fuel temperature rises before reactor temperature.
- At steady power, fuel temperature sits above reactor temperature.
- At high power, raising power further is noticeably self-limiting through hot fuel (unless cooling is lost or rods are far out).

---

## 7. Water pumps and cooling

**Assessment:** Pumps should act on the **reactor temperature (coolant) and on steam formation**, not directly on fuel. In the new chain, cooling the reactor widens the fuel-to-reactor gap, so fuel cools indirectly. Cooling fuel directly would make reactor temperature meaningless. One secondary effect does touch the fuel: with **no** flow, heat transfer out of the fuel degrades (dry-out), so fuel overheats faster.

**Change:**
- Pump cooling scales with **how many pumps run** *and* **how hot / how powerful** the reactor is. Each pump removes more heat when there is more heat to remove, with diminishing returns per extra pump.
- Pumps determine **how much of the reactor's heat turns into steam inside the core**. More flow keeps water liquid (less void, a blue card). Less flow lets water boil (more void, a red card).
- **Zero pumps (or unpowered pumps) triggers boiling escalation:** steam generation accelerates sharply as the reactor heats, which drives power up, which drives heat up. This is the deliberate nonlinear loop that replaces today's special-case rule. The outcome must feel the same or stronger.

**Player outcome:** clear, distinct feel for each pump count:
| Pumps | Feel |
|---|---|
| 4 | Strong cooling, little steam. At low power this suppresses reactivity and can push the reactor toward collapse (the "extra pumps" trap from the test). |
| 2–3 | Normal operating band. |
| 1 | Hot, steamy, twitchy. Workable at modest power with care. |
| 0 | At high power, a runaway within roughly 30–60 s if ignored. At low power, a slower but real slide. |

**Acceptance checks:**
- Turning a pump on/off has a visibly larger effect at high power than at low power.
- Running all four pumps at low power measurably lowers radioactivity.
- Losing all pumps at full power with no player response ends in disaster within about a minute; rapid rod insertion and turbine-to-pumps can save it if acted on quickly.

---

## 8. Steam, turbine and turbine-powered pumps

**Change (steam):** Steam is produced by reactor temperature above boiling, increased by low flow and decreased by high flow (Section 7). Steam remains the single variable that both feeds the turbine and adds reactivity. Sustained extreme steam contributes to the explosion ending (Section 11).

**Change (turbine-powered pumps):** the turbine modal gains a second choice when the turbine is **disconnected from the grid**: **"Supply station pumps."**
- When supplying pumps, **power output to the grid is 0** (performance falls if a target is set).
- The number of pumps it can power depends on **steam volume**: no steam → none; some steam → 1–2; plenty → all 4. Turbine power goes to pumps the player has switched ON first.
- It only matters when grid power is lost. With grid power available the pumps run from the grid, so this mode is pointless (and costs output).
- Changes in the number of turbine-powered pumps should be smoothed so pumps do not flicker on/off every second.
- The existing PWR lamps on the pump panel show which pumps are receiving power, whatever the source. The turbine panel may gain one small indicator lamp for "supplying pumps", matching the existing lamp style. No other control changes.

**Player outcome:** a power cut becomes a decision rather than just a wait. Do I sacrifice my grid output to keep cooling going? It's self-balancing but imperfect: more pumps reduce steam, which reduces turbine power, which powers fewer pumps. The player must nurse it. This is exactly the turbine-rundown concept from the real test and ties directly into Safety Test.

**Acceptance checks:**
- During a power cut with turbine supplying pumps, PWR lamps light in proportion to steam.
- Power output reads 0 while supplying pumps.
- Reconnecting to the grid restores output and returns pump power to the grid supply (or none, if the power cut continues).

---

## 9. Xenon and recovery from low power

**Change:**
- Xenon tends toward a **level set by power**: high xenon at low power, low xenon at high power. It approaches that level gradually (minutes), not instantly. Xenon remains capped at 100%.
- Xenon **burns off gradually**, faster at higher power. Burn-off is itself a red card. As xenon clears, the reactor gains reactivity, so a player who pulled every rod to escape the pit must re-insert them as it burns away, or overshoot.
- **The restart route stays:** sufficiently cold fuel provides a strong red card, and the source term (Section 5) keeps a spark alive. With rods fully or almost fully withdrawn and fuel cold, a fully poisoned, collapsed reactor will always restart.

**Player outcome:** the classic Chernobyl trap. Falling into the pit is slow and ominous; escaping it requires pulling rods out (making the reactor fragile); the escape then accelerates as xenon burns off. Recovery is always possible, and it is the most dangerous moment of a normal game.

**Acceptance checks (invariants, test these explicitly):**
- From radioactivity ≈ 0 and xenon at cap, with all rods withdrawn and pumps used to cool the fuel, radioactivity begins climbing within roughly 1–3 minutes on Hard.
- Once radioactivity is back at normal levels, xenon falls over roughly 1–2 minutes, not instantly.
- If the player does nothing during burn-off with rods fully withdrawn, power overshoots dangerously.
- Collapse → full xenon takes several minutes, giving the player time to notice and react.

---

## 10. Control rods

Ten rods, same lever modal, same AZ-5 button. Changes are in behaviour only.

**Change:**
1. **Non-uniform rod effectiveness.** The top portion of travel does little, the middle of the core is most effective, the last portion adds less (an S-shaped worth curve). Rods "barely in" give little authority, which is why a reactor with rods mostly out is hard to control.
2. **Rod margin.** The total rod insertion acts as the reactor's safety margin. Below a threshold (the game's version of the "15-rod minimum"), the void effect is amplified and the tip effect becomes dangerous. A warning in the existing message area tells the player they are below minimum margin.
3. **Rods travel over time.** Applying a new setting moves the rods toward it over several seconds (full stroke about 10–20 s, tune to taste). AZ-5 also takes seconds to complete. The lever modal and panel display are unchanged; the panel display shows rods moving.
4. **Graphite tip effect, reworked.** Any rod entering from near fully withdrawn (not only exactly 0%) briefly adds reactivity before its boron takes effect. The spike scales with how many rods enter at once, how much steam is in the core and how low the rod margin is.
   - Normal reactor + AZ-5 → shutdown works, maybe a small blip.
   - Rods mostly out + high steam + AZ-5 → the tips can cause the very excursion AZ-5 was meant to stop.

**Player outcome:** rods become the central skill. Keeping a margin of rods in the core is safety; pulling them out buys power at the cost of control. AZ-5 is a powerful tool that can kill you if you have let the reactor get into the wrong state, just as in the show.

**Open decision for you:** rod travel time is the biggest feel change in this section. It makes rods feel physical and makes the tip effect dramatic, but it reduces responsiveness. Recommendation: include it, with a fairly quick stroke on Easy and slower on Hard.

**Acceptance checks:**
- Leaving rods at 1–2% no longer avoids the tip effect.
- AZ-5 from a normal state always shuts the reactor down safely.
- AZ-5 from "most rods out, high steam" causes a dangerous spike and can be fatal.

---

## 11. Difficulty and failure endings

**Change (difficulty):** Easy and Hard differ in **reactor behaviour** as the menu already promises. Easy has gentler feedback (weaker void effect, faster rods, more forgiving margins). Hard uses full-strength feedback. Free mode uses Hard's physics. Safety Test uses its own settings (Section 14).

**Change (endings):** add a second reactor failure alongside meltdown:
- **Meltdown** (existing): reactor temperature exceeds the limit. Slow overheating death.
- **Core explosion** (new): a runaway power excursion, where radioactivity and/or steam exceed an extreme ceiling. A fast, violent death matching the show's ending.
- **Removed from post** (existing): performance hits 0.

Each ending gets its own game-over presentation.

**Acceptance checks:** Easy is noticeably more forgiving than Hard in identical situations. The explosion is reachable via the runaway / AZ-5 tip scenarios. Meltdown remains reachable via sustained overheating.

---

## 12. Random emergency events

**Change:**
- **Far fewer major emergencies, each more meaningful.** Recommended starting budget: Easy ≈ 1 major emergency per 15-minute shift. Hard ≈ 2–3 per 30-minute shift. No major emergency in the first few minutes, with sensible spacing between them.
- **Brief warning before major events where it fits** (e.g. "grid instability reported" shortly before a power cut) so the player can prepare.
- **Power cut:** keep. Somewhat shorter on average, now with the turbine-to-pumps option making it a decision.
- **Rod jam:** keep but less severe at random (2–4 rods, not 5–8). Make jams more likely when the reactor is abused (very high temperature, fuel channel damage), as with the show's rods stopping a third of the way in.
- **New, smaller events (fit the theme):**
  - **Single pump trip:** one pump fails for a period. A lighter alternative to a full power cut.
  - **Turbine trip:** consequence-based rather than random. Sustained over-pressure (the existing OVR-P lamp) trips the turbine off the grid. This gives the high-steam warning a real consequence.
  - **Grid controller "hold" request:** the grid asks the station to hold its current output for a period (Kiev's request from the show). Flavour plus mild pressure.
- Retire the rigid power-cut / rod-jam alternation in favour of the budget above.

**Player outcome:** the shift feels like running a reactor, punctuated by a couple of memorable crises, not a stream of unrelated failures.

**Acceptance checks:** a typical Hard game shows the budgeted number of major emergencies. Rod jams never lock more than ~4 rods from a random event. A turbine trip only happens after visible over-pressure warning.

---

## 13. Power targets

**Recommendation (to be confirmed by playtesting):**
- **Smaller, less frequent changes on Hard.** Cap each change at a fraction of today's maximum (roughly ±1,500–2,500 MW), at intervals of several minutes.
- **Announced changes:** the grid controller gives notice ("increase to X MW in 60 seconds"), so the player plans a manoeuvre rather than reacting to a jump.
- **Tolerance proportional to target** (e.g. ±10%, with a sensible minimum). This matches the README and makes low targets precise rather than trivially wide.
- **Keep low targets as a deliberate danger, but rarer.** A low target is a xenon trap; that is good tension, used sparingly on Hard.
- Final values are tuned together with Sections 5–12, not independently.

**Acceptance checks:** a competent player can meet every Hard target with planned manoeuvres. Low targets visibly risk xenon buildup.

---

## 14. New mode: Safety Test

Replaces the existing "Power Test (Coming Soon)" placeholder. A scripted scenario of roughly 20–25 minutes that recreates the show's night: the player spends most of the game getting the reactor into an unfavourable state under pressure, then the test exposes it.

**Communication:** a distinct **test procedure / log** style in the existing message area. It shows the current phase, the next instruction, and messages from named roles. Recommendation: use roles, not real people's names: Deputy Chief Engineer, Kiev Grid Controller, Shift Foreman, Senior Reactor Control Engineer. A small phase indicator shows progress through the test.

**No random events.** All disruptions are scripted. Targets are scripted.

**Phases:**
1. **Briefing & power reduction.** Reactor starts at normal power. Procedure: reduce to about half power. Messages explain the test's purpose.
2. **Kiev's delay.** The grid controller orders the station to hold at half power (the show's 10-hour delay, compressed to a few minutes). Xenon slowly builds from the reduction. Tension is quiet.
3. **Shift change & reduction to test power.** Targets step down toward the test band. A **scripted regulator fault** causes a sudden power drop (the show's collapse to near zero). Xenon surges.
4. **"Raise the power."** The Deputy Chief Engineer demands test power. To get there the player must withdraw rods, dropping below minimum rod margin (warnings fire). Performance pressure applies: failing to reach and hold test power drains performance, and at zero the player is removed from their post. Safe play is not free.
5. **Test preparation.** Procedure orders **all four pumps on**. More water in the core suppresses reactivity, forcing yet more rod withdrawal. Then: "Turbine isolated. Simulating loss of external power." Grid power to the pumps is cut; the turbine coasts and supplies the pumps (Section 8), and pumps drop out one by one as it slows.
6. **Rundown.** Flow falls, steam rises, power climbs. The player must manage the excursion with slow-moving rods and dwindling cooling for the test duration (~60–90 s).
7. **End of test: AZ-5.** The procedure orders AZ-5 to shut down. Whether that is safe depends entirely on the state the player put the reactor in.

**Outcomes:**
- **Historical ending (explosion):** a dedicated end screen echoing the show.
- **Test complete, reactor intact:** success screen graded on test performance and how close to the edge the player went (lowest rod margin, peak power, peak steam).
- **Removed from post:** the player refused to push the reactor and failed the test. Allowed, and framed as the "safe but career-ending" choice.

**Player outcome:** Safety Test feels unlike the shift modes. It is a slow-burn story where the player is pushed, step by step, into the configuration the show warns about, then has to survive the consequences. Surviving should be possible but require skill: keeping as much rod margin as the power demand allows, anticipating xenon burn-off, managing steam during rundown, and getting rods partially in before the final AZ-5.

**Acceptance checks:** each phase is triggered and announced clearly. The scripted collapse reliably creates a xenon problem. Following orders blindly with all rods out leads to the explosion at AZ-5. A careful player can complete the test intact.

---

## 15. Presentation and UI (outside the reactor controls)

**Reactor view as a security camera** (both the inline reactor image and the fullscreen "View Reactor"):
- CRT/CCTV monitor bezel, scanlines, vignette, faint flicker and noise.
- On-screen text such as "CAM 04 – REACTOR HALL – UNIT 4", a running timestamp, and a blinking REC dot.
- One subtle imperfection: a hairline crack or grease smudge in a corner.
- **State-driven interference:** at high radioactivity the image picks up white speckles and static, like the radiation-fogged footage of the real event. Brief signal loss at extreme events (tip spike, explosion). This turns the camera into a danger gauge rather than decoration.

**Use wide screens:** instead of empty space beside the square reactor view, add side panels in the same industrial style:
- **Recommended: a chart recorder** (paper strip chart) showing the last few minutes of radioactivity, and perhaps steam and reactor temperature. With exponential behaviour, seeing the *trend and acceleration* is essential, and it fits the control-room aesthetic.
- Optionally a second, smaller camera feed (turbine hall / pump hall) whose state reflects turbine and pumps.
- On narrow screens these collapse below or hide; no horizontal scrolling.

**Message area:** distinguish message sources visually (Grid Controller, Head Engineer, Test Procedure, automatic alarms) and give it a teletype/log feel with timestamps. Keep it compact.

**Homepage and menus:** stronger atmosphere (CRT title treatment, subtle flicker). The mode selection includes Safety Test as a visually distinct "historical scenario" card.

**End screens:** separate presentations for meltdown, core explosion, removed from post and success. Add a short "incident report" with peak values, lowest rod margin, emergencies handled and time in danger.

**How to Play:** rewrite the physics section around the red-card / blue-card explanation so the manual teaches the same model the game uses.

**Sound (existing backlog):** one-off sounds when rods, pumps and turbine changes are applied, and a distinct AZ-5 / rod-motion sound.

---

## 16. Where nonlinear / exponential behaviour belongs

| Relationship | Behaviour | Why |
|---|---|---|
| Radioactivity growth/decay | **Exponential** (rate ∝ current level × net reactivity) | This is how reactors behave. It's the source of runaways and collapses. |
| Strength of steam's push | **Nonlinear, amplified** by low rod margin, low power, low flow | The "fragility" pillar. Matches the RBMK's low-power instability. |
| Steam formation with low/no flow | **Sharply nonlinear** (boiling escalation) | Preserves the all-pumps-off escalation. |
| Graphite tip spike | **Nonlinear** in rods entering × steam × low margin | Harmless normally, lethal in the show's configuration. |
| Xenon burn-off | **Accelerates with power** | Recovery becomes self-reinforcing; must be caught. |
| Rod worth vs depth | **S-curve** (not exponential) | Rods near the top have little authority. |
| Fuel / reactor temperature | **Lagged heat balance** (not exponential) | Fast only because power is fast. |
| Pump cooling | **Proportional** to flow and temperature, diminishing per pump | Physical, readable. |
| Xenon build-up | **Gradual approach** to a power-dependent level | Slow, ominous, readable. |
| Power output from steam | **Linear** | Keeps targets predictable. |

---

## 17. Suggested delivery order

1. Reactor core model (Sections 5, 6, 7, 9, 16) together, in Free mode first, with acceptance invariants checked.
2. Control rods (10) and steam/turbine-powered pumps (8).
3. Difficulty split and explosion ending (11).
4. Events and targets rebalance (12, 13), tuned with playtests of full Easy and Hard shifts.
5. Safety Test mode (14).
6. Presentation (15), which can run in parallel with steps 2–5 since it does not touch mechanics.

---

## 18. Open decisions for the owner

1. **Rod travel time:** include (recommended), and how slow?
2. **Explosion ending:** add as a separate failure (recommended)?
3. **Safety Test names:** roles only (recommended) or the show's character names?
4. **Turbine-to-pumps outside a power cut:** allow it as a no-benefit option (recommended, simplest) or only offer it during a power cut?
5. **Chart recorder / side panels on wide screens:** go ahead?
6. **Tolerance:** switch to proportional (±10%) as the README describes?
