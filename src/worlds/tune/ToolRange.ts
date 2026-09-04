import * as THREE from 'three';
import { createTool } from '../portal/tools';
import { bullseyeFace } from '../shared/target';
import { StandFrame } from './StandFrame';
import { clampRange, type RangeSettings } from './rangeSettings';
import type { Tool } from '../portal/tools/Tool';

/** Der Gang: halbe Breite, Länge und lichte Höhe, in Metern. */
export const LANE = { half: 1.35, length: 9.5, height: 2.7 };

/** Wie nah ein Werkzeug an den Halter muss, damit es einrastet. */
export const MOUNT_REACH = 0.3;

/** Wo die Scheibe hängt, im Raum des Gangs. */
const TARGET = new THREE.Vector3(0, 1.45, LANE.length - 0.35);
const TARGET_RADIUS = 0.32;

/** Wie weit der Ausleger mit den Griffen zur Seite steht. */
const BOOM = 0.55;

/** Wo das Regal steht, im Raum des Standes. */
const RACK = new THREE.Vector3(-0.6, -0.06, 0);

/**
 * Was im Regal liegt, in der Reihenfolge, in der es dort liegt.
 *
 * Drei Dinge, und alle drei aus demselben Grund: das sind die, die man hier
 * einmisst. Die **Pistole** steht für alles, was zielt — sie ist das
 * Werkzeug, an dem man sieht, ob eine Haltung trifft. Die **Boxhand** ist die
 * Hand selbst, und seit sie ein Werkzeug ist, wird sie genauso eingemessen wie
 * jedes andere: hinlegen, danebengreifen, fertig. Und der **Controller** ist
 * das Gerät, in dem beides steckt — wer wissen will, warum ein Versatz so
 * aussieht, wie er aussieht, legt ihn hin und schaut nach.
 *
 * `controller` ist dabei kein Werkzeug, sondern eine Seite: welcher der beiden
 * herauskommt, hängt an der Hand, die zugreift (`controllerToolId`).
 */
export const RACK_SLOTS = [
  { key: 'rack-pistol', tool: 'pistol', preview: 'pistol' },
  { key: 'rack-hand', tool: 'hand-box', preview: 'hand-box' },
  { key: 'rack-controller', tool: 'controller', preview: 'controller-right' },
] as const;

/** Was eine Hand hier anfassen kann. */
export type RangeGrip = 'height' | 'place' | (typeof RACK_SLOTS)[number]['key'];

const _world = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _station = new THREE.Vector3();

/**
 * Der **erste** Justierstand im Schießgang: wie halte ich das Werkzeug?
 *
 * Für ein Werkzeug reicht ein Tisch nicht: eine Pistole liegt nicht richtig
 * oder falsch, sie **zeigt** richtig oder falsch. Und wohin sie zeigt, sieht
 * man an nichts so gut wie an einer Zielscheibe am Ende eines Gangs.
 *
 * Deshalb liegt der Halter so, wie er liegt: seine Aufnahme ist genau auf die
 * Scheibe ausgerichtet, das Werkzeug rastet mit seiner Zielachse (-Z) darauf
 * ein und kann gar nicht anders als richtig zu zeigen. Was danach gemessen
 * wird, ist ausschließlich die **Hand** — der Rest steht schon fest.
 *
 * Der Stand selbst ist dabei im Weg, und zwar immer. Also ist er leer
 * **durchsichtig** — gerade sichtbar genug, um zu wissen, wohin man das
 * Werkzeug hält — und mit Werkzeug darin **ganz weg**. Stattdessen läuft dann
 * eine **Linie** aus dem Werkzeug bis in die Scheibe: die Zielachse selbst, zu
 * sehen statt zu glauben.
 *
 * Daneben steht ein **Regal** mit drei Ausstellungsstücken, weil sie hierher
 * gehören und nicht quer durch den Raum: ein Griff daran, und man hat eine
 * Pistole, eine Boxhand oder seinen Controller in der Hand (`RACK_SLOTS`).
 *
 * Der Handstand mit der Geisterhand, der hier einmal stand, ist weg — und zwar
 * ersetzt: die Hand ist selbst ein Werkzeug geworden (`tools/HandTool.ts`) und
 * wird deshalb im Halter eingemessen wie alles andere. Ein Weg statt zwei. Wie
 * die *virtuelle* Hand ein Werkzeug umfasst, steht am zweiten Stand
 * (`GripStand.ts`).
 *
 * Gestell, Säule und die beiden Griffe am Ausleger kommen von `StandFrame`;
 * der Gang selbst wird von der Welt gebaut (Wände wollen fest sein und Portale
 * abweisen).
 */
export class ToolRange extends StandFrame {
  /** Die Aufnahme: ein leerer Knoten in genau der Lage, die das Werkzeug erbt. */
  readonly mount = new THREE.Object3D();

  /** Die Scheibe selbst — die Welt macht sie fest, damit Kugeln daran enden. */
  readonly disc: THREE.Mesh;

  private readonly cradle: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  /** Die Zielachse, sichtbar: vom Werkzeug bis in die Scheibe. */
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly rack = new THREE.Group();
  /** Die Ausstellungsstücke — nie in einer Hand, nur zum Ansehen. */
  private readonly previews: Tool[] = [];
  private occupied = false;
  private settings: RangeSettings = clampRange({});

  constructor() {
    super('tool-range', BOOM);

    // --- die Scheibe am Ende ------------------------------------------------
    const face = this.own(bullseyeFace());
    this.disc = new THREE.Mesh(
      new THREE.CylinderGeometry(TARGET_RADIUS, TARGET_RADIUS, 0.05, 28),
      [this.steel, face, this.steel],
    );
    // Ein Zylinder steht auf +Y; nach vorn gekippt schaut seine Deckfläche den
    // Gang herunter — also zu dem hin, der schießt.
    this.disc.rotation.x = -Math.PI / 2;
    this.disc.position.copy(TARGET);
    this.add(this.disc);

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, TARGET.y, 0.08), this.steel);
    post.position.set(TARGET.x, TARGET.y / 2, TARGET.z + 0.05);
    this.add(post);

    // --- der Stand ----------------------------------------------------------
    this.cradle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.3), this.standMaterial);
    this.cradle.position.y = -0.03;
    this.station.add(this.cradle);
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

    this.buildRack();
    this.apply(this.settings);
  }

  /** Wo der Stand steht und wie hoch — der eine Weg dorthin. */
  apply(settings: RangeSettings): void {
    this.settings = settings;
    this.place(settings.height / 100, settings.x / 100, settings.z / 100);

    // Die Aufnahme sieht die Scheibe an, wo der Stand auch steht: `lookAt`
    // legt -Z auf das Ziel, und -Z ist genau die Achse, an der ein Werkzeug
    // zielt (`aim.ts`). Damit *kann* ein Werkzeug im Halter nicht danebenzeigen
    // — auch nicht, nachdem der Stand verschoben wurde.
    _station.set(settings.x / 100, settings.height / 100, settings.z / 100);
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
    this.setColumnVisible(!occupied);
    this.beam.visible = occupied;
  }

  /** Wie weit ein Punkt von der Aufnahme weg ist, in Metern. */
  mountDistance(worldPoint: THREE.Vector3): number {
    this.mount.updateWorldMatrix(true, false);
    return this.mount.getWorldPosition(_world).distanceTo(worldPoint);
  }

  override setGlow(what: RangeGrip | 'mount' | null): void {
    if (what === this.lit) return;
    super.setGlow(what);
    this.setStandGlow(what === 'mount');
  }

  dispose(): void {
    const previews = this.previews.splice(0, this.previews.length);
    for (const preview of previews) {
      preview.removeFromParent();
      preview.disposeTool();
    }
    this.beam.geometry.dispose();
    this.disposeFrame();
  }

  /**
   * Das Regal: drei Ausstellungsstücke, und ein Griff unter jedem holt ein
   * echtes.
   *
   * Ausgestellt wird jeweils ein **eigenes** Exemplar, das nie jemand in die
   * Hand bekommt — sonst wäre das Regal nach dem ersten Griff für immer leer.
   * Es ist dieselbe Geometrie wie das echte, weil ein Regal, in dem etwas
   * anderes liegt als das, was man bekommt, schlimmer ist als ein leeres.
   */
  private buildRack(): void {
    this.rack.name = 'tool-range-rack';
    this.rack.position.copy(RACK);
    this.station.add(this.rack);

    const board = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.78), this.steel);
    board.position.y = -0.055;
    this.rack.add(board);
    this.foot(this.rack, -0.065);

    for (const [index, slot] of RACK_SLOTS.entries()) {
      const z = (index - 1) * 0.26;
      this.grip(slot.key, new THREE.BoxGeometry(0.2, 0.02, 0.2), this.rack).position.set(
        0,
        -0.036,
        z,
      );
      const preview = createTool(slot.preview);
      if (!preview) continue;
      // Ein Ausstellungsstück, kein Werkzeug: es wird nie gehalten, nie
      // aktualisiert und liegt einfach quer auf dem Brett.
      preview.rotation.set(0, Math.PI / 2, 0);
      preview.position.set(0, 0, z);
      this.rack.add(preview);
      this.previews.push(preview);
    }
  }
}
