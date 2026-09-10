import { sharedAudio } from '../../../core/Audio';
import { registerAsset, type AssetEntry } from '../registry';
import { AUDIO_CUES, CUE_IDS, SOUND_DIR, cueAssetId, type AudioCue } from './cues';

/**
 * Meldet die Cues des Pakets Audio in der Asset-Registry an — aus einer
 * eigenen Datei, wie `BOUNDARIES.md` es verlangt (`registry/discover.ts`
 * sammelt sie per Glob ein; `hauntingAudio.ts` importiert sie zusätzlich
 * direkt, damit das Headset sie auch ohne die 2D-Welt kennt).
 *
 * `load()` liefert die **Dateien** des Cues als Versprechen auf ihre Bytes
 * (`public/audio/haunting/`, CC0, Quellen in `CREDITS.md` dort); der Mixer
 * entpackt sie, sobald er einen Kontext hat, und nimmt bis dahin den
 * Platzhalter. Ohne Seite, ohne `fetch` oder ohne Audiogerät (Jest, ein
 * Browser ohne Web Audio) gibt es gleich den Platzhalter — und keinen
 * einzigen Netzzugriff.
 */
export function registerAudioCues(): AssetEntry[] {
  return CUE_IDS.map((id) =>
    registerAsset({
      id: cueAssetId(id),
      kind: 'audio',
      owner: 'audio',
      load: () => cueFiles(AUDIO_CUES[id]) ?? AUDIO_CUES[id].placeholder,
    }),
  );
}

/** Die Bytes der Dateien eines Cues, oder `null`, wenn es hier keine geben kann. */
export function cueFiles(cue: AudioCue): Promise<ArrayBuffer[]> | null {
  if (!cue.files.length) return null;
  if (typeof document === 'undefined' || typeof fetch !== 'function') return null;
  if (!sharedAudio()) return null;
  const base = document.baseURI;
  return Promise.allSettled(
    cue.files.map((file) =>
      fetch(new URL(`${SOUND_DIR}${file}`, base).toString()).then((response) => {
        if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
        return response.arrayBuffer();
      }),
    ),
  ).then((results) => {
    const bytes: ArrayBuffer[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') bytes.push(result.value);
      else console.warn(`Audio: ${cue.id} —`, result.reason);
    }
    if (!bytes.length) throw new Error(`Audio: keine Datei für ${cue.id}`);
    return bytes;
  });
}

registerAudioCues();
