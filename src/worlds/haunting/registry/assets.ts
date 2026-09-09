import { Registry, type Registered } from './registry';

/**
 * **Assets, die ein Paket mitbringt** — Klänge, Modelle, Kartensymbole.
 *
 * Kein Paket muss eine fremde Ladeliste erweitern: Audio meldet seine Cues
 * an, die 3D-Welt ihre Modellbauer, der 2D-Kern seine Symbole. Wer etwas
 * braucht, schlägt nach; wer nichts findet, hat einen Fallback und keinen
 * Absturz. Die Registry hält **Fabriken**, keine geladenen Daten — geladen
 * wird, wenn die Welt fragt, und nur dann.
 */
export type AssetKind = 'audio' | 'model' | 'mapIcon' | 'texture';

export interface AssetEntry extends Registered {
  readonly id: string;
  kind: AssetKind;
  /** Welches Paket es mitbringt (`BOUNDARIES.md`). */
  owner: string;
  /**
   * Die Fabrik. Was sie zurückgibt, hängt an `kind`: bei `audio` ein
   * `AudioBuffer`-Promise oder eine Synthese-Funktion, bei `model` ein
   * `THREE.Object3D`, bei `mapIcon` ein `Path2D` oder eine Zeichenfunktion.
   * Bewusst `unknown`: Die Verbraucher kennen ihre Sorte und prüfen sie.
   */
  load(): unknown;
}

export const assets = new Registry<AssetEntry>('assets');

export function registerAsset(entry: AssetEntry): AssetEntry {
  return assets.register(entry);
}

export function assetsOf(kind: AssetKind): AssetEntry[] {
  return assets.list().filter((entry) => entry.kind === kind);
}
