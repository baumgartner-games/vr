import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { createCompanionCube } from '../portal/props';
import { createSky } from '../shared/environment';
import { TextPlane } from '../../ui/TextPlane';
import type { WorldContext } from '../../core/types';
import type { NavGraph } from '../nav/navGraph';
import { addPortal, doorBetween, dropPortal, paintRect, portalLinkIds } from '../nav/navBuild';
import { HAZARD_SPIKES } from '../nav/navProfile';
import { NO_TILE } from '../nav/navTile';
import type { PhysicsBody } from '../../physics/PhysicsWorld';
import type { Npc } from '../npc/Npc';
import {
  BAY_D,
  BAY_W,
  ROOF,
  SCENARIOS,
  WALL_H,
  bayPoint,
  labBounds,
  newScenarioState,
  startScenario,
  stopScenario,
  tickScenario,
  type Scenario,
  type ScenarioId,
  type ScenarioState,
} from './scenarios';

/**
 * **Das Navigationslabor** — sechs Buchten, sechs rote Knöpfe, und in jeder
 * eine Behauptung über die Wegsuche, die man nachprüfen kann.
 *
 * Der Grund für diese Welt ist ein einfacher: Alles, was NPCs tun, kann man
 * testen (`worlds/nav/`), aber nichts davon kann man *ansehen*. Ein Zombie, der
 * zwei Ecken zu weit läuft, ist kein fehlgeschlagener Test — er ist ein
 * Eindruck, und Eindrücke braucht eine Brille. Deshalb steht hier jedes
 * Verhalten einzeln, in seiner eigenen Bucht, mit einem Knopf davor und einem
 * Schild darüber.
 *
 * **Jede Bucht ist eine Behauptung.** Der lange Gang behauptet, dass er um zwei
 * Ecken kommt. Die Stachelgrube behauptet, dass zwei Sorten dieselbe Karte
 * verschieden lesen. Die Tür behauptet, dass ein NPC sich irren darf und es
 * dort merkt, wo man es auch merken würde. Wer eine davon nicht sieht, hat
 * einen Fehler gefunden — und weiß sofort, in welchem Modul er steckt.
 *
 * **Sonst ist es eine Welt wie jede andere**: derselbe Gürtel, dieselbe Physik,
 * dieselben Portale, dasselbe Abtasten (`navBake.ts`). Das Gitter kann man im
 * Menü einschalten und die Wege gleich mit.
 */
export class NavLabWorld extends PortalWorld {
  private readonly floorMat = new THREE.MeshStandardMaterial({ color: 0x2a3242, roughness: 0.95 });
  private readonly wallMat = new THREE.MeshStandardMaterial({ color: 0x46506a, roughness: 0.85 });
  private readonly blockMat = new THREE.MeshStandardMaterial({ color: 0x5b6784, roughness: 0.8 });
  private readonly metal = new THREE.MeshStandardMaterial({
    color: 0x8d97ad,
    roughness: 0.4,
    metalness: 0.5,
  });
  private readonly hazardMat = new THREE.MeshStandardMaterial({
    color: 0x5a1b1b,
    roughness: 0.9,
    emissive: new THREE.Color(0x2a0808),
  });

  private readonly states = new Map<ScenarioId, ScenarioState>();
  /** Die Knöpfe, die im Zeiger hängen — beim Verlassen müssen sie wieder heraus. */
  private readonly knobs: { mesh: THREE.Mesh; run: () => void }[] = [];
  /** Was ein Szenario an Dingen in die Welt gestellt hat. */
  private readonly litter = new Map<ScenarioId, PhysicsBody[]>();
  private door: THREE.Object3D | null = null;
  private doorHome = new THREE.Vector3();
  private portalRings: THREE.Object3D[] = [];
  /** Die beiden aus der Portal-Bucht: der erste weiß davon, der zweite nicht. */
  private portalPair: Npc[] = [];

  constructor() {
    super();
    for (const bay of SCENARIOS) this.states.set(bay.id, newScenarioState());
  }

  protected override spawnPoint(): THREE.Vector3 {
    // Im Mittelgang, mit Blick auf die nördliche Reihe.
    return new THREE.Vector3(0, 0, 0);
  }

  protected override spawnYaw(): number {
    return 0;
  }

  protected override skyColor(): number {
    return 0x121722;
  }

  protected override lightIntensity(): number {
    return 1.05;
  }

  protected override welcome(): string {
    return 'Navigationslabor · Roter Knopf startet · Gelber macht das Szenario schwer';
  }

  protected override worldGravity(): number {
    return 9.81;
  }

  /** Erdgeschoss und das Dach aus der Etagen-Bucht. */
  protected override navLevels(): readonly number[] {
    return [0, ROOF];
  }

  protected override navBounds(): {
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
  } {
    const box = labBounds();
    return { minX: box.minX - 2, minZ: box.minZ - 2, maxX: box.maxX + 2, maxZ: box.maxZ + 2 };
  }

  // --- was gebaut wird ------------------------------------------------------

  protected override buildEnvironment(): void {
    const lab = new THREE.Group();
    lab.name = 'navlab';
    this.root.add(lab);
    this.root.add(createSky(0x1b2434, 0x39d0ff));

    const box = labBounds();
    const width = box.maxX - box.minX + 6;
    const depth = box.maxZ - box.minZ + 6;
    this.slab(lab, this.floorMat, [width, 0.4, depth], [0, -0.2, 0], true);

    // Eine Bande außen herum, damit niemand aus dem Labor spaziert.
    for (const [x, z, w, d] of [
      [0, -depth / 2, width, 0.5],
      [0, depth / 2, width, 0.5],
      [-width / 2, 0, 0.5, depth],
      [width / 2, 0, 0.5, depth],
    ] as const) {
      this.slab(lab, this.wallMat, [w, 3, d], [x, 1.5, z], false);
    }

    for (const bay of SCENARIOS) {
      this.buildBay(lab, bay);
      this.buildSign(lab, bay);
      this.buildKnobs(lab, bay);
    }
  }

  /** Diese Welt bringt keine Kisten mit — was hier steht, stellt ein Szenario hin. */
  protected override buildProps(): void {}

  /** Die Wände einer Bucht: außen herum, mit einer Lücke zum Gang. */
  private buildBay(parent: THREE.Group, bay: Scenario): void {
    const wall = (lx: number, lz: number, w: number, d: number, h = WALL_H): void => {
      const at = bayPoint(bay, lx, lz);
      this.slab(parent, this.wallMat, [w, h, d], [at.x, h / 2, at.z], false);
    };

    // Hinten und an den Seiten dicht, vorne zwei Stummel und dazwischen der
    // Eingang: eine Bucht, die man nicht betreten kann, zeigt nichts.
    wall(0, -BAY_D / 2, BAY_W, 0.4);
    wall(-BAY_W / 2, 0, 0.4, BAY_D);
    wall(BAY_W / 2, 0, 0.4, BAY_D);
    wall(-8, BAY_D / 2, 6, 0.4);
    wall(8, BAY_D / 2, 6, 0.4);

    if (bay.id === 'corridor') {
      // Ein Z: zwei Wände mit Lücken auf verschiedenen Seiten. Geradeaus geht
      // hier nichts, und genau das ist der Punkt.
      wall(-3, -2.5, 16, 0.4);
      wall(3, 2.5, 16, 0.4);
    }

    if (bay.id === 'pit') {
      const at = bayPoint(bay, 0, 0);
      const pit = new THREE.Mesh(new THREE.BoxGeometry(12, 0.06, 4), this.hazardMat);
      pit.position.set(at.x, 0.03, at.z);
      parent.add(pit);
      // Stacheln: man muss auf zwanzig Meter sehen, dass das keine Fußmatte ist.
      for (let i = 0; i < 24; i++) {
        const spot = bayPoint(bay, -5.5 + (i % 12) * 1, -1 + Math.floor(i / 12) * 2);
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.14, 0.55, 6),
          new THREE.MeshStandardMaterial({ color: 0xb8c2d4, roughness: 0.4, metalness: 0.4 }),
        );
        spike.position.set(spot.x, 0.28, spot.z);
        parent.add(spike);
      }
    }

    if (bay.id === 'crate') {
      // Eine Wand mit zwei Durchgängen: links kurz, rechts weit.
      wall(-9.5, 0, 3, 0.4);
      wall(0, 0, 12, 0.4);
      wall(9.5, 0, 3, 0.4);
    }

    if (bay.id === 'door') {
      // Eine Wand mit der Tür links und einer Lücke ganz rechts.
      wall(-10, 0, 2, 0.4);
      wall(1, 0, 16, 0.4);
      this.buildDoor(parent, bay);
    }

    if (bay.id === 'portal') {
      // Längs geteilt, vorne offen: der lange Weg führt einmal herum.
      wall(0, -2.5, 0.4, 11);
      this.buildRings(parent, bay);
    }

    if (bay.id === 'levels') {
      // Ein Klotz mit flachem Dach, sonst nichts. **Keine Treppe**: Ein NPC
      // ist heute ein dynamischer Zylinder, und ein Zylinder steigt keine
      // Stufe. Was er kann, ist von einer Kante fallen — und genau das ist
      // die Behauptung dieser Bucht (`ROOF` in `scenarios.ts`).
      const block = bayPoint(bay, -2, -2);
      this.slab(parent, this.blockMat, [11, ROOF, 9], [block.x, ROOF / 2, block.z], false);
    }
  }

  private buildDoor(parent: THREE.Group, bay: Scenario): void {
    const at = bayPoint(bay, -8, 0);
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2.2, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xe58aa8, roughness: 0.6 }),
    );
    leaf.position.set(at.x, 1.1, at.z);
    leaf.name = 'navlab-door';
    parent.add(leaf);
    this.door = leaf;
    // Offen heißt: zur Seite geschoben. Der Platz dafür ist die Wand daneben.
    this.doorHome.set(at.x - 2, 1.1, at.z);
    leaf.position.copy(this.doorHome);
  }

  private buildRings(parent: THREE.Group, bay: Scenario): void {
    this.portalRings = [];
    for (const lx of [-7, 7]) {
      const at = bayPoint(bay, lx, -5);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.1, 0.12, 12, 32),
        new THREE.MeshStandardMaterial({
          color: 0x9d7bff,
          emissive: new THREE.Color(0x2a1a55),
          roughness: 0.4,
        }),
      );
      ring.position.set(at.x, 1.2, at.z);
      ring.visible = false;
      parent.add(ring);
      this.portalRings.push(ring);
    }
  }

  private buildSign(parent: THREE.Group, bay: Scenario): void {
    const at = bayPoint(bay, 0, -BAY_D / 2 + 0.4);
    const sign = new TextPlane({
      width: 7,
      height: 1.9,
      title: bay.title,
      body: bay.watch,
      accent: bay.accent,
    });
    sign.position.set(at.x, 2.6, at.z);
    sign.rotation.y = bay.z < 0 ? Math.PI : 0;
    parent.add(sign);
  }

  /** Der rote Knopf, und wo es einen gibt der gelbe daneben. */
  private buildKnobs(parent: THREE.Group, bay: Scenario): void {
    this.knob(parent, bay, -3, 0xff3b2f, 'START', () => this.toggle(bay.id));
    if (bay.act) this.knob(parent, bay, 3, 0xffc857, bay.act.toUpperCase(), () => this.act(bay.id));
  }

  private knob(
    parent: THREE.Group,
    bay: Scenario,
    lx: number,
    color: number,
    label: string,
    run: () => void,
  ): void {
    const at = bayPoint(bay, lx, BAY_D / 2 - 1.6);
    const group = new THREE.Group();
    group.position.set(at.x, 0, at.z);
    parent.add(group);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1, 16), this.metal);
    column.position.y = 0.5;
    group.add(column);

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        emissive: new THREE.Color(color).multiplyScalar(0.18),
      }),
    );
    dome.position.y = 1;
    group.add(dome);

    const plate = new TextPlane({
      width: 1.5,
      height: 0.3,
      title: label,
      align: 'center',
      accent: color,
    });
    plate.position.set(0, 0.72, 0.22);
    plate.rotation.x = -0.5;
    group.add(plate);

    this.knobs.push({ mesh: dome, run });
  }

  // --- was in keiner Geometrie steht ----------------------------------------

  /**
   * Nach dem Abtasten: die Stacheln und die Tür.
   *
   * Beides gibt es in keinem Quader — eine Grube ist ein Anstrich, und eine
   * Tür ist in der Geometrie entweder eine Lücke oder eine Wand, nie beides
   * nacheinander (`navBuild.ts`).
   */
  protected override navReady(graph: NavGraph): void {
    for (const bay of SCENARIOS) {
      if (bay.id === 'pit') {
        const a = bayPoint(bay, -6, -2);
        const b = bayPoint(bay, 6, 2);
        paintRect(
          graph,
          {
            minX: Math.min(a.x, b.x),
            maxX: Math.max(a.x, b.x),
            minZ: Math.min(a.z, b.z),
            maxZ: Math.max(a.z, b.z),
            y: 0,
          },
          { hazard: HAZARD_SPIKES },
        );
      }
      if (bay.id === 'door') {
        const north = bayPoint(bay, -8, -1.6);
        const south = bayPoint(bay, -8, 1.6);
        doorBetween(graph, { ...north, y: 0 }, { ...south, y: 0 }, DOOR_ID, true);
      }
    }
  }

  // --- die Knöpfe -----------------------------------------------------------

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    for (const knob of this.knobs) {
      ctx.pointer.add({ object: knob.mesh, onSelect: () => knob.run() });
    }
  }

  /** Startet ein Szenario — oder räumt es weg, wenn es schon läuft. */
  private toggle(id: ScenarioId): void {
    const state = this.states.get(id)!;
    if (state.running) {
      this.reset(id);
      this.context?.notify(`${scenario(id).title}: zurückgesetzt`);
      return;
    }
    this.reset(id);
    startScenario(state);
    this.play(id);
    this.context?.notify(`${scenario(id).title} läuft`);
  }

  /** Der gelbe Knopf: das, was das Szenario schwer macht. */
  private act(id: ScenarioId): void {
    const state = this.states.get(id)!;
    if (!state.running || state.acted) {
      this.context?.notify('Erst den roten Knopf');
      return;
    }
    state.acted = true;
    const graph = this.nav;
    const bay = scenario(id);

    if (id === 'crate' && graph) {
      const at = bayPoint(bay, -7.8, 0);
      const cube = createCompanionCube(1.4);
      cube.position.set(at.x, 0.75, at.z);
      this.root.add(cube);
      const entry = this.physics!.addDynamic(cube, { mass: 60, friction: 0.9, restitution: 0.02 });
      this.registerProp(entry, `navlab-crate-${this.clock.toFixed(2)}`);
      this.keep(id, entry);
      // Der Graph erfährt es sofort — die NPCs erst, wenn sie davorstehen.
      const key = graph.at(at.x, at.z, 0);
      if (key !== NO_TILE) graph.setBlocked(key, true);
      this.context?.notify('Durchgang zu — er plant um');
      return;
    }

    if (id === 'door' && graph) {
      graph.setDoor(DOOR_ID, { open: false, barred: true });
      if (this.door) this.door.position.set(this.doorHome.x + 2, 1.1, this.doorHome.z);
      this.context?.notify('Verriegelt — er weiß es noch nicht');
      return;
    }

    if (id === 'portal' && graph) {
      const a = bayPoint(bay, -7, -5);
      const b = bayPoint(bay, 7, -5);
      const from = graph.at(a.x, a.z, 0);
      const to = graph.at(b.x, b.z, 0);
      if (from === NO_TILE || to === NO_TILE) return;
      addPortal(graph, PORTAL_ID, from, to);
      for (const ring of this.portalRings) ring.visible = true;
      // Der zweite hat nicht hingesehen. Für ihn gibt es das Portal nicht.
      const blind = this.portalPair[1];
      if (blind) {
        for (const link of portalLinkIds(PORTAL_ID)) blind.mind().belief.hideLink(link, this.clock);
      }
      this.context?.notify('Portal offen — nur der vordere weiß davon');
    }
  }

  /** Stellt hin, was ein Szenario braucht. */
  private play(id: ScenarioId): void {
    const bay = scenario(id);
    const director = this.director;
    if (!director) return;

    const put = (lx: number, lz: number, kind: 'zombie' | 'dummy', y = 0): Npc | null => {
      const at = bayPoint(bay, lx, lz);
      return director.spawn({
        kind,
        brain: 'chase',
        at: new THREE.Vector3(at.x, y, at.z),
        yaw: bay.z < 0 ? 0 : Math.PI,
      });
    };

    if (id === 'corridor') put(-8, -6, 'zombie');
    if (id === 'pit') {
      put(-2.5, -6, 'zombie');
      put(2.5, -6, 'dummy');
    }
    if (id === 'crate') put(-7.8, -6, 'zombie');
    if (id === 'door') {
      const npc = put(-8, -6, 'zombie');
      // Er hat die Tür offen gesehen. Was der Spieler gleich damit macht,
      // erfährt er erst, wenn er davorsteht (`navBelief.ts`).
      const door = this.nav?.door(DOOR_ID);
      if (npc && door) npc.mind().belief.seeDoor(DOOR_ID, door, this.clock);
    }
    if (id === 'portal') {
      this.portalPair = [];
      for (const lz of [-6, -3]) {
        const npc = put(-7, lz, 'zombie');
        if (npc) this.portalPair.push(npc);
      }
    }
    if (id === 'levels') put(-2, -2, 'zombie', ROOF);
  }

  /** Räumt ein Szenario weg: NPCs, Kisten, Türen, Portale. */
  private reset(id: ScenarioId): void {
    stopScenario(this.states.get(id)!);
    this.director?.clear();
    this.portalPair = [];

    for (const entry of this.litter.get(id) ?? []) this.removeProp(entry, false);
    this.litter.delete(id);

    const graph = this.nav;
    if (!graph) return;
    if (id === 'crate') {
      for (const key of [...graph.blockedKeys()]) graph.setBlocked(key, false);
    }
    if (id === 'door') {
      graph.setDoor(DOOR_ID, { open: true, barred: false });
      if (this.door) this.door.position.copy(this.doorHome);
    }
    if (id === 'portal') {
      dropPortal(graph, PORTAL_ID);
      for (const ring of this.portalRings) ring.visible = false;
    }
  }

  private keep(id: ScenarioId, entry: PhysicsBody): void {
    const list = this.litter.get(id);
    if (list) list.push(entry);
    else this.litter.set(id, [entry]);
  }

  // --- das Bild -------------------------------------------------------------

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.clock += dt;
    for (const bay of SCENARIOS) {
      const state = this.states.get(bay.id)!;
      // Ein Szenario, das niemand abbricht, räumt sich selbst weg — sonst
      // stehen nach einer halben Stunde dreißig Zombies im Labor.
      if (tickScenario(state, dt)) this.reset(bay.id);
    }
  }

  /** Die eigene Uhr dieser Welt — die der Basis ist ihre Sache. */
  private clock = 0;
}

const DOOR_ID = 'navlab-tuer';
const PORTAL_ID = 'navlab-portal';

function scenario(id: ScenarioId): Scenario {
  return SCENARIOS.find((bay) => bay.id === id)!;
}
