import type { PeerPose } from '../../../net/types';
import { TILE } from '../../nav/navTile';
import { APRON } from '../house';
import type { StationId } from '../stations';

/**
 * **Die Plätze der Einsatzzentrale** — reine Rechnung, ohne three.js.
 *
 * Bis Oktober 2026 standen die vier Geräte (Rot, Gelb, Blau, Monster) als
 * Monitore auf **einem** Tisch, davor vier Hocker dicht an dicht. Gewünscht:
 * _„Die computer müssen weiter auseinander stehen."_ und _„die einzelnen
 * computer mit Rot, Blau, etc. sollen bitte getrennt voneinander stehen."_
 * Jetzt hat jeder Farbplatz seinen eigenen Schreibtisch mit Rechner, vier Meter
 * vom nächsten, und davor einen Bürostuhl, durch den man hindurchgeht (_„vor
 * den computern der anderen spieler steht auch ein büro stuhl (durch den man
 * aber gehen kann […])"_). Das Monster hat keinen Rechner mehr: Es ist ein
 * Anzug am Ständer wie der des Technikers (`commandRoom.MONSTER_SPOT`).
 *
 * Wer am Rechner sitzt, sitzt für die anderen auf dem Stuhl davor
 * (`crewPlacement`) — die Pose rechnet der **Empfänger**, weil nur er die
 * Zentrale kennt und ein älteres Gerät sonst wieder am Spawn stünde.
 */
export interface CommandDesk {
  station: Extract<StationId, 'red' | 'yellow' | 'blue'>;
  /** Die Farbe des Schilds — dieselbe wie der Platz am Telefon (`haunting.css`). */
  colour: number;
  /** Die Nordwestecke des Schreibtischs, in Kacheln (2 × 1, nach Süden). */
  tileX: number;
  tileZ: number;
  /** Wo der Stuhl davor steht — die Mitte, in Metern. */
  x: number;
  z: number;
}

/** Die Reihe der Schreibtische: fünf Meter vor der Nordwand, im Westen der Zentrale. */
export const DESK_ROW = APRON.z + 5;
/** So weit stehen die Schreibtische auseinander, in Kacheln. */
export const DESK_STEP = 4;
/** Wie weit der Stuhl vor der Vorderkante des Tischs steht, in Metern. */
export const CHAIR_GAP = 0.35;
/** Augenhöhe auf dem Stuhl: Sitzfläche plus ein sitzender Oberkörper. */
export const SEATED_EYE = 1.2;
/** Augenhöhe im Stehen — die eines Desktop-Rigs. */
export const STANDING_EYE = 1.6;
/** Abstand in der stehenden Reihe — Schulter an Schulter, nicht ineinander. */
export const STANDING_STEP = 0.7;

const DESK_ORDER: ReadonlyArray<[CommandDesk['station'], number]> = [
  ['red', 0xff6b6b],
  ['yellow', 0xffc857],
  ['blue', 0x4aa8ff],
];

/** Die drei Schreibtische, von West nach Ost. */
export const COMMAND_DESKS: readonly CommandDesk[] = DESK_ORDER.map(([station, colour], index) => {
  const tileX = APRON.x + 3 + index * DESK_STEP;
  return {
    station,
    colour,
    tileX,
    tileZ: DESK_ROW,
    x: (tileX + 1) * TILE,
    z: (DESK_ROW + 1) * TILE + CHAIR_GAP,
  };
});

/** Wer keinen Stuhl hat — der Fernseher, weggeschubst —, steht hinter den Stühlen. */
export const STANDING_ROW = (DESK_ROW + 1) * TILE + CHAIR_GAP + 1.2;

/** Der Schreibtisch eines Geräts — `null` für das Monster und den Fernseher. */
export function deskOf(station: StationId): CommandDesk | null {
  return COMMAND_DESKS.find((desk) => desk.station === station) ?? null;
}

/** Wer wo hingehört — die Eingabe der Rechnung, je Mitspieler der Zentrale. */
export interface CrewSeat {
  id: string;
  /** Das Gerät, das ihm gehört — `null` vor dem Fernseher, weggeschubst oder noch ohne. */
  station: StationId | null;
}

/**
 * Eine Pose, die nach Norden schaut — zum Schreibtisch und seinem Bildschirm.
 * Die Einheitsdrehung blickt in three.js nach `-z`, und der Tisch steht bei
 * kleinerem `z` als der Stuhl.
 */
function facingDesk(x: number, y: number, z: number): PeerPose {
  return { head: [x, y, z, 0, 0, 0, 1], left: null, right: null };
}

/**
 * **Wo jeder aus der Zentrale sitzt oder steht.**
 *
 * Wer einen Farbplatz besitzt, sitzt auf dem Stuhl vor dessen Schreibtisch.
 * Alle anderen mit einem Gerät — der Fernseher — stehen in einer Reihe hinter
 * den Stühlen, nach Kennung sortiert: Die Reihenfolge soll von Bild zu Bild
 * dieselbe sein, und die Kennung ist das Einzige, was jeder Client von jedem
 * gleich kennt.
 *
 * Reine Funktion: dieselbe Eingabe, dieselben Posen.
 */
export function crewPlacement(crew: readonly CrewSeat[]): Map<string, PeerPose> {
  const out = new Map<string, PeerPose>();
  const standing: string[] = [];
  for (const one of crew) {
    const desk = one.station ? deskOf(one.station) : null;
    if (desk && !out.has(one.id)) out.set(one.id, facingDesk(desk.x, SEATED_EYE, desk.z));
    else standing.push(one.id);
  }
  standing.sort();
  const middle = COMMAND_DESKS[1]!.x;
  standing.forEach((id, index) => {
    const x = middle + (index - (standing.length - 1) / 2) * STANDING_STEP;
    out.set(id, facingDesk(x, STANDING_EYE, STANDING_ROW));
  });
  return out;
}
