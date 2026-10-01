import type { DetailTweak, DetailTweakSpec } from '../../ui/menu';
import { elementById, hasElement } from './elementCatalog';
import { spotCells, spotSize, type ElementSpot } from './elementPlace';

/**
 * **Anpassungen an einem Spielelement, auf der Detailseite gemacht** — das
 * Modell verschoben, die gesperrten Zellen umgetippt — und gespeichert, bis
 * sie jemand in den Katalog überträgt.
 *
 * Gewünscht: _„Und ich will in der detailliert eine checkbox haben um die
 * Modelle zu verschieben. Dann bei aktiv sind Buttons zu sehen: +-0,5 Kacheln
 * in jede Richtung x,Y. Und dann kann ich den diff mit dem Modell speichern.
 * Zudem will ich mit checkbox besetzte boden Kacheln anpassen […] Unten gibt
 * es einen Button um die Anpassungen alle zu kopieren damit ich diese dir
 * geben kann."_
 *
 * **Das ist ein Werkzeug zum Einmessen und noch kein Teil des Spiels**: Die
 * Anpassungen liegen im Speicher dieses Browsers (`localStorage`) und gelten
 * in der Vorschau der Detailseite. In die Welt kommen sie, wenn jemand die
 * kopierte Liste (`tweaksExport`) in den Katalog überträgt
 * (`elementCatalog.ts`, `natureCatalog.ts`) — dieselbe Arbeitsteilung wie
 * beim KayKit-Editor (`docs/agents/kaykit-editor.md`).
 *
 * Die Zellen stehen als `'ix,iz'` mit `0,0` in der **Nordwestecke der
 * Grundfläche**, das Element nach Süden gedreht; eine Zelle daneben hat eine
 * negative Zahl oder eine jenseits der Grundfläche. Die Verschiebung ist in
 * Metern, x nach Osten, z nach Süden (vorn).
 */

/** Unter diesem Schlüssel liegen alle Anpassungen, als JSON. */
export const TWEAKS_KEY = 'bgvr.elementTweaks';

/**
 * **Ein Druck verschiebt um eine halbe Kachel** — 0,5 m. Gewünscht: _„0,5
 * Kacheln bitte, falls ein Gegenstand genau zwischen zwei Kacheln steht"_.
 */
export const TWEAK_STEP = 0.5;

/** Was gespeichert ist — je Element-Id nur die Abweichungen vom Katalog. */
interface Stored {
  readonly shift?: readonly [number, number];
  readonly cells?: readonly string[];
}

function readAll(): Record<string, Stored> {
  try {
    const raw = globalThis.localStorage?.getItem(TWEAKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, Stored>) : {};
  } catch {
    // Privater Modus, kein Speicher, kaputtes JSON — dann eben keine.
    return {};
  }
}

function writeAll(all: Record<string, Stored>): void {
  try {
    globalThis.localStorage?.setItem(TWEAKS_KEY, JSON.stringify(all));
  } catch {
    /* siehe oben */
  }
}

/**
 * **Die Zellen, die das Element laut Katalog sperrt** — relativ zur
 * Nordwestecke seiner Grundfläche (`spotCells` an einer Stelle bei 0, 0).
 */
export function presetCells(id: string): string[] {
  const probe: ElementSpot = { id, element: id, x: 0, z: 0 };
  return spotCells(probe)
    .map((key) => key.split(',').slice(0, 2).join(','))
    .sort(byCell);
}

/** Wie das Element ohne Anpassung dasteht. */
export function presetTweak(id: string): DetailTweak {
  return { shift: [0, 0], cells: presetCells(id) };
}

/** **Was gespeichert ist** — oder, ohne Anpassung, der Katalog. */
export function loadTweak(id: string): DetailTweak {
  const stored = readAll()[id];
  const preset = presetTweak(id);
  if (!stored) return preset;
  return {
    shift: stored.shift ? [stored.shift[0], stored.shift[1]] : preset.shift,
    cells: stored.cells ? [...stored.cells].sort(byCell) : preset.cells,
  };
}

/** Ob zwei Stände dasselbe sagen. */
export function sameTweak(a: DetailTweak, b: DetailTweak): boolean {
  return (
    a.shift[0] === b.shift[0] &&
    a.shift[1] === b.shift[1] &&
    [...a.cells].sort(byCell).join(' ') === [...b.cells].sort(byCell).join(' ')
  );
}

/**
 * **Speichern** — nur, was vom Katalog abweicht; `null` oder ein Stand wie im
 * Katalog nimmt die Anpassung wieder weg.
 */
export function saveTweak(id: string, tweak: DetailTweak | null): void {
  const all = readAll();
  const preset = presetTweak(id);
  if (!tweak || sameTweak(tweak, preset)) {
    delete all[id];
  } else {
    const entry: { shift?: [number, number]; cells?: string[] } = {};
    if (tweak.shift[0] !== 0 || tweak.shift[1] !== 0)
      entry.shift = [tweak.shift[0], tweak.shift[1]];
    const cells = [...tweak.cells].sort(byCell);
    if (cells.join(' ') !== preset.cells.join(' ')) entry.cells = cells;
    all[id] = entry;
  }
  writeAll(all);
}

/** Wie viele Elemente eine gespeicherte Anpassung haben. */
export function tweakCount(): number {
  return Object.keys(readAll()).filter(hasElement).length;
}

/**
 * **Alle Anpassungen zum Mitnehmen** — als JSON, je Element mit Name,
 * Grundfläche und, wo geändert, Verschiebung und gesperrten Zellen samt dem,
 * was vorher galt. Damit lässt es sich ohne Rückfrage in den Katalog
 * übertragen.
 */
export function tweaksExport(): string {
  const all = readAll();
  const out: Record<string, unknown> = {};
  for (const id of Object.keys(all).sort()) {
    if (!hasElement(id)) continue;
    const stored = all[id]!;
    const element = elementById(id);
    const [w, d] = spotSize({ id, element: id, x: 0, z: 0 });
    out[id] = {
      label: element.label,
      footprintCells: [w * 2, d * 2],
      ...(stored.shift ? { shiftMetres: stored.shift } : {}),
      ...(stored.cells ? { blockedCells: stored.cells, blockedBefore: presetCells(id) } : {}),
    };
  }
  return JSON.stringify(
    {
      what: 'Spielelemente: Anpassungen aus der Detailseite',
      cells: "'ix,iz' ab der Nordwestecke der Grundfläche, nach Süden gedreht",
      shift: 'Meter, x nach Osten, z nach Süden',
      elements: out,
    },
    null,
    2,
  );
}

/**
 * **Was die Detailseite eines Elements zum Anpassen bekommt**
 * (`ui/menu.MenuDetail.tweak`).
 */
export function elementTweakSpec(id: string): DetailTweakSpec {
  const [w, d] = spotSize({ id, element: id, x: 0, z: 0 });
  return {
    cols: Math.round(w * 2),
    rows: Math.round(d * 2),
    step: TWEAK_STEP,
    load: () => loadTweak(id),
    preset: () => presetTweak(id),
    save: (tweak) => saveTweak(id, tweak),
    count: () => tweakCount(),
    exportAll: () => tweaksExport(),
  };
}

/** Zellen der Reihe nach: erst Norden nach Süden, dann Westen nach Osten. */
function byCell(a: string, b: string): number {
  const [ax, az] = a.split(',').map(Number) as [number, number];
  const [bx, bz] = b.split(',').map(Number) as [number, number];
  return az - bz || ax - bx;
}
