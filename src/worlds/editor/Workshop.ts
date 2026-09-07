import * as THREE from 'three';
import { TextPlane } from '../../ui/TextPlane';
import { GRAB_TINT } from '../../core/colors';
import { createPropShape, type PropKind } from '../portal/props';
import { PLACEABLE } from './planProps';

/**
 * **Der Konstruktraum** — die Werkstatt, in der der Grundriss auf dem Tisch
 * steht.
 *
 * Vorher gab es dafür einen Trick: Wer die Karte zog, blieb in seinem Level
 * stehen, und das Level wurde unsichtbar und durchlässig — ein *weißer Raum*
 * an derselben Stelle. Das hatte einen Fehler, den man erst merkt, wenn man
 * darin arbeitet: Man stand nicht **außerhalb** seines Levels, sondern
 * mittendrin, nur mit geschlossenen Augen. Jeder Schritt vor dem Modell war
 * gleichzeitig ein Schritt im Level; wer zwei Meter zurückging, um die Karte
 * ganz zu sehen, stand beim Weglegen in der Wand dahinter.
 *
 * Jetzt ist es wirklich ein anderer Ort — ein Zimmer weit weg von jedem
 * Grundriss, in das man **hineingeht**. Was einen mit dem Level verbindet, ist
 * nur noch eine **Marke**: die Stelle, an der man es verlassen hat und an der
 * man wieder steht, wenn man zurückgeht. Sie steht als Figur in der Miniatur,
 * und man versetzt sie dort, statt sich selbst zu versetzen.
 *
 * Eingerichtet ist er wie eine Werkstatt und nicht wie ein Menü:
 *
 * - Eine **Werkbank** in der Mitte. Darüber schwebt das Modell; darauf legt
 *   man ab, was man gerade nicht in der Hand hat. Ein Grundriss, der frei im
 *   Raum hängt, hat keine Höhe, die sich von selbst versteht — ein Tisch hat
 *   eine.
 * - Ein **Regal** an der Wand, drei Bretter, und darauf steht **je ein
 *   Musterstück** von allem, was man in den Grundriss setzen kann. Das Regal
 *   ist damit nicht Möbel, sondern der Katalog: Man nimmt einen Klotz vom
 *   Brett, sieht ihn in der Hand in der Größe, die er in der Miniatur hätte,
 *   und setzt ihn hinein. Ein Menü mit achtzehn Zeilen hätte dasselbe
 *   behauptet und nichts davon gezeigt.
 * - Ein **Ausgangsknopf** neben der Werkbank. Man kommt auch mit der Karte
 *   wieder hinaus (Trigger), aber ein Raum, den man nur mit dem richtigen
 *   Gegenstand in der Hand verlassen kann, ist eine Falle.
 *
 * Er steht `AT` weit weg vom Ursprung, und das ist die ganze Trennung: Kein
 * Grundriss reicht so weit, und damit gibt es keine Kachel, keine Wand und
 * keinen Körper, der beides gleichzeitig ist.
 */

/** Wo die Werkstatt steht — weit genug weg von jedem Grundriss. */
export const WORKSHOP_AT = new THREE.Vector3(0, 0, -420);

/** Innenmaße des Zimmers. */
export const ROOM = { halfX: 3.6, halfZ: 2.8, height: 3, wall: 0.2 };

/**
 * Die Höhe des Bodens, auf dem hier gestanden wird.
 *
 * Dieselben zwei Zentimeter unter null wie die Fläche bis zum Horizont im
 * Bauplatz (`EditorWorld.horizonColor`): Sie ist es, die den Spieler trägt,
 * und die Werkstatt legt ihr Blech genau darauf.
 */
export const FLOOR_Y = -0.02;

/** Die Werkbank: Mitte, Maße und Höhe der Platte. */
export const BENCH = { x: 0, z: -0.55, w: 2.4, d: 0.9, top: 0.95 };

/** Wo man steht, wenn man hereinkommt — vor der Bank, mit Blick auf sie. */
export const WORKSHOP_SPAWN = new THREE.Vector3(
  WORKSHOP_AT.x + BENCH.x,
  WORKSHOP_AT.y,
  WORKSHOP_AT.z + BENCH.z + 1.35,
);

/** Und wohin man dabei schaut: nach hinten, auf die Bank. */
export const WORKSHOP_YAW = 0;

/** Wo das Modell schwebt, wenn niemand es hält — eine Handbreit über der Bank. */
export const MODEL_OVER = new THREE.Vector3(
  WORKSHOP_AT.x + BENCH.x,
  BENCH.top + 0.32,
  WORKSHOP_AT.z + BENCH.z,
);

/** Was gebaut wurde und was der Zeiger davon braucht. */
export interface WorkshopParts {
  root: THREE.Group;
  /**
   * Boden, Decke und die vier Wände.
   *
   * Sie werden von außen bei der Physik angemeldet (`EditorWorld`), und das
   * ist keine Kleinigkeit: Ein Zimmer ohne Körper ist eine Kulisse, aus der
   * man beim ersten Schritt zur Seite herausläuft — hinaus in die Fläche bis
   * zum Horizont, vierhundert Meter von allem entfernt, was man sehen wollte.
   */
  walls: readonly THREE.Mesh[];
  /** Der Knopf, der wieder ins Level führt. */
  exit: THREE.Mesh;
  /** Die Musterstücke auf dem Regal — je eines je Sorte, zum Anzeigen. */
  samples: readonly { kind: PropKind; object: THREE.Object3D }[];
}

const WALL = new THREE.MeshStandardMaterial({ color: 0x2b3346, roughness: 0.9 });
const FLOOR = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.95 });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.75 });
const STEEL = new THREE.MeshStandardMaterial({
  color: 0x9aa3b5,
  roughness: 0.45,
  metalness: 0.4,
});

/**
 * Das ganze Zimmer, an einem Stück.
 *
 * Körper bekommen nur **Wände, Boden und Decke** (`WorkshopParts.walls`) —
 * angemeldet wird von außen, denn diese Datei kennt keine Physik. Alles
 * andere ist Kulisse: Eine Werkbank, an der man hängenbleibt, wäre eine, um
 * die man herumginge, statt an ihr zu arbeiten.
 */
export function buildWorkshop(): WorkshopParts {
  const root = new THREE.Group();
  root.name = 'workshop';
  root.position.copy(WORKSHOP_AT);

  const walls: THREE.Mesh[] = [];
  const shell = (
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    material: THREE.Material,
  ): void => {
    walls.push(slab(root, material, size, at));
  };

  const { halfX, halfZ, height, wall } = ROOM;
  // **Der Boden liegt auf `FLOOR_Y` und nicht auf null**: Dort liegt die
  // Fläche bis zum Horizont, auf der der Spieler in dieser Welt wirklich
  // steht (`EditorWorld.buildEnvironment`), und die Werkstatt hat keine
  // eigenen Körper. Zwei Zentimeter Unterschied wären zwei Zentimeter, die
  // der Spieler im Blech steckt.
  shell([halfX * 2, wall, halfZ * 2], [0, FLOOR_Y - wall / 2, 0], FLOOR);
  shell([halfX * 2, wall, halfZ * 2], [0, height + wall / 2, 0], WALL);
  shell([halfX * 2, height, wall], [0, height / 2, -halfZ - wall / 2], WALL);
  shell([halfX * 2, height, wall], [0, height / 2, halfZ + wall / 2], WALL);
  shell([wall, height, halfZ * 2], [-halfX - wall / 2, height / 2, 0], WALL);
  shell([wall, height, halfZ * 2], [halfX + wall / 2, height / 2, 0], WALL);

  const lamp = new THREE.PointLight(0xf4f7ff, 18, 18, 2);
  lamp.position.set(0, height - 0.6, 0);
  root.add(lamp);
  root.add(new THREE.AmbientLight(0x8ea0c0, 0.6));

  buildBench(root);
  const samples = buildShelf(root);
  const exit = buildExit(root);

  const sign = new TextPlane({
    width: 2.2,
    height: 0.66,
    title: 'Konstruktraum',
    body: 'Der Grundriss steht auf der Bank. Die Figur darin ist die Stelle, an der du wieder auftauchst — versetze sie, statt selbst zu laufen.',
    accent: 0x39d0ff,
  });
  sign.position.set(0, 2.1, -halfZ + 0.02);
  root.add(sign);

  return { root, walls, exit, samples };
}

/** Die Werkbank: eine Platte auf vier Beinen, mit einer Leiste als Kante. */
function buildBench(root: THREE.Group): void {
  const t = 0.06;
  slab(root, WOOD, [BENCH.w, t, BENCH.d], [BENCH.x, BENCH.top - t / 2, BENCH.z]);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      slab(
        root,
        STEEL,
        [0.06, BENCH.top - t, 0.06],
        [
          BENCH.x + sx * (BENCH.w / 2 - 0.1),
          (BENCH.top - t) / 2,
          BENCH.z + sz * (BENCH.d / 2 - 0.1),
        ],
      );
    }
  }
  // Eine Leiste an der Vorderkante: Was auf einer Bank liegt, rollt sonst
  // herunter, und ein Klotz auf dem Boden ist ein Klotz, den man sucht.
  slab(root, STEEL, [BENCH.w, 0.03, 0.02], [BENCH.x, BENCH.top + 0.015, BENCH.z + BENCH.d / 2]);
}

/**
 * **Das Regal an der Rückwand** — drei Bretter, und darauf der Katalog.
 *
 * Jede Sorte steht einmal da, und zwar als das Ding selbst und nicht als
 * Symbol: Wer eine Rampe sucht, sucht eine Rampe und keinen Namen. Die Stücke
 * sind auf eine gemeinsame Größe gebracht (`CELL`), damit die Murmel neben dem
 * Spiegel nicht verschwindet — was sie in Wirklichkeit messen, sieht man
 * spätestens, wenn man eines in die Hand nimmt.
 *
 * Sie haben keinen Körper in der Physik: Ein Regal, das man umwerfen kann, ist
 * ein Regal, das man wieder einräumt.
 */
function buildShelf(root: THREE.Group): { kind: PropKind; object: THREE.Object3D }[] {
  const z = -ROOM.halfZ + 0.16;
  const width = 2.6;
  const boards = [0.55, 1.05, 1.55];
  for (const y of boards) slab(root, WOOD, [width, 0.04, 0.28], [0, y, z]);
  for (const sx of [-1, 1]) {
    slab(root, WOOD, [0.05, 1.6, 0.28], [sx * (width / 2 - 0.025), 0.8, z]);
  }

  /** Wie groß ein Musterstück auf dem Brett höchstens wird, in Metern. */
  const CELL = 0.2;
  const perBoard = Math.ceil(PLACEABLE.length / boards.length);
  const step = (width - 0.2) / perBoard;

  const samples: { kind: PropKind; object: THREE.Object3D }[] = [];
  PLACEABLE.forEach((kind, index) => {
    const board = Math.min(boards.length - 1, Math.floor(index / perBoard));
    const column = index - board * perBoard;
    const blueprint = createPropShape(kind);
    const half = blueprint.halfExtents;
    const biggest = Math.max(half.x, half.y, half.z) * 2;
    const scale = biggest > 0 ? Math.min(1, CELL / biggest) : 1;

    const stand = new THREE.Group();
    stand.name = `workshop-sample:${kind}`;
    stand.add(blueprint.mesh);
    stand.scale.setScalar(scale);
    stand.position.set(
      -width / 2 + 0.1 + step * (column + 0.5),
      boards[board]! + 0.02 + half.y * scale,
      z,
    );
    root.add(stand);
    samples.push({ kind, object: stand });
  });
  return samples;
}

/**
 * **Der Ausgang** — ein Knopf, kein Menüpunkt.
 *
 * Er steht auf einem Pfosten neben der Bank, in Reichweite dessen, der davor
 * arbeitet: Man legt weg, was man in der Hand hat, und drückt. Grün, weil das
 * die Farbe dessen ist, was einen irgendwohin bringt (die Farbe des
 * Hingehens im Bauplatz).
 */
function buildExit(root: THREE.Group): THREE.Mesh {
  const x = BENCH.x + BENCH.w / 2 + 0.55;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.05, 12), STEEL);
  post.position.set(x, 0.525, BENCH.z);
  root.add(post);

  const button = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.05, 24),
    new THREE.MeshStandardMaterial({
      color: 0x5ee0a0,
      roughness: 0.4,
      emissive: new THREE.Color(0x5ee0a0),
      emissiveIntensity: 0.55,
    }),
  );
  button.position.set(x, 1.07, BENCH.z);
  button.name = 'workshop-exit';
  root.add(button);

  const label = new TextPlane({
    width: 0.5,
    height: 0.14,
    title: 'Zurück ins Level',
    align: 'center',
    accent: 0x5ee0a0,
  });
  label.position.set(x, 1.28, BENCH.z);
  root.add(label);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.008, 8, 32),
    new THREE.MeshStandardMaterial({
      color: GRAB_TINT,
      roughness: 0.6,
      emissive: new THREE.Color(GRAB_TINT).multiplyScalar(0.3),
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 1.045, BENCH.z);
  root.add(ring);

  return button;
}

function slab(
  root: THREE.Group,
  material: THREE.Material,
  size: readonly [number, number, number],
  at: readonly [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(at[0], at[1], at[2]);
  root.add(mesh);
  return mesh;
}
