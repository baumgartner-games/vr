import type { PlanSolid } from '../grid/solids';
import { TILE } from '../nav/navTile';

/**
 * **Wo eine Platte liegt — und welche.**
 *
 * Reine Rechnung, kein three.js: dasselbe Schnittmuster wie in
 * `worlds/grid/gridBatch.ts` („Wie überall in diesem Verzeichnis: reine
 * Rechnung, kein three.js"). Was eine Platte auf der Grafikkarte ist, steht
 * nebenan in `plateFloor.ts`; hier steht nur, **wo** sie liegt. Das ist der
 * einzige Teil des Plattenbodens, den man ohne Brille prüfen kann, und genau
 * deshalb liegt er allein.
 *
 * Zwei Fragen werden hier beantwortet, und beide sind Arithmetik:
 *
 * - **Die Schürze** (`plateSpots`) — ein Quadrat um die Figur, dort, wo gar
 *   nichts gebaut ist. Der Boden geht bis zum Horizont (500 m,
 *   `environment.WORLD_RADIUS`), die Platten können das nicht; also wandern
 *   sie mit, und dahinter bleibt die gekachelte Leinwand stehen — mit
 *   **denselben Farben** wie die Platte darauf (siehe `PLATE_FACE`), damit die
 *   Schürze in die Textur übergeht, statt an ihr abzubrechen.
 * - **Der gebaute Boden** (`floorPlateSpots`) — jede Kachel, auf der ein
 *   Quader aus dem Grundriss liegt, bekommt eine Platte auf seine Oberkante.
 *   Welche das ist, entscheidet die Welt (`worlds/test/floorPlate.ts`); diese
 *   Datei rechnet nur die Kacheln aus und sorgt dafür, dass auf einer Kachel
 *   genau **eine** Platte landet.
 */

/** Ein achsenparalleles Rechteck in Weltmetern: Ecke und Kantenlängen. */
export interface PlateArea {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Eine Platte der Schürze: die Mitte ihrer Oberseite in Metern. */
export interface PlateSpot {
  x: number;
  z: number;
}

/**
 * **Wie groß eine Platte ist** — genau **eine Kachel**.
 *
 * Sie war einmal zwei, mit einer langen Begründung über das Lineal des
 * Geländes; der Befund dazu war kurz: „die sollten nur 1x1 feld groß sein …
 * und bis zum rand der kachel reichen, sodass er direkt mit der nächsten
 * kachel angrenzt." Genau das ist diese Zahl, und sie zieht drei Sachen nach
 * sich, die vorher nicht gingen:
 *
 * - **Jede Plattenfuge ist eine Kachelkante.** Bei zwei Metern war nur jede
 *   zweite eine; wer eine Wand setzen wollte, zählte Felder und traf die
 *   Hälfte.
 * - **Keine Platte liegt mehr halb im Gelände.** Das Geländerechteck ist
 *   77 × 105 **ganze** Kacheln (`worlds/test/layout.FIELD`), und eine Platte
 *   von einer Kachel geht darin restlos auf. Der ganze Fall „sie ragt einen
 *   Meter hinein und wird dort begraben" ist damit weg — er war der Preis der
 *   zwei Meter und nicht ihr Nutzen.
 * - **Und dasselbe Raster trägt beides**: die Schürze draußen und den gebauten
 *   Boden drinnen (`floorPlateSpots`). Eine Kachel des Grundrisses ist eine
 *   Platte, und zwar dieselbe.
 *
 * **Die Zahl steht hier, der Faktor wird gemessen.** `Floor_Prototype.glb` ist
 * in der Quelle 4,000 × 0,500 × 4,000 groß und käme mit dem Maßstab seines
 * Pakets (`core/kaykitFit`, `prototype-bits` = 0,7) auf 2,80 m. Was daraus
 * einen Meter macht, rechnet `plateFloor.ts` **am geladenen Modell**
 * (`THREE.Box3`) aus und nicht aus dieser Zeile: Wer das Modell austauscht,
 * tauscht eine Adresse und keine Rechnung.
 */
export const PLATE_SIZE = TILE;

/**
 * **Wie weit die Schürze um die Figur herum reicht**, in Metern — und was sie
 * kostet.
 *
 * Sie wandert seit dem September 2026 mit der Figur mit (`plateSpots`); die
 * Rechnung unten stammt aus der Zeit, als sie ein fester Ring um das Gelände
 * war, und bleibt stehen, weil sie erklärt, warum die Zahl diese ist. Als
 * Quadrat um die Figur sind es **97 × 97 = 9 409** Platten (`plateCapacity`),
 * und auf dem Gelände selbst weniger — dort liegen seine eigenen.
 *
 * **Achtundvierzig.** Vorher standen hier zweiunddreißig, geborgt von der
 * Kantenlänge des Kastens, in dem diese Maschine scharfe Schatten zeichnet;
 * der Befund dazu lautete „naja die floor teile scheinen ja nicht sehr weit
 * dann zu sein. Bitte wirklich weiter laufen lassen."
 *
 * **Was es kostet, und zwar genau.** Eine Platte sind 20 Dreiecke, ein
 * `InstancedMesh` ist **ein** Zeichenaufruf, und die Zahl der Instanzen wächst
 * im Quadrat der Reichweite. Um das Gelände der Testwelt (77 × 105 Kacheln,
 * `layout.FIELD`) sind das bei einem Meter je Platte:
 *
 * | Schürze  | Instanzen  | Dreiecke    |
 * | -------- | ---------- | ----------- |
 * | 32 m     | 15 744     | 314 880     |
 * | **48 m** | **26 688** | **533 760** |
 * | 64 m     | 39 680     | 793 600     |
 *
 * (Gerechnet: `(77 + 2·s)·(105 + 2·s) − 77·105`.) Dazu kommen die 7 865
 * Platten auf dem gebauten Boden selbst (`floorPlateSpots`,
 * `worlds/test/floorPlate.ts`) — zusammen **34 553 Platten und rund 691 000
 * Dreiecke in zwei Zeichenaufrufen**. In der Brille läuft der Hauptdurchgang
 * je Auge einmal (`docs/agents/grafik.md`, _Zwei Zahlen, die man einmal kennen
 * sollte_); geworfen wird von ihnen kein Schatten (`plateFloor.ts`, Marke
 * **Kulisse**), der Schattendurchgang bleibt also unberührt.
 *
 * **Und warum hier Schluss ist.** Die Fase am Plattenrand ist der einzige
 * Unterschied zwischen einer Platte und der gemalten Textur dahinter: 0,1 von
 * 4 Quelleinheiten, bei einer Platte von einem Meter also **2,5 cm**. Bei rund
 * zwanzig Bildpunkten je Grad, die eine Brille hergibt, ist sie ab etwa 29 m
 * schmaler als ein Bildpunkt — jenseits davon unterscheiden sich Platte und
 * Anstrich nur noch in der **Farbe**, und die ist seit `PLATE_FACE` dieselbe.
 * 48 m sind damit reichlich Abstand auf etwas, das schon bei 30 m niemand mehr
 * auseinanderhält; 64 m wären die Hälfte mehr an allem für sechzehn Meter, in
 * denen nichts mehr passiert.
 */
export const PLATE_SKIRT = 48;

/**
 * **Die Grundfarbe der Platte** — am Atlas ihrer Datei gemessen.
 *
 * Die Schürze hört irgendwo auf, und dahinter steht weiter der texturierte
 * Kasten bis zum Horizont (`environment.createGround`). Damit das kein
 * **Rand** ist, sondern ein Übergang, trägt der Kasten dieselben Farben wie
 * die Platten darauf — hier stehen sie, damit
 * `worlds/test/layout.HORIZON_COLORS` sie nehmen kann.
 *
 * **Herkunft, Bildpunkt für Bildpunkt.** `prototype-bits/Floor_Prototype.glb`
 * zeigt mit einem einzigen Material ohne eigenen Farbton (`baseColorFactor`
 * fehlt, also Weiß) auf `prototype-bits/textures/prototypebits_texture.webp`,
 * 1024 × 1024. Die Deckfläche der Platte liegt dort in den UV-Koordinaten
 * u = 0,034…0,216 und v = 0,784…0,966, also im Bildausschnitt x = 35…221,
 * y = 803…989. Darin sind **90,1 % der Bildpunkte `#3493ce`**; der Rest sind
 * die helleren Linien eines Prototypen-Rasters (das hellste davon `#67aeda`,
 * ein Kreuz durch die Mitte der Platte). Der Mittelwert der ganzen Fläche ist
 * `#3794cf` — die Grundfarbe ist trotzdem der dominante Ton und nicht der
 * Mittelwert: Die Linien zeichnet die Leinwand draußen selbst
 * (`environment.checkerTexture`), und wer den Mittelwert nähme, zeichnete sie
 * zweimal.
 */
export const PLATE_FACE = 0x3493ce;

/**
 * **Die Fuge zwischen zwei Platten** — ebenfalls gemessen, und zwar an der
 * Fase.
 *
 * Was man zwischen zwei aneinanderstoßenden Platten sieht, ist nicht die
 * Deckfläche, sondern die umlaufende **Fase**: 0,1 Quelleinheiten hoch und
 * 0,1 nach innen, in 45° rings um jede Platte. Sie hat im Atlas ihren eigenen
 * Streifen — alle ihre Eckpunkte zeigen auf v = 0,75898, also Bildzeile 777,
 * und die ist auf ganzer Breite **`#43acdf`**, ein helleres Blau. Genau dieser
 * helle Saum ist gemeint, wenn im Befund steht: „das dunklere brauche ich
 * nicht, da die alle einen weißen rand haben, das reicht."
 *
 * Draußen wird er zur **Linie** der Leinwand (`createGround`, `options.line`).
 * Sie liegt dort mit 22 % Deckkraft über der Grundfarbe und ist damit blasser
 * als die echte Fase — das ist der Punkt, an dem die Nachahmung endet, und sie
 * endet an einer Stelle, an der ohnehin kein Bildpunkt mehr für 2,5 cm übrig
 * ist (siehe `PLATE_SKIRT`).
 */
export const PLATE_SEAM = 0x43acdf;

/**
 * **Die Platten der Schürze** — ein Quadrat um die Figur, ohne das Gelände.
 *
 * Hier stand bis zum September 2026 ein fester **Ring** um das Gelände, 48 m
 * weit. Gemeldet wurde dazu: „die prototype floor tiles sind nicht überall zu
 * sehen" — und am Rand des Rings war das auch so: Wer weiter hinauslief, stand
 * auf einmal auf der gemalten Leinwand, und die Grenze lief als gerade Linie
 * quer durchs Bild. Ein Ring, der weit genug reicht, dass ihn niemand je
 * erreicht, reicht bis zum Horizont; das sind fünfhundert Meter und
 * Millionen Platten.
 *
 * Also **wandert die Schürze mit** (`worlds/test/TestWorld.followPlates`):
 * ein Quadrat von `reach` Metern nach jeder Seite um die Kachel, auf der die
 * Figur steht. Dort, wo man ist, liegen damit immer Platten, und ihr Rand ist
 * immer so weit weg, wie er es beim Ring im besten Fall war. Und es ist
 * **billiger**: 97 × 97 = 9 409 Platten statt 26 688 (siehe `PLATE_SKIRT`).
 *
 * Das Raster ist das der Welt (`TILE`) und nicht das des Rechtecks: Beide
 * decken sich, solange das Gelände aus ganzen Kacheln besteht — und das tut
 * es (`layout.FIELD`, 77 × 105).
 *
 * **Ausgelassen wird, was ganz im Gelände liegt** — dort legt die Gitterwelt
 * ihre eigenen Platten, eine je Bodenkachel (`floorPlateSpots`), und eine
 * zweite Lage darunter wäre bezahlt und nie zu sehen.
 *
 * Herausgereicht wird die **Mitte** jeder Platte, weil das die Stelle ist, an
 * der sie gesetzt wird; wer die Kanten braucht, rechnet `PLATE_SIZE / 2` dazu.
 */
export function plateSpots(
  hole: PlateArea,
  around: PlateSpot,
  size: number = PLATE_SIZE,
  reach: number = PLATE_SKIRT,
): PlateSpot[] {
  if (![around.x, around.z, size, reach].every((value) => Number.isFinite(value)) || size <= 0) {
    return [];
  }
  const pad = Math.ceil(reach / size);
  const col0 = Math.floor(around.x / size);
  const row0 = Math.floor(around.z / size);
  const out: PlateSpot[] = [];
  for (let col = col0 - pad; col <= col0 + pad; col++) {
    const x = col * size;
    // Ganz im Rechteck ist eine Spalte nur, wenn **beide** Kanten drin liegen.
    const insideX = x >= hole.x && x + size <= hole.x + hole.w;
    for (let row = row0 - pad; row <= row0 + pad; row++) {
      const z = row * size;
      const insideZ = z >= hole.z && z + size <= hole.z + hole.d;
      if (insideX && insideZ) continue;
      out.push({ x: x + size / 2, z: z + size / 2 });
    }
  }
  return out;
}

/**
 * **Wie viele Platten die Schürze höchstens hat** — so groß wird das Bündel
 * angelegt, einmal und nicht bei jedem Nachziehen neu.
 */
export function plateCapacity(size: number = PLATE_SIZE, reach: number = PLATE_SKIRT): number {
  const side = 2 * Math.ceil(reach / size) + 1;
  return side * side;
}

/**
 * **Wie viele Kacheln die Figur gehen darf, bevor die Schürze nachzieht.**
 *
 * Nicht jede: Nachziehen heißt, neuntausend Matrizen neu zu schreiben, und
 * wer an einer Fuge hin- und hertritt, täte das sonst in jedem zweiten Bild.
 * Vier Kacheln sind bei 48 m Reichweite nichts, was man sieht — der Rand
 * liegt dann zwischen 44 und 52 m weit weg statt bei genau 48.
 */
export const PLATE_STEP = 4;

/**
 * **Ob die Schürze nachziehen muss** — und wenn ja, um welche Kachel sie
 * danach liegt. `null` heißt: Sie bleibt, wo sie ist.
 */
export function plateAnchor(
  anchor: PlateSpot | null,
  x: number,
  z: number,
  size: number = PLATE_SIZE,
  step: number = PLATE_STEP,
): PlateSpot | null {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const here = { x: (Math.floor(x / size) + 0.5) * size, z: (Math.floor(z / size) + 0.5) * size };
  if (!anchor) return here;
  const far = Math.max(Math.abs(here.x - anchor.x), Math.abs(here.z - anchor.z));
  return far >= step * size ? here : null;
}

// --- der gebaute Boden ------------------------------------------------------

/**
 * **Eine Kachel, so wie die Entscheidung sie sieht** — Spalte, Zeile, Etage.
 *
 * Kachelindizes und nicht Meter: Die Welt, die entscheidet, kennt ihre Zonen
 * als Kachelrechtecke (`worlds/test/layout.ts`), und ein Vergleich in Metern
 * wäre derselbe Vergleich mit einer Multiplikation davor, die man einmal
 * vergisst.
 */
export interface PlateTile {
  col: number;
  row: number;
  level: number;
}

/**
 * **Eine Platte auf dem gebauten Boden**: wo sie liegt, auf welcher Etage und
 * welche Datei sie ist. `y` ist die **Oberkante** — genau dort, wo auch der
 * Quader aufhört.
 *
 * Die Etage steht neben der Höhe und ist nicht aus ihr abzulesen: Eine
 * Treppenstufe kann so hoch liegen wie ein Podest und gehört trotzdem nach
 * unten. Sie entscheidet, in welches Bündel die Platte kommt — und damit, ob
 * sie von oben mit ihrem Stockwerk verschwindet (`core/cutaway.ts`).
 */
export interface PlateFloorSpot {
  x: number;
  y: number;
  z: number;
  level: number;
  model: string;
}

/**
 * **Welche Datei auf welche Kachel gehört** — `null` heißt: keine Platte.
 *
 * Die Entscheidung gehört der Welt und nicht dieser Datei: Was die Küche ist,
 * weiß die Testwelt (`worlds/test/floorPlate.ts`), und eine Gitterwelt ohne
 * Küche soll davon nichts wissen müssen.
 */
export type PlateChoice = (tile: PlateTile) => string | null;

/**
 * **Die Platten über einem gebauten Boden** — eine je Kachel, auf der
 * Oberkante, ohne Dubletten.
 *
 * Die Vorlage sind die Bodenquader des Grundrisses (`GridPlan.solids()` mit
 * `kind: 'floor'`), und die kommen in zwei Größen: als **Masse** über das
 * ganze Gelände (in der Testwelt ein Quader von 77 × 105 Kacheln) und als
 * einzelne **Kachel** überall dort, wo wirklich gelaufen wird. Beide liegen
 * übereinander — die Masse mit ihrer Oberkante auf −0,02 m, die Kacheln auf
 * 0 —, und ohne die Zusammenfassung hier bekäme jede begangene Kachel **zwei**
 * Platten im Abstand von zwei Zentimetern: eine, die man sieht, und eine, die
 * man bezahlt.
 *
 * Also wird je Kachel **und Etage** die höchste Oberkante genommen. Die Etage
 * gehört dazu, weil unter dem Podest durchgelaufen wird: Sein Deck (Ebene 1)
 * und das Gelände darunter (Ebene 0) sind dieselbe Kachel und zwei Böden.
 *
 * **Die Quader stehen auf dem Kachelraster**, und darauf verlässt sich diese
 * Rechnung: Ihre Kantenlängen sind Vielfache von `size`, und ihre Mitte liegt
 * auf einer halben Kachel. Das ist keine Annahme über fremde Daten, sondern
 * die Bauart des Grundrisses (`editor/levelBuild.planSolids`, `GridPlan.mass`).
 */
export function floorPlateSpots(
  solids: readonly PlanSolid[],
  choose: PlateChoice,
  size: number = PLATE_SIZE,
): PlateFloorSpot[] {
  const best = new Map<string, PlateFloorSpot>();
  for (const solid of solids) {
    if (solid.kind !== 'floor') continue;
    const level = solid.level ?? 0;
    const top = solid.y + solid.h / 2;
    const west = solid.x - solid.w / 2;
    const north = solid.z - solid.d / 2;
    for (let c = 0; c < Math.max(1, Math.round(solid.w / size)); c++) {
      const x = west + (c + 0.5) * size;
      const col = Math.round((x - size / 2) / size);
      for (let r = 0; r < Math.max(1, Math.round(solid.d / size)); r++) {
        const z = north + (r + 0.5) * size;
        const row = Math.round((z - size / 2) / size);
        const model = choose({ col, row, level });
        if (model === null) continue;
        const key = `${col}/${row}/${level}`;
        // Die höhere gewinnt: Die Kachel liegt auf der Masse und nicht in ihr.
        const known = best.get(key);
        if (known && known.y >= top) continue;
        best.set(key, { x, y: top, z, level, model });
      }
    }
  }
  return [...best.values()];
}

/**
 * **Welche Dateien ein Quader abwartet** — die Frage, an der hängt, ob er
 * unsichtbar wird.
 *
 * Getrennt von `floorPlateSpots`, weil sie eine andere Antwort braucht: Dort
 * geht es um **Kacheln**, hier um einen **Quader**, und der kann über beides
 * laufen. Die Masse des Geländes trägt Platten auf 7 865 Kacheln und auf den
 * 220 Kacheln der Küche keine — sie verschwindet trotzdem ganz, denn unter der
 * Küche liegt sie unter deren eigenem Steinboden
 * (`zones/kitchenPlan.stampKitchen`, eine Masse mit Oberkante 0,02 m) und ist
 * dort gar nicht zu sehen.
 *
 * Herausgereicht wird die Liste der **Dateien** und nicht ein `boolean`:
 * Unsichtbar werden darf ein Quader erst, wenn jede davon wirklich angekommen
 * ist — sonst steht dort, wo eine Platte hinsollte, für einen Moment (und in
 * einem Checkout ohne die gekauften Pakete für immer) gar nichts. Eine leere
 * Liste heißt: Dieser Quader bleibt, wie er ist.
 */
export function floorPlateModels(
  solid: PlanSolid,
  choose: PlateChoice,
  size: number = PLATE_SIZE,
): string[] {
  if (solid.kind !== 'floor') return [];
  const out = new Set<string>();
  const level = solid.level ?? 0;
  const west = solid.x - solid.w / 2;
  const north = solid.z - solid.d / 2;
  for (let c = 0; c < Math.max(1, Math.round(solid.w / size)); c++) {
    const col = Math.round((west + (c + 0.5) * size - size / 2) / size);
    for (let r = 0; r < Math.max(1, Math.round(solid.d / size)); r++) {
      const row = Math.round((north + (r + 0.5) * size - size / 2) / size);
      const model = choose({ col, row, level });
      if (model !== null) out.add(model);
    }
  }
  // Sortiert, damit aus derselben Menge immer derselbe Schlüssel wird — er
  // geht als Teil des Bündelschlüssels weiter (`grid/gridBatch.batchKey`).
  return [...out].sort();
}
