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

  const waterPumpBlueLeftTop = "/water_pipe_no_bg_left_blue.png";
  const waterPumpBlueRightTop = "/water_pipe_no_bg_right_blue.png";
  const waterPumpGreyLeftTop = "/water_pipe_no_bg_left_grey.png";
  const waterPumpGreyRightTop = "/water_pipe_no_bg_right_grey.png";
  const waterPumpBlueLeftBottom = "/water_pipe_no_bg_left_blue.png";
  const waterPumpBlueRightBottom = "/water_pipe_no_bg_right_blue.png";
  const waterPumpGreyLeftBottom = "/water_pipe_no_bg_left_grey.png";
  const waterPumpGreyRightBottom = "/water_pipe_no_bg_right_grey.png";

  const glowIntensity = getGlowIntensity(gameState.radioactivity)

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Control Rods - Positioned above Reactor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3 z-20">
        {gameState.controlRods.map((rod) => {
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
              <div className="w-3 md:w-4 h-20 md:h-24 bg-gradient-to-b from-gray-600 to-gray-700 border-2 border-gray-800 transition-all duration-500 group-hover:brightness-110" />
              <div
                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 md:w-4 h-1 ${
                  rod.stuck ? "bg-destructive" : "bg-accent"
                }`}
              />
            </button>
          )
        })}
      </div>

      <div className="relative flex items-center justify-center pt-28 md:pt-32 pb-40 md:pb-48">
        {/* Reactor Core - Industrial metal box with viewing window */}
        <div className="relative">
          {/* Top reactor cap with bolts */}
          <div className="relative w-56 md:w-72 h-8 md:h-10 bg-gradient-to-b from-gray-500 to-gray-600 border-t-4 border-x-4 border-gray-700 mx-auto shadow-xl">
            {/* Bolt details */}
            <div className="absolute top-1/2 left-4 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-gray-800 border border-gray-900" />
            <div className="absolute top-1/2 right-4 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-gray-800 border border-gray-900" />
          </div>

          {/* Main Reactor Body */}
          <div className="w-60 md:w-80 h-48 md:h-56 bg-gradient-to-br from-gray-500 via-gray-600 to-gray-500 border-4 border-gray-700 shadow-2xl relative">
            {/* Corner bolts */}
            <div className="absolute top-2 left-2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-gray-800 border border-gray-900" />
            <div className="absolute top-2 right-2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-gray-800 border border-gray-900" />
            <div className="absolute bottom-2 left-2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-gray-800 border border-gray-900" />
            <div className="absolute bottom-2 right-2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-gray-800 border border-gray-900" />

            {/* Reactor Core Viewing Window - trapezoid shape */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 md:w-48 h-28 md:h-32 bg-gray-900 border-4 border-gray-800 overflow-hidden"
              style={{ clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)" }}
            >
              {/* Glowing Core with vertical rods */}
              <div
                className="w-full h-full flex items-center justify-center transition-all duration-1000"
                style={{
                  background: `linear-gradient(180deg, rgba(0,255,255,${glowIntensity * 0.3}) 0%, rgba(0,255,255,${glowIntensity * 0.8}) 50%, rgba(0,255,255,${glowIntensity}) 100%)`,
                  boxShadow: `inset 0 0 ${glowIntensity * 40}px ${glowIntensity * 20}px rgba(0,255,255,${glowIntensity * 0.6})`,
                }}
              >
                <div className="flex gap-1 md:gap-2 h-full items-center py-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      className="w-1 md:w-1.5 h-full bg-cyan-300 rounded-sm"
                      style={{
                        boxShadow: `0 0 ${glowIntensity * 12}px ${glowIntensity * 6}px rgba(0,255,255,${glowIntensity})`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* REACTOR CORE Label plate
            <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 bg-gray-700 border-2 border-gray-800 px-4 py-1 shadow-lg">
              <span className="text-[10px] md:text-xs font-mono font-bold text-gray-100 tracking-widest">
                REACTOR CORE
              </span>
            </div>
            */}
          </div>

           {/* Angled Water Pumps - positioned diagonally */}
          {/* Top-left pump */}

    <button
      onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
      disabled={gameState.isPaused}
      className="absolute cursor-pointer disabled:cursor-not-allowed group"
      style={{
        top: "50%",
        left: "0%",
        transform: "rotate(-35deg)",
        // Set dimensions appropriate for your image asset
        width: "60px", // Example width, adjust as needed for your image
        height: "160px", // Example height, adjust as needed for your image
        backgroundImage: `url(${gameState.waterPumps[0].on && gameState.waterPumps[0].powered ? waterPumpBlueLeftTop : waterPumpBlueRightTop})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
      title="Water Pump 1"
    >
      {/* No child divs needed for the pump visual, as it's a background image */}
    </button>

    {/* Bottom-left pump */}
    <button
      onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
      disabled={gameState.isPaused}
      className="absolute cursor-pointer disabled:cursor-not-allowed group"
      style={{
        bottom: "15%",
        left: "0%",
        transform: "rotate(35deg)",
        width: "60px", // Example width, adjust as needed for your image
        height: "160px", // Example height, adjust as needed for your image
        backgroundImage: `url(${gameState.waterPumps[1].on && gameState.waterPumps[1].powered ? waterPumpBlueLeftTop : waterPumpBlueRightTop})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
      title="Water Pump 2"
    >
      {/* No child divs needed for the pump visual */}
    </button>

    {/* Top-right pump */}
    <button
      onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
      disabled={gameState.isPaused}
      className="absolute cursor-pointer disabled:cursor-not-allowed group"
      style={{
        top: "20%",
        right: "-25%", // Adjust right/left based on where your component container is
        transform: "rotate(35deg)",
        width: "60px", // Example width, adjust as needed for your image
        height: "160px", // Example height, adjust as needed for your image
        backgroundImage: `url(${gameState.waterPumps[2].on && gameState.waterPumps[2].powered ? waterPumpBlueLeftTop : waterPumpBlueRightTop})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
      title="Water Pump 3"
    >
      {/* No child divs needed for the pump visual */}
    </button>

    {/* Bottom-right pump */}
    <button
      onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
      disabled={gameState.isPaused}
      className="absolute cursor-pointer disabled:cursor-not-allowed group"
      style={{
        bottom: "15%",
        right: "-25%", // Adjust right/left based on where your component container is
        transform: "rotate(-35deg)",
        width: "60px", // Example width, adjust as needed for your image
        height: "160px", // Example height, adjust as needed for your image
        backgroundImage: `url(${gameState.waterPumps[3].on && gameState.waterPumps[3].powered ? waterPumpBlueLeftTop : waterPumpBlueRightTop})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
      title="Water Pump 4"
    >
      {/* No child divs needed for the pump visual */}
    </button>

          {/* Bottom Turbine */}
          <button
            onClick={() => !gameState.isPaused && setTurbineModalOpen(true)}
            disabled={gameState.isPaused}
            className="absolute -bottom-24 md:-bottom-28 left-1/2 -translate-x-1/2 cursor-pointer disabled:cursor-not-allowed group"
            title={`Turbine: ${gameState.turbineConnected ? "Connected" : "Disconnected"}`}
          >
            <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-t mx-auto" />
            <div
              className={`w-16 md:w-20 h-24 md:h-28 border-4 rounded-lg shadow-xl transition-all ${
                gameState.turbineConnected
                  ? "bg-gradient-to-b from-gray-600 to-gray-700 border-gray-800"
                  : "bg-gradient-to-b from-gray-400 to-gray-500 border-gray-600"
              }`}
            >
              <div className="flex items-center justify-center h-full">
                <svg className="w-10 h-10 md:w-12 md:h-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                </svg>
              </div>
            </div>
            <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-b mx-auto" />
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
