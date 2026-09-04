import * as THREE from 'three';
import { formatFold } from '../../core/handGestures';
import {
  buildControllerShape,
  componentNode,
  controllerShape,
  liveControllerModel,
  ownMaterials,
} from '../../core/ControllerModels';
import type { XRControllerModel } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import type { ControllerState, Handedness } from '../../core/XRInput';

/**
 * Welche Taste an welcher Komponente des echten Modells sitzt.
 *
 * Die Namen kommen aus den WebXR-Input-Profilen und sind für alle Geräte
 * dieselben — deshalb steht hier eine Tabelle und keine Fallunterscheidung
 * nach Gerät. `x`/`y` links und `a`/`b` rechts ist die einzige Stelle, an der
 * die beiden Hände sich unterscheiden, und zwar genauso, wie sie beschriftet
 * sind.
 */
function componentOf(key: string, side: Handedness): string | null {
  switch (key) {
    case 'trigger':
      return 'xr-standard-trigger';
    case 'grip':
      return 'xr-standard-squeeze';
    case 'stick':
      return 'xr-standard-thumbstick';
    // Der ausgelenkte Stick bekommt bewusst keinen Punkt: das echte Modell
    // *kippt* ihn, und ein Leuchtfleck auf demselben Knoten läge nur über dem
    // Punkt für den Stickdruck.
    case 'stickTop':
      return null;
    case 'primary':
      return side === 'left' ? 'x-button' : 'a-button';
    case 'secondary':
      return side === 'left' ? 'y-button' : 'b-button';
    default:
      return null;
  }
}

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
 * Gezeigt wird dabei das **echte Modell** des Geräts, das gerade in der Hand
 * liegt — dieselben Dateien, die jede WebXR-Seite benutzt, nur aus unserem
 * eigenen Repository statt von einem CDN (`core/ControllerModels.ts`). Trigger,
 * Griff und Stick bewegen sich darin von selbst, weil das Profil weiß, welcher
 * Knoten zu welcher Achse gehört. Was es *nicht* tut, ist leuchten: einen
 * Millimeter Tastenweg sieht man auf einem Tisch nicht, und genau dafür ist
 * dieser Raum da. Also sitzt auf jeder gedrückten Taste zusätzlich ein
 * **Leuchtpunkt**, an dem Knoten, den das Profil selbst dafür nennt.
 *
 * Kommt kein Modell — kein Netz gab es hier noch nie, aber ein Gerät, dessen
 * Profil wir nicht mitliefern, schon —, bleibt der **selbst gebaute**
 * Controller aus Kästen und Zylindern stehen. Er ist gröber, er ist immer da,
 * und er leuchtet genauso.
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
  /** Die selbst gebaute Geometrie — der Rückfall, wenn kein Modell kommt. */
  private readonly built = new THREE.Group();
  /** Das echte Modell des Geräts, sobald es da ist. */
  private real: XRControllerModel | null = null;
  /** Dasselbe ohne Gerät dahinter — das Ausstellungsstück auf dem Tisch. */
  private shape: THREE.Object3D | null = null;
  /** Die Leuchtpunkte auf den Tasten des echten Modells. */
  private readonly markers = new Map<string, THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>>();
  private markerGeometry: THREE.SphereGeometry | null = null;
  /** Materialien, die nur dieser Kopie gehören — der Geist färbt sie um. */
  private borrowed: THREE.Material[] = [];
  /** An welchem Gerät das Modell hängt — wechselt es, wechselt das Modell. */
  private source: XRInputSource | null = null;
  private ghostly = false;
  /** The hand half: five fold bars and the two gesture lamps. */
  private readonly hand = new THREE.Group();

  private readonly parts = new Map<string, THREE.MeshStandardMaterial>();
  /** Stick und Trigger des gebauten Controllers — sie bewegen sich mit. */
  private stick = new THREE.Group();
  private trigger = new THREE.Group();
  private readonly bars: Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>> = [];
  private readonly lamps = new Map<'grab' | 'trigger', THREE.MeshStandardMaterial>();
  private readonly owned: THREE.Material[] = [];
  /** Last line put on the wall, so the text is only redrawn when it changes. */
  private line = '';

  constructor(readonly side: Handedness) {
    super();
    this.name = `input-model-${side}`;
    this.add(this.controller, this.hand);
    this.controller.add(this.built);
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

  /**
   * Aus dem lebenden Modell ein Ausstellungsstück machen: durchsichtig, ohne
   * Fingerbalken, und es folgt nichts mehr.
   *
   * Der Tisch im Raum braucht einen Controller, der einfach daliegt — und
   * einen zweiten Satz Geometrie dafür zu bauen hieße, zwei Controller zu
   * pflegen, von denen einer nie so aussieht wie der andere. Also derselbe.
   */
  asGhost(): this {
    this.controller.visible = true;
    this.hand.visible = false;
    this.ghostly = true;
    for (const material of this.owned) {
      material.transparent = true;
      material.opacity = 0.45;
      material.depthWrite = false;
    }
    // Und daneben das echte Modell, sobald es da ist. Es hängt an keinem
    // Gerät — auf dem Tisch soll ein Controller liegen, auch wenn man den
    // zweiten gerade weggelegt hat, und gerade dann.
    void controllerShape(this.side).then((shape) => {
      if (!shape || this.shape) return;
      // Die Kopie teilt sich Materialien mit allen anderen; durchsichtig wird
      // sie nur, wenn sie eigene bekommt — sonst wäre auch der Controller in
      // der Hand plötzlich aus Glas.
      this.borrowed = ownMaterials(shape);
      for (const material of this.borrowed) {
        material.transparent = true;
        material.opacity = 0.45;
        material.depthWrite = false;
      }
      this.shape = shape;
      this.controller.add(shape);
      this.built.visible = false;
    });
    return this;
  }

  dispose(): void {
    // Das echte Modell zuerst aushängen: seine Geometrien und Materialien
    // liegen in einem Zwischenspeicher, den sich alle Controller teilen — wer
    // sie hier freigibt, nimmt sie dem nächsten weg. Die Kopie selbst ist
    // nichts als ein Baum aus Verweisen.
    for (const marker of this.markers.values()) marker.removeFromParent();
    this.markers.clear();
    this.real?.removeFromParent();
    this.real = null;
    this.shape?.removeFromParent();
    this.shape = null;

    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    this.markerGeometry?.dispose();
    this.markerGeometry = null;
    for (const material of this.owned) material.dispose();
    // Die geliehenen gehören dieser Kopie allein, also gehen sie mit ihr.
    for (const material of this.borrowed) material.dispose();
    this.borrowed = [];
    this.removeFromParent();
  }

  // --- the two halves --------------------------------------------------------

  private showController(state: ControllerState): string {
    this.adopt(state);
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
    // half pulled says something a lamp cannot. Am echten Modell macht das
    // Profil dasselbe von selbst und genauer — dort wäre eine zweite Hand an
    // denselben Knoten nur ein Ruckeln.
    const { x, y } = state.thumbstick;
    if (this.built.visible) {
      this.trigger.rotation.x = state.trigger.value * 0.5;
      this.stick.rotation.set(y * 0.5, 0, -x * 0.5);
    }
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

  /**
   * Eine Taste leuchtet — am gebauten Controller sein eigenes Material, am
   * echten ein Punkt darauf. Beides heißt dasselbe und sieht gleich aus, und
   * das ist der Sinn: wer den Raum kennt, muss nicht wissen, welches Modell
   * gerade dasteht.
   */
  private light(key: string, on: boolean): void {
    const marker = this.marker(key);
    if (marker) marker.visible = on;
    const material = this.parts.get(key);
    if (!material) return;
    material.emissive.setHex(on ? 0x5ee0a0 : 0x000000);
    material.emissiveIntensity = on ? 1.6 : 0;
  }

  /**
   * Der Leuchtpunkt auf einer Taste des echten Modells, beim ersten Mal
   * gebaut.
   *
   * Wo er hingehört, sagt das Profil: jede Komponente nennt den Knoten, den
   * sie bewegt, und genau darauf sitzt der Punkt. Damit stimmt er auf jedem
   * Gerät, ohne dass hier eine einzige Koordinate steht.
   */
  private marker(key: string): THREE.Object3D | null {
    const existing = this.markers.get(key);
    if (existing) return existing;
    const model = this.real;
    if (!model || this.ghostly) return null;
    const id = componentOf(key, this.side);
    const node = id ? componentNode(model, id) : null;
    if (!node) return null;

    this.markerGeometry ??= new THREE.SphereGeometry(0.007, 10, 8);
    const marker = new THREE.Mesh(
      this.markerGeometry,
      this.own(new THREE.MeshBasicMaterial({ color: 0x5ee0a0, toneMapped: false })),
    );
    marker.visible = false;
    node.add(marker);
    this.markers.set(key, marker);
    return marker;
  }

  /**
   * Das echte Modell holen, sobald klar ist, an welchem Gerät wir hängen — und
   * danach nie wieder fragen. Es kommt leer zurück und füllt sich; bis dahin
   * steht der gebaute Controller da, und wenn es gar nicht kommt, bleibt er
   * stehen.
   */
  private adopt(state: ControllerState): void {
    const source = state.inputSource;
    // Ein Controller, der weggelegt und wieder aufgenommen wird, kommt als
    // *neue* Eingabequelle zurück. Am alten Gamepad hängen zu bleiben hieße,
    // ein Modell zu zeigen, das nie wieder einen Knopf sieht.
    if (source && source !== this.source) {
      this.source = source;
      for (const marker of this.markers.values()) marker.removeFromParent();
      this.markers.clear();
      this.real?.removeFromParent();
      this.real = liveControllerModel(source);
      if (this.real) this.controller.add(this.real);
    }
    // Erst wenn wirklich Geometrie angekommen ist, tritt der gebaute zurück:
    // ein leeres Modell wäre ein Raum ohne Controller.
    this.built.visible = !this.real || this.real.children.length === 0;
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
    // Die Geometrie steht in `core/ControllerModels.ts`, weil sie inzwischen
    // zweimal gebraucht wird: hier an der Wand und als Werkzeug in der Hand.
    // Was hier bleibt, ist das Umfärben — nur dieser Raum lässt Tasten
    // leuchten.
    const built = buildControllerShape(this.side, shell, (key, color) => this.part(key, color));
    this.stick = built.stick;
    this.trigger = built.trigger;
    this.built.add(built.root);
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
