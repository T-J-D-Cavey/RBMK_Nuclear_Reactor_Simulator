"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import type { GameState, LogSource } from "@/lib/types"
import { LOG_SOURCE_LABELS, checkEventWarnings, checkWarnings, formatLogTime, getStatusLines } from "@/lib/game-utils"
import { getSafetyTestStatus } from "@/lib/safety-test"
import { AlertTriangle, ChevronDown, ChevronUp, ClipboardList, Radio } from "lucide-react"

interface MessageAreaProps {
  gameState: GameState
}

// Who is speaking sets the colour (bible §15: distinguish message sources visually).
const SOURCE_CLASSES: Record<LogSource, string> = {
  grid: "text-event",
  engineer: "text-amber-800",
  procedure: "text-amber-950",
  alarm: "text-destructive",
  system: "text-muted-foreground",
}

// Two collapsible boxes (plan §11.1): reactor warnings (red), and the shift log (blue) holding everything
// else: running events, announced target changes and a timestamped teletype log of messages. In the
// Safety Test the log becomes the test procedure, headed by the current phase and standing order.
export default function MessageArea({ gameState }: MessageAreaProps) {
  const [warningsVisible, setWarningsVisible] = useState(true)
  const [logVisible, setLogVisible] = useState(true)
  const warnings = checkWarnings(gameState)
  const isTest = gameState.mode === "safety_test"

  const pinned = [
    ...getStatusLines(gameState),
    ...checkEventWarnings(gameState).map((text, idx) => ({ key: `event-warning-${idx}`, source: "alarm" as LogSource, text })),
  ]
  const log = gameState.log
  const status = isTest ? getSafetyTestStatus(gameState) : null
  const showLog = pinned.length > 0 || log.length > 0 || isTest

  // Unread marker while the log is collapsed
  const lastId = log[log.length - 1]?.id
  const [seenId, setSeenId] = useState<string | undefined>(lastId)
  useEffect(() => {
    if (logVisible) setSeenId(lastId)
  }, [logVisible, lastId])
  const hasUnread = !logVisible && lastId !== undefined && lastId !== seenId

  const label = [isTest ? "Test Procedure" : "Shift Log", pinned.length ? `${pinned.length} active` : null].filter(Boolean).join(" · ")

  return (
    <div className="border-y-4 border-primary bg-card p-3 md:p-4">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Reactor warnings - Collapsible */}
        {warnings.length > 0 && (
          <CollapsibleBox
            label={`${warnings.length} Warning${warnings.length > 1 ? "s" : ""}`}
            icon={<AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />}
            visible={warningsVisible}
            onToggle={() => setWarningsVisible(!warningsVisible)}
            boxClassName="bg-destructive/10 border-destructive"
            hoverClassName="hover:bg-destructive/5"
            textClassName="text-destructive font-bold"
          >
            <div className="px-3 pb-3 space-y-1">
              {warnings.map((text, idx) => (
                <div key={`warning-${idx}`} className="font-mono text-sm text-destructive font-bold">
                  {text}
                </div>
              ))}
            </div>
          </CollapsibleBox>
        )}

        {/* Shift log / test procedure - Collapsible */}
        {showLog && (
          <CollapsibleBox
            label={label}
            icon={
              isTest ? (
                <ClipboardList className="h-5 w-5 text-amber-900 flex-shrink-0" />
              ) : (
                <Radio className="h-5 w-5 text-event flex-shrink-0" />
              )
            }
            badge={hasUnread ? <span className="ws5-unread font-mono text-[10px] font-bold uppercase">New</span> : null}
            visible={logVisible}
            onToggle={() => setLogVisible(!logVisible)}
            boxClassName={isTest ? "ws5-procedure-sheet" : "bg-event/10 border-event"}
            hoverClassName={isTest ? "hover:bg-amber-900/5" : "hover:bg-event/5"}
            textClassName={isTest ? "text-amber-950" : "text-event"}
          >
            <div className="px-3 pb-3 space-y-2">
              {status && (
                <div className="font-mono text-xs sm:text-sm text-amber-950 border-b border-dashed border-amber-900/40 pb-2 space-y-0.5">
                  <div className="font-bold uppercase tracking-wide">
                    Phase {status.phase} of 6 · {status.name}
                  </div>
                  {status.order && (
                    <div>
                      <span className="font-bold uppercase">Orders: </span>
                      {status.order}
                    </div>
                  )}
                </div>
              )}

              {pinned.length > 0 && (
                <div className="space-y-1">
                  {pinned.map((line) => (
                    <div key={line.key} className={`font-mono text-sm font-bold ${SOURCE_CLASSES[line.source]}`}>
                      ▶ {line.text}
                    </div>
                  ))}
                </div>
              )}

              {log.length > 0 && <TeletypeLog gameState={gameState} />}
            </div>
          </CollapsibleBox>
        )}

        {/* Placeholder when no messages */}
        {warnings.length === 0 && !showLog && (
          <div className="text-center text-muted-foreground font-mono text-sm">{"All systems stable"}</div>
        )}
      </div>
    </div>
  )
}

// Newest message last, like a teletype; scrolls to keep the newest line in view.
function TeletypeLog({ gameState }: { gameState: GameState }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const log = gameState.log
  const lastId = log[log.length - 1]?.id
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lastId])

  return (
    <div ref={scrollRef} className="max-h-40 overflow-y-auto pr-1 space-y-1 font-mono text-xs sm:text-sm" aria-live="polite">
      {log.map((entry) => (
        <div key={entry.id} className={`leading-snug ${entry.id === lastId ? "ws5-teletype-new" : ""}`}>
          <span className="text-muted-foreground tabular-nums">[{formatLogTime(gameState, entry)}]</span>{" "}
          <span className={`font-bold ${SOURCE_CLASSES[entry.source]}`}>{entry.from ?? LOG_SOURCE_LABELS[entry.source]}:</span>{" "}
          <span className="text-foreground">{entry.text}</span>
        </div>
      ))}
    </div>
  )
}

interface CollapsibleBoxProps {
  label: string
  icon: ReactNode
  badge?: ReactNode
  visible: boolean
  onToggle: () => void
  boxClassName: string
  hoverClassName: string
  textClassName: string
  children: ReactNode
}

function CollapsibleBox({ label, icon, badge, visible, onToggle, boxClassName, hoverClassName, textClassName, children }: CollapsibleBoxProps) {
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
          {badge}
        </div>
        <Chevron className={`h-5 w-5 ${textClassName}`} />
      </button>
      {visible && children}
    </div>
  )
}
