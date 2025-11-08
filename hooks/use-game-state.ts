"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { type GameState, INITIAL_GAME_STATE } from "@/lib/types"
import { calculateGameTick } from "@/lib/game-mechanics"
import { checkGameOver, checkWarnings } from "@/lib/game-utils"
import { shouldTriggerEvent, generateRandomEvent, applyEvent, updateActiveEvents } from "@/lib/game-events"

const STORAGE_KEY = "chernobyl-game-state"
const TICK_INTERVAL = 1000 // 1 second

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE)
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load game state from local storage on mount
  useEffect(() => {
    console.log({gameState}) // Tim: debug
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setGameState(parsed)
      } catch (e) {
        console.error("[v0] Failed to load game state:", e)
      }
    }
  }, [])

  // Save game state to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState))
  }, [gameState])

  // Update a specific field in game state
  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState((prev) => ({ ...prev, ...updates }))
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
    if (!gameState.isPaused && !gameState.isGameOver) {
      tickIntervalRef.current = setInterval(() => {
        setGameState((prev) => {
          // Calculate all game mechanics
          const updates = calculateGameTick(prev)

          // Increment game time
          let newState = {
            ...prev,
            ...updates,
            gameTime: prev.gameTime + 1,
          }

          // Update active events (check for expired events)
          const eventUpdates = updateActiveEvents(newState)
          newState = { ...newState, ...eventUpdates }

          // Check if we should trigger a new event
          if (shouldTriggerEvent(newState)) {
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
  }, [gameState.isPaused, gameState.isGameOver])

  return {
    gameState,
    updateGameState,
    resetGame,
    togglePause,
  }
}
