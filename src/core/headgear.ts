import * as THREE from 'three';

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
 * Maße im Rahmen des Kopfes: Der Schädel ist ein Quader von 19 × 21 × 22 cm um
 * den Ursprung, und **−z ist vorn**. Wer hier etwas anbaut, rechnet von dort.
 */

/** Was es zu tragen gibt. `none` ist ausdrücklich einer davon. */
export type HeadgearKind = 'none' | 'cap' | 'helmet' | 'hardhat' | 'beanie' | 'tophat' | 'crown';

export const HEADGEAR_KINDS: readonly HeadgearKind[] = [
  'none',
  'cap',
  'helmet',
  'hardhat',
  'beanie',
  'tophat',
  'crown',
];

export const HEADGEAR_LABELS: Record<HeadgearKind, string> = {
  none: 'Ohne',
  cap: 'Basecap',
  helmet: 'Helm',
  hardhat: 'Bauhelm',
  beanie: 'Mütze',
  tophat: 'Zylinder',
  crown: 'Krone',
};

export const HEADGEAR_SUBS: Record<HeadgearKind, string> = {
  none: 'Barhäuptig — so war es immer',
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

/** Halbe Kantenlängen des Schädels, an denen hier alles ausgerichtet wird. */
const SKULL = { w: 0.095, h: 0.105, d: 0.11 };

function solid(color: number, roughness = 0.7, metalness = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
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
    case 'cap': {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(SKULL.w + 0.015, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        solid(tint, 0.8),
      );
      shell.scale.set(1, 0.85, 1.12);
      shell.position.y = SKULL.h - 0.03;
      const peak = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.09), solid(tint, 0.8));
      peak.position.set(0, SKULL.h - 0.025, -(SKULL.d + 0.03));
      peak.rotation.x = 0.12;
      group.add(shell, peak);
      break;
    }
    case 'helmet': {
      // Der Integralhelm: eine Schale, die tiefer sitzt als der Schädel, und
      // vorn ein Ausschnitt, in dem das dunkle Visier steht.
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14), solid(tint, 0.35, 0.3));
      shell.scale.set(1, 1.05, 1.08);
      shell.position.y = SKULL.h - 0.085;
      const visor = new THREE.Mesh(
        new THREE.SphereGeometry(0.138, 20, 10, -0.9, 1.8, 1.05, 0.62),
        new THREE.MeshStandardMaterial({
          color: 0x121722,
          roughness: 0.12,
          metalness: 0.6,
        }),
      );
      visor.scale.set(1, 1.05, 1.08);
      visor.position.y = SKULL.h - 0.085;
      visor.rotation.y = Math.PI;
      const chin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), solid(tint, 0.35, 0.3));
      chin.position.set(0, SKULL.h - 0.215, -(SKULL.d + 0.015));
      group.add(shell, visor, chin);
      break;
    }
    case 'hardhat': {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(SKULL.w + 0.022, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        solid(0xffc857, 0.55),
      );
      shell.scale.set(1, 0.95, 1.05);
      shell.position.y = SKULL.h - 0.035;
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.155, 0.012, 20),
        solid(0xffc857, 0.55),
      );
      brim.position.y = SKULL.h - 0.03;
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.19), solid(0xe8a92f, 0.55));
      ridge.position.y = SKULL.h + 0.055;
      group.add(shell, brim, ridge);
      break;
    }
    case 'beanie': {
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(SKULL.w + 0.02, 16, 10, 0, Math.PI * 2, 0, Math.PI / 1.7),
        solid(0xc2543f, 0.95),
      );
      shell.scale.set(1, 0.95, 1.08);
      shell.position.y = SKULL.h - 0.05;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(SKULL.w + 0.024, SKULL.w + 0.024, 0.035, 18),
        solid(0xa8422f, 0.95),
      );
      band.scale.set(1, 1, 1.08);
      band.position.y = SKULL.h - 0.05;
      const bobble = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), solid(0xf0e6d2, 0.95));
      bobble.position.y = SKULL.h + 0.075;
      group.add(shell, band, bobble);
      break;
    }
    case 'tophat': {
      const felt = solid(0x14161d, 0.85);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.014, 22), felt);
      brim.position.y = SKULL.h - 0.005;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.105, 0.19, 22), felt);
      tube.position.y = SKULL.h + 0.09;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.106, 0.108, 0.032, 22),
        solid(0x8c2f3c, 0.8),
      );
      band.position.y = SKULL.h + 0.02;
      group.add(brim, tube, band);
      break;
    }
    case 'crown': {
      const gold = solid(0xe8c14a, 0.3, 0.75);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.05, 18), gold);
      ring.position.y = SKULL.h + 0.015;
      group.add(ring);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 8), gold);
        spike.position.set(Math.sin(angle) * 0.095, SKULL.h + 0.065, Math.cos(angle) * 0.095);
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
