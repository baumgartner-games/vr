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
export const HEAD_RADIUS = 0.32;

/**
 * Wie eckig der Kopf ist (`chefStyle.squarish`): 0 wäre eine Kugel, 1 ein
 * Würfel. An den Vorbildern ist der Kopf über 60 % seiner Höhe **fast gleich
 * breit** und hat vorn eine flache Fläche für das Gesicht — das ist eine
 * gefaste Kiste mit einem Eckenradius um ein Fünftel der Kante, und nicht
 * annähernd eine Kugel. Eine der Figuren im Spiel trägt buchstäblich einen
 * Pappkarton als Kopf und fällt damit nicht aus der Reihe.
 */
export const HEAD_BOX = 0.58;

/**
 * **Wie viel breiter die gefaste Kiste an ihrer Ecke ist als eine Kugel**
 * desselben Halbmessers.
 *
 * Genau daran scheiterte beim Umbau jeder Hut, der den Kopf **umfasst**: Eine
 * Mütze, deren Halbmesser aus `HEAD_RADIUS` kommt, liegt vorn und seitlich
 * an — und lässt an den vier Ecken dazwischen die Haut durchblitzen, weil der
 * Kopf dort ein Viertel weiter hinausreicht. Die Zahl wird deshalb
 * **ausgerechnet** und nicht geraten: Sie ist die Reichweite in Richtung der
 * waagerechten Diagonale, und sie geht von selbst mit, wenn jemand `HEAD_BOX`
 * ändert.
 */
export const HEAD_SPREAD = squarishReach(new THREE.Vector3(1, 0, 1).normalize(), HEAD_BOX);

/**
 * Halbmesser des Rumpfes an seiner dicksten Stelle (Ø 74 cm).
 *
 * **Diese Zahl ist kleiner geworden, und das ist der Umbau.** Vorher war der
 * Rumpf 84 cm breit und der Kopf 46 — der Kopf maß also 55 % der Rumpfbreite,
 * und von schräg oben las sich das als Knauf auf einem Kegel. Nachgemessen ist
 * der Kopf an den Vorbildern **fast so breit wie der Rumpf** (1,04 zu 1,14,
 * also 91 %). Hier sind es 64 zu 74 cm, und damit 86 %.
 *
 * Es ist also nicht der Rumpf, der die Figur gedrungen macht, sondern der
 * **Kopf, der ihn oben fast einholt** — und über der Schulter sogar überkragt.
 * Genau diese Einschnürung erkennt das Auge wieder.
 */
export const BODY_RADIUS = 0.37;

/**
 * Halbmesser der Hand (Ø 19 cm) — das Maß, an dem alles an ihr hängt.
 *
 * Nachgemessen ist eine Hand dort **0,23 Kopfhöhen breit und 0,46 lang**: ein
 * großes, längliches Ding, kein Knubbel. `buildHand` zieht die Kugel deshalb
 * entlang ihrer Achse auf gut das Anderthalbfache.
 */
export const HAND_RADIUS = 0.115;

/**
 * **Wo die Hose anfängt**, als Anteil der Rumpfhöhe — und damit die Naht, an
 * der die Figur überhaupt in zwei Teile zerfällt.
 *
 * Die Vorbilder haben **keine Beine**: Ihr Kochkaro ist eine Textur auf dem
 * untersten Achtel des Rumpfes, und darunter schließt der Rumpf als Kuppel
 * auf dem Boden ab. Ein Zwischenstand dieses Umbaus hatte zwei karierte Beine
 * mit Schuhen darunter; das las sich zwar als Koch, war aber nicht der Stil,
 * den es zu treffen galt — und Füße wollte an dieser Figur ausdrücklich
 * niemand.
 *
 * Hier ist der Anteil größer als das Achtel der Vorbilder, und das hat einen
 * Grund: Der Kopf steht auf **Augenhöhe des Spielers**, sonst sehen sich zwei
 * Leute in der Brille nicht in die Augen — die Figur ist damit gut doppelt so
 * hoch wie ein Overcooked-Koch, und diese Höhe muss irgendwohin. Sie geht in
 * die Hose: Die **Jacke** darüber behält damit ihr gedrungenes Maß (gut
 * breiter als hoch), und was darunter übrig bleibt, ist dunkel und tritt
 * zurück. Ein Rumpf, der die ganze Höhe als Jacke nimmt, ist wieder der
 * Kegel, mit dem das hier angefangen hat.
 */
export const HEM = 0.28;

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
 * Der Rumpf, wie ihn `AvatarBody` bewegt: eine Gruppe plus das, was sich an
 * ihm jedes Bild ändert. **Nichts davon baut Geometrie** — es sind `scale`,
 * `position` und `rotation`, sonst läge je Bild ein Netz für den Sammler da.
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
   * **Das Watscheln** — `phase` läuft im Bogenmaß durch, `amount` ist 0 im
   * Stehen und 1 im vollen Lauf.
   *
   * Eine Figur ohne Beine kann nicht schreiten, also wippt sie: Der Rumpf hebt
   * und staucht sich im Takt, rollt dazu seitlich und legt sich ein Stück in
   * die Laufrichtung. Das ist keine Notlösung, sondern genau das, was die
   * Vorbilder tun — und es ist der Unterschied zwischen einer Figur, die geht,
   * und einer, die über den Boden rutscht.
   */
  setStride(phase: number, amount: number): void;
}

/**
 * **Die Drehform des Rumpfes** als Halbmesser in Metern über einer Höhe von
 * 0 bis 1.
 *
 * Der Halbmesser ist absolut, die Höhe ein **Anteil**: Gebaut wird die Form
 * einmal und dann nur in y gestreckt (`setHeight`), damit Ducken den Rumpf
 * staucht, ohne ihn dünn zu machen — und ohne je Bild eine Geometrie für den
 * Sammler zu hinterlassen.
 *
 * Die Kurve ist an den Vorbildern **abgemessen** und nicht erfunden: ein
 * unten schweres Ei, das an seiner breitesten Stelle bei knapp der Hälfte
 * steht, nach oben zur Schulter auf gut die Hälfte einzieht und unten als
 * **geschlossene Kuppel auf dem Boden** aufsitzt. Keine Beine, keine Füße,
 * kein Ausschnitt — die untere Silhouette ist eine durchgehende Rundung, und
 * das ist eines der fünf Dinge, an denen man diese Figuren erkennt.
 *
 * Die Zahlen sind Anteile von `BODY_RADIUS`, damit eine breitere Figur nicht
 * zwanzig Zeilen Handarbeit bedeutet.
 */
const BARREL: ReadonlyArray<readonly [number, number]> = (
  [
    // **Die Hose**: ein schlanker Schlauch, unten als Kuppel geschlossen.
    // Keine zwei Beine, kein Ausschnitt, keine Füße — die untere Silhouette
    // ist eine durchgehende Rundung, und das ist eines der fünf Dinge, an
    // denen man diese Figuren erkennt.
    [0.0, 0.0],
    [0.36, 0.01],
    [0.6, 0.026],
    [0.73, 0.05],
    [0.79, 0.082],
    [0.8, 0.13],
    [0.795, 0.2],
    [0.785, 0.25],
    [0.775, HEM - 0.005],
    // **Der Saum der Jacke** springt darüber heraus: Auf zwei Zentimetern
    // Höhe verdoppelt sich der Halbmesser. Das ist die Taille, und ohne sie
    // ist die Figur ein glattes Ei mit einem karierten Boden — genau das war
    // der Zwischenstand, und es sah aus wie eine Matrjoschka.
    [0.95, HEM],
    [0.99, HEM + 0.04],
    // Von hier an die Jacke: unten am breitesten, nach oben zur Schulter
    // eingezogen.
    [1.0, 0.5],
    [0.99, 0.64],
    [0.96, 0.72],
    [0.915, 0.79],
    [0.85, 0.855],
    // Die Schulter: hier hört die Jacke auf, in sie zu passen, und wird zum
    // Kragen. Schmal genug, dass der Kopf darüber **steht** und seitlich
    // darüber hinauskragt — diese Einschnürung macht die Vorbilder aus.
    [0.76, 0.905],
    [0.64, 0.95],
    [0.53, 0.978],
    [0.38, 0.995],
    [0.0, 1.0],
  ] as ReadonlyArray<readonly [number, number]>
).map(([share, y]) => [share * BODY_RADIUS, y] as const);

/** Von wo bis wo die Knopfleiste reicht, als Anteil der Rumpfhöhe. */
const PLACKET_BOTTOM = HEM + 0.08;
const PLACKET_TOP = 0.9;

/**
 * Wie weit die weiße Blende um den Rumpf greift, im Bogenmaß — **unten** und
 * **oben**.
 *
 * Zwei Zahlen und nicht eine: Bei den Vorbildern ist die Blende ein
 * **Trapez**, oben schmaler als unten, und diese schräge Kante ist die
 * Revers-Linie einer doppelreihigen Kochjacke. Ein Streifen mit parallelen
 * Kanten sieht aus, als hätte jemand Papier auf den Bauch geklebt — das war
 * der Zwischenstand, und von der Seite sah man es sofort.
 */
const PLACKET_WIDE = 2.0;
const PLACKET_NARROW = 1.25;

/** Auf welcher Höhe der Wulst des Halstuchs liegt, als Anteil der Rumpfhöhe. */
const COLLAR = 0.955;

/** Und auf welcher das Schürzenband quer über die Blende läuft. */
const APRON_TIE = 0.56;

/**
 * Wie dick der Rumpf auf der Höhe `fraction` ist, in Metern — zwischen den
 * Stützstellen linear.
 *
 * Alles, was sich an den Rumpf anlegt (Blende, Knöpfe, Ringe, Halstuch),
 * fragt hier statt eine Zahl zu raten. Sonst schwebt beim nächsten Umbau der
 * Kurve ein Knopf vor dem Bauch oder steckt darin.
 */
export function bodyRadius(fraction: number): number {
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
 * **Die Blende** — das weiße Trapez vorn auf der Jacke, als eigenes Netz.
 *
 * `LatheGeometry` kann das nicht: Sie dreht ein Profil um einen **festen**
 * Winkel, und genau der soll hier mit der Höhe schmaler werden. Es sind
 * dreißig Zeilen für ein Gitter aus Zeilen (Höhe) und Spalten (Winkel), bei
 * dem die halbe Winkelbreite je Zeile interpoliert wird — und dafür bekommt
 * die Figur die schräge Revers-Kante, die sie als Kochjacke lesbar macht.
 *
 * Die Höhen sind **Anteile**, die Halbmesser Meter: Damit wächst die Blende
 * beim Ducken genauso mit wie die Jacke darunter, indem der Aufrufer sie in
 * y skaliert.
 */
function placketGeometry(
  bottom: number,
  top: number,
  wide: number,
  narrow: number,
  lift: number,
): THREE.BufferGeometry {
  const rows = 14;
  const columns = 18;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const y = bottom + (top - bottom) * t;
    // Die Kante läuft nicht gerade, sondern biegt sich: unten fast senkrecht,
    // oben schnell einwärts — so fällt Stoff, und so sitzt ein Revers.
    const half = (wide + (narrow - wide) * t * t) / 2;
    const radius = bodyRadius(y) * lift;
    for (let column = 0; column <= columns; column++) {
      // `phi` zählt wie bei `LatheGeometry` von +z (hinten) herum, die Mitte
      // der Blende liegt also bei π — vorn.
      const phi = Math.PI - half + (half * 2 * column) / columns;
      positions.push(Math.sin(phi) * radius, y, Math.cos(phi) * radius);
      uvs.push(column / columns, t);
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column;
      const b = a + columns + 1;
      // Gegen den Uhrzeigersinn von **außen** gesehen — andersherum zeigt
      // die Fläche in den Bauch und wird weggeschnitten. Genau daran war
      // die Blende beim ersten Versuch unsichtbar.
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * **Der Rumpf** — Hose, Jacke, Blende mit doppelter Knopfreihe, Halstuch.
 *
 * Gebaut wird von unten nach oben, und jedes Stück fragt die Drehkurve nach
 * seinem Halbmesser, statt eine Zahl zu raten (`barrelRadius`). Wer die Kurve
 * ändert, verschiebt damit auch Knöpfe, Kragen und Band — und findet keinen
 * Knopf, der vor dem Bauch schwebt.
 *
 * **Keine Arme, keine Schultern, keine Ärmel.** Zwischen Rumpf und Hand ist
 * bei diesen Figuren nichts — und zwar nachgemessen nichts: eine sichtbare
 * Luftlücke. Ein Zwischenstand hatte Ärmelstummel, die auf ihre Hand zeigten;
 * sie schlossen die Lücke, die den Stil ausmacht, und sahen von der Seite aus
 * wie Knochen. `AvatarBody` hält die Hände deshalb auf Abstand
 * (`HAND_GAP`), statt sie anzubinden.
 *
 * @param suit Das Material der **Anzugfarbe der Rolle**. Es wird geteilt und
 *   nicht kopiert: Schürzenband und Halstuch haben keine eigene Farbe, sie
 *   tragen die des Spielers, und ein Farbwechsel soll nicht den halben Körper
 *   neu bauen. Weggeworfen wird es deshalb auch nicht hier, sondern von dem,
 *   dem es gehört (`AvatarBody`).
 */
export function buildBody(kind: BodyKind, suit: THREE.Material): BodyShape {
  const look = BODY_LOOKS[kind];
  const group = new THREE.Group();
  group.name = `avatar-torso-${kind}`;
  const jacketCloth = cloth(look.jacket);
  const trimStuff = cloth(look.trim, 0.82);
  const placketCloth = cloth(CHEF.apron);

  // --- Hose ----------------------------------------------------------------
  // **Unten ist die Figur kariert, und das ist keine Hose, sondern ein Stück
  // derselben Drehform.** Zwei Netze auf einer Kurve: Was unterhalb des Saums
  // liegt, trägt das Kochkaro, was darüber liegt, die Jacke. Die Silhouette
  // bleibt eine einzige durchgehende Rundung — genau das ist der Punkt.
  const trouserPoints = BARREL.filter(([, y]) => y <= HEM - 0.004).map(
    ([r, y]) => new THREE.Vector2(r, y),
  );
  const checks = new THREE.Mesh(new THREE.LatheGeometry(trouserPoints, 32), trousers());
  checks.name = 'avatar-trousers';
  checks.frustumCulled = false;
  group.add(checks);

  // --- Jacke ---------------------------------------------------------------
  const jacketPoints = BARREL.filter(([, y]) => y >= HEM - 0.005).map(
    ([r, y]) => new THREE.Vector2(r, y),
  );
  const shell = new THREE.Mesh(new THREE.LatheGeometry(jacketPoints, 32), jacketCloth);
  // Die Jacke hat einen Namen, weil der Test ihre Breite misst: Sie ist das
  // Stück, dessen Verhältnis zum Kopf über den ganzen Stil entscheidet.
  shell.name = 'avatar-coat';
  shell.frustumCulled = false;
  group.add(shell);

  // Der **Saum** der Jacke als eigener Wulst: Ohne ihn stoßen Karo und Weiß
  // auf einer mathematisch exakten Linie aneinander, und genau das sieht
  // gemacht aus. Ein Stück Stoff hat unten eine Kante.
  const hemRadius = bodyRadius(HEM + 0.02);
  const hemRing = new THREE.Mesh(
    new THREE.TorusGeometry(hemRadius * 0.99, 0.026, 8, 30),
    jacketCloth,
  );
  hemRing.rotation.x = Math.PI / 2;
  group.add(hemRing);

  // --- Blende --------------------------------------------------------------
  const placket = new THREE.Mesh(
    placketGeometry(HEM + 0.055, 0.93, PLACKET_WIDE, PLACKET_NARROW, 1.014),
    placketCloth,
  );
  placket.name = 'avatar-placket';
  placket.frustumCulled = false;
  group.add(placket);

  // **Vier Knöpfe in zwei Spalten**, und die Spalten sind gegeneinander
  // versetzt. Das ist keine Verzierung: Eine Kochjacke ist **doppelreihig**,
  // und drei Knöpfe in einer Reihe in der Mitte waren ein Hemd. Wie weit vorn
  // ein Knopf steht, sagt die Kurve.
  const buttonStuff = trim(CHEF.button, 0.45);
  const buttons: Array<{ button: THREE.Mesh; fraction: number }> = [];
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 2; i++) {
      const fraction =
        PLACKET_BOTTOM +
        (PLACKET_TOP - PLACKET_BOTTOM) * (i === 0 ? 0.34 : 0.72) +
        (side < 0 ? 0.012 : 0);
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), buttonStuff);
      button.scale.set(1, 1, 0.45);
      const radius = bodyRadius(fraction) * 1.012;
      // Die Spalten sitzen auf dem Bogen der Blende und nicht auf einer
      // geraden Linie — der Rumpf ist rund, ein Knopf liegt ihm an.
      const phi = Math.PI + side * 0.28;
      button.position.set(Math.sin(phi) * radius, 0, Math.cos(phi) * radius);
      buttons.push({ button, fraction });
      group.add(button);
    }
  }

  // Das **Schürzenband** in der Farbe der Rolle: ein Streifen quer über die
  // Blende. Er ist der Grund, warum man aus 16 m Höhe sieht, welche Farbe
  // jemand hat, obwohl die Blende weiß ist — eine weiße Fläche mit einem
  // farbigen Gurt liest sich schneller als eine farbige Fläche neben einer
  // weißen.
  const sash = new THREE.Mesh(
    placketGeometry(
      APRON_TIE - 0.028,
      APRON_TIE + 0.028,
      PLACKET_WIDE * 0.92,
      PLACKET_WIDE * 0.92,
      1.024,
    ),
    suit,
  );
  sash.frustumCulled = false;
  group.add(sash);

  // --- Halstuch ------------------------------------------------------------
  // **Das Halstuch ist ein Wulst mit Knoten**, kein Kragen: ein Ring unter dem
  // Kopf und davor der Knoten mit zwei Zipfeln. Er ist das, was den Kopf
  // aufsitzen lässt, statt ihn auf einem Hals schweben zu lassen — einen Hals
  // hat diese Figur nicht.
  const collarRadius = bodyRadius(COLLAR) + 0.01;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(collarRadius, 0.032, 10, 28), suit);
  collar.rotation.x = Math.PI / 2;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), suit);
  knot.scale.set(1.15, 1, 0.9);
  knot.position.z = -(collarRadius + 0.02);
  // Zwei Zipfel, die unter dem Knoten auf die Blende fallen — das Stück, an
  // dem ein Halstuch als Tuch und nicht als Schlauch zu erkennen ist.
  const tails = [-1, 1].map((sign) => {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.14, 10), suit);
    tail.position.set(sign * 0.042, -0.07, -(collarRadius + 0.008));
    tail.rotation.set(-0.35, 0, sign * 0.3);
    return tail;
  });
  group.add(collar, knot, ...tails);

  const rings = look.stripes
    ? [0.58, 0.74, 0.88].map((fraction) => {
        // Nur um den Rücken: Vorn liegt die Blende, und ein Ring, der durch
        // sie hindurchschneidet, sieht aus wie ein Fehler und nicht wie ein
        // Streifen. Ein Zylinder wäre hier außerdem falsch — der Rumpf
        // verjüngt sich, und derselbe Drehkörper-Ausschnitt legt sich an.
        const band = [fraction - 0.028, fraction, fraction + 0.028].map(
          (y) => new THREE.Vector2(bodyRadius(y) * 1.012, y),
        );
        const ring = new THREE.Mesh(
          new THREE.LatheGeometry(band, 22, Math.PI + PLACKET_WIDE / 2, Math.PI * 2 - PLACKET_WIDE),
          trimStuff,
        );
        ring.frustumCulled = false;
        return { ring };
      })
    : [];
  for (const { ring } of rings) group.add(ring);

  /** Die zuletzt gesetzte Rumpfhöhe — das Watscheln rechnet darauf. */
  let standing = 1;

  return {
    group,
    setHeight(height: number): void {
      standing = height;
      for (const mesh of [checks, shell, placket, sash]) mesh.scale.set(1, height, 1);
      for (const { ring } of rings) ring.scale.set(1, height, 1);
      for (const { button, fraction } of buttons) button.position.y = height * fraction;
      hemRing.position.y = height * HEM;
      collar.position.y = height * COLLAR;
      knot.position.y = height * COLLAR;
      for (const tail of tails) tail.position.y = height * COLLAR - 0.07;
    },
    setStride(phase: number, amount: number): void {
      // **Heben und stauchen im Takt.** Eine Figur ohne Beine hebt sich beim
      // Gehen leicht und drückt sich bei der Landung zusammen — das ist der
      // ganze Schritt, und er ist von schräg oben besser zu sehen als jedes
      // Bein. Gestaucht wird der **Rumpf**, nie der Kopf: Der sitzt, wo die
      // Augen sitzen, und ein Kopf, der wippt, ist Übelkeit in der Brille.
      const bob = Math.abs(Math.sin(phase)) * 0.055 * amount;
      const squash = 1 - bob * 0.5;
      group.position.y = bob * standing * 0.28;
      group.scale.set(1 + (1 - squash) * 0.6, squash, 1 + (1 - squash) * 0.6);
      // Und dazu das Rollen: gegen den Takt des Hebens, damit die Figur
      // watschelt statt zu hüpfen.
      group.rotation.z = Math.sin(phase) * 0.07 * amount;
      // Die Neigung nach vorn gehört zum Lauftempo und nicht zum Takt — wer
      // rennt, legt sich hinein.
      group.rotation.x = -0.1 * amount;
    },
  };
}

/**
 * **Die Hand** — ein fingerloser Klumpen, der **neben** dem Körper schwebt.
 *
 * Hier lagen nacheinander drei Fassungen daneben. Die erste war eine **Kugel**:
 * aus 16 m Höhe reichte das, aber neben einem zweiten Spieler war es eine
 * Perle am Arm. Die zweite hatte vier ausmodellierte Finger und sah aus wie
 * ein Bündel Bananen, weil vier Wülste nebeneinander aus jeder Entfernung vier
 * Wülste bleiben. Die dritte hing an einem Ärmelstummel — und schloss damit
 * genau die Lücke, die diesen Stil ausmacht.
 *
 * Nachgemessen ist es ein glatter, leicht gebogener Klumpen **ohne einen
 * einzigen Finger**, gut ein Fünftel so breit wie der Kopf und fast halb so
 * lang wie er hoch ist — also ein großes, weiches Ding, das man auch aus der
 * Ferne sieht, weil es eine Form hat und keine Details. Das dicke Ende ist die
 * Faust, das dünne zeigt zum Körper. Der Daumen bleibt als flacher Wulst, und
 * zwar aus einem Grund, den die Vorbilder nicht haben: Diese Hände halten
 * Werkzeug, und ohne Daumen sieht man nicht, welche Seite die Handfläche ist.
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

  // Der Klumpen: entlang −z auf gut das Anderthalbfache gezogen und nach vorn
  // hin dicker. Kaum gefast — eine Hand ist das weichste an dieser Figur.
  const fist = new THREE.Mesh(squarish(h, 0.16, 18), material);
  fist.scale.set(0.9, 0.84, 1.55);
  fist.position.z = -h * 0.3;
  fist.frustumCulled = false;
  group.add(fist);

  // Das dünne Ende zum Körper hin — es macht aus der Bohne eine Hand, weil
  // man daran sieht, wo sie „aufhört".
  const wrist = new THREE.Mesh(new THREE.SphereGeometry(h * 0.66, 12, 10), material);
  wrist.position.z = h * 0.72;
  wrist.frustumCulled = false;
  group.add(wrist);

  // Der Daumen liegt **an** der Hand und steht nicht davon ab: ein flacher
  // Wulst auf der Innenseite, der sagt, wo die Handfläche ist.
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(h * 0.44, 12, 10), material);
  thumb.position.set(-sign * h * 0.6, -h * 0.06, -h * 0.4);
  thumb.scale.set(0.6, 0.6, 1.2);
  thumb.rotation.y = -sign * 0.45;
  thumb.frustumCulled = false;
  group.add(thumb);

  return group;
}
