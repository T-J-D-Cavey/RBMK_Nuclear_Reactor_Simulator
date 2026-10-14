import { useEffect, useRef, useCallback } from "react";
import { newWarningAppeared, ROD_DRIVE_FILE, ROD_DRIVE_OFFSETS, SOUND_EFFECT_FILES, type SoundEffect } from "@/lib/sound-cues";
import { RodDriveVoices } from "@/lib/rod-drive-voices";
import { HumBed } from "@/lib/hum-bed";

const HUM_FILE = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/XVA0IQMpaTFFPj7AMJYm8k/public/hum_full.mp3";
const HUM_VOICES = 3;

interface AudioManagerProps {
  alarmsOn: boolean; // the sound modal's Alarms switch, off while paused
  effectsOn: boolean; // the sound modal's Sound Effects switch, off while paused
  soundVolume: number;
  generalAlarmIsNeeded: boolean;
  eventAlarm: boolean;
  highRadAlarm: boolean;
  highReactorTempAlarm: boolean;
  highSteamOrXenon: boolean;
  // Sound effect triggers (plan §8 Q5)
  loaded: boolean; // the saved game has loaded: warnings and messages already in it don't count as new
  rodsMoving: number;
  warningKeys: string[];
  lastLogId: string | undefined;
}

export function useAudioManager({
  alarmsOn,
  effectsOn,
  soundVolume,
  generalAlarmIsNeeded,
  eventAlarm,
  highRadAlarm,
  highReactorTempAlarm,
  highSteamOrXenon,
  loaded,
  rodsMoving,
  warningKeys,
  lastLogId,
}: AudioManagerProps) {
  // --- REFS ---
  const humRef = useRef<HumBed | null>(null);

  const generalAlarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const eventAlarmRef = useRef<HTMLAudioElement | null>(null);
  
  // FIX: Renamed these to include 'Ref' to avoid clashing with the boolean props
  const highRadAlarmRef = useRef<HTMLAudioElement | null>(null);
  const highReactorTempAlarmRef = useRef<HTMLAudioElement | null>(null);
  const highSteamOrXenonRef = useRef<HTMLAudioElement | null>(null);
  
  // Sound effects: one element per clip (rods and the turbine share theirs), and the rod drive's voices
  const effectAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const rodDriveRef = useRef<RodDriveVoices | null>(null);
  const effectsOnRef = useRef(effectsOn);
  effectsOnRef.current = effectsOn;
  const volumeRef = useRef(soundVolume);
  volumeRef.current = soundVolume;

  const isInitialized = useRef(false);

  // --- 1. Initialization ---
  const initializeAudio = useCallback(() => {
    if (isInitialized.current) return;

    // Hum: three voices of the same clip, fading in and out at different points
    humRef.current = new HumBed(
      Array.from({ length: HUM_VOICES }, () => {
        const audio = new Audio(HUM_FILE);
        audio.loop = true; // in case a pass runs past the end of the clip
        audio.preload = "auto";
        return audio;
      }),
    );
    humRef.current.setVolume(volumeRef.current);
    if (effectsOnRef.current) humRef.current.start();

    generalAlarmAudioRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/UDO0NctHis6Id7aEJ8C770/public/alarm_backup_full.mp3");
    generalAlarmAudioRef.current.loop = true;
    generalAlarmAudioRef.current.preload = "auto";

    // Event alarm (rod jams, pump trips, turbine trips)
    eventAlarmRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/56DSNdysYjjBozGYYRqcym/public/alarm_rod_stuck_full.mp3");
    eventAlarmRef.current.loop = true;
    eventAlarmRef.current.preload = "auto";

    highRadAlarmRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/w11O2GBJNi4hmwrAnLDkDo/public/alarm_high_rad_full.mp3");
    highRadAlarmRef.current.loop = true;
    highRadAlarmRef.current.preload = "auto";

    highReactorTempAlarmRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/sHWXXkF7pXyeOxSzfh7fp7/public/alarm_high_reactor_temp_full.mp3");
    highReactorTempAlarmRef.current.loop = true;
    highReactorTempAlarmRef.current.preload = "auto";

    highSteamOrXenonRef.current = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/b84OkunKQm0YQMc1KakN6o/public/alarm_high_steam_full.mp3");
    highSteamOrXenonRef.current.loop = true;
    highSteamOrXenonRef.current.preload = "auto";

    for (const file of new Set(Object.values(SOUND_EFFECT_FILES))) {
      const audio = new Audio(file);
      audio.preload = "auto";
      effectAudioRef.current.set(file, audio);
    }

    rodDriveRef.current = new RodDriveVoices(
      ROD_DRIVE_OFFSETS.map(() => {
        const audio = new Audio(ROD_DRIVE_FILE);
        audio.loop = true; // in case a rod is still travelling when the clip runs out
        audio.preload = "auto";
        return audio;
      }),
      ROD_DRIVE_OFFSETS,
    );
    rodDriveRef.current.setVolume(volumeRef.current);

    isInitialized.current = true;
  }, []); 

  // Volume Management ---
  useEffect(() => {
    humRef.current?.setVolume(soundVolume);
    
    if (generalAlarmAudioRef.current) generalAlarmAudioRef.current.volume = soundVolume;
    if (eventAlarmRef.current) eventAlarmRef.current.volume = soundVolume;
    if (highRadAlarmRef.current) highRadAlarmRef.current.volume = soundVolume;
    if (highReactorTempAlarmRef.current) highReactorTempAlarmRef.current.volume = soundVolume;
    if (highSteamOrXenonRef.current) highSteamOrXenonRef.current.volume = soundVolume;
    rodDriveRef.current?.setVolume(soundVolume);
  }, [soundVolume]);

  // Hum Logic 
  useEffect(() => {
    if (effectsOn) humRef.current?.start();
    else humRef.current?.stop();
  }, [effectsOn]);

  // General Alarm Logic
  useEffect(() => {
    if (!generalAlarmAudioRef.current) return;

    if (alarmsOn && generalAlarmIsNeeded) {
      generalAlarmAudioRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      generalAlarmAudioRef.current.pause();
      generalAlarmAudioRef.current.currentTime = 0;
    }
  }, [alarmsOn, generalAlarmIsNeeded]);

  // Event alarm: rod jams, pump trips and turbine trips
  useEffect(() => {
    if (!eventAlarmRef.current) return;

    if (alarmsOn && eventAlarm) {
      eventAlarmRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      eventAlarmRef.current.pause();
      eventAlarmRef.current.currentTime = 0;
    }
  }, [alarmsOn, eventAlarm]);

    // Radioactivity logic
  useEffect(() => {
    if (!highRadAlarmRef.current) return;

    if (alarmsOn && highRadAlarm) {
      highRadAlarmRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      highRadAlarmRef.current.pause();
      highRadAlarmRef.current.currentTime = 0;
    }
  }, [alarmsOn, highRadAlarm]);

    // High reactor temp logic
    useEffect(() => {
    if (!highReactorTempAlarmRef.current) return;

    if (alarmsOn && highReactorTempAlarm) {
      highReactorTempAlarmRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      highReactorTempAlarmRef.current.pause();
      highReactorTempAlarmRef.current.currentTime = 0;
    }
  }, [alarmsOn, highReactorTempAlarm]);

      // High steam or high xenon logic
    useEffect(() => {
    if (!highSteamOrXenonRef.current) return;

    if (alarmsOn && highSteamOrXenon) {
      highSteamOrXenonRef.current.play().catch((e) => console.warn("Alarm play blocked:", e));
    } else {
      highSteamOrXenonRef.current.pause();
      highSteamOrXenonRef.current.currentTime = 0;
    }
  }, [alarmsOn, highSteamOrXenon]);

  // --- Sound effects ---
  // A one-off clip, from the start. Rod, pump and turbine confirmations and AZ-5 come from the control panel.
  const playEffect = useCallback((effect: SoundEffect) => {
    const audio = effectAudioRef.current.get(SOUND_EFFECT_FILES[effect]);
    if (!audio || !effectsOnRef.current) return;
    audio.currentTime = 0;
    audio.volume = volumeRef.current;
    audio.play().catch((e) => console.warn("Sound effect blocked", e));
  }, []);

  // Rod drive: one voice per moving rod, up to three; silent while paused or with the effects off
  useEffect(() => {
    rodDriveRef.current?.setCount(effectsOn ? rodsMoving : 0);
  }, [effectsOn, rodsMoving]);

  // Warning bleep: a warning has appeared on the alarm monitor (alongside its alarm)
  const warningKeysText = warningKeys.join("|");
  const prevWarningKeys = useRef<string[] | null>(null);
  const warningGoneAt = useRef(new Map<string, number>());
  useEffect(() => {
    if (!loaded) return;
    const keys = warningKeysText ? warningKeysText.split("|") : [];
    const prev = prevWarningKeys.current;
    prevWarningKeys.current = keys;
    if (prev && newWarningAppeared(prev, keys, warningGoneAt.current, Date.now())) playEffect("warningBleep");
  }, [loaded, warningKeysText, playEffect]);

  // Shift log printer: a new message has arrived in the shift log
  const knownLogId = useRef<string | undefined | null>(null); // null until the save has loaded
  useEffect(() => {
    if (!loaded) return;
    if (knownLogId.current === null) {
      knownLogId.current = lastLogId;
      return;
    }
    if (lastLogId === knownLogId.current) return;
    knownLogId.current = lastLogId;
    if (lastLogId !== undefined) playEffect("shiftLogPrinter");
  }, [loaded, lastLogId, playEffect]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (humRef.current) { humRef.current.stop(); humRef.current = null; }
      
      if (generalAlarmAudioRef.current) { generalAlarmAudioRef.current.pause(); generalAlarmAudioRef.current = null; }
      if (eventAlarmRef.current) { eventAlarmRef.current.pause(); eventAlarmRef.current = null; }
      
      if (highRadAlarmRef.current) { highRadAlarmRef.current.pause(); highRadAlarmRef.current = null; }
      if (highReactorTempAlarmRef.current) { highReactorTempAlarmRef.current.pause(); highReactorTempAlarmRef.current = null; }
      if (highSteamOrXenonRef.current) { highSteamOrXenonRef.current.pause(); highSteamOrXenonRef.current = null; }

      for (const audio of effectAudioRef.current.values()) audio.pause();
      effectAudioRef.current.clear();
      if (rodDriveRef.current) { rodDriveRef.current.dispose(); rodDriveRef.current = null; }
    };
  }, []);

  return { initializeAudio, playEffect };
}
