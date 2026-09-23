import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { createSight, type Attachment, type AttachmentContext } from './attachments';
import { saveWeaponSettings, weaponSettings } from './gearStore';
import {
  AMMO_KINDS,
  AMMO_LABELS,
  BURST_STEPS,
  FIRE_MODES,
  FIRE_MODE_LABELS,
  DAMAGE_STEPS,
  MAGAZINE_STEPS,
  RATE_STEPS,
  RELOAD_STEPS,
  SPEED_STEPS,
  ZOOM_STEPS,
  clampWeapon,
  nextIn,
  nextPower,
  nextStep,
  powerLabel,
  sightsLabel,
  toggleSight,
  zoomLabel,
  type AmmoKind,
  type FireMode,
  type SightKind,
  type WeaponSettings,
} from './weaponSettings';
import { playEmpty, playReload, playShot } from '../../../core/Audio';
import { canLoadModels } from '../../../core/chefFit';
import { kaykitSkins } from '../../../core/kaykitHeight';
import { fitGun, gunBox } from './pistolModel';
import type { ControllerState } from '../../../core/XRInput';

const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _kick = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);

/**
 * **Wie lang der Halterzylinder dieser Waffe ist** — die eine Zahl, die der
 * gebaute Griff und die Einpassung des Modells sich teilen müssen.
 *
 * Eine Faust ist ungefähr so breit (`grip.GRIP_LENGTH`), und die Pistole hat
 * schon immer zwei Millimeter mehr gehabt als die Vorgabe. Stünde sie unten
 * zweimal da, könnte das Modell auf einen Griff gerechnet werden, den es nicht
 * gibt.
 */
const GRIP_LENGTH = 0.1;

/**
 * **Die Waffe in der Hand ist doppelt so groß, wie der Griff es verlangte.**
 *
 * Auf den Halterzylinder gerechnet (`GRIP_LENGTH`) wirkte die Pistole in der
 * Hand wie ein Spielzeug — gewünscht war ausdrücklich das Doppelte. Die Mitte
 * des Griffs bleibt dabei auf der Mitte des Zylinders (`fitGun` rechnet den Ort
 * um den Faktor herum), also wächst die Waffe **um die Faust herum** und nicht
 * aus ihr heraus; Mündung, Schiene und Zähler ziehen über `fitParts` mit.
 */
const GUN_SIZE = 2;

/**
 * **Die Pistole aus dem Regal** — und warum sie erst jetzt kommt.
 *
 * In der Bestandsaufnahme der Regalmodelle steht sie seit der ersten Runde mit
 * der Entscheidung „Kandidat da, **Griff fehlt**" (`docs/agents/modelle.md`),
 * und das war kein Zögern, sondern Regel 3: Die achtzehn Werkzeuge halten
 * ihren Griff gerechnet und nicht ungefähr, und ein Regalmodell bringt seinen
 * eigenen Ursprung, seine eigene Achse und gar keinen Griffzylinder mit. Die
 * Absage ist jetzt **eingelöst statt übergangen**: `pistolFit.ts` findet den
 * Griff am Netz, und die Waffe wird um ihn herum gehängt statt um ihre Mitte.
 *
 * Zwei Dinge sind dabei herausgekommen, die niemand vorher wissen konnte:
 * Diese Pistole trägt ihr Magazin **vorn** unter dem Lauf und nicht im Griff,
 * und sie ist ein Klotz — mit einem Griff von 10 cm wird sie 37 cm lang, fast
 * doppelt so lang wie die gebaute. Beides steht ausführlich in `pistolFit.ts`.
 */
const GUN_MODEL = 'prototype-bits/Gun_Pistol.glb';

/**
 * **Der Knoten, auf dem der Rundenzähler klebt.**
 *
 * Die Datei hat zwei Knoten, und dass der zweite einen Namen trägt, ist das
 * Geschenk daran: Ein Magazin ist die Fläche, auf die ein Zähler gehört —
 * genau dort klebte er auch an der gebauten Pistole. Gesucht wird beim
 * **Namen** und nicht beim Index (dieselbe Begründung wie an der Druckplatte,
 * `worlds/grid/fixtures/plate.ts`): Ein `children[0]`, das nach dem nächsten
 * Paket-Update auf den Rahmen zeigt, klebte den Zähler quer über die Waffe.
 * Findet sich der Name nicht, bleibt die gebaute Pistole stehen — ein normaler
 * Ausgang und kein Fehler.
 */
const GUN_MODEL_MAGAZINE = 'Gun_Pistol_Magazine';

/** Wie weit der Zähler von der Magazinwand absteht, damit er nicht flimmert. */
const COUNTER_LIFT = 0.001;

/**
 * A pistol you can take apart in the menu.
 *
 * Every number it runs on — the weight of a round, how fast it leaves the
 * barrel, how many are in the magazine, how long a reload takes — is a setting
 * (`weaponSettings.ts`), and every one of them can be stepped through a few
 * sensible notches *or* typed in directly.
 *
 * On top of that go the aiming aids (`attachments.ts`) — as many at once as
 * you like, because a red dot and a trajectory line are not rivals — and a
 * choice of round: plain, or tracer, which draws its own line through the room.
 *
 * There is no ammunition to pick up anywhere, so the counter on the side of the
 * magazine reads "rounds left / ∞".
 */
export class PistolTool extends Tool {
  override readonly toolId = 'pistol';
  override readonly label = 'Pistole';

  private readonly muzzle = new THREE.Object3D();
  private readonly rail = new THREE.Object3D();
  private readonly slide: THREE.Mesh;
  private readonly counter: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /**
   * Beide Zähler — links und rechts derselbe Text auf derselben Textur. Sie
   * wandern mit, wenn das Modell kommt, und sind deshalb keine Einzelstücke
   * mehr, sondern eine Liste.
   */
  private readonly counters: THREE.Mesh[] = [];
  /**
   * Was das Modell ersetzt: Schlitten, Lauf und Magazin aus Quadern. Sie
   * verschwinden, sobald die Datei da ist — und bleiben stehen, solange sie es
   * nicht ist (in Jest für immer).
   */
  private readonly built: THREE.Object3D[] = [];
  /** Die Gruppe um das Regalmodell, sobald es hängt — sonst `null`. */
  private gun: THREE.Object3D | null = null;
  /**
   * **Die Materialien der Regalkopie** — sie gehören ihr allein und müssen
   * weg; ihre **Geometrie** gehört der Vorlage und darf nie freigegeben werden
   * (`core/kaykitModel.copyOf`, `userData.sharedAssets`). `disposeToolTree`
   * unterscheidet das nicht, also wird das Modell vor ihm abgehängt.
   */
  private readonly gunSkins: THREE.Material[] = [];
  /** Ob das Werkzeug schon abgeräumt ist, während die Datei noch unterwegs war. */
  private gone = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  /** The aiming aids currently clipped on, by their kind. */
  private readonly sights = new Map<SightKind, Attachment>();
  private settings: WeaponSettings;
  private rounds: number;
  private reloading = 0;
  private recoil = 0;
  /** Seconds until the next round may leave the barrel. */
  private cooldown = 0;
  /** Rounds still owed by a burst. */
  private burst = 0;
  /**
   * The trigger went down on the gun — not on a menu. Automatic fire keeps
   * running off this, so pointing at the wrist panel with the finger down does
   * not empty a magazine into it.
   */
  private firing = false;

  constructor() {
    super();
    this.name = 'tool-pistol';
    this.icon = 'pistol';
    this.accent = 0xd7dce8;
    this.hint = 'Trigger schießt · Einstellungen im Menü';
    this.settings = weaponSettings();
    this.rounds = this.settings.magazine;

    const steel = new THREE.MeshStandardMaterial({
      color: 0x9aa6bd,
      roughness: 0.35,
      metalness: 0.65,
    });

    this.slide = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.038, 0.17), steel);
    this.slide.position.set(0, 0.012, -0.06);
    this.add(this.slide);
    this.built.push(this.slide);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 10), steel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.012, -0.155);
    this.add(barrel);
    this.built.push(barrel);

    // Der Griff: **der** Griff, derselbe wie an sechs anderen Werkzeugen, und
    // er sitzt hier, wo er in der Faust landet (`grip.ts`). Die Pistole ist die
    // Messlatte dafür — was hier gebaut wird, ist genau die Lage, die ihr
    // Kasten in Greiffarbe vorher hatte, nur nicht mehr von Hand hingesetzt.
    this.mountGrip({ length: GRIP_LENGTH });

    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.075, 0.032), steel);
    magazine.position.set(0, -0.052, 0.008);
    magazine.rotation.x = -0.22;
    this.add(magazine);
    this.built.push(magazine);

    // The round counter sits flat against the magazine, where a glance down
    // the sights catches it.
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 128;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.counter = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.03),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.counter.position.set(0.014, -0.05, 0.012);
    this.counter.rotation.set(-0.22, Math.PI / 2, 0);
    this.add(this.counter);

    const mirrored = this.counter.clone();
    mirrored.position.x = -0.014;
    mirrored.rotation.y = -Math.PI / 2;
    this.add(mirrored);
    this.counters.push(this.counter, mirrored);

    this.muzzle.position.set(0, 0.012, -0.19);
    this.add(this.muzzle);

    // Everything that clips on hangs off the rail, so an attachment's pose is
    // measured from one place on the gun rather than from the gun's origin.
    this.rail.name = 'pistol-rail';
    this.add(this.rail);

    this.mountSights(this.settings.sights);
    this.draw();
    this.fillGun();
  }

  /**
   * **Das Modell holen und die gebaute Pistole darunter verstecken** — sofort
   * nichts, später vielleicht etwas.
   *
   * Dasselbe Muster wie an der Druckplatte (`worlds/grid/fixtures/plate.ts`,
   * `fillPlate`) und aus denselben zwei Gründen: Ein Werkzeug wird **synchron**
   * gebaut und in derselben Zeile in eine Hand gelegt, und `GLTFLoader` samt
   * `import.meta` bringt jeden Jest-Lauf zum Stehen. Bis die Datei da ist — und
   * in einem Checkout ohne die gekauften Pakete für immer — steht die gebaute
   * Pistole da und tut, was sie immer tat. Das ist der **normale** Ausgang und
   * keine Notlösung.
   *
   * **Was nicht wandert, ist die Haltung.** `holdPosition`/`holdRotation`
   * rühren sich hier nicht: Das Modell wird in den **Werkzeugraum** gehängt,
   * und wie das Werkzeug in der Hand liegt, ist davon unberührt. Damit bleibt
   * auch der zweite Justierstand heil — wer dort nachmisst, verschiebt das
   * Werkzeug samt Griff **und** Modell gegen die Hand, und `resetHold`
   * findet dieselbe `factoryPosition` vor wie vorher (`Tool.mountGrip`).
   */
  private fillGun(): void {
    if (!canLoadModels()) return;
    void import('../../../core/kaykitModel').then(async (module) => {
      const model = await module.kaykitModel(GUN_MODEL);
      if (!model) return;
      // Gemessen wird, **solange das Modell an nichts hängt**: Dann ist sein
      // Weltraum sein eigener, und die Zahlen sind die der Datei mal dem
      // Maßstab ihres Pakets. Hinge es schon im Werkzeug, stünde die halbe
      // Brille mit in der Rechnung.
      const magazine = model.getObjectByName(GUN_MODEL_MAGAZINE);
      const anchor = this.gripPart;
      const fit = anchor ? fitGun(model, GRIP_LENGTH * GUN_SIZE, anchor.position) : null;
      // Drei Wege hier heraus, und alle drei sind normal: Das Werkzeug ist
      // inzwischen weg, die Datei hat den Magazinknoten nicht (Paket-Update),
      // oder aus dem Netz war kein Griff zu lesen. Die Kopie steht in allen
      // drei Fällen schon, und ihre **Materialien** gehören ihr allein — sie
      // gehen hier weg und nicht erst, wenn niemand mehr weiß, dass es sie gab.
      if (this.gone || !magazine || !fit) {
        for (const skin of kaykitSkins(model)) skin.dispose();
        return;
      }
      const magazineBox = gunBox(new THREE.Box3().setFromObject(magazine), fit, new THREE.Box3());

      const mount = new THREE.Group();
      mount.name = 'pistol-model';
      // **Die halbe Drehung um die Hochachse ist die eigentliche Nachricht**:
      // Die Datei zeigt nach +z, die gebaute Pistole nach −z — und dorthin
      // schießt sie auch (`fire`). Der Maßstab kommt aus dem Griff, der Ort
      // legt diesen Griff auf den Halterzylinder (`pistolFit.ts`).
      mount.rotation.y = Math.PI;
      mount.scale.setScalar(fit.scale);
      mount.position.copy(fit.at);
      mount.add(model);

      this.fitParts(fit, magazineBox);
      this.add(mount);
      this.gun = mount;
      for (const skin of kaykitSkins(model)) this.gunSkins.push(skin);
      for (const part of this.built) part.visible = false;
    });
  }

  /**
   * **Was am Modell dranbleiben muss** — Mündung, Zielschiene und der
   * Rundenzähler, jedes an der Stelle, an der es am Modell sitzen müsste.
   *
   * Sie auf ihren alten Zahlen stehen zu lassen wäre das Nächstliegende und
   * das Falscheste: Der Lauf der gebauten Pistole endet auf `z = −0,18`, der
   * des Modells 14 cm weiter vorn — eine Kugel käme aus der Mitte der Waffe,
   * ein Leuchtpunkt schwebte hinter ihr in der Luft.
   *
   * Gemessen wird dabei auf **beiden** Seiten: die neue Lage am Netz, die alte
   * an der gebauten Geometrie, die gleich unsichtbar wird. Die Schiene rückt
   * um genau die Strecke, um die die Mündung nach vorn und die Oberkante nach
   * oben gewandert ist — damit behält jede Zielhilfe ihren Abstand zur Mündung
   * (die **Visierlinie**, auf die es bei einer Kimme ankommt) und ihre
   * Handbreit über dem Gehäuse. Wer eine davon am Justierstand verschoben hat,
   * behält seine Verschiebung: Sie steht gegenüber der Schiene und nicht
   * gegenüber dem Werkzeug (`attachments.ts`, `applyStoredPose`).
   */
  private fitParts(fit: { muzzle: THREE.Vector3; top: number }, magazine: THREE.Box3): void {
    const builtMuzzle = this.muzzle.position.z;
    // **Am Quader gemessen und nicht an der Welt.** `Box3.setFromObject`
    // rechnet über `matrixWorld`, und das Werkzeug liegt zu diesem Zeitpunkt
    // längst in einer Hand, die sich bewegt — die Oberkante käme in Metern des
    // Raums heraus und nicht in denen des Werkzeugs. Der Schlitten ist ein
    // gerader Quader an einem geraden Kind, also reicht seine eigene Hülle
    // plus seine Lage.
    this.slide.geometry.computeBoundingBox();
    const builtTop = this.slide.position.y + (this.slide.geometry.boundingBox?.max.y ?? 0);
    this.rail.position.set(0, fit.top - builtTop, fit.muzzle.z - builtMuzzle);
    // Genau auf die Mündungsfläche und keinen Zentimeter davor: Die Kugel
    // startet ohnehin fünf Zentimeter weiter in Flugrichtung (`spawnBullet`),
    // und was davor liegt, wäre eine Zahl ohne Messung dahinter.
    this.muzzle.position.copy(fit.muzzle);

    // Der Zähler zieht auf das Magazin des Modells um — flach an seine beiden
    // Wangen, aufrecht und nicht mehr um 0,22 rad gekippt: Das gebaute Magazin
    // steckte schräg im Griff, dieses steht gerade unter dem Lauf.
    const centre = magazine.getCenter(new THREE.Vector3());
    const cheek = Math.max(Math.abs(magazine.min.x), Math.abs(magazine.max.x)) + COUNTER_LIFT;
    for (const [index, plate] of this.counters.entries()) {
      const side = index === 0 ? 1 : -1;
      plate.position.set(side * cheek, centre.y, centre.z);
      plate.rotation.set(0, (side * Math.PI) / 2, 0);
    }
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    // A burst is ordered once and then walks itself down the magazine at the
    // set rate; automatic fire keeps going for as long as the finger is down.
    if (this.settings.mode === 'burst') this.burst = this.settings.burst;
    this.firing = true;
    this.fire(controller, host);
  }

  /** Letting go stops automatic fire; a burst finishes what it started. */
  override onTriggerUp(_controller: ControllerState, _host: ToolHost): void {
    this.firing = false;
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (controller && this.heldBy) {
      if (!controller.trigger.pressed) this.firing = false;
      if (this.burst > 0 || (this.settings.mode === 'auto' && this.firing)) {
        this.fire(controller, host);
      }
    }

    if (this.reloading > 0) {
      this.reloading = Math.max(0, this.reloading - dt);
      if (this.reloading === 0) {
        this.rounds = this.settings.magazine;
        this.draw();
      }
    }
    // The slide kicks back and settles again.
    //
    // **Am Regalmodell nicht**, und das ist die eine Sache, die der Tausch
    // gekostet hat: `Gun_Pistol.glb` hat zwei Knoten, Waffe und Magazin, und
    // keinen davon als Schlitten. Ein Schlitten, den es nicht gibt, lässt sich
    // nicht zurückziehen, und die ganze Waffe zurückzuschieben hieße, sie
    // durch die Faust rutschen zu lassen. Der sichtbare Rückstoß ist deshalb
    // dort allein das Hochschlagen der Mündung — dieselbe Zahl, dieselbe
    // Abklingzeit, nur ohne das Klacken daneben.
    this.recoil = Math.max(0, this.recoil - dt * 7);
    this.slide.position.z = -0.06 + this.recoil * 0.016;
    // The muzzle flip rides on top of the aim the base class just set, so the
    // kick must be multiplied in — assigning a rotation would throw the aim away.
    if (this.heldBy && this.recoil > 0) {
      this.quaternion.multiply(_kick.setFromAxisAngle(_axisX, this.recoil * 0.18));
    }

    if (this.sights.size > 0) {
      const ctx = this.attachmentContext(host);
      for (const sight of this.sights.values()) sight.update(dt, ctx);
    }
  }

  override disposeTool(): void {
    this.gone = true;
    for (const sight of this.sights.values()) sight.disposeAttachment();
    this.sights.clear();
    // **Das Modell wird abgehängt und seine Materialien gehen weg.** Die
    // **Geometrie** gehört der Vorlage im Speicher und allen anderen Kopien
    // (`kaykitModel`, `userData.sharedAssets`) und bleibt liegen — darauf
    // achtet inzwischen `disposeToolTree` selbst, es hält an der Marke an wie
    // `environment.disposeTree`. Das Abhängen hier ist deshalb keine
    // Vorsichtsmaßnahme mehr, sondern schlicht das, was es sagt: Das Modell
    // gehört nicht mehr zu diesem Werkzeug.
    this.gun?.removeFromParent();
    this.gun = null;
    for (const skin of this.gunSkins) skin.dispose();
    this.gunSkins.length = 0;
    disposeToolTree(this);
    this.texture.dispose();
  }

  // --- what the settings menu turns ----------------------------------------

  /** Everything the gun is set to, as one object. */
  get weapon(): WeaponSettings {
    return this.settings;
  }

  override attachments(): readonly Attachment[] {
    return [...this.sights.values()];
  }

  /** Muzzle velocity in m/s. */
  get muzzleSpeed(): number {
    return this.settings.speed;
  }

  get mode(): FireMode {
    return this.settings.mode;
  }

  get modeLabel(): string {
    return FIRE_MODE_LABELS[this.settings.mode];
  }

  get ammoLabel(): string {
    return AMMO_LABELS[this.settings.ammo];
  }

  /** What the scope magnifies by, as it is written on the menu row. */
  get zoomLabel(): string {
    return zoomLabel(this.settings.zoom);
  }

  get powerLabel(): string {
    return powerLabel(this.settings.mass);
  }

  /** Rounds left, and what a full magazine holds. */
  get magazine(): { left: number; size: number } {
    return { left: this.rounds, size: this.settings.magazine };
  }

  /**
   * Writes a value — from a notch, from a typed-in number or out of a config
   * code. Everything goes through here, so nothing can end up outside its
   * range and nothing can be changed without being written down.
   */
  set(values: Partial<WeaponSettings>): WeaponSettings {
    const before = this.settings;
    this.settings = clampWeapon({ ...before, ...values });
    saveWeaponSettings(this.settings);

    // A magazine that grew does not refill by itself, but it must not read
    // "30/∞" with 12 rounds' worth of ammunition in it either.
    this.rounds = Math.min(this.rounds, this.settings.magazine);
    if (this.settings.mode !== 'burst') this.burst = 0;
    if (this.settings.sights.join() !== before.sights.join())
      this.mountSights(this.settings.sights);
    this.draw();
    return this.settings;
  }

  /** Reads the stored settings again — after a config code came in. */
  reloadSettings(): void {
    this.settings = weaponSettings();
    this.rounds = Math.min(this.rounds, this.settings.magazine);
    this.mountSights(this.settings.sights);
    this.draw();
  }

  /** Each of these steps one notch and wraps around — one menu entry each. */
  cyclePower(): string {
    this.set({ mass: nextPower(this.settings.mass) });
    return this.powerLabel;
  }

  cycleSpeed(): number {
    return this.set({ speed: nextStep(SPEED_STEPS, this.settings.speed) }).speed;
  }

  /** Was ein Rumpftreffer abzieht — der Kopf das Vierfache (`npcHit.ts`). */
  cycleDamage(): number {
    return this.set({ damage: nextStep(DAMAGE_STEPS, this.settings.damage) }).damage;
  }

  cycleRate(): number {
    return this.set({ rate: nextStep(RATE_STEPS, this.settings.rate) }).rate;
  }

  cycleMagazine(): number {
    return this.set({ magazine: nextStep(MAGAZINE_STEPS, this.settings.magazine) }).magazine;
  }

  cycleReload(): number {
    return this.set({ reload: nextStep(RELOAD_STEPS, this.settings.reload) }).reload;
  }

  cycleBurst(): number {
    return this.set({ burst: nextStep(BURST_STEPS, this.settings.burst) }).burst;
  }

  cycleMode(): FireMode {
    return this.set({ mode: nextIn(FIRE_MODES, this.settings.mode) }).mode;
  }

  cycleAmmo(): AmmoKind {
    return this.set({ ammo: nextIn(AMMO_KINDS, this.settings.ammo) }).ammo;
  }

  /** 1×, 2×, 4× … 40× and round again. */
  cycleZoom(): number {
    return this.set({ zoom: nextStep(ZOOM_STEPS, this.settings.zoom) }).zoom;
  }

  /** Clips one aiming aid on or takes it off; `none` clears the rail. */
  toggleSight(kind: SightKind): readonly SightKind[] {
    return this.set({ sights: toggleSight(this.settings.sights, kind) }).sights;
  }

  /** What the menu writes next to "Zielhilfen". */
  get sightsLabel(): string {
    return sightsLabel(this.settings.sights);
  }

  /** Puts a magazine in by hand, whatever is left in the old one. */
  reloadNow(): void {
    if (this.rounds === this.settings.magazine || this.reloading > 0) return;
    this.startReload();
  }

  // --- shooting -------------------------------------------------------------

  /** One round, if the gun is ready for it. */
  private fire(controller: ControllerState, host: ToolHost): void {
    if (this.cooldown > 0) return;
    if (this.reloading > 0) return;
    if (this.rounds <= 0) {
      this.burst = 0;
      playEmpty();
      this.startReload();
      return;
    }

    this.rounds--;
    if (this.burst > 0) this.burst--;
    this.cooldown = 1 / this.settings.rate;
    this.recoil = 1;
    this.muzzle.getWorldPosition(_origin);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    host.spawnBullet(_origin, _direction, this.settings.speed, {
      mass: this.settings.mass,
      tracer: this.settings.ammo === 'tracer',
      damage: this.settings.damage,
    });
    playShot();
    controller.pulse(0.6, 40);
    this.draw();

    if (this.rounds === 0) this.startReload();
  }

  private startReload(): void {
    this.reloading = this.settings.reload;
    playReload();
    this.draw();
  }

  /**
   * Brings the rail in line with the settings: whatever is asked for and not
   * yet mounted is built, whatever is mounted and no longer wanted comes off.
   * Anything already on stays exactly where it is — rebuilding a red dot that
   * nobody touched would throw its pose away for a frame.
   */
  private mountSights(kinds: readonly SightKind[]): void {
    for (const [kind, sight] of this.sights) {
      if (kinds.includes(kind)) continue;
      sight.disposeAttachment();
      sight.removeFromParent();
      this.sights.delete(kind);
    }
    for (const kind of kinds) {
      if (this.sights.has(kind)) continue;
      const sight = createSight(kind);
      if (!sight) continue;
      sight.applyStoredPose(this.toolId);
      this.rail.add(sight);
      this.sights.set(kind, sight);
    }
  }

  private attachmentContext(host: ToolHost): AttachmentContext {
    return {
      host,
      muzzle: this.muzzle,
      speed: this.settings.speed,
      held: Boolean(this.heldBy) && !this.parked,
      zoom: this.settings.zoom,
    };
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 128);
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 120, 22);
    ctx.fillStyle = 'rgba(8, 12, 22, 0.9)';
    ctx.fill();
    ctx.strokeStyle = this.reloading > 0 ? '#ffb35c' : '#5ee0a0';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    if (this.reloading > 0) {
      ctx.font = '700 46px system-ui, sans-serif';
      ctx.fillText('LADEN', 128, 66);
    } else {
      ctx.font = '700 50px system-ui, sans-serif';
      // Rounds left over an endless supply of magazines.
      ctx.fillText(`${this.rounds}/∞`, 128, 50);
      // Below it what the trigger is going to do, and what comes out.
      ctx.font = '600 24px system-ui, sans-serif';
      ctx.fillStyle = '#9fe3ff';
      const ammo = this.settings.ammo === 'tracer' ? ' · SPUR' : '';
      ctx.fillText(`${MODE_TAGS[this.settings.mode]}${ammo}`, 128, 96);
    }
    this.texture.needsUpdate = true;
  }
}

/** Short label under the round counter. */
const MODE_TAGS: Record<FireMode, string> = {
  single: 'EINZEL',
  burst: `${'3'}-SCHUSS`,
  auto: 'AUTO',
};
