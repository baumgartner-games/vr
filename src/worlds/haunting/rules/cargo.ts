/**
 * **Alle Kisten einer Runde, an einer Stelle.**
 *
 * Vorher wurde der Inhalt zweimal gewürfelt: einmal in der 3D-Welt beim Bauen
 * der Frachtschränke, einmal im Konstruktor der 2D-Runde — nach derselben
 * Regel, aber in zwei Dateien. Solange jeder Raum genau eine Kiste hatte, ging
 * das gut; sobald in einem Raum drei stehen und nur eine davon das Ersatzteil
 * hält, ist „dieselbe Regel, zweimal aufgeschrieben" eine Runde, in der der
 * Techniker vor einer anderen Kiste steht als der Archivar auf seinem Blatt.
 * Deshalb steht die Liste jetzt hier, und 2D, 3D, Netz-Snapshot und Archiv
 * lesen dieselbe.
 *
 * **Zwei Würfe, zwei Ströme, und beide gehören nicht dem Haus.** Die
 * Wurfreihenfolge von `generateHouse` ist Vertrag (siehe `house.ts`): Wer dort
 * eine Zeile einschiebt, die würfelt, baut aus demselben Samen ein anderes
 * Haus. Die Kisten würfeln deshalb aus **eigenen** Strömen, die nur aus
 * `spec.seed` abgeleitet sind — wie viele Kisten ein Raum bekommt, entscheidet
 * `cargoCounts` (das braucht der Packer, bevor es eine Stellung gibt), was in
 * ihnen liegt, entscheidet `cargoOf` (das braucht die Stellung, denn im Hinweis
 * steht die Wand).
 *
 * **Wer wirklich steht, entscheidet der Packer.** `cargoOf` liest die Kisten
 * aus `stationLayout` und nicht aus seiner eigenen Wunschliste: Die dritte
 * Kiste ist Deko-Rang und fällt weg, wo sie den Weg zur Tür verengen würde.
 * Eine Liste, die Kisten kennt, die im Raum gar nicht stehen, wäre schlimmer
 * als eine Kiste weniger.
 *
 * Reine Rechnung — kein three.js, kein DOM. Jest rechnet das nach.
 */
import type { HouseSpec } from '../house';
import { Rng } from '../rng';
import { stationLayout } from '../stationLayout';

/** Was in einer Kiste liegt: ein Aufgabenteil, ein Werkzeug — oder nichts. */
export type CargoLoot =
  | { kind: 'part'; taskId: string }
  | { kind: 'tool'; tool: 'radar' | 'xray' | 'medkit' }
  | { kind: 'empty' };

/** Die vier Farben, die es als Band um eine Kiste gibt. */
export type MarkColour = 'rot' | 'blau' | 'gelb' | 'grün';

/**
 * Das Kennzeichen einer Kiste: Farbband und Nummer.
 *
 * Beides zusammen, und beides je Raum eindeutig — die Farbe, weil man sie im
 * Dunkeln aus drei Metern erkennt, die Nummer, weil man sie durchs Funkgerät
 * sagen kann, ohne dass jemand nach „das blaue" zurückfragt.
 */
export interface CargoMark {
  colour: MarkColour;
  number: 1 | 2 | 3;
}

export interface CargoSlot {
  /** `cargo-${roomId}-${n}` — dieselbe Id wie die `StationPlacement`. */
  id: string;
  roomId: string;
  mark: CargoMark;
  loot: CargoLoot;
  /** Was der Archivar vorliest: „Kiste 2, blaues Band · Nordwand". */
  clue: string;
}

/** Wie viele Kisten in einem Raum stehen: mindestens, höchstens. */
export const CARGO_PER_ROOM: readonly [min: number, max: number] = [2, 3];

/**
 * Die vier Werkzeuge, die eine Runde ausgibt — das Medkit zweimal, weil eine
 * Runde selten mit einem auskommt und zwei noch keine Sanitätsstation sind.
 */
const CARGO_TOOLS: readonly ('radar' | 'xray' | 'medkit')[] = ['radar', 'xray', 'medkit', 'medkit'];

const COLOURS: readonly MarkColour[] = ['rot', 'blau', 'gelb', 'grün'];
const NUMBERS: readonly (1 | 2 | 3)[] = [1, 2, 3];

/** „blaues Band" — der Hinweis spricht, er zählt keine Aufzählungswerte auf. */
const BAND: Readonly<Record<MarkColour, string>> = {
  rot: 'rotes Band',
  blau: 'blaues Band',
  gelb: 'gelbes Band',
  grün: 'grünes Band',
};

/** Die vier Wände, von der Kiste aus gesehen. Norden ist −Z, wie überall. */
const WALLS = ['Nordwand', 'Ostwand', 'Südwand', 'Westwand'] as const;

/**
 * Zwei Zahlen, die den Samen verbiegen, damit die Kisten nicht mit dem Haus im
 * Gleichschritt würfeln: zwei Ströme aus einem Samen, die einander nichts
 * verraten. Die Werte sind die Buchstaben „KIST" und „LOOT" — nichts daran ist
 * magisch außer der Bedingung, dass es zwei verschiedene sind.
 */
const COUNT_STREAM = 0x4b495354;
const LOOT_STREAM = 0x4c4f4f54;

const countCache = new WeakMap<HouseSpec, ReadonlyMap<string, number>>();
const slotCache = new WeakMap<HouseSpec, readonly CargoSlot[]>();

/**
 * Wie viele Kisten sich jeder Raum wünscht — das braucht der Packer
 * (`stationLayout`), bevor irgendetwas steht. Ob die letzte davon wirklich
 * hineinpasst, entscheidet er; die verbindliche Liste ist danach `cargoOf`.
 */
export function cargoCounts(spec: HouseSpec): ReadonlyMap<string, number> {
  const known = countCache.get(spec);
  if (known) return known;
  const rng = new Rng((spec.seed ^ COUNT_STREAM) >>> 0);
  const out = new Map<string, number>();
  for (const room of spec.rooms)
    out.set(room.id, rng.between(CARGO_PER_ROOM[0], CARGO_PER_ROOM[1]));
  countCache.set(spec, out);
  return out;
}

/**
 * **Alle Kisten der Runde, mit Kennzeichen und Inhalt.**
 *
 * Drei Aufgabenteile — je eines im Raum, den `spec.tasks` nennt —, vier
 * Werkzeuge irgendwo dazwischen, und der Rest ist leer. Die leeren sind kein
 * Versehen, sondern der Preis: Wer ohne Hinweis sucht, öffnet Kisten, und jede
 * offene Kiste macht Geräusch.
 */
export function cargoOf(spec: HouseSpec): readonly CargoSlot[] {
  const known = slotCache.get(spec);
  if (known) return known;
  const rng = new Rng((spec.seed ^ LOOT_STREAM) >>> 0);
  const placed = stationLayout(spec).filter((p) => p.kind === 'cargo');
  const draft = new Map<string, { id: string; roomId: string; mark: CargoMark; clue: string }>();
  for (const room of spec.rooms) {
    const inRoom = placed.filter((p) => p.roomId === room.id);
    // Farben und Nummern werden je Raum gemischt und dann der Reihe nach
    // vergeben: So ist beides im Raum eindeutig, ohne dass „Kiste 1" immer die
    // erste an der Wand wäre.
    const colours = rng.shuffle(COLOURS);
    const numbers = rng.shuffle(NUMBERS);
    inRoom.forEach((p, index) => {
      const mark: CargoMark = { colour: colours[index]!, number: numbers[index]! };
      draft.set(p.id, {
        id: p.id,
        roomId: room.id,
        mark,
        clue: `Kiste ${mark.number}, ${BAND[mark.colour]} · ${wallOf(p.yaw)}`,
      });
    });
  }
  const loot = new Map<string, CargoLoot>();
  for (const task of spec.tasks) {
    const inRoom = placed.filter((p) => p.roomId === task.roomId);
    if (!inRoom.length) continue;
    loot.set(rng.pick(inRoom).id, { kind: 'part', taskId: task.id });
  }
  const spare = rng.shuffle(placed.filter((p) => !loot.has(p.id)));
  CARGO_TOOLS.forEach((tool, index) => {
    const box = spare[index];
    if (box) loot.set(box.id, { kind: 'tool', tool });
  });
  const out: CargoSlot[] = placed.map((p) => ({
    ...draft.get(p.id)!,
    loot: loot.get(p.id) ?? { kind: 'empty' },
  }));
  slotCache.set(spec, out);
  return out;
}

/** Wie die Kiste angeschrieben ist: „Kiste 2 · blau". */
export function cargoLabel(slot: CargoSlot): string {
  return `Kiste ${slot.mark.number} · ${slot.mark.colour}`;
}

/** Die Kiste, in der das Ersatzteil dieser Aufgabe liegt. */
export function taskCargo(spec: HouseSpec, taskId: string): CargoSlot {
  const slot = cargoOf(spec).find((one) => one.loot.kind === 'part' && one.loot.taskId === taskId);
  if (!slot) throw new Error(`Keine Kiste für Aufgabe ${taskId}`);
  return slot;
}

/**
 * Woran der Zustand einer Kiste hängt — für alle, die „schon geleert" aus
 * `crew.inventory` und `state.done` ablesen. Bei einer leeren Kiste ist das
 * die Kiste selbst: Sie hat nichts, was man später in der Hand hätte, und
 * soll trotzdem nicht ewig zum Nachsehen einladen.
 */
export function cargoKey(slot: CargoSlot): string {
  return slot.loot.kind === 'part'
    ? slot.loot.taskId
    : slot.loot.kind === 'tool'
      ? slot.loot.tool
      : slot.id;
}

/**
 * An welcher Wand die Kiste steht. Der Packer dreht jedes Wandmodul so, dass
 * sein lokales +Z in den Raum zeigt — die Wand liegt also genau
 * entgegengesetzt zur Blickrichtung.
 */
function wallOf(yaw: number): string {
  const x = -Math.sin(yaw),
    z = -Math.cos(yaw);
  if (Math.abs(z) >= Math.abs(x)) return z < 0 ? WALLS[0] : WALLS[2];
  return x > 0 ? WALLS[1] : WALLS[3];
}
