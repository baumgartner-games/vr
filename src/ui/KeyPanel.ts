import * as THREE from 'three';
import type { PointerHit, PointerTarget } from '../core/Pointer';
import { beginTextEntry, endTextEntry } from '../core/textEntry';
import { openSystemInput, useSystemKeyboard, type SystemInput } from '../core/systemKeyboard';

const CANVAS_W = 1024;
const CANVAS_H = 640;
const PAD = 26;
const HEADER_H = 190;
/**
 * Mehrzeilig bekommt das Feld mehr als das Doppelte an Höhe.
 *
 * Ein Schild zu tippen und dabei nur die letzte Zeile zu sehen ist dasselbe,
 * wie durch einen Strohhalm zu schreiben: Man weiß nach vier Zeilen nicht
 * mehr, ob die Überschrift eine war.
 */
const HEADER_LINES_H = 330;
const GAP = 8;

/** What a key does when it is hit. */
type KeyAction =
  | { kind: 'char'; char: string }
  | { kind: 'back' }
  | { kind: 'clear' }
  | { kind: 'paste' }
  | { kind: 'copy' }
  | { kind: 'ok' }
  | { kind: 'cancel' };

interface Key {
  label: string;
  action: KeyAction;
  /** How many cells wide, 1 by default. */
  span?: number;
  accent?: string;
}

export interface KeyPanelRequest {
  title: string;
  /** What is being typed, under the title. */
  sub?: string;
  /** Starting text. */
  value?: string;
  /**
   * Zifferblock, die Zeichen eines Konfig-Codes — oder dieselben Buchstaben mit
   * einer Leertaste, für alles, was ein Mensch sich ausdenkt (`name`).
   *
   * `lines` ist der vierte Fall und der einzige mehrzeilige: ein ganzes Schild
   * mit Umlauten, Satzzeichen und den Zeichen, aus denen Markdown besteht.
   */
  layout: 'number' | 'text' | 'name' | 'lines';
  /** Shown under the field — the range, the format, whatever helps. */
  hint?: string;
  /** Called with every keystroke, so a value can be tried out live. */
  onPreview?(text: string): void;
  onCommit(text: string): void;
  onCancel?(): void;
}

const NUMBER_ROWS: Key[][] = [
  [
    { label: '7', action: { kind: 'char', char: '7' } },
    { label: '8', action: { kind: 'char', char: '8' } },
    { label: '9', action: { kind: 'char', char: '9' } },
    { label: '←', action: { kind: 'back' }, accent: '#ffb35c' },
  ],
  [
    { label: '4', action: { kind: 'char', char: '4' } },
    { label: '5', action: { kind: 'char', char: '5' } },
    { label: '6', action: { kind: 'char', char: '6' } },
    { label: 'C', action: { kind: 'clear' }, accent: '#ffb35c' },
  ],
  [
    { label: '1', action: { kind: 'char', char: '1' } },
    { label: '2', action: { kind: 'char', char: '2' } },
    { label: '3', action: { kind: 'char', char: '3' } },
    { label: '−', action: { kind: 'char', char: '-' } },
  ],
  [
    { label: '0', action: { kind: 'char', char: '0' } },
    { label: ',', action: { kind: 'char', char: '.' } },
    { label: 'Abbrechen', action: { kind: 'cancel' }, accent: '#ff7a7a' },
    { label: 'OK', action: { kind: 'ok' }, accent: '#5ee0a0' },
  ],
];

/** The letters a config code is made of — base64url and nothing else. */
const TEXT_ROWS: Key[][] = [
  row('0123456789-_'),
  row('ABCDEFGHIJKLM'),
  row('NOPQRSTUVWXYZ'),
  row('abcdefghijklm'),
  row('nopqrstuvwxyz'),
  [
    { label: '←', action: { kind: 'back' }, span: 2, accent: '#ffb35c' },
    { label: 'Leeren', action: { kind: 'clear' }, span: 2, accent: '#ffb35c' },
    { label: 'Einfügen', action: { kind: 'paste' }, span: 3, accent: '#9fd0ff' },
    { label: 'Kopieren', action: { kind: 'copy' }, span: 2, accent: '#9fd0ff' },
    { label: 'Abbrechen', action: { kind: 'cancel' }, span: 2, accent: '#ff7a7a' },
    { label: 'OK', action: { kind: 'ok' }, span: 2, accent: '#5ee0a0' },
  ],
];

/**
 * Dieselben Buchstaben, aber mit **Leertaste** — und ohne Kopieren/Einfügen.
 *
 * Ein Name ist nichts, was man aus der Zwischenablage holt, und „Nils B" ohne
 * Leerzeichen einzutippen ist eine Zumutung. Der Konfig-Code umgekehrt darf
 * kein Leerzeichen enthalten, also bekommt er auch keine Taste dafür.
 */
const NAME_ROWS: Key[][] = [
  ...TEXT_ROWS.slice(0, TEXT_ROWS.length - 1),
  [
    { label: '←', action: { kind: 'back' }, span: 2, accent: '#ffb35c' },
    { label: 'Leeren', action: { kind: 'clear' }, span: 2, accent: '#ffb35c' },
    { label: 'Leertaste', action: { kind: 'char', char: ' ' }, span: 3 },
    { label: 'Abbrechen', action: { kind: 'cancel' }, span: 3, accent: '#ff7a7a' },
    { label: 'OK', action: { kind: 'ok' }, span: 3, accent: '#5ee0a0' },
  ],
];

/**
 * **Die Schreibmaschine** — für alles, was mehr als eine Zeile ist.
 *
 * Vierzehn Spalten statt dreizehn, und in der sechsten Reihe stehen die
 * Zeichen, an denen sonst jedes Schild scheitert: Umlaute, Satzzeichen und die
 * eckigen Klammern, ohne die kein Markdown-Link zustande kommt. Der Rest —
 * `@`, `;`, alles Seltene — bleibt der Systemtastatur überlassen; eine Tafel,
 * auf der jedes Zeichen der Welt steht, hat Tasten von der Größe eines
 * Reiskorns.
 */
const LINE_ROWS: Key[][] = [
  row('0123456789#*-_'),
  row('ABCDEFGHIJKLMN'),
  row('OPQRSTUVWXYZÄÖ'),
  row('abcdefghijklmn'),
  row('opqrstuvwxyzäö'),
  row('üßÜ.,:!?()[]/>'),
  [
    { label: '←', action: { kind: 'back' }, span: 2, accent: '#ffb35c' },
    { label: 'Leeren', action: { kind: 'clear' }, span: 2, accent: '#ffb35c' },
    { label: 'Leertaste', action: { kind: 'char', char: ' ' }, span: 4 },
    { label: '⏎ Zeile', action: { kind: 'char', char: '\n' }, span: 2, accent: '#9fd0ff' },
    { label: 'Abbrechen', action: { kind: 'cancel' }, span: 2, accent: '#ff7a7a' },
    { label: 'Fertig', action: { kind: 'ok' }, span: 2, accent: '#5ee0a0' },
  ],
];

function row(chars: string): Key[] {
  return [...chars].map((char) => ({ label: char, action: { kind: 'char', char } }) as Key);
}

/**
 * A keyboard you can point at.
 *
 * The wrist menu can step a value through a few notches, but "make the
 * magazine hold 23" and "here is the config code somebody read out to me" both
 * need real typing, and a headset has nowhere to type. So: a panel of keys in
 * front of you, hit with the same pointer as everything else.
 *
 * Vier Belegungen, weil vier Aufgaben: ein Zifferblock für die nackten Werte,
 * die 64 Zeichen eines Konfig-Codes — mit **Einfügen** und **Kopieren**, die am
 * Schreibtisch das sind, was wirklich benutzt wird —, dieselben Buchstaben mit
 * Leertaste für einen Namen, und die mehrzeilige Schreibmaschine für ein
 * ganzes Schild.
 *
 * A real keyboard, if there is one, types into it as well — und in der Brille
 * kommt, wo es sie gibt, die **Systemtastatur des Geräts** dazu
 * (`core/systemKeyboard.ts`). Sie tritt neben diese Tafel und nicht an ihre
 * Stelle: Ob eine Quest ihre Tastatur wirklich einblendet, erfährt kein
 * Programm, und eine Eingabe, die auf einer unsichtbaren Zusage beruht, hat
 * man dann gar nicht.
 */
export class KeyPanel extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;
  private request: KeyPanelRequest | null = null;
  private text = '';
  private status = '';
  private hover = -1;
  private rows: Key[][] = NUMBER_ROWS;
  private readonly keys: Array<{ key: Key; x: number; y: number; w: number; h: number }> = [];
  private readonly onKeyDown: (event: KeyboardEvent) => void;
  /** Das Feld des Geräts, solange eines offen ist (`core/systemKeyboard.ts`). */
  private bridge: SystemInput | null = null;
  /** Wie hoch der Kopf gerade ist — mehrzeilig braucht er mehr. */
  private header = HEADER_H;

  constructor(width = 0.42) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    super(
      new THREE.PlaneGeometry(width, (width * CANVAS_H) / CANVAS_W),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false }),
    );

    this.ctx = canvas.getContext('2d')!;
    this.texture = texture;
    this.name = 'key-panel';
    this.renderOrder = 20;
    this.visible = false;
    this.geometry.computeBoundingBox();

    // Anybody at a desk types instead of pointing — and in the headset this
    // simply never fires.
    this.onKeyDown = (event) => this.handlePhysicalKey(event);
    window.addEventListener('keydown', this.onKeyDown);
  }

  get isOpen(): boolean {
    return this.request !== null;
  }

  /** The field this panel is currently editing, for whoever asked for it. */
  get openRequest(): KeyPanelRequest | null {
    return this.request;
  }

  open(request: KeyPanelRequest): void {
    // Already open on another field: the old entry ends before the new begins.
    if (this.request) endTextEntry();
    this.closeBridge();
    beginTextEntry();
    this.request = request;
    this.text = request.value ?? '';
    this.rows =
      request.layout === 'lines'
        ? LINE_ROWS
        : request.layout === 'text'
          ? TEXT_ROWS
          : request.layout === 'name'
            ? NAME_ROWS
            : NUMBER_ROWS;
    this.header = request.layout === 'lines' ? HEADER_LINES_H : HEADER_H;
    this.status = '';
    this.hover = -1;
    this.visible = true;
    this.openBridge();
    this.layout();
    this.draw();
  }

  close(): void {
    if (this.request) endTextEntry();
    this.closeBridge();
    this.request = null;
    this.visible = false;
  }

  /**
   * Die Tastatur des Geräts dazuholen, wenn es eine gibt.
   *
   * Sie tritt **neben** die Tafel und nicht an ihre Stelle: Was dort getippt
   * wird, steht hier, und was hier getippt wird, steht dort. Ob die Quest ihre
   * Tastatur wirklich einblendet, erfährt kein Programm — also darf nichts
   * davon abhängen.
   */
  private openBridge(): void {
    const request = this.request;
    if (!request || !useSystemKeyboard()) return;
    this.bridge = openSystemInput({
      value: this.text,
      multiline: request.layout === 'lines',
      label: request.title,
      onChange: (text) => {
        this.text = request.layout === 'lines' ? text : text.replace(/\n/g, '');
        this.status = '';
        request.onPreview?.(this.text);
        this.draw();
      },
      onCommit: (text) => {
        this.text = text;
        this.run({ kind: 'ok' });
      },
      onCancel: () => this.run({ kind: 'cancel' }),
      onBlur: () => {
        this.status = 'Systemtastatur zu · auf das Feld tippen holt sie zurück';
        this.draw();
      },
    });
    if (this.bridge) this.status = 'Systemtastatur angefordert';
  }

  private closeBridge(): void {
    this.bridge?.close();
    this.bridge = null;
  }

  asPointerTarget(): PointerTarget {
    return {
      object: this,
      pokeable: true,
      onHover: (hit) => this.setHover(hit.uv ? this.indexAt(hit.uv) : -1),
      onBlur: () => this.setHover(-1),
      onSelect: (hit) => this.select(hit),
    };
  }

  dispose(): void {
    this.close();
    window.removeEventListener('keydown', this.onKeyDown);
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.removeFromParent();
  }

  // --- input ---------------------------------------------------------------

  private select(hit: PointerHit): void {
    const index = hit.uv ? this.indexAt(hit.uv) : -1;
    if (index < 0) {
      // Auf das Feld getippt: Die Systemtastatur schließt sich, sobald das Feld
      // den Fokus verliert — irgendwo hinzufassen ist die einzige Geste, mit
      // der man sie in der Brille zurückholt.
      if (hit.uv && (1 - hit.uv.y) * CANVAS_H < this.header) this.bridge?.focus();
      return;
    }
    this.run(this.keys[index]!.key.action);
  }

  private handlePhysicalKey(event: KeyboardEvent): void {
    if (!this.request) return;
    // Das Feld des Geräts hat den Anschlag schon; hier käme er ein zweites Mal an.
    if (this.bridge) return;
    if (event.key === 'Enter') this.run({ kind: 'ok' });
    else if (event.key === 'Escape') this.run({ kind: 'cancel' });
    else if (event.key === 'Backspace') this.run({ kind: 'back' });
    else if (event.key.length === 1) this.run({ kind: 'char', char: event.key });
    else return;
    event.preventDefault();
  }

  private run(action: KeyAction): void {
    const request = this.request;
    if (!request) return;

    switch (action.kind) {
      case 'char':
        this.text += action.char;
        break;
      case 'back':
        this.text = this.text.slice(0, -1);
        break;
      case 'clear':
        this.text = '';
        break;
      case 'paste':
        void this.paste();
        return;
      case 'copy':
        void this.copyOut();
        return;
      case 'ok': {
        const value = this.text;
        this.close();
        request.onCommit(value);
        return;
      }
      case 'cancel':
        this.close();
        request.onCancel?.();
        return;
    }

    this.status = '';
    // Was auf der Tafel getippt wurde, gehört auch ins Feld des Geräts —
    // sonst schreibt die nächste Systemtaste über einem alten Stand weiter.
    this.bridge?.setValue(this.text);
    request.onPreview?.(this.text);
    this.draw();
  }

  private async paste(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      this.text = text.replace(/\s+/g, '');
      this.status = 'Aus der Zwischenablage';
    } catch {
      this.status = 'Zwischenablage nicht erlaubt';
    }
    this.request?.onPreview?.(this.text);
    this.draw();
  }

  private async copyOut(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.text);
      this.status = 'Kopiert';
    } catch {
      this.status = 'Kopieren nicht erlaubt';
    }
    this.draw();
  }

  private setHover(index: number): void {
    if (this.hover === index) return;
    this.hover = index;
    this.draw();
  }

  // --- layout and drawing ---------------------------------------------------

  /** Key rectangles, worked out once per opening. */
  private layout(): void {
    this.keys.length = 0;
    const columns = Math.max(...this.rows.map((r) => r.reduce((sum, k) => sum + (k.span ?? 1), 0)));
    const width = CANVAS_W - PAD * 2;
    const cell = (width - GAP * (columns - 1)) / columns;
    const height = (CANVAS_H - this.header - PAD - GAP * (this.rows.length - 1)) / this.rows.length;

    this.rows.forEach((row, r) => {
      let x = PAD;
      for (const key of row) {
        const span = key.span ?? 1;
        const w = cell * span + GAP * (span - 1);
        this.keys.push({ key, x, y: this.header + r * (height + GAP), w, h: height });
        x += w + GAP;
      }
    });
  }

  private indexAt(uv: THREE.Vector2): number {
    const x = uv.x * CANVAS_W;
    const y = (1 - uv.y) * CANVAS_H;
    return this.keys.findIndex(
      (slot) => x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h,
    );
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.beginPath();
    ctx.roundRect(0, 0, CANVAS_W, CANVAS_H, 34);
    ctx.fillStyle = 'rgba(9, 14, 26, 0.95)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(140, 180, 255, 0.4)';
    ctx.stroke();

    const request = this.request;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.fillText(request?.title ?? '', PAD, 58);
    if (request?.sub) {
      ctx.fillStyle = '#93a3c4';
      ctx.font = '400 26px system-ui, sans-serif';
      ctx.fillText(request.sub, PAD, 92);
    }

    // The field itself. Mehrzeilig ist es so hoch, wie der Kopf hergibt.
    const fieldTop = 106;
    const fieldHeight = this.header - fieldTop - 30;
    ctx.beginPath();
    ctx.roundRect(PAD, fieldTop, CANVAS_W - PAD * 2, fieldHeight, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.strokeStyle = '#4aa8ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 30px ui-monospace, monospace';
    if (this.request?.layout === 'lines') {
      // Die **letzten** Zeilen und nicht die ersten: Getippt wird am Ende, und
      // dorthin will man sehen. Der Rest steht danach auf dem Schild.
      const lineHeight = 34;
      const room = Math.max(1, Math.floor((fieldHeight - 20) / lineHeight));
      const lines = wrapField(ctx, this.text, CANVAS_W - PAD * 2 - 36);
      const shown = lines.slice(-room);
      shown.forEach((line, index) => {
        const last = index === shown.length - 1;
        ctx.fillText(last ? `${line}▌` : line, PAD + 18, fieldTop + 34 + index * lineHeight);
      });
    } else {
      const shown = fit(ctx, this.text || ' ', CANVAS_W - PAD * 2 - 40);
      ctx.fillText(`${shown}▌`, PAD + 18, fieldTop + 39);
    }

    const note = this.status || request?.hint || '';
    if (note) {
      ctx.fillStyle = this.status ? '#9fd0ff' : '#71809e';
      ctx.font = '400 22px system-ui, sans-serif';
      ctx.fillText(note, PAD, this.header - 8);
    }

    this.keys.forEach((slot, index) => {
      const hovered = index === this.hover;
      const accent = slot.key.accent ?? '#cfe0ff';
      ctx.beginPath();
      ctx.roundRect(slot.x, slot.y, slot.w, slot.h, 12);
      ctx.fillStyle = hovered ? withAlpha(accent, 0.35) : 'rgba(255,255,255,0.07)';
      ctx.fill();
      ctx.lineWidth = hovered ? 3 : 2;
      ctx.strokeStyle = hovered ? accent : 'rgba(255,255,255,0.14)';
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const size = slot.key.label.length > 2 ? 22 : 30;
      ctx.font = `600 ${size}px system-ui, sans-serif`;
      ctx.fillText(slot.key.label, slot.x + slot.w / 2, slot.y + slot.h / 2 + 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    });

    this.texture.needsUpdate = true;
  }
}

function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

/**
 * Der Text im mehrzeiligen Feld, umgebrochen — ein `\n` bricht, wo es steht.
 *
 * Eine leere Zeile bleibt eine leere Zeile: Sie ist in Markdown der Absatz und
 * damit das Zeichen, an dem man beim Tippen die Gliederung erkennt.
 */
function wrapField(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

/** Long codes are shown from the back — that is where the typing happens. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`…${result}`).width > maxWidth) {
    result = result.slice(1);
  }
  return `…${result}`;
}
