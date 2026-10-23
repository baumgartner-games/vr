import * as THREE from 'three';
import {
  graphics,
  graphicsProfile,
  onGraphicsChange,
  pickFrameRate,
  type GraphicsProfile,
  type GraphicsSettings,
} from './graphicsSettings';
import { BlobShadows } from './BlobShadows';
import { Lamps } from './Lamps';
import { dayClock } from './dayClock';
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
 * - **Die Szene ablaufen** — wer wirft Schatten, wie hell das Grundlicht ist
 *   (`graphicsScene.ts`). Nicht einmal, sondern immer wieder: In
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
  /** Die Schatten-Kreise unter den Figuren (Modus _Einfach_). */
  private readonly blobs: BlobShadows;
  /** Alle Lampen der Szene (`core/Lamps.ts`). */
  private readonly lamps: Lamps;

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
    this.blobs = new BlobShadows(scene);
    this.blobs.setEnabled(this.profile.blobShadows);
    this.lamps = new Lamps(scene);
    this.lamps.setEnvironment(
      this.settings.weatherTime !== 'day',
      this.settings.streetLights,
      this.settings.weatherFog === 'spooky',
    );
    this.stopListening = onGraphicsChange(() => this.refresh());
    this.renderer.xr.addEventListener('sessionstart', this.applyRate);
    this.applyRenderer();
    this.touched = this.profile.lightShadows;
  }

  /** Ob die Szene dieser Welt schon einmal abgelaufen wurde. */
  private scanned = false;

  /** Neue Welt: neue Lichter, alles noch einmal. */
  worldChanged(): void {
    this.sun = null;
    this.since = Number.POSITIVE_INFINITY;
    this.scanned = false;
    this.blobs.worldChanged();
    this.lamps.worldChanged();
  }

  /**
   * **Ob der Durchlauf überhaupt etwas zu tun hätte.** Ohne Schatten stellt
   * er nur zurück, was die Schatten einmal verändert haben — und wo sie in
   * dieser Sitzung nie an waren, gibt es nichts zurückzustellen. Der
   * Durchlauf über ein paar tausend Objekte je Sekunde war dann ein Ruckler
   * für nichts, in der Brille am deutlichsten. Waren sie einmal an, bleibt
   * das Nachsehen an (`touched`): Was danach aus einem Käfig kommt, soll
   * seinen Schatten wieder loswerden.
   */
  private get rescans(): boolean {
    return this.touched || this.profile.lightShadows;
  }

  /** Ob die Schatten in dieser Sitzung je an waren. */
  private touched = false;

  /** Läuft in jedem Bild, vor dem Zeichnen. */
  update(dt: number, head: THREE.Vector3): void {
    this.since += dt;
    if (this.since >= GraphicsQuality.RESCAN) {
      this.since = 0;
      // Einmal je Welt in jedem Fall — danach nur, wo es etwas zu tun gibt.
      if (this.rescans || !this.scanned) this.sun = applySceneQuality(this.scene, this.profile);
      this.scanned = true;
    }

    this.blobs.update(dt);
    // Nacht nach dem Tageslauf der Welt (`core/dayClock.ts`), sonst nach dem Menü —
    // in jedem Bild, denn die Uhr läuft, ohne dass sich eine Einstellung ändert.
    this.lamps.setEnvironment(
      dayClock.active ? dayClock.night : this.settings.weatherTime !== 'day',
      this.settings.streetLights,
      this.settings.weatherFog === 'spooky',
    );
    this.lamps.update(dt, head, this.renderer.xr.isPresenting);
    if (!this.profile.lightShadows) return;
    if (this.sun && this.profile.shadows) aimSun(this.sun, head, this.profile);
    // Bestellt wird die Schattenkarte einmal pro Bild — `autoUpdate` ist aus,
    // damit Spiegel und Portalsichten sie nicht jedes Mal neu bauen lassen.
    this.renderer.shadowMap.needsUpdate = true;
  }

  dispose(): void {
    this.stopListening();
    this.renderer.xr.removeEventListener('sessionstart', this.applyRate);
    this.blobs.dispose();
    this.lamps.dispose();
  }

  /**
   * **Die Bildwiederholrate der Brille** (`GraphicsSettings.xrRate`) — beim
   * Aufsetzen und nach jeder Änderung im Menü. Eine Brille ohne die Frage
   * (`updateTargetFrameRate`) bleibt, wie sie ist.
   */
  private readonly applyRate = (): void => {
    const session = this.renderer.xr.getSession() as
      | (XRSession & {
          supportedFrameRates?: ArrayLike<number>;
          frameRate?: number;
          updateTargetFrameRate?: (rate: number) => Promise<void>;
        })
      | null;
    if (!session?.updateTargetFrameRate) return;
    const supported = session.supportedFrameRates ? Array.from(session.supportedFrameRates) : null;
    const rate = pickFrameRate(this.settings.xrRate, supported);
    if (rate === null || session.frameRate === rate) return;
    session.updateTargetFrameRate(rate).catch(() => {});
  };

  /** Nach einer Änderung im Menü: alles neu stellen, sofort sichtbar. */
  private refresh(): void {
    const before = this.profile;
    this.settings = graphics();
    this.profile = graphicsProfile(this.settings);
    this.applyRenderer();
    this.applyRate();
    this.blobs.setEnabled(this.profile.blobShadows);
    this.lamps.setEnvironment(
      this.settings.weatherTime !== 'day',
      this.settings.streetLights,
      this.settings.weatherFog === 'spooky',
    );
    this.sun = applySceneQuality(
      this.scene,
      this.profile,
      before.lightShadows !== this.profile.lightShadows,
    );
    this.since = 0;
    this.scanned = true;
    if (this.profile.lightShadows) this.touched = true;
  }

  /** Ob in der Brille das Menü offen ist — dann ohne Foveated Rendering (`setMenuOpen`). */
  private menuOpen = false;

  /**
   * **Scharf bis zum Rand, solange das Menü offen ist.** Foveated Rendering
   * rechnet die Ränder des Bildes gröber, und der Bildschirm des Menüs
   * (`ui/XRMenu.ts`) reicht weit in diese Ränder hinein — die Schrift dort
   * war verwaschen. Mit dem Menü steht ohnehin kaum Welt im Bild, die es
   * teuer machte.
   */
  setMenuOpen(open: boolean): void {
    if (open === this.menuOpen) return;
    this.menuOpen = open;
    this.renderer.xr.setFoveation(open ? 0 : this.profile.foveation);
  }

  private applyRenderer(): void {
    const renderer = this.renderer;
    // An, sobald irgendein Licht eine Karte zeichnen darf — im Kreis-Modus
    // nur die Taschenlampe. Ohne Licht mit `castShadow` kostet das nichts.
    renderer.shadowMap.enabled = this.profile.lightShadows;
    // `PCFShadowMap` und nicht `PCFSoftShadowMap`: Die weiche Fassung ist seit
    // three r185 abgemeldet und fällt intern ohnehin auf diese zurück — sie
    // kostete nur noch eine Warnung pro Bild in der Konsole.
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.xr.setFoveation(this.menuOpen ? 0 : this.profile.foveation);
    // Die Brille nimmt die Puffergröße nur beim Aufsetzen entgegen; mitten in
    // der Sitzung wäre der Aufruf nichts als eine Warnung in der Konsole.
    if (!renderer.xr.isPresenting) {
      renderer.xr.setFramebufferScaleFactor(this.profile.framebufferScale);
    }
  }
}
