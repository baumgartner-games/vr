import * as THREE from 'three';
import type { PointerTarget } from '../core/Pointer';
import { paintClose } from './xrCard';

export interface CloseButtonOptions {
  /** Wie groß das sichtbare ✕ ist, in Metern (Durchmesser der Scheibe). */
  readonly size: number;
  /**
   * **Wie groß die Trefferfläche ist**, in Metern — größer als das Zeichen.
   *
   * Gemeldet war: „Die Texte konnte ich in der Brille nicht gut anfassen." Ein
   * Strahl aus einer zitternden Hand auf drei Meter trifft ein Zeichen von
   * zwanzig Zentimetern nur mit Mühe; die Fläche darum herum fängt ihn auf,
   * ohne dass man sie sieht. Vorgabe: das Doppelte des Zeichens.
   */
  readonly hit?: number;
  /** Farbe des Rings — die Akzentfarbe der Tafel, an der es hängt. */
  readonly accent?: number;
  /** Ohne Tiefenprüfung, wie die Tafel mit `front` (`ui/TextPlane.ts`). */
  readonly front?: boolean;
}

/**
 * **Ein ✕ zum Wegklicken, das man in der Brille auch trifft** — für Tafeln im
 * Raum, die sonst nur von selbst gehen.
 *
 * Das Objekt selbst ist die **unsichtbare Trefferfläche** (ein Quadrat mit
 * `material.visible = false`: gezeichnet wird nichts, getroffen wird trotzdem
 * — `Pointer` fragt nur, ob das Objekt sichtbar ist, und das ist es). Das
 * sichtbare Zeichen hängt als Kind davor, eine runde Scheibe mit ✕, gemalt mit
 * derselben Hand wie die Tafeln der Brille (`xrCard.paintClose`).
 *
 * Bedient wird es über `asPointerTarget`: Trigger oder `A` mit dem Strahl
 * darauf, ein Tippen mit dem Zeigefinger (`pokeable`), am Schirm ein Klick.
 * Liegt ein Strahl darauf, wird das Zeichen größer — in der Brille die einzige
 * Rückmeldung, dass der Druck gleich hier landet.
 */
export class CloseButton extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  private readonly face: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly texture: THREE.CanvasTexture;

  constructor(options: CloseButtonOptions) {
    const hit = options.hit ?? options.size * 2;
    super(
      new THREE.PlaneGeometry(hit, hit),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    this.name = 'close-button';

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) paintClose(ctx, 64, 64, 58, options.accent ?? 0xffffff);
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.face = new THREE.Mesh(
      new THREE.PlaneGeometry(options.size, options.size),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        toneMapped: false,
        ...(options.front ? { depthTest: false, depthWrite: false } : {}),
      }),
    );
    this.face.name = 'close-button-face';
    // Eine Stufe über `TextPlane` mit `front` (7): Das Zeichen liegt auf der
    // Tafel und nicht unter ihr.
    this.face.renderOrder = options.front ? 8 : 0;
    this.face.position.z = 0.005;
    this.add(this.face);
  }

  /** Das Ziel für den Zeiger — `close` wird beim Drücken gerufen. */
  asPointerTarget(close: () => void): PointerTarget {
    return {
      object: this,
      pokeable: true,
      onHover: () => this.face.scale.setScalar(1.18),
      onBlur: () => this.face.scale.setScalar(1),
      onSelect: () => {
        this.face.scale.setScalar(1);
        close();
      },
    };
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.face.geometry.dispose();
    this.face.material.dispose();
    this.texture.dispose();
  }
}
