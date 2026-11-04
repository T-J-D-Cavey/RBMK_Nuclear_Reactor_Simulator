"use client"

import { useRef, useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { TutorialStep } from "@/lib/tutorial"
import Tutorial from "./tutorial"

// The ? key in a machine modal's top left corner, opposite the X (owner, 2026-11-04: Guide A). It brings back the shift
// foreman from the briefing to talk through that panel, and the game pauses until he has gone (onOpenChange). He is a
// dialog nested in the modal: that keeps him out of the modal's transform and hands him its focus and Escape, so
// neither can close the modal under him. It sits after the modal's controls in the page, so a modal doesn't open with
// its focus on the ? key.
export default function MachineGuide({ steps, onOpenChange }: { steps: TutorialStep[]; onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const keyRef = useRef<HTMLButtonElement>(null)
  const show = (next: boolean) => {
    setOpen(next)
    onOpenChange(next)
  }

  return (
    <>
      <button
        ref={keyRef}
        onClick={() => show(true)}
        aria-label="Ask the shift foreman about this panel"
        className="cr-key cr-key-black !absolute top-[calc(var(--dlg-pad,1.5rem)_+_0.375rem)] left-[calc(var(--dlg-pad,1.5rem)_+_0.375rem)] size-7 !text-[1.05rem] !tracking-normal"
      >
        ?
      </button>
      <DialogPrimitive.Root open={open} onOpenChange={show}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            role="presentation"
            aria-describedby={undefined}
            className="fixed inset-0 z-[60]"
            onOpenAutoFocus={(event) => event.preventDefault()} // the sheet takes focus itself
            onCloseAutoFocus={(event) => {
              event.preventDefault()
              keyRef.current?.focus()
            }}
            onEscapeKeyDown={(event) => event.preventDefault()} // the sheet's own keys close him
          >
            <DialogPrimitive.Title className="sr-only">Shift foreman</DialogPrimitive.Title>
            <Tutorial steps={steps} onFinish={() => show(false)} inModal />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
