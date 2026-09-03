import * as THREE from 'three';

/** Cheap gradient sky as an inverted sphere — no HDRI download needed. */
export function createSky(top: number, bottom: number, radius = 120): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(top) },
      bottomColor: { value: new THREE.Color(bottom) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = clamp(normalize(vWorldPosition).y * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.8)), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
  sky.name = 'sky';
  sky.frustumCulled = false;
  return sky;
}

export function createLighting(intensity = 1): THREE.Group {
  const group = new THREE.Group();
  group.name = 'lighting';

  const hemi = new THREE.HemisphereLight(0xbdd7ff, 0x2a3142, 1.5 * intensity);
  group.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.6 * intensity);
  key.position.set(4, 8, 3);
  group.add(key);

  const fill = new THREE.DirectionalLight(0x6a9bff, 0.5 * intensity);
  fill.position.set(-5, 3, -4);
  group.add(fill);

  return group;
}

/** Disposes every geometry/material below `root` and detaches it. */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as Partial<THREE.Mesh> & THREE.Object3D;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
  root.removeFromParent();
}

/** Keeps the player inside an axis-aligned box (head position based). */
export function clampToBox(box: THREE.Box3): (from: THREE.Vector3, to: THREE.Vector3) => THREE.Vector3 {
  return (_from, to) => {
    to.x = THREE.MathUtils.clamp(to.x, box.min.x, box.max.x);
    to.z = THREE.MathUtils.clamp(to.z, box.min.z, box.max.z);
    return to;
  };
}
