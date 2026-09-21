import * as THREE from 'three';

/**
 * **Die Heizdecke** — ein Ding aus dem Beutel, das man jemandem *abnimmt*.
 *
 * Sie ist da, weil die erste Aktion, die ein Charakter lernen sollte, „die
 * Heizdecke von der Übungspuppe nehmen" war (`worlds/npc/Puppeteer.ts`): ein
 * Ding, das auf etwas liegt, das man mit einer Hand fasst und wegzieht, und
 * bei dem man hinterher **sieht**, dass etwas passiert ist. Ein Würfel liegt
 * nach dem Abspielen irgendwo; eine Decke liegt neben der Puppe, und die
 * Puppe ist frei.
 *
 * **Gebaut ist sie als gefaltete Decke und nicht als Tuch**: ein flacher
 * Kasten mit Steppnähten, ein Regler mit Kabel an der Ecke. Ein Tuch, das
 * sich über einen Körper legt, wäre Stoffsimulation — und die kostet in der
 * Brille mehr als alles andere in diesem Raum zusammen. Ein Kasten, sechs
 * Zentimeter dick, liegt auf einer Puppe wie eine zusammengelegte Decke auf
 * einem Patienten: Man sieht, was gemeint ist, und die Physik kann ihn
 * tragen, kippen und fallen lassen wie eine Planke.
 *
 * Die Maße sind die einer Einpersonen-Heizdecke: 1,50 × 0,80 m. Als Collider
 * dient der ganze Kasten; die Steppnähte sind aufgesetzt und zählen nicht.
 */

/** Außenmaße: Länge, Dicke, Breite — in Metern. */
export const BLANKET_SIZE = new THREE.Vector3(1.5, 0.06, 0.8);

/** Warmes Rot-Orange — eine Decke, der man ansieht, dass sie heizt. */
const CLOTH = 0xd9573b;
const SEAM = 0xa83f2a;
const CONTROL = 0x2b3448;
const CORD = 0x1c2230;

/** Wie viele Steppnähte quer über die Decke laufen. */
const SEAMS = 4;

export function buildHeatedBlanket(): THREE.Mesh {
  const cloth = new THREE.MeshStandardMaterial({ color: CLOTH, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(BLANKET_SIZE.x, BLANKET_SIZE.y, BLANKET_SIZE.z),
    cloth,
  );
  mesh.name = 'prop-blanket';

  // Die Steppnähte: flache Streifen auf beiden Seiten, ein Hauch über dem
  // Stoff, damit sie nicht mit ihm flimmern.
  const seam = new THREE.MeshStandardMaterial({ color: SEAM, roughness: 1, metalness: 0 });
  const seamGeometry = new THREE.BoxGeometry(0.012, 0.004, BLANKET_SIZE.z * 0.96);
  for (let i = 0; i < SEAMS; i++) {
    const x = (-0.5 + (i + 1) / (SEAMS + 1)) * BLANKET_SIZE.x;
    for (const side of [-1, 1] as const) {
      const stripe = new THREE.Mesh(seamGeometry, seam);
      stripe.name = 'prop-blanket-seam';
      stripe.position.set(x, (side * BLANKET_SIZE.y) / 2, 0);
      mesh.add(stripe);
    }
  }

  // Der Regler mit dem Kabel, an einer Ecke — daran erkennt man die Heizdecke
  // von der Wolldecke.
  const control = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.02, 0.09),
    new THREE.MeshStandardMaterial({ color: CONTROL, roughness: 0.6, metalness: 0.2 }),
  );
  control.name = 'prop-blanket-control';
  control.position.set(BLANKET_SIZE.x * 0.42, BLANKET_SIZE.y / 2 + 0.01, BLANKET_SIZE.z * 0.38);
  mesh.add(control);
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6),
    new THREE.MeshStandardMaterial({ color: CORD, roughness: 0.8, metalness: 0.1 }),
  );
  cord.name = 'prop-blanket-cord';
  cord.rotation.z = Math.PI / 2;
  cord.position.set(BLANKET_SIZE.x * 0.42 + 0.1, BLANKET_SIZE.y / 2 + 0.006, BLANKET_SIZE.z * 0.38);
  mesh.add(cord);
  return mesh;
}
