import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { WorldEditor, type EditorHost } from '../editor/WorldEditor';
import { WORLD_VERSION, WorldFormatError, type WorldContents } from './worldFile';
import {
  downloadWorld,
  forgetWorld,
  hasStoredWorld,
  keepWorld,
  pickWorld,
  storedWorld,
} from './worldStore';
import type { NavGraph } from '../nav/navGraph';
import { DIRS, NO_TILE, TILE, keyLevel, tileCentreX, tileCentreZ, type Dir } from '../nav/navTile';
import { changeSlidingDoor } from './slidingDoor';
import { fixtureTile, type GridPlan } from './gridPlan';
import { knownKind } from './fixtures/kinds';
import { EFFECT_LIFT } from './fixtures/index';
import type {
  FixtureEvent,
  FixtureInput,
  FixtureKind,
  FixturePlacement,
  FixtureSound,
  FixtureSpot,
  FixtureView,
} from './fixtures/index';
import { Burst } from '../effects/Burst';
import { findEffect, scaleEffect } from '../effects/effectKinds';
import { levelStep, type ViewLevel } from '../../core/cutaway';
import { playEmpty, playPick, playPop, playSlam, playSwitch } from '../../core/Audio';
import { disposeShapes } from '../shared/environment';
import type { PlanSolid, PlanSolidKind } from './solids';
import type { WorldContext } from '../../core/types';
import type { MenuEntry } from '../../ui/menu';
import type { Handedness } from '../../core/XRInput';
import type { PhysicsBody } from '../../physics/PhysicsWorld';

/**
 * **Eine Welt, die auf dem Kachelgitter steht.**
 *
 * Sie beschreibt sich in `layout()` als Grundriss (`gridPlan.ts`) und bekommt
 * dafür alles, was eine Welt sonst von Hand machen musste: Geometrie, Physik,
 * Portalflächen und die Navigationskarte. Der Unterschied zu vorher ist keine
 * Ersparnis an Zeilen, sondern eine an *Unbekanntem* — was hier gebaut wird,
 * hat vorher schon ein Test gesehen.
 *
 * Drei Sachen erledigt sie, und alle drei standen vorher in jeder Welt einzeln:
 *
 * - **Die Farben.** Es gibt eine Palette für alle Gitterwelten
 *   (`GRID_COLORS`), und eine Welt verstellt daran einzelne Töne (`tint()`)
 *   statt sich sechs eigene Materialien anzulegen. Das ist der Grund, warum
 *   das Dunkelhaus neben dem Schießstand nicht mehr aussieht wie aus einem
 *   anderen Spiel — und es ist genau die „einheitliche Sache", die man an
 *   Böden und Wänden zuerst bemerkt.
 * - **Wo ein Portal haftet.** An den hellen Tafeln (`panel`) und am Boden, und
 *   sonst nirgends. Eine Wand aus hundert Kachelstücken darf nicht portalfähig
 *   sein: Ein Portal darin öffnete das Haus zum Nichts dahinter, und
 *   hundertfach eigene Kollisionsgruppen kostet obendrein.
 * - **Die Etagen.** Sie stehen im Plan, also muss sie niemand raten
 *   (`navLevels()`); geraten würde bei jedem Vordach eine zu viel.
 *
 * **Umgebaut wird im Bauplatz und nicht überall** (`editable`). Eine Weile
 * hing der Bearbeitungsmodus (`editor/WorldEditor.ts`) an jeder Gitterwelt,
 * erreichbar über eine Seite *Bauen* im Handgelenkmenü. Die ist wieder weg:
 * fünfzehn Zeilen, durch die man blätterte, wann immer man etwas anderes
 * suchte. Der Editor selbst ist geblieben, dort, wo Karte und Palette am
 * Gürtel hängen statt in einem Menü — im Bauplatz.
 *
 * **Fest wird das Gebaute erst, wenn die Karte weggeht.** Solange sie draußen
 * ist, wächst die Welt in Lebensgröße sichtbar mit, aber ihre Körper bleiben,
 * wie sie waren — man geht durch die Wand hindurch, die man gerade zieht,
 * statt in ihr zu stecken. Beim Weglegen wird alles neu gebaut und die
 * Navigationskarte neu abgetastet: Was man gebaut hat, sollen NPCs auch
 * belaufen können.
 */
export abstract class GridWorld extends PortalWorld {
  /** Der gebaute Grundriss — steht ab `buildEnvironment()` bereit. */
  protected grid: GridPlan | null = null;
  private readonly palette = new Map<PlanSolidKind, THREE.Material>();
  /** Wo die Quader hängen — beim Umbauen wird sie geleert und neu gefüllt. */
  private group: THREE.Group | null = null;
  /** Und welche das sind: Ein Umbau muss die alten wieder herausnehmen. */
  private readonly slabs: THREE.Object3D[] = [];
  /** Der Bearbeitungsmodus dieser Welt — `null`, wenn sie keinen hat. */
  private editor: WorldEditor | null = null;
  /** Woran erkannt wird, dass am Plan etwas passiert ist. */
  private builtVersion = -1;
  private readonly batches: THREE.InstancedMesh[] = [];
  /** Ob die Quader gerade auch Körper in der Physik haben. */
  private solid = true;
  /** Was beim Bauen eingefroren wurde — und deshalb hinterher aufzutauen ist. */
  private readonly frozen: PhysicsBody[] = [];
  /** Die gebauten Einbauten — Zustand, Bild und Körper (`fixtures/index.ts`). */
  private readonly fixtures: FixtureRun[] = [];
  /** Die laufenden Wolken (`effects/Burst.ts`) — was ein `effect`-Ereignis macht. */
  private readonly bursts: Burst[] = [];
  /**
   * **Auf welcher Ebene das Rig steht** — die Schnittkante der Ansicht von
   * oben (`core/cutaway.ts`, `viewLevel`).
   *
   * Sie wird geführt und nicht jedes Mal frisch gefragt, weil zwischen zwei
   * Etagen eine **Hysterese** liegt: Auf einer Treppe wechselt die Kachel
   * unter den Füßen schlagartig, und ohne Gedächtnis flackerte das Stockwerk
   * darüber beim Hin- und Hertreten.
   */
  private rigLevel = 0;

  /**
   * **Der Grundriss dieser Welt.** Das Einzige, was eine Gitterwelt wirklich
   * schreiben muss.
   */
  protected abstract layout(): GridPlan;

  /**
   * **Unter welchem Namen diese Welt gespeichert wird.**
   *
   * Abstrakt und nicht abgeleitet, und das ist Absicht. Naheliegend wäre
   * `ctx.net.world` gewesen — der steht beim Bauen aber noch auf der *vorigen*
   * Welt (`App.loadWorld` setzt ihn erst nach `init`), und zwei Welten, die
   * sich still denselben Speicherplatz teilen, sind der Fehler, den man erst
   * bemerkt, wenn im Dunkelhaus plötzlich Dust steht.
   */
  protected abstract worldId(): string;

  /** Wie sie heißt — für den Dateinamen und die Überschrift am Modell. */
  protected worldName(): string {
    return this.editorTitle();
  }

  /** Wozu „verwerfen" zurückführt — beim Bauplatz ist das kein Haus, sondern ein Zimmer. */
  protected originalName(): string {
    return 'die ausgelieferte Welt';
  }

  /**
   * Eigene Töne für einzelne Sorten. Was hier nicht steht, kommt aus
   * `GRID_COLORS` — und das ist der Normalfall.
   */
  protected tint(): Partial<Record<PlanSolidKind, number>> {
    return {};
  }

  /**
   * Was mit dem fertigen Grundriss noch passieren soll: Leitern eintragen,
   * Stacheln malen, ein Podest verbinden (`nav/navBuild.ts`).
   */
  protected planReady(_plan: GridPlan): void {}

  /**
   * **Was auch dann noch gilt, wenn ein gespeicherter Stand den Grundriss
   * ersetzt hat.**
   *
   * `planReady` läuft auf dem frisch gebauten Plan aus `layout()` — und damit
   * vor dem Speicher: Was im Browser liegt, gewinnt und **ganz**
   * (`applyStored`), und ein Stand von letzter Woche kennt weder das Tor
   * zurück in den Hub noch sonst etwas, das inzwischen dazugekommen ist. Wer
   * eine Welt umbauen darf, hätte sonst genau einmal umgebaut und säße
   * danach ohne Rückweg darin.
   *
   * Läuft deshalb **nach jedem Austausch des Grundrisses**: nach dem Speicher
   * beim Bauen und nach einer importierten Datei. Beim Zurücksetzen nicht —
   * dort kommt der Plan aus `layout()` und bringt alles selbst mit.
   */
  protected planLoaded(_plan: GridPlan): void {}

  protected override buildEnvironment(): void {
    const plan = this.layout();
    this.grid = plan;
    this.planReady(plan);
    this.applyStored(plan);
    this.planLoaded(plan);

    const group = new THREE.Group();
    group.name = 'grid';
    this.root.add(group);
    this.group = group;
    this.rebuildGrid();

    this.buildProps();
  }

  /**
   * **Alles neu, aus der Liste des Plans.**
   *
   * Kein Nachpflegen einzelner Kacheln: Ein Umbau, der nur die geänderte Stelle
   * anfasst, ist einer, in dem nach dem dreißigsten Handgriff ein Brett zu viel
   * steht. Und weil `dropSlab` jeden alten Quader vollständig zurücknimmt —
   * Körper, Portalfläche, Abtastliste —, kann dabei nichts liegenbleiben.
   */
  private rebuildGrid(): void {
    const plan = this.grid;
    const group = this.group;
    if (!plan || !group) return;
    this.builtVersion = plan.version;
    // **Einbauten werden wie Bausteine zurückgenommen.** Sie hängen in
    // derselben Gruppe und haben Körper in derselben Physik; wer sie beim
    // Umbau stehen ließe, hätte nach dem dritten Handgriff zwei Schilder auf
    // einer Kachel, von denen eines in keinem Plan mehr steht.
    this.clearFixtures();
    for (const batch of this.batches) {
      batch.geometry.dispose();
      batch.removeFromParent();
    }
    this.batches.length = 0;
    for (const mesh of this.slabs) this.dropSlab(mesh);
    this.slabs.length = 0;
    // **Das Blatt einer Einbau-Tür baut ihre Art selbst** (`fixtures/door.ts`):
    // Es fährt, und ein zweites, starres an derselben Stelle wäre eine Tür, die
    // aufgeht und trotzdem zu bleibt. Pfosten und Sturz kommen weiter aus dem
    // Plan — die stehen ja und bewegen sich nie.
    const owned = this.fixtureDoors();
    for (const solid of plan.solids()) {
      if (solid.door && owned.has(solid.door)) continue;
      if (solid.door && this.slidingGridDoors() && plan.graph.door(solid.door)?.open) continue;
      this.build(group, solid);
    }
    if (this.batchGridGeometry()) {
      // **Zusammengefasst wird je Material *und* je Ebene.** Ein Bündel über
      // zwei Stockwerke ließe sich von oben nicht mehr aufschneiden — es ist
      // ein Objekt, und ein Objekt hat eine Sichtbarkeit.
      const byMaterial = new Map<
        string,
        { material: THREE.Material; level: number; meshes: THREE.Mesh<THREE.BoxGeometry>[] }
      >();
      for (const object of this.slabs) {
        const mesh = object as THREE.Mesh<THREE.BoxGeometry>;
        if (!mesh.visible || Array.isArray(mesh.material)) continue;
        const level = typeof mesh.userData.level === 'number' ? mesh.userData.level : -1;
        const key = `${mesh.material.uuid}:${level}`;
        const group = byMaterial.get(key) ?? { material: mesh.material, level, meshes: [] };
        group.meshes.push(mesh);
        byMaterial.set(key, group);
      }
      for (const { material, level, meshes } of byMaterial.values()) {
        const batch = new THREE.InstancedMesh(
          new THREE.BoxGeometry(1, 1, 1),
          material,
          meshes.length,
        );
        if (level >= 0) batch.userData.level = level;
        const matrix = new THREE.Matrix4();
        const scale = new THREE.Vector3();
        meshes.forEach((mesh, i) => {
          const p = mesh.geometry.parameters;
          scale.set(p.width, p.height, p.depth);
          matrix.compose(mesh.position, mesh.quaternion, scale);
          batch.setMatrixAt(i, matrix);
          mesh.visible = false;
        });
        batch.computeBoundingSphere();
        group.add(batch);
        this.batches.push(batch);
      }
    }
    // **Nach den Bausteinen**, und zwar auch nach dem Zusammenfassen: Ein
    // Einbau hat ein eigenes Bild und eigene Körper, und in eine
    // `InstancedMesh` gehört er nicht — er bewegt sich.
    this.buildFixtures();
  }

  // --- die Einbauten --------------------------------------------------------

  /**
   * **Welche Türkanten des Plans einem Einbau gehören.**
   *
   * Die Namen und nicht die Kacheln, denn danach fragt der Quader
   * (`PlanSolid.door`). Eine Tür, die als Einbau dasteht, bringt ihr Blatt
   * selbst mit; alles andere an ihr — Pfosten, Sturz — kommt weiter aus dem
   * Grundriss.
   */
  private fixtureDoors(): ReadonlySet<string> {
    const out = new Set<string>();
    const plan = this.grid;
    if (!plan) return out;
    for (const place of plan.fixtures()) {
      if (!knownKind(place.kind)?.door) continue;
      const facts = plan.graph.wall(fixtureTile(place), place.dir);
      if (facts?.kind === 'door') out.add(facts.id);
    }
    return out;
  }

  /**
   * **Die Einbauten des Plans bauen** — jeden über seine Art
   * (`fixtures/index.ts`).
   *
   * Die Welt kennt dabei keine einzige Art beim Namen. Sie fragt die Registry,
   * gibt der Art eine Gruppe, ihre Kachelmitte und die Palette, und bekommt
   * ein Bild zurück. Das ist der ganze Zweck der Sache: Ein neues Tor, eine
   * neue Tür, eine neue Effektquelle sind eine Datei und eine Zeile in
   * `fixtures/kinds.ts` — und kein zusätzlicher `if`-Zweig hier.
   *
   * **Eine unbekannte Art wird übersprungen und gemeldet.** Eine Welt aus
   * einer neueren Fassung soll aufmachen; ein Absturz beim Laden ist die
   * schlechteste aller Antworten, und stillschweigend fehlen ist die
   * zweitschlechteste.
   */
  private buildFixtures(): void {
    const plan = this.grid;
    const group = this.group;
    if (!plan || !group) return;
    for (const place of plan.fixtures()) {
      const kind = knownKind(place.kind);
      if (!kind) {
        console.warn(`Einbau „${place.id}": die Art „${place.kind}" kennt dieses Programm nicht`);
        continue;
      }
      const tile = fixtureTile(place);
      const view = kind.build(place, {
        group,
        at: {
          x: tileCentreX(tile),
          // Auf dem Boden, den es dort gibt: Ein Schild auf einem Podest hängt
          // um dessen Höhe höher.
          y: plan.graph.levelY(place.level) + (plan.graph.tile(tile)?.rise ?? 0),
          z: tileCentreZ(tile),
        },
        material: (sort: PlanSolidKind) => this.materialFor(sort),
        notify: (message: string) => this.announce(message),
      });
      // Woran ein Strahl ihn wiedererkennt — der Haken für `use` (P2) und für
      // die Kugel, die den Knopf trifft (P6).
      if (view.object) {
        view.object.userData.fixture = place.id;
        // Und auf welcher Ebene er steht: Der Hebel auf dem Podest ist von
        // unten nicht zu sehen (`core/cutaway.ts`).
        view.object.userData.level = place.level;
      }
      this.attachUsable(place, kind, view);
      const state = kind.init(place);
      const run: FixtureRun = {
        place,
        kind,
        state,
        view,
        hard: false,
        meshes: [],
        used: false,
        hit: false,
        triggered: false,
      };
      this.fixtures.push(run);
      this.setFixtureSolid(run, kind.solid(state));
      kind.apply(view, state);
    }
  }

  /**
   * **Die eine Zeile, mit der jeder Einbau benutzbar wird** (`core/usable.ts`,
   * Plan E5/P2).
   *
   * Sie steht hier und nicht in den Arten, und das ist der Unterschied zwischen
   * einer Registry und einer Sammlung von Sonderfällen: Ein Knopf, ein Hebel,
   * ein Schild, ein Tor — sie alle werden auf dieselbe Art angefasst, und was
   * dabei passiert, entscheidet ihr `step` und nicht ihr Anschluss. Wer statt
   * dessen je Art eine eigene Anmeldung schriebe, hätte beim fünften Einbau
   * fünf Wege zum selben `markUsed`.
   *
   * **Die Kugel zählt wie die Hand** (Portal-Regel): Ein Treffer wird zu `hit`,
   * ein Druck zu `used`, und beides steht im nächsten `step`. Welche Art damit
   * etwas anfängt, ist ihre Sache — der Knopf tut es, die Platte nicht.
   */
  private attachUsable(
    place: FixturePlacement,
    kind: FixtureKind<unknown>,
    view: FixtureView,
  ): void {
    const object = view.handle ?? view.object;
    if (!object) return;
    object.userData.fixture = place.id;
    this.addUsable(
      object,
      {
        use: (by) => (by.kind === 'bullet' ? this.markHit(place.id) : this.markUsed(place.id)),
        // Der Hinweis über der Figur sagt, wovor sie steht — mehr weiß die
        // Welt nicht, und mehr braucht es nicht: `E · Knopf`.
        usePrompt: () => kind.label,
      },
      view.use ?? {},
    );
  }

  /**
   * **Die Quader eines Einbaus stehen, solange er fest ist.**
   *
   * Aufgefahren heißt: weg — dasselbe, was das Gitter mit seinen Türblättern
   * längst macht (`slidingDoor.ts`). Ein Körper, den man abschaltet und dessen
   * Blatt stehen bleibt, ist eine Tür, durch die man hindurchgeht, ohne dass
   * sie aufgegangen ist.
   */
  private setFixtureSolid(run: FixtureRun, on: boolean): void {
    run.hard = on;
    for (const mesh of run.meshes) this.dropSlab(mesh);
    run.meshes.length = 0;
    const group = this.group;
    if (!on || !group) return;
    for (const one of run.view.solids ?? []) {
      const mesh = this.slab(
        group,
        this.materialFor(one.kind),
        [one.w, one.h, one.d],
        [one.x, one.y, one.z],
        one.portal ?? false,
        this.solid,
      );
      mesh.userData.fixture = run.place.id;
      mesh.userData.level = run.place.level;
      // **Ein Blatt, das seine Art selbst zeichnet, ist hier nur Körper.** Die
      // Marke daran ist der Name der Tür (`PlanSolid.door`); sichtbar stünde
      // das Blatt zweimal da — einmal starr, einmal fahrend.
      if (one.door) mesh.visible = false;
      run.meshes.push(mesh);
    }
  }

  /** Alles wieder herausnehmen — Körper, Bild, Zustand. */
  private clearFixtures(): void {
    for (const run of this.fixtures) {
      for (const mesh of run.meshes) this.dropSlab(mesh);
      run.meshes.length = 0;
      // Abgemeldet wird, was angemeldet wurde: Ein benutzbares Ding, das nach
      // dem Umbau in der Liste der Welt stehen bliebe, wäre ein Knopf, der
      // nicht mehr da ist und trotzdem die Tür aufmacht.
      const handle = run.view.handle ?? run.view.object;
      if (handle) this.removeUsable(handle);
      run.view.dispose?.();
      // **Nur die Formen.** Die Materialien kommen aus der Palette der Welt
      // und werden geteilt; wer sie hier freigäbe, nähme sie allen anderen weg.
      if (run.view.object) disposeShapes(run.view.object);
    }
    this.fixtures.length = 0;
  }

  /**
   * **Ein Bild Einbauten** — Eingaben sammeln, `step` rufen, Ereignisse
   * verteilen.
   *
   * Zwei Sachen daran sind entschieden und nicht so herausgekommen:
   *
   * - **Ein Auslöser wirkt im nächsten Bild.** Die Ereignisse eines Bildes
   *   werden gesammelt und erst danach zugestellt. Sonst hinge es an der
   *   Reihenfolge der Liste, ob ein Knopf seine Tür noch in diesem Bild
   *   erwischt — und dieselbe Welt liefe nach dem Speichern anders als davor.
   * - **Benutzt, getroffen und ausgelöst gelten genau ein Bild.** Sie werden
   *   beim Lesen gelöscht; was länger gilt, ist ein Zustand und gehört der Art
   *   (`hold` bei der Tür).
   */
  private stepFixtures(dt: number, ctx: WorldContext): void {
    if (this.fixtures.length === 0) return;
    const pending: { from: FixtureRun; event: FixtureEvent }[] = [];
    for (const run of this.fixtures) {
      const on = this.standingOn(run, ctx);
      const input: FixtureInput = {
        used: run.used,
        hit: run.hit,
        triggered: run.triggered,
        weightOn: on.weight,
        playerOn: on.player,
      };
      run.used = false;
      run.hit = false;
      run.triggered = false;
      for (const event of run.kind.step(run.state, run.place, input, dt)) {
        pending.push({ from: run, event });
      }
      run.kind.apply(run.view, run.state);
      const hard = run.kind.solid(run.state);
      if (hard !== run.hard) {
        this.setFixtureSolid(run, hard);
        this.physics?.syncColliders();
      }
      if (run.kind.door) this.syncFixtureDoor(run);
    }
    for (const one of pending) this.fixtureEvent(one.from, one.event, ctx);
  }

  /**
   * **Was auf der Kachel eines Einbaus steht** — Spieler, NPCs, Kisten.
   *
   * Eine Zahl und kein Schalter: Eine Druckplatte, die unter zwei Kisten
   * genauso weit gedrückt ist wie unter einer, ist in Ordnung; eine, die nach
   * dem Wegnehmen der einen aufgeht, obwohl die andere noch daraufliegt, ist
   * es nicht.
   *
   * **Und daneben die eine Ausnahme**: ob der *Spieler* dabei ist. Beides fällt
   * in derselben Schleife an, und ein Tor braucht genau diesen Unterschied —
   * eine Kiste auf einer Torkachel darf niemanden in eine andere Welt schicken
   * (`fixtures/gate.ts`).
   */
  private standingOn(run: FixtureRun, ctx: WorldContext): { weight: number; player: boolean } {
    const plan = this.grid;
    if (!plan) return { weight: 0, player: false };
    const tile = fixtureTile(run.place);
    const x = tileCentreX(tile);
    const z = tileCentreZ(tile);
    const floor = plan.graph.levelY(run.place.level);
    const over = (px: number, py: number, pz: number): boolean =>
      Math.abs(px - x) <= TILE / 2 &&
      Math.abs(pz - z) <= TILE / 2 &&
      // Nach oben eine Kachelhöhe, nach unten eine Handbreit: Was im Stockwerk
      // darüber steht, steht nicht auf dieser Platte.
      py >= floor - 0.3 &&
      py <= floor + TILE;
    let count = 0;
    const rig = ctx.rig.position;
    const player = over(rig.x, rig.y, rig.z);
    if (player) count++;
    for (const npc of this.director?.crowd ?? []) {
      if (!npc.alive) continue;
      npc.feet(_feet);
      if (over(_feet.x, _feet.y, _feet.z)) count++;
    }
    for (const body of this.props) {
      const at = body.object.position;
      if (over(at.x, at.y, at.z)) count++;
    }
    return { weight: count, player };
  }

  /**
   * Die Türkante eines Einbaus mit seinem Zustand nachziehen — im Plan **und**
   * in der abgetasteten Karte, auf der die NPCs gerade laufen.
   *
   * Und danach gilt die Welt als gebaut: Eine Tür, die aufgeht, ändert im
   * Graphen ein Flag und an der Geometrie nichts — wer daraufhin die ganze
   * Welt neu bauen ließe (`builtVersion`), baute sie bei jeder Tür einmal neu.
   */
  private syncFixtureDoor(run: FixtureRun): void {
    const plan = this.grid;
    if (!plan || !run.kind.open) return;
    const open = run.kind.open(run.state);
    const tile = fixtureTile(run.place);
    const facts = plan.graph.wall(tile, run.place.dir);
    if (!facts || facts.kind !== 'door' || facts.open === open) return;
    plan.setFixtureDoor(run.place, open);
    this.nav?.setWall(tile, run.place.dir, { ...facts, open });
    this.builtVersion = plan.version;
  }

  /** Ein Ereignis eines Einbaus an seinen Abnehmer. */
  private fixtureEvent(from: FixtureRun, event: FixtureEvent, ctx: WorldContext): void {
    switch (event.type) {
      case 'trigger': {
        if (!event.target) break;
        const target = this.fixtures.find((one) => one.place.id === event.target);
        if (target) target.triggered = true;
        // Mit dem Absender: „Kein Einbau ‚tuer-2'" allein sagt nicht, wer ihn
        // gesucht hat — und gesucht hat ihn der, an dem das Ziel falsch steht.
        else this.announce(`${from.place.id}: kein Einbau „${event.target}"`);
        break;
      }
      case 'goto':
        // Genau das, was das Tor des Hubs heute tut — über den Weltkontext und
        // nicht über einen eigenen Weg in die App.
        if (event.world) ctx.goTo(event.world);
        break;
      case 'sound':
        playFixtureSound(event.name);
        break;
      case 'effect':
        // **Eine Wolke an der Kachel dessen, der sie meldet** — Rauch aus der
        // Effektquelle, Staub beim Aufgehen einer Tür, Funken, wenn eine Kugel
        // einen Knopf trifft. Die Zahlen dazu kommen aus `effects/effectKinds`
        // und werden nicht neu erfunden.
        this.fireEffect(from, event.effect, event.size ?? 1, event.at ?? null);
        break;
    }
  }

  // --- die Effekte ----------------------------------------------------------

  /**
   * **Eine Wolke an einer Kachel** — der Abnehmer für `effect`-Ereignisse.
   *
   * Sie steht hier und nicht in den Arten, und das ist dieselbe Trennung wie
   * beim Ton: Ein Einbau **meldet** einen Effekt, er baut ihn nicht. Dadurch
   * bleibt seine Logik prüfbar (kein three.js in `step`), und es gibt genau
   * eine Stelle, die weiß, wie viele Wolken gleichzeitig noch vertretbar sind
   * — bei vier Emittern in einer Ecke ist das der Unterschied zwischen sechzig
   * Bildern und einem Nebel.
   *
   * Die Zahlen sind die des Effektlabors (`effects/effectKinds.ts`), gezeichnet
   * von derselben Klasse (`effects/Burst.ts`). Neue Zahlen gibt es hier keine:
   * Zwei Sorten Rauch in einem Programm sind eine zu viel.
   */
  private fireEffect(from: FixtureRun, id: string, size: number, at: FixtureSpot | null): void {
    const plan = this.grid;
    if (!plan) return;
    const tile = fixtureTile(from.place);
    const floor = plan.graph.levelY(from.place.level) + (plan.graph.tile(tile)?.rise ?? 0);
    const spot = at ?? {
      x: tileCentreX(tile),
      // Nicht auf dem Boden: Eine Wolke, die im Boden anfängt, ist zur Hälfte
      // darunter (`fixtures/index.ts`, `EFFECT_LIFT`).
      y: floor + EFFECT_LIFT,
      z: tileCentreZ(tile),
    };
    const burst = new Burst(
      scaleEffect(findEffect(id), size),
      _spot.set(spot.x, spot.y, spot.z),
      floor + 0.05,
    );
    burst.userData.level = from.place.level;
    this.root.add(burst);
    this.bursts.push(burst);
    while (this.bursts.length > MAX_BURSTS) this.bursts.shift()?.dispose();
  }

  /** Die Wolken einen Schritt weiter; was durch ist, geht. */
  private stepBursts(dt: number): void {
    if (this.bursts.length === 0) return;
    // In der Zeit der Welt und nicht in der der Uhr an der Wand: Wer die
    // Stoppuhr auf Zeitlupe stellt, will genau *das* langsam sehen.
    const step = dt * this.worldTimeScale;
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i]!;
      if (burst.update(step)) continue;
      burst.dispose();
      this.bursts.splice(i, 1);
    }
  }

  /**
   * **Jemand hat diesen Einbau benutzt.**
   *
   * Der Haken, an dem das Benutzen hängt, solange es das kurze Strahlen nach
   * vorn noch nicht gibt (P2, `core/usable.ts`): Wer einen Einbau anfasst,
   * sagt es hier, und im nächsten `step` steht `used` auf wahr. Eine eigene
   * Benutz-Schnittstelle daneben wäre die zweite neben der, die gerade
   * entsteht.
   */
  markUsed(id: string): boolean {
    const run = this.fixtures.find((one) => one.place.id === id);
    if (!run) return false;
    run.used = true;
    return true;
  }

  /** Etwas hat ihn getroffen — die Kugel auf dem roten Knopf (P6). */
  markHit(id: string): boolean {
    const run = this.fixtures.find((one) => one.place.id === id);
    if (!run) return false;
    run.hit = true;
    return true;
  }

  /**
   * Zu welchem Einbau ein getroffenes Objekt gehört — `null`, wenn zu keinem.
   *
   * Die Marke hängt am Objekt und an jedem seiner Körper (`userData.fixture`),
   * und gesucht wird nach oben: Ein Strahl trifft das Brett eines Schildes und
   * nicht das Schild.
   */
  fixtureIdOf(object: THREE.Object3D | null): string | null {
    for (let one = object; one; one = one.parent) {
      const id = one.userData.fixture;
      if (typeof id === 'string') return id;
    }
    return null;
  }

  /**
   * **Ob die Welt gerade fest ist.**
   *
   * Während die Karte draußen ist, ist sie es nicht: Man malt eine Wand quer
   * durch den Raum, in dem man steht, und soll dabei nicht darin steckenbleiben.
   * Beim Weglegen wird alles wieder gebaut — diesmal mit Körpern — und die
   * Navigationskarte neu abgetastet.
   */
  private setSolid(on: boolean): void {
    if (this.solid === on) return;
    this.solid = on;
    if (this.group) this.group.visible = on;
    this.freezeProps(!on);
    this.rebuildGrid();
    if (on) this.rebake();
  }

  /**
   * **Was in der Welt liegt, hält still, solange sie keinen Boden hat.**
   *
   * Ohne das fiele jede Kiste des Hauses durch den Boden, den man gerade
   * bearbeitet, und läge hinterher auf der Fläche bis zum Horizont. Aufgetaut
   * wird nur, was dieser Handgriff selbst eingefroren hat — ein Aufzug ist
   * kinematisch und soll es bleiben.
   */
  private freezeProps(on: boolean): void {
    const physics = this.physics;
    if (!physics) return;
    if (!on) {
      for (const entry of this.frozen) physics.setFrozen(entry, false);
      this.frozen.length = 0;
      return;
    }
    for (const entry of this.props) {
      // **Was gerade in einer Hand liegt, bleibt lebendig.** Ein eingefrorener
      // Gegenstand in der Faust stünde in der Luft, während die Hand
      // weiterzieht.
      if (entry.carried || entry.clearing) continue;
      if (physics.setFrozen(entry, true)) this.frozen.push(entry);
    }
  }

  /**
   * Ein Quader aus der Liste, als Ding in der Welt.
   *
   * Türblätter bekommen ihren Namen mit: Daran erkennt sie später wieder, wer
   * eine Tür aufgehen lassen will, ohne dass jemand eine zweite Liste führen
   * muss.
   */
  private build(parent: THREE.Object3D, solid: PlanSolid): void {
    const mesh = this.slab(
      parent,
      this.materialFor(solid.kind),
      [solid.w, solid.h, solid.d],
      [solid.x, solid.y, solid.z],
      solid.portal ?? solid.kind === 'panel',
      this.solid,
    );
    // **Die Ebene bleibt am Quader hängen** (`core/cutaway.ts`, Plan E8): Von
    // oben verschwindet alles, was über der Ebene des Rigs liegt, und geraten
    // würde das falsch — ein Hochbett steht höher als eine Türklinke und ist
    // trotzdem im selben Zimmer. Der Plan weiß es, also sagt er es.
    if (solid.level !== undefined) mesh.userData.level = solid.level;
    if (solid.door) {
      mesh.userData.door = solid.door;
      mesh.visible = this.gridDoorVisible();
    }
    this.slabs.push(mesh);
  }

  protected batchGridGeometry(): boolean {
    return false;
  }

  protected gridDoorVisible(): boolean {
    return true;
  }

  /** Opt-in only: these worlds render their own sliding leaves. */
  protected slidingGridDoors(): boolean {
    return false;
  }

  /** Apply a door-only mutation immediately while leaving floors, walls and nav tiles intact. */
  protected setSlidingGridDoor(x: number, z: number, dir: Dir, open: boolean, level = 0): void {
    const plan = this.grid;
    const group = this.group;
    if (!plan) return;
    // An outstanding structural edit still requires the normal complete rebuild.
    if (!this.slidingGridDoors() || !group || !this.solid || this.builtVersion !== plan.version) {
      plan.door(x, z, dir, level, open);
      return;
    }
    const changed = changeSlidingDoor(
      plan,
      this.nav,
      { x, z, dir, level },
      open,
      (id) => {
        const index = this.slabs.findIndex((mesh) => mesh.userData.door === id);
        if (index < 0) return;
        const [leaf] = this.slabs.splice(index, 1);
        if (leaf) this.dropSlab(leaf);
      },
      (solid) => this.build(group, solid),
    );
    if (!changed) return;
    this.builtVersion = plan.version;
    this.physics?.syncColliders();
  }

  /** Das Material einer Sorte, einmal gebaut und danach geteilt. */
  private materialFor(kind: PlanSolidKind): THREE.Material {
    const had = this.palette.get(kind);
    if (had) return had;
    const color = this.tint()[kind] ?? GRID_COLORS[kind];
    const made =
      kind === 'glow'
        ? new THREE.MeshBasicMaterial({ color, toneMapped: false })
        : new THREE.MeshStandardMaterial({ color, ...GRID_FINISH[kind] });
    this.palette.set(kind, made);
    return made;
  }

  // --- der Bearbeitungsmodus ------------------------------------------------

  /**
   * **Ob an dieser Welt gebaut werden darf.**
   *
   * Voreingestellt: **nein**, und das ist die zweite Antwort auf dieselbe
   * Frage. Eine Weile hing der Bearbeitungsmodus an jeder Gitterwelt, erreicht
   * über eine Seite *Bauen* im Handgelenkmenü — Karte holen, Palette, Werkzeug,
   * Bausteine, Welt sichern. Das waren fünfzehn Zeilen, die in jeder Welt
   * zwischen allem anderen standen, und man kam beim Blättern durch sie
   * hindurch, wann immer man etwas anderes suchte.
   *
   * Sie ist wieder weg. Was vom Bauen bleibt, steht dort, wo es hingehört: im
   * **Bauplatz** (`editor/EditorWorld.ts`), wo Karte und Palette am Gürtel
   * hängen statt in einem Menü. Und was die meisten am Menüpunkt eigentlich
   * wollten — von oben sehen, wo man ist —, ist jetzt ein Werkzeug im Regal
   * (`portal/tools/MapTool.ts`) und in jeder Welt zu haben, nicht nur in einer
   * gerasterten.
   *
   * Wer Ja sagt, bekommt den Editor **und** seinen Speicher: Gebautes wird im
   * Browser abgelegt und beim nächsten Besuch wieder eingelesen
   * (`applyStored`). Beides gehört zusammen — eine Welt, die man nicht ändern
   * kann, hat auch keinen eigenen Stand aufzuheben.
   */
  protected editable(): boolean {
    return false;
  }

  /** Die Überschrift auf der Tafel am Modell. */
  protected editorTitle(): string {
    return 'Bauen';
  }

  /**
   * **Was mit der Kulisse passiert, während die Karte draußen ist.**
   *
   * **Die Welt tritt zur Seite**: Ihre Quader werden unsichtbar und kommen aus
   * der Physik heraus, und was darin herumliegt, hält still. Drei Gründe, und
   * jeder allein reicht:
   *
   * - Ein Grundriss vor der Nase, hinter dem eine Wand steht, ist einer, den
   *   man nicht sieht. Ein Zimmer ist ein geschlossener Kasten, und man steht
   *   darin.
   * - Wer eine Wand quer durch den Raum malt, in dem er steht, steckt sonst
   *   darin.
   * - Eine Wand, die man nicht sieht, aber gegen die man läuft, ist schlimmer
   *   als eine, die im Weg steht — also gehören Sichtbarkeit und Körper
   *   zusammen.
   *
   * Was bleibt, ist der Boden bis zum Horizont, der Himmel und alles, was
   * nicht aus dem Grundriss kommt. Wo man selbst dabei in der Welt steht, sagt
   * die Figur in der Miniatur.
   */
  protected editingChanged(on: boolean): void {
    this.setSolid(!on);
    // **Gespeichert wird beim Weglegen der Karte.** Das ist der Augenblick, in
    // dem jemand fertig ist — und der einzige, an dem ein Schreiben weder
    // sechzigmal in der Sekunde passiert noch zu spät kommt.
    if (!on) this.saveWorld(true);
  }

  /**
   * Was der Editor von dieser Welt braucht — jede Auskunft als Frage.
   *
   * Fragen statt Werte: Der Plan wird beim Zurücksetzen ausgetauscht, und ein
   * Wirt, der noch den alten hielte, baute an einem Grundriss weiter, den
   * niemand mehr sieht.
   */
  private editorHost(): EditorHost {
    return {
      root: () => this.root,
      plan: () => this.grid!,
      title: () => this.editorTitle(),
      ctx: () => this.context,
      beltSlot: (side: Handedness) => this.host?.beltSlot(side) ?? null,
      hipFree: (side: Handedness) => this.beltFree(side),
      say: (message: string) => this.announce(message),
      // Die einzige neue Zeile, die der Editor von der Welt braucht: die
      // Tastatur der Welt, für das Ziel eines Einbaus.
      ask: (options) => this.askText(options),
      goTo: (at) => {
        const ctx = this.context;
        if (ctx) this.movePlayerTo(ctx, _target.set(at.x, at.y, at.z));
      },
      planChanged: () => {
        // Nichts sofort: Der Umbau läuft einmal je Bild (`update`). Ein Strich
        // über zwanzig Kacheln wäre sonst zwanzig Neubauten in einem Bild.
      },
      editingChanged: (on: boolean) => this.editingChanged(on),
    };
  }

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // **Erst hier und nicht beim Bauen**: Die stille Vorschau (`preview()`)
    // baut dieselbe Welt ohne Spieler, und eine Palette, die dort mitten in
    // der Luft hinge, gehörte niemandem.
    if (!this.editable() || !this.grid) return;
    const editor = new WorldEditor(this.editorHost());
    editor.build();
    editor.attach(ctx);
    this.editor = editor;
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.editor?.update(ctx);
    this.stepBursts(dt);
    this.trackLevel(ctx);
    // **Erst die Einbauten, dann der Umbau.** Sie laufen auch, während gebaut
    // wird — ein Schild, das man eben gesetzt hat, soll etwas sagen, sobald
    // die Karte wieder an der Hüfte hängt.
    this.stepFixtures(dt, ctx);
    // Der Umbau läuft **einmal je Bild**, egal wie viele Kacheln in diesem Bild
    // gesetzt wurden. Ein gemalter Strich sind zwanzig Handgriffe und ein
    // Neubau, nicht zwanzig.
    //
    // Und er steht **außerhalb** des Editors: Auch „Importieren" und
    // „Verwerfen" tauschen den Plan aus, und die passieren im Menü, während
    // die Karte längst wieder an der Hüfte hängt.
    if (!this.grid || this.builtVersion === this.grid.version) return;
    this.rebuildGrid();
    this.editor?.refresh();
    // Wer eine Welt austauscht, während sie fest ist, hat sie damit auch
    // begehbar gemacht — dann muss die Navigationskarte nach.
    if (this.solid) this.rebake();
    this.planEdited();
  }

  /**
   * Am Plan hat sich etwas getan — höchstens einmal je Bild.
   *
   * Voreingestellt passiert nichts. Gespeichert wird beim **Weglegen der
   * Karte** und nicht bei jedem Pinselstrich: Ein gemalter Strich sind sechzig
   * Änderungen in der Sekunde, und der ganze Grundriss durch `JSON.stringify`
   * ist keine Zeile, die sechzigmal laufen darf.
   */
  protected planEdited(): void {}

  // --- speichern, laden, mitnehmen ------------------------------------------

  /**
   * **Was im Browser liegt, gewinnt** — und zwar ganz.
   *
   * Kein Verschmelzen mit `layout()`: Ein halb übernommener Umbau wäre eine
   * Welt, die weder die gebaute noch die gespeicherte ist, und man sähe es
   * erst an der Stelle, an der beide sich widersprechen. Was der Speicher
   * hergibt, ist die Welt; was er nicht hergibt, ist die aus `layout()`.
   */
  private applyStored(plan: GridPlan): void {
    if (!this.editable()) return;
    const saved = storedWorld(this.worldId());
    if (!saved) return;
    plan.restore(saved.graph, saved.blocks, saved.masses, saved.fixtures);
  }

  /** Den Stand in den Browser schreiben. Sagt, ob es geklappt hat. */
  protected saveWorld(quiet = false): boolean {
    const plan = this.grid;
    if (!plan) return false;
    const ok = keepWorld(this.worldId(), plan, { name: this.worldName() });
    if (!quiet) {
      this.announce(ok ? 'Welt gespeichert' : 'Kein Speicher da — nimm den Export');
    }
    return ok;
  }

  /**
   * **Zurück zur ausgelieferten Welt.**
   *
   * Der Speicher wird geleert *und* der Plan neu aus `layout()` gebaut — das
   * eine ohne das andere wäre eine Welt, die erst beim nächsten Laden wieder
   * die richtige ist, und bis dahin fragt man sich, ob der Knopf kaputt ist.
   */
  protected revertWorld(): void {
    const plan = this.grid;
    if (!plan) return;
    forgetWorld(this.worldId());
    const fresh = this.layout();
    this.planReady(fresh);
    plan.restore(fresh.bare(), fresh.blocks(), fresh.masses(), fresh.saveFixtures());
    this.announce(`Wieder ${this.originalName()}`);
  }

  /** Die Welt als Datei herunterladen. */
  protected exportWorld(): void {
    const plan = this.grid;
    if (!plan) return;
    try {
      const name = downloadWorld(plan, { world: this.worldId(), name: this.worldName() });
      this.announce(`Exportiert: ${name}`);
    } catch {
      this.announce('Export ging nicht — der Browser lässt keinen Download zu');
    }
  }

  /**
   * Eine Welt aus einer Datei holen.
   *
   * **Hier wird gemeldet, was schiefgeht**, anders als beim Speicher: Wer eine
   * Datei auswählt, hat eine Erwartung, und ein stilles Nichts wäre die
   * schlechteste aller Antworten.
   */
  protected importWorld(): void {
    pickWorld((result: WorldContents | Error) => {
      const plan = this.grid;
      if (!plan) return;
      if (result instanceof Error) {
        this.announce(
          result instanceof WorldFormatError ? result.message : 'Datei konnte nicht gelesen werden',
        );
        return;
      }
      plan.restore(result.graph, result.blocks, result.masses, result.fixtures);
      this.planLoaded(plan);
      this.saveWorld(true);
      this.announce(`Geladen: ${result.file.name ?? result.file.world ?? 'Welt'}`);
    });
  }

  /**
   * **Eine eigene Schublade fürs Aufheben.**
   *
   * Vier Zeilen einzeln im Weltmenü wären vier Zeilen, die man in der Brille
   * mit dem Daumen durchblättert, wann immer man etwas anderes sucht. Sie
   * stehen deshalb gebündelt, und zwar **oben**: Speichern und Mitnehmen ist
   * keine Fußnote unter den Werkzeugen.
   */
  private storeMenu(): MenuEntry {
    return {
      id: 'plan-store',
      label: 'Welt sichern',
      sub: hasStoredWorld(this.worldId())
        ? 'Gespeichert · exportieren, importieren, verwerfen'
        : 'Speichern, exportieren, importieren',
      icon: 'cube',
      accent: 0x5ee0a0,
      children: this.storeRows(),
    };
  }

  /** Die Zeilen im Menü, mit denen eine Welt aufgehoben und mitgenommen wird. */
  private storeRows(): MenuEntry[] {
    return [
      {
        id: 'plan-save',
        // **Nicht „Welt speichern".** So heißt schon der Knopf der Stoppuhr,
        // und der merkt sich etwas ganz anderes: wo die Kisten gerade liegen,
        // für diese Sitzung. Zwei Knöpfe mit demselben Namen und zwei
        // Bedeutungen sind einer zu viel.
        label: 'Im Browser speichern',
        sub: 'Für das nächste Mal auf diesem Gerät',
        icon: 'cube',
        accent: 0x5ee0a0,
        run: () => this.saveWorld(),
      },
      {
        id: 'plan-export',
        label: 'Exportieren',
        sub: `Als Datei herunterladen — Fassung ${WORLD_VERSION}`,
        icon: 'cube',
        accent: 0x39d0ff,
        run: () => this.exportWorld(),
      },
      {
        id: 'plan-import',
        label: 'Importieren',
        sub: 'Eine Weltdatei von der Festplatte laden',
        icon: 'cube',
        accent: 0x39d0ff,
        run: () => this.importWorld(),
      },
      {
        id: 'plan-revert',
        label: 'Gespeichertes verwerfen',
        sub: hasStoredWorld(this.worldId())
          ? `Wieder ${this.originalName()}`
          : `Nichts gespeichert — das hier ist schon ${this.originalName()}`,
        icon: 'cube',
        accent: 0x8892a6,
        run: () => this.revertWorld(),
      },
    ];
  }

  override dispose(ctx: WorldContext): void {
    // **Wer die Welt verlässt, während die Karte noch draußen ist**, hat nicht
    // aufgehört zu bauen — er ist woandershin gegangen. Ungefragt gespeichert
    // wird nur dieser Fall: Sonst bekäme jede Welt, die man einmal betreten
    // hat, einen gespeicherten Stand, den niemand angelegt hat.
    if (this.editor?.editing) this.saveWorld(true);
    for (const burst of this.bursts) burst.dispose();
    this.bursts.length = 0;
    this.rigLevel = 0;
    this.clearFixtures();
    this.editor?.dispose();
    this.editor = null;
    this.grid = null;
    this.group = null;
    this.slabs.length = 0;
    this.batches.length = 0;
    this.frozen.length = 0;
    this.palette.clear();
    this.builtVersion = -1;
    this.solid = true;
    super.dispose(ctx);
  }

  /**
   * **Im Menü steht nur noch das Aufheben.**
   *
   * Die Seite *Bauen* — Karte holen, Palette, Werkzeug, Bausteine — ist aus
   * dem Handgelenkmenü heraus (siehe `editable`). Übrig bleibt die Schublade
   * daneben, und die auch nur dort, wo überhaupt gebaut werden kann: Wer eine
   * Welt umbauen darf, muss sie aufheben, exportieren und wieder verwerfen
   * können. Wer nicht, hat nichts zu sichern.
   */
  override menu(): MenuEntry[] {
    if (!this.editor) return super.menu();
    return [this.storeMenu(), ...super.menu()];
  }

  // --- welche Etage von oben zu sehen ist -----------------------------------

  /**
   * **Auf welcher Ebene das Rig steht** — die Antwort für die Kamera von oben
   * (`core/types.World.viewLevel`, `core/cutaway.ts`).
   *
   * Die Kachel unter den Füßen weiß es (`NavGraph.at`, `keyLevel`), und der
   * Umweg über sie ist der Punkt: Nach der **Höhe** zu entscheiden hieße, dass
   * jeder, der auf einer Kiste steht, das Stockwerk über sich verliert.
   */
  private trackLevel(ctx: WorldContext): void {
    const graph = this.grid?.graph;
    if (!graph || graph.levels.length < 2) return;
    const feet = ctx.rig.getFloorY();
    const tile = graph.at(ctx.rig.position.x, ctx.rig.position.z, feet);
    const under = tile === NO_TILE ? this.rigLevel : keyLevel(tile);
    this.rigLevel = levelStep(this.rigLevel, under, feet, graph.levels);
  }

  viewLevel(): ViewLevel | null {
    const graph = this.grid?.graph;
    if (!graph) return null;
    return { level: this.rigLevel, floorY: graph.levelY(this.rigLevel) };
  }

  /**
   * Die Etagen kommen aus dem Plan.
   *
   * Der Graph führt sie ohnehin, und geraten würde beim Abtasten im Zweifel
   * eine zu viel — ein Vordach sieht von unten aus wie ein Boden.
   */
  protected override navLevels(): readonly number[] | null {
    return this.grid?.graph.levels ?? null;
  }

  protected override navReady(graph: NavGraph): void {
    super.navReady(graph);
    const plan = this.grid;
    if (!plan) return;
    // **Was im Plan steht, gewinnt.** Das Abtasten sieht nur Quader: Es findet
    // die Wand, aber nicht, dass sie aufgehen kann, und die Kachel, aber nicht,
    // dass eine Küchenzeile darauf steht. Beides steht im Grundriss, und
    // deshalb wird es hier darübergelegt statt neu erraten.
    for (const key of plan.graph.tileKeys()) {
      const facts = plan.graph.tile(key);
      if (!graph.has(key) || !facts) continue;
      graph.setTile(key, { ...facts });
    }
    // Wände kommen über Kachel und Richtung herüber und nicht über ihren
    // Schlüssel: `setWall` normiert ihn ohnehin, und aus einem Wandschlüssel
    // allein käme man nicht an die Kachel zurück, an der er hängt.
    for (const key of plan.graph.tileKeys()) {
      for (const dir of DIRS) {
        const facts = plan.graph.wall(key, dir);
        if (facts) graph.setWall(key, dir, { ...facts });
      }
    }
    for (const link of plan.graph.links()) graph.addLink({ ...link });
  }
}

/**
 * **Die Palette aller Gitterwelten.**
 *
 * Acht Töne, und mehr sollen es nicht werden. Eine Palette mit dreißig
 * Einträgen ist eine, in der jede Welt ihren eigenen Grauton erfindet — und
 * dann sieht man in der Brille sofort, dass zwei Räume aus zwei Sitzungen
 * stammen.
 */
export const GRID_COLORS: Readonly<Record<PlanSolidKind, number>> = {
  floor: 0x6f7789,
  wall: 0x9aa0ad,
  door: 0x8a6440,
  /** Hell, damit man ohne Erklärung sieht, wo ein Portal hält. */
  panel: 0xf2f4f8,
  wood: 0x8a6440,
  steel: 0x9aa6bd,
  stone: 0xb0a893,
  glow: 0xffe7c0,
};

/** Wie eine Sorte das Licht nimmt — matt, seidig oder metallisch. */
const GRID_FINISH: Readonly<Record<PlanSolidKind, { roughness?: number; metalness?: number }>> = {
  floor: { roughness: 0.95, metalness: 0.02 },
  wall: { roughness: 0.9 },
  door: { roughness: 0.8 },
  panel: { roughness: 0.6, metalness: 0.05 },
  wood: { roughness: 0.85 },
  steel: { roughness: 0.4, metalness: 0.6 },
  stone: { roughness: 0.92 },
  glow: {},
};

/**
 * Wie viele Wolken gleichzeitig laufen dürfen.
 *
 * Dieselbe Überlegung wie im Effektlabor (`EffectsWorld.MAX_BURSTS`): Mehr sind
 * keine Wolken mehr, sondern Nebel — und vier Emitter in einer Ecke schaffen
 * das schneller, als man denkt.
 */
const MAX_BURSTS = 8;

const _target = new THREE.Vector3();
const _feet = new THREE.Vector3();
const _spot = new THREE.Vector3();

/**
 * **Ein gebauter Einbau**: seine Art, sein Zustand, sein Bild, seine Körper —
 * und die drei Marken, die genau ein Bild lang gelten.
 */
interface FixtureRun {
  place: FixturePlacement;
  kind: FixtureKind<unknown>;
  state: unknown;
  view: FixtureView;
  /** Ob seine Quader gerade stehen (`solid`). */
  hard: boolean;
  meshes: THREE.Object3D[];
  used: boolean;
  hit: boolean;
  triggered: boolean;
}

/**
 * Ein Name wird ein Geräusch (`core/Audio.ts`).
 *
 * Die Übersetzung steht hier und nicht in den Arten: Wie ein Schalter klingt,
 * ist eine Entscheidung fürs ganze Haus, und eine Tür, die ihre eigenen Töne
 * mitbrächte, klänge nach zwei Wochen anders als alles andere.
 */
function playFixtureSound(name: FixtureSound): void {
  switch (name) {
    case 'switch-on':
      playSwitch(true);
      break;
    case 'switch-off':
      playSwitch(false);
      break;
    case 'slam':
      playSlam();
      break;
    case 'pop':
      playPop();
      break;
    case 'pick':
      playPick(true);
      break;
    case 'drop':
      playPick(false);
      break;
    case 'empty':
      playEmpty();
      break;
  }
}
