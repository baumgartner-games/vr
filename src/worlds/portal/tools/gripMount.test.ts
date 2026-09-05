/**
 * Dass die Werkzeuge wirklich den Griff tragen, von dem die Liste spricht.
 *
 * `STANDARD_GRIP_TOOLS` in `core/handPose.ts` sagt, welche Werkzeuge die
 * **Faust** am Griff bekommen, und `gripFit.ts` sagt, wo ihr **Griff** dafür
 * sitzen muss. Die
 * beiden Auskünfte stehen an verschiedenen Stellen, weil eine Hand gezeichnet
 * wird, lange bevor irgendwo ein Werkzeug gebaut ist — und zwei Auskünfte, die
 * auseinanderlaufen können, laufen irgendwann auseinander. Also werden hier die
 * Werkzeuge wirklich gebaut und ihre Griffe nachgemessen.
 *
 * three.js, aber kein WebGL: das hier liest Zahlen aus einem Szenengraphen.
 * Eine Leinwand gibt es in Node auch nicht, und ein paar Werkzeuge malen sich
 * ihre Anzeige auf eine — die Attrappe unten schluckt das, ohne dass ein
 * Werkzeug etwas davon merkt.
 */
import { BrushTool } from './BrushTool';
import { DroneTool } from './DroneTool';
import { DuplicatorTool } from './DuplicatorTool';
import { EraserTool } from './EraserTool';
import { FlashlightTool } from './FlashlightTool';
import { GrappleTool } from './GrappleTool';
import { GripTool } from './GripTool';
import { HammerTool } from './HammerTool';
import { HangGliderTool } from './HangGliderTool';
import { HolsterTool } from './HolsterTool';
import { InspectTool } from './InspectTool';
import { PistolTool } from './PistolTool';
import { createPortalGunTool } from './PortalGunTool';
import { StopwatchTool } from './StopwatchTool';
import { TapeTool } from './TapeTool';
import { TeleportTool } from './TeleportTool';
import { TransformTool } from './TransformTool';
import { WelderTool } from './WelderTool';
import { XrayTool } from './XrayTool';
import { GRIP_HOLD_POSITION, gripDeviation } from './gripFit';
import { STANDARD_GRIP_TOOLS } from '../../../core/handPose';
import type { Tool } from './Tool';

/** Eine Leinwand, die alles annimmt und nichts tut. */
const ctx2d = new Proxy(
  {},
  {
    get: (_target, key) => {
      if (key === 'canvas') return { width: 256, height: 256 };
      if (key === 'measureText') return () => ({ width: 10 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient')
        return () => ({ addColorStop() {} });
      if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => undefined;
    },
    set: () => true,
  },
);

beforeAll(() => {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) =>
      tag === 'canvas'
        ? { width: 256, height: 256, getContext: () => ctx2d, style: {} }
        : { style: {}, appendChild() {}, setAttribute() {} },
  };
});

const BUILDERS: Record<string, () => Tool> = {
  grip: () => new GripTool(),
  pistol: () => new PistolTool(),
  duplicator: () => new DuplicatorTool(),
  inspect: () => new InspectTool(),
  teleport: () => new TeleportTool(),
  gizmo: () => new TransformTool(),
  holster: () => new HolsterTool(),
  grapple: () => new GrappleTool(),
  'gun-blue': () => createPortalGunTool('gun-blue')!,
  'gun-red': () => createPortalGunTool('gun-red')!,
  'gun-dual': () => createPortalGunTool('gun-dual')!,
  brush: () => new BrushTool(),
  tape: () => new TapeTool(),
  eraser: () => new EraserTool(),
  xray: () => new XrayTool(),
  stopwatch: () => new StopwatchTool(),
  flashlight: () => new FlashlightTool(),
  welder: () => new WelderTool(),
  'hang-glider': () => new HangGliderTool(),
  hammer: () => new HammerTool(),
  drone: () => new DroneTool(),
};

describe('Der Griff sitzt, wo die Liste ihn hinschreibt', () => {
  it.each([...STANDARD_GRIP_TOOLS])('%s trägt den Standardgriff ohne Abweichung', (id) => {
    const build = BUILDERS[id];
    // Jedes Werkzeug in der Liste muss hier auch gebaut werden können, sonst
    // prüft die Liste sich selbst.
    expect(build).toBeDefined();
    const tool = build!();
    const part = tool.gripPart!;
    expect(part).toBeDefined();
    const deviation = gripDeviation(tool.holdRotation, {
      position: part.position,
      rotation: part.quaternion,
    });
    expect(deviation.distance).toBeCloseTo(0, 9);
    expect(deviation.angle).toBeCloseTo(0, 4);
    // Und auf der geteilten `holdPosition` — ohne die kürzt sich die
    // Zielkorrektur nicht weg und die gemeinsame Faust wäre gelogen.
    expect(tool.holdPosition.x).toBeCloseTo(GRIP_HOLD_POSITION.x, 9);
    expect(tool.holdPosition.y).toBeCloseTo(GRIP_HOLD_POSITION.y, 9);
    expect(tool.holdPosition.z).toBeCloseTo(GRIP_HOLD_POSITION.z, 9);
  });

  it('lässt die Liste keine Werkzeuge vergessen, die einen Griff anbauen', () => {
    for (const [id, build] of Object.entries(BUILDERS)) {
      expect(STANDARD_GRIP_TOOLS.has(id)).toBe(build().gripPart !== null);
    }
  });

  it('lässt Hammer und Drohne bei ihrer eigenen Faust', () => {
    // Beide werden nicht wie eine Pistole gehalten: der Hammer hat einen Stiel,
    // an dem jede Stelle ein Griff ist, die Drohne zwei Griffe an einem Deck.
    // Sie tragen die Griff-*Form*, aber nicht den Standardgriff — und deshalb
    // steht keiner von ihnen in der Liste.
    expect(new HammerTool().gripPart).toBeNull();
    expect(new DroneTool().gripPart).toBeNull();
    expect(STANDARD_GRIP_TOOLS.has('hammer')).toBe(false);
    expect(STANDARD_GRIP_TOOLS.has('drone')).toBe(false);
  });

  it('lässt jedes Werkzeug mit Griff entlang des Zeigestrahls zielen', () => {
    // Die Regel, die der Stabgriff gebrochen hat: eine Taschenlampe leuchtete
    // 30° über das hinweg, worauf man zeigte, weil ihr Rohr auf der Faustachse
    // lag. Ein Werkzeug darf schräg in der Hand liegen — der Inspektor kippt
    // sein Display um 23° zum Kopf —, aber ein halbes Rechteck ist keine
    // Neigung mehr, sondern eine andere Richtung.
    for (const id of STANDARD_GRIP_TOOLS) {
      const tool = BUILDERS[id]!();
      const angle = 2 * Math.acos(Math.min(1, Math.abs(tool.holdRotation.w)));
      expect((angle * 180) / Math.PI).toBeLessThan(25);
    }
  });
});
