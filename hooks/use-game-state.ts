"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { type GameEvent, type GameState, type GameMode, INITIAL_GAME_STATE, GAME_MODE_CONFIGS } from "@/lib/types"
import { advanceGame, createNewGame } from "@/lib/game-loop"

const STORAGE_KEY = "chernobyl-game-state"
const TICK_INTERVAL = 1000 // 1 second

const EVENT_TYPES: GameEvent["type"][] = ["power-cut", "rod-stuck", "pump-trip", "grid-hold"]

function loadSavedGameState(): GameState {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object") {
          const mode = (parsed.mode as GameMode) || (parsed.difficultyIsHard ? "hard" : "easy")
          const config = GAME_MODE_CONFIGS[mode] || GAME_MODE_CONFIGS.easy
          const gameTime = parsed.gameTime !== undefined
            ? parsed.gameTime
            : (config.hasTimer ? (config.timeLimit ?? 900) : 0)
          const powerTarget = parsed.powerTarget !== undefined
            ? parsed.powerTarget
            : config.defaultPowerTarget

          // Saves from before the sound modal split alarms from sound effects have one switch for both; a paused
          // save held it in soundEnabledWhenPaused.
          const { soundEnabled, soundEnabledWhenPaused, ...rest } = parsed
          const oldSound = Boolean(parsed.isPaused ? soundEnabledWhenPaused : soundEnabled)

          return migrateSavedState({
            ...INITIAL_GAME_STATE,
            ...rest,
            alarmsEnabled: rest.alarmsEnabled ?? oldSound,
            effectsEnabled: rest.effectsEnabled ?? oldSound,
            mode,
            gameTime,
            powerTarget,
            timeLimit: parsed.timeLimit !== undefined ? parsed.timeLimit : config.timeLimit,
          })
        }
      } catch (e) {
        console.error("Failed to load saved game state:", e)
      }
    }
  }
  return INITIAL_GAME_STATE
}

// Saves from before the reactor rework lack rod targets, pump flow, turbine mode, log and stats; saves from
// before the events rework have old-style target-change events and no event plan.
function migrateSavedState(state: GameState): GameState {
  return {
    ...state,
    controlRods: state.controlRods.map((rod) => ({
      id: rod.id,
      insertion: rod.insertion,
      target: typeof rod.target === "number" ? rod.target : rod.insertion,
      stuck: rod.stuck,
    })),
    waterPumps: state.waterPumps.map((pump) => ({
      ...pump,
      flow: typeof pump.flow === "number" ? pump.flow : pump.on && pump.powered ? 1 : 0,
      tripped: pump.tripped ?? false,
    })),
    turbineMode: state.turbineMode ?? (state.turbineConnected ? "grid" : "idle"),
    mainsPower: state.mainsPower ?? state.waterPumps.every((pump) => pump.powered),
    activeEvents: (state.activeEvents ?? []).filter((event) => EVENT_TYPES.includes(event.type) && typeof event.duration === "number"),
    eventHistory: state.eventHistory ?? [],
    eventPlan: state.eventPlan ?? null,
    nextTargetChangeAt: state.nextTargetChangeAt ?? null,
    pendingTarget: state.pendingTarget ?? null,
    scriptStep: state.scriptStep ?? 0,
    testScrapped: state.testScrapped ?? false,
    az5PressedAt: state.az5PressedAt ?? null,
    // Saves from before every message had a named sender (owner, 2026-10-12) hold unsigned "system" lines.
    log: Array.isArray(state.log)
      ? state.log.map((entry) => ({
          ...entry,
          source: (entry.source as string) === "system" ? "engineer" : entry.source,
          from: entry.from ?? "SHIFT FOREMAN",
        }))
      : [],
    stats: { ...INITIAL_GAME_STATE.stats, ...state.stats },
  }
}

export function useGameState() {
  // The saved game lives in localStorage, which the server cannot see. Start from the same state on the server and
  // in the browser, then load the save after mount, so the first render matches and React does not report a
  // hydration mismatch. Callers render a placeholder until isLoaded.
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE)
  const [isLoaded, setIsLoaded] = useState(false)
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setGameState(loadSavedGameState())
    setIsLoaded(true)
  }, [])

  // Save game state to local storage whenever it changes (only once the save has been loaded)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
    }
  }, [gameState, isLoaded])

  // Update a specific field in game state. Rods only change their ordered position here;
  // the engine moves them at rod speed (bible §10).
  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState((prev) => ({ ...prev, ...updates }))
  }, [])

  // Reset game to initial state for the active mode
  const resetGame = useCallback(() => {
    setGameState((prev) => {
      const newState = createNewGame(prev.mode || "easy")
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
      return newState
    })
  }, [])

  // Toggle pause
  const togglePause = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
  }, [])

  // One second of game time: physics, clock, events or the Safety Test script, warnings, endings (lib/game-loop)
  useEffect(() => {
    if (isLoaded && !gameState.isPaused && !gameState.isGameOver && !gameState.hasWon) {
      tickIntervalRef.current = setInterval(() => {
        setGameState((prev) => advanceGame(prev))
      }, TICK_INTERVAL)
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
      }
    }
  }, [isLoaded, gameState.isPaused, gameState.isGameOver, gameState.hasWon])

  return {
    gameState,
    isLoaded,
    updateGameState,
    resetGame,
    togglePause,
  }
}
