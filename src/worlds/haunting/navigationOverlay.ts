import * as THREE from 'three';
import { TILE } from '../nav/navTile';
import type { HouseSpec } from './house';
import { label } from './shipArt';

interface Point {
  x: number;
  z: number;
}
export interface NavigationTrace {
  at: Point;
  points: readonly Point[];
  goal: Point | null;
}

/** Observes the routes the actors actually consume; never runs a second search. */
export class NavigationOverlay {
  readonly root = new THREE.Group();
  private readonly labels: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly actors = [0x42e8ff, 0xff5064, 0xffd95a].map((color) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8192 * 3), 3));
    const material = new THREE.LineBasicMaterial({ color, depthTest: false, depthWrite: false });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = 100;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.7, 24),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 101;
    this.root.add(line, ring);
    return { line, ring };
  });

  constructor() {
    this.root.name = 'ai-navigation-goals';
    this.root.visible = false;
    this.root.add(new THREE.HemisphereLight(0xffffff, 0x8198af, 2.5));
  }

  setRooms(spec: HouseSpec): void {
    for (const room of spec.rooms) {
      const sign = label(room.name.toUpperCase(), Math.min(9, room.rect.w * TILE - 1), 1.4);
      sign.rotation.x = -Math.PI / 2;
      sign.position.set((room.rect.x + room.rect.w / 2) * TILE, 0.4, room.rect.z * TILE + 1.1);
      sign.material.depthTest = false;
      sign.material.depthWrite = false;
      sign.renderOrder = 102;
      this.labels.push(sign);
      this.root.add(sign);
    }
  }

  update(active: boolean, traces: Array<NavigationTrace | null>): void {
    this.root.visible = active;
    if (!active) return;
    this.actors.forEach(({ line, ring }, i) => {
      const trace = traces[i];
      const valid = !!trace && Number.isFinite(trace.at.x) && Number.isFinite(trace.at.z);
      line.visible = valid;
      ring.visible = valid && !!trace.goal;
      if (!valid || !trace) return;
      const position = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      position.setXYZ(0, trace.at.x, 0.25, trace.at.z);
      const count = Math.min(trace.points.length, position.count - 1);
      for (let j = 0; j < count; j++)
        position.setXYZ(j + 1, trace.points[j]!.x, 0.25, trace.points[j]!.z);
      position.needsUpdate = true;
      line.geometry.setDrawRange(0, count + 1);
      if (trace.goal) ring.position.set(trace.goal.x, 0.28, trace.goal.z);
    });
  }

  dispose(): void {
    this.root.removeFromParent();
    for (const sign of this.labels) {
      sign.geometry.dispose();
      sign.material.map?.dispose();
      sign.material.dispose();
    }
    this.labels.length = 0;
    for (const { line, ring } of this.actors) {
      line.geometry.dispose();
      line.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
    }
  }
}
