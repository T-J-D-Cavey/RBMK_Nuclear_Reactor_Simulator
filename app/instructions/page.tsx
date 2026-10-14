import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { THRESHOLDS } from "@/lib/types"
import { MODE_MENU, MODE_MENU_TAGLINE } from "@/lib/mode-menu"

// A quick-start manual (plan §21.6). It teaches the same model the game uses (bible §15): Legasov's red and blue
// cards. Numbers are read from the code, so they track tuning.
export default function InstructionsPage() {
  const controlRoomBackground = "control_room_background.jpg"
  const t = THRESHOLDS

  return (
    <div className="relative min-h-screen px-3 py-5 sm:p-4 md:p-8 bg-black">
      {/* The control room stays put behind the long manual (a fixed layer, which iOS honours; bg-fixed it does not) */}
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${controlRoomBackground})` }} aria-hidden="true" />
      {/* Same atmosphere as the home page: dark vignette + faint scanlines over the control room */}
      <div className="ws3-home-vignette fixed inset-0 pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-4xl mx-auto space-y-6">
        <div className="cr-panel cr-screws p-4 sm:p-6 md:p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="cr-bezel shrink-0">
              <Link href="/" className="cr-key cr-key-black size-10" aria-label="Back to the main menu">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </span>
            <h1 className="cr-nameplate flex-1 text-center px-3 py-2.5 text-xl sm:text-3xl md:text-4xl">Operating Manual</h1>
          </div>

          <Section title="Your Job">
            <p className="text-sm leading-relaxed">
              You're in charge of the reactor in Unit 4 of the Chernobyl Nuclear Power Station. Manage the nuclear fission reactor so that stable radioactivity levels create steam that turns a turbine and makes electricity for the grid. Simple right? Just make sure to avoid a <strong>meltdown</strong> and a <strong>core explosion</strong> and handle any unexpected events along the way...
            </p>
          </Section>

          <Section title="Game Modes">
            {/* Same wording as the mode menu (lib/mode-menu.ts) */}
            <p className="text-sm leading-relaxed">{MODE_MENU_TAGLINE}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MODE_MENU.map(({ mode, name, specs, lamp }) => (
                <div key={mode} className="cr-module p-4">
                  <h3 className="flex items-center gap-2 font-[family-name:var(--font-plate)] font-bold uppercase tracking-[0.12em] text-[0.95rem] text-[#0f4c4a] mb-1">
                    <span className={`retro-lamp on inline-block w-2.5 h-2.5 shrink-0 ${lamp}`} aria-hidden="true" />
                    {name}
                  </h3>
                  <ul className="text-sm leading-relaxed list-disc list-inside">
                    {specs.map((spec) => (
                      <li key={spec}>{spec}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Core Concepts">
            <p className="text-sm leading-relaxed">
              Like Legasov&apos;s cards: red cards push radioactivity up, blue cards push it down. Aim for balance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="cr-module p-4 !border-l-[6px] !border-l-red-700">
                <h3 className="font-[family-name:var(--font-plate)] font-bold uppercase tracking-[0.12em] mb-2 text-red-800">Red cards: push it up</h3>
                <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                  <li>Uranium-235 fuel, especially when cold</li>
                  <li>Steam in the system</li>
                  <li>Graphite in the tips of the control rods</li>
                </ul>
              </div>
              <div className="cr-module p-4 !border-l-[6px] !border-l-[var(--event)]">
                <h3 className="font-[family-name:var(--font-plate)] font-bold uppercase tracking-[0.12em] mb-2 text-event">Blue cards: push it down</h3>
                <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                  <li>Boron in the control rods</li>
                  <li>Xenon in the core</li>
                  <li>Hot fuel</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section title="Controls">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card title="Control Rods (×10)">
                More insertion → radioactivity down. Less insertion → radioactivity up.
              </Card>
              <Card title="AZ-5">
                Inserts all 10 control rods at once. Use it to stop a radioactivity spike.
              </Card>
              <Card title="Water Pumps (×4)">
                The more pumps powered and running, the cooler the reactor and the less steam. With no pumps running, the
                reactor boils off the remaining water. Beware.
              </Card>
              <Card title="Turbine">
                Converts steam into electricity. The water pumps run on power from the grid. In a power cut, disconnect the
                turbine from the grid and use the electricity it produces to power the pumps. Running at high steam for too long
                can trip the turbine.
              </Card>
            </div>
          </Section>

          <Section title="Warning Signs">
            <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
              <li>
                <strong>Alarm monitor:</strong> this computer warns you when the reactor is out of balance and recommends how to
                correct it.
              </li>
              <li>
                <strong>Act now:</strong> reactor temperature over {t.reactorTemp.warning}°, steam volume over{" "}
                {t.steamVolume.highWarning} or radioactivity over {t.radioactivity.highWarning}.
              </li>
              <li>
                <strong>Watch:</strong> low radioactivity, xenon building up, cold fuel, a low rod margin (most of your control
                rods withdrawn from the core) and low performance (long periods missing the grid&apos;s power demand).
              </li>
              <li>
                <strong>Shift log:</strong> messages from colleagues and outside contacts arrive here: the local grid controller,
                technicians and engineers on shift at the station, and members of the leadership team.
              </li>
            </ul>
          </Section>

          <Section title="The Xenon Pit">
            <p className="text-sm leading-relaxed">
              At low radioactivity the core can&apos;t burn off xenon, a byproduct of fission. Xenon builds up and drags
              radioactivity down further, which lets even more xenon build up. Withdrawing control rods and cooling the fuel can
              counter this, but be cautious: once radioactivity rises, the xenon (and the brake it was providing) can burn off
              quickly. It&apos;s best to avoid high xenon levels.
            </p>
          </Section>

          <Section title="The Safety Test">
            <p className="text-sm leading-relaxed">
              We need to complete a safety test, a box-ticking exercise for the executives. It involves lowering power output,
              disconnecting the turbine from the grid and measuring how much power the coasting turbine can supply to the water
              pumps. The deputy chief engineer will be on site to instruct you. It would be wise to keep them happy and get the
              test done.
            </p>
          </Section>

          <Section title="Game Over" danger>
            <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
              <li>
                <strong>Meltdown:</strong> reactor temperature reaches {t.reactorTemp.meltdown}°.
              </li>
              <li>
                <strong>Steam explosion:</strong> steam volume reaches {t.steamVolume.explosion}.
              </li>
              <li>
                <strong>Removed from post:</strong> your performance against the grid&apos;s power demand reaches 0%.
              </li>
            </ul>
            <p className="text-sm leading-relaxed">Avoid all of this and you&apos;ll survive your shift when the clock runs out.</p>
          </Section>
        </div>

        {/* Back Button */}
        <div className="flex justify-center pt-2 pb-2">
          <span className="cr-bezel w-full sm:w-auto">
            <Link href="/" className="cr-key cr-key-green-lit w-full sm:w-56 h-12">
              Main Menu
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}

function Section({ title, danger = false, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <section className="space-y-3 text-neutral-900">
      <h2 className={`cr-plate !justify-start !whitespace-normal !leading-snug !text-sm md:!text-base !py-2 !px-3 ${danger ? "!bg-[linear-gradient(180deg,#8f1d1d,#5f1010)] !text-red-50" : ""}`}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="cr-module p-4">
      <h3 className="font-[family-name:var(--font-plate)] font-bold uppercase tracking-[0.12em] text-[0.95rem] text-[#0f4c4a] mb-1">{title}</h3>
      {subtitle && <p className="font-mono text-[11px] uppercase tracking-wide text-neutral-600 mb-2">{subtitle}</p>}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}
