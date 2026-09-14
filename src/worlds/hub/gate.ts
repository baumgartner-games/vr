import * as THREE from 'three';
import { TextPlane } from '../../ui/TextPlane';

/**
 * **Das Tor** — Podest, Ring in der Akzentfarbe, wirbelnde Scheibe, Schild.
 *
 * Es steht in einer eigenen Datei, weil es an **drei** Stellen gebraucht wird
 * und an keiner davon zu Hause ist: im Hub (als Einbau auf einer Kachel,
 * `grid/fixtures/gate.ts`), auf der Werkzeugseite (als Bild einer Welt, die
 * sich nicht ohne Spiel bauen lässt, `tools/main.ts`) und in der Vorschau
 * derselben Seite. Vorher stand es in `HubWorld.ts`, und die Werkzeugseite
 * importierte es von dort — eine Seite, die aus der Startwelt heraus ein Möbel
 * holt, ist genau die Abhängigkeit, die beim nächsten Umbau der Startwelt
 * reißt. Und eine Seite mit eigenen, hübscheren Toren zeigte irgendwann etwas
 * anderes als das Spiel.
 *
 * **Es schaut nach +Z**, und das ist die eine Stelle, an der es aus der Reihe
 * tanzt: Bausteine auf dem Gitter werden nach Norden gebaut (−Z) und danach
 * gedreht, das Tor dagegen steht seit jeher andersherum — sein Schild liegt
 * vor der Scheibe, und „vor" hieß hier immer +Z. Umdrehen hieße, das Bild auf
 * der Werkzeugseite mitzudrehen, wo dasselbe Tor freistehend gezeigt wird.
 * Wer es auf eine Kachel stellt, dreht deshalb um eine halbe Umdrehung mehr
 * (`GATE_FACES`, `fixtures/gate.ts`).
 */
export interface Gate {
  group: THREE.Group;
  ring: THREE.Mesh;
  disc: THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>;
  sign: TextPlane;
  /** Die Welt dahinter (`worlds/index.ts`) — wer es aufstellt, trägt sie ein. */
  worldId: string;
}

/**
 * **Wie breit ein Tor baut**, in Metern: der Durchmesser seines Sockels.
 *
 * Die Zahl steht hier, weil das Gitter sie braucht: Eine Kachel ist 2,5 m, das
 * Tor ist 3 m breit, und auf einer Kachel steht es deshalb ein Stück kleiner
 * (`fixtures/gate.ts`) — sonst ragte sein Sockel in die Nachbarkachel und in
 * die Wand dahinter.
 */
export const GATE_WIDTH = 3;

/** Wie hoch das Schild über dem Podest hängt. */
const SIGN_Y = 2.55;

/**
 * Um wie viel ein Tor gegenüber der Gitterregel verdreht ist — eine halbe
 * Umdrehung, siehe oben. Als Konstante und nicht als `+ Math.PI` an der
 * Aufrufstelle: Ein nacktes Pi in einer Drehung ist genau die Zeile, die beim
 * nächsten Lesen niemand mehr erklären kann.
 */
export const GATE_FACES = Math.PI;

/**
 * Ein Tor bauen. `title` und `description` stehen auf dem Schild, `accent` ist
 * die Farbe von Ring, Scheibe und Rahmen.
 */
export function buildGate(title: string, description: string, accent: number): Gate {
  const group = new THREE.Group();
  group.name = `gate:${title}`;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, GATE_WIDTH / 2, 0.16, 32),
    new THREE.MeshStandardMaterial({ color: 0x1a2338, roughness: 0.7 }),
  );
  base.position.y = 0.08;
  group.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.07, 12, 64),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: new THREE.Color(accent).multiplyScalar(0.6),
      roughness: 0.3,
      metalness: 0.4,
    }),
  );
  ring.position.y = 1.35;
  group.add(ring);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.02, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(accent) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float a = atan(p.y, p.x);
          float swirl = sin(a * 3.0 + uTime * 1.4 - r * 7.0) * 0.5 + 0.5;
          float glow = smoothstep(1.0, 0.25, r);
          float alpha = glow * (0.35 + swirl * 0.45);
          gl_FragColor = vec4(uColor * (0.6 + swirl * 0.8), alpha);
        }
      `,
    }),
  );
  disc.position.y = 1.35;
  group.add(disc);

  const sign = new TextPlane({ width: 1.9, height: 0.62, title, body: description, accent });
  sign.position.set(0, SIGN_Y, 0.02);
  group.add(sign);

  const gate: Gate = { group, ring, disc, sign, worldId: '' };
  // **Das Tor hängt an seiner eigenen Gruppe.** Damit findet es wieder, wer
  // nur den Baum hat und nicht die Liste — die Vorschau der Werkzeugseite
  // (`gatesIn`) dreht so die Ringe, ohne die Einbauten des Hubs zu kennen.
  group.userData.gate = gate;
  return gate;
}

/**
 * **Ein Tor bewegen** — der Ring dreht sich, die Scheibe wirbelt, das Schild
 * atmet.
 *
 * Eine Funktion und nicht drei Zeilen an jeder Aufrufstelle: Sie stand in der
 * Welt, in der Vorschau und auf der Werkzeugseite je einmal, und die drei
 * liefen schon auseinander (auf der Seite drehte sich jeder Ring in dieselbe
 * Richtung, in der Welt jeder zweite andersherum).
 *
 * `index` ist nur dafür da: Benachbarte Tore sollen nicht im Gleichschritt
 * wirbeln.
 */
export function spinGate(gate: Gate, time: number, index = 0): void {
  gate.disc.material.uniforms.uTime!.value = time;
  gate.ring.rotation.z = time * 0.25 * (index % 2 === 0 ? 1 : -1);
  gate.sign.position.y = SIGN_Y + Math.sin(time * 1.2 + index) * 0.03;
}

/**
 * **Das flache Schild auf dem Podest** — das, was man _von oben_ liest.
 *
 * Die Ansicht _Von oben_ schaut aus fester Richtung schräg von Süden auf die
 * Szene (`core/topDownPose.ts`), das Tor aber steht in vier möglichen
 * Richtungen: Wer nach Norden schaut, zeigt der Kamera die Rückseite seines
 * Schildes. Zwei Auswege standen zur Wahl, und dieser ist der, der in der
 * Brille nichts kaputt macht. Das aufrechte Schild zur Kamera zu **neigen**
 * hieße, es gegen sein eigenes Tor zu verdrehen — von innen sähe man ein
 * schief hängendes Brett. Ein **zweites, flaches** Schild dagegen liegt einfach
 * da: von oben lesbar, von unten ein Streifen auf dem Podest.
 *
 * In die Waagerechte legt es `layFlatNorthUp`; hier entsteht nur die Tafel.
 */
export function gateFloorSign(title: string, accent: number): TextPlane {
  return new TextPlane({
    width: 1.9,
    height: 0.62,
    title,
    align: 'center',
    accent,
    // Kräftiger als am aufrechten Schild: Was flach auf dem Boden liegt, sieht
    // man im streifenden Licht sonst kaum.
    background: 'rgba(9, 14, 26, 0.94)',
  });
}

/**
 * **Eine Tafel so hinlegen, dass sie nach Norden oben liest** — auch wenn die
 * Gruppe, in der sie hängt, um `yaw` gedreht ist.
 *
 * Erst flach (`x`), dann in der Ebene zurück (`z`): In der Reihenfolge, in der
 * three.js einen Euler abarbeitet (`XYZ`), ist `z` die Drehung *in* der Tafel
 * und `y` wäre eine um die Hochachse davor — und die stünde nach dem Umlegen
 * quer. Wer das verwechselt, hat ein Schild, das in drei von vier Richtungen
 * seitlich liest.
 */
export function layFlatNorthUp(plane: THREE.Object3D, yaw: number): void {
  plane.rotation.set(-Math.PI / 2, 0, -yaw);
}

/** Alle Tore, die in diesem Baum hängen — in der Reihenfolge, in der sie stehen. */
export function gatesIn(root: THREE.Object3D): Gate[] {
  const out: Gate[] = [];
  root.traverse((one) => {
    const gate = one.userData.gate as Gate | undefined;
    if (gate) out.push(gate);
  });
  return out;
}
