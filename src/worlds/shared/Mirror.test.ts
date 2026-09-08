import * as THREE from 'three';
import { MirrorRenderer, MirrorSurface } from './Mirror';

function renderer() {
  return {
    xr: { isPresenting: false, enabled: true },
    state: { setCullFace: jest.fn() },
    getDrawingBufferSize: (target: THREE.Vector2) => target.set(2560, 1440),
    getRenderTarget: () => null,
    setRenderTarget: jest.fn(),
    render: jest.fn(),
  };
}

function scene() {
  const root = new THREE.Scene();
  const mirror = new MirrorSurface(1, 2);
  mirror.position.set(0, 0, -3);
  root.add(mirror);
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 100);
  return { root, mirror, camera };
}

describe('web mirror render budget', () => {
  it('bounds the target dimensions and removes web multisampling', () => {
    const fake = renderer();
    const mirrors = new MirrorRenderer(fake as unknown as THREE.WebGLRenderer);
    const { root, mirror, camera } = scene();
    mirrors.render(root, camera);
    expect(fake.render).toHaveBeenCalledTimes(1);
    const target = fake.setRenderTarget.mock.calls[0]![0] as THREE.WebGLRenderTarget;
    expect(target.width).toBe(768);
    expect(target.height).toBe(432);
    expect(target.samples).toBe(0);
    expect(mirror.material.uniforms.uActive!.value).toBe(1);
    mirrors.dispose();
    mirror.material.dispose();
    mirror.geometry.dispose();
  });

  it.each([
    ['behind the camera', 0, 3, Math.PI],
    ['outside the camera view', 9, -3, 0],
    ['facing away from the camera', 0, -3, Math.PI],
  ])('does not redraw the scene for a mirror %s', (_label, x, z, rotation) => {
    const fake = renderer();
    const mirrors = new MirrorRenderer(fake as unknown as THREE.WebGLRenderer);
    const { root, mirror, camera } = scene();
    mirror.position.set(x, 0, z);
    mirror.rotation.y = rotation;
    mirrors.render(root, camera);
    expect(fake.render).not.toHaveBeenCalled();
    expect(mirror.material.uniforms.uActive!.value).toBe(0);
    mirrors.dispose();
    mirror.material.dispose();
    mirror.geometry.dispose();
  });

  it('restores a mirror immediately when the camera turns toward it', () => {
    const fake = renderer();
    const mirrors = new MirrorRenderer(fake as unknown as THREE.WebGLRenderer);
    const { root, mirror, camera } = scene();
    mirror.position.z = 3;
    mirror.rotation.y = Math.PI;
    mirrors.render(root, camera);
    expect(fake.render).not.toHaveBeenCalled();
    camera.rotation.y = Math.PI;
    mirrors.render(root, camera);
    expect(fake.render).toHaveBeenCalledTimes(1);
    mirrors.dispose();
    mirror.material.dispose();
    mirror.geometry.dispose();
  });

  it('keeps the established XR buffer scale and stereo camera path', () => {
    const fake = renderer();
    const { root, mirror, camera } = scene();
    const eye = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 100);
    eye.viewport = new THREE.Vector4(0, 0, 2560, 1440);
    const stereo = new THREE.ArrayCamera([eye]);
    const xrFake = { ...fake, xr: { isPresenting: true, enabled: true, getCamera: () => stereo } };
    const mirrors = new MirrorRenderer(xrFake as unknown as THREE.WebGLRenderer);
    mirrors.render(root, camera);
    const target = fake.setRenderTarget.mock.calls[0]![0] as THREE.WebGLRenderTarget;
    expect(target.width).toBe(1792);
    expect(target.height).toBe(1007);
    expect(target.samples).toBe(0);
    const reflected = fake.render.mock.calls[0]![1] as THREE.ArrayCamera;
    expect(reflected.isArrayCamera).toBe(true);
    expect(reflected.cameras).toHaveLength(1);
    mirrors.dispose();
    mirror.material.dispose();
    mirror.geometry.dispose();
  });
});
