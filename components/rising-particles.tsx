import type { CSSProperties } from "react"

// Deterministic particle field rising up the room: orange embers or green glowing fallout. "burst" sends them up
// after a short delay (the explosion ending); "drifting" has them already on their way when the page opens.
export default function RisingParticles({ kind, start }: { kind: "embers" | "fallout"; start: "burst" | "drifting" }) {
  const count = kind === "embers" ? 34 : 24
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const size = 2 + ((i * 7) % 5)
        const duration = 5 + ((i * 13) % 7)
        const style = {
          left: `${(i * 37 + 11) % 100}%`,
          width: size,
          height: size,
          animationDuration: `${duration}s`,
          animationDelay: start === "burst" ? `${0.4 + ((i * 0.23) % 3)}s` : `${-((i * 0.9) % duration)}s`,
          "--drift": `${((i * 29) % 90) - 45}px`,
        } as CSSProperties
        return <span key={i} className={`cr-ember ${kind === "fallout" ? "cr-ember-fallout" : ""}`} style={style} />
      })}
    </div>
  )
}
