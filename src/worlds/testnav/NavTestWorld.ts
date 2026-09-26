import * as THREE from 'three';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import { TextPlane } from '../../ui/TextPlane';
import { GridWorld } from '../grid/GridWorld';
import type { GridPlan } from '../grid/gridPlan';
import type { PlanSolidKind } from '../grid/solids';
import { HAZARD_FIRE } from '../nav/navProfile';
import { NO_TILE } from '../nav/navTile';
import type { Npc } from '../npc/Npc';
import { npcSkin } from '../npc/npcKinds';
import { createSky } from '../shared/environment';
import { BUTTON_DOME_R, buildRedButton, type RedButton } from '../shared/redButton';
import {
  LAVA,
  NAV_TESTS,
  SPAWN,
  navTestPlan,
  tileCentre,
  type NavSpot,
  type NavTest,
} from './navTestPlan';

/** Die Farben der Platten: grün der Start, blau das Ziel — gewünscht so. */
export const START_COLOUR = 0x22c55e;
export const GOAL_COLOUR = 0x3b82f6;
const LAVA_COLOUR = 0xff5a1f;

/** Wie viel Leben die Lava je Sekunde nimmt — die Übungspuppe hat 160. */
const LAVA_DAMAGE = 400;

/** Wie nah er an die Mitte der Zielplatte herangeht, in Metern. */
const GOAL_REACH = 0.3;

/** So nah an der Mitte der Zielplatte gilt ein Test als bestanden, in Metern. */
const ARRIVED = 0.6;

/** Was zu einem Test in der Welt gehört: der Knopf und wer gerade läuft. */
interface Bench {
  readonly test: NavTest;
  readonly button: RedButton;
  runner: Npc | null;
  arrived: boolean;
}

/**
 * **Test Navigation** — die Welt im Ordner _Test_ (`worlds/index.WORLD_FOLDERS`).
 *
 * Drei Kammern aus Glas (`navTestPlan.ts`), vor jeder ein roter Knopf: Er
 * stellt eine Übungspuppe auf die grüne Platte und schickt sie zur blauen.
 * **Der berechnete Weg ist immer zu sehen** — die Ebene _Wege_ der
 * Navigationsansicht ist hier von Anfang an an (`setNavLayer('paths')`), und
 * die Linie folgt dem Weg, den der NPC gerade geplant hat. Die Lava tötet,
 * wer auf ihr steht (`burn`); geplant wird um sie herum, weil sie im Graphen
 * steht (`TileFacts.hazard`).
 */
export class NavTestWorld extends GridWorld {
  private readonly benches: Bench[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  private readonly skins: THREE.Material[] = [];
  private readonly panels: TextPlane[] = [];
  private readonly pointed: THREE.Object3D[] = [];

  protected override worldId(): string {
    return 'test-navigation';
  }

  protected override editorTitle(): string {
    return 'Test Navigation';
  }

  protected override layout(): GridPlan {
    return navTestPlan();
  }

  /** Hier steht nichts außerhalb des Plans — die NPCs planen auf ihm (`GridWorld.navFromPlan`). */
  protected override navFromPlan(): boolean {
    return true;
  }

  protected override skyColor(): number {
    return 0x9cc4e8;
  }

  protected override welcome(): string {
    return 'Test Navigation · roter Knopf startet den Test · grün Start, blau Ziel';
  }

  /** Leere Hände: Hier sieht man zu. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return { floor: 0x8a93a6, wall: 0xa9b4c8 };
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(SPAWN.x, 0, SPAWN.z);
  }

  protected override spawnYaw(): number {
    return 0;
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.root.add(createSky(0x6ea8e8, 0xdbe7f2));
  }

  /** **Platten, Lava, Knöpfe** — und die Wege von Anfang an sichtbar. */
  protected override buildProps(): void {
    const ctx = this.context;
    const plan = this.grid;
    if (!ctx || !plan) return;
    this.setNavLayer('paths', true);
    this.paintLava(plan);
    for (const test of NAV_TESTS) {
      this.plate(plan, test.start, START_COLOUR);
      this.plate(plan, test.goal, GOAL_COLOUR);
      this.label(plan, test.goal, 'Ziel', test.title);
      this.benches.push(this.buildButton(ctx, test));
    }
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    for (const bench of this.benches) {
      bench.button.update(dt);
      this.watch(bench);
    }
    this.burn(dt);
  }

  override dispose(ctx: WorldContext): void {
    for (const object of this.pointed) ctx.pointer.remove(object);
    for (const bench of this.benches) bench.button.dispose();
    for (const panel of this.panels) panel.dispose();
    for (const shape of this.shapes) shape.dispose();
    for (const skin of this.skins) skin.dispose();
    this.benches.length = 0;
    this.pointed.length = 0;
    this.panels.length = 0;
    this.shapes.length = 0;
    this.skins.length = 0;
    super.dispose(ctx);
  }

  /**
   * **Eine farbige Platte auf einer Kachel**, knapp über dem Boden — und
   * **immer zu sehen**, wie die Linie des Wegs (`navScene.navPathView`): Von
   * oben verdeckte sonst die Glaswand der Kammer die Reihe dahinter, und dort
   * liegt der Start.
   */
  private plate(plan: GridPlan, at: NavSpot, colour: number): void {
    const shape = new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2);
    const skin = new THREE.MeshBasicMaterial({
      color: colour,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    this.shapes.push(shape);
    this.skins.push(skin);
    const mesh = new THREE.Mesh(shape, skin);
    mesh.position.set(tileCentre(at.x), plan.graph.levelY(at.level) + 0.015, tileCentre(at.z));
    mesh.name = 'nav-test-plate';
    mesh.renderOrder = 900;
    this.root.add(mesh);
  }

  /** Eine Tafel über dem Ziel, die die Kamera ansieht. */
  private label(plan: GridPlan, at: NavSpot, title: string, body: string): void {
    const panel = new TextPlane({
      width: 1.3,
      height: 0.5,
      title,
      body,
      accent: GOAL_COLOUR,
      face: true,
    });
    panel.position.set(tileCentre(at.x), plan.graph.levelY(at.level) + 1.9, tileCentre(at.z));
    this.root.add(panel);
    this.panels.push(panel);
  }

  /** Die Lava: eine glühende Fläche über den Kacheln, die sie im Graphen trägt. */
  private paintLava(plan: GridPlan): void {
    const shape = new THREE.PlaneGeometry(LAVA.w, LAVA.d).rotateX(-Math.PI / 2);
    const skin = new THREE.MeshBasicMaterial({ color: LAVA_COLOUR });
    this.shapes.push(shape);
    this.skins.push(skin);
    const mesh = new THREE.Mesh(shape, skin);
    mesh.position.set(
      LAVA.x + LAVA.w / 2,
      plan.graph.levelY(LAVA.level) + 0.01,
      LAVA.z + LAVA.d / 2,
    );
    mesh.name = 'nav-test-lava';
    this.root.add(mesh);
  }

  /** Der rote Knopf vor einer Kammer. */
  private buildButton(ctx: WorldContext, test: NavTest): Bench {
    const button = buildRedButton({ title: test.title, body: test.body });
    button.group.position.set(tileCentre(test.button.x), 0, tileCentre(test.button.z));
    // Die Säule sieht nach Süden, dorthin, wo man herkommt.
    button.group.rotation.y = Math.PI;
    this.root.add(button.group);
    const bench: Bench = { test, button, runner: null, arrived: false };
    const run = (): boolean => this.run(bench);
    this.addUsable(
      button.dome,
      { use: run, usePrompt: () => `${test.title} starten` },
      { radius: 0.5, shot: BUTTON_DOME_R, half: 0.3 },
    );
    ctx.pointer.add({ object: button.dome, onSelect: run });
    this.pointed.push(button.dome);
    return bench;
  }

  /**
   * **Einen Test starten**: den letzten Läufer wegräumen, eine Übungspuppe
   * auf die grüne Platte stellen und zur blauen schicken.
   */
  private run(bench: Bench): boolean {
    const director = this.director;
    const plan = this.grid;
    if (!director || !plan) return false;
    bench.button.press();
    if (bench.runner) director.remove(bench.runner);
    const { start, goal } = bench.test;
    const from = new THREE.Vector3(
      tileCentre(start.x),
      plan.graph.levelY(start.level),
      tileCentre(start.z),
    );
    const to = new THREE.Vector3(
      tileCentre(goal.x),
      plan.graph.levelY(goal.level),
      tileCentre(goal.z),
    );
    bench.runner = director.spawn({
      kind: 'dummy',
      brain: 'errand',
      at: from,
      errand: to,
      yaw: Math.atan2(-(to.x - from.x), -(to.z - from.z)),
      speed: npcSkin('dummy').speed,
    });
    bench.arrived = false;
    if (!bench.runner) return false;
    // Bis auf die Platte und nicht nur in ihre Nähe (`npcBrain.ERRAND_REACH`
    // sind 1,25 m) — der Test ist bestanden, wenn er auf ihr steht.
    bench.runner.sendTo(to, GOAL_REACH);
    this.announce(`${bench.test.title}: los`);
    return true;
  }

  /** Ist er angekommen? Einmal melden. */
  private watch(bench: Bench): void {
    const runner = bench.runner;
    if (!runner || bench.arrived || !runner.alive) return;
    const plan = this.grid;
    if (!plan) return;
    const feet = runner.feet(_feet);
    const goal = bench.test.goal;
    const near =
      Math.hypot(feet.x - tileCentre(goal.x), feet.z - tileCentre(goal.z)) < ARRIVED &&
      Math.abs(feet.y - plan.graph.levelY(goal.level)) < 1;
    if (!near) return;
    bench.arrived = true;
    this.announce(`${bench.test.title}: am Ziel`);
  }

  /** **Die Lava tötet**, wer auf ihr steht (`NpcDirector.harm`). */
  private burn(dt: number): void {
    const graph = this.grid?.graph;
    if (!graph || !this.director) return;
    this.director.harm((feet) => {
      const key = graph.at(feet.x, feet.z, feet.y);
      if (key === NO_TILE) return 0;
      return (graph.tile(key)?.hazard ?? 0) & HAZARD_FIRE ? LAVA_DAMAGE * dt : 0;
    });
  }
}

const _feet = new THREE.Vector3();
