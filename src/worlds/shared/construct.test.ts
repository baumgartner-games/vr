import * as THREE from 'three';
import type { UseSource, Usable } from '../../core/usable';
import {
  ConstructRoom,
  FADE_SECONDS,
  FLOOR_TILES,
  RACK_ARC,
  RACK_GAP,
  RACK_REACH,
  RACK_RING_STEP,
  RACK_ROW_HEIGHTS,
  RISE,
  RISE_SECONDS,
  RISE_STAGGER,
  TILE_SIZE,
  rackSlots,
  type ConstructHost,
  type ConstructItem,
  type RackSlot,
} from './construct';

/**
 * **Der weiße Raum, nachgerechnet** (`worlds/shared/construct.ts`).
 *
 * Zwei Sorten Fehler kann dieser Raum machen, und beide sieht man in der
 * Brille erst, wenn es zu spät ist: Ein Stück, das außerhalb der Armlänge aus
 * dem Boden fährt, findet man nicht — man kann ja nicht hingehen. Und eine
 * Welt, die nach dem Verlassen nicht mehr ganz die alte ist (ein Material, das
 * durchsichtig geblieben ist, ein Möbel, das jetzt sichtbar ist, obwohl es
 * versteckt sein sollte), fällt erst drei Zonen später auf, und dann sucht man
 * dort.
 *
 * Also hier: die Plätze rechnen wir nach, und die Buchführung des Verblassens
 * prüfen wir an einem Baum aus drei Netzen — ohne Renderer, wie alles hier.
 */

const SOURCE: UseSource = {
  kind: 'player',
  at: new THREE.Vector3(),
  forward: new THREE.Vector3(0, 0, -1),
};

function distance(a: RackSlot, b: RackSlot): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Der kleinste Abstand zweier Plätze — die Zahl, die über „greift daneben" entscheidet. */
function closest(slots: readonly RackSlot[]): number {
  let least = Infinity;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      least = Math.min(least, distance(slots[i]!, slots[j]!));
    }
  }
  return least;
}

describe('Wo die Auswahl steht (`rackSlots`)', () => {
  test('ohne Stücke gibt es kein Regal', () => {
    expect(rackSlots(0)).toEqual([]);
    expect(rackSlots(-3)).toEqual([]);
    expect(rackSlots(Number.NaN)).toEqual([]);
    expect(rackSlots(0.5)).toEqual([]);
  });

  test('ein einziges Stück steht geradeaus in Handhöhe', () => {
    const [only] = rackSlots(1);
    expect(only).toBeDefined();
    expect(only!.x).toBeCloseTo(0, 9);
    expect(only!.z).toBeCloseTo(-RACK_REACH, 9);
    // Vorn ist −z, und die erste Reihe ist die mittlere.
    expect(only!.y).toBe(RACK_ROW_HEIGHTS[0]);
  });

  test('es kommen genau so viele Plätze heraus, wie gefragt waren', () => {
    for (const count of [1, 2, 3, 7, 12, 13, 26, 39, 50, 120]) {
      expect(rackSlots(count)).toHaveLength(count);
    }
  });

  test('kein Stück steht in einem anderen', () => {
    for (const count of [2, 3, 5, 12, 13, 24, 39, 50]) {
      // Der Anspruch ist die Sehne `RACK_GAP`; die Rundung auf ganze Plätze
      // je Bogen darf davon nichts abziehen.
      expect(closest(rackSlots(count))).toBeGreaterThanOrEqual(RACK_GAP - 1e-9);
    }
  });

  test('alles bleibt in Reichweite einer Figur, die sich nicht von der Stelle bewegt', () => {
    // Zwei Bögen, mehr gibt es nicht — auch nicht für zweihundert Stücke.
    for (const count of [1, 20, 50, 200]) {
      for (const slot of rackSlots(count)) {
        expect(Math.hypot(slot.x, slot.z)).toBeLessThanOrEqual(RACK_REACH + RACK_RING_STEP + 1e-9);
        expect(RACK_ROW_HEIGHTS).toContain(slot.y);
        // Und innerhalb des Bogens: eine Vierteldrehung nach links oder rechts.
        expect(Math.abs(Math.atan2(slot.x, -slot.z))).toBeLessThanOrEqual(RACK_ARC / 2 + 1e-9);
      }
    }
  });

  test('gefüllt wird mittlere Reihe, obere Reihe, untere Reihe', () => {
    const many = rackSlots(50);
    const heights = many.map((slot) => slot.y);
    const first = heights.indexOf(RACK_ROW_HEIGHTS[1]!);
    const second = heights.indexOf(RACK_ROW_HEIGHTS[2]!);
    // Die mittlere steht ganz vorn, und zwar voll, bevor die obere anfängt.
    expect(heights[0]).toBe(RACK_ROW_HEIGHTS[0]);
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
    expect(heights.slice(0, first).every((y) => y === RACK_ROW_HEIGHTS[0])).toBe(true);
    expect(heights.slice(first, second).every((y) => y === RACK_ROW_HEIGHTS[1])).toBe(true);
  });

  test('eine Reihe stapelt nicht, sie geht nach außen', () => {
    const slots = rackSlots(40, { rows: 1 });
    expect(slots.every((slot) => slot.y === RACK_ROW_HEIGHTS[0])).toBe(true);
    const radii = new Set(slots.map((slot) => Math.hypot(slot.x, slot.z).toFixed(6)));
    expect(radii.size).toBe(2);
  });

  test('der zweite Bogen liegt weiter draußen und versetzt', () => {
    const slots = rackSlots(50);
    const outer = slots.filter(
      (slot) => Math.hypot(slot.x, slot.z) > RACK_REACH + RACK_RING_STEP / 2,
    );
    expect(outer.length).toBeGreaterThan(0);
    for (const slot of outer) {
      expect(Math.hypot(slot.x, slot.z)).toBeCloseTo(RACK_REACH + RACK_RING_STEP, 9);
    }
    // Versetzt: kein Stück des äußeren Bogens steht genau hinter einem des inneren.
    const inner = slots.filter((slot) => Math.hypot(slot.x, slot.z) < RACK_REACH + 1e-9);
    for (const back of outer) {
      const angle = Math.atan2(back.x, -back.z);
      for (const front of inner) {
        expect(Math.abs(Math.atan2(front.x, -front.z) - angle)).toBeGreaterThan(1e-3);
      }
    }
  });

  test('dieselbe Frage bekommt dieselbe Antwort', () => {
    expect(rackSlots(17)).toEqual(rackSlots(17));
    expect(rackSlots(17, { rows: 2, reach: 1 })).toEqual(rackSlots(17, { rows: 2, reach: 1 }));
    // Und eine andere Frage eine andere: Die Reihe rückt mittig, wenn sie wächst.
    expect(rackSlots(2)).not.toEqual(rackSlots(3).slice(0, 2));
  });

  test('Unsinn bei Reihen und Reichweite wird zurechtgerückt', () => {
    expect(rackSlots(9, { rows: 0 })).toEqual(rackSlots(9, { rows: 1 }));
    expect(rackSlots(9, { rows: 99 })).toEqual(rackSlots(9, { rows: RACK_ROW_HEIGHTS.length }));
    expect(rackSlots(9, { rows: Number.NaN })).toEqual(rackSlots(9));
    expect(rackSlots(9, { reach: Number.NaN })).toEqual(rackSlots(9));
    // Eine Reichweite von zehn Metern ist keine Reichweite.
    for (const slot of rackSlots(9, { reach: 10 })) {
      expect(Math.hypot(slot.x, slot.z)).toBeLessThanOrEqual(RACK_REACH + RACK_RING_STEP + 1e-9);
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

function items(count: number, picked: string[], close = false): ConstructItem[] {
  return Array.from({ length: count }, (_, i) => ({
    object: mesh(`item-${i}`),
    label: `Stück ${i}`,
    pick: () => {
      picked.push(`item-${i}`);
      return close;
    },
  }));
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

    expect(host.registered.size).toBe(4);
    const usable = host.registered.get(choice[2]!.object)!;
    expect(usable.usePrompt?.()).toBe('Stück 2');
    expect(usable.interaction).toBe('press');

    room.leave();
    expect(host.registered.size).toBe(0);
    expect(host.removals).toBe(4);
  });

  test('die Stücke fahren aus dem Boden und stehen dann auf ihren Plätzen', () => {
    const { host, room, anchor } = world();
    const choice = items(3, []);
    const slots = rackSlots(3);
    room.enter({ anchor, at: new THREE.Vector3(), items: choice });

    // Vor dem ersten Bild steckt alles unter dem Boden — und das erste Stück
    // kommt vor dem letzten heraus.
    expect(choice[0]!.object.position.y).toBeCloseTo(slots[0]!.y - RISE, 6);
    room.update(RISE_STAGGER);
    expect(choice[0]!.object.position.y).toBeGreaterThan(choice[2]!.object.position.y);

    room.update(2 * RISE_STAGGER + RISE_SECONDS);
    choice.forEach((item, i) => {
      expect(item.object.parent).not.toBe(host.root);
      expect(item.object.position.x).toBeCloseTo(slots[i]!.x, 6);
      expect(item.object.position.y).toBeCloseTo(slots[i]!.y, 6);
      expect(item.object.position.z).toBeCloseTo(slots[i]!.z, 6);
    });
  });

  test('geliehene Stücke gehen heil wieder hinaus', () => {
    const { room, anchor } = world();
    const choice = items(2, []);
    const spies = choice.map((item) => {
      const object = item.object as Block;
      return [jest.spyOn(object.geometry, 'dispose'), jest.spyOn(object.material, 'dispose')];
    });
    room.enter({ anchor, at: new THREE.Vector3(), items: choice });
    room.update(FADE_SECONDS);
    room.leave();
    room.update(FADE_SECONDS);

    for (const item of choice) expect(item.object.parent).toBeNull();
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

    expect(host.registered.get(choice[1]!.object)!.use(SOURCE)).toBe(true);
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
    host.registered.get(choice[0]!.object)!.use(SOURCE);
    room.update(0.016);
    expect(picked).toEqual(['item-0']);
    expect(room.open).toBe(true);
    expect(host.registered.size).toBe(2);
  });

  test('der Boden sind zwei Netze und nicht zweihundertfünfundzwanzig', () => {
    const { host, room, anchor } = world();
    room.enter({ anchor, at: new THREE.Vector3(2, 0, -3), items: [] });
    const stage = host.root.children.find((child) => child.name === 'construct')!;
    expect(stage).toBeDefined();
    expect(stage.position.x).toBeCloseTo(2, 6);
    expect(stage.position.z).toBeCloseTo(-3, 6);
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
    const tiles = stage.children[0]!.children.find(
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
    for (const item of choice) expect(item.object.parent).toBeNull();
  });
});
