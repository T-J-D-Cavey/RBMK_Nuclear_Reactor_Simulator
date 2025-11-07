import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-foreground uppercase font-mono">
            Chernobyl
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-mono">Nuclear Reactor Control Simulation</p>
        </div>

        {/* Control Panel Style Box */}
        <div className="bg-card border-4 border-primary p-8 md:p-12 space-y-6 shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-led-green rounded-full animate-pulse" />
              <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">System Ready</span>
            </div>

            <p className="text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
              {
                "Manage a nuclear reactor in real-time. Balance radioactivity, temperature, steam, and power output to avoid catastrophic failure."
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/game">
              <Button
                size="lg"
                className="w-full sm:w-auto uppercase font-mono tracking-wider text-lg px-8 py-6 bg-primary hover:bg-primary/90 border-2 border-primary"
              >
                Start Game
              </Button>
            </Link>

            <Link href="/instructions">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto uppercase font-mono tracking-wider text-lg px-8 py-6 border-2 border-primary hover:bg-primary/10 bg-transparent"
              >
                How to Play
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-sm text-muted-foreground font-mono space-y-1">
          <p>{"WARNING: This simulation requires careful attention and quick decision-making"}</p>
          <p className="text-xs">{"© 1986 REACTOR CONTROL SYSTEMS"}</p>
        </div>
      </div>
    </div>
  )
}
