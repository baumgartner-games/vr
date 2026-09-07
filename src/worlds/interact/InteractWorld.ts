import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { buildRedButton, type RedButton } from '../shared/redButton';
import { TextPlane } from '../../ui/TextPlane';
import { playSwitch, playTone } from '../../core/Audio';
import { GRAB_TINT } from '../../core/colors';
import { ALL_GROUPS, GROUP_WORLD, type PhysicsBody } from '../../physics/PhysicsWorld';
import {
  closeDoor,
  newDoor,
  passable,
  slideOffset,
  stepDoor,
  swingAngle,
  triggerDoor,
  type DoorParams,
  type DoorState,
} from './doorMotion';
import { clampSign } from '../signs/signSettings';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';

/**
 * **Das Interaktionslabor** — eine helle Halle, in der Dinge stehen, die man
 * bedient.
 *
 * Die Vorbilder sind die Testkammern aus *Portal* und die große Testzelle, die
 * in Oblivion hinter der Karte liegt: ein Raum ohne Geschichte, in dem alles
 * einmal aufgebaut ist, was das Spiel kann, damit man es ausprobieren kann,
 * ohne es irgendwo suchen zu müssen. Genau das ist der Zweck hier — nicht eine
 * Welt zum Spielen, sondern eine zum **Anfassen**:
 *
 * - **Knöpfe**: der große rote (er öffnet mit Nachlauf), ein Hebel (er rastet),
 *   ein Kippschalter für das Deckenlicht und eine **Druckplatte** im Boden,
 *   auf die man sich stellt — oder eine Kiste.
 * - **Türen**: eine Schiebetür, eine zweiflügelige Drehtür und eine, die nur
 *   offen bleibt, solange etwas auf der Platte liegt. Alle drei stecken in
 *   *einer* Wand quer durch die Halle, damit „offen" und „zu" einen
 *   Unterschied machen: Man kommt sonst nicht auf die andere Seite.
 * - **Schilder**: die Galerie an der Nordwand zeigt, was eine Tafel kann —
 *   Markdown, ein langer Aushang, der von selbst rollt, und ein leeres Schild
 *   zum Selbstbeschreiben. Im Gürtel liegt das Werkzeug dazu
 *   (`worlds/signs/`, `tools/SignTool.ts`).
 *
 * Alles andere ist das Portallabor: derselbe Gürtel, dieselben Werkzeuge,
 * dieselbe Physik, dieselbe geteilte Sitzung. Wer hier etwas aufstellt, stellt
 * es allen im Raum auf.
 */

/** Innenmaße der Halle. */
const HALF_X = 16;
const HALF_Z = 11;
const HEIGHT = 6;
const WALL = 0.4;

/** Die Wand mit den drei Türen, und wo ihre Öffnungen sitzen. */
const DOOR_WALL_Z = 2;
const DOOR_W = 2.4;
const DOOR_H = 2.8;
const SLIDE_X = -8;
const SWING_X = 0;
const PLATE_X = 8;

/** Die Druckplatte: Mitte, Halbmesser und wie tief sie eintaucht. */
const PLATE_POS = new THREE.Vector3(PLATE_X, 0, 4.4);
const PLATE_R = 0.75;
const PLATE_DROP = 0.035;
/** Wie lange die Platte nachläuft, wenn niemand mehr darauf steht. */
const PLATE_HOLD = 1.6;

const SLIDE: DoorParams = { time: 1.4, hold: 6 };
const SWING: DoorParams = { time: 1.1, hold: 0 };
const PLATE: DoorParams = { time: 0.9, hold: PLATE_HOLD };
/** Wie weit ein Drehflügel aufschwingt. */
const SWING_MAX = (100 * Math.PI) / 180;

const LAMP_OFF = 0x39414f;
const LAMP_ON = 0x5ee0a0;
const LAMP_MOVING = 0xffc857;

const _head = new THREE.Vector3();
const _point = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();

/** Ein Türflügel: sein Brett, sein Körper und wo er im Rahmen sitzt. */
interface Leaf {
  mesh: THREE.Mesh;
  entry: PhysicsBody | null;
  /** Wo er hängt, wenn die Tür zu ist. */
  home: THREE.Vector3;
  /** Schiebetür: die Richtung, in die er fährt. Drehtür: das Vorzeichen. */
  sign: number;
  /** Drehtür: der Punkt, um den er schwingt, und seine Breite. */
  hinge?: THREE.Vector3;
  width?: number;
}

interface LabDoor {
  id: string;
  label: string;
  kind: 'slide' | 'swing';
  params: DoorParams;
  state: DoorState;
  leaves: Leaf[];
  /** Die Lampe über der Tür: aus, gelb in Bewegung, grün offen. */
  lamp: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
}

export class InteractWorld extends PortalWorld {
  private readonly panel = new THREE.MeshStandardMaterial({ color: 0xe8ecf4, roughness: 0.75 });
  private readonly dark = new THREE.MeshStandardMaterial({ color: 0x2a3242, roughness: 0.7 });
  private readonly floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x7d8697,
    roughness: 0.9,
  });
  private readonly metal = new THREE.MeshStandardMaterial({
    color: 0x8b93a4,
    roughness: 0.4,
    metalness: 0.6,
  });
  private readonly wood = new THREE.MeshStandardMaterial({ color: 0x9a7248, roughness: 0.85 });

  private readonly doors: LabDoor[] = [];
  private button: RedButton | null = null;
  /** Der Hebel und sein Bügel — er kippt, wenn er umgelegt wird. */
  private lever: THREE.Group | null = null;
  private leverOn = false;
  /** Die Druckplatte und wie weit sie gerade eingedrückt ist. */
  private plate: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial> | null = null;
  private plateDown = false;
  /** Der Kippschalter fürs Deckenlicht und die Lampen daran. */
  private lightSwitch: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> | null = null;
  private readonly lamps: THREE.PointLight[] = [];
  private readonly lampGlass: Array<THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>> = [];
  private lightsOn = true;
  /** Alles, was beim Verlassen wieder beim Zeiger abgemeldet werden muss. */
  private readonly targets: THREE.Object3D[] = [];

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);

    if (this.button) {
      this.pointerTarget(ctx, this.button.dome, () => this.pressButton());
      this.button.group.userData.hover = true;
    }
    if (this.lever) this.pointerTarget(ctx, this.lever, () => this.pullLever());
    if (this.lightSwitch) this.pointerTarget(ctx, this.lightSwitch, () => this.toggleLights());

    this.buildSigns();
    this.applyLights();
  }

  override dispose(ctx: WorldContext): void {
    for (const object of this.targets) ctx.pointer.remove(object);
    this.targets.length = 0;
    this.button?.dispose();
    this.button = null;
    this.lever = null;
    this.plate = null;
    this.lightSwitch = null;
    this.doors.length = 0;
    this.lamps.length = 0;
    this.lampGlass.length = 0;
    super.dispose(ctx);
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 8.5);
  }

  protected override skyColor(): number {
    return 0x141a26;
  }

  protected override welcome(): string {
    return 'Interaktionslabor · Knöpfe, Türen, Schilder — A/X am Schild beschriftet';
  }

  /**
   * Im Gürtel liegt das **Schild** statt der zweiten Portalpistole: In einem
   * Raum, in dem es ums Bedienen geht, ist das Werkzeug, das etwas aufschreibt,
   * wichtiger als das zweite, das Löcher in Wände schießt.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['gun-dual', 'left'],
      ['sign', 'right'],
    ];
  }

  protected override buildEnvironment(): void {
    const hall = new THREE.Group();
    hall.name = 'interact-hall';
    this.root.add(hall);

    this.buildShell(hall);
    this.buildDoorWall(hall);
    this.buildControls(hall);
    this.buildLamps(hall);
    this.buildLabels(hall);
  }

  // --- die Halle ------------------------------------------------------------

  private buildShell(hall: THREE.Group): void {
    const width = (HALF_X + WALL) * 2;
    const depth = (HALF_Z + WALL) * 2;
    this.slab(hall, this.floorMaterial, [width, WALL, depth], [0, -WALL / 2, 0], true);
    this.slab(hall, this.panel, [width, WALL, depth], [0, HEIGHT + WALL / 2, 0], false);
    this.roof = HEIGHT;

    for (const [size, at] of [
      [
        [width, HEIGHT, WALL],
        [0, HEIGHT / 2, -HALF_Z - WALL / 2],
      ],
      [
        [width, HEIGHT, WALL],
        [0, HEIGHT / 2, HALF_Z + WALL / 2],
      ],
      [
        [WALL, HEIGHT, depth],
        [-HALF_X - WALL / 2, HEIGHT / 2, 0],
      ],
      [
        [WALL, HEIGHT, depth],
        [HALF_X + WALL / 2, HEIGHT / 2, 0],
      ],
    ] as const) {
      this.slab(hall, this.panel, size, at, false);
    }

    // Vier helle Tafeln, an denen ein Portal hält — je eine pro Wand, damit man
    // sich in der Halle auch quer hindurchschießen kann.
    for (const [x, z, along] of [
      [-HALF_X + 0.1, -6, false],
      [HALF_X - 0.1, -6, false],
      // Die nördliche steht weit links: Vor der Nordwand hängt die
      // Schildergalerie, und eine Tafel, die zur Hälfte in einer Portalfläche
      // steckt, liest sich schlecht.
      [-12, -HALF_Z + 0.1, true],
      [6, HALF_Z - 0.1, true],
    ] as const) {
      const size: [number, number, number] = along ? [3.2, 3, 0.12] : [0.12, 3, 3.2];
      this.slab(hall, this.dark, size, [x, 1.7, z], true);
    }
  }

  /**
   * Die Wand quer durch die Halle — mit drei Öffnungen und drei Türen darin.
   *
   * Sie ist der Grund, warum die Türen etwas bedeuten: Ohne eine Wand, die
   * wirklich trennt, ist eine Tür ein Möbelstück, an dem man vorbeigeht.
   */
  private buildDoorWall(hall: THREE.Group): void {
    const openings = [SLIDE_X, SWING_X, PLATE_X];
    let cursor = -HALF_X;
    for (const centre of openings) {
      const left = centre - DOOR_W / 2;
      this.wallPiece(hall, cursor, left, 0, HEIGHT);
      // Der Sturz über der Öffnung: Eine Wand hört über einer Tür nicht auf.
      this.wallPiece(hall, left, centre + DOOR_W / 2, DOOR_H, HEIGHT);
      cursor = centre + DOOR_W / 2;
    }
    this.wallPiece(hall, cursor, HALF_X, 0, HEIGHT);

    this.doors.push(this.buildSlideDoor(hall));
    this.doors.push(this.buildSwingDoor(hall));
    this.doors.push(this.buildPlateDoor(hall));
  }

  private wallPiece(hall: THREE.Group, from: number, to: number, y0: number, y1: number): void {
    const length = to - from;
    const height = y1 - y0;
    if (length <= 0.001 || height <= 0.001) return;
    this.slab(
      hall,
      this.panel,
      [length, height, WALL],
      [(from + to) / 2, (y0 + y1) / 2, DOOR_WALL_Z],
      false,
    );
  }

  /** Ein Türblatt: Brett, Griffstreifen und ein kinematischer Körper dazu. */
  private leaf(
    hall: THREE.Group,
    width: number,
    at: THREE.Vector3,
    sign: number,
    hinge?: THREE.Vector3,
  ): Leaf {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, DOOR_H, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x4c6a8f, roughness: 0.5, metalness: 0.25 }),
    );
    mesh.name = 'lab-door-leaf';
    mesh.position.copy(at);
    hall.add(mesh);
    // Ein Streifen in Greiffarbe dort, wo an einer echten Tür der Griff wäre:
    // Er sagt, wohin sie aufgeht, ohne dass es irgendwo geschrieben stünde.
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, DOOR_H * 0.5, 0.14),
      new THREE.MeshStandardMaterial({ color: GRAB_TINT, roughness: 0.6 }),
    );
    stripe.position.set((sign * width) / 2 - sign * 0.14, 0, 0);
    mesh.add(stripe);
    mesh.updateWorldMatrix(true, false);

    const entry =
      this.physics?.addKinematic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS }) ?? null;
    return { mesh, entry, home: at.clone(), sign, ...(hinge ? { hinge, width } : {}) };
  }

  private doorLamp(hall: THREE.Group, x: number): LabDoor['lamp'] {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 14, 10),
      new THREE.MeshBasicMaterial({ color: LAMP_OFF, toneMapped: false }),
    );
    lamp.position.set(x, DOOR_H + 0.35, DOOR_WALL_Z + WALL / 2 + 0.08);
    hall.add(lamp);
    return lamp;
  }

  private buildSlideDoor(hall: THREE.Group): LabDoor {
    const leaf = this.leaf(
      hall,
      DOOR_W,
      new THREE.Vector3(SLIDE_X, DOOR_H / 2, DOOR_WALL_Z),
      -1,
      undefined,
    );
    // Die Schiene über der Öffnung — ohne sie schwebt das Blatt.
    const rail = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W * 2.2, 0.1, 0.16), this.metal);
    rail.position.set(SLIDE_X - DOOR_W / 2, DOOR_H + 0.08, DOOR_WALL_Z);
    hall.add(rail);
    return {
      id: 'slide',
      label: 'Schiebetür',
      kind: 'slide',
      params: SLIDE,
      state: newDoor(),
      leaves: [leaf],
      lamp: this.doorLamp(hall, SLIDE_X),
    };
  }

  private buildSwingDoor(hall: THREE.Group): LabDoor {
    const half = DOOR_W / 2;
    const leaves: Leaf[] = [];
    for (const side of [-1, 1]) {
      const hinge = new THREE.Vector3(SWING_X + side * half, DOOR_H / 2, DOOR_WALL_Z);
      const at = new THREE.Vector3(SWING_X + (side * half) / 2, DOOR_H / 2, DOOR_WALL_Z);
      leaves.push(this.leaf(hall, half, at, -side, hinge));
    }
    return {
      id: 'swing',
      label: 'Flügeltür',
      kind: 'swing',
      params: SWING,
      state: newDoor(),
      leaves,
      lamp: this.doorLamp(hall, SWING_X),
    };
  }

  private buildPlateDoor(hall: THREE.Group): LabDoor {
    const leaf = this.leaf(
      hall,
      DOOR_W,
      new THREE.Vector3(PLATE_X, DOOR_H / 2, DOOR_WALL_Z),
      1,
      undefined,
    );
    const rail = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W * 2.2, 0.1, 0.16), this.metal);
    rail.position.set(PLATE_X + DOOR_W / 2, DOOR_H + 0.08, DOOR_WALL_Z);
    hall.add(rail);
    return {
      id: 'plate',
      label: 'Drucktür',
      kind: 'slide',
      params: PLATE,
      state: newDoor(),
      leaves: [leaf],
      lamp: this.doorLamp(hall, PLATE_X),
    };
  }

  // --- was man bedient ------------------------------------------------------

  private buildControls(hall: THREE.Group): void {
    // Der große rote Knopf vor der Schiebetür.
    this.button = buildRedButton({
      title: 'Schiebetür',
      body: 'Öffnet für sechs Sekunden und fällt dann von selbst wieder zu',
    });
    this.button.group.position.set(SLIDE_X, 0, 5.2);
    this.button.group.rotation.y = Math.PI;
    hall.add(this.button.group);

    // Der Hebel vor der Flügeltür: er rastet, er fällt nicht zurück.
    const lever = new THREE.Group();
    lever.name = 'lab-lever';
    lever.position.set(SWING_X, 0, 5.2);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.9, 16), this.metal);
    column.position.y = 0.45;
    lever.add(column);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.26), this.dark);
    box.position.y = 0.95;
    lever.add(box);
    const arm = new THREE.Group();
    arm.name = 'lab-lever-arm';
    arm.position.y = 0.98;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.42, 10), this.metal);
    bar.position.y = 0.21;
    arm.add(bar);
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xff5a4a, roughness: 0.4 }),
    );
    knob.position.y = 0.42;
    arm.add(knob);
    arm.rotation.x = -0.5;
    lever.add(arm);
    hall.add(lever);
    this.lever = lever;

    // Die Druckplatte im Boden vor der dritten Tür.
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(PLATE_R + 0.12, PLATE_R + 0.12, 0.05, 28),
      this.metal,
    );
    ring.position.copy(PLATE_POS).setY(0.025);
    hall.add(ring);
    this.plate = new THREE.Mesh(
      new THREE.CylinderGeometry(PLATE_R, PLATE_R, 0.07, 28),
      new THREE.MeshStandardMaterial({
        color: 0xffc857,
        roughness: 0.6,
        emissive: new THREE.Color(0x3a2c08),
      }),
    );
    this.plate.name = 'lab-plate';
    this.plate.position.copy(PLATE_POS).setY(0.06);
    hall.add(this.plate);

    // Der Kippschalter fürs Deckenlicht, an der Westwand.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.24), this.dark);
    plate.position.set(-HALF_X + 0.05, 1.3, 6);
    hall.add(plate);
    this.lightSwitch = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.16, 0.14),
      new THREE.MeshBasicMaterial({ color: 0xfff0cf, toneMapped: false }),
    );
    this.lightSwitch.name = 'lab-light-switch';
    this.lightSwitch.position.set(-HALF_X + 0.1, 1.36, 6);
    hall.add(this.lightSwitch);
  }

  private buildLamps(hall: THREE.Group): void {
    for (const x of [-10, -3, 4, 11]) {
      for (const z of [-6, 6]) {
        const shade = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.42, 0.16, 16, 1, true),
          this.metal,
        );
        shade.position.set(x, HEIGHT - 0.15, z);
        hall.add(shade);
        const glass = new THREE.Mesh(
          new THREE.CircleGeometry(0.38, 20),
          new THREE.MeshBasicMaterial({ color: 0xfff3dd, toneMapped: false }),
        );
        glass.rotation.x = Math.PI / 2;
        glass.position.set(x, HEIGHT - 0.24, z);
        hall.add(glass);
        const light = new THREE.PointLight(0xfff0d8, 14, 26, 2);
        light.position.set(x, HEIGHT - 0.4, z);
        hall.add(light);
        this.lamps.push(light);
        this.lampGlass.push(glass);
      }
    }
  }

  /** Die Beschriftungen an der Wand — was hier wozu steht. */
  private buildLabels(hall: THREE.Group): void {
    const label = (
      title: string,
      body: string,
      at: [number, number, number],
      yaw: number,
      accent: number,
    ): void => {
      const sign = new TextPlane({ width: 3, height: 0.9, title, body, accent, align: 'center' });
      sign.position.set(at[0], at[1], at[2]);
      sign.rotation.y = yaw;
      hall.add(sign);
    };

    label(
      'Knöpfe',
      'Roter Knopf mit Nachlauf · Hebel zum Rasten · Platte im Boden',
      [SLIDE_X, 4.4, DOOR_WALL_Z + WALL / 2 + 0.02],
      0,
      0xff3b2f,
    );
    label(
      'Türen',
      'Schieben, drehen, und eine, die nur offen bleibt, solange etwas auf der Platte liegt',
      [SWING_X, 4.4, DOOR_WALL_Z + WALL / 2 + 0.02],
      0,
      0x9fd0ff,
    );
    label(
      'Schilder',
      'Hinter den Türen: die Galerie an der Nordwand',
      [PLATE_X, 4.4, DOOR_WALL_Z + WALL / 2 + 0.02],
      0,
      0xffc857,
    );
  }

  /**
   * Die Kisten — und die eine, die auf die Platte gehört.
   *
   * Eine Druckplatte ohne etwas zum Daraufstellen ist eine Platte, auf der man
   * selbst stehen muss, und dann kommt man nie durch die Tür, die sie öffnet.
   * Das ist derselbe Witz wie im Vorbild, und er braucht genau eine Kiste.
   */
  protected override buildProps(): void {
    const physics = this.physics;
    if (!physics) return;
    let index = 0;
    for (const [x, z, size] of [
      [PLATE_X - 1.8, 5.6, 0.5],
      [PLATE_X - 2.6, 5.2, 0.5],
      [SWING_X - 2.4, 6.4, 0.6],
      [SLIDE_X + 2.2, 6.4, 0.45],
      [2.5, -6, 0.55],
    ] as const) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), this.wood);
      crate.position.set(x, size / 2 + 0.02, z);
      this.root.add(crate);
      this.registerProp(
        physics.addDynamic(crate, { mass: size * 18, friction: 0.9, restitution: 0.05 }),
        `interact-crate-${index++}`,
      );
    }

    // Ein zweites Schild-Werkzeug liegt schwebend im Raum: Man soll es finden
    // können, ohne vorher ins Menü zu gehen.
    this.placeTool('sign', new THREE.Vector3(SWING_X + 2.6, 1.2, 6.4), undefined, true);
  }

  /**
   * Die Galerie: drei Schilder, die zeigen, was eine Tafel kann.
   *
   * Sie gehören der **Welt** und nicht dem Spieler (`own: false`): Jeder baut
   * dieselbe Halle, also entstehen sie bei jedem einmal, sie werden nicht
   * verschickt und nicht mitgespeichert. Wer sie doch beschriftet, ändert sie
   * für alle im Raum — bis zum nächsten Neuladen.
   */
  private buildSigns(): void {
    const signs = this.signs;
    if (!signs) return;
    const normal = new THREE.Vector3(0, 0, 1);

    signs.place({
      id: 'lab-welcome',
      own: false,
      point: new THREE.Vector3(-4.2, 1.4, -HALF_Z + 0.05),
      normal,
      settings: clampSign({ width: 2.4, height: 1.2, fontCm: 5, background: 0x0d1524 }),
      text: [
        '# Interaktionslabor',
        '',
        'Ein Raum zum **Anfassen**. Drei Stationen, und alles darin lässt sich bedienen:',
        '',
        '- Der rote Knopf öffnet die **Schiebetür** für sechs Sekunden',
        '- Der Hebel schaltet die **Flügeltür** um und rastet',
        '- Eine Kiste auf der **Druckplatte** hält die dritte Tür auf',
        '',
        '---',
        '',
        '> Mit der leeren Hand auf ein Schild zeigen und den Trigger drücken: dann kannst du es beschriften.',
      ].join('\n'),
    });

    signs.place({
      id: 'lab-markdown',
      own: false,
      point: new THREE.Vector3(0, 1.5, -HALF_Z + 0.05),
      normal,
      settings: clampSign({
        width: 2.4,
        height: 1.8,
        fontCm: 4,
        background: 0xf3efe4,
        color: 0x14181f,
      }),
      text: [
        '# Was auf ein Schild passt',
        '## Überschriften, drei Stufen',
        '',
        'Text mit **fett**, *kursiv* und `Code` mittendrin.',
        '',
        '- Aufzählung mit Punkten',
        '- so viele, wie es braucht',
        '1. oder mit Nummern',
        '',
        '> Ein Zitat steht eingerückt und mit Balken.',
        '',
        '---',
        '',
        'Ein Bild geht auch: `![Text](Adresse)` — solange der Server es freigibt.',
      ].join('\n'),
    });

    signs.place({
      id: 'lab-scroll',
      own: false,
      point: new THREE.Vector3(4.2, 1.4, -HALF_Z + 0.05),
      normal,
      settings: clampSign({
        width: 2.4,
        height: 1.2,
        fontCm: 6,
        autoScroll: 4,
        background: 0x123326,
        color: 0x5ee0a0,
      }),
      text: [
        '# Der lange Aushang',
        '',
        'Dieses Schild rollt von selbst: vier Zentimeter je Sekunde, mit einer Pause oben und unten.',
        '',
        'Wer schneller lesen will, legt den **Daumenstick** der Hand um, die darauf zeigt — dann gewinnt die Hand, und das Automatische wartet.',
        '',
        '## Wofür das gut ist',
        '',
        '- Der Plan für den Abend',
        '- Die Regeln einer Runde',
        '- Wer wann dran ist',
        '- Alles, was sonst im Chat steht und nach dem dritten Beitritt weggescrollt ist',
        '',
        '## Und was noch geht',
        '',
        '- Schriftgröße in Zentimetern, nicht in Pixeln',
        '- Sechs Schriftfarben, sieben Hintergründe',
        '- Markdown an oder aus',
        '- Tafelgröße von 50 cm bis 2,4 m',
        '',
        '---',
        '',
        'Alles davon steht im Menü unter dem Werkzeug **Schild**.',
      ].join('\n'),
    });
  }

  // --- jedes Bild -----------------------------------------------------------

  protected override simulate(dt: number): void {
    this.button?.update(dt);
    this.updatePlate();
    for (const door of this.doors) this.updateDoor(door, dt);
  }

  /** Steht jemand — oder etwas — auf der Platte? */
  private updatePlate(): void {
    const plate = this.plate;
    if (!plate) return;
    let pressed = false;

    const context = this.context;
    if (context) {
      context.rig.getHeadPosition(_head);
      pressed = onPlate(_head) && _head.y < 3;
    }
    if (!pressed) {
      for (const entry of this.props) {
        const at = entry.object.position;
        if (at.y < 1.2 && onPlate(at)) {
          pressed = true;
          break;
        }
      }
    }

    plate.position.y = 0.06 - (pressed ? PLATE_DROP : 0);
    plate.material.emissive.setHex(pressed ? 0x6a5210 : 0x3a2c08);
    if (pressed) {
      // Jedes Bild neu ausgelöst: Die Tür soll zufallen, wenn man die Platte
      // *verlässt*, und nicht mitten unter dem, der darauf steht.
      const door = this.doors.find((entry) => entry.id === 'plate');
      if (door) door.state = triggerDoor(door.state, door.params);
    }
    if (pressed !== this.plateDown) {
      this.plateDown = pressed;
      playTone({
        type: 'square',
        from: pressed ? 220 : 320,
        to: pressed ? 320 : 220,
        duration: 0.06,
        gain: 0.05,
      });
    }
  }

  private updateDoor(door: LabDoor, dt: number): void {
    const before = door.state.open;
    door.state = stepDoor(door.state, dt, door.params);
    const open = door.state.open;

    for (const leaf of door.leaves) {
      if (door.kind === 'slide') {
        leaf.mesh.position.copy(leaf.home);
        leaf.mesh.position.x += leaf.sign * slideOffset(open, DOOR_W * 1.02);
      } else {
        // Der Drehflügel wandert um sein Scharnier: erst drehen, dann den Arm
        // vom Scharnier aus wieder ansetzen. Andersherum stünde er im Rahmen.
        const angle = leaf.sign * swingAngle(open, SWING_MAX);
        const hinge = leaf.hinge!;
        _offset.copy(leaf.home).sub(hinge).applyAxisAngle(UP, angle);
        leaf.mesh.position.copy(hinge).add(_offset);
        leaf.mesh.quaternion.setFromAxisAngle(UP, angle);
      }
      const entry = leaf.entry;
      if (!entry) continue;
      leaf.mesh.getWorldPosition(_point);
      leaf.mesh.getWorldQuaternion(_quaternion);
      entry.body.setNextKinematicTranslation(_point);
      entry.body.setNextKinematicRotation(_quaternion);
    }

    const moving = open > 0.001 && open < 0.999;
    door.lamp.material.color.setHex(
      moving ? LAMP_MOVING : passable(door.state) ? LAMP_ON : LAMP_OFF,
    );
    // Genau einmal melden, wenn sie ankommt — und nicht in jedem Bild dazwischen.
    if (before < 1 && open >= 1) this.announce(`${door.label} offen`);
    else if (before > 0 && open <= 0) this.announce(`${door.label} zu`);
  }

  // --- die Bedienung --------------------------------------------------------

  private pressButton(): void {
    const door = this.doors.find((entry) => entry.id === 'slide');
    if (!door) return;
    this.button?.press();
    door.state = triggerDoor(door.state, door.params);
    playSwitch(true);
  }

  private pullLever(): void {
    const door = this.doors.find((entry) => entry.id === 'swing');
    if (!door || !this.lever) return;
    this.leverOn = !this.leverOn;
    door.state = this.leverOn ? triggerDoor(door.state, door.params) : closeDoor(door.state);
    const arm = this.lever.getObjectByName('lab-lever-arm');
    if (arm) arm.rotation.x = this.leverOn ? 0.5 : -0.5;
    playSwitch(this.leverOn);
  }

  private toggleLights(): void {
    this.lightsOn = !this.lightsOn;
    this.applyLights();
    playSwitch(this.lightsOn);
    this.announce(this.lightsOn ? 'Deckenlicht an' : 'Deckenlicht aus');
  }

  private applyLights(): void {
    for (const lamp of this.lamps) lamp.intensity = this.lightsOn ? 14 : 0;
    for (const glass of this.lampGlass) {
      glass.material.color.setHex(this.lightsOn ? 0xfff3dd : 0x39414f);
    }
    this.lightSwitch?.material.color.setHex(this.lightsOn ? 0xfff0cf : 0x6b5327);
  }

  private pointerTarget(ctx: WorldContext, object: THREE.Object3D, run: () => void): void {
    ctx.pointer.add({ object, onSelect: () => run() });
    this.targets.push(object);
  }
}

const UP = new THREE.Vector3(0, 1, 0);

/** Ob dieser Punkt über der Druckplatte liegt. */
function onPlate(at: THREE.Vector3): boolean {
  const dx = at.x - PLATE_POS.x;
  const dz = at.z - PLATE_POS.z;
  return dx * dx + dz * dz <= PLATE_R * PLATE_R;
}
