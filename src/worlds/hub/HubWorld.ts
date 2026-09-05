import * as THREE from 'three';
import type { World, WorldContext, WorldPreview } from '../../core/types';
import { WORLDS } from '../index';
import { TextPlane } from '../../ui/TextPlane';
import { createGround, createLighting, createSky, disposeTree } from '../shared/environment';
import { FreeLocomotion } from '../../core/Locomotion';
import { layoutHub, type HubLayout } from './hubLayout';

/**
 * Ein Tor, wie es im Hub steht — und wie es die Werkzeugseite als Bild einer
 * Welt zeigt: dasselbe Podest, derselbe Ring in der Akzentfarbe, dasselbe
 * Schild. Eine Seite mit eigenen, hübscheren Bildern zeigte irgendwann etwas
 * anderes als das Spiel.
 */
export interface Gate {
  group: THREE.Group;
  ring: THREE.Mesh;
  disc: THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>;
  sign: TextPlane;
  worldId: string;
}

const SPAWN = new THREE.Vector3(0, 0, 4.5);
/** Augenhöhe des Blicks in der Vorschau — ein Mensch, der dort steht. */
const PREVIEW_EYE = 1.65;
/** Höhe der Gangwände. */
const WALL_HEIGHT = 3.4;

/**
 * Der Hub: hell, ruhig, und jede andere Welt ist ein Tor weit weg.
 *
 * Die Tore stehen nicht mehr auf einem Bogen, sondern in **Gängen**, die von
 * der Halle abgehen — vier Tore je Gang, und ist einer voll, kommt der
 * nächste dazu. Wo genau, rechnet `hubLayout.ts` (mit Test) aus der Länge der
 * Weltenliste aus: eine neue Welt bleibt damit das, was sie sein soll — ein
 * Eintrag in der Registry, und niemand rückt hier Koordinaten zurecht.
 *
 * Das Handgelenk-Menü kann dasselbe; die Tore sind die begehbare Variante.
 */
export class HubWorld implements World {
  private readonly root = new THREE.Group();
  private readonly gates: Gate[] = [];
  private time = 0;

  init(ctx: WorldContext): void {
    this.root.name = 'hub-world';
    ctx.scene.add(this.root);
    ctx.scene.fog = new THREE.Fog(0x0a1020, 40, 260);

    this.root.add(createSky(0x1b3358, 0x05070d));
    this.root.add(createLighting(1.15));
    // Auch der Hub steht auf der Fläche, die es überall gibt: man kann aus
    // den Gängen heraustreten und die Anlage von außen ansehen.
    this.root.add(createGround(0x1d2740, { line: 0x4aa8ff, tile: 6 }));

    const targets = WORLDS.filter((world) => world.id !== 'hub');
    const layout = layoutHub(targets.length);
    this.root.add(buildHall(layout));
    for (const corridor of layout.corridors) this.root.add(buildCorridor(corridor));

    const title = new TextPlane({
      width: 4.4,
      height: 1.3,
      title: 'Baumgartner VR',
      body: 'Wähle eine Welt – am Tor im Gang oder über den Button an deiner Hand.',
      align: 'center',
      accent: 0x4aa8ff,
    });
    // Über dem Eingang des ersten Gangs: hoch genug, um über den Toren zu
    // stehen, tief genug, um beim Blick geradeaus im Bild zu sein.
    title.position.set(0, 4.3, -1.5);
    this.root.add(title);

    const hint = new TextPlane({
      width: 2.4,
      height: 0.78,
      title: 'Steuerung',
      body: 'Beide Hände: Menü-Button. Zielen + Trigger wählt. Stick: gehen, rechts: drehen.',
      accent: 0x9d7bff,
    });
    hint.position.set(-3.8, 1.6, 3.2);
    hint.rotation.y = Math.PI / 4.5;
    this.root.add(hint);

    layout.gates.forEach((placement) => {
      const definition = targets[placement.index]!;
      const gate = buildGate(definition.title, definition.description, definition.accent);
      gate.group.position.set(placement.x, 0, placement.z);
      gate.group.rotation.y = placement.yaw;
      gate.worldId = definition.id;
      this.root.add(gate.group);
      this.gates.push(gate);

      const enter = () => ctx.goTo(definition.id);
      ctx.pointer.add({ object: gate.sign, onSelect: enter, pokeable: false });
      ctx.pointer.add({ object: gate.disc, onSelect: enter, pokeable: false });
    });

    ctx.rig.placeAt(SPAWN, 0);
    // Weit genug, um die Anlage zu umrunden — und eng genug, um nicht in der
    // leeren Fläche verloren zu gehen.
    const reach = layout.extent + 12;
    ctx.rig.setLocomotion(
      new FreeLocomotion(
        new THREE.Box3(new THREE.Vector3(-reach, 0, -reach), new THREE.Vector3(reach, 0, reach)),
      ),
    );
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

  /**
   * Der Hub zum Ansehen: dieselbe Halle, dieselben Gänge, dieselben Tore —
   * nur ohne Zeiger, ohne Weg hinein und ohne Spieler.
   *
   * Gebaut wird mit denselben Funktionen wie oben; was hier fehlt, sind die
   * beiden Zeilen, die aus einem Tor einen Knopf machen. Die Tore wirbeln
   * trotzdem: dafür ist `animate` da.
   */
  preview(): WorldPreview {
    this.root.name = 'hub-preview';
    this.root.add(createSky(0x1b3358, 0x05070d));
    this.root.add(createLighting(1.15));
    this.root.add(createGround(0x1d2740, { line: 0x4aa8ff, tile: 6 }));

    const targets = WORLDS.filter((world) => world.id !== 'hub');
    const layout = layoutHub(targets.length);
    this.root.add(buildHall(layout));
    for (const corridor of layout.corridors) this.root.add(buildCorridor(corridor));

    layout.gates.forEach((placement) => {
      const definition = targets[placement.index]!;
      const gate = buildGate(definition.title, definition.description, definition.accent);
      gate.group.position.set(placement.x, 0, placement.z);
      gate.group.rotation.y = placement.yaw;
      gate.worldId = definition.id;
      this.root.add(gate.group);
      this.gates.push(gate);
    });

    return {
      object: this.root,
      eye: new THREE.Vector3(SPAWN.x, SPAWN.y + PREVIEW_EYE, SPAWN.z),
      yaw: 0,
      animate: (time) => {
        for (const [index, gate] of this.gates.entries()) {
          gate.disc.material.uniforms.uTime!.value = time;
          gate.ring.rotation.z = time * 0.25 * (index % 2 === 0 ? 1 : -1);
        }
      },
      dispose: () => {
        for (const gate of this.gates) gate.sign.dispose();
        this.gates.length = 0;
        disposeTree(this.root);
      },
    };
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

/** Die runde Halle in der Mitte, aus der die Gänge abgehen. */
function buildHall(layout: HubLayout): THREE.Group {
  const group = new THREE.Group();
  group.name = 'hall';

  const radius = layout.hallRadius + 1;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({ color: 0x3a4666, roughness: 0.85, metalness: 0.05 }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.01;
  group.add(disc);

  const grid = new THREE.GridHelper(radius * 2, 16, 0x4aa8ff, 0x243b5a);
  (grid.material as THREE.Material).opacity = 0.28;
  (grid.material as THREE.Material).transparent = true;
  grid.position.y = 0.02;
  group.add(grid);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.06, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x4aa8ff }),
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.03;
  group.add(rim);

  // Ein Ring aus Pfeilern: er macht aus der Scheibe einen Raum, ohne die
  // Sicht in die Gänge zu verstellen.
  const pillar = new THREE.MeshStandardMaterial({ color: 0x2a3550, roughness: 0.7 });
  const openings = layout.corridors.map((corridor) => corridor.angle);
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    // Kein Pfeiler dort, wo ein Gang abgeht.
    if (openings.some((opening) => angularGap(angle, opening) < 0.5)) continue;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.2, 10), pillar);
    post.position.set(Math.sin(angle) * radius, 2.1, -Math.cos(angle) * radius);
    group.add(post);
  }

  return group;
}

/** Ein Gang: Boden, zwei Wände, ein Lichtband und eine Rückwand. */
function buildCorridor(corridor: HubLayout['corridors'][number]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'corridor';
  group.rotation.y = corridor.angle;

  const half = corridor.width / 2;
  // Der Gang fängt am Rand der Halle an und geht von dort nach außen; die
  // Mitte des Bauteils liegt also zwischen Anfang und Ende, nicht im Zentrum.
  const run = corridor.length - corridor.start;
  const middle = -(corridor.start + run / 2);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b4a70,
    roughness: 0.9,
    metalness: 0.05,
  });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2f3b5e, roughness: 0.85 });

  // Der Gang liegt entlang −Z; die Gruppe dreht ihn an seinen Platz.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(corridor.width, run), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.012, middle);
  group.add(floor);

  for (const side of [-1, 1] as const) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, WALL_HEIGHT, run), wallMaterial);
    wall.position.set(side * (half + 0.15), WALL_HEIGHT / 2, middle);
    group.add(wall);

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, run - 0.6),
      new THREE.MeshBasicMaterial({ color: 0x9ec4ff, toneMapped: false }),
    );
    strip.position.set(side * half, WALL_HEIGHT - 0.25, middle);
    group.add(strip);
  }

  // Zwei Lampen je Gang: ein Gang ohne eigenes Licht ist ein schwarzes Loch,
  // in das niemand hineingeht.
  for (const at of [0.35, 0.8]) {
    const lamp = new THREE.PointLight(0xbcd8ff, 26, corridor.width * 4, 2);
    lamp.position.set(0, WALL_HEIGHT - 0.5, -(corridor.start + run * at));
    group.add(lamp);
  }

  const end = new THREE.Mesh(
    new THREE.BoxGeometry(corridor.width + 0.6, WALL_HEIGHT, 0.3),
    wallMaterial,
  );
  end.position.set(0, WALL_HEIGHT / 2, -corridor.length);
  group.add(end);

  return group;
}

/** Kleinster Winkel zwischen zwei Richtungen. */
function angularGap(a: number, b: number): number {
  const difference = Math.abs(a - b) % (Math.PI * 2);
  return Math.min(difference, Math.PI * 2 - difference);
}

export function buildGate(title: string, description: string, accent: number): Gate {
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
