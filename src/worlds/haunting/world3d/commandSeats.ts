import type { PeerPose } from '../../../net/types';
import { TILE } from '../../nav/navTile';
import { APRON_INNER } from '../house';
import type { StationId } from '../stations';

/**
 * **Die Einsatzzentrale sitzt auch im Schiff** — reine Rechnung, ohne three.js.
 *
 * Wer am Handy oder am Bildschirm in der Zentrale spielt, hat im Schiff kein
 * Rig, das er bewegt: Seine Pose über die Leitung ist die Stelle, an der die
 * Welt ihn beim Betreten abgesetzt hat (`COMMAND_HOME`), und dort stand er
 * dann — mitten auf dem Vorplatz, als Spieler, der nie einen Schritt tut, und
 * mit jedem weiteren Telefon einer mehr in derselben Stelle. Der Wunsch des
 * Besitzers: **nicht als Spieler spawnen, sondern gleich an die Sitzplätze.**
 *
 * Also rechnet die Brille (und jeder andere 3D-Client) die Pose der Zentrale
 * selbst: Wer ein Gerät besitzt (`stations.seatOf`), sitzt auf dem Hocker
 * dieses Geräts, mit dem Gesicht zum Tisch und zu seinem Monitor; wer vor dem
 * Fernseher steht oder noch kein Gerät hat, steht in einer Reihe hinter den
 * Hockern. Die Pose kommt vom Empfänger und nicht vom Sender, aus zwei
 * Gründen: Nur der Empfänger kennt den Tisch (er baut ihn, `buildVan`), und
 * eine Ansage über die Leitung wäre mit jeder älteren Fassung eines Telefons
 * wieder die Stelle vom Spawn.
 *
 * **Die Hocker sind die Geräte** (`stations.ts`): Rot, Gelb, Blau, das
 * Monster — einer je Gerät, in der Reihenfolge, in der die Reiter der
 * Zentrale sie nennen. Der Fernseher (`watch`) hat keinen: Vor ihm dürfen
 * mehrere stehen, und ein Hocker, auf dem drei sitzen, wäre ein Hocker mit
 * drei Leuten ineinander.
 */
export interface CommandStool {
  station: Exclude<StationId, 'watch'>;
  /** Die Farbe des Monitors und des Sitzes — dieselbe wie der Reiter am Telefon (`haunting.css`). */
  colour: number;
  x: number;
  z: number;
}

/** Wer wo hingehört — die Eingabe der Rechnung, je Mitspieler der Zentrale. */
export interface CrewSeat {
  id: string;
  /** Das Gerät, das ihm gehört — `null` vor dem Fernseher, weggeschubst oder noch ohne. */
  station: StationId | null;
}

/** Die Mitte des Tischs: an der Fensterfront der Kantine, westlich vom Rückkehrpunkt. */
export const COMMAND_TABLE = { x: -5, z: (APRON_INNER + 0.05) * TILE } as const;
/** Ein Monitor je Hocker, so weit auseinander. */
export const STOOL_STEP = 0.6;
/** Die Hocker stehen südlich vom Tisch — zwischen Tisch und Haus steht die Brille. */
export const STOOL_ROW = COMMAND_TABLE.z + 1.3;
/** Wer keinen Hocker hat, steht noch eine Reihe weiter hinten. */
export const STANDING_ROW = COMMAND_TABLE.z + 2.1;
/** Abstand in der stehenden Reihe — Schulter an Schulter, nicht ineinander. */
export const STANDING_STEP = 0.7;
/** Augenhöhe auf dem Hocker: Sitzfläche bei 0,56 m plus ein sitzender Oberkörper. */
export const SEATED_EYE = 1.2;
/** Augenhöhe im Stehen — die eines Desktop-Rigs. */
export const STANDING_EYE = 1.6;

const STOOL_ORDER: ReadonlyArray<[CommandStool['station'], number]> = [
  ['red', 0xff6b6b],
  ['yellow', 0xffc857],
  ['blue', 0x4aa8ff],
  ['monster', 0xff4d55],
];

/** Die vier Hocker, von West nach Ost, mittig vor dem Tisch. */
export const COMMAND_STOOLS: readonly CommandStool[] = STOOL_ORDER.map(
  ([station, colour], index) => ({
    station,
    colour,
    x: COMMAND_TABLE.x + (index - (STOOL_ORDER.length - 1) / 2) * STOOL_STEP,
    z: STOOL_ROW,
  }),
);

/** Der Hocker eines Geräts — `null` für den Fernseher, der keinen hat. */
export function stoolOf(station: StationId): CommandStool | null {
  return COMMAND_STOOLS.find((stool) => stool.station === station) ?? null;
}

/**
 * Eine Pose, die nach Norden schaut — zum Tisch, zum Monitor, zur Scheibe.
 * Die Einheitsdrehung blickt in three.js nach `-z`, und der Tisch steht bei
 * kleinerem `z` als die Hocker.
 */
function facingTable(x: number, y: number, z: number): PeerPose {
  return { head: [x, y, z, 0, 0, 0, 1], left: null, right: null };
}

/**
 * **Wo jeder aus der Zentrale im Schiff steht oder sitzt.**
 *
 * Wer ein Gerät mit Hocker besitzt, sitzt darauf. Alle anderen — vor dem
 * Fernseher, weggeschubst, noch ohne Platz — stehen in der Reihe dahinter,
 * nach ihrer Kennung sortiert: Die Reihenfolge soll von Bild zu Bild dieselbe
 * sein, und die Kennung ist das Einzige, was jeder Client von jedem gleich
 * kennt. Kommt einer dazu, rückt die Reihe auf — der Schritt ist kurz, und
 * die Glättung der Avatare macht daraus einen Schritt und keinen Sprung.
 *
 * Reine Funktion: dieselbe Eingabe, dieselben Posen — die Brille rechnet sie
 * ein paarmal in der Sekunde neu.
 */
export function crewPlacement(crew: readonly CrewSeat[]): Map<string, PeerPose> {
  const out = new Map<string, PeerPose>();
  const standing: string[] = [];
  for (const one of crew) {
    const stool = one.station ? stoolOf(one.station) : null;
    if (stool && !out.has(one.id)) out.set(one.id, facingTable(stool.x, SEATED_EYE, stool.z));
    else standing.push(one.id);
  }
  standing.sort();
  standing.forEach((id, index) => {
    const x = COMMAND_TABLE.x + (index - (standing.length - 1) / 2) * STANDING_STEP;
    out.set(id, facingTable(x, STANDING_EYE, STANDING_ROW));
  });
  return out;
}
