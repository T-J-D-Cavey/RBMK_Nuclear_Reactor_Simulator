import { type GameState, GAME_MODE_CONFIGS, THRESHOLDS, getShiftTime } from "@/lib/types"
import { SAFETY_TEST_CLOCK_START, formatMinutes, formatTime } from "@/lib/game-utils"

interface IncidentReportProps {
  gameState: GameState
  title: string
  stamp: string
  stampClassName: string
}

// The end-of-game report (bible §15): peak values, lowest rod margin, emergencies handled, time in danger.
export default function IncidentReport({ gameState, title, stamp, stampClassName }: IncidentReportProps) {
  const config = GAME_MODE_CONFIGS[gameState.mode] ?? GAME_MODE_CONFIGS.easy
  const shiftTime = getShiftTime(gameState)
  const { stats } = gameState
  const belowMinimum = stats.lowestRodMargin < THRESHOLDS.rodMargin.minimum

  const rows: { label: string; value: string; alert?: boolean }[] = [
    { label: "Mode", value: config.badgeText },
    {
      label: config.timerMode === "countdown" ? "Shift time" : "Time elapsed",
      value:
        gameState.mode === "safety_test"
          ? `${formatTime(SAFETY_TEST_CLOCK_START + shiftTime)} (night clock)`
          : config.timerMode === "countdown" && gameState.timeLimit !== null
            ? `${formatMinutes(shiftTime)} of ${formatMinutes(gameState.timeLimit)}`
            : formatTime(gameState.gameTime),
    },
    ...(config.hasPowerTarget ? [{ label: "Final performance", value: `${Math.round(gameState.performance)}%` }] : []),
    { label: "Peak radioactivity", value: `${Math.round(stats.peakRadioactivity)}` },
    {
      label: "Peak reactor temp",
      value: `${Math.round(stats.peakReactorTemp)}° of ${THRESHOLDS.reactorTemp.meltdown}°`,
      alert: stats.peakReactorTemp >= THRESHOLDS.reactorTemp.warning,
    },
    {
      label: "Peak steam",
      value: `${Math.round(stats.peakSteam)} of ${THRESHOLDS.steamVolume.explosion}`,
      alert: stats.peakSteam >= THRESHOLDS.steamVolume.highWarning,
    },
    {
      label: "Lowest rod margin",
      value: `${Math.round(stats.lowestRodMargin)}${belowMinimum ? ` (minimum ${THRESHOLDS.rodMargin.minimum})` : ""}`,
      alert: belowMinimum,
    },
    ...(config.hasRandomEvents ? [{ label: "Emergencies handled", value: `${stats.emergenciesHandled}` }] : []),
    { label: "Time in danger", value: formatMinutes(stats.secondsInDanger), alert: stats.secondsInDanger > 0 },
  ]

  return (
    <div className="ws5-report-paper relative border-2 border-neutral-800 p-4 sm:p-6 text-left font-mono">
      <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-neutral-500 pb-2 mb-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-neutral-600">Unit 4 · 26 April 1986</div>
          <div className="text-lg sm:text-xl font-bold uppercase">{title}</div>
        </div>
        <div className={`ws5-stamp shrink-0 px-2 py-1 text-[10px] sm:text-xs font-bold uppercase ${stampClassName}`}>{stamp}</div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 border-b border-dotted border-neutral-400/70 py-1.5">
            <dt className="uppercase text-neutral-600 text-xs sm:text-sm">{row.label}</dt>
            <dd className={`font-bold text-right ${row.alert ? "text-red-700" : ""}`}>{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-[10px] leading-relaxed text-neutral-600">
        Time in danger counts every second with radioactivity at or above {THRESHOLDS.radioactivity.highWarning}, reactor
        temperature at or above {THRESHOLDS.reactorTemp.warning}° or steam at or above {THRESHOLDS.steamVolume.highWarning}. Rod
        margin is the total insertion of all ten rods (out of 1,000).
      </p>
    </div>
  )
}
