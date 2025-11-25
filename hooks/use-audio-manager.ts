import { useEffect, useRef, useCallback } from "react";

interface AudioManagerProps {
  soundEnabled: boolean;
  soundVolume: number;
  generalAlarmIsNeeded: boolean;
  // Add other alarm trigger booleans here later
}

export function useAudioManager({soundEnabled, soundVolume, generalAlarmIsNeeded}: AudioManagerProps) {
  const humAudioRef = useRef<HTMLAudioElement | null>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const isInitialized = useRef(false);

  // --- 1. Initialization (Must be called by a user interaction) ---
  const initializeAudio = useCallback(() => {
    if (isInitialized.current) return;

    humAudioRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/KvQGGKnHa58-WpqF4xeUSK/public/hum.mp3");
    humAudioRef.current.loop = true;
    humAudioRef.current.preload = "auto";

    alarmAudioRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/lsUOlNS1hPeFcsYksZxftt/public/general_alarm.mp3");
    alarmAudioRef.current.loop = true;
    alarmAudioRef.current.preload = "auto";

    isInitialized.current = true;
  }, []);

  // --- 2. Volume Management (Separate Effect) ---
  // We separate this so changing volume doesn't restart the sound tracks
  useEffect(() => {
    if (humAudioRef.current) humAudioRef.current.volume = soundVolume;
    if (alarmAudioRef.current) alarmAudioRef.current.volume = soundVolume; 
  }, [soundVolume]);

  // --- 3. Hum Logic ---
  useEffect(() => {
    if (!humAudioRef.current) return;

    if (soundEnabled) {
      // Browsers return a Promise on play(). We should catch errors (like autoplay blocks)
      const playPromise = humAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Audio play blocked (user interaction needed):", error);
        });
      }
    } else {
      humAudioRef.current.pause();
    }
  }, [soundEnabled]);

  // --- 4. Alarm Logic ---
  useEffect(() => {
    if (!alarmAudioRef.current) return;

    // Only play alarm if sound is enabled AND alarm is needed
    if (soundEnabled && generalAlarmIsNeeded) {
      const playPromise = alarmAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => console.warn("Alarm play blocked:", error));
      }
    } else {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0; // Reset alarm to start
    }
  }, [soundEnabled, generalAlarmIsNeeded]);

  // --- 5. Cleanup on Unmount ---
  useEffect(() => {
    return () => {
      if (humAudioRef.current) {
        humAudioRef.current.pause();
        humAudioRef.current = null;
      }
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current = null;
      }
    };
  }, []);

  // Return the init function so the UI can trigger it
  return { initializeAudio };
}
