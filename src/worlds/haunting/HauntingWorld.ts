import * as THREE from 'three';
import { GridWorld } from '../grid/GridWorld';
import { PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import { TILE, keyX, keyZ, tileKey } from '../nav/navTile';
import { FlashlightTool } from '../portal/tools';
import { playSwitch } from '../../core/Audio';
import { pickHost } from '../../net/host';
import {
  generateHouse,
  roomAt,
  roomCentre,
  roomOf,
  HOUSE,
  MARKS,
  type HouseSpec,
  type Rect,
} from './house';
import { housePlan } from './plan';
import {
  drainRate,
  routeLength,
  routeTo,
  stepAlong,
  tileAt,
  DRONE_LIFE,
  type DronePose,
  type DroneRoute,
  type DroneStatus,
} from './droneRoute';
import { buildMark } from './marks';
import { rollSeed } from './rng';
import { StationUi } from './stationUi';
import { MOVE_TIME, seatOf, type Claim, type StationId } from './stations';
import {
  claimMessage,
  droneMessage,
  flipMessage,
  HAUNT_CHANNEL,
  HAUNT_ROOM,
  pickGameHost,
  readClaim,
  readDrone,
  readFlip,
  readState,
  stateMessage,
  type DroneState,
  type HauntState,
} from './net';
import type { GridPlan } from '../grid/gridPlan';
import type { MenuEntry } from '../../ui/menu';
import type { WorldContext } from '../../core/types';
import type { PlanSolidKind } from '../grid/solids';
import type { Handedness } from '../../core/XRInput';
import type { Npc } from '../npc/Npc';

/**
 * **Haunting** — einer im Haus, die anderen im Van.
 *
 * Ein Spiel, in dem vier Leute dasselbe Haus kennen und keiner es in
 * derselben Sprache beschreiben kann. Der **Archivar** kennt Namen
 * („Bibliothek"), der **Späher** kennt Formen („L-förmig, zwei Türen"), der
 * **Drohnenpilot** kennt ein Zimmer *jetzt*, der **Hacker** kennt Schalter
 * ohne Ort — und der VR-Spieler kennt nur, was in seinem Lichtkegel steht,
 * ist dafür aber der Einzige mit Händen. Die Aufgabe ist simpel: drei Sachen
 * finden und in den Van bringen. Schwer ist sie, weil niemand dem anderen eine
 * Koordinate sagen kann.
 *
 * **Eine Quelle, viele Projektionen.** Über die Leitung geht der *Same* und
 * nicht das Haus (`house.ts`): Jedes Gerät baut denselben Grundriss selbst,
 * und deshalb ist die Drohnenkamera eine Kamera in der **eigenen** Kopie der
 * Welt und kein Videostrom. Was wirklich fließt, sind ein paar Dutzend Bytes
 * je Sekunde — Monsterposition, Türen, Licht, Aufgaben (`net.ts`).
 *
 * **Wer rechnet, ist der VR-Spieler** (`pickGameHost`). Die sonst übliche
 * Regel — wer am längsten in der Welt steht — würde hier einem Web-Spieler das
 * Monster geben, und wenn der den Laptop zuklappt, nimmt er die Runde mit. Im
 * Haus steht genau einer, und der geht so schnell nicht weg.
 *
 * **Das Monster ist ausgeschaltet, bis jemand es einschaltet.** Nicht aus
 * Vorsicht, sondern weil es die Rollen erst spielbar macht: Wer Archiv,
 * Späher, Drohne und Tafel einmal in Ruhe ausprobieren will, soll das können,
 * ohne dass ihm dabei jemand in den Nacken atmet. Der Schalter sitzt im
 * Handgelenkmenü und gehört dem, der die Brille aufhat — die Entscheidung, ob
 * es gruselig wird, trifft der, dem es passiert.
 */

/** Wie oft der Gastgeber den Stand verschickt, und jeder seinen Platz ansagt. */
const STATE_RATE = 1 / 4;
/** Und wie oft der Pilot seine Drohne ansagt. */
const DRONE_RATE = 1 / 10;

/** Wie nah man an eine Sache heran muss, um sie mitzunehmen. */
const REACH = 1.1;
/** Wie hoch sie schwebt. */
const DRONE_Y = 1.8;

/** Die Lampe eines Zimmers: das Licht und das Glas, das zeigt, dass es an ist. */
interface Lamp {
  light: THREE.PointLight;
  glass: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
}

const _lampOff = new THREE.Color(0x2b3040);
const _lampOn = new THREE.Color(0xfff0cf);
const _head = new THREE.Vector3();
const _feet = new THREE.Vector3();
const _size = new THREE.Vector2();

export class HauntingWorld extends GridWorld {
  /** Der Bauplan dieser Runde. Steht vor dem ersten `layout()` fest. */
  private spec: HouseSpec = generateHouse(rollSeed());
  private state: HauntState = freshState(this.spec.seed);

  /** Alles, was zum Haus gehört und nicht aus dem Kachelplan kommt. */
  private readonly stage = new THREE.Group();
  /** Und alles, was sich bewegt — für die Sichten, die das nicht sehen dürfen. */
  private readonly live = new THREE.Group();
  /**
   * Der Van steht in einer eigenen Gruppe, weil er ein neues Haus **überlebt**:
   * `buildHouse` räumt seine Gruppe leer, und ein Van, der beim zweiten
   * Grundriss verschwindet, ist ein Spielabbruch mit Ansage.
   */
  private readonly vanRig = new THREE.Group();

  private readonly lamps = new Map<string, Lamp>();
  private readonly items = new Map<string, THREE.Object3D>();
  private fusePlate: THREE.Mesh | null = null;

  /** Das Monster, solange es eines gibt — nur beim Gastgeber ein echter NPC. */
  private monster: Npc | null = null;
  /** Bei allen anderen nur ein Klotz an der angesagten Stelle. */
  private blob: THREE.Object3D | null = null;

  /**
   * **Das Licht, unter dem der Archivar liest.**
   *
   * Sein Blatt darf nicht davon abhängen, ob im Haus jemand die Lampe
   * angemacht hat: Eine Akte ist eine Bauzeichnung und kein Kamerabild. Zwei
   * Lichter also, die immer in der Szene stehen und auf null gedreht sind —
   * hochgedreht wird nur für diesen einen Zeichendurchgang. Auf null gedreht
   * statt herausgenommen, weil three.js jeden Shader neu baut, sobald sich die
   * **Zahl** der Lichter ändert; ihre Stärke kostet nichts.
   */
  private paperLight: THREE.AmbientLight | null = null;
  private paperSun: THREE.DirectionalLight | null = null;
  /**
   * **Was neben dem aufgeschlagenen Zimmer liegt, gehört nicht aufs Blatt.**
   *
   * Vier dunkle Flächen, die alles außerhalb des Zimmerrechtecks zudecken —
   * die Akte des Archivars ist eine Seite je Zimmer und keine Karte. Ohne sie
   * sieht er den ganzen Hausausschnitt, kann die Zimmer nebeneinanderlegen und
   * hat damit genau die Übersicht, die er sich eigentlich erst erarbeiten
   * soll. Das ist keine Kosmetik: Es ist die Regel, an der seine Rolle hängt.
   */
  private readonly paperMask = new THREE.Group();
  /** Der Papierton liegt auf der Leinwand und nicht in der Szene. */
  private tinted = false;

  private droneBody: THREE.Object3D | null = null;
  private droneCam: THREE.PerspectiveCamera | null = null;
  /** Der Scheinwerfer, den der Pilot schaltet — und den alle sehen. */
  private droneLamp: THREE.SpotLight | null = null;
  /** Die Kuppel darüber: dass sie leuchtet, sieht man auch von hinten. */
  private droneGlass: THREE.MeshBasicMaterial | null = null;
  private topCam: THREE.OrthographicCamera | null = null;
  private drone: DroneState = { x: 0, z: 0, target: '', battery: 1, light: false };
  /** Wo sie steht und wohin sie schaut — die Bahn rechnet `droneRoute.ts`. */
  private dronePose: DronePose = { x: 0, z: 0, yaw: 0 };
  /** Der Weg, den sie gerade abfliegt, und wie oft er neu gesucht wird. */
  private droneRoute: DroneRoute = { tiles: [], complete: true, grounded: true };
  private droneThink = 0;
  /** Ob ich sie gerade selbst fliege — der Wechsel darauf ist die Übergabe. */
  private piloting = false;
  /** Woran erkannt wird, dass der Scheinwerfer wirklich umgelegt wurde. */
  private droneLit = false;
  /** Die Zimmer, in denen sie schon war — das Einzige, was der Pilot behält. */
  private readonly droneSeen = new Set<string>();

  private ui: StationUi | null = null;
  /**
   * Wer wo sitzt — und **wann das hier ankam**.
   *
   * Angesagt wird eine Dauer, und eine Dauer altert: Wer sie so stehen lässt,
   * wie sie ankam, hält jeden für jünger, als er ist — besonders den, dessen
   * Tab im Hintergrund liegt und deshalb seltener etwas schickt. Dieselbe
   * Rechnung wie `NetSession.seniorityOf`, aus demselben Grund.
   */
  private readonly claims = new Map<string, Claim & { heardAt: number }>();
  /** An welches Gerät ich gerade gehe, und seit wann ich dort sitze. */
  private wanted: StationId | null = null;
  /**
   * **Seit wann**, nicht **wie lange**.
   *
   * Aufsummierte Bildzeiten wären hier falsch, und man sieht es erst mit zwei
   * Geräten: Ein Browser-Tab im Hintergrund bekommt kaum noch Bilder, seine
   * Dauer wächst also langsamer als die des Tabs, den gerade jemand ansieht —
   * und dann gewinnt beim Streit um ein Gerät nicht der, der zuerst da war,
   * sondern der, dessen Fenster oben liegt. Die Uhr läuft überall gleich.
   */
  private seatedAt = clock();
  private hostId = '';
  private sendTimer = 0;
  private droneTimer = 0;
  /** Woran erkannt wird, dass sich an den Türen etwas geändert hat. */
  private builtDoors = '';
  private carried: string[] = [];

  // --- die Welt ------------------------------------------------------------

  protected override layout(): GridPlan {
    return housePlan(this.spec, new Set(this.state.shut));
  }

  protected override worldId(): string {
    return 'haunting';
  }

  protected override editorTitle(): string {
    return 'Haunting';
  }

  protected override skyColor(): number {
    return 0x05070c;
  }

  /** Fast nichts — aber nicht *ganz* nichts: die eigenen Hände muss man sehen. */
  protected override lightIntensity(): number {
    return 0.04;
  }

  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return { floor: 0x666a74, wall: 0x9aa0ad, wood: 0x8a6440 };
  }

  /** Eine Hand bleibt frei — in diesem Haus will man eine Lampe halten. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override welcome(): string {
    return 'Haunting · Du stehst am Van. Drei Sachen holen — die anderen wissen, wo.';
  }

  /** Man fängt **draußen** an, am Van, mit dem Haus vor sich. */
  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, (HOUSE.z + HOUSE.d + 1.6) * TILE);
  }

  /**
   * **Wohin ein Verfolger läuft.**
   *
   * Nicht immer zum Spieler: Läuft irgendwo ein Radio, geht er dorthin. Das
   * ist der einzige Hebel, den der Hacker auf das Monster hat — und der
   * Grund, warum ein Schalter mit der Aufschrift `X` etwas wert sein kann.
   */
  protected override npcTarget(target: THREE.Vector3): THREE.Vector3 | null {
    const room = this.state.loud[0];
    if (room) {
      const found = roomOf(this.spec, room);
      if (found) {
        const at = roomCentre(found);
        return target.set((at.x + 0.5) * TILE, 0, (at.z + 0.5) * TILE);
      }
    }
    return super.npcTarget(target);
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.roof = PLAN_WALL_H;
    this.root.add(this.stage);
    this.root.add(this.live);
    this.root.add(this.vanRig);
    this.buildHouse();
    this.buildVan();
    this.buildDrone();
  }

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    ctx.scene.fog = new THREE.FogExp2(0x04060a, 0.055);
    ctx.net.on(HAUNT_CHANNEL, (data, from) => this.receive(data, from));
    this.joinTable(ctx);

    if (ctx.role === 'vr') {
      // Nur in der Brille schwebt eine eingeschaltete Taschenlampe im Van —
      // man muss sie im Dunkeln ja finden können.
      const torch = this.placeTool(
        'flashlight',
        new THREE.Vector3(0.6, 1.1, (HOUSE.z + HOUSE.d + 1.4) * TILE),
        undefined,
        true,
      );
      if (torch instanceof FlashlightTool) torch.setLit(true);
    } else {
      this.buildStationViews();
      this.ui = new StationUi({
        spec: () => this.spec,
        state: () => this.state,
        drone: () => this.drone,
        claims: () => this.currentClaims(),
        me: () => ctx.net.localId,
        nameOf: (peer) => ctx.net.peers.get(peer)?.name ?? 'jemand',
        seat: () => seatOf(this.currentClaims(), ctx.net.localId),
        wanted: () => this.wanted,
        arriving: () => Math.max(0, MOVE_TIME - this.seated),
        sit: (station) => this.sit(station),
        flip: (id, on) => this.flip(id, on),
        flyTo: (roomId) => this.setDroneTarget(roomId),
        droneStatus: () => this.droneStatus(),
        droneSeen: () => this.droneSeen,
        droneLight: () => this.toggleDroneLight(),
      });
    }
    this.applyLights();
  }

  override dispose(ctx: WorldContext): void {
    ctx.net.off(HAUNT_CHANNEL);
    ctx.scene.fog = null;
    this.ui?.dispose();
    this.ui = null;
    if (this.fusePlate) ctx.pointer.remove(this.fusePlate);
    this.fusePlate = null;
    dispose(this.stage);
    dispose(this.live);
    dispose(this.vanRig);
    dispose(this.paperMask);
    this.lamps.clear();
    this.items.clear();
    this.monster = null;
    this.blob = null;
    this.droneBody = null;
    this.droneCam = null;
    this.droneLamp = null;
    this.droneGlass = null;
    this.topCam = null;
    this.paperLight = null;
    this.paperSun = null;
    this.paperTint(false);
    super.dispose(ctx);
  }

  // --- was gebaut wird ------------------------------------------------------

  /** Lampen, Merkmale, Aufgaben und der Sicherungskasten — alles aus dem Plan. */
  private buildHouse(): void {
    // **Erst abräumen, dann bauen.** Ein neues Haus (`newRound`, oder der Stand
    // eines Gastgebers mit anderem Samen) baut hier alles noch einmal; wer nur
    // die Gruppe leert, lässt die Geometrien im Speicher und den alten
    // Sicherungskasten als Zielscheibe des Zeigers zurück.
    if (this.fusePlate) this.context?.pointer.remove(this.fusePlate);
    this.fusePlate = null;
    dispose(this.stage);
    this.lamps.clear();
    this.items.clear();

    for (const room of this.spec.rooms) {
      for (const mark of room.marks) this.stage.add(buildMark(mark));
      if (room.lamp) this.buildLamp(room.id, roomCentre(room));
    }

    for (const task of this.spec.tasks) {
      const item = this.buildItem(task.label);
      item.position.set((task.x + 0.5) * TILE, 0.75, (task.z + 0.5) * TILE);
      this.stage.add(item);
      this.items.set(task.id, item);
    }

    this.buildFuse();
  }

  private buildLamp(roomId: string, at: { x: number; z: number }): void {
    const x = (at.x + 0.5) * TILE;
    const z = (at.z + 0.5) * TILE;
    const y = PLAN_WALL_H - 0.2;

    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 20),
      new THREE.MeshBasicMaterial({ color: 0x2b3040, toneMapped: false }),
    );
    glass.rotation.x = Math.PI / 2;
    glass.position.set(x, y + 0.06, z);
    this.stage.add(glass);

    // Das Licht bleibt in der Szene und wird auf null gedreht: three.js baut
    // jeden Shader im Raum neu, wenn sich die Zahl der Lichter ändert.
    const light = new THREE.PointLight(0xffe7c0, 0, 15, 2);
    light.position.set(x, y, z);
    this.stage.add(light);

    this.lamps.set(roomId, { light, glass });
  }

  /** Eine Sache, die zu holen ist: klein, warm und von allein sichtbar. */
  private buildItem(label: string): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `item-${label}`;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.1, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xffd166, toneMapped: false }),
    );
    group.add(body);
    // Ein eigenes kleines Licht: Ohne das findet man im Dunkeln nie, was man
    // sucht — und die Suche soll am Beschreiben scheitern, nicht am Sehen.
    group.add(new THREE.PointLight(0xffd166, 3.5, 5, 2));
    return group;
  }

  /**
   * Der Sicherungskasten. Er leuchtet immer ein bisschen — ein Kasten, den man
   * mit der Taschenlampe suchen muss, ist genau einmal lustig, und hier steht
   * ohnehin schon das halbe Haus im Dunkeln.
   */
  private buildFuse(): void {
    const at = this.spec.fuse;
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.42, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.6, emissive: 0x1a2230 }),
    );
    plate.position.set((at.x + 0.5) * TILE, 1.3, (at.z + 0.5) * TILE);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x6b5327, toneMapped: false }),
    );
    face.position.z = 0.055;
    plate.add(face);
    plate.add(new THREE.PointLight(0xffd9a0, 0.5, 2.4, 2));
    this.stage.add(plate);
    this.fusePlate = plate;
    const ctx = this.context;
    if (ctx) ctx.pointer.add({ object: plate, onSelect: () => this.throwFuse() });
  }

  /** Der Van vor der Haustür: der Ablagetisch und vier Monitore. */
  private buildVan(): void {
    const z = (HOUSE.z + HOUSE.d + 1.2) * TILE;
    const metal = new THREE.MeshStandardMaterial({
      color: 0x39414f,
      roughness: 0.5,
      metalness: 0.4,
    });

    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.1), metal);
    table.position.set(0, 0.85, z);
    this.vanRig.add(table);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), metal);
      leg.position.set(side * 1.05, 0.42, z);
      this.vanRig.add(leg);
    }

    // Vier Monitore, einer je Station. Sie zeigen (noch) nicht, was die
    // Stationen sehen — aber sie sagen, wer gerade an welchem Gerät sitzt, und
    // das ist die Auskunft, für die der VR-Spieler den Weg zurückgeht.
    const colors = [0x4aa8ff, 0xff6b6b, 0x5ee0a0, 0xffc857];
    colors.forEach((color, index) => {
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.34),
        new THREE.MeshBasicMaterial({ color, toneMapped: false, opacity: 0.55, transparent: true }),
      );
      screen.position.set(-0.9 + index * 0.6, 1.4, z - 0.5);
      this.vanRig.add(screen);
      screen.add(new THREE.PointLight(color, 0.6, 2, 2));
    });
  }

  /**
   * **Die Drohne steht bei allen im Haus** — auch in der Brille.
   *
   * Eine Weile gab es sie nur bei den Web-Spielern, weil nur die eine Kamera
   * daran brauchen. Mit dem Scheinwerfer geht das nicht mehr: Ein Licht, das
   * der VR-Spieler nicht sieht, ist keine Hilfe, sondern eine
   * Helligkeitseinstellung — und die halbe Rolle des Piloten wäre weg. Der
   * Körper kostet nichts, die Kameras kommen weiterhin nur dort dazu, wo eine
   * Station sie aufmacht.
   */
  private buildDrone(): void {
    const body = new THREE.Group();

    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.1, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x5ee0a0, toneMapped: false }),
    );
    body.add(shell);
    // Die Positionslampe: schwach, immer an, und sie sagt nur „hier bin ich".
    // Kurze Reichweite mit Absicht — eine, die bis an die Decke trägt, färbt
    // dem Piloten den oberen Bildrand grün und nimmt dem Haus sein Dunkel.
    body.add(new THREE.PointLight(0x5ee0a0, 0.7, 3.2, 2));

    // Die Kuppel über dem Scheinwerfer. Sie leuchtet mit, damit man von
    // *überall* sieht, dass das Licht an ist — der Kegel zeigt nach vorn, und
    // wer hinter der Drohne steht, sähe sonst nichts.
    const glass = new THREE.MeshBasicMaterial({ color: 0x123024, toneMapped: false });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), glass);
    dome.position.set(0, 0.05, 0.1);
    body.add(dome);
    this.droneGlass = glass;

    // Ein Kegel und kein Punktlicht: Eine Drohne, die rundherum leuchtet,
    // nimmt dem Haus das Dunkel — mit dem Kegel muss der Pilot **zielen**, und
    // dafür muss ihm jemand sagen, wohin.
    const lamp = new THREE.SpotLight(0xdff2ff, 0, 16, 0.42, 0.55, 1.6);
    lamp.position.set(0, 0.02, 0.1);
    lamp.target.position.set(0, -0.6, 3);
    body.add(lamp);
    body.add(lamp.target);
    this.droneLamp = lamp;

    this.live.add(body);
    this.droneBody = body;
    this.parkDrone();
    this.applyDroneLight();
  }

  /** Die Kameras, aus denen die Stationen ihr Bild bekommen. */
  private buildStationViews(): void {
    const droneCam = new THREE.PerspectiveCamera(70, 1, 0.05, 60);
    droneCam.rotation.order = 'YXZ';
    // **Sie schaut nach vorn, und „vorn" ist +Z.** Der Gierwinkel der Drohne
    // ist `atan2(dx, dz)`, damit zeigt ihre lokale +Z-Achse in die
    // Flugrichtung — eine Kamera von der Stange schaut aber nach −Z. Ohne die
    // halbe Drehung flog der Pilot rückwärts durch das Haus und der
    // Scheinwerfer leuchtete hinter ihm her.
    droneCam.rotation.y = Math.PI;
    // Und sie sitzt **vor** der Drohne, nicht in ihr: Rumpf und Lampenkuppel
    // stehen im Weg, sobald die Kamera nach vorn schaut, und eine nahe
    // Schnittebene löste das nur, indem sie ein Loch in alles andere schnitte.
    droneCam.position.set(0, 0.03, 0.28);
    this.droneBody?.add(droneCam);
    this.droneCam = droneCam;

    const dark = new THREE.MeshBasicMaterial({ color: 0x0a0d14, toneMapped: false });
    for (let i = 0; i < 4; i++) {
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), dark);
      quad.rotation.x = -Math.PI / 2;
      this.paperMask.add(quad);
    }
    this.paperMask.visible = false;
    this.root.add(this.paperMask);

    const paper = new THREE.AmbientLight(0xfff0dc, 0);
    this.root.add(paper);
    this.paperLight = paper;
    const sun = new THREE.DirectionalLight(0xffffff, 0);
    sun.position.set(6, 14, 4);
    this.root.add(sun);
    this.paperSun = sun;

    // Der Archivar schaut senkrecht von oben auf **ein** Zimmer. Der Ausschnitt
    // wird beim Zeichnen gesetzt, weil er vom gewählten Zimmer abhängt.
    const top = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 40);
    top.rotation.order = 'YXZ';
    top.rotation.x = -Math.PI / 2;
    this.root.add(top);
    this.topCam = top;
  }

  // --- der Stand ------------------------------------------------------------

  /** Wie lange ich schon an meinem Gerät sitze, in Sekunden. */
  private get seated(): number {
    return (clock() - this.seatedAt) / 1000;
  }

  private get isHost(): boolean {
    return this.hostId !== '' && this.hostId === this.context?.net.localId;
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.refreshHost(ctx);

    if (this.isHost) {
      this.state.time += dt;
      this.trackMonster();
      this.checkItems(ctx);
    }

    this.applyDoors();
    this.applyBlob();
    this.flyDrone(dt);

    this.sendTimer -= dt;
    if (this.sendTimer <= 0) {
      this.sendTimer = STATE_RATE;
      if (this.isHost) ctx.net.emit(HAUNT_CHANNEL, stateMessage(this.state));
      if (this.wanted) ctx.net.emit(HAUNT_CHANNEL, claimMessage(this.wanted, this.seated));
    }
    if (this.wanted) {
      // **Die eigene Sitzdauer steht auch in der eigenen Liste.** Nur die
      // Ansage zu füllen und den eigenen Eintrag auf null stehen zu lassen war
      // der Fehler, den erst zwei Geräte zeigen: Jeder hielt den anderen für
      // den Älteren, und beide sahen „weggeschubst".
      this.claims.set(ctx.net.localId, {
        id: ctx.net.localId,
        station: this.wanted,
        seniority: this.seated,
        heardAt: clock(),
      });
    }

    this.expireClaims();
    this.ui?.refresh();
  }

  /** Wer die Runde rechnet — der VR-Spieler, sonst der Älteste. */
  private refreshHost(ctx: WorldContext): void {
    const here = [...ctx.net.peers.values()].filter((peer) => peer.world === ctx.net.world);
    const candidates = [
      { id: ctx.net.localId, seniority: ctx.net.localSeniority, vr: ctx.role === 'vr' },
      ...here.map((peer) => ({
        id: peer.id,
        seniority: ctx.net.seniorityOf(peer),
        vr: peer.role === 'vr',
      })),
    ];
    const next = pickGameHost(candidates) || pickHost(candidates);
    if (next !== this.hostId) this.hostId = next;
  }

  private receive(data: unknown, from: string): void {
    const state = readState(data);
    if (state && from !== this.context?.net.localId && from === this.hostId) {
      this.adopt(state);
      return;
    }
    const claim = readClaim(data, from);
    if (claim) {
      this.claims.set(from, { ...claim, heardAt: clock() });
      return;
    }
    const drone = readDrone(data);
    if (drone && from !== this.context?.net.localId) {
      const body = this.droneBody;
      if (body) {
        // Die Blickrichtung kommt **nicht** über die Leitung, sondern aus dem
        // Weg zwischen zwei Ansagen: Ein Winkel mehr in der Nachricht wäre
        // zehnmal je Sekunde ein Wert, der sich aus zwei anderen ohnehin
        // ergibt — und bei zehn Ansagen je Sekunde ruckelt eine übertragene
        // Drehung sichtbar, eine gerechnete nicht.
        const dx = drone.x - body.position.x;
        const dz = drone.z - body.position.z;
        if (Math.hypot(dx, dz) > 0.05) body.rotation.y = Math.atan2(dx, dz);
        body.position.set(drone.x, DRONE_Y, drone.z);
      }
      this.drone = drone;
      this.applyDroneLight();
      return;
    }
    const flip = readFlip(data);
    if (flip && this.isHost) this.applyFlip(flip.id, flip.on);
  }

  /**
   * **Die Ansprüche, wie sie jetzt gelten** — jede angesagte Dauer plus die
   * Zeit, die seit ihrer Ankunft vergangen ist. Der eigene Platz kommt von der
   * eigenen Uhr und nicht aus der Liste.
   */
  private currentClaims(): Claim[] {
    const me = this.context?.net.localId ?? '';
    const now = clock();
    const out: Claim[] = [];
    for (const claim of this.claims.values()) {
      const seniority =
        claim.id === me ? this.seated : claim.seniority + (now - claim.heardAt) / 1000;
      out.push({ id: claim.id, station: claim.station, seniority });
    }
    return out;
  }

  /** Wer sich zehn Sekunden nicht gemeldet hat, sitzt an keinem Gerät mehr. */
  private expireClaims(): void {
    const me = this.context?.net.localId ?? '';
    const now = clock();
    for (const [peer, claim] of this.claims) {
      if (peer !== me && now - claim.heardAt > 10000) this.claims.delete(peer);
    }
  }

  /** Den Stand des Gastgebers übernehmen — samt Haus, wenn es ein anderes ist. */
  private adopt(next: HauntState): void {
    if (next.seed !== this.spec.seed) {
      this.spec = generateHouse(next.seed);
      this.state = next;
      this.grid?.replaceWith(housePlan(this.spec, new Set(next.shut)));
      this.builtDoors = next.shut.join(',');
      this.buildHouse();
      this.parkDrone();
      this.applyLights();
      return;
    }
    this.state = next;
    this.applyLights();
    this.showItems();
  }

  // --- was im Haus passiert -------------------------------------------------

  /** Der Gastgeber liest die Stelle des Monsters ab und sagt sie an. */
  private trackMonster(): void {
    if (!this.state.monsterOn) {
      this.state.monster = null;
      return;
    }
    if (!this.monster) return;
    const at = this.monster.feet(_feet);
    this.state.monster = { x: at.x, z: at.z };
  }

  /** Bei allen anderen steht an dieser Stelle ein Klotz — mehr braucht es nicht. */
  private applyBlob(): void {
    if (this.isHost) return;
    const at = this.state.monster;
    if (!at) {
      if (this.blob) this.blob.visible = false;
      return;
    }
    if (!this.blob) {
      const blob = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 1.1, 4, 10),
        new THREE.MeshBasicMaterial({ color: 0xff5a5a, toneMapped: false }),
      );
      this.live.add(blob);
      this.blob = blob;
    }
    this.blob.visible = true;
    this.blob.position.set(at.x, 0.9, at.z);
  }

  /**
   * **Aufheben, indem man hingeht.**
   *
   * Kein Griff, keine Physik: Was hier eingesammelt wird, sind keine Kisten,
   * sondern Aufgaben — und ein Andenken, das man dreimal danebengreift, weil
   * es im Dunkeln liegt, macht das Spiel nicht schwerer, sondern zäher.
   * Schwer soll die Frage sein, in *welchem* Zimmer es liegt.
   */
  private checkItems(ctx: WorldContext): void {
    ctx.camera.getWorldPosition(_head);
    for (const task of this.spec.tasks) {
      if (this.state.taken.includes(task.id)) continue;
      const item = this.items.get(task.id);
      if (!item) continue;
      if (_head.distanceTo(item.position) > REACH + 0.6) continue;
      this.state.taken.push(task.id);
      this.carried.push(task.id);
      this.showItems();
      this.announce(`${task.label} — mitgenommen`);
    }

    if (this.carried.length === 0) return;
    const van = this.spawnPoint();
    if (_head.distanceTo(van) > 3) return;
    for (const id of this.carried) {
      if (!this.state.done.includes(id)) this.state.done.push(id);
    }
    this.carried = [];
    const left = this.spec.tasks.length - this.state.done.length;
    this.announce(left > 0 ? `Abgelegt · noch ${left}` : 'Alles da. Raus hier.');
    if (left === 0) this.state.phase = 'won';
  }

  /** Was schon aufgesammelt ist, liegt nicht mehr im Zimmer. */
  private showItems(): void {
    for (const [id, item] of this.items) item.visible = !this.state.taken.includes(id);
  }

  private throwFuse(): void {
    if (this.state.fuse) return;
    const ctx = this.context;
    if (!ctx) return;
    ctx.camera.getWorldPosition(_head);
    if (this.fusePlate && _head.distanceTo(this.fusePlate.position) > 2.5) {
      this.announce('Zu weit weg');
      return;
    }
    this.state.fuse = true;
    playSwitch(true);
    this.announce('Sicherungskasten an — die Tafel im Van ist jetzt voll');
  }

  /** Ein Schalter der Tafel, angewendet beim Gastgeber. */
  private applyFlip(id: string, on: boolean): void {
    const entry = this.spec.switches.find((one) => one.id === id);
    if (!entry) return;
    if (entry.hidden && !this.state.fuse) return;
    const list =
      entry.kind === 'light' ? this.state.lit : entry.kind === 'radio' ? this.state.loud : null;

    if (list) {
      const at = list.indexOf(entry.target);
      if (on && at < 0) list.push(entry.target);
      if (!on && at >= 0) list.splice(at, 1);
      this.applyLights();
      return;
    }
    // Türen: `on` heißt offen, und die Liste führt die geschlossenen.
    const shut = this.state.shut.indexOf(entry.target);
    if (!on && shut < 0) this.state.shut.push(entry.target);
    if (on && shut >= 0) this.state.shut.splice(shut, 1);
  }

  /** Vom Hacker aus: bitten, nicht selbst tun. Gerechnet wird beim Gastgeber. */
  private flip(id: string, on: boolean): void {
    if (this.isHost) this.applyFlip(id, on);
    else this.context?.net.emit(HAUNT_CHANNEL, flipMessage(id, on));
  }

  /**
   * **Türen bewegen sich über den Plan**, und der Plan baut die Welt neu.
   *
   * Nur wenn sich wirklich etwas geändert hat: Ein `setDoor` je Bild wäre ein
   * Neubau je Bild, und dann ruckelt das Haus, solange irgendwo eine Tür zu
   * ist.
   */
  private applyDoors(): void {
    const now = this.state.shut.join(',');
    if (now === this.builtDoors) return;
    this.builtDoors = now;
    const shut = new Set(this.state.shut);
    for (const door of this.spec.doors) {
      this.grid?.door(door.x, door.z, door.dir, 0, !shut.has(door.id));
    }
  }

  private applyLights(): void {
    const lit = new Set(this.state.lit);
    for (const [roomId, lamp] of this.lamps) {
      const on = lit.has(roomId);
      lamp.light.intensity = on ? 22 : 0;
      lamp.glass.material.color.copy(on ? _lampOn : _lampOff);
    }
  }

  // --- die Drohne -----------------------------------------------------------

  /**
   * **Die Drohne steht im Zimmer hinter der Haustür**, nicht draußen im Van.
   *
   * Hineingetragen hat sie jemand vor der Runde — und das ist keine Ausrede,
   * sondern eine Notwendigkeit: Vor dem Haus gibt es keine Kacheln, und die
   * Wegsuche fängt nichts mit einem Startpunkt an, den es im Graphen nicht
   * gibt. Sie stünde dort und behauptete, sie käme nirgends hin.
   */
  private parkDrone(): void {
    const body = this.droneBody;
    if (!body) return;
    const entry = roomOf(this.spec, this.spec.entryRoom) ?? this.spec.rooms[0];
    const at = entry ? roomCentre(entry) : { x: 0, z: 0 };
    this.dronePose = { x: (at.x + 0.5) * TILE, z: (at.z + 0.5) * TILE, yaw: 0 };
    body.position.set(this.dronePose.x, DRONE_Y, this.dronePose.z);
    body.rotation.y = 0;
    this.drone = {
      x: this.dronePose.x,
      z: this.dronePose.z,
      target: '',
      battery: this.drone.battery,
      light: this.drone.light,
    };
    this.droneRoute = { tiles: [], complete: true, grounded: true };
    this.droneSeen.clear();
    if (entry) this.droneSeen.add(entry.id);
  }

  /**
   * **Ein Zimmer antippen heißt: such dir einen Weg dorthin.**
   *
   * Nicht „flieg dorthin". Der Unterschied ist der ganze Rest des Spiels — was
   * dabei herauskommt, hängt an den Türen, und die gehören dem VR-Spieler und
   * dem Hacker (`droneRoute.ts`). Ein zweites Antippen desselben Zimmers ruft
   * sie zurück auf der Stelle: Ein Knopf, der nur eine Richtung kennt, ist auf
   * einem Telefon ein Knopf, den man versehentlich drückt und nicht mehr los
   * wird.
   */
  private setDroneTarget(roomId: string): void {
    this.drone.target = this.drone.target === roomId ? '' : roomId;
    this.droneRoute = { tiles: [], complete: true, grounded: true };
    this.droneThink = 0;
  }

  /** Der Scheinwerfer — vom Piloten geschaltet, bei allen im Haus zu sehen. */
  private toggleDroneLight(): void {
    this.drone.light = !this.drone.light;
    this.applyDroneLight();
    playSwitch(this.drone.light);
    this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
  }

  private applyDroneLight(): void {
    const on = this.drone.light && this.drone.battery > 0;
    // Nur bei Wechsel: Diese Zeile läuft in jedem Bild, und eine Farbe, die
    // sechzigmal je Sekunde auf denselben Wert gesetzt wird, ist sechzigmal
    // je Sekunde ein `needsUpdate` an einem Material, das sich nicht geändert
    // hat.
    if (on === this.droneLit) return;
    this.droneLit = on;
    if (this.droneLamp) this.droneLamp.intensity = on ? 7 : 0;
    if (this.droneGlass) this.droneGlass.color.setHex(on ? 0xdff2ff : 0x123024);
  }

  /**
   * **Geflogen wird auf Zimmer und nicht auf Punkte.**
   *
   * Der Pilot tippt auf die Karte, die Drohne sucht sich den Weg — mit einem
   * Profil, das über Möbel hinwegfliegt und **keine Tür aufmacht**. Wohin sie
   * kommt, hängt damit daran, was der VR-Spieler und der Hacker offen gelassen
   * haben: Abhängigkeit in beide Richtungen, ohne eine einzige Sonderregel.
   */
  private flyDrone(dt: number): void {
    const body = this.droneBody;
    if (!body) return;
    const mine = seatOf(this.currentClaims(), this.context?.net.localId ?? '') === 'drone';
    if (!mine) {
      // Bei allen anderen ist sie nur eine angesagte Stelle — die Bahn rechnet
      // der Pilot, und zweimal gerechnet käme sie zweimal woanders an.
      this.piloting = false;
      this.applyDroneLight();
      return;
    }

    if (!this.piloting) {
      // **Wer sich gerade erst hingesetzt hat, übernimmt sie da, wo sie
      // steht.** Die eigene Bahn steht noch am Hangar aus `parkDrone`; ohne
      // diese Zeile springt die Drohne im ersten Bild eines Pilotenwechsels
      // zurück ins Zimmer hinter der Haustür — und der Vorgänger sieht es.
      this.piloting = true;
      this.dronePose = { x: this.drone.x, z: this.drone.z, yaw: body.rotation.y };
      this.droneRoute = { tiles: [], complete: true, grounded: true };
      this.droneThink = 0;
    }

    if (this.drone.target && this.drone.battery > 0) this.stepDrone(dt);
    this.drainDrone(dt);

    body.position.set(this.dronePose.x, DRONE_Y, this.dronePose.z);
    body.rotation.y = this.dronePose.yaw;
    this.drone.x = this.dronePose.x;
    this.drone.z = this.dronePose.z;
    this.noteDroneRoom();

    this.droneTimer -= dt;
    if (this.droneTimer <= 0) {
      this.droneTimer = DRONE_RATE;
      this.context?.net.emit(HAUNT_CHANNEL, droneMessage(this.drone));
    }
  }

  /**
   * Ein Stück des Weges — und der Weg kommt aus dem Navigationsgraphen
   * (`droneRoute.ts`, mit Test, der einen Weg wirklich abfliegt).
   *
   * **Neu gesucht wird zweimal je Sekunde**, nicht nur beim Antippen: Der
   * Hacker macht Türen zu, während sie unterwegs ist, und eine Drohne, die
   * ihren Weg beim Start ein für alle Mal berechnet hat, fliegt danach durch
   * eine geschlossene Tür. Billig ist das, weil ein Haus achtundvierzig
   * Kacheln hat.
   *
   * Findet der Graph keinen Weg, bleibt der beste Teilweg übrig — sie fliegt
   * also bis vor die verschlossene Tür und bleibt dort. Genau das soll der
   * Pilot sehen: nicht „Fehler", sondern *hier ist zu*, und die Station sagt
   * es ihm auch mit Worten (`droneStatus`).
   */
  private stepDrone(dt: number): void {
    const graph = this.grid?.graph;
    const room = roomOf(this.spec, this.drone.target);
    if (!graph || !room) return;

    this.droneThink -= dt;
    if (this.droneThink <= 0) {
      this.droneThink = 0.5;
      const goal = roomCentre(room);
      this.droneRoute = routeTo(graph, this.dronePose, tileKey(goal.x, goal.z, 0));
      if (!this.droneRoute.grounded) {
        // Kein Startpunkt: Sie schwebt neben dem Gitter — dorthin kommt sie
        // nur, wenn jemand am Haus etwas geändert hat, während sie flog.
        this.parkDrone();
        return;
      }
    }

    if (!stepAlong(this.dronePose, this.droneRoute, dt)) {
      // Angekommen — oder vor einer Tür, die zu ist. Beides heißt: Sie steht.
      // Das Ziel bleibt stehen, damit der Pilot in der Station sieht, wohin
      // sie wollte, statt eine Anzeige zu bekommen, die sich selbst löscht.
      if (this.droneRoute.complete) this.drone.target = '';
    }
  }

  /** Der Akku — und was der Scheinwerfer extra kostet (`droneRoute.drainRate`). */
  private drainDrone(dt: number): void {
    if (this.drone.battery <= 0) return;
    const rate = drainRate(this.droneRoute.tiles.length > 0, this.drone.light);
    this.drone.battery = Math.max(0, this.drone.battery - (dt * rate) / DRONE_LIFE);
    if (this.drone.battery === 0) this.applyDroneLight();
  }

  /** In welchem Zimmer sie gerade ist — und dass sie dort einmal war. */
  private droneRoom(): string {
    const tile = tileAt(this.drone.x, this.drone.z);
    const room = roomAt(this.spec, keyX(tile), keyZ(tile));
    return room?.id ?? '';
  }

  private noteDroneRoom(): void {
    const room = this.droneRoom();
    if (room) this.droneSeen.add(room);
  }

  /**
   * **Was der Pilot über seinen Flug erfährt.**
   *
   * Nur so viel, wie eine Drohne wirklich weiß: wo sie ist, wie weit sie noch
   * zu fliegen hat und ob sie überhaupt hinkommt. Kein Grundriss und keine
   * Abzweigung — die gehören dem Archivar. Die eine Zeile, auf die es
   * ankommt, ist `blocked`: Sie ist die Stelle, an der aus einer Wegsuche eine
   * Ansage an den Rest des Vans wird — „irgendwo dazwischen ist zu, macht
   * auf".
   */
  private droneStatus(): DroneStatus {
    const here = this.droneRoom();
    if (this.drone.battery <= 0) return { kind: 'flat', here, metres: 0 };
    if (!this.drone.target) return { kind: 'idle', here, metres: 0 };
    const metres = routeLength(this.dronePose, this.droneRoute);
    if (!this.droneRoute.complete) return { kind: 'blocked', here, metres };
    return { kind: 'flying', here, metres };
  }

  // --- der Van --------------------------------------------------------------

  /** Sich an ein Gerät setzen. Wer schon länger dort sitzt, bleibt sitzen. */
  private sit(station: StationId): void {
    if (this.wanted === station) return;
    this.wanted = station;
    this.seatedAt = clock();
    const ctx = this.context;
    if (!ctx) return;
    this.claims.set(ctx.net.localId, {
      id: ctx.net.localId,
      station,
      seniority: 0,
      heardAt: clock(),
    });
    ctx.net.emit(HAUNT_CHANNEL, claimMessage(station, 0));
  }

  // --- gezeichnet wird je Station verschieden --------------------------------

  /**
   * **Zwei Sichten kommen aus der Welt, zwei aus dem Grundriss.**
   *
   * Drohne und Archiv brauchen Geometrie — man soll ein Klavier von einer
   * Werkbank unterscheiden. Der Späher darf sie ausdrücklich *nicht* haben,
   * und die Schalttafel hat mit dem Haus gar nichts zu tun; beide zeichnet die
   * Oberfläche selbst (`stationUi.ts`). Deshalb steht hier nur die Hälfte.
   *
   * **Und nicht in jedem Bild.** Das Archiv ist ein Standbild — es ändert sich,
   * wenn jemand ein anderes Zimmer aufschlägt, und sonst nie. Ein
   * Überwachungsbild, das alle zwei Sekunden zuckt, ist auf einem Telefon
   * nicht der Kompromiss, sondern der Ton, den man haben will.
   */
  override render(ctx: WorldContext): boolean {
    const ui = this.ui;
    if (!ui) return false;
    const rect = ui.viewport();
    const renderer = ctx.renderer;
    renderer.getSize(_size);
    renderer.setScissorTest(false);
    renderer.setClearColor(0x05070c, 1);
    renderer.clear();
    if (!rect) return true;

    const camera = ui.station === 'drone' ? this.droneCam : this.topCam;
    if (!camera) return true;
    if (ui.station === 'archive') this.aimArchive(ui.selected, rect.w / Math.max(1, rect.h));

    // Der Archivar sieht **keine Lebewesen**: keinen Mitspieler, kein Monster,
    // keine Drohne. Sein Blatt ist ein Grundriss und keine Überwachung.
    const archive = ui.station === 'archive';
    this.live.visible = !archive;
    ctx.avatars.visible = !archive;
    if (this.paperLight) this.paperLight.intensity = archive ? 2.2 : 0;
    if (this.paperSun) this.paperSun.intensity = archive ? 1.4 : 0;
    this.paperMask.visible = archive;
    this.paperTint(archive);

    const y = _size.y - rect.y - rect.h;
    renderer.setScissorTest(true);
    renderer.setScissor(rect.x, y, rect.w, rect.h);
    renderer.setViewport(rect.x, y, rect.w, rect.h);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.aspect = rect.w / Math.max(1, rect.h);
      camera.updateProjectionMatrix();
    }
    renderer.render(ctx.scene, camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, _size.x, _size.y);
    this.live.visible = true;
    ctx.avatars.visible = true;
    if (this.paperLight) this.paperLight.intensity = 0;
    if (this.paperSun) this.paperSun.intensity = 0;
    this.paperMask.visible = false;
    return true;
  }

  /**
   * **Der Papierton.**
   *
   * Ein Sepiafilter auf der Leinwand statt eines zweiten Materialsatzes in der
   * Szene: Während das Archiv offen ist, steht auf der Leinwand ohnehin nichts
   * anderes, und ein Filter im CSS kostet nichts, wo ein eigener
   * Render-Durchgang jedes Material doppelt hielte. Gesetzt wird er nur bei
   * Wechsel — ein `style.filter` je Bild ist ein Umbruch je Bild.
   */
  private paperTint(on: boolean): void {
    if (on === this.tinted) return;
    this.tinted = on;
    const canvas = this.context?.renderer.domElement;
    if (canvas) canvas.style.filter = on ? 'sepia(0.72) contrast(1.12) brightness(1.06)' : '';
  }

  /**
   * Die Kamera des Archivars über das aufgeschlagene Zimmer stellen.
   *
   * **Und unter die Decke.** Das Haus hat eine, sonst käme Licht von oben
   * hinein — von oben sieht man deshalb zuerst den Deckel. Die vordere
   * Schnittebene liegt darum knapp darunter: Was näher an der Kamera ist als
   * `near`, wird weggeschnitten, und das ist genau die Decke. Ein Puppenhaus
   * mit abgenommenem Dach, ohne dass irgendwo Geometrie verschwinden muss.
   */
  private aimArchive(roomId: string, aspect: number): void {
    const camera = this.topCam;
    const room = roomOf(this.spec, roomId) ?? this.spec.rooms[0];
    if (!camera || !room) return;
    const cx = (room.rect.x + room.rect.w / 2) * TILE;
    const cz = (room.rect.z + room.rect.d / 2) * TILE;
    const above = PLAN_WALL_H + 6;
    // **Beide Seiten einzeln gemessen**, und erst dann auf das Seitenverhältnis
    // aufgeblasen. Vorher stand hier die längere Seite für beide, und ein
    // 4×2-Zimmer lag als schmaler Streifen in der Mitte eines halbleeren
    // Blattes — auf einem Telefon ist das die Hälfte des Bildschirms für nichts.
    const padX = (room.rect.w * TILE) / 2 + TILE * 0.35;
    const padZ = (room.rect.d * TILE) / 2 + TILE * 0.35;
    const half = Math.max(padX, padZ * aspect);
    const tall = half / aspect;
    camera.position.set(cx, above, cz);
    camera.left = -half;
    camera.right = half;
    camera.top = tall;
    camera.bottom = -tall;
    camera.near = above - PLAN_WALL_H + 0.05;
    camera.far = above + 2;
    camera.updateProjectionMatrix();
    this.maskAround(room.rect, cx, cz, camera.right, camera.top);
  }

  /**
   * Die vier Flächen um das aufgeschlagene Zimmer legen.
   *
   * Ein Rand von einer halben Wandstärke bleibt frei: Die Wände sitzen auf den
   * Kachelkanten und ragen zur Hälfte nach draußen — ohne den Rand wäre das
   * Zimmer auf dem Blatt eines ohne Wände.
   */
  private maskAround(rect: Rect, cx: number, cz: number, hw: number, hh: number): void {
    const edge = PLAN_WALL_T;
    const x0 = rect.x * TILE - edge;
    const x1 = (rect.x + rect.w) * TILE + edge;
    const z0 = rect.z * TILE - edge;
    const z1 = (rect.z + rect.d) * TILE + edge;
    const y = PLAN_WALL_H - 0.12;
    const spans: Array<[number, number, number, number]> = [
      [cx - hw, cz - hh, cx + hw, z0],
      [cx - hw, z1, cx + hw, cz + hh],
      [cx - hw, z0, x0, z1],
      [x1, z0, cx + hw, z1],
    ];
    this.paperMask.children.forEach((quad, index) => {
      const [ax, az, bx, bz] = spans[index]!;
      const w = Math.max(0, bx - ax);
      const d = Math.max(0, bz - az);
      quad.scale.set(Math.max(w, 0.001), Math.max(d, 0.001), 1);
      quad.position.set((ax + bx) / 2, y, (az + bz) / 2);
      quad.visible = w > 0.001 && d > 0.001;
    });
  }

  // --- das Menü in der Brille ------------------------------------------------

  override menu(): MenuEntry[] {
    const monster: MenuEntry = {
      id: 'haunt:monster',
      label: `Monster: ${this.state.monsterOn ? 'an' : 'aus'}`,
      sub: 'Aus üben sich die Rollen im Van in Ruhe — an wird es ernst',
      icon: 'cube',
      accent: 0xff5a5a,
      run: () => this.toggleMonster(),
    };
    const fresh: MenuEntry = {
      id: 'haunt:new',
      label: 'Neues Haus',
      sub: 'Würfelt den Grundriss neu — bei allen im Raum',
      icon: 'cube',
      accent: 0x5ee0a0,
      run: () => this.newRound(),
    };
    const brief: MenuEntry = {
      id: 'haunt:brief',
      label: `Auftrag: ${this.state.done.length}/${this.spec.tasks.length}`,
      sub: this.spec.tasks.map((task) => task.label).join(', '),
      icon: 'cube',
      accent: 0xffc857,
      run: () => this.announce(`Zu holen: ${this.spec.tasks.map((one) => one.label).join(', ')}`),
    };
    const room: MenuEntry = {
      id: 'haunt:room',
      label: 'In den Haunting-Raum',
      sub: `Alle spielen im Raum "haunting" — hier bist du in "${this.context?.net.room || 'keinem'}"`,
      icon: 'cube',
      accent: 0x4aa8ff,
      run: () => this.context?.join(HAUNT_ROOM),
    };
    const rows = [brief, monster, fresh];
    if (this.context?.net.room !== HAUNT_ROOM) rows.push(room);
    return [...rows, ...super.menu()];
  }

  /**
   * **Alle in denselben Raum.**
   *
   * Haunting spielt im Raum `haunting`, damit die Web-Spieler auf der
   * Startseite nur ihren Namen eintippen und keinen Code abtippen müssen. Wer
   * schon in einem anderen Raum steht, wird aber nicht herausgezogen — das
   * wäre ein Weltwechsel, der eine laufende Runde von jemand anderem beendet.
   * Der bekommt stattdessen eine Zeile und einen Knopf.
   */
  private joinTable(ctx: WorldContext): void {
    if (!ctx.net.connected) {
      ctx.join(HAUNT_ROOM);
      return;
    }
    if (ctx.net.room !== HAUNT_ROOM) {
      this.announce(`Ihr spielt im Raum "${ctx.net.room}" — Haunting läuft im Raum "haunting"`);
    }
  }

  private toggleMonster(): void {
    this.state.monsterOn = !this.state.monsterOn;
    if (!this.state.monsterOn) {
      this.director?.clear();
      this.monster = null;
      this.state.monster = null;
      this.announce('Monster aus — das Haus gehört dir');
      this.context?.menu.refresh();
      return;
    }
    // Es startet so weit weg wie möglich: Ein Monster, das im selben Zimmer
    // auftaucht, in dem man steht, ist kein Spiel, sondern ein Schreck.
    const far = roomOf(this.spec, this.spec.fuse.roomId) ?? this.spec.rooms[0]!;
    const at = roomCentre(far);
    this.monster =
      this.director?.spawn({
        kind: 'zombie',
        brain: 'chase',
        at: new THREE.Vector3((at.x + 0.5) * TILE, 0, (at.z + 0.5) * TILE),
      }) ?? null;
    this.announce(`Monster an — es startet ${nameOfRoom(this.spec, far.id)}`);
    this.context?.menu.refresh();
  }

  /** Ein neues Haus für alle: Der Same geht mit dem nächsten Stand hinaus. */
  private newRound(): void {
    if (!this.isHost) {
      this.announce('Das Haus würfelt, wer die Brille aufhat');
      return;
    }
    this.director?.clear();
    this.monster = null;
    this.spec = generateHouse(rollSeed());
    this.state = freshState(this.spec.seed);
    this.carried = [];
    this.grid?.replaceWith(housePlan(this.spec, new Set()));
    this.builtDoors = '';
    this.buildHouse();
    this.parkDrone();
    this.applyLights();
    this.context?.net.emit(HAUNT_CHANNEL, stateMessage(this.state));
    this.announce('Neues Haus. Alle im Van fangen von vorn an.');
    this.context?.menu.refresh();
  }
}

/**
 * **Eine Gruppe leeren und dabei wirklich freigeben.**
 *
 * `Group.clear()` nimmt die Kinder heraus und lässt Geometrien und Materialien
 * im Grafikspeicher stehen. Bei einer Welt, die man einmal betritt, fällt das
 * nie auf; bei einer, die je Runde ein neues Haus baut, ist es nach dem
 * fünften Abend das Haus, das nicht mehr lädt.
 */
function dispose(group: THREE.Object3D): void {
  for (const child of [...group.children]) {
    child.traverse((one) => {
      const mesh = one as Partial<THREE.Mesh>;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) for (const part of material) part.dispose();
      else material?.dispose();
    });
    group.remove(child);
  }
}

/** Eine Uhr, die auch dann weiterläuft, wenn dieser Tab keine Bilder bekommt. */
function clock(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function freshState(seed: number): HauntState {
  return {
    seed,
    phase: 'running',
    time: 0,
    monsterOn: false,
    monster: null,
    shut: [],
    lit: [],
    loud: [],
    fuse: false,
    taken: [],
    done: [],
  };
}

function nameOfRoom(spec: HouseSpec, id: string): string {
  const room = roomOf(spec, id);
  return room ? `bei ${MARKS[room.signature]}` : 'irgendwo';
}
