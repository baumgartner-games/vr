import * as THREE from 'three';
import { TextPlane } from '../../ui/TextPlane';
import { GRAB_GLOW, GRAB_TINT } from '../../core/colors';

/**
 * **Die Palette** — woraus man aussucht, was man baut, und der Pinsel, mit dem
 * man es aufträgt.
 *
 * Die Frage dahinter kam aus dem Bauplatz und lautete: *Wie sucht man in der
 * Brille ein Bauteil aus?* Drei Antworten standen zur Wahl.
 *
 * - **Ein Menü.** Das ist die Antwort vom Bildschirm, und sie ist hier die
 *   falscheste von allen: Zwischen Boden und Wand wechselt man zwanzigmal in
 *   der Minute, und dreimal Aufklappen je Wechsel ist die Sorte Bedienung,
 *   nach der man aufhört zu bauen.
 * - **Ein magischer Beutel** (`portal/tools/MagicBagTool.ts`). Der ist im
 *   Werkzeugkasten genau richtig — er gibt *Gegenstände* heraus, einen nach
 *   dem anderen, und was man herausgeholt hat, hat man in der Hand. Beim Bauen
 *   will man aber dasselbe zwanzigmal hintereinander setzen, und dafür wäre er
 *   zwanzigmal aufzumachen.
 * - **Eine Palette mit einem Pinsel.** Man tunkt einmal ein, malt so lange,
 *   wie man will, und legt den Pinsel zurück, wenn man fertig ist. Genau das
 *   ist der Rhythmus eines Kacheleditors, und deshalb steht sie hier.
 *
 * Sie hängt an nichts: Sie schwebt wie das Modell, wird wie das Modell mit
 * einer Hand getragen und läßt sich wie das Modell an eine Hüfte hängen. Wer
 * beide Hände braucht, legt sie eben ab; sie fällt nicht.
 *
 * **Der Pinsel steckt in ihr, solange nichts gewählt ist.** Das ist die eine
 * Rückmeldung, die man ohne Nachdenken liest: Steckt er in der Mulde, baut ein
 * Tipp auf die Miniatur nichts, und man kann darin herumfassen, ohne aus
 * Versehen eine Wand zu setzen. Liegt er in der Hand, trägt er die Farbe
 * dessen, was er gerade aufträgt.
 */

/** Ein Farbnapf: was er auswählt, wie er heißt, in welcher Farbe. */
export interface PaletteDab {
  id: string;
  label: string;
  color: number;
  /**
   * In welcher Reihe er liegt — `0` ist die hinterste.
   *
   * Zwei Reihen, seit es Bausteine gibt: oben die vier Bauwerkzeuge und das
   * Hingehen, darunter das Mobiliar. Alles in einer Reihe wären vierzehn Näpfe
   * nebeneinander, und eine Palette, die breiter ist als ein Unterarm, legt
   * man nicht mehr hin, sondern weg.
   */
  row?: number;
}

/** Halbmesser der Palette, in Metern — quer breiter als tief, wie ein Brett. */
const BOARD_X = 0.175;
const BOARD_Z = 0.105;
const BOARD_T = 0.012;

/** Ein Farbnapf: Halbmesser und wie hoch er über dem Brett steht. */
const DAB_R = 0.015;
const DAB_Y = BOARD_T / 2 + 0.004;
/** Wie weit die Näpfe auseinanderstehen. */
const DAB_GAP = 0.036;
/** Und wie weit hinten die erste Reihe liegt — vorn bleibt Platz für die Mulde. */
const DAB_Z = -0.062;
/** Der Abstand zwischen zwei Reihen. */
const ROW_GAP = 0.038;

/** Die Mulde, in der der Pinsel steckt. */
const REST_Z = 0.055;
const REST_R = 0.02;

/**
 * Wie lang der Pinsel ist und wie dick sein Stiel — klein genug, dass er in
 * einer Faust verschwindet, groß genug, dass man seine Farbe sieht.
 */
const BRUSH_LENGTH = 0.14;
const BRUSH_R = 0.005;

export class Palette extends THREE.Group {
  /** Die Näpfe und die Mulde, in der Reihenfolge, in der sie stehen. */
  private readonly pads: { id: string; mesh: THREE.Mesh; base: THREE.Vector3 }[] = [];
  private readonly label: TextPlane;
  private labelled = '';
  /** Der Pinsel — er steckt in der Mulde oder liegt in einer Hand. */
  readonly brush: THREE.Group;
  private readonly bristles: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly rest = new THREE.Vector3(0, DAB_Y, REST_Z);

  /** Die Kennung der Mulde — dort landet der Pinsel wieder. */
  static readonly REST = 'rest';

  constructor(dabs: readonly PaletteDab[]) {
    super();
    this.name = 'editor-palette';

    const board = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, BOARD_T, 32),
      new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.8, metalness: 0.06 }),
    );
    board.scale.set(BOARD_X, 1, BOARD_Z);
    this.add(board);

    // Ein Rand aus Greiffarbe: Er sagt, dass man das Brett anfassen darf —
    // dieselbe Antwort auf dieselbe Frage wie an jedem Griff des Projekts.
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.012, 8, 40),
      new THREE.MeshStandardMaterial({
        color: GRAB_TINT,
        roughness: 0.6,
        emissive: new THREE.Color(GRAB_TINT).multiplyScalar(0.25),
      }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(BOARD_X, BOARD_Z, 1);
    this.add(rim);

    // Je Reihe eigens zentriert: Zwei Reihen unterschiedlicher Länge, die an
    // derselben Kante anfangen, sehen aus wie ein Fehler.
    const rows = new Map<number, PaletteDab[]>();
    for (const dab of dabs) {
      const row = dab.row ?? 0;
      const list = rows.get(row) ?? [];
      list.push(dab);
      rows.set(row, list);
    }
    const place = new Map<PaletteDab, { x: number; z: number }>();
    for (const [row, list] of rows) {
      const span = (list.length - 1) * DAB_GAP;
      list.forEach((dab, index) => {
        place.set(dab, { x: -span / 2 + index * DAB_GAP, z: DAB_Z + row * ROW_GAP });
      });
    }

    dabs.forEach((dab) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(DAB_R, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
          color: dab.color,
          roughness: 0.35,
          emissive: new THREE.Color(dab.color),
          emissiveIntensity: 0,
        }),
      );
      // Ein Klecks Farbe ist flach, keine Kugel: eine halbe Kugel, plattgedrückt.
      mesh.scale.set(1, 0.45, 1);
      const at = place.get(dab)!;
      mesh.position.set(at.x, DAB_Y, at.z);
      mesh.name = `palette-dab:${dab.id}`;
      this.add(mesh);
      this.pads.push({ id: dab.id, mesh, base: mesh.position.clone() });
    });

    // Die Mulde: ein Ring, in dem der Pinsel steckt. Ein Loch im Brett wäre
    // hübscher und in der Brille nicht zu treffen.
    const rest = new THREE.Mesh(
      new THREE.TorusGeometry(REST_R, 0.005, 8, 24),
      new THREE.MeshStandardMaterial({
        color: 0x8892a6,
        roughness: 0.5,
        emissive: new THREE.Color(0x8892a6),
        emissiveIntensity: 0,
      }),
    );
    rest.rotation.x = -Math.PI / 2;
    rest.position.copy(this.rest);
    rest.name = 'palette-dab:rest';
    this.add(rest);
    this.pads.push({ id: Palette.REST, mesh: rest, base: rest.position.clone() });

    this.label = new TextPlane({
      width: 0.15,
      height: 0.038,
      title: '',
      align: 'center',
      accent: GRAB_TINT,
    });
    // Flach auf dem Brett, vor der Mulde: Wer auf die Palette schaut, liest
    // mit, was der Pinsel gerade trägt.
    this.label.rotation.x = -Math.PI / 2;
    this.label.position.set(0, BOARD_T / 2 + 0.001, REST_Z + 0.035);
    this.add(this.label);

    const [brush, bristles] = buildBrush();
    this.brush = brush;
    this.bristles = bristles;
    this.add(brush);
    this.stow();
  }

  /** Die Näpfe, so wie der Zeiger sie braucht. */
  keys(): readonly { id: string; mesh: THREE.Object3D }[] {
    return this.pads.map((pad) => ({ id: pad.id, mesh: pad.mesh }));
  }

  /**
   * Was der Pinsel trägt — `null` heißt: er steckt in der Mulde.
   *
   * Der gewählte Napf steht höher und leuchtet; die anderen liegen flach. Zwei
   * Rückmeldungen für dasselbe, und beide braucht es: Das Leuchten sieht man
   * aus dem Augenwinkel, den Überstand auch von der Seite.
   */
  setActive(id: string | null, label: string, color: number): void {
    for (const pad of this.pads) {
      const on = pad.id === id;
      const material = pad.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = on ? 0.9 : 0;
      pad.mesh.position.y = pad.base.y + (on ? 0.006 : 0);
    }
    this.bristles.material.color.setHex(id ? color : 0x8892a6);
    this.bristles.material.emissive.setHex(id ? color : 0x000000);
    this.bristles.material.emissiveIntensity = id ? 0.5 : 0;
    if (this.labelled !== label) {
      this.labelled = label;
      this.label.setText(label);
    }
  }

  /** Der Pinsel zurück in die Mulde — aufrecht, wie man ihn hineinstellt. */
  stow(): void {
    this.add(this.brush);
    this.brush.position.copy(this.rest);
    this.brush.quaternion.identity();
  }

  /**
   * Der Pinsel in eine Hand: Er hängt ab jetzt an ihr und wird dort gestellt,
   * wo sie ist (`EditorWorld`). Die Palette gibt ihn nur her.
   */
  release(into: THREE.Object3D): void {
    into.add(this.brush);
  }

  dispose(): void {
    this.label.dispose();
    this.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[];
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material?.dispose();
    });
    this.brush.removeFromParent();
    this.removeFromParent();
  }
}

/**
 * Der Pinsel: Stiel, Zwinge, Haar — und das Haar trägt die Farbe.
 *
 * Er zeigt entlang **−Z**, wie alles in diesem Projekt, was in einer Hand auf
 * etwas zeigt (`portal/tools/aim.ts`). Damit liegt er in der Faust wie jedes
 * Werkzeug, ohne dass jemand ihn eigens einmessen muss.
 */
function buildBrush(): [THREE.Group, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>] {
  const brush = new THREE.Group();
  brush.name = 'editor-brush';

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(BRUSH_R * 0.8, BRUSH_R, BRUSH_LENGTH * 0.7, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.7 }),
  );
  shaft.rotation.x = -Math.PI / 2;
  shaft.position.z = BRUSH_LENGTH * 0.15;
  brush.add(shaft);

  const ferrule = new THREE.Mesh(
    new THREE.CylinderGeometry(BRUSH_R * 1.2, BRUSH_R * 1.2, 0.014, 12),
    new THREE.MeshStandardMaterial({ color: 0xb9c2d4, roughness: 0.3, metalness: 0.7 }),
  );
  ferrule.rotation.x = -Math.PI / 2;
  ferrule.position.z = -BRUSH_LENGTH * 0.24;
  brush.add(ferrule);

  const bristles = new THREE.Mesh(
    new THREE.ConeGeometry(BRUSH_R * 1.5, BRUSH_LENGTH * 0.28, 12),
    new THREE.MeshStandardMaterial({ color: 0x8892a6, roughness: 0.5, toneMapped: false }),
  );
  // Die Spitze nach vorn: Dort landet die Farbe, und dorthin schaut man beim
  // Zielen.
  bristles.rotation.x = -Math.PI / 2;
  bristles.position.z = -BRUSH_LENGTH * 0.38;
  brush.add(bristles);

  // Ein Tropfen Greiffarbe am Stielende: Auch hier gilt, dass man einem Klotz
  // aus Dreiecken nicht ansieht, wo man ihn anfasst.
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(BRUSH_R * 1.1, 12, 8),
    new THREE.MeshStandardMaterial({
      color: GRAB_GLOW,
      roughness: 0.5,
      emissive: new THREE.Color(GRAB_GLOW).multiplyScalar(0.3),
    }),
  );
  cap.position.z = BRUSH_LENGTH * 0.5;
  brush.add(cap);

  return [brush, bristles];
}
