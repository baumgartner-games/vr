import * as THREE from 'three';
import { HEAD_RADIUS, HEAD_SPREAD } from './avatarLook';

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
 * Maße im Rahmen des Kopfes: Der Kopf ist eine **Kugel** von 46 cm Durchmesser
 * um den Ursprung (`avatarLook.HEAD_RADIUS`), und **−z ist vorn**. Jede Zahl
 * hier ist deshalb ein **Vielfaches von `HEAD_RADIUS`** (`r()`) und keine
 * Länge in Metern: Der Kopf ist in diesem Projekt schon einmal gewachsen, und
 * beim nächsten Mal sollen die Hüte von selbst mitwachsen statt acht Mal neu
 * geraten zu werden. Wo etwas auf der Rundung aufsitzt, rechnet `dome()` den
 * Halbmesser aus der Ansatzhöhe aus — ein Hut mit festem Halbmesser lässt den
 * Kopf an den Seiten herausschauen.
 *
 * Nichts sitzt tiefer als **0,45 Halbmesser über der Kopfmitte**, außer der
 * Helm, der den ganzen Kopf einschließt: Darunter liegen die Augen, und eine
 * Mütze, die jemandem über die Augen rutscht, sieht nicht nach Mütze aus,
 * sondern nach Fehler.
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

/** `k` Kopfhalbmesser in Metern — die Einheit, in der diese Datei rechnet. */
function r(k: number): number {
  return HEAD_RADIUS * k;
}

/**
 * Dasselbe für alles, was den Kopf **umfasst** — Bänder, Krempen, Kuppen. Der
 * Kopf ist eine gefaste Kiste und an seinen vier Ecken gut ein Fünftel weiter
 * draußen als eine Kugel (`avatarLook.HEAD_SPREAD`); ein Hut, der das nicht
 * mitrechnet, sitzt vorn an und lässt an den Ecken die Haut durchblitzen.
 *
 * Nicht benutzt wird es für alles, was **auf** dem Kopf steht statt um ihn
 * herum — ein Zylinderrohr oder ein Bommel berührt ihn nie.
 */
function around(k: number): number {
  return HEAD_RADIUS * k * HEAD_SPREAD;
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
  const radius =
    Math.sqrt(Math.max(HEAD_RADIUS * HEAD_RADIUS - base * base, 1e-4)) * HEAD_SPREAD + margin;
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
      // **Die Kochmütze** — das Erkennungszeichen dieser Figuren, und deshalb
      // das Stück, an dem sich der Umbau am meisten entschied.
      //
      // Vorher waren es drei glatte Drehkörper: Wulst, Rohr, Kuppel. Von vorn
      // ein Marshmallow auf einem Kegel. Bei den Vorbildern besteht die Haube
      // aus **mehreren Lappen**, die sich überlappen — das ist es, was den
      // Stoff wie Stoff aussehen lässt und nicht wie gedrehtes Holz, und man
      // sieht es noch aus 16 m Höhe an der Kante, die nicht rund ist.
      //
      // Dazu drei Maße, die vorher fehlten: Die Mütze ist **breiter als der
      // Kopf** (sonst ist sie eine Zipfelmütze), sie ist **höher**, und unter
      // ihr sitzt ein **dunkles Stirnband**. Das Band ist der Kniff: Es
      // trennt Weiß von Haut, und ohne diese Trennung verschwimmt die obere
      // Kopfhälfte zu einem hellen Fleck.
      const linen = solid(0xf6f3ea, 0.92);
      const dark = solid(0x24262c, 0.85);
      // Alles an dieser Mütze sitzt in einer eigenen Gruppe, weil sie als
      // Ganzes **nach hinten gekippt** getragen wird — gut zehn Grad, und ein
      // Stück nach hinten versetzt. Gerade aufgesetzt sähe sie aus wie ein
      // Hut auf einem Schneemann; gekippt gibt sie der Figur die Stirn frei,
      // auf der Brauen und Blick sitzen.
      const toque = new THREE.Group();
      toque.rotation.x = -0.2;
      toque.position.z = r(0.1);
      group.add(toque);

      // Das Stirnband: ein Rohr über den Brauen, das den Kopf ringsum fasst.
      // Es steht über die Kopfform hinaus, damit es auch von vorn ein Band ist
      // und kein aufgemalter Strich — und es trennt Weiß von Haut. Ohne diese
      // Trennung verschwimmt die obere Kopfhälfte zu einem hellen Fleck.
      const headband = new THREE.Mesh(
        new THREE.CylinderGeometry(around(0.9), around(0.94), r(0.32), 26),
        dark,
      );
      headband.position.y = r(0.66);
      toque.add(headband);

      // Der Rand der Mütze liegt auf dem Band auf — und ist **schmaler als
      // die Haube darüber**. Dieser Überhang mit dem Schatten darunter ist
      // das, woran man eine Kochmütze auch als Scherenschnitt erkennt.
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(around(0.95), around(0.92), r(0.42), 28),
        linen,
      );
      brim.position.y = r(1.03);
      toque.add(brim);

      // **Die Haube aus Lappen.** Fünf Kugeln im Kreis plus eine in der Mitte,
      // alle ineinandergeschoben: zusammen eine Wolke mit sichtbaren Beulen.
      // Sechs Netze für die Silhouette, die diese Figur ausmacht — billiger
      // als jede Textur, die dasselbe versuchen würde.
      const lobes = 5;
      for (let i = 0; i < lobes; i++) {
        const angle = (i / lobes) * Math.PI * 2 + Math.PI / lobes;
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(r(0.6), 16, 12), linen);
        lobe.position.set(Math.sin(angle) * around(0.62), r(1.68), Math.cos(angle) * around(0.62));
        lobe.scale.set(1.02, 1.2, 1.02);
        toque.add(lobe);
      }
      const crown = new THREE.Mesh(new THREE.SphereGeometry(r(0.76), 20, 14), linen);
      crown.scale.set(1.0, 0.9, 1.0);
      crown.position.y = r(1.86);
      toque.add(crown);
      break;
    }
    case 'cap': {
      // Das Basecap: flache Schale, **breiter** Schirm. Von schräg oben ist
      // der Schirm das ganze Erkennungszeichen — ein schmaler verschwindet
      // unter dem Kopf, der über ihm steht.
      const cloth = solid(tint, 0.8);
      const shell = domeMesh(r(0.53), r(0.08), cloth);
      shell.scale.set(1, 1, 1.06);
      const peak = new THREE.Mesh(new THREE.BoxGeometry(r(1.34), r(0.085), r(0.86)), cloth);
      peak.position.set(0, r(0.58), -r(1.4));
      peak.rotation.x = 0.14;
      group.add(shell, peak);
      break;
    }
    case 'helmet': {
      // Der Integralhelm schließt den ganzen Kopf ein — er ist der einzige,
      // der unter die Augen reicht, und muss deshalb über Nase und Augen
      // hinauskommen, die aus der Kugel herausstehen.
      const paint = solid(tint, 0.35, 0.3);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(r(1.3), 22, 16), paint);
      shell.scale.set(1, 1.03, 1.04);
      shell.position.y = -r(0.075);
      const visor = new THREE.Mesh(
        new THREE.SphereGeometry(r(1.32), 22, 12, -0.9, 1.8, 1.05, 0.62),
        new THREE.MeshStandardMaterial({ color: 0x121722, roughness: 0.12, metalness: 0.6 }),
      );
      visor.scale.copy(shell.scale);
      visor.position.y = shell.position.y;
      visor.rotation.y = Math.PI;
      const chin = new THREE.Mesh(new THREE.BoxGeometry(r(1.26), r(0.34), r(0.34)), paint);
      chin.position.set(0, -r(0.92), -r(1.12));
      group.add(shell, visor, chin);
      break;
    }
    case 'hardhat': {
      const plastic = solid(0xffc857, 0.55);
      const shell = domeMesh(r(0.47), r(0.16), plastic);
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(r(1.42), r(1.42), r(0.09), 26),
        plastic,
      );
      brim.position.y = r(0.5);
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(r(0.19), r(0.23), r(1.64)),
        solid(0xe8a92f, 0.55),
      );
      ridge.position.y = r(1.34);
      group.add(shell, brim, ridge);
      break;
    }
    case 'beanie': {
      const knit = solid(0xc2543f, 0.95);
      const shell = domeMesh(r(0.47), r(0.09), knit);
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(around(0.92), around(0.92), r(0.27), 22),
        solid(0xa8422f, 0.95),
      );
      band.position.y = r(0.54);
      const bobble = new THREE.Mesh(
        new THREE.SphereGeometry(r(0.22), 12, 8),
        solid(0xf0e6d2, 0.95),
      );
      bobble.position.y = r(1.58);
      group.add(shell, band, bobble);
      break;
    }
    case 'tophat': {
      const felt = solid(0x14161d, 0.85);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(r(1.36), r(1.36), r(0.1), 26), felt);
      brim.position.y = r(0.62);
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(around(0.86), around(0.89), r(1.32), 26),
        felt,
      );
      tube.position.y = r(1.36);
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(around(0.9), around(0.91), r(0.23), 26),
        solid(0x8c2f3c, 0.8),
      );
      band.position.y = r(0.79);
      group.add(brim, tube, band);
      break;
    }
    case 'crown': {
      const gold = solid(0xe8c14a, 0.3, 0.75);
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(around(0.92), around(0.92), r(0.36), 22),
        gold,
      );
      ring.position.y = r(0.74);
      group.add(ring);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(r(0.17), r(0.45), 8), gold);
        spike.position.set(Math.sin(angle) * r(0.85), r(1.14), Math.cos(angle) * r(0.85));
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
