"use client"

import { useState } from "react"
import type { GameState } from "@/lib/types"
import { checkWarnings } from "@/lib/game-utils"
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"

interface MessageAreaProps {
  gameState: GameState
}

export default function MessageArea({ gameState }: MessageAreaProps) {
  const [warningsVisible, setWarningsVisible] = useState(true)
  const warnings = checkWarnings(gameState)

  return (
    <div className="border-y-4 border-primary bg-card p-3 md:p-4">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Warnings - Collapsible */}
        {warnings.length > 0 && (
          <div className="bg-destructive/10 border-2 border-destructive">
            <button
              onClick={() => setWarningsVisible(!warningsVisible)}
              className="w-full flex items-center justify-between p-3 hover:bg-destructive/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <span className="font-mono text-sm text-destructive font-bold uppercase">
                  {warnings.length} Warning{warnings.length > 1 ? "s" : ""}
                </span>
              </div>
              {warningsVisible ? (
                <ChevronUp className="h-5 w-5 text-destructive" />
              ) : (
                <ChevronDown className="h-5 w-5 text-destructive" />
              )}
            </button>
            {warningsVisible && (
              <div className="px-3 pb-3 space-y-1">
                {warnings.map((warning, idx) => (
                  <div key={idx} className="font-mono text-sm text-destructive font-bold">
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Event Messages - Always visible */}
        {gameState.activeEvents.length > 0 && (
          <div className="bg-accent/10 border-2 border-accent p-3">
            <div className="space-y-1">
              {gameState.activeEvents.map((event) => (
                <div key={event.id} className="font-mono text-sm text-accent-foreground">
                  {event.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Placeholder when no messages */}
        {warnings.length === 0 && gameState.activeEvents.length === 0 && (
          <div className="text-center text-muted-foreground font-mono text-sm">{"All systems nominal"}</div>
        )}
      </div>
    </div>
  )
}
