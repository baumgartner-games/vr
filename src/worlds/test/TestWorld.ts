import * as THREE from 'three';
import { GridWorld } from '../grid/GridWorld';
import type { GridPlan } from '../grid/gridPlan';
import type { PlanSolidKind } from '../grid/solids';
import { createSky } from '../shared/environment';
import { ALL_GROUPS, GROUP_WORLD } from '../../physics/PhysicsWorld';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import type { MenuEntry } from '../../ui/menu';
import { npcSkin } from '../npc/npcKinds';
import { SPAWN, centre } from './layout';
import { fitTest, testPlan } from './testPlan';
import { ClimbZone } from './zones/climb';
import { InteractZone } from './zones/interact';
import { KartZone } from './zones/kart';
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
 * sonst nichts. Fünf von neun haben überhaupt Leben darin; die anderen vier
 * sind ein Stempel auf dem Grundriss und fertig.
 */
export class TestWorld extends GridWorld {
  /** Die Zonen mit Leben darin — in der Reihenfolge, in der sie gebaut werden. */
  private readonly interact = new InteractZone();
  private readonly navigation = new NavigationZone();
  private readonly range = new RangeZone();
  private readonly kart = new KartZone();
  private readonly climb = new ClimbZone();
  private readonly zones: readonly TestZone[] = [
    this.interact,
    this.navigation,
    this.range,
    this.kart,
    this.climb,
  ];

  protected override worldId(): string {
    return 'test';
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
    fitTest(plan);
  }

  /** Draußen: Kies, Beton, Holz — kein Innenraumgrau. */
  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return { floor: 0x7c8a6a, stone: 0x9a9481, wood: 0x8a5f38, wall: 0xb3b8c2 };
  }

  protected override spawnPoint(): THREE.Vector3 {
    // Die Mitte des Startplatzes — nie eine Torkachel, dafür sorgt der
    // Grundriss (`zones/start.ts`, mit Test).
    return new THREE.Vector3(centre(SPAWN.x), 0, centre(SPAWN.z));
  }

  protected override spawnYaw(): number {
    // Nach Norden, also auf das Schild und die Effektquellen dahinter.
    return 0;
  }

  protected override skyColor(): number {
    return 0x9dbfe4;
  }

  protected override horizonColor(): number {
    return 0x6c7a5c;
  }

  protected override horizonLine(): number {
    return 0x8b9a78;
  }

  protected override lightIntensity(): number {
    return 1.15;
  }

  protected override welcome(): string {
    return 'Testwelt · A benutzt alles · Norden Effekte, Osten Schießstand, Süden Gokart';
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

  /**
   * **Womit die Bildschirmhand anfängt**: die rote Portalwaffe.
   *
   * Nicht die Pistole, obwohl es hier einen Schießstand gibt: Was man von oben
   * zuerst ausprobiert, sind die Portale, und wer schießen will, wählt die
   * Pistole mit einem Druck im Werkzeug-Knopf.
   */
  protected override defaultScreenTool(): string | null {
    return 'gun-red';
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
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    for (const zone of this.zones) zone.update?.(dt, ctx);
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
    return [...super.menu(), ...this.kart.menu()];
  }

  override dispose(ctx: WorldContext): void {
    for (const zone of this.zones) zone.dispose();
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
      addSolid: (object) => {
        this.solids.push(object);
        return this.physics!.addStatic(object, { membership: GROUP_WORLD, filter: ALL_GROUPS });
      },
      addUsable: (object, usable, options) => this.addUsable(object, usable, options),
      removeUsable: (object) => this.removeUsable(object),
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
