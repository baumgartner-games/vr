import * as THREE from 'three';
import { GhostHand } from '../../core/HandVisuals';
import { GRAB_GLOW, GRAB_TINT } from '../../core/colors';
import { createTool } from '../portal/tools';
import { bullseyeFace } from '../shared/target';
import { clampRange, type RangeSettings } from './rangeSettings';
import type { HandPose } from '../../core/handPose';
import type { Handedness } from '../../core/XRInput';
import type { Tool } from '../portal/tools/Tool';

/** Der Gang: halbe Breite, Länge und lichte Höhe, in Metern. */
export const LANE = { half: 1.35, length: 9.5, height: 2.7 };

/** Wie nah ein Werkzeug an den Halter muss, damit es einrastet. */
export const MOUNT_REACH = 0.3;
/** Wie nah eine Hand an einen Griff, das Regal oder den Handstand muss. */
export const HANDLE_REACH = 0.2;

/** Wo die Scheibe hängt, im Raum des Gangs. */
const TARGET = new THREE.Vector3(0, 1.45, LANE.length - 0.35);
const TARGET_RADIUS = 0.32;

/**
 * Wie weit der Ausleger mit den Griffen zur Seite steht.
 *
 * Das ist die ganze Anforderung an ihn: **weit genug weg**. Ein Griff neben
 * der Aufnahme wird von der Hand mitgenommen, die nach dem Werkzeug greift,
 * und dann steht der Stand plötzlich woanders — mitten in einer Messung, die
 * genau davon lebt, dass er stillsteht.
 */
const BOOM = 0.8;

/** Was neben dem Stand steht, in dessen eigenem Raum. */
const RACK = new THREE.Vector3(-0.5, -0.06, -0.5);
const HAND_STAND = new THREE.Vector3(-0.5, -0.05, 0.5);

const _world = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _station = new THREE.Vector3();

/** Was eine Hand hier anfassen kann. */
export type RangeGrip = 'height' | 'place' | 'rack';

/**
 * Die Schießanlage im Eingaberaum: ein Gang, eine Scheibe, ein Justierstand.
 *
 * Der Tisch nebenan beantwortet die Frage „liegt meine Hand richtig?", weil er
 * einen festen Punkt hat, den man anfassen kann. Für ein **Werkzeug** reicht
 * das nicht: eine Pistole liegt nicht richtig oder falsch, sie **zeigt**
 * richtig oder falsch. Und wohin sie zeigt, sieht man an nichts so gut wie an
 * einer Zielscheibe am Ende eines Gangs.
 *
 * Deshalb liegt der Halter so, wie er liegt: seine Aufnahme ist genau auf die
 * Scheibe ausgerichtet, das Werkzeug rastet mit seiner Zielachse (-Z) darauf
 * ein und kann gar nicht anders als richtig zu zeigen. Was danach gemessen
 * wird, ist ausschließlich die **Hand** — der Rest steht schon fest.
 *
 * Der Stand selbst ist dabei **im Weg**, und zwar immer: man will die Hand am
 * Werkzeug sehen und nicht das Möbelstück darunter. Also ist er leer
 * **durchsichtig** — gerade sichtbar genug, um zu wissen, wohin man das
 * Werkzeug hält — und mit Werkzeug darin **ganz weg**. Stattdessen läuft dann
 * eine **Linie** aus dem Werkzeug bis in die Scheibe: die Zielachse selbst, zu
 * sehen statt zu glauben.
 *
 * Daneben stehen zwei Ablagen, weil sie hierher gehören und nicht quer durch
 * den Raum: ein **Waffenregal**, aus dem eine Pistole mit einem Griff in der
 * Hand ist, und ein **Handstand** mit einer Boxhand darauf, die man genauso
 * justiert wie die auf dem Tisch — nur hier, im Stehen, neben dem Werkzeug,
 * um das es gerade geht.
 *
 * Höhe und Ort hängen an **zwei Griffen am Ausleger**, einen knappen Meter zur
 * Seite: oben die Höhe, unten der Ort. So weit weg, dass die Hand am Werkzeug
 * sie nicht streift.
 *
 * Der Gang selbst wird von der Welt gebaut (Wände wollen fest sein und
 * Portale abweisen); hier steht das, was der Gang *für* etwas ist.
 */
export class ToolRange extends THREE.Group {
  /** Die Aufnahme: ein leerer Knoten in genau der Lage, die das Werkzeug erbt. */
  readonly mount = new THREE.Object3D();

  /** Die Scheibe selbst — die Welt macht sie fest, damit Kugeln daran enden. */
  readonly disc: THREE.Mesh;

  /** Alles, was mit dem Stand mitwandert. */
  private readonly station = new THREE.Group();
  private readonly cradle: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private readonly column: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private readonly standMaterial: THREE.MeshStandardMaterial;
  /** Die Zielachse, sichtbar: vom Werkzeug bis in die Scheibe. */
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  /** Was angefasst werden kann, samt der Farbe, die es dabei annimmt. */
  private readonly grips = new Map<
    RangeGrip,
    THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  >();
  private readonly rack = new THREE.Group();
  private readonly handStand = new THREE.Group();
  /** Die Beine der beiden Ablagen — sie wachsen mit der Höhe des Standes. */
  private readonly legs: THREE.Mesh[] = [];
  /** Die Boxhand auf dem Handstand, neu gebaut, wenn sich die Haltung ändert. */
  private ghost: GhostHand | null = null;
  private ghostKey = '';
  /** Das Ausstellungsstück im Regal — nie in einer Hand, nur zum Ansehen. */
  private preview: Tool | null = null;
  private readonly owned: THREE.Material[] = [];
  private lit: RangeGrip | 'mount' | null = null;
  private occupied = false;
  private settings: RangeSettings = clampRange({});

  constructor() {
    super();
    this.name = 'tool-range';

    const steel = this.own(
      new THREE.MeshStandardMaterial({ color: 0x59617a, roughness: 0.4, metalness: 0.6 }),
    );

    // --- die Scheibe am Ende ------------------------------------------------
    const face = this.own(bullseyeFace());
    this.disc = new THREE.Mesh(
      new THREE.CylinderGeometry(TARGET_RADIUS, TARGET_RADIUS, 0.05, 28),
      [steel, face, steel],
    );
    // Ein Zylinder steht auf +Y; nach vorn gekippt schaut seine Deckfläche den
    // Gang herunter — also zu dem hin, der schießt.
    this.disc.rotation.x = -Math.PI / 2;
    this.disc.position.copy(TARGET);
    this.add(this.disc);

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, TARGET.y, 0.08), steel);
    post.position.set(TARGET.x, TARGET.y / 2, TARGET.z + 0.05);
    this.add(post);

    // --- der Stand ----------------------------------------------------------
    this.add(this.station);

    // Ein eigenes Material für Wiege und Säule: die beiden werden durchsichtig
    // und wieder unsichtbar, und der Rest der Anlage darf davon nichts
    // mitbekommen.
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

    this.cradle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.3), this.standMaterial);
    this.cradle.position.y = -0.03;
    this.station.add(this.cradle);

    // Eine Einheit lang und oben verankert: die Höhe skaliert sie, statt sie
    // neu zu bauen, und unten steht sie immer auf dem Boden.
    this.column = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.07), this.standMaterial);
    this.column.geometry.translate(0, -0.5, 0);
    this.column.position.y = -0.045;
    this.station.add(this.column);

    this.station.add(this.mount);

    // Die Zielachse: eine Linie aus der Aufnahme heraus, entlang -Z. Sie hängt
    // an der Aufnahme und erbt deren Ausrichtung — sie kann gar nicht
    // woandershin zeigen als das Werkzeug, das dort einrastet.
    this.beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1),
      ]),
      this.own(new THREE.LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.8 })),
    );
    this.beam.visible = false;
    this.mount.add(this.beam);

    this.buildBoom(steel);
    this.buildRack(steel);
    this.buildHandStand(steel);
    this.apply(this.settings);
  }

  /** Wo der Stand steht und wie hoch — der eine Weg dorthin. */
  apply(settings: RangeSettings): void {
    this.settings = settings;
    const height = settings.height / 100;
    this.station.position.set(settings.x / 100, height, settings.z / 100);
    // Säule und Ablagenbeine reichen von ihrem Brett bis auf den Boden.
    this.column.scale.y = Math.max(height - 0.045, 0.02);
    for (const leg of this.legs) {
      leg.scale.y = Math.max(height + leg.position.y + leg.parent!.position.y, 0.02);
    }

    // Die Aufnahme sieht die Scheibe an, wo der Stand auch steht: `lookAt`
    // legt -Z auf das Ziel, und -Z ist genau die Achse, an der ein Werkzeug
    // zielt (`aim.ts`). Damit *kann* ein Werkzeug im Halter nicht danebenzeigen
    // — auch nicht, nachdem der Stand verschoben wurde.
    _station.copy(this.station.position);
    this.mount.quaternion.setFromRotationMatrix(_matrix.lookAt(_station, TARGET, _up));
    // Und die Linie reicht genau bis in die Scheibe, nicht weiter.
    this.beam.scale.z = Math.max(_station.distanceTo(TARGET) - 0.06, 0.2);
  }

  /**
   * Ein Werkzeug sitzt drin — oder nicht.
   *
   * Voll ist der Stand **ganz weg**: was man dann ansieht, ist die Hand am
   * Werkzeug, und ein Möbelstück mitten darin macht genau die Beurteilung
   * unmöglich, für die man hergekommen ist. Leer bleibt er durchsichtig
   * stehen, sonst wüsste niemand, wohin das Werkzeug soll.
   */
  setOccupied(occupied: boolean): void {
    if (occupied === this.occupied) return;
    this.occupied = occupied;
    this.cradle.visible = !occupied;
    this.column.visible = !occupied;
    this.beam.visible = occupied;
  }

  /** Wie weit ein Punkt von der Aufnahme weg ist, in Metern. */
  mountDistance(worldPoint: THREE.Vector3): number {
    this.mount.updateWorldMatrix(true, false);
    return this.mount.getWorldPosition(_world).distanceTo(worldPoint);
  }

  /** Wie weit ein Punkt von einem Griff oder dem Regal weg ist. */
  gripDistance(grip: RangeGrip, worldPoint: THREE.Vector3): number {
    const mesh = this.grips.get(grip);
    if (!mesh) return Infinity;
    mesh.updateWorldMatrix(true, false);
    return mesh.getWorldPosition(_world).distanceTo(worldPoint);
  }

  /** Wie weit ein Punkt von der Boxhand auf dem Handstand weg ist. */
  handDistance(worldPoint: THREE.Vector3): number {
    this.handStand.updateWorldMatrix(true, false);
    return this.handStand.getWorldPosition(_world).distanceTo(worldPoint);
  }

  /** Der Geist auf dem Handstand — wogegen eine Hand hier justiert wird. */
  get handObject(): THREE.Object3D | null {
    return this.ghost;
  }

  /**
   * Die Boxhand auf dem Handstand: dieselbe Seite und dieselbe Haltung wie am
   * Tisch, damit man nicht zwei verschiedene Dinge einstellt und sich nachher
   * wundert. Gebaut wird sie nur neu, wenn sich wirklich etwas geändert hat —
   * eine `GhostHand` friert ihre Finger beim Bauen ein.
   */
  setHand(side: Handedness, pose: HandPose): void {
    const key = `${side}:${JSON.stringify(pose)}`;
    if (key === this.ghostKey) return;
    this.ghostKey = key;
    this.ghost?.dispose();
    const ghost = new GhostHand(side, pose, GRAB_GLOW);
    // Flach auf dem Teller, Finger zur Scheibe: die Hand ist gebaut mit der
    // Handfläche nach unten und den Fingern entlang -Z, also fehlt genau die
    // halbe Drehung.
    ghost.rotation.y = Math.PI;
    this.handStand.add(ghost);
    this.ghost = ghost;
  }

  /** Was gerade leuchtet, weil eine Hand es erreichen könnte. */
  setGlow(what: RangeGrip | 'mount' | null): void {
    if (what === this.lit) return;
    this.lit = what;
    for (const [key, mesh] of this.grips) {
      const on = key === what;
      mesh.material.color.setHex(on ? GRAB_GLOW : GRAB_TINT);
      mesh.material.emissive.setHex(on ? GRAB_GLOW : GRAB_TINT).multiplyScalar(on ? 0.6 : 0.3);
    }
    const near = what === 'mount';
    this.standMaterial.color.setHex(near ? GRAB_GLOW : GRAB_TINT);
    this.standMaterial.emissive
      .setHex(near ? GRAB_GLOW : GRAB_TINT)
      .multiplyScalar(near ? 0.6 : 0.3);
    this.standMaterial.opacity = near ? 0.5 : 0.34;
  }

  dispose(): void {
    this.ghost?.dispose();
    this.ghost = null;
    const preview = this.preview;
    this.preview = null;
    preview?.removeFromParent();
    preview?.disposeTool();
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
    });
    this.beam.geometry.dispose();
    for (const material of this.owned) {
      (material as THREE.MeshStandardMaterial).map?.dispose();
      material.dispose();
    }
    this.removeFromParent();
  }

  // --- was am Stand hängt ----------------------------------------------------

  /** Ein Ding, das eine Hand anfassen darf — überall dieselbe Greiffarbe. */
  private grip(key: RangeGrip, geometry: THREE.BufferGeometry, parent: THREE.Object3D): THREE.Mesh {
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

  /**
   * Der Ausleger mit den beiden Griffen — oben die Höhe, unten der Ort.
   *
   * Zwei Griffe statt eines, weil das zwei verschiedene Fragen sind: „zu hoch"
   * beantwortet man, ohne den Stand quer zu verschieben, und umgekehrt. Ein
   * Griff, der beides kann, verstellt immer auch das, was schon stimmte. Und
   * sie sehen verschieden aus — ein Schieber und eine Kugel —, damit man ihnen
   * ansieht, welche Bewegung sie erwarten.
   */
  private buildBoom(steel: THREE.MeshStandardMaterial): void {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(BOOM, 0.025, 0.025), steel);
    arm.position.set(BOOM / 2, 0, 0);
    this.station.add(arm);

    this.grip('height', new THREE.BoxGeometry(0.05, 0.16, 0.05), this.station).position.set(
      BOOM,
      0.15,
      0,
    );
    this.grip('place', new THREE.SphereGeometry(0.055, 14, 10), this.station).position.set(
      BOOM,
      -0.15,
      0,
    );
  }

  /**
   * Das Waffenregal: eine Pistole zum Ansehen, und ein Griff daran holt eine
   * echte.
   *
   * Ausgestellt wird eine **eigene** Pistole, die nie jemand in die Hand
   * bekommt — sonst wäre das Regal nach dem ersten Griff für immer leer. Es
   * ist dieselbe Geometrie wie die echte, weil ein Regal, in dem etwas anderes
   * liegt als das, was man bekommt, schlimmer ist als ein leeres.
   */
  private buildRack(steel: THREE.MeshStandardMaterial): void {
    this.rack.name = 'tool-range-rack';
    this.rack.position.copy(RACK);
    this.station.add(this.rack);

    this.grip('rack', new THREE.BoxGeometry(0.3, 0.025, 0.22), this.rack).position.y = -0.055;
    this.legs.push(this.foot(steel, this.rack, -0.065));

    const preview = createTool('pistol');
    if (preview) {
      // Ein Ausstellungsstück, kein Werkzeug: es wird nie gehalten, nie
      // aktualisiert und liegt einfach quer auf dem Brett.
      preview.rotation.set(0, Math.PI / 2, 0);
      preview.position.y = -0.02;
      this.rack.add(preview);
      this.preview = preview;
    }
  }

  /** Der Handstand: ein Teller auf einem Bein, und darauf die Boxhand. */
  private buildHandStand(steel: THREE.MeshStandardMaterial): void {
    this.handStand.name = 'tool-range-hand';
    this.handStand.position.copy(HAND_STAND);
    this.station.add(this.handStand);

    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 20), steel);
    plate.position.y = -0.05;
    this.handStand.add(plate);
    this.legs.push(this.foot(steel, this.handStand, -0.06));
  }

  /** Ein Bein, oben verankert: skalieren schiebt sein Ende auf den Boden. */
  private foot(steel: THREE.MeshStandardMaterial, parent: THREE.Object3D, y: number): THREE.Mesh {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), steel);
    leg.geometry.translate(0, -0.5, 0);
    leg.position.y = y;
    parent.add(leg);
    return leg;
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }
}
