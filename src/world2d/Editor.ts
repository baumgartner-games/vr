import type { Level, TileId } from './level';
import { TILES, drawTileThumb } from './tiles';
import type { EditTool } from './World2D';

/**
 * **Der kleine Editor** — eine Leiste am rechten Rand: Werkzeug, Ebene,
 * Palette, Raster. Was man malt, landet sofort im Plan (`World2D.paint`) und
 * bleibt im Browser (`level.saveLevel`).
 *
 * DOM, kein Phaser: Die Leiste ist eine Seite wie das Menü (`ui/PageMenu.ts`),
 * mit Knöpfen, die ein Daumen trifft. Phaser bekommt nur den Zeiger auf der
 * Karte — welche Kachel und welche Ebene gerade dran sind, steht hier.
 */

export interface EditorOptions {
  host: HTMLElement;
  onTool: (tool: EditTool) => void;
  onBrush: (id: TileId) => void;
  onLayer: (id: string) => void;
  onLayerVisible: (id: string, on: boolean) => void;
  onGrid: (on: boolean) => void;
  onClose: () => void;
  onReset: () => void;
}

export class Editor {
  readonly element: HTMLElement;
  private readonly tools: HTMLElement;
  private readonly layers: HTMLElement;
  private readonly palette: HTMLElement;
  private readonly gridButton: HTMLButtonElement;
  private readonly options: EditorOptions;
  private level: Level | null = null;
  private brush: TileId = 1;
  private editLayer = 'ground';

  constructor(options: EditorOptions) {
    this.options = options;
    this.element = el('aside', 'w2d-editor');
    this.element.hidden = true;
    this.element.setAttribute('aria-label', 'Level-Editor');

    const head = el('header', 'w2d-editor__head');
    head.append(el('strong', '', 'Editor'));
    const close = button('w2d-editor__x', '×', () => options.onClose());
    close.setAttribute('aria-label', 'Editor schließen');
    head.append(close);

    this.tools = el('div', 'w2d-editor__row');
    this.tools.append(
      button('w2d-editor__key', 'Malen', () => options.onTool('paint'), { tool: 'paint' }),
      button('w2d-editor__key', 'Radieren', () => options.onTool('erase'), { tool: 'erase' }),
    );
    this.gridButton = button('w2d-editor__key', 'Raster', () =>
      options.onGrid(this.gridButton.getAttribute('aria-pressed') !== 'true'),
    );
    this.gridButton.setAttribute('aria-pressed', 'false');
    this.tools.append(this.gridButton);

    this.layers = el('div', 'w2d-editor__layers');
    this.palette = el('div', 'w2d-editor__palette');

    const foot = el('div', 'w2d-editor__row');
    foot.append(
      button('w2d-editor__key w2d-editor__key--ghost', 'Zurücksetzen', () => options.onReset()),
    );

    this.element.append(
      head,
      el('p', 'w2d-editor__hint', 'Auf die Karte tippen malt; Rad oder zwei Finger zoomen.'),
      this.tools,
      el('h3', 'w2d-editor__title', 'Ebenen'),
      this.layers,
      el('h3', 'w2d-editor__title', 'Kacheln'),
      this.palette,
      foot,
    );
    options.host.append(this.element);
    this.renderPalette();
    this.setTool('paint');
    this.setBrush(1);
  }

  show(on: boolean): void {
    this.element.hidden = !on;
  }

  setLevel(level: Level): void {
    this.level = level;
    this.renderLayers();
  }

  setTool(tool: EditTool): void {
    for (const key of this.tools.querySelectorAll<HTMLButtonElement>('[data-tool]')) {
      key.classList.toggle('is-active', key.dataset['tool'] === tool);
    }
  }

  setBrush(id: TileId): void {
    this.brush = id;
    for (const key of this.palette.querySelectorAll<HTMLButtonElement>('[data-tile]')) {
      key.classList.toggle('is-active', Number(key.dataset['tile']) === id);
    }
  }

  setEditLayer(id: string): void {
    this.editLayer = id;
    for (const key of this.layers.querySelectorAll<HTMLButtonElement>('[data-layer]')) {
      key.classList.toggle('is-active', key.dataset['layer'] === id);
    }
  }

  setGrid(on: boolean): void {
    this.gridButton.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.gridButton.classList.toggle('is-active', on);
  }

  dispose(): void {
    this.element.remove();
  }

  private renderLayers(): void {
    const level = this.level;
    this.layers.replaceChildren();
    if (!level) return;
    // Von oben nach unten, wie sie im Bild liegen.
    for (const layer of [...level.layers].reverse()) {
      const row = el('div', 'w2d-editor__layer');
      const pick = button('w2d-editor__key w2d-editor__key--grow', layer.name, () =>
        this.options.onLayer(layer.id),
      );
      pick.dataset['layer'] = layer.id;
      pick.classList.toggle('is-active', layer.id === this.editLayer);
      const eye = button('w2d-editor__eye', layer.visible ? '●' : '○', () =>
        this.options.onLayerVisible(layer.id, !layer.visible),
      );
      eye.setAttribute(
        'aria-label',
        `${layer.name} ${layer.visible ? 'ausblenden' : 'einblenden'}`,
      );
      eye.setAttribute('aria-pressed', layer.visible ? 'true' : 'false');
      row.append(pick, eye);
      this.layers.append(row);
    }
  }

  private renderPalette(): void {
    this.palette.replaceChildren();
    for (const tile of TILES) {
      const key = button('w2d-editor__tile', '', () => this.options.onBrush(tile.id));
      key.dataset['tile'] = String(tile.id);
      key.title = `${tile.name}${tile.solid ? ' · fest' : ''}`;
      key.setAttribute('aria-label', key.title);
      key.append(drawTileThumb(tile));
      const name = el('small', '', tile.name);
      key.append(name);
      key.classList.toggle('is-active', tile.id === this.brush);
      this.palette.append(key);
    }
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(
  className: string,
  text: string,
  onClick: () => void,
  data?: Record<string, string>,
): HTMLButtonElement {
  const node = el('button', className, text);
  node.type = 'button';
  if (data) for (const [key, value] of Object.entries(data)) node.dataset[key] = value;
  node.addEventListener('click', onClick);
  return node;
}
