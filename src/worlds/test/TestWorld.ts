import * as THREE from 'three';
import { GridWorld } from '../grid/GridWorld';
import type { GridPlan } from '../grid/gridPlan';
import type { PlanSolid, PlanSolidKind } from '../grid/solids';
import { createSky } from '../shared/environment';
import { DustTrail } from '../shared/dustTrail';
import { PLATE_TOP, PlateFloor } from '../shared/plateFloor';
import {
  plateAnchor,
  plateCapacity,
  plateSpots,
  type PlateSpot,
  type PlateTile,
} from '../shared/plateField';
import { TILE } from '../nav/navTile';
import { ALL_GROUPS, GROUP_WORLD } from '../../physics/PhysicsWorld';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import type { MenuEntry } from '../../ui/menu';
import type { FurnitureChange } from '../../core/worldChanges';
import { npcSkin } from '../npc/npcKinds';
import { FIELD, HORIZON_COLORS, KITCHEN_SPAWN, ZONE_LABELS, ZONE_TILES, centre } from './layout';
import { spawnAt } from './spawnAt';
import { floorPieceLift, floorPlate, PLATE_PROTOTYPE, underKitchenFloor } from './floorPlate';
import { KITCHEN_FLOOR } from './zones/kitchenPlan';
import { canLoadModels } from '../../core/chefFit';
import { clearPlanWalls, fitTest, testPlan } from './testPlan';
import { ensureWallLab, wallLabModels } from './zones/wallLab';
import { kitchenWallModels } from './zones/kitchenWalls';
import { ClimbZone } from './zones/climb';
import { InteractZone } from './zones/interact';
import { KartZone } from './zones/kart';
import { KitchenZone } from './zones/kitchen';
import { NavigationZone } from './zones/navigation';
import { RangeZone } from './zones/range';
import type { TestZone, ZoneHost } from './zones/zone';

/**
 * **Die Testwelt** — neun Zonen auf einem Gelände, und der Prüfstand dieser
 * Engine.
 *
 * Bis zum September 2026 gab es siebzehn Welten, und jede prüfte eine Sache:
 * eine für die Portale, eine für den Schießstand, eine fürs Klettern, eine für
 * die Wegsuche. Das war bequem zu bauen und unmöglich zu pflegen — wer am Kern
 * etwas änderte, lud siebzehn Welten hintereinander und hatte danach den
 * Verdacht, die entscheidende vergessen zu haben. Jetzt gibt es **eine**, und
 * man läuft sie in einer Minute ab (`testPlan.ts`, `zones/`).
 *
 * **Sie ist bebaubar** (`editable()`), und das ist der Sinn des Metergitters:
 * Wer eine feine Welt bauen will, braucht einen Ort, an dem er es probiert —
 * mit Karte und Palette am Gürtel, mit Speicher und mit einer Datei zum
 * Mitnehmen. Und weil ein gespeicherter Stand den ganzen Grundriss ersetzt,
 * steht alles, was auch danach noch gelten muss, in `planLoaded()`.
 *
 * **Die Zonen bekommen einen Vertrag und nicht diese Welt**
 * (`zones/zone.ts`, `ZoneHost`): Sie dürfen bauen, anmelden und melden, und
 * sonst nichts. Sechs von neun haben überhaupt Leben darin; die anderen drei
 * sind ein Stempel auf dem Grundriss und fertig.
 */
export class TestWorld extends GridWorld {
  /** Die Zonen mit Leben darin — in der Reihenfolge, in der sie gebaut werden. */
  private readonly interact = new InteractZone();
  private readonly navigation = new NavigationZone();
  private readonly range = new RangeZone();
  private readonly kart = new KartZone();
  private readonly climb = new ClimbZone();
  private readonly kitchen = new KitchenZone();
  private readonly zones: readonly TestZone[] = [
    this.interact,
    this.navigation,
    this.range,
    this.kart,
    this.climb,
    this.kitchen,
  ];

  /**
   * **Der Staub hinter der Figur** (`shared/dustTrail.ts`) — die Spur, an der
   * man von oben sieht, dass sie läuft.
   *
   * Er hängt an der **Welt** und nicht an der Küche, obwohl das Vorbild dort
   * steht (_Overcooked_): Gestaubt wird, wo gelaufen wird, und gelaufen wird
   * auf dem ganzen Gelände. Eine Spur, die an der Kachelgrenze der Küche
   * anfinge, wäre ein Effekt, dessen Regel man erraten müsste.
   */
  private dust: DustTrail | null = null;

  /**
   * **Der Plattenboden draußen** (`shared/plateFloor.ts`) — die Schürze aus
   * `Floor_Prototype`-Platten, die **mit der Figur wandert**
   * (`plateField.plateSpots`, `followPlates`).
   *
   * Nur außerhalb des Geländes: Darin legt die Gitterwelt ihre Platten
   * selbst, eine je gebauter Bodenkachel (`GridWorld.buildFloorPlates`,
   * `floorPlate.ts`). Zwei Lagen wären dort zwei Rechnungen für ein Bild.
   *
   * Er hängt an der **Testwelt** und nicht an der Basis, obwohl er in
   * `worlds/shared/` wohnt, und das ist die Antwort auf die Frage, wem er
   * gehört: Er braucht ein **Gelände**, um das er herumgelegt werden kann
   * (`layout.FIELD`) — und eine Welt ohne diese Kulisse, das Portal-Labor oder
   * der Editor, hat keines und soll sich auch nicht ändern. Die Datei nebenan
   * ist deshalb ein Angebot, und diese Welt ist die, die es bestellt.
   */
  private plates: PlateFloor | null = null;
  /** Um welche Kachel die Schürze gerade liegt — `null`, bis sie das erste Mal liegt. */
  private platesAround: PlateSpot | null = null;

  protected override worldId(): string {
    return 'test';
  }

  /**
   * **Aus dem Regal wird in der Küche ein Küchenmöbel** — und draußen ein
   * Fass wie bisher.
   *
   * Die Welt reicht die Frage nur weiter; die Antwort gibt die Zone, denn nur
   * sie weiß, ob die Figur in ihr steht und ob noch eine Kachel frei ist
   * (`zones/kitchen.takeShelfPiece`, `core/kitchenShelf.ts`).
   */
  protected override takeFurniture(_ctx: WorldContext, path: string): boolean {
    if (this.kitchen.takeShelfPiece(path)) return true;
    // **Wird es kein Möbel, geht ein frisches trotzdem aus den Händen**
    // (`scrapFresh`) — sonst trüge man gleich Herd und Fass.
    this.kitchen.scrapFresh();
    return false;
  }

  /**
   * **Eine eingefügte Weltänderung** — Möbel mit Kachel und Drehung hat nur
   * die Küche (`zones/kitchen.applyChange`, `core/worldChanges.ts`).
   */
  protected override applyFurnitureChange(change: FurnitureChange): boolean {
    return this.kitchen.applyChange(change);
  }

  protected override editorTitle(): string {
    return 'Testwelt';
  }

  protected override originalName(): string {
    return 'das ausgelieferte Gelände';
  }

  /**
   * **Hier wird gebaut.** Der Sinn des 1-m-Gitters ist, dass sich feine Welten
   * bauen lassen; ein Gelände mit neun Zonen darauf ist der Ort, an dem man das
   * ausprobiert, ohne bei einem leeren Zimmer anzufangen.
   */
  protected override editable(): boolean {
    return true;
  }

  protected override layout(): GridPlan {
    return testPlan();
  }

  /**
   * **Was auch dann noch gilt, wenn ein gespeicherter Stand den Grundriss
   * ersetzt hat.**
   *
   * `layout()` läuft vor dem Speicher, und was im Browser liegt, gewinnt und
   * **ganz** (`GridWorld.applyStored`). Ein Stand von letzter Woche kennt weder
   * das Tor zurück in den Hub noch die Einbauten, die eine Zone braucht —
   * hätte man einmal umgebaut, säße man danach in einem Gelände ohne Rückweg
   * und ohne Türen. Also werden alle Stempel noch einmal aufgesetzt: Sie
   * überschreiben gleichnamige Einbauten (`putFixture` ersetzt nach Kennung)
   * und legen sonst dazu.
   *
   * Der **Grundriss** selbst wird dabei nicht wiederhergestellt: Wer eine Wand
   * wegbaut, will sie weg haben. Was zurückkommt, sind die Sachen mit einer
   * **Kennung** (`fitTest`) — und genau damit das hier gehen kann, haben sie
   * eine: `putFixture` ersetzt nach Kennung, also entsteht kein zweites Tor
   * neben dem ersten. Bausteine und Massen stehen bewusst nicht darin; ein
   * zweites Mal gesetzt stünden sie zweimal da.
   */
  protected override planLoaded(plan: GridPlan): void {
    // Ein Stand von vor dem Wandparcours bekommt ihn dazu (`ensureWallLab`).
    ensureWallLab(plan);
    fitTest(plan);
    clearPlanWalls(plan);
  }

  /**
   * Draußen: Kies, Beton, Holz — kein Innenraumgrau.
   *
   * **Das Grün ist seit dem Plattenboden ein Ersatzteil.** Über jeder
   * Bodenkachel liegt eine Platte aus dem Regal (`floorPlate.ts`), und der
   * Quader darunter wird unsichtbar, sobald sie da ist
   * (`GridWorld.buildFloorPlates`). Zu sehen ist dieser Ton deshalb nur noch
   * dort, wo es keine Platten gibt: in einem Checkout ohne die gekauften
   * Pakete und in der Sekunde, bevor die Datei ankommt. Genau dafür bleibt er
   * stehen — ein Gelände, das erst grün ist und dann blau wird, ist besser als
   * eines, das eine Sekunde lang gar nicht da ist.
   */
  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return { floor: 0x7c8a6a, stone: 0x9a9481, wood: 0x8a5f38, wall: 0xb3b8c2 };
  }

  /**
   * **Welche Platte auf welcher Bodenkachel liegt** — die ganze Entscheidung
   * steht nebenan und rechnet ohne three.js (`floorPlate.ts`).
   *
   * Hier steht nur die Weitergabe, und das ist der Punkt: Was „Küche",
   * „Podest" und „Gelände" heißt, weiß diese Welt; wie daraus ein Bündel wird,
   * weiß die Gitterwelt; und dazwischen liegt eine Funktion, die man in
   * Millisekunden prüfen kann.
   */
  protected override floorPlate(tile: PlateTile): string | null {
    return floorPlate(tile);
  }

  /**
   * **Unter dem Belag der Küche wird nichts gezeichnet** (`floorPlate.underKitchenFloor`)
   * — aber nur, wenn es den Belag gibt: Ohne WebGL baut ihn die Küche nicht
   * (`kitchenFloor.ts`), und dann ist der Estrich der Boden, den man sieht.
   */
  protected override underOwnFloor(solid: PlanSolid): boolean {
    return canLoadModels() && underKitchenFloor(solid, KITCHEN_FLOOR);
  }

  /**
   * **Wie hoch ein Bodenstück aus dem Regal liegt** — auf dem Grundriss, und
   * in der Küche einen Hauch über ihrem Belag (`floorPlate.floorPieceLift`).
   */
  protected override floorTopAt(
    tiles: readonly { x: number; z: number }[],
    below: number,
  ): number | null {
    const top = super.floorTopAt(tiles, below);
    return top === null ? null : top + floorPieceLift(tiles);
  }

  /**
   * **Wo man ankommt** — in der **Küche**, oder auf der Kachel, die in der
   * Adresse steht (`spawnAt.ts`, `?at=`).
   *
   * **Hier stand der Startplatz im Süden**, und das war die Ankunft für den,
   * der sich das Gelände ansieht: Schild, Tor, neun Zonen ringsum. Wer diese
   * Welt öffnet, kommt aber nicht als Besucher — sie ist der Prüfstand, und
   * geprüft wird in der Küche. Seit die Seite ohne Adresse mit der Testwelt
   * aufmacht (`worlds/index.DEFAULT_WORLD`), wäre der Startplatz der zweite
   * Umweg hintereinander: erst die Welt suchen, dann dreißig Meter nach Norden
   * laufen.
   *
   * Die Kachel ist dieselbe, auf die auch das Sprungmenü und `?at=kitchen`
   * setzen (`layout.KITCHEN_SPAWN`) — eine Küche, die umzieht, nimmt alle drei
   * mit. Der Startplatz bleibt dabei, was er war: der Anker seiner Zone und
   * der Ort mit dem Tor zum Hub, nur nicht mehr das Erste, was man sieht.
   *
   * Die Adresse darf dagegen **jede** Kachel nennen: Sie ist das Werkzeug
   * dessen, der die Welt prüft, und der weiß, wo er hinwill. Steht dort
   * Unsinn, gilt die Küche — geraten wird nicht.
   */
  protected override spawnPoint(): THREE.Vector3 {
    const at = spawnAt(typeof location === 'undefined' ? '' : location.search);
    if (!at) return new THREE.Vector3(centre(KITCHEN_SPAWN.x), 0, centre(KITCHEN_SPAWN.z));
    // Die Ebene kommt aus dem Graphen und nicht aus einer Zahl hier: Das Deck
    // des Podests liegt oben, und wer auf y = 0 daruntersetzt, steckt drin.
    const y = this.grid?.graph.levelY(at.level) ?? 0;
    return new THREE.Vector3(centre(at.x), y, centre(at.z));
  }

  protected override spawnYaw(): number {
    // **Nach Norden**, und das passt für beide Ankünfte: In der Küche liegt
    // dort die Zeile mit Herd, Spüle und Arbeitsplatte, am Startplatz das
    // Schild mit den Effektquellen dahinter.
    return 0;
  }

  protected override skyColor(): number {
    return 0x9dbfe4;
  }

  /**
   * **Draußen ist die Platte, gemalt** — ein Meter je Feld
   * (`shared/environment.createGround`).
   *
   * Hier lag einmal eine olivgrüne Wiese mit einem Raster von vier Metern,
   * danach ein Schachbrett in Grau und Weiß nach dem Vorbild des
   * Prüfkammerbodens aus Portal. Beides ist Geschichte, und beide Male aus
   * demselben Grund: **Ein Raster daneben, das nicht dazu passt, ist schlimmer
   * als keines.** Gebaut wird auf einem Metergitter (`worlds/grid/`), gelaufen
   * wird inzwischen auf echten Platten von einer Kachel
   * (`shared/plateFloor.ts`) — und was hinter ihnen bis zum Horizont steht,
   * soll ihre Fortsetzung sein und nicht ihr Rand. Die drei Farben kommen
   * deshalb **von der Platte selbst** (`layout.HORIZON_COLORS`,
   * `shared/plateField.PLATE_FACE`).
   *
   * **Die Küche hat ein zweites Brett**, und die beiden grenzen unmittelbar
   * aneinander (`zones/kitchenFloor.ts`): halbe Felder, warme und dunkle Töne,
   * damit der Küchenboden ein Küchenboden bleibt und nicht die Fortsetzung
   * dieses hier wird. Ein Test misst das eine gegen das andere — und deshalb
   * stehen die Farben in `layout.ts` und nicht in diesen drei Methodenrümpfen.
   */
  protected override horizonColor(): number {
    return HORIZON_COLORS.ground;
  }

  protected override horizonChecker(): number {
    return HORIZON_COLORS.checker;
  }

  protected override horizonLine(): number {
    return HORIZON_COLORS.line;
  }

  protected override lightIntensity(): number {
    return 1.15;
  }

  protected override welcome(): string {
    return 'Testwelt · A benutzt alles · Norden Effekte und Küche, Osten Schießstand, Süden Gokart';
  }

  /**
   * **Was am Gürtel hängt**: die beiden Portalwaffen und die Pistole.
   *
   * Drei, weil es drei Zonen gibt, die eine Waffe brauchen — die Portaltafeln,
   * der Schießstand und die Kugel, mit der man einen Knopf hinter Glas drückt
   * (die Portal-Regel). Alles andere steht im Regal am Handgelenk und in der
   * Liste hinter dem Werkzeug-Knopf.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['gun-blue', 'left'],
      ['gun-red', 'right'],
      ['pistol', 'right'],
    ];
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.root.add(createSky(0x6ea8e8, 0xdbe7f2));
  }

  /** **Hier entsteht das Leben der Zonen** — Requisiten, Uhren, Anmeldungen. */
  protected override buildProps(): void {
    const ctx = this.context;
    if (!ctx || !this.physics) return;
    const host = this.zoneHost();
    for (const zone of this.zones) zone.build(ctx, host);
    // **Der Wandparcours aus dem Regal** (`zones/wallLab.ts`). Steht schon ein
    // Stück an seiner Stelle, kommt kein zweites (`placeModel`).
    for (const wall of [...wallLabModels(), ...kitchenWallModels()])
      this.placeModel(wall.path, new THREE.Vector3(wall.x, wall.y, wall.z), wall.yaw);
    this.dust ??= new DustTrail(this.root);
    // **Und der Boden draußen bekommt Platten** (`shared/plateFloor.ts`).
    //
    // Hier und nicht in `buildEnvironment`, obwohl eine Schürze Kulisse ist
    // und keine Requisite: Der Riegel drei Zeilen weiter oben ist zugleich der
    // Unterschied zwischen der laufenden Welt und einer **Vorschau** — in
    // `PortalWorld.preview` steht kein `context`, und deshalb bauen dort schon
    // die Zonen und der Staub nicht. Für das Standbild auf der Werkzeugseite
    // sind neuntausend Platten zu viel, und aufgeräumt wird eine Vorschau
    // allein mit `disposeTree` — das die Instanzpuffer eines Bündels gar
    // nicht kennt.
    //
    // **Leer angelegt und so groß, wie sie je wird** (`plateCapacity`): Wo
    // sie liegt, entscheidet erst das erste Bild (`followPlates`), und dann
    // jedes, in dem die Figur ein paar Kacheln weiter ist.
    this.plates ??= new PlateFloor(this.root, PLATE_PROTOTYPE, [], {
      capacity: plateCapacity(),
    });
    this.platesAround = null;
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    for (const zone of this.zones) zone.update?.(dt, ctx);
    this.trailDust(dt, ctx);
    this.followPlates(ctx);
  }

  /**
   * **Die Schürze zieht der Figur nach** — gemeldet war: „die prototype floor
   * tiles sind nicht überall zu sehen". Sie waren ein fester Ring von 48 m um
   * das Gelände, und wer weiter hinauslief, stand am Ende auf der Leinwand.
   *
   * Jetzt liegen sie als Quadrat um die Kachel der Figur, und nachgezogen
   * wird erst nach ein paar Kacheln (`plateField.plateAnchor`,
   * `PLATE_STEP`): Neuntausend Matrizen je Kachelwechsel wären an einer Fuge
   * ein Flackern der Bildrate. Ausgelassen wird das Gelände — dort liegen
   * seine eigenen Platten, eine je Bodenkachel.
   *
   * **In Metern und nicht in Kacheln**: `FIELD` steht im Kachelgitter, und
   * dass eine Kachel ein Meter ist, sagt `nav/navTile.TILE` und nicht diese
   * Zeile.
   */
  private followPlates(ctx: WorldContext): void {
    if (!this.plates) return;
    const at = plateAnchor(this.platesAround, ctx.rig.position.x, ctx.rig.position.z);
    if (!at) return;
    this.platesAround = at;
    const field = { x: FIELD.x * TILE, z: FIELD.z * TILE, w: FIELD.w * TILE, d: FIELD.d * TILE };
    this.plates.reseat(
      plateSpots(field, at).map((spot) => ({ x: spot.x, y: PLATE_TOP, z: spot.z })),
    );
  }

  /**
   * **Wo die Füße stehen und ob sie gehen** — mehr braucht die Spur nicht.
   *
   * Die Füße sind nicht `rig.position`: Das Gestell sinkt beim Ducken, der
   * Boden tut es nicht (`PlayerRig.getFloorY`). Und gelaufen wird nur zu Fuß —
   * `wishing` ist der eine Merker, den alle vier Steuerungen setzen (Brille,
   * Maus, Pad, Bordstock), `seated` schließt das Kart aus. Wer im Kart sitzt,
   * fährt; sein Staub käme von den Reifen und nicht von den Schuhen, und den
   * gibt es hier (noch) nicht.
   */
  private trailDust(dt: number, ctx: WorldContext): void {
    const dust = this.dust;
    if (!dust) return;
    const rig = ctx.rig;
    _feet.set(rig.position.x, rig.getFloorY(), rig.position.z);
    dust.update(dt, _feet, rig.wishing && rig.seated <= 0.01);
  }

  /** `B`/`Y`: Karts in die Box, Kisten und Scheiben zurück, Hände auf. */
  protected override worldReset(): void {
    for (const zone of this.zones) zone.reset?.();
  }

  /**
   * **Eine Kugel zählt hier zuerst auf dem Schießstand** und danach wie
   * überall.
   *
   * Die Reihenfolge ist die Aussage: Eine Scheibe ist ein Ziel, ein NPC ist
   * eines, und ein Knopf hinter Glas auch — aber wer auf eine Scheibe schießt,
   * meint die Scheibe.
   */
  protected override bulletTravelled(
    from: THREE.Vector3,
    to: THREE.Vector3,
    damage?: number,
  ): boolean {
    if (this.range.bulletTravelled(from, to)) return true;
    return super.bulletTravelled(from, to, damage);
  }

  override menu(): MenuEntry[] {
    return [...super.menu(), this.jumpMenu(), ...this.kart.menu()];
  }

  /**
   * **Der Sprung zu einer Zone** — neun Ziele, eines je Zone (`layout.ZONE_TILES`).
   *
   * Das Gelände misst 64 × 80 m, und die Küche liegt ganz im Norden hinter dem
   * Podest: Wer sie ansehen will, läuft eine knappe Minute quer über den Platz,
   * an drei Zonen vorbei, die er gerade nicht meint. Für den Prüfstand dieser
   * Engine ist das die falsche Minute — man kommt her, um **eine** Sache
   * anzusehen (`docs/plan-2d-hub-interaktion.md`: die Testwelt ist der
   * Prüfstand, nicht die Reise).
   *
   * **Die Ziele sind dieselben Kacheln, an denen der Grundrisstest misst**, ob
   * eine Zone überhaupt erreichbar ist (`testPlan.test.ts`). Das ist kein
   * Zufall, sondern der Grund, warum es diese Liste schon gab: Eine Kachel, auf
   * die man springt, und eine, zu der man laufen kann, sollen dieselbe sein —
   * sonst setzt einen der Sprung irgendwann dorthin, wo der Weg gar nicht
   * hinführt.
   *
   * **Die Höhe kommt aus dem Graphen** (`NavGraph.levelY`) und nicht aus einer
   * Zahl hier: Das Podest liegt auf Ebene 1, und wer dorthin auf y = 0 spränge,
   * stünde **unter** seinem eigenen Deck.
   *
   * Es ist ein **Menüeintrag** und kein Werkzeug am Gürtel: Ein Sprung ist
   * nichts, was man im Spiel tut, sondern etwas, mit dem man das Spiel aufsucht.
   */
  private jumpMenu(): MenuEntry {
    return {
      id: 'test:jump',
      label: 'Zu einer Zone',
      sub: 'Neun Ziele auf dem Gelände',
      icon: 'teleport',
      accent: 0x7cc4ff,
      children: Object.entries(ZONE_TILES).map(([id, tile]) => ({
        id: `test:jump:${id}`,
        label: ZONE_LABELS[id] ?? id,
        sub: `Kachel ${tile.x} / ${tile.z}`,
        icon: 'teleport',
        run: () => this.jumpTo(id, tile),
      })),
    };
  }

  /** Und der Sprung selbst — dieselbe Bewegung, die auch ein Portal macht. */
  private jumpTo(id: string, tile: { x: number; z: number; level: number }): void {
    const ctx = this.context;
    if (!ctx) return;
    const y = this.grid?.graph.levelY(tile.level) ?? 0;
    this.movePlayerTo(ctx, new THREE.Vector3(centre(tile.x), y, centre(tile.z)));
    this.announce(`${ZONE_LABELS[id] ?? id}: angekommen`);
  }

  override dispose(ctx: WorldContext): void {
    for (const zone of this.zones) zone.dispose();
    this.dust?.dispose();
    this.dust = null;
    // **Vor `super.dispose`**, und das ist bei den Platten keine Stilfrage:
    // Dort räumt am Ende `disposeTree` auf, und das kennt weder die
    // Instanzpuffer eines Bündels noch die Reihenfolge, in der sie weg müssen
    // (`shared/plateFloor.PlateFloor.dispose`).
    this.plates?.dispose();
    this.plates = null;
    this.platesAround = null;
    super.dispose(ctx);
  }

  // --- der Vertrag der Zonen (`zones/zone.ts`) -------------------------------

  /**
   * **Was eine Zone von dieser Welt sieht** — und mehr nicht.
   *
   * Ein Objekt und nicht `this`, obwohl `this` alles davon hat. Der Unterschied
   * ist die **Reichweite**: Wer `this` hereingäbe, hätte Zonen, die den Editor
   * anwerfen, die Portale versetzen und das Menü umbauen können — und nach dem
   * dritten Umbau hätte eine davon etwas daran verstellt, und niemand wüsste
   * welche. Dieselbe Entscheidung wie bei den Einbauten
   * (`grid/fixtures/index.ts`, `FixtureBuild`).
   *
   * Es entsteht **einmal** und nicht je Zone: Es hält keinen Zustand, und neun
   * Kopien derselben neun Funktionen wären neun Kopien.
   */
  private zoneHost(): ZoneHost {
    return (this.hostForZones ??= {
      root: this.root,
      physics: this.physics!,
      solids: this.solids,
      addProp: (entry, id) => {
        this.registerProp(entry, id);
        return entry;
      },
      // **Und nicht geteilt**: Was hier wieder herausgeht, ist nie über das
      // Netz entstanden. Die Stücke einer zersprungenen Scheibe gibt es nur
      // dort, wo auch der Treffer gezählt wurde — ein `despawned` an die
      // anderen wäre eine Nachricht über einen Gegenstand, den sie nie hatten.
      removeProp: (entry) => {
        this.removeProp(entry, false);
      },
      addSolid: (object) => {
        this.solids.push(object);
        return this.physics!.addStatic(object, { membership: GROUP_WORLD, filter: ALL_GROUPS });
      },
      removeSolid: (object, body) => {
        const at = this.solids.indexOf(object);
        if (at >= 0) this.solids.splice(at, 1);
        this.physics?.remove(body);
      },
      addUsable: (object, usable, options) => this.addUsable(object, usable, options),
      removeUsable: (object) => this.removeUsable(object),
      enterConstruct: (options) => this.enterConstruct(options),
      leaveConstruct: () => this.leaveConstruct(),
      inConstruct: () => this.inConstruct,
      notify: (message) => this.announce(message),
      announce: (message) => this.announce(message),
      askNumber: (options) => this.askNumber(options),
      placePlayer: (at, yaw) => {
        if (this.context) this.movePlayerTo(this.context, at, yaw);
      },
      setFlight: (velocity) => this.host?.setFlight(velocity),
      playerVelocity: (target) => {
        this.host?.playerVelocity(target);
        return target;
      },
      onGround: () => this.host?.onGround() ?? false,
      sendNpc: (from, to) => this.sendNpc(from, to),
      clearNpcs: () => this.director?.clear() ?? 0,
    });
  }

  private hostForZones: ZoneHost | null = null;

  /**
   * **Einen NPC von A nach B schicken.**
   *
   * Hirn und Haut kommen aus der Welt und nicht aus der Zone: eine
   * Übungspuppe, die nichts tut als laufen (`npc/npcKinds.ts`), und das Hirn
   * `errand`, das genau das kann. Das Tempo kommt aus der **Haut** — ohne diese
   * Zeile liefen alle NPCs gleich schnell, egal wie sie aussehen.
   */
  private sendNpc(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const director = this.director;
    if (!director) return false;
    return (
      director.spawn({
        kind: 'dummy',
        brain: 'errand',
        at: from.clone(),
        errand: to.clone(),
        yaw: Math.atan2(-(to.x - from.x), -(to.z - from.z)),
        speed: npcSkin('dummy').speed,
      }) !== null
    );
  }
}

/** Einer für alle: Wer je Bild einen Vektor baut, baut je Bild einen Vektor. */
const _feet = new THREE.Vector3();
