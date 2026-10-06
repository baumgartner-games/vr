import type { ElementSpot } from '../../elements/elementPlace';
import { TILE } from '../../nav/navTile';
import { APRON } from '../house';
import type { FloorBounds } from '../stationLayout';
import { COMMAND_DESKS, type CommandDesk } from './commandSeats';

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
 * Computer wo an der wand steht Verbindung."_ — und eine Runde später: _„die
 * einsatzzentrale soll bitte kein schlauch raum sein, sondern kann schöner
 * gestaltet werden. Ggf. auch mit einem sessel"_, _„Bei dem Monster soll kein
 * Computer sein, sondern auch wie beim anzug, dass da ein "Monster" als anzug
 * steht"_, _„wenn es einen Computer gibt (mit einem Schild
 * "Spiel-Einstellungen")"_.
 *
 * Hier steht, **wo** das alles ist. Die Zentrale (`APRON`) ist 40 × 12 m; die
 * Kamera von oben schaut nach Norden (`core/TopDownCamera.ts`), die Nordwand
 * ist also oben im Bild:
 *
 * - **An der Nordwand**, von West nach Ost: der Rechner _Spiel-Einstellungen_,
 *   die Konsole der Station (x −4,6…−1,8, `ShipExperience`), das Titelschild
 *   (x −1,7…1,7), der Rechner _Verbindung_, der Techniker-Anzug und der
 *   Monster-Anzug — über jedem ein Schild.
 * - **Im Westen** die drei Schreibtische Rot, Gelb, Blau mit je einem
 *   Bürostuhl davor (`commandSeats.COMMAND_DESKS`).
 * - **Im Osten** eine Sitzecke: Sofa, Couchtisch, zwei Sessel — auf alles darf
 *   man sich setzen (`opens: 'sit'`).
 * - **Im Süden** die Fensterfront zur Kantine mit der Schleuse in der Mitte,
 *   und davor die Startplätze.
 *
 * Was man an den Dingen tut, entscheidet `HauntingWorld`.
 */

/** Die Nordwand der Zentrale, als Kachelreihe — dort stehen Rechner und Anzüge. */
export const NORTH_ROW = APRON.z;

/** Die Breite eines Rechners in Kacheln (`space-terminal`) — für das Schild über ihm. */
export const TERMINAL_TILES = 2;

/**
 * **Der Rechner _Verbindung_** — Schreibtisch mit Bildschirm an der Nordwand,
 * rechts neben dem Titelschild. `A` öffnet das Menü _Verbindung_: Raum-Code,
 * Name, wer da ist, Sprache und Chat.
 */
export const LINK_SPOT: ElementSpot = {
  id: 'command-link',
  element: 'space-terminal',
  x: 3,
  z: NORTH_ROW,
  face: 'S',
};

/**
 * **Der Rechner _Spiel-Einstellungen_** — links von der Konsole. `A` öffnet
 * die Seite der Runde im Menü: Starts, Plätze, Fähigkeiten, Station, Gegner.
 */
export const SETTINGS_SPOT: ElementSpot = {
  id: 'command-settings',
  element: 'space-terminal',
  x: -8,
  z: NORTH_ROW,
  face: 'S',
};

/**
 * **Der Techniker-Anzug** am Ständer. Wer ihn mit `A` anzieht, ist der
 * Techniker; noch einmal `A` zieht ihn aus.
 */
export const SUIT_SPOT: ElementSpot = {
  id: 'command-suit',
  element: 'space-suit-stand',
  x: 8,
  z: NORTH_ROW,
  face: 'S',
};

/**
 * **Der Monster-Anzug** am Ständer, gleich daneben. Wer ihn anzieht, spielt das
 * Monster: Mit dem Start der Runde steht er an dessen Startplatz und läuft
 * selbst durch die Station.
 */
export const MONSTER_SPOT: ElementSpot = {
  id: 'command-monster',
  element: 'space-monster-stand',
  x: 11,
  z: NORTH_ROW,
  face: 'S',
};

/** Der Schreibtisch eines Farbplatzes als Stelle — der Rechner darauf. */
export function deskSpot(desk: CommandDesk): ElementSpot {
  return {
    id: `command-desk-${desk.station}`,
    element: 'space-terminal',
    x: desk.tileX,
    z: desk.tileZ,
    face: 'S',
  };
}

/**
 * **Der Bürostuhl davor** — eine halbe Kachel, mit dem Gesicht zum Tisch. Er
 * sperrt nichts (_„durch den man aber gehen kann"_): Er steht weder in
 * `commandBlocks` noch sperrt er beim Hinstellen.
 */
export function chairSpot(desk: CommandDesk): ElementSpot {
  return {
    id: `command-chair-${desk.station}`,
    element: 'furniture-chair-desk-a',
    x: desk.x / TILE - 0.25,
    z: desk.z / TILE - 0.25,
    face: 'N',
  };
}

/** Die Stellen, an denen `A` etwas Eigenes der Zentrale tut — Rechner und Anzüge. */
export const COMMAND_SPOTS: readonly ElementSpot[] = [
  LINK_SPOT,
  SETTINGS_SPOT,
  SUIT_SPOT,
  MONSTER_SPOT,
  ...COMMAND_DESKS.map(deskSpot),
];

/**
 * **Die Sitzecke im Osten** — Möbel aus dem Katalog, wie jede Welt sie
 * hinstellt (`FurnishedWorld.spots`): Sofa, Couchtisch, zwei Sessel und zwei
 * Kakteen in den Ecken. Auf Sofa und Sessel setzt man sich mit `A`.
 */
export const LOUNGE_SPOTS: readonly ElementSpot[] = [
  { id: 'lounge-couch', element: 'furniture-couch-pillows', x: 14, z: APRON.z + 3, face: 'S' },
  {
    id: 'lounge-table',
    element: 'furniture-table-low-decorated',
    x: 14,
    z: APRON.z + 5,
    face: 'S',
  },
  {
    id: 'lounge-armchair-w',
    element: 'furniture-armchair-pillows',
    x: 12,
    z: APRON.z + 5,
    face: 'E',
  },
  { id: 'lounge-armchair-e', element: 'furniture-armchair', x: 17, z: APRON.z + 5, face: 'W' },
  {
    id: 'lounge-cactus-ne',
    element: 'furniture-cactus-b',
    x: APRON.x + APRON.w - 1,
    z: APRON.z,
    face: 'S',
  },
  { id: 'lounge-cactus-nw', element: 'furniture-cactus-a', x: APRON.x, z: APRON.z, face: 'S' },
];

/** Wie viele Kacheln eine Stelle belegt, wie sie liegt — nur für die Elemente hier. */
const TILES: Readonly<Record<string, readonly [number, number]>> = {
  'space-terminal': [TERMINAL_TILES, 1],
  'space-suit-stand': [1, 1],
  'space-monster-stand': [1, 1],
  'furniture-couch-pillows': [2, 1],
  'furniture-table-low-decorated': [2, 1],
  'furniture-armchair-pillows': [1, 1],
  'furniture-armchair': [1, 1],
  'furniture-cactus-a': [1, 1],
  'furniture-cactus-b': [1, 1],
};

function tilesOf(spot: ElementSpot): readonly [number, number] {
  const [w, d] = TILES[spot.element] ?? [1, 1];
  return spot.face === 'E' || spot.face === 'W' ? [d, w] : [w, d];
}

/**
 * **Was die Stellen sperren**, als Grundfläche in Metern — dieselbe Liste,
 * aus der Gitter und Rechenkern lesen (`map/geometry.fixtureBlocks`). So läuft
 * weder der Techniker der Runde noch ein Mitspieler durch einen Anzugständer
 * oder ein Sofa. Die Bürostühle stehen nicht darin.
 */
export function commandBlocks(): readonly FloorBounds[] {
  return [...COMMAND_SPOTS, ...LOUNGE_SPOTS].map((spot) => {
    const [w, d] = tilesOf(spot);
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
 * knappen halben Meter davor (für Stellen, die nach Süden schauen). Dorthin
 * bringt der Menüeintrag _Zum Techniker-Anzug_.
 */
export function inFront(spot: ElementSpot): { x: number; z: number } {
  const [w, d] = tilesOf(spot);
  return { x: (spot.x + w / 2) * TILE, z: (spot.z + d) * TILE + 0.4 };
}

/**
 * **Die Startplätze, nach Spielernummer** — zwei Reihen zu vier in der Mitte
 * der Zentrale, vor der Fensterfront. Spieler 1 steht vorn links, Spieler 5
 * hinter ihm. Anderthalb Meter auseinander: Zwei Figuren auf 2 × 2 Zellen (ein
 * Meter) stehen so nebeneinander und nicht ineinander, und keine steht in der
 * Schleuse zur Kantine (Südwand, x −1…1).
 */
export const SPAWN_SLOTS: readonly { x: number; z: number }[] = [4, 2.5].flatMap((back) =>
  [1.5, 3, 4.5, 6].map((x) => ({ x: x * TILE, z: (APRON.z + APRON.d - back) * TILE })),
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
