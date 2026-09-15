/**
 * **Macht aus dem gekauften Koch ein Spielmodell** — einmal von Hand laufen
 * lassen, das Ergebnis liegt in `public/models/chef.glb` und ist eingecheckt.
 *
 *     node tools/chef-model.mjs --in=<entpackter Sketchfab-Ordner> [--tris=9000]
 *
 * Die Quelle ist „Little Chef (Overcooked like)" von marcelosants (CC-BY-4.0,
 * siehe `public/models/CREDITS.md`). Sie ist ein **Standbild-Sculpt** und kein
 * Spielmodell: 550 000 Dreiecke, allein die Mütze 352 000, kein Skelett, keine
 * Animation — und die Teile liegen nicht in Knoten, sondern über fünf
 * Materialien verteilt. So wie sie ist, kann das Spiel damit nichts anfangen.
 *
 * Drei Dinge passieren hier, und jedes hat einen Grund:
 *
 * 1. **Zerlegen.** Der Körper dieser Figur wird von drei Posen getrieben —
 *    Kopf und zwei Hände (`core/AvatarBody.ts`). Das Modell muss also in
 *    genau diese Teile zerfallen: Kopf (samt Mütze, Nase, Augen, Ohren),
 *    Rumpf, linke Hand, rechte Hand. Zerlegt wird **nach Material und Ort**
 *    und nicht nach zusammenhängenden Flächen: Die Mütze allein besteht aus
 *    zehntausenden losen Fetzen, und eine Einteilung, die daran hängt, hängt
 *    an einem Zufall. Ein Dreieck gehört dorthin, wo sein Schwerpunkt liegt.
 * 2. **Dezimieren.** Aus 550 000 Dreiecken werden gut 9 000 — je Teil
 *    getrennt, damit die Mütze nicht das Budget der Hände frisst. Bei dieser
 *    Figur kostet das nichts: Sie besteht aus glatten Kugeln, und eine Kugel
 *    aus 800 Dreiecken sieht aus 16 m Höhe aus wie eine aus 100 000.
 * 3. **Hinstellen.** Sketchfab liefert sie 47 cm groß, auf dem Kopf stehend
 *    (Z nach oben, aus dem FBX) und um ihren Schwerpunkt zentriert. Heraus
 *    kommt eine Figur in **Spielmaßen**: Y oben, −Z vorn, Fußpunkt auf y = 0,
 *    und die Teile in ihrem eigenen Ursprung, damit `AvatarBody` sie an die
 *    Posen hängen kann.
 *
 * Warum überhaupt ein Werkzeug und nicht einmal von Hand in Blender: Damit
 * beim nächsten Modell niemand raten muss, was hier getan wurde. Die
 * Rohdateien liegen **nicht** im Repository — 32 MB für zwei Modelle, von
 * denen nach diesem Lauf 400 KB übrig bleiben.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { transformPrimitive, simplifyPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const args = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  }),
);
const source = args.get('in');
const out = path.resolve(args.get('out') ?? 'public/models/chef.glb');
if (!source || !existsSync(source)) {
  console.error('Gebraucht wird --in=<Ordner mit scene.gltf>');
  process.exit(1);
}

/**
 * **Wie hoch die Figur am Ende ist**, vom Boden bis zum Scheitel der Mütze,
 * in Metern.
 *
 * Diese Zahl ist die Antwort auf die Frage, an der das ganze Projekt bisher
 * hing. Der Koch ist eine **Chibi-Figur**: Kopf und Mütze machen gut die
 * Hälfte seiner Höhe aus. Skaliert man ihn so, dass seine Augen auf der
 * Augenhöhe eines Menschen liegen, wird er 2,84 m hoch und sein Kopf allein
 * einen Meter breit — neben einem Tresen von einem Meter sieht das aus wie
 * ein Riese im Puppenhaus. Das wurde gebaut, nebeneinandergestellt und
 * angesehen (`npm run avatar`), und es war eindeutig.
 *
 * Also andersherum: **Die Figur bekommt die Größe, die zur Küche passt**, und
 * ihre Augen liegen dann eben bei 0,9 m statt bei 1,6 m. In der Brille steht
 * die Kamera damit über dem Kopf der eigenen Figur; von oben — und von dort
 * wird gespielt — sieht man davon nichts. Aus derselben Entscheidung folgt,
 * dass die Figur **immer gleich hoch** ist: Sie duckt sich nicht mehr mit dem
 * Spieler, denn ihre Höhe kommt nicht mehr von ihm.
 */
const TARGET_HEIGHT = 1.6;

/** Wie viele Dreiecke die ganze Figur am Ende hat. */
const BUDGET = Number(args.get('tris') ?? 9000);

/**
 * Unter wie vielen Dreiecken ein Stück gar nicht erst vereinfacht wird. Der
 * Gewinn wäre ein Rundungsfehler, der Schaden dagegen sichtbar: Genau daran
 * verlor die Figur beim ersten Lauf ihre Augen.
 */
const FLOOR = 600;

/**
 * **Wie viele Dreiecke jedes Stück bekommt** — als Anteil am Budget, und
 * ausdrücklich je Material statt anteilig nach Quellgröße.
 *
 * Anteilig war der erste Versuch, und er ging schief: Die Mütze stellt 82 %
 * der Dreiecke des Kopfes, bekam damit 82 % seines Budgets, und für den Kopf
 * selbst blieben 582 — so grob, dass seine Facetten durch die flachen
 * Augenscheiben stießen und aus den Augen zwei dünne Sicheln wurden. Wie fein
 * ein Stück **sein muss**, hat nichts damit zu tun, wie fein es **geliefert
 * wurde**: Die Mütze ist eine glatte Haube, das Gesicht ist das, worauf man
 * schaut.
 */
const SHARE = {
  'hat/material': 0.26, // die Mütze
  'head/Skin': 0.2, // Kopf und Ohren — das Gesicht trägt die Augen
  'head/Nose': 0.03,
  'head/Eye-Center': 0.01,
  'body/Clothe': 0.22,
  'handLeft/Skin': 0.09,
  'handRight/Skin': 0.09,
};

/** Wie weit Augen und Nase aus dem Kopf herausgerückt werden, in Metern. */
const DECAL_LIFT = 0.004;

/** Die gemessene Lücke zwischen Händen und Kopf, in Maßen der Quelle. */
const SKIN_SPLIT = -0.1;

/**
 * **Wohin ein Dreieck gehört**, nach Material und Ort seines Schwerpunkts.
 *
 * Die Grenzen sind in den Maßen der **Quelle** angegeben (sie ist 0,47
 * Einheiten hoch) und liegen in den Lücken zwischen den Teilen, nicht mitten
 * durch eines hindurch — deshalb genügt der Schwerpunkt, und deshalb gibt es
 * keine ausgefransten Kanten.
 *
 * `Skin` ist das einzige Material, das an zwei Stellen vorkommt: Kopf samt
 * Ohren oben, die beiden Hände unten. **Wo genau die Grenze liegt, ist
 * gemessen und nicht geschätzt**: Ein Histogramm der Skin-Dreiecke über die
 * Höhe zeigt die Hände bei −0,18 bis −0,11, den Kopf ab −0,08 und dazwischen
 * nichts. Die Grenze liegt in dieser Lücke.
 *
 * Der erste Versuch setzte sie auf −0,06, also **in den Kopf hinein**, und
 * kostete zwei Durchgänge: Die untersten Kopfreihen wurden nach ihrem
 * Vorzeichen in x den Händen zugeschlagen. Der Kopf hatte danach ein
 * abgeschnittenes Kinn und schwebte über dem Rumpf, und die „Hände" waren
 * einen halben Meter breit, weil in ihnen ein halber Kopfring steckte.
 */
function partOf(material, y, x) {
  // **Die Mütze ist ein eigenes Teil.** Sie hängt im Spiel zwar am Kopf, aber
  // wer eine andere Kopfbedeckung wählt (`core/headgear.ts`), soll sie
  // abnehmen können — und das geht nur, wenn sie ein eigenes Netz ist.
  if (material === 'material') return 'hat';
  if (material === 'Clothe') return 'body';
  if (material === 'Nose' || material === 'Eye-Center') return 'head';
  // bleibt `Skin`
  if (y > SKIN_SPLIT) return 'head';
  return x < 0 ? 'handLeft' : 'handRight';
}

/**
 * **Glatte Normalen aus den Dreiecken selbst** — flächengewichtet gemittelt.
 *
 * Kein `computeVertexNormals` von three: Das hier läuft ohne Browser, und die
 * Rechnung ist eine Schleife. Gewichtet wird mit der **Fläche** (das Kreuz­
 * produkt ist doppelt so groß wie das Dreieck), damit ein Schnipsel neben
 * einer großen Fläche die Normale nicht kippt.
 */
function smoothNormals(prim) {
  const position = prim.getAttribute('POSITION').getArray();
  const indices = prim.getIndices().getArray();
  const normal = new Float32Array(position.length);
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t] * 3;
    const b = indices[t + 1] * 3;
    const c = indices[t + 2] * 3;
    const ux = position[b] - position[a];
    const uy = position[b + 1] - position[a + 1];
    const uz = position[b + 2] - position[a + 2];
    const vx = position[c] - position[a];
    const vy = position[c + 1] - position[a + 1];
    const vz = position[c + 2] - position[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const at of [a, b, c]) {
      normal[at] += nx;
      normal[at + 1] += ny;
      normal[at + 2] += nz;
    }
  }
  for (let i = 0; i < normal.length; i += 3) {
    const length = Math.hypot(normal[i], normal[i + 1], normal[i + 2]) || 1;
    normal[i] /= length;
    normal[i + 1] /= length;
    normal[i + 2] /= length;
  }
  prim.getAttribute('NORMAL')?.setArray(normal);
}

const io = new NodeIO();
const doc = await io.read(path.join(source, 'scene.gltf'));
const root = doc.getRoot();

/** Die Weltmatrix eines Knotens — die Quelle steckt drei Ebenen tief im FBX. */
function worldMatrixOf(node) {
  let matrix = node.getWorldMatrix?.();
  if (matrix) return matrix;
  return node.getMatrix();
}

// --- einsammeln ------------------------------------------------------------
// Jedes Dreieck wird einmal angefasst: Welt-Koordinaten ausrechnen, Teil
// bestimmen, in den passenden Eimer legen. Gesammelt wird roh in Arrays und
// erst danach zu Geometrie gemacht — das ist eine Schleife statt fünf.
const buckets = new Map();
for (const key of ['hat', 'head', 'body', 'handLeft', 'handRight']) {
  buckets.set(key, { position: [], normal: [], colour: null, indexOf: new Map(), index: [] });
}

let sourceTriangles = 0;
const colours = new Map();

for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const world = worldMatrixOf(node);
  for (const prim of mesh.listPrimitives()) {
    const material = prim.getMaterial()?.getName() ?? '-';
    if (!colours.has(material)) {
      colours.set(material, prim.getMaterial()?.getBaseColorFactor() ?? [1, 1, 1, 1]);
    }
    // Eine Kopie, damit die Quelle unangetastet bleibt und die Matrix genau
    // einmal angewandt wird.
    const copy = prim.clone();
    transformPrimitive(copy, world);
    const position = copy.getAttribute('POSITION').getArray();
    const normal = copy.getAttribute('NORMAL')?.getArray();
    const indices = copy.getIndices().getArray();
    sourceTriangles += indices.length / 3;
    for (let t = 0; t < indices.length; t += 3) {
      const a = indices[t];
      const b = indices[t + 1];
      const c = indices[t + 2];
      const cy = (position[a * 3 + 1] + position[b * 3 + 1] + position[c * 3 + 1]) / 3;
      const cx = (position[a * 3] + position[b * 3] + position[c * 3]) / 3;
      const bucket = buckets.get(partOf(material, cy, cx));
      for (const v of [a, b, c]) {
        // Gleiche Ecke, gleiches Material, gleiche Normale → ein Punkt. Das
        // ist die einzige Verschweißung, die hier stattfindet, und sie
        // halbiert die Punktzahl, bevor der Vereinfacher überhaupt anfängt.
        const key = `${material}|${position[v * 3].toFixed(5)}|${position[v * 3 + 1].toFixed(5)}|${position[v * 3 + 2].toFixed(5)}`;
        let at = bucket.indexOf.get(key);
        if (at === undefined) {
          at = bucket.position.length / 3;
          bucket.indexOf.set(key, at);
          bucket.position.push(position[v * 3], position[v * 3 + 1], position[v * 3 + 2]);
          if (normal) bucket.normal.push(normal[v * 3], normal[v * 3 + 1], normal[v * 3 + 2]);
          (bucket.colour ??= []).push(material);
        }
        bucket.index.push(at);
      }
    }
    copy.dispose();
  }
}

// --- hinstellen ------------------------------------------------------------
// Die Quelle steht auf dem Kopf und ist 47 cm groß. Erst wird gemessen, dann
// gedreht und skaliert — und zwar **alle Teile mit derselben Zahl**, sonst
// sitzt die Mütze nicht mehr auf dem Kopf.
let lo = [Infinity, Infinity, Infinity];
let hi = [-Infinity, -Infinity, -Infinity];
for (const bucket of buckets.values()) {
  for (let i = 0; i < bucket.position.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], bucket.position[i + k]);
      hi[k] = Math.max(hi[k], bucket.position[i + k]);
    }
  }
}

/**
 * **Wo die Augen sitzen**, in den Maßen der Quelle — gemessen und nicht
 * geraten: Es ist die Mitte der Augen-Geometrie (`Eye-Center`), und die ist
 * das einzige Stück am Modell, dessen Ort genau diese Frage beantwortet.
 */
let eyeSum = 0;
let eyeCount = 0;
{
  const head = buckets.get('head');
  for (let i = 0; i < head.colour.length; i++) {
    if (head.colour[i] !== 'Eye-Center') continue;
    eyeSum += head.position[i * 3 + 1];
    eyeCount++;
  }
}
const eyeY = eyeCount ? eyeSum / eyeCount : (lo[1] + hi[1]) / 2;

// Der Maßstab kommt aus der **Gesamthöhe**: Die Figur soll neben einen Tresen
// passen, und wo dabei ihre Augen landen, ergibt sich.
const scale = TARGET_HEIGHT / (hi[1] - lo[1]);

for (const bucket of buckets.values()) {
  for (let i = 0; i < bucket.position.length; i += 3) {
    const x = bucket.position[i];
    const y = bucket.position[i + 1];
    const z = bucket.position[i + 2];
    // Die Quelle schaut nach +z, das Spiel nach −z: einmal um die Y-Achse
    // gedreht, also x und z gespiegelt.
    bucket.position[i] = -x * scale;
    bucket.position[i + 1] = (y - lo[1]) * scale;
    bucket.position[i + 2] = -z * scale;
    if (!bucket.normal.length) continue;
    bucket.normal[i] = -bucket.normal[i];
    bucket.normal[i + 2] = -bucket.normal[i + 2];
  }
}

// --- Aufkleber anheben -----------------------------------------------------
// **Augen und Nase liegen auf dem Kopf auf**, und der Kopf wird gröber. Eine
// Facette, die dabei nach außen wandert, stößt durch die flache Augenscheibe
// und macht aus einem Auge einen Ring. Vier Millimeter nach außen, gemessen
// von der Kopfmitte, kosten nichts und sind das Ende dieser Sorte Fehler.
{
  const head = buckets.get('head');
  let cx = 0;
  let cy = 0;
  let cz = 0;
  let count = 0;
  for (let i = 0; i < head.colour.length; i++) {
    if (head.colour[i] !== 'Skin') continue;
    cx += head.position[i * 3];
    cy += head.position[i * 3 + 1];
    cz += head.position[i * 3 + 2];
    count++;
  }
  if (count) {
    cx /= count;
    cy /= count;
    cz /= count;
    for (let i = 0; i < head.colour.length; i++) {
      const material = head.colour[i];
      if (material !== 'Eye-Center' && material !== 'Nose') continue;
      const dx = head.position[i * 3] - cx;
      const dy = head.position[i * 3 + 1] - cy;
      const dz = head.position[i * 3 + 2] - cz;
      const length = Math.hypot(dx, dy, dz) || 1;
      head.position[i * 3] += (dx / length) * DECAL_LIFT;
      head.position[i * 3 + 1] += (dy / length) * DECAL_LIFT;
      head.position[i * 3 + 2] += (dz / length) * DECAL_LIFT;
    }
  }
}

// --- Ursprünge setzen ------------------------------------------------------
// **Jedes Teil bekommt den Ursprung, an dem das Spiel es anfasst.** Bis
// hierher trägt jedes seine absolute Position aus der Quelle; hängt man es
// dann an eine Pose, kommt der Versatz doppelt — der Kopf schwebte einen
// halben Meter über dem Körper, und genau so sah es aus.
//
// - **Kopf und Mütze** teilen sich einen Ursprung, und der liegt auf
//   **Augenhöhe**, waagerecht in der Kopfmitte: `AvatarBody` setzt die
//   Kopfgruppe dorthin, wo die Augen sein sollen, und schiebt sie um
//   `NECK_BACK` zurück, damit die Kugel hinter dem Blick sitzt.
// - **Der Rumpf** bekommt den Ursprung auf dem **Boden** unter seiner Mitte,
//   denn dorthin stellt ihn `AvatarBody`.
// - **Die Hände** bekommen ihn in ihre eigene Mitte, weil sie einer Pose
//   folgen und sich um sich selbst drehen.
{
  const centreOf = (bucket, atFloor) => {
    let lo = [Infinity, Infinity, Infinity];
    let hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < bucket.position.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], bucket.position[i + k]);
        hi[k] = Math.max(hi[k], bucket.position[i + k]);
      }
    }
    return [
      (lo[0] + hi[0]) / 2,
      atFloor ? 0 : (lo[1] + hi[1]) / 2,
      (lo[2] + hi[2]) / 2,
    ];
  };

  const shift = (bucket, by) => {
    for (let i = 0; i < bucket.position.length; i += 3) {
      bucket.position[i] -= by[0];
      bucket.position[i + 1] -= by[1];
      bucket.position[i + 2] -= by[2];
    }
  };

  const head = buckets.get('head');
  const headCentre = centreOf(head, false);
  // In der Höhe nicht die Mitte, sondern die Augen: Sie sind der Punkt, den
  // eine Kopfpose meint.
  const headOrigin = [headCentre[0], (eyeY - lo[1]) * scale, headCentre[2]];
  shift(head, headOrigin);
  shift(buckets.get('hat'), headOrigin);
  shift(buckets.get('body'), centreOf(buckets.get('body'), true));
  for (const side of ['handLeft', 'handRight']) {
    shift(buckets.get(side), centreOf(buckets.get(side), false));
  }
}

// --- schreiben -------------------------------------------------------------
const output = new Document();
const buffer = output.createBuffer();
const scene = output.createScene('chef');
output.getRoot().setDefaultScene(scene);

/** Ein Material je Farbe der Quelle, mit ihren Werten. */
const materials = new Map();
for (const [name, colour] of colours) {
  materials.set(
    name,
    output
      .createMaterial(name)
      .setBaseColorFactor(colour)
      .setMetallicFactor(0)
      // Die Quelle hat pro Material eine eigene Rauheit um 0,8–0,99. Das ist
      // dieselbe Größenordnung wie der Stoff der Figuren aus `chefStyle.ts`,
      // also bleibt sie, wie sie ist.
      .setRoughnessFactor(0.85)
      .setDoubleSided(false),
  );
}

await MeshoptSimplifier.ready;
const report = [];

for (const [name, bucket] of buckets) {
  if (!bucket.index.length) continue;
  const node = output.createNode(name);
  const mesh = output.createMesh(name);
  node.setMesh(mesh);
  scene.addChild(node);

  // Je Material eine Primitive: Ein `MeshStandardMaterial` trägt genau eine
  // Grundfarbe, und diese Figur hat keine Texturen, aus denen mehr würde.
  const byMaterial = new Map();
  for (let t = 0; t < bucket.index.length; t += 3) {
    const material = bucket.colour[bucket.index[t]];
    let list = byMaterial.get(material);
    if (!list) byMaterial.set(material, (list = []));
    list.push(bucket.index[t], bucket.index[t + 1], bucket.index[t + 2]);
  }

  for (const [material, indices] of byMaterial) {
    // Nur die Punkte, die diese Primitive wirklich benutzt — sonst schleppt
    // jede die Punkte aller anderen mit.
    const remap = new Map();
    const position = [];
    const normal = [];
    const packed = new Uint32Array(indices.length);
    for (let i = 0; i < indices.length; i++) {
      const v = indices[i];
      let at = remap.get(v);
      if (at === undefined) {
        at = position.length / 3;
        remap.set(v, at);
        position.push(bucket.position[v * 3], bucket.position[v * 3 + 1], bucket.position[v * 3 + 2]);
        if (bucket.normal.length) {
          normal.push(bucket.normal[v * 3], bucket.normal[v * 3 + 1], bucket.normal[v * 3 + 2]);
        }
      }
      packed[i] = at;
    }

    const prim = output.createPrimitive().setMaterial(materials.get(material));
    prim.setAttribute(
      'POSITION',
      output.createAccessor().setType('VEC3').setArray(new Float32Array(position)).setBuffer(buffer),
    );
    if (normal.length) {
      prim.setAttribute(
        'NORMAL',
        output.createAccessor().setType('VEC3').setArray(new Float32Array(normal)).setBuffer(buffer),
      );
    }
    prim.setIndices(output.createAccessor().setType('SCALAR').setArray(packed).setBuffer(buffer));

    const wanted = Math.max(24, Math.round(BUDGET * (SHARE[`${name}/${material}`] ?? 0.05)));
    // **Kleines Zeug wird nicht angefasst.** Die Augen sind zwei Scheiben aus
    // 192 Dreiecken; der Vereinfacher machte daraus 64 und damit zwei dünne
    // Sicheln — aus einem Gesicht wurde ein Strichmännchen. Was ohnehin unter
    // dem Budget liegt, spart nichts und kann nur kaputtgehen.
    if (indices.length / 3 > Math.max(wanted, FLOOR)) {
      simplifyPrimitive(prim, {
        simplifier: MeshoptSimplifier,
        ratio: wanted / (indices.length / 3),
        // Ein Fehler von 1 % der Figurengröße — großzügig, weil hier glatte
        // Kugeln stehen und keine Kanten, an denen man es sähe.
        error: 0.01,
        lockBorder: false,
      });
    }
    // **Normalen neu rechnen.** Der Vereinfacher lässt die Normalen der Quelle
    // stehen, und die gehören zu einer Fläche, die es nicht mehr gibt: Auf dem
    // Bauch liefen danach Bänder, als wäre er aus Blech. Neu gemittelt sind
    // sie wieder glatt — und glatt ist bei dieser Figur der ganze Stil.
    smoothNormals(prim);
    mesh.addPrimitive(prim);
    report.push(
      `${name}/${material}: ${indices.length / 3} → ${prim.getIndices().getCount() / 3}`,
    );
  }
}

await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, await io.writeBinary(output));

let triangles = 0;
for (const mesh of output.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) triangles += prim.getIndices().getCount() / 3;
}
for (const line of report) console.log(' ', line);
const eyeHeight = (eyeY - lo[1]) * scale;
console.log(
  `\n${path.relative(process.cwd(), out)}: ${sourceTriangles.toLocaleString('de')} → ` +
    `${triangles.toLocaleString('de')} Dreiecke, Maßstab ${scale.toFixed(2)}×, ` +
    `Höhe ${TARGET_HEIGHT} m, Augen auf ${eyeHeight.toFixed(3)} m`,
);
console.log(`  → CHEF_EYE in src/core/chefModel.ts: ${eyeHeight.toFixed(3)}`);
