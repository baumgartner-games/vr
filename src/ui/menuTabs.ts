import type { MenuEntry } from './menu';
import { MENU_GROUPS, placementOf, type MenuGroupId } from './menuGroups';
import { catalogSearch, type CatalogRow } from '../worlds/elements/catalogSearch';

/**
 * **Das Menü als Reiter** — wie oben in _Die Sims_: eine Reihe über der Seite,
 * und die Wurzel selbst schlägt niemand auf (`PageMenu` und `XRMenu` mit
 * `tabs`).
 *
 * Gewünscht war erst ein Inventar hinter `Tab` mit vier Reitern (Inventar,
 * Katalog, Welten, Einstellungen), dann: _„das Burger-Menü-Icon oben links
 * ändern, sodass dann das Menü geöffnet wird damit — das alte Menü brauchen
 * wir dann ja nicht mehr."_ Also ist dieses Menü jetzt **das** Menü, und was
 * im alten in acht Bereichen stand, verteilt sich hier auf die Reiter:
 *
 * | Reiter | Was darin steht |
 * | ------ | --------------- |
 * | **Inventar** | die Werkzeuge als Kacheln und die Figur (`App.inventoryEntry`) |
 * | **Katalog** | der Möbelkatalog (`elements`) |
 * | **Welten** | _Diese Welt_ zuoberst, dann die Welten und die Ansicht (`spielen`) |
 * | **Bauen** | Bauen & Gestalten ohne Katalog (der hat seinen Reiter) |
 * | **Zusammen** | Raum, Chat, Stimme, Zuschauen (`net`) |
 * | **Einstellungen** | Bewegung, Grafik, Ton, Hände — und darunter Figur, Steuerung & Hilfe, Werkstatt |
 *
 * Gebaut wird **aus der Wurzel mit Bereichen** (`groupMenu`): Die Tabelle dort
 * entscheidet weiter, was in welchen Bereich gehört, und hier steht nur, in
 * welchen Reiter ein Bereich geht. Leere Reiter gibt es nicht; was keinem
 * Bereich zuzuordnen ist, steht unter _Welten_ — dort, wo im alten Menü
 * _Diese Welt_ das Unbekannte auffing.
 *
 * Kein DOM, kein three.js — ein Test prüft die Aufteilung ohne Browser
 * (`menuTabs.test.ts`).
 */

export interface TabOptions {
  /** Der erste Reiter — das Inventar —, oder `null`, wenn es keinen gibt (Startseite). */
  readonly inventory?: MenuEntry | null;
  /**
   * Ids, die im Reiter _Bauen_ nicht noch einmal stehen sollen — in der
   * Brille das Werkzeugregal (`tools`), das schon im Inventar liegt.
   */
  readonly hideInBuild?: readonly string[];
}

/** Die Ids der Reiter, in ihrer Reihenfolge — zugleich die Ids der Seiten im Weg (`menuNav`). */
export const TAB_IDS = {
  catalog: 'elements',
  worlds: 'spielen',
  build: 'bauen',
  together: 'zusammen',
  settings: 'einstellungen',
} as const;

const WORLD_TAB_ACCENT = 0x4aa8ff;

/** Aus der Wurzel mit Bereichen (`groupMenu`) die Reiter. */
export function tabbedMenu(grouped: readonly MenuEntry[], options: TabOptions = {}): MenuEntry[] {
  const byGroup = new Map<MenuGroupId, MenuEntry>();
  const loose: MenuEntry[] = [];
  for (const entry of grouped) {
    const group = groupOf(entry);
    if (group && !byGroup.has(group)) byGroup.set(group, entry);
    else loose.push(entry);
  }
  const rows = (group: MenuGroupId): MenuEntry[] => {
    const entry = byGroup.get(group);
    if (!entry) return [];
    // Ein Bereich mit Kindern gibt seine Zeilen ab; einer, der zu einem
    // einzigen Eintrag zusammengefallen ist (`groupMenu`, Regel 2), ist selbst
    // die Zeile.
    return entry.id === group && entry.children ? entry.children : [entry];
  };

  const tabs: MenuEntry[] = [];
  if (options.inventory) tabs.push(options.inventory);

  // Der Katalog: aus _Bauen & Gestalten_ herausgezogen, ein Reiter für sich.
  const build = rows('bauen');
  const catalog = build.find((entry) => entry.id === TAB_IDS.catalog);
  if (catalog?.children) tabs.push({ ...catalog, label: 'Katalog' });

  // Welten: was diese Welt anbietet zuoberst, dann die Welten selbst.
  const here = byGroup.get('welt');
  const worlds = [...(here ? [here] : []), ...rows('spielen'), ...loose];
  if (worlds.length > 0) {
    const spielen = byGroup.get('spielen');
    tabs.push({
      ...(spielen ?? {}),
      id: TAB_IDS.worlds,
      label: 'Welten',
      icon: 'worlds',
      accent: spielen?.accent ?? WORLD_TAB_ACCENT,
      // **Kacheln wie auf der Startseite** — mit Bild, wo eine Welt eins hat
      // (`MenuEntry.image`). Ein Tipp wählt die Welt; nehmen gibt es hier nicht.
      grid: true,
      take: false,
      children: worlds,
      find: (query) => searchTab(worlds, query),
    });
  }

  const hidden = new Set([TAB_IDS.catalog, ...(options.hideInBuild ?? [])]);
  const building = build.filter((entry) => !hidden.has(entry.id));
  if (building.length > 0) {
    tabs.push(groupTab('bauen', TAB_IDS.build, 'Bauen', building));
  }

  const together = rows('zusammen');
  if (together.length > 0) {
    const net = byGroup.get('zusammen')!;
    // Zusammengefallen ist der Bereich die Verbindung selbst — dann ist ihre
    // Seite der Reiter, unter ihrer eigenen Id (`openSubmenu('net')`).
    tabs.push(
      net.id === 'zusammen' || !net.children
        ? groupTab('zusammen', TAB_IDS.together, 'Zusammen', together)
        : { ...net, label: 'Zusammen', icon: 'chat' },
    );
  }

  // Einstellungen: die eigentlichen zuerst, dann Figur, Hilfe und Werkstatt
  // als Zeilen darunter — die braucht man seltener.
  const settings = [
    ...rows('einstellungen'),
    ...(['figur', 'hilfe', 'werkstatt'] as const).flatMap((group) => {
      const entry = byGroup.get(group);
      return entry ? [entry] : [];
    }),
  ];
  if (settings.length > 0) {
    tabs.push({
      ...groupTab('einstellungen', TAB_IDS.settings, 'Einstellungen', settings),
      find: (query) => searchTab(settings, query),
    });
  }
  return tabs;
}

/**
 * **Wie tief die Suche eines Reiters hinabsteigt.** Vier Ebenen reichen für
 * _Einstellungen › Grafik › Schatten_ und _Welten › Test › Labor_; tiefer
 * liegt nur, was eine eigene Suche hat.
 */
const SEARCH_DEPTH = 4;

/**
 * **Die Suchleiste eines Reiters** (`MenuEntry.find`) — gewünscht: _„bei den
 * Tabs Katalog, Welten und Einstellungen eine Suchleiste oben, welche nach den
 * einzelnen Punkten filtert, die man sucht"_.
 *
 * Gesucht wird **durch alle Unterseiten** des Reiters, nicht nur durch die
 * Zeilen, die oben stehen: Wer `schatten` tippt, will den Schalter, nicht die
 * Seite _Grafik_, hinter der er liegt. Jeder Treffer trägt deshalb seinen Weg
 * in der Unterzeile („Grafik › …"); ein Tipp schaltet ihn direkt, und eine
 * Seite unter den Treffern öffnet sich an ihrer Stelle im Baum
 * (`PageMenu.onListClick`).
 *
 * Die Trefferlogik ist die des Katalogs (`catalogSearch`): Umlaute gefaltet,
 * ein Treffer im Namen zählt mehr als einer im Weg. **Nicht hinab** geht es in
 * Seiten mit eigener Suche (`find` — das Modellregal unter _Bauen_ mit
 * seinen viertausend Modellen) und in Fächer (`flatten`); die Seite selbst ist
 * aber findbar.
 */
export function searchTab(entries: readonly MenuEntry[], query: string): MenuEntry[] {
  const rows: CatalogRow<MenuEntry>[] = [];
  const walk = (level: readonly MenuEntry[], trail: readonly string[], depth: number): void => {
    for (const entry of level) {
      const where = trail.join(' › ');
      const sub = [where, entry.sub].filter(Boolean).join(' · ');
      rows.push({
        key: [...trail, entry.id].join('/'),
        name: entry.label,
        words: `${entry.sub ?? ''} ${where} ${entry.caption ?? ''}`,
        entry: sub ? { ...entry, sub } : entry,
      });
      const deeper = entry.children && !entry.find && !entry.flatten && depth < SEARCH_DEPTH;
      if (deeper) walk(entry.children!, [...trail, entry.label], depth + 1);
    }
  };
  walk(entries, [], 1);
  return catalogSearch(rows, query);
}

/** Zu welchem Bereich ein Eintrag der Wurzel gehört — oder `null` (_Weiterspielen_). */
function groupOf(entry: MenuEntry): MenuGroupId | null {
  const own = MENU_GROUPS.find((group) => group.id === entry.id);
  if (own) return own.id;
  // Ein zusammengefallener Bereich trägt die Id seines einzigen Eintrags.
  return placementOf(entry.id)?.place.group ?? null;
}

/** Ein Reiter aus einem Bereich, mit dessen Ikone und Farbe. */
function groupTab(group: MenuGroupId, id: string, label: string, children: MenuEntry[]): MenuEntry {
  const meta = MENU_GROUPS.find((candidate) => candidate.id === group)!;
  return { id, label, sub: meta.sub, icon: meta.icon, accent: meta.accent, children };
}
