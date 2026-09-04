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
  | 'settings'
  | 'sphere'
  | 'pyramid'
  | 'plank'
  | 'cylinder'
  | 'gizmo'
  | 'brush'
  | 'pistol'
  | 'stopwatch'
  | 'grapple'
  | 'magnet'
  | 'glove'
  | 'superman'
  | 'weld'
  | 'wrench'
  | 'xray'
  | 'drone'
  | 'tape'
  | 'eraser'
  | 'flashlight'
  | 'lamp'
  | 'controller'
  | 'teleport'
  | 'reddot'
  | 'irons'
  | 'trace'
  | 'scope'
  | 'chat'
  | 'palette';

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
   * Entries on this page are *taken* rather than tapped: point at one and press
   * the grab button (or `A`) and it lands in that hand. The trigger does
   * nothing there, so aiming around cannot fill your hands by accident.
   * Grid pages behave this way automatically.
   */
  take?: boolean;
  /**
   * One line about the entry, shown *above* the panel while the pointer rests
   * on it. A grid of little pictures needs it — the cell has room for two
   * words, and two words rarely say what a red dot actually does.
   */
  caption?: string;
  /**
   * Shows a switch instead of a chevron. `run` should flip it — the panel
   * redraws itself afterwards.
   */
  checked?: boolean;
  /**
   * Statt der gezeichneten Ikone ein **kleines Modell der Sache selbst**,
   * das vor der Zeile im Raum steht und sich langsam dreht.
   *
   * Der Wert ist eine Id, die derjenige versteht, der die Modelle baut — beim
   * Werkzeugregal die Werkzeug-Id. Eine Strichzeichnung sagt „irgendein
   * Handschuh"; das Ding selbst sagt, welcher. Und es ist ohnehin das, wonach
   * man greift: die Zeile dahinter bleibt genau so anfassbar wie vorher, das
   * Modell steht nur davor und fängt keinen Strahl ab.
   */
  preview?: string;
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
    case 'sphere': {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.74, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.74, s * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.24, -s * 0.28, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pyramid': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(s * 0.8, s * 0.6);
      ctx.lineTo(-s * 0.8, s * 0.6);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(s * 0.16, s * 0.24);
      ctx.lineTo(-s * 0.8, s * 0.6);
      ctx.moveTo(s * 0.16, s * 0.24);
      ctx.lineTo(s * 0.8, s * 0.6);
      ctx.stroke();
      break;
    }
    case 'plank': {
      ctx.beginPath();
      ctx.roundRect(-s * 0.85, -s * 0.3, s * 1.7, s * 0.42, s * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, s * 0.12);
      ctx.lineTo(-s * 0.6, s * 0.42);
      ctx.lineTo(s * 1.1, s * 0.42);
      ctx.lineTo(s * 0.85, s * 0.12);
      ctx.stroke();
      break;
    }
    case 'cylinder': {
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.5, s * 0.55, s * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.5);
      ctx.lineTo(-s * 0.55, s * 0.5);
      ctx.moveTo(s * 0.55, -s * 0.5);
      ctx.lineTo(s * 0.55, s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, s * 0.5, s * 0.55, s * 0.22, 0, 0, Math.PI);
      ctx.stroke();
      break;
    }
    case 'gizmo': {
      const arrow = (dx: number, dy: number) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(dx, dy);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(dx, dy, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
      };
      arrow(s * 0.72, 0);
      arrow(0, -s * 0.72);
      arrow(-s * 0.6, s * 0.5);
      break;
    }
    case 'brush': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, s * 0.7);
      ctx.lineTo(s * 0.35, -s * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.2, -s * 0.4);
      ctx.lineTo(s * 0.72, -s * 0.72);
      ctx.lineTo(s * 0.5, -s * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'pistol': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.75, -s * 0.42);
      ctx.lineTo(s * 0.75, -s * 0.42);
      ctx.lineTo(s * 0.75, -s * 0.05);
      ctx.lineTo(-s * 0.1, -s * 0.05);
      ctx.lineTo(-s * 0.42, s * 0.75);
      ctx.lineTo(-s * 0.75, s * 0.75);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'stopwatch': {
      ctx.beginPath();
      ctx.arc(0, s * 0.1, s * 0.66, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.72);
      ctx.lineTo(s * 0.2, -s * 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, s * 0.1);
      ctx.lineTo(0, -s * 0.32);
      ctx.stroke();
      break;
    }
    case 'grapple': {
      // A hook on a line.
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, -s * 0.75);
      ctx.lineTo(0, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, s * 0.34, s * 0.32, Math.PI * 1.15, Math.PI * 2.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.3, s * 0.2);
      ctx.lineTo(s * 0.42, s * 0.52);
      ctx.stroke();
      break;
    }
    case 'magnet': {
      // Horseshoe magnet: the pull, drawn the way everybody knows it.
      ctx.beginPath();
      ctx.arc(0, s * 0.12, s * 0.55, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, s * 0.12);
      ctx.lineTo(-s * 0.55, s * 0.62);
      ctx.moveTo(s * 0.55, s * 0.12);
      ctx.lineTo(s * 0.55, s * 0.62);
      ctx.stroke();
      ctx.lineWidth = Math.max(3, size * 0.14);
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, s * 0.62);
      ctx.lineTo(-s * 0.55, s * 0.78);
      ctx.moveTo(s * 0.55, s * 0.62);
      ctx.lineTo(s * 0.55, s * 0.78);
      ctx.stroke();
      break;
    }
    case 'glove': {
      // A mitten with an arrow through it: grabbing, and moving what you got.
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, s * 0.75);
      ctx.lineTo(-s * 0.42, -s * 0.25);
      ctx.quadraticCurveTo(-s * 0.42, -s * 0.8, -s * 0.1, -s * 0.8);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.8, s * 0.2, -s * 0.25);
      ctx.lineTo(s * 0.2, s * 0.05);
      ctx.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.42, s * 0.75);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.85, -s * 0.5);
      ctx.lineTo(-s * 0.55, -s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.5);
      ctx.lineTo(-s * 0.72, -s * 0.66);
      ctx.lineTo(-s * 0.72, -s * 0.34);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'controller': {
      // Ein Quest-Controller von der Seite: Ring oben, Griff nach unten, und
      // ein Punkt für den Stick — daran erkennt man ihn auch bei 32 Pixeln.
      ctx.beginPath();
      ctx.arc(0, -s * 0.34, s * 0.46, Math.PI * 0.1, Math.PI * 0.9, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.14);
      ctx.quadraticCurveTo(-s * 0.24, s * 0.62, s * 0.06, s * 0.8);
      ctx.quadraticCurveTo(s * 0.34, s * 0.5, s * 0.3, -s * 0.14);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, s * 0.16, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'teleport': {
      // Ein Kreis auf dem Boden und ein Pfeil, der hineinfällt — genau das,
      // was man in der Welt sieht, wenn man damit zielt.
      ctx.beginPath();
      ctx.ellipse(0, s * 0.5, s * 0.68, s * 0.26, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.86);
      ctx.lineTo(0, s * 0.06);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.2);
      ctx.lineTo(0, s * 0.24);
      ctx.lineTo(s * 0.3, -s * 0.2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'superman': {
      // A shield with a bolt through it: the crest, not the letter.
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(s * 0.68, -s * 0.5);
      ctx.quadraticCurveTo(s * 0.6, s * 0.5, 0, s * 0.82);
      ctx.quadraticCurveTo(-s * 0.6, s * 0.5, -s * 0.68, -s * 0.5);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.18, -s * 0.46);
      ctx.lineTo(-s * 0.22, s * 0.06);
      ctx.lineTo(s * 0.1, s * 0.06);
      ctx.lineTo(-s * 0.18, s * 0.52);
      ctx.stroke();
      break;
    }
    case 'wrench': {
      // Open-ended spanner: the tool that adjusts the other tools.
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, s * 0.72);
      ctx.lineTo(s * 0.24, -s * 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.46, -s * 0.4, s * 0.34, Math.PI * 0.62, Math.PI * 0.12, true);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.7, s * 0.72, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'weld': {
      // Soldering iron with a spark.
      ctx.beginPath();
      ctx.moveTo(-s * 0.72, s * 0.6);
      ctx.lineTo(s * 0.1, -s * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.2);
      ctx.lineTo(s * 0.42, -s * 0.5);
      ctx.stroke();
      for (const angle of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
        ctx.beginPath();
        ctx.moveTo(s * 0.52 + Math.cos(angle) * s * 0.1, -s * 0.6 + Math.sin(angle) * s * 0.1);
        ctx.lineTo(s * 0.52 + Math.cos(angle) * s * 0.28, -s * 0.6 + Math.sin(angle) * s * 0.28);
        ctx.stroke();
      }
      break;
    }
    case 'xray': {
      // A frame you look through, with something showing behind it.
      ctx.beginPath();
      ctx.roundRect(-s * 0.78, -s * 0.6, s * 1.56, s * 1.2, s * 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, s * 0.3);
      ctx.lineTo(-s * 0.3, -s * 0.2);
      ctx.lineTo(s * 0.1, -s * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.32, s * 0.06, s * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'drone': {
      ctx.beginPath();
      ctx.roundRect(-s * 0.24, -s * 0.16, s * 0.48, s * 0.32, s * 0.08);
      ctx.stroke();
      for (const [x, y] of [
        [-s * 0.6, -s * 0.5],
        [s * 0.6, -s * 0.5],
        [-s * 0.6, s * 0.5],
        [s * 0.6, s * 0.5],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(x * 0.35, y * 0.35);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x, y, s * 0.26, s * 0.09, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'tape': {
      // Tape measure: a spool with the band pulled out.
      ctx.beginPath();
      ctx.roundRect(-s * 0.78, -s * 0.1, s * 0.86, s * 0.82, s * 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.35, s * 0.3, s * 0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.08, s * 0.16);
      ctx.lineTo(s * 0.78, -s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.5, -s * 0.62);
      ctx.lineTo(s * 0.8, -s * 0.34);
      ctx.stroke();
      break;
    }
    case 'eraser': {
      ctx.save();
      ctx.rotate(-Math.PI / 6);
      ctx.beginPath();
      ctx.roundRect(-s * 0.7, -s * 0.3, s * 1.4, s * 0.6, s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.3);
      ctx.lineTo(s * 0.1, s * 0.3);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'flashlight': {
      // A torch from the side, with the light coming out of the head.
      ctx.beginPath();
      ctx.roundRect(-s * 0.85, -s * 0.16, s * 0.95, s * 0.32, s * 0.07);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.34);
      ctx.lineTo(s * 0.4, -s * 0.34);
      ctx.lineTo(s * 0.4, s * 0.34);
      ctx.lineTo(s * 0.1, s * 0.34);
      ctx.closePath();
      ctx.stroke();
      for (const y of [-s * 0.5, 0, s * 0.5]) {
        ctx.beginPath();
        ctx.moveTo(s * 0.52, y * 0.55);
        ctx.lineTo(s * 0.86, y);
        ctx.stroke();
      }
      break;
    }
    case 'lamp': {
      // A bulb: what a light switch turns on.
      ctx.beginPath();
      ctx.arc(0, -s * 0.18, s * 0.44, Math.PI * 0.85, Math.PI * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, s * 0.16);
      ctx.lineTo(-s * 0.22, s * 0.42);
      ctx.lineTo(s * 0.22, s * 0.42);
      ctx.lineTo(s * 0.22, s * 0.16);
      ctx.stroke();
      for (const [x, y] of [
        [0, -s * 0.86],
        [-s * 0.62, -s * 0.56],
        [s * 0.62, -s * 0.56],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(x * 0.62, y * 0.62);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      break;
    }
    case 'reddot': {
      // A ring with the dot in the middle of it.
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.17, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'irons': {
      // Rear notch on the left, front post on the right.
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, s * 0.5);
      ctx.lineTo(-s * 0.8, -s * 0.1);
      ctx.lineTo(-s * 0.5, -s * 0.1);
      ctx.lineTo(-s * 0.5, s * 0.15);
      ctx.lineTo(-s * 0.2, s * 0.15);
      ctx.lineTo(-s * 0.2, -s * 0.1);
      ctx.lineTo(s * 0.1, -s * 0.1);
      ctx.lineTo(s * 0.1, s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.6, s * 0.5);
      ctx.lineTo(s * 0.6, -s * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.6, -s * 0.66, s * 0.13, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'trace': {
      // A shot arcing away and coming down again.
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, s * 0.6);
      ctx.quadraticCurveTo(0, -s * 1.1, s * 0.8, s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.8, s * 0.6, s * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.8, s * 0.5, s * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'scope': {
      // A tube from the side, the bell in front, the eyepiece behind.
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, -s * 0.26);
      ctx.lineTo(s * 0.42, -s * 0.26);
      ctx.lineTo(s * 0.42, s * 0.26);
      ctx.lineTo(-s * 0.62, s * 0.26);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.42, -s * 0.42);
      ctx.lineTo(s * 0.78, -s * 0.42);
      ctx.lineTo(s * 0.78, s * 0.42);
      ctx.lineTo(s * 0.42, s * 0.42);
      ctx.closePath();
      ctx.stroke();
      // The two rings it sits on the rail with.
      for (const x of [-s * 0.34, s * 0.06]) {
        ctx.beginPath();
        ctx.moveTo(x, s * 0.26);
        ctx.lineTo(x, s * 0.58);
        ctx.stroke();
      }
      break;
    }
    case 'chat': {
      // Eine Sprechblase mit drei Punkten — die einzige Ikone hier, hinter der
      // Text von einem *Menschen* steckt und nicht von der Maschine.
      ctx.beginPath();
      ctx.roundRect(-s * 0.8, -s * 0.68, s * 1.6, s * 1.12, s * 0.26);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.34, s * 0.42);
      ctx.lineTo(-s * 0.5, s * 0.86);
      ctx.lineTo(-s * 0.02, s * 0.44);
      ctx.stroke();
      for (const x of [-s * 0.42, 0, s * 0.42]) {
        ctx.beginPath();
        ctx.arc(x, -s * 0.12, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'palette': {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.76, 0, Math.PI * 2);
      ctx.stroke();
      for (const [x, y] of [
        [-s * 0.34, -s * 0.3],
        [s * 0.3, -s * 0.34],
        [s * 0.36, s * 0.26],
        [-s * 0.3, s * 0.34],
      ] as const) {
        ctx.beginPath();
        ctx.arc(x, y, s * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  ctx.restore();
}
