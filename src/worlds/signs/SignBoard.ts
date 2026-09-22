import * as THREE from 'three';
import { layoutSign, type LaidLine, type RunStyle, type SignLayout } from './signLayout';
import { parseSign } from './signMarkup';
import { clampSign, cssColor, fontPixels, scrollPixels, type SignSettings } from './signSettings';
import {
  clampScroll,
  newAutoScroll,
  stepAutoScroll,
  stickActive,
  stickScroll,
  type AutoScrollState,
} from './signScroll';
import { GRAB_TINT, GRAB_TINT_EMISSIVE } from '../../core/colors';
import { kaykitAtHeight, kaykitSkins } from '../../core/kaykitHeight';

/**
 * **Die Tafel selbst** — ein Schild, das man hinstellt und beschreibt.
 *
 * Alles, was hier passiert, passiert auf einer **Leinwand**: Der Text wird in
 * Blöcke zerlegt (`signMarkup.ts`), umgebrochen (`signLayout.ts`) und dann
 * gezeichnet. Kein HTML, kein DOM, kein `foreignObject` — und das ist keine
 * Sparsamkeit, sondern die einzige Bauart, die in der Brille funktioniert:
 * Eine Textur entsteht aus einer Leinwand, und eine Leinwand, in die ein
 * fremdes Bild ohne CORS gezeichnet wurde, ist „vergiftet" und lässt sich gar
 * nicht mehr als Textur hochladen. Deshalb wird jedes Bild mit
 * `crossOrigin = 'anonymous'` geladen, und was der Server nicht freigibt,
 * bekommt einen Platzhalter statt eines schwarzen Schildes.
 *
 * Die Tafel kennt weder Hände noch Netz. Sie kann drei Dinge: zeigen, rollen
 * und sich neu zeichnen, wenn sich etwas geändert hat. Wer sie aufstellt, wem
 * sie gehört und wer sie mitliest, steht in `SignRoom.ts`.
 */

/**
 * **Breite der Leinwand in Pixeln** — die Höhe folgt den Maßen der Tafel.
 *
 * Nach außen gegeben, damit ein Test nachrechnen kann, ob ein fester Aushang
 * auf seine Tafel passt (`worlds/test/zones/kitchenNotice.test.ts`): Ein Text,
 * den niemand rollen kann, weil die Tafel an der Wand hängt, muss ganz
 * daraufpassen — und das entscheidet sich auf dieser Leinwand.
 */
export const SIGN_CANVAS_W = 1024;
const CANVAS_W = SIGN_CANVAS_W;
/** Rand um den Text, als Anteil der Breite — aus demselben Grund nach außen. */
export const SIGN_PAD = 0.045;
const PAD = SIGN_PAD;
/** Dicke des Rahmens und wie weit die Schrift davor liegt. */
const FRAME = 0.03;
const FACE_Z = 0.018;
/** Dicke der Rückwand — sie schließt den Rahmen nach hinten. */
const BACK_T = 0.02;
/**
 * **Wie weit die Tafel nach hinten baut**, in Metern, von ihrem Mittelpunkt
 * aus gemessen.
 *
 * Eine ausgerechnete Zahl und kein Maß aus dem Bauch: Wer eine Tafel an eine
 * Wand hängt, muss wissen, wo ihre Rückseite liegt, sonst steckt sie in der
 * Wand und flackert (`worlds/test/zones/kitchenNotice.ts`).
 */
export const SIGN_BACK_DEPTH = 0.025 + BACK_T / 2;
/** Höhe des Pfostens unter der Tafel und der Halbmesser seines Fußes. */
const POST_H = 1.05;
const FOOT_R = 0.22;

/**
 * **Der Pfosten kommt aus dem Regal** — dieselbe Datei wie unter dem Schild
 * der Gitterwelt (`worlds/grid/fixtures/sign.ts`), nur kürzer.
 *
 * Hier stand ein Zylinder von 7 cm: ein Rohr, das eine Tafel trägt.
 * `dungeon/post.glb` ist in der Quelle 0,400 × 4,000 × 0,400 Einheiten groß
 * und mit dem Maßstab seines Pakets 2,00 m hoch — eingepasst auf die 1,05 m
 * dieses Pfostens wird daraus ein Vierkant von 0,105 m
 * (`core/kaykitHeight.kaykitAtHeight`, dort steht, warum gemessen und nicht
 * abgeschrieben wird).
 *
 * **Der Fuß bleibt, was er war.** Ein Pfosten aus dem Verlies steckt dort im
 * Boden; dieses Schild dagegen stellt jemand mitten in einen Raum und nimmt
 * es gleich wieder mit — ohne Teller darunter stünde es auf einer Kante. Der
 * Fuß ist also nicht das, was der Pfosten ersetzt, sondern das, was ihn
 * stehen lässt.
 */
const POST_MODEL = 'dungeon/post.glb';

/** Wie nah eine Hand an einen Traggriff kommen muss, um ihn zu fassen. */
export const SIGN_HANDLE_REACH = 0.19;

const _handle = new THREE.Vector3();

export interface SignBoardOptions {
  text: string;
  settings: SignSettings;
  mount: 'post' | 'wall';
  /**
   * **Traggriffe dran?** Vorgabe ja — ein Schild, das jemand hingestellt hat,
   * nimmt derselbe Jemand auch wieder mit (`SignRoom.ts`).
   *
   * `false` ist für die Tafel, die zur Welt gehört und nicht zum Spieler: der
   * Aushang an der Küchenwand (`worlds/test/zones/kitchenNotice.ts`). Zwei
   * türkise Griffe sagen in dieser Welt „hier anfassen", und das ist ein
   * Versprechen — wer es an eine angeschraubte Tafel hängt, lässt jemanden
   * daran ziehen, bis er aufgibt.
   */
  handles?: boolean;
}

/** Ein Bild, das das Schild zeigen soll — und wie weit es damit ist. */
interface SignImage {
  image: HTMLImageElement;
  ready: boolean;
  failed: boolean;
}

export class SignBoard extends THREE.Group {
  settings: SignSettings;
  text: string;
  mount: 'post' | 'wall';

  /** Die Fläche mit der Schrift — das, worauf ein Zeiger trifft. */
  readonly face: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly frame: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private readonly post: THREE.Group;
  private readonly back: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private readonly handles: THREE.Object3D[] = [];
  /** Der Pfosten aus dem Regal, sobald er da ist — sonst `null`. */
  private pole: THREE.Object3D | null = null;
  /** Seine Materialien: Die gehören dieser Kopie, seine Geometrie nicht. */
  private readonly poleSkins: THREE.Material[] = [];
  /** Ob die Tafel schon weg ist, während die Datei noch unterwegs war. */
  private disposed = false;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private layout: SignLayout = { lines: [], height: 0 };
  private auto: AutoScrollState = newAutoScroll();
  private offset = 0;
  private readonly images = new Map<string, SignImage>();
  private dirty = true;

  constructor(options: SignBoardOptions) {
    super();
    this.name = 'sign-board';
    this.settings = clampSign(options.settings);
    this.text = options.text;
    this.mount = options.mount;

    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = this.canvasHeight();
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;

    this.frame = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x2a3242, roughness: 0.7, metalness: 0.15 }),
    );
    this.frame.name = 'sign-frame';
    this.add(this.frame);

    this.face = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false }),
    );
    this.face.name = 'sign-face';
    this.add(this.face);

    // Die Rückwand für ein Schild an der Wand — sie schließt den Rahmen, damit
    // man von der Seite nicht durch das Schild in die Wand sieht.
    this.back = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, BACK_T),
      new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.9 }),
    );
    this.back.name = 'sign-back';
    this.add(this.back);

    this.post = new THREE.Group();
    this.post.name = 'sign-post';
    const metal = new THREE.MeshStandardMaterial({
      color: 0x8b93a4,
      roughness: 0.45,
      metalness: 0.5,
    });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(FOOT_R, FOOT_R * 1.15, 0.05, 20), metal);
    foot.position.y = -POST_H;
    this.post.add(foot);
    this.add(this.post);
    // Der Pfosten dazwischen kommt aus dem Regal und damit erst gleich
    // (`fillPost`) — der Teller darunter ist gebaut und sofort da.
    this.fillPost();

    // Die beiden Traggriffe: dieselbe türkise Farbe wie an jedem Werkzeug, und
    // sie heißt hier dasselbe wie dort — hier anfassen.
    for (const side of options.handles === false ? [] : [-1, 1]) {
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.12, 10),
        new THREE.MeshStandardMaterial({
          color: GRAB_TINT,
          roughness: 0.6,
          emissive: new THREE.Color(GRAB_TINT).multiplyScalar(GRAB_TINT_EMISSIVE),
        }),
      );
      handle.name = `sign-handle-${side < 0 ? 'left' : 'right'}`;
      handle.rotation.x = Math.PI / 2;
      handle.userData.side = side;
      this.add(handle);
      this.handles.push(handle);
    }

    this.applyShape();
    this.rebuild();
  }

  /** Wie hoch die Leinwand bei diesen Maßen ist. */
  private canvasHeight(): number {
    const ratio = this.settings.height / Math.max(0.05, this.settings.width);
    return Math.max(64, Math.round(CANVAS_W * ratio));
  }

  /** Neuer Text — die Blöcke werden neu gelesen und neu umgebrochen. */
  setText(text: string): void {
    if (this.text === text) return;
    this.text = text;
    this.rebuild();
  }

  /** Neues Aussehen. Ändert sich dabei die Größe, wächst auch die Tafel. */
  setSettings(settings: SignSettings): void {
    const next = clampSign(settings);
    const resized = next.width !== this.settings.width || next.height !== this.settings.height;
    this.settings = next;
    if (resized) {
      this.canvas.height = this.canvasHeight();
      this.texture.dispose();
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.texture.anisotropy = 8;
      this.face.material.map = this.texture;
      this.face.material.needsUpdate = true;
      this.applyShape();
    }
    this.rebuild();
  }

  setMount(mount: 'post' | 'wall'): void {
    this.mount = mount;
    this.applyShape();
  }

  /** Wie hoch der Text zusammen ist und wie viel davon zu sehen ist. */
  get limits(): { content: number; view: number } {
    return { content: this.layout.height, view: this.canvas.height - this.padding() * 2 };
  }

  /** Ob überhaupt etwas zu rollen da ist — das Menü sagt es dann dazu. */
  get scrollable(): boolean {
    const { content, view } = this.limits;
    return content > view + 1;
  }

  get scroll(): number {
    return this.offset;
  }

  setScroll(offset: number): void {
    const next = clampScroll(offset, this.limits);
    if (Math.abs(next - this.offset) < 0.01) return;
    this.offset = next;
    this.dirty = true;
  }

  /**
   * Ein Bild.
   *
   * `stick` ist der Daumen der Hand, die gerade auf dieses Schild zeigt — oder
   * 0. Solange er ausgelenkt ist, gewinnt er: Wer von Hand liest, will nicht
   * gleichzeitig weitergeschoben werden.
   */
  update(dt: number, stick = 0): void {
    const limits = this.limits;
    if (this.settings.manualScroll && stickActive(stick)) {
      const lineHeight = fontPixels(this.settings, CANVAS_W) * 1.32;
      this.setScroll(stickScroll(this.offset, stick, dt, lineHeight, limits));
      // Von Hand gelesen heißt: das Automatische fängt danach oben wieder an
      // zu warten statt sofort weiterzuschieben.
      this.auto = { offset: this.offset, wait: 1.5 };
    } else if (this.settings.autoScroll > 0) {
      this.auto = stepAutoScroll({ ...this.auto, offset: this.offset }, dt, {
        ...limits,
        speed: scrollPixels(this.settings, CANVAS_W),
      });
      this.setScroll(this.auto.offset);
    }
    if (this.dirty) this.draw();
  }

  /** Der Griff, an dem diese Hand das Schild anfassen könnte — oder `null`. */
  handleNear(point: THREE.Vector3): THREE.Object3D | null {
    for (const handle of this.handles) {
      handle.getWorldPosition(_handle);
      if (_handle.distanceToSquared(point) <= SIGN_HANDLE_REACH * SIGN_HANDLE_REACH) return handle;
    }
    return null;
  }

  dispose(): void {
    this.disposed = true;
    this.texture.dispose();
    // **Der Pfosten geht als Erstes und für sich**, und zwar aus dem Baum
    // heraus: Seine Geometrie gehört der Vorlage im Speicher und jeder
    // anderen Kopie (`core/kaykitModel.copyOf`, `userData.sharedAssets`) —
    // der Durchgang unten gäbe sie frei und nähme sie damit allen anderen
    // Schildern weg. Ihm gehören seine **Materialien**, und die müssen weg.
    this.pole?.removeFromParent();
    this.pole = null;
    for (const skin of this.poleSkins) skin.dispose();
    this.poleSkins.length = 0;
    this.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material?.dispose();
    });
    this.images.clear();
    this.removeFromParent();
  }

  // --- Aufbau ---------------------------------------------------------------

  /**
   * **Den Pfosten holen** — sofort nichts, später vielleicht etwas.
   *
   * Die Tafel wird **synchron** gebaut und ist sofort lesbar; das Modell kommt
   * über die Leitung. Bleibt es aus — in Jest, in einem Checkout ohne die
   * gekauften Pakete, auf einer abreißenden Leitung —, steht die Tafel auf
   * ihrem Fuß und sonst nichts, und man liest sie trotzdem
   * (`core/kaykitHeight.kaykitAtHeight` beantwortet alle drei Fälle mit
   * `null`, und das ist hier kein Zweig, sondern eine Zeile).
   *
   * Der Pfosten hängt **nach unten**: Der Ursprung dieser Gruppe ist die
   * Unterkante der Tafel (`applyShape`), sein Fuß steht auf dem Ursprung der
   * Gruppe, die der Helfer zurückgibt — also kommt er um seine ganze Höhe
   * nach unten und trifft dort den Teller.
   *
   * Und wer ein Schild hinstellt, nimmt es gleich wieder mit: Ist die Tafel
   * beim Eintreffen schon abgeräumt, gehen die Materialien der Kopie sofort
   * weg statt nie.
   */
  private fillPost(): void {
    void kaykitAtHeight(POST_MODEL, POST_H).then((pole) => {
      if (!pole) return;
      if (this.disposed) {
        for (const skin of kaykitSkins(pole)) skin.dispose();
        return;
      }
      pole.position.y = -POST_H;
      this.pole = pole;
      this.post.add(pole);
      for (const skin of kaykitSkins(pole)) this.poleSkins.push(skin);
    });
  }

  /** Die Maße der Teile aus den Maßen der Tafel. */
  private applyShape(): void {
    const { width, height } = this.settings;
    this.frame.geometry.dispose();
    this.frame.geometry = new THREE.BoxGeometry(width + FRAME * 2, height + FRAME * 2, 0.03);
    this.face.geometry.dispose();
    this.face.geometry = new THREE.PlaneGeometry(width, height);
    this.face.position.set(0, 0, FACE_Z);
    this.back.geometry.dispose();
    this.back.geometry = new THREE.BoxGeometry(width + FRAME * 2, height + FRAME * 2, BACK_T);
    this.back.position.set(0, 0, -(SIGN_BACK_DEPTH - BACK_T / 2));
    this.back.visible = this.mount === 'wall';
    this.post.visible = this.mount === 'post';
    this.post.position.y = -height / 2;
    this.handles.forEach((handle) => {
      const side = handle.userData.side as number;
      handle.position.set(side * (width / 2 + FRAME + 0.03), -height / 2 + 0.09, FACE_Z / 2);
    });
  }

  private padding(): number {
    return CANVAS_W * PAD;
  }

  /** Text neu lesen, neu umbrechen, neu zeichnen. */
  private rebuild(): void {
    const blocks = parseSign(this.text, { markdown: this.settings.markdown });
    const pad = this.padding();
    this.layout = layoutSign(blocks, {
      width: CANVAS_W - pad * 2,
      fontSize: fontPixels(this.settings, CANVAS_W),
      align: this.settings.align,
      measure: (text, style) => {
        this.ctx.font = fontOf(style);
        return this.ctx.measureText(text).width;
      },
      imageAspect: (url) => this.aspectOf(url),
    });
    this.offset = clampScroll(this.offset, this.limits);
    this.auto = newAutoScroll();
    this.dirty = true;
    this.draw();
  }

  /**
   * Das Seitenverhältnis eines Bildes — und der Anstoß, es zu laden.
   *
   * Der Umbruch fragt danach; solange die Antwort `null` ist, bekommt das Bild
   * ein 16:9-Loch. Ist es da, wird **einmal** neu umgebrochen. Ein fehlendes
   * Bild darf ein Schild nicht leer lassen: Dann steht dort ein Rahmen mit
   * seinem Alternativtext, und der Rest des Textes bleibt lesbar.
   */
  private aspectOf(url: string): number | null {
    const known = this.images.get(url);
    if (known) {
      if (!known.ready || known.failed) return null;
      return known.image.naturalWidth / Math.max(1, known.image.naturalHeight);
    }
    if (!/^(https?:|data:)/i.test(url)) {
      this.images.set(url, { image: new Image(), ready: false, failed: true });
      return null;
    }
    const image = new Image();
    const entry: SignImage = { image, ready: false, failed: false };
    this.images.set(url, entry);
    // Ohne diese Zeile wird die Leinwand beim Zeichnen „vergiftet" und die
    // Textur lässt sich nicht mehr hochladen — das Schild bliebe schwarz.
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      entry.ready = true;
      this.rebuild();
    };
    image.onerror = () => {
      entry.failed = true;
      this.dirty = true;
    };
    image.src = url;
    return null;
  }

  // --- Zeichnen -------------------------------------------------------------

  private draw(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const pad = this.padding();
    const settings = this.settings;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = cssColor(settings.background);
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, width - pad * 2, height - pad * 2);
    ctx.clip();
    ctx.translate(pad, pad - this.offset);

    const view = height - pad * 2;
    for (const line of this.layout.lines) {
      // Was ober- oder unterhalb liegt, wird nicht gezeichnet: Bei einem
      // langen Aushang ist das der Unterschied zwischen einem Bild und einem
      // Ruckler.
      if (line.y + line.height < this.offset - 40) continue;
      if (line.y > this.offset + view + 40) break;
      this.drawLine(line, width - pad * 2);
    }
    ctx.restore();

    this.drawScrollbar(width, pad, view);
    this.texture.needsUpdate = true;
    this.dirty = false;
  }

  private drawLine(line: LaidLine, width: number): void {
    const ctx = this.ctx;
    const settings = this.settings;

    if (line.rule) {
      ctx.strokeStyle = withAlpha(settings.color, 0.35);
      ctx.lineWidth = Math.max(1, line.height * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, line.y + line.height / 2);
      ctx.lineTo(width, line.y + line.height / 2);
      ctx.stroke();
      return;
    }

    if (line.image) {
      this.drawImage(line, width);
      return;
    }

    if (line.quote) {
      ctx.fillStyle = withAlpha(settings.color, 0.4);
      ctx.fillRect(0, line.y + 2, Math.max(2, line.height * 0.08), line.height - 4);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (const run of line.runs) {
      ctx.font = fontOf(run.style);
      ctx.fillStyle = toneColor(settings, run.style.tone);
      const y = line.y + line.baseline;
      ctx.fillText(run.text, run.x, y);
      if (run.link) {
        // Ein Link wird unterstrichen und nicht blau: Die Farbe gehört dem
        // Schild, die Unterstreichung dem Link.
        ctx.fillRect(
          run.x,
          y + run.style.size * 0.14,
          run.width,
          Math.max(1, run.style.size * 0.05),
        );
      }
    }
  }

  private drawImage(line: LaidLine, width: number): void {
    const ctx = this.ctx;
    const box = line.image!;
    const entry = this.images.get(box.url);
    if (entry?.ready && !entry.failed) {
      ctx.drawImage(entry.image, box.x, line.y, box.width, box.height);
      return;
    }
    // Platzhalter: ein Rahmen mit dem Alternativtext. „Lädt" und „geht nicht"
    // sehen verschieden aus — sonst wartet man auf ein Bild, das nie kommt.
    ctx.strokeStyle = withAlpha(this.settings.color, 0.35);
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, line.y, box.width, box.height);
    ctx.fillStyle = withAlpha(this.settings.color, 0.6);
    ctx.font = `400 ${Math.round(line.height * 0.12)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      entry?.failed ? `Bild nicht ladbar · ${box.alt || box.url}` : `Bild lädt · ${box.alt}`,
      box.x + box.width / 2,
      line.y + box.height / 2,
      Math.min(width, box.width) - 20,
    );
    ctx.textAlign = 'left';
  }

  /** Der Balken rechts — die einzige Auskunft darüber, wie viel noch kommt. */
  private drawScrollbar(width: number, pad: number, view: number): void {
    const content = this.layout.height;
    if (content <= view + 1) return;
    const ctx = this.ctx;
    const x = width - pad * 0.55;
    const barWidth = Math.max(4, pad * 0.16);
    ctx.fillStyle = withAlpha(this.settings.color, 0.15);
    ctx.fillRect(x, pad, barWidth, view);
    const size = Math.max(view * 0.06, view * (view / content));
    const travel = view - size;
    const at = pad + travel * (this.offset / Math.max(1, content - view));
    ctx.fillStyle = withAlpha(this.settings.color, 0.55);
    ctx.fillRect(x, at, barWidth, size);
  }
}

function fontOf(style: RunStyle): string {
  const family = style.mono ? 'ui-monospace, monospace' : 'system-ui, sans-serif';
  const weight = style.bold ? 700 : 400;
  const slant = style.italic ? 'italic ' : '';
  return `${slant}${weight} ${Math.round(style.size)}px ${family}`;
}

/**
 * Die drei Töne einer Tafel — **eine** Farbe, drei Stärken.
 *
 * Eine zweite Farbe zu erfinden ginge schief: Sie müsste zum Hintergrund
 * passen, und den stellt der Spieler ein. Also bekommt die Überschrift die
 * volle Farbe, der Fließtext ein wenig weniger und das Beiläufige (Code,
 * Zitat) deutlich weniger. Das reicht, damit eine Gliederung eine ist.
 */
function toneColor(settings: SignSettings, tone: RunStyle['tone']): string {
  if (tone === 'accent') return cssColor(settings.color);
  if (tone === 'muted') return withAlpha(settings.color, 0.62);
  return withAlpha(settings.color, 0.88);
}

function withAlpha(color: number, alpha: number): string {
  const value = Math.max(0, Math.round(color));
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}
