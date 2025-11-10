"use client"

import { useState } from "react"
import type { GameState } from "@/lib/types"
import { getGlowIntensity } from "@/lib/game-utils"
import ControlRodsModal from "./control-rods-modal"
import WaterPumpsModal from "./water-pumps-modal"
import TurbineModal from "./turbine-modal"

interface ReactorDisplayProps {
  gameState: GameState
  updateGameState: (updates: Partial<GameState>) => void
}

export default function ReactorDisplay({ gameState, updateGameState }: ReactorDisplayProps) {
  const [rodsModalOpen, setRodsModalOpen] = useState(false)
  const [pumpsModalOpen, setPumpsModalOpen] = useState(false)
  const [turbineModalOpen, setTurbineModalOpen] = useState(false)

  const glowIntensity = getGlowIntensity(gameState.radioactivity)

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Control Rods - Positioned above Reactor, move DOWN as insertion increases */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-20">
        {gameState.controlRods.map((rod) => {
          // Calculate vertical offset: 0% insertion = 0px offset (high), 100% insertion = 60px offset (low)
          const verticalOffset = (rod.insertion / 100) * 60

          return (
            <button
              key={rod.id}
              onClick={() => !gameState.isPaused && setRodsModalOpen(true)}
              disabled={gameState.isPaused}
              className="group relative cursor-pointer disabled:cursor-not-allowed"
              title={`Control Rod ${rod.id}: ${rod.insertion}%${rod.stuck ? " (STUCK)" : ""}`}
              style={{
                transform: `translateY(${verticalOffset}px)`,
                transition: "transform 0.5s ease-out",
              }}
            >
              {/* Rod shaft - fixed height, moves down as insertion increases */}
              <div className="w-4 md:w-5 h-16 md:h-20 bg-primary border-2 border-primary transition-all duration-500 group-hover:bg-primary/80" />
              {/* Rod indicator at bottom */}
              <div
                className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 md:w-5 h-1 ${
                  rod.stuck ? "bg-destructive" : "bg-accent"
                }`}
              />
            </button>
          )
        })}
      </div>

      <div className="relative flex items-center justify-center pt-24 md:pt-28 pb-32 md:pb-40">
        {/* Reactor Core Container - Rectangular industrial design */}
        <div className="relative">
          {/* Top cap with rod insertion holes */}
          <div className="w-48 md:w-64 h-6 md:h-8 bg-gradient-to-b from-gray-600 to-gray-500 border-2 border-gray-700 rounded-t-lg mx-auto shadow-lg" />

          {/* Main Reactor Body */}
          <div className="w-56 md:w-72 h-40 md:h-48 bg-gradient-to-b from-gray-500 to-gray-600 border-4 border-gray-700 shadow-2xl relative">
            {/* Reactor Core Window/Viewport */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 md:w-40 h-20 md:h-24 bg-gray-800 border-4 border-gray-900 rounded flex items-center justify-center overflow-hidden">
              {/* Glowing Core Visualization */}
              <div
                className="w-full h-full flex items-center justify-center transition-all duration-1000"
                style={{
                  background: `radial-gradient(circle, rgba(0,255,255,${glowIntensity}) 0%, rgba(0,200,200,${glowIntensity * 0.6}) 40%, rgba(0,100,100,${glowIntensity * 0.3}) 100%)`,
                  boxShadow: `inset 0 0 ${glowIntensity * 30}px ${glowIntensity * 20}px rgba(0,255,255,${glowIntensity * 0.5})`,
                }}
              >
                {/* Core rods visualization */}
                <div className="flex gap-0.5 md:gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 md:w-2 h-12 md:h-16 bg-cyan-400 opacity-70 rounded-sm"
                      style={{
                        boxShadow: `0 0 ${glowIntensity * 10}px ${glowIntensity * 5}px rgba(0,255,255,${glowIntensity})`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* REACTOR CORE Label */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-gray-700 border border-gray-800 px-3 py-0.5 rounded">
              <span className="text-[10px] md:text-xs font-mono font-bold text-gray-200 tracking-wider">
                REACTOR CORE
              </span>
            </div>
          </div>

          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-32 md:-translate-x-40 flex gap-4 md:gap-6">
            {/* Left Pump 1 */}
            <button
              onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
              disabled={gameState.isPaused}
              className="cursor-pointer disabled:cursor-not-allowed group relative"
              title="Water Pump 1"
            >
              {/* Pump top cap */}
              <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-t mx-auto" />
              {/* Pump body */}
              <div
                className={`w-14 md:w-16 h-24 md:h-28 border-4 rounded-lg transition-all shadow-lg ${
                  gameState.waterPumps[0].on && gameState.waterPumps[0].powered
                    ? "bg-gradient-to-b from-cyan-400 to-cyan-500 border-cyan-600"
                    : "bg-gradient-to-b from-gray-400 to-gray-500 border-gray-600"
                } group-hover:opacity-80`}
              >
                {/* Flow arrow */}
                <div className="flex items-center justify-center h-full">
                  <svg className="w-6 md:w-8 h-6 md:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3l-1.5 1.5L12 8H3v2h9l-3.5 3.5L10 15l6-6-6-6z" transform="rotate(90 10 10)" />
                  </svg>
                </div>
              </div>
              {/* Pump bottom cap */}
              <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-b mx-auto" />

              {/* Connecting pipe - curved */}
              <svg
                className="absolute left-full top-1/2 -translate-y-1/2 w-16 md:w-20 h-8 md:h-10 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 0 20 Q 30 20, 60 5"
                  fill="none"
                  stroke={gameState.waterPumps[0].on && gameState.waterPumps[0].powered ? "#06b6d4" : "#9ca3af"}
                  strokeWidth="6"
                />
              </svg>
            </button>

            {/* Left Pump 2 */}
            <button
              onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
              disabled={gameState.isPaused}
              className="cursor-pointer disabled:cursor-not-allowed group relative"
              title="Water Pump 2"
            >
              {/* Pump top cap */}
              <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-t mx-auto" />
              {/* Pump body */}
              <div
                className={`w-14 md:w-16 h-24 md:h-28 border-4 rounded-lg transition-all shadow-lg ${
                  gameState.waterPumps[1].on && gameState.waterPumps[1].powered
                    ? "bg-gradient-to-b from-cyan-400 to-cyan-500 border-cyan-600"
                    : "bg-gradient-to-b from-gray-400 to-gray-500 border-gray-600"
                } group-hover:opacity-80`}
              >
                {/* Flow arrow */}
                <div className="flex items-center justify-center h-full">
                  <svg className="w-6 md:w-8 h-6 md:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3l-1.5 1.5L12 8H3v2h9l-3.5 3.5L10 15l6-6-6-6z" transform="rotate(90 10 10)" />
                  </svg>
                </div>
              </div>
              {/* Pump bottom cap */}
              <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-b mx-auto" />

              {/* Connecting pipe - curved */}
              <svg
                className="absolute left-full top-1/2 -translate-y-1/2 w-16 md:w-20 h-8 md:h-10 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 0 20 Q 30 20, 60 10"
                  fill="none"
                  stroke={gameState.waterPumps[1].on && gameState.waterPumps[1].powered ? "#06b6d4" : "#9ca3af"}
                  strokeWidth="6"
                />
              </svg>
            </button>
          </div>

          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-32 md:translate-x-40 flex gap-4 md:gap-6">
            {/* Right Pump 1 */}
            <button
              onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
              disabled={gameState.isPaused}
              className="cursor-pointer disabled:cursor-not-allowed group relative"
              title="Water Pump 3"
            >
              {/* Pump top cap */}
              <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-t mx-auto" />
              {/* Pump body */}
              <div
                className={`w-14 md:w-16 h-24 md:h-28 border-4 rounded-lg transition-all shadow-lg ${
                  gameState.waterPumps[2].on && gameState.waterPumps[2].powered
                    ? "bg-gradient-to-b from-cyan-400 to-cyan-500 border-cyan-600"
                    : "bg-gradient-to-b from-gray-400 to-gray-500 border-gray-600"
                } group-hover:opacity-80`}
              >
                {/* Flow arrow */}
                <div className="flex items-center justify-center h-full">
                  <svg className="w-6 md:w-8 h-6 md:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3l-1.5 1.5L12 8H3v2h9l-3.5 3.5L10 15l6-6-6-6z" transform="rotate(90 10 10)" />
                  </svg>
                </div>
              </div>
              {/* Pump bottom cap */}
              <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-b mx-auto" />

              {/* Connecting pipe - curved (mirrored) */}
              <svg
                className="absolute right-full top-1/2 -translate-y-1/2 w-16 md:w-20 h-8 md:h-10 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 60 20 Q 30 20, 0 5"
                  fill="none"
                  stroke={gameState.waterPumps[2].on && gameState.waterPumps[2].powered ? "#06b6d4" : "#9ca3af"}
                  strokeWidth="6"
                />
              </svg>
            </button>

            {/* Right Pump 2 */}
            <button
              onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
              disabled={gameState.isPaused}
              className="cursor-pointer disabled:cursor-not-allowed group relative"
              title="Water Pump 4"
            >
              {/* Pump top cap */}
              <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-t mx-auto" />
              {/* Pump body */}
              <div
                className={`w-14 md:w-16 h-24 md:h-28 border-4 rounded-lg transition-all shadow-lg ${
                  gameState.waterPumps[3].on && gameState.waterPumps[3].powered
                    ? "bg-gradient-to-b from-cyan-400 to-cyan-500 border-cyan-600"
                    : "bg-gradient-to-b from-gray-400 to-gray-500 border-gray-600"
                } group-hover:opacity-80`}
              >
                {/* Flow arrow */}
                <div className="flex items-center justify-center h-full">
                  <svg className="w-6 md:w-8 h-6 md:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3l-1.5 1.5L12 8H3v2h9l-3.5 3.5L10 15l6-6-6-6z" transform="rotate(90 10 10)" />
                  </svg>
                </div>
              </div>
              {/* Pump bottom cap */}
              <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-b mx-auto" />

              {/* Connecting pipe - curved (mirrored) */}
              <svg
                className="absolute right-full top-1/2 -translate-y-1/2 w-16 md:w-20 h-8 md:h-10 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 60 20 Q 30 20, 0 10"
                  fill="none"
                  stroke={gameState.waterPumps[3].on && gameState.waterPumps[3].powered ? "#06b6d4" : "#9ca3af"}
                  strokeWidth="6"
                />
              </svg>
            </button>
          </div>

          <button
            onClick={() => !gameState.isPaused && setTurbineModalOpen(true)}
            disabled={gameState.isPaused}
            className="absolute -bottom-16 md:-bottom-20 left-1/2 -translate-x-1/2 cursor-pointer disabled:cursor-not-allowed group"
            title={`Turbine: ${gameState.turbineConnected ? "Connected" : "Disconnected"}`}
          >
            {/* Turbine top cap */}
            <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-t mx-auto" />
            {/* Turbine body */}
            <div
              className={`w-16 md:w-20 h-20 md:h-24 border-4 rounded-lg transition-all shadow-lg ${
                gameState.turbineConnected
                  ? "bg-gradient-to-b from-gray-500 to-gray-600 border-gray-700"
                  : "bg-gradient-to-b from-gray-400 to-gray-500 border-gray-600"
              } group-hover:opacity-80`}
            >
              {/* Turbine visualization */}
              <div className="flex flex-col items-center justify-center h-full gap-1 md:gap-1.5 px-2">
                <div className="w-full h-1.5 md:h-2 bg-gray-300 rounded" />
                <div className="w-full h-1.5 md:h-2 bg-gray-300 rounded" />
                <div className="w-full h-1.5 md:h-2 bg-gray-300 rounded" />
              </div>
            </div>
            {/* Turbine bottom cap */}
            <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-b mx-auto" />

            {/* Connecting pipes to reactor bottom */}
            <svg
              className="absolute left-1/2 -translate-x-1/2 bottom-full w-32 md:w-40 h-12 md:h-16 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Left pipe */}
              <path
                d="M 40 60 Q 40 30, 10 0"
                fill="none"
                stroke={gameState.turbineConnected ? "#06b6d4" : "#9ca3af"}
                strokeWidth="4"
              />
              {/* Right pipe */}
              <path
                d="M 90 60 Q 90 30, 120 0"
                fill="none"
                stroke={gameState.turbineConnected ? "#06b6d4" : "#9ca3af"}
                strokeWidth="4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Modals */}
      <ControlRodsModal
        open={rodsModalOpen}
        onOpenChange={setRodsModalOpen}
        controlRods={gameState.controlRods}
        onUpdate={(rods) => updateGameState({ controlRods: rods })}
      />

      <WaterPumpsModal
        open={pumpsModalOpen}
        onOpenChange={setPumpsModalOpen}
        waterPumps={gameState.waterPumps}
        onUpdate={(pumps) => updateGameState({ waterPumps: pumps })}
      />

      <TurbineModal
        open={turbineModalOpen}
        onOpenChange={setTurbineModalOpen}
        turbineConnected={gameState.turbineConnected}
        onUpdate={(connected) => updateGameState({ turbineConnected: connected })}
      />
    </div>
  )
}
