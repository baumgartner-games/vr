import * as THREE from 'three';

/**
 * Die VR-Welt durchsichtig schalten — der **AR-Knopf** im Schießgang.
 *
 * Beim Justieren einer Handhaltung ist die Frage immer dieselbe: liegt die
 * virtuelle Hand da, wo die echte liegt? Solange die VR-Welt die Sicht
 * zumauert, kann man sie nur raten. Also wird sie weggeblendet: Wände, Boden,
 * Decke und alles darin werden durchsichtig, der Himmel verschwindet, und
 * übrig bleibt das, worum es geht — die Hand, das Werkzeug und die Zielscheibe.
 *
 * Ob dahinter das **echte Zimmer** auftaucht, entscheidet nicht dieser
 * Schalter, sondern die laufende Sitzung: nur ein Headset, das gerade eine
 * `immersive-ar`-Sitzung fährt, mischt sein Kamerabild dazu
 * (`environmentBlendMode` ist dann nicht `opaque`). `App.enterVR` fragt
 * deshalb zuerst nach `immersive-ar` und fällt auf `immersive-vr` zurück —
 * wo das nicht geht, bleibt der Knopf trotzdem nützlich: eine durchsichtige
 * Welt verdeckt die Hand nicht mehr.
 *
 * Angefasst wird jedes Material **einmal**, mit gemerktem Vorzustand. Ein
 * Material, das zwei Objekten gehört (und in dieser Welt gehören die meisten
 * mehreren), darf nicht zweimal gedimmt und einmal zurückgesetzt werden.
 */
export class SeeThrough {
  /** Wie ein Material aussah, bevor es durchsichtig wurde. */
  private readonly saved = new Map<
    THREE.Material,
    { transparent: boolean; opacity: number; depthWrite: boolean }
  >();
  private background: THREE.Scene['background'] | null = null;
  private on = false;

  /** Ob gerade durchgeschaut wird. */
  get active(): boolean {
    return this.on;
  }

  /**
   * Zeigt das Headset hinter der Welt sein Kamerabild? Nur dann ist das hier
   * wirklich AR und nicht bloß eine dünne Welt.
   */
  static passthrough(renderer: THREE.WebGLRenderer): boolean {
    const session = renderer.xr.getSession() as { environmentBlendMode?: string } | null;
    const mode = session?.environmentBlendMode;
    return Boolean(mode) && mode !== 'opaque';
  }

  /**
   * @param scene  die Szene, deren Himmel weichen muss
   * @param root   die Welt, die durchsichtig wird
   * @param opacity wie viel von ihr stehen bleibt — genug, um Wände als Wände
   *                zu erkennen, wenig genug, um durch sie hindurchzusehen
   */
  apply(
    on: boolean,
    scene: THREE.Scene,
    root: THREE.Object3D,
    renderer: THREE.WebGLRenderer,
    opacity = 0.18,
  ): void {
    if (on === this.on) return;
    this.on = on;
    if (on) {
      this.background = scene.background;
      scene.background = null;
      // Ohne durchsichtigen Hintergrund liegt im Passthrough-Bild ein
      // schwarzes Tuch über dem Zimmer.
      renderer.setClearAlpha(0);
      root.traverse((object) => this.dim(object, opacity));
      return;
    }

    for (const [material, before] of this.saved) {
      material.transparent = before.transparent;
      material.opacity = before.opacity;
      material.depthWrite = before.depthWrite;
      material.needsUpdate = true;
    }
    this.saved.clear();
    scene.background = this.background;
    this.background = null;
    renderer.setClearAlpha(1);
  }

  /** Zurück auf undurchsichtig, ohne dass jemand den Knopf drücken muss. */
  reset(scene: THREE.Scene, root: THREE.Object3D, renderer: THREE.WebGLRenderer): void {
    this.apply(false, scene, root, renderer);
  }

  private dim(object: THREE.Object3D, opacity: number): void {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh && !(object as THREE.Line).isLine) return;
    const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[];
    const list = Array.isArray(material) ? material : [material];
    for (const entry of list) {
      if (!entry || this.saved.has(entry)) continue;
      this.saved.set(entry, {
        transparent: entry.transparent,
        opacity: entry.opacity,
        depthWrite: entry.depthWrite,
      });
      entry.transparent = true;
      entry.opacity = Math.min(entry.opacity, opacity);
      // Ohne das schreibt die durchsichtige Wand weiter Tiefe und schneidet
      // alles weg, was hinter ihr steht — die Zielscheibe zum Beispiel.
      entry.depthWrite = false;
      entry.needsUpdate = true;
    }
  }
}
