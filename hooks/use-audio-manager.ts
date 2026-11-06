import { useEffect, useRef, useCallback } from "react";
import { eventCues, LONG_EFFECTS, newWarningAppeared, OVERLAPPING_EFFECTS, ROD_BURST_MS, ROD_BURST_OFFSET, ROD_DRIVE_FILE, ROD_DRIVE_OFFSETS, rodsSnagged, SOUND_EFFECT_FILES, targetCue, turbineTripCue, type SoundEffect } from "@/lib/sound-cues";
import type { ControlRod, GameEvent } from "@/lib/types";
import { RodDriveBurst, RodDriveVoices } from "@/lib/rod-drive-voices";
import { HumBed } from "@/lib/hum-bed";

const HUM_FILE = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr/XVA0IQMpaTFFPj7AMJYm8k/public/hum_full.mp3";
const HUM_VOICES = 3;

// Alarm clips. The file names don't match the alarms: the general alarm plays alarm_high_rad_full.mp3 and high
// radioactivity plays the more urgent alarm_backup_full.mp3 (owner, 2026-10-23). Every event sounds the event alarm,
// a clip of its own the owner provided, served from public/sounds (2026-11-02).
const BLOB = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/git-blob/prj_L1nuMYO7yz6mS0HjQz107XLumQHr";
const GENERAL_ALARM_FILE = `${BLOB}/w11O2GBJNi4hmwrAnLDkDo/public/alarm_high_rad_full.mp3`;
const EVENT_ALARM_FILE = "/sounds/new_event_alarm.mp3";
const HIGH_RAD_ALARM_FILE = `${BLOB}/UDO0NctHis6Id7aEJ8C770/public/alarm_backup_full.mp3`;
const HIGH_REACTOR_TEMP_ALARM_FILE = `${BLOB}/sHWXXkF7pXyeOxSzfh7fp7/public/alarm_high_reactor_temp_full.mp3`;
const HIGH_STEAM_OR_XENON_ALARM_FILE = `${BLOB}/b84OkunKQm0YQMc1KakN6o/public/alarm_high_steam_full.mp3`;
const ALARM_VOLUME = 1 / 3; // alarms, relative to the volume slider

interface AudioManagerProps {
  alarmsOn: boolean; // the sound modal's Alarms switch, off while paused
  effectsOn: boolean; // the sound modal's Sound Effects switch, off while paused
  pressesOn: boolean; // that switch alone: the keys the player presses still sound during a pause
  soundVolume: number;
  generalAlarmIsNeeded: boolean;
  eventAlarm: boolean;
  highRadAlarm: boolean;
  highReactorTempAlarm: boolean;
  highSteamOrXenon: boolean;
  // Sound effect triggers (plan §8 Q5)
  loaded: boolean; // the saved game has loaded: warnings and messages already in it don't count as new
  rodsMoving: number;
  controlRods: ControlRod[];
  warningKeys: string[];
  lastLogId: string | undefined;
  powerOnTarget: boolean | null; // null when there is no power target
  activeEvents: GameEvent[];
  turbineTripped: boolean;
}

export function useAudioManager({
  alarmsOn,
  effectsOn,
  pressesOn,
  soundVolume,
  generalAlarmIsNeeded,
  eventAlarm,
  highRadAlarm,
  highReactorTempAlarm,
  highSteamOrXenon,
  loaded,
  rodsMoving,
  controlRods,
  warningKeys,
  lastLogId,
  powerOnTarget,
  activeEvents,
  turbineTripped,
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
  const rodBurstRef = useRef<RodDriveBurst | null>(null);
  const effectsOnRef = useRef(effectsOn);
  effectsOnRef.current = effectsOn;
  const pressesOnRef = useRef(pressesOn);
  pressesOnRef.current = pressesOn;
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

    // Event alarm (power cuts, pump trips, signal losses, rod jams, turbine trips)
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
    rodBurstRef.current = new RodDriveBurst(new Audio(ROD_DRIVE_FILE), ROD_BURST_OFFSET, ROD_BURST_MS);
    rodBurstRef.current.setVolume(volumeRef.current);
    setAlarmVolume(volumeRef.current);

    isInitialized.current = true;
  }, [setAlarmVolume]);

  // Volume Management ---
  useEffect(() => {
    humRef.current?.setVolume(soundVolume);
    setAlarmVolume(soundVolume);
    rodDriveRef.current?.setVolume(soundVolume);
    rodBurstRef.current?.setVolume(soundVolume);
    for (const audio of effectAudioRef.current.values()) audio.volume = soundVolume;
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

  // Event alarm: power cuts, pump trips, signal losses, rod jams and turbine trips
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
  const playClip = useCallback((effect: SoundEffect) => {
    const loaded = effectAudioRef.current.get(SOUND_EFFECT_FILES[effect]);
    if (!loaded) return;
    // A clip already playing is restarted, unless it's one that plays on top of itself: that gets a second copy
    const audio = !loaded.paused && OVERLAPPING_EFFECTS.includes(effect) ? (loaded.cloneNode() as HTMLAudioElement) : loaded;
    audio.currentTime = 0;
    audio.volume = volumeRef.current;
    audio.play().catch((e) => console.warn("Sound effect blocked", e));
  }, []);

  // A one-off clip the game sets off, which stays silent while it's paused
  const playEffect = useCallback((effect: SoundEffect) => {
    if (effectsOnRef.current) playClip(effect);
  }, [playClip]);

  // A clip for something the player has pressed. It sounds during a pause too, or Play would be silent. This runs before
  // the press reaches the page's own handler, so it starts the audio itself, or the first press would be lost.
  const playPress = useCallback((effect: SoundEffect) => {
    if (!pressesOnRef.current) return;
    initializeAudio();
    playClip(effect);
  }, [initializeAudio, playClip]);

  // The run clips stop with the game, or with the Sound Effects switch, and pick up where they left off
  const interruptedRef = useRef(new Set<HTMLAudioElement>());
  useEffect(() => {
    for (const effect of LONG_EFFECTS) {
      const audio = effectAudioRef.current.get(SOUND_EFFECT_FILES[effect]);
      if (!audio) continue;
      if (!effectsOn && !audio.paused) {
        audio.pause();
        interruptedRef.current.add(audio);
      } else if (effectsOn && interruptedRef.current.delete(audio)) {
        audio.play().catch((e) => console.warn("Sound effect blocked", e));
      }
    }
  }, [effectsOn]);

  // Rod drive: one voice per moving rod, up to three; silent while paused or with the effects off
  useEffect(() => {
    if (effectsOn) rodDriveRef.current?.setCount(rodsMoving);
    else rodDriveRef.current?.silence();
  }, [effectsOn, rodsMoving]);

  // A rod has jammed or gone slow: a short burst of the rod drive, cut off if the game pauses
  useEffect(() => {
    if (!effectsOn) rodBurstRef.current?.stop();
  }, [effectsOn]);
  const prevRods = useRef<ControlRod[] | null>(null); // null until the save has loaded
  useEffect(() => {
    if (!loaded) return;
    const prev = prevRods.current;
    prevRods.current = controlRods;
    if (prev && effectsOnRef.current && rodsSnagged(prev, controlRods)) rodBurstRef.current?.play();
  }, [loaded, controlRods]);

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

  // Event clips: a power cut, a pump trip or the signal from the reactor hall going. Events already running in a saved
  // game have had theirs.
  const knownEventIds = useRef<string[] | null>(null); // null until the save has loaded
  useEffect(() => {
    if (!loaded) return;
    const known = knownEventIds.current;
    knownEventIds.current = activeEvents.map((event) => event.id);
    if (known) for (const cue of eventCues(known, activeEvents)) playEffect(cue);
  }, [loaded, activeEvents, playEffect]);

  // The turbine trips: a saved game already tripped has had its clip
  const wasTripped = useRef<boolean | null>(null); // null until the save has loaded
  useEffect(() => {
    if (!loaded) return;
    const cue = turbineTripCue(wasTripped.current, turbineTripped);
    wasTripped.current = turbineTripped;
    if (cue) playEffect(cue);
  }, [loaded, turbineTripped, playEffect]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (humRef.current) { humRef.current.stop(); humRef.current = null; }
      
      if (generalAlarmAudioRef.current) { generalAlarmAudioRef.current.pause(); generalAlarmAudioRef.current = null; }
      if (eventAlarmRef.current) { eventAlarmRef.current.pause(); eventAlarmRef.current = null; }
      
      if (highRadAlarmRef.current) { highRadAlarmRef.current.pause(); highRadAlarmRef.current = null; }
      if (highReactorTempAlarmRef.current) { highReactorTempAlarmRef.current.pause(); highReactorTempAlarmRef.current = null; }
      if (highSteamOrXenonRef.current) { highSteamOrXenonRef.current.pause(); highSteamOrXenonRef.current = null; }

      // Only the run clips stop: Quit and Main Menu leave this page, and their click has to ring out
      for (const effect of LONG_EFFECTS) effectAudioRef.current.get(SOUND_EFFECT_FILES[effect])?.pause();
      effectAudioRef.current.clear();
      if (rodDriveRef.current) { rodDriveRef.current.dispose(); rodDriveRef.current = null; }
      if (rodBurstRef.current) { rodBurstRef.current.stop(); rodBurstRef.current = null; }
    };
  }, []);

  return { initializeAudio, playPress };
}
