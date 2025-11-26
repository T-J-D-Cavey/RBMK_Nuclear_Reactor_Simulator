import { useEffect, useRef, useCallback } from "react";

interface AudioManagerProps {
  soundEnabled: boolean;
  soundVolume: number;
  generalAlarmIsNeeded: boolean;
  powerCutOrRodStuckAlarm: boolean;
  highRadAlarm: boolean;
  highReactorTempAlarm: boolean;
  highSteamOrXenon: boolean;
}

export function useAudioManager({
  soundEnabled,
  soundVolume,
  generalAlarmIsNeeded,
  powerCutOrRodStuckAlarm,
  highRadAlarm,
  highReactorTempAlarm,
  highSteamOrXenon
}: AudioManagerProps) {
  // --- REFS ---
  const humAudioRef1 = useRef<HTMLAudioElement | null>(null);
  const humAudioRef2 = useRef<HTMLAudioElement | null>(null);
  const humTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generalAlarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const powerCutOrRodStuckAlarmRef = useRef<HTMLAudioElement | null>(null);
  
  // FIX: Renamed these to include 'Ref' to avoid clashing with the boolean props
  const highRadAlarmRef = useRef<HTMLAudioElement | null>(null);
  const highReactorTempAlarmRef = useRef<HTMLAudioElement | null>(null);
  const highSteamOrXenonRef = useRef<HTMLAudioElement | null>(null);
  
  const isInitialized = useRef(false);

  // --- 1. Initialization ---
  const initializeAudio = useCallback(() => {
    if (isInitialized.current) return;

    // Setup Hum Track 1
    humAudioRef1.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/KvQGGKnHa58-WpqF4xeUSK/public/hum.mp3");
    humAudioRef1.current.loop = true;
    humAudioRef1.current.preload = "auto";

    // Setup Hum Track 2 (The Gap Filler)
    humAudioRef2.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/KvQGGKnHa58-WpqF4xeUSK/public/hum.mp3");
    humAudioRef2.current.loop = true;
    humAudioRef2.current.preload = "auto";

    generalAlarmAudioRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/foPf2rrWlckCsgQclQDbtS/public/beeb_loop_1.mp3");
    generalAlarmAudioRef.current.loop = true;
    generalAlarmAudioRef.current.preload = "auto";

    // Added leading slash for consistency
    powerCutOrRodStuckAlarmRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/9hJcTS9EGtu3Ny5W8-JnbV/public/rod_stuck_power_cut.mp3");
    powerCutOrRodStuckAlarmRef.current.loop = true;
    powerCutOrRodStuckAlarmRef.current.preload = "auto";

    highRadAlarmRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/7qUMgIOPMAWUArr7KtFnJB/public/high_radioactivity.mp3");
    highRadAlarmRef.current.loop = true;
    highRadAlarmRef.current.preload = "auto";

    highReactorTempAlarmRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/QjO0U2MDR7OOhXTZuityK7/public/high_reactor_temp.mp3");
    highReactorTempAlarmRef.current.loop = true;
    highReactorTempAlarmRef.current.preload = "auto";

    highSteamOrXenonRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/lsUOlNS1hPeFcsYksZxftt/public/general_alarm.mp3");
    highSteamOrXenonRef.current.loop = true;
    highSteamOrXenonRef.current.preload = "auto";

    isInitialized.current = true;
  }, []); 

  // Volume Management ---
  useEffect(() => {
    // Update volume for hum tracks
    if (humAudioRef1.current) humAudioRef1.current.volume = soundVolume;
    if (humAudioRef2.current) humAudioRef2.current.volume = soundVolume;
    
    if (generalAlarmAudioRef.current) generalAlarmAudioRef.current.volume = soundVolume;
    if (powerCutOrRodStuckAlarmRef.current) powerCutOrRodStuckAlarmRef.current.volume = soundVolume;
    if (highRadAlarmRef.current) highRadAlarmRef.current.volume = soundVolume;
    if (highReactorTempAlarmRef.current) highReactorTempAlarmRef.current.volume = soundVolume;
    if (highSteamOrXenonRef.current) highSteamOrXenonRef.current.volume = soundVolume;
  }, [soundVolume]);

  // Hum Logic 
  useEffect(() => {
    if (!humAudioRef1.current || !humAudioRef2.current) return;

    if (soundEnabled) {
      humAudioRef1.current.play().catch((e) => console.warn("Hum 1 blocked", e));

      humTimeoutRef.current = setTimeout(() => {
        if (humAudioRef2.current && soundEnabled) {
            humAudioRef2.current.play().catch((e) => console.warn("Hum 2 blocked", e));
        }
      }, 2000); 
    } else {
      if (humTimeoutRef.current) clearTimeout(humTimeoutRef.current);

      humAudioRef1.current.pause();
      humAudioRef1.current.currentTime = 0;
      
      humAudioRef2.current.pause();
      humAudioRef2.current.currentTime = 0;
    }
  }, [soundEnabled]);

  // General Alarm Logic
  useEffect(() => {
    if (!generalAlarmAudioRef.current) return;

    if (soundEnabled && generalAlarmIsNeeded) {
      generalAlarmAudioRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      generalAlarmAudioRef.current.pause();
      generalAlarmAudioRef.current.currentTime = 0;
    }
  }, [soundEnabled, generalAlarmIsNeeded]);

  // Rod stuck power cut logic
  useEffect(() => {
    if (!powerCutOrRodStuckAlarmRef.current) return;

    if (soundEnabled && powerCutOrRodStuckAlarm) {
      powerCutOrRodStuckAlarmRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      powerCutOrRodStuckAlarmRef.current.pause();
      powerCutOrRodStuckAlarmRef.current.currentTime = 0;
    }
  }, [soundEnabled, powerCutOrRodStuckAlarm]);

    // Radioactivity logic
  useEffect(() => {
    if (!highRadAlarmRef.current) return;

    if (soundEnabled && highRadAlarm) {
      highRadAlarmRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      highRadAlarmRef.current.pause();
      highRadAlarmRef.current.currentTime = 0;
    }
  }, [soundEnabled, highRadAlarm]);

    // High reactor temp logic
    useEffect(() => {
    if (!highReactorTempAlarmRef.current) return;

    if (soundEnabled && highReactorTempAlarm) {
      highReactorTempAlarmRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      highReactorTempAlarmRef.current.pause();
      highReactorTempAlarmRef.current.currentTime = 0;
    }
  }, [soundEnabled, highReactorTempAlarm]);

      // High steam or low xenon temp logic
    useEffect(() => {
    if (!highSteamOrXenonRef.current) return;

    if (soundEnabled && highSteamOrXenon) {
      highSteamOrXenonRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      highSteamOrXenonRef.current.pause();
      highSteamOrXenonRef.current.currentTime = 0;
    }
  }, [soundEnabled, highSteamOrXenon]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (humTimeoutRef.current) clearTimeout(humTimeoutRef.current);

      if (humAudioRef1.current) { humAudioRef1.current.pause(); humAudioRef1.current = null; }
      if (humAudioRef2.current) { humAudioRef2.current.pause(); humAudioRef2.current = null; }
      
      if (generalAlarmAudioRef.current) { generalAlarmAudioRef.current.pause(); generalAlarmAudioRef.current = null; }
      if (powerCutOrRodStuckAlarmRef.current) { powerCutOrRodStuckAlarmRef.current.pause(); powerCutOrRodStuckAlarmRef.current = null; }
      
      if (highRadAlarmRef.current) { highRadAlarmRef.current.pause(); highRadAlarmRef.current = null; }
      if (highReactorTempAlarmRef.current) { highReactorTempAlarmRef.current.pause(); highReactorTempAlarmRef.current = null; }
      if (highSteamOrXenonRef.current) { highSteamOrXenonRef.current.pause(); highSteamOrXenonRef.current = null; }
    };
  }, []);

  return { initializeAudio };
}
