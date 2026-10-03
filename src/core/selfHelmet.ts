import * as THREE from 'three';
import { canLoadModels } from './chefFit';
import { CALIBRATION_HAT, KAYKIT_HEAD, MODEL_HATS, type ModelHatKind } from './figureParts';
import { disposeCalibration, viewCalibration } from './viewCalibration';
import { LAYER_EYE } from './viewLayers';
import { graphics, onGraphicsChange, type GraphicsSettings } from './graphicsSettings';
import { breathFog } from './visorBreath';
import { visorFog, type VisorFog } from './visorFog';

/**
 * **Der Helm um den eigenen Kopf** — für den Spieler in der Brille, und nur
 * für ihn.
 *
 * Gewünscht: _„Bei dem Immersive will ich dass der charakter des spieler
 * normal den helm auf hat, aber zusätzlich für den VR spieler der Helm um ihn
 * herum (nur für ihn sichtbar) getragen wird, sodass es das gefühl hat den
 * helm zu tragen."_ Die Figur trägt ihn also wie jeden anderen Hut
 * (`AvatarBody`, `figureParts.IMMERSIVE_HAT`) — die sieht man aber nicht aus
 * den eigenen Augen (`LAYER_SELF_ONLY`). Dieser hier ist **ein zweiter**,
 * derselbe Helm in **Menschengröße**, an der Kamera:
 *
 * - **Nur das Auge sieht ihn** (`LAYER_EYE`): Spiegel, Portale und die
 *   Kamera von oben nehmen die Ebene heraus (`viewLayers`), und über das Netz
 *   geht er nie — dort ist man die Figur mit ihrem Helm.
 * - **Von innen**: Die Netze des Regals sind einseitig, von innen sähe man
 *   durch sie hindurch. Die Kopie bekommt eigene Materialien mit beiden
 *   Seiten; das Visier bleibt durchsichtig, nur etwas klarer als außen.
 * - **Um das Auge herum**: Das Auge steht dort, wo der KayKit-Kopf seine
 *   Augen hat (`KAYKIT_HEAD.eyeY`), quer in der Mitte, und der Helm wird auf
 *   eine Breite gebracht, in der ein echter Kopf Platz hat (`WIDTH`).
 *
 * In der Brille und am Schirm in der Ansicht _Aus den Augen_ (`App`) —
 * gewünscht, _„dann kann ich es auch am pc testen wie es dort aussieht"_. Von
 * oben schaut eine andere Kamera, und die zeichnet die Ebene nicht.
 *
 * **Und das Visier beschlägt**, wenn man es will (_Grafik → Visier / Atem_,
 * `graphicsSettings.visorBreath`): Auf jedem Glas des Helms liegt eine zweite
 * Haut (`core/visorFog.ts`), wie dicht, rechnet `core/visorBreath.ts` im Takt
 * eines ruhigen Atems.
 */

/** Wie breit der Helm um den echten Kopf ist, in Metern. */
const WIDTH = 0.4;
/** Das Visier von innen: genug Tönung, um es zu spüren, nicht genug, um zu stören. */
const VISOR_OPACITY = 0.18;

export class SelfHelmet {
  private helmet: THREE.Group | null = null;
  private pending = false;
  private kind: ModelHatKind | null = null;
  private camera: THREE.Camera | null = null;
  private era = 0;
  /** Das Gradnetz des Kalibrier-Helms (`core/viewCalibration.ts`) — sonst `null`. */
  private calibration: THREE.Group | null = null;
  /** Der Beschlag je Visierglas — leer, solange kein Helm hängt. */
  private fogs: VisorFog[] = [];
  /** Die Atemuhr, in Sekunden. */
  private time = 0;
  /** Die Einstellung, gemerkt statt je Bild aus dem Speicher gelesen. */
  private settings: GraphicsSettings = graphics();
  private readonly stopGraphics = onGraphicsChange(() => (this.settings = graphics()));

  /**
   * **Je Bild**: `kind` ist der Hut, um den es geht, oder `null` — dann ist
   * nichts an der Kamera.
   */
  update(camera: THREE.Camera, kind: ModelHatKind | null, dt = 0): void {
    if (kind !== this.kind || camera !== this.camera) {
      this.drop();
      this.kind = kind;
      this.camera = camera;
      if (kind) this.fetch(camera, kind);
    }
    if (this.fogs.length === 0) return;
    if (Number.isFinite(dt) && dt > 0) this.time += dt;
    const { visorBreath, visorBreathStyle } = this.settings;
    const fog = breathFog(visorBreath, this.time);
    for (const one of this.fogs) one.set(fog, visorBreathStyle);
  }

  dispose(): void {
    this.drop();
    this.stopGraphics();
    this.kind = null;
    this.camera = null;
  }

  private fetch(camera: THREE.Camera, kind: ModelHatKind): void {
    if (!canLoadModels() || this.pending) return;
    const era = ++this.era;
    this.pending = true;
    void import('./figurePartModels')
      .then(async (module) => module.loadFigurePart(MODEL_HATS[kind]))
      .then((piece) => {
        this.pending = false;
        if (!piece || era !== this.era) return;
        const helmet = fitAroundEye(piece);
        this.fogs = fogVisors(helmet);
        camera.layers.enable(LAYER_EYE);
        camera.add(helmet);
        this.helmet = helmet;
        // **Der Kalibrier-Helm** bringt sein Gradnetz mit — an der Kamera
        // selbst, nicht am Helm: Die Winkel gelten vom Auge aus.
        if (kind === CALIBRATION_HAT) {
          this.calibration = viewCalibration();
          camera.add(this.calibration);
        }
      });
  }

  private drop(): void {
    this.era++;
    this.pending = false;
    for (const fog of this.fogs) fog.dispose();
    this.fogs = [];
    if (this.calibration) disposeCalibration(this.calibration);
    this.calibration = null;
    const helmet = this.helmet;
    this.helmet = null;
    if (!helmet) return;
    helmet.removeFromParent();
    // Nur die eigenen Materialien — Geometrie und Textur gehören der Vorlage
    // im Regal (`figurePartModels`).
    helmet.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        material.dispose();
      }
    });
  }
}

/**
 * **Das Stück um das Auge legen**: gedreht (KayKit schaut nach +Z, die Kamera
 * nach −Z), auf `WIDTH` gebracht, mit dem Auge im Ursprung — und von innen
 * sichtbar.
 */
export function fitAroundEye(piece: THREE.Group): THREE.Group {
  piece.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(piece);
  const wide = box.max.x - box.min.x;
  const scale = wide > 1e-6 ? WIDTH / wide : 1;
  const centreZ = (box.min.z + box.max.z) / 2;
  piece.position.set(0, -KAYKIT_HEAD.eyeY, -centreZ);

  const holder = new THREE.Group();
  holder.name = 'self-helmet';
  holder.rotation.y = Math.PI;
  holder.scale.setScalar(scale);
  holder.add(piece);
  holder.traverse((object) => {
    object.layers.set(LAYER_EYE);
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    // Nah am Auge schneidet die Kamera sonst Stücke aus dem Helm.
    mesh.frustumCulled = false;
    const own = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((source) => {
      const material = source.clone();
      material.side = THREE.DoubleSide;
      if (material.transparent) material.opacity = Math.min(material.opacity, VISOR_OPACITY);
      return material;
    });
    mesh.material = Array.isArray(mesh.material) ? own : own[0]!;
  });
  return holder;
}

/**
 * **Wann Glas und Beschlag gezeichnet werden: vor dem Menü.** Gewünscht: _„dass
 * das menü weiterhin über dem bild atem gerendert wird"_. Der Bildschirm in
 * der Brille (`ui/XRMenu.ts`) steht zwar zwei Meter draußen, zeichnet aber im
 * Durchgang der **festen** Dinge mit `PANEL_ORDER` und `AlwaysDepth` über
 * alles. Durchsichtiges kommt in three.js immer erst danach — Glas und
 * Beschlag lägen so milchig über dem Menü und über dem Loch, durch das die
 * Brille die scharfe Menü-Ebene zeigt. Deshalb stehen beide im festen
 * Durchgang, kurz vor dem Panel (`GLASS_ORDER`, `FOG_ORDER`), und mischen
 * trotzdem (`CustomBlending`, ohne Tiefe zu schreiben): Erst die Welt, dann
 * Glas und Beschlag darüber, dann das Menü über allem.
 */
export const GLASS_ORDER = 8;
export const FOG_ORDER = 9;

/** Ein Material, das im festen Durchgang zeichnet und trotzdem durchscheint. */
export function blendBeforeMenu(material: THREE.Material): void {
  material.transparent = false;
  material.blending = THREE.CustomBlending;
  material.blendEquation = THREE.AddEquation;
  material.blendSrc = THREE.SrcAlphaFactor;
  material.blendDst = THREE.OneMinusSrcAlphaFactor;
  material.blendSrcAlpha = THREE.OneFactor;
  material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  material.depthWrite = false;
  material.needsUpdate = true;
}

/**
 * **Auf jedes Glas eine Haut für den Beschlag** (`core/visorFog.ts`). Glas ist,
 * was durchsichtig ist — beim Space Ranger genau das Visier. Die Haut hängt
 * als Kind am Glas, teilt seine Geometrie und liegt damit genau darauf. Beide
 * zeichnen vor dem Menü (`blendBeforeMenu`).
 */
export function fogVisors(helmet: THREE.Object3D): VisorFog[] {
  const glass: THREE.Mesh[] = [];
  helmet.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.some((material) => material.transparent)) glass.push(mesh);
  });
  return glass.map((mesh) => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) if (material.transparent) blendBeforeMenu(material);
    mesh.renderOrder = GLASS_ORDER;
    const fog = visorFog();
    fog.fit(mesh.geometry);
    const skin = new THREE.Mesh(mesh.geometry, fog.material);
    skin.name = 'visor-fog';
    skin.layers.set(LAYER_EYE);
    skin.frustumCulled = false;
    blendBeforeMenu(fog.material);
    skin.renderOrder = FOG_ORDER;
    mesh.add(skin);
    return fog;
  });
}
