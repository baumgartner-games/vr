import { generateHouse, roomOf } from '../house';
import { ROOM_COUNTS } from '../mission';
import { roomBounds, stationLayout } from '../stationLayout';
import {
  CARGO_PER_ROOM,
  cargoLabel,
  cargoOf,
  taskCargo,
  type CargoSlot,
  type MarkColour,
} from './cargo';

/**
 * **Hundert Häuser, einmal gebaut.**
 *
 * Das Stellen der Module (`stationLayout`) kostet je Haus rund eine fünftel
 * Sekunde — deshalb baut diese Suite ihre Häuser einmal und reicht sie durch
 * alle Prüfungen weiter. Nur der Determinismus braucht zweite Häuser, und der
 * baut sie sich selbst; genau darum geht es dort.
 */
const SEEDS = 100;
const ROOMS = ROOM_COUNTS[0];
function house(seed: number, rooms: number = ROOMS) {
  return generateHouse(seed, rooms);
}
const houses = Array.from({ length: SEEDS }, (_, i) => house(i + 1));

describe('Kisten einer Runde', () => {
  it('würfelt aus demselben Samen dieselbe Liste — über hundert Häuser', () => {
    houses.forEach((spec, index) => {
      const twin = house(index + 1);
      expect(twin).not.toBe(spec);
      expect(cargoOf(twin)).toEqual(cargoOf(spec));
    });
  });

  it('gibt zu einem `spec` immer dieselbe Liste zurück, ohne neu zu rechnen', () => {
    const spec = houses[6]!;
    expect(cargoOf(spec)).toBe(cargoOf(spec));
  });

  it('rührt die Wurfreihenfolge des Hauses nicht an', () => {
    // Der Vertrag von `generateHouse`: Wer dort würfelt, baut ein anderes
    // Haus. Die Kisten haben deshalb einen eigenen Strom — und ein Haus, das
    // schon Kisten kennt, ist dasselbe wie eines, das noch keine hat.
    const untouched = house(13);
    const asked = houses[12]!;
    cargoOf(asked);
    expect(asked).toEqual(untouched);
  });

  it('steht mit jeder Kiste dort, wo der Packer sie hingestellt hat', () => {
    for (const spec of houses) {
      const placed = stationLayout(spec)
        .filter((p) => p.kind === 'cargo')
        .map((p) => p.id);
      expect(cargoOf(spec).map((slot) => slot.id)).toEqual(placed);
    }
  });

  it('vergibt Farbe und Nummer je Raum eindeutig', () => {
    for (const spec of houses) {
      const byRoom = new Map<string, CargoSlot[]>();
      for (const slot of cargoOf(spec))
        byRoom.set(slot.roomId, [...(byRoom.get(slot.roomId) ?? []), slot]);
      for (const [roomId, slots] of byRoom) {
        expect(slots.length).toBeGreaterThanOrEqual(CARGO_PER_ROOM[0]);
        expect(slots.length).toBeLessThanOrEqual(CARGO_PER_ROOM[1]);
        const colours = new Set<MarkColour>(slots.map((slot) => slot.mark.colour));
        const numbers = new Set(slots.map((slot) => slot.mark.number));
        expect(`${roomId}: ${colours.size}/${numbers.size}`).toBe(
          `${roomId}: ${slots.length}/${slots.length}`,
        );
      }
    }
  });

  it('füllt genau drei Aufgabenteile, vier Werkzeuge, und lässt den Rest leer', () => {
    for (const spec of houses) {
      const slots = cargoOf(spec);
      const parts = slots.filter((slot) => slot.loot.kind === 'part');
      const tools = slots.filter((slot) => slot.loot.kind === 'tool');
      const empty = slots.filter((slot) => slot.loot.kind === 'empty');
      expect(parts).toHaveLength(spec.tasks.length);
      expect(tools).toHaveLength(4);
      expect(
        tools
          .map((slot) => (slot.loot.kind === 'tool' ? slot.loot.tool : ''))
          .sort()
          .join(),
      ).toBe('medkit,medkit,radar,xray');
      expect(empty.length).toBe(slots.length - parts.length - tools.length);
      expect(empty.length).toBeGreaterThan(0);
    }
  });

  it('legt jedes Aufgabenteil in eine Kiste seines Aufgabenraums', () => {
    for (const spec of houses) {
      for (const task of spec.tasks) {
        const slot = taskCargo(spec, task.id);
        expect(slot.roomId).toBe(task.roomId);
        expect(slot.loot).toEqual({ kind: 'part', taskId: task.id });
      }
    }
  });

  it('sagt Kennzeichen und Wand so an, wie der Archivar es vorliest', () => {
    for (const slot of houses.flatMap((spec) => cargoOf(spec))) {
      expect(cargoLabel(slot)).toBe(`Kiste ${slot.mark.number} · ${slot.mark.colour}`);
      expect(slot.clue).toMatch(
        /^Kiste [1-3], (rotes|blaues|gelbes|grünes) Band · (Nord|Ost|Süd|West)wand$/,
      );
    }
  });

  /**
   * **Der Hinweis muss stimmen, sonst schickt der Archivar an die falsche
   * Wand.** Die Wand kommt aus der Drehung des Moduls (`wallOf`) und nicht aus
   * seiner Lage; hier wird beides gegeneinander gerechnet.
   */
  it('nennt die Wand, an der die Kiste wirklich steht', () => {
    for (const spec of houses) {
      const layout = stationLayout(spec);
      for (const slot of cargoOf(spec)) {
        const p = layout.find((one) => one.id === slot.id)!;
        const b = roomBounds(roomOf(spec, slot.roomId)!);
        const nearest = (
          [
            ['Nordwand', p.z - b.minZ],
            ['Südwand', b.maxZ - p.z],
            ['Westwand', p.x - b.minX],
            ['Ostwand', b.maxX - p.x],
          ] as Array<[string, number]>
        ).sort((one, other) => one[1] - other[1])[0]![0];
        expect(`${slot.id}: ${slot.clue.split('· ')[1]}`).toBe(`${slot.id}: ${nearest}`);
      }
    }
  });

  it('kennt keine Kiste zu einer Aufgabe, die es nicht gibt', () => {
    expect(() => taskCargo(houses[8]!, 'kein-teil')).toThrow(/kein-teil/);
  });
});
