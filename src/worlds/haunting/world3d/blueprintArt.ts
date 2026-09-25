import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { blueprintArea } from './blueprint';

/**
 * **Die Grundriss-Vorlage als Bild auf dem Boden** (`blueprint.ts`).
 *
 * Eine Fläche über der ganzen Station, knapp über den Bodenmarkierungen
 * (`shipArt.floor`, 4 bis 5 cm), ohne Licht und ohne Tiefe zu schreiben: Sie
 * soll zeigen, wo die Zeichnung liegt, und nichts verdecken, was darauf
 * steht. Das Bild wird erst geladen, wenn jemand es einschaltet — und nur, wo
 * es WebGL gibt (`canLoadModels`); die Adresse kommt dynamisch aus
 * `blueprintUrl.ts`, weil dort `import.meta` steht und Jest daran hängen
 * bliebe.
 */
export class BlueprintArt {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private requested = false;

  constructor() {
    const area = blueprintArea();
    const geometry = new THREE.PlaneGeometry(area.w, area.d);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'station-blueprint';
    this.mesh.position.set(area.x + area.w / 2, 0.06, area.z + area.d / 2);
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    // Keine Kollision und kein Zeigerziel: Das Bild ist nur zum Ansehen.
    this.mesh.raycast = () => {};
  }

  /** Ob die Vorlage gerade gewünscht ist — sie erscheint, sobald das Bild da ist. */
  private wanted = false;

  show(on: boolean): void {
    this.wanted = on;
    this.mesh.visible = on && !!this.mesh.material.map;
    if (!on || this.requested || !canLoadModels()) return;
    this.requested = true;
    void import('./blueprintUrl').then(({ blueprintUrl }) => {
      new THREE.TextureLoader().load(blueprintUrl(), (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        this.mesh.material.map = texture;
        this.mesh.material.needsUpdate = true;
        this.mesh.visible = this.wanted;
      });
    });
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.map?.dispose();
    this.mesh.material.dispose();
  }
}
