import * as THREE from 'three';

const ROT_180 = new THREE.Matrix4().makeRotationY(Math.PI);
const _inverse = new THREE.Matrix4();
const _local = new THREE.Vector3();

export const PORTAL_HALF_WIDTH = 0.5;
export const PORTAL_HALF_HEIGHT = 0.85;
/** The portal plane floats a little in front of its wall. */
export const PORTAL_OFFSET = 0.02;

/**
 * One portal: an elliptical hole that shows the view of its linked partner.
 * The surface samples a render target in screen space, so the image lines up
 * pixel-perfect with the surrounding scene — per eye included.
 */
export class Portal extends THREE.Object3D {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  readonly rim: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;

  link: Portal | null = null;
  placed = false;
  /** Collision bit of the surface this portal sits on (0 while unplaced). */
  surfaceGroup = 0;

  constructor(
    readonly key: 'a' | 'b',
    colorHex: number,
  ) {
    super();
    this.name = `portal-${key}`;
    this.visible = false;

    const color = new THREE.Color(colorHex);

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(PORTAL_HALF_WIDTH * 2, PORTAL_HALF_HEIGHT * 2),
      new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: null },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uColor: { value: color },
          uActive: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uTexture;
          uniform vec2 uResolution;
          uniform vec3 uColor;
          uniform float uActive;
          uniform float uTime;
          varying vec2 vUv;

          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            float r = length(p);
            if (r > 1.0) discard;

            vec3 color;
            if (uActive > 0.5) {
              color = texture2D(uTexture, gl_FragCoord.xy / uResolution).rgb;
            } else {
              float swirl = sin(atan(p.y, p.x) * 4.0 + uTime * 2.0 - r * 7.0) * 0.5 + 0.5;
              color = uColor * (0.08 + swirl * 0.25);
            }

            float edge = smoothstep(0.78, 1.0, r);
            color = mix(color, uColor * 2.4, edge);

            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    );
    this.mesh.frustumCulled = false;
    this.add(this.mesh);

    this.rim = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.09, 64),
      new THREE.MeshBasicMaterial({ color, toneMapped: false, side: THREE.DoubleSide }),
    );
    this.rim.scale.set(PORTAL_HALF_WIDTH, PORTAL_HALF_HEIGHT, 1);
    this.rim.position.z = 0.001;
    this.add(this.rim);
  }

  /** Puts the portal onto a surface. `normal` points away from the wall. */
  place(point: THREE.Vector3, normal: THREE.Vector3, up: THREE.Vector3, surfaceGroup = 0): void {
    const right = new THREE.Vector3().crossVectors(up, normal).normalize();
    const trueUp = new THREE.Vector3().crossVectors(normal, right).normalize();
    const basis = new THREE.Matrix4().makeBasis(right, trueUp, normal);

    this.quaternion.setFromRotationMatrix(basis);
    this.position.copy(point).addScaledVector(normal, PORTAL_OFFSET);
    this.surfaceGroup = surfaceGroup;
    this.placed = true;
    this.visible = true;
    this.updateMatrixWorld(true);
  }

  /**
   * Places the portal at a pose that was worked out somewhere else — another
   * player shot it, and their result is the one everybody has to see.
   */
  setPose(position: THREE.Vector3, quaternion: THREE.Quaternion, surfaceGroup = 0): void {
    this.position.copy(position);
    this.quaternion.copy(quaternion);
    this.surfaceGroup = surfaceGroup;
    this.placed = true;
    this.visible = true;
    this.updateMatrixWorld(true);
  }

  /** Removes the portal from the wall (keeps it in the scene, just hidden). */
  reset(): void {
    this.placed = false;
    this.surfaceGroup = 0;
    this.visible = false;
  }

  /**
   * The picture the surface shows, or `null` for the idle swirl — which is
   * what the innermost level of a nested view gets, since there is no image
   * behind it any more.
   */
  setView(texture: THREE.Texture | null): void {
    this.mesh.material.uniforms.uTexture.value = texture;
    this.mesh.material.uniforms.uActive.value = texture ? 1 : 0;
  }

  setResolution(size: THREE.Vector2): void {
    (this.mesh.material.uniforms.uResolution.value as THREE.Vector2).copy(size);
  }

  setTime(time: number): void {
    this.mesh.material.uniforms.uTime.value = time;
  }

  /**
   * Slides the surface towards the viewer. Right before stepping through, the
   * camera's near plane would cut the quad away and the wall behind it would
   * flash into view — this keeps the hole closed all the way through. The
   * shader samples in screen space, so the image itself does not shift.
   */
  setNearPad(pad: number): void {
    this.mesh.position.z = pad;
  }

  /** World-space normal (the +Z axis of the portal). */
  getWorldNormal(target: THREE.Vector3): THREE.Vector3 {
    this.updateMatrixWorld();
    return target
      .set(
        this.matrixWorld.elements[8]!,
        this.matrixWorld.elements[9]!,
        this.matrixWorld.elements[10]!,
      )
      .normalize();
  }

  /** Signed distance of a world point to the portal plane (positive = front). */
  signedDistance(point: THREE.Vector3): number {
    this.updateMatrixWorld();
    _local.copy(point).applyMatrix4(_inverse.copy(this.matrixWorld).invert());
    return _local.z;
  }

  /**
   * Is a world point inside the elliptical opening?
   * @param margin scales the ellipse (1 = exact opening)
   */
  isInOpening(point: THREE.Vector3, margin = 1): boolean {
    this.updateMatrixWorld();
    _local.copy(point).applyMatrix4(_inverse.copy(this.matrixWorld).invert());
    const x = _local.x / (PORTAL_HALF_WIDTH * margin);
    const y = _local.y / (PORTAL_HALF_HEIGHT * margin);
    return x * x + y * y <= 1;
  }

  /**
   * Is this point close enough to the opening to be sticking through it?
   * `radius` is how far the object reaches towards the portal, `depth` how far
   * it may already have gone past it.
   */
  straddles(point: THREE.Vector3, radius: number, depth = radius): boolean {
    this.toLocal(point, _local);
    if (_local.z > radius || _local.z < -depth) return false;
    const x = _local.x / (PORTAL_HALF_WIDTH + radius);
    const y = _local.y / (PORTAL_HALF_HEIGHT + radius);
    return x * x + y * y <= 1;
  }

  /** Local coordinates of a world point (x/y in the portal plane, z = depth). */
  toLocal(point: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 {
    this.updateMatrixWorld();
    return target.copy(point).applyMatrix4(_inverse.copy(this.matrixWorld).invert());
  }

  /**
   * Transform that maps anything in front of this portal to the corresponding
   * place in front of the linked portal (rotated by 180°, as in the original).
   */
  getTraversalMatrix(target: THREE.Matrix4): THREE.Matrix4 | null {
    const link = this.link;
    if (!link || !link.placed || !this.placed) return null;
    this.updateMatrixWorld();
    link.updateMatrixWorld();
    return target
      .copy(link.matrixWorld)
      .multiply(ROT_180)
      .multiply(_inverse.copy(this.matrixWorld).invert());
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.rim.geometry.dispose();
    this.rim.material.dispose();
    this.removeFromParent();
  }
}
