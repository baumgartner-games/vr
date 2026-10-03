import * as THREE from 'three';
import { AvatarBody, type AvatarLimb } from '../core/AvatarBody';
import { appearance, appearanceSummary, onAppearanceChange } from '../core/appearance';
import { CHEF_HEIGHT } from '../core/chefFit';
import type { PanelAside } from './UIPanel';

/**
 * **Die Figur im Inventar in der Brille** — das Gegenstück zur Spielerkarte
 * am Schirm (`ui/PlayerCard.ts`).
 *
 * Sie stand bis Oktober 2026 als eigene Tafel neben dem Menü, mit eigenem
 * Knopf: _„scheint die spieler vorschau um das aussehen anzupassen nicht zum
 * gleiche menü zu gehören, das ist doof […] Ich kann in diesem extra menü
 * auch nicht den button ‚aussehen anpassen' drücken."_ Jetzt ist sie eine
 * **Spalte des Bildschirms** (`UIPanel`, `PageOptions.aside`): Name, Aussehen
 * und der Knopf sind dort gezeichnet und werden dort gedrückt; hier bleibt
 * nur die Figur, ein echtes kleines Modell, das vor der Spalte steht und sich
 * langsam dreht (`XRMenu.updateAside`). Ein zweites Canvas wäre in der Brille
 * genau der Renderer zu viel (`ui/previewScene.ts`).
 */
export interface XRPlayerCardOptions {
  /** Wie der Spieler heißt. */
  name: () => string;
  /** _Aussehen anpassen_ wurde gedrückt. */
  onCustomize: () => void;
}

/** Wie schnell sich die Figur dreht, in Bogenmaß je Sekunde. */
const SPIN = 0.5;
/** Wo der Kopf der Figur in ihrem eigenen Maß sitzt (wie in der Umkleide). */
const HEAD_Y = 1.62;

export class XRPlayerCard extends THREE.Group {
  private readonly body: AvatarBody;
  private readonly table = new THREE.Group();
  private readonly name_: () => string;
  /** Der Knopf in der Spalte (`XRMenu`, Knopf `aside`). */
  readonly onCustomize: () => void;
  private readonly offLook: () => void;
  private readonly head: AvatarLimb = {
    position: new THREE.Vector3(0, HEAD_Y, 0),
    quaternion: new THREE.Quaternion(),
  };

  constructor(options: XRPlayerCardOptions) {
    super();
    this.name = 'xr-player-card';
    this.name_ = options.name;
    this.onCustomize = options.onCustomize;
    this.visible = false;
    this.body = new AvatarBody({ hands: true });
    this.table.add(this.body);
    this.add(this.table);
    this.offLook = onAppearanceChange(() => this.refresh());
    this.refresh();
  }

  /** Was in der Spalte steht: Name, Aussehen, Knopf. */
  info(): PanelAside {
    return {
      title: this.name_() || 'Du',
      sub: appearanceSummary(appearance()),
      button: 'Aussehen anpassen',
    };
  }

  /**
   * Hinstellen: Mitte unten an `x`/`y` im Raum des Panels, so hoch wie
   * `height` (etwas weniger, damit der Kopf nicht an den Rand stößt), und
   * eine Spur vor das Panel, damit sie sich frei drehen kann.
   */
  place(x: number, y: number, height: number): void {
    const figure = height * 0.88;
    this.table.scale.setScalar(figure / CHEF_HEIGHT);
    this.position.set(x, y + height * 0.04, figure * 0.3);
  }

  /** Jedes Bild — nur, solange die Figur zu sehen ist. */
  update(dt: number): void {
    if (!this.visible) return;
    this.table.rotation.y += dt * SPIN;
    this.body.update(dt, this.head, null, null);
  }

  dispose(): void {
    this.offLook();
    this.body.dispose();
    this.removeFromParent();
  }

  private refresh(): void {
    this.body.setLook(appearance());
  }
}
