# R B M K - Nuclear Reactor Simulation

Manage a nuclear reactor in real-time. Control the forces involved to meet power targets and avoid a nuclear disaster. [Open the Simulation here](https://rbmk-simulator.vercel.app/)

## Objective

You are the reactor control engineer on Unit 4. Deliver the power output the grid asks for, and keep the reactor away from its two ways to fail: a meltdown (reactor temperature too high) and a core explosion (too much steam).

## Game modes

The reactor obeys the same physics in every mode. Modes differ only in workload.

- **Easy:** 15 minute shift, about one major emergency, smaller and less frequent power target changes.
- **Hard:** 30 minute shift, about three major emergencies, larger and more frequent power target changes.
- **Free (sandbox):** no targets, no events, unlimited time.
- **Safety Test:** a scripted, 20 minute recreation of the night of the Unit 4 turbine rundown test (25–26 April 1986). Orders come from the test supervisor, the Deputy Chief Engineer and the Kiev grid controller.

## How the reactor works: red cards and blue cards

Radioactivity (the fission level) changes in proportion to itself. Every second, the balance of "cards" in play sets how fast it grows or shrinks:

- **Red cards (push up):** steam in the core (the positive void coefficient), graphite rod tips in the core, fuel cooler than normal (strongly when very cold).
- **Blue cards (push down):** boron in the control rods, xenon, fuel hotter than normal (a mild brake).

Removing a blue card raises radioactivity as surely as playing a red one: pulling rods out, or xenon burning off.

The core loop: radioactivity heats the fuel, the fuel heats the reactor, the hot reactor boils water into steam, and steam pushes radioactivity up. Left alone, a rise feeds itself to disaster and a fall feeds itself into the xenon pit. Hot fuel slows a rise but never stops it, and beyond about 2,000° it stops slowing it at all; only rods and pumps stop it.

Power output is steam × 50 MW while the turbine is on the grid, so it follows radioactivity only through heat and steam, with a delay.

## Controls

**Control rods (×10).** Drag the levers to order new positions. Rods travel at a steady speed (about 18 s for a full stroke); the panel shows where each rod actually is. Every 1% of insertion is the same amount of boron at any depth. The rod margin (total insertion of all ten rods, out of 1,000) should stay above 200.

**Graphite tips.** A rod at 0% has its graphite tip out of the core. Moving it off 0% puts the tip in, pushing radioactivity up for about 2 seconds before the boron takes over. Rods at 1% or more never spike, so don't park rods at 0%.

**AZ-5.** One press drives every rod that isn't jammed to 100% at rod speed. Safe from a normal state; deadly with many rods at 0%, high steam and little flow.

**Water pumps (×4).** A pump moves water when it is ON and powered, and flow takes a few seconds to change. More pumps cool the reactor, slowly lowering steam and radioactivity over minutes; with no flow at all the water boils far more readily. One pump left alone runs away; no pumps at all ends in a steam explosion.

**Turbine.** On the grid it turns steam into power output. Disconnected, it can supply the station pumps during a power cut: more steam powers more pumps, and output is 0 meanwhile. Sustained over-pressure trips the turbine off the grid.

## Xenon

Xenon reads 0% in normal running. At radioactivity 80 or lower it builds, faster the lower radioactivity goes; above 80 it burns off, slowly at first, faster by 100 and fastest from 120. To climb out of the xenon pit, pull rods (nearly) all out and let the fuel cool, then catch the rise by re-inserting rods as the xenon clears.

## Performance

Stay within ±10% of the power target (never tighter than ±200 MW) and performance rises by 1% every 5 seconds; outside it falls at the same rate. The grid controller warns of a target change 60 seconds before confirming the new target.

## Shift events (Easy and Hard)

- **Power cut** (major): the pumps lose their mains supply. Grid instability is reported first.
- **Control rod jam** (major): several rods freeze where they are, even mid-travel.
- **Pump trip:** one running pump fails for a while.
- **Grid hold:** hold output at the target with half the usual tolerance.
- **Turbine trip:** a consequence of sustained over-pressure, never random.

## Game over

1. **Meltdown:** reactor temperature reaches 1200°.
2. **Core explosion:** steam reaches 600.
3. **Removed from post:** performance drops to 0% (Easy, Hard and the Safety Test).

## Development

The reactor physics live in `lib/sim/` and run headlessly for testing (Node 24, no extra installs):

- `node --run sim:test` runs the design's acceptance checks (physics, events, targets, Safety Test).
- `node --run sim:trace -- <scenario>` prints a second-by-second trace of a physics scenario.
- `node --run sim:shift` plays hands-off Easy, Hard and Safety Test games through the real game loop.
- `npx tsc --noEmit -p .` is the type check (the build ignores type errors).

Design documents are in `ai/`.

## Still to come

- One-off sounds when rod, pump and turbine changes are applied, a rod-drive sound while rods travel, and a distinct AZ-5 sound.

## Acceditations

Sound effects and 'control room' image obtained from [Pixabay](https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=80493)
