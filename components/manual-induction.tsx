"use client"

import { useEffect, useState } from "react"
import { MANUAL_INDUCTION } from "@/lib/tutorial"
import Tutorial from "./tutorial"

// The shift foreman's induction over the Operating Manual (owner, 2026-11-09), on the side of the screen as in the
// game. It opens on every visit, once the page is in the browser (he measures the page to place himself), and Close,
// Escape or the last key leave the manual to read, open at the Induction.
export default function ManualInduction() {
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(true), [])
  if (!open) return null
  return (
    <Tutorial
      steps={MANUAL_INDUCTION}
      onFinish={() => setOpen(false)}
      finishLabel="Start reading ›"
      closeLabel="Close the induction and read the manual"
    />
  )
}
