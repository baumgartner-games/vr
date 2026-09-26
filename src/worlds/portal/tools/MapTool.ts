import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { nearestLevel, onSheet, plotMap, toSheet, type MapWindow } from './mapPlot';
import type { ControllerState } from '../../../core/XRInput';
import { infoView } from '../../../core/infoViews';
import type { InfoViewOptions } from '../../../core/infoViews';

/**
 * **Die Karte** — ein Werkzeug, das nichts tut, außer zu sagen, wo man ist.
 *
 * Sie ist mit Absicht ein **Ding** und keine Anzeige im Blickfeld. Eine Minimap
 * in der Ecke des Bildes ist die Antwort vom Bildschirm; in einer Brille ist
 * sie das, wovon einem schlecht wird — sie klebt am Kopf, hat keine Entfernung
 * und man kann sie nicht weglegen. Eine Karte in der Hand hat all das: Man
 * hebt sie an, dreht sie ins Licht, hält sie näher ans Auge, um etwas zu
 * lesen, und steckt sie wieder weg. Genau so, wie man es mit einer Karte tut.
 *
 * **Woher sie weiß, wie die Welt aussieht:** aus dem Kachelgitter, das jede
 * Welt beim Aufbau von sich selbst abtastet (`PortalWorld.bakeNavigation`) —
 * dasselbe, über das auch die NPCs laufen. Es gibt also nichts zu pflegen: Wer
 * eine Wand baut, hat sie damit auf der Karte, und eine Tür, die aufgeht, geht
 * auch dort auf. Die Rechnung dazu steht in `mapPlot.ts`; hier wird nur
 * gemalt.
 *
 * **Norden ist oben** und der **Pfeil in der Mitte** ist man selbst. Der Pfeil
 * dreht sich, das Blatt nicht: Eine Karte, die sich unter der Hand mitdreht,
 * ist beim Gehen ein Kreisel — und man hält sie ja ohnehin schon in der Hand,
 * die man drehen kann.
 *
 * **Der Trigger zoomt.** Vier Stufen, im Kreis: von zwanzig Metern
 * Kantenlänge (das Zimmer, in dem man steht) bis auf hundertsechzig (die
 * halbe Welt in Dust). Mehr Bedienung hat sie nicht, und das ist der Punkt.
 */

/** Die Kantenlängen des Ausschnitts in Metern, in der Reihenfolge des Triggers. */
const SPANS = [20, 40, 80, 160] as const;

/** Wie oft neu gezeichnet wird. Eine Karte muss nicht mit 90 Hz zittern. */
const REFRESH = 0.15;

/** Das Blatt in Metern — DIN-A5-artig, so groß wie eine Hand es hält. */
const SHEET_W = 0.21;
const SHEET_H = 0.21;
/** Und in Pixeln. Quadratisch, weil der Ausschnitt quadratisch ist. */
const CANVAS = 512;

const _forward = new THREE.Vector3();

export class MapTool extends Tool {
  override readonly toolId = 'map';
  override readonly label = 'Karte';

  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly sheet: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private zoom = 1;
  private since = Number.POSITIVE_INFINITY;
  /** Wo der Träger steht und wohin er schaut — beim letzten Zeichnen. */
  private readonly at = new THREE.Vector3();
  private facing = 0;
  private level = 0;
  private plotted = false;

  constructor() {
    super();
    this.name = 'tool-map';
    this.icon = 'worlds';
    this.accent = 0xffd88a;
    this.hint = 'Karte von oben · Trigger zoomt';
    // Sie zielt nicht: Eine Karte zeigt nirgendwohin, sie liegt in der Hand
    // und wird angesehen. Dieselbe Antwort wie beim Schild.
    this.alignToAim = false;

    // Derselbe Halterzylinder wie an allen anderen — die Achse liegt auf +Y,
    // aus der Faust heraus, und die Karte steht darüber.
    this.mountGrip({ length: 0.08 });

    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS;
    this.canvas.height = CANVAS;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    // Ein Brett über dem Griff, zum Leser hin zurückgelehnt — wie das Schild
    // (`SignTool`), aus demselben Grund: Aufrecht ragte es dem Träger senkrecht
    // ins Blickfeld, flach läge es lesbar nur für den, der darübersteht.
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(SHEET_W + 0.016, SHEET_H + 0.016, 0.008),
      new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.85, metalness: 0.05 }),
    );
    board.position.set(0, 0.15, 0.01);
    board.rotation.x = -0.42;
    this.add(board);

    this.sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(SHEET_W, SHEET_H),
      new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false, transparent: true }),
    );
    this.sheet.position.z = 0.0045;
    board.add(this.sheet);

    this.draw(null);
  }

  /** Der Trigger blättert durch die Maßstäbe — sonst hat sie keine Bedienung. */
  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.zoom = (this.zoom + 1) % SPANS.length;
    this.since = Number.POSITIVE_INFINITY;
    controller.pulse(0.25, 20);
    host.notify(`Karte: ${SPANS[this.zoom]!} m`);
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!controller || !this.heldBy) return;
    this.since += dt;
    if (this.since < REFRESH) return;
    this.since = 0;

    const rig = host.ctx.rig;
    rig.getHeadPosition(this.at);
    rig.getHeadForward(_forward);
    // Norden oben, und −z ist in three.js vorn: Ein Blick nach Norden ist
    // damit ein Pfeil, der auf dem Blatt nach oben zeigt.
    this.facing = Math.atan2(_forward.x, -_forward.z);

    const graph = host.navMap();
    this.level = graph ? nearestLevel(graph.levels, this.at.y) : 0;
    this.draw(host);
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.texture.dispose();
  }

  private window(): MapWindow {
    return { x: this.at.x, z: this.at.z, span: SPANS[this.zoom]!, level: this.level };
  }

  private draw(host: ToolHost | null): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const size = CANVAS;
    const px = (value: number): number => value * size;
    // **Die Darstellungsoptionen** (`core/infoViews.ts`) — dasselbe
    // Optionsfeld wie an jeder anderen Info-Ansicht. „Nur 2D-Pfad" lässt die
    // gefüllten Böden weg und zeichnet Umrisse und Wege; die Deckkraft ist die
    // des Blatts.
    const look = infoView('map');
    this.sheet.material.opacity = look.opacity;

    ctx.fillStyle = '#efe4cc';
    ctx.fillRect(0, 0, size, size);

    const graph = host?.navMap() ?? null;
    const window = this.window();

    if (graph) {
      const plot = plotMap(graph, window);
      this.plotted = plot.tiles.length > 0;

      // Der Boden: ein Feld je Kachel, ein Hauch heller als das Papier.
      // Gesperrte Kacheln (`NavGraph.isBlocked`) rot — das ist die eine
      // Auskunft, die eine Karte geben kann und ein Blick nicht.
      const step = px(plot.tiles[0]?.size ?? 0);
      for (const tile of look.rooms ? plot.tiles : []) {
        if (look.flat) {
          // Flach: nur der Umriss jeder Kachel, dünn — der Boden als Raster.
          ctx.strokeStyle = tile.blocked ? 'rgba(196, 84, 63, 0.6)' : 'rgba(44, 42, 38, 0.12)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px(tile.at.u) - step / 2, px(tile.at.v) - step / 2, step, step);
          continue;
        }
        ctx.fillStyle = tile.blocked ? 'rgba(196, 84, 63, 0.35)' : '#f8f2e2';
        ctx.fillRect(px(tile.at.u) - step / 2, px(tile.at.v) - step / 2, step + 1, step + 1);
      }

      // Und die Wände darüber. Türen dünner und in einer anderen Farbe: Wer
      // vor einer Karte steht, sucht als Erstes den Ausgang.
      for (const wall of look.walls ? plot.walls : []) {
        if (wall.kind === 'door' && wall.open) {
          ctx.strokeStyle = '#4f8f5f';
          ctx.lineWidth = 3;
          ctx.setLineDash([7, 7]);
        } else if (wall.kind === 'door') {
          ctx.strokeStyle = '#8c5a2b';
          ctx.lineWidth = 5;
          ctx.setLineDash([]);
        } else if (wall.kind === 'window') {
          ctx.strokeStyle = '#5f86a8';
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#2c2a26';
          ctx.lineWidth = 6;
          ctx.setLineDash([]);
        }
        if (look.flat) ctx.lineWidth = Math.min(ctx.lineWidth, 3);
        ctx.beginPath();
        ctx.moveTo(px(wall.from.u), px(wall.from.v));
        ctx.lineTo(px(wall.to.u), px(wall.to.v));
        ctx.stroke();
      }
      ctx.setLineDash([]);
    } else {
      this.plotted = false;
    }

    // Die anderen im Raum: ein Punkt je Mitspieler, damit die Karte in einer
    // Sitzung sagt, wo die anderen gerade sind.
    if (host) this.drawPeers(ctx, host, window, px);
    if (host && look.actors) this.drawNpcs(ctx, host, window, px, look);

    // Man selbst, in der Mitte: ein Pfeil, der zeigt, wohin man schaut.
    this.drawArrow(ctx, size / 2, size / 2, size * 0.032);

    this.drawFrame(ctx, size, window);
    this.texture.needsUpdate = true;
  }

  private drawPeers(
    ctx: CanvasRenderingContext2D,
    host: ToolHost,
    window: MapWindow,
    px: (value: number) => number,
  ): void {
    for (const peer of host.ctx.net.peers.values()) {
      if (peer.world !== host.ctx.net.world || !peer.pose) continue;
      const at = toSheet(window, peer.pose.head[0], peer.pose.head[2]);
      if (!onSheet(at)) continue;
      ctx.beginPath();
      ctx.arc(px(at.u), px(at.v), 8, 0, Math.PI * 2);
      ctx.fillStyle = '#3f6fb5';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#efe4cc';
      ctx.stroke();
    }
  }

  /**
   * **Die NPCs, ihre Wege und Ziele** — das Fach „NPCs und Ziele" der
   * Darstellungsoptionen. Ein Weg ist eine Linie durch seine Wegpunkte, das
   * Ziel ein Ring; der NPC selbst ein grüner Punkt. Wer auf einer anderen
   * Etage steht, fehlt, wie die Wände dieser Etage auch.
   */
  private drawNpcs(
    ctx: CanvasRenderingContext2D,
    host: ToolHost,
    window: MapWindow,
    px: (value: number) => number,
    look: InfoViewOptions,
  ): void {
    const crowd = host.npcs()?.sketch?.() ?? [];
    const graph = host.navMap();
    for (const npc of crowd) {
      if (graph && nearestLevel(graph.levels, npc.y + 1.6) !== window.level) continue;
      if (npc.path.length > 1) {
        ctx.strokeStyle = '#2f9e6a';
        ctx.lineWidth = look.flat ? 3 : 4;
        ctx.setLineDash(look.flat ? [] : [10, 6]);
        ctx.beginPath();
        npc.path.forEach((point, index) => {
          const at = toSheet(window, point.x, point.z);
          if (index === 0) ctx.moveTo(px(at.u), px(at.v));
          else ctx.lineTo(px(at.u), px(at.v));
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (npc.goal) {
        const goal = toSheet(window, npc.goal.x, npc.goal.z);
        if (onSheet(goal)) {
          ctx.strokeStyle = '#2f9e6a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(px(goal.u), px(goal.v), 9, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      const at = toSheet(window, npc.x, npc.z);
      if (!onSheet(at)) continue;
      ctx.beginPath();
      ctx.arc(px(at.u), px(at.v), 7, 0, Math.PI * 2);
      ctx.fillStyle = '#2f9e6a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#efe4cc';
      ctx.stroke();
    }
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.facing);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.5);
    ctx.lineTo(r, r);
    ctx.lineTo(0, r * 0.45);
    ctx.lineTo(-r, r);
    ctx.closePath();
    ctx.fillStyle = '#c4543f';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2c2a26';
    ctx.stroke();
    ctx.restore();
  }

  /** Rand, Nordpfeil, Maßstab — und die Auskunft, wenn es nichts zu zeigen gibt. */
  private drawFrame(ctx: CanvasRenderingContext2D, size: number, window: MapWindow): void {
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#2c2a26';
    ctx.strokeRect(5, 5, size - 10, size - 10);

    ctx.fillStyle = '#2c2a26';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('N ↑', 22, 20);

    ctx.textAlign = 'right';
    ctx.fillText(`${window.span} m`, size - 22, 20);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText(`${Math.round(window.x)} / ${Math.round(window.z)}`, 22, size - 20);

    if (this.plotted) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(44, 42, 38, 0.65)';
    ctx.fillText('kein Gitter hier', size / 2, size * 0.72);
  }
}
