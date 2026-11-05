"use client"

import { createContext, useContext } from "react"
import type { SoundEffect } from "@/lib/sound-cues"

// The sound a key makes as it's pressed. The game page provides it, so anywhere outside the game, such as the home
// page, its keys are simply silent.
export const SoundEffectContext = createContext<(effect: SoundEffect) => void>(() => {})

export const useSoundEffect = () => useContext(SoundEffectContext)
