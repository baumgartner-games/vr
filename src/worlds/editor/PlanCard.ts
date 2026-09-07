import * as THREE from 'three';
import { GRAB_TINT } from '../../core/colors';
import { fitPaper, onPaper, onPaperLength, type PlanBox } from './mapPaper';
import type { PlanSolid } from './levelBuild';
import type { PlanProp } from './planProps';

/**
 * **Die Karte in der Hand** — eine Draufsicht auf den Grundriss, gezeichnet
 * auf ein Blatt.
 *
 * Sie ist das erste von zwei Dingen, die aus der Karte ein **Werkzeug** machen
 * statt eines Schalters. Vorher war „Karte ziehen“ dasselbe wie „Editor auf“:
 * Man griff an die Hüfte und stand im nächsten Bild in einem weißen Raum, mit
 * einem Modell in der Hand. Dazwischen fehlte der Schritt, den jedes andere
 * Werkzeug dieses Projekts hat — man nimmt es erst einmal **in die Hand** und
 * sieht, was es kann.
 *
 * Also zwei Schritte, wie bei der Drohne: Wer die Karte zieht, hält eine Karte
 * und sieht von oben, wo er steht. Wer dann den **Trigger** drückt, geht in
 * den Konstruktraum (`Workshop.ts`) — dorthin, wo der Grundriss als Modell
 * vor einem steht und man ihn wirklich umbauen kann.
 *
 * Gezeichnet wird aus **derselben Liste**, aus der auch die Miniatur und die
 * Lebensgröße gebaut werden (`levelBuild.planSolids`). Eine Karte mit einem
 * eigenen Zeichner wäre eine zweite Meinung über denselben Grundriss, und die
 * beiden liefen an dem Tag auseinander, an dem jemand eine Tür verschiebt.
 *
 * **Neu gezeichnet wird nur, wenn sich etwas geändert hat** (`draw`): eine
 * Leinwand von 512 Pixeln je Bild zu malen kostet mehr, als die ganze Welt
 * daneben zu zeichnen — und ein Grundriss ändert sich zwischen zwei
 * Handgriffen nicht.
 */

/** Maße des Blattes in der Hand, in Metern. */
const CARD = { width: 0.3, height: 0.21, thickness: 0.006 };

/** Und in Pixeln — so fein, dass eine Wand von 20 cm noch eine Linie ist. */
const CANVAS = { width: 640, height: 448 };

const INK = {
  paper: '#f2f0e6',
  floor: '#8fb8dd',
  wall: '#3b4a63',
  door: '#e58aa8',
  thing: '#ffb14e',
  mark: '#ff3b2f',
  grid: '#d8d5c6',
};

/** Wie weit über die Ränder des Plans hinaus das Blatt zeigt, in Planmetern. */
const AROUND = 2;

export class PlanCard extends THREE.Group {
  private readonly canvas: HTMLCanvasElement;
  private readonly paint: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private readonly parts: THREE.Mesh[] = [];
  /** Woran erkannt wird, dass sich seit dem letzten Zeichnen etwas getan hat. */
  private stamp = '';

  constructor() {
    super();
    this.name = 'plan-card';

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS.width;
    canvas.height = CANVAS.height;
    this.canvas = canvas;
    this.paint = canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(CARD.width, CARD.thickness, CARD.height),
      new THREE.MeshStandardMaterial({ color: 0x1d2432, roughness: 0.8 }),
    );
    this.add(board);
    this.parts.push(board);

    // Das Blatt liegt **auf** dem Brett und schaut nach oben: Eine Karte hält
    // man waagerecht vor sich und sieht von oben darauf.
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD.width - 0.012, CARD.height - 0.012),
      new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false }),
    );
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.y = CARD.thickness / 2 + 0.0005;
    this.add(sheet);
    this.parts.push(sheet);

    // Ein Rand in Greiffarbe — dieselbe Auskunft wie überall: Hier faßt man an.
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(CARD.width + 0.008, CARD.thickness * 0.6, CARD.height + 0.008),
      new THREE.MeshStandardMaterial({
        color: GRAB_TINT,
        roughness: 0.6,
        emissive: new THREE.Color(GRAB_TINT).multiplyScalar(0.25),
      }),
    );
    rim.position.y = -CARD.thickness * 0.3;
    this.add(rim);
    this.parts.push(rim);
  }

  /**
   * Neu zeichnen, wenn nötig.
   *
   * @param solids Der Grundriss, aus derselben Liste wie alles andere
   * @param props  Was darin steht
   * @param bounds Der Ausschnitt in Planmetern
   * @param mark   Wo man selbst steht (Planmeter) und wohin man schaut
   * @param key    Was sich geändert haben kann — Planfassung und Fassung der
   *   Gegenstände. Die Marke steht nicht darin: Sie ändert sich bei jedem
   *   Schritt, und deshalb entscheidet über sie die gerundete Stelle.
   */
  draw(
    solids: readonly PlanSolid[],
    props: readonly PlanProp[],
    bounds: PlanBox,
    mark: { x: number; z: number; yaw: number } | null,
    key: string,
  ): void {
    const stamp = `${key}|${mark ? `${round(mark.x)},${round(mark.z)},${round(mark.yaw)}` : '-'}`;
    if (stamp === this.stamp) return;
    this.stamp = stamp;

    const paper = fitPaper(
      {
        minX: bounds.minX - AROUND,
        maxX: bounds.maxX + AROUND,
        minZ: bounds.minZ - AROUND,
        maxZ: bounds.maxZ + AROUND,
      },
      CANVAS.width,
      CANVAS.height,
      16,
    );

    const g = this.paint;
    g.fillStyle = INK.paper;
    g.fillRect(0, 0, CANVAS.width, CANVAS.height);

    // Erst der Boden, dann die Wände darüber: Ein Grundriss ist ein Stapel und
    // keine Liste — eine Wand, die unter ihrer Bodenplatte liegt, ist keine.
    for (const kind of ['floor', 'wall', 'door'] as const) {
      g.fillStyle = kind === 'floor' ? INK.floor : kind === 'door' ? INK.door : INK.wall;
      for (const solid of solids) {
        if (solid.kind !== kind) continue;
        const at = onPaper(paper, solid.x - solid.w / 2, solid.z - solid.d / 2);
        g.fillRect(at.x, at.y, onPaperLength(paper, solid.w), onPaperLength(paper, solid.d));
      }
    }

    // Die Gegenstände als Punkte: Auf einer Karte von Handtellergröße ist ein
    // Klotz von 30 cm ein Punkt, und ein maßstäblich gezeichneter wäre keiner.
    g.fillStyle = INK.thing;
    for (const prop of props) {
      const at = onPaper(paper, prop.x, prop.z);
      g.beginPath();
      g.arc(at.x, at.y, 5, 0, Math.PI * 2);
      g.fill();
    }

    if (mark) this.drawMark(paper, mark);

    g.strokeStyle = INK.grid;
    g.lineWidth = 4;
    g.strokeRect(2, 2, CANVAS.width - 4, CANVAS.height - 4);

    this.texture.needsUpdate = true;
  }

  /**
   * **Die Marke**: wo man steht und wohin man schaut — ein Pfeil und kein
   * Punkt.
   *
   * Ein Punkt beantwortet die halbe Frage. Wer auf eine Karte sieht, will
   * wissen, wo er ist *und* wo vorn ist; ohne das zweite dreht man sich einmal
   * im Kreis, bevor man losgeht.
   */
  private drawMark(
    paper: ReturnType<typeof fitPaper>,
    mark: { x: number; z: number; yaw: number },
  ): void {
    const g = this.paint;
    const at = onPaper(paper, mark.x, mark.z);
    g.save();
    g.translate(at.x, at.y);
    // Auf dem Blatt zeigt „vorn" nach oben; ein Gierwinkel von null tut das in
    // der Welt auch. Positiv dreht in three.js gegen den Uhrzeigersinn von
    // oben — auf dem Blatt mit seiner nach unten laufenden Achse ist das der
    // Uhrzeigersinn, und deshalb steht hier kein Minus.
    g.rotate(mark.yaw);
    g.fillStyle = INK.mark;
    g.beginPath();
    g.moveTo(0, -11);
    g.lineTo(7, 8);
    g.lineTo(0, 4);
    g.lineTo(-7, 8);
    g.closePath();
    g.fill();
    g.restore();
  }

  dispose(): void {
    for (const mesh of this.parts) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.parts.length = 0;
    this.texture.dispose();
    this.canvas.width = 0;
    this.removeFromParent();
  }
}

function round(value: number): number {
  return Math.round(value * 20) / 20;
}
