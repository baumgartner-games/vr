import * as THREE from 'three';
import {
  detailCompile,
  isDetailed,
  patchDetail,
  supportsDetail,
  unpatchDetail,
} from './proceduralDetail';

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

describe('prozedurale Oberflächen', () => {
  it('fasst nur beleuchtete, undurchsichtige Materialien an', () => {
    expect(supportsDetail(new THREE.MeshStandardMaterial())).toBe(true);
    expect(supportsDetail(new THREE.MeshPhysicalMaterial())).toBe(true);
    // Sämtliche Menüs, Schilder und Beschriftungen sind hieraus gebaut: Ein
    // körniger Text wäre ein kaputter Text.
    expect(supportsDetail(new THREE.MeshBasicMaterial())).toBe(false);
    expect(supportsDetail(new THREE.MeshStandardMaterial({ transparent: true }))).toBe(false);
  });

  it('lässt sich einzeln abbestellen', () => {
    const material = new THREE.MeshStandardMaterial();
    material.userData['bgvrNoDetail'] = true;
    expect(supportsDetail(material)).toBe(false);
    expect(patchDetail(material)).toBe(false);
  });

  it('baut ein und wieder aus, ohne Spuren', () => {
    const material = new THREE.MeshStandardMaterial();
    const before = hook(material);
    const version = material.version;

    expect(patchDetail(material)).toBe(true);
    expect(isDetailed(material)).toBe(true);
    expect(hook(material)).not.toBe(before);
    // `needsUpdate` zählt die Fassung hoch — ohne das übersetzt three.js
    // weiter den Shader von vorhin.
    expect(material.version).toBeGreaterThan(version);

    expect(unpatchDetail(material)).toBe(true);
    expect(isDetailed(material)).toBe(false);
    expect(hook(material)).toBe(before);
    expect(Object.keys(material.userData)).toHaveLength(0);
  });

  it('baut nicht zweimal ein und nicht zweimal aus', () => {
    const material = new THREE.MeshStandardMaterial();
    expect(patchDetail(material)).toBe(true);
    expect(patchDetail(material)).toBe(false);
    expect(unpatchDetail(material)).toBe(true);
    expect(unpatchDetail(material)).toBe(false);
  });

  it('behält ein fremdes onBeforeCompile und gibt es zurück', () => {
    const material = new THREE.MeshStandardMaterial();
    const mine = jest.fn();
    material.onBeforeCompile = mine;

    patchDetail(material);
    expect(hook(material)).not.toBe(mine);
    unpatchDetail(material);

    const shader = physicalShader();
    material.onBeforeCompile(shader, null as never);
    expect(mine).toHaveBeenCalledTimes(1);
  });

  it('findet seine Stellen im echten Shader von three.js', () => {
    // Der eigentliche Grund für diesen Test: Der Umbau hängt an vier
    // `#include`-Zeilen, die three.js gehören. Wird eine davon in einer neuen
    // Fassung umbenannt, fällt das sonst erst in der Brille auf — als eine
    // Welt, in der die Körnung fehlt oder gar nichts mehr gezeichnet wird.
    const shader = physicalShader();
    const before = { ...shader };
    detailCompile(shader);

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
    detailCompile(shader);
    const source = shader.fragmentShader;
    expect(source.indexOf('float bgvrGrain =')).toBeGreaterThan(source.indexOf('float bgvrNoise('));
    expect(source.indexOf('float bgvrGrain =')).toBeLessThan(
      source.indexOf('roughnessFactor = clamp('),
    );
    expect(source.indexOf('float bgvrGrain =')).toBeLessThan(source.indexOf('dFdx( bgvrGrain )'));
  });
});
