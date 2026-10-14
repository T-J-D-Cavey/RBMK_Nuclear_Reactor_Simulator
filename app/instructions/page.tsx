import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { THRESHOLDS } from "@/lib/types"
import { EVENT_TUNING, TUNING } from "@/lib/sim/tuning"
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
              Think of Legasov&apos;s red and blue cards: every second, each card in play pushes radioactivity up or down.
              On the board every card is the same push, so level columns mean a steady reactor.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="cr-module p-4 !border-l-[6px] !border-l-red-700">
                <h3 className="font-[family-name:var(--font-plate)] font-bold uppercase tracking-[0.12em] mb-2 text-red-800">Red cards: push it up</h3>
                <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                  <li>Nuclear fission in the fuel and graphite, including each rod&apos;s graphite tip in the core</li>
                  <li>Steam in the core</li>
                  <li>Fuel cooler than normal (strongly when very cold)</li>
                </ul>
              </div>
              <div className="cr-module p-4 !border-l-[6px] !border-l-[var(--event)]">
                <h3 className="font-[family-name:var(--font-plate)] font-bold uppercase tracking-[0.12em] mb-2 text-event">Blue cards: push it down</h3>
                <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                  <li>Boron in the control rods</li>
                  <li>Xenon</li>
                  <li>Fuel hotter than normal</li>
                </ul>
              </div>
            </div>
            <ul className="text-sm leading-relaxed list-disc list-inside space-y-2">
              <li>
                <strong>Rods in → radioactivity down. Rods out → up.</strong> Taking a blue card away pushes it up as surely as
                playing a red one.
              </li>
              <li>
                <strong>Output comes from steam.</strong> Change the rods and power output follows over the next minute or two.
              </li>
              <li>
                <strong>A rise or a fall feeds itself.</strong> Hotter means more steam, which means higher still. Correct early
                and in small steps: only rods and pumps stop it.
              </li>
              <li>
                <strong>The higher it is, the faster it moves.</strong> Radioactivity changes in proportion to itself.
              </li>
            </ul>
          </Section>

          <Section title="Controls">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card title="Control Rods (×10)">
                Rods take time to travel (about {TUNING.rodFullStrokeSeconds} s end to end). <strong>Never park a rod at 0%:</strong>{" "}
                as it moves off 0%, its graphite tip briefly pushes radioactivity up. Keep the rod margin (all ten insertions added
                up) above {t.rodMargin.minimum}.
              </Card>
              <Card title="AZ-5">
                One press drives every rod in. Safe from a normal state; deadly with many rods at 0%, high steam and little water
                flowing.
              </Card>
              <Card title="Water Pumps (×4)">
                A slow lever: more pumps cool the reactor over minutes, so less steam. Two or three is normal. With no pumps at
                all, the water boils and steam soars.
              </Card>
              <Card title="Turbine">
                In a power cut, disconnect it and set it to supply the pumps. If high steam (OVR-P) lasts{" "}
                {EVENT_TUNING.turbineTripSeconds} s while on the grid, it trips.
              </Card>
            </div>
          </Section>

          <Section title="Warning Signs">
            <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
              <li>
                <strong>Act now:</strong> reactor temperature over {t.reactorTemp.warning}°, steam over {t.steamVolume.highWarning}{" "}
                or radioactivity over {t.radioactivity.highWarning}. A meltdown or explosion is on its way.
              </li>
              <li>
                <strong>Watch:</strong> low radioactivity, xenon building, very cold fuel, a low rod margin or low
                performance. Trouble is building.
              </li>
              <li>
                <strong>Shift log:</strong> messages from people. Major emergencies (power cuts, rod jams) are warned first; smaller
                ones (a pump trip, a grid hold that halves your tolerance) aren&apos;t. Target changes are warned{" "}
                {EVENT_TUNING.targetNotice} s ahead and confirmed when they take effect.
              </li>
            </ul>
          </Section>

          <Section title="The Xenon Pit">
            <p className="text-sm leading-relaxed">
              At radioactivity {TUNING.xenonTurnover} or lower xenon builds, pushing it lower still. To climb out, pull rods well out.
              Above {TUNING.xenonTurnover} the xenon burns off, faster and faster as radioactivity rises, and from{" "}
              {TUNING.xenonWipeAt} it is gone in seconds. Re-insert rods early and stay below {TUNING.xenonWipeFrom} until it has
              cleared, or it overshoots.
            </p>
          </Section>

          <Section title="The Safety Test">
            <p className="text-sm leading-relaxed">
              You&apos;ll be ordered to cut power, hold it low while xenon builds, then raise it again past the rod-margin minimum.
              When the test begins, the pumps lose their supply and the coasting turbine powers them for only about{" "}
              {TUNING.turbineCoastSeconds} s. Some controls change by themselves; each change is announced in the shift log and
              you can reverse it. Decide in advance what you&apos;ll do.
            </p>
          </Section>

          <Section title="Game Over" danger>
            <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
              <li>
                <strong>Meltdown:</strong> reactor temperature reaches {t.reactorTemp.meltdown}°.
              </li>
              <li>
                <strong>Core explosion:</strong> steam reaches {t.steamVolume.explosion}.
              </li>
              <li>
                <strong>Removed from post:</strong> performance reaches 0%. It falls 1% every 5 s off target and rises on target.
              </li>
            </ul>
            <p className="text-sm leading-relaxed">Survive until the clock runs out to complete your shift.</p>
          </Section>
        </div>

        {/* Back Button */}
        <div className="flex justify-center pt-2 pb-2">
          <span className="cr-bezel w-full sm:w-auto">
            <Link href="/" className="cr-key cr-key-cream w-full sm:w-56 h-12">
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
