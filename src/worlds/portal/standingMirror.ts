import * as THREE from 'three';
import { MirrorSurface } from '../shared/Mirror';

/**
 * Der **Standspiegel**: Rahmen zwischen zwei Pfosten auf einem Fuß.
 *
 * Er ist ein Gegenstand aus dem Beutel und kein Werkzeug, und das ist eine
 * Entscheidung und kein Zufall. Ein Werkzeug ist etwas, das man **benutzt** —
 * es hat einen Trigger, es tut etwas, es liegt in der Hand. Ein Standspiegel
 * tut nichts: Er steht herum, man schiebt ihn dorthin, wo man ihn braucht,
 * und stellt sich davor. Genau das ist ein Ding aus dem Beutel — es hat einen
 * Körper, es fällt um, man kann es tragen und werfen, und die anderen in der
 * Sitzung sehen es an derselben Stelle stehen wie man selbst. Die Staffelei
 * (das nächstliegende Vorbild) ist nur deshalb ein Werkzeug, weil sie
 * ausdrücklich **kein** Hindernis sein darf: Man muss mit der Pinselspitze
 * durch sie hindurchgreifen können. Bei einem Spiegel will man das Gegenteil.
 */

/** Außenmaße: so hoch, dass man sich ganz darin sieht. */
export const MIRROR_WIDTH = 0.66;
export const MIRROR_HEIGHT = 1.65;
export const MIRROR_DEPTH = 0.3;

/** Das Glas selbst — Kopf bis Fuß, sobald man zwei Schritte zurücktritt. */
export const GLASS_WIDTH = 0.5;
export const GLASS_HEIGHT = 1.34;

const FOOT_HEIGHT = 0.05;
const POST = 0.055;
const FRAME = 0.03;
const BACKING = 0.022;

/** Messing für den Rahmen, dunkles Holz für Fuß und Pfosten. */
const BRASS = 0xc9a25e;
const WOOD = 0x53381f;

/**
 * Baut ihn auf: Wurzel ist der **Fuß**, alles andere hängt daran.
 *
 * Der Ursprung liegt in der Mitte des Ganzen und nicht am Boden — ein Ding aus
 * dem Beutel dreht sich um seinen Ursprung, und einer im Fuß ließe den
 * Spiegel beim Umfallen um seine eigene Kante wirbeln.
 */
export function buildStandingMirror(): THREE.Mesh {
  const brass = new THREE.MeshStandardMaterial({ color: BRASS, roughness: 0.38, metalness: 0.5 });
  const wood = new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.8, metalness: 0.05 });

  const foot = new THREE.BoxGeometry(MIRROR_WIDTH, FOOT_HEIGHT, MIRROR_DEPTH);
  foot.translate(0, -MIRROR_HEIGHT / 2 + FOOT_HEIGHT / 2, 0);
  const mesh = new THREE.Mesh(foot, wood);
  mesh.name = 'prop-mirror';

  // Die beiden Pfosten und die Querlatte darüber — der Bügel, in dem der
  // Rahmen hängt.
  const postHeight = MIRROR_HEIGHT - FOOT_HEIGHT;
  const postX = MIRROR_WIDTH / 2 - POST / 2;
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(POST, postHeight, POST * 1.3), wood);
    post.position.set(side * postX, -MIRROR_HEIGHT / 2 + FOOT_HEIGHT + postHeight / 2, 0);
    mesh.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(MIRROR_WIDTH - POST, POST, POST * 1.3), wood);
  rail.position.y = MIRROR_HEIGHT / 2 - POST / 2;
  mesh.add(rail);

  // Die Rückwand des Rahmens: Ein Spiegel ist von hinten kein Fenster.
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(GLASS_WIDTH + FRAME * 2, GLASS_HEIGHT + FRAME * 2, BACKING),
    brass,
  );
  back.position.z = -BACKING / 2;
  mesh.add(back);

  const glass = new MirrorSurface(GLASS_WIDTH, GLASS_HEIGHT);
  glass.position.z = 0.001;
  mesh.add(glass);

  return mesh;
}
