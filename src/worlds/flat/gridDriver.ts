import * as THREE from 'three';
import type { Locomotion } from '../../core/Locomotion';
import type { PlayerRig } from '../../core/PlayerRig';
import { NO_TILE, keyLevel } from '../nav/navTile';
import type { FloorModel } from './flatFloor';
import {
  FIGURE_WALK,
  freshFigure,
  stepFigure,
  type FlatFigure,
  type FlatInput,
} from './flatFigure';
import { KernelLocomotion } from './kernelLocomotion';

/**
 * **Die 3D-Figur läuft auf dem Raster.**
 *
 * Was in Haunting die 2D-Runde für das Schiff tut (`haunting/flatKernel.ts`),
 * tut dieser Fahrer für jede Welt mit einem Plan: Der Wunsch der Bedienung —
 * Brille, Tastatur, Bildschirmstock — wird vom Gestell nur abgelegt
 * (`KernelLocomotion.wish`), hier zum Stock der Figur gemacht, die Figur
 * tut den Schritt auf dem Bodenmodell (`flatFloor.ts`, mit Wänden, Türen,
 * Kästen, Stufen und Treppen), und das Gestell wird dorthin gesetzt, wo sie
 * steht — samt Höhe: Etage, Feinhöhe, die Strecke auf der Treppe. Die
 * Rapier-Kapsel bleibt darunter für Requisiten und Hände und wird unter den
 * Kopf gezogen (`resync`), statt selbst zu laufen.
 *
 * **Die Physik trägt, wo das Raster nicht trägt**: außerhalb der Karte, nach
 * einem Portal, im Fall. Dann ist `active` aus, bis der Kopf wieder über
 * einer Kachel steht — dann wird die Figur dorthin gestellt und übernimmt.
 * Springen gibt es auf dem Raster nicht; wer springt, springt in der Physik.
 */
export class GridDriver {
  readonly loco: KernelLocomotion;
  figure: FlatFigure | null = null;
  /** Wo der Kopf nach dem letzten Nachführen war — der Unterschied ist der Körperschritt. */
  private lastHead: THREE.Vector3 | null = null;
  /** Solange jemand springt, trägt die Physik; danach fängt das Raster ihn wieder. */
  private airborne = 0;

  constructor(inner: Locomotion) {
    this.loco = new KernelLocomotion(inner);
  }

  /** Wie weit der Kopf von der Figur weg sein darf, bevor sie neu gestellt wird (Portal, Teleport). */
  static readonly STRAY = 1.2;

  /**
   * Ein Bild. `false`, wenn die Physik getragen hat — dann steht das Gestell,
   * wo die Physik es hingestellt hat, und die Figur folgt beim nächsten Mal.
   */
  step(
    rig: PlayerRig,
    camera: THREE.Object3D,
    floor: FloorModel | null,
    dt: number,
    jump = false,
  ): boolean {
    if (!floor) return this.release();
    rig.getHeadPosition(_head);
    const feetY = rig.getFloorY();
    if (jump || this.airborne > 0) {
      // Ein Sprung ist Sache der Physik; danach dauert es einen Moment, bis
      // der Boden wieder da ist — solange bleibt das Raster außen vor.
      this.airborne = jump ? 0.6 : this.airborne - dt;
      return this.release();
    }
    let figure = this.figure;
    const stray = figure && Math.hypot(figure.x - _head.x, figure.z - _head.z) > GridDriver.STRAY;
    if (!figure || stray || !floor.walkable(figure, figure?.radius ?? 0.24)) {
      const key = floor.graph.nearest(_head.x, _head.z, feetY, 1);
      if (key === NO_TILE) return this.release();
      const level = keyLevel(key);
      const here = { x: _head.x, z: _head.z, level };
      const at = floor.walkable(here, 0.24) ? here : floor.graph.worldOf(key);
      figure = freshFigure({ x: at.x, z: at.z, level }, figure?.yaw ?? 0);
      this.figure = figure;
      this.lastHead = null;
      // In der Luft — im Sprung, im Fall — trägt die Physik weiter, bis der
      // Boden wieder da ist. Unter dem Boden des Rasters (eine Stufe, die
      // Treppe) darf man stehen: Das Raster hebt einen darauf.
      if (feetY - floor.height(figure) > 0.6) return this.release();
    }
    this.loco.active = true;
    const shift = this.lastHead
      ? { x: _head.x - this.lastHead.x, z: _head.z - this.lastHead.z }
      : { x: 0, z: 0 };
    const wish = rig.paused ? _zero : this.loco.wish;
    const wished = Math.hypot(wish.x, wish.z);
    const magnitude = Math.min(1, wished / Math.max(0.1, rig.moveSpeed));
    camera.getWorldDirection(_look);
    const input: FlatInput = {
      x: wished > 1e-6 ? (wish.x / wished) * magnitude : 0,
      z: wished > 1e-6 ? (wish.z / wished) * magnitude : 0,
      sprint: rig.sprinting,
      crouch: rig.crouch > 0.15,
      yaw: Math.atan2(-_look.x, -_look.z),
      shift,
    };
    stepFigure(floor, figure, input, dt);
    // Das Gestell dorthin, wo die Figur steht: der Kopf über ihre Füße, die
    // Füße auf ihren Boden.
    rig.getHeadPosition(_head);
    rig.position.x += figure.x - _head.x;
    rig.position.z += figure.z - _head.z;
    rig.position.y += floor.height(figure) - rig.getFloorY();
    rig.updateMatrixWorld(true);
    this.loco.resync(rig);
    this.lastHead ??= new THREE.Vector3();
    rig.getHeadPosition(this.lastHead);
    return true;
  }

  private release(): boolean {
    this.loco.active = false;
    this.lastHead = null;
    return false;
  }

  /** Das Gestell wurde versetzt (Zentrale, Rettung): Die Figur folgt beim nächsten Bild. */
  forget(): void {
    this.figure = null;
    this.lastHead = null;
  }

  /** Das Tempo, an dem der Wunsch normiert wird — das des Gestells. */
  static readonly WALK = FIGURE_WALK;
}

const _head = new THREE.Vector3();
const _look = new THREE.Vector3();
const _zero = new THREE.Vector3();
