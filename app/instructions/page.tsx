import Link from "next/link"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { XIcon } from "lucide-react"
import { GAME_MODE_CONFIGS, THRESHOLDS, type GameMode } from "@/lib/types"
import { EVENT_TUNING, MAINTENANCE_TUNING, TUNING } from "@/lib/sim/tuning"
import { MODE_MENU, MODE_MENU_TAGLINE } from "@/lib/mode-menu"
import { BASE_OPEN_GRAPH } from "@/lib/site"
import ManualInduction from "@/components/manual-induction"
import ManualSections, { type ManualSection } from "@/components/manual-sections"

// The tab reads "How to Play | RBMK Nuclear Reactor Simulation"; link previews get the longer title
const MANUAL_TITLE = "How to Play: RBMK Reactor Operating Manual"
const MANUAL_DESCRIPTION =
  "How to play the RBMK reactor simulation: an induction to the red and blue reactivity cards and how a shift ends, then the game modes, the grid's power targets, shift emergencies, warning signs, bad habits, getting out of trouble with AZ-5, and the real night of 26 April 1986."

export const metadata: Metadata = {
  title: "How to Play",
  description: MANUAL_DESCRIPTION,
  alternates: { canonical: "/instructions" },
  openGraph: { ...BASE_OPEN_GRAPH, url: "/instructions", title: MANUAL_TITLE, description: MANUAL_DESCRIPTION },
}

// A quick-start manual. It teaches the same model the game uses (bible §15): Legasov's red and blue
// cards. Numbers are read from the code, so they track tuning. The manual reads off a SKALA screen set into the panel,
// like the alarm monitor (owner, 2026-10-26: prototype A). The shift foreman from the briefing opens it as the
// player's induction, from the side of the screen as in the game (owner, 2026-11-09). His briefing and the machine
// panels' ? keys teach the desk and its controls, so the manual leaves those out.
//
// It is split into sections picked by clipboards (owner, 2026-11-09: option D). The Induction covers everything at a
// glance and is enough to play; the other sections are optional detail on the same subjects.
export default function InstructionsPage() {
  const controlRoomBackground = "control_room_background.jpg"
  const t = THRESHOLDS
  const margin = Math.round(t.powerTolerance.fraction * 100)
  const m = MAINTENANCE_TUNING
  const minutes = (mode: GameMode) => (GAME_MODE_CONFIGS[mode].timeLimit ?? 0) / 60
  const [hotJamMin, hotJamMax] = EVENT_TUNING.hotFuelJamSeconds

  // What each line of the mode menu means, one per MODE_MENU spec and in its order. Still what to expect rather than
  // what will happen (lib/mode-menu.ts): no event counts or target sizes.
  const modeDetails: Record<GameMode, ReactNode[]> = {
    easy: [
      <>A {minutes("easy")}-minute shift. Get to the end of it and you&apos;ve survived.</>,
      <>
        The grid&apos;s targets still move by big steps, but over a narrower range than Hard, and once you&apos;re on
        target it gives you longer before the next change.
      </>,
      <>A few shift emergencies, never the same kind twice, and milder ones: shorter power cuts and smaller rod jams.</>,
    ],
    hard: [
      <>A {minutes("hard")}-minute shift: twice as long to hold it together, and the machines will need looking after more than once.</>,
      <>
        Bigger target changes over a wider range, down to low outputs where xenon builds. Once you reach a target, the
        next change comes sooner.
      </>,
      <>Every kind of shift emergency, and each lasts longer: longer power cuts and signal losses, and rod jams that take more rods.</>,
    ],
    safety_test: [
      <>
        A scripted {minutes("safety_test")}-minute shift. The station takes the reactor down to low output to test whether
        the turbine, coasting to a stop, can keep the pumps running after a loss of station power.
      </>,
      <>
        The orders print on the shift log with their new target, and your performance counts against them as usual. Some
        orders work the controls for you, and you can undo any of them. There are no random emergencies.
      </>,
      <>The test exposes whatever state you let the reactor slip into on the way down. Reach the end with it in one piece.</>,
    ],
    free: [
      <>No clock. Play for as long as you like.</>,
      <>
        No power targets, no performance to lose and no shift emergencies. The reactor can still melt down or explode,
        though.
      </>,
      <>
        The same reactor as every other mode, so try things out and watch Legasov&apos;s cards answer. The machines still
        wear, so it&apos;s a good place to practise the habits below.
      </>,
    ],
  }

  const sections: ManualSection[] = [
    {
      id: "induction",
      title: "Induction",
      content: (
        <Section number="01" title="Induction">
          <p>
            You&apos;re in charge of the reactor in Unit 4 of the Chernobyl Nuclear Power Station. Manage the nuclear fission
            reactor so that stable radioactivity levels create steam that turns a turbine and makes electricity for the grid.
            Simple, right? Just make sure to avoid a <Inverse>meltdown</Inverse> and a <Inverse>core explosion</Inverse> and
            handle any unexpected events along the way...
          </p>

          <SubHeading>What drives the reactor</SubHeading>
          <p>Our comrade Legasov explains nuclear power as the invisible dance between things (red cards) that push radioactivity up, and things (blue cards) that pull it down. All your efforts go towards achieving balance between these forces:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="ws5-manual-box ws5-manual-box-dashed">
              <h4 className="mb-2 text-[1.13em] uppercase tracking-[0.06em]">▲ Red cards: push it up</h4>
              <ul className="ws5-manual-list">
                <li>Uranium-235 fuel, especially when cold</li>
                <li>Steam in the system</li>
                <li>Graphite in the tips of the control rods</li>
              </ul>
            </div>
            <div className="ws5-manual-box ws5-manual-box-dashed">
              <h4 className="mb-2 text-[1.13em] uppercase tracking-[0.06em]">▼ Blue cards: pull it down</h4>
              <ul className="ws5-manual-list">
                <li>Boron in the control rods</li>
                <li>Xenon in the core</li>
                <li>Hot fuel</li>
              </ul>
            </div>
          </div>

          <SubHeading>How you keep the balance</SubHeading>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Control rods:</Inverse> your brakes. Push rods into the core and their boron drags radioactivity down; pull
              them out of the core and radioactivity climbs. They take a few seconds to travel, and their effect builds over time, so make a small move and watch what it does.
            </li>
            <li>
              <Inverse>Water pumps:</Inverse> more pumps carry more heat away from the core, so there&apos;s less steam pushing radioactivity up.
              Fewer pumps leave more steam, and radioactivity climbs.
              The catch: steam is also what makes your power. With more pumps running you need more
              radioactivity for the same output, so the rods and pumps work together.
            </li>
            <li>
              <Inverse>AZ-5:</Inverse> the emergency button. It drives every rod into the core, for when the levers can&apos;t
              catch a runaway. It isn&apos;t instant, and with most rods pulled right out it makes things worse before it
              makes them better. Getting Out of Trouble explains when to press it.
            </li>
          </ul>

          <SubHeading>Power output and performance</SubHeading>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Power output:</Inverse> steam spins the turbine, and the turbine sends power to the grid when it&apos;s connected.
            </li>
            <li>
              <Inverse>Targets:</Inverse> most of the time you will have a power target to work towards, usually provided by a
              grid controller. Being within ±{margin}% of the target is good enough.
            </li>
            <li>
              <Inverse>Performance:</Inverse> it climbs while you&apos;re on target and falls while you&apos;re off it. If it
              reaches 0%, you&apos;re removed from your post. That&apos;s a polite way of saying you will be sacked!
            </li>
          </ul>

          <SubHeading>What happens in a shift</SubHeading>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Changing demand:</Inverse> the grid&apos;s target changes throughout a shift and you need to make adjustments to stay on target. 
            </li>
            <li>
              <Inverse>Shift emergencies:</Inverse> things go wrong during a shift and you need to handle them.
            </li>
            <li>
              <Inverse>Warning signs:</Inverse> the alarm monitor tells you when the reactor is drifting into trouble, and
              what to do about it. Bad habits catch up with you too, if you let them.
            </li>
          </ul>

          <div className="ws5-manual-box ws5-manual-box-double ws5-manual-blink !px-4 !py-4 sm:!px-6 sm:!py-5 flex flex-col gap-3.5">
            <SubHeading>Game over</SubHeading>
            <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
              <li>
                <Inverse>Meltdown:</Inverse> reactor temperature reaches {t.reactorTemp.meltdown}°.
              </li>
              <li>
                <Inverse>Core explosion:</Inverse> steam volume reaches {t.steamVolume.explosion}.
              </li>
              <li>
                <Inverse>Removed from post:</Inverse> your performance against the power targets reaches 0%.
              </li>
            </ul>
            <p>Avoid all of this and you&apos;ll survive your shift when the clock runs out.</p>
          </div>

          <p>
            That&apos;s all you need for your first shift. The other sections go into more detail if you want it; otherwise,
            press Leave Training. <Cursor />
          </p>
        </Section>
      ),
    },
    {
      id: "modes",
      title: "Game Modes",
      content: (
        <Section number="02" title="Game Modes">
          {/* Same wording as the mode menu (lib/mode-menu.ts) */}
          <p>{MODE_MENU_TAGLINE}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODE_MENU.map(({ mode, name, specs }) => (
              <div key={mode} className="ws5-manual-box">
                <h3 className="mb-1.5 text-[1.13em] uppercase tracking-[0.08em]">■ {name}</h3>
                <ul className="ws5-manual-list flex flex-col gap-2.5">
                  {specs.map((spec, i) => (
                    <li key={spec}>
                      <Inverse>{spec}</Inverse>
                      <span className="block mt-1">{modeDetails[mode][i]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p>
            New to the desk? Start with Free Mode to learn how the reactor answers, or Easy for your first real shift.
          </p>
          <p>
            However a shift ends, you get a shift report: your final performance, your highest and lowest output, the peaks
            of radioactivity, reactor temperature and steam, your lowest rod margin, the emergencies you handled and your
            time in danger, counted while radioactivity, reactor temperature or steam is triggering high level warnings.<Cursor />
          </p>
        </Section>
      ),
    },
    {
      id: "targets",
      title: "Power Targets",
      content: (
        <Section number="03" title="Power Targets">
          <p>
            On Easy and Hard the grid sets a target and you have ±{margin}% either side of it, never less than ±
            {t.powerTolerance.minimum} MW. Inside it your performance climbs; outside it falls, and at 0% you&apos;re removed
            from your post. Power target changes can be big or small. Be prepared to drive the reactor hard with the rods and
            pumps to keep up.
          </p>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Chasing a target:</Inverse> to raise output, withdraw rods or run fewer pumps; to lower it, insert rods
              or run more. Output lags behind radioactivity, as the heat and steam take time to build or fade, so start
              early and ease off before you arrive, or you&apos;ll overshoot.
            </li>
            <li>
              <Inverse>Notice:</Inverse> the grid warns you a change is coming via the shift log, then sets the new target{" "}
              {EVENT_TUNING.targetNotice} seconds later. You won&apos;t know how big it is, or which way, until then.
            </li>
            <li>
              <Inverse>Holding a target:</Inverse> the next notice only comes once you&apos;ve held the target without a
              break for a while, so reaching a target buys you time. A target you haven&apos;t reached and held after{" "}
              {EVENT_TUNING.easy.giveUpSeconds / 60} minutes is moved on anyway, and no notice comes in the last{" "}
              {EVENT_TUNING.easy.lastNoticeBefore / 60} minutes of a shift.
            </li>
            <li>
              <Inverse>Grid over-supplied:</Inverse> once a shift the grid asks for 0 MW. Disconnect the turbine, keep the
              reactor ready, and reconnect when the next target comes.
            </li>
            <li>
              <Inverse>Unit 1&apos;s safety test:</Inverse> once a shift Unit 1 asks you to cover its output with{" "}
              {EVENT_TUNING.unit1TestTarget.toLocaleString("en-GB")} MW, far above the grid&apos;s usual targets. That takes
              a lot of steam, close to the high-steam warning and closer still with a poor vacuum, so run the air ejector
              first and ease up to it, or the turbine trips.
            </li>
            <li>
              <Inverse>Low targets and xenon:</Inverse> low output means low radioactivity. Below {TUNING.xenonTurnover} the core
              can&apos;t burn off xenon, so it builds up and drags radioactivity down further. Withdrawing rods and cooling the
              fuel pulls you out, but once radioactivity rises the xenon, and the brake it was providing, can burn off quickly.
            </li>
          </ul>
        </Section>
      ),
    },
    {
      id: "emergencies",
      title: "Shift Emergencies",
      content: (
        <Section number="04" title="Shift Emergencies">
          <p>
            On Easy and Hard things go wrong during the shift, never two at once. The shift log warns you shortly before
            most of them, and each one clears by itself after a while.
          </p>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Power cut:</Inverse> the pumps lose their mains supply. Switch the turbine to Pumps to keep the water
              flowing: the more steam you have, the more pumps it can run. On Pumps your output to the grid is 0, so your
              performance falls while it&apos;s switched over. Switch back to Grid once the mains returns.
            </li>
            <li>
              <Inverse>Signal loss:</Inverse> the reactor hall&apos;s instruments go dark: radioactivity, the temperatures,
              steam, xenon, the camera, the chart recorder and Legasov&apos;s cards, and the alarm monitor can&apos;t see the
              reactor either. Power output, the target, the rods, the pumps, the turbine and the plant gauges still work, so
              steer by power output until the readings come back.
            </li>
            <li>
              <Inverse>Pump trip:</Inverse> one pump fails for a while, with no warning. Make sure enough powered pumps are
              turned on to keep the reactor from overheating.
            </li>
            <li>
              <Inverse>Rod jam:</Inverse> the shift log warns you about {EVENT_TUNING.warningLead["rod-stuck"]} seconds
              before, then some control rods freeze where they are, their channels pulsing red, until the fuel channel is
              repaired. You&apos;ll have to manage radioactivity levels with the remaining rods.
            </li>
          </ul>
        </Section>
      ),
    },
    {
      id: "warnings",
      title: "Warning Signs",
      content: (
        <Section number="05" title="Warning Signs">
          <p>
            The alarm monitor on the desk warns you when the reactor is out of balance and recommends how to correct it. Orders
            and news from the grid, the station and the leadership print on the shift log.
          </p>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Act now:</Inverse> reactor temperature over {t.reactorTemp.warning}°, steam volume over{" "}
              {t.steamVolume.highWarning}, radioactivity over {t.radioactivity.highWarning}, or fuel over{" "}
              {t.fuelTemp.highWarning.toLocaleString("en-GB")}°, which jams any slow rods.
            </li>
            <li>
              <Inverse>Turbine over-pressure:</Inverse> a countdown to a turbine trip. Get steam below{" "}
              {t.steamVolume.highWarning} before it runs out (see Bad Habits).
            </li>
            <li>
              <Inverse>Emergencies:</Inverse> a power cut, a pump trip, a signal loss and jammed rods each show their own
              warning for as long as they last.
            </li>
            <li>
              <Inverse>Rod margin:</Inverse> add up how far in each rod is. Below {t.rodMargin.minimum}% in total (all ten
              fully in would be 1,000%), the alarm warns of a low rod margin, the game&apos;s version of the real
              plant&apos;s 15-rod minimum. With so little boron in the core, radioactivity is being held down by something
              less reliable, often xenon, and when that burns off you have no brakes left.
            </li>
            <li>
              <Inverse>Watch:</Inverse> radioactivity down to {t.radioactivity.lowWarning}, xenon at {t.xenon.highWarning}% or
              more, fuel down to {t.fuelTemp.lowWarning}° (very cold fuel pushes radioactivity up), no steam at all (so no
              output), and performance under 10% after long periods off the grid&apos;s target.
            </li>
          </ul>
        </Section>
      ),
    },
    {
      id: "habits",
      title: "Bad Habits",
      content: (
        <Section number="06" title="Bad Habits">
          <p>
            Not everything that goes wrong is the shift&apos;s fault. These come from how you run the desk, in every mode. The
            machines sound no alarm as they wear: keep an eye on the plant gauges and the rod display, and the crew will
            report on the shift log when a gauge reaches its limit.
          </p>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Ignoring the vacuum:</Inverse> air leaks into the turbine&apos;s condenser, and over about{" "}
              {Math.round(m.vacuumFallSeconds / 60)} minutes the vacuum falls to its worst, costing up to{" "}
              {Math.round(m.vacuumOutputLoss * 100)}% of your output for the same steam. The air ejector clears it in{" "}
              {m.ejectorRecoverySeconds} seconds, and your output jumps as it does, so run it when you&apos;re short of the
              target rather than on it.
            </li>
            <li>
              <Inverse>Ignoring the pump balance:</Inverse> the cooling water drifts out of balance over about{" "}
              {Math.round(m.pumpDriftSeconds / 60)} minutes. The further the needle goes, the hotter the fuel runs, and hot
              fuel drags radioactivity down, so you end up pulling rods to hold your output. Rebalancing locks the pump
              switches and cuts cooling for about {m.balancerLockSeconds} seconds, then gives all that back as a rise in
              radioactivity, so do it in a calm moment and be ready to put some rod in.
            </li>
            <li>
              <Inverse>A lopsided core:</Inverse> rods 1–5 sit on the left of the core and 6–10 on the right. When one side
              carries more rod than the other, its boron counts for up to {Math.round(m.balanceEffect * 100)}% less, so the
              rods brake less than they appear to. The edge rods (1, 2, 9 and 10) tip the balance most.
            </li>
            <li>
              <Inverse>Parked rods:</Inverse> a rod left in the same place in the core for {m.rodParkSeconds / 60} minutes
              or more can go slow. Its channel pulses yellow and it takes{" "}
              {Math.round(TUNING.rodFullStrokeSeconds / m.slowRodSpeed)} seconds to travel the full stroke instead of{" "}
              {TUNING.rodFullStrokeSeconds}. Move it {m.rodFreeingMove}% either way to free it. Leave it, and if the fuel
              reaches {t.fuelTemp.highWarning.toLocaleString("en-GB")}° every slow rod jams for {hotJamMin}–{hotJamMax}{" "}
              seconds, just when you need them most.
            </li>
            <li>
              <Inverse>Running the steam high:</Inverse> let steam sit at {t.steamVolume.highWarning} or more for{" "}
              {EVENT_TUNING.turbineTripSeconds} seconds while you&apos;re on the grid, with the OVR-P lamp lit, and the
              over-pressure trips the turbine. Your output drops to nothing until you reconnect it, and reconnecting with the
              steam still high only trips it again, so bring the steam down first.
            </li>
            <li>
              <Inverse>Rods pulled right out:</Inverse> a rod at 0% has its graphite tip out of the core, so sending it back
              in pushes radioactivity up for a moment before its boron takes over. With steam at {t.steamVolume.highWarning}{" "}
              or more it jams with only the tip in, for the rest of the shift. That goes for AZ-5 too: pressed with most rods
              at 0% and the steam high, it can finish the reactor off. Rods parked at 1% or more avoid all of this.
            </li>
          </ul>
        </Section>
      ),
    },
    {
      id: "trouble",
      title: "Getting Out of Trouble",
      content: (
        <Section number="07" title="Getting Out of Trouble">
          <p>
            When the alarms go, act early, and in small steps if you can: the reactor answers big moves fast, and in both
            directions. These are the usual ways out.
          </p>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Runaway:</Inverse> radioactivity and steam climbing together, faster each second. Insert rods, several
              at once if you need to, and turn on any pumps that are off: more water means less steam pushing radioactivity
              up. Disconnecting the turbine saves it from tripping, but it won&apos;t bring the steam down.
            </li>
            <li>
              <Inverse>Overheating:</Inverse> reactor temperature over {t.reactorTemp.warning}° and heading for{" "}
              {t.reactorTemp.meltdown}°. Turn on every pump you can power, and switch the turbine to Pumps if the mains is
              down. Then bring radioactivity down with the rods: the heat follows it.
            </li>
            <li>
              <Inverse>Xenon pit:</Inverse> at low output, radioactivity sinks below {TUNING.xenonTurnover}, xenon builds and
              drags it lower still, and you pull more and more rod to fight it. To stay out, run more pumps at low targets:
              the same output then needs more radioactivity. To climb out, withdraw rods steadily, and as radioactivity
              passes {TUNING.xenonTurnover} be ready to put them back in, because the xenon burns off and its brake goes
              with it.
            </li>
            <li>
              <Inverse>AZ-5:</Inverse> the last resort, when the levers can&apos;t catch a runaway. It sends every rod that
              isn&apos;t jammed into the core at the usual rod speed, so it takes seconds, not an instant. From a normal state,
              with your rods parked at 1% or more, it always shuts the reactor down safely. With most rods at 0% their
              graphite tips push radioactivity up first, and with the steam high that push can be fatal.
            </li>
            <li>
              <Inverse>After AZ-5:</Inverse> the reactor is all but shut down, and your output goes with it. Withdraw rods
              carefully to bring it back, and expect xenon to fight you on the way up.
            </li>
          </ul>
        </Section>
      ),
    },
    {
      id: "history",
      title: "The Real Night",
      content: (
        <Section number="08" title="The Real Night">
          <p>
            The Safety Test follows the night Unit 4 was destroyed, 26 April 1986. Almost every trap in this manual was
            sprung that night, one after another.
          </p>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>The delay:</Inverse> on 25 April the station began reducing power for a test: could the turbine,
              coasting to a stop, keep the cooling pumps running after a loss of station power? The Kiev grid controller
              asked them to hold at half power for about ten more hours, and xenon built up in the core.
            </li>
            <li>
              <Inverse>The xenon pit:</Inverse> soon after midnight, during the shift change, power fell almost to nothing.
              To bring it back, the operators withdrew most of the control rods, far below the minimum the rules allowed.
            </li>
            <li>
              <Inverse>Extra pumps:</Inverse> more pumps were running for the test, so the water was cold and there was
              little steam. Radioactivity was held up by a core with almost every rod out.
            </li>
            <li>
              <Inverse>The test:</Inverse> at 01:23:04 the steam to the turbine was shut off. As the turbine ran down, so
              did the pumps it powered. The water boiled, and in this reactor more steam means more radioactivity.
            </li>
            <li>
              <Inverse>AZ-5:</Inverse> at 01:23:40 AZ-5 was pressed. The rods&apos; graphite tips entered first and pushed
              radioactivity up, the rods jammed part way in, and within seconds the steam tore the reactor apart.
            </li>
          </ul>
          <p>
            The game simplifies the plant: four pumps rather than eight, ten rods rather than 211, and minutes rather than
            hours. The red and blue cards, the traps and the order they come in are the same. <Cursor />
          </p>
        </Section>
      ),
    },
  ]

  return (
    <div className="relative min-h-screen px-3 py-5 sm:p-4 md:p-8 bg-black">
      {/* The control room stays put behind the manual (a fixed layer, which iOS honours; bg-fixed it does not) */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${controlRoomBackground})` }} aria-hidden="true" />
      {/* Same atmosphere as the home page: dark vignette + faint scanlines over the control room */}
      <div className="ws3-home-vignette fixed inset-0 pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-[960px] mx-auto">
        <div className="cr-panel cr-screws p-4 sm:p-6 md:p-7 flex flex-col gap-[22px]">
          {/* Header: the same dark title strip and close key as every dialog (owner, 2026-10-30) */}
          <div className="relative">
            <h1 className="cr-dialog-title">Operating Manual</h1>
            <Link
              href="/"
              className="cr-key cr-key-black !absolute top-1.5 right-1.5 size-7 !tracking-normal [&_svg]:size-4"
              aria-label="Close the manual and return to the main menu"
            >
              <XIcon />
            </Link>
          </div>

          <ManualSections
            sections={sections}
            chin={
              // The monitor's chin
              <div className="flex items-center gap-3.5 px-2.5 py-3.5" aria-hidden="true">
                <span className="retro-lamp on inline-block w-2.5 h-2.5 bg-[#36c874] text-[#36c874]" />
                <span className="flex-1" />
                <span className="flex flex-col gap-[5px] w-40">
                  <span className="ws5-manual-vent" />
                  <span className="ws5-manual-vent" />
                  <span className="ws5-manual-vent" />
                </span>
              </div>
            }
          />
        </div>
      </div>

      <ManualInduction />
    </div>
  )
}

// A screen section: its number, then its title in inverse video and a dashed rule
function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <h2 className="ws5-manual-heading">
        <span className="opacity-[0.55]">{number}</span>
        <Inverse>{title}</Inverse>
        <span className="ws5-manual-rule" />
      </h2>
      {children}
    </section>
  )
}

// A heading inside a section, ruled off like the old cards' titles
function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-2 pb-1 border-b-2 border-dashed border-[rgba(92,255,154,0.5)] text-[1.13em] uppercase tracking-[0.08em]">
      {children}
    </h3>
  )
}

// Inverse video, as the alarm monitor shows "WARNING"
function Inverse({ children }: { children: ReactNode }) {
  return <strong className="ws5-crt-inverse !px-[0.3em] font-normal">{children}</strong>
}

function Cursor() {
  return <span className="ws5-crt-cursor ws5-crt-cursor-blink" aria-hidden="true" />
}
