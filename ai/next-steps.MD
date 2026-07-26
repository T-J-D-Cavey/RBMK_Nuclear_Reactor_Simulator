# RBMK Simulator - Free Mode (Sandbox) Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for introducing a **Free Mode** (Sandbox Mode) to the RBMK Nuclear Reactor Simulator. 

Free Mode allows operators to experiment with reactor physics indefinitely without the pressure of a countdown timer, power targets from the grid controller, or random disruptive events (such as pump failures or power cuts). Reactor physics (heat, steam, radioactivity, xenon, and meltdowns) remain fully active.

---

## Architectural & Design Philosophy
To avoid "one-way door" decisions and ensure seamless addition of future game modes (e.g., **Power Test Mode** based on Chernobyl's infamous safety test, or Custom Scenarios), the system will move away from binary `difficultyIsHard: boolean` flags to an extensible, config-driven **Game Mode System**.

### Core Mode Configuration Schema (`lib/types.ts`)
```typescript
export type GameMode = 'easy' | 'hard' | 'free' | 'power_test'

export interface GameModeConfig {
  id: GameMode
  name: string
  badgeText: string
  description: string
  hasTimer: boolean
  timerMode: 'countdown' | 'countup'
  timeLimit: number | null // in seconds (e.g. 900 for easy, 1800 for hard, null for free)
  hasPowerTarget: boolean
  defaultPowerTarget: number | null // e.g. 5000 for standard, null for free
  hasRandomEvents: boolean
  performanceAffectsGameOver: boolean
}
```

---

## Step-by-Step Implementation Roadmap

### Step 1: Type Definitions & Mode Configuration
**Files to Modify:**
- `lib/types.ts`

**Tasks:**
1. Define the `GameMode` type union (`'easy' | 'hard' | 'free'`).
2. Create `GameModeConfig` interface and `GAME_MODE_CONFIGS` dictionary mapping modes to their behavior configurations.
3. Update `GameState` interface:
   - Add `mode: GameMode` (default `'easy'`).
   - Deprecate/retain `difficultyIsHard` for backwards compatibility (optional helper getter).
   - Make `timeLimit` nullable (`number | null`).
   - Make `powerTarget` nullable (`number | null`).
4. Update `INITIAL_GAME_STATE` with defaults.

**Verification Checkpoint:**
- Project compiles without TypeScript errors (`npm run build` or TS check).

---

### Step 2: Main Menu & Mode Selection Modal
**Files to Modify:**
- `components/difficulty-modal.tsx` (or rename to `mode-select-modal.tsx` / keep alias)
- `app/page.tsx`

**Tasks:**
1. Update `DifficultyModal` component to render three choices:
   - **Easy Mode** (15-min countdown, stable mechanics, target grid matching)
   - **Hard Mode** (30-min countdown, harder bounds & events)
   - **Free Mode** (Unlimited time, no power target, no random events, full reactor physics)
2. Update `onSelectDifficulty` signature in `DifficultyModal` to accept `GameMode` instead of `boolean`.
3. Update `app/page.tsx` state initializer:
   - Handle mode selection: set `mode`, set initial `gameTime` (0 for countup in Free Mode, 900/1800 for countdown in Easy/Hard).
   - Initialize `powerTarget` (`null` for Free Mode, 5000 for Easy/Hard).
   - Store initialized state into `localStorage` (`chernobyl-game-state`).

**Verification Checkpoint:**
- Clicking "Start Game" opens the modal with 3 distinct, styled option cards.
- Selecting Free Mode navigates to `/game` and saves `mode: 'free'` in `localStorage`.

---

### Step 3: Game Hook & Simulation Loop Logic
**Files to Modify:**
- `hooks/use-game-state.ts`

**Tasks:**
1. Update game tick timer logic in `useGameState`:
   - Check mode configuration (`mode === 'free'` or `GAME_MODE_CONFIGS[mode].timerMode`).
   - **Countup vs Countdown:** If `timerMode === 'countup'`, increment `gameTime` by 1 per tick (`gameTime + 1`). If `timerMode === 'countdown'`, decrement `gameTime` by 1 until 0.
   - **Victory Condition:** Skip timer-based victory (`hasWon = true`) when `hasTimer` is false or `timerMode === 'countup'`.
2. Disable random events triggering in `useGameState` if `hasRandomEvents` is `false`.

**Verification Checkpoint:**
- In Free Mode, time counter starts at `00:00:00` and ticks upwards every second.
- The game does NOT trigger a victory screen when time passes 15 or 30 minutes.

---

### Step 4: Game Mechanics & Events Handling
**Files to Modify:**
- `lib/game-events.ts`
- `lib/game-mechanics.ts`
- `lib/game-utils.ts`

**Tasks:**
1. **Event Suppression (`lib/game-events.ts`):**
   - Update `shouldTriggerEvent(state)`: return `false` immediately if `state.mode === 'free'` or `!GAME_MODE_CONFIGS[state.mode].hasRandomEvents`.
2. **Performance Calculation (`lib/game-mechanics.ts`):**
   - Update `calculatePerformance(state)`: If `state.powerTarget === null` (Free Mode), keep performance static at 100% (or skip performance degradation).
3. **Game Over Checks (`lib/game-utils.ts`):**
   - In `checkGameOver(state)`: If `state.mode === 'free'`, bypass the performance failure check (0% performance). Meltdown check (reactorTemp >= 1200°C) MUST still be active.

**Verification Checkpoint:**
- In Free Mode, no grid target events, power cuts, or stuck control rods occur.
- Meltdown still triggers if reactor temperature exceeds 1200°C.

---

### Step 5: Control Panel HUD Updates
**Files to Modify:**
- `components/control-panel.tsx`

**Tasks:**
1. **Power Target Display:**
   - If `gameState.powerTarget === null`, display `"N/A"` or `"FREE"` on the Power Target LED screen.
2. **Power Output Target Indicator:**
   - Update `isOnTarget` check: if `powerTarget === null`, set `isOnTarget = true` (or style neutral green).
3. **Performance LED:**
   - If Free Mode, display `"100%"` or `"SANDBOX"`.
4. **Time Display:**
   - Ensure `formatTime(gameState.gameTime)` correctly displays elapsed countup time for Free Mode.

**Verification Checkpoint:**
- Control panel correctly displays `"N/A"` for Power Target in Free Mode.
- Clock displays elapsed time starting from `00:00:00`.

---

### Step 6: Game Over & Victory Screens
**Files to Modify:**
- `components/game-over-screen.tsx`
- `components/success-screen.tsx`

**Tasks:**
1. **Game Over Screen (`components/game-over-screen.tsx`):**
   - Update header/badge to show selected mode (e.g. `FREE MODE`).
   - Change stat label from "Time Remaining" to "Time Elapsed" when in Free Mode.
2. **Success Screen (`components/success-screen.tsx`):**
   - Ensure mode badge displays `FREE MODE` correctly if accessed or tested.

**Verification Checkpoint:**
- Causing a meltdown in Free Mode shows Game Over screen displaying "Time Elapsed" and "FREE MODE" badge.

---

### Step 7: How to Play / Operating Manual Documentation
**Files to Modify:**
- `app/instructions/page.tsx`

**Tasks:**
1. Add a dedicated section or subsection in `Operating Manual` describing the **Game Modes**:
   - **Easy Mode:** 15-minute shift, stable mechanics, grid targets, random events.
   - **Hard Mode:** 30-minute shift, aggressive grid targets, frequent events, strict tolerances.
   - **Free Mode (Sandbox):** No time limit, no power targets, no random disruptions. Unlimited sandbox practice to test reactor physics and push core limits safely.

**Verification Checkpoint:**
- `/instructions` page clearly explains Free Mode alongside Easy and Hard modes.

---

### Step 8: Verification & Testing Checklist
- [ ] Main Menu start modal shows 3 modes with clear visual distinctions.
- [ ] Free Mode starts with `00:00:00` clock counting up.
- [ ] Free Mode displays `N/A` for power target and `100%` for performance.
- [ ] No random events trigger during extended gameplay in Free Mode.
- [ ] Meltdown can still be triggered at 1200°C.
- [ ] Game Over screen displays "Time Elapsed" for Free Mode.
- [ ] How to Play page includes full Free Mode documentation.
- [ ] Zero regression on Easy & Hard modes.
