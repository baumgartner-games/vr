import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { TextPlane } from '../../ui/TextPlane';
import { createCompanionCube } from '../portal/props';
import { Burst } from './Burst';
import {
  DEFAULT_EFFECT,
  DEFAULT_SCALE,
  EFFECTS,
  MAX_SCALE,
  MIN_SCALE,
  clampScale,
  findEffect,
  nextEffect,
  nextScale,
  scaleEffect,
  scaleLabel,
  type EffectKind,
} from './effectKinds';
import { GRAB_GLOW, GRAB_TINT } from '../../core/colors';
import { playPick, playTone } from '../../core/Audio';
import type { MenuEntry } from '../../ui/menu';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';

const ROOM = { half: 5, height: 4, thickness: 0.3 };

/** Wo die Wolke entsteht: vor dem Spieler, mitten im Raum. */
const STAGE = new THREE.Vector3(0, 0.2, -2.4);
/** Und wie weit der Kreis um sie herum geht. */
const STAGE_RADIUS = 1.6;

/** Der Knopf: wo seine Säule steht und wie hoch sie ist. */
const BUTTON = new THREE.Vector3(0.7, 0, 1.7);
const PEDESTAL_H = 0.95;
const DOME_R = 0.17;
/** Wie tief der Knopf beim Drücken eintaucht und wie lange er unten bleibt. */
const PRESS_DEPTH = 0.035;
const PRESS_TIME = 0.14;

/** Das Menü daneben: Mitte der Tafelwand, und ihre Maße. */
const MENU = new THREE.Vector3(-0.95, 0, 1.75);
const MENU_YAW = 0.42;
const PANEL_W = 0.98;

/**
 * Die Effekte stehen in **zwei Spalten**, nicht in einer.
 *
 * Sieben Kacheln untereinander wären eine Tafel von der Decke bis zum Knie:
 * die untersten Zeilen lägen dort, wo man sich zum Zeigen bücken muss, und der
 * Schieber darunter noch tiefer. Zwei Spalten machen aus sieben Zeilen vier —
 * und alles, was man anfasst, liegt zwischen Hüfte und Kinn.
 */
const COLUMNS = 2;
const CELL_W = PANEL_W / COLUMNS - 0.02;
const ROW_H = 0.16;
const ROW_GAP = 0.02;
/** Ganz oben die Überschrift, darunter die Kacheln, unten der Schieber. */
const TITLE_Y = 1.85;
const FIRST_ROW_Y = 1.6;
const SLIDER_LABEL_Y = 0.9;
const SLIDER_Y = 0.74;
const SLIDER_W = 0.84;
const SLIDER_H = 0.09;

/** So viele Wolken dürfen gleichzeitig in der Luft sein. */
const MAX_BURSTS = 8;

const RED = 0xd8241f;
const RED_HOT = 0xff5a4a;

const _ray = new THREE.Ray();
const _inverse = new THREE.Matrix4();
const _point = new THREE.Vector3();
const _local = new THREE.Vector3();

/** Eine Zeile im Menü: die Tafel, wofür sie steht, und was zuletzt daraufstand. */
interface EffectRow {
  plane: TextPlane;
  effect: EffectKind;
  last: string;
}

/**
 * **Das Effektlabor**: ein Raum, ein großer roter Knopf, und daneben die
 * Frage, was passieren soll.
 *
 * Ein Effekt ist eine Sache von anderthalb Sekunden, und genau deshalb ist er
 * so schwer einzustellen: bis man ihn im Spiel gesehen hat, ist er vorbei, und
 * beim nächsten Versuch steht man woanders. Hier steht man immer an derselben
 * Stelle, sieht immer dieselbe Bühne, und der Unterschied zwischen zwei
 * Einstellungen ist ein Knopfdruck — dieselbe Idee wie im Eingaberaum, nur für
 * das, was man *sieht* statt für das, was man drückt.
 *
 * - **Der Knopf** in der Mitte löst aus. Antippen oder anzielen und Trigger,
 *   beides; er taucht dabei sichtbar ein, damit man weiß, dass man ihn
 *   getroffen hat, auch wenn der Effekt nichts hermacht.
 * - **Links davon das Menü**: eine Zeile je Effekt — Rauch, Feuer, Funken,
 *   Explosion, Staub, Zauber, Wasser (`effectKinds.ts`) — und darunter ein
 *   **Schieber für die Größe**, von einem Viertel bis auf das Vierfache. Der
 *   Schieber springt nicht auf Rasten, sondern folgt der Hand; wer lieber
 *   klickt, findet dieselben Werte als Rasten im Handgelenk-Menü.
 * - **Die Bühne** vor beiden: ein Kreis auf dem Boden, über dem die Wolke
 *   entsteht.
 *
 * Auf der Hüfte hängt die **Stoppuhr**: mit ihr sieht man sich eine Explosion
 * in Zeitlupe oder Bild für Bild an, und das ist das eigentliche Werkzeug
 * dieses Raums. Der **magische Beutel** liegt daneben — etwas, das im Rauch
 * steht, sagt mehr über den Rauch als der Rauch allein.
 *
 * Alles andere ist das Portal-Labor: derselbe Gürtel, dieselben Werkzeuge,
 * dieselbe Physik. Die Wände nehmen keine Portale — ein Portal in der Wand
 * eines Kastens öffnet ihn zum Nichts dahinter.
 */
export class EffectsWorld extends PortalWorld {
  private readonly shell = new THREE.MeshStandardMaterial({ color: 0x1b2233, roughness: 0.9 });
  private readonly floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3245,
    roughness: 0.95,
  });
  private readonly metal = new THREE.MeshStandardMaterial({
    color: 0x8a94a8,
    roughness: 0.4,
    metalness: 0.6,
  });

  private effect = findEffect(DEFAULT_EFFECT);
  private scale = DEFAULT_SCALE;

  private readonly bursts: Burst[] = [];
  private readonly rows: EffectRow[] = [];
  private readonly plates: TextPlane[] = [];
  /** Alles, was der Pointer kennt — in `dispose` wird genau das wieder abgemeldet. */
  private readonly targets: THREE.Object3D[] = [];

  private dome: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null = null;
  private domeY = 0;
  private pressed = 0;

  private track: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  private knob: THREE.Mesh | null = null;
  private sliderLabel: TextPlane | null = null;
  /** Die Überschrift — sie sagt, was gerade gewählt ist. */
  private title: TextPlane | null = null;
  /** Die Hand, die den Schieber gerade zieht. */
  private dragging: Handedness | null = null;

  private effectEntry: MenuEntry | null = null;
  private scaleEntry: MenuEntry | null = null;

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    if (this.dome) {
      ctx.pointer.add({
        object: this.dome,
        onSelect: () => this.fire(),
        onHover: () => this.dome?.material.emissive.setHex(RED_HOT),
        onBlur: () => this.dome?.material.emissive.setHex(0x400a06),
      });
      this.targets.push(this.dome);
    }
    for (const row of this.rows) {
      ctx.pointer.add({
        object: row.plane,
        onSelect: () => this.chooseEffect(row.effect),
        onHover: () => row.plane.setHighlight(true),
        onBlur: () => row.plane.setHighlight(false),
      });
      this.targets.push(row.plane);
    }
    if (this.track) {
      ctx.pointer.add({
        object: this.track,
        onSelect: (hit) => {
          this.setScale(this.scaleAt(hit.point));
          this.dragging = hit.hand;
        },
      });
      this.targets.push(this.track);
    }
    this.refresh();
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);

    // Die Wolken — in der Zeit der Welt und nicht in der der Uhr an der Wand:
    // wer die Stoppuhr auf Zeitlupe stellt, will genau *das* langsam sehen.
    const step = dt * this.worldTimeScale;
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i]!;
      if (burst.update(step)) continue;
      burst.dispose();
      this.bursts.splice(i, 1);
    }

    // Der Knopf kommt wieder hoch.
    if (this.pressed > 0 && this.dome) {
      this.pressed = Math.max(0, this.pressed - dt);
      this.dome.position.y = this.domeY - PRESS_DEPTH * (this.pressed / PRESS_TIME);
    }

    this.updateDrag(ctx);
  }

  override dispose(ctx: WorldContext): void {
    for (const object of this.targets) ctx.pointer.remove(object);
    this.targets.length = 0;
    for (const burst of this.bursts) burst.dispose();
    this.bursts.length = 0;
    for (const plate of this.plates) plate.dispose();
    this.plates.length = 0;
    this.rows.length = 0;
    this.dome = null;
    this.track = null;
    this.knob = null;
    this.sliderLabel = null;
    this.title = null;
    this.dragging = null;
    this.effectEntry = null;
    this.scaleEntry = null;
    this.shell.dispose();
    this.floorMaterial.dispose();
    this.metal.dispose();
    super.dispose(ctx);
  }

  /**
   * Dasselbe im Handgelenk-Menü: am Schreibtisch (und mit der Maus) kommt man
   * so an alles heran, wofür man in der Brille zum Pult geht.
   */
  override menu(): MenuEntry[] {
    this.effectEntry = {
      id: 'effects:kind',
      label: `Effekt: ${this.effect.label}`,
      sub: this.effect.sub,
      icon: 'settings',
      accent: this.effect.accent,
      run: () => this.chooseEffect(nextEffect(this.effect.id)),
    };
    this.scaleEntry = {
      id: 'effects:scale',
      label: `Größe: ${scaleLabel(this.scale)}`,
      sub: 'Dieselben Rasten wie der Schieber am Pult',
      icon: 'settings',
      accent: 0x9fe3ff,
      run: () => this.setScale(nextScale(this.scale)),
    };
    return [
      ...super.menu(),
      this.effectEntry,
      this.scaleEntry,
      {
        id: 'effects:fire',
        label: 'Auslösen',
        sub: 'Wie der rote Knopf',
        icon: 'portal',
        accent: RED,
        run: () => this.fire(),
      },
      {
        id: 'effects:clear',
        label: 'Alles weg',
        sub: 'Nimmt die Wolken aus der Luft',
        icon: 'eraser',
        accent: 0x8e9db8,
        run: () => this.clearBursts(),
      },
    ];
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 3.4);
  }

  protected override skyColor(): number {
    return 0x0d1220;
  }

  protected override lightIntensity(): number {
    return 0.55;
  }

  protected override welcome(): string {
    return 'Roter Knopf löst aus · links Effekt und Größe · Stoppuhr für Zeitlupe';
  }

  /** Die Stoppuhr, um es langsam zu sehen — und der Beutel, um etwas hineinzustellen. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [
      ['stopwatch', 'left'],
      ['bag', 'right'],
    ];
  }

  /** Kein Horizont: der Raum ist ein Kasten, die Fläche wäre nie zu sehen. */
  protected override horizonColor(): number | null {
    return null;
  }

  protected override buildEnvironment(): void {
    const room = new THREE.Group();
    room.name = 'effects-room';
    this.root.add(room);

    this.buildShell(room);
    this.buildStage(room);
    this.buildButton(room);
    this.buildMenu(room);
    this.buildProps();
  }

  // --- der Raum -------------------------------------------------------------

  private buildShell(room: THREE.Group): void {
    const { half, height, thickness } = ROOM;
    const span = (half + thickness) * 2;
    this.slab(room, this.floorMaterial, [span, thickness, span], [0, -thickness / 2, 0], false);
    this.slab(room, this.shell, [span, thickness, span], [0, height + thickness / 2, 0], false);
    this.roof = height;

    for (const sign of [-1, 1]) {
      this.slab(
        room,
        this.shell,
        [span, height, thickness],
        [0, height / 2, sign * (half + thickness / 2)],
        false,
      );
      this.slab(
        room,
        this.shell,
        [thickness, height, span],
        [sign * (half + thickness / 2), height / 2, 0],
        false,
      );
    }

    // Vier Lampen unter der Decke: hell genug zum Ablesen, dunkel genug, dass
    // eine Flamme noch nach Flamme aussieht.
    for (const [x, z] of [
      [-3, -3],
      [3, -3],
      [-3, 3],
      [3, 3],
    ] as const) {
      const lamp = new THREE.PointLight(0xdce8ff, 7, 18, 2);
      lamp.position.set(x, height - 0.5, z);
      room.add(lamp);
    }

    const sign = new TextPlane({
      width: 2.6,
      height: 0.8,
      title: 'Effektlabor',
      body: 'Knopf drücken. Links steht, was kommt und wie groß. Mit der Stoppuhr in Zeitlupe ansehen.',
      accent: RED,
    });
    sign.position.set(0, 2.5, -ROOM.half + 0.02);
    room.add(sign);
    this.plates.push(sign);
  }

  /**
   * Was im Raum steht: drei Kisten und ein Companion Cube um die Bühne.
   *
   * Die Aufstellung des Portal-Labors passt hier nicht — sie ist für eine
   * Halle von zehn Metern gebaut, und ihr erster Würfel läge in diesem Raum
   * mitten in der Wand. Gebraucht werden ohnehin nur ein paar Dinge **neben**
   * der Wolke: eine Flamme ohne etwas daneben hat keine Größe, und ob eine
   * Explosion „groß" ist, sieht man erst an der Kiste, die daneben steht.
   */
  protected override buildProps(): void {
    const physics = this.physics!;
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.85 });
    let index = 0;
    for (const [x, z, size] of [
      [-1.5, -2.2, 0.6],
      [1.5, -2.0, 0.45],
      [1.1, -3.3, 0.5],
    ] as const) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), wood);
      crate.position.set(x, size / 2, z);
      this.root.add(crate);
      this.registerProp(
        physics.addDynamic(crate, { mass: size * 16, friction: 0.85, restitution: 0.05 }),
        `effects-crate-${index++}`,
      );
    }

    const cube = createCompanionCube(0.5);
    cube.userData.propKind = 'cube';
    cube.position.set(-0.9, 0.3, -3.4);
    this.root.add(cube);
    this.registerProp(
      physics.addDynamic(cube, { mass: 8, friction: 0.8, restitution: 0.1 }),
      'effects-cube',
    );
  }

  /** Die Bühne: ein Kreis auf dem Boden, über dem alles losgeht. */
  private buildStage(room: THREE.Group): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(STAGE_RADIUS - 0.06, STAGE_RADIUS, 64),
      new THREE.MeshBasicMaterial({
        color: GRAB_TINT,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(STAGE.x, 0.012, STAGE.z);
    room.add(ring);

    // Ein kleiner Sockel unter der Wolke, damit sie nicht im Nichts anfängt.
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.16, 24), this.metal);
    pad.position.set(STAGE.x, 0.08, STAGE.z);
    room.add(pad);
  }

  // --- der große rote Knopf -------------------------------------------------

  private buildButton(room: THREE.Group): void {
    const group = new THREE.Group();
    group.name = 'big-red-button';
    group.position.copy(BUTTON);
    room.add(group);

    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.2, PEDESTAL_H, 20),
      this.metal,
    );
    column.position.y = PEDESTAL_H / 2;
    group.add(column);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24), this.metal);
    top.position.y = PEDESTAL_H + 0.03;
    group.add(top);

    // Der Kragen um den Knopf: gelb-schwarz wäre eine Textur, also lieber ein
    // Ring, der einfach zeigt, wo der Knopf aufhört.
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(DOME_R + 0.03, 0.022, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0xffc857, roughness: 0.6 }),
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.y = PEDESTAL_H + 0.07;
    group.add(collar);

    this.domeY = PEDESTAL_H + 0.06;
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(DOME_R, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: RED,
        roughness: 0.35,
        emissive: new THREE.Color(0x400a06),
      }),
    );
    this.dome.name = 'red-button';
    this.dome.position.y = this.domeY;
    group.add(this.dome);

    const label = new TextPlane({
      width: 0.5,
      height: 0.16,
      title: 'AUSLÖSEN',
      align: 'center',
      accent: RED,
    });
    label.position.set(0, PEDESTAL_H - 0.14, 0.21);
    label.rotation.x = -0.5;
    group.add(label);
    this.plates.push(label);
  }

  // --- das Menü links daneben ------------------------------------------------

  private buildMenu(room: THREE.Group): void {
    const group = new THREE.Group();
    group.name = 'effect-menu';
    group.position.copy(MENU);
    group.rotation.y = MENU_YAW;
    room.add(group);

    // Der Ständer: eine Platte, auf der alles klebt, auf zwei Beinen.
    const board = new THREE.Mesh(new THREE.BoxGeometry(PANEL_W + 0.08, 1.36, 0.05), this.shell);
    board.position.set(0, 1.28, -0.03);
    group.add(board);
    for (const sign of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 12), this.metal);
      leg.position.set(sign * (PANEL_W / 2 - 0.06), 0.31, -0.03);
      group.add(leg);
    }

    this.title = new TextPlane({
      width: PANEL_W,
      height: 0.22,
      title: 'Effekt',
      body: 'Kachel antippen oder anzielen + Trigger',
      accent: 0x9fe3ff,
    });
    this.title.position.set(0, TITLE_Y, 0.01);
    group.add(this.title);
    this.plates.push(this.title);

    EFFECTS.forEach((effect, index) => {
      const plane = new TextPlane({
        width: CELL_W,
        height: ROW_H,
        title: effect.label,
        align: 'center',
        accent: effect.accent,
      });
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      plane.position.set(
        (column - (COLUMNS - 1) / 2) * (CELL_W + 0.02),
        FIRST_ROW_Y - row * (ROW_H + ROW_GAP),
        0.01,
      );
      group.add(plane);
      this.rows.push({ plane, effect, last: '' });
      this.plates.push(plane);
    });

    this.sliderLabel = new TextPlane({
      width: PANEL_W,
      height: 0.16,
      title: 'Größe',
      body: scaleLabel(this.scale),
      accent: GRAB_GLOW,
    });
    this.sliderLabel.position.set(0, SLIDER_LABEL_Y, 0.01);
    group.add(this.sliderLabel);
    this.plates.push(this.sliderLabel);

    // Der Schieber: eine Leiste, auf die man zeigt, und ein Reiter darauf.
    // Angefasst wird die Leiste — ein Reiter von zwei Zentimetern ist auf drei
    // Meter Entfernung kein Ziel, die ganze Leiste schon.
    this.track = new THREE.Mesh(
      new THREE.PlaneGeometry(SLIDER_W, SLIDER_H),
      new THREE.MeshBasicMaterial({ color: 0x39445c, toneMapped: false }),
    );
    this.track.name = 'size-slider';
    this.track.position.set(0, SLIDER_Y, 0.012);
    group.add(this.track);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(SLIDER_W - 0.04, 0.008, 0.004),
      new THREE.MeshBasicMaterial({ color: 0x9fe3ff, toneMapped: false }),
    );
    rail.position.set(0, SLIDER_Y, 0.014);
    group.add(rail);

    this.knob = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, SLIDER_H + 0.02, 0.02),
      new THREE.MeshStandardMaterial({
        color: GRAB_TINT,
        emissive: new THREE.Color(GRAB_TINT).multiplyScalar(0.4),
        roughness: 0.4,
      }),
    );
    this.knob.position.set(0, SLIDER_Y, 0.02);
    group.add(this.knob);
    this.placeKnob();
  }

  // --- was der Knopf tut ------------------------------------------------------

  /** Eine Wolke auf der Bühne, in der eingestellten Größe. */
  private fire(): void {
    const kind = scaleEffect(this.effect, this.scale);
    const burst = new Burst(kind, STAGE, 0.16);
    this.root.add(burst);
    this.bursts.push(burst);
    // Zu viele auf einmal wären keine Wolken mehr, sondern Nebel.
    while (this.bursts.length > MAX_BURSTS) this.bursts.shift()?.dispose();

    this.pressed = PRESS_TIME;
    if (this.dome) this.dome.position.y = this.domeY - PRESS_DEPTH;
    playTone({ type: 'square', from: 180, to: 90, duration: 0.09, gain: 0.06 });
    this.context?.notify(`${this.effect.label} · ${scaleLabel(this.scale)}`);
  }

  private clearBursts(): void {
    for (const burst of this.bursts) burst.dispose();
    this.bursts.length = 0;
  }

  private chooseEffect(effect: EffectKind): void {
    if (effect.id === this.effect.id) return;
    this.effect = effect;
    playPick(true);
    this.refresh();
  }

  private setScale(value: number): void {
    const next = clampScale(value);
    if (next === this.scale) return;
    this.scale = next;
    this.refresh();
  }

  // --- der Schieber ------------------------------------------------------------

  /**
   * Ziehen statt klicken: solange der Trigger derselben Hand unten bleibt,
   * folgt der Reiter ihrem Strahl. Ein Schieber, den man nur antippen kann,
   * ist eine Reihe Knöpfe mit einem Strich dahinter.
   */
  private updateDrag(ctx: WorldContext): void {
    const hand = this.dragging;
    const track = this.track;
    if (!hand || !track) return;
    const controller = ctx.input.get(hand);
    if (!controller?.tracked || !controller.trigger.pressed) {
      this.dragging = null;
      return;
    }
    controller.getRay(_ray);
    track.updateWorldMatrix(true, false);
    // Die Ebene der Leiste, in ihrem eigenen Rahmen: der Treffer liegt dort,
    // wo der Strahl `z = 0` erreicht.
    _inverse.copy(track.matrixWorld).invert();
    _point.copy(_ray.origin).applyMatrix4(_inverse);
    _local.copy(_ray.direction).transformDirection(_inverse);
    if (Math.abs(_local.z) < 1e-4) return;
    const t = -_point.z / _local.z;
    if (t < 0) return;
    _point.addScaledVector(_local, t);
    this.setScale(scaleFromX(_point.x));
  }

  /** Wo auf der Leiste ein Weltpunkt liegt, als Größe. */
  private scaleAt(point: THREE.Vector3): number {
    const track = this.track;
    if (!track) return this.scale;
    _point.copy(point);
    track.worldToLocal(_point);
    return scaleFromX(_point.x);
  }

  private placeKnob(): void {
    if (!this.knob) return;
    const t = (this.scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
    this.knob.position.x = (t - 0.5) * (SLIDER_W - 0.05);
  }

  // --- Beschriftungen ---------------------------------------------------------

  /**
   * Alles nachziehen, was sich geändert haben kann — und nur, was sich wirklich
   * geändert hat: eine Leinwand neu zu zeichnen ist teuer, und beim Ziehen am
   * Schieber liefe das hier sonst neunzigmal je Sekunde durch zehn Tafeln.
   */
  private refresh(): void {
    for (const row of this.rows) {
      const chosen = row.effect.id === this.effect.id;
      const title = chosen ? `▶ ${row.effect.label}` : row.effect.label;
      if (title === row.last) continue;
      row.last = title;
      row.plane.setText(title, undefined, chosen ? GRAB_GLOW : row.effect.accent);
    }
    // Die Überschrift trägt die Erklärung: in einer Kachel von zwanzig
    // Zentimetern steht ein Wort, und „Braune Wolke, die sich am Boden legt"
    // ist keins.
    this.title?.setText(`Effekt: ${this.effect.label}`, this.effect.sub, this.effect.accent);
    this.sliderLabel?.setText('Größe', scaleLabel(this.scale), GRAB_GLOW);
    this.placeKnob();
    if (this.effectEntry) {
      this.effectEntry.label = `Effekt: ${this.effect.label}`;
      this.effectEntry.sub = this.effect.sub;
      this.effectEntry.accent = this.effect.accent;
    }
    if (this.scaleEntry) this.scaleEntry.label = `Größe: ${scaleLabel(this.scale)}`;
  }
}

/** Die Größe zu einer Stelle auf der Leiste, in ihrem eigenen Rahmen. */
function scaleFromX(x: number): number {
  const t = Math.min(1, Math.max(0, x / (SLIDER_W - 0.05) + 0.5));
  return clampScale(MIN_SCALE + t * (MAX_SCALE - MIN_SCALE));
}
