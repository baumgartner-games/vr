import * as THREE from 'three';

/**
 * **Köpfe und Körper** — woraus eine Figur besteht, wenn man vom Hut absieht.
 *
 * Das Vorbild sind die Köche aus Overcooked: ein kugeliger Rumpf mit rundem
 * Boden, ein großer runder Kopf mit Augen und Nase, zwei schwebende Hände. So
 * eine Figur ist **von schräg oben lesbar**, und genau von dort schaut man in
 * diesem Projekt auf sie. Ein Skelett mit Armen und Beinen war das nicht: Aus
 * zwölf Metern Höhe waren Ober- und Unterarm zwei graue Striche, und wohin
 * jemand schaute, sah man gar nicht.
 *
 * Diese Datei liefert die **Listen** und das, was daraus für ein Ding wird —
 * `core/AvatarBody.ts` setzt es zusammen, `core/appearance.ts` speichert die
 * Wahl, `core/headgear.ts` setzt den Hut obenauf. Getrennt, weil die Listen
 * auch ohne Szene gebraucht werden: Das Menü und die Umkleide fragen nach
 * Namen und nach der nächsten Sorte, nicht nach Geometrie.
 *
 * Maße, an denen sich alles andere ausrichtet, stehen hier oben und nicht
 * verstreut in den Funktionen — wer den Kopf größer macht, findet den Hut.
 */

/** Halbmesser des runden Kopfes (Ø 32 cm). Alles am Kopf rechnet von hier. */
export const HEAD_RADIUS = 0.16;

/** Halbmesser des Rumpfes an seiner dicksten Stelle — eine halbe Kachel breit. */
export const BODY_RADIUS = 0.25;

// --- Köpfe -----------------------------------------------------------------

/** Die Köpfe, die es gibt: Hautton plus ein Merkmal im Gesicht. */
export type HeadKind = 'round' | 'freckles' | 'beard' | 'moustache';

export const HEAD_KINDS: readonly HeadKind[] = ['round', 'freckles', 'beard', 'moustache'];

export const HEAD_LABELS: Record<HeadKind, string> = {
  round: 'Rund',
  freckles: 'Sommersprossen',
  beard: 'Vollbart',
  moustache: 'Schnauzer',
};

export const HEAD_SUBS: Record<HeadKind, string> = {
  round: 'Runde Backen, sonst nichts — die Auslieferung',
  freckles: 'Helle Haut, Punkte über der Nase',
  beard: 'Dunkler Bart bis unter die Ohren',
  moustache: 'Nur der Balken unter der Nase',
};

/** Der Hautton je Kopf — den tragen auch die Hände, es sind ja seine. */
const SKIN: Record<HeadKind, number> = {
  round: 0xf0c49a,
  freckles: 0xf7d9bb,
  beard: 0xb37f57,
  moustache: 0xdcab7f,
};

/** Welche Farbe Hände und Gesicht dieses Kopfes haben. */
export function skinTone(kind: HeadKind): number {
  return SKIN[kind];
}

/** Ob eine Zeichenkette einen Kopf benennt — alles andere ist die Vorgabe. */
export function asHead(value: unknown): HeadKind {
  return HEAD_KINDS.includes(value as HeadKind) ? (value as HeadKind) : 'round';
}

/** Der nächste Kopf, hinten wieder von vorn. */
export function nextHead(kind: HeadKind): HeadKind {
  const index = HEAD_KINDS.indexOf(kind);
  return HEAD_KINDS[(index + 1) % HEAD_KINDS.length]!;
}

// --- Körper ----------------------------------------------------------------

/** Die Kochjacken, die es gibt. */
export type BodyKind = 'white' | 'red' | 'blue' | 'green' | 'striped';

export const BODY_KINDS: readonly BodyKind[] = ['white', 'red', 'blue', 'green', 'striped'];

export const BODY_LABELS: Record<BodyKind, string> = {
  white: 'Kochjacke weiß',
  red: 'Kochjacke rot',
  blue: 'Kochjacke blau',
  green: 'Kochjacke grün',
  striped: 'Gestreift',
};

export const BODY_SUBS: Record<BodyKind, string> = {
  white: 'Wie es sich gehört — die Auslieferung',
  red: 'Rot, mit heller Knopfleiste',
  blue: 'Blau, mit heller Knopfleiste',
  green: 'Grün, mit heller Knopfleiste',
  striped: 'Weiß mit drei blauen Ringen',
};

interface BodyLook {
  /** Die Jacke selbst. */
  jacket: number;
  /** Knöpfe und Ringe — was sich von der Jacke absetzen soll. */
  trim: number;
  /** Ob drei Ringe um den Rumpf laufen. */
  stripes: boolean;
}

const BODY_LOOKS: Record<BodyKind, BodyLook> = {
  white: { jacket: 0xf2f0ea, trim: 0xcdc7b8, stripes: false },
  red: { jacket: 0xc9453c, trim: 0xf4e7dd, stripes: false },
  blue: { jacket: 0x3f6fb5, trim: 0xe7eef8, stripes: false },
  green: { jacket: 0x3f9d6a, trim: 0xe9f5ee, stripes: false },
  striped: { jacket: 0xf2f0ea, trim: 0x2f5aa8, stripes: true },
};

/** Ob eine Zeichenkette einen Körper benennt — alles andere ist die Vorgabe. */
export function asBody(value: unknown): BodyKind {
  return BODY_KINDS.includes(value as BodyKind) ? (value as BodyKind) : 'white';
}

/** Der nächste Körper, hinten wieder von vorn. */
export function nextBody(kind: BodyKind): BodyKind {
  const index = BODY_KINDS.indexOf(kind);
  return BODY_KINDS[(index + 1) % BODY_KINDS.length]!;
}

// --- gebaut ----------------------------------------------------------------

function solid(color: number, roughness = 0.75, metalness = 0.04): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/**
 * Ein Punkt auf der Kopfkugel, angegeben als **Richtung** und Abstand vom
 * Mittelpunkt. Augen und Nase sitzen dadurch von selbst auf der Rundung, statt
 * aus drei geratenen Zahlen zu bestehen, die beim nächsten Kopfmaß danebenliegen.
 */
function onHead(x: number, y: number, z: number, distance: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z).normalize().multiplyScalar(distance);
}

/**
 * **Der Kopf** — Kugel, zwei Augen, eine Nase, dazu das Merkmal seiner Sorte.
 *
 * **−z ist vorn**, wie überall am Avatar. Augen und Nase stehen weit genug
 * hervor, dass man aus zwölf Metern Höhe sieht, wohin die Figur schaut; das
 * ist ihre eigentliche Aufgabe und nicht die Ähnlichkeit mit einem Gesicht.
 */
export function buildHead(kind: HeadKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `avatar-head-${kind}`;
  const skin = solid(SKIN[kind], 0.85);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 22, 16), skin);
  skull.frustumCulled = false;
  group.add(skull);

  // Die Augen sind Kugeln, die aus dem Kopf herausschauen — flach aufgemalte
  // Augen verschwinden von oben, sobald die Figur den Kopf senkt. Sie sitzen
  // knapp unter 6,5 cm über der Kopfmitte: Darüber fangen die Hutränder an
  // (`headgear.ts`), und eine Mütze, die durch ein Auge schneidet, sieht man.
  const white = new THREE.MeshStandardMaterial({ color: 0xfbfbf7, roughness: 0.4 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.3 });
  for (const sign of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.046, 14, 10), white);
    eye.position.copy(onHead(sign * 0.42, 0.12, -0.88, 0.15));
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 8), pupil);
    iris.position.copy(onHead(sign * 0.42, 0.12, -0.88, 0.182));
    group.add(eye, iris);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), solid(SKIN[kind], 0.85));
  nose.position.copy(onHead(0, -0.1, -1, 0.152));
  group.add(nose);

  switch (kind) {
    case 'round': {
      // Backen: zwei flache Flecken, sonst sähe der runde Kopf aus wie ein Ei.
      const blush = solid(0xe08a7a, 0.9);
      for (const sign of [-1, 1]) {
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), blush);
        cheek.position.copy(onHead(sign * 0.82, -0.3, -0.49, 0.15));
        cheek.scale.set(1, 0.75, 0.45);
        group.add(cheek);
      }
      break;
    }
    case 'freckles': {
      const dot = solid(0xa9714b, 0.9);
      const spots: Array<[number, number]> = [
        [-0.62, 0.02],
        [-0.46, -0.18],
        [-0.3, 0.1],
        [0.3, 0.1],
        [0.46, -0.18],
        [0.62, 0.02],
      ];
      for (const [x, y] of spots) {
        const freckle = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), dot);
        freckle.position.copy(onHead(x, y, -0.95, 0.157));
        group.add(freckle);
      }
      break;
    }
    case 'beard': {
      const dark = solid(0x3a2a1e, 0.9);
      const chin = new THREE.Mesh(new THREE.SphereGeometry(0.098, 16, 12), dark);
      chin.position.copy(onHead(0, -0.8, -0.6, 0.115));
      chin.scale.set(1.02, 0.94, 0.96);
      group.add(chin, ...whiskers(dark));
      break;
    }
    case 'moustache': {
      group.add(...whiskers(solid(0x3a2a1e, 0.9)));
      break;
    }
  }

  return group;
}

/** Der Balken unter der Nase — Vollbart und Schnauzer teilen ihn sich. */
function whiskers(material: THREE.Material): THREE.Mesh[] {
  return [-1, 1].map((sign) => {
    const half = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), material);
    half.position.copy(onHead(sign * 0.26, -0.28, -0.92, 0.152));
    half.scale.set(1.25, 0.55, 0.7);
    return half;
  });
}

/**
 * Der Rumpf, wie ihn `AvatarBody` bewegt: eine Gruppe plus die eine Sache, die
 * sich an ihm jedes Bild ändert.
 */
export interface BodyShape {
  group: THREE.Group;
  /**
   * Stellt den Rumpf auf `height` Meter — er reicht immer vom Boden bis unter
   * den Kopf, und **Ducken staucht ihn**, statt ihn vom Boden abheben zu
   * lassen. Breit bleibt er dabei, sonst würde die Figur beim Ducken dünn.
   */
  setHeight(height: number): void;
}

/**
 * Die Drehform des Rumpfes, als Halbmesser über der Höhe von 0 bis 1: unten
 * rund wie eine Tonne, in der Mitte am dicksten, nach oben schmaler, oben
 * geschlossen. Gebaut wird sie einmal in Einheitshöhe und dann gestreckt —
 * eine Geometrie je Bild wäre Müll für den Sammler.
 */
const BARREL: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.0],
  [0.085, 0.004],
  [0.15, 0.022],
  [0.2, 0.058],
  [0.232, 0.11],
  [0.248, 0.185],
  [BODY_RADIUS, 0.3],
  [0.249, 0.43],
  [0.244, 0.56],
  [0.236, 0.68],
  [0.223, 0.79],
  [0.206, 0.88],
  [0.186, 0.945],
  [0.15, 0.99],
  [0.08, 1.005],
  [0.0, 1.012],
];

/**
 * **Der Rumpf** — Tonne, Schürze mit Knopfleiste, Halstuch.
 *
 * @param suit Das Material der **Anzugfarbe der Rolle**. Es wird geteilt und
 *   nicht kopiert: Schürze und Halstuch haben keine eigene Farbe, sie tragen
 *   die des Spielers, und ein Farbwechsel soll nicht den halben Körper neu
 *   bauen. Weggeworfen wird es deshalb auch nicht hier, sondern von dem, dem
 *   es gehört (`AvatarBody`).
 */
export function buildBody(kind: BodyKind, suit: THREE.Material): BodyShape {
  const look = BODY_LOOKS[kind];
  const group = new THREE.Group();
  group.name = `avatar-torso-${kind}`;
  const jacket = solid(look.jacket, 0.78);
  const trim = solid(look.trim, 0.7);

  const points = BARREL.map(([r, y]) => new THREE.Vector2(r, y));
  const shell = new THREE.Mesh(new THREE.LatheGeometry(points, 22), jacket);
  shell.frustumCulled = false;
  group.add(shell);

  // Die Schürze ist ein flacher Quader vorn; ihr Rücken steckt im Rumpf, damit
  // sie sich bei jeder Rumpfhöhe anlegt statt in der Luft zu schweben.
  const apron = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1, 0.045), suit);
  apron.position.z = -0.245;
  group.add(apron);

  // Die Knopfleiste sitzt auf der Schürze — sie trägt die Farbe der Jacke,
  // damit man an einer Figur immer beide Farben sieht.
  const buttons = [0.3, 0.46, 0.62].map((fraction) => {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.018, 12), trim);
    button.rotation.x = Math.PI / 2;
    button.position.z = -0.272;
    return { button, fraction };
  });
  for (const { button } of buttons) group.add(button);

  // Das Halstuch: ein offener Kragen um den Hals, wieder in der Anzugfarbe.
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.215, 0.075, 20, 1, true), suit);
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.06, 0.05), suit);
  knot.position.z = -0.195;
  group.add(collar, knot);

  const stripes: ReadonlyArray<readonly [number, number]> = [
    [0.26, 0.253],
    [0.46, 0.251],
    [0.66, 0.242],
  ];
  const rings = look.stripes
    ? stripes.map(([fraction, radius]) => {
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, 0.05, 22, 1, true),
          trim,
        );
        return { ring, fraction };
      })
    : [];
  for (const { ring } of rings) group.add(ring);

  return {
    group,
    setHeight(height: number): void {
      shell.scale.set(1, height, 1);
      apron.scale.set(1, height * 0.52, 1);
      apron.position.y = height * 0.42;
      for (const { button, fraction } of buttons) button.position.y = height * fraction;
      for (const { ring, fraction } of rings) ring.position.y = height * fraction;
      collar.position.y = height * 0.93;
      knot.position.y = height * 0.885;
    },
  };
}
