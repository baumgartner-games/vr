import * as THREE from 'three';
import { FurnishedWorld } from '../grid/FurnishedWorld';
import { GridPlan } from '../grid/gridPlan';
import type { PlanSolid } from '../grid/solids';
import type { PlateTile } from '../shared/plateField';
import { createSky } from '../shared/environment';
import { TextPlane } from '../../ui/TextPlane';
import type { MenuEntry } from '../../ui/menu';
import type { PointerHit } from '../../core/Pointer';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import {
  BASE_TILES,
  HexBoard,
  TERRAIN_LABEL,
  hexAt,
  hexCentre,
  hexKey,
  type Hex,
  type PlaceResult,
} from './hexRules';
import { HEX_SCALE, HEX_WIDTH, HexBoardView, HexModels, buildTileGroup } from './hexView';
import { dressingModels } from './hexDressing';

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
  private readonly board = new HexBoard();
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
  /** Wo die Vorschau gerade liegt, und wie gedreht. */
  private at: Hex | null = null;
  private rot = 0;
  /** Die Kachel, für die `previewTile` gebaut ist — sonst neu bauen. */
  private previewFor: unknown = null;
  /** Die Schilder der offenen Aufgaben, je Kachel. */
  private readonly badges = new Map<string, TextPlane>();
  private clock = 0;
  private lastCtx: WorldContext | null = null;
  private offDom: Array<() => void> = [];
  private hexMaterials: THREE.Material[] = [];

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
   * ihrer Oberkante genau auf ihm und reichen anderthalb Meter darunter; eine
   * halbe Kachelhöhe tiefer liegt die farbige Fläche (`buildEnvironment`).
   * So schwebt das Brett wie in _Dorfromantik_, und man läuft trotzdem darauf.
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
    return 'Hexland · auf ein freies Feld zeigen legt die Kachel darüber · nochmal dreht · ✓ legt sie hin';
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
    ground.position.y = -0.35 * HEX_SCALE;
    ground.receiveShadow = true;
    ground.name = 'hexland-backdrop';
    this.root.add(ground);
  }

  protected override buildProps(): void {
    const ctx = this.context;
    if (!ctx) return;
    if (!this.board.load(readSave())) this.board.reset();
    this.buildBoard(ctx);
    // Alles vorladen, was eine Kachel tragen kann — sonst stockt die erste Vorschau.
    for (const model of dressingModels()) void this.models.load(model);
    for (const base of BASE_TILES) void this.models.load(base.model);
  }

  // --- aufbauen -------------------------------------------------------------------

  private buildBoard(ctx: WorldContext): void {
    this.view = new HexBoardView(this.models);
    this.view.root.userData.sharedAssets = true;
    this.root.add(this.view.root);
    for (const tile of this.board.tiles.values()) void this.view.add(tile);

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
    this.slots.name = 'hexland-slots';
    this.root.add(this.slots);

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
    });
    this.confirm.position.y = 2.1;
    this.hand.add(this.confirm);
    this.info = new TextPlane({
      width: 3,
      height: 0.95,
      title: '',
      accent: 0xf3d3df,
      align: 'center',
      face: true,
    });
    this.info.position.y = 3.05;
    this.hand.add(this.info);
    this.hand.name = 'hexland-ghost';
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
    const rotations = this.board.rotations(spec, hex.q, hex.r);
    if (rotations.length === 0 && this.canPlaceSomewhere()) {
      if (speak) this.say('Passt hier nicht · Fluss und Weg müssen weiterlaufen');
      return;
    }
    this.at = hex;
    this.rot = rotations[0] ?? 0;
    this.refresh(false);
  }

  /** **Weiterdrehen** — nur durch die Drehungen, die hier gehen. */
  private rotate(): void {
    const spec = this.board.current;
    if (!spec || !this.at) return;
    const rotations = this.board.rotations(spec, this.at.q, this.at.r);
    if (rotations.length === 0) {
      this.rot = (this.rot + 1) % 6;
    } else {
      // Im Uhrzeigersinn zur nächsten erlaubten — nicht nach Güte, sonst springt sie.
      const sorted = [...rotations].sort((a, b) => a - b);
      this.rot = sorted.find((r) => r > this.rot) ?? sorted[0]!;
    }
    this.refresh(false);
  }

  private placeHere(): void {
    const at = this.at;
    if (!at || this.board.over) return;
    const force = !this.canPlaceSomewhere();
    const result = this.board.place(at.q, at.r, this.rot, force);
    if (!result) {
      this.say('Passt so nicht');
      return;
    }
    const tile = this.board.at(at.q, at.r)!;
    void this.view?.add(tile);
    this.at = null;
    writeSave(this.board.save());
    this.announceResult(result);
    this.refresh(true);
  }

  private canPlaceSomewhere(): boolean {
    const spec = this.board.current;
    return spec !== null && this.board.placeableAnywhere(spec);
  }

  private announceResult(result: PlaceResult): void {
    const parts: string[] = [];
    if (result.perfect) parts.push('Perfekt!');
    parts.push(result.points > 0 ? `+${result.points}` : '±0');
    for (const t of result.questsDone) parts.push(`${TERRAIN_LABEL[t]}-Aufgabe erfüllt`);
    for (const t of result.questsFailed) parts.push(`${TERRAIN_LABEL[t]}-Aufgabe verpasst`);
    if (result.bonusTiles > 0) parts.push(`+${result.bonusTiles} Kacheln`);
    if (this.board.over) parts.push(`Stapel leer · ${this.board.score} Punkte`);
    this.say(parts.join(' · '));
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
    const me = this.context?.rig.position ?? new THREE.Vector3();
    let best: { hex: Hex; rot: number; score: number } | null = null;
    for (const slot of this.board.openSlots()) {
      const rotations = this.board.rotations(spec, slot.q, slot.r);
      if (rotations.length === 0) continue;
      const fit = this.board.fit(spec, slot.q, slot.r, rotations[0]!)!;
      const c = hexCentre(slot.q, slot.r, HEX_WIDTH);
      const far = Math.hypot(c.x - me.x, c.z - me.z) / HEX_WIDTH;
      const score = fit.matched * 2 - far;
      if (!best || score > best.score) best = { hex: slot, rot: rotations[0]!, score };
    }
    if (best) {
      this.at = best.hex;
      this.rot = best.rot;
    } else {
      // Nirgends passend: Dann eben das nächste freie Feld, und sie darf überall hin.
      const slot = this.board.openSlots()[0] ?? null;
      this.at = slot;
      this.rot = 0;
    }
  }

  private posePreview(): void {
    const spec = this.board.current;
    const at = this.at;
    if (!spec || !at) {
      this.hand.visible = false;
      return;
    }
    const c = hexCentre(at.q, at.r, HEX_WIDTH);
    this.hand.position.set(c.x, 0, c.z);
    this.hand.visible = true;
    if (this.previewTile) this.previewTile.rotation.y = -this.rot * (Math.PI / 3);
    const fit = this.board.fit(spec, at.q, at.r, this.rot);
    const matches = this.board.edgeMatches(spec, at.q, at.r, this.rot);
    matches.forEach((match, e) => {
      const bar = this.previewEdges[e]!;
      bar.visible = match !== null;
      (bar.material as THREE.MeshBasicMaterial).color.setHex(match ? 0x5fe07a : 0xe0605f);
    });
    const gain = fit
      ? `+${fit.matched * 10}${fit.matched === 6 ? ' · perfekt' : ''}`
      : 'passt nirgends';
    this.confirm?.setText(`✓ Legen ${gain}`);
    const quest = spec.quest ? ` · Aufgabe: ${TERRAIN_LABEL[spec.quest.terrain]}` : '';
    const left = this.board.endless ? '∞' : `${this.board.stack.length}`;
    this.info?.setText(`${this.board.score} Punkte`, `Stapel ${left}${quest}`);
  }

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
    open.forEach((slot, i) => {
      const c = hexCentre(slot.q, slot.r, HEX_WIDTH);
      slots.setMatrixAt(i, m.makeTranslation(c.x, 0.01, c.z));
    });
    slots.count = this.board.over ? 0 : open.length;
    slots.instanceMatrix.needsUpdate = true;
  }

  /** **Die Schilder der offenen Aufgaben** — wie viel dem Gebiet noch fehlt. */
  private drawBadges(): void {
    const seen = new Set<string>();
    for (const tile of this.board.tiles.values()) {
      const left = this.board.questLeft(tile);
      if (left === null) continue;
      const key = hexKey(tile.q, tile.r);
      seen.add(key);
      let badge = this.badges.get(key);
      if (!badge) {
        badge = new TextPlane({
          width: 1.9,
          height: 1,
          title: '',
          accent: QUEST_ACCENT[tile.spec.quest!.terrain],
          align: 'center',
          face: true,
        });
        const c = hexCentre(tile.q, tile.r, HEX_WIDTH);
        badge.position.set(c.x, 2.2, c.z);
        this.badges.set(key, badge);
        this.root.add(badge);
      }
      badge.setText(`${left}`, `${TERRAIN_LABEL[tile.spec.quest!.terrain]} fehlt noch`);
    }
    for (const [key, badge] of this.badges) {
      if (seen.has(key)) continue;
      this.root.remove(badge);
      badge.dispose();
      this.badges.delete(key);
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
    // Die Vorschau schwebt eine Handbreit über dem Feld und wiegt sich ein wenig.
    if (this.previewTile) this.previewTile.position.y = 0.55 + Math.sin(this.clock * 2.2) * 0.08;
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
    const downs = new Map<number, { x: number; y: number; t: number }>();
    let multi = false;
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
      downs.set(event.pointerId, { x: event.clientX, y: event.clientY, t: performance.now() });
      if (downs.size > 1) multi = true;
    });
    on<PointerEvent>('pointermove', (event) => {
      const c = active();
      if (!c || event.pointerType !== 'mouse') return;
      const hit = cast(c, event.clientX, event.clientY);
      this.showHover(hit && hit.object === this.pickPlane ? hit.point : null);
    });
    const end = (event: PointerEvent): void => {
      const down = downs.get(event.pointerId);
      downs.delete(event.pointerId);
      const wasMulti = multi;
      if (downs.size === 0) multi = false;
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
    const key = (event: KeyboardEvent): void => {
      if (event.code !== 'KeyR' || event.repeat || !this.lastCtx || this.lastCtx.crane) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName))) return;
      this.rotate();
    };
    window.addEventListener('keydown', key);
    this.offDom.push(() => window.removeEventListener('keydown', key));
  }

  // --- Menü -----------------------------------------------------------------------

  override menu(): MenuEntry[] {
    return [this.hexMenu(), ...super.menu()];
  }

  private hexMenu(): MenuEntry {
    const b = this.board;
    return {
      id: 'hexland',
      label: 'Hexland',
      sub: `${b.score} Punkte · ${b.placed} gelegt · Stapel ${b.endless ? '∞' : b.stack.length}`,
      icon: 'cube',
      accent: ACCENT,
      children: [
        {
          id: 'hexland:skip',
          label: 'Kachel unter den Stapel',
          sub: 'Die oberste passt dir nicht? Sie kommt nach unten',
          icon: 'reset',
          accent: ACCENT,
          run: () => {
            if (b.over) return;
            b.skip();
            this.at = null;
            writeSave(b.save());
            this.refresh(true);
            this.say('Kachel unter den Stapel gelegt');
          },
        },
        {
          id: 'hexland:endless',
          label: 'Endlos legen',
          sub: 'Der Stapel wird nie leer — einfach bauen, ohne Ende',
          icon: 'cube',
          accent: ACCENT,
          checked: b.endless,
          run: () => {
            b.setEndless(!b.endless);
            writeSave(b.save());
            this.refresh(true);
            this.context?.refreshWorldMenu();
            this.say(b.endless ? 'Endlos legen · an' : 'Endlos legen · aus');
          },
        },
        {
          id: 'hexland:new',
          label: 'Neues Spiel',
          sub: 'Brett leeren, eine Kachel in die Mitte, 40 auf den Stapel',
          icon: 'reset',
          accent: 0xe0605f,
          run: () => this.newGame(),
        },
      ],
    };
  }

  private newGame(): void {
    const endless = this.board.endless;
    this.board.reset();
    this.board.setEndless(endless);
    this.at = null;
    this.view?.clear();
    for (const tile of this.board.tiles.values()) void this.view?.add(tile);
    writeSave(this.board.save());
    this.refresh(true);
    this.context?.refreshWorldMenu();
    this.say('Neues Spiel · 40 Kacheln auf dem Stapel');
  }

  override dispose(ctx: WorldContext): void {
    for (const off of this.offDom) off();
    this.offDom = [];
    if (this.pickPlane) ctx.pointer.remove(this.pickPlane);
    if (this.confirm) ctx.pointer.remove(this.confirm);
    this.view?.dispose();
    this.slots?.dispose();
    this.slots?.geometry.dispose();
    for (const material of this.hexMaterials) material.dispose();
    this.confirm?.dispose();
    this.info?.dispose();
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
const QUEST_ACCENT: Readonly<Record<string, number>> = {
  forest: 0x3f8f4a,
  house: 0xd2553f,
  field: 0xe0b04a,
};

const SAVE_KEY = 'hexland:board';

function readSave(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

function writeSave(text: string): void {
  try {
    localStorage.setItem(SAVE_KEY, text);
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
