import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { FlashlightTool } from '../portal/tools';
import { TextPlane } from '../../ui/TextPlane';
import { playSwitch } from '../../core/Audio';
import {
  DEFAULT_LIGHT_STEP,
  LIGHT_LEVELS,
  lampIntensity,
  lightBrightness,
  lightLabel,
  nextLightStep,
} from './lightLevels';
import type { MenuEntry } from '../../ui/menu';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';

/** Inside of the house: x from -HALF_X to HALF_X, z from -HALF_Z to HALF_Z. */
const HALF_X = 9;
const HALF_Z = 7;
/** Ceiling height, wall thickness, and the size of a doorway. */
const HEIGHT = 2.7;
const WALL = 0.24;
const DOOR_W = 1.5;
const DOOR_H = 2.2;

/** How far the dimmer knob travels from "off" to the top notch. */
const KNOB_TRAVEL = 0.16;
/** The switch glows even when everything is off — dimly, but it glows. */
const SWITCH_DARK = 0x6b5327;
const SWITCH_BRIGHT = 0xfff0cf;
const PIP_DARK = 0x39414f;

const _lampOff = new THREE.Color(0x2b3040);
const _lampOn = new THREE.Color(0xfff0cf);
const _dark = new THREE.Color();
const _bright = new THREE.Color();

/** Which way a wall runs: along X, or along Z. */
type Axis = 'x' | 'z';

/** A ceiling lamp: the light and the disc that shows it is on. */
interface Lamp {
  light: THREE.PointLight;
  glass: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
}

/**
 * A house with the lights off — the world for trying out darkness.
 *
 * There is no sky and no sun in here: the ambient light is turned down to
 * almost nothing, so what you see is what you carry or switch on. The start
 * room has a **dimmer** on the wall (point at it and pull, or poke it) that
 * steps the ceiling lamps of the whole house from off through four settings
 * up to bright — and glows by itself at every one of them, because a light
 * switch you need a torch to find is no use. There is also a **torch**
 * floating in mid-air, and a few other portable lights on the crates: a glowing ball that
 * can be thrown down a corridor, a lantern and two glow sticks. One room —
 * the north-west one — has no lamp at all and stays dark whatever the switch
 * says. That is the point of the place: to see what a light source does when
 * it is the only one.
 *
 * Everything else is the portal lab's: the same belt, the same tools, the same
 * physics and the same shared session. Only the light panels beside the doors
 * and the floor take portals — a portal in a plaster wall would open the house
 * up to the void outside it.
 */
export class DarkWorld extends PortalWorld {
  private readonly plaster = new THREE.MeshStandardMaterial({ color: 0x9aa0ad, roughness: 0.95 });
  private readonly floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b6f78,
    roughness: 0.95,
  });
  private readonly ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x7b8290,
    roughness: 0.9,
  });
  private readonly panel = new THREE.MeshStandardMaterial({
    color: 0xf2f4f8,
    roughness: 0.6,
    metalness: 0.05,
  });
  private readonly wood = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.85 });
  private readonly metal = new THREE.MeshStandardMaterial({
    color: 0x8b93a4,
    roughness: 0.4,
    metalness: 0.6,
  });

  private readonly lamps: Lamp[] = [];
  /** The row in the wrist menu, so the wall switch can keep it honest. */
  private lightEntry: MenuEntry | null = null;
  /** The plate on the wall — a pointer target as well as a thing to poke. */
  private plate: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;
  /** The parts of the dimmer that show what it is set to. */
  private knob: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> | null = null;
  private face: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  private readonly pips: Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>> = [];
  /** The little light that keeps the switch itself findable. */
  private switchLight: THREE.PointLight | null = null;
  /** Which notch the dimmer is on — dark to start with, that is the point. */
  private lightStep = DEFAULT_LIGHT_STEP;

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // Distance eats the little light there is — a corridor should not be a
    // clearly lit tube just because the far end happens to face a lamp.
    ctx.scene.fog = new THREE.FogExp2(0x04060a, 0.06);
    if (this.plate) ctx.pointer.add({ object: this.plate, onSelect: () => this.stepLights() });
    this.applyLights();
  }

  override dispose(ctx: WorldContext): void {
    if (this.plate) ctx.pointer.remove(this.plate);
    this.plate = null;
    this.knob = null;
    this.face = null;
    this.switchLight = null;
    this.pips.length = 0;
    this.lightEntry = null;
    this.lamps.length = 0;
    ctx.scene.fog = null;
    super.dispose(ctx);
  }

  override menu(): MenuEntry[] {
    const entry: MenuEntry = {
      id: 'dark:lights',
      label: `Deckenlicht: ${lightLabel(this.lightStep)}`,
      sub: 'Dieselben Stufen wie der Dimmer an der Wand im Startraum',
      icon: 'lamp',
      accent: 0xffd88a,
      run: () => this.stepLights(),
    };
    this.lightEntry = entry;
    return [...super.menu(), entry];
  }

  protected override spawnPoint(): THREE.Vector3 {
    // In the start room, facing the door to the corridor.
    return new THREE.Vector3(-4.5, 0, 5.2);
  }

  protected override skyColor(): number {
    return 0x04060a;
  }

  /**
   * Almost nothing. Not *quite* nothing: a room in which you cannot make out
   * your own hands is not dark, it is broken — and the first thing a player
   * does in the dark is look at their hands.
   */
  protected override lightIntensity(): number {
    return 0.035;
  }

  protected override welcome(): string {
    return 'Dunkelhaus · Dimmer an der Wand (fünf Stufen) · Taschenlampe schwebt vor dir';
  }

  /** No portal guns on the hips: in here you want a hand free for a light. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [['gun-dual', 'left']];
  }

  protected override buildEnvironment(): void {
    const house = new THREE.Group();
    house.name = 'dark-house';
    this.root.add(house);

    this.buildShell(house);
    this.buildRooms(house);
    this.buildLamps(house);
    this.buildSwitch(house);
    this.buildSigns(house);
    this.buildProps();
  }

  /** Floor, ceiling and the four outside walls. No windows: that is the idea. */
  private buildShell(house: THREE.Group): void {
    const width = (HALF_X + WALL) * 2;
    const depth = (HALF_Z + WALL) * 2;

    // The floor takes portals, so a portal in the floor is still possible in
    // the dark — falling through one is half the fun of the lab.
    this.slab(house, this.floorMaterial, [width, WALL, depth], [0, -WALL / 2, 0], true);
    this.slab(
      house,
      this.ceilingMaterial,
      [width, WALL, depth],
      [0, HEIGHT + WALL / 2, 0],
      false,
    );

    this.wall(house, 'x', -HALF_Z - WALL / 2, -HALF_X, HALF_X, []);
    this.wall(house, 'x', HALF_Z + WALL / 2, -HALF_X, HALF_X, []);
    this.wall(house, 'z', -HALF_X - WALL / 2, -HALF_Z, HALF_Z, []);
    this.wall(house, 'z', HALF_X + WALL / 2, -HALF_Z, HALF_Z, []);
  }

  /**
   * The inside: a corridor across the whole house, two rooms south of it and
   * two north, and a short passage off the north-east one that ends nowhere.
   */
  private buildRooms(house: THREE.Group): void {
    // The corridor runs between z = -2 and z = 1, with two doors on each side.
    this.wall(house, 'x', -2, -HALF_X, HALF_X, [-6, 5]);
    this.wall(house, 'x', 1, -HALF_X, HALF_X, [-4, 3]);

    // The two south rooms and the two north ones.
    this.wall(house, 'z', 0, 1, HALF_Z, []);
    this.wall(house, 'z', 0, -HALF_Z, -2, []);
    // A back room behind the south-east one.
    this.wall(house, 'z', 4.5, 1, HALF_Z, [5.4]);
    // The dead end off the north-east room.
    this.wall(house, 'x', -4.5, 0, HALF_X, [7]);

    // The pale panels beside the doors: what a portal sticks to in here. Only
    // these and the floor — a portal in a plaster wall would open the house up
    // to the nothing outside it.
    for (const [x, z] of [
      [-1.6, 1 - WALL / 2 - 0.06],
      [6.6, 1 - WALL / 2 - 0.06],
      [-2.6, -2 + WALL / 2 + 0.06],
      [7.6, -2 + WALL / 2 + 0.06],
    ] as const) {
      this.slab(house, this.panel, [1.4, 2.2, 0.12], [x, 1.2, z], true);
    }
  }

  /**
   * A wall running along one axis, with doorways punched out of it. Every
   * opening keeps its lintel, so the wall above a door is still a wall.
   *
   * @param at position on the other axis
   * @param doors centres of the openings, along the run
   */
  private wall(
    house: THREE.Group,
    axis: Axis,
    at: number,
    from: number,
    to: number,
    doors: readonly number[],
    portalable = false,
  ): void {
    const piece = (a: number, b: number, y0: number, y1: number): void => {
      const length = b - a;
      const height = y1 - y0;
      if (length <= 0.001 || height <= 0.001) return;
      const size: [number, number, number] =
        axis === 'x' ? [length, height, WALL] : [WALL, height, length];
      const centre = (a + b) / 2;
      const position: [number, number, number] =
        axis === 'x' ? [centre, (y0 + y1) / 2, at] : [at, (y0 + y1) / 2, centre];
      this.slab(house, this.plaster, size, position, portalable);
    };

    let cursor = from;
    for (const door of [...doors].sort((a, b) => a - b)) {
      const start = door - DOOR_W / 2;
      const end = door + DOOR_W / 2;
      piece(cursor, start, 0, HEIGHT);
      piece(start, end, DOOR_H, HEIGHT);
      cursor = end;
    }
    piece(cursor, to, 0, HEIGHT);
  }

  /**
   * Four lamps for five rooms. The north-west room deliberately has none: with
   * the ceiling lights on, there is still one room you can only look into with
   * something in your hand.
   */
  private buildLamps(house: THREE.Group): void {
    for (const [x, z] of [
      [-4.5, 4], // start room
      [0, -0.5], // corridor
      [2.4, 4], // south-east room
      [4.5, -3], // north-east room
    ] as const) {
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 0.1, 16, 1, true),
        this.metal,
      );
      shade.position.set(x, HEIGHT - 0.09, z);
      house.add(shade);

      const glass = new THREE.Mesh(
        new THREE.CircleGeometry(0.2, 20),
        new THREE.MeshBasicMaterial({ color: 0x2b3040, toneMapped: false }),
      );
      glass.rotation.x = Math.PI / 2;
      glass.position.set(x, HEIGHT - 0.14, z);
      house.add(glass);

      // The lights stay in the scene when they are off and are turned down to
      // zero instead: three.js rebuilds every shader in the room when the
      // number of lights changes, and a switch is not worth a hitch.
      const light = new THREE.PointLight(0xffe7c0, 0, 16, 2);
      light.position.set(x, HEIGHT - 0.2, z);
      house.add(light);

      this.lamps.push({ light, glass });
    }
  }

  /**
   * The dimmer on the wall of the start room, next to the door.
   *
   * It is the one thing in the house that is **always lit**: everything else
   * here can end up invisible, and a light switch you have to find with a
   * torch is a joke that only works once. So the plate glows by itself (basic
   * materials, no lighting involved), carries a little light of its own to
   * put a halo on the wall around it, and shows what it is set to even when
   * it is set to nothing — the knob sits at the bottom and the pips above it
   * are dark.
   */
  private buildSwitch(house: THREE.Group): void {
    const group = new THREE.Group();
    group.name = 'light-dimmer';
    // On the start room's side of the corridor wall, at the height a switch
    // is at — straight ahead and a little to the right as you spawn.
    group.position.set(-2.4, 1.15, 1 + WALL / 2 + 0.02);
    house.add(group);

    // The frame is what the pointer and the finger hit; everything else only
    // has to be looked at.
    this.plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.25, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x232a38, roughness: 0.6 }),
    );
    this.plate.position.z = 0.015;
    group.add(this.plate);

    this.face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.13, 0.21),
      new THREE.MeshBasicMaterial({ color: SWITCH_DARK, toneMapped: false }),
    );
    this.face.position.z = 0.031;
    group.add(this.face);

    // One pip per notch above "off", bottom to top.
    for (let i = 1; i < LIGHT_LEVELS.length; i++) {
      const pip = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.012, 0.006),
        new THREE.MeshBasicMaterial({ color: PIP_DARK, toneMapped: false }),
      );
      pip.position.set(0.045, KNOB_TRAVEL * (i / (LIGHT_LEVELS.length - 1) - 0.5), 0.034);
      group.add(pip);
      this.pips.push(pip);
    }

    // The knob slides up a notch per press.
    this.knob = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.03, 0.02),
      new THREE.MeshBasicMaterial({ color: SWITCH_DARK, toneMapped: false }),
    );
    this.knob.position.set(-0.015, -KNOB_TRAVEL / 2, 0.038);
    group.add(this.knob);

    // Faint on its own, brighter with the setting: from across a dark room
    // the switch should read as a small glow on the wall, not as a rumour.
    this.switchLight = new THREE.PointLight(0xffd9a0, 0.25, 1.6, 2);
    this.switchLight.position.z = 0.12;
    group.add(this.switchLight);
  }

  private buildSigns(house: THREE.Group): void {
    const sign = new TextPlane({
      width: 2.2,
      height: 0.7,
      title: 'Dunkelhaus',
      body: 'Dimmer an der Wand: aus, dämmrig, gedimmt, normal, hell. Taschenlampe: Trigger schaltet, die andere Hand an der Linse stellt den Kegel.',
      accent: 0xffd88a,
    });
    sign.position.set(-5.6, 2, 1 + WALL / 2 + 0.03);
    house.add(sign);
  }

  /** The crates, and everything on them that gives light. */
  protected override buildProps(): void {
    const physics = this.physics!;
    let index = 0;

    // Two crates to put things on and to knock about.
    for (const [x, z, size] of [
      [-6.6, 4.4, 0.6],
      [-6.6, 3.2, 0.45],
      [-2.2, 5.6, 0.5],
    ] as const) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), this.wood);
      crate.position.set(x, size / 2, z);
      this.root.add(crate);
      this.registerProp(
        physics.addDynamic(crate, { mass: size * 16, friction: 0.85, restitution: 0.05 }),
        `dark-crate-${index++}`,
      );
    }

    // The torch: floating in front of the player, switched on, so the room has
    // exactly one thing in it that can be found without any light at all.
    const torch = this.placeTool('flashlight', new THREE.Vector3(-4.5, 1.15, 3.6), undefined, true);
    if (torch instanceof FlashlightTool) torch.setLit(true);

    // The other portable lights: a ball to throw, a lantern to carry, two
    // sticks to drop where you have already been.
    this.glowBall(new THREE.Vector3(-6.6, 0.85, 4.4), 0xffd9a0, 6, 9, 'dark-ball');
    this.lantern(new THREE.Vector3(-6.6, 0.62, 3.2), 'dark-lantern');
    this.glowStick(new THREE.Vector3(-2.2, 0.58, 5.6), 0x5eff9f, 'dark-stick-green');
    this.glowStick(new THREE.Vector3(-2.4, 0.58, 5.4), 0xff5ec8, 'dark-stick-pink');
  }

  /** A ball that glows. The one thing here that is meant to be thrown. */
  private glowBall(
    position: THREE.Vector3,
    color: number,
    intensity: number,
    range: number,
    id: string,
  ): void {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 20, 14),
      new THREE.MeshBasicMaterial({ color, toneMapped: false }),
    );
    ball.position.copy(position);
    ball.add(new THREE.PointLight(color, intensity, range, 2));
    this.root.add(ball);
    this.registerProp(
      this.physics!.addDynamic(ball, {
        shape: { kind: 'ball' },
        halfExtents: new THREE.Vector3(0.09, 0.09, 0.09),
        mass: 1.2,
        friction: 0.5,
        restitution: 0.55,
        ccd: true,
      }),
      id,
    );
  }

  /** A lantern: brighter and warmer than the ball, and it stands where it is put. */
  private lantern(position: THREE.Vector3, id: string): void {
    const lantern = new THREE.Group();
    lantern.position.copy(position);

    const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.2, 12, 1, true), this.metal);
    lantern.add(cage);
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffca77, toneMapped: false }),
    );
    lantern.add(glass);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 6, 16, Math.PI), this.metal);
    handle.position.y = 0.1;
    lantern.add(handle);
    lantern.add(new THREE.PointLight(0xffc46a, 7.5, 12, 2));

    this.root.add(lantern);
    this.registerProp(
      this.physics!.addDynamic(lantern, {
        halfExtents: new THREE.Vector3(0.09, 0.12, 0.09),
        mass: 1.6,
        friction: 0.9,
        restitution: 0.05,
      }),
      id,
    );
  }

  /** A glow stick: dim, coloured, and made for leaving behind as a marker. */
  private glowStick(position: THREE.Vector3, color: number, id: string): void {
    const stick = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.017, 0.14, 4, 10),
      new THREE.MeshBasicMaterial({ color, toneMapped: false }),
    );
    stick.position.copy(position);
    stick.rotation.z = Math.PI / 2;
    stick.add(new THREE.PointLight(color, 3.2, 6, 2));
    this.root.add(stick);
    this.registerProp(
      this.physics!.addDynamic(stick, {
        halfExtents: new THREE.Vector3(0.02, 0.09, 0.02),
        mass: 0.4,
        friction: 0.8,
        restitution: 0.2,
      }),
      id,
    );
  }

  /** One notch on, from the wall plate or from the menu row. */
  private stepLights(): void {
    this.lightStep = nextLightStep(this.lightStep);
    this.applyLights();
    playSwitch(this.lightStep > 0);
    this.context?.notify(`Deckenlicht: ${lightLabel(this.lightStep)}`);
  }

  /** Puts the current notch onto the lamps and onto the dimmer itself. */
  private applyLights(): void {
    const brightness = lightBrightness(this.lightStep);
    for (const lamp of this.lamps) {
      lamp.light.intensity = lampIntensity(this.lightStep);
      // The glass goes from cold and dead to warm along with the lamp, so a
      // room says what it is set to even when nothing else in it does.
      lamp.glass.material.color.lerpColors(_lampOff, _lampOn, brightness);
    }

    // The switch never goes fully dark — it only gets brighter.
    _dark.setHex(SWITCH_DARK);
    _bright.setHex(SWITCH_BRIGHT);
    this.face?.material.color.lerpColors(_dark, _bright, brightness * 0.55);
    this.knob?.material.color.lerpColors(_dark, _bright, 0.35 + brightness * 0.65);
    if (this.knob) {
      const top = LIGHT_LEVELS.length - 1;
      this.knob.position.y = KNOB_TRAVEL * (this.lightStep / top - 0.5);
    }
    this.pips.forEach((pip, index) => {
      pip.material.color.setHex(index < this.lightStep ? SWITCH_BRIGHT : PIP_DARK);
    });
    if (this.switchLight) this.switchLight.intensity = 0.25 + brightness * 0.5;

    if (this.lightEntry) {
      this.lightEntry.label = `Deckenlicht: ${lightLabel(this.lightStep)}`;
      this.context?.menu.refresh();
    }
  }
}
