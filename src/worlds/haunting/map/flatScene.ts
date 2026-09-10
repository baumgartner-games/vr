import {
  ART,
  SPRITE_H,
  SPRITE_W,
  crewColor,
  drawCrewmate,
  drawDrone,
  drawLamp,
  drawMonster,
  drawName,
  drawProp,
  facingOf,
  linearGradient,
  monsterHeight,
  propFootprint,
  radialGradient,
  walkPhase,
} from './flatArt';
import { WALL_T } from './geometry';
import {
  emptySnapshot,
  pointInPolygon,
  type MapDoor,
  type MapEntity,
  type MapPoint,
  type MapRoom,
  type MapSegment,
  type MapSnapshot,
} from './mapSnapshot';
import {
  emptyField,
  type LitRegion,
  type VisibilityField,
  type VisibilityMode,
} from './visibility';

/**
 * **Die 2D-Welt als gezeichnete Szene** — nicht die Karte, sondern das Bild,
 * das man spielt: Böden aus Metallplatten, Wände mit Höhe, Crewmates,
 * Requisiten, und Schwärze überall dort, wohin man nicht sieht.
 *
 * Dieselbe Andockform wie `MapView` (Snapshot hinein, Sichtfeld hinein,
 * `draw` im Takt der Ansicht, Gesten und Tipps zurück), damit `FlatMode` sie
 * an derselben Stelle einhängt. Was sie **nicht** ist: eine Karte für die
 * Einsatzzentrale. Telefone, Späherschirm und Monster-Rolle behalten die
 * `MapView`; nur die Spielansicht der 2D-Welt bekommt dieses Bild.
 *
 * **Pseudo-3D wie in der Vorlage.** Norden ist oben, alles Aufrechte wächst
 * auf dem Bild nach oben: Eine Wand hat eine Oberkante um `WALL_H` nach Norden
 * verschoben und darunter ihre Vorderseite, die nach Süden zeigt. Was weiter
 * südlich steht, wird später gezeichnet und verdeckt, was dahinter steht —
 * Figuren, Requisiten und Wandvorderseiten werden dafür **gemeinsam** nach
 * ihrer z-Koordinate sortiert (`layer`). Nordwände (die in z-Richtung
 * laufenden Wände haben keine Vorderseite) kommen vor allem anderen.
 *
 * **Dunkelheit** ist eine schwarze Decke auf einem zweiten Canvas, aus der die
 * Sichtflächen des `VisibilityField` mit `destination-out` und weichem Rand
 * ausgeschnitten werden — die Decke wird dann über die fertige Szene gelegt.
 * Das zweite Canvas wird einmal angelegt und je Bild wiederverwendet.
 */

/** Wie hoch Wände auf dem Bild sind, in Metern der Station. */
export const WALL_H = 0.6;
/** Das Plattenraster der Böden, in Metern. */
export const PLATE = 1.25;
/** Wie breit der weiche Rand der Sichtflächen ist, in Metern. */
const SOFT_EDGE = 1;
/** Wie dick eine Wand gezeichnet wird: die halbe Dicke je Raum, also beide Seiten zusammen. */
const BAND = WALL_T * 2;

/** Bildpunkte je Meter, mit denen die Szene anfängt — eine Figur ist dann rund 100 Punkte hoch. */
export const DEFAULT_SCALE = 84;
/** Und auf schmalen Telefonen etwas weniger, damit ein Raum ins Bild passt. */
export const PHONE_SCALE = 64;
/** Unterhalb dieser Breite in Punkten gilt ein Bildschirm als schmales Telefon. */
export const PHONE_WIDTH = 480;

/** Wo die Szene hinschaut: Mitte in Metern, Zoom in Bildpunkten je Meter. Nie gedreht. */
export interface FlatSceneView {
  centreX: number;
  centreZ: number;
  scale: number;
}

export interface FlatSceneOptions {
  minScale?: number;
  maxScale?: number;
  mode?: VisibilityMode;
  view?: Partial<FlatSceneView>;
  /** Ob Pan und Pinch-Zoom des Nutzers angenommen werden. */
  gestures?: boolean;
  onRoomClick?: (roomId: string, at: MapPoint) => void;
  onEntityClick?: (entityId: string) => void;
  onItemClick?: (itemId: string) => void;
  onGroundClick?: (at: MapPoint) => void;
  /** Der Nutzer hat gezogen oder gezoomt; `follow` ist damit aus. */
  onViewChange?: (view: FlatSceneView) => void;
  /**
   * Zum Schluss: was die Ansicht selbst noch über die Szene malt — Ziele
   * am Bildrand, Wege, die Peilung (`flatMode.ts`). In CSS-Punkten, mit
   * `toScreen`; die Szene selbst weiß davon nichts.
   */
  overlay?: (ctx: CanvasRenderingContext2D, scene: FlatScene) => void;
}

/** Wie weit ein Finger wandern darf und trotzdem ein Tipp bleibt, in Punkten. */
const TAP_SLOP = 8;
/** Wie stark das Mausrad zoomt, je Punkt Raddrehung. */
const WHEEL_RATE = 0.0016;

const INK = {
  space: '#000000',
  spaceLit: '#05070c',
  floor: '#3a434e',
  floorSeam: '#262d36',
  floorHighlight: 'rgba(255, 255, 255, 0.035)',
  corridor: '#4a545f',
  corridorGroove: '#57626e',
  wallTop: '#2b323c',
  wallRidge: '#5a6572',
  faceTop: '#4c5764',
  faceBottom: '#20262e',
  faceRidge: '#7a8794',
  faceSeam: '#161b21',
  pane: '#86c3d6',
  paneDark: '#4a8299',
  doorLeaf: '#66727f',
  doorLeafLocked: '#5d4a4c',
  lampGreen: '#6cf58a',
  lampRed: '#ff5a5f',
  threshold: '#5b6774',
  roomName: 'rgba(235, 110, 110, 0.55)',
  roomLine: 'rgba(235, 90, 90, 0.5)',
  dim: 'rgba(0, 0, 0, 0.45)',
};

/** Etwas, das in der Reihenfolge seiner z-Koordinate gezeichnet wird. */
interface Layered {
  z: number;
  /** Bei gleichem z: Wände (0) vor Requisiten (1) vor Figuren (2). */
  order: number;
  draw: () => void;
}

/** Ein Wandstück, entdoppelt und mit Wissen darüber, ob seine Enden an einer Tür stehen. */
interface WallPiece {
  axis: 'x' | 'z';
  /** Die feste Koordinate: z bei Wänden entlang x, x bei Wänden entlang z. */
  at: number;
  from: number;
  to: number;
  kind: MapSegment['kind'];
  doorStart: boolean;
  doorEnd: boolean;
}

export class FlatScene {
  readonly element: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  /** Die schwarze Decke — einmal angelegt, je Bild neu ausgeschnitten. */
  private readonly dark: HTMLCanvasElement;
  private snapshot: MapSnapshot = emptySnapshot();
  private field: VisibilityField;
  private state: FlatSceneView = { centreX: 0, centreZ: 0, scale: DEFAULT_SCALE };
  private following: string | null = null;
  /** Die letzte Blickseite je Wesen, damit Nord-/Südläufer nicht flackern. */
  private readonly facings = new Map<string, 1 | -1>();
  private readonly pointers = new Map<
    number,
    { x: number; y: number; startX: number; startY: number }
  >();
  private pinchSpan = 0;
  private dragged = false;
  private readonly minScale: number;
  private readonly maxScale: number;
  /** Was das letzte Bild gezeichnet hat — für Tests. */
  stats = { rooms: 0, walls: 0, items: 0, entities: 0, names: 0, cuts: 0, dimmed: 0 };

  constructor(private readonly options: FlatSceneOptions = {}) {
    this.field = emptyField(options.mode ?? 'realistic');
    this.minScale = options.minScale ?? 28;
    this.maxScale = options.maxScale ?? 140;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'flatscene__canvas';
    this.dark = document.createElement('canvas');
    this.element = document.createElement('div');
    this.element.className = 'flatscene';
    this.element.append(this.canvas);
    if (options.view) this.state = { ...this.state, ...options.view };
    this.listen();
  }

  setSnapshot(snapshot: MapSnapshot): void {
    this.snapshot = snapshot;
  }

  /** Das Sichtbarkeitsfeld dazu — von `visibility.ts`, nicht selbst gerechnet. */
  setVisibility(field: VisibilityField): void {
    this.field = field;
  }

  /** Die Kamera setzen — schaltet `follow` aus. */
  setView(view: Partial<FlatSceneView>): void {
    this.following = null;
    this.state = { ...this.state, ...view };
    this.state.scale = this.clampScale(this.state.scale);
  }

  /** Nur den Zoom setzen; wem die Kamera folgt, bleibt. */
  setScale(scale: number): void {
    this.state.scale = this.clampScale(scale);
  }

  getView(): FlatSceneView {
    return { ...this.state };
  }

  /** Der Kamera ein Wesen nachführen; `null` lässt sie los. */
  follow(entityId: string | null): void {
    this.following = entityId;
  }

  private clampScale(scale: number): number {
    return Math.min(this.maxScale, Math.max(this.minScale, scale));
  }

  private size(): { w: number; h: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { w: rect.width || 320, h: rect.height || 320 };
  }

  /** Von Bildpunkten (relativ zum Canvas) in Meter. */
  toWorld(px: number, py: number): MapPoint {
    const { w, h } = this.size();
    return {
      x: this.state.centreX + (px - w / 2) / this.state.scale,
      z: this.state.centreZ + (py - h / 2) / this.state.scale,
    };
  }

  /** Und zurück: Meter in Bildpunkte relativ zum Canvas. */
  toScreen(x: number, z: number): { x: number; y: number } {
    const { w, h } = this.size();
    return {
      x: w / 2 + (x - this.state.centreX) * this.state.scale,
      y: h / 2 + (z - this.state.centreZ) * this.state.scale,
    };
  }

  // --- Zeichnen ---------------------------------------------------------------

  /** Ein Bild zeichnen. Die Ansicht ruft das aus ihrem Takt — nicht die Szene. */
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
    if (this.following) {
      const target = this.snapshot.entities.find((e) => e.id === this.following);
      if (target) {
        this.state.centreX = target.at.x;
        // Die Figur steht auf ihrem Punkt und wächst nach oben: die Mitte des Bildes liegt auf ihrer Brust.
        this.state.centreZ = target.at.z - SPRITE_H * 0.4;
      }
    }
    const s = this.snapshot;
    const f = this.field;
    const omniscient = f.mode === 'omniscient';
    const u = this.state.scale;
    this.stats = { rooms: 0, walls: 0, items: 0, entities: 0, names: 0, cuts: 0, dimmed: 0 };

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = omniscient ? INK.spaceLit : INK.space;
    ctx.fillRect(0, 0, w, h);

    // Was überhaupt im Bild liegt — mit Rand für Wandhöhe und Figuren.
    const topLeft = this.toWorld(0, 0),
      bottomRight = this.toWorld(w, h);
    const view = {
      minX: topLeft.x - 2,
      minZ: topLeft.z - 2,
      maxX: bottomRight.x + 2,
      maxZ: bottomRight.z + 2 + SPRITE_H,
    };
    const inView = (minX: number, minZ: number, maxX: number, maxZ: number): boolean =>
      maxX >= view.minX && minX <= view.maxX && maxZ >= view.minZ && minZ <= view.maxZ;
    const boundsOf = (polygon: readonly MapPoint[]) => {
      let minX = Infinity,
        minZ = Infinity,
        maxX = -Infinity,
        maxZ = -Infinity;
      for (const p of polygon) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z);
        maxZ = Math.max(maxZ, p.z);
      }
      return { minX, minZ, maxX, maxZ };
    };

    // --- Böden und Raumnamen ----------------------------------------------------
    const rooms: Array<{ room: MapRoom; b: ReturnType<typeof boundsOf> }> = [];
    for (const room of s.rooms) {
      const b = boundsOf(room.polygon);
      if (!inView(b.minX, b.minZ, b.maxX, b.maxZ)) continue;
      rooms.push({ room, b });
      this.drawFloor(ctx, room, b);
      this.stats.rooms++;
    }
    for (const { room, b } of rooms) this.drawRoomName(ctx, room, b);

    // --- Wände: entdoppeln, Türen kennen, nach Achse trennen -----------------------
    const pieces = this.wallPieces(s);
    const layer: Layered[] = [];
    for (const piece of pieces) {
      if (piece.axis === 'z') {
        if (!inView(piece.at - BAND, piece.from - WALL_H, piece.at + BAND, piece.to)) continue;
        this.drawWallAlongZ(ctx, piece);
        this.stats.walls++;
      } else {
        if (!inView(piece.from, piece.at - WALL_H - BAND, piece.to, piece.at + BAND)) continue;
        this.stats.walls++;
        layer.push({ z: piece.at, order: 0, draw: () => this.drawWallAlongX(ctx, piece) });
      }
    }

    // --- Türen: Schwelle jetzt, Blatt sortiert ----------------------------------
    for (const door of s.doors) {
      if (!inView(door.at.x - 2, door.at.z - 2, door.at.x + 2, door.at.z + 2)) continue;
      this.drawThreshold(ctx, door);
      if (door.open && !door.locked) continue;
      if (door.axis === 'x')
        layer.push({ z: door.at.z, order: 0, draw: () => this.drawDoorLeafX(ctx, door) });
      else this.drawDoorLeafZ(ctx, door);
    }

    // --- Requisiten, Lampen, Figuren — sortiert nach z ----------------------------
    for (const item of s.items) {
      if (!inView(item.at.x - 1, item.at.z - 2, item.at.x + 1, item.at.z + 1)) continue;
      const p = this.toScreen(item.at.x, item.at.z);
      layer.push({
        z: item.at.z,
        order: 1,
        draw: () => {
          drawProp(ctx, p.x, p.y, u, item, s.time);
          this.stats.items++;
        },
      });
    }
    for (const light of s.lights) {
      if (light.kind !== 'lamp' && light.kind !== 'beacon') continue;
      if (!inView(light.at.x - 1, light.at.z - 1, light.at.x + 1, light.at.z + 1)) continue;
      const p = this.toScreen(light.at.x, light.at.z);
      const on = light.on && (light.kind !== 'lamp' || s.power);
      layer.push({
        z: light.at.z,
        order: 1,
        draw: () => drawLamp(ctx, p.x, p.y, u, on, light.color),
      });
    }
    const visible = new Set(f.visibleEntities);
    const shown: MapEntity[] = [];
    for (const entity of s.entities) {
      if (!omniscient && !visible.has(entity.id)) continue;
      if (entity.concealed && entity.kind === 'monster') continue;
      if (!inView(entity.at.x - 1, entity.at.z - 2, entity.at.x + 1, entity.at.z + 1)) continue;
      shown.push(entity);
      const p = this.toScreen(entity.at.x, entity.at.z);
      layer.push({
        z: entity.at.z,
        order: 2,
        draw: () => {
          this.drawEntity(ctx, entity, p, s.time);
          this.stats.entities++;
        },
      });
    }
    layer.sort((a, b) => a.z - b.z || a.order - b.order);
    for (const one of layer) one.draw();

    // --- Dunkelheit --------------------------------------------------------------
    if (omniscient) {
      const lit = new Set(f.litRooms);
      for (const { room } of rooms) {
        if (lit.has(room.id)) continue;
        this.path(ctx, room.polygon);
        ctx.fillStyle = INK.dim;
        ctx.fill();
        this.stats.dimmed++;
      }
    } else {
      this.drawDarkness(ctx, w, h, dpr);
    }

    // --- Namen, über der Dunkelheit ------------------------------------------------
    for (const entity of shown) {
      if (!visible.has(entity.id) && !omniscient) continue;
      if (entity.concealed) continue;
      const p = this.toScreen(entity.at.x, entity.at.z);
      const height = entity.kind === 'monster' ? monsterHeight(entity.label) : SPRITE_H;
      drawName(
        ctx,
        p.x,
        p.y - (height + 0.12) * u,
        entity.label,
        Math.max(12, Math.min(18, u * 0.2)),
      );
      this.stats.names++;
    }
    this.options.overlay?.(ctx, this);
  }

  /** Der Boden eines Raums: Platten mit Fugen, in Gängen Rillen. */
  private drawFloor(
    ctx: CanvasRenderingContext2D,
    room: MapRoom,
    b: { minX: number; minZ: number; maxX: number; maxZ: number },
  ): void {
    const u = this.state.scale;
    ctx.save();
    this.path(ctx, room.polygon);
    ctx.clip();
    ctx.fillStyle = room.circulation ? INK.corridor : INK.floor;
    const tl = this.toScreen(b.minX, b.minZ),
      br = this.toScreen(b.maxX, b.maxZ);
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    // Fugen im Raster; eine leichte Kante oben links an jeder Platte.
    ctx.lineWidth = Math.max(1, u * 0.035);
    ctx.strokeStyle = INK.floorSeam;
    ctx.beginPath();
    for (let x = Math.ceil(b.minX / PLATE) * PLATE; x <= b.maxX; x += PLATE) {
      const p = this.toScreen(x, 0);
      ctx.moveTo(p.x, tl.y);
      ctx.lineTo(p.x, br.y);
    }
    for (let z = Math.ceil(b.minZ / PLATE) * PLATE; z <= b.maxZ; z += PLATE) {
      const p = this.toScreen(0, z);
      ctx.moveTo(tl.x, p.y);
      ctx.lineTo(br.x, p.y);
    }
    ctx.stroke();
    if (room.circulation) {
      // Rillen längs der langen Achse des Gangs.
      const along = b.maxX - b.minX >= b.maxZ - b.minZ ? 'x' : 'z';
      ctx.strokeStyle = INK.corridorGroove;
      ctx.lineWidth = Math.max(1, u * 0.02);
      ctx.beginPath();
      const step = PLATE / 3;
      if (along === 'x')
        for (let z = Math.ceil(b.minZ / step) * step; z <= b.maxZ; z += step) {
          const p = this.toScreen(0, z);
          ctx.moveTo(tl.x, p.y);
          ctx.lineTo(br.x, p.y);
        }
      else
        for (let x = Math.ceil(b.minX / step) * step; x <= b.maxX; x += step) {
          const p = this.toScreen(x, 0);
          ctx.moveTo(p.x, tl.y);
          ctx.lineTo(p.x, br.y);
        }
      ctx.stroke();
    } else {
      ctx.fillStyle = INK.floorHighlight;
      for (let x = Math.ceil(b.minX / PLATE) * PLATE; x < b.maxX; x += PLATE)
        for (let z = Math.ceil(b.minZ / PLATE) * PLATE; z < b.maxZ; z += PLATE) {
          const p = this.toScreen(x, z);
          ctx.fillRect(p.x + u * 0.06, p.y + u * 0.06, PLATE * u * 0.88, u * 0.08);
        }
    }
    ctx.restore();
  }

  /** Der Name quer über die obere Raumhälfte, blass-rot mit dunklem Rand und roter Linie. */
  private drawRoomName(
    ctx: CanvasRenderingContext2D,
    room: MapRoom,
    b: { minX: number; minZ: number; maxX: number; maxZ: number },
  ): void {
    const u = this.state.scale;
    const width = b.maxX - b.minX,
      depth = b.maxZ - b.minZ;
    if (room.circulation && (width < 4 || depth < 2) && (depth < 4 || width < 2)) return;
    const size = Math.max(
      10,
      Math.min(u * 0.42, ((width - 1) * u) / Math.max(4, room.name.length * 0.62)),
    );
    const at = this.toScreen((b.minX + b.maxX) / 2, b.minZ + Math.min(depth * 0.3, 2.2));
    ctx.save();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.16);
    ctx.strokeStyle = 'rgba(14, 17, 22, 0.8)';
    const text = room.name.toUpperCase();
    ctx.strokeText(text, at.x, at.y);
    ctx.fillStyle = INK.roomName;
    ctx.fillText(text, at.x, at.y);
    ctx.strokeStyle = INK.roomLine;
    ctx.lineWidth = Math.max(1.5, u * 0.03);
    const left = this.toScreen(b.minX + 0.6, 0).x,
      right = this.toScreen(b.maxX - 0.6, 0).x;
    ctx.beginPath();
    ctx.moveTo(left, at.y + size * 0.75);
    ctx.lineTo(right, at.y + size * 0.75);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Die Wandstücke des Snapshots, entdoppelt (zwei Räume führen dieselbe Wand
   * zweimal), an **jeder** Tür auf ihrer Linie aufgeschnitten und mit dem
   * Wissen, ob ein Ende an einer Türöffnung liegt — dort wird die Wand nicht
   * über die Ecke hinaus verlängert, sondern endet als Pfosten.
   *
   * Aufgeschnitten wird hier noch einmal, obwohl `wallSegments` die Türlücken
   * schon kennt: Die Fensterfront der Einsatzzentrale (`extract.ts`) läuft
   * als ein Stück über die Schleuse hinweg, und eine Figur, die durch eine
   * geschlossene Scheibe geht, glaubt niemandem mehr etwas.
   */
  private wallPieces(s: MapSnapshot): WallPiece[] {
    const seen = new Set<string>();
    const out: WallPiece[] = [];
    const doorEnds = new Set<string>();
    const key = (axis: 'x' | 'z', at: number, along: number): string =>
      `${axis}:${at.toFixed(2)}:${along.toFixed(2)}`;
    const gaps: Array<{ axis: 'x' | 'z'; at: number; from: number; to: number }> = [];
    for (const door of s.doors) {
      const along = door.axis === 'x' ? door.at.x : door.at.z;
      const at = door.axis === 'x' ? door.at.z : door.at.x;
      const half = door.width / 2;
      doorEnds.add(key(door.axis, at, along - half));
      doorEnds.add(key(door.axis, at, along + half));
      gaps.push({ axis: door.axis, at, from: along - half, to: along + half });
    }
    const push = (
      axis: 'x' | 'z',
      at: number,
      from: number,
      to: number,
      kind: MapSegment['kind'],
    ): void => {
      if (to - from < 1e-6) return;
      const id = `${axis}:${at.toFixed(2)}:${from.toFixed(2)}:${to.toFixed(2)}:${kind}`;
      if (seen.has(id)) return;
      seen.add(id);
      out.push({
        axis,
        at,
        from,
        to,
        kind,
        doorStart: doorEnds.has(key(axis, at, from)),
        doorEnd: doorEnds.has(key(axis, at, to)),
      });
    };
    for (const wall of s.walls) {
      const axis: 'x' | 'z' = Math.abs(wall.a.z - wall.b.z) < 1e-6 ? 'x' : 'z';
      const at = axis === 'x' ? wall.a.z : wall.a.x;
      let from = Math.min(axis === 'x' ? wall.a.x : wall.a.z, axis === 'x' ? wall.b.x : wall.b.z);
      const to = Math.max(axis === 'x' ? wall.a.x : wall.a.z, axis === 'x' ? wall.b.x : wall.b.z);
      const cuts = gaps
        .filter((g) => g.axis === axis && Math.abs(g.at - at) < 1e-3 && g.to > from && g.from < to)
        .sort((p, q) => p.from - q.from);
      for (const cut of cuts) {
        push(axis, at, from, Math.min(cut.from, to), wall.kind);
        from = Math.max(from, cut.to);
      }
      push(axis, at, from, to, wall.kind);
    }
    return out;
  }

  /** Eine Wand entlang x: Oberkante um `WALL_H` nach Norden, darunter die Vorderseite. */
  private drawWallAlongX(ctx: CanvasRenderingContext2D, piece: WallPiece): void {
    const u = this.state.scale;
    const x0 = piece.from - (piece.doorStart ? 0 : BAND / 2),
      x1 = piece.to + (piece.doorEnd ? 0 : BAND / 2);
    const left = this.toScreen(x0, 0).x,
      right = this.toScreen(x1, 0).x;
    const lineY = this.toScreen(0, piece.at).y;
    const topY = lineY - (WALL_H + BAND / 2) * u;
    const faceY = lineY - (WALL_H - BAND / 2) * u;
    const baseY = lineY + (BAND / 2) * u;
    const glass = piece.kind !== 'wall';
    // Die Vorderseite: heller Grat oben, dunkel unten, Paneelfugen im Plattenraster.
    ctx.fillStyle = linearGradient(ctx, 0, faceY, 0, baseY, [
      [0, glass ? INK.pane : INK.faceTop],
      [1, glass ? INK.paneDark : INK.faceBottom],
    ]);
    ctx.fillRect(left, faceY, right - left, baseY - faceY);
    ctx.fillStyle = INK.faceSeam;
    ctx.fillRect(left, baseY - Math.max(1, u * 0.04), right - left, Math.max(1, u * 0.04));
    if (!glass)
      for (let x = Math.ceil(x0 / PLATE) * PLATE; x < x1; x += PLATE) {
        const sx = this.toScreen(x, 0).x;
        ctx.fillRect(sx, faceY, Math.max(1, u * 0.03), baseY - faceY);
      }
    ctx.fillStyle = INK.faceRidge;
    ctx.fillRect(left, faceY, right - left, Math.max(1.5, u * 0.05));
    // Die Oberkante.
    ctx.fillStyle = INK.wallTop;
    ctx.fillRect(left, topY, right - left, faceY - topY);
    ctx.fillStyle = INK.wallRidge;
    ctx.fillRect(left, topY, right - left, Math.max(1, u * 0.04));
    if (glass) {
      // Die Oberkante einer Scheibe: ein Rahmen mit einer dünnen Kante Glas darin.
      ctx.fillStyle = INK.pane;
      ctx.fillRect(left, topY + u * 0.19, right - left, Math.max(1, u * 0.12));
    }
    ctx.strokeStyle = ART.ink;
    ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.strokeRect(left, topY, right - left, baseY - topY);
    // Pfosten an Türenden: ein heller Streifen, damit die Öffnung einen Rahmen hat.
    ctx.fillStyle = INK.faceRidge;
    const post = Math.max(2, u * 0.08);
    if (piece.doorStart) ctx.fillRect(left, topY, post, baseY - topY);
    if (piece.doorEnd) ctx.fillRect(right - post, topY, post, baseY - topY);
  }

  /** Eine Wand entlang z: nur die Oberkante, dazu am Südende ein kleines Stück Vorderseite. */
  private drawWallAlongZ(ctx: CanvasRenderingContext2D, piece: WallPiece): void {
    const u = this.state.scale;
    const z0 = piece.from - (piece.doorStart ? 0 : BAND / 2),
      z1 = piece.to + (piece.doorEnd ? 0 : BAND / 2);
    const left = this.toScreen(piece.at - BAND / 2, 0).x,
      right = this.toScreen(piece.at + BAND / 2, 0).x;
    const topY = this.toScreen(0, z0 - WALL_H).y;
    const endY = this.toScreen(0, z1 - WALL_H).y;
    const baseY = this.toScreen(0, z1).y;
    const glass = piece.kind !== 'wall';
    ctx.fillStyle = INK.wallTop;
    ctx.fillRect(left, topY, right - left, endY - topY);
    if (glass) {
      ctx.fillStyle = INK.pane;
      ctx.fillRect(left + u * 0.19, topY, Math.max(1, u * 0.12), endY - topY);
    }
    ctx.fillStyle = INK.wallRidge;
    ctx.fillRect(left, topY, Math.max(1, u * 0.04), endY - topY);
    // Die Stirnseite am Südende.
    if (!piece.doorEnd) {
      ctx.fillStyle = linearGradient(ctx, 0, endY, 0, baseY, [
        [0, glass ? INK.pane : INK.faceTop],
        [1, glass ? INK.paneDark : INK.faceBottom],
      ]);
      ctx.fillRect(left, endY, right - left, baseY - endY);
    }
    ctx.strokeStyle = ART.ink;
    ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.strokeRect(left, topY, right - left, (piece.doorEnd ? endY : baseY) - topY);
    ctx.fillStyle = INK.faceRidge;
    const post = Math.max(2, u * 0.08);
    if (piece.doorStart) ctx.fillRect(left, topY, right - left, post);
    if (piece.doorEnd) ctx.fillRect(left, endY - post, right - left, post);
  }

  /** Die Schwelle einer Tür: ein helleres Stück Boden in der Öffnung. */
  private drawThreshold(ctx: CanvasRenderingContext2D, door: MapDoor): void {
    const u = this.state.scale;
    const half = door.width / 2;
    const a =
      door.axis === 'x'
        ? this.toScreen(door.at.x - half, door.at.z - BAND / 2)
        : this.toScreen(door.at.x - BAND / 2, door.at.z - half);
    const b =
      door.axis === 'x'
        ? this.toScreen(door.at.x + half, door.at.z + BAND / 2)
        : this.toScreen(door.at.x + BAND / 2, door.at.z + half);
    ctx.fillStyle = INK.threshold;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeStyle = INK.floorSeam;
    ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }

  /** Das geschlossene Schiebeblatt in einer Wand entlang x — wie die Wand, nur heller, mit Leuchte. */
  private drawDoorLeafX(ctx: CanvasRenderingContext2D, door: MapDoor): void {
    const u = this.state.scale;
    const half = door.width / 2;
    const left = this.toScreen(door.at.x - half, 0).x,
      right = this.toScreen(door.at.x + half, 0).x;
    const lineY = this.toScreen(0, door.at.z).y;
    const topY = lineY - (WALL_H + BAND / 2) * u;
    const faceY = lineY - (WALL_H - BAND / 2) * u;
    const baseY = lineY + (BAND / 2) * u;
    ctx.fillStyle = door.locked ? INK.doorLeafLocked : INK.doorLeaf;
    ctx.fillRect(left, faceY, right - left, baseY - faceY);
    ctx.fillStyle = INK.wallTop;
    ctx.fillRect(left, topY, right - left, faceY - topY);
    // Die Fuge in der Mitte des Blatts und die Leuchte.
    ctx.fillStyle = INK.faceSeam;
    ctx.fillRect((left + right) / 2 - 1, faceY, Math.max(1, u * 0.03), baseY - faceY);
    ctx.fillStyle = door.locked ? INK.lampRed : INK.lampGreen;
    ctx.beginPath();
    ctx.arc(
      (left + right) / 2,
      faceY + (baseY - faceY) * 0.35,
      Math.max(2, u * 0.06),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = ART.ink;
    ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.strokeRect(left, topY, right - left, baseY - topY);
  }

  /** Das geschlossene Blatt in einer Wand entlang z: ein senkrechter Streifen mit Stirnseite. */
  private drawDoorLeafZ(ctx: CanvasRenderingContext2D, door: MapDoor): void {
    const u = this.state.scale;
    const half = door.width / 2;
    const left = this.toScreen(door.at.x - BAND / 2, 0).x,
      right = this.toScreen(door.at.x + BAND / 2, 0).x;
    const topY = this.toScreen(0, door.at.z - half - WALL_H).y;
    const endY = this.toScreen(0, door.at.z + half - WALL_H).y;
    const baseY = this.toScreen(0, door.at.z + half).y;
    ctx.fillStyle = door.locked ? INK.doorLeafLocked : INK.doorLeaf;
    ctx.fillRect(left, topY, right - left, endY - topY);
    ctx.fillStyle = INK.faceBottom;
    ctx.fillRect(left, endY, right - left, baseY - endY);
    ctx.fillStyle = door.locked ? INK.lampRed : INK.lampGreen;
    ctx.beginPath();
    ctx.arc((left + right) / 2, (topY + endY) / 2, Math.max(2, u * 0.06), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ART.ink;
    ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.strokeRect(left, topY, right - left, baseY - topY);
  }

  /** Eine Figur je Sorte: Crewmate, Monster, Drohne. */
  private drawEntity(
    ctx: CanvasRenderingContext2D,
    entity: MapEntity,
    p: { x: number; y: number },
    time: number,
  ): void {
    const u = this.state.scale;
    if (entity.kind === 'drone') {
      drawDrone(ctx, p.x, p.y, u);
      return;
    }
    const facing = facingOf(entity.yaw, this.facings.get(entity.id) ?? 1);
    this.facings.set(entity.id, facing);
    const phase = walkPhase(time, entity.moving, entity.sprinting);
    if (entity.kind === 'monster') {
      drawMonster(ctx, p.x, p.y, { scale: u, kind: this.monsterKind(entity), facing, phase, time });
      return;
    }
    const color = crewColor(entity.id, entity.kind);
    drawCrewmate(ctx, p.x, p.y, {
      scale: u,
      fill: color[1],
      shade: color[2],
      facing,
      phase,
      concealed: entity.concealed,
    });
  }

  /** Die Sorte des Monsters aus seinem Namen — der Snapshot trägt nur das Etikett. */
  private monsterKind(entity: MapEntity): string {
    const label = entity.label.toLowerCase();
    if (label.includes('kriech') || label.includes('crawler')) return 'crawler';
    if (label.includes('wächter') || label.includes('sentinel')) return 'sentinel';
    return 'stalker';
  }

  /**
   * Die schwarze Decke: alles schwarz, dann die Sichtflächen mit weichem Rand
   * herausgeschnitten. Lichtflächen, die Eigenwahrnehmung und der eigene
   * Sichtkegel — was `visibility.ts` liefert, sonst nichts.
   */
  private drawDarkness(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number): void {
    const dark = this.dark;
    if (dark.width !== this.canvas.width || dark.height !== this.canvas.height) {
      dark.width = this.canvas.width;
      dark.height = this.canvas.height;
    }
    const d = dark.getContext('2d');
    if (!d) return;
    d.setTransform(dpr, 0, 0, dpr, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.fillStyle = INK.space;
    d.fillRect(0, 0, w, h);
    d.globalCompositeOperation = 'destination-out';
    const f = this.field;
    const cut = (region: Pick<LitRegion, 'at' | 'radius' | 'polygon'>): void => {
      if (region.polygon.length < 3) return;
      const c = this.toScreen(region.at.x, region.at.z);
      const r = Math.max(0.1, region.radius) * this.state.scale;
      const soft = Math.min(0.95, Math.max(0, 1 - SOFT_EDGE / Math.max(SOFT_EDGE, region.radius)));
      d.fillStyle = radialGradient(d, c.x, c.y, r, [
        [0, 'rgba(0, 0, 0, 1)'],
        [soft, 'rgba(0, 0, 0, 1)'],
        [1, 'rgba(0, 0, 0, 0)'],
      ]);
      this.path(d, region.polygon);
      d.fill();
      this.stats.cuts++;
    };
    for (const region of f.lit) cut(region);
    if (f.self) cut(f.self);
    for (const cone of f.cones) cut({ at: cone.at, radius: cone.range, polygon: cone.polygon });
    d.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(dark, 0, 0);
    ctx.restore();
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

  /** Um Bildpunkte verschieben — die Szene folgt dem Finger, die Kamera lässt los. */
  panBy(dx: number, dy: number): void {
    this.following = null;
    this.state.centreX -= dx / this.state.scale;
    this.state.centreZ -= dy / this.state.scale;
    this.options.onViewChange?.(this.getView());
  }

  /** Um einen Faktor zoomen, so dass der Punkt unter dem Finger liegen bleibt. */
  zoomAt(factor: number, px: number, py: number): void {
    const before = this.toWorld(px, py);
    this.state.scale = this.clampScale(this.state.scale * factor);
    const after = this.toWorld(px, py);
    this.state.centreX += before.x - after.x;
    this.state.centreZ += before.z - after.z;
    this.options.onViewChange?.(this.getView());
  }

  /**
   * Ein Tipp: was liegt darunter? Figuren vor Requisiten vor Räumen. Die
   * Trefferfläche ist das Sprite selbst — Fußpunkt, Breite, Höhe —, nicht ein
   * Kreis um den Punkt, denn die Figur steht ja über ihrem Punkt.
   */
  tap(px: number, py: number): void {
    const u = this.state.scale;
    const s = this.snapshot;
    const hits = (at: MapPoint, w: number, h: number): boolean => {
      const p = this.toScreen(at.x, at.z);
      return (
        Math.abs(p.x - px) <= (w / 2) * u + 6 && py <= p.y + 0.15 * u + 6 && py >= p.y - h * u - 6
      );
    };
    if (this.options.onEntityClick) {
      const visible = new Set(this.field.visibleEntities);
      const omniscient = this.field.mode === 'omniscient';
      for (const entity of s.entities) {
        if (!omniscient && !visible.has(entity.id)) continue;
        if (entity.concealed && entity.kind === 'monster') continue;
        const h = entity.kind === 'monster' ? monsterHeight(this.monsterKind(entity)) : SPRITE_H;
        if (hits(entity.at, SPRITE_W, h)) {
          this.options.onEntityClick(entity.id);
          return;
        }
      }
    }
    if (this.options.onItemClick)
      for (const item of s.items) {
        const foot = propFootprint(item.kind);
        if (hits(item.at, foot.w, foot.h)) {
          this.options.onItemClick(item.id);
          return;
        }
      }
    const at = this.toWorld(px, py);
    if (this.options.onRoomClick)
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
    following: string | null;
    gestures: boolean;
  } {
    return {
      snapshot: this.snapshot,
      field: this.field,
      following: this.following,
      gestures: this.gestures,
    };
  }
}

/** Welcher Maßstab zu einer Bildschirmbreite passt — Telefone etwas kleiner. */
export function scaleForWidth(width: number): number {
  return width < PHONE_WIDTH ? PHONE_SCALE : DEFAULT_SCALE;
}
