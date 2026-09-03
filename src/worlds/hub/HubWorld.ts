import * as THREE from 'three';
import type { World, WorldContext } from '../../core/types';
import { WORLDS } from '../index';
import { TextPlane } from '../../ui/TextPlane';
import { clampToBox, createLighting, createSky, disposeTree } from '../shared/environment';

interface Gate {
  group: THREE.Group;
  ring: THREE.Mesh;
  disc: THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>;
  sign: TextPlane;
  worldId: string;
}

const SPAWN = new THREE.Vector3(0, 0, 4.5);

/**
 * Landing area: quiet, bright, and every other world is one gate away. The
 * wrist menu works here too — the gates are just the physical variant.
 */
export class HubWorld implements World {
  private readonly root = new THREE.Group();
  private readonly gates: Gate[] = [];
  private time = 0;

  init(ctx: WorldContext): void {
    this.root.name = 'hub-world';
    ctx.scene.add(this.root);
    ctx.scene.fog = new THREE.Fog(0x0a1020, 18, 70);

    this.root.add(createSky(0x1b3358, 0x05070d));
    this.root.add(createLighting(1.15));
    this.root.add(buildFloor());

    const title = new TextPlane({
      width: 4.4,
      height: 1.3,
      title: 'Baumgartner VR',
      body: 'Wähle eine Welt – am Tor oder über den Button an deiner linken Hand.',
      align: 'center',
      accent: 0x4aa8ff,
    });
    title.position.set(0, 6.4, -13.5);
    this.root.add(title);

    const hint = new TextPlane({
      width: 2.4,
      height: 0.78,
      title: 'Steuerung',
      body: 'Linke Hand: Menü-Button. Rechte Hand: zielen + Trigger. Stick: gehen, rechts: drehen.',
      accent: 0x9d7bff,
    });
    hint.position.set(-4.6, 1.6, 2.6);
    hint.rotation.y = Math.PI / 4.5;
    this.root.add(hint);

    const targets = WORLDS.filter((world) => world.id !== 'hub');
    const spread = Math.PI / 2.4;
    targets.forEach((definition, index) => {
      const t = targets.length === 1 ? 0.5 : index / (targets.length - 1);
      const angle = -spread / 2 + spread * t;
      const gate = buildGate(definition.title, definition.description, definition.accent);
      gate.group.position.set(Math.sin(angle) * 6, 0, -Math.cos(angle) * 6);
      gate.group.lookAt(0, 0, SPAWN.z);
      gate.worldId = definition.id;
      this.root.add(gate.group);
      this.gates.push(gate);

      const enter = () => ctx.goTo(definition.id);
      ctx.pointer.add({ object: gate.sign, onSelect: enter, pokeable: false });
      ctx.pointer.add({ object: gate.disc, onSelect: enter, pokeable: false });
    });

    ctx.rig.placeAt(SPAWN, 0);
    ctx.rig.setMoveFilter(clampToBox(new THREE.Box3(
      new THREE.Vector3(-11, 0, -11),
      new THREE.Vector3(11, 0, 11),
    )));
  }

  update(dt: number, ctx: WorldContext): void {
    this.time += dt;
    for (const [index, gate] of this.gates.entries()) {
      gate.disc.material.uniforms.uTime!.value = this.time;
      gate.ring.rotation.z = this.time * 0.25 * (index % 2 === 0 ? 1 : -1);
      gate.sign.position.y = 2.55 + Math.sin(this.time * 1.2 + index) * 0.03;
    }
    void ctx;
  }

  dispose(ctx: WorldContext): void {
    for (const gate of this.gates) {
      ctx.pointer.remove(gate.sign);
      ctx.pointer.remove(gate.disc);
      gate.sign.dispose();
    }
    this.gates.length = 0;
    disposeTree(this.root);
  }
}

function buildFloor(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'floor';

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(12, 64),
    new THREE.MeshStandardMaterial({ color: 0x3a4666, roughness: 0.85, metalness: 0.05 }),
  );
  disc.rotation.x = -Math.PI / 2;
  group.add(disc);

  const grid = new THREE.GridHelper(24, 24, 0x4aa8ff, 0x243b5a);
  (grid.material as THREE.Material).opacity = 0.28;
  (grid.material as THREE.Material).transparent = true;
  grid.position.y = 0.01;
  group.add(grid);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(12, 0.06, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x4aa8ff }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.02;
  group.add(rim);

  return group;
}

function buildGate(title: string, description: string, accent: number): Gate {
  const group = new THREE.Group();
  group.name = `gate:${title}`;

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.5, 0.16, 32),
    new THREE.MeshStandardMaterial({ color: 0x1a2338, roughness: 0.7 }),
  );
  base.position.y = 0.08;
  group.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.07, 12, 64),
    new THREE.MeshStandardMaterial({
      color: accent,
      emissive: new THREE.Color(accent).multiplyScalar(0.6),
      roughness: 0.3,
      metalness: 0.4,
    }),
  );
  ring.position.y = 1.35;
  group.add(ring);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.02, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(accent) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float a = atan(p.y, p.x);
          float swirl = sin(a * 3.0 + uTime * 1.4 - r * 7.0) * 0.5 + 0.5;
          float glow = smoothstep(1.0, 0.25, r);
          float alpha = glow * (0.35 + swirl * 0.45);
          gl_FragColor = vec4(uColor * (0.6 + swirl * 0.8), alpha);
        }
      `,
    }),
  );
  disc.position.y = 1.35;
  group.add(disc);

  const sign = new TextPlane({ width: 1.9, height: 0.62, title, body: description, accent });
  sign.position.set(0, 2.55, 0.02);
  group.add(sign);

  return { group, ring, disc, sign, worldId: '' };
}
