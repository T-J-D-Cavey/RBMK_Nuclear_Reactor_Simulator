"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { type GameState, type GameMode, INITIAL_GAME_STATE, GAME_MODE_CONFIGS } from "@/lib/types"
import { calculateGameTick } from "@/lib/game-mechanics"
import { checkEventWarnings, checkGameOver, checkWarnings } from "@/lib/game-utils"
import { shouldTriggerEvent, generateRandomEvent, applyEvent, updateActiveEvents } from "@/lib/game-events"

const STORAGE_KEY = "chernobyl-game-state"
const TICK_INTERVAL = 1000 // 1 second

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

          return migrateSavedState({
            ...INITIAL_GAME_STATE,
            ...parsed,
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

// Saves from before the reactor rework lack rod targets, pump flow, turbine mode, log and stats.
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
    log: Array.isArray(state.log) ? state.log : [],
    stats: { ...INITIAL_GAME_STATE.stats, ...state.stats },
  }
}

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(loadSavedGameState)
  const isInitializedRef = useRef(false)
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const loaded = loadSavedGameState()
    setGameState(loaded)
    isInitializedRef.current = true
  }, [])

  // Save game state to local storage whenever it changes (only after client mount)
  useEffect(() => {
    if (isInitializedRef.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
    }
  }, [gameState])

  // Update a specific field in game state. Rods only change their ordered position here;
  // the engine moves them at rod speed (bible §10).
  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState((prev) => ({ ...prev, ...updates }))
  }, [])

  // Reset game to initial state for the active mode
  const resetGame = useCallback(() => {
    setGameState((prev) => {
      const mode = prev.mode || "easy"
      const config = GAME_MODE_CONFIGS[mode] || GAME_MODE_CONFIGS.easy
      const isHard = mode === "hard"
      const timeLimit = config.timeLimit
      const gameTime = config.hasTimer ? (timeLimit ?? 900) : 0

      const newState: GameState = {
        ...INITIAL_GAME_STATE,
        mode,
        difficultyIsHard: isHard,
        timeLimit,
        gameTime,
        lastEventTime: gameTime,
        powerTarget: config.defaultPowerTarget,
        performance: 100,
        activeEvents: [],
        eventHistory: [],
        warnings: [],
        isGameOver: false,
        gameOverReason: null,
        hasWon: false,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState))
      return newState
    })
  }, [])

  // Toggle pause
  const togglePause = useCallback(() => {
    setGameState((prev) => ({ ...prev, isPaused: !prev.isPaused }))
  }, [])

  useEffect(() => {
    if (!gameState.isPaused && !gameState.isGameOver && !gameState.hasWon) {
      tickIntervalRef.current = setInterval(() => {
        setGameState((prev) => {
          const modeConfig = GAME_MODE_CONFIGS[prev.mode || "easy"] || GAME_MODE_CONFIGS.easy

          // Calculate all game mechanics
          const { updates, ending } = calculateGameTick(prev)

          // Countdown for timed modes, Countup for Free Mode & sandbox modes
          const isCountUp = modeConfig.timerMode === "countup"
          const newGameTime = isCountUp ? prev.gameTime + 1 : Math.max(0, prev.gameTime - 1)

          let newState: GameState = {
            ...prev,
            ...updates,
            gameTime: newGameTime,
          }

          // Victory condition only applies to timed countdown modes (a disaster in the final second still counts)
          if (!ending && !isCountUp && modeConfig.hasTimer && newGameTime === 0 && !prev.hasWon) {
            newState.hasWon = true
            newState.isPaused = true
            return newState
          }

          // Update active events (check for expired events)
          const eventUpdates = updateActiveEvents(newState)
          newState = { ...newState, ...eventUpdates }

          // Check if we should trigger a new event (only if mode supports events)
          if (modeConfig.hasRandomEvents && shouldTriggerEvent(newState)) {
            const newEvent = generateRandomEvent(newState)
            if (newEvent) {
              const eventApply = applyEvent(newState, newEvent)
              newState = { ...newState, ...eventApply }
            }
          }

          // Check for warnings (both kinds, so the general alarm sounds for either)
          newState.warnings = [...checkWarnings(newState), ...checkEventWarnings(newState)]

          // Check for game over conditions
          const gameOverCheck = checkGameOver(newState, ending)
          if (gameOverCheck.isGameOver) {
            newState.isGameOver = true
            newState.gameOverReason = gameOverCheck.reason
            newState.gameOverCause = gameOverCheck.cause
          }
          return newState
        })
      }, TICK_INTERVAL)
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
      }
    }
  }, [gameState.isPaused, gameState.isGameOver, gameState.hasWon])

  useEffect(() => {
    if(gameState.isGameOver || gameState.hasWon) {
      setGameState((prev) => ({ ...prev, soundEnabled: false }))
    }
  }, [gameState.isGameOver, gameState.hasWon])

  return {
    gameState,
    updateGameState,
    resetGame,
    togglePause,
  }
}
