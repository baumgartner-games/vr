import * as THREE from 'three';
import { GRAB_GLOW, GRAB_TINT } from '../../core/colors';

/** Wie nah eine Hand an einen Griff muss, damit er reagiert. */
export const HANDLE_REACH = 0.2;

const _world = new THREE.Vector3();

/**
 * Das Gestell, auf dem im Schießgang ein Justierstand steht.
 *
 * Es gibt inzwischen **zwei** Stände dort, und sie haben verschiedene
 * Aufgaben: der eine hält ein Werkzeug auf die Scheibe gerichtet und misst,
 * wie die echte Hand es greift; der andere hält eine unbewegliche Kopie und
 * misst, wie die virtuelle Hand sie umfasst. Was sie **teilen**, ist alles
 * Möbelstück daran, und das steht deshalb hier:
 *
 * - Eine **Säule** bis auf den Boden, durchsichtig, damit man an ihr vorbei
 *   sieht. Der Stand ist immer im Weg — man will die Hand am Werkzeug
 *   ansehen und nicht das Gestell darunter —, also ist er gerade sichtbar
 *   genug, um zu wissen, wohin man greift.
 * - Ein **Ausleger** mit zwei Griffen, weit zur Seite: oben die Höhe, unten
 *   der Ort. Zwei statt eines, weil das zwei verschiedene Fragen sind — „zu
 *   hoch" beantwortet man, ohne den Stand quer zu verschieben. Und sie sehen
 *   verschieden aus, ein Schieber und eine Kugel, damit man ihnen ansieht,
 *   welche Bewegung sie erwarten.
 * - Und die eine Regel, an der der ganze Stand hängt: **weit genug weg**. Ein
 *   Griff neben der Aufnahme wird von der Hand mitgenommen, die nach dem
 *   Werkzeug greift, und dann steht der Stand plötzlich woanders — mitten in
 *   einer Messung, die genau davon lebt, dass er stillsteht.
 *
 * Höhe und Ort kommen von außen (`rangeSettings.ts`, `gripSettings.ts`); hier
 * wird nur gebaut und gestellt.
 */
export abstract class StandFrame extends THREE.Group {
  /** Alles, was mit dem Stand mitwandert. */
  protected readonly station = new THREE.Group();
  /** Stahl für alles, was Möbelstück ist und bleibt. */
  protected readonly steel: THREE.MeshStandardMaterial;
  /**
   * Das durchsichtige Material der Säule — und dessen, was ein Stand sonst
   * noch aus dem Weg blenden will.
   */
  protected readonly standMaterial: THREE.MeshStandardMaterial;
  /** Was gerade leuchtet, weil eine Hand es erreichen könnte. */
  protected lit: string | null = null;

  private readonly column: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private readonly grips = new Map<
    string,
    THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  >();
  /** Die Beine der Ablagen — sie wachsen mit der Höhe des Standes. */
  private readonly legs: THREE.Mesh[] = [];
  private readonly owned: THREE.Material[] = [];

  /**
   * @param boom wie weit der Ausleger zur Seite steht, in Metern. Negativ
   *             schickt ihn nach links — zwei Stände nebeneinander schieben
   *             ihre Griffe sonst ineinander.
   */
  constructor(name: string, boom: number) {
    super();
    this.name = name;

    this.steel = this.own(
      new THREE.MeshStandardMaterial({ color: 0x59617a, roughness: 0.4, metalness: 0.6 }),
    );
    this.standMaterial = this.own(
      new THREE.MeshStandardMaterial({
        color: GRAB_TINT,
        roughness: 0.6,
        emissive: new THREE.Color(GRAB_TINT).multiplyScalar(0.3),
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
    );

    this.add(this.station);

    // Eine Einheit lang und oben verankert: die Höhe skaliert sie, statt sie
    // neu zu bauen, und unten steht sie immer auf dem Boden.
    this.column = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.07), this.standMaterial);
    this.column.geometry.translate(0, -0.5, 0);
    this.column.position.y = -0.045;
    this.station.add(this.column);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(boom), 0.025, 0.025), this.steel);
    arm.position.set(boom / 2, 0, 0);
    this.station.add(arm);
    this.grip('height', new THREE.BoxGeometry(0.05, 0.16, 0.05)).position.set(boom, 0.15, 0);
    this.grip('place', new THREE.SphereGeometry(0.055, 14, 10)).position.set(boom, -0.15, 0);
  }

  /** Wo der Stand steht und wie hoch — Meter, im Raum des Gangs. */
  place(height: number, x: number, z: number): void {
    this.station.position.set(x, height, z);
    // Säule und Ablagenbeine reichen von ihrem Brett bis auf den Boden.
    this.column.scale.y = Math.max(height - 0.045, 0.02);
    for (const leg of this.legs) {
      leg.scale.y = Math.max(height + leg.position.y + leg.parent!.position.y, 0.02);
    }
  }

  /** Wie weit ein Punkt von einem Griff weg ist, in Metern. */
  gripDistance(key: string, worldPoint: THREE.Vector3): number {
    const mesh = this.grips.get(key);
    if (!mesh) return Infinity;
    mesh.updateWorldMatrix(true, false);
    return mesh.getWorldPosition(_world).distanceTo(worldPoint);
  }

  /** Was gerade leuchtet — überall dieselbe Greiffarbe, überall ein Schlüssel. */
  setGlow(what: string | null): void {
    if (what === this.lit) return;
    this.lit = what;
    for (const [key, mesh] of this.grips) {
      const on = key === what;
      mesh.material.color.setHex(on ? GRAB_GLOW : GRAB_TINT);
      mesh.material.emissive.setHex(on ? GRAB_GLOW : GRAB_TINT).multiplyScalar(on ? 0.6 : 0.3);
    }
  }

  /** Das durchsichtige Möbelstück deutlicher, weil eine Hand nah dran ist. */
  protected setStandGlow(on: boolean): void {
    this.standMaterial.color.setHex(on ? GRAB_GLOW : GRAB_TINT);
    this.standMaterial.emissive
      .setHex(on ? GRAB_GLOW : GRAB_TINT)
      .multiplyScalar(on ? 0.6 : 0.3);
    this.standMaterial.opacity = on ? 0.5 : 0.34;
  }

  /** Ob die Säule zu sehen ist — voll ist ein Stand am besten ganz weg. */
  protected setColumnVisible(visible: boolean): void {
    this.column.visible = visible;
  }

  /** Ein Ding, das eine Hand anfassen darf — überall dieselbe Greiffarbe. */
  protected grip(
    key: string,
    geometry: THREE.BufferGeometry,
    parent: THREE.Object3D = this.station,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      geometry,
      this.own(
        new THREE.MeshStandardMaterial({
          color: GRAB_TINT,
          roughness: 0.6,
          emissive: new THREE.Color(GRAB_TINT).multiplyScalar(0.3),
        }),
      ),
    );
    parent.add(mesh);
    this.grips.set(key, mesh as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>);
    return mesh;
  }

  /** Ein Bein, oben verankert: skalieren schiebt sein Ende auf den Boden. */
  protected foot(parent: THREE.Object3D, y: number): THREE.Mesh {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), this.steel);
    leg.geometry.translate(0, -0.5, 0);
    leg.position.y = y;
    parent.add(leg);
    this.legs.push(leg);
    return leg;
  }

  protected own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }

  /** Geometrien und Materialien des Gestells. Unterklassen räumen ihr Eigenes. */
  protected disposeFrame(): void {
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
    });
    for (const material of this.owned) {
      (material as THREE.MeshStandardMaterial).map?.dispose();
      material.dispose();
    }
    this.owned.length = 0;
    this.removeFromParent();
  }
}
