import * as THREE from 'three';
import { GridWorld } from '../grid/GridWorld';
import { TextPlane } from '../../ui/TextPlane';
import { createGround, createSky, disposeTree } from '../shared/environment';
import { ALL_GROUPS, GROUP_WORLD } from '../../physics/PhysicsWorld';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import type { NavGraph } from '../nav/navGraph';
import { readNav } from '../nav/navSerial';
import { GridPlan } from '../grid/gridPlan';
import type { PlanSolidKind } from '../grid/solids';
import { starterGrid } from './starterGrid';

/**
 * **Der Bauplatz** — ein Level bauen, während man darin steht.
 *
 * Die Welt beantwortete eine Frage, die es hier lange nur als Zeile unter „was
 * noch fehlt" gab: *Wie sieht man einen Grundriss von oben, wenn man selbst
 * darin steht?* Die Antwort ist ein **Tischmodell**: Der Grundriss steht als
 * Miniatur vor einem in der Luft, man greift hinein, schiebt sie, dreht sie,
 * zieht sie größer — und was man an ihr baut, wächst im selben Augenblick **in
 * Lebensgröße** um einen herum.
 *
 * **In der dritten Fassung ist von dieser Welt fast nichts mehr übrig**, und
 * das ist ihr Erfolg und nicht ihr Ende. Die ganze Bedienung — Karte, Palette,
 * Tischmodell, Spielfigur, Malen und Flächen — steht jetzt in
 * `WorldEditor.ts` und hängt an **jeder** Gitterwelt (`grid/GridWorld.ts`).
 * Wer im Dunkelhaus merkt, dass der Gang zu eng ist, verbreitert ihn dort,
 * statt ihn hier nachzubauen. Übrig bleibt an dieser Stelle das, was den
 * Bauplatz vom Umbauen einer fertigen Welt unterscheidet:
 *
 * - **Er fängt bei einem Zimmer an** (`starterGrid.ts`) und nicht bei einem
 *   Haus, das schon steht.
 * - **Er merkt sich, was gebaut wurde** (`localStorage`, im Format von
 *   `nav/navSerial.ts`). Wer zwanzig Minuten baut und die Brille absetzt, soll
 *   seinen Grundriss wiederfinden.
 * - **Beim Bearbeiten steht man in einem weißen Raum.** Solange die Karte
 *   draußen ist, wird das Level unsichtbar und kommt aus der Physik heraus;
 *   übrig bleibt ein Boden bis zum Horizont und ein weißer Himmel. Wer einen
 *   Grundriss von Grund auf zieht, steht nicht gleichzeitig darin — er stünde
 *   sonst mit dem Kopf in einer Wand, die er gerade selbst gesetzt hat, und
 *   sähe vom Modell nichts mehr. Beim Umbauen eines fertigen Hauses ist es
 *   genau andersherum, und deshalb tut das nur diese Welt.
 * - **Kein Gürtel voller Werkzeuge**: Beide Haken bleiben frei, und dort
 *   hängen Karte und Palette. Das ist der Unterschied, an dem man den
 *   Bauplatz in der Brille erkennt — anderswo kommt die Karte aus dem Menü.
 */
export class EditorWorld extends GridWorld {
  /** Die Kulisse, die es zweimal gibt: das Level, und der weiße Raum darum. */
  private darkGround: THREE.Object3D | null = null;
  private darkSky: THREE.Object3D | null = null;
  private whiteGround: THREE.Object3D | null = null;
  private whiteSky: THREE.Object3D | null = null;
  private sign: TextPlane | null = null;
  /** Wann zuletzt geschrieben wurde — beim Malen wäre jedes Bild eines zu viel. */
  private wrote = 0;
  /** Ob gerade ein Stand aus der Zeit vor dem Weltformat hereingekommen ist. */
  private migrated = false;

  /**
   * Der Bauplatz heißt im Speicher wie überall sonst — und `GridWorld` legt
   * ihn dort ab (`grid/worldStore.ts`), genau wie jede andere Gitterwelt.
   */
  protected override worldId(): string {
    return 'editor';
  }

  /**
   * **Ein Zimmer und nicht das Nichts.**
   *
   * Eine leere Ebene beantwortet die erste Frage nicht, die jeder hat — *wie
   * sieht denn eine Wand hier aus?* Was ein früherer Besuch gebaut hat, kommt
   * nicht von hier, sondern aus dem Speicher (`GridWorld.applyStored`); nur
   * ein Stand aus der Zeit **vor** dem Weltformat wird noch hier übernommen.
   */
  protected override layout(): GridPlan {
    const old = oldSaved();
    this.migrated = old !== null;
    return old ?? starterGrid();
  }

  /**
   * **Der Bauplatz sieht aus wie ein Bauplan** und nicht wie ein Zimmer.
   *
   * Kühle Töne für Boden, Wand und Tür — man baut hier an einem Plan. Alles,
   * was daraufgestellt wird, behält dagegen die Farbe, die es später in der
   * fertigen Welt hat: Sonst baut man eine Küche in Grau und sieht sie zum
   * ersten Mal, wenn man sie lädt.
   */
  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return { floor: 0x39415a, wall: 0x6a7590, door: 0xe58aa8 };
  }

  protected override editorTitle(): string {
    return 'Bauplatz';
  }

  /** „Verwerfen" führt hier nicht zu einem Haus zurück, sondern zum Startzimmer. */
  protected override originalName(): string {
    return 'das Startzimmer';
  }

  // --- was die Welt ausmacht ------------------------------------------------

  protected override spawnPoint(): THREE.Vector3 {
    // Im Startzimmer, mit Blick auf seine Nordwand.
    return new THREE.Vector3(0, 0, 4);
  }

  protected override spawnYaw(): number {
    return 0;
  }

  protected override skyColor(): number {
    return 0x0f1420;
  }

  protected override lightIntensity(): number {
    return 1.15;
  }

  protected override welcome(): string {
    return 'Bauplatz · Karte und Palette hängen am Gürtel · Greifen holt sie heraus';
  }

  /**
   * **Kein Gürtel voller Werkzeuge.**
   *
   * Der Greifknopf gehört hier der Karte, der Palette und der Figur, und ein
   * Werkzeug in der Hand nähme ihn weg. Die beiden Hüften sind trotzdem
   * belegt — nur nicht mit Werkzeugen aus dem Kasten, sondern mit dem, was
   * der Bearbeitungsmodus selbst mitbringt.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  /**
   * **Der Plan ist die Karte** — kein Abtasten.
   *
   * `bakeNavigation()` hat gerade aus den gebauten Quadern einen Graphen
   * gemacht; der wird hier weggeworfen und durch den Plan ersetzt. Das ist
   * nicht Verschwendung, sondern die Aussage dieser Welt: Was der Editor
   * hinstellt, *ist* die Karte. Ein abgetasteter Graph wüsste nichts von den
   * Türen (ein Quader sagt nicht, dass er zugehen kann) und ginge bei jeder
   * Änderung neu — der Plan ändert sich einfach mit.
   */
  protected override navReady(_graph: NavGraph): void {
    if (this.grid) this.nav = this.grid.graph;
  }

  /**
   * **Der Boden bis zum Horizont kommt hier selbst** — zwei Zentimeter tiefer.
   *
   * `PortalWorld` legt ihn sonst mit seiner Oberkante auf genau null, und dort
   * liegt auch die Oberkante jeder Bodenplatte des Plans. Zwei Flächen auf
   * derselben Höhe streiten sich um jedes Pixel, und das Ergebnis flimmert über
   * den ganzen Grundriss. Zwei Zentimeter Abstand beenden den Streit, und
   * heruntertreten kann man sie nicht.
   *
   * Weg lassen kann man ihn nicht: Wer alle Kacheln löscht, stünde sonst über
   * dem Nichts.
   */
  protected override horizonColor(): number | null {
    return null;
  }

  protected override buildEnvironment(): void {
    const ground = createGround(0x2a3346, { line: 0x3d4a63 });
    ground.position.y -= 0.02;
    ground.updateMatrixWorld(true);
    this.root.add(ground);
    this.physics?.addStatic(ground, { membership: GROUP_WORLD, filter: ALL_GROUPS });
    this.darkGround = ground;

    // **Der weiße Raum**, und er liegt von Anfang an da: eine zweite Fläche
    // genau auf der ersten und ein zweiter Himmel um sie herum. Umgeschaltet
    // wird nur die Sichtbarkeit — ein Boden, der beim Aufklappen der Karte
    // erst gebaut werden müsste, wäre ein Ruckler an genau der Stelle, an der
    // man ihn am wenigsten braucht. Einen eigenen Körper bekommt er nicht: Er
    // liegt auf demselben Millimeter wie der dunkle, und dessen Körper trägt
    // für beide.
    const white = createGround(0xeef1f6, { line: 0xd4dae6 });
    white.position.y -= 0.02;
    white.visible = false;
    this.root.add(white);
    this.whiteGround = white;

    const darkSky = createSky(0x141c2c, 0x39d0ff);
    this.root.add(darkSky);
    this.darkSky = darkSky;

    const whiteSky = createSky(0xffffff, 0xe8ecf3);
    whiteSky.visible = false;
    this.root.add(whiteSky);
    this.whiteSky = whiteSky;

    const sign = new TextPlane({
      width: 5,
      height: 1.5,
      title: 'Bauplatz',
      body: 'Karte von der Hüfte ziehen. Eine Hand trägt, zwei drehen und zoomen.',
      accent: 0x39d0ff,
    });
    sign.position.set(0, 2.6, -12.5);
    this.root.add(sign);
    this.sign = sign;

    super.buildEnvironment();
  }

  /** Diese Welt bringt nichts zum Herumwerfen mit. */
  protected override buildProps(): void {}

  /**
   * **Beim Bearbeiten steht man in einem weißen Raum.**
   *
   * Der Unterschied zu jeder anderen Gitterwelt, und der einzige, der übrig
   * geblieben ist: Dort baut man an einem Haus, das steht, und will es dabei
   * sehen. Hier zieht man einen Grundriss von Grund auf, und ein Kopf in einer
   * gerade gesetzten Wand sieht vom Modell nichts mehr.
   */
  protected override editingChanged(on: boolean): void {
    // Die Quader gehen schon dort weg (`GridWorld`); hier kommt nur der weiße
    // Raum dazu, in dem man danach steht.
    super.editingChanged(on);
    if (this.darkGround) this.darkGround.visible = !on;
    if (this.darkSky) this.darkSky.visible = !on;
    if (this.whiteGround) this.whiteGround.visible = on;
    if (this.whiteSky) this.whiteSky.visible = on;
    if (this.sign) this.sign.visible = !on;
  }

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // Ein Stand aus der Zeit vor dem Weltformat ist gerade in `layout()`
    // hereingekommen; einmal im neuen Format geschrieben, und der alte
    // Eintrag hat seine Schuldigkeit getan.
    if (this.migrated) {
      this.saveWorld(true);
      forgetOld();
      this.migrated = false;
    }
  }

  /**
   * **Der Bauplatz schreibt auch beim Bauen** und nicht nur beim Weglegen der
   * Karte.
   *
   * Hier baut man von Grund auf, oft eine halbe Stunde am Stück und ohne die
   * Karte dazwischen wegzulegen — und wer dabei die Brille absetzt, hat sonst
   * nichts. Ein paar Sekunden Abstand genügen: Ein gemalter Strich sind
   * sechzig Änderungen in der Sekunde, und der ganze Grundriss durch
   * `JSON.stringify` ist keine Zeile, die sechzigmal laufen darf.
   */
  protected override planEdited(): void {
    const now = Date.now();
    if (now - this.wrote < SAVE_EVERY) return;
    this.wrote = now;
    this.saveWorld(true);
  }

  override dispose(ctx: WorldContext): void {
    this.saveWorld(true);
    if (this.sign) disposeTree(this.sign);
    this.sign = null;
    this.darkGround = null;
    this.darkSky = null;
    this.whiteGround = null;
    this.whiteSky = null;
    super.dispose(ctx);
  }
}

/** Wo der Bauplatz vor dem Weltformat lag. */
const OLD_KEY = 'vr-bauplatz-plan';
/** Wie viel Zeit zwischen zwei Schreibvorgängen mindestens liegt, in Millisekunden. */
const SAVE_EVERY = 2000;

/** Den alten Eintrag wegräumen, sobald er im neuen Format steht. */
function forgetOld(): void {
  try {
    window.localStorage.removeItem(OLD_KEY);
  } catch {
    // Kein Speicher, also auch nichts wegzuräumen.
  }
}

/**
 * **Ein Stand aus der Zeit vor dem Weltformat.**
 *
 * Der Bauplatz hatte einmal seinen eigenen Speicher: die nackte Karte
 * (`nav/navSerial.ts`) und das Mobiliar daneben, ohne Version und ohne Massen.
 * Den gibt es nicht mehr — aber wer zwei Wochen an einem Grundriss gebaut hat,
 * verliert ihn nicht, weil das Programm inzwischen ein richtiges Format hat.
 * Also wird er **einmal** gelesen, im neuen Format geschrieben und danach
 * weggeräumt (`EditorWorld.init`).
 *
 * Die eine Annahme dabei: Die Kacheln des alten Standes gelten als **blanker
 * Boden**, ihre Kosten werden neu gerechnet. Das ist richtig, weil in den
 * gespeicherten Kosten die Aufschläge der Bausteine schon steckten — genau das
 * ist der Grund, warum es das neue Format gibt.
 */
function oldSaved(): GridPlan | null {
  let raw: unknown = null;
  try {
    const text = window.localStorage.getItem(OLD_KEY);
    if (!text) return null;
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const box = raw as { nav?: unknown; blocks?: unknown };
  const navPart = box && typeof box === 'object' && 'nav' in box ? box.nav : raw;
  let graph: NavGraph;
  try {
    graph = readNav(navPart);
  } catch {
    return null;
  }
  if (graph.size === 0) return null;
  return GridPlan.from(graph, Array.isArray(box?.blocks) ? box.blocks : []);
}
