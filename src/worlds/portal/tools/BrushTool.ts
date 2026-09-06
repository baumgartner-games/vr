import * as THREE from 'three';
import { Tool, disposeToolTree, grabMaterial, type ToolHost } from './Tool';
import { playPick } from '../../../core/Audio';
import { DEFAULT_MATERIAL, MATERIALS, type SurfaceMaterial } from './materials';
import { brushSettings, saveBrushSettings } from './gearStore';
import {
  BRUSH_KINDS,
  BRUSH_KIND_LABELS,
  BRUSH_KIND_SUBS,
  CHANNELS,
  CHANNEL_LABELS,
  CHISEL_RATIO,
  MAX_SWATCHES,
  alphaOf,
  channelsOf,
  stampOf,
  widthFraction,
  widthFromFraction,
  widthLabel,
  withChannel,
  withSwatch,
  withoutSwatch,
  type BrushSettings,
} from './brushSettings';
import type { BrushStroke, PaintSurface } from './paintCanvas';
import type { PointerHit } from '../../../core/Pointer';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** The palette. Six columns, so a row is easy to sweep along with the brush. */
const COLORS = [
  0xff3b2f, 0xff9d3d, 0xffc857, 0xf3f6fb, 0x5ee0a0, 0x2fbf8f, 0x2f8fff, 0x4aa8ff, 0x9d7bff,
  0xff6ea3, 0x8e9db8, 0x22293a,
];
const COLUMNS = 6;
const ROWS = Math.ceil(COLORS.length / COLUMNS);

const CANVAS_W = 512;
/** Die Reiterzeile über allen Seiten. */
const TAB_H = 74;
/**
 * Der **Schließknopf** ganz rechts in der Reiterzeile, quadratisch — und
 * damit ist der Platz für die drei Reiter um genau ihn kürzer.
 */
const CLOSE_W = TAB_H;
const TABS_W = CANVAS_W - CLOSE_W;
const CELL = CANVAS_W / COLUMNS;

// --- die Farbseite, von oben nach unten -------------------------------------
const PRESET_Y = TAB_H;
const PRESET_H = CELL * ROWS;
/** Die Überschrift über der eigenen Reihe — sonst sind es nur zwei Gitter. */
const HEAD_H = 30;
const SWATCH_Y = PRESET_Y + PRESET_H + HEAD_H;
const SWATCH_H = CELL;
const SLIDER_Y = SWATCH_Y + SWATCH_H;
const SLIDER_H = 56;
const MIX_Y = SLIDER_Y + CHANNELS.length * SLIDER_H;
const MIX_H = 84;
const CANVAS_H = MIX_Y + MIX_H;

// --- die Pinselseite ---------------------------------------------------------
const KIND_H = 84;
const WIDTH_Y = TAB_H + BRUSH_KINDS.length * KIND_H;
const SAMPLE_Y = WIDTH_Y + SLIDER_H;
const SAMPLE_H = 100;

/** Eine Materialzeile ist so hoch, dass acht davon die Seite füllen. */
const ROW_H = (CANVAS_H - TAB_H) / MATERIALS.length;

/** Wie weit ein Regler links und rechts von der Kante wegbleibt. */
const SLIDER_PAD = 26;

const PANEL_W = 0.19;
const PANEL_H = (PANEL_W / CANVAS_W) * CANVAS_H;

/** How far the brush may reach to paint something it is not touching. */
const PAINT_RANGE = 4;

/**
 * Der Stiel liegt auf der **z-Achse durch den Griffpunkt**, wie der Stiel des
 * Hammers (`POLE_GRIP`) — und wird trotzdem völlig anders gehalten: nicht in
 * der Faust, sondern **wie ein Stift** zwischen Daumen, Zeigefinger und
 * Mittelgelenk, mit dem Stiel über der Schwimmhaut nach hinten heraus. Die
 * Hand dazu ist deshalb keine Faust und steht auch nicht als
 * `fistOnGrip`-Rechnung da, sondern als eingemessene Haltung
 * (`BRUSH_HAND_POSE` in `core/handPose.ts`, nachgemessen in
 * `core/gripFist.test.ts`).
 */

/**
 * Wo der Stiel in der Hand liegt — gemessen, nicht gerechnet.
 *
 * Ein Stift wird nicht dort gehalten, wo eine Faust eine Stange hält: er liegt
 * gut fünf Zentimeter höher und ein Stück weiter vorn als der Hammerstiel
 * (`POLE_HOLD_POSITION`, `0 / −1,2 / 2,0` cm). Diese drei Zahlen kommen aus
 * dem Justierstand in der Brille und sind als Kurzcode hereingekommen.
 */
export const BRUSH_HOLD = { x: 0, y: 0.047, z: -0.014 };

/** Der Stiel — der Griff — von hinten nach vorn auf der z-Achse, und sein Halbmesser. */
const HANDLE_BACK = 0.06;
const HANDLE_FRONT = -0.055;
const HANDLE_R = 0.016;

/** Welche Seite der Palette gerade oben liegt. */
type Page = 'colors' | 'brush' | 'materials';

const PAGES: readonly Page[] = ['colors', 'brush', 'materials'];
const PAGE_LABELS: Record<Page, string> = {
  colors: 'Farben',
  brush: 'Pinsel',
  materials: 'Material',
};

/** Was für ein Feld auf der Palette unter dem Strahl (oder der Spitze) liegt. */
type SlotKind =
  | 'tab'
  | 'close'
  /** Eine der zwölf festen Farben. */
  | 'cell'
  /** Ein Platz in der eigenen Reihe. */
  | 'swatch'
  /** Die drei Farbregler (0…2) und der Breitenregler (3). */
  | 'slider'
  /** Die gemischte Farbe in die eigene Reihe legen — oder wieder heraus. */
  | 'save'
  | 'drop'
  /** Eine Pinselart. */
  | 'brush'
  /** Ein Material. */
  | 'material';

interface Slot {
  kind: SlotKind;
  index: number;
  /** Wo entlang eines Reglers getroffen wurde, von 0 bis 1. */
  at?: number;
}

/** Der Breitenregler ist der vierte — hinter Rot, Grün und Blau. */
const WIDTH_SLIDER = CHANNELS.length;

const _tip = new THREE.Vector3();
const _local = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _wrist = new THREE.Vector3();
const _head = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _handUp = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _quaternion = new THREE.Quaternion();

/**
 * Pinsel, Farbe, Strich und Material.
 *
 * Solange der Pinsel gehalten wird, schwebt die Palette über der anderen Hand.
 * Ausgewählt wird auf **zwei** Arten, und beide sind dieselbe Geste wie
 * anderswo im Spiel:
 *
 * - **Antippen** mit der Pinselspitze — der kurze Weg, wenn die Hand ohnehin
 *   dort ist.
 * - **Zielen und Trigger**, wie an jeder anderen Tafel: der Zeigestrahl der
 *   Pinselhand liegt auf der Palette, das Feld darunter leuchtet, Trigger
 *   nimmt es. Dafür hängt die Palette als Pointer-Ziel im Raum
 *   (`ctx.pointer`), und sie hört bewusst **nur auf die Pinselhand**: der
 *   Strahl der Hand, die sie trägt, striche sonst dauernd über sie hinweg und
 *   nähme dieser Hand ihren Trigger weg. Ein **Regler** wird dabei nicht
 *   getippt, sondern gezogen: gedrückt halten und daran entlangfahren.
 *
 * Von da an gibt der Trigger jedem Objekt, das der Pinsel berührt oder
 * anzielt, **beides** — Farbe *und* Material —, und zwar für alle in der
 * Sitzung. Trifft er stattdessen eine **Leinwand** (die Staffelei), malt er
 * darauf: Trigger halten und ziehen ist ein Strich, kein Anstrich.
 *
 * Oben rechts steht ein **✕**: die Palette geht zu und bleibt zu, bis `A`/`X`
 * sie wieder aufmacht. Sie ist die eine Tafel, die die ganze Zeit über der
 * freien Hand hängt — wer mit dem Pinsel etwas *anderes* tun will, soll sie
 * wegräumen können, ohne den Pinsel wegzulegen.
 *
 * Oben stehen drei Reiter:
 *
 * - **Farben** — die zwölf festen Töne, drei Regler für Rot, Grün und Blau,
 *   und darunter die **eigene Reihe**: was man sich mischt, legt man dorthin
 *   und findet es nach dem nächsten Start wieder (`brushSettings.ts`,
 *   `gearStore.ts`). Ohne sie wäre jeder Ton, den die zwölf nicht treffen,
 *   ein Ton für genau einen Strich.
 * - **Pinsel** — Art und Breite (`brushSettings.ts`). Auf einer Kiste sieht
 *   man den Unterschied nicht; auf der Leinwand der Staffelei ist er die
 *   halbe Arbeit, und ein Bild aus lauter gleich dicken Würsten ist keins.
 * - **Material** — Lack, Metall, Gummi, Eis, Stein, Glas, Leuchtend, Schaum
 *   (`materials.ts`). Ein Material ist beides zugleich: wie das Objekt
 *   aussieht *und* wie es sich verhält. Eine Kiste aus Gummi springt, eine aus
 *   Eis rutscht. **Lack** ist der Weg zurück — ohne ihn wäre jeder
 *   Pinselstrich endgültig.
 *
 * Dass ein Strich immer beides setzt, ist Absicht: was die Palette zeigt, ist
 * das, was das Objekt bekommt. Eine Farbe, die je nach Vorgeschichte mal das
 * Material mitnimmt und mal nicht, kann man in der Brille nicht lesen.
 */
export class BrushTool extends Tool {
  override readonly toolId = 'brush';
  override readonly label = 'Pinsel';

  /** The palette lives in world space, next to the free hand. */
  readonly palette: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  private readonly tip: THREE.Mesh<THREE.ConeGeometry, THREE.MeshStandardMaterial>;
  private readonly ferrule: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly tipAnchor = new THREE.Object3D();
  /**
   * Farbe, Breite, Art und die eigene Reihe — im Speicher, damit sie den
   * nächsten Start überleben. Gehalten wird eine Kopie: ein Regler schreibt
   * sonst bei jedem Bild in `localStorage` (`commit`).
   */
  private brush: BrushSettings = brushSettings();
  private dirty = false;
  private material: SurfaceMaterial = DEFAULT_MATERIAL;
  private page: Page = 'colors';
  /** Was gerade leuchtet — die Spitze gewinnt, sonst zählt der Strahl. */
  private hovered: Slot | null = null;
  private tipSlot: Slot | null = null;
  private raySlot: Slot | null = null;
  private touching = '';
  /** Ob die Palette überhaupt gezeigt wird. Das ✕ macht sie zu, `A`/`X` auf. */
  private open = true;
  /** Die Hand, über der sie schwebt — deren Strahl hört sie nicht. */
  private paletteSide: Handedness | null = null;
  private hostRef: ToolHost | null = null;
  private listening = false;
  /** Die Leinwand, auf der der laufende Strich liegt. */
  private stroke: PaintSurface | null = null;
  /** Und die, auf der gerade der Vorschaukreis steht. */
  private aimed: PaintSurface | null = null;

  constructor() {
    super();
    this.name = 'tool-brush';
    this.icon = 'brush';
    this.accent = 0x5ee0a0;
    this.hint = 'Palette: antippen oder zielen + Trigger · ✕ zu, A/X auf · Trigger streicht an';

    const metal = new THREE.MeshStandardMaterial({
      color: 0xb9c2d4,
      roughness: 0.3,
      metalness: 0.7,
    });

    // Der Stiel **ist** der Griff: derselbe Stab wie am Hammer, nur wie ein
    // Stift gehalten (`BRUSH_HAND_POSE`), in Greiffarbe statt Holz — die
    // Farbe sagt „hier anfassen", und an einem Pinsel fasst man den Stiel an.
    // Eine Weile hing ein Standardgriff darunter, und der Pinsel lag wie eine
    // Pistole obenauf. Kein sichtbarer Griff mehr, und trotzdem zeigt er
    // dorthin, wohin man zeigt: der Stab liegt auf der z-Achse, und die ist der
    // Zeigestrahl.
    //
    // **Wo** der Stab in der Hand liegt, ist dagegen nicht mehr die Lage des
    // Hammerstiels (`POLE_HOLD_POSITION`): ein Stift liegt höher und weiter
    // vorn als eine Faust um eine Stange. Die Zahlen sind in der Brille
    // gemessen und als Kurzcode hereingekommen
    // (`BPGDLMh46J5ruqr3SNVh4H3V`, in `gearShort.test.ts` nachgelesen), ohne
    // Drehung obendrauf — der Pinsel bleibt auf dem Zeigestrahl.
    this.holdPosition.set(BRUSH_HOLD.x, BRUSH_HOLD.y, BRUSH_HOLD.z);

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(HANDLE_R * 0.85, HANDLE_R, HANDLE_BACK - HANDLE_FRONT, 14),
      grabMaterial({ roughness: 0.6 }),
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 0, (HANDLE_BACK + HANDLE_FRONT) / 2);
    this.add(handle);

    this.ferrule = new THREE.Mesh(
      new THREE.CylinderGeometry(HANDLE_R * 0.8, HANDLE_R * 0.85, 0.03, 12),
      metal,
    );
    this.ferrule.rotation.x = Math.PI / 2;
    this.ferrule.position.set(0, 0, HANDLE_FRONT - 0.015);
    this.add(this.ferrule);

    this.tip = new THREE.Mesh(
      new THREE.ConeGeometry(HANDLE_R * 0.9, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: this.brush.color, roughness: 0.5 }),
    );
    this.tip.rotation.x = -Math.PI / 2;
    this.tip.position.set(0, 0, HANDLE_FRONT - 0.03 - 0.025);
    this.add(this.tip);

    this.tipAnchor.position.set(0, 0, HANDLE_FRONT - 0.03 - 0.05);
    this.add(this.tipAnchor);

    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.palette = new THREE.Mesh(
      new THREE.PlaneGeometry(PANEL_W, PANEL_H),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.palette.name = 'brush-palette';
    this.palette.renderOrder = 11;
    this.palette.visible = false;
    this.showLoad();
    this.drawPalette();
  }

  /** The colour the brush is loaded with. */
  get currentColor(): number {
    return this.brush.color;
  }

  /** Das Material, das der nächste Strich mitgibt. */
  get currentMaterial(): string {
    return this.material.id;
  }

  /**
   * **Der Strich, wie er gerade eingestellt ist** — Farbe, Breite, Art.
   *
   * Die Breite steht in der Einstellung in Millimetern und auf der Leinwand in
   * Metern; umgerechnet wird sie genau hier, an einer Stelle.
   */
  get currentStroke(): BrushStroke {
    return { color: this.brush.color, width: this.brush.width / 1000, kind: this.brush.kind };
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    this.hostRef = host;
    if (this.palette.parent !== host.root) host.root.add(this.palette);
    this.open = true;
    this.palette.visible = true;
    this.listen(host);
  }

  override onStow(host: ToolHost): void {
    this.palette.visible = false;
    this.setHover(null, null);
    this.touching = '';
    this.endStroke();
    this.clearAim();
    this.commit();
    this.unlisten(host);
  }

  /**
   * `A`/`X` holt die geschlossene Palette zurück — und räumt sie auch wieder
   * weg. Ein Knopf, der nur in eine Richtung schaltet, ist einer, den man beim
   * zweiten Druck sucht.
   */
  override onPrimary(controller: ControllerState, host: ToolHost): void {
    this.open = !this.open;
    if (!this.open) this.setHover(null, null);
    controller.pulse(0.25, 15);
    playPick(this.open);
    host.notify(this.open ? 'Palette offen' : 'Palette zu · A/X öffnet sie wieder');
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    // Pointing at the palette always wins: that is where the colour comes from.
    if (this.hovered) {
      this.pick(this.hovered, controller, host);
      return;
    }

    // Eine Leinwand vor der Nase ist keine Kiste, die angestrichen wird,
    // sondern etwas, worauf man malt — sie kommt deshalb vor den Props.
    if (this.paintOn(host, false)) {
      controller.pulse(0.25, 12);
      return;
    }

    this.tipAnchor.getWorldPosition(_tip);
    const touched = host.propAt(_tip);
    if (touched) {
      this.applyTo(touched, host);
      controller.pulse(0.4, 25);
      return;
    }

    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    const aimed = host.aimAt(_tip, _direction, PAINT_RANGE);
    if (!aimed) {
      host.notify('Nichts zum Anmalen getroffen');
      return;
    }
    this.applyTo(aimed, host);
    controller.pulse(0.4, 25);
  }

  override onTriggerUp(_controller: ControllerState, _host: ToolHost): void {
    this.endStroke();
    // Ein Regler ist beim Loslassen zu Ende gezogen — jetzt darf er in den
    // Speicher, und nicht neunzigmal je Sekunde währenddessen.
    this.commit();
  }

  override update(_dt: number, host: ToolHost, controller: ControllerState | null): void {
    this.hostRef = host;
    if (!controller || !this.heldBy) {
      this.palette.visible = false;
      this.endStroke();
      this.clearAim();
      return;
    }
    this.listen(host);

    // Ein gehaltener Trigger, der auf einer Leinwand angefangen hat, malt
    // weiter — Bild für Bild, mit einer Linie vom letzten Punkt. Erst das
    // macht aus dem Tupfer einen Strich.
    if (this.stroke && controller.trigger.pressed) this.paintOn(host, true);
    else if (!controller.trigger.pressed) this.endStroke();

    // Und ein gehaltener Trigger auf einem **Regler** zieht ihn: ein Wert, den
    // man nur antippen kann, stellt man in der Brille nie ein.
    if (controller.trigger.pressed && this.raySlot?.kind === 'slider') this.drag(this.raySlot);

    this.showAim(host);

    const other: Handedness = this.heldBy === 'left' ? 'right' : 'left';
    this.paletteSide = other;
    if (!this.open) {
      this.palette.visible = false;
      this.setHover(null, null);
      return;
    }
    const free = host.ctx.input.get(other);
    const anchor = free?.tracked ? handAnchor(free) : null;
    if (!anchor) {
      this.palette.visible = false;
      this.setHover(null, null);
      return;
    }

    // The palette stands on the free hand and looks at the player, like the
    // wrist menu does — the same gesture, so it needs no explaining.
    anchor.getWorldPosition(_wrist);
    host.ctx.rig.getHeadPosition(_head);
    _handUp.set(0, 1, 0).applyQuaternion(anchor.getWorldQuaternion(_quaternion));
    if (Math.abs(_handUp.y) < 0.15) _handUp.copy(_up);

    _direction.copy(_head).sub(_wrist).normalize();
    this.palette.position
      .copy(_wrist)
      .addScaledVector(_direction, 0.06)
      .addScaledVector(_handUp, 0.12);
    _matrix.lookAt(_head, this.palette.position, _handUp);
    this.palette.quaternion.setFromRotationMatrix(_matrix);
    this.palette.visible = true;
    this.palette.updateMatrixWorld(true);

    this.updateHover(controller);
  }

  override disposeTool(): void {
    this.commit();
    if (this.hostRef) this.unlisten(this.hostRef);
    this.hostRef = null;
    disposeToolTree(this);
    this.palette.geometry.dispose();
    this.palette.material.dispose();
    this.palette.removeFromParent();
    this.texture.dispose();
  }

  /** Farbe und Material auf ein Objekt — beides zusammen, für alle. */
  private applyTo(entry: Parameters<ToolHost['styleProp']>[0], host: ToolHost): void {
    host.styleProp(entry, { color: this.brush.color, material: this.material.id });
  }

  /**
   * Ein Klecks auf eine Leinwand — mit der Spitze, sonst mit dem Zielstrahl.
   *
   * `join` zieht die Linie vom letzten Punkt: das ist der laufende Strich,
   * und er bleibt auf derselben Leinwand, auf der er angefangen hat.
   */
  private paintOn(host: ToolHost, join: boolean): boolean {
    const surfaces = host.paintSurfaces();
    if (surfaces.length === 0) return false;
    this.tipAnchor.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();

    const stroke = this.currentStroke;
    const only = join ? this.stroke : null;
    for (const surface of only ? [only] : surfaces) {
      const painted =
        surface.paintAt(_tip, stroke, join) ||
        surface.paintRay(_tip, _direction, PAINT_RANGE, stroke, join);
      if (!painted) continue;
      this.stroke = surface;
      return true;
    }
    return false;
  }

  /** Der Strich ist zu Ende — der nächste fängt neu an, auch am selben Fleck. */
  private endStroke(): void {
    this.stroke?.endStroke();
    this.stroke = null;
  }

  /**
   * **Der Kreis auf der Leinwand**: wo ein Strich jetzt hinginge.
   *
   * Gesucht wird genau wie beim Malen (`paintOn`) — erst die Spitze, dann der
   * Strahl, die erste Leinwand gewinnt —, damit der Ring dort steht, wo der
   * Trigger auch hinträfe, und nicht auf der Leinwand daneben.
   *
   * Liegt der Strahl gerade auf der **Palette**, gibt es keinen Ring: dann
   * nimmt der Trigger eine Farbe und malt nicht, und ein Kreis auf der
   * Leinwand verspräche das Gegenteil.
   */
  private showAim(host: ToolHost): void {
    if (this.hovered) {
      this.clearAim();
      return;
    }
    this.tipAnchor.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();

    const stroke = this.currentStroke;
    let found: PaintSurface | null = null;
    for (const surface of host.paintSurfaces()) {
      if (!surface.aimAt(_tip, stroke) && !surface.aimRay(_tip, _direction, PAINT_RANGE, stroke)) {
        continue;
      }
      found = surface;
      break;
    }
    if (this.aimed && this.aimed !== found) this.aimed.clearAim();
    this.aimed = found;
  }

  /** Kein Ziel mehr — der Ring geht weg, auch wenn die Staffelei bleibt. */
  private clearAim(): void {
    this.aimed?.clearAim();
    this.aimed = null;
  }

  /**
   * Die Palette hängt als Tafel im Raum: dieselbe Bedienung wie jedes andere
   * Panel — zielen, Trigger. Nur die Hand, die sie trägt, wird überhört.
   */
  private listen(host: ToolHost): void {
    if (this.listening) return;
    this.listening = true;
    host.ctx.pointer.add({
      object: this.palette,
      // Angetippt wird mit der Pinselspitze und nicht mit dem Finger der Hand,
      // die die Palette trägt — die läge sonst dauernd auf ihrem eigenen Panel.
      pokeable: false,
      ignore: (hand) => hand !== null && hand === this.paletteSide,
      onHover: (hit) => this.setHover(this.tipSlot, this.slotFromHit(hit)),
      onBlur: () => this.setHover(this.tipSlot, null),
      onSelect: (hit) => {
        const slot = this.slotFromHit(hit);
        const controller = hit.hand ? host.ctx.input.get(hit.hand) : null;
        if (slot) this.pick(slot, controller ?? null, host);
      },
    });
  }

  private unlisten(host: ToolHost): void {
    if (!this.listening) return;
    this.listening = false;
    host.ctx.pointer.remove(this.palette);
  }

  /** Wo ein Strahl die Palette getroffen hat, als Feld. */
  private slotFromHit(hit: PointerHit): Slot | null {
    if (!hit.uv) return null;
    return this.slotAtCanvas(hit.uv.x * CANVAS_W, (1 - hit.uv.y) * CANVAS_H);
  }

  /** Which slot the brush tip is over, and whether it actually touches it. */
  private updateHover(controller: ControllerState): void {
    this.tipAnchor.getWorldPosition(_tip);
    _local.copy(_tip);
    this.palette.worldToLocal(_local);

    const inside =
      Math.abs(_local.x) <= PANEL_W / 2 &&
      Math.abs(_local.y) <= PANEL_H / 2 &&
      Math.abs(_local.z) <= 0.07;
    const slot = inside ? this.slotAt(_local) : null;
    this.setHover(slot, this.raySlot);

    // Actually poking a swatch picks it without the trigger.
    const touched = slot && Math.abs(_local.z) < 0.022;
    if (touched && slot.kind === 'slider') {
      // Ein Regler wird auch mit der Spitze *gezogen* und nicht einmal
      // angetippt: die Hand fährt daran entlang, und der Wert folgt.
      this.drag(slot);
      this.touching = keyOf(slot);
      return;
    }
    const touching = touched && slot ? keyOf(slot) : '';
    if (touching && touching !== this.touching && slot) this.pick(slot, controller, this.hostRef);
    this.touching = touching;
  }

  /**
   * Was leuchtet: die Spitze, sonst der Strahl.
   *
   * Zwei Quellen, ein Bild — und nur so bleibt das Anzielen stehen, während
   * die Pinselspitze irgendwo im Raum herumfährt. Beide in *ein* Feld zu
   * schreiben hieße: wer zielt, verliert es im nächsten Bild wieder.
   */
  private setHover(tip: Slot | null, ray: Slot | null): void {
    this.tipSlot = tip;
    this.raySlot = ray;
    const next = tip ?? ray;
    if (keyOf(next) === keyOf(this.hovered)) return;
    this.hovered = next;
    this.drawPalette();
  }

  /** Welches Feld unter diesem Punkt liegt — Reiter oben, Seite darunter. */
  private slotAt(local: THREE.Vector3): Slot | null {
    const x = ((local.x + PANEL_W / 2) / PANEL_W) * CANVAS_W;
    const y = ((PANEL_H / 2 - local.y) / PANEL_H) * CANVAS_H;
    return this.slotAtCanvas(x, y);
  }

  /** Dasselbe auf der Leinwand der Palette, in Bildpunkten. */
  private slotAtCanvas(x: number, y: number): Slot | null {
    if (x < 0 || x >= CANVAS_W || y < 0 || y >= CANVAS_H) return null;
    if (y < TAB_H) {
      if (x >= TABS_W) return { kind: 'close', index: 0 };
      return { kind: 'tab', index: Math.min(PAGES.length - 1, Math.floor(x / (TABS_W / 3))) };
    }

    if (this.page === 'materials') {
      const row = Math.floor((y - TAB_H) / ROW_H);
      return row >= 0 && row < MATERIALS.length ? { kind: 'material', index: row } : null;
    }

    if (this.page === 'brush') {
      if (y < WIDTH_Y) {
        const row = Math.floor((y - TAB_H) / KIND_H);
        return row >= 0 && row < BRUSH_KINDS.length ? { kind: 'brush', index: row } : null;
      }
      if (y < WIDTH_Y + SLIDER_H) {
        return { kind: 'slider', index: WIDTH_SLIDER, at: sliderFraction(x) };
      }
      return null;
    }

    if (y < PRESET_Y + PRESET_H) {
      const column = Math.floor(x / CELL);
      const row = Math.floor((y - PRESET_Y) / CELL);
      const index = row * COLUMNS + column;
      return index >= 0 && index < COLORS.length ? { kind: 'cell', index } : null;
    }
    if (y >= SWATCH_Y && y < SWATCH_Y + SWATCH_H) {
      const index = Math.floor(x / CELL);
      return index >= 0 && index < MAX_SWATCHES ? { kind: 'swatch', index } : null;
    }
    if (y >= SLIDER_Y && y < MIX_Y) {
      const index = Math.floor((y - SLIDER_Y) / SLIDER_H);
      return index >= 0 && index < CHANNELS.length
        ? { kind: 'slider', index, at: sliderFraction(x) }
        : null;
    }
    if (y >= MIX_Y) {
      if (x < MIX_H) return null; // die Vorschau selbst ist kein Knopf
      return x < CANVAS_W * 0.72 ? { kind: 'save', index: 0 } : { kind: 'drop', index: 0 };
    }
    return null;
  }

  /** Einen Regler auf den Wert unter dem Strahl (oder der Spitze) ziehen. */
  private drag(slot: Slot): void {
    const at = slot.at ?? 0;
    if (slot.index === WIDTH_SLIDER) {
      const width = widthFromFraction(at);
      if (width === this.brush.width) return;
      this.brush = { ...this.brush, width };
    } else {
      const channel = CHANNELS[slot.index];
      if (!channel) return;
      const color = withChannel(this.brush.color, channel, at);
      if (color === this.brush.color) return;
      this.setColor(color);
    }
    this.dirty = true;
    this.showLoad();
    this.drawPalette();
  }

  private pick(slot: Slot, controller: ControllerState | null, host: ToolHost | null): void {
    if (slot.kind === 'close') {
      this.open = false;
      this.palette.visible = false;
      this.setHover(null, null);
      this.touching = '';
      controller?.pulse(0.25, 15);
      playPick(false);
      host?.notify('Palette zu · A/X öffnet sie wieder');
      return;
    }

    if (slot.kind === 'tab') {
      const page = PAGES[slot.index] ?? 'colors';
      if (page === this.page) return;
      this.page = page;
      this.hovered = null;
      this.tipSlot = null;
      this.raySlot = null;
      this.touching = '';
      controller?.pulse(0.25, 15);
      playPick(false);
      this.drawPalette();
      return;
    }

    if (slot.kind === 'slider') {
      this.drag(slot);
      this.commit();
      controller?.pulse(0.2, 12);
      return;
    }

    switch (slot.kind) {
      case 'material': {
        const next = MATERIALS[slot.index];
        if (!next || next.id === this.material.id) return;
        this.material = next;
        // Der Griff zeigt, woraus der nächste Strich ist: matt, glänzend oder
        // durchsichtig — dieselbe Vorschau, die das Objekt danach bekommt.
        this.ferrule.material.roughness = next.roughness;
        this.ferrule.material.metalness = next.metalness;
        this.ferrule.material.needsUpdate = true;
        break;
      }
      case 'brush': {
        const kind = BRUSH_KINDS[slot.index];
        if (!kind || kind === this.brush.kind) return;
        this.brush = { ...this.brush, kind };
        this.dirty = true;
        break;
      }
      case 'swatch': {
        const next = this.brush.swatches[slot.index];
        // Ein leerer Platz ist keine Farbe, sondern eine Einladung: er legt
        // die gemischte hinein, statt nichts zu tun.
        if (next === undefined) {
          this.brush = {
            ...this.brush,
            swatches: withSwatch(this.brush.swatches, this.brush.color),
          };
          this.dirty = true;
          host?.notify('Farbe in der eigenen Reihe');
          break;
        }
        if (next === this.brush.color) return;
        this.setColor(next);
        this.dirty = true;
        break;
      }
      case 'save': {
        const swatches = withSwatch(this.brush.swatches, this.brush.color);
        this.brush = { ...this.brush, swatches };
        this.dirty = true;
        host?.notify(`Farbe gespeichert · ${swatches.length}/${MAX_SWATCHES}`);
        break;
      }
      case 'drop': {
        const swatches = withoutSwatch(this.brush.swatches, this.brush.color);
        if (swatches.length === this.brush.swatches.length) {
          host?.notify('Diese Farbe liegt nicht in der eigenen Reihe');
          return;
        }
        this.brush = { ...this.brush, swatches };
        this.dirty = true;
        host?.notify('Farbe aus der eigenen Reihe genommen');
        break;
      }
      default: {
        const next = COLORS[slot.index];
        if (next === undefined || next === this.brush.color) return;
        this.setColor(next);
        this.dirty = true;
        break;
      }
    }
    this.commit();
    controller?.pulse(0.3, 20);
    playPick(true);
    this.showLoad();
    this.drawPalette();
  }

  /** Die geladene Farbe — und die Spitze, die sie zeigt. */
  private setColor(color: number): void {
    this.brush = { ...this.brush, color };
    this.tip.material.color.setHex(color);
  }

  /**
   * Was der Pinsel gerade trägt, am Werkzeug selbst: die Farbe an der Spitze
   * und ihre **Größe**. Ein Pinsel, der bei zwei Millimetern genauso aussieht
   * wie bei acht Zentimetern, sagt nicht, was er malen wird.
   */
  private showLoad(): void {
    this.tip.material.color.setHex(this.brush.color);
    const scale = THREE.MathUtils.clamp(this.brush.width / 20, 0.35, 2.4);
    this.tip.scale.set(scale, 1, scale);
  }

  /** In den Speicher, aber nur einmal am Ende einer Bewegung. */
  private commit(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.brush = saveBrushSettings(this.brush);
  }

  // --- die Palette zeichnen --------------------------------------------------

  private drawPalette(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.beginPath();
    ctx.roundRect(2, 2, CANVAS_W - 4, CANVAS_H - 4, 18);
    ctx.fillStyle = 'rgba(9, 14, 26, 0.92)';
    ctx.fill();

    this.drawTabs(ctx);
    if (this.page === 'materials') this.drawMaterials(ctx);
    else if (this.page === 'brush') this.drawBrush(ctx);
    else this.drawColors(ctx);

    this.texture.needsUpdate = true;
  }

  private drawTabs(ctx: CanvasRenderingContext2D): void {
    const width = TABS_W / PAGES.length;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [index, page] of PAGES.entries()) {
      const x = index * width;
      const active = page === this.page;
      const hot = this.hovered?.kind === 'tab' && this.hovered.index === index;
      ctx.beginPath();
      ctx.roundRect(x + 6, 8, width - 12, TAB_H - 16, 14);
      ctx.fillStyle = active ? 'rgba(94, 224, 160, 0.22)' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      if (active || hot) {
        ctx.lineWidth = active ? 5 : 3;
        ctx.strokeStyle = active ? '#5ee0a0' : 'rgba(255,255,255,0.6)';
        ctx.stroke();
      }
      ctx.fillStyle = active ? '#ffffff' : 'rgba(255,255,255,0.65)';
      ctx.font = '600 27px system-ui, sans-serif';
      ctx.fillText(PAGE_LABELS[page], x + width / 2, TAB_H / 2);
    }
    this.drawClose(ctx);
  }

  /** Das ✕ ganz rechts: dieselbe Stelle wie in jedem Fenster, das man kennt. */
  private drawClose(ctx: CanvasRenderingContext2D): void {
    const hot = this.hovered?.kind === 'close';
    ctx.beginPath();
    ctx.roundRect(TABS_W + 8, 8, CLOSE_W - 16, TAB_H - 16, 14);
    ctx.fillStyle = hot ? 'rgba(255, 110, 163, 0.22)' : 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.lineWidth = hot ? 4 : 2;
    ctx.strokeStyle = hot ? '#ff6ea3' : 'rgba(255,255,255,0.35)';
    ctx.stroke();

    const cx = TABS_W + CLOSE_W / 2;
    const cy = TAB_H / 2;
    const arm = 12;
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy - arm);
    ctx.lineTo(cx + arm, cy + arm);
    ctx.moveTo(cx + arm, cy - arm);
    ctx.lineTo(cx - arm, cy + arm);
    ctx.lineWidth = 5;
    ctx.strokeStyle = hot ? '#ffffff' : 'rgba(255,255,255,0.75)';
    ctx.stroke();
  }

  private drawColors(ctx: CanvasRenderingContext2D): void {
    for (let index = 0; index < COLORS.length; index++) {
      const color = COLORS[index]!;
      const x = (index % COLUMNS) * CELL;
      const y = PRESET_Y + Math.floor(index / COLUMNS) * CELL;
      this.swatch(ctx, x, y, color, color === this.brush.color, this.isHot('cell', index));
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(159, 227, 255, 0.9)';
    ctx.font = '500 21px system-ui, sans-serif';
    ctx.fillText('Eigene Farben', 14, SWATCH_Y - HEAD_H / 2);

    for (let index = 0; index < MAX_SWATCHES; index++) {
      const color = this.brush.swatches[index];
      const x = index * CELL;
      if (color === undefined) this.emptySwatch(ctx, x, SWATCH_Y, this.isHot('swatch', index));
      else
        this.swatch(
          ctx,
          x,
          SWATCH_Y,
          color,
          color === this.brush.color,
          this.isHot('swatch', index),
        );
    }

    const channels = channelsOf(this.brush.color);
    for (const [index, channel] of CHANNELS.entries()) {
      this.slider(
        ctx,
        SLIDER_Y + index * SLIDER_H,
        `${CHANNEL_LABELS[channel]} ${channels[channel]}`,
        channels[channel] / 255,
        this.isHot('slider', index),
        CHANNEL_TINTS[index]!,
      );
    }

    // Die gemischte Farbe und die beiden Knöpfe daneben.
    const pad = 12;
    ctx.beginPath();
    ctx.roundRect(pad, MIX_Y + pad, MIX_H - pad * 2, MIX_H - pad * 2, 14);
    ctx.fillStyle = hex(this.brush.color);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();

    const saved = this.brush.swatches.includes(this.brush.color);
    this.button(
      ctx,
      MIX_H,
      CANVAS_W * 0.72 - MIX_H,
      saved ? 'Gespeichert' : 'Speichern',
      this.isHot('save', 0),
      saved ? 'rgba(94,224,160,0.35)' : 'rgba(94,224,160,0.18)',
    );
    this.button(
      ctx,
      CANVAS_W * 0.72,
      CANVAS_W - CANVAS_W * 0.72,
      'Weg',
      this.isHot('drop', 0),
      'rgba(255,110,163,0.16)',
    );
  }

  private drawBrush(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const [index, kind] of BRUSH_KINDS.entries()) {
      const y = TAB_H + index * KIND_H;
      const chosen = kind === this.brush.kind;
      const hot = this.isHot('brush', index);

      ctx.beginPath();
      ctx.roundRect(10, y + 5, CANVAS_W - 20, KIND_H - 10, 12);
      ctx.fillStyle = chosen ? 'rgba(94, 224, 160, 0.18)' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      if (chosen || hot) {
        ctx.lineWidth = chosen ? 5 : 3;
        ctx.strokeStyle = chosen ? '#5ee0a0' : 'rgba(255,255,255,0.55)';
        ctx.stroke();
      }

      // Ein Probestrich in genau dieser Art: was man wählt, sieht man vorher.
      this.sample(ctx, 24, y + KIND_H / 2, 90, kind);

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 27px system-ui, sans-serif';
      ctx.fillText(BRUSH_KIND_LABELS[kind], 130, y + KIND_H / 2 - 11);
      ctx.fillStyle = 'rgba(159, 227, 255, 0.9)';
      ctx.font = '500 21px system-ui, sans-serif';
      ctx.fillText(BRUSH_KIND_SUBS[kind], 130, y + KIND_H / 2 + 15);
    }

    this.slider(
      ctx,
      WIDTH_Y,
      `Breite ${widthLabel(this.brush.width)}`,
      widthFraction(this.brush.width),
      this.isHot('slider', WIDTH_SLIDER),
      '#9fe3ff',
    );

    // Und darunter der Strich, wie er wirklich wird — in Farbe, Breite und Art.
    ctx.beginPath();
    ctx.roundRect(10, SAMPLE_Y + 6, CANVAS_W - 20, SAMPLE_H - 12, 12);
    ctx.fillStyle = 'rgba(244, 239, 227, 0.92)';
    ctx.fill();
    this.sample(ctx, 30, SAMPLE_Y + SAMPLE_H / 2, CANVAS_W - 60, this.brush.kind);
  }

  private drawMaterials(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let index = 0; index < MATERIALS.length; index++) {
      const material = MATERIALS[index]!;
      const y = TAB_H + index * ROW_H;
      const chosen = material.id === this.material.id;
      const hot = this.isHot('material', index);

      ctx.beginPath();
      ctx.roundRect(10, y + 4, CANVAS_W - 20, ROW_H - 8, 12);
      ctx.fillStyle = chosen ? 'rgba(94, 224, 160, 0.18)' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      if (chosen || hot) {
        ctx.lineWidth = chosen ? 5 : 3;
        ctx.strokeStyle = chosen ? '#5ee0a0' : 'rgba(255,255,255,0.55)';
        ctx.stroke();
      }

      // Eine kleine Probe: hell und matt, dunkel und glänzend, durchscheinend.
      const sample = 30;
      ctx.globalAlpha = material.opacity;
      ctx.beginPath();
      ctx.roundRect(24, y + (ROW_H - sample) / 2, sample, sample, 8);
      ctx.fillStyle = shade(this.brush.color, material);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 27px system-ui, sans-serif';
      ctx.fillText(material.label, 72, y + ROW_H / 2 - 9);
      ctx.fillStyle = 'rgba(159, 227, 255, 0.9)';
      ctx.font = '500 21px system-ui, sans-serif';
      ctx.fillText(material.sub, 72, y + ROW_H / 2 + 15);
    }
  }

  private isHot(kind: SlotKind, index: number): boolean {
    return this.hovered?.kind === kind && this.hovered.index === index;
  }

  /** Ein Farbfeld im Gitter. */
  private swatch(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: number,
    chosen: boolean,
    hot: boolean,
  ): void {
    const pad = 8;
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 14);
    ctx.fillStyle = hex(color);
    ctx.fill();
    if (!chosen && !hot) return;
    ctx.lineWidth = chosen ? 8 : 5;
    ctx.strokeStyle = chosen ? '#ffffff' : 'rgba(255,255,255,0.6)';
    ctx.stroke();
  }

  /** Ein freier Platz in der eigenen Reihe: gestrichelt, mit einem **+**. */
  private emptySwatch(ctx: CanvasRenderingContext2D, x: number, y: number, hot: boolean): void {
    const pad = 8;
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 14);
    ctx.lineWidth = hot ? 4 : 2;
    ctx.strokeStyle = hot ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)';
    ctx.stroke();
    ctx.restore();

    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    const arm = 12;
    ctx.beginPath();
    ctx.moveTo(cx - arm, cy);
    ctx.lineTo(cx + arm, cy);
    ctx.moveTo(cx, cy - arm);
    ctx.lineTo(cx, cy + arm);
    ctx.lineWidth = 4;
    ctx.strokeStyle = hot ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.stroke();
  }

  /** Ein Regler: Schiene, gefüllter Teil, Knopf und die Beschriftung darüber. */
  private slider(
    ctx: CanvasRenderingContext2D,
    y: number,
    label: string,
    fraction: number,
    hot: boolean,
    tint: string,
  ): void {
    const left = SLIDER_PAD;
    const right = CANVAS_W - SLIDER_PAD;
    const span = right - left;
    const middle = y + SLIDER_H * 0.66;
    const at = left + span * Math.min(1, Math.max(0, fraction));

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hot ? '#ffffff' : 'rgba(255,255,255,0.75)';
    ctx.font = '600 21px system-ui, sans-serif';
    ctx.fillText(label, left, y + SLIDER_H * 0.26);

    ctx.beginPath();
    ctx.roundRect(left, middle - 7, span, 14, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(left, middle - 7, Math.max(14, at - left), 14, 7);
    ctx.fillStyle = tint;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(at, middle, hot ? 15 : 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  private button(
    ctx: CanvasRenderingContext2D,
    x: number,
    width: number,
    label: string,
    hot: boolean,
    fill: string,
  ): void {
    ctx.beginPath();
    ctx.roundRect(x + 8, MIX_Y + 12, width - 16, MIX_H - 24, 14);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = hot ? 4 : 2;
    ctx.strokeStyle = hot ? '#ffffff' : 'rgba(255,255,255,0.35)';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 24px system-ui, sans-serif';
    ctx.fillText(label, x + width / 2, MIX_Y + MIX_H / 2);
    ctx.textAlign = 'left';
  }

  /**
   * Ein Probestrich auf der Palette — dieselbe Form und dieselbe Deckung, die
   * die Leinwand später zieht (`brushSettings.ts`).
   */
  private sample(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    length: number,
    kind: (typeof BRUSH_KINDS)[number],
  ): void {
    const width = Math.min(34, Math.max(3, this.brush.width * 0.7));
    ctx.save();
    ctx.globalAlpha = alphaOf(kind);
    ctx.fillStyle = hex(this.brush.color);
    ctx.strokeStyle = hex(this.brush.color);
    const stamp = stampOf(kind);
    if (stamp === 'round') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y);
      ctx.lineWidth = width;
      ctx.lineCap = kind === 'marker' ? 'square' : 'round';
      ctx.stroke();
    } else if (stamp === 'chisel') {
      ctx.fillRect(x, y - (width * CHISEL_RATIO) / 2, length, width * CHISEL_RATIO);
    } else {
      const dots = Math.round(length * 1.6);
      for (let index = 0; index < dots; index++) {
        const away = (Math.random() - 0.5) * width;
        ctx.beginPath();
        ctx.arc(x + Math.random() * length, y + away, Math.max(1, width / 12), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/** Der Farbton, in dem der Regler seines Kanals gefüllt ist. */
const CHANNEL_TINTS = ['#ff5a4d', '#5ee0a0', '#4aa8ff'] as const;

/** Wo entlang eines Reglers dieser Bildpunkt liegt, von 0 bis 1. */
function sliderFraction(x: number): number {
  const span = CANVAS_W - SLIDER_PAD * 2;
  return Math.min(1, Math.max(0, (x - SLIDER_PAD) / span));
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Die Farbe, wie dieses Material sie aussehen lässt — nur als Vorschau. */
function shade(color: number, material: SurfaceMaterial): string {
  const tint = new THREE.Color(color);
  if (material.metalness > 0.5) tint.multiplyScalar(0.7);
  if (material.glow > 0.5) tint.lerp(new THREE.Color(0xffffff), 0.35);
  return `#${tint.getHexString()}`;
}

/** Ein Feld als Zeichenkette, damit „dasselbe wie eben" vergleichbar ist. */
function keyOf(slot: Slot | null): string {
  return slot ? `${slot.kind}:${slot.index}` : '';
}

function handAnchor(controller: ControllerState): THREE.Object3D | null {
  if (controller.isHand) {
    const wrist = controller.hand.joints['wrist'];
    return wrist && wrist.visible ? wrist : null;
  }
  return controller.grip.visible ? controller.grip : controller.targetRay;
}
