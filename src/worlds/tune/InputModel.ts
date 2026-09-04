import * as THREE from 'three';
import { formatFold } from '../../core/handGestures';
import type { ControllerState, Handedness } from '../../core/XRInput';

/**
 * A controller, floating in the air, doing exactly what yours is doing.
 *
 * You cannot look at your own controller in VR — it is a black plastic thing
 * somewhere below the headset, and the only way to find out whether the
 * runtime saw the button you just pressed is to press it and watch whether
 * anything happens in the game. That is a terrible way to work out why a grip
 * is not registering. So here is one, held up in front of you at eye level,
 * turning as yours turns, with every button lighting up as it goes down.
 *
 * With **hand tracking** there is no controller and no button, so the model
 * steps aside for a rack of five bars — one per finger, filled by how far that
 * finger is folded onto the palm — plus the two lamps that say what
 * `handGestures.ts` made of it. That is the whole gesture, drawn: three
 * fingers down is *Greifen*, the index finger down is the *Trigger*.
 */
export class InputModel extends THREE.Group {
  /** The controller half, hidden while a bare hand is being tracked. */
  private readonly controller = new THREE.Group();
  /** The hand half: five fold bars and the two gesture lamps. */
  private readonly hand = new THREE.Group();

  private readonly parts = new Map<string, THREE.MeshStandardMaterial>();
  private readonly stick = new THREE.Group();
  private readonly trigger = new THREE.Group();
  private readonly bars: Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>> = [];
  private readonly lamps = new Map<'grab' | 'trigger', THREE.MeshStandardMaterial>();
  private readonly owned: THREE.Material[] = [];
  /** Last line put on the wall, so the text is only redrawn when it changes. */
  private line = '';

  constructor(readonly side: Handedness) {
    super();
    this.name = `input-model-${side}`;
    this.add(this.controller, this.hand);
    this.buildController();
    this.buildHand();
    this.hand.visible = false;
  }

  /**
   * Puts the model where the real input is: the same orientation, every
   * pressed thing lit, the stick and the trigger actually moved. Returns the
   * line that describes it, for the board on the wall.
   */
  show(state: ControllerState | null): string {
    if (!state?.tracked) {
      this.controller.visible = false;
      this.hand.visible = false;
      return 'nicht getrackt';
    }

    // The model does not follow the hand around the room — it stays where it
    // can be looked at — but it does turn with it, because "what is moving"
    // is half of what this world is for.
    const anchor = state.isHand ? state.hand : state.grip.visible ? state.grip : state.targetRay;
    this.quaternion.copy(anchor.quaternion);

    if (state.isHand) {
      this.controller.visible = false;
      this.hand.visible = true;
      return this.showHand(state);
    }
    this.controller.visible = true;
    this.hand.visible = false;
    return this.showController(state);
  }

  dispose(): void {
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    for (const material of this.owned) material.dispose();
    this.removeFromParent();
  }

  // --- the two halves --------------------------------------------------------

  private showController(state: ControllerState): string {
    const down: string[] = [];
    const lit = (key: string, on: boolean, label: string): void => {
      this.light(key, on);
      if (on) down.push(label);
    };

    lit('trigger', state.trigger.pressed, 'Trigger');
    lit('grip', state.squeeze.pressed, 'Greifen');
    lit('primary', state.primary.pressed, this.side === 'left' ? 'X' : 'A');
    lit('secondary', state.secondary.pressed, this.side === 'left' ? 'Y' : 'B');
    lit('stick', state.stick.pressed, 'Stick gedrückt');

    // The two analogue things move rather than light up: a trigger that is
    // half pulled says something a lamp cannot.
    this.trigger.rotation.x = state.trigger.value * 0.5;
    const { x, y } = state.thumbstick;
    this.stick.rotation.set(y * 0.5, 0, -x * 0.5);
    this.light('stickTop', x !== 0 || y !== 0);

    if (x !== 0 || y !== 0) down.push(`Stick ${x.toFixed(2)} / ${y.toFixed(2)}`);
    return down.length ? down.join(' · ') : 'nichts gedrückt';
  }

  private showHand(state: ControllerState): string {
    const fold = state.fold;
    const values = fold
      ? [fold.thumb, fold.index, fold.middle, fold.ring, fold.pinky]
      : [null, null, null, null, null];
    for (let i = 0; i < this.bars.length; i++) {
      const value = values[i] ?? null;
      const bar = this.bars[i]!;
      // 1.4 palm lengths is a finger straight out, 0.4 is one on the palm —
      // the bar fills up as the finger comes down.
      const filled =
        value === null || !Number.isFinite(value)
          ? 0
          : THREE.MathUtils.clamp((1.4 - value) / 1, 0, 1);
      bar.scale.y = Math.max(filled, 0.02);
      bar.position.y = -0.06 + (bar.scale.y * 0.12) / 2;
      bar.material.emissive.setHex(filled > 0.6 ? 0x5ee0a0 : 0x4aa8ff);
      bar.material.emissiveIntensity = 0.25 + filled * 1.1;
    }
    this.lamp('grab', state.gesture.grab);
    this.lamp('trigger', state.gesture.trigger);

    const gestures = [
      state.gesture.grab ? 'Greifen' : '',
      state.gesture.trigger ? 'Trigger' : '',
    ].filter(Boolean);
    return `${gestures.length ? gestures.join(' + ') : 'offen'} · ${formatFold(fold)}`;
  }

  private light(key: string, on: boolean): void {
    const material = this.parts.get(key);
    if (!material) return;
    material.emissive.setHex(on ? 0x5ee0a0 : 0x000000);
    material.emissiveIntensity = on ? 1.6 : 0;
  }

  private lamp(key: 'grab' | 'trigger', on: boolean): void {
    const material = this.lamps.get(key);
    if (!material) return;
    material.emissive.setHex(on ? 0x5ee0a0 : 0x1b2434);
    material.emissiveIntensity = on ? 1.8 : 0.2;
  }

  /** A material this model owns, so it can be freed again. */
  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }

  /** One part that can light up, filed under a name. */
  private part(key: string, color = 0x39415a): THREE.MeshStandardMaterial {
    const material = this.own(
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.2 }),
    );
    this.parts.set(key, material);
    return material;
  }

  private buildController(): void {
    const shell = this.own(
      new THREE.MeshStandardMaterial({ color: 0x1d2331, roughness: 0.6, metalness: 0.15 }),
    );
    const mirror = this.side === 'left' ? -1 : 1;

    // Body and handle. -Z is forward, exactly like the grip space it copies.
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.034, 0.105), shell);
    this.controller.add(body);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.016, 0.1, 12), shell);
    handle.position.set(0, -0.06, 0.032);
    handle.rotation.x = 0.32;
    this.controller.add(handle);

    // The thumbstick sits on its own pivot so it can lean where yours leans.
    this.stick.position.set(0, 0.017, -0.016);
    this.controller.add(this.stick);
    const stickTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.009, 0.016, 12),
      this.part('stickTop', 0x4a5573),
    );
    stickTop.position.y = 0.008;
    this.stick.add(stickTop);
    const stickBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.004, 12),
      this.part('stick', 0x2b3243),
    );
    this.controller.add(stickBase);
    stickBase.position.set(0, 0.017, -0.016);

    // A/X sits nearer the thumb, B/Y behind it — the way they are on a Quest.
    for (const [key, z] of [
      ['primary', 0.014],
      ['secondary', 0.036],
    ] as const) {
      const button = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0075, 0.0075, 0.005, 12),
        this.part(key, 0xd6dbe6),
      );
      button.position.set(mirror * 0.012, 0.018, z);
      this.controller.add(button);
    }

    // The trigger swings on a pivot under the nose, so half a pull looks like
    // half a pull.
    this.trigger.position.set(0, -0.008, -0.04);
    this.controller.add(this.trigger);
    const paddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.016, 0.026, 0.008),
      this.part('trigger', 0x9aa6bd),
    );
    paddle.position.set(0, -0.012, 0.002);
    this.trigger.add(paddle);

    // The grip pad on the inside of the handle, where the middle finger is.
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.009, 0.036, 0.05),
      this.part('grip', 0x9aa6bd),
    );
    grip.position.set(mirror * -0.026, -0.04, 0.024);
    this.controller.add(grip);
  }

  private buildHand(): void {
    // Five bars, thumb on the outside, growing as the finger folds in.
    for (let i = 0; i < 5; i++) {
      const material = this.own(
        new THREE.MeshStandardMaterial({ color: 0x24304a, roughness: 0.5, emissive: 0x4aa8ff }),
      );
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.12, 0.016), material);
      bar.position.set((i - 2) * 0.024, -0.06, 0);
      bar.scale.y = 0.02;
      this.hand.add(bar);
    }
    for (const child of this.hand.children) {
      this.bars.push(child as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>);
    }

    // The two lamps: what the fingers were turned into.
    for (const [key, x] of [
      ['grab', -0.03],
      ['trigger', 0.03],
    ] as const) {
      const material = this.own(
        new THREE.MeshStandardMaterial({ color: 0x1b2434, roughness: 0.4, emissive: 0x1b2434 }),
      );
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), material);
      lamp.position.set(x, 0.09, 0);
      this.hand.add(lamp);
      this.lamps.set(key, material);
    }
  }

  /** The last line this model produced — the wall only redraws on a change. */
  get lastLine(): string {
    return this.line;
  }

  set lastLine(value: string) {
    this.line = value;
  }
}
