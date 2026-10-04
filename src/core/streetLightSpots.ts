/**
 * **Wo an Laterne und Ampel das Licht sitzt** — reine Rechnung, ohne three.js.
 *
 * Die Modelle kommen aus dem Regal (`city-builder-bits`) und wissen nicht,
 * dass sie leuchten könnten: Jedes ist ein Netz mit einer Textur. Also steht
 * hier, wo ihre Leuchten sitzen, als **Anteile ihres Kastens** im eigenen
 * Raum des Modells (0 = `min`, 1 = `max` je Achse) — abgemessen an der
 * Vorderansicht der sechs Dateien. Anteile statt Meter, weil jede Welt die
 * Modelle in ihrem eigenen Maßstab hinstellt.
 *
 * Die Ampeln schauen im Modell nach +z, die Leuchten liegen deshalb vorn
 * (`z` 1). Laternen strahlen nach unten und werfen einen Lichtfleck auf den
 * Boden (`pool`).
 */

/** Welche Farbe eine Leuchte hat — die Ampel schaltet ihre drei durch. */
export type LampKind = 'lamp' | 'lantern' | 'red' | 'yellow' | 'green' | 'walk';

export interface LampSpot {
  kind: LampKind;
  /** Anteile des Kastens, 0–1 je Achse. */
  x: number;
  y: number;
  z: number;
}

export interface StreetLightModel {
  spots: readonly LampSpot[];
  /** Ob unter den Laternen-Leuchten ein Lichtfleck auf dem Boden liegt. */
  pool: boolean;
}

const lamp = (x: number, y: number): LampSpot => ({ kind: 'lamp', x, y, z: 0.5 });
/** Die alten Laternen: Das Licht sitzt im Glas, und das Glas leuchtet mit. */
const lantern = (x: number, y: number): LampSpot => ({ kind: 'lantern', x, y, z: 0.5 });
const signal = (x: number, red: number, yellow: number, green: number): LampSpot[] => [
  { kind: 'red', x, y: red, z: 1 },
  { kind: 'yellow', x, y: yellow, z: 1 },
  { kind: 'green', x, y: green, z: 1 },
];
const walk = (x: number, y: number): LampSpot => ({ kind: 'walk', x, y, z: 1 });

/** Die sechs Dateien des Regals, nach ihrem Namen ohne Endung. */
export const STREET_LIGHT_MODELS: Readonly<Record<string, StreetLightModel>> = {
  streetlight: { spots: [lamp(0.15, 0.92)], pool: true },
  streetlight_old_single: { spots: [lantern(0.5, 0.84)], pool: true },
  streetlight_old_double: { spots: [lantern(0.19, 0.84), lantern(0.81, 0.84)], pool: true },
  trafficlight_A: { spots: [...signal(0.79, 0.94, 0.85, 0.76), walk(0.21, 0.48)], pool: false },
  trafficlight_B: {
    spots: [lamp(0.14, 0.92), ...signal(0.84, 0.72, 0.65, 0.58), walk(0.5, 0.36)],
    pool: true,
  },
  trafficlight_C: { spots: [...signal(0.13, 0.96, 0.89, 0.82), walk(0.94, 0.46)], pool: false },
};

/**
 * **Welches Modell das ist**, aus dem Namen der Hülle (`kaykitModel.copyOf`
 * setzt ihn auf den Pfad der Datei) — `null` für alles, was nicht leuchtet.
 */
export function streetLightModel(name: string): StreetLightModel | null {
  const match = /(streetlight(?:_old_single|_old_double)?|trafficlight_[ABC])\.glb$/.exec(name);
  return match ? (STREET_LIGHT_MODELS[match[1]!] ?? null) : null;
}

/** Ein Umlauf der Ampel in Sekunden: Grün 6, Gelb 2, Rot 7, Rot-Gelb 1. */
export const SIGNAL_CYCLE = 16;

/**
 * **Welche Leuchten einer Ampel gerade an sind.** `cross` ist die Ampel, die
 * quer dazu steht: Sie läuft einen halben Umlauf versetzt, so dass die eine
 * Richtung Rot hat, solange die andere Grün und Gelb hat.
 */
export function signalLit(kind: LampKind, time: number, cross: boolean): boolean {
  const t =
    (((time + (cross ? SIGNAL_CYCLE / 2 : 0)) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  const green = t < 6;
  const yellow = t >= 6 && t < 8;
  const redYellow = t >= 15;
  const red = (t >= 8 && t < 15) || redYellow;
  switch (kind) {
    case 'lamp':
    case 'lantern':
      return true;
    case 'green':
      return green;
    case 'yellow':
      return yellow || redYellow;
    case 'red':
      return red;
    case 'walk':
      return true;
  }
}

/** Die Fußgängerampel zeigt Grün, solange die Autos daneben Rot haben. */
export function walkGreen(time: number, cross: boolean): boolean {
  return signalLit('red', time, cross);
}
