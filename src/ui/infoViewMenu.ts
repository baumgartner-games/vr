import type { MenuEntry } from './menu';
import {
  INFO_OPACITY_LABELS,
  INFO_OPTION_LABELS,
  INFO_OPTION_SUBS,
  INFO_VIEWS,
  infoView,
  infoViewSpec,
  infoViewSummary,
  resetInfoViews,
  saveInfoView,
  toggleInfoOption,
  type InfoOption,
  type InfoViewId,
} from '../core/infoViews';

/**
 * **Das Optionsfeld einer Info-Ansicht** — eine Menüseite, dieselbe für jede.
 *
 * Gebaut wird ein gewöhnlicher `MenuEntry` mit Kindern, mehr nicht: Er hängt
 * am Handgelenk (`ui/WristMenu.ts`) genauso wie auf der Seite
 * (`ui/PageMenu.ts`), und wer das Hauptmenü umbaut, hängt ihn dort ein, wo er
 * hinpasst — er kennt weder die Grafik noch die NPC-Seite, in denen er heute
 * steht. Die Zeilen sind immer dieselben fünf in derselben Reihenfolge, und
 * eine Ansicht bekommt nur die, die sie kennt (`InfoViewSpec.supports`).
 *
 * `changed` läuft nach jeder Änderung — das Menü setzt dort sein
 * „neu zeichnen", eine Welt ihre Beschriftungen. Die Ansichten selbst hören
 * nicht hier zu, sondern am Speicher (`infoViews.onInfoViewsChange`,
 * `infoViewScene.syncInfoView`): Wer an der Werkzeugseite dreht, soll dasselbe
 * Bild bekommen wie der, der am Handgelenk dreht.
 */
export function infoViewOptionsEntry(
  id: InfoViewId,
  changed: (message: string) => void = () => {},
  label?: string,
): MenuEntry {
  const spec = infoViewSpec(id);
  // Jede Zeile frischt beim Umschalten die ganze Seite auf — die Kopfzeile
  // trägt die Summe.
  const rows: MenuEntry[] = spec.supports.map((option) =>
    optionRow(id, option, changed, () => refresh()),
  );
  const entry: MenuEntry = {
    id: `info:${id}`,
    label: label ?? spec.label,
    sub: infoViewSummary(id, infoView(id)),
    caption: spec.sub,
    icon: 'gizmo',
    accent: 0x7fb3ff,
    children: rows,
    onOpen: () => refresh(),
  };
  const refresh = (): void => {
    entry.sub = infoViewSummary(id, infoView(id));
    for (const row of rows) paint(row, id);
  };
  return entry;
}

/**
 * **Alle Info-Ansichten auf einer Seite** — die Bestandsaufnahme als Menü.
 * Dazu eine Zeile, die alles auf den Auslieferungszustand stellt.
 */
export function infoViewsMenu(changed: (message: string) => void = () => {}): MenuEntry {
  const pages = INFO_VIEWS.map((view) => infoViewOptionsEntry(view.id, changed));
  const summary = (): string => {
    const changedViews = INFO_VIEWS.filter(
      (view) => infoViewSummary(view.id, infoView(view.id)) !== 'Alles',
    );
    return changedViews.length === 0
      ? 'Wie jede Ansicht zeichnet: 2D, Wände, Räume, NPCs, Deckkraft'
      : changedViews.map((view) => view.label).join(' · ');
  };
  const entry: MenuEntry = {
    id: 'info:views',
    label: 'Info-Ansichten',
    sub: summary(),
    caption: 'Dasselbe Optionsfeld für Karte, Navigation, Gitter, Hitboxen und Griffe',
    icon: 'gizmo',
    accent: 0x7fb3ff,
    children: [
      ...pages,
      {
        id: 'info:reset',
        label: 'Alles zurücksetzen',
        sub: 'Jede Ansicht wieder vollständig und deckend',
        icon: 'reset',
        accent: 0xffc857,
        run: () => {
          resetInfoViews();
          for (const page of pages) page.onOpen?.();
          entry.sub = summary();
          changed('Info-Ansichten zurückgesetzt');
        },
      },
    ],
    onOpen: () => {
      entry.sub = summary();
      for (const page of pages) page.onOpen?.();
    },
  };
  return entry;
}

function optionRow(
  id: InfoViewId,
  option: InfoOption,
  changed: (message: string) => void,
  after: () => void,
): MenuEntry {
  const row: MenuEntry = {
    id: `info:${id}:${option}`,
    label: INFO_OPTION_LABELS[option],
    sub: INFO_OPTION_SUBS[option],
    icon: option === 'opacity' ? 'settings' : 'gizmo',
    accent: option === 'flat' ? 0x5ee0a0 : 0x7fb3ff,
    run: () => {
      const next = saveInfoView(id, toggleInfoOption(infoView(id), option));
      const state =
        option === 'opacity' ? INFO_OPACITY_LABELS[next.opacity] : next[option] ? 'an' : 'aus';
      after();
      changed(`${infoViewSpec(id).label}: ${INFO_OPTION_LABELS[option]} ${state}`);
    },
  };
  paint(row, id);
  return row;
}

/** Schreibt Häkchen und Beschriftung einer Zeile nach dem Speicher. */
function paint(row: MenuEntry, id: InfoViewId): void {
  const option = row.id.slice(row.id.lastIndexOf(':') + 1) as InfoOption;
  const options = infoView(id);
  if (option === 'opacity') {
    row.label = `${INFO_OPTION_LABELS.opacity}: ${INFO_OPACITY_LABELS[options.opacity]}`;
    return;
  }
  row.checked = options[option];
}

/**
 * **Dasselbe Feld als Knopfreihe** — für Seiten ohne Menü, die Werkzeugseite
 * (`tools/main.ts`, unter der laufenden Vorschau). Dieselben Optionen, dieselben
 * Namen, derselbe Speicher; nur die Form ist die der Ebenen daneben: ein
 * Knopf je Option, gedrückt heißt an. `className` ist die Klasse der Knöpfe
 * der Seite, in die sie gehängt werden.
 *
 * Zurück kommen die Knöpfe und eine Funktion, die sie nach dem Speicher neu
 * beschriftet — für den, der den Stand von woanders ändert.
 */
export function infoViewKeys(
  id: InfoViewId,
  className: string,
  changed: (message: string) => void = () => {},
): { keys: HTMLButtonElement[]; draw: () => void } {
  const keys: HTMLButtonElement[] = [];
  const draws: (() => void)[] = [];
  for (const option of infoViewSpec(id).supports) {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = className;
    key.title = INFO_OPTION_SUBS[option];
    key.dataset.infoOption = option;
    const draw = (): void => {
      const options = infoView(id);
      if (option === 'opacity') {
        key.textContent = `${INFO_OPTION_LABELS.opacity} ${INFO_OPACITY_LABELS[options.opacity]}`;
        key.setAttribute('aria-pressed', String(options.opacity !== 1));
        return;
      }
      key.textContent = INFO_OPTION_LABELS[option];
      key.setAttribute('aria-pressed', String(options[option]));
    };
    key.addEventListener('click', () => {
      const next = saveInfoView(id, toggleInfoOption(infoView(id), option));
      draw();
      const state =
        option === 'opacity' ? INFO_OPACITY_LABELS[next.opacity] : next[option] ? 'an' : 'aus';
      changed(`${INFO_OPTION_LABELS[option]} ${state}`);
    });
    draw();
    draws.push(draw);
    keys.push(key);
  }
  return { keys, draw: () => draws.forEach((draw) => draw()) };
}
