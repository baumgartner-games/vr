import * as THREE from 'three';

/**
 * **Der Stil der Köche an einer Stelle** — Farben, Materialien und die beiden
 * Muster, die sich nicht malen lassen, ohne dass ein Bild daraus wird.
 *
 * Vorher hatte jede Datei ihr eigenes `solid(...)`: `avatarLook.ts` mit
 * `roughness 0.75`, `headgear.ts` mit `0.7`, `AvatarBody.ts` mit `0.6` und
 * `metalness 0.15`. Drei Zahlen für denselben Stoff, und in der Brille sah man
 * es: Eine Jacke glänzte, die Mütze daneben nicht. Der Stoff einer Figur ist
 * **eine** Sache, also steht er hier.
 *
 * Das Vorbild sind die Köche aus Overcooked, und deren Oberflächen sind
 * durchweg **matt und leicht wächsern**: kein Metall, keine Spiegelung, aber
 * auch kein staubiges Nichts. Stoff ist rauer als Haut, Haut rauer als ein
 * Knopf. Die Kanten sind gerundet, die Formen weich — den Rest macht das Licht
 * der Welt, nicht ein Glanzpunkt am Material.
 *
 * **Keine Kontur.** Overcooked ist nicht cel-schattiert: Die Figuren haben
 * keinen schwarzen Strich um sich, sie leben von Hell-Dunkel großer Flächen —
 * weiße Schürze, dunkle Hose, helle Mütze. Wer hier eine Outline einzieht,
 * bekommt Zeichentrick statt Knetfigur.
 */

/**
 * **Die Palette.** Was an einer Kochfigur keine Rolle spielt — Leinen, Haut,
 * Hose, Knöpfe —, hat hier seine Farbe und nirgends sonst. Die Farbe der Rolle
 * (Anzugfarbe) kommt von außen dazu und steht deshalb nicht in dieser Liste.
 */
export const CHEF = {
  /** Mütze und Jacke: gebrochenes Weiß, nie reines. Reinweiß brennt im Licht aus. */
  linen: 0xf4f1e8,
  /** Der Schatten darin — Nähte, Falten, die Unterseite der Mützenlappen. */
  linenShade: 0xd9d2c2,
  /** Die Schürze: eine Spur heller als die Jacke, damit sie sich abhebt. */
  apron: 0xfbf9f3,
  /** Das Band unter der Mütze — bei Overcooked fast schwarz, nicht grau. */
  band: 0x24262c,
  /** Knöpfe auf der Schürze: dasselbe Schwarz, nur kleiner. */
  button: 0x24262c,
  /** Die Hose: das helle Feld des Karos. */
  trouserLight: 0xe8e4da,
  /** Und das dunkle. Kochkaro ist schwarz-weiß, nicht grau-weiß. */
  trouserDark: 0x33353c,
  /** Der Mund, wo einer zu sehen ist. */
  mouth: 0x7c3b34,
} as const;

/**
 * **Stoff** — Jacke, Schürze, Mütze, Hose. Matt und ohne Metall: Ein Hemd
 * glänzt nicht, und `metalness` über 0 macht aus jedem Weiß ein Grau, sobald
 * die Umgebung dunkel ist.
 */
export function cloth(color: number, roughness = 0.88): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

/**
 * **Haut** — Gesicht, Ohren, Nase, Hände. Etwas glatter als Stoff, damit das
 * Licht ihr eine Rundung gibt; das ist der halbe Unterschied zwischen einer
 * Knetfigur und einem Pappaufsteller.
 */
export function skin(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0 });
}

/** **Haar und Bart** — matter als Haut, damit der Bart nicht wie Lack aussieht. */
export function hair(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 });
}

/** **Hartes Kleinzeug** — Knöpfe, Schuhsohlen, Brillengestell. */
export function trim(color: number, roughness = 0.5): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 });
}

/**
 * **Das Kochkaro als Bild** (`CanvasTexture`) — die schwarz-weiße Hose, ohne
 * die kein Koch ein Koch ist.
 *
 * Gemalt und nicht aus Geometrie gebaut: Ein Karo aus Quadern wären sechzig
 * Netze für ein Muster, das aus 16 m Höhe vier Pixel breit ist. Die Textur
 * wird **einmal** gebaut und von allen Figuren geteilt — sie hängt an keiner
 * Figur und an keiner Farbe.
 */
let checkerTexture: THREE.Texture | null = null;

export function chefChecker(): THREE.Texture {
  if (checkerTexture) return checkerTexture;
  const size = 64;
  const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
  if (canvas) {
    canvas.width = size;
    canvas.height = size;
  }
  // **Eine Zeichenfläche ist noch kein Kontext.** In Jest gibt es ein
  // `document`, und `getContext('2d')` liefert trotzdem nichts — die Figur
  // wird dort gebaut, um ihre Geometrie zu prüfen, und darf daran nicht
  // zerbrechen. Dasselbe gilt für einen Browser, dem das Zeichnen im privaten
  // Modus verboten ist.
  const ctx = canvas?.getContext('2d') ?? null;
  if (!canvas || !ctx) {
    // Dann eben eine leere Textur: Das Material bleibt weiß, die Hose ist
    // einfarbig, und niemand sieht es, weil in diesem Fall ohnehin niemand
    // hinsieht.
    checkerTexture = new THREE.Texture();
    return checkerTexture;
  }
  const light = `#${CHEF.trouserLight.toString(16).padStart(6, '0')}`;
  const dark = `#${CHEF.trouserDark.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = dark;
  const half = size / 2;
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Ein Karo mit harten Kanten flimmert aus der Ferne; die Mipmaps glätten es
  // zu Grau, und Grau ist aus 16 m Höhe genau richtig.
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  checkerTexture = texture;
  return texture;
}

/** Die karierte Hose als Material — geteilt, wie die Textur darunter. */
let trouserMaterial: THREE.MeshStandardMaterial | null = null;

export function trousers(): THREE.MeshStandardMaterial {
  if (trouserMaterial) return trouserMaterial;
  const texture = chefChecker();
  // Acht Rauten im Umfang und sechs in der Höhe — so grob wie an den
  // Vorbildern. Ein feineres Karo wird aus 16 m Höhe zu Grau, ein gröberes
  // sieht von Nahem aus wie ein Schachbrett und nicht wie Stoff.
  texture.repeat.set(9, 4);
  trouserMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: texture,
    roughness: 0.9,
    metalness: 0,
  });
  return trouserMaterial;
}

/**
 * **Die abgerundete Kiste** — die Grundform, aus der bei diesen Figuren fast
 * alles besteht.
 *
 * Der Kopf eines Overcooked-Kochs ist **keine Kugel**. Er ist ein Würfel mit
 * sehr weichen Kanten: vorn eine flache Fläche für das Gesicht, seitlich zwei
 * für die Ohren, oben eine, auf der die Mütze aufliegt. Man sieht es am
 * deutlichsten daran, dass eine der Figuren im Spiel buchstäblich einen
 * Pappkarton als Kopf trägt und trotzdem nicht aus der Reihe fällt. Eine Kugel
 * liest sich als Ball; eine gefaste Kiste liest sich als Kopf.
 *
 * Gebaut wird sie aus einer Kugel, deren Punkte nach außen auf den Würfel
 * gezogen werden: `p / max(|x|,|y|,|z|)` ist die Projektion eines
 * Einheitsvektors auf den Einheitswürfel, und dazwischen wird gemischt. Das
 * ist billiger als ein eigener Geometriegenerator und hat denselben
 * Nebeneffekt, den three.js' `RoundedBoxGeometry` auch hätte — nur dass die
 * Datei dafür nicht aus `examples/` geladen werden muss.
 *
 * @param boxiness 0 ist eine Kugel, 1 ein Würfel. Gemessen sind an den
 *   Vorbildern Eckenradien um 22 % der Kantenlänge, und das ist hier ungefähr
 *   `0.55` — viel weicher, als „Würfel" klingt.
 */
export function squarish(radius: number, boxiness: number, segments = 26): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.75));
  const position = geometry.attributes.position!;
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).normalize();
    const largest = Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z));
    const stretch = (1 - boxiness + boxiness / largest) * radius;
    position.setXYZ(i, point.x * stretch, point.y * stretch, point.z * stretch);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Wo eine Richtung die Oberfläche von `squarish` trifft, als Faktor auf den
 * Halbmesser. Alles, was auf dem Kopf sitzt — Augen, Nase, Ohren, Bart —,
 * rechnet damit; sonst schwebten dieselben Teile, die auf der Kugel auflagen,
 * an der gefasten Kiste in der Luft oder steckten darin.
 */
export function squarishReach(direction: THREE.Vector3, boxiness: number): number {
  const largest = Math.max(Math.abs(direction.x), Math.abs(direction.y), Math.abs(direction.z));
  return largest > 0 ? 1 - boxiness + boxiness / largest : 1;
}
