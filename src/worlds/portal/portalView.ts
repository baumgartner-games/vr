import * as THREE from 'three';
import { PORTAL_HALF_HEIGHT, PORTAL_HALF_WIDTH } from './Portal';

/**
 * **Wo ein Portal auf dem Bild liegt** — und wie man nur dort zeichnet.
 *
 * Eine Portalsicht war ein ganzer Durchgang über die ganze Szene, für jedes
 * Portal, jede Ebene und jedes Auge, auch wenn das Portal hinter einem hing
 * oder als Briefmarke in der Ecke stand. Gemessen in Haunting (Oktober 2026):
 * 232 Zeichenaufrufe ohne Portal, **1 258** mit zweien — bei gut 0,03 ms je
 * Aufruf in der Quest 3 ist das ein halbes Bild nur für die Portale.
 *
 * Gelöst wie in _Portal_ (Valve) und im _Immersive Portals_-Mod für Minecraft:
 * gezeichnet wird nur, **was durch das Loch zu sehen ist**. Valve rechnet für
 * jedes sichtbare Portal ein Rechteck auf dem Schirm und schneidet die Sicht
 * darauf zu (Scissor und ein enger Kegel zum Aussortieren), unsichtbare
 * Portale kosten nichts; der Mod tut dasselbe mit einem eigenen Kegel je
 * Portal, aus dem nur die Chunks gezeichnet werden, die hineinfallen. Hier:
 *
 * - **Das Rechteck** (`portalRect`): die vier Ecken der Öffnung, durch die
 *   Kamera auf den Schirm gerechnet. Hinter der Kamera, abgewandt oder ganz
 *   außerhalb — kein Rechteck, keine Sicht.
 * - **Der Zuschnitt** (`cropProjection`): Die Projektion wird so verzerrt,
 *   dass genau dieses Rechteck den ganzen Kegel füllt, und das Bild landet in
 *   einem Viewport derselben Größe — dieselben Pixel wie vorher, nur dass
 *   three.js jetzt mit dem engen Kegel aussortiert. Zusammen mit der schrägen
 *   Nahebene auf dem Partnerportal (Lengyel) fällt alles weg, was nicht hinter
 *   dem Loch liegt.
 *
 * Rein, ohne Renderer — getestet in `portalView.test.ts`.
 */

/** Ein Ausschnitt in normierten Bildkoordinaten, −1 … 1 je Achse. */
export interface ViewRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Wie weit das Rechteck über die Öffnung hinausgeht: Rand, Wirbel, Rundung. */
const RECT_MARGIN = 1.08;
/**
 * Näher als so viele Meter vor der Öffnung gilt das ganze Bild — die Fläche
 * rutscht kurz vor dem Durchgehen auf das Auge zu (`Portal.setNearPad`), und
 * dort geht keine Ecke mehr sauber vor der Kamera durch.
 */
const NEAR_FULL = 0.45;

const _corners = [
  new THREE.Vector4(),
  new THREE.Vector4(),
  new THREE.Vector4(),
  new THREE.Vector4(),
];
/** Ab wie weit vor dem Auge eine Ecke zählt (Bildraum-w, also Meter Tiefe). */
const W_MIN = 0.01;
const _local = new THREE.Vector3();
const _inverse = new THREE.Matrix4();

/** Das ganze Bild. */
export function fullRect(target: ViewRect): ViewRect {
  target.x0 = -1;
  target.y0 = -1;
  target.x1 = 1;
  target.y1 = 1;
  return target;
}

/** Ob ein Ausschnitt leer ist. */
export function emptyRect(rect: ViewRect): boolean {
  return rect.x1 <= rect.x0 || rect.y1 <= rect.y0;
}

/** `a` ∩ `b` nach `target` — leer, wenn sie sich nicht treffen. */
export function intersectRect(a: ViewRect, b: ViewRect, target: ViewRect): ViewRect {
  target.x0 = Math.max(a.x0, b.x0);
  target.y0 = Math.max(a.y0, b.y0);
  target.x1 = Math.min(a.x1, b.x1);
  target.y1 = Math.min(a.y1, b.y1);
  return target;
}

/** `target` wächst um `rect` (ein leeres `target` wird zu `rect`). */
export function unionRect(target: ViewRect, rect: ViewRect): ViewRect {
  if (emptyRect(rect)) return target;
  if (emptyRect(target)) {
    target.x0 = rect.x0;
    target.y0 = rect.y0;
    target.x1 = rect.x1;
    target.y1 = rect.y1;
    return target;
  }
  target.x0 = Math.min(target.x0, rect.x0);
  target.y0 = Math.min(target.y0, rect.y0);
  target.x1 = Math.max(target.x1, rect.x1);
  target.y1 = Math.max(target.y1, rect.y1);
  return target;
}

/**
 * **Wo die Öffnung eines Portals auf dem Bild einer Kamera liegt.**
 *
 * `portalWorld` ist die Weltmatrix des Portals (+Z zeigt aus der Wand),
 * `cameraWorld` und `projection` die der Kamera. Leer, wenn die Kamera hinter
 * der Wand steht oder die Öffnung ganz neben dem Bild liegt; das ganze Bild,
 * wenn die Kamera so nah ist, dass eine Ecke hinter ihr läge — lieber zu viel
 * zeichnen als ein Loch zeigen, durch das man gleich geht.
 */
export function portalRect(
  portalWorld: THREE.Matrix4,
  cameraWorld: THREE.Matrix4,
  cameraWorldInverse: THREE.Matrix4,
  projection: THREE.Matrix4,
  target: ViewRect,
): ViewRect {
  // Wo die Kamera vom Portal aus steht: davor (z > 0) oder dahinter.
  // Mitten im Durchgehen steht das Auge auch einmal knapp hinter der Ebene,
  // während die Fläche schon vor ihm liegt — das zählt als „ganz nah".
  _local.setFromMatrixPosition(cameraWorld).applyMatrix4(_inverse.copy(portalWorld).invert());
  const nearOpening =
    Math.abs(_local.z) < NEAR_FULL &&
    Math.abs(_local.x) < PORTAL_HALF_WIDTH + NEAR_FULL &&
    Math.abs(_local.y) < PORTAL_HALF_HEIGHT + NEAR_FULL;
  if (nearOpening) return fullRect(target);
  if (_local.z <= 0.01) {
    target.x0 = target.y0 = 1;
    target.x1 = target.y1 = -1;
    return target;
  }

  // Die vier Ecken im Bildraum der Kamera.
  for (let i = 0; i < 4; i++) {
    _corners[i]!.set(
      (i === 1 || i === 2 ? 1 : -1) * PORTAL_HALF_WIDTH * RECT_MARGIN,
      (i >= 2 ? 1 : -1) * PORTAL_HALF_HEIGHT * RECT_MARGIN,
      0,
      1,
    )
      .applyMatrix4(portalWorld)
      .applyMatrix4(cameraWorldInverse)
      .applyMatrix4(projection);
  }
  // Was hinter dem Auge liegt, wird abgeschnitten (Sutherland-Hodgman an
  // w = W_MIN): Dort klappt die Projektion um, und eine Ecke hinter einem
  // landete auf der falschen Seite des Bildes. Übrig bleibt das Stück, das
  // vor dem Auge liegt — ein Portal knapp neben einem ist damit ein Streifen
  // am Rand und nicht das ganze Bild.
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  let kept = 0;
  const take = (x: number, y: number, w: number): void => {
    kept++;
    x0 = Math.min(x0, x / w);
    y0 = Math.min(y0, y / w);
    x1 = Math.max(x1, x / w);
    y1 = Math.max(y1, y / w);
  };
  for (let i = 0; i < 4; i++) {
    const a = _corners[i]!;
    const b = _corners[(i + 1) % 4]!;
    const aIn = a.w > W_MIN;
    if (aIn) take(a.x, a.y, a.w);
    if (aIn !== b.w > W_MIN) {
      const t = (W_MIN - a.w) / (b.w - a.w);
      take(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, W_MIN);
    }
  }
  if (kept === 0) {
    target.x0 = target.y0 = 1;
    target.x1 = target.y1 = -1;
    return target;
  }
  target.x0 = Math.max(-1, x0);
  target.y0 = Math.max(-1, y0);
  target.x1 = Math.min(1, x1);
  target.y1 = Math.min(1, y1);
  return target;
}

/** Ein Viewport in Pixeln. */
export interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * **Der Ausschnitt in ganzen Pixeln** innerhalb des Viewports eines Auges —
 * ein Pixel Rand dazu, damit keine Kante der Öffnung auf den Schnitt fällt.
 * Danach steht in `rect` genau das, was diese Pixel abdecken: Die Projektion
 * wird auf die gerundeten Grenzen zugeschnitten, sonst säße das Bild um einen
 * Bruchteil eines Pixels verschoben.
 */
export function pixelRect(rect: ViewRect, viewport: PixelRect, target: PixelRect): PixelRect {
  const { x, y, w, h } = viewport;
  const px0 = Math.max(x, Math.floor(x + ((rect.x0 + 1) / 2) * w) - 1);
  const py0 = Math.max(y, Math.floor(y + ((rect.y0 + 1) / 2) * h) - 1);
  const px1 = Math.min(x + w, Math.ceil(x + ((rect.x1 + 1) / 2) * w) + 1);
  const py1 = Math.min(y + h, Math.ceil(y + ((rect.y1 + 1) / 2) * h) + 1);
  target.x = px0;
  target.y = py0;
  target.w = Math.max(0, px1 - px0);
  target.h = Math.max(0, py1 - py0);
  rect.x0 = ((px0 - x) / w) * 2 - 1;
  rect.y0 = ((py0 - y) / h) * 2 - 1;
  rect.x1 = ((px1 - x) / w) * 2 - 1;
  rect.y1 = ((py1 - y) / h) * 2 - 1;
  return target;
}

/**
 * **Die Projektion auf einen Ausschnitt zuschneiden**: Was vorher in `rect`
 * lag, füllt danach den ganzen Kegel von −1 bis 1. Nur x und y werden
 * verschoben und gestreckt — die Tiefe und damit die schräge Nahebene
 * (`applyObliqueNearPlane`, vorher angewandt) bleiben, wie sie sind.
 */
export function cropProjection(projection: THREE.Matrix4, rect: ViewRect): THREE.Matrix4 {
  const sx = 2 / (rect.x1 - rect.x0);
  const sy = 2 / (rect.y1 - rect.y0);
  const tx = -(rect.x0 + rect.x1) / (rect.x1 - rect.x0);
  const ty = -(rect.y0 + rect.y1) / (rect.y1 - rect.y0);
  const e = projection.elements;
  // Spaltenweise: Zeile x' = sx·x + tx·w, Zeile y' = sy·y + ty·w.
  for (let column = 0; column < 4; column++) {
    const i = column * 4;
    const w = e[i + 3]!;
    e[i] = sx * e[i]! + tx * w;
    e[i + 1] = sy * e[i + 1]! + ty * w;
  }
  return projection;
}
