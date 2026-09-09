import { PLAN_WALL_T } from '../../editor/levelPlan';
import { TILE, dirX, dirZ, type Dir } from '../../nav/navTile';
import { spacesOf, type HouseRoom, type HouseSpec } from '../house';
import { roomsOf } from '../map/extract';
import { COMMAND } from '../roomGraph';

/**
 * **Wegweiser aus dem Grundriss** — reine Rechnung, ohne three.js.
 *
 * Über jeder Öffnung zwischen zwei Räumen hängt auf **beiden** Seiten ein
 * Schild, und darauf steht, was dahinter liegt. Eine Öffnung ist eine Tür
 * (`spec.doors`) oder eine Kreuzung: Wo zwei Gänge aneinanderstoßen, ist die
 * ganze gemeinsame Wand offen — der Generator legt dort eine Tür je Kachel —,
 * und über diesem Stück hängt **ein** Schild, nicht eines je Kachel.
 *
 * Führt die Öffnung in einen Gang, steht darunter, wohin der Gang führt: die
 * Räume, die an ihm liegen, ohne den, in dem man gerade steht. Führt sie in
 * einen Raum, reicht sein Name.
 *
 * Die Namen kommen aus `map/extract.roomsOf` — genau den Namen, die die
 * 2D-Karte malt, einschließlich „Einsatzzentrale" für den Vorplatz. Was
 * hier auf dem Schild steht, findet man auf dem Handy wieder.
 */
export interface Signpost {
  /** Der Raum oder Gang, in dem das Schild hängt; `COMMAND` für die Zentrale. */
  spaceId: string;
  /** Der Raum oder Gang, in den die Öffnung führt. */
  targetId: string;
  /** Die Tür-ID, bei Kreuzungen die IDs beider Gänge (`p1|p2`). */
  openingId: string;
  /** Mitte des Schilds in Metern, schon von der Wand abgerückt. */
  x: number;
  z: number;
  /** Die Wandrichtung, an der es hängt — vom eigenen Raum aus gesehen. */
  dir: Dir;
  /** Gierwinkel, mit dem eine `PlaneGeometry` in den Raum hineinschaut. */
  yaw: number;
  /** Breite in Metern. */
  width: number;
  /** Die große Zeile: der Name dahinter. */
  title: string;
  /** Die kleine Zeile: wohin der Gang führt — leer bei Räumen. */
  detail: string;
  /** Ob das Ziel ein Gang ist (dann trägt das Schild die Gangfarbe). */
  circulation: boolean;
  /** Die Zimmersorte des Ziels, für die Akzentfarbe. */
  kind?: HouseRoom['kind'];
}

/** So weit vor der Wandmitte hängt ein Schild — vor Leiste und Rohr, wie die Raumschilder. */
export const SIGN_CLEARANCE = PLAN_WALL_T / 2 + 0.24;
/** Breite über einer einzelnen Tür. */
export const DOOR_SIGN_WIDTH = 1.7;
/** Breite über einer Kreuzung — mehr wird zwischen den Pfosten nicht frei. */
export const JUNCTION_SIGN_WIDTH = 2.4;
/** Höchstens so viele Ziele stehen auf der kleinen Zeile. */
export const DETAIL_LIMIT = 4;

/** Gierwinkel je Wandrichtung — derselbe wie in `shipArt.buildRoomHull`. */
const YAW: readonly number[] = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

interface Edge {
  x: number;
  z: number;
  dir: Dir;
}

interface Opening {
  id: string;
  a: string;
  b: string;
  /** Die Kanten, von `a` aus gesehen. */
  edges: Edge[];
  junction: boolean;
}

function edgeCentre(edge: Edge): { x: number; z: number } {
  return {
    x: (edge.x + 0.5 + dirX(edge.dir) * 0.5) * TILE,
    z: (edge.z + 0.5 + dirZ(edge.dir) * 0.5) * TILE,
  };
}

function flip(edge: Edge): Edge {
  return {
    x: edge.x + dirX(edge.dir),
    z: edge.z + dirZ(edge.dir),
    dir: ((edge.dir + 2) % 4) as Dir,
  };
}

/** Türen und Kreuzungsstücke — Türen zwischen zwei Gängen fallen zu einem Stück zusammen. */
export function openingsOf(spec: HouseSpec): Opening[] {
  const spaces = new Map(spacesOf(spec).map((space) => [space.id, space]));
  const out: Opening[] = [];
  const junctions = new Map<string, Opening>();
  for (const door of spec.doors) {
    const a = door.a;
    const b = door.b ?? COMMAND;
    const edge: Edge = { x: door.x, z: door.z, dir: door.dir };
    const bothHalls = !!spaces.get(a)?.circulation && !!spaces.get(b)?.circulation;
    if (!bothHalls) {
      out.push({ id: door.id, a, b, edges: [edge], junction: false });
      continue;
    }
    const [first, second] = [a, b].sort();
    const key = `${first}|${second}`;
    let junction = junctions.get(key);
    if (!junction) {
      junction = { id: key, a: first!, b: second!, edges: [], junction: true };
      junctions.set(key, junction);
      out.push(junction);
    }
    junction.edges.push(a === first ? edge : flip(edge));
  }
  return out;
}

/** Alle Räume und Gänge mit einer Öffnung zu `id`, in der Reihenfolge der Türen. */
function neighboursOf(openings: readonly Opening[], id: string): string[] {
  const out: string[] = [];
  for (const opening of openings) {
    const other = opening.a === id ? opening.b : opening.b === id ? opening.a : null;
    if (other !== null && !out.includes(other)) out.push(other);
  }
  return out;
}

export function wayfindingSigns(spec: HouseSpec): Signpost[] {
  const names = new Map(roomsOf(spec, []).map((room) => [room.id, room.name]));
  const spaces = new Map(spacesOf(spec).map((space) => [space.id, space]));
  const openings = openingsOf(spec);
  const signs: Signpost[] = [];

  const detailFor = (target: string, from: string): string => {
    if (!spaces.get(target)?.circulation) return '';
    const onward = neighboursOf(openings, target).filter((id) => id !== from);
    // Räume zuerst — ein Gang, der zu einem Gang führt, ist nur die halbe Antwort.
    onward.sort((p, q) => {
      const hallP = spaces.get(p)?.circulation ? 1 : 0;
      const hallQ = spaces.get(q)?.circulation ? 1 : 0;
      return hallP - hallQ;
    });
    const shown = onward.slice(0, DETAIL_LIMIT).map((id) => names.get(id) ?? id);
    const rest = onward.length - shown.length;
    return shown.join(' · ') + (rest > 0 ? ` · +${rest}` : '');
  };

  for (const opening of openings) {
    const width = opening.junction
      ? Math.min(JUNCTION_SIGN_WIDTH, opening.edges.length * TILE - 0.7)
      : DOOR_SIGN_WIDTH;
    const sides: Array<{ here: string; there: string; edges: Edge[] }> = [
      { here: opening.a, there: opening.b, edges: opening.edges },
      { here: opening.b, there: opening.a, edges: opening.edges.map(flip) },
    ];
    for (const side of sides) {
      let x = 0,
        z = 0;
      for (const edge of side.edges) {
        const centre = edgeCentre(edge);
        x += centre.x;
        z += centre.z;
      }
      x /= side.edges.length;
      z /= side.edges.length;
      const dir = side.edges[0]!.dir;
      const target = spaces.get(side.there);
      signs.push({
        spaceId: side.here,
        targetId: side.there,
        openingId: opening.id,
        x: x - dirX(dir) * SIGN_CLEARANCE,
        z: z - dirZ(dir) * SIGN_CLEARANCE,
        dir,
        yaw: YAW[dir]!,
        width,
        title: (names.get(side.there) ?? side.there).toUpperCase(),
        detail: detailFor(side.there, side.here),
        circulation: !!target?.circulation,
        ...(target ? { kind: target.kind } : {}),
      });
    }
  }
  return signs;
}
