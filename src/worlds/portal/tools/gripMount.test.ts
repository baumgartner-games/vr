/**
 * Dass die Werkzeuge wirklich den Griff tragen, von dem die Tabelle spricht.
 *
 * `TOOL_GRIPS` in `core/handPose.ts` sagt, welche **Faust** ein Werkzeug
 * bekommt, und `gripFit.ts` sagt, wo sein **Griff** dafür sitzen muss. Die
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
import { DroneTool } from './DroneTool';
import { DuplicatorTool } from './DuplicatorTool';
import { FlashlightTool } from './FlashlightTool';
import { GrappleTool } from './GrappleTool';
import { HammerTool } from './HammerTool';
import { HolsterTool } from './HolsterTool';
import { InspectTool } from './InspectTool';
import { PistolTool } from './PistolTool';
import { TeleportTool } from './TeleportTool';
import { TransformTool } from './TransformTool';
import { WelderTool } from './WelderTool';
import { GRIP_HOLD_POSITIONS, gripDeviation } from './gripFit';
import { TOOL_GRIPS } from '../../../core/handPose';
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
  pistol: () => new PistolTool(),
  duplicator: () => new DuplicatorTool(),
  inspect: () => new InspectTool(),
  teleport: () => new TeleportTool(),
  gizmo: () => new TransformTool(),
  holster: () => new HolsterTool(),
  grapple: () => new GrappleTool(),
  flashlight: () => new FlashlightTool(),
  welder: () => new WelderTool(),
  hammer: () => new HammerTool(),
  drone: () => new DroneTool(),
};

describe('Der Griff sitzt, wo die Tabelle ihn hinschreibt', () => {
  it.each(Object.keys(TOOL_GRIPS))('%s trägt seinen Standardgriff ohne Abweichung', (id) => {
    const build = BUILDERS[id];
    // Jedes Werkzeug in der Tabelle muss hier auch gebaut werden können, sonst
    // prüft die Tabelle sich selbst.
    expect(build).toBeDefined();
    const tool = build!();
    expect(tool.gripKind).toBe(TOOL_GRIPS[id]);
    const part = tool.gripPart!;
    expect(part).toBeDefined();
    const deviation = gripDeviation(tool.gripKind!, tool.holdRotation, {
      position: part.position,
      rotation: part.quaternion,
    });
    expect(deviation.distance).toBeCloseTo(0, 9);
    expect(deviation.angle).toBeCloseTo(0, 4);
    // Und auf der geteilten `holdPosition` seiner Griffart — ohne die kürzt
    // sich die Zielkorrektur nicht weg und die gemeinsame Faust wäre gelogen.
    const hold = GRIP_HOLD_POSITIONS[tool.gripKind!];
    expect(tool.holdPosition.x).toBeCloseTo(hold.x, 9);
    expect(tool.holdPosition.y).toBeCloseTo(hold.y, 9);
    expect(tool.holdPosition.z).toBeCloseTo(hold.z, 9);
  });

  it('lässt die Tabelle keine Werkzeuge vergessen, die einen Griff anbauen', () => {
    for (const [id, build] of Object.entries(BUILDERS)) {
      const kind = build().gripKind;
      expect(kind ? id : null).toBe(kind ? id : null);
      expect(TOOL_GRIPS[id] ?? null).toBe(kind);
    }
  });

  it('lässt Hammer und Drohne bei ihrer eigenen Faust', () => {
    // Beide werden nicht wie eine Pistole gehalten und auch nicht wie ein Stab:
    // der Hammer hat einen Stiel, an dem jede Stelle ein Griff ist, die Drohne
    // zwei Griffe an einem Deck. Sie tragen die Griff-*Form*, aber keinen der
    // beiden Standardgriffe — und deshalb steht keiner von ihnen in der Tabelle.
    expect(new HammerTool().gripKind).toBeNull();
    expect(new DroneTool().gripKind).toBeNull();
    expect(TOOL_GRIPS['hammer']).toBeUndefined();
    expect(TOOL_GRIPS['drone']).toBeUndefined();
  });
});
