/**
 * **Macht aus 59 Einzeldateien den dritten Katalog** — einmal von Hand laufen
 * lassen, das Ergebnis liegt in `public/models/mixedbag.glb` und in
 * `src/core/mixedbagFit.ts`.
 *
 *     node tools/mixedbag-model.mjs --in=<entpackter gltf-Ordner>
 *     node tools/mixedbag-model.mjs --in=… --list    # nur den Katalog zeigen
 *     node tools/mixedbag-model.mjs --in=… --list --fit=src/core/mixedbagFit.ts
 *
 * Nach `--fit` läuft `npm run format`, genau wie beim zweiten Katalog: Der
 * Schreiber setzt eine Zeile je Stück, und Prettier bricht die um, die zu lang
 * geworden sind.
 *
 * Die Quelle ist die „Mixed Bag 1" von Kay Lousberg (CC0, siehe
 * `public/models/CREDITS.md`) — eine Wundertüte und kein Baukasten: Was darin
 * liegt, hat sich ein Publikum gewünscht und nicht ein Grundriss. Der Aufbau
 * ist trotzdem derselbe wie bei _Restaurant Bits_ (`tools/diner-model.mjs`):
 * je eine `.gltf` mit einem Möbel darin, alle auf **einem** Farbstreifen-Atlas
 * von 1024 px. Dieses Werkzeug ist deshalb die kleine Schwester von jenem, und
 * wo es abweicht, liegt es an der Quelle:
 *
 * 1. **Bündeln.** Aus 59 Dateien (2,6 MB, davon 118 Dateihüllen) wird eine
 *    `.glb` mit einem Knoten je Stück.
 * 2. **Kein Sieb.** Der zweite Katalog wirft 69 von 225 Stücken weg, weil sein
 *    Essen Rezepte bräuchte, die es nicht gibt. Hier gibt es nichts
 *    auszusieben: Eine Wundertüte hat kein Thema, an dem man ein Stück messen
 *    könnte, und 59 Stücke sind zusammen halb so viele Dreiecke wie der
 *    zweite Katalog allein.
 * 3. **Nachmessen.** Zu jedem Stück werden Hülle und Grundfläche gerechnet, in
 *    **Spielmaß** (`SCALE`, siehe `core/mixedbagFit.ts`). Daraus wird der
 *    Katalog geschrieben, den Jest liest.
 * 4. **Kleinrechnen.** Quantisieren und `EXT_meshopt_compression`, dieselben
 *    sechs Durchgänge wie dort — der Lader entpackt es
 *    (`core/mixedbagModel.ts`).
 *
 * ## Drei Materialien werden zwei, und eines davon ist eine UV
 *
 * Die Quelle nennt vier Materialien, und nur das erste taugt so, wie es ist:
 *
 * - **`KayKit_Texture_A`** ist der Atlas, auf dem alles liegt. Er wird zum
 *   einen Material dieser Datei.
 * - **`KayKit_Texture_A_Glow`** ist derselbe Atlas mit
 *   `KHR_materials_emissive_strength`, und er sitzt auf 48 Dreiecken: der
 *   Lampe des Grubenhelms. Er fällt mit dem ersten zusammen — eine Lampe, die
 *   nicht leuchtet, ist hier kein Verlust, denn dieses Spiel hat für
 *   Selbstleuchten keinen Weg (`core/materialLook.ts`), und ein zweites
 *   Material für 48 Dreiecke wäre ein Zeichenaufruf mehr je Helm.
 * - **`glass`** ist durchsichtig (Alpha 0,2) und hat gar keine Textur: die
 *   Kuppel des Kaugummiautomaten, die drei Tanks der Slush-Maschinen, die
 *   Wasserflasche B. Das **bleibt** ein zweites Material — eine
 *   Glaskuppel, durch die man die Kaugummis nicht sieht, ist nicht dieselbe
 *   Kuppel.
 * - **`CustomTextureHere`** ist ein **Platzhalter**, und zwar ein
 *   ausgeschriebener: Auf `placeholder_texture.png` steht „PLACEHOLDER IMAGE —
 *   REPLACE THIS WITH YOUR OWN TEXTURE/GRAPHIC". Er liegt auf fünf Stücken und
 *   dort auf 2 bis 52 Dreiecken — dem Bildschirm der beiden Spielautomaten,
 *   dem Belag des Skateboards, dem Umschlag des Comichefts, dem Sofortbild.
 *   Ausgeliefert wäre das ein Fehler, den man lesen kann.
 *
 * **Der Platzhalter bekommt deshalb kein Material, sondern eine UV**
 * (`BLANK_UV`): Seine Eckpunkte zielen auf ein einziges dunkles Feld des
 * Atlas, und damit hängt er am selben Material wie alles andere. Das ist der
 * Unterschied zwischen „fünf Stücke haben ein drittes Material" und „fünf
 * Stücke haben einen dunklen Bildschirm" — und das zweite ist, was man sehen
 * will: ein Automat, der aus ist, ein Brett ohne Aufkleber.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
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

const out = path.resolve(args.get('out') || 'public/models/mixedbag.glb');
const fit = args.get('fit');

/**
 * **Derselbe Faktor wie bei den beiden anderen Katalogen**, und zum dritten
 * Mal nachgemessen: Der Feuerlöscher ist in der Quelle 1,205 hoch, der
 * Hydrant 1,210, die Gitarre 1,883 lang, das Skateboard 1,825. Halbiert sind
 * das 60 cm Löscher, 60 cm Hydrant, 94 cm Gitarre und 91 cm Brett — die Maße,
 * die diese Dinge neben einem Koch von 1,60 m (`core/chefFit.ts`) haben
 * sollen. Ungeteilt stünde ein Feuerlöscher da, der einem Menschen bis zur
 * Brust reicht.
 *
 * Steht hier nur zum **Rechnen** des Katalogs; angewendet wird er am Lader
 * (`core/mixedbagModel.ts`), denn die Quelle ist fremde Arbeit und wird nicht
 * angefasst.
 */
const SCALE = 0.5;

/**
 * **Wohin die Platzhalterflächen zielen** — die Mitte des ersten Feldes des
 * Atlas, und das ist das dunkelste darin.
 *
 * Der Atlas ist ein Raster aus 8 × 4 Feldern zu 128 × 256 px, jedes ein
 * senkrechter Verlauf. Das Feld links oben läuft von Anthrazit nach Schwarz;
 * seine Mitte liegt bei u = 1/16 und v = 1/8. Eine Fläche, die dort hinzielt,
 * ist einfarbig dunkel — und sie teilt sich das Material mit allem anderen.
 */
const BLANK_UV = [1 / 16, 1 / 8];

/** Das Material der Quelle, dessen Eckpunkte auf `BLANK_UV` umgebogen werden. */
const PLACEHOLDER = 'CustomTextureHere';

/** Das durchsichtige Material der Quelle — das einzige, das ein zweites bleibt. */
const GLASS = 'glass';

/**
 * **Wie die Stücke im Spiel heißen.** Die Quelle spricht englisch und in
 * Dateinamen; auf eine Tafel gehört ein Wort, das jemand liest, der zum ersten
 * Mal davorsteht. Ein Name, der hier fehlt, wird beim Lauf gemeldet und kommt
 * roh in den Katalog — dann ist die Tabelle unvollständig und nicht das Stück
 * verloren.
 */
const LABELS = {
  arcademachine_A: 'Spielautomat A',
  arcademachine_B: 'Spielautomat B',
  bicycle: 'Fahrrad',
  chain_anchor: 'Kettenanker',
  chain_hanging_A: 'Hängekette A',
  chain_hanging_B: 'Hängekette B',
  chain_shackle: 'Schäkel',
  chainlink: 'Kettenglied',
  chainlinks: 'Kettenglieder',
  chicken_plushie_A: 'Plüschhuhn A',
  chicken_plushie_B: 'Plüschhuhn B',
  circus_tent: 'Zirkuszelt',
  comicbook_A: 'Comicheft A',
  comicbooks_stacked: 'Comichefte, gestapelt',
  comicbox_closed: 'Comickiste, zu',
  comicbox_filled: 'Comickiste, gefüllt',
  comicbox_open: 'Comickiste, offen',
  comicbox_open_B: 'Comicheft, Umschlag',
  cup: 'Becher',
  cups_stacked: 'Becher, gestapelt',
  fire_extinguisher: 'Feuerlöscher',
  fire_hydrant: 'Hydrant',
  flax_flower_A: 'Leinblume A',
  flax_flower_B: 'Leinblume B',
  guitar_A: 'Gitarre A',
  guitar_B: 'Gitarre B',
  gumball_machine: 'Kaugummiautomat',
  idol_A: 'Götzenfigur A',
  idol_B: 'Götzenfigur B',
  instantcamera: 'Sofortbildkamera',
  instantcamera_green: 'Sofortbildkamera, grün',
  instantcamera_picture_A: 'Sofortbild A',
  instantcamera_picture_B: 'Sofortbild B',
  mining_helmet: 'Grubenhelm',
  puzzlecube_center: 'Zauberwürfel, zerlegt',
  puzzlecube_complete: 'Zauberwürfel, gelöst',
  puzzlecube_incomplete: 'Zauberwürfel, ungelöst',
  rollerskate_A: 'Rollschuh A',
  rollerskate_B: 'Rollschuh B',
  rollerskate_pair: 'Rollschuhpaar',
  sandcastle: 'Sandburg',
  skateboard_A: 'Skateboard A',
  skateboard_B: 'Skateboard B',
  slushy_blue: 'Slush-Becher, blau',
  slushy_machine_blue: 'Slush-Maschine, blau',
  slushy_machine_pink: 'Slush-Maschine, pink',
  slushy_machine_yellow: 'Slush-Maschine, gelb',
  slushy_pink: 'Slush-Becher, pink',
  slushy_yellow: 'Slush-Becher, gelb',
  taco: 'Taco',
  toolcart: 'Werkzeugwagen',
  toolcart_tall: 'Werkzeugwagen, hoch',
  umbrella_blue: 'Regenschirm, blau',
  umbrella_green: 'Regenschirm, grün',
  umbrella_pink: 'Regenschirm, pink',
  umbrella_yellow: 'Regenschirm, gelb',
  waterbottle_A: 'Wasserflasche A',
  waterbottle_B: 'Wasserflasche B',
  woodstove: 'Holzofen',
};

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const files = (await readdir(source)).filter((f) => f.endsWith('.gltf')).sort();
if (!files.length) {
  console.error(`Keine .gltf-Dateien in ${source}.`);
  process.exit(1);
}

const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('mixedbag');
const material = doc.createMaterial('kaykit').setMetallicFactor(0).setRoughnessFactor(0.5);
/**
 * **Das zweite Material entsteht erst, wenn Glas vorkommt.** Ein Material ohne
 * Netz bliebe bis `prune()` in der Datei stehen und danach als Frage zurück,
 * warum es einmal da war.
 */
let glass = null;
let atlas = null;
const pieces = [];
const missing = [];
let blanked = 0;

for (const file of files) {
  const name = file.slice(0, -5);
  const src = await io.read(path.join(source, file));

  // **Der Atlas des ersten Stücks gilt für alle.** Alle 59 Dateien nennen
  // dieselbe `kaykit_texture_A.png`; ein zweiter Atlas käme nur aus einer
  // anderen Quelle, und dann stimmt die Annahme dieses Werkzeugs nicht mehr.
  atlas ??=
    src
      .getRoot()
      .listTextures()
      .find((texture) => texture.getName().startsWith('kaykit_texture'))
      ?.getImage() ?? null;

  // **Erst plattmachen, dann ablegen** — wie beim zweiten Katalog: Das Fahrrad
  // hat sieben Unterknoten, der zerlegte Zauberwürfel siebenundzwanzig, und
  // jeder trägt seine eigene Drehung. `flatten` rechnet sie in die Eckpunkte,
  // `join` legt zusammen, was dasselbe Material hat.
  await src.transform(flatten(), join());

  const mesh = doc.createMesh(name);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  let triangles = 0;

  for (const node of src.getRoot().listNodes()) {
    const from = node.getMesh();
    if (!from) continue;
    for (const primitive of from.listPrimitives()) {
      const was = primitive.getMaterial()?.getName() ?? '';
      if (was === GLASS) {
        glass ??= doc
          .createMaterial('glas')
          .setBaseColorFactor([1, 1, 1, 0.2])
          .setAlphaMode('BLEND')
          .setMetallicFactor(0)
          .setRoughnessFactor(0.5);
      }
      const copy = doc.createPrimitive().setMaterial(was === GLASS ? glass : material);
      for (const semantic of primitive.listSemantics()) {
        const attribute = primitive.getAttribute(semantic);
        if (semantic === 'POSITION') {
          for (let i = 0; i < 3; i++) {
            lo[i] = Math.min(lo[i], attribute.getMin([])[i]);
            hi[i] = Math.max(hi[i], attribute.getMax([])[i]);
          }
        }
        // **Der Platzhalter wird umgebogen und nicht mitgenommen**: Seine
        // Eckpunkte zeigen auf ein Bild, das „ersetze mich" sagt, und
        // bekommen statt dessen alle dieselbe UV (`BLANK_UV`).
        const array =
          was === PLACEHOLDER && semantic === 'TEXCOORD_0'
            ? attribute.getArray().map((_, i) => BLANK_UV[i % 2])
            : attribute.getArray().slice();
        copy.setAttribute(
          semantic,
          doc.createAccessor().setType(attribute.getType()).setArray(array).setBuffer(buffer),
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
      if (was === PLACEHOLDER) blanked += (copy.getIndices()?.getCount() ?? 0) / 3;
      mesh.addPrimitive(copy);
    }
  }

  scene.addChild(doc.createNode(name).setMesh(mesh));
  if (!(name in LABELS)) missing.push(name);
  pieces.push({
    name,
    label: LABELS[name] ?? name,
    triangles,
    // Von hier an **Spielmaß** — wer den Katalog liest, soll nicht noch einmal
    // rechnen müssen.
    lo: lo.map((v) => v * SCALE),
    hi: hi.map((v) => v * SCALE),
  });
}

// **Der Atlas bleibt in voller Größe** — aus demselben Grund wie beim zweiten
// Katalog (`tools/diner-model.mjs`): Er ist eine **Farbtafel** aus 8 × 4
// Feldern und kein Bild. Eine UV zielt auf ein Feld, und jede Verkleinerung
// rückt die Feldgrenzen zusammen, bis der Filter an einer Grenze zwei Farben
// zu einer dritten mischt, die es im Atlas nicht gibt. Verlustfrei als WebP
// kostet die ganze Tafel 19 KB; das PNG der Quelle kostet 17, und ein
// verkleinertes spart Bytes, die niemand zählt, um einen Fehler, den jeder
// sieht.
if (atlas) {
  const small = await sharp(Buffer.from(atlas)).webp({ lossless: true }).toBuffer();
  material.setBaseColorTexture(
    doc.createTexture('kaykit').setImage(new Uint8Array(small)).setMimeType('image/webp'),
  );
}

// **Aufräumen und packen** — dieselben sechs Durchgänge wie beim zweiten
// Katalog, und die letzten drei sind der Grund, warum der Lader einen
// Entpacker mitbringt (`core/mixedbagModel.ts`).
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
    `(${blanked} Platzhalterdreiecke umgebogen, Glas: ${glass ? 'ja' : 'nein'})`,
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
  const body = `export const MIXEDBAG_PIECES: readonly MixedBagPiece[] = [\n${lines.join('\n')}\n];\n`;
  if (fit) {
    const current = await readFile(fit, 'utf8');
    // **Ersetzt wird genau der eine Block**, und wenn er nicht zu finden ist,
    // wird gar nichts geschrieben — dieselbe Vorsicht wie beim zweiten
    // Katalog, und dort steht auch, welcher Fehler sie gelehrt hat.
    const block = /export const MIXEDBAG_PIECES: readonly MixedBagPiece\[\] = \[[\s\S]*?\n?\];\n/;
    if (!block.test(current)) {
      console.error(`In ${fit} steht keine Liste \`MIXEDBAG_PIECES\` — nichts geschrieben.`);
      process.exit(1);
    }
    await writeFile(fit, current.replace(block, body));
    console.log(`${fit}: ${pieces.length} Einträge geschrieben — jetzt \`npm run format\``);
  } else {
    console.log(`\n${body}`);
  }
}
