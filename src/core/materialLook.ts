import * as THREE from 'three';

/**
 * **Was in die Shader der Welt eingebaut wird** — die Körnung und die
 * Farbstufen.
 *
 * Zwei Dinge, eine Datei, und das hat einen Grund: Ein Material hat genau ein
 * `onBeforeCompile`. Zwei Umbauten, die sich gegenseitig überschreiben, wären
 * ein Fehler, den man erst sieht, wenn beide Schalter zugleich anstehen — also
 * gibt es einen Umbau, der beides kann, und einen Schlüssel dazu, an dem
 * three.js die Fassungen auseinanderhält (siehe `applyLook`).
 *
 * ## Texturen ohne Texturen
 *
 * Dieses Projekt lädt keine Bilddateien: Jede Welt ist aus Quadern, Kugeln und
 * einer Handvoll Farben gebaut, und das ist der Grund, warum sie in einer
 * Sekunde dasteht und in jedem Browser gleich aussieht. Der Preis dafür ist zu
 * sehen: Ein Quader mit `MeshStandardMaterial` und `roughness: 0.8` ist überall
 * *exakt* gleich hell, und exakt gleich hell gibt es in der Wirklichkeit nicht.
 * Genau das lässt eine Wand wie eine Fläche aussehen und nicht wie eine Wand.
 *
 * Statt jetzt doch Bilddateien nachzuliefern — Ladezeit, Lizenzen, Kacheln, die
 * man an großen Flächen zählen kann — wird die Struktur **gerechnet**: ein
 * Rauschen im Fragment-Shader, das an drei Stellen zugreift.
 *
 * 1. **Farbe** — ein Prozent oder sieben heller und dunkler, in Flecken von
 *    einem halben Meter. Das ist die Unruhe, die eine große Fläche braucht,
 *    damit das Auge ihr glaubt.
 * 2. **Rauheit** — dieselbe Unruhe noch einmal, feiner, auf den Glanz gelegt.
 *    Sie ist der eigentliche Trick: Ein Glanzlicht, das über eine Fläche
 *    *wandert* und dabei flackert, sagt „Struktur" viel deutlicher als jede
 *    Einfärbung.
 * 3. **Normale** — aus derselben Zahl über die Bildschirm-Ableitungen ein
 *    leichter Buckel (dieselbe Rechnung, die three.js für `bumpMap` benutzt,
 *    nur mit gerechneter statt gelesener Höhe).
 *
 * Alles hängt an der **Weltposition**, nicht an UV-Koordinaten. Das ist hier
 * keine Feinheit, sondern die Bedingung: Die Quader dieser Welten haben ihre
 * UVs von `BoxGeometry`, also 0…1 pro Fläche — eine Kachel darauf wäre auf
 * einer Kiste briefmarkengroß und auf dem Boden einen halben Kilometer breit.
 * Weltkoordinaten haben dieses Problem nicht: Die Körnung ist auf jedem Ding
 * gleich groß, egal wie groß das Ding ist, und sie wandert nicht mit, wenn ein
 * Objekt gedreht wird — sie hängt an der Welt, wie Staub auf einem Tisch.
 *
 * Und sie **verschwindet mit der Entfernung**, in zwei Stufen. Ein Rauschen mit
 * zehn Zentimeter Wellenlänge, das dreißig Meter weit weg noch gezeichnet wird,
 * ist kein Detail mehr, sondern Flimmern — nirgends so unangenehm wie in einer
 * Brille, in der jeder Kopfdreher es neu auswürfelt.
 */

/**
 * ## Farbstufen statt Verlauf
 *
 * Der Comic-Stil braucht zwei Dinge, und das zweite ist dieses hier: Licht,
 * das in **Stufen** auf einer Fläche liegt statt in einem Verlauf. Gerechnet
 * wird es dort, wo three.js sein Licht zusammengezählt hat
 * (`lights_fragment_end`) — und zwar nicht auf der fertigen Farbe, sondern auf
 * dem Licht **ohne** sie: `directDiffuse` ist Beleuchtung mal Grundfarbe, und
 * wer das rundet, gibt einer dunklen Kiste eine einzige Stufe und einer weißen
 * fünf. Geteilt durch die Grundfarbe bleibt die Beleuchtung übrig, die auf
 * jedem Ding dieselbe ist; gerundet wird die, und danach wird wieder
 * multipliziert.
 *
 * Das Glanzlicht wird dabei gedämpft: Ein weiches Highlight quer über eine
 * Fläche ist genau das, was ein gezeichnetes Bild nicht hat.
 */

/** Woran ein bereits umgebautes Material zu erkennen ist. */
const MARK = 'bgvrLook';
/** Wo das ursprüngliche `onBeforeCompile` liegt, solange der Umbau steht. */
const KEPT = 'bgvrLookKept';

/** Die Weltposition, die der Fragment-Shader braucht. */
export const DETAIL_VERTEX_PARS = /* glsl */ `
varying vec3 vBgvrWorld;
`;

/**
 * Gerechnet wird nach `project_vertex`: Da ist `transformed` fertig — durch
 * Morph-Targets, Skinning und Verschiebung hindurch —, und die Instanzmatrix
 * ist die einzige Verwandlung, die three.js sich für später aufhebt.
 */
export const DETAIL_VERTEX_MAIN = /* glsl */ `
#ifdef USE_INSTANCING
  vBgvrWorld = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
#else
  vBgvrWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
#endif
`;

/**
 * Wertrauschen: acht Ecken eines Würfels, dazwischen weich verblendet. Der
 * billigste Weg zu etwas, das nicht nach Gitter aussieht — und ohne Textur,
 * ohne Uniform, ohne irgendetwas, das geladen werden müsste.
 */
export const DETAIL_FRAGMENT_PARS = /* glsl */ `
varying vec3 vBgvrWorld;

// Das Rauschen wird schräg zur Welt abgetastet. Ohne diese Drehung liegt sein
// Würfelgitter parallel zu jeder Wand und jedem Boden — die sind hier alle
// achsenparallel gebaut —, und aus der Körnung wird ein Karomuster.
const mat3 BGVR_TURN = mat3( 0.8, 0.6, 0.0, -0.48, 0.64, 0.6, 0.36, -0.48, 0.8 );

float bgvrHash( vec3 p ) {
  p = fract( p * 0.3183099 + vec3( 0.71, 0.113, 0.419 ) );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}

float bgvrNoise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix(
      mix( bgvrHash( i + vec3( 0.0, 0.0, 0.0 ) ), bgvrHash( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ),
      mix( bgvrHash( i + vec3( 0.0, 1.0, 0.0 ) ), bgvrHash( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ),
      f.y
    ),
    mix(
      mix( bgvrHash( i + vec3( 0.0, 0.0, 1.0 ) ), bgvrHash( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ),
      mix( bgvrHash( i + vec3( 0.0, 1.0, 1.0 ) ), bgvrHash( i + vec3( 1.0, 1.0, 1.0 ) ), f.x ),
      f.y
    ),
    f.z
  );
}

// Dieselbe Rechnung wie in three.js' <bumpmap_pars_fragment>, nur dass die
// Höhe nicht aus einer Textur kommt: aus zwei Ableitungen quer über den
// Bildschirm wird die Neigung, die die Normale kippt.
vec3 bgvrPerturb( vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float face ) {
  vec3 sigmaX = dFdx( surfPos );
  vec3 sigmaY = dFdy( surfPos );
  vec3 r1 = cross( sigmaY, surfNorm );
  vec3 r2 = cross( surfNorm, sigmaX );
  float det = dot( sigmaX, r1 ) * face;
  if ( det == 0.0 ) return surfNorm;
  vec3 grad = sign( det ) * ( dHdxy.x * r1 + dHdxy.y * r2 );
  return normalize( abs( det ) * surfNorm - grad );
}
`;

/**
 * Die Flecken auf der Farbe — und die beiden Zahlen, mit denen alles Weitere
 * rechnet. Steht hinter `map_fragment`, also nach der Textur, falls es doch
 * einmal eine gibt (der Boden hat sein Raster).
 */
export const DETAIL_COLOR_MAIN = /* glsl */ `
float bgvrDist = distance( vBgvrWorld, cameraPosition );
// Nah: die feine Körnung. Fern: nur noch die großen Flecken. Ganz fern: nichts,
// sonst flimmert der Horizont.
float bgvrNear = 1.0 - smoothstep( 4.0, 16.0, bgvrDist );
float bgvrFar = 1.0 - smoothstep( 25.0, 90.0, bgvrDist );
vec3 bgvrPos = BGVR_TURN * vBgvrWorld;
float bgvrPatch = mix( 0.5, bgvrNoise( bgvrPos * 2.5 ), bgvrFar );
float bgvrGrain =
  bgvrPatch * 0.6 + mix( 0.5, bgvrNoise( bgvrPos * 11.0 + 19.7 ), bgvrNear ) * 0.4;
diffuseColor.rgb *= 0.94 + 0.12 * bgvrPatch;
`;

/** Der Glanz, der über die Fläche wandert. */
export const DETAIL_ROUGHNESS_MAIN = /* glsl */ `
roughnessFactor = clamp( roughnessFactor * ( 0.88 + 0.24 * bgvrGrain ), 0.045, 1.0 );
`;

/** Und zuletzt der Buckel, der nur aus der Nähe einer ist. */
export const DETAIL_NORMAL_MAIN = /* glsl */ `
// Mit der Rauheit skaliert, und das ist der wichtigste Faktor hier: Auf Sand
// ist die Unebenheit die halbe Miete, auf einer polierten Wand macht dieselbe
// Zahl aus dem Glanzlicht ein Funkeln, das aussieht wie zerknittertes
// Aluminium. Was glatt gemeint ist, bleibt glatt.
vec2 bgvrSlope =
  vec2( dFdx( bgvrGrain ), dFdy( bgvrGrain ) ) * ( 0.1 * bgvrNear * roughnessFactor );
normal = bgvrPerturb( - vViewPosition, normal, bgvrSlope, faceDirection );
`;

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
 * Was an einem Material eingebaut ist.
 *
 * `toon` ist die **Stufenzahl** und nicht ein Schalter: Sie steht im Quelltext
 * des Shaders, also gehört sie in den Schlüssel, an dem die Fassungen
 * auseinandergehalten werden.
 */
export interface MaterialLook {
  /** Körnung, Farbunruhe und Unebenheit. */
  detail: boolean;
  /** Farbstufen; 0 heißt: keine. */
  toon: number;
}

export const PLAIN_LOOK: MaterialLook = { detail: false, toon: 0 };

/** Der Schlüssel, an dem three.js zwei Fassungen auseinanderhält. */
export function lookKey(look: MaterialLook): string {
  return `${look.detail ? 'd' : '-'}${Math.max(0, Math.round(look.toon))}`;
}

function isPlain(look: MaterialLook): boolean {
  return !look.detail && !(look.toon > 0);
}

/**
 * Baut eine Fassung in einen Shader ein, den three.js gerade übersetzen will.
 *
 * Exportiert, weil der Test sie gegen den **echten** Shader von three.js
 * laufen lässt: Der ganze Umbau hängt an sechs `#include`-Zeilen, die three.js
 * gehören, und eine umbenannte fiele sonst erst in der Brille auf.
 */
export function injectLook(
  shader: THREE.WebGLProgramParametersWithUniforms,
  look: MaterialLook,
): void {
  if (look.detail) {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${DETAIL_VERTEX_PARS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${DETAIL_VERTEX_MAIN}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DETAIL_FRAGMENT_PARS}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${DETAIL_COLOR_MAIN}`)
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\n${DETAIL_ROUGHNESS_MAIN}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\n${DETAIL_NORMAL_MAIN}`,
      );
  }

  if (look.toon > 0) {
    const bands = Math.max(1, Math.round(look.toon)).toFixed(1);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `#include <lights_fragment_end>\n${TOON_MAIN.replace(/BANDS/g, bands)}`,
    );
  }
}

/**
 * Eine Fassung pro Schlüssel, und immer dieselbe Funktion.
 *
 * three.js benutzt `onBeforeCompile.toString()` als Programmschlüssel, wenn
 * das Material keinen eigenen mitbringt — und der Text zweier hier gebauter
 * Pfeilfunktionen ist Zeichen für Zeichen derselbe, egal welche Fassung darin
 * steckt. Deshalb bekommt jedes umgebaute Material zusätzlich seinen eigenen
 * `customProgramCacheKey`; ohne ihn bekämen Körnung und Farbstufen denselben
 * übersetzten Shader, und einer von beiden wäre schlicht nicht da.
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
 * Nur beleuchtete Materialien: Ein `MeshBasicMaterial` hat weder Rauheit noch
 * Normale noch eine Lichtrechnung, und genau daraus sind sämtliche Menüs,
 * Schilder und Beschriftungen gebaut — ein körniger Text wäre ein kaputter
 * Text. Durchsichtiges bleibt ebenfalls draußen: Glas, Portalflächen und
 * Zielhilfen sind glatt gemeint.
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
  if (isPlain(look)) return clearLook(material);

  // Ein eigenes `onBeforeCompile` hat hier zwar niemand, aber es zu verlieren
  // wäre ein Fehler, den man erst drei Welten später sieht. Gebunden gelegt,
  // damit es sein Material auch dann noch kennt, wenn es aus `userData`
  // zurückkommt.
  if (
    !material.userData[MARK] &&
    Object.prototype.hasOwnProperty.call(material, 'onBeforeCompile')
  ) {
    material.userData[KEPT] = material.onBeforeCompile.bind(material);
  }
  material.userData[MARK] = { ...look };
  material.onBeforeCompile = compilerFor(look);
  material.customProgramCacheKey = () => `bgvr:${key}`;
  material.needsUpdate = true;
  return true;
}

/** Nimmt den Umbau wieder heraus — Zeile für Zeile der Weg zurück. */
export function clearLook(material: THREE.Material): boolean {
  if (!material.userData[MARK]) return false;
  const kept = material.userData[KEPT] as THREE.Material['onBeforeCompile'] | undefined;
  if (kept) material.onBeforeCompile = kept;
  else delete (material as Partial<THREE.Material>).onBeforeCompile;
  delete (material as Partial<THREE.Material>).customProgramCacheKey;
  delete material.userData[KEPT];
  delete material.userData[MARK];
  material.needsUpdate = true;
  return true;
}
