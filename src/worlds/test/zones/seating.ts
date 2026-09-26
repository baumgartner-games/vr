import * as THREE from 'three';
import { buildRedButton, BUTTON_DOME_R, type RedButton } from '../../shared/redButton';
import { canLoadModels } from '../../../core/chefFit';
import type { WorldContext } from '../../../core/types';
import { VisitorRoutine } from '../../npc/NpcRoutine';
import { shelfKind, type NpcKind } from '../../npc/npcKinds';
import type { Place } from '../../npc/npcPlaces';
import { NAVIGATION, centre } from '../layout';
import type { ZoneHost } from './zone';

/**
 * **Die Sitzecke** — der Südrand der Navigationszone, und das Schaufenster
 * für das Verhalten der NPCs (`npc/npcBehavior.ts`).
 *
 * Drei Stühle und eine Bank aus dem Regal, eine Warteschlange mit drei
 * Plätzen daneben und ein roter Knopf, der fünf Besucher einlässt. Jeder sucht
 * sich einen freien Platz (reserviert, bevor er losgeht — zwei wollen nie
 * dieselbe Bank), setzt sich eine Weile, sucht sich vielleicht noch einen und
 * geht dann zum Ausgang. Wer keinen freien findet, stellt sich an; wer zu
 * lange ansteht, geht ohne Platz. Mehr Besucher als Plätze sind Absicht: Die
 * Schlange ist sonst nie zu sehen.
 *
 * Alles, was man sieht, ist KayKit — die Figuren aus dem Abenteurer-Paket
 * (`npcKinds.shelfKind`), die Stühle aus `furniture-bits`, die Bank aus
 * `dungeon`. Die Möbel haben **keinen Körper**: Ein Stuhl, den das
 * Gitter sperrt, ist ein Stuhl, auf den sich niemand setzen kann. Sie sind
 * Kulisse; was zählt, sind die Plätze (`npcPlaces.ts`).
 */

/** Die Stühle: je eine Kachel, an der Südkante, Blick nach Norden. */
const CHAIR_TILES = [-22, -20, -18] as const;
/** Die Bank: zwei Sitzplätze nebeneinander. */
const BENCH_TILE = { x: -15, z: 3 } as const;
/** Die Reihe der Stühle. */
const SEAT_ROW = 3;
/** Die Warteschlange: drei Kacheln nach Osten, Blick nach Westen (zur Bank). */
const QUEUE = { x: -13, z: 2, length: 3 } as const;
/** Ein- und Ausgang: die Südostecke der Zone. */
export const SEATING_DOOR = { x: -8.5, z: 3.2 } as const;
/** Der Knopf, der sie einlässt. */
const BUTTON_TILE = { x: -9, z: -2 } as const;
/** Wie viele auf einen Druck kommen. */
const ADMIT = 6;

const CHAIR_MODEL = 'furniture-bits/chair_A_wood.glb';
const BENCH_MODEL = 'dungeon/bench.glb';

/** Blick nach Norden — der Gierwinkel 0 schaut nach −Z. */
const FACE_NORTH = 0;
/** Blick nach Westen. */
const FACE_WEST = Math.PI / 2;

/** Die Figuren, der Reihe nach — alle vom mittleren Skelett, damit sie sitzen können. */
const VISITORS: readonly NpcKind[] = [
  'adventurers/characters/Knight.glb',
  'adventurers/characters/Mage.glb',
  'adventurers/characters/Rogue.glb',
  'adventurers/characters/Druid.glb',
  'adventurers/characters/Engineer.glb',
  'adventurers/characters/Ranger.glb',
].map((path) => shelfKind(path));

/**
 * **Die Plätze der Sitzecke** — reine Rechnung, damit ein Test sie gegen den
 * Grundriss halten kann (`seating.test.ts`).
 */
export function seatingPlaces(): Place[] {
  const places: Place[] = CHAIR_TILES.map((x, i) => ({
    id: `stuhl-${i}`,
    kind: 'seat' as const,
    x: centre(x),
    z: centre(SEAT_ROW),
    yaw: FACE_NORTH,
  }));
  // Die Bank ist 1,5 m breit und hat zwei Plätze, je einen Viertelmeter
  // links und rechts ihrer Mitte.
  for (const [i, dx] of [-0.4, 0.4].entries()) {
    places.push({
      id: `bank-${i}`,
      kind: 'seat',
      x: centre(BENCH_TILE.x) + dx,
      z: centre(BENCH_TILE.z),
      yaw: FACE_NORTH,
    });
  }
  for (let i = 0; i < QUEUE.length; i++) {
    places.push({
      id: `schlange-${i}`,
      kind: 'queue',
      x: centre(QUEUE.x + i),
      z: centre(QUEUE.z),
      yaw: FACE_WEST,
      line: 'sitzecke',
      order: i,
    });
  }
  return places;
}

export class SeatingCorner {
  private routine: VisitorRoutine | null = null;
  private button: RedButton | null = null;
  private host: ZoneHost | null = null;
  private ctx: WorldContext | null = null;
  private readonly models: THREE.Object3D[] = [];
  private gone = false;
  /** Ob die ersten Besucher schon da sind. */
  private opened = false;

  build(ctx: WorldContext, world: ZoneHost): void {
    this.host = world;
    this.ctx = ctx;
    const routineHost = world.npcRoutineHost();
    if (routineHost) {
      this.routine = new VisitorRoutine(routineHost, {
        entrance: SEATING_DOOR,
        exit: SEATING_DOOR,
        kinds: VISITORS,
        config: { line: 'sitzecke', patience: 25, stayMin: 8, stayMax: 16, visits: 2 },
      });
      for (const place of seatingPlaces()) this.routine.addPlace(place);
    }
    this.buildButton(ctx, world);
    this.fillFurniture(world);
  }

  update(dt: number): void {
    this.button?.update(dt);
    // Wer hereinkommt, soll nicht vor einer leeren Ecke stehen: Die ersten
    // Besucher kommen im ersten Bild — beim Bauen der Zone gibt es den
    // Regisseur noch nicht, der sie setzen könnte.
    if (!this.opened && this.routine) this.opened = this.routine.admit(ADMIT) > 0;
    this.routine?.update(dt);
  }

  reset(): void {
    this.routine?.clear();
    this.opened = false;
  }

  /** Was die Besucher gerade tun — für den Test und für eine Meldung. */
  modes(): string[] {
    return this.routine?.modes() ?? [];
  }

  dispose(): void {
    this.gone = true;
    this.routine?.clear();
    this.routine = null;
    if (this.ctx && this.button) this.ctx.pointer.remove(this.button.dome);
    if (this.button) this.host?.removeUsable(this.button.dome);
    this.button?.dispose();
    this.button = null;
    // Die Materialien einer Regalkopie gehören ihr allein, die Geometrie der
    // Vorlage (`core/kaykitModel.ts`) — also gehen nur die Materialien.
    for (const model of this.models) {
      model.removeFromParent();
      model.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        for (const skin of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          skin.dispose();
        }
      });
    }
    this.models.length = 0;
    this.host = null;
    this.ctx = null;
  }

  private admit(): boolean {
    const routine = this.routine;
    if (!routine) return false;
    this.button?.press();
    const made = routine.admit(ADMIT);
    this.host?.notify(made > 0 ? `${made} Besucher kommen` : 'Genug Besucher da');
    return made > 0;
  }

  private buildButton(ctx: WorldContext, world: ZoneHost): void {
    const button = buildRedButton({
      title: 'Besucher einlassen',
      body: 'Sie suchen sich Stühle und die Bank, sitzen eine Weile und gehen',
    });
    button.group.position.set(centre(BUTTON_TILE.x), 0, centre(BUTTON_TILE.z));
    button.group.rotation.y = Math.PI;
    world.root.add(button.group);
    this.button = button;
    world.addUsable(
      button.dome,
      { use: () => this.admit(), usePrompt: () => 'Besucher einlassen' },
      { radius: 0.5, shot: BUTTON_DOME_R, half: 0.3 },
    );
    ctx.pointer.add({ object: button.dome, onSelect: () => this.admit() });
  }

  /**
   * **Die Möbel aus dem Regal** — ohne WebGL (Jest) und ohne die Pakete gar
   * nichts: Die Plätze gibt es trotzdem, und gesessen wird dann eben auf dem
   * Boden, wo der Stuhl stünde.
   */
  private fillFurniture(world: ZoneHost): void {
    if (!canLoadModels()) return;
    void import('../../../core/kaykitModel').then(async (module) => {
      const seats = seatingPlaces().filter((place) => place.kind === 'seat');
      const chairs = await Promise.all(CHAIR_TILES.map(() => module.kaykitModel(CHAIR_MODEL)));
      const bench = await module.kaykitModel(BENCH_MODEL);
      if (this.gone) {
        for (const model of [...chairs, bench]) if (model) this.models.push(model);
        this.dispose();
        return;
      }
      chairs.forEach((chair, i) => {
        if (!chair) return;
        const seat = seats[i]!;
        // Die Lehne nach Süden, die Sitzfläche zum Raum. Nachgesehen und
        // nicht geraten: Der Stuhl schaut in der Datei nach −X (mit `+ π`
        // stand die Lehne im ersten Bild im Westen), der Platz nach Norden.
        chair.position.set(seat.x, 0, seat.z);
        chair.rotation.y = seat.yaw - Math.PI / 2;
        this.place(world, chair);
      });
      if (bench) {
        bench.position.set(centre(BENCH_TILE.x), 0, centre(BENCH_TILE.z));
        bench.rotation.y = FACE_NORTH + Math.PI;
        this.place(world, bench);
      }
    });
  }

  private place(world: ZoneHost, model: THREE.Object3D): void {
    model.traverse((node) => {
      node.raycast = () => {};
    });
    world.root.add(model);
    this.models.push(model);
  }
}

/** Die Zonengrenze, gegen die der Test die Plätze hält. */
export const SEATING_ZONE = NAVIGATION;
