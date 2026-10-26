// Switchgear controls shared by the water pump and sound dialogs (owner, 2026-10-26: prototype E)

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

// Jewel lamp with its engraved caption underneath
export function JewelLamp({ colour, lit, caption }: { colour: "green" | "amber" | "red"; lit: boolean; caption: string }) {
  return (
    <span className="flex flex-col items-center gap-1.5">
      <span className={`cr-jewel cr-jewel-${colour} ${lit ? "on" : ""}`} />
      <span className="cr-caption">{caption}</span>
    </span>
  )
}
