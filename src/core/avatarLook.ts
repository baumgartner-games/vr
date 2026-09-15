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

/**
 * Halbmesser des runden Kopfes (Ø 46 cm). Alles am Kopf rechnet von hier —
 * Augen, Nase und jeder Hut in `core/headgear.ts`.
 *
 * So ein Kopf ist **fast so breit wie der Rumpf**, und das ist der Punkt: Ein
 * Koch aus Overcooked ist kein Mensch in klein, sondern ein Kopf mit einem
 * Bauch darunter. Ø 32 cm sahen von oben aus wie ein Knauf auf einer Säule.
 */
export const HEAD_RADIUS = 0.23;

/**
 * Halbmesser des Rumpfes an seiner dicksten Stelle (Ø 84 cm) — knapp über der
 * Mitte, denn dort sitzt bei diesen Figuren das Volumen.
 *
 * Die Höhe der Figur ist **vorgegeben**: Der Kopf steht, wo die Augen des
 * Spielers stehen, sonst sehen sich zwei Leute in der Brille nicht in die
 * Augen. Gedrungen wird sie deshalb über die **Breite** und darüber, wo das
 * Volumen liegt — viel oben, wenig unten, wie ein Ei mit der dicken Seite oben.
 */
export const BODY_RADIUS = 0.42;

/** Halbmesser der Handkugeln (Ø 19 cm) — große Fäuste, von oben gut zu sehen. */
export const HAND_RADIUS = 0.095;

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
  return new THREE.Vector3(x, y, z).normalize().multiplyScalar(distance * HEAD_RADIUS);
}

/**
 * **Der Kopf** — Kugel, zwei Augen, eine Nase, dazu das Merkmal seiner Sorte.
 *
 * **−z ist vorn**, wie überall am Avatar. Augen und Nase stehen weit genug
 * hervor, dass man aus zwölf Metern Höhe sieht, wohin die Figur schaut; das
 * ist ihre eigentliche Aufgabe und nicht die Ähnlichkeit mit einem Gesicht.
 *
 * **Alle Maße sind Vielfache von `HEAD_RADIUS`** — Abstand vom Mittelpunkt wie
 * Größe der Teile. Wer den Kopf größer macht, ändert eine Zahl, und Augen,
 * Nase, Backen und Bart gehen von selbst mit.
 */
export function buildHead(kind: HeadKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `avatar-head-${kind}`;
  const skin = solid(SKIN[kind], 0.85);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS, 22, 16), skin);
  skull.frustumCulled = false;
  group.add(skull);

  // Die Augen sind Kugeln, die aus dem Kopf herausschauen — flach aufgemalte
  // Augen verschwinden von oben, sobald die Figur den Kopf senkt. Ihr oberer
  // Rand liegt bei gut 0,4 Kopfhalbmessern über der Kopfmitte: Darüber fangen
  // die Hutränder an (`headgear.ts`), und eine Mütze, die durch ein Auge
  // schneidet, sieht man.
  const white = new THREE.MeshStandardMaterial({ color: 0xfbfbf7, roughness: 0.4 });
  const pupil = new THREE.MeshStandardMaterial({ color: 0x18202e, roughness: 0.3 });
  for (const sign of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS * 0.3, 14, 10), white);
    eye.position.copy(onHead(sign * 0.42, 0.12, -0.88, 0.92));
    const iris = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS * 0.135, 12, 8), pupil);
    iris.position.copy(onHead(sign * 0.42, 0.12, -0.88, 1.13));
    group.add(eye, iris);
  }

  // Die Nase ist der Kompass der Figur: Von schräg oben sagt allein sie, wohin
  // jemand schaut. Sie steht deshalb einen Vierteldurchmesser weit heraus und
  // ist nach vorn gezogen statt eine Kugel auf dem Gesicht zu sein.
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(HEAD_RADIUS * 0.33, 14, 10),
    solid(SKIN[kind], 0.85),
  );
  nose.position.copy(onHead(0, -0.34, -1, 0.97));
  nose.scale.set(0.82, 0.82, 1.5);
  group.add(nose);

  switch (kind) {
    case 'round': {
      // Backen: zwei flache Flecken, sonst sähe der runde Kopf aus wie ein Ei.
      const blush = solid(0xe08a7a, 0.9);
      for (const sign of [-1, 1]) {
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS * 0.26, 12, 8), blush);
        cheek.position.copy(onHead(sign * 0.82, -0.3, -0.49, 0.94));
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
        const freckle = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS * 0.068, 8, 6), dot);
        freckle.position.copy(onHead(x, y, -0.95, 0.98));
        group.add(freckle);
      }
      break;
    }
    case 'beard': {
      const dark = solid(0x3a2a1e, 0.9);
      const chin = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS * 0.62, 16, 12), dark);
      chin.position.copy(onHead(0, -0.8, -0.6, 0.72));
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
    const half = new THREE.Mesh(new THREE.SphereGeometry(HEAD_RADIUS * 0.19, 12, 8), material);
    half.position.copy(onHead(sign * 0.26, -0.28, -0.92, 0.95));
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
 * **Die Kartoffel** — die Drehform des Rumpfes als Halbmesser in Metern über
 * einer Höhe von 0 bis 1.
 *
 * Der Halbmesser ist absolut, die Höhe ein **Anteil**: Gebaut wird die Form
 * einmal und dann nur in y gestreckt (`setHeight`), damit Ducken den Rumpf
 * staucht, ohne ihn dünn zu machen — und ohne je Bild eine Geometrie für den
 * Sammler zu hinterlassen.
 *
 * Die Kurve macht die Figur **gedrungen**, obwohl ihre Höhe feststeht: unten
 * rund und schmal (Ø 56 cm), ab einem Drittel schnell ausladend, am dicksten
 * knapp über der Mitte (Ø 84 cm), darüber zum Kopf hin auf Ø 51 cm eingezogen
 * und über 1,0 zu einer Schulter geschlossen, in der der Kopf sitzt. Das ist
 * ein Ei mit der dicken Seite oben: Wo das Volumen liegt, sieht das Auge die
 * Masse, und der schlanke Fuß darunter liest sich als kurzer Rock, nicht als
 * Säule.
 */
const BARREL: ReadonlyArray<readonly [number, number]> = [
  [0.0, 0.03],
  [0.12, 0.032],
  [0.196, 0.044],
  [0.252, 0.066],
  [0.282, 0.1],
  [0.312, 0.155],
  [0.34, 0.225],
  [0.369, 0.305],
  [0.396, 0.395],
  [0.413, 0.475],
  [BODY_RADIUS, 0.55],
  [0.416, 0.62],
  [0.404, 0.69],
  [0.384, 0.765],
  [0.353, 0.835],
  [0.311, 0.9],
  [0.274, 0.955],
  [0.255, 1.0],
  [0.236, 1.035],
  [0.188, 1.065],
  [0.112, 1.085],
  [0.0, 1.095],
];

/**
 * Wie dick der Rumpf auf der Höhe `fraction` ist, in Metern — zwischen den
 * Stützstellen linear.
 *
 * Alles, was sich an den Rumpf anlegt (Schürze, Knöpfe, Ringe, Halstuch),
 * fragt hier statt eine Zahl zu raten. Sonst schwebt beim nächsten Umbau der
 * Kurve ein Knopf vor dem Bauch oder steckt darin.
 */
/** Von wo bis wo die Schürze reicht, als Anteil der Rumpfhöhe. */
const APRON_BOTTOM = 0.15;
const APRON_TOP = 0.74;

/**
 * Wie weit die Schürze um den Rumpf greift, im Bogenmaß. 1,45 rad sind gut 83°
 * — an der dicksten Stelle also gut 53 cm Stoff vorn: breit genug, dass man
 * sie aus 16 m Höhe als Schürze und nicht als Streifen sieht, schmal genug,
 * dass links und rechts die Jacke stehen bleibt. Eine Schürze, die um den
 * halben Rumpf geht, ist keine Schürze mehr, sondern die Jacke in einer
 * zweiten Farbe.
 */
const APRON_WIDTH = 1.45;

/** Auf welcher Höhe der Wulst des Halstuchs liegt, als Anteil der Rumpfhöhe. */
const COLLAR = 0.975;

function barrelRadius(fraction: number): number {
  const first = BARREL[0]!;
  if (fraction <= first[1]) return first[0];
  for (let i = 1; i < BARREL.length; i++) {
    const [radius, y] = BARREL[i]!;
    if (fraction > y) continue;
    const [previousRadius, previousY] = BARREL[i - 1]!;
    const span = y - previousY;
    const t = span > 0 ? (fraction - previousY) / span : 0;
    return previousRadius + (radius - previousRadius) * t;
  }
  return BARREL[BARREL.length - 1]![0];
}

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
  const shell = new THREE.Mesh(new THREE.LatheGeometry(points, 26), jacket);
  shell.frustumCulled = false;
  group.add(shell);

  // **Die Schürze ist dieselbe Drehform**, nur ein Stück davon und minimal
  // weiter außen: ein Quader vorn stünde bei dieser Kartoffel unten in der
  // Luft und oben im Bauch. So legt sie sich bei jeder Rumpfhöhe an, weil sie
  // mit demselben Faktor mitwächst. `phiStart` zählt von +z (hinten) herum,
  // also liegt die Mitte der Schürze bei π — vorn.
  const apronPoints = BARREL.filter(([, y]) => y >= APRON_BOTTOM && y <= APRON_TOP).map(
    ([r, y]) => new THREE.Vector2(r * 1.022, y),
  );
  const apron = new THREE.Mesh(
    new THREE.LatheGeometry(apronPoints, 14, Math.PI - APRON_WIDTH / 2, APRON_WIDTH),
    suit,
  );
  apron.frustumCulled = false;
  group.add(apron);

  // Die Knopfleiste sitzt auf der Schürze — sie trägt die Farbe der Jacke,
  // damit man an einer Figur immer beide Farben sieht. Wie weit vorn ein Knopf
  // steht, sagt die Kurve, nicht eine geratene Zahl.
  const buttons = [0.36, 0.5, 0.64].map((fraction) => {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 14), trim);
    button.rotation.x = Math.PI / 2;
    button.position.z = -(barrelRadius(fraction) * 1.022 + 0.012);
    return { button, fraction };
  });
  for (const { button } of buttons) group.add(button);

  // **Das Halstuch ist ein Wulst**, kein Kragen: ein dicker Ring unter dem
  // Kopf, der die Schulter abschließt. Er ist das, was den Kopf aufsitzen
  // lässt, statt ihn auf einem Hals schweben zu lassen — einen Hals hat diese
  // Figur nicht.
  const collarRadius = barrelRadius(COLLAR) + 0.01;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(collarRadius, 0.055, 10, 26), suit);
  collar.rotation.x = Math.PI / 2;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), suit);
  knot.scale.set(1.3, 0.85, 0.85);
  knot.position.z = -(collarRadius + 0.03);
  group.add(collar, knot);

  const rings = look.stripes
    ? [0.34, 0.52, 0.7].map((fraction) => {
        const radius = barrelRadius(fraction) * 1.012;
        const ring = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, 0.07, 26, 1, true),
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
      // Dieselbe Streckung wie die Hülle — die Schürze ist ja ihr Ausschnitt.
      apron.scale.set(1, height, 1);
      for (const { button, fraction } of buttons) button.position.y = height * fraction;
      for (const { ring, fraction } of rings) ring.position.y = height * fraction;
      collar.position.y = height * COLLAR;
      knot.position.y = height * COLLAR;
    },
  };
}
