import * as THREE from 'three';
import { FurnishedWorld } from '../grid/FurnishedWorld';
import { GridPlan } from '../grid/gridPlan';
import type { PlanSolid } from '../grid/solids';
import type { PlateTile } from '../shared/plateField';
import { createSky } from '../shared/environment';
import { setBuildFlight } from '../../core/buildFlight';
import { graphics, saveGraphics } from '../../core/graphicsSettings';
import { KEEP_SOLID } from '../../core/occluderGhost';
import { GRAB_TINT, GRAB_TINT_EMISSIVE } from '../../core/colors';
import { TextPlane } from '../../ui/TextPlane';
import { faceCamera } from '../../ui/billboard';
import type { MenuEntry } from '../../ui/menu';
import type { PointerHit } from '../../core/Pointer';
import type { WorldContext } from '../../core/types';
import { gripAnchor, type Handedness } from '../../core/XRInput';
import {
  BASE_TILES,
  HexBoard,
  NORMAL_TILES,
  OPEN_TASKS,
  OVERVIEW_TERRAINS,
  QUEST_TERRAINS,
  QUEST_TILES,
  TERRAIN_LABEL,
  catalogue,
  matchBase,
  hexAt,
  hexCentre,
  hexKey,
  type Hex,
  type HexMode,
  type PlaceResult,
  type OutlineLine,
  type PlacedTile,
  type QuestEntry,
  type QuestTerrain,
  type Terrain,
  type TileSpec,
} from './hexRules';
import { HEX_WIDTH, HexBoardView, HexModels, buildTileGroup } from './hexView';
import { WIND_COUNT, WindGusts } from './hexAnimate';
import { packSave, unpackSave } from './hexShare';
import { bestPlacement, explainPlacement, type Reason } from './hexPlanner';
import { dressingModels } from './hexDressing';
import { QuestBadge } from './hexBadge';
import { outlineGeometry, outlineMaterial, type OutlineGroup } from './hexOutline';
import { HexTray, curvedArrow, type StackKind } from './hexTable';
import { TERRAIN_COLOUR, drawHexIcon, hexIconUrl } from './hexIcon';

/**
 * **Hexland** — eine Landschaft aus Sechseck-Kacheln legen, nach dem Vorbild
 * von _Dorfromantik_ (`docs/agents/hexland.md`).
 *
 * Gewünscht: _„Ich will mit den hex tiles ein Spiel bauen also eine weitere
 * Welt, die aber eben hey Tile basiert ist. Baue sowas nach, dass ich in vr
 * als auch von oben oder Handy eine Welt aufbauen kann"_.
 *
 * **Eine Bedienung für alle drei**: Auf ein freies Feld zeigen legt die
 * Kachel vom Stapel als Vorschau darüber, mit der besten Drehung. Auf die
 * Vorschau zeigen dreht sie weiter, auf das grüne ✓ darüber legt sie hin. In
 * der Brille ist „zeigen" der Strahl mit Trigger oder `A`, am Schirm von oben
 * ein Klick oder ein Tippen, aus den Augen der Klick auf die Bildmitte.
 * `R` dreht am Schirm auch.
 *
 * **Die Regeln stehen woanders** (`hexRules.ts`, ohne three.js), die
 * Ausstattung einer Kachel auch (`hexDressing.ts`). Hier steht nur, was man
 * sieht und anfasst.
 *
 * **Aus dem Regal, und kein Spielelement.** Kacheln, Häuser und Bäume sind
 * die Modelle aus `medieval-hexagon`, gezeichnet als Bündel (`hexView.ts`).
 * Spielelemente sind sie nicht, und das mit Absicht: Sie sind das Spielbrett
 * und keine Möbel — man läuft über das Dorf wie über eine Modellbahn, und
 * nichts davon sperrt eine Zelle.
 */
export class HexlandWorld extends FurnishedWorld {
  /** Am Schirm nur von oben (`World.onlyTopDown`) — aus den Augen gibt es hier nicht. */
  readonly onlyTopDown = true;
  private board = new HexBoard();
  private readonly models = new HexModels();
  private view: HexBoardView | null = null;
  /** Das unsichtbare Brett, auf das gezeigt wird — groß wie die Welt. */
  private pickPlane: THREE.Mesh | null = null;
  /** Die freien Felder am Rand, als blasse Sechsecke. */
  private slots: THREE.InstancedMesh | null = null;
  /** Das Feld unter dem Strahl oder der Maus. */
  private hover: THREE.Mesh | null = null;
  /** Die Vorschau: Kachel, Kantenstriche, ✓ und die Zeile darüber. */
  private hand = new THREE.Group();
  private previewTile: THREE.Group | null = null;
  private previewEdges: THREE.Mesh[] = [];
  private confirm: TextPlane | null = null;
  /** ✓ Legen mit ↺ und ↻ daneben — eine Tafel, die sich als Ganzes zum Blick dreht. */
  private controls = new THREE.Group();
  private turnLeft: TextPlane | null = null;
  private turnRight: TextPlane | null = null;
  /**
   * **Der Geist**: die Kachel in der Hand, blass auf dem Feld, auf das gezielt
   * wird (`showHover`). Gewünscht: _„Ziele ich auf ein unbesetztes Tile, wird
   * das neue Tile dort als Ghost angezeigt, bis ich Trigger drücke."_
   */
  private aim = new THREE.Group();
  private aimGhostFor: unknown = null;
  private readonly aimMaterials = new Map<THREE.Material, THREE.Material>();
  /** Die Pfeile um die Kachel in der Hand, wenn auf sie gezielt wird — Trigger dreht. */
  private spin = new THREE.Group();
  /**
   * **Das Brett als Ganzes** — alles, was auf den Kacheln liegt. Sonst steht es
   * im Ursprung in voller Größe; im Tisch-Modus ist es eine Miniatur vor dem
   * Spieler (`placeTable`, `pullBoard`).
   */
  private board3d = new THREE.Group();
  /** In der Brille am Tisch statt im Flug (`tableRow`), gemerkt im Browser. */
  private tableStyle = readFlag(TABLE_KEY, false);
  /** Der Tisch-Modus, solange er läuft (`enterTable`) — sonst `null`. */
  private table: TableState | null = null;
  /** Das Feld unter der Vorschau — im Tisch-Modus aus, solange sie in der Hand ist. */
  private target: THREE.Mesh | null = null;
  /** Die Griffpunkte an den Ecken der Kachel, nur im Tisch-Modus. */
  private knobs = new THREE.Group();
  /**
   * **Die Tischplatte** unter der Miniatur. Die Kacheln haben einen Sockel, der
   * sonst im Boden steckt (`hexland-backdrop`); am Tisch verdeckt ihn die
   * Platte. Sie wächst mit dem Brett (`fitTableTop`).
   */
  private tableTop: THREE.Mesh | null = null;
  /** Die Mitte der gelegten Kacheln, als die Miniatur aufgestellt wurde. */
  private tableMid = new THREE.Vector3();
  /**
   * **Wo die Kachel in der Hand aufhört** — eine Ebene knapp unter ihrer
   * Oberfläche (`clipHand`). Die Modelle haben einen Sockel, so dick wie eine
   * halbe Kachel; am Tisch sähe die Kachel in der Hand sonst wie ein Klotz aus.
   */
  private readonly handClip = new THREE.Plane();
  private readonly clipMaterials = new Map<THREE.Material, THREE.Material>();
  private info: TextPlane | null = null;
  private handQuest: QuestBadge | null = null;
  /** „3/6" am Auftrag in der Hand, solange er probehalber liegt (`drawBadges`). */
  private handQuestText: string | null = null;
  /** Wo die Vorschau gerade liegt, und wie gedreht. */
  private at: Hex | null = null;
  private rot = 0;
  /** Die Kachel, für die `previewTile` gebaut ist — sonst neu bauen. */
  private previewFor: unknown = null;
  /** Die Schilder der offenen Aufgaben, je Kachel. */
  private readonly badges = new Map<string, QuestBadge>();
  private clock = 0;
  private lastCtx: WorldContext | null = null;
  private offDom: Array<() => void> = [];
  private hexMaterials: THREE.Material[] = [];
  /** Mühlen, Wasser, Wind (`hexAnimate.ts`) — an oder aus, gemerkt im Browser. */
  private animations = readFlag(ANIM_KEY, true);
  /** Wie groß die nächste normale Partie wird (`setupMenu`). */
  private setup = readSetup();
  /**
   * **Ob die Kamera von Hand gekippt werden darf** — ab Werk nicht, nur
   * gedreht. Gewünscht: _„Bei hex Welt soll die Kamera kippen nicht verändert
   * werden können standardmäßig (drehen weiterhin). Das kippen kann nur über
   * das hex Menü erweiterte Kamera Steuerung aktiviert werden."_
   */
  private freeTilt = readFlag(CAMERA_KEY, false);
  /** Ob oben rechts unter den offenen Aufträgen alle Aufträge der Partie stehen (`drawOverview`). */
  private overview = readFlag(OVERVIEW_KEY, false);
  /** Ob _Übrige Kacheln_ jede Kachel einzeln zeigt (`leftOverMenu`). */
  private leftDetail = false;
  /** Warum der letzte Vorschlag dort liegt — bis zur nächsten Kachel (`suggest`). */
  private why: { reasons: Reason[]; spec: TileSpec; rot: number; at: Hex } | null = null;
  private whyButton: HTMLButtonElement | null = null;
  /** Ob gerade ⓘ statt 💡 steht — damit die Leiste nur bei einem Wechsel neu schreibt. */
  private whyShown = false;
  /** 💡 Vorschlag und ⓘ — nur während einer Partie (`drawBarIcon`). */
  private barTools: HTMLElement | null = null;
  private whyBox: HTMLElement | null = null;
  /** Pfeile der Flussrichtung (`HexBoardView.showArrows`), gemerkt im Browser. */
  private arrows = readFlag(ARROW_KEY, false);
  private readonly winds = Array.from(
    { length: WIND_COUNT },
    (_, slot) => new WindGusts(HEX_WIDTH, slot),
  );
  /** Die Spielhilfen (`helpMenu`), gemerkt im Browser. */
  private help: HexHelp = readHelp();
  /** Wo zuletzt gelegt wurde — dort in der Nähe liegt die nächste (`autoPlace`). */
  private lastPlaced: Hex | null = null;
  /** Die Ziffern 0–6 auf den freien Feldern (`drawDigits`). */
  private readonly digits: THREE.InstancedMesh[] = [];
  /** Mit welcher Drehung des Bildes die Ziffern zuletzt gelegt wurden. */
  private digitHeading = 0;
  private flight: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
  /** Der Ring um das Feld der neuen Kachel — er pulsiert (`update`). */
  private ring: THREE.Mesh | null = null;

  protected override worldId(): string {
    return 'hexland';
  }

  protected override editorTitle(): string {
    return 'Hexland';
  }

  protected override layout(): GridPlan {
    const plan = new GridPlan([0]);
    plan.floor(FIELD);
    return plan;
  }

  protected override navFromPlan(): boolean {
    return true;
  }

  /** Keine Prototyp-Platten: Unter den Kacheln liegt nichts, was man sehen soll. */
  protected override floorPlate(_tile: PlateTile): string | null {
    return null;
  }

  /**
   * **Der Boden trägt, aber man sieht ihn nicht.** Die Kacheln liegen mit
   * ihrer (plattgedrückten, `hexView.flatTop`) Oberseite genau auf ihm, und
   * die farbige Fläche ringsum liegt eine Fingerbreite darunter
   * (`buildEnvironment`): alles ebenerdig, keine Stufe am Rand des Bretts.
   * Gewünscht: _„Ne keine Stufen, alles eben erdig bitte"_ — bis dahin
   * schwebte das Brett eine halbe Kachelhöhe darüber wie in _Dorfromantik_.
   */
  protected override solidMaterial(solid: PlanSolid): THREE.Material {
    if (solid.kind !== 'floor') return super.solidMaterial(solid);
    return (this.glass ??= new THREE.MeshBasicMaterial({ visible: false }));
  }

  private glass: THREE.Material | null = null;

  protected override horizonColor(): number | null {
    return null;
  }

  protected override skyColor(): number {
    return BACKDROP;
  }

  protected override lightIntensity(): number {
    return 1.2;
  }

  protected override welcome(): string {
    return 'Hexland · Feld antippen: Kachel dorthin · Kachel antippen: drehen · ✓ legt sie hin';
  }

  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, HEX_WIDTH * 1.4);
  }

  protected override spawnYaw(): number {
    return 0;
  }

  protected override onGround(tx: number, tz: number): boolean {
    return tx >= FIELD.x && tx < FIELD.x + FIELD.w && tz >= FIELD.z && tz < FIELD.z + FIELD.d;
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.root.add(createSky(0xf3d3df, BACKDROP));
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(900, 48),
      new THREE.MeshStandardMaterial({ color: BACKDROP, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    ground.name = 'hexland-backdrop';
    this.root.add(ground);
  }

  protected override buildProps(): void {
    const ctx = this.context;
    if (!ctx) return;
    this.board = loadBoard(readMode());
    this.board3d.name = 'hexland-board';
    this.root.add(this.board3d);
    const top = new THREE.MeshStandardMaterial({ color: TABLE_COLOUR, roughness: 0.9 });
    this.hexMaterials.push(top);
    this.tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 48), top);
    this.tableTop.position.y = -0.63;
    this.tableTop.visible = false;
    this.tableTop.name = 'hexland-table';
    this.board3d.add(this.tableTop);
    this.buildBoard(ctx);
    // Alles vorladen, was eine Kachel tragen kann — sonst stockt die erste Vorschau.
    for (const model of dressingModels()) void this.models.load(model);
    for (const base of BASE_TILES) void this.models.load(base.model);
  }

  // --- aufbauen -------------------------------------------------------------------

  private buildBoard(ctx: WorldContext): void {
    // **Weiter hinaus als in anderen Welten** — gewünscht: _„Ich will gerne noch
    // weiter raus zoomen können."_ 240 m fassen ein Brett von gut 60 Kacheln Breite.
    ctx.topDownView?.maxZoom?.(HEX_MAX_ZOOM);
    ctx.topDownView?.lockTilt?.(!this.freeTilt);
    this.view = new HexBoardView(this.models, () => this.board.tiles);
    this.view.showArrows(this.arrows);
    this.view.root.userData.sharedAssets = true;
    this.board3d.add(this.view.root);
    for (const tile of this.board.tiles.values()) void this.view.add(tile);
    for (const wind of this.winds) this.board3d.add(wind.root);

    const slotGeometry = new THREE.CylinderGeometry(HEX_WIDTH * 0.555, HEX_WIDTH * 0.555, 0.04, 6);
    const slotMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    this.hexMaterials.push(slotMaterial);
    this.slots = new THREE.InstancedMesh(slotGeometry, slotMaterial, 256);
    this.slots.frustumCulled = false;
    // Die Farbe je Feld gibt es von Anfang an (`slotColour`), sonst müsste der
    // Shader beim ersten Einfärben neu gebaut werden.
    this.slots.setColorAt(0, new THREE.Color(0xffffff));
    this.slots.name = 'hexland-slots';
    this.board3d.add(this.slots);

    // **Die Zahlen auf den Feldern** (Spielhilfe _Passende Kanten als Zahl_):
    // ein Bündel je Ziffer 0–6, flach auf dem Boden, zum Bild gedreht.
    const digitGeometry = new THREE.PlaneGeometry(HEX_WIDTH * 0.42, HEX_WIDTH * 0.42);
    for (let n = 0; n <= 6; n++) {
      const material = new THREE.MeshBasicMaterial({
        map: digitTexture(n),
        transparent: true,
        depthWrite: false,
      });
      this.hexMaterials.push(material);
      const digits = new THREE.InstancedMesh(digitGeometry, material, 256);
      digits.count = 0;
      digits.frustumCulled = false;
      digits.renderOrder = 2;
      digits.name = `hexland-digit-${n}`;
      this.digits.push(digits);
      this.board3d.add(digits);
    }

    const hoverMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff1a8,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.hexMaterials.push(hoverMaterial);
    this.hover = new THREE.Mesh(slotGeometry, hoverMaterial);
    this.hover.position.y = 0.03;
    this.hover.visible = false;
    this.board3d.add(this.hover);

    const pickMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    this.hexMaterials.push(pickMaterial);
    this.pickPlane = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.w, FIELD.d), pickMaterial);
    this.pickPlane.rotation.x = -Math.PI / 2;
    this.pickPlane.position.set(FIELD.x + FIELD.w / 2, 0.02, FIELD.z + FIELD.d / 2);
    this.pickPlane.name = 'hexland-pick';
    this.board3d.add(this.pickPlane);

    // Das Feld unter der Vorschau leuchtet — von oben sieht man sonst nicht, wo sie landet.
    const targetMaterial = new THREE.MeshBasicMaterial({
      color: 0xfffbe8,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.hexMaterials.push(targetMaterial);
    const target = new THREE.Mesh(slotGeometry, targetMaterial);
    target.position.y = 0.035;
    this.hand.add(target);
    this.target = target;
    // **Griffpunkte** an den sechs Ecken — im Tisch-Modus nimmt man die Kachel
    // daran (`updateTable`). Gewünscht: _„… habe mehrere Haltepunkte daran,
    // sodass ich es drehen kann."_
    const knobMaterial = new THREE.MeshStandardMaterial({
      color: GRAB_TINT,
      roughness: 0.6,
      emissive: new THREE.Color(GRAB_TINT).multiplyScalar(GRAB_TINT_EMISSIVE),
    });
    this.hexMaterials.push(knobMaterial);
    const knobGeometry = new THREE.SphereGeometry(0.22, 10, 8);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * (Math.PI / 3);
      const knob = new THREE.Mesh(knobGeometry, knobMaterial);
      knob.position.set(Math.cos(a) * HEX_WIDTH * 0.58, 0, Math.sin(a) * HEX_WIDTH * 0.58);
      this.knobs.add(knob);
    }
    this.knobs.visible = false;
    this.hand.add(this.knobs);

    // **Ein leuchtender Ring um das Feld** — gewünscht: _„Dann soll erkennbar
    // sein was das neue Tile ist."_ Er pulsiert, die Kachel darüber schwebt.
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd84a,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.hexMaterials.push(ringMaterial);
    const outer = HEX_WIDTH / Math.sqrt(3);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(outer * 0.86, outer * 1.02, 6, 1, Math.PI / 6),
      ringMaterial,
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.06;
    this.ring.renderOrder = 3;
    this.hand.add(this.ring);

    // Die Striche an den Kanten der Vorschau: grün passt, rot nicht.
    const edgeGeometry = new THREE.BoxGeometry(HEX_WIDTH * 0.42, 0.08, 0.14);
    for (let e = 0; e < 6; e++) {
      const material = new THREE.MeshBasicMaterial({ color: 0x5fe07a });
      this.hexMaterials.push(material);
      const bar = new THREE.Mesh(edgeGeometry, material);
      const a = e * (Math.PI / 3);
      bar.position.set(Math.cos(a) * HEX_WIDTH * 0.47, 0.12, Math.sin(a) * HEX_WIDTH * 0.47);
      bar.rotation.y = -(a + Math.PI / 2);
      this.previewEdges.push(bar);
      this.hand.add(bar);
    }
    this.confirm = new TextPlane({
      width: 2.6,
      height: 0.8,
      title: '✓ Legen',
      accent: 0x5fe07a,
      background: 'rgba(36, 120, 64, 0.92)',
      align: 'center',
      face: true,
      front: true,
    });
    // **Drehen am Schild** — gewünscht: _„bei dem Panel ‚Legen' auch die
    // Buttons links und rechts mit Drehen einbauen."_
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd84a,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.hexMaterials.push(arrowMaterial);
    const turn = (clockwise: boolean, x: number): TextPlane => {
      const button = new TextPlane({
        width: 0.8,
        height: 0.8,
        title: '',
        accent: 0xffd84a,
        background: 'rgba(40, 46, 66, 0.92)',
        align: 'center',
        front: true,
      });
      button.position.x = x;
      // Ein gezeichneter Pfeil statt ↺/↻: Die Schrift der Tafel ist für ein Zeichen zu klein.
      for (const part of curvedArrow(
        0.2,
        0.07,
        clockwise ? 2.4 : 0.75,
        4,
        clockwise,
        arrowMaterial,
      )) {
        part.renderOrder = button.renderOrder + 1;
        part.position.z = 0.01;
        button.add(part);
      }
      this.controls.add(button);
      return button;
    };
    this.turnLeft = turn(false, -1.8);
    this.turnRight = turn(true, 1.8);
    this.controls.add(this.confirm);
    this.controls.position.y = 2.5;
    this.hand.add(this.controls);
    faceCamera(this.controls);
    this.buildSpin();
    this.info = new TextPlane({
      width: 3,
      height: 0.95,
      title: '',
      accent: 0xf3d3df,
      align: 'center',
      face: true,
      front: true,
    });
    this.info.position.y = 3.45;
    this.hand.add(this.info);
    // **Der Auftrag der Kachel in der Hand** — sichtbar, bevor sie liegt, in
    // jeder Ansicht (auch von oben, wo ✓ und Zeile in der Leiste stehen).
    this.handQuest = new QuestBadge(1.6);
    this.handQuest.position.y = 1.3;
    this.hand.add(this.handQuest);
    this.hand.name = 'hexland-ghost';
    // Von oben steht die Figur unsichtbar unter der Kamera — die Kachel in der
    // Hand würde sonst als „Verdecker" durchsichtig (`core/occluderGhost.ts`).
    this.hand.userData[KEEP_SOLID] = true;
    this.hand.visible = false;
    this.board3d.add(this.hand);

    // **Zeigen in der Brille und aus den Augen** — der Strahl (`core/Pointer.ts`).
    ctx.pointer.add({
      object: this.pickPlane,
      onHover: (hit) => this.showHover(hit.point),
      onBlur: () => this.showHover(null),
      onSelect: (hit) => this.pointAt(hit),
      // Im Tisch-Modus wird mit der Hand gelegt, nicht mit dem Strahl.
      ignore: () => this.table !== null,
    });
    ctx.pointer.add({ object: this.confirm, onSelect: () => this.placeHere() });
    ctx.pointer.add({ object: this.turnLeft, onSelect: () => this.rotate(-1) });
    ctx.pointer.add({ object: this.turnRight, onSelect: () => this.rotate(1) });
    this.aim.name = 'hexland-ghost-aim';
    this.aim.visible = false;
    this.aim.userData[KEEP_SOLID] = true;
    this.board3d.add(this.aim);
    // **Und von oben am Schirm** — dort ruht der Strahl, also eigene Finger.
    this.listenToScreen(ctx);
    this.buildTileBar();
    this.refresh(true);
  }

  // --- zeigen -----------------------------------------------------------------------

  /** Ein Feld wurde angezeigt — Vorschau dorthin, oder weiterdrehen, wenn sie schon dort liegt. */
  private pointAt(hit: PointerHit | { point: THREE.Vector3 }): void {
    const local = this.board3d.worldToLocal(_local.copy(hit.point));
    const hex = hexAt(local.x, local.z, HEX_WIDTH);
    if (this.at && hex.q === this.at.q && hex.r === this.at.r) {
      this.rotate();
      return;
    }
    this.movePreview(hex, true);
  }

  private movePreview(hex: Hex, speak: boolean): void {
    const spec = this.board.current;
    if (!spec) return;
    if (!this.board.isOpen(hex.q, hex.r)) {
      if (speak && !this.board.at(hex.q, hex.r)) this.say('Nur an die Landschaft anlegen');
      return;
    }
    // **Die Drehung bleibt**, wo die Kachel auch hinwandert — gewünscht: _„Meine
    // gespeicherte Drehung sollte auch beibehalten werden, wenn ich das Tile
    // wechsle bzw. die Position."_ Passt sie dort nicht, wird der Ring rot.
    this.at = hex;
    // **Kachel vordrehen** (Spielhilfe): schon so gedreht, wie sie hier passt.
    if (this.help.smartRotate) this.rot = this.bestRotation(spec, hex);
    this.refresh(false);
  }

  /**
   * **Weiterdrehen** — nur durch die Drehungen, die hier gehen. `1` im
   * Uhrzeigersinn (wie das Antippen der Kachel), `-1` zurück.
   */
  private rotate(dir: 1 | -1 = 1): void {
    if (!this.board.current || !this.at) return;
    // **Immer alle sechs Lagen** — bis Oktober 2026 sprang sie nur durch die,
    // in denen Fluss und Weg weiterlaufen, und an einem Fluss waren das oft
    // zwei: _„Ich kann immer nur zwischen zwei Ausrichtungen wechseln, aber
    // nicht drehen."_ Eine Lage, die nicht geht, zeigt der rote Ring.
    this.rot = (this.rot + dir + 6) % 6;
    this.refresh(false);
  }

  /** Ob die Kachel in der Hand so, wie sie liegt, gelegt werden darf. */
  private fitsHere(): boolean {
    const spec = this.board.current;
    const at = this.at;
    if (!spec || !at) return false;
    return this.board.fit(spec, at.q, at.r, this.rot) !== null || !this.canPlaceSomewhere();
  }

  private placeHere(): boolean {
    const at = this.at;
    if (!at || this.board.over) return false;
    this.setWhy(null);
    const force = !this.canPlaceSomewhere();
    const openBefore = new Set<string>();
    for (const [key, t] of this.board.tiles)
      if (t.spec.quest?.state === 'open') openBefore.add(key);
    const result = this.board.place(at.q, at.r, this.rot, force);
    if (!result) {
      this.say('Passt so nicht · Fluss und Weg müssen weiterlaufen — drehen oder anderes Feld');
      return false;
    }
    const tile = this.board.at(at.q, at.r)!;
    // Was dieses Legen entschieden hat: Aufträge, die eben erfüllt oder verpasst sind.
    const settled: SettledQuest[] = [];
    for (const [key, t] of this.board.tiles) {
      const quest = t.spec.quest;
      if (!quest || quest.state === 'open' || quest.target === null) continue;
      // Die eben gelegte Kachel war vorher nicht auf dem Brett — ihr Auftrag zählt mit.
      if (!openBefore.has(key) && t !== tile) continue;
      settled.push({
        tile: t,
        terrain: quest.terrain,
        target: quest.target,
        size: this.board.areaSize(t.q, t.r, quest.terrain),
        done: quest.state === 'done',
      });
    }
    // **Fertige Aufträge springen** (`HexBoardView.hop`) — sobald die neue
    // Kachel gezeichnet ist, damit sie mitspringt.
    const jumping: Hex[] = [];
    let origin: Hex | null = null;
    for (const { tile: t, terrain, done } of settled) {
      if (!done) continue;
      origin ??= t;
      jumping.push(...this.board.areaTiles(t.q, t.r, terrain));
    }
    // **Erst springen, dann fliegen**: Die Kamera wartet, bis der Sprung
    // vorbei ist. Gewünscht: _„Nach dem erfüllen einer Mission soll die
    // complete Animation noch abgespielt werden komplett und danach erst die
    // Kamera zum nächsten Plätchen fliegen"_.
    const landing = { wait: origin && this.view ? Infinity : 0 };
    void this.view?.add(tile).then(() => {
      landing.wait = origin ? (this.view?.hop(jumping, origin) ?? 0) + LANDING_PAUSE : 0;
    });
    this.lastPlaced = { q: at.q, r: at.r };
    this.at = null;
    writeSave(this.board.save(), this.board.mode);
    this.announceResult(result, settled);
    this.refresh(true);
    // **Die Kamera fliegt zur neuen Kachel** — von oben am Schirm. Gewünscht:
    // _„nach dem Legen des neuen Tiles soll die Kamera zum neuen Tile fliegen …
    // smoothe Bewegung, langsam zu Anfang, dann schnell, dann abbremsen. Aber
    // in einer festen Zeit."_
    // `refresh` hat ein neues Feld gewählt — TypeScript weiß das nicht.
    const next = this.at as Hex | null;
    this.pendingFlight = null;
    if (next) {
      if (landing.wait > 0) this.pendingFlight = { hex: next, landing };
      else this.flyTo(next);
    }
    return true;
  }

  /** Von oben gibt es keine Figur — also auch kein Werkzeug und nichts Getragenes in ihrer Hand. */
  protected override screenHandShown(): boolean {
    return !this.board2d;
  }

  /**
   * **Vorschlag legen** — die Lage von _Intelligent (optimiert)_ (`bestPlacement`,
   * mit Vorausschau), sofort gelegt; die Gründe (`explainPlacement`) bleiben
   * hinter dem ⓘ, bis die nächste Kachel liegt. Gewünscht: _„einen Button im
   * hex Spiel Screen (Hilfe/Lege Vorschlag (intelligent optimiert)) …, der das
   * Tile platziert und ich auf ein (Info Icon) drücken kann um zu erfahren,
   * warum er es dort hin gelegt hat"_.
   */
  private suggest(): void {
    const b = this.board;
    const spec = b.current;
    if (!spec || b.over || b.mode === 'creative' || b.mode === 'world') return;
    const info = { second: null, close: false };
    const pick = bestPlacement(b, 'optimized', undefined, info);
    if (!pick) {
      this.say('Kein Vorschlag — die Kachel passt so nirgends');
      return;
    }
    const reasons = explainPlacement(b, pick, info);
    this.why = { reasons, spec, rot: pick.rot, at: { q: pick.q, r: pick.r } };
    this.at = { q: pick.q, r: pick.r };
    this.rot = pick.rot;
    this.refresh(false);
    this.flyTo(this.at);
  }

  /** Ob die Kachel noch genau so liegt, wie der letzte Vorschlag sie hingeschoben hat. */
  private whyHere(): boolean {
    const why = this.why;
    const at = this.at;
    return (
      !!why &&
      !!at &&
      why.spec === this.board.current &&
      why.at.q === at.q &&
      why.at.r === at.r &&
      why.rot === this.rot
    );
  }

  /** 💡 oder ⓘ — und die Gründe zu, sobald die Kachel den Vorschlag verlässt. */
  private syncSuggest(): void {
    const here = this.whyHere();
    if (here === this.whyShown) return;
    this.whyShown = here;
    if (this.whyButton) {
      this.whyButton.innerHTML = here ? INFO_ICON : LAMP_ICON;
      this.whyButton.title = here ? 'Warum dort?' : 'Vorschlag (Intelligent optimiert)';
    }
    if (!here && this.whyBox) this.whyBox.style.display = 'none';
  }

  private setWhy(why: HexlandWorld['why']): void {
    this.why = why;
    this.syncSuggest();
  }

  /** **Warum dort?** — die Gründe des letzten Vorschlags über der Leiste, ein zweiter Tipp schließt. */
  private showWhy(): void {
    const box = this.whyBox;
    const why = this.why;
    if (!box || !why) return;
    const show = box.style.display === 'none';
    box.style.display = show ? 'flex' : 'none';
    if (!show) return;
    box.replaceChildren();
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:8px;font:700 15px var(--hud-font)';
    const icon = document.createElement('canvas');
    icon.width = icon.height = 64;
    icon.style.cssText = 'width:30px;height:30px;flex:none';
    const heading = this.lastCtx?.topDownView ? this.headingNow(this.lastCtx) : 0;
    drawHexIcon(icon, why.spec, why.rot, heading);
    const title = document.createElement('span');
    title.textContent = 'Warum dort?';
    const go = document.createElement('button');
    go.type = 'button';
    go.textContent = 'Zeigen';
    go.style.cssText =
      'margin-left:auto;padding:3px 10px;border-radius:var(--hud-radius-pill);border:1px solid var(--hud-line);background:var(--hud-raise);color:var(--hud-ink);font:600 12px var(--hud-font);cursor:pointer';
    go.addEventListener('click', (event) => {
      event.stopPropagation();
      this.flyTo(why.at);
    });
    head.append(icon, title, go);
    box.append(head);
    const tone = { good: '#7be08a', bad: '#ff6b6b', info: 'var(--hud-dim)' } as const;
    for (const reason of why.reasons) {
      const line = document.createElement('div');
      line.style.cssText = 'display:flex;gap:8px;align-items:baseline;line-height:1.3';
      const dot = document.createElement('span');
      dot.textContent = '●';
      dot.style.cssText = `color:${tone[reason.tone]};font-size:10px;flex:none`;
      const text = document.createElement('span');
      text.textContent = reason.text;
      if (reason.tone !== 'info') text.style.color = 'var(--hud-ink)';
      else text.style.color = 'var(--hud-dim)';
      line.append(dot, text);
      box.append(line);
    }
  }

  /** Ein Kameraflug, der wartet, bis ein Auftrag fertig gesprungen ist (`placeHere`). */
  private pendingFlight: { hex: Hex; landing: { wait: number } } | null = null;

  private stepPendingFlight(dt: number): void {
    const pending = this.pendingFlight;
    if (!pending) return;
    pending.landing.wait -= dt;
    if (pending.landing.wait > 0) return;
    this.pendingFlight = null;
    // Inzwischen woanders hingezogen? Dann dorthin.
    this.flyTo(this.at ?? pending.hex);
  }

  /** **Die Kamera fliegt zu einer Kachel** (`stepFlight`) — nur von oben am Schirm. */
  private flyTo(hex: Hex): void {
    this.pendingFlight = null;
    if (!this.board2d || !this.lastCtx) return;
    const c = hexCentre(hex.q, hex.r, HEX_WIDTH);
    const rig = this.lastCtx.rig.position;
    this.flight = {
      from: new THREE.Vector3(rig.x, this.lastCtx.rig.getFloorY(), rig.z),
      to: new THREE.Vector3(c.x, this.lastCtx.rig.getFloorY(), c.z),
      t: 0,
    };
  }

  private canPlaceSomewhere(): boolean {
    const spec = this.board.current;
    return spec !== null && this.board.placeableAnywhere(spec);
  }

  private announceResult(result: PlaceResult, settled: readonly SettledQuest[]): void {
    if (this.board.mode === 'creative') return;
    for (const quest of settled) this.celebrate(quest);
    // Am Schirm erzählen die Karten (`questCard`) von den Aufträgen, in der Brille die Zeile.
    const cards = this.board2d && settled.length > 0;
    const parts: string[] = [];
    if (!cards) {
      for (const t of result.questsDone) parts.push(`${TERRAIN_LABEL[t]}-Auftrag erfüllt`);
      for (const t of result.questsFailed) parts.push(`${TERRAIN_LABEL[t]}-Auftrag verpasst`);
      if (result.points > 0) parts.push(`+${result.points}`);
    }
    if (this.board.over) {
      const s = this.board.scoring();
      parts.push(`Partie vorbei · ${s.total} Punkte`);
      this.context?.refreshWorldMenu();
    } else if (this.board.current?.quest) {
      parts.push(`Neuer ${TERRAIN_LABEL[this.board.current.quest.terrain]}-Auftrag`);
    }
    if (parts.length > 0) this.say(parts.join(' · '));
  }

  /**
   * **Ein Auftrag ist entschieden — und man sieht es.** Gewünscht: _„Bei nicht
   * schaffen einer Mission in hex Land und bei, schaffen einer Mission bitte
   * in der ui Feedback geben an den Nutzer."_
   *
   * - **Über der Auftragskachel** steigt ein Schild auf und verblasst
   *   (`pops`): „✓ +5" mit goldenem Rand, oder „✗ 7/5" in Rot — in der Brille
   *   wie am Schirm, dort, wo man hinschaut.
   * - **Erfüllt**: Dazu springt das Gebiet (`HexBoardView.hop`).
   * - **Verpasst**: Der Umriss des Gebiets blinkt dreimal rot und erlischt
   *   (`flashes`) — man sieht, was zu groß geworden ist.
   * - **Am Schirm** kommt zusätzlich eine Karte über die Leiste (`questCard`):
   *   „Stadt-Auftrag erfüllt! · +5 Punkte", oder „Wald-Auftrag verpasst ·
   *   Gebiet 7 statt 5", die rote schüttelt sich.
   */
  private celebrate({ tile, terrain, target, size, done }: SettledQuest): void {
    const badge = new QuestBadge();
    if (done) {
      badge.show(
        terrain,
        [{ text: '✓ ', colour: QUEST_TONE.done }, { text: `+${target}` }],
        QUEST_TONE.done,
      );
    } else {
      badge.show(
        terrain,
        [
          { text: '✗ ', colour: QUEST_TONE.over },
          { text: `${size}/${target}`, colour: QUEST_TONE.over },
        ],
        QUEST_TONE.over,
      );
    }
    badge.renderOrder = 9;
    badge.material.opacity = 0;
    const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
    badge.position.set(c.x, POP_BASE, c.z);
    this.board3d.add(badge);
    this.pops.push({ badge, t: 0 });
    if (!done) {
      const flash = new THREE.Mesh(
        outlineGeometry([
          { colour: QUEST_TONE.over, lines: this.board.areaOutline(tile.q, tile.r, terrain) },
        ]),
        outlineMaterial(),
      );
      flash.frustumCulled = false;
      flash.renderOrder = 7;
      flash.position.y = RIM_HEIGHT + 0.01;
      flash.name = 'hexland-quest-failed';
      this.board3d.add(flash);
      this.flashes.push({ mesh: flash, t: 0 });
    }
    if (this.board2d) {
      this.questCard(
        done,
        terrain,
        done
          ? `${TERRAIN_LABEL[terrain]}-Auftrag erfüllt!`
          : `${TERRAIN_LABEL[terrain]}-Auftrag verpasst`,
        done ? `+${target} ${target === 1 ? 'Punkt' : 'Punkte'}` : `Gebiet ${size} statt ${target}`,
      );
    }
  }

  /** Aufsteigende Schilder über entschiedenen Aufträgen (`celebrate`). */
  private readonly pops: Array<{ badge: QuestBadge; t: number }> = [];
  /** Rot blinkende Umrisse verpasster Aufträge (`celebrate`). */
  private readonly flashes: Array<{
    mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    t: number;
  }> = [];

  /** Einmal je Bild: die Schilder steigen, die roten Umrisse blinken, dann sind sie weg. */
  private stepFeedback(dt: number, ctx: WorldContext): void {
    if (this.pops.length > 0) (ctx.viewCamera ?? ctx.camera).getWorldPosition(_eye);
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const pop = this.pops[i]!;
      pop.t += dt;
      const u = pop.t / POP_SECONDS;
      if (u >= 1) {
        this.board3d.remove(pop.badge);
        pop.badge.dispose();
        this.pops.splice(i, 1);
        continue;
      }
      pop.badge.getWorldPosition(_badge);
      const far = _eye.distanceTo(_badge) / this.board3d.scale.x;
      const size = Math.max(1, far / BADGE_DISTANCE);
      // Kurz aufploppen (über das Ziel hinaus und zurück), dann ruhig steigen.
      const pop01 = Math.min(1, pop.t / 0.3);
      const bounce = pop01 < 1 ? Math.sin(pop01 * Math.PI) * 0.25 + pop01 : 1;
      pop.badge.scale.setScalar(size * 1.25 * bounce);
      pop.badge.position.y = POP_BASE + 0.45 * size + POP_RISE * size * (1 - (1 - u) ** 2);
      pop.badge.material.opacity = u < 0.65 ? Math.min(1, pop.t / 0.12) : 1 - (u - 0.65) / 0.35;
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const flash = this.flashes[i]!;
      flash.t += dt;
      const u = flash.t / FLASH_SECONDS;
      if (u >= 1) {
        this.board3d.remove(flash.mesh);
        flash.mesh.geometry.dispose();
        flash.mesh.material.dispose();
        this.flashes.splice(i, 1);
        continue;
      }
      // Dreimal blinken, jedes Mal etwas schwächer.
      flash.mesh.material.opacity = (0.5 + 0.5 * Math.cos(u * Math.PI * 6)) * (1 - u * 0.7);
    }
  }

  /** **Die Karte über der Leiste** — erfüllt (Gold, springt auf) oder verpasst (Rot, schüttelt sich). */
  private questCard(done: boolean, terrain: QuestTerrain, title: string, sub: string): void {
    let box = this.cardBox;
    if (!box) {
      box = document.createElement('div');
      box.className = 'hexland-quest-cards';
      box.style.cssText = [
        'position:fixed',
        'left:50%',
        'transform:translateX(-50%)',
        'z-index:5',
        'display:flex',
        'flex-direction:column-reverse',
        'align-items:center',
        'gap:8px',
        'pointer-events:none',
        'font-family:var(--hud-font)',
        'user-select:none',
      ].join(';');
      document.body.append(box);
      this.cardBox = box;
    }
    // Knapp über der Leiste unten: Die Mitte des Bilds bleibt frei für das Brett und den Sprung.
    const bar = this.tileBar && !this.tileBar.hidden ? this.tileBar.getBoundingClientRect() : null;
    box.style.bottom = `${bar && bar.height > 0 ? window.innerHeight - bar.top + 12 : 24}px`;
    const accent = done ? QUEST_TONE.done : QUEST_TONE.over;
    const card = document.createElement('div');
    card.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:12px',
      'padding:10px 18px 10px 10px',
      'background:var(--hud-bg)',
      `border:2px solid ${accent}`,
      'border-radius:16px',
      `box-shadow:var(--hud-shadow), 0 0 28px ${accent}66`,
      'backdrop-filter:var(--hud-blur)',
      'color:var(--hud-ink)',
      'white-space:nowrap',
    ].join(';');
    const iconBox = document.createElement('span');
    iconBox.style.cssText = 'position:relative;width:48px;height:48px;flex:none';
    const icon = document.createElement('canvas');
    icon.width = icon.height = 96;
    icon.style.cssText = 'width:48px;height:48px';
    drawHexIcon(icon, {
      base: 'land',
      edges: [terrain, terrain, terrain, terrain, terrain, terrain],
      seed: 1,
    });
    const mark = document.createElement('span');
    mark.textContent = done ? '✓' : '✗';
    mark.style.cssText = [
      'position:absolute',
      'right:-6px',
      'bottom:-4px',
      'width:24px',
      'height:24px',
      'border-radius:50%',
      `background:${accent}`,
      'color:#141824',
      'font:900 16px/24px system-ui, sans-serif',
      'text-align:center',
    ].join(';');
    iconBox.append(icon, mark);
    const text = document.createElement('span');
    text.style.cssText = 'display:flex;flex-direction:column;line-height:1.2';
    const head = document.createElement('strong');
    head.style.cssText = 'font-size:18px';
    head.textContent = title;
    const line = document.createElement('span');
    line.style.cssText = `font-size:14px;font-weight:700;color:${accent}`;
    line.textContent = sub;
    text.append(head, line);
    card.append(iconBox, text);
    box.append(card);
    const enter = card.animate(
      done
        ? [
            { transform: 'translateY(-10px) scale(0.6)', opacity: 0 },
            { transform: 'translateY(0) scale(1.08)', opacity: 1, offset: 0.6 },
            { transform: 'scale(1)', opacity: 1 },
          ]
        : [
            { transform: 'translateY(-10px)', opacity: 0 },
            { transform: 'translateX(0)', opacity: 1, offset: 0.3 },
            { transform: 'translateX(-9px)', offset: 0.45 },
            { transform: 'translateX(8px)', offset: 0.6 },
            { transform: 'translateX(-6px)', offset: 0.75 },
            { transform: 'translateX(4px)', offset: 0.88 },
            { transform: 'translateX(0)', opacity: 1 },
          ],
      { duration: done ? 420 : 620, easing: 'ease-out' },
    );
    void enter.finished
      .then(
        () =>
          card.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], {
            duration: 450,
            delay: CARD_SECONDS * 1000,
            fill: 'forwards',
          }).finished,
      )
      .catch(() => undefined)
      .finally(() => card.remove());
  }

  private cardBox: HTMLDivElement | null = null;

  private say(message: string): void {
    this.context?.notify(message);
  }

  // --- zeichnen -----------------------------------------------------------------

  /**
   * **Alles nachziehen, was vom Brett abhängt**: freie Felder, Vorschau,
   * Aufgabenschilder. `fresh`: eine neue Kachel ist dran — die Vorschau sucht
   * sich selbst ein Feld nahe der Figur.
   */
  private refresh(fresh: boolean): void {
    this.drawSlots();
    if (this.table) this.fitTableTop();
    const spec = this.board.current;
    if (!spec) {
      this.drawBadges();
      this.hand.visible = false;
      // Ohne Kachel in der Hand (Spielende, Welt-Modus) zeigt die Leiste trotzdem, was gilt.
      this.drawBarIcon();
      return;
    }
    // Im Tisch-Modus liegt die neue Kachel verdeckt im Stapel, bis man sie nimmt.
    if (this.table) {
      if (fresh) this.table.drawn = false;
    } else if (fresh || !this.at) this.autoPlace();
    // Nach `autoPlace`: Die Schilder rechnen mit der Kachel, wo sie jetzt schwebt.
    this.drawBadges();
    if (this.previewFor !== spec) {
      this.previewFor = spec;
      const old = this.previewTile;
      void buildTileGroup(this.models, spec).then((group) => {
        if (this.previewFor !== spec) return;
        group.userData.sharedAssets = true;
        if (old) this.hand.remove(old);
        if (this.previewTile) this.hand.remove(this.previewTile);
        this.previewTile = group;
        this.hand.add(group);
        this.clipPreview(this.table !== null);
        this.posePreview();
      });
    }
    this.posePreview();
  }

  /** **Das beste Feld nahe der Figur** für die neue Kachel. */
  private autoPlace(): void {
    const spec = this.board.current;
    if (!spec) return;
    const slots = this.board.openSlots();
    if (slots.length === 0) return;
    // **Woher gemessen wird**: von der zuletzt gelegten Kachel — gewünscht:
    // _„Wenn ich ein Tile gesetzt habe, soll das neue Tile dann nicht irgendwo
    // default vorbereitet werden, sondern an einem angrenzenden freien Feld
    // platziert werden oder sonst am nächsten dran."_ Ohne eine (frisch
    // betreten) von der Bildmitte.
    const from = this.lastPlaced
      ? hexCentre(this.lastPlaced.q, this.lastPlaced.r, HEX_WIDTH)
      : (this.context?.rig.position ?? { x: 0, z: 0 });
    const far = (slot: Hex): number => {
      const c = hexCentre(slot.q, slot.r, HEX_WIDTH);
      return Math.hypot(c.x - from.x, c.z - from.z) / HEX_WIDTH;
    };
    const place = this.help.place;
    let best: { hex: Hex; rot: number; score: number } | null = null;
    // **Intelligent (optimiert)** rechnet über `hexPlanner` — dieselbe
    // Rechnung wie im Benchmark (`npm run hexbench`, mit Vorausschau), bei
    // Gleichstand näher.
    if (place === 'optimized') {
      const pick = bestPlacement(this.board, 'optimized', (slot) => -far(slot) * 0.01);
      if (pick) best = { hex: { q: pick.q, r: pick.r }, rot: pick.rot, score: pick.score };
    }
    for (const slot of place === 'optimized' ? [] : slots) {
      // In der Nähe behält die Kachel die Drehung des Spielers (oder die
      // vorgedrehte); an Auftrag und Grenze dreht die Hilfe sie selbst.
      const keep =
        place === 'near' &&
        !this.help.smartRotate &&
        this.board.fit(spec, slot.q, slot.r, this.rot);
      const rot = keep ? this.rot : this.bestRotation(spec, slot);
      const fit = this.board.fit(spec, slot.q, slot.r, rot);
      // Ein Feld, auf dem sie so gar nicht liegen darf, nur als letzter Ausweg.
      const penalty = fit ? 0 : 1000;
      const matched = fit?.matched ?? 0;
      let score: number;
      if (place === 'near') score = -far(slot) - penalty;
      else if (place === 'smart') {
        score = this.questScore(spec, slot, rot) + matched - far(slot) * 0.25 - penalty;
      } else {
        // Auch an der Grenze nie dorthin, wo ein Auftrag unmöglich würde.
        const ratio = fit && fit.neighbours > 0 ? matched / fit.neighbours : 0;
        // Ein Auftrag, der hier genau fertig würde, wiegt so viel wie zwei
        // passende Kanten — gewünscht: _„Bei dem Vorschlag sollte ggf. auch dort
        // vorgeschlagen werden, wo Aufträge am ehesten beendet werden."_
        const a = fit ? this.board.assess(spec, slot.q, slot.r, rot) : null;
        const quests = a ? a.completes * 6 + a.closer - a.breaks * 100 : 0;
        score = matched * 3 + ratio + quests - far(slot) * 0.25 - penalty;
      }
      if (!best || score > best.score) best = { hex: slot, rot, score };
    }
    if (!best) return;
    this.at = best.hex;
    this.rot = best.rot;
  }

  /**
   * **Was eine Lage den Aufträgen bringt** (`HexBoard.assess`): Ein Auftrag,
   * der genau seine Zahl erreicht, zählt am meisten; danach, wie nah die
   * übrigen ihrer Zahl kommen, dann bloßes Wachstum — und ein Auftrag, der
   * dadurch unerfüllbar würde, schließt die Lage praktisch aus.
   *
   * Gewünscht: _„Bei dem Vorschlag sollte ggf. auch dort vorgeschlagen werden,
   * wo Aufträge am ehesten beendet werden."_ Ein Auftrag bei 4 / 5, der auf
   * 5 / 5 käme, schlägt jedes Wachstum anderswo; einer, der auf 4 / 5 wüchse,
   * einen, der auf 2 / 6 wüchse.
   */
  private questScore(spec: TileSpec, slot: Hex, rot: number): number {
    const a = this.board.assess(spec, slot.q, slot.r, rot);
    // Fertig zählt nach Punkten: Eine Stadt 5, die sofort fertig wird, schlägt
    // einen Weg 4 — gemeldet: _„Intelligent könnte die Stadt direkt beenden,
    // stattdessen wird das Tile woanders vorgeschlagen."_
    // Ein vorbereitetes Gebiet für einen Auftrag, der noch im Stapel liegt
    // (`ready`), zählt dafür. Einen neuen Auftrag an einen offenen hängen ist
    // gut, nicht schlecht — gewünscht: _„Hier wurde der Fluss falsch
    // vorgeschlagen, und nicht bei der Fluss-Mission"_.
    return (
      a.completes * 50 +
      a.points * 4 +
      a.closer * 20 +
      a.progress * 5 +
      a.ready * 8 -
      a.breaks * 100
    );
  }

  /**
   * **Die Drehung, die auf diesem Feld am besten passt** — Aufträge zuerst,
   * dann passende Kanten; bei Gleichstand die jetzige, damit nichts unnötig
   * springt. Geht keine, bleibt die jetzige.
   */
  private bestRotation(spec: TileSpec, slot: Hex): number {
    let best = this.rot;
    let bestScore = -Infinity;
    for (let k = 0; k < 6; k++) {
      const rot = (this.rot + k) % 6;
      const fit = this.board.fit(spec, slot.q, slot.r, rot);
      if (!fit) continue;
      const score = this.questScore(spec, slot, rot) + fit.matched;
      if (score > bestScore) {
        bestScore = score;
        best = rot;
      }
    }
    return best;
  }

  private posePreview(): void {
    // In der Hand (Tisch-Modus) trägt die Hand die Kachel, nicht das Feld.
    if (this.table?.held) {
      this.drawBarIcon();
      return;
    }
    const spec = this.board.current;
    const at = this.at;
    if (!spec || !at) {
      this.hand.visible = false;
      // Die Leiste zeigt trotzdem, was gilt — am Spielende die Endpunkte.
      this.drawBarIcon();
      return;
    }
    const c = hexCentre(at.q, at.r, HEX_WIDTH);
    this.hand.position.set(c.x, 0, c.z);
    this.hand.visible = true;
    if (this.previewTile) this.previewTile.rotation.y = -this.rot * (Math.PI / 3);
    // Rot, wenn diese Lage nicht geht — sonst das warme Gelb.
    const fits = this.fitsHere();
    if (this.ring)
      (this.ring.material as THREE.MeshBasicMaterial).color.setHex(fits ? 0xffd84a : 0xe0605f);
    if (this.legenButton) {
      this.legenButton.textContent = fits ? '✓ Legen' : 'Passt so nicht';
      this.legenButton.style.background = fits ? 'rgba(36,120,64,0.95)' : 'rgba(110,40,40,0.95)';
      this.legenButton.style.borderColor = fits ? 'rgba(95,224,122,0.6)' : 'rgba(224,96,95,0.6)';
    }
    this.confirm?.setText(
      fits ? '✓ Legen' : 'Passt so nicht',
      undefined,
      fits ? 0x5fe07a : 0xe0605f,
    );
    const matches = this.board.edgeMatches(spec, at.q, at.r, this.rot);
    matches.forEach((match, e) => {
      const bar = this.previewEdges[e]!;
      bar.visible = match !== null;
      (bar.material as THREE.MeshBasicMaterial).color.setHex(match ? 0x5fe07a : 0xe0605f);
    });
    const quest = spec.quest ? ` · ${TERRAIN_LABEL[spec.quest.terrain]}-Auftrag` : '';
    const flag = spec.flag ? ` · Flagge ${TERRAIN_LABEL[spec.flag]}` : '';
    this.info?.setText(this.statusTitle(), `${this.statusLine()}${quest}${flag}`);
    const label = this.questLabel(spec);
    if (this.handQuest) {
      this.handQuest.visible = label !== null;
      if (label) {
        const quest = spec.quest!;
        this.handQuest.show(quest.terrain, this.handQuestText ?? `${quest.target ?? '?'}`);
      }
    }
    this.drawBarIcon();
  }

  /** Die große Zeile: Punkte, oder dass gebaut wird. */
  private statusTitle(): string {
    if (this.board.mode === 'world') return 'Welt';
    return this.board.mode === 'creative' ? 'Kreativ' : `${this.board.scoring().total} Punkte`;
  }

  /** Die kleine Zeile: was im Stapel liegt und wie viele Aufträge offen sind. */
  private statusLine(): string {
    if (this.board.mode === 'creative') return 'Katalog · im Menü';
    if (this.board.mode === 'world') return `${this.board.tiles.size} Kacheln`;
    const b = this.board;
    const stack = b.mode === 'endless' ? '∞' : `${b.stack.length}`;
    const left = Number.isFinite(b.tasksLeft) ? ` · noch ${b.tasksLeft}` : '';
    return `Stapel ${stack} · Aufträge ${b.openTasks()}/${OPEN_TASKS}${left}`;
  }

  /** **Das Bildchen der Kachel in der Hand** in der Leiste — gedreht wie sie liegen wird. */
  private drawBarIcon(): void {
    const spec = this.board.current;
    const ended = this.board.over && this.board.mode !== 'creative' && this.board.mode !== 'world';
    const world = this.board.mode === 'world';
    if (this.worldRow) this.worldRow.style.display = world ? 'grid' : 'none';
    if (this.playRow) this.playRow.style.display = ended || world ? 'none' : 'grid';
    if (this.endRow) this.endRow.style.display = ended ? 'grid' : 'none';
    if (this.tileBarIcon) this.tileBarIcon.style.display = ended ? 'none' : '';
    const playing = this.board.mode === 'game' || this.board.mode === 'endless';
    if (this.barTools) this.barTools.style.display = playing && !ended ? 'flex' : 'none';
    this.syncSuggest();
    if (!ended && this.detailBox) this.detailBox.style.display = 'none';
    if (ended && this.tileBarText) {
      const done = this.questCount('done');
      this.tileBarText.innerHTML =
        `<b style="color:var(--hud-ink);font-size:20px">Spielende · ${this.board.scoring().total} Punkte</b>` +
        `<br>${this.board.tiles.size} Kacheln gelegt · ${done} ${done === 1 ? 'Auftrag' : 'Aufträge'} erfüllt`;
      return;
    }
    if (this.tileBarText) {
      // Ohne „Auftrag: Weizen 6" — das steht im Bildchen daneben und über der
      // Kachel. Gewünscht: _„Ich brauche in dem panel auch nicht die
      // information ‚Auftrag Weizen'."_
      this.tileBarText.innerHTML =
        `<b style="color:var(--hud-ink);font-size:15px">${this.statusTitle()}</b> · ${this.barCounts()}` +
        (spec?.flag
          ? `<br>Flagge: ${TERRAIN_LABEL[spec.flag]} — schließe das Gebiet`
          : this.board.mode === 'world'
            ? `<br>${this.generating ? 'Generiert …' : 'Im Kreis um die Mitte, jede Kachel passt genau'}`
            : '<br>Feld antippen · Kachel antippen dreht');
    }
    if (!this.tileBarIcon) return;
    const heading = this.lastCtx?.topDownView ? this.headingNow(this.lastCtx) : 0;
    if (spec) drawHexIcon(this.tileBarIcon, spec, this.rot, heading);
    else this.tileBarIcon.getContext('2d')?.clearRect(0, 0, 999, 999);
    this.iconHeading = heading;
  }

  /**
   * **Wie viele Kacheln und Aufträge noch kommen, mit Bildchen** — gewünscht:
   * _„Ich will im Spiel noch sehen, wie viele Tiles und Missionen ich habe
   * (ggf. mit Icons da über dem Legen-Button)"_. Ein Sechseck für die
   * Kacheln im Stapel, ein Sechseck mit Ring für die Aufträge: offen auf dem
   * Brett / drei, und wie viele noch im Auftragsstapel liegen.
   */
  private barCounts(): string {
    const b = this.board;
    if (b.mode === 'creative' || b.mode === 'world') return this.statusLine();
    const hex = (inner: string): string =>
      `<svg viewBox="0 0 20 20" width="15" height="15" style="vertical-align:-2px;margin-right:3px">` +
      `<polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" fill="#9cc95a" stroke="#fff" stroke-width="1.4"/>${inner}</svg>`;
    const tile = hex('');
    const task = hex(
      '<circle cx="10" cy="10" r="4.2" fill="#fff" stroke="#c8553d" stroke-width="1.6"/>',
    );
    const stack = b.mode === 'endless' ? '∞' : `${b.stack.length}`;
    const deck = Number.isFinite(b.tasksLeft) ? ` · ${b.tasksLeft}` : '';
    return (
      `<span title="Kacheln im Stapel">${tile}${stack}</span>` +
      ` &nbsp; <span title="Aufträge offen / ${OPEN_TASKS} · noch im Auftragsstapel">${task}${b.openTasks()}/${OPEN_TASKS}${deck}</span>`
    );
  }

  /** Wie viele Aufträge auf dem Brett erfüllt (`done`) oder verpasst sind. */
  private questCount(state: 'done' | 'failed'): number {
    let n = 0;
    for (const tile of this.board.tiles.values()) if (tile.spec.quest?.state === state) n++;
    return n;
  }

  /** **Punkte im Detail** — über der Leiste, ein Tipp auf _Punkte_ zeigt und verbirgt sie. */
  private toggleDetails(): void {
    const box = this.detailBox;
    if (!box) return;
    const show = box.style.display === 'none';
    box.style.display = show ? 'flex' : 'none';
    if (!show) return;
    const s = this.board.scoring();
    const line = (label: string, points: number, note = ''): string =>
      `<div style="display:flex;justify-content:space-between;gap:12px"><span>${label}` +
      `${note ? `<span style="color:var(--hud-dim);font-weight:500"> · ${note}</span>` : ''}</span><b>${points}</b></div>`;
    box.innerHTML =
      line(
        'Aufträge',
        s.tasks,
        `${this.questCount('done')} erfüllt, ${this.questCount('failed')} verpasst`,
      ) +
      line('Flaggen', s.flags, 'geschlossene Gebiete') +
      line('Längster Fluss', s.river, 'je Kachel 1') +
      line('Längster Weg', s.road, 'je Kachel 1') +
      `<div style="border-top:1px solid var(--hud-line);margin-top:4px;padding-top:4px">${line('Gesamt', s.total)}</div>`;
  }

  /**
   * **Am Spielende kreist die Kamera** — gewünscht: _„Dabei fliegt die Kamera
   * um die Spielwelt herum im 40°-Winkel und dreht sich langsam."_ Einmal zu
   * Beginn: Mitte des Bretts, Abstand, dass alles hineinpasst, Neigung 40°;
   * dann dreht sie sich in jedem Bild ein Stück weiter. Wer zoomt, darf das.
   */
  private orbitEnd(dt: number, ctx: WorldContext): void {
    const ended =
      this.board.over &&
      this.board.mode !== 'creative' &&
      this.board.mode !== 'world' &&
      this.board2d;
    const view = ctx.topDownView;
    if (!ended || !view) {
      if (this.tiltBefore !== null && !this.board.over) {
        view?.tilt?.(this.tiltBefore);
        this.tiltBefore = null;
      }
      return;
    }
    if (this.tiltBefore === null) {
      this.tiltBefore = view.tilt?.() ?? 60;
      view.tilt?.(40);
      let x = 0;
      let z = 0;
      for (const t of this.board.tiles.values()) {
        const c = hexCentre(t.q, t.r, HEX_WIDTH);
        x += c.x;
        z += c.z;
      }
      const n = Math.max(1, this.board.tiles.size);
      this.orbitCentre.set(x / n, ctx.rig.getFloorY(), z / n);
      let radius = 0;
      for (const t of this.board.tiles.values()) {
        const c = hexCentre(t.q, t.r, HEX_WIDTH);
        radius = Math.max(radius, Math.hypot(c.x - this.orbitCentre.x, c.z - this.orbitCentre.z));
      }
      // So weit weg, dass das ganze Brett auch quer ins Bild passt (am Handy hochkant).
      const camera = ctx.viewCamera ?? ctx.camera;
      const spread =
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect);
      const fit = (0.85 * (radius + HEX_WIDTH)) / Math.max(0.05, spread);
      view.set({ ...view.get(), zoom: Math.min(HEX_MAX_ZOOM, Math.max(22, fit)) });
      this.flight = null;
    }
    this.movePlayerTo(ctx, this.orbitCentre);
    view.twist?.(dt * ORBIT_SPEED);
  }

  private readonly orbitCentre = new THREE.Vector3();

  /** **„Dorf 4"** — was der Auftrag einer Kachel verlangt, oder `null`. */
  private questLabel(spec: TileSpec | null): string | null {
    const quest = spec?.quest;
    if (!quest) return null;
    return `${TERRAIN_LABEL[quest.terrain]} ${quest.target ?? '?'}`;
  }

  /** Die Drehung des Bildes von oben, im Bogenmaß — 0, wo es keins gibt. */
  private headingNow(ctx: WorldContext): number {
    return ctx.topDownView?.get().heading ?? 0;
  }

  /** Mit welcher Drehung das Bildchen zuletzt gemalt wurde. */
  private iconHeading = 0;

  private drawSlots(): void {
    let slots = this.slots;
    if (!slots) return;
    const open = this.board.openSlots();
    if (open.length > slots.instanceMatrix.count) {
      const bigger = new THREE.InstancedMesh(slots.geometry, slots.material, open.length * 2);
      bigger.frustumCulled = false;
      bigger.name = slots.name;
      this.board3d.remove(slots);
      slots.dispose();
      this.board3d.add(bigger);
      this.slots = slots = bigger;
    }
    const m = new THREE.Matrix4();
    const colour = new THREE.Color();
    const spec = this.board.current;
    open.forEach((slot, i) => {
      const c = hexCentre(slot.q, slot.r, HEX_WIDTH);
      slots.setMatrixAt(i, m.makeTranslation(c.x, 0.01, c.z));
      slots.setColorAt(i, this.slotColour(spec, slot, colour));
    });
    slots.count = this.board.over ? 0 : open.length;
    slots.instanceMatrix.needsUpdate = true;
    if (slots.instanceColor) slots.instanceColor.needsUpdate = true;
    this.drawDigits(open, spec);
  }

  /**
   * **Wie viele Kanten bestenfalls passen** — als Ziffer auf jedem freien Feld,
   * wo die Kachel überhaupt liegen darf. Gewünscht: _„bei der Anzeige je
   * kräftiger wäre es schön, wenn da eine Zahl steht, wie viele Kanten
   * passen"_. Die Ziffern liegen flach und sind zum Bild gedreht
   * (`digitHeading`), damit man sie auch nach dem Drehen lesen kann.
   */
  private drawDigits(open: Hex[], spec: TileSpec | null): void {
    const counts = this.digits.map(() => 0);
    const heading = this.lastCtx ? this.headingNow(this.lastCtx) : 0;
    this.digitHeading = heading;
    if (this.help.numbers && spec && !this.board.over) {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-Math.PI / 2, heading, 0, 'YXZ'),
      );
      const scale = new THREE.Vector3(1, 1, 1);
      for (const slot of open) {
        let best = -1;
        for (let rot = 0; rot < 6; rot++) {
          const fit = this.board.fit(spec, slot.q, slot.r, rot);
          if (fit) best = Math.max(best, fit.matched);
        }
        if (best < 0) continue;
        const mesh = this.digits[best]!;
        const i = counts[best]!;
        if (i >= mesh.instanceMatrix.count) continue;
        const c = hexCentre(slot.q, slot.r, HEX_WIDTH);
        mesh.setMatrixAt(i, m.compose(new THREE.Vector3(c.x, 0.06, c.z), q, scale));
        counts[best] = i + 1;
      }
    }
    this.digits.forEach((mesh, n) => {
      mesh.count = counts[n]!;
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  /**
   * **Wie ein freies Feld gefärbt ist** — weiß, oder mit der Spielhilfe
   * _Passende Felder zeigen_: gold, wo die Kachel einen offenen Auftrag
   * weiterführt; grün, je mehr Kanten passen; rötlich, wo sie gar nicht
   * liegen darf.
   */
  private slotColour(spec: TileSpec | null, slot: Hex, out: THREE.Color): THREE.Color {
    if (!(this.help.colours || this.help.numbers) || !spec) return out.setHex(0xffffff);
    let bestMatched = -1;
    let ratio = 0;
    let helps = false;
    let safe = false;
    for (let rot = 0; rot < 6; rot++) {
      const fit = this.board.fit(spec, slot.q, slot.r, rot);
      if (!fit) continue;
      const a = this.board.assess(spec, slot.q, slot.r, rot);
      if (a.breaks === 0) {
        safe = true;
        if (a.progress > 0 || a.completes > 0) helps = true;
      }
      if (fit.matched > bestMatched) {
        bestMatched = fit.matched;
        ratio = fit.neighbours > 0 ? fit.matched / fit.neighbours : 0;
      }
    }
    if (bestMatched < 0) return out.setHex(0xe8a0a0);
    if (!this.help.colours) return out.setHex(0xffffff);
    // Orange: Legen geht, aber in jeder Lage würde ein Auftrag unerfüllbar.
    if (!safe) return out.setHex(0xf0a050);
    if (helps) return out.setHex(0xffd84a);
    return out.setHex(0xffffff).lerp(_green, Math.min(1, 0.25 + ratio * 0.75));
  }

  /**
   * **Die Schilder bleiben am Schirm gleich groß** — gemeldet: _„Der Text
   * scheint schmierig bzw. unscharf zu sein, wenn ich weit raus zoome."_ Klein
   * gerechnet verschwimmt die Schrift in den Mipmaps; so wächst das Schild mit
   * dem Abstand und behält seine Pixel. Es steht dann auch entsprechend höher.
   */
  private sizeBadges(ctx: WorldContext): void {
    if (this.badges.size === 0) return;
    (ctx.viewCamera ?? ctx.camera).getWorldPosition(_eye);
    for (const badge of this.badges.values()) {
      badge.getWorldPosition(_badge);
      // In Kacheln gemessen: Im Tisch-Modus ist das Brett eine Miniatur.
      const far = _eye.distanceTo(_badge) / this.board3d.scale.x;
      const scale = Math.max(1, far / BADGE_DISTANCE);
      badge.scale.setScalar(scale);
      // Ganz weit draußen lägen die Schilder übereinander — dort reicht die Liste oben rechts.
      badge.visible = far < BADGE_HIDE;
      badge.position.y = 1.0 + 0.45 * scale;
    }
  }

  /**
   * **Die Schilder der offenen Aufträge** — wie groß das Gebiet ist und werden
   * soll, und **was die Kachel in der Hand daran ändert**: Liegt sie so, wie
   * sie schwebt (und dort gelegt werden darf), rechnet das Brett probehalber
   * mit ihr (`HexBoard.pretend`). Ein Auftrag, der wüchse, zeigt schon „5/5",
   * die 5 farbig (`QUEST_TONE`), die Liste oben rechts ebenso. Gewünscht:
   * _„Auch soll bei der Mission dann angezeigt werden, wie der Wert sich
   * verändern würde"_ und dann _„nur X/Y"_. Die Umrisse am Boden zeigen das
   * Gebiet ebenso schon mit der Kachel.
   */
  private drawBadges(): void {
    const seen = new Set<string>();
    const open: QuestRow[] = [];
    for (const tile of this.board.tiles.values()) {
      const progress = this.board.questProgress(tile);
      if (progress === null) continue;
      open.push({ tile, terrain: tile.spec.quest!.terrain, ...progress, next: progress.size });
    }
    const spec = this.board.current;
    const at = this.at;
    const preview = spec && at && !this.table?.held && this.fitsHere() ? { spec, at } : null;
    let outlines: QuestOutline[];
    this.handQuestText = null;
    if (preview) {
      outlines = this.board.pretend(preview.spec, preview.at.q, preview.at.r, this.rot, () => {
        for (const row of open) row.next = this.board.areaSize(row.tile.q, row.tile.r, row.terrain);
        const placed = this.board.at(preview.at.q, preview.at.r)!;
        const own = this.board.questProgress(placed);
        const shapes = open.map((row) => this.questOutline(row.tile, row.terrain));
        if (own) {
          this.handQuestText = `${own.size}/${own.target}`;
          shapes.push(this.questOutline(placed, placed.spec.quest!.terrain));
        }
        return shapes;
      });
    } else {
      outlines = open.map((row) => this.questOutline(row.tile, row.terrain));
    }
    for (const row of open) {
      const { tile, terrain, target } = row;
      const key = hexKey(tile.q, tile.r);
      seen.add(key);
      let badge = this.badges.get(key);
      if (!badge) {
        badge = new QuestBadge();
        const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
        badge.position.set(c.x, 1.45, c.z);
        this.badges.set(key, badge);
        this.board3d.add(badge);
      }
      // **Nur X/Y** — X ist schon der Wert mit der Kachel in der Hand, farbig,
      // wenn er sich ändert (`QUEST_TONE`).
      const tone = questTone(row);
      badge.show(terrain, [
        { text: `${row.next}`, colour: tone ? QUEST_TONE[tone] : undefined },
        { text: `/${target}` },
      ]);
    }
    this.drawQuestList(open);
    this.drawQuestRims(outlines, preview?.at ?? null);
    for (const [key, badge] of this.badges) {
      if (seen.has(key)) continue;
      this.board3d.remove(badge);
      badge.dispose();
      this.badges.delete(key);
    }
  }

  private questOutline(tile: PlacedTile, terrain: QuestTerrain): QuestOutline {
    return { terrain, lines: this.board.areaOutline(tile.q, tile.r, terrain) };
  }

  /**
   * **Was zu einem Auftrag zählt, ist am Boden umrandet** — eine eckige Linie
   * um das ganze Gebiet (`HexBoard.areaOutline`): an den Außenkanten entlang
   * und, wo das Gebiet mitten auf einer Kachel endet, quer über die Kachel
   * von der Mitte zur Ecke. Kanten zwischen zwei Kacheln desselben Gebiets
   * bleiben frei. Gewünscht erst _„die Elemente zu highlighten"_, dann _„nur
   * dort, wo es wirklich angrenzt"_, und zuletzt, mit einer Skizze: _„Die
   * zusammenhängenden Gebiete der Missionen sind rund, sollen aber eckig
   * sein"_.
   *
   * Gezeichnet als Band mit Gehrung und weichem Schein nach innen
   * (`hexOutline.ts`), ohne Tiefenprüfung über Bäumen und Häusern, unter den
   * Schildern. **Die Linien auf dem Feld der schwebenden Kachel schweben mit
   * ihr** — sie hängen an der Vorschau (`handRims`), nicht am Brett. Gemeldet:
   * _„Auch schweben die Linien nicht mit wenn das tile schwebt vor dem
   * legen."_
   */
  private drawQuestRims(outlines: QuestOutline[], floating: Hex | null): void {
    if (!this.questRims) {
      this.questRims = new THREE.Mesh(new THREE.BufferGeometry(), outlineMaterial());
      this.questRims.frustumCulled = false;
      this.questRims.renderOrder = 7;
      this.questRims.position.y = RIM_HEIGHT;
      this.questRims.name = 'hexland-quest-rims';
      this.board3d.add(this.questRims);
      this.handRims = new THREE.Mesh(new THREE.BufferGeometry(), this.questRims.material);
      this.handRims.frustumCulled = false;
      this.handRims.renderOrder = 7;
      this.handRims.name = 'hexland-quest-rims-hand';
      this.hand.add(this.handRims);
    }
    const board = new Map<QuestTerrain, OutlineLine[]>();
    const hand = new Map<QuestTerrain, OutlineLine[]>();
    const drawn = new Set<string>();
    for (const { terrain, lines } of outlines) {
      for (const line of lines) {
        const id = `${terrain}|${line.q},${line.r},${line.edge},${line.spoke},${line.side}`;
        if (drawn.has(id)) continue;
        drawn.add(id);
        const onHand = floating !== null && line.q === floating.q && line.r === floating.r;
        const into = onHand ? hand : board;
        let list = into.get(terrain);
        if (!list) into.set(terrain, (list = []));
        list.push(line);
      }
    }
    const groups = (from: Map<QuestTerrain, OutlineLine[]>): OutlineGroup[] =>
      [...from].map(([terrain, lines]) => ({ colour: TERRAIN_COLOUR[terrain], lines }));
    this.questRims.geometry.dispose();
    this.questRims.geometry = outlineGeometry(groups(board));
    this.handRims!.geometry.dispose();
    this.handRims!.geometry = floating
      ? outlineGeometry(groups(hand), hexCentre(floating.q, floating.r, HEX_WIDTH))
      : new THREE.BufferGeometry();
  }

  private questRims: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;
  /** Die Linien auf dem Feld der schwebenden Kachel — sie schweben mit ihr. */
  private handRims: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | null = null;

  /**
   * **Die offenen Aufträge oben rechts** — gewünscht: _„Ich würde gerne
   * seitlich in der UI oben rechts meine aktiven Quests sehen, und wenn ich
   * drauf tippe, springt die Kamera zu der Kachel hin."_ Je Auftrag eine
   * Zeile: das Gelände als Sechseck, „Stadt 2 / 5", darunter, wie viele noch
   * fehlen. Nur am Schirm von oben, wie die Leiste unten (`fitView`).
   */
  private drawQuestList(open: QuestRow[]): void {
    let list = this.questList;
    if (!list) {
      list = document.createElement('div');
      list.className = 'hexland-quests';
      list.style.cssText = [
        'position:fixed',
        'right:max(10px, env(safe-area-inset-right))',
        'top:max(10px, var(--safe-top, env(safe-area-inset-top, 0px)))',
        'z-index:4',
        'display:flex',
        'flex-direction:column',
        'gap:6px',
        'max-width:46vw',
        'font-family:var(--hud-font)',
        'user-select:none',
      ].join(';');
      document.body.append(list);
      this.questList = list;
    }
    list.replaceChildren();
    const playing = this.board.mode === 'game' || this.board.mode === 'endless';
    if (playing) list.append(this.overviewToggle());
    if (playing && this.overview) list.append(this.drawOverview());
    for (const quest of open) {
      const { tile, next, target, terrain } = quest;
      const row = document.createElement('button');
      row.type = 'button';
      row.title = 'Zur Kachel';
      row.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:8px',
        'padding:6px 12px 6px 6px',
        'background:var(--hud-bg)',
        `border:1px solid ${TERRAIN_COLOUR[terrain]}`,
        'border-radius:12px',
        'box-shadow:var(--hud-shadow)',
        'backdrop-filter:var(--hud-blur)',
        'color:var(--hud-ink)',
        'font:inherit',
        'text-align:left',
        'cursor:pointer',
        'touch-action:manipulation',
      ].join(';');
      const icon = document.createElement('canvas');
      icon.width = icon.height = 64;
      icon.style.cssText = 'width:32px;height:32px;flex:none';
      drawHexIcon(icon, {
        base: 'land',
        edges: [terrain, terrain, terrain, terrain, terrain, terrain],
        seed: 1,
      });
      const text = document.createElement('span');
      text.style.cssText = 'display:flex;flex-direction:column;line-height:1.15;min-width:0';
      const title = document.createElement('strong');
      title.style.cssText = 'font-size:15px;white-space:nowrap';
      // Nur „X / Y" — X farbig, wenn die Kachel in der Hand etwas ändert.
      const tone = questTone(quest);
      const value = document.createElement('span');
      value.textContent = `${next}`;
      if (tone) value.style.color = QUEST_TONE[tone];
      title.append(`${TERRAIN_LABEL[terrain]} `, value, ` / ${target}`);
      text.append(title);
      // Ohne „noch X" — das steht schon in X / Y. Gewünscht: _„Bei den
      // Missionen das ‚noch' bitte entfernen."_ Nur was die Kachel in der Hand
      // entscheidet, steht darunter.
      if (tone === 'done' || tone === 'over') {
        const sub = document.createElement('span');
        sub.style.cssText = `font-size:12px;white-space:nowrap;color:${QUEST_TONE[tone]}`;
        sub.textContent = tone === 'done' ? '✓ wird erfüllt' : '✗ wird zu groß';
        text.append(sub);
      }
      row.append(icon, text);
      row.addEventListener('click', (event) => {
        event.stopPropagation();
        this.flyTo(tile);
      });
      // Der Finger auf der Liste ist kein Wischen übers Brett.
      for (const type of ['pointerdown', 'touchstart'] as const)
        row.addEventListener(type, (event) => event.stopPropagation());
      list.append(row);
    }
  }

  /** Der kleine Knopf über den offenen Aufträgen, der die Übersicht auf- und zuklappt. */
  private overviewToggle(): HTMLElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = this.overview ? 'Alle Aufträge ▴' : 'Alle Aufträge ▾';
    b.title = 'Erfüllte, verpasste und kommende Aufträge zeigen';
    b.style.cssText = [
      'align-self:flex-end',
      'padding:4px 10px',
      'background:var(--hud-bg)',
      'border:1px solid var(--hud-line)',
      'border-radius:var(--hud-radius-pill)',
      'box-shadow:var(--hud-shadow)',
      'backdrop-filter:var(--hud-blur)',
      'color:var(--hud-ink)',
      'font:600 12px var(--hud-font)',
      'cursor:pointer',
      'touch-action:manipulation',
    ].join(';');
    b.addEventListener('click', (event) => {
      event.stopPropagation();
      this.overview = !this.overview;
      writeFlag(OVERVIEW_KEY, this.overview);
      this.drawBadges();
    });
    for (const type of ['pointerdown', 'touchstart'] as const)
      b.addEventListener(type, (event) => event.stopPropagation());
    return b;
  }

  /**
   * **Alle Aufträge der Partie**, je Gelände eine Zeile: das Gelände als
   * Sechseck, dann jede Zahl als Marke — gold mit ✓ erfüllt, rot
   * durchgestrichen verpasst, im Rahmen des Geländes offen (mit Stand),
   * gestrichelt in der Hand, grau noch im Auftragsstapel. Gewünscht: _„welche
   * Missionen (Icon und Zahl) ich bereits erledigt habe und welche noch
   * fehlen"_.
   */
  private drawOverview(): HTMLElement {
    const box = document.createElement('div');
    box.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'gap:4px',
      'padding:8px 10px',
      'background:var(--hud-bg)',
      'border:1px solid var(--hud-line)',
      'border-radius:12px',
      'box-shadow:var(--hud-shadow)',
      'backdrop-filter:var(--hud-blur)',
      'color:var(--hud-ink)',
      'font:600 13px var(--hud-font)',
    ].join(';');
    const all = this.board.questOverview();
    for (const terrain of QUEST_TERRAINS) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap';
      const icon = document.createElement('canvas');
      icon.width = icon.height = 48;
      icon.title = TERRAIN_LABEL[terrain];
      icon.style.cssText = 'width:22px;height:22px;flex:none;margin-right:2px';
      drawHexIcon(icon, {
        base: 'land',
        edges: [terrain, terrain, terrain, terrain, terrain, terrain],
        seed: 1,
      });
      row.append(icon);
      for (const quest of all.filter((q) => q.terrain === terrain)) {
        row.append(questChip(quest));
      }
      box.append(row);
    }
    const legend = document.createElement('div');
    legend.style.cssText = 'font:500 11px var(--hud-font);color:var(--hud-dim);margin-top:2px';
    legend.textContent = 'gold erfüllt · rot verpasst · Rahmen offen · grau kommt noch';
    box.append(legend);
    return box;
  }

  private showHover(point: THREE.Vector3 | null): void {
    const hover = this.hover;
    if (!hover) return;
    const local = point ? this.board3d.worldToLocal(_local.copy(point)) : null;
    const hex = local ? hexAt(local.x, local.z, HEX_WIDTH) : null;
    const open = !!hex && this.board.isOpen(hex.q, hex.r) && !this.board.over;
    hover.visible = open;
    // Auf die Kachel in der Hand gezielt: Pfeile; auf ein anderes freies Feld: der Geist.
    const onHand = !!hex && !!this.at && hex.q === this.at.q && hex.r === this.at.r;
    this.spin.visible = onHand && !this.board2d && this.hand.visible;
    this.showAim(open && !onHand && !this.board2d ? hex : null);
    if (!open) return;
    const c = hexCentre(hex.q, hex.r, HEX_WIDTH);
    hover.position.x = c.x;
    hover.position.z = c.z;
  }

  /**
   * **Den Geist auf dieses Feld** — so gedreht, wie die Kachel dort landen
   * würde (mit _Vordrehen_ die beste Lage dort, sonst die gemerkte). Ein
   * Trigger legt sie dann wie bisher dorthin, ganz sichtbar, aber noch nicht
   * fest: Gelegt wird erst mit ✓.
   */
  private showAim(hex: Hex | null): void {
    const spec = this.board.current;
    if (!hex || !spec) {
      this.aim.visible = false;
      return;
    }
    const rot = this.help.smartRotate ? this.bestRotation(spec, hex) : this.rot;
    const c = hexCentre(hex.q, hex.r, HEX_WIDTH);
    this.aim.position.set(c.x, 0.3, c.z);
    this.aim.rotation.y = -rot * (Math.PI / 3);
    this.aim.visible = true;
    if (this.aimGhostFor === spec) return;
    this.aimGhostFor = spec;
    void buildTileGroup(this.models, spec).then((group) => {
      if (this.aimGhostFor !== spec) return;
      group.userData.sharedAssets = true;
      group.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = false;
        mesh.material = this.aimMaterial(mesh.material as THREE.Material);
      });
      this.aim.clear();
      this.aim.add(group);
    });
  }

  /** Ein Stoff, halb durchsichtig — je Stoff einmal, geteilt von allen Geistern. */
  private aimMaterial(source: THREE.Material): THREE.Material {
    let ghost = this.aimMaterials.get(source);
    if (!ghost) {
      ghost = source.clone();
      ghost.transparent = true;
      ghost.opacity = 0.55;
      ghost.depthWrite = false;
      this.aimMaterials.set(source, ghost);
    }
    return ghost;
  }

  /**
   * **Zwei Pfeile im Uhrzeigersinn** um die Kachel in der Hand — sie zeigen,
   * wohin der Trigger dreht, und laufen langsam selbst so herum. Gewünscht:
   * _„Zielen auf das aktuelle Tile zeigt rotierende Pfeile langsam mit der
   * Drehrichtung über dem Tile, dass erkennbar ist, dass durch Trigger es
   * gedreht wird."_
   */
  private buildSpin(): void {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.hexMaterials.push(material);
    for (const start of [0, Math.PI]) {
      for (const part of curvedArrow(
        HEX_WIDTH * 0.68,
        0.24,
        start,
        (Math.PI * 2) / 3,
        true,
        material,
      )) {
        part.rotation.x = -Math.PI / 2;
        part.renderOrder = 4;
        this.spin.add(part);
      }
    }
    this.spin.position.y = 0.75;
    this.spin.visible = false;
    this.hand.add(this.spin);
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.lastCtx = ctx;
    this.clock += dt;
    this.view?.animate(dt);
    this.view?.flush();
    this.fitView(ctx);
    if (this.table) this.updateTable(dt, ctx, this.table);
    this.blowWind(dt, ctx);
    // Die Vorschau schwebt eine Handbreit über dem Feld und wiegt sich ein wenig.
    if (this.previewTile)
      this.previewTile.position.y = this.table?.held ? 0 : 0.55 + Math.sin(this.clock * 2.2) * 0.08;
    // Die Griffpunkte sitzen auf der Höhe der Kachel, die Umrisse auf ihr auch.
    this.knobs.position.y = this.previewTile?.position.y ?? 0;
    if (this.handRims) this.handRims.position.y = this.knobs.position.y + RIM_HEIGHT;
    // Die Drehpfeile laufen langsam im Uhrzeigersinn (von oben: negatives Gieren).
    if (this.spin.visible) this.spin.rotation.y -= dt * 0.6;
    if (this.ring) {
      const pulse = 0.5 + 0.5 * Math.sin(this.clock * 4);
      this.ring.scale.setScalar(1 + pulse * 0.06);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + pulse * 0.45;
    }
    this.stepPendingFlight(dt);
    this.stepFlight(dt, ctx);
    this.stepFeedback(dt, ctx);
    this.orbitEnd(dt, ctx);
    this.stepGenerate(dt);
    this.sizeBadges(ctx);
    // Dreht sich das Bild, liegen die Ziffern neu (`drawDigits`).
    if (this.help.numbers && Math.abs(this.headingNow(ctx) - this.digitHeading) > 0.05)
      this.drawSlots();
    // Dreht sich das Bild, dreht das Bildchen in der Leiste mit.
    if (this.board2d && Math.abs(this.headingNow(ctx) - this.iconHeading) > 0.01)
      this.drawBarIcon();
  }

  /**
   * **Der Wind** (`hexAnimate.WindGusts`) — läuft über das Brett; wie weit die
   * Kamera weg ist, macht nur seine Spur breiter, damit man sie sieht.
   */
  private blowWind(dt: number, ctx: WorldContext): void {
    const camera = ctx.viewCamera ?? ctx.camera;
    camera.getWorldPosition(_eye);
    camera.getWorldDirection(_look);
    // Wo der Blick das Brett trifft, und wie weit es bis dahin ist.
    const far = _look.y < -0.05 ? Math.min(-_eye.y / _look.y, 400) : 10;
    _aim.copy(_eye).addScaledVector(_look, far);
    this.board3d.worldToLocal(_aim);
    const scale = this.board3d.scale.x;
    // Wie weit das Bild von dort reicht — die längere Seite, halb.
    const half = far * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const reach = half * Math.max(1, camera.aspect);
    const view = { x: _aim.x, z: _aim.z, r: reach / scale };
    for (const wind of this.winds)
      wind.update(dt, this.animations, this.board.tiles, Math.max(1, far / scale / 25), view);
  }

  // --- am Tisch ---------------------------------------------------------------------

  /** Das Tablett mit den Stapeln (`hexTable.ts`) — einmal gebaut, am Tisch zu sehen. */
  private tray: HexTray | null = null;

  /**
   * **An den Tisch**: Der Weltbau geht aus (man steht in Originalgröße), das
   * Brett wird eine Miniatur vor dem Spieler und das Tablett schwebt daneben.
   * Die Kachel in der Hand liegt verdeckt im Stapel, bis man sie nimmt.
   */
  private enterTable(): void {
    const ctx = this.lastCtx;
    if (!ctx) return;
    setBuildFlight(false);
    if (!this.tray) {
      const tray = new HexTray();
      this.tray = tray;
      this.root.add(tray.root);
      ctx.pointer.add({ object: tray.place, onSelect: () => this.placeHere() });
      ctx.pointer.add({ object: tray.finish, onSelect: () => this.placeHere() });
      ctx.pointer.add({ object: tray.turnLeft, onSelect: () => this.rotate(-1) });
      ctx.pointer.add({ object: tray.turnRight, onSelect: () => this.rotate(1) });
    }
    this.tray.root.visible = false;
    this.table = { placed: false, drawn: false, held: null, trayHeld: null, pull: null };
    this.at = null;
    this.aim.visible = false;
    this.spin.visible = false;
    this.knobs.visible = true;
    this.clipPreview(true);
    this.say(
      'Am Tisch · Griff nimmt vom leuchtenden Stapel und legt ab · Trigger zieht das Brett heran',
    );
    this.refresh(false);
  }

  /** Die Platte reicht zweieinhalb Kacheln über das äußerste Feld hinaus. */
  private fitTableTop(): void {
    if (!this.tableTop) return;
    let reach = 0;
    for (const tile of this.board.tiles.values()) {
      const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
      reach = Math.max(reach, Math.hypot(c.x - this.tableMid.x, c.z - this.tableMid.z));
    }
    const radius = reach + HEX_WIDTH * 2.5;
    this.tableTop.scale.set(radius, 1, radius);
    this.tableTop.position.x = this.tableMid.x;
    this.tableTop.position.z = this.tableMid.z;
    this.tableTop.visible = true;
  }

  private leaveTable(): void {
    this.table = null;
    if (this.tableTop) this.tableTop.visible = false;
    if (this.tray) this.tray.root.visible = false;
    this.board3d.position.set(0, 0, 0);
    this.board3d.quaternion.identity();
    this.board3d.scale.setScalar(1);
    this.hand.quaternion.identity();
    this.knobs.visible = false;
    this.clipPreview(false);
    if (this.ring) this.ring.visible = true;
    if (this.target) this.target.visible = true;
    this.refresh(false);
  }

  /**
   * **Brett und Tablett vor den Spieler** — das Brett 75 cm vor ihm auf
   * Tischhöhe, die Mitte der gelegten Kacheln vorn; das Tablett links davor.
   */
  private placeTable(ctx: WorldContext): void {
    const tray = this.tray!;
    ctx.camera.getWorldPosition(_eye);
    ctx.camera.getWorldDirection(_look);
    _look.y = 0;
    if (_look.lengthSq() < 1e-6) _look.set(0, 0, -1);
    _look.normalize();
    const yaw = Math.atan2(-_look.x, -_look.z);
    this.board3d.rotation.set(0, yaw, 0);
    this.board3d.scale.setScalar(TABLE_SCALE);
    let x = 0;
    let z = 0;
    for (const tile of this.board.tiles.values()) {
      const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
      x += c.x;
      z += c.z;
    }
    const n = Math.max(1, this.board.tiles.size);
    const height = Math.max(0.6, _eye.y - 0.55);
    _near.copy(_eye).addScaledVector(_look, 0.75).setY(height);
    this.root.worldToLocal(_near);
    this.tableMid.set(x / n, 0, z / n);
    this.fitTableTop();
    _local.copy(this.tableMid).multiplyScalar(TABLE_SCALE).applyQuaternion(this.board3d.quaternion);
    this.board3d.position.copy(_near).sub(_local);
    // Links: die Blickrichtung um 90° gegen den Uhrzeiger.
    _near
      .copy(_eye)
      .addScaledVector(_look, 0.45)
      .add(_local.set(_look.z, 0, -_look.x).multiplyScalar(0.42))
      .setY(height + 0.04);
    tray.root.position.copy(this.root.worldToLocal(_near));
    // Leicht zum Spieler gekippt: die hintere Kante höher.
    tray.root.rotation.set(0.3, yaw, 0, 'YXZ');
    tray.root.visible = true;
  }

  /**
   * **Jedes Bild am Tisch** — Griff und Trigger beider Hände:
   *
   * - **Griff an der Kachel** (liegend oder in der anderen Hand): nehmen. Sie
   *   sitzt dann starr in der Hand, das Handgelenk dreht sie. Loslassen über
   *   einem freien Feld legt sie dort hin (noch nicht fest), gedreht auf die
   *   nächste der sechs Lagen; anderswo geht sie zurück auf den Stapel.
   * - **Griff am leuchtenden Stapel**: die nächste Kachel ziehen. Liegt die
   *   vorige noch, wird sie damit gelegt — gewünscht: _„Nehme ich ein neues
   *   Tile, wird das alte Tile gelegt."_
   * - **Griff an der Stange des Tabletts**: das Tablett tragen.
   * - **Trigger ins Leere**: das Brett greifen; zum Körper ziehen vergrößert
   *   es — gewünscht: _„mit dem anderen Trigger … die ganze Karte an mich
   *   ranziehen und damit das Ganze reinzoomen."_
   */
  private updateTable(dt: number, ctx: WorldContext, t: TableState): void {
    if (!t.placed) {
      if (ctx.rig.flying) return;
      this.placeTable(ctx);
      t.placed = true;
    }
    const tray = this.tray!;
    tray.update(dt);
    ctx.camera.getWorldPosition(_eye);
    for (const hand of HANDS) {
      const c = ctx.input.get(hand);
      if (!c?.tracked) continue;
      const anchor = gripAnchor(c);
      anchor.updateWorldMatrix(true, false);
      _grab.setFromMatrixPosition(anchor.matrixWorld);
      if (t.held?.hand === hand && !c.squeeze.pressed) this.dropTile(t);
      if (t.trayHeld?.hand === hand && !c.squeeze.pressed) t.trayHeld = null;
      if (t.pull?.hand === hand && !c.trigger.pressed) t.pull = null;
      const busy = t.held?.hand === hand || t.trayHeld?.hand === hand;
      if (c.squeeze.justPressed && !busy && this.handFree(hand) && this.takeWith(t, hand, anchor)) {
        c.pulse(0.35, 20);
      }
      if (c.trigger.justPressed && !t.pull && !ctx.pointer.hoveringWith(hand)) {
        t.pull = {
          hand,
          anchor: this.board3d.worldToLocal(_grab.clone()),
          scale: this.board3d.scale.x,
          dist: Math.max(0.05, _grab.distanceTo(_eye)),
        };
      }
      if (t.pull?.hand === hand) this.pullBoard(t.pull, _grab);
    }
    if (t.held) this.carry(this.hand, t.held, this.board3d);
    if (t.trayHeld) this.carry(tray.root, t.trayHeld, this.root);

    // In der Hand: nur die Kachel und ihre Griffpunkte, darunter das Feld, auf dem sie landen würde.
    const held = t.held !== null;
    if (held) {
      this.hand.visible = true;
      for (const bar of this.previewEdges) bar.visible = false;
      const hex = hexAt(this.hand.position.x, this.hand.position.z, HEX_WIDTH);
      const open = this.board.isOpen(hex.q, hex.r) && Math.abs(this.hand.position.y) < DROP_HEIGHT;
      if (this.hover) {
        this.hover.visible = open;
        const c = hexCentre(hex.q, hex.r, HEX_WIDTH);
        this.hover.position.x = c.x;
        this.hover.position.z = c.z;
      }
    }
    if (this.ring) this.ring.visible = !held;
    if (this.target) this.target.visible = !held;
    // Die Schnittebene folgt der Kachel: senkrecht zu ihr, knapp unter ihrer Oberfläche.
    if (this.previewTile) {
      this.previewTile.updateWorldMatrix(true, false);
      _local.set(0, 1, 0).transformDirection(this.previewTile.matrixWorld);
      _near.set(0, -HAND_CLIP, 0).applyMatrix4(this.previewTile.matrixWorld);
      this.handClip.setFromNormalAndCoplanarPoint(_local, _near);
    }

    const spec = this.board.current;
    const waiting = spec && !t.drawn ? 1 : 0;
    const quest = !!spec?.quest;
    const last = t.drawn && !held && this.at !== null && !quest && this.board.stack.length === 0;
    tray.show(
      this.board.mode === 'endless' ? Infinity : this.board.stack.length + (quest ? 0 : waiting),
      this.board.tasksLeft + (quest ? waiting : 0),
      waiting ? (quest ? 'quest' : 'normal') : null,
      last,
    );
    tray.info.setText(this.statusTitle(), this.statusLine());
  }

  /** Mit dieser Hand greifen — die Kachel, die Stange des Tabletts oder einen Stapel. */
  private takeWith(t: TableState, hand: Handedness, anchor: THREE.Object3D): boolean {
    const tray = this.tray!;
    const scale = this.board3d.scale.x;
    if (t.drawn && (t.held || this.at) && this.hand.visible) {
      this.hand.getWorldPosition(_near);
      if (_grab.distanceTo(_near) < HEX_WIDTH * 0.6 * scale + 0.06) {
        this.holdTile(t, hand, anchor);
        return true;
      }
    }
    tray.handle.getWorldPosition(_near);
    if (_grab.distanceTo(_near) < 0.1) {
      tray.root.updateWorldMatrix(true, false);
      t.trayHeld = { hand, anchor, offset: offsetOf(anchor, tray.root) };
      return true;
    }
    for (const kind of ['normal', 'quest'] as const) {
      if (_grab.distanceTo(tray.stackTop(kind, _near)) < 0.08)
        return this.drawFrom(t, kind, hand, anchor);
    }
    return false;
  }

  /** Die Kachel in diese Hand — vom Feld, oder aus der anderen Hand herüber. */
  private holdTile(t: TableState, hand: Handedness, anchor: THREE.Object3D): void {
    if (!t.held) {
      // Die Drehung des Feldes geht in die Hand über; die Kachel selbst liegt gerade darin.
      this.hand.quaternion.setFromAxisAngle(_up, -this.rot * (Math.PI / 3));
      if (this.previewTile) this.previewTile.rotation.y = 0;
      this.at = null;
    }
    this.hand.updateWorldMatrix(true, true);
    t.held = { hand, anchor, offset: offsetOf(anchor, this.hand) };
  }

  /** Vom Stapel ziehen — nur vom leuchtenden; eine liegende Kachel wird dabei gelegt. */
  private drawFrom(
    t: TableState,
    kind: StackKind,
    hand: Handedness,
    anchor: THREE.Object3D,
  ): boolean {
    const spec = this.board.current;
    if (!spec || this.board.over) return false;
    if (t.drawn && t.held) return false;
    if (t.drawn && this.at) {
      if (!this.fitsHere()) {
        this.say('Die liegende Kachel passt so nicht · erst drehen oder umlegen');
        return false;
      }
      if (!this.placeHere()) return false;
      return this.drawFrom(t, kind, hand, anchor);
    }
    const want: StackKind = spec.quest ? 'quest' : 'normal';
    if (kind !== want) {
      this.say(
        want === 'quest'
          ? 'Jetzt kommt ein Auftrag · vom leuchtenden Stapel'
          : 'Vom leuchtenden Stapel ziehen',
      );
      return false;
    }
    t.drawn = true;
    this.hand.position.copy(this.board3d.worldToLocal(_near.copy(_grab)));
    this.hand.quaternion.setFromAxisAngle(_up, -this.rot * (Math.PI / 3));
    if (this.previewTile) {
      this.previewTile.rotation.y = 0;
      this.previewTile.position.y = 0;
    }
    this.hand.visible = true;
    this.hand.updateWorldMatrix(true, true);
    t.held = { hand, anchor, offset: offsetOf(anchor, this.hand) };
    this.refresh(false);
    return true;
  }

  /** Losgelassen: über einem freien Feld liegt sie dort (noch nicht fest), sonst zurück auf den Stapel. */
  private dropTile(t: TableState): void {
    t.held = null;
    const local = this.hand.position;
    const hex = hexAt(local.x, local.z, HEX_WIDTH);
    _euler.setFromQuaternion(this.hand.quaternion, 'YXZ');
    this.hand.quaternion.identity();
    if (this.hover) this.hover.visible = false;
    if (this.board.isOpen(hex.q, hex.r) && Math.abs(local.y) < DROP_HEIGHT) {
      this.at = hex;
      this.rot = ((Math.round(-_euler.y / (Math.PI / 3)) % 6) + 6) % 6;
    } else {
      this.at = null;
      this.say('Zurück auf den Stapel · an ein freies Feld am Rand halten und loslassen');
    }
    this.refresh(false);
  }

  /** Die Kachel in der Hand mit oder ohne Schnitt — eigene Stoffe, das Brett teilt die anderen. */
  private clipPreview(on: boolean): void {
    this.previewTile?.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const plain =
        (mesh.userData.unclipped as THREE.Material | undefined) ??
        (mesh.material as THREE.Material);
      mesh.userData.unclipped = plain;
      let clipped = this.clipMaterials.get(plain);
      if (on && !clipped) {
        clipped = plain.clone();
        clipped.clippingPlanes = [this.handClip];
        this.clipMaterials.set(plain, clipped);
      }
      mesh.material = on ? clipped! : plain;
    });
  }

  /** Ein gehaltenes Ding folgt der Hand — in den Maßen seines Elternteils. */
  private carry(object: THREE.Object3D, grip: Grip, parent: THREE.Object3D): void {
    grip.anchor.updateWorldMatrix(true, false);
    parent.updateWorldMatrix(true, false);
    _matrix.multiplyMatrices(grip.anchor.matrixWorld, grip.offset);
    _matrix.premultiply(_inverse.copy(parent.matrixWorld).invert());
    _matrix.decompose(object.position, object.quaternion, _scale);
  }

  /** Das Brett hängt an der Hand; je näher die Hand dem Kopf, desto größer. */
  private pullBoard(pull: NonNullable<TableState['pull']>, at: THREE.Vector3): void {
    const dist = Math.max(0.05, at.distanceTo(_eye));
    const scale = THREE.MathUtils.clamp((pull.scale * pull.dist) / dist, TABLE_MIN, TABLE_MAX);
    this.board3d.scale.setScalar(scale);
    _local.copy(pull.anchor).multiplyScalar(scale).applyQuaternion(this.board3d.quaternion);
    this.board3d.position.copy(this.root.worldToLocal(_near.copy(at))).sub(_local);
  }

  /** Eine Hand, die am Tisch etwas hält, schließt sich darum. */
  protected override carriesInHand(hand: Handedness): boolean {
    return (
      super.carriesInHand(hand) ||
      this.table?.held?.hand === hand ||
      this.table?.trayHeld?.hand === hand
    );
  }

  // --- die Ansichten ---------------------------------------------------------------

  /** Ob gerade am Schirm von oben gelegt wird — ohne Figur, mit Knöpfen. */
  private board2d = false;
  /** Ob in dieser Brillen-Sitzung der Weltbau schon angeschaltet wurde. */
  private flewIn = false;
  /** Die Knopfleiste am Schirm (`buildTileBar`). */
  private tileBar: HTMLElement | null = null;
  /** Die offenen Aufträge oben rechts (`drawQuestList`). */
  private questList: HTMLElement | null = null;
  private tileBarText: HTMLElement | null = null;
  private tileBarIcon: HTMLCanvasElement | null = null;
  private tileQuick: HTMLElement | null = null;
  private legenButton: HTMLButtonElement | null = null;
  /** ⟲ ✓ ⟳ — während des Spiels; am Ende `endRow` (`showEnd`). */
  private playRow: HTMLElement | null = null;
  private endRow: HTMLElement | null = null;
  /** +1 · ▶ · +10 — nur im Welt-Modus (`generate`). */
  private worldRow: HTMLElement | null = null;
  private runButton: HTMLButtonElement | null = null;
  /** Ob die Welt gerade von selbst weiterwächst, und wie lange bis zur nächsten Kachel. */
  private generating = false;
  private generateClock = 0;
  /** Die Punkte im Detail, über der Leiste, am Spielende auf Wunsch. */
  private detailBox: HTMLElement | null = null;
  /** Die Neigung, die vor dem Rundflug am Spielende galt — für die nächste Runde. */
  private tiltBefore: number | null = null;
  /** Was zuletzt im Baukasten gebaut wurde — vorn in der Schnellliste. */
  private lastBuilt: TileSpec | null = null;
  /** Die Kanten im Baukasten, von Kante 0 (rechts) im Uhrzeigersinn. */
  private built: Terrain[] = ['forest', 'forest', 'field', 'field', 'house', 'house'];

  /**
   * **Jede Ansicht bekommt ihre Bedienung** — einmal je Bild nachgesehen.
   *
   * - **In der Brille** von oben: Beim Aufsetzen geht der Weltbau an
   *   (`core/buildFlight.ts`), und zwar der, der skaliert
   *   (`PlayerRig.flightScales`): rechter Stick vor macht die Welt kleiner,
   *   zurück größer, linker Stick fliegt. Gewünscht: _„In vr will ich die
   *   Welt lieber von oben weiter sehen bzw. wie bei der Stadt durch hoch und
   *   runter fliegen die Welt größer bzw. kleiner skalieren."_ Einmal je
   *   Sitzung — wer ihn im Menü ausschaltet, läuft danach am Boden.
   * - **Am Schirm von oben ohne Figur**: _„bei von oben brauche ich keinen
   *   Spieler Charakter sondern kann direkt tiles auf die Welt legen und
   *   drehen lassen über Buttons. Auf pc mit wasd und Mausrad"_. Die Figur
   *   ist unsichtbar und nur noch der Punkt, dem die Kamera folgt; WASD
   *   schiebt das Bild (so schnell, wie weit man weg ist), Ziehen mit Maus
   *   oder Finger auch, Rad und zwei Finger zoomen. Die Stöcke am Handy gehen
   *   weg, unten steht eine Leiste mit ⟲, ✓ und ⟳.
   */
  private fitView(ctx: WorldContext): void {
    const presenting = ctx.renderer.xr.isPresenting;
    const table = presenting && this.tableStyle;
    if (table && !this.table) this.enterTable();
    else if (!table && this.table) this.leaveTable();
    if (presenting && !table && !this.flewIn) {
      this.flewIn = true;
      setBuildFlight(true);
      this.say('Von oben · linker Stick fliegt · rechter Stick vor: Welt kleiner, zurück: größer');
    } else if (!presenting || table) {
      this.flewIn = false;
    }
    ctx.rig.flightScales = !table;

    document.body.classList.add(CLEAN_CLASS);
    const flat = ctx.topDown && !presenting;
    if (flat !== this.board2d) {
      this.board2d = flat;
      ctx.avatar.visible = !flat;
      ctx.touchStick(!flat);
      ctx.rig.pace = flat ? (sprint) => this.panSpeed(ctx) * (sprint ? 2 : 1) : null;
    }
    // Am Schirm stehen Punkte und ✓ unten in der Leiste — über der Kachel nur die Kachel.
    this.controls.visible = !flat && !table;
    if (this.info) this.info.visible = !flat && !table;
    if (this.tileBar) this.tileBar.hidden = !flat || ctx.menu.isOpen;
    if (this.questList) {
      // `style.display` und nicht `hidden`: Das `display:flex` der Liste schlüge das Attribut.
      const hide =
        !flat || ctx.menu.isOpen || this.board.over || this.questList.childElementCount === 0;
      if (this.whyBox && (hide || !this.why)) this.whyBox.style.display = 'none';
      this.questList.style.display = hide ? 'none' : 'flex';
      // Unter der Bildrate, wenn sie zu sehen ist.
      const stats = document.querySelector<HTMLElement>('.frame-stats:not([hidden])');
      const top = stats
        ? `${stats.getBoundingClientRect().bottom + 8}px`
        : 'max(10px, var(--safe-top, env(safe-area-inset-top, 0px)))';
      if (this.questList.style.top !== top) this.questList.style.top = top;
    }
    // `style.display` und nicht `hidden`: Das `display:flex` der Liste schlüge das Attribut.
    if (this.tileQuick)
      this.tileQuick.style.display = this.board.mode === 'creative' ? 'flex' : 'none';
  }

  /**
   * **Ein Bild des Kameraflugs** — in fester Zeit (`FLIGHT_SECONDS`), langsam
   * an, schnell in der Mitte, sanft ab (kubisch ein und aus). Die Kamera hängt
   * an der unsichtbaren Figur; die wird geführt.
   */
  private stepFlight(dt: number, ctx: WorldContext): void {
    const flight = this.flight;
    if (!flight) return;
    if (!this.board2d) {
      this.flight = null;
      return;
    }
    flight.t = Math.min(1, flight.t + dt / FLIGHT_SECONDS);
    const t = flight.t;
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    this.movePlayerTo(ctx, flight.from.clone().lerp(flight.to, ease));
    if (t >= 1) this.flight = null;
  }

  /** **Wie schnell WASD das Bild schiebt**: ein Drittel des Kameraabstands je Sekunde. */
  private panSpeed(ctx: WorldContext): number {
    const zoom = ctx.topDownView?.get().zoom ?? 20;
    return Math.max(4, zoom * 0.6);
  }

  /** **Das Bild schieben** — die unsichtbare Figur dorthin, wo die Kamera hinsoll. */
  private panBy(ctx: WorldContext, dx: number, dz: number): void {
    // Wer selbst schiebt, hält den Flug an.
    this.flight = null;
    const at = ctx.rig.position;
    const x = THREE.MathUtils.clamp(at.x + dx, FIELD.x + 2, FIELD.x + FIELD.w - 2);
    const z = THREE.MathUtils.clamp(at.z + dz, FIELD.z + 2, FIELD.z + FIELD.d - 2);
    this.movePlayerTo(ctx, new THREE.Vector3(x, ctx.rig.getFloorY(), z));
  }

  /**
   * **Die Leiste am Schirm** — unten über die ganze Breite. Gewünscht: _„das
   * links rechts drehen sollte ganz links und ganz rechts sein. Die Buttons
   * dürfen gerne etwas breiter sein, dann mittig davon das Legen-Button.
   * Darüber kann gerne die Zeile sein, mit der Info über Stapelgröße und
   * Punkte, Aufträge."_
   *
   * Von oben nach unten: im Kreativ-Modus die **Schnellliste** (`quickTiles`),
   * dann die Zeile mit dem Bildchen der Kachel in der Hand, Punkten, Stapel,
   * Aufträgen und dem Auftrag der Kachel, zuunterst ⟲ · ✓ Legen · ⟳.
   */
  private buildTileBar(): void {
    const bar = document.createElement('div');
    bar.className = 'hexland-bar';
    bar.hidden = true;
    bar.style.cssText = [
      'position:fixed',
      'left:calc(env(safe-area-inset-left, 0px) + 8px)',
      'right:calc(env(safe-area-inset-right, 0px) + 8px)',
      'bottom:calc(env(safe-area-inset-bottom, 0px) + 12px)',
      'margin:0 auto',
      'max-width:560px',
      'z-index:4',
      'display:flex',
      'flex-direction:column',
      'gap:8px',
      'padding:8px',
      'box-sizing:border-box',
      'background:var(--hud-bg)',
      'border:1px solid var(--hud-line)',
      'border-radius:var(--hud-radius)',
      'box-shadow:var(--hud-shadow)',
      'backdrop-filter:var(--hud-blur)',
      'font-family:var(--hud-font)',
      'color:var(--hud-ink)',
      'user-select:none',
      'touch-action:none',
    ].join(';');
    const button = (
      label: string,
      title: string,
      run: () => void,
      main = false,
    ): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.style.cssText = [
        'height:54px',
        'min-width:0',
        'border-radius:var(--hud-radius-pill)',
        `border:1px solid ${main ? 'rgba(95,224,122,0.6)' : 'var(--hud-line)'}`,
        `background:${main ? 'rgba(36,120,64,0.95)' : 'var(--hud-raise)'}`,
        'color:var(--hud-ink)',
        `font:600 ${main ? 19 : 26}px var(--hud-font)`,
        'cursor:pointer',
        'white-space:nowrap',
      ].join(';');
      b.addEventListener('click', (event) => {
        event.stopPropagation();
        run();
      });
      return b;
    };

    // Die Schnellliste — nur im Kreativ-Modus zu sehen (`fitView`).
    const quick = document.createElement('div');
    quick.style.cssText =
      'display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none';
    this.tileQuick = quick;

    const info = document.createElement('div');
    info.style.cssText = 'display:flex;align-items:center;gap:10px;min-width:0';
    const icon = document.createElement('canvas');
    icon.width = 96;
    icon.height = 96;
    icon.title = 'Die Kachel in der Hand';
    icon.style.cssText = 'width:44px;height:44px;flex:none';
    const text = document.createElement('div');
    text.style.cssText =
      'font:600 13px var(--hud-font);line-height:1.3;color:var(--hud-dim);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    // **💡 Vorschlag** (`suggest`) — nur die Lampe, rechts in der oberen Zeile,
    // auch am schmalen Handy. Sie legt nicht, sie schiebt die Kachel nur
    // dorthin; solange sie dort liegt, wird aus der Lampe ⓘ (`syncSuggest`).
    // Gewünscht: _„das vorschlag feld soll nur die lampe sein, und das feld
    // nicht legen, sondern nur dort hinbewegen … (die lampe ändert sich zum
    // info icon) dann die begründung lesen."_
    const tools = button('💡', 'Vorschlag (Intelligent optimiert)', () =>
      this.whyHere() ? this.showWhy() : this.suggest(),
    );
    // Gezeichnet statt Emoji: Das 💡 saß am iPhone nicht in der Mitte des
    // Kreises — gemeldet: _„bitte vorschlag button zentrieren das icon"_.
    tools.innerHTML = LAMP_ICON;
    tools.style.cssText +=
      ';height:42px;width:42px;min-width:42px;padding:0;flex:none;margin-left:auto;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:0';
    this.whyButton = tools;
    this.barTools = tools;
    text.style.flex = '1';
    info.append(icon, text, tools);
    const why = document.createElement('div');
    why.style.cssText =
      'display:none;flex-direction:column;gap:5px;padding:4px 6px;font:600 13px var(--hud-font);color:var(--hud-ink);max-height:40vh;overflow-y:auto';
    this.whyBox = why;

    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:10px';
    this.playRow = row;
    // **Am Spielende** statt ⟲ ✓ ⟳: mittig _Neue Runde_, rechts die Punkte im
    // Detail — gewünscht: _„anstatt Legen und links/rechts gibt es einen
    // Neue-Runde-Button (mittig) und Punkte-im-Detail-Button"_.
    const end = document.createElement('div');
    end.style.cssText = 'display:none;grid-template-columns:1fr 1.4fr 1fr;gap:10px';
    const spacer = document.createElement('span');
    const details = button('Punkte', 'Punkte im Detail', () => this.toggleDetails());
    details.style.fontSize = '16px';
    end.append(
      spacer,
      button('Neue Runde', 'Neue Runde starten', () => this.startGame('game'), true),
      details,
    );
    this.endRow = end;
    // **Im Welt-Modus**: eine Kachel, laufen lassen, zehn auf einmal.
    const world = document.createElement('div');
    world.style.cssText = 'display:none;grid-template-columns:1fr 1.4fr 1fr;gap:10px';
    const one = button('+1', 'Eine Kachel generieren', () => this.generate(1));
    const ten = button('+10', 'Zehn Kacheln generieren', () => this.generate(10));
    one.style.fontSize = ten.style.fontSize = '20px';
    this.runButton = button(
      '▶ Generieren',
      'Laufen lassen / anhalten',
      () => this.toggleGenerate(),
      true,
    );
    world.append(one, this.runButton, ten);
    this.worldRow = world;
    const detail = document.createElement('div');
    detail.style.cssText =
      'display:none;flex-direction:column;gap:4px;padding:4px 6px;font:600 14px var(--hud-font);color:var(--hud-ink)';
    this.detailBox = detail;
    row.append(
      button('⟲', 'Kachel links drehen (Q)', () => this.rotate(-1)),
      (this.legenButton = button(
        '✓ Legen',
        'Kachel legen (Leertaste)',
        () => this.placeHere(),
        true,
      )),
      button('⟳', 'Kachel rechts drehen (R / E)', () => this.rotate(1)),
    );
    bar.append(quick, detail, why, info, row, end, world);
    document.body.append(bar);
    this.tileBar = bar;
    this.tileBarText = text;
    this.tileBarIcon = icon;
    this.fillQuick();
    ensureCleanStyle();
  }

  /**
   * **Die Schnellliste des Kreativ-Modus** — gewünscht: _„im Creative Modus
   * wäre es aber auch schön, in der Welt eine Schnellliste zu haben (mit
   * Default-Tiles, die häufig gebraucht werden könnten, ganze Stadt und
   * co)"_. Ein Tipp nimmt die Kachel in die Hand; vorn steht, was zuletzt im
   * Baukasten gebaut wurde.
   */
  private fillQuick(): void {
    const quick = this.tileQuick;
    if (!quick) return;
    quick.replaceChildren();
    const tiles = catalogue();
    const pick = QUICK_TILES.map((id) => tiles.find((t) => t.id === id)).filter(
      (t): t is NonNullable<typeof t> => t !== undefined,
    );
    const entries = [
      ...(this.lastBuilt ? [{ id: 'built', label: 'Gebaut', spec: this.lastBuilt }] : []),
      ...pick,
    ];
    for (const tile of entries) {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = tile.label;
      b.setAttribute('aria-label', tile.label);
      b.style.cssText =
        'flex:none;display:flex;flex-direction:column;align-items:center;gap:2px;width:58px;padding:4px 2px;border-radius:var(--hud-radius-sm);border:1px solid var(--hud-line);background:var(--hud-raise);color:var(--hud-dim);font:600 10px var(--hud-font);cursor:pointer';
      const c = document.createElement('canvas');
      c.width = 72;
      c.height = 72;
      c.style.cssText = 'width:36px;height:36px';
      drawHexIcon(c, tile.spec);
      const label = document.createElement('span');
      label.textContent = tile.label;
      label.style.cssText =
        'max-width:54px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      b.append(c, label);
      b.addEventListener('click', (event) => {
        event.stopPropagation();
        this.takeTile(tile.spec, tile.label);
      });
      quick.append(b);
    }
  }

  /** **Eine Kachel in die Hand** (Kreativ-Modus) — aus Katalog, Baukasten oder Schnellliste. */
  private takeTile(spec: TileSpec, label: string): void {
    this.board.choose(spec);
    writeSave(this.board.save(), this.board.mode);
    this.refresh(false);
    this.say(`${label} in der Hand`);
  }

  // --- am Schirm von oben -------------------------------------------------------

  /**
   * **Klicks und Fingertipper von oben.** Dort zeigt kein Strahl (`Pointer.topDown`),
   * also hört die Welt selbst auf die Leinwand. Ein Tippen ist kurz und ruhig —
   * wer zieht, zoomt oder mit dem Stock läuft, legt nichts.
   */
  private listenToScreen(ctx: WorldContext): void {
    const canvas = ctx.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const downs = new Map<number, TouchPoint>();
    let multi = false;
    let panning: number | null = null;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const from = new THREE.Vector3();
    const to = new THREE.Vector3();
    const ground = (c: WorldContext, x: number, y: number, out: THREE.Vector3): boolean => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, c.viewCamera ?? c.camera);
      return raycaster.ray.intersectPlane(plane, out) !== null;
    };
    const active = (): WorldContext | null => {
      const c = this.lastCtx;
      return c && c.topDown && !c.renderer.xr.isPresenting && !c.menu.isOpen ? c : null;
    };
    const cast = (c: WorldContext, x: number, y: number): THREE.Intersection | null => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, c.viewCamera ?? c.camera);
      const targets: THREE.Object3D[] = [];
      if (this.hand.visible && this.controls.visible) targets.push(this.controls);
      if (this.hand.visible && this.previewTile) targets.push(this.previewTile);
      if (this.pickPlane) targets.push(this.pickPlane);
      return raycaster.intersectObjects(targets, true)[0] ?? null;
    };
    const on = <E extends Event>(type: string, handler: (event: E) => void): void => {
      const listener = handler as EventListener;
      canvas.addEventListener(type, listener);
      this.offDom.push(() => canvas.removeEventListener(type, listener));
    };
    on<PointerEvent>('pointerdown', (event) => {
      if (!active() || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (onTouchPad(event)) return;
      downs.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        t: performance.now(),
        lx: event.clientX,
        ly: event.clientY,
      });
      if (downs.size > 1) {
        multi = true;
        panning = null;
      }
    });
    on<PointerEvent>('pointermove', (event) => {
      const c = active();
      if (!c) return;
      // **Zwei Finger**: gemeinsam hoch und runter neigt, gegeneinander kreisen
      // dreht. Zoomen tut der Pinch der Seite (`FlatControls`), wie überall.
      if (multi && downs.size === 2 && downs.has(event.pointerId)) {
        const [a, b] = [...downs.values()] as [TouchPoint, TouchPoint];
        const before = { ax: a.lx, ay: a.ly, bx: b.lx, by: b.ly };
        const mine = downs.get(event.pointerId)!;
        mine.lx = event.clientX;
        mine.ly = event.clientY;
        this.twoFingers(c, before, { ax: a.lx, ay: a.ly, bx: b.lx, by: b.ly });
        return;
      }
      // **Ziehen schiebt das Bild** — ein Finger oder die linke Maustaste.
      const down = downs.get(event.pointerId);
      if (down && !multi) {
        const far = Math.hypot(event.clientX - down.x, event.clientY - down.y);
        if (panning === event.pointerId || far > 12) {
          panning = event.pointerId;
          if (ground(c, down.lx, down.ly, from) && ground(c, event.clientX, event.clientY, to)) {
            this.panBy(c, from.x - to.x, from.z - to.z);
          }
          down.lx = event.clientX;
          down.ly = event.clientY;
          this.showHover(null);
          return;
        }
      }
      if (event.pointerType !== 'mouse') return;
      const hit = cast(c, event.clientX, event.clientY);
      this.showHover(hit && hit.object === this.pickPlane ? hit.point : null);
    });
    const end = (event: PointerEvent): void => {
      const down = downs.get(event.pointerId);
      downs.delete(event.pointerId);
      const wasMulti = multi;
      if (downs.size === 0) multi = false;
      if (panning === event.pointerId) {
        panning = null;
        return;
      }
      const c = active();
      if (!down || !c || wasMulti || event.type === 'pointercancel') return;
      const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
      if (moved > 12 || performance.now() - down.t > 600) return;
      const hit = cast(c, event.clientX, event.clientY);
      if (!hit) return;
      if (hit.object === this.confirm) this.placeHere();
      else if (hit.object === this.turnLeft) this.rotate(-1);
      else if (hit.object === this.turnRight) this.rotate(1);
      else if (hit.object === this.pickPlane) this.pointAt(hit);
      else this.rotate();
    };
    on<PointerEvent>('pointerup', end);
    on<PointerEvent>('pointercancel', end);
    // **Tasten von oben**: R und E drehen rechts, Q links, die Leertaste legt.
    // Q dreht sonst das Bild und die Leertaste springt — beides braucht hier
    // niemand, und sie gehen nur, solange von oben ohne Figur gelegt wird.
    const key = (event: KeyboardEvent): void => {
      if (event.repeat || !this.board2d || this.lastCtx?.menu.isOpen) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName))) return;
      const act =
        event.code === 'KeyR' || event.code === 'KeyE'
          ? () => this.rotate(1)
          : event.code === 'KeyQ'
            ? () => this.rotate(-1)
            : event.code === 'Space'
              ? () => this.placeHere()
              : null;
      if (!act) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      act();
    };
    // Vor den Tasten der Seite (`FlatControls`), damit Q nicht auch das Bild dreht.
    window.addEventListener('keydown', key, { capture: true });
    this.offDom.push(() => window.removeEventListener('keydown', key, { capture: true }));
  }

  // --- Menü -----------------------------------------------------------------------

  /**
   * **Zwei Finger von oben** — Neigung und Drehung des Bildes. Gewünscht:
   * _„mit zwei Fingern gedrückt hoch und runter ändert die Neigung. Zwei
   * Finger entgegengesetzt, einer hoch der andere runter, rotiert die
   * Kamera-Ansicht."_ Beides aus derselben Bewegung: Die Mitte zwischen den
   * Fingern wandert hoch oder runter (neigen, hoch ist flacher wie in einer
   * Karten-App), die Linie zwischen ihnen dreht sich (drehen, das Bild folgt
   * den Fingern). Ein reiner Pinch ändert keins von beiden.
   */
  private twoFingers(ctx: WorldContext, before: TwoTouches, after: TwoTouches): void {
    const view = ctx.topDownView;
    if (!view) return;
    const dy = (after.ay + after.by - before.ay - before.by) / 2;
    const turn =
      Math.atan2(after.by - after.ay, after.bx - after.ax) -
      Math.atan2(before.by - before.ay, before.bx - before.ax);
    const spin = Math.atan2(Math.sin(turn), Math.cos(turn));
    if (Math.abs(spin) > 0.002) view.twist?.(spin);
    // Kippen nur mit _Erweiterter Kamerasteuerung_ (`freeTilt`); drehen immer.
    if (this.freeTilt && Math.abs(dy) > 0.5 && view.tilt)
      view.tilt(view.tilt() + dy * TILT_PER_PIXEL);
  }

  /**
   * **Der Reiter _Hexland_** — ganz vorn im Menü, und aufgeschlagen, wenn man
   * die Welt betritt (`World.menuTab`). Gewünscht: _„ein hex Welt Menü Reiter,
   * der default in dieser Welt als Tab offen ist. Da kann ich zwischen Creative
   * Modus wechseln, wo ich dann einen Hex-Katalog habe und mir das nächste
   * Tile aussuchen kann. Oder mal eine Spielrunde starten."_
   */
  menuTab(): MenuEntry {
    const b = this.board;
    const creative = b.mode === 'creative';
    const s = b.scoring();
    const close = (): void => this.context?.menu.toggle(false);
    const rows: MenuEntry[] = [];
    const world = b.mode === 'world';
    if (creative) {
      rows.push(this.catalogueMenu());
    } else if (world) {
      rows.push({
        id: 'hexland:world',
        label: `Welt · ${b.tiles.size} Kacheln`,
        sub: 'Unten: +1, ▶ laufen lassen, +10 — im Kreis um die Mitte, jede Kachel passt genau',
        icon: 'worlds',
        accent: ACCENT,
        run: close,
      });
    } else {
      rows.push({
        id: 'hexland:score',
        label: b.over ? `Partie vorbei · ${s.total} Punkte` : `${s.total} Punkte`,
        sub: `Aufträge ${s.tasks} · Flaggen ${s.flags} · längster Fluss ${s.river} · längster Weg ${s.road}`,
        icon: 'stopwatch',
        accent: ACCENT,
        run: close,
      });
      rows.push({
        id: 'hexland:stack',
        label:
          b.mode === 'endless'
            ? 'Stapel: unendlich'
            : `Stapel: ${b.stack.length} von ${b.startTiles}`,
        sub:
          `${b.openTasks()} von ${OPEN_TASKS} Aufträgen offen · ` +
          (Number.isFinite(b.tasksLeft)
            ? `noch ${b.tasksLeft} von ${b.startTasks} Auftragskacheln im Auftragsstapel`
            : 'Auftragskacheln ohne Ende'),
        icon: 'cube',
        accent: ACCENT,
        run: close,
      });
      rows.push(this.questMenu(), this.leftOverMenu(), this.setupMenu());
    }
    rows.push(
      ...this.modeRows(),
      this.helpMenu(),
      this.cameraRow(),
      this.animationRow(),
      this.arrowRow(),
      this.tableRow(),
      this.fpsRow(),
      this.skyRow(),
      this.shareMenu(),
    );
    if (!creative && !world) {
      rows.push({
        id: 'hexland:rules',
        label: 'So wird gewertet',
        sub: 'Auftrag: Gebiet genau so groß wie die Zahl → die Zahl. Geschlossenes Gebiet mit Flagge → seine Kacheln. Längster Fluss und Weg → je Kachel 1.',
        icon: 'sign',
        accent: ACCENT,
        run: close,
      });
    }
    return {
      id: 'hexland',
      label: 'Hexland',
      sub: creative || world ? MODE_LABEL[b.mode] : `${s.total} Punkte · ${MODE_LABEL[b.mode]}`,
      icon: 'cube',
      accent: ACCENT,
      children: rows,
    };
  }

  /**
   * **Alle Aufträge im Überblick** — je Gelände, was erfüllt, verpasst, offen,
   * in der Hand und noch im Auftragsstapel ist. Gewünscht: _„dass ich zwar
   * die aktuellen Missionen sehe, aber auch sehe, welche Missionen (Icon und
   * Zahl) ich bereits erledigt habe und welche noch fehlen? Ggf kann das
   * irgendwie in einem Menü oder in dem Spiel Screen angezeigt werden."_ Am
   * Schirm steht dasselbe auf Wunsch unter den offenen Aufträgen oben rechts
   * (`drawOverview`).
   */
  private questMenu(): MenuEntry {
    const b = this.board;
    const all = b.questOverview();
    const close = (): void => this.context?.menu.toggle(false);
    const word: Record<QuestEntry['place'], string> = {
      done: 'erfüllt',
      failed: 'verpasst',
      open: 'offen',
      hand: 'in der Hand',
      deck: 'kommt noch',
    };
    const rows: MenuEntry[] = QUEST_TERRAINS.map((terrain) => {
      const mine = all.filter((q) => q.terrain === terrain);
      const parts = (['done', 'failed', 'open', 'hand', 'deck'] as const)
        .map((place) => {
          const targets = mine.filter((q) => q.place === place).map((q) => q.target);
          return targets.length ? `${word[place]} ${targets.join(' · ')}` : '';
        })
        .filter(Boolean);
      const done = mine.filter((q) => q.place === 'done').length;
      return {
        id: `hexland:quests:${terrain}`,
        label: `${TERRAIN_LABEL[terrain]} · ${done} von ${mine.length} erfüllt`,
        sub: parts.join('  ·  ') || 'keine',
        icon: 'sign',
        accent: ACCENT,
        image: hexIconUrl(
          { base: 'land', edges: [terrain, terrain, terrain, terrain, terrain, terrain], seed: 1 },
          72,
        ),
        run: close,
      };
    });
    rows.push({
      id: 'hexland:quests:screen',
      label: 'Übersicht im Spiel zeigen',
      sub: 'Oben rechts unter den offenen Aufträgen: je Gelände jede Zahl — gold erfüllt, rot verpasst, umrandet offen, grau kommt noch',
      icon: 'sign',
      accent: ACCENT,
      checked: this.overview,
      run: () => {
        this.overview = !this.overview;
        writeFlag(OVERVIEW_KEY, this.overview);
        this.drawBadges();
        this.context?.refreshWorldMenu();
      },
    });
    const done = all.filter((q) => q.place === 'done').length;
    const failed = all.filter((q) => q.place === 'failed').length;
    return {
      id: 'hexland:quests',
      label: 'Aufträge im Überblick',
      sub:
        `${done} erfüllt · ${failed} verpasst · ${b.openTasks()} offen · ` +
        (Number.isFinite(b.tasksLeft) ? `${b.tasksLeft} kommen noch` : 'Stapel ohne Ende'),
      icon: 'sign',
      accent: ACCENT,
      children: rows,
    };
  }

  /**
   * **Partie einstellen** — mit wie vielen normalen Kacheln und Aufträgen die
   * nächste normale Runde beginnt, je eine Seite mit −10, −1, Standard, +1,
   * +10. Gewünscht: _„ich würde gerne im hex welt menü beim spiel noch
   * einstellen können mit wie vielen tiles und missionen ich spielen will …
   * anzahl tiles <Aktuelle Zahl> -- -10, -1, reset, +1, +10"_. Gilt ab der
   * nächsten Partie; die laufende behält ihre Zahlen (`HexBoard.startTiles`).
   */
  private setupMenu(): MenuEntry {
    const close = (): void => this.context?.menu.toggle(false);
    const stepper = (key: keyof HexSetup, name: string, fallback: number): MenuEntry => {
      const value = this.setup[key];
      const step = (id: string, label: string, to: number, sub?: string): MenuEntry => ({
        id: `hexland:setup:${key}:${id}`,
        label,
        sub,
        icon: 'cube',
        accent: ACCENT,
        run: () => {
          this.setup = { ...this.setup, [key]: clampSetup(key, to) };
          writeSetup(this.setup);
          this.context?.refreshWorldMenu();
        },
      });
      return {
        id: `hexland:setup:${key}`,
        label: `${name} · ${value}`,
        sub: `Standard ${fallback} · ${SETUP_LIMITS[key][0]} bis ${SETUP_LIMITS[key][1]}`,
        icon: key === 'tiles' ? 'cube' : 'sign',
        accent: ACCENT,
        grid: true,
        cols: 5,
        take: false,
        children: [
          step('m10', '−10', value - 10),
          step('m1', '−1', value - 1),
          step('reset', `↺ ${fallback}`, fallback, 'Standard'),
          step('p1', '+1', value + 1),
          step('p10', '+10', value + 10),
        ],
      };
    };
    const { tiles, tasks } = this.setup;
    return {
      id: 'hexland:setup',
      label: 'Partie einstellen',
      sub: `${tiles} Kacheln · ${tasks} Aufträge — gilt ab der nächsten Partie`,
      icon: 'cube',
      accent: ACCENT,
      children: [
        stepper('tiles', 'Anzahl Kacheln', NORMAL_TILES),
        stepper('tasks', 'Anzahl Aufträge', QUEST_TILES),
        {
          id: 'hexland:setup:start',
          label: 'Neue Partie mit diesen Zahlen',
          sub: `${tiles} normale Kacheln, ${tasks} Auftragskacheln`,
          icon: 'cube',
          accent: 0x5fe07a,
          run: () => {
            this.startGame('game');
            close();
          },
        },
      ],
    };
  }

  /**
   * **Welche Kacheln noch kommen** — je Gelände, getrennt nach normalen und
   * Auftragskacheln; umgeschaltet zeigt die Seite jede Kachel, die noch im
   * Stapel liegt, als Bild (gleiche zusammen, ohne Reihenfolge). Gewünscht:
   * _„wie viele tiles von welchen gebieten übrig sind (ggf Missionen und
   * normale Unterteilen?) und ein umschalt Button in dem Menü um die übrigen
   * tiles im Detail sehen zu können."_
   */
  private leftOverMenu(): MenuEntry {
    const b = this.board;
    const left = b.leftOver();
    const close = (): void => this.context?.menu.toggle(false);
    const toggle: MenuEntry = {
      id: 'hexland:left:detail',
      label: 'Jede Kachel einzeln zeigen',
      sub: this.leftDetail
        ? 'An: jede Kachel im Stapel als Bild'
        : 'Aus: nur die Zahlen je Gelände',
      icon: 'cube',
      accent: ACCENT,
      checked: this.leftDetail,
      run: () => {
        this.leftDetail = !this.leftDetail;
        this.context?.refreshWorldMenu();
      },
    };
    const icon = (t: Terrain): string =>
      hexIconUrl({ base: 'land', edges: [t, t, t, t, t, t], seed: 1 }, 72);
    let rows: MenuEntry[];
    if (!this.leftDetail) {
      rows = OVERVIEW_TERRAINS.map((terrain) => {
        const n = left.byTerrain.get(terrain)!;
        const quest = (QUEST_TERRAINS as readonly Terrain[]).includes(terrain);
        return {
          id: `hexland:left:${terrain}`,
          label: `${TERRAIN_LABEL[terrain]} · ${n.normal + n.tasks}`,
          sub: quest
            ? `${n.normal} normale Kacheln tragen es · ${n.tasks} Auftragskacheln`
            : `${n.normal} normale Kacheln tragen es`,
          icon: 'cube',
          accent: ACCENT,
          image: icon(terrain),
          run: close,
        };
      });
    } else {
      const groups = new Map<string, { spec: TileSpec; count: number }>();
      for (const spec of b.stack) {
        // Gedreht ist es dieselbe Kachel: die kleinste der sechs Lesarten als Schlüssel.
        const turns = [0, 1, 2, 3, 4, 5].map((k) =>
          [...spec.edges.slice(k), ...spec.edges.slice(0, k)].join(),
        );
        const key = `${turns.sort()[0]}|${spec.flag ?? ''}`;
        const group = groups.get(key);
        if (group) group.count++;
        else groups.set(key, { spec, count: 1 });
      }
      const sorted = [...groups.values()].sort(
        (x, y) => y.count - x.count || x.spec.edges.join().localeCompare(y.spec.edges.join()),
      );
      const tiles: MenuEntry[] = sorted.map(({ spec, count }, i) => ({
        id: `hexland:left:tile:${i}`,
        label: count > 1 ? `${count} ×` : '1 ×',
        sub:
          [...new Set(spec.edges)].map((t) => TERRAIN_LABEL[t]).join(', ') +
          (spec.flag ? ' · Flagge' : ''),
        icon: 'cube',
        accent: ACCENT,
        image: hexIconUrl(spec, 96),
        run: close,
      }));
      const tasks: MenuEntry[] = QUEST_TERRAINS.flatMap((terrain) =>
        b.tasks
          .filter((t) => t.terrain === terrain)
          .map((t) => t.target)
          .sort((x, y) => x - y)
          .map((target, i) => ({
            id: `hexland:left:task:${terrain}:${i}`,
            label: `${TERRAIN_LABEL[terrain]} ${target}`,
            sub: 'Auftragskachel',
            icon: 'sign' as const,
            accent: ACCENT,
            image: icon(terrain),
            run: close,
          })),
      );
      rows = [
        {
          id: 'hexland:left:normal',
          label: `Normale Kacheln · ${left.normal}`,
          sub: 'Was noch im Stapel liegt — gleiche zusammen, nicht in der Reihenfolge, in der sie kommen',
          icon: 'cube',
          accent: ACCENT,
          grid: true,
          take: false,
          children: tiles,
        },
        {
          id: 'hexland:left:tasks',
          label: `Auftragskacheln · ${left.tasks}`,
          sub: 'Gelände und Zahl — welche Kachel sie trägt, steht erst beim Ziehen fest',
          icon: 'sign',
          accent: ACCENT,
          grid: true,
          take: false,
          children: tasks,
        },
      ];
    }
    return {
      id: 'hexland:left',
      label: 'Übrige Kacheln',
      sub:
        b.mode === 'endless'
          ? 'Unendliches Spiel: Der Stapel füllt sich immer nach'
          : `${left.normal} normale · ${left.tasks} Auftragskacheln (ohne die in der Hand)`,
      icon: 'cube',
      accent: ACCENT,
      children: [toggle, ...rows],
    };
  }

  /**
   * **Der Spielmodus** — drei Kreise in einem Block: normale Runde, unendliches
   * Spiel, Kreativ-Modus. Gewünscht: _„Beim Spielmodus will ich auch eine
   * Select-Option haben … Und beim Wechsel wird man gefragt, weiter spielen
   * oder neu starten."_ Jede Zeile öffnet deshalb ihre kleine Seite mit genau
   * dieser Frage; jeder Modus hat sein eigenes Brett im Browser.
   */
  private modeRows(): MenuEntry[] {
    const close = (): void => this.context?.menu.toggle(false);
    return MODES.map((mode) => {
      const saved = savedSummary(mode);
      return {
        id: `hexland:mode:${mode}`,
        label: MODE_LABEL[mode],
        sub: MODE_SUB[mode],
        icon: mode === 'creative' ? 'brush' : mode === 'world' ? 'worlds' : 'cube',
        accent: 0xb58cff,
        radio: 'hexland-mode',
        checked: this.board.mode === mode,
        children: [
          {
            id: `hexland:mode:${mode}:go`,
            label: 'Weiterspielen',
            sub: saved ?? 'Noch nichts gespielt — fängt neu an',
            icon: 'worlds',
            accent: 0x5fe07a,
            run: () => {
              this.switchMode(mode);
              close();
            },
          },
          {
            id: `hexland:mode:${mode}:new`,
            label: 'Neu starten',
            sub:
              mode === 'creative' || mode === 'world'
                ? 'Brett leeren, eine Kachel in die Mitte'
                : MODE_SUB[mode],
            icon: 'reset',
            accent: 0xe0605f,
            run: () => {
              this.startGame(mode);
              close();
            },
          },
        ],
      };
    });
  }

  /**
   * **Animationen** — Mühlenflügel, fließendes Wasser, Wind in Bäumen und
   * Weizen, ab und zu eine weiße Böe (`hexAnimate.ts`). Gewünscht: _„Können
   * wir noch einen Hex-Menüpunkt einbauen: Animationen aktiviert"_.
   */
  /** **Erweiterte Kamerasteuerung** — erlaubt das Kippen (zwei Finger hoch/runter, rechts ziehen). */
  private cameraRow(): MenuEntry {
    return {
      id: 'hexland:camera',
      label: 'Erweiterte Kamerasteuerung',
      sub: this.freeTilt
        ? 'An: Kamera kippen mit zwei Fingern hoch und runter oder rechter Maustaste'
        : 'Aus: Kamera nur drehen und zoomen, die Neigung bleibt',
      icon: 'glider',
      accent: 0x6fb7e0,
      checked: this.freeTilt,
      run: () => {
        this.freeTilt = !this.freeTilt;
        writeFlag(CAMERA_KEY, this.freeTilt);
        this.context?.topDownView?.lockTilt?.(!this.freeTilt);
        this.context?.refreshWorldMenu();
      },
    };
  }

  private animationRow(): MenuEntry {
    return {
      id: 'hexland:animations',
      label: 'Animationen',
      sub: 'Mühlen drehen sich, Wasser fließt den Fluss hinab, ab und zu zieht Wind von Kachel zu Kachel',
      icon: 'glider',
      accent: 0x6fb7e0,
      checked: this.animations,
      run: () => {
        this.animations = !this.animations;
        writeFlag(ANIM_KEY, this.animations);
        this.context?.refreshWorldMenu();
      },
    };
  }

  /**
   * **Flussrichtung als Pfeile** — gewünscht: _„Füge eine Grafik-Option ein,
   * um Pfeil-Richtungen anzeigen zu können bei den Flüssen."_
   */
  private arrowRow(): MenuEntry {
    return {
      id: 'hexland:arrows',
      label: 'Flussrichtung zeigen',
      sub: 'Ein Pfeil auf jedem Arm eines Flusses: wohin das Wasser fließt',
      icon: 'xray',
      accent: 0x3a8fd6,
      checked: this.arrows,
      run: () => {
        this.arrows = !this.arrows;
        writeFlag(ARROW_KEY, this.arrows);
        this.view?.showArrows(this.arrows);
        this.context?.refreshWorldMenu();
      },
    };
  }

  /**
   * **Am Tisch spielen** — die zweite Art in der Brille. Gewünscht: _„Der
   * andere Modus ist eher, von der Idee her, dass es wie auf dem Tisch liegt
   * und ich die Tiles mit Grab in die Hand nehme und auf die freien Tiles
   * loslassen kann zum Legen."_ Aus: fliegen wie bisher.
   */
  private tableRow(): MenuEntry {
    return {
      id: 'hexland:table',
      label: 'In VR am Tisch spielen',
      sub: 'Kleines Brett vor dir · Kacheln greifen und ablegen · aus: fliegen',
      icon: 'controller',
      accent: GRAB_TINT,
      checked: this.tableStyle,
      run: () => {
        this.tableStyle = !this.tableStyle;
        writeFlag(TABLE_KEY, this.tableStyle);
        this.context?.refreshWorldMenu();
      },
    };
  }

  /**
   * **Spielstand kopieren und einfügen** (`hexShare.ts`) — als kurzer Text,
   * gepackt. Gewünscht: _„den aktuellen Map-Stand kopieren können
   * (komprimiert) und einen Import haben wollen, damit du den Spielstand
   * nutzen kannst, um zu schauen, was ich meine."_ Einfügen ersetzt das Brett
   * des Modus, aus dem der Stand kommt.
   */
  private shareMenu(): MenuEntry {
    const close = (): void => this.context?.menu.toggle(false);
    return {
      id: 'hexland:share',
      label: 'Spielstand teilen',
      sub: 'Als Text kopieren oder einen kopierten einfügen',
      icon: 'folder',
      accent: 0x6f7d99,
      children: [
        {
          id: 'hexland:share:copy',
          label: 'Spielstand kopieren',
          sub: 'Brett, Stapel und Aufträge als kurzer Text in die Zwischenablage',
          icon: 'folder',
          accent: 0x5fe07a,
          run: () => {
            close();
            void this.copySave();
          },
        },
        {
          id: 'hexland:share:paste',
          label: 'Spielstand einfügen',
          sub: 'Einen kopierten Text laden — ersetzt das Brett dieses Modus',
          icon: 'reset',
          accent: 0xe0a05f,
          run: () => {
            close();
            void this.pasteSave();
          },
        },
      ],
    };
  }

  private async copySave(): Promise<void> {
    const code = await packSave(this.board.save());
    try {
      await navigator.clipboard.writeText(code);
      this.say(`Spielstand kopiert · ${code.length} Zeichen`);
    } catch {
      // Ohne Zwischenablage (kein HTTPS, keine Erlaubnis): zum Abschreiben zeigen.
      window.prompt('Spielstand — kopieren:', code);
    }
  }

  private async pasteSave(): Promise<void> {
    let text: string | null = null;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      text = null;
    }
    if (!text || !text.trim().startsWith('HEX')) text = window.prompt('Spielstand einfügen:');
    if (!text) return;
    const json = await unpackSave(text);
    const board = new HexBoard();
    if (!json || !board.load(json)) {
      this.say('Das ist kein Hexland-Spielstand');
      return;
    }
    writeSave(this.board.save(), this.board.mode);
    this.board = board;
    writeMode(board.mode);
    writeSave(board.save(), board.mode);
    this.lastPlaced = null;
    this.redraw();
    this.say(`Spielstand geladen · ${MODE_LABEL[board.mode]} · ${board.tiles.size} Kacheln`);
  }

  /**
   * **Himmel** — derselbe Schalter wie unter _Grafik_ (`graphicsSettings.sky`).
   * Gewünscht: _„In den Grafik-Menü einstellen, ob Skybox aus/an sein soll.
   * Auch in den allgemeinen Grafik-Einstellungen spiegeln."_
   */
  private skyRow(): MenuEntry {
    return {
      id: 'hexland:sky',
      label: 'Himmel',
      sub: 'Aus: in der Brille der eigene Raum — derselbe Schalter wie unter Grafik',
      icon: 'settings',
      accent: 0x9fd0ff,
      checked: graphics().sky,
      run: () => {
        saveGraphics({ sky: !graphics().sky });
        this.context?.refreshWorldMenu();
      },
    };
  }

  /** **Bildrate im Bild** — derselbe Schalter wie unter _Grafik_ (`graphicsSettings.showFps`). */
  private fpsRow(): MenuEntry {
    const on = graphics().showFps;
    return {
      id: 'hexland:fps',
      label: 'Bildrate im Bild',
      sub: 'Das kleine Feld oben rechts — derselbe Schalter wie unter Grafik',
      icon: 'settings',
      accent: 0x6f7d99,
      checked: on,
      run: () => {
        saveGraphics({ showFps: !graphics().showFps });
        this.context?.refreshWorldMenu();
      },
    };
  }

  /**
   * **Die Spielhilfen** — gewünscht: _„intelligentes Vordrehen (dass bei Klick
   * eines Feldes das Tile schon gedreht ist, wie es passen könnte), Highlights
   * von passenden Tile-Plätzen, Select-Options (nur eines davon): neues Tile
   * liegt an einem Platz in der Nähe, neues Tile liegt an einer Mission oder
   * alternativ an passender Grenze zu anderen Tiles. Das sind halt
   * Spielhilfen."_ Gemerkt im Browser (`hexland:help`).
   */
  private helpMenu(): MenuEntry {
    const h = this.help;
    const set = (next: Partial<HexHelp>, message: string): void => {
      this.help = { ...this.help, ...next };
      writeHelp(this.help);
      this.refresh(false);
      this.context?.refreshWorldMenu();
      this.say(message);
    };
    const toggle = (
      key: 'smartRotate' | 'colours' | 'numbers',
      label: string,
      sub: string,
      icon: MenuEntry['icon'],
    ): MenuEntry => ({
      id: `hexland:help:${key}`,
      label,
      sub,
      icon,
      accent: 0x59c8ff,
      checked: h[key],
      run: () => set({ [key]: !h[key] }, `${label} ${h[key] ? 'aus' : 'an'}`),
    });
    const placeRow = (id: HexHelp['place'], sub: string): MenuEntry => ({
      id: `hexland:help:place:${id}`,
      label: PLACE_LABEL[id],
      sub,
      icon: 'cube',
      accent: 0x59c8ff,
      radio: 'hexland-place',
      checked: h.place === id,
      run: () => set({ place: id }, `Neue Kachel · ${PLACE_LABEL[id]}`),
    });
    const shown = [
      h.smartRotate ? 'vordrehen' : '',
      h.colours ? 'Farben' : '',
      h.numbers ? 'Zahlen' : '',
    ]
      .filter((part) => part !== '')
      .join(' · ');
    return {
      id: 'hexland:help',
      label: 'Spielhilfen',
      sub: `${shown ? `${shown} · ` : ''}neue Kachel: ${PLACE_LABEL[h.place]}`,
      icon: 'brain',
      accent: 0x59c8ff,
      children: [
        toggle(
          'smartRotate',
          'Kachel vordrehen',
          'Tippst du ein Feld an, liegt die Kachel schon so gedreht, wie sie dort passt',
          'reset',
        ),
        toggle(
          'colours',
          'Felder einfärben',
          'Gold: hilft einem Auftrag · grün: je kräftiger, desto mehr Kanten passen · orange: jede Lage macht einen Auftrag unmöglich · rot: geht hier nicht',
          'palette',
        ),
        toggle(
          'numbers',
          'Passende Kanten als Zahl',
          'Auf jedem freien Feld, wie viele Kanten bestenfalls passen (rot: geht hier nicht)',
          'xray',
        ),
        placeRow('near', 'Neben der zuletzt gelegten Kachel, sonst so nah wie möglich'),
        placeRow(
          'border',
          'Wo die meisten Kanten zu den Nachbarn passen, bei Gleichstand wo ein Auftrag fertig wird — schon passend gedreht',
        ),
        placeRow(
          'smart',
          'Erst wo ein Auftrag fertig wird oder seiner Zahl am nächsten kommt (nie so, dass einer unmöglich wird), sonst nach passenden Kanten — schon passend gedreht',
        ),
        placeRow(
          'optimized',
          'Wie Intelligent, mit der in Benchmark-Runden gefundenen Rechnung — zum Vergleichen',
        ),
      ],
    };
  }

  /**
   * **Der Katalog des Kreativ-Modus** — zwei Wege hinein. Gewünscht: _„Einmal
   * eine Ansicht mit den Hex-Tiles wie im anderen Katalog und dann einen
   * Tile-Bauer"_: _Kacheln_ (fertige, ein Tipp nimmt sie) und _Kachel bauen_
   * (`builderMenu`).
   */
  private catalogueMenu(): MenuEntry {
    this.catalogueEntries ??= catalogue().map((tile) => ({
      id: `hexland:tile:${tile.id}`,
      label: tile.label,
      icon: 'cube',
      accent: ACCENT,
      image: hexIconUrl(tile.spec),
      run: () => {
        this.takeTile(tile.spec, tile.label);
        this.context?.menu.toggle(false);
      },
    }));
    return {
      id: 'hexland:catalogue',
      label: 'Kachel-Katalog',
      sub: 'Fertige Kacheln — oder eine selbst bauen',
      icon: 'cube',
      accent: ACCENT,
      children: [
        {
          id: 'hexland:tiles',
          label: 'Kacheln',
          sub: `${this.catalogueEntries.length} fertige Kacheln · ein Tipp nimmt sie in die Hand`,
          icon: 'cube',
          accent: ACCENT,
          grid: true,
          take: false,
          children: this.catalogueEntries,
        },
        this.builderMenu(),
      ],
    };
  }

  /**
   * **Der Kachel-Bauer** — gewünscht: _„ein Hex-Tile in der Mitte sehen und
   * auf die einzelnen Stücke klicken können und dann eine Übersicht, was da
   * hin soll (z. B. Stadt oder Wasser). Dadurch kann ich mein eigenes Tile
   * bauen, Schritt für Schritt, und dann die Wege und Flüsse setzen. Das Spiel
   * schaut dann in seinem Katalog, welches Plättchen dafür passt."_
   *
   * Zuoberst die Kachel, wie sie gerade ist; darunter ihre sechs Stücke, jedes
   * mit seinem Bild (das Stück hervorgehoben). Ein Tipp auf ein Stück fragt,
   * was dort hin soll. _In die Hand nehmen_ sucht die passende Kachel im Regal
   * (`hexRules.matchBase`) — Fluss und Weg müssen eine Form haben, die es dort
   * gibt; sonst steht hier, woran es liegt.
   */
  private builderMenu(): MenuEntry {
    const drawn: TileSpec = { base: 'land', edges: this.built, seed: 1 };
    const match = matchBase(this.built);
    const pieces: MenuEntry[] = this.built.map((terrain, edge) => ({
      id: `hexland:build:${edge}`,
      label: `${PIECE_NAMES[edge]}: ${TERRAIN_LABEL[terrain]}`,
      icon: 'cube',
      accent: ACCENT,
      image: hexIconUrl(drawn, 96, edge),
      grid: true,
      take: false,
      children: BUILD_TERRAINS.map((t) => ({
        id: `hexland:build:${edge}:${t}`,
        label: TERRAIN_LABEL[t],
        icon: 'cube',
        accent: QUEST_ACCENT[t],
        image: hexIconUrl({ base: 'land', edges: [t, t, t, t, t, t], seed: 1 }, 72),
        run: () => {
          this.built = this.built.map((old, e) => (e === edge ? t : old));
          this.context?.refreshWorldMenu();
          this.context?.menu.back();
        },
      })),
    }));
    return {
      id: 'hexland:builder',
      label: 'Kachel bauen',
      sub: 'Stück für Stück: Wald, Dorf, Feld, Wiese, Fluss oder Weg',
      icon: 'brush',
      accent: 0xb58cff,
      grid: true,
      take: false,
      children: [
        {
          id: 'hexland:build:take',
          label: match ? 'In die Hand nehmen' : 'Gibt es so nicht',
          sub: match
            ? 'Diese Kachel legen'
            : 'Fluss und Weg brauchen eine Form aus dem Regal: mindestens zwei Arme, nicht durcheinander',
          icon: 'hand',
          accent: match ? 0x5fe07a : 0xe0605f,
          image: hexIconUrl(drawn, 128),
          run: () => {
            if (!match) {
              this.say('Diese Kachel gibt es nicht · Fluss und Weg brauchen mindestens zwei Arme');
              return;
            }
            this.lastBuilt = match;
            this.fillQuick();
            this.takeTile(match, 'Gebaute Kachel');
            this.context?.menu.toggle(false);
          },
        },
        ...pieces,
      ],
    };
  }

  private catalogueEntries: MenuEntry[] | null = null;

  /** **Zwischen Partie und Kreativ wechseln** — jedes hat sein eigenes Brett. */
  private switchMode(mode: HexMode): void {
    writeSave(this.board.save(), this.board.mode);
    writeMode(mode);
    this.board = loadBoard(mode);
    this.lastPlaced = null;
    this.redraw();
    this.say(`${MODE_LABEL[mode]} · weiter`);
  }

  /**
   * **Welt generieren**: `count` Kacheln, jede an ihrem Platz der Spirale
   * (`HexBoard.generateNext`). Die Kamera fliegt zur letzten — so sieht man,
   * wo die Welt gerade wächst.
   */
  private generate(count: number): void {
    if (this.board.mode !== 'world') return;
    let last: PlacedTile | null = null;
    for (let i = 0; i < count; i++) {
      const tile = this.board.generateNext();
      if (!tile) continue;
      void this.view?.add(tile);
      last = tile;
    }
    writeSave(this.board.save(), this.board.mode);
    this.drawBarIcon();
    if (last && !this.generating) this.flyTo(last);
  }

  private toggleGenerate(): void {
    this.generating = !this.generating;
    this.generateClock = 0;
    if (this.runButton)
      this.runButton.textContent = this.generating ? '⏸ Anhalten' : '▶ Generieren';
    this.drawBarIcon();
  }

  /** Läuft die Generierung, kommt alle `GENERATE_EVERY` Sekunden eine Kachel. */
  private stepGenerate(dt: number): void {
    if (!this.generating) return;
    if (this.board.mode !== 'world') {
      this.toggleGenerate();
      return;
    }
    this.generateClock += dt;
    if (this.generateClock < GENERATE_EVERY) return;
    this.generateClock = 0;
    this.generate(1);
  }

  /** **Ein neues Brett** in diesem Modus. */
  private startGame(mode: HexMode): void {
    writeMode(mode);
    this.board = new HexBoard();
    if (mode === 'creative') this.board.resetCreative();
    else if (mode === 'world') this.board.resetWorld();
    else this.board.reset(undefined, mode, mode === 'game' ? this.setup : {});
    writeSave(this.board.save(), mode);
    this.lastPlaced = null;
    this.redraw();
    this.say(`${MODE_LABEL[mode]} · neu gestartet`);
    // **Die Kamera fliegt zu den Startkacheln** — gewünscht: _„Bei einer neuen
    // Runde fliegt die Kamera bei den Start-Tiles."_ Vom Rundflug am Spielende
    // (oder von wo man gerade war) zurück in die Mitte, nah genug zum Legen.
    const view = this.lastCtx?.topDownView;
    if (view) {
      if (this.tiltBefore !== null) {
        view.tilt?.(this.tiltBefore);
        this.tiltBefore = null;
      }
      const state = view.get();
      if (state.zoom > START_ZOOM) view.set({ ...state, zoom: START_ZOOM });
    }
    this.flyTo({ q: 0, r: 0 });
  }

  /** Alles vom Brett neu zeichnen. */
  private redraw(): void {
    this.at = null;
    this.view?.clear();
    for (const tile of this.board.tiles.values()) void this.view?.add(tile);
    this.refresh(true);
    this.context?.refreshWorldMenu();
  }

  override dispose(ctx: WorldContext): void {
    for (const off of this.offDom) off();
    this.offDom = [];
    this.tileBar?.remove();
    this.questList?.remove();
    this.questList = null;
    this.tileBar = null;
    document.body.classList.remove(CLEAN_CLASS);
    ctx.avatar.visible = true;
    ctx.touchStick(true);
    ctx.rig.pace = null;
    ctx.rig.flightScales = false;
    ctx.topDownView?.maxZoom?.();
    ctx.topDownView?.lockTilt?.(false);
    if (this.table) this.leaveTable();
    if (this.tray)
      for (const plane of [
        this.tray.place,
        this.tray.finish,
        this.tray.turnLeft,
        this.tray.turnRight,
      ])
        ctx.pointer.remove(plane);
    this.tray?.dispose();
    if (this.pickPlane) ctx.pointer.remove(this.pickPlane);
    if (this.confirm) ctx.pointer.remove(this.confirm);
    if (this.turnLeft) ctx.pointer.remove(this.turnLeft);
    if (this.turnRight) ctx.pointer.remove(this.turnRight);
    this.turnLeft?.dispose();
    this.turnRight?.dispose();
    for (const material of this.aimMaterials.values()) material.dispose();
    for (const material of this.clipMaterials.values()) material.dispose();
    this.aimMaterials.clear();
    this.view?.dispose();
    for (const wind of this.winds) wind.dispose();
    this.models.dispose();
    this.slots?.dispose();
    this.slots?.geometry.dispose();
    for (const material of this.hexMaterials) {
      (material as THREE.MeshBasicMaterial).map?.dispose();
      material.dispose();
    }
    for (const digits of this.digits) digits.dispose();
    this.confirm?.dispose();
    this.info?.dispose();
    this.handQuest?.dispose();
    this.questRims?.geometry.dispose();
    this.questRims?.material.dispose();
    this.handRims?.geometry.dispose();
    for (const pop of this.pops) pop.badge.dispose();
    this.pops.length = 0;
    for (const flash of this.flashes) {
      flash.mesh.geometry.dispose();
      flash.mesh.material.dispose();
    }
    this.flashes.length = 0;
    this.cardBox?.remove();
    this.cardBox = null;
    this.pendingFlight = null;
    for (const badge of this.badges.values()) badge.dispose();
    this.badges.clear();
    this.lastCtx = null;
    super.dispose(ctx);
  }
}

/** Die Fläche, auf der man läuft und legt — 240 × 240 m um die Mitte. */
const FIELD = { x: -120, z: -120, w: 240, d: 240 };
/** Das Rosa hinter dem Brett, wie in _Dorfromantik_. */
const BACKDROP = 0xe9c9d6;
const ACCENT = 0x8fd16a;
const QUEST_ACCENT: Readonly<Record<string, number>> = Object.fromEntries(
  Object.entries(TERRAIN_COLOUR).map(([t, css]) => [t, parseInt(css.slice(1), 16)]),
);
/** Die Stücke einer Kachel, wie man sie von oben sieht — Kante 0 liegt rechts. */
const PIECE_NAMES = ['Rechts', 'Unten rechts', 'Unten links', 'Links', 'Oben links', 'Oben rechts'];
/** Was ein Stück im Baukasten sein kann. */
const BUILD_TERRAINS: readonly Terrain[] = ['house', 'forest', 'field', 'grass', 'water', 'road'];
/** Die Schnellliste des Kreativ-Modus (`fillQuick`), Ids aus `catalogue`. */
const QUICK_TILES = [
  'all-house',
  'all-forest',
  'all-field',
  'all-grass',
  'river-A',
  'river-B',
  'road-A',
  'road-B',
  'lake',
  'half-forest-field',
  'half-field-house',
];

/** Die Spielhilfen (`helpMenu`). */
interface HexHelp {
  smartRotate: boolean;
  /** Felder einfärben: gold, grün nach passenden Kanten, rot. */
  colours: boolean;
  /** Auf jedem Feld die Zahl der passenden Kanten. */
  numbers: boolean;
  /** Wo die neue Kachel liegt — `smart`: erst nach Aufträgen, sonst nach Kanten. */
  place: 'near' | 'border' | 'smart' | 'optimized';
}

const PLACE_LABEL: Readonly<Record<HexHelp['place'], string>> = {
  near: 'In der Nähe',
  border: 'An passender Grenze',
  smart: 'Intelligent',
  optimized: 'Intelligent (optimiert)',
};

// **Welt generieren statt unendlich** — gewünscht: _„Ich würde gerne einen
// Welt-Generierungs-Modus haben statt unendlich."_ Das unendliche Spiel gibt es
// im Code weiter (alte Stände), im Menü nicht mehr.
const MODES: readonly HexMode[] = ['game', 'world', 'creative'];
const MODE_LABEL: Readonly<Record<HexMode, string>> = {
  game: 'Normale Runde',
  endless: 'Unendliches Spiel',
  world: 'Welt generieren',
  creative: 'Kreativ-Modus',
};
const MODE_SUB: Readonly<Record<HexMode, string>> = {
  game: `Fester Stapel, immer ${OPEN_TASKS} Aufträge, Wertung wie im Brettspiel`,
  endless: 'Dieselben Regeln, aber der Stapel wird nie leer',
  world: 'Feld für Feld im Kreis um die Mitte — jede Kachel passt genau',
  creative: 'Frei bauen, jede Kachel aus dem Katalog, ohne Wertung',
};

/** **Was im Speicher eines Modus liegt** — für _Weiterspielen_; `null`: nichts. */
function savedSummary(mode: HexMode): string | null {
  const board = new HexBoard(1);
  let text: string | null = null;
  try {
    text = localStorage.getItem(SAVE_KEY[mode]);
  } catch {
    text = null;
  }
  if (!board.load(text) || board.mode !== mode) return null;
  if (mode === 'creative') return `${board.tiles.size} Kacheln gebaut`;
  if (mode === 'world') return `${board.tiles.size} Kacheln generiert`;
  const points = board.scoring().total;
  return board.over ? `Vorbei · ${points} Punkte` : `${board.placed} gelegt · ${points} Punkte`;
}

const ANIM_KEY = 'hexland:animations';
const TABLE_KEY = 'hexland:table';

/** Eine Hand hält etwas: welche, woran, und wo das Ding relativ zu ihr sitzt. */
interface Grip {
  hand: Handedness;
  anchor: THREE.Object3D;
  offset: THREE.Matrix4;
}

interface TableState {
  /** Ob Brett und Tablett schon vor den Spieler gestellt sind (erst nach der Landung). */
  placed: boolean;
  /** Ob die Kachel in der Hand schon vom Stapel genommen ist. */
  drawn: boolean;
  held: Grip | null;
  trayHeld: Grip | null;
  /** Das Brett heranziehen: Trigger, die Stelle unter der Hand, Maß und Abstand zum Kopf beim Drücken. */
  pull: { hand: Handedness; anchor: THREE.Vector3; scale: number; dist: number } | null;
}

/** Die Tischplatte: das Rosa des Hintergrunds, eine Spur dunkler. */
const TABLE_COLOUR = 0xd7b3c4;
/** Wie groß das Brett am Tisch ist: eine Kachel 18 cm statt 3 m. */
const TABLE_SCALE = 0.06;
const TABLE_MIN = 0.01;
const TABLE_MAX = 0.4;
const HANDS: readonly Handedness[] = ['left', 'right'];
/** Wie tief die Kachel in der Hand unter ihre Oberfläche reicht, in ihren Einheiten. */
const HAND_CLIP = 0.12;
/** Wie hoch über dem Brett (in Kacheleinheiten) eine Kachel noch als „abgelegt" zählt. */
const DROP_HEIGHT = 4;

/** Wo `object` relativ zu `anchor` sitzt — damit es beim Tragen nicht springt. */
function offsetOf(anchor: THREE.Object3D, object: THREE.Object3D): THREE.Matrix4 {
  return new THREE.Matrix4().copy(anchor.matrixWorld).invert().multiply(object.matrixWorld);
}
const ARROW_KEY = 'hexland:arrows';
const OVERVIEW_KEY = 'hexland:overview';

/** Die Lampe des Vorschlags und das ⓘ — als Zeichnung, damit sie genau mittig sitzen. */
const LAMP_ICON =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3.5z" fill="#ffe27a" stroke="#ffe27a" stroke-width="1.6"/>' +
  '<path d="M9 17.5h6M10 20.5h4" stroke="#e8edf5" stroke-width="1.8"/></svg>';
const INFO_ICON =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#e8edf5" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.5" r="0.6" fill="#e8edf5"/></svg>';
const CAMERA_KEY = 'hexland:camera';

/** Ein Schalter im Browser — ohne Eintrag gilt `fallback`. */
function readFlag(key: string, fallback: boolean): boolean {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value !== 'off';
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? 'on' : 'off');
  } catch {
    // Ohne Speicher gilt es nur bis zum Neuladen.
  }
}

const _eye = new THREE.Vector3();
const _local = new THREE.Vector3();
const _grab = new THREE.Vector3();
const _near = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _inverse = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
/** Wie hoch die Umrisse über dem Boden liegen (`drawQuestRims`). */
const RIM_HEIGHT = 0.08;

/**
 * **Wie sich ein Auftrag mit der Kachel in der Hand ändert** — die Farbe von
 * X in „X/Y". Gewünscht: _„nur X/Y gezeigt …, wobei x dann farbig ist wenn es
 * besser wird oder wenn es überschreiten wird. Oder farbig wenn komplett
 * erfüllt wird"_.
 */
/** Ein Auftrag, den das letzte Legen entschieden hat (`placeHere`, `celebrate`). */
interface SettledQuest {
  tile: PlacedTile;
  terrain: QuestTerrain;
  target: number;
  size: number;
  done: boolean;
}

/** Das aufsteigende Schild (`celebrate`): wo es beginnt, wie weit es steigt, wie lange. */
const POP_BASE = 1.0;
const POP_RISE = 1.4;
const POP_SECONDS = 2.4;
/** So lange blinkt der Umriss eines verpassten Auftrags. */
const FLASH_SECONDS = 1.8;
/** So lange steht die Karte am Schirm, bevor sie verblasst. */
const CARD_SECONDS = 2.6;
/** Nach dem Sprung eines fertigen Auftrags noch kurz stehen, dann fliegen. */
const LANDING_PAUSE = 0.25;

const QUEST_TONE = { grow: '#7be08a', done: '#ffd84a', over: '#ff6b6b' } as const;

/** **Eine Marke in der Auftragsübersicht** — Zahl und Zustand (`drawOverview`). */
function questChip(quest: QuestEntry): HTMLElement {
  const chip = document.createElement('span');
  const colour = TERRAIN_COLOUR[quest.terrain];
  const style: Record<QuestEntry['place'], string> = {
    done: 'background:#ffd84a;color:#2a2200;border:1px solid #ffd84a',
    failed:
      'background:rgba(255,107,107,0.18);color:#ff8b8b;border:1px solid rgba(255,107,107,0.6);text-decoration:line-through',
    open: `background:transparent;color:var(--hud-ink);border:2px solid ${colour}`,
    hand: `background:transparent;color:var(--hud-ink);border:2px dashed ${colour}`,
    deck: 'background:rgba(255,255,255,0.06);color:var(--hud-dim);border:1px solid var(--hud-line)',
  };
  chip.style.cssText =
    'display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;border-radius:6px;font:700 12px var(--hud-font);' +
    style[quest.place];
  const word: Record<QuestEntry['place'], string> = {
    done: 'erfüllt',
    failed: 'verpasst',
    open: 'offen',
    hand: 'in der Hand',
    deck: 'kommt noch',
  };
  chip.textContent =
    quest.place === 'done'
      ? `✓${quest.target}`
      : quest.place === 'open' && quest.size !== undefined
        ? `${quest.size}/${quest.target}`
        : `${quest.target}`;
  chip.title = `${TERRAIN_LABEL[quest.terrain]} ${quest.target} · ${word[quest.place]}`;
  return chip;
}

function questTone(row: QuestRow): keyof typeof QUEST_TONE | null {
  if (row.next === row.size) return null;
  if (row.next === row.target) return 'done';
  return row.next > row.target ? 'over' : 'grow';
}

/** Ein offener Auftrag: wie groß sein Gebiet ist, und wie groß mit der Kachel in der Hand. */
interface QuestRow {
  tile: PlacedTile;
  terrain: QuestTerrain;
  size: number;
  next: number;
  target: number;
}

/** Der Umriss des Gebiets eines Auftrags (`HexBoard.areaOutline`). */
interface QuestOutline {
  terrain: QuestTerrain;
  lines: OutlineLine[];
}
const _aim = new THREE.Vector3();
const _badge = new THREE.Vector3();
/** Bis zu diesem Abstand der Kamera haben die Schilder ihre eigene Größe, danach wachsen sie mit. */
const BADGE_DISTANCE = 22;
/** Ab hier keine Schilder mehr über dem Brett (`sizeBadges`). */
const BADGE_HIDE = 100;
/** Wie schnell die Kamera am Spielende um das Brett kreist, im Bogenmaß je Sekunde. */
const ORBIT_SPEED = 0.12;
/** Wie nah die Kamera zu Beginn einer Runde höchstens steht, in Metern. */
const START_ZOOM = 30;
/** Im Welt-Modus beim Laufenlassen: eine Kachel je so viele Sekunden. */
const GENERATE_EVERY = 0.25;
/** Wie weit hinaus gezoomt werden darf (`TopDownCamera.setMaxZoom`). */
const HEX_MAX_ZOOM = 240;
const _look = new THREE.Vector3();

const HELP_KEY = 'hexland:help';

function readHelp(): HexHelp {
  try {
    const data = JSON.parse(localStorage.getItem(HELP_KEY) ?? 'null') as Partial<HexHelp> | null;
    const old = data as { highlight?: boolean; place?: string } | null;
    return {
      smartRotate: data?.smartRotate === true,
      colours: data?.colours === true || old?.highlight === true,
      numbers: data?.numbers === true,
      // `quest` hieß bis Oktober 2026 die Hilfe, die jetzt _Intelligent_ ist.
      place:
        old?.place === 'border'
          ? 'border'
          : old?.place === 'optimized'
            ? 'optimized'
            : old?.place === 'smart' || old?.place === 'quest'
              ? 'smart'
              : 'near',
    };
  } catch {
    return { smartRotate: false, colours: false, numbers: false, place: 'near' };
  }
}

function writeHelp(help: HexHelp): void {
  try {
    localStorage.setItem(HELP_KEY, JSON.stringify(help));
  } catch {
    // Kein Speicher: Dann gelten die Hilfen bis zum Neuladen.
  }
}

/** Das Grün der gut passenden Felder (`slotColour`). */
const _green = new THREE.Color(0x7ee08a);

/** Wie lange der Kameraflug zur neuen Kachel dauert, in Sekunden — immer gleich lang. */
const FLIGHT_SECONDS = 0.8;

/** **Eine Ziffer als Bild** — weiß mit dunklem Rand, für die Felder (`drawDigits`). */
function digitTexture(n: number): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.font = '800 96px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 14;
  g.strokeStyle = 'rgba(20, 28, 40, 0.85)';
  g.strokeText(String(n), 64, 70);
  g.fillStyle = '#ffffff';
  g.fillText(String(n), 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Wie viel Grad Neigung ein Pixel Fingerweg ist. */
const TILT_PER_PIXEL = 0.25;

interface TouchPoint {
  x: number;
  y: number;
  t: number;
  lx: number;
  ly: number;
}

interface TwoTouches {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/**
 * **Was in dieser Welt vom Schirm verschwindet**: der Werkzeugknopf (die
 * Hand), _Verbindung_, Vollbild und _VR / Von oben_ oben rechts. Gewünscht:
 * _„Der Hand Button kann weg und oben die Verbindung und VR-Button/Von oben."_
 * Erreichbar bleibt alles im Menü (Zusammen, Welten → Spiel-Sicht).
 */
const CLEAN_CLASS = 'hexland-clean';

function ensureCleanStyle(): void {
  if (document.getElementById('hexland-clean-style')) return;
  const style = document.createElement('style');
  style.id = 'hexland-clean-style';
  // Die Tastenhilfe (`.hints`) auch: Sie lag am Handy über ⟲ ✓ ⟳, und was sie
  // sagt (Klick, Q, Rad), stimmt hier ohnehin nicht — das steht in der Leiste.
  style.textContent =
    `.${CLEAN_CLASS} .hud__row, .${CLEAN_CLASS} #hud-tool, .${CLEAN_CLASS} .hints { display: none !important; }` +
    // Ohne die Knopfreihe rückt die Bildrate ganz nach oben.
    `.${CLEAN_CLASS} .frame-stats { top: max(10px, var(--safe-top, env(safe-area-inset-top, 0px))); }`;
  document.head.append(style);
}

/**
 * **Zwei Bretter**, eines je Modus — wer kreativ baut, verliert seine Partie
 * nicht, und umgekehrt. Der Stand von vor der Brettspiel-Wertung
 * (`hexland:board`, Format 1) liest sich nicht mehr und wird eine neue Partie.
 */
const SAVE_KEY: Readonly<Record<HexMode, string>> = {
  game: 'hexland:game',
  endless: 'hexland:endless',
  world: 'hexland:world',
  creative: 'hexland:creative',
};
const MODE_KEY = 'hexland:mode';

function readMode(): HexMode {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    return mode === 'creative' || mode === 'endless' || mode === 'world' ? mode : 'game';
  } catch {
    return 'game';
  }
}

function writeMode(mode: HexMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Kein Speicher: Dann eben bis zum Neuladen.
  }
}

/** Das gespeicherte Brett dieses Modus — oder ein frisches. */
function loadBoard(mode: HexMode): HexBoard {
  const board = new HexBoard();
  let text: string | null = null;
  try {
    text = localStorage.getItem(SAVE_KEY[mode]);
  } catch {
    text = null;
  }
  if (board.load(text) && board.mode === mode) return board;
  if (mode === 'creative') board.resetCreative();
  else if (mode === 'world') board.resetWorld();
  else board.reset(undefined, mode, mode === 'game' ? readSetup() : {});
  return board;
}

/** **Wie groß eine neue Partie ist** — `Partie einstellen` im Reiter. */
interface HexSetup {
  tiles: number;
  tasks: number;
}

const SETUP_KEY = 'hexland:setup';
const SETUP_LIMITS = { tiles: [5, 200], tasks: [0, 100] } as const;

function readSetup(): HexSetup {
  const out: HexSetup = { tiles: NORMAL_TILES, tasks: QUEST_TILES };
  try {
    const raw = JSON.parse(localStorage.getItem(SETUP_KEY) ?? '{}') as Partial<HexSetup>;
    if (Number.isFinite(raw.tiles)) out.tiles = clampSetup('tiles', raw.tiles!);
    if (Number.isFinite(raw.tasks)) out.tasks = clampSetup('tasks', raw.tasks!);
  } catch {
    // Ein kaputter Speicher heißt: wie im Brettspiel.
  }
  return out;
}

function writeSetup(setup: HexSetup): void {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  } catch {
    // Ohne Speicher gilt die Zahl nur bis zum Neuladen.
  }
}

function clampSetup(key: keyof HexSetup, value: number): number {
  const [min, max] = SETUP_LIMITS[key];
  return Math.max(min, Math.min(max, Math.round(value)));
}

function writeSave(text: string, mode: HexMode): void {
  try {
    localStorage.setItem(SAVE_KEY[mode], text);
  } catch {
    // Kein Speicher (privates Fenster): Dann gilt das Spiel eben nur bis zum Neuladen.
  }
}

/** Liegt der Finger auf einem der Bedienfelder am Schirm (Stock, A, Drehen)? */
function onTouchPad(event: PointerEvent): boolean {
  for (const id of [
    'touch-stick',
    'touch-aim',
    'touch-a',
    'touch-b',
    'touch-turn-left',
    'touch-turn-right',
  ]) {
    const el = document.getElementById(id);
    if (!el || el.offsetParent === null) continue;
    const rect = el.getBoundingClientRect();
    if (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    ) {
      return true;
    }
  }
  return false;
}
