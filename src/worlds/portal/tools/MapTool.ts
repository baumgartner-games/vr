import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { GRIP_LENGTH } from './grip';
import { fitMap } from '../../shared/mapFit';
import { MAP_STYLE, paintMap, type MapStyle } from '../../shared/mapPaint';
import type { MapScene } from '../../shared/mapScene';
import type { ControllerState } from '../../../core/XRInput';
import { playPick } from '../../../core/Audio';

/**
 * **Die Karte** — dieselbe Draufsicht wie auf der Werkzeugseite, nur in der
 * Hand.
 *
 * Sie baut nichts eigenes: Was sie zeichnet, ist die Karte, die jede Welt mit
 * einem Navigationsgitter von sich aus hergibt (`ToolHost.map()`,
 * `shared/mapScene.ts`), und gemalt wird sie von derselben Zeile wie im
 * Browser (`shared/mapPaint.ts`). Das ist der ganze Punkt an der Sache: Eine
 * Karte, die je Welt gebaut werden müsste, gäbe es für eine Welt und für die
 * neun anderen nicht.
 *
 * **Zwei Stufen, ein Trigger.** Ganz herausgezoomt ist sie ein Grundriss: wo
 * bin ich, wo ist der Rest der Halle. Herangeholt ist sie eine **Minikarte**,
 * die einem folgt — dieselbe Rechnung, nur mit dem Spieler als Mitte
 * (`fitMap({ centre })`). Beides braucht man, und beides ist dieselbe Karte;
 * ein zweites Werkzeug dafür wäre ein zweites, das dasselbe anders zeigt.
 *
 * **Sie wird nicht jedes Bild neu gemalt.** Sechsmal in der Sekunde reicht für
 * etwas, das man in der Hand hält und ansieht — und ein Canvas mit ein paar
 * hundert Rechtecken je Bild wäre in der Brille der Posten, an dem die
 * Bildrate hängt. Was sich schnell bewegt, ist ohnehin man selbst, und den
 * eigenen Pfeil sieht man auch bei sechs Bildern je Sekunde ruhig stehen.
 */

/** Kantenlänge der Tafel in Metern — eine Handfläche. */
const BOARD = 0.17;
/** Und die der Textur darauf. */
const PIXELS = 512;
/** Wie oft neu gemalt wird, in Sekunden. */
const REPAINT = 1 / 6;
/** Wie nah die Minikarte herangeht: Ein Meter wird so viel breiter. */
const CLOSE_ZOOM = 3.5;

/**
 * Etwas ruhiger als die Debug-Karte im Browser: Die Wände sind hier kein
 * Hinweis auf einen Fehler, sondern der Grundriss, in dem man steht.
 */
const HELD_STYLE: MapStyle = {
  ...MAP_STYLE,
  ground: 0x080d16,
  wall: 0xa8bcdf,
  tile: 0x2f7fb5,
  upper: 0x7fc4e8,
};

export class MapTool extends Tool {
  override readonly toolId = 'map';
  override readonly label = 'Karte';

  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  /** Herangeholt statt ganz: die Minikarte, die einem folgt. */
  private close = false;
  private since = REPAINT;

  constructor() {
    super();
    this.name = 'tool-map';
    this.icon = 'worlds';
    this.accent = 0x39d0ff;
    this.hint = 'Trigger schaltet zwischen ganzer Karte und Ausschnitt';

    const grip = this.mountGrip({ length: GRIP_LENGTH });

    this.canvas = document.createElement('canvas');
    this.canvas.width = PIXELS;
    this.canvas.height = PIXELS;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    // Ein Rahmen und ein Blatt darin. Das Blatt sitzt eine Haaresbreite davor,
    // sonst streiten die beiden Flächen um dieselben Bildpunkte.
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD + 0.016, BOARD + 0.016, 0.008),
      new THREE.MeshStandardMaterial({ color: 0x2b3346, roughness: 0.7, metalness: 0.2 }),
    );
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD, BOARD),
      new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false }),
    );
    sheet.position.z = 0.0055;
    frame.add(sheet);

    // **Über der Faust und zum Gesicht gekippt**, wie eine Uhr am Handgelenk:
    // Der Griff steht senkrecht in der Hand (+Y), die Tafel liegt darüber und
    // schaut nach oben und ein Stück nach hinten. Flach auf der Faust sähe man
    // sie nur von der Seite; senkrecht davor stünde sie im Weg.
    frame.position.set(0, GRIP_LENGTH / 2 + BOARD * 0.48, 0.025);
    frame.rotation.x = -Math.PI / 2.6;
    grip.add(frame);

    // Einmal malen, bevor jemand danach fragt: Ein Werkzeug im Regal bekommt
    // nie ein `update`, und ein schwarzes Rechteck sähe dort aus wie ein Fehler.
    this.draw(null);
  }

  override onTrigger(_controller: ControllerState, _host: ToolHost): void {
    this.close = !this.close;
    // Sofort neu malen und nicht erst in einer Sechstelsekunde: Ein Knopf, der
    // erst später etwas tut, fühlt sich an wie einer, der klemmt.
    this.since = REPAINT;
    playPick(this.close);
  }

  override update(dt: number, host: ToolHost, _controller: ControllerState | null): void {
    this.since += dt;
    if (this.since < REPAINT) return;
    this.since = 0;
    this.draw(host.map());
  }

  /**
   * Ein Bild der Karte.
   *
   * Die Mitte ist im Ausschnitt der **Spieler** und nicht die Mitte der Welt —
   * das ist der Unterschied zwischen einer Karte und einer Minikarte, und er
   * ist genau ein Feld in den Optionen.
   */
  private draw(scene: MapScene | null): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    if (!scene) {
      ctx.fillStyle = '#080d16';
      ctx.fillRect(0, 0, PIXELS, PIXELS);
      ctx.fillStyle = '#8e9ab8';
      ctx.font = '30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Eine Welt ohne Gitter hat keinen Grundriss, und ein leeres Blatt sähe
      // aus wie ein kaputtes Werkzeug.
      ctx.fillText('Karte', PIXELS / 2, PIXELS / 2 - 24);
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText('erscheint in der Welt', PIXELS / 2, PIXELS / 2 + 20);
      this.texture.needsUpdate = true;
      return;
    }

    const me = scene.marks.find((mark) => mark.kind === 'player');
    const fit = fitMap(scene.bounds, PIXELS, PIXELS, {
      padding: 0.05,
      // In der Hand wird nichts quer gelegt: Die Tafel ist quadratisch, und
      // eine Karte, die sich beim Zoomen dreht, verliert man.
      turn: false,
      zoom: this.close ? CLOSE_ZOOM : 1,
      ...(this.close && me ? { centre: { x: me.x, z: me.z } } : {}),
    });
    paintMap(ctx, scene, fit, {
      style: HELD_STYLE,
      // Keine Namen auf einer Handfläche: Was hier zählt, ist der Grundriss
      // und wer darauf steht.
      labels: false,
      markSize: this.close ? 13 : 9,
    });
    this.texture.needsUpdate = true;
  }

  override disposeTool(): void {
    this.texture.dispose();
    disposeToolTree(this);
  }
}
