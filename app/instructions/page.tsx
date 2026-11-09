import Link from "next/link"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { XIcon } from "lucide-react"
import { THRESHOLDS } from "@/lib/types"
import { EVENT_TUNING, TUNING } from "@/lib/sim/tuning"
import { MODE_MENU, MODE_MENU_TAGLINE } from "@/lib/mode-menu"
import { BASE_OPEN_GRAPH } from "@/lib/site"
import ManualInduction from "@/components/manual-induction"
import ManualSections, { type ManualSection } from "@/components/manual-sections"

// The tab reads "How to Play | RBMK Nuclear Reactor Simulation"; link previews get the longer title
const MANUAL_TITLE = "How to Play: RBMK Reactor Operating Manual"
const MANUAL_DESCRIPTION =
  "How to play the RBMK reactor simulation: an induction to the red and blue reactivity cards and how a shift ends, then the game modes, the grid's power targets, shift emergencies and warning signs."

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
              them out of the core and radioactivity climbs. They take a few seconds to travel, and their effect is strong, so make a small move and observe the impact.
            </li>
            <li>
              <Inverse>Water pumps:</Inverse> more pumps carry more heat away from the core, so there&apos;s less steam pushing radioactivity up.
              Fewer pumps leave more steam, and radioactivity climbs.
            </li>
            <li>
              <Inverse>The catch:</Inverse> steam is also what makes your power. With more pumps running you need more
              radioactivity for the same output, so the rods and pumps work together.
            </li>
          </ul>

          <SubHeading>Power output and performance</SubHeading>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Power output:</Inverse> steam spins the turbine, and the turbine sends power to the grid. Output follows
              the reactor rather than your hands: a move on the rods or pumps changes the heat and steam first, and output
              catches up after.
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

          <SubHeading>What a shift throws at you</SubHeading>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Changing demand:</Inverse> the grid&apos;s target changes throughout a shift. You get
              a warning before each change, but not how big it is.
            </li>
            <li>
              <Inverse>Shift emergencies:</Inverse> things go wrong during a shift. The shift log often warns you
              before they happen.
            </li>
            <li>
              <Inverse>Warning signs:</Inverse> the alarm monitor tells you when the reactor is heading for trouble, and what to
              do about it.
            </li>
          </ul>

          <div className="ws5-manual-box ws5-manual-box-double ws5-manual-blink !px-4 !py-4 sm:!px-6 sm:!py-5 flex flex-col gap-3.5">
            <SubHeading>Game over</SubHeading>
            <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
              <li>
                <Inverse>Meltdown:</Inverse> reactor temperature reaches {t.reactorTemp.meltdown}°.
              </li>
              <li>
                <Inverse>Steam explosion:</Inverse> steam volume reaches {t.steamVolume.explosion}.
              </li>
              <li>
                <Inverse>Removed from post:</Inverse> your performance against the grid&apos;s power demand reaches 0%.
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
                <ul className="ws5-manual-list">
                  {specs.map((spec) => (
                    <li key={spec}>{spec}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p>
            Power targets and shift emergencies come with Easy and Hard. In the Safety Test the test team gives the orders. Free
            Mode has no targets and no clock, so it&apos;s the place to learn how the reactor answers. <Cursor />
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
            On Easy and Hard the grid sets a target and you have ±{margin}% either side of it. Inside it your performance climbs;
            outside it falls, and at 0% you&apos;re removed from your post. Demand swings a long way up and down during a shift,
            so expect to drive the reactor hard with the rods and pumps to keep up.
          </p>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Notice:</Inverse> the grid warns you a change is coming, then sets the new target{" "}
              {EVENT_TUNING.targetNotice} seconds later. You won&apos;t know how big it is, or which way, until then.
            </li>
            <li>
              <Inverse>Grid over-supplied:</Inverse> once a shift the grid asks for 0 MW. Disconnect the turbine, keep the
              reactor ready, and reconnect when the next target comes.
            </li>
            <li>
              <Inverse>Unit 1&apos;s safety test:</Inverse> once a shift Unit 1 asks you to cover its output with{" "}
              {EVENT_TUNING.unit1TestTarget.toLocaleString("en-GB")} MW, far above the grid&apos;s usual targets.
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
            On Easy and Hard things go wrong during the shift, one at a time. The shift log often warns you shortly before, and
            each one clears by itself after a while.
          </p>
          <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
            <li>
              <Inverse>Power cut:</Inverse> the pumps lose their mains supply. Switch the turbine to the pumps to keep the water
              flowing.
            </li>
            <li>
              <Inverse>Signal loss:</Inverse> the reactor hall&apos;s instruments go dark. Steer by power output until they come
              back.
            </li>
            <li>
              <Inverse>Pump trip:</Inverse> one pump fails for a while.
            </li>
            <li>
              <Inverse>Rod jam:</Inverse> some control rods freeze where they are until the fuel channel is repaired.
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
              {t.steamVolume.highWarning} or radioactivity over {t.radioactivity.highWarning}.
            </li>
            <li>
              <Inverse>Turbine trip:</Inverse> {EVENT_TUNING.turbineTripSeconds} seconds of steam at {t.steamVolume.highWarning}{" "}
              or more trips the turbine off the grid. Reconnect it once steam is back below {t.steamVolume.highWarning}.
            </li>
            <li>
              <Inverse>Watch:</Inverse> radioactivity down to {t.radioactivity.lowWarning}, xenon building up, cold fuel, a low rod
              margin (most of your control rods withdrawn from the core) and low performance (long periods missing the
              grid&apos;s power target).
            </li>
          </ul>
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
