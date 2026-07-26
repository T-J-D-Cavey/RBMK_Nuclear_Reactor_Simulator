"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { type GameState, INITIAL_GAME_STATE, GAME_MODE_CONFIGS } from "@/lib/types"
import { calculateGameTick } from "@/lib/game-mechanics"
import { checkGameOver, checkWarnings } from "@/lib/game-utils"
import { shouldTriggerEvent, generateRandomEvent, applyEvent, updateActiveEvents } from "@/lib/game-events"

const STORAGE_KEY = "chernobyl-game-state"
const TICK_INTERVAL = 1000 // 1 second

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE)
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setGameState(parsed)
      } catch (e) {
        console.error("Failed to load game state:", e)
      }
    } else {
      setGameState((prev) => ({
        ...prev,
        lastEventTime: prev.gameTime,
      }))
    }
  }, [])

  // Save game state to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
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

  // Reset game to initial state
  const resetGame = useCallback(() => {
    setGameState(INITIAL_GAME_STATE)
    localStorage.removeItem(STORAGE_KEY)
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
