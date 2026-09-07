import * as THREE from 'three';

/**
 * **Was in die Shader der Welt eingebaut wird** — die Farbstufen des
 * Comic-Stils.
 *
 * ## Farbstufen statt Verlauf
 *
 * Der Comic-Stil braucht zwei Dinge: eine schwarze Kontur um jedes Ding
 * (`outlineShell.ts`) — und dieses hier: Licht, das in **Stufen** auf einer
 * Fläche liegt statt in einem Verlauf. Gerechnet wird es dort, wo three.js
 * sein Licht zusammengezählt hat (`lights_fragment_end`) — und zwar nicht auf
 * der fertigen Farbe, sondern auf dem Licht **ohne** sie: `directDiffuse` ist
 * Beleuchtung mal Grundfarbe, und wer das rundet, gibt einer dunklen Kiste
 * eine einzige Stufe und einer weißen fünf. Geteilt durch die Grundfarbe
 * bleibt die Beleuchtung übrig, die auf jedem Ding dieselbe ist; gerundet wird
 * die, und danach wird wieder multipliziert.
 *
 * Das Glanzlicht wird dabei gedämpft: Ein weiches Highlight quer über eine
 * Fläche ist genau das, was ein gezeichnetes Bild nicht hat.
 *
 * ## Was hier einmal stand
 *
 * Neben den Stufen saßen hier die **prozeduralen Texturen**: ein Rauschen im
 * Fragment-Shader, das jeder Oberfläche Körnung, Farbunruhe und eine leichte
 * Unebenheit gab, gerechnet aus der Weltposition statt aus einer Bilddatei.
 * Sie sind heraus — samt dem Schalter im Menü, der sie anbot. Übrig bleibt
 * eine Datei, die genau eine Sache tut, und das ist kein Verlust: Ein
 * `onBeforeCompile` pro Material war der Grund, warum beides überhaupt
 * zusammenwohnte.
 */

/** Woran ein bereits umgebautes Material zu erkennen ist. */
const MARK = 'bgvrLook';
/** Wo das ursprüngliche `onBeforeCompile` liegt, solange der Umbau steht. */
const KEPT = 'bgvrLookKept';

/**
 * Die Farbstufen: gerundetes Licht statt Verlauf, gedämpftes Glanzlicht.
 *
 * `BANDS` wird beim Einbauen durch die Stufenzahl ersetzt — eine Zahl im
 * Quelltext und keine Uniform, weil davon der Programmschlüssel abhängt und
 * eine Uniform ihn nicht ändert.
 */
export const TOON_MAIN = /* glsl */ `
{
  // Die Beleuchtung ohne die Grundfarbe: Sonst hinge die Stufe daran, wie hell
  // ein Ding gestrichen ist, und eine dunkle Kiste hätte gar keine.
  vec3 bgvrTint = max( diffuseColor.rgb, vec3( 0.03 ) );
  vec3 bgvrLit = ( reflectedLight.directDiffuse + reflectedLight.indirectDiffuse ) / bgvrTint;
  float bgvrLevel = dot( bgvrLit, vec3( 0.3333 ) );
  if ( bgvrLevel > 0.0001 ) {
    // Die unterste Stufe ist die Null, und gerundet fällt alles Schwache
    // hinein: Im Portallabor, wo das Licht von zwei Deckenlampen kommt, war
    // damit die halbe Halle **stockschwarz** — Dominos, Wände, alles ohne
    // Zeichnung. Der Boden darunter lässt eine dunkle Fläche dunkel bleiben,
    // ohne sie auszulöschen; ganz unbeleuchtet bleibt trotzdem unbeleuchtet.
    float bgvrStep = max( floor( bgvrLevel * BANDS + 0.5 ) / BANDS, bgvrLevel * 0.6 );
    float bgvrScale = bgvrStep / bgvrLevel;
    reflectedLight.directDiffuse *= bgvrScale;
    reflectedLight.indirectDiffuse *= bgvrScale;
  }
  // Ein weiches Glanzlicht quer über eine Fläche ist genau das, was ein
  // gezeichnetes Bild nicht hat.
  reflectedLight.directSpecular *= 0.3;
  reflectedLight.indirectSpecular *= 0.3;
}
`;

/**
 * Was an einem Material eingebaut ist: die **Stufenzahl**, 0 heißt „nichts".
 *
 * Eine Zahl und kein Schalter, denn sie steht im Quelltext des Shaders — also
 * gehört sie in den Schlüssel, an dem die Fassungen auseinandergehalten
 * werden.
 */
export type MaterialLook = number;

export const PLAIN_LOOK: MaterialLook = 0;

/** Der Schlüssel, an dem three.js zwei Fassungen auseinanderhält. */
export function lookKey(look: MaterialLook): string {
  return `${Math.max(0, Math.round(look))}`;
}

/**
 * Baut eine Fassung in einen Shader ein, den three.js gerade übersetzen will.
 *
 * Exportiert, weil der Test sie gegen den **echten** Shader von three.js
 * laufen lässt: Der Umbau hängt an einer `#include`-Zeile, die three.js
 * gehört, und eine umbenannte fiele sonst erst in der Brille auf.
 */
export function injectLook(
  shader: THREE.WebGLProgramParametersWithUniforms,
  look: MaterialLook,
): void {
  if (!(look > 0)) return;
  const bands = Math.max(1, Math.round(look)).toFixed(1);
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <lights_fragment_end>',
    `#include <lights_fragment_end>\n${TOON_MAIN.replace(/BANDS/g, bands)}`,
  );
}

/**
 * Eine Fassung pro Schlüssel, und immer dieselbe Funktion.
 *
 * three.js benutzt `onBeforeCompile.toString()` als Programmschlüssel, wenn
 * das Material keinen eigenen mitbringt — und der Text zweier hier gebauter
 * Pfeilfunktionen ist Zeichen für Zeichen derselbe, egal welche Stufenzahl
 * darin steckt. Deshalb bekommt jedes umgebaute Material zusätzlich seinen
 * eigenen `customProgramCacheKey`; ohne ihn bekämen drei und fünf Stufen
 * denselben übersetzten Shader.
 */
const compilers = new Map<string, (shader: THREE.WebGLProgramParametersWithUniforms) => void>();

function compilerFor(
  look: MaterialLook,
): (shader: THREE.WebGLProgramParametersWithUniforms) => void {
  const key = lookKey(look);
  let compile = compilers.get(key);
  if (!compile) {
    compile = (shader) => injectLook(shader, look);
    compilers.set(key, compile);
  }
  return compile;
}

/**
 * Ob dieses Material einen Umbau verträgt.
 *
 * Nur beleuchtete Materialien: Ein `MeshBasicMaterial` hat keine
 * Lichtrechnung, und genau daraus sind sämtliche Menüs, Schilder und
 * Beschriftungen gebaut — ein gestufter Text wäre ein kaputter Text.
 * Durchsichtiges bleibt ebenfalls draußen: Glas, Portalflächen und Zielhilfen
 * sind glatt gemeint.
 */
export function supportsLook(material: THREE.Material): boolean {
  const lit = material as THREE.MeshStandardMaterial;
  if (!lit.isMeshStandardMaterial) return false;
  if (material.transparent) return false;
  return material.userData['bgvrNoLook'] !== true;
}

/** Welche Fassung gerade eingebaut ist. */
export function lookOf(material: THREE.Material): MaterialLook {
  return (material.userData[MARK] as MaterialLook | undefined) ?? PLAIN_LOOK;
}

/**
 * Legt eine Fassung an — und gibt zurück, ob sich dadurch etwas geändert hat.
 *
 * Ein Aufruf mit derselben Fassung wie bisher tut nichts: Der Durchlauf über
 * die Szene kommt jede Sekunde wieder, und jedes Mal `needsUpdate` zu setzen
 * hieße, jedes Mal jeden Shader neu zu übersetzen.
 */
export function applyLook(material: THREE.Material, look: MaterialLook): boolean {
  if (!supportsLook(material)) return false;
  const key = lookKey(look);
  if (lookKey(lookOf(material)) === key) return false;
  if (!(look > 0)) return clearLook(material);

  // Ein eigenes `onBeforeCompile` hat hier zwar niemand, aber es zu verlieren
  // wäre ein Fehler, den man erst drei Welten später sieht. Gebunden gelegt,
  // damit es sein Material auch dann noch kennt, wenn es aus `userData`
  // zurückkommt.
  if (
    material.userData[MARK] === undefined &&
    Object.prototype.hasOwnProperty.call(material, 'onBeforeCompile')
  ) {
    material.userData[KEPT] = material.onBeforeCompile.bind(material);
  }
  material.userData[MARK] = look;
  material.onBeforeCompile = compilerFor(look);
  material.customProgramCacheKey = () => `bgvr:${key}`;
  material.needsUpdate = true;
  return true;
}

/** Nimmt den Umbau wieder heraus — Zeile für Zeile der Weg zurück. */
export function clearLook(material: THREE.Material): boolean {
  if (material.userData[MARK] === undefined) return false;
  const kept = material.userData[KEPT] as THREE.Material['onBeforeCompile'] | undefined;
  if (kept) material.onBeforeCompile = kept;
  else delete (material as Partial<THREE.Material>).onBeforeCompile;
  delete (material as Partial<THREE.Material>).customProgramCacheKey;
  delete material.userData[KEPT];
  delete material.userData[MARK];
  material.needsUpdate = true;
  return true;
}
