import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  XRControllerModelFactory,
  type XRControllerModel,
} from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import type { Handedness } from './XRInput';

/**
 * Der Controller, den der Spieler wirklich in der Hand hält — als Modell.
 *
 * Ein Quest-Controller aus Kästen und Zylindern nachzubauen kommt weit: man
 * erkennt, was gemeint ist, und jeder Knopf sitzt ungefähr, wo er hingehört.
 * „Ungefähr" ist aber genau das, was im Eingaberaum nicht reicht — dort liegt
 * das Ding auf einem Tisch neben der eigenen Hand, und man vergleicht.
 *
 * Die richtigen Modelle gibt es fertig: `@webxr-input-profiles/assets` von der
 * Immersive Web Community Group, dieselben, die jede WebXR-Seite benutzt, mit
 * beweglichem Trigger, Griff und Stick. three bringt mit
 * `XRControllerModelFactory` auch schon die Maschine dafür mit — und lädt sie
 * **zur Laufzeit von einem CDN**. Das ist die Sorte Abhängigkeit, die man erst
 * bemerkt, wenn sie fehlt: ohne Netz oder hinter einem Filter ist der
 * Controller einfach weg, und niemand weiß warum.
 *
 * Deshalb liegen die Dateien im Repository (`public/controllers`, geholt von
 * `tools/controllers.ts`), und hier steht der Pfad dorthin. Mitgekommen sind
 * nur die **Quest-Profile**; alles andere fällt auf den selbst gebauten
 * Controller zurück (`worlds/tune/InputModel.ts`), der dafür immer da ist.
 *
 * Zwei Wege heraus, weil es zwei Fragen sind:
 *
 * - `liveControllerModel` gibt ein Modell, das **an einem echten Gerät hängt**
 *   und sich mit dessen Knöpfen bewegt. Es braucht eine `XRInputSource`, also
 *   eine laufende Sitzung.
 * - `controllerShape` gibt dieselbe Geometrie als **Ausstellungsstück**, ohne
 *   Gerät dahinter — für den Geist auf dem Tisch, den man auch justieren will,
 *   wenn man den zweiten Controller gerade weggelegt hat.
 */

/** Wo die Profile liegen: unter uns, nie auf einem fremden Server. */
export const CONTROLLER_PROFILES = `${import.meta.env.BASE_URL}controllers`;

/** Was gezeigt wird, solange kein echtes Gerät verrät, was es ist. */
const SHOWCASE = 'meta-quest-touch-plus';

/** Der Teil eines `MotionController`, den wir anfassen. */
interface MotionControllerLike {
  components: Record<
    string,
    { id: string; visualResponses: Record<string, { valueNode?: THREE.Object3D }> }
  >;
}

/** Ein Eintrag in `profilesList.json`. */
interface ProfileEntry {
  path: string;
}

/** Der Teil einer `profile.json`, den wir brauchen: welche Datei zu welcher Hand. */
interface ProfileFile {
  layouts?: Record<string, { assetPath?: string } | undefined>;
}

const loader = new GLTFLoader();
let factory: XRControllerModelFactory | null = null;
let profileList: Promise<Record<string, ProfileEntry>> | null = null;
const shapes = new Map<string, Promise<THREE.Object3D | null>>();

/**
 * Ein Modell, das am echten Gerät hängt.
 *
 * Die Fabrik von three wartet normalerweise auf das `connected`-Ereignis des
 * Controllers — was voraussetzt, dass man sie *vor* dem Verbinden erzeugt hat.
 * Ein Raum, den man betritt, während die Brille längst läuft, kommt zu spät
 * dafür. Sie liest aus dem Ereignis aber nur die `XRInputSource` heraus, und
 * die haben wir ohnehin (`XRInput`), also bekommt sie sie direkt gereicht.
 *
 * Das Modell kommt **leer** zurück und füllt sich, sobald die Datei da ist;
 * von da an bewegt es Trigger, Griff und Stick selbst, jede Frame, aus dem
 * Gamepad (`XRControllerModel.updateMatrixWorld`).
 *
 * @returns `null`, wenn an dieser Eingabe gar kein Controller hängt — eine
 *          getrackte Hand etwa hat keinen.
 */
export function liveControllerModel(source: XRInputSource | null): XRControllerModel | null {
  if (!source || source.hand || !source.gamepad || source.targetRayMode !== 'tracked-pointer') {
    return null;
  }
  if (!factory) factory = new XRControllerModelFactory(loader).setPath(CONTROLLER_PROFILES);
  const holder = new THREE.Group();
  const model = factory.createControllerModel(holder);
  emitConnected(holder, source);
  return model;
}

/**
 * Welche Knoten des Modells zu einer Taste gehören.
 *
 * Das echte Modell *bewegt* seine Knöpfe, statt sie leuchten zu lassen — was
 * schöner ist und trotzdem nicht reicht: einen Millimeter Tastenweg sieht man
 * auf einem Tisch nicht, und der Eingaberaum ist genau der Ort, an dem man
 * wissen will, ob ein Druck angekommen ist. Also markieren wir zusätzlich, und
 * dafür brauchen wir den Ort. Den weiß das Profil selbst — jede Komponente
 * bringt die Knoten mit, die sie bewegt.
 *
 * @param id die Komponente, z. B. `xr-standard-trigger` oder `a-button`
 */
export function componentNode(model: XRControllerModel, id: string): THREE.Object3D | null {
  const controller = model.motionController as MotionControllerLike | null;
  const component = controller?.components?.[id];
  if (!component) return null;
  for (const response of Object.values(component.visualResponses)) {
    if (response.valueNode) return response.valueNode;
  }
  return null;
}

/**
 * Dieselbe Geometrie, aber ohne Gerät dahinter — ein Ausstellungsstück.
 *
 * Gezeigt wird das Profil des Controllers, der gerade angeschlossen ist; ohne
 * einen das der Quest 3, weil irgendeiner dastehen muss und das der ist, den
 * hier die meisten in der Hand haben. Die zurückgegebene Kopie gehört dem
 * Aufrufer, ihre **Materialien und Geometrien aber nicht**: die kommen aus
 * einem Zwischenspeicher, den sich alle teilen. Wer die Kopie wegwirft, hängt
 * sie aus und gibt nichts frei.
 */
export async function controllerShape(
  hand: Handedness,
  source: XRInputSource | null = null,
): Promise<THREE.Object3D | null> {
  const profile = await profileFor(source);
  if (!profile) return null;
  const key = `${profile}:${hand}`;
  let shape = shapes.get(key);
  if (!shape) {
    shape = load(profile, hand);
    shapes.set(key, shape);
  }
  const model = await shape;
  return model ? model.clone(true) : null;
}

/**
 * Die Materialien einer Kopie ihr allein geben.
 *
 * `Object3D.clone` teilt sie mit dem Original, und der Geist auf dem Tisch
 * will durchsichtig sein, ohne den Controller in der Hand mitzunehmen. Wer das
 * hier ruft, hat danach etwas, das er auch wieder freigeben muss.
 */
export function ownMaterials(root: THREE.Object3D): THREE.Material[] {
  const owned: THREE.Material[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(material)) {
      const copies = material.map((entry) => entry.clone());
      owned.push(...copies);
      mesh.material = copies;
    } else {
      const copy = material.clone();
      owned.push(copy);
      mesh.material = copy;
    }
  });
  return owned;
}

/** Die Teile des selbst gebauten Controllers, die sich noch bewegen sollen. */
export interface BuiltController {
  /** Alles zusammen — hängt sich irgendwo ein und ist fertig. */
  root: THREE.Group;
  /** Der Stick auf eigenem Pivot: er lehnt, wohin der echte lehnt. */
  stick: THREE.Group;
  /** Der Trigger auf eigenem Pivot: halb gezogen sieht halb gezogen aus. */
  trigger: THREE.Group;
}

/**
 * Der **selbst gebaute** Quest-Controller aus Kästen und Zylindern.
 *
 * Der Rückfall, wenn das echte Modell nicht kommt — und der Vordergrund
 * überall, wo eines nie kommt: ein Controller, der als **Werkzeug** in der
 * Hand liegt, wird gebaut, bevor irgendeine Datei geladen ist, und ein leerer
 * Griff wäre dort keine Antwort.
 *
 * Er steht hier und nicht im Eingaberaum, weil ihn inzwischen zwei brauchen —
 * das Modell an der Wand und das Werkzeug in der Hand —, und zwei Controller
 * zu pflegen, von denen einer anders aussieht als der andere, ist genau die
 * Sorte Abweichung, die man erst bemerkt, wenn man sie nebeneinander hält.
 *
 * -Z ist vorn, wie im Griffraum, den er nachbaut.
 *
 * @param shell das Material des Gehäuses
 * @param part  liefert das Material eines Teils, das leuchten können soll —
 *              der Eingaberaum färbt es um, ein Werkzeug gibt einfach immer
 *              dasselbe zurück.
 */
export function buildControllerShape(
  side: Handedness,
  shell: THREE.Material,
  part: (key: string, color: number) => THREE.Material,
): BuiltController {
  const root = new THREE.Group();
  root.name = `controller-shape-${side}`;
  const mirror = side === 'left' ? -1 : 1;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.034, 0.105), shell);
  root.add(body);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.016, 0.1, 12), shell);
  handle.position.set(0, -0.06, 0.032);
  handle.rotation.x = 0.32;
  root.add(handle);

  // The thumbstick sits on its own pivot so it can lean where yours leans.
  const stick = new THREE.Group();
  stick.position.set(0, 0.017, -0.016);
  root.add(stick);
  const stickTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.009, 0.016, 12),
    part('stickTop', 0x4a5573),
  );
  stickTop.position.y = 0.008;
  stick.add(stickTop);
  const stickBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013, 0.013, 0.004, 12),
    part('stick', 0x2b3243),
  );
  stickBase.position.set(0, 0.017, -0.016);
  root.add(stickBase);

  // A/X sits nearer the thumb, B/Y behind it — the way they are on a Quest.
  for (const [key, z] of [
    ['primary', 0.014],
    ['secondary', 0.036],
  ] as const) {
    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0075, 0.0075, 0.005, 12),
      part(key, 0xd6dbe6),
    );
    button.position.set(mirror * 0.012, 0.018, z);
    root.add(button);
  }

  // The trigger swings on a pivot under the nose, so half a pull looks like
  // half a pull.
  const trigger = new THREE.Group();
  trigger.position.set(0, -0.008, -0.04);
  root.add(trigger);
  const paddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.026, 0.008),
    part('trigger', 0x9aa6bd),
  );
  paddle.position.set(0, -0.012, 0.002);
  trigger.add(paddle);

  // The grip pad on the inside of the handle, where the middle finger is.
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.036, 0.05), part('grip', 0x9aa6bd));
  grip.position.set(mirror * -0.026, -0.04, 0.024);
  root.add(grip);

  return { root, stick, trigger };
}

/** Welches Profil zu dieser Eingabe passt und auch wirklich danebenliegt. */
async function profileFor(source: XRInputSource | null): Promise<string | null> {
  const list = await profiles();
  if (!list) return null;
  for (const id of source?.profiles ?? []) {
    if (list[id]) return id;
  }
  return list[SHOWCASE] ? SHOWCASE : (Object.keys(list)[0] ?? null);
}

async function profiles(): Promise<Record<string, ProfileEntry> | null> {
  profileList ??= fetch(`${CONTROLLER_PROFILES}/profilesList.json`).then(
    (response) => response.json() as Promise<Record<string, ProfileEntry>>,
  );
  try {
    return await profileList;
  } catch (error) {
    // Keine Dateien da — dann bleibt es beim gebauten Controller, und das ist
    // kein Fehler, sondern der Plan.
    console.warn('[controllers] Profile nicht gefunden', error);
    return null;
  }
}

async function load(profile: string, hand: Handedness): Promise<THREE.Object3D | null> {
  try {
    const list = await profiles();
    const path = list?.[profile]?.path;
    if (!path) return null;
    const file = (await (await fetch(`${CONTROLLER_PROFILES}/${path}`)).json()) as ProfileFile;
    const asset = file.layouts?.[hand]?.assetPath;
    if (!asset) return null;
    const base = path.slice(0, path.lastIndexOf('/') + 1);
    const gltf = await loader.loadAsync(`${CONTROLLER_PROFILES}/${base}${asset}`);
    return gltf.scene;
  } catch (error) {
    console.warn(`[controllers] ${profile}/${hand} nicht ladbar`, error);
    return null;
  }
}

/**
 * Der Fabrik ist gleich, woher das Ereignis kommt — sie liest nur `data`
 * daraus. Das ist kein Trick um sie herum, sondern derselbe Weg hinein, nur
 * ohne darauf zu warten, dass jemand anderes ihn geht.
 */
function emitConnected(holder: THREE.Group, source: XRInputSource): void {
  (holder as unknown as { dispatchEvent(event: { type: string; data: XRInputSource }): void })
    .dispatchEvent({ type: 'connected', data: source });
}
