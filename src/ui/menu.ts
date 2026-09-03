import type { Handedness } from '../core/XRInput';

export type MenuIcon =
  | 'worlds'
  | 'tools'
  | 'bag'
  | 'reset'
  | 'back'
  | 'close'
  | 'gun'
  | 'cube'
  | 'domino'
  | 'portal'
  | 'settings';

/** One row (or grid cell) of the wrist menu. */
export interface MenuEntry {
  id: string;
  label: string;
  sub?: string;
  accent?: number;
  badge?: string;
  icon?: MenuIcon;
  selected?: boolean;
  /** Opens a submenu instead of running something. */
  children?: MenuEntry[];
  /** Draw the children as a grid of icons instead of a list. */
  grid?: boolean;
  /**
   * Shows a switch instead of a chevron. `run` should flip it — the panel
   * redraws itself afterwards.
   */
  checked?: boolean;
  /** @param hand the hand that selected the entry, when known. */
  run?(hand: Handedness | null): void;
}

/** Draws a simple vector icon centred on (cx, cy). */
export function drawMenuIcon(
  ctx: CanvasRenderingContext2D,
  icon: MenuIcon,
  cx: number,
  cy: number,
  size: number,
  color: string,
): void {
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.075);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  switch (icon) {
    case 'worlds': {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.72, s * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.72);
      ctx.lineTo(0, s * 0.72);
      ctx.stroke();
      break;
    }
    case 'tools': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, s * 0.6);
      ctx.lineTo(s * 0.2, -s * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.42, -s * 0.42, s * 0.32, Math.PI * 0.15, Math.PI * 1.5);
      ctx.stroke();
      break;
    }
    case 'bag': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, -s * 0.1);
      ctx.quadraticCurveTo(-s * 0.75, s * 0.75, 0, s * 0.75);
      ctx.quadraticCurveTo(s * 0.75, s * 0.75, s * 0.62, -s * 0.1);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.32, -s * 0.1);
      ctx.quadraticCurveTo(0, -s * 0.85, s * 0.32, -s * 0.1);
      ctx.stroke();
      break;
    }
    case 'reset': {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.62, Math.PI * 0.35, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.2, -s * 0.72);
      ctx.lineTo(s * 0.56, -s * 0.44);
      ctx.lineTo(s * 0.16, -s * 0.24);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'back': {
      ctx.beginPath();
      ctx.moveTo(s * 0.5, -s * 0.55);
      ctx.lineTo(-s * 0.3, 0);
      ctx.lineTo(s * 0.5, s * 0.55);
      ctx.stroke();
      break;
    }
    case 'close': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.5);
      ctx.lineTo(s * 0.5, s * 0.5);
      ctx.moveTo(s * 0.5, -s * 0.5);
      ctx.lineTo(-s * 0.5, s * 0.5);
      ctx.stroke();
      break;
    }
    case 'gun': {
      ctx.beginPath();
      ctx.roundRect(-s * 0.75, -s * 0.25, s * 1.3, s * 0.42, s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-s * 0.5, s * 0.17, s * 0.34, s * 0.6, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.62, -s * 0.04, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'cube': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(s * 0.75, -s * 0.38);
      ctx.lineTo(s * 0.75, s * 0.4);
      ctx.lineTo(0, s * 0.82);
      ctx.lineTo(-s * 0.75, s * 0.4);
      ctx.lineTo(-s * 0.75, -s * 0.38);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.75, -s * 0.38);
      ctx.lineTo(0, 0);
      ctx.lineTo(s * 0.75, -s * 0.38);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, s * 0.82);
      ctx.stroke();
      break;
    }
    case 'domino': {
      ctx.beginPath();
      ctx.roundRect(-s * 0.42, -s * 0.8, s * 0.84, s * 1.6, s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, 0);
      ctx.lineTo(s * 0.42, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -s * 0.4, s * 0.12, 0, Math.PI * 2);
      ctx.arc(0, s * 0.4, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'settings': {
      for (const [y, knob] of [
        [-s * 0.45, -s * 0.2],
        [0, s * 0.25],
        [s * 0.45, -s * 0.1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.7, y);
        ctx.lineTo(s * 0.7, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(knob, y, s * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      break;
    }
    case 'portal': {
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.5, s * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}
