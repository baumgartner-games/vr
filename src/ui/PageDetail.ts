import * as THREE from 'three';
import { createLighting } from '../worlds/shared/environment';
import { wheelPixels, wheelStep } from '../core/wheelZoom';
import { DETAIL_POSE, detailDrag, detailGutter, detailZoom, type DetailPose } from './detailDrag';
import { CHEF_HEIGHT } from '../core/chefFit';
import { DETAIL_OVERLAY, DETAIL_PLAYER, PREVIEW_RETRY } from './previewGrid';
import type { DetailCells, DetailFacts, DetailOptions, DetailView } from './previewGrid';
import type { MenuModelFactory } from './XRMenu';

/**
 * **Ein Stück aus dem Regal, groß und zum Anfassen.**
 *
 * Die Kachel im Katalog zeigt das Modell (`ui/PagePreviews.ts`), und sie zeigt
 * es klein, gedreht und ohne Frage zurück. Gewünscht war eine Seite dahinter:
 * „Name des Assets, darunter voll das 3D-Modell, welches ich durch Swipen
 * drehen kann, Pinch zum Zoomen; seitlich sollte etwas Platz sein, da ich
 * runterscrollen möchte in dem Menü, um darunter weitere Infos zu sehen
 * (Grid-Boden in der Vorschau anzeigen, Bounding Box anzeigen, bei Charakteren
 * will ich die Animation auswählen können)."
 *
 * Genau das steht hier — der Teil davon, der three.js ist. Den Rahmen, die
 * Schalter und den Steckbrief baut die Seite (`ui/PageMenu.ts`); sie reicht
 * nur einen Kasten herüber und bekommt eine Steuerung zurück
 * (`previewGrid.DetailView`).
 *
 * ## Gedreht wird die Kamera und nicht das Modell
 *
 * Das ist der Unterschied zwischen einer Vorschau, unter der ein Gitterboden
 * liegt, und einer, bei der der Boden mitkippt. Das Modell steht still, wie es
 * in der Welt stünde; die Kamera fährt um seinen Mittelpunkt herum (Drehung
 * um die Hochachse, Kippung gedeckelt, Abstand als Zoom). Damit bleibt das
 * Gitter waagerecht, die Hülle achsenparallel — und beides sagt dann wirklich
 * etwas über das Ding aus.
 *
 * ## Die Mitte dreht, der Saum scrollt
 *
 * Auf einem Telefon liegen zwei Gesten übereinander: Wischen dreht, Wischen
 * scrollt. Ein Finger kann nur eine davon meinen, und ein Modell, das die
 * ganze Breite für sich nimmt, ist ein Menü, aus dem man nicht mehr
 * herauskommt. Also gehört dem Modell nur die **Mitte**: ein Kasten mit
 * `touch-action: none`, links und rechts ein Saum von `DETAIL_GUTTER`, der dem
 * Browser gehört (`ui/detailDrag.ts`). Wer weiterlesen will, wischt am Rand.
 *
 * ## Und sie läuft nur, solange sie zu sehen ist
 *
 * Dieselbe Disziplin wie im Raster: Die Schleife entsteht mit der Seite und
 * ist mit ihr wieder weg, samt `dispose` und `forceContextLoss`; das Raster
 * hält solange still (`ui/PageMenu.syncPreviews`), damit nie zwei
 * WebGL-Kontexte für dieselbe Seite offen sind.
 */

/** Wie weit die Kamera aufmacht. Eng genug, dass nichts perspektivisch kippt. */
const FOV = 32;

/** Wie viel Luft um das Ding bleibt, wenn der Zoom auf eins steht. */
const MARGIN = 1.25;

/** Wie viel eine Raste am Rad zoomt. */
const WHEEL_FACTOR = 1.2;

/** Die Farbe des Gitterbodens und die der Hülle — dieselbe Familie wie das Regal. */
const FLOOR_COLOR = 0x5d7898;
const FLOOR_MID = 0x8fb4d8;
const BOUNDS_COLOR = 0x7fd6a6;

/** Die Zellen der Detailseite — dieselben Farben wie unter dem Modell (`elementCellsOverlay`). */
const CELL_SIZE = 0.5;
const CELLS_BLOCKED = 0xe0463c;
const CELLS_LINE = 0x8a93a3;
const CELLS_TILE = 0xd0d6e0;
const CELLS_FOOT = 0xf0b44a;
const CELLS_FRONT = 0x46b86a;
/** Wie viele Zellen Rand um die Grundfläche zum Antippen bleiben. */
const CELLS_MARGIN = 2;
/** So durchsichtig ist das Ding, solange man darunter Zellen tippt. */
const GHOST_OPACITY = 0.22;
/** Weiter als so viele Bildpunkte gewischt ist kein Tippen mehr. */
const TAP_SLOP = 10;
/** So viel Luft bleibt zwischen dem Ding und der Spielfigur daneben, in Metern. */
const PLAYER_GAP = 0.4;

/**
 * **Woher die Bewegungen zu einer Vorschau-Id kommen.**
 *
 * `height` ist die Höhe des Modells in den Maßen seiner **Quelle** und sagt,
 * welches der beiden Skelette der Sammlung gemeint ist
 * (`core/kaykitClips.kaykitRigOf`). **`null` heißt „kein Skelett"** — dann
 * kommen höchstens die Spuren der Datei selbst zurück, und die
 * Bewegungsbibliothek wird gar nicht erst geholt. Ein Fass, das dafür 560 kB
 * lädt, ist ein Fass, das 560 kB zu viel lädt.
 */
export type MenuClipSource = (id: string, height: number | null) => Promise<THREE.AnimationClip[]>;

export class PageDetail implements DetailView {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 500);
  /** **Von oben, ohne Fluchtpunkt** — solange Zellen getippt werden (`DetailCells.edit`). */
  private readonly top = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 500);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly lighting: THREE.Group;
  /** Der Kasten über der Mitte: Er nimmt die Gesten, der Saum daneben nicht. */
  private readonly grab: HTMLElement;
  private readonly clock = new THREE.Clock();

  private model: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private action: THREE.AnimationAction | null = null;
  private floor: THREE.GridHelper | null = null;
  private bounds: THREE.Box3Helper | null = null;
  /** Die selbst gezeichneten Zellen (`DetailOptions.cells`) und wofür sie gebaut sind. */
  private cells: THREE.Group | null = null;
  private cellsKey = '';
  /** Wo die Teile des Modells ohne Verschiebung stehen. */
  private readonly bases = new Map<THREE.Object3D, THREE.Vector3>();
  /** Die echten Materialien, solange das Ding ein Geist ist. */
  private readonly ghosts = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  /** Ein Finger, der vielleicht nur tippt: wo er aufsetzte und ob er wischte. */
  private tap: { id: number; x: number; y: number; moved: boolean } | null = null;
  /** Die Hülle in Weltmaßen — Gitter, Kasten und Kamera rechnen daran. */
  private readonly box = new THREE.Box3();
  private readonly target = new THREE.Vector3();
  /** Wie weit die Kamera bei Zoom eins stünde. */
  private reach = 1;
  /** Was ins Bild passen soll: das Ding samt Anzeige am Boden — ohne Spielfigur. */
  private readonly frame0 = new THREE.Box3();

  /**
   * **Die Spielfigur daneben** (`DetailOptions.player`) — mit eigenem
   * Mischer, damit sie im Stehen atmet statt in der T-Pose zu warten, und
   * unabhängig von der Bewegung, die man für das Ding gewählt hat.
   */
  private player: THREE.Object3D | null = null;
  private playerMixer: THREE.AnimationMixer | null = null;
  private playerAsked = -1;

  private clips: THREE.AnimationClip[] = [];
  private names: string[] = [];
  private options: DetailOptions = { floor: false, bounds: false, clip: null };
  private pose: DetailPose = DETAIL_POSE;

  private frame = 0;
  /** Sekunden seit dem Aufschlagen — dieselbe Uhr wie im Raster. */
  private now = 0;
  private asked = -1;
  private width = 0;
  private height = 0;
  private gone = false;

  /** Die Finger auf der Mitte, nach Zeiger-Id. */
  private readonly touches = new Map<number, { x: number; y: number }>();
  /** Der Abstand zweier Finger beim letzten Bild — `0`, solange nur einer liegt. */
  private pinch = 0;
  private wheelAcc = 0;

  constructor(
    private readonly host: HTMLElement,
    private readonly id: string,
    private readonly factory: MenuModelFactory,
    private readonly clipsOf: MenuClipSource | null,
    private readonly onFacts: (facts: DetailFacts) => void,
    private readonly onCell: (key: string) => void = () => {},
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'pmenu__big';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    host.append(this.renderer.domElement);

    this.grab = document.createElement('div');
    this.grab.className = 'pmenu__grab';
    host.append(this.grab);

    this.lighting = createLighting(1);
    this.scene.add(this.lighting);

    this.grab.addEventListener('pointerdown', this.onDown);
    this.grab.addEventListener('pointermove', this.onMove);
    this.grab.addEventListener('pointerup', this.onUp);
    this.grab.addEventListener('pointercancel', this.onUp);
    // **Nicht passiv**: Ein Rad über der Mitte zoomt das Modell, und dazu muss
    // das Scrollen der Seite ausbleiben. Am Saum daneben hängt kein Zuhörer,
    // dort scrollt es wie überall.
    this.grab.addEventListener('wheel', this.onWheel, { passive: false });

    this.clock.getDelta();
    this.frame = requestAnimationFrame(this.loop);
  }

  set(options: DetailOptions): void {
    this.options = options;
    this.applyFloor();
    this.applyBounds();
    this.applyClip();
    this.applyShift();
    this.applyCells();
    this.applyGhost();
    this.applyPlayer();
  }

  dispose(): void {
    this.gone = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.grab.removeEventListener('pointerdown', this.onDown);
    this.grab.removeEventListener('pointermove', this.onMove);
    this.grab.removeEventListener('pointerup', this.onUp);
    this.grab.removeEventListener('pointercancel', this.onUp);
    this.grab.removeEventListener('wheel', this.onWheel);
    this.grab.remove();
    this.action?.stop();
    this.action = null;
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.dropFloor();
    this.dropBounds();
    this.dropCells();
    this.dropPlayer();
    this.unghost();
    // **Das Modell selbst wird nicht freigegeben**: Geometrie und Textur
    // gehören der Vorlage im Speicher und allen anderen Kopien
    // (`core/kaykitModel.ts`, `userData.sharedAssets`). Weg ist hier nur der
    // Rahmen darum.
    this.model?.removeFromParent();
    this.model = null;
    this.lighting.removeFromParent();
    this.renderer.domElement.remove();
    this.renderer.dispose();
    // `dispose` allein gibt den Kontext nicht überall zurück, und eine Seite,
    // die zehn Modelle hintereinander aufschlägt, braucht ihn zehnmal.
    this.renderer.forceContextLoss();
  }

  // --- das Bild -------------------------------------------------------------

  private readonly loop = (): void => {
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.now += dt;
    if (!this.fit()) return;
    if (!this.model) this.take();
    if (this.options.player && this.model && !this.player) this.takePlayer();
    this.mixer?.update(dt);
    this.playerMixer?.update(dt);
    if (this.editing()) {
      this.placeTop();
      this.renderer.render(this.scene, this.top);
      return;
    }
    this.place();
    this.renderer.render(this.scene, this.camera);
  };

  /**
   * Die Leinwand auf die Größe des Kastens bringen — und sagen, ob es
   * überhaupt etwas zu zeichnen gibt. Ein Kasten, der gerade aufklappt, ist
   * null hoch.
   */
  private fit(): boolean {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (width <= 0 || height <= 0) return false;
    if (width === this.width && height === this.height) return true;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // Der Saum links und rechts gehört dem Scrollen — eine Stelle rechnet ihn
    // (`ui/detailDrag.ts`), beide setzen ihn.
    const gutter = detailGutter(width);
    this.grab.style.left = `${gutter}px`;
    this.grab.style.right = `${gutter}px`;
    return true;
  }

  /**
   * Das Modell holen, sobald es da ist — `null` heißt „noch nicht" und wird
   * nicht gemerkt (dieselbe Zusage wie im Raster, `previewGrid.ts`).
   */
  private take(): void {
    if (this.now - this.asked < PREVIEW_RETRY) return;
    this.asked = this.now;
    const model = this.factory(this.id);
    if (!model) return;
    this.model = model;
    this.scene.add(model);
    model.updateMatrixWorld(true);
    modelBox(model, this.box);
    if (this.box.isEmpty()) this.box.setFromCenterAndSize(_zero, _one);
    this.box.getCenter(this.target);
    // Ins Bild passen soll alles, auch eine Anzeige am Boden
    // (`DETAIL_OVERLAY`); gemessen wird nur das Ding selbst.
    this.frame0.setFromObject(model).union(this.box);
    this.frameAll();
    this.frame0.getSize(_size);
    this.mixer = new THREE.AnimationMixer(model);
    this.report(this.clipsOf !== null);
    this.askClips(model, _size.y);
    // Was die Schalter schon sagen wollten, gilt jetzt für ein Modell, das es
    // gibt.
    this.set(this.options);
  }

  /**
   * **Wie weit die Kamera zurückgeht** — so weit, dass das Ding samt Anzeige
   * und, wenn sie dasteht, die Spielfigur ins Bild passen.
   *
   * Der Abstand, aus dem eine Kugel um alles gerade ins Bild passt: ihr
   * Halbmesser geteilt durch den halben Öffnungswinkel. Gerechnet über die
   * Diagonale und nicht über die Höhe, damit eine breite Wand beim Drehen
   * nicht aus dem Bild läuft. Die Mitte bleibt die des Dings — die Figur
   * steht daneben, nicht im Mittelpunkt.
   */
  private frameAll(): void {
    _frame.copy(this.frame0);
    if (this.player?.visible) _frame.union(_playerBox.setFromObject(this.player));
    let radius = 0;
    for (const x of [_frame.min.x, _frame.max.x])
      for (const y of [_frame.min.y, _frame.max.y])
        for (const z of [_frame.min.z, _frame.max.z])
          radius = Math.max(radius, _corner.set(x, y, z).distanceTo(this.target));
    this.reach = Math.max((radius / Math.sin((FOV * Math.PI) / 360)) * MARGIN, 0.05);
  }

  /** Kamera auf ihren Platz: um den Mittelpunkt herum, im Abstand des Zooms. */
  private place(): void {
    const dist = this.reach / this.pose.zoom;
    const cos = Math.cos(this.pose.pitch);
    this.camera.position.set(
      this.target.x + Math.sin(this.pose.yaw) * cos * dist,
      this.target.y + Math.sin(this.pose.pitch) * dist,
      this.target.z + Math.cos(this.pose.yaw) * cos * dist,
    );
    this.camera.lookAt(this.target);
  }

  /** Ob gerade Zellen getippt werden — dann von oben und als Geist. */
  private editing(): boolean {
    return (this.options.cells?.edit ?? false) && this.model !== null;
  }

  /**
   * **Die Kamera senkrecht über der Grundfläche**, orthogonal: Norden oben,
   * und so weit offen, dass die Grundfläche samt Rand ins Bild passt.
   */
  private placeTop(): void {
    const cells = this.options.cells;
    const model = this.model;
    if (!cells || !model) return;
    const spanX = (cells.cols + 2 * CELLS_MARGIN) * CELL_SIZE;
    const spanZ = (cells.rows + 2 * CELLS_MARGIN) * CELL_SIZE;
    const aspect = this.width / Math.max(this.height, 1);
    const half = (Math.max(spanZ / 2, spanX / 2 / aspect) * 1.08) / this.pose.zoom;
    this.top.left = -half * aspect;
    this.top.right = half * aspect;
    this.top.top = half;
    this.top.bottom = -half;
    this.top.updateProjectionMatrix();
    model.getWorldPosition(_centre);
    this.top.up.set(0, 0, -1);
    this.top.position.set(_centre.x, _centre.y + 100, _centre.z);
    this.top.lookAt(_centre);
    this.top.updateMatrixWorld();
  }

  // --- was gemessen wurde ---------------------------------------------------

  /** Kantenlängen, Dreiecke, Bewegungen — an die Seite, die es hinschreibt. */
  private report(loading: boolean): void {
    if (this.gone) return;
    this.box.getSize(_size);
    this.onFacts({
      size: [_size.x, _size.y, _size.z],
      triangles: triangles(this.model),
      clips: [...this.names],
      loading,
    });
  }

  /**
   * **Die Bewegungen nachfragen** — die eigenen der Datei und, bei einer
   * Figur, die ihres Skeletts (`core/kaykitClips.ts`).
   *
   * `height` ist die Höhe in den Maßen der **Quelle**: Der Maßstab des Pakets
   * sitzt auf der Gruppe, die der Lader herausgibt (`core/kaykitFit.ts`), also
   * wird er hier wieder herausgerechnet. An dieser Zahl hängt, welches der
   * beiden Skelette gemeint ist, und sie ist in Metern eine andere.
   */
  private askClips(model: THREE.Object3D, metres: number): void {
    const source = this.clipsOf;
    if (!source) return;
    // **Nur eine Figur fragt nach einem Skelett.** Ohne `SkinnedMesh` bleibt
    // es bei dem, was in der Datei selbst steht — und das ist bei 4456 von
    // 4470 Dateien nichts.
    const height = skinned(model) ? metres / (model.scale.y || 1) : null;
    void source(this.id, height).then((clips) => {
      if (this.gone) return;
      this.clips = clips;
      this.names = clips.map((clip) => clip.name);
      this.report(false);
      this.applyClip();
    });
  }

  // --- die Schalter ---------------------------------------------------------

  private applyFloor(): void {
    if (!this.options.floor || !this.model) {
      this.dropFloor();
      return;
    }
    if (this.floor) return;
    this.box.getSize(_size);
    // Ein Gitter in Kachelschritten (`nav/navTile.TILE`, 1 m): So sieht man am
    // Boden, wie viele Kacheln das Ding belegen wird, wenn es hingestellt wird
    // (`worlds/portal/placeGrid.ts`).
    const span = Math.max(2, Math.ceil(Math.max(_size.x, _size.z) * 2));
    const grid = new THREE.GridHelper(span, span, FLOOR_MID, FLOOR_COLOR);
    grid.position.set(this.target.x, this.box.min.y, this.target.z);
    this.scene.add(grid);
    this.floor = grid;
  }

  private dropFloor(): void {
    if (!this.floor) return;
    this.floor.removeFromParent();
    this.floor.geometry.dispose();
    disposeMaterial(this.floor.material);
    this.floor = null;
  }

  private applyBounds(): void {
    if (!this.options.bounds || !this.model) {
      this.dropBounds();
      return;
    }
    if (this.bounds) return;
    const helper = new THREE.Box3Helper(this.box, new THREE.Color(BOUNDS_COLOR));
    this.scene.add(helper);
    this.bounds = helper;
  }

  /**
   * **Die Spielfigur holen** — über dieselbe Fabrik wie das Ding, und mit
   * derselben Zusage: `null` heißt „noch nicht", gefragt wird wieder nach
   * `PREVIEW_RETRY`.
   *
   * Gestellt wird sie auf die Höhe, die sie in der Welt hat
   * (`CHEF_HEIGHT`), mit den Sohlen auf dem Boden des Dings und rechts
   * daneben, mit einer Handbreit Luft. Das Ding verschoben (`shift`) rückt
   * sie nicht: Sie steht, wo die Grundfläche steht.
   */
  private takePlayer(): void {
    if (this.now - this.playerAsked < PREVIEW_RETRY) return;
    this.playerAsked = this.now;
    const figure = this.factory(DETAIL_PLAYER);
    if (!figure) return;
    figure.updateMatrixWorld(true);
    _playerBox.setFromObject(figure);
    const tall = _playerBox.max.y - _playerBox.min.y;
    // Die Quellhöhe, in den Maßen der Datei — an ihr hängt das Skelett
    // (`askClips`), und gemessen wird vor dem Umstellen.
    const source = tall / (figure.scale.y || 1);
    if (tall > 0) figure.scale.multiplyScalar(CHEF_HEIGHT / tall);
    figure.updateMatrixWorld(true);
    _playerBox.setFromObject(figure);
    figure.position.x += this.box.max.x + PLAYER_GAP - _playerBox.min.x;
    figure.position.y += this.box.min.y - _playerBox.min.y;
    figure.position.z += this.target.z - (_playerBox.min.z + _playerBox.max.z) / 2;
    // Erst versteckt: `applyPlayer` zeigt sie und zieht dabei die Kamera nach.
    figure.visible = false;
    this.player = figure;
    this.scene.add(figure);
    figure.updateMatrixWorld(true);
    this.playerMixer = new THREE.AnimationMixer(figure);
    this.applyPlayer();
    void this.clipsOf?.(DETAIL_PLAYER, source).then((clips) => {
      if (this.gone || this.player !== figure || !this.playerMixer) return;
      const idle = clips.find((clip) => /idle/i.test(clip.name));
      if (idle) this.playerMixer.clipAction(idle).play();
    });
  }

  /**
   * Zeigen oder verstecken — und die Kamera nachziehen. Solange Zellen
   * getippt werden, steht sie nicht im Bild: Von oben gehört es den Zellen.
   */
  private applyPlayer(): void {
    const player = this.player;
    if (!player) return;
    const shown = (this.options.player ?? false) && !this.editing();
    if (player.visible === shown) return;
    player.visible = shown;
    this.frameAll();
  }

  private dropPlayer(): void {
    this.playerMixer?.stopAllAction();
    this.playerMixer = null;
    // Wie beim Ding selbst: Geometrie und Materialien gehören der Vorlage.
    this.player?.removeFromParent();
    this.player = null;
  }

  private dropBounds(): void {
    if (!this.bounds) return;
    this.bounds.removeFromParent();
    this.bounds.geometry.dispose();
    disposeMaterial(this.bounds.material);
    this.bounds = null;
  }

  /**
   * **Das Modell verschieben** (`DetailOptions.shift`) — jedes Teil, nicht
   * die Anzeigen daneben: Die Zellen bleiben, wo sie in der Welt lägen, und
   * das Ding rückt über ihnen.
   */
  private applyShift(): void {
    const model = this.model;
    if (!model) return;
    const [sx, sz] = this.options.shift ?? [0, 0];
    for (const child of model.children) {
      if (child.userData[DETAIL_OVERLAY]) continue;
      let base = this.bases.get(child);
      if (!base) {
        base = child.position.clone();
        this.bases.set(child, base);
      }
      child.position.set(base.x + sx, base.y, base.z + sz);
    }
  }

  /**
   * **Die Zellen selbst zeichnen** (`DetailOptions.cells`) — und die Anzeige,
   * die das Modell mitbringt, so lange ausblenden. Gebaut wird nur neu, wenn
   * sich etwas daran geändert hat.
   */
  private applyCells(): void {
    const model = this.model;
    const cells = this.options.cells ?? null;
    if (model) {
      for (const child of model.children) {
        if (child.userData[DETAIL_OVERLAY] && child !== this.cells) child.visible = cells === null;
      }
    }
    if (!cells || !model) {
      this.dropCells();
      return;
    }
    const key = `${cells.cols}x${cells.rows}|${cells.edit ? 1 : 0}|${[...cells.blocked].sort().join(' ')}`;
    if (key === this.cellsKey && this.cells) return;
    this.dropCells();
    this.cells = cellsGroup(cells);
    model.add(this.cells);
    this.cellsKey = key;
  }

  private dropCells(): void {
    if (!this.cells) return;
    this.cells.removeFromParent();
    this.cells.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.geometry) return;
      mesh.geometry.dispose();
      disposeMaterial(mesh.material);
    });
    this.cells = null;
    this.cellsKey = '';
  }

  /**
   * **Ein Geist, solange Zellen getippt werden** — durchsichtig, damit man
   * die Zellen unter der Krone sieht. Die Materialien gehören der Vorlage und
   * allen Kopien; getauscht wird deshalb nur, was an diesem Netz hängt, und
   * danach zurück.
   */
  private applyGhost(): void {
    if (!this.editing()) {
      this.unghost();
      return;
    }
    const model = this.model;
    if (!model || this.ghosts.size > 0) return;
    const visit = (object: THREE.Object3D): void => {
      if (object.userData[DETAIL_OVERLAY]) return;
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        this.ghosts.set(mesh, mesh.material);
        const ghost = (one: THREE.Material): THREE.Material => {
          const copy = one.clone();
          copy.transparent = true;
          copy.opacity = GHOST_OPACITY;
          copy.depthWrite = false;
          return copy;
        };
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(ghost)
          : ghost(mesh.material);
      }
      for (const child of object.children) visit(child);
    };
    visit(model);
  }

  private unghost(): void {
    for (const [mesh, material] of this.ghosts) {
      disposeMaterial(mesh.material);
      mesh.material = material;
    }
    this.ghosts.clear();
  }

  /**
   * **Welche Zelle unter dem Finger liegt** — von der Kamera oben senkrecht
   * hinunter auf den Boden des Modells, als `'ix,iz'` ab der Nordwestecke der
   * Grundfläche; `null` daneben.
   */
  private cellAt(clientX: number, clientY: number): string | null {
    const cells = this.options.cells;
    const model = this.model;
    if (!cells || !model) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    _ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.placeTop();
    _ray.setFromCamera(_ndc, this.top);
    model.getWorldPosition(_centre);
    _plane.set(_upward, -_centre.y);
    if (!_ray.ray.intersectPlane(_plane, _hit)) return null;
    model.worldToLocal(_hit);
    const ix = Math.floor((_hit.x + (cells.cols * CELL_SIZE) / 2) / CELL_SIZE);
    const iz = Math.floor((_hit.z + (cells.rows * CELL_SIZE) / 2) / CELL_SIZE);
    const inside =
      ix >= -CELLS_MARGIN &&
      ix < cells.cols + CELLS_MARGIN &&
      iz >= -CELLS_MARGIN &&
      iz < cells.rows + CELLS_MARGIN;
    return inside ? `${ix},${iz}` : null;
  }

  /**
   * Die gewählte Bewegung spielen — oder keine, und dann steht das Modell
   * wieder so, wie es in der Datei liegt.
   */
  private applyClip(): void {
    const mixer = this.mixer;
    if (!mixer) return;
    const wanted = this.options.clip;
    if (this.action?.getClip().name === wanted) return;
    this.action?.stop();
    this.action = null;
    // **Zurück in die Ruhelage**, bevor eine andere Bewegung anfängt: Ein
    // `stop` allein lässt die Knochen dort stehen, wo die letzte Spur sie
    // hingelegt hat, und „keine" sähe dann aus wie ein Standbild.
    mixer.stopAllAction();
    mixer.setTime(0);
    if (wanted === null) return;
    const clip = this.clips.find((candidate) => candidate.name === wanted);
    if (!clip) return;
    const action = mixer.clipAction(clip);
    action.reset();
    action.play();
    this.action = action;
  }

  // --- die Gesten -----------------------------------------------------------

  private readonly onDown = (event: PointerEvent): void => {
    this.grab.setPointerCapture(event.pointerId);
    this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.pinch = 0;
    // Nur ein einzelner Finger kann tippen; ein zweiter macht daraus ein Kneifen.
    this.tap =
      this.touches.size === 1
        ? { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
        : null;
  };

  private readonly onMove = (event: PointerEvent): void => {
    const last = this.touches.get(event.pointerId);
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    last.x = event.clientX;
    last.y = event.clientY;
    const tap = this.tap;
    if (tap && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > TAP_SLOP)
      tap.moved = true;
    if (this.touches.size >= 2) {
      // **Zwei Finger kneifen und drehen nicht.** Wer mit zwei Fingern
      // zusammenzieht, meint den Zoom; ihn nebenher auch drehen zu lassen,
      // machte aus jedem Kneifen einen Schlenker.
      const span = this.span();
      if (this.pinch > 0 && span > 0) this.pose = detailZoom(this.pose, span / this.pinch);
      this.pinch = span;
      return;
    }
    // Von oben dreht nichts: Die Zellen sollen stillhalten, während man tippt.
    if (this.editing()) return;
    this.pose = detailDrag(this.pose, dx, dy, this.width, this.height);
  };

  private readonly onUp = (event: PointerEvent): void => {
    const tap = this.tap;
    if (tap && tap.id === event.pointerId && !tap.moved && event.type === 'pointerup') {
      this.tap = null;
      if (this.editing()) {
        const key = this.cellAt(event.clientX, event.clientY);
        if (key !== null) this.onCell(key);
      }
    }
    this.touches.delete(event.pointerId);
    this.pinch = 0;
    if (this.grab.hasPointerCapture(event.pointerId)) {
      this.grab.releasePointerCapture(event.pointerId);
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const step = wheelStep(this.wheelAcc, wheelPixels(event));
    this.wheelAcc = step.acc;
    if (step.step === 0) return;
    this.pose = detailZoom(this.pose, step.step < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR);
  };

  /** Der Abstand der ersten beiden Finger, in Bildpunkten. */
  private span(): number {
    const [a, b] = [...this.touches.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}

/** Ob in diesem Baum ein Skelett steckt — daran hängt die Frage nach Bewegungen. */
function skinned(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((object) => {
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) found = true;
  });
  return found;
}

/** Wie viele Dreiecke in diesem Baum stecken — einmal gezählt, nicht je Bild. */
function triangles(root: THREE.Object3D | null): number {
  if (!root) return 0;
  let sum = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const count = mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position')?.count ?? 0;
    sum += Math.floor(count / 3);
  });
  return sum;
}

/** Ein Helfer hat sein eigenes Material — anders als das Modell darunter. */
function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  for (const one of Array.isArray(material) ? material : [material]) one.dispose();
}

const _size = new THREE.Vector3();
/**
 * Die Hülle des Modells ohne die Anzeigen daneben (`DETAIL_OVERLAY`) — für
 * jeden Ast ohne Anzeige genau das, was `Box3.setFromObject` rechnet.
 */
function modelBox(model: THREE.Object3D, box: THREE.Box3): THREE.Box3 {
  box.makeEmpty();
  model.updateWorldMatrix(true, true);
  const visit = (object: THREE.Object3D): void => {
    if (object.userData[DETAIL_OVERLAY]) return;
    if (!hasOverlay(object)) {
      box.expandByObject(object);
      return;
    }
    for (const child of object.children) visit(child);
  };
  visit(model);
  return box;
}

/** Ob irgendwo darunter eine Anzeige hängt. */
function hasOverlay(object: THREE.Object3D): boolean {
  let found = false;
  object.traverse((one) => {
    if (one.userData[DETAIL_OVERLAY]) found = true;
  });
  return found;
}

/**
 * **Die Zellen unter einem Element** — gesperrte rot, darum Zell- und
 * Kachellinien, die Grundfläche als Rahmen und vorn ein Pfeil. In Metern um
 * die Mitte der Grundfläche, wie das Modell (`elementView.elementModel`).
 * Beim Tippen liegt alles über dem Geist (`depthTest: false`).
 */
function cellsGroup(cells: DetailCells): THREE.Group {
  const group = new THREE.Group();
  group.name = 'detail-cells';
  group.userData[DETAIL_OVERLAY] = true;
  const over = cells.edit;
  const w = cells.cols * CELL_SIZE;
  const d = cells.rows * CELL_SIZE;
  const x = (ix: number): number => -w / 2 + ix * CELL_SIZE;
  const z = (iz: number): number => -d / 2 + iz * CELL_SIZE;
  const y = 0.004;

  const inset = 0.03;
  const quad = new THREE.PlaneGeometry(CELL_SIZE - 2 * inset, CELL_SIZE - 2 * inset);
  quad.rotateX(-Math.PI / 2);
  const fill = new THREE.MeshBasicMaterial({
    color: CELLS_BLOCKED,
    transparent: true,
    opacity: over ? 0.7 : 0.55,
    depthWrite: false,
    depthTest: !over,
    side: THREE.DoubleSide,
  });
  // Alle Zellen teilen Geometrie und Material; doppelt freigegeben schadet nicht.
  for (const key of cells.blocked) {
    const [ix, iz] = key.split(',').map(Number) as [number, number];
    const mesh = new THREE.Mesh(quad, fill);
    mesh.position.set(x(ix) + CELL_SIZE / 2, y, z(iz) + CELL_SIZE / 2);
    mesh.renderOrder = 10;
    group.add(mesh);
  }

  const thin: number[] = [];
  const bold: number[] = [];
  const m = CELLS_MARGIN;
  for (let ix = -m; ix <= cells.cols + m; ix++) {
    (ix % 2 === 0 ? bold : thin).push(x(ix), y * 2, z(-m), x(ix), y * 2, z(cells.rows + m));
  }
  for (let iz = -m; iz <= cells.rows + m; iz++) {
    (iz % 2 === 0 ? bold : thin).push(x(-m), y * 2, z(iz), x(cells.cols + m), y * 2, z(iz));
  }
  const foot = [
    [x(0), z(0), x(cells.cols), z(0)],
    [x(cells.cols), z(0), x(cells.cols), z(cells.rows)],
    [x(cells.cols), z(cells.rows), x(0), z(cells.rows)],
    [x(0), z(cells.rows), x(0), z(0)],
  ].flatMap(([ax, az, bx, bz]) => [ax!, y * 3, az!, bx!, y * 3, bz!]);
  for (const [points, color] of [
    [thin, CELLS_LINE],
    [bold, CELLS_TILE],
    [foot, CELLS_FOOT],
  ] as const) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const lines = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color, depthTest: !over, transparent: over }),
    );
    lines.renderOrder = 11;
    group.add(lines);
  }

  const arrow = new THREE.Shape();
  arrow.moveTo(-0.15, 0);
  arrow.lineTo(0.15, 0);
  arrow.lineTo(0, 0.25);
  arrow.closePath();
  const tip = new THREE.ShapeGeometry(arrow);
  tip.rotateX(Math.PI / 2);
  const front = new THREE.Mesh(
    tip,
    new THREE.MeshBasicMaterial({
      color: CELLS_FRONT,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: !over,
    }),
  );
  front.position.set(0, y * 3, d / 2 + 0.08);
  front.renderOrder = 12;
  group.add(front);
  return group;
}

const _centre = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _ndc = new THREE.Vector2();
const _upward = new THREE.Vector3(0, 1, 0);
const _plane = new THREE.Plane();
const _ray = new THREE.Raycaster();
const _frame = new THREE.Box3();
const _playerBox = new THREE.Box3();
const _corner = new THREE.Vector3();
const _zero = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);
