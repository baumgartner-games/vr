import * as THREE from 'three';
import { AvatarBody, type AvatarLimb } from '../core/AvatarBody';
import { appearanceSummary, onAppearanceChange, type Appearance } from '../core/appearance';
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
 *
 * **Und unter _Aussehen_ bleibt sie stehen**, wie am Schirm — gewünscht:
 * _„Bei dem menü bei aussehen anpassen, soll wie im web auch der charakter
 * rechts weiterhin angezeigt werden"_. Dort trägt sie den Entwurf (`look`),
 * und statt _Aussehen anpassen_ stehen _Aussehen speichern_ und _Aussehen
 * zurücksetzen_ darunter; wer die Seiten verlässt, ohne zu speichern,
 * verwirft ihn (`onLeave`) — dieselben Regeln wie `ui/PlayerCard.ts`.
 */
export interface XRPlayerCardOptions {
  /** Wie der Spieler heißt. */
  name: () => string;
  /** Was die Figur trägt — der Entwurf, solange es einen gibt. */
  look: () => Appearance;
  /** Seiten, auf denen die Karte zum Bearbeiten dasteht (Speichern, Zurücksetzen). */
  edits: (page: string) => boolean;
  /** Ob es etwas zu speichern gibt. */
  dirty: () => boolean;
  /** _Aussehen anpassen_ wurde gedrückt. */
  onCustomize: () => void;
  /** _Aussehen speichern_. */
  onSave: () => void;
  /** _Aussehen zurücksetzen_. */
  onReset: () => void;
  /** Die Seiten zum Bearbeiten sind verlassen — oder das Menü ist zu. */
  onLeave: () => void;
}

/** Wie schnell sich die Figur dreht, in Bogenmaß je Sekunde. */
const SPIN = 0.5;
/** Wo der Kopf der Figur in ihrem eigenen Maß sitzt (wie in der Umkleide). */
const HEAD_Y = 1.62;

export class XRPlayerCard extends THREE.Group {
  private readonly body: AvatarBody;
  private readonly table = new THREE.Group();
  private readonly options: XRPlayerCardOptions;
  /** Ob die Karte gerade unter _Aussehen_ steht. */
  private editing = false;
  private readonly offLook: () => void;
  private readonly head: AvatarLimb = {
    position: new THREE.Vector3(0, HEAD_Y, 0),
    quaternion: new THREE.Quaternion(),
  };

  constructor(options: XRPlayerCardOptions) {
    super();
    this.name = 'xr-player-card';
    this.options = options;
    this.visible = false;
    this.body = new AvatarBody({ hands: true });
    this.table.add(this.body);
    this.add(this.table);
    this.offLook = onAppearanceChange(() => this.refresh());
    this.refresh();
  }

  /** Was in der Spalte steht: Name, Aussehen, Knöpfe. */
  info(): PanelAside {
    return {
      title: this.options.name() || 'Du',
      sub: appearanceSummary(this.options.look()),
      buttons: this.editing
        ? [
            { label: 'Aussehen speichern', disabled: !this.options.dirty() },
            { label: 'Aussehen zurücksetzen' },
          ]
        : [{ label: 'Aussehen anpassen' }],
    };
  }

  /** Ein Knopf in der Spalte (`XRMenu`, `UIPanel.onAside`), gezählt von oben. */
  press(index: number): void {
    if (!this.editing) {
      if (index === 0) this.options.onCustomize();
      return;
    }
    if (index === 0) this.options.onSave();
    else if (index === 1) this.options.onReset();
  }

  /**
   * Welche Seite offen ist — `null`, wenn das Menü zu ist. Wer _Aussehen_
   * verlässt, verwirft den Entwurf.
   */
  onPage(page: string | null): void {
    const editing = page !== null && this.options.edits(page);
    if (editing === this.editing) return;
    this.editing = editing;
    if (!editing) this.options.onLeave();
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

  /** Neu anziehen — nach jeder Wahl im Entwurf und nach jedem Speichern. */
  refresh(): void {
    this.body.setLook(this.options.look());
  }
}
