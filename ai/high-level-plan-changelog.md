# High-Level Plan – Change Log

Why [high-level-plan.md](high-level-plan.md) changed between drafts. The plan only describes what we're building; this file keeps the reasoning so the plan can stay short. Nothing here is an instruction.

## v2.10 – 2026-10-13 (after the Easy, Free and Hard playtests of the events build)

- **Pumps change how readily water boils only between no flow and one pump** (Sections 5, 7, 8, 16). Every extra pump used to make less steam per degree the moment its flow arrived, so switching pumps moved radioactivity within seconds. In play the owner steered with pumps alone: 1 pump to make radioactivity spike, 2 to hold it, 3 to make it plummet, with rods left alone. The owner's fix: flow matters to boiling only between none and some. From one pump upwards, extra pumps act only by cooling the reactor, so their effect builds over minutes. Kept: boiling escalation as flow falls to zero (the all-pumps-off escalation and the explosion ending), more pumps still meaning lower radioactivity, and the Section 7 acceptance checks.

## v2.9 – 2026-10-12 (after the second Safety Test playtest)

- **Xenon creeps up below normal radioactivity** (Section 9 build-up and burn-off, acceptance checks, Section 16 table). Xenon used to build only below about 50 and burn off above 70, so a reactor hovering just above 50 never saw any. The owner wants it to creep up very slowly anywhere below 100, faster the lower radioactivity goes, so staying below 100 lets it accumulate. Burn-off now starts above 100, so getting back above normal soon clears it. There is no longer a band where xenon holds steady. The "normal radioactivity clears a full load in tens of seconds" check now refers to well above normal, because at 100 itself xenon neither builds nor burns.
- **The Safety Test lasts 20 minutes, not 30** (Section 14). The owner found it too long. The phases keep their order and are shortened. The test still starts with 8 minutes left, and the clock still reads 01:23:04 as it begins.
- **The Test Supervisor confirms the Safety Test's target changes** (Section 14 communication). The Deputy Chief Engineer still gives the orders, but the "New power output requested" message when each takes effect now comes from the Test Supervisor. Kiev still confirms its own order.

## v2.8 – 2026-10-12 (after the Safety Test playtest)

- **The Safety Test uses the ordinary shift log** (Section 14 communication; Section 15 message area). The plan asked for a distinct test-procedure style showing the current phase and the next instruction. In play, the owner found the separate "Phase x of 6" card unnecessary and asked for the log to look and behave as it does on Easy and Hard. So the phase is no longer shown, and every instruction is a message from a named role. The script's six phases still structure the scenario, and Section 14's acceptance checks are unchanged.

## v2.7 – 2026-10-12 (after the Easy-mode playtest of the events build)

- **Target changes are warned, not announced** (Section 13 change list and acceptance check). The grid's notice used to give the new target 60 seconds ahead ("increase to X MW in 60 seconds"), so the player could plan the manoeuvre. The owner rewrote the messages: the grid now only warns that demand has changed, and confirms the new target when it takes effect. A target change is now something the player reacts to, with a minute's warning that one is coming. The acceptance check now asks a competent player to meet Hard targets once confirmed, rather than with planned manoeuvres. The Safety Test's scripted orders still give their targets in advance.

## v2.6 – 2026-10-12 (after the sixth playtest)

- **The start climbs straight away** (Section 5 acceptance check). The v2.2 "slow creep, no correction for tens of seconds" start still felt balanced. The owner tested rod 1 at 30% (radioactivity over 200 in two minutes, "just about fast enough for the player to feel they need to act") and asked for an equivalent start spread over three rods.

## v2.5 – 2026-10-12 (after the fifth playtest)

- **Hot fuel never stops the loop** (Sections 3, 5, 6, 7 table, 16; Section 6 acceptance check replaced). v2.4 let the hot-fuel brake catch a two-pump rise once the fuel was hot, and in play the rise visibly slowed and stalled around 180. The owner decided that with rods and pumps unchanged, a rise keeps feeding itself until disaster. Very hot fuel may slow it ("less exponential") but isn't the brake: the only ways out are rod insertion and water pumps. This replaces the old check that a hot reactor limits itself. Kept: steam stays proportional and builds evenly with temperature at normal flow (Section 16), and with pumps running an overheat still ends in meltdown, not explosion (Section 11).
- Consequence (to confirm with the owner): a fall feeds itself the same way, so the reactor is never hands-off in either direction, and a big correction can tip it into a slide toward the xenon pit.

## v2.4 – 2026-10-12 (after the fourth playtest)

- **The radioactivity → temperature → steam → radioactivity loop must be felt** (Section 5 player outcome, Section 6 fuel curve). The plan said a healthy reactor is "calm" and changes "settle" within seconds. In play, pulling a rod 2–6% gave a small rise that the hot-fuel brake caught almost at once, so the owner never saw the core loop work and found the reactor too easy. Now the brake is mild through the normal range, so a rise keeps feeding itself for minutes, and only firms up once the fuel is genuinely hot (around the high fuel warning). Section 6's acceptance check (self-limiting at high radioactivity) is unchanged.

## v2.3 – 2026-10-12 (after the third playtest)

- **One pump left alone ends in disaster** (Section 7 table). It was "workable at modest radioactivity with care", and in play it settled into a hot steady state. The owner wants losing down to one pump to be a real emergency: left alone, it runs away within minutes; it's workable only with active rod control. Done by weakening the hot-fuel brake (tuning, not this plan).

## v2.2 – 2026-10-12 (after the second playtest)

- **The starting state creeps upward** (Section 5 acceptance check). The owner found a perfectly balanced start left nothing to do in the first minutes, and asked for a slow uptick from a slightly withdrawn starting rod. A correction is now needed within a minute or two. The engine is still calibrated on an exactly balanced reference state.

## v2.1 – 2026-10-12 (after the first playtests)

- **The fuel card is counted from normal running temperature** (Sections 5, 6, 16). The owner found it surprising that a healthy reactor at the start counted as having "hot fuel" with a brake on.
  - Physics unchanged, for realism: fuel at power is always hot, its brake (Doppler) is always working, and real reactors hold extra reactivity in reserve, pulling rods out as they heat up to compensate. That always-on brake is part of what makes a healthy reactor steady.
  - Counting changed, for readability: the card is 0 at normal running, blue when hotter, red when cooler. The game plays identically, but a healthy reactor reads as "neither hot nor cold", which is also what How to Play will teach.
  - Consequence made visible: the hot-side brake and the cold-side push are one curve, so weakening the brake also weakens the push that restarts a cold, poisoned reactor. Xenon's full load is therefore set against that cold push (tuning, not this plan).
  - The owner is happy to revisit this later.

## v2 – 2026-10-09 (after the owner's review of the first draft)

**Reactor physics**
- **Identical physics in every mode.** Draft 1 gave Easy gentler physics. Owner: it's science, and it shouldn't change on Easy. Modes now differ only in workload (targets, emergencies).
- **Steam's push depends only on how much steam there is.** Draft 1 made it stronger at low power and with few rods in. Owner: low power means little steam, and fewer rods simply means less boron. Low power stays dangerous because cool fuel brakes weakly and holding power up against xenon means pulling rods out.
- **Removing a blue card isn't a red card.** Owner: xenon burning off raises power because a brake has gone. The same logic now applies to withdrawing rods.
- **Pumps work through the steam card**, including the owner's point that more pumps cool the fuel, leaving less heat to make steam.
- **Xenon reads 0% at normal power**, and burn-off speeds up as power rises (owner). A real reactor always holds some xenon at power, so the gauge is defined as xenon beyond that.
- **Steam follows reactor temperature, not fuel temperature** (owner): the hot reactor boils the water, so a fuel rise reaches steam only after reactor temperature moves. This replaces an earlier rule that let steam outrun reactor temperature. Explosion vs meltdown is now decided by flow: low flow makes far more steam per degree, so steam hits its ceiling first; with pumps running, meltdown comes first. Fuel-to-reactor heat flow scales with their gap, so violent spikes still reach steam within seconds.
- **Explosion is triggered by steam only** (owner): radioactivity alone can't blow the reactor apart.

**Control rods**
- **Uniform rod effect.** Draft 1 used an S-shaped worth curve (real rods are most effective mid-core). Owner: it's the amount of boron that matters.
- **Rod travel (~18 s), the same speed in every mode**, with the panel showing rods moving (owner). Draft 1 had faster rods on Easy.
- **One-press AZ-5.** Today it only moves the levers and still needs Apply.
- **Graphite tips use the owner's in-or-out model**, replacing draft 1's spike from any rod entering near the top.
- **Tip strength = the boron in the first 10% of travel.** Because a tip is either in or out, the push it gives on entering equals what is lost when it leaves. A bigger tip (e.g. 30) would make pulling a rod from 20% to 0% lower radioactivity overall. A smaller one (e.g. 5) would make AZ-5 only a one-second nudge. Accepted trade-off: unlike in the show, the final step from 1% to 0% lowers radioactivity, and rods parked at 1% or more never spike. Section 10's tip text was later simplified (owner): the tip only matters when a rod crosses between 0% and 1%.
- **Rod modal usability** (owner request): no text highlighting while dragging; easier grabbing on touch screens.

**Events, targets and Safety Test**
- Rod jams stay as today (draft 1 proposed fewer jammed rods). Hard gets ≈3 major emergencies per 30 minutes (draft 1: 2–3). The grid "hold" request halves the tolerance.
- Smaller, less frequent target changes in both modes (draft 1: Hard only). Hard stays harder through bigger, more frequent changes.
- Safety Test reworked by the owner: 30 minutes, no phase indicator, no scripted power collapse, pumps and turbine switched automatically, no AZ-5 order, and the same outcomes as other modes.
- Added for coherence and confirmed by the owner:
  - The pumps' normal supply is cut when the test begins and restored at "Test complete"; otherwise turbine-powered pumps wouldn't matter.
  - There is no target from the turbine switch onwards.

**Presentation**
- Camera: no constant noise, and the reactor picture's overlays are unchanged (owner).
- Sounds: Pixabay first, auditioned by the owner. New clips go in `public/`; the existing sounds stay on the Vercel storage URLs that v0 moved them to, since what matters is that they work on the deployment.

**Terminology**
- "Power" on its own is no longer used for the reactor's fission level. Owner: in the game, power is the turbine's output from steam. The plan now says *radioactivity* for what the red and blue cards change, and *power output* for electricity. Section 5 states how radioactivity reaches power output: through heat and steam, with a delay.

**Corrections to draft 1**
- A fixed ±500 MW tolerance is tight at high targets (±5% at 10,000 MW), not generous as draft 1 said.
