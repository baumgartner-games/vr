import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { createCompanionCube } from '../portal/props';
import { createSky } from '../shared/environment';
import { TextPlane } from '../../ui/TextPlane';
import type { WorldContext } from '../../core/types';
import type { NavGraph } from '../nav/navGraph';
import { dropPortal, portalLinkIds } from '../nav/navBuild';
import { NO_TILE } from '../nav/navTile';
import { layerSpec, layerSummary, nextAll, type NavLayer } from '../nav/navLayers';
import { switchSpec, switchSummary } from '../nav/navSwitches';
import { doorSpec } from '../nav/navDoor';
import { doorBroken } from '../nav/navGraph';
import type { PreviewButton } from '../shared/livePreview';
import { NavConsole, switchOf, type ConsoleKey } from './NavConsole';
import type { PhysicsBody } from '../../physics/PhysicsWorld';
import type { Npc } from '../npc/Npc';
import {
  BAY_D,
  BAY_W,
  CRATE,
  DOOR_ID,
  DOOR_MATERIAL,
  PIT,
  PORTAL,
  PORTAL_ID,
  ROOF,
  SCENARIOS,
  applyLabMap,
  bayPoint,
  baySpot,
  doorLeaf,
  labBounds,
  labSolids,
  newScenarioState,
  openLabPortal,
  startScenario,
  stopScenario,
  tickScenario,
  type LabSolidKind,
  type Scenario,
  type ScenarioId,
  type ScenarioState,
} from './scenarios';

/**
 * **Das Navigationslabor** — acht Buchten, acht rote Knöpfe, und in jeder
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
  /**
   * Die Knöpfe, die im Zeiger hängen — beim Verlassen müssen sie wieder
   * heraus. Sie tragen ihren Namen mit: Auf dem Telefon steht daneben eine
   * Liste, und „Stachelgrube · Start" trifft man dort sicherer als eine
   * Kuppel aus dreißig Metern Höhe (`shared/livePreview.ts`).
   */
  private readonly knobs: {
    mesh: THREE.Mesh;
    label: string;
    group: string;
    accent: number;
    run: () => void;
  }[] = [];
  /** Was ein Szenario an Dingen in die Welt gestellt hat. */
  private readonly litter = new Map<ScenarioId, PhysicsBody[]>();
  private door: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;
  /** Wo das Türblatt steht, wenn die Tür offen ist — und wo, wenn sie zu ist. */
  private doorHome = new THREE.Vector3();
  private doorShut = new THREE.Vector3();
  private portalRings: THREE.Object3D[] = [];
  /** Die beiden aus der Portal-Bucht: der erste weiß davon, der zweite nicht. */
  private portalPair: Npc[] = [];
  /** Die Wandkonsolen im Mittelgang — beide zeigen denselben Zustand. */
  private readonly consoles: NavConsole[] = [];

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
    return 'Navigationslabor · Roter Knopf startet · Gelbe machen das Szenario schwer';
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

    // **Jeder Quader kommt aus den Daten** (`labSolids`), damit ein Test
    // dasselbe Labor abtasten kann, das man in der Brille sieht. Hier bleibt
    // nur noch die Farbe.
    for (const solid of labSolids()) {
      this.slab(
        lab,
        this.materialFor(solid.kind),
        [solid.w, solid.h, solid.d],
        [solid.x, solid.y, solid.z],
        solid.kind === 'floor',
      );
    }

    for (const bay of SCENARIOS) {
      this.decorate(lab, bay);
      this.buildSign(lab, bay);
      this.buildKnobs(lab, bay);
    }

    // Zwei Konsolen, je eine an der linken Seitenwand der mittleren Bucht —
    // dort, wo man beim Zusehen steht. An der Stirnwand am Gang stünden sie im
    // 76°-Winkel zum Startpunkt und wären genau dann nicht im Blick, wenn man
    // sie braucht. Mehr wären schöner: Jede Beschriftung kostet eine eigene
    // 512-px-Textur, und sechs Konsolen sind vierzig davon.
    this.buildConsole(lab, 'pit');
    this.buildConsole(lab, 'portal');
  }

  private materialFor(kind: LabSolidKind): THREE.Material {
    if (kind === 'floor') return this.floorMat;
    if (kind === 'block') return this.blockMat;
    return this.wallMat;
  }

  private buildConsole(parent: THREE.Group, id: ScenarioId): void {
    const bay = SCENARIOS.find((one) => one.id === id);
    if (!bay) return;
    const at = bayPoint(bay, -BAY_W / 2 + 0.35, 3);
    const panel = new NavConsole();
    // So hoch, dass die gewachsene Platte unter der 2,4-m-Wand bleibt.
    panel.position.set(at.x, 1.35, at.z);
    // Nach Osten, also in die Bucht hinein. **Eine Tafel schaut nach +Z** und
    // nicht nach −Z wie ein Körper: Ihre Vorderseite ist die Seite, auf der
    // die Knöpfe sitzen. Mit −90° stünde sie mit dem Rücken zum Raum und man
    // sähe eine schwarze Platte — genau das war der erste Versuch.
    panel.rotation.y = Math.PI / 2;
    parent.add(panel);
    this.consoles.push(panel);
  }

  /** Diese Welt bringt keine Kisten mit — was hier steht, stellt ein Szenario hin. */
  protected override buildProps(): void {}

  /**
   * Was in einer Bucht steht, ohne ein Quader zu sein.
   *
   * Die Wände kommen aus `labSolids()`; hier bleibt das, was **keinen Weg
   * versperrt**: der Anstrich der Grube, ihre Stacheln, das Türblatt und die
   * beiden Portalringe. Genau deshalb steht es getrennt — was hier gebaut
   * wird, sieht das Abtasten nie, und das ist Absicht.
   */
  private decorate(parent: THREE.Group, bay: Scenario): void {
    if (bay.id === 'pit') this.buildPit(parent, bay);
    if (bay.id === 'door') this.buildDoor(parent, bay);
    if (bay.id === 'portal') this.buildRings(parent, bay);
  }

  /** Die Grube: ein roter Anstrich und Stacheln darin. */
  private buildPit(parent: THREE.Group, bay: Scenario): void {
    const at = bayPoint(bay, (PIT.minLx + PIT.maxLx) / 2, (PIT.minLz + PIT.maxLz) / 2);
    const wide = PIT.maxLx - PIT.minLx;
    const deep = PIT.maxLz - PIT.minLz;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(wide, 0.06, deep), this.hazardMat);
    floor.position.set(at.x, 0.03, at.z);
    parent.add(floor);
    // Stacheln: man muss auf zwanzig Meter sehen, dass das keine Fußmatte ist.
    // Zwei Reihen zu zwölf, gleichmäßig über die Grube verteilt.
    const columns = 12;
    for (let i = 0; i < columns * 2; i++) {
      const spot = bayPoint(
        bay,
        PIT.minLx + ((i % columns) + 0.5) * (wide / columns),
        PIT.minLz + (Math.floor(i / columns) + 0.5) * (deep / 2),
      );
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.55, 6),
        new THREE.MeshStandardMaterial({ color: 0xb8c2d4, roughness: 0.4, metalness: 0.4 }),
      );
      spike.position.set(spot.x, 0.28, spot.z);
      parent.add(spike);
    }
  }

  private buildDoor(parent: THREE.Group, bay: Scenario): void {
    // Beide Lagen kommen aus denselben Daten wie im Test (`doorLeaf`): Zu heißt
    // in seiner Lücke, offen heißt um eine Kachel zur Seite geschoben, und der
    // Platz dafür ist die Wand daneben.
    const open = doorLeaf(bay, true);
    const shut = doorLeaf(bay, false);
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(shut.w, shut.h, shut.d),
      // Die Farbe kommt aus dem Material der Tür (`nav/navDoor.ts`) und nicht
      // aus dieser Zeile: Auf zwanzig Meter ist sie das einzige, woran man
      // sieht, ob der Zombie gleich außen herumläuft oder geradeaus
      // durchbricht.
      new THREE.MeshStandardMaterial({ color: doorSpec(DOOR_MATERIAL).color, roughness: 0.6 }),
    );
    leaf.name = 'navlab-door';
    parent.add(leaf);
    this.door = leaf;
    this.doorShut.set(shut.x, shut.y, shut.z);
    this.doorHome.set(open.x, open.y, open.z);
    leaf.position.copy(this.doorHome);
  }

  private buildRings(parent: THREE.Group, bay: Scenario): void {
    this.portalRings = [];
    for (const end of PORTAL) {
      const at = baySpot(bay, end);
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

  /** Der rote Knopf, und daneben je ein gelber für das, was die Bucht sonst kann. */
  private buildKnobs(parent: THREE.Group, bay: Scenario): void {
    this.knob(parent, bay, -5, 0xff3b2f, 'START', bay.title, () => this.toggle(bay.id));
    bay.acts.forEach((act, index) => {
      this.knob(parent, bay, 1 + index * 5, 0xffc857, act.label.toUpperCase(), bay.title, () =>
        this.act(bay.id, act.id),
      );
    });
  }

  private knob(
    parent: THREE.Group,
    bay: Scenario,
    lx: number,
    color: number,
    label: string,
    bayName: string,
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

    this.knobs.push({ mesh: dome, label, group: bayName, accent: color, run });
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
    applyLabMap(graph);
  }

  // --- die Knöpfe -----------------------------------------------------------

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    for (const knob of this.knobs) {
      ctx.pointer.add({ object: knob.mesh, onSelect: () => knob.run() });
    }
    for (const console_ of this.consoles) {
      for (const key of console_.keys()) {
        ctx.pointer.add({ object: key.mesh, onSelect: () => this.pressLayer(key.key) });
      }
    }
    this.refreshConsoles();
  }

  /**
   * Eine Taste der Wandkonsole.
   *
   * Beide Konsolen zeigen denselben Zustand, also werden nach jedem Druck
   * **beide** nachgezogen — sonst leuchtet die eine und die andere nicht, und
   * man traut keiner von beiden mehr.
   */
  private pressLayer(key: ConsoleKey): void {
    const id = switchOf(key);
    if (id) {
      // **Der untere Block schaltet, was gilt** — nicht, was man sieht
      // (`nav/navSwitches.ts`). Deshalb steht danach auch eine andere Zeile
      // unter dem Bild.
      const on = this.setNavSwitch(id, !this.navSwitchState()[id]);
      this.refreshConsoles();
      this.refreshMenuLabels();
      this.announce(
        `${switchSpec(id).label}: ${on ? 'an' : 'aus'} · ${switchSummary(this.navSwitchState())}`,
      );
      return;
    }
    if (key === 'all') {
      this.setNavLayers(nextAll(this.navLayerState()));
    } else {
      const layer = key as NavLayer;
      this.setNavLayer(layer, !this.navLayerState()[layer]);
    }
    this.refreshConsoles();
    this.refreshMenuLabels();
    this.announce(layerSummary(this.navLayerState()));
  }

  private refreshConsoles(): void {
    for (const console_ of this.consoles) {
      console_.refresh(this.navLayerState(), this.navSwitchState());
    }
  }

  /** Startet ein Szenario — oder räumt es weg, wenn es schon läuft. */
  private toggle(id: ScenarioId): void {
    const state = this.states.get(id)!;
    if (state.running) {
      this.reset(id);
      this.announce(`${scenario(id).title}: zurückgesetzt`);
      return;
    }
    // Erst alles andere weg: Acht Buchten teilen sich einen Bestand an NPCs
    // und einen Spieler, und zwei Szenarien gleichzeitig sind zwei, von denen
    // keines mehr zeigt, was es behauptet.
    for (const bay of SCENARIOS) this.reset(bay.id);
    startScenario(state);
    this.stand(id);
    this.play(id);
    this.announce(`${scenario(id).title} läuft`);
  }

  /**
   * **Den Spieler dorthin stellen, wo die Bucht ihn braucht** (`stand` in
   * `scenarios.ts`).
   *
   * Ohne das tut ein Knopf nichts: Ein Zombie bemerkt einen Spieler auf 22
   * Meter, und der Mittelgang ist von den äußeren Buchten fast vierzig weit
   * weg. In der Brille steht ein echter Spieler — der geht selbst hin, und
   * dann macht dieser Handgriff nichts (`placePreviewPlayer`).
   */
  private stand(id: ScenarioId): void {
    const bay = scenario(id);
    const at = baySpot(bay, bay.stand);
    this.placePreviewPlayer(_stand.set(at.x, bay.stand.y ?? 0, at.z));
  }

  /**
   * **Ein gelber Knopf.**
   *
   * Zwei Sorten, und der Unterschied steht in den Daten (`ScenarioAct.once`):
   * Die Wendung eines Szenarios gibt es einmal je Durchlauf und nur, solange
   * einer läuft — die Kiste fällt einmal, das Portal geht einmal auf. Ein
   * **Schalter** dagegen gilt immer: Die Tür des Labors macht man auf und zu,
   * wann man will, auch ohne dass etwas läuft. Wer sie zumacht und dann
   * startet, hat ein anderes Szenario, und genau dafür ist sie da.
   */
  private act(id: ScenarioId, actId: string): void {
    const state = this.states.get(id)!;
    const bay = scenario(id);
    const act = bay.acts.find((one) => one.id === actId);
    if (!act) return;
    if (act.once) {
      if (!state.running || state.acted) {
        this.announce('Erst den roten Knopf');
        return;
      }
      state.acted = true;
    }
    const graph = this.nav;

    if (actId === 'door' && graph) {
      const facts = graph.door(DOOR_ID);
      if (!facts || doorBroken(facts)) {
        this.announce('Die Tür ist hin — erst den roten Knopf');
        return;
      }
      const shut = facts.open;
      this.setDoor(graph, shut ? 'shut' : 'open');
      this.announce(shut ? 'Tür zu' : 'Tür offen');
      return;
    }

    if (actId === 'wood' && graph) {
      // **Der Knopf, wegen dem diese Bucht zwei Behauptungen aufstellt.**
      // Dieselbe zugezogene Tür: aus Metall eine Wand, aus Holz drei Sekunden
      // Arbeit. Was der Zombie daraus macht, sieht man am Weg.
      const facts = graph.door(DOOR_ID);
      if (!facts) return;
      if (doorBroken(facts)) {
        this.announce('Die Tür ist hin — erst den roten Knopf');
        return;
      }
      const next = facts.material === 'wood' ? 'metal' : 'wood';
      graph.setDoor(DOOR_ID, { material: next });
      this.announce(`Tür aus ${doorSpec(next).label}`);
      return;
    }

    if (id === 'crate' && graph) {
      const at = baySpot(bay, CRATE);
      const cube = createCompanionCube(1.4);
      cube.position.set(at.x, 0.75, at.z);
      this.root.add(cube);
      const entry = this.physics!.addDynamic(cube, { mass: 60, friction: 0.9, restitution: 0.02 });
      this.registerProp(entry, `navlab-crate-${this.clock.toFixed(2)}`);
      this.keep(id, entry);
      // Der Graph erfährt es sofort — die NPCs erst, wenn sie davorstehen.
      const key = graph.at(at.x, at.z, 0);
      if (key !== NO_TILE) graph.setBlocked(key, true);
      this.announce('Durchgang zu — er plant um');
      return;
    }

    if (actId === 'bar' && graph) {
      this.setDoor(graph, 'barred');
      this.announce('Verriegelt — er weiß es noch nicht');
      return;
    }

    if (id === 'portal' && graph) {
      if (!openLabPortal(graph)) return;
      for (const ring of this.portalRings) ring.visible = true;
      // Der zweite hat nicht hingesehen. Für ihn gibt es das Portal nicht.
      const blind = this.portalPair[1];
      if (blind) {
        for (const link of portalLinkIds(PORTAL_ID)) blind.mind().belief.hideLink(link, this.clock);
      }
      this.announce('Portal offen — nur der vordere weiß davon');
    }
  }

  /**
   * **Die Tür, in der Welt und auf der Karte zugleich.**
   *
   * Ein Türblatt, das zusteht, während die Karte offen sagt, ist der Zombie,
   * der durch die Tür läuft — und andersherum der, der vor einer offenen Tür
   * stehen bleibt. Deshalb geht beides nur hier und nur zusammen.
   */
  private setDoor(graph: NavGraph, how: 'open' | 'shut' | 'barred'): void {
    graph.setDoor(DOOR_ID, { open: how === 'open', barred: how === 'barred' });
    this.syncDoor();
  }

  /**
   * **Das Türblatt an den Zustand der Karte hängen** — jedes Bild, nicht nur
   * beim Knopfdruck.
   *
   * Bis hierher setzte nur der gelbe Knopf beides zusammen, und das reichte,
   * solange nur er die Tür anfasste. Inzwischen macht die Attrappe sie selbst
   * auf (`shared/previewWalk.ts`) und ein Zombie schlägt sie ein
   * (`npc/Npc.workDoor`) — und ein Blatt, das dabei stehen bliebe, wäre genau
   * der Fehler, den diese Bucht vorführen soll, nur unfreiwillig.
   */
  private syncDoor(): void {
    const graph = this.nav;
    const leaf = this.door;
    if (!graph || !leaf) return;
    const facts = graph.door(DOOR_ID);
    if (!facts) return;
    // Was hin ist, ist weg: Wo das Blatt hing, ist ein Loch in der Wand.
    leaf.visible = !doorBroken(facts);
    leaf.position.copy(facts.open ? this.doorHome : this.doorShut);
    leaf.material.color.setHex(doorSpec(facts.material).color);
  }

  /**
   * Stellt hin, was ein Szenario braucht.
   *
   * **Wer auftritt, steht in den Daten** (`cast` in `scenarios.ts`) — hier
   * steht nur noch, was danach mit den Gesetzten passiert. Der Grund ist ein
   * Prüfstein: Ob ein Auftritt nah genug am Spieler steht, um überhaupt
   * bemerkt zu werden, kann ein Test ausrechnen, solange die Zahlen Daten
   * sind; als Zeilen mitten in einer three.js-Methode kann er es nicht.
   */
  private play(id: ScenarioId): void {
    const bay = scenario(id);
    const director = this.director;
    if (!director) return;

    const cast: Npc[] = [];
    for (const one of bay.cast) {
      const at = baySpot(bay, one);
      const npc = director.spawn({
        kind: one.kind,
        brain: 'chase',
        at: new THREE.Vector3(at.x, one.y ?? 0, at.z),
        yaw: bay.z < 0 ? 0 : Math.PI,
      });
      if (npc) cast.push(npc);
    }

    if (id === 'door') {
      // Er hat die Tür offen gesehen. Was der Spieler gleich damit macht,
      // erfährt er erst, wenn er davorsteht (`navBelief.ts`).
      const door = this.nav?.door(DOOR_ID);
      const npc = cast[0];
      if (npc && door) npc.mind().belief.seeDoor(DOOR_ID, door, this.clock);
    }
    if (id === 'portal') this.portalPair = cast;
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
      // Eine eingeschlagene Tür macht kein `setDoor` wieder heil — das ist
      // Absicht (`navGraph.setDoor`). Zwischen zwei Durchläufen hängt sie
      // wieder in ihrer Lücke, und zwar aus dem Material, mit dem die Bucht
      // anfängt.
      graph.mendDoor(DOOR_ID, true);
      graph.setDoor(DOOR_ID, { material: DOOR_MATERIAL, open: true, barred: false });
      this.syncDoor();
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

  /**
   * Die eigene Uhr und die Zeitschaltung der Szenarien.
   *
   * Sie steht in `simulate` und nicht in `update`, und das ist der ganze
   * Unterschied zwischen „im Labor stehen" und „das Labor vom Telefon aus
   * laufen lassen": `update` braucht einen Spieler, `simulate` nicht
   * (`PortalWorld.simulate`).
   */
  protected override simulate(dt: number): void {
    this.clock += dt;
    this.syncDoor();
    for (const bay of SCENARIOS) {
      const state = this.states.get(bay.id)!;
      // Ein Szenario, das niemand abbricht, räumt sich selbst weg — sonst
      // stehen nach einer halben Stunde dreißig Zombies im Labor.
      if (tickScenario(state, dt)) this.reset(bay.id);
    }
  }

  /**
   * **Was das Telefon drücken darf**: die acht roten Knöpfe, die gelben
   * daneben — und die Tasten der Wandkonsolen.
   *
   * Dieselben Objekte wie in der Brille, dieselben Handgriffe dahinter. Eine
   * zweite Bedienung für dieselben acht Szenarien wäre eine, die irgendwann
   * etwas anderes tut als die erste.
   */
  protected override previewButtons(): PreviewButton[] {
    const buttons: PreviewButton[] = this.knobs.map((knob) => ({
      object: knob.mesh,
      label: knob.label,
      group: knob.group,
      accent: knob.accent,
      press: () => knob.run(),
    }));
    // Die Tasten beider Wandkonsolen — **leise**: Die Werkzeugseite hat für
    // dieselben Ebenen eigene Schalter, und eine zweite Reihe daneben
    // wäre nur eine, die man zusätzlich lesen muss. Antippen im Bild geht
    // trotzdem, denn im Bild stehen sie ja.
    for (const console_ of this.consoles) {
      for (const key of console_.keys()) {
        buttons.push({
          object: key.mesh,
          label: consoleLabel(key.key),
          group: 'Navigation zeigen',
          accent: 0x39d0ff,
          quiet: true,
          press: () => this.pressLayer(key.key),
        });
      }
    }
    return buttons;
  }

  /** Von außen umgelegt (Werkzeugseite): die Konsolen leuchten trotzdem mit. */
  protected override previewLayersChanged(): void {
    this.refreshConsoles();
  }

  /** Die eigene Uhr dieser Welt — die der Basis ist ihre Sache. */
  private clock = 0;
}

/** Wohin der Spieler beim Start eines Szenarios gestellt wird (`stand`). */
const _stand = new THREE.Vector3();

/** Wie eine Konsolentaste in der Liste auf dem Telefon heißt. */
function consoleLabel(key: ConsoleKey): string {
  const id = switchOf(key);
  if (id) return `${switchSpec(id).label} an/aus`;
  return key === 'all' ? 'Alles' : layerSpec(key).label;
}

function scenario(id: ScenarioId): Scenario {
  return SCENARIOS.find((bay) => bay.id === id)!;
}
