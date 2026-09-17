import * as THREE from 'three';
import { Portal } from './Portal';
import { PortalRenderer } from './PortalRenderer';

/**
 * **Ein Durchlauf durch den Szenengraphen, den niemand braucht.**
 *
 * `PortalRenderer.render` rechnet die Weltmatrizen der ganzen Szene erzwungen
 * durch, bevor es seine Sichten zeichnet — das muss es auch, denn die Kamera
 * einer Portalsicht wird aus der Weltmatrix der Portalfläche gerechnet, und
 * die Sichten laufen **vor** dem Hauptdurchgang.
 *
 * Nur stand dieser Durchlauf lange **vor** der Frage, ob überhaupt ein Portal
 * gesetzt ist. Er lief also auch in jedem Bild, in dem gar keine Portalpistole
 * in der Hand liegt — und gleich danach lief er noch einmal, weil
 * `WebGLRenderer.render` den Graphen ohnehin durchrechnet. In der Testwelt
 * waren das zwei Durchläufe über 6 556 Knoten je Bild statt einem
 * (`tools/perf-kitchen.mjs`, AGENTS.md _Die Messstrecke der Küche_).
 *
 * Der Test hält beide Hälften fest: ohne Portal keiner, mit Portal einer.
 * Gezählt wird am Wurzelknoten, denn genau der ist der teure.
 */

/** Ein Renderer, der nur so viel kann, wie `PortalRenderer` von ihm verlangt. */
function stubRenderer(): {
  renderer: THREE.WebGLRenderer;
  passes: number;
} {
  const state = { passes: 0 };
  const renderer = {
    xr: { isPresenting: false, enabled: false, getCamera: () => null },
    getDrawingBufferSize: (target: THREE.Vector2) => target.set(1280, 800),
    getRenderTarget: () => null,
    setRenderTarget: () => {},
    render: () => {
      state.passes += 1;
    },
  } as unknown as THREE.WebGLRenderer;
  return {
    renderer,
    get passes() {
      return state.passes;
    },
  };
}

/** Zählt, wie oft die Wurzel erzwungen durchgerechnet wird. */
function countForcedWalks(scene: THREE.Scene): { forced: number; gentle: number } {
  const counts = { forced: 0, gentle: 0 };
  const original = scene.updateMatrixWorld.bind(scene);
  scene.updateMatrixWorld = (force?: boolean) => {
    if (force) counts.forced += 1;
    else counts.gentle += 1;
    original(force);
  };
  return counts;
}

function scene(): THREE.Scene {
  const built = new THREE.Scene();
  built.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  return built;
}

describe('PortalRenderer und der Matrizenlauf', () => {
  it('rechnet die Szene nicht durch, solange kein Portal steht', () => {
    const { renderer } = stubRenderer();
    const portals = new PortalRenderer(renderer);
    const world = scene();
    const counts = countForcedWalks(world);
    const camera = new THREE.PerspectiveCamera(70, 1.6, 0.05, 700);

    portals.render(world, camera, [new Portal('a', 0x3fa9ff), new Portal('b', 0xff5a5f)]);

    expect(counts.forced).toBe(0);
  });

  it('lässt die Auflösung der Portale trotzdem gesetzt sein', () => {
    // Der frühe Ausgang tut weiterhin seine Arbeit — er hängt nicht an den
    // Matrizen, und ein Portal ohne Auflösung fände seine Stelle im Bild nicht.
    const { renderer } = stubRenderer();
    const portals = new PortalRenderer(renderer);
    const idle = new Portal('a', 0x3fa9ff);
    portals.render(scene(), new THREE.PerspectiveCamera(), [idle]);

    const size = idle.mesh.material.uniforms.uResolution.value as THREE.Vector2;
    expect(size.x).toBe(1280);
    expect(size.y).toBe(800);
  });

  it('rechnet sie durch, sobald ein Paar steht — einmal, vor den Sichten', () => {
    const stub = stubRenderer();
    const portals = new PortalRenderer(stub.renderer);
    const world = scene();
    const counts = countForcedWalks(world);
    const camera = new THREE.PerspectiveCamera(70, 1.6, 0.05, 700);

    const blue = new Portal('a', 0x3fa9ff);
    const red = new Portal('b', 0xff5a5f);
    blue.link = red;
    red.link = blue;
    blue.place(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0));
    red.place(new THREE.Vector3(10, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));

    portals.render(world, camera, [blue, red]);

    expect(counts.forced).toBe(1);
    // Und die Sichten sind auch wirklich gezeichnet worden — sonst wäre die
    // Zeile darüber die Aussage „es passierte gar nichts".
    expect(stub.passes).toBeGreaterThan(0);
  });
});
