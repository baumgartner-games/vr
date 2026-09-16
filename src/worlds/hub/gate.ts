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
 * **Eine Kachel**, seit die Kachel einen Meter misst. Vorher war das Tor drei
 * Meter breit und wurde auf der Kachel um ein Sechstel geschrumpft; dieselbe
 * Rechnung auf einem Meter ergäbe ein Tor von einem Drittel — einen leuchtenden
 * Ring in Kniehöhe, über den man steigt statt hindurchzugehen. Also ist es
 * gleich so gebaut, wie es dasteht: ein Sockel von einer Kachel, ein Durchgang
 * darüber und ein Schild in Lesehöhe. Auf der Werkzeugseite (`tools/main.ts`)
 * steht damit genau dasselbe Tor wie im Hub, und das ist der Sinn dieser Datei.
 */
export const GATE_WIDTH = 1;

/** Wie hoch das Schild über dem Podest hängt. */
const SIGN_Y = 1.95;

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
    new THREE.CylinderGeometry(GATE_WIDTH * 0.43, GATE_WIDTH / 2, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0x1a2338, roughness: 0.7 }),
  );
  base.position.y = 0.06;
  group.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.05, 12, 64),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: new THREE.Color(accent).multiplyScalar(0.6),
      roughness: 0.3,
      metalness: 0.4,
    }),
  );
  ring.position.y = 1.15;
  group.add(ring);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.4, 48),
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
  disc.position.y = 1.15;
  group.add(disc);

  // **Das Schild sieht die Kamera an** (`ui/billboard.ts`) und nicht mehr
  // dorthin, wohin sein Tor gedreht wurde. Ein Tor steht in vier möglichen
  // Richtungen, die Kamera von oben aber immer im Süden: Jedes zweite Tor
  // zeigte ihr die Rückseite seines Schildes. Dagegen lag hier lange eine
  // zweite, flache Tafel auf dem Podest — zwei Tafeln mit demselben Wort, von
  // denen je nach Ansicht eine falsch stand. Eine Tafel, die sich beim
  // Zeichnen ausrichtet, ist in **jeder** Ansicht die richtige: Am Schirm
  // steht sie zur Kamera von oben, in der Brille zum Auge, und schief hängt
  // sie in keiner von beiden.
  const sign = new TextPlane({
    width: 0.95,
    height: 0.31,
    title,
    body: description,
    accent,
    face: true,
  });
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
 * **Hier lag einmal ein zweites, flaches Schild auf dem Podest** — das, was
 * man _von oben_ las, samt `layFlatNorthUp`, das es waagerecht und nach Norden
 * ausgerichtet hinlegte.
 *
 * Es war der Ausweg aus einer Zwickmühle: Die Ansicht _Von oben_ schaut aus
 * fester Richtung schräg von Süden auf die Szene (`core/topDownPose.ts`), ein
 * Tor aber steht in vier möglichen Richtungen, und jedes zweite zeigte der
 * Kamera die Rückseite seines Schildes. Das aufrechte Schild dorthin zu
 * **neigen** schien damals ausgeschlossen, weil es dann gegen sein eigenes Tor
 * verdreht stünde — von innen ein schief hängendes Brett.
 *
 * Das war ein Denkfehler, und er ist es wert, aufgeschrieben zu bleiben:
 * Ausgerichtet wird **je Kamera und beim Zeichnen** (`ui/billboard.ts`), nicht
 * ein für alle Mal in der Szene. Der Spieler in der Brille bekommt das Schild
 * zu **seinem** Auge gedreht und sieht deshalb nie ein schiefes Brett, während
 * dieselbe Tafel am Schirm daneben zur Kamera von oben steht. Damit ist die
 * zweite Tafel nichts als ein zweites Mal dasselbe Wort — und eine davon steht
 * in jeder Ansicht falsch.
 */

/** Alle Tore, die in diesem Baum hängen — in der Reihenfolge, in der sie stehen. */
export function gatesIn(root: THREE.Object3D): Gate[] {
  const out: Gate[] = [];
  root.traverse((one) => {
    const gate = one.userData.gate as Gate | undefined;
    if (gate) out.push(gate);
  });
  return out;
}
