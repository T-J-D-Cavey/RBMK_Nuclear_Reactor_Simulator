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

  const reactorImage = "/new_reactor.png"
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
  <div className="relative w-full max-w-2xl mx-auto">
    {/* Control Rods - Positioned above Reactor */}
    {/* ADJUSTMENT: top-0 for initial positioning, will use negative margin for overlap */}
    <div className="absolute top-30 left-1/2 gap-2 -translate-x-1/2 flex z-30 md:gap-1">
      {gameState.controlRods.map((rod) => {
        const verticalOffset = (rod.insertion / 100) * 60

        return (
          <button
            key={rod.id}
            onClick={() => !gameState.isPaused && setRodsModalOpen(true)}
            disabled={gameState.isPaused}
            className="group relative cursor-pointer disabled:cursor-not-allowed"
            title={`Control Rod ${rod.id}: ${rod.insertion}%${
              rod.stuck ? " (STUCK)" : ""
            }`}
            style={{
              transform: `translateY(${verticalOffset}px)`,
              transition: "transform 0.5s ease-out",
            }}
          >
            <div className="w-3 md:w-4 h-20 md:h-24 bg-gradient-to-b from-gray-600 to-gray-700 border-2 border-gray-800 transition-all duration-500 group-hover:brightness-110" />
            <div
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 md:w-4 h-1 ${
                rod.stuck ? "bg-destructive" : "bg-accent"
              }`}
            />
          </button>
        )
      })}
    </div>
    {/* MAIN CONTENT STACK */}
    <div className="flex flex-col items-center w-full">
      
      {/* REACTOR + PUMPS ANCHOR */}
      <div className="relative">
        
        {/* REACTOR CORE IMAGE */}
        {/* ADJUSTMENT: Removed border-4 and border-gray-700. */}
        <img
          src={reactorImage}
          alt="Reactor Core"
          className="relative w-full h-auto object-cover z-10 rounded-lg"
        />
        {/* WATER PUMPS */}
        {/* Top-left pump in blue*/}
        <button
          onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
          disabled={gameState.isPaused}
          className="absolute top-40 -left-5 z-20 cursor-pointer disabled:cursor-not-allowed group -rotate-90"
          style={{
            width: "60px", 
            height: "150px", /* Reduced height */
            backgroundImage: `url(${waterPumpBlueLeftTop})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
          title="Water Pump 1"
          hidden={!gameState.waterPumps[0].on && !gameState.waterPumps[0].powered}
        >
          {/* No child divs needed for the pump visual, as it's a background image */}
        </button>
        {/* Top-left pump in grey*/}
        <button
          onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
          disabled={gameState.isPaused}
          className="absolute top-40 -left-5 z-20 cursor-pointer disabled:cursor-not-allowed group -rotate-90"
          style={{
            width: "60px", 
            height: "150px", /* Reduced height */
            backgroundImage: `url(${waterPumpGreyLeftTop})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
          title="Water Pump 1"
          hidden={gameState.waterPumps[0].on && gameState.waterPumps[0].powered}
        >
          {/* No child divs needed for the pump visual, as it's a background image */}
        </button>

        {/* Bottom-left pump in blue*/}
        <button
          onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
          disabled={gameState.isPaused}
          className="absolute bottom-20 -left-5 z-20 cursor-pointer disabled:cursor-not-allowed group -rotate-90"
          style={{
            width: "60px", 
            height: "150px", 
            backgroundImage: `url(${waterPumpBlueLeftBottom})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
          title="Water Pump 2"
          hidden={!gameState.waterPumps[1].on && !gameState.waterPumps[1].powered}
        >
          {/* No child divs needed for the pump visual */}
        </button>
        {/* Bottom-left pump in grey*/}
        <button
          onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
          disabled={gameState.isPaused}
          className="absolute bottom-20 -left-5 z-20 cursor-pointer disabled:cursor-not-allowed group -rotate-90"
          style={{
            width: "60px", 
            height: "150px", 
            backgroundImage: `url(${waterPumpGreyLeftBottom})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
          title="Water Pump 2"
          hidden={gameState.waterPumps[1].on && gameState.waterPumps[1].powered}
        >
          {/* No child divs needed for the pump visual */}
        </button>

        {/* Top-right pump in blue*/}
        <button
          onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
          disabled={gameState.isPaused}
          className="absolute top-40 -right-5 z-20 cursor-pointer disabled:cursor-not-allowed group rotate-90"
          style={{
            width: "60px", 
            height: "150px", 
            backgroundImage: `url(${waterPumpBlueRightTop})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
          title="Water Pump 3"
          hidden={!gameState.waterPumps[2].on && !gameState.waterPumps[2].powered}
        >
          {/* No child divs needed for the pump visual */}
        </button>

        {/* Top-right pump in grey*/}
        <button
          onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
          disabled={gameState.isPaused}
          className="absolute top-40 -right-5 z-20 cursor-pointer disabled:cursor-not-allowed group rotate-90"
          style={{
            width: "60px", 
            height: "150px", 
            backgroundImage: `url(${waterPumpGreyRightTop})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
          title="Water Pump 3"
          hidden={gameState.waterPumps[2].on && gameState.waterPumps[2].powered}
        >
          {/* No child divs needed for the pump visual */}
        </button>

        {/* Bottom-right pump in blue*/}
        <button
          onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
          disabled={gameState.isPaused}
          className="absolute bottom-20 -right-5 z-20 cursor-pointer disabled:cursor-not-allowed group rotate-90"
          style={{
            width: "60px", 
            height: "150px", 
            backgroundImage: `url(${waterPumpBlueRightBottom})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
          title="Water Pump 4"
          hidden={!gameState.waterPumps[3].on && !gameState.waterPumps[3].powered}
        >
          {/* No child divs needed for the pump visual */}
        </button>

        {/* Bottom-right pump in grey*/}
        <button
          onClick={() => !gameState.isPaused && setPumpsModalOpen(true)}
          disabled={gameState.isPaused}
          className="absolute bottom-20 -right-5 z-20 cursor-pointer disabled:cursor-not-allowed group rotate-90"
          style={{
            width: "60px", 
            height: "150px", 
            backgroundImage: `url(${waterPumpGreyRightBottom})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          }}
          title="Water Pump 4"
          hidden={gameState.waterPumps[3].on && gameState.waterPumps[3].powered}
        >
          {/* No child divs needed for the pump visual */}
        </button>
        
      </div> {/* End of Reactor + Pumps Anchor */}

      {/* BOTTOM TURBINE */}
      <button
        onClick={() => !gameState.isPaused && setTurbineModalOpen(true)}
        disabled={gameState.isPaused}
        className="-mt-4 relative cursor-pointer disabled:cursor-not-allowed group"
        title={`Turbine: ${
          gameState.turbineConnected ? "Connected" : "Disconnected"
        }`}
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
            <svg
              className="w-10 h-10 md:w-12 md:h-12 text-gray-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          </div>
        </div>
        <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-600 border border-gray-700 rounded-b mx-auto" />
      </button>
      
    </div> {/* End of Main Content Stack */}


    {/* Modals (UNTOUCHED) */}
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
