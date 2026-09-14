import * as THREE from 'three';
import { HEAD_RADIUS } from './avatarLook';

/**
 * **Was man auf dem Kopf trägt** — die erste Sorte Kleidung in diesem Projekt.
 *
 * Bis hierher sahen alle gleich aus: derselbe Körper aus Kapseln, dieselbe
 * Farbe nach Gerät, ein schwarzes Visier vorn (`core/AvatarBody.ts`). Das ist
 * für eine Werkstatt in Ordnung und für eine Sitzung mit drei Leuten nicht —
 * wer sich unterscheiden will, hat bisher nur seinen Namen dafür.
 *
 * Angefangen wird **oben**, und zwar aus zwei Gründen. Der eine ist der
 * einfachste: Ein Kopf ist das, was man von einem anderen Spieler zuerst
 * sieht, und in VR schaut man ohnehin ständig auf Köpfe. Der andere ist der
 * bessere: Ein Helm ist nicht nur Schmuck, sondern ein **Mittel gegen
 * Übelkeit**. Wer im Gokart einen aufsetzt, hat den Rand seines Visiers fest
 * im Blick, während die Welt darin schwenkt — das Auge bekommt wieder etwas,
 * das stillsteht (`visorFrame`).
 *
 * Deshalb liefert diese Datei zwei Dinge, die zusammengehören und trotzdem
 * getrennt sind:
 *
 * - `buildHeadgear` — was **die anderen** auf deinem Kopf sehen. Es hängt am
 *   Kopf des Avatars und wird mit ihm ausgeblendet, sobald man in den eigenen
 *   Augen steckt.
 * - `visorFrame` — was **du selbst** siehst: der Rand desselben Helms, von
 *   innen, an der Kamera. Es gibt ihn nur zum Helm, denn eine Mütze hat keinen
 *   Rand im Blickfeld.
 *
 * Maße im Rahmen des Kopfes: Der Kopf ist eine **Kugel** von 32 cm Durchmesser
 * um den Ursprung (`avatarLook.HEAD_RADIUS`), und **−z ist vorn**. Wer hier
 * etwas anbaut, rechnet von dort — und zwar mit `dome()`, statt drei Zahlen zu
 * raten: Auf einer Kugel ist der Halbmesser eine Funktion der Höhe, und ein
 * Hut, der das nicht mitrechnet, lässt den Kopf an den Seiten herausschauen.
 *
 * Nichts sitzt tiefer als **7 cm über der Kopfmitte**, außer der Helm, der den
 * ganzen Kopf einschließt: Darunter liegen die Augen, und eine Mütze, die
 * jemandem über die Augen rutscht, sieht nicht nach Mütze aus, sondern nach
 * Fehler.
 */

/** Was es zu tragen gibt. `none` ist ausdrücklich einer davon. */
export type HeadgearKind =
  'none' | 'chef' | 'cap' | 'helmet' | 'hardhat' | 'beanie' | 'tophat' | 'crown';

export const HEADGEAR_KINDS: readonly HeadgearKind[] = [
  'none',
  'chef',
  'cap',
  'helmet',
  'hardhat',
  'beanie',
  'tophat',
  'crown',
];

export const HEADGEAR_LABELS: Record<HeadgearKind, string> = {
  none: 'Ohne',
  chef: 'Kochmütze',
  cap: 'Basecap',
  helmet: 'Helm',
  hardhat: 'Bauhelm',
  beanie: 'Mütze',
  tophat: 'Zylinder',
  crown: 'Krone',
};

export const HEADGEAR_SUBS: Record<HeadgearKind, string> = {
  none: 'Barhäuptig — so war es immer',
  chef: 'Hoch, weiß, mit Wulst — das Vorbild',
  cap: 'Schirm nach vorn',
  helmet: 'Integralhelm mit Visier — im Gokart auch von innen zu sehen',
  hardhat: 'Gelb, mit Krempe ringsum',
  beanie: 'Strickmütze mit Bommel',
  tophat: 'Hoch, schwarz, mit Band',
  crown: 'Für den, der die Bestzeit hat',
};

/** Die nächste Kopfbedeckung, oben wieder von vorn. */
export function nextHeadgear(kind: HeadgearKind): HeadgearKind {
  const index = HEADGEAR_KINDS.indexOf(kind);
  return HEADGEAR_KINDS[(index + 1) % HEADGEAR_KINDS.length]!;
}

/** Ob eine Zeichenkette eine Kopfbedeckung benennt — alles andere ist `none`. */
export function asHeadgear(value: unknown): HeadgearKind {
  return HEADGEAR_KINDS.includes(value as HeadgearKind) ? (value as HeadgearKind) : 'none';
}

function solid(color: number, roughness = 0.7, metalness = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/**
 * **Die Kuppe, die dem runden Kopf ab der Höhe `base` aufsitzt.**
 *
 * Auf einer Kugel hängt der Halbmesser von der Höhe ab: Wer eine Mütze mit
 * einem festen Halbmesser auf einen runden Kopf setzt, hat entweder unten eine
 * Lücke oder oben eine Beule. Hier wird der Halbmesser an der Ansatzhöhe
 * ausgerechnet und `margin` dazugegeben — die Halbkugel liegt dann überall
 * über dem Kopf, weil sie von ihrer Ansatzhöhe an schneller fällt als er.
 */
function dome(base: number, margin: number): { radius: number; y: number } {
  const radius = Math.sqrt(Math.max(HEAD_RADIUS * HEAD_RADIUS - base * base, 1e-4)) + margin;
  return { radius, y: base };
}

/** Eine solche Halbkugel als Netz. */
function domeMesh(
  base: number,
  margin: number,
  material: THREE.Material,
  theta = Math.PI / 2,
): THREE.Mesh {
  const { radius, y } = dome(base, margin);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 18, 12, 0, Math.PI * 2, 0, theta),
    material,
  );
  mesh.position.y = y;
  return mesh;
}

/**
 * **Der Hut auf dem Kopf** — oder `null`, wenn keiner getragen wird.
 *
 * Aus Zylindern, Kugeln und Quadern wie alles hier: Dieses Projekt lädt keine
 * Modelldateien, und ein Helm aus vier Grundkörpern steht in derselben Sekunde
 * da wie der Rest der Welt.
 *
 * @param tint Farbe des Anzugs — was sich danach richtet, tut es hier auch,
 *   damit ein Spieler eine Farbe hat und nicht drei.
 */
export function buildHeadgear(kind: HeadgearKind, tint = 0x3f6fb5): THREE.Group | null {
  if (kind === 'none') return null;
  const group = new THREE.Group();
  group.name = `headgear-${kind}`;

  switch (kind) {
    case 'chef': {
      // Die Kochmütze: Band, Rohr, Wulst. Sie ist absichtlich hoch — von
      // schräg oben ist sie das, was eine Figur als Koch erkennbar macht,
      // und sie überragt dabei jeden anderen Hut im Regal.
      const linen = solid(0xf7f5ef, 0.9);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.155, 0.055, 22), linen);
      band.position.y = 0.1;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.142, 0.12, 22), linen);
      tube.position.y = 0.185;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14), linen);
      puff.scale.set(1.15, 0.85, 1.15);
      puff.position.y = 0.275;
      group.add(band, tube, puff);
      break;
    }
    case 'cap': {
      const cloth = solid(tint, 0.8);
      const shell = domeMesh(0.085, 0.012, cloth);
      shell.scale.set(1, 1, 1.06);
      const peak = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.014, 0.105), cloth);
      peak.position.set(0, 0.095, -0.205);
      peak.rotation.x = 0.14;
      group.add(shell, peak);
      break;
    }
    case 'helmet': {
      // Der Integralhelm schließt den ganzen Kopf ein — er ist der einzige,
      // der unter die Augen reicht, und muss deshalb über Nase und Augen
      // hinauskommen, die aus der Kugel herausstehen.
      const paint = solid(tint, 0.35, 0.3);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.205, 22, 16), paint);
      shell.scale.set(1, 1.03, 1.04);
      shell.position.y = -0.012;
      const visor = new THREE.Mesh(
        new THREE.SphereGeometry(0.208, 22, 12, -0.9, 1.8, 1.05, 0.62),
        new THREE.MeshStandardMaterial({ color: 0x121722, roughness: 0.12, metalness: 0.6 }),
      );
      visor.scale.copy(shell.scale);
      visor.position.y = shell.position.y;
      visor.rotation.y = Math.PI;
      const chin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.055, 0.055), paint);
      chin.position.set(0, -0.145, -0.175);
      group.add(shell, visor, chin);
      break;
    }
    case 'hardhat': {
      const plastic = solid(0xffc857, 0.55);
      const shell = domeMesh(0.075, 0.026, plastic);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.014, 24), plastic);
      brim.position.y = 0.079;
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.036, 0.26), solid(0xe8a92f, 0.55));
      ridge.position.y = 0.215;
      group.add(shell, brim, ridge);
      break;
    }
    case 'beanie': {
      const knit = solid(0xc2543f, 0.95);
      const shell = domeMesh(0.075, 0.014, knit);
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.042, 20),
        solid(0xa8422f, 0.95),
      );
      band.position.y = 0.086;
      const bobble = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 8), solid(0xf0e6d2, 0.95));
      bobble.position.y = 0.252;
      group.add(shell, band, bobble);
      break;
    }
    case 'tophat': {
      const felt = solid(0x14161d, 0.85);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.016, 24), felt);
      brim.position.y = 0.1;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.15, 0.21, 24), felt);
      tube.position.y = 0.215;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.151, 0.153, 0.036, 24),
        solid(0x8c2f3c, 0.8),
      );
      band.position.y = 0.125;
      group.add(brim, tube, band);
      break;
    }
    case 'crown': {
      const gold = solid(0xe8c14a, 0.3, 0.75);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.055, 20), gold);
      ring.position.y = 0.118;
      group.add(ring);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.07, 8), gold);
        spike.position.set(Math.sin(angle) * 0.135, 0.18, Math.cos(angle) * 0.135);
        group.add(spike);
      }
      break;
    }
  }

  return group;
}

/**
 * **Der Helm von innen** — der Rand, der im eigenen Blickfeld stehen bleibt.
 *
 * Das ist der Teil, um den es beim Fahren wirklich geht. Übelkeit in VR kommt
 * daher, dass das Auge eine Bewegung sieht, die das Innenohr nicht meldet; das
 * bewährteste Gegenmittel ist, dem Auge etwas zu geben, das sich **nicht**
 * bewegt — die eigene Nase, ein Cockpit, ein Visierrand. Der hier hängt an der
 * Kamera, steht also bei jeder Kurve bombenfest, und verengt das Bild an den
 * Rändern genau so weit, dass die schnelle Bewegung dort nicht mehr auffällt.
 *
 * Gebaut ist er als **Ring vor dem Auge**: ein Kreisring aus zwei Radien,
 * dessen Loch der Ausschnitt des Visiers ist. Aus einem halben Meter Abstand
 * lässt der innere Radius rund 90° Blickfeld frei — die Mitte des Bildes bleibt
 * also vollständig, außen wird es dunkel.
 *
 * Er ist ausdrücklich **kein** Teil der Kopfbedeckung, die andere sehen: Von
 * außen ist ein Helm eine Schale, von innen ein Rahmen, und die beiden haben
 * außer dem Namen nichts miteinander zu tun.
 */
export function visorFrame(): THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> {
  const frame = new THREE.Mesh(
    // Innen 0,5 m auf 0,5 m Abstand: gut 90° freies Blickfeld. Außen weit
    // genug, dass der Ring auch am Bildrand nicht aufhört.
    new THREE.RingGeometry(0.5, 2.4, 48, 1),
    new THREE.MeshBasicMaterial({ color: 0x0b0e14, side: THREE.DoubleSide, depthTest: false }),
  );
  frame.name = 'visor-frame';
  frame.position.z = -0.5;
  // Vor allem anderen: Der Rahmen ist der Helm auf dem eigenen Kopf, und der
  // steckt näher am Auge als jede Wand.
  frame.renderOrder = 900;
  frame.scale.setScalar(1);
  return frame;
}
