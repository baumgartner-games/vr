import * as THREE from 'three';
import { FurnishedWorld } from '../grid/FurnishedWorld';
import { GridPlan } from '../grid/gridPlan';
import type { PlanSolid } from '../grid/solids';
import type { PlateTile } from '../shared/plateField';
import { createSky } from '../shared/environment';
import { setBuildFlight } from '../../core/buildFlight';
import { graphics, saveGraphics } from '../../core/graphicsSettings';
import { KEEP_SOLID } from '../../core/occluderGhost';
import { TextPlane } from '../../ui/TextPlane';
import type { MenuEntry } from '../../ui/menu';
import type { PointerHit } from '../../core/Pointer';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import {
  BASE_TILES,
  HexBoard,
  NORMAL_TILES,
  OPEN_TASKS,
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
  type PlacedTile,
  type Terrain,
  type TileSpec,
} from './hexRules';
import { HEX_WIDTH, HexBoardView, HexModels, buildTileGroup } from './hexView';
import { WindGusts } from './hexAnimate';
import { packSave, unpackSave } from './hexShare';
import { dressingModels } from './hexDressing';
import { QuestBadge } from './hexBadge';
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
  private info: TextPlane | null = null;
  private handQuest: QuestBadge | null = null;
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
  /** Pfeile der Flussrichtung (`HexBoardView.showArrows`), gemerkt im Browser. */
  private arrows = readFlag(ARROW_KEY, false);
  private readonly wind = new WindGusts(HEX_WIDTH);
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
    this.view = new HexBoardView(this.models, () => this.board.tiles);
    this.view.showArrows(this.arrows);
    this.view.root.userData.sharedAssets = true;
    this.root.add(this.view.root);
    for (const tile of this.board.tiles.values()) void this.view.add(tile);
    this.root.add(this.wind.root);

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
    this.root.add(this.slots);

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
      this.root.add(digits);
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
    this.root.add(this.hover);

    const pickMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    this.hexMaterials.push(pickMaterial);
    this.pickPlane = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.w, FIELD.d), pickMaterial);
    this.pickPlane.rotation.x = -Math.PI / 2;
    this.pickPlane.position.set(FIELD.x + FIELD.w / 2, 0.02, FIELD.z + FIELD.d / 2);
    this.pickPlane.name = 'hexland-pick';
    this.root.add(this.pickPlane);

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
    this.confirm.position.y = 2.5;
    this.hand.add(this.confirm);
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
    this.root.add(this.hand);

    // **Zeigen in der Brille und aus den Augen** — der Strahl (`core/Pointer.ts`).
    ctx.pointer.add({
      object: this.pickPlane,
      onHover: (hit) => this.showHover(hit.point),
      onBlur: () => this.showHover(null),
      onSelect: (hit) => this.pointAt(hit),
    });
    ctx.pointer.add({ object: this.confirm, onSelect: () => this.placeHere() });
    // **Und von oben am Schirm** — dort ruht der Strahl, also eigene Finger.
    this.listenToScreen(ctx);
    this.buildTileBar();
    this.refresh(true);
  }

  // --- zeigen -----------------------------------------------------------------------

  /** Ein Feld wurde angezeigt — Vorschau dorthin, oder weiterdrehen, wenn sie schon dort liegt. */
  private pointAt(hit: PointerHit | { point: THREE.Vector3 }): void {
    const hex = hexAt(hit.point.x, hit.point.z, HEX_WIDTH);
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

  private placeHere(): void {
    const at = this.at;
    if (!at || this.board.over) return;
    const force = !this.canPlaceSomewhere();
    const result = this.board.place(at.q, at.r, this.rot, force);
    if (!result) {
      this.say('Passt so nicht · Fluss und Weg müssen weiterlaufen — drehen oder anderes Feld');
      return;
    }
    const tile = this.board.at(at.q, at.r)!;
    void this.view?.add(tile);
    this.lastPlaced = { q: at.q, r: at.r };
    this.at = null;
    writeSave(this.board.save(), this.board.mode);
    this.announceResult(result);
    this.refresh(true);
    // **Die Kamera fliegt zur neuen Kachel** — von oben am Schirm. Gewünscht:
    // _„nach dem Legen des neuen Tiles soll die Kamera zum neuen Tile fliegen …
    // smoothe Bewegung, langsam zu Anfang, dann schnell, dann abbremsen. Aber
    // in einer festen Zeit."_
    // `refresh` hat ein neues Feld gewählt — TypeScript weiß das nicht.
    const next = this.at as Hex | null;
    if (next) this.flyTo(next);
  }

  /** **Die Kamera fliegt zu einer Kachel** (`stepFlight`) — nur von oben am Schirm. */
  private flyTo(hex: Hex): void {
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

  private announceResult(result: PlaceResult): void {
    if (this.board.mode === 'creative') return;
    const parts: string[] = [];
    for (const t of result.questsDone) parts.push(`${TERRAIN_LABEL[t]}-Auftrag erfüllt`);
    for (const t of result.questsFailed) parts.push(`${TERRAIN_LABEL[t]}-Auftrag verpasst`);
    if (result.points > 0) parts.push(`+${result.points}`);
    if (this.board.over) {
      const s = this.board.scoring();
      parts.push(`Partie vorbei · ${s.total} Punkte`);
      this.context?.refreshWorldMenu();
    } else if (this.board.current?.quest) {
      parts.push(`Neuer ${TERRAIN_LABEL[this.board.current.quest.terrain]}-Auftrag`);
    }
    if (parts.length > 0) this.say(parts.join(' · '));
  }

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
    this.drawBadges();
    const spec = this.board.current;
    if (!spec) {
      this.hand.visible = false;
      // Ohne Kachel in der Hand (Spielende, Welt-Modus) zeigt die Leiste trotzdem, was gilt.
      this.drawBarIcon();
      return;
    }
    if (fresh || !this.at) this.autoPlace();
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
    for (const slot of slots) {
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
        this.handQuest.show(quest.terrain, `${quest.target ?? '?'}`);
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
    if (!ended && this.detailBox) this.detailBox.style.display = 'none';
    if (ended && this.tileBarText) {
      const done = this.questCount('done');
      this.tileBarText.innerHTML =
        `<b style="color:var(--hud-ink);font-size:20px">Spielende · ${this.board.scoring().total} Punkte</b>` +
        `<br>${this.board.tiles.size} Kacheln gelegt · ${done} ${done === 1 ? 'Auftrag' : 'Aufträge'} erfüllt`;
      return;
    }
    if (this.tileBarText) {
      const quest = this.questLabel(spec);
      this.tileBarText.innerHTML =
        `<b style="color:var(--hud-ink);font-size:15px">${this.statusTitle()}</b> · ${this.barCounts()}` +
        (quest
          ? `<br><b style="color:${TERRAIN_COLOUR[spec!.quest!.terrain]}">Auftrag: ${quest}</b> · genau so viele Kacheln`
          : spec?.flag
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
      this.root.remove(slots);
      slots.dispose();
      this.root.add(bigger);
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
      const far = _eye.distanceTo(_badge);
      const scale = Math.max(1, far / BADGE_DISTANCE);
      badge.scale.setScalar(scale);
      // Ganz weit draußen lägen die Schilder übereinander — dort reicht die Liste oben rechts.
      badge.visible = far < BADGE_HIDE;
      badge.position.y = 1.0 + 0.45 * scale;
    }
  }

  /** **Die Schilder der offenen Aufträge** — wie groß das Gebiet ist und werden soll. */
  private drawBadges(): void {
    const seen = new Set<string>();
    const open: Array<{ tile: PlacedTile; size: number; target: number }> = [];
    for (const tile of this.board.tiles.values()) {
      const progress = this.board.questProgress(tile);
      if (progress === null) continue;
      open.push({ tile, ...progress });
      const key = hexKey(tile.q, tile.r);
      seen.add(key);
      let badge = this.badges.get(key);
      if (!badge) {
        badge = new QuestBadge();
        const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
        badge.position.set(c.x, 1.45, c.z);
        this.badges.set(key, badge);
        this.root.add(badge);
      }
      badge.show(tile.spec.quest!.terrain, `${progress.size}/${progress.target}`);
    }
    this.drawQuestList(open);
    this.drawQuestRims(open);
    for (const [key, badge] of this.badges) {
      if (seen.has(key)) continue;
      this.root.remove(badge);
      badge.dispose();
      this.badges.delete(key);
    }
  }

  /**
   * **Was zu einem Auftrag zählt, ist am Boden umrandet** — jede Kachel seines
   * Gebiets bekommt einen Rand in der Farbe des Geländes. Gewünscht: _„Ich
   * dachte zum einen, die Elemente zu highlighten"_. Ein Bündel für alle,
   * knapp über den Böden; liegt eine Kachel in zwei Gebieten, rückt der
   * zweite Rand ein Stück nach innen.
   */
  private drawQuestRims(open: Array<{ tile: PlacedTile }>): void {
    let rims = this.questRims;
    if (!rims) {
      const r = HEX_WIDTH / Math.sqrt(3);
      const geometry = new THREE.RingGeometry(r * 0.84, r * 0.95, 6, 1, Math.PI / 6);
      geometry.rotateX(-Math.PI / 2);
      rims = new THREE.InstancedMesh(
        geometry,
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          toneMapped: false,
        }),
        128,
      );
      rims.frustumCulled = false;
      rims.renderOrder = 2;
      rims.name = 'hexland-quest-rims';
      this.root.add(rims);
      this.questRims = rims;
    }
    const used = new Map<string, number>();
    let n = 0;
    for (const { tile } of open) {
      const terrain = tile.spec.quest!.terrain;
      _rimColour.set(TERRAIN_COLOUR[terrain]);
      for (const t of this.board.areaTiles(tile.q, tile.r, terrain)) {
        if (n >= rims.instanceMatrix.count) break;
        const key = hexKey(t.q, t.r);
        const layer = used.get(key) ?? 0;
        used.set(key, layer + 1);
        const c = hexCentre(t.q, t.r, HEX_WIDTH);
        _rimMatrix.compose(
          _rimPos.set(c.x, 0.06 + layer * 0.002, c.z),
          _rimQuat,
          _rimScale.setScalar(1 - layer * 0.13),
        );
        rims.setMatrixAt(n, _rimMatrix);
        rims.setColorAt(n, _rimColour);
        n++;
      }
    }
    rims.count = n;
    rims.instanceMatrix.needsUpdate = true;
    if (rims.instanceColor) rims.instanceColor.needsUpdate = true;
  }

  private questRims: THREE.InstancedMesh | null = null;

  /**
   * **Die offenen Aufträge oben rechts** — gewünscht: _„Ich würde gerne
   * seitlich in der UI oben rechts meine aktiven Quests sehen, und wenn ich
   * drauf tippe, springt die Kamera zu der Kachel hin."_ Je Auftrag eine
   * Zeile: das Gelände als Sechseck, „Stadt 2 / 5", darunter, wie viele noch
   * fehlen. Nur am Schirm von oben, wie die Leiste unten (`fitView`).
   */
  private drawQuestList(open: Array<{ tile: PlacedTile; size: number; target: number }>): void {
    let list = this.questList;
    if (!list) {
      list = document.createElement('div');
      list.className = 'hexland-quests';
      list.style.cssText = [
        'position:fixed',
        'right:max(10px, env(safe-area-inset-right))',
        'top:max(10px, env(safe-area-inset-top))',
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
    for (const { tile, size, target } of open) {
      const terrain = tile.spec.quest!.terrain;
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
      title.textContent = `${TERRAIN_LABEL[terrain]} ${size} / ${target}`;
      const sub = document.createElement('span');
      sub.style.cssText = 'font-size:12px;opacity:.75;white-space:nowrap';
      sub.textContent = `noch ${target - size}`;
      text.append(title, sub);
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

  private showHover(point: THREE.Vector3 | null): void {
    const hover = this.hover;
    if (!hover) return;
    if (!point) {
      hover.visible = false;
      return;
    }
    const hex = hexAt(point.x, point.z, HEX_WIDTH);
    const open = this.board.isOpen(hex.q, hex.r) && !this.board.over;
    hover.visible = open;
    if (!open) return;
    const c = hexCentre(hex.q, hex.r, HEX_WIDTH);
    hover.position.x = c.x;
    hover.position.z = c.z;
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.lastCtx = ctx;
    this.clock += dt;
    this.view?.flush();
    this.fitView(ctx);
    this.blowWind(dt, ctx);
    // Die Vorschau schwebt eine Handbreit über dem Feld und wiegt sich ein wenig.
    if (this.previewTile) this.previewTile.position.y = 0.55 + Math.sin(this.clock * 2.2) * 0.08;
    if (this.ring) {
      const pulse = 0.5 + 0.5 * Math.sin(this.clock * 4);
      this.ring.scale.setScalar(1 + pulse * 0.06);
      (this.ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + pulse * 0.45;
    }
    this.stepFlight(dt, ctx);
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
    this.root.worldToLocal(_aim);
    // Wie weit das Bild von dort reicht — die längere Seite, halb.
    const half = far * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const reach = half * Math.max(1, camera.aspect);
    this.wind.update(dt, this.animations, this.board.tiles, Math.max(1, far / 25), {
      x: _aim.x,
      z: _aim.z,
      r: reach,
    });
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
    if (presenting && !this.flewIn) {
      this.flewIn = true;
      setBuildFlight(true);
      this.say('Von oben · linker Stick fliegt · rechter Stick vor: Welt kleiner, zurück: größer');
    } else if (!presenting) {
      this.flewIn = false;
    }
    ctx.rig.flightScales = true;

    document.body.classList.add(CLEAN_CLASS);
    const flat = ctx.topDown && !presenting;
    if (flat !== this.board2d) {
      this.board2d = flat;
      ctx.avatar.visible = !flat;
      ctx.touchStick(!flat);
      ctx.rig.pace = flat ? (sprint) => this.panSpeed(ctx) * (sprint ? 2 : 1) : null;
    }
    // Am Schirm stehen Punkte und ✓ unten in der Leiste — über der Kachel nur die Kachel.
    if (this.confirm) this.confirm.visible = !flat;
    if (this.info) this.info.visible = !flat;
    if (this.tileBar) this.tileBar.hidden = !flat || ctx.menu.isOpen;
    if (this.questList) {
      // `style.display` und nicht `hidden`: Das `display:flex` der Liste schlüge das Attribut.
      const hide =
        !flat || ctx.menu.isOpen || this.board.over || this.questList.childElementCount === 0;
      this.questList.style.display = hide ? 'none' : 'flex';
      // Unter der Bildrate, wenn sie zu sehen ist.
      const stats = document.querySelector<HTMLElement>('.frame-stats:not([hidden])');
      const top = stats
        ? `${stats.getBoundingClientRect().bottom + 8}px`
        : 'max(10px, env(safe-area-inset-top))';
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
    info.append(icon, text);

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
    bar.append(quick, detail, info, row, end, world);
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
      if (this.hand.visible && this.confirm) targets.push(this.confirm);
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
    if (Math.abs(dy) > 0.5 && view.tilt) view.tilt(view.tilt() + dy * TILT_PER_PIXEL);
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
            : `Stapel: ${b.stack.length} von ${NORMAL_TILES}`,
        sub:
          `${b.openTasks()} von ${OPEN_TASKS} Aufträgen offen · ` +
          (Number.isFinite(b.tasksLeft)
            ? `noch ${b.tasksLeft} von ${QUEST_TILES} Auftragskacheln im Auftragsstapel`
            : 'Auftragskacheln ohne Ende'),
        icon: 'cube',
        accent: ACCENT,
        run: close,
      });
      // **Was im Auftragsstapel noch liegt**, je Gelände mit seinen Zahlen —
      // je Gelände 4, 4, 5, 5, 6, 6 (`TASK_TARGETS`), damit man planen kann.
      if (b.tasks.length > 0) {
        const left = QUEST_TERRAINS.map((terrain) => {
          const targets = b.tasks
            .filter((t) => t.terrain === terrain)
            .map((t) => t.target)
            .sort((x, y) => x - y);
          return `${TERRAIN_LABEL[terrain]} ${targets.length > 0 ? targets.join('·') : '–'}`;
        });
        rows.push({
          id: 'hexland:deck',
          label:
            b.mode === 'endless' ? 'Auftragsstapel (bis er neu gemischt wird)' : 'Auftragsstapel',
          sub: left.join(' · '),
          icon: 'sign',
          accent: ACCENT,
          run: close,
        });
      }
    }
    rows.push(
      ...this.modeRows(),
      this.helpMenu(),
      this.animationRow(),
      this.arrowRow(),
      this.fpsRow(),
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
    else this.board.reset(undefined, mode);
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
    if (this.pickPlane) ctx.pointer.remove(this.pickPlane);
    if (this.confirm) ctx.pointer.remove(this.confirm);
    this.view?.dispose();
    this.wind.dispose();
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
    (this.questRims?.material as THREE.Material | undefined)?.dispose();
    this.questRims?.dispose();
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
  place: 'near' | 'border' | 'smart';
}

const PLACE_LABEL: Readonly<Record<HexHelp['place'], string>> = {
  near: 'In der Nähe',
  border: 'An passender Grenze',
  smart: 'Intelligent',
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
  game: `${NORMAL_TILES} Kacheln, immer ${OPEN_TASKS} Aufträge, Wertung wie im Brettspiel`,
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
const ARROW_KEY = 'hexland:arrows';

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
const _rimColour = new THREE.Color();
const _rimMatrix = new THREE.Matrix4();
const _rimPos = new THREE.Vector3();
const _rimQuat = new THREE.Quaternion();
const _rimScale = new THREE.Vector3();
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
    `.${CLEAN_CLASS} .frame-stats { top: max(10px, env(safe-area-inset-top)); }`;
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
  else board.reset(undefined, mode);
  return board;
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
