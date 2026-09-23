import * as THREE from 'three';
import { TILE } from '../nav/navTile';
import { KAYKIT_ACCENT } from '../../core/kaykitIndex';
import { MAX_TILES, type GridEdge, type GridTile } from './gridSnap';

/**
 * **Die Kacheln, auf die das Getragene fällt** — das Gitter unter der Hand.
 *
 * Ein Modell aus dem Regal rastet beim Hinstellen auf dem Kachelgitter ein
 * (`gridSnap.ts`), und das war bis eben eine Rechnung, die man erst **nach**
 * dem Loslassen sah. Genau so wurde es gemeldet: „auch beim Platzieren der
 * Gegenstände würde ich gerne die Grid-Kachel/n gehighlighted sehen wollen,
 * damit ich weiß wohin ich das platzieren werde."
 *
 * Also liegt jetzt ein Rechteck auf dem Boden, solange etwas getragen wird —
 * eine Fläche je Kachel, die die Grundfläche des Dings berührt
 * (`gridSnap.tilesCovered`). Es springt von Kachel zu Kachel, weil das
 * Einrasten genau das tut; ein Gitter, das weich nachzöge, wäre ein Gitter,
 * das lügt.
 *
 * **Eine Fläche je Kachel und nicht eine große**, und das ist keine
 * Umständlichkeit: Ein zwei Kacheln breites Möbel soll man als **zwei**
 * Kacheln sehen, sonst weiß man nachher nicht, ob die Nachbarkachel noch frei
 * ist. Die Fugen dazwischen sind der ganze Sinn der Anzeige.
 *
 * ## Warum sie auf Fußhöhe liegt und nicht auf dem Boden darunter
 *
 * Das Einrasten kennt keinen Boden (`gridSnap.ts`): Es setzt x, z und die
 * Drehung, die Höhe macht die Schwerkraft. Einen Boden zu suchen hieße, hier
 * eine zweite Antwort auf eine Frage zu geben, die das Einrasten bewusst offen
 * lässt — und die beiden liefen beim ersten Tisch auseinander. Also liegt das
 * Gitter auf der Höhe, auf der die **Figur** steht (`PlayerRig.getFloorY`).
 * Wer auf einem Dach steht und dort etwas hinstellt, sieht es auf dem Dach;
 * wer über eine Grube greift, sieht es auf seiner eigenen Ebene, und das ist
 * dieselbe Auskunft, die auch das Einrasten gibt.
 */

/** Wie weit über dem Boden die Fläche liegt, in Metern — gegen Z-Fighting. */
const LIFT = 0.02;

/** Wie viel Luft zwischen zwei Kacheln bleibt, in Metern — die Fuge. */
const SEAM = 0.06;

/**
 * **Wie breit der Rahmen ist**, in Metern.
 *
 * Er ist der Teil, den man **immer** sieht: Die Fläche darunter liegt hinter
 * dem, was man trägt, sobald das Ding die Kachel ausfüllt — ein Apfel aus dem
 * Regal ist 1,02 m breit und deckt seine eigene Kachel von oben vollständig
 * ab. Der Rahmen wird deshalb **ohne Tiefenprüfung** gezeichnet und liegt
 * damit über allem; acht Zentimeter sind schmal genug, dass er das Modell
 * nicht einfärbt, und breit genug, dass man ihn aus der Aufsicht erkennt.
 */
const BAR = 0.08;

/**
 * **Wie breit die leuchtende Kante unter einer Wand ist**, in Metern.
 *
 * Breiter als der Rahmen einer Kachel, weil sie allein steht: Sie ist die
 * ganze Auskunft und nicht der Rand von einer. Schmaler als die Wand selbst
 * (die dünnste im Regal ist 0,15 m), damit sie von oben neben der Wand nicht
 * wie ein zweiter Sockel aussieht, sondern wie die Fuge, auf der sie steht.
 */
const EDGE_BAR = 0.14;

export class PlaceGrid {
  /** Die Flächen und ihre Rahmen — gebaut wird nur, was schon einmal nötig war. */
  private readonly quads: THREE.Object3D[] = [];
  /** Die Kantenstücke unter einer Wand (`showEdges`), ebenso auf Vorrat. */
  private readonly edges: THREE.Mesh[] = [];
  private readonly edge: THREE.PlaneGeometry;
  private readonly fill: THREE.PlaneGeometry;
  private readonly frame: THREE.BufferGeometry;
  private readonly fillSkin: THREE.MeshBasicMaterial;
  private readonly frameSkin: THREE.MeshBasicMaterial;
  readonly group = new THREE.Group();

  constructor(parent: THREE.Object3D) {
    this.group.name = 'place-grid';
    this.group.visible = false;
    // **Kein Schatten, kein Licht, keine Tiefenschrift.** Das Gitter ist eine
    // Auskunft und kein Gegenstand: Es soll auch dann zu sehen sein, wenn es
    // im Schatten des Möbels liegt, das gleich darauf steht.
    const side = TILE - SEAM;
    this.fill = new THREE.PlaneGeometry(side, side);
    this.fill.rotateX(-Math.PI / 2);
    this.frame = bandGeometry(side, BAR);
    // Liegend und von Westen nach Osten; ein Stück von Norden nach Süden ist
    // dasselbe Netz, um eine Vierteldrehung gedreht.
    this.edge = new THREE.PlaneGeometry(side, EDGE_BAR);
    this.edge.rotateX(-Math.PI / 2);
    this.fillSkin = new THREE.MeshBasicMaterial({
      color: KAYKIT_ACCENT,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.frameSkin = new THREE.MeshBasicMaterial({
      color: KAYKIT_ACCENT,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      // **Ohne Tiefenprüfung** — siehe `BAR`: Der Rahmen soll über dem liegen,
      // was man trägt, sonst sieht man ihn genau dann nicht, wenn man ihn
      // braucht.
      depthTest: false,
      side: THREE.DoubleSide,
    });
    parent.add(this.group);
  }

  /**
   * **Die Kacheln zeigen.** Eine leere Liste macht das Gitter unsichtbar —
   * dasselbe wie `hide`, nur ohne dass der Aufrufer sich das merken muss.
   *
   * `limit` hebt die Grenze für eine gezogene Fläche (`areaPaint.ts`): Unter
   * einem Möbel sind es nie mehr als `MAX_TILES`, unter einem Boden von
   * zwanzig mal zwanzig schon.
   */
  show(tiles: readonly GridTile[], y: number, limit = MAX_TILES): void {
    const count = Math.min(tiles.length, limit);
    if (count === 0 || !Number.isFinite(y)) {
      this.hide();
      return;
    }
    while (this.quads.length < count) {
      const quad = new THREE.Group();
      quad.name = `place-tile-${this.quads.length}`;
      const fill = new THREE.Mesh(this.fill, this.fillSkin);
      const frame = new THREE.Mesh(this.frame, this.frameSkin);
      for (const mesh of [fill, frame]) {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
      // Über allem, was auf dem Boden liegt — eine Auskunft gehört nach vorn.
      fill.renderOrder = 2;
      frame.renderOrder = 3;
      quad.add(fill, frame);
      this.quads.push(quad);
      this.group.add(quad);
    }
    for (let index = 0; index < this.quads.length; index++) {
      const quad = this.quads[index]!;
      const tile = tiles[index];
      quad.visible = index < count && tile !== undefined;
      if (tile) quad.position.set(tile.x, y + LIFT, tile.z);
    }
    for (const edge of this.edges) edge.visible = false;
    this.group.visible = true;
  }

  /**
   * **Die Kante zeigen, auf der eine Wand stehen wird** — statt der Kacheln.
   *
   * Eine Wand steht **zwischen** zwei Kacheln (`gridSnap.gridPose`), und ein
   * Gitter aus Kacheln sagte bei ihr genau das Falsche: Es leuchtete eine
   * Kachel an, auf der gar nichts steht. Gezeigt wird deshalb die Fuge selbst,
   * ein Stück je Kachel der Wandlänge, ohne Tiefenprüfung wie der Rahmen —
   * die Wand, die man trägt, steht ja genau darüber.
   */
  showEdges(edges: readonly GridEdge[], y: number, limit = MAX_TILES): void {
    const count = Math.min(edges.length, limit);
    if (count === 0 || !Number.isFinite(y)) {
      this.hide();
      return;
    }
    while (this.edges.length < count) {
      const bar = new THREE.Mesh(this.edge, this.frameSkin);
      bar.name = `place-edge-${this.edges.length}`;
      bar.castShadow = false;
      bar.receiveShadow = false;
      bar.renderOrder = 3;
      this.edges.push(bar);
      this.group.add(bar);
    }
    for (let index = 0; index < this.edges.length; index++) {
      const bar = this.edges[index]!;
      const edge = edges[index];
      bar.visible = index < count && edge !== undefined;
      if (!edge) continue;
      bar.position.set(edge.x, y + LIFT, edge.z);
      bar.rotation.y = edge.alongX ? 0 : Math.PI / 2;
    }
    for (const quad of this.quads) quad.visible = false;
    this.group.visible = true;
  }

  hide(): void {
    this.group.visible = false;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.group.clear();
    this.quads.length = 0;
    this.edges.length = 0;
    this.fill.dispose();
    this.edge.dispose();
    this.frame.dispose();
    this.fillSkin.dispose();
    this.frameSkin.dispose();
  }
}

/**
 * **Ein quadratischer Rahmen**, flach in der Bodenebene — außen `side`, innen
 * um `bar` schmaler.
 *
 * Gebaut aus einer Form mit Loch und nicht aus vier Balken: Das ist **eine**
 * Geometrie, die sich alle Kacheln teilen, und an den Ecken stößt nichts
 * aneinander.
 */
function bandGeometry(side: number, bar: number): THREE.BufferGeometry {
  const outer = side / 2;
  const inner = Math.max(outer - bar, 0.01);
  const shape = new THREE.Shape()
    .moveTo(-outer, -outer)
    .lineTo(outer, -outer)
    .lineTo(outer, outer)
    .lineTo(-outer, outer)
    .lineTo(-outer, -outer);
  const hole = new THREE.Path()
    .moveTo(-inner, -inner)
    .lineTo(-inner, inner)
    .lineTo(inner, inner)
    .lineTo(inner, -inner)
    .lineTo(-inner, -inner);
  shape.holes.push(hole);
  const geometry = new THREE.ShapeGeometry(shape);
  // `ShapeGeometry` liegt in der xy-Ebene; eine Vierteldrehung legt sie auf
  // den Boden, mit der Vorderseite nach oben.
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
