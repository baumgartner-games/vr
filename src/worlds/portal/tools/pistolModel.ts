import * as THREE from 'three';
import {
  FRAME_FLARE,
  LOBE_LEVEL,
  frameFlare,
  gripScale,
  gunAt,
  gunPoint,
  lobeEnd,
} from './pistolFit';

/**
 * **Das Maßband für eine fremde Pistole** — aus einem geladenen Netz werden
 * die vier Zahlen, mit denen `PistolTool` es an seinen Halterzylinder hängt.
 *
 * Die Rechnung selbst steht nebenan in `pistolFit.ts` und kommt ohne three.js
 * aus; hier steht nur das **Messen**, und das braucht ein Netz. Dieselbe Naht
 * wie überall in diesem Projekt (`core/kaykitHeight.ts`, `aim.ts`,
 * `worlds/range/shatter.ts`): Was gerechnet wird, wird geprüft; was gemessen
 * wird, steht so nah wie möglich am Netz.
 *
 * **Gemessen wird an Punkten und nicht an Boxen.** Eine `Box3` über die ganze
 * Waffe beantwortet keine der Fragen, um die es geht — wo der Griff aufhört,
 * wie breit er ist, wo die Bohrung liegt. Dafür braucht es Profile, und dafür
 * braucht es Proben. Jedes Dreieck wird deshalb in ein kleines baryzentrisches
 * Raster zerlegt; bei `Gun_Pistol.glb` sind das 642 Dreiecke und rund 9 600
 * Punkte, einmal beim Bauen des Werkzeugs. Nur die Ecken zu nehmen wäre
 * billiger und falsch: Ein langes, schmales Dreieck steht dann in drei
 * Scheiben und fehlt in den zehn dazwischen.
 */

/**
 * **Wie fein ein Dreieck zerlegt wird** — `S` Schritte je Kante, also
 * `(S+1)(S+2)/2` Punkte.
 *
 * Vier ist gemessen und nicht geraten: Mit drei fällt der Griff um ein
 * Zentimeter kürzer aus (eine Scheibe seiner Oberkante bleibt leer), mit sechs
 * kommt gegenüber vier nichts Neues heraus, und der Maßstab bewegt sich über
 * die ganze Spanne von drei bis sechs um keine fünf Prozent. Der Preis ist ein
 * Zehntausendstel eines Bildes, einmal.
 */
const SAMPLE = 4;

/** Scheiben über die Länge, für das Bodenprofil (`lobeEnd`). */
const LENGTH_SLICES = 32;

/** Scheiben über die Höhe des hinteren Lappens, für die Breite (`frameFlare`). */
const HEIGHT_SLICES = 48;

/**
 * **Wie dick die vorderste Scheibe ist, an der die Bohrung gemessen wird** —
 * zwei Prozent der Länge.
 *
 * Die Mündung ist nicht nur eine Richtung, sondern ein **Ort**: Aus ihr kommen
 * die Kugeln, an ihr hängen die Zielhilfen (`attachments.ts`, `ctx.muzzle`).
 * Die vordersten zwei Prozent von `Gun_Pistol.glb` sind 1,2 cm der Quelle und
 * treffen genau den herausstehenden Lauf; nähme man ein Zehntel, stünde die
 * halbe Waffe mit darin und die Bohrung läge in ihrer Mitte statt im Rohr.
 */
const MUZZLE_FACE = 0.02;

/** Was am Ende herauskommt: wie das Modell ins Werkzeug kommt. */
export interface GunFit {
  /** Der Faktor auf das schon paketskalierte Modell (`kaykitFit.kaykitScale`). */
  scale: number;
  /** Wohin die Gruppe um das Modell kommt, im Werkzeugraum. */
  at: THREE.Vector3;
  /** Die Mündung im Werkzeugraum — vorderste Fläche, auf der Bohrung. */
  muzzle: THREE.Vector3;
  /** Die Oberkante der Waffe im Werkzeugraum, für die Zielschiene. */
  top: number;
}

/**
 * **Alle Punkte eines Baums**, dicht genug für ein Profil — in den Metern, in
 * denen das Modell schon steht (der Paketmaßstab hängt an seiner Gruppe).
 */
function samplesOf(root: THREE.Object3D): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!position) return;
    const index = mesh.geometry.index;
    const count = index ? index.count : position.count;
    const corner = (target: THREE.Vector3, at: number): void => {
      target.fromBufferAttribute(position, index ? index.getX(at) : at);
      target.applyMatrix4(mesh.matrixWorld);
    };
    for (let i = 0; i + 2 < count; i += 3) {
      corner(a, i);
      corner(b, i + 1);
      corner(c, i + 2);
      for (let u = 0; u <= SAMPLE; u++) {
        for (let v = 0; u + v <= SAMPLE; v++) {
          const w = SAMPLE - u - v;
          out.push(
            new THREE.Vector3(
              (a.x * u + b.x * v + c.x * w) / SAMPLE,
              (a.y * u + b.y * v + c.y * w) / SAMPLE,
              (a.z * u + b.z * v + c.z * w) / SAMPLE,
            ),
          );
        }
      }
    }
  });
  return out;
}

/**
 * **Die Einpassung** — oder `null`, wenn das Netz leer ist.
 *
 * `cylinder` ist die Länge des Halterzylinders (`mountGrip({ length })`),
 * `target` seine Mitte im Werkzeug (`gripFit.STANDARD_GRIP.position`). Beides
 * kommt von außen, damit hier keine zweite Fassung derselben Zahl steht.
 *
 * Der Weg ist der aus `pistolFit.ts`: hinterer Lappen, Griffoberkante,
 * Maßstab, Ort. Was er nicht tut, ist die **Richtung** zu messen — die steht
 * fest: Der Lauf muss dorthin zeigen, wohin `PistolTool.fire` schießt, also
 * nach `−z`. Die halbe Drehung um die Hochachse steckt in `gunPoint`.
 */
export function fitGun(
  model: THREE.Object3D,
  cylinder: number,
  target: THREE.Vector3,
): GunFit | null {
  const points = samplesOf(model);
  if (points.length === 0) return null;
  const whole = new THREE.Box3().setFromPoints(points);
  if (whole.isEmpty()) return null;

  // **Der hintere Lappen.** Die Schwelle ist gemessen und nicht gesetzt: auf
  // halbem Weg vom tiefsten Punkt der Waffe zu ihrer halben Höhe.
  const level = whole.min.y + ((whole.min.y + whole.max.y) / 2 - whole.min.y) * LOBE_LEVEL;
  const floors = new Array<number>(LENGTH_SLICES).fill(Number.POSITIVE_INFINITY);
  const depth = (whole.max.z - whole.min.z) / LENGTH_SLICES;
  for (const point of points) {
    const slot = slotOf(point.z, whole.min.z, depth, LENGTH_SLICES);
    if (point.y < floors[slot]!) floors[slot] = point.y;
  }
  const back = lobeEnd(floors, whole.min.z, whole.max.z, level);
  const lobe = points.filter((point) => point.z <= back);
  const lobeBox = new THREE.Box3().setFromPoints(lobe);
  if (lobeBox.isEmpty()) return null;

  // **Die Oberkante des Griffs.** Von unten nach oben bleibt ein Griff gleich
  // breit; wo der Rahmen ausladet, hört er auf.
  const low = new Array<number>(HEIGHT_SLICES).fill(Number.POSITIVE_INFINITY);
  const high = new Array<number>(HEIGHT_SLICES).fill(Number.NEGATIVE_INFINITY);
  const rise = (lobeBox.max.y - lobeBox.min.y) / HEIGHT_SLICES;
  for (const point of lobe) {
    const slot = slotOf(point.y, lobeBox.min.y, rise, HEIGHT_SLICES);
    if (point.x < low[slot]!) low[slot] = point.x;
    if (point.x > high[slot]!) high[slot] = point.x;
  }
  const widths = low.map((edge, slot) => high[slot]! - edge);
  const top = frameFlare(widths, lobeBox.min.y, lobeBox.max.y, widths[0]!, FRAME_FLARE);

  const grip = new THREE.Box3().setFromPoints(lobe.filter((point) => point.y <= top));
  if (grip.isEmpty()) return null;
  const scale = gripScale(grip.max.y - grip.min.y, cylinder);
  const at = gunAt(grip.getCenter(new THREE.Vector3()), scale, target);

  // **Die Bohrung** — die Mitte der vordersten Scheibe, auf der vordersten
  // Fläche. Das ist der Ort, an dem eine Kugel die Waffe verlässt.
  const face = new THREE.Box3().setFromPoints(
    points.filter((point) => point.z >= whole.max.z - (whole.max.z - whole.min.z) * MUZZLE_FACE),
  );
  const bore = face.isEmpty()
    ? whole.getCenter(new THREE.Vector3())
    : face.getCenter(new THREE.Vector3());
  const muzzle = gunPoint({ x: bore.x, y: bore.y, z: whole.max.z }, scale, at);

  return {
    scale,
    at: new THREE.Vector3(at.x, at.y, at.z),
    muzzle: new THREE.Vector3(muzzle.x, muzzle.y, muzzle.z),
    top: gunPoint({ x: 0, y: whole.max.y, z: 0 }, scale, at).y,
  };
}

/** Eine Box des Modells in den Werkzeugraum gedreht, skaliert und gerückt. */
export function gunBox(box: THREE.Box3, fit: GunFit, out: THREE.Box3): THREE.Box3 {
  const near = gunPoint(box.min, fit.scale, fit.at);
  const far = gunPoint(box.max, fit.scale, fit.at);
  out.makeEmpty();
  out.expandByPoint(new THREE.Vector3(near.x, near.y, near.z));
  out.expandByPoint(new THREE.Vector3(far.x, far.y, far.z));
  return out;
}

/** In welche Scheibe ein Wert fällt — die letzte fängt den Rand mit auf. */
function slotOf(value: number, from: number, step: number, slices: number): number {
  if (!(step > 0)) return 0;
  return Math.min(slices - 1, Math.max(0, Math.floor((value - from) / step)));
}
