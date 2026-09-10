/**
 * **Paket Audio** — die eine Tür in dieses Paket (`BOUNDARIES.md`).
 *
 * Was hier nicht exportiert ist, ist kein Vertrag.
 */
export {
  Hearing,
  hearingGain,
  reachOf,
  PLAYER_HEARING,
  DOOR_LOSS,
  WALL_LOSS,
  GLASS_LOSS,
  type HearingPath,
  type HearingWorld,
} from './hearing';
export {
  AUDIO_CUES,
  CUE_IDS,
  ASSET_PREFIX,
  cueAssetId,
  stepLoudness,
  type AudioCue,
  type CueId,
  type CuePlaceholder,
} from './cues';
export { registerAudioCues } from './cues.register';
export {
  Soundscape,
  listenerOf,
  CHASE_RANGE,
  NEAR_RANGE,
  RUN_CADENCE,
  CALL_GAP,
  SECOND_BEAT,
  type Listener,
  type MonsterHints,
  type SoundscapeInput,
  type SoundEvent,
  type Mix,
} from './soundscape';
export { Mixer, MIXER_VOICES, type CueSource, type Voice } from './mixer';
export { HauntingAudio, AUDIO_HZ } from './hauntingAudio';
