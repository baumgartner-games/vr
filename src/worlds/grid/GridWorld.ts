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
import {
  DIRS,
  NO_TILE,
  TILE,
  keyLevel,
  tileCentreX,
  tileCentreZ,
  tileIndexAt,
  tileKey,
  type Dir,
  type TileKey,
} from '../nav/navTile';
import { blockModel, blockModelSpot, type BlockKind } from './blocks';
import { changeSlidingDoor } from './slidingDoor';
import {
  GHOST_SHOULDER,
  blocksView,
  wallsHiding,
  type GhostCandidate,
  type GhostPoint,
} from './wallGhost';
import { ModelGhosts } from './modelGhost';
import { GhostBoxView, type GhostBoxLine } from './ghostView';
import { turnedHalf, yawOf } from '../portal/gridSnap';
import { batchKey, joinsBatch, joinsGhostBatch } from './gridBatch';
import { fixtureTile, type BlockPlacement, type GridPlan } from './gridPlan';
import { knownKind } from './fixtures/kinds';
import { EFFECT_LIFT } from './fixtures/index';
import { signRows } from './fixtures/signRows';
import { SIGN } from './fixtures/sign';
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
import { canLoadModels } from '../../core/chefFit';
import { denyOutline } from '../../core/outlineShell';
import { graphics } from '../../core/graphicsSettings';
import { playEmpty, playPick, playPop, playSlam, playSwitch } from '../../core/Audio';
import { disposeShapes } from '../shared/environment';
import { PlateFloor, type PlateSeat } from '../shared/plateFloor';
import { floorPlateModels, floorPlateSpots, type PlateTile } from '../shared/plateField';
import {
  addFloorTops,
  floorTopUnder,
  uncoveredSeats,
  type Cover,
  type CoverTile,
  type FloorTops,
} from '../shared/floorCover';
import { ConstructRoom, type ConstructItem, type ConstructOptions } from '../shared/construct';
import { WardrobeRack, type RackPiece } from '../shared/wardrobeRack';
import { appearance, saveAppearance, type Appearance } from '../../core/appearance';
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
  /**
   * **Die Quader, die in ein Bündel dürfen** — gefüllt beim Bauen, geleert beim
   * Umbau (`gridBatch.joinsBatch`).
   *
   * Eine eigene Liste neben `slabs` und keine Marke am Mesh: Die Entscheidung
   * fällt am `PlanSolid`, wo Portalfähigkeit und Türblatt stehen, und sie
   * nachträglich aus einem fertigen Mesh zurückzulesen hieße, sie ein zweites
   * Mal zu treffen.
   */
  private readonly batchable: THREE.Mesh[] = [];
  /**
   * **Die Quader, die nur aus den Augen in ein Bündel dürfen** — die Wände
   * (`gridBatch.joinsGhostBatch`).
   *
   * Sie stehen neben `batchable` und nicht darin, weil sie ein zweites Bündel
   * bekommen, das eine Ansicht lang verschwindet: Von oben wird geghostet, und
   * dann müssen wieder die einzelnen Quader dastehen.
   */
  private readonly ghostable: THREE.Mesh[] = [];
  /** Die Bündel daraus — sichtbar aus den Augen, unsichtbar von oben. */
  private readonly ghostBatches: THREE.InstancedMesh[] = [];
  /**
   * Und die Quader, die wirklich in einem davon gelandet sind.
   *
   * Nicht dasselbe wie `ghostable`: Wer allein in seiner Gruppe steht, bekommt
   * kein Bündel und bleibt einfach sichtbar — und ein Türblatt, das eine
   * Schiebetür nach dem Bündeln nachbaut, darf hier gar nicht erst auftauchen.
   * Was hier steht, wird umgeschaltet; alles andere bleibt, wie es ist.
   */
  private readonly ghostBatched: THREE.Mesh[] = [];
  /**
   * **Die Quader, deren Matrizen stillgelegt werden** — alles, was in irgendein
   * Bündel gewandert ist, aus beiden Listen oben.
   *
   * Der Grund steht in `freezeBatched()`. Die Liste selbst ist nötig, weil das
   * Stilllegen **nach** dem Bündeln kommen muss und nicht mittendrin: Erst
   * müssen die Weltmatrizen einmal richtig gerechnet sein, und dafür muss die
   * Gruppe da hängen, wo sie hingehört.
   */
  private readonly batched: THREE.Mesh[] = [];
  /**
   * **Was verschwindet, sobald die Platten darüber da sind** — nach Warteliste
   * sortiert (`shared/plateField.floorPlateModels`, `gridBatch.batchKey`).
   *
   * Der Schlüssel ist die sortierte Liste der Dateien, auf die die Dinge darin
   * warten; drin liegen die **Bündel** und die einzeln gebliebenen Quader. Dass
   * beides in derselben Liste steht, ist Absicht: Ein Quader, der in ein
   * Bündel gewandert ist, ist ohnehin schon unsichtbar, und ein zweites Mal
   * unsichtbar zu werden kostet nichts — die Alternative wäre eine zweite
   * Liste, die genau einmal von der ersten abweicht und dann eine Masse
   * stehen lässt, die niemand mehr wegbekommt.
   */
  private readonly plated = new Map<string, THREE.Object3D[]>();
  /** Welche Plattendateien wirklich angekommen sind — erst dann wird versteckt. */
  private readonly plateReady = new Set<string>();
  /** Die Plattenböden selbst (`shared/plateFloor.ts`) — beim Umbau wieder weg. */
  private readonly platesBuilt: PlateFloor[] = [];
  /** Und je Plattenboden alle seine Sitze — auch die, die gerade gedeckt sind. */
  private readonly plateSeats = new Map<PlateFloor, PlateSeat[]>();
  /**
   * **Wie hoch der Boden je Kachel liegt** (`shared/floorCover.ts`) — aus
   * jedem Bodenquader des Grundrisses, auch denen ohne Platten (die Küche).
   * Daran richtet sich ein Bodenstück aus dem Regal aus (`floorTopAt`).
   */
  private readonly floorTops: FloorTops = new Map();
  /** **Was die Bodenstücke aus dem Regal gerade decken** (`coverFloor`). */
  private readonly floorCovers = new Map<PhysicsBody, Cover>();
  /** Und die Bodenquader, aus denen ihre Kacheln gerechnet werden. */
  private readonly plateSolids: PlanSolid[] = [];
  /**
   * **Die Entscheidung als Funktion**, einmal gebunden statt je Aufruf neu.
   *
   * `floorPlate` ist eine Methode, und eine Methode, die man aus ihrem Objekt
   * heraushebt, verliert ihr `this` — der Linter dieses Projekts hält genau
   * danach Ausschau (`AGENTS.md`, _Linter und Formatierer_). Sie läuft
   * achttausendmal je Umbau durch `floorPlateSpots`, also wird sie einmal
   * gebunden und nicht in jeder Schleife neu erzeugt.
   */
  private readonly plateChoice = (tile: PlateTile): string | null => this.floorPlate(tile);
  /**
   * **Die Quader, an deren Stelle ein Modell aus dem Regal tritt** — je Möbel
   * eine Liste, unter Sorte und Kachel abgelegt (`blockSlabKey`).
   *
   * Sie steht hier, weil ein Quader nur weiß, aus **welchem** Möbel er kommt
   * (`solids.PlanSolid.block`) und nicht aus welchem einzelnen: Aus sechs
   * Brettern wieder ein Regal zu machen ist eine Rechnung über Kachel und
   * Etage, und die läuft beim Bauen einmal statt beim Eintreffen jeder Datei
   * noch einmal.
   */
  private readonly modelledSlabs = new Map<string, THREE.Mesh[]>();
  /** Die Modelle selbst — was beim nächsten Umbau wieder abzuhängen ist. */
  private readonly blockModels: THREE.Object3D[] = [];
  /**
   * **Ihre Materialien** — sie gehören den Kopien allein und müssen weg.
   *
   * Dieselbe Zusage und derselbe Grund wie bei der Druckplatte
   * (`fixtures/plate.ts`, `modelSkins`): Die **Geometrie** einer Regalkopie
   * gehört der Vorlage im Speicher (`userData.sharedAssets`) und wird nie
   * freigegeben, die Materialien klont `core/kaykitModel.copyOf` je Kopie.
   * Wer sie liegen ließe, sammelte hier besonders schnell — im Baumodus baut
   * diese Welt ihr Gitter dutzendfach je Minute neu.
   */
  private readonly blockModelSkins: THREE.Material[] = [];
  /**
   * **Die Runde, für die ein Modell bestellt wurde.**
   *
   * Zwischen Bestellung und Ankunft liegt die Leitung, und in der Zeit kann
   * jemand zweimal umgebaut haben. Eine Kopie aus einer vergangenen Runde
   * gehört an keine Gruppe mehr — sie gibt ihre Materialien zurück und
   * verschwindet, statt als zweites Regal auf derselben Kachel zu stehen.
   */
  private blockModelRound = 0;
  /** Ob gerade die Bündel zu sehen sind (aus den Augen) oder die Quader (von oben). */
  private ghostBatchView = true;
  /** Ob zuletzt von oben geschaut wurde — ein Umbau muss die Ansicht wiederherstellen. */
  private topDownView = false;
  /** Ob die Quader gerade auch Körper in der Physik haben. */
  private solid = true;
  /** Was beim Bauen eingefroren wurde — und deshalb hinterher aufzutauen ist. */
  private readonly frozen: PhysicsBody[] = [];
  /** Die gebauten Einbauten — Zustand, Bild und Körper (`fixtures/index.ts`). */
  private readonly fixtures: FixtureRun[] = [];
  /** Die laufenden Wolken (`effects/Burst.ts`) — was ein `effect`-Ereignis macht. */
  private readonly bursts: Burst[] = [];
  /**
   * **Der Aushang, der gerade aufgeschlagen ist** (`fixtures/signRows.ts`).
   *
   * Er hängt als Seite im Weltmenü, und zwar als **eine** Seite: Es wird immer
   * das gelesen, was zuletzt benutzt wurde. Zwanzig Schilder als zwanzig
   * stehende Menüzeilen wären ein Menü, in dem man das Spiel nicht mehr
   * findet — und ein Aushang, den man nicht aufgeschlagen hat, will auch
   * niemand in der Liste haben.
   */
  private reading: { title: string; rows: MenuEntry[] } | null = null;
  /**
   * Ob die Seite dazu im **nächsten** Bild aufzuschlagen ist.
   *
   * Ein Bild später und nicht sofort, und das ist kein Schönheitsfehler:
   * `WorldContext.refreshWorldMenu` merkt sich nur, dass der Baum neu zu bauen
   * ist, und baut ihn am Ende des Bildes (`App.step`, `menuDirty`). Wer im
   * selben Atemzug `openSubmenu` ruft, sucht eine Seite, die es noch gar nicht
   * gibt — das Menü blieb dann einfach zu, und ein Schild, das man benutzt und
   * das nichts tut, sieht aus wie ein kaputtes Schild.
   */
  private openReading = false;
  /** Je Etage ein Netz aus Kachelkanten (`buildGridLines`). */
  private readonly gridLines: THREE.LineSegments[] = [];
  /** Ihr Material — eines für alle, und über den Umbau hinweg dasselbe. */
  private gridLineSkin: THREE.Material | null = null;
  /**
   * **Was der Kamera die Figur verdecken kann** — Wände, Massen, Bausteine
   * (`wallGhost.ts`).
   *
   * Eine eigene Liste neben `slabs`, weil sie eine andere Frage beantwortet:
   * Dort steht **jeder** Quader, hier nur der, der überhaupt etwas verdeckt
   * (kein Boden, höher als ein Knie) — und daneben sein Kasten in Metern,
   * damit die Auswahl nicht jedes Bild aus der Geometrie zurückgerechnet
   * werden muss.
   */
  private readonly wallGhosts: GhostSlab[] = [];
  /** Die zweite Palette: dieselben Farben, durchsichtig (`ghostFor`). */
  private readonly ghostPalette = new Map<PlanSolidKind, THREE.Material>();
  /**
   * **Was aus dem Regal hingestellt ist, wird genauso durchsichtig**
   * (`modelGhost.ts`) — eine Wand aus dem Regal ist kein Quader aus dem
   * Grundriss und stand deshalb bisher als einzige von oben im Weg.
   */
  private readonly modelGhosts = new ModelGhosts(GHOST_OPACITY);
  /** Die hingestellten Modelle dieses Bildes, als Kandidaten (`stepWallGhosts`). */
  private readonly modelCandidates: ModelCandidate[] = [];
  private readonly placedScratch: PhysicsBody[] = [];
  /** Die Werkstattansicht des Ghostings (`ghostView.ts`), ab dem ersten Anschalten. */
  private ghostBoxView: GhostBoxView | null = null;
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
   * **Der Konstrukt-Raum dieser Welt** (`shared/construct.ts`) — und es gibt
   * genau einen.
   *
   * Er hängt an der Welt und nicht an dem, was ihn aufmacht, weil er die Welt
   * ausblendet: Zwei davon gleichzeitig hießen zwei Meinungen darüber, was
   * gerade sichtbar ist, und die zweite gewönne beim Verlassen. Der
   * Kleiderschrank macht ihn auf (`openWardrobe`), die Küche über ihren
   * Rechner (`test/zones/kitchen.ts`) — und weil beide durch denselben Raum
   * gehen, kann nie eines von beidem das andere überschreiben.
   *
   * Er entsteht erst beim ersten Öffnen: Eine Welt, in der niemand vor einen
   * Schrank tritt, baut keinen Boden aus zweihundert Kacheln.
   */
  private construct: ConstructRoom | null = null;

  /** Das Regal dazu — die Kleidungsstücke, die im Schrank-Konstrukt stehen. */
  private rack: WardrobeRack | null = null;

  /**
   * **Wo die Figur stand, als sie das Konstrukt betrat** — Weltmeter, Fußhöhe.
   * `null` heißt: Es ist gerade keines offen.
   *
   * Das ist die Zusage, auf der der ganze Raum beruht: **Der Körper bleibt in
   * der alten Welt stehen.** Im Konstrukt darf man herumgehen — es ist ein
   * eigener Raum, und ein Regal, um das man nicht herumgehen kann, ist ein
   * Schaufenster —, aber dieses Gehen gehört dem weißen Raum und nicht der
   * Küche darunter. Beim Verlassen kommt die Figur deshalb genau hierher
   * zurück (`syncConstructBody`), und was sie mitbringt, ist nur ihre
   * Blickrichtung.
   *
   * **Versucht wurde es vorher andersherum**, mit `PlayerRig.locked`: Wer
   * drinsteht, soll sich gar nicht erst bewegen können. Das hielt aber nur in
   * der Brille — `locked` schaltet dort den Stock, den Sprung und die Drehung
   * ab (`PlayerRig.update`), und am Bildschirm wie am Telefon läuft die Figur
   * über `FlatControls.setIntent` daran vorbei. Man lief also doch, und zwar
   * durch eine Welt, die man nicht mehr sah: in die Küchenzeile, die als
   * unsichtbare Wand im Weg stand, und beim Verlassen stand man woanders. Eine
   * zweite Sperre in der Eingabeschicht hätte das geflickt; eine gemerkte
   * Stelle plus ein kollisionsfreier Körper (`PhysicsLocomotion.ghost`) macht
   * daraus die Sache, die gemeint war.
   */
  private constructHome: THREE.Vector3 | null = null;

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
   * **Welche Platte aus dem Regal auf einer Bodenkachel liegt** — `null` heißt:
   * keine, und das ist die Vorgabe.
   *
   * Der Haken, an dem der ganze Plattenboden hängt (`shared/plateFloor.ts`),
   * und er ist bewusst leer voreingestellt: Ein Zimmer im Bauplatz, das
   * Portal-Labor, das Dunkelhaus — die stehen auf gebauten Quadern und sollen
   * sich nicht ändern, weil eine andere Welt einen Steinboden bestellt hat.
   * Wer Platten will, sagt es (`worlds/test/TestWorld.ts` →
   * `worlds/test/floorPlate.ts`).
   *
   * Gefragt wird je **Kachel** und nicht je Quader: Die Masse des Geländes ist
   * ein einziger Quader über 77 × 105 Kacheln, und mitten darin liegt eine
   * Küche, die keine Platte will.
   */
  protected floorPlate(_tile: PlateTile): string | null {
    return null;
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
    this.dropBlockModels();
    this.dropFloorPlates();
    this.dropGridLines();
    // Die Quader sind gleich alle weg; was hier stehen bliebe, wäre eine Wand,
    // die es nicht mehr gibt und die trotzdem durchsichtig wird.
    this.wallGhosts.length = 0;
    for (const batch of this.batches) {
      batch.geometry.dispose();
      batch.removeFromParent();
    }
    this.batches.length = 0;
    for (const batch of this.ghostBatches) {
      batch.geometry.dispose();
      batch.removeFromParent();
    }
    this.ghostBatches.length = 0;
    this.ghostBatched.length = 0;
    this.batched.length = 0;
    for (const mesh of this.slabs) this.dropSlab(mesh);
    this.slabs.length = 0;
    this.batchable.length = 0;
    this.ghostable.length = 0;
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
    // **Gebündelt wird immer** — die Frage ist nur, in welches Bündel. Zuerst
    // das dauerhafte: alles, was ohnehin nie ghosten kann (`gridBatch.ts`). Wer
    // `batchGridGeometry()` anschaltet, wirft stattdessen jeden Quader hinein
    // und verzichtet dafür auf anhaftende Portale und einzeln schaltbare
    // Türblätter.
    const all = this.batchGridGeometry();
    this.buildBatches(group, all ? this.slabs : this.batchable, this.batches, false);
    // **Und die Wände dazu, für die Ansicht, in der nicht geghostet wird**
    // (`gridBatch.joinsGhostBatch`). Wer ohnehin alles bündelt, hat sie schon
    // oben mitgenommen.
    if (!all) {
      this.buildBatches(group, this.ghostable, this.ghostBatches, true);
      this.ghostBatchView = true;
      this.showGhostBatches(!this.topDownView);
    }
    // **Und jetzt stehen die Gebündelten still** — beide Sorten zusammen, erst
    // nachdem beide Bündel gebaut sind (`freezeBatched`).
    this.freezeBatched(group);
    // **Nach den Bausteinen**, und zwar auch nach dem Zusammenfassen: Ein
    // Einbau hat ein eigenes Bild und eigene Körper, und in eine
    // `InstancedMesh` gehört er nicht — er bewegt sich.
    this.buildFixtures();
    // **Und zuletzt die Möbel, die es im Regal schon gibt** — sie kommen über
    // die Leitung und damit erst lange nach diesem Bild (`buildBlockModels`).
    this.buildBlockModels();
    // **Und der Boden bekommt Platten**, aus demselben Regal und mit derselben
    // Verzögerung (`buildFloorPlates`).
    this.buildFloorPlates();
    this.buildGridLines();
  }

  /**
   * **Aus vielen gleichen Kästen werden wenige Zeichenaufrufe.**
   *
   * Zusammengefasst wird je Material **und** je Ebene (`gridBatch.batchKey`):
   * Ein Bündel über zwei Stockwerke ließe sich von oben nicht mehr aufschneiden
   * — es ist ein Objekt, und ein Objekt hat eine Sichtbarkeit.
   *
   * Die einzelnen Quader bleiben **stehen und werden nur unsichtbar**. Das ist
   * der Punkt, an dem diese Lösung billig ist: Ihre Körper in der Physik, ihr
   * Eintrag in `solids` und damit jeder Strahl, der auf sie zeigt, arbeiten
   * unverändert weiter — three prüft beim Abtasten keine Sichtbarkeit, beim
   * Zeichnen dagegen schon. Ein Saum bekommen sie keinen mehr (`denyOutline`):
   * Im Comic hängt der am sichtbaren Bündel, und tausend unsichtbare Hüllen
   * daneben wären tausend Hüllen, die niemand sieht.
   *
   * `returnable` ist die Ausnahme davon und meint die **Wände**: Sie kommen von
   * oben wieder einzeln zum Vorschein (`showGhostBatches`), also werden sie
   * gemerkt statt vergessen — und ihren Saum behalten sie, weil sie ihn dann
   * brauchen. Er hängt als Kind an ihnen und ist unsichtbar, solange sie es
   * sind.
   */
  private buildBatches(
    group: THREE.Group,
    meshes: readonly THREE.Object3D[],
    into: THREE.InstancedMesh[],
    returnable: boolean,
  ): void {
    const byKey = new Map<
      string,
      {
        material: THREE.Material;
        level: number | null;
        plates: string;
        meshes: THREE.Mesh<THREE.BoxGeometry>[];
      }
    >();
    for (const object of meshes) {
      const mesh = object as THREE.Mesh<THREE.BoxGeometry>;
      if (!mesh.visible || Array.isArray(mesh.material)) continue;
      const level = typeof mesh.userData.level === 'number' ? mesh.userData.level : null;
      // **Und auf welche Platten dieser Quader wartet** (`gridBatch.batchKey`):
      // Was verschwinden soll, sobald ein Modell da ist, gehört nicht mit dem
      // in ein Bündel, was stehen bleibt.
      const plates = typeof mesh.userData.plates === 'string' ? mesh.userData.plates : '';
      const key = batchKey(mesh.material.uuid, level, plates);
      const bundle = byKey.get(key) ?? { material: mesh.material, level, plates, meshes: [] };
      bundle.meshes.push(mesh);
      byKey.set(key, bundle);
    }

    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    for (const { material, level, plates, meshes: taken } of byKey.values()) {
      // Einer allein ist kein Bündel: Ein `InstancedMesh` mit genau einem
      // Eintrag kostet denselben Zeichenaufruf und eine Geometrie mehr.
      if (taken.length < 2) continue;
      const batch = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, taken.length);
      batch.name = 'grid-batch';
      if (level !== null) batch.userData.level = level;
      // Das Bündel wartet auf dasselbe wie seine Quader — und geht mit ihnen
      // zusammen aus dem Bild (`plateArrived`).
      if (plates) this.rememberPlated(plates, batch);
      taken.forEach((mesh, i) => {
        const p = mesh.geometry.parameters;
        scale.set(p.width, p.height, p.depth);
        matrix.compose(mesh.position, mesh.quaternion, scale);
        batch.setMatrixAt(i, matrix);
        mesh.visible = false;
        // Gemerkt für `freezeBatched()`: Was hier in ein Bündel gegangen ist,
        // steht von jetzt an still und braucht seine Matrix nie wieder neu.
        this.batched.push(mesh);
        // **Ein Quader, der wiederkommt, behält seinen Saum.** Im Comic hängt
        // die Kontur am sichtbaren Ding; wer von oben wieder einzeln dasteht,
        // braucht dort eine — und solange er unsichtbar ist, kostet sie nichts,
        // weil sie sein Kind ist (`core/outlineShell.ts`).
        if (returnable) this.ghostBatched.push(mesh);
        else denyOutline(mesh);
      });
      batch.computeBoundingSphere();
      group.add(batch);
      into.push(batch);
    }
  }

  /**
   * **Die gebündelten Quader stehen still — also soll three sie auch nicht
   * jedes Bild neu ausrechnen.**
   *
   * Ein Quader, der in ein Bündel gewandert ist, wird unsichtbar und bleibt im
   * Baum stehen (`buildBatches`, mit gutem Grund: seine Physik, sein Eintrag in
   * `solids` und jeder Strahl, der auf ihn zeigt, arbeiten unverändert weiter).
   * Beim **Zeichnen** kostet er dadurch nichts — `projectObject` kehrt an einem
   * unsichtbaren Objekt sofort um. Beim **Matrizenziehen** kostet er trotzdem:
   * `Object3D.updateMatrixWorld` fragt nicht nach Sichtbarkeit, es läuft durch
   * jedes Kind und rechnet für jedes `updateMatrix()` und eine
   * Matrixmultiplikation.
   *
   * In der Testwelt sind das **1 358 unsichtbare Quader**, und der Durchlauf
   * läuft **dreimal je Bild** (Hauptdurchgang, Spiegeldurchgang, und einer
   * davor). Gemessen: `scene.updateMatrixWorld()` kostete dort 1,09 ms je
   * Aufruf gegen 0,046 ms im Hub — das meiste davon für Quader, die niemand
   * sieht und die sich nie bewegen.
   *
   * Beides abgeschaltet, `matrixAutoUpdate` **und** `matrixWorldAutoUpdate`:
   * Das erste spart das Neuzusammensetzen aus Position, Drehung und Größe, das
   * zweite die Multiplikation mit der Elternmatrix. Vorher wird einmal
   * erzwungen gerechnet (`group.updateMatrixWorld(true)`) — genau diese
   * Reihenfolge ist der Punkt: Wer erst stilllegt und dann rechnen ließe, hätte
   * Quader mit einer Weltmatrix aus dem Nichts.
   *
   * **Und warum das gefahrlos ist:** Diese Quader bewegen sich nach dem Bauen
   * nie wieder. Was mit ihnen geschieht, ist ausschließlich ein Umschalten von
   * `visible` (`showGhostBatches`, wenn die Ansicht von oben die Wände wieder
   * einzeln hinstellt) und ein Materialtausch (`setGhost`, das Durchsichtigwerden
   * einer Wand) — beides rührt keine Matrix an. Wer einen Quader wirklich
   * versetzt, versetzt ihn nicht: Ein geänderter Plan baut das ganze Gitter neu
   * (`rebuildGrid`), und dabei entstehen frische Meshes, die hier wieder
   * durchlaufen. Türblätter und Portalflächen kommen ohnehin nie in ein Bündel
   * (`gridBatch.joinsBatch`, `joinsGhostBatch`) und bleiben deshalb beweglich.
   *
   * Nachträglich angehängte Kinder — die Konturhülle des Comics
   * (`core/outlineShell.ts`) — bleiben ebenfalls richtig: Sie tragen ihre
   * eigenen Schalter, und die Elternmatrix, mit der sie rechnen, steht ja
   * korrekt und für immer fest.
   */
  private freezeBatched(group: THREE.Group): void {
    if (this.batched.length === 0) return;
    group.updateMatrixWorld(true);
    for (const mesh of this.batched) {
      mesh.matrixAutoUpdate = false;
      mesh.matrixWorldAutoUpdate = false;
    }
  }

  /**
   * **Welche Hälfte der Wände gerade zu sehen ist** — das Bündel oder die
   * Quader.
   *
   * Umgeschaltet wird an genau einer Frage (`ctx.topDown`), und zwar an
   * derselben, die auch über das Ghosting entscheidet: Aus den Augen wird nie
   * eine Wand durchsichtig, also darf dort ein Bündel stehen; von oben wird
   * geghostet, also stehen dort die einzelnen Quader.
   *
   * Nur beim **Wechsel**, nicht jedes Bild: Zweihundert `visible` neu zu setzen
   * ist billig, aber zweihundertmal je Bild dasselbe zu setzen ist Arbeit ohne
   * Ergebnis.
   */
  private showGhostBatches(batched: boolean): void {
    if (this.ghostBatchView === batched || this.ghostBatches.length === 0) return;
    this.ghostBatchView = batched;
    for (const batch of this.ghostBatches) batch.visible = batched;
    for (const mesh of this.ghostBatched) mesh.visible = !batched;
  }

  // --- die Gitterlinien -----------------------------------------------------

  /**
   * **Die Kanten der Bodenkacheln, je Etage ein Netz** (_Menü → Grafik →
   * Gitterlinien_, `core/graphicsSettings.ts`).
   *
   * Seit eine Kachel einen Meter misst, baut man auf diesem Gitter feine
   * Sachen — eine Küche, in der die Spüle neben dem Herd steht. Dabei ist die
   * Frage „wo hört die Kachel auf" ständig da, und ohne Antwort beantwortet
   * man sie durch Probieren. Ein halbtransparentes Netz beantwortet sie in
   * einem Bild.
   *
   * Vier Entscheidungen stecken darin:
   *
   * - **Je Etage eines**, mit `userData.level`. Damit nimmt das Aufschneiden
   *   sie mit (`core/cutaway.ts`), und sichtbar ist ohnehin immer nur die
   *   Ebene, auf der das Rig steht (`showGridLines`).
   * - **Einen Zentimeter über dem Boden**, und zwar über dem der jeweiligen
   *   Kachel samt ihrer Anhebung (`rise`): Eine Linie im Boden flackert
   *   (Z-Fighting), eine über dem Podest liegt auf dem Podest.
   * - **Nur die Kanten, die es gibt.** Gezeichnet wird je Kachel ihr Quadrat;
   *   dass benachbarte Kacheln sich eine Kante teilen, kostet eine doppelte
   *   Linie und spart die Buchhaltung, welche schon da war.
   * - **Gebaut beim Umbau und nicht jedes Bild.** Ein Netz über tausend
   *   Kacheln ist eine Geometrie mit achttausend Punkten; die entsteht einmal
   *   je Grundriss und nicht sechzigmal in der Sekunde.
   */
  private buildGridLines(): void {
    const plan = this.grid;
    const group = this.group;
    if (!plan || !group) return;
    const points = new Map<number, number[]>();
    for (const key of plan.graph.tileKeys()) {
      const level = keyLevel(key);
      const y = plan.graph.levelY(level) + (plan.graph.tile(key)?.rise ?? 0) + GRID_LINE_LIFT;
      const x0 = tileCentreX(key) - TILE / 2;
      const x1 = x0 + TILE;
      const z0 = tileCentreZ(key) - TILE / 2;
      const z1 = z0 + TILE;
      const into = points.get(level) ?? [];
      into.push(
        x0,
        y,
        z0,
        x1,
        y,
        z0,
        x1,
        y,
        z0,
        x1,
        y,
        z1,
        x1,
        y,
        z1,
        x0,
        y,
        z1,
        x0,
        y,
        z1,
        x0,
        y,
        z0,
      );
      points.set(level, into);
    }
    for (const [level, list] of points) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
      const lines = new THREE.LineSegments(geometry, this.gridLineMaterial());
      lines.name = `grid-lines:${level}`;
      lines.userData.level = level;
      // Bis zum ersten `showGridLines` unsichtbar: Das Häkchen ist ab Werk aus,
      // und ein Netz, das für ein Bild aufblitzt, sieht aus wie ein Fehler.
      lines.visible = false;
      group.add(lines);
      this.gridLines.push(lines);
    }
  }

  /**
   * Das Material der Linien — halbtransparent, ohne Tiefe zu schreiben.
   *
   * Eines für alle Etagen und über den Umbau hinweg dasselbe: Ein Material je
   * Netz wäre bei jedem Pinselstrich ein neues, und die alten blieben auf der
   * Grafikkarte liegen.
   */
  private gridLineMaterial(): THREE.Material {
    this.gridLineSkin ??= new THREE.LineBasicMaterial({
      color: 0x9ec4ff,
      transparent: true,
      opacity: 0.35,
      // Sonst schneidet die Linie Löcher in alles, was hinter ihr steht — sie
      // liegt ja einen Zentimeter über dem Boden und nicht darin.
      depthWrite: false,
    });
    return this.gridLineSkin;
  }

  /**
   * **Sichtbar genau für die Ebene, auf der das Rig steht** — und nur, wenn
   * das Häkchen an ist.
   *
   * Jedes Bild, weil beides sich jedes Bild ändern kann: Man geht eine Treppe
   * hinauf, oder jemand setzt das Häkchen im Menü. Die Frage kostet einen
   * Vergleich je Etage, und das ist billiger als jede Buchhaltung darüber, ob
   * sich etwas geändert hat.
   */
  private showGridLines(): void {
    if (this.gridLines.length === 0) return;
    const on = graphics().gridLines;
    for (const lines of this.gridLines)
      lines.visible = on && lines.userData.level === this.rigLevel;
  }

  /** Die Netze wieder weg — Formen einzeln, das geteilte Material zum Schluss. */
  private dropGridLines(): void {
    for (const lines of this.gridLines) {
      lines.geometry.dispose();
      lines.removeFromParent();
    }
    this.gridLines.length = 0;
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
        // Der Weg für ein Bild, das erst über die Leitung kommt: Der Griff
        // wandert von der gerechneten Form auf das Modell, und die Anmeldung
        // wandert mit (`rehandle`).
        rehandle: (built: FixtureView, object: THREE.Object3D | null) =>
          this.rehandle(place, kind, built, object),
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
   * **Den Griff eines Einbaus umhängen**, wenn sein Bild aus dem Regal
   * eintrifft (`fixtures/index.ts`, `FixtureBuild.rehandle`).
   *
   * Die drei Zeilen sind der ganze Punkt, und sie gehören **zusammen**: alte
   * Anmeldung weg, neue hin, `view.handle` mitgeschrieben. Das letzte ist das,
   * was man vergisst — und es ist das, woran der Umbau sonst hängenbleibt:
   * `clearFixtures` meldet unter `view.handle ?? view.object` wieder ab, und
   * wer den Griff austauscht, ohne es dort einzutragen, meldet auf dem einen
   * an und auf dem anderen ab. Übrig bliebe bei jedem Umbau ein Eintrag in der
   * Liste der Welt — ein Hebel, den es nicht mehr gibt und der weiter Türen
   * öffnet. Im Baumodus wäre das dutzendfach je Minute.
   *
   * **Ein Nachzügler läuft ins Leere.** Zwischen dem Bauen und dem Eintreffen
   * der Datei liegt eine halbe Sekunde, in der jemand umgebaut haben kann;
   * dann hängt das Modell an einer Gruppe, die niemand mehr ansieht, und
   * `clearFixtures` ist längst durch. Die Arten merken sich das selbst
   * (`gone`) — hier wird trotzdem noch einmal nachgesehen, ob dieser Einbau
   * überhaupt noch läuft, denn eine Anmeldung, die niemand mehr abmeldet, ist
   * genau der Eintrag, den es zu vermeiden gilt.
   */
  private rehandle(
    place: FixturePlacement,
    kind: FixtureKind<unknown>,
    view: FixtureView,
    object: THREE.Object3D | null,
  ): void {
    if (!object) return;
    if (!this.fixtures.some((run) => run.view === view)) return;
    const old = view.handle ?? view.object;
    if (old && old !== object) this.removeUsable(old);
    view.handle = object;
    this.attachUsable(place, kind, view);
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
    this.forgetGhosts(run.meshes);
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
      // **Auch ein Einbau verdeckt.** Ein Schrank, ein geschlossenes Türblatt,
      // ein Tor: Was `slabs` führt, gehört ins Ghosting — das unsichtbare
      // Blatt einer Einbau-Tür allerdings nicht, das verdeckt ohnehin nichts.
      if (mesh.visible) this.rememberGhost(mesh, one);
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
    // Hier stand einmal der Kopf des Spielers, einmal je Bild geholt: Die
    // Tafeln der Schilder drehten sich danach. Sie richten sich jetzt beim
    // Zeichnen zur Kamera aus und brauchen von hier nichts mehr
    // (`ui/billboard.ts`, `fixtures/sign.ts`).
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
      // **Nach oben zwei Meter, nach unten eine Handbreit**: Was im Stockwerk
      // darüber steht, steht nicht auf dieser Platte.
      //
      // Eine feste Höhe und nicht mehr die Kachelgröße. Solange eine Kachel
      // 2,5 m maß, war das dasselbe; auf einem Meter zählte plötzlich niemand
      // mehr als „darauf", der auf einer Kiste steht oder springt — und eine
      // Druckplatte, die unter einem Sprung aufgeht, hält niemand für Absicht.
      py >= floor - 0.3 &&
      py <= floor + STAND_HEAD;
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
      case 'read':
        this.readAloud(event.title, event.text, event.markdown, ctx);
        break;
      case 'wardrobe':
        // **Mit dem Schrank selbst.** Er ist im Konstrukt der eine Gegenstand,
        // der nicht verblasst, und zugleich der Weg zurück — ohne ihn wüsste
        // `openWardrobe` weder, was stehen bleibt, noch, worauf man drücken
        // muss, um wieder herauszukommen.
        this.openWardrobe(ctx, from.view.handle ?? from.view.object ?? null);
        break;
    }
  }

  /**
   * **Einen Aushang aufschlagen** — der Abnehmer für `read`-Ereignisse
   * (`fixtures/sign.ts`).
   *
   * Aus dem Text werden Zeilen (`fixtures/signRows.ts`), aus den Zeilen wird
   * eine Seite im Weltmenü, und die Seite wird aufgeschlagen. Genau derselbe
   * Baum wie überall: am Bildschirm ein Blatt von unten, in der Brille das
   * Panel am Handgelenk (`ui/WristMenus.ts`) — eine zweite Art, Text zu
   * zeigen, gibt es hier nicht.
   *
   * Die Reihenfolge ist die ganze Feinheit: Erst muss der Baum **stehen**,
   * sonst sucht `openSubmenu` eine Seite, die es noch nicht gibt. Und er steht
   * erst am Ende des Bildes (`App.step`, `menuDirty`) — deshalb wird hier nur
   * vorgemerkt und im nächsten Bild aufgeschlagen (`openReading`).
   */
  protected readAloud(title: string, text: string, markdown: boolean, ctx: WorldContext): void {
    this.reading = { title, rows: signRows(text, SIGN.accent, markdown) };
    ctx.refreshWorldMenu();
    this.openReading = true;
  }

  /**
   * **Die Umkleide** — der Abnehmer für `wardrobe`-Ereignisse
   * (`fixtures/wardrobe.ts`).
   *
   * **Aus dem Blatt vor dem Gesicht ist ein Raum geworden.** Bis eben klappte
   * ein Druck auf den Schrank ein Menü auf — am Schirm ein Blatt
   * (`ui/WardrobeMenu.ts`), in der Brille die Seite _Aussehen_ am Handgelenk.
   * Das war eine Liste mit Pfeilen, und eine Liste mit Pfeilen ist die eine
   * Bedienung, von der man in einer Brille nichts hat: Man sieht das
   * Kleidungsstück nicht, man liest seinen Namen.
   *
   * Jetzt öffnet der Schrank ein **Konstrukt** (`shared/construct.ts`): Die
   * Welt verblasst, ein weißer Kachelboden kommt herauf, der Schrank bleibt
   * stehen — und um die Figur herum fahren die Sachen aus dem Boden, die sie
   * anziehen kann (`shared/wardrobeRack.ts`). Man greift ein Oberteil an und
   * hat es an. Zurück geht es **nur über den Schrank**, und zwar an genau der
   * Stelle, an der man hineingegangen ist: Die Figur hat sich nicht bewegt,
   * für die anderen Spieler steht sie die ganze Zeit vor ihrem Schrank.
   *
   * **Der Spiegel im Schrank ist dabei kein Zierrat, sondern die Rückmeldung**
   * (`fixtures/wardrobe.ts`): Er ist mit dem Schrank das Einzige, was nicht
   * verblasst, und zeigt die Figur in dem, was sie gerade anprobiert hat.
   *
   * Das Aussehen selbst hängt weiter am Spieler und nicht an der Welt
   * (`core/appearance.ts`): Wer sich hier umzieht, läuft auch in der nächsten
   * Welt so herum, und `saveAppearance` sagt es der Runde weiter
   * (`core/App.applyAppearance`). Eine Methode und kein direkter Aufruf im
   * `switch`, damit eine Welt sie überschreiben kann, die etwas anderes vorhat.
   */
  protected openWardrobe(ctx: WorldContext, anchor: THREE.Object3D | null): void {
    // Zweimal drücken heißt: wieder hinaus. Der Schrank ist im Konstrukt
    // weiter benutzbar (er verblasst ja nicht), und er ist dort der **einzige**
    // Weg zurück — alles andere ist unsichtbar und meldet sich deshalb gar
    // nicht mehr (`PortalWorld.collectUsables`).
    if (this.construct?.open) {
      this.leaveConstruct();
      return;
    }
    // Ohne Netz kein Konstrukt: Dann bleibt es beim Blatt von früher, und das
    // ist kein Notbehelf, sondern der ehrliche Rückfall — ein Schrank ohne
    // sichtbaren Korpus wäre im Konstrukt ein weißer Raum mit nichts darin.
    if (!anchor) {
      ctx.openWardrobe();
      return;
    }

    const rack = (this.rack ??= new WardrobeRack());
    this.enterConstruct({
      anchor,
      at: ctx.rig.position,
      title: 'Umkleide — greif dir etwas',
      items: rack.pieces(appearance()).map((piece) => this.wearable(piece, rack)),
    });
  }

  /**
   * **Ein Kleidungsstück auf dem Regal, und was ein Druck darauf tut.**
   *
   * Er zieht es an (`saveAppearance`) und schließt den Raum **nicht**: Wer sich
   * umzieht, probiert, und wer probiert, will den nächsten Hut sehen, ohne
   * zweimal durch eine halbe Sekunde Überblendung zu gehen. Deshalb gibt
   * `pick` hier `false` zurück, anders als beim Rechner der Küche, wo ein
   * Griff das Möbel in die Hand legt und man damit hinaus will.
   *
   * **Der Reif wandert mit**, statt dass das Regal neu gebaut wird: Die Ringe
   * heißen `rack-worn` und sind das Einzige, was sich am Stück ändert, wenn
   * jemand etwas anderes anzieht (`shared/wardrobeRack.ts`). Das Regal
   * abzureißen und neu zu stellen hieße, siebzehn Netze für eine Marke
   * wegzuwerfen — und die Stücke führen dabei ihre Auffahrt aus dem Boden
   * noch einmal vor.
   *
   * Wandern lässt ihn das Regal selbst (`WardrobeRack.wear`) und nicht diese
   * Schleife: Es weiß, welche Stücke schon gebaut sind, und es merkt sich das
   * Aussehen für die, die erst noch aus dem Boden kommen. Wer hier alle Stücke
   * seines Fachs anfasste, baute genau die vorzeitig, die der Raum gerade
   * langsam nachreicht.
   */
  private wearable(piece: RackPiece, rack: WardrobeRack): ConstructItem {
    return {
      object: () => piece.object(),
      label: piece.sub ? `${piece.label} — ${piece.sub}` : piece.label,
      pick: () => {
        const look = saveAppearance({ [piece.slot]: piece.value } as Partial<Appearance>);
        rack.wear(look);
        this.announce(`${piece.label} angezogen`);
        return false;
      },
    };
  }

  /**
   * **Den Konstrukt-Raum aufmachen** — der eine Weg hinein, für den Schrank
   * wie für den Rechner der Küche (`test/zones/kitchen.ts` über
   * `ZoneHost.enterConstruct`).
   *
   * Er merkt sich dabei, wo die Figur steht: Dorthin kommt sie beim Verlassen
   * zurück, und dort sehen die anderen sie die ganze Zeit
   * (`constructHome`, `syncConstructBody`). Alles Übrige macht der Raum
   * selbst.
   */
  protected enterConstruct(options: ConstructOptions): void {
    const room = (this.construct ??= new ConstructRoom({
      root: this.root,
      addUsable: (object, usable, use) => this.addUsable(object, usable, use),
      removeUsable: (object) => this.removeUsable(object),
      notify: (message) => this.announce(message),
    }));
    // **Die Füße und nicht der Ursprung des Rigs.** `ConstructOptions.at` ist
    // als Fußhöhe verabredet, und in der Brille liegen die beiden um so viel
    // auseinander, wie man von der Mitte seines Spielraums entfernt steht —
    // beim Ducken kommt die Höhe dazu. Der Boden des weißen Raums legt sich
    // danach, also läge er sonst unter oder über den Sohlen.
    const feet = this.playerFeet(_feet);
    room.enter(feet ? { ...options, at: feet } : options);
    this.syncConstructBody();
  }

  /** **Und wieder hinaus** — die Welt kommt zurück, die Figur geht an ihren Platz. */
  protected leaveConstruct(): void {
    this.construct?.leave();
    this.syncConstructBody();
  }

  /**
   * **Der Körper folgt dem Raum und nicht dem Handgriff.**
   *
   * Es gibt zwei Wege hinaus, und nur einer geht über `leaveConstruct`: Ein
   * Stück, dessen Griff `true` meldet — der Möbelkatalog am Rechner der Küche
   * tut das —, schließt den Raum **von innen** (`ConstructRoom.update`). Wer
   * den Körper nur beim ausdrücklichen Verlassen zurückholte, ließe nach so
   * einem Griff eine Figur stehen, die durch Wände geht, und niemand fände den
   * Grund dafür. Also wird jedes Bild nachgezogen: Der Raum sagt, ob er offen
   * ist, und der Körper richtet sich danach.
   *
   * Drei Dinge hängen daran, und sie gehören zusammen:
   *
   * - **Die Stelle** (`constructHome`), an die es zurückgeht. Gemerkt wird sie
   *   beim ersten Bild, in dem der Raum offen steht, und zurückgegeben wird
   *   sie über `movePlayerTo` — also über denselben Weg, den auch die Rettung
   *   aus der Tiefe und das Teleport-Werkzeug nehmen, samt `resync` für die
   *   Kapsel. **Ohne Blickrichtung**: Wer sich im Konstrukt umgedreht hat,
   *   steht danach zwar wieder an seinem Platz, sieht aber weiter dorthin, wo
   *   er zuletzt hinsah. Alles andere wäre ein Ruck ohne Anlass.
   * - **Der kollisionsfreie Körper** (`PhysicsLocomotion.ghost`). Die Welt ist
   *   ausgeblendet, ihre Kollisionskörper stehen aber noch — ohne das hier
   *   liefe man im leeren Weiß gegen unsichtbare Wände.
   * - **Die Pose im Netz** (`NetSession.poseAnchor`). Die anderen sollen
   *   weiter eine Figur sehen, die vor ihrem Schrank steht und sich umsieht,
   *   und nicht eine, die durch die Küche schwebt.
   */
  private syncConstructBody(): void {
    const ctx = this.context;
    if (!ctx) return;
    if (this.construct?.open) {
      if (!this.constructHome) {
        const feet = this.playerFeet(new THREE.Vector3());
        if (!feet) return;
        this.constructHome = feet;
        ctx.net.poseAnchor = ctx.rig.getHeadPosition(new THREE.Vector3());
      }
      this.setPlayerGhost(true);
      // **Der Raum hört an seinem Boden auf** (`ConstructRoom.keepInside`).
      // Ohne Schwerkraft und ohne Kollisionen hält einen sonst nichts davon
      // ab, über den Rand hinaus in ein weißes Nichts zu laufen, in dem es
      // kein Merkmal gibt, an dem man den Rückweg fände. Geklemmt wird das
      // Rig und nicht die Kapsel: Die steht ohnehin still (siehe oben).
      const feet = this.playerFeet(_feet);
      if (feet && this.construct.keepInside(feet)) {
        ctx.rig.getHeadPosition(_head);
        ctx.rig.position.x += feet.x - _head.x;
        ctx.rig.position.z += feet.z - _head.z;
        ctx.rig.updateMatrixWorld(true);
      }
      return;
    }
    const home = this.constructHome;
    if (!home) return;
    this.constructHome = null;
    ctx.net.poseAnchor = null;
    // `movePlayerTo` ohne Winkel behält die Blickrichtung — und sein `resync`
    // setzt die Kapsel wieder unter den Kopf und schaltet `ghost` ab.
    this.movePlayerTo(ctx, home);
  }

  /** Ob gerade ein Konstrukt offen ist — die Küche fragt danach. */
  protected get inConstruct(): boolean {
    return this.construct?.open ?? false;
  }

  /**
   * **Im Konstrukt reicht `A` bis zum letzten Stück** (`ConstructRoom.reach`).
   *
   * Sonst gilt überall dieselbe Armlänge und eine halbe wie in jeder anderen
   * Welt. Die Ausnahme hängt am Zuschnitt des Raums und nicht am Geschmack:
   * Die Auswahl steht dort im Ring, drei Kacheln weiter draußen und einmal
   * herum. Hingehen darf man (`syncConstructBody`), aber wer für jedes Stück
   * drei Schritte und eine halbe Drehung braucht, sieht sich zwei an und hört
   * auf.
   *
   * Gefährlich wird die längere Reichweite dabei nicht: Im Konstrukt ist außer
   * dem Anker und der Auswahl nichts mehr sichtbar, und was unsichtbar ist,
   * steht gar nicht erst zur Wahl (`PortalWorld.collectUsables`).
   */
  protected override useReach(): number {
    const room = this.construct;
    return room?.open ? Math.max(super.useReach(), room.reach) : super.useReach();
  }

  /** Dasselbe für das Zeigen in der Brille — siehe `useReach`. */
  protected override handUseRange(): number {
    const room = this.construct;
    return room?.open ? Math.max(super.handUseRange(), room.reach) : super.handUseRange();
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
    const portal = solid.portal ?? solid.kind === 'panel';
    const mesh = this.slab(
      parent,
      this.materialFor(solid.kind),
      [solid.w, solid.h, solid.d],
      [solid.x, solid.y, solid.z],
      portal,
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
    this.rememberGhost(mesh, solid);
    // **Und ob an seiner Stelle einmal ein Modell steht** (`blocks.blockModel`).
    // Die Frage fällt hier und nicht erst bei der Ankunft der Datei: Gebündelt
    // wird gleich, unsichtbar wird der Quader frühestens ein paar hundert
    // Millisekunden später — und wer bis dahin wartete, hätte ihn im Bündel.
    // Vorgemerkt wird er deshalb sofort, damit ihn `fillBlockModel` wiederfindet.
    const modelled = solid.block !== undefined && blockModel(solid.block) !== null;
    if (solid.block !== undefined && modelled) this.rememberModelled(mesh, solid, solid.block);
    // **Und ob Platten über ihn gelegt werden** (`shared/plateField.ts`).
    // Dieselbe Frage zum selben Zeitpunkt und aus demselben Grund wie eine
    // Zeile höher — nur, dass ein Boden nicht aus dem Bündel fällt, sondern in
    // ein eigenes kommt (`gridBatch.batchKey`): Es sind neunhundert Quader und
    // eine Masse über das ganze Gelände, und die einzeln zu zeichnen wäre
    // teurer als alles, was hier gespart wird.
    addFloorTops(this.floorTops, solid);
    const plates = floorPlateModels(solid, this.plateChoice);
    if (plates.length > 0) {
      const key = plates.join('|');
      mesh.userData.plates = key;
      this.rememberPlated(key, mesh);
      this.plateSolids.push(solid);
    }
    // **Und ob er in ein Bündel darf** (`gridBatch.ts`): Ein Boden, eine
    // Schwelle, eine Rampe wird nie durchsichtig — also kostet es nichts, sie
    // mit ihresgleichen in einem Zug zu zeichnen.
    const candidate = {
      box: { x: solid.x, y: solid.y, z: solid.z, w: solid.w, h: solid.h, d: solid.d },
      floor: solid.kind === 'floor',
      portal,
      door: !!solid.door,
      modelled,
    };
    if (joinsBatch(candidate)) this.batchable.push(mesh);
    // **Und eine Wand in das Bündel, das nur aus den Augen gilt.** Geghostet
    // wird ausschließlich von oben (`stepWallGhosts`), und dort stehen die
    // Quader wieder einzeln da.
    else if (joinsGhostBatch(candidate)) this.ghostable.push(mesh);
  }

  // --- der Boden, der aus dem Regal kommt -----------------------------------

  /** Dieses Ding wartet auf diese Dateien — gemerkt für `plateArrived`. */
  private rememberPlated(key: string, object: THREE.Object3D): void {
    const list = this.plated.get(key);
    if (list) list.push(object);
    else this.plated.set(key, [object]);
  }

  /**
   * **Für jede Bodenkachel eine Platte bestellen** — je Datei ein Bündel.
   *
   * Die Gegenrichtung zu `build()`: Dort wird Quader für Quader entschieden,
   * **ob** Platten kommen; hier wird aus denselben Quadern ausgerechnet, **wo**
   * sie liegen (`shared/plateField.floorPlateSpots`, ohne three.js und deshalb
   * geprüft). Zwei Durchgänge, weil eine Kachel von zwei Quadern getragen
   * werden kann — der Masse des Geländes und der Bodenkachel darauf —, und
   * darauf gehört genau **eine** Platte.
   *
   * **Ohne WebGL passiert gar nichts** (`core/chefFit.canLoadModels`), genau
   * wie bei den Möbeln (`buildBlockModels`): In Jest zieht `GLTFLoader` samt
   * `import.meta` den ganzen Lauf mit herein. Dann steht der gebaute Boden da
   * und tut, was er immer tat — und in einem Checkout ohne die gekauften
   * Pakete für immer.
   *
   * **Und ohne Spieler auch nicht.** Der Riegel auf `context` ist derselbe wie
   * bei der Schürze draußen (`worlds/test/TestWorld.buildProps`) und meint
   * dasselbe: eine **Vorschau** (`PortalWorld.preview`). Für ein Standbild auf
   * der Werkzeugseite sind achttausend Platten zu viel, und aufgeräumt wird
   * eine Vorschau allein mit `disposeTree` — das die Instanzpuffer eines
   * Bündels gar nicht kennt.
   */
  private buildFloorPlates(): void {
    const group = this.group;
    if (!group || !this.context || !canLoadModels()) return;
    // **Je Datei und je Etage ein Bündel.** Die Datei, weil ein
    // `InstancedMesh` genau eine Geometrie hat; die Etage, weil es genau eine
    // Sichtbarkeit hat und von oben aufgeschnitten wird (`core/cutaway.ts`).
    const byBundle = new Map<string, { file: string; level: number; seats: PlateSeat[] }>();
    for (const spot of floorPlateSpots(this.plateSolids, this.plateChoice)) {
      const key = `${spot.model}@${spot.level}`;
      const bundle = byBundle.get(key) ?? { file: spot.model, level: spot.level, seats: [] };
      bundle.seats.push({ x: spot.x, y: spot.y, z: spot.z });
      byBundle.set(key, bundle);
    }
    for (const { file, level, seats } of byBundle.values()) {
      // Was ein Bodenstück schon deckt, kommt gar nicht erst ins Bild — der
      // Grundriss wird umgebaut, die Stücke aus dem Regal bleiben liegen.
      const floor = new PlateFloor(group, file, this.visibleSeats(seats), {
        level,
        capacity: seats.length,
        ready: () => this.plateArrived(file),
      });
      this.platesBuilt.push(floor);
      this.plateSeats.set(floor, seats);
    }
  }

  /** Die Sitze, die kein Bodenstück aus dem Regal deckt. */
  private visibleSeats(seats: readonly PlateSeat[]): PlateSeat[] {
    return uncoveredSeats(seats, this.floorCovers.values());
  }

  /**
   * **Wie hoch der Boden unter diesen Kacheln liegt** — aus dem Grundriss und
   * nicht aus der Physik: Die Frage fällt beim Hinstellen, und dort soll die
   * Antwort die Oberkante sein, die auch die Platten tragen
   * (`shared/floorCover.floorTopUnder`).
   */
  protected override floorTopAt(tiles: readonly CoverTile[], below: number): number | null {
    return floorTopUnder(this.floorTops, tiles, below);
  }

  /**
   * **Ein Bodenstück deckt diese Kacheln — oder keine mehr.** Die Platten
   * darunter gehen aus dem Bild und kommen zurück, sobald es aufgehoben,
   * abgerissen oder weggeräumt ist. Das Bündel bleibt dasselbe: nur neue
   * Matrizen (`PlateFloor.reseat`), kein neuer Zeichenaufruf.
   */
  protected override coverFloor(entry: PhysicsBody, cover: Cover | null): void {
    if (cover === null) {
      if (!this.floorCovers.delete(entry)) return;
    } else {
      this.floorCovers.set(entry, cover);
    }
    for (const [floor, seats] of this.plateSeats) floor.reseat(this.visibleSeats(seats));
  }

  /**
   * **Eine Datei ist da** — und jetzt darf weg, was nur noch auf sie gewartet
   * hat.
   *
   * Erst jetzt und keinen Moment früher: Vorher wäre der Boden eine Weile lang
   * gar nicht da gewesen, und in einem Checkout ohne die Pakete für immer.
   * Dieselbe Reihenfolge wie beim Regal (`fillBlockModel`, „**und erst jetzt**
   * geht das Gerechnete aus dem Bild").
   *
   * Gewartet wird auf **alle** Dateien einer Gruppe. Meistens ist es eine; ein
   * Quader, über dem zweierlei Platten liegen — Prototyp hier, Stein dort —,
   * verschwindet erst, wenn beide angekommen sind, denn sonst bliebe unter der
   * fehlenden ein Loch.
   */
  private plateArrived(file: string): void {
    this.plateReady.add(file);
    for (const [key, objects] of this.plated) {
      if (!key.split('|').every((one) => this.plateReady.has(one))) continue;
      for (const object of objects) object.visible = false;
    }
  }

  /**
   * **Die Platten wieder abhängen** — beim Umbau und beim Verlassen der Welt.
   *
   * `PlateFloor.dispose` gibt dabei mehr frei, als `disposeTree` je fände: den
   * Instanzpuffer des Bündels, seine Geometrie und sein Material. Und was noch
   * unterwegs ist, räumt sich bei der Ankunft selbst weg — die Gruppe weiß,
   * dass sie abgeräumt wurde.
   */
  private dropFloorPlates(): void {
    for (const plates of this.platesBuilt) plates.dispose();
    this.platesBuilt.length = 0;
    this.plateSeats.clear();
    this.floorTops.clear();
    this.plated.clear();
    this.plateReady.clear();
    this.plateSolids.length = 0;
  }

  // --- die Möbel, die aus dem Regal kommen ----------------------------------

  /**
   * **Unter welchem Namen die Quader eines Möbels wiederzufinden sind**: seine
   * Sorte und seine Kachel.
   *
   * Der Quader weiß nur, aus **welcher** Sorte Möbel er kommt
   * (`solids.PlanSolid.block`) — und mehr soll er auch nicht wissen. Welches
   * Regal von dreien gemeint ist, sagt seine Kachel, und die steht in seinen
   * Metern: Ein Baustein baut ausschließlich auf seiner eigenen Kachel
   * (`blocks.BUILD`, alle Maße innerhalb von `TILE`), also liegt die Mitte
   * jedes seiner Quader darin. Die Etage kommt dazu, weil zwei Regale
   * übereinander zwei Regale sind.
   */
  private static blockSlabKey(kind: BlockKind, tile: TileKey): string {
    return `${kind}@${tile}`;
  }

  /** Diesen Quader für sein Möbel vormerken — er wird später unsichtbar. */
  private rememberModelled(mesh: THREE.Mesh, solid: PlanSolid, kind: BlockKind): void {
    const tile = tileKey(tileIndexAt(solid.x), tileIndexAt(solid.z), solid.level ?? 0);
    const key = GridWorld.blockSlabKey(kind, tile);
    const list = this.modelledSlabs.get(key);
    if (list) list.push(mesh);
    else this.modelledSlabs.set(key, [mesh]);
  }

  /**
   * **Für jeden Baustein, den es im Regal schon gibt, ein Modell bestellen.**
   *
   * Die Gegenrichtung zu `plan.solids()`: Dort wird jedes Möbel zu Quadern
   * plattgedrückt, hier wird die Liste der Möbel selbst noch einmal
   * durchgegangen (`plan.blocks()`) — denn erst sie sagt, wo **ein** Regal
   * anfängt und aufhört. Aus sechs Brettern lässt sich das nicht zurücklesen.
   *
   * **Ohne WebGL passiert gar nichts** (`core/chefFit.canLoadModels`), genau
   * wie bei der Druckplatte (`fixtures/plate.ts`): In Jest zieht `GLTFLoader`
   * samt `import.meta` den ganzen Lauf mit herein, und was an einer Gitterwelt
   * zu prüfen ist, braucht kein Netz. Dann steht das gerechnete Regal da und
   * tut, was es immer tat — und in einem Checkout ohne die gekauften Pakete
   * für immer.
   */
  private buildBlockModels(): void {
    const plan = this.grid;
    const group = this.group;
    if (!plan || !group || !canLoadModels()) return;
    for (const place of plan.blocks()) {
      const file = blockModel(place.kind);
      if (file) this.fillBlockModel(group, place, file);
    }
  }

  /**
   * **Ein Modell holen und das Gerechnete dahinter verstecken** — sofort
   * nichts, später vielleicht etwas.
   *
   * Dasselbe Muster wie überall, wo ein Regalmodell eine gebaute Form ablöst
   * (`fixtures/plate.ts`, `docs/agents/modelle.md`): dynamisch geladen, damit
   * Jest den `GLTFLoader` nicht mitzieht, und **erst wenn die Datei wirklich
   * angekommen ist**, verschwindet das Gebaute. Unsichtbar heißt dabei nur
   * unsichtbar — die Quader bleiben stehen, ihr Körper trägt weiter die
   * Kollision und ihr Aufschlag steht weiter im Navigationsgraphen. Ein Modell
   * ist ein Bild und kein Vertrag.
   *
   * **Gemessen wird am geladenen Baum und nicht am Katalog**
   * (`blocks.blockModelSpot`). Die Gruppe, die der Lader zurückgibt, trägt den
   * Maßstab ihres Pakets schon (`core/kaykitFit.kaykitScale`); was hier
   * dazukommt, ist die Umrechnung auf die Höhe des Bausteins und die Breite
   * seiner Kachel — und bei Theke und Treppe auf seine Tiefe dazu. Eine
   * abgeschriebene Zahl wäre die, die nach dem nächsten Paket-Update
   * danebenliegt und die niemand nachrechnet.
   */
  private fillBlockModel(group: THREE.Group, place: BlockPlacement, file: string): void {
    const round = this.blockModelRound;
    void import('../../core/kaykitModel').then(async (module) => {
      const model = await module.kaykitModel(file);
      if (!model) return;
      const plan = this.grid;
      // Inzwischen umgebaut (oder die Welt ist weg): Die Kopie ist schon
      // gebaut, und ihre Materialien gehören ihr allein — sie gehen hier weg
      // und nicht erst, wenn niemand mehr weiß, dass es sie gab.
      if (round !== this.blockModelRound || !plan) {
        for (const skin of modelSkins(model)) skin.dispose();
        return;
      }
      // **Erst messen, dann hängen.** Der Baum hat noch keinen Elternteil,
      // also ist seine Weltmatrix seine eigene — gemessen wird damit genau
      // das, was gleich in der Hülle steckt.
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      if (box.isEmpty()) {
        for (const skin of modelSkins(model)) skin.dispose();
        return;
      }
      const level = keyLevel(place.tile);
      const spot = blockModelSpot(
        place.kind,
        {
          x: tileCentreX(place.tile),
          z: tileCentreZ(place.tile),
          base: plan.graph.levelY(level),
          dir: place.dir,
          ...(place.height === undefined ? {} : { height: place.height }),
          ...(place.lift === undefined ? {} : { lift: place.lift }),
        },
        {
          minX: box.min.x,
          minY: box.min.y,
          minZ: box.min.z,
          maxX: box.max.x,
          maxY: box.max.y,
          maxZ: box.max.z,
        },
      );
      // Eine eigene Hülle und nicht der Maßstab auf der geladenen Gruppe: Dort
      // steht der des Pakets, und wer ihn überschriebe, machte aus verschieden
      // großen Dingen gleich große (`core/kaykitModel.copyOf`).
      const holder = new THREE.Group();
      holder.name = `block:${place.kind}`;
      holder.position.set(spot.x, spot.y, spot.z);
      holder.rotation.y = spot.yaw;
      // **Drei Faktoren und nicht einer** (`blocks.BlockModelSpot.scale`): Bei
      // einem Möbel sind sie derselbe, bei Theke und Treppe nicht — dort wird
      // je Achse in die gebaute Form eingepasst, weil es auf die Form ankommt
      // und nicht auf die Proportion. Der Maßstab wirkt in den Achsen des
      // Modells und vor der Drehung, und genau so ist er gerechnet.
      holder.scale.set(spot.scale.x, spot.scale.y, spot.scale.z);
      // Auf welcher Etage es steht — von oben verschwindet es mit ihr
      // (`core/cutaway.ts`).
      holder.userData.level = level;
      holder.add(model);
      group.add(holder);
      this.blockModels.push(holder);
      for (const skin of modelSkins(model)) this.blockModelSkins.push(skin);
      // **Und erst jetzt** geht das Gerechnete aus dem Bild. Vorher wäre die
      // Kachel eine Weile lang leer gewesen, und in einem Checkout ohne die
      // Pakete für immer.
      const slabs = this.modelledSlabs.get(GridWorld.blockSlabKey(place.kind, place.tile));
      for (const mesh of slabs ?? []) mesh.visible = false;
    });
  }

  /**
   * **Die Modelle wieder abhängen** — beim Umbau und beim Verlassen der Welt.
   *
   * Die Runde zählt dabei weiter, und das ist der halbe Zweck dieser Methode:
   * Was noch unterwegs ist, gehört danach zu keiner Runde mehr und räumt sich
   * bei der Ankunft selbst weg (`fillBlockModel`).
   */
  private dropBlockModels(): void {
    this.blockModelRound++;
    for (const model of this.blockModels) model.removeFromParent();
    this.blockModels.length = 0;
    // Die Geometrie gehört der Vorlage und bleibt liegen, die Materialien
    // nicht — siehe `blockModelSkins`.
    for (const skin of this.blockModelSkins) skin.dispose();
    this.blockModelSkins.length = 0;
    this.modelledSlabs.clear();
  }

  // --- Wand-Ghosting --------------------------------------------------------

  /**
   * **Einen Quader für das Ghosting vormerken** — wenn er überhaupt etwas
   * verdecken kann (`wallGhost.blocksView`).
   *
   * Der Kasten wird hier festgehalten und nicht jedes Bild aus der Geometrie
   * geholt: Er ändert sich nie (ein Umbau baut neu), und die Auswahl läuft
   * sechzigmal in der Sekunde über die ganze Liste.
   */
  private rememberGhost(mesh: THREE.Mesh, solid: PlanSolid): void {
    const one: GhostSlab = {
      mesh,
      kind: solid.kind,
      floor: solid.kind === 'floor',
      box: { x: solid.x, y: solid.y, z: solid.z, w: solid.w, h: solid.h, d: solid.d },
      on: false,
    };
    if (!blocksView(one)) return;
    this.wallGhosts.push(one);
  }

  /** Diese Quader sind weg — sie dürfen in keiner Auswahl mehr vorkommen. */
  private forgetGhosts(meshes: readonly THREE.Object3D[]): void {
    if (meshes.length === 0 || this.wallGhosts.length === 0) return;
    const gone = new Set(meshes);
    for (let i = this.wallGhosts.length - 1; i >= 0; i--) {
      if (gone.has(this.wallGhosts[i]!.mesh)) this.wallGhosts.splice(i, 1);
    }
  }

  /**
   * **Was zwischen Kamera und Figur steht, wird für dieses Bild durchsichtig.**
   *
   * Das Aufschneiden (`core/cutaway.ts`) nimmt nur weg, was **über** der Ebene
   * des Rigs liegt — Decken und Dächer. Eine Wand auf derselben Ebene bleibt
   * stehen, und aus der Schrägsicht von Süden steht sie genau dann im Weg,
   * wenn man gerade hinter ihr steht. Overcooked und die Sims beantworten das
   * seit jeher gleich: Die Wand bleibt stehen und wird durchsichtig.
   *
   * Drei Sachen sind daran entschieden:
   *
   * - **Nur von oben.** In der Brille steht man *in* der Welt; eine Wand, die
   *   dort durchsichtig würde, weil der Kopf gerade dahintersteht, wäre ein
   *   Fehler und kein Hilfsmittel. Beim Umschalten kommt deshalb alles zurück.
   * - **Gezielt wird auf die Mitte der Figur** (`GHOST_AIM`) und nicht auf
   *   ihre Füße: Der Strahl zu den Füßen streift jede Bodenplatte und jede
   *   Schwelle davor.
   * - **Und die Auswahl trifft `wallGhost.wallsHiding`** und nicht mehr ein
   *   Strahl von der Kamera aus: Sie fragt in der **Spalte der Figur** und nur
   *   nach Wänden, von denen die Kamera die andere Seite sieht. Der Strahl von
   *   der nachziehenden Kamera aus erwischte beim Laufen die Wand **neben**
   *   der Figur — nach Westen die eine, nach Osten spiegelbildlich die
   *   andere. Die lange Fassung steht dort.
   * - **Getauscht wird nur, was sich geändert hat.** Ein Material jedes Bild
   *   neu zuzuweisen ist für three.js ein neuer Zustand — und bei tausend
   *   Quadern eine Liste, die nichts tut außer Arbeit zu machen.
   */
  private stepWallGhosts(ctx: WorldContext): void {
    this.topDownView = ctx.topDown;
    // **Vor allem anderen und auch ohne einen einzigen Ghost-Kandidaten:** Die
    // Wände stehen von oben einzeln da und aus den Augen als Bündel, und diese
    // eine Frage entscheidet beides (`showGhostBatches`).
    this.showGhostBatches(!ctx.topDown);
    if (!ctx.topDown) {
      this.clearWallGhosts();
      this.ghostBoxView?.hide();
      return;
    }
    // **Von der Kamera, die das Bild zeichnet, und zwar in Weltkoordinaten.**
    // Hier stand `ctx.camera.position` — die Kamera der eigenen Augen, und von
    // der die Stelle **im Rig**: knapp über dessen Nullpunkt, wo auch immer
    // man stand. Gefragt wurde damit stets aus der Reihe z = 0 heraus, und je
    // weiter die Figur davon entfernt war, desto schiefer lag die Strecke —
    // am Rand der Karte wurde die falsche Wand durchsichtig.
    const eye = (ctx.viewCamera ?? ctx.camera).getWorldPosition(_eye);
    const rig = ctx.rig.position;
    const aim = { x: rig.x, y: rig.y + GHOST_AIM, z: rig.z };
    const models = this.gatherModelCandidates();
    const hidden = new Set<GhostCandidate>(wallsHiding(eye, aim, this.wallGhosts));
    for (const one of this.wallGhosts) this.setGhost(one, hidden.has(one));
    const hiddenModels = wallsHiding(eye, aim, models);
    this.modelGhosts.apply(hiddenModels.map((one) => one.entry.object));
    for (const one of hiddenModels) hidden.add(one);
    this.drawGhostView(eye, aim, ctx.rig.getFloorY(), models, hidden);
  }

  /**
   * **Die hingestellten Modelle als Kästen** — Mitte und Grundfläche des
   * Colliders, in der Vierteldrehung, in der sie stehen (`gridSnap.turnedHalf`).
   * Jedes Bild neu, denn anders als ein Quader aus dem Grundriss kann ein
   * Modell umfallen, weggeschoben oder woanders hingestellt werden.
   */
  private gatherModelCandidates(): ModelCandidate[] {
    const out = this.modelCandidates;
    out.length = 0;
    for (const entry of this.placedModels(this.placedScratch)) {
      entry.object.getWorldPosition(_spot);
      entry.object.getWorldQuaternion(_turn);
      const { halfX, halfZ } = turnedHalf(entry.halfExtents, yawOf(_turn));
      const one: ModelCandidate = {
        entry,
        box: {
          x: _spot.x,
          y: _spot.y,
          z: _spot.z,
          w: 2 * halfX,
          h: 2 * entry.halfExtents.y,
          d: 2 * halfZ,
        },
      };
      if (blocksView(one)) out.push(one);
    }
    return out;
  }

  /**
   * **Die Werkstattansicht nachziehen** (_Grafik → Ghosting zeigen_,
   * `ghostView.ts`) — oder weglegen, wenn das Häkchen aus ist. Gebaut wird
   * sie erst beim ersten Anschalten: Wer es nie tut, bekommt kein Netz.
   */
  private drawGhostView(
    eye: GhostPoint,
    aim: GhostPoint,
    floor: number,
    models: readonly ModelCandidate[],
    hidden: ReadonlySet<GhostCandidate>,
  ): void {
    if (!graphics().ghostBoxes || !this.group) {
      this.ghostBoxView?.hide();
      return;
    }
    this.ghostBoxView ??= new GhostBoxView(this.root);
    const boxes: GhostBoxLine[] = [];
    for (const one of this.wallGhosts) boxes.push({ box: one.box, hidden: hidden.has(one) });
    for (const one of models) boxes.push({ box: one.box, hidden: hidden.has(one) });
    this.ghostBoxView.show(aim, eye, floor, GHOST_SHOULDER, boxes);
  }

  /** Alles zurück auf sein eigenes Material. */
  private clearWallGhosts(): void {
    for (const one of this.wallGhosts) this.setGhost(one, false);
    this.modelGhosts.clear();
  }

  private setGhost(one: GhostSlab, on: boolean): void {
    if (one.on === on) return;
    one.on = on;
    one.mesh.material = on ? this.ghostFor(one.kind) : this.materialFor(one.kind);
  }

  /**
   * Das durchsichtige Zwillingsmaterial einer Sorte — dieselbe Farbe, ein
   * Viertel Deckkraft, und ohne in den Tiefenpuffer zu schreiben.
   *
   * Eine zweite Palette und kein Umschalten am Material selbst: `transparent`
   * an einem geteilten Material umzulegen, machte jede Wand der Welt
   * durchsichtig, und three.js baut den Shader dabei jedes Mal neu.
   */
  private ghostFor(kind: PlanSolidKind): THREE.Material {
    const had = this.ghostPalette.get(kind);
    if (had) return had;
    const made = this.buildMaterial(kind, true);
    this.ghostPalette.set(kind, made);
    return made;
  }

  /**
   * **Ob ausnahmslos jeder Quader in ein Bündel geht** (`InstancedMesh`).
   *
   * Aus, und das bleibt so — aber die Frage ist kleiner geworden, als sie
   * einmal war. Gebündelt wird längst **immer**: was nie ghosten kann, dauerhaft
   * (`gridBatch.joinsBatch`), und die Wände für jede Ansicht außer der von oben
   * (`joinsGhostBatch`, `showGhostBatches`). Wer hier `true` sagt, nimmt
   * zusätzlich **Portalflächen und Türblätter** mit hinein und verzichtet dafür
   * auf ein anhaftendes Portal und auf ein Türblatt, das sich einzeln
   * wegschalten lässt. Das ist der Weg für eine Welt mit zehntausend Kacheln
   * und für niemanden sonst.
   */
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
    const made = this.buildMaterial(kind, false);
    this.palette.set(kind, made);
    return made;
  }

  /**
   * Das Material einer Sorte bauen — normal oder als durchsichtiger Zwilling.
   *
   * Beide aus **derselben** Zeile, damit sie dieselbe Farbe haben: Ein Ghost,
   * der ein bisschen anders aussieht als die Wand, die er ersetzt, sieht aus
   * wie ein Fehler im Bild.
   */
  private buildMaterial(kind: PlanSolidKind, ghost: boolean): THREE.Material {
    const color = this.tint()[kind] ?? GRID_COLORS[kind];
    const soft = ghost ? { transparent: true, opacity: GHOST_OPACITY, depthWrite: false } : {};
    return kind === 'glow'
      ? new THREE.MeshBasicMaterial({ color, toneMapped: false, ...soft })
      : new THREE.MeshStandardMaterial({ color, ...GRID_FINISH[kind], ...soft });
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
    // **Vor allem anderen der Konstrukt-Raum**: Er blendet aus und wieder ein,
    // und was in diesem Bild noch über Sichtbarkeit entscheidet (die
    // Wandgeister, die Schnittebene von oben), soll auf dem Stand rechnen, den
    // er gerade hergestellt hat.
    this.construct?.update(dt);
    this.syncConstructBody();
    this.stepBursts(dt);
    this.trackLevel(ctx);
    this.showGridLines();
    this.stepWallGhosts(ctx);
    // **Vor den Einbauten**, damit ein Schild, das in diesem Bild gelesen
    // wird, sein Bild zum Aufbauen des Menüs bekommt (siehe `openReading`).
    if (this.openReading) {
      this.openReading = false;
      ctx.menu.openSubmenu(SIGN_PAGE);
    }
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
    // **Erst heraus, dann abreißen.** Wer die Welt verlässt, während das
    // Konstrukt offen steht, ließe sonst eine Handvoll unsichtbarer Äste
    // zurück — und einen Körper, der durch Wände geht und dessen Pose im Netz
    // an einer Stelle klebt, die es gleich nicht mehr gibt. Beides überlebt
    // den Weltwechsel, der Raum nicht.
    this.leaveConstruct();
    this.construct?.dispose();
    this.construct = null;
    this.rack?.dispose();
    this.rack = null;
    for (const burst of this.bursts) burst.dispose();
    this.bursts.length = 0;
    this.dropGridLines();
    this.gridLineSkin?.dispose();
    this.gridLineSkin = null;
    this.wallGhosts.length = 0;
    for (const material of this.ghostPalette.values()) material.dispose();
    this.ghostPalette.clear();
    this.modelGhosts.dispose();
    this.modelCandidates.length = 0;
    this.placedScratch.length = 0;
    this.ghostBoxView?.dispose();
    this.ghostBoxView = null;
    this.rigLevel = 0;
    this.clearFixtures();
    this.dropBlockModels();
    this.dropFloorPlates();
    this.editor?.dispose();
    this.editor = null;
    this.grid = null;
    this.group = null;
    this.slabs.length = 0;
    this.batches.length = 0;
    this.ghostBatches.length = 0;
    this.ghostBatched.length = 0;
    this.ghostable.length = 0;
    this.batchable.length = 0;
    this.ghostBatchView = true;
    this.topDownView = false;
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
    const rows = super.menu();
    const base = this.editor ? [this.storeMenu(), ...rows] : rows;
    const open = this.reading;
    if (!open) return base;
    // **Ganz oben**, weil es der Grund ist, aus dem das Menü gerade aufging.
    return [
      {
        id: SIGN_PAGE,
        label: open.title,
        sub: 'Was auf dem Schild steht',
        icon: 'sign',
        accent: SIGN.accent,
        children: open.rows,
      },
      ...base,
    ];
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
 * Dieselbe Überlegung, die schon im Effektlabor galt: Mehr sind keine Wolken
 * mehr, sondern Nebel — und vier Düsen in einer Ecke schaffen das schneller,
 * als man denkt.
 */
const MAX_BURSTS = 8;

/**
 * Wie hoch über dem Boden einer Kachel noch zählt, wer **darauf** steht
 * (`standingOn`) — zwei Meter, also eine Person samt der Kiste, auf der sie
 * steht, und nicht mehr die Kachelgröße.
 */
const STAND_HEAD = 2;

/**
 * Wie weit die Gitterlinien über dem Boden liegen, in Metern.
 *
 * Ein Zentimeter: genug, dass die Linie nicht mit der Bodenplatte um dieselben
 * Bildpunkte streitet (Z-Fighting), und wenig genug, dass sie auf dem Boden
 * liegt und nicht darüber schwebt.
 */
const GRID_LINE_LIFT = 0.01;

/**
 * Worauf das Ghosting zielt: die **Mitte** der Figur über dem Rig, in Metern.
 *
 * Neun Zehntel — Brusthöhe. Auf die Füße zu zielen hieße, jede Bodenplatte und
 * jede Schwelle davor zu streifen; auf den Kopf zu zielen hieße, dass eine
 * Brüstung vor der Figur stehen bleibt, hinter der von ihr nichts mehr zu
 * sehen ist.
 */
const GHOST_AIM = 0.9;

/** Wie durchsichtig eine Wand wird, die im Weg steht. */
const GHOST_OPACITY = 0.25;

/**
 * Die Kennung der Seite, auf der ein aufgeschlagenes Schild steht.
 *
 * Eine feste und keine je Schild: Aufgeschlagen ist immer das zuletzt
 * benutzte, und eine Seite, deren Id sich ändert, verliert bei jedem Wechsel
 * ihre Blätterstellung (`ui/menuNav.ts`).
 */
const SIGN_PAGE = 'grid:sign';

const _target = new THREE.Vector3();
const _feet = new THREE.Vector3();
/** Der Kopf, wenn das Rig um den Versatz zwischen Kopf und Ursprung zu schieben ist. */
const _head = new THREE.Vector3();
const _spot = new THREE.Vector3();
/** Wo die Kamera steht, die das Bild zeichnet — für das Ghosting. */
const _eye = new THREE.Vector3();
const _turn = new THREE.Quaternion();

/**
 * **Ein gebauter Einbau**: seine Art, sein Zustand, sein Bild, seine Körper —
 * und die drei Marken, die genau ein Bild lang gelten.
 */
/**
 * **Ein Quader, der jemanden verdecken kann** — sein Bild, seine Sorte, sein
 * Kasten in Metern und ob er gerade durchsichtig ist (`wallGhost.ts`).
 */
interface GhostSlab extends GhostCandidate {
  mesh: THREE.Mesh;
  kind: PlanSolidKind;
  on: boolean;
}

/** **Ein hingestelltes Modell, das jemanden verdecken kann** (`modelGhost.ts`). */
interface ModelCandidate extends GhostCandidate {
  entry: PhysicsBody;
}

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

/**
 * **Die Materialien unter einem Knoten**, jedes einmal.
 *
 * Abgeschrieben von der Druckplatte (`fixtures/plate.ts`, `skinsOf`) und nicht
 * geteilt: Es sind acht Zeilen, und der gemeinsame Ort dafür wäre
 * `worlds/shared/environment.ts` — dort stehen die beiden Aufräumer, und
 * genau die dürfen hier nicht genommen werden. Sie halten an
 * `userData.sharedAssets` an, und darunter liegen die Netze, deren Materialien
 * gesucht sind.
 */
function modelSkins(root: THREE.Object3D): THREE.Material[] {
  const out = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const skin of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      out.add(skin);
    }
  });
  return [...out];
}
