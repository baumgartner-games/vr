import * as THREE from 'three';

/**
 * **Kein Nebel über dem Menü** — gewünscht: _„der nebel soll nicht über dem
 * menü liegen"_.
 *
 * In der Brille ist der Nebel ein `THREE.Fog` an der Szene (`core/weatherXr`),
 * und den bekommt jedes Material, das `fog` nicht ausdrücklich abschaltet. Das
 * Menü steht zwei Meter vor dem Kopf, im Weltbau aber zwanzig Meter Welt
 * weit (`BUILD_SCALE`) — und damit mitten im Nebel.
 *
 * `material.fog = false` reicht dafür nicht: Die kleinen Modelle im Menü
 * teilen ihre Materialien mit der Vorlage im Speicher (`core/kaykitModel`)
 * und damit mit allem, was in der Welt steht. Abgeschaltet wird deshalb **je
 * Ding**: Vor dem eigenen Zug nimmt es der Szene den Nebel, danach gibt es ihn
 * zurück. three liest `scene.fog` erst nach `onBeforeRender`
 * (`WebGLRenderer.setProgram`), es gilt also genau für diesen Zug.
 * Ein Handler, der schon dran hing (ein Schild, das sich zur Kamera dreht,
 * `ui/billboard.ts`), läuft weiter.
 */

const hooked = new WeakSet<THREE.Object3D>();
let held: THREE.Scene['fog'] = null;

/**
 * Alles Gezeichnete unter `root` aus dem Nebel nehmen — auch, was seit dem
 * letzten Aufruf dazugekommen ist. Billig genug für jedes Bild: Was schon
 * eingehängt ist, wird übersprungen.
 */
export function keepOutOfFog(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (hooked.has(node)) return;
    const drawn = node as Partial<THREE.Mesh>;
    if (
      !drawn.isMesh &&
      !(node as Partial<THREE.Line>).isLine &&
      !(node as Partial<THREE.Sprite>).isSprite
    )
      return;
    hooked.add(node);
    const before = node.onBeforeRender.bind(node);
    const after = node.onAfterRender.bind(node);
    node.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      before(renderer, scene, camera, geometry, material, group);
      held = scene.fog;
      scene.fog = null;
    };
    node.onAfterRender = (renderer, scene, camera, geometry, material, group) => {
      scene.fog = held;
      held = null;
      after(renderer, scene, camera, geometry, material, group);
    };
  });
}
