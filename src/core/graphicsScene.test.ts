import * as THREE from 'three';
import { aimSun, applySceneQuality, findSun } from './graphicsScene';
import { graphicsProfile } from './graphicsSettings';
import { lookOf } from './materialLook';
import { denyOutline, isOutline, outlineOf, stripOutlines } from './outlineShell';

const COMIC = graphicsProfile({ mode: 'comic', xrScale: 1 });
const SIMPLE = graphicsProfile({ mode: 'simple', xrScale: 1 });

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
  it('leaves a gameplay-controlled dark light off during quality rescans', () => {
    const scene = new THREE.Scene();
    const light = new THREE.AmbientLight(0xffffff, 1.2);
    light.userData.dynamicIntensity = true;
    scene.add(light);
    applySceneQuality(scene, SIMPLE);
    light.intensity = 0;
    applySceneQuality(scene, COMIC);
    expect(light.intensity).toBe(0);
    light.intensity = 0.8;
    applySceneQuality(scene, SIMPLE);
    expect(light.intensity).toBe(0.8);
  });

  it('lässt in der einfachen Stufe alles, wie es war', () => {
    const world = build();
    expect(applySceneQuality(world.scene, SIMPLE)).toBeNull();
    for (const mesh of [world.crate, world.ground, world.glass, world.panel]) {
      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(false);
    }
    expect(world.sun.castShadow).toBe(false);
    expect(lookOf(world.crate.material as THREE.Material)).toBe(0);
  });

  it('verteilt die Schatten nach dem, was ein Ding ist', () => {
    const world = build();
    const sun = applySceneQuality(world.scene, COMIC);

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
    expect(world.sun.shadow.mapSize.width).toBe(COMIC.shadowMapSize);
    expect(world.sun.shadow.camera.right).toBe(COMIC.shadowRange);
    expect(world.sun.shadow.camera.far).toBeGreaterThan(COMIC.shadowDistance);
  });

  it('nimmt sich vollständig zurück', () => {
    // „Einfach" nach einem Ausflug muss dasselbe Einfach sein wie vorher —
    // sonst bleibt von jedem Versuch etwas hängen.
    const world = build();
    world.crate.receiveShadow = true;
    applySceneQuality(world.scene, COMIC);
    applySceneQuality(world.scene, SIMPLE);

    expect(world.crate.castShadow).toBe(false);
    expect(world.crate.receiveShadow).toBe(true);
    expect(world.ground.receiveShadow).toBe(false);
    expect(world.sun.castShadow).toBe(false);
    expect(lookOf(world.crate.material as THREE.Material)).toBe(0);
  });

  it('gibt die Farbstufen nur den beleuchteten Flächen', () => {
    const world = build();
    applySceneQuality(world.scene, COMIC);
    expect(lookOf(world.crate.material as THREE.Material)).toBe(COMIC.toonBands);
    expect(lookOf(world.ground.material as THREE.Material)).toBe(COMIC.toonBands);
    expect(lookOf(world.glass.material as THREE.Material)).toBe(0);
    expect(lookOf(world.panel.material as THREE.Material)).toBe(0);
  });

  it('holt Nachzügler beim nächsten Durchlauf ab', () => {
    // Der Grund, warum die Szene immer wieder abgelaufen wird: Ein Zombie, der
    // erst nach dem Umschalten aus dem Käfig kommt, hätte sonst als Einziger
    // keinen Schatten.
    const world = build();
    applySceneQuality(world.scene, COMIC);
    const late = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    world.scene.add(late);
    expect(late.castShadow).toBe(false);

    applySceneQuality(world.scene, COMIC);
    expect(late.castShadow).toBe(true);
    expect(lookOf(late.material)).toBe(COMIC.toonBands);
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
    applySceneQuality(world.scene, COMIC);
    const before = world.sun.target.position.clone().sub(world.sun.position).normalize();

    aimSun(world.sun, new THREE.Vector3(10.4, 1.6, -3.1), COMIC);

    // Der Anker rastet auf zwei Meter ein — sonst kröchen die Schattenränder
    // bei jedem Schritt über die Kanten.
    expect(world.sun.target.position.toArray()).toEqual([10, 2, -4]);
    // Die Lampe steht jetzt woanders, die Sonne scheint aber unverändert: eine
    // gedrehte Richtung hieße, dass die Schatten beim Gehen wandern.
    const after = world.sun.target.position.clone().sub(world.sun.position).normalize();
    expect(after.distanceTo(before)).toBeLessThan(1e-6);
    expect(world.sun.position.distanceTo(world.sun.target.position)).toBeCloseTo(
      COMIC.shadowDistance,
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

    aimSun(world.sun, new THREE.Vector3(102, 0.4, 0), COMIC);
    world.scene.updateMatrixWorld(true);

    const anchor = world.sun.target.getWorldPosition(new THREE.Vector3());
    const lamp = world.sun.getWorldPosition(new THREE.Vector3());
    expect(anchor.toArray()).toEqual([102, 0, 0]);
    // In der Gruppe steht die Lampe woanders als in der Welt — genau das ist
    // die Umrechnung, um die es hier geht.
    expect(world.sun.position.x).not.toBeCloseTo(lamp.x, 3);
    expect(lamp.distanceTo(anchor)).toBeCloseTo(COMIC.shadowDistance, 5);
    expect(anchor.sub(lamp).normalize().distanceTo(before)).toBeLessThan(1e-6);
  });

  it('legt im Comic um jedes Ding eine Kontur — und nur um die Dinge', () => {
    const world = build();
    applySceneQuality(world.scene, COMIC);

    expect(outlineOf(world.crate)).not.toBeNull();
    // Eine Kulisse bekommt keine: Ein schwarzer Strich um den Horizont ist
    // kein Umriss, sondern ein Balken.
    expect(outlineOf(world.ground)).toBeNull();
    expect(outlineOf(world.glass)).toBeNull();
    expect(outlineOf(world.panel)).toBeNull();

    const outline = outlineOf(world.crate)!;
    expect(isOutline(outline)).toBe(true);
    // Die Kontur teilt die Geometrie ihres Dings — aufgeblasen wird im Shader,
    // nicht im Speicher.
    expect(outline.geometry).toBe(world.crate.geometry);
    expect(outline.material).not.toBe(world.crate.material);
    expect(outline.castShadow).toBe(false);
  });

  it('macht die Kontur für jeden Strahl zu Luft', () => {
    // Sonst greift die Hand nach dem Saum statt nach der Kiste — und hat dann
    // ein Kind der Kiste in der Hand statt der Kiste.
    const world = build();
    applySceneQuality(world.scene, COMIC);
    const hits: THREE.Intersection[] = [];
    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1));
    raycaster.intersectObject(world.crate, true, hits);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => hit.object === world.crate)).toBe(true);
  });

  it('nimmt die Kontur wieder ab und behandelt sie nie wie ein Ding', () => {
    const world = build();
    applySceneQuality(world.scene, COMIC);
    // Zweimal derselbe Durchlauf hängt keine zweite an — und gibt dem Saum
    // keinen eigenen Saum.
    applySceneQuality(world.scene, COMIC);
    expect(world.crate.children.filter(isOutline)).toHaveLength(1);
    expect(outlineOf(world.crate)!.children).toHaveLength(0);

    applySceneQuality(world.scene, SIMPLE);
    expect(outlineOf(world.crate)).toBeNull();
    expect(world.crate.children).toHaveLength(0);
  });

  it('gibt einem Wald aus Instanzen einen Saum je Baum', () => {
    // Ein `InstancedMesh` zeichnet vierhundert Bäume aus einer Geometrie; ein
    // gewöhnlicher Saum wäre einer davon, am Ursprung.
    const scene = new THREE.Scene();
    const trees = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 3, 8),
      new THREE.MeshStandardMaterial(),
      12,
    );
    scene.add(trees, new THREE.DirectionalLight(0xffffff, 1.6));
    applySceneQuality(scene, COMIC);

    const outline = outlineOf(trees) as THREE.InstancedMesh;
    expect(outline.isInstancedMesh).toBe(true);
    expect(outline.count).toBe(trees.count);
    // Dieselben Matrizen, nicht abgeschriebene: Ein Baum, der umfällt, nimmt
    // seinen Saum mit.
    expect(outline.instanceMatrix).toBe(trees.instanceMatrix);
  });

  it('schaltet im Comic die Farbstufen ein und in Einfach wieder aus', () => {
    const world = build();
    applySceneQuality(world.scene, COMIC);
    expect(lookOf(world.crate.material as THREE.Material)).toBe(3);

    applySceneQuality(world.scene, SIMPLE);
    expect(lookOf(world.crate.material as THREE.Material)).toBe(0);
  });

  it('lässt ein Ding aus, das ausdrücklich keinen Saum will', () => {
    // Die kleinen Modelle in den Menüzeilen: Sie leihen sich Material und
    // Geometrie vom Werkzeug und werden bei jeder Menüänderung neu gebaut.
    const world = build();
    denyOutline(world.crate);
    applySceneQuality(world.scene, COMIC);
    expect(outlineOf(world.crate)).toBeNull();
    expect(outlineOf(world.glass)).toBeNull();
  });

  it('räumt Säume aus einer Kopie wieder heraus', () => {
    // `Object3D.clone()` nimmt den Saum mit, und die Kopie verlöre dabei sein
    // leeres `raycast` — man könnte nach ihm greifen.
    const world = build();
    applySceneQuality(world.scene, COMIC);
    const copy = world.crate.clone(true);
    expect(copy.children.some(isOutline)).toBe(true);

    expect(stripOutlines(copy)).toBe(1);
    expect(copy.children).toHaveLength(0);
    // Und das Original behält seinen — samt einem Material, das noch lebt:
    // Ein Klon schreibt nur den Zeiger darauf ab, und es beim Aufräumen der
    // Kopie zu entsorgen hieße, dem Original die Kante abzuschalten.
    const outline = outlineOf(world.crate)!;
    expect(outline).not.toBeNull();
    const material = outline.material as THREE.ShaderMaterial;
    expect(material.uniforms['thickness']!.value).toBe(COMIC.outlineWidth);
  });
});
