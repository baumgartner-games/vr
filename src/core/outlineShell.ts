import * as THREE from 'three';
import { shellNodeMaterial } from './nodeLooks';

/**
 * **Ein Saum um ein Ding** — eine farbige Kante, gezeichnet als umgestülpte
 * Hülle. Bis Oktober 2026 bekam im Comic-Look **jedes** Ding so einen
 * schwarzen Saum; der Comic ist heraus (_„Comic Look kann komplett raus"_),
 * geblieben sind die gezielten Säume: das gelbe Ziel und das türkise Teil in
 * Haunting (`ShipExperience.ts`), und `highlight.ts` borgt sich die
 * geglätteten Normalen.
 *
 * Der Weg ist der, den Comic-Spiele seit zwanzig Jahren benutzen: Das Ding
 * wird ein zweites Mal gezeichnet, ein wenig aufgeblasen und mit den
 * **Rückseiten** nach vorn (`side: BackSide`). Überall dort, wo das Ding selbst
 * davorsteht, ist die Hülle verdeckt; sichtbar bleibt der Saum, der ringsum
 * darüber hinausragt. Kein Zwischenpuffer — den gibt eine WebXR-Sitzung nicht
 * her —, beide Augen sehen dasselbe, ein Zeichenaufruf mehr je Ding.
 *
 * Drei Feinheiten stecken darin:
 *
 * 1. **Gleich dick, egal wie weit weg.** Aufgeblasen wird im Blickraum um
 *    einen Betrag, der mit der Entfernung wächst; nach oben gedeckelt auf
 *    einen festen Betrag und auf einen **Anteil des Dings selbst**, sonst
 *    verschluckt der Saum, was klein ist.
 * 2. **Geglättete Normalen** (`bgvrOutlineNormal`): Ein Quader hat an jeder
 *    Ecke drei Normalen; entlang dieser aufgeblasen, fahren die Flächen
 *    auseinander und die Kontur bekommt an jeder Ecke eine Lücke.
 * 3. **Der Saum ist unsichtbar für alles andere.** Kein Schatten, kein
 *    Zeigestrahl (`raycast` tut nichts), und eine Marke in `userData`, an der
 *    Bündel, Geister und Abschriften ihn erkennen (`isOutline`).
 */

/** Die Marke, an der ein Saum als Saum zu erkennen ist. */
const MARK = 'bgvrOutline';
/** Die Normale, entlang derer aufgeblasen wird. */
const ATTRIBUTE = 'bgvrOutlineNormal';

/**
 * Ab wie vielen Ecken die Mittelung übersprungen wird.
 *
 * Sie ist eine Schleife über alle Ecken mit einer Karte darin; für das
 * Alpen-Gelände mit seinen 90 000 Dreiecken wäre das ein spürbarer Ruckler,
 * und ausgerechnet dort fällt eine Lücke an einer Ecke niemandem auf. Über der
 * Grenze wird die vorhandene Normale weiterbenutzt.
 */
const SMOOTH_LIMIT = 24000;

/** Auf welches Raster Positionen fallen, damit zwei Ecken „dieselbe" sind. */
const WELD = 1e4;

export interface OutlineLook {
  /** Breite des Saums als Anteil der halben Bildhöhe. */
  width: number;
  /** Wie breit er in Metern höchstens werden darf. */
  maxGrow: number;
  /** Die Farbe, als Zahl wie überall in diesem Projekt. */
  color: number;
}

/**
 * Welchen Anteil seiner eigenen Größe ein Ding höchstens an Saum bekommt.
 *
 * Ein Achtel des Radius ist die Grenze, unterhalb derer eine Kontur eine
 * Kontur bleibt statt eine Füllung zu werden.
 */
const SIZE_SHARE = 0.12;

const vertexShader = /* glsl */ `
uniform float thickness;
uniform float maxGrow;

attribute vec3 bgvrOutlineNormal;

#include <common>
#include <skinning_pars_vertex>

void main() {
  vec3 objectNormal = bgvrOutlineNormal;
  vec3 transformed = vec3( position );

  // Gehäutete Netze (die Handschuhe) hängen an ihrem Skelett: Ohne diese drei
  // Bausteine stünde ihr Saum in der Grundhaltung im Raum herum.
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>

  vec4 mvPosition = vec4( transformed, 1.0 );
  vec3 growNormal = objectNormal;

  #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
    growNormal = mat3( instanceMatrix ) * growNormal;
  #endif

  mvPosition = modelViewMatrix * mvPosition;
  growNormal = normalize( normalMatrix * growNormal );

  // Der Betrag, der auf dem Bildschirm eine gleich breite Kante ergibt: Er
  // wächst mit der Entfernung, weil alles andere mit ihr schrumpft. Der Deckel
  // darüber ist die einzige Zutat, ohne die eine ferne Kiste zum Klecks wird.
  float distance = max( - mvPosition.z, 0.02 );
  float grow = min( thickness * distance / max( projectionMatrix[1][1], 0.0001 ), maxGrow );
  mvPosition.xyz += growNormal * grow;

  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 diffuse;

#include <common>

void main() {
  gl_FragColor = vec4( diffuse, 1.0 );
  // Dieselben zwei Zeilen wie in jedem Material von three.js: Ohne sie wäre
  // dieselbe Kante im Bild schwarz und im Spiegel grau. Die Funktionen
  // dahinter legt three.js jedem Fragment-Shader ohnehin vorweg — sie hier
  // noch einmal einzubinden war ein „redefinition"-Fehler und ein schwarzes
  // Bild.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Wie weit dieses eine Ding aufgeblasen werden darf.
 *
 * Der feste Deckel gilt für alles, der zweite für das, was klein ist: ein
 * Anteil seines eigenen Radius, in **Weltmaß** — dieselbe Geometrie steckt
 * einmal in einer Kiste und einmal in einem Haus, wenn jemand sie skaliert hat.
 */
function maxGrowFor(mesh: THREE.Mesh, look: OutlineLook): number {
  const geometry = mesh.geometry;
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  const radius = geometry.boundingSphere?.radius ?? 0;
  if (!(radius > 0)) return look.maxGrow;
  mesh.updateWorldMatrix(true, false);
  const scale = mesh.getWorldScale(_scale);
  const largest = Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z));
  return Math.min(look.maxGrow, radius * largest * SIZE_SHARE);
}

const _scale = new THREE.Vector3();

/** Das Material des Saums. Jeder bekommt ein eigenes — siehe `addOutline`. */
function outlineMaterial(mesh: THREE.Mesh, look: OutlineLook): THREE.ShaderMaterial {
  // Für den neuen Renderer dieselbe Hülle als Knotenmaterial (`core/nodeLooks.ts`).
  const node = shellNodeMaterial(
    look.width,
    maxGrowFor(mesh, look),
    new THREE.Color(look.color),
    mesh.getWorldScale(_scale).x,
  );
  if (node) return node;
  return new THREE.ShaderMaterial({
    uniforms: {
      thickness: { value: look.width },
      maxGrow: { value: maxGrowFor(mesh, look) },
      diffuse: { value: new THREE.Color(look.color) },
    },
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
  });
}

/**
 * Legt die gemittelte Normale neben die Geometrie, einmal in ihrem Leben.
 *
 * Gibt zurück, ob es danach eine gibt — ohne Positionen und Normalen (Linien,
 * Punkte, selbstgebaute Sonderfälle) gibt es keinen Saum.
 */
export function ensureOutlineNormals(geometry: THREE.BufferGeometry): boolean {
  if (geometry.getAttribute(ATTRIBUTE)) return true;
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  if (!position || !normal || normal.count !== position.count) return false;

  if (position.count > SMOOTH_LIMIT) {
    // Zu groß zum Mitteln: Die vorhandene Normale tut es auch, ihre Lücken
    // fallen an einem Berghang ohnehin niemandem auf.
    geometry.setAttribute(ATTRIBUTE, normal);
    return true;
  }

  const sums = new Map<string, [number, number, number]>();
  const keys: string[] = new Array<string>(position.count);
  for (let i = 0; i < position.count; i++) {
    const key = `${Math.round(position.getX(i) * WELD)},${Math.round(
      position.getY(i) * WELD,
    )},${Math.round(position.getZ(i) * WELD)}`;
    keys[i] = key;
    const sum = sums.get(key);
    if (sum) {
      sum[0] += normal.getX(i);
      sum[1] += normal.getY(i);
      sum[2] += normal.getZ(i);
    } else {
      sums.set(key, [normal.getX(i), normal.getY(i), normal.getZ(i)]);
    }
  }

  const smoothed = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const sum = sums.get(keys[i]!)!;
    const length = Math.hypot(sum[0], sum[1], sum[2]);
    // Zwei genau entgegengesetzte Flächen heben sich auf (ein Blatt Papier,
    // eine Wand ohne Dicke) — dort bleibt die eigene Normale stehen.
    if (length < 1e-6) {
      smoothed[i * 3] = normal.getX(i);
      smoothed[i * 3 + 1] = normal.getY(i);
      smoothed[i * 3 + 2] = normal.getZ(i);
    } else {
      smoothed[i * 3] = sum[0] / length;
      smoothed[i * 3 + 1] = sum[1] / length;
      smoothed[i * 3 + 2] = sum[2] / length;
    }
  }
  geometry.setAttribute(ATTRIBUTE, new THREE.BufferAttribute(smoothed, 3));
  return true;
}

/** Ob dieses Ding selbst ein Saum ist. */
export function isOutline(object: THREE.Object3D): boolean {
  return object.userData[MARK] === true;
}

/**
 * Nimmt jeden Saum unterhalb von `root` ab — **ohne** sein Material wegzuwerfen.
 *
 * Für alles, was Objekte **kopiert**: `Object3D.clone()` nimmt den Saum mit,
 * und die Kopie verliert dabei genau das, was ihn harmlos macht — sein leeres
 * `raycast` ist eine Eigenschaft der Instanz und keine der Klasse. Wer kopiert,
 * räumt ihn also weg; der Durchlauf über die Szene hängt der Kopie beim
 * nächsten Mal ihren eigenen an, mit ihrem eigenen Material.
 *
 * Und genau deshalb wird hier **nichts entsorgt**: Ein Klon teilt sein Material
 * mit dem Original (`Object3D.clone()` schreibt nur den Zeiger ab), und das
 * wegzuwerfen hieße, dem Original beim Kopieren die Kante abzuschalten. Ein
 * Material, das nie gezeichnet wurde, kostet auf der Grafikkarte ohnehin
 * nichts.
 */
export function stripOutlines(root: THREE.Object3D): number {
  const found: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (isOutline(object)) found.push(object);
  });
  for (const outline of found) outline.removeFromParent();
  return found.length;
}

/** Der Saum eines Meshes, wenn er einen hat. */
export function outlineOf(mesh: THREE.Mesh): THREE.Mesh | null {
  return (mesh.children.find(isOutline) as THREE.Mesh | undefined) ?? null;
}

/**
 * Hängt einem Mesh seinen Saum an, oder stellt einen bestehenden neu ein.
 *
 * Der Saum ist ein **Kind** des Meshes und keine eigene Liste: So folgt er ihm
 * durch jede Bewegung, jedes Portal und jede Welt, ohne dass irgendwer Matrizen
 * abschreiben muss — und er verschwindet mit ihm, wenn die Welt abgeräumt wird.
 */
export function addOutline(mesh: THREE.Mesh, look: OutlineLook): THREE.Mesh | null {
  const existing = outlineOf(mesh);
  if (existing) {
    const material = existing.material as THREE.ShaderMaterial;
    material.uniforms['thickness']!.value = look.width;
    material.uniforms['maxGrow']!.value = maxGrowFor(mesh, look);
    (material.uniforms['diffuse']!.value as THREE.Color).set(look.color);
    return existing;
  }
  if (!ensureOutlineNormals(mesh.geometry)) return null;

  // Ein eigenes Material je Saum, und das ist Absicht: Eine Welt räumt beim
  // Verlassen ihren Baum ab und entsorgt dabei jedes Material, das sie findet
  // (`disposeTree`). Ein geteiltes wäre danach für alle anderen kaputt.
  const material = outlineMaterial(mesh, look);
  const skinned = mesh as THREE.SkinnedMesh;
  const instanced = mesh as THREE.InstancedMesh;

  let outline: THREE.Mesh;
  if (skinned.isSkinnedMesh) {
    // Ein gehäutetes Netz braucht dasselbe Skelett, sonst steht sein Saum in
    // der Grundhaltung im Raum — bei den Handschuhen wäre das eine schwarze
    // Hand neben der eigenen.
    const shell = new THREE.SkinnedMesh(mesh.geometry, material);
    shell.bind(skinned.skeleton, skinned.bindMatrix);
    outline = shell;
  } else if (instanced.isInstancedMesh) {
    // Dieselben Matrizen, nicht abgeschriebene: Ein Wald aus 400 Bäumen soll
    // 400 Säume haben und nicht einen am Ursprung.
    const shell = new THREE.InstancedMesh(mesh.geometry, material, instanced.count);
    shell.instanceMatrix = instanced.instanceMatrix;
    outline = shell;
  } else {
    outline = new THREE.Mesh(mesh.geometry, material);
  }
  return attach(mesh, outline);
}

function attach(mesh: THREE.Mesh, outline: THREE.Mesh): THREE.Mesh {
  outline.name = 'outline';
  outline.userData[MARK] = true;
  outline.castShadow = false;
  outline.receiveShadow = false;
  outline.frustumCulled = mesh.frustumCulled;
  outline.layers.mask = mesh.layers.mask;
  // Für jeden Strahl im Spiel ist er Luft: Sonst greift die Hand nach dem Saum
  // statt nach der Kiste, und was sie dann in der Hand hat, ist ein Kind der
  // Kiste und keine.
  outline.raycast = () => {};
  mesh.add(outline);
  return outline;
}

/** Nimmt den Saum wieder ab. Gibt zurück, ob einer da war. */
export function removeOutline(mesh: THREE.Mesh): boolean {
  const outline = outlineOf(mesh);
  if (!outline) return false;
  mesh.remove(outline);
  (outline.material as THREE.Material).dispose();
  return true;
}
