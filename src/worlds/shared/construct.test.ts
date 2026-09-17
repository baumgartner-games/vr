import * as THREE from 'three';
import type { UseSource, Usable } from '../../core/usable';
import {
  ConstructRoom,
  FADE_SECONDS,
  FLOOR_TILES,
  RISE,
  RISE_SECONDS,
  RISE_STAGGER,
  TILE_CLEAR,
  TILE_SIZE,
  floorTilesFor,
  tileSlots,
  type ConstructHost,
  type ConstructItem,
  type ConstructSlot,
} from './construct';

/**
 * **Der weiße Raum, nachgerechnet** (`worlds/shared/construct.ts`).
 *
 * Zwei Sorten Fehler kann dieser Raum machen, und beide sieht man in der
 * Brille erst, wenn es zu spät ist: Ein Stück, das neben dem Kachelboden im
 * Nichts steht oder in einem anderen, findet man nicht — man kann ja nicht
 * hingehen. Und eine Welt, die nach dem Verlassen nicht mehr ganz die alte ist
 * (ein Material, das durchsichtig geblieben ist, ein Möbel, das jetzt sichtbar
 * ist, obwohl es versteckt sein sollte), fällt erst drei Zonen später auf, und
 * dann sucht man dort.
 *
 * Also hier: die Plätze rechnen wir nach, und die Buchführung des Verblassens
 * prüfen wir an einem Baum aus drei Netzen — ohne Renderer, wie alles hier.
 */

const SOURCE: UseSource = {
  kind: 'player',
  at: new THREE.Vector3(),
  forward: new THREE.Vector3(0, 0, -1),
};

/** Der Ring, auf dem ein Platz liegt, in Kacheln von der Mitte aus. */
function ring(slot: ConstructSlot): number {
  return Math.max(Math.abs(slot.x), Math.abs(slot.z)) / TILE_SIZE;
}

/** Der kleinste Abstand zweier Plätze — die Zahl, die über „greift daneben" entscheidet. */
function closest(slots: readonly ConstructSlot[]): number {
  let least = Infinity;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]!;
      const b = slots[j]!;
      least = Math.min(least, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
    }
  }
  return least;
}

describe('Wo die Auswahl steht (`tileSlots`)', () => {
  test('ohne Stücke gibt es kein Regal', () => {
    expect(tileSlots(0)).toEqual([]);
    expect(tileSlots(-3)).toEqual([]);
    expect(tileSlots(Number.NaN)).toEqual([]);
    expect(tileSlots(0.5)).toEqual([]);
  });

  test('es kommen genau so viele Plätze heraus, wie gefragt waren', () => {
    for (const count of [1, 2, 3, 7, 12, 13, 26, 39, 50, 120]) {
      expect(tileSlots(count)).toHaveLength(count);
    }
  });

  test('jedes Stück steht auf einer Kachelmitte und auf dem Boden', () => {
    for (const slot of tileSlots(120)) {
      // Kachelmitten des Bodens sind ganze Vielfache der Kantenlänge, gemessen
      // von der Mitte aus — und die Mitte ist die Kachel des Ankers.
      expect(Number.isInteger(slot.x / TILE_SIZE)).toBe(true);
      expect(Number.isInteger(slot.z / TILE_SIZE)).toBe(true);
      // Auf dem Boden und nicht darüber: Das ist der ganze Umbau.
      expect(slot.y).toBe(0);
    }
  });

  test('um die Mitte herum bleiben zwei Kacheln frei', () => {
    for (const slot of tileSlots(120)) {
      expect(ring(slot)).toBeGreaterThan(TILE_CLEAR);
    }
  });

  test('die Kreuzmitte bleibt frei — vier Gassen nach draußen', () => {
    for (const slot of tileSlots(120)) {
      expect(slot.x).not.toBe(0);
      expect(slot.z).not.toBe(0);
    }
  });

  test('der erste Ring fasst zwanzig Stücke, dann kommt der übernächste', () => {
    // Der Rand eines Quadrats mit drei Kacheln Halbmesser sind 8 · 3 = 24
    // Kacheln, abzüglich der vier der Kreuzmitte.
    const full = tileSlots(20);
    expect(full.every((slot) => ring(slot) === TILE_CLEAR + 1)).toBe(true);
    expect(new Set(full.map((slot) => `${slot.x},${slot.z}`)).size).toBe(20);

    const more = tileSlots(21);
    expect(ring(more[20]!)).toBe(TILE_CLEAR + 3);
    // Ein Ring dazwischen bleibt leer, damit der äußere nicht hinter dem
    // inneren verschwindet.
    expect(more.some((slot) => ring(slot) === TILE_CLEAR + 2)).toBe(false);
  });

  test('kein Stück steht in einem anderen', () => {
    for (const count of [2, 3, 5, 12, 13, 24, 39, 50, 120]) {
      expect(closest(tileSlots(count))).toBeGreaterThanOrEqual(TILE_SIZE - 1e-9);
    }
  });

  test('gefüllt wird von innen nach außen', () => {
    const rings = tileSlots(120).map(ring);
    for (let i = 1; i < rings.length; i++) {
      expect(rings[i]!).toBeGreaterThanOrEqual(rings[i - 1]!);
    }
  });

  test('das erste Stück steht dort, wo die Figur hinsieht', () => {
    // Blick nach −z: Die Kreuzmitte davor ist frei, also steht das erste Stück
    // auf der Kachel gleich daneben — und das zweite spiegelbildlich.
    const ahead = tileSlots(2);
    expect(ahead[0]).toEqual({ x: TILE_SIZE, y: 0, z: -3 * TILE_SIZE });
    expect(ahead[1]).toEqual({ x: -TILE_SIZE, y: 0, z: -3 * TILE_SIZE });
    // Und wer nach +x sieht, bekommt dasselbe um eine Vierteldrehung gedreht.
    const right = tileSlots(2, { facing: Math.PI / 2 });
    expect(right[0]).toEqual({ x: 3 * TILE_SIZE, y: 0, z: TILE_SIZE });
    expect(right[1]).toEqual({ x: 3 * TILE_SIZE, y: 0, z: -TILE_SIZE });
  });

  test('dieselbe Frage bekommt dieselbe Antwort', () => {
    expect(tileSlots(17)).toEqual(tileSlots(17));
    expect(tileSlots(17, { facing: 1.2 })).toEqual(tileSlots(17, { facing: 1.2 }));
    // Eine Blickrichtung ohne Zahl ist geradeaus.
    expect(tileSlots(9, { facing: Number.NaN })).toEqual(tileSlots(9));
    // Und ein Platz, der einmal vergeben ist, bleibt vergeben: Wer ein Stück
    // mehr mitbringt, bekommt dieselbe Liste und eines hinten dran.
    expect(tileSlots(9)).toEqual(tileSlots(10).slice(0, 9));
  });

  test('der Boden wächst mit, bis das letzte Stück darauf steht', () => {
    // Die üblichen Größen kommen auf dem ausgelieferten Boden unter.
    expect(floorTilesFor(0)).toBe(FLOOR_TILES);
    expect(floorTilesFor(20)).toBe(FLOOR_TILES);
    // Und was darüber hinausgeht, bekommt mehr Boden statt weniger Kachel.
    for (const count of [1, 20, 21, 57, 120, 400]) {
      const half = floorTilesFor(count);
      expect(half).toBeGreaterThanOrEqual(FLOOR_TILES);
      for (const slot of tileSlots(count)) {
        expect(Math.abs(slot.x) / TILE_SIZE).toBeLessThanOrEqual(half);
        expect(Math.abs(slot.z) / TILE_SIZE).toBeLessThanOrEqual(half);
      }
    }
  });
});

/** Ein Netz mit genau einem Material — so bleibt `object.material` im Test eine Sache. */
type Block = THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;

/** Ein Netz mit eigenem Material — das kleinste Stück Welt, das verblassen kann. */
function mesh(name: string, material?: THREE.MeshStandardMaterial): Block {
  const object = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    material ?? new THREE.MeshStandardMaterial({ color: 0x888888 }),
  );
  object.name = name;
  return object;
}

/** Was `ConstructHost` verspricht, als Mitschrift. */
class FakeHost implements ConstructHost {
  readonly root = new THREE.Group();
  readonly registered = new Map<THREE.Object3D, Usable>();
  readonly messages: string[] = [];
  removals = 0;

  addUsable(object: THREE.Object3D, usable: Usable): void {
    this.registered.set(object, usable);
  }

  removeUsable(object: THREE.Object3D): void {
    if (this.registered.delete(object)) this.removals++;
  }

  notify(message: string): void {
    this.messages.push(message);
  }
}

/** Eine Welt aus drei Ästen: Anker, Möbel, Boden — und ein Raum darüber. */
function world(): {
  host: FakeHost;
  room: ConstructRoom;
  anchor: Block;
  furniture: Block;
  ground: Block;
} {
  const host = new FakeHost();
  const anchor = mesh('wardrobe');
  // Der Schrank steht auf dem Boden und steckt nicht darin: Der Construct-Boden
  // legt sich unter seine Fußkante, und die soll hier bei 0 liegen.
  anchor.position.y = 0.1;
  const furniture = mesh('shelf');
  const ground = mesh('ground');
  ground.material.transparent = true;
  ground.material.opacity = 0.8;
  ground.material.depthWrite = false;
  host.root.add(anchor, furniture, ground);
  return { host, room: new ConstructRoom(host), anchor, furniture, ground };
}

/**
 * Ein Stück mit Mitschrift: `object()` gibt immer dasselbe Netz und zählt mit,
 * wie oft danach gefragt wurde — daran hängt die Zusage, dass der Raum jedes
 * Stück genau einmal je Besuch baut und keins auf Vorrat.
 */
interface TestItem extends ConstructItem {
  readonly mesh: Block;
  readonly builds: () => number;
}

function items(count: number, picked: string[], close = false): TestItem[] {
  return Array.from({ length: count }, (_, i) => {
    const block = mesh(`item-${i}`);
    let builds = 0;
    return {
      mesh: block,
      builds: () => builds,
      object: () => {
        builds++;
        return block;
      },
      label: `Stück ${i}`,
      pick: () => {
        picked.push(`item-${i}`);
        return close;
      },
    };
  });
}

describe('Der Construct-Raum', () => {
  test('beim Betreten verblasst die Welt und verschwindet dann ganz', () => {
    const { host, room, anchor, furniture } = world();
    room.enter({ anchor, at: new THREE.Vector3(2, 0, -3), items: [], title: 'Kleiderschrank' });
    expect(host.messages).toEqual(['Kleiderschrank']);

    // Auf halbem Weg: durchsichtig, aber noch da.
    room.update(FADE_SECONDS / 2);
    expect(furniture.material.transparent).toBe(true);
    expect(furniture.material.opacity).toBeCloseTo(0.5, 6);
    expect(furniture.material.depthWrite).toBe(false);
    expect(furniture.visible).toBe(true);

    // Unten angekommen: unsichtbar — und die Flaggen sind wieder die alten,
    // damit nichts in der Sortierung der durchsichtigen Dinge hängen bleibt.
    room.update(FADE_SECONDS / 2);
    expect(furniture.visible).toBe(false);
    expect(furniture.material.transparent).toBe(false);
    expect(furniture.material.opacity).toBe(1);
    expect(furniture.material.depthWrite).toBe(true);
  });

  test('der Anker bleibt sichtbar, opak und an seinem Platz im Baum', () => {
    const { host, room, anchor } = world();
    room.enter({ anchor, at: new THREE.Vector3(), items: [] });
    room.update(FADE_SECONDS);
    expect(anchor.visible).toBe(true);
    expect(anchor.parent).toBe(host.root);
    expect(anchor.material.transparent).toBe(false);
    expect(anchor.material.opacity).toBe(1);
  });

  test('ein Material, das sich Anker und Welt teilen, wird nicht angefasst', () => {
    const host = new FakeHost();
    const shared = new THREE.MeshStandardMaterial({ color: 0x334455 });
    const anchor = mesh('desk', shared);
    const wall = mesh('wall', shared);
    const lamp = mesh('lamp');
    host.root.add(anchor, wall, lamp);
    const room = new ConstructRoom(host);

    room.enter({ anchor, at: new THREE.Vector3(), items: [] });
    room.update(FADE_SECONDS / 2);
    expect(shared.opacity).toBe(1);
    expect(shared.transparent).toBe(false);
    expect(lamp.material.opacity).toBeCloseTo(0.5, 6);
    room.update(FADE_SECONDS);
    expect(shared.opacity).toBe(1);
    // Die Wand verschwindet trotzdem: Sie gehört zur Welt, nicht zum Anker —
    // sie blendet nur nicht aus, sie hört auf.
    expect(wall.visible).toBe(false);
    expect(anchor.visible).toBe(true);
  });

  test('das Verlassen stellt jede Flagge genau wieder her', () => {
    const { room, anchor, furniture, ground } = world();
    const before = [furniture, ground].map((object) => ({
      transparent: object.material.transparent,
      opacity: object.material.opacity,
      depthWrite: object.material.depthWrite,
      visible: object.visible,
    }));

    room.enter({ anchor, at: new THREE.Vector3(), items: [] });
    room.update(FADE_SECONDS);
    room.leave();
    // Sichtbar sofort, damit es einblenden kann und nicht erscheint.
    expect(furniture.visible).toBe(true);
    expect(ground.material.opacity).toBeCloseTo(0, 6);
    room.update(FADE_SECONDS / 2);
    expect(ground.material.opacity).toBeCloseTo(0.4, 6);
    room.update(FADE_SECONDS / 2);

    expect(
      [furniture, ground].map((object) => ({
        transparent: object.material.transparent,
        opacity: object.material.opacity,
        depthWrite: object.material.depthWrite,
        visible: object.visible,
      })),
    ).toEqual(before);
  });

  test('was vorher schon versteckt war, bleibt versteckt', () => {
    const { room, anchor, furniture } = world();
    furniture.visible = false;
    room.enter({ anchor, at: new THREE.Vector3(), items: [] });
    room.update(FADE_SECONDS);
    room.leave();
    room.update(FADE_SECONDS);
    expect(furniture.visible).toBe(false);
  });

  test('die Stücke werden an- und wieder abgemeldet', () => {
    const { host, room, anchor } = world();
    const picked: string[] = [];
    const choice = items(4, picked);
    room.enter({ anchor, at: new THREE.Vector3(), items: choice });
    // Angemeldet wird ein Stück, wenn es aufgefahren ist und nicht vorher —
    // also erst die Welle abwarten (`die Stücke entstehen nacheinander`).
    room.update(4 * RISE_STAGGER + RISE_SECONDS);

    expect(host.registered.size).toBe(4);
    const usable = host.registered.get(choice[2]!.mesh)!;
    expect(usable.usePrompt?.()).toBe('Stück 2');
    expect(usable.interaction).toBe('press');

    room.leave();
    expect(host.registered.size).toBe(0);
    expect(host.removals).toBe(4);
  });

  test('die Stücke fahren aus dem Boden und stehen dann auf ihren Plätzen', () => {
    const { host, room, anchor } = world();
    const choice = items(3, []);
    // Der Anker steht auf der Kachel 0/0, deren Mitte 0,5/0,5 ist; die Figur
    // steht einen Meter südlich davon und sieht also nach −z. Das ist genau
    // die Vorgabe, mit der `tileSlots` ohne Blickrichtung rechnet.
    const slots = tileSlots(3);
    room.enter({ anchor, at: new THREE.Vector3(0.5, 0, 1.5), items: choice });

    // Im ersten Bild steckt das erste Stück ganz unten im Boden, und die
    // beiden anderen gibt es noch gar nicht.
    expect(choice[0]!.mesh.position.y).toBeCloseTo(slots[0]!.y - RISE, 6);
    room.update(2 * RISE_STAGGER);
    // Jetzt sind alle drei da — und das erste ist dem letzten voraus.
    expect(choice[0]!.mesh.position.y).toBeGreaterThan(choice[2]!.mesh.position.y);

    room.update(2 * RISE_STAGGER + RISE_SECONDS);
    choice.forEach((item, i) => {
      expect(item.mesh.parent).not.toBe(host.root);
      expect(item.mesh.position.x).toBeCloseTo(slots[i]!.x, 6);
      expect(item.mesh.position.y).toBeCloseTo(slots[i]!.y, 6);
      expect(item.mesh.position.z).toBeCloseTo(slots[i]!.z, 6);
    });
  });

  test('die Stücke entstehen nacheinander, nicht alle in einem Bild', () => {
    const { host, room, anchor } = world();
    const choice = items(6, []);
    room.enter({ anchor, at: new THREE.Vector3(0.5, 0, 1.5), items: choice });

    // Im Bild des Betretens gibt es genau eines — das, das gerade auffährt.
    // Sechs auf einmal zu bauen war die Pause, die man nach dem Druck sah.
    expect(choice.map((item) => item.builds())).toEqual([1, 0, 0, 0, 0, 0]);
    expect(host.registered.size).toBe(1);

    room.update(RISE_STAGGER * 2.5);
    expect(choice[2]!.builds()).toBe(1);
    expect(choice[5]!.builds()).toBe(0);

    // Am Ende der Welle stehen alle da, und jedes ist genau einmal gebaut.
    room.update(RISE_STAGGER * 6 + RISE_SECONDS);
    expect(choice.map((item) => item.builds())).toEqual([1, 1, 1, 1, 1, 1]);
    expect(host.registered.size).toBe(6);

    // Auf dem Rückweg entsteht nichts mehr — und das gilt auch für den, der
    // sich sofort wieder verdrückt.
    const early = items(6, []);
    const second = new ConstructRoom(host);
    second.enter({ anchor, at: new THREE.Vector3(0.5, 0, 1.5), items: early });
    second.leave();
    second.update(FADE_SECONDS);
    expect(early.map((item) => item.builds())).toEqual([1, 0, 0, 0, 0, 0]);
  });

  test('`A` reicht bis zum entferntesten Stück und keinen Meter weiter', () => {
    const { room, anchor } = world();
    const choice = items(20, []);
    const at = new THREE.Vector3(0.5, 0, 1.5);
    room.enter({ anchor, at, items: choice });

    // Gemessen wird waagerecht von den Füßen, so wie `pickUsable` misst — und
    // die Mitte ist die Kachel des Ankers, nicht die Figur.
    const centre = { x: 0.5, z: 0.5 };
    let far = 0;
    for (const slot of tileSlots(20)) {
      far = Math.max(far, Math.hypot(centre.x + slot.x - at.x, centre.z + slot.z - at.z));
    }
    expect(room.reach).toBeGreaterThan(far);
    // Der Zuschlag ist der halbe Kachelabstand des Trefferzylinders, nicht mehr.
    expect(room.reach).toBeLessThan(far + TILE_SIZE / 2);
    // Und ohne Auswahl gibt es nichts zu verlängern.
    room.leave();
    room.update(FADE_SECONDS);
    room.enter({ anchor, at, items: [] });
    expect(room.reach).toBe(0);
  });

  test('geliehene Stücke gehen heil wieder hinaus', () => {
    const { room, anchor } = world();
    const choice = items(2, []);
    const spies = choice.map((item) => {
      const object = item.mesh;
      return [jest.spyOn(object.geometry, 'dispose'), jest.spyOn(object.material, 'dispose')];
    });
    room.enter({ anchor, at: new THREE.Vector3(), items: choice });
    room.update(FADE_SECONDS);
    room.leave();
    room.update(FADE_SECONDS);

    for (const item of choice) expect(item.mesh.parent).toBeNull();
    for (const pair of spies) for (const spy of pair) expect(spy).not.toHaveBeenCalled();
  });

  test('`open` sagt, wann der Raum gilt', () => {
    const { room, anchor } = world();
    expect(room.open).toBe(false);
    room.enter({ anchor, at: new THREE.Vector3(), items: [] });
    expect(room.open).toBe(true);
    room.update(FADE_SECONDS);
    expect(room.open).toBe(true);
    room.leave();
    // Beim Zurückblenden ist er schon nicht mehr offen: Es gibt nichts mehr zu
    // drücken, auch wenn man die Stücke noch versinken sieht.
    expect(room.open).toBe(false);
    room.update(FADE_SECONDS);
    expect(room.open).toBe(false);
  });

  test('zweimal betreten kostet nichts', () => {
    const { host, room, anchor, furniture } = world();
    const choice = items(2, []);
    room.enter({ anchor, at: new THREE.Vector3(), items: choice });
    room.update(FADE_SECONDS);
    room.enter({ anchor, at: new THREE.Vector3(), items: choice });
    expect(host.messages).toHaveLength(1);
    expect(host.registered.size).toBe(2);
    // Und vor allem: Die gemerkte Deckkraft ist noch die von vor dem ersten Mal.
    room.leave();
    room.update(FADE_SECONDS);
    expect(furniture.material.opacity).toBe(1);
    expect(furniture.material.transparent).toBe(false);
  });

  /**
   * **Zweimal kurz hintereinander gedrückt** — und das tut jeder, der sich
   * verdrückt hat. Die Welt darf dabei nicht erst ganz verschwinden, bevor sie
   * wiederkommt: Der Stand der Überblendung wird übernommen, nicht verworfen.
   */
  test('dreht eine laufende Überblendung um, statt sie erst zu Ende zu spielen', () => {
    const { room, anchor, furniture } = world();
    room.enter({ anchor, at: new THREE.Vector3(), items: [] });
    room.update(FADE_SECONDS * 0.4);
    const half = furniture.material.opacity;
    // Mitten drin: weder ganz da noch ganz weg.
    expect(half).toBeGreaterThan(0.1);
    expect(half).toBeLessThan(0.9);

    room.leave();
    // Kein Sprung auf null — der Rückweg fängt dort an, wo der Hinweg stand.
    expect(furniture.material.opacity).toBeCloseTo(half, 5);

    room.update(FADE_SECONDS);
    expect(furniture.visible).toBe(true);
    expect(furniture.material.opacity).toBe(1);
    expect(furniture.material.transparent).toBe(false);
  });

  test('verlassen, ohne betreten zu haben, tut nichts', () => {
    const { host, room, furniture } = world();
    expect(() => {
      room.leave();
      room.update(0.1);
    }).not.toThrow();
    expect(host.removals).toBe(0);
    expect(furniture.visible).toBe(true);
    expect(furniture.material.transparent).toBe(false);
  });

  test('ein Druck wirkt sofort, geschlossen wird erst im nächsten Bild', () => {
    const { host, room, anchor, furniture } = world();
    const picked: string[] = [];
    const choice = items(3, picked, true);
    room.enter({ anchor, at: new THREE.Vector3(), items: choice });
    room.update(FADE_SECONDS);

    expect(host.registered.get(choice[1]!.mesh)!.use(SOURCE)).toBe(true);
    expect(picked).toEqual(['item-1']);
    // Noch ist alles angemeldet — die Auswahlschleife der Welt läuft ja noch.
    expect(host.registered.size).toBe(3);
    expect(room.open).toBe(true);

    room.update(0.016);
    expect(host.registered.size).toBe(0);
    expect(room.open).toBe(false);
    room.update(FADE_SECONDS);
    expect(furniture.visible).toBe(true);
    expect(furniture.material.opacity).toBe(1);
  });

  test('ein Druck, der nicht schließt, lässt den Raum stehen', () => {
    const { host, room, anchor } = world();
    const picked: string[] = [];
    const choice = items(2, picked, false);
    room.enter({ anchor, at: new THREE.Vector3(), items: choice });
    room.update(FADE_SECONDS);
    host.registered.get(choice[0]!.mesh)!.use(SOURCE);
    room.update(0.016);
    expect(picked).toEqual(['item-0']);
    expect(room.open).toBe(true);
    expect(host.registered.size).toBe(2);
  });

  test('der Boden rastet auf der Kachel des Ankers ein, nicht auf den Füßen', () => {
    // Der Anker steht auf der Kachel 0/0 (Mitte 0,5/0,5), die Figur irgendwo
    // daneben — und zwar mit Absicht auf keiner runden Zahl. Legte sich der
    // Boden um die **Füße**, stünde der Schrank quer über vier Kacheln; genau
    // das war der Fehler, den man in der Brille als Erstes sieht.
    const { host, room, anchor } = world();
    room.enter({ anchor, at: new THREE.Vector3(1.37, 0, -0.42), items: [] });
    const stage = host.root.children.find((child) => child.name === 'construct')!;
    expect(stage.position.x).toBeCloseTo(0.5, 6);
    expect(stage.position.z).toBeCloseTo(0.5, 6);

    // Und dieselbe Kachel, egal wo die Figur steht.
    room.leave();
    room.update(FADE_SECONDS);
    room.enter({ anchor, at: new THREE.Vector3(-2.8, 0, 3.1), items: [] });
    expect(stage.position.x).toBeCloseTo(0.5, 6);
    expect(stage.position.z).toBeCloseTo(0.5, 6);
  });

  test('der Raum hört an seinem Boden auf', () => {
    // Seit man darin herumgeht, hat der weiße Boden einen Rand — und dahinter
    // gibt es weder Boden noch Schwerkraft, die einen zurückholte. Wer
    // darüber hinausliefe, stünde in einem Nichts ohne jedes Merkmal.
    const { room, anchor } = world();
    room.enter({ anchor, at: new THREE.Vector3(0.5, 0, 1.5), items: [] });

    // Der Anker steht auf der Kachel 0/0, die Mitte ist also 0,5/0,5, und der
    // Boden reicht `FLOOR_TILES` Kacheln plus eine halbe nach jeder Seite.
    const edge = (FLOOR_TILES + 0.5) * TILE_SIZE;
    const inside = new THREE.Vector3(0.5 + edge - 0.01, 0, 0.5);
    expect(room.keepInside(inside)).toBe(false);

    const outside = new THREE.Vector3(0.5 + edge + 5, 0, 0.5 - edge - 5);
    expect(room.keepInside(outside)).toBe(true);
    expect(outside.x).toBeCloseTo(0.5 + edge, 6);
    expect(outside.z).toBeCloseTo(0.5 - edge, 6);

    // Die Höhe bleibt, wie sie war: Der Rand ist eine Wand und kein Boden.
    const high = new THREE.Vector3(99, 4.2, 99);
    room.keepInside(high);
    expect(high.y).toBe(4.2);

    // Und ein geschlossener Raum klemmt niemanden — dann gilt wieder die Welt.
    room.leave();
    room.update(FADE_SECONDS);
    const free = new THREE.Vector3(99, 0, 99);
    expect(room.keepInside(free)).toBe(false);
    expect(free.x).toBe(99);
  });

  test('der Raum bringt sein eigenes Licht mit', () => {
    // Die Lichter der Welt hängen als oberstes Kind in ihrer Gruppe und gehen
    // deshalb mit ihr aus (`hideList`). Ohne eigenes Licht wäre die Auswahl ein
    // schwarzer Scherenschnitt auf weißem Boden — genau so sah es aus.
    const { host, room, anchor } = world();
    const lamp = new THREE.HemisphereLight(0xffffff, 0x000000, 1.5);
    lamp.name = 'lighting';
    host.root.add(lamp);

    room.enter({ anchor, at: new THREE.Vector3(), items: [] });
    room.update(FADE_SECONDS);
    // Das Licht der Welt ist aus …
    expect(lamp.visible).toBe(false);
    // … und das des Raums an, mit voller Stärke.
    const stage = host.root.children.find((child) => child.name === 'construct')!;
    const lights: THREE.Light[] = [];
    stage.traverse((child) => {
      if ((child as THREE.Light).isLight) lights.push(child as THREE.Light);
    });
    expect(lights.length).toBeGreaterThan(0);
    expect(lights.every((light) => light.intensity > 0)).toBe(true);

    // Und beim Verlassen geht es wieder aus, sonst bekäme die Welt einen
    // Zuschlag, den sie nie bestellt hat.
    room.leave();
    room.update(FADE_SECONDS);
    expect(lamp.visible).toBe(true);
    expect(stage.parent).toBeNull();
  });

  test('der Boden sind zwei Netze und nicht zweihundertfünfundzwanzig', () => {
    const { host, room, anchor } = world();
    room.enter({ anchor, at: new THREE.Vector3(2, 0, -3), items: [] });
    const stage = host.root.children.find((child) => child.name === 'construct')!;
    expect(stage).toBeDefined();
    // Knapp unter der Fußhöhe, gegen das Flimmern mit dem echten Boden.
    expect(stage.position.y).toBeLessThan(0);
    expect(stage.position.y).toBeCloseTo(-0.01, 6);

    const floor = stage.children.find((child) => child.name === 'construct-floor')!;
    expect(floor.children).toHaveLength(2);
    const tiles = floor.children.find(
      (child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh,
    )!;
    const side = FLOOR_TILES * 2 + 1;
    expect(tiles.count).toBe(side * side);
    expect(TILE_SIZE).toBe(1);

    // Er kommt mit der Welt herauf und ist erst am Ende ganz da.
    expect((tiles.material as THREE.Material).opacity).toBe(0);
    room.update(FADE_SECONDS);
    expect((tiles.material as THREE.Material).opacity).toBeCloseTo(1, 6);
    expect(floor.position.y).toBeCloseTo(0, 6);
  });

  test('`dispose` räumt den eigenen Boden weg und gibt die Welt zurück', () => {
    const { host, room, anchor, furniture } = world();
    const choice = items(2, []);
    room.enter({ anchor, at: new THREE.Vector3(), items: choice });
    room.update(FADE_SECONDS);

    const stage = host.root.children.find((child) => child.name === 'construct')!;
    const floor = stage.children.find((child) => child.name === 'construct-floor')!;
    const tiles = floor.children.find(
      (child): child is THREE.InstancedMesh => child instanceof THREE.InstancedMesh,
    )!;
    const spy = jest.spyOn(tiles.geometry, 'dispose');

    room.dispose();
    expect(spy).toHaveBeenCalled();
    expect(host.root.children).not.toContain(stage);
    expect(host.registered.size).toBe(0);
    expect(room.open).toBe(false);
    expect(furniture.visible).toBe(true);
    expect(furniture.material.transparent).toBe(false);
    expect(furniture.material.opacity).toBe(1);
    for (const item of choice) expect(item.mesh.parent).toBeNull();
  });
});
