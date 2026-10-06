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
 * Jetzt hat jeder Farbplatz seinen eigenen Schreibtisch mit Rechner, an einer
 * Seitenwand, und davor einen Bürostuhl, durch den man hindurchgeht (_„vor
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
  /**
   * Die Nordwestecke des Schreibtischs, in Kacheln — er steht quer an einer
   * Seitenwand, eine Kachel breit und zwei tief.
   */
  tileX: number;
  tileZ: number;
  /** Wohin der Schreibtisch schaut — von der Wand weg, in den Raum. */
  face: 'E' | 'W';
  /** Wo der Stuhl davor steht — die Mitte, in Metern. */
  x: number;
  z: number;
  /** Wohin man auf dem Stuhl schaut, um die Hochachse — zum Tisch, an die Wand. */
  yaw: number;
}

/**
 * **Die Schreibtische stehen an den Seitenwänden** — seit die Zentrale
 * quadratisch ist (16 × 14, `house.APRON`), ist die Mitte für das Hologramm
 * frei (`commandRoom.HOLOGRAM_SPOT`), und um sie herum stehen die Plätze wie
 * auf einer Brücke: Rot und Gelb im Westen, Blau im Osten.
 */
export const DESK_ROW = APRON.z + 3;
/** Wie weit der zweite Tisch einer Wand südlich vom ersten steht, in Kacheln. */
export const DESK_STEP = 5;
/** Wie weit die Mitte des Stuhls vor der Vorderkante des Tischs steht, in Metern. */
export const CHAIR_GAP = 0.5;
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

/** Die drei Schreibtische: Rot und Gelb an der Westwand, Blau an der Ostwand. */
export const COMMAND_DESKS: readonly CommandDesk[] = DESK_ORDER.map(([station, colour], index) => {
  const west = index !== 2;
  const tileX = west ? APRON.x : APRON.x + APRON.w - 1;
  const tileZ = DESK_ROW + (index === 1 ? DESK_STEP : 0);
  return {
    station,
    colour,
    tileX,
    tileZ,
    face: west ? 'E' : 'W',
    x: west ? (tileX + 1) * TILE + CHAIR_GAP : tileX * TILE - CHAIR_GAP,
    z: (tileZ + 1) * TILE,
    // Die Einheitsdrehung blickt nach −z; eine Vierteldrehung links herum
    // nach Westen.
    yaw: west ? Math.PI / 2 : -Math.PI / 2,
  };
});

/**
 * Wer keinen Stuhl hat — der Fernseher, weggeschubst —, steht südlich vom
 * Hologramm und schaut darauf.
 */
export const STANDING_ROW = (APRON.z + 10) * TILE;

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
 * Eine Pose, die zum Schreibtisch und seinem Bildschirm schaut — `yaw` um die
 * Hochachse; die Einheitsdrehung blickt in three.js nach `-z`.
 */
function facingDesk(x: number, y: number, z: number, yaw = 0): PeerPose {
  return {
    head: [x, y, z, 0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)],
    left: null,
    right: null,
  };
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
    if (desk && !out.has(one.id)) out.set(one.id, facingDesk(desk.x, SEATED_EYE, desk.z, desk.yaw));
    else standing.push(one.id);
  }
  standing.sort();
  const middle = (APRON.x + APRON.w / 2) * TILE;
  standing.forEach((id, index) => {
    const x = middle + (index - (standing.length - 1) / 2) * STANDING_STEP;
    out.set(id, facingDesk(x, STANDING_EYE, STANDING_ROW));
  });
  return out;
}
