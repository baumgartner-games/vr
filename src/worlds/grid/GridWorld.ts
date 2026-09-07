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
import { DIRS } from '../nav/navTile';
import type { GridPlan } from './gridPlan';
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
 * **Und seit der zweiten Fassung: Jede Gitterwelt lässt sich umbauen, während
 * man darin steht** (`editor/WorldEditor.ts`). Das war vorher eine eigene Welt
 * — der Bauplatz —, und das war die Antwort auf die falsche Frage. Die Frage
 * lautet nicht „wo baue ich ein Level?", sondern „warum kann ich das Haus,
 * in dem ich gerade stehe, nicht umbauen?". Wer im Dunkelhaus merkt, dass der
 * Gang zu eng ist, will ihn *dort* verbreitern. Es kostet eine Zeile: Der
 * Grundriss liegt ohnehin als `GridPlan` da, und der Editor kann nichts
 * anderes, als daran zu arbeiten.
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
  /** Ob die Quader gerade auch Körper in der Physik haben. */
  private solid = true;
  /** Was beim Bauen eingefroren wurde — und deshalb hinterher aufzutauen ist. */
  private readonly frozen: PhysicsBody[] = [];

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

  protected override buildEnvironment(): void {
    const plan = this.layout();
    this.grid = plan;
    this.planReady(plan);
    this.applyStored(plan);

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
    for (const mesh of this.slabs) this.dropSlab(mesh);
    this.slabs.length = 0;
    for (const solid of plan.solids()) this.build(group, solid);
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
    if (solid.door) mesh.userData.door = solid.door;
    this.slabs.push(mesh);
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
   * Voreingestellt: ja. Eine Gitterwelt *ist* ein Grundriss, und einen
   * Grundriss, den man ansehen, aber nicht ändern darf, hätte niemand gebaut.
   * Wer trotzdem Nein sagt, hat einen Grund, der in seiner Welt steht — eine
   * Rennstrecke etwa, deren Kurven an Zahlen hängen, die kein Kacheleditor
   * kennt.
   */
  protected editable(): boolean {
    return true;
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

  /** Der Bearbeitungsmodus, solange die Welt offen ist. */
  protected get planEditor(): WorldEditor | null {
    return this.editor;
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
    plan.restore(saved.graph, saved.blocks, saved.masses);
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
    plan.restore(fresh.bare(), fresh.blocks(), fresh.masses());
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
      plan.restore(result.graph, result.blocks, result.masses);
      this.saveWorld(true);
      this.announce(`Geladen: ${result.file.name ?? result.file.world ?? 'Welt'}`);
    });
  }

  /**
   * **Eine eigene Schublade fürs Aufheben.**
   *
   * Vier Zeilen mehr in „Bauen" wären fünfzehn Zeilen in einem Menü, das man
   * in der Brille mit dem Daumen durchblättert — und die vier hätte man immer
   * dann vor sich, wenn man gerade eine Wand sucht. Sie stehen deshalb
   * gebündelt, und zwar **oben**, gleich hinter der Karte: Speichern und
   * Mitnehmen ist keine Fußnote unter den Werkzeugen.
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
    this.editor?.dispose();
    this.editor = null;
    this.grid = null;
    this.group = null;
    this.slabs.length = 0;
    this.frozen.length = 0;
    this.palette.clear();
    this.builtVersion = -1;
    this.solid = true;
    super.dispose(ctx);
  }

  /** „Bauen": erst die Karte, dann das Sichern, dann die Werkzeuge. */
  private buildRows(editor: WorldEditor): MenuEntry[] {
    const rows = editor.menu();
    rows.splice(1, 0, this.storeMenu());
    return rows;
  }

  override menu(): MenuEntry[] {
    const editor = this.editor;
    if (!editor) return super.menu();
    return [
      {
        id: 'plan',
        label: 'Bauen',
        sub: 'Karte, Palette und Werkzeug',
        icon: 'cube',
        accent: 0x39d0ff,
        children: this.buildRows(editor),
      },
      ...super.menu(),
    ];
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

const _target = new THREE.Vector3();
