import * as THREE from 'three';
import { ALL_GROUPS, GROUP_WORLD, type BodyOptions, type PhysicsBody } from './PhysicsWorld';
import type { PhysicsWorld } from './PhysicsWorld';

/**
 * Ein Ding, das jeden Zugriff und jeden Aufruf mit **sich selbst** beantwortet.
 *
 * Damit läuft eine ganze Kette wie `rapier.JointData.revoluteWithAxes(…)` oder
 * `entry.body.setGravityScale(0, true)` durch, ohne dass hier jemand die
 * Rapier-Schnittstelle nachbauen müsste — und ohne dass eine Welt beim Bauen
 * stolpert, die morgen eine Zeile mehr davon benutzt. Der Typ `never` ist der
 * ehrliche Name dafür: es ist nichts, und es passt deshalb überall hin.
 */
const nothing: never = new Proxy(function () {} as object, {
  get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : nothing),
  apply: () => nothing,
}) as never;

/**
 * Eine Physik, die **nichts** tut — für eine Welt, die nur angesehen wird.
 *
 * Die Werkzeugseite baut die Kulisse einer Welt mit deren eigenem Code
 * (`World.preview()`), und dieser Code legt beim Bauen jede Wand, jede Kiste
 * und jedes Gelände in die Simulation. Das ist im Spiel genau richtig und hier
 * vollkommen überflüssig: es steht niemand darin, es fällt nichts um, und ein
 * Bild in einer Liste braucht keine Rapier-Wasm.
 *
 * Statt jeden dieser Aufrufe an der Baustelle wegzukapseln — `if (physics)` in
 * fünfzig Zeilen quer durch neun Welten — bekommt die Vorschau eine Physik
 * **derselben Form**, die alles entgegennimmt und nichts damit macht. Was
 * zurückkommt, ist ein Körper-Eintrag mit richtigen Feldern; was daran
 * *Rapier* ist (`body`, `collider`, `world`, `rapier`), ist die Attrappe von
 * oben.
 */
export function silentPhysics(): PhysicsWorld {
  const stub = {
    rapier: nothing,
    world: nothing,
    dynamicBodies: [] as PhysicsBody[],
    playerCapsule: null,
    get gravityY(): number {
      return -9.81;
    },
    addStatic: (object: THREE.Object3D, options: BodyOptions = {}) => entry(object, options),
    addDynamic: (object: THREE.Object3D, options: BodyOptions = {}) => entry(object, options),
    addKinematic: (object: THREE.Object3D, options: BodyOptions = {}) => entry(object, options),
    addHeightfield: (object: THREE.Object3D) => entry(object, {}),
    setGravity: () => undefined,
    setMaterial: () => undefined,
    step: () => undefined,
    stepFixed: () => undefined,
    sync: () => undefined,
    setPhasing: () => undefined,
    setCarried: () => undefined,
    setGhost: () => undefined,
    resize: () => undefined,
    remove: () => undefined,
    dispose: () => undefined,
  };
  // `PhysicsWorld` hat einen privaten Konstruktor und private Felder, also
  // passt kein noch so vollständiges Objekt strukturell darauf. Der Umweg über
  // `unknown` ist genau hier ehrlich: die Attrappe kann alles, was das Bauen
  // einer Welt von der Physik verlangt, und nichts darüber hinaus.
  return stub as unknown as PhysicsWorld;
}

/** Ein Körper-Eintrag, der nur aus seinen eigenen Feldern besteht. */
function entry(object: THREE.Object3D, options: BodyOptions): PhysicsBody {
  return {
    object,
    body: nothing,
    collider: nothing,
    // Die Maße misst in der Vorschau niemand nach — greifen kann hier ohnehin
    // niemand.
    halfExtents: options.halfExtents?.clone() ?? new THREE.Vector3(0.5, 0.5, 0.5),
    shape: options.shape ?? { kind: 'box' },
    phaseMask: 0,
    carried: false,
    clearing: false,
    ghost: false,
    membership: options.membership ?? GROUP_WORLD,
    filter: options.filter ?? ALL_GROUPS,
    previousPosition: object.position.clone(),
  };
}
