"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { type GameState, type GameMode, INITIAL_GAME_STATE, GAME_MODE_CONFIGS } from "@/lib/types"
import { calculateGameTick } from "@/lib/game-mechanics"
import { checkGameOver, checkWarnings } from "@/lib/game-utils"
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

          return {
            ...INITIAL_GAME_STATE,
            ...parsed,
            mode,
            gameTime,
            powerTarget,
            timeLimit: parsed.timeLimit !== undefined ? parsed.timeLimit : config.timeLimit,
          }
        }
      } catch (e) {
        console.error("Failed to load saved game state:", e)
      }
    }
  }
  return INITIAL_GAME_STATE
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

  // Update a specific field in game state
  const updateGameState = useCallback((updates: Partial<GameState>) => {
      setGameState((prev) => {

          // 1. Intercept controlRods updates:
          if (updates.controlRods) {

              let radioactivityChange = 0;
              let reactorTempChange = 0;
              let steamChange = 0;
              let XenonChange = 0;
              const updatedRods = updates.controlRods.map(rod => {

                  // Check if the rod is transitioning (flag is true)
                  if (rod.justReinserted) {
                      // Control rods entering core from a fully removed position causes a spike in radioactivity, fuel temp and steam due to the graphic tips of the rods
                      radioactivityChange += 50;
                      reactorTempChange += 20;

                      // 2. Reset the flag immediately in the same state update
                      return { ...rod, justReinserted: false };
                  }
                  return rod;
              });

              // 3. Merge the updates: apply the reset rods and the radioactivity change
              return { 
                  ...prev, 
                  ...updates, // Includes all other updates (like closing the modal)
                  controlRods: updatedRods, // Commits the rods with the flag reset
                  // Assumes 'radioactivity' is part of GameState
                  radioactivity: (prev.radioactivity || 0) + radioactivityChange,
                  reactorTemp: (prev.reactorTemp || 0) + reactorTempChange, 
              };
          }

          // Standard update if controlRods are not being updated
          return { ...prev, ...updates };
      });
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
          const updates = calculateGameTick(prev)

          // Countdown for timed modes, Countup for Free Mode & sandbox modes
          const isCountUp = modeConfig.timerMode === "countup"
          const newGameTime = isCountUp ? prev.gameTime + 1 : Math.max(0, prev.gameTime - 1)

          let newState: GameState = {
            ...prev,
            ...updates,
            gameTime: newGameTime,
          }

          // Victory condition only applies to timed countdown modes
          if (!isCountUp && modeConfig.hasTimer && newGameTime === 0 && !prev.hasWon) {
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

          // Check for warnings
          const warnings = checkWarnings(newState)
          newState.warnings = warnings

          // Check for game over conditions
          const gameOverCheck = checkGameOver(newState)
          if (gameOverCheck.isGameOver) {
            newState.isGameOver = true
            newState.gameOverReason = gameOverCheck.reason
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
