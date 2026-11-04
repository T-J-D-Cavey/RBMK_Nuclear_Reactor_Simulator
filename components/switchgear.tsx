// Switchgear controls shared by the water pump and sound dialogs (owner, 2026-10-26: prototype E), and the key the
// turbine and pump dialogs run their maintenance jobs with

// Pistol-grip control switch: the grip turns left to the off legend and right to the on legend
// `locked` shows nothing at all: the switch looks the same and simply can't be turned (owner, 2026-11-04: Pumps B2)
export function GripSwitch({ id, on, offLegend, onLegend, label, describedBy, locked = false, onToggle }: {
  id: string
  on: boolean
  offLegend: string
  onLegend: string
  label: string
  describedBy?: string
  locked?: boolean
  onToggle: () => void
}) {
  return (
    <span className="cr-grip-plate">
      <span className="cr-grip-mark cr-grip-mark-off" aria-hidden="true" />
      <span className="cr-grip-mark cr-grip-mark-on" aria-hidden="true" />
      <span className="cr-grip-legend cr-grip-legend-off" aria-hidden="true">{offLegend}</span>
      <span className="cr-grip-legend cr-grip-legend-on" aria-hidden="true">{onLegend}</span>
      <button
        id={id}
        aria-pressed={on}
        aria-label={label}
        aria-describedby={describedBy}
        disabled={locked}
        onClick={onToggle}
        className={`cr-grip ${on ? "on" : ""}`}
      />
      <span className="cr-grip-hub" aria-hidden="true" />
    </span>
  )
}

// A maintenance job's blue key on its plate, with a Ready tile the plate's width under it: lit green when a press would
// do something, grey otherwise (owner, 2026-11-04: Turbine B2, Pumps B2).
export function JobKey({ ready, ariaLabel, tutorial, onRun }: { ready: boolean; ariaLabel: string; tutorial: string; onRun?: () => void }) {
  return (
    <div className="cr-job-key" data-tutorial={tutorial}>
      <span className="cr-lens-bezel">
        <button onClick={onRun} aria-label={ariaLabel} className="cr-lens cr-lens-blue">
          Run
        </button>
      </span>
      <span className={`cr-mode-tile ${ready ? "on-green" : ""}`}>Ready</span>
    </div>
  )
}

// Jewel lamp with its engraved caption underneath
export function JewelLamp({ colour, lit, caption }: { colour: "green" | "amber" | "red"; lit: boolean; caption: string }) {
  return (
    <span className="flex flex-col items-center gap-1.5">
      <span className={`cr-jewel cr-jewel-${colour} ${lit ? "on" : ""}`} />
      <span className="cr-caption">{caption}</span>
    </span>
  )
}
