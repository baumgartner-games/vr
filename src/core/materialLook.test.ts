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

/** Der Comic: Licht in drei Stufen. */
const TOON = 3;

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
    // gestufter Text wäre ein kaputter Text.
    expect(supportsLook(new THREE.MeshBasicMaterial())).toBe(false);
    expect(supportsLook(new THREE.MeshStandardMaterial({ transparent: true }))).toBe(false);
  });

  it('lässt sich einzeln abbestellen', () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData['bgvrNoLook'] = true;
    expect(supportsLook(material)).toBe(false);
    expect(applyLook(material, TOON)).toBe(false);
  });

  it('baut ein und wieder aus, ohne Spuren', () => {
    const material = new THREE.MeshStandardMaterial();
    const before = hook(material);
    const version = material.version;

    expect(applyLook(material, TOON)).toBe(true);
    expect(lookOf(material)).toBe(TOON);
    expect(hook(material)).not.toBe(before);
    // `needsUpdate` zählt die Fassung hoch — ohne das übersetzt three.js
    // weiter den Shader von vorhin.
    expect(material.version).toBeGreaterThan(version);

    expect(clearLook(material)).toBe(true);
    expect(lookOf(material)).toBe(PLAIN_LOOK);
    expect(hook(material)).toBe(before);
    expect(Object.keys(material.userData)).toHaveLength(0);
  });

  it('baut nicht zweimal ein und nicht zweimal aus', () => {
    const material = new THREE.MeshStandardMaterial();
    expect(applyLook(material, TOON)).toBe(true);
    expect(applyLook(material, TOON)).toBe(false);
    expect(clearLook(material)).toBe(true);
    expect(clearLook(material)).toBe(false);
  });

  it('behält ein fremdes onBeforeCompile und gibt es zurück', () => {
    const material = new THREE.MeshStandardMaterial();
    const mine = jest.fn();
    material.onBeforeCompile = mine;

    applyLook(material, TOON);
    expect(hook(material)).not.toBe(mine);
    clearLook(material);

    const shader = physicalShader();
    material.onBeforeCompile(shader, null as never);
    expect(mine).toHaveBeenCalledTimes(1);
  });

  it('legt die Farbstufen hinter das zusammengezählte Licht', () => {
    // Der eigentliche Grund für diesen Test: Der Umbau hängt an einer
    // `#include`-Zeile, die three.js gehört. Wird sie in einer neuen Fassung
    // umbenannt, fällt das sonst erst in der Brille auf.
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
  });

  it('lässt einen Shader in Ruhe, wenn keine Stufen bestellt sind', () => {
    const shader = physicalShader();
    const before = { ...shader };
    injectLook(shader, PLAIN_LOOK);
    expect(shader.fragmentShader).toBe(before.fragmentShader);
    expect(shader.vertexShader).toBe(before.vertexShader);
  });

  it('gibt jeder Stufenzahl ihren eigenen Programmschlüssel', () => {
    // Ohne das bekämen drei und fünf Stufen denselben übersetzten Shader —
    // three.js schlüsselt seinen Cache sonst über den *Text* von
    // `onBeforeCompile`, und der ist bei beiden Zeichen für Zeichen derselbe.
    const keys = [PLAIN_LOOK, 3, 4].map(lookKey);
    expect(new Set(keys).size).toBe(3);

    const three = new THREE.MeshStandardMaterial();
    const four = new THREE.MeshStandardMaterial();
    applyLook(three, 3);
    applyLook(four, 4);
    expect(three.customProgramCacheKey()).not.toBe(four.customProgramCacheKey());
    expect(three.customProgramCacheKey()).not.toBe(
      new THREE.MeshStandardMaterial().customProgramCacheKey(),
    );

    clearLook(three);
    expect(three.customProgramCacheKey()).toBe(
      new THREE.MeshStandardMaterial().customProgramCacheKey(),
    );
  });

  it('wechselt die Fassung, statt sie zu stapeln', () => {
    const material = new THREE.MeshStandardMaterial();
    applyLook(material, 3);
    expect(applyLook(material, 4)).toBe(true);
    expect(lookOf(material)).toBe(4);

    const shader = physicalShader();
    material.onBeforeCompile(shader, null as never);
    expect(shader.fragmentShader).toContain('* 4.0 + 0.5');
    expect(shader.fragmentShader).not.toContain('* 3.0 + 0.5');

    // Und die leere Fassung ist der Ausbau, nicht eine dritte Sorte Umbau.
    expect(applyLook(material, PLAIN_LOOK)).toBe(true);
    expect(lookOf(material)).toBe(PLAIN_LOOK);
    expect(Object.keys(material.userData)).toHaveLength(0);
  });
});
