import Link from "next/link"
import type { Metadata } from "next"
import RisingParticles from "@/components/rising-particles"

export const metadata: Metadata = {
  title: "Page Not Found",
}

// A broken or mistyped link: the home page's control room and CRT, with the way back to the main menu
export default function NotFound() {
  return (
    // The background path is absolute: a missing page can sit at any depth
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url(/control_room_background.jpg)" }}>
      <div className="ws3-home-vignette absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="cr-beacon cr-beacon-ceiling" aria-hidden="true" />
      <div className="cr-beacon-glow" aria-hidden="true" />
      <RisingParticles kind="embers" start="drifting" />

      <div className="relative max-w-2xl w-full space-y-8 text-center">
        <div className="ws3-crt-panel px-4 py-6 sm:px-8 sm:py-8">
          <div className="ws3-crt-sweep" aria-hidden="true" />
          <div className="relative space-y-3 sm:space-y-4">
            <h1 className="ws3-crt-title text-6xl md:text-8xl font-bold tracking-tight text-reactor-green uppercase font-mono">
              4 0 4
            </h1>
            <p className="ws3-crt-subtitle text-lg sm:text-xl md:text-2xl text-reactor-green font-mono uppercase">Unit Not Found</p>
            <p className="text-sm sm:text-base text-reactor-green/80 font-mono">This page is not on the station plans.</p>
          </div>
        </div>

        <div className="cr-panel cr-screws mx-auto w-full max-w-xs sm:w-fit px-5 py-5 sm:px-6">
          <span className="cr-lens-bezel w-full sm:w-auto">
            <Link href="/" className="cr-lens w-full sm:w-52 h-14 !text-lg">
              Main Menu
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}
