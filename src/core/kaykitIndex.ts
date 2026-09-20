import type { Handedness } from './XRInput';
import type { MenuEntry } from '../ui/menu';

/**
 * **Das Regal als Baum** — was in `public/models/kaykit/` liegt, und was im
 * Menü daraus wird. Ohne three.js, ohne Datei, ohne Netz.
 *
 * Dieselbe Teilung wie bei den anderen Katalogen (`core/mixedbagFit.ts`,
 * `core/dinerFit.ts`): Der Lader braucht `GLTFLoader` und `import.meta`, und
 * beides gibt es in Jest nicht. Was aus einem Verzeichnisbaum ein Menü macht,
 * ist dagegen reine Rechnung — und weil genau daran alles hängt (die Ids, die
 * sich der Weg durchs Menü merkt, die Reihenfolge, die Beschriftungen), steht
 * es hier und wird geprüft.
 *
 * **Warum ein Index und kein Durchsuchen des Ordners.** Ein Browser kann ein
 * Verzeichnis nicht auflisten; er kann nur Dateien holen, deren Namen er
 * kennt. Also schreibt ein Werkzeug (`tools/kaykit-model.mjs`) den Baum einmal
 * beim Bauen auf, und die Seite liest diese eine Datei. Ihr Format steht unten
 * und ist ein Vertrag zwischen zwei Programmen — was hier optional ist, darf
 * fehlen, und der Rest muss trotzdem stehen.
 */

/** Eine Modelldatei im Regal. Nur `.glb`/`.gltf` stehen im Index. */
export interface KaykitFile {
  /** Der Dateiname mit Endung, so wie er auf der Platte liegt. */
  readonly name: string;
  /** Wie groß die Datei ist — für die Zeile unter dem Namen. */
  readonly bytes?: number;
  /**
   * Die Kantenlängen des Modells in den Maßen der Quelle, wenn das Werkzeug
   * sie gemessen hat. **Darauf verlässt sich hier nichts**: Der Index ist
   * fremde Arbeit, und ein Feld, das es vielleicht nicht gibt, darf nicht
   * tragen. Wer die wirkliche Größe braucht, misst am geladenen Modell.
   */
  readonly size?: readonly [number, number, number];
}

/** Ein Ordner im Regal — ein Paket, ein Unterordner, oder die Wurzel. */
export interface KaykitDir {
  /** Der Ordnername auf der Platte; er ist ein Stück der Adresse. */
  readonly name: string;
  /** Wie das Paket wirklich heißt. Nur Paketordner haben das. */
  readonly label?: string;
  /** Die Lizenz des Pakets, z. B. `CC0-1.0`. Nur Paketordner haben das. */
  readonly license?: string;
  readonly dirs?: readonly KaykitDir[];
  readonly files?: readonly KaykitFile[];
}

/** Der ganze Index, wie er in `models/kaykit/index.json` steht. */
export interface KaykitIndex {
  readonly version: number;
  readonly root: KaykitDir;
}

/**
 * **Ab wie vielen Dateien ein Ordner in Blätter zerfällt.**
 *
 * Das Waldpaket allein bringt rund 1588 Modelle mit. In einem Raster mit zwei
 * Spalten und zwei Zeilen je Seite wären das vierhundert Seiten Blättern — mit
 * dem Stick eine gute Minute, bis man unten ist, und niemand kommt dort je an.
 * Also legt ein großer Ordner seine Dateien in **Blätter** zu je sechzig, und
 * die stehen als Fächer davor: fünfzehn Seiten bis zum letzten Blatt, vier bis
 * zur letzten Datei darin. Das ist kein Suchfeld und ersetzt keins — es ist
 * die billigste Form davon, die es gibt, und sie fällt aus dem Baum heraus,
 * ohne dass jemand eine Tastatur braucht.
 *
 * Sechzig, weil ein Blatt dann fünfzehn Rasterseiten hat: genug, dass ein
 * Paket nicht in hundert Fächer zerfällt, und wenig genug, dass man in einem
 * Blatt nicht wieder verlorengeht.
 */
export const KAYKIT_CHUNK = 60;

/** Die Farbe des Regals im Menü — Ordner wie Modelle tragen sie. */
export const KAYKIT_ACCENT = 0x7fd6a6;

/**
 * **Die Adresse einer Datei im Regal**, ohne `models/kaykit/` davor.
 *
 * Die Ordnernamen sind die **unterhalb** der Wurzel; die Wurzel selbst heißt
 * `kaykit` und steckt schon im Ordner, in dem alles liegt. Wer die volle
 * Adresse will, hängt `models/kaykit/` davor — das tut der Lader
 * (`core/kaykitModel.ts`), und nur er.
 */
export function kaykitPath(dirs: readonly string[], file: string): string {
  return [...dirs, file].join('/');
}

/**
 * **Aus einem Dateinamen eine Beschriftung.**
 *
 * `barrel_large.glb` heißt im Raster `Barrel Large`: Endung weg, Unterstriche
 * und Bindestriche zu Leerzeichen, und jedes Wort, das durchweg klein
 * geschrieben ist, bekommt einen großen Anfangsbuchstaben. **Durchweg klein**
 * ist die Bedingung, damit Namen, die der Zeichner selbst geschrieben hat
 * (`KayKit`, `hexNW`), so bleiben, wie er sie meinte — ein `Hexnw` wäre eine
 * Korrektur, um die niemand gebeten hat.
 */
export function humanLabel(fileName: string): string {
  const bare = fileName.replace(/\.(glb|gltf)$/i, '');
  return bare
    .split(/[_\-\s]+/)
    .filter((word) => word.length > 0)
    .map((word) =>
      word === word.toLowerCase() ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(' ');
}

/**
 * **Wie groß eine Datei ist**, in einer Zeile unter dem Namen.
 *
 * Kilobyte bis 1024, danach Megabyte mit einer Nachkommastelle und deutschem
 * Komma. Ohne Angabe bleibt die Zeile leer — sie ist ein Hinweis und kein
 * Formular.
 */
export function kaykitSize(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1).replace('.', ',')} MB`;
}

/**
 * **Der Pfad hinter einer Vorschau-Id**, oder `null`, wenn die Id keine aus
 * dem Regal ist.
 *
 * Die Welt setzt eine einzige Modellfabrik ins Menü (`WristMenus.setModelFactory`),
 * und die muss die Werkzeug-Ids von den Regal-Ids unterscheiden können. Ein
 * Fach (`kaykit:<ordner>#<n>`) ist keine Datei und bekommt deshalb auch kein
 * Modell.
 */
export function kaykitPathOf(id: string): string | null {
  if (!id.startsWith('kaykit:')) return null;
  const path = id.slice('kaykit:'.length);
  return path.length > 0 && !path.includes('#') ? path : null;
}

/**
 * **Der Baum als Menü** — Ordner zuerst, dann die Modelle.
 *
 * Gebaut wird der **ganze** Baum auf einmal, und das ist Absicht: Er besteht
 * aus Zeichenketten und Funktionen, kein einziges Modell hängt daran. Geladen
 * wird erst, was auch zu sehen ist — dafür sorgt die Vorschau-Fabrik im Menü,
 * die je sichtbarer Kachel genau einmal gefragt wird (`ui/WristMenu.ts`).
 *
 * **Die Ids sind Adressen** (`kaykit:<pfad>`), und sie müssen stabil sein:
 * Der Weg durchs Menü und die Blätterstellung jeder Seite hängen daran
 * (`ui/menuNav.ts`). Ein Index, der zweimal dasselbe Regal beschreibt, ergibt
 * deshalb zweimal denselben Baum — auch nach einem neuen Build.
 *
 * @param pick was beim Nehmen passiert: Adresse und die Hand, die zugegriffen
 *             hat (in der Brille), oder `null` am Schirm.
 */
export function kaykitMenu(
  index: KaykitIndex,
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry[] {
  return entriesOf(index.root, [], pick);
}

function entriesOf(
  dir: KaykitDir,
  trail: readonly string[],
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry[] {
  const dirs = [...(dir.dirs ?? [])].sort((a, b) => byName(labelOf(a), labelOf(b)));
  const files = [...(dir.files ?? [])].sort((a, b) => byName(a.name, b.name));
  return [
    ...dirs.map((child) => folderEntry(child, [...trail, child.name], pick)),
    ...fileEntries(files, trail, pick),
  ];
}

/**
 * Ein Ordner als Kachel: Name, was darin liegt, und dahinter dieselbe Art
 * Seite wieder — zwei Spalten, genommen wird mit Greifen.
 */
function folderEntry(
  dir: KaykitDir,
  trail: readonly string[],
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry {
  return {
    id: `kaykit:${trail.join('/')}`,
    label: labelOf(dir),
    sub: folderSub(dir),
    icon: 'folder',
    accent: KAYKIT_ACCENT,
    grid: true,
    cols: 2,
    take: true,
    children: entriesOf(dir, trail, pick),
  };
}

/**
 * Die Dateien eines Ordners — und, wenn es zu viele sind, **Fächer** davor
 * (siehe `KAYKIT_CHUNK`).
 */
function fileEntries(
  files: readonly KaykitFile[],
  trail: readonly string[],
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry[] {
  if (files.length <= KAYKIT_CHUNK) {
    return files.map((file) => fileEntry(file, trail, pick));
  }
  const sheets: MenuEntry[] = [];
  for (let start = 0; start < files.length; start += KAYKIT_CHUNK) {
    const part = files.slice(start, start + KAYKIT_CHUNK);
    const first = part[0]!;
    const last = part[part.length - 1]!;
    sheets.push({
      // Die Nummer der ersten Datei und nicht die des Fachs: Kommt eine Datei
      // dazu, rutschen die Grenzen — die Id eines Fachs bleibt dann wenigstens
      // dieselbe, solange sein Anfang derselbe ist.
      id: `kaykit:${trail.join('/')}#${start}`,
      label: `${start + 1}–${start + part.length}`,
      sub: `${humanLabel(first.name)} … ${humanLabel(last.name)}`,
      icon: 'folder',
      accent: KAYKIT_ACCENT,
      grid: true,
      cols: 2,
      take: true,
      children: part.map((file) => fileEntry(file, trail, pick)),
    });
  }
  return sheets;
}

function fileEntry(
  file: KaykitFile,
  trail: readonly string[],
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry {
  const path = kaykitPath(trail, file.name);
  return {
    id: `kaykit:${path}`,
    label: humanLabel(file.name),
    sub: kaykitSize(file.bytes),
    accent: KAYKIT_ACCENT,
    // Die Id der Vorschau **ist** die Id der Zeile: Was man sieht, ist das,
    // was man bekommt, und die Fabrik im Menü muss nichts übersetzen.
    preview: `kaykit:${path}`,
    run: (hand) => pick(path, hand),
  };
}

/** Was unter dem Ordnernamen steht: die Lizenz des Pakets und der Inhalt. */
function folderSub(dir: KaykitDir): string {
  const parts: string[] = [];
  if (dir.license) parts.push(dir.license);
  const dirs = dir.dirs?.length ?? 0;
  const files = dir.files?.length ?? 0;
  if (dirs > 0) parts.push(dirs === 1 ? '1 Ordner' : `${dirs} Ordner`);
  if (files > 0) parts.push(files === 1 ? '1 Modell' : `${files} Modelle`);
  if (parts.length === 0) parts.push('leer');
  return parts.join(' · ');
}

function labelOf(dir: KaykitDir): string {
  return dir.label ?? humanLabel(dir.name);
}

/**
 * Sortiert wird nach dem, was dasteht, und **mit Zahlen als Zahlen**:
 * `hex_2` gehört vor `hex_10`, und ein Regal, in dem das nicht stimmt, sieht
 * aus, als sei es ungeordnet.
 */
function byName(a: string, b: string): number {
  return a.localeCompare(b, 'de', { numeric: true, sensitivity: 'base' });
}
