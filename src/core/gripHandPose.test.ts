/**
 * **Die Faust gehört zum Griff und nicht zum Werkzeug.**
 *
 * Zwanzig Werkzeuge tragen denselben Zylinder an derselben Stelle in derselben
 * Hand. Sie haben deshalb *eine* Haltung und nicht zwanzig — und wer sie
 * zwanzigmal einstellt, stellt neunzehnmal dasselbe ein und einmal aus Versehen
 * etwas anderes. Hier steht die Kette, die daraus folgt: eigene Haltung, sonst
 * die Faust des Standardgriffs, sonst die gebaute.
 *
 * Der Speicher liegt im `localStorage`, den es in Node nicht gibt — also steht
 * hier einer aus einer Map. Er ist die halbe Prüfung wert: er hält fest, dass
 * wirklich *ein* Eintrag genügt, um zwanzig Werkzeuge zu bewegen.
 */

const store = new Map<string, string>();

beforeAll(() => {
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
});

// Erst nach dem Speicher laden: das Modul liest beim ersten Zugriff, und ein
// Modul, das seinen Speicher nicht findet, merkt sich das leere Ergebnis.
import { GRIP_POSE_ID, STANDARD_GRIP_TOOLS, defaultHoldPose } from './handPose';
import {
  clearHandPoses,
  clearHoldHandPose,
  gripHandPose,
  holdHandPose,
  saveHoldHandPose,
} from './handPoseStore';

beforeEach(() => {
  store.clear();
  clearHandPoses();
});

/** Zwei Werkzeuge mit Standardgriff, von denen keins der Griff selbst ist. */
const GRIP_TOOL = 'pistol';
const OTHER_TOOL = 'welder';

describe('ohne alles', () => {
  it('gibt jedem Werkzeug die gebaute Faust am Standardgriff', () => {
    expect(holdHandPose('right', GRIP_TOOL)).toEqual(defaultHoldPose('right', GRIP_TOOL));
    expect(holdHandPose('right', OTHER_TOOL)).toEqual(defaultHoldPose('right', OTHER_TOOL));
    // Und das ist dieselbe: ein Griff, eine Faust.
    expect(holdHandPose('right', GRIP_TOOL)).toEqual(holdHandPose('right', OTHER_TOOL));
  });

  it('führt die Faust unter der Id des Griffs — einer Werkzeug-Id', () => {
    expect(GRIP_POSE_ID).toBe('grip');
    expect(STANDARD_GRIP_TOOLS.has(GRIP_POSE_ID)).toBe(true);
  });
});

describe('eine Faust am Griff eingestellt', () => {
  it('gilt für jedes Werkzeug mit diesem Griff', () => {
    const pose = { ...defaultHoldPose('right', GRIP_TOOL), x: 3.5, pitch: -20 };
    saveHoldHandPose('right', GRIP_POSE_ID, pose);

    for (const id of STANDARD_GRIP_TOOLS) {
      expect(holdHandPose('right', id).x).toBe(3.5);
      expect(holdHandPose('right', id).pitch).toBe(-20);
    }
    // Und `gripHandPose` ist derselbe Weg unter einem Namen, der es sagt.
    expect(gripHandPose('right').x).toBe(3.5);
  });

  it('lässt die andere Hand in Ruhe', () => {
    saveHoldHandPose('right', GRIP_POSE_ID, {
      ...defaultHoldPose('right', GRIP_TOOL),
      x: 3.5,
    });
    expect(holdHandPose('left', GRIP_TOOL)).toEqual(defaultHoldPose('left', GRIP_TOOL));
  });

  it('rührt Werkzeuge ohne Standardgriff nicht an', () => {
    saveHoldHandPose('right', GRIP_POSE_ID, {
      ...defaultHoldPose('right', GRIP_TOOL),
      x: 3.5,
    });
    // Der Hammer greift an seinen Stiel, die Drohne an ihr Deck.
    expect(holdHandPose('right', 'hammer')).toEqual(defaultHoldPose('right', 'hammer'));
    expect(holdHandPose('right', 'drone')).toEqual(defaultHoldPose('right', 'drone'));
  });
});

describe('eine Faust für ein einzelnes Werkzeug', () => {
  it('gewinnt über die des Griffs — sie ist die genauere Auskunft', () => {
    saveHoldHandPose('right', GRIP_POSE_ID, {
      ...defaultHoldPose('right', GRIP_TOOL),
      x: 3.5,
    });
    saveHoldHandPose('right', GRIP_TOOL, {
      ...defaultHoldPose('right', GRIP_TOOL),
      x: -1,
    });
    expect(holdHandPose('right', GRIP_TOOL).x).toBe(-1);
    // Die anderen bleiben bei der Faust des Griffs.
    expect(holdHandPose('right', 'duplicator').x).toBe(3.5);
  });

  it('fällt nach dem Löschen wieder auf die des Griffs zurück', () => {
    saveHoldHandPose('right', GRIP_POSE_ID, {
      ...defaultHoldPose('right', GRIP_TOOL),
      x: 3.5,
    });
    saveHoldHandPose('right', GRIP_TOOL, { ...defaultHoldPose('right', GRIP_TOOL), x: -1 });
    expect(clearHoldHandPose('right', GRIP_TOOL)).toBe(true);
    expect(holdHandPose('right', GRIP_TOOL).x).toBe(3.5);
  });
});
