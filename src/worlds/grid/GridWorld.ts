import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import type { NavGraph } from '../nav/navGraph';
import { DIRS } from '../nav/navTile';
import type { GridPlan } from './gridPlan';
import type { PlanSolid, PlanSolidKind } from './solids';

/**
 * **Eine Welt, die auf dem Kachelgitter steht.**
 *
 * Sie beschreibt sich in `layout()` als Grundriss (`gridPlan.ts`) und bekommt
 * dafür alles, was eine Welt sonst von Hand machen musste: Geometrie, Physik,
 * Portalflächen und die Navigationskarte. Der Unterschied zu vorher ist keine
 * Ersparnis an Zeilen, sondern eine an *Unbekanntem* — was hier gebaut wird,
 * hat vorher schon ein Test gesehen.
 *
 * Drei Sachen erledigt sie, und alle drei standen vorher in jeder Welt einzeln:
 *
 * - **Die Farben.** Es gibt eine Palette für alle Gitterwelten
 *   (`GRID_COLORS`), und eine Welt verstellt daran einzelne Töne (`tint()`)
 *   statt sich sechs eigene Materialien anzulegen. Das ist der Grund, warum
 *   das Dunkelhaus neben dem Schießstand nicht mehr aussieht wie aus einem
 *   anderen Spiel — und es ist genau die „einheitliche Sache", die man an
 *   Böden und Wänden zuerst bemerkt.
 * - **Wo ein Portal haftet.** An den hellen Tafeln (`panel`) und am Boden, und
 *   sonst nirgends. Eine Wand aus hundert Kachelstücken darf nicht portalfähig
 *   sein: Ein Portal darin öffnete das Haus zum Nichts dahinter, und
 *   hundertfach eigene Kollisionsgruppen kostet obendrein.
 * - **Die Etagen.** Sie stehen im Plan, also muss sie niemand raten
 *   (`navLevels()`); geraten würde bei jedem Vordach eine zu viel.
 */
export abstract class GridWorld extends PortalWorld {
  /** Der gebaute Grundriss — steht ab `buildEnvironment()` bereit. */
  protected grid: GridPlan | null = null;
  private readonly palette = new Map<PlanSolidKind, THREE.Material>();

  /**
   * **Der Grundriss dieser Welt.** Das Einzige, was eine Gitterwelt wirklich
   * schreiben muss.
   */
  protected abstract layout(): GridPlan;

  /**
   * Eigene Töne für einzelne Sorten. Was hier nicht steht, kommt aus
   * `GRID_COLORS` — und das ist der Normalfall.
   */
  protected tint(): Partial<Record<PlanSolidKind, number>> {
    return {};
  }

  /**
   * Was mit dem fertigen Grundriss noch passieren soll: Leitern eintragen,
   * Stacheln malen, ein Podest verbinden (`nav/navBuild.ts`).
   */
  protected planReady(_plan: GridPlan): void {}

  protected override buildEnvironment(): void {
    const plan = this.layout();
    this.grid = plan;
    this.planReady(plan);

    const group = new THREE.Group();
    group.name = 'grid';
    this.root.add(group);

    for (const solid of plan.solids()) this.build(group, solid);

    this.buildProps();
  }

  /**
   * Ein Quader aus der Liste, als Ding in der Welt.
   *
   * Türblätter bekommen ihren Namen mit: Daran erkennt sie später wieder, wer
   * eine Tür aufgehen lassen will, ohne dass jemand eine zweite Liste führen
   * muss.
   */
  private build(parent: THREE.Object3D, solid: PlanSolid): void {
    const mesh = this.slab(
      parent,
      this.materialFor(solid.kind),
      [solid.w, solid.h, solid.d],
      [solid.x, solid.y, solid.z],
      solid.kind === 'panel',
    );
    if (solid.door) mesh.userData.door = solid.door;
  }

  /** Das Material einer Sorte, einmal gebaut und danach geteilt. */
  private materialFor(kind: PlanSolidKind): THREE.Material {
    const had = this.palette.get(kind);
    if (had) return had;
    const color = this.tint()[kind] ?? GRID_COLORS[kind];
    const made =
      kind === 'glow'
        ? new THREE.MeshBasicMaterial({ color, toneMapped: false })
        : new THREE.MeshStandardMaterial({ color, ...GRID_FINISH[kind] });
    this.palette.set(kind, made);
    return made;
  }

  /**
   * Die Etagen kommen aus dem Plan.
   *
   * Der Graph führt sie ohnehin, und geraten würde beim Abtasten im Zweifel
   * eine zu viel — ein Vordach sieht von unten aus wie ein Boden.
   */
  protected override navLevels(): readonly number[] | null {
    return this.grid?.graph.levels ?? null;
  }

  protected override navReady(graph: NavGraph): void {
    super.navReady(graph);
    const plan = this.grid;
    if (!plan) return;
    // **Was im Plan steht, gewinnt.** Das Abtasten sieht nur Quader: Es findet
    // die Wand, aber nicht, dass sie aufgehen kann, und die Kachel, aber nicht,
    // dass eine Küchenzeile darauf steht. Beides steht im Grundriss, und
    // deshalb wird es hier darübergelegt statt neu erraten.
    for (const key of plan.graph.tileKeys()) {
      const facts = plan.graph.tile(key);
      if (!graph.has(key) || !facts) continue;
      graph.setTile(key, { ...facts });
    }
    // Wände kommen über Kachel und Richtung herüber und nicht über ihren
    // Schlüssel: `setWall` normiert ihn ohnehin, und aus einem Wandschlüssel
    // allein käme man nicht an die Kachel zurück, an der er hängt.
    for (const key of plan.graph.tileKeys()) {
      for (const dir of DIRS) {
        const facts = plan.graph.wall(key, dir);
        if (facts) graph.setWall(key, dir, { ...facts });
      }
    }
    for (const link of plan.graph.links()) graph.addLink({ ...link });
  }
}

/**
 * **Die Palette aller Gitterwelten.**
 *
 * Acht Töne, und mehr sollen es nicht werden. Eine Palette mit dreißig
 * Einträgen ist eine, in der jede Welt ihren eigenen Grauton erfindet — und
 * dann sieht man in der Brille sofort, dass zwei Räume aus zwei Sitzungen
 * stammen.
 */
export const GRID_COLORS: Readonly<Record<PlanSolidKind, number>> = {
  floor: 0x6f7789,
  wall: 0x9aa0ad,
  door: 0x8a6440,
  /** Hell, damit man ohne Erklärung sieht, wo ein Portal hält. */
  panel: 0xf2f4f8,
  wood: 0x8a6440,
  steel: 0x9aa6bd,
  stone: 0xb0a893,
  glow: 0xffe7c0,
};

/** Wie eine Sorte das Licht nimmt — matt, seidig oder metallisch. */
const GRID_FINISH: Readonly<Record<PlanSolidKind, { roughness?: number; metalness?: number }>> = {
  floor: { roughness: 0.95, metalness: 0.02 },
  wall: { roughness: 0.9 },
  door: { roughness: 0.8 },
  panel: { roughness: 0.6, metalness: 0.05 },
  wood: { roughness: 0.85 },
  steel: { roughness: 0.4, metalness: 0.6 },
  stone: { roughness: 0.92 },
  glow: {},
};
