import { HERO_DIRS, drawHeroSheet, heroDir, heroFrame, type HeroDir } from './hero';
import { TILE_M, TILE_PX, layerOf, setTile, type Level, type TileId } from './level';
import { SOLID_TILES, drawTileset } from './tiles';
import { Editor } from './Editor';
import './world2d.css';

/**
 * **Die 2D-Welt in Phaser** — Kacheln in Ebenen, ein Held, der dazwischen
 * läuft, ein Raster zum Einblenden und ein Editor zum Malen.
 *
 * Das ist die Wahrheit, aus der eines Tages die 3D-Welt gebaut wird, nicht
 * umgekehrt: Der Plan (`level.ts`) sagt, wo Gras, Wasser und Mauern sind;
 * Phaser zeichnet ihn und lässt den Helden mit Arcade-Physik dagegenlaufen;
 * die 3D-Welt bekommt dessen Position gesagt (`App.step`) und folgt. Wer
 * die Mauer hier versetzt, versetzt sie überall.
 *
 * **Phaser wird erst geladen, wenn jemand die Ansicht öffnet** — ein
 * Megabyte, das die Brille nie braucht. Bis dahin ist diese Klasse ein leeres
 * Div; `show` holt die Bibliothek und baut das Spiel beim ersten Mal.
 *
 * **Die Tastatur gehört nicht Phaser.** Tasten und Bordstock liest weiter
 * `FlatControls` (am Fenster und an der 3D-Leinwand); die Szene fragt jedes
 * Bild nach dem Wunsch (`controls`) und gibt ihn dem Helden. So gibt es einen
 * Weg für die Eingabe und nicht zwei, die sich um dieselbe Taste streiten.
 * Zeiger nimmt die Phaser-Leinwand nur im Editor an — sonst käme der
 * Bordstock auf dem Telefon nicht mehr durch (`world2d.css`).
 */

/** Was die Steuerung diesem Bild sagt: Richtung im Bild, Sprint. */
export interface Controls2D {
  x: number;
  z: number;
  sprint: boolean;
}

/** Wo der Held steht, in Metern der Welt — die Zahl, die die 3D-Welt liest. */
export interface HeroState {
  x: number;
  z: number;
  dir: HeroDir;
  /** Blickrichtung als Drehung um die Hochachse, wie im Rig (`yaw`). */
  yaw: number;
  moving: boolean;
}

export type EditTool = 'paint' | 'erase';

export interface World2DOptions {
  controls: () => Controls2D;
  /** Der Plan hat sich geändert — wer ihn merken will, tut es hier. */
  onEdit?: (level: Level) => void;
  /** Ansicht oder Editor gewechselt — das Menü zieht nach. */
  onState?: () => void;
}

/** Bildpunkte je Sekunde beim Gehen: drei Kacheln — drei Meter — die Sekunde. */
const WALK_SPEED = 3 * TILE_PX;
const SPRINT_SPEED = 5.2 * TILE_PX;
/** Schritte je Sekunde der Gehanimation. */
const STEP_HZ = 6;

const YAW_OF: Record<HeroDir, number> = {
  up: 0,
  left: Math.PI / 2,
  down: Math.PI,
  right: -Math.PI / 2,
};

/**
 * Was die Szene dem Wirt zeigt — als Schnittstelle, weil die Klasse selbst
 * erst entsteht, wenn Phaser geladen ist (`sceneClass`).
 */
interface LevelSceneLike extends Phaser.Scene {
  hero(): HeroState | null;
  setGrid(on: boolean): void;
  setLayerVisible(id: string, on: boolean): void;
  setEditing(on: boolean): void;
  zoomBy(factor: number): void;
  reload(level: Level): void;
}

export class World2D {
  readonly element: HTMLDivElement;
  private readonly stage: HTMLDivElement;
  readonly editor: Editor;
  private readonly options: World2DOptions;

  private game: Phaser.Game | null = null;
  private scene: LevelSceneLike | null = null;
  private booting: Promise<void> | null = null;
  private level: Level | null = null;

  private gridOn = false;
  private editOn = false;
  private toolNow: EditTool = 'paint';
  private brushNow: TileId = 1;
  private editLayerNow = 'ground';

  constructor(options: World2DOptions, host: HTMLElement = document.body) {
    this.options = options;
    this.element = document.createElement('div');
    this.element.className = 'world2d';
    this.element.hidden = true;
    this.stage = document.createElement('div');
    this.stage.className = 'world2d__stage';
    this.element.append(this.stage);
    this.editor = new Editor({
      host: this.element,
      onTool: (tool) => this.setTool(tool),
      onBrush: (id) => this.setBrush(id),
      onLayer: (id) => this.setEditLayer(id),
      onLayerVisible: (id, on) => this.setLayerVisible(id, on),
      onGrid: (on) => this.setGrid(on),
      onClose: () => this.setEditing(false),
      onReset: () => this.options.onEdit?.(this.level!),
    });
    host.append(this.element);
    window.addEventListener('wheel', this.onWheel, { passive: true });
  }

  /**
   * Das Rad zoomt auch beim Spielen. Die Leinwand nimmt dann keine Zeiger an
   * (`world2d.css`), damit der Bordstock darunter durchkommt — also hört das
   * Fenster zu; im Editor hört Phaser selbst.
   */
  private readonly onWheel = (event: WheelEvent): void => {
    if (this.element.hidden || this.editOn) return;
    this.wheel(event.deltaY);
  };

  /** Gesammelte Radwege; ein Trackpad liefert viele kleine, ein Rad wenige große. */
  private wheelAcc = 0;

  /** Das Rad in ganze Zoomstufen übersetzen — die Szene und das Fenster rufen das. */
  wheel(deltaY: number): void {
    this.wheelAcc += deltaY;
    if (Math.abs(this.wheelAcc) < 50) return;
    this.zoomBy(this.wheelAcc < 0 ? 2 : 0.5);
    this.wheelAcc = 0;
  }

  /** Phasers eigene Bildrate — die Leinwand hat ihre eigene Schleife. */
  fps(): number | null {
    return this.game && !this.element.hidden ? this.game.loop.actualFps : null;
  }

  get hidden(): boolean {
    return this.element.hidden;
  }

  get current(): Level | null {
    return this.level;
  }

  get grid(): boolean {
    return this.gridOn;
  }

  get editing(): boolean {
    return this.editOn;
  }

  get tool(): EditTool {
    return this.toolNow;
  }

  get brush(): TileId {
    return this.brushNow;
  }

  get editLayer(): string {
    return this.editLayerNow;
  }

  /**
   * Die Welt zeigen — mit diesem Plan. Beim ersten Mal wird Phaser geholt und
   * das Spiel gebaut; danach wird nur die Szene neu geladen, wenn der Plan ein
   * anderer ist.
   */
  async show(level: Level): Promise<void> {
    const changed = this.level !== level;
    this.level = level;
    this.element.hidden = false;
    this.editor.setLevel(level);
    await this.boot();
    if (!this.game) return;
    if (!this.scene) {
      this.game.scene.start('level', { level });
      this.scene = this.game.scene.getScene('level') as LevelSceneLike;
    } else {
      this.game.scene.resume('level');
      if (changed) this.scene.reload(level);
    }
    this.scene.setGrid(this.gridOn);
    this.scene.setEditing(this.editOn);
  }

  hide(): void {
    if (this.element.hidden) return;
    this.element.hidden = true;
    if (this.game && this.scene) this.game.scene.pause('level');
  }

  /** Wo der Held steht — oder `null`, solange die Welt noch nicht steht. */
  hero(): HeroState | null {
    return this.scene?.hero() ?? null;
  }

  setGrid(on: boolean): void {
    if (this.gridOn === on) return;
    this.gridOn = on;
    this.scene?.setGrid(on);
    this.editor.setGrid(on);
    this.options.onState?.();
  }

  setLayerVisible(id: string, on: boolean): void {
    const layer = this.level ? layerOf(this.level, id) : undefined;
    if (!layer || layer.visible === on) return;
    layer.visible = on;
    this.scene?.setLayerVisible(id, on);
    this.editor.setLevel(this.level!);
    this.options.onEdit?.(this.level!);
    this.options.onState?.();
  }

  setEditing(on: boolean): void {
    if (this.editOn === on) return;
    this.editOn = on;
    this.element.classList.toggle('is-editing', on);
    this.editor.show(on);
    this.scene?.setEditing(on);
    this.options.onState?.();
  }

  setTool(tool: EditTool): void {
    this.toolNow = tool;
    this.editor.setTool(tool);
  }

  setBrush(id: TileId): void {
    this.brushNow = id;
    this.toolNow = 'paint';
    this.editor.setBrush(id);
    this.editor.setTool('paint');
  }

  setEditLayer(id: string): void {
    this.editLayerNow = id;
    this.editor.setEditLayer(id);
  }

  zoomBy(factor: number): void {
    this.scene?.zoomBy(factor);
  }

  /** Eine Zelle malen oder leeren — der Editor ruft das, die Szene meldet es. */
  paint(col: number, row: number): void {
    const level = this.level;
    if (!level) return;
    const layer = layerOf(level, this.editLayerNow);
    if (!layer) return;
    const tile = this.toolNow === 'erase' ? 0 : this.brushNow;
    if (setTile(level, layer, col, row, tile)) {
      this.scene?.setLayerVisible(layer.id, layer.visible);
      this.options.onEdit?.(level);
    }
  }

  dispose(): void {
    window.removeEventListener('wheel', this.onWheel);
    this.editor.dispose();
    this.game?.destroy(true);
    this.game = null;
    this.scene = null;
    this.element.remove();
  }

  // --- Phaser -----------------------------------------------------------------

  private boot(): Promise<void> {
    if (this.game) return Promise.resolve();
    this.booting ??= (async () => {
      const { default: Phaser } = await import('phaser');
      if (!this.element.isConnected) return;
      const Scene = sceneClass(Phaser, this);
      this.game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: this.stage,
        width: Math.max(1, this.stage.clientWidth),
        height: Math.max(1, this.stage.clientHeight),
        pixelArt: true,
        backgroundColor: '#1a2a1c',
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
        // **Echte Bildzeit statt fester 60-Hz-Schritte**: Mit `fixedStep`
        // bekäme ein Bild mal zwei, mal drei Schritte — der Held ginge in
        // Schüben, auf 90- und 120-Hz-Schirmen erst recht (gemessen: Schritte
        // von 1,6 und 2,4 Bildpunkten im Wechsel).
        physics: { default: 'arcade', arcade: { debug: false, fixedStep: false } },
        // Die Tastatur gehört `FlatControls`, der Ton dem Rest der Seite.
        input: { keyboard: false },
        audio: { noAudio: true },
        banner: false,
        scene: [],
      });
      this.game.scene.add('level', Scene, false);
      // Der Start wartet, bis Phaser wirklich läuft — `scene.start` vor dem
      // ersten Bild geht sonst ins Leere.
      await new Promise<void>((resolve) => this.game!.events.once('ready', () => resolve()));
    })();
    return this.booting;
  }
}

/**
 * **Die Szene** — gebaut erst, wenn Phaser da ist, weil `extends` die Klasse
 * zur Ladezeit braucht.
 */
function sceneClass(Phaser: typeof import('phaser'), host: World2D) {
  return class LevelScene extends Phaser.Scene implements LevelSceneLike {
    private level!: Level;
    private map!: Phaser.Tilemaps.Tilemap;
    private readonly layers = new Map<string, Phaser.Tilemaps.TilemapLayer>();
    /** Der Körper: rechnet, sieht man nicht. */
    private player!: Phaser.Physics.Arcade.Sprite;
    /** Die Figur: sieht man, rechnet nicht — sie steht auf Schirmpunkten. */
    private heroSprite!: Phaser.GameObjects.Sprite;
    private gridGfx!: Phaser.GameObjects.Graphics;
    private dir: HeroDir = 'down';
    private moving = false;
    private walkClock = 0;
    private gridOn = false;
    private editing = false;
    private zoom = 3;

    constructor() {
      super('level');
    }

    init(data: { level: Level }): void {
      this.level = data.level;
    }

    create(): void {
      this.layers.clear();
      this.ensureTextures();
      this.buildMap();
      this.buildHero();
      this.buildCamera();
      this.gridGfx = this.add.graphics().setDepth(30);
      this.drawGrid();
      this.listen();
      this.setEditing(this.editing);
      // Nach der Physik, vor dem Bild: Figur und Kamera auf den Körper setzen.
      // Arcade schreibt den Körper im selben Ereignis zurück, hat sich aber
      // beim Start eingetragen und kommt deshalb vorher dran.
      const place = (): void => this.place();
      this.events.on('postupdate', place);
      this.events.once('shutdown', () => this.events.off('postupdate', place));
      place();
    }

    override update(_time: number, delta: number): void {
      const dt = delta / 1000;
      const wish = host['options'].controls();
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      let { x, z } = wish;
      const len = Math.hypot(x, z);
      if (len > 1) {
        x /= len;
        z /= len;
      }
      const speed = wish.sprint ? SPRINT_SPEED : WALK_SPEED;
      body.setVelocity(x * speed, z * speed);
      this.moving = len > 0.05;
      this.dir = heroDir(x, z, this.dir);
      this.walkClock = this.moving ? this.walkClock + dt : 0;
      const step: 0 | 1 = this.moving && Math.floor(this.walkClock * STEP_HZ) % 2 === 1 ? 1 : 0;
      this.heroSprite.setFrame(heroFrame(this.dir, step));
    }

    /**
     * **Figur und Kamera auf Schirmpunkte.** Der Körper läuft, wohin die Physik
     * ihn rechnet, mit Bruchteilen von Bildpunkten. Gezeichnet wird auf dem
     * Schirm, und der hat beim Zoom 4 vier Punkte je Weltpunkt — also wird auf
     * **Viertel** gerundet, nicht auf ganze Weltpunkte: Die Kanten bleiben
     * scharf (jeder Texel liegt auf ganzen Schirmpunkten), und ein Schritt von
     * 0,8 Weltpunkten wird zu 3-3-3-4 Schirmpunkten statt zu 1-1-1-1-0. Figur
     * und Kamera werden **gleich** gerundet, darum steht die Figur still in
     * der Mitte, und nur die Welt läuft unter ihr durch.
     */
    private place(): void {
      const zoom = this.zoom;
      const q = (v: number): number => Math.round(v * zoom) / zoom;
      const x = q(this.player.x);
      const y = q(this.player.y);
      this.heroSprite.setPosition(x, y);
      const camera = this.cameras.main;
      camera.setScroll(q(x - camera.width / 2), q(y - camera.height / 2));
    }

    hero(): HeroState {
      return {
        x: (this.player.x / TILE_PX) * TILE_M,
        z: (this.player.y / TILE_PX) * TILE_M,
        dir: this.dir,
        yaw: YAW_OF[this.dir],
        moving: this.moving,
      };
    }

    setGrid(on: boolean): void {
      this.gridOn = on;
      if (this.gridGfx) this.drawGrid();
    }

    setLayerVisible(id: string, on: boolean): void {
      const layer = this.layers.get(id);
      const data = layerOf(this.level, id);
      if (!layer || !data) return;
      layer.setVisible(on);
      this.fillLayer(layer, data);
    }

    setEditing(on: boolean): void {
      this.editing = on;
      if (this.input) this.input.enabled = on;
    }

    /**
     * Eine Stufe näher (`factor > 1`) oder weiter weg — in **ganzen** Stufen,
     * denn Phaser rundet nur bei ganzzahligem Zoom auf Bildpunkte
     * (`Camera.renderRoundPixels`); bei 2,7 schimmern die Kachelkanten.
     */
    zoomBy(factor: number): void {
      const next = factor > 1 ? this.zoom + 1 : this.zoom - 1;
      this.zoom = Math.min(8, Math.max(1, Math.round(next)));
      this.cameras.main.setZoom(this.zoom);
    }

    reload(level: Level): void {
      this.scene.restart({ level });
    }

    // --- Aufbau ---------------------------------------------------------------

    private ensureTextures(): void {
      if (!this.textures.exists('tiles')) this.textures.addCanvas('tiles', drawTileset());
      if (!this.textures.exists('hero')) {
        const texture = this.textures.addCanvas('hero', drawHeroSheet());
        if (texture) {
          for (let i = 0; i < HERO_DIRS.length * 2; i++)
            texture.add(i, 0, i * TILE_PX, 0, TILE_PX, TILE_PX);
        }
      }
    }

    private buildMap(): void {
      const level = this.level;
      this.map = this.make.tilemap({
        tileWidth: TILE_PX,
        tileHeight: TILE_PX,
        width: level.cols,
        height: level.rows,
      });
      const tileset = this.map.addTilesetImage('tiles', 'tiles', TILE_PX, TILE_PX, 0, 0);
      if (!tileset) throw new Error('Kachelsatz fehlt');
      const depth: Record<Level['layers'][number]['kind'], number> = {
        ground: 0,
        objects: 5,
        overlay: 20,
      };
      for (const data of level.layers) {
        const layer = this.map.createBlankLayer(data.id, tileset);
        if (!layer) continue;
        layer.setDepth(depth[data.kind]);
        this.fillLayer(layer, data);
        layer.setVisible(data.visible);
        this.layers.set(data.id, layer);
      }
    }

    /**
     * Den Plan in die Ebene schreiben — und die Kollision gleich mit: Fest
     * ist, was fest ist, auf jeder Ebene außer der über dem Kopf. Unsichtbar
     * heißt auch durchlässig, das ist der Sinn des Ausblendens im Editor.
     */
    private fillLayer(layer: Phaser.Tilemaps.TilemapLayer, data: Level['layers'][number]): void {
      const level = this.level;
      for (let row = 0; row < level.rows; row++) {
        for (let col = 0; col < level.cols; col++) {
          const id = data.tiles[row * level.cols + col] ?? 0;
          if (id > 0) layer.putTileAt(id, col, row);
          else layer.removeTileAt(col, row);
        }
      }
      if (data.kind === 'overlay' || !data.visible) layer.setCollision([...SOLID_TILES], false);
      else layer.setCollision([...SOLID_TILES], true);
    }

    private buildHero(): void {
      const { col, row } = this.level.spawn;
      this.player = this.physics.add.sprite(
        col * TILE_PX + TILE_PX / 2,
        row * TILE_PX + TILE_PX / 2,
        'hero',
        heroFrame('down', 0),
      );
      this.player.setVisible(false);
      this.heroSprite = this.add.sprite(this.player.x, this.player.y, 'hero', heroFrame('down', 0));
      this.heroSprite.setDepth(10);
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      // Der Körper ist der Kreis der Füße, nicht die ganze Figur: Der Kopf
      // darf über eine Mauer ragen, die Füße nicht hinein.
      body.setSize(10, 8).setOffset(3, 8);
      body.setCollideWorldBounds(true);
      this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
      for (const layer of this.layers.values()) this.physics.add.collider(this.player, layer);
    }

    private buildCamera(): void {
      const camera = this.cameras.main;
      camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
      // **Kein `startFollow`, kein `roundPixels`.** Phasers Verfolgung rundet
      // die Kamera auf ganze Weltpunkte (`Math.floor`), die Figur aber auf
      // Schirmpunkte — beim Zoom 4 sprang der Held so um bis zu drei Punkte
      // gegen die Kacheln, und ein Lerp obendrein ließ ihn nachlaufen; nach
      // unten war es am deutlichsten. `place` setzt beides selbst, gleich
      // gerundet, nach jedem Physikschritt.
      camera.setRoundPixels(false);
      this.fitZoom();
      this.scale.on('resize', () => this.fitZoom());
    }

    /** So nah, dass rund achtzehn Kacheln nebeneinander passen — wie auf der Konsole. */
    private fitZoom(): void {
      const width = this.scale.width || 1;
      this.zoom = Math.min(8, Math.max(2, Math.floor(width / (TILE_PX * 18))));
      this.cameras.main.setZoom(this.zoom);
    }

    private drawGrid(): void {
      const gfx = this.gridGfx;
      gfx.clear();
      if (!this.gridOn) return;
      gfx.lineStyle(1 / this.zoom, 0xffffff, 0.22);
      const w = this.map.widthInPixels;
      const h = this.map.heightInPixels;
      for (let x = 0; x <= w; x += TILE_PX) gfx.lineBetween(x, 0, x, h);
      for (let y = 0; y <= h; y += TILE_PX) gfx.lineBetween(0, y, w, y);
    }

    private listen(): void {
      const paint = (pointer: Phaser.Input.Pointer): void => {
        if (!this.editing) return;
        const at = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const tile = this.map.worldToTileXY(at.x, at.y);
        if (!tile) return;
        host.paint(Math.floor(tile.x), Math.floor(tile.y));
      };
      this.input.on('pointerdown', paint);
      this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (pointer.isDown) paint(pointer);
      });
      this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => host.wheel(dy));
    }
  };
}
