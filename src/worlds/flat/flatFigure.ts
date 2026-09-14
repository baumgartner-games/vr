import type { FloorModel, FloorPoint } from './flatFloor';

/**
 * **Die Figur auf dem Boden** — was ein Stock bewegt.
 *
 * Dieselbe Form wie der Stock der Haunting-Runde (`map/flatRound.FlatInput`):
 * Richtung und Größe in [-1, 1], Sprint, Ducken, dazu der Blick (`yaw`) und
 * der Schritt, den ein Körper im Spielraum selbst getan hat (`shift`). Was
 * die Brille stellt, stellt hier die Tastatur oder der Daumen genauso.
 */
export interface FlatInput {
  x: number;
  z: number;
  sprint: boolean;
  crouch?: boolean;
  yaw?: number;
  shift?: { x: number; z: number };
}

export interface FlatFigure extends FloorPoint {
  yaw: number;
  radius: number;
  moving: boolean;
  sprinting: boolean;
}

/** Die Tempi des Gestells (`core/PlayerRig.ts`): Gehen, mal Sprint, mal Ducken. */
export const FIGURE_WALK = 2.6;
export const FIGURE_SPRINT = FIGURE_WALK * 1.9;
export const FIGURE_CROUCH = 0.5;
/** Wie breit die Figur ist — die Kapsel des Spielers (`physics/playerClearance.ts`). */
export const FIGURE_RADIUS = 0.24;
/** Die Scheibe, in der gerechnet wird — wie in der 2D-Runde. */
export const FIGURE_STEP = 1 / 30;

export const IDLE_INPUT: FlatInput = { x: 0, z: 0, sprint: false };

export function freshFigure(at: FloorPoint, yaw = 0): FlatFigure {
  return {
    x: at.x,
    z: at.z,
    level: at.level,
    yaw,
    radius: FIGURE_RADIUS,
    moving: false,
    sprinting: false,
  };
}

/**
 * **Ein Bild**: der Stock in Scheiben von 1/30 s, gleitend an Wänden, die
 * Etage wechselt der Boden. Der Körperschritt (`shift`) einmal je Bild.
 */
export function stepFigure(
  floor: FloorModel,
  figure: FlatFigure,
  input: FlatInput,
  dt: number,
): void {
  if (input.shift && (input.shift.x !== 0 || input.shift.z !== 0)) {
    const to = floor.slide(figure, input.shift.x, input.shift.z, figure.radius);
    figure.x = to.x;
    figure.z = to.z;
    figure.level = to.level;
  }
  if (input.yaw !== undefined && Number.isFinite(input.yaw)) figure.yaw = input.yaw;
  const magnitude = Math.min(1, Math.hypot(input.x, input.z));
  figure.moving = magnitude > 1e-3;
  figure.sprinting = figure.moving && input.sprint;
  if (!figure.moving) return;
  const crouch = input.crouch && !input.sprint ? FIGURE_CROUCH : 1;
  const speed = (input.sprint ? FIGURE_SPRINT : FIGURE_WALK) * crouch * magnitude;
  const nx = input.x / magnitude,
    nz = input.z / magnitude;
  if (input.yaw === undefined) figure.yaw = Math.atan2(-nx, -nz);
  let left = Math.max(0, Math.min(0.5, dt));
  while (left > 0) {
    const slice = Math.min(FIGURE_STEP, left);
    left -= slice;
    const to = floor.slide(figure, nx * speed * slice, nz * speed * slice, figure.radius);
    figure.x = to.x;
    figure.z = to.z;
    figure.level = to.level;
  }
}
