import * as THREE from 'three';
import { GRAB_GLOW, GRAB_TINT } from '../../core/colors';

/**
 * Die Farbe des **festgestellten** Kastens: Bernstein, wie überall im Spiel,
 * wo etwas angehalten ist (die Stoppuhr trägt sie auch). Grün hieße „hier
 * hängt etwas", und genau das soll sich davon unterscheiden.
 */
const FIXED_TINT = 0xffc857;

const _local = new THREE.Vector3();
const _inverse = new THREE.Matrix4();

/**
 * Der **Schwebekasten** im Poseraum: eine durchsichtige Kiste in der Luft, in
 * der ein losgelassenes Werkzeug hängen bleibt.
 *
 * Der Grund ist eine Messung. Wie eine Hand ein Werkzeug umfasst, stellt man
 * ein, indem man die Hand daran legt — und dazu muss das Werkzeug stillstehen,
 * und zwar auf Arbeitshöhe und nicht auf dem Boden. Der zweite Justierstand
 * löst das mit einer **Kopie**, die fest in einer Aufnahme hängt; das ist
 * genau, was man will, solange man vorher weiß, welches Werkzeug man ansehen
 * möchte. Hier geht es andersherum: man hat etwas in der Hand, lässt es los,
 * und es bleibt liegen, wo man es losgelassen hat — samt der Lage, in der man
 * es gehalten hat. Justiert wird danach, indem man es wieder anfasst und
 * anders hinlegt.
 *
 * Der Kasten selbst hat **keinen Körper**: er hält nichts auf, er sagt nur, wo
 * die Schwerkraft aufhört. Ein Kasten mit Wänden wäre eine Vitrine, und in
 * eine Vitrine legt man nichts hinein, ohne die Tür zu öffnen. Was er tut,
 * steht in `PortalWorld.floatZone` — hier stehen die Kanten und die Frage
 * *liegt das darin?*.
 *
 * Er ist bewusst als **Kanten plus Hauch** gebaut und nicht als Glaskasten:
 * sechs halbdurchsichtige Flächen vor einem Werkzeug sind sechs Schleier, und
 * beurteilen kann man dahinter nichts mehr. Die Kanten sagen, wo er ist, die
 * Flächen bei 6 % sagen, dass er ein Volumen ist.
 */
export class HoverBox extends THREE.Group {
  private readonly faces: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
  private readonly edges: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  private occupied = false;
  private fixed = false;

  constructor(readonly size: number) {
    super();
    this.name = 'hover-box';

    const box = new THREE.BoxGeometry(size, size, size);
    this.faces = new THREE.Mesh(
      box,
      new THREE.MeshBasicMaterial({
        color: GRAB_TINT,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
        // Kein Tiefenschreiben: was darin hängt, soll man ansehen können, und
        // eine Fläche, die sich in den Tiefenpuffer einträgt, schneidet
        // ausgerechnet das weg.
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.add(this.faces);

    this.edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(box),
      new THREE.LineBasicMaterial({ color: GRAB_TINT, transparent: true, opacity: 0.8 }),
    );
    this.add(this.edges);
  }

  /**
   * Ob dieser Punkt im Kasten liegt — in dessen eigenem Raum gerechnet, damit
   * ein verschobener oder gedrehter Poseraum nichts daran ändert.
   */
  contains(worldPoint: THREE.Vector3): boolean {
    this.updateWorldMatrix(true, false);
    _local.copy(worldPoint).applyMatrix4(_inverse.copy(this.matrixWorld).invert());
    const half = this.size / 2;
    return Math.abs(_local.x) <= half && Math.abs(_local.y) <= half && Math.abs(_local.z) <= half;
  }

  /**
   * Er leuchtet, solange etwas darin hängt.
   *
   * Ein leerer Kasten aus vier dünnen Linien ist in einem hellen Gang leicht zu
   * übersehen; ein voller soll dagegen sagen, dass er gerade wirkt — sonst
   * hält man ein Werkzeug, das ruhig in der Luft steht, für einen Fehler.
   */
  setOccupied(occupied: boolean): void {
    if (occupied === this.occupied) return;
    this.occupied = occupied;
    this.paint();
  }

  /**
   * Und er wechselt die Farbe, wenn der Schalter ihn **feststellt**.
   *
   * Ein Kasten, in dem sich nichts mehr bewegt, sieht aus wie einer, in dem
   * sich gerade nichts bewegt — den Unterschied muss er sagen, sonst hält man
   * beim nächsten Mal die gesperrte Hand für einen Fehler
   * (`PortalWorld.setFloatFixed`).
   */
  setFixed(fixed: boolean): void {
    if (fixed === this.fixed) return;
    this.fixed = fixed;
    this.paint();
  }

  private paint(): void {
    const color = this.fixed ? FIXED_TINT : this.occupied ? GRAB_GLOW : GRAB_TINT;
    this.faces.material.color.setHex(color);
    this.faces.material.opacity = this.fixed ? 0.14 : this.occupied ? 0.1 : 0.06;
    this.edges.material.color.setHex(color);
    this.edges.material.opacity = this.fixed ? 1 : 0.8;
  }

  dispose(): void {
    this.faces.geometry.dispose();
    this.faces.material.dispose();
    this.edges.geometry.dispose();
    this.edges.material.dispose();
    this.removeFromParent();
  }
}
