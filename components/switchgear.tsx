// Switchgear controls shared by the water pump and sound dialogs (owner, 2026-10-26: prototype E), and the key the
// turbine and pump dialogs run their maintenance jobs with

// Pistol-grip control switch: the grip turns left to the off legend and right to the on legend
export function GripSwitch({ id, on, offLegend, onLegend, label, describedBy, onToggle }: {
  id: string
  on: boolean
  offLegend: string
  onLegend: string
  label: string
  describedBy?: string
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
        onClick={onToggle}
        className={`cr-grip ${on ? "on" : ""}`}
      />
      <span className="cr-grip-hub" aria-hidden="true" />
    </span>
  )
}

// A maintenance job's blue key on its plate. It goes dark and can't be pressed while a press would do nothing, as it
// won't just after one (owner, 2026-11-05).
export function JobKey({ ready, ariaLabel, tutorial, onRun }: { ready: boolean; ariaLabel: string; tutorial: string; onRun?: () => void }) {
  return (
    <div className="cr-job-key" data-tutorial={tutorial}>
      <span className="cr-lens-bezel">
        <button onClick={onRun} disabled={!ready} aria-label={ariaLabel} className="cr-lens cr-lens-blue cr-lens-dark">
          Run
        </button>
      </span>
    </div>
  )
}

// Jewel lamp with its engraved caption underneath, or `beside` it where a bay is short of height
export function JewelLamp({ colour, lit, caption, beside = false }: { colour: "green" | "amber" | "red"; lit: boolean; caption: string; beside?: boolean }) {
  return (
    <span className={beside ? "flex items-center gap-2.5" : "flex flex-col items-center gap-1.5"}>
      <span className={`cr-jewel cr-jewel-${colour} ${lit ? "on" : ""}`} />
      <span className="cr-caption">{caption}</span>
    </span>
  )
}
