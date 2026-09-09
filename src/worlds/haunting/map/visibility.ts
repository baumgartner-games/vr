import { lineOfSight as sightOver, rayHit, doorLeaf } from './geometry';
import {
  pointInPolygon,
  type MapEntity,
  type MapLight,
  type MapPoint,
  type MapSnapshot,
} from './mapSnapshot';

/**
 * **Das Sichtbarkeitsmodell** — was auf der Karte zu sehen ist und was nicht.
 *
 * Es rechnet auf dem `MapSnapshot` und nirgends sonst: keine Kamera, keine
 * Collider, kein Rapier. Deshalb ist es headless testbar, und deshalb sehen
 * die 2D-Welt und die Rollenansichten **dasselbe** Modell — ein Späher, der
 * ein Monster sieht, das der Spieler in der 2D-Welt nicht sieht, ist ein
 * Fehler in einer Datei und nicht in zwei.
 *
 * Zwei Modi, genau zwei (`VisibilityMode`):
 *
 * - `omniscient` („Alles sehen"): Geräuschradien, Sichtkegel, volle
 *   Helligkeit; dunkle Bereiche nur leicht grau statt schwarz.
 * - `realistic` („Realitätsnah"): nur Kartenlicht und Taschenlampe; ohne
 *   jedes Licht bleibt der Radius der Eigenwahrnehmung (`SELF_RADIUS`).
 *
 * **Licht ist eine Fläche, die man ausrechnen kann.** Jede Lichtquelle wirft
 * Strahlen bis an die nächste Wand (`litPolygon`); was zwischen den Strahlen
 * liegt, ist das Polygon, das die Karte hell malt. Fenster lassen Licht
 * durch, Wände und geschlossene Türblätter nicht. Das ist grob — ein Strahl
 * je fünf Grad —, aber es ist dieselbe Grobheit für alle, und sie ist billig
 * genug für dreißig Bilder je Sekunde auf einem Telefon.
 */
export type VisibilityMode = 'omniscient' | 'realistic';

/** Was man im Dunkeln ohne jedes Licht noch von sich selbst weiß, in Metern. */
export const SELF_RADIUS = 1.5;

/** Wie weit man beim Rennen zu hören ist, in Metern — für die Zeichnung. */
export const NOISE_SPRINT = 12;
/** Und beim Gehen. */
export const NOISE_WALK = 5;

/** Strahlen je voller Kreis. */
const RAYS = 72;

/** Ein Sichtkegel: wer schaut, wohin, wie breit, wie weit. */
export interface VisionCone {
  /** Wessen Kegel — die Kennung des `MapEntity`. */
  entityId: string;
  at: MapPoint;
  yaw: number;
  /** Öffnungswinkel in Bogenmaß, ganz (nicht halb). */
  fov: number;
  range: number;
  /** Der Kegel gegen Wände beschnitten — das, was gezeichnet wird. */
  polygon: MapPoint[];
}

/** Ein Geräuschradius: wer gerade wie weit zu hören ist. */
export interface NoiseRadius {
  entityId: string;
  at: MapPoint;
  radius: number;
  /** Was ihn erzeugt — Rennen, Gehen, eine geöffnete Fracht, das Gehör des Monsters. */
  cause: 'sprint' | 'walk' | 'interact' | 'monster';
}

/** Ein beleuchteter Bereich: Kreis oder Kegel um eine Lichtquelle. */
export interface LitRegion {
  lightId: string;
  at: MapPoint;
  radius: number;
  /** Nur bei Kegeln (Taschenlampe, Drohne). */
  yaw?: number;
  fov?: number;
  /** Die sichtbare Fläche als Polygon, gegen Wände beschnitten. */
  polygon: MapPoint[];
  color?: string;
}

/** Was in das Modell hineingeht. */
export interface VisibilityInput {
  snapshot: MapSnapshot;
  mode: VisibilityMode;
  /**
   * Aus wessen Sicht — die Kennung eines `MapEntity`. `null` heißt: keine
   * Person, nur die Lichter (Schalttafel, Zuschauer).
   */
  viewerId: string | null;
}

/** Was herauskommt: fertige Flächen, die eine Ansicht nur noch malt. */
export interface VisibilityField {
  mode: VisibilityMode;
  /** Alles, was hell ist — je Lichtquelle eine Fläche. */
  lit: LitRegion[];
  /** Die Eigenwahrnehmung des Betrachters, wenn er eine Person ist. */
  self: LitRegion | null;
  /** Sichtkegel, die gezeichnet werden (im Modus `realistic` nur der eigene). */
  cones: VisionCone[];
  /** Geräuschradien (im Modus `realistic` keine). */
  noise: NoiseRadius[];
  /**
   * Welche Wesen der Betrachter gerade wahrnimmt — nur die stehen als Marker
   * auf der Karte. Im Modus `omniscient` alle.
   */
  visibleEntities: string[];
  /** Welche Räume ganz oder teilweise beleuchtet sind. */
  litRooms: string[];
}

/**
 * Ob ein Punkt von `from` aus zu sehen ist: kein Wandstück des Snapshots
 * dazwischen. Fenster und Glas lassen Sicht durch, Wände nicht, geschlossene
 * Türblätter auch nicht.
 */
export type LineOfSight = (snapshot: MapSnapshot, from: MapPoint, to: MapPoint) => boolean;
export const lineOfSight: LineOfSight = sightOver;

/** Ob ein Punkt in einem Kegel liegt — Winkel und Reichweite, ohne Wände. */
export function inCone(cone: Omit<VisionCone, 'polygon'>, at: MapPoint): boolean {
  const dx = at.x - cone.at.x,
    dz = at.z - cone.at.z;
  const distance = Math.hypot(dx, dz);
  if (distance > cone.range) return false;
  if (distance < 1e-6) return true;
  // Blickrichtung wie in `mapSnapshot.headingOf`: yaw 0 schaut nach -z.
  const hx = -Math.sin(cone.yaw),
    hz = -Math.cos(cone.yaw);
  const cos = (dx * hx + dz * hz) / distance;
  return cos >= Math.cos(cone.fov / 2) - 1e-9;
}

/**
 * Die Fläche, die eine Lichtquelle (oder ein Auge) von `at` aus erreicht:
 * ein Kreis oder ein Kegel, an Wänden und geschlossenen Türen abgeschnitten.
 */
export function litPolygon(
  snapshot: MapSnapshot,
  at: MapPoint,
  radius: number,
  yaw?: number,
  fov?: number,
): MapPoint[] {
  return castPolygon(blockersOf(snapshot), at, radius, yaw, fov);
}

/** Ein Wandstück mit seinem Kasten, damit ferne Wände gar nicht erst geprüft werden. */
interface Blocker {
  a: MapPoint;
  b: MapPoint;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

function blocker(a: MapPoint, b: MapPoint): Blocker {
  return {
    a,
    b,
    minX: Math.min(a.x, b.x),
    minZ: Math.min(a.z, b.z),
    maxX: Math.max(a.x, b.x),
    maxZ: Math.max(a.z, b.z),
  };
}

/** Alles, was Licht aufhält: Wände und geschlossene Türblätter. */
function blockersOf(snapshot: MapSnapshot): Blocker[] {
  const out: Blocker[] = [];
  for (const wall of snapshot.walls) if (wall.kind === 'wall') out.push(blocker(wall.a, wall.b));
  for (const door of snapshot.doors)
    if (!door.open) {
      const [a, b] = doorLeaf(door.at, door.axis, door.width);
      out.push(blocker(a, b));
    }
  return out;
}

function castPolygon(
  all: readonly Blocker[],
  at: MapPoint,
  radius: number,
  yaw?: number,
  fov?: number,
): MapPoint[] {
  const blockers = all.filter(
    (b) =>
      b.maxX >= at.x - radius &&
      b.minX <= at.x + radius &&
      b.maxZ >= at.z - radius &&
      b.minZ <= at.z + radius,
  );
  const cone = yaw !== undefined && fov !== undefined && fov < Math.PI * 2;
  const points: MapPoint[] = [];
  if (cone) points.push({ x: at.x, z: at.z });
  const count = cone ? Math.max(8, Math.round((RAYS * fov!) / (Math.PI * 2))) : RAYS;
  // Bogenmaß vom Blick aus; ein voller Kreis fängt bei 0 an.
  const centre = cone ? yaw! : 0;
  const span = cone ? fov! : Math.PI * 2;
  for (let i = 0; i <= count; i++) {
    if (!cone && i === count) break;
    const angle = centre - span / 2 + (span * i) / count;
    // Winkel ist ein yaw: 0 → -z, positiv → -x.
    const to = { x: at.x - Math.sin(angle) * radius, z: at.z - Math.cos(angle) * radius };
    let nearest = 1;
    for (const b of blockers) {
      const t = rayHit(at, to, b.a, b.b);
      if (t < nearest) nearest = t;
    }
    points.push({ x: at.x + (to.x - at.x) * nearest, z: at.z + (to.z - at.z) * nearest });
  }
  return points;
}

/**
 * **Was sich nicht bewegt, wird nicht neu gerechnet.** Die Flächen der
 * Deckenlampen hängen nur an den Türen; solange keine auf- oder zugeht,
 * bleibt das Polygon dasselbe. Der Cache gehört dem Aufrufer (die 2D-Welt
 * hält einen je Runde), damit zwei Ansichten sich nicht in die Quere kommen.
 */
export class LitCache {
  private readonly regions = new Map<string, { key: string; region: LitRegion }>();

  /**
   * `doorsKey` ist der Stand der Türen, die diese Lampe erreichen kann —
   * je Lampe, nicht für alle: Eine Tür am anderen Ende der Station ändert
   * die Fläche einer Deckenlampe nicht (Paket Rundenregeln, Messung).
   */
  take(doorsKey: string, light: MapLight): LitRegion | null {
    const known = this.regions.get(light.id);
    if (!known || known.key !== doorsKey) return null;
    const region = known.region;
    return region.at.x === light.at.x && region.at.z === light.at.z ? region : null;
  }

  keep(region: LitRegion, doorsKey = ''): void {
    this.regions.set(region.lightId, { key: doorsKey, region });
  }
}

/** Ob ein Punkt in irgendeiner hellen Fläche liegt. */
export function litAt(field: Pick<VisibilityField, 'lit' | 'self'>, at: MapPoint): boolean {
  for (const region of field.lit) {
    // Erst der Radius, dann das Polygon: Die meisten Lampen sind zu weit weg,
    // als dass sich der Punkt-in-Polygon-Test lohnte (Paket Rundenregeln).
    if (Math.hypot(at.x - region.at.x, at.z - region.at.z) > region.radius) continue;
    if (pointInPolygon(at, region.polygon)) return true;
  }
  return !!field.self && pointInPolygon(at, field.self.polygon);
}

export type ComputeVisibility = (input: VisibilityInput, cache?: LitCache) => VisibilityField;

export function emptyField(mode: VisibilityMode): VisibilityField {
  return { mode, lit: [], self: null, cones: [], noise: [], visibleEntities: [], litRooms: [] };
}

/** Das Modell selbst. */
export const computeVisibility: ComputeVisibility = ({ snapshot, mode, viewerId }, cache) => {
  const field = emptyField(mode);
  const viewer = viewerId ? (snapshot.entities.find((e) => e.id === viewerId) ?? null) : null;
  const blockers = blockersOf(snapshot);
  // Der Türstand in Reichweite einer Lampe — nur der entscheidet über ihre Fläche.
  const doorsKeyFor = (light: MapLight): string => {
    let key = '';
    for (const door of snapshot.doors) {
      const reach = light.radius + door.width;
      if (Math.abs(door.at.x - light.at.x) > reach || Math.abs(door.at.z - light.at.z) > reach)
        continue;
      key += door.open ? 'o' : 'c';
    }
    return key;
  };

  for (const light of snapshot.lights) {
    if (!light.on) continue;
    if (light.kind === 'lamp' && !snapshot.power) continue;
    const still = light.kind === 'lamp' || light.kind === 'command' || light.kind === 'beacon';
    const doorsKey = still && cache ? doorsKeyFor(light) : '';
    const known = still && cache ? cache.take(doorsKey, light) : null;
    if (known) {
      field.lit.push(known);
      continue;
    }
    const region: LitRegion = {
      lightId: light.id,
      at: light.at,
      radius: light.radius,
      yaw: light.yaw,
      fov: light.fov,
      color: light.color,
      polygon: castPolygon(blockers, light.at, light.radius, light.yaw, light.fov),
    };
    if (still && cache) cache.keep(region, doorsKey);
    field.lit.push(region);
  }
  if (viewer && !viewer.concealed) {
    field.self = {
      lightId: `self:${viewer.id}`,
      at: viewer.at,
      radius: SELF_RADIUS,
      polygon: castPolygon(blockers, viewer.at, SELF_RADIUS),
    };
  }

  const litRooms = new Set<string>();
  for (const room of snapshot.rooms) {
    if (room.safe || room.lit) litRooms.add(room.id);
    for (const region of field.lit)
      if (pointInPolygon(region.at, room.polygon)) litRooms.add(room.id);
  }
  field.litRooms = [...litRooms];

  const conesFor = (entity: MapEntity): void => {
    if (!entity.sense || entity.concealed) return;
    field.cones.push({
      entityId: entity.id,
      at: entity.at,
      yaw: entity.yaw,
      fov: entity.sense.fov,
      range: entity.sense.range,
      polygon: castPolygon(blockers, entity.at, entity.sense.range, entity.yaw, entity.sense.fov),
    });
  };

  if (mode === 'omniscient') {
    for (const entity of snapshot.entities) {
      conesFor(entity);
      if (entity.concealed) continue;
      if (entity.kind === 'monster' && entity.sense)
        field.noise.push({
          entityId: entity.id,
          at: entity.at,
          radius: entity.sense.hearing,
          cause: 'monster',
        });
      else if (entity.moving && entity.kind !== 'drone')
        field.noise.push({
          entityId: entity.id,
          at: entity.at,
          radius: entity.sprinting ? NOISE_SPRINT : NOISE_WALK,
          cause: entity.sprinting ? 'sprint' : 'walk',
        });
    }
    field.visibleEntities = snapshot.entities.map((entity) => entity.id);
    return field;
  }

  // Realitätsnah: nur der eigene Kegel, und nur, was im Licht steht und
  // nicht hinter einer Wand.
  if (viewer) conesFor(viewer);
  for (const entity of snapshot.entities) {
    if (viewer && entity.id === viewer.id) {
      field.visibleEntities.push(entity.id);
      continue;
    }
    if (entity.concealed) continue;
    if (!viewer) {
      // Keine Person, nur Licht: sichtbar ist, was im Hellen steht.
      if (litAt(field, entity.at)) field.visibleEntities.push(entity.id);
      continue;
    }
    if (viewer.concealed) continue;
    const gap = Math.hypot(entity.at.x - viewer.at.x, entity.at.z - viewer.at.z);
    const inSelf = gap <= SELF_RADIUS;
    const inLight = litAt(field, entity.at);
    const inOwnCone = viewer.sense
      ? inCone(
          {
            entityId: viewer.id,
            at: viewer.at,
            yaw: viewer.yaw,
            fov: viewer.sense.fov,
            range: viewer.sense.range,
          },
          entity.at,
        )
      : true;
    if ((inSelf || (inLight && inOwnCone)) && lineOfSight(snapshot, viewer.at, entity.at))
      field.visibleEntities.push(entity.id);
  }
  return field;
};
