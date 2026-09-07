import * as THREE from 'three';
import { GRAB_GLOW, GRAB_TINT } from '../../core/colors';

/**
 * **Man selbst, klein, im Modell** — und man kann sich nehmen und woanders
 * hinstellen.
 *
 * Ein Grundriss beantwortet zwei Fragen, und die zweite vergisst jeder Editor:
 * *Was steht wo?* — und *wo stehe eigentlich ich?* Ohne die Antwort darauf ist
 * eine Miniatur eine Zeichnung; mit ihr ist sie eine **Karte**, denn eine
 * Karte hat einen Punkt „Sie sind hier". Und weil man sie anfassen kann, ist
 * sie gleichzeitig der Weg dorthin: Wer die Figur ans andere Ende des Gangs
 * stellt, steht am anderen Ende des Gangs.
 *
 * Gebaut wird sie in **Planmetern** und nicht in Zentimetern: Sie hängt in der
 * Miniatur, die Miniatur trägt den Maßstab, und damit ist die Figur bei jedem
 * Maßstab genau so groß wie ein Mensch im Grundriss. Eine Figur mit einer
 * eigenen Größe müsste bei jedem Zoom nachgerechnet werden und wäre einmal zu
 * klein zum Treffen und einmal größer als das Zimmer, in dem sie steht.
 *
 * Der Kegel vorn ist keine Zierde: Eine Kapsel sagt nicht, wohin sie schaut,
 * und die Blickrichtung ist die halbe Auskunft, wenn man sich in einen Gang
 * stellt.
 */

/** Wie groß ein Mensch im Plan ist, in Metern. */
export const PIN_HEIGHT = 1.7;
const BODY_R = 0.22;

export class PlayerPin extends THREE.Group {
  private readonly body: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly head: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

  constructor() {
    super();
    this.name = 'editor-player-pin';

    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(BODY_R, PIN_HEIGHT * 0.45, 6, 12),
      new THREE.MeshStandardMaterial({
        color: GRAB_TINT,
        roughness: 0.5,
        emissive: new THREE.Color(GRAB_TINT),
        emissiveIntensity: 0.35,
      }),
    );
    this.body.position.y = PIN_HEIGHT * 0.45;
    this.add(this.body);

    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(BODY_R * 0.95, 14, 10),
      new THREE.MeshStandardMaterial({
        color: 0xf2f6ff,
        roughness: 0.6,
        emissive: new THREE.Color(0x9fd6ff),
        emissiveIntensity: 0.25,
      }),
    );
    this.head.position.y = PIN_HEIGHT * 0.86;
    this.add(this.head);

    // Die Nase: wohin man schaut. Sie zeigt nach −Z, wie jede Blickrichtung in
    // diesem Projekt.
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(BODY_R * 0.55, BODY_R * 1.6, 10),
      new THREE.MeshStandardMaterial({ color: GRAB_GLOW, roughness: 0.4, toneMapped: false }),
    );
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, PIN_HEIGHT * 0.86, -BODY_R * 1.3);
    this.add(nose);

    // Ein Ring auf dem Boden: Bei kleinem Maßstab verschwindet die Figur fast,
    // ihr Fußabdruck bleibt sichtbar — und er sagt, auf welcher Kachel sie steht.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(BODY_R * 1.5, BODY_R * 1.9, 24),
      new THREE.MeshBasicMaterial({
        color: GRAB_GLOW,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.add(ring);
  }

  /** Angefasst: Die Figur leuchtet, damit man sieht, dass man sie hat. */
  setHeld(held: boolean): void {
    this.body.material.emissiveIntensity = held ? 1 : 0.35;
    this.head.material.emissiveIntensity = held ? 0.8 : 0.25;
  }

  // Ein eigenes `dispose` hat sie nicht, und das ist Absicht: Sie hängt in der
  // Miniatur, und die wird bei jedem Umbau ganz geleert (`EditorWorld.clear`,
  // `shared/environment.ts`, `disposeTree`). Zwei Wege, dieselbe Geometrie
  // freizugeben, sind einer zu viel.
}
