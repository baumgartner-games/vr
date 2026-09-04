import * as THREE from 'three';

/**
 * Wie weit der Boden reicht — und damit, wie weit man laufen kann.
 *
 * Jede Welt stand vorher auf ihrer eigenen kleinen Platte, und an deren Rand
 * war die Welt zu Ende: ein Schritt zu weit und man fiel ins Nichts. Eine
 * Sandkiste, die man nicht verlassen kann, ist aber genau das Gegenteil von
 * einer Sandkiste. Also liegt unter *jeder* Welt eine Fläche, die bis an den
 * Horizont geht — man kann jederzeit rausgehen, sich die Welt von außen
 * ansehen und wieder zurückkommen.
 *
 * Die Zahl ist die halbe Kantenlänge in Metern und hängt an der Sichtweite der
 * Kamera: weiter zu bauen als man sieht, kostet nur Dreiecke.
 */
export const WORLD_RADIUS = 500;

/** Der Himmel steht außen herum — und damit immer hinter dem Boden. */
export const SKY_RADIUS = 560;

/** Cheap gradient sky as an inverted sphere — no HDRI download needed. */
export function createSky(top: number, bottom: number, radius = SKY_RADIUS): THREE.Mesh {
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

/**
 * Der Boden unter allem: eine Fläche bis zum Horizont, mit einem Raster, an
 * dem man sieht, dass man sich bewegt.
 *
 * Ohne Struktur ist eine große einfarbige Ebene in der Brille nicht von Nebel
 * zu unterscheiden — man läuft und nichts passiert. Das Raster ist deshalb
 * kein Zierrat, sondern das, was aus der Fläche einen Ort macht. Es wird als
 * Textur gekachelt statt als Geometrie gezeichnet: ein `GridHelper` über einen
 * Kilometer wären hunderttausend Linien.
 */
export function createGround(
  color: number,
  options: { line?: number; radius?: number; tile?: number } = {},
): THREE.Mesh {
  const radius = options.radius ?? WORLD_RADIUS;
  const tile = options.tile ?? 4;
  const texture = new THREE.CanvasTexture(gridCanvas(color, options.line ?? 0x000000));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set((radius * 2) / tile, (radius * 2) / tile);
  texture.anisotropy = 8;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, metalness: 0.02 }),
  );
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  // Eine Handbreit unter der Null: die gebauten Böden der Welten liegen auf
  // y = 0, und zwei Flächen auf derselben Höhe flimmern gegeneinander.
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  return ground;
}

/** Eine Kachel des Bodenrasters: Fläche plus zwei Linien am Rand. */
function gridCanvas(color: number, line: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = `#${line.toString(16).padStart(6, '0')}`;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 126, 126);
  return canvas;
}
