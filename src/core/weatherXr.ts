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
 * - **Nebel** als `THREE.FogExp2` in der Farbe des Wetter-Nebels. Liegt nicht
 *   am Boden wie am Schirm, sondern wächst mit der Entfernung — dafür in jedem
 *   Material, ohne eigenen Shader. Eine Welt mit eigenem Nebel (Hub, Station)
 *   behält ihren.
 *
 * - **Der Himmel** (`shared/environment.createSky`) zeichnet mit eigenem
 *   Shader ohne Belichtung — seine zwei Farben werden deshalb selbst getönt:
 *   nach der Tageszeit und, bei Nebel, zur Nebelfarbe hin.
 *
 * Der Filter (Sättigung, Vignette) fehlt in der Brille.
 *
 * **Im Weltbau ist das Gestell zehnfach groß** (`PlayerRig.startFlight`), und
 * three.js rechnet den Nebel in den Metern der Kamera — ein Meter der Welt ist
 * dort ein Zehntel. Die Dichte geht deshalb mit dem Maßstab (`scale`).
 */

/** Wie dicht der Nebel je Meter ist, bei voller Stärke des Wetter-Nebels. */
const FOG_DENSITY = 0.045;
const _fog = new THREE.Color();
/** Die Belichtung, die die App ohne Wetter setzt (`App`, `toneMappingExposure`). */
export const BASE_EXPOSURE = 1.05;

interface SkyColors {
  readonly material: THREE.ShaderMaterial;
  readonly top: THREE.Color;
  readonly bottom: THREE.Color;
}

export class WeatherXr {
  private fog: THREE.FogExp2 | null = null;
  private dimmed = false;
  /** Der Himmel der Welt und seine Farben von vorher — `null`: keiner gefunden. */
  private sky: SkyColors | null = null;
  /** Bilder bis zum nächsten Nachsehen, ob der Himmel noch derselbe ist. */
  private skyCheck = 0;

  /**
   * In jedem Bild: `look` ist das Wetter, wie es am Schirm wäre, `null` ohne
   * Wetter oder am Schirm (dort macht es der Durchgang).
   */
  apply(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    look: WeatherLook | null,
    scale: number,
  ): void {
    if (!look) {
      this.clear(scene, renderer);
      return;
    }
    const [r, g, b] = look.light;
    const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const exposure = Math.max(0.3, Math.min(1, brightness));
    renderer.toneMappingExposure = BASE_EXPOSURE * exposure;
    this.dimmed = true;
    this.tintSky(scene, look, exposure);
    const ours = this.fog !== null && scene.fog === this.fog;
    if (look.fogStrength <= 0) {
      if (ours) scene.fog = null;
      return;
    }
    // Eine Welt mit eigenem Nebel behält ihn.
    if (scene.fog && !ours) return;
    const fog = (this.fog ??= new THREE.FogExp2(0x000000, 0));
    fog.color.setRGB(look.fogColor[0], look.fogColor[1], look.fogColor[2]);
    fog.density = FOG_DENSITY * look.fogStrength * Math.max(1, scale);
    scene.fog = fog;
  }

  /** Die zwei Farben des Himmels: mal dem Licht der Tageszeit, zur Nebelfarbe hin. */
  private tintSky(scene: THREE.Scene, look: WeatherLook, exposure: number): void {
    const sky = this.findSky(scene);
    if (!sky) return;
    const fog = Math.min(0.85, look.fogStrength);
    const paint = (base: THREE.Color, target: THREE.Color): void => {
      target.setRGB(
        base.r * look.light[0] * exposure,
        base.g * look.light[1] * exposure,
        base.b * look.light[2] * exposure,
      );
      _fog.setRGB(look.fogColor[0], look.fogColor[1], look.fogColor[2]);
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
      this.sky = { material, top: top.clone(), bottom: bottom.clone() };
    }
    return this.sky;
  }

  private restoreSky(): void {
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
