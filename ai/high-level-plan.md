# RBMK Simulator – High-Level Design Plan

Status: **DRAFT v2 – awaiting approval.** Nothing in this document has been implemented. The reasoning behind changes to this plan lives in [high-level-plan-changelog.md](high-level-plan-changelog.md), not here.

This document is the source of truth for *what* we are changing and *what the player should experience*. It deliberately does not say *how* to implement anything. A later implementation plan will map each section to code.

---

## 0. How future agents should use this document

- Work on **one section at a time** (Sections 5–15 are self-contained work areas). Read Section 1 (pillars) and Section 2 (guardrails) before any section.
- Each section has: **Change** → **Player outcome** → **Must preserve** → **Acceptance checks**. Acceptance checks describe observable behaviour, not code. Numbers given are *initial tuning targets*, not hard requirements.
- If a change in one area forces a change in another (the reactor is one coupled system), note it and check the other section's acceptance checks still hold. Do not silently change behaviour owned by another section.
- Rules marked *Deliberate* are intentional simplifications. Do not "correct" them towards more realistic physics.
- **Radioactivity vs power output.** *Radioactivity* is the reactor's fission level: it is what the red and blue cards push up or down, and it makes the heat. *Power output* is only the electricity the turbine makes from steam (steam × 50 MW while connected). Radioactivity affects power output indirectly, through heat and steam, and with a lag. This plan never uses "power" on its own for either.
- Anything not described here is out of scope. If you think something else should change, flag it rather than doing it.

---

## 1. Design pillars

1. **It should feel like operating the reactor from the show.** Every mechanic should map to something the show explains: Legasov's courtroom "red cards and blue cards" (things that push radioactivity up vs. things that push it down), xenon poisoning, the positive void coefficient, too few rods in the core, and AZ-5's graphite tips.
2. **Fragility grows with mistakes.** A well-run reactor is forgiving. Each mistake takes away a brake: rods pulled out (less boron, and tips parked out of the core), cooling lost (more steam), fuel gone cold (no hot-fuel brake), xenon waiting to burn off. With fewer brakes, the same small push runs further and faster before anything stops it.
3. **Same science in every mode.** The reactor obeys the same physics in Easy, Hard, Free and Safety Test. Modes differ in workload (targets and emergencies), never in how the reactor behaves. Random emergencies become rarer and more meaningful.
4. **Always a way back.** No state short of game-over is unrecoverable. In particular, a collapsed, xenon-poisoned reactor can always be restarted with the right (risky) actions.
5. **Readable cause and effect.** When something happens, the player should be able to see why: through readouts, trends, warnings and messages. Prefer simple, honest rules (a rod's effect depends only on how much boron is in the core) over hidden multipliers.

---

## 2. Guardrails (do not change)

- The reactor control interface: button appearance/style, the "MANAGE" button → modal method of control, the lever-drag control rods modal, the pump toggle modal, the AZ-5 button.
- **10 control rods. 4 water pumps.** Same set of controls (rods, pumps, turbine, pause).
- The existing displayed variables: radioactivity, reactor temperature, fuel temperature, steam, xenon, power output, power target, performance, time. **No new player-facing reactor variables.** (Internal helper values are fine if they are not new gauges.)
- Easy, Hard and Free modes continue to exist, and **every mode uses identical reactor physics** (Section 11).
- Meltdown remains a game-over at the existing reactor-temperature limit.

**Exceptions:**
1. The turbine modal gains the option to power the pumps, and the turbine panel may gain one matching indicator lamp (Section 8).
2. In the control rods modal, text can no longer be highlighted while dragging, and the levers become easier to grab on touch screens. Same look (Section 10).
3. The panel's rod display shows each rod's real position as it travels (Section 10).
4. AZ-5 takes effect with a single press; no Apply step (Section 10). The modal closes when AZ-5 is selected. 
5. Legasov's red and blue cards are shown on a board beside the reactor camera (Section 15, owner). They show the engine's own cards; no new gauge or control.

---

## 3. Research summary (what we are simulating)

In this real-world history, "power" means the reactor's thermal power, which the game represents as radioactivity (not power output).

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
| Positive void coefficient: steam in the core increases reactivity | Steam is a "red card". More steam → more radioactivity → more heat → more steam. |
| Most unstable at low power (a low fission level). Not because there is much steam then (there isn't), but because cool fuel gives little braking, and holding the fission level up against xenon meant pulling rods out. Once steam did start to form, little stood in its way. | Low radioactivity is not twitchy in itself; the state needed to hold it there is. Hot fuel slows a high-radioactivity rise but never stops it (owner); only rods and pumps do. |
| Few rods in the core: little boron holding the fission level down, and rods parked fully out have their graphite tips out of the core | Withdrawn rods = fewer brakes, plus a trap for AZ-5. Rod margin is the player's safety buffer. |
| Rods take many seconds to travel (~18 s) | Rods are not instant brakes. |
| Hot fuel is less reactive; cold fuel more reactive | Fuel temperature is a gentle brake when hot and the restart lever when very cold. |
| Xenon builds when the fission level is reduced or low, and burns off when it is higher, faster the higher it is | The xenon pit, and the dangerous temptation to pull rods to escape it. A surge strips xenon quickly, removing a brake just when one is needed. |
| Fission heat is produced in the fuel, then passes to the coolant/graphite | Supports the "radioactivity → fuel → reactor → steam" chain. |
| The fission level changes exponentially: its rate of change is proportional to its current level | The genuine source of "it ran away in seconds". |

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
- Xenon reading 0% in normal running and building only at low radioactivity.
- The all-pumps-off escalation feel.
- The graphite tip concept, AZ-5, rod jams, power cuts, target changes.
- Steam → turbine → power output → performance against target.
- Identical reactor physics in Easy and Hard.

**Problems found:**
1. **No genuine exponential behaviour.** Because changes are fixed amounts rather than proportional to current radioactivity, the reactor never "runs away" or "collapses" on its own; it drifts linearly. A rod change moves radioactivity by the same amount at 20 as at 400.
2. **Temperature chain is backwards.** Heat appears in the reactor and then soaks into the fuel. The fuel's stabilising effect therefore arrives late and only at extremes.
3. **Pump cooling ignores conditions.** Each pump removes the same heat regardless of how hot the reactor is or how high radioactivity is. Flow never changes how much water boils: pumps affect steam only indirectly (by cooling the reactor), plus the special zero-pump case. So "more water → less steam → less reactivity", central to the test, is weak.
4. **Rods are instant, and the tip effect is a fixed bump.** Rods move instantly, so they are perfect brakes. The tip effect is a one-off +50 when a rod leaves 0%, the same whatever state the reactor is in, so AZ-5 can never cause the show's disaster.
5. **The mode menu misdescribes Easy and Hard.** It promises "more stable" vs "challenging" reactor mechanics, but the physics are identical, which is correct (Section 11). Only events and targets differ, and the menu should say so.
6. **Random events are frequent and severe.** An event roughly every 2–4 minutes; about 1 in 3 is a power cut or rod jam. Hard mode can jam 5–8 of 10 rods for up to 3 minutes. A 30-minute game can see 3–4 major emergencies.
7. **Targets can jump by thousands of MW at once** (Hard range 500–10,000 MW; one change can be up to ~4,750 MW on Hard, ~3,000 MW on Easy). Tolerance is a fixed ±500 MW: about ±5% at a 10,000 MW target but ±100% at 500 MW. The README says "within 10%"; How to Play says "within 500 MWs".
8. **Only one way to lose to the reactor** (meltdown). The show's actual ending, an explosive runaway, has no equivalent.
9. Smaller: heating tiers are uneven (the "acceleration" tier is actually gentler), a few warning thresholds differ slightly between panel and warning list, the panel's on-target colour uses its own copy of the ±500 MW tolerance, the AZ-5 button only moves the levers (Apply must still be pressed), and the "Power Test" mode placeholder already exists.

---

## 5. Reactivity and radioactivity (the core change)

**Change:** Replace "radioactivity changes by fixed amounts" with a **reactivity balance**, Legasov's red and blue cards. Each second, every card in play contributes a push up or down:

- **Red (push radioactivity up):** steam in the core (void); graphite rod tips in the core (Section 10); fuel cooler than normal, strongly when very cold.
- **Blue (push radioactivity down):** boron, in proportion to how much rod is in the core; xenon; fuel hotter than normal.

Two rules keep the cards readable:
- **Removing a blue card raises radioactivity just as surely as playing a red one.** Pulling rods out, or xenon burning off, is not a new push upwards: a brake has gone.
- **Pumps act on the steam card rather than being a card of their own.** Cooling the reactor (and with it the fuel) leaves less heat to turn into steam, and with no flow at all the water boils far more readily (Section 7). More pumps → a cooler reactor → less steam → lower radioactivity, building over minutes rather than seconds. Cooler fuel also weakens the hot-fuel brake, but in the normal range the steam effect is the bigger of the two. Fuel only becomes a strong red card when very cold (Section 9).

The net balance sets the **rate** at which radioactivity grows or shrinks **in proportion to its current level**. A positive balance compounds; a negative one decays. **A small balance acts slowly and a big one fast** (owner), as delayed and prompt neutrons do in a real reactor: up to 10 points (one card on Legasov's board) each point moves radioactivity about 0.3% a second, and every point beyond that acts five times faster. So a creep needs a balance big enough to see on the board, the random drift jitters gently, and big pushes (the graphite tips under AZ-5, rods yanked out) still act within seconds. A small, constant **source term** keeps radioactivity from ever being exactly zero, so a dead reactor can always be restarted.

**Fragility:** there are no hidden multipliers. The reactor becomes fragile when its brakes are gone and the red cards are free to grow:
- **Rods out:** less boron holding radioactivity down, so it is held steady by something less reliable (often xenon, which can vanish). Rods parked at 0% also push radioactivity up before they bring it down (Section 10), and every rod takes seconds to arrive.
- **Low flow:** water boils more readily, so each rise in radioactivity produces more steam, which raises radioactivity further.
- **Cool fuel:** after a spell at low radioactivity or heavy pumping, the hot-fuel brake is weak. If radioactivity starts to rise, little slows it until the fuel heats up. This, not the amount of steam, is why low radioactivity is dangerous.
- **Xenon present:** as radioactivity rises it burns off, removing a blue card exactly when radioactivity is rising (Section 9).

Because radioactivity changes in proportion to its current level, any imbalance also plays out faster when radioactivity is high.

**Effect on power output:** none directly. Radioactivity heats the fuel, the fuel heats the reactor, the reactor makes steam (Sections 6–8), and only steam reaches the turbine. So power output follows radioactivity with a delay of seconds, and only once the reactor is above boiling.

**Player outcome:**
- At healthy radioactivity with rods reasonably inserted, the reactor is steady but never hands-off. A rise in radioactivity feeds itself: hotter fuel, a hotter reactor, more steam, and the steam pushes radioactivity further, gathering pace. A fall feeds itself the same way. With rods and pumps unchanged, nothing stops the loop: very hot fuel slows the rise but never ends it. The only ways out are inserting rods and adding pumps (owner). With one pump the loop runs fastest (Section 7).
- As the player pulls rods, lets the fuel cool or loses flow, the reactor loses its brakes: the same push runs further and faster before anything stops it.
- In truly bad states (rods out, low flow, cold fuel, rising steam), radioactivity can go from "fine" to "catastrophic" in seconds.
- Over-inserting rods or flooding the core with water at low radioactivity makes radioactivity **collapse quickly**, sliding toward the xenon pit.

**Must preserve:** baseline drift so a hands-off reactor is never perfectly static; some small randomness (now proportional, not fixed).

**Acceptance checks:**
- Starting state with default rods and two pumps climbs from the start: hands-off, radioactivity rises straight away, power output leaves its target band within a minute, and the player feels they need to act within a couple of minutes (owner request; the engine's balance point is a separate, exactly steady reference state).
- Moving a rod by the same amount always changes its boron effect by the same amount, at any depth (the tip aside). With everything else equal, including current radioactivity, 10%→5% and 50%→45% have the same effect.
- The same push moves radioactivity further and faster when radioactivity is high than when it is low.
- There exists a reachable state where radioactivity at least doubles within a few seconds with no player input.
- Radioactivity never sticks permanently at zero.

---

## 6. Temperatures: fuel and reactor

**Change:** reverse today's chain to **radioactivity → fuel temperature → reactor temperature → steam**. Fission heat is produced in the fuel, so this matches reality, and the fuel's brake arrives on time instead of late.
- **Radioactivity heats the fuel.** Fuel temperature responds fairly quickly (seconds) and runs hotter than the reactor while radioactivity is up.
- **Fuel heats the reactor.** Heat flows from fuel to reactor in proportion to the gap between them. Reactor temperature is slower and steadier, representing the bulk of coolant and graphite.
- **Fuel temperature feeds back on reactivity continuously:** the fuel card is counted from **normal running temperature**, where it is 0. A healthy reactor at power has hot fuel (hundreds of degrees above the coolant), and that is normal. Fuel hotter than normal is a mild blue card that firms up a little once the fuel is very hot, and stops growing beyond about 2,000° (owner): fuel hotter than that brakes no harder, so with the rods pulled right out nothing slows the runaway and it ends in seconds. It slows a rise but never stops one: with rods and pumps unchanged, the steam that comes with hot fuel always outweighs it (owner). Fuel cooler than normal is a red card, and very cold fuel gives the strong red card used for restarting (Section 9). At every temperature the effect per degree is weaker than the steam it comes with, so the loop in Section 5 always runs.
  - *Deliberate (decided with the owner):* real fuel's brake is always working at power. Counting it from normal running keeps that behaviour, while a healthy reactor reads as "neither hot nor cold". The brake and the cold push are one curve, so weakening one weakens the other.
- **Meltdown stays on reactor temperature** at the existing limit, so players' existing understanding holds.

**Not exponential:** fuel and reactor temperature are heat balances. They should follow radioactivity with lag. They rise very fast only *because* radioactivity is very high, never through their own exponential rule.

**Player outcome:** Fuel temperature becomes a meaningful early warning: it climbs first when radioactivity rises and tells the player what the reactor temperature is about to do. Reactor temperature is the "you have this long" gauge.

**Acceptance checks:**
- After a rise in radioactivity, fuel temperature rises before reactor temperature.
- At steady radioactivity, fuel temperature sits above reactor temperature.
- With rods and pumps unchanged, a small rise in radioactivity ends in disaster: hot fuel never stops it (owner).
- Very hot fuel slows the rise: radioactivity grows noticeably more slowly once the fuel is very hot than while it is warming.
- More pumps lower fuel temperature as well as reactor temperature (indirectly, through the reactor).

---

## 7. Water pumps and cooling

**Change:**
- Pumps act on the **reactor temperature (coolant) and on steam formation**, never directly on the fuel. Cooling the reactor widens the fuel-to-reactor gap, so the fuel cools too and less heat is left to turn into steam. The one direct effect on fuel: with **no** flow, heat transfer out of the fuel degrades (dry-out), so fuel overheats faster.
- Pump cooling scales with **how many pumps run** *and* **how hot the reactor is and how high radioactivity is**. Each pump removes more heat when there is more heat to remove, with diminishing returns per extra pump.
- **Flow changes how readily water boils only between no flow and one pump** (owner). Below one pump's worth of flow, water boils more readily (more steam per degree, a bigger red card), rising to boiling escalation at zero flow. From one pump upwards, steam per degree is the same: extra pumps lower steam only by cooling the reactor, so their effect on radioactivity builds slowly and they are not a quick throttle.
- **Flow takes a few seconds to change.** The player can switch pumps on or off whenever they like, as now. Water takes a few seconds to start flowing after a pump starts (switched on, or regains power) and a few seconds to stop after it stops, whatever is powering the pump.
- **Zero pumps (or unpowered pumps) triggers boiling escalation:** steam generation accelerates sharply as the reactor heats, which drives radioactivity up, which drives heat up. This is the deliberate nonlinear loop that replaces today's special-case rule. The outcome must feel the same or stronger.

**Player outcome:** clear, distinct feel for each pump count:
| Pumps | Feel |
|---|---|
| 4 | Strong cooling, little steam, cooler fuel. At low radioactivity this suppresses reactivity and can push the reactor toward collapse (the "extra pumps" trap from the test). |
| 2–3 | Normal operating band, but never hands-off: with rods unchanged, a rise or fall keeps feeding itself until the player acts. |
| 1 | Hot, steamy, twitchy. Left alone it runs away to disaster within minutes; workable only with active rod control. |
| 0 | At high radioactivity, a runaway within roughly 30–60 s if ignored. At low radioactivity, a slower but real climb. |

**Acceptance checks:**
- Turning a pump on/off has a visibly larger effect at high radioactivity than at low.
- A pump's effect builds over a few seconds after switching, not instantly.
- Running all four pumps at low radioactivity measurably lowers radioactivity.
- Losing all pumps at high radioactivity with no player response ends in disaster within about a minute; rapid rod insertion and turbine-to-pumps can save it if acted on quickly.

---

## 8. Steam, turbine and turbine-powered pumps

**Change (steam):** Steam is made by the reactor, never directly by the fuel: hot fuel heats the reactor, and the hot reactor boils the water in its channels. Below boiling there is none. Above boiling, the hotter the reactor, the more steam, and with less than one pump's worth of flow, far more (Section 7). So steam only changes once reactor temperature has: if fuel temperature jumps but reactor temperature hasn't moved yet, steam doesn't move either. Steam remains the single variable that both feeds the turbine and adds reactivity, and it is the variable behind the explosion ending (Section 11).

For surges to stay dangerous, heat must flow from fuel to reactor in proportion to the gap between them (Section 6). A violent radioactivity spike then makes fuel temperature soar, and that huge gap drives reactor temperature, and steam with it, up within seconds. In normal running the gap is small and everything moves gently.

**Change (turbine-powered pumps):** the turbine modal gains a second choice when the turbine is **disconnected from the grid**: **"Supply station pumps."**
- When supplying pumps, **power output to the grid is 0** (performance falls if a target is set).
- The number of pumps it can power depends on **steam volume**: no steam → none; some steam → 1–2; plenty → all 4. Turbine power goes to pumps the player has switched ON first.
- It only matters when the pumps' normal supply is lost (a power cut, or the Safety Test). With normal supply available the pumps run from it, so this mode is pointless (and costs output). 
- **A coasting turbine runs down.** If the turbine's steam is shut off (only in the Safety Test, Section 14), it keeps powering the pumps on its momentum alone: at first as many as its steam was powering, then fewer, until none after about 45 s, whatever the reactor's steam does (owner).
- Pumps stay fully under the player's control: they can be switched on/off at any time, and flow builds and dies away over a few seconds as with any supply (Section 7).
- **No flicker:** when steam hovers right at the level where the turbine could supply one pump more or one fewer, the supply holds steady until steam has clearly moved, rather than cutting a pump's power on and off every second. (This concerns the turbine's supply, never the player's switches.)
- The existing PWR lamps on the pump panel show which pumps are receiving power, whatever the source. The turbine panel may gain one small indicator lamp for "supplying pumps", matching the existing lamp style. No other control changes.

**Player outcome:** a power cut becomes a decision rather than just a wait. Do I sacrifice my grid output to keep cooling going? It's self-balancing but imperfect: more pumps reduce steam, which reduces turbine power, which powers fewer pumps. The player must nurse it. This is exactly the turbine-rundown concept from the real test and ties directly into Safety Test.

**Acceptance checks:**
- During a power cut with turbine supplying pumps, PWR lamps light in proportion to steam.
- PWR lamps do not flicker while steam sits near a threshold.
- Power output reads 0 while supplying pumps.
- Reconnecting to the grid restores output and returns pump power to the normal supply (or none, if the power cut continues).
- Steam never changes ahead of reactor temperature: a fuel temperature rise only shows in steam once reactor temperature has risen.
- In a violent radioactivity spike, reactor temperature and steam both climb within seconds.

---

## 9. Xenon and recovery from low radioactivity

**Change:**
- **Xenon reads 0% during normal running.** It builds only when radioactivity is low, and burns away as radioactivity rises until none remains. Xenon remains capped at 100%. (*Deliberate:* the gauge shows xenon beyond what a reactor in normal running always holds, so 0% means "normal".)
- **One turnover point, at radioactivity 80** (owner). At or below it xenon builds: slowly just under 80, faster the closer radioactivity is to 0 (from zero to the cap in under 6 minutes).
- **Burn-off speeds up with radioactivity.** Above 80 xenon burns off: slowly just above 80, at a medium rate by normal running (a full load in under 2 minutes at 100), fast by 120 (about 40 seconds), and fastest from 130 (a full load in about 10 seconds, half a load in 5, owner). That is quick, but slow enough to watch on the gauge, and slower than all ten rods driving in can make up for. So a player climbing out of the pit must re-insert rods early and keep radioactivity under 120 until the gauge reads 0%: a surge past 130 with xenon left loses the brake within seconds, and only a fast, large rod insertion catches it.
- **Xenon is a blue card, and burn-off takes it away.** Burn-off does not push radioactivity up by itself; it rises because a brake is going. Because burn-off speeds up as radioactivity rises, the two feed each other: when radioactivity suddenly spikes, xenon burns off quickly and the spike grows further. A player who pulled every rod to escape the pit must re-insert rods as xenon clears, or overshoot.
- **The restart route stays:** sufficiently cold fuel provides a strong red card, and the source term (Section 5) keeps a spark alive. With rods fully or almost fully withdrawn and fuel cold, a fully poisoned, collapsed reactor will always restart.

**Player outcome:** the classic Chernobyl trap. Falling into the pit is slow and ominous; escaping it requires pulling rods out (making the reactor fragile); the escape then accelerates as xenon burns off. Recovery is always possible, and it is the most dangerous moment of a normal game.

**Acceptance checks (invariants, test these explicitly):**
- From radioactivity ≈ 0 and xenon at cap, with rods (nearly) fully withdrawn and pumps used to cool the fuel, radioactivity begins climbing within roughly 1–3 minutes.
- Xenon builds at or below radioactivity 80, faster the lower radioactivity is.
- Burn-off speed depends on radioactivity: just above 80 a full load takes several minutes to clear; at 100 a minute or two; from 120, under a minute.
- After sustained normal running, xenon reads 0%.
- If the player does nothing during burn-off with rods fully withdrawn, radioactivity overshoots dangerously.
- Collapse → full xenon takes several minutes, giving the player time to notice and react.

---

## 10. Control rods

Ten rods, same lever modal, same AZ-5 button. Changes are mostly in behaviour, plus one-press AZ-5 (item 3) and small interface improvements (item 5), as allowed in Section 2.

**Change:**
1. **A rod's effect depends only on how much boron is in the core.** Moving a rod 5% changes its boron effect by the same amount whether it goes 10%→5% or 50%→45%. Rods are deliberately gentle against the other cards (owner): moving one rod 10% shifts radioactivity by about a fifth at first, so a single small move is never decisive.
2. **Rod margin.** The total insertion across all ten rods is the rod margin: how much boron is holding the reactor down. It is not an extra physics rule; it names a dangerous state. Below a minimum (the game's version of the "15-rod minimum"), a warning in the existing message area says so. Low margin is dangerous because of what it implies: radioactivity is being held by something less reliable than boron (often xenon, which can vanish).
3. **Rods travel over time, at the same speed in every mode.** Applying a new setting moves each rod toward it at a steady speed (full stroke about 18 s, as in the real reactor; tune to taste). AZ-5 takes effect the moment it is pressed, with no Apply step (closing the lever modal when AZ-5 button is selected), and drives every rod that isn't jammed toward 100% at the same speed, so it takes seconds to complete. The lever modal shows where each rod has been ordered to go; the panel's rod display shows where each rod actually is, so after closing the modal the player watches the indicators travel. A jammed rod stops wherever it is, including mid-travel.
4. **Graphite tips.** Each rod has a graphite tip at its bottom. Graphite is a red card worth +10, the same as 10% of boron. The tip is in the core at 1% insertion or more, and out only at 0%. One rod's net effect, counted in % of one rod's boron (+ pushes radioactivity up, − pushes it down):

   | Rod position | Tip | Boron | Net |
   |---|---|---|---|
   | 0% | 0 | 0 | **0** |
   | 1% | +10 | −1 | **+9** |
   | 5% | +10 | −5 | **+5** |
   | 10% | +10 | −10 | **0** |
   | 50% | +10 | −50 | **−40** |
   | 100% | +10 | −100 | **−90** |

   - **The tip only matters when a rod crosses between 0% and 1%.** Everywhere else, each 1% of movement just changes boron by 1 point (item 1).
   - **Inserting from 0% causes a spike.** At 1% the tip's +10 and the first 1% of boron count together. From there boron grows as the rod travels, so the net push stays positive until the rod passes 10% (about 2 s). AZ-5 with all ten rods at 0% gives +100 at once.
   - **Withdrawing:** every step out raises radioactivity (10% → 8% removes 2 points of boron), except the final step from 1% to 0%, which lowers it by 9 as the tip leaves. A rod adds the most radioactivity at 1%. (*Deliberate:* unlike in the show, pulling rods fully out doesn't buy extra radioactivity.)
   - **Rods parked at 1% or more never spike**, but a rods-out reactor stays dangerous (margin warning, xenon, steam). How to Play should hint at this.
5. **Interface improvements:**
   - Text in the rod modal (rod labels, percentages) can't be selected, so dragging a lever with a mouse never highlights it.
   - Levers are easier to grab on touch screens: a fingertip-sized grab area around each handle (and/or a drag can start anywhere on the rod's track). The look stays the same.
   - The panel's rod display shows live travel (item 3).

**Player outcome:** rods become the central skill. Keeping rods in the core is safety; pulling them out buys radioactivity (and so, in time, power output) at the cost of brakes, and parking them at 0% sets a trap. AZ-5 is a powerful tool that can kill you if you have let the reactor get into the wrong state, just as in the show.

**Acceptance checks:**
- A rod moving off 0% causes a short spike; a rod that is already inserted causes none.
- AZ-5 with every rod at 0% pushes radioactivity up for about 2 seconds before the boron takes over.
- Pulling a rod from 1% to 0% lowers radioactivity; every other step of withdrawal raises it.
- AZ-5 starts moving the rods the moment it is pressed, with no Apply step.
- AZ-5 from a normal state always shuts the reactor down safely.
- AZ-5 with most rods at 0%, high steam and cold fuel causes a dangerous spike and can be fatal. With gentle rods the tips are gentle too, so this needs eight or more rods at 0% and the spike is modest, about a quarter to a third (owner).
- After the modal closes, the panel's rod indicators visibly travel to their new positions at rod speed.
- Rod speed and rod effect are identical in every mode.
- Dragging a lever with a mouse highlights no text; levers are easy to grab and slide on a phone.

---

## 11. Difficulty and failure endings

**Change (difficulty):** reactor physics are **identical in every mode**: same feedbacks, same rod speed, same limits. Modes differ only in how much they throw at the player:

| | Easy | Hard |
|---|---|---|
| Shift | 15 min | 30 min |
| Major emergencies | ≈1 per shift (on average but randomised, so it might be possible to have more) | ≈3 per shift (on average but randomised, so it might be possible to have more) |
| Emergency severity | shorter power cuts, smaller rod jams (Section 12) | longer power cuts, bigger rod jams (Section 12) |
| Power target changes | smaller, less frequent (Section 13) | larger, more frequent (Section 13) |

Free mode: same physics, no targets, no events. Safety Test: same physics, scripted targets and disruptions (Section 14). The mode-select menu and How to Play describe this workload difference, not "more stable" / "challenging" reactor mechanics.

**Change (endings):** add a second reactor failure alongside meltdown:
- **Meltdown** (existing): reactor temperature exceeds the limit. Slow overheating death.
- **Core explosion** (new): **steam** exceeds an extreme ceiling, well above the existing high-steam warning (starting point: about double it). Steam only: radioactivity alone can't blow the reactor apart; what it does to temperature and steam can. Which ending comes first depends on flow. With little or no flow, each degree of reactor temperature makes far more steam (boiling escalation, Section 7), so steam hits its ceiling before reactor temperature reaches meltdown. With pumps running, steam stays lower per degree and meltdown comes first. A fast, violent death matching the show's ending, where flow had collapsed.
- **Removed from post** (existing): performance hits 0.

Each ending gets its own game-over presentation.

**Acceptance checks:**
- The same starting state and the same inputs give the same reactor behaviour in every mode (apart from small randomness).
- The explosion is reachable via the runaway / AZ-5 tip scenarios, and only steam triggers it.
- A runaway with low or no flow (e.g. the Safety Test rundown, or all pumps lost) ends in an explosion; an overheat with pumps running ends in meltdown. Meltdown remains reachable via sustained overheating.

---

## 12. Random emergency events

**Change:**
- **Far fewer major emergencies, each more meaningful.** Starting budget: Easy ≈ 1 major emergency per 15-minute shift. Hard ≈ 3 per 30 minute shift. No major emergency in the first few minutes, with sensible spacing between them. Major emergencies are power cuts and rod jams.
- **Brief warning before major events where it fits** (e.g. "grid instability reported" shortly before a power cut) so the player can prepare.
- **Power cut:** keep. Somewhat shorter on average, now with the turbine-to-pumps option making it a decision.
- **Rod jam:** keep as today. With rod travel (Section 10), a jam freezes each affected rod wherever it is, including mid-travel.
- **New, smaller events (fit the theme):**
  - **Single pump trip:** one pump fails for a period. A lighter alternative to a full power cut.
  - **Turbine trip:** consequence-based rather than random. Sustained over-pressure (the existing OVR-P lamp) trips the turbine off the grid. This gives the high-steam warning a real consequence.
  - **Grid controller "hold" request:** the grid asks the station to hold its current output for a period (Kiev's request from the show). Flavour plus mild pressure. The window for power output matching power target reduces by 50% for the duration of the event.
- Retire the rigid power-cut / rod-jam alternation in favour of the budget above.

**Starting values by mode** (tune in playtests):
| | Easy (15 min) | Hard (30 min) |
|---|---|---|
| Major emergencies | ≈1 | ≈3 |
| Smaller events (pump trip, hold request) | ≈1–2 | ≈3–4 |
| Power cut length | ≈20–45 s | ≈30–60 s |
| Rod jam | as today: 4–7 rods for 30–90 s | as today: 5–8 rods for 1–3 min |

**Player outcome:** the shift feels like running a reactor, punctuated by a couple of memorable crises, not a stream of unrelated failures.

**Acceptance checks:** a typical Hard game shows the budgeted number of major emergencies. A turbine trip only happens after visible over-pressure warning. A rod jammed mid-travel stays where it stopped until the jam clears.

---

## 13. Power targets

**Change** (values are starting points for playtesting):
- **Smaller, less frequent changes.** Cap each change at a fraction of today's maximum (roughly ±1,500–2,500 MW), at intervals of several minutes.
- **Warned changes:** the grid controller warns that demand has changed ("We may require an adjustment in your power output. Confirmation to follow shortly"), then confirms the new target 60 seconds later, when it takes effect. The player knows a change is coming, but not its size or direction until it is confirmed. (The Safety Test's orders still state the new target with their notice.)
- **Tolerance proportional to target:** ±10%, never tighter than about ±200 MW, the same in every mode. Low targets become precise rather than trivially wide.
- **Keep low targets as a deliberate danger, but rarer.** A low target is a xenon trap; that is good tension, used sparingly.
- **Easy and Hard differ in the size and frequency of changes** (starting values):

| | Easy | Hard |
|---|---|---|
| Target range | as today (2,000–8,000 MW) | as today (500–10,000 MW) |
| Largest single change | ≈ ±1,500 MW | ≈ ±2,500 MW |
| Time between changes | ≈ 4–5 min | ≈ 2–3 min |

- Final values are tuned together with Sections 5–12, not independently.

**Acceptance checks:** a competent player, reacting once each target is confirmed, can meet every Hard target, but the targets are still harder to meet than on easy. Low targets visibly risk xenon buildup.

---

## 14. New mode: Safety Test

A scripted scenario of 20 minutes that recreates the show's night: the player spends most of the game getting the reactor into an unfavourable state under pressure, then the test exposes it. Same reactor physics as every other mode (Section 11).

**Communication:** the same shift log as Easy and Hard, with no separate procedure display. Every instruction is a message in the log, from a named role. Messages come from roles, not real people's names: Test Supervisor, Deputy Chief Engineer, Kiev Grid Controller, Shift Foreman, Senior Reactor Control Engineer. The Deputy Chief Engineer gives the station's target orders; when each takes effect, the Test Supervisor confirms it ("New power output requested…"). Kiev confirms its own.

**No random events.** All disruptions are scripted. Targets are scripted and still show in the same Power Target display to help the player. Same rules apply for being within / outside of range for targret, impacting performance. Each scripted target stays in force for at least about 2 minutes, so a competent player can reach and hold it, and no target is below 700 MW (owner). The targets are 5,000 (start) → 3,000 → 2,000 → Kiev's hold at 2,000 → 1,500 for the test (owner). Pumps decide who falls into the xenon pit: with four pumps radioactivity stays near 80 at 2,000 MW, so a skilled player reaches the test with modest xenon, while a player on two pumps reaches it fully poisoned. 

**Automated changes:** some phases change controls without the player doing anything. Each automated change is announced in the log as it happens and happens once. The player can reverse it at any time, and the script never undoes the player's reversal.

**Phases** (timings are starting values for pacing):
1. **Briefing & power reduction** (≈0–4 min). Reactor starts at normal output. Procedure: reduce power output in steps to about half. Messages explain the test's purpose.
2. **Kiev's delay** (≈4–8 min). The grid controller orders the station to hold a power output low enough that, unless the player runs extra pumps, the radioactivity needed for it causes slow but steady xenon build-up (the show's 10-hour delay, compressed to a few minutes).
3. **Shift change, Kiev's release & reduction to test output** (≈8–12 min). Kiev lets the test go ahead and the target steps down to the test output. Xenon builds. Either radioactivity tanks or the player removes control rods.
4. **Pressure to run the test** (≈12–15 min). The Deputy Chief Engineer demands the test power output is held. A player who let xenon build must withdraw more rods, dropping below minimum rod margin (warnings fire). Performance pressure applies: failing to reach and hold the test output drains performance, and at zero the player is removed from their post. Safe play is not free. Fuel temperature is likely starting to get low.
5. **Test** (≈15–18 min, with about 4 minutes left). Procedure orders **all four pumps on**, and the game switches them on automatically. Fuel temperature drops further as a result. Then a "Switch turbine to power pumps" message appears, and the game automatically disconnects the turbine from the grid and sets it to supply the pumps. As the test begins, the pumps' normal supply is cut (the loss of station power the test exists to simulate), and steam to the turbine is shut off. So the coasting turbine is their only power, and it runs down to nothing within about 45 s (Section 8): flow collapses unless the player acts. The player is able to intervene at any point.
6. **End of test** (≈18–20 min, no more than 2 minutes). After the test time has elapsed a message reads "Test complete" and the pumps' normal supply returns. There are no more automated changes. It's up to the player to avoid a catastrophe until the shift ends.

**Targets during and after the test:** from the turbine switch in phase 5 onwards there is no grid target (the script itself has disconnected the turbine), so performance neither rises nor falls, and the Power Target display shows N/A as in Free mode. After "Test complete" the only goal left is survival.

**Outcomes:**
- Same as any other mode: reach the end of the 20-minute countdown, or be removed from post / suffer a disaster.

**Player outcome:** Safety Test feels unlike the shift modes. It is a slow-burn story where the player is pushed, step by step, into the configuration the show warns about, and some things change without the player doing anything. Then they have to survive the consequences. Surviving should be possible but require skill.

**Acceptance checks:** each phase is triggered, any automated changes take place per phase and are announced clearly. The player can reverse any automated change. On two pumps, the xenon from phases 2–3 takes the rod margin below its minimum while holding the test output; with four pumps a skilled player can stay out of the xenon pit. Surviving to the end of the 20 minutes is possible with skilful play.

---

## 15. Presentation and UI (outside the reactor controls)

**Reactor view as a security camera** (both the inline reactor image and the fullscreen "View Reactor"):
- CRT/CCTV monitor bezel, scanlines, vignette, faint flicker.
- On-screen text such as "CAM 04 – REACTOR HALL – UNIT 4", a running timestamp matching the date of the real disaster, and a blinking REC dot.
- One subtle imperfection: a hairline crack or grease smudge in a corner.
- **State-driven interference:** at high radioactivity the image picks up white speckles and static, like the radiation-fogged footage of the real event. This turns the camera into a danger gauge rather than decoration. The reactor picture's high-temperature overlay is unchanged; its radiation glow fades in from radioactivity 320, just below the high-radioactivity warning, and is full by 520.

**Use wide screens:** instead of empty space beside the square reactor view, add side panels in the same industrial style:
- **Legasov's red and blue cards** to the left of the camera, styled on the show's courtroom rack: a red column and a blue column of thin cards. Every card is the same push on radioactivity (10 points, or one rod moved 20%; a lead of one card is where the reactor goes prompt, Section 5), so each contributor shows as many cards as its push, and each column's height is its side's total. Level columns mean balance. Under half a card is no card. Red: nuclear fission (the fuel and graphite, including the graphite tip of every rod in the core), steam (the positive void coefficient) and fuel cooler than normal. Blue: control rods, xenon and fuel hotter than normal. The fuel's cards follow its push, which is zero only at normal running temperature. Each group has an arrow when it is getting stronger or weaker. Because the fuel answers within seconds, the columns stay level through slow drifts; the arrows show which contributors are moving.
- **A chart recorder** (paper strip chart) showing the last few minutes of radioactivity, and perhaps steam and reactor temperature. With exponential behaviour, seeing the *trend and acceleration* is essential, and it fits the control-room aesthetic.
- On narrow screens these collapse below or hide; no horizontal scrolling.

**Message area:** distinguish message sources visually (Grid Controller, Head Engineer, Test Supervisor, automatic alarms) and give it a teletype/log feel with timestamps. Keep it compact. The control panel's header has a red warning lamp (lit while any warning is active) and an amber shift-log lamp (lit when a new message arrives), each with a button that brings its machine into view, so a player on a phone knows to look below the dials.

**Homepage and menus:** stronger atmosphere (CRT title treatment, subtle flicker, and the disaster end screens' red emergency beacon, mounted on the ceiling and sweeping down through the room, with embers drifting up). The mode selection includes Safety Test as a visually distinct "historical scenario" card. The Easy and Hard cards describe workload (shift length, targets, emergencies), not different reactor mechanics (Section 11).

**End screens:** separate presentations for meltdown, core explosion, removed from post and success. Add a short "incident report" with peak values, lowest rod margin, emergencies handled and time in danger.

**How to Play:** rewrite the physics section around the red-card / blue-card explanation so the manual teaches the same model the game uses. Include: removing a blue card raises radioactivity; power output only follows through heat and steam; rods take time to move; the graphite tips, and why rods shouldn't be parked at 0%; xenon burn-off speeding up as radioactivity rises; the ±10% tolerance; identical physics in every mode.

**Sound:** two groups, each with its own on/off switch in the sound modal, and one shared volume:
- **Alarms**, labelled "Recommended for new operators": the alarms that sound while a warning or an emergency event lasts. These exist today.
- **Sound effects**, labelled "Recommended": every other sound:
  - the reactor hum (exists today);
  - one-off confirmation sounds when rod, pump and turbine changes are applied;
  - a rod-drive sound while rods travel: one per moving rod, up to three, started a split second apart, once the confirmation sound has played. Each fades out as its rod arrives;
  - a distinct AZ-5 sound;
  - a short computer bleep when a new warning appears on the alarm monitor. It plays alongside that warning's alarm, not instead of it;
  - a teleprinter printing sound when a new message arrives in the shift log, lasting only a few seconds.
- Nothing plays while the game is paused or after the shift has ended. The switches keep their setting for when play resumes.
- The owner provides the clips, since an AI agent can't listen to audio, and the agent wires them in. Pixabay is a good source, like the existing sounds (credited in the README); useful searches: "relay click", "heavy switch", "electric motor loop", "emergency button", "teleprinter", "computer beep". Sounds generated in code (Web Audio API) only where no clip is suitable.
- Every sound must work on the Vercel deployment. New clips go in the repo's `public/` folder; the existing sounds can keep loading from the Vercel storage URLs they use today (their originals are in git history at commit 210215f).

---

## 16. Where nonlinear / exponential behaviour belongs

A one-page summary of Sections 5–10.

| Relationship | Behaviour | Why |
|---|---|---|
| Radioactivity growth/decay | **Exponential** (rate ∝ current level × net red-minus-blue balance); slow for a balance under 10 points, fast for every point beyond (prompt) | This is how reactors behave. It's the source of runaways and collapses; the slow range makes creeps gentle and visible, the fast range keeps AZ-5 and big rod moves dangerous. |
| Steam's push (void) | **Proportional** to the amount of steam in the core; no hidden amplifiers | Readable. The danger comes from the loop (radioactivity → heat → steam → radioactivity), not from a secret multiplier. |
| Steam formation | Driven by reactor temperature above boiling, never directly by fuel; flow changes it directly only below one pump, and **sharply nonlinearly** as flow falls toward zero (boiling escalation) | Preserves the all-pumps-off escalation; low flow is what turns a runaway into an explosion rather than a meltdown. |
| Rod (boron) effect | **Linear** in insertion, the same at every depth | It's the amount of boron that matters; the display reads honestly. |
| Graphite tip | **Fixed push** per rod while its tip is in the core, equal to the boron in the first 10% of travel | Spike only from 0%, lasting about 2 s; grows with rods entering together; lethal only in a fragile state. |
| Rod movement | **Constant travel speed** (~18 s full stroke), the same in every mode | Rods are not instant brakes. |
| Rod margin | **Not a physics rule**: a warning threshold on total insertion | Names the dangerous state without hidden effects. |
| Xenon effect | **Proportional** to the xenon level (a blue card) | Simple and readable. |
| Xenon build-up | **Gradual**: at or below radioactivity 80, minutes to the cap, faster the lower it is; 0% in normal running | Slow, ominous, readable. |
| Xenon burn-off | **Accelerates with radioactivity** from 80 up to 120 (a full load in ~40 s), then **fastest** from 130 (~10 s, capped) | Removing a brake as radioactivity rises feeds the rise; the escape must be caught early, and can be. The cap keeps the loss visible and within what the rods can answer. |
| Fuel temperature effect | **Continuous curve, 0 at normal running temperature**: a mild brake when hotter than normal, firming a little when very hot but always weaker than the steam that comes with it, and levelling off beyond ~2,000°; a push when cooler, strongest when very cold | Slows a runaway without ever stopping it (only rods and pumps do); restart lever; a healthy reactor reads 0. |
| Fuel / reactor temperature | **Lagged heat balance** (not exponential) | Fast only because radioactivity is fast. |
| Pump cooling | **Proportional** to flow and temperature, diminishing per extra pump; flow ramps over a few seconds | Physical, readable. |
| Power output from steam | **Linear** | Keeps targets predictable. |

---

## 17. Suggested delivery order

1. Reactor core model (Sections 5, 6, 7, 9, 16) together, in Free mode first, with acceptance invariants checked.
2. Control rods (10) and steam/turbine-powered pumps (8).
3. Explosion ending and mode-menu wording (11).
4. Events and targets rebalance (12, 13), tuned with playtests of full Easy and Hard shifts.
5. Safety Test mode (14).
6. Presentation (15), which can run in parallel with steps 2–5 since it does not touch mechanics.

The rod modal interface fixes (Section 10, item 5) touch no mechanics and can be done at any time.
