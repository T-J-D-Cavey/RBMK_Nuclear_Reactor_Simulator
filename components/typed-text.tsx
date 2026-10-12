import type { ReactNode } from "react"

export interface Segment {
  text: string
  className?: string
}

// The first `shown` characters of a run of styled segments, then the cursor. With `reserve`, the rest is laid out
// but invisible, so a line already has its final height (and line breaks) while it is being typed.
export function TypedSegments({ segments, shown, cursor, reserve = false }: { segments: Segment[]; shown: number; cursor?: ReactNode; reserve?: boolean }) {
  const typed: ReactNode[] = []
  const rest: ReactNode[] = []
  let left = shown
  segments.forEach((segment, i) => {
    const visible = segment.text.slice(0, Math.max(0, left))
    left -= segment.text.length
    if (visible) typed.push(<span key={`t${i}`} className={segment.className}>{visible}</span>)
    if (reserve && visible.length < segment.text.length) {
      rest.push(
        <span key={`r${i}`} className={`invisible ${segment.className ?? ""}`}>
          {segment.text.slice(visible.length)}
        </span>,
      )
    }
  })
  return (
    <>
      {typed}
      {cursor}
      {rest}
    </>
  )
}
