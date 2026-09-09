import * as THREE from 'three';
import { PLAN_DOOR_H, PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import { DIRS, TILE, dirX, dirZ } from '../nav/navTile';
import {
  APRON,
  MARKS,
  roomAt,
  roomCode,
  spacesOf,
  tilesOf,
  type HouseRoom,
  type HouseSpec,
  type Rect,
} from './house';
import { ventPairs, type MonsterKind } from './mission';
import { buildFixture } from './fixtureModels';
import { stationLayout, type StationPlacement } from './stationLayout';
import { COMMAND } from './roomGraph';
import { buildSpaceBackdrop } from './world3d/spaceBackdrop';
import { wayfindingSigns, type Signpost } from './world3d/signposts';
import { buildSignMeshes } from './world3d/signMesh';

export const SHIP = {
  hull: 0xb1c5d4,
  dark: 0x182b3d,
  trim: 0x4c667c,
  cyan: 0x6ce6f2,
  amber: 0xffc35f,
  red: 0xe75c61,
  deck: 0x435b70,
};
type Triplet = [number, number, number];
type Shape = 'box' | 'pipe';

/** Room-sized batches keep distant rooms frustum-cullable, including their details. */
export class ShipBatch {
  private readonly parts = new Map<
    string,
    { color: number; glow: boolean; shape: Shape; matrices: THREE.Matrix4[] }
  >();
  box(color: number, size: Triplet, at: Triplet, glow = false, yaw = 0, pitch = 0): void {
    this.add('box', color, size, at, glow, new THREE.Euler(pitch, yaw, 0, 'YXZ'));
  }
  pipe(color: number, radius: number, length: number, at: Triplet, alongX: boolean): void {
    this.add(
      'pipe',
      color,
      [radius, length, radius],
      at,
      false,
      alongX ? new THREE.Euler(0, 0, Math.PI / 2) : new THREE.Euler(Math.PI / 2, 0, 0),
    );
  }
  private add(
    shape: Shape,
    color: number,
    size: Triplet,
    at: Triplet,
    glow: boolean,
    rotation: THREE.Euler,
  ): void {
    const key = `${shape}/${color}/${glow}`;
    let part = this.parts.get(key);
    if (!part) {
      part = { color, glow, shape, matrices: [] };
      this.parts.set(key, part);
    }
    part.matrices.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...at),
        new THREE.Quaternion().setFromEuler(rotation),
        new THREE.Vector3(...size),
      ),
    );
  }
  build(): THREE.Group {
    const group = new THREE.Group();
    for (const part of this.parts.values()) {
      const material = new THREE.MeshStandardMaterial({
        color: part.color,
        roughness: 0.63,
        metalness: 0.18,
        emissive: part.glow ? part.color : 0,
        emissiveIntensity: part.glow ? 0.35 : 0,
      });
      const mesh = new THREE.InstancedMesh(
        part.shape === 'box'
          ? new THREE.BoxGeometry(1, 1, 1)
          : new THREE.CylinderGeometry(1, 1, 1, 8),
        material,
        part.matrices.length,
      );
      mesh.name = `hull-${part.shape}-${part.glow ? 'indicator' : 'surface'}`;
      part.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

export function roomAccent(kind: string): number {
  const colors: Record<string, number> = {
    werkstatt: 0xeb8e49,
    wohnzimmer: SHIP.red,
    bad: 0x64d1c0,
    esszimmer: 0x81bf6b,
    kueche: 0xe7b856,
    musikzimmer: 0x6da8ed,
    bibliothek: 0x9b8ee3,
    schlafzimmer: 0x5fa9cf,
    kinderzimmer: 0x61bd8e,
    kammer: 0xd3a577,
  };
  return colors[kind] ?? SHIP.cyan;
}

/** Physical floor, hull and equipment all share the same 2.5-metre tile system. */
export function buildShip(spec: HouseSpec): THREE.Group {
  const group = new THREE.Group();
  group.name = 'station-hull-details';
  const layout = stationLayout(spec);
  const interiors = new Map<string, THREE.Group>();
  for (const room of spacesOf(spec)) {
    const interior = buildRoomHull(spec, room);
    addRoomFixtures(
      interior,
      layout.filter((p) => p.roomId === room.id && p.kind === 'fixture'),
      room.kind,
    );
    group.add(interior);
    interiors.set(room.id, interior);
  }
  const command = buildCommandHull();
  group.add(command);
  // Die Wegweiser hängen in der Gruppe des Raums, in dem man sie liest —
  // so schaltet der Raum-Culler sie mit dem Raum ab (`world3d/signposts.ts`).
  for (const [spaceId, mesh] of buildSignMeshes(wayfindingSigns(spec), signAccent))
    (spaceId === COMMAND ? command : interiors.get(spaceId))?.add(mesh);
  // Der Weltraum ist Geometrie und keine Löschfarbe: In einer AR-Sitzung
  // löscht three.js auf durchsichtig (`world3d/spaceBackdrop.ts`).
  group.add(buildSpaceBackdrop(spec));
  return group;
}

/** Die Farbe eines Wegweisers ist die seines Ziels — Gang, Raum oder Zentrale. */
function signAccent(sign: Signpost): number {
  if (sign.circulation) return SHIP.cyan;
  return sign.kind ? roomAccent(sign.kind) : SHIP.amber;
}

function floor(batch: ShipBatch, rect: Rect, accent = SHIP.cyan, circulation = false): void {
  for (const tile of tilesOf(rect)) {
    const x = (tile.x + 0.5) * TILE,
      z = (tile.z + 0.5) * TILE;
    // The navigation grid is 2.5m; visible deck plates are human-scale 0.83m.
    batch.box(SHIP.dark, [TILE - 0.025, 0.018, TILE - 0.025], [x, 0.017, z]);
    const plate = TILE / 3;
    for (let column = 0; column < 3; column++)
      for (let row = 0; row < 3; row++) {
        const px = x + (column - 1) * plate,
          pz = z + (row - 1) * plate;
        batch.box(
          (column + row + tile.x + tile.z) % 2 === 0 ? SHIP.deck : SHIP.trim,
          [plate - 0.025, 0.013, plate - 0.025],
          [px, 0.033, pz],
        );
      }
    batch.box(SHIP.hull, [0.17, 0.008, 0.015], [x, 0.043, z + TILE / 2 - 0.1]);
    const edge = tile.z === rect.z || tile.z === rect.z + rect.d - 1;
    if (edge) {
      const toward = tile.z === rect.z ? -1 : 1;
      batch.box(accent, [TILE - 0.12, 0.009, 0.075], [x, 0.043, z + toward * (TILE / 2 - 0.24)]);
    }
    if (circulation && (tile.x - rect.x) % 3 === 1)
      for (const side of [-1, 1])
        batch.box(
          SHIP.hull,
          [0.3, 0.01, 0.075],
          [x - 0.09, 0.047, z + side * 0.1],
          false,
          (side * Math.PI) / 5,
        );
  }
}

/**
 * **Der Name eines Ganges, auf seinen Boden geschrieben.**
 *
 * „Ich bin im Verbindungsgang" war vierzehnmal wahr; „ich bin im
 * Cafeteria-Südgang" ist eine Ansage. Damit sie etwas nützt, muss der Name
 * aber **im Gang stehen** und nicht nur in der Akte: Wer dort läuft, liest
 * ihn vom Boden ab, so wie in einem Parkhaus.
 *
 * Er liegt längs der langen Seite — quer gelesen wäre er in einem zwei
 * Kacheln breiten Gang abgeschnitten.
 */
function addCorridorName(group: THREE.Group, room: HouseRoom, accent: number): void {
  const alongX = room.rect.w >= room.rect.d;
  const length = Math.min(6, (alongX ? room.rect.w : room.rect.d) * TILE - 1.2);
  if (length < 1.6) return;
  const stencil = label(room.name.toUpperCase(), length, 0.42, accent);
  stencil.name = 'corridor-floor-name';
  stencil.position.set(
    (room.rect.x + room.rect.w / 2) * TILE,
    0.063,
    (room.rect.z + room.rect.d / 2) * TILE,
  );
  stencil.rotation.set(-Math.PI / 2, 0, alongX ? 0 : Math.PI / 2);
  group.add(stencil);
}

/** Painted navigation-scale insignia makes empty walking space feel intentional. */
function addDepartmentMark(
  group: THREE.Group,
  batch: ShipBatch,
  room: HouseRoom,
  accent: number,
): void {
  const x = (room.rect.x + room.rect.w / 2) * TILE;
  const z = (room.rect.z + room.rect.d / 2) * TILE;
  const y = 0.052;
  // A framed work zone around the reserved standing area; all paint is below
  // the foot plane and has no collision footprint or additional light source.
  for (const side of [-1, 1]) {
    batch.box(accent, [2.55, 0.009, 0.075], [x, y, z + side * 1.275]);
    batch.box(accent, [0.075, 0.009, 2.55], [x + side * 1.275, y, z]);
  }
  if (room.kind === 'bad') {
    batch.box(SHIP.hull, [1.52, 0.011, 0.4], [x, y + 0.006, z]);
    batch.box(SHIP.hull, [0.4, 0.011, 1.52], [x, y + 0.007, z]);
  } else if (room.kind === 'werkstatt' || room.kind === 'wohnzimmer') {
    for (const side of [-1, 1])
      batch.box(
        accent,
        [0.88, 0.011, 0.2],
        [x + side * 0.18, y + 0.006, z + side * 0.24],
        false,
        -Math.PI / 4,
      );
  } else if (room.kind === 'kammer') {
    for (const side of [-1, 1]) {
      batch.box(SHIP.hull, [1.4, 0.011, 0.085], [x, y + 0.006, z + side * 0.6]);
      batch.box(SHIP.hull, [0.085, 0.011, 1.2], [x + side * 0.7, y + 0.006, z]);
    }
  } else {
    for (const side of [-1, 1])
      batch.box(SHIP.hull, [0.42, 0.011, 1.2], [x + side * 0.33, y + 0.006, z]);
  }
  const codes: Record<string, string> = {
    bad: 'MED / LIFE SUPPORT',
    kueche: 'MESS / CREW',
    werkstatt: 'ENG / PROPULSION',
    wohnzimmer: 'PWR / REACTOR',
    bibliothek: 'DATA / SYSTEMS',
    musikzimmer: 'COM / UPLINK',
    kammer: 'CARGO / LOGISTICS',
    schlafzimmer: 'CREW / REST',
    kinderzimmer: 'LAB / RESEARCH',
    esszimmer: 'BIO / HYDROPONICS',
  };
  const stencil = label(
    `${codes[room.kind] ?? 'ORBITAL'} · ${roomCode(room.id)}`,
    2.5,
    0.27,
    accent,
  );
  stencil.name = 'department-floor-stencil';
  stencil.position.set(x, 0.063, z + 1.62);
  stencil.rotation.x = -Math.PI / 2;
  group.add(stencil);
}

function buildRoomHull(spec: HouseSpec, room: HouseRoom): THREE.Group {
  const group = new THREE.Group();
  group.name = `station-room-${room.id}`;
  group.userData.roomId = room.id;
  const batch = new ShipBatch(),
    accent = room.circulation ? SHIP.cyan : roomAccent(room.kind);
  floor(batch, room.rect, accent, room.circulation);
  if (room.circulation) addCorridorName(group, room, accent);
  else addDepartmentMark(group, batch, room, accent);
  for (const tile of tilesOf(room.rect))
    for (const dir of DIRS) {
      if (roomAt(spec, tile.x + dirX(dir), tile.z + dirZ(dir))?.id === room.id) continue;
      const x = (tile.x + 0.5 + dirX(dir) / 2) * TILE,
        z = (tile.z + 0.5 + dirZ(dir) / 2) * TILE;
      const yaw = [0, -Math.PI / 2, Math.PI, Math.PI / 2][dir]!;
      const local = (u: number, y: number, v: number): Triplet => [
        x + Math.cos(yaw) * u + Math.sin(yaw) * v,
        y,
        z - Math.sin(yaw) * u + Math.cos(yaw) * v,
      ];
      const opening =
        spec.doors.some(
          (door) =>
            (door.x === tile.x && door.z === tile.z && door.dir === dir) ||
            (door.x + dirX(door.dir) === tile.x &&
              door.z + dirZ(door.dir) === tile.z &&
              (door.dir + 2) % 4 === dir),
        ) ||
        spec.windows.some(
          (window) => window.x === tile.x && window.z === tile.z && window.dir === dir,
        );
      const face = PLAN_WALL_T / 2,
        post = TILE / 2 - 0.19;
      for (const u of [-post, post]) {
        batch.box(SHIP.trim, [0.1, 2.2, 0.11], local(u, 1.15, face + 0.065), false, yaw);
        // Angled shoulders and rounded conduit break the rectangular wall silhouette.
        batch.box(SHIP.trim, [0.1, 0.28, 0.1], local(u, 2.42, face + 0.1), false, yaw, Math.PI / 5);
      }
      if (!opening) {
        batch.box(SHIP.hull, [TILE - 0.48, 1.41, 0.032], local(0, 1.365, face + 0.021), false, yaw);
        // Broad department colour, inset seams and a kick plate make the ship's
        // rooms readable at a glance, without adding decorative floor obstacles.
        batch.box(accent, [TILE - 0.48, 0.29, 0.037], local(0, 0.705, face + 0.044), false, yaw);
        batch.box(SHIP.dark, [TILE - 0.42, 0.2, 0.051], local(0, 0.18, face + 0.032), false, yaw);
        for (const u of [-0.64, 0.64])
          batch.box(SHIP.trim, [0.026, 0.64, 0.018], local(u, 1.35, face + 0.047), false, yaw);
        batch.box(SHIP.hull, [0.24, 0.065, 0.021], local(0.62, 1.92, face + 0.066), false, yaw);
        batch.box(SHIP.trim, [TILE - 0.46, 0.11, 0.043], local(0, 0.42, face + 0.03), false, yaw);
        batch.box(SHIP.dark, [TILE - 0.63, 0.075, 0.044], local(0, 1.84, face + 0.044), false, yaw);
        // One small low-level status marker is visible during a total blackout.
        batch.box(accent, [0.17, 0.015, 0.012], local(-post + 0.23, 0.31, face + 0.055), true, yaw);
      }
      // Everything crossing the wall segment is above the actual door head.
      batch.box(
        SHIP.hull,
        [TILE - 0.32, 0.13, 0.12],
        local(0, PLAN_WALL_H - 0.19, face + 0.085),
        false,
        yaw,
        Math.PI / 5,
      );
      batch.pipe(
        SHIP.trim,
        0.032,
        TILE - 0.39,
        local(0, PLAN_WALL_H - 0.42, face + 0.09),
        dirX(dir) === 0,
      );
      if (opening) {
        // The interactive door owns its red/green indicator. Hull art only
        // supplies a neutral recess, so a locked door cannot still look green.
        batch.box(
          SHIP.dark,
          [0.66, 0.14, 0.05],
          local(0, PLAN_DOOR_H + 0.18, face + 0.063),
          false,
          yaw,
        );
      }
    }
  for (const vent of ventPairs(spec)) {
    if (vent.a !== room.id && vent.b !== room.id) continue;
    const inward = vent.a === room.id ? -1 : 1,
      dx = vent.dir === 1 ? inward : 0,
      dz = vent.dir === 2 ? inward : 0;
    const alongX = dx === 0,
      x = vent.x * TILE + dx * (PLAN_WALL_T / 2 + 0.063),
      z = vent.z * TILE + dz * (PLAN_WALL_T / 2 + 0.063);
    batch.box(SHIP.dark, alongX ? [0.69, 0.35, 0.045] : [0.045, 0.35, 0.69], [x, 2.38, z]);
    for (let i = 0; i < 5; i++)
      batch.box(SHIP.trim, alongX ? [0.6, 0.018, 0.017] : [0.017, 0.018, 0.6], [
        x + dx * 0.034,
        2.255 + i * 0.059,
        z + dz * 0.034,
      ]);
  }
  const signText = room.circulation
    ? `${room.name.toUpperCase()}\nTRANSIT`
    : `${room.name.toUpperCase()}\n${MARKS[room.signature]}`;
  // Both signs sit in front of the deepest wall trim and pipes. A real offset,
  // not disabled depth testing, preserves occlusion through neighbouring rooms.
  // Über einer Öffnung hängt seit den Wegweisern etwas anderes: Das Raumschild
  // nimmt die türfreie Kachel, die der Wandmitte am nächsten liegt — und auf
  // einer Wand, die ganz offen ist (Kreuzung), entfällt es.
  for (const side of [0, 1]) {
    const tileX = closedTileX(spec, room, side ? 2 : 0);
    if (tileX === null) continue;
    const sign = label(signText, 2.25, 0.42, accent);
    sign.position.set(
      (tileX + 0.5) * TILE,
      2.39,
      (room.rect.z + (side ? room.rect.d : 0)) * TILE + (side ? -1 : 1) * (PLAN_WALL_T / 2 + 0.24),
    );
    sign.rotation.y = side ? Math.PI : 0;
    sign.name = 'room-identification';
    sign.userData.surfaceClearance = 0.24;
    group.add(sign);
  }
  group.add(batch.build());
  return group;
}

/**
 * Die Kachel der Nord- (`dir` 0) oder Südwand (`dir` 2) ohne Tür und Fenster,
 * die der Wandmitte am nächsten liegt — `null`, wenn die ganze Wand offen ist.
 */
export function closedTileX(spec: HouseSpec, room: HouseRoom, dir: 0 | 2): number | null {
  const z = dir === 0 ? room.rect.z : room.rect.z + room.rect.d - 1;
  const centre = room.rect.x + room.rect.w / 2 - 0.5;
  let best: number | null = null;
  for (let x = room.rect.x; x < room.rect.x + room.rect.w; x++) {
    const open =
      spec.doors.some(
        (door) =>
          (door.x === x && door.z === z && door.dir === dir) ||
          (door.x + dirX(door.dir) === x &&
            door.z + dirZ(door.dir) === z &&
            (door.dir + 2) % 4 === dir),
      ) || spec.windows.some((window) => window.x === x && window.z === z && window.dir === dir);
    if (open) continue;
    if (best === null || Math.abs(x - centre) < Math.abs(best - centre)) best = x;
  }
  return best;
}

/** One mesh per finish per room even when several models use dozens of pieces. */
function addRoomFixtures(
  group: THREE.Group,
  placements: readonly StationPlacement[],
  roomKind: string,
): void {
  const merged = new Map<
    string,
    { positions: number[]; normals: number[]; material: THREE.Material }
  >();
  for (const placement of placements) {
    if (!placement.markId) continue;
    const fixture = buildFixture(placement.markId, roomKind === 'kueche' ? 'canteen' : 'default');
    fixture.position.set(placement.x, 0, placement.z);
    fixture.rotation.y = placement.yaw;
    fixture.updateMatrixWorld(true);
    fixture.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const finish = object.userData.fixtureFinish as string,
        material = object.material as THREE.Material;
      let output = merged.get(finish);
      if (!output) {
        output = { positions: [], normals: [], material };
        merged.set(finish, output);
      } else material.dispose();
      const geometry = object.geometry;
      geometry.applyMatrix4(object.matrixWorld);
      const positions = geometry.getAttribute('position'),
        normals = geometry.getAttribute('normal');
      for (let i = 0; i < positions.count; i++) {
        output.positions.push(positions.getX(i), positions.getY(i), positions.getZ(i));
        output.normals.push(normals.getX(i), normals.getY(i), normals.getZ(i));
      }
      geometry.dispose();
    });
  }
  for (const [finish, data] of merged) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, data.material);
    mesh.name = `room-fixtures-${finish}`;
    group.add(mesh);
  }
}

function buildCommandHull(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'station-command-hull';
  const batch = new ShipBatch();
  floor(batch, APRON);
  const south = (APRON.z + APRON.d) * TILE,
    centreX = (APRON.x + APRON.w / 2) * TILE,
    centreZ = (APRON.z + APRON.d / 2) * TILE;
  for (let column = 0; column < APRON.w; column++) {
    const x = (APRON.x + column + 0.5) * TILE;
    batch.box(
      SHIP.hull,
      [TILE - 0.25, 0.15, 0.18],
      [x, PLAN_WALL_H - 0.18, south - PLAN_WALL_T / 2 - 0.1],
    );
    batch.pipe(
      SHIP.trim,
      0.034,
      TILE - 0.2,
      [x, PLAN_WALL_H - 0.39, south - PLAN_WALL_T / 2 - 0.1],
      true,
    );
    for (const side of [-1, 1])
      batch.box(
        SHIP.trim,
        [0.09, PLAN_WALL_H - 0.12, 0.13],
        [x + side * (TILE / 2 - 0.19), PLAN_WALL_H / 2, south - PLAN_WALL_T / 2 - 0.09],
      );
  }
  // Ceiling service rail remains inside the deck; no old 3-metre bay offsets.
  batch.box(SHIP.trim, [APRON.w * TILE - 0.6, 0.11, 0.14], [centreX, PLAN_WALL_H - 0.12, centreZ]);
  const title = label(
    'HAUNTING / ORBITAL\nEINSATZZENTRALE · SICHERER BEREICH',
    Math.min(3.4, APRON.w * TILE - 0.8),
    0.42,
    SHIP.amber,
  );

  title.position.set(centreX, PLAN_WALL_H - 0.3, APRON.z * TILE + PLAN_WALL_T / 2 + 0.24);
  group.add(batch.build(), title);
  return group;
}

/** Eine Drehleuchte, wie die Welt sie in einem Gang aufhängt. */
export interface StationBeacon {
  root: THREE.Group;
  /** Der drehende Spiegel; sein Gierwinkel kommt aus `botLighting.beaconAngle`. */
  mirror: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /** Die Haube, die dabei pulst. */
  lamp: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /** Der Versatz dieser Leuchte, damit nicht alle im Gleichtakt drehen. */
  offset: number;
}

/**
 * **Rote Drehleuchten in den Gängen.**
 *
 * Sie hängen dort, wo man ohnehin entlangläuft, und nur dort: In einem Raum
 * wäre eine Alarmleuchte eine Lampe mehr, im Gang ist sie das, was den Gang
 * zu einem Gang macht. Eine je zweiter Kachel eines Ganges, höchstens zwei
 * je Gang — mehr sieht aus wie eine Lichterkette.
 *
 * Sie leuchten **selbst** und beleuchten nichts: kein `PointLight`, sondern
 * eine Haube mit `MeshBasicMaterial`. Zwölf zusätzliche Lichtquellen wären
 * auf einer Brille zwölf zusätzliche Durchgänge je Bild.
 */
export function buildCorridorBeacons(spec: HouseSpec): StationBeacon[] {
  const beacons: StationBeacon[] = [];
  const halls = (spec.passages ?? []).filter((room) => room.circulation);
  halls.forEach((hall, index) => {
    const tiles = tilesOf(hall.rect);
    const spots = tiles.filter((_, at) => at % 3 === 1).slice(0, 2);
    for (const tile of spots.length ? spots : tiles.slice(0, 1)) {
      const root = new THREE.Group();
      root.name = `corridor-beacon-${hall.id}`;
      root.position.set((tile.x + 0.5) * TILE, PLAN_WALL_H - 0.42, (tile.z + 0.5) * TILE);
      const bracket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.18, 6),
        new THREE.MeshStandardMaterial({ color: SHIP.trim, roughness: 0.6 }),
      );
      bracket.position.y = 0.14;
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 8),
        new THREE.MeshBasicMaterial({ color: SHIP.red, transparent: true, opacity: 0.72 }),
      );
      const mirror = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.11, 0.035),
        new THREE.MeshBasicMaterial({ color: SHIP.red }),
      );
      root.add(bracket, lamp, mirror);
      root.visible = false;
      beacons.push({
        root,
        mirror: mirror as StationBeacon['mirror'],
        lamp: lamp as StationBeacon['lamp'],
        // Goldener Winkel: Nachbarn stehen nie im Gleichtakt und wiederholen
        // sich auch nach zwanzig Leuchten nicht.
        offset: ((index * 2 + beacons.length) * 0.618034) % 1,
      });
    }
  });
  return beacons;
}

export function label(
  text: string,
  width: number,
  height: number,
  color = SHIP.cyan,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = Math.max(64, Math.round((768 * height) / width));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#101f31';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 7, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? 800 : 600} ${Math.min(52, canvas.height / (lines.length + 0.65))}px system-ui`;
    ctx.fillStyle = i === 0 ? '#f3fbff' : `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillText(
      line,
      canvas.width / 2,
      canvas.height * ((i + 0.5) / lines.length),
      canvas.width - 40,
    );
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
}

/** Smooth bevel normals keep the creature's boots, armour and joints off the cube grid. */
function roundedCreaturePart(size: Triplet): THREE.BoxGeometry {
  const [w, h, d] = size;
  const geometry = new THREE.BoxGeometry(w, h, d, 3, 3, 3);
  const radius = Math.min(w, h, d) * 0.3;
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const point = new THREE.Vector3(),
    core = new THREE.Vector3(),
    normal = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    core.set(
      THREE.MathUtils.clamp(point.x, -w / 2 + radius, w / 2 - radius),
      THREE.MathUtils.clamp(point.y, -h / 2 + radius, h / 2 - radius),
      THREE.MathUtils.clamp(point.z, -d / 2 + radius, d / 2 - radius),
    );
    normal.subVectors(point, core).normalize();
    point.copy(core).addScaledVector(normal, radius);
    positions.setXYZ(i, point.x, point.y, point.z);
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Friendly, readable technician silhouette for the spectator bot and training deck. */
export function buildCrewmate(color = 0x48b9d2): THREE.Group {
  const root = new THREE.Group();
  root.name = 'crew-technician';
  root.userData.actorRole = 'crew';
  const suit = new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.1 });
  const white = new THREE.MeshStandardMaterial({
    color: 0xe5eef3,
    roughness: 0.5,
    metalness: 0.12,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a3045, roughness: 0.72 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x74b9d7,
    roughness: 0.19,
    metalness: 0.45,
    emissive: 0x0a283c,
    emissiveIntensity: 0.35,
  });
  const glint = new THREE.MeshBasicMaterial({ color: 0xdbf8ff, toneMapped: false });
  const round = (
    parent: THREE.Object3D,
    material: THREE.Material,
    size: Triplet,
    at: Triplet,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(roundedCreaturePart(size), material);
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  };
  const capsule = (
    parent: THREE.Object3D,
    material: THREE.Material,
    radius: number,
    length: number,
    at: Triplet,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 12), material);
    mesh.position.set(...at);
    parent.add(mesh);
    return mesh;
  };
  capsule(root, suit, 0.265, 0.36, [0, 1.025, 0]);
  round(root, white, [0.49, 0.07, 0.43], [0, 0.79, -0.015]);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.325, 20, 14), suit);
  helmet.name = 'crew-helmet';
  helmet.position.set(0, 1.475, -0.018);
  root.add(helmet);
  const visorRim = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), dark);
  visorRim.position.set(0, 1.49, -0.267);
  visorRim.scale.set(0.288, 0.202, 0.083);
  root.add(visorRim);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), glass);
  visor.name = 'crew-visor';
  visor.position.set(0, 1.495, -0.292);
  visor.scale.set(0.263, 0.176, 0.075);
  root.add(visor);
  const reflection = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), glint);
  reflection.position.set(-0.068, 1.565, -0.351);
  reflection.scale.set(0.112, 0.027, 0.015);
  root.add(reflection);
  const backpack = round(root, suit, [0.4, 0.61, 0.21], [0, 1.045, 0.297]);
  backpack.name = 'crew-backpack';
  for (const x of [-0.14, 0.14]) round(root, white, [0.038, 0.43, 0.022], [x, 1.08, 0.413]);
  round(root, dark, [0.19, 0.16, 0.03], [0.07, 1.135, -0.266]);
  round(root, white, [0.1, 0.025, 0.012], [0.07, 1.17, -0.287]);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = 'arm';
    arm.position.set(side * 0.335, 1.23, 0);
    root.add(arm);
    capsule(arm, suit, 0.095, 0.23, [0, -0.12, 0]);
    capsule(arm, dark, 0.075, 0.15, [0, -0.35, 0]);
    capsule(arm, white, 0.091, 0.03, [0, -0.47, -0.018]);
    const leg = new THREE.Group();
    leg.name = 'leg';
    leg.position.set(side * 0.155, 0.63, 0);
    root.add(leg);
    capsule(leg, suit, 0.125, 0.24, [0, -0.16, 0]);
    round(leg, dark, [0.235, 0.13, 0.37], [0, -0.49, -0.065]);
    round(leg, white, [0.237, 0.032, 0.37], [0, -0.551, -0.065]);
  }
  return root;
}

export function buildCreature(kind: MonsterKind): THREE.Group {
  const root = new THREE.Group();
  root.name = `creature-${kind}`;
  const shell = new THREE.MeshStandardMaterial({
    color: kind === 'sentinel' ? 0x72848d : kind === 'crawler' ? 0x303840 : 0xb2aaa0,
    roughness: 0.59,
    metalness: 0.18,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111b24, roughness: 0.82 });
  const eye = new THREE.MeshBasicMaterial({
    color: kind === 'sentinel' ? SHIP.amber : SHIP.red,
    toneMapped: false,
  });
  const box = (
    parent: THREE.Object3D,
    material: THREE.Material,
    size: [number, number, number],
    at: [number, number, number],
  ): THREE.Mesh => {
    const m = new THREE.Mesh(roundedCreaturePart(size), material);
    m.position.set(...at);
    parent.add(m);
    return m;
  };
  if (kind === 'crawler') {
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 3, 8), shell);
    back.rotation.z = Math.PI / 2;
    back.position.y = 0.5;
    root.add(back);
    box(root, dark, [0.34, 0.18, 0.32], [0, 0.48, -0.42]);
    for (const side of [-1, 1]) {
      box(root, eye, [0.06, 0.04, 0.04], [side * 0.1, 0.51, -0.59]);
      for (let i = 0; i < 3; i++) {
        const limb = new THREE.Group();
        limb.name = 'leg';
        limb.position.set(side * 0.19, 0.5, -0.3 + i * 0.3);
        root.add(limb);
        const thigh = box(limb, shell, [0.43, 0.075, 0.075], [side * 0.15, -0.1, 0]);
        thigh.rotation.z = side * -0.4;
        box(limb, dark, [0.065, 0.29, 0.055], [side * 0.34, -0.33, 0]);
      }
    }
  } else {
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(kind === 'sentinel' ? 0.29 : 0.23, 0.4, 4, 10),
      shell,
    );
    torso.position.y = 1.16;
    root.add(torso);
    box(root, dark, [0.33, 0.22, 0.17], [0, 1.24, -0.22]);
    box(root, eye, [0.22, 0.035, 0.035], [0, 1.26, -0.318]);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.205, 12, 8), shell);
    head.position.y = 1.72;
    root.add(head);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), dark);
    visor.scale.set(0.188, 0.135, 0.086);
    visor.position.set(0, 1.73, -0.154);
    root.add(visor);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), eye);
    iris.scale.set(0.117, 0.019, 0.014);
    iris.position.set(0, 1.732, -0.24);
    root.add(iris);
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.name = 'arm';
      arm.position.set(side * 0.31, 1.36, 0);
      root.add(arm);
      box(arm, shell, [0.14, 0.39, 0.16], [0, -0.15, 0]);
      box(arm, dark, [0.11, 0.28, 0.12], [0, -0.47, -0.07]);
      for (let n = 0; n < 3; n++)
        box(arm, shell, [0.022, 0.14, 0.022], [-0.035 + n * 0.035, -0.64, -0.1]);
      const leg = new THREE.Group();
      leg.name = 'leg';
      leg.position.set(side * 0.14, 0.83, 0);
      root.add(leg);
      box(leg, shell, [0.17, 0.36, 0.18], [0, -0.15, 0]);
      box(leg, dark, [0.14, 0.34, 0.16], [0, -0.49, 0]);
      box(leg, shell, [0.19, 0.13, 0.3], [0, -0.74, -0.05]);
    }
    box(root, dark, [0.32, 0.5, 0.16], [0, 1.23, 0.26]);
  }
  return root;
}

export function animateCreature(root: THREE.Object3D, time: number): void {
  for (const child of root.children)
    if (child.name === 'arm' || child.name === 'leg') {
      child.rotation.x =
        Math.sin(time * 4.4) *
        (child.position.x < 0 ? -1 : 1) *
        (child.name === 'arm' ? -1 : 1) *
        0.35;
    }
}
