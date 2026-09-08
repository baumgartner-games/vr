import { DIR_E, DIR_N, DIR_S, DIR_W, type Dir } from '../nav/navTile';
import { Rng } from './rng';
import { buildPanel, type PanelSwitch } from './panel';

/**
 * **Das Haus, das jedes Mal ein anderes ist** — und trotzdem auf jedem Gerät
 * dasselbe.
 *
 * Hier steht der Generator und sonst nichts: kein three.js, keine Physik, kein
 * Netz. Hinein geht eine Zahl, heraus kommt ein `HouseSpec` — Zimmer, Türen,
 * Merkmale, Aufgaben, Schalttafel. Aus demselben Bauplan zeichnet der
 * Archivar seine Seiten, baut die Welt ihre Wände und liest der Späher seine
 * Konturen. **Eine Quelle, viele Projektionen**, und das ist der ganze Trick
 * an dem Spiel: Über die Leitung geht der Same und nicht das Haus.
 *
 * **Der Grundriss muss beschreibbar sein.** Ein zufälliges Labyrinth aus
 * gleichen Kästen wäre in zehn Zeilen gewürfelt und unspielbar — „ich bin in
 * einem quadratischen Zimmer" trifft dann auf sieben Zimmer zu. Deshalb tut
 * der Generator drei Dinge, die reine Geometrie nicht täte:
 *
 * - **Jedes Zimmer bekommt einen Charakter** und die Merkmale dazu (`MARKS`).
 *   Küche heißt: da steht ein Herd. Der Name im Dossier und das Ding im Raum
 *   kommen aus derselben Zeile, sonst laufen sie auseinander.
 * - **Zwillinge unterscheiden sich in genau einem Merkmal**, das man
 *   aussprechen kann — Wanne gegen Dusche und nicht „größer". Von innen ist
 *   „groß" nichts, woran man etwas erkennt, und der Archivar sieht seine
 *   Zimmer einzeln und kann auch nicht vergleichen.
 * - **Die Aufgabe zeigt auf ein Merkmal und nicht auf ein Zimmer.** „Das
 *   Fotoalbum liegt bei dem Klavier" ist etwas, das man durch ein Mikrofon
 *   weitergeben kann; eine Kachelkoordinate ist es nicht.
 */

/** Ein Rechteck auf dem Kachelgitter. */
export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Wo das Haus auf dem Gitter steht — dieselbe Ecke wie beim Dunkelhaus. */
export const HOUSE: Rect = { x: -4, z: -3, w: 8, d: 6 };
/** Die Kachelreihe südlich des Hauses, in der der Van steht. */
export const VAN_Z = HOUSE.z + HOUSE.d + 1;
/** Wie breit der Van ist, in Kacheln. */
export const VAN_W = 4;

/**
 * **Der Vorplatz** — die zwei Kachelreihen zwischen Haustür und Van.
 *
 * Er gehört zum Gitter, und das ist keine Kulisse: Ohne Kacheln davor gäbe es
 * für die Wegsuche keinen Van, die Drohne müsste im Haus starten und käme nie
 * wieder heraus. Mit ihm ist „zurück zum Van" derselbe Flug wie jeder andere —
 * eine Wegsuche durch die Haustür, die zu ist, wenn jemand sie zugemacht hat.
 *
 * Dass das Monster ihn **nicht** benutzt, steht nicht hier, sondern als eine
 * Zeile bei seinem Ziel (`HauntingWorld.npcTarget`): Der Van ist die Stelle,
 * an der abgelegt wird, und was dort steht, macht aus einer Runde eine
 * Belagerung.
 */
export const APRON: Rect = { x: HOUSE.x, z: HOUSE.z + HOUSE.d, w: HOUSE.w, d: 2 };

/** Die Kennung, unter der die Drohne „zurück zum Van" fliegt. */
export const VAN_ID = 'van';

/**
 * **Wo die Drohne steht, wenn die Runde anfängt**: über dem Van, mit dem Haus
 * im Bild.
 *
 * Nicht im Zimmer hinter der Haustür, wo sie eine Weile parkte: Dort sah der
 * Pilot beim Hinsetzen ein dunkles Zimmer und wusste weder, wo er ist, noch
 * wohin. Hier sieht er den Vorplatz, die Hauswand und die Tür darin — die
 * erste Ansage, die im Van fällt.
 *
 * Und die **hintere** der beiden Vorplatzreihen, nicht die vordere: Aus der
 * vorderen steht die Hauswand anderthalb Meter vor der Linse, und ein Bild
 * ohne Tiefe ist dasselbe wie kein Bild.
 *
 * **Neben dem Tisch und nicht darüber.** Auf der Kachel daneben schwebte sie
 * dem Tisch und seinen vier Monitoren direkt vor der Linse, und die füllten im
 * ersten Bild des Piloten die halbe untere Hälfte — vier bunte Scheiben statt
 * des Hauses, auf das er schauen soll. Eine Kachel weiter östlich steht der Van dort, wo er
 * hingehört: am Rand des Bildes, als das, was hinter einem liegt.
 */
export const DRONE_HOME = { x: 1, z: VAN_Z };

/** Ob eine Kachel auf dem Vorplatz liegt — dort lädt der Scheinwerfer. */
export function onApron(x: number, z: number): boolean {
  return x >= APRON.x && x < APRON.x + APRON.w && z >= APRON.z && z < APRON.z + APRON.d;
}

// --- Merkmale ---------------------------------------------------------------

/**
 * **Ein Merkmal ist das, was jemand durch ein Mikrofon sagt.**
 *
 * Nicht „ein 0,7 × 1,8 Meter großes weißes Objekt an der Nordwand", sondern
 * *eine Badewanne*. Die Liste ist deshalb kurz und aus lauter Dingen, die man
 * auf Anhieb benennt — und für jedes davon baut die Welt einen Klotz, den man
 * auf Anhieb wiedererkennt (`marks.ts`).
 */
export type MarkId =
  | 'wanne'
  | 'dusche'
  | 'ofen'
  | 'spuele'
  | 'bett'
  | 'buecher'
  | 'werkbank'
  | 'klavier'
  | 'kamin'
  | 'standuhr'
  | 'sessel'
  | 'kiste'
  | 'schaukelpferd'
  | 'esstisch';

/** Wie ein Merkmal heißt — im Dossier und im Satz, den jemand sagt. */
export const MARKS: Readonly<Record<MarkId, string>> = {
  wanne: 'Kryokapsel',
  dusche: 'Dekontaminationskammer',
  ofen: 'Nährstoffdrucker',
  spuele: 'Wasseraufbereitung',
  bett: 'Schlafkoje',
  buecher: 'Serverracks',
  werkbank: 'Antriebskern',
  klavier: 'Kommunikationskonsole',
  kamin: 'Reaktor',
  standuhr: 'Sauerstofftank',
  sessel: 'Pilotensitz',
  kiste: 'Frachtcontainer',
  schaukelpferd: 'Probenkammer',
  esstisch: 'Hydroponikbeet',
};

/** Ein Merkmal, wie es im Zimmer steht. */
export interface MarkAt {
  id: MarkId;
  x: number;
  z: number;
  /** Wohin es schaut — bei allem, was an einer Wand steht, auch: an welcher. */
  dir: Dir;
}

// --- Zimmersorten -----------------------------------------------------------

export type RoomKind =
  | 'kueche'
  | 'bad'
  | 'wohnzimmer'
  | 'musikzimmer'
  | 'schlafzimmer'
  | 'kinderzimmer'
  | 'bibliothek'
  | 'werkstatt'
  | 'kammer'
  | 'esszimmer';

interface RoomKindFacts {
  id: RoomKind;
  /** Wie das Zimmer im Dossier heißt. Zwillinge teilen sich diesen Namen. */
  label: string;
  /** Das Merkmal, an dem man diese Sorte erkennt — und das die Aufgabe nennt. */
  signature: MarkId;
  /**
   * Das andere Kennzeichen derselben Sorte. Nur Sorten mit dieser Zeile
   * taugen als **Zwillingspaar**: zwei Zimmer, ein Name, ein Unterschied.
   */
  twin?: MarkId;
  /** Was sonst noch darin steht, wenn Platz ist. */
  extras: readonly MarkId[];
}

const ROOM_KINDS: readonly RoomKindFacts[] = [
  { id: 'kueche', label: 'Kombüse', signature: 'ofen', extras: ['spuele', 'esstisch'] },
  { id: 'bad', label: 'Medizin / Quarantäne', signature: 'wanne', twin: 'dusche', extras: [] },
  { id: 'wohnzimmer', label: 'Reaktorkammer', signature: 'kamin', extras: ['sessel', 'standuhr'] },
  { id: 'musikzimmer', label: 'Kommunikation', signature: 'klavier', extras: ['sessel'] },
  { id: 'schlafzimmer', label: 'Crewquartier', signature: 'bett', extras: ['standuhr'] },
  {
    id: 'kinderzimmer',
    label: 'Biolabor',
    signature: 'schaukelpferd',
    twin: 'bett',
    extras: ['kiste'],
  },
  { id: 'bibliothek', label: 'Datenarchiv', signature: 'buecher', extras: ['sessel'] },
  { id: 'werkstatt', label: 'Maschinenraum', signature: 'werkbank', extras: ['kiste'] },
  { id: 'kammer', label: 'Frachtlager', signature: 'kiste', extras: [] },
  { id: 'esszimmer', label: 'Hydroponik', signature: 'esstisch', extras: ['sessel'] },
];

// --- Was herauskommt --------------------------------------------------------

export interface HouseRoom {
  id: string;
  kind: RoomKind;
  /** Der Name im Dossier — bei Zwillingen zweimal derselbe. Mit Absicht. */
  name: string;
  rect: Rect;
  /** Das Merkmal, an dem dieses Zimmer hängt; bei Zwillingen der Unterschied. */
  signature: MarkId;
  marks: MarkAt[];
  /** Ob eine Lampe unter der Decke hängt. Ein Zimmer im Haus hat keine. */
  lamp: boolean;
}

export interface HouseDoor {
  id: string;
  /** Das Zimmer, von dem aus die Kachel/Richtung unten gemeint ist. */
  a: string;
  /** Das Zimmer dahinter — `null` bei der Haustür. */
  b: string | null;
  x: number;
  z: number;
  dir: Dir;
  /** Holz hält einen Verfolger ein paar Sekunden auf, Stahl für immer. */
  material: 'wood' | 'metal';
}

export interface HouseTask {
  id: string;
  /** Was zu holen ist: „Fotoalbum". */
  label: string;
  roomId: string;
  x: number;
  z: number;
  /** Der Satz, den der Archivar vorliest: „bei dem Klavier". */
  hint: string;
}

/**
 * **Ein Fenster in der Außenwand** — die einzige Stelle, an der das Haus etwas
 * von draußen hereinlässt.
 *
 * Es sitzt immer in der **Außenwand** und nie zwischen zwei Zimmern: Ein
 * Fenster nach innen wäre eine zweite Sorte Tür, durch die man sieht, und
 * damit ein Grundriss, den keine Station mehr beschreiben kann. Nach draußen
 * ist es dagegen genau das, was diesem Haus gefehlt hat — von innen ein heller
 * Fleck in einer schwarzen Wand, an dem man merkt, an welcher Seite des Hauses
 * man steht, und von außen ein Haus, das aussieht wie eines.
 */
export interface HouseWindow {
  id: string;
  /** Das Zimmer dahinter. */
  roomId: string;
  /** Die Kachel im Zimmer, und in welche Richtung die Außenwand liegt. */
  x: number;
  z: number;
  dir: Dir;
}

export interface HouseSpec {
  seed: number;
  rooms: HouseRoom[];
  doors: HouseDoor[];
  /** Die Fenster in den Außenwänden — je Zimmer eines oder zwei. */
  windows: HouseWindow[];
  /** Das Zimmer hinter der Haustür — dort steht man, wenn man hereinkommt. */
  entryRoom: string;
  /** Die Haustür selbst. */
  frontDoor: string;
  /** Wo der Sicherungskasten hängt: Zimmer, Kachel, Wandrichtung. */
  fuse: { roomId: string; x: number; z: number; dir: Dir };
  tasks: HouseTask[];
  switches: PanelSwitch[];
}

/** Woraus die drei Sachen ausgesucht werden, die zu holen sind. */
const LOOT = ['Wartungsschlüssel', 'Filterpatrone', 'Signalmodul'] as const;

/** Wie viele davon eine Runde verlangt. */
export const TASK_COUNT = 3;

/**
 * **Ein Haus aus einer Zahl.**
 *
 * Die Reihenfolge der Würfe ist Teil des Vertrags: Wer hier eine Zeile
 * einschiebt, die würfelt, baut aus demselben Samen ein anderes Haus — und
 * dann steht der Archivar in einem Grundriss, den es beim VR-Spieler nicht
 * gibt. Deshalb liegt jeder Wurf an genau einer Stelle.
 */
export function generateHouse(seed: number, roomCount?: number): HouseSpec {
  const rng = new Rng(seed);
  const rects = roomCount === undefined ? splitRooms(rng, HOUSE) : stationRooms(rng, roomCount);
  const rooms = nameRooms(rng, rects);
  const { doors, entryRoom, frontDoor } = connect(rng, rooms);
  placeMarks(rng, rooms, doorTiles(doors));
  // **Nach den Möbeln und nicht davor**: Ein Fenster hinter dem Bücherregal
  // ist von innen nichts und von außen ein Rätsel, und welche Kachel ein Regal
  // trägt, steht erst jetzt fest.
  const windows = placeWindows(rng, rooms, doors);
  const fuse = placeFuse(rng, rooms, entryRoom);
  const tasks = placeTasks(rng, rooms, entryRoom);
  darkenOne(rng, rooms, entryRoom);
  const switches = buildPanel(rng, rooms, doors);
  return { seed, rooms, doors, windows, entryRoom, frontDoor, fuse, tasks, switches };
}

/** Exact station sizes; rectangular modules retain two escape routes. */
function stationRooms(rng: Rng, count: number): Rect[] {
  const counts: Record<number, number[]> = {
    6: [2, 2, 2],
    8: [3, 2, 3],
    10: [3, 4, 3],
    12: [4, 4, 4],
  };
  const rows = rng.shuffle(counts[count] ?? counts[8]!);
  const out: Rect[] = [];
  rows.forEach((columns, row) => {
    const widths = rng.shuffle(columns === 2 ? [4, 4] : columns === 3 ? [2, 2, 4] : [2, 2, 2, 2]);
    let x = HOUSE.x;
    for (const w of widths) {
      out.push({ x, z: HOUSE.z + row * 2, w, d: 2 });
      x += w;
    }
  });
  return out;
}

// --- Grundriss --------------------------------------------------------------

/** Kein Zimmer schmaler als zwei Kacheln — sonst ist es ein Gang mit Bett. */
const MIN_SIDE = 2;
/** Wie viele Zimmer ein Haus hat. Weniger ist leer, mehr ist unbeschreibbar. */
const ROOM_RANGE = [6, 7] as const;

/**
 * **Wie oft ein Zuschnitt neu gewürfelt wird**, wenn in ihm ein Zimmer mit nur
 * einem einzigen Nachbarn steht.
 *
 * Zwei Türen bekommt ein Zimmer nur, wenn es zwei Nachbarn hat — gegen ein
 * eingeklemmtes Zimmer, das an nichts als eine einzige Wand grenzt, hilft
 * keine Tür, sondern nur ein anderer Zuschnitt. Es ist selten (unter einem
 * halben Prozent der Häuser), und deshalb ist Neuwürfeln hier billiger und
 * ehrlicher als eine Reparatur, die den Grundriss verbiegt.
 */
const SPLIT_TRIES = 6;

/**
 * **Der Grundriss entsteht durch Teilen und nicht durch Setzen.**
 *
 * Ein Rechteck wird so lange in zwei zerschnitten, bis genug Zimmer da sind.
 * Der Reiz daran ist nicht die Kürze, sondern dass dabei nichts schiefgehen
 * kann, was hinterher jemandem auffiele: keine Löcher, keine Überlappungen,
 * kein Zimmer ohne Fläche. Was ein Setz-Generator mit Prüfschleifen erkaufen
 * müsste, ist hier eine Eigenschaft des Verfahrens.
 *
 * Was das Verfahren **nicht** von selbst mitbringt, ist der zweite Nachbar
 * (`SPLIT_TRIES`): Ein Zuschnitt, in dem ein Zimmer nur an ein einziges
 * anderes grenzt, wird verworfen und neu gewürfelt.
 */
function splitRooms(rng: Rng, outer: Rect): Rect[] {
  let rects = cutUp(rng, outer);
  for (let tries = 1; tries < SPLIT_TRIES && lonely(rects); tries++) rects = cutUp(rng, outer);
  return rects;
}

/** Ob ein Zimmer des Zuschnitts weniger Nachbarn hat, als es Türen braucht. */
function lonely(rects: readonly Rect[]): boolean {
  return rects.some(
    (rect) =>
      rects.filter((other) => other !== rect && shared(rect, other).length > 0).length <
      DOORS_LEAST,
  );
}

/** Ein Anlauf: teilen, bis genug Zimmer da sind. */
function cutUp(rng: Rng, outer: Rect): Rect[] {
  const want = rng.between(ROOM_RANGE[0], ROOM_RANGE[1]);
  let rects: Rect[] = [{ ...outer }];

  while (rects.length < want) {
    // Immer das größte teilbare zuerst: sonst entstehen ein Saal und fünf
    // Besenkammern, und der Saal ist das Zimmer, in dem man sich verläuft.
    const index = biggestSplittable(rects);
    if (index < 0) break;
    const [a, b] = cut(rng, rects[index]!);
    rects = [...rects.slice(0, index), a, b, ...rects.slice(index + 1)];
  }
  return rects;
}

function splittable(rect: Rect): boolean {
  return rect.w >= MIN_SIDE * 2 || rect.d >= MIN_SIDE * 2;
}

function biggestSplittable(rects: readonly Rect[]): number {
  let best = -1;
  let bestArea = 0;
  rects.forEach((rect, index) => {
    if (!splittable(rect)) return;
    const area = rect.w * rect.d;
    if (area > bestArea) {
      bestArea = area;
      best = index;
    }
  });
  return best;
}

/** Ein Schnitt quer durch das Rechteck, immer entlang der längeren Seite. */
function cut(rng: Rng, rect: Rect): [Rect, Rect] {
  const canX = rect.w >= MIN_SIDE * 2;
  const canZ = rect.d >= MIN_SIDE * 2;
  const alongX = canX && (!canZ || rect.w > rect.d || (rect.w === rect.d && rng.chance(0.5)));
  if (alongX) {
    const at = rng.between(MIN_SIDE, rect.w - MIN_SIDE);
    return [
      { x: rect.x, z: rect.z, w: at, d: rect.d },
      { x: rect.x + at, z: rect.z, w: rect.w - at, d: rect.d },
    ];
  }
  const at = rng.between(MIN_SIDE, rect.d - MIN_SIDE);
  return [
    { x: rect.x, z: rect.z, w: rect.w, d: at },
    { x: rect.x, z: rect.z + at, w: rect.w, d: rect.d - at },
  ];
}

// --- Charakter --------------------------------------------------------------

/**
 * Jedes Rechteck bekommt eine Sorte — und **ein Paar bekommt dieselbe**.
 *
 * Der Zwilling ist der einzige Fall, in dem zwei Zimmer denselben Namen tragen
 * dürfen, und er ist Absicht: Zwei Bäder, eines mit Wanne, eines mit Dusche,
 * sind der Moment, in dem jemand ins falsche geschickt wird und alle merken,
 * dass sie verschiedene Sprachen sprechen.
 */
function nameRooms(rng: Rng, rects: readonly Rect[]): HouseRoom[] {
  const kinds = rng.shuffle(ROOM_KINDS);
  const twinKind = kinds.find((one) => one.twin) ?? kinds[0]!;
  const others = kinds
    .filter((one) => one.id !== twinKind.id)
    .sort(
      (a, b) =>
        Number(['werkstatt', 'bad', 'musikzimmer'].includes(b.id)) -
        Number(['werkstatt', 'bad', 'musikzimmer'].includes(a.id)),
    );

  // Welche zwei Rechtecke die Zwillinge werden. Nebeneinander wäre zu leicht
  // zu merken, deshalb nur: nicht dasselbe.
  const first = rng.int(rects.length);
  let second = rng.int(rects.length);
  if (second === first) second = (second + 1) % rects.length;

  let next = 0;
  return rects.map((rect, index) => {
    const twin = index === first || index === second;
    const facts = twin ? twinKind : (others[next++ % others.length] ?? twinKind);
    const signature =
      twin && index === second ? (twinKind.twin ?? facts.signature) : facts.signature;
    return {
      id: `r${index}`,
      kind: facts.id,
      name: facts.label,
      rect,
      signature,
      marks: [],
      lamp: true,
    };
  });
}

/**
 * **Die Kacheln, auf denen keine Möbel stehen dürfen** — beide Seiten jeder
 * Tür.
 *
 * Ein Regal in einer Türöffnung ist der Fehler, den es erst gibt, seit Häuser
 * gewürfelt werden: Von Hand hätte ihn niemand gemacht, und im Spiel merkt man
 * ihn erst, wenn jemand in einem Zimmer feststeckt. Also fällt er hier weg und
 * nicht dort auf.
 */
function doorTiles(doors: readonly HouseDoor[]): Set<string> {
  const out = new Set<string>();
  const step: Record<Dir, [number, number]> = {
    [DIR_N]: [0, -1],
    [DIR_E]: [1, 0],
    [DIR_S]: [0, 1],
    [DIR_W]: [-1, 0],
  };
  for (const door of doors) {
    const [dx, dz] = step[door.dir];
    out.add(`${door.x}:${door.z}`);
    out.add(`${door.x + dx}:${door.z + dz}`);
  }
  return out;
}

/** Die Merkmale in die Zimmer stellen: das kennzeichnende zuerst. */
function placeMarks(rng: Rng, rooms: HouseRoom[], blocked: ReadonlySet<string>): void {
  for (const room of rooms) {
    const facts = ROOM_KINDS.find((one) => one.id === room.kind)!;
    const wanted: MarkId[] = [room.signature];
    // Was noch hineinpasst: ein Merkmal je zwei Kacheln, damit ein
    // Zwei-Kachel-Zimmer nicht zum Möbellager wird.
    const area = room.rect.w * room.rect.d;
    for (const extra of facts.extras) {
      if (wanted.length >= Math.max(1, Math.floor(area / 2))) break;
      if (!wanted.includes(extra)) wanted.push(extra);
    }

    const all = rng.shuffle(tilesOf(room.rect));
    // Freie Kacheln zuerst; nur wenn ein Zimmer nichts als Türen hat, wird auf
    // den Rest zurückgegriffen — lieber ein Regal im Weg als gar keine Küche.
    const free = all.filter((one) => !blocked.has(`${one.x}:${one.z}`));
    const rest = all.filter((one) => blocked.has(`${one.x}:${one.z}`));
    const tiles = [...free, ...rest];
    room.marks = wanted.map((id, index) => {
      const tile = tiles[index] ?? tiles[0]!;
      return { id, x: tile.x, z: tile.z, dir: outwardDir(room.rect, tile) };
    });
  }
}

/** Alle Kacheln eines Rechtecks, von Nordwest nach Südost. */
export function tilesOf(rect: Rect): Array<{ x: number; z: number }> {
  const out: Array<{ x: number; z: number }> = [];
  for (let z = rect.z; z < rect.z + rect.d; z++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) out.push({ x, z });
  }
  return out;
}

/**
 * In welche Richtung ein Möbel schaut: **weg von der nächsten Wand**.
 *
 * Ein Regal mitten im Raum sieht aus wie ein Fehler, eines mit dem Rücken zur
 * Wand wie ein Zimmer.
 */
function outwardDir(rect: Rect, tile: { x: number; z: number }): Dir {
  const west = tile.x - rect.x;
  const east = rect.x + rect.w - 1 - tile.x;
  const north = tile.z - rect.z;
  const south = rect.z + rect.d - 1 - tile.z;
  const min = Math.min(west, east, north, south);
  if (min === north) return DIR_N;
  if (min === south) return DIR_S;
  if (min === west) return DIR_W;
  return DIR_E;
}

// --- Türen ------------------------------------------------------------------

interface Touching {
  a: number;
  b: number;
  /** Die möglichen Türplätze: Kachel im Zimmer `a` plus Richtung nach `b`. */
  spots: Array<{ x: number; z: number; dir: Dir }>;
}

/**
 * **Wie viele Türen ein Zimmer mindestens hat** — die Haustür zählt mit.
 *
 * Zwei, und das ist die Zahl, an der die halbe Welt hängt. Ein Zimmer mit
 * genau einer Tür ist eine Sackgasse, und eine Sackgasse ist hier drei Sachen
 * auf einmal: die Stelle, an der ein Verfolger einen wirklich stellt (man
 * kommt an ihm nicht vorbei); die Stelle, die der Späher nicht beschreiben
 * kann, weil sie aussieht wie jede andere Kammer; und seit das Monster Türen
 * zuwirft die Stelle, an der eine einzige zugefallene Tür jemanden einsperrt.
 * Mit zwei Türen ist jedes Zimmer ein **Durchgang**: Man kann hindurch,
 * herumlaufen und ausweichen, und der Grundriss hat von selbst Rundwege.
 */
const DOORS_LEAST = 2;

/**
 * **Erst ein Baum, dann die Sackgassen auf.**
 *
 * Der Baum garantiert, dass jedes Zimmer erreichbar ist — die Sorte Fehler,
 * die man sonst erst bemerkt, wenn jemand zwanzig Minuten lang eine Tür sucht,
 * die es nicht gibt. Er hat aber Blätter, und ein Blatt ist ein Zimmer mit
 * einer einzigen Tür. Der zweite Durchgang macht deshalb jedem Zimmer eine
 * zweite auf (`DOORS_LEAST`), und **nur** denen, die eine brauchen: Ein Haus,
 * in dem jede Wand eine Tür hat, ist ein Regal.
 *
 * Die Rundwege, die es vorher gewürfelt gab, fallen damit von selbst an — wer
 * einem Baum eine Kante hinzufügt, schließt einen Kreis. Ein gewürfelter
 * Abkürzungs-Durchgang obendrauf wäre nur noch eine dritte Tür in einem
 * Zimmer, das schon zwei hat.
 */
function connect(
  rng: Rng,
  rooms: readonly HouseRoom[],
): { doors: HouseDoor[]; entryRoom: string; frontDoor: string } {
  const touching = adjacencies(rooms);
  const parent = rooms.map((_, index) => index);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };

  const doors: HouseDoor[] = [];
  const order = rng.shuffle(touching);
  const spare: Touching[] = [];

  for (const pair of order) {
    const ra = find(pair.a);
    const rb = find(pair.b);
    if (ra === rb) {
      spare.push(pair);
      continue;
    }
    parent[ra] = rb;
    doors.push(doorFrom(rng, rooms, pair, doors.length));
  }

  // **Die Haustür steht fest, bevor gezählt wird**, auch wenn sie erst hinterher
  // in die Liste kommt: Sie ist die zweite Tür des Eingangszimmers. Wer sie
  // nicht mitzählt, bricht ausgerechnet dort noch eine Wand auf, wo ohnehin
  // schon zwei Wege hinausführen.
  const southEdge = HOUSE.z + HOUSE.d - 1;
  const atSouth = rooms.filter((room) => room.rect.z + room.rect.d - 1 === southEdge);
  const entry = atSouth.length > 0 ? rng.pick(atSouth) : rooms[0]!;
  const x = entry.rect.x + rng.int(entry.rect.w);

  openDeadEnds(rng, rooms, doors, spare, entry.id);

  const front: HouseDoor = {
    id: `d${doors.length}`,
    a: entry.id,
    b: null,
    x,
    z: southEdge,
    dir: DIR_S,
    material: 'wood',
  };
  doors.push(front);

  return { doors, entryRoom: entry.id, frontDoor: front.id };
}

/**
 * **Jedem Zimmer seine zweite Tür**, aus den Nachbarschaften, die der Baum
 * übrig gelassen hat.
 *
 * Durchgegangen wird die Liste, die schon gemischt ist (`spare` fällt in der
 * gemischten Reihenfolge des Baums an) — ein zweiter Wurf hier wäre einer
 * mehr in einem Ablauf, dessen Reihenfolge Teil des Vertrags ist. Aufgemacht
 * wird eine Tür nur, wenn **mindestens eine** der beiden Seiten sie noch
 * braucht; sonst wüchse das Haus in Türen, die niemand zählt.
 *
 * Ein Zimmer, das überhaupt nur einen Nachbarn hat, bleibt eine Sackgasse —
 * dagegen hilft keine Tür, sondern nur ein anderer Zuschnitt. Beim Teilen
 * dieses Hauses kommt das nicht vor, und der Test in `house.test.ts` merkt
 * es, falls doch einmal jemand am Zuschnitt dreht.
 */
function openDeadEnds(
  rng: Rng,
  rooms: readonly HouseRoom[],
  doors: HouseDoor[],
  spare: readonly Touching[],
  entryRoom: string,
): void {
  const count = new Map<string, number>(rooms.map((room) => [room.id, 0]));
  const bump = (id: string): void => {
    count.set(id, (count.get(id) ?? 0) + 1);
  };
  for (const door of doors) {
    bump(door.a);
    if (door.b) bump(door.b);
  }
  bump(entryRoom);

  for (const pair of spare) {
    const a = rooms[pair.a]!.id;
    const b = rooms[pair.b]!.id;
    if ((count.get(a) ?? 0) >= DOORS_LEAST && (count.get(b) ?? 0) >= DOORS_LEAST) continue;
    doors.push(doorFrom(rng, rooms, pair, doors.length));
    bump(a);
    bump(b);
  }
}

/** Welche Zimmer sich berühren, und wo eine Tür hinpasste. */
function adjacencies(rooms: readonly HouseRoom[]): Touching[] {
  const out: Touching[] = [];
  for (let a = 0; a < rooms.length; a++) {
    for (let b = a + 1; b < rooms.length; b++) {
      const spots = shared(rooms[a]!.rect, rooms[b]!.rect);
      if (spots.length > 0) out.push({ a, b, spots });
    }
  }
  return out;
}

/** Die Kacheln, an denen zwei Rechtecke aneinanderstoßen. */
function shared(a: Rect, b: Rect): Array<{ x: number; z: number; dir: Dir }> {
  const out: Array<{ x: number; z: number; dir: Dir }> = [];
  const overlapX = range(Math.max(a.x, b.x), Math.min(a.x + a.w, b.x + b.w));
  const overlapZ = range(Math.max(a.z, b.z), Math.min(a.z + a.d, b.z + b.d));

  if (a.x + a.w === b.x) for (const z of overlapZ) out.push({ x: a.x + a.w - 1, z, dir: DIR_E });
  if (b.x + b.w === a.x) for (const z of overlapZ) out.push({ x: a.x, z, dir: DIR_W });
  if (a.z + a.d === b.z) for (const x of overlapX) out.push({ x, z: a.z + a.d - 1, dir: DIR_S });
  if (b.z + b.d === a.z) for (const x of overlapX) out.push({ x, z: a.z, dir: DIR_N });
  return out;
}

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i < to; i++) out.push(i);
  return out;
}

function doorFrom(rng: Rng, rooms: readonly HouseRoom[], pair: Touching, index: number): HouseDoor {
  const spot = rng.pick(pair.spots);
  return {
    id: `d${index}`,
    a: rooms[pair.a]!.id,
    b: rooms[pair.b]!.id,
    x: spot.x,
    z: spot.z,
    dir: spot.dir,
    // Eine Stahltür je Haus, höchstens: Sie ist die Wand, die der Hacker
    // schließen kann und die dann wirklich eine ist.
    material: rng.chance(0.18) ? 'metal' : 'wood',
  };
}

// --- Fenster ----------------------------------------------------------------

/** Wie viele Fenster ein Zimmer höchstens in seine Außenwände bekommt. */
const WINDOWS_MOST = 2;

/** Und wie oft es das zweite wirklich bekommt. */
const SECOND_WINDOW = 0.45;

/**
 * **Fenster nur nach draußen** — und deshalb gibt es sie erst, seit es ein
 * Draußen gibt.
 *
 * Von innen ist ein Fenster der einzige Fleck, an dem in diesem Haus etwas
 * anderes steht als Schwarz: das Abendlicht über dem Vorplatz, die Silhouette
 * des Vans, der Himmel. Das ist mehr als Kulisse, es ist eine **Sprache mehr
 * für den, der im Haus steht** — er kann sagen „ich sehe den Van", und der
 * Späher weiß, an welcher Wand er klebt. Nach innen gäbe es das nicht: Zwei
 * Zimmer mit Sichtverbindung wären ein Grundriss, den weder der Archivar noch
 * der Späher noch beschreiben könnten.
 *
 * Zwei Sorten Kante bleiben frei: die der **Haustür** (zwei Öffnungen in
 * derselben Kachelkante gibt es nicht) und jede, an der ein **Möbel mit dem
 * Rücken steht** — ein Fenster hinter dem Bücherregal ist von innen nichts und
 * von außen ein Rätsel.
 */
function placeWindows(
  rng: Rng,
  rooms: readonly HouseRoom[],
  doors: readonly HouseDoor[],
): HouseWindow[] {
  const taken = new Set(doors.map((door) => edgeKey(door.x, door.z, door.dir)));
  for (const room of rooms) {
    for (const mark of room.marks) taken.add(edgeKey(mark.x, mark.z, mark.dir));
  }

  const out: HouseWindow[] = [];
  for (const room of rooms) {
    const free = outerEdges(room.rect).filter(
      (edge) => !taken.has(edgeKey(edge.x, edge.z, edge.dir)),
    );
    if (free.length === 0) continue;
    // Der Wurf fällt immer, auch wenn nur eine Kante übrig ist: Ein Würfel,
    // der mal geworfen wird und mal nicht, baut aus demselben Samen zwei
    // verschiedene Häuser, sobald jemand am Zuschnitt dreht.
    const second = rng.chance(SECOND_WINDOW);
    const want = Math.min(free.length, second ? WINDOWS_MOST : 1);
    for (const edge of rng.shuffle(free).slice(0, want)) {
      out.push({ id: `w${out.length}`, roomId: room.id, x: edge.x, z: edge.z, dir: edge.dir });
    }
  }
  return out;
}

/** Eine Kachelkante als Zeichenkette — dieselbe Kante, derselbe Schlüssel. */
function edgeKey(x: number, z: number, dir: Dir): string {
  return `${x}:${z}:${dir}`;
}

/**
 * Die Kanten eines Zimmers, die auf der **Außenwand des Hauses** liegen.
 *
 * Gefragt wird nach dem Haus und nicht nach dem Zimmer: Die Nordkante eines
 * Zimmers mitten im Grundriss ist die Wand zum Nachbarn, und ein Fenster darin
 * wäre eines nach nirgendwo.
 */
export function outerEdges(rect: Rect): Array<{ x: number; z: number; dir: Dir }> {
  const out: Array<{ x: number; z: number; dir: Dir }> = [];
  for (const tile of tilesOf(rect)) {
    if (tile.z === HOUSE.z) out.push({ ...tile, dir: DIR_N });
    if (tile.z === HOUSE.z + HOUSE.d - 1) out.push({ ...tile, dir: DIR_S });
    if (tile.x === HOUSE.x) out.push({ ...tile, dir: DIR_W });
    if (tile.x === HOUSE.x + HOUSE.w - 1) out.push({ ...tile, dir: DIR_E });
  }
  return out;
}

// --- Was sonst noch im Haus liegt ------------------------------------------

/** Der Sicherungskasten hängt so weit von der Haustür weg wie möglich. */
function placeFuse(rng: Rng, rooms: readonly HouseRoom[], entryRoom: string): HouseSpec['fuse'] {
  const entry = rooms.find((room) => room.id === entryRoom)!;
  const far = [...rooms]
    .filter((room) => room.id !== entryRoom)
    .sort((a, b) => distance(entry.rect, b.rect) - distance(entry.rect, a.rect));
  const room = far[0] ?? entry;
  const tile = rng.pick(tilesOf(room.rect));
  return { roomId: room.id, x: tile.x, z: tile.z, dir: outwardDir(room.rect, tile) };
}

function distance(a: Rect, b: Rect): number {
  const ax = a.x + a.w / 2;
  const az = a.z + a.d / 2;
  const bx = b.x + b.w / 2;
  const bz = b.z + b.d / 2;
  return Math.hypot(ax - bx, az - bz);
}

/**
 * Die drei Sachen, die zu holen sind — jede in einem anderen Zimmer, keine im
 * Zimmer hinter der Haustür.
 *
 * **Der Hinweis nennt ein Merkmal und kein Zimmer.** „Bei dem Klavier" kann
 * man weitersagen; „im Raum r3" nicht. Und bei einem Zwilling nennt er genau
 * das Merkmal, in dem sich die beiden unterscheiden — sonst wäre die
 * Verwechslung nicht lustig, sondern unlösbar.
 */
function placeTasks(rng: Rng, rooms: readonly HouseRoom[], entryRoom: string): HouseTask[] {
  const usable = rng.shuffle(rooms.filter((room) => room.id !== entryRoom));
  const loot = rng.shuffle(LOOT);
  const out: HouseTask[] = [];
  for (let i = 0; i < Math.min(TASK_COUNT, usable.length); i++) {
    const room = usable[i]!;
    const tile = rng.pick(tilesOf(room.rect));
    out.push({
      id: `t${i}`,
      label: loot[i] ?? 'Andenken',
      roomId: room.id,
      x: tile.x,
      z: tile.z,
      hint: `bei ${article(MARKS[room.signature])}`,
    });
  }
  return out;
}

/** „bei dem Klavier", „bei der Badewanne" — der Artikel gehört zum Satz. */
function article(label: string): string {
  const feminine = [
    'Kryokapsel',
    'Dekontaminationskammer',
    'Wasseraufbereitung',
    'Kommunikationskonsole',
    'Schlafkoje',
    'Probenkammer',
  ];
  return `${feminine.includes(label) ? 'der' : 'dem'} ${label}`;
}

/** Ein Zimmer im Haus hat keine Lampe. Es bleibt auf jeder Stufe dunkel. */
function darkenOne(rng: Rng, rooms: HouseRoom[], entryRoom: string): void {
  const usable = rooms.filter((room) => room.id !== entryRoom);
  if (usable.length === 0) return;
  rng.pick(usable).lamp = false;
}

// --- Nachschlagen -----------------------------------------------------------

/** In welchem Zimmer diese Kachel liegt — `null` heißt: außerhalb des Hauses. */
export function roomAt(spec: HouseSpec, x: number, z: number): HouseRoom | null {
  return (
    spec.rooms.find(
      (room) =>
        x >= room.rect.x &&
        x < room.rect.x + room.rect.w &&
        z >= room.rect.z &&
        z < room.rect.z + room.rect.d,
    ) ?? null
  );
}

export function roomOf(spec: HouseSpec, id: string): HouseRoom | null {
  return spec.rooms.find((room) => room.id === id) ?? null;
}

/** Die Mitte eines Zimmers in Kacheln — wohin die Drohne fliegt. */
export function roomCentre(room: HouseRoom): { x: number; z: number } {
  return {
    x: room.rect.x + Math.floor(room.rect.w / 2),
    z: room.rect.z + Math.floor(room.rect.d / 2),
  };
}

/**
 * Wie viele Zimmer denselben Namen tragen. Der Archivar sieht daran, dass er
 * gerade in einen Zwilling schaut — mehr aber auch nicht.
 */
export function namesakes(spec: HouseSpec, room: HouseRoom): number {
  return spec.rooms.filter((one) => one.name === room.name).length;
}
