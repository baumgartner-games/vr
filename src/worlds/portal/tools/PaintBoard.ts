import * as THREE from 'three';
import { CHISEL_RATIO, alphaOf, sprayDots, stampCount, stampOf } from './brushSettings';
import {
  pointOnCanvas,
  rayOnCanvas,
  type BrushStroke,
  type CanvasPoint,
  type PaintSurface,
} from './paintCanvas';

/** Wie fein das Blatt ist, in Bildpunkten je Meter. */
const RESOLUTION = 760;
/** So weit vor und hinter dem Blatt zählt die Pinselspitze noch als „darauf". */
const REACH = 0.025;
/** Der Grundton des Blattes — Leinwand, kein Papier und schon gar nicht Weiß. */
const GROUND = '#f4efe3';
/**
 * Wie weit der Vorschaukreis vor dem Blatt schwebt, in Metern.
 *
 * Genau auf der Fläche läge er *in* ihr, und zwei Flächen auf demselben
 * Millimeter flackern gegeneinander (z-fighting). Ein halber Millimeter
 * reicht und ist auf Armlänge nicht zu sehen.
 */
const AIM_LIFT = 0.0005;

const _local = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _inverse = new THREE.Matrix4();

/**
 * **Ein Blatt, auf das gemalt wird** — die Leinwand der Staffelei.
 *
 * Es ist eine Fläche mit einer Zeichenleinwand darauf, mehr nicht: der Pinsel
 * sagt, wo, in welcher Farbe, wie breit und mit welcher Art
 * (`BrushStroke`), und das hier zieht den Strich. Wo „wo" liegt, rechnet
 * `paintCanvas.ts` (mit Test) — einmal für die Spitze, die das Blatt berührt,
 * einmal für den Zielstrahl, der von weiter weg darauf zeigt.
 *
 * **Ein Strich ist eine Linie und kein Punkt.** Wer den Trigger hält und zieht,
 * malt; jeder Klecks wird deshalb mit dem vorigen verbunden, solange derselbe
 * Strich läuft. Ohne das bekäme man bei 90 Bildern je Sekunde eine Perlenkette
 * aus Tupfen, und bei einer schnellen Handbewegung eine gestrichelte Linie.
 * Der runde Pinsel zieht diese Linie als Linie; alles, dessen Abdruck keine
 * runde Kappe ist (der Flachpinsel, die Sprühdose), stempelt ihn stattdessen
 * dicht an dicht die Strecke entlang (`stampCount`).
 */
export class PaintBoard extends THREE.Mesh implements PaintSurface {
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  /** Wo der laufende Strich zuletzt war, in Bildpunkten. */
  private last: { x: number; y: number } | null = null;
  /** Der Ring, der zeigt, wo der nächste Klecks landet. */
  private readonly aim: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * RESOLUTION);
    canvas.height = Math.round(height * RESOLUTION);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    super(
      new THREE.PlaneGeometry(width, height),
      // Beidseitig: eine Staffelei steht im Raum, und wer von hinten kommt,
      // soll nicht durch ein unsichtbares Blatt hindurchsehen.
      //
      // Und ein wenig **selbstleuchtend**: eine Leinwand steht meistens mit dem
      // Rücken zur Lampe — der Maler steht ja davor —, und ein Blatt, das man
      // nur bei gutem Licht lesen kann, ist keins. Es leuchtet dabei nicht von
      // selbst, sondern hebt nur das an, was ohnehin darauf steht
      // (`emissiveMap` ist dieselbe Leinwand).
      new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: new THREE.Color(0x585858),
        roughness: 0.95,
        side: THREE.DoubleSide,
      }),
    );
    this.name = 'paint-board';
    this.canvas = canvas;
    this.texture = texture;

    // Der Vorschaukreis: **so breit wie der Strich**, den er ankündigt. Er ist
    // damit keine Zielhilfe daneben, sondern die Spur selbst, nur noch nicht
    // gemalt — wer den Ring auf einer Kante liegen sieht, weiß, dass der Strich
    // sie trifft. Ein Ring und kein Punkt, weil ein gefüllter Fleck genau das
    // verdeckt, worauf man zielt.
    //
    // Gebaut mit Halbmesser **eins** und je Bild auf die eingestellte Breite
    // skaliert: die ist keine Konstante mehr, und eine Ringgeometrie pro Bild
    // neu zu bauen wäre der teuerste Weg, einen Kreis größer zu machen.
    this.aim = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 1, 24),
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.aim.name = 'paint-aim';
    this.aim.renderOrder = 12;
    this.aim.visible = false;
    this.add(this.aim);

    this.wipe();
  }

  /** Die Fläche selbst — `PaintSurface` fragt danach, um sie zu finden. */
  get object(): THREE.Object3D {
    return this;
  }

  paintAt(point: THREE.Vector3, stroke: BrushStroke, join: boolean): boolean {
    _local.copy(point);
    this.worldToLocal(_local);
    const hit = pointOnCanvas(_local, this.width, this.height, REACH);
    if (!hit) return false;
    this.dab(hit, stroke, join);
    return true;
  }

  paintRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
    stroke: BrushStroke,
    join: boolean,
  ): boolean {
    this.updateWorldMatrix(true, false);
    _inverse.copy(this.matrixWorld).invert();
    _origin.copy(origin).applyMatrix4(_inverse);
    _direction.copy(direction).transformDirection(_inverse).normalize();
    const hit = rayOnCanvas(_origin, _direction, this.width, this.height, range);
    if (!hit) return false;
    this.dab(hit, stroke, join);
    return true;
  }

  endStroke(): void {
    this.last = null;
  }

  aimAt(point: THREE.Vector3, stroke: BrushStroke): boolean {
    _local.copy(point);
    this.worldToLocal(_local);
    const hit = pointOnCanvas(_local, this.width, this.height, REACH);
    if (!hit) return false;
    // Auf der Seite, von der gezielt wird: eine Leinwand hat zwei, und ein Ring
    // hinter dem Blatt sieht man nicht.
    this.showAim(hit, _local.z < 0 ? -1 : 1, stroke);
    return true;
  }

  aimRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
    stroke: BrushStroke,
  ): boolean {
    this.updateWorldMatrix(true, false);
    _inverse.copy(this.matrixWorld).invert();
    _origin.copy(origin).applyMatrix4(_inverse);
    _direction.copy(direction).transformDirection(_inverse).normalize();
    const hit = rayOnCanvas(_origin, _direction, this.width, this.height, range);
    if (!hit) return false;
    this.showAim(hit, _origin.z < 0 ? -1 : 1, stroke);
    return true;
  }

  clearAim(): void {
    this.aim.visible = false;
  }

  /**
   * Wieder leer. Ohne das wäre der erste Fehlstrich das Ende des Bildes.
   *
   * Sie heißt `wipe` und nicht `clear`: `Object3D.clear()` gibt es schon, und
   * das wirft die *Kinder* weg statt der Farbe.
   */
  wipe(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.last = null;
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
    this.aim.geometry.dispose();
    this.aim.material.dispose();
    this.texture.dispose();
    this.removeFromParent();
  }

  /** Den Ring auf den getroffenen Punkt stellen — `side` ist die Blattseite. */
  private showAim(hit: CanvasPoint, side: number, stroke: BrushStroke): void {
    this.aim.position.set((hit.u - 0.5) * this.width, (0.5 - hit.v) * this.height, side * AIM_LIFT);
    this.aim.scale.setScalar(Math.max(0.002, stroke.width / 2));
    this.aim.material.color.setHex(stroke.color);
    this.aim.visible = true;
  }

  /**
   * Ein Abdruck auf der Leinwand — und die Spur dorthin, wenn der Strich läuft.
   *
   * Drei Formen, und nur die runde kann sich auf `lineCap` verlassen: ein
   * Rechteck und ein Sprühstoß haben keine Kappe, mit der man eine Strecke
   * ausfüllen könnte. Die beiden stempeln deshalb selbst, dicht an dicht
   * (`stampCount`) — dieselbe Rechnung, die der Test nachrechnet.
   */
  private dab(hit: CanvasPoint, stroke: BrushStroke, join: boolean): void {
    const ctx = this.canvas.getContext('2d')!;
    const x = hit.u * this.canvas.width;
    const y = hit.v * this.canvas.height;
    const size = Math.max(1, stroke.width * RESOLUTION);
    const css = `#${(stroke.color >>> 0).toString(16).padStart(6, '0')}`;
    const from = join ? this.last : null;
    const stamp = stampOf(stroke.kind);

    ctx.save();
    ctx.globalAlpha = alphaOf(stroke.kind);
    ctx.fillStyle = css;
    ctx.strokeStyle = css;

    if (stamp === 'round') {
      if (from) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(x, y);
        ctx.lineWidth = size;
        // Der Filzstift setzt hart ab, der runde Pinsel läuft weich aus.
        ctx.lineCap = stroke.kind === 'marker' ? 'square' : 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const distance = from ? Math.hypot(x - from.x, y - from.y) : 0;
      const steps = from ? stampCount(distance, size) : 1;
      for (let step = 1; step <= steps; step++) {
        const t = from ? step / steps : 1;
        const px = from ? from.x + (x - from.x) * t : x;
        const py = from ? from.y + (y - from.y) * t : y;
        if (stamp === 'chisel') this.chisel(ctx, px, py, size);
        else this.spray(ctx, px, py, size, stroke.width);
      }
    }

    ctx.restore();
    this.last = { x, y };
    this.texture.needsUpdate = true;
  }

  /** Der Flachpinsel: ein liegendes Rechteck, quer breit und längs schmal. */
  private chisel(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const high = Math.max(1, size * CHISEL_RATIO);
    ctx.fillRect(x - size / 2, y - high / 2, size, high);
  }

  /** Die Sprühdose: gestreute Punkte im Kegel, jeder für sich fast durchsichtig. */
  private spray(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    width: number,
  ): void {
    const dots = sprayDots(width * 1000);
    const radius = size / 2;
    const dot = Math.max(0.7, size / 22);
    for (let index = 0; index < dots; index++) {
      // Wurzel aus dem Zufall: sonst sitzen alle Punkte in der Mitte, denn ein
      // gleichverteilter Halbmesser füllt einen Kreis nicht gleichmäßig.
      const away = Math.sqrt(Math.random()) * radius;
      const angle = Math.random() * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * away, y + Math.sin(angle) * away, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
