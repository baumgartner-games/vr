import * as THREE from 'three';

/** Procedural portal gun: no assets, reads clearly at arm's length. */
export class PortalGun extends THREE.Group {
  readonly muzzle = new THREE.Object3D();

  private readonly core: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly prongs: Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>> = [];
  private readonly idleColor = new THREE.Color(0x2a3550);
  private flashColor = new THREE.Color(0x2a3550);
  private flash = 0;

  constructor() {
    super();
    this.name = 'portal-gun';

    const shell = new THREE.MeshStandardMaterial({ color: 0xd7dce8, roughness: 0.45, metalness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1d2434, roughness: 0.6, metalness: 0.3 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.085, 0.2), shell);
    body.position.set(0, 0, -0.07);
    this.add(body);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.06), dark);
    back.position.set(0, 0, 0.03);
    this.add(back);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.06), dark);
    handle.position.set(0, -0.075, -0.015);
    handle.rotation.x = -0.22;
    this.add(handle);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.12, 16), shell);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.005, -0.19);
    this.add(barrel);

    for (const side of [-1, 1]) {
      const prong = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.14), dark.clone());
      prong.position.set(side * 0.045, 0.01, -0.21);
      prong.rotation.y = side * -0.16;
      this.add(prong);
      this.prongs.push(prong);
    }

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 16, 12),
      new THREE.MeshBasicMaterial({ color: this.idleColor.clone(), toneMapped: false }),
    );
    this.core.position.set(0, 0.005, -0.16);
    this.add(this.core);

    this.muzzle.position.set(0, 0.005, -0.26);
    this.add(this.muzzle);
  }

  /** Lights up the core in the colour of the portal that was just fired. */
  fire(color: THREE.Color): void {
    this.flashColor.copy(color);
    this.flash = 1;
  }

  update(dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 3.2);
    this.core.material.color.copy(this.idleColor).lerp(this.flashColor, 0.25 + this.flash * 0.75);
    for (const prong of this.prongs) {
      prong.material.emissive.copy(this.flashColor).multiplyScalar(this.flash * 0.8);
    }
  }

  dispose(): void {
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
    });
    this.removeFromParent();
  }
}
