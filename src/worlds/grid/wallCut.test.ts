/**
 * **Abgeschnitten und Guckloch** (`wallCut.ts`): der Shader-Umbau greift an
 * den Stellen, die jedes eingebaute Material von three.js hat, und die
 * Zwillinge wechseln mit der Einstellung (`modelGhost.ts`).
 */
import * as THREE from 'three';
import { ModelGhosts } from './modelGhost';
import { injectCut, lookOfOcclusion, setWallLook, wallCutTwin } from './wallCut';

function shaderOf(name: 'standard' | 'basic'): THREE.WebGLProgramParametersWithUniforms {
  const lib = THREE.ShaderLib[name];
  return {
    uniforms: THREE.UniformsUtils.clone(lib.uniforms),
    vertexShader: lib.vertexShader,
    fragmentShader: lib.fragmentShader,
  } as THREE.WebGLProgramParametersWithUniforms;
}

describe('Wände vorn: abgeschnitten und Guckloch', () => {
  afterEach(() => setWallLook('fade'));

  it('ordnet jeder Einstellung ihre Fassung zu', () => {
    expect(lookOfOcclusion('ghost')).toBe('fade');
    expect(lookOfOcclusion('ghostFront')).toBe('fade');
    expect(lookOfOcclusion('cutaway')).toBe('cut');
    expect(lookOfOcclusion('hole')).toBe('hole');
  });

  it.each(['standard', 'basic'] as const)('baut den Schnitt in %s ein', (name) => {
    for (const look of ['cut', 'hole'] as const) {
      const shader = shaderOf(name);
      injectCut(shader, look);
      expect(shader.vertexShader).toContain('vWallCutPos = ( modelMatrix * wallCutPos ).xyz;');
      expect(shader.fragmentShader).toContain('varying vec3 vWallCutPos;');
      expect(shader.fragmentShader).toContain('discard;');
      expect(shader.fragmentShader).toContain('gl_FrontFacing');
      expect(shader.uniforms['uWallCutY']).toBeDefined();
      expect(shader.uniforms['uWallHoleRadius']).toBeDefined();
    }
  });

  it('lässt das Original in Ruhe und zeichnet beide Seiten', () => {
    const own = new THREE.MeshStandardMaterial({ color: 0x445566 });
    const twin = wallCutTwin(own, 'cut');
    expect(twin).not.toBe(own);
    expect(twin.side).toBe(THREE.DoubleSide);
    expect(twin.transparent).toBe(false);
    expect(own.side).toBe(THREE.FrontSide);
    expect(twin.customProgramCacheKey()).toContain('wall-cut');
  });

  it('tauscht die Zwillinge, wenn die Einstellung wechselt', () => {
    const skin = new THREE.MeshStandardMaterial({ color: 0x336633 });
    const root = new THREE.Group();
    const brick = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.25), skin);
    root.add(brick);
    const ghosts = new ModelGhosts(0.25);
    ghosts.apply([root]);
    expect((brick.material as THREE.Material).transparent).toBe(true);
    setWallLook('cut');
    ghosts.apply([root]);
    const cut = brick.material as THREE.Material;
    expect(cut.transparent).toBe(false);
    expect(cut.side).toBe(THREE.DoubleSide);
    ghosts.clear();
    expect(brick.material).toBe(skin);
  });
});
