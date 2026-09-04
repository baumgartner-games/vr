import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { TextPlane } from '../../ui/TextPlane';
import { InputModel } from './InputModel';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';

const ROOM = { half: 3.4, height: 3, thickness: 0.3 };
/** Where the two models hang: eye height, an arm's length out, one per side. */
const MODEL_Y = 1.42;
const MODEL_Z = -1.15;
const MODEL_X = 0.34;

/**
 * Eingaberaum: a room whose only job is to show you what your hands are doing.
 *
 * Every other world answers the question "did that button register?" with the
 * game itself — you pull something and see whether anything happens, and when
 * nothing does you have no idea whether the runtime missed the press, the tool
 * ignored it or the hand was never tracked at all. That is a bad way to set up
 * a grip, and an impossible way to work out a hand-tracking gesture.
 *
 * So: two **controllers in the air** at eye level, turning as yours turn, every
 * button lighting up as it goes down and the stick and trigger actually
 * moving. With bare hands they give way to five bars — how far each finger is
 * folded onto the palm — and the two lamps for what that was read as:
 * **middle, ring and little finger on the palm is Greifen, the index finger on
 * the palm is the Trigger** (`handGestures.ts`). On the wall behind them the
 * same thing in words, so it can be read at a glance and out loud.
 *
 * **Nothing walks here.** The stick does not move you and does not turn you
 * (`PlayerRig.locked`) — the head is yours as always. That is deliberate: the
 * whole point is to hold a pose and look at it, and a stick that carries you
 * out of the room while you study your own fingers is nothing but noise.
 *
 * Everything else is the portal lab's, which is exactly why this is a world
 * and not a menu page: the belt, the tool shelf, the **Werkzeug-Justierer**
 * and the whole *Einstellungen → Hände* tree come with it, so the hand you are
 * watching is the hand you are setting up.
 */
export class TuneWorld extends PortalWorld {
  private readonly models = new Map<Handedness, InputModel>();
  private readonly boards = new Map<Handedness, TextPlane>();
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
    // No walking, no snap turn — the head still goes wherever it likes.
    ctx.rig.locked = true;
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
  }

  override dispose(ctx: WorldContext): void {
    ctx.rig.locked = false;
    for (const model of this.models.values()) model.dispose();
    this.models.clear();
    for (const board of this.boards.values()) board.dispose();
    this.boards.clear();
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
    return 'Drück, was du prüfen willst — die Modelle und die Wand sagen, was ankommt';
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
      body: 'Stick bewegt und dreht nicht — Menü → Einstellungen → Hände stellt die Haltungen ein',
      accent: 0x6f7d99,
      align: 'center',
    });
    hint.position.set(0, 0.72, -half + thickness / 2 + 0.02);
    room.add(hint);
  }
}
