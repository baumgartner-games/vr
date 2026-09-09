import type { MapPoint, MapSnapshot } from './mapSnapshot';

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
 */
export type VisibilityMode = 'omniscient' | 'realistic';

/** Was man im Dunkeln ohne jedes Licht noch von sich selbst weiß, in Metern. */
export const SELF_RADIUS = 1.5;

/** Ein Sichtkegel: wer schaut, wohin, wie breit, wie weit. */
export interface VisionCone {
  /** Wessen Kegel — die Kennung des `MapEntity`. */
  entityId: string;
  at: MapPoint;
  yaw: number;
  /** Öffnungswinkel in Bogenmaß, ganz (nicht halb). */
  fov: number;
  range: number;
}

/** Ein Geräuschradius: wer gerade wie weit zu hören ist. */
export interface NoiseRadius {
  entityId: string;
  at: MapPoint;
  radius: number;
  /** Was ihn erzeugt — Rennen, Gehen, eine geöffnete Fracht. */
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
  /**
   * Die sichtbare Fläche als Polygon, gegen Wände beschnitten — das ist es,
   * was gezeichnet wird. Leer, wenn noch nicht berechnet.
   */
  polygon: MapPoint[];
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

/** Ob ein Punkt in einem Kegel liegt — Winkel und Reichweite, ohne Wände. */
export function inCone(cone: VisionCone, at: MapPoint): boolean {
  const dx = at.x - cone.at.x,
    dz = at.z - cone.at.z;
  const distance = Math.hypot(dx, dz);
  if (distance > cone.range) return false;
  if (distance < 1e-6) return true;
  // Blickrichtung wie in `mapSnapshot.headingOf`: yaw 0 schaut nach -z.
  const hx = -Math.sin(cone.yaw),
    hz = -Math.cos(cone.yaw);
  const cos = (dx * hx + dz * hz) / distance;
  return cos >= Math.cos(cone.fov / 2);
}

/**
 * Das Modell selbst. **Phase 1 (`feat/map-core`).** Die Signatur steht; bis
 * dahin ist das Feld leer und im Modus `omniscient` sind alle Wesen sichtbar.
 */
export type ComputeVisibility = (input: VisibilityInput) => VisibilityField;

export function emptyField(mode: VisibilityMode): VisibilityField {
  return { mode, lit: [], self: null, cones: [], noise: [], visibleEntities: [], litRooms: [] };
}
