/**
 * **Macht aus der gekauften KayKit-Sammlung ein begehbares Regal** — einmal von
 * Hand laufen lassen, das Ergebnis liegt in `public/models/kaykit/`.
 *
 *     node tools/kaykit-model.mjs --in=<entpackte Sammlung>
 *     node tools/kaykit-model.mjs --in=… --pack=dungeon   # nur ein Paket
 *     node tools/kaykit-model.mjs --index                 # nur index.json neu
 *
 * Die Quelle ist „The Complete KayKit Collection v7" von Kay Lousberg — gekauft,
 * und die Pakete darin stehen unter CC0 (siehe `public/models/CREDITS.md` und
 * `public/models/kaykit/LICENSE.txt`). Sie liegt **nicht** im Repository: 644 MB
 * Zip mit 29 358 Dateien, von denen die Hälfte `.fbx`, `.obj` und `.blend` ist,
 * die hier niemand lesen kann.
 *
 * ## Warum das hier anders aussieht als die drei anderen Werkzeuge
 *
 * `tools/diner-model.mjs` und `tools/mixedbag-model.mjs` **bündeln**: aus 225
 * bzw. 59 Einzeldateien wird je eine `.glb`, weil das Spiel den ganzen Katalog
 * auf einmal braucht. Hier ist es umgekehrt. Diese 4 470 Modelle sind kein
 * Katalog, den eine Zone aufstellt, sondern ein **Regal, in dem jemand
 * blättert** — und in einem Bündel kann man nicht blättern. Also: eine Datei je
 * Modell, in Ordnern, die aussehen wie die Pakete des Zeichners.
 *
 * Vier Dinge passieren:
 *
 * 1. **Umbenennen.** Aus `KayKit Medieval Hexagon Pack 1.0.1/Assets/gltf/
 *    units/blue/` wird `medieval-hexagon/units/blue/`. Ordnernamen werden zu
 *    Kleinbuchstaben mit Bindestrichen — diese Pfade sind **URLs**, und in
 *    einer URL haben Leerzeichen, Klammern und Umlaute nichts verloren. Die
 *    **Dateinamen** bleiben dagegen, wie der Zeichner sie genannt hat
 *    (`Orc_Axe.glb`, nicht `orc-axe.glb`): Das ist der Name des Dings, und wer
 *    ihn sucht, sucht ihn so. Zwei Ebenen fallen weg, weil sie nichts sagen,
 *    was der Baum nicht schon sagt: `Assets/` und `gltf/`.
 * 2. **Kleinrechnen.** Dieselben sechs Durchgänge wie beim zweiten Katalog —
 *    `weld`, `dedup`, `prune`, `reorder`, `quantize`, `meshopt`. Der Lader
 *    bringt den Entpacker ohnehin mit.
 * 3. **Texturen nach draußen und einmal je Paket.** Die 283 Dateien des
 *    Dungeon-Pakets nennen **dieselbe** `dungeon_texture.png`; eingebettet
 *    wären das 283 Kopien. Sie liegt statt dessen einmal in
 *    `dungeon/textures/`, und jede `.glb` zeigt mit einer relativen URI dorthin
 *    (`../textures/dungeon_texture.webp`). Das darf eine GLB, und three.js löst
 *    solche Pfade gegen die Adresse der `.glb` auf. Entdoppelt wird nach dem
 *    **Inhalt** — zwei Pakete nennen ihre Atlanten gleich und meinen
 *    zweierlei — und **je Paket**: Ein Paketordner, der in einen anderen
 *    zeigt, ist einer, den man nicht mehr einzeln löschen kann. Verkleinert
 *    wird dabei kein Bild; verlustfrei nach WebP umkodiert wird eines nur,
 *    wenn es dadurch kleiner wird.
 * 4. **Auflisten.** `index.json` beschreibt den Baum, damit das Menü ihn zeigen
 *    kann, ohne 4 470 Dateien zu erraten.
 *
 * ## Die Struktur der Modelle bleibt, wie sie ist
 *
 * Die beiden anderen Werkzeuge rufen `flatten()` und `join()`: Sie rechnen
 * Unterknoten in die Eckpunkte und legen Teilnetze zusammen, weil aus 225
 * Stücken **ein** Katalog werden soll. Hier wird nichts plattgemacht. Eine
 * Truhe, deren Deckel ein eigener Knoten ist, ist genau das — und wer sie
 * später aufklappen lassen will, findet den Deckel noch. Der Preis sind ein
 * paar Zeichenaufrufe mehr bei dem einen Modell, das gerade in der Vorschau
 * steht; das ist keines.
 *
 * ## Vier Fehler, die beim Schreiben gemacht wurden
 *
 * - **`setURI()` interessiert eine GLB nicht.** Der erste Anlauf setzte an
 *   jeder Textur die relative URI und schrieb `io.writeBinary(doc)` — und bekam
 *   die Textur trotzdem eingebettet. Der Schreiber von `@gltf-transform` fragt
 *   die URI nur im **glTF**-Zweig; im GLB-Zweig wandert jedes Bild in den
 *   Binärblock, ohne zu fragen. Deshalb steht hier jetzt `setImage(null)` und
 *   danach `withExternalImages()`, das den JSON-Block der fertigen GLB aufmacht
 *   und in jeden `images`-Eintrag die URI schreibt. Zwanzig Zeilen, die man
 *   sich spart, wenn man vorher in den Schreiber sieht statt in die
 *   Dokumentation.
 * - **`prune()` wirft keine Skelette weg — es vervielfacht sie.** Im Protokoll
 *   stand „Removed types… Skin (9)", und das las sich wie ein zerstörter
 *   Charakter. Es ist das Gegenteil: `quantize()` muss die Bindematrizen eines
 *   Skeletts mitverschieben, und weil jedes Netz anders quantisiert wird,
 *   bekommt **jedes** Netz seine eigene Kopie des Skeletts; aufgeräumt wird
 *   danach die gemeinsame. Aus einem Skelett werden neun, die Datei wird
 *   trotzdem ein Drittel so groß, und die Animationen laufen. Nachgesehen wurde
 *   das nicht im Protokoll, sondern im Browser (siehe unten).
 * - **`resample()` macht Animationsdateien _größer_.** Zwölf MB der Sammlung
 *   sind Animationen, und die naheliegende Sparmaßnahme ist, überflüssige
 *   Schlüsselbilder wegzuwerfen: 40 911 werden 29 576. Die Datei wuchs dabei
 *   von 513 auf 593 KB. Der Grund ist der Packer und nicht der Sparer —
 *   `EXT_meshopt_compression` speichert gleichmäßige Zeitachsen als Schrittweite
 *   und sonst gar nicht; wer Bilder herausnimmt, macht die Achse ungleichmäßig
 *   und zwingt jeden Zeitstempel einzeln in die Datei. Also bleibt jede
 *   Animation vollständig, und `resample` steht nicht in der Liste der
 *   Durchgänge.
 * - **Ein zweites `npm install --no-save` wirft das erste wieder hinaus.** Mitten
 *   im Messen fehlte `@gltf-transform/core`, obwohl es installiert war: `npm
 *   install --no-save keyframe-resample` räumt alles weg, was nicht in der
 *   `package.json` steht — und genau das sind die fünf Pakete von oben. Sie
 *   gehören deshalb in **einen** Aufruf, so wie er unten steht.
 *
 * ## Was draußen bleibt
 *
 * `.blend`, `.fbx`, `.obj`, `.mtl` (zusammen 994 MB), die Unity-Varianten, die
 * Ordner `Samples`, `SOURCE` und `Textures` — Vorschaubilder, Werbeblätter und
 * Quelldateien —, die `.url`-Verknüpfungen, das Benutzerhandbuch und
 * `__MACOSX`. Mitgenommen wird genau, was ein Browser laden kann: `.gltf`,
 * `.glb` und die Bilder, die darin **wirklich** genannt werden — von den 1 228
 * PNG der Sammlung sind das 143, und je Paket abgelegt werden daraus 153
 * Dateien. Dazu kommen 22 Dateien, die doppelt sind und deshalb nur einmal
 * ausgeliefert werden: die Animationsbibliothek, siehe `LIBRARY`.
 *
 * Geprüft wird das Ergebnis nicht hier, sondern mit einem Wegwerfskript im
 * Browser: Ein Modell, das sich nicht laden lässt, ist nicht fertig, und diesem
 * Werkzeug sieht man das nicht an.
 *
 * Das Werkzeug läuft von Hand und nicht bei jedem Build; `@gltf-transform`,
 * `sharp` und `meshoptimizer` gehören nicht in die Abhängigkeiten eines Spiels,
 * das sie nie ausführt:
 *
 *     npm install --no-save @gltf-transform/core @gltf-transform/functions \
 *       @gltf-transform/extensions sharp meshoptimizer
 */
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const args = new Map(
  process.argv.slice(2).map((value) => {
    const at = value.indexOf('=');
    return at < 0 ? [value.replace(/^--/, ''), ''] : [value.slice(2, at), value.slice(at + 1)];
  }),
);

const out = path.resolve(args.get('out') || 'public/models/kaykit');
const only = args.get('pack');
const indexOnly = args.has('index') && !args.has('in');

/**
 * **Die Paketnamen sind von Hand abgeschrieben und nicht gerechnet.** Man
 * _könnte_ „KayKit " abschneiden, die Versionsnummer wegwerfen, „Pack"
 * streichen und den Rest kleinschreiben — und beim nächsten Paket, das „Series"
 * im Namen trägt, stünde eine Regel da, die drei Sonderfälle kennt. Diese
 * Kürzel sind **URLs**: Sie stehen in `index.json`, gleich im Menü und
 * irgendwann in einem Lesezeichen. Eine URL, die sich ändert, weil jemand die
 * Ableitungsregel verbessert hat, ist eine kaputte URL.
 *
 * Der Schlüssel ist der Ordnername der Sammlung, der Wert das Kürzel; die
 * Beschriftung daneben ist der Ordnername ohne „KayKit " und steht so im Menü.
 * Ein Ordner, der hier fehlt, wird beim Lauf gemeldet und übersprungen — dann
 * fehlt ein Paket und nicht die ganze Sammlung.
 */
const PACKS = {
  'KayKit Adventurers 2.0': 'adventurers',
  'KayKit Block Bits 1.0': 'block-bits',
  'KayKit Board Game Bits 1.0': 'board-game-bits',
  'KayKit Character Animations 1.1': 'character-animations',
  'KayKit City Builder Bits 1.0': 'city-builder-bits',
  'KayKit Dungeon Pack 1.1': 'dungeon',
  'KayKit Fantasy Weapons Bits 1.0': 'fantasy-weapons-bits',
  'KayKit Forest Nature Pack 1.0': 'forest-nature',
  'KayKit Furniture Bits 1.0': 'furniture-bits',
  'KayKit Halloween Bits 1.0': 'halloween-bits',
  'KayKit Holiday Bits 1.0': 'holiday-bits',
  'KayKit Medieval Hexagon Pack 1.0.1': 'medieval-hexagon',
  'KayKit Mixed Bag 1': 'mixed-bag',
  'KayKit Mystery Monthly Series 4 (1.1)': 'mystery-monthly-4',
  'KayKit Mystery Monthly Series 5 (1.1)': 'mystery-monthly-5',
  'KayKit Mystery Monthly Series 6 (1.1)': 'mystery-monthly-6',
  'KayKit Platformer Pack 1.0': 'platformer',
  'KayKit Prototype Bits 1.1': 'prototype-bits',
  'KayKit RPG Tools Bits 1.0': 'rpg-tools-bits',
  'KayKit Resource Bits 1.0': 'resource-bits',
  'KayKit Restaurant Bits 1.0': 'restaurant-bits',
  'KayKit Skeletons 1.1': 'skeletons',
  'KayKit Space Base Bits 1.0': 'space-base-bits',
};

/** Die Lizenz der Sammlung — eine Datei, und sie gilt für alle 23 Pakete. */
const LICENSE = 'License.txt';

/** Was in `index.json` an jedem Paket steht. Die Sammlung kennt nur diese eine. */
const SPDX = 'CC0-1.0';

/**
 * **Ordner, die nur sagen, in welchem Format sie liegen.** `Assets/gltf/…` wird
 * zu `…`: Dass hier Modelle liegen, sagt der Ordner `models`, und dass es glTF
 * ist, sagt die Endung. Alles andere — `characters`, `animations`, `units`,
 * `blue`, `11 - May 2024 - Clown` — bleibt stehen, denn das sind Auskünfte.
 */
const NOISE = new Set(['assets', 'gltf']);

/** Ordner, in denen zwar Bilder liegen, aber nichts, was ein Browser laden soll. */
const SKIP_DIRS = /^(source|samples|textures|__macosx|.*\(unity\)|fbx|obj)$/i;

/**
 * **Die Animationsbibliothek liegt einmal und nicht siebenmal.** Sieben Pakete
 * bringen einen Ordner `Animations/` mit, und darin steht in allen sieben
 * dieselbe Datei — `Rig_Medium_General.glb` ist in _Adventurers_, _Skeletons_,
 * _Prototype Bits_ und den drei Mystery-Monthly-Bänden **byteweise** dieselbe
 * wie in _Character Animations_, dem Paket, das nichts anderes ist als diese
 * Bibliothek. Ausgeliefert wird sie deshalb nur dort; die 22 Kopien sparen
 * 5,0 MB.
 *
 * Das ist keine Annahme, sondern wird geprüft: Vor dem Lauf werden die
 * Animationsdateien der Bibliothek gehasht, und übersprungen wird nur, was
 * denselben Hash hat. Ein Paket, das eine **eigene** Animation mitbringt,
 * behält sie — und wenn der Zeichner die Bibliothek eines Tages je Paket
 * abwandelt, merkt es dieses Werkzeug und nicht erst ein Spieler.
 */
const LIBRARY = 'KayKit Character Animations 1.1';

/**
 * **Aus einem Ordnernamen wird ein Stück URL.** Kleinbuchstaben, und alles, was
 * kein Buchstabe und keine Ziffer ist, wird ein Bindestrich: `Rig_Medium` →
 * `rig-medium`, `11 - May 2024 - Clown` → `11-may-2024-clown`.
 */
const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * **Der Name des Dings, ohne die doppelte Endung.** Sechs Dateien des
 * Orc-Raider-Monats heißen `Orc_Axe.gltf.glb` — eine `.glb`, die einmal durch
 * einen Umwandler gelaufen ist, der seinen Namen nicht aufgeräumt hat.
 */
const basename = (file) => file.replace(/\.(gltf|glb)$/i, '').replace(/\.gltf$/i, '');

const enc = new TextEncoder();
const dec = new TextDecoder();
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

/**
 * **Schreibt die Bild-URIs in eine fertige GLB.** `io.writeBinary()` kennt nur
 * eingebettete Bilder: Wer einer Textur eine URI gibt, bekommt sie im
 * glTF-Zweig, im GLB-Zweig wird sie ignoriert. Die Texturen kommen deshalb ohne
 * Bild in den Schreiber (`setImage(null)`), und hier wird der JSON-Block wieder
 * aufgemacht und jedem `images`-Eintrag seine URI verpasst. Die Reihenfolge
 * stimmt, weil der Schreiber `images` aus `root.listTextures()` baut.
 *
 * Der Binärblock wird dabei **nicht** angefasst — in ihm stehen die Puffer von
 * `EXT_meshopt_compression`, und jede verschobene Adresse darin wäre ein Modell,
 * das nicht mehr lädt.
 */
function withExternalImages(glb, images) {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  let at = 12;
  let json = null;
  let bin = new Uint8Array(0);
  while (at + 8 <= glb.byteLength) {
    const length = view.getUint32(at, true);
    const type = view.getUint32(at + 4, true);
    const chunk = glb.subarray(at + 8, at + 8 + length);
    at += 8 + length;
    if (type === JSON_CHUNK) json = JSON.parse(dec.decode(chunk));
    else if (type === BIN_CHUNK) bin = chunk;
  }
  if (!json) throw new Error('GLB ohne JSON-Block');
  (json.images ?? []).forEach((image, i) => {
    if (!images[i]) return;
    image.uri = images[i].uri;
    image.mimeType = images[i].mime;
  });

  const text = enc.encode(JSON.stringify(json));
  const jsonPad = (4 - (text.length % 4)) % 4;
  const binPad = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + text.length + jsonPad + (bin.length ? 8 + bin.length + binPad : 0);
  const bytes = new Uint8Array(total);
  const write = new DataView(bytes.buffer);
  write.setUint32(0, 0x46546c67, true);
  write.setUint32(4, 2, true);
  write.setUint32(8, total, true);
  write.setUint32(12, text.length + jsonPad, true);
  write.setUint32(16, JSON_CHUNK, true);
  bytes.set(text, 20);
  bytes.fill(0x20, 20 + text.length, 20 + text.length + jsonPad);
  if (bin.length) {
    const start = 20 + text.length + jsonPad;
    write.setUint32(start, bin.length + binPad, true);
    write.setUint32(start + 4, BIN_CHUNK, true);
    bytes.set(bin, start + 8);
  }
  return bytes;
}

/** Alle Dateien unter `dir`, ohne die Ordner aus `SKIP_DIRS`. */
async function walk(dir, base = dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.test(entry.name)) continue;
      found.push(...(await walk(full, base)));
    } else if (/\.(gltf|glb)$/i.test(entry.name)) {
      found.push(path.relative(base, full));
    }
  }
  return found;
}

/** Aus dem Quellpfad innerhalb eines Pakets wird der Ausgabepfad. */
function target(relative) {
  const parts = relative.split(path.sep);
  const file = parts.pop();
  const dirs = parts.map(slug).filter((part) => part && !NOISE.has(part));
  return [...dirs, `${basename(file)}.glb`].join('/');
}

if (!indexOnly) {
  const source = args.get('in');
  if (!source || !existsSync(source)) {
    console.error('Bitte --in=<entpackte Sammlung> angeben.');
    process.exit(1);
  }
  if (!existsSync(path.join(source, LICENSE))) {
    console.error(`In ${source} steht keine ${LICENSE} — ist das die ganze Sammlung?`);
    process.exit(1);
  }

  await MeshoptEncoder.ready;
  // 4 492 Läufe mal fünf Zeilen „Removed types…" sind kein Protokoll, sondern
  // eine Wand; gemeldet wird, was schiefgeht.
  const quiet = new Logger(Logger.Verbosity.ERROR);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

  // **Aufgeräumt wird vor dem Lauf, aber nicht alles.** `README.md` erklärt den
  // Ordner und ist von Hand geschrieben; wer sie mit wegwirft, merkt es erst,
  // wenn jemand fragt, was hier eigentlich liegt.
  if (existsSync(out)) {
    for (const entry of await readdir(out)) {
      if (entry === 'README.md') continue;
      if (only && entry !== only) continue;
      await rm(path.join(out, entry), { recursive: true, force: true });
    }
  }
  await mkdir(out, { recursive: true });
  const license = await readFile(path.join(source, LICENSE));
  if (!only) await writeFile(path.join(out, 'LICENSE.txt'), license);

  const folders = (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const unknown = folders.filter((name) => !(name in PACKS));
  if (unknown.length) console.warn(`Unbekannte Ordner (PACKS ergänzen): ${unknown.join(', ')}`);

  // **Die Bibliothek wird zuerst gehasht**, damit die anderen sechs Pakete
  // wissen, was sie weglassen dürfen — und was eben nicht.
  const library = new Set();
  if (existsSync(path.join(source, LIBRARY, 'Animations'))) {
    for (const file of await walk(path.join(source, LIBRARY, 'Animations'))) {
      const data = await readFile(path.join(source, LIBRARY, 'Animations', file));
      library.add(createHash('sha1').update(data).digest('hex'));
    }
  }

  let models = 0;
  let skipped = 0;
  let skippedBytes = 0;
  let sourceBytes = 0;
  let outBytes = 0;
  let textureBytes = 0;
  const broken = [];

  for (const folder of folders) {
    const pack = PACKS[folder];
    if (!pack || (only && pack !== only)) continue;
    const from = path.join(source, folder);
    const to = path.join(out, pack);
    await mkdir(to, { recursive: true });
    await writeFile(path.join(to, 'LICENSE.txt'), license);

    // **Eine Textur je Inhalt.** Der Schlüssel ist der Hash der Bytes, nicht der
    // Dateiname: Zwei Pakete nennen ihre Atlanten gleich und meinen zweierlei,
    // und 283 Dateien nennen denselben Atlas verschieden oft.
    const textures = new Map();
    const names = new Map();
    const store = async (data, wanted) => {
      const hash = createHash('sha1').update(data).digest('hex');
      const known = textures.get(hash);
      if (known) return known;

      // **Verlustfrei als WebP — aber nur, wenn es kleiner wird.** Verkleinert
      // wird hier **nichts**: Was ein Farbstreifen-Atlas beim Schrumpfen
      // verliert, steht in `docs/agents/modelle.md`, und die 520 × 620 großen
      // Wappen der Brettspielkiste sind Zeichnungen, an denen dasselbe gilt.
      // Verlustfrei umkodiert ändert sich dagegen kein einziges Pixel, nur die
      // Verpackung — 11,6 MB PNG werden 6,2 MB. Bei ein paar Bildern ist
      // das PNG das kleinere; dann bleibt das PNG. Es ist derselbe Griff, den
      // schon `tools/diner-model.mjs` tut.
      const png = path.extname(wanted).toLowerCase() === '.png';
      const webp = png ? await sharp(data).webp({ lossless: true, effort: 6 }).toBuffer() : null;
      const smaller = webp && webp.length < data.length;
      const bytes = smaller ? webp : data;
      const ext = smaller ? '.webp' : path.extname(wanted).toLowerCase() || '.png';
      const mime = `image/${{ '.jpg': 'jpeg', '.jpeg': 'jpeg' }[ext] ?? ext.slice(1)}`;

      const stem = path.basename(wanted, path.extname(wanted));
      let name = `${stem}${ext}`;
      for (let n = 2; names.has(name) && names.get(name) !== hash; n++) name = `${stem}-${n}${ext}`;
      names.set(name, hash);
      const stored = { name, mime };
      textures.set(hash, stored);
      await mkdir(path.join(to, 'textures'), { recursive: true });
      await writeFile(path.join(to, 'textures', name), bytes);
      textureBytes += bytes.length;
      return stored;
    };

    const files = (await walk(from)).sort();
    const written = new Map();
    let count = 0;
    let before = 0;
    let after = 0;

    for (const file of files) {
      if (folder !== LIBRARY && file.split(path.sep)[0].toLowerCase() === 'animations') {
        const data = await readFile(path.join(from, file));
        if (library.has(createHash('sha1').update(data).digest('hex'))) {
          skipped++;
          skippedBytes += data.length;
          continue;
        }
        console.warn(`  eigene Animation: ${folder}/${file} — bleibt drin`);
      }
      const where = target(file);
      if (written.has(where)) {
        // **Kein Modell zweimal.** Einige Pakete liefern dasselbe Stück als
        // `.gltf` und als `.glb`; genommen wird das erste, gemeldet wird beides.
        console.warn(`  doppelt: ${where} — ${written.get(where)} bleibt, ${file} fällt weg`);
        continue;
      }
      const full = path.join(from, file);
      before += (await stat(full)).size;
      if (/\.gltf$/i.test(file)) {
        const bin = full.replace(/\.gltf$/i, '.bin');
        if (existsSync(bin)) before += (await stat(bin)).size;
      }

      let doc;
      try {
        doc = await io.read(full);
        doc.setLogger(quiet);
        await doc.transform(
          weld(),
          dedup(),
          prune(),
          reorder({ encoder: MeshoptEncoder }),
          quantize(),
          meshopt({ encoder: MeshoptEncoder, level: 'high' }),
        );
      } catch (error) {
        broken.push(`${folder}/${file}: ${error.message}`);
        continue;
      }

      const depth = where.split('/').length - 1;
      const images = [];
      for (const texture of doc.getRoot().listTextures()) {
        const image = texture.getImage();
        if (!image) {
          images.push(null);
          continue;
        }
        const wanted = path.basename(texture.getURI() || `${texture.getName() || 'texture'}.png`);
        const stored = await store(Buffer.from(image), wanted);
        images.push({ uri: `${'../'.repeat(depth)}textures/${stored.name}`, mime: stored.mime });
        texture.setImage(null);
      }

      const bytes = withExternalImages(await io.writeBinary(doc), images);
      const destination = path.join(to, where);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
      written.set(where, file);
      after += bytes.length;
      count++;
    }

    models += count;
    sourceBytes += before;
    outBytes += after;
    const mb = (value) => (value / 1024 / 1024).toFixed(2);
    console.log(
      `${pack.padEnd(22)} ${String(count).padStart(4)} Modelle, ` +
        `${mb(before).padStart(7)} → ${mb(after).padStart(6)} MB, ` +
        `${textures.size} Textur(en)`,
    );
  }

  const mb = (value) => (value / 1024 / 1024).toFixed(1);
  console.log(
    `\n${models} Modelle: ${mb(sourceBytes)} → ${mb(outBytes)} MB ` +
      `(${((1 - outBytes / sourceBytes) * 100).toFixed(0)} % weniger), ` +
      `dazu ${mb(textureBytes)} MB Texturen — zusammen ${mb(outBytes + textureBytes)} MB.`,
  );
  if (skipped) {
    console.log(`${skipped} Kopien der Animationsbibliothek weggelassen (${mb(skippedBytes)} MB Quelle).`);
  }
  if (broken.length) {
    console.warn(`\n${broken.length} Datei(en) nicht umgewandelt:`);
    for (const line of broken) console.warn(`  ${line}`);
  }
}

/**
 * **Sortiert wird ohne Rücksicht auf Groß- und Kleinschreibung**, und bei
 * Gleichstand nach Zeichenwert. `localeCompare` täte dasselbe und käme je nach
 * Sprache des Rechners zu einer anderen Reihenfolge — `index.json` soll aber auf
 * jedem Rechner dieselbe Datei sein. Kleinschreibung zuerst zu vergleichen ist
 * dabei kein Schönheitswunsch: Nach Zeichenwert stünde `Barrel_A.glb` vor
 * `anvil.glb`, weil Großbuchstaben kleinere Zahlen sind.
 */
const byName = (a, b) => {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x !== y) return x < y ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
};

/**
 * **Der Baum als eine Datei.** Das Menü kann kein Verzeichnis lesen — ein
 * statischer Server liefert keine Ordnerlisten, und 4 492 Dateien erraten geht
 * nicht. `index.json` ist deshalb das Inhaltsverzeichnis: je Ordner seine
 * Unterordner und seine Dateien mit Größe, immer beide Listen (auch leer), immer
 * sortiert. `label` und `license` stehen nur an den Paketen, denn nur die haben
 * eine Herkunft.
 *
 * Geschrieben wird ohne Einrückung: Diese Datei wird gelesen und nicht
 * gepflegt, und eingerückt wäre sie mehr als doppelt so groß.
 */
async function tree(dir, name, label) {
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) => byName(a.name, b.name));
  const node = { name, ...(label ? { label, license: SPDX } : {}), dirs: [], files: [] };
  for (const entry of entries) {
    // `textures/` steht nicht im Verzeichnis: Darin liegt kein Modell, und das
    // Menü zeigt keine Bilder an. Gefunden werden sie über die URI in der GLB.
    if (entry.name === 'textures') continue;
    if (entry.isDirectory()) node.dirs.push(await tree(path.join(dir, entry.name), entry.name));
    else if (entry.name.endsWith('.glb')) {
      node.files.push({ name: entry.name, bytes: (await stat(path.join(dir, entry.name))).size });
    }
  }
  return node;
}

const labels = Object.fromEntries(
  Object.entries(PACKS).map(([folder, pack]) => [pack, folder.replace(/^KayKit /, '')]),
);
const root = { name: 'kaykit', dirs: [], files: [] };
for (const entry of (await readdir(out, { withFileTypes: true })).sort((a, b) =>
  byName(a.name, b.name),
)) {
  if (entry.isDirectory()) {
    root.dirs.push(await tree(path.join(out, entry.name), entry.name, labels[entry.name]));
  }
}
const index = path.join(out, 'index.json');
await writeFile(index, JSON.stringify({ version: 1, root }));
console.log(`${path.relative(process.cwd(), index)}: ${((await stat(index)).size / 1024).toFixed(0)} KB`);
