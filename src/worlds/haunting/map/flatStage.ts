import * as THREE from 'three';
import { scannerFrame } from '../../portal/tools/scannerModel';

/**
 * **Das Werkzeug in der Hand, als kleines 3D-Bild** — das Einzige, was die
 * 2D-Welt noch mit WebGL zeichnet.
 *
 * Eine eigene Szene mit einem Modell und einem Licht, gezeichnet in das
 * Loch, das `FlatMode.viewport()` beschreibt. Die Stationsszene wird dabei
 * nicht angefasst und nicht gezeichnet: Der 3D-Pfad kostet in der 2D-Welt
 * genau diesen einen Würfel.
 */
export class FlatStage {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1.6, 0.05, 10);
  private readonly models = new Map<string, THREE.Object3D>();
  private shown = '';
  private spin = 0;

  constructor() {
    this.camera.position.set(0, 0.18, 0.75);
    this.camera.lookAt(0, 0, 0);
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(1, 2, 2);
    this.scene.add(key, new THREE.AmbientLight(0x8090b0, 1.2));
  }

  private model(tool: string): THREE.Object3D {
    let model = this.models.get(tool);
    if (model) return model;
    model = buildToolModel(tool);
    this.models.set(tool, model);
    return model;
  }

  /** Ein Bild in den Ausschnitt zeichnen. `rect` in CSS-Punkten, y von oben. */
  render(
    renderer: THREE.WebGLRenderer,
    tool: string,
    rect: { x: number; y: number; w: number; h: number },
    dt: number,
  ): void {
    if (this.shown !== tool) {
      for (const [id, model] of this.models) model.visible = id === tool;
      if (!this.models.has(tool)) this.scene.add(this.model(tool));
      this.model(tool).visible = true;
      this.shown = tool;
    }
    this.spin += dt * 0.8;
    this.model(tool).rotation.y = this.spin;
    const size = new THREE.Vector2();
    renderer.getSize(size);
    const dpr = renderer.getPixelRatio();
    const x = Math.round(rect.x * dpr),
      w = Math.round(rect.w * dpr),
      h = Math.round(rect.h * dpr);
    const y = Math.round(size.y * dpr - (rect.y + rect.h) * dpr);
    this.camera.aspect = rect.w / Math.max(1, rect.h);
    this.camera.updateProjectionMatrix();
    renderer.setScissorTest(true);
    renderer.setScissor(x, y, w, h);
    renderer.setViewport(x, y, w, h);
    renderer.setClearColor(0x0c1220, 1);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.x * dpr, size.y * dpr);
  }

  dispose(): void {
    for (const model of this.models.values()) {
      model.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose?.();
      });
    }
    this.models.clear();
  }
}

/** Grobe, wiedererkennbare Klötze: ein Stab, ein Scanner, ein Koffer. */
export function buildToolModel(tool: string): THREE.Object3D {
  const group = new THREE.Group();
  if (tool === 'flashlight') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.26, 18),
      new THREE.MeshStandardMaterial({ color: 0x2b3242, roughness: 0.45, metalness: 0.55 }),
    );
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.035, 0.07, 18),
      new THREE.MeshStandardMaterial({ color: 0x3a4256, roughness: 0.4, metalness: 0.6 }),
    );
    head.position.y = 0.16;
    const lens = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 18),
      new THREE.MeshBasicMaterial({ color: 0xffe9b0 }),
    );
    lens.position.y = 0.196;
    lens.rotation.x = -Math.PI / 2;
    group.add(body, head, lens);
    group.rotation.z = -0.9;
  } else if (tool === 'radar' || tool === 'xray') {
    group.add(scannerFrame(tool === 'radar' ? 0x7ff0ff : 0xb8a0ff));
    group.rotation.x = -0.4;
  } else if (tool === 'medkit') {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xe6f0e8, roughness: 0.6 }),
    );
    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.03, 0.002),
      new THREE.MeshBasicMaterial({ color: 0xff4d55 }),
    );
    cross.position.z = 0.091;
    const cross2 = cross.clone();
    cross2.rotation.z = Math.PI / 2;
    group.add(box, cross, cross2);
  } else {
    group.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.16, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x8fa0ff }),
      ),
    );
  }
  return group;
}
