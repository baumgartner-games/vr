import * as THREE from 'three';

/**
 * One-handed portal gun. Each hand carries its own colour: the left one only
 * places the blue portal, the right one only the red.
 */
export class PortalGun extends THREE.Group {
  readonly muzzle = new THREE.Object3D();
  /** True while the gun sits on the belt instead of in a hand. */
  holstered = true;

  private readonly core: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly emitters: Array<THREE.MeshStandardMaterial> = [];
  private readonly tint: THREE.Color;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private flash = 0;

  constructor(
    readonly key: 'a' | 'b',
    colorHex: number,
  ) {
    super();
    this.name = `portal-gun-${key}`;
    this.tint = new THREE.Color(colorHex);

    const shell = new THREE.MeshStandardMaterial({
      color: 0xd7dce8,
      roughness: 0.4,
      metalness: 0.4,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b2231, roughness: 0.6 });
    this.materials.push(shell, dark);

    const body = this.mesh(new THREE.BoxGeometry(0.06, 0.07, 0.17), shell);
    body.position.set(0, 0.005, -0.06);

    const back = this.mesh(new THREE.BoxGeometry(0.05, 0.06, 0.05), dark);
    back.position.set(0, 0, 0.035);

    const grip = this.mesh(new THREE.BoxGeometry(0.036, 0.095, 0.05), dark);
    grip.position.set(0, -0.07, 0.005);
    grip.rotation.x = -0.2;

    const barrel = this.mesh(new THREE.CylinderGeometry(0.021, 0.026, 0.1, 14), shell);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.16);

    for (const side of [-1, 1]) {
      const material = new THREE.MeshStandardMaterial({
        color: 0x222b3d,
        roughness: 0.5,
        emissive: this.tint.clone().multiplyScalar(0.35),
      });
      this.materials.push(material);
      this.emitters.push(material);
      const prong = this.mesh(new THREE.BoxGeometry(0.015, 0.015, 0.12), material);
      prong.position.set(side * 0.038, 0.012, -0.18);
      prong.rotation.y = side * -0.14;
    }

    const coreGeometry = new THREE.SphereGeometry(0.019, 14, 10);
    this.geometries.push(coreGeometry);
    this.core = new THREE.Mesh(
      coreGeometry,
      new THREE.MeshBasicMaterial({ color: this.tint.clone(), toneMapped: false }),
    );
    this.materials.push(this.core.material);
    this.core.position.set(0, 0.01, -0.13);
    this.add(this.core);

    this.muzzle.position.set(0, 0.01, -0.22);
    this.add(this.muzzle);
  }

  fire(): void {
    this.flash = 1;
  }

  update(dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 3.4);
    const glow = 0.45 + this.flash * 1.6;
    this.core.material.color.copy(this.tint).multiplyScalar(glow);
    for (const material of this.emitters) {
      material.emissive.copy(this.tint).multiplyScalar(0.25 + this.flash * 0.9);
    }
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    this.removeFromParent();
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    this.geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    this.add(mesh);
    return mesh;
  }
}
