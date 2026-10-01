import * as THREE from 'three';
import { AvatarBody, type AvatarLimb } from '../core/AvatarBody';
import { appearance, appearanceSummary, onAppearanceChange } from '../core/appearance';
import { CHEF_HEIGHT } from '../core/chefFit';
import type { Pointer } from '../core/Pointer';
import { TextPlane } from './TextPlane';

/**
 * **Die Figur neben dem Inventar in der Brille** — das Gegenstück zur
 * Spielerkarte am Schirm (`ui/PlayerCard.ts`).
 *
 * Gewünscht war: „In der Brille könnte man ein Menü öffnen über das
 * Handgelenk. Das Menü kann dann gleich aussehen wie beim PC." Am PC steht
 * rechts neben den Kacheln die Figur mit _Aussehen anpassen_; hier steht sie
 * genauso rechts neben dem Panel (`WristMenuOptions.aside`), nur ohne
 * zweiten Renderer: Sie ist ein **echtes kleines Modell im Raum**, eine
 * Handspanne hoch auf einer dunklen Tafel, und dreht sich langsam. Ein
 * zweites Canvas wäre in der Brille genau der Renderer zu viel
 * (`WardrobeMenu`).
 *
 * Darunter Name und Aussehen und der Knopf, der zum Anpassen führt — in der
 * Brille ist das die Seite _Aussehen_ am Handgelenk (`App.openWardrobe`).
 */
export interface XRPlayerCardOptions {
  /** Wie breit das Panel ist, neben dem die Karte steht — in Metern. */
  panelWidth: number;
  /** Wie hoch es ist. */
  panelHeight: number;
  /** Wie der Spieler heißt. */
  name: () => string;
  /** _Aussehen anpassen_ wurde gedrückt. */
  onCustomize: () => void;
}

/** Breite der Karte in Metern — gut halb so breit wie das Panel. */
const CARD_W = 0.15;
/** Wie hoch die Figur darauf steht. */
const FIGURE_H = 0.17;
/** Luft zwischen Panel und Karte. */
const GAP = 0.012;
/** Wie schnell sich die Figur dreht, in Bogenmaß je Sekunde. */
const SPIN = 0.5;
/** Wo der Kopf der Figur in ihrem eigenen Maß sitzt (wie in der Umkleide). */
const HEAD_Y = 1.62;

export class XRPlayerCard extends THREE.Group {
  private readonly body: AvatarBody;
  private readonly table = new THREE.Group();
  private readonly plate: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly label: TextPlane;
  readonly button: TextPlane;
  private readonly name_: () => string;
  private readonly onCustomize: () => void;
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

    const height = options.panelHeight;
    // Rechts neben dem Panel, oben bündig mit ihm.
    this.position.set(options.panelWidth / 2 + GAP + CARD_W / 2, 0, 0);

    this.plate = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W, height),
      new THREE.MeshBasicMaterial({
        color: 0x090e1a,
        transparent: true,
        opacity: 0.93,
        toneMapped: false,
      }),
    );
    this.plate.renderOrder = 10;
    this.add(this.plate);

    // Die Figur: oben auf der Karte, ein Stück davor, damit sie nicht in der
    // Tafel steckt, wenn sie sich dreht.
    this.body = new AvatarBody({ hands: true });
    const scale = FIGURE_H / CHEF_HEIGHT;
    this.table.scale.setScalar(scale);
    this.table.position.set(0, height / 2 - 0.03 - FIGURE_H, 0.05);
    this.table.add(this.body);
    this.add(this.table);

    this.label = new TextPlane({
      width: CARD_W - 0.01,
      height: 0.05,
      title: '',
      accent: 0x5ee0a0,
      align: 'center',
    });
    this.label.position.set(0, height / 2 - 0.06 - FIGURE_H - 0.03, 0.002);
    this.label.renderOrder = 11;
    this.add(this.label);

    this.button = new TextPlane({
      width: CARD_W - 0.01,
      height: 0.035,
      title: 'Aussehen anpassen',
      accent: 0x5ee0a0,
      background: 'rgba(94, 224, 160, 0.28)',
      align: 'center',
    });
    this.button.position.set(0, this.label.position.y - 0.05, 0.002);
    this.button.renderOrder = 11;
    this.add(this.button);

    // Die Tafel reicht vom oberen Rand des Panels bis unter den Knopf — nicht
    // bis zu seinem unteren: Darunter stünde nichts.
    const bottom = this.button.position.y - 0.035 / 2 - 0.012;
    const top = height / 2;
    this.plate.scale.y = (top - bottom) / height;
    this.plate.position.y = (top + bottom) / 2;

    this.offLook = onAppearanceChange(() => this.refresh());
    this.refresh();
  }

  /** Den Knopf beim Zeiger anmelden — nach jedem `pointer.clear()` neu. */
  attachPointer(pointer: Pointer): void {
    pointer.remove(this.button);
    pointer.add({
      object: this.button,
      pokeable: false,
      onHover: () => this.button.setHighlight(true),
      onBlur: () => this.button.setHighlight(false),
      onSelect: () => this.onCustomize(),
    });
  }

  /** Jedes Bild — nur, solange die Karte zu sehen ist. */
  update(dt: number): void {
    if (!this.visible) return;
    this.table.rotation.y += dt * SPIN;
    this.body.update(dt, this.head, null, null);
    const name = this.name_() || 'Du';
    this.label.setText(name, appearanceSummary(appearance()));
  }

  dispose(): void {
    this.offLook();
    this.body.dispose();
    this.plate.geometry.dispose();
    this.plate.material.dispose();
    this.label.dispose();
    this.button.dispose();
    this.removeFromParent();
  }

  private refresh(): void {
    this.body.setLook(appearance());
  }
}
