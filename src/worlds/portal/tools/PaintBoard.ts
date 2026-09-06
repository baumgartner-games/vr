import * as THREE from 'three';
import { pointOnCanvas, rayOnCanvas, type CanvasPoint, type PaintSurface } from './paintCanvas';

/** Wie fein das Blatt ist, in Bildpunkten je Meter. */
const RESOLUTION = 760;
/** Wie dick ein Strich ist, als Anteil der Blattbreite. */
const STROKE = 0.028;
/** So weit vor und hinter dem Blatt zählt die Pinselspitze noch als „darauf". */
const REACH = 0.025;
/** Der Grundton des Blattes — Leinwand, kein Papier und schon gar kein Weiß. */
const GROUND = '#f4efe3';

const _local = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _inverse = new THREE.Matrix4();

/**
 * **Ein Blatt, auf das gemalt wird** — die Leinwand der Staffelei.
 *
 * Es ist eine Fläche mit einer Zeichenleinwand darauf, mehr nicht: der Pinsel
 * sagt, wo und in welcher Farbe, und das hier zieht den Strich. Wo „wo" liegt,
 * rechnet `paintCanvas.ts` (mit Test) — einmal für die Spitze, die das Blatt
 * berührt, einmal für den Zielstrahl, der von weiter weg darauf zeigt.
 *
 * **Ein Strich ist eine Linie und kein Punkt.** Wer den Trigger hält und zieht,
 * malt; jeder Klecks wird deshalb mit dem vorigen verbunden, solange derselbe
 * Strich läuft. Ohne das bekäme man bei 90 Bildern je Sekunde eine Perlenkette
 * aus Tupfen, und bei einer schnellen Handbewegung eine gestrichelte Linie.
 */
export class PaintBoard extends THREE.Mesh implements PaintSurface {
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  /** Wo der laufende Strich zuletzt war, in Bildpunkten. */
  private last: { x: number; y: number } | null = null;

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
    this.wipe();
  }

  /** Die Fläche selbst — `PaintSurface` fragt danach, um sie zu finden. */
  get object(): THREE.Object3D {
    return this;
  }

  paintAt(point: THREE.Vector3, color: number, join: boolean): boolean {
    _local.copy(point);
    this.worldToLocal(_local);
    const hit = pointOnCanvas(_local, this.width, this.height, REACH);
    if (!hit) return false;
    this.dab(hit, color, join);
    return true;
  }

  paintRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
    color: number,
    join: boolean,
  ): boolean {
    this.updateWorldMatrix(true, false);
    _inverse.copy(this.matrixWorld).invert();
    _origin.copy(origin).applyMatrix4(_inverse);
    _direction.copy(direction).transformDirection(_inverse).normalize();
    const hit = rayOnCanvas(_origin, _direction, this.width, this.height, range);
    if (!hit) return false;
    this.dab(hit, color, join);
    return true;
  }

  endStroke(): void {
    this.last = null;
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
    this.texture.dispose();
    this.removeFromParent();
  }

  private dab(hit: CanvasPoint, color: number, join: boolean): void {
    const ctx = this.canvas.getContext('2d')!;
    const x = hit.u * this.canvas.width;
    const y = hit.v * this.canvas.height;
    const size = STROKE * this.canvas.width;
    const css = `#${(color >>> 0).toString(16).padStart(6, '0')}`;

    if (join && this.last) {
      ctx.beginPath();
      ctx.moveTo(this.last.x, this.last.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = css;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = css;
      ctx.fill();
    }
    this.last = { x, y };
    this.texture.needsUpdate = true;
  }
}
