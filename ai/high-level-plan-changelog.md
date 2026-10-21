# High-Level Plan – Change Log

Why [high-level-plan.md](high-level-plan.md) changed between drafts. The plan only describes what we're building; this file keeps the reasoning so the plan can stay short. Nothing here is an instruction.

## v2.22 – 2026-10-21 (Safety Test: the deputy watches the whole test, and the test lasts 120 s)

- **The deputy's rods-out order now covers the whole test** (Section 14, owner): once, whenever radioactivity falls below 50 (was only as the test begins, below 35). He stands down for good once the reactor is running away (the high radioactivity or high steam warning).
  - **Why:** in a playtest the owner held radioactivity at 40–50, above the old trigger, and nudged rods in as the pumps ran down. Nothing happened. At that level losing the pumps only adds about +5 points over the first 50 s, and one 1% nudge on all ten rods takes off 5, so the test was an anticlimax for a careful player.
  - **A precautionary AZ-5 doesn't stop him** (owner): pressed with no danger showing, it took radioactivity towards 0 and nothing happened (peak 57–65 on 3–4 pumps). Now the deputy pulls those rods out too, about 2 s later. The AZ-5 the crew orders is never overruled, because the order only comes after the warning that stands him down. A first draft also stood him down after any AZ-5; that is dropped.
  - **Measured after a precautionary AZ-5** (3–4 pumps, AZ-5 at +2 s or +20 s; seed 1): no second AZ-5 explodes at +28–45 s. AZ-5 again 2 s after the withdrawal (rods still 25–30% in) peaks at 57–70; 5 s after (rods 6–14% in) peaks at 570–860; 10 s after (rods at 0%) peaks at 1,000–2,400; on radioactivity passing 400, 1,500–1,650. All of these survive.
- **The test lasts 120 s** (was 75 s), starting at the same time, so the survival time after it falls from about 2:41 to 1:56. At radioactivity 40 a hands-off runaway takes ~65–70 s to show, and below ~38 it used to arrive after the test had ended.
- **Measured** (the repo's bot, seeds 1–3):

  | Pumps | Radioactivity at test start | Deputy steps in | AZ-5 at once (again after the deputy) | AZ-5 late (>400) | Hands off |
  |---|---|---|---|---|---|
  | 2 | 47 | at test start | survives, peak ~185 | survives, peak ~1,100 | explosion at +27 s |
  | 3 | 57 | +5 s if steered down; +3–4 s after AZ-5 | survives | survives, peak ~700, no deputy | explosion at +75–80 s |
  | 4 | 65 | +9 s if steered down; +4 s after AZ-5 | survives | survives, peak ~600, no deputy | explosion at +72 s |

  Putting the rods back to 20% after the withdrawal, instead of AZ-5, explodes: the tips re-enter from 0% (Section 10).
- **Still open:** a player who holds radioactivity at 50 or more and nudges rods in to stop the creep never triggers the deputy, and survives without a surge (3–4 pumps: peak radioactivity ~60–70, steam ~180–200).

## v2.21 – 2026-10-16 (Safety Test targets: a skilled player can avoid the xenon pit)

- **New targets** (Section 14, owner): 5,000 (start) → 3,000 → 2,000 → Kiev's hold at 2,000 → Kiev's release → 1,500 for the test. The 700 MW step and the raise back to 1,000 MW are gone. Kiev's hold no longer changes the target, and a new Kiev message releases the test at the shift change (Claude placed it at 08:10; wording for the owner to rewrite).
  - **Why:** above radioactivity 80, output can't go much below 2,000–2,500 MW, so the old targets forced every player into the pit. The owner wants only a poor player to fall in.
  - **Measured** (scratch bots, 30 runs each, insert rods as the test begins). With 4 pumps, radioactivity 80 gives only ~2,100 MW (2,630 with 3 pumps, 3,670 with 2). Median xenon as the test begins:

    | Bot | Old targets | New targets |
    |---|---|---|
    | 2 pumps (the repo's yardstick bot) | 100% | 100% |
    | 3 pumps below 3,000 MW | 85% | 65% |
    | 4 pumps at 3,000 MW and below | 57% | 29% |

    No bot got under ~20%: 1,500 MW needs radioactivity ~68 even on four pumps. Rods in or AZ-5 as the test begins still survived in all but one of 30 runs per case, and doing nothing still exploded every time.
  - **Tried and rejected:** 3,000 → 1,500 → Kiev's hold at 1,500 → 1,000. The four-pump bot reached the test at 52–61% xenon (no better than before) and the three-pump bot at 85–94%.
  - **The "about a third" step rule is dropped** (2,000 → 1,500 is a quarter), and the hold and the test output now last about 5–6 minutes each.

## v2.20 – 2026-10-15 (xenon burn-off capped at 10 %/s)

- **Xenon burn-off from 130 slowed from ~3 s to ~10 s for a full load** (Section 9, owner, after playtests). At radioactivity ~140, xenon at 40–50% went to zero in about a second. The player couldn't see it go or answer with rods; radioactivity jumped to 800–1,000+ and then the hot fuel dragged it back down. The rate now climbs from 2.4 %/s at 120 to a cap of 10 %/s at 130 (was 33 %/s), so half a load goes in about 5 s. Up to 120 nothing changed.
  - **Why 10:** each 1% of xenon is worth about 1.56 points, so 10 %/s removes about 16 points a second. All ten rods driving in at full speed add about 28, so a player who reacts can now out-pace the burn-off; at 33 %/s (51 points a second) nothing could. 15 %/s (23 points) was about level with the rods; 7.5 or 5 %/s let a late-caught pit escape fall back into the pit, which no longer reads as "burns away quickly".
  - **Measured** (no noise): radioactivity 140 with 50% xenon, hands off, now peaks at ~720 after 6 s (was ~880 after 3 s). With every rod ordered 20% deeper after 1 s it peaks at 151 (was 442). Climbing out of the pit with rods out and no response peaks at ~700 (was ~2,000) and still ends in meltdown. The bot's first surge in a pit escape is 221 (was 466).
  - **AZ-5 in a poisoned, rods-out core** now peaks at ~145 after 3 s (was ~750 after 5 s, and ~140 after 2 s before v2.17). The tips' spike still passes 120, but the xenon no longer goes with it at once. Still well over the §10 check's ×1.5.
  - Hands-off Easy, Hard and Safety Test runs are unchanged, and every bot and Safety Test check still passes.

## v2.19 – 2026-10-14 (after the owner's first listen)

- **The rod drive waits for the confirmation** (Section 15, owner). The confirmation clip starts a moment after the press, so the drive came in first. It now starts 1.25 s after the order. A move that finishes within the first second (about 5% of travel) plays only the confirmation.
- **The homepage gets the end screen's beacon and embers** (Section 15, owner). The red beacon turns just above the top of the screen, as if mounted on the ceiling, so its beams sweep down through the room; the orange embers of the explosion ending drift up. Both are hidden under reduced motion.

## v2.18 – 2026-10-14 (sound split into alarms and sound effects)

- **Two sound switches instead of one** (Section 15, owner). The alarms help a new player notice trouble, while the sound effects are atmosphere and feedback, so a player may want one without the other. The sound modal now has an Alarms switch ("Recommended for new operators") and a Sound Effects switch ("Recommended"), with one volume shared by both. Alarms are the alarms for warnings and emergency events; everything else, the reactor hum included, is a sound effect.
- **Two new sound effects** (owner): a short teleprinter sound for a new shift-log message, and a computer bleep for a new warning, alongside its alarm. They join the rod, pump, turbine, rod-drive and AZ-5 sounds already planned.
- **The owner provides the clips** rather than picking them from searches the agent suggests.
- **The rod drive follows the rods** (owner): one drive sound per moving rod, up to three, a split second apart so they don't sound like one clip doubled. Each fades out as its rod arrives instead of stopping dead.

## v2.17 – 2026-10-14 (Safety Test pacing; xenon gone almost at once from 130)

- **Safety Test targets are reachable** (Section 14, owner, after a playtest). Output takes a minute or two to follow radioactivity, but each order came 60 s after the last, and with the 60 s notice a target was in force for only about a minute. The bot was on target for only 178 s of the whole run. Orders now come about 2 minutes apart: 3,500 → 2,500 → Kiev's hold at 1,500 (was 1,000) → 1,000 → 700 (was 500) → raise to 1,000. The bot now reaches every one (427 s on target). Xenon still reaches 100% before the test, and holding 1,000 MW still takes the rod margin below its minimum (131).
- **Only 2 minutes after "Test complete"** (owner: 4–5 minutes of waiting was too long). The test moved 3 minutes later (pumps on at 15:00, test begins 16:04, complete 18:00); the time gained went to the target phases. The night clock now starts at 01:07:00, so the test still begins at 01:23:04 and the shift ends at 01:27.
- **Xenon vanishes almost at once from 130** (Section 9, owner: burn-off felt too slow). Up to 120 nothing changed (a full load in ~40 s at 120); between 120 and 130 burn-off climbs steeply to about 3 s for a full load. This reverses v2.14's "never faster than at 120", and it has costs:
  - **Climbing out of the xenon pit is now a cliff edge.** With rods fully out the burn speeds the climb; a reactor that passes 120 with xenon left loses the rest in a second or two and goes prompt. The bot's pit escape peaked at radioactivity ~1,100 (was 130) and only just survived. Slower wipes were tried: 15 and 8 %/s still spiked over 900; 4 %/s (a full load in ~25 s) kept it to ~145.
  - **AZ-5 in a poisoned, rods-out reactor** now peaks at ~750 after 5 s (was ~140 after 2 s): the tips' spike passes 120 and takes the xenon with it. The §10 acceptance check allows a 6 s peak.
  - **Hard:** the bot now keeps radioactivity at or below 90 while the xenon gauge shows anything (above that it lost seed 10 to an overshoot). It survives every Hard shift, with lower performance after low targets (e.g. 81% → 62%, 54% → 40%).

## v2.16 – 2026-10-14 (a small balance acts slowly, a big one fast)

- **Radioactivity answers a small balance three times more slowly, and a big one fast** (Sections 5 and 16, owner). Playing with the new board, the owner noticed it nearly always looked level while radioactivity crept and temperatures kept climbing, and that radioactivity looked spiky. The hot-fuel brake answers within seconds, so a creep needed a balance of only a point or two, far less than one card.
  - **A slower fuel brake was tested and turned down.** With the fuel taking 10 s or more to catch up, rod moves overshoot and swing back about every 20 s (all rods out 5% jumped to 389 in 8 s), the bot started losing Hard shifts from 20 s, and the creep looked just as level: it builds over minutes, which even a slow brake keeps up with.
  - **A slower generation time (Λ 100 → 300) does it.** A creep at the same pace now needs three times the balance, so the board shows a gap 4–8% of the time in bot play instead of about 1%, and the random drift's jitter halves. Made slow everywhere, though, it also blunted the graphite tips: AZ-5 with every rod at 0% spiked ×1.6 instead of ×3.3, and AZ-5 in a fragile state was no longer dangerous, failing two acceptance checks.
  - **So the slow rate applies only up to 10 points** (one card); every point beyond acts as if Λ were 60, like a real reactor going prompt critical. AZ-5 with every rod at 0% now spikes ×4.9, a fragile AZ-5 ×1.36 (needs ×1.25), and big moves (rods yanked out, pumps lost) end as quickly as before. Thresholds of 5 or 8 points made the bot's shifts oscillate; 10 was stable everywhere tested.
  - Unchanged within a few seconds: the hands-off Safety Test (meltdown at 428 s, was 408), all rods out, the cold restart, all pumps off. The bot still survives every Easy and Hard shift (Hard performance 87% → 80%).
  - One rod's tip alone (5 points) stays in the slow range, so a rod leaving 0% now spikes about 2% over 2 s (was 4% in 1 s); its acceptance check was relaxed to match.

## v2.15 – 2026-10-14 (the board of balance redesigned)

- **No high fuel temperature warning** (owner). Hot fuel only slows a rise, so it isn't a risk worth a warning or an alarm; the Fuel Temp dial no longer flashes for it. The low fuel warning stays.
- **The camera's radiation glow follows the new radioactivity warning** (Section 15, owner). It used to fade in from 150 to 350, set when the warning was 250. With the warning now at 350 it fades in from 320 and is full by 520, so the glowing picture means real danger.
- **Every card on Legasov's board is the same push** (Section 15, owner). The first board gave each side 8 white blocks shared by proportion, so a card's blocks changed when a *different* card changed (steam rising took a block off fission), both sides growing together never showed, and an imbalance showed as the losing side's cards shrinking (a lead of 0.3 points took a block off the rods). Now each card is worth 10 points, and a contributor shows as many cards as its push, so the columns' heights are the two sides' totals. In normal play that's about 21–29 cards a side, up to about 45 in a Safety Test running away. Equal sides always give equal columns: the shared height comes from the smaller side and the difference is added on the same scale, so rounding never invents a gap. Under half a card is no card, and counts only change once a value is clearly past the rounding point.
  - **The graphite tips are part of the nuclear fission card** (owner). Nuclear fission was a fixed 120 points: the push of the uranium in the graphite at normal running temperature, set so the reference state balances. With every tip in the core it is now 170 (17 cards). A rod at 0% takes its tip off the card, and AZ-5 from rods at 0% grows it before the boron arrives.
  - **The fuel's cards follow its push** (owner): zero only at normal running temperature, red below it and blue above it, in proportion (up to 13 red at 0°, about 21 blue at 2,000°).
  - **Tipping cards were offered and turned down.** In bot shifts the two sides are within 1 point (1% a second) about 95% of the time, because the fuel answers within seconds, so on one scale the columns look level through slow drifts. Magnified "tipping" cards on the winning side would have shown those, but the owner preferred every card to mean the same thing. A line under the board reading the exact balance ("rising slowly" and so on) was tried instead, then removed after the first playtest: it changed too often, and the piles themselves say enough (owner). A gap between the columns means a big move: pumps off, rods pulled far, or a collapse.
  - The random drift in the balance (never more than about 4 points) is not a card.
  - After the first playtest (owner): the board is as tall as the chart recorder beside it (it felt cramped), and every card is its own card with a gap, exactly the same height (some cards had looked taller than others). Each contributor's name is printed on a small card-coloured tag beside its cards, using a short name (Fission, Steam, Cool fuel, Control rods, Xenon, Hot fuel); the full name is in the tooltip. A bracket runs along each contributor's cards and joins its tag, so it is clear which cards a tag belongs to (owner: without it the columns read as one red pile and one blue pile).

## v2.14 – 2026-10-13 (iteration 8, after the clean-slate mechanics review)

- **Xenon has one turnover point, at radioactivity 80** (Sections 9 and 16). In a Free-mode test the owner pulled every rod from a cold, poisoned reactor, and radioactivity hung below the old burn-off level (100) until the reactor finally made steam. The old rules (a creep below 100, a build below 50, burn-off above 100) were also more than a player could learn. Now xenon builds at or below 80, faster the lower radioactivity is, and burns off above 80: slowly just above, at a medium rate by 100 and fast from 120. Burn-off never gets faster than its rate at 120, so a restart surge leaves a few more seconds to re-insert rods. The build rate (0.3 %/s at zero) was picked so the Safety Test still drives the rod margin below its minimum, and Hard stays close to today for a quick player. The fuel effect is kept unchanged: the review showed it is what makes a rod move settle (see the implementation plan's mechanics review).
- **Legasov's red and blue cards on screen** (Section 15, an owner exception to the "no new player-facing reactor variables" guardrail in Section 2). A board styled on the show's courtroom rack sits left of the reactor camera on wide screens and below the chart recorder on phones. It shows the engine's own cards: red for nuclear fission, the positive void coefficient, graphite tips and cold fuel; blue for control rods, the negative temperature coefficient (hot fuel) and xenon poisoning. Each card leaves the board when it is out of play, and has an arrow when it is getting stronger or weaker. **The white blocks show the balance** (owner): each side has 8 while it holds; when one side outweighs the other, the losing side loses blocks, more the bigger the imbalance (all 8 at a collapse or runaway), and a line under the rack says which side is winning. Each side's blocks are shared among its cards by strength, with at least one block for every card in play. The cards are hundreds of points each while what moves radioactivity is a difference of a few points, so the blocks follow the difference, not the raw sizes. An early version had a "Water" card mirroring steam, and English cards with Russian lettering; the owner found the water card misleading (it stayed put when the pumps went off), so it was removed, as was the Russian.
- **Medium screens get their own layout** (Section 15). Between phone and wide-screen widths the second row of readouts sits three across, and the cards and chart recorder sit side by side under the camera.

## v2.13 – 2026-10-13 (iteration 8a, after the Hard-mode feedback)

- **Header lamps that lead to the messages** (Section 15 message area). On a phone the dials fill the screen, so the alarm monitor and shift log below them were out of sight. The mode label and the two master alarm lamps beside the nameplate are replaced by a red warning lamp and an amber shift-log lamp, each with a button ("See Warning", "See Message") that scrolls its machine into view and opens it if collapsed. The red lamp lights exactly when the old master alarm did. The homepage loses its intro text and "Ready" lamp, and How to Play is about half as long; Section 15's list of what How to Play covers is unchanged.

## v2.12 – 2026-10-13 (step 7c, after the playtest of step 7b)

- **The hot-fuel brake levels off** (Sections 6 and 16). In a Free-mode test with every rod pulled out and four pumps on, the owner drove radioactivity and fuel temperature past 3,500. The brake, which kept growing with temperature, then threw radioactivity back down, and the reactor took several big swings before it finally overheated. The owner asked for a cap. The brake now stops growing beyond about 2,000°: fuel hotter than that brakes no harder, so an all-rods-out reactor runs straight away to meltdown in seconds, with one surge and no swings. Kept: the brake still firms up between about 1,300° and 2,000°, so very hot fuel still slows an ordinary rise (Section 6 check). It never stops one (v2.5). The cap barely touches normal play: the hands-off start melts down about 40 s sooner, once the fuel is past ~2,000°.

## v2.11 – 2026-10-13 (step 7b, after the playtest of step 7a)

- **Rods are gentle** (Section 10 item 1, tip table units, AZ-5 acceptance check). In play, moving one rod was more than enough: radioactivity either plummeted or shot up. Each rod now counts half as much against the other cards, so a 10% move shifts radioactivity by about a fifth at first (was about half). The tip is still the boron in the first 10% of travel, so it is gentler too, and the AZ-5 trap is weaker. It now needs eight or more rods at 0%, with a spike of about a quarter to a third. Keeping full-strength tips was offered (a much stronger trap, but pulling a rod from below 20% to 0% would then lower radioactivity). The owner chose the weaker trap.
- **The Safety Test's turbine coasts down** (Sections 8 and 14 phase 5). The turbine used to power the pumps from the reactor's own steam, which steadied the test: a little steam brought a pump back, and an ignored test could be survived (a known gap, recorded as question 1 in the implementation plan's §17.5). Now, as the test begins, steam to the turbine is shut off, as on the night. Its momentum powers the pumps at first and runs down to nothing within about 45 s. Ignoring the test ends in an explosion, as Section 11 expects of "the Safety Test rundown". Prompt rods or AZ-5 still save it. Power cuts in Easy and Hard are unchanged: there, steam still decides.

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
