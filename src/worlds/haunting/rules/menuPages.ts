/**
 * **Die Seite „Haunting / Orbital" im Menü — wenige Unterseiten statt einer
 * langen Liste.**
 *
 * Bis hierher standen im Bereich _Diese Welt_ (`ui/menuGroups.ts`) gut zwanzig
 * Zeilen gleichen Gewichts: die Starts der Runde, die Einstellungen der Tafel,
 * Medkit, Linke Hand, Ton, Ambiente, Grundriss-Vorlage, VR-Komfort, Testdeck,
 * Testbesuche, die Bot-Runde und ein leerer _Baukasten_ (seine Zeilen hatte
 * die Tabelle schon nach _Bauen & Gestalten_ geholt). Jetzt gilt:
 *
 * - **Oben, ohne Umweg, was die Runde ändert** — „Jetzt: …", die drei Starts
 *   (`rules/worldMenu.startEntries`, in der echten Runde ihr Abbruch), nach
 *   dem Ende „Nochmal: echte Runde", „Rollen & Aufbau" und der Weg zur
 *   Zentrale. Das ist, wofür man das Menü in der Runde aufmacht.
 * - **Dann vier Unterseiten**: _Plätze & Fähigkeiten_ (die Tafel),
 *   _Einstellungen der Runde_ (Übungslicht, Station, Gegner), _Anzug &
 *   Ausrüstung_ (Linke Hand, Medkit, Schutzschrank), _Ansicht & Komfort_
 *   (Grundriss-Vorlage, Drehung, Komfortrand, Vibration) und _Ton_.
 * - **Ganz unten die Rettung** („Feststecken?"), die in jeder Lage gebraucht
 *   werden kann.
 * - **Was zum Prüfen da ist**, wandert über `ui/menuGroups.MENU_PLACEMENT`
 *   in die Werkstatt (Testdeck, Testbesuch, Bot-Runde des Testdecks); was
 *   baut, nach _Bauen & Gestalten_.
 *
 * Reine Rechnung über Ids, ohne three.js und ohne DOM: `HauntingWorld.menu`
 * baut die Zeilen flach, und hier werden sie auf Seiten verteilt.
 */

/** Eine Zeile, wie sie `ui/menu.MenuEntry` hat — nur, was hier gebraucht wird. */
export interface PagedRow {
  id: string;
  children?: PagedRow[];
}

/** Eine Unterseite: Id, Name und Unterzeile. */
export interface HauntPage {
  id: string;
  label: string;
  sub: string;
}

/** Die Unterseiten, in der Reihenfolge, in der sie dastehen. */
export const HAUNT_PAGES: readonly HauntPage[] = [
  {
    id: 'haunt:seats',
    label: 'Plätze & Fähigkeiten',
    sub: 'Wer welchen Platz der Tafel hält — Mensch, Bot oder aus',
  },
  {
    id: 'haunt:settings',
    label: 'Einstellungen der Runde',
    sub: 'Übungslicht, Station, Gegner',
  },
  {
    id: 'haunt:gear',
    label: 'Anzug & Ausrüstung',
    sub: 'Linke Hand, Medkit, Schutzschrank',
  },
  {
    id: 'haunt:display',
    label: 'Ansicht & Komfort',
    sub: 'Grundriss am Boden, Drehung, Komfortrand, Vibration',
  },
  {
    id: 'haunt:sound',
    label: 'Ton',
    sub: 'Ton an oder aus, Ambiente',
  },
];

/**
 * **Welche Zeile auf welche Unterseite gehört.** Was hier nicht steht, bleibt
 * oben — eine neue Zeile geht also nicht verloren, sie steht nur zwischen den
 * Starts, bis jemand sie hier einträgt.
 *
 * `haunt:seat-*` fängt die fünf Plätze der Tafel (`rules/roundSetup.SEATS`).
 */
export const HAUNT_PAGE_OF: Readonly<Record<string, string>> = {
  'haunt:seat-*': 'haunt:seats',
  'haunt:powers': 'haunt:seats',
  'haunt:light': 'haunt:settings',
  'haunt:rooms': 'haunt:settings',
  'haunt:monster-kind': 'haunt:settings',
  'orbital:sensor': 'haunt:gear',
  'orbital:heal': 'haunt:gear',
  'orbital:leave': 'haunt:gear',
  'orbital:blueprint': 'haunt:display',
  // Der VR-Komfort ist eine eigene kleine Seite (`HauntingComfort.menu`); ihre
  // drei Zeilen stehen direkt unter _Ansicht & Komfort_ (`FLATTEN`).
  'ship:comfort': 'haunt:display',
  'orbital:audio': 'haunt:sound',
  'orbital:ambient': 'haunt:sound',
};

/** Untermenüs, deren Zeilen auf ihrer Unterseite ohne eigene Stufe stehen. */
const FLATTEN = new Set(['ship:comfort']);

/** Was oben bleibt, aber hinter die Unterseiten gehört. */
const TAIL = new Set(['haunt:rescue']);

/** Die Unterseite einer Zeile — oder `null`, wenn sie oben bleibt. */
export function hauntPageOf(id: string): string | null {
  return pageRank(id)?.page ?? null;
}

/** Unterseite und Rang: Auf einer Unterseite gilt die Reihenfolge von `HAUNT_PAGE_OF`. */
function pageRank(id: string): { page: string; rank: number } | null {
  let rank = 0;
  for (const [match, page] of Object.entries(HAUNT_PAGE_OF)) {
    const hit = match.endsWith('*') ? id.startsWith(match.slice(0, -1)) : id === match;
    if (hit) return { page, rank };
    rank++;
  }
  return null;
}

/**
 * **Aus der flachen Liste die Seite mit Unterseiten.** `page` baut aus einer
 * Unterseite und ihren Zeilen den Eintrag (Symbol, Farbe — das weiß die
 * Welt); eine Unterseite ohne Zeilen gibt es nicht.
 *
 * Reihenfolge: was oben bleibt, wie es kam; dann die Unterseiten in der
 * Reihenfolge von `HAUNT_PAGES`, darauf die Zeilen in der von
 * `HAUNT_PAGE_OF`; dann `TAIL`.
 */
export function pageHauntMenu<T extends PagedRow>(
  rows: readonly T[],
  page: (page: HauntPage, children: T[]) => T,
): T[] {
  const top: T[] = [];
  const tail: T[] = [];
  const pages = new Map<string, Array<{ rows: T[]; rank: number }>>();
  for (const row of rows) {
    const target = pageRank(row.id);
    if (!target) {
      (TAIL.has(row.id) ? tail : top).push(row);
      continue;
    }
    const list = pages.get(target.page) ?? [];
    list.push({
      rows: FLATTEN.has(row.id) && row.children ? (row.children as T[]) : [row],
      rank: target.rank,
    });
    pages.set(target.page, list);
  }
  const built: T[] = [];
  for (const info of HAUNT_PAGES) {
    const children = (pages.get(info.id) ?? [])
      .sort((a, b) => a.rank - b.rank)
      .flatMap((item) => item.rows);
    if (children.length) built.push(page(info, children));
  }
  return [...top, ...built, ...tail];
}
