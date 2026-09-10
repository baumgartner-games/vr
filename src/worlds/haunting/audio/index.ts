/**
 * **Paket Audio** — die eine Tür in dieses Paket (`BOUNDARIES.md`).
 *
 * Was hier nicht exportiert ist, ist kein Vertrag.
 */
export {
  Hearing,
  hearingGain,
  reachOf,
  roomIdAt,
  HEARING,
  DOOR_LOSS,
  WALL_LOSS,
  GLASS_LOSS,
  VENT_LOSS,
  type HearingPath,
  type HearingWorld,
} from './hearing';
export {
  AUDIO_CUES,
  CUE_IDS,
  NOISE,
  ASSET_PREFIX,
  SOUND_DIR,
  cueAssetId,
  stepLoudness,
  type AudioCue,
  type CueId,
  type CuePlaceholder,
} from './cues';
export { registerAudioCues, cueFiles } from './cues.register';
export {
  Soundscape,
  listenerOf,
  CHASE_RANGE,
  NEAR_RANGE,
  RUN_CADENCE,
  STALK_CADENCE,
  CALL_GAP,
  SECOND_BEAT,
  VENT_SCRAPE,
  AMBIENT_GAP,
  type AmbienceLevels,
  type Listener,
  type MonsterHints,
  type SoundscapeInput,
  type SoundEvent,
  type Mix,
} from './soundscape';
export { Mixer, MIXER_VOICES, type CueSource, type Voice } from './mixer';
export {
  LEVELS,
  DEFAULT_LEVELS,
  levelLabel,
  nextLevel,
  clampLevels,
  loadAudioLevels,
  saveAudioLevels,
  type AudioLevels,
  type Level,
} from './settings';
export { HauntingAudio, AUDIO_HZ } from './hauntingAudio';
