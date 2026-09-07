import * as THREE from 'three';
import {
  graphics,
  graphicsProfile,
  onGraphicsChange,
  type GraphicsProfile,
  type GraphicsSettings,
} from './graphicsSettings';
import { aimSun, applySceneQuality } from './graphicsScene';

/**
 * Der Teil der Grafikeinstellung, der three.js anfasst.
 *
 * Er sitzt bei der App und nicht bei einer Welt: Ein Schatten ist keine
 * Eigenschaft des Portallabors, sondern eine des Bildes, und wer im Hub
 * umschaltet, will es im Gokart auch so haben. Die Welten selbst bleiben
 * unverändert — sie bauen weiter Quader mit Farben, und was daraus wird,
 * entscheidet diese Datei.
 *
 * Zwei Dinge tut sie:
 *
 * - **Den Renderer stellen** — Schattenkarte an oder aus, Schärfe und Foveation
 *   der Brille. Einmal beim Umschalten.
 * - **Die Szene ablaufen** — wer wirft Schatten, wer bekommt Farbstufen und
 *   eine Kontur (`graphicsScene.ts`). Nicht einmal, sondern immer wieder: In
 *   diesen Welten kommen Dinge nach, und ein Zombie ohne Schatten neben einem
 *   mit sieht schlimmer aus als eine Welt ganz ohne.
 *
 * Und **der Schattenkasten wandert mit dem Kopf**: Eine Schattenkarte deckt ein
 * paar Dutzend Meter ab, die Welten hier reichen bis zum Horizont.
 *
 * Ein Drittes stand hier einmal: das **Umgebungsbild** — sechs kleine Bilder
 * vom Himmel der Welt, damit Metall etwas zu spiegeln hatte. Es gehörte zur
 * Stufe *Schön*, und die gibt es nicht mehr.
 */
export class GraphicsQuality {
  private settings: GraphicsSettings;
  private profile: GraphicsProfile;
  private sun: THREE.DirectionalLight | null = null;
  /** Sekunden seit dem letzten Durchlauf über die Szene. */
  private since = Number.POSITIVE_INFINITY;
  private readonly stopListening: () => void;

  /**
   * Wie oft die Szene abgelaufen wird.
   *
   * Ein Kompromiss und als solcher gemeint: Sofort wäre pro Bild einmal durch
   * ein paar tausend Objekte, nie wäre eine halbe Welt ohne Schatten. Eine
   * Sekunde ist lang genug, dass es nicht auffällt, und kurz genug, dass es
   * auch nicht auffällt.
   */
  private static readonly RESCAN = 1;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
  ) {
    this.settings = graphics();
    this.profile = graphicsProfile(this.settings);
    this.stopListening = onGraphicsChange(() => this.refresh());
    this.applyRenderer();
  }

  /** Neue Welt: neue Lichter, alles noch einmal. */
  worldChanged(): void {
    this.sun = null;
    this.since = Number.POSITIVE_INFINITY;
  }

  /** Läuft in jedem Bild, vor dem Zeichnen. */
  update(dt: number, head: THREE.Vector3): void {
    this.since += dt;
    if (this.since >= GraphicsQuality.RESCAN) {
      this.since = 0;
      this.sun = applySceneQuality(this.scene, this.profile);
    }

    if (!this.profile.shadows) return;
    if (this.sun) aimSun(this.sun, head, this.profile);
    // Bestellt wird die Schattenkarte einmal pro Bild — `autoUpdate` ist aus,
    // damit Spiegel und Portalsichten sie nicht jedes Mal neu bauen lassen.
    this.renderer.shadowMap.needsUpdate = true;
  }

  dispose(): void {
    this.stopListening();
  }

  /** Nach einer Änderung im Menü: alles neu stellen, sofort sichtbar. */
  private refresh(): void {
    const before = this.profile;
    this.settings = graphics();
    this.profile = graphicsProfile(this.settings);
    this.applyRenderer();
    this.sun = applySceneQuality(this.scene, this.profile, before.shadows !== this.profile.shadows);
    this.since = 0;
  }

  private applyRenderer(): void {
    const renderer = this.renderer;
    renderer.shadowMap.enabled = this.profile.shadows;
    // `PCFShadowMap` und nicht `PCFSoftShadowMap`: Die weiche Fassung ist seit
    // three r185 abgemeldet und fällt intern ohnehin auf diese zurück — sie
    // kostete nur noch eine Warnung pro Bild in der Konsole.
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.xr.setFoveation(this.profile.foveation);
    // Die Brille nimmt die Puffergröße nur beim Aufsetzen entgegen; mitten in
    // der Sitzung wäre der Aufruf nichts als eine Warnung in der Konsole.
    if (!renderer.xr.isPresenting) {
      renderer.xr.setFramebufferScaleFactor(this.profile.framebufferScale);
    }
  }
}
