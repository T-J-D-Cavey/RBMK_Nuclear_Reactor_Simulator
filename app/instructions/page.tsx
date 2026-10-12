import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { THRESHOLDS } from "@/lib/types"
import { EVENT_TUNING, TUNING } from "@/lib/sim/tuning"

// The manual teaches the same model the game uses (bible §15): Legasov's red and blue cards.
export default function InstructionsPage() {
  const controlRoomBackground = "control_room_background.jpg"
  const t = THRESHOLDS

  return (
    <div className="min-h-screen p-4 md:p-8 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${controlRoomBackground})` }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card border-4 border-primary p-6 md:p-8 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="border-2 border-primary bg-transparent">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold font-mono uppercase text-accent">Operating Manual</h1>
          </div>

          <Section title="Objective">
            <p className="text-base leading-relaxed">
              You are the reactor control engineer on Unit 4. Deliver the power output the grid asks for, and keep the reactor
              away from its two ways to fail: a <strong>meltdown</strong> (reactor temperature too high) and a{" "}
              <strong>core explosion</strong> (too much steam). The reactor obeys the same physics in every mode.
            </p>
          </Section>

          <Section title="Game Modes">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card title="Easy Mode" subtitle="15 minute shift">
                About one major emergency per shift. Smaller power target changes (up to ±
                {EVENT_TUNING.easy.targetMaxStep.toLocaleString("en-US")} MW), every {minutes(EVENT_TUNING.easy.targetInterval)}{" "}
                minutes.
              </Card>
              <Card title="Hard Mode" subtitle="30 minute shift">
                About three major emergencies per shift. Larger power target changes (up to ±
                {EVENT_TUNING.hard.targetMaxStep.toLocaleString("en-US")} MW), every {minutes(EVENT_TUNING.hard.targetInterval)}{" "}
                minutes, and lower targets.
              </Card>
              <Card title="Free Mode (Sandbox)" subtitle="Unlimited practice">
                No targets and no events. The clock counts up. Use it to learn how the reactor responds.
              </Card>
              <Card title="Safety Test" subtitle="Historical scenario · 30 minutes">
                A scripted recreation of the night of the Unit 4 turbine rundown test. Orders come from the test procedure, the
                Deputy Chief Engineer and the Kiev grid controller. No random events.
              </Card>
            </div>
            <p className="text-sm leading-relaxed">
              Modes differ only in workload: shift length, power targets and emergencies. Rods, pumps, steam and xenon behave
              identically everywhere.
            </p>
          </Section>

          <Section title="How the Reactor Works">
            <p className="text-sm leading-relaxed">
              Radioactivity is the reactor&apos;s fission level. Think of it as Legasov&apos;s red cards and blue cards: every second,
              each card in play pushes radioactivity up or down.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-background p-4 border-2 border-destructive">
                <h3 className="font-bold font-mono mb-2 text-destructive">Red cards: push radioactivity up</h3>
                <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                  <li>Steam in the core (the positive void coefficient)</li>
                  <li>Graphite rod tips in the core</li>
                  <li>Fuel cooler than normal, strongly when very cold</li>
                </ul>
              </div>
              <div className="bg-background p-4 border-2 border-event">
                <h3 className="font-bold font-mono mb-2 text-event">Blue cards: push radioactivity down</h3>
                <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                  <li>Boron in the control rods, in proportion to how far they are inserted</li>
                  <li>Xenon</li>
                  <li>Fuel hotter than normal (a mild brake)</li>
                </ul>
              </div>
            </div>
            <ul className="text-sm leading-relaxed list-disc list-inside space-y-2">
              <li>
                <strong>Radioactivity changes in proportion to itself.</strong> The balance of the cards sets how fast it grows or
                shrinks, so the same imbalance moves it faster when it is already high. That is how a reactor runs away in
                seconds.
              </li>
              <li>
                <strong>Removing a blue card raises radioactivity as surely as playing a red one.</strong> Pulling rods out, or
                xenon burning off, takes a brake away.
              </li>
              <li>
                <strong>The loop:</strong> radioactivity heats the fuel, the fuel heats the reactor, the hot reactor boils water
                into steam, and steam pushes radioactivity up. Left alone, a rise feeds itself all the way to disaster, and a fall
                feeds itself down into the xenon pit. Very hot fuel slows a rise but never stops it. Only control rods and water
                pumps stop it.
              </li>
              <li>
                <strong>Power output only follows through heat and steam.</strong> Output is steam × 50 MW while the turbine is on
                the grid. Below about {TUNING.boilingTemp}° there is no steam at all. So output lags radioactivity: change the rods
                now and output arrives over the next minute or two.
              </li>
            </ul>
          </Section>

          <Section title="Controls">
            <div className="space-y-3">
              <Card title="Control Rods (×10)">
                <p>
                  Drag the levers to order new positions, then apply. Rods travel at a steady speed (a full stroke takes about{" "}
                  {TUNING.rodFullStrokeSeconds} seconds), so they are not instant brakes. The levers show where you ordered each
                  rod; the panel shows where it actually is as it travels. Every 1% of insertion is the same amount of boron at any
                  depth.
                </p>
                <p className="mt-2">
                  <strong>Rod margin</strong> is the total insertion of all ten rods (out of 1,000). Below {t.rodMargin.minimum} a
                  warning fires: the reactor is being held down by something less reliable than boron, usually xenon, which can
                  vanish.
                </p>
                <p className="mt-2">
                  <strong>Graphite tips.</strong> Each rod has a graphite tip. At 0% the tip is out of the core. The moment a rod
                  moves off 0%, its tip enters and pushes radioactivity <em>up</em> (as much as {TUNING.tipWorth}% of boron) for
                  about 2 seconds before the boron takes over. Rods parked at 1% or more never spike. So don&apos;t park rods at 0%.
                  When withdrawing, every step out raises radioactivity except the last step, from 1% to 0%.
                </p>
              </Card>
              <Card title="AZ-5 (Emergency Insertion)">
                One press drives every rod that isn&apos;t jammed towards 100% at rod speed: no Apply step. From a normal state it
                always shuts the reactor down safely. With many rods parked at 0%, high steam and little water flowing, the tips go
                in first and the spike can be deadly, just as on the night.
              </Card>
              <Card title="Water Pumps (×4)">
                <p>
                  A pump moves water only when it is switched ON (green lamp) and receives power (PWR lamp). Flow takes a few seconds
                  to build up or die away. More pumps mean more cooling and less steam in the core, so lower radioactivity; fewer
                  pumps mean a hotter, steamier core.
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>4 pumps at low radioactivity can collapse it towards the xenon pit.</li>
                  <li>2–3 pumps is the normal band, but never hands-off.</li>
                  <li>1 pump left alone runs away within minutes.</li>
                  <li>0 pumps: the water boils and steam escalates. At high radioactivity that ends in an explosion within a minute.</li>
                </ul>
              </Card>
              <Card title="Turbine">
                On the grid, the turbine turns steam into power output (CONN lamp). Disconnected, it can instead{" "}
                <strong>supply the station pumps</strong> if their normal supply is lost. More steam powers more pumps (PUMPS lamp;
                the PWR lamps show which pumps get power), and output is 0 meanwhile. The OVR-P lamp shows high steam: if it stays
                lit for {EVENT_TUNING.turbineTripSeconds} seconds while on the grid, the turbine trips off the grid.
              </Card>
            </div>
          </Section>

          <Section title="Readouts">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card title="Radioactivity">
                The fission level, set by the red and blue cards. A warning fires at {t.radioactivity.highWarning} and below{" "}
                {t.radioactivity.lowWarning}.
              </Card>
              <Card title="Fuel Temperature">
                Fission heats the fuel first, so it is your early warning: it climbs before the reactor temperature does. It
                normally runs hundreds of degrees hotter than the reactor.
              </Card>
              <Card title="Reactor Temperature">
                The coolant and graphite: slower and steadier. It sets how much steam boils. It is your &quot;you have this
                long&quot; gauge: meltdown at {t.reactorTemp.meltdown}°.
              </Card>
              <Card title="Steam">
                Drives the turbine, and is a red card in the core. Warning at {t.steamVolume.highWarning}; the core explodes at{" "}
                {t.steamVolume.explosion}. With little or no flow, each degree makes far more steam.
              </Card>
              <Card title="Xenon">
                Reads 0% in normal running. It builds over minutes when radioactivity is low (below about{" "}
                {TUNING.xenonBuildBelow}), and burns off as radioactivity rises: slowly at first, then in seconds during a surge.
              </Card>
              <Card title="Power Target and Performance">
                Stay within ±{Math.round(t.powerTolerance.fraction * 100)}% of the target (never tighter than ±
                {t.powerTolerance.minimum} MW) and performance rises by 1% every 5 seconds; outside, it falls at the same rate.
                At 0% you are removed from your post.
              </Card>
            </div>
          </Section>

          <Section title="The Xenon Pit">
            <p className="text-sm leading-relaxed">
              Run at low radioactivity for a few minutes and xenon builds up, pushing it lower still. Falling in is slow and
              ominous. Climbing out means pulling rods (nearly) all the way and letting the fuel cool, because very cold fuel is a
              strong red card. Then the escape speeds up as the xenon burns off. Re-insert rods as it clears, or radioactivity
              overshoots. A poisoned reactor can always be restarted, but that is the most dangerous moment of a normal shift.
            </p>
          </Section>

          <Section title="Shift Events (Easy & Hard)">
            <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
              <li>
                <strong className="font-mono">Target change:</strong> the grid controller warns that demand has changed, then
                confirms the new target {EVENT_TUNING.targetNotice} seconds later, when it takes effect. Low targets are a xenon trap.
              </li>
              <li>
                <strong className="font-mono">Power cut</strong> (major): the pumps lose their mains supply. Reports of grid
                instability come first. Disconnect the turbine and set it to supply the pumps.
              </li>
              <li>
                <strong className="font-mono">Control rod jam</strong> (major): several rods freeze wherever they are, even
                mid-travel, and stay there when freed. Pressure fluctuations are reported first.
              </li>
              <li>
                <strong className="font-mono">Pump trip:</strong> one running pump fails for a while. Switch on a standby pump.
              </li>
              <li>
                <strong className="font-mono">Grid hold:</strong> hold output at the target with half the usual tolerance for a
                few minutes. No new targets meanwhile.
              </li>
              <li>
                <strong className="font-mono">Turbine trip:</strong> not random. Sustained over-pressure trips the turbine off the
                grid; reconnect it once steam is back under control.
              </li>
            </ul>
            <p className="text-sm leading-relaxed">
              Easy has about one major emergency per shift and Hard about three, never in the first three minutes.
            </p>
          </Section>

          <Section title="The Safety Test">
            <p className="text-sm leading-relaxed">
              The night of 25–26 April 1986, compressed into 30 minutes. You will be ordered to reduce power, hold it low while
              xenon builds, and then raise it again for the test, which takes the rod margin below its minimum. Then the test
              begins: the turbine is switched to the pumps and the pumps&apos; normal supply is cut. Some controls change by
              themselves; each change is announced in the procedure log, and you can reverse it. Decide in advance what you will do
              when the test begins, and remember what a rod parked at 0% does.
            </p>
          </Section>

          <Section title="Game Over Conditions" danger>
            <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
              <li>
                <strong>Meltdown:</strong> reactor temperature reaches {t.reactorTemp.meltdown}° (all modes).
              </li>
              <li>
                <strong>Core explosion:</strong> steam reaches {t.steamVolume.explosion} (all modes). With little or no water
                flowing, steam gets there before the reactor melts.
              </li>
              <li>
                <strong>Removed from post:</strong> performance falls to 0% (Easy, Hard and the Safety Test).
              </li>
            </ul>
            <p className="text-sm leading-relaxed">Survive until the clock runs out to complete your shift.</p>
          </Section>
        </div>

        {/* Back Button */}
        <div className="flex justify-center pt-4">
          <Link href="/">
            <Button size="lg" className="uppercase font-mono tracking-wider px-8">
              Return to Main Menu
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// "4–5" from a range in seconds
function minutes([from, to]: readonly [number, number]): string {
  return `${Math.round(from / 60)}–${Math.round(to / 60)}`
}

function Section({ title, danger = false, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className={`text-2xl font-bold font-mono uppercase ${danger ? "text-destructive" : "text-accent"}`}>{title}</h2>
      {children}
    </section>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="bg-background p-4 border-2 border-border">
      <h3 className="font-bold font-mono mb-1 text-accent">{title}</h3>
      {subtitle && <p className="text-xs leading-relaxed text-muted-foreground mb-2">{subtitle}</p>}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}
