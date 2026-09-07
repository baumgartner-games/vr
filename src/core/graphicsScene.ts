import * as THREE from 'three';
import { applyLook, supportsLook } from './materialLook';
import { addOutline, deniesOutline, isOutline, removeOutline } from './outlineShell';
import type { GraphicsProfile } from './graphicsSettings';

/**
 * Was eine Grafikstufe an einer fertig gebauten Szene ändert.
 *
 * Die Welten wissen von dieser Datei nichts, und das ist Absicht: Es gibt
 * fünfzehn davon, sie werden zur Laufzeit nachgeladen, und jede müsste sonst
 * dieselben vier Zeilen selbst schreiben — und die nächste, die dazukommt,
 * würde sie vergessen. Also geht es andersherum: Die Szene wird **abgelaufen**
 * und angefasst, was sich anfassen lässt.
 *
 * Alles hier ist **idempotent und umkehrbar**. Der Durchlauf läuft nicht
 * einmal, sondern alle paar Sekunden noch einmal — sonst hätte ein Zombie, der
 * nach dem Umschalten aus dem Käfig kommt, als Einziger keinen Schatten. Und
 * jeder Wert, der überschrieben wird, wird vorher unter `userData` gemerkt:
 * „Comic" muss sich vollständig zurücknehmen lassen, sonst ist „Einfach" nach
 * einem Ausflug nicht mehr dasselbe Einfach wie vorher.
 *
 * Ohne three.js geht es hier nicht, gerechnet wird trotzdem nichts, was nicht
 * auch ohne Grafikkarte zu prüfen wäre — der Test dazu baut eine Szene aus
 * Meshes und Lichtern und sieht nach, was hinterher an ihnen steht.
 */

/** Wo die ursprünglichen Schattenschalter eines Meshes liegen. */
const MESH_BASE = 'bgvrShadowBase';
/** Wo der ursprüngliche `castShadow` eines Lichts liegt. */
const LIGHT_BASE = 'bgvrCastBase';
/** Wo die ursprüngliche Stärke eines Grundlichts liegt. */
const AMBIENT_BASE = 'bgvrAmbientBase';
/** Die gemerkte Richtung, in die eine Sonne scheint (im Raum ihres Elters). */
const SUN_DIR = 'bgvrSunDir';

/** Auf dieses Raster rastet der Schattenkasten ein — siehe `aimSun`. */
const ANCHOR_GRID = 2;

interface MeshShadowBase {
  cast: boolean;
  receive: boolean;
}

const _anchor = new THREE.Vector3();
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();

function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

/** Beleuchtet, also von Schatten und Farbstufen überhaupt betroffen. */
function isLit(material: THREE.Material): boolean {
  return (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
}

/**
 * Dreht das Grundlicht herunter, damit ein Schatten einer sein kann — und gibt
 * zurück, ob das Objekt eines war.
 *
 * Nur Hemisphären- und Umgebungslicht, nie eine Lampe: Der Dimmer im
 * Dunkelhaus, die Deckenlampen im Interaktionslabor und der Blitz einer
 * Explosion stellen ihre Stärke selbst ein, und ein Durchlauf, der ihnen jede
 * Sekunde dazwischenfunkt, wäre ein Fehler, den niemand mehr findet.
 */
function dimAmbient(object: THREE.Object3D, profile: GraphicsProfile): boolean {
  const light = object as THREE.HemisphereLight & THREE.AmbientLight;
  if (!light.isHemisphereLight && !light.isAmbientLight) return false;
  const base = (light.userData[AMBIENT_BASE] as number | undefined) ?? light.intensity;
  light.userData[AMBIENT_BASE] = base;
  light.intensity = base * profile.ambientScale;
  return true;
}

/**
 * Legt eine Stufe über die Szene und gibt die Sonne zurück, die von jetzt an
 * die Schatten wirft (oder `null`, wenn keine gebraucht wird).
 *
 * `recompile` ist der Sonderfall beim **Umschalten**: `shadowMap.enabled` ist
 * eine Eigenschaft des Renderers, steckt aber als `#define` in jedem einzelnen
 * Shader. Wer sie umlegt, ohne die Materialien neu übersetzen zu lassen,
 * bekommt eine Szene, in der die Hälfte der Dinge noch nach den alten Regeln
 * beleuchtet wird.
 */
export function applySceneQuality(
  root: THREE.Object3D,
  profile: GraphicsProfile,
  recompile = false,
): THREE.DirectionalLight | null {
  const suns: THREE.DirectionalLight[] = [];

  root.traverse((object) => {
    const light = object as THREE.DirectionalLight;
    if (light.isDirectionalLight) {
      suns.push(light);
      return;
    }
    if (dimAmbient(object, profile)) return;

    const mesh = object as THREE.Mesh;
    // Ein Saum ist kein Ding der Welt, sondern ein zweites Bild eines Dings:
    // Er bekommt weder Schatten noch Stufen, und schon gar keinen eigenen Saum.
    if (!mesh.isMesh || isOutline(mesh)) return;
    const materials = materialsOf(mesh).filter((material) => !!material);
    if (!materials.some(isLit)) return;

    // --- die Farbstufen
    for (const material of materials) {
      applyLook(material, profile.toonBands);
      if (recompile && supportsLook(material)) material.needsUpdate = true;
    }

    // --- was für ein Ding das ist
    // Eine Kulisse ist kein Ding, sondern das, was hinter den Dingen steht:
    // Der Himmel steht um alles herum, die Bodenplatte reicht bis zum Horizont.
    // Einen Schatten würfe sie über die halbe Welt, und eine Kontur legte einen
    // schwarzen Strich um den Horizont. Empfangen darf sie ihn, dafür ist der
    // Boden ja da.
    const backdrop = mesh.userData['backdrop'] === true;
    // Und Durchsichtiges wirft keinen: Ein Fenster mit einem Brett als Schatten
    // ist schlimmer als ein Fenster ohne Schatten.
    const solid = materials.every((material) => !material.transparent);

    // --- die Kontur
    if (profile.outlines && !backdrop && solid && !deniesOutline(mesh)) {
      addOutline(mesh, {
        width: profile.outlineWidth,
        maxGrow: profile.outlineMaxGrow,
        color: profile.outlineColor,
      });
    } else {
      removeOutline(mesh);
    }

    // --- die Schatten
    const base = (mesh.userData[MESH_BASE] as MeshShadowBase | undefined) ?? {
      cast: mesh.castShadow,
      receive: mesh.receiveShadow,
    };
    mesh.userData[MESH_BASE] = base;
    if (!profile.shadows) {
      mesh.castShadow = base.cast;
      mesh.receiveShadow = base.receive;
      return;
    }
    mesh.castShadow = !backdrop && solid;
    mesh.receiveShadow = true;
  });

  return tuneSuns(suns, profile);
}

/**
 * Wer von den Lichtern die Sonne ist: das hellste Richtungslicht.
 *
 * Eine zweite Schattenkarte wäre schnell dazugeschaltet und teuer bezahlt —
 * jede kostet einen weiteren Durchlauf über die ganze Szene, pro Bild. Und die
 * Welten hier sind alle nach demselben Muster ausgeleuchtet (`createLighting`):
 * ein kräftiges Licht von vorn oben, ein schwaches von hinten. Das schwache
 * wirft in der Wirklichkeit auch keinen sichtbaren Schatten.
 */
export function findSun(root: THREE.Object3D): THREE.DirectionalLight | null {
  const suns: THREE.DirectionalLight[] = [];
  root.traverse((object) => {
    const light = object as THREE.DirectionalLight;
    if (light.isDirectionalLight) suns.push(light);
  });
  return brightest(suns);
}

function brightest(suns: readonly THREE.DirectionalLight[]): THREE.DirectionalLight | null {
  let best: THREE.DirectionalLight | null = null;
  for (const sun of suns) if (!best || sun.intensity > best.intensity) best = sun;
  return best;
}

/** Stellt die Schattenkarte der Sonne ein und nimmt sie allen anderen ab. */
function tuneSuns(
  suns: readonly THREE.DirectionalLight[],
  profile: GraphicsProfile,
): THREE.DirectionalLight | null {
  const sun = profile.shadows ? brightest(suns) : null;

  for (const light of suns) {
    const base = (light.userData[LIGHT_BASE] as boolean | undefined) ?? light.castShadow;
    light.userData[LIGHT_BASE] = base;
    if (light !== sun) {
      light.castShadow = base;
      continue;
    }

    light.castShadow = true;
    if (light.shadow.mapSize.width !== profile.shadowMapSize) {
      light.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
      // Die Karte hängt an ihrer Größe: Wer sie ändert, muss die alte
      // wegwerfen, sonst zeichnet three.js weiter in die alte Auflösung.
      light.shadow.map?.dispose();
      light.shadow.map = null;
      light.shadow.needsUpdate = true;
    }
    const camera = light.shadow.camera;
    camera.left = -profile.shadowRange;
    camera.right = profile.shadowRange;
    camera.top = profile.shadowRange;
    camera.bottom = -profile.shadowRange;
    camera.near = 0.5;
    camera.far = profile.shadowDistance * 2 + profile.shadowRange;
    camera.updateProjectionMatrix();
    // Zwei Sorten Streifen gibt es an einer Schattenkarte, und beide sind hier
    // schon einmal gestellt: `bias` gegen das Moiré auf ebenen Flächen,
    // `normalBias` gegen den Spalt zwischen Körper und eigenem Schatten.
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.035;
  }

  return sun;
}

/**
 * Schiebt die Sonne so, dass ihr Schattenkasten um den Spieler steht.
 *
 * Eine Richtungslicht-Schattenkarte deckt einen Kasten ab, und der ist hier 28
 * Meter breit — die Welten sind größer. Also wandert er mit: Die **Richtung**,
 * aus der die Sonne scheint, bleibt exakt die, die die Welt gebaut hat (sonst
 * wanderten die Schatten beim Gehen über den Boden), nur der Standpunkt der
 * Lampe und ihr Ziel rücken hinter den Spieler.
 *
 * Der Anker rastet dabei auf zwei Meter ein. Ohne das kröchen die Schattenränder
 * bei jedem Schritt über die Kanten, weil das Pixelraster der Karte sich unter
 * ihnen verschiebt — in einer Brille ist das deutlich unangenehmer als ein
 * Schatten, der alle zwei Meter einmal springt.
 */
export function aimSun(
  sun: THREE.DirectionalLight,
  head: THREE.Vector3,
  profile: GraphicsProfile,
): void {
  // Die Richtung wird einmal abgeschrieben — danach steht die Lampe ja nicht
  // mehr dort, wo die Welt sie hingestellt hat, und ihre eigene Position wäre
  // eine Auskunft über sich selbst. In Weltkoordinaten, denn genau so liest
  // die Schattenkarte sie später: Lampe und Ziel, beide als Weltposition.
  let direction = sun.userData[SUN_DIR] as THREE.Vector3 | undefined;
  if (!direction) {
    sun.getWorldPosition(_from);
    sun.target.getWorldPosition(_to);
    direction = new THREE.Vector3().copy(_to).sub(_from).normalize();
    // Eine Lampe, die auf sich selbst zeigt, gibt es: `DirectionalLight` bringt
    // sein Ziel im Ursprung mit, und eine Welt darf es dort stehen lassen.
    if (direction.lengthSq() < 0.5) direction.set(-0.4, -1, -0.3).normalize();
    sun.userData[SUN_DIR] = direction;
  }

  _anchor.set(snap(head.x), snap(head.y), snap(head.z));
  place(sun.target, _anchor);
  place(sun, _to.copy(_anchor).addScaledVector(direction, -profile.shadowDistance));
  // Das Ziel eines Richtungslichts hängt in three.js an keiner Szene, und ohne
  // Elternteil rechnet niemand seine Weltmatrix aus. Genau die liest die
  // Schattenkarte aber — also selbst rechnen, jedes Bild.
  sun.target.updateMatrixWorld();
}

/** Auf das Ankerraster, damit der Kasten nicht bei jedem Schritt verrutscht. */
function snap(value: number): number {
  return Math.round(value / ANCHOR_GRID) * ANCHOR_GRID;
}

/** Setzt ein Objekt auf eine Weltposition — egal, woran es hängt. */
function place(object: THREE.Object3D, world: THREE.Vector3): void {
  object.position.copy(world);
  const parent = object.parent;
  if (!parent) return;
  parent.updateWorldMatrix(true, false);
  parent.worldToLocal(object.position);
}
