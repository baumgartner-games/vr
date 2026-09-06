import * as THREE from 'three';
import { Npc, type NavRun } from './Npc';
import type { BarMode } from './NpcBody';
import type { NavGraph } from '../nav/navGraph';
import type { TileKey } from '../nav/navTile';
import { npcSkin, type NpcKind } from './npcKinds';
import { brainLabel, type BrainId } from './npcBrains';
import { damageFor, type HitZone } from './npcHit';
import {
  SPAWNER_DEFAULTS,
  newSpawnerState,
  pickSpawnPoint,
  ringPoint,
  spawnerTick,
  type SpawnerConfig,
  type SpawnerState,
} from './npcSpawn';
import { disposeTree } from '../shared/environment';
import {
  GROUP_WORLD,
  ALL_GROUPS,
  type PhysicsBody,
  type PhysicsWorld,
} from '../../physics/PhysicsWorld';

/**
 * **Der Regisseur** — alles, was in einer Welt herumläuft, an einer Stelle.
 *
 * Eine Welt weiß von NPCs genau drei Dinge: dass es sie gibt, dass sie jedes
 * Bild einen Schritt machen und dass eine Kugel sie treffen kann. Alles
 * andere — wer wo steht, wer wem gehört, wer schon zu lange liegt — steht
 * hier. Das ist derselbe Schnitt wie beim Werkzeugkasten: die Welt reicht ein
 * paar Fähigkeiten herein (`NpcWorld`), der Bestand reicht ein paar Befehle
 * heraus (`NpcControl`), und keiner der beiden kennt die Innereien des
 * anderen.
 *
 * Drei Sorten Dinge verwaltet er, und sie sind genau die drei, nach denen ein
 * Spielplatz verlangt:
 *
 * - **NPCs** — die, die laufen.
 * - **Spawnpunkte** — Stellen, an denen einer auftauchen *darf*. Wer einen
 *   braucht, bekommt einen ausgewürfelt, und zwar möglichst weit weg vom
 *   Spieler (`npcSpawn.ts`) — dieselbe Regel, nach der ein Spieler nach dem
 *   Tod wieder ins Spiel kommt.
 * - **Brutkäfige** — Stellen, die von selbst nachlegen, solange jemand in der
 *   Nähe ist.
 *
 * **Über das Netz geht davon nichts.** Ein NPC ist heute das, was der
 * Sektkorken ist: jeder sieht seinen eigenen. Für zwei Spieler in einem Raum
 * heißt das, dass sie zwei verschiedene Zombies sehen — und der Weg dahin,
 * dass sie denselben sehen, führt über `PortalSync` und eine Antwort auf die
 * Frage, wer von beiden das Hirn rechnet. Das ist der nächste Schritt und
 * nicht dieser.
 */

/** Was der Bestand von seiner Welt braucht. */
export interface NpcWorld {
  /** Woran alles Gebaute hängt. */
  readonly root: THREE.Object3D;
  readonly physics: PhysicsWorld;
  /**
   * Wo der Spieler steht (seine Füße) — `null`, wenn gerade keiner da ist:
   * ein Zuschauer, oder jemand, der mit der Drohne unterwegs ist.
   */
  playerAt(target: THREE.Vector3): THREE.Vector3 | null;
  /** Ein Schlag hat gesessen: schiebt den Spieler, rüttelt und meldet. */
  strikePlayer(direction: THREE.Vector3, strength: number): void;
  notify(message: string): void;
  /**
   * Das Navigationsgitter dieser Welt (`worlds/nav/`) — `null`, wenn es keines
   * gibt.
   *
   * Optional, damit eine Welt ohne Gitter nichts davon wissen muss: Dann läuft
   * jeder wieder Luftlinie, so wie vorher.
   */
  nav?: () => NavGraph | null;
}

/** Und was ein Werkzeug oder ein Menü damit tun darf. */
export interface NpcControl {
  /** Setzt einen NPC mit dieser Haut und diesem Hirn auf diesen Punkt. */
  place(request: NpcRequest): boolean;
  /** Setzt einen an einem ausgewürfelten Spawnpunkt. `false` = keiner da. */
  placeAtSpawn(request: Omit<NpcRequest, 'at'>): boolean;
  /** Legt einen Spawnpunkt an. Gibt zurück, wie viele es jetzt sind. */
  addPoint(at: THREE.Vector3): number;
  /** Stellt einen Brutkäfig hin. Gibt zurück, wie viele es jetzt sind. */
  addCage(request: CageRequest): number;
  /** Nimmt weg, worauf der Strahl zeigt. Gibt zurück, was es war. */
  removeAlong(origin: THREE.Vector3, direction: THREE.Vector3): string | null;
  /** Räumt alles weg. Gibt zurück, wie viele Dinge das waren. */
  clear(): number;
  /** Wie viel gerade steht — für die Meldung im Menü. */
  census(): { npcs: number; points: number; cages: number };
}

export interface NpcRequest {
  kind: NpcKind;
  brain: BrainId;
  at: THREE.Vector3;
  yaw?: number;
  speed?: number;
  health?: number;
}

export interface CageRequest {
  kind: NpcKind;
  brain: BrainId;
  at: THREE.Vector3;
  speed?: number;
  health?: number;
  interval?: number;
  max?: number;
}

/** Wie weit ein Strahl beim Entfernen reicht, in Metern. */
const REMOVE_RANGE = 40;
/** Wie lange ein Gefallener liegen bleibt, bevor er verschwindet. */
const REST_TIME = 8;
/** Wie viele NPCs eine Welt gleichzeitig trägt — die Notbremse. */
export const NPC_LIMIT = 40;
/** Wie tief einer fallen darf, bevor er aufgegeben wird. */
const VOID_FLOOR = -60;
/** Wie weit ein Spawnpunkt vom Spieler weg sein soll. */
const SPAWN_CLEARANCE = 8;
/** Der Käfig, als Ding im Raum: Kantenlänge und Höhe seiner Mitte. */
const CAGE_SIZE = 0.62;

const _feet = new THREE.Vector3();
const _at = new THREE.Vector3();
const _to = new THREE.Vector3();
const _push = new THREE.Vector3();
const _probe = new THREE.Vector3();

interface SpawnMark {
  at: THREE.Vector3;
  view: THREE.Group;
}

interface Cage {
  at: THREE.Vector3;
  view: THREE.Group;
  core: THREE.Mesh;
  entry: PhysicsBody;
  kind: NpcKind;
  brain: BrainId;
  speed: number | undefined;
  health: number | undefined;
  config: SpawnerConfig;
  state: SpawnerState;
}

export class NpcDirector implements NpcControl {
  private readonly npcs: Npc[] = [];
  private readonly points: SpawnMark[] = [];
  private readonly cages: Cage[] = [];
  private time = 0;

  /**
   * Wann die Lebensbalken zu sehen sind (`NpcBody.ts`).
   *
   * Ausgeliefert wird **bei Schaden**: Ein Balken über einem unversehrten
   * Zombie ist eine Zeile, die immer dasselbe sagt, und dreißig davon sind
   * dreißig. Wer die Zahlen prüfen will — genau darum geht es im
   * Navigationslabor —, stellt im Menü auf *immer*.
   */
  private barMode: BarMode = 'hurt';

  constructor(private readonly world: NpcWorld) {}

  /** Wann die Balken zu sehen sind — gilt sofort und für alles Neue. */
  setBars(mode: BarMode): void {
    this.barMode = mode;
    for (const npc of this.npcs) npc.setBars(mode);
  }

  get bars(): BarMode {
    return this.barMode;
  }

  // --- setzen ---------------------------------------------------------------

  place(request: NpcRequest): boolean {
    return this.spawn(request) !== null;
  }

  /**
   * Dasselbe, aber mit dem NPC in der Hand.
   *
   * Für alles, was mit dem Gesetzten noch etwas vorhat — eine Testwelt, die
   * einem von zweien beibringt, dass es ein Portal gibt (`navBelief.ts`). Das
   * Menü braucht das nicht und bekommt darum weiterhin nur ein Ja oder Nein.
   */
  spawn(request: NpcRequest): Npc | null {
    if (this.npcs.length >= NPC_LIMIT) {
      this.world.notify('Genug NPCs — erst welche wegräumen');
      return null;
    }
    const npc = new Npc({
      physics: this.world.physics,
      kind: request.kind,
      brain: request.brain,
      at: request.at,
      yaw: request.yaw ?? this.facingPlayer(request.at),
      speed: request.speed,
      health: request.health,
    });
    npc.setBars(this.barMode);
    this.world.root.add(npc.holder);
    this.npcs.push(npc);
    return npc;
  }

  placeAtSpawn(request: Omit<NpcRequest, 'at'>): boolean {
    const at = this.spawnPoint();
    if (!at) return false;
    return this.place({ ...request, at });
  }

  /**
   * Ein ausgewürfelter Spawnpunkt, möglichst weit weg vom Spieler — oder
   * `null`, wenn niemand welche gesetzt hat.
   */
  private spawnPoint(): THREE.Vector3 | null {
    if (this.points.length === 0) return null;
    const player = this.world.playerAt(_feet);
    const index = pickSpawnPoint(
      this.points.map((mark) => ({ x: mark.at.x, z: mark.at.z })),
      player ? { x: player.x, z: player.z } : null,
      SPAWN_CLEARANCE,
      Math.random(),
    );
    return index < 0 ? null : this.points[index]!.at.clone();
  }

  /** Ein frisch gesetzter NPC schaut den an, der ihn gesetzt hat. */
  private facingPlayer(at: THREE.Vector3): number {
    const player = this.world.playerAt(_feet);
    if (!player) return 0;
    return Math.atan2(-(player.x - at.x), -(player.z - at.z));
  }

  // --- Spawnpunkte ----------------------------------------------------------

  addPoint(at: THREE.Vector3): number {
    const view = new THREE.Group();
    view.name = 'npc-spawn-point';
    view.position.copy(at);
    // Ein Kreis auf dem Boden, wie beim Teleporter — nur bleibt dieser hier
    // liegen. Er ist Kulisse und kein Körper: man läuft hindurch.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.42, 40),
      new THREE.MeshBasicMaterial({
        color: 0x5ee0a0,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.015;
    view.add(ring);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 32),
      new THREE.MeshBasicMaterial({
        color: 0x5ee0a0,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.012;
    view.add(disc);
    this.world.root.add(view);
    this.points.push({ at: at.clone(), view });
    return this.points.length;
  }

  // --- Brutkäfige -----------------------------------------------------------

  addCage(request: CageRequest): number {
    const skin = npcSkin(request.kind);
    const view = new THREE.Group();
    view.name = 'npc-cage';
    view.position.copy(request.at);
    view.position.y += CAGE_SIZE / 2;

    // Ein Käfig aus zwölf Kanten: die Stäbe sieht man, das Innere auch.
    const bar = new THREE.MeshStandardMaterial({
      color: 0x2b3448,
      roughness: 0.55,
      metalness: 0.65,
    });
    const thickness = 0.035;
    const half = CAGE_SIZE / 2;
    for (const axis of ['x', 'y', 'z'] as const) {
      for (const a of [-half, half]) {
        for (const b of [-half, half]) {
          const size = new THREE.Vector3(thickness, thickness, thickness);
          size[axis] = CAGE_SIZE;
          const edge = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), bar);
          if (axis === 'x') edge.position.set(0, a, b);
          else if (axis === 'y') edge.position.set(a, 0, b);
          else edge.position.set(a, b, 0);
          view.add(edge);
        }
      }
    }

    // Und darin die Puppe, die zeigt, was herauskommt — dieselbe Haut, klein
    // und im Kreis. Das Vorbild aus dem Verlies macht es genauso, und aus
    // gutem Grund: an einem Käfig will man sehen, was gleich vor einem steht.
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(CAGE_SIZE * 0.22, 0),
      new THREE.MeshStandardMaterial({
        color: skin.accent,
        roughness: 0.5,
        emissive: new THREE.Color(skin.accent).multiplyScalar(0.35),
      }),
    );
    view.add(core);
    this.world.root.add(view);
    view.updateWorldMatrix(true, false);

    const entry = this.world.physics.addStatic(view, {
      shape: { kind: 'box' },
      halfExtents: new THREE.Vector3(half, half, half),
      membership: GROUP_WORLD,
      filter: ALL_GROUPS,
    });

    this.cages.push({
      at: request.at.clone(),
      view,
      core,
      entry,
      kind: request.kind,
      brain: request.brain,
      speed: request.speed,
      health: request.health,
      config: {
        ...SPAWNER_DEFAULTS,
        interval: request.interval ?? SPAWNER_DEFAULTS.interval,
        max: request.max ?? SPAWNER_DEFAULTS.max,
      },
      state: newSpawnerState(),
    });
    return this.cages.length;
  }

  // --- wegnehmen ------------------------------------------------------------

  removeAlong(origin: THREE.Vector3, direction: THREE.Vector3): string | null {
    _to.copy(origin).addScaledVector(direction, REMOVE_RANGE);

    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i]!;
      if (!npc.zoneOf(origin, _to)) continue;
      const label = npc.skin.label;
      this.retire(i);
      return label;
    }
    for (let i = this.cages.length - 1; i >= 0; i--) {
      const cage = this.cages[i]!;
      if (!hitsPoint(origin, _to, cage.view.position, CAGE_SIZE)) continue;
      this.dropCage(i);
      return 'Brutkäfig';
    }
    for (let i = this.points.length - 1; i >= 0; i--) {
      const mark = this.points[i]!;
      if (!hitsPoint(origin, _to, mark.at, 0.5)) continue;
      disposeTree(mark.view);
      mark.view.removeFromParent();
      this.points.splice(i, 1);
      return 'Spawnpunkt';
    }
    return null;
  }

  clear(): number {
    const count = this.npcs.length + this.points.length + this.cages.length;
    for (let i = this.npcs.length - 1; i >= 0; i--) this.retire(i);
    for (let i = this.cages.length - 1; i >= 0; i--) this.dropCage(i);
    for (const mark of this.points) {
      disposeTree(mark.view);
      mark.view.removeFromParent();
    }
    this.points.length = 0;
    return count;
  }

  census(): { npcs: number; points: number; cages: number } {
    return { npcs: this.npcs.length, points: this.points.length, cages: this.cages.length };
  }

  /** Wie viele davon noch stehen — Gefallene zählen nicht mehr mit. */
  get standing(): number {
    return this.npcs.reduce((sum, npc) => sum + (npc.alive ? 1 : 0), 0);
  }

  // --- das Bild -------------------------------------------------------------

  update(dt: number): void {
    this.time += dt;
    const player = this.world.playerAt(_feet);
    const target = player ? { x: player.x, z: player.z } : null;

    // Einmal je Bild für alle: Das Gitter ist dasselbe, und die Spielerhöhe
    // auch. Fünfzig NPCs sollen sie nicht fünfzigmal nachschlagen.
    const graph = this.world.nav?.() ?? null;
    const run: NavRun | null = graph
      ? {
          graph,
          at: player ? { x: player.x, y: player.y, z: player.z } : null,
          now: this.time,
        }
      : null;

    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i]!;
      const hit = npc.update(dt, target, Math.random, run);
      if (hit && player) this.strike(npc, player);
      // Ein Gefallener liegt eine Weile herum und verschwindet dann. Ohne das
      // Aufräumen füllt sich eine Halle nach zwanzig Minuten mit Leichen, und
      // jede davon zeichnet weiter mit.
      if (!npc.alive && npc.restingFor > REST_TIME) this.retire(i);
      // Und wer durch ein Portal in den Himmel und wieder heraus gefallen ist,
      // fällt sonst für immer weiter und rechnet dabei mit. Dieselbe Grenze wie
      // bei den Kugeln.
      else if (npc.feet(_probe).y < VOID_FLOOR) this.retire(i);
    }

    for (const cage of this.cages) {
      // Der Kern dreht sich, damit man sieht, dass der Käfig lebt.
      cage.core.rotation.y = this.time * 1.1;
      cage.core.rotation.x = Math.sin(this.time * 0.7) * 0.4;
      const distance = player ? player.distanceTo(cage.at) : Infinity;
      const mine = this.npcs.filter((npc) => npc.alive && npc.owner === cage).length;
      if (!spawnerTick(cage.state, cage.config, dt, distance, mine)) continue;
      if (this.npcs.length >= NPC_LIMIT) continue;
      const spot = ringPoint(cage.at, cage.config.radius, Math.random());
      _at.set(spot.x, cage.at.y, spot.z);
      const npc = new Npc({
        physics: this.world.physics,
        kind: cage.kind,
        brain: cage.brain,
        at: _at,
        yaw: this.facingPlayer(_at),
        speed: cage.speed,
        health: cage.health,
        owner: cage,
      });
      npc.setBars(this.barMode);
      this.world.root.add(npc.holder);
      this.npcs.push(npc);
    }
  }

  /**
   * Die Wege, die gerade gelaufen werden — für die Debug-Ansicht.
   *
   * Nur die, die auch einen haben: Wer stehen bleibt, hat keinen, und ein
   * leeres Feld zeichnet sich schlecht.
   */
  paths(): readonly TileKey[][] {
    const found: TileKey[][] = [];
    for (const npc of this.npcs) {
      if (!npc.alive || npc.path.length < 2) continue;
      found.push([...npc.path]);
    }
    return found;
  }

  /** Ein Schlag hat gesessen: er schiebt den Spieler von sich weg. */
  private strike(npc: Npc, player: THREE.Vector3): void {
    npc.feet(_at);
    _push.copy(player).sub(_at);
    _push.y = 0;
    if (_push.lengthSq() < 1e-6) _push.set(0, 0, 1);
    _push.normalize();
    // Ein wenig nach oben: ein Schlag, der nur schiebt, spürt sich an wie ein
    // Windstoß — einer, der auch anhebt, wie ein Treffer.
    _push.y = 0.35;
    this.world.strikePlayer(_push, npc.tuning.punch);
  }

  /**
   * Eine Kugel ist diese Strecke geflogen — hat sie jemanden erwischt?
   *
   * @param damage was ein Rumpftreffer dieser Waffe abzieht; der Kopf zählt
   *               vierfach (`npcHit.ts`).
   * @returns ob die Kugel damit verbraucht ist.
   */
  shoot(from: THREE.Vector3, to: THREE.Vector3, damage?: number): boolean {
    return this.hit(from, to, damage) !== null;
  }

  /**
   * **Dieselbe Rechnung für alles, was zuschlägt** — Kugel, Klinge,
   * Hammerkopf.
   *
   * Eine Kugel legt zwischen zwei Bildern Meter zurück, eine schwingende
   * Klinge Zentimeter; beide sind eine **Strecke** und keine Stelle, und
   * beide fragen deshalb dasselbe (`npcHit.ts`). Was sie unterscheidet, ist
   * die Zahl, die sie mitbringen, und die steht an der Waffe.
   *
   * @returns wo es getroffen hat — `null`, wenn niemand im Weg stand.
   */
  hit(from: THREE.Vector3, to: THREE.Vector3, damage?: number): HitZone | null {
    for (const npc of this.npcs) {
      const zone = npc.zoneOf(from, to);
      if (!zone) continue;
      const dead = npc.damage(damageFor(zone, damage));
      if (dead) {
        npc.unbody(this.world.physics);
        this.world.notify(
          zone === 'head' ? `${npc.skin.label}: Kopftreffer` : `${npc.skin.label} liegt`,
        );
      }
      return zone;
    }
    return null;
  }

  /** Was ein Menü über einen frisch gesetzten NPC meldet. */
  static describe(kind: NpcKind, brain: BrainId): string {
    return `${npcSkin(kind).label} · ${brainLabel(brain)}`;
  }

  dispose(): void {
    this.clear();
  }

  // --- innere Aufräumerei ---------------------------------------------------

  private retire(index: number): void {
    const npc = this.npcs[index]!;
    if (npc.alive) npc.unbody(this.world.physics);
    npc.dispose();
    this.npcs.splice(index, 1);
  }

  private dropCage(index: number): void {
    const cage = this.cages[index]!;
    this.world.physics.remove(cage.entry);
    disposeTree(cage.view);
    cage.view.removeFromParent();
    this.cages.splice(index, 1);
  }
}

/** Ob die Strecke nahe genug an einem Punkt vorbeigeht, um ihn zu meinen. */
function hitsPoint(
  from: THREE.Vector3,
  to: THREE.Vector3,
  point: THREE.Vector3,
  radius: number,
): boolean {
  _push.copy(to).sub(from);
  const lengthSq = _push.lengthSq();
  let t = 0;
  if (lengthSq > 1e-9) {
    t = THREE.MathUtils.clamp(_at.copy(point).sub(from).dot(_push) / lengthSq, 0, 1);
  }
  _at.copy(from).addScaledVector(_push, t);
  return _at.distanceToSquared(point) <= radius * radius;
}
