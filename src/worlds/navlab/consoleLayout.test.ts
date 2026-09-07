import { NAV_LAYERS } from '../nav/navLayers';
import { NAV_SWITCHES } from '../nav/navSwitches';
import {
  LABEL_H,
  PAD_H,
  PAD_W,
  PLATE_H,
  PLATE_W,
  consolePads,
  consoleTitles,
  labelY,
  switchOf,
} from './consoleLayout';

/**
 * **Die Konsole, nachgemessen.**
 *
 * Zwei Sachen kann man an ihr falsch machen, und beide sieht man erst in der
 * Brille: eine Beschriftung, die unten aus der Platte heraushängt, und zwei
 * Tasten, die dasselbe heißen und Verschiedenes tun. Die erste ist eine
 * Rechnung, die beim nächsten Eintrag in `NAV_LAYERS` still kippt; die zweite
 * ist der Grund, warum die Schalter ein Präfix tragen.
 */
describe('Der Bauplan der Wandkonsole', () => {
  it('hat eine Taste je Ebene, je Schalter und eine für alle', () => {
    const pads = consolePads();
    expect(pads).toHaveLength(NAV_LAYERS.length + 1 + NAV_SWITCHES.length);
    // Und keine zwei heißen gleich: „Verbindungen" gibt es als Ebene und als
    // Schalter, und ohne Präfix wären es dieselbe Taste.
    expect(new Set(pads.map((pad) => pad.key)).size).toBe(pads.length);
    const acts = pads.filter((pad) => pad.acts).map((pad) => switchOf(pad.key));
    expect(acts).toEqual(NAV_SWITCHES.map((one) => one.id));
  });

  it('lässt keine Taste und keine Beschriftung aus der Platte hängen', () => {
    for (const pad of consolePads()) {
      expect(Math.abs(pad.x) + PAD_W / 2).toBeLessThanOrEqual(PLATE_W / 2);
      expect(pad.y + PAD_H / 2).toBeLessThanOrEqual(PLATE_H / 2);
      expect(labelY(pad) - LABEL_H / 2).toBeGreaterThanOrEqual(-PLATE_H / 2);
    }
    for (const title of consoleTitles()) {
      expect(title.y + title.height / 2).toBeLessThanOrEqual(PLATE_H / 2);
      expect(title.y - title.height / 2).toBeGreaterThanOrEqual(-PLATE_H / 2);
    }
  });

  it('legt keine zwei Tasten übereinander', () => {
    const pads = consolePads();
    for (let i = 0; i < pads.length; i++) {
      for (let j = i + 1; j < pads.length; j++) {
        const a = pads[i]!;
        const b = pads[j]!;
        const apart = Math.abs(a.x - b.x) >= PAD_W || Math.abs(a.y - b.y) >= PAD_H;
        expect(apart).toBe(true);
      }
    }
  });

  it('schiebt die zweite Überschrift zwischen die beiden Blöcke', () => {
    // Sie ist der sichtbare Unterschied zwischen „zeigen" und „schalten" — und
    // sie darf weder die Beschriftung darüber noch die Taste darunter berühren.
    const [, block] = consoleTitles();
    const above = consolePads().filter((pad) => !pad.acts);
    const below = consolePads().filter((pad) => pad.acts);
    const lowestAbove = Math.min(...above.map((pad) => labelY(pad) - LABEL_H / 2));
    const highestBelow = Math.max(...below.map((pad) => pad.y + PAD_H / 2));
    expect(block!.y + block!.height / 2).toBeLessThanOrEqual(lowestAbove);
    expect(block!.y - block!.height / 2).toBeGreaterThanOrEqual(highestBelow);
  });

  it('erkennt einen Schalter am Präfix und eine Ebene an seinem Fehlen', () => {
    expect(switchOf('sw:obstacles')).toBe('obstacles');
    expect(switchOf('links')).toBeNull();
    expect(switchOf('all')).toBeNull();
  });
});
