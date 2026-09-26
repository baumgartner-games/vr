import * as THREE from 'three';
import type { PointerTarget } from '../core/Pointer';
import type { XRInput } from '../core/XRInput';
import type { WorldDefinition } from '../core/types';
import type { HintZone } from '../core/controlHints';
import {
  LOADER_MIN_MS,
  creep,
  loadLine,
  type LoadPhase,
  type LoadState,
} from '../core/loadProgress';
import { shouldShowIntro, worldIntro } from '../core/worldIntro';
import {
  FADE_IDLE,
  XR_WELCOME_SECONDS,
  fadeActive,
  fadeBegin,
  fadeCancel,
  fadeColor,
  fadeReady,
  fadeStep,
  followYaw,
  xrHintText,
  xrHints,
  xrHintsVisible,
  xrIntroKeys,
  xrWorldVisible,
  type FadeState,
  type FollowState,
  type XRHintContext,
  type XRHintLabel,
} from '../core/xrGuide';
import { markWelcomed, welcomedWorlds } from './WorldWelcome';
import {
  CARD_DIM,
  CARD_FONT,
  CARD_INK,
  css,
  paintChip,
  paintChips,
  paintFrame,
  wrapLines,
} from './xrCard';

/**
 * **Der Weg ins Spiel, in der Brille** — Abblenden mit Ladetafel beim
 * Weltwechsel, die Willkommens-Tafel beim ersten Betreten und die
 * Beschriftung am Controller (`core/xrGuide.ts` rechnet, was wann steht).
 *
 * Das Gegenstück zu `ui/WorldLoader.ts`, `ui/WorldWelcome.ts` und
 * `ui/ControlHints.ts`: dieselben Texte, dieselben Zahlen, dieselben
 * Einstellungen — nur als Dinge im Raum statt als DOM.
 *
 * **Was wo hängt:**
 *
 * - Die **Blende** ist eine Kugel um den Kopf (an der Kamera, Innenseite,
 *   ohne Tiefenprüfung) — gleich dunkel in jede Richtung, also egal, ob der
 *   Kopf in einem ausgelassenen Bild ein Stück weiter ist.
 * - Die **Tafeln** hängen am Rig, nicht an der Kamera: Sie stehen vor dem
 *   Spieler und rücken erst nach, wenn er sich weit wegdreht
 *   (`followYaw`). Eine Tafel am Kopf ruckelte mit jedem ausgelassenen Bild —
 *   und beim Laden fallen Bilder aus.
 * - Die **Beschriftung** hängt am Griff des rechten Controllers (dort sitzt
 *   `A`), über der Hand, und sieht zum Kopf — so liest man sie mit einem
 *   Blick auf die Hand, gleich wie man sie hält.
 *
 * **Die Vorschau am Schirm** (`App.xrPreview`) stellt alles davon in die
 * Ansicht aus den Augen — für die Bild-Schleife, denn eine echte Brille gibt
 * es beim Prüfen nicht.
 */
export class XRGuide extends THREE.Group {
  private readonly fade: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly transitCard: CardMesh;
  private readonly barTrack: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly barFill: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly welcomeCard: CardMesh;
  private readonly hintLabel: CardMesh;
  private fadeState: FadeState = FADE_IDLE;
  private load: LoadState = { phase: 'fertig', loaded: 0, total: 0 };
  private shown = 0;
  private lineText = '';
  private target: WorldDefinition | null = null;
  private transitFollow: FollowState = { yaw: 0, moving: false };
  private welcomeFollow: FollowState = { yaw: 0, moving: false };
  private welcomeWorld = '';
  private welcomeLeft = 0;
  private welcomeAlpha = 0;
  private hintText = '';
  private hintHost: THREE.Object3D | null = null;
  private placedTransit = false;
  /** Wer darauf wartet, dass es dunkel ist (`whenDark`). */
  private darkWaiters: Array<() => void> = [];
  private placedWelcome = false;

  constructor(
    private readonly camera: THREE.Camera,
    private readonly input: XRInput,
  ) {
    super();
    this.name = 'xr-guide';

    this.fade = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    );
    this.fade.name = 'xr-fade';
    this.fade.renderOrder = 9000;
    this.fade.frustumCulled = false;
    this.fade.visible = false;
    camera.add(this.fade);

    this.transitCard = new CardMesh(TRANSIT_W, TRANSIT_H, TRANSIT_M, 9001);
    this.transitCard.name = 'xr-transit';
    const px = TRANSIT_M / TRANSIT_W;
    const barW = (TRANSIT_W - 2 * TRANSIT_PAD) * px;
    this.barTrack = barPlane(barW, 14 * px, 0xffffff, 0.16, 9002);
    this.barFill = barPlane(barW, 14 * px, 0x4aa8ff, 1, 9003);
    // Der Balken wächst von links: Der Nullpunkt der Füllung liegt am Rand.
    this.barFill.geometry.translate(barW / 2, 0, 0);
    this.barFill.position.set(-barW / 2, 0, 0.001);
    const bar = new THREE.Group();
    bar.position.set(0, (TRANSIT_H / 2 - TRANSIT_BAR_Y) * px, 0.002);
    bar.add(this.barTrack, this.barFill);
    this.transitCard.add(bar);
    this.transitCard.visible = false;

    this.welcomeCard = new CardMesh(1024, 720, 1.0, 30);
    this.welcomeCard.name = 'xr-welcome';
    this.welcomeCard.visible = false;

    this.hintLabel = new CardMesh(512, 256, 0.15, 25);
    this.hintLabel.name = 'xr-hints';
    this.hintLabel.visible = false;

    this.add(this.transitCard, this.welcomeCard);
  }

  /** Das Ziel für den Zeiger: Trigger (oder `A`) auf die Tafel heißt _Verstanden_. */
  asPointerTarget(): PointerTarget {
    return {
      object: this.welcomeCard,
      pokeable: true,
      onSelect: () => this.dismissWelcome(),
    };
  }

  // --- Weltwechsel ------------------------------------------------------------

  /** Blendet gerade ein Wechsel (dunkel oder auf dem Weg dorthin/zurück)? */
  get transit(): boolean {
    return fadeActive(this.fadeState);
  }

  /** Ein Wechsel fängt an — in diese Welt. */
  begin(world: WorldDefinition): void {
    this.target = world;
    this.fadeState = fadeBegin(this.fadeState);
    this.fade.material.color.setHex(fadeColor(world.accent));
    this.barFill.material.color.setHex(world.accent);
    this.shown = 0;
    this.load = { phase: 'modul', loaded: 0, total: 0 };
    this.lineText = '';
    this.placedTransit = false;
    this.loadImage(world);
    // Wer wechselt, ist mit der Begrüßung der alten Welt fertig.
    this.hideWelcome();
    this.paintTransit();
  }

  set(phase: LoadPhase, loaded: number, total: number): void {
    // Fertig bleibt fertig — der Lade-Manager zählt nach dem Deckel manchmal
    // noch weiter, der Balken aber nicht mehr zurück.
    if (this.load.phase === 'fertig') return;
    this.load = { phase, loaded, total };
  }

  /**
   * **Erst dunkel, dann tauschen.** `App.goTo` wartet hierauf, bevor es die
   * alte Welt abräumt — eine Welt aus dem Speicher ist schneller da als die
   * Blende zu, und dann sähe man den Schnitt doch. Höchstens `capMs`: Kommt
   * kein Bild (die Brille hängt), wird nicht ewig gewartet.
   */
  whenDark(capMs = 800): Promise<void> {
    if (!this.transit || this.fadeState.alpha >= 1) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(done, capMs);
      function done(): void {
        clearTimeout(timer);
        resolve();
      }
      this.darkWaiters.push(done);
    });
  }

  private releaseDark(): void {
    const waiters = this.darkWaiters;
    this.darkWaiters = [];
    for (const done of waiters) done();
  }

  /** Die neue Welt steht — nach der Mindestzeit wird es wieder hell. */
  finish(): void {
    this.load = { phase: 'fertig', loaded: 0, total: 0 };
    this.fadeState = fadeReady(this.fadeState);
  }

  /** Sofort weg — Brille ab, oder die Ladung ist gescheitert. */
  cancel(): void {
    this.fadeState = fadeCancel();
    this.fade.visible = false;
    this.transitCard.visible = false;
    this.releaseDark();
  }

  // --- jedes Bild -------------------------------------------------------------

  /**
   * Ein Bild. `head` ist die Pose des Kopfes **im Raum des Rigs**
   * (`App`: `_headLocal`), denn dort hängen die Tafeln.
   */
  update(dt: number, head: THREE.Matrix4, state: XRGuideState): void {
    head.decompose(_headPos, _headQuat, _scale);
    const headYaw = yawOf(_headQuat);

    // Die Blende und die Ladetafel.
    if (!state.presenting && this.transit) this.cancel();
    if (this.transit) {
      this.fadeState = fadeStep(this.fadeState, dt, LOADER_MIN_MS / 1000);
      this.shown = creep(this.shown, this.load, dt);
    }
    const alpha = this.fadeState.alpha;
    if (this.darkWaiters.length && (alpha >= 1 || !this.transit)) this.releaseDark();
    this.fade.visible = alpha > 0.001;
    this.fade.material.opacity = alpha;
    const transit = this.transit;
    this.transitCard.visible = transit;
    if (transit) {
      let blend = Math.min(1, dt * 6);
      if (!this.placedTransit) {
        this.transitFollow = { yaw: headYaw, moving: false };
        this.placedTransit = true;
        blend = 1;
      } else this.transitFollow = followYaw(this.transitFollow, headYaw, dt);
      place(this.transitCard, _headPos, this.transitFollow.yaw, 1.5, -0.08, blend);
      // Die Tafel kommt mit der Blende und geht mit ihr.
      this.transitCard.material.opacity = Math.min(1, alpha * 1.4);
      this.barTrack.material.opacity = 0.16 * this.transitCard.material.opacity;
      this.barFill.material.opacity = this.transitCard.material.opacity;
      this.barFill.scale.x = Math.max(0.001, this.shown);
      const line = loadLine(this.load);
      if (line !== this.lineText) {
        this.lineText = line;
        this.paintTransit();
      }
    }

    // Die Willkommens-Tafel.
    const gate = {
      presenting: state.presenting,
      transit,
      menu: state.menuOpen,
      world: state.world !== null,
    };
    this.updateWelcome(dt, gate, state, headYaw);

    // Die Beschriftung am Controller.
    const hint =
      xrHintsVisible(gate, state.hintsOn, this.welcomeCard.visible) && state.world
        ? xrHints(state.zone, state.rigFlags)
        : null;
    this.updateHints(hint);
  }

  private updateWelcome(
    dt: number,
    gate: Parameters<typeof xrWorldVisible>[0],
    state: XRGuideState,
    headYaw: number,
  ): void {
    const id = state.world?.id ?? '';
    const visible = xrWorldVisible(gate);
    if (this.welcomeWorld && (id !== this.welcomeWorld || !visible)) this.hideWelcome();
    if (!this.welcomeWorld && state.world && visible) {
      const show = shouldShowIntro({
        world: id,
        visible: true,
        enabled: state.welcomeOn,
        seen: welcomedWorlds(),
      });
      if (show) this.openWelcome(state.world);
    }
    if (!this.welcomeWorld) return;
    this.welcomeLeft -= dt;
    const leaving = this.welcomeLeft <= 0;
    this.welcomeAlpha = THREE.MathUtils.clamp(this.welcomeAlpha + (leaving ? -dt : dt) / 0.3, 0, 1);
    if (leaving && this.welcomeAlpha <= 0) {
      this.hideWelcome();
      return;
    }
    let blend = Math.min(1, dt * 6);
    if (!this.placedWelcome) {
      this.welcomeFollow = { yaw: headYaw, moving: false };
      this.placedWelcome = true;
      blend = 1;
    } else this.welcomeFollow = followYaw(this.welcomeFollow, headYaw, dt, 3);
    place(this.welcomeCard, _headPos, this.welcomeFollow.yaw, 1.45, -0.12, blend);
    this.welcomeCard.material.opacity = this.welcomeAlpha;
    this.welcomeCard.visible = true;
  }

  private openWelcome(world: WorldDefinition): void {
    const intro = worldIntro(world.id);
    if (!intro) return;
    this.welcomeWorld = world.id;
    this.welcomeLeft = XR_WELCOME_SECONDS;
    this.welcomeAlpha = 0;
    this.placedWelcome = false;
    markWelcomed(world.id);
    const card = this.welcomeCard;
    const { ctx, width: w } = card;
    // Erst der Inhalt, dann die Höhe: Eine Welt mit langer Zeile und fünf
    // Knöpfen braucht mehr Tafel als die Lobby — die Tafel wird so hoch wie
    // ihr Inhalt (`fitHeight`), der Grund kommt danach darunter.
    ctx.clearRect(0, 0, w, card.height);
    const x = 64;
    const inner = w - x - 56;
    ctx.textAlign = 'left';
    ctx.fillStyle = css(world.accent);
    ctx.font = `700 30px ${CARD_FONT}`;
    ctx.fillText('WILLKOMMEN', x, 78);
    ctx.fillStyle = CARD_INK;
    ctx.font = `800 70px ${CARD_FONT}`;
    ctx.fillText(world.title, x, 150, inner);
    let y = 212;
    ctx.font = `500 36px ${CARD_FONT}`;
    ctx.fillStyle = CARD_INK;
    for (const line of wrapLines(ctx, intro.goal, inner, 3)) {
      ctx.fillText(line, x, y);
      y += 46;
    }
    if (intro.first) {
      y += 8;
      ctx.font = `600 32px ${CARD_FONT}`;
      ctx.fillStyle = css(world.accent);
      for (const line of wrapLines(ctx, intro.first, inner, 2)) {
        ctx.fillText(line, x, y);
        y += 42;
      }
    }
    y += 10;
    const chips = xrIntroKeys(intro.tips);
    y += paintChips(ctx, chips, x, y, inner, 28);
    y += 52;
    ctx.font = `500 26px ${CARD_FONT}`;
    ctx.fillStyle = CARD_DIM;
    ctx.fillText('Trigger auf die Tafel: Verstanden · geht von selbst', x, y, inner);
    const h = Math.min(card.height, Math.ceil(y + 40));
    paintFrame(ctx, w, h, world.accent, 'left', 36, true);
    card.fitHeight(h);
  }

  /** _Verstanden_ — die Tafel blendet aus; die Welt bleibt begrüßt. */
  dismissWelcome(): void {
    if (this.welcomeWorld) this.welcomeLeft = Math.min(this.welcomeLeft, 0);
  }

  private hideWelcome(): void {
    this.welcomeWorld = '';
    this.welcomeAlpha = 0;
    this.welcomeCard.visible = false;
  }

  /** Steht gerade die Willkommens-Tafel? */
  get welcomeOpen(): boolean {
    return this.welcomeCard.visible;
  }

  private updateHints(label: XRHintLabel | null): void {
    const host = label ? this.hintGrip() : null;
    if (host !== this.hintHost) {
      this.hintLabel.removeFromParent();
      if (host) host.add(this.hintLabel);
      this.hintHost = host;
    }
    this.hintLabel.visible = host !== null;
    if (!host || !label) return;
    const text = xrHintText(label);
    if (text !== this.hintText) {
      this.hintText = text;
      this.paintHints(label);
    }
    // Über der Hand, ein wenig zum Körper hin — und zum Auge gedreht.
    this.hintLabel.position.set(0, 0.075, 0.035);
    host.updateMatrixWorld();
    this.hintLabel.lookAt(this.camera.getWorldPosition(_eye));
  }

  /**
   * Wo die Beschriftung hängt, wenn keine Hand getragen wird — nur für die
   * Vorschau am Schirm (`App.xrPreview`): ein Punkt vor der Kamera, an dem in
   * der Brille die rechte Hand wäre.
   */
  previewHand: THREE.Object3D | null = null;

  /** Der Griff der rechten Hand (dort sitzt `A`) — sonst der linken, sonst keiner. */
  private hintGrip(): THREE.Object3D | null {
    for (const hand of ['right', 'left'] as const) {
      const one = this.input.get(hand);
      if (one?.tracked && !one.isHand) return one.grip;
    }
    return this.previewHand;
  }

  /** Das Vorschaubild der Zielwelt — dasselbe wie auf der Startseite. */
  private loadImage(world: WorldDefinition): void {
    this.image = null;
    if (!world.preview) return;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (this.target !== world) return;
      this.image = image;
      this.paintTransit();
    };
    image.src = `${import.meta.env.BASE_URL ?? '/'}${world.preview}`;
  }

  private image: HTMLImageElement | null = null;

  private paintTransit(): void {
    const world = this.target;
    if (!world) return;
    const card = this.transitCard;
    const { ctx, width: w, height: h } = card;
    const pad = TRANSIT_PAD;
    paintFrame(ctx, w, h, world.accent, 'top');
    // Links das Bild der Welt, rechts Name und Zeile — wie der Ladebildschirm
    // am Schirm, nur quer, damit die Tafel nicht höher als nötig ist.
    let x = pad + 8;
    if (this.image) {
      const iw = 360;
      const ih = 250;
      drawCover(ctx, this.image, pad, 48, iw, ih, 22);
      x = pad + iw + 36;
    }
    const inner = w - x - pad;
    ctx.textAlign = 'left';
    ctx.fillStyle = css(world.accent);
    ctx.font = `700 30px ${CARD_FONT}`;
    ctx.fillText('NÄCHSTE WELT', x, 96);
    ctx.fillStyle = CARD_INK;
    ctx.font = `800 70px ${CARD_FONT}`;
    ctx.fillText(world.title, x, 172, inner);
    ctx.fillStyle = CARD_DIM;
    ctx.font = `500 32px ${CARD_FONT}`;
    let y = 226;
    for (const line of wrapLines(ctx, world.tagline, inner, 2)) {
      ctx.fillText(line, x, y);
      y += 42;
    }
    // Der Balken selbst ist Geometrie (`barFill`, bei `TRANSIT_BAR_Y`); die
    // Zeile darunter.
    ctx.fillStyle = CARD_INK;
    ctx.font = `500 30px ${CARD_FONT}`;
    ctx.fillText(this.lineText || loadLine(this.load), pad, TRANSIT_BAR_Y + 58);
    card.texture.needsUpdate = true;
  }

  private paintHints(label: XRHintLabel): void {
    const card = this.hintLabel;
    const { ctx, width: w } = card;
    // So hoch wie ihr Inhalt: Schildchen (wenn es eins gibt) und eine Zeile
    // je Knopf — zwei Knöpfe sind eine kleinere Tafel als drei.
    const rowH = 56;
    const top = label.title ? 60 : 18;
    const h = Math.min(card.height, top + rowH * label.items.length + 14);
    ctx.clearRect(0, 0, w, card.height);
    paintFrame(ctx, w, h, 0xffd34d, 'top', 28);
    if (label.title) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffd34d';
      ctx.font = `700 26px ${CARD_FONT}`;
      ctx.fillText(label.title, 22, 46);
    }
    label.items.forEach((item, index) => {
      paintChip(ctx, item, 22, top + rowH * (index + 0.5), 28);
    });
    card.fitHeight(h);
  }

  dispose(): void {
    this.fade.removeFromParent();
    this.fade.geometry.dispose();
    this.fade.material.dispose();
    for (const card of [this.transitCard, this.welcomeCard, this.hintLabel]) {
      card.removeFromParent();
      card.dispose();
    }
    for (const bar of [this.barTrack, this.barFill]) {
      bar.geometry.dispose();
      bar.material.dispose();
    }
    this.removeFromParent();
  }
}

/** Die Ladetafel: Leinwand in Pixeln, Breite in Metern, Rand, Höhe des Balkens. */
const TRANSIT_W = 1024;
const TRANSIT_H = 440;
const TRANSIT_M = 0.96;
const TRANSIT_PAD = 40;
const TRANSIT_BAR_Y = 338;

/** Ein Bild so in ein Rechteck, dass es ganz gefüllt ist (wie `object-fit: cover`). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(
    image,
    (image.naturalWidth - sw) / 2,
    (image.naturalHeight - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
  ctx.restore();
}

/** Was `XRGuide.update` je Bild wissen muss. */
export interface XRGuideState {
  /** Brille auf — oder die Vorschau am Schirm. */
  readonly presenting: boolean;
  readonly menuOpen: boolean;
  readonly world: WorldDefinition | null;
  readonly zone: HintZone | null;
  readonly rigFlags: XRHintContext;
  readonly hintsOn: boolean;
  readonly welcomeOn: boolean;
}

/** Eine Tafel mit Leinwand — ohne Tiefenprüfung, vor allem anderen. */
class CardMesh extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;

  constructor(
    readonly width: number,
    readonly height: number,
    private readonly meters: number,
    order: number,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    super(
      new THREE.PlaneGeometry(meters, (meters * height) / width),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    );
    this.ctx = canvas.getContext('2d')!;
    this.texture = texture;
    this.renderOrder = order;
    this.frustumCulled = false;
  }

  /**
   * **Nur die oberen `used` Pixel zeigen** — die Tafel wird so hoch wie ihr
   * Inhalt, ohne eine neue Leinwand oder Geometrie: Die Textur zeigt den
   * oberen Streifen, das Quad wird entsprechend gestaucht. Die obere Kante
   * bleibt dabei stehen, damit die Tafel nicht nach oben aus dem Blick
   * wächst.
   */
  fitHeight(used: number): void {
    const share = Math.max(0.05, Math.min(1, used / this.height));
    this.texture.repeat.set(1, share);
    this.texture.offset.set(0, 1 - share);
    this.texture.needsUpdate = true;
    this.geometry.dispose();
    const meters = this.meters;
    this.geometry = new THREE.PlaneGeometry(meters, (meters * used) / this.width);
    // Oben bündig: die Mitte rückt um die halbe gesparte Höhe nach oben.
    this.geometry.translate(0, ((meters * (this.height - used)) / this.width) * 0.5, 0);
    this.geometry.computeBoundingBox();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}

function barPlane(
  width: number,
  height: number,
  color: number,
  opacity: number,
  order: number,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    }),
  );
  mesh.renderOrder = order;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Die Tafel `distance` Meter vor den Kopf, in Richtung `yaw`, `drop` Meter
 * unter die Augen und leicht zu ihnen hin geneigt. `blend` 1 setzt sie hin,
 * weniger rückt sie weich nach.
 */
function place(
  card: THREE.Object3D,
  head: THREE.Vector3,
  yaw: number,
  distance: number,
  drop: number,
  blend: number,
): void {
  _target.set(head.x - Math.sin(yaw) * distance, head.y + drop, head.z - Math.cos(yaw) * distance);
  if (blend >= 1 || card.position.distanceToSquared(_target) > 4) card.position.copy(_target);
  else card.position.lerp(_target, blend);
  card.rotation.set(Math.atan2(drop, distance), yaw, 0, 'YXZ');
}

/** Das Gieren eines Kopfes: wohin die Nase in der Ebene zeigt. */
function yawOf(quat: THREE.Quaternion): number {
  _forward.set(0, 0, -1).applyQuaternion(quat);
  return Math.atan2(-_forward.x, -_forward.z);
}

const _headPos = new THREE.Vector3();
const _headQuat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _target = new THREE.Vector3();
const _eye = new THREE.Vector3();
