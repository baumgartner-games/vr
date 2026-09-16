import * as THREE from 'three';
import { faceCamera, type BillboardOptions } from './billboard';

export interface TextPlaneOptions {
  width: number;
  height?: number;
  title: string;
  body?: string;
  accent?: number;
  background?: string;
  align?: 'left' | 'center';
  /**
   * **Soll die Tafel mitdrehen?** Ohne die Option bleibt sie stehen, wie sie
   * gestellt wurde (siehe Klassenkommentar). `true` nimmt die Vorgaben aus
   * `ui/billboard.ts`, ein Objekt reicht sie weiter — `{ upright: true }` für
   * ein Schild, das sich zwar umdrehen, aber nicht zurücklehnen soll.
   */
  face?: boolean | BillboardOptions;
  /**
   * **Sie soll vor den Gegenständen stehen, nicht zwischen ihnen.**
   *
   * Eine Tafel schwebt über dem, worüber sie etwas sagt — und genau dort steht
   * auch das, was sie verdeckt. An der Burger-Abgabe war das zu sehen: Auf der
   * Theke stehen Brötchen und Teller, darüber hängen die Wärmeschirme, und von
   * schräg oben schnitt ein Brötchen quer durch das Wort. Übrig blieb
   * „Deluxe s…" — ausgerechnet die Meldung, für die man hergekommen ist.
   * Mit `front` wird **ohne Tiefenprüfung** gezeichnet (`depthTest: false`),
   * und die Tafel liegt vor dem Ding, zu dem sie gehört.
   *
   * **Dasselbe Mittel wie bei den Küchenanzeigen** (`kitchenGauge.skin`,
   * Parameter `front`) und aus demselben Grund: Dort liegt der
   * Fortschrittsbalken seither vor dem Patty in der Pfanne statt darin. Ein
   * zweites Verfahren daneben zu erfinden hieße, zwei Regeln zu haben, die
   * dasselbe fast gleich machen.
   *
   * **Ein Versatz Richtung Kamera wäre hier keine Alternative gewesen.** Das
   * Brötchen liegt nicht einen Hauch vor der Tafel, sondern in der Blickrichtung
   * von schräg oben eine gute Handbreit davor; was `polygonOffset` an Tiefe
   * verschiebt, ist ein Saum gegen Z-Fighting und kein halber Meter. Wer so
   * weit verschöbe, dass es reicht, hätte die Tafel sichtbar von ihrer Theke
   * weggerückt — und sie stünde **trotzdem** irgendwann wieder in einer Wand.
   *
   * **Es reicht aber weiter, als man denkt**, und darum ist es eine Option und
   * keine Vorgabe: Ohne Tiefenprüfung steht die Tafel auch vor jeder Wand und
   * ist aus dem Nachbarraum quer durch sie hindurch zu lesen. Wer sie setzt,
   * steht dafür ein. Bei einer Tafel, die vier Sekunden lang und nur dort
   * steht, wo der Spieler sie gerade selbst ausgelöst hat, ist das keine Frage;
   * bei Namensschildern, die dauernd hängen, wäre es eine.
   */
  front?: boolean;
}

const RES = 512;

/**
 * **In welcher Reihe eine Tafel mit `front` gezeichnet wird.**
 *
 * Gegen alles **Undurchsichtige** entscheidet die Zahl gar nichts: Das ist
 * längst gezeichnet, wenn eine durchsichtige Tafel an die Reihe kommt — dafür
 * sorgt schon `depthTest: false`. Sie entscheidet nur unter den Anzeigen
 * selbst, und die Küche hat welche: Balken und Warndreieck liegen auf 6
 * (`worlds/test/zones/kitchenGauge.quiet`). Eine Tafel eine Stufe darüber
 * heißt, dass dort, wo ein Balken und ein Wort einander überlappen, das Wort
 * gewinnt — der Balken sagt „gleich fertig", der Text sagt, was fertig ist.
 */
const FRONT_ORDER = 7;

/**
 * **Eine flache Tafel mit Text darauf** — für Schilder, Hinweise und Welttore.
 *
 * Gemalt wird auf eine Leinwand (`document.createElement('canvas')`) und als
 * Textur auf ein Quad gelegt; wer **Balken** statt Wörter braucht, ist bei
 * `worlds/test/zones/kitchenGauge.ts` besser aufgehoben.
 *
 * **Sie steht still, wenn man ihr nichts anderes sagt.** Wohin eine Tafel
 * sieht, entscheidet, wer sie aufstellt — das ist die Vorgabe, und für eine
 * Tafel an einer Wand ist sie richtig. Wer stattdessen ein Schild will, das
 * **dem Blick folgt**, setzt `face` in den Optionen: Dann richtet sich die
 * Tafel bei jedem Zeichnen zur Kamera aus, aus der gerade gezeichnet wird
 * (`ui/billboard.ts`). Das ist mehr als Bequemlichkeit — es ist die einzige
 * Art, die in zwei Ansichten gleichzeitig stimmt: Am Schirm steht die Kamera
 * von oben, in der Brille steht der Kopf woanders, und beide bekommen dieselbe
 * Tafel zu sich gedreht. Eine Drehung, die man von außen setzt (`rotation`),
 * wird beim nächsten Zeichnen überschrieben; beides zugleich geht nicht.
 */
export class TextPlane extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private options: TextPlaneOptions;

  constructor(options: TextPlaneOptions) {
    const height = options.height ?? options.width * 0.42;
    const canvas = document.createElement('canvas');
    canvas.width = RES;
    canvas.height = Math.round((RES * height) / options.width);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    super(
      new THREE.PlaneGeometry(options.width, height),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        toneMapped: false,
        // Siehe `front` in den Optionen: vor den Gegenständen statt zwischen
        // ihnen. `depthWrite` gehört dazu — eine Tafel, die keine Tiefe prüft,
        // aber welche schreibt, verdeckt hinterher Durchsichtiges, das gar
        // nicht hinter ihr liegt.
        ...(options.front ? { depthTest: false, depthWrite: false } : {}),
      }),
    );
    if (options.front) this.renderOrder = FRONT_ORDER;

    this.canvas = canvas;
    this.texture = texture;
    this.options = options;
    this.name = `text-plane:${options.title}`;
    this.geometry.computeBoundingBox();
    this.draw();
    // Eine Tafel ist selbst das Gezeichnete, keine Gruppe — `faceCamera` hängt
    // hier also genau an einem Ding, und das gleich hier beim Bauen.
    if (options.face) faceCamera(this, options.face === true ? undefined : options.face);
  }

  /** New words, and — for anything that changes with them — a new accent. */
  setText(title: string, body?: string, accent?: number): void {
    this.options = { ...this.options, title, body, accent: accent ?? this.options.accent };
    this.draw();
  }

  setHighlight(active: boolean): void {
    this.material.opacity = active ? 1 : 0.9;
    this.scale.setScalar(active ? 1.04 : 1);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }

  private draw(): void {
    const { title, body, accent = 0x4aa8ff, background, align = 'left' } = this.options;
    const ctx = this.canvas.getContext('2d')!;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const accentCss = `#${accent.toString(16).padStart(6, '0')}`;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, h - 8, 26);
    ctx.fillStyle = background ?? 'rgba(9, 14, 26, 0.86)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = accentCss;
    ctx.stroke();

    const centered = align === 'center';
    ctx.textAlign = centered ? 'center' : 'left';
    const x = centered ? w / 2 : 40;

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(h * 0.24)}px system-ui, sans-serif`;
    ctx.fillText(title, x, h * (body ? 0.36 : 0.58), w - 80);

    if (body) {
      // Lieber kleiner als abgeschnitten.
      //
      // Vorher hing die Schriftgröße allein an der Höhe der Tafel, und wer
      // nicht hineinpasste, bekam drei Punkte — auf einer Werte-Tafel heißt das
      // dann, dass genau die Zahl fehlt, für die man hergekommen ist. Jetzt
      // wird so weit verkleinert, bis alles hineinpasst; erst wenn selbst das
      // nicht reicht, wird gekürzt. Eine Zeile, die man kaum noch liest, ist
      // immer noch besser als eine, die nicht da ist.
      const top = h * 0.5;
      const room = h * 0.92 - top;
      const start = Math.round(h * 0.13);
      const floor = Math.max(11, Math.round(h * 0.055));
      ctx.fillStyle = '#9fb0d0';
      let fontSize = start;
      let lines: string[] = [];
      for (;;) {
        ctx.font = `400 ${fontSize}px system-ui, sans-serif`;
        lines = wrap(ctx, body, w - 80);
        if (lines.length * fontSize * 1.3 <= room || fontSize <= floor) break;
        fontSize -= 1;
      }
      const lineHeight = fontSize * 1.3;
      const maxLines = Math.max(1, Math.floor(room / lineHeight));
      lines.slice(0, maxLines).forEach((line, index) => {
        const isLast = index === maxLines - 1 && lines.length > maxLines;
        ctx.fillText(isLast ? `${line} …` : line, x, top + fontSize + index * lineHeight, w - 80);
      });
    }

    this.texture.needsUpdate = true;
  }
}

/**
 * Umbruch — und ein `\n` bricht, wo es steht.
 *
 * Ein Zeilenumbruch von Hand ist die einzige Möglichkeit, drei Zahlenreihen
 * untereinander zu stellen statt sie zu einem Absatz zu verkleben, in dem man
 * sie sucht.
 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}
