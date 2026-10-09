import { spotSolidBoxes, type ElementSpot } from '../../elements/elementPlace';
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
 * Hier steht, **wo** das alles ist. Die Zentrale (`APRON`) ist 16 × 14 m —
 * seit Oktober 2026 eher quadratisch als ein Saal (_„Es sollte nicht
 * rechteckig sein, sondern eher quadratisch"_), gestaltet nach einer
 * Brücke wie im Bild des Besitzers: Plätze an den Wänden, in der Mitte ein
 * Hologramm. Die Kamera von oben schaut nach Norden (`core/TopDownCamera.ts`),
 * die Nordwand ist also oben im Bild:
 *
 * - **An der Nordwand**, von West nach Ost: der Rechner _Spiel-Einstellungen_,
 *   die Konsole der Station (x −4,6…−1,8, `ShipExperience`), das Titelschild
 *   (x −1,7…1,7), der Rechner _Verbindung_, der Techniker-Anzug und der
 *   Monster-Anzug — über jedem ein Schild.
 * - **An den Seitenwänden** die drei Schreibtische, Rot und Gelb im Westen,
 *   Blau im Osten, mit je einem Bürostuhl davor (`commandSeats.COMMAND_DESKS`).
 * - **In der Mitte** der Hologramm-Sockel (`HOLOGRAM_SPOT`) mit dem Küken
 *   darüber — `A` wählt ein anderes Modell aus dem Regal.
 * - **Im Südosten** eine Sitzecke: Sofa, Couchtisch, zwei Sessel — auf alles
 *   darf man sich setzen (`opens: 'sit'`).
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
  x: 2,
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
  x: -7,
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
  x: 4.5,
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
  x: 6.5,
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
    face: desk.face,
  };
}

/**
 * **Der Bürostuhl davor** — eine Kachel, mittig vor dem Tisch (auf halben
 * Kacheln, `GameElement.fine`), mit dem Gesicht zum Tisch. Er sperrt nichts
 * (_„durch den man aber gehen kann"_): Er steht weder in `commandBlocks` noch
 * sperrt er beim Hinstellen.
 */
export function chairSpot(desk: CommandDesk): ElementSpot {
  return {
    id: `command-chair-${desk.station}`,
    element: 'furniture-chair-desk-a',
    x: desk.x / TILE - 0.5,
    z: desk.z / TILE - 0.5,
    face: desk.face === 'E' ? 'W' : 'E',
  };
}

/**
 * **Der Hologramm-Sockel** mitten in der Zentrale (`spaceCatalog.SPACE_HOLOGRAM`)
 * — gewünscht: _„Ich will in haunting in der mitte des raumes so ein hologram
 * möbelstück haben wollen, default mit dem "mixed-bag/chicken_plushie_A.glb"
 * darin."_ Zwei Kacheln, die Ecken frei.
 */
export const HOLOGRAM_SPOT: ElementSpot = {
  id: 'command-hologram',
  element: 'space-hologram',
  x: APRON.x + APRON.w / 2 - 1,
  z: APRON.z + APRON.d / 2 - 1,
  face: 'S',
};

/** Die Stellen, an denen `A` etwas Eigenes der Zentrale tut — Rechner und Anzüge. */
export const COMMAND_SPOTS: readonly ElementSpot[] = [
  LINK_SPOT,
  SETTINGS_SPOT,
  SUIT_SPOT,
  MONSTER_SPOT,
  ...COMMAND_DESKS.map(deskSpot),
];

/**
 * **Der Ausrüstungstisch** neben dem Anzugständer — zwei Kacheln, eine Reihe
 * vor der Nordwand. Darauf liegt, womit der Techniker losgeht: die Lampe
 * immer, in der Übung dazu Röntgen und Radar (`HauntingWorld.stepGear`).
 * Gewünscht: _„in der einsatz zentrale stehen tische (wie bei restaurant) auf
 * denen die items liegen mit denen ich starten kann."_
 */
export const GEAR_SPOT: ElementSpot = {
  id: 'command-gear',
  element: 'space-gear-table',
  x: 2,
  z: NORTH_ROW + 2,
  face: 'S',
};

/** Wie hoch die Platte des Ausrüstungstischs liegt, in Metern. */
export const GEAR_TOP = 0.5;

/**
 * **Die Plätze auf dem Tisch**, von West nach Ost: die Lampe, das
 * Röntgengerät, das Radar — je ein Drittel der Platte.
 */
export function gearSlot(index: number): { x: number; y: number; z: number } {
  return {
    x: (GEAR_SPOT.x + 1 + (index - 1) * 0.5) * TILE,
    y: GEAR_TOP + 0.06,
    z: (GEAR_SPOT.z + 0.5) * TILE,
  };
}

/** Die Kachelreihe der Sitzecke: der Couchtisch, das Sofa eine dahinter. */
const LOUNGE_ROW = APRON.z + 10;

/**
 * **Was die Welt von selbst hinstellt** (`FurnishedWorld.spots`): der
 * Hologramm-Sockel in der Mitte und die Sitzecke im Südosten — Sofa mit Blick
 * aufs Hologramm, Couchtisch, zwei Sessel — und Kakteen in drei Ecken. Auf
 * Sofa und Sessel setzt man sich mit `A`.
 */
export const LOUNGE_SPOTS: readonly ElementSpot[] = [
  HOLOGRAM_SPOT,
  GEAR_SPOT,
  {
    id: 'lounge-table',
    element: 'furniture-table-low-decorated',
    x: 4,
    z: LOUNGE_ROW,
    face: 'S',
  },
  { id: 'lounge-couch', element: 'furniture-couch-pillows', x: 4, z: LOUNGE_ROW + 1, face: 'N' },
  {
    id: 'lounge-armchair-w',
    element: 'furniture-armchair-pillows',
    x: 3,
    z: LOUNGE_ROW,
    face: 'E',
  },
  { id: 'lounge-armchair-e', element: 'furniture-armchair', x: 6, z: LOUNGE_ROW, face: 'W' },
  { id: 'lounge-cactus-nw', element: 'furniture-cactus-a', x: APRON.x, z: APRON.z, face: 'S' },
  {
    id: 'lounge-cactus-sw',
    element: 'furniture-cactus-b',
    x: APRON.x,
    z: APRON.z + APRON.d - 1,
    face: 'S',
  },
  {
    id: 'lounge-cactus-se',
    element: 'furniture-cactus-a',
    x: APRON.x + APRON.w - 1,
    z: APRON.z + APRON.d - 1,
    face: 'S',
  },
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
  'space-hologram': [2, 2],
  'space-gear-table': [2, 1],
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
  return [...COMMAND_SPOTS, ...LOUNGE_SPOTS].flatMap((spot) => {
    // Der Hologramm-Sockel sperrt ein Kreuz, die Ecken bleiben frei
    // (`elementPlace.spotSolidBoxes`) — dieselbe Rechnung wie beim Hinstellen.
    if (spot === HOLOGRAM_SPOT)
      return spotSolidBoxes(spot).map((box) => ({
        minX: (box.x - box.w / 2) * TILE,
        maxX: (box.x + box.w / 2) * TILE,
        minZ: (box.z - box.d / 2) * TILE,
        maxZ: (box.z + box.d / 2) * TILE,
      }));
    const [w, d] = tilesOf(spot);
    return [
      {
        minX: spot.x * TILE,
        maxX: (spot.x + w) * TILE,
        minZ: spot.z * TILE,
        maxZ: (spot.z + d) * TILE,
      },
    ];
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
 * **Die Startplätze, nach Spielernummer** — zwei Reihen zu vier südlich vom
 * Hologramm, vor der Fensterfront und westlich der Sitzecke. Spieler 1 steht
 * vorn links, Spieler 5 hinter ihm. Anderthalb Meter auseinander: Zwei Figuren
 * auf 2 × 2 Zellen (ein Meter) stehen so nebeneinander und nicht ineinander.
 */
export const SPAWN_SLOTS: readonly { x: number; z: number }[] = [3.5, 2].flatMap((back) =>
  [-4.5, -3, -1.5, 0].map((x) => ({ x: x * TILE, z: (APRON.z + APRON.d - back) * TILE })),
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
