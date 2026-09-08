/**
 * **Ein Zufall, über den sich alle einig sind.**
 *
 * Das Haus entsteht auf jedem Gerät neu und muss überall dasselbe sein: Der
 * Archivar blättert in *diesem* Grundriss, der Späher sieht *diese* Konturen,
 * und der VR-Spieler läuft durch *dieses* Zimmer. Über die Leitung geht dafür
 * eine einzige Zahl — der Same —, und nicht das Haus.
 *
 * `Math.random()` kann das nicht: Er hat keinen Samen, und zwei Browser mit
 * demselben Samen wären trotzdem zwei verschiedene Häuser. Deshalb steht hier
 * ein eigener Generator, und er ist mit Absicht der langweiligste, den es
 * gibt — **mulberry32**, vier Zeilen, ein Zustand aus 32 Bit. Wir würfeln
 * Zimmer aus, keine Schlüssel.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // `>>> 0` macht aus jeder Zahl — auch aus einer negativen — dieselben
    // 32 Bit, mit denen die Rechnung unten arbeitet.
    this.state = seed >>> 0 || 0x9e3779b9;
  }

  /** Die nächste Zahl in `[0, 1)`. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Eine ganze Zahl in `[0, n)`. */
  int(n: number): number {
    return Math.floor(this.next() * Math.max(1, n));
  }

  /** Eine ganze Zahl in `[min, max]`, beide Enden eingeschlossen. */
  between(min: number, max: number): number {
    return min + this.int(max - min + 1);
  }

  /** Ob etwas passiert, mit der Wahrscheinlichkeit `p`. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Eines aus der Liste. Bei einer leeren Liste gibt es nichts zu wählen. */
  pick<T>(list: readonly T[]): T {
    return list[this.int(list.length)]!;
  }

  /**
   * Eine gemischte **Kopie** der Liste — Fisher-Yates.
   *
   * Eine Kopie und keine Vertauschung an Ort und Stelle: Die Listen, die hier
   * durchgehen, sind Tabellen aus Konstanten, und eine Tabelle, die sich beim
   * Würfeln umsortiert, ist beim zweiten Haus eine andere Tabelle.
   */
  shuffle<T>(list: readonly T[]): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }
}

/**
 * Aus einem Wort einen Samen — damit ein Raum-Code oder ein getippter Name als
 * Haus taugt. FNV-1a, weil es kurz ist und gleichmäßig streut.
 */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Ein frischer Same für eine neue Runde. */
export function rollSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
