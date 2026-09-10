import {
  emptySnapshot,
  pointInPolygon,
  type MapDoor,
  type MapEntity,
  type MapFixture,
  type MapNoise,
  type MapPoint,
  type MapSnapshot,
} from './mapSnapshot';
import { emptyField, type VisibilityField, type VisibilityMode } from './visibility';
import { NOISE_TILE } from './noiseSpread';
import { NoiseWaves, WAVE_LINGER, WAVE_SPEED, type NoiseInk } from './noiseWaves';

/**
 * **Die Karte als Bauteil** — ein Canvas im DOM, das einen `MapSnapshot`
 * zeichnet und Berührungen zurückgibt.
 *
 * Sie weiß nichts von Rollen. Was sie zeigt, sagen ihr die **Layer**; was
 * sie mit einem Tipp tut, sagen ihr die **Handler**. Die Schalttafel baut
 * eine ohne Spieler- und Monstermarker (`layers.entities = false`), der
 * Späher eine mit gedrosselten Markern (`markers: { hz: 2 }`), die 2D-Welt
 * eine mit allem und dem Sichtbarkeitsfeld darüber. Dieselbe Klasse, drei
 * Einstellungen — nicht drei Klassen.
 *
 * **Die Handschrift ist die eines Brettspiels von oben**, nicht die eines
 * Bauplans: helle Böden mit Kachelfugen, dicke dunkle Wände, Türen als
 * Blätter, die in der Wand stecken, Möbel als Klötze, Figuren als kleine
 * Astronauten mit Händen — und Geräusche als Wellen, die über die Kacheln
 * laufen, statt als Kreis um den, der sie macht. Was man auf einem Telefon
 * mit einem Blick erkennen muss, braucht Form und nicht Beschriftung.
 *
 * **Pan und Pinch-Zoom** sind eingebaut (`MapViewState`), nicht die Sache
 * der Rollenansicht. Wer die Kamera führen will (die 2D-Welt folgt dem
 * Spieler), setzt `follow`; sobald der Nutzer zieht, ist sie wieder frei.
 *
 * **Norden ist oben.** `x` nach rechts, `z` nach unten — wie das Blatt des
 * Archivars. Alles in Metern hinein, Bildpunkte kommen nur beim Zeichnen vor.
 */

/** Welche Schichten gezeichnet werden. Alles `true` ist die 2D-Welt. */
export interface MapLayers {
  rooms: boolean;
  /** Raumnamen als Beschriftung. */
  labels: boolean;
  doors: boolean;
  lights: boolean;
  /** Fracht, Konsolen, Schränke, Aufgaben. */
  items: boolean;
  /** Spieler, Bot, Monster, Drohne, Mitspieler — als Ganzes. */
  entities: boolean;
  /** Das Sichtbarkeitsfeld darüber: Licht, Dunkel, Kegel, Geräusch. */
  visibility: boolean;
  /** Wegstrecken, wenn das Navmesh-Paket welche liefert (`MapViewOptions.routes`). */
  routes: boolean;
  /** Die Möbel — Kryokapseln, Tische, Kisten, und die Klötze von Fracht, Schrank, Konsole. */
  fixtures: boolean;
  /** Die Schächte: Linien zwischen verbundenen Klappen, mit dem Ziel daran. */
  vents: boolean;
  /** Die Ziele des Technikers: Ring am Ort, Dreieck am Bildrand (`MapViewOptions.objectives`). */
  objectives: boolean;
}

export const ALL_LAYERS: Readonly<MapLayers> = {
  rooms: true,
  labels: true,
  doors: true,
  lights: true,
  items: true,
  entities: true,
  visibility: true,
  routes: true,
  fixtures: true,
  vents: false,
  objectives: true,
};

/** Die Schalttafel: Räume, Türen, Lichter — niemand, der sich bewegt. */
export const PANEL_LAYERS: Readonly<MapLayers> = {
  ...ALL_LAYERS,
  items: false,
  entities: false,
  visibility: false,
  routes: false,
  objectives: false,
};

/**
 * Wie oft Marker nachgeführt werden. `'live'` mit jedem Snapshot,
 * `'none'` gar nicht (Marker werden nicht gezeichnet, auch wenn der Layer
 * an ist), `{ hz }` gedrosselt: Der Späher sieht das Monster als Punkt, der
 * springt, nicht als Punkt, der läuft.
 */
export type MarkerPolicy = 'live' | 'none' | { hz: number };

/** Wo die Karte hinschaut: Mitte in Metern, Zoom in Pixeln je Meter. */
export interface MapViewState {
  centreX: number;
  centreZ: number;
  /** Bildpunkte je Meter, in Gerätepunkten (vor der Pixeldichte). */
  scale: number;
  /** Drehung der Karte in Bogenmaß; 0 heißt Norden oben. */
  rotation: number;
}

/** Eine Wegstrecke, die ein anderes Paket auf die Karte legen darf. */
export interface MapRoute {
  id: string;
  points: MapPoint[];
  /** `#rrggbb`. */
  color: string;
  /** Ein Zielring am Ende. */
  goal?: boolean;
}

/** Ein Ziel des Technikers — Fracht, Konsole, die Zentrale. */
/** Was gerade hervorgehoben wird: wo, und was der Knopf damit täte. */
export interface MapHighlight {
  at: MapPoint;
  label: string;
}

export interface MapGoal {
  id: string;
  at: MapPoint;
  label: string;
  /** Ob es das nächste ist — das pulsiert und bekommt das größte Dreieck. */
  next: boolean;
}

/** Was eine Ansicht nach allem anderen selbst noch zeichnen darf. */
export type MapOverlay = (ctx: CanvasRenderingContext2D, view: MapView) => void;

export interface MapViewOptions {
  layers?: Partial<MapLayers>;
  markers?: MarkerPolicy;
  /** Ob Pan und Pinch-Zoom des Nutzers angenommen werden. */
  gestures?: boolean;
  /** Grenzen des Zooms in Pixeln je Meter. */
  minScale?: number;
  maxScale?: number;
  /** Womit die Karte anfängt — sonst das ganze Haus im Bild. */
  view?: Partial<MapViewState>;
  /** Der Modus des Sichtbarkeitsfelds, wenn der Layer an ist. */
  mode?: VisibilityMode;
  /** Wessen Karte das ist — dessen Geräusche bekommen die eigene Farbe. */
  viewerId?: string;
  /** Wegstrecken, je Bild abgefragt (Layer `routes`). */
  routes?: () => readonly MapRoute[];
  /** Die Ziele, je Bild abgefragt (Layer `objectives`). */
  objectives?: () => readonly MapGoal[];
  /**
   * **Welche Geräusche diese Karte zeigt** — voreingestellt die des
   * Snapshots. Der Späher reicht hier sein Horchbild herein: eine Probe alle
   * paar Sekunden statt eines fortlaufenden Bandes (`map/flatMode.ts`).
   */
  noises?: () => readonly MapNoise[];
  /**
   * **Das eine Ding, mit dem der Betrachter gerade etwas tun kann** — je Bild
   * abgefragt und als pulsierender Ring darüber gezeichnet. Das Monster
   * bekommt so seine Klappe, seine Kabine oder seine Tür gezeigt, und zwar
   * immer nur die **nächste** (`monster/monsterHelm.ts`): Zwei hervorgehobene
   * Dinge sind eine Frage, und die Antwort steht in keinem Knopf.
   */
  highlight?: () => MapHighlight | null;
  /** Wie weit die Randdreiecke vom Rand wegbleiben, in Punkten — unter dem HUD. */
  edge?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Zum Schluss: was die Ansicht selbst noch malt (Peilung des Spähers). */
  overlay?: MapOverlay;
  /** Die Uhr — für Tests austauschbar. */
  now?: () => number;
  onRoomClick?: (roomId: string, at: { x: number; z: number }) => void;
  onEntityClick?: (entityId: string) => void;
  onDoorClick?: (doorId: string) => void;
  onLightClick?: (lightId: string) => void;
  onItemClick?: (itemId: string) => void;
  /** Ein Tipp ins Leere — Boden ohne Raum. */
  onGroundClick?: (at: { x: number; z: number }) => void;
  /** Der Nutzer hat gezogen oder gezoomt; `follow` ist damit aus. */
  onViewChange?: (view: MapViewState) => void;
}

/** Wie weit ein Finger wandern darf und trotzdem ein Tipp bleibt, in Punkten. */
const TAP_SLOP = 8;
/** Wie stark das Mausrad zoomt, je Punkt Raddrehung. */
const WHEEL_RATE = 0.0016;
/** Wie nah ein Tipp an einem Marker sein muss, in Punkten. */
const HIT = 16;
/** Die Kachel des Bodens, in Metern — eine halbe Rasterkachel. */
const FLOOR_TILE = NOISE_TILE;
export { WAVE_SPEED, WAVE_LINGER };

export const INK = {
  ground: '#0b1220',
  roomDark: '#131a29',
  roomGrey: '#2c3448',
  roomLit: '#56668a',
  corridorLit: '#4e5c7c',
  grid: 'rgba(12, 18, 32, 0.22)',
  wallDark: '#0d1220',
  wallLight: '#8ea3c8',
  window: '#6fe0ee',
  glass: '#3f8f98',
  label: 'rgba(230, 238, 255, 0.82)',
  labelShadow: 'rgba(0, 0, 0, 0.6)',
  light: '#ffd27a',
  lightOff: '#3a3f4e',
  torch: 'rgba(255, 226, 160, 0.26)',
  lamp: 'rgba(255, 236, 200, 0.2)',
  self: 'rgba(160, 200, 255, 0.16)',
  frame: '#0d1220',
  doorOpen: '#7fe0ff',
  doorSteel: '#aebfe0',
  doorWood: '#c9a36b',
  doorLocked: '#ff4d55',
  doorLockedWood: '#e0745c',
  fixture: '#3b4762',
  fixtureEdge: '#1a2133',
  fixtureTop: '#4d5a7a',
  cargo: '#f0b64a',
  cargoTaken: '#4a4f5e',
  console: '#8ff0b0',
  consoleBroken: '#ff5a5f',
  locker: '#8fa0ff',
  van: '#7ff0ff',
  vent: '#9aa8b8',
  ventOpen: '#ffb14a',
  ventLink: 'rgba(255, 177, 74, 0.55)',
  player: '#3ec7ff',
  bot: '#6fe39a',
  peer: '#c3a5ff',
  drone: '#ffd85a',
  monster: '#d8232e',
  monsterDark: '#5a0b12',
  visor: '#bfe9ff',
  cone: 'rgba(127, 240, 255, 0.35)',
  monsterCone: 'rgba(255, 77, 85, 0.35)',
  noiseOwn: '#5cc8ff',
  noiseOther: '#ff8a3d',
  noiseMonster: '#ff3b47',
  reach: '#ffb14a',
  reachGlow: 'rgba(255, 177, 74, 0.18)',
  goal: '#ffd84a',
  goalDim: 'rgba(255, 216, 74, 0.55)',
};

const ENTITY_COLOR: Record<MapEntity['kind'], string> = {
  player: INK.player,
  bot: INK.bot,
  peer: INK.peer,
  drone: INK.drone,
  monster: INK.monster,
};

export class MapView {
  /** Das Element, das in die Seite gehängt wird. Größe kommt aus dem CSS. */
  readonly element: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  private snapshot: MapSnapshot = emptySnapshot();
  private field: VisibilityField;
  private layers: MapLayers;
  private markers: MarkerPolicy;
  private state: MapViewState = { centreX: 0, centreZ: 0, scale: 12, rotation: 0 };
  private following: string | null = null;
  private fitted = false;
  private wantFit = true;
  /** Der Stand der Marker, wie sie zuletzt gezeichnet wurden (bei Drosselung). */
  private markerSnapshot: MapSnapshot['entities'] = [];
  private markerTime = -Infinity;
  private readonly pointers = new Map<
    number,
    { x: number; y: number; startX: number; startY: number }
  >();
  private pinchSpan = 0;
  private dragged = false;
  private readonly now: () => number;
  private readonly minScale: number;
  private readonly maxScale: number;
  /** Wohin jede Figur zuletzt schaute (links oder rechts) — damit sie beim Gehen nach oben nicht flackert. */
  private readonly facing = new Map<string, number>();
  /** Kachelfeld und geflutete Wellen, gemeinsam mit der Szene (`noiseWaves.ts`). */
  private readonly waves = new NoiseWaves();
  /** Was das letzte Bild gezeichnet hat — für Tests. */
  stats = { entities: 0, items: 0, lit: 0, rooms: 0, fixtures: 0, noises: 0, goals: 0 };

  constructor(private readonly options: MapViewOptions = {}) {
    this.layers = { ...ALL_LAYERS, ...options.layers };
    this.markers = options.markers ?? 'live';
    this.field = emptyField(options.mode ?? 'realistic');
    this.now =
      options.now ?? (() => (typeof performance === 'undefined' ? Date.now() : performance.now()));
    this.minScale = options.minScale ?? 3;
    this.maxScale = options.maxScale ?? 80;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'mapview__canvas';
    this.element = document.createElement('div');
    this.element.className = 'mapview';
    this.element.append(this.canvas);
    if (options.view) {
      this.state = { ...this.state, ...options.view };
      this.wantFit = false;
    }
    this.listen();
  }

  /** Einen neuen Zustand hineingeben. Zeichnet beim nächsten `draw`. */
  setSnapshot(snapshot: MapSnapshot): void {
    if (snapshot.seed !== this.snapshot.seed) this.wantFit = !this.options.view;
    this.snapshot = snapshot;
  }

  /** Das Sichtbarkeitsfeld dazu — von `visibility.ts`, nicht selbst gerechnet. */
  setVisibility(field: VisibilityField): void {
    this.field = field;
  }

  setLayers(layers: Partial<MapLayers>): void {
    this.layers = { ...this.layers, ...layers };
  }

  setMarkers(policy: MarkerPolicy): void {
    this.markers = policy;
  }

  /** Die Kamera setzen — schaltet `follow` aus. */
  setView(view: Partial<MapViewState>): void {
    this.following = null;
    this.wantFit = false;
    this.state = { ...this.state, ...view };
    this.state.scale = this.clampScale(this.state.scale);
  }

  getView(): MapViewState {
    return { ...this.state };
  }

  /** Der Kamera ein Wesen nachführen; `null` lässt sie los. */
  follow(entityId: string | null): void {
    this.following = entityId;
    if (entityId) this.wantFit = false;
  }

  /** Das ganze Haus ins Bild. */
  fit(): void {
    this.following = null;
    this.wantFit = true;
    this.fitted = false;
  }

  private clampScale(scale: number): number {
    return Math.min(this.maxScale, Math.max(this.minScale, scale));
  }

  private size(): { w: number; h: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { w: rect.width || 320, h: rect.height || 320 };
  }

  private fitNow(): void {
    const b = this.snapshot.bounds;
    const { w, h } = this.size();
    const spanX = Math.max(1, b.maxX - b.minX + 4);
    const spanZ = Math.max(1, b.maxZ - b.minZ + 4);
    this.state = {
      centreX: (b.minX + b.maxX) / 2,
      centreZ: (b.minZ + b.maxZ) / 2,
      scale: this.clampScale(Math.min(w / spanX, h / spanZ)),
      rotation: 0,
    };
    this.fitted = true;
  }

  /** Ein Bild zeichnen. Die Ansicht ruft das aus ihrem Takt — nicht die Karte. */
  draw(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = this.size();
    const dpr = Math.min(
      2,
      Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1),
    );
    const pw = Math.max(1, Math.round(w * dpr)),
      ph = Math.max(1, Math.round(h * dpr));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    if (this.wantFit && !this.fitted && this.snapshot.rooms.length) this.fitNow();
    if (this.following) {
      const target = this.snapshot.entities.find((e) => e.id === this.following);
      if (target) {
        this.state.centreX = target.at.x;
        this.state.centreZ = target.at.z;
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = INK.ground;
    ctx.fillRect(0, 0, w, h);
    this.stats = { entities: 0, items: 0, lit: 0, rooms: 0, fixtures: 0, noises: 0, goals: 0 };

    const s = this.snapshot;
    const f = this.field;
    const omniscient = f.mode === 'omniscient' || !this.layers.visibility;
    const litRooms = new Set(f.litRooms);
    const scale = this.state.scale;

    // --- Böden ----------------------------------------------------------------
    if (this.layers.rooms) {
      for (const room of s.rooms) {
        this.path(ctx, room.polygon);
        ctx.fillStyle = omniscient
          ? litRooms.has(room.id)
            ? room.circulation
              ? INK.corridorLit
              : INK.roomLit
            : INK.roomGrey
          : INK.roomDark;
        ctx.fill();
        this.stats.rooms++;
      }
    }

    // --- Geräusche als Wellen über den Boden ----------------------------------------
    // Ganz hinten, direkt auf den Böden: Licht, Möbel, Wände und vor allem die
    // Figuren liegen darüber. Eine Welle, die den Spieler überdeckt, nimmt ihm
    // genau das Bild, für das sie da ist.
    if (this.layers.visibility) this.drawNoise(ctx);

    // --- Licht ----------------------------------------------------------------
    if (this.layers.visibility) {
      for (const region of f.lit) {
        if (region.polygon.length < 3) continue;
        this.path(ctx, region.polygon);
        ctx.fillStyle = region.fov !== undefined ? INK.torch : INK.lamp;
        ctx.fill();
        this.stats.lit++;
      }
      if (f.self && f.self.polygon.length >= 3) {
        this.path(ctx, f.self.polygon);
        ctx.fillStyle = INK.self;
        ctx.fill();
      }
    }

    // --- Kachelfugen ------------------------------------------------------------
    if (this.layers.rooms && scale >= 7) this.drawGrid(ctx, w, h);

    // --- Möbel -------------------------------------------------------------------
    if (this.layers.fixtures && s.fixtures) {
      for (const fixture of s.fixtures) {
        if (!omniscient && !this.seen(fixture.at)) continue;
        this.drawFixture(ctx, fixture);
        this.stats.fixtures++;
      }
    }

    // --- Wände: erst der dunkle Kern, dann die helle Kante -------------------------
    if (this.layers.rooms) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const pass of [0, 1] as const) {
        for (const wall of s.walls) {
          const a = this.toScreen(wall.a.x, wall.a.z),
            b = this.toScreen(wall.b.x, wall.b.z);
          if (wall.kind === 'wall') {
            ctx.strokeStyle = pass === 0 ? INK.wallDark : INK.wallLight;
            ctx.lineWidth = pass === 0 ? Math.max(3, scale * 0.3) : Math.max(1, scale * 0.11);
          } else {
            if (pass === 1) continue;
            ctx.strokeStyle = wall.kind === 'window' ? INK.window : INK.glass;
            ctx.lineWidth = Math.max(1.5, scale * 0.12);
          }
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // --- Türen ----------------------------------------------------------------
    if (this.layers.doors) for (const door of s.doors) this.drawDoor(ctx, door);

    // --- Schächte -------------------------------------------------------------------
    if (this.layers.vents) this.drawVents(ctx);

    // --- Lichter ---------------------------------------------------------------
    if (this.layers.lights) {
      for (const light of s.lights) {
        if (light.kind === 'torch' || light.kind === 'drone' || light.kind === 'command') continue;
        const p = this.toScreen(light.at.x, light.at.z);
        const r = Math.max(3, scale * 0.22);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = light.on ? INK.light : INK.lightOff;
        ctx.fill();
        ctx.strokeStyle = INK.frame;
        ctx.lineWidth = 1;
        ctx.stroke();
        if (light.on) {
          ctx.strokeStyle = 'rgba(255, 210, 122, 0.45)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 1.8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // --- Beschriftung --------------------------------------------------------
    if (this.layers.labels && scale >= 5) {
      ctx.font = `600 ${Math.max(10, Math.min(15, scale * 0.9))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const room of s.rooms) {
        if (room.circulation && scale < 9) continue;
        const p = this.toScreen(room.centre.x, room.centre.z);
        // Unter dem Namen der Boden, nicht das Möbel: ein Stück höher als die Mitte.
        const y = p.y - (room.circulation ? 0 : Math.max(8, scale * 1.2));
        ctx.fillStyle = INK.labelShadow;
        ctx.fillText(room.name, p.x + 1, y + 1);
        ctx.fillStyle = INK.label;
        ctx.fillText(room.name, p.x, y);
      }
    }

    // --- Wege ------------------------------------------------------------------
    if (this.layers.routes && this.options.routes) {
      for (const route of this.options.routes()) {
        if (route.points.length < 2) continue;
        ctx.strokeStyle = route.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        route.points.forEach((point, i) => {
          const p = this.toScreen(point.x, point.z);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
        if (route.goal) {
          const end = route.points[route.points.length - 1]!;
          const p = this.toScreen(end.x, end.z);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // --- Items -----------------------------------------------------------------
    if (this.layers.items) {
      for (const item of s.items) {
        if (!omniscient && item.kind !== 'van' && !this.seen(item.at)) continue;
        this.drawItem(ctx, item);
        this.stats.items++;
      }
    }

    // --- Sichtkegel und Hörweite -------------------------------------------------
    if (this.layers.visibility) {
      for (const cone of f.cones) {
        if (cone.polygon.length < 3) continue;
        this.path(ctx, cone.polygon);
        ctx.strokeStyle = cone.entityId === 'monster' ? INK.monsterCone : INK.cone;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (const noise of f.noise) {
        if (noise.cause !== 'monster') continue;
        const p = this.toScreen(noise.at.x, noise.at.z);
        ctx.beginPath();
        ctx.arc(p.x, p.y, noise.radius * scale, 0, Math.PI * 2);
        ctx.strokeStyle = INK.monsterCone;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // --- Wesen -----------------------------------------------------------------
    if (this.layers.entities && this.markers !== 'none') {
      const visible = new Set(f.visibleEntities);
      for (const entity of this.markerEntities()) {
        if (this.layers.visibility && !visible.has(entity.id)) continue;
        this.drawEntity(ctx, entity);
        this.stats.entities++;
      }
    }

    // --- Ziele -----------------------------------------------------------------
    if (this.options.highlight) this.drawHighlight(ctx);
    if (this.layers.objectives && this.options.objectives) this.drawGoals(ctx, w, h);

    this.options.overlay?.(ctx, this);
  }

  // --- Die Handschrift -----------------------------------------------------------

  /** Ob ein Punkt im Hellen liegt — Möbel und Items im Dunkeln bleiben Dunkel. */
  private seen(at: MapPoint): boolean {
    const f = this.field;
    for (const region of f.lit)
      if (
        Math.hypot(at.x - region.at.x, at.z - region.at.z) <= region.radius &&
        pointInPolygon(at, region.polygon)
      )
        return true;
    return !!f.self && pointInPolygon(at, f.self.polygon);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const a = this.toWorld(0, 0),
      b = this.toWorld(w, h);
    const minX = Math.min(a.x, b.x),
      maxX = Math.max(a.x, b.x),
      minZ = Math.min(a.z, b.z),
      maxZ = Math.max(a.z, b.z);
    ctx.save();
    ctx.beginPath();
    for (const room of this.snapshot.rooms) {
      room.polygon.forEach((point, i) => {
        const p = this.toScreen(point.x, point.z);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
    }
    ctx.clip();
    ctx.strokeStyle = INK.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(minX / FLOOR_TILE) * FLOOR_TILE; x <= maxX; x += FLOOR_TILE) {
      const p = this.toScreen(x, minZ),
        q = this.toScreen(x, maxZ);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    }
    for (let z = Math.floor(minZ / FLOOR_TILE) * FLOOR_TILE; z <= maxZ; z += FLOOR_TILE) {
      const p = this.toScreen(minX, z),
        q = this.toScreen(maxX, z);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * **Geräusche laufen über die Kacheln** — und zwar nur über die **freien**.
   * Jede Welle hat eine Front, die mit `WAVE_SPEED` nach außen geht, und
   * dahinter einen Saum, der verblasst; was zählt, ist nicht die Luftlinie,
   * sondern die Länge des begehbaren Wegs (`noiseSpread.ts`): durch die
   * offene Tür, um die Ecke, nie durch eine Wand und nie über den leeren
   * Weltraum neben der Station. **Die Schächte leiten** wie im Hörmodell —
   * was das Monster darin anstellt, ist zwei Räume weiter zu hören, und in
   * die andere Richtung ebenso.
   *
   * Die eigenen Geräusche sind blau, die des Monsters rot, alles andere
   * (Türen, Fracht, Mitspieler) orange — damit man auf der Karte *sieht*, was
   * man im Schiff nur hört, und weiß, ob man es selbst war.
   *
   * **Ganz hinten gezeichnet**, direkt auf den Böden: Eine Welle, die über
   * Figuren und Möbeln läge, nähme genau das Bild weg, für das sie da ist.
   */
  private drawNoise(ctx: CanvasRenderingContext2D): void {
    const s = this.snapshot;
    const { w, h } = this.size();
    // Alle vier Ecken, nicht zwei: Die Karte darf gedreht sein, und dann ist
    // das Bild im Weltraster kein achsenparalleles Rechteck mehr.
    const corners = [
      this.toWorld(0, 0),
      this.toWorld(w, 0),
      this.toWorld(0, h),
      this.toWorld(w, h),
    ];
    this.stats.noises += this.waves.paint(ctx, {
      bounds: {
        minX: Math.min(...corners.map((c) => c.x)),
        minZ: Math.min(...corners.map((c) => c.z)),
        maxX: Math.max(...corners.map((c) => c.x)),
        maxZ: Math.max(...corners.map((c) => c.z)),
      },
      snapshot: s,
      noises: this.options.noises?.() ?? s.noises ?? [],
      // Der Gang der Wesen ohne Ereignis: die leise Fläche um jeden, der geht
      // (nur im Modus „Alles sehen").
      steady: this.field.noise.filter((n) => n.cause !== 'monster'),
      ink: this.noiseInk(),
      steadyInk: (noise) => {
        const viewer = this.options.viewerId ?? '';
        if (this.deafToSelf() && noise.entityId === viewer) return null;
        return noise.entityId === viewer ? INK.noiseOwn : INK.noiseOther;
      },
      toScreen: (x, z) => this.toScreen(x, z),
      scale: this.state.scale,
    });
  }

  /**
   * **Wer das Monster spielt, hört sich nicht selbst.** Für alle anderen ist
   * die eigene Welle eine Auskunft — wie weit der eigene Schritt getragen hat
   * —, für das Monster wäre sie ein blauer Teppich um die eigenen Füße, der
   * alles überdeckt, wofür die Karte da ist (`audio/soundscape.ts`).
   */
  private deafToSelf(): boolean {
    const viewer = this.options.viewerId ?? '';
    return this.snapshot.entities.find((entity) => entity.id === viewer)?.kind === 'monster';
  }

  /**
   * Die Farben der Wellen. Im Modus „Alles sehen" (Zuschauer, Bot-Runde) sagt
   * die Farbe, wer es war: die eigenen blau, die des Monsters rot, alles
   * andere orange. **Wer mitspielt, hört diesen Unterschied nicht** — ein
   * Geräusch ist ein Geräusch, und ob es vom Mitspieler oder vom Monster kam,
   * steht nicht dran. Sonst wäre die Karte ein Ortungsgerät.
   */
  private noiseInk(): NoiseInk {
    const viewer = this.options.viewerId ?? '';
    const deaf = this.deafToSelf();
    const knowing = this.field.mode === 'omniscient' || !this.layers.visibility;
    return (noise) => {
      if (deaf && noise.by === viewer) return null;
      if (noise.by && noise.by === viewer) return INK.noiseOwn;
      if (!knowing) return INK.noiseOther;
      return noise.cause === 'monster' || noise.by === 'monster'
        ? INK.noiseMonster
        : INK.noiseOther;
    };
  }

  /** Ein Möbel: ein Klotz mit Kante und Deckel, gedreht wie im Schiff, mit einem kleinen Kennzeichen darauf. */
  private drawFixture(ctx: CanvasRenderingContext2D, fixture: MapFixture): void {
    const scale = this.state.scale;
    const p = this.toScreen(fixture.at.x, fixture.at.z);
    const w = fixture.width * scale,
      d = fixture.depth * scale;
    if (w < 2 || d < 2) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-fixture.yaw - this.state.rotation);
    const fill =
      fixture.kind === 'cargo'
        ? '#6b5527'
        : fixture.kind === 'locker'
          ? '#3f4a7a'
          : fixture.kind === 'console'
            ? '#2f5a4d'
            : INK.fixture;
    this.roundRect(ctx, -w / 2, -d / 2, w, d, Math.min(w, d) * 0.22);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = Math.max(1, scale * 0.06);
    ctx.strokeStyle = INK.fixtureEdge;
    ctx.stroke();
    // Der Deckel: etwas kleiner und heller — so sieht ein Klotz von oben nach Höhe aus.
    if (w > 8 && d > 8) {
      const inset = Math.max(1.5, scale * 0.08);
      this.roundRect(ctx, -w / 2 + inset, -d / 2 + inset, w - 2 * inset, d - 2 * inset, inset);
      ctx.fillStyle = fixture.kind === 'fixture' ? INK.fixtureTop : 'rgba(255,255,255,0.08)';
      ctx.fill();
    }
    if (fixture.kind === 'fixture' && scale >= 10) this.drawMark(ctx, fixture.mark ?? '', w, d);
    ctx.restore();
  }

  /** Das Kennzeichen eines Möbels — nicht das Möbel selbst, nur der Wink, was es ist. */
  private drawMark(ctx: CanvasRenderingContext2D, mark: string, w: number, d: number): void {
    ctx.strokeStyle = 'rgba(220, 230, 255, 0.55)';
    ctx.fillStyle = 'rgba(220, 230, 255, 0.35)';
    ctx.lineWidth = 1.2;
    const r = Math.min(w, d) * 0.28;
    ctx.beginPath();
    switch (mark) {
      case 'bett':
      case 'wanne':
        // Kissen und Decke.
        ctx.rect(-w * 0.38, -d * 0.3, w * 0.22, d * 0.6);
        ctx.rect(-w * 0.1, -d * 0.3, w * 0.48, d * 0.6);
        ctx.stroke();
        return;
      case 'esstisch':
        ctx.ellipse(0, 0, w * 0.3, d * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        return;
      case 'kiste':
        ctx.rect(-w * 0.3, -d * 0.3, w * 0.6, d * 0.6);
        ctx.moveTo(-w * 0.3, 0);
        ctx.lineTo(w * 0.3, 0);
        ctx.stroke();
        return;
      case 'werkbank':
        for (let i = -1; i <= 1; i++) {
          ctx.moveTo(-w * 0.35, (i * d) / 4);
          ctx.lineTo(w * 0.35, (i * d) / 4);
        }
        ctx.stroke();
        return;
      case 'buecher':
        for (let i = -2; i <= 2; i++) {
          ctx.moveTo((i * w) / 6, -d * 0.3);
          ctx.lineTo((i * w) / 6, d * 0.3);
        }
        ctx.stroke();
        return;
      case 'sessel':
        ctx.arc(0, d * 0.1, r, Math.PI, Math.PI * 2);
        ctx.stroke();
        return;
      case 'standuhr':
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -r * 0.8);
        ctx.stroke();
        return;
      case 'klavier':
        ctx.rect(-w * 0.35, -d * 0.15, w * 0.7, d * 0.3);
        ctx.stroke();
        return;
      case 'ofen':
      case 'ausgabe':
      case 'spuele':
        ctx.arc(-w * 0.18, 0, r * 0.6, 0, Math.PI * 2);
        ctx.moveTo(w * 0.18 + r * 0.6, 0);
        ctx.arc(w * 0.18, 0, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        return;
      case 'dusche':
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        return;
      case 'kamin':
        ctx.moveTo(-w * 0.3, d * 0.25);
        ctx.lineTo(0, -d * 0.3);
        ctx.lineTo(w * 0.3, d * 0.25);
        ctx.stroke();
        return;
      case 'schaukelpferd':
        ctx.arc(0, d * 0.2, r, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        return;
      default:
        return;
    }
  }

  /**
   * **Eine Tür, die man erkennt**: zwei Pfosten in der Wand, dazwischen das
   * Blatt. Zu heißt: ein Blatt quer über die Öffnung, hell für Stahl, holzig
   * für Holz. Offen heißt: das Blatt ist in die Pfosten zurückgefahren, nur
   * die Stummel schauen heraus. Gesperrt heißt: rot, mit einem Schloss darauf.
   */
  private drawDoor(ctx: CanvasRenderingContext2D, door: MapDoor): void {
    const scale = this.state.scale;
    const half = door.width / 2;
    const along = door.axis === 'x' ? { x: 1, z: 0 } : { x: 0, z: 1 };
    const a = { x: door.at.x - along.x * half, z: door.at.z - along.z * half };
    const b = { x: door.at.x + along.x * half, z: door.at.z + along.z * half };
    const pa = this.toScreen(a.x, a.z),
      pb = this.toScreen(b.x, b.z);
    const thick = Math.max(4, scale * 0.34);
    const post = Math.max(3, scale * 0.3);
    // Die Öffnung selbst: Boden statt Wand, damit die Lücke lesbar ist.
    ctx.lineCap = 'butt';
    ctx.strokeStyle = door.open && !door.locked ? INK.roomLit : INK.roomGrey;
    ctx.lineWidth = Math.max(3, scale * 0.3);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    // Das Blatt.
    const leaf = door.locked
      ? door.material === 'wood'
        ? INK.doorLockedWood
        : INK.doorLocked
      : door.material === 'wood'
        ? INK.doorWood
        : INK.doorSteel;
    ctx.strokeStyle = door.open && !door.locked ? INK.doorOpen : leaf;
    ctx.lineWidth = thick;
    ctx.beginPath();
    if (door.open && !door.locked) {
      // Zurückgefahren: nur die Stummel an den Pfosten.
      const stub = 0.18;
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pa.x + (pb.x - pa.x) * stub, pa.y + (pb.y - pa.y) * stub);
      ctx.moveTo(pb.x, pb.y);
      ctx.lineTo(pb.x - (pb.x - pa.x) * stub, pb.y - (pb.y - pa.y) * stub);
    } else {
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
    }
    ctx.stroke();
    if (!door.open || door.locked) {
      // Die Fuge in der Mitte: zwei Blätter, die sich treffen.
      ctx.strokeStyle = INK.frame;
      ctx.lineWidth = 1;
      const mx = (pa.x + pb.x) / 2,
        my = (pa.y + pb.y) / 2;
      const nx = -(pb.y - pa.y),
        ny = pb.x - pa.x;
      const n = Math.hypot(nx, ny) || 1;
      ctx.beginPath();
      ctx.moveTo(mx - (nx / n) * thick * 0.5, my - (ny / n) * thick * 0.5);
      ctx.lineTo(mx + (nx / n) * thick * 0.5, my + (ny / n) * thick * 0.5);
      ctx.stroke();
    }
    // Die Pfosten.
    ctx.fillStyle = INK.frame;
    for (const p of [pa, pb]) ctx.fillRect(p.x - post / 2, p.y - post / 2, post, post);
    // Der Balken über der Tür: wie lange die Sperre noch hält
    // (`rules/doorLocks.ts`). Keine Sperre hält ewig, und wer eine gesetzt
    // hat, will wissen, wie lange er sich noch darauf verlassen darf.
    if (door.locked && door.hold && door.hold.total > 0 && scale >= 8) {
      const left = Math.max(0, Math.min(1, door.hold.left / door.hold.total));
      const w = Math.max(12, door.width * scale * 0.9);
      const h = Math.max(3, scale * 0.12);
      const bx = (pa.x + pb.x) / 2 - w / 2;
      const by = (pa.y + pb.y) / 2 - Math.max(9, scale * 0.55);
      ctx.fillStyle = INK.frame;
      ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
      ctx.fillStyle = INK.doorLocked;
      ctx.fillRect(bx, by, w * left, h);
    }
    // Das Schloss.
    if (door.locked && scale >= 8) {
      const mx = (pa.x + pb.x) / 2,
        my = (pa.y + pb.y) / 2;
      const r = Math.max(3, scale * 0.2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(mx, my, r * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK.doorLocked;
      ctx.lineWidth = Math.max(1.2, r * 0.35);
      ctx.beginPath();
      ctx.arc(mx, my - r * 0.25, r * 0.5, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = INK.doorLocked;
      ctx.fillRect(mx - r * 0.65, my - r * 0.2, r * 1.3, r * 0.95);
    }
  }

  /** Die Schächte: eine Linie je Verbindung, und an jeder Klappe der Name dessen, was dahinter liegt. */
  private drawVents(ctx: CanvasRenderingContext2D): void {
    const s = this.snapshot;
    if (!s.ventLinks?.length) return;
    const flaps = new Map(s.items.filter((i) => i.kind === 'vent').map((i) => [i.id, i]));
    const names = new Map(s.rooms.map((room) => [room.id, room.name]));
    const scale = this.state.scale;
    ctx.strokeStyle = INK.ventLink;
    ctx.lineWidth = Math.max(1.5, scale * 0.08);
    ctx.setLineDash([Math.max(3, scale * 0.25), Math.max(3, scale * 0.25)]);
    ctx.beginPath();
    for (const link of s.ventLinks) {
      const a = flaps.get(link.a),
        b = flaps.get(link.b);
      if (!a || !b) continue;
      const pa = this.toScreen(a.at.x, a.at.z),
        pb = this.toScreen(b.at.x, b.at.z);
      // Ein leichter Bogen, damit sich zwei Schächte nicht wie eine Wand lesen.
      const mx = (pa.x + pb.x) / 2 - (pb.y - pa.y) * 0.12,
        my = (pa.y + pb.y) / 2 + (pb.x - pa.x) * 0.12;
      ctx.moveTo(pa.x, pa.y);
      ctx.quadraticCurveTo(mx, my, pb.x, pb.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (scale < 12) return;
    // Wohin es geht: je Klappe die Namen der Räume am anderen Ende.
    const targets = new Map<string, string[]>();
    for (const link of s.ventLinks) {
      const a = flaps.get(link.a),
        b = flaps.get(link.b);
      if (!a || !b) continue;
      targets.set(a.id, [...(targets.get(a.id) ?? []), names.get(b.roomId) ?? b.roomId]);
      targets.set(b.id, [...(targets.get(b.id) ?? []), names.get(a.roomId) ?? a.roomId]);
    }
    ctx.font = `${Math.max(9, Math.min(12, scale * 0.55))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const [id, list] of targets) {
      const flap = flaps.get(id)!;
      const p = this.toScreen(flap.at.x, flap.at.z);
      const text = `→ ${list.join(' · ')}`;
      const width = ctx.measureText(text).width + 8;
      ctx.fillStyle = 'rgba(10, 14, 24, 0.75)';
      this.roundRect(ctx, p.x - width / 2, p.y + scale * 0.45, width, 14, 4);
      ctx.fill();
      ctx.fillStyle = INK.ventOpen;
      ctx.fillText(text, p.x, p.y + scale * 0.45 + 1);
    }
  }

  private drawItem(ctx: CanvasRenderingContext2D, item: MapSnapshot['items'][number]): void {
    const scale = this.state.scale;
    const p = this.toScreen(item.at.x, item.at.z);
    const r = Math.max(4, scale * 0.3);
    ctx.lineWidth = Math.max(1.5, scale * 0.07);
    if (item.kind === 'cargo') {
      // Ein Paket mit Band; genommen bleibt der leere Umriss.
      ctx.fillStyle = item.state === 'taken' ? INK.cargoTaken : INK.cargo;
      this.roundRect(ctx, p.x - r, p.y - r * 0.8, r * 2, r * 1.6, r * 0.2);
      ctx.fill();
      ctx.strokeStyle = INK.frame;
      ctx.stroke();
      if (item.state !== 'taken') {
        ctx.strokeStyle = item.state === 'open' ? INK.frame : 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r * 0.8);
        ctx.lineTo(p.x, p.y + r * 0.8);
        ctx.stroke();
        if (item.state === 'open') {
          ctx.fillStyle = INK.frame;
          ctx.fillRect(p.x - r * 0.9, p.y - r * 0.2, r * 1.8, r * 0.4);
        }
      }
    } else if (item.kind === 'console') {
      // Ein Bildschirm: rot, solange er kaputt ist.
      ctx.fillStyle = item.state === 'solved' ? INK.console : INK.consoleBroken;
      this.roundRect(ctx, p.x - r, p.y - r * 0.7, r * 2, r * 1.4, r * 0.25);
      ctx.fill();
      ctx.strokeStyle = INK.frame;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(p.x - r * 0.7, p.y - r * 0.4, r * 1.4, r * 0.6);
      if (item.state !== 'solved') {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(8, r * 1.1)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', p.x, p.y - r * 0.1);
      }
    } else if (item.kind === 'locker') {
      ctx.strokeStyle = item.state === 'destroyed' ? INK.consoleBroken : INK.locker;
      ctx.fillStyle =
        item.state === 'open'
          ? INK.locker
          : item.state === 'destroyed'
            ? 'rgba(255, 90, 95, 0.25)'
            : 'rgba(143, 160, 255, 0.18)';
      this.roundRect(ctx, p.x - r * 0.7, p.y - r, r * 1.4, r * 2, r * 0.15);
      ctx.fill();
      ctx.stroke();
      if (item.state === 'destroyed') {
        ctx.beginPath();
        ctx.moveTo(p.x - r * 0.6, p.y - r * 0.8);
        ctx.lineTo(p.x + r * 0.6, p.y + r * 0.8);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r * 0.8);
        ctx.lineTo(p.x, p.y + r * 0.8);
        ctx.stroke();
      }
    } else if (item.kind === 'van') {
      ctx.strokeStyle = INK.van;
      ctx.setLineDash([4, 3]);
      this.roundRect(ctx, p.x - r * 1.6, p.y - r * 0.9, r * 3.2, r * 1.8, r * 0.3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK.van;
      ctx.font = `600 ${Math.max(8, r * 0.9)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.state === 'ready' ? 'ZIEL' : 'START', p.x, p.y);
    } else if (item.kind === 'vent') {
      // Ein Gitter: Rahmen und drei Lamellen (Paket Lüftungssystem).
      ctx.fillStyle = INK.frame;
      this.roundRect(ctx, p.x - r * 1.05, p.y - r * 0.65, r * 2.1, r * 1.3, r * 0.15);
      ctx.fill();
      ctx.strokeStyle = item.state === 'open' ? INK.ventOpen : INK.vent;
      ctx.lineWidth = Math.max(1.5, scale * 0.07);
      ctx.strokeRect(p.x - r, p.y - r * 0.6, r * 2, r * 1.2);
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(p.x - r * 0.7, p.y + i * r * 0.35);
        ctx.lineTo(p.x + r * 0.7, p.y + i * r * 0.35);
      }
      ctx.stroke();
    } else if (item.kind === 'fuse') {
      ctx.fillStyle = item.state === 'open' ? INK.light : INK.lightOff;
      this.roundRect(ctx, p.x - r * 0.7, p.y - r * 0.9, r * 1.4, r * 1.8, r * 0.15);
      ctx.fill();
      ctx.strokeStyle = INK.frame;
      ctx.stroke();
    } else {
      ctx.fillStyle = INK.label;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * **Eine Figur wie aus einem Brettspiel**: Rumpf, Visier, Rucksack, zwei
   * Beine, zwei Hände. Sie schaut nach links oder rechts, je nachdem, wohin
   * sie zuletzt gegangen ist, und beim Gehen schwingen Beine und Hände. Das
   * Monster ist ein dunkler Klumpen mit Augen — kein Kreis mehr.
   */
  private drawEntity(ctx: CanvasRenderingContext2D, entity: MapEntity): void {
    const scale = this.state.scale;
    const p = this.toScreen(entity.at.x, entity.at.z);
    const r = Math.max(5, scale * 0.36);
    const t = this.now() / 1000;
    const walk = entity.moving ? Math.sin(t * (entity.sprinting ? 16 : 11)) : 0;
    // Blick nach links oder rechts: aus dem Ostanteil des Blicks, sonst wie zuletzt.
    const east = -Math.sin(entity.yaw + this.state.rotation);
    let side = this.facing.get(entity.id) ?? 1;
    if (Math.abs(east) > 0.2) side = east > 0 ? 1 : -1;
    this.facing.set(entity.id, side);
    ctx.save();
    ctx.translate(p.x, p.y);
    if (entity.concealed) ctx.globalAlpha = 0.45;
    if (entity.kind === 'monster') {
      const bob = entity.moving ? Math.abs(walk) * r * 0.15 : 0;
      // Schatten, Klumpen, Zacken, Augen.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.95, r * 1.1, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK.monsterDark;
      ctx.beginPath();
      ctx.moveTo(-r * 1.1, r * 0.8 - bob);
      ctx.lineTo(-r * 1.0, -r * 0.6 - bob);
      ctx.lineTo(-r * 0.55, -r * 1.05 - bob);
      ctx.lineTo(-r * 0.2, -r * 0.7 - bob);
      ctx.lineTo(r * 0.15, -r * 1.25 - bob);
      ctx.lineTo(r * 0.5, -r * 0.75 - bob);
      ctx.lineTo(r * 1.05, -r * 0.95 - bob);
      ctx.lineTo(r * 1.1, r * 0.8 - bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK.monster;
      ctx.lineWidth = Math.max(1.5, r * 0.18);
      ctx.stroke();
      // Augen auf der Seite, in die es schaut.
      ctx.fillStyle = '#fff6f6';
      for (const dx of [0.15, 0.55]) {
        ctx.beginPath();
        ctx.arc(dx * side * r, -r * 0.25 - bob, r * 0.17, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = INK.monster;
      for (const dx of [0.2, 0.6]) {
        ctx.beginPath();
        ctx.arc(dx * side * r, -r * 0.25 - bob, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      // Klauen, die beim Gehen greifen.
      ctx.strokeStyle = INK.monster;
      ctx.lineWidth = Math.max(1.2, r * 0.14);
      for (const s of [-1, 1]) {
        const swing = walk * r * 0.25 * s;
        ctx.beginPath();
        ctx.moveTo(s * r * 0.9, r * 0.1);
        ctx.lineTo(s * r * 1.35, r * 0.45 + swing);
        ctx.stroke();
      }
    } else {
      const color = ENTITY_COLOR[entity.kind];
      const bob = entity.moving ? Math.abs(walk) * r * 0.12 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, r * 1.05, r * 0.95, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Beine.
      ctx.fillStyle = color;
      ctx.strokeStyle = INK.frame;
      ctx.lineWidth = Math.max(1, r * 0.12);
      for (const s of [-1, 1]) {
        const step = walk * r * 0.3 * s;
        this.roundRect(
          ctx,
          s * r * 0.38 - r * 0.22 + step * 0.4,
          r * 0.45,
          r * 0.44,
          r * 0.6,
          r * 0.12,
        );
        ctx.fill();
        ctx.stroke();
      }
      // Rucksack hinten.
      this.roundRect(ctx, -side * r * 1.05 - r * 0.25, -r * 0.35 - bob, r * 0.5, r * 0.9, r * 0.15);
      ctx.fill();
      ctx.stroke();
      // Hände, die mitschwingen.
      for (const s of [-1, 1]) {
        const swing = walk * r * 0.28 * s;
        ctx.beginPath();
        ctx.arc(s * r * 0.95, r * 0.15 + swing, r * 0.26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Rumpf.
      this.roundRect(ctx, -r * 0.8, -r * 1.05 - bob, r * 1.6, r * 1.75, r * 0.7);
      ctx.fill();
      ctx.stroke();
      // Visier vorn.
      ctx.fillStyle = INK.visor;
      ctx.beginPath();
      ctx.ellipse(side * r * 0.32, -r * 0.5 - bob, r * 0.48, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.ellipse(side * r * 0.42, -r * 0.6 - bob, r * 0.18, r * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      // Was in der Hand ist: die Lampe leuchtet vorn.
      if (entity.held === 'flashlight') {
        ctx.fillStyle = INK.light;
        ctx.beginPath();
        ctx.arc(side * r * 1.15, r * 0.15, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Die Ziele: Ring am Ort, wenn er im Bild ist; sonst ein Dreieck am Rand, das dorthin zeigt. */
  /**
   * **Was in Reichweite ist**, als pulsierender Ring mit Beschriftung — über
   * allem, damit man es auch im Dunkeln sieht. Es gibt immer höchstens eines.
   */
  private drawHighlight(ctx: CanvasRenderingContext2D): void {
    const mark = this.options.highlight!();
    if (!mark) return;
    const p = this.toScreen(mark.at.x, mark.at.z);
    const pulse = 1 + 0.12 * Math.sin((this.now() / 1000) * 5);
    const r = Math.max(9, this.state.scale * 0.6) * pulse;
    ctx.save();
    ctx.strokeStyle = INK.reach;
    ctx.fillStyle = INK.reachGlow;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (mark.label) {
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK.frame;
      ctx.strokeText(mark.label, p.x, p.y - r - 4);
      ctx.fillStyle = INK.reach;
      ctx.fillText(mark.label, p.x, p.y - r - 4);
    }
    ctx.restore();
  }

  private drawGoals(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const goals = this.options.objectives!();
    const edge = this.options.edge ?? {};
    const inset = {
      top: edge.top ?? 18,
      right: edge.right ?? 18,
      bottom: edge.bottom ?? 18,
      left: edge.left ?? 18,
    };
    const t = this.now() / 1000;
    const scale = this.state.scale;
    for (const goal of goals) {
      const p = this.toScreen(goal.at.x, goal.at.z);
      const inside =
        p.x >= inset.left && p.x <= w - inset.right && p.y >= inset.top && p.y <= h - inset.bottom;
      ctx.strokeStyle = goal.next ? INK.goal : INK.goalDim;
      ctx.fillStyle = goal.next ? INK.goal : INK.goalDim;
      if (inside) {
        const pulse = goal.next ? 1 + 0.15 * Math.sin(t * 4) : 1;
        const r = Math.max(7, scale * 0.55) * pulse;
        ctx.lineWidth = goal.next ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        if (goal.next) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - r * 1.9);
          ctx.lineTo(p.x - r * 0.45, p.y - r * 1.25);
          ctx.lineTo(p.x + r * 0.45, p.y - r * 1.25);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // Vom Bildmittelpunkt aus in Richtung Ziel bis an den Rand.
        const cx = (inset.left + w - inset.right) / 2,
          cy = (inset.top + h - inset.bottom) / 2;
        const dx = p.x - cx,
          dy = p.y - cy;
        const hw = (w - inset.left - inset.right) / 2,
          hh = (h - inset.top - inset.bottom) / 2;
        const k = Math.min(hw / Math.max(1e-6, Math.abs(dx)), hh / Math.max(1e-6, Math.abs(dy)));
        const ex = cx + dx * k,
          ey = cy + dy * k;
        const angle = Math.atan2(dy, dx);
        const size = goal.next ? 13 : 9;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size * 0.7, -size * 0.7);
        ctx.lineTo(-size * 0.35, 0);
        ctx.lineTo(-size * 0.7, size * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = INK.frame;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        if (goal.next) {
          ctx.font = '600 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const metres = Math.round(
            Math.hypot(goal.at.x - this.state.centreX, goal.at.z - this.state.centreZ),
          );
          const lx = ex - Math.cos(angle) * 22,
            ly = ey - Math.sin(angle) * 22;
          ctx.fillStyle = INK.labelShadow;
          ctx.fillText(`${metres} m`, lx + 1, ly + 1);
          ctx.fillStyle = INK.goal;
          ctx.fillText(`${metres} m`, lx, ly);
        }
      }
      this.stats.goals++;
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /** Die Marker, wie sie gezeichnet werden: live, gedrosselt oder gar nicht. */
  private markerEntities(): MapSnapshot['entities'] {
    if (this.markers === 'live') return this.snapshot.entities;
    if (this.markers === 'none') return [];
    const period = 1000 / Math.max(0.1, this.markers.hz);
    const now = this.now();
    if (now - this.markerTime >= period) {
      this.markerTime = now;
      this.markerSnapshot = this.snapshot.entities.map((e) => ({ ...e, at: { ...e.at } }));
    }
    return this.markerSnapshot;
  }

  private path(ctx: CanvasRenderingContext2D, polygon: readonly MapPoint[]): void {
    ctx.beginPath();
    polygon.forEach((point, i) => {
      const p = this.toScreen(point.x, point.z);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
  }

  /** Von Bildpunkten (relativ zum Canvas) in Meter. */
  toWorld(px: number, py: number): { x: number; z: number } {
    const { w, h } = this.size();
    const cos = Math.cos(this.state.rotation),
      sin = Math.sin(this.state.rotation);
    const dx = (px - w / 2) / this.state.scale;
    const dy = (py - h / 2) / this.state.scale;
    return {
      x: this.state.centreX + dx * cos - dy * sin,
      z: this.state.centreZ + dx * sin + dy * cos,
    };
  }

  /** Und zurück: Meter in Bildpunkte relativ zum Canvas. */
  toScreen(x: number, z: number): { x: number; y: number } {
    const { w, h } = this.size();
    const cos = Math.cos(this.state.rotation),
      sin = Math.sin(this.state.rotation);
    const dx = x - this.state.centreX,
      dz = z - this.state.centreZ;
    return {
      x: w / 2 + (dx * cos + dz * sin) * this.state.scale,
      y: h / 2 + (-dx * sin + dz * cos) * this.state.scale,
    };
  }

  // --- Gesten ------------------------------------------------------------------

  private listen(): void {
    const node = this.canvas;
    node.style.touchAction = 'none';
    node.addEventListener('pointerdown', (event) => this.down(event));
    node.addEventListener('pointermove', (event) => this.move(event));
    node.addEventListener('pointerup', (event) => this.up(event));
    node.addEventListener('pointercancel', (event) => this.cancel(event));
    node.addEventListener(
      'wheel',
      (event) => {
        if (!this.gestures) return;
        event.preventDefault();
        const local = this.local(event);
        this.zoomAt(Math.exp(-event.deltaY * WHEEL_RATE), local.x, local.y);
      },
      { passive: false },
    );
  }

  private get gestures(): boolean {
    return this.options.gestures ?? true;
  }

  private local(event: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private down(event: PointerEvent): void {
    const at = this.local(event);
    this.pointers.set(event.pointerId, { ...at, startX: at.x, startY: at.y });
    if (this.pointers.size === 1) this.dragged = false;
    if (this.pointers.size === 2) this.pinchSpan = this.span();
    try {
      this.canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Ein Zeiger, den es nicht mehr gibt — passiert bei synthetischen Tests.
    }
  }

  private move(event: PointerEvent): void {
    const known = this.pointers.get(event.pointerId);
    if (!known) return;
    const at = this.local(event);
    const dx = at.x - known.x,
      dy = at.y - known.y;
    known.x = at.x;
    known.y = at.y;
    if (Math.hypot(at.x - known.startX, at.y - known.startY) > TAP_SLOP) this.dragged = true;
    if (!this.gestures) return;
    if (this.pointers.size === 1 && this.dragged) {
      this.panBy(dx, dy);
    } else if (this.pointers.size >= 2) {
      const span = this.span();
      if (this.pinchSpan > 0 && span > 0) {
        const mid = this.middle();
        this.zoomAt(span / this.pinchSpan, mid.x, mid.y);
      }
      this.pinchSpan = span;
      // Beide Finger zusammen verschieben die Karte ebenfalls.
      this.panBy(dx / this.pointers.size, dy / this.pointers.size);
    }
  }

  private up(event: PointerEvent): void {
    const known = this.pointers.get(event.pointerId);
    this.pointers.delete(event.pointerId);
    if (!known) return;
    if (this.pointers.size === 0 && !this.dragged) this.tap(known.x, known.y);
    if (this.pointers.size < 2) this.pinchSpan = 0;
  }

  private cancel(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchSpan = 0;
  }

  private span(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private middle(): { x: number; y: number } {
    const all = [...this.pointers.values()];
    return {
      x: all.reduce((sum, p) => sum + p.x, 0) / all.length,
      y: all.reduce((sum, p) => sum + p.y, 0) / all.length,
    };
  }

  /** Um Bildpunkte verschieben — die Karte folgt dem Finger. */
  panBy(dx: number, dy: number): void {
    const cos = Math.cos(this.state.rotation),
      sin = Math.sin(this.state.rotation);
    const mx = -dx / this.state.scale,
      my = -dy / this.state.scale;
    this.following = null;
    this.wantFit = false;
    this.state.centreX += mx * cos - my * sin;
    this.state.centreZ += mx * sin + my * cos;
    this.options.onViewChange?.(this.getView());
  }

  /** Um einen Faktor zoomen, so dass der Punkt unter dem Finger liegen bleibt. */
  zoomAt(factor: number, px: number, py: number): void {
    const before = this.toWorld(px, py);
    this.state.scale = this.clampScale(this.state.scale * factor);
    const after = this.toWorld(px, py);
    this.state.centreX += before.x - after.x;
    this.state.centreZ += before.z - after.z;
    this.wantFit = false;
    this.options.onViewChange?.(this.getView());
  }

  /** Ein Tipp: was liegt darunter? Wesen vor Items vor Türen vor Lichtern vor Räumen. */
  tap(px: number, py: number): void {
    const s = this.snapshot;
    const near = (at: MapPoint): boolean => {
      const p = this.toScreen(at.x, at.z);
      return Math.hypot(p.x - px, p.y - py) <= HIT;
    };
    if (this.layers.entities && this.markers !== 'none' && this.options.onEntityClick) {
      const visible = new Set(this.field.visibleEntities);
      for (const entity of this.markerEntities()) {
        if (this.layers.visibility && !visible.has(entity.id)) continue;
        if (near(entity.at)) {
          this.options.onEntityClick(entity.id);
          return;
        }
      }
    }
    if (this.layers.items && this.options.onItemClick)
      for (const item of s.items)
        if (near(item.at)) {
          this.options.onItemClick(item.id);
          return;
        }
    if (this.layers.doors && this.options.onDoorClick)
      for (const door of s.doors)
        if (near(door.at)) {
          this.options.onDoorClick(door.id);
          return;
        }
    if (this.layers.lights && this.options.onLightClick)
      for (const light of s.lights)
        if (light.kind !== 'torch' && light.kind !== 'drone' && near(light.at)) {
          this.options.onLightClick(light.id);
          return;
        }
    const at = this.toWorld(px, py);
    if (this.layers.rooms && this.options.onRoomClick)
      for (const room of s.rooms)
        if (pointInPolygon(at, room.polygon)) {
          this.options.onRoomClick(room.id, at);
          return;
        }
    this.options.onGroundClick?.(at);
  }

  dispose(): void {
    this.pointers.clear();
    this.element.remove();
  }

  /** Nur für Tests und Ansichten, die wissen wollen, was gerade drin ist. */
  get current(): {
    snapshot: MapSnapshot;
    field: VisibilityField;
    layers: MapLayers;
    markers: MarkerPolicy;
    following: string | null;
    gestures: boolean;
  } {
    return {
      snapshot: this.snapshot,
      field: this.field,
      layers: { ...this.layers },
      markers: this.markers,
      following: this.following,
      gestures: this.gestures,
    };
  }
}
