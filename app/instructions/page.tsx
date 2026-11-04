import Link from "next/link"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { XIcon } from "lucide-react"
import { THRESHOLDS } from "@/lib/types"
import { EVENT_TUNING, TUNING } from "@/lib/sim/tuning"
import { MODE_MENU, MODE_MENU_TAGLINE } from "@/lib/mode-menu"
import { BASE_OPEN_GRAPH } from "@/lib/site"

// The tab reads "How to Play | RBMK Nuclear Reactor Simulation"; link previews get the longer title
const MANUAL_TITLE = "How to Play: RBMK Reactor Operating Manual"
const MANUAL_DESCRIPTION =
  "How to play the RBMK reactor simulation: the game modes, the red and blue reactivity cards, control rods, AZ-5, pumps and turbine, the grid's power targets, shift emergencies, warning signs, the xenon pit and the 1986 safety test."

export const metadata: Metadata = {
  title: "How to Play",
  description: MANUAL_DESCRIPTION,
  alternates: { canonical: "/instructions" },
  openGraph: { ...BASE_OPEN_GRAPH, url: "/instructions", title: MANUAL_TITLE, description: MANUAL_DESCRIPTION },
}

// A quick-start manual (plan §21.6). It teaches the same model the game uses (bible §15): Legasov's red and blue
// cards. Numbers are read from the code, so they track tuning. The whole manual reads off one tall SKALA screen set
// into the panel, like the alarm monitor (owner, 2026-10-26: prototype A).
export default function InstructionsPage() {
  const controlRoomBackground = "control_room_background.jpg"
  const t = THRESHOLDS
  const margin = Math.round(t.powerTolerance.fraction * 100)

  return (
    <div className="relative min-h-screen px-3 py-5 sm:p-4 md:p-8 bg-black">
      {/* The control room stays put behind the long manual (a fixed layer, which iOS honours; bg-fixed it does not) */}
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

          {/* The monitor */}
          <div className="ws3-cam-bezel rounded-[10px] px-2.5 pt-2.5 sm:px-[18px] sm:pt-[18px]">
            <div className="ws5-manual-screen">
              <div className="ws5-crt-text relative z-[1] px-[18px] pt-6 pb-7 sm:px-[52px] sm:pt-10 sm:pb-12 flex flex-col gap-8 sm:gap-10">
                <Section number="01" title="Your Job">
                  <p>
                    You're in charge of the reactor in Unit 4 of the Chernobyl Nuclear Power Station. Manage the nuclear fission reactor so that stable radioactivity levels create steam that turns a turbine and makes electricity for the grid. Simple right? Just make sure to avoid a <Inverse>meltdown</Inverse> and a <Inverse>core explosion</Inverse> and handle any unexpected events along the way...
                  </p>
                </Section>

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
                </Section>

                <Section number="03" title="Core Concepts">
                  <p>Like Legasov&apos;s cards: red cards push radioactivity up, blue cards push it down. Aim for balance.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="ws5-manual-box ws5-manual-box-double">
                      <h3 className="mb-2 text-[1.13em] uppercase tracking-[0.06em]">
                        <span className="ws5-crt-inverse !px-[0.3em]">▲ Red cards: push it up</span>
                      </h3>
                      <ul className="ws5-manual-list">
                        <li>Uranium-235 fuel, especially when cold</li>
                        <li>Steam in the system</li>
                        <li>Graphite in the tips of the control rods</li>
                      </ul>
                    </div>
                    <div className="ws5-manual-box ws5-manual-box-dashed">
                      <h3 className="mb-2 text-[1.13em] uppercase tracking-[0.06em]">▼ Blue cards: push it down</h3>
                      <ul className="ws5-manual-list">
                        <li>Boron in the control rods</li>
                        <li>Xenon in the core</li>
                        <li>Hot fuel</li>
                      </ul>
                    </div>
                  </div>
                </Section>

                <Section number="04" title="Controls">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card title="Control Rods (×10)">
                      More insertion → radioactivity down. Less insertion → radioactivity up. Rods take a few seconds to travel, so
                      make a move and wait for it. Keep each rod at least 1% in: a rod pushed in from fully out (0%) first adds
                      radioactivity through its graphite tip, and jams if steam is high.
                    </Card>
                    <Card title="AZ-5">
                      Inserts every control rod at once, except any that have jammed. Use it to stop a radioactivity spike.
                    </Card>
                    <Card title="Water Pumps (×4)">
                      The more pumps powered and running, the cooler the reactor and the less steam, so the more radioactivity you
                      need for the same power output. With no pumps running, the reactor boils off the remaining water. Beware.
                    </Card>
                    <Card title="Turbine">
                      Converts steam into electricity for the grid: more steam, more power output. The water pumps normally run on
                      mains power. In a power cut, switch the turbine to the pumps and the electricity it makes keeps them running,
                      though none reaches the grid. Running at high steam for too long trips the turbine off the grid. Air
                      slowly leaks into its condenser, which costs output for the same steam, up to 12%. The air ejector clears
                      it, but output climbs as the vacuum returns, so pick your moment.
                    </Card>
                  </div>
                </Section>

                <Section number="05" title="Power Targets">
                  <p>
                    On Easy and Hard the grid controller sets the power output you must deliver. Stay within ±{margin}% of the
                    target and your performance climbs; miss it and performance falls. Demand swings a long way up and down
                    during a shift, so expect to drive the reactor hard with the rods and pumps to keep up.
                  </p>
                  <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
                    <li>
                      <Inverse>Notice:</Inverse> the grid warns you a change is coming, then sets the new target{" "}
                      {EVENT_TUNING.targetNotice} seconds later. You won&apos;t know how big it is, or which way, until then.
                    </li>
                    <li>
                      <Inverse>Hold request:</Inverse> the margin halves to ±{margin * t.powerTolerance.holdFactor}% until
                      you&apos;ve held output steady inside it for a while and the grid lifts the hold.
                    </li>
                    <li>
                      <Inverse>Low targets:</Inverse> low output means low radioactivity, where xenon builds up. See The Xenon Pit.
                    </li>
                  </ul>
                </Section>

                <Section number="06" title="Shift Emergencies">
                  <p>
                    On Easy and Hard things go wrong during the shift, one at a time. The shift log often warns you shortly
                    before, and each one clears by itself after a while.
                  </p>
                  <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
                    <li>
                      <Inverse>Power cut:</Inverse> the pumps lose their mains supply. Switch the turbine to the pumps to keep the
                      water flowing.
                    </li>
                    <li>
                      <Inverse>Signal loss:</Inverse> the reactor hall&apos;s instruments go dark. Steer by power output until they
                      come back.
                    </li>
                    <li>
                      <Inverse>Pump trip:</Inverse> one pump fails for a while.
                    </li>
                    <li>
                      <Inverse>Rod jam:</Inverse> some control rods freeze where they are until the fuel channel is repaired.
                    </li>
                  </ul>
                </Section>

                <Section number="07" title="Warning Signs">
                  <ul className="ws5-manual-list ws5-manual-prompt flex flex-col gap-2.5">
                    <li>
                      <Inverse>Alarm monitor:</Inverse> this computer warns you when the reactor is out of balance and recommends how to
                      correct it.
                    </li>
                    <li>
                      <Inverse>Act now:</Inverse> reactor temperature over {t.reactorTemp.warning}°, steam volume over{" "}
                      {t.steamVolume.highWarning} or radioactivity over {t.radioactivity.highWarning}.
                    </li>
                    <li>
                      <Inverse>Watch:</Inverse> radioactivity down to {t.radioactivity.lowWarning}, xenon building up, cold fuel, a low
                      rod margin (most of your control rods withdrawn from the core) and low performance (long periods missing the
                      grid&apos;s power target).
                    </li>
                    <li>
                      <Inverse>Shift log:</Inverse> messages from colleagues and outside contacts arrive here: the local grid controller,
                      technicians and engineers on shift at the station, and members of the leadership team.
                    </li>
                  </ul>
                </Section>

                <Section number="08" title="The Xenon Pit">
                  <p>
                    Below radioactivity {TUNING.xenonTurnover} the core can&apos;t burn off xenon, a byproduct of fission. Xenon builds up and drags
                    radioactivity down further, which lets even more xenon build up. Withdrawing control rods and cooling the fuel can
                    counter this, but be cautious: once radioactivity rises, the xenon (and the brake it was providing) can burn off
                    quickly. It&apos;s best to avoid high xenon levels.
                  </p>
                </Section>

                <Section number="09" title="The Safety Test">
                  <p>
                    We need to complete a safety test, a box-ticking exercise for the executives. It involves lowering power output,
                    disconnecting the turbine from the grid and measuring how much power the coasting turbine can supply to the water
                    pumps. The deputy chief engineer will be on site to instruct you. It would be wise to keep them happy and get the
                    test done.
                  </p>
                </Section>

                <Section number="10" title="Game Over" danger>
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
                  <p>
                    Avoid all of this and you&apos;ll survive your shift when the clock runs out. <Cursor />
                  </p>
                </Section>
              </div>
            </div>

            {/* The monitor's chin */}
            <div className="flex items-center gap-3.5 px-2.5 py-3.5" aria-hidden="true">
              <span className="retro-lamp on inline-block w-2.5 h-2.5 bg-[#36c874] text-[#36c874]" />
              <span className="flex-1" />
              <span className="flex flex-col gap-[5px] w-40">
                <span className="ws5-manual-vent" />
                <span className="ws5-manual-vent" />
                <span className="ws5-manual-vent" />
              </span>
            </div>
          </div>

          {/* Back Button, set into the panel below the monitor */}
          <div className="flex justify-center pt-1">
            <span className="cr-lens-bezel w-full sm:w-auto">
              <Link href="/" className="cr-lens w-full sm:w-56 h-12">
                Main Menu
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// A screen section: its number, then its title in inverse video and a dashed rule. Game Over sits in a double box whose
// border pulses, with a cursor at the end of its heading.
function Section({ number, title, danger = false, children }: { number: string; title: string; danger?: boolean; children: ReactNode }) {
  return (
    <section
      className={`flex flex-col gap-3.5 ${danger ? "ws5-manual-box ws5-manual-box-double ws5-manual-blink !px-4 !py-4 sm:!px-6 sm:!py-5" : ""}`}
    >
      <h2 className="ws5-manual-heading">
        <span className="opacity-[0.55]">{number}</span>
        <Inverse>{title}</Inverse>
        <span className="ws5-manual-rule" />
        {danger && <Cursor />}
      </h2>
      {children}
    </section>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ws5-manual-box">
      <h3 className="mb-1.5 pb-1 border-b-2 border-dashed border-[rgba(92,255,154,0.5)] text-[1.13em] uppercase tracking-[0.08em]">
        {title}
      </h3>
      <p>{children}</p>
    </div>
  )
}

// Inverse video, as the alarm monitor shows "WARNING"
function Inverse({ children }: { children: ReactNode }) {
  return <strong className="ws5-crt-inverse !px-[0.3em] font-normal">{children}</strong>
}

function Cursor() {
  return <span className="ws5-crt-cursor ws5-crt-cursor-blink" aria-hidden="true" />
}
