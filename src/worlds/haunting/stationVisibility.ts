import { TILE } from '../nav/navTile';
import { doorMiddle, onApron, roomAt, type HouseDoor, type HouseSpec } from './house';

/** Conservative room portals: never hides the current room or looks through a shut door. */
export function visibleStationRooms(
  spec: HouseSpec,
  viewer: { x: number; z: number },
  shut: readonly string[],
  doorInView: (door: HouseDoor) => boolean,
): Set<string> | null {
  const room = roomAt(spec, Math.floor(viewer.x / TILE), Math.floor(viewer.z / TILE));
  // The command deck, external views and labs need the complete model.
  if (!room) return null;
  const visible = new Set([room.id]);
  const queue = [room.id];
  for (let index = 0; index < queue.length; index++) {
    const from = queue[index]!;
    for (const door of spec.doors) {
      if (!door.b || shut.includes(door.id)) continue;
      const next = door.a === from ? door.b : door.b === from ? door.a : null;
      if (!next || visible.has(next) || !doorInView(door)) continue;
      visible.add(next);
      queue.push(next);
    }
  }
  return visible;
}

/**
 * **Wie weit man von oben um die Ecke sieht**, in Metern: Eine offene Tür,
 * deren Mitte näher liegt, zeigt den Raum dahinter.
 */
export const TOP_DOWN_REACH = 6;

/**
 * **Was man von oben sieht: den eigenen Raum und was hinter nahen Türen
 * liegt.**
 *
 * Die Brille fragt, ob eine Türöffnung im Blickfeld liegt
 * (`HauntingWorld.cullRoomArt`) — von oben liegt aber *jede* Tür im Bild, und
 * die Kamera schaut über alle Wände hinweg in die Nachbarräume, samt dem, was
 * darin steht und geht. Von oben zählt deshalb nicht die Kamera, sondern die
 * Figur: Sichtbar ist ihr Raum und, über offene Türen, was innerhalb von
 * `reach` Metern an ihr liegt. Alles andere deckt die Welt zu
 * (`world3d/topDownFog.ts`). `null` heißt wie oben: Die Figur steht in keinem
 * Raum der Station, und es bleibt alles sichtbar.
 */
export function topDownRooms(
  spec: HouseSpec,
  viewer: { x: number; z: number },
  shut: readonly string[],
  reach = TOP_DOWN_REACH,
): Set<string> | null {
  return visibleStationRooms(spec, viewer, shut, (door) => {
    const middle = doorMiddle(door);
    return Math.hypot(middle.x - viewer.x, middle.z - viewer.z) <= reach;
  });
}

/** Ein Rechteck im Bild, in Normgerätekoordinaten (−1 … 1 in beiden Achsen). */
export interface ViewRect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** Das ganze Bild. */
export const FULL_VIEW: ViewRect = { x0: -1, y0: -1, x1: 1, y1: 1 };

function cut(a: ViewRect, b: ViewRect): ViewRect | null {
  const x0 = Math.max(a.x0, b.x0);
  const y0 = Math.max(a.y0, b.y0);
  const x1 = Math.min(a.x1, b.x1);
  const y1 = Math.min(a.y1, b.y1);
  return x0 < x1 && y0 < y1 ? { x0, y0, x1, y1 } : null;
}

function covers(outer: ViewRect, inner: ViewRect): boolean {
  return (
    outer.x0 <= inner.x0 && outer.y0 <= inner.y0 && outer.x1 >= inner.x1 && outer.y1 >= inner.y1
  );
}

function span(a: ViewRect, b: ViewRect): ViewRect {
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
}

/**
 * **Räume durch Türen hindurch — und nur durch das Stück Bild, das die Tür
 * freigibt.**
 *
 * `visibleStationRooms` fragt je Tür nur, ob sie **irgendwo** im Blickkegel
 * liegt. Das hält den Raum hinter einer Wand im Rücken aus dem Bild, aber
 * nicht die Räume, die in Blickrichtung hinter drei Wänden liegen: Deren Türen
 * stehen auch im Blickkegel, nur eben verdeckt. Gemessen aus der
 * Einsatzzentrale mit Blick durch die Glaswand in die Station: 596
 * Zeichenaufrufe im Hauptbild, in der Brille je Auge (`docs/agents/grafik.md`,
 * „Die Messstrecke der Welten").
 *
 * Hier trägt jeder Raum ein **Fenster**: das Rechteck im Bild, durch das man
 * ihn sieht. Der eigene Raum hat das ganze Bild; der Raum hinter einer Tür
 * bekommt das Fenster seines Vorgängers, beschnitten auf das Rechteck, das die
 * Tür im Bild einnimmt (`doorRect`). Bleibt nichts übrig, ist der Raum nicht zu
 * sehen. Kommt man auf zwei Wegen hin, gilt das Rechteck um beide Fenster —
 * großzügig, nie knapp: Ein Raum zu viel kostet Aufrufe, einer zu wenig wäre
 * ein Loch im Bild.
 *
 * `doorRect` gibt `null` für eine Tür außerhalb des Blickkegels und
 * `FULL_VIEW` für eine, in der man gerade steht (ihre Ecken liegen dann hinter
 * der Kamera, und ein Rechteck daraus wäre falsch).
 *
 * **Die Einsatzzentrale** ist für den Grundriss kein Raum — und hieß deshalb
 * bisher „alles zeigen". Sie liegt aber vor der Glaswand des Eingangsraums
 * (`house.commandWindows`), und andere Fenster zum Vorplatz gibt es nicht
 * (`stationWindows` lässt ihn aus): Wer dort steht, sieht den Eingangsraum
 * ganz und alles Weitere durch dessen Türen. Außerhalb von Station und Vorplatz
 * (Testdeck, Außenansicht) bleibt es bei `null`, also bei allem.
 */
export function portalRooms(
  spec: HouseSpec,
  viewer: { x: number; z: number },
  shut: readonly string[],
  doorRect: (door: HouseDoor) => ViewRect | null,
): Set<string> | null {
  const tileX = Math.floor(viewer.x / TILE);
  const tileZ = Math.floor(viewer.z / TILE);
  const start =
    roomAt(spec, tileX, tileZ)?.id ??
    (onApron(tileX, tileZ) && spec.entryRoom ? spec.entryRoom : null);
  if (!start) return null;
  const windows = new Map<string, ViewRect>([[start, FULL_VIEW]]);
  const rects = new Map<string, ViewRect | null>();
  const rectOf = (door: HouseDoor): ViewRect | null => {
    if (!rects.has(door.id)) rects.set(door.id, doorRect(door));
    return rects.get(door.id)!;
  };
  const queue = [start];
  // Ein Fenster wächst nur, und es gibt nur endlich viele Rechtecke daraus —
  // die Schranke ist Vorsicht und kein Teil der Rechnung.
  for (let index = 0; index < queue.length && index < 4096; index++) {
    const from = queue[index]!;
    const window = windows.get(from)!;
    for (const door of spec.doors) {
      if (!door.b || shut.includes(door.id)) continue;
      const next = door.a === from ? door.b : door.b === from ? door.a : null;
      if (!next) continue;
      const rect = rectOf(door);
      const through = rect && cut(window, rect);
      if (!through) continue;
      const known = windows.get(next);
      if (known && covers(known, through)) continue;
      windows.set(next, known ? span(known, through) : through);
      queue.push(next);
    }
  }
  return new Set(windows.keys());
}
