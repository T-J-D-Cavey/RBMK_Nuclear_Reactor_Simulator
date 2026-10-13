# Mechanics review: a clean-slate look (2026-10-13)

Written for the owner. Ignores the bible's rules on purpose and asks a single question: what reactor model makes the most fun game that is grounded in fission and recognisable from the show's explanation? Every claim below was tested on a scratch copy of the engine. The repo's physics was not changed.

## Round 2: the owner's questions (same day)

### A correction first

In chat I said that after a rod insertion "the needle would creep red over minutes as the steam loop takes over". **That was wrong for an insertion from steady running.** After an insertion, steam *falls*, and less steam pushes radioactivity further *down*. Steam keeps rising after an insertion only when the reactor was already heating up, as at the game start: the reactor temperature lags behind the fuel, so it carries on rising for a while.

### What a rod insertion really does (card by card)

Change in each card since the move. "Net" is the whole balance; while it's near 0, radioactivity holds still.

**A. Steady running at 100, rod 1 in 5%:**

| Time | Radioactivity | Rods | Fuel | Steam | Xenon | Net |
|---|---|---|---|---|---|---|
| 5 s | 92 | −2.5 | +1.3 | 0 | 0 | −1.2 |
| 10 s | 89 | −2.5 | +2.6 | −0.3 | −0.1 | −0.2 |
| 30 s | 87 | −2.5 | +4.2 | −1.7 | −0.3 | −0.3 |
| 60 s | 80 | −2.5 | +7.1 | −4.2 | −0.8 | −0.4 |
| 120 s | 61 | −2.5 | +15.7 | −11.6 | −2.3 | −0.7 |

**B. The game start after 2 min (climbing, 222), rods 1–3 in 10% each:**

| Time | Radioactivity | Rods | Fuel | Steam | Net |
|---|---|---|---|---|---|
| 5 s | 151 | −15 | +9.9 | +2.0 | −2.8 |
| 30 s | 170 | −15 | +10.9 | +3.8 | +0.1 |
| 120 s | 186 | −15 | +2.1 | +12.7 | +0.1 |
| 600 s | 330 | −15 | −101.6 | +116.2 | +0.1 |

**What this shows.** "Settles at a lower level" is exactly what happens, and the fuel card is what does it. In every row the net balance sits near 0, because the fuel card cancels whatever the rods and steam add up to. In A, the slow drift afterwards is downward: steam and xenon fall away. In B, it's upward, because the reactor was still heating from before the move.

### The owner's idea: fuel acts only when very cold or very hot

The trial copy has no fuel effect between 250° and 1,300°, and today's effect outside that band.

| Rod 1 in 5% from steady 100: radioactivity at 10 / 30 / 60 / 120 s | |
|---|---|
| Today | 89 / 87 / 80 / 61 |
| No fuel effect in the middle | 78 / 28 / 0 / 0 |
| No fuel effect in the middle, rods twice as strong | 61 / 4 / 0 / 0 |

- With nothing in the middle band to push back, the rod's −2.5 just stays. Radioactivity keeps falling, and the falling steam speeds it up. It never settles.
- The other way, 1% out melts down after 102 s, and the climbing game start melts down within 2 minutes.
- **Stronger rods don't help.** Rod strength only sets how big one move is. Whether the reactor settles depends on cards that *respond to* radioactivity. In the show's list, the only responder is steam, and it responds in the same direction as the change (more radioactivity → more steam → more radioactivity). So nothing in the show's list can make it settle. In a real RBMK the responder that pushes the other way is the fuel (the Doppler effect).

### The owner's cold-restart experiment, and the xenon idea

**Set-up:** all rods in and four pumps until everything is cold (fuel 9°, xenon 100%), then the rods are pulled out.

| Rods pulled to | Today | Owner's xenon curve (builds ≤80; burns from 80, faster with radioactivity) |
|---|---|---|
| 0–11% | surges past 100 in ~23 s; left alone, meltdown at 76–84 s | the same |
| **12%** | **stalls at 45–90 for 11 min**, until the reactor makes steam; then surges (the owner's experience) | escapes at 30 s; left alone, meltdown at 88 s |
| 13–15% | stalls at 20–30 indefinitely with four pumps (the reactor never reaches boiling) | the same: the stall is below 80 |
| Any of these, with rods to 40% or AZ-5 three seconds after it passes 100 | survives (peak 100–184) | survives |

- **The real problem is a knife edge:** 11% surges, 12% stalls for 11 minutes, 13% stalls forever.
- The owner's curve removes the long stall at 12%, but it can't help a reactor stuck below 80.
- In every version a prompt response saves the surge. Capping how fast xenon can burn (1 %/s) gives a player who isn't watching about 40 s longer before meltdown (meltdown at ~120 s instead of ~76 s).

**The owner's xenon curve across the whole game:**

| | Today | Owner's curve | Owner's curve, build halved (0.2 %/s at 0) |
|---|---|---|---|
| Rod 1 in 5% from 100: 60 / 120 s | 80 / 61 | 84 / 71 | 84 / 73 |
| Rods, start, pumps, AZ-5, pump loss | — | unchanged | unchanged |
| Bot shifts lost, Hard, acting every 3 / 10 / 20 s | 1 / 2 / 8 | 1 / 4 / 16 | 0 / 3 / 10 |
| Bot shifts lost, Easy, acting every 20 s | 0 | 2 | 1 |
| Highest xenon in 10 Hard bot shifts | 31% | 80% | 37% |
| Safety Test xenon at 6:15 / 9:00 / 12:00 | 39 / 67 / 90% | 65 / 100 / 100% | 30 / 49 / 68% |
| Checks | 53 / 53 | 52 / 53 | 51 / 53 |

- **What's good about it:** one simple threshold (80) instead of today's creep below 100, build below 50 and burn above 100. Insertions slide more slowly, so "settles lower" lasts longer. And no 11-minute stall at 12%.
- **The cost:** at the full build rate, low output poisons the reactor much faster, and Hard becomes much harder for slow players (16 of 20 lost when acting every 20 s).
- At half the build rate, Hard is about as today, but the Safety Test loses its xenon pressure: the rod margin no longer has to drop below 200 (that check fails).
- **A build rate around 0.3 %/s should sit between the two.** Pick it with the Safety Test check, then confirm in play.
- The failing §9 check measures today's thresholds, so it would be rewritten for the new rule.

### Round 2 recommendation

1. **Keep the fuel effect.** It's what makes a rod move settle, the behaviour the owner described and likes. Removing it in the middle band makes every move a slide to zero or a runaway.
2. **Try the owner's xenon curve**, at a build rate of about 0.3 %/s, plus a burn-off cap of about 1 %/s. It's a simpler rule and removes the long restart stall. Build it as its own physics step.
3. Still recommended from round 1: the balance needle on the panel and the prompt-critical threshold.

---

## Round 1

### Short answer

- **Don't weaken the fuel effect, and don't trade it against steam.** It is the reason rods feel like a throttle and the reason the game is playable at all. A reactor with only the show's cards (no fuel effect) was unplayable in every version I tried: noise alone melts it down, and even a bot that reacts every 3 seconds loses 14–20 shifts out of 20.
- **The confusion is a readability problem, not a physics problem.** The fuel effect is invisible: the player moves a rod, sees radioactivity drop and stop, and has no way to see why. Fix that by putting Legasov's balance on the panel (a red/blue "reactivity" needle), and by naming the card in How to Play ("the fuel fights back").
- **One physics change is worth making: a prompt-critical threshold.** Small imbalances behave exactly as today; big ones (AZ-5 tips, xenon burning off, steam surging) act much faster. In tests, normal play was unchanged to the last digit, and the AZ-5 trap became much more show-like (spike ×1.58, was ×1.30).

### What makes this game fun (the yardstick I used)

1. **Your moves do what you expect, at once.** A rod in means radioactivity down, visibly, within seconds.
2. **Neglect bites.** Left alone, the reactor drifts away and the drift speeds up (the steam loop). The player must keep returning to the controls.
3. **Mistakes stack up into the show's disaster.** Rods pulled out, low flow, xenon waiting to burn off: each removes a safety margin, and the last straw (AZ-5 tips, the test) turns into a disaster in seconds.
4. **You can always read why.** Cause and effect are visible on the panel.
5. **A competent human can keep up**, including a phone player who glances at the panel every 10–20 s.

### How the reactor behaves today, and why rods "level off"

Today, radioactivity's rate of change is set by the sum of the cards. Two of them answer to radioactivity itself:
- **Fuel (fast, seconds):** cooler fuel pushes radioactivity up and hotter fuel pushes it down. Fuel temperature follows radioactivity within about 3 seconds.
- **Steam (slow, minutes):** more steam pushes radioactivity up. Steam follows the *reactor* temperature, which takes minutes to move.

**Rod 1 in 5% from normal running** (the cards, in points):

| Time | Rod (boron) | Fuel card | Steam card | Xenon | Net | Radioactivity |
|---|---|---|---|---|---|---|
| 0 s | −2.5 | 0 | 0 | 0 | −2.5 | 100 |
| 3 s | −2.5 | +0.6 | 0 | 0 | −1.9 | 94 |
| 10 s | −2.5 | +2.6 | −0.3 | −0.1 | −0.2 | 89 |
| 30 s | −2.5 | +4.2 | −1.7 | −0.3 | −0.3 | 87 |
| 120 s | −2.5 | +15.7 | −11.6 | −2.3 | −0.7 | 61 |

Within 10 seconds the fuel cancels the rod, so radioactivity stops falling. That's the level-off you saw. Over the next minutes the steam card catches up and the fall resumes. From a hotter state (radioactivity 150–200, common on Hard) the fuel more than cancels the rod, and the climb carries on after a small dip.

This "fast stop, slow drift" is a real feature of reactors. It's also what makes rods work as a throttle: one move sets a new level, not a new speed. The trouble is that nothing on the panel shows it happening.

### The clean-slate test: a reactor with only the show's cards

In the show, Legasov's cards are boron rods, xenon, water and steam, and graphite. There's no fuel temperature. So I removed the fuel effect entirely and tried to make that reactor playable:

- **M1:** no fuel card. The steam card is halved (0.6 → 0.3). Small imbalances act 8× slower than today (like delayed neutrons), and beyond 25 points they act fast (prompt critical). The start offsets are shrunk so the opening isn't instantly fatal.
- **M2:** the same, with the steam card at a quarter (0.15).

| | Today | M1 | M2 |
|---|---|---|---|
| Rod 1 out 1%, left alone | creeps: 106 at 2 min, 166 at 10 min | meltdown at 3.7 min | meltdown at 5 min |
| Rod 1 in 5%, left alone | 89 at 10 s, 61 at 2 min, 0 by 5 min | 98 / 53 / 0 | 98 / 61 / 0 |
| Balanced, noise only, 15 min (6 seeds) | wanders between 0 and 313, no endings | **5 of 6 melt down** | **5 of 6 melt down** |
| Hands-off start: meltdown | 7 min | 3.2 min | 3.8 min |
| 1 pump left alone: meltdown | 4.7 min | 2.1 min | 3.1 min |
| Bot, Easy, acting every 3 s: shifts lost | 0 / 20 | **15 / 20** | **14 / 20** |
| Bot, Hard, acting every 3 s | 1 / 20 | 20 / 20 | 20 / 20 |
| Bot, Easy / Hard, acting every 20 s | 0 / 8 | 20 / 20 | 20 / 20 |
| Safety Test bot (every response) | survives with rods or AZ-5 | removed from post | removed from post |

Without a fast stabiliser, every small error grows, and it grows faster the bigger it gets. The steam loop compounds it, and the player is the only brake. The bot measures the rate of change every few seconds and still can't hold it. A human reacting every 10–20 s on a phone would do worse.

**Why the show leaves it out.** Legasov explains the *accident*, and on that night the stabilisers were gone: the fuel was cold, the power low and the flow high, so the steam (void) effect dominated. In normal running a real RBMK is held steady mainly by the fuel effect (Doppler broadening). Keeping it isn't a betrayal of the show; it's the part of the science the show didn't need.

### What I recommend

**1. Keep the fuel effect as it is.** Drop the "weaken mid-range fuel" idea, including the ×0.75 and ×0.5 proposals from earlier today. Weakening it either makes the reactor run away much faster or forces steam down with it, and then the show's main red card shrinks. Neither makes the game better.

**2. Show the balance (Legasov's scales) on the panel.** UI only, with no physics change. A horizontal needle centred on zero: blue to the left (falling), red to the right (rising), with the scale compressed at the ends. It shows the net balance the engine already computes (`getReactivityCards(...).total`).
   - The player sees the needle jump blue when a rod goes in and return to the centre as the fuel answers. That explains the level-off in one glance. When the needle creeps red over minutes, the steam loop is taking over.
   - It's the show's metaphor made literal, and it's like the period meter real control rooms have.
   - Optional: a tooltip or long-press listing the cards and their sizes (rods, steam, fuel, xenon, tips).
   - It is a new player-facing gauge (the bible currently forbids those, §2), so it's your call.

**3. Teach it in one line.** How to Play gets a blue card "The fuel fights back: when radioactivity falls the fuel cools and pushes it back up, so a rod move gives a step, not a slide. Over minutes the steam decides where it goes next."

**4. Add a prompt-critical threshold** (a small engine change). Below a balance of about 20 points nothing changes. Beyond it, the excess acts 4× faster. This is the real physics of Chernobyl: the reactor went prompt critical.

| | Today | Threshold at 30 | **Threshold at 20** |
|---|---|---|---|
| Rod moves, start, drift, pumps, pump loss | — | identical to today | identical to today |
| AZ-5 trap (rods 1–8 at 0%, one pump, steam 250): spike | ×1.30 | ×1.37 | **×1.58** |
| AZ-5 from normal: radioactivity after 2 s | 57 | 37 | 24 |
| Xenon-pit restart: passes 50 after | 25 s | 19 s | 19 s |
| Bot shifts lost, Easy / Hard, every 3 s | 0 / 1 | 0 / 1 | 0 / 1 |
| Bot shifts lost, Hard, every 20 s | 8 | 9 | 7 |
| Safety Test bot: rods / AZ-5 / late AZ-5 / ignored | survive / explodes | same | same |
| Checks | 53 / 53 | 52 / 53 | 52 / 53 |

The one failing check is a set-up problem: the rod-travel test starts with every rod out, and that reactor now ends before the rods finish moving. Fix the set-up, not the check.

**5. Keep the planned 8a items** (bigger Hard targets and the event mix). They're the right fix for "passive". The reactor already demands attention: with the bot reacting only every 20 s, Hard is lost 8 times in 20 today.

### Other honest observations

- **The second phase of a rod move is the real learning curve:** "it levelled, then minutes later it's drifting". The needle (2) is the cheapest way to teach it. A small trend arrow on the radioactivity readout (▲▼ for the last 10 s) would also help.
- **The end-of-runaway numbers** (radioactivity pinned at 50,000, fuel at tens of thousands of degrees) look broken rather than dramatic. Consider clamping the display (e.g. "OFF SCALE") and the incident report.
- **Losing every pump from a hot state** explodes in about 20 s, short of the 30–60 s that gives a player time to respond. Still open from §8 Q2.
- **The shape of the fuel effect** (mild, firmer from 1,300°, capped at 2,000°) is more detail than a player can learn, but it isn't what confuses: in normal play only the mild part is ever in use. Leave it.

### How this was tested

- Scratch copy of `lib/` and `scripts/` with switches for: no fuel card, steam strength, the slow/fast (delayed/prompt) split, and start offsets. The repo was untouched.
- **Measurements:** rod steps from the balanced state; the hands-off start; noise-only drift over 15 min on 6 seeds; pump changes; AZ-5 from normal and from the trap set-up; the owner's xenon-pit restart replay. Then 20 bot-played Easy and Hard shifts at reaction intervals of 3, 10 and 20 s, the Safety Test with four bot responses, and the 53 acceptance checks.
- **Caveat:** the bot is a stand-in for a player. It reads only the panel, but it measures the rate of change precisely every few seconds, so a real person will do worse than it does, not better.
