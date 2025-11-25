import { useEffect, useRef, useCallback } from "react";

interface AudioManagerProps {
  soundEnabled: boolean;
  soundVolume: number;
  generalAlarmIsNeeded: boolean;
  powerCutOrRodStuckAlarm: boolean;
}

export function useAudioManager({
  soundEnabled,
  soundVolume,
  generalAlarmIsNeeded,
  powerCutOrRodStuckAlarm
}: AudioManagerProps) {
  // --- REFS ---
  const humAudioRef1 = useRef<HTMLAudioElement | null>(null);
  const humAudioRef2 = useRef<HTMLAudioElement | null>(null);
  const humTimeoutRef = useRef<NodeJS.Timeout | null>(null); // To store the timer ID

  const generalAlarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const powerCutOrRodStuckAlarmRef = useRef<HTMLAudioElement | null>(null);
  
  const isInitialized = useRef(false);

  // --- 1. Initialization ---
  const initializeAudio = useCallback(() => {
    if (isInitialized.current) return;

    // Setup Hum Track 1
    humAudioRef1.current = new Audio("/hum.mp3");
    humAudioRef1.current.loop = true;
    humAudioRef1.current.preload = "auto";

    // Setup Hum Track 2 (The Gap Filler)
    humAudioRef2.current = new Audio("/hum.mp3");
    humAudioRef2.current.loop = true;
    humAudioRef2.current.preload = "auto";

    generalAlarmAudioRef.current = new Audio("/general_alarm.mp3");
    generalAlarmAudioRef.current.loop = true;
    generalAlarmAudioRef.current.preload = "auto";
    generalAlarmAudioRef.current.volume = Math.max(0, soundVolume - 0.2);

    powerCutOrRodStuckAlarmRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/9hJcTS9EGtu3Ny5W8-JnbV/public/good_loop_rod_stuck.mp3");
    powerCutOrRodStuckAlarmRef.current.loop = true;
    powerCutOrRodStuckAlarmRef.current.preload = "auto";
    powerCutOrRodStuckAlarmRef.current.volume = Math.max(0, soundVolume - 0.4);

    isInitialized.current = true;
  }, []); 

  // --- 2. Volume Management ---
  useEffect(() => {
    // Update volume for BOTH hum tracks
    if (humAudioRef1.current) humAudioRef1.current.volume = soundVolume;
    if (humAudioRef2.current) humAudioRef2.current.volume = soundVolume;
    if (generalAlarmAudioRef.current) generalAlarmAudioRef.current.volume = Math.max(0, soundVolume - 0.2);
    if (powerCutOrRodStuckAlarmRef.current) powerCutOrRodStuckAlarmRef.current.volume = Math.max(0, soundVolume - 0.4);
  }, [soundVolume]);

  // --- 3. Hum Logic (The Overlay Strategy) ---
  useEffect(() => {
    // Return early if audio hasn't been initialized yet
    if (!humAudioRef1.current || !humAudioRef2.current) return;

    if (soundEnabled) {
      // 1. Play the first track immediately
      humAudioRef1.current.play().catch((e) => console.warn("Hum 1 blocked", e));

      // 2. Set a timer to play the second track 4 seconds later
      // This offsets the loops so they don't hit the silence at the same time
      humTimeoutRef.current = setTimeout(() => {
        // Double check sound is still enabled before playing
        if (humAudioRef2.current && soundEnabled) {
            humAudioRef2.current.play().catch((e) => console.warn("Hum 2 blocked", e));
        }
      }, 4000); // 4 Second Delay

    } else {
      // 1. Clear the timeout if we turn sound off before the 4 seconds are up
      if (humTimeoutRef.current) {
        clearTimeout(humTimeoutRef.current);
      }

      // 2. Pause and Reset BOTH tracks
      humAudioRef1.current.pause();
      humAudioRef1.current.currentTime = 0;
      
      humAudioRef2.current.pause();
      humAudioRef2.current.currentTime = 0;
    }
  }, [soundEnabled]);

  // --- 4. General Alarm Logic ---
  useEffect(() => {
    if (!generalAlarmAudioRef.current) return;

    if (soundEnabled && generalAlarmIsNeeded) {
      generalAlarmAudioRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      generalAlarmAudioRef.current.pause();
      generalAlarmAudioRef.current.currentTime = 0;
    }
  }, [soundEnabled, generalAlarmIsNeeded]);

  // --- 5. Rod stuck Logic ---
  useEffect(() => {
    if (!powerCutOrRodStuckAlarmRef.current) return;

    if (soundEnabled && powerCutOrRodStuckAlarm) {
      powerCutOrRodStuckAlarmRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      powerCutOrRodStuckAlarmRef.current.pause();
      powerCutOrRodStuckAlarmRef.current.currentTime = 0;
    }
  }, [soundEnabled, powerCutOrRodStuckAlarm]);

  // --- 6. Cleanup ---
  useEffect(() => {
    return () => {
      // Clear timeout
      if (humTimeoutRef.current) clearTimeout(humTimeoutRef.current);

      // Cleanup Hum 1
      if (humAudioRef1.current) {
        humAudioRef1.current.pause();
        humAudioRef1.current = null;
      }
      // Cleanup Hum 2
      if (humAudioRef2.current) {
        humAudioRef2.current.pause();
        humAudioRef2.current = null;
      }
      // Cleanup Alarms
      if (generalAlarmAudioRef.current) {
        generalAlarmAudioRef.current.pause();
        generalAlarmAudioRef.current = null;
      }
      if (powerCutOrRodStuckAlarmRef.current) {
        powerCutOrRodStuckAlarmRef.current.pause();
        powerCutOrRodStuckAlarmRef.current = null;
      }
    };
  }, []);

  return { initializeAudio };
}
