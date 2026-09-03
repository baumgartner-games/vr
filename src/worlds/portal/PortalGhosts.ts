import * as THREE from 'three';
import type { Portal } from './Portal';

const _center = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _point = new THREE.Vector3();
const _traversal = new THREE.Matrix4();

/**
 * How far past the portal plane the two halves overlap, so no seam shows up
 * between the part that stayed behind and the part that came out the other end.
 */
const SEAM = 0.006;

interface Ghost {
  root: THREE.Object3D;
  /** Same order on both sides, so poses can be copied node by node. */
  sourceNodes: THREE.Object3D[];
  ghostNodes: THREE.Object3D[];
}

interface Tracked {
  object: THREE.Object3D;
  /**
   * Point the straddle test uses. Usually the object itself, but a tracked
   * hand is a flat group of joint spaces whose own origin sits at the player's
   * feet — there the wrist joint has to stand in for it.
   */
  anchor: THREE.Object3D;
  /** How far the object reaches from its anchor. */
  radius: number;
  /** How far past the opening the object may go before it counts as gone. */
  depth: number;
  /** Cut applied to the object itself: everything behind the portal goes. */
  nearPlane: THREE.Plane;
  /** Cut applied to the copy: everything behind the exit portal goes. */
  farPlane: THREE.Plane;
  /** Clipped stand-ins for the original materials, made on first use. */
  clipped: Map<THREE.Material, THREE.Material>;
  /** Materials of the copy, keyed by the original. */
  ghostMaterials: Map<THREE.Material, THREE.Material>;
  ghost: Ghost | null;
  /** Portal the object currently sticks through, if any. */
  portal: Portal | null;
  /** World pose of the part that came out the other side. */
  readonly exit: THREE.Matrix4;
  cut: boolean;
}

/**
 * Makes objects reach *through* a portal instead of popping to the other side.
 *
 * Everything behind the portal plane is clipped away from the original, and a
 * copy of the object is drawn in front of the linked portal with the opposite
 * cut — so half your hand stays here and the other half comes out over there.
 */
export class PortalGhosts {
  private readonly tracked = new Map<string, Tracked>();

  constructor(private readonly parent: THREE.Object3D) {}

  /**
   * Registers (or replaces) an object that may stick through a portal. Passing
   * `null` drops it again — handy for hands that come and go.
   */
  track(
    key: string,
    object: THREE.Object3D | null,
    radius: number,
    depth = radius,
    anchor: THREE.Object3D | null = null,
  ): void {
    const existing = this.tracked.get(key);
    if (!object) {
      if (existing) this.drop(key, existing);
      return;
    }
    if (existing) {
      if (existing.object === object) {
        existing.anchor = anchor ?? object;
        existing.radius = radius;
        existing.depth = depth;
        return;
      }
      this.drop(key, existing);
    }
    this.tracked.set(key, {
      object,
      anchor: anchor ?? object,
      radius,
      depth,
      nearPlane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      farPlane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      clipped: new Map(),
      ghostMaterials: new Map(),
      ghost: null,
      portal: null,
      exit: new THREE.Matrix4(),
      cut: false,
    });
  }

  /** Forgets an object again — the props from the magic bag do not stay. */
  untrack(key: string): void {
    const entry = this.tracked.get(key);
    if (entry) this.drop(key, entry);
  }

  /**
   * Transform from this side of the portal to the other, for an object that is
   * currently sticking through one. Null when it is not.
   */
  traversal(key: string, target: THREE.Matrix4): THREE.Matrix4 | null {
    const entry = this.tracked.get(key);
    if (!entry?.portal) return null;
    return entry.portal.getTraversalMatrix(target);
  }

  update(portals: Portal[]): void {
    const open = portals.filter((portal) => portal.placed && portal.link?.placed);

    for (const entry of this.tracked.values()) {
      entry.object.updateWorldMatrix(true, true);
      entry.anchor.updateWorldMatrix(true, false);
      _center.setFromMatrixPosition(entry.anchor.matrixWorld);

      const portal =
        open.find((candidate) => candidate.straddles(_center, entry.radius, entry.depth)) ?? null;
      entry.portal = portal;

      if (!portal) {
        this.restore(entry);
        if (entry.ghost) entry.ghost.root.visible = false;
        continue;
      }

      // Keep this side, drop everything past the opening.
      setPlane(entry.nearPlane, portal, SEAM);
      setPlane(entry.farPlane, portal.link!, SEAM);
      this.cut(entry);

      portal.getTraversalMatrix(_traversal);
      entry.exit.multiplyMatrices(_traversal, entry.object.matrixWorld);

      const ghost = this.ghost(entry);
      ghost.root.visible = true;
      syncPoses(entry, ghost);
    }
  }

  dispose(): void {
    for (const [key, entry] of [...this.tracked]) this.drop(key, entry);
    this.tracked.clear();
  }

  // --- internals ----------------------------------------------------------

  private drop(key: string, entry: Tracked): void {
    this.restore(entry);
    if (entry.ghost) {
      entry.ghost.root.removeFromParent();
      for (const material of entry.ghostMaterials.values()) material.dispose();
    }
    for (const material of entry.clipped.values()) material.dispose();
    this.tracked.delete(key);
  }

  /** Swaps in the clipped materials — only the first time, they then stay. */
  private cut(entry: Tracked): void {
    if (entry.cut) return;
    entry.cut = true;
    entry.object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const store = mesh.userData as { portalMaterial?: THREE.Material | THREE.Material[] };
      store.portalMaterial ??= mesh.material;
      mesh.material = mapMaterial(mesh.material, (material) =>
        variant(entry.clipped, material, entry.nearPlane),
      );
    });
  }

  private restore(entry: Tracked): void {
    if (!entry.cut) return;
    entry.cut = false;
    entry.object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const store = mesh.userData as { portalMaterial?: THREE.Material | THREE.Material[] };
      if (store.portalMaterial) mesh.material = store.portalMaterial;
    });
  }

  private ghost(entry: Tracked): Ghost {
    // Hand joints appear one by one while the runtime warms up, so the copy is
    // thrown away and rebuilt whenever the original grew a new part.
    if (entry.ghost && entry.ghost.sourceNodes.length === countNodes(entry.object)) {
      return entry.ghost;
    }
    if (entry.ghost) entry.ghost.root.removeFromParent();

    const sourceNodes: THREE.Object3D[] = [];
    const ghostNodes: THREE.Object3D[] = [];
    const root = copyNode(entry, entry.object, sourceNodes, ghostNodes);
    // The copy is placed by hand, in world space.
    root.matrixAutoUpdate = false;
    root.matrixWorldAutoUpdate = false;
    root.name = `${entry.object.name || 'object'}-portal-ghost`;
    this.parent.add(root);

    entry.ghost = { root, sourceNodes, ghostNodes };
    return entry.ghost;
  }
}

/**
 * Rebuilds the object as plain meshes. Cloning the real thing is not an option:
 * hand joints are XR spaces that the runtime drives, not ordinary groups.
 */
function copyNode(
  entry: Tracked,
  node: THREE.Object3D,
  sourceNodes: THREE.Object3D[],
  ghostNodes: THREE.Object3D[],
): THREE.Object3D {
  const mesh = node as THREE.Mesh;
  let copy: THREE.Object3D;
  if (mesh.isMesh) {
    const clone = new THREE.Mesh(
      mesh.geometry,
      mapMaterial(originalMaterial(mesh), (material) =>
        variant(entry.ghostMaterials, material, entry.farPlane),
      ),
    );
    clone.renderOrder = mesh.renderOrder;
    copy = clone;
  } else {
    copy = new THREE.Object3D();
  }
  copy.frustumCulled = false;
  sourceNodes.push(node);
  ghostNodes.push(copy);

  for (const child of node.children) {
    // Lines and sprites (pointer ray, cursor) have no business coming out of a
    // portal, and neither do the portal surfaces themselves.
    if (!(child as THREE.Mesh).isMesh && child.children.length === 0) continue;
    copy.add(copyNode(entry, child, sourceNodes, ghostNodes));
  }
  return copy;
}

/** Whatever the mesh was made with, even while the clipped stand-in is active. */
function originalMaterial(mesh: THREE.Mesh): THREE.Material | THREE.Material[] {
  const store = mesh.userData as { portalMaterial?: THREE.Material | THREE.Material[] };
  return store.portalMaterial ?? mesh.material;
}

function mapMaterial(
  material: THREE.Material | THREE.Material[],
  map: (material: THREE.Material) => THREE.Material,
): THREE.Material | THREE.Material[] {
  return Array.isArray(material) ? material.map(map) : map(material);
}

/** A copy of the material that is cut by one plane. Made once, then reused. */
function variant(
  cache: Map<THREE.Material, THREE.Material>,
  material: THREE.Material,
  plane: THREE.Plane,
): THREE.Material {
  let clipped = cache.get(material);
  if (!clipped) {
    clipped = material.clone();
    // The cut opens the object up, so the inside has to be drawn as well.
    clipped.side = THREE.DoubleSide;
    clipped.clippingPlanes = [plane];
    cache.set(material, clipped);
  }
  return clipped;
}

/** Keeps the plane's front side, `bias` metres past the portal surface. */
function setPlane(plane: THREE.Plane, portal: Portal, bias: number): void {
  portal.getWorldNormal(_normal);
  portal.getWorldPosition(_point).addScaledVector(_normal, -bias);
  plane.setFromNormalAndCoplanarPoint(_normal, _point);
}

/** Mirrors the source hierarchy onto the copy, transformed through the portal. */
function syncPoses(entry: Tracked, ghost: Ghost): void {
  ghost.root.matrixWorld.copy(entry.exit);

  for (let i = 1; i < ghost.sourceNodes.length; i++) {
    const source = ghost.sourceNodes[i]!;
    const copy = ghost.ghostNodes[i]!;
    copy.position.copy(source.position);
    copy.quaternion.copy(source.quaternion);
    copy.scale.copy(source.scale);
    copy.visible = source.visible;
  }
}

/** Nodes the copy would have — meshes plus everything that carries one. */
function countNodes(node: THREE.Object3D): number {
  let count = 1;
  for (const child of node.children) {
    if (!(child as THREE.Mesh).isMesh && child.children.length === 0) continue;
    count += countNodes(child);
  }
  return count;
}
