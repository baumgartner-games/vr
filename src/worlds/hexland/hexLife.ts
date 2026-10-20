import * as THREE from 'three';
import { kaykitModel } from '../../core/kaykitModel';
import { canLoadModels } from '../../core/chefFit';
import type { KaykitFigure } from '../../core/kaykitFigure';
import { dressTile, riverFlow } from './hexDressing';
import { HEX_SCALE, HEX_WIDTH } from './hexView';
import {
  edgeAt,
  hexCentre,
  hexKey,
  neighbour,
  opposite,
  type HexBoard,
  type PlacedTile,
} from './hexRules';

/**
 * **Leben auf dem Brett** — Boote auf dem Fluss, ein Pferdekarren auf den
 * Wegen, ein Holzfäller, der aus seinem Haus kommt, am Waldrand hackt und
 * wieder hineingeht, ein Fuchs, der von Baum zu Baum über die Wiese huscht,
 * und Vögel, die übers Bild ziehen. Gewünscht: _„ein paar weitere Animationen
 * … npc die laufen und Holz hacken. Boote die auf dem Fluss fahren. Vögel die
 * fliegen. Füchse die über Wiesen laufen. Diese npc und diese spänen hinter
 * einem Baum Felsen Busch Haus, wo man diese von der Kamera erst nicht sieht
 * und machen dann es und verschwinden dann auch dahinter. Lass die Welt
 * lebhaft wirken und bewegend. Ein Karren/Wagen entlang der Wege."_
 *
 * **Woher sie kommen und wohin sie gehen**: Wer zu Fuß ist, beginnt und endet
 * **hinter** etwas — im Haus (der Holzfäller) oder auf der von der Kamera
 * abgewandten Seite eines Baums (der Fuchs, `behind`). Boote und Karren
 * kommen vom Rand des Bretts oder aus einer Sackgasse und wachsen dort aus
 * dem Nichts (`FADE`), statt mitten im Bild aufzutauchen.
 *
 * **Sparsam**: höchstens eins je Sorte, nur in der Nähe dessen, was die
 * Kamera sieht (`view`), und nur mit _Animationen_ an. Die Figuren sind zu
 * einem Netz verschmolzen (`loadKaykitFigure` mit `merge`), die Vögel sind
 * zwei Bündel (`InstancedMesh`) für alle.
 *
 * Alles hängt unter `root`, und `root` hängt an `board3d` — gerechnet wird in
 * den Metern des Bretts (`hexCentre`, `HEX_WIDTH`).
 */
export class HexLife {
  readonly root = new THREE.Group();
  private actors: Actor[] = [];
  private clock = 0;
  private next: Record<Kind, number> = {
    boat: 3,
    cart: 6,
    cutter: 2,
    villager: 1,
    wolf: 9,
    birds: 4,
  };
  private readonly birds = new Flock();
  private gone = false;

  constructor(private readonly board: () => HexBoard) {
    this.root.name = 'hexland-life';
    this.root.add(this.birds.root);
  }

  /**
   * Ein Bild weiter. `view` ist der Ausschnitt, den die Kamera zeigt (Mitte und
   * Halbmesser in Metern des Bretts), `eye` die Kamera in denselben Maßen.
   */
  update(dt: number, on: boolean, view: View, eye: THREE.Vector3): void {
    this.root.visible = on;
    if (!on) return;
    this.clock += dt;
    for (const actor of this.actors) actor.update(dt);
    this.actors = this.actors.filter((actor) => {
      if (!actor.done) return true;
      actor.dispose();
      return false;
    });
    this.birds.update(dt, view);
    for (const kind of KINDS) {
      if (this.clock < this.next[kind]) continue;
      this.next[kind] = this.clock + PAUSE[kind] * (0.6 + Math.random() * 0.8);
      if (this.actors.filter((actor) => actor.kind === kind).length >= LIMIT[kind]) continue;
      const actor = this.spawn(kind, view, eye);
      if (actor) {
        this.actors.push(actor);
        this.root.add(actor.root);
      }
    }
  }

  /** Alles weg — neue Partie, anderes Brett. */
  clear(): void {
    for (const actor of this.actors) actor.dispose();
    this.actors = [];
    this.birds.clear();
  }

  dispose(): void {
    this.gone = true;
    this.clear();
    this.birds.dispose();
    this.root.removeFromParent();
  }

  private spawn(kind: Kind, view: View, eye: THREE.Vector3): Actor | null {
    const tiles = [...this.board().tiles.values()].filter((tile) => {
      const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
      return Math.hypot(c.x - view.x, c.z - view.z) < view.r + HEX_WIDTH;
    });
    if (tiles.length === 0) return null;
    switch (kind) {
      case 'boat':
        return this.boat(tiles);
      case 'cart':
        return this.traveller(kind, tiles, 'road');
      case 'cutter':
        return this.cutter(tiles);
      case 'villager':
        return this.villager(tiles);
      case 'wolf':
        return this.wolf(tiles, eye);
      case 'birds':
        this.birds.start(view);
        return null;
    }
  }

  /** **Der Karren** — den Weg entlang, von einem Ende bis zum anderen. */
  private traveller(kind: 'cart', tiles: PlacedTile[], terrain: 'road'): Actor | null {
    const board = this.board();
    const starts = tiles.filter((tile) => ends(board, tile, terrain).length > 0);
    if (starts.length === 0) return null;
    const tile = pick(starts);
    const path = trail(board, tile, pick(ends(board, tile, terrain)), terrain);
    if (path.length < 3) return null;
    const actor = new Traveller(kind, new THREE.CatmullRomCurve3(path), CART_SPEED);
    void this.dress(actor, CART);
    return actor;
  }

  /**
   * **Das Boot** — immer flussabwärts (`riverFlow`, dieselbe Richtung wie die
   * Wellen und Pfeile): vom Anfang eines Flusses bis zu seinem Ende, in einen
   * See oder eine Bucht hinein. Darin sitzt jemand. Gemeldet: _„Boote … schwimmen
   * leider auch Fluss aufwärts."_ und _„Auf dem Boot darf auch ein Mensch
   * sitzen."_
   */
  private boat(tiles: PlacedTile[]): Actor | null {
    const path = downstream(this.board(), tiles);
    if (!path || path.length < 3) return null;
    const actor = new Traveller('boat', new THREE.CatmullRomCurve3(path), BOAT_SPEED);
    void this.dress(actor, BOAT).then(() => this.rider(actor));
    return actor;
  }

  /** Jemand sitzt im Boot (`Sit_Floor_Idle`). */
  private async rider(actor: Traveller): Promise<void> {
    if (!canLoadModels() || actor.done) return;
    const module = await import('../../core/kaykitFigure');
    const figure = await module.loadKaykitFigure(pick(PEOPLE), RIDER_HEIGHT, { merge: true });
    if (!figure) return;
    if (this.gone || actor.done) {
      figure.dispose();
      return;
    }
    figure.play('Sit_Floor_Idle');
    figure.root.position.y = RIDER_LIFT;
    actor.body.add(figure.root);
    actor.rider = figure;
  }

  /**
   * **Der Holzfäller** — aus einem Haus neben dem Wald hinaus zum nächsten Baum,
   * dort ein paar Hiebe, und zurück ins Haus.
   */
  private cutter(tiles: PlacedTile[]): Actor | null {
    const board = this.board();
    const pairs: Array<{ from: THREE.Vector3; to: THREE.Vector3 }> = [];
    for (const tile of tiles) {
      const homes = spots(tile, (model) => model.includes('building_home'));
      if (homes.length === 0) continue;
      const near = [tile, ...[0, 1, 2, 3, 4, 5].map((e) => board.at(...qr(neighbour(tile, e))))];
      const trees = near.flatMap((t) => (t ? spots(t, (model) => model.includes('/trees_')) : []));
      for (const home of homes)
        for (const tree of trees) {
          const d = home.distanceTo(tree);
          if (d > 0.5 && d < HEX_WIDTH * 1.2) pairs.push({ from: home, to: tree });
        }
    }
    if (pairs.length === 0) return null;
    const { from, to } = pick(pairs);
    // Nicht in den Baum hinein, sondern davor stehen bleiben.
    const stand = to.clone().add(from.clone().sub(to).setLength(0.28));
    const actor = new Walker('cutter', [from, stand], { work: CHOP_SECONDS, back: true });
    void this.figure(actor, pick(PEOPLE), PERSON_HEIGHT, true);
    return actor;
  }

  /**
   * **Unterwegs im Dorf** — jemand geht von einem Haus zu einem anderen in der
   * Nähe: aus der Tür hinaus, in die andere hinein. Gewünscht: _„Es dürfen
   * ruhig mehr Menschen unterwegs sein."_
   */
  private villager(tiles: PlacedTile[]): Actor | null {
    const homes = tiles.flatMap((tile) => spots(tile, (model) => model.includes('building_')));
    if (homes.length < 2) return null;
    const from = pick(homes);
    const to = homes.filter((h) => {
      const d = h.distanceTo(from);
      return d > 0.6 && d < HEX_WIDTH * 1.6;
    });
    if (to.length === 0) return null;
    const actor = new Walker('villager', [from, pick(to)], { work: 0, back: false });
    void this.figure(actor, pick(PEOPLE), PERSON_HEIGHT, false);
    return actor;
  }

  /**
   * **Der Wolf** — nur im Wald: von hinter einem Baum durch dasselbe
   * Waldgebiet (über Waldkanten von Kachel zu Kachel) bis hinter einen Baum
   * weiter drinnen. Gemeldet: _„Wölfe es sollen nur innerhalb eines Wald
   * Gebietes von Gebiet zu Gebiet laufen nicht über unentdeckte Felder oder
   * andere."_ Ein Fuchsmodell gibt es im Regal nicht; der Wolf kommt aus dem
   * Werwolf-Paket.
   */
  private wolf(tiles: PlacedTile[], eye: THREE.Vector3): Actor | null {
    const board = this.board();
    const forest = tiles.filter((tile) => tile.spec.edges.includes('forest'));
    if (forest.length === 0) return null;
    const start = pick(forest);
    const route = forestRoute(board, start);
    if (!route) return null;
    const first = spots(route.tiles[0]!, isTree);
    const last = spots(route.tiles[route.tiles.length - 1]!, isTree);
    if (first.length === 0 || last.length === 0) return null;
    const points = [behind(pick(first), eye), ...route.through, behind(pick(last), eye)];
    if (points[0]!.distanceTo(points[points.length - 1]!) < 0.6) return null;
    const actor = new Walker('wolf', points, { work: 0, back: false });
    void this.figure(actor, WOLF, WOLF_HEIGHT, false);
    return actor;
  }

  /** Ein Modell aus dem Regal anziehen (Boot, Karren mit Pferd). */
  private async dress(actor: Actor, parts: readonly Part[]): Promise<void> {
    if (!canLoadModels()) return;
    for (const part of parts) {
      const model = await kaykitModel(part.path);
      if (!model || this.gone || actor.done) return;
      model.scale.setScalar(part.scale * HEX_SCALE);
      model.position.set(0, part.y ?? 0, part.ahead ?? 0);
      model.rotation.y = part.yaw ?? 0;
      actor.body.add(model);
    }
  }

  /** Eine bewegte Figur (`loadKaykitFigure`) anziehen; der Holzfäller trägt eine Axt. */
  private async figure(actor: Walker, path: string, height: number, axe: boolean): Promise<void> {
    if (!canLoadModels()) return;
    const module = await import('../../core/kaykitFigure');
    const figure = await module.loadKaykitFigure(path, height, { merge: true });
    if (!figure) return;
    if (this.gone || actor.done) {
      figure.dispose();
      return;
    }
    if (axe && figure.bones.handRight) {
      const tool = await kaykitModel(AXE);
      if (tool && !actor.done) {
        tool.scale.multiplyScalar(height / 1.8);
        figure.bones.handRight.add(tool);
      }
    }
    actor.wear(figure);
  }
}

/** Was die Kamera gerade zeigt — Mitte und Halbmesser in Metern des Bretts. */
export interface View {
  x: number;
  z: number;
  r: number;
}

type Kind = 'boat' | 'cart' | 'cutter' | 'villager' | 'wolf' | 'birds';
const KINDS: readonly Kind[] = ['boat', 'cart', 'cutter', 'villager', 'wolf', 'birds'];
/** Wie lange es dauert, bis wieder eins kommt (Sekunden, gewürfelt ±40 %). */
const PAUSE: Record<Kind, number> = {
  boat: 14,
  cart: 12,
  cutter: 9,
  villager: 5,
  wolf: 16,
  birds: 18,
};
/** Wie viele je Sorte gleichzeitig unterwegs sein dürfen. */
const LIMIT: Record<Kind, number> = { boat: 1, cart: 1, cutter: 2, villager: 3, wolf: 1, birds: 1 };

/** Ein Stück eines Fahrzeugs: Datei, Maß (wie die Ausstattung), Versatz nach vorn. */
interface Part {
  path: string;
  scale: number;
  yaw?: number;
  ahead?: number;
  y?: number;
}
const BOAT: readonly Part[] = [
  // Der Bug zeigt im Modell nach −Z — gemeldet: _„Boote sind um 90 falsch gedreht"_.
  { path: 'medieval-hexagon/decoration/props/boat.glb', scale: 1.1 },
];
const CART: readonly Part[] = [
  // Die Deichsel des Karrens zeigt im Modell nach +Z — gedreht, damit sie vorn ist.
  { path: 'medieval-hexagon/units/neutral/cart.glb', scale: 0.32, yaw: Math.PI },
  // Das Pferd schaut nach vorn, weg vom Karren — _„Das Pferd beim Karren muss um 180° gedreht werden."_
  { path: 'medieval-hexagon/units/neutral/horse_A.glb', scale: 0.45, ahead: -0.46, yaw: Math.PI },
];
const PEOPLE = [
  'adventurers/characters/Engineer.glb',
  'adventurers/characters/Barbarian.glb',
  'adventurers/characters/Rogue_Hooded.glb',
] as const;
const AXE = 'adventurers/axe_1handed.glb';
const PERSON_HEIGHT = 0.32;
/** Wer im Boot sitzt: kleiner, ein Stück über dem Boden des Boots. */
const RIDER_HEIGHT = 0.26;
const RIDER_LIFT = 0.03;
const CHOP_SECONDS = 5;
const WOLF = 'mystery-monthly-4/4-october-2023-werewolf/characters/Werewolf_Wolf.glb';
const WOLF_HEIGHT = 0.3;
/**
 * **Wie schnell sie fahren** (Meter des Bretts je Sekunde) — langsam, die
 * Welt soll leben, nicht hetzen. Gemeldet: _„Boote, Karren, Vögel, Wölfe und
 * Menschen sind zu schnell."_
 */
const BOAT_SPEED = 0.28;
const CART_SPEED = 0.22;
/** Wie lange etwas aus dem Nichts wächst und wieder darin verschwindet (Sekunden). */
const FADE = 0.7;

/** Etwas, das kommt, etwas tut und wieder geht. */
abstract class Actor {
  readonly root = new THREE.Group();
  /** Was man sieht — darunter hängt das Modell. */
  readonly body = new THREE.Group();
  done = false;
  constructor(readonly kind: Kind) {
    this.root.add(this.body);
  }
  abstract update(dt: number): void;
  dispose(): void {
    this.done = true;
    this.root.removeFromParent();
  }
}

/** **Boot und Karren** — an einer Kurve entlang, vorn und hinten weich ein- und ausgeblendet. */
class Traveller extends Actor {
  private s = 0;
  /** Wer im Boot sitzt (`HexLife.rider`). */
  rider: KaykitFigure | null = null;
  private readonly length: number;
  constructor(
    kind: Kind,
    private readonly curve: THREE.CatmullRomCurve3,
    private readonly speed: number,
  ) {
    super(kind);
    this.length = curve.getLength();
    this.place(0);
  }

  override dispose(): void {
    this.rider?.dispose();
    this.rider = null;
    super.dispose();
  }

  update(dt: number): void {
    this.rider?.update(dt);
    this.s += dt * this.speed;
    if (this.s >= this.length) {
      this.done = true;
      return;
    }
    this.place(this.s);
  }

  private place(s: number): void {
    const u = Math.min(1, s / this.length);
    this.curve.getPointAt(u, this.root.position);
    this.curve.getTangentAt(u, _tangent);
    this.root.rotation.y = Math.atan2(-_tangent.x, -_tangent.z);
    const t = s / this.speed;
    const left = (this.length - s) / this.speed;
    const grow = Math.max(0, Math.min(1, t / FADE, left / FADE));
    this.body.scale.setScalar(Math.max(0.001, grow));
    // Ein Boot schaukelt, ein Karren holpert — ein Hauch.
    this.body.position.y = Math.sin(t * (this.kind === 'boat' ? 2.4 : 9)) * 0.008;
  }
}

/**
 * **Zu Fuß** — die Punkte nacheinander ablaufen, am letzten `work` Sekunden
 * arbeiten (der Holzfäller hackt) und dann, wenn `back`, denselben Weg zurück.
 * Am Anfang und am Ende steht er hinter etwas (im Haus, hinter einem Baum).
 */
class Walker extends Actor {
  private figure: KaykitFigure | null = null;
  private leg = 0;
  private along = 0;
  private working = 0;
  private route: THREE.Vector3[];
  private returning = false;

  constructor(
    kind: Kind,
    points: THREE.Vector3[],
    private readonly plan: { work: number; back: boolean },
  ) {
    super(kind);
    this.route = points;
    this.root.position.copy(points[0]!);
    this.root.visible = false;
  }

  wear(figure: KaykitFigure): void {
    this.figure = figure;
    this.body.add(figure.root);
    this.root.visible = true;
    figure.gait(WALK);
  }

  update(dt: number): void {
    const figure = this.figure;
    if (!figure) return;
    figure.update(dt);
    if (this.working > 0) {
      this.working -= dt;
      if (this.working <= 0) {
        this.route = [...this.route].reverse();
        this.leg = 0;
        this.along = 0;
        this.returning = true;
        figure.resumeGait(WALK);
      }
      return;
    }
    const from = this.route[this.leg]!;
    const to = this.route[this.leg + 1];
    if (!to) {
      if (this.plan.work > 0 && !this.returning) {
        this.working = this.plan.work;
        // Hacken: ein Hieb nach dem anderen, solange gearbeitet wird.
        if (!figure.play('Melee_2H_Attack_Chop', { speed: 0.8 }))
          figure.play('Melee_1H_Attack_Chop', { speed: 0.8 });
        return;
      }
      this.done = true;
      return;
    }
    const pace = this.kind === 'wolf' ? WOLF_PACE : WALK_PACE;
    const span = from.distanceTo(to);
    this.along += dt * pace;
    const u = Math.min(1, this.along / Math.max(span, 1e-3));
    this.root.position.lerpVectors(from, to, u);
    this.root.rotation.y = Math.atan2(-(to.x - from.x), -(to.z - from.z));
    if (u >= 1) {
      this.leg++;
      this.along = 0;
    }
  }

  override dispose(): void {
    this.figure?.dispose();
    this.figure = null;
    super.dispose();
  }
}

/** Gangarten für `KaykitFigure.gait` (Meter je Sekunde der Figur). */
const WALK = 1.2;
/** Wie schnell sie über das Brett kommen (Meter je Sekunde des Bretts). */
const WALK_PACE = 0.11;
const WOLF_PACE = 0.16;

/**
 * **Vögel** — ein kleiner Schwarm, der quer durchs Bild zieht, hoch über dem
 * Brett. Ein Vogelmodell gibt es im Regal nicht; die Vögel sind darum nur zwei
 * schlagende Flügel aus je einem Dreieck, in zwei Bündeln für alle.
 */
class Flock {
  readonly root = new THREE.Group();
  private readonly left: THREE.InstancedMesh;
  private readonly right: THREE.InstancedMesh;
  private flying = false;
  private t = 0;
  private from = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private span = 0;
  private readonly offsets: Array<{ x: number; z: number; y: number; phase: number }> = [];

  constructor() {
    const wing = (side: 1 | -1): THREE.BufferGeometry => {
      const g = new THREE.BufferGeometry();
      // Ein Flügel: vom Körper zur Spitze, leicht nach hinten gezogen.
      g.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          // prettier-ignore
          [0, 0, -W_ROOT, side * W_SPAN, 0, W_TIP, 0, 0, W_TIP,
           0, 0, -W_ROOT, 0, 0, W_TIP, side * W_SPAN, 0, W_TIP],
          3,
        ),
      );
      g.computeVertexNormals();
      return g;
    };
    const material = new THREE.MeshBasicMaterial({ color: 0x5a4f55, side: THREE.DoubleSide });
    this.left = new THREE.InstancedMesh(wing(-1), material, BIRDS);
    this.right = new THREE.InstancedMesh(wing(1), material, BIRDS);
    for (const mesh of [this.left, this.right]) {
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.raycast = () => {};
      this.root.add(mesh);
    }
    for (let i = 0; i < BIRDS; i++) {
      const row = Math.ceil(i / 2);
      const side = i % 2 === 0 ? 1 : -1;
      this.offsets.push({
        x: side * row * 0.35 + (Math.random() - 0.5) * 0.1,
        z: row * 0.4 + (Math.random() - 0.5) * 0.1,
        y: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  start(view: View): void {
    if (this.flying) return;
    const a = Math.random() * Math.PI * 2;
    const far = view.r + 4;
    this.from.set(view.x + Math.cos(a) * far, BIRD_HEIGHT, view.z + Math.sin(a) * far);
    const across = a + Math.PI + (Math.random() - 0.5) * 0.8;
    this.dir.set(Math.cos(across), 0, Math.sin(across));
    this.span = far * 2;
    this.t = 0;
    this.flying = true;
  }

  update(dt: number, _view: View): void {
    if (!this.flying) return;
    this.t += dt;
    const s = this.t * BIRD_SPEED;
    if (s > this.span) {
      this.clear();
      return;
    }
    const yaw = Math.atan2(-this.dir.x, -this.dir.z);
    _quat.setFromAxisAngle(_up, yaw);
    for (let i = 0; i < BIRDS; i++) {
      const o = this.offsets[i]!;
      _pos.set(o.x, o.y, o.z).applyQuaternion(_quat);
      _pos.addScaledVector(this.dir, s).add(this.from);
      _pos.y += Math.sin(this.t * 0.9 + o.phase) * 0.15;
      const flap = Math.sin(this.t * 5 + o.phase) * 0.6;
      for (const [mesh, side] of [
        [this.left, -1],
        [this.right, 1],
      ] as const) {
        _wing.setFromEuler(_euler.set(0, yaw, 0));
        _roll.setFromAxisAngle(_forward, side * flap);
        _wing.multiply(_roll);
        _matrix.compose(_pos, _wing, _one);
        mesh.setMatrixAt(i, _matrix);
      }
    }
    for (const mesh of [this.left, this.right]) {
      mesh.count = BIRDS;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  clear(): void {
    this.flying = false;
    this.left.count = 0;
    this.right.count = 0;
  }

  dispose(): void {
    this.left.geometry.dispose();
    this.right.geometry.dispose();
    (this.left.material as THREE.Material).dispose();
  }
}

const BIRDS = 7;
/** Ein Flügel: Spannweite, Wurzel und Hinterkante (Meter des Bretts). */
const W_SPAN = 0.09;
const W_ROOT = 0.03;
const W_TIP = 0.035;
const BIRD_HEIGHT = 5;
const BIRD_SPEED = 1.3;

/**
 * **Wo auf einer Kachel etwas steht** — die Ausstattung (`dressTile`), deren
 * Modell `match` erfüllt, als Punkt auf dem Brett.
 */
function spots(tile: PlacedTile, match: (model: string) => boolean): THREE.Vector3[] {
  const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
  const turn = tile.rot * (Math.PI / 3);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return dressTile(tile.spec)
    .filter((d) => match(d.model))
    .map((d) => {
      const x = d.x * HEX_SCALE;
      const z = d.z * HEX_SCALE;
      return new THREE.Vector3(c.x + x * cos - z * sin, 0, c.z + x * sin + z * cos);
    });
}

/** Hinter einem Ding, von der Kamera aus gesehen — dort ist man unsichtbar. */
function behind(spot: THREE.Vector3, eye: THREE.Vector3): THREE.Vector3 {
  const away = spot.clone().sub(eye);
  away.y = 0;
  if (away.lengthSq() < 1e-6) away.set(0, 0, 1);
  return spot.clone().add(away.setLength(0.3));
}

/** Die Mitte der Kante `e` einer Kachel, auf dem Brett. */
function edgePoint(tile: PlacedTile, e: number, y = 0): THREE.Vector3 {
  const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
  const a = e * (Math.PI / 3);
  return new THREE.Vector3(c.x + Math.cos(a) * APOTHEM, y, c.z + Math.sin(a) * APOTHEM);
}

const APOTHEM = HEX_WIDTH / 2;

/**
 * **Wo eine Fahrt beginnen kann** — Kanten dieses Geländes, hinter denen nichts
 * weitergeht (der Rand des Bretts), oder, auf einer Sackgasse, die Mitte (`-1`).
 */
function ends(board: HexBoard, tile: PlacedTile, terrain: 'water' | 'road'): number[] {
  const own = [0, 1, 2, 3, 4, 5].filter((e) => edgeAt(tile.spec, tile.rot, e) === terrain);
  if (own.length === 0) return [];
  if (own.length === 1) return [-1];
  return own.filter((e) => !board.at(...qr(neighbour(tile, e))));
}

/**
 * **Der Weg einer Fahrt** — von `start` (einer Kante oder der Mitte) durch
 * Kachel um Kachel, solange das Gelände an der Nachbarkante weitergeht; an
 * einer Gabelung gewürfelt. Höchstens zwölf Kacheln.
 */
function trail(
  board: HexBoard,
  first: PlacedTile,
  start: number,
  terrain: 'water' | 'road',
): THREE.Vector3[] {
  const y = terrain === 'water' ? 0.01 : 0.02;
  const centre = (tile: PlacedTile): THREE.Vector3 => {
    const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
    return new THREE.Vector3(c.x, y, c.z);
  };
  const points: THREE.Vector3[] = [];
  if (start >= 0) points.push(edgePoint(first, start, y));
  points.push(centre(first));
  let tile = first;
  let entry = start;
  const seen = new Set<string>([hexKey(tile.q, tile.r)]);
  for (let step = 0; step < 12; step++) {
    const exits = [0, 1, 2, 3, 4, 5].filter(
      (e) => e !== entry && edgeAt(tile.spec, tile.rot, e) === terrain,
    );
    if (exits.length === 0) break;
    const exit = pick(exits);
    points.push(edgePoint(tile, exit, y));
    const n = neighbour(tile, exit);
    const next = board.at(n.q, n.r);
    if (!next || edgeAt(next.spec, next.rot, opposite(exit)) !== terrain) break;
    if (seen.has(hexKey(next.q, next.r))) break;
    seen.add(hexKey(next.q, next.r));
    tile = next;
    entry = opposite(exit);
    points.push(centre(tile));
  }
  return points;
}

/**
 * **Flussabwärts** — von einem Arm, durch den Wasser hereinkommt und hinter dem
 * kein Fluss weitergeht (Rand, See, Ufer), immer durch die Arme hinaus
 * (`riverFlow`, in den Kanten der Kachel ungedreht), bis der Fluss endet: am
 * Rand oder in einem See, einer Bucht. Höchstens zwölf Kacheln.
 */
function downstream(board: HexBoard, tiles: PlacedTile[]): THREE.Vector3[] | null {
  const flows = riverFlow(board.tiles);
  const arms = (tile: PlacedTile, mask: number): number[] =>
    [0, 1, 2, 3, 4, 5].filter((e) => mask & (1 << e)).map((e) => (e + tile.rot) % 6);
  const starts: Array<{ tile: PlacedTile; edge: number }> = [];
  for (const tile of tiles) {
    const flow = flows.get(hexKey(tile.q, tile.r));
    if (!flow) continue;
    for (const edge of arms(tile, flow.into)) {
      const n = neighbour(tile, edge);
      if (!flows.has(hexKey(n.q, n.r))) starts.push({ tile, edge });
    }
  }
  if (starts.length === 0) return null;
  const y = 0.01;
  const centre = (tile: PlacedTile): THREE.Vector3 => {
    const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
    return new THREE.Vector3(c.x, y, c.z);
  };
  const start = pick(starts);
  let tile = start.tile;
  const points = [edgePoint(tile, start.edge, y), centre(tile)];
  const seen = new Set<string>([hexKey(tile.q, tile.r)]);
  for (let step = 0; step < 12; step++) {
    const flow = flows.get(hexKey(tile.q, tile.r))!;
    const exits = arms(tile, flow.out);
    if (exits.length === 0) break;
    const exit = pick(exits);
    points.push(edgePoint(tile, exit, y));
    const n = neighbour(tile, exit);
    const next = board.at(n.q, n.r);
    if (!next) break;
    const key = hexKey(next.q, next.r);
    // In einen See oder eine Bucht hinein: bis zur Mitte, dort ist Schluss.
    if (!flows.has(key)) {
      if (edgeAt(next.spec, next.rot, opposite(exit)) === 'water') points.push(centre(next));
      break;
    }
    if (seen.has(key)) break;
    seen.add(key);
    tile = next;
    points.push(centre(tile));
  }
  return points;
}

/**
 * **Ein Weg durch ein Waldgebiet** — vom Wald auf `start` Kachel für Kachel
 * über Waldkanten (`areaEdges`: nur Kanten, die zu diesem Gebiet gehören), ein
 * bis drei Schritte weit. `through` sind die Punkte dazwischen: die Mitte der
 * gemeinsamen Kante und, auf den Kacheln unterwegs, die Mitte ihres Waldes.
 */
function forestRoute(
  board: HexBoard,
  start: PlacedTile,
): { tiles: PlacedTile[]; through: THREE.Vector3[] } | null {
  const edges = board.areaEdges(start.q, start.r, 'forest');
  if (edges.length === 0) return null;
  const mine = new Set(edges.map(({ tile, edge }) => `${hexKey(tile.q, tile.r)}:${edge}`));
  const has = (tile: PlacedTile, edge: number): boolean =>
    mine.has(`${hexKey(tile.q, tile.r)}:${edge}`);
  // Breitensuche über Waldkanten — wer wohin führt.
  const from = new Map<string, { tile: PlacedTile; via: number } | null>([
    [hexKey(start.q, start.r), null],
  ]);
  const depth = new Map<string, number>([[hexKey(start.q, start.r), 0]]);
  const queue = [start];
  while (queue.length) {
    const tile = queue.shift()!;
    const d = depth.get(hexKey(tile.q, tile.r))!;
    if (d >= 3) continue;
    for (let e = 0; e < 6; e++) {
      if (!has(tile, e)) continue;
      const n = neighbour(tile, e);
      const next = board.at(n.q, n.r);
      if (!next || !has(next, opposite(e))) continue;
      const key = hexKey(next.q, next.r);
      if (from.has(key)) continue;
      from.set(key, { tile, via: e });
      depth.set(key, d + 1);
      queue.push(next);
    }
  }
  const far = [...depth.entries()].filter(([, d]) => d > 0).map(([k]) => k);
  // Ein Wald auf einer Kachel: von Baum zu Baum auf ihr.
  if (far.length === 0) return { tiles: [start, start], through: [] };
  let key = pick(far);
  const chain: Array<{ tile: PlacedTile; via: number }> = [];
  for (let step = from.get(key); step; step = from.get(hexKey(step.tile.q, step.tile.r))) {
    chain.unshift(step);
    key = hexKey(step.tile.q, step.tile.r);
  }
  const tiles: PlacedTile[] = [start];
  const through: THREE.Vector3[] = [];
  for (let i = 0; i < chain.length; i++) {
    const { tile, via } = chain[i]!;
    if (i > 0) through.push(woods(tile));
    through.push(edgePoint(tile, via));
    const n = neighbour(tile, via);
    tiles.push(board.at(n.q, n.r)!);
  }
  return { tiles: [start, tiles[tiles.length - 1]!], through };
}

/** Die Mitte des Waldes auf einer Kachel — zwischen Mitte und seinen Kanten. */
function woods(tile: PlacedTile): THREE.Vector3 {
  const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
  const out = new THREE.Vector3(c.x, 0, c.z);
  const forest = [0, 1, 2, 3, 4, 5].filter((e) => edgeAt(tile.spec, tile.rot, e) === 'forest');
  if (forest.length === 0 || forest.length === 6) return out;
  const sum = new THREE.Vector3();
  for (const e of forest) sum.add(edgePoint(tile, e));
  return out.lerp(sum.divideScalar(forest.length), 0.55);
}

function isTree(model: string): boolean {
  return model.includes('/trees_') || model.includes('/tree_single');
}

function qr(hex: { q: number; r: number }): [number, number] {
  return [hex.q, hex.r];
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

const _tangent = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _wing = new THREE.Quaternion();
const _roll = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _up = new THREE.Vector3(0, 1, 0);
const _forward = new THREE.Vector3(0, 0, 1);
const _one = new THREE.Vector3(1, 1, 1);
const _matrix = new THREE.Matrix4();
