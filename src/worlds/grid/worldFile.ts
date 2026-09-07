import { NavGraph } from '../nav/navGraph';
import { NavFormatError, readNav, writeNav, type NavFile } from '../nav/navSerial';
import { TILE, keyLevel, keyX, keyZ, tileKey, type Dir } from '../nav/navTile';
import { BLOCKS, type BlockKind } from './blocks';
import { GRID_KINDS, type PlanSolidKind } from './solids';
import type { BlockPlacement, GridPlan, Mass } from './gridPlan';

/**
 * **Eine ganze Welt als Datei** — und zwar wirklich die ganze.
 *
 * Bis hierher gab es zwei Hälften und keine Naht dazwischen. Der
 * Navigationsgraph hatte längst ein sauberes, versioniertes Format
 * (`nav/navSerial.ts`): Kacheln, Wände, Türen, Verbindungen. Alles andere, was
 * eine Gitterwelt ausmacht, hatte keins — die **Bausteine** lagen als nacktes
 * JSON daneben, ungeprüft und ohne Version, und die **Massen** (das Dach über
 * einer Halle, die Felswand um Dust, der Sand darunter) wurden überhaupt nicht
 * gespeichert. Ein „gespeicherter Grundriss" war deshalb genau so lange
 * brauchbar, wie die Welt keine hatte.
 *
 * Diese Datei schließt das. Drei Entscheidungen tragen sie:
 *
 * - **Der Graph bleibt der Graph.** Das Weltformat *enthält* eine
 *   `nav`-Datei, es ersetzt sie nicht. Damit erbt es jede Prüfung, die dort
 *   schon steht (Kachelgröße, Version, Kachelläufe), und wer nur die Karte
 *   braucht, greift sich `nav` heraus.
 * - **Gespeichert wird der Grundwert, nicht das Ergebnis.** In den Kacheldaten
 *   eines laufenden Plans stecken die Aufschläge der Bausteine schon drin: Eine
 *   Küchenzeile macht ihre Kachel teurer. Wer diese Zahl speichert, sie beim
 *   Laden als Grundwert nimmt und die Bausteine danach anwendet, zählt jeden
 *   Aufschlag zweimal — nach dem dritten Laden ist die Küche unbegehbar. Also
 *   steht in `nav` der Plan **ohne** Möbel, und die Aufschläge werden beim
 *   Laden neu gerechnet. Das ist die eine Zeile, die diesen ganzen Kommentar
 *   wert ist.
 * - **Koordinaten sind Zahlen, keine Schlüssel.** Eine Kachel steht als
 *   `x`, `z`, `l` in der Datei und nicht als `TileKey`. Der Schlüssel ist eine
 *   gepackte Ganzzahl (`navTile.ts`), also ein Implementierungsdetail: Wer
 *   seine Packung ändert, macht damit sonst still jede gespeicherte Welt
 *   kaputt — und niemand sähe es, weil die Datei weiterhin gültig aussieht.
 *
 * **Was hier bewusst nicht drinsteht**, damit niemand es sucht: Eine Weltdatei
 * ist ein **Grundriss** und kein Spielstand. Sie kennt Kacheln, Wände, Türen,
 * Verbindungen, Bausteine und Massen — also alles, was `GridPlan` führt. Sie
 * kennt **nicht**, was eine Welt darüber hinaus von Hand hinstellt
 * (`buildProps`): die Lampen und den Dimmer des Dunkelhauses, die Karts in der
 * Boxengasse, die Kisten zum Herumwerfen. Und sie kennt keine Farben — welchen
 * Ton eine Wand hat, entscheidet die Welt, in der sie steht (`GridWorld.tint`),
 * und genau deshalb sieht ein importiertes Dunkelhaus im Bauplatz aus wie ein
 * Bauplan und nicht wie ein Haus. Das ist die Grenze, und sie ist gezogen und
 * nicht vergessen: Ein Format, das *alles* speichert, ist eines, das bei jeder
 * neuen Lampe eine neue Version braucht.
 */

/** Woran man eine Weltdatei erkennt. */
export const WORLD_FORMAT = 'baumgartner-welt';

/**
 * **Die Version des Formats**, als Semver.
 *
 * Sie steht als Zeichenkette und nicht als Zahl, weil an einer Welt drei
 * verschiedene Sachen wachsen können und man sie auseinanderhalten will:
 *
 * - **Patch** (`0.1.1`): nichts am Inhalt, nur eine Kleinigkeit an der Datei.
 * - **Minor** (`0.2.0`): etwas ist dazugekommen, das ältere Leser nicht
 *   kennen. Solange die Hauptnummer `0` ist, gilt eine neue Minor-Nummer als
 *   Bruch — so liest man Semver vor 1.0, und alles andere wäre ein
 *   Versprechen, das dieses Format noch nicht halten kann.
 * - **Major** (`1.0.0`): das Format ist erwachsen und ändert sich nicht mehr
 *   ohne Not.
 *
 * Gelesen wird, was `READABLE` sagt. Eine Datei aus der Zukunft wird
 * **abgelehnt** und nicht halb geladen: Eine Welt, der beim Laden die Hälfte
 * fehlt, sieht aus wie eine kaputte Welt und nicht wie eine zu neue.
 */
export const WORLD_VERSION = '0.1.0';

/** Welche Fassungen dieses Programm lesen kann. */
const READABLE: readonly string[] = ['0.1'];

/** Eine Kachel in der Datei: Spalte, Zeile, Etage. */
interface TileRef {
  x: number;
  z: number;
  /** Etage — fehlt, wenn Erdgeschoss. */
  l?: number;
}

/** Ein Baustein an seinem Platz. */
export interface WorldBlockEntry extends TileRef {
  kind: BlockKind;
  /** Blickrichtung, 0 = Norden (`navTile.ts`). */
  dir: number;
  /** Eigene Höhe in Metern — fehlt bei allem, was seine Normhöhe behält. */
  h?: number;
}

/**
 * Eine Masse: ein Quader über ein Kachelrechteck.
 *
 * Sie ist der Grund, warum es dieses Format überhaupt gibt. Ein Dach ist
 * **ein** Quader und keine vierzig Kacheln; es steht in keinem
 * Navigationsgraphen, und eine Welt ohne ihr Dach ist keine.
 */
export interface WorldMassEntry extends TileRef {
  kind: PlanSolidKind;
  /** Breite und Tiefe in Kacheln. */
  w: number;
  d: number;
  /** Unterkante und Oberkante in Metern über dem Boden der Etage. */
  from: number;
  to: number;
  /** Ob ein Portal daran haftet — fehlt, wenn die Sorte entscheidet. */
  portal?: boolean;
}

/** Eine Welt, so wie sie in der Datei steht. */
export interface WorldFile {
  format: typeof WORLD_FORMAT;
  /** Semver, siehe `WORLD_VERSION`. */
  version: string;
  /** Aus welcher Welt sie stammt — zur Information, nicht zum Zuordnen. */
  world?: string;
  /** Wie sie heißt, für Menschen. */
  name?: string;
  /** Wann sie geschrieben wurde, ISO-8601. */
  saved?: string;
  /**
   * Der Grundriss — **ohne** die Aufschläge der Bausteine.
   *
   * Siehe oben: Wer das Ergebnis speichert und die Möbel danach noch einmal
   * anwendet, zählt jeden Aufschlag zweimal.
   */
  nav: NavFile;
  blocks: WorldBlockEntry[];
  masses: WorldMassEntry[];
}

/** Was schiefgehen kann, wenn eine Datei nicht das ist, wofür sie sich ausgibt. */
export class WorldFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorldFormatError';
  }
}

/** Was beim Schreiben oben in die Datei kommt. */
export interface WorldMeta {
  /** Die Id der Welt (`worlds/index.ts`). */
  world?: string;
  name?: string;
  /** Der Zeitstempel — als Parameter, damit ein Test ihn festnageln kann. */
  saved?: string;
}

// --- schreiben --------------------------------------------------------------

/**
 * **Einen Plan in eine Datei schreiben.**
 *
 * Der Graph kommt dabei aus `plan.bare()` und nicht aus `plan.graph`: Das ist
 * derselbe Grundriss ohne die Aufschläge dessen, was darauf steht.
 */
export function writeWorld(plan: GridPlan, meta: WorldMeta = {}): WorldFile {
  // Die Reihenfolge ist für **Menschen**: Wer die Datei aufmacht, will oben
  // sehen, was sie ist und woher sie kommt, und nicht erst nach dreihundert
  // Kacheln.
  return {
    format: WORLD_FORMAT,
    version: WORLD_VERSION,
    ...(meta.world ? { world: meta.world } : {}),
    ...(meta.name ? { name: meta.name } : {}),
    saved: meta.saved ?? new Date().toISOString(),
    nav: writeNav(plan.bare(), meta.name),
    blocks: plan.blocks().map(blockEntry),
    masses: plan.masses().map(massEntry),
  };
}

/**
 * Eine Länge, wie sie in eine Datei gehört.
 *
 * `2.8 + 0.3` ist in Fließkomma `3.0999999999999996`, und das steht dann so in
 * der Datei. Es rechnet sich damit richtig weiter — aber eine Datei, die man
 * aufmacht und liest, soll nicht aussehen, als hätte jemand gewürfelt. Vier
 * Nachkommastellen sind ein Zehntelmillimeter; darunter gibt es in dieser Welt
 * nichts.
 */
function tidy(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

function blockEntry(one: BlockPlacement): WorldBlockEntry {
  const entry: WorldBlockEntry = {
    kind: one.kind,
    x: keyX(one.tile),
    z: keyZ(one.tile),
    dir: one.dir,
  };
  const level = keyLevel(one.tile);
  if (level !== 0) entry.l = level;
  if (one.height !== undefined) entry.h = tidy(one.height);
  return entry;
}

function massEntry(one: Mass): WorldMassEntry {
  const entry: WorldMassEntry = {
    kind: one.kind,
    x: one.rect.x,
    z: one.rect.z,
    w: one.rect.w,
    d: one.rect.d,
    from: tidy(one.from),
    to: tidy(one.to),
  };
  if (one.rect.level) entry.l = one.rect.level;
  if (one.portal !== undefined) entry.portal = one.portal;
  return entry;
}

// --- lesen ------------------------------------------------------------------

/** Was aus einer Datei herauskommt: der Grundriss und alles, was darauf steht. */
export interface WorldContents {
  file: WorldFile;
  /** Der Grundriss mit den **Grundwerten** — die Aufschläge kommen aus `blocks`. */
  graph: NavGraph;
  blocks: BlockPlacement[];
  masses: Mass[];
}

/**
 * **Eine Weltdatei lesen** — und lieber abbrechen als raten.
 *
 * Jede Zeile hier ist eine Antwort auf die Frage „was, wenn diese Datei etwas
 * anderes ist?". Eine halb geladene Welt ist der schlechteste aller Ausgänge:
 * Sie sieht aus wie eine kaputte Welt, und man sucht den Fehler dort, wo er
 * nicht ist.
 */
export function readWorld(data: unknown): WorldContents {
  if (!data || typeof data !== 'object') {
    throw new WorldFormatError('Das ist keine Weltdatei');
  }
  const raw = data as Partial<WorldFile>;
  if (raw.format !== WORLD_FORMAT) {
    throw new WorldFormatError(
      `Fremdes Format: „${String(raw.format ?? '—')}" statt „${WORLD_FORMAT}"`,
    );
  }
  checkVersion(raw.version);

  let graph: NavGraph;
  try {
    graph = readNav(raw.nav);
  } catch (error) {
    // Der Graph hat seine eigenen, sehr genauen Meldungen (fremde Kachelgröße,
    // Karte aus der Zukunft) — die sind besser als alles, was hier stünde.
    throw new WorldFormatError(
      error instanceof NavFormatError
        ? `Grundriss: ${error.message}`
        : 'Grundriss fehlt oder ist kaputt',
    );
  }

  return {
    file: { ...(raw as WorldFile), nav: raw.nav as NavFile },
    graph,
    blocks: readBlocks(raw.blocks, graph),
    masses: readMasses(raw.masses),
  };
}

/**
 * **Die Version prüfen** — und dabei zwischen „zu alt" und „zu neu"
 * unterscheiden.
 *
 * Beides ist ein Fehler, aber nicht derselbe, und die Meldung ist das Einzige,
 * woran jemand sieht, ob er ein Programm oder eine Datei aktualisieren muss.
 */
function checkVersion(version: unknown): void {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new WorldFormatError(`Keine Versionsnummer in der Datei (gefunden: ${String(version)})`);
  }
  const [major, minor] = version.split('.');
  const line = `${major}.${minor}`;
  if (READABLE.includes(line)) return;
  const newer = compare(version, WORLD_VERSION) > 0;
  throw new WorldFormatError(
    newer
      ? `Diese Welt ist Fassung ${version}, dieses Programm liest bis ${WORLD_VERSION} — aktualisiere das Programm`
      : `Fassung ${version} kann dieses Programm nicht mehr lesen (es liest ${READABLE.join(', ')}.x)`,
  );
}

/** Zwei Versionsnummern vergleichen: `-1`, `0` oder `1`. */
export function compare(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const gap = (left[i] ?? 0) - (right[i] ?? 0);
    if (gap !== 0) return gap < 0 ? -1 : 1;
  }
  return 0;
}

/**
 * Die Bausteine.
 *
 * **Was auf einer Kachel steht, die es nicht gibt, fällt weg** — dieselbe Regel
 * wie in `GridPlan.loadBlocks`, nur früher: Ein Regal ohne Boden darunter
 * schwebt, und niemand versteht, wo es herkommt. Eine unbekannte Sorte fällt
 * ebenfalls weg statt die ganze Datei mitzunehmen: Wer eine Welt aus einer
 * neueren Fassung öffnet, will sein Haus sehen und nicht eine Fehlermeldung
 * über einen Baustein.
 */
function readBlocks(list: unknown, graph: NavGraph): BlockPlacement[] {
  if (list === undefined) return [];
  if (!Array.isArray(list)) throw new WorldFormatError('„blocks" ist keine Liste');
  const out: BlockPlacement[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const one = raw as Partial<WorldBlockEntry>;
    if (typeof one.kind !== 'string' || !(one.kind in BLOCKS)) continue;
    const tile = safeTile(one);
    if (tile === null || !graph.has(tile)) continue;
    const dir = Number(one.dir);
    if (!Number.isInteger(dir) || dir < 0 || dir > 3) continue;
    const placed: BlockPlacement = { kind: one.kind as BlockKind, tile, dir: dir as Dir };
    if (typeof one.h === 'number' && Number.isFinite(one.h)) placed.height = one.h;
    out.push(placed);
  }
  return out;
}

/**
 * Die Massen.
 *
 * Hier wird **nicht** stillschweigend weggelassen: Ein fehlendes Dach ist eine
 * Welt, in die es hineinregnet, und eine fehlende Felswand ist eine, aus der
 * man hinausläuft. Was hier nicht stimmt, ist ein Fehler und keine Kleinigkeit.
 */
function readMasses(list: unknown): Mass[] {
  if (list === undefined) return [];
  if (!Array.isArray(list)) throw new WorldFormatError('„masses" ist keine Liste');
  return list.map((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      throw new WorldFormatError(`Masse ${index} ist kein Eintrag`);
    }
    const one = raw as Partial<WorldMassEntry>;
    if (typeof one.kind !== 'string' || !GRID_KINDS.includes(one.kind as PlanSolidKind)) {
      throw new WorldFormatError(`Masse ${index} hat die unbekannte Sorte „${String(one.kind)}"`);
    }
    const numbers = [one.x, one.z, one.w, one.d, one.from, one.to];
    if (numbers.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
      throw new WorldFormatError(`Masse ${index} hat unvollständige Maße`);
    }
    const mass: Mass = {
      kind: one.kind as PlanSolidKind,
      rect: { x: one.x!, z: one.z!, w: one.w!, d: one.d!, ...(one.l ? { level: one.l } : {}) },
      from: one.from!,
      to: one.to!,
    };
    if (typeof one.portal === 'boolean') mass.portal = one.portal;
    return mass;
  });
}

/**
 * Eine Kachel aus der Datei — oder `null`, wenn sie draußen liegt.
 *
 * `tileKey` wirft für alles außerhalb des Gitters (`navTile.ts`, ±1024
 * Kacheln). Das ist beim Bauen richtig und beim Laden falsch: Eine fremde
 * Datei mit einer Zahl aus der Luft soll einen Baustein kosten und nicht die
 * ganze Welt.
 */
function safeTile(one: Partial<TileRef>): number | null {
  const x = one.x;
  const z = one.z;
  const level = one.l ?? 0;
  if (typeof x !== 'number' || typeof z !== 'number') return null;
  if (!Number.isInteger(x) || !Number.isInteger(z) || !Number.isInteger(level)) return null;
  try {
    return tileKey(x, z, level);
  } catch {
    return null;
  }
}

// --- drumherum --------------------------------------------------------------

/**
 * Wie die Datei heißen soll, die man herunterlädt.
 *
 * Der Name der Welt, das Datum, und `.welt.json` — die doppelte Endung, damit
 * ein Betriebssystem sie als JSON öffnet und ein Mensch trotzdem sieht, was
 * darin steht.
 */
export function worldFileName(meta: WorldMeta = {}): string {
  const stem = (meta.name ?? meta.world ?? 'welt')
    .toLowerCase()
    .replace(/[äöüß]/g, (one) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[one] ?? one)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const day = (meta.saved ?? new Date().toISOString()).slice(0, 10);
  return `${stem || 'welt'}-${day}.welt.json`;
}

/** Die Kachelgröße, mit der geschrieben wird — für Meldungen und Tests. */
export const WORLD_TILE = TILE;
