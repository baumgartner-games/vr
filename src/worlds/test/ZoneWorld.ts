import * as THREE from 'three';
import { FurnishedWorld } from '../grid/FurnishedWorld';
import { createSky } from '../shared/environment';
import type { PlateTile } from '../shared/plateField';
import { ALL_GROUPS, GROUP_WORLD } from '../../physics/PhysicsWorld';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import { npcSkin } from '../npc/npcKinds';
import type { RoutineHost } from '../npc/NpcRoutine';
import type { Npc } from '../npc/Npc';
import { floorPlate } from './floorPlate';
import { HORIZON_COLORS, centre } from './layout';
import { spawnAt } from './spawnAt';
import type { TestZone, ZoneHost } from './zones/zone';

/**
 * **Eine Testwelt mit einer Zone darin** — die gemeinsame Basis der
 * Rennstrecke, der Kletterwand, des Schießstands und der Effekte.
 *
 * Bis Oktober 2026 standen alle vier mit fünf weiteren Zonen auf **einem**
 * Gelände, der Sandbox. Gewünscht war dann: _„Ich denke ich möchte jedes davon
 * in eine eigene test welt extrahieren. Der rest kann gelöscht werden davon.
 * Ich will aber eine leere Sandbox welt behalten, in der ich etwas aufbauen
 * und testen kann."_ Die Sandbox ist seitdem leer (`SandboxWorld.ts`), und
 * jede der vier Zonen hat ihre eigene Welt im Ordner _Test_.
 *
 * **Die Zonen selbst sind dieselben geblieben** (`zones/`), samt ihren
 * Koordinaten: Sie rechnen in Kacheln des alten Geländes (`layout.ts`), und
 * jede Welt legt ihren Boden genau dorthin, wo ihre Zone steht
 * (`zoneWorlds.ts`). Eine Zone umzurechnen hätte jede Zahl in ihr angefasst,
 * ohne dass sich etwas daran ändert, was man sieht.
 *
 * **Die Zonen bekommen einen Vertrag und nicht diese Welt**
 * (`zones/zone.ts`, `ZoneHost`): Sie dürfen bauen, anmelden und melden, und
 * sonst nichts.
 */
export abstract class ZoneWorld extends FurnishedWorld {
  /** Die Zonen mit Leben darin — eine Welt mit nur Einbauten hat keine. */
  protected zones(): readonly TestZone[] {
    return [];
  }

  /** Wo man ankommt, als Kachel. */
  protected abstract spawnTile(): { x: number; z: number };

  /** Hier steht nichts außerhalb des Plans — die NPCs planen auf ihm. */
  protected override navFromPlan(): boolean {
    return true;
  }

  /** Prototyp-Platten, außer wo die Zone ihren Boden selbst mitbringt (`floorPlate.ts`). */
  protected override floorPlate(tile: PlateTile): string | null {
    return floorPlate(tile);
  }

  /**
   * **Wo man ankommt** — auf `spawnTile()`, oder auf der Kachel, die in der
   * Adresse steht (`spawnAt.ts`, `?at=`). Die Höhe einer Ebene kommt aus dem
   * Graphen und nicht aus einer Zahl hier.
   */
  protected override spawnPoint(): THREE.Vector3 {
    const at = spawnAt(typeof location === 'undefined' ? '' : location.search);
    if (!at) {
      const tile = this.spawnTile();
      return new THREE.Vector3(centre(tile.x), 0, centre(tile.z));
    }
    const y = this.grid?.graph.levelY(at.level) ?? 0;
    return new THREE.Vector3(centre(at.x), y, centre(at.z));
  }

  protected override skyColor(): number {
    return 0x9dbfe4;
  }

  protected override horizonColor(): number {
    return HORIZON_COLORS.ground;
  }

  protected override horizonChecker(): number {
    return HORIZON_COLORS.checker;
  }

  protected override horizonLine(): number {
    return HORIZON_COLORS.line;
  }

  /** Leere Hände, solange die Zone nichts braucht. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.root.add(createSky(0x6ea8e8, 0xdbe7f2));
  }

  /**
   * **Hier entsteht das Leben der Zone.** Ohne `context` ist es eine Vorschau
   * (`PortalWorld.preview`), und dort baut keine Zone.
   */
  protected override buildProps(): void {
    const ctx = this.context;
    if (!ctx || !this.physics) return;
    const host = this.zoneHost();
    for (const zone of this.zones()) zone.build(ctx, host);
    this.furnishSpots();
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    for (const zone of this.zones()) zone.update?.(dt, ctx);
  }

  /** `B`/`Y`: was die Zone zurückstellt. */
  protected override worldReset(): void {
    for (const zone of this.zones()) zone.reset?.();
  }

  override dispose(ctx: WorldContext): void {
    for (const zone of this.zones()) zone.dispose();
    super.dispose(ctx);
  }

  // --- der Vertrag der Zonen (`zones/zone.ts`) -------------------------------

  private hostForZones: ZoneHost | null = null;

  /**
   * **Was eine Zone von dieser Welt sieht** — und mehr nicht. Ein Objekt und
   * nicht `this`: Wer `this` hereingäbe, hätte Zonen, die den Editor anwerfen,
   * die Portale versetzen und das Menü umbauen können.
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
      // **Und nicht geteilt**: Was hier wieder herausgeht (die Stücke einer
      // zersprungenen Scheibe), ist nie über das Netz entstanden.
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
      openCatalogue: () => {
        const menu = this.context?.menu;
        if (!menu) return;
        menu.openSubmenu('elements');
        if (!menu.isOpen) menu.openSubmenu('assets');
      },
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
      npcRoutineHost: () => this.routineHost(),
    });
  }

  /** **Setzen und wegräumen für ein Verhalten** (`npc/NpcRoutine.ts`). */
  private routineHost(): RoutineHost | null {
    return {
      spawn: (kind, at, yaw) =>
        this.director?.spawn({
          kind,
          brain: 'errand',
          at: at.clone(),
          yaw,
          speed: npcSkin(kind).speed,
        }) ?? null,
      remove: (npc) => {
        this.director?.remove(npc);
      },
    };
  }

  /** **Einen NPC von A nach B schicken** — eine Übungspuppe mit dem Hirn `errand`. */
  private sendNpc(from: THREE.Vector3, to: THREE.Vector3): Npc | null {
    const director = this.director;
    if (!director) return null;
    return director.spawn({
      kind: 'dummy',
      brain: 'errand',
      at: from.clone(),
      errand: to.clone(),
      yaw: Math.atan2(-(to.x - from.x), -(to.z - from.z)),
      speed: npcSkin('dummy').speed,
    });
  }
}
