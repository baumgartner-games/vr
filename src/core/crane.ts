import * as THREE from 'three';
import { movesFurniture, type GameMode } from './gameMode';
import type { ScreenView } from './screenView';

/**
 * **Der Kran** — wer einrichtet, ist keine Figur mehr, sondern der Greifer
 * darüber.
 *
 * Gewünscht war es so: _„wie bei PlateUp in einen Kran verwandeln, und
 * Richtungen sind erstmal nicht wichtig — im Web wird dann von oben angezeigt,
 * während dieses Modus."_ In _PlateUp!_ ist die Planungsphase genau das: Der
 * Koch tritt ab, über der Küche schwebt ein Greifarm, und der hebt die Möbel.
 * Hier gilt das für **Einrichten** und **Baukasten** (`core/gameMode.ts`) —
 * beide heben Möbel, und beide sind ein Blick von oben auf einen Grundriss.
 *
 * Drei Entscheidungen:
 *
 * - **Der Kran ist rund.** „Richtungen erstmal nicht wichtig" steht in der
 *   Form: ein Gehäuse, ein Seil, drei Klauen im Drittelkreis. Ein Greifer
 *   ohne Vorn kann nicht falsch herum stehen, und die Welt muss für ihn keine
 *   Blickrichtung erfinden. Er dreht sich langsam um sich selbst — damit man
 *   sieht, dass er lebt, und nicht, wohin er schaut.
 * - **Am Schirm heißt Kran: von oben** (`screenTopDown`). Wer _Aus den Augen_
 *   gewählt hat, behält die Wahl — sie gilt nur gerade nicht, solange
 *   eingerichtet wird, und kommt mit _Spielen_ von allein zurück. Gespeichert
 *   wird deshalb nichts: Der Modus ist es nicht (`gameMode.ts`), und die Wahl
 *   der Startseite soll er nicht überschreiben.
 * - **In der Brille bleibt vorerst alles, wie es ist.** Ob man dort steht, wo
 *   man steht, oder die Welt als Miniatur von oben sieht wie beim Bauen
 *   (`worlds/editor/miniature.ts`), ist offen. Der eigene Körper ist in der
 *   Brille ohnehin unsichtbar (`PlayerAvatar`, `LAYER_SELF_ONLY`), der Kran
 *   also auch.
 */

/** **Ob man in diesem Modus der Kran ist** — überall, wo Möbel gehoben werden. */
export function isCrane(mode: GameMode): boolean {
  return movesFurniture(mode);
}

/**
 * **Ob der Schirm von oben zeigen soll** — die eigene Wahl, oder der Kran.
 *
 * Nur die halbe Antwort: Brille, Zuschauen und Welten mit eigener Aufsicht
 * entscheidet `App.topDown` daneben.
 */
export function screenTopDown(view: ScreenView, mode: GameMode): boolean {
  return view === '2d' || isCrane(mode);
}

/** Wie hoch das Gehäuse über dem Boden schwebt, in Metern. */
export const CRANE_HEIGHT = 1.7;
/** Wie weit es auf und ab schwebt, in Metern. */
export const CRANE_BOB = 0.05;
/**
 * Wie schnell es sich um sich selbst dreht, im Bogenmaß je Sekunde — **gar
 * nicht**, seit oben ein Dropship schwebt (`dressCrane`): Ein Fluggerät mit
 * Nase, das sich langsam im Kreis dreht, sieht aus wie eines, das die
 * Orientierung verloren hat. Es dreht sich mit der Figur und schaut dorthin,
 * wohin sie läuft (`TOP_TURN`).
 */
export const CRANE_SPIN = 0;
/** Wie viele Klauen — drei greifen, und drei haben kein Vorn. */
export const CRANE_CLAWS = 3;

/**
 * **Wie tief der Haken reicht**, in Metern unter dem Kran — dort hängt, was er
 * trägt (`craneCarryY`), und dorthin reicht die Kette (`dressCrane`).
 */
export const CRANE_CLAW_DROP = 1.15;

/**
 * **Wie weit um den Punkt unter dem Kran noch etwas gemeint ist**, in Metern
 * — zusätzlich zum Halbmesser des Dings (`core/usable.pickUsable`, `touch`).
 *
 * Klein, weil der Kran **zeigt** und nicht steht: Gemeint ist, worüber er
 * schwebt, und nicht, was eine Figur an dieser Stelle mit den Füßen berührte
 * (`USE_TOUCH`, 0,6 m). Jedes Ding hat mindestens `USE_RADIUS` (0,4 m), also
 * reicht die Auswahl um die halbe Kachel, die man vor sich sieht.
 */
export const CRANE_TOUCH = 0.05;

/**
 * **Wie schnell die Kamera als Kran fährt** — in Abständen je Sekunde.
 *
 * Gewünscht war: _„im Baukasten-Modus (von oben) will ich (im Web mit WASD,
 * mobil mit Joystick) die Kamera-Position bewegen. Die Position des
 * Hakens/Raumschiffs soll über Mauszeiger bzw. Touch passieren."_ WASD und
 * der linke Stock schieben also nicht mehr den Kran, sondern das Bild
 * (`TopDownCamera.pan`). Das Tempo hängt am Zoom: Wer weit weg ist, will
 * weiter fahren, wer nah dran ist, feiner — ein fester Wert in Metern wäre
 * auf 60 m Abstand ein Kriechen und auf 5 m ein Sprung.
 */
export const CRANE_PAN = 0.9;

/**
 * **Der Schritt der Kamera in diesem Bild**, in Weltmetern — Norden oben,
 * wie jede Taste von oben (`FlatControls.walkNorthUp`).
 */
export function cranePan(
  x: number,
  z: number,
  distance: number,
  sprint: boolean,
  dt: number,
): { x: number; z: number } {
  const length = Math.hypot(x, z);
  if (!(length > 0) || !(dt > 0)) return { x: 0, z: 0 };
  const scale = (Math.min(1, length) / length) * distance * CRANE_PAN * (sprint ? 2 : 1) * dt;
  return { x: x * scale, z: z * scale };
}

/**
 * **Wie schnell der Kran dem Zeiger nachzieht** — die Zeitkonstante in
 * Sekunden. Kurz, denn gezeigt wird mit der Hand: Ein Haken, der eine halbe
 * Sekunde hinterherschwebt, hebt beim Klick das Falsche. Und doch nicht null,
 * sonst spränge das Dropship bei jedem Ruck der Maus.
 */
export const CRANE_FOLLOW_TAU = 0.05;

/** Wie schnell der Kran höchstens fliegt, in Metern je Sekunde. */
export const CRANE_MAX_SPEED = 60;

/**
 * **Die Geschwindigkeit, mit der der Kran seinem Ziel nachzieht** — so, dass
 * er in diesem Bild den Anteil `weight(dt, CRANE_FOLLOW_TAU)` des Weges
 * schafft. Geflogen wird ohne Physik (`PhysicsLocomotion.ghost`), und dort
 * ist eine Geschwindigkeit genau ein Weg je Bild.
 */
export function craneVelocity(
  fromX: number,
  fromZ: number,
  goalX: number,
  goalZ: number,
  dt: number,
): { x: number; z: number } {
  if (!(dt > 0)) return { x: 0, z: 0 };
  const share = 1 - Math.exp(-dt / CRANE_FOLLOW_TAU);
  let x = ((goalX - fromX) * share) / dt;
  let z = ((goalZ - fromZ) * share) / dt;
  const speed = Math.hypot(x, z);
  if (speed > CRANE_MAX_SPEED) {
    x *= CRANE_MAX_SPEED / speed;
    z *= CRANE_MAX_SPEED / speed;
  }
  return { x, z };
}

/** Der Halbmesser des Kreises am Boden unter dem Kran, in Metern. */
export const CRANE_MARK_RADIUS = 0.42;

/**
 * **Wie hoch die Mitte des Getragenen hängt**, im Raum des Rigs — mit der
 * Oberkante an den Klauen, und nie mit der Unterkante im Boden.
 */
export function craneCarryY(half: number): number {
  const top = CRANE_HEIGHT - CRANE_CLAW_DROP;
  return Math.max(top - Math.max(0, half), Math.max(0, half) + 0.05);
}

/** Gelb wie eine Baustelle, dunkel wie Stahl. */
const CRANE_YELLOW = 0xf2b632;
const CRANE_STEEL = 0x3a3f4b;

/**
 * **Die Lage des Krans** im Raum des Rigs — über dem Kopf, mit festem Abstand
 * zum Boden und einem leisen Schweben.
 *
 * Reine Rechnung, damit ein Test sie nachmessen kann: Die Höhe hängt nicht an
 * der Kopfhöhe (sonst sänke der Kran beim Ducken), und die Drehung wächst
 * gleichmäßig mit der Zeit.
 */
export function cranePose(
  headX: number,
  headZ: number,
  time: number,
): { x: number; y: number; z: number; yaw: number } {
  return {
    x: headX,
    y: CRANE_HEIGHT + Math.sin(time * 2) * CRANE_BOB,
    z: headZ,
    yaw: (time * CRANE_SPIN) % (Math.PI * 2),
  };
}

/**
 * **Der Kran als Netz** — Gehäuse, Seil, Nabe und Klauen, alles gebaut.
 *
 * Der Ursprung ist die Mitte des Gehäuses; das Seil hängt darunter, die
 * Klauen spreizen sich unten. Geometrie und Material gehören der Gruppe und
 * gehen mit `disposeCrane`.
 */
export function buildCrane(): THREE.Group {
  const crane = new THREE.Group();
  crane.name = 'player-crane';
  const yellow = new THREE.MeshStandardMaterial({ color: CRANE_YELLOW, roughness: 0.55 });
  const steel = new THREE.MeshStandardMaterial({
    color: CRANE_STEEL,
    roughness: 0.4,
    metalness: 0.6,
  });

  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.16, 24), yellow);
  housing.name = 'crane-housing';
  crane.add(housing);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    yellow,
  );
  cap.position.y = 0.08;
  crane.add(cap);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 8, 32), steel);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.06;
  crane.add(rim);

  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), steel);
  cable.position.y = -0.08 - 0.21;
  crane.add(cable);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), steel);
  hub.position.y = -0.52;
  crane.add(hub);

  const clawShape = new THREE.BoxGeometry(0.03, 0.2, 0.05);
  for (let i = 0; i < CRANE_CLAWS; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i / CRANE_CLAWS) * Math.PI * 2;
    arm.position.y = -0.52;
    const claw = new THREE.Mesh(clawShape, steel);
    // Nach außen gespreizt, unten wieder nach innen — ein offener Greifer.
    claw.position.set(0.07, -0.08, 0);
    claw.rotation.z = 0.45;
    arm.add(claw);
    const tip = new THREE.Mesh(clawShape, yellow);
    tip.scale.set(1, 0.5, 1);
    tip.position.set(0.1, -0.2, 0);
    tip.rotation.z = -0.35;
    arm.add(tip);
    crane.add(arm);
  }
  crane.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) object.castShadow = true;
  });

  // **Die Lotschnur** — von den Klauen bis zum Boden. Von schräg oben steht
  // der Kran sichtbar neben der Stelle, über der er schwebt (die Kamera sieht
  // ihn mit Höhe, den Kreis ohne); die Schnur verbindet beides, damit man
  // nicht raten muss, welcher Kreis zu welchem Kran gehört. Halb durchsichtig
  // und ohne Schatten: eine Auskunft, kein Bauteil.
  const drop = CRANE_HEIGHT - 0.52;
  const plumb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, drop, 8),
    new THREE.MeshBasicMaterial({
      color: CRANE_YELLOW,
      transparent: true,
      opacity: 0.6,
      depthTest: false,
      depthWrite: false,
    }),
  );
  plumb.name = 'crane-plumb';
  // Über dem, was darunter steht: Hinter einer Kiste verschwände sie genau
  // dort, wo sie etwas sagen soll.
  plumb.renderOrder = 9;
  plumb.position.y = -0.52 - drop / 2;
  plumb.raycast = () => undefined;
  crane.add(plumb);
  return crane;
}

/**
 * **Der Kreis am Boden** — wohin der Kran zeigt, solange er über nichts
 * schwebt, das hervorgehoben wird.
 *
 * Ein Ring und ein blasser Innenkreis, flach auf dem Boden, gezeichnet über
 * allem, was dort liegt (`depthTest` aus): Er ist eine Auskunft und kein
 * Ding, und eine Auskunft, die unter einem Teppich verschwindet, gibt keine.
 * Er wirft keinen Schatten und fängt keinen Strahl.
 */
export function buildCraneMark(): THREE.Group {
  const mark = new THREE.Group();
  mark.name = 'crane-mark';
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(CRANE_MARK_RADIUS - 0.05, CRANE_MARK_RADIUS, 40),
    new THREE.MeshBasicMaterial({
      color: CRANE_YELLOW,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
    }),
  );
  const fill = new THREE.Mesh(
    new THREE.CircleGeometry(CRANE_MARK_RADIUS - 0.05, 40),
    new THREE.MeshBasicMaterial({
      color: CRANE_YELLOW,
      transparent: true,
      opacity: 0.18,
      depthTest: false,
      depthWrite: false,
    }),
  );
  for (const flat of [ring, fill]) {
    flat.rotation.x = -Math.PI / 2;
    flat.renderOrder = 10;
    flat.raycast = () => undefined;
    mark.add(flat);
  }
  return mark;
}

/**
 * **Die Teile aus dem Regal** — oben ein Dropship aus der Raumbasis, darunter
 * die hängende Kette aus der Wundertüte, unten ein Haken aus dem
 * Werkzeugkasten. Gewünscht war: _„statt Seil `mixed-bag/chain_hanging_A.glb`
 * nutzen und unten einen Haken — gerne statt dem Kran oben ein anderes
 * passendes Objekt aus KayKit."_
 */
export const CRANE_MODELS = {
  top: 'space-base-bits/dropship.glb',
  chain: 'mixed-bag/chain_hanging_A.glb',
  hook: 'rpg-tools-bits/fishing_hook_A.glb',
} as const;
/**
 * **Das Dropship einmal umgedreht.** In der Datei zeigt seine Nase nach +z,
 * und das ist in three.js **hinten**: Der Kran hängt am Rig und dreht mit der
 * Figur, und so flog er gemeldet „immer in die entgegengesetzte Richtung".
 */
const TOP_TURN = Math.PI;
/** Das Dropship ist 1,5 m lang; als Kran über einer Küche reicht die Hälfte. */
const TOP_SCALE = 0.5;
/** Der Angelhaken ist 27 cm hoch; als Kranhaken doppelt so groß. */
const HOOK_SCALE = 2;
/** Wie weit die Unterseite des Dropships unter dem Ursprung des Krans liegt. */
const TOP_BOTTOM = -0.05;
/** Wie weit Kette und Haken ineinander stecken, damit keine Lücke bleibt. */
const TUCK = 0.03;

/** Lädt ein Modell aus dem Regal — `core/kaykitModel.kaykitModel`, im Test ein Ersatz. */
export type CraneLoader = (path: string) => Promise<THREE.Object3D | null>;

/**
 * **Den gebauten Kran gegen die Teile aus dem Regal tauschen** — sobald alle
 * drei da sind, und nur dann.
 *
 * Bis dahin (und in einem Checkout ohne die gekauften Pakete für immer) steht
 * der gebaute Kran da; ein halber Tausch — Dropship ohne Kette — sähe kaputt
 * aus. Die Kette wird so lang gezogen, dass der Haken genau bei
 * `CRANE_CLAW_DROP` endet: dort hängt, was der Kran trägt, und dafür ist der
 * Haken da. Die Lotschnur geht mit dem gebauten Kran: Die Kette reicht jetzt
 * selbst fast bis zum Kreis am Boden.
 *
 * Die Geometrie der Regalkopien gehört der Vorlage im Speicher und wird beim
 * Abräumen nicht freigegeben (`userData.sharedAssets`, `disposeCrane`).
 *
 * @returns ob getauscht wurde
 */
export async function dressCrane(crane: THREE.Group, load: CraneLoader): Promise<boolean> {
  const [top, chain, hook] = await Promise.all([
    load(CRANE_MODELS.top),
    load(CRANE_MODELS.chain),
    load(CRANE_MODELS.hook),
  ]);
  if (!top || !chain || !hook || !crane.parent) {
    for (const part of [top, chain, hook]) if (part) disposeCrane(part);
    return false;
  }
  const dressed = new THREE.Group();
  dressed.name = 'crane-dressed';
  dressed.userData.sharedAssets = true;

  top.scale.multiplyScalar(TOP_SCALE);
  top.rotation.y += TOP_TURN;
  const topBox = new THREE.Box3().setFromObject(top);
  top.position.y += TOP_BOTTOM - topBox.min.y;
  dressed.add(top);

  hook.scale.multiplyScalar(HOOK_SCALE);
  const hookBox = new THREE.Box3().setFromObject(hook);
  hook.position.y += -CRANE_CLAW_DROP - hookBox.min.y;
  const hookTop = -CRANE_CLAW_DROP + (hookBox.max.y - hookBox.min.y);
  dressed.add(hook);

  const chainBox = new THREE.Box3().setFromObject(chain);
  const span = TOP_BOTTOM + TUCK - (hookTop - TUCK);
  const length = chainBox.max.y - chainBox.min.y;
  if (length > 1e-6) chain.scale.multiplyScalar(span / length);
  const scaledBox = new THREE.Box3().setFromObject(chain);
  chain.position.y += TOP_BOTTOM + TUCK - scaledBox.max.y;
  dressed.add(chain);

  const layers = crane.layers.mask;
  dressed.traverse((object) => {
    object.layers.mask = layers;
    if ((object as THREE.Mesh).isMesh) object.castShadow = true;
  });
  for (const built of [...crane.children]) disposeCrane(built);
  crane.add(dressed);
  return true;
}

/** Gibt frei, was `buildCrane` oder `buildCraneMark` gebaut hat. */
export function disposeCrane(crane: THREE.Object3D): void {
  const seen = new Set<{ dispose(): void }>();
  crane.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!sharedBelow(mesh, crane)) seen.add(mesh.geometry);
    const material = mesh.material;
    for (const one of Array.isArray(material) ? material : [material]) seen.add(one);
  });
  for (const one of seen) one.dispose();
  crane.removeFromParent();
}

/**
 * Ob die Geometrie dieses Netzes einer Vorlage gehört — ein Knoten auf dem
 * Weg nach oben trägt `userData.sharedAssets` (`core/kaykitModel.copyOf`).
 */
function sharedBelow(mesh: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (node.userData.sharedAssets) return true;
    if (node === root) break;
  }
  return false;
}
