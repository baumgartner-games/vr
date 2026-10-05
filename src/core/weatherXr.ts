import * as THREE from 'three';
import type { WeatherLook } from './weather';

/**
 * **Das Wetter in der Brille** — Nebel und Nacht ohne den Bild-Durchgang.
 *
 * Am Schirm geht das Bild durch einen Durchgang über den ganzen Schirm
 * (`core/levelBlur.ts`): Nebel aus der Tiefe, Nacht als Färbung, Filter. In der
 * Brille zeichnet three.js ohne Umweg in die Augen der Brille, und dieser
 * Durchgang fehlt. Gemeldet, im Weltbau mit der Brille: _„Auch klappt der
 * nebel dort nicht."_ Also bekommt die Brille, was ohne Durchgang geht:
 *
 * - **Nacht** über die Belichtung (`renderer.toneMappingExposure`): dunkler
 *   nach der Helligkeit der Tageszeit. Was selbst leuchtet — der Schein der
 *   Lampen ist heller als 1 — bleibt sichtbar.
 * - **Nebel** als `THREE.Fog` (linear) in der Farbe des Wetter-Nebels. Liegt
 *   nicht am Boden wie am Schirm, sondern wächst mit der Entfernung — dafür in
 *   jedem Material, ohne eigenen Shader. Wie am Schirm ist es um einen herum
 *   klar und wird nach ein paar Metern dicht: am Boden ab 3 m, voll bei der
 *   Sichtweite (Dicht, Spuk) bis 60 m (Dunst); im Weltbau beginnt er erst unter einem, bei der
 *   halben Augenhöhe, und reicht um anderthalb Augenhöhen weiter. Zuerst war es ein `FogExp2`, der mit dem Quadrat der
 *   Entfernung wächst — gemeldet: _„Wenn ich im vr Modus unten auf der Straße
 *   bin habe ich keinen Nebel?"_ (auf 10 m kaum acht Prozent). Eine Welt mit
 *   eigenem Nebel (Hub, Station) behält ihren.
 *
 * - **Der Himmel** (`shared/environment.createSky`) zeichnet mit eigenem
 *   Shader ohne Belichtung — seine zwei Farben werden deshalb selbst getönt:
 *   nach der Tageszeit und, bei Nebel, zur Nebelfarbe hin.
 *
 * Der Filter (Sättigung, Vignette) fehlt in der Brille.
 *
 * **Im Weltbau ist das Gestell zehnfach groß** (`PlayerRig.startFlight`), und
 * three.js rechnet den Nebel in den Metern der Kamera — ein Meter der Welt ist
 * dort ein Zehntel. Die Abstände werden deshalb durch den Maßstab geteilt.
 */

/** Bis wohin es um einen herum klar bleibt, in Metern — mindestens, und als Anteil der Augenhöhe. */
const FOG_CLEAR = 3;
const FOG_CLEAR_EYE = 0.5;
/** Wie viele Meter der Nebel bis ganz dicht braucht — geteilt durch seine Stärke. */
const FOG_SPAN = 18;
const _fog = new THREE.Color();
/** Die Belichtung, die die App ohne Wetter setzt (`App`, `toneMappingExposure`). */
export const BASE_EXPOSURE = 1.05;

interface SkyColors {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  readonly top: THREE.Color;
  readonly bottom: THREE.Color;
}

export class WeatherXr {
  private fog: THREE.Fog | null = null;
  private dimmed = false;
  /** Der Himmel der Welt und seine Farben von vorher — `null`: keiner gefunden. */
  private sky: SkyColors | null = null;
  /** Bilder bis zum nächsten Nachsehen, ob der Himmel noch derselbe ist. */
  private skyCheck = 0;
  /** Der Hintergrund der Welt, solange der Nebel ihn färbt (`cull`) — `undefined`: nichts gemerkt. */
  private background: THREE.Scene['background'] | undefined = undefined;
  private backgroundColor: THREE.Color | null = null;
  /** Wo die Himmelskuppel stand, solange sie im Nebel steht (`pullSky`). */
  private skyPose: { position: THREE.Vector3; scale: THREE.Vector3 } | null = null;

  /**
   * In jedem Bild: `look` ist das Wetter, wie es am Schirm wäre, `null` ohne
   * Wetter oder am Schirm (dort macht es der Durchgang).
   */
  apply(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    look: WeatherLook | null,
    scale: number,
    eye: number,
    baseFar: number,
  ): void {
    if (!look) {
      this.clear(scene, renderer);
      this.cull(scene, camera, baseFar, null);
      return;
    }
    const [r, g, b] = look.light;
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const exposure = Math.max(0.3, Math.min(1, brightness));
    renderer.toneMappingExposure = BASE_EXPOSURE * exposure;
    this.dimmed = true;
    this.tintSky(scene, look, exposure);
    const ours = this.fog !== null && scene.fog === this.fog;
    // Eine Welt mit eigenem Nebel behält ihn.
    if (look.fogStrength <= 0 || (scene.fog && !ours)) {
      if (ours && look.fogStrength <= 0) scene.fog = null;
      this.cull(scene, camera, baseFar, null);
      return;
    }
    // In Metern der Welt gerechnet, in Metern der Kamera gesetzt (`scale`).
    const s = Math.max(1, scale);
    const near = Math.max(Math.min(FOG_CLEAR, look.fogClear), eye * FOG_CLEAR_EYE);
    // Wer von oben schaut, soll die Stadt unter sich noch sehen: Die Strecke
    // bis ganz dicht wächst mit der Augenhöhe.
    // Ein deckender Nebel ist genau bei der Sichtweite dicht (_Wetter →
    // Sichtweite im Nebel_), wie am Schirm.
    const far = look.fogOpaque
      ? Math.max(near + 1, look.fogFull) + eye * 1.5
      : near + FOG_SPAN / Math.max(0.2, look.fogStrength) + eye * 1.5;
    const fog = (this.fog ??= new THREE.Fog(0x000000, 1, 2));
    fog.color.setRGB(look.fogColor[0], look.fogColor[1], look.fogColor[2]);
    fog.near = near / s;
    fog.far = far / s;
    scene.fog = fog;
    // **Was hinter dem Nebel liegt, wird nicht gezeichnet** — nur am Boden
    // (nicht im Weltbau) und nur, wenn er deckt.
    this.cull(scene, camera, baseFar, look.fogOpaque && s <= 1.001 ? far : null);
  }

  /**
   * **Die Fernebene an den Nebel** — gewünscht: _„Wir könnten den Nebel auch
   * nutzen um Rendering zu sparen von Dingen die dahinter sind (Nebel dicht),
   * zumindest wenn man im Nebel steht und nicht vom Haus schaut"_. Steht man
   * in deckendem Nebel, ist hinter seinem Ende nichts zu sehen; die Kamera hört
   * dort auf, und was dahinter steht, fällt aus dem Sichtkegel und wird nicht
   * gezeichnet. Die Himmelskuppel liegt dann auch dahinter — der Hintergrund
   * bekommt solange die Farbe des Nebels.
   *
   * Nur in der Brille am Boden: Von oben (Weltbau, Ansicht von oben am
   * Schirm) steht die Kamera über dem Nebel, und alles ist zu sehen. `far`
   * `null` heißt: zurück auf die Fernebene der App (`baseFar`).
   */
  private cull(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    baseFar: number,
    far: number | null,
  ): void {
    const wanted = far === null ? baseFar : Math.min(baseFar, far * 1.05 + 1);
    if (Math.abs(camera.far - wanted) > 1e-3) {
      camera.far = wanted;
      camera.updateProjectionMatrix();
    }
    if (far !== null && this.fog) {
      if (this.background === undefined) this.background = scene.background;
      const color = (this.backgroundColor ??= new THREE.Color());
      color.copy(this.fog.color);
      scene.background = color;
      this.pullSky(camera, wanted);
    } else if (this.background !== undefined) {
      if (scene.background === this.backgroundColor) scene.background = this.background;
      this.background = undefined;
      this.releaseSky();
    }
  }

  /**
   * **Die Himmelskuppel in den Nebel holen** — sie liegt 560 m weit
   * (`SKY_RADIUS`) und damit hinter der Fernebene. Die Brille zeichnet keinen
   * Hintergrund (eine AR-Sitzung sieht durch ihn hindurch), der Himmel wäre
   * schwarz. Solange abgeschnitten wird, steht die Kuppel deshalb um den Kopf,
   * knapp vor der Fernebene, ganz in Nebelfarbe (`tintSky`).
   */
  private pullSky(camera: THREE.PerspectiveCamera, far: number): void {
    const sky = this.sky;
    if (!sky) return;
    if (!this.skyPose) {
      this.skyPose = { position: sky.mesh.position.clone(), scale: sky.mesh.scale.clone() };
    }
    const radius = (sky.mesh.geometry as THREE.SphereGeometry).parameters?.radius ?? far;
    camera.getWorldPosition(sky.mesh.position);
    sky.mesh.parent?.worldToLocal(sky.mesh.position);
    sky.mesh.scale.setScalar((far * 0.9) / radius);
  }

  private releaseSky(): void {
    if (!this.skyPose) return;
    if (this.sky) {
      this.sky.mesh.position.copy(this.skyPose.position);
      this.sky.mesh.scale.copy(this.skyPose.scale);
    }
    this.skyPose = null;
  }

  /** Die zwei Farben des Himmels: mal dem Licht der Tageszeit, zur Nebelfarbe hin. */
  private tintSky(scene: THREE.Scene, look: WeatherLook, exposure: number): void {
    const sky = this.findSky(scene);
    if (!sky) return;
    // Ein deckender Nebel deckt auch den Himmel — die Kuppel ist dann ganz Nebel.
    const fog = look.fogOpaque ? 1 : Math.min(0.85, look.fogStrength);
    const paint = (base: THREE.Color, target: THREE.Color): void => {
      target.setRGB(
        base.r * look.light[0] * exposure,
        base.g * look.light[1] * exposure,
        base.b * look.light[2] * exposure,
      );
      // Der Shader der Kuppel gibt seine Farbe ohne Umrechnung aus — damit sie
      // zum Nebel auf den Dingen passt, schon hier in sRGB.
      _fog.setRGB(look.fogColor[0], look.fogColor[1], look.fogColor[2]).convertLinearToSRGB();
      target.lerp(_fog, fog);
    };
    paint(sky.top, sky.material.uniforms['topColor']!.value as THREE.Color);
    paint(sky.bottom, sky.material.uniforms['bottomColor']!.value as THREE.Color);
  }

  /** Den Himmel der Welt finden — einmal je Sekunde neu, falls die Welt gewechselt hat. */
  private findSky(scene: THREE.Scene): SkyColors | null {
    if (this.skyCheck-- > 0 && this.sky) return this.sky;
    this.skyCheck = 60;
    const mesh = scene.getObjectByName('sky') as THREE.Mesh | undefined;
    const material = mesh?.material as THREE.ShaderMaterial | undefined;
    const top = material?.uniforms?.['topColor']?.value as THREE.Color | undefined;
    const bottom = material?.uniforms?.['bottomColor']?.value as THREE.Color | undefined;
    if (!material || !top || !bottom) {
      this.restoreSky();
      return null;
    }
    if (this.sky?.material !== material) {
      this.restoreSky();
      this.sky = { mesh: mesh!, material, top: top.clone(), bottom: bottom.clone() };
    }
    return this.sky;
  }

  private restoreSky(): void {
    this.releaseSky();
    if (!this.sky) return;
    (this.sky.material.uniforms['topColor']!.value as THREE.Color).copy(this.sky.top);
    (this.sky.material.uniforms['bottomColor']!.value as THREE.Color).copy(this.sky.bottom);
    this.sky = null;
  }

  private clear(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
    if (this.dimmed) {
      renderer.toneMappingExposure = BASE_EXPOSURE;
      this.dimmed = false;
      this.restoreSky();
    }
    if (this.fog && scene.fog === this.fog) scene.fog = null;
  }
}
