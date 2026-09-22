import type { Handedness } from './XRInput';
import type { MenuDetail, MenuEntry, MenuIcon } from '../ui/menu';
import { FIGURE_CHEF, asFigure } from './avatarFigures';
import { saveAppearance } from './appearance';

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
 * **Wie viele Spalten das Regal am Handgelenk nimmt.**
 *
 * Zwei, und in der Brille bleibt es dabei: Dort steht in der Kachel das Modell,
 * und bei drei Spalten sehen zwei ähnliche Fässer gleich aus. **Am Schirm ist
 * diese Zahl nur noch die Vorgabe** — dort stellt sie die Seite selbst ein,
 * nach Fensterbreite und nach dem, was der Spieler an den beiden Knöpfen
 * gewählt hat (`ui/pageCols.ts`). Ein Bildschirm von 1600 Punkten mit zwei
 * Spalten war der gemeldete Befund: „Auf Desktop sind 2 Columns sehr klein."
 */
export const SHELF_COLS = 2;

/**
 * **Eine Datei des Regals, flach** — Adresse, Name, Beschriftung.
 *
 * Der Baum ist zum Blättern da; **gesucht** wird in einer Liste. Sie wird
 * einmal aus dem Index gerechnet (`kaykitFiles`) und danach von der Suche und
 * von den Kategorien gelesen, beide ohne den Baum noch einmal abzulaufen.
 */
export interface KaykitFileRef {
  /** Die Adresse ohne `models/kaykit/` davor — dieselbe wie im Menü. */
  readonly path: string;
  /** Der Dateiname mit Endung. */
  readonly name: string;
  /** Was im Raster darunter steht (`humanLabel`). */
  readonly label: string;
  readonly bytes?: number;
  /**
   * **Wie das Paket heißt, in dem sie liegt** — „Adventurers 2.0" und nicht
   * `adventurers`. Der Steckbrief der Detailseite zeigt es
   * (`ui/menu.MenuDetail`), und dort ist der Ordnername die falsche Antwort:
   * Der Index trägt den wirklichen Namen des Pakets, und genau dafür steht er
   * darin.
   */
  readonly pack: string;
  /**
   * **Alle** Schubladen, in die diese Datei gehört — mindestens eine
   * (`kaykitCategoriesOf`). Sie steht einmal hier und wird nicht bei jedem
   * Tastendruck neu gerechnet: Die Suche fragt sie bei jedem Buchstaben, und
   * viertausendfünfhundert Dateien noch einmal in Wörter zu zerlegen, merkt
   * man am Telefon.
   */
  readonly cats: readonly string[];
}

/**
 * **Alle Dateien des Regals als eine Liste**, in der Reihenfolge, in der sie
 * im Baum stehen.
 *
 * Viertausendfünfhundert Einträge aus Zeichenketten — das ist knapp ein halbes
 * Megabyte im Speicher und kein einziges Modell. Gerechnet wird sie einmal je
 * Index (der Aufrufer merkt sie sich, `PortalWorld.shelfFiles`), denn der
 * Menübaum wird bei jeder Änderung neu gebaut und die Liste ändert sich dabei
 * nie.
 */
export function kaykitFiles(index: KaykitIndex): KaykitFileRef[] {
  const out: KaykitFileRef[] = [];
  collect(index.root, [], out);
  return out;
}

function collect(dir: KaykitDir, trail: readonly string[], out: KaykitFileRef[], pack = ''): void {
  const dirs = [...(dir.dirs ?? [])].sort((a, b) => byName(labelOf(a), labelOf(b)));
  const files = [...(dir.files ?? [])].sort((a, b) => byName(a.name, b.name));
  for (const file of files) {
    const path = kaykitPath(trail, file.name);
    out.push({
      path,
      name: file.name,
      label: humanLabel(file.name),
      ...(file.bytes === undefined ? {} : { bytes: file.bytes }),
      pack,
      cats: kaykitCategoriesOf(path),
    });
  }
  // Auf der ersten Ebene unter der Wurzel stehen die Pakete; von dort an gilt
  // derselbe Name für alles darunter.
  for (const child of dirs) collect(child, [...trail, child.name], out, pack || labelOf(child));
}

/**
 * **Eine Schublade des Regals** — Figuren, Möbel, Natur, und sieben weitere.
 *
 * Der Ordnerbaum ist die Adresse und bleibt es; als **Sortiment** taugt er
 * nicht. Wer ein Bett sucht, weiß nicht, dass es in `furniture-bits` liegt,
 * und wer eine Figur sucht, findet sie in sieben Paketen verteilt. Genau das
 * war der Auftrag: „Ich denke auch Kategorien wären sinnvoll für die einzelnen
 * Elemente wie z. B. Charaktere, Möbel, Items, etc."
 *
 * **Entschieden wird an Paket und Dateinamen**, nicht an einer Liste mit
 * viertausendfünfhundert Zeilen — die pflegt niemand. Ein Paket, das ganz
 * einer Kategorie gehört (`packs`), entscheidet; sonst zählt ein Wort im
 * Dateinamen (`words`).
 *
 * **Eine Datei gehört in so viele Schubladen, wie auf sie passen**, und nicht
 * in die erste davon. Das war einmal anders und war falsch: `crate_buns.glb`
 * ist eine Kiste **und** Essen, und wer Kisten durchsieht, will sie dort
 * finden — auch wenn Essen in der Tabelle weiter oben steht. Der Auftrag sagt
 * es selbst: „Jedes Modell soll mehrere Kategorien zugewiesen bekommen, sodass
 * ich danach suchen kann."
 *
 * Die **Reihenfolge der Tabelle** ist damit keine Entscheidung mehr, sondern
 * nur noch die Reihenfolge der Schubladen im Menü — und die erste passende
 * bleibt die _Haupt_kategorie (`kaykitCategoryOf`), für alles, was genau eine
 * braucht.
 *
 * Die letzte Kategorie fängt alles übrige auf und hat deshalb weder `packs`
 * noch `words`. Ohne sie fiele ein Modell aus dem Regal, nur weil niemand ein
 * Wort dafür aufgeschrieben hat.
 */
export interface KaykitCategory {
  readonly id: string;
  readonly label: string;
  readonly icon: MenuIcon;
  /** Pakete, die ganz hierher gehören — der erste Teil der Adresse. */
  readonly packs?: readonly string[];
  /** Ordner unterhalb eines Pakets, die ganz hierher gehören (`<paket>/<ordner>`). */
  readonly dirs?: readonly string[];
  /** Wörter im Dateinamen; ein Treffer genügt. */
  readonly words?: readonly string[];
}

export const KAYKIT_CATEGORIES: readonly KaykitCategory[] = [
  {
    id: 'figures',
    label: 'Figuren',
    icon: 'npc',
    // Dieselben sieben Pakete, die auch einen eigenen Maßstab bekommen
    // (`core/kaykitFit.KAYKIT_PACK_SCALE`) — dort stehen sie, weil Figuren
    // anders gebaut sind als Requisiten, und hier aus demselben Grund.
    packs: [
      'adventurers',
      'character-animations',
      'mystery-monthly-4',
      'mystery-monthly-5',
      'mystery-monthly-6',
      'skeletons',
    ],
    dirs: ['medieval-hexagon/units', 'prototype-bits/character'],
    words: ['character', 'knight', 'skeleton', 'mannequin', 'zombie', 'ghost', 'npc'],
  },
  {
    id: 'food',
    label: 'Essen & Trinken',
    icon: 'bottle',
    words: [
      'food',
      'bun',
      'buns',
      'burger',
      'bread',
      'cheese',
      'tomato',
      'tomatoes',
      'lettuce',
      'steak',
      'ham',
      'dough',
      'pepperoni',
      'mushroom',
      'mushrooms',
      'onion',
      'onions',
      'carrot',
      'carrots',
      'potato',
      'potatoes',
      'pizza',
      'cake',
      'candy',
      'candycane',
      'apple',
      'pumpkin',
      'bottle',
      'mug',
      'cup',
      'plate',
      'bowl',
      'pan',
      'pot',
      'drink',
      'coffee',
      'soda',
      'icecream',
      'donut',
      'cookie',
    ],
  },
  {
    id: 'furniture',
    label: 'Möbel',
    icon: 'plank',
    packs: ['furniture-bits'],
    words: [
      'chair',
      'table',
      'bed',
      'cabinet',
      'shelf',
      'bookcase',
      'sofa',
      'couch',
      'bench',
      'stool',
      'desk',
      'drawer',
      'wardrobe',
      'counter',
      'stove',
      'oven',
      'sink',
      'fridge',
      'refrigerator',
      'lamp',
      'lantern',
      'mirror',
      'carpet',
      'rug',
      'curtain',
      'toilet',
      'bathtub',
    ],
  },
  {
    id: 'nature',
    label: 'Natur',
    icon: 'cone',
    packs: ['forest-nature'],
    words: [
      'tree',
      'bush',
      'grass',
      'plant',
      'flower',
      'rock',
      'stone',
      'log',
      'stump',
      'leaf',
      'leaves',
      'cactus',
      'water',
      'cliff',
      'hill',
      'mountain',
    ],
  },
  {
    id: 'building',
    label: 'Gebäude & Bauteile',
    icon: 'cube',
    packs: ['city-builder-bits'],
    dirs: ['medieval-hexagon/buildings', 'medieval-hexagon/tiles'],
    words: [
      'building',
      'house',
      'home',
      'wall',
      'walls',
      'floor',
      'roof',
      'door',
      'doorway',
      'window',
      'stairs',
      'stair',
      'pillar',
      'column',
      'arch',
      'fence',
      'gate',
      'tile',
      'bridge',
      'tower',
      'castle',
      'church',
      'road',
      'path',
      'basemodule',
      'platform',
    ],
  },
  {
    id: 'weapons',
    label: 'Waffen',
    icon: 'gun',
    packs: ['fantasy-weapons-bits'],
    words: [
      'sword',
      'axe',
      'bow',
      'arrow',
      'dagger',
      'spear',
      'shield',
      'staff',
      'crossbow',
      'mace',
      'gun',
      'pistol',
      'rifle',
      'bomb',
      'bullet',
      'ammo',
      'quiver',
      'fistweapon',
    ],
  },
  {
    id: 'tools',
    label: 'Werkzeug',
    icon: 'wrench',
    packs: ['rpg-tools-bits'],
    words: [
      'wrench',
      'anvil',
      'chisel',
      'hammer',
      'saw',
      'shovel',
      'pickaxe',
      'bucket',
      'fishing',
      'grindstone',
      'tongs',
      'ladder',
      'rope',
      'torch',
      'blueprint',
      'toolbox',
    ],
  },
  {
    id: 'containers',
    label: 'Kisten & Fässer',
    icon: 'cylinder',
    words: [
      'crate',
      'barrel',
      'box',
      'chest',
      'container',
      'containers',
      'sack',
      'bag',
      'basket',
      'cargo',
      'pile',
      'bucket',
      'lid',
      'pallet',
    ],
  },
  {
    id: 'games',
    label: 'Spiel & Freizeit',
    icon: 'd6',
    packs: ['board-game-bits', 'platformer'],
    words: ['dice', 'card', 'chess', 'ball', 'coin', 'token', 'meeple', 'arcademachine'],
  },
  {
    id: 'decor',
    label: 'Deko',
    icon: 'palette',
    packs: ['halloween-bits', 'holiday-bits'],
    words: [
      'banner',
      'flag',
      'candle',
      'painting',
      'statue',
      'sign',
      'gravestone',
      'skull',
      'bone',
      'decoration',
      'decorated',
      'wreath',
      'ornament',
      'book',
      'books',
    ],
  },
  { id: 'rest', label: 'Alles Übrige', icon: 'folder' },
];

/** Die letzte Schublade — die, die alles auffängt, was sonst niemand nimmt. */
const REST_CATEGORY = KAYKIT_CATEGORIES[KAYKIT_CATEGORIES.length - 1]!.id;

/**
 * **In welche Schubladen diese Adresse gehört** — mindestens eine, oft
 * mehrere, und immer nur solche, die es gibt.
 *
 * Gelesen wird der **Dateiname** in Wörtern, klein geschrieben und ohne
 * Endung: `Containers_Box_Large.glb` ist `containers`, `box`, `large`. Ein
 * Teilwort zählt dabei **nicht** — sonst wäre jeder `Boxer` eine Kiste.
 * Dazu kommt das **Paket** und der Ordner darunter, denn ein ganzes Paket
 * Möbel muss nicht Datei für Datei erkannt werden.
 *
 * Passt keine einzige, steht die Datei in der letzten Schublade und nicht
 * nirgends. Die Reihenfolge der Antwort ist die der Tabelle, und damit ist
 * das erste Element die Hauptkategorie (`kaykitCategoryOf`).
 */
export function kaykitCategoriesOf(path: string): string[] {
  const cut = path.lastIndexOf('/');
  const dir = cut < 0 ? '' : path.slice(0, cut);
  const pack = dir.split('/')[0] ?? '';
  const words = new Set(
    path
      .slice(cut + 1)
      .replace(/\.(glb|gltf)$/i, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 0),
  );
  const out: string[] = [];
  for (const category of KAYKIT_CATEGORIES) {
    // Der Auffangkorb sagt zu nichts von allein ja; er kommt unten dazu.
    if (!category.packs && !category.dirs && !category.words) continue;
    const hit =
      category.packs?.includes(pack) === true ||
      category.dirs?.some((under) => dir === under || dir.startsWith(`${under}/`)) === true ||
      category.words?.some((word) => words.has(word)) === true;
    if (hit) out.push(category.id);
  }
  if (out.length === 0) out.push(REST_CATEGORY);
  return out;
}

/**
 * **Die Hauptschublade** — die erste, auf die eine Datei passt.
 *
 * Dafür, wo eine Datei _hauptsächlich_ hingehört, wenn genau eine Antwort
 * gebraucht wird. Im Menü steht sie in allen (`kaykitCategoriesOf`).
 */
export function kaykitCategoryOf(path: string): string {
  return kaykitCategoriesOf(path)[0]!;
}

/**
 * **Wonach eine Schublade auf einen Suchbegriff hört** — ihre Id und die
 * Wörter ihrer Beschriftung.
 *
 * Damit findet `möbel` dieselben Dateien wie die Schublade _Möbel_, und
 * `furniture` auch — der Kategorie ist beides recht. Gerechnet wird die
 * Tabelle einmal beim Laden des Moduls; sie ändert sich nie.
 */
const CATEGORY_TERMS: ReadonlyMap<string, readonly string[]> = new Map(
  KAYKIT_CATEGORIES.map((category) => [
    category.id,
    [...new Set([...terms(category.id), ...terms(category.label)])],
  ]),
);

/**
 * **Wörter aus einem Text, mit deutschen Umlauten als das, was man tippt.**
 *
 * `Möbel` wird `mobel`, `Kisten & Fässer` wird `kisten`, `fasser`. Ohne die
 * Faltung zerfiele `möbel` am Zerteiler in `m` und `bel` und fände nie
 * etwas — und wer auf einem englischen Pad tippt, schreibt ohnehin `mobel`.
 */
function terms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

/**
 * **Ab wie vielen Zeichen ein Wort auch eine Schublade meinen darf.**
 *
 * Drei, denn ein einzelnes `d` passt auf `decor` und damit auf ein Zehntel
 * der Sammlung — ein Filter, der alles durchlässt, ist kein Filter.
 */
const CATEGORY_TERM_MIN = 3;

/** Ob dieses Wort eine der Schubladen dieser Datei meint. */
function hitsCategory(cats: readonly string[], term: string): boolean {
  if (term.length < CATEGORY_TERM_MIN) return false;
  for (const id of cats) {
    const words = CATEGORY_TERMS.get(id);
    if (words?.some((word) => word.startsWith(term))) return true;
  }
  return false;
}

/**
 * **Wie viele Treffer eine Suche höchstens hergibt.**
 *
 * Zweihundert, und das ist großzügig: Wer nach `tree` sucht, bekommt im
 * Waldpaket über tausend Treffer, und die letzten neunhundert sieht niemand
 * an. Die Zahl begrenzt zugleich, was die Seite zeichnen muss — sie lädt zwar
 * beim Scrollen nach (`ui/PageMenu.ts`), aber eine Liste, deren Ende nie
 * kommt, ist keine Antwort auf eine Suche, sondern eine zweite Frage.
 */
export const SEARCH_LIMIT = 200;

/**
 * **Suchen heißt hier: alle Wörter müssen vorkommen.**
 *
 * `holz kiste` findet nichts, `crate wood` schon — gesucht wird im Dateinamen
 * **und** im Pfad, damit auch ein Paketname als Filter taugt (`dungeon barrel`).
 * Ein Wort zählt als Treffer, wenn es irgendwo darin vorkommt, und nicht nur
 * am Wortanfang: Wer `lantern` eintippt, will auch `wall_lantern` finden.
 *
 * **Und die Schubladen zählen mit** (`hitsCategory`). `möbel` findet den
 * Sessel, dessen Datei nirgends `furniture` heißt, und `möbel holz` findet
 * das hölzerne darunter — genau dafür bekommt jede Datei mehrere Kategorien.
 * Eine Schublade zählt dabei am wenigsten: Wer den Namen trifft, steht vorn.
 *
 * **Sortiert wird nach Güte**: Wer den Dateinamen trifft, steht vor dem, der
 * nur im Ordnernamen vorkommt, und ein Name, der mit dem Gesuchten
 * **anfängt**, vor einem, der es irgendwo enthält. Sonst steht bei `chair` die
 * Kachel `restaurant-bits/chair_A` hinter dreißig Dateien aus einem Ordner,
 * der zufällig `chairs` heißt.
 */
export function kaykitSearch(
  files: readonly KaykitFileRef[],
  query: string,
  limit = SEARCH_LIMIT,
): KaykitFileRef[] {
  const wanted = terms(query);
  if (wanted.length === 0) return [];
  const hits: { file: KaykitFileRef; score: number }[] = [];
  for (const file of files) {
    const name = file.name.toLowerCase();
    const path = file.path.toLowerCase();
    let score = 0;
    let all = true;
    for (const term of wanted) {
      if (name.startsWith(term)) score += 4;
      else if (name.includes(term)) score += 2;
      else if (path.includes(term)) score += 1;
      else if (hitsCategory(file.cats, term)) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (all) hits.push({ file, score });
  }
  hits.sort((a, b) => b.score - a.score || byName(a.file.label, b.file.label));
  return hits.slice(0, Math.max(0, limit)).map((hit) => hit.file);
}

/**
 * **Der Anfang des Katalogs: drei Wege hinein.**
 *
 * _Alles anschauen_, _Nach Paketen_, _Nach Kategorien_ — und dahinter jeweils
 * dasselbe Raster mit denselben Kacheln. Vorher standen die elf Schubladen und
 * die Pakete auf einer Seite nebeneinander, und das war eine Liste aus zwei
 * Sorten Dingen: Man musste erst lesen, was davon eine Kategorie und was ein
 * Paket ist. Gewünscht war genau diese Gabelung: „Ich will bei dem Katalog
 * auswählen können zu Beginn: Alles anschauen, Nach Packs, nach Kategorien und
 * dann wird das jeweilige Menü gezeigt."
 *
 * Und die Frage wird nur **einmal** gestellt: Wo man im Katalog stand, merkt
 * sich der Weg durchs Menü über das Schließen hinaus (`ui/menuNav.ts`,
 * `ui/menuRecall.ts`). Wer wirklich von vorn anfangen will, drückt den Knopf
 * im Kopf der Seite (`MenuEntry.home`).
 *
 * Gebaut wird der **ganze** Baum auf einmal, und das ist Absicht: Er besteht
 * aus Zeichenketten und Funktionen, kein einziges Modell hängt daran. Geladen
 * wird erst, was auch zu sehen ist — dafür sorgt die Vorschau-Fabrik im Menü,
 * die je sichtbarer Kachel genau einmal gefragt wird (`ui/WristMenu.ts`).
 * Gerechnet wird er trotzdem nur einmal je Index: Der Aufrufer hebt ihn auf
 * (`PortalWorld.shelfMenu`), denn das Menü wird bei jeder Änderung neu
 * gesetzt und fünfzehntausend Einträge je Tastendruck wären spürbar.
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
  const packs = kaykitPackMenu(index, pick);
  if (packs.length === 0) return [];
  const files = kaykitFiles(index);
  const entries = [allEntry(files, pick), packsEntry(packs), categoriesEntry(files, pick)];
  // **Das Suchfeld gilt auf jeder Seite des Regals** und nicht nur auf der
  // ersten. Wer drei Ebenen tief im Waldpaket steht und `lantern` sucht, sucht
  // die Sammlung und nicht den Ordner — eine Suche, die nur dort greift, wo
  // man gerade steht, findet genau das, was man ohnehin sieht.
  offerSearch(entries, (query) => kaykitSearchEntries(files, query, pick));
  return entries;
}

/** Jedem Blatt-losen Eintrag das Suchfeld mitgeben — einmal je Baum. */
function offerSearch(entries: readonly MenuEntry[], find: (query: string) => MenuEntry[]): void {
  for (const entry of entries) {
    if (!entry.children) continue;
    entry.find = find;
    offerSearch(entry.children, find);
  }
}

/**
 * **Der Ordnerbaum allein** — die Pakete, wie sie auf der Platte liegen.
 *
 * Das war einmal das ganze Regal und ist jetzt seine zweite Hälfte: Die
 * Schubladen beantworten „Ich will ein Bett", der Baum beantwortet „Was ist
 * eigentlich in `mixed-bag`?". Er steht hier für sich, weil er für sich
 * geprüft wird — die Reihenfolge, die Fächer und die Ids hängen an ihm und
 * nicht an den Schubladen.
 */
export function kaykitPackMenu(
  index: KaykitIndex,
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry[] {
  return entriesOf(index.root, [], pick, '');
}

/**
 * **Alles anschauen** — die ganze Sammlung als eine Liste, ohne Ordner
 * darüber.
 *
 * In der Brille zerfällt sie in Fächer zu sechzig (`KAYKIT_CHUNK`), am Schirm
 * wächst sie beim Scrollen (`ui/PageMenu.ts`). Für „ich weiß nicht, was ich
 * suche, zeig mir einfach alles" ist das der kürzeste Weg, den es gibt.
 */
function allEntry(
  files: readonly KaykitFileRef[],
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry {
  const count = files.length === 1 ? '1 Modell' : `${files.length} Modelle`;
  return {
    id: 'kaykit#all',
    label: 'Alles anschauen',
    sub: count,
    // **Die Zahl steht auch in der Kachel.** Eine Rasterkachel zeigt den
    // Untertitel nicht, sondern die Bildunterschrift (`ui/PageMenu.tile`) —
    // und auf einer Seite, die aus drei Kacheln besteht, ist genau diese Zahl
    // das, wonach man sich entscheidet.
    caption: count,
    icon: 'cube',
    accent: KAYKIT_ACCENT,
    grid: true,
    cols: SHELF_COLS,
    full: true,
    take: true,
    children: refEntries(files, 'all', pick),
  };
}

/** Die Schubladen, eine Ebene tiefer — der zweite der drei Wege hinein. */
function categoriesEntry(
  files: readonly KaykitFileRef[],
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry {
  const drawers = categoryEntries(files, pick);
  const count = drawers.length === 1 ? '1 Kategorie' : `${drawers.length} Kategorien`;
  return {
    id: 'kaykit#cats',
    label: 'Nach Kategorien',
    sub: count,
    caption: count,
    icon: 'palette',
    accent: KAYKIT_ACCENT,
    grid: true,
    cols: SHELF_COLS,
    full: true,
    take: true,
    children: drawers,
  };
}

/**
 * Die Schubladen als Kacheln — leere fallen weg.
 *
 * **Eine Datei steht in jeder Schublade, in die sie passt** und nicht nur in
 * der ersten (`kaykitCategoriesOf`): Die Kiste Brötchen ist unter _Essen_ zu
 * finden und unter _Kisten_, und beides sucht jemand.
 */
function categoryEntries(
  files: readonly KaykitFileRef[],
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry[] {
  const drawers = new Map<string, KaykitFileRef[]>();
  for (const file of files) {
    for (const id of file.cats) {
      const list = drawers.get(id);
      if (list) list.push(file);
      else drawers.set(id, [file]);
    }
  }
  const entries: MenuEntry[] = [];
  for (const category of KAYKIT_CATEGORIES) {
    const list = drawers.get(category.id);
    if (!list || list.length === 0) continue;
    const count = list.length === 1 ? '1 Modell' : `${list.length} Modelle`;
    entries.push({
      id: `kaykit#cat:${category.id}`,
      label: category.label,
      sub: count,
      caption: count,
      icon: category.icon,
      accent: KAYKIT_ACCENT,
      grid: true,
      cols: SHELF_COLS,
      full: true,
      take: true,
      children: refEntries(list, `cat:${category.id}`, pick),
    });
  }
  return entries;
}

/** Der Ordnerbaum, eine Ebene tiefer — die Pakete, wie sie auf der Platte liegen. */
function packsEntry(packs: MenuEntry[]): MenuEntry {
  const count = packs.length === 1 ? '1 Paket' : `${packs.length} Pakete`;
  return {
    id: 'kaykit#packs',
    label: 'Nach Paketen',
    sub: count,
    caption: count,
    icon: 'folder',
    accent: KAYKIT_ACCENT,
    grid: true,
    cols: SHELF_COLS,
    full: true,
    take: true,
    children: packs,
  };
}

function entriesOf(
  dir: KaykitDir,
  trail: readonly string[],
  pick: (path: string, hand: Handedness | null) => void,
  pack: string,
): MenuEntry[] {
  const dirs = [...(dir.dirs ?? [])].sort((a, b) => byName(labelOf(a), labelOf(b)));
  const files = [...(dir.files ?? [])].sort((a, b) => byName(a.name, b.name));
  return [
    // Die erste Ebene unter der Wurzel sind die Pakete; ab dort trägt jeder
    // Ordner den Namen seines Pakets weiter — der Steckbrief einer Datei nennt
    // ihn (`ui/menu.MenuDetail`).
    ...dirs.map((child) =>
      folderEntry(child, [...trail, child.name], pick, pack || labelOf(child)),
    ),
    ...fileEntries(files, trail, trail.join('/'), pick, pack),
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
  pack: string,
): MenuEntry {
  return {
    id: `kaykit:${trail.join('/')}`,
    label: labelOf(dir),
    sub: folderSub(dir),
    icon: 'folder',
    accent: KAYKIT_ACCENT,
    grid: true,
    cols: SHELF_COLS,
    full: true,
    take: true,
    children: entriesOf(dir, trail, pick, pack),
  };
}

/**
 * Die Dateien eines Ordners — und, wenn es zu viele sind, **Fächer** davor
 * (siehe `KAYKIT_CHUNK`).
 *
 * `key` ist das Stück Id, an dem ein Fach hängt: bei einem Ordner sein Pfad,
 * bei einer Schublade `cat:<id>`. Es muss stabil sein, sonst verliert der Weg
 * durchs Menü seine Stelle (`ui/menuNav.ts`).
 */
function fileEntries(
  files: readonly KaykitFile[],
  trail: readonly string[],
  key: string,
  pick: (path: string, hand: Handedness | null) => void,
  pack: string,
): MenuEntry[] {
  return sheetsOf(
    files.map((file) => {
      const path = kaykitPath(trail, file.name);
      return {
        path,
        name: file.name,
        label: humanLabel(file.name),
        ...(file.bytes === undefined ? {} : { bytes: file.bytes }),
        pack,
        cats: kaykitCategoriesOf(path),
      };
    }),
    key,
    pick,
  );
}

/** Dasselbe aus der flachen Liste — für die Schubladen und für die Suche. */
function refEntries(
  files: readonly KaykitFileRef[],
  key: string,
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry[] {
  return sheetsOf(files, key, pick);
}

function sheetsOf(
  files: readonly KaykitFileRef[],
  key: string,
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry[] {
  return kaykitSheets(files, key, (file) => fileEntry(file, pick));
}

/**
 * **Dieselben Fächer für eine Liste, die etwas anderes tut** — die
 * Blätterlogik des Regals, ohne das Regal.
 *
 * Gebraucht hat sie zuerst das NPC-Menü: _NPC → Figur aus dem Regal_ zeigt die
 * Schublade `figures`, und was dort beim Nehmen passiert, ist nicht „in die
 * Hand", sondern „hinstellen und loslaufen lassen"
 * (`PortalWorld.npcShelfMenu`). Alles andere an so einer Seite ist dasselbe:
 * fünfundachtzig Kacheln, zwei Spalten, in der Brille in Fächer zerlegt und am
 * Schirm flach (`flatten`). Eine zweite Kopie davon wäre eine zweite
 * Blätterstellung, die morgen anders bricht.
 *
 * `make` baut die Kachel, `key` ist das Stück Id, an dem die Fächer hängen —
 * es muss stabil sein, sonst verliert der Weg durchs Menü seine Stelle
 * (`ui/menuNav.ts`).
 */
export function kaykitSheets(
  files: readonly KaykitFileRef[],
  key: string,
  make: (file: KaykitFileRef) => MenuEntry,
): MenuEntry[] {
  if (files.length <= KAYKIT_CHUNK) {
    return files.map((file) => make(file));
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
      id: `kaykit:${key}#${start}`,
      label: `${start + 1}–${start + part.length}`,
      sub: `${first.label} … ${last.label}`,
      icon: 'folder',
      accent: KAYKIT_ACCENT,
      grid: true,
      cols: SHELF_COLS,
      full: true,
      take: true,
      // **Am Schirm gibt es diese Fächer nicht** (`ui/menu.MenuEntry.flatten`):
      // Dort wird gescrollt und nachgeladen, und ein Zwischenschritt „1–60"
      // wäre ein Klick, der nichts erklärt. In der Brille bleiben sie, denn
      // dort blättert ein Stick, und vierhundert Seiten blättert niemand.
      flatten: true,
      children: part.map((file) => make(file)),
    });
  }
  return sheets;
}

function fileEntry(
  file: KaykitFileRef,
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry {
  return {
    id: `kaykit:${file.path}`,
    label: file.label,
    sub: kaykitSize(file.bytes),
    accent: KAYKIT_ACCENT,
    // Die Id der Vorschau **ist** die Id der Zeile: Was man sieht, ist das,
    // was man bekommt, und die Fabrik im Menü muss nichts übersetzen.
    preview: `kaykit:${file.path}`,
    // **Die Detailseite hinter dem ⓘ in der Ecke der Kachel**
    // (`ui/menu.MenuDetail`, `ui/PageMenu.ts`). Sie nimmt den ganzen Schirm,
    // wie der Katalog darüber: Was sie zeigt, ist ein Modell in Lebensgröße
    // und keine Liste mit vier Zeilen.
    full: true,
    detail: {
      preview: `kaykit:${file.path}`,
      facts: fileFacts(file),
      ...(figureAction(file) ?? {}),
    },
    run: (hand) => pick(file.path, hand),
  };
}

/**
 * **_Als Figur tragen_ — der Knopf unter einer Figur** (`MenuDetail.action`).
 *
 * Er steht nur bei dem, was in der Schublade _Figuren_ liegt: Ein Fass als
 * Spielfigur wäre ein Fass, das keinen Kopfknochen hat und in der T-Pose durch
 * die Küche rutscht. Die Schublade ist dabei dieselbe Auskunft, die auch das
 * Regal benutzt (`kaykitCategoriesOf`) — es gibt keine zweite Liste, die
 * morgen etwas anderes sagt.
 *
 * **Warum das Regal hier vom Kleiderschrank weiß.** Es sieht nach einer
 * Kopplung aus, ist aber keine: Das Aussehen gehört dem **Spieler** und keiner
 * Welt (`core/appearance.ts`), es liegt im Browser wie die Augenhöhe, und jede
 * Stelle darf es lesen und schreiben. Die Alternative wäre, einen
 * `wear`-Rückruf durch fünf Menüfunktionen und zwei Welten zu fädeln, damit am
 * Ende dieselbe eine Zeile steht.
 *
 * Und es ist der ganze Sinn dieses Wegs: Der Kleiderschrank stellt zwölf
 * Figuren hin (`core/avatarFigures.FIGURE_KINDS`), hier steht **jede** der
 * rund 85 — und zwar schon groß vor einem, mit Gitterboden, Hülle und der
 * Bewegung, die man sich aussuchen kann.
 */
function figureAction(file: KaykitFileRef): Pick<MenuDetail, 'action'> | null {
  if (!file.cats.includes('figures')) return null;
  const path = asFigure(file.path);
  if (path === FIGURE_CHEF) return null;
  return {
    action: {
      label: 'Als Figur tragen',
      sub: 'Ersetzt den Koch — im Spiegel, im Kleiderschrank und für alle im Raum',
      run: () => void saveAppearance({ figure: path }),
    },
  };
}

/**
 * **Der Steckbrief einer Datei** — das, was schon im Index steht.
 *
 * Alles andere misst die Vorschau am geladenen Modell (Kantenlängen in Metern,
 * Dreiecke, Bewegungen) und reicht es nach; hier steht nur, was ohne eine
 * einzige geladene Datei zu haben ist. Eine Zeile ohne Wert fällt weg — ein
 * Steckbrief ist kein Formular.
 */
function fileFacts(file: KaykitFileRef): { label: string; value: string }[] {
  const cut = file.path.lastIndexOf('/');
  const folder = cut < 0 ? '' : file.path.slice(0, cut);
  const drawers = file.cats
    .map((id) => KAYKIT_CATEGORIES.find((category) => category.id === id)?.label ?? id)
    .join(' · ');
  return [
    { label: 'Paket', value: file.pack },
    { label: 'Ordner', value: folder },
    { label: 'Datei', value: file.name },
    { label: 'Dateigröße', value: kaykitSize(file.bytes) },
    { label: 'Schubladen', value: drawers },
  ].filter((fact) => fact.value.length > 0);
}

/**
 * **Die Treffer einer Suche als Menüseite** — dieselben Kacheln wie überall
 * sonst, nur ohne Ordner darüber.
 *
 * Die Ids tragen dabei die Adresse des Modells und nicht die Suche: Wer
 * zweimal dasselbe sucht, steht auf derselben Kachel, und die Vorschau muss
 * nichts übersetzen.
 */
export function kaykitSearchEntries(
  files: readonly KaykitFileRef[],
  query: string,
  pick: (path: string, hand: Handedness | null) => void,
): MenuEntry[] {
  return kaykitSearch(files, query).map((file) => fileEntry(file, pick));
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
