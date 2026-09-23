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
/** Wie schnell es sich um sich selbst dreht, im Bogenmaß je Sekunde. */
export const CRANE_SPIN = 0.5;
/** Wie viele Klauen — drei greifen, und drei haben kein Vorn. */
export const CRANE_CLAWS = 3;

/**
 * **Wie tief die Klauen reichen**, in Metern unter dem Gehäuse — dort hängt,
 * was der Kran trägt (`craneCarryY`).
 */
export const CRANE_CLAW_DROP = 0.8;

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

/** Gibt frei, was `buildCrane` oder `buildCraneMark` gebaut hat. */
export function disposeCrane(crane: THREE.Object3D): void {
  const seen = new Set<{ dispose(): void }>();
  crane.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    seen.add(mesh.geometry);
    const material = mesh.material;
    for (const one of Array.isArray(material) ? material : [material]) seen.add(one);
  });
  for (const one of seen) one.dispose();
  crane.removeFromParent();
}
