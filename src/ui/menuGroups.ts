import type { MenuEntry, MenuIcon } from './menu';

/**
 * **Die Hauptbereiche des Menüs** — und die eine Tabelle, die sagt, was wohin
 * gehört.
 *
 * Bis hierher hing jeder Eintrag direkt an der Wurzel: sieben Stück aus der
 * App (Welten, Ansicht, Verbindung, Bewegung, Eingaben, Aussehen, Grafik) und
 * dahinter alles, was die Welt mitbrachte — in der Testwelt noch einmal
 * vierzehn, von _Werkzeuge_ über _NPC_ bis _Zeiten löschen_. Das waren gut
 * zwanzig Zeilen gleichen Gewichts, und die Hitboxen der Physik standen in
 * derselben Liste wie die Frage, ob die Figur einen Hut trägt. Gemeldet war
 * genau das: „Die Menüführung ist verbesserungswürdig."
 *
 * Jetzt gibt es **wenige Hauptbereiche** (`MENU_GROUPS`), und jeder Eintrag
 * kommt über **eine** Tabelle (`MENU_PLACEMENT`) in einen davon — egal, wer
 * ihn baut: die App, eine Welt, eine Zone. Wer einen neuen Menüpunkt anlegt,
 * gibt ihm eine Id und trägt diese Id hier ein; mehr ist es nicht. Was hier
 * nicht steht, landet trotzdem nicht im Nichts (siehe `groupMenu`).
 *
 * **Und die Werkstatt ist ein eigener Bereich.** Was zum Prüfen und Messen da
 * ist — Bildrate, Hitboxen, Gitter, die Navigation der NPCs, der Konfig-Code —,
 * steht nicht mehr zwischen den Einstellungen, die jeder braucht, sondern
 * gebündelt ganz unten, mit `TEST` daran. Herausgezogen wird es **nach Id**
 * aus dem Menü, in dem es gebaut wird: `App.graphicsMenu` baut weiter seine
 * Zeilen, und diese Tabelle entscheidet, dass die Hitboxen in die Werkstatt
 * gehören. So bleibt der Code, der eine Einstellung kennt, bei der
 * Einstellung, und die Ordnung des Menüs steht an einer Stelle.
 *
 * Kein DOM, kein three.js — dieselbe Wurzel geht an die Handgelenke und an
 * die Seite (`WristMenus`), und ein Test prüft sie ohne Browser
 * (`menuGroups.test.ts`).
 */

export type MenuGroupId =
  'spielen' | 'welt' | 'bauen' | 'zusammen' | 'figur' | 'einstellungen' | 'hilfe' | 'werkstatt';

export interface MenuGroup {
  readonly id: MenuGroupId;
  readonly label: string;
  /** Was darin ist — steht unter dem Namen, solange nichts Genaueres da ist. */
  readonly sub: string;
  readonly icon: MenuIcon;
  readonly accent: number;
  readonly badge?: string;
}

/**
 * **Die Hauptbereiche, in der Reihenfolge, in der sie dastehen.** Oben, was
 * man jedes Mal braucht (eine Welt, ein Werkzeug), unten, was man einmal
 * einstellt — und ganz unten die Werkstatt.
 *
 * Die Ids sind zugleich die Ids der Seiten im Weg durchs Menü (`menuNav.ts`)
 * und dürfen deshalb mit keiner Id eines Eintrags zusammenfallen.
 */
export const MENU_GROUPS: readonly MenuGroup[] = [
  {
    id: 'spielen',
    label: 'Spielen',
    sub: 'Welt wählen · Ansicht',
    icon: 'worlds',
    accent: 0x4aa8ff,
  },
  /**
   * **Was es in dieser Welt gibt** — Name und Farbe setzt die App nach der
   * Welt, in der man steht (`GroupOptions.overrides`): _Testwelt_ mit Zonen,
   * Karts und Zurücksetzen, _Haunting / Orbital_ mit Runde, Plätzen und Ton.
   * Hier landet auch alles, was eine Welt mitbringt und die Tabelle nicht
   * kennt (`DEFAULT_GROUP`).
   */
  {
    id: 'welt',
    label: 'Diese Welt',
    sub: 'Was es hier gibt',
    icon: 'portal',
    accent: 0x5ee0a0,
  },
  {
    id: 'bauen',
    label: 'Bauen & Gestalten',
    sub: 'Werkzeuge, Beutel, Regal, NPCs',
    icon: 'hammer',
    accent: 0xffb454,
  },
  {
    id: 'zusammen',
    label: 'Zusammen',
    sub: 'Raum, Chat, Stimme, Zuschauen',
    icon: 'chat',
    accent: 0x5ee0a0,
  },
  {
    id: 'figur',
    label: 'Figur',
    sub: 'Wie du aussiehst',
    icon: 'npc',
    accent: 0x7ce0b8,
  },
  {
    id: 'einstellungen',
    label: 'Einstellungen',
    sub: 'Bewegung, Grafik, Hände',
    icon: 'settings',
    accent: 0xb28cff,
  },
  {
    id: 'hilfe',
    label: 'Steuerung & Hilfe',
    sub: 'Belegung ansehen und ändern',
    icon: 'controller',
    accent: 0x9fe3ff,
  },
  {
    id: 'werkstatt',
    label: 'Werkstatt',
    sub: 'Prüfen und messen · Hitboxen, Bildrate, Physik',
    icon: 'wrench',
    accent: 0x8e9ab8,
    badge: 'TEST',
  },
];

/**
 * **Eine Zeile der Tabelle**: welche Id, welcher Bereich — und, selten, ein
 * anderer Name dort.
 *
 * `match` ist eine Id (`'tools'`) oder ein Anfang mit Stern (`'world:*'`).
 * `label` ersetzt den Namen **nur im Bereich**: Die Welt nennt ihre
 * Hand-Einstellungen _Einstellungen_, und unter _Einstellungen_ wäre das eine
 * Zeile, die wie ihre eigene Seite heißt.
 */
export interface MenuPlacement {
  readonly match: string;
  readonly group: MenuGroupId;
  readonly label?: string;
  /**
   * **Ganz ans Ende des Bereichs** — hinter alles, auch hinter das, was die
   * Tabelle nicht kennt. Für _Zurücksetzen_: Was alles auf Anfang stellt,
   * steht dort, wo man es nicht im Vorbeigehen trifft.
   */
  readonly tail?: boolean;
}

/**
 * **Die Tabelle.** Innerhalb eines Bereichs stehen die Einträge in der
 * Reihenfolge dieser Zeilen; was nicht darin steht, hängt hinten an.
 *
 * Zwei Arten Zeilen gibt es, und beide sehen gleich aus:
 *
 * - Die Id eines **Eintrags der Wurzel** — `tools`, `net`, `gfx`: der ganze
 *   Eintrag mitsamt seinem Untermenü kommt in den Bereich.
 * - Die Id einer **Zeile in einem Untermenü** — `gfx:hitboxes`,
 *   `setting:config`: nur diese Zeile wird aus ihrem Menü herausgenommen und
 *   in den Bereich gestellt. Gesucht wird eine Ebene tief, mehr nicht; die
 *   Werkzeugseiten und das Regal darunter bleiben, wie sie sind.
 *
 * **Einen neuen Menüpunkt einordnen** heißt: seine Id hier eintragen, an der
 * Stelle, an der er im Bereich stehen soll. Eine neue Welt, die nur unter
 * _Spielen_ erscheinen soll, braucht gar nichts — `world:*` fängt sie.
 */
export const MENU_PLACEMENT: readonly MenuPlacement[] = [
  // Spielen: erst die Welten, dann wie man sie sieht.
  { match: 'world:*', group: 'spielen' },
  { match: 'view', group: 'spielen' },

  // Diese Welt: was sie anbietet. Was eine Welt mitbringt und hier nicht
  // steht, hängt ebenfalls hier hinten an (`DEFAULT_GROUP`) — _Zurücksetzen_
  // steht mit Absicht ganz unten, dort drückt man es nicht aus Versehen.
  { match: 'test:jump', group: 'welt' },
  { match: 'kart:home', group: 'welt' },
  { match: 'kart:times', group: 'welt' },
  { match: 'reset', group: 'welt', tail: true },

  // Bauen & Gestalten: der Modus zuerst — er entscheidet, ob man überhaupt
  // bauen darf —, dann, womit.
  { match: 'setting:game-mode', group: 'bauen' },
  { match: 'tools', group: 'bauen' },
  { match: 'bag', group: 'bauen' },
  { match: 'assets', group: 'bauen' },
  { match: 'build-tools', group: 'bauen' },
  { match: 'npc', group: 'bauen' },
  { match: 'plan-store', group: 'bauen' },
  // Die Weltänderungen tragen Rückgängig und Wiederholen des Baukastens —
  // in der Brille und am Pad der einzige Weg dorthin (`docs/agents/bauen.md`).
  { match: 'changes', group: 'bauen' },

  { match: 'net', group: 'zusammen' },

  { match: 'look', group: 'figur' },

  { match: 'move', group: 'einstellungen' },
  { match: 'gfx', group: 'einstellungen' },
  { match: 'settings', group: 'einstellungen', label: 'Hände & Greifen' },

  { match: 'input', group: 'hilfe' },
  { match: 'help:*', group: 'hilfe' },

  // Die Werkstatt: Anzeigen zum Prüfen, dann Physik und Messwerte, dann
  // die Werkzeuge zum Mitnehmen und Zurücksetzen.
  { match: 'gfx:fps', group: 'werkstatt' },
  { match: 'gfx:fps-hud', group: 'werkstatt' },
  { match: 'gfx:position', group: 'werkstatt' },
  { match: 'gfx:grid-lines', group: 'werkstatt' },
  { match: 'gfx:cell-footprints', group: 'werkstatt' },
  { match: 'gfx:hitboxes', group: 'werkstatt' },
  { match: 'gfx:grid-hitboxes', group: 'werkstatt' },
  { match: 'gfx:ghost-boxes', group: 'werkstatt' },
  { match: 'gfx:handles', group: 'werkstatt' },
  { match: 'gfx:shadows-full', group: 'werkstatt' },
  // Wie diese Anzeigen zeichnen (nur 2D-Pfad, Wände, Räume …) — gleich daneben.
  { match: 'info:views', group: 'werkstatt' },
  { match: 'npc:hits', group: 'werkstatt' },
  { match: 'npc:nav-debug', group: 'werkstatt' },
  { match: 'npc:nav-switches', group: 'werkstatt' },
  { match: 'setting:physics', group: 'werkstatt' },
  { match: 'setting:config', group: 'werkstatt' },
  { match: 'setting:poses', group: 'werkstatt' },
  // Haunting: was zum Ausprobieren abseits der Runde da ist — Testdeck,
  // Testbesuch in einem Raum, die Bot-Runde des Testdecks
  // (`worlds/haunting/rules/menuPages.ts`).
  { match: 'orbital:labs', group: 'werkstatt' },
  { match: 'orbital:visits', group: 'werkstatt' },
  { match: 'orbital:simulation', group: 'werkstatt' },
];

/** Wohin ein Eintrag der Wurzel kommt, den die Tabelle nicht kennt. */
export const DEFAULT_GROUP: MenuGroupId = 'welt';

/** Die Zeile der Tabelle für eine Id — oder `null`. */
export function placementOf(
  id: string,
  table: readonly MenuPlacement[] = MENU_PLACEMENT,
): { readonly place: MenuPlacement; readonly rank: number } | null {
  for (let rank = 0; rank < table.length; rank++) {
    const place = table[rank]!;
    const hit = place.match.endsWith('*')
      ? id.startsWith(place.match.slice(0, -1))
      : id === place.match;
    if (hit) return { place, rank: place.tail ? table.length + 1 + rank : rank };
  }
  return null;
}

export interface GroupOptions {
  /** Steht ganz oben, vor allen Bereichen — _Weiterspielen_. */
  readonly lead?: readonly MenuEntry[];
  /**
   * Name, Unterzeile oder Farbe eines Bereichs, wenn sie mehr sagen sollen
   * als die Vorgabe — _Diese Welt_ heißt, wie die Welt heißt.
   */
  readonly overrides?: Partial<
    Record<MenuGroupId, Partial<Pick<MenuGroup, 'label' | 'sub' | 'accent' | 'badge'>>>
  >;
  readonly groups?: readonly MenuGroup[];
  readonly table?: readonly MenuPlacement[];
}

interface Placed {
  readonly entry: MenuEntry;
  readonly rank: number;
  /** In welcher Reihenfolge es gefunden wurde — der Stichentscheid. */
  readonly seen: number;
}

/**
 * **Aus einer flachen Wurzel die Wurzel mit Bereichen.**
 *
 * Drei Regeln, und alle drei halten den Baum ehrlich:
 *
 * 1. **Leere Bereiche gibt es nicht.** Haunting bringt keine Werkzeuge mit —
 *    dann steht dort kein _Bauen & Gestalten_, hinter dem nichts ist.
 * 2. **Ein Bereich mit nur einem Untermenü ist dieses Untermenü.** _Zusammen_
 *    ist die Verbindung, _Figur_ das Aussehen: Eine Seite, auf der nur eine
 *    Zeile steht, die zur eigentlichen Seite führt, ist ein Klick, der nichts
 *    erklärt. Die Zeile heißt dann wie der Bereich und trägt die Id des
 *    Eintrags — der Weg dorthin (`menuNav`) bleibt derselbe, egal, ob noch
 *    etwas dazukommt.
 * 3. **Was die Tabelle nicht kennt, bleibt, wo es ist** — in einem Untermenü
 *    dort, an der Wurzel im Bereich `DEFAULT_GROUP` (_Diese Welt_). Eine Welt, die eine neue
 *    Zeile mitbringt, verliert sie also nicht, nur weil hier niemand
 *    nachgetragen hat.
 *
 * Die Einträge selbst werden **nicht verändert**: Wer eine Zeile aus einem
 * Untermenü herausnimmt, bekommt eine flache Kopie des Elternteils mit einer
 * kürzeren Liste. Die Zeile selbst ist dasselbe Objekt wie vorher — die
 * Bildraten-Zeile, die die App zweimal die Sekunde umschreibt
 * (`App.fpsEntry`), schreibt also weiter auf das, was angezeigt wird.
 */
export function groupMenu(entries: readonly MenuEntry[], options: GroupOptions = {}): MenuEntry[] {
  const groups = options.groups ?? MENU_GROUPS;
  const table = options.table ?? MENU_PLACEMENT;
  const buckets = new Map<MenuGroupId, Placed[]>();
  for (const group of groups) buckets.set(group.id, []);
  const fallback = buckets.has(DEFAULT_GROUP) ? DEFAULT_GROUP : (groups[0]?.id ?? DEFAULT_GROUP);
  let seen = 0;
  const put = (group: MenuGroupId, entry: MenuEntry, rank: number): void => {
    const bucket = buckets.get(group) ?? buckets.get(fallback);
    bucket?.push({ entry, rank, seen: seen++ });
  };

  for (const entry of entries) {
    // Erst die Zeilen, die aus diesem Untermenü herausgehen.
    let kept = entry;
    if (entry.children) {
      const stay: MenuEntry[] = [];
      for (const child of entry.children) {
        const hit = placementOf(child.id, table);
        if (hit) put(hit.place.group, relabel(child, hit.place), hit.rank);
        else stay.push(child);
      }
      if (stay.length !== entry.children.length) kept = { ...entry, children: stay };
    }
    const hit = placementOf(entry.id, table);
    put(
      hit?.place.group ?? fallback,
      hit ? relabel(kept, hit.place) : kept,
      hit?.rank ?? table.length,
    );
  }

  const root: MenuEntry[] = [...(options.lead ?? [])];
  for (const base of groups) {
    const group = { ...base, ...options.overrides?.[base.id] };
    const placed = buckets.get(group.id) ?? [];
    if (placed.length === 0) continue;
    placed.sort((a, b) => a.rank - b.rank || a.seen - b.seen);
    const children = placed.map((item) => item.entry);
    const only = children.length === 1 ? children[0]! : null;
    if (only?.children) {
      root.push({
        ...only,
        label: group.label,
        sub: only.sub ?? group.sub,
        icon: group.icon,
        accent: group.accent,
        ...(group.badge ? { badge: group.badge } : {}),
      });
      continue;
    }
    root.push({
      id: group.id,
      label: group.label,
      sub: group.sub,
      icon: group.icon,
      accent: group.accent,
      ...(group.badge ? { badge: group.badge } : {}),
      children,
    });
  }
  return root;
}

function relabel(entry: MenuEntry, place: MenuPlacement): MenuEntry {
  return place.label ? { ...entry, label: place.label } : entry;
}

/**
 * **Der Weg zu einer Seite, wo immer sie steht** — für `openSubmenu`.
 *
 * Welten rufen `openSubmenu('bag')`, nachdem etwas aus dem Beutel genommen
 * wurde, die App `openSubmenu('look')` nach dem Kleiderschrank. Mit den
 * Bereichen liegen diese Seiten eine Ebene tiefer, und der Aufrufer soll das
 * nicht wissen müssen: Gesucht wird in die Breite, höchstens `depth` Ebenen
 * tief — tief genug für Bereich → Eintrag → Unterseite, und flach genug, dass
 * niemand durch viertausend Kacheln des Regals läuft.
 */
export function findMenuPath(
  entries: readonly MenuEntry[],
  id: string,
  depth = 3,
): string[] | null {
  let level: { entry: MenuEntry; path: string[] }[] = entries.map((entry) => ({
    entry,
    path: [entry.id],
  }));
  for (let d = 0; d < depth && level.length > 0; d++) {
    const next: typeof level = [];
    for (const { entry, path } of level) {
      if (entry.id === id && entry.children) return path;
      for (const child of entry.children ?? [])
        next.push({ entry: child, path: [...path, child.id] });
    }
    level = next;
  }
  return null;
}

/**
 * **Spiel, Baustelle oder Prüfstand** — was eine Welt ist, in einem Wort.
 *
 * Gewünscht war eine „klare Unterscheidung Test vs. echtes Spiel". Die Welten
 * sagen es selbst (`WorldDefinition.test`, `.experimental`); hier steht nur,
 * was daraus im Menü und auf der Startseite wird: ein Schildchen und eine
 * Reihenfolge — die Spiele zuerst.
 */
export type WorldKind = 'spiel' | 'wip' | 'test';

export function worldKind(world: { test?: boolean; experimental?: boolean }): WorldKind {
  if (world.test) return 'test';
  if (world.experimental) return 'wip';
  return 'spiel';
}

/** Das Schildchen an der Zeile — ein Spiel trägt keins. */
export const WORLD_BADGES: Readonly<Record<WorldKind, string | undefined>> = {
  spiel: undefined,
  wip: 'WIP',
  test: 'TEST',
};

/** Die Welten in der Reihenfolge des Menüs: Spiele, dann Baustellen, dann Prüfstände. */
export function sortWorlds<T extends { test?: boolean; experimental?: boolean }>(
  worlds: readonly T[],
): T[] {
  const order: Record<WorldKind, number> = { spiel: 0, wip: 1, test: 2 };
  return worlds
    .map((world, index) => ({ world, index }))
    .sort((a, b) => order[worldKind(a.world)] - order[worldKind(b.world)] || a.index - b.index)
    .map(({ world }) => world);
}
