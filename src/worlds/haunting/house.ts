import type { Slope } from '../nav/cellGrid';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, type Dir } from '../nav/navTile';

/**
 * **Wie breit eine Tür der Station ist — eine ganze Kachelkante, ohne
 * Pfosten**, in beiden Welten.
 *
 * Der Bauplan des Schiffs baute lange `PLAN_DOOR_W` mit Pfosten, die 2D-Karte
 * rechnete mit einer Kachel abzüglich Wanddicke — zwei Zahlen für eine Tür.
 * Seit dem 1-m-Gitter ist es **die Kachel selbst**, und der Grund ist das
 * Monster: Sein Wegkörper misst `MONSTER_RADIUS` (0,3 m) im Halbmesser, die
 * Wegsuche rastert in Vierteldezimetern (`stationNavigation.ts`), und eine
 * Tür von 0,8 m ließe der Mitte eine Rinne von 0,2 m — darin liegt keine
 * Rasterzelle, und das Vieh stünde vor jeder Tür wie vor einer Wand. Eine
 * ganze Kante gibt 0,4 m, zwei Zellen. Dazu passt es zum Schiff: Eine
 * Schleuse hat keine Pfosten, sie fährt in die Wand (`ShipExperience`).
 * Die anderen Welten des Rasters behalten `PLAN_DOOR_W` mit Pfosten.
 */
export const STATION_DOOR_W = TILE;

/**
 * **Die Türen der Station sind zwei Kacheln breit** (`HouseDoor.span`).
 *
 * Gewünscht war: _„davon auch eine Breite 2x1 Version, die dann in der Space
 * Station genutzt wird, und es dort nur 2x1-Türen gibt"_ — der Durchgang aus
 * dem Regal (`prototype-bits/Wall_Doorway_Wide`, `world3d/stationDoors.ts`)
 * ist zwei Kacheln breit, und ein Gang auch. Eine Tür ist damit zwei
 * nebeneinanderliegende Kachelkanten derselben Wand: die an `x`/`z` und die
 * nächste längs der Wand (`doorEdges`). `STATION_DOOR_W` bleibt die Breite
 * **einer** Kante — der Plan setzt je Kante eine Tür ohne Pfosten —, die
 * ganze Öffnung ist `doorWidth(door)`.
 */
export const STATION_DOOR_SPAN = 2;

/**
 * **Mindestens drei Meter Boden zwischen zwei Türen, die man nacheinander
 * durchschreitet** — Türmitte zu Türmitte, sechs Felder
 * (`stationRules.DOOR_GAP_CELLS`). Gewünscht: _„Keine zwei Türen direkt
 * hintereinander"_. `connectStation` setzt die Raumtüren danach.
 */
export const STATION_DOOR_GAP = 3;

/** Längs welcher Achse eine Tür in Richtung `dir` weiterläuft: an N/S nach Osten, an O/W nach Süden. */
export function doorAlong(dir: Dir): { x: number; z: number } {
  return dir === DIR_N || dir === DIR_S ? { x: 1, z: 0 } : { x: 0, z: 1 };
}

/** Die Kachelkanten einer Tür, von ihrer ersten an (`HouseDoor.span`, ohne Angabe eine). */
export function doorEdges(door: {
  x: number;
  z: number;
  dir: Dir;
  span?: number;
}): Array<{ x: number; z: number; dir: Dir }> {
  const along = doorAlong(door.dir);
  const out: Array<{ x: number; z: number; dir: Dir }> = [];
  for (let i = 0; i < (door.span ?? 1); i++)
    out.push({ x: door.x + along.x * i, z: door.z + along.z * i, dir: door.dir });
  return out;
}

/** Wie breit die ganze Öffnung einer Tür ist, in Metern. */
export function doorWidth(door: { span?: number }): number {
  return (door.span ?? 1) * STATION_DOOR_W;
}

/** Die Mitte einer Tür auf ihrer Wand — bei zwei Kacheln die Fuge zwischen beiden. */
export function doorMiddle(door: { x: number; z: number; dir: Dir; span?: number }): {
  x: number;
  z: number;
} {
  const along = doorAlong(door.dir);
  const extra = ((door.span ?? 1) - 1) / 2;
  const nx = door.dir === DIR_E ? 1 : door.dir === DIR_W ? -1 : 0;
  const nz = door.dir === DIR_S ? 1 : door.dir === DIR_N ? -1 : 0;
  return {
    x: (door.x + 0.5 + nx * 0.5 + along.x * extra) * TILE,
    z: (door.z + 0.5 + nz * 0.5 + along.z * extra) * TILE,
  };
}
import { Rng } from './rng';
import { STATION_MAP, STATION_ORIGIN } from './stationMap';
import { STATION_VENTS } from './vents/ventNet.data';
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

/**
 * Wo das gewürfelte Haus auf dem Gitter steht — **nördlich der Zentrale**, mit
 * seiner Südwand an deren Vorplatz. Nur der alte Zufallsgrundriss benutzt es;
 * die Station bringt ihre eigenen Rechtecke mit. Seit die Kachel ein Meter
 * ist (September 2026), stehen hier Meter: vierzig mal dreißig, dieselben
 * Maße wie vorher in sechzehn mal zwölf Kacheln zu je zweieinhalb.
 */
export const HOUSE: Rect = { x: -20, z: -87, w: 40, d: 30 };
/**
 * **Das Rechteck der festen Station** (`stationRooms`), in Kacheln zu einem
 * Meter: 70 × 60, von Reactor bis Navigation, vom Vorplatzrand der Cafeteria
 * bis unter Communications. Eine Konstante, weil drei Stellen dieselben
 * Zahlen brauchen — die Zellenschleife der Gänge, die Himmelsrichtung eines
 * Gangnamens und die Lehrzimmer, die 15 m östlich davon stehen.
 */
export const STATION_BOUNDS: Rect = {
  x: STATION_ORIGIN.x,
  z: STATION_ORIGIN.z,
  w: STATION_MAP[0]!.length,
  d: STATION_MAP.length,
};
/** Wie breit der Tisch der Einsatzzentrale ist, in Kacheln. */
export const VAN_W = 4;

/**
 * **Der Vorplatz** — die zwei Kachelreihen der Einsatzzentrale, und seit
 * dieser Runde liegen sie **an der Kantine** statt am anderen Ende der
 * Station.
 *
 * Er gehört zum Gitter, und das ist keine Kulisse: Ohne Kacheln davor gäbe es
 * für die Wegsuche keine Einsatzzentrale, die Drohne müsste im Haus starten und käme nie
 * wieder heraus. Mit ihm ist „zurück zur Einsatzzentrale" derselbe Flug wie jeder andere —
 * eine Wegsuche durch die Haustür, die zu ist, wenn jemand sie zugemacht hat.
 *
 * **Warum an der Kantine.** Die Zentrale lag früher ganz im Süden, hinter
 * einem Andockkorridor, den sonst niemand betrat: Wer die Runde anfing, sah
 * eine leere Röhre und danach eine Tür. Jetzt grenzt sie mit einer
 * **Fensterfront** (`commandWindows`) an die Cafeteria — der größte Raum der
 * Station liegt im ersten Bild, man sieht hinein, bevor man hineingeht, und
 * wer in der Einsatzzentrale sitzt, sieht das Monster durch die Scheibe darin herumlaufen.
 *
 * Dass das Monster ihn **nicht** benutzt, steht nicht hier, sondern als eine
 * Zeile bei seinem Ziel (`HauntingWorld.npcTarget`): Die Einsatzzentrale ist die Stelle,
 * an der abgelegt wird, und was dort steht, macht aus einer Runde eine
 * Belagerung.
 */
export const APRON: Rect = { x: HOUSE.x, z: HOUSE.z + HOUSE.d, w: HOUSE.w, d: 5 };

/** Die Vorplatzreihe an der Fensterfront: Tisch der Einsatzzentrale, Terminal, Rückkehrpunkt. */
export const APRON_INNER = APRON.z + APRON.d - 1;
/** Die äußere Reihe mit Hüllenfenstern: Abendlicht über dem Vorplatz. */
export const APRON_OUTER = APRON.z;
/**
 * Der Aufzugsschacht zum Testdeck, in Kacheln: **zwei mal zwei** in der
 * Nordostecke des Vorplatzes. Eine Kachel war er, solange eine Kachel
 * zweieinhalb Meter maß; ein Aufzug von einem Quadratmeter wäre ein Spind.
 */
export const COMMAND_LIFT = { x: APRON.x + APRON.w - 3, z: APRON_OUTER, w: 2, d: 2 } as const;
/** Die Kachelreihe, in der die Einsatzzentrale steht. */
export const VAN_Z = APRON_INNER;

/** Die Kennung der Einsatzzentrale — kein Zimmer des Hauses, aber ein Ort. */
export const VAN_ID = 'van';

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
  | 'esstisch'
  | 'ausgabe';

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
  ausgabe: 'Kantinenausgabe',
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
  { id: 'kueche', label: 'Kantine', signature: 'ofen', extras: ['spuele', 'esstisch', 'ausgabe'] },
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
  /** Transit spaces have architecture/light but no mission furniture or archive dossier. */
  circulation?: boolean;
  /**
   * **Abgeschrägte Ecken** — die 45°-Wände der Vorlage
   * (`docs/orbital/station-vorlage.webp`). Siehe `CornerCut`.
   */
  cuts?: CornerCut[];
  /**
   * **Die Form, Kachel für Kachel** — für Räume, die kein Rechteck mit
   * abgeschrägten Ecken sind: die Station nach der Vorlage
   * (`stationMap.ts`), mit Nischen, Anbauten und versetzten Schrägen.
   * Schlüssel `"x,z"`; `null` ist eine ganze Kachel, eine Ecke die
   * abgeschnittene Ecke einer Schrägkachel. Was fehlt, gehört nicht zum Raum
   * (`cutAt` → `'out'`). `rect` ist dann das umschließende Rechteck, und
   * `cuts` bleibt leer.
   */
  shape?: ReadonlyMap<string, Corner | null>;
}

/** Eine Ecke eines Raums, nach Himmelsrichtung. */
export type Corner = 'nw' | 'ne' | 'se' | 'sw';

/**
 * **Eine Ecke unter 45° abgeschnitten**, `size` Kacheln lang an jeder der
 * beiden Wände.
 *
 * Die Wand läuft schräg von Wand zu Wand. Die Kacheln, durch die sie geht,
 * tragen eine Schräge (`Slope`, im Bauplan `GridPlan.slope`) und gehören
 * weiter zum Raum — ihre innere Hälfte ist Boden, auf dem man geht
 * (`nav/cellGrid.slopeBlocks`). Die Kacheln dahinter, in der Ecke, gehören
 * zu keinem Raum mehr (`cutAt` → `'out'`).
 */
export interface CornerCut {
  corner: Corner;
  size: number;
}

/**
 * **Was eine abgeschrägte Ecke aus dieser Kachel macht**: `'out'` für eine
 * Kachel hinter der schrägen Wand, die Schräge für eine Kachel, durch die sie
 * geht, `null` für eine gewöhnliche.
 */
export function cutAt(room: HouseRoom, x: number, z: number): 'out' | Slope | null {
  if (room.shape) {
    const corner = room.shape.get(`${x},${z}`);
    return corner === undefined ? 'out' : corner === null ? null : cutSlope(corner);
  }
  if (!room.cuts) return null;
  const r = room.rect;
  for (const cut of room.cuts) {
    const i = cut.corner === 'nw' || cut.corner === 'sw' ? x - r.x : r.x + r.w - 1 - x;
    const j = cut.corner === 'nw' || cut.corner === 'ne' ? z - r.z : r.z + r.d - 1 - z;
    if (i < 0 || j < 0 || i + j > cut.size - 1) continue;
    if (i + j < cut.size - 1) return 'out';
    return cutSlope(cut.corner);
  }
  return null;
}

/** Nordwest und Südost schneidet ein „╱", Nordost und Südwest ein „╲". */
export function cutSlope(corner: Corner): Slope {
  return corner === 'nw' || corner === 'se' ? 'slash' : 'backslash';
}

/** Die beiden Wände, zwischen denen die Ecke liegt — dorthin hat eine Schrägkachel keine Wand. */
export function cutSides(corner: Corner): readonly [Dir, Dir] {
  const ns = corner === 'nw' || corner === 'ne' ? DIR_N : DIR_S;
  const ew = corner === 'nw' || corner === 'sw' ? DIR_W : DIR_E;
  return [ns, ew];
}

/** Welche Ecke eine Schrägkachel dieses Raums schneidet — `null` für jede andere Kachel. */
export function cutOf(room: HouseRoom, x: number, z: number): CornerCut | null {
  if (room.shape) {
    const corner = room.shape.get(`${x},${z}`);
    return corner ? { corner, size: 1 } : null;
  }
  for (const cut of room.cuts ?? []) {
    const one = { ...room, cuts: [cut] };
    const hit = cutAt(one, x, z);
    if (hit !== null && hit !== 'out') return cut;
  }
  return null;
}

/** Die Kacheln eines Raums — ohne die hinter seinen schrägen Ecken. */
export function roomTiles(room: HouseRoom): Array<{ x: number; z: number }> {
  return tilesOf(room.rect).filter((tile) => cutAt(room, tile.x, tile.z) !== 'out');
}

/** Die ganzen Kacheln eines Raums — ohne schräge Ecken und die Kacheln dahinter. */
export function plainTiles(room: HouseRoom): Array<{ x: number; z: number }> {
  return tilesOf(room.rect).filter((tile) => cutAt(room, tile.x, tile.z) === null);
}

/**
 * **Ob ein Punkt (in Metern) im Raum liegt**, `inset` Meter von jeder Wand —
 * auch von der schrägen.
 */
export function insideSpace(room: HouseRoom, at: { x: number; z: number }, inset = 0): boolean {
  if (room.shape) {
    // Die Stelle und acht Nachbarn im Abstand `inset` — auf den Achsen für die
    // geraden Wände, schräg für die schrägen.
    const e = inset / Math.SQRT2;
    const probes = [
      [0, 0],
      [inset, 0],
      [-inset, 0],
      [0, inset],
      [0, -inset],
      [e, e],
      [e, -e],
      [-e, e],
      [-e, -e],
    ] as const;
    return probes.every(([dx, dz]) => pointInShape(room.shape!, at.x + dx, at.z + dz));
  }
  const r = room.rect;
  const x0 = r.x * TILE,
    z0 = r.z * TILE,
    x1 = (r.x + r.w) * TILE,
    z1 = (r.z + r.d) * TILE;
  if (at.x < x0 + inset || at.x > x1 - inset || at.z < z0 + inset || at.z > z1 - inset)
    return false;
  for (const cut of room.cuts ?? []) {
    const u = cut.corner === 'nw' || cut.corner === 'sw' ? at.x - x0 : x1 - at.x;
    const v = cut.corner === 'nw' || cut.corner === 'ne' ? at.z - z0 : z1 - at.z;
    if (u + v < cut.size * TILE + inset * Math.SQRT2) return false;
  }
  return true;
}

/** Wie weit eine Stelle auf einer Kachelkante zur Probe hineingerückt wird. */
const EDGE_NUDGE = 1e-6;

/**
 * **Ob eine Stelle (in Metern) in einer Form liegt** — auf einer Kante zählt
 * sie, wenn eine der anliegenden Kacheln sie hat.
 */
function pointInShape(shape: ReadonlyMap<string, Corner | null>, x: number, z: number): boolean {
  for (const dx of [-EDGE_NUDGE, EDGE_NUDGE])
    for (const dz of [-EDGE_NUDGE, EDGE_NUDGE]) {
      const px = x / TILE + dx,
        pz = z / TILE + dz;
      const tx = Math.floor(px),
        tz = Math.floor(pz);
      const corner = shape.get(`${tx},${tz}`);
      if (corner === undefined) continue;
      if (corner === null) return true;
      // Der Abstand von der abgeschnittenen Ecke, in Kacheln: ab eins ist Boden.
      const u = corner === 'nw' || corner === 'sw' ? px - tx : tx + 1 - px;
      const v = corner === 'nw' || corner === 'ne' ? pz - tz : tz + 1 - pz;
      if (u + v >= 1 - EDGE_NUDGE * 4) return true;
    }
  return false;
}

/**
 * **In welcher Kachel eine Stelle liegt — halboffen wie ein Rechteck**: Die
 * Westkante und die Nordkante gehören zur Kachel, die Ost- und die Südkante
 * zur nächsten. Für die Frage „in welchem Raum steht das?", auf die genau eine
 * Antwort kommen muss (`roomGraph.spaceAt`). Ohne Form: das Rechteck.
 */
export function spaceHolds(room: HouseRoom, at: { x: number; z: number }): boolean {
  const px = at.x / TILE,
    pz = at.z / TILE;
  const tx = Math.floor(px),
    tz = Math.floor(pz);
  if (!room.shape) {
    const r = room.rect;
    return tx >= r.x && tx < r.x + r.w && tz >= r.z && tz < r.z + r.d;
  }
  const corner = room.shape.get(`${tx},${tz}`);
  if (corner === undefined) return false;
  if (corner === null) return true;
  const u = corner === 'nw' || corner === 'sw' ? px - tx : tx + 1 - px;
  const v = corner === 'nw' || corner === 'ne' ? pz - tz : tz + 1 - pz;
  return u + v >= 1;
}

/**
 * **Ob ein Kasten (in Metern) in einer geformten Kachel-Form Platz hat** — jede
 * Kachel unter ihm gehört zum Raum, und von einer schrägen Wand hält er
 * `clear` Meter Abstand. Von einer Wand im Innern des Rechtecks (einer Nische)
 * hält er denselben Abstand; die Außenwände des Rechtecks regelt, wer ihn
 * aufstellt (`stationLayout`).
 */
export function boxInShape(
  room: HouseRoom,
  box: { minX: number; minZ: number; maxX: number; maxZ: number },
  clear: number,
): boolean {
  const shape = room.shape;
  if (!shape) return true;
  const r = room.rect;
  const x0 = Math.max(r.x, Math.floor((box.minX - clear) / TILE)),
    x1 = Math.min(r.x + r.w - 1, Math.ceil((box.maxX + clear) / TILE) - 1),
    z0 = Math.max(r.z, Math.floor((box.minZ - clear) / TILE)),
    z1 = Math.min(r.z + r.d - 1, Math.ceil((box.maxZ + clear) / TILE) - 1);
  for (let tz = z0; tz <= z1; tz++)
    for (let tx = x0; tx <= x1; tx++) {
      const corner = shape.get(`${tx},${tz}`);
      if (corner === undefined) return false;
      if (corner === null) continue;
      // Der Teil des Kastens in dieser Kachel, und daran die Stelle, die der
      // abgeschnittenen Ecke am nächsten kommt.
      const ax = Math.max(box.minX, tx * TILE),
        bx = Math.min(box.maxX, (tx + 1) * TILE),
        az = Math.max(box.minZ, tz * TILE),
        bz = Math.min(box.maxZ, (tz + 1) * TILE);
      if (ax >= bx || az >= bz) continue;
      const u = corner === 'nw' || corner === 'sw' ? ax - tx * TILE : (tx + 1) * TILE - bx;
      const v = corner === 'nw' || corner === 'ne' ? az - tz * TILE : (tz + 1) * TILE - bz;
      if (u + v < TILE + clear * Math.SQRT2) return false;
    }
  return true;
}

/**
 * **Der Umriss einer geformten Kachel-Form** — die Außenkante ihrer Kacheln,
 * gerade und schräg, in derselben Umlaufrichtung wie `roomOutline`.
 */
function shapeOutline(shape: ReadonlyMap<string, Corner | null>): Array<{ x: number; z: number }> {
  const edges = new Map<string, { a: [number, number]; b: [number, number] }>();
  const key = (a: [number, number], b: [number, number]): string => `${a}|${b}`;
  for (const [at, corner] of shape) {
    const [tx, tz] = at.split(',').map(Number) as [number, number];
    // Nordwest, Südwest, Südost, Nordost — ohne die abgeschnittene Ecke.
    const all: Array<[Corner, [number, number]]> = [
      ['nw', [tx, tz]],
      ['sw', [tx, tz + 1]],
      ['se', [tx + 1, tz + 1]],
      ['ne', [tx + 1, tz]],
    ];
    const ring = all.filter(([name]) => name !== corner).map(([, p]) => p);
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]!,
        b = ring[(i + 1) % ring.length]!;
      // Eine Kante, die die Nachbarkachel andersherum hat, liegt innen.
      const back = key(b, a);
      if (edges.has(back)) edges.delete(back);
      else edges.set(key(a, b), { a, b });
    }
  }
  const from = new Map<string, { a: [number, number]; b: [number, number] }>();
  for (const edge of edges.values()) from.set(`${edge.a}`, edge);
  // Anfang: die nördlichste, dann westlichste Ecke — wie bei `roomOutline`.
  let start: [number, number] | null = null;
  for (const edge of edges.values())
    if (!start || edge.a[1] < start[1] || (edge.a[1] === start[1] && edge.a[0] < start[0]))
      start = edge.a;
  const points: Array<[number, number]> = [];
  let at = start;
  for (let guard = 0; at && guard <= edges.size; guard++) {
    points.push(at);
    const next = from.get(`${at}`)?.b;
    if (!next || (next[0] === start![0] && next[1] === start![1])) break;
    at = next;
  }
  // Wo die Richtung nicht wechselt, ist keine Ecke.
  const out: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i + points.length - 1) % points.length]!,
      here = points[i]!,
      next = points[(i + 1) % points.length]!;
    const cross =
      (here[0] - prev[0]) * (next[1] - here[1]) - (here[1] - prev[1]) * (next[0] - here[0]);
    if (Math.abs(cross) > 1e-9) out.push({ x: here[0] * TILE, z: here[1] * TILE });
  }
  return out;
}

/**
 * **Die Umrisse der geformten Räume, einmal je Form gerechnet.**
 *
 * `shapeOutline` läuft über jede Kachel einer Form, baut Zeichenketten als
 * Schlüssel und sucht darin den Rand — gut hundert Kacheln je Raum, gut
 * tausend je Station. Gefragt wird aber in **jedem Bild**, und zwar zweimal:
 * Der Hörweg der Brille (`ShipExperience.stepSound`, `mapSnapshot`) und die
 * Runde des Kerns (`FlatRound.snapshot`) bauen je einen Kartenstand, und jeder
 * Kartenstand fragt jeden Raum nach seinem Umriss (`map/extract.roomsOf`).
 * Gemessen waren das 4,3 ms je Stand auf einem Desktop-Prozessor, also rund
 * 9 ms je Bild — auf einer Quest mehr als das ganze Bild hat. Die Form
 * ändert sich nach dem Bau der Station nie (`stationShapes`), also gilt ihr
 * Umriss so lange wie sie.
 *
 * **Die Liste wird geteilt** und darf nicht verändert werden — sie gehört
 * dem Cache, nicht dem Aufrufer.
 */
const shapeOutlines = new WeakMap<
  ReadonlyMap<string, Corner | null>,
  Array<{ x: number; z: number }>
>();

/**
 * **Der Umriss eines Raums** in Metern, ab Nordwest — ein
 * Rechteck, dem die schrägen Ecken abgeschnitten sind.
 */
export function roomOutline(room: HouseRoom): Array<{ x: number; z: number }> {
  if (room.shape) {
    let outline = shapeOutlines.get(room.shape);
    if (!outline) {
      outline = shapeOutline(room.shape);
      shapeOutlines.set(room.shape, outline);
    }
    return outline;
  }
  const r = room.rect;
  const x0 = r.x * TILE,
    z0 = r.z * TILE,
    x1 = (r.x + r.w) * TILE,
    z1 = (r.z + r.d) * TILE;
  const size = (corner: Corner): number =>
    (room.cuts?.find((cut) => cut.corner === corner)?.size ?? 0) * TILE;
  const out: Array<{ x: number; z: number }> = [];
  const push = (x: number, z: number): void => {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - x) > 1e-9 || Math.abs(last.z - z) > 1e-9) out.push({ x, z });
  };
  // Dieselbe Umlaufrichtung wie `map/geometry.rectPolygon`: Nordwest, Südwest,
  // Südost, Nordost.
  push(x0 + size('nw'), z0);
  push(x0, z0 + size('nw'));
  push(x0, z1 - size('sw'));
  push(x0 + size('sw'), z1);
  push(x1 - size('se'), z1);
  push(x1, z1 - size('se'));
  push(x1, z0 + size('ne'));
  push(x1 - size('ne'), z0);
  const first = out[0]!,
    last = out[out.length - 1]!;
  if (Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.z - last.z) < 1e-9) out.pop();
  return out;
}

/** Die schrägen Wände eines Raums als Strecken in Metern. */
export function cutWalls(
  room: HouseRoom,
): Array<{ a: { x: number; z: number }; b: { x: number; z: number }; corner: Corner }> {
  if (room.shape) return shapeCutWalls(room.shape);
  const r = room.rect;
  const x0 = r.x * TILE,
    z0 = r.z * TILE,
    x1 = (r.x + r.w) * TILE,
    z1 = (r.z + r.d) * TILE;
  return (room.cuts ?? []).map((cut) => {
    const s = cut.size * TILE;
    switch (cut.corner) {
      case 'nw':
        return { a: { x: x0, z: z0 + s }, b: { x: x0 + s, z: z0 }, corner: cut.corner };
      case 'ne':
        return { a: { x: x1 - s, z: z0 }, b: { x: x1, z: z0 + s }, corner: cut.corner };
      case 'se':
        return { a: { x: x1, z: z1 - s }, b: { x: x1 - s, z: z1 }, corner: cut.corner };
      case 'sw':
        return { a: { x: x0 + s, z: z1 }, b: { x: x0, z: z1 - s }, corner: cut.corner };
    }
  });
}

/**
 * **Die schrägen Wände einer geformten Kachel-Form** — je Schrägkachel eine
 * Strecke, und was aneinanderstößt, zu einer zusammengelegt. Die Richtung ist
 * die von `cutWalls`.
 */
function shapeCutWalls(
  shape: ReadonlyMap<string, Corner | null>,
): Array<{ a: { x: number; z: number }; b: { x: number; z: number }; corner: Corner }> {
  const pieces: Array<{
    a: { x: number; z: number };
    b: { x: number; z: number };
    corner: Corner;
  }> = [];
  for (const [at, corner] of shape) {
    if (!corner) continue;
    const [tx, tz] = at.split(',').map(Number) as [number, number];
    const x0 = tx * TILE,
      z0 = tz * TILE,
      x1 = (tx + 1) * TILE,
      z1 = (tz + 1) * TILE;
    const ends: Record<Corner, [[number, number], [number, number]]> = {
      nw: [
        [x0, z1],
        [x1, z0],
      ],
      ne: [
        [x0, z0],
        [x1, z1],
      ],
      se: [
        [x1, z0],
        [x0, z1],
      ],
      sw: [
        [x1, z1],
        [x0, z0],
      ],
    };
    const [a, b] = ends[corner];
    pieces.push({ a: { x: a[0], z: a[1] }, b: { x: b[0], z: b[1] }, corner });
  }
  const same = (p: { x: number; z: number }, q: { x: number; z: number }): boolean =>
    Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.z - q.z) < 1e-9;
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < pieces.length && !merged; i++)
      for (let j = 0; j < pieces.length && !merged; j++) {
        if (i === j || pieces[i]!.corner !== pieces[j]!.corner) continue;
        if (!same(pieces[i]!.b, pieces[j]!.a)) continue;
        pieces[i] = { ...pieces[i]!, b: pieces[j]!.b };
        pieces.splice(j, 1);
        merged = true;
      }
  }
  return pieces;
}

/**
 * **Die geraden Wände eines Raums** als Strecken in Metern, jede so lang, wie
 * sie ohne Knick läuft — ohne die schrägen (`cutWalls`) und ohne die offenen
 * Seiten einer Schrägkachel. `at` ist die Lage der Fuge quer zur Achse.
 */
export function straightWalls(room: HouseRoom): Array<{
  a: { x: number; z: number };
  b: { x: number; z: number };
  axis: 'x' | 'z';
  at: number;
}> {
  const r = room.rect;
  const x0 = r.x * TILE,
    z0 = r.z * TILE,
    x1 = (r.x + r.w) * TILE,
    z1 = (r.z + r.d) * TILE;
  if (!room.shape) {
    const cut = (corner: Corner): number =>
      (room.cuts?.find((one) => one.corner === corner)?.size ?? 0) * TILE;
    return [
      { a: { x: x0 + cut('nw'), z: z0 }, b: { x: x1 - cut('ne'), z: z0 }, axis: 'x', at: z0 },
      { a: { x: x0 + cut('sw'), z: z1 }, b: { x: x1 - cut('se'), z: z1 }, axis: 'x', at: z1 },
      { a: { x: x0, z: z0 + cut('nw') }, b: { x: x0, z: z1 - cut('sw') }, axis: 'z', at: x0 },
      { a: { x: x1, z: z0 + cut('ne') }, b: { x: x1, z: z1 - cut('se') }, axis: 'z', at: x1 },
    ];
  }
  // Jede Kachelkante am Rand der Form, nach Fuge gesammelt …
  const lines = new Map<string, { axis: 'x' | 'z'; at: number; from: number[] }>();
  for (const tile of roomTiles(room)) {
    const cut = cutOf(room, tile.x, tile.z);
    for (const dir of [DIR_N, DIR_E, DIR_S, DIR_W] as const) {
      if (cut && cutSides(cut.corner).includes(dir)) continue;
      const nx = tile.x + (dir === DIR_E ? 1 : dir === DIR_W ? -1 : 0),
        nz = tile.z + (dir === DIR_S ? 1 : dir === DIR_N ? -1 : 0);
      if (room.shape.has(`${nx},${nz}`)) continue;
      const axis = dir === DIR_N || dir === DIR_S ? 'x' : 'z';
      const at =
        dir === DIR_N ? tile.z : dir === DIR_S ? tile.z + 1 : dir === DIR_W ? tile.x : tile.x + 1;
      const id = `${axis}${at}`;
      const line = lines.get(id) ?? { axis, at, from: [] };
      line.from.push(axis === 'x' ? tile.x : tile.z);
      lines.set(id, line);
    }
  }
  // … und was lückenlos aneinanderstößt, zu einer Strecke.
  const out: ReturnType<typeof straightWalls> = [];
  for (const { axis, at, from } of lines.values()) {
    from.sort((a, b) => a - b);
    let start = from[0]!,
      last = start;
    for (let i = 1; i <= from.length; i++) {
      const next = from[i];
      if (next === last + 1) {
        last = next;
        continue;
      }
      const a = start * TILE,
        b = (last + 1) * TILE;
      out.push(
        axis === 'x'
          ? { a: { x: a, z: at * TILE }, b: { x: b, z: at * TILE }, axis, at: at * TILE }
          : { a: { x: at * TILE, z: a }, b: { x: at * TILE, z: b }, axis, at: at * TILE },
      );
      if (next === undefined) break;
      start = last = next;
    }
  }
  return out;
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
  /**
   * Wie viele Kachelkanten die Tür längs ihrer Wand misst (`doorEdges`) —
   * ohne Angabe eine, in der Station zwei (`STATION_DOOR_SPAN`).
   */
  span?: number;
  /**
   * **Ein offener Durchgang, keine Tür** — die Fuge zwischen zwei Gangstücken
   * (`connectStation`). Gewünscht: _„keine zwei Türen direkt
   * hintereinander"_ — und im Gang stand an jeder Fuge ein Schott, Tür hinter
   * Tür. Jetzt läuft der Gang dort durch: keine Wand, kein Blatt, kein Knopf,
   * kein Schalter der Tafel, und schließen kann ihn niemand. Als Eintrag in
   * `doors` bleibt er, weil alles, was Räume verbindet (Raumgraph, Hören,
   * Sicht, Wege), ihn als immer offene Verbindung braucht; was ein Türblatt
   * meint, fragt `leafDoors`.
   */
  passage?: boolean;
}

/** Ob das ein offener Durchgang ist und keine Tür (`HouseDoor.passage`). */
export function isPassage(door: object): boolean {
  return (door as { passage?: unknown }).passage === true;
}

/**
 * **Die Türen mit Blatt** — alles, was auf- und zugehen, gesperrt, gezeichnet
 * oder geschaltet werden kann. Die offenen Durchgänge zwischen zwei
 * Gangstücken gehören nicht dazu (`HouseDoor.passage`).
 */
export function leafDoors<T extends object>(spec: { doors: readonly T[] }): T[] {
  return spec.doors.filter((door) => !isPassage(door));
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
  /** Separate transit modules preserve the selected number of actual mission rooms. */
  passages?: HouseRoom[];
  bounds?: Rect;
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
  const station = roomCount === undefined ? null : stationRooms();
  const rects = station?.rooms.map((room) => room.rect) ?? splitRooms(rng, HOUSE);
  const rooms = station?.rooms ?? nameRooms(rng, rects);
  const passages = station?.passages;
  const spaces = [...rooms, ...(passages ?? [])];
  const { doors, entryRoom, frontDoor } = passages
    ? connectStation(rooms, passages)
    : connect(rng, rooms);
  placeMarks(rng, rooms, doorTiles(doors));
  // **Nach den Möbeln und nicht davor**: Ein Fenster hinter dem Bücherregal
  // ist von innen nichts und von außen ein Rätsel, und welche Kachel ein Regal
  // trägt, steht erst jetzt fest.
  const windows = station
    ? stationWindows(rng, rooms, spaces, doors, entryRoom)
    : placeWindows(rng, rooms, doors);
  const fuse = placeFuse(rng, spaces, entryRoom, rooms);
  const tasks = placeTasks(rng, rooms, entryRoom);
  darkenOne(rng, rooms, entryRoom);
  const switches = buildPanel(rng, spaces, leafDoors({ doors }));
  return {
    seed,
    rooms,
    doors,
    windows,
    entryRoom,
    frontDoor,
    fuse,
    tasks,
    switches,
    ...(station ? { passages, bounds: station.bounds } : {}),
  };
}

/**
 * **Die Räume der Station** — Buchstabe in `STATION_MAP`, Name, Art und
 * Merkmal. Die Reihenfolge ist die der Kennungen (`r0` … `r13`).
 */
const STATION_ROOMS: ReadonlyArray<readonly [string, string, RoomKind, MarkId]> = [
  ['A', 'Cafeteria', 'kueche', 'ofen'],
  ['C', 'Upper Engine', 'werkstatt', 'werkbank'],
  ['E', 'Reactor', 'wohnzimmer', 'kamin'],
  ['G', 'Security', 'bibliothek', 'buecher'],
  ['D', 'MedBay', 'bad', 'wanne'],
  ['L', 'Lower Engine', 'werkstatt', 'werkbank'],
  ['J', 'Electrical', 'kammer', 'kiste'],
  ['K', 'Storage', 'kammer', 'kiste'],
  ['B', 'Weapons', 'werkstatt', 'werkbank'],
  ['F', 'O2', 'esszimmer', 'standuhr'],
  ['H', 'Navigation', 'musikzimmer', 'sessel'],
  ['I', 'Admin', 'bibliothek', 'buecher'],
  ['M', 'Shields', 'werkstatt', 'werkbank'],
  ['N', 'Communications', 'musikzimmer', 'klavier'],
];

/**
 * **Die Formen der Räume aus `STATION_MAP`** — je Buchstabe die Kacheln und
 * an jeder Schrägkachel die abgeschnittene Ecke: die, an deren beiden Seiten
 * nicht derselbe Raum liegt.
 */
export function stationShapes(): Map<string, Map<string, Corner | null>> {
  const at = (x: number, z: number): string => STATION_MAP[z]?.[x] ?? '.';
  const out = new Map<string, Map<string, Corner | null>>();
  STATION_MAP.forEach((row, z) => {
    for (let x = 0; x < row.length; x++) {
      const char = row[x]!;
      if (char === '.' || char === ':') continue;
      const letter = char.toUpperCase();
      const mine = (dx: number, dz: number): boolean => at(x + dx, z + dz).toUpperCase() === letter;
      let corner: Corner | null = null;
      if (char !== letter) {
        const open = {
          nw: !mine(0, -1) && !mine(-1, 0),
          ne: !mine(0, -1) && !mine(1, 0),
          se: !mine(0, 1) && !mine(1, 0),
          sw: !mine(0, 1) && !mine(-1, 0),
        };
        const found = (['nw', 'ne', 'se', 'sw'] as const).filter((one) => open[one]);
        if (found.length !== 1)
          throw new Error(`Schrägkachel ${char} bei ${x},${z}: Ecke nicht eindeutig`);
        corner = found[0]!;
      }
      const shape = out.get(letter) ?? new Map<string, Corner | null>();
      shape.set(`${STATION_ORIGIN.x + x},${STATION_ORIGIN.z + z}`, corner);
      out.set(letter, shape);
    }
  });
  return out;
}

/** Fixed Skeld topology — Kachel für Kachel aus der Vorlage (`stationMap.ts`). */
function stationRooms(): { rooms: HouseRoom[]; passages: HouseRoom[]; bounds: Rect } {
  // **Nach der Vorlage des Besitzers, 20 Pixel = 1 m** (`STATION_MAP`). Die
  // Räume sind so geformt, wie sie gezeichnet sind — mit Nischen, Anbauten
  // und 45°-Wänden —, die Gänge nach den Regeln des Besitzers
  // (`stationRules.ts`): vier Felder breit, ohne Stummel. **Kein
  // Raum berührt einen anderen Raum**: Zwischen zwei Räumen liegt immer ein
  // Gang oder eine Fuge — sonst hörte das Monster durch eine Wand, die es
  // vorher nicht gab (`roomGraph.earshot`, `WALL_LOSS`).
  const shapes = stationShapes();
  const rooms = STATION_ROOMS.map(([letter, name, kind, signature], i): HouseRoom => {
    const shape = shapes.get(letter);
    if (!shape) throw new Error(`Raum ${letter} fehlt in der Vorlage`);
    const xs = [...shape.keys()].map((key) => Number(key.split(',')[0]));
    const zs = [...shape.keys()].map((key) => Number(key.split(',')[1]));
    const x = Math.min(...xs),
      z = Math.min(...zs);
    return {
      id: `r${i}`,
      name,
      kind,
      signature,
      rect: { x, z, w: Math.max(...xs) - x + 1, d: Math.max(...zs) - z + 1 },
      marks: [],
      lamp: true,
      shape,
    };
  });
  // Die Gänge: jede Kachel `:`, zu Rechtecken zusammengelegt.
  const cells = new Set<string>();
  STATION_MAP.forEach((row, z) => {
    for (let x = 0; x < row.length; x++)
      if (row[x] === ':') cells.add(`${STATION_ORIGIN.x + x},${STATION_ORIGIN.z + z}`);
  });
  const passages: HouseRoom[] = [];
  for (let z = STATION_BOUNDS.z; z < STATION_BOUNDS.z + STATION_BOUNDS.d; z++)
    for (let x = STATION_BOUNDS.x; x < STATION_BOUNDS.x + STATION_BOUNDS.w; x++) {
      if (!cells.has(`${x},${z}`)) continue;
      let w = 1;
      while (cells.has(`${x + w},${z}`)) w++;
      let d = 1;
      while (Array.from({ length: w }, (_, i) => cells.has(`${x + i},${z + d}`)).every(Boolean))
        d++;
      for (let dz = 0; dz < d; dz++)
        for (let dx = 0; dx < w; dx++) cells.delete(`${x + dx},${z + dz}`);
      passages.push({
        id: `p${passages.length}`,
        name: '',
        kind: 'kammer',
        signature: 'kiste',
        rect: { x, z, w, d },
        marks: [],
        lamp: true,
        circulation: true,
      });
    }
  namePassages(rooms, passages);
  return { rooms, passages, bounds: STATION_BOUNDS };
}

/**
 * **Ein Gang braucht einen Namen**, sonst kann ihn niemand ansagen.
 *
 * „Ich bin im Verbindungsgang" war vierzehnmal wahr und einmal nützlich. Der
 * Name kommt deshalb aus der Nachbarschaft und nicht aus einer Liste: Jeder
 * Gang heißt nach dem Raum, mit dem er die **längste Wand** teilt, plus der
 * Himmelsrichtung, in der er von dessen Mitte aus liegt — „Cafeteria-Südgang".
 * Das ist etwas, das man über Funk sagen und auf dem Grundriss wiederfinden
 * kann, und es bleibt bei festem Grundriss von Runde zu Runde dasselbe.
 *
 * Gänge ohne anliegenden Raum (reine Kreuzungsstücke) heißen nach ihrer Lage
 * auf der Karte; doppelte Namen bekommen eine römische Nummer, damit zwei
 * Ansagen nie dasselbe Wort meinen.
 */
export function namePassages(rooms: readonly HouseRoom[], passages: HouseRoom[]): void {
  const used = new Map<string, number>();
  for (const passage of passages) {
    let best: { room: HouseRoom; length: number } | null = null;
    for (const room of rooms) {
      const length = shared(passage.rect, room.rect).length;
      if (
        length > 0 &&
        (!best || length > best.length || (length === best.length && room.id < best.room.id))
      )
        best = { room, length };
    }
    const base = best
      ? `${best.room.name}-${compass(best.room.rect, passage.rect)}gang`
      : `${compass(STATION_BOUNDS, passage.rect)}gang`;
    const seen = (used.get(base) ?? 0) + 1;
    used.set(base, seen);
    passage.name = seen === 1 ? base : `${base} ${'ⅠⅡⅢⅣⅤⅥⅦⅧⅨ'[seen - 1] ?? seen}`;
  }
}

/** In welcher Himmelsrichtung `b` von der Mitte von `a` aus liegt. */
function compass(a: Rect, b: Rect): string {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dz = b.z + b.d / 2 - (a.z + a.d / 2);
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'Ost' : 'West';
  return dz > 0 ? 'Süd' : 'Nord';
}

function connectStation(
  rooms: readonly HouseRoom[],
  passages: readonly HouseRoom[],
): { doors: HouseDoor[]; entryRoom: string; frontDoor: string } {
  const doors: HouseDoor[] = [];
  const add = (
    a: HouseRoom,
    b: HouseRoom | null,
    spot: { x: number; z: number; dir: Dir },
    span = STATION_DOOR_SPAN,
    passage = false,
  ): void => {
    doors.push({
      id: `d${doors.length}`,
      a: a.id,
      b: b?.id ?? null,
      ...spot,
      material: 'metal',
      span,
      ...(passage ? { passage: true } : {}),
    });
  };
  // Zwischen zwei Gängen steht die ganze gemeinsame Kante offen — in Türen
  // zu zwei Kacheln, und ein ungerader Rest bekommt eine einzelne. Diese
  // Fugen liegen fest; sie werden zuerst gerechnet, damit die Raumtüren
  // ihnen ausweichen können (`stationRules`, Regel 3), und erst hinter den
  // Raumtüren eingereiht, damit die Kennungen `d0` … bleiben, wie sie waren.
  const seams: Array<{
    a: HouseRoom;
    b: HouseRoom;
    spot: { x: number; z: number; dir: Dir };
    span: number;
  }> = [];
  for (let i = 0; i < passages.length; i++)
    for (let j = i + 1; j < passages.length; j++) {
      const spots = shared(passages[i]!.rect, passages[j]!.rect);
      for (let k = 0; k < spots.length; k += STATION_DOOR_SPAN)
        seams.push({
          a: passages[i]!,
          b: passages[j]!,
          spot: spots[k]!,
          span: Math.min(STATION_DOOR_SPAN, spots.length - k),
        });
    }
  // Wo schon eine Tür sitzt, je Raum oder Gang: Mitte und wohin sie führt.
  const placed = new Map<string, Array<{ x: number; z: number; to: string }>>();
  const note = (
    a: HouseRoom,
    b: HouseRoom,
    spot: { x: number; z: number; dir: Dir },
    span: number,
  ): void => {
    const middle = doorMiddle({ ...spot, span });
    for (const [here, there] of [
      [a, b],
      [b, a],
    ] as const)
      placed.set(here.id, [...(placed.get(here.id) ?? []), { ...middle, to: there.id }]);
  };
  for (const seam of seams) note(seam.a, seam.b, seam.spot, seam.span);
  // **Keine zwei Türen direkt hintereinander** (`stationRules.DOOR_GAP_CELLS`):
  // Wie weit eine Tür bei `spot` von der nächsten Tür desselben Raums oder
  // Gangs liegt, die woandershin führt — gedeckelt bei `STATION_DOOR_GAP`,
  // denn weiter weg ist gleich gut.
  const clearance = (
    a: HouseRoom,
    b: HouseRoom,
    spot: { x: number; z: number; dir: Dir },
  ): number => {
    const middle = doorMiddle({ ...spot, span: STATION_DOOR_SPAN });
    let least = STATION_DOOR_GAP;
    for (const [here, there] of [
      [a, b],
      [b, a],
    ] as const)
      for (const other of placed.get(here.id) ?? [])
        if (other.to !== there.id)
          least = Math.min(least, Math.hypot(other.x - middle.x, other.z - middle.z));
    return least;
  };
  // A room is entered from the gallery above/below. Keep the middle of each
  // wall free for the approach; no random corner doorway can pinch the capsule.
  // **Zwei Kacheln je Tür** (`STATION_DOOR_SPAN`): `spots` läuft längs der
  // Wand, also ist `spots[k + 1]` die zweite Kante einer Tür, die bei `k`
  // anfängt — wenn beide auf derselben geraden Wand liegen.
  const put = (
    a: HouseRoom,
    b: HouseRoom,
    spot: { x: number; z: number; dir: Dir },
    span?: number,
  ): void => {
    add(a, b, spot, span);
    note(a, b, spot, span ?? STATION_DOOR_SPAN);
  };
  for (const r of rooms) {
    const links = passages
      .map((p) => ({
        p,
        spots: sharedWith(r, p.rect).filter((spot) => cutAt(r, spot.x, spot.z) === null),
      }))
      .filter(({ spots }) => spots.length > 0);
    for (const { p, spots } of links) {
      if (spots.length < STATION_DOOR_SPAN) {
        put(r, p, spots[0]!, spots.length);
        continue;
      }
      const starts = spots
        .map((spot, k) => ({ spot, k }))
        .filter(({ spot, k }) => {
          const next = spots[k + 1];
          const along = doorAlong(spot.dir);
          return (
            !!next &&
            next.dir === spot.dir &&
            next.x === spot.x + along.x &&
            next.z === spot.z + along.z
          );
        });
      if (starts.length === 0) {
        put(r, p, spots[0]!, 1);
        continue;
      }
      // Die Mitte der Wand, wenn sie weit genug von den anderen Türen liegt —
      // sonst die Stelle, die am weitesten davon weg ist. Ein Raum mit nur
      // einem Gang bekommt bei langer Wand zwei Türen, nahe den Enden, wenn
      // beide die Regel halten.
      const middle = Math.max(0, Math.floor(spots.length / 2) - 1);
      const score = (k: number): number => clearance(r, p, spots[k]!);
      // Die Wahl: erst die größte Freiheit zu den anderen Türen, dann die
      // Nähe zu den gewünschten Stellen.
      const better = (
        a: { free: number; off: number },
        b: { free: number; off: number },
      ): boolean => (Math.abs(a.free - b.free) > 1e-9 ? b.free > a.free : b.off < a.off);
      let pick: number[] = [];
      let top = { free: -1, off: Infinity };
      for (const { k } of starts) {
        const one = { free: score(k), off: Math.abs(k - middle) };
        if (better(top, one)) {
          top = one;
          pick = [k];
        }
      }
      if (links.length === 1 && spots.length >= 6 && roomTiles(r).length >= SMALL_ROOM_TILES) {
        let pair: number[] = [];
        let best = { free: -1, off: Infinity };
        for (const { k: i } of starts)
          for (const { k: j } of starts) {
            if (j - i <= STATION_DOOR_SPAN) continue;
            const two = {
              free: Math.min(score(i), score(j)),
              off: Math.abs(i - 1) + Math.abs(j - (spots.length - 3)),
            };
            if (better(best, two)) {
              best = two;
              pair = [i, j];
            }
          }
        // Zwei Türen nur, wenn beide die Regel halten — sonst lieber eine.
        if (pair.length === 2 && best.free >= STATION_DOOR_GAP - 1e-9) pick = pair;
      }
      for (const k of pick) put(r, p, spots[k]!);
    }
  }
  // Die Fugen sind offene Durchgänge, keine Türen (`HouseDoor.passage`).
  for (const seam of seams) add(seam.a, seam.b, seam.spot, seam.span, true);
  // Die Schleuse geht **in die Kantine** und nicht mehr in eine leere Röhre:
  // Die Einsatzzentrale liegt nördlich davon, mit der Fensterfront dazwischen.
  const entry = rooms.find((room) => room.name === 'Cafeteria') ?? rooms[0]!;
  add(entry, null, commandDoorTile(entry.rect));
  return { doors, entryRoom: entry.id, frontDoor: doors[doors.length - 1]!.id };
}

/** Die Kachel der Schleuse: Mitte der Wand, an der die Zentrale anliegt. */
function commandDoorTile(rect: Rect): { x: number; z: number; dir: Dir } {
  return { x: rect.x + Math.floor(rect.w / 2) - 1, z: rect.z, dir: DIR_N };
}

/**
 * **Die Fensterfront zur Kantine** — die ganze gemeinsame Wand außer der
 * Schleuse.
 *
 * Sie ist kein Schmuck: Wer in der Zentrale steht, sieht damit den Raum, den
 * er gleich betritt, und im Dunkeln sieht er darin das, was sich darin bewegt.
 * Eine Scheibe hält auf wie eine Wand (`plan.window`) — hindurch geht es nur
 * durch die Schleuse.
 */
export function commandWindows(
  rect: Rect,
  door: { x: number; z: number },
  room?: HouseRoom,
): HouseWindow[] {
  const out: HouseWindow[] = [];
  for (let x = rect.x; x < rect.x + rect.w; x++) {
    if (x >= door.x && x < door.x + STATION_DOOR_SPAN) continue;
    // Nur, wo die Nordwand gerade läuft: nicht an einer schrägen Ecke.
    if (room && cutAt(room, x, rect.z) !== null) continue;
    if (x < APRON.x || x >= APRON.x + APRON.w) continue;
    out.push({ id: `wc${out.length}`, roomId: '', x, z: rect.z, dir: DIR_N });
  }
  return out;
}

/** Unter so vielen Kacheln bekommt ein Raum nur ein Hüllenfenster (`stationWindows`). */
const SMALL_ROOM_TILES = 45;

function stationWindows(
  rng: Rng,
  rooms: readonly HouseRoom[],
  spaces: readonly HouseRoom[],
  doors: readonly HouseDoor[],
  entryRoom: string,
): HouseWindow[] {
  const taken = new Set(
    doors.flatMap((door) => doorEdges(door).map((edge) => edgeKey(edge.x, edge.z, edge.dir))),
  );
  // **Und keine Scheibe, wo eine Lüftungsklappe hängt** (`vents/ventNet.data.ts`):
  // Seit die Türen zwei Kacheln breit sind, sitzen manche Klappen eine Kachel
  // weiter draußen — an einem Stück Wand, das auch Hülle sein kann.
  for (const flap of STATION_VENTS.flaps) taken.add(edgeKey(flap.x, flap.z, flap.dir));
  const windows: HouseWindow[] = [];
  const entry = rooms.find((room) => room.id === entryRoom);
  const front = entry
    ? commandWindows(entry.rect, commandDoorTile(entry.rect), entry).map((window) => ({
        ...window,
        roomId: entry.id,
      }))
    : [];
  for (const window of front) taken.add(edgeKey(window.x, window.z, window.dir));
  for (const room of rooms) {
    const candidates = plainTiles(room)
      .flatMap((tile) => ([DIR_N, DIR_E, DIR_S, DIR_W] as const).map((dir) => ({ ...tile, dir })))
      .filter((edge) => {
        const x = edge.x + (edge.dir === DIR_E ? 1 : edge.dir === DIR_W ? -1 : 0);
        const z = edge.z + (edge.dir === DIR_S ? 1 : edge.dir === DIR_N ? -1 : 0);
        return (
          !spaces.some((space) => inside(space.rect, x, z)) &&
          !onApron(x, z) &&
          !taken.has(edgeKey(edge.x, edge.z, edge.dir))
        );
      });
    // **Ein kleiner Raum hat eine Scheibe, ein großer zwei** — vor einem
    // Fenster bleibt Platz frei (`stationLayout.windowClearances`), und in
    // O2 oder Communications nach der Vorlage fehlte der sonst für die
    // Pflichtmodule.
    const count = roomTiles(room).length < SMALL_ROOM_TILES ? 1 : 2;
    for (const edge of rng.shuffle(candidates).slice(0, count))
      windows.push({ id: `w${windows.length}`, roomId: room.id, ...edge });
  }
  return [...windows, ...front];
}

/** Shared mission extent; historical house tests keep their original footprint. */
export function stationBounds(spec: HouseSpec): Rect {
  return spec.bounds ?? HOUSE;
}

/**
 * Missionsfläche **plus Einsatzzentrale** — das Rechteck, das jeder
 * Wegsucher abtasten darf.
 *
 * Es gibt es, seit die Zentrale nicht mehr südlich unter der Karte klebt: Wer
 * die Grenze weiter aus „Bauplan für x, Vorplatz für z" zusammensetzt, sperrt
 * beim ersten verschobenen Deck die halbe Station aus.
 */
export function missionExtent(spec: HouseSpec): Rect {
  const bounds = stationBounds(spec);
  const minX = Math.min(bounds.x, APRON.x);
  const minZ = Math.min(bounds.z, APRON.z);
  const maxX = Math.max(bounds.x + bounds.w, APRON.x + APRON.w);
  const maxZ = Math.max(bounds.z + bounds.d, APRON.z + APRON.d);
  return { x: minX, z: minZ, w: maxX - minX, d: maxZ - minZ };
}

/** Mission rooms plus transit modules. Archive selection deliberately uses rooms only. */
export function spacesOf(spec: HouseSpec): readonly HouseRoom[] {
  return spec.passages ? [...spec.rooms, ...spec.passages] : spec.rooms;
}

function inside(rect: Rect, x: number, z: number): boolean {
  return x >= rect.x && x < rect.x + rect.w && z >= rect.z && z < rect.z + rect.d;
}

// --- Grundriss --------------------------------------------------------------

/** Kein Zimmer schmaler als fünf Meter — sonst ist es ein Gang mit Bett. */
const MIN_SIDE = 5;
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
  for (const door of doors)
    for (const edge of doorEdges(door)) {
      const [dx, dz] = step[edge.dir];
      out.add(`${edge.x}:${edge.z}`);
      out.add(`${edge.x + dx}:${edge.z + dz}`);
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

    const all = rng.shuffle(plainTiles(room));
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
/**
 * **Die gemeinsamen Kanten eines Raums mit einem Rechteck** — wie `shared`,
 * nur für einen geformten Raum Kachel für Kachel: Eine Nische hat Kanten
 * mitten im umschließenden Rechteck.
 */
function sharedWith(room: HouseRoom, b: Rect): Array<{ x: number; z: number; dir: Dir }> {
  if (!room.shape) return shared(room.rect, b);
  const out: Array<{ x: number; z: number; dir: Dir }> = [];
  for (const dir of [DIR_E, DIR_W, DIR_S, DIR_N] as const)
    for (const tile of roomTiles(room)) {
      const nx = tile.x + (dir === DIR_E ? 1 : dir === DIR_W ? -1 : 0),
        nz = tile.z + (dir === DIR_S ? 1 : dir === DIR_N ? -1 : 0);
      if (!inside(b, nx, nz) || room.shape.has(`${nx},${nz}`)) continue;
      out.push({ x: tile.x, z: tile.z, dir });
    }
  // Längs der Wand geordnet, damit `spots[k + 1]` die Nachbarkante ist.
  const order = [DIR_E, DIR_W, DIR_S, DIR_N] as Dir[];
  return out.sort((p, q) =>
    p.dir !== q.dir
      ? order.indexOf(p.dir) - order.indexOf(q.dir)
      : p.dir === DIR_E || p.dir === DIR_W
        ? p.z - q.z
        : p.x - q.x,
  );
}

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
 * der Einsatzzentrale, der Himmel. Das ist mehr als Kulisse, es ist eine **Sprache mehr
 * für den, der im Haus steht** — er kann sagen „ich sehe die Einsatzzentrale", und der
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
  const taken = new Set(
    doors.flatMap((door) => doorEdges(door).map((edge) => edgeKey(edge.x, edge.z, edge.dir))),
  );
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
function placeFuse(
  rng: Rng,
  rooms: readonly HouseRoom[],
  entryRoom: string,
  candidates = rooms,
): HouseSpec['fuse'] {
  const entry = rooms.find((room) => room.id === entryRoom)!;
  const far = [...candidates]
    .filter((room) => room.id !== entryRoom)
    .sort((a, b) => distance(entry.rect, b.rect) - distance(entry.rect, a.rect));
  const room = far[0] ?? entry;
  const tile = rng.pick(plainTiles(room));
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
    const tile = rng.pick(plainTiles(room));
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
    spacesOf(spec).find(
      (room) =>
        x >= room.rect.x &&
        x < room.rect.x + room.rect.w &&
        z >= room.rect.z &&
        z < room.rect.z + room.rect.d &&
        cutAt(room, x, z) !== 'out',
    ) ?? null
  );
}

export function roomOf(spec: HouseSpec, id: string): HouseRoom | null {
  return spacesOf(spec).find((room) => room.id === id) ?? null;
}

/** Human room numbering matches the archive; internal zero-based IDs stay stable. */
export function roomCode(id: string): string {
  const match = /^r(\d+)$/.exec(id);
  return match ? `R${String(Number(match[1]) + 1).padStart(2, '0')}` : id.toUpperCase();
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
