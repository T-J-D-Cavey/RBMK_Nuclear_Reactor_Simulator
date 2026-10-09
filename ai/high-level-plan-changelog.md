# High-Level Plan – Change Log

Why [high-level-plan.md](high-level-plan.md) changed between drafts. The plan only describes what we're building; this file keeps the reasoning so the plan can stay short. Nothing here is an instruction.

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
