import { DIR_N, TILE, dirX, dirZ, type Dir } from '../nav/navTile';
import type { Apron, Vec2 } from './kartTrack';

/**
 * **Die Strecke als Bauteile** — Geraden und Kurven auf dem Kachelgitter.
 *
 * Vorher war die Bahn ein Dutzend Kontrollpunkte in Metern, durch die ein
 * Catmull-Rom-Spline gelegt wurde. Das ergab eine hübsche Linie und sonst
 * nichts: Wo sie lag, konnte man nur in der Brille nachsehen, sie lag nirgends
 * am Raster, und „mach die Gegengerade zwei Zellen länger" hieß, zwei
 * Kontrollpunkte zu verschieben und zu hoffen. Genau die Sorte Zahl, die dieses
 * Projekt sonst überall aus den Welten herausgezogen hat (`grid/gridPlan.ts`).
 *
 * Hier ist die Strecke deshalb eine **Liste von Teilen**, und ein Teil kennt
 * nur drei Dinge: seine Sorte, wie lang bzw. wie eng es ist, und wo es
 * aufhört. Aus einer Anfangskachel und einer Blickrichtung ergibt sich alles
 * Weitere von selbst — die Mittellinie, die Ausmaße, ob der Kurs sich
 * schließt. Das ist prüfbar, ohne dass eine Brille im Spiel ist, und es ist
 * dasselbe Format, das eine spätere **Bauwelt** bearbeiten kann: ein Teil
 * anhängen, eine Kurve enger machen, eine Gerade kürzen.
 *
 * **Gerechnet wird in Kacheln, gefahren wird in Metern.** Eine Kachel ist
 * 2,5 m (`nav/navTile.ts`), und alle Maße hier sind ganze Kacheln — deshalb
 * liegt jede Mittellinie auf einer Kachelkante und jede Kurve endet wieder
 * darauf. Das ist der ganze Grund, warum Boxengasse, Asphalt und Grundriss
 * ohne einen einzigen krummen Zwischenwert zusammenpassen.
 *
 * **Die Kurve ist ein Viertelkreis, und ihr Radius ist ihr Versatz.** Wer mit
 * Radius `r` abbiegt, kommt `r` Kacheln weiter vorn und `r` Kacheln weiter zur
 * Seite heraus — mehr Geometrie braucht es nicht, und aus dieser einen Zeile
 * folgt, ob ein Kurs sich schließt.
 */

/** Eine Zelle: vier Kacheln, zehn Meter — die Länge einer Geraden. */
export const CELL = 4;
/** Wie breit die Fahrbahn ist, in Kacheln. */
export const LANE = 4;
/** Der Radius einer Kurve, wenn keiner dabeisteht, in Kacheln. */
export const TURN = 6;

/**
 * Halbe Fahrbahnbreite in Metern — und zwar **genau** die halbe Korridorbreite.
 *
 * Sie könnte auch schmaler sein, und eine Weile war sie das. Dann liegt aber
 * zwischen dem Asphalt und dem Rand des Korridors ein Streifen, der auf dem
 * Raster zur Strecke gehört und beim Fahren nicht — und die Boxengasse, die
 * kachelbündig danebenliegt, hat plötzlich eine unsichtbare Lücke zur Strecke,
 * durch die man nicht hindurchkommt. Fahrbahn = Korridor, und die Frage stellt
 * sich nicht mehr.
 */
export const TRACK_HALF = (LANE / 2) * TILE;

/** Wie fein die Mittellinie abgetastet wird, in Metern. */
const STEP = TILE / 2;

/** Ein Streckenteil. Eine Gerade ist Zellen lang, eine Kurve Kacheln eng. */
export type Piece =
  { kind: 'straight'; cells?: number } | { kind: 'left' | 'right'; radius?: number };

/** Wo das nächste Teil ansetzt: eine Kachelkante und eine Richtung. */
export interface Cursor {
  x: number;
  z: number;
  dir: Dir;
}

/** Ein Kachelrechteck, wie `NavRect` es auch versteht. */
export interface TileRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Die fertig ausgelegte Strecke. */
export interface Course {
  readonly pieces: readonly Piece[];
  readonly start: Cursor;
  /** Die Mittellinie in Metern — geschlossen, ohne den Anfang zu wiederholen. */
  readonly centre: Vec2[];
  /** Halbe Fahrbahnbreite in Metern. */
  readonly halfWidth: number;
  /** Das Kachelrechteck, in dem die ganze Fahrbahn liegt. */
  readonly bounds: TileRect;
  /** Ob das letzte Teil wieder am Anfang ankommt — Richtung eingeschlossen. */
  readonly closed: boolean;
}

/** Die Richtung nach einer Kurve. */
export function turnedDir(dir: Dir, kind: 'left' | 'right'): Dir {
  return ((dir + (kind === 'right' ? 1 : 3)) % 4) as Dir;
}

/** Wie viele Kacheln ein Teil lang ist — eine Kurve zählt ihren Radius. */
function reach(piece: Piece): number {
  return piece.kind === 'straight' ? (piece.cells ?? 1) * CELL : (piece.radius ?? TURN);
}

/**
 * Wo ein Teil aufhört.
 *
 * Die Gerade läuft geradeaus weiter, die Kurve kommt `r` Kacheln weiter vorn
 * **und** `r` Kacheln weiter in der neuen Richtung heraus. Beides in einer
 * Zeile, und genau daran rechnet ein Test nach, ob ein Kurs sich schließt.
 */
export function pieceEnd(piece: Piece, at: Cursor): Cursor {
  const span = reach(piece);
  if (piece.kind === 'straight') {
    return { x: at.x + dirX(at.dir) * span, z: at.z + dirZ(at.dir) * span, dir: at.dir };
  }
  const next = turnedDir(at.dir, piece.kind);
  return {
    x: at.x + (dirX(at.dir) + dirX(next)) * span,
    z: at.z + (dirZ(at.dir) + dirZ(next)) * span,
    dir: next,
  };
}

/** Wo die Strecke nach allen Teilen ankommt. */
export function courseEnd(pieces: readonly Piece[], start: Cursor): Cursor {
  let at = start;
  for (const piece of pieces) at = pieceEnd(piece, at);
  return at;
}

/**
 * Die Punkte **eines** Teils in Metern — ohne seinen Anfangspunkt, mit seinem
 * Endpunkt.
 *
 * Ohne den Anfang, weil den das Teil davor schon gesetzt hat; mit dem Ende,
 * weil das der Anfang des nächsten ist. So lässt sich eine Strecke aneinander
 * hängen, ohne dass an jeder Naht ein Punkt doppelt liegt.
 */
export function piecePoints(piece: Piece, at: Cursor): Vec2[] {
  const end = pieceEnd(piece, at);
  const out: Vec2[] = [];
  if (piece.kind === 'straight') {
    const length = reach(piece) * TILE;
    const steps = Math.max(1, Math.round(length / STEP));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      out.push({
        x: at.x * TILE + dirX(at.dir) * length * t,
        z: at.z * TILE + dirZ(at.dir) * length * t,
      });
    }
    return out;
  }

  // Der Mittelpunkt liegt quer zur Fahrtrichtung, auf der Seite, in die
  // abgebogen wird — und `pieceEnd` hat den Ausgang schon ausgerechnet.
  const side = turnedDir(at.dir, piece.kind);
  const radius = reach(piece) * TILE;
  const cx = at.x * TILE + dirX(side) * radius;
  const cz = at.z * TILE + dirZ(side) * radius;
  const fromX = at.x * TILE - cx;
  const fromZ = at.z * TILE - cz;
  // Nach rechts dreht der Bogen mathematisch positiv, nach links negativ —
  // das eine Vorzeichen, ohne das jede zweite Kurve nach außen führt.
  const sweep = (piece.kind === 'right' ? 1 : -1) * (Math.PI / 2);
  const steps = Math.max(2, Math.round((Math.abs(sweep) * radius) / STEP));
  for (let i = 1; i <= steps; i++) {
    const angle = sweep * (i / steps);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    out.push({ x: cx + fromX * cos - fromZ * sin, z: cz + fromX * sin + fromZ * cos });
  }
  // Der letzte Punkt ist rechnerisch der Ausgang; ihn zu setzen statt zu
  // runden hält die Naht zum nächsten Teil exakt auf der Kachelkante.
  out[out.length - 1] = { x: end.x * TILE, z: end.z * TILE };
  return out;
}

/** Die ganze Mittellinie in Metern, vom Anfang bis hinter das letzte Teil. */
export function coursePoints(pieces: readonly Piece[], start: Cursor): Vec2[] {
  const out: Vec2[] = [{ x: start.x * TILE, z: start.z * TILE }];
  let at = start;
  for (const piece of pieces) {
    out.push(...piecePoints(piece, at));
    at = pieceEnd(piece, at);
  }
  return out;
}

/** Legt eine Strecke aus: Mittellinie, Ausmaße und ob sie sich schließt. */
export function layoutCourse(pieces: readonly Piece[], start: Cursor): Course {
  const points = coursePoints(pieces, start);
  const end = courseEnd(pieces, start);
  const closed = end.x === start.x && end.z === start.z && end.dir === start.dir;
  // Ein geschlossener Kurs endet dort, wo er anfängt — und die Mittellinie
  // wird als geschlossener Ring gerechnet (`kartTrack.ts`), also darf der
  // Anfang nicht zweimal darin stehen.
  const centre = closed ? points.slice(0, -1) : points;
  return {
    pieces,
    start,
    centre,
    halfWidth: TRACK_HALF,
    bounds: tilesAround(centre, TRACK_HALF),
    closed,
  };
}

/** Das Kachelrechteck, in dem eine Linie samt ihrer halben Breite liegt. */
export function tilesAround(points: readonly Vec2[], halfWidth: number): TileRect {
  let minX = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x - halfWidth);
    minZ = Math.min(minZ, point.z - halfWidth);
    maxX = Math.max(maxX, point.x + halfWidth);
    maxZ = Math.max(maxZ, point.z + halfWidth);
  }
  if (!Number.isFinite(minX)) return { x: 0, z: 0, w: 0, d: 0 };
  const x = Math.floor(minX / TILE);
  const z = Math.floor(minZ / TILE);
  return {
    x,
    z,
    w: Math.max(1, Math.ceil(maxX / TILE) - x),
    d: Math.max(1, Math.ceil(maxZ / TILE) - z),
  };
}

/** Ein Kachelrechteck als Fläche in Metern. */
export function rectApron(rect: TileRect): Apron {
  return {
    x0: rect.x * TILE,
    z0: rect.z * TILE,
    x1: (rect.x + rect.w) * TILE,
    z1: (rect.z + rect.d) * TILE,
  };
}

/** Das kleinste Kachelrechteck, das beide umschließt. */
export function unionRect(a: TileRect, b: TileRect): TileRect {
  const x = Math.min(a.x, b.x);
  const z = Math.min(a.z, b.z);
  return {
    x,
    z,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    d: Math.max(a.z + a.d, b.z + b.d) - z,
  };
}

/** Dasselbe Rechteck, ringsum um `tiles` Kacheln größer. */
export function grownRect(rect: TileRect, tiles: number): TileRect {
  return {
    x: rect.x - tiles,
    z: rect.z - tiles,
    w: rect.w + tiles * 2,
    d: rect.d + tiles * 2,
  };
}

// --- die Strecke, die in der Welt steht -----------------------------------

/** Wo die Start-und-Ziel-Gerade anfängt: Kachel 0/0, es geht nach Norden. */
export const KART_START: Cursor = { x: 0, z: 0, dir: DIR_N };

/**
 * **Die Bahn**: vier Kurven, vier Geraden — und keine zwei Kurven gleich.
 *
 * Ein Oval wäre in vier Zeilen zu haben und in zwei Runden auswendig gelernt.
 * Die Radien sind deshalb verschieden (6, 6, 4 und 8 Kacheln, also 15, 15, 10
 * und 20 m): eine, die man voll fährt, zwei mittlere und eine enge, in der ein
 * Kart mit wenig Traktion quersteht. Dass die Runde sich am Ende trotzdem
 * wieder schließt, ist keine Kunst, sondern eine Rechnung — und ein Test.
 */
export const KART_PIECES: readonly Piece[] = [
  // Start und Ziel, mit der Boxengasse daneben.
  { kind: 'straight', cells: 3 },
  { kind: 'right' },
  { kind: 'straight', cells: 2 },
  { kind: 'right' },
  // Die Gegengerade, die längste der Runde.
  { kind: 'straight', cells: 4 },
  // Die enge Kehre am Ende davon.
  { kind: 'right', radius: 4 },
  { kind: 'straight', cells: 2 },
  // Und die weite Schlusskurve auf die Zielgerade.
  { kind: 'right', radius: 8 },
];

/** Die ausgelegte Bahn — einmal gerechnet, von allen benutzt. */
export const KART_COURSE: Course = layoutCourse(KART_PIECES, KART_START);

// --- die Boxengasse --------------------------------------------------------

/**
 * **Die Boxengasse liegt kachelbündig an der Zielgeraden.**
 *
 * Ihre Ostkante ist die Westkante des Streckenkorridors — genau deshalb kommt
 * man aus der Gasse auf die Strecke, ohne dass irgendwo eine Sonderregel steht:
 * Wer in einer der beiden Flächen ist, wird nicht zurückgeschoben, und die
 * beiden Flächen berühren sich. Ausfahrt ist überall, wo man das Lenkrad nach
 * rechts dreht; nach vorn hört die Gasse auf, und dort steht eine Mauer.
 */
export const PIT_LANE: TileRect = { x: -5, z: -11, w: 3, d: 12 };

/** Die Boxen dahinter: zwei Kacheln tief, mit einer Säule zwischen je zweien. */
export const PIT_BOXES: TileRect = { x: -7, z: -8, w: 2, d: 7 };

/** Die Kachelreihen, in denen wirklich ein Kart steht — dazwischen die Säulen. */
export const PIT_BAYS: readonly number[] = [-8, -6, -4, -2];

/** Die Gasse als Fläche in Metern — daran hält sich ein Kart, das darin steht. */
export const PIT_APRON: Apron = rectApron(PIT_LANE);

/** Wo ein Kart in der Box steht: Kachelmitte der Bucht, Nase nach Norden. */
export function pitSpots(): { x: number; z: number; yaw: number }[] {
  // Eine Kachel von der Ostkante weg: vorn bleibt die Gasse frei, damit man
  // an einem stehenden Kart vorbeikommt.
  const x = (PIT_LANE.x + 0.5) * TILE;
  return PIT_BAYS.map((tile) => ({ x, z: (tile + 0.5) * TILE, yaw: 0 }));
}

/** Das ganze Gelände: Strecke, Boxengasse und ein Streifen Wiese ringsum. */
export const KART_FIELD: TileRect = grownRect(
  unionRect(KART_COURSE.bounds, unionRect(PIT_LANE, PIT_BOXES)),
  3,
);
