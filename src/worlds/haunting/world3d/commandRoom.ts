import type { ElementSpot } from '../../elements/elementPlace';
import { TILE } from '../../nav/navTile';
import { APRON } from '../house';
import type { FloorBounds } from '../stationLayout';

/**
 * **Die Einsatzzentrale als Raum, in dem man herumläuft** — reine Rechnung,
 * ohne three.js.
 *
 * Gewünscht (Oktober 2026): _„Auch die techniker mit dem handy bekommen ganz
 * normal rumlaufende charaktere wie spieler von oben, können nur mit einem
 * computer in der einsatzzentrale interagieren um deren plätze dort
 * einzunehmen. Zudem spawnen spieler nicht alle an der selben stelle in der
 * einsatz zentrale, sondern haben plätze (abhängig welcher spieler nummer
 * diese sind). Der techniker muss den techniker anzug ausrüsten der als
 * interaktion item rumsteht […]. Es gibt zu dem an der oberen wand einen
 * Computer wo an der wand steht Verbindung."_
 *
 * Hier steht, **wo** das alles ist: die Startplätze je Spielernummer, der
 * Anzugständer und der Rechner _Verbindung_ an der Nordwand (oben im Bild von
 * oben — die Kamera schaut nach Norden, `core/TopDownCamera.ts`). Was man
 * damit tut, entscheidet `HauntingWorld`.
 *
 * Die Zentrale ist der Vorplatz (`APRON`, 40 × 5 m): die Nordwand mit Konsole
 * (x −4,6…−1,8) und Titelschild (x −1,7…1,7), der Tisch mit den vier
 * Monitoren westlich der Mitte (`commandSeats.COMMAND_TABLE`), im Süden die
 * Fensterfront zur Kantine mit der Schleuse in der Mitte, im Nordosten der
 * Aufzug (`COMMAND_LIFT`).
 */

/** Die Nordwand der Zentrale, als Kachelreihe — dort stehen Rechner und Anzug. */
const NORTH_ROW = APRON.z;

/**
 * **Der Rechner _Verbindung_** — ein Schreibtisch mit Bildschirm an der
 * Nordwand, rechts neben dem Titelschild. `A` daran öffnet das Menü
 * _Verbindung_: Raum-Code, Name, wer da ist, Sprache und Chat.
 */
export const LINK_SPOT: ElementSpot = {
  id: 'command-link',
  element: 'space-link-terminal',
  x: 3,
  z: NORTH_ROW,
  face: 'S',
};

/** Die Breite des Rechners in Kacheln — für das Schild über ihm. */
export const LINK_TILES = 2;

/**
 * **Der Anzugständer** — der Anzug des Technikers, mit Helm, an der Nordwand
 * östlich vom Rechner. Wer ihn mit `A` anzieht, ist der Techniker; noch einmal
 * `A` zieht ihn wieder aus.
 */
export const SUIT_SPOT: ElementSpot = {
  id: 'command-suit',
  element: 'space-suit-stand',
  x: 6,
  z: NORTH_ROW,
  face: 'S',
};

/** Die Stellen der Zentrale, die eine Welt als Spielelement hinstellt. */
export const COMMAND_SPOTS: readonly ElementSpot[] = [LINK_SPOT, SUIT_SPOT];

/** Wie viele Kacheln jede Stelle belegt (Breite × Tiefe, nach Süden gedreht). */
const SPOT_TILES: Readonly<Record<string, readonly [number, number]>> = {
  [LINK_SPOT.id]: [LINK_TILES, 1],
  [SUIT_SPOT.id]: [1, 1],
};

/**
 * **Was die Stellen sperren**, als Grundfläche in Metern — dieselbe Liste,
 * aus der Gitter und Rechenkern lesen (`map/geometry.fixtureBlocks`). So läuft
 * weder der Techniker der Runde noch ein Mitspieler durch den Anzugständer.
 */
export function commandBlocks(): readonly FloorBounds[] {
  return COMMAND_SPOTS.map((spot) => {
    const [w, d] = SPOT_TILES[spot.id] ?? [1, 1];
    return {
      minX: spot.x * TILE,
      maxX: (spot.x + w) * TILE,
      minZ: spot.z * TILE,
      maxZ: (spot.z + d) * TILE,
    };
  });
}

/**
 * **Wo man vor einer Stelle steht** — die Mitte ihrer Vorderkante, einen
 * knappen halben Meter davor. Dorthin bringt der Menüeintrag _Zum Techniker-Anzug_.
 */
export function inFront(spot: ElementSpot): { x: number; z: number } {
  const [w, d] = SPOT_TILES[spot.id] ?? [1, 1];
  return { x: (spot.x + w / 2) * TILE, z: (spot.z + d) * TILE + 0.4 };
}

/**
 * **Die Startplätze, nach Spielernummer** — zwei Reihen zu vier, östlich vom
 * Tisch und zwischen Nordwand und Fensterfront. Spieler 1 steht vorn links,
 * Spieler 5 hinter ihm. Anderthalb Meter auseinander: Zwei Figuren auf 2 × 2
 * Zellen (ein Meter) stehen so nebeneinander und nicht ineinander, und keine
 * steht in der Schleuse zur Kantine (Südwand, Mitte).
 */
export const SPAWN_SLOTS: readonly { x: number; z: number }[] = [2, 3.5].flatMap((row) =>
  [0.5, 2, 3.5, 5].map((x) => ({ x: x * TILE, z: (APRON.z + row) * TILE })),
);

/**
 * **Der Startplatz eines Spielers** — `rank` ist seine Nummer minus eins: wie
 * viele schon vor ihm in der Station standen. Wer über acht hinaus kommt,
 * fängt wieder vorn an, einen halben Meter weiter östlich.
 */
export function spawnSlot(rank: number): { x: number; z: number } {
  const index = Math.max(0, Math.floor(rank));
  const slot = SPAWN_SLOTS[index % SPAWN_SLOTS.length]!;
  const lap = Math.floor(index / SPAWN_SLOTS.length);
  return { x: slot.x + lap * 0.5, z: slot.z };
}

/**
 * **Die Spielernummer, minus eins** — wie viele Mitspieler in derselben Welt
 * schon länger da sind (`NetSession.seniorityOf`). Bei gleicher Standzeit
 * entscheidet die Kennung, damit zwei, die im selben Augenblick kommen, nicht
 * beide Spieler 1 sind.
 */
export function playerRank(
  me: { id: string; seniority: number },
  others: readonly { id: string; seniority: number }[],
): number {
  return others.filter(
    (one) => one.seniority > me.seniority || (one.seniority === me.seniority && one.id < me.id),
  ).length;
}
