/**
 * **Welche Modelle aus dem Regal Lampen sind, und wo ihr Licht sitzt** —
 * reine Rechnung, ohne three.js.
 *
 * Die Modelle wissen nicht, dass sie leuchten könnten: Jedes ist ein Netz mit
 * einer Textur. Also steht hier je Datei, wo ihre Leuchten sitzen, als
 * **Anteile ihres Kastens** im eigenen Raum des Modells (0 = `min`, 1 = `max`
 * je Achse) — abgemessen an der Vorderansicht jeder Datei. Anteile statt
 * Meter, weil jede Welt die Modelle in ihrem eigenen Maßstab hinstellt. Ein
 * Wert über 1 liegt über dem Kasten: die Flamme über einer Kerze, die das
 * Modell selbst nicht hat.
 *
 * Erkannt wird ein Modell am Namen seiner Hülle — `kaykitModel.copyOf` setzt
 * ihn auf den Pfad der Datei, `pack/datei.glb`. Wer eine neue Lampe ins Spiel
 * bringen will, trägt sie hier ein; keine Welt muss davon wissen.
 *
 * Wie eine Lampe sich **verhält** (an bei Nacht, flackern, blinken …), steht
 * nicht hier, sondern in `lampBehaviour.ts` — hier steht nur der Typ mit
 * seinem Standard.
 */

import type { LampSettings } from './lampBehaviour';

/** Was eine Leuchte ist — ihre Farbe ab Werk und, bei der Ampel, ihr Platz im Umlauf. */
export type LampKind = 'lamp' | 'lantern' | 'flame' | 'cold' | 'red' | 'yellow' | 'green' | 'walk';

export interface LampSpot {
  kind: LampKind;
  /** Anteile des Kastens, 0–1 je Achse (darüber: außerhalb). */
  x: number;
  y: number;
  z: number;
}

export interface LampType {
  /** `pack/datei` ohne Endung — derselbe Name wie im Regal. */
  id: string;
  /** Wie die Lampe im Menü heißt. */
  label: string;
  spots: readonly LampSpot[];
  /** Ob unter der Lampe ein Lichtfleck auf dem Boden liegt. */
  pool: boolean;
  /**
   * **Wie weit ihr Licht reicht**, als Vielfaches ihrer eigenen Höhe — für den
   * Lichtfleck und das echte Licht. Eine Straßenlaterne leuchtet die Straße
   * aus, eine Kerze den Tisch.
   */
  reach: number;
  /** Wie hell ihr echtes Licht ist (0–1, 1 = Straßenlaterne). */
  power: number;
  /** Ob der Schein **im Gehäuse** sitzt und zur Kamera hin vorgezogen werden muss. */
  inset?: boolean;
  /** Was ab Werk gilt — eine Welt und jede einzelne Lampe dürfen es ändern. */
  defaults: LampSettings;
}

const spot = (kind: LampKind, x: number, y: number, z = 0.5): LampSpot => ({ kind, x, y, z });
const signal = (x: number, red: number, yellow: number, green: number): LampSpot[] => [
  spot('red', x, red, 1),
  spot('yellow', x, yellow, 1),
  spot('green', x, green, 1),
];

/** Was für die meisten gilt: an, sobald es Abend wird, ruhiges Licht. */
const NIGHT: LampSettings = { mode: 'night', effect: 'steady' };
/** Kerzen, Fackeln, Kürbisse: an bei Nacht, und sie flackern. */
const FLAME: LampSettings = { mode: 'night', effect: 'flicker' };
/** Was schon brennt (`candle_lit`, `torch_lit`): immer an — das Modell zeigt die Flamme ja. */
const BURNING: LampSettings = { mode: 'on', effect: 'flicker' };
/** Die Ampel schaltet ihren Umlauf, sobald sie leuchtet. */
const SIGNAL: LampSettings = { mode: 'night', effect: 'signal' };

function type(
  id: string,
  label: string,
  spots: readonly LampSpot[],
  options: Partial<Omit<LampType, 'id' | 'label' | 'spots'>> = {},
): LampType {
  return {
    id,
    label,
    spots,
    pool: options.pool ?? true,
    reach: options.reach ?? 0.9,
    power: options.power ?? 0.5,
    ...(options.inset ? { inset: true } : {}),
    defaults: options.defaults ?? NIGHT,
  };
}

const candle = (id: string, label: string, top: number, lit = false): LampType =>
  type(id, label, [spot('flame', 0.5, top)], {
    reach: 2.2,
    power: 0.12,
    defaults: lit ? BURNING : FLAME,
  });

/** Alle Lampen, die es im Regal gibt — nach ihrer Datei. */
export const LAMP_TYPES: readonly LampType[] = [
  // --- Straße (city-builder-bits) — abgemessen für die leuchtende Stadt -----
  type('city-builder-bits/streetlight', 'Straßenlaterne', [spot('lamp', 0.15, 0.92)], {
    reach: 0.5,
    power: 1,
  }),
  type('city-builder-bits/streetlight_old_single', 'Alte Laterne', [spot('lantern', 0.5, 0.84)], {
    reach: 0.5,
    power: 0.8,
    inset: true,
  }),
  type(
    'city-builder-bits/streetlight_old_double',
    'Doppellaterne',
    [spot('lantern', 0.19, 0.84), spot('lantern', 0.81, 0.84)],
    { reach: 0.5, power: 0.9, inset: true },
  ),
  type(
    'city-builder-bits/trafficlight_A',
    'Ampel',
    [...signal(0.79, 0.94, 0.85, 0.76), spot('walk', 0.21, 0.48, 1)],
    { pool: false, power: 0, inset: true, defaults: SIGNAL },
  ),
  type(
    'city-builder-bits/trafficlight_B',
    'Ampel mit Laterne',
    [spot('lamp', 0.14, 0.92), ...signal(0.84, 0.72, 0.65, 0.58), spot('walk', 0.5, 0.36, 1)],
    { reach: 0.5, power: 1, inset: true, defaults: SIGNAL },
  ),
  type(
    'city-builder-bits/trafficlight_C',
    'Ampelbrücke',
    [...signal(0.13, 0.96, 0.89, 0.82), spot('walk', 0.94, 0.46, 1)],
    { pool: false, power: 0, inset: true, defaults: SIGNAL },
  ),

  // --- Wohnung (furniture-bits) ----------------------------------------------
  type('furniture-bits/lamp_standing', 'Stehlampe', [spot('lamp', 0.5, 0.86)], {
    reach: 1.4,
    power: 0.45,
    inset: true,
  }),
  type('furniture-bits/lamp_table', 'Tischlampe', [spot('lamp', 0.5, 0.62)], {
    reach: 2.4,
    power: 0.3,
    inset: true,
  }),
  type('furniture-bits/lamp_desk', 'Schreibtischlampe', [spot('lamp', 0.5, 0.62, 0.75)], {
    reach: 1.6,
    power: 0.25,
    inset: true,
  }),
  type(
    'furniture-bits/lamp_desk_headphones',
    'Schreibtischlampe mit Kopfhörer',
    [spot('lamp', 0.48, 0.62, 0.75)],
    { reach: 1.6, power: 0.25, inset: true },
  ),

  // --- Kerzen und Fackeln (dungeon, halloween-bits, rpg-tools-bits) ----------
  candle('dungeon/candle', 'Kerze', 1.04),
  candle('dungeon/candle_lit', 'Brennende Kerze', 0.9, true),
  candle('dungeon/candle_melted', 'Heruntergebrannte Kerze', 1.04),
  candle('dungeon/candle_thin', 'Dünne Kerze', 1.04),
  candle('dungeon/candle_thin_lit', 'Brennende dünne Kerze', 0.88, true),
  type(
    'dungeon/candle_triple',
    'Drei Kerzen',
    [spot('flame', 0.82, 1.03), spot('flame', 0.32, 0.78), spot('flame', 0.74, 0.71)],
    { reach: 2.2, power: 0.16, defaults: FLAME },
  ),
  type(
    'dungeon/shelf_small_candles',
    'Kerzenbord',
    [spot('flame', 0.34, 1.0), spot('flame', 0.58, 0.85), spot('flame', 0.41, 0.75)],
    { reach: 1.8, power: 0.16, defaults: FLAME },
  ),
  type('dungeon/wall_inset_candles', 'Kerzennische', [spot('flame', 0.53, 0.37, 0.6)], {
    reach: 0.4,
    power: 0.2,
    defaults: FLAME,
  }),
  type('dungeon/torch', 'Fackel', [spot('flame', 0.5, 0.98)], {
    reach: 2,
    power: 0.35,
    defaults: FLAME,
  }),
  type('dungeon/torch_lit', 'Brennende Fackel', [spot('flame', 0.5, 0.9)], {
    reach: 2,
    power: 0.35,
    defaults: BURNING,
  }),
  type('dungeon/torch_mounted', 'Wandfackel', [spot('flame', 0.5, 0.97, 0.5)], {
    reach: 2,
    power: 0.35,
    defaults: FLAME,
  }),
  candle('halloween-bits/candle', 'Kerze', 1.04),
  candle('halloween-bits/candle_thin', 'Dünne Kerze', 1.04),
  candle('halloween-bits/candle_melted', 'Heruntergebrannte Kerze', 1.04),
  type(
    'halloween-bits/candle_triple',
    'Drei Kerzen',
    [spot('flame', 0.8, 1.03), spot('flame', 0.32, 0.78), spot('flame', 0.74, 0.71)],
    { reach: 2.2, power: 0.16, defaults: FLAME },
  ),
  type(
    'halloween-bits/skull_candle',
    'Totenkopf mit Kerzen',
    [spot('flame', 0.62, 1.02), spot('flame', 0.42, 0.9)],
    { reach: 1.6, power: 0.2, defaults: FLAME },
  ),
  type('halloween-bits/pumpkin_orange_jackolantern', 'Kürbislaterne', [spot('flame', 0.5, 0.4)], {
    reach: 1.2,
    power: 0.25,
    inset: true,
    defaults: FLAME,
  }),
  type('rpg-tools-bits/torch', 'Fackel', [spot('flame', 0.5, 0.97)], {
    reach: 2,
    power: 0.35,
    defaults: FLAME,
  }),

  // --- Laternen (halloween-bits, holiday-bits, rpg-tools-bits) ---------------
  type('halloween-bits/lantern_hanging', 'Hängelaterne', [spot('lantern', 0.5, 0.28)], {
    reach: 0.9,
    power: 0.35,
    inset: true,
    defaults: FLAME,
  }),
  type('halloween-bits/lantern_standing', 'Laterne', [spot('lantern', 0.5, 0.45)], {
    reach: 1.4,
    power: 0.35,
    inset: true,
    defaults: FLAME,
  }),
  type('halloween-bits/post_lantern', 'Laternenpfahl', [spot('lantern', 0.5, 0.62, 0.8)], {
    reach: 0.6,
    power: 0.6,
    inset: true,
    defaults: FLAME,
  }),
  type('holiday-bits/lantern', 'Gaslaterne', [spot('lantern', 0.5, 0.9)], {
    reach: 0.5,
    power: 0.9,
    inset: true,
  }),
  type('holiday-bits/lantern_decorated', 'Geschmückte Gaslaterne', [spot('lantern', 0.5, 0.9)], {
    reach: 0.5,
    power: 0.9,
    inset: true,
  }),
  type('holiday-bits/lantern_mini', 'Kleine Laterne', [spot('lantern', 0.5, 0.78)], {
    reach: 1.4,
    power: 0.2,
    inset: true,
  }),
  type('rpg-tools-bits/lantern', 'Laterne', [spot('flame', 0.5, 0.3)], {
    reach: 1.4,
    power: 0.3,
    inset: true,
    defaults: FLAME,
  }),

  // --- Station (space-base-bits) ---------------------------------------------
  type(
    'space-base-bits/lights',
    'Lichtmast',
    [spot('cold', 0.5, 0.92), spot('cold', 0.14, 0.96), spot('cold', 0.86, 0.96)],
    { reach: 1, power: 0.6 },
  ),
];

const BY_ID = new Map(LAMP_TYPES.map((one) => [one.id, one]));

/** Ein Typ nach seiner Id (`pack/datei`). */
export function lampType(id: string): LampType | null {
  return BY_ID.get(id) ?? null;
}

/**
 * **Welcher Lampentyp das ist**, aus dem Namen der Hülle
 * (`…/city-builder-bits/streetlight.glb`) — `null` für alles, was nicht
 * leuchtet. Nur die Hülle trägt die Endung `.glb`; ihr innerer Knoten heißt
 * wie die Datei ohne Endung und wird so nicht doppelt gezählt.
 */
export function lampTypeOfName(name: string): LampType | null {
  if (!name.endsWith('.glb')) return null;
  const match = /([^/]+\/[^/]+)\.glb$/.exec(name);
  return match ? lampType(match[1]!) : null;
}

/** Ein Umlauf der Ampel in Sekunden: Grün 6, Gelb 2, Rot 7, Rot-Gelb 1. */
export const SIGNAL_CYCLE = 16;

/**
 * **Welche Leuchten einer Ampel gerade an sind.** `cross` ist die Ampel, die
 * quer dazu steht: Sie läuft einen halben Umlauf versetzt, so dass die eine
 * Richtung Rot hat, solange die andere Grün und Gelb hat. Alles, was keine
 * Ampelfarbe ist, brennt.
 */
export function signalLit(kind: LampKind, time: number, cross: boolean): boolean {
  const t =
    (((time + (cross ? SIGNAL_CYCLE / 2 : 0)) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  const redYellow = t >= 15;
  switch (kind) {
    case 'green':
      return t < 6;
    case 'yellow':
      return (t >= 6 && t < 8) || redYellow;
    case 'red':
      return (t >= 8 && t < 15) || redYellow;
    default:
      return true;
  }
}

/** Die Fußgängerampel zeigt Grün, solange die Autos davor Rot haben. */
export function walkGreen(time: number, cross: boolean): boolean {
  return signalLit('red', time, cross);
}
