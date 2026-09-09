import { emptySnapshot, pointInPolygon, type MapPoint, type MapSnapshot } from './mapSnapshot';
import { emptyField, type VisibilityField, type VisibilityMode } from './visibility';

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
};

/** Die Schalttafel: Räume, Türen, Lichter — niemand, der sich bewegt. */
export const PANEL_LAYERS: Readonly<MapLayers> = {
  ...ALL_LAYERS,
  items: false,
  entities: false,
  visibility: false,
  routes: false,
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
  /** Wegstrecken, je Bild abgefragt (Layer `routes`). */
  routes?: () => readonly MapRoute[];
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

const INK = {
  ground: '#070a10',
  roomDark: '#0c1018',
  roomGrey: '#262b36',
  roomLit: '#3a4356',
  wall: '#8ea0c0',
  window: '#5fd6e0',
  glass: '#3f8f98',
  label: 'rgba(200, 214, 240, 0.75)',
  light: '#ffd27a',
  lightOff: '#3a3a44',
  torch: 'rgba(255, 226, 160, 0.28)',
  lamp: 'rgba(255, 236, 200, 0.22)',
  self: 'rgba(160, 200, 255, 0.16)',
  doorOpen: '#8fb7ff',
  doorShut: '#7f8ba1',
  doorLocked: '#ff5a5f',
  player: '#7ff0ff',
  bot: '#7ff0ff',
  monster: '#ff4d55',
  drone: '#ffd85a',
  peer: '#b8c7ff',
  cone: 'rgba(127, 240, 255, 0.35)',
  monsterCone: 'rgba(255, 77, 85, 0.35)',
  noise: 'rgba(255, 170, 60, 0.35)',
  cargo: '#f0b64a',
  console: '#8ff0b0',
  locker: '#8fa0ff',
  van: '#7ff0ff',
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
  /** Was das letzte Bild gezeichnet hat — für Tests. */
  stats = { entities: 0, items: 0, lit: 0, rooms: 0 };

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
    this.stats = { entities: 0, items: 0, lit: 0, rooms: 0 };

    const s = this.snapshot;
    const f = this.field;
    const omniscient = f.mode === 'omniscient' || !this.layers.visibility;
    const litRooms = new Set(f.litRooms);

    // --- Räume --------------------------------------------------------------
    if (this.layers.rooms) {
      for (const room of s.rooms) {
        this.path(ctx, room.polygon);
        ctx.fillStyle = omniscient
          ? litRooms.has(room.id)
            ? INK.roomLit
            : INK.roomGrey
          : INK.roomDark;
        ctx.fill();
        this.stats.rooms++;
      }
    }

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

    // --- Wände ----------------------------------------------------------------
    if (this.layers.rooms) {
      ctx.lineCap = 'round';
      for (const wall of s.walls) {
        const a = this.toScreen(wall.a.x, wall.a.z),
          b = this.toScreen(wall.b.x, wall.b.z);
        ctx.strokeStyle =
          wall.kind === 'wall' ? INK.wall : wall.kind === 'window' ? INK.window : INK.glass;
        ctx.lineWidth = wall.kind === 'wall' ? Math.max(1.5, this.state.scale * 0.2) : 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // --- Türen ----------------------------------------------------------------
    if (this.layers.doors) {
      for (const door of s.doors) {
        const half = door.width / 2;
        const a =
          door.axis === 'x'
            ? { x: door.at.x - half, z: door.at.z }
            : { x: door.at.x, z: door.at.z - half };
        const b =
          door.axis === 'x'
            ? { x: door.at.x + half, z: door.at.z }
            : { x: door.at.x, z: door.at.z + half };
        const pa = this.toScreen(a.x, a.z),
          pb = this.toScreen(b.x, b.z);
        ctx.strokeStyle = door.locked ? INK.doorLocked : door.open ? INK.doorOpen : INK.doorShut;
        ctx.lineWidth = door.open && !door.locked ? 1.5 : Math.max(2, this.state.scale * 0.16);
        if (door.open && !door.locked) ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // --- Lichter ---------------------------------------------------------------
    if (this.layers.lights) {
      for (const light of s.lights) {
        if (light.kind === 'torch' || light.kind === 'drone') continue;
        const p = this.toScreen(light.at.x, light.at.z);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(3, this.state.scale * 0.22), 0, Math.PI * 2);
        ctx.fillStyle = light.on ? INK.light : INK.lightOff;
        ctx.fill();
        if (light.on && omniscient) {
          ctx.strokeStyle = 'rgba(255, 210, 122, 0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // --- Beschriftung --------------------------------------------------------
    if (this.layers.labels && this.state.scale >= 5) {
      ctx.fillStyle = INK.label;
      ctx.font = `${Math.max(10, Math.min(14, this.state.scale * 0.9))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const room of s.rooms) {
        if (room.circulation && this.state.scale < 9) continue;
        const p = this.toScreen(room.centre.x, room.centre.z);
        ctx.fillText(room.name, p.x, p.y);
      }
    }

    // --- Wege ------------------------------------------------------------------
    if (this.layers.routes && this.options.routes) {
      for (const route of this.options.routes()) {
        if (route.points.length < 2) continue;
        ctx.strokeStyle = route.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
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
        const p = this.toScreen(item.at.x, item.at.z);
        const r = Math.max(4, this.state.scale * 0.3);
        ctx.lineWidth = 1.5;
        if (item.kind === 'cargo') {
          ctx.fillStyle = item.state === 'taken' ? INK.lightOff : INK.cargo;
          ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
          if (item.state === 'open') {
            ctx.strokeStyle = INK.ground;
            ctx.strokeRect(p.x - r * 0.5, p.y - r * 0.5, r, r);
          }
        } else if (item.kind === 'console') {
          ctx.fillStyle = item.state === 'solved' ? INK.console : INK.doorLocked;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - r);
          ctx.lineTo(p.x + r, p.y);
          ctx.lineTo(p.x, p.y + r);
          ctx.lineTo(p.x - r, p.y);
          ctx.closePath();
          ctx.fill();
        } else if (item.kind === 'locker') {
          ctx.strokeStyle = INK.locker;
          ctx.strokeRect(p.x - r * 0.7, p.y - r, r * 1.4, r * 2);
          if (item.state === 'open') {
            ctx.fillStyle = INK.locker;
            ctx.fillRect(p.x - r * 0.7, p.y - r, r * 1.4, r * 2);
          }
        } else if (item.kind === 'van') {
          ctx.strokeStyle = INK.van;
          ctx.strokeRect(p.x - r * 1.4, p.y - r * 0.8, r * 2.8, r * 1.6);
        } else {
          ctx.fillStyle = INK.label;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        this.stats.items++;
      }
    }

    // --- Sichtkegel und Geräusch -----------------------------------------------
    if (this.layers.visibility) {
      for (const cone of f.cones) {
        if (cone.polygon.length < 3) continue;
        this.path(ctx, cone.polygon);
        ctx.strokeStyle = cone.entityId === 'monster' ? INK.monsterCone : INK.cone;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      for (const noise of f.noise) {
        const p = this.toScreen(noise.at.x, noise.at.z);
        ctx.beginPath();
        ctx.arc(p.x, p.y, noise.radius * this.state.scale, 0, Math.PI * 2);
        ctx.strokeStyle = noise.cause === 'monster' ? INK.monsterCone : INK.noise;
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
        const p = this.toScreen(entity.at.x, entity.at.z);
        const r = Math.max(5, this.state.scale * 0.35);
        const color =
          entity.kind === 'monster'
            ? INK.monster
            : entity.kind === 'drone'
              ? INK.drone
              : entity.kind === 'peer'
                ? INK.peer
                : INK.player;
        ctx.fillStyle = color;
        if (entity.concealed) ctx.globalAlpha = 0.45;
        if (entity.kind === 'monster') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Ein Dreieck, das dorthin zeigt, wohin man schaut.
          const a = this.screenAngle(entity.yaw);
          ctx.beginPath();
          ctx.moveTo(p.x + Math.cos(a) * r * 1.4, p.y + Math.sin(a) * r * 1.4);
          ctx.lineTo(p.x + Math.cos(a + 2.5) * r, p.y + Math.sin(a + 2.5) * r);
          ctx.lineTo(p.x + Math.cos(a - 2.5) * r, p.y + Math.sin(a - 2.5) * r);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        this.stats.entities++;
      }
    }
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

  /** Ein Blickwinkel als Bildwinkel: yaw 0 ist Norden, also oben. */
  private screenAngle(yaw: number): number {
    return -Math.PI / 2 - yaw - this.state.rotation;
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
