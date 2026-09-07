import { grabbedAt, type Target } from './reach';

const MODEL: Target<string> = { id: 'model', at: { x: 0, y: 1.2, z: -0.6 }, reach: 0.45 };
const FIGURE: Target<string> = { id: 'figure', at: { x: 0.1, y: 1.22, z: -0.6 }, reach: 0.06 };
const PALETTE: Target<string> = { id: 'palette', at: { x: -0.4, y: 1.1, z: -0.5 }, reach: 0.2 };

const ALL = [MODEL, FIGURE, PALETTE];

describe('Was eine Hand meint', () => {
  it('nimmt nichts, wo nichts ist', () => {
    expect(grabbedAt({ x: 3, y: 1.2, z: 2 }, ALL)).toBeNull();
  });

  it('nimmt die Figur, wenn die Hand auf ihr liegt — obwohl das Modell auch passt', () => {
    // **Der Grund, warum es diese Datei gibt.** Die Figur steht mitten im
    // Modell; wer sie versetzen will, darf nicht den ganzen Grundriss
    // wegschieben.
    expect(grabbedAt({ x: 0.11, y: 1.23, z: -0.6 }, ALL)).toBe('figure');
  });

  it('nimmt das Modell, sobald die Hand neben der Figur greift', () => {
    expect(grabbedAt({ x: 0.25, y: 1.2, z: -0.6 }, ALL)).toBe('model');
  });

  it('nimmt die Palette, wenn sie näher liegt als alles andere', () => {
    expect(grabbedAt({ x: -0.42, y: 1.1, z: -0.5 }, ALL)).toBe('palette');
  });

  it('lässt die größere Blase nicht gewinnen, sondern die kürzere Strecke', () => {
    // Beide in Reichweite, die Figur näher: die Figur. Sonst verschluckte das
    // Modell sie bei jedem Griff.
    const hand = { x: 0.14, y: 1.22, z: -0.6 };
    expect(grabbedAt(hand, [MODEL, FIGURE])).toBe('figure');
    expect(grabbedAt(hand, [FIGURE, MODEL])).toBe('figure');
  });
});
