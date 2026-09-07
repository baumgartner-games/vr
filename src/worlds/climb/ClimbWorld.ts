import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { ClimbHud } from './ClimbHud';
import { TextPlane } from '../../ui/TextPlane';
import { GRAB_GLOW, GRAB_TINT_EMISSIVE } from '../../core/colors';
import { ALL_GROUPS, GROUP_WORLD } from '../../physics/PhysicsWorld';
import { PhysicsLocomotion } from '../../physics/PhysicsLocomotion';
import { holdColor, holdLabel, type HoldFeature, type HoldMaterial } from './holds';
import { gripReport, seatOf, type ClimbPose, type HandGrip } from './gripQuality';
import { GRAB_AT, SLIP_AT, freshStamina, stepStamina, type Stamina } from './stamina';
import { fatigueTick, landingBuzz, slipTick, ticksBetween } from './gripHaptics';
import type { MenuEntry } from '../../ui/menu';
import type { WorldContext } from '../../core/types';
import type { ControllerState, Handedness } from '../../core/XRInput';

/**
 * **Die Kletterhalle** — die Welt, in der der Greifknopf etwas anderes tut.
 *
 * Überall sonst nimmt Greifen ein Ding in die Hand; hier hängt es den ganzen
 * Spieler an die Wand. Geführt wird dabei niemand: Man fasst hin, wo man will,
 * und die Welt rechnet aus, wie gut das war (`gripQuality.ts`) — nach dem
 * Vorbild von *Cairn*. Wer gut greift, erholt sich; wer sich an schlechten
 * Griffen hochwürgt, dem läuft die Ausdauer aus (`stamina.ts`), und dann geht
 * die Hand ab.
 *
 * Der Körper hängt dabei wirklich an den Händen: Jede greifende Hand bekommt
 * einen **Anker** in der Welt, und der Körper wird jedes Bild so weit
 * verschoben, dass die Hände wieder dort sind (`driveBody`). Zieht man die
 * Hand herunter, geht der Körper hinauf. Mehr ist Klettern nicht.
 *
 * Die Halle ist eine Lehrtafel — jede Wand beantwortet genau eine Frage:
 *
 * - Die **Leiterwand** (perfektes Material): Hier kann nichts passieren. Sie
 *   ist der Nullpunkt und der Weg nach oben für jeden, der erst einmal sehen
 *   will, wie hoch es hier ist.
 * - Die **Rauwand**: der Normalfall, eine Route von Henkeln über Leisten bis
 *   zu Ballen und blanken Flächen. Hier lernt man, was „keine gute Kante
 *   erwischt“ heißt.
 * - Der **Riss** daneben: eine senkrechte Spalte, in die die Hand hineingeht.
 * - Der **Überhang** rechts: derselbe Fels, aber seine Griffe schauen nach
 *   unten. Dagegen lässt sich nichts drücken, der Arm trägt allein — und
 *   dieselbe Leiste ist plötzlich keine Rast mehr.
 * - Die **Glattwand**: poliert und glänzend. Dieselbe Kante trägt weniger,
 *   und die Kraft geht fast doppelt so schnell.
 * - Der **Kamin**: zwei Wände, 95 cm auseinander, fast ohne Griffe. Der
 *   einzige Weg hoch ist, sich dazwischen zu **verspreizen**.
 *
 * Oben endet jede Route auf einem **Podest**, und zwar über einen Schacht und
 * eine **Ausstiegshilfe** (`buildDecks`, `topout`) — beides braucht es, weil
 * die Podeste vor ihren Wänden stehen und nicht hinter ihnen. Die Hilfe ist
 * eine senkrechte Leiter, die oben um die Ecke geht: Ihre Holme laufen über
 * dem Podest waagerecht weiter, und man hangelt sich an ihnen hinüber.
 *
 * Alles andere ist das Portal Labor: derselbe Gürtel (nur leer — hier will
 * man die Hände frei haben), dasselbe Regal, dieselbe Physik, dieselbe
 * geteilte Sitzung. Portale haften an nichts hier drin, und das ist Absicht:
 * Ein Portal an der Hallendecke wäre der kürzeste Weg nach oben und damit das
 * Ende dieser Welt.
 */

/** Innenmaße der Halle. */
const HALL = { halfX: 13, halfZ: 9, height: 10, wall: 0.35 };

/** Wie weit eine Hand neben einem Griff noch zupacken darf. */
const REACH = 0.11;
/** Wie schnell einen die Arme höchstens ziehen dürfen. */
const MAX_CLIMB_SPEED = 6;
/** Und mit wie viel man beim Loslassen davonfliegt — ein Satz, keine Rakete. */
const MAX_LAUNCH_SPEED = 4.5;
/** Wie träge der Zug ist: schnell genug, um sofort zu wirken, träge genug gegen Zittern. */
const DRIVE_BLEND = 25;
/** Wie tief unter den Füßen noch etwas sein darf, das als Tritt zählt. */
const FOOT_PROBE = 0.24;
/** Oberkante der Podeste. */
const DECK = 6.5;
const DECK_T = 0.16;
/**
 * **Der Schacht zwischen Wand und Podest.**
 *
 * Ein Podest steht vor seiner Wand und nicht hinter ihr — wer die Wand
 * hochklettert, hat es also über sich. Bleibt zwischen beiden nur eine
 * Handbreit Luft, endet jede Route unter der Podestkante: Der Körper ist eine
 * Kapsel von 48 cm Durchmesser (`PhysicsLocomotion`), und was nicht
 * durchpasst, hängt fest. Deshalb 90 cm — breiter als der Körper, mit Luft
 * zum Zappeln. Oben aus dem Schacht heraus hilft dann die Ausstiegshilfe
 * (`topout`).
 */
const DECK_GAP = 0.9;
/** Halbmesser des Stahlrohrs, aus dem sie besteht. */
const TOPOUT_TUBE = 0.028;
/**
 * **Wie viel Luft unter ihrer waagerechten Strecke bleibt.**
 *
 * Zwei Meter, und die sind gemessen und nicht geschätzt: Die Strecke läuft
 * über das Podest hinweg, also genau dort, wo man nach dem Ausstieg steht und
 * herumläuft. Vorher lag sie 1,70 m über dem Blech — abzüglich Rohr blieben
 * keine 1,67 m, und wer aufrecht steht, ging mit dem Kopf dagegen und musste
 * sich ducken. Zwei Meter freie Höhe ist Türsturzmaß: Da geht jeder drunter
 * durch, ohne den Kopf einzuziehen.
 */
const TOPOUT_CLEAR = 2;
/**
 * **Wie hoch die Ausstiegshilfe über ihrem Podest liegt.**
 *
 * Nicht bis zur Kante, sondern gut zwei Meter darüber, und das ist der ganze
 * Trick am Aussteigen: Wer sich an einem Griff auf Podesthöhe hochzieht,
 * hängt am Ende **an** der Kante — die Füße baumeln im Schacht, und der Boden
 * ist zwar in Reichweite, aber nicht unter einem. Erst ein Griff über
 * Kopfhöhe über dem Blech lässt einen so weit hochziehen, dass die Füße über
 * dessen Oberkante kommen. Und wer oben steht, hat ihn immer noch in der Hand.
 *
 * Die Zahl ist die Mitte des Rohrs, `TOPOUT_CLEAR` ist die Luft darunter —
 * deshalb steht hier die Summe und keine zweite gerundete Zahl.
 */
const TOPOUT_ABOVE = TOPOUT_CLEAR + TOPOUT_TUBE;
/** Wie weit ihre waagerechte Strecke über die Podestkante hereinreicht. */
const TOPOUT_OVER = 1;
/** Abstand der Sprossen entlang der Leiter. */
const TOPOUT_STEP = 0.42;
/** Halber Abstand ihrer beiden Holme — eine Sprosse ist 62 cm lang. */
const TOPOUT_HALF = 0.31;
/** Wie weit sie vor der Wand steht: so weit, dass die Hand hinter die Holme passt. */
const TOPOUT_OFF = 0.1;
/** Und wie weit die Hand neben einem Holm noch zupacken darf. */
const TOPOUT_REACH = 0.1;

/**
 * **Das Landekissen** — die dicke Matte, auf die man von oben herunterspringt.
 *
 * Sie liegt unter der Innenkante des linken Podestschenkels, und zwar dort und
 * nicht vor der Rauwand: Die Vorderkante des großen Podests hat ein Geländer,
 * der Schenkel keines. Wer oben ankommt und wieder herunter will, geht drei
 * Schritte nach rechts und springt — sechseinhalb Meter, und unten ist etwas
 * Weiches.
 *
 * Weich ist sie nicht in der Physik: Die Kapsel des Spielers landet auf einer
 * festen Fläche wie auf jeder anderen. Weich ist die **Sicht**
 * (`viewSink.ts`) — sie sinkt beim Aufprall ein und federt zurück. Das ist der
 * Unterschied zwischen einer Matte und einem Betonboden, und in der Brille ist
 * es der einzige, den man überhaupt wahrnehmen kann.
 */
const PAD = {
  x: -6.5,
  z: -3.5,
  halfX: 2,
  halfZ: 2.5,
  thick: 0.45,
};
/** Oberkante des Kissens — die Hallenmatte liegt auf null. */
const PAD_TOP = PAD.thick;
/**
 * Ab welcher Fallgeschwindigkeit sich das Einsinken lohnt, in m/s.
 *
 * Darunter ist es kein Sprung, sondern ein Schritt — und ein Boden, der bei
 * jedem Schritt nachgibt, ist kein Kissen, sondern ein Wackelpudding.
 */
const PAD_MIN_SPEED = 2.5;

/** Aus der Wand heraus — im Rahmen einer Ausstiegshilfe. */
const OUTWARD: readonly [number, number, number] = [0, 0, 1];
/** Und nach oben: die Seite, von der man eine waagerechte Stange fasst. */
const UPWARD: readonly [number, number, number] = [0, 1, 0];

/** Ein Griff an einer Wand. */
interface Hold {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  /** Das Material, das der Griff im Ruhezustand trägt — geteilt mit allen seiner Art. */
  skin: THREE.MeshStandardMaterial;
  material: HoldMaterial;
  feature: HoldFeature;
  /** Der Punkt, an dem die Hand am besten sitzt — Weltkoordinaten. */
  grip: THREE.Vector3;
  /** Bei Leisten, Sprossen und Rissen: die Richtung, in der der Griff läuft. */
  axis: THREE.Vector3 | null;
  /** Halbe Länge entlang dieser Achse. */
  half: number;
  /** Wie weit die Hand daneben liegen darf. */
  radius: number;
  /** Aus der Wand heraus. */
  normal: THREE.Vector3;
}

/** Eine Hand, die gerade an der Wand hängt. */
interface Grasp {
  hold: Hold;
  /** Wie gut sie beim Zupacken saß — das ändert sich danach nicht mehr. */
  seat: number;
  /** Der Weltpunkt, an dem die Hand festhängt. */
  anchor: THREE.Vector3;
  /** Wo die Hand jetzt ist — jedes Bild neu, damit nichts pro Bild entsteht. */
  point: THREE.Vector3;
  /** Sekunden seit dem Zupacken — die Uhr der Vibration. */
  time: number;
  /** Halt dieser Hand im letzten Bild. */
  quality: number;
}

const _hand = new THREE.Vector3();
const _head = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _target = new THREE.Vector3();
const _point = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const _feet = new THREE.Vector3();
const _seat = new THREE.Vector3();

/** Der Knoten, an dem die Sachen einer Hand hängen — wie im Portal Labor. */
function gripOf(controller: ControllerState): THREE.Object3D {
  return controller.grip.visible ? controller.grip : controller.targetRay;
}

export class ClimbWorld extends PortalWorld {
  private readonly holds: Hold[] = [];
  private readonly grasps = new Map<Handedness, Grasp>();
  private readonly drive = new THREE.Vector3();
  private readonly probe = new THREE.Raycaster();
  private stamina: Stamina = freshStamina();
  private hud: ClimbHud | null = null;
  private hudOn = true;
  private hudEntry: MenuEntry | null = null;
  /** Welchen Griff eine Hand gerade anleuchtet — damit er wieder ausgeht. */
  private readonly lit = new Map<Handedness, Hold>();
  /** Ob wir dem Rig den Stick abgenommen haben. */
  private lockedByUs = false;
  /** Ob der rechte Stick für die nächste Rastdrehung wieder scharf ist. */
  private turnArmed = true;
  /** Ob der Spieler gerade in der Luft war — sonst ist Landen kein Ereignis. */
  private airborne = false;
  /** Und wie schnell es dabei höchstens nach unten ging, in m/s. */
  private fallSpeed = 0;

  private readonly hallWall = new THREE.MeshStandardMaterial({
    color: 0xb9c2d2,
    roughness: 0.9,
    metalness: 0.02,
  });
  private readonly rock = new THREE.MeshStandardMaterial({
    color: 0x7d7367,
    roughness: 0.98,
    metalness: 0,
  });
  private readonly polished = new THREE.MeshStandardMaterial({
    color: 0x77809b,
    roughness: 0.05,
    metalness: 0.4,
  });
  private readonly board = new THREE.MeshStandardMaterial({
    color: 0x6f7a8d,
    roughness: 0.75,
    metalness: 0.1,
  });
  private readonly padding = new THREE.MeshStandardMaterial({
    color: 0x35577a,
    roughness: 1,
    metalness: 0,
  });
  private readonly steel = new THREE.MeshStandardMaterial({
    color: 0x99a1b2,
    roughness: 0.55,
    metalness: 0.35,
  });
  private readonly wood = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.85 });
  /** Das Landekissen — auffällig rot, damit man es von oben sieht. */
  private readonly cushion = new THREE.MeshStandardMaterial({
    color: 0xc0392b,
    roughness: 1,
    metalness: 0,
  });

  /**
   * Ein Material je Griffart und **eines fürs Leuchten** — nicht eines pro
   * Griff. An den Wänden hängen rund neunzig Stück; neunzig Materialien wären
   * neunzig Zeichenaufrufe für Klötze von zehn Zentimetern.
   */
  private readonly skins = new Map<HoldMaterial, THREE.MeshStandardMaterial>();
  private readonly glow = new THREE.MeshStandardMaterial({
    color: GRAB_GLOW,
    roughness: 0.5,
    metalness: 0.1,
    emissive: GRAB_GLOW,
    emissiveIntensity: 0.85,
  });
  /** Und eine Form je Griffart, aus demselben Grund. */
  private readonly shapes = new Map<WallFeature, THREE.BufferGeometry>();
  /** Die Rohre der Ausstiegshilfen, geteilt über ihre Länge (`tube`). */
  private readonly tubes = new Map<number, THREE.BufferGeometry>();

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    this.hud = new ClimbHud();
    this.hud.mount(ctx.camera);
    this.hud.visible = this.hudOn;
    this.hud.setValues(this.stamina.value, null, null);
  }

  override dispose(ctx: WorldContext): void {
    this.letGo(ctx, 'left', false);
    this.letGo(ctx, 'right', false);
    this.releaseRig(ctx);
    this.hud?.unmount(ctx.camera);
    this.hud = null;
    this.hudEntry = null;
    this.holds.length = 0;
    this.lit.clear();
    this.skins.clear();
    this.shapes.clear();
    this.tubes.clear();
    super.dispose(ctx);
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.updateClimb(dt, ctx);
    this.watchLanding(ctx);
  }

  override menu(): MenuEntry[] {
    const hud: MenuEntry = {
      id: 'climb:hud',
      label: 'Halt-Anzeige',
      sub: 'Ausdauer und Halt im Blickfeld',
      icon: 'settings',
      accent: GRAB_GLOW,
      checked: this.hudOn,
      run: () => {
        this.hudOn = !this.hudOn;
        if (this.hud) this.hud.visible = this.hudOn;
        if (this.hudEntry) this.hudEntry.checked = this.hudOn;
        this.context?.menu.refresh();
        this.context?.notify(this.hudOn ? 'Halt-Anzeige an' : 'Halt-Anzeige aus');
      },
    };
    this.hudEntry = hud;

    return [
      ...super.menu(),
      hud,
      {
        id: 'climb:down',
        label: 'Zurück auf die Matte',
        sub: 'Hände auf, Füße auf den Boden, Ausdauer voll',
        icon: 'reset',
        accent: GRAB_GLOW,
        run: () => this.backToTheMat(),
      },
    ];
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 7.2);
  }

  protected override skyColor(): number {
    return 0x141922;
  }

  protected override lightIntensity(): number {
    return 0.55;
  }

  protected override welcome(): string {
    return 'Kletterhalle · Greifen hält dich an der Wand · unten im Blick: Ausdauer und Halt';
  }

  /** Nichts am Gürtel: Wer klettert, will beide Hände frei haben. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  /** Die Halle ist zurückgesetzt, wenn niemand mehr an ihr hängt. */
  protected override worldReset(): void {
    this.backToTheMat();
  }

  protected override buildEnvironment(): void {
    const hall = new THREE.Group();
    hall.name = 'climbing-hall';
    this.root.add(hall);

    this.buildShell(hall);
    this.buildLadderWall(hall);
    this.buildRoughWall(hall);
    this.buildOverhang(hall);
    this.buildSmoothWall(hall);
    this.buildChimney(hall);
    this.buildDecks(hall);
    this.buildPad(hall);
    this.buildBanner(hall);
    this.buildProps();
  }

  // --- die Halle ------------------------------------------------------------

  /** Matte, Decke, vier Wände und das Licht darüber. */
  private buildShell(hall: THREE.Group): void {
    const { halfX, halfZ, height, wall } = HALL;
    const width = (halfX + wall) * 2;
    const depth = (halfZ + wall) * 2;

    // Die Matte: dick und weich, und sie ist der Grund, warum man hier ohne
    // Seil klettert. Sie liegt eine Handbreit hoch, damit man sie sieht.
    this.slab(hall, this.padding, [width, 0.3, depth], [0, -0.15, 0], false);
    this.slab(hall, this.hallWall, [width, wall, depth], [0, height + wall / 2, 0], false);
    // Eine Halle hat ein Dach, und die Vorschau von oben braucht es weg.
    this.roof = height;

    for (const [size, at] of [
      [
        [width, height, wall],
        [0, height / 2, -halfZ - wall / 2],
      ],
      [
        [width, height, wall],
        [0, height / 2, halfZ + wall / 2],
      ],
      [
        [wall, height, depth],
        [-halfX - wall / 2, height / 2, 0],
      ],
      [
        [wall, height, depth],
        [halfX + wall / 2, height / 2, 0],
      ],
    ] as const) {
      this.slab(hall, this.hallWall, size, at, false);
    }

    for (const [x, z] of [
      [-7, -4],
      [7, -4],
      [-7, 4],
      [7, 4],
      [0, 1],
    ] as const) {
      const lamp = new THREE.PointLight(0xf2f6ff, 24, 36, 2);
      lamp.position.set(x, height - 1.2, z);
      hall.add(lamp);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.16, 14), this.steel);
      shade.position.set(x, height - 1, z);
      hall.add(shade);
    }
  }

  /**
   * **Die Leiterwand.** Perfektes Material: Wer hier hängt, verliert keine
   * Ausdauer, egal wie lange. Sie steht ganz links, weil man in einer Halle
   * zuerst wissen will, wie hoch die Decke ist.
   */
  private buildLadderWall(hall: THREE.Group): void {
    const wall = this.panel(hall, this.board, [3.2, 9, 0.3], [-10.4, 0, -2], Math.PI / 2);
    for (let i = 0; i < 14; i++) this.hold(wall, [0, 0.7 + i * 0.5], 'perfect', 'rung');

    this.sign(hall, [-10.35, 2.4, -3.05], Math.PI / 2, 1.3, {
      title: 'Leiterwand',
      body: 'Perfektes Material: Der Halt ist immer voll, die Ausdauer läuft nie aus.',
      accent: GRAB_GLOW,
    });
  }

  /**
   * **Die Rauwand** — die eigentliche Route, und rechts daneben der Riss.
   *
   * Unten Henkel, in der Mitte Leisten, oben Ballen und blanke Flächen: Wer
   * hochkommt, hat unterwegs gelernt, was der Unterschied ist.
   */
  private buildRoughWall(hall: THREE.Group): void {
    const wall = this.panel(hall, this.rock, [9, 9.4, 0.4], [-3.5, 0, -8.6], 0);

    const route: ReadonlyArray<readonly [number, number, WallFeature]> = [
      [-3.4, 0.75, 'jug'],
      [-2.5, 1.3, 'jug'],
      [-3.2, 1.95, 'jug'],
      [-2.2, 2.4, 'edge'],
      [-3.1, 2.95, 'edge'],
      [-2, 3.4, 'jug'],
      [-2.9, 3.9, 'edge'],
      [-1.9, 4.35, 'sloper'],
      [-2.8, 4.85, 'edge'],
      [-1.7, 5.3, 'edge'],
      [-2.6, 5.8, 'flat'],
      [-1.5, 6.2, 'jug'],
      [-2.4, 6.6, 'jug'],
      [0.2, 1, 'jug'],
      [1.1, 1.65, 'edge'],
      [0.1, 2.2, 'sloper'],
      [1.2, 2.75, 'edge'],
      [0.3, 3.3, 'flat'],
      [1.3, 3.8, 'sloper'],
      [0.4, 4.3, 'edge'],
      [1.4, 4.8, 'flat'],
      [0.5, 5.35, 'edge'],
      [1.5, 5.9, 'jug'],
      [0.6, 6.5, 'jug'],
      // Die **Ausstiegsquerung**: Die Leiter steht am Kopf der linken Spur,
      // und die rechte muss deshalb oben hinüber. Henkel, weil hier niemand
      // mehr Kraft hat.
      [0, 6.55, 'jug'],
      [-0.65, 6.6, 'jug'],
      [-1.3, 6.65, 'jug'],
    ];
    for (const [x, y, feature] of route) this.hold(wall, [x, y], 'rough', feature);

    // Der Riss: eine senkrechte Spalte, in die die Hand hineingeht. Ihre
    // Klemmstellen liegen dicht übereinander — man klemmt, wo man gerade ist.
    for (let i = 0; i < 13; i++) this.hold(wall, [3.4, 0.9 + i * 0.48], 'rough', 'crack');

    this.sign(hall, [-6.5, 1.7, -8.55], 0, 2.6, {
      title: 'Rauwand · Riss',
      body: 'Rauer Fels: Wer die Kante trifft, hält sich. Wer daneben greift, verliert langsam Ausdauer. Rechts der Riss — die Hand geht hinein.',
      accent: 0xffc857,
    });
  }

  /**
   * **Der Überhang.** Ein Stück senkrechte Rauwand, und darüber ein Bauch von
   * 34°.
   *
   * Derselbe Fels und dieselben Griffe wie nebenan — aber ihre Flächen schauen
   * nach unten, und dann gibt es nichts mehr, wogegen man drückt: Der Arm
   * trägt allein (`tiltFactor`). Aus einer Leiste, an der man rastet, wird
   * eine, an der die Uhr läuft; Rasten gibt es hier nur noch an den Henkeln,
   * und die stehen deshalb absichtlich in beiden Spuren.
   */
  private buildOverhang(hall: THREE.Group): void {
    const base = this.panel(hall, this.rock, [5.4, 3.6, 0.4], [5, 0, -8.6], 0);
    for (const [x, y, feature] of [
      [-1.8, 0.8, 'jug'],
      [-0.6, 1.35, 'jug'],
      [-1.6, 1.9, 'edge'],
      [-0.4, 2.45, 'jug'],
      [-1.4, 3, 'jug'],
      [1.2, 1, 'jug'],
      [2, 1.7, 'edge'],
      [1.3, 2.4, 'jug'],
      [2.1, 3.05, 'jug'],
    ] as ReadonlyArray<readonly [number, number, WallFeature]>) {
      this.hold(base, [x, y], 'rough', feature);
    }

    // Und darüber der Bauch: dieselbe Wand, nur 34° über einem. Sie holt damit
    // gut zwei Meter in die Halle aus — genug, dass die Füße ins Leere hängen.
    const roof = this.panel(hall, this.rock, [5.4, 3.9, 0.35], [5, 3.6, -8.55], 0, 0.6);
    for (const [x, y, feature] of [
      [-1.9, 0.35, 'jug'],
      [-0.8, 0.9, 'jug'],
      [-1.7, 1.5, 'edge'],
      [-0.6, 2.05, 'jug'],
      [-1.5, 2.6, 'edge'],
      [-0.4, 3.2, 'jug'],
      [1, 0.5, 'edge'],
      [1.8, 1.2, 'jug'],
      [1.1, 1.9, 'sloper'],
      [1.9, 2.55, 'jug'],
      [0.9, 3.3, 'jug'],
      [-0.5, 3.7, 'jug'],
      [1.5, 3.7, 'jug'],
      // Der Henkel an der Kante des Bauchs, von dem aus die Ausstiegsleiter
      // zu fassen ist — genau zwischen den beiden Spuren.
      [0.5, 3.9, 'jug'],
    ] as ReadonlyArray<readonly [number, number, WallFeature]>) {
      this.hold(roof, [x, y], 'rough', feature);
    }

    this.sign(hall, [6.9, 1.4, -8.55], 0, 1.6, {
      title: 'Überhang',
      body: 'Dieselben Griffe, aber sie schauen nach unten: Der Arm trägt allein. Rasten nur an den Henkeln.',
      accent: 0xff8a2f,
    });
  }

  /**
   * **Die Glattwand.** Polierter Fels, glänzend: dieselbe Kante trägt weniger,
   * und die Kraft geht fast doppelt so schnell weg.
   */
  private buildSmoothWall(hall: THREE.Group): void {
    const wall = this.panel(hall, this.polished, [7, 9.4, 0.4], [10.4, 0, -1.5], -Math.PI / 2);
    const route: ReadonlyArray<readonly [number, number, WallFeature]> = [
      [-2.2, 0.8, 'jug'],
      [-1.3, 1.4, 'jug'],
      [-2.1, 2, 'edge'],
      [-1.1, 2.55, 'edge'],
      [-2, 3.1, 'jug'],
      [-1, 3.7, 'edge'],
      [-1.9, 4.25, 'edge'],
      [-0.8, 4.8, 'jug'],
      [-1.7, 5.35, 'edge'],
      [-0.6, 5.95, 'jug'],
      [-1.5, 6.5, 'jug'],
      [1.4, 1.2, 'sloper'],
      [2.2, 2, 'flat'],
      [1.5, 2.8, 'sloper'],
      [2.3, 3.6, 'flat'],
    ];
    for (const [x, y, feature] of route) this.hold(wall, [x, y], 'smooth', feature);

    this.sign(hall, [10.35, 1.8, 1.4], -Math.PI / 2, 2.2, {
      title: 'Glattwand',
      body: 'Glatter, glänzender Fels. Dieselbe Kante hält schlechter, und die Ausdauer läuft fast doppelt so schnell aus.',
      accent: 0x9fe3ff,
    });
  }

  /**
   * **Der Kamin** — zwei Wände, 95 cm auseinander, fast ohne Griffe.
   *
   * Der Weg hoch ist das **Verspreizen**: eine Hand links, eine rechts, an
   * Flächen, die gegeneinander stehen. Deshalb sind hier absichtlich kaum
   * Kanten — wer sie sucht, kommt nicht weit; wer drückt, schon. Und wer die
   * Arme dabei zu weit auseinandernimmt, merkt sofort, dass Druck einen
   * Winkel braucht.
   */
  private buildChimney(hall: THREE.Group): void {
    const gap = 0.95;
    const left = this.panel(hall, this.rock, [4, 8, 0.4], [-gap / 2, 0, -3], Math.PI / 2);
    const right = this.panel(hall, this.rock, [4, 8, 0.4], [gap / 2, 0, -3], -Math.PI / 2);

    for (const [wall, side] of [
      [left, -1],
      [right, 1],
    ] as const) {
      for (let i = 0; i < 7; i++) {
        // Ein paar wenige Kanten, damit man zwischendurch verschnaufen kann —
        // aber versetzt, damit sie nie beide Hände zugleich retten.
        this.hold(wall, [side * -1.3, 1.1 + i], 'rough', i % 3 === 0 ? 'edge' : 'flat');
        this.hold(wall, [side * 1.2, 1.6 + i], 'rough', 'flat');
      }
    }

    this.sign(hall, [1.9, 2.2, -0.85], 0, 1.8, {
      title: 'Kamin · Verspreizen',
      body: 'Zwei Wände gegeneinander. Eine Hand links, eine rechts, nah beieinander — dann kann man drücken.',
      accent: GRAB_GLOW,
    });
  }

  /**
   * **Die Podeste oben** — der Ort, an dem eine Route zu Ende ist, und die
   * beiden Dinge, ohne die man dort nie ankommt.
   *
   * Ein Podest steht **vor** seiner Wand, in der Halle. Wer die Wand
   * hochklettert, hat es also nicht vor der Nase, sondern über dem Kopf: Die
   * letzten Meter geht es zwischen Wand und Podestkante hindurch. Vorher lag
   * dort eine Handbreit Luft, und damit endete jede Route unter dem Blech —
   * die Kapsel des Körpers (48 cm) passte gar nicht durch. Deshalb hält jedes
   * Podest jetzt `DECK_GAP` Abstand zu seiner Wand: ein **Schacht**, breit
   * genug für den Körper.
   *
   * Durchpassen ist aber nur die halbe Miete: Oben aus dem Schacht heraus
   * hängt man zwar über Podesthöhe, doch der Boden liegt **neben** einem und
   * nicht unter einem. Dafür steht in jedem Schacht eine **Ausstiegshilfe**
   * (`topout`) — senkrecht hoch, über die Podestkante hinaus und dann
   * waagerecht darüber hinweg. Das Geländer bleibt, wo es war: an der
   * Vorderkante, mit der Lücke am Kamin.
   */
  private buildDecks(hall: THREE.Group): void {
    const y = DECK - DECK_T / 2;
    // Vor der Rauwand. Die Hinterkante liegt bei z = -7,7 — genau `DECK_GAP`
    // vor der Wandfläche bei z = -8,6.
    this.slab(hall, this.steel, [9, DECK_T, 2.7], [-3.5, y, -6.35], false);
    // Der Schenkel zur Leiterwand, der beide verbindet.
    this.slab(hall, this.steel, [1.5, DECK_T, 6.2], [-8.75, y, -3.5], false);
    // Über der Glattwand.
    this.slab(hall, this.steel, [1.5, DECK_T, 7], [8.75, y, -1.5], false);
    // Und über dem Überhang: einen halben Meter höher als der Rest, und der
    // Schacht misst sich hier an der **Kante des Bauchs** (z = -6,35), nicht
    // an einer senkrechten Wand — er holt ja aus.
    this.slab(hall, this.steel, [5.4, DECK_T, 1.55], [5, 7 - DECK_T / 2, -4.675], false);

    // Und **je Route eine Ausstiegshilfe** aus dem Schacht heraus: Der Fuß
    // steht dort, wo die Route aufhört, die waagerechte Strecke über dem
    // Podest. Eine Route, die oben keine hat, hört im Nichts auf.
    this.topout(hall, [-5.5, DECK - 0.7, -8.6], 0, DECK, DECK_GAP); // Rauwand
    this.topout(hall, [-0.1, DECK - 0.7, -8.6], 0, DECK, DECK_GAP); // Riss
    this.topout(hall, [-10.4, DECK - 0.7, -2.9], Math.PI / 2, DECK, DECK_GAP); // Leiterwand
    this.topout(hall, [10.4, DECK - 0.7, -3], -Math.PI / 2, DECK, DECK_GAP); // Glattwand
    this.topout(hall, [5.5, 6.3, -6.35], 0, 7, DECK_GAP); // Überhang
    // Der Kamin hat keinen Schacht — sein Podest steht ihm gegenüber, und die
    // Hilfe überbrückt nur die 45 cm bis zu dessen Vorderkante.
    this.topout(hall, [0, DECK - 0.7, -4.55], Math.PI, DECK, 0.45);

    // Ein Geländer an der Vorderkante — mit einer Lücke dort, wo man aus dem
    // Kamin heraussteigt.
    const rail = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.055, 0.055), this.steel);
    rail.position.set(-4.8, DECK + 0.9, -5.05);
    hall.add(rail);
  }

  /**
   * **Das Landekissen** — die Matte, auf die man von oben herunterspringt.
   *
   * Ein Quader, ein Rand und ein Schild; die ganze Arbeit steckt woanders.
   * Physikalisch ist es eine feste Fläche wie jede andere, denn eine Matte, in
   * die der Körper wirklich einsänke, wäre eine Kapsel, die im Boden steckt —
   * und aus der käme sie so schlecht wieder heraus wie aus jeder anderen
   * Fläche, in der sie steckt. Nachgeben tut deshalb nur die **Sicht**
   * (`watchLanding`, `viewSink.ts`), und das ist auch das Einzige, was man
   * überhaupt spürt.
   *
   * Der helle Rand ringsum ist kein Zierrat: Von sechseinhalb Metern Höhe
   * sieht man einen roten Quader auf einer blauen Matte schlecht, eine Kante
   * gut. Wer springt, will vorher wissen, wo er hinkommt.
   */
  private buildPad(hall: THREE.Group): void {
    const width = PAD.halfX * 2;
    const depth = PAD.halfZ * 2;
    this.slab(hall, this.cushion, [width, PAD.thick, depth], [PAD.x, PAD_TOP / 2, PAD.z], false);

    // Der Rand: vier flache Leisten auf der Oberkante, einen Hauch darüber,
    // damit sie nicht in der Fläche darunter flimmern. Bloße Netze, kein
    // `slab` — was acht Millimeter dick ist, hat weder in der Physik noch
    // unter den Flächen etwas zu suchen, auf die man zielt.
    const edge = 0.16;
    const y = PAD_TOP + 0.004;
    for (const [size, at] of [
      [
        [width, 0.008, edge],
        [PAD.x, y, PAD.z - PAD.halfZ + edge / 2],
      ],
      [
        [width, 0.008, edge],
        [PAD.x, y, PAD.z + PAD.halfZ - edge / 2],
      ],
      [
        [edge, 0.008, depth - edge * 2],
        [PAD.x - PAD.halfX + edge / 2, y, PAD.z],
      ],
      [
        [edge, 0.008, depth - edge * 2],
        [PAD.x + PAD.halfX - edge / 2, y, PAD.z],
      ],
    ] as const) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), this.padding);
      strip.position.set(at[0], at[1], at[2]);
      hall.add(strip);
    }

    // Ein Pfosten, damit das Schild nicht in der Luft hängt.
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), this.steel);
    post.position.set(PAD.x, PAD_TOP + 0.75, PAD.z + PAD.halfZ + 0.12);
    hall.add(post);

    this.sign(hall, [PAD.x, PAD_TOP + 1.35, PAD.z + PAD.halfZ + 0.14], 0, 1.6, {
      title: 'Landekissen',
      body: 'Von oben herunterspringen ist hier vorgesehen: Der Schenkel des Podests darüber hat kein Geländer. Unten sinkt man kurz ein und kommt wieder hoch.',
      accent: 0xff6b5a,
    });
  }

  /**
   * **Weich landen.** Wer von oben auf das Kissen fällt, sinkt kurz ein und
   * federt zurück, statt im Aufprallbild stehenzubleiben.
   *
   * Die Fallgeschwindigkeit muss **mitgeschrieben** werden, solange man noch
   * fällt: Im Bild der Landung ist sie längst null — die Physik hat sie
   * gelöscht, dafür ist sie da. Gemerkt wird die schnellste des ganzen Sturzes
   * und nicht die letzte; die letzte ist bei einem Aufprall, der sich über
   * zwei Bilder verteilt, schon die halbe.
   *
   * Und es zählt nur, wer wirklich in der Luft war. Ohne das löste jeder
   * Schritt über eine Kante das Kissen aus — der Körper ist zwischen zwei
   * Schritten ständig für ein Bild nicht am Boden.
   */
  private watchLanding(ctx: WorldContext): void {
    const loco = ctx.rig.locomotion;
    if (!(loco instanceof PhysicsLocomotion)) return;

    if (!loco.grounded) {
      this.airborne = true;
      this.fallSpeed = Math.max(this.fallSpeed, -loco.velocity.y);
      return;
    }

    const speed = this.fallSpeed;
    this.fallSpeed = 0;
    if (!this.airborne) return;
    this.airborne = false;
    if (speed < PAD_MIN_SPEED || !this.onThePad(ctx)) return;

    ctx.rig.softLanding(speed);
    // Ein kurzer, weicher Stoß in beide Hände: Das Kissen soll man auch dann
    // merken, wenn man beim Fallen die Augen zumacht.
    const punch = THREE.MathUtils.clamp(speed / 12, 0.2, 0.55);
    for (const side of HANDS) ctx.input.get(side)?.pulse(punch, 90);
  }

  /** Stehen die Füße gerade auf dem Kissen? */
  private onThePad(ctx: WorldContext): boolean {
    ctx.rig.getHeadPosition(_head);
    return (
      Math.abs(_head.x - PAD.x) <= PAD.halfX &&
      Math.abs(_head.z - PAD.z) <= PAD.halfZ &&
      Math.abs(ctx.rig.getFloorY() - PAD_TOP) < 0.35
    );
  }

  /**
   * **Die Ausstiegshilfe** — die letzten Züge, mit denen man auf das Podest
   * kommt, und der Grund, warum sie so aussieht, wie sie aussieht.
   *
   * Aussteigen ist nicht dasselbe wie Hochklettern, und zwar wegen zweier
   * Dinge, die beide erst im Headset auffallen:
   *
   * 1. **Ein Griff auf Podesthöhe reicht nicht.** Wer sich daran hochzieht,
   *    hängt am Ende neben dem Blech und nicht darüber: Die Hand ist oben, die
   *    Füße baumeln im Schacht. Deshalb geht die Hilfe `TOPOUT_ABOVE` **über**
   *    das Podest hinaus — daran zieht man sich so weit hoch, dass die Füße
   *    über dessen Oberkante kommen, und daran hält man sich fest, wenn man
   *    oben steht.
   * 2. **Eine schräge Leiter steht im eigenen Weg.** Vorher lehnte sie über
   *    den Schacht — also über genau die Strecke, die der Kletterer nach oben
   *    nimmt —, und man stieß von unten gegen ihre Unterseite. Deshalb steht
   *    sie jetzt **senkrecht** im Schacht und geht oben **um die Ecke**: Ihre
   *    beiden Holme laufen auf Ausstiegshöhe waagerecht weiter und
   *    `TOPOUT_OVER` über die Podestkante hinein. Dort hängt man sich lang,
   *    hangelt sich hinüber und lässt über dem Boden los.
   *
   * Und weil man beim Hangeln nicht nach Sprossen suchen will, ist an ihr
   * **alles anfassbar**: die Sprossen ohnehin, aber auch die beiden Holme auf
   * ihrer ganzen Länge (`bar`). Man greift hin, wo man gerade ist — senkrecht
   * wie waagerecht. Alles daran ist **perfektes Material**: Der Ausstieg ist
   * der Moment, in dem die Ausdauer ohnehin am Ende ist, und eine Leiter, die
   * einen dort abwirft, wäre keine.
   *
   * Sie hat mit Absicht **keinen Körper** für die Physik. Der Weg des
   * Kletterers führt genau durch sie hindurch — an einem Querholm, an dem der
   * Kopf hängen bleibt, hätte man nur einen zweiten Ort zum Feststecken
   * gewonnen.
   *
   * @param foot    Fußpunkt in Weltkoordinaten, an der Wand
   * @param yaw     Wohin sie schaut — dieselbe Drehung wie die Wand dahinter
   * @param deckTop Oberkante des Podests, auf das sie führt
   * @param gap     Wie weit dessen Kante vom Fußpunkt weg ist
   */
  private topout(
    hall: THREE.Group,
    foot: readonly [number, number, number],
    yaw: number,
    deckTop: number,
    gap: number,
  ): void {
    const frame = new THREE.Group();
    frame.name = 'topout-ladder';
    frame.position.set(foot[0], foot[1], foot[2]);
    frame.rotation.set(0, yaw, 0, 'YXZ');
    hall.add(frame);
    frame.updateWorldMatrix(true, true);

    /** Die Höhe, auf der es waagerecht weitergeht. */
    const top = deckTop + TOPOUT_ABOVE - foot[1];
    /** Und wie weit: über den Schacht und ein Stück über das Podest. */
    const out = gap - TOPOUT_OFF + TOPOUT_OVER;

    // Die beiden Holme, je einer links und rechts: senkrecht hoch, oben um die
    // Ecke, waagerecht über das Podest. Ein Zehntel unter den Fuß hinaus —
    // eine Leiter, die genau an ihrer untersten Sprosse aufhört, sieht
    // abgeschnitten aus.
    for (const x of [-TOPOUT_HALF, TOPOUT_HALF]) {
      this.bar(frame, [x, -0.1, TOPOUT_OFF], [x, top, TOPOUT_OFF], OUTWARD);
      this.bar(frame, [x, top, TOPOUT_OFF], [x, top, TOPOUT_OFF + out], UPWARD);
    }

    // Die Sprossen senkrecht, von oben nach unten gezählt, damit die oberste
    // genau in der Ecke sitzt. Unten darf eine fehlen.
    const rungs = Math.max(3, Math.floor((top - 0.25) / TOPOUT_STEP) + 1);
    for (let i = 0; i < rungs; i++) {
      const y = top - i * TOPOUT_STEP;
      this.bar(frame, [-TOPOUT_HALF, y, TOPOUT_OFF], [TOPOUT_HALF, y, TOPOUT_OFF], OUTWARD);
    }

    // Und quer zwischen den waagerechten Holmen dieselben Stangen weiter: Wer
    // sich nicht an den Holmen entlangzieht, hangelt sich von Sprosse zu
    // Sprosse über das Podest.
    for (let z = TOPOUT_STEP; z <= out + 1e-6; z += TOPOUT_STEP) {
      const at = TOPOUT_OFF + z;
      this.bar(frame, [-TOPOUT_HALF, top, at], [TOPOUT_HALF, top, at], UPWARD);
    }
  }

  /**
   * **Ein Holm** — ein Stück Stahlrohr, das auf seiner **ganzen Länge**
   * anfassbar ist.
   *
   * Der Unterschied zu `hold` ist nicht die Form, sondern der Grund: Ein Griff
   * an einer Wand ist eine Stelle, die man trifft oder verfehlt; eine Strebe
   * ist eine Strecke, an der man sich entlangzieht. Deshalb bekommt sie eine
   * **Achse** über ihre volle Länge — der Sitz misst sich am Abstand zur
   * Strecke (`seatOn`), und die Hand hängt genau dort, wo sie hingefasst hat.
   *
   * @param from   Anfang im Rahmen der Leiter
   * @param to     Ende, ebenda
   * @param facing Von welcher Seite die Hand kommt — die Normale für die
   *   Halt-Rechnung. Bei perfektem Material ändert sie nichts, aber sie sagt
   *   die Wahrheit über die Stange, und die nächste Leiter ist vielleicht aus
   *   etwas anderem.
   */
  private bar(
    frame: THREE.Group,
    from: readonly [number, number, number],
    to: readonly [number, number, number],
    facing: readonly [number, number, number],
  ): void {
    const start = new THREE.Vector3(from[0], from[1], from[2]);
    const along = new THREE.Vector3(to[0], to[1], to[2]).sub(start);
    const length = along.length();
    if (length <= 0) return;
    along.divideScalar(length);

    const skin = this.skin('perfect');
    const mesh = new THREE.Mesh(this.tube(length), skin);
    mesh.name = 'hold:perfect:rail';
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along);
    mesh.position.copy(start).addScaledVector(along, length / 2);
    frame.add(mesh);
    mesh.updateWorldMatrix(true, true);

    this.holds.push({
      mesh,
      skin,
      material: 'perfect',
      feature: 'rail',
      grip: mesh.getWorldPosition(new THREE.Vector3()),
      axis: along.clone().transformDirection(frame.matrixWorld).normalize(),
      half: length / 2,
      radius: TOPOUT_REACH,
      normal: new THREE.Vector3(facing[0], facing[1], facing[2])
        .transformDirection(frame.matrixWorld)
        .normalize(),
    });
  }

  /**
   * Ein Stück Rohr dieser Länge — **nach Länge geteilt**, aus demselben Grund
   * wie die Griffformen: Alle Sprossen aller sechs Ausstiegshilfen sind
   * gleich lang, und ihre senkrechten Holme fast alle auch. Auf den Millimeter
   * gerundet, damit zwei rechnerisch gleich lange Rohre nicht doch zwei werden.
   */
  private tube(length: number): THREE.BufferGeometry {
    const key = Math.round(length * 1000);
    const known = this.tubes.get(key);
    if (known) return known;
    const geometry = new THREE.CylinderGeometry(TOPOUT_TUBE, TOPOUT_TUBE, key / 1000, 10);
    this.tubes.set(key, geometry);
    return geometry;
  }

  private buildBanner(hall: THREE.Group): void {
    this.sign(hall, [0, 4, 2.4], 0, 4.4, {
      title: 'Kletterhalle',
      body: 'Greifen hält dich an der Wand — überall, nicht nur an vorgesehenen Stellen. Am unteren Bildrand: die Ausdauer, links und rechts daneben der Halt jeder Hand. Über dem oberen Strich erholst du dich, unter dem unteren rutschst du ab. Oben geht jede Route zwischen Wand und Podest hindurch: senkrecht die Leiter hoch, über die Kante hinaus, und dann an ihren Holmen entlang aufs Podest — anfassen kannst du sie überall.',
      accent: GRAB_GLOW,
    });
  }

  /** Ein paar Kisten auf der Matte — zum Draufstellen und zum Ausprobieren. */
  protected override buildProps(): void {
    const physics = this.physics!;
    let index = 0;
    for (const [x, z, size] of [
      [-8.5, 5.5, 0.6],
      [-7.7, 5.1, 0.45],
      [8.4, 5.4, 0.55],
    ] as const) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), this.wood);
      crate.position.set(x, size / 2, z);
      this.root.add(crate);
      this.registerProp(
        physics.addDynamic(crate, { mass: size * 16, friction: 0.9, restitution: 0.04 }),
        `climb-crate-${index++}`,
      );
    }
  }

  // --- Wände und Griffe bauen ----------------------------------------------

  /**
   * Eine Kletterwand als eigener Rahmen.
   *
   * Alles, was daran hängt, wird in **ihren** Koordinaten gesetzt: `x` von der
   * Mitte aus nach rechts, **`y` vom Fuß der Wand nach oben**, und `+z` aus
   * der Wand heraus. Damit ist ein Griff an einer überhängenden Wand dieselbe
   * Zeile wie an einer senkrechten, „auf zwei Metern Höhe“ heißt überall
   * dasselbe, und die Normale, die die Halt-Rechnung braucht, ist einfach das
   * `+z` des Rahmens.
   *
   * @param yaw   Drehung um die Hochachse — wohin die Wand schaut
   * @param pitch Neigung; **positiv heißt: sie hängt über einem**
   */
  private panel(
    hall: THREE.Group,
    material: THREE.Material,
    size: readonly [number, number, number],
    position: readonly [number, number, number],
    yaw: number,
    pitch = 0,
  ): THREE.Group {
    const frame = new THREE.Group();
    frame.position.set(position[0], position[1], position[2]);
    frame.rotation.set(pitch, yaw, 0, 'YXZ');
    hall.add(frame);

    const board = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    // Die Platte sitzt hinter der Nullebene und über dem Nullpunkt: Die
    // Vorderseite der Wand ist damit genau z = 0, ihr Fuß genau y = 0.
    board.position.set(0, size[1] / 2, -size[2] / 2);
    frame.add(board);
    frame.updateWorldMatrix(true, true);

    this.solids.push(board);
    this.physics!.addStatic(board, { membership: GROUP_WORLD, filter: ALL_GROUPS });
    return frame;
  }

  /**
   * Ein Griff an einer Wand.
   *
   * Die Form bestimmt drei Dinge auf einmal: wie er aussieht, wie weit man
   * daneben greifen darf und ob er eine **Achse** hat. Eine Leiste ist ja kein
   * Punkt — man darf überall an ihr entlang zupacken, aber nicht darüber oder
   * darunter. Deshalb wird der Sitz (`seatOf`) am Abstand zur *Strecke*
   * gemessen und nicht zu einem Punkt.
   *
   * Eine Strebe ist etwas anderes und wird woanders gebaut: Sie ist keine
   * Stelle an einer Wand, sondern eine Strecke, an der man sich entlanghangelt
   * (`bar`).
   */
  private hold(
    wall: THREE.Group,
    at: readonly [number, number],
    material: HoldMaterial,
    feature: WallFeature,
  ): void {
    const skin = this.skin(material);
    const mesh = new THREE.Mesh(this.shape(feature), skin);
    const { depth, radius, axis, half } = HOLD_SHAPES[feature];

    if (feature === 'rung') mesh.rotation.z = Math.PI / 2;
    if (feature === 'flat') mesh.rotation.x = Math.PI / 2;
    if (feature === 'jug') mesh.scale.set(1, 0.85, 0.95);
    if (feature === 'sloper') mesh.scale.set(1, 0.8, 0.34);

    mesh.name = `hold:${material}:${feature}`;
    mesh.position.set(at[0], at[1], depth * 0.5);
    wall.add(mesh);
    mesh.updateWorldMatrix(true, true);

    const grip = _point.set(at[0], at[1], depth).applyMatrix4(wall.matrixWorld).clone();
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(wall.matrixWorld).normalize();
    const worldAxis = axis
      ? new THREE.Vector3(axis[0], axis[1], axis[2])
          .transformDirection(wall.matrixWorld)
          .normalize()
      : null;

    this.holds.push({ mesh, skin, material, feature, grip, axis: worldAxis, half, radius, normal });

    // Was aus der Wand ragt, ist auch ein Tritt: Auf einer Sprosse, einem
    // Henkel und einer Leiste soll man stehen können. Flächen und Ballen
    // tragen zu wenig auf — und jeder Körper, den es nicht gibt, ist einer
    // weniger, den die Physik jedes Bild anfassen muss.
    if (feature === 'rung' || feature === 'jug' || feature === 'edge') {
      this.solids.push(mesh);
      this.physics!.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
    }
  }

  /** Das geteilte Material einer Griffart. */
  private skin(material: HoldMaterial): THREE.MeshStandardMaterial {
    const known = this.skins.get(material);
    if (known) return known;
    const color = holdColor(material);
    const skin = new THREE.MeshStandardMaterial({
      color,
      roughness: material === 'smooth' ? 0.12 : 0.85,
      metalness: material === 'smooth' ? 0.5 : 0.08,
      emissive: color,
      emissiveIntensity: GRAB_TINT_EMISSIVE,
    });
    this.skins.set(material, skin);
    return skin;
  }

  /** Die geteilte Form einer Griffart. */
  private shape(feature: WallFeature): THREE.BufferGeometry {
    const known = this.shapes.get(feature);
    if (known) return known;
    let geometry: THREE.BufferGeometry;
    switch (feature) {
      case 'rung':
        geometry = new THREE.CylinderGeometry(0.024, 0.024, 0.62, 12);
        break;
      case 'jug':
        geometry = new THREE.SphereGeometry(0.08, 16, 12);
        break;
      case 'edge':
        geometry = new THREE.BoxGeometry(0.3, 0.055, 0.075);
        break;
      case 'crack': {
        // Eine Spalte ist kein Buckel, sondern zwei Backen mit Luft dazwischen.
        const cheek = new THREE.BoxGeometry(0.09, 0.44, 0.09);
        const left = cheek.clone().translate(-0.105, 0, 0);
        const right = cheek.clone().translate(0.105, 0, 0);
        geometry = mergeTwo(left, right);
        cheek.dispose();
        left.dispose();
        right.dispose();
        break;
      }
      case 'sloper':
        geometry = new THREE.SphereGeometry(0.14, 16, 10);
        break;
      default:
        geometry = new THREE.CylinderGeometry(0.12, 0.12, 0.016, 16);
        break;
    }
    this.shapes.set(feature, geometry);
    return geometry;
  }

  private sign(
    hall: THREE.Group,
    at: readonly [number, number, number],
    yaw: number,
    width: number,
    options: { title: string; body: string; accent: number },
  ): void {
    const plane = new TextPlane({
      width,
      height: width * 0.34,
      title: options.title,
      body: options.body,
      accent: options.accent,
    });
    plane.position.set(at[0], at[1], at[2]);
    plane.rotation.y = yaw;
    hall.add(plane);
  }

  // --- klettern -------------------------------------------------------------

  /**
   * Ein Bild Klettern: nachsehen, wer wo hängt, den Halt rechnen, die Ausdauer
   * fortschreiben, den Körper an die Hände hängen und rückmelden, wie es steht.
   */
  private updateClimb(dt: number, ctx: WorldContext): void {
    if (dt <= 0) return;

    this.readHands(ctx);
    this.turnAtTheWall(ctx);

    const pose = this.buildPose(ctx);
    const report = gripReport(pose);
    const step = stepStamina(this.stamina, report.support, report.drain, report.hanging, dt);
    this.stamina = { value: step.value, ramp: step.ramp };

    for (const side of HANDS) {
      const grasp = this.grasps.get(side);
      if (!grasp) continue;
      grasp.quality = (side === 'left' ? report.left : report.right) ?? 0;
      grasp.time += dt;
    }

    this.feedback(ctx, dt);

    // Erst jetzt abrechnen: Wer unter die Schwelle gerutscht ist, verliert die
    // Hand; wem die Kraft ausgegangen ist, beide.
    if (step.spent) {
      this.fall(ctx, 'Ausdauer leer');
    } else {
      for (const side of HANDS) {
        const grasp = this.grasps.get(side);
        if (!grasp || grasp.quality >= SLIP_AT) continue;
        ctx.input.get(side)?.pulse(0.85, 120);
        this.letGo(ctx, side, true);
      }
    }

    this.driveBody(dt, ctx);
    this.hud?.setValues(this.stamina.value, report.left, report.right);
  }

  /** Was die Hände tun: zupacken, loslassen, und was in Reichweite liegt. */
  private readHands(ctx: WorldContext): void {
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;

      // Eine Hand, die aus dem Blickfeld der Brille gerät, lässt los — aber
      // sie ist nicht abgerutscht. „Abgerutscht“ heißt: Der Halt hat nicht
      // gereicht, und das ist eine Auskunft über die Wand, keine über das
      // Tracking.
      if (!controller.tracked) {
        this.letGo(ctx, hand, false);
        this.light(hand, null);
        continue;
      }

      if (this.grasps.has(hand)) {
        if (!controller.squeeze.pressed) this.letGo(ctx, hand, false);
        continue;
      }

      // Der Greifknopf gehört hier dem Klettern — aber nur, solange die Hand
      // wirklich leer ist. Wer eine Kiste trägt, trägt eine Kiste.
      if (!this.handFree(hand)) {
        this.light(hand, null);
        continue;
      }

      gripOf(controller).getWorldPosition(_hand);
      const near = this.nearestHold(_hand);
      this.light(hand, near?.hold ?? null);
      ctx.hands.setGlow(hand, near !== null);

      if (!near || !controller.squeeze.justPressed) continue;
      if (this.stamina.value < GRAB_AT) {
        ctx.notify('Zu erschöpft — erst ausruhen');
        controller.pulse(0.2, 160);
        continue;
      }
      this.takeHold(ctx, hand, controller, near.hold, near.distance);
    }
  }

  /** Der Griff, an dem diese Hand gerade am dichtesten dran ist. */
  private nearestHold(at: THREE.Vector3): { hold: Hold; distance: number } | null {
    let best: Hold | null = null;
    let bestDistance = Infinity;
    for (const hold of this.holds) {
      const distance = this.distanceTo(hold, at);
      if (distance > hold.radius + REACH || distance >= bestDistance) continue;
      best = hold;
      bestDistance = distance;
    }
    return best ? { hold: best, distance: bestDistance } : null;
  }

  /**
   * Die Stelle des Griffs, an der diese Hand sitzt.
   *
   * Bei einem Henkel ist das immer derselbe Punkt; bei einer **Leiste, einer
   * Sprosse oder einem Riss** ist es die nächstgelegene Stelle auf ihrer
   * Strecke. Ein Griff, der einen halben Meter lang ist, hat keine Mitte, an
   * der man hängt — und wer das übersieht, reißt jeden, der eine Sprosse am
   * Ende anfasst, zu ihrer Mitte hin.
   */
  private seatOn(hold: Hold, at: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    out.copy(hold.grip);
    if (!hold.axis) return out;
    _seat.copy(at).sub(hold.grip);
    const along = THREE.MathUtils.clamp(_seat.dot(hold.axis), -hold.half, hold.half);
    return out.addScaledVector(hold.axis, along);
  }

  /** Und der Abstand dorthin. */
  private distanceTo(hold: Hold, at: THREE.Vector3): number {
    return at.distanceTo(this.seatOn(hold, at, _target));
  }

  /** Zupacken. */
  private takeHold(
    ctx: WorldContext,
    hand: Handedness,
    controller: ControllerState,
    hold: Hold,
    distance: number,
  ): void {
    gripOf(controller).getWorldPosition(_hand);
    // Der Anker ist da, wo die Hand ist — aber höchstens einen Griffradius von
    // der Stelle des Griffs entfernt, an der sie sitzt. Sonst hinge man an
    // einem Punkt in der Luft daneben.
    this.seatOn(hold, _hand, _point);
    _delta.copy(_hand).sub(_point);
    if (_delta.length() > hold.radius) _delta.setLength(hold.radius);

    this.grasps.set(hand, {
      hold,
      seat: seatOf(distance, hold.radius),
      anchor: _point.clone().add(_delta),
      point: _hand.clone(),
      time: 0,
      quality: 1,
    });
    this.light(hand, null);
    ctx.hands.setGlow(hand, false);
    this.holdRig(ctx);

    // Der eine Schlag, der sagt, wie gut das war — aus dem Halt gerechnet, den
    // dieser Griff jetzt hergibt (`gripHaptics.ts`).
    const preview = gripReport(this.buildPose(ctx));
    const buzz = landingBuzz((hand === 'left' ? preview.left : preview.right) ?? 0);
    controller.pulse(buzz.intensity, buzz.duration);
    ctx.notify(holdLabel(hold.material, hold.feature));
  }

  /** Loslassen — freiwillig oder weil es nicht mehr ging. */
  private letGo(ctx: WorldContext, hand: Handedness, slipped: boolean): void {
    if (!this.grasps.delete(hand)) return;
    ctx.hands.setGlow(hand, false);
    if (this.grasps.size > 0) return;
    this.releaseRig(ctx);
    if (slipped) ctx.notify('Abgerutscht');
  }

  /** Beide Hände auf, und eine Meldung dazu. */
  private fall(ctx: WorldContext, why: string): void {
    if (this.grasps.size === 0) return;
    for (const side of HANDS) {
      ctx.input.get(side)?.pulse(1, 180);
      this.letGo(ctx, side, false);
    }
    ctx.notify(why);
  }

  /** Hände auf, zurück auf die Matte, Ausdauer voll. */
  private backToTheMat(): void {
    const ctx = this.context;
    if (!ctx) return;
    for (const side of HANDS) this.letGo(ctx, side, false);
    this.releaseRig(ctx);
    this.stamina = freshStamina();
    this.teleportPlayerTo(this.spawnPoint(), this.spawnYaw());
    ctx.notify('Zurück auf der Matte');
  }

  /**
   * Wie der Kletterer gerade steht — der ganze Eingang der Rechnung.
   *
   * Die **Restkraft** ist die Ausdauer des letzten Bildes und nicht die von
   * jetzt: Der Halt geht in die Ausdauer ein und die Ausdauer in den Halt, und
   * irgendwo muss man diesen Kreis aufschneiden.
   */
  private buildPose(ctx: WorldContext): ClimbPose {
    ctx.rig.getHeadPosition(_head);
    return {
      left: this.handGrip(ctx, 'left'),
      right: this.handGrip(ctx, 'right'),
      headY: _head.y,
      eyeHeight: ctx.rig.getHeadHeight(),
      footing: this.hasFooting(ctx),
      strength: this.stamina.value,
    };
  }

  private handGrip(ctx: WorldContext, hand: Handedness): HandGrip | null {
    const grasp = this.grasps.get(hand);
    if (!grasp) return null;
    const controller = ctx.input.get(hand);
    if (controller) gripOf(controller).getWorldPosition(grasp.point);
    else grasp.point.copy(grasp.anchor);
    return {
      material: grasp.hold.material,
      feature: grasp.hold.feature,
      seat: grasp.seat,
      normal: grasp.hold.normal,
      point: grasp.point,
    };
  }

  /**
   * Stehen die Füße auf etwas?
   *
   * Nicht `locomotion.grounded`: Solange die Arme den Körper führen, fliegt er
   * für die Physik, und „am Boden“ wäre dann immer falsch. Also ein kurzer
   * Strahl von den Füßen nach unten — er findet die Matte, ein Podest, eine
   * Kiste und jede Sprosse, auf der man steht.
   */
  private hasFooting(ctx: WorldContext): boolean {
    ctx.rig.getHeadPosition(_head);
    _feet.set(_head.x, ctx.rig.getFloorY() + 0.05, _head.z);
    this.probe.set(_feet, _down);
    this.probe.far = FOOT_PROBE;
    return this.probe.intersectObjects(this.solids, false).length > 0;
  }

  /**
   * **Der Körper hängt an den Händen.**
   *
   * Keine künstliche Kletterbewegung: Jede Hand hat einen Anker in der Welt,
   * und der Körper wird jedes Bild so weit verschoben, dass die Hände wieder
   * dort sind. Zieht man die Hand nach unten, geht der Körper nach oben.
   *
   * Gefahren wird das über den **Flugmodus** der Fortbewegung
   * (`PhysicsLocomotion.setFlight`) und nicht über die Position des Rigs:
   * Dadurch bleiben Wände Wände, man klettert nicht in die Halle hinein, und
   * beim Loslassen wird aus dem letzten Zug ein Schwung.
   */
  private driveBody(dt: number, ctx: WorldContext): void {
    if (this.grasps.size === 0) return;

    _delta.set(0, 0, 0);
    let count = 0;
    for (const [hand, grasp] of this.grasps) {
      const controller = ctx.input.get(hand);
      if (!controller) continue;
      gripOf(controller).getWorldPosition(_hand);
      _delta.add(_target.copy(grasp.anchor).sub(_hand));
      count++;
    }
    if (count === 0) return;
    _delta.divideScalar(count * dt);
    if (_delta.length() > MAX_CLIMB_SPEED) _delta.setLength(MAX_CLIMB_SPEED);

    // Geglättet, damit ein einzelnes verwackeltes Bild nicht als Ruck ankommt
    // — und damit beim Loslassen ein Schwung übrig bleibt und kein Zucken.
    this.drive.lerp(_delta, Math.min(1, DRIVE_BLEND * dt));
    this.host?.setFlight(this.drive);
  }

  /**
   * **Die Rastdrehung an der Wand** — dieselbe wie überall sonst, nur mit
   * einem Nachsatz.
   *
   * Sie muss hier stehen und nicht im Rig, weil das Rig beim Klettern
   * abgeschaltet ist (`holdRig`): Der linke Stick gehört den Armen, und wer
   * hängt, springt nicht. Der rechte Stick aber gehört weiter dem Hals — wer
   * sich an einer Wand hochzieht, will genauso über die Schulter schauen und
   * die Route nebenan ansehen wie überall sonst. Ohne Drehung dreht man sich
   * körperlich im Zimmer, und irgendwann steht man mit dem Kabel um den Hals
   * vor der Wand.
   *
   * Der Nachsatz sind die **Anker**. Eine Drehung schwenkt den ganzen Spieler
   * um seinen Kopf, also auch seine Hände — die Anker aber stehen in der Welt.
   * Bliebe es dabei, hinge die Hand nach einer Vierteldrehung einen halben
   * Meter neben ihrem Griff in der Luft, und der Zug (`driveBody`) risse einen
   * dorthin. Deshalb wird jeder Anker danach **neu auf seinen Griff gesetzt**,
   * genau wie beim Zupacken: Die Hand hält weiter denselben Griff, und der
   * Körper schwingt in den nächsten Bildern um ihn herum an seine neue Stelle.
   * Das ist auch die ehrlichere Bewegung — an einer echten Wand dreht sich der
   * Körper um die Hände und nicht die Hände um den Körper.
   *
   * Der Sitz (`seat`) bleibt, was er beim Zupacken war. Er ist die Auskunft
   * darüber, wie gut man getroffen hat, und die ändert sich nicht dadurch,
   * dass man sich umdreht.
   */
  private turnAtTheWall(ctx: WorldContext): void {
    if (!this.lockedByUs) return;
    if (ctx.rig.menuStick === 'right') return;

    const turn = ctx.input.get('right')?.thumbstick.x ?? 0;
    if (Math.abs(turn) < 0.35) this.turnArmed = true;
    if (!this.turnArmed || Math.abs(turn) <= 0.7) return;
    this.turnArmed = false;

    ctx.rig.rotateAroundHead(-Math.sign(turn) * ctx.rig.snapAngle);

    for (const [hand, grasp] of this.grasps) {
      const controller = ctx.input.get(hand);
      if (!controller) continue;
      gripOf(controller).getWorldPosition(_hand);
      this.reseat(grasp, _hand);
    }
  }

  /**
   * Den Anker einer greifenden Hand wieder an ihren Griff heften — dieselbe
   * Rechnung wie in `takeHold`, nur ohne neu zu greifen.
   */
  private reseat(grasp: Grasp, at: THREE.Vector3): void {
    this.seatOn(grasp.hold, at, _point);
    _delta.copy(at).sub(_point);
    if (_delta.length() > grasp.hold.radius) _delta.setLength(grasp.hold.radius);
    grasp.anchor.copy(_point).add(_delta);
  }

  /** Der Stick gehört jetzt nicht mehr dem Spieler: Er hängt an der Wand. */
  private holdRig(ctx: WorldContext): void {
    if (this.lockedByUs) return;
    this.lockedByUs = true;
    // Gehen und springen tut hier niemand mehr — dafür sind die Arme da.
    // Gedreht wird aber weiter, und zwar von uns selbst: `turnAtTheWall`
    // nimmt die Anker mit, was das Rig allein nicht könnte.
    ctx.rig.locked = true;
    this.turnArmed = true;
  }

  /** Und beim Loslassen zurück, mitsamt dem Schwung des letzten Zuges. */
  private releaseRig(ctx: WorldContext): void {
    if (this.lockedByUs) {
      ctx.rig.locked = false;
      this.lockedByUs = false;
    }
    if (this.drive.lengthSq() > 0) {
      if (this.drive.length() > MAX_LAUNCH_SPEED) this.drive.setLength(MAX_LAUNCH_SPEED);
      // Erst der gedeckelte Schwung, dann zurück an die Schwerkraft: `null`
      // übernimmt genau diese Geschwindigkeit in den Körper.
      this.host?.setFlight(this.drive);
      this.drive.set(0, 0, 0);
    }
    this.host?.setFlight(null);
  }

  /**
   * Was die Hände fühlen: das Ticken am schlechten Griff und die Warnung, wenn
   * die Kraft ausgeht (`gripHaptics.ts`). Höchstens ein Stoß je Muster und
   * Bild — mehr fühlt ohnehin niemand.
   */
  private feedback(ctx: WorldContext, dt: number): void {
    for (const [hand, grasp] of this.grasps) {
      const controller = ctx.input.get(hand);
      if (!controller) continue;
      const from = grasp.time - dt;

      const slip = slipTick(grasp.quality);
      if (slip && ticksBetween(slip.period, from, grasp.time).length > 0) {
        controller.pulse(slip.buzz.intensity, slip.buzz.duration);
      }

      const fatigue = fatigueTick(this.stamina.value);
      if (fatigue && ticksBetween(fatigue.period, from, grasp.time).length > 0) {
        controller.pulse(fatigue.buzz.intensity, fatigue.buzz.duration);
      }
    }
  }

  /** Der Griff unter einer Hand leuchtet auf — und der vorige wieder aus. */
  private light(hand: Handedness, hold: Hold | null): void {
    const previous = this.lit.get(hand);
    if (previous === hold) return;
    if (previous && !this.litByOther(hand, previous)) previous.mesh.material = previous.skin;
    if (hold) {
      hold.mesh.material = this.glow;
      this.lit.set(hand, hold);
    } else {
      this.lit.delete(hand);
    }
  }

  private litByOther(hand: Handedness, hold: Hold): boolean {
    for (const [side, lit] of this.lit) {
      if (side !== hand && lit === hold) return true;
    }
    return false;
  }
}

const HANDS: readonly Handedness[] = ['left', 'right'];

/**
 * Was an einer **Wand** hängt — alles außer dem Holm, den `bar` baut: Der ist
 * keine Stelle an einer Wand, sondern eine Strecke, und seine Maße bringt seine
 * eigene Länge mit.
 */
type WallFeature = Exclude<HoldFeature, 'rail'>;

/**
 * Was jede Griffart an Zahlen mitbringt: wie weit sie aus der Wand ragt, wie
 * weit die Hand daneben liegen darf, und ob sie eine Achse hat, an der entlang
 * man überall zupacken darf.
 */
const HOLD_SHAPES: Readonly<
  Record<
    WallFeature,
    {
      depth: number;
      radius: number;
      axis: readonly [number, number, number] | null;
      half: number;
    }
  >
> = {
  rung: { depth: 0.1, radius: 0.1, axis: [1, 0, 0], half: 0.28 },
  jug: { depth: 0.05, radius: 0.11, axis: null, half: 0 },
  edge: { depth: 0.037, radius: 0.085, axis: [1, 0, 0], half: 0.15 },
  crack: { depth: 0.045, radius: 0.085, axis: [0, 1, 0], half: 0.22 },
  sloper: { depth: 0.03, radius: 0.13, axis: null, half: 0 },
  flat: { depth: 0.014, radius: 0.12, axis: null, half: 0 },
};

/**
 * Zwei Formen zu einer — für die Spalte, die aus zwei Backen besteht.
 *
 * Von Hand statt mit `BufferGeometryUtils`: Es sind zwei Kästen mit denselben
 * Attributen, und der eine Import zöge eine ganze Werkzeugkiste mit herein.
 */
function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const first = a.getAttribute(name) as THREE.BufferAttribute | undefined;
    const second = b.getAttribute(name) as THREE.BufferAttribute | undefined;
    if (!first || !second) continue;
    const array = new Float32Array(first.array.length + second.array.length);
    array.set(first.array as Float32Array, 0);
    array.set(second.array as Float32Array, first.array.length);
    out.setAttribute(name, new THREE.BufferAttribute(array, first.itemSize));
  }
  const indexA = a.getIndex();
  const indexB = b.getIndex();
  if (indexA && indexB) {
    const offset = (a.getAttribute('position') as THREE.BufferAttribute).count;
    const index = new Uint16Array(indexA.count + indexB.count);
    for (let i = 0; i < indexA.count; i++) index[i] = indexA.getX(i);
    for (let i = 0; i < indexB.count; i++) index[indexA.count + i] = indexB.getX(i) + offset;
    out.setIndex(new THREE.BufferAttribute(index, 1));
  }
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}
