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
