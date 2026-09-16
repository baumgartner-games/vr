import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KITCHEN_SCALE } from './kitchenFit';

/**
 * **Die Küchenmöbel als Modell** — derselbe Weg wie beim Koch
 * (`core/chefModel.ts`), und aus denselben Gründen.
 *
 * Die Quelle ist „Overcooked Kitchen Assets (Fan Art)" von Arun Kumar S,
 * CC-BY-4.0 (`public/models/CREDITS.md`), aufbereitet von
 * `tools/kitchen-model.mjs`: aus einer Schauraum-Szene mit vier Netzen werden
 * dreizehn einzeln platzierbare Möbel, jedes mit dem Ursprung **auf dem Boden
 * in seiner Mitte** — dorthin stellt das Spiel sie.
 *
 * Aus den dreizehn Knoten werden hier **vierzehn** Möbel: Die Spüle ist in der
 * Quelle vier Meter breit und wird beim Laden in Becken und Abtropfbrett
 * zerschnitten (`splitSink`). Die Datei selbst bleibt dabei unberührt — sie ist
 * fremde Arbeit, und was der Lader daran ändert, ändert er an seiner Kopie.
 *
 * Was der Katalog an Zahlen hergibt, steht in `core/kitchenFit.ts` und wird
 * hier nicht wiederholt — bis auf eine: Jedes Stück kommt **halbiert** heraus
 * (`KITCHEN_SCALE`). Die Quelle ist doppelt so groß, wie eine Küche neben
 * einem Koch von 1,60 m sein darf, und der Faktor sitzt hier statt in der
 * Datei, weil die fremde Arbeit ist und nicht angefasst wird.
 */

/** Wo die Datei liegt: unter uns, nie auf einem fremden Server. */
const KITCHEN_URL = `${import.meta.env.BASE_URL}models/kitchen.glb`;

let pending: Promise<THREE.Group | null> | null = null;

function template(): Promise<THREE.Group | null> {
  pending ??= new GLTFLoader()
    .loadAsync(KITCHEN_URL)
    .then((gltf) => {
      erasePrintedPlate(gltf.scene);
      splitSink(gltf.scene);
      return gltf.scene;
    })
    .catch((error: unknown) => {
      // Einmal sagen, nicht je Möbel: Wer offline baut, soll nicht dreizehn
      // gleiche Zeilen in der Konsole finden. Ohne Modell bleibt der
      // gebaute Baustein stehen (`worlds/grid/blocks.ts`).
      console.warn(`Küchenmodelle nicht geladen (${KITCHEN_URL}).`, error);
      return null;
    });
  return pending;
}

/**
 * **Der aufgedruckte Teller auf der Ausgabe — weg damit.**
 *
 * Die Ausgabe (`serve-counter`) hat oben eine flache Mulde, und in dieser Mulde
 * ist ein **weißer Teller mit einem Burger darauf** abgebildet. Vor der
 * Salatausgabe lag darum ein Salat auf einem fremden Burger, und die Küche
 * musste das bisher mit einer großen weißen Fläche zudecken
 * (`worlds/test/zones/kitchenIcon.ts`). Jetzt reicht dort ein Kreis, der nur
 * noch 70 % der Kachel breit ist — also muss der Aufdruck wirklich weg.
 *
 * **Und er ist kein Teilnetz.** Das ist die Überraschung an dieser Stelle und
 * der Grund, warum hier eine ganze Erklärung steht: Nachgesehen in
 * `public/models/kitchen.glb` ist `serve-counter` **ein einziges Netz mit einem
 * einzigen Material** (`Kitchen_Cabins`, 448 Ecken, 232 Dreiecke) — es gibt
 * nichts, was man nach Namen ausbauen oder unsichtbar schalten könnte. Der
 * Teller und der Burger sind ein **Bild im Atlas**, und die Mulde besteht aus
 * genau **zwei Dreiecken**, die dieses Bild zeigen.
 *
 * **Also wird umgeklebt statt ausgebaut.** Die vier Ecken dieser beiden
 * Dreiecke bekommen alle dieselbe Texturkoordinate, und zwar eine, die auf das
 * **blanke Holz** am Rand desselben Bildfelds zeigt. Danach ist die Mulde eine
 * einfarbige Holzfläche in genau dem Ton, den sie ringsum ohnehin hat — der
 * Teller ist weg, die Fläche ist noch da, und kein Loch schaut in den Schrank
 * hinein. Ein einziger Punkt statt eines Ausschnitts ist dabei Absicht: Ohne
 * Ableitung in der Fläche nimmt der Renderer die **schärfste** Mipmap, und
 * damit kann von den Nachbarfeldern des Atlas (rot darüber, grün darunter)
 * nichts hereinlaufen.
 *
 * Die Zahlen sind an der Datei abgelesen: Das Bildfeld liegt bei
 * u = 0,827…0,937 und v = 0,496…0,606, das Holz bei u = 0,8379 / v = 0,5059
 * (dort ist die Textur über 5 × 5 Texel praktisch einfarbig, #6f3a15). Das
 * Rechteck unten ist etwas weiter gefasst, damit es die Ecken sicher einschließt
 * — und es fasst trotzdem **nur** diese beiden Dreiecke: Geprüft wird über
 * **alle drei** Ecken eines Dreiecks, und kein anderes Dreieck dieses Möbels
 * liegt vollständig darin.
 *
 * **Einmal an der Vorlage** und nicht je Exemplar: Die Geometrie wird zwischen
 * allen Ausgaben geteilt (`kitchenModel`), und alle wollen dasselbe. Die
 * **Textur** wird dabei nicht angefasst — sie ist fremde Arbeit und gehört
 * dreizehn Möbeln gemeinsam.
 */
const PRINTED_PIECE = 'serve-counter';
const PRINTED_TILE = { u0: 0.82, u1: 0.94, v0: 0.49, v1: 0.61 };
const PRINTED_PATCH = { u: 0.8379, v: 0.5059 };

function erasePrintedPlate(source: THREE.Object3D): void {
  const piece = source.getObjectByName(PRINTED_PIECE);
  if (!piece) return;
  piece.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const uv = mesh.geometry.getAttribute('uv');
    const index = mesh.geometry.getIndex();
    if (!uv || !index) return;
    const shows = (corner: number): boolean => {
      const u = uv.getX(corner);
      const v = uv.getY(corner);
      return (
        u >= PRINTED_TILE.u0 && u <= PRINTED_TILE.u1 && v >= PRINTED_TILE.v0 && v <= PRINTED_TILE.v1
      );
    };
    for (let i = 0; i + 2 < index.count; i += 3) {
      const corners = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      if (!corners.every(shows)) continue;
      for (const corner of corners) uv.setXY(corner, PRINTED_PATCH.u, PRINTED_PATCH.v);
      uv.needsUpdate = true;
    }
  });
}

/**
 * **Die Spüle wird beim Laden in zwei Möbel zerschnitten** — das **Becken**
 * mit Wasser und Armatur und das **Abtropfbrett** daneben.
 *
 * **Warum überhaupt.** In der Küche sind das zwei Handgriffe an zwei Stellen:
 * Im Becken wird gespült, auf dem Brett sammeln sich die sauberen Teller. Ein
 * Möbel hat aber genau **eine** Station (`worlds/test/zones/kitchen.ts`,
 * `addStation`) — wer davorstünde, könnte immer nur eines von beidem tun. Die
 * Maße und die Begründung dazu stehen im Katalog (`core/kitchenFit.ts`, der
 * Block über `SINK_SUNK`); hier steht, **wie** geschnitten wird.
 *
 * **Es gibt nichts zum Auseinandernehmen.** Das ist die Überraschung an dieser
 * Stelle, dieselbe wie bei `erasePrintedPlate` darüber: Nachgesehen in
 * `public/models/kitchen.glb` ist `sink` **ein einziges Netz** mit einem
 * einzigen Material (`Kitchen_Cabins_Double`, 1350 Ecken, 910 Dreiecke) — kein
 * Teilnetz, das man nach Namen herausziehen könnte. Also wird die Geometrie
 * selbst geschnitten, einmal an der Vorlage und nicht je Exemplar.
 *
 * **Die Armatur findet sich über den Zusammenhang und nicht über eine Zahl.**
 * Verschweißt man die Ecken nach ihrer **Lage** (nicht nach ihrem Index — eine
 * UV-Naht zerschneidet sonst jedes Möbel an seinen Kanten, genau wie beim
 * Aufbereiten der Quelle, siehe `AGENTS.md`), zerfällt das Netz in **elf**
 * zusammenhängende Teile: der Korpus (440 Dreiecke, y = 0…1,0349), vier Teile
 * der Armatur (Bogen, Sockel und die beiden Griffe, zusammen y = 1,0124…2,2977)
 * und sechs kleine Teile der beiden Türgriffe vorn (y = 0,1413…0,5814).
 * `FAUCET_FLOOR` liegt mit 0,8 genau dazwischen — mit 0,21 Abstand nach unten
 * und 0,21 nach oben —, und damit ist „was gehört zur Armatur?" eine gemessene
 * Trennung und keine geratene Schwelle.
 *
 * **Und die Armatur stand falsch.** Nicht verdreht: Ihr Fuß sitzt bei
 * z = −0,90…−0,70, also an der **Rückseite** (die Schauseite dieser Möbel ist
 * +z — dort sitzen die Türgriffe, bis z = +1,061, während die Rückwand bei
 * z = −1,061 glatt durchläuft), und der Bogen greift nach vorn bis z = +0,047,
 * also über die Mitte der Mulde (z = −0,061). Das ist richtig so. Falsch war
 * **x**: Die Armatur steht bei x = ±0,35 um x = 0 — auf dem **Steg** zwischen
 * Becken (bis x = −0,1675) und Abtropfwanne (ab x = +0,2083). Der Strahl fiel
 * also auf die Kante zwischen beiden und nicht ins Becken. Sie wandert deshalb
 * um `FAUCET_SHIFT` = −0,9751 nach links — auf die Mitte des Beckenbodens
 * (x = −0,9751, gemessen) —, steht damit ganz auf der Beckenhälfte und gießt
 * dorthin, wo das Wasser ist.
 *
 * **Die Naht liegt bei x = 0** (`SINK_SEAM`) und ist ebenfalls gemessen: Die
 * beiden Mulden liegen spiegelbildlich bei ∓0,9751, der Steg zwischen ihren
 * Öffnungen (−0,1660…+0,1580) hat seine Mitte bei −0,0040 — zwei Millimeter
 * Quellmaß daneben. Geschnitten wird **durch die Dreiecke** und nicht nach
 * ihrem Schwerpunkt: Boden, Deckplatte und Rückwand sind je ein paar große
 * Dreiecke über die vollen vier Meter, und wer die einer Seite ganz zuschlüge,
 * ließe die andere ohne Boden dastehen.
 *
 * **Die Schnittfläche bleibt offen**, und die Möbel bekommen dafür ein eigenes,
 * **beidseitig** gezeichnetes Material. In der Küche stehen die beiden Hälften
 * nebeneinander und die Schnitte liegen aufeinander — da sieht man nichts. Im
 * Schauraum und im Baumodus können sie auseinanderstehen, und dann schaut man
 * auf einen offenen Schrank: mit `FrontSide` mitten hindurch ins Nichts, mit
 * `DoubleSide` auf seine Innenseiten, die dieselbe Holztextur tragen wie außen.
 * Ein Deckel darüber wäre die ehrlichere Lösung — nur ist der Querschnitt an
 * der Naht kein Rechteck, sondern ein Umriss mit Sockelrücksprung und
 * Türfälzen, und ein Deckel, der ihn nicht trifft, ist schlimmer als keiner.
 * Das Material wird dafür **kopiert** und nicht umgestellt:
 * `Kitchen_Cabins_Double` gehört auch dem Ausgaberegal und der Ausgabetheke.
 */
const SINK_PIECE = 'sink';
const SINK_HALVES = ['sink-basin', 'sink-drain'] as const;
const SINK_SEAM = 0;
const FAUCET_FLOOR = 0.8;
const FAUCET_SHIFT = -0.9751;

/** Zwei Kanten zum Nachmessen der Dreiecksfläche — einmal und nicht je Dreieck. */
const _edge = new THREE.Vector3();
const _span = new THREE.Vector3();

/** Eine Ecke eines Dreiecks mit allem, was an ihr hängt. */
interface Corner {
  readonly p: THREE.Vector3;
  readonly n: THREE.Vector3;
  readonly u: number;
  readonly v: number;
}

/**
 * **Welche Ecken zur Armatur gehören** — die Teile, die für sich hängen und
 * vollständig über `FAUCET_FLOOR` liegen.
 *
 * Zwei Durchgänge: erst die Ecken nach ihrer Lage verschweißen (die Datei führt
 * 1350 Ecken für 514 Punkte — jede UV- und Normalennaht verdoppelt sie), dann
 * die Dreiecke als Kanten in eine Union-Find schieben und je Teil den tiefsten
 * Punkt suchen.
 */
function faucetCorners(pos: THREE.BufferAttribute, index: THREE.BufferAttribute): Set<number> {
  const first = new Map<string, number>();
  const same = new Int32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    // Auf ein Zehntelmillimeter Quellmaß gerundet: Was in der Datei
    // derselbe Punkt ist, ist es auch bitgenau — die Rundung fängt nur ab,
    // dass eine Naht mit einem Rechenrest daneben läge.
    const key = `${pos.getX(i).toFixed(4)}|${pos.getY(i).toFixed(4)}|${pos.getZ(i).toFixed(4)}`;
    const seen = first.get(key);
    if (seen === undefined) first.set(key, i);
    same[i] = seen ?? i;
  }
  const parent = new Int32Array(pos.count);
  for (let i = 0; i < pos.count; i++) parent[i] = i;
  const root = (at: number): number => {
    let r = same[at]!;
    while (parent[r] !== r) {
      parent[r] = parent[parent[r]!]!;
      r = parent[r]!;
    }
    return r;
  };
  const join = (a: number, b: number): void => {
    const x = root(a);
    const y = root(b);
    if (x !== y) parent[x] = y;
  };
  for (let t = 0; t + 2 < index.count; t += 3) {
    join(index.getX(t), index.getX(t + 1));
    join(index.getX(t + 1), index.getX(t + 2));
  }
  const low = new Map<number, number>();
  for (let i = 0; i < pos.count; i++) {
    const r = root(i);
    low.set(r, Math.min(low.get(r) ?? Infinity, pos.getY(i)));
  }
  const high = new Set<number>();
  for (let i = 0; i < pos.count; i++) if ((low.get(root(i)) ?? 0) > FAUCET_FLOOR) high.add(i);
  return high;
}

/** Zwei Ecken gemischt — für den Punkt, an dem die Naht ein Dreieck teilt. */
function mixCorner(a: Corner, b: Corner, t: number): Corner {
  return {
    p: a.p.clone().lerp(b.p, t),
    n: a.n.clone().lerp(b.n, t).normalize(),
    u: a.u + (b.u - a.u) * t,
    v: a.v + (b.v - a.v) * t,
  };
}

/**
 * **Ein Dreieck an der Naht abschneiden** und behalten, was auf `side` liegt
 * (+1 ist x ≥ Naht).
 *
 * Sutherland–Hodgman auf drei Ecken: Was übrig bleibt, ist ein Dreieck oder ein
 * Viereck, und ein Viereck wird als Fächer aus zwei Dreiecken abgelegt.
 */
function clipCorner(tri: readonly Corner[], side: 1 | -1, out: Corner[]): void {
  const keeps = tri.map((corner) => (corner.p.x - SINK_SEAM) * side >= 0);
  const kept = keeps.filter(Boolean).length;
  if (kept === 0) return;
  if (kept === 3) {
    out.push(tri[0]!, tri[1]!, tri[2]!);
    return;
  }
  const poly: Corner[] = [];
  for (let i = 0; i < 3; i++) {
    const a = tri[i]!;
    const b = tri[(i + 1) % 3]!;
    if (keeps[i]) poly.push(a);
    if (keeps[i] !== keeps[(i + 1) % 3]) {
      poly.push(mixCorner(a, b, (SINK_SEAM - a.p.x) / (b.p.x - a.p.x)));
    }
  }
  for (let i = 2; i < poly.length; i++) {
    // **Flächenlose Dreiecke fallen weg.** Sie entstehen dort, wo ein Dreieck
    // die Naht nur **berührt** — eine Ecke liegt genau auf x = 0, die beiden
    // anderen daneben —, und dann fallen die beiden Schnittpunkte mit dieser
    // Ecke zusammen. An der Spüle sind das 37 Stück auf der rechten Hälfte:
    // Sie zeichnen nichts, kosten aber Speicher und stehen jedem im Weg, der
    // das Netz später einmal nachmisst.
    const a = poly[0]!;
    const b = poly[i - 1]!;
    const c = poly[i]!;
    if (_edge.subVectors(b.p, a.p).cross(_span.subVectors(c.p, a.p)).lengthSq() < 1e-16) continue;
    out.push(a, b, c);
  }
}

/**
 * **Eine Hälfte als eigenes Möbel** — mittig um ihren eigenen Ursprung, wie
 * jedes Stück aus `tools/kitchen-model.mjs`: auf dem Boden in seiner Mitte.
 *
 * Verschoben wird nur in **x**. In y steht das Möbel ohnehin auf 0, und in z
 * ändert der Schnitt nichts — beide Hälften sind so tief wie die ganze Spüle.
 */
function sinkHalf(name: string, corners: readonly Corner[], material: THREE.Material): THREE.Mesh {
  let min = Infinity;
  let max = -Infinity;
  for (const corner of corners) {
    min = Math.min(min, corner.p.x);
    max = Math.max(max, corner.p.x);
  }
  const middle = (min + max) / 2;
  const position = new Float32Array(corners.length * 3);
  const normal = new Float32Array(corners.length * 3);
  const uv = new Float32Array(corners.length * 2);
  corners.forEach((corner, i) => {
    position.set([corner.p.x - middle, corner.p.y, corner.p.z], i * 3);
    normal.set([corner.n.x, corner.n.y, corner.n.z], i * 3);
    uv.set([corner.u, corner.v], i * 2);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

function splitSink(source: THREE.Object3D): void {
  const node = source.getObjectByName(SINK_PIECE);
  if (!node) return;
  const meshes: THREE.Mesh[] = [];
  node.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) meshes.push(mesh);
  });
  const found = meshes[0];
  if (!found) return;
  const pos = found.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  const nor = found.geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  const uv = found.geometry.getAttribute('uv') as THREE.BufferAttribute | undefined;
  const index = found.geometry.getIndex();
  if (!pos || !nor || !uv || !index) return;

  const faucet = faucetCorners(pos, index);
  const corner = (i: number): Corner => ({
    p: new THREE.Vector3(
      pos.getX(i) + (faucet.has(i) ? FAUCET_SHIFT : 0),
      pos.getY(i),
      pos.getZ(i),
    ),
    n: new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)),
    u: uv.getX(i),
    v: uv.getY(i),
  });

  const halves: Corner[][] = [[], []];
  for (let t = 0; t + 2 < index.count; t += 3) {
    const tri = [corner(index.getX(t)), corner(index.getX(t + 1)), corner(index.getX(t + 2))];
    clipCorner(tri, -1, halves[0]!);
    clipCorner(tri, 1, halves[1]!);
  }

  const one = found.material;
  const cut = (Array.isArray(one) ? one[0]! : one).clone();
  cut.name = `${cut.name}-geschnitten`;
  cut.side = THREE.DoubleSide;
  SINK_HALVES.forEach((name, i) => {
    const half = halves[i]!;
    if (half.length) source.add(sinkHalf(name, half, cut));
  });
}

/**
 * **Das Material der losen Teile** — Topf, Pfanne, Teller, Messer.
 *
 * Die Quelle trennt ihre Netze nach Material (`tools/kitchen-model.mjs`), und
 * genau an dieser Naht liegt der Unterschied zwischen einem Möbel und dem, was
 * darauf steht: `Kitchen_Cabins` ist der Korpus, `Kitchen_Utensils` das Gerät
 * darauf. Ein Herd mit Topf kommt deshalb als **Gruppe aus zwei Netzen** aus
 * der Datei — und deshalb lässt sich der Topf herunternehmen, ohne dass
 * jemand ihn nachbauen müsste.
 */
const UTENSIL_MATERIAL = 'Kitchen_Utensils';

/** Ob dieses Netz zu dem gehört, was auf einem Möbel steht. */
function isUtensil(object: THREE.Object3D): boolean {
  const mesh = object as THREE.Mesh;
  if (!mesh.isMesh) return false;
  const material = mesh.material as THREE.Material | THREE.Material[];
  const one = Array.isArray(material) ? material[0] : material;
  return one?.name === UTENSIL_MATERIAL;
}

/**
 * **Ein Möbel aus dem Katalog**, als eigenes Exemplar.
 *
 * Geometrie und Materialien werden geteilt — anders als beim Koch trägt hier
 * niemand eine eigene Farbe, und dreizehn Tresen mit dreizehn Kopien
 * derselben Textur wären dreizehnmal derselbe Speicher.
 *
 * `null`, wenn die Datei fehlt oder der Name nicht darin steht. Beides ist
 * kein Fehlerfall: Der Aufrufer baut dann, was er vorher gebaut hat.
 */
export async function kitchenModel(name: string): Promise<THREE.Object3D | null> {
  const source = await template();
  const found = source?.getObjectByName(name);
  if (!found) return null;
  const copy = found.clone(true);
  // **Halbiert, und zwar hier.** Ein Aufrufer, der das selbst täte, wäre ein
  // Aufrufer, der es beim nächsten Möbel vergisst — und der Katalog daneben
  // nennt schon die halbierten Maße (`core/kitchenFit.ts`).
  copy.scale.setScalar(KITCHEN_SCALE);
  copy.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  return copy;
}

/**
 * **Was auf dem Möbel steht — abgenommen.**
 *
 * Gibt das Gerät als eigenes Ding zurück und lässt den leeren Korpus stehen.
 * `null`, wenn dieses Möbel nichts Loses trägt — der Normalfall, und kein
 * Fehler: Ein Unterschrank hat keinen Topf.
 *
 * **Der Ursprung wandert dabei mit nach unten.** In der Datei liegt der Topf
 * dort, wo er auf dem Herd steht — auf 1,10 m in Quellmaß, also einen halben
 * Meter über dem Fuß des Möbels, zu dem er gehörte. Wer ihn so in die Hand
 * nähme, hielte ihn eine Armlänge über der Faust. Er bekommt deshalb hier
 * denselben Ursprung wie jedes Möbel: **auf seinem Boden in seiner Mitte**
 * (`tools/kitchen-model.mjs`). Dafür hängt das Netz in einer Gruppe, die den
 * Versatz trägt und den halben Maßstab gleich mit — eine Geometrie wird nicht
 * verschoben, sie gehört der Vorlage und ist geteilt.
 *
 * **„Seine Mitte" ist dabei die Mitte der ganzen Hülle — mit Griff.** Bei der
 * Pfanne ist das nicht die Mitte der Mulde: Der Stiel zieht die Hülle 22,5 cm
 * zur Seite. Das bleibt hier absichtlich so, denn dieser Ursprung ist auch der
 * Punkt, an dem die Pfanne wieder auf den Herd gestellt wird — verschöbe man
 * ihn, stünde sie danach halb neben der Platte. Wer **in** die Pfanne legt,
 * rechnet den Versatz dazu: `core/kitchenFit.PAN_BOWL`, angewandt in
 * `worlds/test/zones/kitchenProps.FoodKit.topping`.
 */
export function takeUtensil(model: THREE.Object3D): THREE.Object3D | null {
  const parts: THREE.Mesh[] = [];
  model.traverse((object) => {
    if (isUtensil(object)) parts.push(object as THREE.Mesh);
  });
  const part = parts[0];
  if (!part) return null;

  if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
  const bounds = part.geometry.boundingBox!;
  const centre = bounds.getCenter(new THREE.Vector3());

  const loose = new THREE.Group();
  loose.name = `${part.name || 'utensil'}-lose`;
  // Der Maßstab des Möbels, aus dem es kommt — ein Topf, der beim Umhängen
  // auf die doppelte Größe zurückspränge, wäre ein Topf, in dem der Koch
  // stünde.
  loose.scale.setScalar(KITCHEN_SCALE);
  part.removeFromParent();
  part.position.set(-centre.x, -bounds.min.y, -centre.z);
  part.rotation.set(0, 0, 0);
  part.scale.set(1, 1, 1);
  part.castShadow = true;
  loose.add(part);
  return loose;
}

/**
 * **Wie hoch das Gerät ist**, in Metern — für das, was darunter noch Platz
 * hat, und für die Hand, die es hält.
 */
export function looseHeight(loose: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(loose);
  return Math.max(box.max.y - box.min.y, 0.01);
}
