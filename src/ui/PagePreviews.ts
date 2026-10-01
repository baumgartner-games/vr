import * as THREE from 'three';
import { createLighting } from '../worlds/shared/environment';
import { menuMiniature } from './menuMiniature';
import { PageDetail, type MenuClipSource } from './PageDetail';
import {
  PREVIEW_FILL,
  PREVIEW_YAW,
  PreviewLedger,
  previewSheet,
  previewWindow,
  previewSlot,
  type DetailRequest,
  type DetailView,
  type ListView,
  type PagePreviewLayer,
  type Sheet,
} from './previewGrid';
import type { MenuModelFactory } from './WristMenu';

/**
 * **Das Regal auf dem Telefon: in jeder Kachel das Modell selbst, schräg von
 * vorn und stehend** (`PREVIEW_YAW`; bis September 2026 drehte es sich).
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
 * hier bis zu sechzig Kacheln. Also **eine** Leinwand für die ganze Liste.
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
 * Rechnung (`PREVIEW_FILL`). Orthografisch, weil sonst die Kachel am Rand ihr
 * Modell schräg von der Seite zeigte, während die in der Mitte es von vorn
 * zeigt — im Raster sieht man diesen Unterschied sofort, und er sieht aus wie
 * ein Fehler.
 *
 * ## Die Leinwand scrollt mit — sonst laufen die Modelle nach
 *
 * Zuerst hing sie **über** dem sichtbaren Ausschnitt, fest im Rahmen, und
 * jedes Bild rechnete neu, wo jede Kachel gerade liegt. Das ist die Bauweise,
 * die beim Scrollen wackelt, und zwar unvermeidbar: Gescrollt wird im
 * Compositor, gerechnet im Hauptstrang. Zwischen dem Bild, in dem die
 * Rechtecke gelesen wurden, und dem Bild auf dem Schirm ist der Inhalt schon
 * weiter — die Kacheln stehen an der neuen Stelle, die Modelle an der alten.
 * Gemessen wurde das mit einem Screencast: ein Bild, zwei Wahrheiten, über
 * hundert Bildpunkte auseinander.
 *
 * Also liegt die Leinwand jetzt **im** scrollenden Kasten und wird von
 * derselben Hand bewegt wie die Kacheln. Damit kann nichts mehr nachlaufen:
 * Der Compositor schiebt beides zusammen, ganz ohne JavaScript. Sie ist dabei
 * nicht so hoch wie der ganze Inhalt (sechzig Kacheln wären siebentausend
 * Bildpunkte und ein Zeichenpuffer, den kein Telefon hergibt), sondern ein
 * **Blatt**: der sichtbare Ausschnitt mit Rand, im Inhalt verankert und nur
 * ab und zu umgehängt (`previewSheet`). Abgeschnitten wird jetzt vom Kasten
 * selbst — dieselbe Kante, die auch die Kachel abschneidet.
 *
 * ## Und sie läuft nur, wenn man hinsieht
 *
 * Dieselbe Disziplin wie bei der Figur im Inventar (`previewScene.ts`): Ein zweiter
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
 *
 * ## Und entladen wird, was weit weg ist
 *
 * Gemeldet: _„Die App stürzt ab wenn ich im Möbel Katalog zu weit /lange
 * scrollen … dass im Katalog nur die angezeigten und gleiche Anzahl vor und
 * nach angezeigten im Katalog gerendert werden und alle anderen entladen."_
 * Weggeräumt wurde bis dahin nur der Rahmen: Die Leinwand behielt Geometrie
 * und Texturen jedes Modells, das je darauf stand, und der Speicher jede
 * Vorlage. Jetzt gilt ein **Fenster** (`previewWindow`): die sichtbaren
 * Kacheln und gleich viele davor und danach. Die daneben werden schon geholt
 * (unsichtbar), alles außerhalb geht — mit seinen Materialien, seiner Vorlage
 * (`forget`, `core/kaykitModel.forgetKaykitModel`) und, nach `RECYCLE_AFTER`
 * entladenen Modellen, mit der ganzen Leinwand: Sie wird neu aufgesetzt, und
 * was die Grafikkarte von den alten Modellen noch hielt, ist weg.
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

  /** Der scrollende Kasten: Er trägt die Leinwand und die Kacheln. */
  private box: HTMLElement | null = null;
  private onChange: (() => void) | null = null;
  private watcher: IntersectionObserver | null = null;

  private view: PreviewStage | null = null;
  /** Wo das Blatt gerade im Inhalt hängt — `null`, solange keines liegt. */
  private sheet: Sheet | null = null;
  private open = false;
  private presenting = false;

  private readonly clock = new THREE.Clock();
  private frame = 0;
  /** Sekunden seit dem Aufschlagen — die Uhr des Verzeichnisses. */
  private now = 0;
  /** Ein Modell kam an: Die Seite soll neu zeichnen, aber nur einmal je Bild. */
  private dirty = false;
  /** Wie viele Modelle seit dem letzten Neuaufsetzen der Leinwand entladen wurden. */
  private released = 0;

  constructor(
    private readonly factory: MenuModelFactory,
    /** Woher die Bewegungen kommen — ohne Quelle bleibt das Feld leer. */
    private readonly clips: MenuClipSource | null = null,
    /** Wem gesagt wird, dass ein Modell entladen ist — die Welt vergisst die Vorlage. */
    private readonly forget: ((id: string) => void) | null = null,
  ) {}

  /**
   * **Die große Vorschau der Detailseite** (`ui/PageDetail.ts`).
   *
   * Sie hat ihre **eigene** Leinwand und nicht die des Rasters, und das ist
   * kein Versehen: Das Raster rechnet orthografisch in Bildpunkten und stellt
   * sechzig Dinge nebeneinander, die Detailseite perspektivisch in Metern und
   * stellt eines hin, um das man herumfährt. Zwei Aufgaben, zwei Kameras —
   * und nie beide zugleich, denn die Seite hält das Raster solange an
   * (`ui/PageMenu.syncPreviews`).
   */
  detail(request: DetailRequest): DetailView | null {
    // Erst fragen, dann bauen — dieselbe Vorsicht wie beim Raster: three
    // zeichnet nur noch auf WebGL 2, und wer das im Konstruktor herausfindet,
    // schreibt dabei eine Fehlermeldung, die hier kein Fehler ist.
    if (typeof WebGL2RenderingContext === 'undefined') return null;
    try {
      return new PageDetail(
        request.host,
        request.id,
        this.factory,
        this.clips,
        // Weitergereicht als Aufruf und nicht als Zeiger: Eine Methode, die
        // von ihrem Objekt getrennt herumgereicht wird, findet ihr `this`
        // später nicht wieder (`eslint.config.js`, `unbound-method`).
        (facts) => request.onFacts(facts),
      );
    } catch {
      // Kein Kontext, kein Bild — und das ist kein Grund, den Steckbrief nicht
      // zu zeigen. Die Zahlen darunter stehen auch ohne Leinwand da.
      return null;
    }
  }

  mount(box: HTMLElement, onChange: () => void): void {
    this.box = box;
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
    // **Gehorcht wird, solange das Menü offen ist** — und nicht nur, solange
    // die Schleife läuft. Vorher hing der Zuhörer an `start`/`stop`: Ging das
    // Fenster in den Hintergrund, hielt `stop` an und meldete dabei genau den
    // Zuhörer ab, der beim Zurückkommen wieder starten sollte. Gemeldet: _„wenn
    // ich mal die seite in den hintergrund gehe und dann nach vorne komme […]:
    // die vorschauen laden nicht korrekt"_ — es blieben die Ikonen stehen.
    if (typeof document !== 'undefined') {
      if (open) document.addEventListener('visibilitychange', this.onVisibility);
      else document.removeEventListener('visibilitychange', this.onVisibility);
    }
    this.sync();
  }

  setPresenting(on: boolean): void {
    if (on === this.presenting) return;
    this.presenting = on;
    this.sync();
  }

  dispose(): void {
    this.open = false;
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', this.onVisibility);
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
    const box = this.box;
    if (!box) return;
    try {
      // Erst fragen, dann bauen: three zeichnet seit r15x nur noch auf WebGL 2,
      // und ein Renderer, der das im Konstruktor herausfindet, schreibt dabei
      // eine Fehlermeldung in die Konsole, die hier kein Fehler ist.
      if (typeof WebGL2RenderingContext === 'undefined') throw new Error('kein WebGL 2');
      this.view = new PreviewStage(box);
    } catch {
      // Kein Kontext, kein Bild — und das ist kein Grund, das Menü nicht zu
      // zeigen. In der Kachel bleibt dann die Ikone stehen, die sie ohne
      // Vorschau ohnehin hätte.
      this.view = null;
      return;
    }
    if (typeof IntersectionObserver !== 'undefined' && !this.watcher) {
      // Der sichtbare Ausschnitt des Kastens ist die Bühne: Was darin steht,
      // wird geladen, und mehr nicht. Ohne diesen Beobachter holte ein Ordner
      // mit sechzig Kacheln sechzig Dateien, von denen man vier sieht.
      this.watcher = new IntersectionObserver((entries) => this.onSeen(entries), { root: box });
      for (const cell of this.boxes.values()) {
        this.watcher.observe(cell);
        this.watched.add(cell);
      }
    }
    this.clock.getDelta();
    this.frame = requestAnimationFrame(this.loop);
  }

  private stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (!this.view) return;
    for (const id of [...this.models.keys()]) this.release(id);
    // Eine leere Seitenkennung: Beim nächsten Aufschlagen wird ohnehin alles
    // neu gefragt, und ein Verzeichnis ohne Modelle darf nichts mehr halten.
    this.ledger.turnTo('');
    this.view.dispose();
    this.view = null;
    this.sheet = null;
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
    if (this.released >= RECYCLE_AFTER) this.recycle();
    const stage = this.view;
    const box = this.box;
    if (!stage || !box) return;

    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.now += dt;

    const view = measure(box);
    // Das Blatt zuerst: Wo es hängt, entscheidet, wo jedes Modell darauf
    // steht — und beides geschieht in **diesem** Bild, also sieht niemand,
    // dass es überhaupt umgehängt wurde.
    const sheet = previewSheet(view, this.sheet);
    this.sheet = sheet;
    if (!stage.fit(view, sheet)) return;

    const shown: string[] = [];
    for (const id of this.candidates()) {
      const cell = this.boxes.get(id);
      if (!cell) continue;
      // Der Beobachter meldet verzögert; das Rechteck lügt nicht. Es
      // entscheidet, und der Beobachter hält bloß die Liste der Anwärter kurz.
      const slot = previewSlot(view, sheet, cell.getBoundingClientRect());
      if (!slot) continue;
      shown.push(id);
      const model = this.model(id);
      if (!model) continue;
      model.visible = true;
      model.position.set(slot.x, -slot.y, 0);
      model.scale.setScalar(slot.size * PREVIEW_FILL);
      model.rotation.y = PREVIEW_YAW;
    }
    // Die Nachbarn im Fenster werden schon geholt, aber nicht gezeichnet.
    const keep = previewWindow([...this.boxes.keys()], shown);
    const visible = new Set(shown);
    for (const id of keep) {
      if (visible.has(id)) continue;
      const model = this.model(id);
      if (model) model.visible = false;
    }
    for (const id of this.ledger.keepOnly(keep)) this.release(id);

    stage.render();

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

  /**
   * Nur der Rahmen: Geometrie und Material gehören der Vorlage im Speicher.
   *
   * Die Seite zeichnet danach neu, denn in der Kachel steht jetzt wieder
   * nichts — und was nichts zeigt, soll seine Ikone zurückbekommen. Sonst
   * bliebe ein leeres Quadrat stehen, sobald man einmal daran vorbeigescrollt
   * ist.
   */
  private release(id: string): void {
    const model = this.models.get(id);
    if (!model) return;
    model.removeFromParent();
    // Die Materialien der Kachel sind Kopien (`core/kaykitModel.copyOf`) —
    // freigeben kostet höchstens ein neues Übersetzen, wenn sie wiederkommt.
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const skin of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        skin.dispose();
    });
    this.models.delete(id);
    this.forget?.(id);
    this.released++;
    this.dirty = true;
  }

  /**
   * **Die Leinwand neu aufsetzen** — die einzige Art, der Grafikkarte zu
   * sagen, dass sie Geometrie und Texturen der entladenen Modelle vergessen
   * darf: Sie gehören den Vorlagen, und die teilt diese Leinwand mit dem
   * Spiel. Wer noch im Fenster steht, zieht mit auf die neue um.
   */
  private recycle(): void {
    this.released = 0;
    const old = this.view;
    const box = this.box;
    if (!old || !box) return;
    let fresh: PreviewStage;
    try {
      fresh = new PreviewStage(box);
    } catch {
      return;
    }
    for (const model of this.models.values()) fresh.scene.add(model);
    old.dispose();
    this.view = fresh;
    this.sheet = null;
  }
}

/**
 * **Nach wie vielen entladenen Modellen die Leinwand neu aufgesetzt wird** —
 * genug, dass es beim gemächlichen Scrollen selten geschieht, wenig genug, dass
 * ein Telefon die Texturen dazwischen tragen kann.
 */
export const RECYCLE_AFTER = 40;

/** Ob das Fenster gerade vorn liegt — im Test gibt es kein `document`. */
function visible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

/**
 * **Den scrollenden Kasten ausmessen** — einmal je Bild, und alles, was die
 * Rechnung braucht, aus derselben Ablesung.
 *
 * `clientTop`/`clientLeft` sind die Rahmenbreite: Die Leinwand liegt an der
 * **Innenkante**, und dort fangen auch die Inhaltskoordinaten an. `clientWidth`
 * lässt außerdem die Rollleiste weg, die auf dem Schirm neben der Liste steht.
 */
function measure(box: HTMLElement): ListView {
  const rect = box.getBoundingClientRect();
  return {
    rect: {
      left: rect.left + box.clientLeft,
      top: rect.top + box.clientTop,
      width: box.clientWidth,
      height: box.clientHeight,
    },
    scrollTop: box.scrollTop,
    content: box.scrollHeight,
  };
}

/**
 * Das Blatt im scrollenden Kasten: Renderer, Licht und eine Kamera, die in
 * Bildpunkten rechnet.
 *
 * Die Kamera steht im Ursprung und schaut nach −z; ihr Rahmen ist die
 * Leinwand, gemessen von links oben. Ein Modell an der Stelle `(x, −y)` steht
 * damit genau dort, wo die Kachel auf dem Blatt liegt — keine Umrechnung,
 * keine Perspektive, kein Rechenweg, den man beim Lesen nachvollziehen müsste.
 */
class PreviewStage {
  readonly scene = new THREE.Scene();

  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1000, 1000);
  private readonly lighting: THREE.Group;
  private width = 0;
  private height = 0;
  private top = Number.NaN;

  constructor(box: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'pmenu__canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    // **In** den Kasten, nicht darüber: Von hier aus schiebt der Compositor
    // sie mit dem Inhalt, und kein Modell kann seiner Kachel hinterherlaufen.
    box.append(this.renderer.domElement);

    // Dasselbe Licht wie im Spiel: Ein Fass im Menü soll aussehen wie das
    // Fass, das man gleich in der Hand hält.
    this.lighting = createLighting(1);
    this.scene.add(this.lighting);
  }

  /**
   * Die Leinwand auf die Größe des Blattes bringen und sie dorthin hängen, wo
   * das Blatt im Inhalt liegt — und sagen, ob es überhaupt etwas zu zeichnen
   * gibt. Eine Seite, die gerade aufklappt, ist null hoch.
   *
   * Gehängt wird mit `transform` und nicht mit `top`: Das ist eine Eigenschaft
   * der Ebene, die der Compositor ohnehin führt, und kostet damit kein neues
   * Layout — dieselbe Ebene, die er beim Scrollen verschiebt.
   */
  fit(view: ListView, sheet: Sheet): boolean {
    const width = view.rect.width;
    if (width <= 0 || sheet.height <= 0) return false;
    if (width !== this.width || sheet.height !== this.height) {
      this.width = width;
      this.height = sheet.height;
      this.renderer.setSize(width, sheet.height, false);
      this.renderer.domElement.style.width = `${width}px`;
      this.renderer.domElement.style.height = `${sheet.height}px`;
      this.camera.right = width;
      this.camera.bottom = -sheet.height;
      this.camera.updateProjectionMatrix();
    }
    if (sheet.top !== this.top) {
      this.top = sheet.top;
      this.renderer.domElement.style.transform = `translate3d(0, ${sheet.top}px, 0)`;
    }
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
