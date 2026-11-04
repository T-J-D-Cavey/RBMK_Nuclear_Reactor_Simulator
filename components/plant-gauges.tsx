"use client"

import type { CSSProperties } from "react"
import { ArcDial } from "@/components/machine-dials"

// The turbine's and the pumps' dials on the main page, for reading only: the jobs are run from their modals (owner,
// 2026-11-04: Plant Gauges A2). It sits below the chart recorder, at the same width, and from medium screens up is at
// least as tall as the rod display beside it (matchHeight). Neither reading comes from the reactor hall, so both keep
// working while its signal is lost. Each dial names itself.
export default function PlantGauges({ vacuum, pumpBalance, matchHeight, className = "" }: { vacuum: number; pumpBalance: number; matchHeight?: number | null; className?: string }) {
  return (
    <div
      className={`cr-panel cr-screws p-3 sm:p-4 flex flex-col gap-2 md:min-h-[var(--match-height)] ${className}`}
      style={matchHeight ? ({ "--match-height": `${matchHeight}px` } as CSSProperties) : undefined}
    >
      <div className="flex items-center min-h-[26px]">
        <div className="cr-plate">Plant Gauges</div>
      </div>

      <div className="cr-module cr-bay-screws flex-1 p-2.5 flex flex-col items-center justify-evenly gap-3">
        <ArcDial kind="vacuum" value={vacuum} className="w-full max-w-[300px] md:max-w-[392px]" />
        <ArcDial kind="pumps" value={pumpBalance} className="w-full max-w-[300px] md:max-w-[392px]" />
      </div>
    </div>
  )
}
