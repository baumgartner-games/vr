import {
  generateHouse,
  onApron,
  roomCentre,
  roomOf,
  APRON,
  DRONE_HOME,
  HOUSE,
  type HouseRoom,
} from './house';
import { housePlan, DRONE_PROFILE } from './plan';
import {
  droneFov,
  lampAfter,
  lampRefill,
  lampSeconds,
  routeLength,
  routeTo,
  shortestTurn,
  stepAlong,
  tileAt,
  wrapAngle,
  DRONE_CAP,
  DRONE_HFOV,
  DRONE_ROOF,
  DRONE_Y,
  LAMP_FILL,
  LAMP_HOME,
  LAMP_LIFE,
  type DronePose,
} from './droneRoute';
import { PLAN_DOOR_H } from '../editor/levelPlan';
import { wallState } from '../nav/navGraph';
import { powerOf } from '../nav/navProfile';
import { DIRS, TILE, neighbour, tileCentreX, tileCentreZ } from '../nav/navTile';
import type { NavGraph } from '../nav/navGraph';

/**
 * **Die Drohne fliegt nicht die Luftlinie.**
 *
 * Das ist die Regel, an der in dieser Welt drei Rollen hängen: Die Drohne
 * macht keine Tür auf, also hängt ihre Reichweite daran, was der VR-Spieler
 * und der Hacker offen gelassen haben. Eine Drohne, die stattdessen einfach
 * auf das angetippte Zimmer zuhält, fliegt durch die Wand — und dann ist die
 * geschlossene Tür Kulisse und der Hacker Deko.
 *
 * Nachgerechnet wird deshalb nicht der Aufruf von `findPath`, sondern der
 * **Flug**: Ein Weg wird ganz abgeflogen, und dabei darf die Bahn nie eine
 * Wand kreuzen. Ein Test, der nur prüft, dass eine Wegsuche stattfindet,
 * überlebt jeden Umbau; einer, der die Bahn nachfliegt, nicht.
 */

const SEED = 31337;
const spec = generateHouse(SEED);

/** In welchem Zimmer ein Punkt in Metern liegt. */
function roomAt(x: number, z: number): HouseRoom | null {
  const tx = Math.floor(x / TILE);
  const tz = Math.floor(z / TILE);
  return (
    spec.rooms.find(
      (room) =>
        tx >= room.rect.x &&
        tx < room.rect.x + room.rect.w &&
        tz >= room.rect.z &&
        tz < room.rect.z + room.rect.d,
    ) ?? null
  );
}

/** Ob zwischen zwei Punkten in Metern eine Wand steht, die die Drohne aufhält. */
function crossesWall(graph: NavGraph, ax: number, az: number, bx: number, bz: number): boolean {
  const from = tileAt(ax, az);
  const to = tileAt(bx, bz);
  if (from === to) return false;
  for (const dir of DIRS) {
    if (neighbour(from, dir) !== to) continue;
    return !wallState(graph.wall(from, dir), powerOf(DRONE_PROFILE)).walk;
  }
  // Nicht einmal benachbart: Sie hat eine Kachel übersprungen, und was
  // dazwischen liegt, hat niemand gefragt.
  return true;
}

/** Einen Weg wirklich abfliegen und dabei jeden Kachelwechsel mitschreiben. */
function fly(
  graph: NavGraph,
  pose: DronePose,
  goal: number,
): { steps: number; crossings: string[]; arrived: boolean } {
  const crossings: string[] = [];
  let route = routeTo(graph, pose, goal);
  let steps = 0;
  let last = { x: pose.x, z: pose.z };
  // 60 Bilder je Sekunde, zwei Minuten — mehr als genug für jedes Haus.
  while (steps < 7200) {
    steps++;
    // Zweimal je Sekunde neu suchen, genau wie in der Welt.
    if (steps % 30 === 0) route = routeTo(graph, pose, goal);
    const moving = stepAlong(pose, route, 1 / 60);
    if (tileAt(pose.x, pose.z) !== tileAt(last.x, last.z)) {
      if (crossesWall(graph, last.x, last.z, pose.x, pose.z)) {
        crossings.push(
          `${last.x.toFixed(2)},${last.z.toFixed(2)} → ${pose.x.toFixed(2)},${pose.z.toFixed(2)}`,
        );
      }
    }
    last = { x: pose.x, z: pose.z };
    if (!moving) break;
  }
  return { steps, crossings, arrived: tileAt(pose.x, pose.z) === goal };
}

function poseAt(room: HouseRoom): DronePose {
  const at = roomCentre(room);
  return { x: (at.x + 0.5) * TILE, z: (at.z + 0.5) * TILE, yaw: 0 };
}

function goalOf(room: HouseRoom): number {
  const at = roomCentre(room);
  return tileAt((at.x + 0.5) * TILE, (at.z + 0.5) * TILE);
}

describe('Die Drohne navigiert im Graphen', () => {
  const plan = housePlan(spec);
  const entry = roomOf(spec, spec.entryRoom) ?? spec.rooms[0]!;

  it('kommt in jedes Zimmer, ohne je eine Wand zu kreuzen', () => {
    for (const room of spec.rooms) {
      const pose = poseAt(entry);
      const flight = fly(plan.graph, pose, goalOf(room));
      expect(flight.crossings).toEqual([]);
      expect(flight.arrived).toBe(true);
      expect(roomAt(pose.x, pose.z)?.id).toBe(room.id);
    }
  });

  /**
   * **Die Gegenprobe zur Luftlinie.**
   *
   * Es muss mindestens ein Zimmer geben, das von der Haustür aus schräg hinter
   * einer Wand liegt — sonst wäre der Test oben auch für eine Drohne grün, die
   * einfach geradeaus fliegt, und würde nichts festhalten.
   */
  it('nimmt einen Umweg, wo die Luftlinie durch eine Wand ginge', () => {
    const start = poseAt(entry);
    const detours = spec.rooms.filter((room) => {
      const goal = goalOf(room);
      const route = routeTo(plan.graph, start, goal);
      if (route.tiles.length === 0) return false;
      const straight = Math.hypot(tileCentreX(goal) - start.x, tileCentreZ(goal) - start.z);
      return routeLength(start, route) > straight + TILE;
    });
    expect(detours.length).toBeGreaterThan(0);
  });

  /**
   * Der Weg besteht aus Nachbarkacheln, und zwischen zwei Nachbarn steht keine
   * Wand. Das ist dieselbe Zusage wie oben, nur als Blick auf den Weg statt
   * auf die Bahn — und sie ist die, die eine Kachel-Abkürzung auffliegen
   * lässt.
   */
  it('reiht nur Nachbarkacheln aneinander', () => {
    const start = poseAt(entry);
    for (const room of spec.rooms) {
      const route = routeTo(plan.graph, start, goalOf(room));
      let x = start.x;
      let z = start.z;
      for (const tile of route.tiles) {
        const nx = tileCentreX(tile);
        const nz = tileCentreZ(tile);
        expect(crossesWall(plan.graph, x, z, nx, nz)).toBe(false);
        x = nx;
        z = nz;
      }
    }
  });
});

describe('Wo sie stehen bleibt', () => {
  /**
   * **Zugemacht wird ein ganzes Zimmer und nicht eine Tür.**
   *
   * Seit jedes Zimmer mindestens zwei Türen hat (`house.ts`), ist eine einzelne
   * geschlossene Tür für die Drohne kein Halt mehr, sondern ein Umweg — und
   * genau dafür sind die zweiten Türen da. Wer sie wirklich aussperren will,
   * muss alle Türen eines Zimmers zumachen, und das kann der Hacker.
   */
  const entry = roomOf(spec, spec.entryRoom) ?? spec.rooms[0]!;
  const sealed = spec.rooms.find((room) => room.id !== entry.id)!;
  const shut = spec.doors.filter((door) => door.a === sealed.id || door.b === sealed.id);

  it('meldet einen Teilweg, wenn der Hacker das Zimmer zumacht', () => {
    const plan = housePlan(spec, new Set(shut.map((door) => door.id)));
    const start = poseAt(entry);
    const goal = goalOf(sealed);
    const route = routeTo(plan.graph, start, goal);
    expect(route.grounded).toBe(true);
    expect(route.complete).toBe(false);
    // Und sie fliegt nicht trotzdem hin.
    fly(plan.graph, start, goal);
    expect(tileAt(start.x, start.z)).not.toBe(goal);
  });

  it('sagt Bescheid, wenn sie gar nicht im Graphen steht', () => {
    const plan = housePlan(spec);
    const outside: DronePose = { x: 400, z: 400, yaw: 0 };
    const route = routeTo(plan.graph, outside, goalOf(spec.rooms[0]!));
    expect(route.grounded).toBe(false);
    expect(route.tiles).toEqual([]);
  });
});

describe('Wie sie sich dreht', () => {
  it('nimmt den kürzeren Bogen über den Sprung bei ±180°', () => {
    expect(shortestTurn(3, -3)).toBeCloseTo(2 * Math.PI - 6, 6);
    expect(shortestTurn(-3, 3)).toBeCloseTo(6 - 2 * Math.PI, 6);
    expect(shortestTurn(0, 1)).toBeCloseTo(1, 6);
  });

  /**
   * **Der Ort hängt nicht an der Drehung.**
   *
   * Die Bahn geht auf Kachelmitten zu, und nur das Bild dreht sich nach. Wer
   * es andersherum baut — erst drehen, dann fliegen —, lässt eine Drohne, die
   * gerade falsch herum steht, die Ecke schneiden, und dann steckt sie in der
   * Wand. Hier steht sie zu Beginn genau verkehrt und kommt trotzdem an.
   */
  /**
   * **Umsehen geht ganz herum.**
   *
   * Der Blick des Piloten hatte lange einen Anschlag bei gut zwei Dritteln
   * einer halben Umdrehung, und das war eine Drohne, die sich nicht umdrehen
   * kann: Wer wissen will, ob hinter ihr etwas steht, kommt nicht hin. Jetzt
   * dreht er durch — und dafür muss der Winkel im Kreis laufen und nicht auf
   * einer Geraden. Ein Wert, der mit jedem Wisch weiterwächst, ist nach einer
   * Minute eine Zahl, an der weder der leuchtende Blickstock noch der
   * Empfänger im Haus etwas ablesen kann.
   */
  it('wickelt jeden Blickwinkel auf eine halbe Umdrehung zurück', () => {
    expect(wrapAngle(0)).toBeCloseTo(0, 6);
    expect(wrapAngle(Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.9, 6);
    // Einmal ganz herum ist wieder geradeaus, und nicht 6,28.
    expect(wrapAngle(Math.PI * 2)).toBeCloseTo(0, 6);
    // Und knapp darüber hinaus kommt der Blick von der anderen Seite zurück.
    expect(wrapAngle(Math.PI * 1.2)).toBeCloseTo(-Math.PI * 0.8, 6);
    expect(wrapAngle(-Math.PI * 1.2)).toBeCloseTo(Math.PI * 0.8, 6);
    for (const turns of [-9, -3.5, -1, 2.25, 7]) {
      const yaw = wrapAngle(turns * Math.PI);
      expect(Math.abs(yaw)).toBeLessThanOrEqual(Math.PI + 1e-9);
      // Derselbe Winkel, nur kurz aufgeschrieben: Die Drehung dorthin ist null.
      expect(shortestTurn(yaw, turns * Math.PI)).toBeCloseTo(0, 6);
    }
  });

  it('kommt auch aus einer 180°-Wende beim ersten Wegpunkt an', () => {
    const plan = housePlan(spec);
    const entry = roomOf(spec, spec.entryRoom) ?? spec.rooms[0]!;
    const pose = poseAt(entry);
    const goal = goalOf(spec.rooms[spec.rooms.length - 1]!);
    const route = routeTo(plan.graph, pose, goal);
    const first = route.tiles[0];
    if (first === undefined) throw new Error('Dieses Haus hat nur ein Zimmer');
    // Genau verkehrt herum: die Blickrichtung zeigt vom Wegpunkt weg.
    pose.yaw = Math.atan2(pose.x - tileCentreX(first), pose.z - tileCentreZ(first));

    const before = routeLength(pose, route);
    for (let i = 0; i < 120; i++) stepAlong(pose, route, 1 / 60);
    expect(routeLength(pose, route)).toBeLessThan(before);
    expect(tileAt(pose.x, pose.z)).not.toBe(goalOf(entry));
  });
});

/**
 * **Wie hoch sie fliegt — und dass sie damit durch eine Tür passt.**
 *
 * Sie hing auf 2,15 m, und der Türsturz sitzt auf 2,10 m: Im Bild des Piloten
 * schob sich bei jeder Tür ein Balken von oben herein, und im Haus flog eine
 * Drohne durch den Rahmen statt hindurch. Die Zahl ist deshalb keine mehr,
 * sondern folgt der Tür — und ein Test hält das fest, weil man einer Zahl
 * nicht ansieht, dass sie fünf Zentimeter im Sturz steckt. Man sieht es erst
 * in der Brille, und dann sucht man den Fehler bei der Decke.
 */
describe('Die Flughöhe der Drohne', () => {
  it('passt mit Kuppel und allem unter jeden Türsturz', () => {
    expect(DRONE_Y + DRONE_CAP).toBeLessThan(PLAN_DOOR_H);
  });

  it('bleibt trotzdem deutlich über Augenhöhe', () => {
    // Der Grund, aus dem sie überhaupt hoch fliegt: Auf Augenhöhe steht im
    // Bild eine Stuhllehne vor dem halben Zimmer.
    expect(DRONE_Y).toBeGreaterThan(1.75);
  });

  it('bleibt unter der Decke', () => {
    expect(DRONE_Y + DRONE_CAP).toBeLessThan(DRONE_ROOF);
  });
});

/**
 * **Die Einsatzzentrale ist ein Ziel und keine Sonderregel.**
 *
 * Die Drohne startet vor ihr, draußen, mit dem Haus im Bild — und kommt von
 * dort in jedes Zimmer und wieder zurück. Das ist keine Kosmetik, sondern die
 * Probe darauf, dass der Vorplatz wirklich am Gitter hängt: Ohne ihn stünde
 * sie beim ersten Bild auf keiner Kachel und behauptete, sie käme nirgends
 * hin. Die Gegenprobe steht darunter — zugemachte Haustür, und der Hangar ist
 * unerreichbar. Wer beides hat, hat bewiesen, dass der Weg nach draußen durch
 * die Tür geht und nicht durch die Wand.
 */
describe('Der Hangar vor der Einsatzzentrale', () => {
  const plan = housePlan(spec);
  const home = tileAt((DRONE_HOME.x + 0.5) * TILE, (DRONE_HOME.z + 0.5) * TILE);

  function homePose(): DronePose {
    return { x: (DRONE_HOME.x + 0.5) * TILE, z: (DRONE_HOME.z + 0.5) * TILE, yaw: Math.PI };
  }

  it('liegt auf dem Vorplatz und nicht im Haus', () => {
    expect(onApron(DRONE_HOME.x, DRONE_HOME.z)).toBe(true);
    expect(roomAt((DRONE_HOME.x + 0.5) * TILE, (DRONE_HOME.z + 0.5) * TILE)).toBeNull();
  });

  it('schließt an die Südwand des Hauses an', () => {
    expect(APRON.z).toBe(HOUSE.z + HOUSE.d);
  });

  it('kommt von draußen in jedes Zimmer, ohne je eine Wand zu kreuzen', () => {
    for (const room of spec.rooms) {
      const flight = fly(plan.graph, homePose(), goalOf(room));
      expect(flight.crossings).toEqual([]);
      expect(flight.arrived).toBe(true);
    }
  });

  it('findet aus jedem Zimmer wieder zurück', () => {
    for (const room of spec.rooms) {
      const flight = fly(plan.graph, poseAt(room), home);
      expect(flight.crossings).toEqual([]);
      expect(flight.arrived).toBe(true);
    }
  });

  it('kommt nicht mehr heraus, wenn jemand die Haustür zumacht', () => {
    const locked = housePlan(spec, new Set([spec.frontDoor]));
    const entry = roomOf(spec, spec.entryRoom) ?? spec.rooms[0]!;
    const route = routeTo(locked.graph, poseAt(entry), home);
    expect(route.complete).toBe(false);
  });
});

/**
 * **Der Scheinwerfer erholt sich, der Akku tat es nicht.**
 *
 * Vorher lief eine einzige Ladung durch und war nach vier Minuten weg; danach
 * lag die Drohne im Haus und die Rolle war für den Rest der Runde vorbei.
 * Nachgerechnet wird deshalb nicht, dass es eine Zahl gibt, sondern die drei
 * Zusagen, an denen die neue Regel hängt: Sie **kommt zurück**, sie kommt
 * **langsamer zurück, als sie geht**, und sie tut beides unabhängig davon, wie
 * viele Bilder je Sekunde das Telefon gerade schafft.
 */
describe('Die Ladung des Scheinwerfers', () => {
  it('leert sich beim Brennen und füllt sich wieder auf', () => {
    expect(lampAfter(1, LAMP_LIFE, true)).toBeCloseTo(0, 6);
    expect(lampAfter(0, LAMP_FILL, false)).toBeCloseTo(1, 6);
  });

  /**
   * **An der Einsatzzentrale hängt sie am Kabel** — und das ist der einzige Grund, aus dem ein
   * Pilot freiwillig zurückfliegt, statt mit halber Ladung weiterzustochern.
   * Ohne den Unterschied wäre „zurück zur Einsatzzentrale" ein Knopf, den niemand drückt.
   */
  it('zehrt an der Einsatzzentrale auch mit brennendem Scheinwerfer nicht', () => {
    expect(lampAfter(0.5, 10, true, true)).toBeGreaterThan(0.5);
    expect(lampAfter(1, LAMP_LIFE, true, true)).toBeCloseTo(1, 6);
  });

  it('lädt an der Einsatzzentrale schneller als im Haus', () => {
    expect(LAMP_HOME).toBeLessThan(LAMP_FILL);
    expect(lampAfter(0, LAMP_HOME, false, true)).toBeCloseTo(1, 6);
    expect(lampAfter(0, LAMP_HOME, false, false)).toBeLessThan(1);
  });

  it('sagt die Wartezeit an der Einsatzzentrale im Schnellgang an', () => {
    expect(lampRefill(0, true)).toBeCloseTo(LAMP_HOME, 6);
    expect(lampRefill(0)).toBeCloseTo(LAMP_FILL, 6);
  });

  it('bleibt zwischen leer und voll', () => {
    expect(lampAfter(0.1, 999, true)).toBe(0);
    expect(lampAfter(0.9, 999, false)).toBe(1);
  });

  /**
   * Andersherum wäre der Knopf keine Entscheidung mehr: Was sich schneller
   * füllt, als es sich leert, ist immer an.
   */
  it('füllt sich langsamer, als sie sich leert', () => {
    expect(LAMP_FILL).toBeGreaterThan(LAMP_LIFE);
    const burnt = 1 - lampAfter(1, 10, true);
    const gained = lampAfter(0, 10, false);
    expect(gained).toBeLessThan(burnt);
  });

  /**
   * **Sechzig kleine Schritte enden, wo ein großer endet.** Sonst hinge die
   * Brenndauer daran, wie flüssig das Bild läuft — und der Pilot auf dem alten
   * Telefon hätte länger Licht als der auf dem neuen.
   */
  it('rechnet unabhängig von der Bildrate', () => {
    let charge = 1;
    for (let i = 0; i < 60; i++) charge = lampAfter(charge, 1 / 60, true);
    expect(charge).toBeCloseTo(lampAfter(1, 1, true), 6);
  });

  it('sagt die Sekunden an, die noch drinstecken', () => {
    expect(lampSeconds(1)).toBeCloseTo(LAMP_LIFE, 6);
    expect(lampSeconds(0)).toBe(0);
    expect(lampRefill(1)).toBe(0);
    expect(lampRefill(0)).toBeCloseTo(LAMP_FILL, 6);
  });
});

/**
 * **Der Ausblick hängt an der Form des Bildes** — und `three` rechnet in der
 * senkrechten Achse.
 *
 * Der Pilot zieht sein Bild vom Kinostreifen aufs Vollbild und zurück. Bliebe
 * dabei der senkrechte Winkel stehen, wäre derselbe Wert einmal Weitwinkel und
 * einmal Fernrohr — und er merkte nur, dass er auf einmal nichts mehr findet.
 * Festgehalten wird deshalb der **waagerechte** Winkel; nachgerechnet wird
 * genau das.
 */
describe('Der Öffnungswinkel der Drohnenkamera', () => {
  /** Wie weit die Kamera bei diesem senkrechten Winkel zur Seite schaut. */
  function across(fov: number, aspect: number): number {
    return (Math.atan(Math.tan((fov * Math.PI) / 360) * aspect) * 360) / Math.PI;
  }

  it('hält den waagerechten Ausblick über alle Bildformen', () => {
    // Vom Kinostreifen (21:9) bis zum querliegenden Vollbild (3:2).
    for (const aspect of [21 / 9, 2, 16 / 9, 1.5]) {
      expect(across(droneFov(aspect), aspect)).toBeCloseTo(DRONE_HFOV, 4);
    }
  });

  /**
   * Hochkant geht das nicht mehr auf: 118° waagerecht wären senkrecht weit
   * über 140°, und ein so gebogenes Bild ist keine Hilfe mehr. Die Grenze
   * fängt das ab — und muss es auch sichtbar tun.
   */
  it('biegt das hochkante Vollbild nicht auf', () => {
    const tall = droneFov(0.46);
    expect(tall).toBeLessThanOrEqual(104);
    expect(across(tall, 0.46)).toBeLessThan(DRONE_HFOV);
  });

  it('bleibt auch im Kinostreifen weiter als die alten 70°', () => {
    expect(droneFov(21 / 9)).toBeGreaterThan(70);
  });

  it('hält auch einen unsinnigen Wert im Rahmen', () => {
    expect(droneFov(0)).toBeLessThanOrEqual(104);
    expect(droneFov(99)).toBeGreaterThanOrEqual(66);
  });
});
