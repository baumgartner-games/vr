import { CREW_ART, SPRITE_H, crewColor, drawCrewmate, facingOf, walkPhase } from './crewmate';
import {
  clampScale,
  drawOrder,
  inView,
  liftOf,
  scaleForWidth,
  shade,
  toScreen,
  viewBounds,
  type FlatBox,
  type FlatCamera,
  type FlatScan,
} from './flatModel';
import './flatView.css';

/**
 * **Jede Welt von oben** — dasselbe Bild, das Haunting für seine Station hat,
 * nur aus der Welt gelesen statt gezeichnet.
 *
 * Was hier entsteht, ist kein Grundriss und kein zweites Spiel: Es ist
 * **dieselbe Welt, von oben angesehen**. Gelaufen wird mit demselben Körper
 * durch dieselben Wände (`PlayerRig`, die Physik der Welt); nur das Bild
 * kommt von hier statt aus der Kamera. Damit kann die Karte gar nicht von der
 * Welt abweichen — sie **ist** die Welt, nur flach gelesen (`flatScan.ts`).
 *
 * **Pseudo-3D, wie in der Vorlage** (`worlds/haunting/map/flatScene.ts`):
 * Norden ist oben, alles Aufrechte wächst auf dem Bild nach oben. Ein Klotz
 * bekommt seine Oberseite um `liftOf(Höhe)` nach Norden verschoben und
 * darunter eine Vorderseite, die nach Süden zeigt. Was weiter südlich steht,
 * wird später gezeichnet und verdeckt, was dahinter liegt.
 *
 * **Die Figur ist die aus der 2D-Welt** (`crewmate.ts`) — gerechnet wird
 * dabei mit einem Kreis (der Zylinder des Spielers in der Physik), gezeichnet
 * wird die Bohne mit dem Visier.
 *
 * DOM und Leinwand, kein three.js: Das Bild liegt über der Szene, die in
 * dieser Ansicht gar nicht erst gezeichnet wird (`App.step`).
 */

/** Wer auf dem Bild steht — der Spieler und die anderen im Raum. */
export interface FlatActor {
  id: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
  sprinting?: boolean;
  /** Der Spieler selbst: grün, in der Mitte, mit Namen darunter. */
  player?: boolean;
}

export interface FlatFrame {
  /** Sekunden seit dem Start — treibt die Gehanimation. */
  time: number;
  actors: readonly FlatActor[];
}

/** Die Farben der Ansicht: der Grund, auf dem alles liegt. */
const INK = {
  ground: '#0a0e16',
  grid: 'rgba(140, 170, 230, 0.07)',
  name: '#cbd6ea',
} as const;

/** Wie weit das Raster auf dem leeren Grund steht, in Metern. */
const GRID = 5;

export class FlatView {
  readonly element: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly host: HTMLElement;

  private scan: FlatScan | null = null;
  private readonly camera: FlatCamera = { centreX: 0, centreZ: 0, scale: 84 };
  /** Wohin jede Figur zuletzt schaute — gegen das Flackern nach Norden. */
  private readonly facings = new Map<string, 1 | -1>();
  private readonly disposers: Array<() => void> = [];
  /** Die zwei Finger einer Zoom-Geste, solange sie unten sind. */
  private readonly pinch = new Map<number, { x: number; y: number }>();
  private pinchSpan = 0;

  constructor(host: HTMLElement = document.body) {
    this.host = host;
    this.element = document.createElement('div');
    this.element.className = 'flatview';
    this.element.hidden = true;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'flatview__canvas';
    this.element.append(this.canvas);
    host.append(this.element);
    this.ctx = this.canvas.getContext('2d');
    this.camera.scale = scaleForWidth(window.innerWidth || 1024);
    this.listen();
  }

  get hidden(): boolean {
    return this.element.hidden;
  }

  /**
   * Zeigen oder verstecken. Versteckt wird nichts gezeichnet — und die Karte
   * bleibt liegen, damit ein Hin und Her zwischen 2D und 3D nicht jedes Mal
   * die ganze Szene neu abtastet.
   */
  show(on: boolean): void {
    if (this.element.hidden === !on) return;
    this.element.hidden = !on;
    if (on) this.resize();
  }

  /** Die Welt von oben, frisch gelesen (`scanScene`). */
  setScan(scan: FlatScan): void {
    this.scan = scan;
  }

  get hasScan(): boolean {
    return this.scan !== null;
  }

  /** Näher heran oder weiter weg — der Mausrad- und Kneifzoom. */
  zoomBy(factor: number): void {
    this.camera.scale = clampScale(this.camera.scale * factor);
  }

  draw(frame: FlatFrame): void {
    const ctx = this.ctx;
    if (!ctx || this.element.hidden) return;
    const { width, height } = this.resize();
    const me = frame.actors.find((actor) => actor.player) ?? frame.actors[0];
    if (me) {
      this.camera.centreX = me.x;
      // Die Brust in die Mitte, nicht die Füße: Sonst steht die Figur zu tief.
      this.camera.centreZ = me.z - SPRITE_H * 0.4;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = INK.ground;
    ctx.fillRect(0, 0, width, height);
    this.drawGrid(ctx, width, height);
    this.drawWorld(ctx, width, height);
    this.drawActors(ctx, width, height, frame);
  }

  dispose(): void {
    for (const off of this.disposers) off();
    this.disposers.length = 0;
    this.element.remove();
    if (this.host !== document.body) return;
  }

  // --- Zeichnen -------------------------------------------------------------

  /** Ein Raster auf dem leeren Grund, damit man sieht, dass man sich bewegt. */
  private drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const view = viewBounds(this.camera, width, height);
    ctx.strokeStyle = INK.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil(view.minX / GRID) * GRID; x <= view.maxX; x += GRID) {
      const at = toScreen(this.camera, width, height, x, 0).x;
      ctx.moveTo(at, 0);
      ctx.lineTo(at, height);
    }
    for (let z = Math.ceil(view.minZ / GRID) * GRID; z <= view.maxZ; z += GRID) {
      const at = toScreen(this.camera, width, height, 0, z).y;
      ctx.moveTo(0, at);
      ctx.lineTo(width, at);
    }
    ctx.stroke();
  }

  private drawWorld(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const scan = this.scan;
    if (!scan) return;
    const view = viewBounds(this.camera, width, height);
    const shown = scan.boxes.filter((box) => inView(box, view, 2));
    shown.sort(drawOrder);
    for (const box of shown) this.drawBox(ctx, width, height, box);
  }

  /**
   * Ein Stück Welt: die Oberseite, nach Norden verschoben, und darunter die
   * Vorderseite. Ein Boden hat keine Höhe und damit auch keine Vorderseite.
   */
  private drawBox(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    box: FlatBox,
  ): void {
    const scale = this.camera.scale;
    const nw = toScreen(this.camera, width, height, box.x - box.w / 2, box.z - box.d / 2);
    const se = toScreen(this.camera, width, height, box.x + box.w / 2, box.z + box.d / 2);
    const w = Math.max(1, se.x - nw.x);
    const d = Math.max(1, se.y - nw.y);

    if (box.kind === 'floor') {
      ctx.fillStyle = shade(box.color, -0.35);
      ctx.fillRect(nw.x, nw.y, w, d);
      // Eine hellere Kante nach Norden: Der Boden bekommt damit eine Fläche.
      ctx.fillStyle = shade(box.color, -0.15);
      ctx.fillRect(nw.x, nw.y, w, Math.min(2, d));
      return;
    }

    const lift = liftOf(box.height) * scale;
    // Die Vorderseite zuerst: Sie steht unter der Oberseite und wird von ihr
    // überdeckt, nicht umgekehrt.
    if (lift > 1) {
      ctx.fillStyle = shade(box.color, -0.55);
      ctx.fillRect(nw.x, se.y - lift, w, lift);
      ctx.fillStyle = shade(box.color, -0.7);
      ctx.fillRect(nw.x, se.y - 2, w, 2);
    }
    ctx.fillStyle = box.kind === 'wall' ? shade(box.color, 0.05) : box.color;
    ctx.fillRect(nw.x, nw.y - lift, w, d);
    ctx.strokeStyle = shade(box.color, -0.75);
    ctx.lineWidth = 1;
    ctx.strokeRect(nw.x + 0.5, nw.y - lift + 0.5, w - 1, d - 1);
  }

  private drawActors(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    frame: FlatFrame,
  ): void {
    const actors = [...frame.actors].sort((a, b) => a.z - b.z);
    for (const actor of actors) {
      const at = toScreen(this.camera, width, height, actor.x, actor.z);
      const facing = facingOf(actor.yaw, this.facings.get(actor.id) ?? 1);
      this.facings.set(actor.id, facing);
      const [, fill, dark] = crewColor(actor.id, actor.player ?? false);
      drawCrewmate(ctx, at.x, at.y, {
        scale: this.camera.scale,
        fill,
        shade: dark,
        facing,
        phase: walkPhase(frame.time, actor.moving, actor.sprinting ?? false),
      });
      if (!actor.player && actor.name) this.drawName(ctx, at.x, at.y, actor.name);
    }
  }

  private drawName(ctx: CanvasRenderingContext2D, x: number, y: number, name: string): void {
    ctx.save();
    ctx.font = `600 ${Math.max(10, this.camera.scale * 0.16)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = CREW_ART.ink;
    const at = y - this.camera.scale * 1.36;
    ctx.strokeText(name, x, at);
    ctx.fillStyle = INK.name;
    ctx.fillText(name, x, at);
    ctx.restore();
  }

  // --- Leinwand und Gesten --------------------------------------------------

  /** Die Leinwand auf die Größe des Fensters, in echten Bildpunkten. */
  private resize(): { width: number; height: number } {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(this.element.clientWidth * ratio));
    const height = Math.max(1, Math.round(this.element.clientHeight * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    return { width, height };
  }

  private listen(): void {
    const on = <E extends Event>(
      target: EventTarget,
      type: string,
      handler: (event: E) => void,
      options?: AddEventListenerOptions,
    ): void => {
      const listener = handler as EventListener;
      target.addEventListener(type, listener, options);
      this.disposers.push(() => target.removeEventListener(type, listener, options));
    };

    // **Am Fenster, nicht an der Leinwand.** Die Leinwand nimmt keine Zeiger an
    // (`flatView.css`), damit der Bordstock darunter weiter erreichbar ist —
    // also wird hier oben mitgehört, und nur, solange die Ansicht auch steht.
    on(window, 'wheel', (event: WheelEvent) => {
      if (this.element.hidden) return;
      this.zoomBy(Math.exp(-event.deltaY * 0.0016));
    });

    // Zwei Finger kneifen zoomen; ein Finger gehört dem Stock und der Welt.
    on(window, 'pointerdown', (event: PointerEvent) => {
      if (this.element.hidden || event.pointerType === 'mouse') return;
      this.pinch.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.pinchSpan = this.span();
    });
    on(window, 'pointermove', (event: PointerEvent) => {
      if (!this.pinch.has(event.pointerId)) return;
      this.pinch.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.pinch.size < 2) return;
      const span = this.span();
      if (this.pinchSpan > 0 && span > 0) this.zoomBy(span / this.pinchSpan);
      this.pinchSpan = span;
    });
    const end = (event: PointerEvent): void => {
      this.pinch.delete(event.pointerId);
      this.pinchSpan = this.span();
    };
    on(window, 'pointerup', end);
    on(window, 'pointercancel', end);
  }

  /** Der Abstand der beiden Finger, oder 0. */
  private span(): number {
    const [a, b] = [...this.pinch.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
