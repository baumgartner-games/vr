import * as THREE from 'three';
import { DICE, createDie, type DieKind } from './dice';
import type { ColliderShape } from '../../physics/PhysicsWorld';
import type { MenuIcon } from '../../ui/menu';
import { BODY_RADIUS, BOTTLE_HEIGHT, CHAMPAGNE_GRIP, buildChampagne } from './champagne';
import { MIRROR_DEPTH, MIRROR_HEIGHT, MIRROR_WIDTH, buildStandingMirror } from './standingMirror';
import { BLANKET_SIZE, buildHeatedBlanket } from './heatedBlanket';
import type { PropGrip } from './propGrip';
import { humanLabel } from '../../core/kaykitIndex';
import { WALL_LONG, wallAxis } from './gridSnap';

/** Everything the magic bag can conjure. The name travels over the network. */
export type BagKind =
  | 'cube'
  | 'domino'
  | 'sphere'
  | 'pyramid'
  | 'plank'
  | 'block'
  | 'cylinder'
  | 'cone'
  | 'ramp'
  | 'rod'
  | 'marble'
  | 'champagne'
  | 'mirror'
  | 'blanket'
  | DieKind;

/**
 * **Ein Ding, das aus einer Datei kommt** — `model:<pfad>`, mit dem Pfad im
 * Regal (`core/kaykitIndex.ts`, `kaykitPath`).
 *
 * Alles im Beutel ist eine Sorte, aus der beide Seiten einer Sitzung dasselbe
 * bauen. Ein Modell aus dem Regal ist das auch — nur ist seine „Sorte" der
 * Pfad selbst: Wer ihn hat, kann die Datei laden und bekommt dasselbe Fass
 * wie der andere. Damit reist ein geholtes Modell über **dieselbe** Nachricht
 * wie ein Würfel (`PortalSync`, `spawn`), ohne ein zweites Feld und ohne ein
 * zweites Protokoll — der Duplizierer und der Inspektor bekommen es gratis
 * mit, weil sie ohnehin nur die Sorte lesen.
 */
export type ModelKind = `model:${string}`;

/** Was an einem Körper stehen kann: aus dem Beutel oder aus dem Regal. */
export type PropKind = BagKind | ModelKind;

/** Die Sorte zu einem Pfad im Regal. */
export function modelKind(path: string): ModelKind {
  return `model:${path}`;
}

/** Der Pfad hinter einer Sorte — `null` für alles aus dem Beutel. */
export function modelPathOf(kind: PropKind | null | undefined): string | null {
  return typeof kind === 'string' && kind.startsWith('model:') ? kind.slice('model:'.length) : null;
}

/**
 * Was der magische Beutel anbietet, in der Reihenfolge, in der das Raster es
 * zeigt — Sorte, Beschriftung, Symbol. Hier und nicht in der Welt, weil die
 * Werkzeugseite dieselbe Liste liest: ein Objekt, das es im Beutel gibt, gibt
 * es damit auch auf dem Telefon, ohne dass jemand zwei Listen pflegt.
 *
 * Die Reihenfolge ist die einer Werkstatt: erst die Bauklötze, dann das, was
 * sich bewegt — Kegel, Rampe, Stab, Murmel —, und am Ende der **Würfelsatz**.
 * Die fünf platonischen Körper stehen bewusst beieinander: sie sind ein Satz
 * und kein Sortiment, und wer den W20 sucht, sucht ihn neben dem W12.
 */
export const BAG_ITEMS: ReadonlyArray<readonly [BagKind, string, MenuIcon]> = [
  ['cube', 'Cube', 'cube'],
  ['sphere', 'Kugel', 'sphere'],
  ['domino', 'Domino', 'domino'],
  ['pyramid', 'Pyramide', 'pyramid'],
  ['block', 'Quader', 'gizmo'],
  ['plank', 'Planke', 'plank'],
  ['cylinder', 'Zylinder', 'cylinder'],
  ['cone', 'Kegel', 'cone'],
  ['ramp', 'Rampe', 'ramp'],
  ['rod', 'Stab', 'rod'],
  ['marble', 'Murmel', 'marble'],
  ['champagne', 'Sekt', 'bottle'],
  // Der Standspiegel: das einzige Ding im Beutel, das man nicht umwirft,
  // sondern hinstellt und sich davorstellt (`standingMirror.ts`).
  ['mirror', 'Spiegel', 'mirror-stand'],
  // Die Heizdecke: das Ding, das man jemandem abnimmt — die erste Aktion, die
  // ein übernommener NPC gelernt hat (`heatedBlanket.ts`).
  ['blanket', 'Heizdecke', 'blanket'],
  ['d4', 'W4', 'd4'],
  ['d6', 'W6', 'd6'],
  ['d8', 'W8', 'd8'],
  ['d12', 'W12', 'd12'],
  ['d20', 'W20', 'd20'],
];

/**
 * Wie ein Objekt heißt — ohne dass dafür eines gebaut werden muss.
 *
 * Der Beutel meldet beim Herbeirufen den Namen, der Inspektor liest ihn ab, und
 * die Miniatur im Beutel trägt ihn beim Darüberfahren. Das über
 * `createPropShape` zu holen hieße: eine Geometrie, ein Material und beim
 * Würfel eine Textur bauen, um eine Zeichenkette zu lesen.
 */
export const PROP_LABELS: Record<BagKind, string> = {
  cube: 'Companion Cube',
  domino: 'Domino',
  sphere: 'Kugel',
  pyramid: 'Pyramide',
  plank: 'Planke',
  block: 'Quader',
  cylinder: 'Zylinder',
  cone: 'Kegel',
  ramp: 'Rampe',
  rod: 'Stab',
  marble: 'Murmel',
  champagne: 'Sektflasche',
  mirror: 'Standspiegel',
  blanket: 'Heizdecke',
  d4: DICE.d4.label,
  d6: DICE.d6.label,
  d8: DICE.d8.label,
  d12: DICE.d12.label,
  d20: DICE.d20.label,
};

/** Weighted Companion Cube — canvas texture, no asset download. */
export function createCompanionCube(size = 0.5): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c9d2e0';
  ctx.fillRect(0, 0, 256, 256);

  // Corner plates
  ctx.fillStyle = '#7f8ea6';
  const plate = 44;
  for (const [x, y] of [
    [0, 0],
    [256 - plate, 0],
    [0, 256 - plate],
    [256 - plate, 256 - plate],
  ] as const) {
    ctx.fillRect(x, y, plate, plate);
  }

  ctx.strokeStyle = '#6b7a92';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 248);

  // Centre disc with a heart
  ctx.beginPath();
  ctx.arc(128, 128, 62, 0, Math.PI * 2);
  ctx.fillStyle = '#eef2f8';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#7f8ea6';
  ctx.stroke();

  ctx.fillStyle = '#ff6ea3';
  ctx.beginPath();
  ctx.moveTo(128, 168);
  ctx.bezierCurveTo(74, 132, 88, 86, 128, 108);
  ctx.bezierCurveTo(168, 86, 182, 132, 128, 168);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.2 }),
  );
  cube.name = 'companion-cube';
  return cube;
}

/** Twice the old size: big enough to line up and knock over with a whole hand. */
export const DOMINO_SIZE = new THREE.Vector3(0.18, 0.36, 0.05);

/** A row of dominoes, ready to be knocked over. */
export function createDominoes(count: number, accent: number): THREE.Mesh[] {
  const geometry = new THREE.BoxGeometry(DOMINO_SIZE.x, DOMINO_SIZE.y, DOMINO_SIZE.z);
  const dominoes: THREE.Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accent).lerp(new THREE.Color(0xffffff), i / count),
      roughness: 0.35,
      metalness: 0.1,
    });
    const domino = new THREE.Mesh(geometry, material);
    domino.name = `domino-${i}`;
    dominoes.push(domino);
  }
  return dominoes;
}

/**
 * Welche Sorten einen **Griff** tragen (`propGrip.ts`) — als Tabelle und nicht
 * nur im Bauplan, weil die Welt beim Zugreifen nur die Sorte eines Dings
 * kennt und dafür keines bauen soll.
 */
export const PROP_GRIPS: Partial<Record<BagKind, PropGrip>> = {
  champagne: CHAMPAGNE_GRIP,
};

/**
 * **Wie ein Ding heißt**, egal woher es kommt.
 *
 * Aus dem Beutel steht der Name in der Tabelle; aus dem Regal steht er im
 * Dateinamen, und `humanLabel` macht daraus dasselbe, was auch im Menü unter
 * der Kachel steht (`core/kaykitIndex.ts`). Zwei Wege, ein Name — die Meldung
 * beim Herbeirufen und die Kachel, aus der es kam, sollen sich nicht
 * widersprechen.
 */
export function propLabel(kind: PropKind): string {
  const path = modelPathOf(kind);
  if (path === null) return PROP_LABELS[kind as BagKind];
  return humanLabel(path.slice(path.lastIndexOf('/') + 1));
}

/**
 * Der **Griff** einer Sorte, wenn sie einen hat (`propGrip.ts`).
 *
 * Ein Modell aus dem Regal hat nie einen: Niemand hat eingemessen, wo man
 * viertausendfünfhundert fremde Dinge anfasst — sie werden angefasst, wo die
 * Hand sie berührt, und das ist für ein Fass auch richtig.
 */
export function propGripOf(kind: PropKind | null | undefined): PropGrip | undefined {
  if (!kind || modelPathOf(kind) !== null) return undefined;
  return PROP_GRIPS[kind as BagKind];
}

/**
 * **Die Physik eines Gegenstands, ohne das Netz davor.**
 *
 * Herausgelöst, weil es zwei Wege zu einem Körper gibt und beide dieselben
 * Zahlen brauchen: der Bauplan aus dem Beutel (`PropBlueprint`) und das
 * geladene Modell aus dem Regal (`ModelBlueprint`). Die Welt baut daraus ihren
 * Körper an genau einer Stelle (`PortalWorld.propBody`).
 */
export interface PropPhysics {
  mass: number;
  shape: ColliderShape;
  /** Half size of the collider, for the grab boxes. */
  halfExtents: THREE.Vector3;
  ccd?: boolean;
  /**
   * Wie sehr es springt. Ohne Angabe nimmt die Welt ihren eigenen, sehr
   * gedämpften Wert — eine Murmel und ein Würfel wollen mehr davon.
   */
  restitution?: number;
}

/** Mesh plus the physics the bag should give it. */
export interface PropBlueprint extends PropPhysics {
  mesh: THREE.Mesh;
  /**
   * Ein **Griff**, wenn das Ding einen hat (`propGrip.ts`): dann rastet es
   * beim Zugreifen damit in die Faust, statt dort zu bleiben, wo die Hand es
   * berührt hat — aufrecht oder über Kopf, je nachdem, wie es gerade lag.
   */
  grip?: PropGrip;
  label: string;
}

/** Ein geladenes Modell plus die Physik, die die Welt ihm gibt. */
export interface ModelBlueprint extends PropPhysics {
  /** Der Knoten, der in die Welt kommt — mit dem Modell darin, mittig. */
  object: THREE.Object3D;
  label: string;
  /**
   * **Wie hoch die Lauffläche über der Mitte liegt**, in Metern — die
   * Oberkante ohne das, was aus einer Falle herausragt (`treadOf`). Ein
   * Bodenstück wird mit genau dieser Höhe bündig in den Boden gelegt
   * (`modelStance.isFloorPiece`, `PortalWorld.sinkFloor`).
   */
  tread: number;
}

const PROP_COLORS: Record<'sphere' | 'pyramid' | 'plank' | 'block' | 'cylinder', number> = {
  sphere: 0xffb35c,
  pyramid: 0x5ee0a0,
  plank: 0xd2a06a,
  block: 0x9d7bff,
  cylinder: 0x4aa8ff,
};

function solid(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.15 });
}

/**
 * **Wie schwer ein Kubikmeter Regal ist**, in Kilogramm.
 *
 * Nachgerechnet am Beutel und nicht geraten: Der Companion Cube ist 32 cm
 * groß und wiegt 4 kg, das sind 122 kg/m³; der Quader (0,44 × 0,22 × 0,28)
 * wiegt 5 kg, das sind 184. Hundertfünfzig liegt dazwischen und macht aus
 * einem Fass von 60 cm rund 32 kg — schwer genug, dass es nicht wegfliegt,
 * wenn man es anstößt, und leicht genug, dass man es werfen kann.
 *
 * Gerechnet wird über die **Bounding-Box** und nicht über das Volumen des
 * Netzes: Ein Zaun ist zum größten Teil Luft, und niemand will einen Zaun,
 * der wie ein Blatt Papier umkippt.
 */
const MODEL_DENSITY = 150;

/** Die Grenzen dafür: nichts wiegt weniger als ein Becher oder mehr als ein Schrank. */
const MODEL_MASS_MIN = 0.3;
const MODEL_MASS_MAX = 60;

/** Ein Collider unter 2 cm ist keiner — dieselbe Grenze wie in der Physik. */
const MODEL_HALF_MIN = 0.01;

/**
 * **Wie weit eine Wand aus dem Regal an jedem Ende übersteht**, in Metern.
 *
 * Gemeldet war: _„bei den KayKit-Wall-Assets … an den Ecken okay, aber bei den
 * geraden Übergängen so eine komische Lücke."_ Nachgemessen an
 * `restaurant-bits/wall`: 4 Quelleinheiten lang, und die senkrechten Enden
 * sind rundum in 45° gefast, 0,1 Quelleinheiten tief — im Spiel (Maßstab 0,5)
 * **5 cm**. Zwei Wände Stoß an Stoß ergeben damit auf jeder Seite eine
 * V-Kerbe, 10 cm breit und 5 cm tief. An einer Ecke überdecken sich die
 * Stücke, dort fällt es nicht auf.
 *
 * Also wird das **Bild** einer Wand an jedem Ende um genau die Fase
 * verlängert: Zwei Nachbarn schieben ihre Fasen ineinander, und die Kerbe ist
 * zu. Der Preis ist bewusst angenommen — _„dann ragt die Wand ggf. leicht auf
 * das nächste Tile, aber damit werde ich wohl leben müssen"_ —: Ein freies
 * Wandende steht 5 cm über seine Fuge hinaus. Der **Körper** bleibt beim
 * gemessenen Maß (`modelPropShape`), damit Einrasten und Kachelzählung
 * (`gridSnap.tileSpan`) dieselben bleiben.
 */
export const WALL_OVERLAP = 0.05;

/**
 * **Ein geladenes Modell als Gegenstand.**
 *
 * Aus dem Beutel kommt jede Sorte mit ihrem eigenen Bauplan — Netz, Masse und
 * Collider von Hand aufeinander abgestimmt. Für viertausendfünfhundert
 * gekaufte Dateien geht das nicht, und es muss auch nicht: Was die Welt über
 * ein fremdes Modell weiß, ist seine **Bounding-Box**, und daraus folgt alles
 * Übrige. Ein Kasten als Collider ist dabei die ehrliche Antwort — eine
 * konvexe Hülle über ein paar tausend Ecken kostet bei jedem Herbeirufen
 * spürbar Zeit, und ein Fass, das sich anfühlt wie eine Kiste, ist immer noch
 * besser als eines, durch das man greift.
 *
 * **Das Modell wird dabei in seine Mitte gerückt.** Der Collider sitzt im
 * Ursprung des Körpers (`physics/PhysicsWorld.ts`, `addBody`); ein Modell, dessen
 * Ursprung unter seinen Füßen liegt — und das ist bei diesen Dateien die Regel
 * —, hinge sonst schief in seinem eigenen Kasten und läge auf dem Boden halb
 * darin.
 */
/**
 * **Durchgänge, durch die man geht** — die Öffnung als Anteil des Stücks
 * (`tools/prototype-variants.mjs`): halbe Breite der Öffnung durch halbe
 * Breite des Stücks, Oberkante der Öffnung durch seine Höhe. Ein Durchgang als
 * voller Kasten war eine Wand mit aufgemaltem Loch — gemeldet: _„Wall_Doorway
 * sollte bei der Bounding Box angepasst werden bzw. dass man durchgehen
 * kann."_
 */
export const MODEL_ARCHES: Readonly<Record<string, { open: number; top: number }>> = {
  'prototype-bits/Wall_Doorway.glb': { open: 0.8, top: 0.75 },
  'prototype-bits/Wall_Doorway_Wide.glb': { open: 0.9, top: 0.75 },
};

export function modelPropShape(
  model: THREE.Object3D,
  label: string,
  path: string | null = null,
): ModelBlueprint {
  const object = new THREE.Group();
  object.name = 'prop-model';
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.isEmpty() ? new THREE.Vector3(0.2, 0.2, 0.2) : box.getSize(new THREE.Vector3());
  if (!box.isEmpty()) {
    const centre = box.getCenter(new THREE.Vector3());
    model.position.sub(centre);
  }
  object.add(stretchWall(model, box.isEmpty() ? null : size));
  const tread = treadOf(model) ?? size.y / 2;

  const halfExtents = size
    .clone()
    .multiplyScalar(0.5)
    .max(new THREE.Vector3(MODEL_HALF_MIN, MODEL_HALF_MIN, MODEL_HALF_MIN));
  const volume = halfExtents.x * halfExtents.y * halfExtents.z * 8;
  const arch = path === null ? undefined : MODEL_ARCHES[path];
  return {
    object,
    mass: THREE.MathUtils.clamp(volume * MODEL_DENSITY, MODEL_MASS_MIN, MODEL_MASS_MAX),
    shape: arch
      ? { kind: 'arch', ...arch, along: halfExtents.x >= halfExtents.z ? 'x' : 'z' }
      : { kind: 'box' },
    halfExtents,
    label,
    tread,
  };
}

/**
 * **Die Oberkante, auf der man geht** — gemessen am schon zentrierten Modell,
 * ohne jeden Knoten, der `spike` im Namen trägt.
 *
 * Eine Stachelfalle (`platformer/…/floor_spikes_trap_…`) ist eine Platte mit
 * Stacheln darauf, und eingelassen wird die **Platte**: Ihre Oberseite gehört
 * auf die Höhe des Bodens, die Stacheln stehen darüber — dieselbe Messung
 * wie beim Stachelfeld der Navigationszone (`worlds/test/zones/navigation.ts`,
 * `plateTop`). Für alles andere ist es schlicht die Oberkante.
 */
function treadOf(model: THREE.Object3D): number | null {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const part = new THREE.Box3();
  const skip = (object: THREE.Object3D | null): boolean => {
    for (let at = object; at && at !== model.parent; at = at.parent) {
      if (/spike/i.test(at.name)) return true;
    }
    return false;
  };
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || skip(mesh)) return;
    part.setFromObject(mesh);
    box.union(part);
  });
  return box.isEmpty() ? null : box.max.y;
}

/**
 * **Eine Wand schließt an ihre Nachbarin an** (`WALL_OVERLAP`) — gestreckt
 * wird nur das Bild, in einer eigenen Gruppe um das schon zentrierte Modell:
 * So geht die Streckung von der Mitte aus und in **Weltachsen**, egal wie das
 * Modell in sich gedreht ist. Was keine Wand ist, kommt unverändert zurück.
 */
function stretchWall(model: THREE.Object3D, size: THREE.Vector3 | null): THREE.Object3D {
  if (!size || size.y < WALL_LONG) return model;
  const across = wallAxis(size.x, size.z);
  if (across === null) return model;
  const along = across === 'x' ? 'z' : 'x';
  const shell = new THREE.Group();
  shell.name = 'wall-overlap';
  shell.scale[along] = (size[along] + 2 * WALL_OVERLAP) / size[along];
  shell.add(model);
  return shell;
}

/**
 * One conjured object. Everything the bag offers goes through here, so the
 * mesh, the collider and the mass can never drift apart — and both sides of a
 * session build the very same thing from the same `kind`.
 */
export function createPropShape(kind: BagKind): PropBlueprint {
  // Der Name kommt aus der Tabelle und nicht aus dem Bauplan: so kann ihn auch
  // ablesen, wer gar nichts bauen will (`PROP_LABELS`).
  return { ...buildProp(kind), label: PROP_LABELS[kind] };
}

function buildProp(kind: BagKind): Omit<PropBlueprint, 'label'> {
  switch (kind) {
    case 'cube':
      return {
        mesh: createCompanionCube(0.32),
        mass: 4,
        shape: { kind: 'box' },
        halfExtents: new THREE.Vector3(0.16, 0.16, 0.16),
      };
    case 'domino': {
      const mesh = createDominoes(1, 0xff3b2f)[0]!;
      return {
        mesh,
        mass: 2,
        shape: { kind: 'box' },
        halfExtents: DOMINO_SIZE.clone().multiplyScalar(0.5),
        ccd: true,
      };
    }
    case 'sphere': {
      const radius = 0.16;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 26, 18),
        solid(PROP_COLORS.sphere),
      );
      mesh.name = 'prop-sphere';
      return {
        mesh,
        mass: 3,
        shape: { kind: 'ball' },
        halfExtents: new THREE.Vector3(radius, radius, radius),
      };
    }
    case 'pyramid': {
      const radius = 0.24;
      const height = 0.36;
      // Four radial segments make a cone a square pyramid.
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 4),
        solid(PROP_COLORS.pyramid),
      );
      mesh.name = 'prop-pyramid';
      return {
        mesh,
        mass: 3,
        shape: { kind: 'cone' },
        halfExtents: new THREE.Vector3(radius, height / 2, radius),
      };
    }
    case 'plank': {
      const size = new THREE.Vector3(0.7, 0.05, 0.18);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        solid(PROP_COLORS.plank),
      );
      mesh.name = 'prop-plank';
      return {
        mesh,
        mass: 2,
        shape: { kind: 'box' },
        halfExtents: size.clone().multiplyScalar(0.5),
      };
    }
    case 'block': {
      const size = new THREE.Vector3(0.44, 0.22, 0.28);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        solid(PROP_COLORS.block),
      );
      mesh.name = 'prop-block';
      return {
        mesh,
        mass: 5,
        shape: { kind: 'box' },
        halfExtents: size.clone().multiplyScalar(0.5),
      };
    }
    case 'cylinder': {
      const radius = 0.13;
      const height = 0.34;
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, height, 22),
        solid(PROP_COLORS.cylinder),
      );
      mesh.name = 'prop-cylinder';
      return {
        mesh,
        mass: 3,
        shape: { kind: 'cylinder' },
        halfExtents: new THREE.Vector3(radius, height / 2, radius),
      };
    }
    case 'cone': {
      // Der runde Kegel — die Pyramide ist derselbe Körper mit vier Segmenten,
      // und was von beiden man braucht, merkt man beim Umwerfen.
      const radius = 0.15;
      const height = 0.42;
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 26),
        solid(EXTRA_COLORS.cone),
      );
      mesh.name = 'prop-cone';
      return {
        mesh,
        mass: 2.5,
        shape: { kind: 'cone' },
        halfExtents: new THREE.Vector3(radius, height / 2, radius),
      };
    }
    case 'ramp': {
      const size = new THREE.Vector3(0.6, 0.26, 0.34);
      const mesh = new THREE.Mesh(rampGeometry(size), solid(EXTRA_COLORS.ramp));
      mesh.name = 'prop-ramp';
      return {
        mesh,
        mass: 6,
        // Eine Rampe als Kasten wäre keine: die schiefe Ebene *ist* das
        // Objekt, und ein Würfel rollte darüber hinweg statt hinunter.
        shape: { kind: 'hull', points: meshPoints(mesh) },
        halfExtents: size.clone().multiplyScalar(0.5),
      };
    }
    case 'rod': {
      const radius = 0.035;
      const height = 0.9;
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, height, 18),
        new THREE.MeshStandardMaterial({
          color: EXTRA_COLORS.rod,
          roughness: 0.3,
          metalness: 0.7,
        }),
      );
      mesh.name = 'prop-rod';
      return {
        mesh,
        mass: 2.5,
        shape: { kind: 'cylinder' },
        halfExtents: new THREE.Vector3(radius, height / 2, radius),
      };
    }
    case 'marble': {
      const radius = 0.055;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 16),
        new THREE.MeshStandardMaterial({
          color: EXTRA_COLORS.marble,
          roughness: 0.08,
          metalness: 0.35,
        }),
      );
      mesh.name = 'prop-marble';
      return {
        mesh,
        // Klein und schwer: eine Murmel, die wie ein Luftballon wegkullert,
        // ist keine.
        mass: 1.2,
        shape: { kind: 'ball' },
        halfExtents: new THREE.Vector3(radius, radius, radius),
        restitution: 0.45,
        ccd: true,
      };
    }
    case 'champagne': {
      // Der Collider ist der Bauch: ein Zylinder so hoch wie die Flasche. Der
      // Hals ist dünner, aber ein Collider aus zwei Teilen ist für ein Ding,
      // das umfällt und rollt, nicht die Mühe wert.
      const { mesh } = buildChampagne();
      return {
        mesh,
        mass: 1.4,
        shape: { kind: 'cylinder' },
        halfExtents: new THREE.Vector3(BODY_RADIUS, BOTTLE_HEIGHT / 2, BODY_RADIUS),
        grip: CHAMPAGNE_GRIP,
      };
    }
    case 'mirror': {
      // Der Collider ist der ganze Kasten, in dem er steht — Fuß, Pfosten und
      // Rahmen zusammen. Ein Collider nur um den Rahmen fiele bei der
      // leisesten Berührung um, und ein Standspiegel, der nicht steht, ist
      // keiner.
      return {
        mesh: buildStandingMirror(),
        mass: 14,
        shape: { kind: 'box' },
        halfExtents: new THREE.Vector3(MIRROR_WIDTH, MIRROR_HEIGHT, MIRROR_DEPTH).multiplyScalar(
          0.5,
        ),
      };
    }
    case 'blanket': {
      // Eine gefaltete Decke: leicht, flach, und mit CCD, damit sie beim
      // Wegziehen nicht durch die Puppe oder den Tisch fällt.
      return {
        mesh: buildHeatedBlanket(),
        mass: 1.6,
        shape: { kind: 'box' },
        halfExtents: BLANKET_SIZE.clone().multiplyScalar(0.5),
        ccd: true,
      };
    }
    case 'd4':
    case 'd6':
    case 'd8':
    case 'd12':
    case 'd20': {
      const mesh = createDie(kind);
      const radius = DICE[kind].radius;
      return {
        mesh,
        mass: DICE[kind].mass,
        // Der W6 ist ein Kasten und braucht keine Hülle; die anderen vier
        // schon, sonst rollen sie wie Kugeln (`dice.ts`).
        shape: kind === 'd6' ? { kind: 'box' } : { kind: 'hull', points: meshPoints(mesh) },
        halfExtents:
          kind === 'd6'
            ? new THREE.Vector3(1, 1, 1).multiplyScalar(radius / Math.sqrt(3))
            : new THREE.Vector3(radius, radius, radius),
        restitution: 0.28,
      };
    }
  }
}

/** Die Farben der Nachzügler — dieselbe Sättigung wie die der ersten sieben. */
const EXTRA_COLORS = {
  cone: 0xff8a5c,
  ramp: 0x7fd4c1,
  rod: 0xb9c4d6,
  marble: 0x6fe3ff,
} as const;

/**
 * Ein Keil: das Dreieck von der Seite, in die Breite gezogen.
 *
 * `ExtrudeGeometry` legt das Profil in die XY-Ebene und zieht es entlang Z —
 * das passt hier von selbst: lang in X, hoch in Y, breit in Z. Zentriert wird
 * trotzdem, denn das Profil beginnt in einer Ecke, und ein Objekt, dessen
 * Ursprung in seiner Ecke sitzt, dreht sich in der Hand um diese Ecke.
 */
function rampGeometry(size: THREE.Vector3): THREE.BufferGeometry {
  const profile = new THREE.Shape();
  profile.moveTo(0, 0);
  profile.lineTo(size.x, 0);
  profile.lineTo(0, size.y);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, { depth: size.z, bevelEnabled: false });
  geometry.center();
  return geometry;
}

/** Die Ecken eines Netzes, wie Rapier sie für eine konvexe Hülle nimmt. */
function meshPoints(mesh: THREE.Mesh): Float32Array {
  return new Float32Array(mesh.geometry.getAttribute('position').array);
}
