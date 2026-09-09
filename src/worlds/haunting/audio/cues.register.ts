import { registerAsset, type AssetEntry } from '../registry';
import { AUDIO_CUES, CUE_IDS, cueAssetId } from './cues';

/**
 * Meldet die Cues des Pakets Audio in der Asset-Registry an — aus einer
 * eigenen Datei, wie `BOUNDARIES.md` es verlangt (`registry/discover.ts`
 * sammelt sie per Glob ein; `hauntingAudio.ts` importiert sie zusätzlich
 * direkt, damit das Headset sie auch ohne die 2D-Welt kennt).
 *
 * `load()` liefert heute den **Platzhalter** (`CuePlaceholder`). Wer eine
 * Aufnahme hat, gibt hier stattdessen ein `Promise<AudioBuffer>` zurück;
 * der Mixer versteht beides.
 */
export function registerAudioCues(): AssetEntry[] {
  return CUE_IDS.map((id) =>
    registerAsset({
      id: cueAssetId(id),
      kind: 'audio',
      owner: 'audio',
      load: () => AUDIO_CUES[id].placeholder,
    }),
  );
}

registerAudioCues();
