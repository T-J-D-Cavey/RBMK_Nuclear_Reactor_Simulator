import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function InstructionsPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon" className="border-2 border-primary bg-transparent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold font-mono uppercase">Operating Manual</h1>
        </div>

        {/* Instructions Content */}
        <div className="bg-card border-4 border-primary p-6 md:p-8 space-y-6">
          {/* Objective */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold font-mono uppercase text-accent">Objective</h2>
            <p className="text-base leading-relaxed">
              {
                "Maintain the reactor at optimal performance by meeting the Power Generation Target while preventing a Meltdown. Balance multiple interdependent variables including Radioactivity, Temperature, Steam, Fuel Temperature, and Xenon levels."
              }
            </p>
          </section>

          {/* Controls */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold font-mono uppercase text-accent">Controls</h2>
            <div className="space-y-3">
              <div className="bg-background p-4 border-2 border-border">
                <h3 className="font-bold font-mono mb-2">Control Rods (×10)</h3>
                <p className="text-sm leading-relaxed">
                  {
                    "Click the rods on top of the reactor to adjust insertion percentage (0-100%). Rods contain 95% Boron (decreases radioactivity) and 5% Graphite tips (increases radioactivity). At 0-10% insertion, only graphite is active, increasing radioactivity. Above 10%, boron dominates and reduces radioactivity proportional to insertion depth."
                  }
                </p>
              </div>

              <div className="bg-background p-4 border-2 border-border">
                <h3 className="font-bold font-mono mb-2">Water Pumps (×4)</h3>
                <p className="text-sm leading-relaxed">
                  {
                    "Click the pipes around the reactor to toggle pumps On/Off. Pumps reduce reactor temperature when both ON and powered (shown as blue pipes). Each pump reduces temperature by ~0.5 units/second."
                  }
                </p>
              </div>

              <div className="bg-background p-4 border-2 border-border">
                <h3 className="font-bold font-mono mb-2">Turbine</h3>
                <p className="text-sm leading-relaxed">
                  {
                    "Click the turbine to toggle connection. When connected, converts steam into power output. Power Output = Steam Volume × 50 MW."
                  }
                </p>
              </div>
            </div>
          </section>

          {/* Key Metrics */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold font-mono uppercase text-accent">Key Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-background p-3 border-2 border-border">
                <h3 className="font-bold font-mono text-sm mb-1">Radioactivity</h3>
                <p className="text-xs leading-relaxed">
                  {
                    "Visible as green glow. Has natural baseline increase from uranium fuel. Controlled by control rods and influenced by steam and fuel temperature. Warning at 250 units."
                  }
                </p>
              </div>
              <div className="bg-background p-3 border-2 border-border">
                <h3 className="font-bold font-mono text-sm mb-1">Reactor Temperature</h3>
                <p className="text-xs leading-relaxed">
                  {
                    "Increases with radioactivity, reduced by water pumps. Generates steam above 90°. Warning at 800°, meltdown at 1200°."
                  }
                </p>
              </div>
              <div className="bg-background p-3 border-2 border-border">
                <h3 className="font-bold font-mono text-sm mb-1">Steam Volume</h3>
                <p className="text-xs leading-relaxed">
                  {
                    "Generated exponentially based on reactor temperature (above 90°). Increases radioactivity over time. Turbine converts steam to power. Warning at 80 units."
                  }
                </p>
              </div>
              <div className="bg-background p-3 border-2 border-border">
                <h3 className="font-bold font-mono text-sm mb-1">Fuel Temperature</h3>
                <p className="text-xs leading-relaxed">
                  {"Slowly increases with radioactivity, contributes to overall radioactivity growth."}
                </p>
              </div>
              <div className="bg-background p-3 border-2 border-border">
                <h3 className="font-bold font-mono text-sm mb-1">Performance</h3>
                <p className="text-xs leading-relaxed">{"Stay within ±10% of Power Target. Game over at 0%."}</p>
              </div>
            </div>
          </section>

          {/* Events */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold font-mono uppercase text-accent">Random Events</h2>
            <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
              <li>
                <strong className="font-mono">Target Change:</strong> Power target increases or decreases
              </li>
              <li>
                <strong className="font-mono">Power Cut:</strong> Water pumps lose power temporarily
              </li>
              <li>
                <strong className="font-mono">Control Rod Stuck:</strong> Rods become immovable temporarily
              </li>
            </ul>
          </section>

          {/* Game Over */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold font-mono uppercase text-destructive">Game Over Conditions</h2>
            <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
              <li>{"Reactor Temperature reaches 1200 units (MELTDOWN)"}</li>
              <li>{"Performance drops to 0% (PERFORMANCE FAILURE)"}</li>
            </ul>
          </section>
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
