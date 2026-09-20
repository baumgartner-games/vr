import * as THREE from 'three';
import { createLighting } from '../worlds/shared/environment';
import { menuMiniature } from './menuMiniature';
import {
  PREVIEW_FILL,
  PREVIEW_SPIN,
  PreviewLedger,
  previewSlot,
  type PagePreviewLayer,
} from './previewGrid';
import type { MenuModelFactory } from './WristMenu';

/**
 * **Das Regal auf dem Telefon: in jeder Kachel das Modell selbst, langsam
 * gedreht.**
 *
 * In der Brille macht das Panel am Handgelenk es schon lange (`WristMenu.ts`,
 * `updatePreviews`); im Browserfenster standen dieselben Kacheln leer, weil
 * `PageMenu.ts` von `MenuEntry.preview` nichts wusste. Der Besitzer wollte
 * genau das, was er in der Brille sieht, auch auf dem Telefon: zwei Spalten,
 * und in jeder das Ding.
 *
 * ## Eine Leinwand, ein Durchgang — und kein Scherenschnitt
 *
 * Die naheliegende Bauweise wäre eine Leinwand je Kachel. Sie scheidet aus:
 * Ein Browser gibt nur eine Handvoll WebGL-Kontexte her, und ein Ordner hat
 * hier bis zu sechzig Kacheln. Also **eine** Leinwand über der ganzen Liste.
 *
 * Die zweite naheliegende Bauweise ist die aus dem Lehrbuch: `setScissorTest`
 * an, und je sichtbarer Kachel ein `setViewport`/`setScissor` und ein
 * `render`. Das sind acht bis zwölf Durchgänge je Bild, jeder mit eigenem
 * Löschen und eigenem Zustandswechsel — und sie kaufen etwas, das man hier
 * billiger bekommt.
 *
 * Hier steht deshalb die dritte: **eine Szene, eine orthografische Kamera in
 * Bildpunkten, ein einziger `render`.** Die Kamera spannt genau die Leinwand
 * auf (links 0, rechts die Breite, oben 0, unten die negative Höhe), und jedes
 * Modell steht an der Stelle seiner Kachel, auf deren Kantenlänge skaliert.
 * Dass ein Modell in seinem Fach bleibt, ist keine Schere, sondern eine
 * Rechnung (`PREVIEW_FILL`); dass eine halb weggescrollte Kachel oben sauber
 * abgeschnitten wird, besorgt der Rand der Leinwand, denn die liegt über dem
 * **sichtbaren** Ausschnitt der Liste und scrollt nicht mit. Orthografisch,
 * weil sonst die Kachel am Rand ihr Modell schräg von der Seite zeigte,
 * während die in der Mitte es von vorn zeigt — im Raster sieht man diesen
 * Unterschied sofort, und er sieht aus wie ein Fehler.
 *
 * ## Und sie läuft nur, wenn man hinsieht
 *
 * Dieselbe Disziplin wie in der Umkleide (`WardrobeMenu.ts`): Ein zweiter
 * Renderer, der im Hintergrund weiterläuft, kostet auf der Quest genau die
 * Bilder, die dem Spiel fehlen. Er entsteht deshalb beim Aufschlagen des
 * Menüs und ist beim Zumachen wieder weg, samt `dispose` und
 * `forceContextLoss`. Die Schleife läuft außerdem nicht, solange das Fenster
 * im Hintergrund liegt, und nicht in der Brille — dort zeigt das Handgelenk
 * die Modelle, und die Seite ist ohnehin zu.
 *
 * ## Geladen wird, was zu sehen ist
 *
 * Ein `IntersectionObserver` auf den Kacheln sagt, welche im Bild stehen; nur
 * für die wird überhaupt nach einem Modell gefragt. Was hinausscrollt, gibt
 * seines wieder her, und eine neue Seite gibt alle her (`PreviewLedger`).
 * Geometrie und Material gehören der Vorlage im Speicher
 * (`core/kaykitModel.ts`) und werden **nicht** freigegeben — weggeräumt wird
 * nur der Rahmen.
 */
export class PagePreviews implements PagePreviewLayer {
  private readonly ledger = new PreviewLedger();
  /** Die gebauten Modelle, nach Vorschau-Id. */
  private readonly models = new Map<string, THREE.Object3D>();
  /** Die Kacheln der offenen Seite, nach Vorschau-Id. */
  private readonly boxes = new Map<string, HTMLElement>();
  /** Welche davon der Beobachter gerade im Bild sieht. */
  private readonly seen = new Set<string>();
  private readonly watched = new Set<HTMLElement>();

  private stage: HTMLElement | null = null;
  private list: HTMLElement | null = null;
  private onChange: (() => void) | null = null;
  private watcher: IntersectionObserver | null = null;

  private view: PreviewStage | null = null;
  private open = false;
  private presenting = false;

  private readonly clock = new THREE.Clock();
  private frame = 0;
  /** Sekunden seit dem Aufschlagen — die Uhr des Verzeichnisses. */
  private now = 0;
  private spin = 0;
  /** Ein Modell kam an: Die Seite soll neu zeichnen, aber nur einmal je Bild. */
  private dirty = false;

  constructor(private readonly factory: MenuModelFactory) {}

  mount(stage: HTMLElement, list: HTMLElement, onChange: () => void): void {
    this.stage = stage;
    this.list = list;
    this.onChange = onChange;
  }

  /**
   * Die Kacheln der Seite, frisch nach jedem Neubau der Liste.
   *
   * `PageMenu` tauscht beim Neuzeichnen nur die Knoten, die sich wirklich
   * geändert haben — also wird hier auch nur das dem Beobachter gemeldet, was
   * neu ist oder weg. Ein Beobachter, der bei jedem Bild der Bildraten-Zeile
   * neu aufgesetzt würde, meldete seine Kacheln jedes Mal erneut und ließe das
   * Raster flackern.
   */
  observe(page: string, boxes: HTMLElement[]): void {
    for (const id of this.ledger.turnTo(page)) this.release(id);

    this.boxes.clear();
    for (const box of boxes) {
      const id = box.dataset['preview'];
      if (id) this.boxes.set(id, box);
    }
    for (const id of [...this.seen]) if (!this.boxes.has(id)) this.seen.delete(id);

    const watcher = this.watcher;
    if (!watcher) return;
    const fresh = new Set(boxes);
    for (const box of this.watched) {
      if (!fresh.has(box)) {
        watcher.unobserve(box);
        this.watched.delete(box);
      }
    }
    for (const box of fresh) {
      if (this.watched.has(box)) continue;
      watcher.observe(box);
      this.watched.add(box);
    }
  }

  has(id: string): boolean {
    return this.ledger.has(id);
  }

  setOpen(open: boolean): void {
    if (open === this.open) return;
    this.open = open;
    this.sync();
  }

  setPresenting(on: boolean): void {
    if (on === this.presenting) return;
    this.presenting = on;
    this.sync();
  }

  dispose(): void {
    this.open = false;
    this.stop();
    this.watcher?.disconnect();
    this.watcher = null;
    this.watched.clear();
    this.boxes.clear();
    this.seen.clear();
  }

  // --- auf und zu -----------------------------------------------------------

  /** Läuft, solange das Menü offen ist, das Fenster vorn liegt und keine Brille auf ist. */
  private sync(): void {
    if (this.open && !this.presenting && visible()) this.start();
    else this.stop();
  }

  private start(): void {
    if (this.view) return;
    const stage = this.stage;
    const list = this.list;
    if (!stage || !list) return;
    try {
      // Erst fragen, dann bauen: three zeichnet seit r15x nur noch auf WebGL 2,
      // und ein Renderer, der das im Konstruktor herausfindet, schreibt dabei
      // eine Fehlermeldung in die Konsole, die hier kein Fehler ist.
      if (typeof WebGL2RenderingContext === 'undefined') throw new Error('kein WebGL 2');
      this.view = new PreviewStage(stage);
    } catch {
      // Kein Kontext, kein Bild — und das ist kein Grund, das Menü nicht zu
      // zeigen. In der Kachel bleibt dann die Ikone stehen, die sie ohne
      // Vorschau ohnehin hätte.
      this.view = null;
      return;
    }
    if (typeof IntersectionObserver !== 'undefined' && !this.watcher) {
      // Der Ausschnitt der Liste ist die Bühne: Was darin steht, wird geladen,
      // und mehr nicht. Ohne diesen Beobachter holte ein Ordner mit sechzig
      // Kacheln sechzig Dateien, von denen man vier sieht.
      this.watcher = new IntersectionObserver((entries) => this.onSeen(entries), { root: list });
      for (const box of this.boxes.values()) {
        this.watcher.observe(box);
        this.watched.add(box);
      }
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    this.clock.getDelta();
    this.frame = requestAnimationFrame(this.loop);
  }

  private stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (!this.view) return;
    for (const id of [...this.models.keys()]) this.release(id);
    // Eine leere Seitenkennung: Beim nächsten Aufschlagen wird ohnehin alles
    // neu gefragt, und ein Verzeichnis ohne Modelle darf nichts mehr halten.
    this.ledger.turnTo('');
    this.view.dispose();
    this.view = null;
  }

  private readonly onVisibility = (): void => this.sync();

  private onSeen(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const id = (entry.target as HTMLElement).dataset['preview'];
      if (!id) continue;
      if (entry.isIntersecting) this.seen.add(id);
      else this.seen.delete(id);
    }
  }

  // --- das Bild -------------------------------------------------------------

  private readonly loop = (): void => {
    this.frame = requestAnimationFrame(this.loop);
    const view = this.view;
    const list = this.list;
    if (!view || !list) return;

    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.now += dt;
    this.spin = (this.spin + dt * PREVIEW_SPIN) % (Math.PI * 2);
    if (!view.fit()) return;

    const bounds = list.getBoundingClientRect();
    const shown: string[] = [];
    for (const id of this.candidates()) {
      const box = this.boxes.get(id);
      if (!box) continue;
      // Der Beobachter meldet verzögert; das Rechteck lügt nicht. Es
      // entscheidet, und der Beobachter hält bloß die Liste der Anwärter kurz.
      const slot = previewSlot(bounds, box.getBoundingClientRect());
      if (!slot) continue;
      shown.push(id);
      const model = this.model(id);
      if (!model) continue;
      model.position.set(slot.x, -slot.y, 0);
      model.scale.setScalar(slot.size * PREVIEW_FILL);
      model.rotation.y = this.spin;
    }
    for (const id of this.ledger.keepOnly(shown)) this.release(id);

    view.render();

    // **Nach** dem Bild und höchstens einmal: Die Seite zeichnet die Kachel
    // neu, deren Modell angekommen ist, und lässt dabei ihre Ikone weg.
    if (!this.dirty) return;
    this.dirty = false;
    this.onChange?.();
  };

  /** Wen der Beobachter im Bild sieht — oder, wo es keinen gibt, alle. */
  private candidates(): Iterable<string> {
    return this.watcher ? this.seen : this.boxes.keys();
  }

  /**
   * Das Modell zu einer Id — gebaut beim ersten Hinsehen und dann behalten,
   * oder `null`, solange es keines gibt.
   *
   * **`null` wird nicht gemerkt**: Die Fabrik antwortet damit auch dann, wenn
   * die Datei gerade erst geholt wird. Gefragt wird deshalb wieder, aber
   * höchstens alle `PREVIEW_RETRY` (`previewGrid.ts`).
   */
  private model(id: string): THREE.Object3D | null {
    const known = this.models.get(id);
    if (known) return known;
    if (!this.ledger.due(id, this.now)) return null;
    const source = this.factory(id);
    if (!source) {
      this.ledger.missed(id, this.now);
      return null;
    }
    // Auf Kantenlänge 1 normiert; die Kachel skaliert es danach auf ihre
    // Bildpunkte. Dieselbe Id ist in einer Zeile kleiner als in einer Kachel,
    // und so muss sie dafür nicht zweimal abgeschrieben werden.
    const model = menuMiniature(source, 1);
    this.view?.scene.add(model);
    this.models.set(id, model);
    this.ledger.got(id);
    this.dirty = true;
    return model;
  }

  /** Nur der Rahmen: Geometrie und Material gehören der Vorlage im Speicher. */
  private release(id: string): void {
    this.models.get(id)?.removeFromParent();
    this.models.delete(id);
  }
}

/** Ob das Fenster gerade vorn liegt — im Test gibt es kein `document`. */
function visible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

/**
 * Die Leinwand über der Liste: Renderer, Licht und eine Kamera, die in
 * Bildpunkten rechnet.
 *
 * Die Kamera steht im Ursprung und schaut nach −z; ihr Rahmen ist die
 * Leinwand, gemessen von links oben. Ein Modell an der Stelle `(x, −y)` steht
 * damit genau dort, wo die Kachel im DOM liegt — keine Umrechnung, keine
 * Perspektive, kein Rechenweg, den man beim Lesen nachvollziehen müsste.
 */
class PreviewStage {
  readonly scene = new THREE.Scene();

  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1000, 1000);
  private readonly lighting: THREE.Group;
  private size = 0;

  constructor(private readonly stage: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'pmenu__canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.append(this.renderer.domElement);

    // Dasselbe Licht wie im Spiel: Ein Fass im Menü soll aussehen wie das
    // Fass, das man gleich in der Hand hält.
    this.lighting = createLighting(1);
    this.scene.add(this.lighting);
  }

  /**
   * Die Leinwand auf die Größe der Liste bringen — und sagen, ob es überhaupt
   * etwas zu zeichnen gibt. Ein Blatt, das gerade aufklappt, ist null hoch.
   */
  fit(): boolean {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    if (width <= 0 || height <= 0) return false;
    const stamp = width * 4096 + height;
    if (stamp === this.size) return true;
    this.size = stamp;
    this.renderer.setSize(width, height, false);
    this.camera.right = width;
    this.camera.bottom = -height;
    this.camera.updateProjectionMatrix();
    return true;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.lighting.removeFromParent();
    this.renderer.domElement.remove();
    this.renderer.dispose();
    // Der Kontext wird knapp, wenn eine Seite ihn mehrmals aufmacht: `dispose`
    // allein gibt ihn nicht überall zurück.
    this.renderer.forceContextLoss();
  }
}
