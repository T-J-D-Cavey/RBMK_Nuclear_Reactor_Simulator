import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function InstructionsPage() {

  const controlRoomBackground = "control_room_background.jpg"

  return (
    <div className="min-h-screen p-4 md:p-8 bg-cover bg-center bg-no-repeat" style={{backgroundImage: `url(${controlRoomBackground})`}}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Instructions Content */}
        <div className="bg-card border-4 border-primary p-6 md:p-8 space-y-6">
            {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="border-2 border-primary bg-transparent">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold font-mono uppercase text-accent">Operating Manual</h1>
          </div>
          {/* Objective */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold font-mono uppercase text-accent">Objective</h2>
            <p className="text-base leading-relaxed">
              {
                "Maintain a stable reactor at optimal performance by meeting the power generation targets while preventing the reactor temperature from exceeding safe limits and eventually a meltdown. You will need to balance multiple variables including radioactivity, reactor temperature, steam volume, uranium fuel temperature, and xenon levels."
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
                    "Select the control rods button on the control panel to adjust insertion percentage (0-100%). Boron rods decrease radioactivity, acting as a critical brake to increasing radioactivity. The emergency AZ-5 button can be used to fully insert all rods at once when radioactivity levels need to be immediately reduced. Be careful about fully removing the control rods when you need to increase radioactivity. Once they are removed and reinserted, they can cause a spike in radioactivity and steam due to their graphite tips. We are hoping to fix this design flaw with the RBMK reactor control rods very soon. The control panel shows insertion rates on the display screen."
                  }
                </p>
              </div>

              <div className="bg-background p-4 border-2 border-border">
                <h3 className="font-bold font-mono mb-2">Water Pumps (×4)</h3>
                <p className="text-sm leading-relaxed">
                  {
                    "Select the water pumps button on the control panel to toggle water pumps on and off. Pumps reduce reactor temperature by ensuring a steady flow of cooling water through the core, but they need to be in the ON position and powered. In recent days we have seen incoming power cuts that have resulted in the pumps being without power and turning off. If all pumps are turned off or are without power, the remaining water in the pipes will quickly result in a build up of steam and risk a spike in radioactivity. The control panel lights indicate on/off and powered/unpowered state."
                  }
                </p>
              </div>

              <div className="bg-background p-4 border-2 border-border">
                <h3 className="font-bold font-mono mb-2">Turbine</h3>
                <p className="text-sm leading-relaxed">
                  {
                    "Our power station delivers electricity to the people of our district as a result of the steam our reactor generates turning the plant's electricity turbine. Select the turbine button on the control panel to toggle connection. If our power generation is too high, we may be asked to disconnect our turbine to avoid damage to the power grid. A light on the control panel indicate when the turbine is connected, and a warning light with flash when power is too high for the power grid transmission."
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
                    "Uranium-235 fuel is naturally unstable and radioactive. Radioactivity must be stopped from increasing by insertion of boron control rods. High amounts of steam and a low uranium fuel temperature will increase radioactivity, and the presence of xenon will reduce it. Balance these forces carefully."
                  }
                </p>
              </div>
              <div className="bg-background p-3 border-2 border-border">
                <h3 className="font-bold font-mono text-sm mb-1">Reactor Temperature</h3>
                <p className="text-xs leading-relaxed">
                  {
                    "Our reactor temperature increases with higher radioactivity. This is needed in order to generate the steam that turns our turbine. Water pumps take cold water from the sea and removes excess heat. Our reactor core will meltdown at very high temperatures. This must be avoided at all costs."
                  }
                </p>
              </div>
              <div className="bg-background p-3 border-2 border-border">
                <h3 className="font-bold font-mono text-sm mb-1">Steam Volume</h3>
                <p className="text-xs leading-relaxed">
                  {
                    "A reactor temperature of ~90 degrees will generate steam. The hotter our reactor gets the more steam is created, and thus the more electricity we can generate. Steam increases radioactivity over time as our RBMK reactors have a positive void coefficient - monitor carefully."
                  }
                </p>
              </div>
              <div className="bg-background p-3 border-2 border-border">
                <h3 className="font-bold font-mono text-sm mb-1">Fuel Temperature</h3>
                <p className="text-xs leading-relaxed">
                  {
                  "Uranium fuel temperature increases and decreases as our reactor temperatures changes. It takes longer to change, and there is a negative temperature coefficient. This means cool uranium fuel is more radioactive, and hot uranium fuel is less radioactive. If you find your reactor is in a xenon pit, reduce the fuel temperature and remove control rods carefully to raise radioactivity levels back up to stable levels"
                  }
                </p>
              </div>
              <div className="bg-background p-3 border-2 border-border">
                <h3 className="font-bold font-mono text-sm mb-1">Performance</h3>
                <p className="text-xs leading-relaxed">
                {
                "Our district's power grid requires us to stay within 10% of the power targets they set. If our power plant is consistently unable to meet these targets, you will be removed from your post as Chief Reactor Controller."
                }
                </p>
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
                <strong className="font-mono">Control Rod Stuck:</strong> Some control rods become immovable temporarily
              </li>
            </ul>
          </section>

          {/* Game Over */}
          <section className="space-y-3">
            <h2 className="text-2xl font-bold font-mono uppercase text-destructive">Game Over Conditions</h2>
            <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
              <li>{"Reactor Temperature reaches 1200 degress (MELTDOWN)"}</li>
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
