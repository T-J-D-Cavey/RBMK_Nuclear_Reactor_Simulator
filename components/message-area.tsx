"use client"

import { useState, type ReactNode } from "react"
import type { GameState } from "@/lib/types"
import { checkEventWarnings, checkWarnings } from "@/lib/game-utils"
import { AlertTriangle, ChevronDown, ChevronUp, Radio } from "lucide-react"

interface MessageAreaProps {
  gameState: GameState
}

// Two collapsible boxes (plan §11.1): reactor warnings (red), and events plus shift messages (blue).
// An experienced player can hide the reactor warnings and keep watching the events.
export default function MessageArea({ gameState }: MessageAreaProps) {
  const [warningsVisible, setWarningsVisible] = useState(true)
  const [eventsVisible, setEventsVisible] = useState(true)
  const warnings = checkWarnings(gameState)
  const eventMessages = [
    ...gameState.activeEvents.map((event) => ({ key: event.id, text: event.message })),
    ...checkEventWarnings(gameState).map((text, idx) => ({ key: `event-warning-${idx}`, text })),
  ]

  return (
    <div className="border-y-4 border-primary bg-card p-3 md:p-4">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Reactor warnings - Collapsible */}
        {warnings.length > 0 && (
          <MessageBox
            label={`${warnings.length} Warning${warnings.length > 1 ? "s" : ""}`}
            icon={<AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />}
            visible={warningsVisible}
            onToggle={() => setWarningsVisible(!warningsVisible)}
            boxClassName="bg-destructive/10 border-destructive"
            hoverClassName="hover:bg-destructive/5"
            textClassName="text-destructive font-bold"
            messages={warnings.map((text, idx) => ({ key: `warning-${idx}`, text }))}
          />
        )}

        {/* Events and shift messages - Collapsible */}
        {eventMessages.length > 0 && (
          <MessageBox
            label={`${eventMessages.length} Event${eventMessages.length > 1 ? "s" : ""}`}
            icon={<Radio className="h-5 w-5 text-event flex-shrink-0" />}
            visible={eventsVisible}
            onToggle={() => setEventsVisible(!eventsVisible)}
            boxClassName="bg-event/10 border-event"
            hoverClassName="hover:bg-event/5"
            textClassName="text-event"
            messages={eventMessages}
          />
        )}

        {/* Placeholder when no messages */}
        {warnings.length === 0 && eventMessages.length === 0 && (
          <div className="text-center text-muted-foreground font-mono text-sm">{"All systems stable"}</div>
        )}
      </div>
    </div>
  )
}

interface MessageBoxProps {
  label: string
  icon: ReactNode
  visible: boolean
  onToggle: () => void
  boxClassName: string
  hoverClassName: string
  textClassName: string
  messages: { key: string; text: string }[]
}

function MessageBox({ label, icon, visible, onToggle, boxClassName, hoverClassName, textClassName, messages }: MessageBoxProps) {
  const Chevron = visible ? ChevronUp : ChevronDown
  return (
    <div className={`border-2 ${boxClassName}`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-3 transition-colors ${hoverClassName}`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-mono text-sm font-bold uppercase ${textClassName}`}>{label}</span>
        </div>
        <Chevron className={`h-5 w-5 ${textClassName}`} />
      </button>
      {visible && (
        <div className="px-3 pb-3 space-y-1">
          {messages.map((message) => (
            <div key={message.key} className={`font-mono text-sm ${textClassName}`}>
              {message.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
