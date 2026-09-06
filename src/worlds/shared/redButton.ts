import * as THREE from 'three';
import { TextPlane } from '../../ui/TextPlane';

/**
 * **Ein großer roter Knopf auf einer Säule** — zum Antippen oder Anzielen.
 *
 * Ein Knopf ist das ehrlichste Bedienelement, das eine Welt hat: er steht da,
 * man sieht ihn von weitem, man drückt ihn, und es passiert genau eine Sache.
 * Im Effektlabor ist so einer die Mitte des Raums; in den Alpen holt er einen
 * aus dem Tal zurück auf die Rampe. Damit die beiden nicht auseinanderlaufen
 * — und damit die nächste Welt, die einen braucht, ihn nicht ein drittes Mal
 * baut —, steht er hier: Säule, Kragen, Kuppel und ein Schild, das sagt, was
 * er tut.
 *
 * Was der Knopf **auslöst**, weiß er nicht; das bleibt Sache der Welt, die ihn
 * hinstellt und seine Kuppel beim Zeiger anmeldet.
 */

/** Höhe der Säule: der Knopf liegt damit auf Hüfthöhe. */
const PEDESTAL_H = 0.95;
/** Halbmesser der Kuppel. */
const DOME_R = 0.17;
/** Wie tief der Knopf beim Drücken eintaucht und wie lange er unten bleibt. */
const PRESS_DEPTH = 0.035;
const PRESS_TIME = 0.14;

const RED = 0xff3b2f;
const RED_GLOW = 0x400a06;
const RED_HOT = 0x992218;

export interface RedButton {
  /** Alles zusammen — die Welt hängt es dorthin, wo der Knopf stehen soll. */
  group: THREE.Group;
  /** Die Kuppel: das Ziel für den Zeiger und das, was sich beim Drücken bewegt. */
  dome: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  /** Drückt den Knopf sichtbar ein — der Rest ist Sache der Welt. */
  press(): void;
  /** Der Zeiger liegt darauf, oder eben nicht. */
  hover(on: boolean): void;
  /** Lässt den Knopf wieder hochkommen. */
  update(dt: number): void;
  dispose(): void;
}

/**
 * Baut den Knopf mit seinem Schild.
 *
 * Das Schild steht auf +Z: die Welt dreht die Gruppe so, dass diese Seite dem
 * entgegensieht, der auf den Knopf zukommt.
 */
export function buildRedButton(options: { title: string; body?: string }): RedButton {
  const group = new THREE.Group();
  group.name = 'red-button';

  const metal = new THREE.MeshStandardMaterial({
    color: 0x8b93a4,
    roughness: 0.45,
    metalness: 0.55,
  });

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, PEDESTAL_H, 20), metal);
  column.position.y = PEDESTAL_H / 2;
  group.add(column);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24), metal);
  top.position.y = PEDESTAL_H + 0.03;
  group.add(top);

  // Der Kragen um den Knopf: er zeigt, wo der Knopf aufhört, ohne dass es
  // dafür eine Textur braucht.
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(DOME_R + 0.03, 0.022, 10, 28),
    new THREE.MeshStandardMaterial({ color: 0xffc857, roughness: 0.6 }),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = PEDESTAL_H + 0.07;
  group.add(collar);

  const restY = PEDESTAL_H + 0.06;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(DOME_R, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: RED,
      roughness: 0.35,
      emissive: new THREE.Color(RED_GLOW),
    }),
  );
  dome.name = 'red-button-dome';
  dome.position.y = restY;
  group.add(dome);

  const sign = new TextPlane({
    width: 1.1,
    height: 0.4,
    title: options.title,
    body: options.body,
    align: 'center',
    accent: RED,
  });
  // Über dem Knopf und leicht zurückgelehnt: von vorn lesbar, ohne dem
  // drückenden Arm im Weg zu stehen.
  sign.position.set(0, PEDESTAL_H + 0.62, -0.02);
  sign.rotation.x = 0.12;
  group.add(sign);

  let pressed = 0;

  return {
    group,
    dome,
    press: () => {
      pressed = PRESS_TIME;
      dome.position.y = restY - PRESS_DEPTH;
    },
    hover: (on: boolean) => dome.material.emissive.setHex(on ? RED_HOT : RED_GLOW),
    update: (dt: number) => {
      if (pressed <= 0) return;
      pressed = Math.max(0, pressed - dt);
      dome.position.y = restY - PRESS_DEPTH * (pressed / PRESS_TIME);
    },
    dispose: () => sign.dispose(),
  };
}
