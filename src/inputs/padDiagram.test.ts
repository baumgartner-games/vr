/** @jest-environment jsdom */
import { PAD_BUTTONS } from '../core/gamepadReport';
import { padDiagram, showPressedSlots, showSticks } from './padDiagram';

/** Das Bild in ein `<div>` hängen, so wie die Seite es tut. */
function draw(kind: Parameters<typeof padDiagram>[0] = 'playstation'): SVGElement {
  const host = document.createElement('div');
  host.innerHTML = padDiagram(kind);
  return host.querySelector('svg')!;
}

/**
 * **Das Bild ist der Teil der Seite, den man nicht lesen muss** — und damit
 * der, an dem ein Fehler am längsten unbemerkt bleibt: Eine Stelle, die im
 * Bild fehlt, ist ein Knopf, der beim Drücken nichts tut, und genau das soll
 * die Seite über das *Pad* aussagen und nicht über sich selbst. Also wird
 * nachgezählt, dass jede Nummer der Tabelle im Bild eine Stelle hat.
 */
describe('Das Bild des Controllers', () => {
  it('hat für jede Stelle der Tabelle genau eine Form', () => {
    const svg = draw();
    for (const spec of PAD_BUTTONS) {
      const keys = svg.querySelectorAll(`[data-slot="${spec.slot}"]`);
      expect(keys).toHaveLength(1);
    }
    // Und keine Form, die zu keiner Nummer gehört: Was leuchtet, muss einen
    // Knopf haben, den man drücken kann.
    const slots = [...svg.querySelectorAll('[data-slot]')].map((key) =>
      key.getAttribute('data-slot'),
    );
    expect(slots.sort()).toEqual(PAD_BUTTONS.map((spec) => spec.slot).sort());
  });

  it('trägt die Aufschrift des Geräts, das in der Hand liegt', () => {
    // Dasselbe Bild, drei Marken: Was wechselt, sind die Zeichen darauf.
    expect(draw('playstation').textContent).toContain('✕');
    expect(draw('playstation').textContent).toContain('△');
    expect(draw('xbox').textContent).toContain('A');
    expect(draw('xbox').textContent).toContain('LB');
    expect(draw('nintendo').textContent).toContain('ZR');
  });

  it('lässt leuchten, was anliegt — und hört damit auch wieder auf', () => {
    const svg = draw();
    const down = (): string[] =>
      [...svg.querySelectorAll('.is-down')].map((key) => key.getAttribute('data-slot')!).sort();

    showPressedSlots(svg, ['face-down', 'dpad-left']);
    expect(down()).toEqual(['dpad-left', 'face-down']);

    // Der Fehler, den diese Seite aufdecken soll, nur bei ihr selbst: ein
    // Knopf, der leuchten bleibt, nachdem man ihn losgelassen hat.
    showPressedSlots(svg, ['face-down']);
    expect(down()).toEqual(['face-down']);
    showPressedSlots(svg, []);
    expect(down()).toEqual([]);

    // Ein `null` ist keine Stelle (Knopf 18 eines Adapters) und lässt nichts
    // leuchten, statt irgendetwas zu treffen.
    showPressedSlots(svg, [null]);
    expect(down()).toEqual([]);
  });

  it('schiebt die Sticks dorthin, wo sie stehen — und nicht weiter', () => {
    const svg = draw();
    const at = (side: string): string =>
      svg.querySelector(`[data-stick="${side}"]`)!.getAttribute('transform')!;

    showSticks(svg, { x: 1, y: 0 }, { x: 0, y: -1 });
    expect(at('left')).toBe('translate(7.00 0.00)');
    // `+y` ist unten, so wie das API zählt: nach oben gedrückt ist negativ,
    // und der Knopf wandert im Bild nach oben. Ein Vorzeichen zu viel sieht
    // man nur an einem Stick, den man selbst in der Hand hat.
    expect(at('right')).toBe('translate(0.00 -7.00)');

    // Diagonal ganz ausgelenkt meldet mancher Treiber 1,41 — der Knopf darf
    // trotzdem nicht aus seiner Pfanne fallen.
    showSticks(svg, { x: 1.41, y: 1.41 }, { x: Number.NaN, y: 0 });
    expect(at('left')).toBe('translate(7.00 7.00)');
    expect(at('right')).toBe('translate(0.00 0.00)');
  });
});
