import * as THREE from 'three';
import {
  PLAIN_LOOK,
  applyLook,
  clearLook,
  injectLook,
  lookKey,
  lookOf,
  supportsLook,
} from './materialLook';

/** Nur die Körnung, ohne Farbstufen — die häufigste Fassung im Test. */
const GRAIN = { detail: true, toon: 0 };
/** Und der Comic: Farbstufen ohne Körnung. */
const TOON = { detail: false, toon: 3 };

/**
 * Der Haken eines Materials, ohne ihn anzufassen.
 *
 * Nur wegen des Linters: Eine Methode aus ihrem Objekt zu lesen ist hier keine
 * lose Methode, sondern genau das, was geprüft werden soll — hängt nach dem
 * Ausbau wieder dieselbe Funktion dort wie vorher?
 */
function hook(material: THREE.Material): unknown {
  return (material as unknown as { onBeforeCompile: unknown }).onBeforeCompile;
}

/** Ein Shader-Paar, wie three.js es dem Umbau hinlegt. */
function physicalShader(): THREE.WebGLProgramParametersWithUniforms {
  return {
    vertexShader: THREE.ShaderLib['physical']!.vertexShader,
    fragmentShader: THREE.ShaderLib['physical']!.fragmentShader,
    uniforms: {},
  } as THREE.WebGLProgramParametersWithUniforms;
}

describe('was in die Shader der Welt eingebaut wird', () => {
  it('fasst nur beleuchtete, undurchsichtige Materialien an', () => {
    expect(supportsLook(new THREE.MeshStandardMaterial())).toBe(true);
    expect(supportsLook(new THREE.MeshPhysicalMaterial())).toBe(true);
    // Sämtliche Menüs, Schilder und Beschriftungen sind hieraus gebaut: Ein
    // körniger Text wäre ein kaputter Text.
    expect(supportsLook(new THREE.MeshBasicMaterial())).toBe(false);
    expect(supportsLook(new THREE.MeshStandardMaterial({ transparent: true }))).toBe(false);
  });

  it('lässt sich einzeln abbestellen', () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData['bgvrNoLook'] = true;
    expect(supportsLook(material)).toBe(false);
    expect(applyLook(material, GRAIN)).toBe(false);
  });

  it('baut ein und wieder aus, ohne Spuren', () => {
    const material = new THREE.MeshStandardMaterial();
    const before = hook(material);
    const version = material.version;

    expect(applyLook(material, GRAIN)).toBe(true);
    expect(lookOf(material).detail).toBe(true);
    expect(hook(material)).not.toBe(before);
    // `needsUpdate` zählt die Fassung hoch — ohne das übersetzt three.js
    // weiter den Shader von vorhin.
    expect(material.version).toBeGreaterThan(version);

    expect(clearLook(material)).toBe(true);
    expect(lookOf(material)).toEqual(PLAIN_LOOK);
    expect(hook(material)).toBe(before);
    expect(Object.keys(material.userData)).toHaveLength(0);
  });

  it('baut nicht zweimal ein und nicht zweimal aus', () => {
    const material = new THREE.MeshStandardMaterial();
    expect(applyLook(material, GRAIN)).toBe(true);
    expect(applyLook(material, GRAIN)).toBe(false);
    expect(clearLook(material)).toBe(true);
    expect(clearLook(material)).toBe(false);
  });

  it('behält ein fremdes onBeforeCompile und gibt es zurück', () => {
    const material = new THREE.MeshStandardMaterial();
    const mine = jest.fn();
    material.onBeforeCompile = mine;

    applyLook(material, GRAIN);
    expect(hook(material)).not.toBe(mine);
    clearLook(material);

    const shader = physicalShader();
    material.onBeforeCompile(shader, null as never);
    expect(mine).toHaveBeenCalledTimes(1);
  });

  it('findet seine Stellen im echten Shader von three.js', () => {
    // Der eigentliche Grund für diesen Test: Der Umbau hängt an sechs
    // `#include`-Zeilen, die three.js gehören. Wird eine davon in einer neuen
    // Fassung umbenannt, fällt das sonst erst in der Brille auf — als eine
    // Welt, in der die Körnung fehlt oder gar nichts mehr gezeichnet wird.
    const shader = physicalShader();
    const before = { ...shader };
    injectLook(shader, GRAIN);

    expect(shader.vertexShader).not.toBe(before.vertexShader);
    expect(shader.fragmentShader).not.toBe(before.fragmentShader);
    // Die Weltposition: hinten im Vertex-Shader gerechnet, vorn deklariert.
    expect(shader.vertexShader).toContain('varying vec3 vBgvrWorld;');
    expect(shader.vertexShader).toContain('#include <project_vertex>\n');
    expect(shader.vertexShader.indexOf('vBgvrWorld =')).toBeGreaterThan(
      shader.vertexShader.indexOf('#include <project_vertex>'),
    );
    // Und die drei Zugriffe im Fragment-Shader, jeder hinter seinem Baustein.
    for (const [chunk, mark] of [
      ['#include <map_fragment>', 'diffuseColor.rgb *='],
      ['#include <roughnessmap_fragment>', 'roughnessFactor = clamp('],
      ['#include <normal_fragment_maps>', 'normal = bgvrPerturb('],
    ] as const) {
      expect(shader.fragmentShader).toContain(chunk);
      expect(shader.fragmentShader.indexOf(mark)).toBeGreaterThan(
        shader.fragmentShader.indexOf(chunk),
      );
    }
  });

  it('rechnet die Körnung, bevor sie gebraucht wird', () => {
    // Rauheit und Normale lesen `bgvrGrain`; steht es weiter hinten, übersetzt
    // der Shader nicht mehr.
    const shader = physicalShader();
    injectLook(shader, GRAIN);
    const source = shader.fragmentShader;
    expect(source.indexOf('float bgvrGrain =')).toBeGreaterThan(source.indexOf('float bgvrNoise('));
    expect(source.indexOf('float bgvrGrain =')).toBeLessThan(
      source.indexOf('roughnessFactor = clamp('),
    );
    expect(source.indexOf('float bgvrGrain =')).toBeLessThan(source.indexOf('dFdx( bgvrGrain )'));
  });

  it('legt die Farbstufen hinter das zusammengezählte Licht', () => {
    const shader = physicalShader();
    injectLook(shader, TOON);
    const source = shader.fragmentShader;

    expect(source).toContain('#include <lights_fragment_end>');
    expect(source.indexOf('reflectedLight.directDiffuse *= bgvrScale;')).toBeGreaterThan(
      source.indexOf('#include <lights_fragment_end>'),
    );
    // Und davor, denn danach wird nichts mehr addiert: `aomap_fragment` und
    // die Summe der Anteile lesen genau das, was hier gerundet wurde.
    expect(source.indexOf('reflectedLight.directDiffuse *= bgvrScale;')).toBeLessThan(
      source.indexOf('vec3 totalDiffuse ='),
    );
    // Die Stufenzahl steht als Zahl im Quelltext, nicht als Uniform: An ihr
    // hängt der Programmschlüssel.
    expect(source).toContain('* 3.0 + 0.5');
    // Die Körnung bleibt draußen, wenn nur der Comic bestellt war.
    expect(source).not.toContain('bgvrNoise');
  });

  it('kann beides zugleich, und dann steht auch beides drin', () => {
    // Ein Material hat genau ein `onBeforeCompile`. Texturen an *und* Comic an
    // war der Fall, an dem sich zwei getrennte Umbauten gegenseitig
    // überschrieben hätten.
    const shader = physicalShader();
    injectLook(shader, { detail: true, toon: 4 });
    expect(shader.fragmentShader).toContain('bgvrNoise');
    expect(shader.fragmentShader).toContain('bgvrScale');
    expect(shader.fragmentShader).toContain('* 4.0 + 0.5');
  });

  it('gibt jeder Fassung ihren eigenen Programmschlüssel', () => {
    // Ohne das bekämen Körnung und Farbstufen denselben übersetzten Shader —
    // three.js schlüsselt seinen Cache sonst über den *Text* von
    // `onBeforeCompile`, und der ist bei beiden Zeichen für Zeichen derselbe.
    const keys = [GRAIN, TOON, { detail: true, toon: 3 }, PLAIN_LOOK].map(lookKey);
    expect(new Set(keys).size).toBe(4);

    const grain = new THREE.MeshStandardMaterial();
    const toon = new THREE.MeshStandardMaterial();
    applyLook(grain, GRAIN);
    applyLook(toon, TOON);
    expect(grain.customProgramCacheKey()).not.toBe(toon.customProgramCacheKey());
    expect(grain.customProgramCacheKey()).not.toBe(
      new THREE.MeshStandardMaterial().customProgramCacheKey(),
    );

    clearLook(grain);
    expect(grain.customProgramCacheKey()).toBe(
      new THREE.MeshStandardMaterial().customProgramCacheKey(),
    );
  });

  it('wechselt die Fassung, statt sie zu stapeln', () => {
    const material = new THREE.MeshStandardMaterial();
    applyLook(material, GRAIN);
    expect(applyLook(material, TOON)).toBe(true);
    expect(lookOf(material)).toEqual(TOON);

    const shader = physicalShader();
    material.onBeforeCompile(shader, null as never);
    expect(shader.fragmentShader).not.toContain('bgvrNoise');
    expect(shader.fragmentShader).toContain('bgvrScale');

    // Und die leere Fassung ist der Ausbau, nicht eine dritte Sorte Umbau.
    expect(applyLook(material, PLAIN_LOOK)).toBe(true);
    expect(lookOf(material)).toEqual(PLAIN_LOOK);
    expect(Object.keys(material.userData)).toHaveLength(0);
  });
});
