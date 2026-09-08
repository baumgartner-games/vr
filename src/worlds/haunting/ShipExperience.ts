import * as THREE from 'three';
import './haunting.css';
import { playTone, sharedAudio } from '../../core/Audio';
import { LAYER_SELF_ONLY } from '../../core/PlayerAvatar';
import type { WorldContext } from '../../core/types';
import type { MenuEntry } from '../../ui/menu';
import { MirrorSurface } from '../shared/Mirror';
import { Burst } from '../effects/Burst';
import { EFFECTS } from '../effects/effectKinds';
import { PLAN_DOOR_H, PLAN_DOOR_W } from '../editor/levelPlan';
import { TILE, dirX, dirZ } from '../nav/navTile';
import { MARKS, roomAt, roomCentre, tilesOf, type HouseRoom, type HouseSpec } from './house';
import {
  MONSTERS,
  ROOM_COUNTS,
  lockerCode,
  puzzleFor,
  puzzleSolved,
  repairsFor,
  type Repair,
  type StationOptions,
} from './mission';
import { SHIP, animateCreature, buildCreature, label } from './shipArt';
import type { HauntState } from './net';
import { stepAlong, type DronePose, type DroneRoute } from './droneRoute';

interface ShipHost {
  ctx: WorldContext;
  spec(): HouseSpec;
  state(): HauntState;
  say(text: string): void;
  configure(options: StationOptions): void;
  start(): void;
  test(): void;
  door(id: string): void;
  travel(at: THREE.Vector3): void;
  route(from: DronePose, room: HouseRoom): DroneRoute | null;
}
interface Screen {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
}
interface Cabinet {
  id: string;
  room: string;
  group: THREE.Group;
  leaf: THREE.Mesh;
  loot: string;
  lootMesh: THREE.Object3D;
  scanner: THREE.Object3D;
  at: THREE.Vector3;
}
interface Door {
  id: string;
  leaves: [THREE.Mesh, THREE.Mesh];
  amount: number;
  at: THREE.Vector3;
  panel: Screen;
}
interface Console {
  repair: Repair;
  screen: Screen;
  at: THREE.Vector3;
  selected: number;
  training?: boolean;
}
const _head = new THREE.Vector3(),
  _pos = new THREE.Vector3(),
  _direction = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const PANEL_RANGE = 3.5;

/** Station-only interactions. All game state belongs to the VR host snapshot. */
export class ShipExperience {
  readonly root = new THREE.Group();
  readonly bay = new THREE.Group();
  private readonly targets: THREE.Object3D[] = [];
  private readonly screens: Screen[] = [];
  private readonly cabinets: Cabinet[] = [];
  private readonly doors: Door[] = [];
  private readonly consoles: Console[] = [];
  private readonly effects: Burst[] = [];
  private readonly gallery: THREE.Object3D[] = [];
  private readonly lockerEntries = new Map<string, string>();
  private readonly suit = new THREE.Group();
  private readonly wound = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.13),
    new THREE.MeshBasicMaterial({ color: 0x942e35, transparent: true, opacity: 0.88 }),
  );
  private readonly visor: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly wrist: Screen;
  private readonly command: Screen;
  private readonly dom = document.createElement('section');
  private sensorMode: 'off' | 'radar' | 'xray' = 'off';
  private audioOn = true;
  private hum: { oscillator: OscillatorNode; gain: GainNode } | null = null;
  private paintTimer = 0;
  private soundTimer = 0;
  private effectTimer = 0;
  private stamp = '';
  private hiddenWas = false;
  private savedRigFrozen = false;
  private nextSimulationRoom = 0;
  private simulationTimer = 0;
  private simulationRoute: DroneRoute | null = null;
  private simulationGoal: HouseRoom | null = null;
  private readonly simulationPose: DronePose = { x: 1.5, z: 13.5, yaw: 0 };
  private simulated: THREE.Object3D | null = null;
  private readonly messages: string[] = [];
  private flatFlight = 0;
  private disposed = false;
  private readonly bayLight = new THREE.PointLight(0xddefff, 0, 6, 2);
  private readonly suitColors = new Map<THREE.MeshStandardMaterial, THREE.Color>();
  private readonly lockerHome = new THREE.Vector3();

  constructor(private readonly host: ShipHost) {
    this.root.name = 'orbital-interactions';
    this.command = this.screen(3.6, 1.9);
    this.command.mesh.position.set(-3.7, 1.72, 10.4);
    this.root.add(this.command.mesh);
    this.bind(this.command.mesh, (uv) => {
      if (!uv) return;
      const index = Math.floor((1 - uv.y) * 6);
      this.commandAction(index);
    });
    this.buildCabinets();
    this.buildConsoles();
    this.buildDoors();
    this.buildBay();
    this.wrist = this.screen(0.29, 0.29);
    this.wrist.mesh.name = 'mission-wrist-scanner';
    this.root.add(this.wrist.mesh);
    this.bind(this.wrist.mesh, () => this.cycleSensor(), true);
    this.visor = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.25),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        uniforms: { fogAmount: { value: 0 }, damage: { value: 0 } },
        vertexShader:
          'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader:
          'varying vec2 vUv; uniform float fogAmount; uniform float damage; void main(){vec2 p=(vUv-.5)*2.;float rim=smoothstep(.4,1.,length(p));float droplets=.6+.4*sin(vUv.x*83.)*sin(vUv.y*97.);vec3 c=mix(vec3(.68,.82,.85),vec3(.55,.08,.09),damage);float a=rim*(fogAmount*.34*droplets+damage*.18);gl_FragColor=vec4(c,a);}',
      }),
    );
    this.visor.name = 'helmet-condensation';
    this.visor.position.z = -0.58;
    this.visor.renderOrder = 998;
    if (host.ctx.role === 'vr') {
      host.ctx.camera.add(this.visor);
      this.buildSuit();
      host.ctx.wear('helmet');
      this.dom.className = 'orbital-player';
      this.dom.setAttribute('aria-label', 'Haunting Spielsteuerung');
      this.dom.addEventListener('click', this.domClick);
      document.body.append(this.dom);
    }
    this.root.add(this.bay);
    this.bayLight.position.set(9, 2.7, 12);
    this.root.add(this.bayLight);
    this.paint();
  }

  private get crew() {
    return this.host.state().crew;
  }
  private get player(): boolean {
    return this.host.ctx.role === 'vr';
  }
  private get active(): boolean {
    const phase = this.host.state().phase;
    return this.player && (phase === 'running' || this.crew.options.test) && !this.crew.simulation;
  }

  private screen(width: number, height: number): Screen {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = Math.round((768 * height) / width);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    const screen = { mesh, canvas, ctx: canvas.getContext('2d')!, texture };
    this.screens.push(screen);
    return screen;
  }
  private bind(
    object: THREE.Object3D,
    action: (uv: THREE.Vector2 | null) => void,
    wearable = false,
  ): void {
    if (!this.player) return;
    this.targets.push(object);
    this.host.ctx.pointer.add({
      object,
      ignore: (hand) => wearable && hand === 'left',
      onSelect: (hit) => {
        this.host.ctx.rig.getHeadPosition(_head);
        object.getWorldPosition(_pos);
        if (_head.distanceTo(_pos) > PANEL_RANGE || (this.crew.simulation && !wearable)) return;
        action(hit.uv);
        this.haptic(0.18, 18);
        this.paint();
      },
    });
  }
  private mesh(
    size: [number, number, number],
    color: number,
    parent: THREE.Object3D,
    at: [number, number, number],
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.25 }),
    );
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  }

  private buildCabinets(): void {
    const spec = this.host.spec();
    let extraIndex = 0;
    spec.rooms.forEach((room) => {
      const task = spec.tasks.find((t) => t.roomId === room.id);
      const loot = task ? task.id : ['radar', 'xray', 'medkit'][extraIndex++ % 3]!;
      const at = freeSpot(spec, room);
      this.cabinet(`cargo-${room.id}`, room.id, at, loot);
      this.locker(room);
    });
    this.cabinet('test-supply', '', new THREE.Vector3(1.6, 0, 13.7), 'test-kit');
  }
  private cabinet(id: string, room: string, at: THREE.Vector3, loot: string): void {
    const g = new THREE.Group();
    g.position.copy(at);
    g.name = id;
    this.mesh([0.82, 0.09, 0.6], SHIP.trim, g, [0, 0.32, 0]);
    this.mesh([0.82, 0.09, 0.6], SHIP.trim, g, [0, 1.24, 0]);
    for (const side of [-1, 1]) this.mesh([0.06, 0.9, 0.6], SHIP.hull, g, [side * 0.38, 0.79, 0]);
    this.mesh([0.8, 0.9, 0.05], SHIP.dark, g, [0, 0.8, -0.28]);
    const leaf = this.mesh([0.75, 0.86, 0.07], SHIP.trim, g, [0, 0.79, 0.3]);
    const badge = label(id === 'test-supply' ? 'TESTAUSRÜSTUNG' : 'FRACHT / ÖFFNEN', 0.65, 0.13);
    badge.position.set(0, 0.2, 0.041);
    leaf.add(badge);
    const lootMesh = this.mesh([0.3, 0.15, 0.24], SHIP.amber, g, [0, 0.65, 0]);
    const lootTag = label(lootLabel(this.host.spec(), loot), 0.65, 0.13, SHIP.amber);
    lootTag.position.set(0, 1.02, 0.01);
    g.add(lootTag);
    const scanner = label(lootLabel(this.host.spec(), loot), 0.72, 0.16, SHIP.cyan);
    scanner.material.depthTest = false;
    scanner.material.transparent = true;
    scanner.material.opacity = 0.85;
    scanner.position.set(0, 0.83, 0.36);
    scanner.renderOrder = 50;
    scanner.visible = false;
    g.add(scanner);
    this.cabinets.push({ id, room, group: g, leaf, loot, lootMesh, scanner, at });
    this.root.add(g);
    this.bind(leaf, () => this.openCabinet(id));
    this.bind(lootMesh, () => this.takeLoot(id));
  }
  private openCabinet(id: string): void {
    if (!this.active) return;
    if (id === 'test-supply' && !this.crew.options.test) {
      this.host.say('Testschrank: zuerst TEST / OHNE MONSTER drücken.');
      return;
    }
    if (!this.crew.opened.includes(id)) this.crew.opened.push(id);
    else this.crew.opened = this.crew.opened.filter((x) => x !== id);
    this.sound('door');
  }
  private takeLoot(id: string): void {
    const c = this.cabinets.find((c) => c.id === id);
    if (!c || !this.active || !this.crew.opened.includes(id) || this.crew.inventory.includes(id))
      return;
    if (c.loot === 'test-kit') {
      if (!this.crew.options.test) return;
      this.crew.inventory.push('radar', 'xray', 'medkit');
      this.host.state().taken = this.host.spec().tasks.map((t) => t.id);
    } else if (this.host.spec().tasks.some((t) => t.id === c.loot)) {
      if (!this.host.state().taken.includes(c.loot)) this.host.state().taken.push(c.loot);
    } else this.crew.inventory.push(c.loot);
    this.crew.inventory.push(id);
    this.host.say(
      `${lootLabel(this.host.spec(), c.loot)} aufgenommen · Werkzeuge im Missionsmenü.`,
    );
    this.sound('success');
    this.host.ctx.refreshWorldMenu();
  }

  private locker(room: HouseRoom): void {
    // Mounted on the south wall away from the walk-through strip.
    const x = (room.rect.x + room.rect.w) * TILE - 0.72;
    const z = (room.rect.z + room.rect.d) * TILE - 0.6;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = Math.PI;
    this.mesh([0.96, 2.16, 0.58], SHIP.dark, group, [0, 1.08, 0]);
    for (const side of [-1, 1])
      this.mesh([0.08, 2.18, 0.62], SHIP.hull, group, [side * 0.5, 1.09, 0]);
    const title = label('SCHUTZSCHRANK\nCODE AUS DEM ARCHIV', 0.83, 0.3);
    title.position.set(0, 1.78, 0.302);
    group.add(title);
    const keypad = this.screen(0.66, 0.64);
    keypad.mesh.position.set(0, 1.22, 0.31);
    group.add(keypad.mesh);
    keypad.mesh.userData.locker = room.id;
    this.root.add(group);
    this.bind(keypad.mesh, (uv) => {
      if (!uv || !this.active) return;
      const n = 1 + Math.floor(uv.x * 2) + Math.floor((1 - uv.y) * 2) * 2;
      this.lockerDigit(room.id, Math.min(4, n));
    });
  }
  private lockerDigit(room: string, digit: number): void {
    if (!this.active) return;
    if (this.crew.hidden) {
      this.leaveLocker();
      return;
    }
    const entered = (this.lockerEntries.get(room) ?? '') + digit;
    this.lockerEntries.set(room, entered);
    if (entered.length < 3) return;
    this.lockerEntries.set(room, '');
    if (entered !== lockerCode(this.host.spec().seed, room)) {
      this.host.say('Code falsch. Das Archiv kennt den Schutzcode.');
      this.sound('error');
      return;
    }
    const r = this.host.spec().rooms.find((r) => r.id === room)!;
    this.host.ctx.rig.getHeadPosition(this.lockerHome);
    this.lockerHome.y = 0;
    this.host.travel(
      new THREE.Vector3((r.rect.x + r.rect.w) * TILE - 0.72, 0, (r.rect.z + r.rect.d) * TILE - 0.6),
    );
    this.crew.hidden = room;
    this.host.say('Im Schutzschrank. Monster zieht vorbei. Missionsmenü → Verlassen.');
    this.sound('door');
  }
  private leaveLocker(): void {
    if (this.crew.hidden) {
      this.host.ctx.rig.frozen = false;
      this.host.travel(this.lockerHome);
    }
    this.crew.hidden = '';
    this.host.say('Schutzschrank verlassen.');
    this.sound('door');
  }

  private buildConsoles(): void {
    for (const repair of repairsFor(this.host.spec())) {
      const room = this.host.spec().rooms.find((r) => r.id === repair.roomId)!;
      const c = roomCentre(room);
      const at = new THREE.Vector3((c.x + 0.5) * TILE, 1.45, room.rect.z * TILE + 0.48);
      const screen = this.screen(1.35, 1.05);
      screen.mesh.position.copy(at);
      this.mesh([1.55, 1.27, 0.18], SHIP.dark, this.root, [at.x, at.y, at.z - 0.1]);
      this.root.add(screen.mesh);
      this.consoles.push({ repair, screen, at, selected: -1 });
      this.bind(screen.mesh, (uv) => {
        if (uv) this.repairInput(repair.id, uv.x, 1 - uv.y);
      });
    }
  }
  private repairInput(id: string, x: number, y: number): void {
    if (!this.active || this.host.state().done.includes(id) || this.crew.hidden) return;
    this.host.ctx.rig.getHeadPosition(_head);
    const console = this.consoles
      .filter((c) => c.repair.id === id && (!c.training || this.crew.options.test))
      .sort((a, b) => a.at.distanceToSquared(_head) - b.at.distanceToSquared(_head))[0]!;
    const repair = console.repair;
    const p = puzzleFor(this.crew, id);
    if (!p.open) {
      if (!this.host.state().taken.includes(repair.itemId)) {
        this.host.say(`Abdeckung verriegelt: ${repair.item} fehlt. Archiv fragen.`);
        this.burst('sparks', console.at);
        this.sound('error');
        return;
      }
      p.open = true;
      this.sound('door');
      return;
    }
    if (repair.puzzle === 'wires') {
      const row = Math.floor((y - 0.27) / 0.16);
      if (row < 0 || row > 3) return;
      if (x < 0.42) console.selected = row;
      else if (x > 0.58 && console.selected >= 0) {
        p.links[console.selected] = row;
        console.selected = -1;
      }
    } else if (repair.puzzle === 'sequence') {
      if (y < 0.4) return;
      const digit = Math.min(4, Math.floor(x * 4) + 1);
      p.links.push(digit);
      if (p.links.length === 3 && p.links.join('') !== repair.code) {
        p.links = [];
        this.sound('error');
      }
    } else {
      const column = Math.min(2, Math.floor(x * 3));
      if (y < 0.73 && y > 0.35) p.digits[column] = ((p.digits[column] ?? 1) % 4) + 1;
      if (y < 0.75) return;
      if (!puzzleSolved(repair, p)) this.sound('error');
    }
    if (puzzleSolved(repair, p)) {
      this.host.state().done.push(id);
      this.host.state().fuse = true;
      if (!this.host.state().lit.includes(repair.roomId)) this.host.state().lit.push(repair.roomId);
      this.host.say(
        `${repair.title}: fertig. ${this.host.state().done.length === 3 ? 'Zur Einsatzzentrale zurückkehren!' : 'Nächsten Auftrag beim Archiv erfragen.'}`,
      );
      this.sound('success');
      this.haptic(0.35, 80);
    } else this.sound('click');
    this.paint();
  }

  private buildDoors(): void {
    for (const d of [...this.host.spec().doors, { id: 'test-bay', x: 2, z: 4, dir: 3 as const }]) {
      const g = new THREE.Group();
      g.position.set(
        (d.x + 0.5 + dirX(d.dir) * 0.5) * TILE,
        0,
        (d.z + 0.5 + dirZ(d.dir) * 0.5) * TILE,
      );
      g.rotation.y = dirX(d.dir) === 0 ? 0 : Math.PI / 2;
      const leaves = [-1, 1].map((side) => {
        const m = this.mesh([PLAN_DOOR_W / 2, PLAN_DOOR_H - 0.04, 0.14], 0x617781, g, [
          (side * PLAN_DOOR_W) / 4,
          PLAN_DOOR_H / 2,
          0,
        ]);
        this.mesh([0.035, PLAN_DOOR_H - 0.18, 0.16], SHIP.dark, m, [
          (-side * PLAN_DOOR_W) / 4 + side * 0.05,
          0,
          0,
        ]);
        return m;
      }) as [THREE.Mesh, THREE.Mesh];
      const panel = this.screen(0.34, 0.36);
      panel.mesh.position.set(PLAN_DOOR_W / 2 + 0.28, 1.25, 0.18);
      g.add(panel.mesh);
      const back = panel.mesh.clone();
      back.rotation.y = Math.PI;
      back.position.z = -0.18;
      g.add(back);
      this.root.add(g);
      const at = g.position.clone();
      this.doors.push({
        id: d.id,
        leaves,
        amount: this.host.state().shut.includes(d.id) ? 0 : 1,
        at,
        panel,
      });
      const action = (): void => {
        if (d.id === 'test-bay') {
          this.host.test();
          return;
        }
        if (!this.active) return;
        this.host.door(d.id);
        this.sound('door');
      };
      this.bind(panel.mesh, action);
      this.bind(back, action);
    }
  }

  private buildBay(): void {
    const banner = label('TESTLABOR / SICHER\nMODELLE · REPARATUREN · SPIEGEL', 3.8, 0.5);
    banner.position.set(9, 2.5, 9.25);
    this.bay.add(banner);
    MONSTERS.forEach((m, i) => {
      const creature = buildCreature(m.id);
      creature.position.set(7.15 + i * 1.75, 0.05, 10.6);
      this.bay.add(creature);
      this.gallery.push(creature);
      const caption = label(`${m.name}\nUNBELEBTE ATTRAPPE`, 1.45, 0.3, SHIP.amber);
      caption.position.set(7.15 + i * 1.75, 0.18, 11.05);
      caption.rotation.x = -0.4;
      this.bay.add(caption);
    });
    const mirror = new MirrorSurface(1.1, 1.9);
    mirror.position.set(11.6, 1.22, 13.3);
    mirror.rotation.y = -Math.PI / 2;
    this.bay.add(mirror);
    repairsFor(this.host.spec()).forEach((repair, i) => {
      const at = new THREE.Vector3(6.22, 1.4, 11.3 + i * 1.2);
      const screen = this.screen(1.05, 0.82);
      screen.mesh.position.copy(at);
      screen.mesh.rotation.y = Math.PI / 2;
      this.bay.add(screen.mesh);
      this.consoles.push({ repair, screen, at, selected: -1, training: true });
      this.bind(screen.mesh, (uv) => {
        if (uv && this.crew.options.test) this.repairInput(repair.id, uv.x, 1 - uv.y);
      });
    });
    const controls = label(
      'EFFEKTPRÜFSTAND\nTRIGGER → FUNKEN / RAUCH / FEUER',
      1.7,
      0.55,
      SHIP.amber,
    );
    controls.position.set(8.2, 1.4, 14.6);
    controls.rotation.y = Math.PI;
    this.bay.add(controls);
    let effect = 0;
    this.bind(controls, () => {
      if (this.crew.options.test) {
        const kind = ['sparks', 'smoke', 'fire'][effect++ % 3]!;
        this.burst(kind, new THREE.Vector3(8.2, 0.9, 13.8));
        this.sound('error');
      }
    });
    const vent = label('WARTUNGSSCHACHT\nMONSTERPASSAGE · BENACHBARTE MODULE', 2.2, 0.45);
    vent.position.set(9.5, 2.3, 14.65);
    vent.rotation.y = Math.PI;
    this.bay.add(vent);
    this.mesh([0.7, 0.55, 0.16], SHIP.dark, this.bay, [9.5, 1.55, 14.65]);
    for (let i = 0; i < 5; i++)
      this.mesh([0.64, 0.024, 0.2], SHIP.hull, this.bay, [9.5, 1.35 + i * 0.095, 14.65]);
  }

  private buildSuit(): void {
    const avatar = this.host.ctx.avatar;
    avatar.traverse((object) => {
      object.layers.enable(0);
      const material = (object as THREE.Mesh).material;
      if (
        material &&
        !Array.isArray(material) &&
        material instanceof THREE.MeshStandardMaterial &&
        material.color.getHex() !== 0x1d2434 &&
        !this.suitColors.has(material)
      ) {
        this.suitColors.set(material, material.color.clone());
        material.color.setHex(0xc6d5d5);
      }
    });
    avatar.head.traverse((object) => object.layers.set(LAYER_SELF_ONLY));
    this.suit.name = 'astronaut-chest-rig';
    avatar.add(this.suit);
    this.mesh([0.32, 0.24, 0.075], 0xd3dcd7, this.suit, [0, 0, -0.15]);
    this.mesh([0.2, 0.11, 0.015], SHIP.dark, this.suit, [0, 0.02, -0.196]);
    const badge = label('EVA / 03', 0.16, 0.046);
    badge.position.set(0, 0.025, -0.207);
    badge.rotation.y = Math.PI;
    this.suit.add(badge);
    for (const side of [-1, 1])
      this.mesh([0.035, 0.45, 0.055], SHIP.amber, this.suit, [side * 0.15, 0, -0.12]);
    this.wound.position.set(0.03, -0.2, -0.185);
    this.wound.rotation.y = Math.PI;
    this.suit.add(this.wound);
  }

  private commandAction(index: number): void {
    if (!this.player) return;
    const options = { ...this.crew.options };
    if (index === 1) this.host.start();
    if (index === 2) this.host.test();
    if (index === 3) {
      options.rooms =
        ROOM_COUNTS[(ROOM_COUNTS.indexOf(options.rooms as 6) + 1) % ROOM_COUNTS.length]!;
      this.host.configure(options);
    }
    if (index === 4) {
      options.monster =
        MONSTERS[(MONSTERS.findIndex((m) => m.id === options.monster) + 1) % MONSTERS.length]!.id;
      this.host.configure(options);
    }
    if (index === 5 && options.test) {
      options.bright = !options.bright;
      this.crew.options = options;
      this.host.say(
        options.bright ? 'Testlicht an.' : 'Test im Dunkeln. Es gibt weiterhin kein Monster.',
      );
    }
  }

  private cycleSensor(): void {
    const modes = [
      'off',
      ...(this.crew.inventory.includes('radar') ? ['radar'] : []),
      ...(this.crew.inventory.includes('xray') ? ['xray'] : []),
    ] as Array<'off' | 'radar' | 'xray'>;
    this.sensorMode = modes[(modes.indexOf(this.sensorMode) + 1) % modes.length]!;
    this.host.ctx.refreshWorldMenu();
    this.host.say(
      this.sensorMode === 'off'
        ? 'Sensor aus. Sensoren liegen in Frachtcontainern.'
        : this.sensorMode === 'radar'
          ? 'Bewegungsradar am linken Handgelenk · 18 Meter Reichweite.'
          : 'Röntgen aktiv · Fracht in Blickrichtung, bis sechs Meter.',
    );
  }
  private heal(): void {
    const index = this.crew.inventory.indexOf('medkit');
    if (!this.active || index < 0 || this.crew.hp === 3 || this.crew.hp === 0) {
      this.host.say('Medkit nötig, oder Anzug bereits intakt.');
      return;
    }
    this.crew.inventory.splice(index, 1);
    this.crew.hp = Math.min(3, this.crew.hp + 1);
    this.crew.invulnerable = 3;
    this.sound('success');
    this.host.say('Wunde versorgt. Ein Treffer geheilt.');
    this.host.ctx.refreshWorldMenu();
  }

  update(dt: number): void {
    const ctx = this.host.ctx;
    const state = this.host.state();
    const crew = this.crew;
    ctx.rig.getHeadPosition(_head);
    this.bay.visible = crew.options.test;
    this.bayLight.intensity = crew.options.test ? 45 : 0;
    this.command.mesh.visible = true;
    for (const door of this.doors) {
      const goal =
        door.id === 'test-bay' ? Number(crew.options.test) : state.shut.includes(door.id) ? 0 : 1;
      const before = door.amount;
      door.amount += Math.sign(goal - before) * Math.min(Math.abs(goal - before), dt * 2.5);
      door.leaves.forEach(
        (leaf, i) =>
          (leaf.position.x = (i ? 1 : -1) * (PLAN_DOOR_W / 4 + (door.amount * PLAN_DOOR_W) / 2)),
      );
    }
    for (const cabinet of this.cabinets) {
      const opened = crew.opened.includes(cabinet.id);
      cabinet.leaf.position.x = THREE.MathUtils.damp(
        cabinet.leaf.position.x,
        opened ? -0.72 : 0,
        8,
        dt,
      );
      cabinet.lootMesh.visible = !crew.inventory.includes(cabinet.id);
      cabinet.group.visible = cabinet.id !== 'test-supply' || crew.options.test;
      ctx.camera.getWorldDirection(_direction);
      _pos.copy(cabinet.at).sub(_head);
      cabinet.scanner.visible =
        this.player &&
        this.sensorMode === 'xray' &&
        _pos.length() < 6 &&
        _pos.normalize().dot(_direction) > 0.65 &&
        !crew.inventory.includes(cabinet.id);
    }
    for (const effect of [...this.effects])
      if (!effect.update(dt)) {
        effect.dispose();
        this.effects.splice(this.effects.indexOf(effect), 1);
      }
    if (this.player) {
      const left = ctx.input.get('left');
      if (left?.tracked) {
        const anchor = left.grip.visible ? left.grip : left.targetRay;
        anchor.getWorldPosition(this.wrist.mesh.position);
        anchor.getWorldQuaternion(this.wrist.mesh.quaternion);
        this.wrist.mesh.rotateX(-0.8);
        this.wrist.mesh.translateY(0.08);
        this.wrist.mesh.translateZ(0.1);
      } else {
        ctx.camera.getWorldPosition(this.wrist.mesh.position);
        ctx.camera.getWorldQuaternion(this.wrist.mesh.quaternion);
        this.wrist.mesh.translateX(-0.4);
        this.wrist.mesh.translateY(-0.3);
        this.wrist.mesh.translateZ(-0.75);
      }
      this.wrist.mesh.visible = !crew.simulation;
      this.visor.visible = !crew.simulation;
      this.visor.material.uniforms.fogAmount!.value = crew.exertion;
      this.visor.material.uniforms.damage!.value = Math.max(
        crew.hidden ? 0.2 : 0,
        (3 - crew.hp) / 3,
      );
      ctx.avatar.head.getWorldPosition(_pos);
      ctx.avatar.worldToLocal(_pos);
      this.suit.position.set(_pos.x, _pos.y - 0.62, _pos.z);
      this.suit.rotation.y = ctx.avatar.bodyYaw;
      this.wound.visible = crew.hp < 3;
      const hidden = !!crew.hidden || crew.hp === 0;
      if (hidden !== this.hiddenWas) {
        if (hidden) this.savedRigFrozen = ctx.rig.frozen;
        ctx.rig.frozen = hidden || this.savedRigFrozen;
        this.hiddenWas = hidden;
      }
      this.dom.hidden = ctx.renderer.xr.isPresenting;
      this.stepSound(dt, _head);
      this.stepSimulation(dt);
    } else this.wrist.mesh.visible = false;
    this.paintTimer -= dt;
    if (this.paintTimer <= 0) {
      this.paintTimer = 0.12;
      this.paint();
    }
  }

  private paint(): void {
    if (this.disposed) return;
    const state = this.host.state();
    const crew = this.crew;
    this.rows(this.command, [
      'HAUNTING / ORBITAL · 1 VR + 2 HANDYS',
      'MISSION STARTEN',
      'TEST / OHNE MONSTER',
      `STATION: ${crew.options.rooms} RÄUME · ANTIPPEN`,
      `GEGNER: ${MONSTERS.find((m) => m.id === crew.options.monster)!.name}`,
      crew.options.test
        ? `TESTLICHT: ${crew.options.bright ? 'HELL' : 'DUNKEL'} · ANTIPPEN`
        : 'TESTLABOR: MIT TEST ÖFFNEN',
    ]);
    for (const door of this.doors)
      this.rows(door.panel, [state.shut.includes(door.id) ? 'ZU' : 'OFFEN', 'TÜR', 'ANTIPPEN']);
    for (const screen of this.screens)
      if (screen.mesh.userData.locker) {
        const id = screen.mesh.userData.locker as string;
        this.gridScreen(screen, this.lockerEntries.get(id) || 'CODE?', ['1', '2', '3', '4']);
      }
    for (const console of this.consoles) this.paintRepair(console);
    this.paintWrist();
    this.paintDom();
  }
  private base(screen: Screen, title: string): CanvasRenderingContext2D {
    const c = screen.ctx;
    c.fillStyle = '#081823';
    c.fillRect(0, 0, screen.canvas.width, screen.canvas.height);
    c.strokeStyle = '#33556a';
    c.lineWidth = 3;
    c.strokeRect(2, 2, screen.canvas.width - 4, screen.canvas.height - 4);
    c.fillStyle = '#7de9ec';
    c.font = 'bold 30px system-ui';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(
      title,
      screen.canvas.width / 2,
      screen.canvas.height * 0.12,
      screen.canvas.width - 30,
    );
    return c;
  }
  private rows(screen: Screen, rows: string[]): void {
    const key = rows.join('|');
    if (screen.mesh.userData.paint === key) return;
    screen.mesh.userData.paint = key;
    const c = this.base(screen, '');
    const { width: w, height: h } = screen.canvas;
    rows.forEach((row, i) => {
      c.fillStyle = i === 2 ? '#184c48' : i % 2 ? '#142e3c' : '#0e222e';
      c.fillRect(9, (i * h) / rows.length + 4, w - 18, h / rows.length - 8);
      c.fillStyle = i === 2 ? '#a9ffdf' : '#dcebf0';
      c.font = `600 ${Math.min(34, (h / rows.length) * 0.43)}px system-ui`;
      c.fillText(row, w / 2, ((i + 0.5) * h) / rows.length, w - 35);
    });
    screen.texture.needsUpdate = true;
  }
  private gridScreen(screen: Screen, title: string, values: string[]): void {
    const key = title + values.join('|');
    if (screen.mesh.userData.paint === key) return;
    screen.mesh.userData.paint = key;
    const c = this.base(screen, title);
    const w = screen.canvas.width,
      h = screen.canvas.height;
    values.forEach((n, i) => {
      const x = (((i % 2) + 0.5) * w) / 2,
        y = ((Math.floor(i / 2) + 0.5) * h) / 2;
      c.fillStyle = '#d4f1ed';
      c.font = '64px monospace';
      c.fillText(n, x, y + h * 0.08);
    });
    screen.texture.needsUpdate = true;
  }
  private paintRepair(console: Console): void {
    const { screen, repair } = console;
    const p = puzzleFor(this.crew, repair.id);
    const done = this.host.state().done.includes(repair.id);
    if (done || !p.open) {
      this.rows(screen, [
        repair.title.toUpperCase(),
        done ? 'SYSTEM ONLINE' : `BENÖTIGT: ${repair.item}`,
        done ? 'NÄCHSTEN AUFTRAG ERFRAGEN' : 'ABDECKUNG ANTIPPEN',
      ]);
      return;
    }
    const key = JSON.stringify([p, console.selected]);
    if (screen.mesh.userData.paint === key) return;
    screen.mesh.userData.paint = key;
    const c = this.base(screen, repair.title.toUpperCase());
    const w = screen.canvas.width,
      h = screen.canvas.height;
    c.font = '24px system-ui';
    c.fillStyle = '#b6c9d4';
    if (repair.puzzle === 'wires') {
      c.fillText('Start wählen → gleiches Symbol verbinden', w / 2, h * 0.21);
      const colors = ['#f5aa71', '#70def0', '#dcb5ff', '#b3d57b'],
        symbols = ['▲', '●', '■', '◆'];
      for (let i = 0; i < 4; i++) {
        const y = h * (0.35 + i * 0.16);
        c.font = '38px sans-serif';
        c.fillStyle = colors[i]!;
        c.fillText(`${console.selected === i ? '› ' : ''}${symbols[i]}`, w * 0.18, y);
        c.fillStyle = colors[repair.order[i]!]!;
        c.fillText(symbols[repair.order[i]!]!, w * 0.82, y);
        const link = p.links[i];
        if (link !== undefined && link >= 0) {
          c.strokeStyle = colors[i]!;
          c.lineWidth = 8;
          c.beginPath();
          c.moveTo(w * 0.27, y);
          c.lineTo(w * 0.73, h * (0.35 + link * 0.16));
          c.stroke();
        }
      }
    } else if (repair.puzzle === 'sequence') {
      c.fillText('Archiv: Freigabefolge durchgeben', w / 2, h * 0.3);
      c.font = '48px monospace';
      c.fillText(p.links.join(' ') || '— — —', w / 2, h * 0.46);
      for (let i = 0; i < 4; i++) c.fillText(String(i + 1), ((i + 0.5) * w) / 4, h * 0.72);
    } else {
      c.fillText('Archiv: Frequenzen ansagen · Ziffern drehen', w / 2, h * 0.3);
      c.font = '64px monospace';
      for (let i = 0; i < 3; i++)
        c.fillText(String(p.digits[i] ?? 1), ((i + 0.5) * w) / 3, h * 0.55);
      c.font = '32px system-ui';
      c.fillText('FREQUENZEN BESTÄTIGEN', w / 2, h * 0.86);
    }
    screen.texture.needsUpdate = true;
  }
  private paintWrist(): void {
    const s = this.wrist;
    const c = this.base(
      s,
      this.crew.hidden ? 'SCHUTZSCHRANK' : `ANZUG ${this.crew.hp}/3 · ${this.crew.pulse} BPM`,
    );
    const w = s.canvas.width,
      h = s.canvas.height;
    c.font = '27px system-ui';
    c.fillStyle = '#a7bbc7';
    c.fillText(
      this.crew.options.test
        ? 'TEST · KEIN MONSTER'
        : `${this.host.state().done.length}/3 SYSTEME · ${this.sensorMode.toUpperCase()}`,
      w / 2,
      h * 0.25,
    );
    const cx = w / 2,
      cy = h * 0.6,
      r = w * 0.27;
    c.strokeStyle = '#2a5a5f';
    c.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      c.beginPath();
      c.arc(cx, cy, (r * i) / 3, 0, Math.PI * 2);
      c.stroke();
    }
    const angle = performance.now() / 900;
    c.strokeStyle = '#7ee8c6';
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    c.stroke();
    if (this.sensorMode === 'radar') {
      const monster = this.host.state().monster;
      if (monster) {
        this.host.ctx.rig.getHeadPosition(_head);
        _pos.set(monster.x - _head.x, 0, monster.z - _head.z);
        if (_pos.length() < 18) {
          this.host.ctx.camera.getWorldQuaternion(_rotation);
          _pos.applyQuaternion(_rotation.invert());
          c.fillStyle = '#fa907b';
          c.beginPath();
          c.arc(cx + (_pos.x / 18) * r, cy + (_pos.z / 18) * r, 12, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    c.fillStyle = '#d6eeed';
    c.fillText('ANTIPPEN: SENSORMODUS', w / 2, h * 0.94);
    s.texture.needsUpdate = true;
  }

  private nearby(): { cabinet?: Cabinet; console?: Console; room?: HouseRoom; door?: Door } {
    this.host.ctx.rig.getHeadPosition(_head);
    const spec = this.host.spec();
    const room = roomAt(spec, Math.floor(_head.x / TILE), Math.floor(_head.z / TILE)) ?? undefined;
    return {
      cabinet: this.cabinets.find(
        (c) =>
          (c.id === 'test-supply' ? this.crew.options.test : c.room === room?.id) &&
          _head.distanceTo(_pos.copy(c.at).setY(1)) < 2.8,
      ),
      console: this.consoles.find(
        (c) =>
          (c.training ? this.crew.options.test && _head.x > 6 : c.repair.roomId === room?.id) &&
          _head.distanceTo(c.at) < PANEL_RANGE,
      ),
      room,
      door: this.doors.find((d) => _head.distanceTo(_pos.copy(d.at).setY(1)) < 2.8),
    };
  }
  private paintDom(): void {
    if (!this.player) return;
    const state = this.host.state(),
      crew = this.crew,
      near = this.nearby();
    const signature = JSON.stringify([
      crew.options,
      crew.hp,
      crew.hidden,
      crew.inventory,
      crew.opened,
      crew.puzzles,
      crew.simulation,
      this.sensorMode,
      state.phase,
      state.done,
      near.cabinet?.id,
      near.console?.repair.id,
      near.room?.id,
      near.door?.id,
      this.messages,
    ]);
    if (signature === this.stamp) return;
    this.stamp = signature;
    this.dom.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = `ORBITAL · ${crew.options.test ? 'TEST / KEIN MONSTER' : state.phase === 'won' ? 'MISSION ERFÜLLT' : state.phase === 'lost' ? 'MISSION GESCHEITERT' : 'MISSION'} · ANZUG ${crew.hp}/3 · ${state.done.length}/3 SYSTEME`;
    this.dom.append(title);
    const row = document.createElement('div');
    row.className = 'orbital-player__actions';
    this.dom.append(row);
    const button = (text: string, action: string, into: HTMLElement = row): void => {
      const b = document.createElement('button');
      b.textContent = text;
      b.dataset.action = action;
      into.append(b);
    };
    if ((!near.room && !crew.simulation) || crew.hp === 0) {
      button('Mission starten', 'start');
      button('Test ohne Monster', 'test');
      button(`${crew.options.rooms} Räume`, 'rooms');
      button(MONSTERS.find((m) => m.id === crew.options.monster)!.name, 'monster');
    }
    button('Missionsmenü', 'menu');
    button(`Sensor: ${this.sensorMode}`, 'sensor');
    button('Medkit', 'heal');
    if (crew.hidden) button('Schutzschrank verlassen', 'leave');
    if (near.cabinet && !crew.hidden) {
      button('Fracht öffnen / schließen', `open:${near.cabinet.id}`);
      if (crew.opened.includes(near.cabinet.id))
        button(
          `Nehmen: ${lootLabel(this.host.spec(), near.cabinet.loot)}`,
          `loot:${near.cabinet.id}`,
        );
    }
    if (near.door && !crew.hidden) button('Schiebetür bedienen', `door:${near.door.id}`);
    if (near.console && !crew.hidden) {
      const r = near.console.repair,
        p = puzzleFor(crew, r.id);
      const box = document.createElement('div');
      box.className = 'orbital-player__puzzle';
      this.dom.append(box);
      const caption = document.createElement('p');
      caption.textContent = `${r.title} · ${p.open ? (r.puzzle === 'wires' ? 'Kabelstart → passendes Symbol' : 'Archiv nach dem Code fragen') : `Benötigt: ${r.item}`}`;
      box.append(caption);
      if (!p.open) button('Wartungskasten öffnen', `repair:${r.id}:0.5:0.5`, box);
      else if (r.puzzle === 'wires') {
        const symbols = ['▲', '●', '■', '◆'];
        for (let i = 0; i < 4; i++) {
          button(`Start ${symbols[i]}`, `repair:${r.id}:0.2:${0.35 + i * 0.16}`, box);
          button(`Anschluss ${symbols[r.order[i]!]}`, `repair:${r.id}:0.8:${0.35 + i * 0.16}`, box);
        }
      } else if (r.puzzle === 'sequence') {
        for (let i = 1; i <= 4; i++) button(String(i), `repair:${r.id}:${(i - 0.5) / 4}:0.7`, box);
      } else {
        for (let i = 0; i < 3; i++)
          button(`Frequenz ${i + 1}: ${p.digits[i]}`, `repair:${r.id}:${(i + 0.5) / 3}:0.5`, box);
        button('Bestätigen', `repair:${r.id}:0.5:0.9`, box);
      }
    }
    if (near.room && !crew.hidden) {
      const box = document.createElement('div');
      this.dom.append(box);
      const caption = document.createElement('span');
      caption.textContent = 'Schutzcode: ';
      box.append(caption);
      for (let i = 1; i <= 4; i++) button(String(i), `locker:${near.room.id}:${i}`, box);
    }
    if (crew.options.test) {
      const details = document.createElement('details');
      details.open = crew.simulation;
      const summary = document.createElement('summary');
      summary.textContent = 'Test / Räume / Simulation';
      details.append(summary);
      this.dom.append(details);
      button(crew.options.bright ? 'Testlicht aus' : 'Testlicht an', 'light', details);
      button(
        crew.simulation ? 'Simulation beenden' : 'Simulation / Flugmodus',
        'simulate',
        details,
      );
      button('Zur Zentrale', 'home', details);
      for (const room of this.host.spec().rooms)
        button(`Testbesuch: ${room.name} / ${room.id}`, `visit:${room.id}`, details);
      if (crew.simulation) {
        button('Höher fliegen', 'up', details);
        button('Tiefer fliegen', 'down', details);
        const log = document.createElement('p');
        log.textContent = this.messages.join(' · ');
        details.append(log);
      }
    }
  }
  private readonly domClick = (event: Event): void => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]')
      ?.dataset.action;
    if (!action) return;
    const [kind, id, a, b] = action.split(':');
    if (kind === 'start') this.host.start();
    else if (kind === 'test') this.host.test();
    else if (kind === 'rooms') this.commandAction(3);
    else if (kind === 'monster') this.commandAction(4);
    else if (kind === 'light') this.commandAction(5);
    else if (kind === 'sensor') this.cycleSensor();
    else if (kind === 'heal') this.heal();
    else if (kind === 'leave') this.leaveLocker();
    else if (kind === 'menu') this.host.ctx.menu.toggle();
    else if (kind === 'open') this.openCabinet(id!);
    else if (kind === 'loot') this.takeLoot(id!);
    else if (kind === 'repair') this.repairInput(id!, Number(a), Number(b));
    else if (kind === 'locker') this.lockerDigit(id!, Number(a));
    else if (kind === 'door') this.host.door(id!);
    else if (kind === 'simulate') this.toggleSimulation();
    else if (kind === 'up') this.flatFlight = 1;
    else if (kind === 'down') this.flatFlight = -1;
    else if (kind === 'visit' && this.crew.options.test) this.visit(id!);
    else if (kind === 'home') this.home();
    this.stamp = '';
    this.paint();
  };

  menu(): MenuEntry[] {
    const row = (id: string, text: string, sub: string, run: () => void): MenuEntry => ({
      id: `orbital:${id}`,
      label: text,
      sub,
      icon: 'cube',
      accent: SHIP.cyan,
      run,
    });
    const rows = [
      row('sensor', `Sensor: ${this.sensorMode}`, 'Handgelenk · Radar / Röntgen / aus', () =>
        this.cycleSensor(),
      ),
      row('heal', `Medkit · Anzug ${this.crew.hp}/3`, 'Ein Medkit heilt einen Treffer', () =>
        this.heal(),
      ),
      row(
        'leave',
        'Schutzschrank verlassen',
        this.crew.hidden ? 'Du bist versteckt' : 'Kein Schutzschrank aktiv',
        () => this.leaveLocker(),
      ),
      row(
        'audio',
        `Ton: ${this.audioOn ? 'an' : 'aus'}`,
        'Maschinen, Schritte, Sensor und Türen',
        () => {
          this.audioOn = !this.audioOn;
          if (this.hum) this.hum.gain.gain.value = 0;
        },
      ),
    ];
    if (this.crew.options.test) {
      rows.push(
        row(
          'simulation',
          this.crew.simulation ? 'Simulation beenden' : 'Simulation / Flugmodus',
          'Linker Stick fliegt · rechter Stick hoch/runter · keine Gegner',
          () => this.toggleSimulation(),
        ),
      );
      rows.push({
        id: 'orbital:visits',
        label: 'Testbesuch in einem Raum',
        sub: 'Reparaturen, Schränke und Ausrüstung ausprobieren',
        icon: 'cube',
        accent: SHIP.amber,
        children: this.host
          .spec()
          .rooms.map((r) =>
            row(`visit:${r.id}`, `${r.name} / ${r.id}`, MARKS[r.signature], () => this.visit(r.id)),
          ),
      });
    }
    rows.push(
      row('home', 'Zur Einsatzzentrale', 'Im Test oder nach Rundenende', () => {
        if (this.crew.options.test || this.host.state().phase !== 'running') this.home();
        else this.host.say('Während der Mission zu Fuß zur Zentrale zurückkehren.');
      }),
    );
    return rows;
  }
  private visit(id: string): void {
    const room = this.host.spec().rooms.find((r) => r.id === id);
    if (!room || !this.crew.options.test) return;
    const c = roomCentre(room);
    this.host.travel(new THREE.Vector3((c.x + 0.5) * TILE, 0, (c.z + 0.5) * TILE));
  }
  private home(): void {
    this.leaveLocker();
    if (this.crew.simulation) this.toggleSimulation();
    this.host.travel(new THREE.Vector3(0, 0, 13.8));
  }

  private toggleSimulation(): void {
    if (!this.crew.options.test) return;
    this.crew.simulation = !this.crew.simulation;
    this.host.ctx.refreshWorldMenu();
    this.host.ctx.rig.frozen = this.crew.simulation;
    if (!this.crew.simulation) {
      this.simulated?.removeFromParent();
      this.home();
      return;
    }
    if (!this.simulated) {
      this.simulated = buildCreature('stalker');
      this.simulated.name = 'simulated-astronaut';
      this.root.add(this.simulated);
    } else this.root.add(this.simulated);
    this.nextSimulationRoom = 0;
    this.simulationTimer = 0;
    this.simulationGoal = null;
    this.simulationRoute = null;
    Object.assign(this.simulationPose, { x: 1.5, z: 13.5, yaw: 0 });
    this.simulated.position.set(1.5, 0, 13.5);
    this.host.travel(new THREE.Vector3(0, 6, 2));
    this.log('SIMULATION: Techniker startet. Niemand wird angegriffen.');
  }
  private stepSimulation(dt: number): void {
    if (!this.crew.simulation || !this.simulated) return;
    const ctx = this.host.ctx;
    const left = ctx.input.get('left')?.thumbstick,
      right = ctx.input.get('right')?.thumbstick;
    ctx.camera.getWorldDirection(_direction);
    _direction.y = 0;
    _direction.normalize();
    ctx.rig.position.addScaledVector(_direction, -(left?.y ?? 0) * dt * 4);
    ctx.rig.position.x += -_direction.z * (left?.x ?? 0) * dt * 4;
    ctx.rig.position.z += _direction.x * (left?.x ?? 0) * dt * 4;
    ctx.rig.position.y += (-(right?.y ?? 0) + this.flatFlight) * dt * 3;
    this.flatFlight *= Math.max(0, 1 - dt * 2);
    ctx.rig.position.y = Math.max(0, Math.min(14, ctx.rig.position.y));
    ctx.rig.updateMatrixWorld(true);
    this.simulationTimer -= dt;
    if (this.simulationTimer <= 0) {
      this.simulationTimer = 0.5;
      if (!this.simulationGoal) {
        this.simulationGoal =
          this.host.spec().rooms[this.nextSimulationRoom++ % this.host.spec().rooms.length]!;
        this.log(
          `Archiv → Techniker: ${this.simulationGoal.name} prüfen. Schutzcode ${lockerCode(this.host.spec().seed, this.simulationGoal.id)}.`,
        );
      }
      this.simulationRoute = this.host.route(this.simulationPose, this.simulationGoal);
    }
    if (this.simulationRoute && this.simulationGoal) {
      const moving = stepAlong(this.simulationPose, this.simulationRoute, dt, 1.6);
      this.simulated.position.set(this.simulationPose.x, 0, this.simulationPose.z);
      this.simulated.rotation.y = this.simulationPose.yaw;
      if (!moving && this.simulationRoute.complete) {
        this.log(
          `Techniker → Zentrale: ${MARKS[this.simulationGoal.signature]} erreicht. System prüfen.`,
        );
        this.simulationGoal = null;
        this.simulationRoute = null;
        this.simulationTimer = 3;
      }
    }
    animateCreature(this.simulated, performance.now() / 1000);
  }
  private log(text: string): void {
    this.messages.push(text);
    if (this.messages.length > 4) this.messages.shift();
    this.host.say(text);
  }

  burst(kind: string, at: THREE.Vector3): void {
    if (this.effects.length >= 3) return;
    const base = EFFECTS.find((e) => e.id === kind);
    if (!base) return;
    // No transient point lights or shader recompilation; fixed particle budget.
    const burst = new Burst({ ...base, count: Math.min(base.count, 48), flash: 0 }, at.clone());
    this.root.add(burst);
    this.effects.push(burst);
  }
  private stepSound(dt: number, head: THREE.Vector3): void {
    if (!this.audioOn) return;
    const state = this.host.state();
    const room = roomAt(this.host.spec(), Math.floor(head.x / TILE), Math.floor(head.z / TILE));
    const context = sharedAudio();
    if (context?.state === 'running' && !this.hum) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 52;
      gain.gain.value = 0;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      this.hum = { oscillator, gain };
    }
    if (this.hum && context)
      this.hum.gain.gain.setTargetAtTime(
        room && !this.crew.simulation ? (room.kind === 'werkstatt' ? 0.018 : 0.005) : 0,
        context.currentTime,
        0.5,
      );
    this.soundTimer -= dt;
    this.effectTimer -= dt;
    const at = state.monster;
    const distance = at ? Math.hypot(at.x - head.x, at.z - head.z) : Infinity;
    if (distance < 12 && this.soundTimer <= 0 && state.monsterOn && !this.crew.options.test) {
      this.soundTimer = this.crew.options.monster === 'sentinel' ? 0.85 : 0.6;
      this.sound('step', Math.max(0.005, (1 - distance / 12) * 0.04));
    }
    if (room?.kind === 'werkstatt' && this.effectTimer <= 0 && !state.done.includes('engine')) {
      this.effectTimer = 4;
      const c = roomCentre(room);
      this.burst('smoke', new THREE.Vector3((c.x + 0.5) * TILE, 0.6, (c.z + 0.5) * TILE));
    }
  }
  private sound(kind: 'door' | 'click' | 'success' | 'error' | 'step', gain = 0.035): void {
    if (!this.audioOn) return;
    const from =
      kind === 'door'
        ? 170
        : kind === 'step'
          ? 65
          : kind === 'error'
            ? 260
            : kind === 'success'
              ? 620
              : 480;
    playTone({
      type: kind === 'door' || kind === 'error' ? 'sawtooth' : 'sine',
      from,
      to: kind === 'success' ? 920 : from * 0.5,
      duration: kind === 'door' ? 0.36 : 0.15,
      gain,
    });
  }
  private haptic(gain: number, ms: number): void {
    for (const hand of ['left', 'right'] as const) this.host.ctx.input.get(hand)?.pulse(gain, ms);
  }

  dispose(): void {
    this.disposed = true;
    this.dom.remove();
    this.dom.removeEventListener('click', this.domClick);
    for (const target of this.targets) this.host.ctx.pointer.remove(target);
    for (const effect of this.effects) effect.dispose();
    this.hum?.oscillator.stop();
    this.hum?.oscillator.disconnect();
    this.hum?.gain.disconnect();
    for (const [material, color] of this.suitColors) material.color.copy(color);
    if (this.player) {
      this.host.ctx.wear(null);
      this.host.ctx.avatar.traverse((o) => o.layers.set(LAYER_SELF_ONLY));
      this.host.ctx.rig.frozen = false;
    }
    this.visor.removeFromParent();
    this.suit.removeFromParent();
    disposeObject(this.visor);
    disposeObject(this.suit);
    disposeObject(this.root);
    this.root.removeFromParent();
  }
}

function freeSpot(spec: HouseSpec, room: HouseRoom): THREE.Vector3 {
  const candidates = tilesOf(room.rect).filter(
    (t) =>
      !room.marks.some((m) => m.x === t.x && m.z === t.z) &&
      !spec.doors.some(
        (d) =>
          (d.x === t.x && d.z === t.z) || (d.x + dirX(d.dir) === t.x && d.z + dirZ(d.dir) === t.z),
      ),
  );
  const tile = candidates[0] ?? roomCentre(room);
  return new THREE.Vector3((tile.x + 0.5) * TILE, 0, (tile.z + 0.5) * TILE);
}
function lootLabel(spec: HouseSpec, id: string): string {
  return (
    spec.tasks.find((t) => t.id === id)?.label ??
    {
      radar: 'Bewegungsradar',
      xray: 'Röntgenscanner',
      medkit: 'Medkit',
      'test-kit': 'Alle Werkzeuge + Medkit',
    }[id] ??
    id
  );
}
function disposeObject(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : []) {
      materials.add(material);
      const map = (material as THREE.MeshBasicMaterial).map;
      if (map) textures.add(map);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
