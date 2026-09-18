/**
 * **Macht aus 225 Einzeldateien einen zweiten Möbelkatalog** — einmal von Hand
 * laufen lassen, das Ergebnis liegt in `public/models/diner.glb` und in
 * `src/core/dinerFit.ts`.
 *
 *     node tools/diner-model.mjs --in=<entpackter gltf-Ordner>
 *     node tools/diner-model.mjs --in=… --list    # nur den Katalog zeigen
 *     node tools/diner-model.mjs --in=… --list --fit=src/core/dinerFit.ts
 *
 * Nach `--fit` läuft `npm run format`: Der Schreiber setzt eine Zeile je Stück,
 * und Prettier bricht die um, die zu lang geworden sind. Ein Formatierer, der
 * hier nachgebaut würde, wäre die zweite Fassung einer Regel, die schon eine
 * hat.
 *
 * Die Quelle ist „Restaurant Bits" von Kenney (CC0, siehe
 * `public/models/CREDITS.md`). Sie ist das **Gegenteil** der Quelle der ersten
 * Küche (`tools/kitchen-model.mjs`): kein aufgebautes Bild in vier Netzen,
 * sondern 225 Dateien mit je einem Möbel darin, alle auf demselben Raster
 * gebaut und alle auf **einer einzigen Textur** — einem Farbstreifen-Atlas von
 * 1024 px, den sich jedes Stück teilt. Zerlegen muss hier also niemand etwas;
 * die Arbeit ist das **Zusammenlegen**.
 *
 * Vier Dinge passieren:
 *
 * 1. **Bündeln.** Aus 225 Dateien (5,8 MB, davon 450 Dateihüllen) wird eine
 *    `.glb` mit einem Knoten je Möbel. Ein Material, eine Textur, ein Puffer —
 *    das ist der eigentliche Gewinn dieser Quelle: Wer 156 Stücke aus **einem**
 *    Material zeichnet, kann sie später zu einem Netz verschmelzen
 *    (`worlds/test/zones/diner.ts` tut das reihenweise).
 * 2. **Aussieben.** Von den 225 Stücken kommen 156 in die Datei. Draußen
 *    bleiben 69 Stück: das meiste Essen und das Eis-Zubehör. **Zehn Zutaten
 *    kommen mit**, und die sind der Grund, warum das Sieb heute aus zwei
 *    Zeilen besteht statt aus einer (`SKIP`, `KEEP_FOOD`) — die Küche baute
 *    ihre Zutaten lange selbst, und seit sie es nicht mehr tut, sind Brötchen,
 *    Patty, Salat und Tomate Netze aus dieser Datei
 *    (`worlds/test/zones/kitchenProps.ts`, `FOOD_NODE`).
 * 3. **Nachmessen.** Zu jedem Stück werden Hülle und Grundfläche gerechnet,
 *    in **Spielmaß** (`DINER_SCALE`, siehe `core/dinerFit.ts`). Daraus wird der
 *    Katalog geschrieben, den Jest liest.
 * 4. **Kleinrechnen.** Die Geometrie wird quantisiert und mit
 *    `EXT_meshopt_compression` gepackt: Aus 3,1 MB roher `.glb` wird gut 1 MB.
 *    Die Textur bleibt dagegen, wie sie ist — siehe unten, warum.
 *
 * **Der Ursprung bleibt, wo der Zeichner ihn hingelegt hat**, und das ist der
 * Unterschied zur ersten Küche. Dort zentriert das Werkzeug jedes Möbel in
 * seiner Hülle, und weil eine Hülle nicht der Korpus ist, brauchte danach
 * jedes fünfte Möbel einen nachgemessenen Versatz (`KitchenPiece.align`).
 * Diese Quelle ist auf einem Raster gebaut: Ein Hängeschrank fängt bei
 * y = 2 an, eine Wand steht am Rand ihrer Zelle, eine Tür im Türsturz. Wer
 * das geradezieht, wirft genau die Information weg, die er hinterher von Hand
 * wieder nachmessen müsste. Also bleibt jeder Ursprung stehen, und der Katalog
 * sagt mit `foot`, `height`, `at` und `span`, wo das Möbel um ihn herum liegt.
 *
 * **Der Maßstab sitzt nicht hier, sondern am Lader** (`core/dinerModel.ts`) —
 * dieselbe Regel und derselbe Grund wie bei der ersten Küche: Die Quelle ist
 * fremde Arbeit und wird nicht angefasst. Die Zahlen im Katalog sind trotzdem
 * die **fertigen**: Was dort steht, ist, wie groß ein Möbel im Spiel ist.
 *
 * Das Werkzeug läuft von Hand und nicht bei jedem Build; `@gltf-transform`,
 * `sharp` und `meshoptimizer` gehören nicht in die Abhängigkeiten eines
 * Spiels, das sie nie ausführt:
 *
 *     npm install --no-save @gltf-transform/core @gltf-transform/functions \
 *       @gltf-transform/extensions sharp meshoptimizer
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  flatten,
  join,
  meshopt,
  prune,
  quantize,
  reorder,
  weld,
} from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const args = new Map(
  process.argv.slice(2).map((value) => {
    const at = value.indexOf('=');
    return at < 0 ? [value.replace(/^--/, ''), ''] : [value.slice(2, at), value.slice(at + 1)];
  }),
);

const source = args.get('in');
if (!source || !existsSync(source)) {
  console.error('Bitte --in=<Ordner mit den .gltf-Dateien> angeben.');
  process.exit(1);
}

const out = path.resolve(args.get('out') || 'public/models/diner.glb');
const fit = args.get('fit');

/**
 * **Derselbe Faktor wie bei der ersten Küche**, und aus demselben Grund
 * nachgemessen: Eine Küchenzeile ist in der Quelle 2 × 2,04 m groß und 1 m
 * hoch, eine Wand 4 m breit und 4 m hoch. Halbiert belegt die Zeile **eine**
 * Kachel (`worlds/nav/navTile.TILE` = 1 m) und ist einen halben Meter hoch —
 * genau das Maß der ersten Küche, und damit passt der Koch von 1,60 m
 * (`core/chefFit.ts`) auch an diese Möbel. Steht hier nur zum **Rechnen** des
 * Katalogs; angewendet wird er am Lader.
 */
const SCALE = 0.5;

/**
 * **Was nicht mitkommt.** Die `food_*`-Stücke und die 23 Eis-Beilagen sind
 * Essen, und das meiste davon kocht in dieser Küche niemand — 39 000 Dreiecke
 * und anderthalb Megabyte für Pizzen, Eisbecher und Eintöpfe, die kein Rezept
 * kennt (`worlds/test/zones/kitchenRecipes.RECIPES`). Die Softeismaschine ist
 * ein Möbel und bleibt drin.
 */
const SKIP = /^(food_|icecream_(?!machine)|stew_)/;

/**
 * **Und was vom Essen trotzdem mitkommt.** Zehn Stücke, und sie sind keine
 * Ausnahme vom Sieb, sondern seine Begründung: Die Küche baute Brötchen,
 * Patty, Salat und Tomate aus Zylindern und Kugeln, und seit es diese Quelle
 * gibt, tut sie es nicht mehr. Was hier steht, ist **genau**, was ein Rezept
 * braucht — die drei Zustände des Pattys, der Salat ganz und geschnitten, die
 * Tomate ganz und geschnitten, und das Brötchen dreimal: ganz, Unterteil,
 * Deckel (im Burger liegt der Belag dazwischen).
 *
 * **Eine Scheibe und nicht drei**: Der Baukasten hat für die geschnittene
 * Tomate zwei Stücke, `_slice` (eine Scheibe, 220 Dreiecke) und `_slices` (ein
 * Stapel aus dreien, 476). Auf einem Burger liegt eine, und drei übereinander
 * machten aus jeder Tomate einen Turm.
 *
 * Zusammen 2 722 Dreiecke. Die 46 Stücke, die draußen bleiben — Möhren, Käse,
 * Teig, Schinken, Pilze, Zwiebeln, Salami, Kartoffeln, Pizzen —, sind Zutaten
 * für Rezepte, die es nicht gibt; wer eines davon schreibt, trägt das Stück
 * hier nach und hat es im Katalog.
 */
const KEEP_FOOD = new Set([
  'food_ingredient_bun',
  'food_ingredient_bun_bottom',
  'food_ingredient_bun_top',
  'food_ingredient_burger_uncooked',
  'food_ingredient_burger_cooked',
  'food_ingredient_burger_trash',
  'food_ingredient_lettuce',
  'food_ingredient_lettuce_slice',
  'food_ingredient_tomato',
  'food_ingredient_tomato_slice',
]);

/**
 * **Wie die Stücke im Spiel heißen.** Die Quelle spricht englisch und in
 * Dateinamen; im Schauraum steht eine Tafel, und darauf gehört ein Wort, das
 * jemand liest, der zum ersten Mal davorsteht. Ein Name, der hier fehlt, wird
 * beim Lauf gemeldet und kommt roh in den Katalog — dann ist die Tabelle
 * unvollständig und nicht das Möbel verloren.
 */
const LABELS = {
  bowl: 'Schüssel',
  bowl_dirty: 'Schüssel, benutzt',
  bowl_small: 'Schüssel, klein',
  chair_A: 'Stuhl A',
  chair_B: 'Stuhl B',
  chair_stool: 'Hocker',
  crate: 'Kiste',
  crate_buns: 'Kiste Brötchen',
  crate_carrots: 'Kiste Möhren',
  crate_cheese: 'Kiste Käse',
  crate_dough: 'Kiste Teig',
  crate_ham: 'Kiste Schinken',
  crate_lettuce: 'Kiste Salat',
  crate_lid: 'Kistendeckel',
  crate_mushrooms: 'Kiste Pilze',
  crate_onions: 'Kiste Zwiebeln',
  crate_pepperoni: 'Kiste Salami',
  crate_potatoes: 'Kiste Kartoffeln',
  crate_steak: 'Kiste Steaks',
  crate_tomatoes: 'Kiste Tomaten',
  cuttingboard: 'Schneidebrett',
  dishrack: 'Abtropfgitter',
  dishrack_plates: 'Abtropfgitter mit Tellern',
  door_A: 'Tür A',
  door_B: 'Tür B',
  extractorhood: 'Dunstabzugshaube',
  floor_kitchen: 'Bodenplatte, groß',
  food_ingredient_bun: 'Brötchen',
  food_ingredient_bun_bottom: 'Brötchen, Unterteil',
  food_ingredient_bun_top: 'Brötchen, Deckel',
  food_ingredient_burger_cooked: 'Patty, gebraten',
  food_ingredient_burger_trash: 'Patty, verbrannt',
  food_ingredient_burger_uncooked: 'Patty, roh',
  food_ingredient_lettuce: 'Salatkopf',
  food_ingredient_lettuce_slice: 'Salat, geschnitten',
  food_ingredient_tomato: 'Tomate',
  food_ingredient_tomato_slice: 'Tomatenscheibe',
  floor_kitchen_small: 'Bodenplatte',
  floor_kitchen_small_styleB: 'Bodenplatte, Muster B',
  floor_kitchen_styleB: 'Bodenplatte groß, Muster B',
  fridge_A: 'Kühlschrank A',
  fridge_A_decorated: 'Kühlschrank A, behängt',
  fridge_B: 'Kühlschrank B',
  icecream_machine: 'Softeismaschine',
  jar_A_large: 'Vorratsglas A, groß',
  jar_A_medium: 'Vorratsglas A, mittel',
  jar_A_small: 'Vorratsglas A, klein',
  jar_B_large: 'Vorratsglas B, groß',
  jar_B_medium: 'Vorratsglas B, mittel',
  jar_B_small: 'Vorratsglas B, klein',
  jar_C_large: 'Vorratsglas C, groß',
  jar_C_medium: 'Vorratsglas C, mittel',
  jar_C_small: 'Vorratsglas C, klein',
  jar_D_large: 'Vorratsglas D, groß',
  jar_D_medium: 'Vorratsglas D, mittel',
  jar_D_small: 'Vorratsglas D, klein',
  ketchup: 'Ketchupflasche',
  kitchencabinet: 'Hängeschrank',
  kitchencabinet_corner: 'Hängeschrank, Ecke',
  kitchencabinet_corner_half: 'Hängeschrank Ecke, halbhoch',
  kitchencabinet_corner_half_styleB: 'Hängeschrank Ecke halbhoch, Muster B',
  kitchencabinet_corner_styleB: 'Hängeschrank Ecke, Muster B',
  kitchencabinet_half: 'Hängeschrank, halbhoch',
  kitchencabinet_half_styleB: 'Hängeschrank halbhoch, Muster B',
  kitchencabinet_styleB: 'Hängeschrank, Muster B',
  kitchencounter_innercorner: 'Küchenzeile, Innenecke',
  kitchencounter_innercorner_backsplash: 'Küchenzeile Innenecke, mit Rückwand',
  kitchencounter_innercorner_backsplash_styleB: 'Küchenzeile Innenecke mit Rückwand, Muster B',
  kitchencounter_innercorner_styleB: 'Küchenzeile Innenecke, Muster B',
  kitchencounter_outercorner: 'Küchenzeile, Außenecke',
  kitchencounter_outercorner_backsplash: 'Küchenzeile Außenecke, mit Rückwand',
  kitchencounter_outercorner_backsplash_styleB: 'Küchenzeile Außenecke mit Rückwand, Muster B',
  kitchencounter_outercorner_styleB: 'Küchenzeile Außenecke, Muster B',
  kitchencounter_sink: 'Küchenzeile mit Spüle',
  kitchencounter_sink_backsplash: 'Küchenzeile mit Spüle, mit Rückwand',
  kitchencounter_sink_backsplash_styleB: 'Küchenzeile mit Spüle und Rückwand, Muster B',
  kitchencounter_sink_styleB: 'Küchenzeile mit Spüle, Muster B',
  kitchencounter_straight_A: 'Küchenzeile A',
  kitchencounter_straight_A_backsplash: 'Küchenzeile A, mit Rückwand',
  kitchencounter_straight_A_backsplash_styleB: 'Küchenzeile A mit Rückwand, Muster B',
  kitchencounter_straight_A_decorated: 'Küchenzeile A, bestückt',
  kitchencounter_straight_A_decorated_styleB: 'Küchenzeile A bestückt, Muster B',
  kitchencounter_straight_A_styleB: 'Küchenzeile A, Muster B',
  kitchencounter_straight_B: 'Küchenzeile B',
  kitchencounter_straight_B_backsplash: 'Küchenzeile B, mit Rückwand',
  kitchencounter_straight_B_backsplash_styleB: 'Küchenzeile B mit Rückwand, Muster B',
  kitchencounter_straight_B_styleB: 'Küchenzeile B, Muster B',
  kitchencounter_straight_decorated: 'Küchenzeile, bestückt',
  kitchencounter_straight_decorated_styleB: 'Küchenzeile bestückt, Muster B',
  kitchentable_A: 'Arbeitstisch A',
  kitchentable_A_large: 'Arbeitstisch A, lang',
  kitchentable_A_large_decorated_A: 'Arbeitstisch A lang, bestückt A',
  kitchentable_A_large_decorated_B: 'Arbeitstisch A lang, bestückt B',
  kitchentable_A_large_decorated_C: 'Arbeitstisch A lang, bestückt C',
  kitchentable_B: 'Arbeitstisch B',
  kitchentable_B_decorated: 'Arbeitstisch B, bestückt',
  kitchentable_B_large: 'Arbeitstisch B, lang',
  kitchentable_sink: 'Spültisch',
  kitchentable_sink_large: 'Spültisch, lang',
  kitchentable_sink_large_decorated: 'Spültisch lang, bestückt',
  knife: 'Messer',
  lid_A: 'Deckel A',
  lid_B: 'Deckel B',
  lid_large: 'Deckel, groß',
  menu: 'Speisekarte',
  mustard: 'Senfflasche',
  oven: 'Backofen',
  pan_006: 'Pfanne, flach',
  pan_A: 'Pfanne A',
  pan_B: 'Pfanne B',
  papertowel: 'Küchenrolle',
  pillar_A: 'Säule A',
  pillar_B: 'Säule B',
  pizza_oven: 'Pizzaofen',
  pizzabox_closed: 'Pizzakarton, zu',
  pizzabox_open: 'Pizzakarton, offen',
  pizzabox_stacked: 'Pizzakartons, gestapelt',
  plate: 'Teller',
  plate_dirty: 'Teller, benutzt',
  plate_small: 'Teller, klein',
  pot_A: 'Topf A',
  pot_A_stew: 'Topf A mit Eintopf',
  pot_B: 'Topf B',
  pot_B_stew: 'Topf B mit Eintopf',
  pot_large: 'Topf, groß',
  rollingpin: 'Nudelholz',
  shelf_papertowel: 'Rollenhalter',
  shelf_papertowel_decorated: 'Rollenhalter, bestückt',
  spoon: 'Kelle',
  stove_multi: 'Herd, vierflammig',
  stove_multi_countertop: 'Kochfeld, vierflammig',
  stove_multi_decorated: 'Herd vierflammig, bestückt',
  stove_single: 'Herd, einflammig',
  stove_single_countertop: 'Kochfeld, einflammig',
  table_round_A: 'Gasttisch A',
  table_round_A_decorated: 'Gasttisch A, gedeckt',
  table_round_A_small: 'Gasttisch A, klein',
  table_round_A_small_decorated: 'Gasttisch A klein, gedeckt',
  table_round_B: 'Gasttisch B',
  table_round_B_tablecloth_green: 'Gasttisch B, grüne Decke',
  table_round_B_tablecloth_red: 'Gasttisch B, rote Decke',
  table_round_B_tablecloth_red_decorated: 'Gasttisch B rote Decke, gedeckt',
  towelrail: 'Handtuchhalter',
  wall: 'Wand',
  wall_decorated: 'Wand, behängt',
  wall_decorated_styleB: 'Wand behängt, Muster B',
  wall_doorway: 'Wand mit Durchgang',
  wall_half: 'Wand, halb',
  wall_orderwindow: 'Wand mit Durchreiche',
  wall_orderwindow_decorated: 'Wand mit Durchreiche, behängt',
  wall_tiles_A: 'Wandfliesen A',
  wall_tiles_B: 'Wandfliesen B',
  wall_window_closed: 'Wand mit Fenster, zu',
  wall_window_closed_curtains_green: 'Wand mit Fenster, grüne Gardinen',
  wall_window_closed_curtains_red: 'Wand mit Fenster, rote Gardinen',
  wall_window_open: 'Wand mit Fenster, offen',
};

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const files = (await readdir(source)).filter((f) => f.endsWith('.gltf')).sort();
const taken = files.filter((f) => !SKIP.test(f) || KEEP_FOOD.has(f.slice(0, -5)));
if (!taken.length) {
  console.error(`Keine .gltf-Dateien in ${source}.`);
  process.exit(1);
}

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('diner');
let material = null;
let atlas = null;
const pieces = [];
const missing = [];

for (const file of taken) {
  const name = file.slice(0, -5);
  const src = await io.read(path.join(source, file));

  // **Ein Material für alle.** Alle 225 Dateien nennen dasselbe Material und
  // dieselbe Textur — 225-mal derselbe Farbstreifen-Atlas. Genommen wird der
  // des ersten Stücks; ein zweiter käme nur aus einer anderen Quelle, und dann
  // stimmt die Annahme dieses Werkzeugs nicht mehr.
  const [sourceMaterial] = src.getRoot().listMaterials();
  const [sourceTexture] = src.getRoot().listTextures();
  if (!material) {
    atlas = sourceTexture?.getImage() ?? null;
    material = doc
      .createMaterial('restaurant')
      .setMetallicFactor(sourceMaterial?.getMetallicFactor() ?? 0)
      .setRoughnessFactor(sourceMaterial?.getRoughnessFactor() ?? 0.5);
  }

  // **Erst plattmachen, dann ablegen.** Acht der 225 Stücke haben Unterknoten
  // mit eigener Drehung (Kühlschranktüren, Ofenklappen, der Deckel des
  // Pizzakartons). `flatten` rechnet sie in die Eckpunkte hinein, `join` legt
  // die Teilnetze zu einem zusammen — sie tragen ohnehin dasselbe Material.
  await src.transform(flatten(), join());

  const mesh = doc.createMesh(name);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;

  for (const node of src.getRoot().listNodes()) {
    const from = node.getMesh();
    if (!from) continue;
    for (const primitive of from.listPrimitives()) {
      const copy = doc.createPrimitive().setMaterial(material);
      for (const semantic of primitive.listSemantics()) {
        const attribute = primitive.getAttribute(semantic);
        if (semantic === 'POSITION') {
          for (let i = 0; i < 3; i++) {
            lo[i] = Math.min(lo[i], attribute.getMin([])[i]);
            hi[i] = Math.max(hi[i], attribute.getMax([])[i]);
          }
        }
        copy.setAttribute(
          semantic,
          doc
            .createAccessor()
            .setType(attribute.getType())
            .setArray(attribute.getArray().slice())
            .setBuffer(buffer),
        );
      }
      const indices = primitive.getIndices();
      if (indices) {
        triangles += indices.getCount() / 3;
        copy.setIndices(
          doc
            .createAccessor()
            .setType('SCALAR')
            .setArray(indices.getArray().slice())
            .setBuffer(buffer),
        );
      } else {
        triangles += (primitive.getAttribute('POSITION')?.getCount() ?? 0) / 3;
      }
      mesh.addPrimitive(copy);
    }
  }

  scene.addChild(doc.createNode(name).setMesh(mesh));
  if (!(name in LABELS)) missing.push(name);
  pieces.push({
    name,
    label: LABELS[name] ?? name,
    triangles,
    // Von hier an **Spielmaß**: Der Lader halbiert, und wer den Katalog liest,
    // soll nicht noch einmal rechnen müssen.
    lo: lo.map((v) => v * SCALE),
    hi: hi.map((v) => v * SCALE),
  });
}

// **Die Textur bleibt in voller Größe** — und das ist die Ausnahme von der
// Regel, nach der beim ersten Katalog 2048er PNGs auf 512 geschrumpft wurden
// (`tools/kitchen-model.mjs`).
//
// Dort ist die Textur eine **Zeichnung**: Aus 16 m Höhe sieht niemand den
// Unterschied zwischen 2048 und 512. Hier ist sie eine **Farbtafel** aus
// zweiunddreißig Feldern zu 128 px, und eine UV zielt auf ein Feld und nicht
// auf ein Muster. Jede Verkleinerung rückt die Feldgrenzen näher zusammen, und
// an einer Grenze mischt der Filter zwei Farben zu einer dritten, die es im
// Atlas nicht gibt — auf einer flach ins Bild laufenden Arbeitsplatte wurde
// daraus ein violetter Rand. Verlustfrei als WebP kostet die ganze Tafel
// 20 KB; 12 KB Ersparnis sind das nicht wert.
if (atlas) {
  const small = await sharp(Buffer.from(atlas)).webp({ lossless: true }).toBuffer();
  material.setBaseColorTexture(
    doc.createTexture('restaurant').setImage(new Uint8Array(small)).setMimeType('image/webp'),
  );
}

// **Aufräumen und packen**, dieselben drei wie bei der ersten Küche und drei
// mehr: `reorder` sortiert die Dreiecke so, wie der Packer sie am besten
// zusammendrückt, `quantize` macht aus Gleitkommazahlen ganze, und `meshopt`
// packt daraus `EXT_meshopt_compression` — die Erweiterung, die der Lader
// entpacken muss (`core/dinerModel.ts`). Roh sind es 3,1 MB, gepackt gut 1.
await doc.transform(
  weld(),
  dedup(),
  prune(),
  reorder({ encoder: MeshoptEncoder }),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);

await mkdir(path.dirname(out), { recursive: true });
const bytes = await io.writeBinary(doc);
await writeFile(out, bytes);

const triangles = pieces.reduce((sum, piece) => sum + piece.triangles, 0);
console.log(
  `${path.relative(process.cwd(), out)}: ${pieces.length} Stücke, ` +
    `${triangles.toLocaleString('de-DE')} Dreiecke, ${(bytes.length / 1024).toFixed(0)} KB ` +
    `(${files.length - taken.length} ausgesiebt)`,
);
if (missing.length) {
  console.warn(`\nOhne deutsche Beschriftung (LABELS ergänzen): ${missing.join(', ')}`);
}

/** Zwei Nachkommastellen, aber keine überflüssigen Nullen. */
const round = (value) => Number(value.toFixed(4));

if (args.has('list') || fit) {
  const lines = pieces.map((piece) => {
    const w = piece.hi[0] - piece.lo[0];
    const d = piece.hi[2] - piece.lo[2];
    const fields = [
      `name: '${piece.name}'`,
      `label: '${piece.label.replace(/'/g, "\\'")}'`,
      `tiles: [${Math.max(1, Math.round(w))}, ${Math.max(1, Math.round(d))}]`,
      `height: ${round(piece.hi[1])}`,
    ];
    if (Math.abs(piece.lo[1]) > 0.005) fields.push(`foot: ${round(piece.lo[1])}`);
    const atX = (piece.lo[0] + piece.hi[0]) / 2;
    const atZ = (piece.lo[2] + piece.hi[2]) / 2;
    if (Math.abs(atX) > 0.005 || Math.abs(atZ) > 0.005) {
      fields.push(`at: [${round(atX)}, ${round(atZ)}]`);
    }
    fields.push(`span: [${round(w)}, ${round(d)}]`);
    return `  { ${fields.join(', ')} },`;
  });
  const body = `export const DINER_PIECES: readonly DinerPiece[] = [\n${lines.join('\n')}\n];\n`;
  if (fit) {
    const { readFile } = await import('node:fs/promises');
    const current = await readFile(fit, 'utf8');
    // **Ersetzt wird genau der eine Block**, und wenn er nicht zu finden ist,
    // wird gar nichts geschrieben. Der erste Anlauf rechnete das Ende mit
    // `indexOf(…) + Länge` aus und schrieb bei `-1` ab Zeichen drei weiter —
    // aus einer Datei mit leerer Liste wurde dabei eine Datei, die zweimal
    // anfing. Ein Suchergebnis, das `-1` sein kann, gehört geprüft und nicht
    // weitergerechnet.
    const block = /export const DINER_PIECES: readonly DinerPiece\[\] = \[[\s\S]*?\n?\];\n/;
    if (!block.test(current)) {
      console.error(`In ${fit} steht keine Liste \`DINER_PIECES\` — nichts geschrieben.`);
      process.exit(1);
    }
    await writeFile(fit, current.replace(block, body));
    console.log(`${fit}: ${pieces.length} Einträge geschrieben — jetzt \`npm run format\``);
  } else {
    console.log(`\n${body}`);
  }
}
