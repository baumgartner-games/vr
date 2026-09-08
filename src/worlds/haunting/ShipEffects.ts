import * as THREE from 'three';

export type ShipEffectKind = 'sparks' | 'smoke' | 'fire';

const SLOT_COUNT = 3;
const PARTICLES_PER_SLOT = 48;

const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aOpacity;
  uniform float uViewportY;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vColor = aColor;
    vOpacity = aOpacity;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    float diameter = aSize * projectionMatrix[1][1] * uViewportY * 0.5;
    gl_PointSize = clamp(diameter / max(0.1, -view.z), 1.0, 72.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uKind;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vec2 point = gl_PointCoord * 2.0 - 1.0;
    if (uKind < 0.5) point.x *= 2.3;
    float radius = dot(point, point);
    if (radius >= 1.0 || vOpacity < 0.003) discard;
    float soft = 1.0 - smoothstep(0.04, 1.0, radius);
    float core = 1.0 - smoothstep(0.0, 0.2, radius);
    vec3 color = vColor;
    if (uKind < 0.5 || uKind > 1.5) color = mix(color, vec3(1.0, 0.88, 0.48), core * 0.3);
    gl_FragColor = vec4(color, soft * soft * vOpacity);
    #include <colorspace_fragment>
  }
`;

interface Emitter {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly positions: Float32Array;
  readonly velocities: Float32Array;
  readonly colors: Float32Array;
  readonly sizes: Float32Array;
  readonly opacities: Float32Array;
  readonly lifetimes: Float32Array;
  readonly delays: Float32Array;
  readonly phases: Float32Array;
  readonly positionAttribute: THREE.BufferAttribute;
  readonly colorAttribute: THREE.BufferAttribute;
  readonly sizeAttribute: THREE.BufferAttribute;
  readonly opacityAttribute: THREE.BufferAttribute;
  kind: ShipEffectKind;
  count: number;
  elapsed: number;
  duration: number;
  order: number;
}

/**
 * Three bounded emitters, allocated once for the entire station visit. Repeated
 * effects reuse the oldest slot; neither emit nor update allocates GPU resources,
 * arrays, vectors, textures or lights. Coordinates passed to emit are world-space;
 * attach root directly below an untransformed station group.
 */
export class ShipEffects {
  readonly root = new THREE.Group();
  private readonly slots: Emitter[] = [];
  private readonly materials: Record<ShipEffectKind, THREE.ShaderMaterial>;
  private readonly viewport = new THREE.Vector2();
  private order = 0;
  private disposed = false;

  constructor() {
    this.root.name = 'station-effects-pool';
    this.materials = {
      sparks: this.material(0, THREE.AdditiveBlending),
      smoke: this.material(1, THREE.NormalBlending),
      fire: this.material(2, THREE.AdditiveBlending),
    };
    for (let i = 0; i < SLOT_COUNT; i++) {
      const positions = new Float32Array(PARTICLES_PER_SLOT * 3);
      const colors = new Float32Array(PARTICLES_PER_SLOT * 3);
      const sizes = new Float32Array(PARTICLES_PER_SLOT);
      const opacities = new Float32Array(PARTICLES_PER_SLOT);
      const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(
        THREE.DynamicDrawUsage,
      );
      const colorAttribute = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
      const sizeAttribute = new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage);
      const opacityAttribute = new THREE.BufferAttribute(opacities, 1).setUsage(
        THREE.DynamicDrawUsage,
      );
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', positionAttribute);
      geometry.setAttribute('aColor', colorAttribute);
      geometry.setAttribute('aSize', sizeAttribute);
      geometry.setAttribute('aOpacity', opacityAttribute);
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
      geometry.setDrawRange(0, 0);
      const points = new THREE.Points(geometry, this.materials.sparks);
      points.name = `station-effect-slot-${i}`;
      points.visible = false;
      points.frustumCulled = true;
      points.onBeforeRender = (renderer) => {
        renderer.getDrawingBufferSize(this.viewport);
        points.material.uniforms['uViewportY']!.value = Math.max(1, this.viewport.y);
      };
      this.root.add(points);
      this.slots.push({
        points,
        positions,
        colors,
        sizes,
        opacities,
        velocities: new Float32Array(PARTICLES_PER_SLOT * 3),
        lifetimes: new Float32Array(PARTICLES_PER_SLOT),
        delays: new Float32Array(PARTICLES_PER_SLOT),
        phases: new Float32Array(PARTICLES_PER_SLOT),
        positionAttribute,
        colorAttribute,
        sizeAttribute,
        opacityAttribute,
        kind: 'sparks',
        count: 0,
        elapsed: 0,
        duration: 0,
        order: 0,
      });
    }
  }

  emit(kind: ShipEffectKind, at: { x: number; y: number; z: number }): void {
    if (this.disposed || !Number.isFinite(at.x) || !Number.isFinite(at.y) || !Number.isFinite(at.z))
      return;
    if (Math.abs(at.x) > 1e6 || Math.abs(at.y) > 1e6 || Math.abs(at.z) > 1e6) return;
    if (kind !== 'sparks' && kind !== 'smoke' && kind !== 'fire') return;
    let slot = this.slots[0]!;
    for (const candidate of this.slots) {
      if (!candidate.points.visible) {
        slot = candidate;
        break;
      }
      if (candidate.order < slot.order) slot = candidate;
    }
    slot.kind = kind;
    slot.order = ++this.order;
    slot.elapsed = 0;
    slot.duration = 0;
    slot.count = kind === 'smoke' ? 32 : kind === 'fire' ? 40 : PARTICLES_PER_SLOT;
    slot.points.material = this.materials[kind];
    slot.points.visible = true;
    slot.points.geometry.setDrawRange(0, slot.count);
    // Explicit reset also clears particles left over from a larger prior burst.
    slot.positions.fill(0);
    slot.velocities.fill(0);
    slot.colors.fill(0);
    slot.sizes.fill(0);
    slot.opacities.fill(0);
    slot.lifetimes.fill(0);
    slot.delays.fill(0);
    slot.phases.fill(0);
    for (let i = 0; i < slot.count; i++) {
      const j = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const spread = kind === 'sparks' ? 0.055 : kind === 'smoke' ? 0.19 : 0.1;
      const radius = Math.random() * spread;
      slot.positions[j] = at.x + Math.cos(angle) * radius;
      slot.positions[j + 1] = Math.max(0.045, at.y + (Math.random() - 0.3) * spread);
      slot.positions[j + 2] = at.z + Math.sin(angle) * radius;
      const lateral =
        kind === 'sparks'
          ? 0.5 + Math.random() * 2.7
          : kind === 'smoke'
            ? 0.09 + Math.random() * 0.18
            : 0.03 + Math.random() * 0.17;
      slot.velocities[j] = Math.cos(angle) * lateral;
      slot.velocities[j + 1] =
        kind === 'sparks'
          ? 0.8 + Math.random() * 2.8
          : kind === 'smoke'
            ? 0.18 + Math.random() * 0.3
            : 0.55 + Math.random() * 0.55;
      slot.velocities[j + 2] = Math.sin(angle) * lateral;
      slot.lifetimes[i] =
        kind === 'sparks'
          ? 0.45 + Math.random() * 0.85
          : kind === 'smoke'
            ? 1.8 + Math.random() * 1.5
            : 0.48 + Math.random() * 0.6;
      slot.delays[i] = kind === 'sparks' ? 0 : Math.random() * (kind === 'smoke' ? 0.28 : 0.35);
      slot.phases[i] = Math.random() * Math.PI * 2;
      slot.duration = Math.max(slot.duration, slot.lifetimes[i]! + slot.delays[i]!);
      this.appearance(slot, i, 0);
      if (slot.delays[i]! > 0) slot.opacities[i] = 0;
    }
    this.upload(slot);
    this.bounds(slot);
  }

  update(dt: number): void {
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    // Paused tabs retire old effects immediately; physics never takes a huge step.
    const elapsed = Math.min(dt, 10);
    const step = Math.min(dt, 0.1);
    for (const slot of this.slots) {
      if (!slot.points.visible) continue;
      slot.elapsed += elapsed;
      if (slot.elapsed >= slot.duration) {
        slot.points.visible = false;
        slot.opacities.fill(0);
        slot.opacityAttribute.needsUpdate = true;
        continue;
      }
      for (let i = 0; i < slot.count; i++) {
        const age = slot.elapsed - slot.delays[i]!;
        if (age < 0 || age >= slot.lifetimes[i]!) {
          slot.opacities[i] = 0;
          continue;
        }
        const j = i * 3;
        const drag = Math.max(0, 1 - step * (slot.kind === 'sparks' ? 0.4 : 0.65));
        slot.velocities[j] = slot.velocities[j]! * drag;
        slot.velocities[j + 2] = slot.velocities[j + 2]! * drag;
        slot.velocities[j + 1] =
          slot.velocities[j + 1]! +
          step * (slot.kind === 'sparks' ? -5.8 : slot.kind === 'smoke' ? 0.17 : 0.45);
        if (slot.kind !== 'sparks') {
          slot.velocities[j] =
            slot.velocities[j]! + Math.sin(age * 2.8 + slot.phases[i]!) * step * 0.08;
          slot.velocities[j + 2] =
            slot.velocities[j + 2]! + Math.cos(age * 2.1 + slot.phases[i]!) * step * 0.07;
        }
        slot.positions[j] = slot.positions[j]! + slot.velocities[j]! * step;
        slot.positions[j + 1] = slot.positions[j + 1]! + slot.velocities[j + 1]! * step;
        slot.positions[j + 2] = slot.positions[j + 2]! + slot.velocities[j + 2]! * step;
        if (slot.kind === 'sparks' && slot.positions[j + 1]! < 0.035) {
          slot.positions[j + 1] = 0.035;
          slot.velocities[j + 1] = -slot.velocities[j + 1]! * 0.22;
          slot.velocities[j] = slot.velocities[j]! * 0.65;
          slot.velocities[j + 2] = slot.velocities[j + 2]! * 0.65;
        }
        this.appearance(slot, i, age / slot.lifetimes[i]!);
      }
      this.upload(slot);
      this.bounds(slot);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const slot of this.slots) {
      slot.points.visible = false;
      slot.points.geometry.dispose();
    }
    this.materials.sparks.dispose();
    this.materials.smoke.dispose();
    this.materials.fire.dispose();
    this.root.clear();
    this.root.removeFromParent();
  }

  private material(kind: number, blending: THREE.Blending): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      name: `station-particles-${kind}`,
      uniforms: { uKind: { value: kind }, uViewportY: { value: 720 } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      blending,
    });
  }

  private appearance(slot: Emitter, i: number, t: number): void {
    const j = i * 3;
    const fade = (1 - t) * (1 - t);
    if (slot.kind === 'sparks') {
      slot.sizes[i] = 0.046 * (1 - t * 0.48);
      slot.opacities[i] = fade * 0.9;
      slot.colors[j] = 1;
      slot.colors[j + 1] = 0.7 - t * 0.46;
      slot.colors[j + 2] = 0.26 * (1 - t);
    } else if (slot.kind === 'smoke') {
      slot.sizes[i] = 0.24 + t * 0.86;
      slot.opacities[i] = fade * Math.min(1, t * 12) * 0.27;
      slot.colors[j] = 0.24 + t * 0.09;
      slot.colors[j + 1] = 0.27 + t * 0.08;
      slot.colors[j + 2] = 0.26 + t * 0.07;
    } else {
      slot.sizes[i] = 0.095 + Math.sin(t * Math.PI) * 0.18;
      slot.opacities[i] = fade * Math.min(1, t * 14) * 0.8;
      slot.colors[j] = 1 - t * 0.3;
      slot.colors[j + 1] = 0.72 * (1 - t);
      slot.colors[j + 2] = 0.12 * (1 - t);
    }
  }

  private upload(slot: Emitter): void {
    slot.positionAttribute.needsUpdate = true;
    slot.colorAttribute.needsUpdate = true;
    slot.sizeAttribute.needsUpdate = true;
    slot.opacityAttribute.needsUpdate = true;
  }

  /** Reuse the existing sphere; padding includes the visible soft particle edge. */
  private bounds(slot: Emitter): void {
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;
    let padding = 0;
    for (let i = 0; i < slot.count; i++) {
      const j = i * 3;
      minX = Math.min(minX, slot.positions[j]!);
      maxX = Math.max(maxX, slot.positions[j]!);
      minY = Math.min(minY, slot.positions[j + 1]!);
      maxY = Math.max(maxY, slot.positions[j + 1]!);
      minZ = Math.min(minZ, slot.positions[j + 2]!);
      maxZ = Math.max(maxZ, slot.positions[j + 2]!);
      padding = Math.max(padding, slot.sizes[i]! / 2);
    }
    const sphere = slot.points.geometry.boundingSphere!;
    sphere.center.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    sphere.radius = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2 + padding;
  }
}
