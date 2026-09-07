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
 * Drei Dinge tut sie:
 *
 * - **Den Renderer stellen** — Schattenkarte an oder aus, Schärfe und Foveation
 *   der Brille. Einmal beim Umschalten.
 * - **Die Szene ablaufen** — wer wirft Schatten, wer bekommt Körnung
 *   (`graphicsScene.ts`). Nicht einmal, sondern immer wieder: In diesen Welten
 *   kommen Dinge nach, und ein Zombie ohne Schatten neben einem mit sieht
 *   schlimmer aus als eine Welt ganz ohne.
 * - **Das Umgebungsbild rechnen** — sechs kleine Bilder vom Himmel der Welt,
 *   damit glänzende Flächen etwas zu spiegeln haben. Einmal pro Welt.
 *
 * Und **der Schattenkasten wandert mit dem Kopf**: Eine Schattenkarte deckt ein
 * paar Dutzend Meter ab, die Welten hier reichen bis zum Horizont.
 */
export class GraphicsQuality {
  private settings: GraphicsSettings;
  private profile: GraphicsProfile;
  private sun: THREE.DirectionalLight | null = null;
  private envTarget: THREE.WebGLRenderTarget | null = null;
  private envDirty = true;
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

  /** Neue Welt: neue Lichter, neuer Himmel, alles noch einmal. */
  worldChanged(): void {
    this.sun = null;
    this.envDirty = true;
    this.since = Number.POSITIVE_INFINITY;
  }

  /** Läuft in jedem Bild, vor dem Zeichnen. */
  update(dt: number, head: THREE.Vector3): void {
    if (this.profile.environment && this.envDirty) this.buildEnvironment();

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
    this.disposeEnvironment();
  }

  /** Nach einer Änderung im Menü: alles neu stellen, sofort sichtbar. */
  private refresh(): void {
    const before = this.profile;
    this.settings = graphics();
    this.profile = graphicsProfile(this.settings);
    this.applyRenderer();
    this.sun = applySceneQuality(this.scene, this.profile, before.shadows !== this.profile.shadows);
    this.since = 0;

    if (this.profile.environment) {
      this.envDirty = true;
      this.scene.environmentIntensity = this.profile.environmentIntensity;
    } else {
      this.disposeEnvironment();
      this.scene.environment = null;
      this.scene.environmentIntensity = 1;
    }
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

  /**
   * Der Himmel dieser Welt als Umgebungsbild.
   *
   * Ein `MeshStandardMaterial` ohne Umgebung hat nichts zu spiegeln: Sein
   * Glanzlicht kommt allein aus den drei Lichtern, und deshalb sieht Metall in
   * diesem Projekt bisher aus wie mattes Plastik. Sechs kleine Bilder der
   * Himmelskugel reichen, damit eine Kante wieder eine Kante ist — und weil sie
   * aus **dem Himmel dieser Welt** gerechnet werden, spiegelt der Mond kalt und
   * die Wüste warm, ohne dass eine Welt etwas davon wissen muss.
   *
   * **Findet sich kein Himmel, gibt es auch kein Umgebungsbild.** Das
   * Dunkelhaus ist dunkel, weil es keinen hat; ihm eine erfundene Kuppel über
   * den Kopf zu hängen, wäre genau die Sorte Verbesserung, die ein Experiment
   * kaputt macht.
   */
  private buildEnvironment(): void {
    this.envDirty = false;
    const sky = this.skyMaterial();
    this.disposeEnvironment();
    if (!sky) {
      this.scene.environment = null;
      this.scene.environmentIntensity = 1;
      return;
    }

    const renderer = this.renderer;
    const xrWasEnabled = renderer.xr.enabled;
    // `render()` tauscht in einer laufenden Sitzung die Kamera gegen die der
    // Brille aus — und zwar auch dann, wenn in ein eigenes Ziel gezeichnet
    // wird. Der Generator bekäme so sechsmal denselben Blick statt sechs
    // Richtungen. Für die paar Millisekunden ist die Brille deshalb abgemeldet;
    // ihr eigenes Ziel stellt der Generator hinterher selbst wieder her.
    renderer.xr.enabled = false;

    const generator = new THREE.PMREMGenerator(renderer);
    // Eine Kopie und nicht das Original: Das Material der Welt hängt an einem
    // fertig übersetzten Programm, und es durch eine fremde Szene zu schicken
    // heißt, dieses Programm anzufassen.
    const material = sky.clone();
    const geometry = new THREE.SphereGeometry(10, 24, 16);
    const room = new THREE.Scene();
    room.add(new THREE.Mesh(geometry, material));

    try {
      this.envTarget = generator.fromScene(room, 0, 0.1, 100);
      this.scene.environment = this.envTarget.texture;
      this.scene.environmentIntensity = this.profile.environmentIntensity;
    } catch (error) {
      console.warn('[grafik] Kein Umgebungsbild — der Himmel ließ sich nicht rechnen', error);
      this.scene.environment = null;
    } finally {
      generator.dispose();
      geometry.dispose();
      material.dispose();
      renderer.xr.enabled = xrWasEnabled;
    }
  }

  /** Das Material der Himmelskugel dieser Welt, wenn sie eine hat. */
  private skyMaterial(): THREE.Material | null {
    let found: THREE.Material | null = null;
    this.scene.traverse((object) => {
      if (found) return;
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || mesh.name !== 'sky' || !mesh.visible) return;
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (material) found = material;
    });
    return found;
  }

  private disposeEnvironment(): void {
    if (!this.envTarget) return;
    if (this.scene.environment === this.envTarget.texture) this.scene.environment = null;
    this.envTarget.dispose();
    this.envTarget = null;
  }
}
