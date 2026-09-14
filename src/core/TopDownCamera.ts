import * as THREE from 'three';
import { SmoothPose, weight } from '../net/PoseSmoothing';
import type { PoseArray } from '../net/types';
import { bringBack, cutAway, type ViewLevel } from './cutaway';
import type { PlayerRig } from './PlayerRig';
import { viewLayers } from './viewLayers';
import {
  TOP_DOWN_FOCUS,
  TOP_DOWN_FOV,
  TOP_DOWN_ZOOM,
  groundDirection,
  topDownDistance,
  topDownPitch,
  topDownPosition,
  stepFromDistance,
  zoomScaled,
  type Vec2,
} from './topDownPose';

/**
 * **Die Ansicht _Von oben_ — eine Kamera, keine zweite Welt.**
 *
 * Früher lag dafür eine eigene, gemalte Kachelwelt über dem WebGL-Bild, und
 * wer von oben spielte, spielte in einer zweiten Wahrheit:
 * andere Wände, andere Türen, andere Kisten. Jetzt ist es dieselbe Szene, in
 * der ein anderer gerade mit der Brille steht — nur aus einer festen
 * Schrägsicht darüber. Was hier steht, ist deshalb kurz: eine Kamera, ihr
 * Zoom, und das weiche Nachlaufen hinter der Figur.
 *
 * **Weich nachlaufen, nicht kleben.** Das Ziel ist die Mitte des Rigs, nicht
 * der Kopf (`topDownPose.TOP_DOWN_FOCUS`) — sonst schöbe jedes Ducken das
 * ganze Bild. Und die Kamera zieht diesem Ziel mit einer Zeitkonstante von
 * 0,12 s hinterher (`net/PoseSmoothing.SmoothPose`, dieselbe Glättung wie beim
 * Zuschauen): Wer eine Kante entlangläuft und an jeder Fuge einen Zentimeter
 * versetzt wird, sieht das sonst als Zittern im ganzen Bild.
 *
 * **Sich selbst sieht man hier.** Der eigene Körper liegt auf
 * `LAYER_SELF_ONLY` und wird vom eigenen Auge nie gezeichnet — von oben ist
 * dieses Auge aber ein Blick **auf** die Figur, also nimmt die Maske dieser
 * Kamera die Ebene dazu (`core/viewLayers.ts`, dieselbe Regel wie Spiegel und
 * Portalsichten).
 *
 * **Aufgeschnitten wird vor dem Zeichnen** (`core/cutaway.ts`). In einer Welt
 * mit Dach steht diese Kamera unter der Decke und sähe sie von unten; also
 * verschwindet alles, dessen Ebene über der des Rigs liegt, und kommt nach
 * dem Bild wieder (`cut`/`uncut`, gerufen von `App.step`). Die Ebene sagt die
 * Welt (`World.viewLevel`) — sie kennt die Kachel unter den Füßen, die Kamera
 * kennt sie nicht. Eine Welt, die nichts sagt, wird nicht aufgeschnitten:
 * nach der Höhe zu raten hieße, jedes Hochbett für ein Dach zu halten.
 *
 * **Und die Kamera hebt sich mit der Ebene, nicht mit den Füßen.** Ihre
 * Zielhöhe ist der Boden der Etage und nicht der Boden unter dem Spieler —
 * sonst führe das ganze Bild jede Treppenstufe einzeln mit, und eine Rampe
 * wäre eine Fahrt im Aufzug. Weich wird beides von derselben Glättung, die
 * auch der Figur hinterherzieht.
 */
export class TopDownCamera {
  /**
   * Die Kamera selbst — perspektivisch und eng (`TOP_DOWN_FOV`).
   *
   * Sie hängt **nicht** in der Szene: Sie folgt niemandem als Kind, sondern
   * wird jedes Bild selbst gesetzt, und ein Elternteil hätte nur eine zweite
   * Meinung dazu. Ihre Matrix wird deshalb hier von Hand nachgezogen.
   */
  readonly camera = new THREE.PerspectiveCamera(TOP_DOWN_FOV, 1, 0.1, 600);

  /**
   * **Der Abstand, den die Kamera haben soll**, in Metern.
   *
   * Eine Zahl und keine Stufennummer: Das Rad rastet zwar weiter auf die vier
   * Stufen (`zoomBy`), der Pinch auf dem Glas aber steht irgendwo dazwischen
   * (`zoomScale`). Wer sich stattdessen die zuletzt gerastete Stufe merkte,
   * spränge nach einem Pinch beim ersten Radklick dorthin zurück, wo er vor
   * dem Pinch war.
   */
  private target = topDownDistance(TOP_DOWN_ZOOM);
  /** Der Abstand, der gerade wirklich gilt — er zieht zum Ziel hin. */
  private distance = topDownDistance(TOP_DOWN_ZOOM);
  private readonly focus = new SmoothPose();
  private readonly pose: PoseArray = [0, 0, 0, 0, 0, 0, 1];
  private wheelAcc = 0;
  private disposers: Array<() => void> = [];
  /**
   * Auf welcher Ebene das Rig zuletzt stand — die Schnittkante (`cut`).
   *
   * `null` heißt: Diese Welt führt keine Ebenen, und dann wird auch nichts
   * aufgeschnitten. Nicht `0`: Eine Welt ohne Marken hätte damit jedes
   * Vordach verloren, das jemand später einmal markiert.
   */
  private level: number | null = null;
  /** Was für dieses Bild ausgeblendet ist. Nach dem Zeichnen wieder her damit. */
  private readonly hidden: THREE.Object3D[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.camera.name = 'top-down-camera';
    this.camera.rotation.set(topDownPitch(), 0, 0);
    this.camera.layers.mask = viewLayers(this.camera.layers.mask);
    this.setAspect(window.innerWidth / Math.max(1, window.innerHeight));
    // Das Rad gehört am Fenster abgehört und nicht an der Leinwand: Über der
    // Leinwand liegen HUD und Menü, und ein Zoom, der unter dem Weltnamen
    // aufhört, ist ein kaputter Zoom.
    this.on(window, 'wheel', (event: WheelEvent) => this.wheel(event.deltaY), { passive: true });
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /**
   * **Ein Bild weiter.** Ziel ist die Mitte des Rigs; die Kamera steht danach
   * schräg darüber und sieht es an.
   *
   * @param ground Auf welcher Ebene das Rig steht (`World.viewLevel`) — `null`
   *   in jeder Welt ohne Stockwerke. Dann zielt die Kamera wie bisher auf den
   *   Boden unter den Füßen und schneidet nichts auf.
   */
  update(dt: number, rig: PlayerRig, ground: ViewLevel | null = null): void {
    this.level = ground?.level ?? null;
    this.pose[0] = rig.position.x;
    this.pose[1] = (ground?.floorY ?? rig.getFloorY()) + TOP_DOWN_FOCUS;
    this.pose[2] = rig.position.z;
    this.focus.setTarget(this.pose);
    this.focus.update(dt, FOLLOW_TAU);
    // Der Zoom rastet in Stufen, fährt aber nicht hart: Ein Sprung von 16 auf
    // 22 m ist derselbe Ruck, gegen den die Glättung oben steht.
    this.distance += (this.target - this.distance) * weight(dt, ZOOM_TAU);
    topDownPosition(this.focus.position, this.distance, this.camera.position);
    this.camera.updateMatrixWorld(true);
  }

  /**
   * **Aufschneiden, kurz vor dem Bild.**
   *
   * Alles, dessen Ebene über der des Rigs liegt, wird unsichtbar — Decken,
   * Böden, Wände und Einbauten des Stockwerks darüber. Gerufen wird das
   * unmittelbar vor dem Zeichnen und **vor** den Spiegeln und Portalsichten:
   * Die zeichnen dieselbe Szene noch einmal, und ein Spiegel, in dem die Decke
   * steht, die daneben fehlt, ist schlimmer als gar kein Spiegel.
   */
  cut(root: THREE.Object3D): void {
    if (this.level === null) return;
    cutAway(root, this.level, this.hidden);
  }

  /**
   * **Und wieder her damit**, sobald das Bild steht.
   *
   * Ohne Bedingung zu rufen: Wer die Ansicht mitten im Bild umschaltet, hätte
   * sonst eine Welt, deren Obergeschoss in der Brille fehlt. Eingeblendet wird
   * genau das, was `cut` ausgeblendet hat.
   */
  uncut(): void {
    bringBack(this.hidden);
  }

  /**
   * **Sofort dort sein** — beim Umschalten der Ansicht, beim Weltwechsel und
   * nach jedem Versetzen. Ohne das flöge die Kamera aus der alten Welt in die
   * neue, quer durch alles, was dazwischen steht.
   */
  reset(): void {
    this.focus.reset();
    this.distance = this.target;
  }

  /**
   * **Eine Stufe näher (`-1`) oder ferner (`+1`)** — Rad und Bumper.
   *
   * Gerastet wird ab dem Abstand, der **gerade gilt**, und nicht ab einer
   * gemerkten Nummer: Nach einem Pinch auf 18 m ist „eine Stufe zurück" die
   * 22er-Stufe und nicht die, die vor dem Pinch dran war.
   */
  zoomBy(direction: number): void {
    this.target = stepFromDistance(this.target, direction);
  }

  /**
   * **Stufenlos zoomen** — zwei Finger auf dem Glas (`FlatControls`).
   *
   * Der Abstand wird mit `factor` malgenommen und zwischen die äußeren Stufen
   * geklemmt (`topDownPose.zoomScaled`). Anders als die Raste zieht das nicht
   * weich nach: Ein Pinch ist direktes Anfassen, und ein Bild, das dem Finger
   * eine Fünftelsekunde hinterherhinkt, fühlt sich kaputt an.
   */
  zoomScale(factor: number): void {
    this.target = zoomScaled(this.target, factor);
    this.distance = this.target;
  }

  /** Wie weit die Kamera gerade weg steht, in Metern — für Tests und Anzeigen. */
  get zoomDistance(): number {
    return this.distance;
  }

  /**
   * **Wo die Figur auf dem Schirm steht**, in CSS-Punkten — der Weg von der
   * Welt zurück auf die Leinwand.
   *
   * Paket P1 zielt damit mit der Maus: Die Richtung vom Zeiger zur Figur ist
   * auf dem Schirm zu messen und mit `topDownPose.groundDirection` in eine
   * Weltrichtung zu übersetzen. `null`, solange die Kamera nichts im Bild hat
   * (die Figur steht hinter dem Betrachter — von oben praktisch nie).
   */
  project(rig: PlayerRig): { x: number; y: number } | null {
    _target.set(rig.position.x, rig.getFloorY() + TOP_DOWN_FOCUS, rig.position.z);
    _target.project(this.camera);
    if (_target.z > 1) return null;
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + ((_target.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - _target.y) / 2) * rect.height,
    };
  }

  /**
   * **Aus einem Weg auf dem Schirm eine Richtung auf dem Boden** — dieselbe
   * Rechnung wie `topDownPose.groundDirection`, hier als Weg an der Kamera,
   * damit P1 nur ein Ding kennen muss.
   */
  groundDirection(screenX: number, screenY: number, out?: Vec2): Vec2 {
    return groundDirection(screenX, screenY, out);
  }

  dispose(): void {
    for (const off of this.disposers) off();
    this.disposers = [];
  }

  /** Das Rad sammelt, wie in der Kachelwelt: eine Stufe je 50 Einheiten. */
  private wheel(deltaY: number): void {
    this.wheelAcc += deltaY;
    if (Math.abs(this.wheelAcc) < WHEEL_NOTCH) return;
    this.zoomBy(this.wheelAcc < 0 ? -1 : 1);
    this.wheelAcc = 0;
  }

  private on<E extends Event>(
    target: EventTarget,
    type: string,
    handler: (event: E) => void,
    options?: AddEventListenerOptions,
  ): void {
    const listener = handler as EventListener;
    target.addEventListener(type, listener, options);
    this.disposers.push(() => target.removeEventListener(type, listener, options));
  }
}

/** Sekunden, in denen die Kamera rund zwei Drittel des Abstands aufholt. */
const FOLLOW_TAU = 0.12;
/** Dasselbe für den Zoom — etwas träger, weil er seltener und größer springt. */
const ZOOM_TAU = 0.18;
/** Wie viel Rad eine Stufe ist — so viel sammelte auch die alte Kachelwelt. */
const WHEEL_NOTCH = 50;

const _target = new THREE.Vector3();
