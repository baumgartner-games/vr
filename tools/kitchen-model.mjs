/**
 * **Macht aus der Schauraum-Szene einen Möbelkatalog** — einmal von Hand
 * laufen lassen, das Ergebnis liegt in `public/models/kitchen.glb`.
 *
 *     node tools/kitchen-model.mjs --in=<entpackter Sketchfab-Ordner>
 *     node tools/kitchen-model.mjs --in=… --list    # nur die Teile zeigen
 *
 * Die Quelle ist „Overcooked Kitchen Assets (Fan Art)" von Arun Kumar S
 * (CC-BY-4.0, siehe `public/models/CREDITS.md`). Sie ist ein **aufgebautes
 * Bild**: ein Fußboden, dreizehn Möbel und ein paar Töpfe, alles in einer
 * Szene, verteilt über vier Netze, die nur nach **Material** getrennt sind.
 * Man kann sie ansehen, aber nichts damit bauen — wer einen Tresen auf eine
 * Kachel stellen will, braucht einen Tresen und nicht eine Küche.
 *
 * Drei Dinge passieren hier:
 *
 * 1. **Zerlegen.** Über die Positionen (nicht über die Indizes) wird gesucht,
 *    was zusammenhängt — geteilte UV-Nähte trennen sonst jede Kante. Heraus
 *    kommen gut siebzig Stücke.
 * 2. **Bündeln.** Ein Herd ist ein Kasten *und* eine Platte *und* zwei
 *    Knöpfe. Stücke, die sich in der Grundfläche überlappen oder berühren,
 *    gehören zusammen — gerechnet über ihre Grundrisse, nicht geraten.
 * 3. **Hinstellen.** Jedes Möbel bekommt seinen Ursprung **auf dem Boden in
 *    seiner Mitte**, denn dorthin stellt es das Spiel (`worlds/grid`). Das
 *    Raster ist ein Meter (`worlds/nav/navTile.TILE`), und die Quelle ist in
 *    Metern gebaut — ein Tresen ist dort 2 × 2 m und bleibt es.
 *
 * Die Texturen werden verkleinert und als WebP geschrieben: 7,5 MB PNG sind
 * für ein Spiel, das über GitHub Pages ausgeliefert wird, keine Größe, und
 * aus 16 m Höhe sieht niemand den Unterschied zwischen 2048 und 512.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, transformPrimitive, weld } from '@gltf-transform/functions';
import sharp from 'sharp';

const args = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  }),
);
const source = args.get('in');
const out = path.resolve(args.get('out') ?? 'public/models/kitchen.glb');

/**
 * **Was von diesem Katalog übrig bleibt** — fünf Knoten von dreizehn.
 *
 * Seit es einen zweiten Baukasten gibt (`tools/diner-model.mjs`, 146 Stücke
 * aus einer Quelle), kommen Küchenzeile, Herd, Spüle, Arbeitstisch,
 * Schneidebrett, Ausgabe und Tellerausgabe von **dort**. Hier bleibt nur, was
 * der zweite Baukasten nicht hergibt oder was an einer Spielregel hängt, die
 * an genau dieses Netz gebunden ist:
 *
 * - `extinguisher` — Hocker **und** Löscher in einem Knoten, und der Löscher
 *   ist ein getragenes Gerät (`kitchenGrab.ts`).
 * - `bin` — der Mülleimer.
 * - `pass` — die Ausgabetheke, zwei Kacheln breit.
 * - `plate-rack` — das Ausgaberegal darüber.
 * - `stove-pan` — und davon **nur die Pfanne**: Der Herd darunter kommt aus
 *   dem zweiten Baukasten, die Pfanne bleibt, weil an ihr die Bratregeln und
 *   ein nachgemessener Muldenversatz hängen (`kitchenFit.PAN_BOWL`). Der
 *   Knoten heißt danach `pan` und trägt nur noch sein `Kitchen_Utensils`-Netz.
 *
 * Die Liste steht **hier** und nicht nur im Ergebnis: Wer die Quelle noch
 * einmal aufbereitet, soll dieselbe schlanke Datei bekommen und nicht wieder
 * dreizehn Knoten, von denen acht niemand aufstellt.
 */
const KEEP = ['extinguisher', 'bin', 'pass', 'plate-rack'];

/** Der Knoten, von dem nur das Gerät bleibt — und wie es danach heißt. */
const LOOSE = { from: 'stove-pan', to: 'pan', material: 'Kitchen_Utensils' };

/**
 * **Nachträglich ausdünnen**, wenn die Quelle nicht mehr zur Hand ist.
 *
 * `node tools/kitchen-model.mjs --trim` liest die **fertige**
 * `public/models/kitchen.glb` und wirft daraus alles, was nicht in `KEEP`
 * steht. Dasselbe Ergebnis wie ein voller Lauf aus der Quelle — nur ohne die
 * 23 MB Rohdaten, die nicht im Repository liegen (AGENTS.md, _Modelle im
 * Repository_). Zwei Wege zu einer Datei sind einer zu viel, und genau deshalb
 * lesen beide dieselbe Liste.
 */
if (args.has('trim')) {
  const io = new NodeIO();
  const doc = await io.read(out);
  const root = doc.getRoot();
  const scene = root.listScenes()[0];

  for (const node of root.listNodes()) {
    const name = node.getName();
    if (KEEP.includes(name)) continue;
    if (name !== LOOSE.from) {
      node.dispose();
      continue;
    }
    // Vom Herd mit der Pfanne bleibt die Pfanne: das Netz aus dem
    // Gerätematerial, und der Knoten bekommt den Namen des Geräts.
    const mesh = node.getMesh();
    for (const primitive of mesh?.listPrimitives() ?? []) {
      if (primitive.getMaterial()?.getName() !== LOOSE.material) primitive.dispose();
    }
    node.setName(LOOSE.to);
    mesh?.setName(LOOSE.to);
  }

  await doc.transform(prune());
  const bytes = await io.writeBinary(doc);
  await writeFile(out, bytes);
  console.log(
    `${path.relative(process.cwd(), out)}: ${scene.listChildren().length} Knoten ` +
      `(${[...KEEP, LOOSE.to].join(', ')}), ${(bytes.length / 1024).toFixed(0)} KB`,
  );
  process.exit(0);
}

if (!source || !existsSync(source)) {
  console.error('Gebraucht wird --in=<Ordner mit scene.gltf> oder --trim');
  process.exit(1);
}

/** Wie groß eine Textur am Ende höchstens ist, je Kante. */
const TEXTURE = Number(args.get('texture') ?? 512);

/**
 * Wie weit zwei Stücke auseinanderstehen dürfen und trotzdem zu **einem**
 * Möbel gehören, in Metern.
 *
 * Ein Knopf am Herd berührt ihn; ein Topf steht ein paar Millimeter darüber.
 * Fünf Zentimeter fangen beides ein und lassen zwei Tresen, die 2 m
 * auseinanderstehen, in Ruhe.
 */
const TOUCH = 0.05;

/**
 * **Der Fußboden fliegt raus.** Er ist zwei Dreiecke über 41 × 24 m und damit
 * kein Möbel, sondern die Bühne, auf der sie standen. Böden baut dieses
 * Projekt selbst (`worlds/grid`).
 */
const FLOOR_MATERIAL = 'Floor';

/**
 * **Die Namen des Katalogs**, in der Reihenfolge, in der die Möbel aus der
 * Szene fallen (sortiert nach x, dann z — deshalb ist die Liste stabil).
 *
 * Sie sind **nachgesehen und nicht geraten**: `--list` gibt Maße aus,
 * `src/preview/kitchenPreview.ts` rendert jedes Möbel einzeln mit einem Koch
 * daneben, und aus diesen dreizehn Bildern kommen diese dreizehn Namen. Eine
 * Größentabelle allein hätte einen Mülleimer nicht von einem Hocker
 * unterschieden.
 *
 * Wer die Quelle austauscht, prüft die Liste neu. Steht hier ein Name zu
 * wenig, heißt das Möbel nach seiner Nummer weiter — kein Grund, den Lauf
 * abzubrechen.
 */
const NAMES = [
  'plate-counter', // Tellerausgabe: Tresen mit eingelassenem Teller
  'extinguisher', // Feuerlöscher auf einem Hocker
  'sink', // Spüle mit Hahn
  'bin', // Mülleimer: grüner Sockel, graue Öffnung
  'table', // Arbeitstisch, leer
  'serve-counter', // Ausgabe mit Gericht auf dem Teller
  'board', // Schneidebrett mit Messer
  'plate-rack', // hängendes Ausgaberegal mit zwei Glocken
  'pass', // Ausgabetheke aus Stahl, 4 m
  'counter', // Küchenzeile, 2 m
  'stove', // Herd, freie Platte
  'stove-pot', // Herd mit Topf
  'stove-pan', // Herd mit Pfanne
];

const io = new NodeIO();
const doc = await io.read(path.join(source, 'scene.gltf'));
const root = doc.getRoot();

// --- zerlegen --------------------------------------------------------------
/** Alle Dreiecke in Weltkoordinaten, je nach Material getrennt gesammelt. */
const pieces = [];

for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const world = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const material = prim.getMaterial();
    if (material?.getName() === FLOOR_MATERIAL) continue;
    const copy = prim.clone();
    transformPrimitive(copy, world);
    const position = copy.getAttribute('POSITION').getArray();
    const normal = copy.getAttribute('NORMAL')?.getArray();
    const uv = copy.getAttribute('TEXCOORD_0')?.getArray();
    const indices = copy.getIndices().getArray();

    // **Zusammenhang über die Position**, nicht über den Index: An einer
    // UV-Naht liegt derselbe Punkt zweimal im Puffer, und wer nur Indizes
    // vereinigt, zerschneidet jedes Möbel an seinen Kanten.
    const count = position.length / 3;
    const byPlace = new Map();
    const same = new Int32Array(count);
    for (let i = 0; i < count; i++) {
      const key = `${position[i * 3].toFixed(4)}|${position[i * 3 + 1].toFixed(4)}|${position[i * 3 + 2].toFixed(4)}`;
      if (!byPlace.has(key)) byPlace.set(key, i);
      same[i] = byPlace.get(key);
    }
    const parent = new Int32Array(count).map((_, i) => same[i]);
    const find = (a) => {
      a = same[a];
      while (parent[a] !== a) {
        parent[a] = parent[parent[a]];
        a = parent[a];
      }
      return a;
    };
    const union = (a, b) => {
      a = find(a);
      b = find(b);
      if (a !== b) parent[b] = a;
    };
    for (let t = 0; t < indices.length; t += 3) {
      union(indices[t], indices[t + 1]);
      union(indices[t + 1], indices[t + 2]);
    }

    const groups = new Map();
    for (let t = 0; t < indices.length; t += 3) {
      const key = find(indices[t]);
      let group = groups.get(key);
      if (!group) groups.set(key, (group = []));
      group.push(indices[t], indices[t + 1], indices[t + 2]);
    }
    for (const group of groups.values()) {
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      for (const v of group) {
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], position[v * 3 + k]);
          hi[k] = Math.max(hi[k], position[v * 3 + k]);
        }
      }
      pieces.push({ material, position, normal, uv, indices: group, lo, hi });
    }
    copy.dispose();
  }
}

// --- bündeln ---------------------------------------------------------------
// **Ein Möbel ist alles, was sich berührt** — in der Grundfläche *und* in der
// Höhe. Der erste Versuch fragte nur nach dem Grundriss, und dann klebte der
// **Hängeschrank an der Wand** am Unterschrank darunter fest: ein „Möbel" von
// 2,50 m Höhe mit anderthalb Metern Luft in der Mitte. Ein Topf auf dem Herd
// steht dagegen nur Millimeter über ihm und gehört wirklich dazu — dieselbe
// Toleranz fängt beides richtig ein.
const near = (a, b) =>
  a.lo[0] - TOUCH <= b.hi[0] &&
  b.lo[0] - TOUCH <= a.hi[0] &&
  a.lo[2] - TOUCH <= b.hi[2] &&
  b.lo[2] - TOUCH <= a.hi[2] &&
  a.lo[1] - TOUCH <= b.hi[1] &&
  b.lo[1] - TOUCH <= a.hi[1];

const owner = pieces.map((_, i) => i);
const rootOf = (i) => {
  while (owner[i] !== i) {
    owner[i] = owner[owner[i]];
    i = owner[i];
  }
  return i;
};
for (let i = 0; i < pieces.length; i++) {
  for (let j = i + 1; j < pieces.length; j++) {
    if (!near(pieces[i], pieces[j])) continue;
    const a = rootOf(i);
    const b = rootOf(j);
    if (a !== b) owner[b] = a;
  }
}

const furniture = new Map();
for (let i = 0; i < pieces.length; i++) {
  const key = rootOf(i);
  let list = furniture.get(key);
  if (!list) furniture.set(key, (list = []));
  list.push(pieces[i]);
}

/** Jedes Möbel mit seinem Grundriss — sortiert, damit die Liste stabil ist. */
const items = [...furniture.values()]
  .map((group) => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    let triangles = 0;
    for (const piece of group) {
      triangles += piece.indices.length / 3;
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], piece.lo[k]);
        hi[k] = Math.max(hi[k], piece.hi[k]);
      }
    }
    return { group, lo, hi, triangles };
  })
  .sort((a, b) => a.lo[0] - b.lo[0] || a.lo[2] - b.lo[2]);

if (args.has('list')) {
  console.log(`${items.length} Möbel aus ${pieces.length} Stücken:\n`);
  items.forEach((item, i) => {
    const size = item.hi.map((v, k) => (v - item.lo[k]).toFixed(2));
    const at = item.lo.map((v, k) => ((v + item.hi[k]) / 2).toFixed(2));
    const tiles = `${Math.ceil(item.hi[0] - item.lo[0])}×${Math.ceil(item.hi[2] - item.lo[2])}`;
    console.log(
      `#${String(i).padStart(2)} ${(NAMES[i] ?? '?').padEnd(15)} ${size.join(' × ')} m  ` +
        `${tiles} Kacheln  Mitte (${at.join(', ')})  ${String(item.triangles).padStart(5)} Dreiecke`,
    );
  });
  process.exit(0);
}

console.log(`${items.length} Möbel aus ${pieces.length} Stücken.`);

// --- Texturen verkleinern --------------------------------------------------
for (const texture of root.listTextures()) {
  const image = texture.getImage();
  if (!image) continue;
  const before = image.byteLength;
  const shrunk = await sharp(Buffer.from(image))
    .resize(TEXTURE, TEXTURE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  texture.setImage(new Uint8Array(shrunk)).setMimeType('image/webp');
  console.log(
    `  ${texture.getName() || 'Textur'}: ${(before / 1024).toFixed(0)} → ${(shrunk.length / 1024).toFixed(0)} KB`,
  );
}

// --- schreiben -------------------------------------------------------------
// Aus der gelesenen Datei bleibt nur, was gebraucht wird: die Materialien und
// ihre Texturen. Szene, Knoten und Netze werden neu gebaut — je Möbel eines,
// mit dem Ursprung auf dem Boden in seiner Mitte.
for (const scene of root.listScenes()) scene.dispose();
for (const node of root.listNodes()) node.dispose();
for (const mesh of root.listMeshes()) mesh.dispose();

const buffer = root.listBuffers()[0] ?? doc.createBuffer();
const scene = doc.createScene('kitchen');
root.setDefaultScene(scene);

items.forEach((item, index) => {
  const name = NAMES[index] ?? `piece-${String(index).padStart(2, '0')}`;
  const mesh = doc.createMesh(name);
  const node = doc.createNode(name).setMesh(mesh);
  scene.addChild(node);
  // Der Ursprung: waagerecht in der Mitte, senkrecht auf dem Boden.
  const origin = [(item.lo[0] + item.hi[0]) / 2, item.lo[1], (item.lo[2] + item.hi[2]) / 2];

  const byMaterial = new Map();
  for (const piece of item.group) {
    let list = byMaterial.get(piece.material);
    if (!list) byMaterial.set(piece.material, (list = []));
    list.push(piece);
  }

  for (const [material, group] of byMaterial) {
    const position = [];
    const normal = [];
    const uv = [];
    const indices = [];
    const remap = new Map();
    for (const piece of group) {
      for (const v of piece.indices) {
        const key = `${piece.position === group[0].position ? 'a' : 'b'}|${v}`;
        let at = remap.get(key);
        if (at === undefined) {
          at = position.length / 3;
          remap.set(key, at);
          position.push(
            piece.position[v * 3] - origin[0],
            piece.position[v * 3 + 1] - origin[1],
            piece.position[v * 3 + 2] - origin[2],
          );
          if (piece.normal) {
            normal.push(piece.normal[v * 3], piece.normal[v * 3 + 1], piece.normal[v * 3 + 2]);
          }
          if (piece.uv) uv.push(piece.uv[v * 2], piece.uv[v * 2 + 1]);
        }
        indices.push(at);
      }
    }
    const prim = doc.createPrimitive().setMaterial(material);
    prim.setAttribute(
      'POSITION',
      doc.createAccessor().setType('VEC3').setArray(new Float32Array(position)).setBuffer(buffer),
    );
    if (normal.length) {
      prim.setAttribute(
        'NORMAL',
        doc.createAccessor().setType('VEC3').setArray(new Float32Array(normal)).setBuffer(buffer),
      );
    }
    if (uv.length) {
      prim.setAttribute(
        'TEXCOORD_0',
        doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer),
      );
    }
    prim.setIndices(
      doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(indices)).setBuffer(buffer),
    );
    mesh.addPrimitive(prim);
  }
});

// **Aufräumen, sonst bleibt die Quelle im Puffer liegen.** Gelesen wurde eine
// Datei mit Tangenten und vier großen Netzen; geschrieben werden zwölf kleine
// ohne Tangenten. Was niemand mehr braucht, hängt trotzdem noch am Puffer —
// `prune` wirft es weg, `weld` und `dedup` fassen zusammen, was doppelt liegt.
// Ohne diese drei Zeilen war die Datei doppelt so groß wie ihr Inhalt.
await doc.transform(weld(), dedup(), prune());

await mkdir(path.dirname(out), { recursive: true });
const bytes = await io.writeBinary(doc);
await writeFile(out, bytes);
console.log(`\n${path.relative(process.cwd(), out)}: ${(bytes.length / 1024).toFixed(0)} KB`);
