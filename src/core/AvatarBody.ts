import * as THREE from 'three';
import { buildHeadgear, headgearFor, type HeadgearKind } from './headgear';
import { DEFAULT_APPEARANCE, type Appearance } from './appearance';
import { FIGURE_CHEF, figureHeadRadius, figureHeight, figureLift } from './avatarFigures';
import { figureBoneName } from './kaykitFigureFit';
import type { KaykitFigure } from './kaykitFigure';
import {
  bodyJacket,
  bodyRadius,
  buildBody,
  buildHand,
  buildHead,
  skinTone,
  HEAD_RADIUS,
  type BodyKind,
  type BodyShape,
  type HeadKind,
} from './avatarLook';
import { faceMarks, headBox } from './chefFace';
import { cloth, skin as skinMaterial } from './chefStyle';
import { canLoadModels, CHEF_EYE, POSE_SCALE } from './chefFit';
import {
  graphics,
  idleSquishAmount,
  idleSquishTempo,
  onGraphicsChange,
  squishAmount,
  squishTempo,
} from './graphicsSettings';
import { squishPose, type SquishDrive, type SquishPose } from './squish';
import type { ChefParts } from './chefModel';

/** Head + hand pose used to drive the body, in the body's parent space. */
export interface AvatarLimb {
  position: THREE.Vector3;
  quaternion?: THREE.Quaternion;
}

export interface AvatarBodyOptions {
  /** Colour of the suit (apron and neckerchief — what has no colour of its own). */
  color?: number;
  /** Draw balls at the hand poses — off for the local body, which already has
   *  `HandVisuals`. */
  hands?: boolean;
}

/**
 * Alles unterhalb von `root`, samt seiner Materialien — außer denen, die dem
 * Körper selbst gehören und die nächste Jacke überleben sollen (`keep`).
 */
function disposeTree(root: THREE.Object3D, keep?: ReadonlySet<THREE.Material>): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (material && !keep?.has(material)) material.dispose();
    }
  });
}

/**
 * **Die Hülle eines Modellteils**, aus seiner **Geometrie** gerechnet.
 *
 * Nicht `Box3.setFromObject`: Das rechnet mit Weltmatrizen, und die stimmen
 * beim Zusammensetzen der Figur noch nicht — die Teile hängen in diesem Moment
 * gerade erst am Rig. Die Geometrie dagegen steht schon da.
 */
function measure(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.computeBoundingBox();
    if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox);
  });
  return box;
}

/**
 * **Wie breit ein Teil auf einer bestimmten Höhe ist** — der halbe Abstand
 * seiner äußersten Punkte in einem schmalen Band um `y`.
 *
 * Gebraucht für die Hände: Der Rumpf ist ein Ei, und seine Hülle sagt nur, wie
 * breit er an seiner **dicksten** Stelle ist. Eine Hand, die nach dieser
 * Breite neben die Schulter gesetzt wird, schwebt eine Handbreit im Nichts —
 * genau so sah es aus. Gefragt ist die Breite **dort, wo die Hand hängt**.
 */
function spanAt(root: THREE.Object3D, y: number, band: number): number {
  let widest = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const position = mesh.geometry.getAttribute('position');
    if (!position) return;
    for (let i = 0; i < position.count; i++) {
      if (Math.abs(position.getY(i) - y) > band) continue;
      widest = Math.max(widest, Math.abs(position.getX(i)));
    }
  });
  return widest;
}

const _forward = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _world = new THREE.Vector3();
/** Zwischenlagen für die Knochenrechnung einer Figur — je Bild, nie neu angelegt. */
const _reach = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _swing = new THREE.Quaternion();
const _angles = new THREE.Euler();
/** Höhe und Breite dieses Bildes (`core/squish.ts`) — eines für alle Figuren. */
const _squish: SquishPose = { height: 1, width: 1 };
/** Und was dort hineingerechnet wird — ebenso eines, je Bild neu beschrieben. */
const _drive: {
  -readonly [K in keyof SquishDrive]-?: number;
} = { phase: 0, stride: 0, clock: 0, amount: 0, tempo: 1, idleAmount: 0, idleTempo: 1 };

/**
 * Wie weit die Kopfmitte hinter den Augen sitzt — dort steht auch der Rumpf.
 * Ein Drittel des Kopfhalbmessers: Die Augen sitzen vorn auf der Kugel, nicht
 * in ihrer Mitte, und mit einem größeren Kopf wandert die Mitte weiter zurück.
 */
const NECK_BACK = HEAD_RADIUS * 0.34;

/**
 * **Die Lücke zwischen Hand und Rumpf** — in Metern, und sie ist der Stil.
 *
 * An den Vorbildern ist zwischen der Oberfläche des Rumpfes und der Hand
 * nachgemessen Luft: keine Schulter, kein Ärmel, kein Arm. Die Hände schweben
 * einfach daneben, und das ist neben der Mütze das unverwechselbarste an
 * diesen Figuren. Ein Zwischenstand dieses Umbaus hatte Ärmelstummel, die auf
 * ihre Hand zeigten — sie schlossen genau diese Lücke.
 *
 * Die Hand steht damit auf dem Radius des Rumpfes **plus** dieser Zahl, und
 * sie ragt darüber hinaus: Aus 16 m Höhe und unter 55° (`core/topDownPose.ts`)
 * verschwindet alles hinter dem Rumpf, was nicht neben ihm vorbeischaut, und
 * eine Figur, die von hinten keine Hände hat, greift für den Zuschauer ins
 * Leere.
 */
const HAND_GAP = 0.062;

/** Wie weit **vor** dem Bauch — knapp, die Vorbilder halten die Hände seitlich. */
const HAND_FRONT = 0.12;

/** Auf welchem Anteil der Rumpfhöhe — auf der dicksten Stelle der Jacke. */
const HAND_LIFT = 0.6;

/**
 * **Wie weit der Kopf einer Figur aus dem Regal dem eigenen folgen darf**, in
 * Bogenmaß.
 *
 * Dieselben Deckel wie bei der Puppe im NPC (`worlds/npc/NpcBody.pull`) und aus
 * demselben Grund: Ein Mensch dreht seinen Kopf gegen den Rumpf bis etwa 70°
 * und nickt gut 40°; was darüber hinausgeht, hat er in Wahrheit mit dem ganzen
 * Körper gemacht. Ohne Deckel dreht eine Figur, deren Träger sich umschaut, den
 * Kopf auf den Rücken — und mit einem Skelett sieht das nicht drollig aus,
 * sondern kaputt.
 */
const FIGURE_HEAD_YAW = 1.2;
const FIGURE_HEAD_PITCH = 0.7;

/**
 * **Wie schnell eine Figur ihren Gang wechselt** — die Zeitkonstante, mit der
 * das Tempo geglättet wird, bevor `gait` es zu sehen bekommt.
 *
 * `AvatarBody.speed` ist schon geglättet; das hier ist die zweite Glättung und
 * sie hat einen eigenen Grund: `gait` blendet bei jedem Wechsel 0,2 s über
 * (`kaykitFigureFit.FIGURE_FADE`), und ein Tempo, das um die Schwelle herum
 * zappelt, blendet dann zwanzigmal in der Sekunde zwischen Gehen und Rennen —
 * das sieht aus wie ein Wackelkontakt.
 */
const FIGURE_GAIT_DAMP = 3;

/**
 * **Die Figur** — ein Koch nach dem Vorbild von Overcooked, angetrieben von
 * drei Posen: Kopf plus beide Hände. Mehr weiß ein Headset über seinen Träger
 * nicht, mehr geht auch über das Netz nicht, und deshalb bedient derselbe
 * Körper den eigenen Spieler wie jeden Mitspieler.
 *
 * Kein Skelett mehr, sondern vier Teile: ein **Rumpf** wie eine Kartoffel mit
 * rundem Boden, ein großer runder **Kopf** mit Augen und Nase, und zwei
 * **Hände**, die ohne Arme davor schweben. Das ist keine Vereinfachung aus
 * Bequemlichkeit: Aus der Ansicht von oben, in der hier gespielt wird, waren
 * Ober- und Unterarm zwei graue Striche, und die Blickrichtung sah man
 * überhaupt nicht. Eine Nase sieht man.
 *
 * Gerechnet wird alles im Raum des Elternteils, mit dem Boden auf y = 0.
 */
export class AvatarBody extends THREE.Group {
  /** Yaw of the torso; follows the head with a dead zone, like a real body. */
  bodyYaw = 0;

  readonly head: THREE.Group;
  /** Follows the tracked hands — hang a tool here to show what is being held. */
  readonly handAnchors: [THREE.Object3D, THREE.Object3D];

  /**
   * Die Handkugeln (`options.hands`) — Kinder des Körpers und **nicht** des
   * Ankers. Der Anker sagt mit seiner Sichtbarkeit, ob diese Hand getrackt
   * ist (daran hängt, ob ein Werkzeug darin liegt); die Kugel schwebt auch
   * dann vor dem Rumpf, wenn niemand sie trackt.
   */
  private readonly handMeshes: THREE.Group[] = [];

  /** Die Hände des Modells, sobald es da ist — sonst leer. */
  private readonly modelHands: THREE.Object3D[] = [];

  /**
   * Der Kopf des Modells und die Merkmale, die darauf sitzen.
   *
   * Das Modell hat **einen** Kopf für alle vier Sorten — Schädel, Augen, Nase,
   * Mund sind jedes Mal dieselben. Was sie unterscheidet, wird darauf gesetzt
   * (`core/chefFace.ts`), gebaut in den gemessenen Maßen genau dieses Kopfes.
   * Ohne das zeigte die Umkleide vier Köpfe zur Auswahl, von denen drei
   * aussahen wie der erste.
   */
  private modelFace: THREE.Object3D | null = null;
  private modelMarks: THREE.Group | null = null;
  /** Das Haar auf dem Schädel — es weicht jeder Mütze (`chefFace.ts`). */
  private modelCrown: THREE.Group | null = null;
  /**
   * Für welche Sorte die Merkmale gebaut sind.
   *
   * `setLook` läuft je Mitspieler in **jedem Bild** — ohne diesen Vergleich
   * entstünde vierzigmal je Sekunde ein neuer Bart, und der alte läge beim
   * Sammler.
   */
  private marksKind: HeadKind | null = null;

  /** Die Mütze des Modells. Sie weicht jeder anderen Kopfbedeckung. */
  private modelHat: THREE.Object3D | null = null;

  /** Ob die Hände gezeichnet werden — `setHandsVisible` merkt es sich hier. */
  private handsOn = true;

  /**
   * **Ob der Koch überhaupt zu sehen ist** — er tritt ab, sobald eine Figur
   * aus dem Regal da ist, und kommt zurück, wenn sie wieder abgelegt wird.
   *
   * Ausgeblendet und nicht weggeworfen, dieselbe Regel wie beim Koch-Modell
   * (`wearModel`): Wer zweimal umschaltet, soll nicht zweimal warten.
   */
  private chefOn = true;

  /** Ob der Träger gerade in seinen eigenen Augen steckt (`setSelfView`). */
  private selfView = false;

  /** Trägt den Rumpf des Modells und sein Watscheln (`wearModel`). */
  private sway: THREE.Group | null = null;

  /**
   * Wo eine ungetrackte Hand ruht, wenn das Modell da ist — seitlich und in
   * der Höhe, beides am Rumpf des Modells gemessen (`wearModel`). Ohne Modell
   * bleiben es die Werte der gebauten Figur.
   */
  private idleSide = 0;
  private idleLift = 0;

  /** Wie weit der Kopf hinter der Pose sitzt — beim Modell gar nicht mehr. */
  private neckBack = NECK_BACK;

  /** Der Rumpf: eine Gruppe, damit Drehung und Höhe getrennt bleiben. */
  private readonly torso: THREE.Group;
  private shape: BodyShape | null = null;
  private face: THREE.Group | null = null;
  private headgear: THREE.Group | null = null;

  /** Die Anzugfarbe der Rolle und der Hautton — beide geteilt, beide bleiben. */
  private readonly suit: THREE.MeshStandardMaterial;
  private readonly skin: THREE.MeshStandardMaterial;
  private readonly kept: Set<THREE.Material>;

  /** Was diese Figur gerade trägt (`core/appearance.ts`). */
  private look: Appearance = { ...DEFAULT_APPEARANCE };

  private readonly previous = new THREE.Vector3();
  private hasPrevious = false;
  private walkPhase = 0;
  private speed = 0;

  /**
   * **Wie weit der Kopf der Figur beim Gehen mitwippt**, in Metern — `0` heißt
   * gar nicht, und das ist der Normalfall.
   *
   * Angeschaltet wird es von dem, der etwas trägt (`PlayerAvatar.carry`):
   * Eine Figur, die einen Teller vor sich her balanciert, geht anders als eine
   * mit leeren Händen, und bei _Overcooked_ sieht man genau daran von oben,
   * wer gerade beladen ist.
   *
   * **Und es sitzt am Kopf der Figur, nicht an der Kamera.** Die Figur zeichnet
   * nur, wer sie von außen sieht (`PlayerAvatar`, `LAYER_SELF_ONLY`) — aus den
   * eigenen Augen und in der Brille ist von diesem Wippen nichts zu sehen und
   * nichts zu spüren. Eine Kamera, die im Takt der Schritte nickt, ist am
   * Schirm kein Gefühl von Gehen, sondern Übelkeit, und in der Brille ist sie
   * schlicht verboten: Dort gehört der Kopf dem Menschen davor.
   */
  headBob = 0;
  private bobNow = 0;

  /**
   * **Wie stark sich die Figur beim Laufen staucht und streckt** — 0 heißt:
   * gar nicht, und das ist der Auslieferungszustand (`core/squish.ts`).
   *
   * Der Wert kommt aus _Grafik → Animationen_ und wird nachgeführt, sobald
   * dort etwas umgestellt wird (`onGraphicsChange`) — gelesen wird die
   * Einstellung also einmal je Änderung und nicht je Bild und Figur. Er steht
   * trotzdem offen: Wer eine Figur außerhalb des Spiels zeigt — die Vorschau,
   * ein Test —, hat kein Menü und darf ihn selbst setzen.
   *
   * **Und er sitzt an der Figur, nicht an der Kamera**, genauso wie das
   * Wippen darüber: Zu sehen ist das nur von außen. Wem beim Laufen die
   * eigenen Augen zusammengedrückt würden, dem wäre in der Brille nach einer
   * Minute schlecht.
   */
  squish = squishAmount(graphics());
  /**
   * **Wie schnell sie dabei durch die Kurve läuft** — 1 ist ein Federn je
   * Schritt, die Vorgabe 0,5 eines auf zwei Schritte.
   *
   * Eine zweite Zahl neben der Stärke darüber, und aus demselben Grund
   * öffentlich. Ein Federn im Takt des Watschelns war die erste Fassung und
   * zu hektisch: Zwei Bewegungen derselben Frequenz übereinander sind keine
   * zwei, sondern ein Flimmern.
   */
  squishSpeed = squishTempo(graphics());
  /**
   * **Wie tief sie im Stehen atmet** — 0 heißt: gar nicht, und das ist der
   * Auslieferungszustand (`core/squish.ts`, `IDLE_AMPLITUDE`).
   *
   * Dieselbe Bauart wie die beiden Zahlen darüber, und aus demselben Grund
   * eine eigene: Wer die Figur beim Laufen federn sehen will, will damit noch
   * lange nicht, dass sie im Stand pumpt.
   */
  idleSquish = idleSquishAmount(graphics());
  /** **Wie schnell sie atmet** — 1 ist ein Atemzug je `IDLE_PERIOD`. */
  idleSquishSpeed = idleSquishTempo(graphics());
  /**
   * **Die Uhr des Atmens**, in Sekunden — sie läuft, solange die Figur da ist.
   *
   * Eine eigene Uhr und nicht die Taktphase des Laufens: Die steht im Stand
   * still, und genau dort soll der Atem gehen. Sie läuft auch beim Laufen
   * weiter, damit das Atmen nicht bei jedem Halt von vorn anfängt.
   */
  private idleClock = 0;
  /** Die Höhe dieses Bildes als Vielfaches — nach außen `stretch`. */
  private stretchNow = 1;
  /** Meldet die Figur wieder ab, wenn sie weggeräumt wird (`dispose`). */
  private readonly stopGraphics: () => void;

  /**
   * **Der Ausschlag dieses Bildes**, in Metern (negativ = tiefer).
   *
   * Damit wippt mit, was die Figur trägt (`worlds/test/zones/kitchen.ts`): Ein
   * Burger, der ruhig vor einem wippenden Koch schwebt, ist schlimmer als gar
   * kein Wippen.
   */
  get bob(): number {
    return this.bobNow;
  }

  /**
   * **Wie hoch die Figur in diesem Bild steht**, als Vielfaches ihrer Höhe —
   * 1 heißt: ungestaucht.
   *
   * Das Gegenstück zu `bob` und aus demselben Grund öffentlich: Was die Figur
   * **hält**, muss mitgehen. Von oben hängt ein Werkzeug an einer festen
   * Stelle vor ihrer rechten Faust (`worlds/portal/screenHand.ts`) und ein
   * getragener Gegenstand vor ihrem Bauch (`core/screenCarry.ts`) — beide am
   * Rig und nicht an dieser Figur, denn in der Brille gibt es sie hier gar
   * nicht. Ohne diese Zahl bliebe die Pistole auf ihrer Höhe stehen, während
   * die Hand darunter auf und ab federt, und genau das sah man sofort.
   */
  get stretch(): number {
    return this.stretchNow;
  }

  /**
   * **Auf welcher Höhe die Augen dieser Figur stehen** — fest, und nicht mehr
   * die des Spielers (`core/chefModel.ts`). Solange nur die gebaute Figur da
   * ist, ist es dieselbe Zahl: Beide sollen gleich groß sein, sonst wächst
   * der Mitspieler in dem Moment, in dem seine Datei ankommt.
   */
  private readonly eyeY = CHEF_EYE;

  /**
   * Das geladene Modell dieser Figur, sobald es da ist (`core/chefModel.ts`).
   * Solange es `null` ist, steht die gebaute Figur — und wenn es `null`
   * bleibt, bleibt sie stehen.
   */
  private model: ChefParts | null = null;
  /** Ob diese Figur schon weggeräumt wurde, als das Modell ankam. */
  private gone = false;

  // --- die Figur aus dem Regal (`core/avatarFigures.ts`) ---------------------

  /**
   * **Die geladene Figur**, oder `null` für den Koch.
   *
   * Sie hängt als eigenes Kind an dieser Gruppe und nicht unter `torso`: Sie
   * bringt Beine mit, steht also auf dem Boden und dreht sich um ihre eigene
   * Hochachse — der Rumpf des Kochs dagegen ist eine Form ohne Unterbau, die
   * von der Kopfhöhe gestaucht wird.
   */
  private figure: KaykitFigure | null = null;
  /**
   * **Die wievielte Bestellung gerade gilt.**
   *
   * Eine Figur kommt über das Netz und braucht dafür ein paar hundert
   * Millisekunden; wer in dieser Zeit zweimal weiterschaltet, bekommt zwei
   * Antworten in unbekannter Reihenfolge. Jede Antwort vergleicht ihre Nummer
   * mit dieser und wirft sich weg, wenn sie nicht mehr gemeint ist.
   *
   * Eine **Nummer** und nicht die Adresse: Wer vom Ritter zum Koch und zurück
   * zum Ritter schaltet, hat zwei Bestellungen für dieselbe Adresse unterwegs
   * — ein Vergleich der Adressen ließe beide herein, und die zweite Figur
   * stünde in der ersten.
   */
  private figureEra = 0;
  /** Ihr Kopfknochen — daran hängt der Hut und der Blick. */
  private figureHeadBone: THREE.Object3D | null = null;
  /** Seine Drehung in der Bindepose (siehe `pullFigure`). */
  private readonly figureHeadRest = new THREE.Quaternion();
  /** Wie hoch der Kopfknochen über den Sohlen steht, in Metern, nach Maßstab. */
  private figureHeadY = 0;
  /** Die Verkleinerung, mit der ihr Kopf auf Kochhöhe kommt (`figureLift`). */
  private figureScale = 1;
  /** Die beiden Oberarme — links, rechts; `null`, wo das Skelett keinen hat. */
  private figureArms: [THREE.Object3D | null, THREE.Object3D | null] = [null, null];
  /** Der Hut auf ihrem Kopfknochen — sie hat ja keinen `head`-Knoten wie der Koch. */
  private figureHat: THREE.Group | null = null;
  /** Ihr geglättetes Tempo, aus dem `gait` den Gang wählt. */
  private figurePace = 0;

  constructor(options: AvatarBodyOptions = {}) {
    super();
    this.name = 'avatar-body';

    // Stoff und Haut kommen aus der Stilschicht (`core/chefStyle.ts`) und
    // nicht aus drei eigenen Zahlen: Ein Halstuch soll so matt sein wie die
    // Jacke daneben, sonst glänzt in der Brille genau ein Teil der Figur.
    this.suit = cloth(options.color ?? 0x3f6fb5);
    this.skin = skinMaterial(skinTone(DEFAULT_APPEARANCE.head));
    this.kept = new Set<THREE.Material>([this.suit, this.skin]);

    this.torso = new THREE.Group();
    this.torso.name = 'avatar-torso';
    this.add(this.torso);

    this.head = new THREE.Group();
    this.head.name = 'avatar-head';
    this.add(this.head);

    const anchors: THREE.Object3D[] = [];
    for (let i = 0; i < 2; i++) {
      const anchor = new THREE.Object3D();
      anchor.name = i === 0 ? 'hand-left' : 'hand-right';
      // Was in dieser Hand hängt, wird mit ihr kleiner: Ein Werkzeug in
      // Spielergröße steckt in der Faust einer 1,6-m-Figur wie ein Balken.
      anchor.scale.setScalar(POSE_SCALE);
      this.add(anchor);
      anchors.push(anchor);
      if (!options.hands) continue;
      // Ø 19 cm: Zu einem Kopf von 52 cm gehören Fäustlinge und keine Perlen —
      // von oben ist die Hand das, woran man sieht, wohin jemand greift.
      const mitt = buildHand(i === 0 ? -1 : 1, this.skin);
      this.add(mitt);
      this.handMeshes.push(mitt);
    }
    this.handAnchors = [anchors[0]!, anchors[1]!];

    this.buildFace(this.look.head);
    this.buildTorso(this.look.body);

    // Dieselbe Bauart wie bei den Griffen (`core/handleView.ts`): einmal
    // zuhören, und jede Figur im Raum federt im selben Moment mit — auch die
    // der Mitspieler, die niemand hier neu baut.
    this.stopGraphics = onGraphicsChange(() => {
      const settings = graphics();
      this.squish = squishAmount(settings);
      this.squishSpeed = squishTempo(settings);
      this.idleSquish = idleSquishAmount(settings);
      this.idleSquishSpeed = idleSquishTempo(settings);
    });

    // Das Modell kommt asynchron. Bis dahin steht die gebaute Figur; kommt es
    // gar nicht, bleibt sie für immer stehen. `void`, weil hier niemand
    // wartet: Eine Figur, die erst erscheint, wenn eine Datei da ist, ist in
    // der Brille eine Figur, die fehlt.
    //
    // **Der Import ist dynamisch und die Frage steht davor.** `chefModel.ts`
    // zieht `GLTFLoader` und `import.meta` mit sich, und beides bringt einen
    // Jest-Lauf zum Stehen. Wo es kein WebGL gibt, wird das Modul deshalb gar
    // nicht erst angefasst (`core/chefFit.ts`).
    if (canLoadModels()) {
      void import('./chefModel')
        .then(async (module) => module.chefParts())
        .then((parts) => {
          if (!parts || this.gone) return;
          this.wearModel(parts);
        });
    }
  }

  /**
   * **Zieht das geladene Modell an** und blendet die gebaute Figur aus.
   *
   * Ausgeblendet und nicht weggeworfen: Die gebaute Figur hängt an Tests, an
   * `setLook` und an der Umkleide, und sie kostet im Ruhezustand nichts.
   * Zurückgetauscht wird nie — das Modell kommt einmal oder gar nicht.
   */
  private wearModel(parts: ChefParts): void {
    this.model = parts;

    this.head.add(parts.parts.head);
    this.modelFace = parts.parts.head;
    this.modelHat = parts.parts.hat;
    this.head.add(this.modelHat);
    // **Der Rumpf des Modells watschelt mit.** `BodyShape.setStride` schreibt
    // seine Bewegung in die Gruppe der gebauten Figur, und die ist
    // ausgeblendet — also bekommt das Modell eine eigene Gruppe, auf die
    // dieselbe Bewegung kopiert wird. Ein Koch, an dem sich beim Laufen
    // nichts bewegt, rutscht über den Boden, und das war schon einmal der
    // Vorwurf.
    this.sway = new THREE.Group();
    this.sway.name = 'avatar-sway';
    this.sway.add(parts.parts.body);
    this.torso.add(this.sway);
    for (let i = 0; i < 2; i++) {
      const hand = i === 0 ? parts.parts.handLeft : parts.parts.handRight;
      this.add(hand);
      this.modelHands.push(hand);
    }
    // Die gebaute Hand tritt ab, sobald die richtige da ist — und wer sonst
    // noch mitredet, steht an einer Stelle (`applyBodyVisible`).
    this.applyBodyVisible();

    // Die gebaute Figur verschwindet, ihre Gruppen bleiben: An ihnen hängen
    // Drehung, Höhe und die Ebenen-Maske.
    if (this.shape) this.shape.group.visible = false;
    if (this.face) this.face.visible = false;

    // **Wo die Hände ruhen, sagt das Modell** und nicht mehr die Drehkurve der
    // gebauten Figur: Der Rumpf des Modells ist breiter und niedriger, und
    // Hände, die nach der alten Kurve stehen, stecken darin. Gemessen wird
    // einmal beim Anziehen, nicht je Bild — und an der **Geometrie**, nicht
    // über `setFromObject`: Das rechnet mit Weltmatrizen, und die stimmen in
    // diesem Moment noch nicht, weil die Figur gerade erst zusammengesetzt
    // wird.
    const torso = measure(parts.parts.body);
    const fist = measure(parts.parts.handLeft);
    this.idleLift = torso.max.y * HAND_LIFT;
    // **Die Hand steht _neben_ dem Rumpf, und zwar neben der Stelle, an der
    // sie wirklich hängt.** Vorher war es die halbe Hülle des ganzen Rumpfes
    // plus eine Lücke: Der Rumpf ist ein Ei, seine dickste Stelle liegt
    // unterhalb der Hände, und die schwebten damit eine Handbreit im Nichts.
    // Dazu kam, dass die Hand selbst zehn Zentimeter breit ist und gar nicht
    // mitgerechnet wurde — ihre Innenseite steckte in der Jacke. Beides
    // zusammen war „die Hände sitzen komisch".
    this.idleSide =
      spanAt(parts.parts.body, this.idleLift, torso.max.y * 0.06) +
      (fist.max.x - fist.min.x) / 2 +
      HAND_GAP * POSE_SCALE;

    // **Kein Nackenversatz mehr.** Er schob den Kopf hinter die Augen, aus
    // denen die Pose kam — sinnvoll, solange der Kopf an der Kamera hing. Die
    // Figur ist jetzt eine kleine Puppe, die dort steht, wo der Spieler steht;
    // ihre Augen sind nirgends in der Nähe seiner. Ein Kopf, der stattdessen
    // elf Zentimeter hinter dem Rumpf schwebt, ist nur noch ein Fehler.
    this.neckBack = 0;

    this.applyModelLook();
    this.setHeadgear(this.look.hat, true);
    // Neue Kinder erben die Ebene nicht von selbst — dieselbe Zeile wie bei
    // Gesicht, Rumpf und Hut, und ohne sie schwebt dem Spieler sein eigener
    // Kopf vor der Nase (`core/PlayerAvatar.ts`).
    this.head.traverse((object) => (object.layers.mask = this.head.layers.mask));
    this.torso.traverse((object) => (object.layers.mask = this.torso.layers.mask));
    for (const hand of this.modelHands) {
      hand.traverse((object) => (object.layers.mask = this.layers.mask));
    }
  }

  /**
   * **Jacke, Haut und Gesicht des Modells auf die Wahl dieser Figur bringen.**
   *
   * Die Jacke trägt die Farbe aus der **Umkleide** und nicht mehr die der
   * Rolle. Das ist eine Entscheidung und kein Versehen: Das Modell hat genau
   * einen Stoff, beide wollten ihn, und die Rolle gewann — damit war die ganze
   * Zeile _Körper_ im Schrank wirkungslos, und wer _Kochjacke rot_ wählte,
   * lief weiter in Blau herum. Was einem selbst gehört, gewinnt (dieselbe
   * Regel wie beim Helm im Kart, `WorldContext.wear`); die Farbe der Rolle
   * bleibt am Hut, der sie ohnehin schon trug.
   */
  private applyModelLook(): void {
    if (!this.model) return;
    this.model.jacket.color.setHex(bodyJacket(this.look.body));
    this.model.skin.color.setHex(skinTone(this.look.head));
    this.applyModelMarks();
  }

  /**
   * **Bart, Schnauzer, Sommersprossen und Haar auf den Kopf des Modells.**
   *
   * Sie werden aus der **gemessenen** Hülle des Modellkopfes gebaut
   * (`core/chefFace.ts`): Sein Ursprung liegt zwischen den Augen und nicht in
   * seiner Mitte, und seine Gesichtsebene liegt woanders als die der gebauten
   * Figur. Geratene Zahlen ergaben hier einen Bart über dem halben Gesicht.
   */
  private applyModelMarks(): void {
    const face = this.modelFace;
    if (!face || this.marksKind === this.look.head) return;
    this.marksKind = this.look.head;
    if (this.modelMarks) {
      this.modelMarks.removeFromParent();
      disposeTree(this.modelMarks, this.kept);
      this.modelMarks = null;
    }
    const built = faceMarks(this.look.head, headBox(measure(face)));
    face.add(built.group);
    built.group.traverse((object) => (object.layers.mask = this.head.layers.mask));
    this.modelMarks = built.group;
    this.modelCrown = built.crown;
    built.crown.visible = this.look.hat === 'none';
  }

  // --- die Figur aus dem Regal ------------------------------------------------

  /**
   * **Eine andere Figur bestellen** (`core/avatarFigures.ts`).
   *
   * Drei Dinge stehen hier zusammen, und alle drei sind schon einmal einzeln
   * falsch gewesen:
   *
   * - **Der Koch bleibt stehen, bis die andere da ist.** Eine Figur kommt über
   *   die Leitung; wer sie vorher ausblendet, steht für seine Mitspieler eine
   *   halbe Sekunde lang gar nicht da. Dieselbe Regel wie beim Koch-Modell
   *   selbst (`core/chefModel.ts`) und bei den Controllern.
   * - **Wer nicht mehr gemeint ist, wird weggeworfen.** Zweimal weiterschalten
   *   heißt zwei Antworten in unbekannter Reihenfolge; ohne den Vergleich mit
   *   `figureEra` gewänne die langsamere.
   * - **Der Import ist dynamisch und die Frage steht davor.**
   *   `core/kaykitFigure.ts` zieht `GLTFLoader` und `import.meta` mit sich, und
   *   beides bringt einen Jest-Lauf zum Stehen (`canLoadModels`). Ohne WebGL
   *   bleibt es deshalb beim Koch — genau wie ohne Netz.
   */
  private changeFigure(path: string): void {
    const era = ++this.figureEra;
    this.dropFigure();
    if (path === FIGURE_CHEF || !canLoadModels()) return;
    void import('./kaykitFigure')
      .then(async (module) => module.loadKaykitFigure(path, figureHeight(path)))
      .then((figure) => {
        if (!figure) return;
        if (this.gone || era !== this.figureEra) {
          figure.dispose();
          return;
        }
        this.wearFigure(figure);
      });
  }

  /**
   * **Die Figur anziehen** — messen, stauchen, anhängen, Koch abblenden.
   *
   * Gemessen wird der **Kopfknochen**, und daran hängt alles Weitere: Die
   * ganze Figur wird so weit gestaucht oder gestreckt, dass er dort steht, wo
   * der Kopf des Kochs steht (`avatarFigures.figureLift`, und dort steht auch
   * das Warum). Erst danach stimmen Hände, Werkzeug, Teller und `POSE_SCALE`
   * wieder, denn die rechnen alle ihren Abstand **zum Kopf**.
   *
   * Gemessen wird, **bevor** die Figur angehängt wird: Solange ihre Wurzel
   * nirgends hängt, ist die Weltmatrix ihrer Knochen ihre Matrix im Raum
   * dieser Wurzel — und genau die ist gefragt. Danach wäre es die Matrix im
   * Raum des Avatars, und die trägt schon Drehung und Ort der Figur.
   */
  private wearFigure(figure: KaykitFigure): void {
    const root = figure.root;
    root.updateMatrixWorld(true);
    const bone = figure.bones.head;
    const headY = bone ? _world.setFromMatrixPosition(bone.matrixWorld).y : 0;
    const lift = figureLift(headY, figure.height);

    this.figure = figure;
    this.figureHeadBone = bone;
    this.figureHeadY = headY * lift;
    this.figureScale = lift;
    if (bone) this.figureHeadRest.copy(bone.quaternion);
    this.figureArms = [this.armOf(root, 'l'), this.armOf(root, 'r')];
    this.figurePace = this.speed;

    root.scale.setScalar(lift);
    root.name = `avatar-figure:${figure.path}`;
    this.add(root);
    // Neue Kinder erben die Ebene nicht von selbst — dieselbe Zeile wie bei
    // Gesicht, Rumpf und Hut des Kochs, und ohne sie stünde dem Spieler seine
    // eigene Figur mitten im Bild (`core/PlayerAvatar.ts`, `LAYER_SELF_ONLY`).
    root.traverse((object) => (object.layers.mask = this.layers.mask));

    this.chefOn = false;
    this.applyBodyVisible();
    // Der Hut muss an den neuen Kopf — er hing bis eben am Kopf des Kochs.
    this.setHeadgear(this.look.hat, true);
  }

  /**
   * **Die Figur wieder ablegen** — beim Wechsel und beim Aufräumen.
   *
   * Der Hut geht mit: Er hängt an ihrem Kopfknochen, und ein Knochen, der
   * verschwindet, nimmt ihn sonst mit ins Nichts, ohne dass ihn jemand
   * freigibt. Was danach zu sehen ist, entscheidet `setHeadgear` neu.
   */
  private dropFigure(): void {
    this.dropFigureHat();
    this.figureHeadBone = null;
    this.figureArms = [null, null];
    this.figureHeadY = 0;
    this.figureScale = 1;
    const figure = this.figure;
    this.figure = null;
    if (figure) {
      figure.root.removeFromParent();
      figure.dispose();
    }
    this.chefOn = true;
    this.applyBodyVisible();
  }

  private dropFigureHat(): void {
    if (!this.figureHat) return;
    this.figureHat.removeFromParent();
    disposeTree(this.figureHat, this.kept);
    this.figureHat = null;
  }

  /**
   * **Den Oberarm einer Seite suchen.**
   *
   * Die Namen stehen in der Datei mit einem Punkt (`upperarm.r`) und im Baum
   * ohne (`upperarmr`) — `figureBoneName` ist dieselbe Regel, die auch der
   * Lader benutzt (`core/kaykitFigureFit.ts`).
   */
  private armOf(root: THREE.Object3D, side: 'l' | 'r'): THREE.Object3D | null {
    return root.getObjectByName(figureBoneName(`upperarm.${side}`)) ?? null;
  }

  /**
   * **Wie der Hut auf einer Figur aus dem Regal sitzt.**
   *
   * Nicht am `head`-Knoten des Kochs, den es hier gar nicht gibt, sondern am
   * **Kopfknochen** — damit er beim Nicken, Gehen und Umfallen mitgeht, ohne
   * dass ihn jemand je Bild nachführt. `headgearFor` rechnet ihn auf den
   * Halbmesser dieses Kopfes (`core/headgear.ts`), und die eine Zahl dafür
   * kommt aus der Höhe des Knochens (`avatarFigures.figureHeadRadius`).
   *
   * **Der Knochen ist nicht die Kopfmitte**, sondern sitzt unten am Hals: Die
   * Gruppe wird deshalb um einen Halbmesser angehoben — genau so weit, wie
   * eine Kugel, die auf diesem Punkt aufliegt, ihre Mitte darüber hat.
   *
   * Der **Maßstab der Figur** steht auf ihrer Wurzel (`root.scale`) und wirkt
   * damit auch auf den Hut; der Halbmesser ist aber schon in Metern gemessen,
   * also wird er wieder herausgerechnet. Sonst wüchse die Mütze ein zweites
   * Mal mit.
   */
  private fitFigureHat(kind: HeadgearKind): void {
    this.dropFigureHat();
    const bone = this.figureHeadBone;
    const figure = this.figure;
    if (!bone || !figure) return;
    const radius = figureHeadRadius(figure.path, this.figureHeadY);
    if (radius <= 0) return;
    const built = headgearFor(kind, radius, this.suit.color.getHex());
    if (!built) return;
    // **Die Verkleinerung und nicht die Skalierung dieses Bildes**: Auf
    // `root.scale` liegt je Bild auch die Stauchung (`core/squish.ts`), und
    // ein Hut, der sie herausrechnete, wüchse genau dann, wenn die Figur sich
    // duckt.
    const scale = this.figureScale || 1;
    built.scale.multiplyScalar(1 / scale);
    built.position.y = radius / scale;
    bone.add(built);
    built.traverse((object) => (object.layers.mask = this.layers.mask));
    this.figureHat = built;
  }

  /**
   * **Ein Bild einer Figur aus dem Regal** — stehen, gehen, hinsehen, greifen.
   *
   * Der Antrieb ist derselbe wie beim Koch: Kopf und zwei Hände, mehr weiß ein
   * Headset über seinen Träger nicht. Was daraus wird, ist hier ein anderes:
   *
   * - **Der Ort und die Drehung** kommen aus denselben Zahlen wie beim Rumpf
   *   des Kochs (`bodyYaw`) — die Figur steht mit ihren Sohlen auf dem Boden
   *   und dreht sich um ihre Hochachse.
   * - **Der Gang kommt aus dem Tempo** und nicht aus einer Taktkurve: Die
   *   Figur weiß je Bild, wie schnell sie ist, und sucht sich die passende
   *   Spur (`kaykitFigure.gait`). Das Tempo wird ein zweites Mal geglättet,
   *   siehe `FIGURE_GAIT_DAMP`.
   * - **Die Arme gehören dem Gang**, solange niemand sie führt. Eine getrackte
   *   Hand übernimmt ihren Oberarm und zeigt von der Schulter dorthin — ein
   *   Gelenk, kein Ellbogen, dieselbe Vereinfachung wie bei der Puppe im NPC
   *   (`worlds/npc/NpcBody.pull`). Die Länge stimmt dabei nicht; das ist ihr
   *   egal, und aus 16 m Höhe sieht man es nicht.
   * - **Der Kopf folgt gedeckelt** (`FIGURE_HEAD_YAW`, `FIGURE_HEAD_PITCH`).
   *
   * Geschrieben wird **nach** dem Mischer und nicht vor ihm: Er schreibt jedes
   * Bild alle Knochen neu, und wer vorher zielt, zielt ins Vergangene.
   */
  private driveFigure(
    dt: number,
    figure: KaykitFigure,
    baseX: number,
    baseZ: number,
    headYaw: number,
    headPitch: number,
    squish: SquishPose,
    left: AvatarLimb | null,
    right: AvatarLimb | null,
  ): void {
    const root = figure.root;
    root.position.set(baseX, 0, baseZ);
    root.rotation.set(0, this.bodyYaw, 0);
    // **Der Maßstab wird je Bild neu gesetzt und nicht multipliziert.** Auf
    // derselben Achse liegen zwei Dinge: die Verkleinerung der Figur
    // (`figureScale`, einmal gemessen) und die Stauchung dieses Bildes
    // (`core/squish.ts`). Wer die Stauchung auf den stehenden Maßstab
    // draufmultipliziert, hat nach zehn Sekunden eine Figur von der Größe
    // eines Streichholzes — genau so herum ist es leicht falsch.
    root.scale.set(
      this.figureScale * squish.width,
      this.figureScale * squish.height,
      this.figureScale * squish.width,
    );

    this.figurePace += (this.speed - this.figurePace) * Math.min(1, dt * FIGURE_GAIT_DAMP);
    figure.gait(this.figurePace);
    figure.update(dt);

    // Erst jetzt stehen die Knochen dort, wo sie in diesem Bild hingehören —
    // und erst mit frischen Weltmatrizen lässt sich von einer Schulter aus auf
    // eine Hand zielen.
    this.updateMatrixWorld(true);

    const bone = this.figureHeadBone;
    if (bone) {
      // **Der Nickwinkel kehrt sich um**, und das ist kein Vorzeichenfehler:
      // Die Figur ist einmal um die Hochachse gedreht, weil KayKit nach +Z
      // schaut und dieses Spiel nach −Z (`kaykitFigureFit.FIGURE_FACING`). Um
      // die Hochachse macht das nichts, um die Querachse dreht es die
      // Richtung um.
      _angles.set(
        -THREE.MathUtils.clamp(headPitch, -FIGURE_HEAD_PITCH, FIGURE_HEAD_PITCH),
        THREE.MathUtils.clamp(wrapAngle(headYaw - this.bodyYaw), -FIGURE_HEAD_YAW, FIGURE_HEAD_YAW),
        0,
        'YXZ',
      );
      bone.quaternion.setFromEuler(_angles).multiply(this.figureHeadRest);
    }

    for (let i = 0; i < 2; i++) {
      const bone = this.figureArms[i];
      const limb = i === 0 ? left : right;
      const hand = i === 0 ? figure.bones.handLeft : figure.bones.handRight;
      const parent = bone?.parent;
      if (!bone || !parent || !limb || !hand) continue;
      // **Gedreht wird auf die Hand und nicht auf den Oberarm.** Der erste
      // Versuch zielte mit der Ruherichtung des Oberarms — der Richtung zum
      // Ellbogen — und traf damit jedes Ziel um **26° daneben**, immer um
      // dieselben 26°: Ellbogen und Handgelenk haben ihre eigene Beuge, und
      // die steckt zwischen Oberarm und Faust. Nachgemessen an vier ganz
      // verschiedenen Zielen, und viermal kam dieselbe Zahl heraus — das ist
      // kein Zielfehler, sondern ein fester Versatz.
      //
      // Also wird die **gegenwärtige** Richtung genommen, die der Gang gerade
      // gebaut hat, und um genau den Winkel weitergedreht, der sie aufs Ziel
      // legt. Das stimmt auch bei gebeugtem Ellbogen, denn es rechnet mit dem
      // Arm, der wirklich dasteht, statt mit dem aus der Bindepose.
      _aim.setFromMatrixPosition(hand.matrixWorld);
      parent.worldToLocal(_aim).sub(bone.position);
      // Das Handziel steht im Raum des Avatars; der Oberarm rechnet im Raum
      // seines Elternknochens. Der Umweg über die Welt ist der kürzeste, der
      // ohne eine eigene Matrizenkette auskommt — und beide Richtungen gehen
      // durch dieselben Weltmatrizen, die gerade aufgefrischt wurden.
      _reach.copy(this.handAnchors[i]!.position);
      this.localToWorld(_reach);
      parent.worldToLocal(_reach).sub(bone.position);
      if (_aim.lengthSq() < 1e-8 || _reach.lengthSq() < 1e-8) continue;
      bone.quaternion.premultiply(_swing.setFromUnitVectors(_aim.normalize(), _reach.normalize()));
    }

    // **Und wo keine Hand geführt wird, sagt die Figur, wo ihre ist.** Was an
    // einem Anker hängt — ein Werkzeug, ein Teller —, soll dort hängen, wo die
    // Figur gerade hingreift, und das weiß nur ihre Bewegung. Beim Koch war es
    // eine Stelle neben dem Rumpf, weil er keine Arme hat, die irgendwohin
    // führen.
    for (let i = 0; i < 2; i++) {
      const limb = i === 0 ? left : right;
      const hand = i === 0 ? figure.bones.handLeft : figure.bones.handRight;
      if (limb || !hand) continue;
      _reach.setFromMatrixPosition(hand.matrixWorld);
      this.worldToLocal(_reach);
      this.handAnchors[i]!.position.copy(_reach);
    }
  }

  /**
   * **Wie diese Figur aussieht** — Kopf, Hut und Körper auf einmal
   * (`core/appearance.ts`).
   *
   * Eine Methode und nicht drei, weil die drei zusammen ankommen: aus der
   * Einstellung, aus der Umkleide oder mit der Anmeldung eines Mitspielers.
   * Gebaut wird trotzdem nur, was sich wirklich geändert hat — das hier läuft
   * je Mitspieler in jedem Bild.
   */
  setLook(look: Appearance): void {
    if (look.head !== this.look.head) this.buildFace(look.head);
    if (look.body !== this.look.body) this.buildTorso(look.body);
    // **Auf eine Figur aus dem Regal wirken Kopf und Jacke nicht**, und das
    // ist keine Lücke, sondern der Punkt: Ein Ritter bringt sein Kettenhemd
    // mit, ein Roboter hat kein Gesicht, und ein Hautton auf einem Skelett
    // wäre eine Farbe ohne Haut. Gebaut werden sie trotzdem weiter — sie
    // gelten wieder, sobald jemand zum Koch zurückschaltet. Der **Hut** ist
    // die Ausnahme: Er sitzt auf dem Kopfknochen und geht überall mit.
    const swap = look.figure !== this.look.figure;
    this.look = { ...this.look, head: look.head, body: look.body, figure: look.figure };
    if (swap) this.changeFigure(look.figure);
    this.applyModelLook();
    // `force`, wenn die Figur gewechselt hat: Derselbe Hut muss dann an einen
    // anderen Kopf, und ohne das bliebe er am alten hängen.
    this.setHeadgear(look.hat, swap);
  }

  setColor(color: number): void {
    this.suit.color.setHex(color);
    this.suit.emissive.setHex(color).multiplyScalar(0.12);
    // Der Hut trägt die Anzugfarbe, wo er eine trägt — also neu bauen, sonst
    // hätte ein Spieler, der die Rolle wechselt, einen Helm von vorhin auf.
    // Schürze und Halstuch teilen sich dieses Material und folgen von selbst.
    if (this.look.hat !== 'none') this.setHeadgear(this.look.hat, true);
  }

  /**
   * Ob die Handkugeln gezeichnet werden. Ein Körper ohne `options.hands` hat
   * keine, und dann tut das hier nichts.
   */
  protected setHandsVisible(on: boolean): void {
    this.handsOn = on;
    this.applyBodyVisible();
  }

  /**
   * **Wer gerade zu sehen ist** — an einer Stelle, weil drei Schalter darüber
   * mitreden: der Koch tritt ab, wenn eine Figur aus dem Regal da ist
   * (`chefOn`), die Hände lassen sich einzeln abstellen (`handsOn`), und wer
   * in seinen eigenen Augen steckt, sieht seinen Kopf nicht (`selfView`).
   *
   * Vorher standen diese Regeln in zwei Methoden, und die zweite machte die
   * erste rückgängig: `setHandsVisible` schaltete die Hände an, obwohl der
   * Koch gerade gar nicht dastand.
   */
  private applyBodyVisible(): void {
    const chef = this.chefOn;
    const seen = !this.selfView;
    this.head.visible = chef && seen;
    this.torso.visible = chef && seen;
    // Sichtbar ist immer nur eine Sorte Hand: das Modell, wenn es da ist,
    // sonst die gebaute.
    for (const built of this.handMeshes) built.visible = chef && this.handsOn && !this.model;
    for (const hand of this.modelHands) hand.visible = chef && this.handsOn;
    // **Eine Figur aus dem Regal verschwindet ganz.** Beim Koch bleiben die
    // Hände stehen, wenn der Kopf weggeblendet wird — das ist der Sinn einer
    // Ich-Ansicht. Eine gehäutete Figur hat keinen Kopf zum Ausblenden: Ihr
    // Schädel, ihr Rumpf und ihre Hände hängen in **einem** Netz an einem
    // Skelett, und wer daraus den Kopf herausschneiden wollte, müsste die
    // Gewichte lesen. Also geht sie ganz — wer in ihren Augen steckt, sieht
    // statt ihrer Hände die getrackten (`core/HandVisuals.ts`), und das sind
    // ohnehin die eigenen.
    const root = this.figure?.root;
    if (root) root.visible = seen;
  }

  /**
   * **Setzt eine Kopfbedeckung auf** (`core/headgear.ts`).
   *
   * Sie hängt am Kopf und nicht am Körper, und das ist der ganze Trick daran:
   * `setSelfView` blendet den Kopf aus, sobald man in den eigenen Augen steckt
   * — und nimmt den Hut damit von selbst mit. Was man selbst vom eigenen Helm
   * sieht, ist etwas anderes und hängt woanders (`visorFrame`).
   *
   * @param force baut auch dann neu, wenn dieselbe Sorte schon sitzt — nach
   *   einem Farbwechsel des Anzugs.
   */
  setHeadgear(kind: HeadgearKind, force = false): void {
    if (kind === this.look.hat && !force) return;
    this.look = { ...this.look, hat: kind };
    if (this.headgear) {
      this.headgear.removeFromParent();
      disposeTree(this.headgear, this.kept);
      this.headgear = null;
    }
    // **Die Mütze des Modells ist die Kochmütze.** Wer sie aufhat, trägt die
    // modellierte; wer etwas anderes wählt, nimmt sie ab und bekommt die
    // gebaute (`core/headgear.ts`). Ohne diese Zeile säße auf jedem Bauhelm
    // noch eine Mütze darunter.
    // **`none` heißt barhäuptig, auch mit Modell.** Bis hierher behielt die
    // Figur bei `none` die modellierte Kochmütze auf — die Zeile im Schrank
    // heißt aber _Ohne · Barhäuptig_, und wer sie wählte, sah keinen
    // Unterschied zu _Kochmütze_. Von acht Hüten taten damit zwei dasselbe,
    // und der erste war der, den man wieder loswerden wollte.
    if (this.modelHat) this.modelHat.visible = kind === 'chef';
    // **Haar weicht jedem Hut.** Bei der gebauten Figur steckte der Schopf von
    // selbst unter der Mütze; auf dem runderen Kopf des Modells ragte er als
    // brauner Fladen über deren Rand.
    if (this.modelCrown) this.modelCrown.visible = kind === 'none';

    // **Wer eine Figur aus dem Regal trägt, bekommt den Hut auf ihren
    // Kopfknochen** (`fitFigureHat`) und nicht in den `head`-Knoten des Kochs,
    // der dann gar nicht mehr dasteht. Das war der ausdrückliche Wunsch:
    // „Die Kochmütze sollten wir beim Kleiderschrank auch einbauen — zusätzlich
    // auf Charaktere setzen können."
    if (this.figure) {
      this.fitFigureHat(kind);
      return;
    }
    this.dropFigureHat();

    // Und mit Modell braucht die Kochmütze keine zweite: Das Modell bringt
    // seine eigene mit.
    if (this.model && kind === 'chef') return;

    const built = buildHeadgear(kind, this.suit.color.getHex());
    if (!built) return;
    this.headgear = built;
    this.head.add(built);
    // Der Kopf kann auf einer eigenen Ebene liegen (`PlayerAvatar`): Ein Hut,
    // der das nicht mitmacht, schwebte dem Spieler vor der Nase.
    built.traverse((object) => (object.layers.mask = this.head.layers.mask));
  }

  /**
   * Hides everything the wearer would have inside their own eyes. Hands and
   * whatever hangs off them stay — that is the point of a first-person view.
   */
  setSelfView(self: boolean): void {
    this.selfView = self;
    this.applyBodyVisible();
  }

  /**
   * @param head  head pose in this group's parent space
   * @param left  left hand, or null when it is not tracked
   * @param right right hand, or null when it is not tracked
   */
  update(dt: number, head: AvatarLimb, left: AvatarLimb | null, right: AvatarLimb | null): void {
    const headPos = head.position;

    // Torso yaw trails the head; it only catches up past a dead zone.
    if (head.quaternion) _forward.set(0, 0, -1).applyQuaternion(head.quaternion);
    else _forward.set(0, 0, -1);
    const headYaw = Math.atan2(-_forward.x, -_forward.z);
    // Wie weit der Blick nach oben geht, positiv nach oben — gebraucht nur von
    // einer Figur aus dem Regal, deren Kopfknochen mitnickt (`driveFigure`).
    // Der Koch hat dafür keinen Knochen: Sein Kopf ist eine Gruppe und nimmt
    // die Drehung ganz.
    const headPitch = Math.asin(THREE.MathUtils.clamp(_forward.y, -1, 1));
    const difference = wrapAngle(headYaw - this.bodyYaw);
    const slack = THREE.MathUtils.degToRad(38);
    if (Math.abs(difference) > slack) {
      this.bodyYaw += difference - Math.sign(difference) * slack;
    } else if (this.speed > 0.4) {
      this.bodyYaw += difference * Math.min(1, dt * 4);
    }

    // Die Pose kommt von den **Augen**; die Kugel, die man sieht, hat ihren
    // Mittelpunkt ein Stück dahinter — sonst stünde der halbe Kopf vor dem
    // Gesicht in der Luft und der Rumpf schöbe sich nach vorn unter ihm weg.
    const headSin = Math.sin(headYaw);
    const headCos = Math.cos(headYaw);
    this.head.position.set(
      headPos.x + headSin * this.neckBack,
      this.eyeY,
      headPos.z + headCos * this.neckBack,
    );
    if (head.quaternion) this.head.quaternion.copy(head.quaternion);

    // Der Rumpf steht unter dem Kopf, vom Boden bis knapp unter die Kugel.
    // Ducken staucht ihn: Seine Höhe ist die des Kopfes, nicht seine eigene.
    const sin = Math.sin(this.bodyYaw);
    const cos = Math.cos(this.bodyYaw);
    const baseX = headPos.x + sin * this.neckBack;
    const baseZ = headPos.z + cos * this.neckBack;
    // **Die Figur ist immer gleich hoch.** Früher kam ihre Höhe aus der des
    // Spielerkopfes, und Ducken stauchte sie mit. Seit sie ein Modell ist
    // (`core/chefModel.ts`), ist sie 1,6 m hoch und ihre Augen liegen bei
    // 0,91 m — eine Figur, die zur Küche passt und nicht zum Spieler. Ob
    // jemand steht oder sitzt, ändert daran nichts; es gibt kein Bücken mehr.
    const height = Math.max(this.eyeY - HEAD_RADIUS * 0.86, 0.3);
    this.torso.position.set(baseX, 0, baseZ);
    this.torso.rotation.set(0, this.bodyYaw, 0);
    this.shape?.setHeight(height);

    // Tempo treibt das Watscheln und das Pendeln der Hände; im Stehen steht
    // die Figur still. `stride` ist 0 im Stand und 1 ab 1,6 m/s — das ist
    // gutes Gehtempo, und schneller wird der Takt nicht weiter, nur häufiger.
    this.speed += (this.travelSpeed(headPos, dt) - this.speed) * Math.min(1, dt * 8);
    this.walkPhase += dt * Math.min(this.speed, 3) * 4.4;
    const stride = Math.min(this.speed / 1.6, 1);
    const swing = stride * 0.075;
    // Das Wippen: zweimal je Schritt, so weit wie `headBob` erlaubt, und nur
    // am Kopf der Figur (siehe dort).
    this.bobNow = -Math.abs(Math.cos(this.walkPhase)) * stride * this.headBob;
    this.shape?.setStride(this.walkPhase, stride);
    // **Squishy Movement**: die ganze Figur wird im Takt flacher und breiter
    // bzw. länger und schmaler (`core/squish.ts`). Gestreckt wird um die
    // **Sohlen** — der Rumpf steht mit seiner eigenen Null auf dem Boden, und
    // der Kopf fährt mit, indem seine Höhe mitwächst. Andersherum stünde die
    // Figur beim Stauchen im Boden.
    //
    // Und es liegt **über** dem Watscheln, nicht an seiner Stelle: Das
    // Watscheln sitzt eine Gruppe tiefer (`BodyShape.setStride`) und bleibt
    // auch dann, wenn hier nichts eingestellt ist.
    //
    // **Und im Stehen atmet sie** — dieselbe Rechnung mit einer eigenen Uhr
    // und einem Drittel des Ausschlags (`squish.IDLE_AMPLITUDE`). Die Uhr
    // läuft immer, auch während die Figur geht: Ein Atem, der bei jedem Halt
    // von vorn anfinge, setzte bei jedem Halt einen Ruck.
    this.idleClock += dt;
    _drive.phase = this.walkPhase;
    _drive.stride = stride;
    _drive.clock = this.idleClock;
    _drive.amount = this.squish;
    _drive.tempo = this.squishSpeed;
    _drive.idleAmount = this.idleSquish;
    _drive.idleTempo = this.idleSquishSpeed;
    const squish = squishPose(_drive, _squish);
    this.stretchNow = squish.height;
    this.torso.scale.set(squish.width, squish.height, squish.width);
    this.head.scale.set(squish.width, squish.height, squish.width);
    this.head.position.y = this.eyeY * squish.height + this.bobNow;
    // Dieselbe Bewegung auf den Rumpf des Modells — `setStride` kennt nur die
    // gebaute Figur, und die ist ausgeblendet, sobald das Modell da ist.
    if (this.sway && this.shape) {
      this.sway.position.copy(this.shape.group.position);
      this.sway.rotation.copy(this.shape.group.rotation);
      this.sway.scale.copy(this.shape.group.scale);
    }

    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? -1 : 1;
      const limb = i === 0 ? left : right;
      const anchor = this.handAnchors[i]!;

      if (limb) {
        // **Die Pose des Spielers wird gestaucht.** Er schaut aus 1,6 m, seine
        // Figur aus 0,91 m: Eine Hand auf seiner Brusthöhe läge über ihrem
        // Kopf, übernähme man sie unbesehen. Gestaucht wird der **Abstand zum
        // Kopf**, nicht die Weltposition — so bleibt die Figur dort stehen,
        // wo der Spieler steht, und greift trotzdem dorthin, wo er greift.
        _hand.set(
          baseX + (limb.position.x - headPos.x) * POSE_SCALE,
          this.eyeY + (limb.position.y - headPos.y) * POSE_SCALE,
          baseZ + (limb.position.z - headPos.z) * POSE_SCALE,
        );
      } else {
        // Ohne Arme gibt es nichts zu lösen: Die Hand schwebt **neben** dem
        // Rumpf, mit `HAND_GAP` Luft dazwischen, und pendelt beim Laufen vor
        // und zurück. Wie weit außen das ist, sagt die Drehkurve auf dieser
        // Höhe und nicht eine feste Zahl — sonst klebt die Hand an einer
        // schlankeren Figur in der Luft und steckt in einer breiteren drin.
        // `cos/-sin` ist die Rechte des Rumpfes, `-sin/-cos` seine
        // Blickrichtung.
        const phase = this.walkPhase + (i === 0 ? 0 : Math.PI);
        // Und beides geht mit der Stauchung mit: Eine Hand, die neben einer
        // federnden Figur auf ihrer Höhe stehen bleibt, steckt bei jedem
        // Schritt einmal in der Jacke und schwebt einmal daneben.
        const side = sign * (this.idleSide || bodyRadius(HAND_LIFT) + HAND_GAP) * squish.width;
        const lift = (this.idleLift || height * HAND_LIFT) * squish.height;
        const ahead = HAND_FRONT * POSE_SCALE + Math.sin(phase) * swing * POSE_SCALE;
        _hand.set(
          baseX + cos * side - sin * ahead,
          lift - Math.abs(Math.cos(phase)) * swing * 0.4 * POSE_SCALE,
          baseZ - sin * side - cos * ahead,
        );
      }

      anchor.visible = limb !== null;
      anchor.position.copy(_hand);
      if (limb?.quaternion) anchor.quaternion.copy(limb.quaternion);
      const built = this.handMeshes[i];
      if (built) {
        built.position.copy(_hand);
        if (limb?.quaternion) built.quaternion.copy(limb.quaternion);
        else built.rotation.set(0.72, this.bodyYaw, sign * 0.2);
      }
      const modelled = this.modelHands[i];
      if (modelled) {
        modelled.position.copy(_hand);
        // Die Hand des Modells ist schon geformt und geneigt; sie soll nur
        // mit dem Rumpf mitdrehen. Die Neigungen der gebauten Faust darauf
        // anzuwenden, legte sie quer.
        if (limb?.quaternion) modelled.quaternion.copy(limb.quaternion);
        else modelled.rotation.set(0, this.bodyYaw, 0);
      }
    }

    // **Ganz zum Schluss die Figur aus dem Regal**, und zwar aus zwei Gründen
    // in dieser Reihenfolge: Sie zielt mit ihren Oberarmen auf die Handanker,
    // und die stehen erst jetzt; und sie setzt umgekehrt die Anker, die
    // niemand führt, auf ihre eigenen Hände, was die Schleife oben sonst
    // gleich wieder überschriebe.
    const figure = this.figure;
    if (figure) {
      this.driveFigure(dt, figure, baseX, baseZ, headYaw, headPitch, squish, left, right);
    }
  }

  dispose(): void {
    this.gone = true;
    this.stopGraphics();
    // Zuerst die Figur: Ihre Geometrie gehört der Vorlage im Speicher und
    // allen anderen Kopien, und nur sie selbst weiß das (`KaykitFigure.dispose`
    // hält bei `userData.sharedAssets` an). Ein `disposeTree` darüber gäbe
    // Netze frei, die noch in drei anderen Figuren stecken.
    this.dropFigure();
    disposeTree(this);
    for (const material of this.kept) material.dispose();
    this.removeFromParent();
  }

  /** Baut das Gesicht neu — nur bei einem Wechsel, nicht je Bild. */
  private buildFace(kind: HeadKind): void {
    if (this.face) {
      this.face.removeFromParent();
      disposeTree(this.face, this.kept);
    }
    this.face = buildHead(kind);
    this.head.add(this.face);
    // Hände und Gesicht gehören zusammen: Es ist derselbe Mensch.
    this.skin.color.setHex(skinTone(kind));
    this.face.traverse((object) => (object.layers.mask = this.head.layers.mask));
  }

  /** Dasselbe für die Jacke. Die Anzugfarbe bleibt dabei, wo sie ist. */
  private buildTorso(kind: BodyKind): void {
    if (this.shape) {
      this.shape.group.removeFromParent();
      disposeTree(this.shape.group, this.kept);
    }
    this.shape = buildBody(kind, this.suit);
    this.torso.add(this.shape.group);
    this.shape.group.traverse((object) => (object.layers.mask = this.torso.layers.mask));
  }

  /** Horizontal speed of the head in world space — drives the walk cycle. */
  private travelSpeed(headLocal: THREE.Vector3, dt: number): number {
    this.updateMatrixWorld();
    _world.copy(headLocal).applyMatrix4(this.matrixWorld);
    if (!this.hasPrevious) {
      this.previous.set(_world.x, 0, _world.z);
      this.hasPrevious = true;
      return 0;
    }
    const distance = Math.hypot(_world.x - this.previous.x, _world.z - this.previous.z);
    this.previous.set(_world.x, 0, _world.z);
    return dt > 0 ? Math.min(distance / dt, 8) : 0;
  }
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
