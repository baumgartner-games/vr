import * as THREE from 'three';
import type { WorldContext, WorldDefinition, WorldPreview } from '../../core/types';
import { WORLDS } from '../index';
import { TextPlane } from '../../ui/TextPlane';
import { turnWithView } from '../../ui/billboard';
import { createSky } from '../shared/environment';
import { GridWorld } from '../grid/GridWorld';
import type { GridPlan } from '../grid/gridPlan';
import type { PlanSolidKind } from '../grid/solids';
import type { Props } from '../grid/fixtures/index';
import type { Handedness } from '../../core/XRInput';
import { TILE, dirX, dirZ, tileCentreX, tileCentreZ, tileKey } from '../nav/navTile';
import { gatesIn, spinGate } from './gate';
import { CORRIDOR_WIDTH, HALL_HALF, hubGrid, type HubCorridor } from './hubGrid';
import {
  ARCH_HEIGHT,
  HALL_WALL,
  hubDecor,
  solidBox,
  wallPoint,
  yawToCentre,
  type HubPiece,
} from './hubDecor';
import { kaykitAtHeight, kaykitSkins } from '../../core/kaykitHeight';
import { sortWorlds } from '../../ui/menuGroups';
import { ALL_GROUPS, GROUP_WORLD } from '../../physics/PhysicsWorld';

/**
 * **Der Hub: hell, ruhig, und jede andere Welt ist ein Tor weit weg.**
 *
 * Er steht seit P4 auf dem **Kachelgitter** (`grid/GridWorld.ts`) wie das
 * Dunkelhaus, der Schießstand und Dust. Vorher war er eine Welt aus
 * handgerechneten Metern, die ihre Halle, ihre Gänge und ihre Tore selbst
 * baute — und die Tore waren Zeigerziele, die es nur hier gab. Der Umzug
 * bringt drei Sachen, die vorher nicht zu haben waren:
 *
 * - **Dieselbe Halle für alle.** Wer in der Brille steht und wer _von oben_
 *   spielt, stehen im selben Raum; die Kamera ist ein Blickwinkel und keine
 *   zweite Welt (E1).
 * - **Ein Tor ist ein Einbau** (`grid/fixtures/gate.ts`) und kein Möbel. Man
 *   geht hindurch, statt darauf zu zeigen — und jede andere Gitterwelt setzt
 *   sich mit **einer Zeile** ein Rücktor neben ihren Startpunkt.
 * - **Wände, Boden und Navigationskarte kommen aus dem Grundriss**
 *   (`hubGrid.ts`, mit Test). Ein Gang, den man nicht betreten kann, fällt in
 *   einer Millisekunde auf statt nach dem Aufsetzen.
 *
 * **Die Tore kommen beim Bau aus `WORLDS`** und nicht aus einer gespeicherten
 * Datei (E7). Deshalb ist der Hub auch die eine Gitterwelt, an der **nicht**
 * gebaut wird (`editable()` bleibt falsch): Ein gespeicherter Hub wäre einer,
 * in dem die Tore von letzter Woche stehen, und die neue Welt in der Registry
 * hätte keines.
 *
 * Was von Hand bleibt, ist die **Ausstattung**: Himmel, Nebel, der Ring auf
 * dem Hallenboden, die Lichtbänder in den Gängen und die beiden Tafeln. Das
 * ist der Teil, der eine Halle von einem Grundriss unterscheidet.
 */
export class HubWorld extends GridWorld {
  /** Die Welten hinter den Toren — dieselbe Liste, aus der `layout()` baut. */
  private readonly targets: WorldDefinition[] = hubTargets();
  /** Die Tafeln in der Halle: eigene Textur, also eigenes Aufräumen. */
  private readonly panels: TextPlane[] = [];
  /**
   * Die Ausstattung aus dem Regal (`hubDecor.ts`) — kommt nach dem Bau,
   * Stück für Stück. Die Marke hält ein Stück ab, das erst ankommt, wenn der
   * Hub schon wieder abgeräumt ist.
   */
  private decorRound = 0;
  private readonly decorSkins: THREE.Material[] = [];
  /** Unsichtbar: die Stoßkörper unter Bänken, Lampen und Pflanzen. */
  private readonly hidden = new THREE.MeshBasicMaterial({ visible: false });

  protected override worldId(): string {
    return 'hub';
  }

  protected override editorTitle(): string {
    return 'Hub';
  }

  protected override layout(): GridPlan {
    return hubGrid(this.targets.length, (index) => this.gateProps(index)).plan;
  }

  /**
   * Was an einem Tor eingestellt ist: die Welt dahinter, ihr Name, ihre Farbe.
   *
   * Flach und aus drei Feldern, damit `Props` bleibt, was es ist — was in eine
   * Datei passt. Die Farbe ist eine **Zahl** und kein `#rrggbb`: Sie kommt aus
   * der Registry als Zahl, und eine Übersetzung hin und zurück wäre zwei
   * Stellen, an denen sie schiefgehen kann.
   */
  private gateProps(index: number): Props {
    const world = this.targets[index]!;
    return {
      world: world.id,
      label: world.title,
      accent: world.accent,
      // Die Zeile unter dem Namen, wie sie schon immer am Tor stand.
      note: world.description,
    };
  }

  protected override skyColor(): number {
    return 0x0a1020;
  }

  protected override lightIntensity(): number {
    return 1.15;
  }

  protected override welcome(): string {
    return 'Die Lobby — durch ein Tor gehen startet das Spiel dahinter';
  }

  /**
   * **Leere Hände.** Der Hub ist der Ort, an dem man ankommt, und nicht der,
   * an dem man schießt; die Werkzeuge hängen in den Welten dahinter.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  /** Im Hub steht nichts herum, was umfallen könnte. */
  protected override buildProps(): void {}

  /** Die Töne von früher: blaue Halle, dunkle Wände, helle Kanten. */
  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return {
      floor: 0x3a4666,
      wall: 0x2f3b5e,
      steel: 0x9aa6bd,
      glow: 0x9ec4ff,
    };
  }

  protected override horizonColor(): number {
    return 0x1d2740;
  }

  protected override horizonLine(): number {
    return 0x4aa8ff;
  }

  protected override spawnPoint(): THREE.Vector3 {
    // Die Mittelkachel der Halle — nie eine Torkachel, dafür sorgt der
    // Grundriss (`hubGrid.ts`, mit Test).
    return hallCentre();
  }

  protected override spawnYaw(): number {
    // Nach Norden, also in den ersten Gang hinein: Was man beim Ankommen sieht,
    // sind vier Schilder.
    return 0;
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();

    this.root.add(createSky(0x1b3358, 0x05070d));

    const hub = hubGrid(this.targets.length);
    const middle = hallCentre();
    this.root.add(buildHallRing(middle));
    for (const corridor of hub.corridors) this.root.add(buildCorridorLights(corridor, middle));
    this.root.add(this.buildSigns(middle, hub.corridors));
    this.blockDecor(middle, hub.corridors);
    void this.furnish(middle, hub.corridors, ++this.decorRound);
  }

  /**
   * **Die Stoßkörper der Ausstattung** — sofort und nicht erst, wenn das
   * Modell da ist: Eine Bank, durch die man läuft, solange sie lädt, ist eine,
   * durch die man läuft. Unsichtbare Quader wie im Burgerladen; sie stehen in
   * `solids`, also sieht sie auch das Wegnetz der NPCs.
   */
  private blockDecor(middle: THREE.Vector3, corridors: readonly HubCorridor[]): void {
    const physics = this.physics;
    if (!physics) return;
    const pieces = hubDecor(
      corridors,
      this.targets.map((world) => world.accent),
    );
    for (const piece of pieces) {
      const box = solidBox(piece);
      if (!box) continue;
      const width = box.maxX - box.minX;
      const depth = box.maxZ - box.minZ;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, DECOR_BLOCK_HEIGHT, depth),
        this.hidden,
      );
      mesh.position.set(
        middle.x + (box.minX + box.maxX) / 2,
        DECOR_BLOCK_HEIGHT / 2,
        middle.z + (box.minZ + box.maxZ) / 2,
      );
      mesh.name = 'hub-decor-block';
      this.root.add(mesh);
      mesh.updateMatrixWorld(true);
      this.solids.push(mesh);
      physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
    }
  }

  /**
   * **Die Lobby einrichten** — Bögen, Lampen, Bänke, Büsche aus dem Regal
   * (`hubDecor.ts`). Nichts davon wird abgewartet: Die Halle steht, die Tore
   * leuchten, und was aus dem Regal kommt, kommt dazu. Kommt nichts (kein
   * Netz, Jest, ein Checkout ohne Pakete), steht der Hub wie vorher da.
   */
  private async furnish(
    middle: THREE.Vector3,
    corridors: readonly HubCorridor[],
    round: number,
  ): Promise<void> {
    const pieces = hubDecor(
      corridors,
      this.targets.map((world) => world.accent),
    );
    await Promise.all(pieces.map((piece) => this.place(piece, middle, round)));
  }

  private async place(piece: HubPiece, middle: THREE.Vector3, round: number): Promise<void> {
    const model = await kaykitAtHeight(piece.path, piece.height).catch(() => null);
    if (!model || round !== this.decorRound) return;
    model.position.set(middle.x + piece.x, 0, middle.z + piece.z);
    model.rotation.y = piece.yaw;
    model.name = `hub-decor:${piece.path}`;
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    this.decorSkins.push(...kaykitSkins(model));
    this.root.add(model);
  }

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // Tiefe frisst Farbe: Ohne Nebel liegt der letzte Gang so klar da wie die
    // Halle, und die Anlage sieht nach Plan aus statt nach Raum.
    // In Metern und nicht in Kacheln gedacht: Die Halle misst elf Meter, ein
    // Gang ist fünfzehn lang. Ein Nebel, der erst bei vierzig Metern anfängt
    // (so stand es hier, als eine Kachel 2,5 m maß), fängt hinter der ganzen
    // Anlage an und ist damit keiner.
    ctx.scene.fog = new THREE.Fog(0x0a1020, 14, 90);
  }

  override dispose(ctx: WorldContext): void {
    ctx.scene.fog = null;
    for (const panel of this.panels) panel.dispose();
    this.panels.length = 0;
    this.decorRound++;
    for (const skin of this.decorSkins) skin.dispose();
    this.decorSkins.length = 0;
    super.dispose(ctx);
  }

  /**
   * **Der Hub zum Ansehen** — dieselbe Halle, dieselben Gänge, dieselben Tore,
   * nur ohne Spieler (`tools.html`).
   *
   * Gebaut wird er von `PortalWorld.preview()` mit **denselben Zeilen** wie im
   * Spiel; was hier dazukommt, ist die Bewegung. Die Tore finden sich dabei
   * über ihren eigenen Baum (`gatesIn`) und nicht über die Einbauten: Die
   * Vorschau hat keinen `update`-Takt, und eine Welt, die ihre Registry für ein
   * Bild anwirft, ist eine, die in der Vorschau anders läuft als im Spiel.
   */
  override preview(): WorldPreview {
    const view = super.preview();
    const gates = gatesIn(this.root);
    return {
      ...view,
      animate: (time) => gates.forEach((gate, index) => spinGate(gate, time, index)),
      // **Tafeln zuerst.** Die Vorschau räumt sonst nur Formen und Materialien
      // weg (`disposeTree`); eine Tafel hat darüber hinaus eine Leinwand und
      // eine Textur, und davon gibt es hier eine je Tor.
      dispose: () => {
        this.root.traverse((one) => {
          if (one instanceof TextPlane) one.dispose();
        });
        this.panels.length = 0;
        view.dispose?.();
      },
    };
  }

  /**
   * **Die Schilder der Lobby**: über jedem Bogen der Name der Welt dahinter,
   * und an der Südwand der Hinweis, wie man hinkommt.
   *
   * Über dem Bogen hing früher _Baumgartner VR_ — eine Überschrift über dem
   * einen Gang, in dem alle Tore standen. In der Lobby hat jeder Gang sein
   * eigenes Ziel, und das Schild darüber sagt, welches: groß genug, um es aus
   * der Hallenmitte zu lesen, und in der Farbe der Welt.
   */
  private buildSigns(middle: THREE.Vector3, corridors: readonly HubCorridor[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'hub-signs';

    corridors.forEach((corridor, index) => {
      const world = this.targets[index];
      if (!world) return;
      const sign = new TextPlane({
        // Etwas breiter als der Bogen (2,1 m), damit der Name über ihm sitzt
        // wie ein Schriftzug über einem Tor.
        width: 2.3,
        height: 0.62,
        title: world.title,
        body: world.tagline,
        align: 'center',
        accent: world.accent,
        // **Kein `face`, und das ist Absicht** (`ui/billboard.ts`): Es ist die
        // Aufschrift über der Mündung und kein Schild darin. Zur Kamera
        // geneigt, läge es von oben quer über dem Tor, auf das man sich
        // stellen soll; das Schild am Tor selbst dreht sich ohnehin.
      });
      const at = wallPoint(corridor.dir, HALL_WALL + 0.05, 0);
      sign.position.set(middle.x + at.x, ARCH_HEIGHT + 0.5, middle.z + at.z);
      sign.rotation.y = yawToCentre(corridor.dir);
      // **Nur von oben**: dann steht es aufrecht zur Kamera, auch nach einer
      // Drehung der Draufsicht (`Q`, ⟲ ⟳) — sonst zeigte es ihr Kante oder
      // Rücken. Aus den Augen hängt es, wie gebaut, über der Mündung.
      turnWithView(sign, 'upright');
      group.add(sign);
      this.panels.push(sign);
    });

    const hint = new TextPlane({
      width: 1.8,
      height: 0.58,
      title: 'Lobby',
      body: 'Durch ein Tor gehen startet das Spiel dahinter. Menü: Knopf an der Hand, ☰ oder M.',
      accent: 0x9d7bff,
      // Zur Kamera gedreht — ein Hinweis an der Wand wird von überall gelesen.
      face: true,
    });
    hint.position.set(middle.x - (HALL_HALF - 2) * TILE, 1.6, middle.z + HALL_HALF * TILE);
    group.add(hint);
    this.panels.push(hint);
    return group;
  }
}

/**
 * **Die Mitte der Halle in Metern.**
 *
 * Über den Kachelschlüssel und nicht über die Kachelzahl: `tileCentreX` nimmt
 * einen **Schlüssel** (`nav/navTile.ts`), und wer ihm die blanke 0 gibt,
 * bekommt die Kachel −1024 — also den Rand des Gitters, 2,5 km weit weg. Das
 * ist keine krumme Zahl, die man sähe, sondern ein Spieler, der beim Start ins
 * Leere fällt.
 */
function hallCentre(): THREE.Vector3 {
  const middle = tileKey(0, 0, 0);
  return new THREE.Vector3(tileCentreX(middle), 0, tileCentreZ(middle));
}

/**
 * Wie weit eine Ganglampe leuchtet, in Metern.
 *
 * Acht: gut zwei Gangbreiten, und damit die Strecke, nach der die nächste
 * übernimmt. In Metern und nicht in Kacheln, weil Licht in Metern abnimmt —
 * eine Zahl aus Kachelbreiten war genau so lange richtig, wie eine Kachel
 * 2,5 m maß.
 */
const LAMP_RANGE = 8;

/**
 * Wie hoch die Stoßkörper der Ausstattung reichen: über die Hüfte, damit man
 * nicht auf eine Bank springt und darüber hinweg in die Wand läuft.
 */
const DECOR_BLOCK_HEIGHT = 1.2;

/** Jede Welt außer dem Hub selbst, in der Reihenfolge der Registry. */
export function hubTargets(): WorldDefinition[] {
  // In der Reihenfolge des Menüs und der Startseite: Spiele zuerst, dann
  // Baustellen, dann Prüfstände (`menuGroups.sortWorlds`). Das erste Tor steht
  // im Norden — genau dort, wohin man beim Ankommen schaut.
  return sortWorlds(WORLDS.filter((world) => world.id !== 'hub'));
}

/**
 * Der leuchtende Ring auf dem Hallenboden.
 *
 * Das Einzige, was vom alten runden Saal übrig ist — und das Einzige, was von
 * ihm gebraucht wird: Er sagt, wo die Halle aufhört und ein Gang anfängt, und
 * er tut es in einem Bild statt in einer Zeile.
 */
function buildHallRing(middle: THREE.Vector3): THREE.Mesh {
  const ring = new THREE.Mesh(
    // Eine Handbreit innerhalb der Hallenwand: Der Ring sagt, wo die Halle
    // aufhört, und darf deshalb nicht in ihr stecken.
    new THREE.TorusGeometry((HALL_HALF + 0.5) * TILE - 0.4, 0.06, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x4aa8ff, toneMapped: false }),
  );
  ring.name = 'hall-ring';
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(middle.x, 0.04, middle.z);
  return ring;
}

/**
 * **Licht in einem Gang**: zwei Bänder an den Wänden und drei Lampen dazwischen.
 *
 * Ein Gang ohne eigenes Licht ist ein schwarzes Loch, in das niemand
 * hineingeht.
 *
 * Drei Lampen und nicht mehr zwei: Ein Gang ist fünfzehn Meter lang (auf
 * 2,5-m-Kacheln waren dieselben Kachelzahlen fast vierzig), und eine Lampe
 * leuchtet acht Meter weit — zwei ließen zwischen sich ein dunkles Stück.
 */
function buildCorridorLights(corridor: HubCorridor, middle: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  group.name = 'corridor-lights';

  const ahead = new THREE.Vector3(dirX(corridor.dir), 0, dirZ(corridor.dir));
  const side = new THREE.Vector3(-ahead.z, 0, ahead.x);
  const from = (corridor.from - 0.5) * TILE;
  const to = (corridor.to + 0.5) * TILE;
  const run = to - from;
  const across = (CORRIDOR_WIDTH / 2) * TILE;
  const at = (along: number, offset: number): THREE.Vector3 =>
    new THREE.Vector3(
      middle.x + ahead.x * along + side.x * offset,
      0,
      middle.z + ahead.z * along + side.z * offset,
    );

  for (const sign of [-1, 1] as const) {
    const strip = new THREE.Mesh(
      // Gebaut entlang der Gangachse: `run` in die Länge, ein Handbreit in die
      // Quere — was quer liegt, ist ein Streifen an der Decke und kein Band.
      new THREE.BoxGeometry(Math.abs(ahead.x) * run + 0.06, 0.06, Math.abs(ahead.z) * run + 0.06),
      new THREE.MeshBasicMaterial({ color: 0x9ec4ff, toneMapped: false }),
    );
    const place = at(from + run / 2, sign * (across - 0.08));
    strip.position.set(place.x, 2.45, place.z);
    group.add(strip);
  }

  for (const part of [0.2, 0.5, 0.8]) {
    const lamp = new THREE.PointLight(0xbcd8ff, 26, LAMP_RANGE, 2);
    const place = at(from + run * part, 0);
    lamp.position.set(place.x, 2.3, place.z);
    group.add(lamp);
  }

  return group;
}
