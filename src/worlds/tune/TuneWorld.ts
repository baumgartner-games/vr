import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { TextPlane } from '../../ui/TextPlane';
import { InputModel } from './InputModel';
import { GhostTable, RAIL_REACH } from './GhostTable';
import {
  clampTable,
  clearTableSettings,
  onTableChange,
  saveTableSettings,
  tableFieldLabel,
  tableSettings,
  TABLE_FIELDS,
  type TableField,
  type TableSettings,
} from './tableSettings';
import { GRAB_GLOW } from '../../core/colors';
import type { WorldContext } from '../../core/types';
import type { ControllerState, Handedness } from '../../core/XRInput';

const ROOM = { half: 3.4, height: 3, thickness: 0.3 };
/** Where the two models hang: eye height, an arm's length out, one per side. */
const MODEL_Y = 1.42;
const MODEL_Z = -1.15;
const MODEL_X = 0.34;

/** Ein Knopf an der Wand: die Tafel, was sie tut und was gerade daraufsteht. */
interface WallButton {
  plane: TextPlane;
  run(): void;
  /** Schreibt die aktuelle Beschriftung — über `label`, nie direkt. */
  refresh(): void;
  /** Was zuletzt daraufstand. Ein Canvas ohne Not neu zu zeichnen ist teuer. */
  last: string;
}

const _hand = new THREE.Vector3();

/**
 * Eingaberaum: a room whose only job is to show you what your hands are doing.
 *
 * Every other world answers the question "did that button register?" with the
 * game itself — you pull something and see whether anything happens, and when
 * nothing does you have no idea whether the runtime missed the press, the tool
 * ignored it or the hand was never tracked at all. That is a bad way to set up
 * a grip, and an impossible way to work out a hand-tracking gesture.
 *
 * So, **an der vorderen Wand**: two **controllers in the air** at eye level,
 * turning as yours turn, every button lighting up as it goes down and the
 * stick and trigger actually moving. With bare hands they give way to five
 * bars — how far each finger is folded onto the palm — and the two lamps for
 * what that was read as: **middle, ring and little finger on the palm is
 * Greifen, the index finger on the palm is the Trigger**
 * (`handGestures.ts`). On the wall behind them the same thing in words, so it
 * can be read at a glance and out loud.
 *
 * **An der rechten Wand steht ein Tisch**, und darauf liegt eine Geisterhand.
 * Das ist der zweite Teil der Antwort und der wichtigere für die Haltung: eine
 * Handhaltung im Leeren einzustellen ist Raten, weil der Arm sich mitbewegt.
 * Auf einem Tisch nicht. Stell die Höhe auf die deines echten Tisches, leg die
 * Hand darauf — und was dann nicht deckungsgleich ist, ist genau die Zahl, die
 * verstellt gehört. Die Knöpfe daneben schalten um, was daraufliegt
 * (Controller oder Hand, links oder rechts), und stellen Höhe und Ausrichtung
 * ein; die Höhe geht auch, indem man die türkise Leiste am Tisch greift und
 * schiebt (`GhostTable.ts`, `tableSettings.ts`).
 *
 * **Hier läuft niemand** — normalerweise. Der Stick bewegt nicht und dreht
 * nicht (`PlayerRig.locked`), weil der ganze Sinn ist, eine Haltung zu halten
 * und sie anzusehen, und ein Stick, der einen dabei aus dem Raum trägt, ist
 * nur Lärm. Nur: der Tisch steht rechts, und wer im Sessel sitzt, kommt nicht
 * hin. Also gibt es an der Wand einen **Knopf, der den Stick freigibt** —
 * ausdrücklich und sichtbar, statt dass es einfach so geht.
 *
 * Everything else is the portal lab's, which is exactly why this is a world
 * and not a menu page: the belt, the tool shelf, the **Werkzeug-Justierer**
 * and the whole *Einstellungen → Hände* tree come with it, so the hand you are
 * watching is the hand you are setting up.
 */
export class TuneWorld extends PortalWorld {
  private readonly models = new Map<Handedness, InputModel>();
  private readonly boards = new Map<Handedness, TextPlane>();
  private readonly buttons: WallButton[] = [];
  private table: GhostTable | null = null;
  /**
   * Der Stand der Dinge, im Speicher.
   *
   * Beim Schieben an der Griffleiste ändert sich die Höhe jede Frame, und
   * `localStorage` jede Frame zu beschreiben (und danach neun Schilder neu zu
   * zeichnen) ist genau die Sorte Kleinigkeit, die ein Headset stocken lässt.
   * Also läuft der Zug hier durch, und geschrieben wird beim Loslassen.
   */
  private state: TableSettings = tableSettings();
  /** Meldet sich ab, wenn die Welt geht — sonst hört ein toter Tisch weiter zu. */
  private unsubscribe: (() => void) | null = null;
  /** Wer gerade die Leiste hält, wo seine Hand war und wie hoch der Tisch stand. */
  private lift: { hand: Handedness; startY: number; startHeight: number } | null = null;
  private readonly shell = new THREE.MeshStandardMaterial({
    color: 0xe9edf5,
    roughness: 0.8,
    metalness: 0.05,
  });
  private readonly floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x9aa4bb,
    roughness: 0.9,
  });

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // No walking, no snap turn — the head still goes wherever it likes. Der
    // Knopf an der Wand gibt das Drehen wieder frei.
    ctx.rig.locked = true;
    for (const button of this.buttons) {
      ctx.pointer.add({
        object: button.plane,
        onSelect: () => button.run(),
        onHover: () => button.plane.setHighlight(true),
        onBlur: () => button.plane.setHighlight(false),
      });
    }
    // Eine Änderung kommt aus drei Richtungen — Knopf, Tastatur, Griffleiste —
    // und muss immer beides nachziehen: den Tisch und die Beschriftungen.
    this.unsubscribe = onTableChange(() => this.showTable(tableSettings()));
    this.showTable(tableSettings());
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    for (const side of ['left', 'right'] as const) {
      const model = this.models.get(side);
      const board = this.boards.get(side);
      if (!model || !board) continue;
      const line = model.show(ctx.input.get(side));
      // A canvas redraw per frame for a line that has not changed is the
      // cheapest way there is to make a headset stutter.
      if (line === model.lastLine) continue;
      model.lastLine = line;
      board.setText(side === 'left' ? 'Linke Hand' : 'Rechte Hand', line, 0x9fe3ff);
    }
    this.updateLift(ctx);
  }

  override dispose(ctx: WorldContext): void {
    ctx.rig.locked = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
    for (const model of this.models.values()) model.dispose();
    this.models.clear();
    for (const board of this.boards.values()) board.dispose();
    this.boards.clear();
    for (const button of this.buttons) {
      ctx.pointer.remove(button.plane);
      button.plane.dispose();
    }
    this.buttons.length = 0;
    this.table?.dispose();
    this.table = null;
    this.lift = null;
    this.shell.dispose();
    this.floorMaterial.dispose();
    super.dispose(ctx);
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 0.9);
  }

  protected override skyColor(): number {
    return 0x121826;
  }

  protected override lightIntensity(): number {
    return 0.9;
  }

  protected override welcome(): string {
    return 'Drück, was du prüfen willst — Wand und Tisch sagen, was ankommt';
  }

  /**
   * The adjuster on one hip and the pistol on the other: the two things you
   * come here to set up, one measured against the other.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['adjust', 'left'],
      ['pistol', 'right'],
    ];
  }

  /**
   * The whole room, and no props: this place is about the hands, not about
   * crates. (`buildProps` is never reached — the base class only calls it from
   * the `buildEnvironment` this replaces.)
   */
  protected override buildEnvironment(): void {
    const { half, height, thickness } = ROOM;
    const room = new THREE.Group();
    room.name = 'tune-room';
    this.root.add(room);

    this.slab(room, this.floorMaterial, [half * 2, thickness, half * 2], [0, -thickness / 2, 0], true);
    this.slab(room, this.shell, [half * 2, thickness, half * 2], [0, height + thickness / 2, 0], false);
    this.slab(room, this.shell, [half * 2, height, thickness], [0, height / 2, -half], true);
    this.slab(room, this.shell, [half * 2, height, thickness], [0, height / 2, half], false);
    this.slab(room, this.shell, [thickness, height, half * 2], [-half, height / 2, 0], false);
    this.slab(room, this.shell, [thickness, height, half * 2], [half, height / 2, 0], false);

    const title = new TextPlane({
      width: 2.4,
      height: 0.44,
      title: 'Eingaberaum',
      body: 'Greifen = Mittel-, Ring- und kleiner Finger an der Handfläche · Trigger = Zeigefinger',
      accent: 0x4aa8ff,
      align: 'center',
    });
    title.position.set(0, 2.32, -half + thickness / 2 + 0.02);
    room.add(title);

    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? -1 : 1;

      const model = new InputModel(side);
      model.position.set(sign * MODEL_X, MODEL_Y, MODEL_Z);
      room.add(model);
      this.models.set(side, model);

      // The words go straight behind the model it belongs to, so the eye does
      // not have to hunt for which board is which hand.
      const board = new TextPlane({
        width: 1.5,
        height: 0.5,
        title: side === 'left' ? 'Linke Hand' : 'Rechte Hand',
        body: 'nicht getrackt',
        accent: 0x9fe3ff,
      });
      board.position.set(sign * 0.82, 1.62, -half + thickness / 2 + 0.02);
      room.add(board);
      this.boards.set(side, board);
    }

    const hint = new TextPlane({
      width: 2.6,
      height: 0.4,
      title: 'Hier läuft niemand',
      body: 'Stick bewegt und dreht nicht — der Knopf rechts daneben gibt ihn frei',
      accent: 0x6f7d99,
      align: 'center',
    });
    hint.position.set(0, 0.72, -half + thickness / 2 + 0.02);
    room.add(hint);

    this.buildTurnButton(room);
    this.buildTable(room);
  }

  // --- der Knopf, der das Drehen freigibt -----------------------------------

  /**
   * Direkt neben dem Hinweis, dass hier niemand läuft — dort wird man ihn
   * suchen, und dort widerspricht er dem Schild, das gerade gelesen wurde.
   */
  private buildTurnButton(room: THREE.Group): void {
    const { half, thickness } = ROOM;
    const button = this.wallButton(room, 1.5, 0.34, () => {
      const ctx = this.context;
      if (!ctx) return;
      ctx.rig.locked = !ctx.rig.locked;
      this.refreshButtons();
      ctx.notify(ctx.rig.locked ? 'Stick gesperrt' : 'Stick frei — bewegen und drehen');
    });
    button.plane.position.set(1.9, 0.72, -half + thickness / 2 + 0.02);
    button.refresh = () => {
      const locked = this.context?.rig.locked !== false;
      this.label(
        button,
        locked ? 'Stick freigeben' : 'Stick sperren',
        locked ? 'Antippen erlaubt Drehen und Gehen' : 'Stick dreht und geht · zum Tisch rechts',
        locked ? 0x6f7d99 : GRAB_GLOW,
      );
    };
  }

  // --- der Tisch mit der Geisterhand ----------------------------------------

  private buildTable(room: THREE.Group): void {
    const { half, thickness } = ROOM;
    const table = new GhostTable();
    // Rechts an der Wand, quer dazu: die Platte zeigt in den Raum, damit man
    // seitlich davorsitzen und die eigene Hand danebenlegen kann.
    table.position.set(half - 0.75, 0, -0.3);
    table.rotation.y = -Math.PI / 2;
    room.add(table);
    this.table = table;

    const sign = new TextPlane({
      width: 1.6,
      height: 0.42,
      title: 'Tisch mit Geisterhand',
      body: 'Höhe wie dein echter Tisch, dann die Hand darauflegen · türkise Leiste hebt ihn',
      accent: 0x9fe3ff,
      align: 'center',
    });
    sign.position.set(half - thickness / 2 - 0.02, 2.3, -0.3);
    sign.rotation.y = -Math.PI / 2;
    room.add(sign);

    // Die Knopfleiste an der Wand hinter dem Tisch: was daraufliegt, und die
    // Zahlen dazu. Zwei Spalten, damit die Säule nicht bis zur Decke wächst.
    const rows: Array<{ refresh(button: WallButton): void; run(): void }> = [
      {
        refresh: (button) => {
          const kind = this.state.kind;
          this.label(
            button,
            kind === 'hand' ? 'Auf dem Tisch: Hand' : 'Auf dem Tisch: Controller',
            'Antippen wechselt',
            0x9fe3ff,
          );
        },
        run: () => {
          const next = saveTableSettings({
            kind: this.state.kind === 'hand' ? 'controller' : 'hand',
          });
          this.context?.notify(next.kind === 'hand' ? 'Hand liegt auf dem Tisch' : 'Controller liegt auf dem Tisch');
        },
      },
      {
        refresh: (button) => {
          const side = this.state.side;
          this.label(
            button,
            side === 'left' ? 'Seite: links' : 'Seite: rechts',
            'Welche der beiden daliegt',
            0x9fe3ff,
          );
        },
        run: () => {
          const next = saveTableSettings({
            side: this.state.side === 'left' ? 'right' : 'left',
          });
          this.context?.notify(next.side === 'left' ? 'Linke Hand liegt' : 'Rechte Hand liegt');
        },
      },
      ...TABLE_FIELDS.map((field) => ({
        refresh: (button: WallButton) => {
          this.label(
            button,
            `${field.label}: ${tableFieldLabel(field, this.state[field.key])}`,
            field.sub,
            0x9fe3ff,
          );
        },
        run: () => this.askTableField(field),
      })),
      {
        refresh: (button: WallButton) => {
          this.label(button, 'Tisch zurücksetzen', 'Höhe, Lage und Ausrichtung', 0xffc857);
        },
        run: () => {
          clearTableSettings();
          this.context?.notify('Tisch zurückgesetzt');
        },
      },
    ];

    rows.forEach((row, index) => {
      const button = this.wallButton(room, 0.86, 0.26, row.run);
      const column = index % 2;
      const line = Math.floor(index / 2);
      button.plane.position.set(
        half - thickness / 2 - 0.02,
        1.95 - line * 0.3,
        -0.3 + (column === 0 ? 0.46 : -0.46),
      );
      button.plane.rotation.y = -Math.PI / 2;
      button.refresh = () => row.refresh(button);
    });
  }

  /** Tisch und Schilder auf denselben Stand — der einzige Weg dorthin. */
  private showTable(settings: TableSettings): void {
    this.state = settings;
    this.table?.apply(settings);
    this.refreshButtons();
  }

  /** Eine Zahl des Tisches über die Tastatur — Zentimeter und Grad. */
  private askTableField(field: TableField): void {
    const before = this.state[field.key];
    this.askNumber({
      title: field.label,
      sub: `Tisch · ${field.min} bis ${field.max} ${field.unit}`.trim(),
      value: String(before),
      hint: field.sub,
      // Live: der Tisch bewegt sich, während die Zahl noch getippt wird. 74
      // sagt auf dem Papier nichts, ein Tisch auf Ellbogenhöhe alles.
      preview: (value) => {
        saveTableSettings({ [field.key]: value } as Partial<TableSettings>);
      },
      // Abgebrochen heißt abgebrochen — sonst bliebe die letzte getippte
      // Ziffer als Einstellung stehen.
      cancel: () => {
        saveTableSettings({ [field.key]: before } as Partial<TableSettings>);
      },
      commit: (value) => {
        const applied = saveTableSettings({ [field.key]: value } as Partial<TableSettings>);
        this.context?.notify(`${field.label}: ${tableFieldLabel(field, applied[field.key])}`);
      },
    });
  }

  /**
   * Die Griffleiste am Tisch: anfassen und schieben.
   *
   * Das ist die Hälfte, die man in der Brille braucht — die andere ist die
   * Tastatur, wenn der Zollstock danebenliegt. Gerechnet wird gegen die Höhe,
   * die beim Zupacken galt, nicht gegen die letzte Frame: sonst summieren sich
   * Rundungsfehler zu einem Tisch, der langsam davonwandert.
   */
  private updateLift(ctx: WorldContext): void {
    const table = this.table;
    if (!table) return;

    const lift = this.lift;
    if (lift) {
      const controller = ctx.input.get(lift.hand);
      if (!controller?.tracked || !controller.squeeze.pressed) {
        this.lift = null;
        table.setRailGlow(false);
        // Erst beim Loslassen in den Speicher — und dann einmal richtig.
        this.showTable(saveTableSettings({ height: this.state.height }));
        ctx.notify(`Tischhöhe: ${Math.round(this.state.height)} cm`);
        return;
      }
      handPosition(controller, _hand);
      this.showTable(
        clampTable({ ...this.state, height: lift.startHeight + (_hand.y - lift.startY) * 100 }),
      );
      table.setRailGlow(true);
      return;
    }

    let near = false;
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand || !controller.tracked) continue;
      handPosition(controller, _hand);
      if (table.railDistance(_hand) > RAIL_REACH) continue;
      near = true;
      if (!controller.squeeze.justPressed) continue;
      this.lift = { hand, startY: _hand.y, startHeight: this.state.height };
      controller.pulse(0.4, 25);
      break;
    }
    table.setRailGlow(near);
  }

  // --- Knöpfe an der Wand ---------------------------------------------------

  /**
   * Eine Tafel, auf die gezeigt und gedrückt wird. Der Pointer nimmt sie erst
   * in `init` an — hier wird nur gebaut, weil die Welt zu diesem Zeitpunkt
   * noch keinen Kontext hat.
   */
  private wallButton(room: THREE.Group, width: number, height: number, run: () => void): WallButton {
    const plane = new TextPlane({ width, height, title: '', accent: 0x9fe3ff, align: 'center' });
    room.add(plane);
    const button: WallButton = { plane, run, refresh: () => undefined, last: '' };
    this.buttons.push(button);
    return button;
  }

  /** Alle Beschriftungen neu — jede Änderung geht hier durch. */
  private refreshButtons(): void {
    for (const button of this.buttons) button.refresh();
  }

  /**
   * Eine Beschriftung, aber nur, wenn sie sich geändert hat.
   *
   * Beim Schieben an der Griffleiste läuft das hier jede Frame durch; neun
   * 512er-Canvas pro Frame neu zu zeichnen ist der billigste Weg, ein Headset
   * zum Stocken zu bringen — und acht davon stehen dabei ohnehin still.
   */
  private label(button: WallButton, title: string, body: string, accent: number): void {
    const line = `${title}|${body}|${accent}`;
    if (line === button.last) return;
    button.last = line;
    button.plane.setText(title, body, accent);
  }
}

function handPosition(controller: ControllerState, target: THREE.Vector3): THREE.Vector3 {
  const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
  return anchor.getWorldPosition(target);
}
