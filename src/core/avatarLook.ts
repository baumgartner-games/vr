import * as THREE from 'three';
import { CHEF, cloth, hair, skin, squarish, squarishReach, trim, trousers } from './chefStyle';

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
export const HEAD_RADIUS = 0.26;

/**
 * Wie eckig der Kopf ist (`chefStyle.squarish`): 0 wäre eine Kugel, 1 ein
 * Würfel. An den Vorbildern sind es weiche Kanten mit einem Eckenradius von
 * gut einem Fünftel der Kantenlänge — hier also ein gutes halbes Stück auf
 * dem Weg zum Würfel, nicht mehr.
 */
export const HEAD_BOX = 0.5;

/**
 * **Wie viel breiter die gefaste Kiste an ihrer Ecke ist als eine Kugel**
 * desselben Halbmessers.
 *
 * Genau daran scheiterte beim Umbau jeder Hut, der den Kopf **umfasst**: Eine
 * Mütze, deren Halbmesser aus `HEAD_RADIUS` kommt, liegt vorn und seitlich
 * an — und lässt an den vier Ecken dazwischen die Haut durchblitzen, weil der
 * Kopf dort ein Fünftel weiter hinausreicht. Die Zahl wird deshalb
 * **ausgerechnet** und nicht geraten: Sie ist die Reichweite in Richtung der
 * waagerechten Diagonale, und sie geht von selbst mit, wenn jemand `HEAD_BOX`
 * ändert.
 */
export const HEAD_SPREAD = squarishReach(new THREE.Vector3(1, 0, 1).normalize(), HEAD_BOX);

/**
 * Halbmesser des Rumpfes an seiner dicksten Stelle (Ø 84 cm) — knapp über der
 * Mitte, denn dort sitzt bei diesen Figuren das Volumen.
 *
 * Die Höhe der Figur ist **vorgegeben**: Der Kopf steht, wo die Augen des
 * Spielers stehen, sonst sehen sich zwei Leute in der Brille nicht in die
 * Augen. Gedrungen wird sie deshalb über die **Breite** und darüber, wo das
 * Volumen liegt — viel oben, wenig unten, wie ein Ei mit der dicken Seite oben.
 */
export const BODY_RADIUS = 0.425;

/**
 * Halbmesser der Hand (Ø 19 cm) — das Maß, an dem alles an ihr hängt, auch
 * wenn eine Hand längst keine Kugel mehr ist (`buildHand`). Sie ist gut ein
 * Drittel so breit wie der Kopf; bei den Vorbildern ist sie das auch, und
 * kleiner verschwindet sie aus 16 m Höhe.
 */
export const HAND_RADIUS = 0.095;

/**
 * **Wo der Rumpf aufhört und die Beine anfangen**, als Anteil der Rumpfhöhe.
 *
 * Das ist die Zahl, die aus der Kegelfigur einen Koch macht. Vorher ging eine
 * einzige Drehform vom Boden bis unter den Kopf: von schräg oben ein Ei mit
 * einem Knauf darauf, und beim Laufen bewegte sich daran gar nichts. Jetzt
 * endet die Jacke hier, und darunter stehen zwei karierte Beine in Schuhen —
 * die man aus 16 m Höhe zwar kaum einzeln sieht, deren **Bewegung** man aber
 * sofort sieht. Eine Figur, die läuft, ohne dass sich etwas an ihr bewegt,
 * rutscht über den Boden.
 */
export const HEM = 0.3;

/** Halbmesser eines Beins — ein Hosenbein, kein Stock. */
const LEG_RADIUS = 0.105;

/** Wie weit die Beine auseinanderstehen, von der Mitte aus. */
const LEG_SIDE = 0.14;

/**
 * Wie flach der Schuh ist und wie weit er dadurch unter das Ende des Beins
 * reicht — die Zahl, mit der die **Sohle auf dem Boden** steht statt einen
 * Zentimeter darunter. Sie fällt aus den Maßen des Schuhs heraus und wird
 * deshalb daraus gerechnet und nicht daneben geschrieben.
 */
const SHOE_SQUASH = 0.6;
const SHOE_DROP = LEG_RADIUS * 1.12 * SHOE_SQUASH;

/** Der Ärmelstummel an der Schulter: Halbmesser und Länge in Metern. */
const SLEEVE_RADIUS = 0.088;
const SLEEVE_LENGTH = 0.14;

/** Auf welcher Höhe das Schürzenband liegt, als Anteil der Rumpfhöhe. */
const APRON_TIE = 0.78;

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
  white: { jacket: 0xe6dfcf, trim: 0xcdc7b8, stripes: false },
  red: { jacket: 0xc9453c, trim: 0xf4e7dd, stripes: false },
  blue: { jacket: 0x3f6fb5, trim: 0xe7eef8, stripes: false },
  green: { jacket: 0x3f9d6a, trim: 0xe9f5ee, stripes: false },
  striped: { jacket: 0xe9e3d6, trim: 0x2f5aa8, stripes: true },
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

/**
 * Ein Punkt auf der Kopfkugel, angegeben als **Richtung** und Abstand vom
 * Mittelpunkt. Augen und Nase sitzen dadurch von selbst auf der Rundung, statt
 * aus drei geratenen Zahlen zu bestehen, die beim nächsten Kopfmaß danebenliegen.
 */
const _reach = new THREE.Vector3();
/** Die Achse, entlang der ein Ärmel gebaut ist — siehe `setArms`. */
const _back = new THREE.Vector3(0, 0, -1);

function onHead(x: number, y: number, z: number, distance: number): THREE.Vector3 {
  const direction = new THREE.Vector3(x, y, z).normalize();
  // Der Abstand rechnet gegen **die Oberfläche der gefasten Kiste**, nicht
  // gegen die einer Kugel: Auf der Kiste liegt die Wange weiter außen als die
  // Ecke daneben, und ein Auge, das mit dem Kugelmaß gesetzt wird, steckt an
  // dieser Stelle im Kopf. Mit `squarishReach` gilt `distance = 1` überall auf
  // der Haut, egal in welche Richtung man zeigt.
  return direction.multiplyScalar(distance * HEAD_RADIUS * squarishReach(direction, HEAD_BOX));
}

/** `k` Kopfhalbmesser in Metern — die Einheit, in der am Kopf gerechnet wird. */
function r(k: number): number {
  return HEAD_RADIUS * k;
}

/** Die Haarfarbe zum Bart — dieselbe, damit ein Kopf aus einem Stück wirkt. */
const HAIR: Record<HeadKind, number> = {
  round: 0x6b4b2f,
  freckles: 0xc4632a,
  beard: 0x3a2a1e,
  moustache: 0x2e2620,
};

/**
 * **Der Kopf** — Kugel, zwei Ohren, zwei Augen unter Brauen, eine große Nase,
 * ein Mund, dazu das Merkmal seiner Sorte.
 *
 * **−z ist vorn**, wie überall am Avatar. **Alle Maße sind Vielfache von
 * `HEAD_RADIUS`** — Abstand vom Mittelpunkt wie Größe der Teile. Wer den Kopf
 * größer macht, ändert eine Zahl, und Augen, Nase, Ohren und Bart gehen von
 * selbst mit.
 *
 * Was sich gegenüber der ersten Fassung geändert hat und warum:
 *
 * - **Die Augen sind kleiner und liegen tiefer.** Vorher waren es zwei Kugeln
 *   von 0,3 Kopfhalbmessern, die weit aus dem Gesicht ragten — von vorn eine
 *   Puppe mit Kulleraugen, und vor allem lagen sie auf halber Höhe. Bei den
 *   Vorbildern sitzen die Augen **unter** der Mitte, weil darüber die Stirn
 *   Platz für die Mütze braucht. Genau das macht den Kopf kindlich.
 * - **Die Nase ist größer und sitzt zwischen den Augen**, nicht darunter. Sie
 *   ist bei diesen Figuren das größte Einzelteil des Gesichts und bleibt der
 *   Kompass, an dem man aus 16 m Höhe die Blickrichtung abliest.
 * - **Ohren.** Zwei flache Scheiben seitlich. Sie kosten zwei Netze und machen
 *   aus der Kugel einen Kopf — von oben sind sie der Umriss, der nicht rund ist.
 * - **Brauen.** Zwei Balken über den Augen. Sie geben dem Gesicht einen
 *   Ausdruck, und ohne sie schaut jede Figur gleich freundlich-leer.
 */
export function buildHead(kind: HeadKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `avatar-head-${kind}`;
  const face = skin(SKIN[kind]);
  const mane = hair(HAIR[kind]);

  // **Der Schädel ist eine gefaste Kiste** (`core/chefStyle.ts`) und keine
  // Kugel — vorn eine flache Fläche für das Gesicht, seitlich zwei für die
  // Ohren, oben eine, auf der die Mütze aufliegt. Das ist der größte einzelne
  // Unterschied zum ersten Wurf: Eine Kugel mit Augen darauf liest sich als
  // Ball mit Gesicht, eine weiche Kiste als Kopf.
  const skull = new THREE.Mesh(squarish(HEAD_RADIUS, HEAD_BOX), face);
  skull.scale.set(1, 0.97, 0.93);
  skull.frustumCulled = false;
  group.add(skull);

  // Ohren: flache Scheiben seitlich auf Augenhöhe, leicht nach hinten versetzt.
  for (const sign of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(r(0.2), 12, 10), face);
    ear.position.copy(onHead(sign, -0.1, 0.14, 0.94));
    ear.scale.set(0.42, 1, 0.82);
    group.add(ear);
  }

  // Die Augen liegen **unter** der Kopfmitte und stehen nur so weit vor, dass
  // man sie von oben noch sieht. Ihr oberer Rand bleibt unter 0,45
  // Kopfhalbmessern: Darüber fangen die Hutränder an (`core/headgear.ts`), und
  // eine Mütze, die durch ein Auge schneidet, sieht man.
  // **Augen sind Punkte, keine Kulleraugen.** Die erste Fassung hatte eine
  // weiße Kugel mit einer schwarzen davor, beide weit aus dem Kopf heraus —
  // von vorn eine Puppe, von oben zwei helle Flecken. An den Vorbildern ist
  // ein Auge ein **dunkles Oval ohne Weiß**, bündig in der Gesichtsfläche,
  // und nicht einmal reines Schwarz. Ein winziger Glanzpunkt darauf ist
  // alles, was an Leben nötig ist.
  const pupil = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.3, metalness: 0 });
  const glint = new THREE.MeshStandardMaterial({ color: 0xfdfcf8, roughness: 0.2, metalness: 0 });
  for (const sign of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(r(0.145), 14, 12), pupil);
    eye.position.copy(onHead(sign * 0.34, -0.12, -0.92, 0.96));
    eye.scale.set(0.88, 1.15, 0.5);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(r(0.042), 8, 6), glint);
    spark.position.copy(onHead(sign * 0.3, -0.05, -0.92, 1.0));
    spark.scale.set(1, 1, 0.5);
    // **Die Braue ist ein eigener, schwebender Balken** — bei den Vorbildern
    // liegt zwischen ihr und dem Auge ein sichtbarer Spalt, und genau der
    // gibt dem Gesicht einen Ausdruck. Ohne Brauen schaut jede Figur gleich
    // freundlich-leer.
    const brow = new THREE.Mesh(new THREE.SphereGeometry(r(0.13), 10, 8), mane);
    brow.position.copy(onHead(sign * 0.36, 0.14, -0.9, 0.99));
    brow.scale.set(1.55, 0.32, 0.45);
    brow.rotation.z = -sign * 0.2;
    group.add(eye, spark, brow);
  }

  // **Die Nase** ist der Kompass der Figur und bei diesen Vorbildern das
  // größte Stück im Gesicht: eine dicke Knolle zwischen den Augen, ein
  // Drittel Kopfhalbmesser weit vorgezogen.
  const nose = new THREE.Mesh(new THREE.SphereGeometry(r(0.27), 16, 12), face);
  nose.position.copy(onHead(0, -0.16, -1, 1.0));
  nose.scale.set(0.95, 1, 1.35);
  group.add(nose);

  switch (kind) {
    case 'round': {
      // Backen: zwei flache Flecken, sonst sähe der runde Kopf aus wie ein Ei.
      const blush = skin(0xe08a7a);
      for (const sign of [-1, 1]) {
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(r(0.24), 12, 8), blush);
        cheek.position.copy(onHead(sign * 0.84, -0.38, -0.5, 0.93));
        cheek.scale.set(1, 0.8, 0.42);
        group.add(cheek);
      }
      group.add(mouth(r(0.16)));
      // Ein Haarschopf über der Stirn — unter jedem Hut versteckt, ohne Hut
      // der Unterschied zwischen einem Kopf und einer Melone.
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(r(0.42), 14, 10), mane);
      tuft.position.copy(onHead(0, 0.85, -0.5, 0.86));
      tuft.scale.set(1.15, 0.6, 0.9);
      group.add(tuft);
      break;
    }
    case 'freckles': {
      const dot = skin(0xa9714b);
      const spots: Array<[number, number]> = [
        [-0.62, -0.06],
        [-0.46, -0.24],
        [-0.3, 0.02],
        [0.3, 0.02],
        [0.46, -0.24],
        [0.62, -0.06],
      ];
      for (const [x, y] of spots) {
        const freckle = new THREE.Mesh(new THREE.SphereGeometry(r(0.06), 8, 6), dot);
        freckle.position.copy(onHead(x, y, -0.95, 0.99));
        group.add(freckle);
      }
      group.add(mouth(r(0.18)));
      // Zwei Zöpfe seitlich — dasselbe Bauteil zweimal, gespiegelt.
      for (const sign of [-1, 1]) {
        const braid = new THREE.Mesh(new THREE.CapsuleGeometry(r(0.14), r(0.36), 4, 10), mane);
        braid.position.copy(onHead(sign * 0.95, -0.02, 0.1, 0.96));
        braid.position.y -= r(0.34);
        group.add(braid);
      }
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(r(0.55), 16, 12), mane);
      fringe.position.copy(onHead(0, 0.7, -0.42, 0.82));
      fringe.scale.set(1.2, 0.7, 1.05);
      group.add(fringe);
      break;
    }
    case 'beard': {
      // **Der Vollbart ist ein Block**, keine Kugel. Bei den Vorbildern ist er
      // ein breites, unten gerade abgeschnittenes Stück, das die halbe untere
      // Kopfhälfte einnimmt — daran und an der Nase erkennt man diese Figur
      // aus jeder Entfernung. Eine Kugel am Kinn war ein Kinn, kein Bart.
      const beard = new THREE.Mesh(new THREE.SphereGeometry(r(0.82), 18, 14), mane);
      beard.position.copy(onHead(0, -0.62, -0.42, 0.62));
      beard.scale.set(1.0, 0.92, 0.88);
      group.add(beard, ...whiskers(mane));
      // Die Koteletten schließen den Bart an die Schläfen an.
      for (const sign of [-1, 1]) {
        const chop = new THREE.Mesh(new THREE.SphereGeometry(r(0.28), 10, 8), mane);
        chop.position.copy(onHead(sign * 0.92, 0.12, -0.2, 0.95));
        chop.scale.set(0.6, 1.5, 0.9);
        group.add(chop);
      }
      break;
    }
    case 'moustache': {
      group.add(mouth(r(0.15)), ...whiskers(mane));
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(r(0.46), 14, 10), mane);
      tuft.position.copy(onHead(0, 0.82, -0.36, 0.84));
      tuft.scale.set(1.18, 0.62, 1.0);
      group.add(tuft);
      break;
    }
  }

  return group;
}

/**
 * **Der Mund ist eine Kerbe**, kein Fleck. An den Vorbildern ist er eine dünne
 * dunkle Linie mit leicht nach oben gezogenen Enden — ein gefülltes Oval sah
 * von vorn aus wie eine herausgestreckte Zunge. Ein gebogenes Rohr, flach an
 * die Haut gelegt, ist genau diese Linie und kostet ein Netz.
 */
function mouth(width: number): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(
    [-1, -0.5, 0, 0.5, 1].map((t) => {
      const point = onHead(t * width * 2.6, -0.58 + t * t * 0.07, -0.86, 1.0);
      return point;
    }),
  );
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 14, width * 0.16, 6, false),
    hair(CHEF.mouth),
  );
  return mesh;
}

/**
 * **Der Schnauzer** — zwei Hälften, die sich nach außen und unten legen.
 * Vollbart und Schnauzer teilen ihn sich, und bei beiden ist er das Stück, das
 * die Nase erst zur Nase macht: darüber Knolle, darunter Balken.
 */
function whiskers(material: THREE.Material): THREE.Mesh[] {
  return [-1, 1].map((sign) => {
    const half = new THREE.Mesh(new THREE.SphereGeometry(r(0.24), 12, 10), material);
    half.position.copy(onHead(sign * 0.3, -0.42, -0.88, 0.97));
    half.scale.set(1.35, 0.5, 0.62);
    half.rotation.z = sign * 0.26;
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
  /**
   * **Der Schritt** — `phase` läuft im Bogenmaß durch, `amount` ist 0 im
   * Stehen und 1 im vollen Lauf. Die beiden Beine schwingen gegeneinander.
   */
  setStride(phase: number, amount: number): void;
  /**
   * **Die Ärmel zeigen auf die Hände.** `left` und `right` sind die
   * Handpositionen im Raum des Rumpfes — also schon gedreht und verschoben,
   * so wie `AvatarBody` sie ausrechnet.
   *
   * Das ist der Grund, warum die Figur überhaupt Ärmel hat: Zwei Hände, die
   * frei vor dem Bauch schweben, und zwei Stummel, die starr an der Schulter
   * hängen, waren vier Teile, die nichts miteinander zu tun hatten — man sah
   * eine Figur, der jemand die Hände danebengelegt hat. Ein Ärmel, der auf
   * seine Hand **zeigt** und sich bis zu ihr streckt, schließt die Lücke,
   * ohne dass daraus ein Skelett mit zwei Gelenken wird, dessen Ellbogen man
   * nur falsch raten kann.
   */
  setArms(left: THREE.Vector3, right: THREE.Vector3): void;
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
  // Der Saum: von innen nach außen um die Kante herum. Ein Rock hat unten eine
  // **Lippe** und keine Schnittfläche — man sieht von schräg unten hinein,
  // sobald die Figur auf einer Stufe steht.
  [0.0, HEM - 0.045],
  [0.22, HEM - 0.042],
  [0.33, HEM - 0.03],
  [0.385, HEM - 0.012],
  [0.408, HEM],
  // Von hier an nach oben: die breiteste Stelle liegt **unten**, nicht in der
  // Mitte. Das ist der Unterschied zwischen einem Rock und einem Bauch, und
  // die Vorbilder tragen einen Rock.
  [BODY_RADIUS, HEM + 0.04],
  [0.421, 0.42],
  [0.409, 0.52],
  [0.392, 0.61],
  [0.369, 0.69],
  [0.341, 0.765],
  [0.309, 0.83],
  [0.278, 0.88],
  // Die Schulter: hier hört die Jacke auf, in sie zu passen, und wird zum
  // Kragen. Schmal genug, dass der Kopf darüber **steht** und nicht darin
  // steckt — das war der Fehler der alten Kurve.
  [0.246, 0.925],
  [0.214, 0.962],
  [0.192, 0.985],
  [0.166, 1.0],
  [0.108, 1.012],
  [0.0, 1.018],
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
const APRON_BOTTOM = HEM + 0.015;
const APRON_TOP = 0.84;

/**
 * Wie weit die Schürze um den Rumpf greift, im Bogenmaß. 1,45 rad sind gut 83°
 * — an der dicksten Stelle also gut 53 cm Stoff vorn: breit genug, dass man
 * sie aus 16 m Höhe als Schürze und nicht als Streifen sieht, schmal genug,
 * dass links und rechts die Jacke stehen bleibt. Eine Schürze, die um den
 * halben Rumpf geht, ist keine Schürze mehr, sondern die Jacke in einer
 * zweiten Farbe.
 */
const APRON_WIDTH = 2.5;

/** Auf welcher Höhe der Wulst des Halstuchs liegt, als Anteil der Rumpfhöhe. */
const COLLAR = 0.94;

/** Wo die Ärmel ansetzen — knapp unter dem Kragen, also an der Schulter. */
const SHOULDER = 0.85;

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
 * **Der Rumpf** — Jacke, Schürze mit Knopfleiste, Halstuch, Ärmel und die
 * karierten Beine darunter.
 *
 * Gebaut wird von unten nach oben, und jedes Stück fragt die Drehkurve nach
 * seinem Halbmesser, statt eine Zahl zu raten (`barrelRadius`). Wer die Kurve
 * ändert, verschiebt damit auch Knöpfe, Kragen und Ärmel — und findet keinen
 * Knopf, der vor dem Bauch schwebt.
 *
 * @param suit Das Material der **Anzugfarbe der Rolle**. Es wird geteilt und
 *   nicht kopiert: Schürzenband, Halstuch und Ärmelaufschlag haben keine eigene
 *   Farbe, sie tragen die des Spielers, und ein Farbwechsel soll nicht den
 *   halben Körper neu bauen. Weggeworfen wird es deshalb auch nicht hier,
 *   sondern von dem, dem es gehört (`AvatarBody`).
 */
export function buildBody(kind: BodyKind, suit: THREE.Material): BodyShape {
  const look = BODY_LOOKS[kind];
  const group = new THREE.Group();
  group.name = `avatar-torso-${kind}`;
  const jacket = cloth(look.jacket);
  const trimStuff = cloth(look.trim, 0.82);
  const apronCloth = cloth(CHEF.apron);
  const legCloth = trousers();
  const shoeLeather = trim(CHEF.shoe, 0.55);

  // --- Beine ---------------------------------------------------------------
  // Zwei Beine, die unter dem Saum hervorschauen, und zwei Schuhe darunter.
  // Sie hängen je in einer eigenen Gruppe, deren **Drehpunkt die Hüfte ist**:
  // Ein Bein, das um seine Mitte schwingt, sieht aus, als würde es getreten.
  const legs = [-1, 1].map((sign) => {
    const hip = new THREE.Group();
    hip.name = sign < 0 ? 'leg-left' : 'leg-right';
    const shank = new THREE.Mesh(new THREE.CapsuleGeometry(LEG_RADIUS, 1, 6, 12), legCloth);
    shank.frustumCulled = false;
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(LEG_RADIUS * 1.12, 14, 10), shoeLeather);
    // Ein Schuh ist nach vorn gezogen und flach — eine Kugel darunter wäre ein
    // Fuß aus einem Comic, und der Zeh sagt von oben, wohin die Figur zeigt.
    shoe.scale.set(0.92, SHOE_SQUASH, 1.45);
    shoe.position.z = -LEG_RADIUS * 0.45;
    hip.add(shank, shoe);
    group.add(hip);
    return { hip, shank, shoe, sign };
  });

  // --- Jacke ---------------------------------------------------------------
  const points = BARREL.map(([r, y]) => new THREE.Vector2(r, y));
  const shell = new THREE.Mesh(new THREE.LatheGeometry(points, 32), jacket);
  // Die Jacke hat einen Namen, weil der Test ihre Breite misst: Der Rumpf als
  // Ganzes trägt inzwischen Ärmel und Beine, und deren Spannweite ist eine
  // andere Zahl als die des Stoffs, um den es dabei geht.
  shell.name = 'avatar-coat';
  shell.frustumCulled = false;
  group.add(shell);

  // **Die Schürze ist dieselbe Drehform**, nur ein Stück davon und minimal
  // weiter außen: ein Quader vorn stünde an dieser Glocke unten in der Luft und
  // oben im Bauch. So legt sie sich bei jeder Rumpfhöhe an, weil sie mit
  // demselben Faktor mitwächst. `phiStart` zählt von +z (hinten) herum, also
  // liegt die Mitte der Schürze bei π — vorn.
  const apronPoints = BARREL.filter(([, y]) => y >= APRON_BOTTOM && y <= APRON_TOP).map(
    ([r, y]) => new THREE.Vector2(r * 1.008, y),
  );
  const apron = new THREE.Mesh(
    new THREE.LatheGeometry(apronPoints, 20, Math.PI - APRON_WIDTH / 2, APRON_WIDTH),
    apronCloth,
  );
  apron.frustumCulled = false;
  group.add(apron);

  // Das **Schürzenband** in der Farbe der Rolle: ein Streifen quer über die
  // Schürze, dort wo sie gebunden wäre. Er ist der Grund, warum man aus 16 m
  // Höhe sieht, welche Farbe jemand hat, obwohl die Schürze weiß ist — eine
  // weiße Fläche mit einem farbigen Gurt liest sich schneller als eine
  // farbige Fläche neben einer weißen.
  const sashPoints = BARREL.filter(([, y]) => y >= APRON_TIE - 0.055 && y <= APRON_TIE + 0.055).map(
    ([r, y]) => new THREE.Vector2(r * 1.024, y),
  );
  const sash =
    sashPoints.length >= 2
      ? new THREE.Mesh(
          new THREE.LatheGeometry(sashPoints, 20, Math.PI - APRON_WIDTH / 2, APRON_WIDTH),
          suit,
        )
      : null;
  if (sash) {
    sash.frustumCulled = false;
    group.add(sash);
  }

  // Die Knopfleiste sitzt auf der Schürze. Schwarz und nicht in der Farbe der
  // Jacke: Bei den Vorbildern sind es drei dunkle Punkte auf Weiß, und drei
  // dunkle Punkte sind aus jeder Entfernung drei dunkle Punkte.
  const buttonStuff = trim(CHEF.button, 0.45);
  const buttons = [0.44, 0.56, 0.68].map((fraction) => {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.018, 14), buttonStuff);
    button.rotation.x = Math.PI / 2;
    button.position.z = -(barrelRadius(fraction) * 1.008 + 0.012);
    return { button, fraction };
  });
  for (const { button } of buttons) group.add(button);

  // --- Ärmel ---------------------------------------------------------------
  // **Kurze Stummel und keine Arme.** Die Hände dieser Figur folgen dem, was
  // die Brille trackt, und liegen dabei überall — ein Unterarm dazwischen wäre
  // eine Kette aus zwei Gelenken, die man nur falsch lösen kann. Ein Stummel an
  // der Schulter macht dagegen genau das, was der Silhouette fehlt: Schultern.
  // Die Vorbilder haben auch kaum mehr als das.
  const sleeves = [-1, 1].map((sign) => {
    const pivot = new THREE.Group();
    pivot.name = sign < 0 ? 'sleeve-left' : 'sleeve-right';
    // Der Ärmel ist **entlang −z** gebaut und wird von `setArms` dorthin
    // gedreht, wo die Hand ist. Drei Teile, und jedes aus einem Grund:
    //
    // - Die **Schulterkugel** sitzt fest am Rumpf und wird nie gestreckt. Sie
    //   ist das runde Stück, das aus der Jacke herauswächst.
    // - Das **Rohr** dazwischen ist das einzige, was sich in der Länge ändert.
    //   Eine Kapsel wäre hier falsch: Streckt man sie, werden ihre Kuppen zu
    //   flachen Scheiben, und man sieht dem Ärmel in die offene Röhre.
    // - Der **Aufschlag** am Ende ist wieder eine Kugel — er schließt das Rohr
    //   und trägt die Farbe der Rolle, wie Halstuch und Schürzenband.
    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(SLEEVE_RADIUS * 1.08, 14, 10), jacket);
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(SLEEVE_RADIUS, SLEEVE_RADIUS * 0.84, 1, 14),
      jacket,
    );
    upper.rotation.x = Math.PI / 2;
    upper.frustumCulled = false;
    const cuff = new THREE.Mesh(new THREE.SphereGeometry(SLEEVE_RADIUS * 0.86, 14, 10), suit);
    cuff.scale.set(1, 1, 0.72);
    pivot.add(deltoid, upper, cuff);
    group.add(pivot);
    return { pivot, upper, cuff, sign };
  });

  // --- Halstuch ------------------------------------------------------------
  // **Das Halstuch ist ein Wulst mit Knoten**, kein Kragen: ein Ring unter dem
  // Kopf und davor der Knoten mit zwei Zipfeln. Er ist das, was den Kopf
  // aufsitzen lässt, statt ihn auf einem Hals schweben zu lassen — einen Hals
  // hat diese Figur nicht.
  const collarRadius = barrelRadius(COLLAR) + 0.008;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(collarRadius, 0.031, 10, 28), suit);
  collar.rotation.x = Math.PI / 2;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), suit);
  knot.scale.set(1.15, 1, 0.9);
  knot.position.z = -(collarRadius + 0.022);
  // Zwei Zipfel, die unter dem Knoten auf die Schürze fallen — das Stück, an
  // dem ein Halstuch als Tuch und nicht als Schlauch zu erkennen ist.
  const tails = [-1, 1].map((sign) => {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.13, 10), suit);
    tail.position.set(sign * 0.045, -0.06, -(collarRadius + 0.012));
    tail.rotation.set(-0.35, 0, sign * 0.3);
    return tail;
  });
  group.add(collar, knot, ...tails);

  // Die Ringe der gestreiften Jacke laufen **nur um den Rücken** — vorn liegt
  // die Schürze, und ein Ring, der durch sie hindurchschneidet, sieht aus wie
  // ein Fehler und nicht wie ein Streifen. `thetaStart` zählt wie `phiStart`
  // von +z (hinten) herum, und die Schürze liegt bei π — der Bogen fängt also
  // an ihrer einen Kante an und hört an der anderen auf.
  const backStart = Math.PI + APRON_WIDTH / 2;
  const backSpan = Math.PI * 2 - APRON_WIDTH;
  const rings = look.stripes
    ? [0.44, 0.6, 0.76].map((fraction) => {
        // **Ein Zylinder wäre falsch.** Der Rumpf verjüngt sich, ein Zylinder
        // nicht: Oben stünde der Ring in der Luft, unten steckte er im Stoff,
        // und dazwischen fransen beide Flächen ineinander. Derselbe
        // Drehkörper-Ausschnitt wie bei der Schürze legt sich dagegen an.
        const band = [fraction - 0.03, fraction, fraction + 0.03].map(
          (y) => new THREE.Vector2(barrelRadius(y) * 1.012, y),
        );
        const ring = new THREE.Mesh(
          new THREE.LatheGeometry(band, 22, backStart, backSpan),
          trimStuff,
        );
        ring.frustumCulled = false;
        return { ring };
      })
    : [];
  for (const { ring } of rings) group.add(ring);

  /** Wie lang ein Bein bei dieser Rumpfhöhe ist, von der Hüfte bis zur Sohle. */
  let legLength = 0;
  let hipY = 0;
  /** Auf welcher Höhe die Ärmel ansetzen — `setHeight` schreibt sie fort. */
  let shoulderY = 0;

  return {
    group,
    setHeight(height: number): void {
      shell.scale.set(1, height, 1);
      // Dieselbe Streckung wie die Hülle — Schürze und Band sind ja ihre
      // Ausschnitte.
      apron.scale.set(1, height, 1);
      sash?.scale.set(1, height, 1);
      for (const { button, fraction } of buttons) button.position.y = height * fraction;
      for (const { ring } of rings) ring.scale.set(1, height, 1);
      collar.position.y = height * COLLAR;
      knot.position.y = height * COLLAR;
      for (const tail of tails) tail.position.y = height * COLLAR - 0.06;

      // Die Hüfte liegt **im** Rock, ein Stück über dem Saum: Ein Bein, das
      // erst darunter anfängt, hat beim Ausschwingen oben eine Lücke.
      hipY = height * (HEM + 0.06);
      shoulderY = height * SHOULDER;
      // **Die Sohle liegt auf dem Boden**, nicht die Beinmitte: Die Länge des
      // Beins ist der Weg von der Hüfte bis dorthin, wo der Schuh gerade noch
      // Platz hat. Die Kapsel ist um ihre Mitte gebaut und wird deshalb um die
      // halbe Länge nach unten gerückt; der Schuh sitzt an ihrem Ende.
      legLength = Math.max(hipY - SHOE_DROP, 0.05);
      for (const { hip, shank, shoe, sign } of legs) {
        hip.position.set(sign * LEG_SIDE, hipY, 0);
        shank.scale.set(1, legLength, 1);
        shank.position.y = -legLength / 2;
        shoe.position.y = -legLength;
      }
    },
    setStride(phase: number, amount: number): void {
      // Volle Schrittweite sind gut 30° je Bein — mehr sieht aus wie Marschieren.
      const swing = 0.54 * amount;
      for (const { hip, sign } of legs) {
        hip.rotation.x = Math.sin(phase + (sign < 0 ? 0 : Math.PI)) * swing;
      }
    },
    setArms(left: THREE.Vector3, right: THREE.Vector3): void {
      for (const { pivot, upper, cuff, sign } of sleeves) {
        // Die Schulter sitzt dort, wo die Jacke an dieser Höhe dick ist —
        // wieder aus der Kurve und nicht geraten.
        pivot.position.set(
          sign * barrelRadius(SHOULDER) * 0.92,
          shoulderY,
          -barrelRadius(SHOULDER) * 0.12,
        );
        const hand = sign < 0 ? left : right;
        _reach.copy(hand).sub(pivot.position);
        const distance = _reach.length();
        if (distance < 1e-4) continue;
        // **Nicht `lookAt`**: Das rechnet in Weltkoordinaten, und dieser Ärmel
        // hängt in einem Rumpf, der sich dreht und verschiebt. Die Drehung
        // wird deshalb direkt aus der Richtung gebaut — von der eigenen −z
        // auf den Weg zur Hand.
        _reach.divideScalar(distance);
        // **Der Ärmel zeigt nicht ganz auf die Hand.** Hinge er stur an ihr,
        // klebte er im Stand senkrecht am Rumpf und verschwände darin — und
        // genau die Schulter, für die er da ist, sähe man nicht. Ein Viertel
        // nach außen dazugemischt hält ihn immer ein Stück vom Körper weg,
        // ohne dass er beim Greifen in die falsche Richtung zeigt.
        _reach.x += sign * 0.3;
        _reach.y += 0.04;
        _reach.normalize();
        pivot.quaternion.setFromUnitVectors(_back, _reach);
        // Der Ärmel reicht **nicht** bis zur Hand: Er ist ein kurzes Stück
        // Stoff an der Schulter, und zwischen Aufschlag und Handrücken bleibt
        // der Unterarm frei — so sind die Vorbilder gebaut. Er wächst aber
        // mit, damit die Lücke bei ausgestrecktem Arm nicht aufreißt.
        const length = Math.max(Math.min(distance * 0.5, distance), SLEEVE_LENGTH);
        upper.scale.set(1, length, 1);
        upper.position.z = -length / 2;
        cuff.position.z = -length;
      }
    },
  };
}

/**
 * **Die Hand** — ein fingerloser Fäustling, der **neben** dem Körper schwebt.
 *
 * Hier lagen gleich zwei Fassungen daneben. Die erste war eine **Kugel**: aus
 * 16 m Höhe reichte das, aber sobald zwei Spieler nebeneinander standen, war
 * es eine Perle am Arm. Die zweite hatte vier ausmodellierte Finger und einen
 * Daumen — und sah aus wie ein Bündel Bananen, weil vier Wülste nebeneinander
 * aus jeder Entfernung vier Wülste bleiben.
 *
 * Nachgemessen an den Vorbildern ist es **beides nicht**: Deren Hand ist ein
 * glatter, leicht gebogener Klumpen **ohne einen einzigen Finger**, gut ein
 * Fünftel so breit wie der Kopf und fast halb so lang wie er hoch ist — also
 * ein großes, weiches Ding, das man auch aus der Ferne sieht, weil es eine
 * Form hat und keine Details. Der Daumen bleibt als flacher Wulst, und zwar
 * aus einem Grund, den die Vorbilder nicht haben: Diese Hände halten Werkzeug,
 * und ohne Daumen sieht man nicht, welche Seite die Handfläche ist.
 *
 * Gerechnet wird in `HAND_RADIUS`. **−z ist vorn**, +y ist der Handrücken —
 * dieselbe Konvention wie im Griff-Raum der getrackten Hand
 * (`core/HandVisuals.ts`), damit ein Werkzeug in derselben Richtung aus ihr
 * herausschaut.
 *
 * @param sign −1 für links, +1 für rechts. Der Daumen ist das einzige Stück,
 *   an dem sich beide Hände unterscheiden; alles andere ist spiegelsymmetrisch.
 */
export function buildHand(sign: -1 | 1, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = sign < 0 ? 'avatar-hand-left' : 'avatar-hand-right';
  const h = HAND_RADIUS;

  // Der Klumpen: entlang −z gestreckt, nach vorn hin dicker. Die dicke Seite
  // ist die Faust, die dünne der Ansatz zum Arm — das ist die ganze Form.
  const fist = new THREE.Mesh(squarish(h, 0.22, 18), material);
  fist.scale.set(0.9, 0.82, 1.5);
  fist.position.z = -h * 0.22;
  fist.frustumCulled = false;
  group.add(fist);

  const wrist = new THREE.Mesh(new THREE.SphereGeometry(h * 0.62, 12, 10), material);
  wrist.position.z = h * 0.55;
  wrist.frustumCulled = false;
  group.add(wrist);

  // Der Daumen liegt **an** der Hand und steht nicht davon ab: ein flacher
  // Wulst auf der Innenseite, der sagt, wo die Handfläche ist.
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(h * 0.42, 12, 10), material);
  thumb.position.set(-sign * h * 0.6, -h * 0.05, -h * 0.34);
  thumb.scale.set(0.62, 0.62, 1.15);
  thumb.rotation.y = -sign * 0.5;
  thumb.frustumCulled = false;
  group.add(thumb);

  return group;
}
