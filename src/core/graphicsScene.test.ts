import * as THREE from 'three';
import { aimSun, applySceneQuality, findSun } from './graphicsScene';
import { graphicsProfile } from './graphicsSettings';
import { isDetailed } from './proceduralDetail';

const FANCY = graphicsProfile({ mode: 'fancy', textures: true });
const SIMPLE = graphicsProfile({ mode: 'simple', textures: false });

interface Built {
  scene: THREE.Scene;
  crate: THREE.Mesh;
  ground: THREE.Mesh;
  glass: THREE.Mesh;
  panel: THREE.Mesh;
  sun: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
}

/** Eine Welt im Kleinen: eine Kiste, ein Boden, ein Fenster, ein Menü, Licht. */
function build(): Built {
  const scene = new THREE.Scene();
  const box = new THREE.BoxGeometry(1, 1, 1);

  const crate = new THREE.Mesh(box, new THREE.MeshStandardMaterial());
  const ground = new THREE.Mesh(box, new THREE.MeshStandardMaterial());
  ground.userData['backdrop'] = true;
  const glass = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ transparent: true }));
  const panel = new THREE.Mesh(box, new THREE.MeshBasicMaterial());

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 8, 3);
  const fill = new THREE.DirectionalLight(0x6a9bff, 0.5);
  fill.position.set(-5, 3, -4);

  scene.add(crate, ground, glass, panel, sun, fill, new THREE.HemisphereLight());
  return { scene, crate, ground, glass, panel, sun, fill };
}

describe('die Grafikstufe über einer Szene', () => {
  it('lässt in der einfachen Stufe alles, wie es war', () => {
    const world = build();
    expect(applySceneQuality(world.scene, SIMPLE)).toBeNull();
    for (const mesh of [world.crate, world.ground, world.glass, world.panel]) {
      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(false);
    }
    expect(world.sun.castShadow).toBe(false);
    expect(isDetailed(world.crate.material as THREE.Material)).toBe(false);
  });

  it('verteilt die Schatten nach dem, was ein Ding ist', () => {
    const world = build();
    const sun = applySceneQuality(world.scene, FANCY);

    // Die Kiste: wirft und empfängt.
    expect(world.crate.castShadow).toBe(true);
    expect(world.crate.receiveShadow).toBe(true);
    // Die Kulisse empfängt nur — ein Boden bis zum Horizont, der Schatten
    // wirft, verdunkelt die halbe Welt.
    expect(world.ground.castShadow).toBe(false);
    expect(world.ground.receiveShadow).toBe(true);
    // Durchsichtiges wirft keinen: Ein Fenster mit einem Brett als Schatten
    // ist schlimmer als eines ohne.
    expect(world.glass.castShadow).toBe(false);
    // Und das Menü ist kein Gegenstand.
    expect(world.panel.castShadow).toBe(false);
    expect(world.panel.receiveShadow).toBe(false);

    // Genau ein Licht wirft, und zwar das hellste.
    expect(sun).toBe(world.sun);
    expect(world.sun.castShadow).toBe(true);
    expect(world.fill.castShadow).toBe(false);
    expect(world.sun.shadow.mapSize.width).toBe(FANCY.shadowMapSize);
    expect(world.sun.shadow.camera.right).toBe(FANCY.shadowRange);
    expect(world.sun.shadow.camera.far).toBeGreaterThan(FANCY.shadowDistance);
  });

  it('nimmt sich vollständig zurück', () => {
    // „Einfach" nach einem Ausflug muss dasselbe Einfach sein wie vorher —
    // sonst bleibt von jedem Versuch etwas hängen.
    const world = build();
    world.crate.receiveShadow = true;
    applySceneQuality(world.scene, FANCY);
    applySceneQuality(world.scene, SIMPLE);

    expect(world.crate.castShadow).toBe(false);
    expect(world.crate.receiveShadow).toBe(true);
    expect(world.ground.receiveShadow).toBe(false);
    expect(world.sun.castShadow).toBe(false);
    expect(isDetailed(world.crate.material as THREE.Material)).toBe(false);
  });

  it('gibt die Körnung nur den beleuchteten Flächen', () => {
    const world = build();
    applySceneQuality(world.scene, FANCY);
    expect(isDetailed(world.crate.material as THREE.Material)).toBe(true);
    expect(isDetailed(world.ground.material as THREE.Material)).toBe(true);
    expect(isDetailed(world.glass.material as THREE.Material)).toBe(false);
    expect(isDetailed(world.panel.material as THREE.Material)).toBe(false);
  });

  it('holt Nachzügler beim nächsten Durchlauf ab', () => {
    // Der Grund, warum die Szene immer wieder abgelaufen wird: Ein Zombie, der
    // erst nach dem Umschalten aus dem Käfig kommt, hätte sonst als Einziger
    // keinen Schatten.
    const world = build();
    applySceneQuality(world.scene, FANCY);
    const late = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    world.scene.add(late);
    expect(late.castShadow).toBe(false);

    applySceneQuality(world.scene, FANCY);
    expect(late.castShadow).toBe(true);
    expect(isDetailed(late.material)).toBe(true);
  });

  it('findet das hellste Richtungslicht, egal wo es hängt', () => {
    const world = build();
    const group = new THREE.Group();
    const brighter = new THREE.DirectionalLight(0xffffff, 3);
    group.add(brighter);
    world.scene.add(group);
    expect(findSun(world.scene)).toBe(brighter);
  });

  it('schiebt die Sonne mit, ohne ihre Richtung zu drehen', () => {
    const world = build();
    applySceneQuality(world.scene, FANCY);
    const before = world.sun.target.position.clone().sub(world.sun.position).normalize();

    aimSun(world.sun, new THREE.Vector3(10.4, 1.6, -3.1), FANCY);

    // Der Anker rastet auf zwei Meter ein — sonst kröchen die Schattenränder
    // bei jedem Schritt über die Kanten.
    expect(world.sun.target.position.toArray()).toEqual([10, 2, -4]);
    // Die Lampe steht jetzt woanders, die Sonne scheint aber unverändert: eine
    // gedrehte Richtung hieße, dass die Schatten beim Gehen wandern.
    const after = world.sun.target.position.clone().sub(world.sun.position).normalize();
    expect(after.distanceTo(before)).toBeLessThan(1e-6);
    expect(world.sun.position.distanceTo(world.sun.target.position)).toBeCloseTo(
      FANCY.shadowDistance,
      5,
    );
    // Das Ziel hängt an keiner Szene; ohne die eigene Rechnung bliebe seine
    // Weltmatrix die von vorhin, und die Schattenkarte zeigte woandershin.
    expect(new THREE.Vector3().setFromMatrixPosition(world.sun.target.matrixWorld).x).toBe(10);
  });

  it('rechnet in Weltkoordinaten, auch wenn die Lampe in einer Gruppe hängt', () => {
    // Die Lichter einer Welt hängen in einer Gruppe (`createLighting`), und die
    // muss nicht im Ursprung stehen. Die Schattenkarte liest aber Weltpositionen
    // — Lampe und Ziel —, also muss beides dort ankommen und nicht im Raum der
    // Gruppe.
    const world = build();
    const group = new THREE.Group();
    group.position.set(100, 0, 0);
    world.scene.remove(world.sun);
    group.add(world.sun);
    world.scene.add(group);
    world.scene.updateMatrixWorld(true);

    const before = new THREE.Vector3()
      .copy(world.sun.target.getWorldPosition(new THREE.Vector3()))
      .sub(world.sun.getWorldPosition(new THREE.Vector3()))
      .normalize();

    aimSun(world.sun, new THREE.Vector3(102, 0.4, 0), FANCY);
    world.scene.updateMatrixWorld(true);

    const anchor = world.sun.target.getWorldPosition(new THREE.Vector3());
    const lamp = world.sun.getWorldPosition(new THREE.Vector3());
    expect(anchor.toArray()).toEqual([102, 0, 0]);
    // In der Gruppe steht die Lampe woanders als in der Welt — genau das ist
    // die Umrechnung, um die es hier geht.
    expect(world.sun.position.x).not.toBeCloseTo(lamp.x, 3);
    expect(lamp.distanceTo(anchor)).toBeCloseTo(FANCY.shadowDistance, 5);
    expect(anchor.sub(lamp).normalize().distanceTo(before)).toBeLessThan(1e-6);
  });
});
