import { useEffect, useRef, useCallback } from "react";
import { newWarningAppeared, ROD_DRIVE_FILE, ROD_DRIVE_OFFSETS, SOUND_EFFECT_FILES, targetCue, type SoundEffect } from "@/lib/sound-cues";
import { RodDriveVoices } from "@/lib/rod-drive-voices";
import { HumBed } from "@/lib/hum-bed";

const HUM_FILE = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/XVA0IQMpaTFFPj7AMJYm8k/public/hum_full.mp3";
const HUM_VOICES = 3;

// Alarm clips. The file names don't match the alarms: the general alarm plays alarm_high_rad_full.mp3 and high
// radioactivity plays the more urgent alarm_backup_full.mp3 (owner, 2026-10-23); the event alarm's clip is named for
// rod jams, which now sound the general alarm instead.
const BLOB = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr";
const GENERAL_ALARM_FILE = `${BLOB}/w11O2GBJNi4hmwrAnLDkDo/public/alarm_high_rad_full.mp3`;
const EVENT_ALARM_FILE = `${BLOB}/56DSNdysYjjBozGYYRqcym/public/alarm_rod_stuck_full.mp3`;
const HIGH_RAD_ALARM_FILE = `${BLOB}/UDO0NctHis6Id7aEJ8C770/public/alarm_backup_full.mp3`;
const HIGH_REACTOR_TEMP_ALARM_FILE = `${BLOB}/sHWXXkF7pXyeOxSzfh7fp7/public/alarm_high_reactor_temp_full.mp3`;
const HIGH_STEAM_OR_XENON_ALARM_FILE = `${BLOB}/b84OkunKQm0YQMc1KakN6o/public/alarm_high_steam_full.mp3`;
const ALARM_VOLUME = 1 / 3; // alarms, relative to the volume slider

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
  powerOnTarget: boolean | null; // null when there is no power target
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
  powerOnTarget,
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

  // The alarms play at a third of the volume the slider sets (owner, 2026-10-19: at full volume they were too loud).
  // Sound effects keep the slider's volume.
  const setAlarmVolume = useCallback((volume: number) => {
    const alarms = [generalAlarmAudioRef, eventAlarmRef, highRadAlarmRef, highReactorTempAlarmRef, highSteamOrXenonRef];
    for (const alarm of alarms) if (alarm.current) alarm.current.volume = volume * ALARM_VOLUME;
  }, []);

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

    // Each alarm is one looping element, so it plays once however many of its warnings are showing
    generalAlarmAudioRef.current = new Audio(GENERAL_ALARM_FILE);
    generalAlarmAudioRef.current.loop = true;
    generalAlarmAudioRef.current.preload = "auto";

    // Event alarm (power cuts, pump trips, turbine trips)
    eventAlarmRef.current = new Audio(EVENT_ALARM_FILE);
    eventAlarmRef.current.loop = true;
    eventAlarmRef.current.preload = "auto";

    highRadAlarmRef.current = new Audio(HIGH_RAD_ALARM_FILE);
    highRadAlarmRef.current.loop = true;
    highRadAlarmRef.current.preload = "auto";

    highReactorTempAlarmRef.current = new Audio(HIGH_REACTOR_TEMP_ALARM_FILE);
    highReactorTempAlarmRef.current.loop = true;
    highReactorTempAlarmRef.current.preload = "auto";

    highSteamOrXenonRef.current = new Audio(HIGH_STEAM_OR_XENON_ALARM_FILE);
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
    setAlarmVolume(volumeRef.current);

    isInitialized.current = true;
  }, [setAlarmVolume]);

  // Volume Management ---
  useEffect(() => {
    humRef.current?.setVolume(soundVolume);
    setAlarmVolume(soundVolume);
    rodDriveRef.current?.setVolume(soundVolume);
  }, [soundVolume, setAlarmVolume]);

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

  // Event alarm: power cuts, pump trips and turbine trips
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
    if (effectsOn) rodDriveRef.current?.setCount(rodsMoving);
    else rodDriveRef.current?.silence();
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

  // Target cues: the power output has moved back inside its target range, or out of it
  const prevOnTarget = useRef<boolean | null | undefined>(undefined); // undefined until the save has loaded
  useEffect(() => {
    if (!loaded) return;
    const prev = prevOnTarget.current;
    prevOnTarget.current = powerOnTarget;
    if (prev === undefined) return;
    const cue = targetCue(prev, powerOnTarget);
    if (cue) playEffect(cue);
  }, [loaded, powerOnTarget, playEffect]);

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
