# RBMK Simulator – Machine Maintenance Plan

Status: **BUILD COMPLETE, 2026-11-04. All five stages of §9.1 are built and deployed. The owner's first playtest notes are built, uncommitted, as of 2026-11-05, with the heat transfer loss halved to 10% (§9.9). The next job is the owner's playtest of that and the questions in §11.1, in their priority order.**

This is the record of what the owner decided for three new maintenance mechanics (turbine, water pumps, control rods), the modal changes that make room for them, and the move of each modal's hint text into the shift foreman guide. All numbers are **starting values for tuning**, not hard requirements.

---

## 0. Start here (for a new session)

**The build is finished, so start at §11.1 with the owner's playtest notes.** Tune one thing at a time, as all the numbers are in `MAINTENANCE_TUNING` in `lib/sim/tuning.ts`. The list below is how the build itself was run, and §9.5–§9.8 say what was built.

1. **Read:** this file, then [high-level-plan.md](high-level-plan.md) §0–§2, §7, §8 and §10, then the three modals: `components/turbine-modal.tsx`, `components/water-pumps-modal.tsx`, `components/control-rods-modal.tsx`, then the `next` guide `AGENTS.md` points to.
2. **Your job is to build §8, the approved design,** in the order of §9.1, from the first stage not ticked there. The design choices are made, so don't offer new options. §8 names the approved prototype boards and what in them not to build.
3. **The behaviour in §2–§6 is settled.** Don't redesign it. If the build exposes a problem with it, raise that with the owner.
4. **Nothing is waiting on the owner.** Every open question in §11 was answered on 2026-11-04, except the guide's final wording.
5. **Physics changes go one at a time,** each followed by an owner playtest (§9). Stop after each stage.
6. **Do not commit unless the owner asks, and never merge or push without being asked.**
7. **The bible still wins until it is updated.** Its §2 exception 7 (v2.32) covers the visible changes. §9.3 lists what must change as each mechanic is built.

---

## 1. The idea

Occasional maintenance jobs that a player can do to keep each machine at its best. If they ignore them, they get a small penalty that stops growing at a limit. Nothing ever stops working.

**Owner's aims:**
- It's something else to manage **if the player wants to**. A novice who doesn't know these mechanics exist must still survive okay.
- The effects stay small. The risk to the existing game is low.
- It applies in **every mode**. It's part of running the reactor, not a feature of a mode.
- The player can do a job at any time. The gauge tells them whether it's worth it.

**What stops it being a chore:** each job has a short-term consequence, so the question is when to do it, not just whether to.

| Machine | Job | Long-term penalty if ignored | Short-term consequence of doing it |
|---|---|---|---|
| Turbine | Run the air ejector | Up to 12% less output | Output rises as vacuum returns, which can leave the target band |
| Water pumps | Run the circulation balancer | Up to 10% worse heat transfer out of the fuel | Pump changes can't be applied for about 8 s, a 10% flow dip, then a rise in radioactivity (§9.9: larger than first thought) |
| Control rods | Move slow rods | That rod travels at about 60% speed | Moving a rod disturbs the reactor |
| Control rods | Even up left and right | The heavy side counts less, the light side more, and braking falls slightly | Moving rods disturbs the reactor |

---

## 2. Rules for all three machines

- **Modes:** every mode, on the same clocks. In Free mode there's no target, so the turbine penalty only shows as lower MW.
- **Limits:** each penalty stops at its limit and never gets worse.
- **Starting state:** the turbine and pumps start perfect. The rods' balance starts slightly off centre (§6).
- **How the player finds out:** by reading the gauges, which appear both in the modals and on the main page (§7.3). There is no panel lamp.
- **Warnings:** when a gauge reaches its maximum, the relevant operator sends **one shift log message**. No alarm sound and no alarm monitor line. It can send again only after that gauge has been fixed. Slow rods send no message (§5).
- **Signal loss:** all these gauges keep working. Rods, pumps and turbine are read outside the reactor hall (`lib/game-utils.ts`).
- **Actions take effect at once.** The ejector and balancer buttons work like AZ-5 in the rods modal: immediate, with no Apply step. They run on in the background if the modal is closed.
- **Safety Test:** if the script switches the pumps on during a lockout, the script wins. An ignored reactor reaches the test with hotter fuel, so this mode needs checking at tuning time.

Draft log messages (`from` uses the existing senders in `lib/game-events.ts`):
- TURBINE OPERATOR: "Condenser vacuum is at its worst. We're losing output until the air ejector is run."
- PUMP OPERATOR: "Circulation is as far out of balance as it gets. The fuel will run hot until it's rebalanced."
- REACTOR TECHNICIAN: "The rod banks are badly out of balance. Even up the two sides and the rods will answer properly."

---

## 3. Turbine: air ejector

**Why it's real:** a condenser runs below atmospheric pressure so turbine exhaust steam condenses. Air leaks in over time, spoils the vacuum and cuts the turbine's output. Real plants remove that air with air ejectors. The name is "run the air ejector", not "check", because a check sounds like an inspection.

| Value | Starting value |
|---|---|
| Vacuum falls from full to worst | 555 s (about 9¼ minutes), in a straight line, in every turbine mode. Was 6 minutes (§9.9) |
| Output loss at worst vacuum | 12%, scaling with vacuum lost |
| Recovery after pressing | About 20 s |

- **Output rule:** output = steam × 50 × (1 − 0.12 × vacuum lost, from 0 to 1), only while on the grid. It doesn't change the pumps the turbine can power.
- **Action:** press the ejector button at any time, in any turbine mode. Pressing at full vacuum does nothing, and pressing during a recovery does nothing.
- **Short-term consequence:** no cost is added (owner). The recovery itself is the consequence: from worst vacuum, output rises 13.6%, which is more than the ±10% target band. During a hold (±5%) that's a real risk. Just after an upward target change, it's free progress. Frequent presses mean small rises, and a late press means one big rise.
- **Clever use:** with the turbine on Pumps in a power cut, output is already 0, so recovery costs nothing.
- **Warning:** the Turbine Operator reports worst vacuum.
- **Risk to check at tuning:** at −12%, Hard's 11,000 MW target needs steam 250, past the 240 zone that §13 of the bible calls unsteerable.

---

## 4. Water pumps: circulation balancer

**Why it's real:** an RBMK has about 1,600 fuel channels, each with its own flow valve, fed by two pump loops. Uneven flow starves some channels. Water there boils away faster and the fuel surface can dry out, so that fuel runs hotter. The game has one fuel temperature, so it shows this as heat leaving the fuel less well. The size, speed and one-button fix are simplified: real slight unevenness barely moves average fuel temperature, and real flow doesn't drift in 8 minutes. The cause and effect are real.

| Value | Starting value |
|---|---|
| Needle drifts from centre to limit | 645 s (about 10¾ minutes), then stops. Its direction is cosmetic. Was 8 minutes (§9.9) |
| Fuel-to-reactor heat transfer at the limit | 10% lower, scaling with the needle (owner, 2026-11-05. It was 20%, which gave too big a kick. 30% was too high for a novice) |
| Lock after pressing | About 8 s (owner's range: 5–10 s). Apply is dark, and the switches stay free (§9.9) |
| Flow dip during the lock | About 10% |
| Needle glides back to centre | About 25 s |

**How the penalty works.** It uses the existing dry-out rule's idea: `fuelToReactorRate` is multiplied down. It must **not** be a cut in pump cooling (§10 explains why).

- Heat flow from fuel to reactor = transfer rate × temperature gap. At steady radioactivity all of fission's heat must still get through, so the fuel gets hotter until the wider gap passes the same heat.
- Normally the gap is about 2° per point of radioactivity. At the limit, it is about 2.2°.
- Reactor temperature, steam and output are unchanged **at steady radioactivity**.
- Hotter fuel is a stronger blue card. With rods unchanged, radioactivity and output sag slowly, and the player withdraws rods to hold them. That is the real cost: more rod out for the same output.
- Pumps cool both fuel and reactor, but don't restore the gap. Only balancing does.

Measured at 2 pumps with radioactivity held steady. The limit is now 10%, so the 20% rows are the first build's. At 10%, radioactivity 180 runs fuel at 986°, a gap of 400°:

| Radioactivity | Imbalance | Fuel | Reactor | Gap | Total rod insertion needed |
|---|---|---|---|---|---|
| 100 | None | 530° | 330° | 200° | 459 |
| 100 | 10% | 552° | 330° | 222° | 454 |
| 100 | 20% | 580° | 330° | 250° | 446 |
| 180 | None | 946° | 586° | 360° | 479 |
| 180 | 20% | 1,036° | 586° | 450° | 455 |

**Action:** press the balance button.
- Pump changes can't be applied for about 8 s. Apply goes dark, the switches stay free, and the pumps keep running as they were (owner, 2026-11-05).
- Flow dips about 10% for those 8 s, so steam and output nudge up briefly. Apply this as a cooling multiplier, not by changing `pump.flow`, so lamps and pump logic are untouched.
- The needle then glides to centre over about 25 s. The fuel's extra heat passes to the reactor and the blue card weakens, so radioactivity, steam and output rise. The player needs to reinsert some rod. The further off centre, the bigger the rise. **Measured on 2026-11-05, this is not a small rise (§9.9).**
- It can't start while no pump is running. If a power cut hits partway through, it finishes anyway.

**"Not worth it yet":** the lock and flow dip cost the same every time, while the benefit grows with the needle. So a small reading isn't worth fixing, and a big one is. This is the owner's idea, and it is why the job isn't a chore.

**Warning:** the Pump Operator reports when the needle reaches its limit.

**Check at tuning:** the penalty multiplies with dry-out, so losing all flow at maximum imbalance gives about 68% transfer.

---

## 5. Control rods: slow rods

**Why it's real:** plants periodically move rods to prove they move freely, because a drive left parked can stick.

| Value | Starting value |
|---|---|
| Time parked before it can go slow | 5 minutes |
| Then | A 50% chance each minute (owner, 2026-11-05), so about half have gone at 5 minutes, three quarters at 6 and seven eighths at 7 |
| Move that counts | At least 1% from where it was parked, in or out. It restarts the 5 minutes. Was 5% (owner, 2026-11-05) |
| A rod at 0% | Can't go slow, as it's out of the fuel with nothing to stick in (owner, 2026-11-05). Its 5 minutes start when it's back in the core |
| Slow speed | About 60% (full stroke 30 s instead of 18 s) |

- **Sign:** a yellow lamp pulses through the gap in the rod's channel in the rods modal (§8.4), and its lens turns yellow on the rod display (§9.9). Red for a jam takes priority.
- **Fix:** move it at least 1% with the normal lever. That first move is still slow.
- **AZ-5:** still drives a slow rod in, at the slower speed.
- **Jams:** a jammed rod's clock pauses.
- **No new control or gauge,** and no log message, because ten rods could send ten messages.
- **Watch for:** the penalty may be too mild. The bot only makes tiny moves, so only a human playtest can judge it.

---

## 6. Control rods: left/right balance

**Why it's real:** an RBMK core is so large that the reaction can tilt towards one side. A rod on the centre line can't tilt it side to side, but a rod far from the centre can, which is why edge rods count more.

**The sides:** rods 1–5 are left and rods 6–10 are right. **Rods 1, 2, 9 and 10 are the edge rods** and rods 3–8 are the middle rods. This is the same on desktop and mobile. On a phone, where the rods stack in two rows, the top row is left and the bottom row is right (owner).

**The needle is plain (owner):** centre is balanced, halfway left is half imbalanced to the left, and hard left is fully imbalanced to the left. The same goes for the right. It needs no rod numbers.

**The needle reads actual rod positions, not the levers (owner).** It doesn't move while the player drags. It moves only after Apply, as the rods travel, and it stops if a rod jams mid-travel.

| Value | Starting value |
|---|---|
| Edge rod's pull on the needle | 1.0 per 1% |
| Middle rod's pull on the needle | 0.4 per 1% (edge rods count 2.5 times as much) |
| Needle's full travel | A weighted difference of 100 |
| Effect with the needle hard over | Heavy side counts 15% less, light side 15% more |

**Three-part rule:**
1. Every rod has the same basic strength. With a level core, a 10% move on any rod does the same thing.
2. Edge rods shift the needle more than middle rods. A 30% move shifts it about 30% of its travel on an edge rod and 12% on a middle rod.
3. **The needle reading alone sets the effect, for every rod on that side.** The same reading means the same effect, whichever rods caused it. There is no hidden second rule.

**Formula (suggested):**
- `L` and `R` = total insertion of rods 1–5 and rods 6–10.
- `Lw = R1 + R2 + 0.4 × (R3 + R4 + R5)` and `Rw = 0.4 × (R6 + R7 + R8) + R9 + R10`.
- `n = clamp((Lw − Rw) / 100, −1, 1)`. Positive means left-heavy.
- Effective boron = `L × (1 − 0.15 × n) + R × (1 + 0.15 × n)`.
- **Guard:** effective boron must never exceed real boron. A core that is deep on the left edge and the right middle could otherwise gain a little from being lopsided.

**What follows:**
- A 10% move with the needle hard over counts as 8.5% on the heavy side and 11.5% on the light side. It applies to withdrawing as well as inserting, and shrinks to nothing at centre.
- A lopsided core has slightly less total braking. Rebalancing gives a little back, so radioactivity dips slightly.
- Middle rods suit steering, and edge rods suit correcting the needle.
- The tip push is unaffected, and only boron is weighted. The rod margin warning stays on real total insertion.
- Legasov's board must show effective boron, so it stays honest. `getReactivityCards` feeds it, so changing the card there is enough.
- A rod jam on one side can cause a small imbalance on its own.
- **AZ-5 stays safe:** every free rod ends fully in, which rebalances the core.

**How the two rod systems interact:** moving one rod in and another out cancels the reactivity, but curing slow rods that way can still shift the needle. An edge rod paired with a middle rod shifts it even on the same side, so the safest pairing is two matching rods on the same side.

**Starting position (owner):** slightly off centre, so it's a small job the player can do straight away. **The opening climb in radioactivity must stay as it is today, neither faster nor slower (owner, 2026-11-04).** The exact rod order doesn't matter to the owner. This has a clean solution:
- Reorder `REFERENCE_RODS` to the mirrored `[40, 55, 40, 40, 55, 55, 40, 40, 55, 40]`. It's the same rods in a new order and is exactly level, so the engine's balanced reference state stays balanced.
- Leave `STARTING_OFFSETS` as it is. The start becomes `[28, 49, 36, 40, 55, 55, 40, 40, 55, 40]`.
- Total insertion stays 438, all ten tips stay in, and the needle starts about a fifth off centre to the right (129.4 against 149.0).
- **Effect on the opening climb:** real boron is unchanged. The off-centre needle makes effective boron 437.35, not 438. The climb comes from sitting 22 points below the balanced 460, so that gap becomes 22.65, about 3% stronger. It should not be noticeable, but measure it (§9.4). If it is noticeable, trim a rod so the climb matches.

**Warning:** the Reactor Technician reports when the needle hits its limit.

---

## 7. Modal changes

### 7.1 Gauges replace the hint text

Each modal has a `cr-note` box of guiding text. **That box's place in the modal becomes the home for the new gauge and button.** The hint text moves into the guide (§7.2), and nothing is lost.

| Modal | Today's hint text (moves to the guide) | Goes in that space |
|---|---|---|
| Turbine | "Grid: steam volume sets power output." "Pumps: steam volume sets how many pumps have power. Output to grid is 0." | Vacuum dial, Run key, Ready tile |
| Water pumps | "A pump cools the core only when ON and POWERED." | Balance needle, Run key, Ready tile. **No lock indication** (§8.3) |
| Control rods | "Drag a lever to set insertion. Deeper rods, less radioactivity." "AZ-5: emergency insertion of every rod." | Balance needle. **AZ-5 stays where it is, beside this space** |

Room varies. The pumps note is one line, so that space has grown. On a 390 × 844 phone the pumps modal only just fits, and the rods modal scrolls to reach Apply and Cancel. The modals already scroll, so this is acceptable, but keep it in mind.

### 7.2 Question mark key and the guide

- **Key:** a question mark key in each of the three modals' **top left corner, opposite the X** on the right. These three only, not every dialog. It should match the X key (`cr-key cr-key-black`, size-7).
- **On press:** the guide who gives the start-of-game briefing reappears and talks through that modal. This is **Aleksandr Akimov, the shift foreman** (`components/tutorial-engineer.tsx`).
- **Same behaviour as the briefing:** the room darkens, the subject is framed, his words type out, and the player can press Next or Previous, or close him at any time.
- **Closing:** returns to the modal, with focus back on the question mark key.

**Pause (owner, 2026-11-04):** the game pauses while the guide is open and resumes when it closes, so the player can read without pressure. All clocks stop with it, as they run in `advanceGame`.

**Draft guide steps** (the owner reviews the wording, and existing hint text is kept):

*Turbine*
1. Mode selector: "Grid: steam volume sets power output. Pumps: steam volume sets how many pumps have power, and output to the grid is 0."
2. Vacuum dial: "Air leaks into the condenser over time. As the vacuum falls, you lose output for the same steam."
3. Ejector: "This clears the air. You can run it any time, but your output climbs as the vacuum returns, so pick your moment."

*Water pumps*
1. Pump bays: "A pump cools the core only when it's on and powered."
2. Balance needle: "Circulation drifts out of balance. The further the needle goes, the hotter your fuel runs."
3. Balance button: "This rebalances the flow, but the pump switches lock for a few seconds and flow dips. For a small reading, it may not be worth it yet."

*Control rods*
1. Levers: "Drag a lever to set insertion. Deeper rods, less radioactivity."
2. AZ-5: "Emergency insertion of every rod."
3. Yellow channels: "A rod left parked too long goes slow and glows yellow. Move it a little and it frees up."
4. Balance needle: "This shows whether one side of the core has more rod in it. It moves as the rods move. Rods on the heavy side count for less, and rods on the light side for more."
5. Edge rods: "Rods 1, 2, 9 and 10 are at the edges of the core, so they swing the balance most."

### 7.3 The gauges on the main page

The player can see all three gauges on the main page without opening a modal (owner). Each is the **same design as its modal gauge, at a smaller size if needed**, and shows the same reading. The modal gauge stays too.

Main page gauges are for reading only (owner, 2026-11-04). They prompt the player to open the modal and act. The ejector and balancer buttons stay in the modals.

**Rod balance needle, on the Control Rod Positions widget (`components/rod-display.tsx`):**
- Add the needle to the existing widget, so the balance can be seen beside the rods that cause it.
- The widget's overall layout should not change much, and **it must not get any bigger**.
- The owner moved the rods closer together to make room for it (§8.6).

**New Plant Gauges widget, replacing the dosimeter (`components/dosimeter.tsx`):**
- The owner considers the dosimeter of little use, and confirmed this widget takes its place.
- It's one widget in **two halves**: one half shows the turbine's vacuum gauge, and the other shows the water pumps' balance needle.
- It takes the dosimeter's slot on every screen size. On the dashboard that's the third column of the bottom row. On medium screens it sits below the chart recorder and at least matches the rod display's height. On phones it comes last.
- It keeps working during signal loss, as the modal gauges do. The dosimeter does too, so that behaviour doesn't change.

Replacing the dosimeter also removes the show's "3.6 roentgen" reference from the game (`lib/dosimeter.ts`), and the owner confirmed the swap by approving Plant Gauges A2.

---

## 8. Approved design (owner sign-off, 2026-11-04)

The owner reviewed the prototypes and approved the boards below. **Build these. Every other board on the canvas was rejected or superseded**, including the original Turbine B, Pumps B, Rods A, Rod widget A and Plant Gauges A, which the approved versions replace.

**Canvas:** https://claude.ai/artifact/NpnGkanFRCLzZP8bqL58RG

| Item | Approved board | Canvas page | Source to read |
|---|---|---|---|
| Turbine modal | **Turbine B2** | Round 2: your picks | `project/Turbine.dc.html` |
| Water pumps modal | **Pumps B2** | Round 2: your picks | `project/Pumps.dc.html` |
| Control rods modal | **Rods A2** | Round 2: your picks | `project/Rods.dc.html` |
| Control Rod Positions widget | **Rod widget A2** | Round 2: your picks | `project/RodWidget.dc.html` |
| Plant Gauges widget | **Plant Gauges A2** | Round 2: your picks | `project/PlantWidget.dc.html` |
| ? key and guide | **Guide A** | Options | `project/Room.dc.html`, `project/Foreman.dc.html` |
| Every dial | Shared by all of the above | Shared parts | `project/Gauge.dc.html` |
| New styles | Shared by all of the above | n/a | `project/proto.css` |

To read a source, use the Artifact tool with `action: "read"`, this `url` and the file as `path`. They are canvas files with `{{holes}}`, not React, so port them rather than copying them. The values below are enough to build from if the canvas can't be reached.

### 8.1 The dials

There's one arc dial design for the turbine and pumps, and one strip dial for the rods. Build each as a shared component, so a modal gauge and its main page gauge can't differ (§7.3). They look different on purpose, so the rods read as a different kind of measurement.

**Arc dial (turbine and pumps):**
- A cream paper face in a black case, like the dosimeter. `viewBox` 240 × 112, pivot (120, 138), sweep ±44°, outer scale radius 126, colour band radius 131 and 6 wide.
- A plain black lip across the bottom hides the pivot (y 97–112). It carries no text.
- One centred label on the paper at (120, 91), 13 units, in the plate font: **TURBINE VACUUM** or **PUMP BALANCE**. These are the only names on the dial.
- Below about 210 px wide, use the reduced scale and a 16-unit label at y 86.

| Dial | Scale | Band, left to right |
|---|---|---|
| Turbine | Black 0, 25, 50, 75, 100, where 100 is full vacuum on the right. Reduced: 0, 50, 100 | Red to 15%, amber to 40%, green to 100%. **Owner: green means good** |
| Pumps | Black 100, 50, 0, 50, 100, with LOOP 1 and LOOP 2 at the ends. Reduced: 100, 0, 100 | Red to 12.5%, amber to 35%, green to 65%, amber to 87.5%, red to 100% |

- The green pump band is the "not yet" zone, where the needle is within 30% of centre.
- **No second scale.** The owner rejected a red output-loss scale on the turbine dial as confusing. The −12% still applies. It shows as a low needle and lower MW.

**Strip dial (rods):**
- A cream horizontal strip in a black case, with a sliding hairline pointer and a small black triangle.
- In the modal: LEFT, BALANCED and RIGHT above the ticks, and ROD BALANCE centred below them. Height 58 units.
- On the widget: a shorter version with thinner lines. Ticks y 3–12, a 1.5-unit horizontal line at y 13, then one row at y 26 of LEFT, ROD BALANCE and RIGHT. Pointer y 1–29, triangle y 28–37. Height 38 units.
- It has no colour zones (§6: the needle is plain). A right-heavy core leans right.

Sizes used, in px:

| Dial | Desktop modal | Phone modal | Dashboard | Medium | Phone widget |
|---|---|---|---|---|---|
| Turbine and pump arcs | 240 | 178 | 392 | 302 | 300 |
| Rod strip | 496 | 206 | 316 | 90% of the map, less 28 | 249 |

### 8.2 Turbine modal

- The hint box goes. Its place is a `cr-module cr-bay-screws` bay holding the arc dial on the left and the key set on the right.
- **Key set:** a fixed 120 px column (96 px on a phone) with 12 px between its two parts:
  - A blue lens key (`cr-lens cr-lens-blue`, 44 px high) reading **Run**, on its usual plate.
  - Below it, a **Ready** tile (`cr-mode-tile`, 34 px high, 14 px type).
  - **The tile must match the plate's width.** It sits 2 px in on each side, because its ring stands 3 px proud and the plate's 1 px.
- **Ready tile: removed by the owner, 2026-11-05 (§9.9).** The key itself goes dark and can't be pressed when a press would do nothing, on both modals. The rest of this section and §8.3 describes the first build.
- **Ready tile rule:** it always says Ready. It's lit green (`on-green`) when a press would do something, and grey otherwise. Grey here means during a recovery or at full vacuum.
- **No countdown** and no "running" word. The rising needle and the grey tile show the recovery.
- The selector, tiles and Apply/Cancel don't change.

### 8.3 Water pumps modal

- The same bay and key set as the turbine, with the arc dial and a key also reading **Run**, not Balance (owner: it fits narrow screens better).
- **Ready tile rule (owner, 2026-11-04):** green when the key can be pressed, and grey when it can't. In practice it's grey only after a press, through the lock and the glide, and when no pump is running. **With the needle at dead centre it stays green** and the press works, costing the usual lock and flow dip.
- **Replaced by the owner, 2026-11-05 (§9.9):** the switches are free all the time, and Apply is dark and can't be pressed during the lock. `GripSwitch` has no disabled state any more.

### 8.4 Control rods modal

- The hint box becomes a bay holding the strip dial. AZ-5 stays beside it, as it is today.
- **New lever channel, on all ten rods, not just slow ones.** It simulates a real slide lever: black woven fabric on the left and right, meeting at a thin gap the lever moves along. The fabric is most of the channel.
  - Normally the gap is dark.
  - **Slow:** a yellow lamp behind the gap (`#f2d70f`), pulsing (owner, 2026-11-05).
  - **Jammed:** a red lamp behind the gap (`#e5261b`), pulsing faster.
  - The lamp shows only in the 5 px gap, and lightly catches the fabric's inner edges.
- No metal stem is visible. The owner removed it: the metal is under the lever handle, so only the handle shows. The lever handle itself doesn't change.
- The channel is 30 px wide on desktop (it was 24) and stays 32 px on a phone. The 10% tick marks go, so the SKALA strip is the numeric readout.
- The fabric is `.rk-fab` in `proto.css`.

### 8.5 ? key and guide

- The ? key is black, matching the X (`cr-key cr-key-black`, size-7), in the top left corner of these three modals only.
- Guide A behaves like the start-of-game briefing. Akimov stands in the bottom corner of the screen with his sheet, and on a phone docks along the bottom. The rest of the room and modal darkens, and the subject gets the amber frame.
- The owner approved this design and behaviour. **The wording in §7.2 is a draft, to be settled later.**
- The last step's Next returns to the modal.

### 8.6 Control Rod Positions widget

- The widget stays exactly the same size, and the header, nameplate, AZ-5 lamp and legend don't change.
- **The rods move closer together (owner).** This replaces the earlier rule that they stay put. New `CORE_MAP`, in % of the map:

```
[20, 46.5], [20, 68.5],                 // R1–2
[40, 35.5], [40, 57.5], [40, 79.5],     // R3–5
[60, 35.5], [60, 57.5], [60, 79.5],     // R6–8
[80, 46.5], [80, 68.5],                 // R9–10
```

- These are still symmetrical, with each edge rod level with the gap between two centre rods. The lenses and the bay don't overlap at any widget width from 316 px up.
- The strip dial sits at the top of the map in its own small `cr-module cr-bay-screws` bay, 90% of the map's width, padded 6 px by 12 px, so it looks built into the face.

### 8.7 Plant Gauges widget

- **The owner confirmed replacing the dosimeter.** It takes the dosimeter's slot on every screen size, under the name **Plant Gauges** on its nameplate.
- One `cr-module cr-bay-screws` bay holds the two arc dials stacked, turbine above pumps, spaced evenly. On a phone they stay stacked.
- **No labels above the dials.** Each dial names itself (§8.1).
- It matches the rod widget's height from medium screens up, as the dosimeter does.

### 8.8 In the prototypes only: do not build these

- **Speeds:** vacuum drifts in 15 s and the pump needle in 12 s, so the jobs can be repeated. Use §3 and §4. Recovery, lock and glide run at their real speeds.
- **Apply stays open,** so the needle can be watched. In the game, Apply closes the modal as it does today.
- **X on the rods modal resets the demo.** In the game it just closes.
- **Demo rods:** R4 and R7 start slow and R9 jammed, to show the colours. In the game, no rod starts that way.
- **Ready tile for pumps** reads the applied switches. In the game, use the real running state.
- **The guide doesn't pause anything** on the canvas. See §11.
- **The red and blue cards** beside Plant Gauges are a simplified stand-in. The real widget doesn't change.
- **The small `ref` trick for dial text** is a workaround for the canvas, which can't put variable text in SVG. React doesn't need it.
- **Reading chips** under the modals on the canvas are for review only.

### 8.9 Questions the prototypes answered

- **Should edge rods be marked?** No. Rods A2 leaves them unmarked.
- **Yellow or amber?** Yellow. It stands apart from the jam's red.
- **Should the dials differ between machines?** Arc for the turbine and pumps, strip for the rods.

### 8.10 Design rules (still apply)

- Keep the panel's beige-grey (`.cr-panel`, `.cr-module`).
- Use the existing parts: `cr-module`, `cr-bay-screws`, `cr-plate`, `cr-lens` and the SKALA strip.
- Every control must work. The owner has rejected dummy controls that look pressable.
- Keep the Turbine's rotary selector, the lever-drag rods, the pump grip switches and Apply/Cancel.
- Don't change the shift report's paper style (`components/incident-report.tsx`).

---

## 9. Build notes (for after the owner's picks)

Read the relevant guide in `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`). Physics changes go one at a time, each followed by an owner playtest.

### 9.1 Suggested order

1. Modal layouts, the question mark key and the guide (no mechanics). **Built and committed 2026-11-04, approved by the owner.** See §9.5.
2. Turbine: it sits outside the reactor physics. **Built and committed 2026-11-04.** See §9.6.
3. Slow rods. **Built and committed 2026-11-04.** See §9.7.
4. Rod balance, including the new starting order. **Built and committed 2026-11-04.** See §9.8.
5. Pump balancer: the largest physics change. **Built and committed 2026-11-04.** See §9.8.

Each main page gauge (§7.3) goes in with its mechanic. The Plant Gauges widget replaces the dosimeter when the turbine gauge is built. The lever channel redesign (§8.4) and the rod widget's new positions (§8.6) belong to step 1, as they need no mechanics.

### 9.2 Files likely to change

| File | Change |
|---|---|
| `lib/sim/tuning.ts` | New constants for §3–§6. Reorder `REFERENCE_RODS` |
| `lib/types.ts` | New `GameState` and `ControlRod` fields, with `INITIAL_GAME_STATE` |
| `lib/sim/reactor.ts` | Per-rod speed, effective boron in `getReactivityCards`, transfer multiplier, cooling dip, a needle helper |
| `lib/game-mechanics.ts` | Vacuum in `calculatePower` |
| `lib/game-loop.ts` | Advance the maintenance clocks each second, ideally in a new pure `lib/maintenance.ts`. Send the log messages with `addLog` |
| `lib/safety-test.ts` | Check the `pumps-on` step wins over a lockout |
| `hooks/use-game-state.ts` | `migrateSavedState` must fill the new rod fields, because old saves rebuild each rod field by field |
| `hooks/use-rod-display.ts` | Uses `rodFullStrokeSeconds` for its travel timing: needs per-rod speed |
| `lib/rod-drive-voices.ts`, `lib/sound-cues.ts` | Rod sounds must last as long as a slow rod moves. Ejector and balancer sounds come from the owner, as usual |
| `components/turbine-modal.tsx`, `water-pumps-modal.tsx`, `control-rods-modal.tsx` | Gauges, buttons, lock, yellow channel, question mark key. The note boxes go |
| `components/control-panel.tsx` | Pass new state and actions to the modals |
| `components/rod-display.tsx` | New `CORE_MAP` (§8.6). Add the balance needle in its bay, sharing its gauge component with the rods modal |
| `components/switchgear.tsx` | `GripSwitch` gains a disabled state with no visual change (§8.3). The sound dialog must not change |
| New Plant Gauges component | Two halves, sharing gauge components with the turbine and pumps modals |
| `app/game/page.tsx` | Swap the dosimeter for the new widget in the dashboard and stacked layouts, keeping `matchHeight` behaviour. Its `data-tutorial` target changes too |
| `lib/tutorial.ts` | The briefing's "instruments" step names and targets the dosimeter, so it needs the new widget. `scripts/sim/tutorial.test.ts` pins 16 steps, so keep the count |
| `components/dosimeter.tsx`, `lib/dosimeter.ts`, `scripts/sim/board.test.ts` | Remove the dosimeter and its tests if the swap is confirmed, with its CSS in `app/globals.css`. The foreman's dosimeter pen in `tutorial-engineer.tsx` can stay |
| `README.md` | It lists the dosimeter among the components |
| `components/ui/dialog.tsx` | Only if the question mark key is best added here. It must stay off other dialogs |
| `components/tutorial.tsx`, `lib/tutorial.ts` | Guide reuse (below). New `data-tutorial` targets need their own names, such as `pumps-needle`, because `pumps`, `rods` and `turbine` are already the panel keys |
| `app/globals.css` | Fabric channel replacing `.cr-rod-slot` and `.cr-rod-slot-jammed`, and the dial, key set and Ready tile styles |
| `app/instructions/page.tsx` | Add the new mechanics to How to Play, for the owner to review |
| `scripts/sim/bot.ts`, tests | See §9.4 |

**Reusing the guide inside a modal.** `Tutorial` was built for the game page, so expect these problems:
- `DialogContent` is `fixed` with a translate, so anything `fixed` inside it is positioned against the modal. Render the guide outside it, as it already sits above the dialog (z-60 against z-50).
- Radix's modal dialog traps focus and closes on an outside click or Escape. While the guide is open, those must be stopped from closing the modal, and Escape must close only the guide.
- `finish()` scrolls the window to the top, which must not happen here.
- `planGuide` and the scrolling work on the window, but a modal scrolls inside itself (`overflow-y-auto`). Phones will need the subject scrolled within the dialog, clear of the guide.
- "Begin shift" and the close button's "start the shift" label need modal wording.
- `keysOff` in `control-panel.tsx` treats a paused game specially for the briefing, and the guide's pause will need the same care.
- Keep the start-of-game briefing exactly as it is.

### 9.3 Bible changes needed (`ai/high-level-plan.md`, with a changelog entry)

- **§2:** a new guardrail exception for the gauges, the question mark key, moving the hint text, the fabric lever channels and the rod widget's new positions. The owner has agreed to all of them. The gauges are machine readings, not reactor variables. Exception 2 says the levers keep the "same look", which the new channel changes. The lever handle itself stays the same.
- **§5:** the check that moving a rod always has the same effect becomes "with a level core".
- **§7:** the balancer, and a second way transfer can fall (the plan today says only no flow changes it).
- **§8:** vacuum in the output rule.
- **§10:** per-rod speed (items 1 and 3), the balance rule, and the note that speed is the same in every mode but no longer constant.
- **§14–§16:** Safety Test note, How to Play text, and the rods, transfer and output rows of the §16 table.

### 9.4 Tests

- **Every test now runs with the mechanics on.** Long scenarios leave rods parked and gauges drifting, so some will change.
- **The bot must learn the jobs.** `events.test.ts` allows exactly 18 of 40 Hard losses, so any added penalty could trip it.
- **Keep a bot that ignores every job.** It is the owner's novice check: such a player must still survive okay.
- **Tests that pin rod speed need revisiting:** `§10 rods travel at a constant speed`, the two rod-drive sound tests and, at half speed, the high-steam jam test.

New checks to add:
- Each penalty stops at its limit, and the turbine and pumps still work there.
- Output rises by the stated amount after the ejector, and pressing at full vacuum does nothing.
- The pump switches are locked for the stated time, and the balancer can't start with no pump running.
- At steady radioactivity, an imbalance changes fuel temperature but not reactor temperature, steam or output.
- A rod moved less than 5% stays slow, and one moved 5% or more recovers.
- The needle ignores the levers and follows actual positions.
- The same needle reading gives the same effect whichever rods caused it.
- Effective boron never exceeds real boron.
- AZ-5 from a normal state still shuts the reactor down safely, with every rod slow and the needle hard over.
- Each log message is sent once, and only again after a fix.
- The starting needle is off centre, with total insertion 438.
- The opening climb matches today's. Use `npm run sim:trace` to compare radioactivity over the first 60 s on the old and new starts, with no player input. It must look the same, and the owner has the final say at playtest.
- The guide opens, closes and returns to the modal without closing it, and the start-of-game briefing is unchanged.
- Main page gauges always match their modal gauges, and keep working during signal loss.

---

### 9.5 Stage 1 as built

**What later stages plug into:**
- `components/machine-dials.tsx` holds `ArcDial` and `StripDial`, which has a `compact` version for the rod display.
- `JobKey` in `components/switchgear.tsx` is the Run key.
- `MACHINE_GUIDES` in `lib/tutorial.ts` holds the guide's steps, and `components/machine-guide.tsx` the ? key.
- The dials have their own `.cr-dial-*` styles.

**Decisions Claude made in stage 1, for the owner to review:**
- The guide already describes the mechanics to come, so the owner can review the wording in place.
- The guide is a dialog nested inside the modal. Radix then hands it focus and Escape, which answers the focus and closing problems in §9.2 without adding a package.
- A modal slides up the screen when its own scrolling can't clear the foreman (changelog v2.32).
- A subject too tall to clear him is shown from its top, as in the briefing. A corner of it can sit behind his sheet: the pump bays, the lever bank and the edge rods on a 360 × 640 phone, and 16 px of the pump bays at 1024 × 768. Every step clears him on 390 × 844, 768 × 1024 and 1440 × 900.
- The guide frames the lever grid, not the whole bay, because the bay with its SKALA strip is too tall to clear him on a phone.
- With the keys now first in their modals, both modals open with focus off the key (`onOpenAutoFocus`), so Enter can't run a job by accident.

### 9.6 Stage 2 as built

**What later stages plug into:**
- `lib/maintenance.ts` holds the jobs and `advanceMaintenance`, which `advanceGame` calls each second. Later clocks go there, with their numbers in `MAINTENANCE_TUNING` in `lib/sim/tuning.ts`.
- The bot has a `jobs` option: on by default, and off for the novice check.

**Measured, 200 bot shifts each** (full table in changelog v2.33):
- **Easy:** 99.5% survive today, 98.5% with the ejector, and 98.5% for the novice, with no meltdowns.
- **Hard:** 61.5% today, 59.5% with the ejector, and 55.5% for the novice. Meltdowns stay at 4 or 5, so the §3 risk at 11,000 MW didn't show up in the bot's results.
- **The bot's steering wobble is not the vacuum's doing.** Rods swinging ±50 every 3 s for 30 s or more happen in 4% of Easy and 27% of Hard shifts in today's game, and 6% and 22% with the ejector.

**At the end of the build (owner, 2026-11-04):** the owner accepts the Hard check's 19 losses in 40 and the novice's Hard result for now. If the finished game is too hard or too easy, the tests or the mechanics get adjusted then. Whether the ejector's timing is a real decision is also for then. The bot can't feel that. It presses about 3.5 times on Easy and 6 times on Hard.

### 9.7 Stage 3 as built

- `exerciseRods` in `lib/maintenance.ts` runs the parked clock. `rodStrokeSeconds` in `lib/sim/reactor.ts` is the one source of a rod's speed, used by the engine and `hooks/use-rod-display.ts`. The rod sounds needed no change, as they stop when a rod arrives.
- **A rod stays slow for its whole move and recovers on arrival** (Claude's reading of §5). See changelog v2.34.
- **Playtest switch:** `/game?fastjobs` runs the slow drifts about 20 times faster, in development only (`app/game/page.tsx`). It doesn't work on the live site.

### 9.8 Stages 4 and 5 as built

- **Rod balance:** `rodBalance` and `effectiveBoron` in `lib/sim/reactor.ts`. A positive reading is right-heavy, as on the dial, so the code's sign is the opposite of §6's `n`. The maths is the same.
- **Starting rods:** `[28, 49, 40, 44, 58, 38, 38, 38, 60, 45]`, not the `STARTING_OFFSETS` order in §6. With 219% a side, effective boron is exactly 438, so the opening climb matches the old game to the decimal. The needle starts 17% right, not the fifth §6 expected. Reference rods are §6's mirrored order.
- **Pump balancer:** `canRunBalancer`, `runBalancer` and `advancePumpBalance` in `lib/maintenance.ts`, with the transfer loss and cooling dip in `advanceReactor`. Ready, the lock and Apply work from the real pump state.
- **The lock shows nothing.** A locked switch's computed look is identical to a free one, and applying `disabled` alone changes no pixels.
- **Checks on the live game code:** `npm run sim:test` (117 tests), a production build, and every stage driven in headless Edge at phone, tablet, laptop and desktop sizes.

### 9.9 First playtest round, 2026-11-05

Built from the owner's notes, uncommitted. `npm run sim:test` passes 119 tests, and every change was driven in the real game at phone size.

**Changes:**
- **Rod needle:** the strip dial drew its first frame at a default width, and the pointer then slid from off the strip on a phone. It's now drawn only once the width is known.
- **Lamps pulse,** yellow every 2.2 s and red every 1.3 s, and hold steady for players who ask for reduced motion.
- **Slow rods:** the rule in §5. The game's dice decide, so it's drawn from the same `rng` as the rest of the shift.
- **Ready tiles gone:** Run goes dark while a press would do nothing. Apply on the pumps is dark during the lock only, about 8 s, while Run stays dark through the glide as well, about 33 s.
- **Unapplied pump choices survive pressing Run,** because the switches now stay free. This replaces question 11 in the old list.
- **The pump modal's height fell from 779 px to 585 px,** which fits a 664 px phone screen with the address bar showing, and 360 × 640. Each bay has its lamps beside a smaller switch. The turbine modal fits too. All three modals now use `dvh`, so the address bar is allowed for.
- **Clocks:** vacuum 555 s and pumps 645 s. That's about 1.5 of each job in an Easy shift, and left alone, one message each, 90 s apart.
- **Rod display:** yellow is now Slow. Fully withdrawn is white. The legend has five lamps, and to stay one line and keep the widget's size it reads In and Out, not Inserted and Withdrawn (Claude's choice).

**Why radioactivity seemed unstable.** Nothing is broken. Median swing in radioactivity over 20 s, bot, 40 shifts:

| Game | Easy | Hard |
|---|---|---|
| Before maintenance | ×1.020 | ×1.021 |
| Now, with no drift in any gauge | ×1.021 | ×1.025 |
| Committed build, every job done | ×1.036 | ×1.037 |
| This build, every job done | ×1.030 | ×1.032 |

- With the gauges still, the game matches the old one, so the rod balance and engine changes aren't disturbing it. With fixed rods, a small upset behaves the same as before to the decimal.
- The rise comes from doing the jobs: the ejector's output rise is steered against, and the balancer's kick (below) moves radioactivity itself. Slow rods add nothing.
- **A separate cause of real spikes:** a rod at 0% moved to 1% brings its graphite tip in, about +4.5 points at once. That's the old tips rule, not new, but the 1% move now invites it, so a parked rod at 0% is worth watching.

**Why the balancer raised reactor temperature.** The owner's reading is right, and §4's "rise a little" was wrong. The rise was never measured at build time. With rods untouched and steady radioactivity 100 at the limit:

| Time after Run | Radioactivity | Fuel | Reactor | Gap | Steam |
|---|---|---|---|---|---|
| 0 s | 100 | 574° | 327° | 247° | 99 |
| 8 s | 100 | 579° | 330° | 249° | 100 |
| 33 s | 117 | 567° | 334° | 233° | 102 |
| 60 s | 132 | 614° | 350° | 264° | 108 |
| 150 s | 157 | 743° | 417° | 326° | 136 |

- The cause is the blue card. Fuel at the limit gives about −5.7 points, and balancing hands them back: the same as pulling about 11% of rod. Radioactivity climbs, and that heats everything, so the fuel only dips by about 10°.
- It's built in: if neglect costs rod, fixing it gives that rod back. The plan's table in §4 shows the same 13% of rod. **Measured live: with 1.3% put in on each of the ten rods as the glide starts, fuel falls from 580° to about 520° and the gap from 250° to about 197°, with the reactor at 329° and steam at 99 at 33 s, as the owner expected.** Radioactivity dips to 92 and needs normal steering after that. With a whole 1% on each rod, it reaches 109 at 180 s.
- At radioactivity 180 it reaches 275 in 150 s, and steam goes from 206 to 274.
- **Trial, rods untouched, R after 180 s, starting from 100 at the limit:** today 167, no flow dip 165, 60 s glide 166, 10% loss 132, 10% loss with no dip and a 60 s glide 129. Only the size of the loss matters. The glide changes how soon, and the dip barely registers, though without it the fuel doesn't rise first.

**The owner's answer, 2026-11-05: halve the transfer loss to 10%, and change nothing else.** The flow dip, glide and guide wording stay. The figures above are at 20%.

With Run pressed from steady running at the limit, and rods untouched from then on. Steady running there means rod has already been pulled to hold radioactivity against the hot fuel's brake:

| Start | 3 minutes after Run, 20% | 3 minutes after Run, 10% |
|---|---|---|
| Radioactivity 100 | 167, steam 148 | 134, steam 124 |
| Radioactivity 180 | 282, steam 289 | 240, steam 250 |

At needle 0.5, radioactivity 100 reaches 116, not 126. Fuel at the limit now starts at 552°, not 580°, so there's about half as much to hand back. With 0.65% in on each of the ten rods as the glide starts, fuel falls from 552° to about 524° and the gap from 222° to about 193°, with the reactor and steam unchanged at 33 s. That is 6.5% of rod, so 1% on six or seven rods. A whole 1% on all ten is too much: radioactivity falls to 89 and keeps sliding.

**Bot, 400 shifts each:**

| | Survive, every job | Survive, novice | Disasters, every job | Disasters, novice |
|---|---|---|---|---|
| Easy, 20% | 98.0% | 97.5% | 0 | 1 |
| Easy, 10% | 98.8% | 97.8% | 0 | 0 |
| Hard, 20% | 61.8% | 47.0% | 5 | 17 |
| Hard, 10% | 58.0% | 51.0% | 10 | 15 |

- On Hard, the novice gains 4 points and the bot doing every job loses about 4. Each is close to the bot's noise, about ±3 points here, so don't read much into either alone.
- Together they do make sense: a smaller penalty means doing the jobs earns less, about 7 points of survival against 15. That is for the owner's playtest (§11.1, question 2).
- The median 20 s swing doesn't change with the loss: ×1.030 on Easy and ×1.032 on Hard with every job done.
- At 20%, the bot ran the ejector about 2.3 times and the balancer about 2 times on Easy, and about 4 of each on Hard. It presses earlier than the limit.

### 9.10 Key sounds, and which way the needle pushes, 2026-11-05

**Slow rods at 0%:** excluded (§5), which closes the trap of the yellow lamp asking for a +4.5 point tip spike.

**Which way the needle pushes.** The owner asked why balancing raises radioactivity, when a hot-fuel brake should lower it. Both are true, at different moments. With no rods touched at any point and the loss at 10%, the drift itself lowers radioactivity:

| Needle | Radioactivity | Gap per point of radioactivity |
|---|---|---|
| 0 | 100 | 2.00° |
| 0.5 | 88 | 2.12° |
| 1 (10¾ minutes) | 44 | 2.28° |

- The fall is far more than the brake alone. As radioactivity drops, the reactor cools, steam falls and its red card shrinks, so the slow loop carries it down. Fuel itself ends cooler, at 310°, though hotter than it would be at that radioactivity.
- A player who holds radioactivity against that by withdrawing rod is the starting point of §9.9's table, and Run takes away the brake they were leaning on.
- From the unsteered state, radioactivity 44 at the limit, Run does nothing to save it. It goes on falling, to 17 three minutes later, because the reactor is already cooling.

**Sounds,** every one checked key by key in a real game at phone size, by recording which clip each press started. All the clips are in one table at the top of `lib/sound-cues.ts`, so swapping one is a one-word change.

| Sound | Plays on |
|---|---|
| Button press 5 | Every Cancel, Close and X, including the camera and the foreman's close key |
| Button press 1 | Rods Apply, Warning key, Pumps, Rods and Turbine keys |
| Button press 2 | Turbine Apply, Home key, Camera key, alarm monitor and shift log headers |
| Button press 3 | Pumps Apply, Pause and Play key, Volume key |
| Button press 4 | Quit, Message key, ? key, foreman's Next and Previous, Main Menu |
| Pump confirm | Each pump switch as it turns, and no longer Apply |
| Water balancer run, turbine vacuum run | The Run keys, only when they start a job |

- The sound modal's switches and slider are silent (owner). The camera's Back is now Close, and lost its arrow.
- **Presses follow the Sound Effects switch alone, not the pause,** or Play would be silent and so would anything pressed during a pause. The game's own sounds still stop while it's paused.
- **The two run clips stop with the game and pick up where they left off,** so they pause with the foreman too. They run 6 s and 18 s, inside the 20 s and 33 s jobs.
- **A click survives leaving the game,** or Quit and Main Menu would be cut off. The first press after a reload also now sounds.
- **A new game starts with sound off.** That's the existing default, so a player hears none of this until they turn it on.
- A new check fails if a clip named in the table isn't in `public/sounds`, so a renamed file can't quietly lose its sound again.
- The file name `turbine-vacume-run.mp3` is spelt as supplied.

### 9.11 Turbine selector and event sounds, 2026-11-05

The owner supplied five more clips, all in the same table in `lib/sound-cues.ts`.

| Sound | Plays on |
|---|---|
| Electricity sound 1 | The turbine selector reaching Idle or Pumps |
| Electricity sound 2 | The turbine selector reaching Grid |
| Power cut event | A power cut starting |
| Pump trip event | A pump trip starting |
| Reactor hall event | The signal from the reactor hall going |
| Electricity sound 2, again | The turbine tripping off the grid (owner chose to reuse a selector clip, Claude chose which) |

- The selector sounds however it's turned, by click, drag, legend or arrow key, as it reaches a new position. It's silent against an end stop. Applying the mode still plays Button press 2.
- Each event clip plays once, as the event starts, with the event alarm, the warning bleep and the printer in that same second. An event already running in a saved game doesn't play it again. The same goes for a turbine trip.
- **Claude's call: the event clips follow the Sound Effects switch, not Alarms,** as one-off sounds like the warning bleep. The event alarm itself stays on Alarms.
- The power cut (5.7 s) and reactor hall (2.7 s) clips stop and pick up with the game, like the run clips. The pump trip (1 s) rings out.
- Rods Apply stays on Button press 1, the owner's renamed old clip, so it sounds as it did (owner, 2026-11-05).
- A rod jam and a grid hold have no clip. The Safety Test's own mains loss isn't an event, so it plays none.

---

## 10. Test findings behind these decisions

Run on 2026-11-04 on a scratch copy, with no changes to the repo. Each row is 100 bot shifts with the penalty on **for the whole shift, never fixed**. Hard varies by about ±4 points from noise.

| Worst-case penalty | Easy: survive / on target | Hard: survive / on target |
|---|---|---|
| None | 100% / 55% | 59% / 46% |
| Output −10% | 98% / 54% | 63% / 46% |
| Output −15% | 97% / 50% | 53% / 42% |
| Pump cooling −10% (bot refitted) | 99% / 55% | 55% / 44% |
| Fuel heat transfer −20% (the first limit, 10% since 2026-11-05) | 99% / 55% | 53% / 45% |
| Fuel heat transfer −30% | 94% / 55% | 51% / 44% |
| Fuel heat transfer −40% | 90% / 53% | 37% / 42% |
| All ten rods at half speed | 100% / 56% | 57% / 46% |
| Steam's red card +5% | 99% / 54% | 54% / 46% |
| Steam's red card +10% | 25% / 21% | 8% / 23% |

**Lessons:**
- **Don't weaken pump cooling.** Less cooling means more steam, and output is steam × 50, so it's a buff. Cooling −10% took radioactivity 100 at 2 pumps from 5,000 to 6,008 MW, and radioactivity 60 at 4 pumps from 1,152 to 1,634 MW. It looked punishing for the bot at first (92% and 49%), but that was the bot's rule of thumb being wrong. Refitted, it went back to baseline.
- **Don't touch the steam card.** It's a cliff: +5% changes nothing, and +10% wrecks the game.
- **Slow rods are safe.** With all rods at half speed, AZ-5 at radioactivity 350 with the pumps lost still survives. A late AZ-5 at 700 peaks at 1,664 instead of 781, and at no speed tested did AZ-5 at 500 or later save that scenario, including normal speed. Only tests pinning the exact speed failed.
- **Output loss below 10% barely shows for the bot.** It simply steers more. That's why the turbine's interest comes from recovery timing.

**Not tested:** the rod balance, the pump lock and flow dip, the recovery rises, the warnings, and all the mechanics together. Those come at build and tuning time.

---

## 11. Agreed points and defaults

**Decided by the owner:**
- Accepted the turbine and pump designs, with the pump limit lowered from 30% to 20%.
- Every mode, with no panel lamp.
- All three gauges appear on the main page as well as in the modals, in the same design: the rod needle on the Control Rod Positions widget (no bigger, layout little changed), and the turbine and pump gauges in a new two-halves widget that will probably replace the dosimeter.
- Log messages at gauge maximums only.
- Pump flow dip added alongside the lock. The turbine needs no added cost.
- Slow rods with a yellow lamp behind the channel's gap, plus left/right balance.
- Edge rods 1, 2, 9 and 10 count more on the needle, and the needle sets the effect.
- The needle follows actual rods, not levers.
- Starting rods keep their total, slightly off centre.
- Hint text moves to a question mark key and the shift foreman guide.

**Proposed by Claude, no objection from the owner:**
- Edge rods count 2.5 times as much as middle rods.
- Slow rods send no log message.

**Decided in the design review (2026-11-04):**
- All designs in §8.
- The dosimeter is replaced by Plant Gauges (§7.3).
- The guide is Guide A. Its wording is still a draft (§7.2).
- The name "Plant Gauges" stands.

**Decided after sign-off (owner, 2026-11-04):**
- The pumps Ready tile is green when the key can be pressed and grey when it can't, so it stays green at dead centre (§8.3).
- The game pauses while the modal guide is open (§7.2).
- Main page gauges are for reading only, and the action buttons stay in the modals (§7.3).
- The opening climb must stay as it is today. The exact starting order doesn't matter (§6).

**Left to Claude by the owner:**
- The effective boron guard in §6 stays. It's invisible to the player. It only stops a lopsided core gaining braking by accident.

### 11.1 Open questions for the owner

In priority order, as of 2026-11-05. The order runs from what changes how the game plays, through what depends on that, to what only needs a yes. Claude's recommendation is given where there is one.

**Playtest first:**
1. **Does the balancer's kick feel right at 10%?** Rods untouched at the limit, radioactivity 100 reaches 134 in 3 minutes after Run, not 167 (§9.9). Try a run with about 1% in on six or seven rods.
2. **Are the penalties too mild, or too hard to notice?** The 1% rule and the 10% loss both made the jobs gentler. Slow rods and rod balance make no measurable difference to the bot, which keeps rods moving and level, so only a person can judge these (§5).
3. **Is the timing of each job a real decision?** That was the owner's aim (§1), and the bot can't feel it. Try the ejector during a grid hold, and the balancer at a small reading.

**Difficulty, once 1 to 3 are settled:**
4. **Is Hard's novice result acceptable?** A novice who ignores every job survives 51% of Hard shifts (47% at 20%), against 61.5% before the jobs. Easy is fine at 97.8%. **Claude recommends** accepting it if question 2 comes back "about right", since Hard is meant to be hard, and the jobs now earn 7 points.
5. **Is the Hard check at 19 losses in 40 acceptable?** **Claude recommends** keeping 19. The bot doing every job now survives 58%, about 17 losses in 40, so 18 would fail on an ordinary unlucky block.

**Words:**
6. **The guide's final wording** (§7.2). The draft is live. **Claude recommends** renaming the step "Balance button" to "Run", to match the key, and adding that radioactivity rises as the needle returns, so the player puts a little rod in.
7. **How to Play's new lines** on all three machines. They are Claude's draft.

**Claude's decisions, for a yes or a change:**
8. **Starting rods.** They differ from §6, to keep the opening climb exact (§9.8). Do they look right, and is 17% off centre enough for a job at the start?
9. **Needles rest on a number:** the turbine's on 100 and the pump's on 0, for much of a shift. That follows the approved dials, but it's worth a look.
10. **A slow rod recovers on arrival,** not part way through its move as on the prototype, so that AZ-5 and the first move stay slow as §5 says. **Claude recommends** keeping it.
11. **Modals slide up the screen on a phone** to clear the foreman. Tall subjects can still sit partly behind his sheet on small phones (§9.5).
12. **The pump needle drifts the other way after each balancing.** The direction is cosmetic. **Claude recommends** keeping it.
13. **`/game?fastjobs`** stays in the code for future tuning. **Claude recommends** removing it when tuning is done.
14. **Key sounds Claude added beyond the owner's list** (§9.10): the ? key, the foreman's keys, the alarm monitor and shift log headers, Main Menu, and the click on the three panel keys that open the Pumps, Rods and Turbine modals. Tapping outside a modal, Escape and the home page stay silent.

**Waiting on a clip from the owner, not on a decision:** the rod levers and rod jams. Neither has a suitable sound yet (owner, 2026-11-05), so both stay silent for now, and the owner will say if that changes.
