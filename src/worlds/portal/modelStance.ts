import { WALL_LONG, wallAxis } from './gridSnap';

/**
 * **Wie ein Modell aus dem Regal steht** — der Vorgabewert, ob es Physik hat
 * oder stehen bleibt. Reine Rechnung, ohne three.js und ohne Physik.
 *
 * Bis September 2026 war jedes Modell aus dem Regal ein **Fass**: eine Hülle,
 * eine Masse, und damit kippte es, wie ein Fass eben kippt. Für ein Fass ist
 * das richtig. Für eine Wand, die man im _Baukasten_ gerade in eine Reihe
 * gestellt hat, ist es das nicht: „Wände, die platziert sind, sollen auch
 * stehen bleiben (ohne Umkippen-Physik)" — und dasselbe galt für Tische,
 * Vorratskisten, Herde und die übrigen Küchenmöbel.
 *
 * Drei Haltungen:
 *
 * - **`structure`** — Wände, Böden, Säulen, Türen, Zäune, Treppen: der Bau
 *   selbst. Steht fest und lässt sich **nur im _Baukasten_** umsetzen
 *   (`core/gameMode.movesStructure`); im _Einrichten_ wird eingerichtet und
 *   nicht umgebaut.
 * - **`furniture`** — Tische, Kisten, Schränke, Herde, Regale, Betten: steht
 *   fest und lässt sich wie jedes Möbel im _Einrichten_ und im _Baukasten_
 *   umstellen (`core/gameMode.movesFurniture`).
 * - **`loose`** — alles Übrige: Fässer, Teller, Kürbisse, Essen. Physik wie
 *   bisher, greifbar in jedem Modus.
 *
 * **Fest heißt: kippt nicht und rutscht nicht, fällt aber.** Ein Möbel wird in
 * Handhöhe losgelassen (`gridSnap`: „die Höhe bleibt, wie sie ist"), und ein
 * Körper vom Typ _fest_ bliebe dort in der Luft hängen. Also bleibt es ein
 * Körper mit Schwerkraft, dem Drehung und waagerechte Verschiebung gesperrt
 * sind (`PortalWorld.applyStance`): Es sinkt senkrecht auf das, was darunter
 * liegt, und steht dann — keine Kugel, kein Stoß und kein Spieler schiebt es
 * weg.
 */
export type ModelStance = 'structure' | 'furniture' | 'loose';

/** Wörter im Dateinamen, die den Bau selbst meinen. */
const STRUCTURE_WORDS: ReadonlySet<string> = new Set([
  'wall',
  'walls',
  'floor',
  'ceiling',
  'fence',
  'pillar',
  'column',
  'colum',
  'stairs',
  'doorway',
  'door',
  'window',
  'arch',
  'gate',
  'barrier',
  'scaffold',
  'beam',
  'slope',
  'road',
  'terrain',
  'tunnel',
  'maze',
  // `prototype-bits/Empty.glb` — das leere Bodenstück (siehe `FLOOR_WORDS`).
  'empty',
]);

/** Wörter im Dateinamen, die ein Möbel meinen. */
const FURNITURE_WORDS: ReadonlySet<string> = new Set([
  'table',
  'desk',
  'counter',
  'countertop',
  'cabinet',
  'crate',
  'crates',
  'shelf',
  'shelves',
  'bookcase',
  'fridge',
  'stove',
  'oven',
  'sink',
  'dishrack',
  'extractorhood',
  'machine',
  'bed',
  'couch',
  'armchair',
  'chair',
  'stool',
  'bench',
  'workbench',
  'locker',
  'weaponrack',
  'bar',
  'bartop',
  'chest',
  'pallet',
  'cargo',
  'containers',
  'dumpster',
  'wardrobe',
  'towelrail',
  'coffin',
  'shrine',
]);

/**
 * **Die Wörter eines Dateinamens**, klein geschrieben — getrennt an `_`, `-`
 * und am Übergang von klein zu groß (`innerCorner` → `inner`, `corner`).
 *
 * Wörter und keine Teilzeichenketten: `bar` ist ein Tresen, `barrel` ein Fass
 * und `barrier` eine Absperrung, und eine Suche nach „bar" fände alle drei.
 */
export function nameWords(path: string): string[] {
  const file = path.slice(path.lastIndexOf('/') + 1).replace(/\.[a-z0-9]+$/i, '');
  return file
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 0);
}

/**
 * **Die Haltung eines Modells** — erst nach dem Namen, dann nach der Form.
 *
 * Der Name entscheidet zuerst, weil er die Absicht sagt: `kitchentable_A` ist
 * ein Tisch, gleich wie breit. `kitchen…` zählt als Möbel, weil die Küche des
 * Restaurant-Pakets ihre Zeilen, Schränke und Tische genau so zusammenschreibt
 * (`kitchencounter_sink`, `kitchencabinet_corner`).
 *
 * Danach die **Form**: Was dünn und lang ist wie eine Wand (`gridSnap.wallAxis`)
 * und dazu mindestens so hoch, wie eine Wand lang sein muss, ist Bau — ein
 * Zaun aus Lebkuchen heißt nicht `wall`, steht aber genauso auf der Fuge.
 *
 * @param size die volle Hülle in Metern (Breite, Höhe, Tiefe), falls bekannt
 */
export function modelStance(
  path: string,
  size?: { readonly x: number; readonly y: number; readonly z: number },
): ModelStance {
  const words = nameWords(path);
  if (words.some((word) => STRUCTURE_WORDS.has(word))) return 'structure';
  if (words.some((word) => FURNITURE_WORDS.has(word) || word.startsWith('kitchen'))) {
    return 'furniture';
  }
  if (size && size.y >= WALL_LONG && wallAxis(size.x, size.z) !== null) return 'structure';
  return 'loose';
}

/** Ob ein Modell dieser Haltung fest steht, statt zu kippen. */
export function standsFast(stance: ModelStance): boolean {
  return stance !== 'loose';
}

/** Wörter im Dateinamen, die eine **Fläche** meinen, auf der man geht. */
const FLOOR_WORDS: ReadonlySet<string> = new Set(['floor', 'road', 'empty']);

/**
 * **Ob ein Modell ein Stück Boden ist** — eines, das beim Hinstellen **in**
 * den Boden gelegt wird statt darauf, und die Platte darunter ersetzt
 * (`PortalWorld.sinkFloor`).
 *
 * Gemeldet war: _„wenn ich kitchen floor setze, [soll] der prototype floor
 * damit ersetzt werden … auch werden die floors grade darauf gesetzt statt in
 * die fläche hinein. Auch bei den anderen böden wie spikes …"_ Eine
 * Bodenplatte, die obendrauf liegt, ist eine Stufe, an der jede Wand und
 * jedes Möbel um ihre Dicke höher steht als daneben.
 *
 * Drei Bedingungen, alle drei nötig:
 *
 * - **Bau** (`modelStance` ist `structure`) — ein Tisch bleibt ein Möbel,
 *   gleich wie flach er ist.
 * - **Ein Bodenwort im Namen** (`FLOOR_WORDS`): `floor_kitchen`,
 *   `floor_spikes_trap_2x2x1_red`, `road_straight`.
 * - **Flach**: niedriger, als die schmalere Seite breit ist. Eine Wand heißt
 *   nicht `floor`, aber eine Säule, die zufällig so hieße, bliebe stehen.
 *
 * @param size die volle Hülle in Metern (Breite, Höhe, Tiefe)
 */
export function isFloorPiece(
  path: string,
  size: { readonly x: number; readonly y: number; readonly z: number },
): boolean {
  if (modelStance(path, size) !== 'structure') return false;
  if (!nameWords(path).some((word) => FLOOR_WORDS.has(word))) return false;
  return size.y < Math.min(size.x, size.z);
}
