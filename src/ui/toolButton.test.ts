/** @jest-environment jsdom */
import { HAND_LABEL, ToolButton, toolEntries } from './ToolButton';
import type { ToolChoice } from '../core/types';

/**
 * **Der Werkzeug-Knopf und seine Liste** (`ui/ToolButton.ts`, `#hud-tool`).
 *
 * Geprüft wird, was am Telefon sonst erst auffällt, wenn es zu spät ist: dass
 * die **Hand** die erste Zeile ist und `null` meint, dass der Punkt an der
 * Zeile steht, die wirklich in der Hand liegt, und dass ein Tipp die Wahl
 * weitergibt statt nur die Seite umzublättern.
 */
function choice(current: string | null = 'pistol'): ToolChoice & { picked: Array<string | null> } {
  const picked: Array<string | null> = [];
  return {
    current,
    picked,
    options: [
      { id: 'pistol', label: 'Pistole', icon: 'pistol', accent: 0xff8844 },
      { id: 'gun-blue', label: 'Portal-Waffe blau' },
    ],
    choose(id) {
      picked.push(id);
    },
  };
}

function button(): { el: HTMLButtonElement; presses: number[] } {
  const el = document.createElement('button');
  el.id = 'hud-tool';
  document.body.append(el);
  return { el, presses: [] };
}

describe('Die Werkzeugliste am Bildschirm', () => {
  it('stellt die Hand voran und markiert, was in der Hand liegt', () => {
    const pick = choice('pistol');
    const entries = toolEntries(pick, (id) => pick.choose(id));

    expect(entries.map((entry) => entry.label)).toEqual([
      HAND_LABEL,
      'Pistole',
      'Portal-Waffe blau',
    ]);
    expect(entries[0]!.icon).toBe('hand');
    expect(entries[0]!.selected).toBe(false);
    expect(entries[1]!.selected).toBe(true);
    // Ohne eigene Ikone bleibt es beim Werkzeug-Zeichen statt bei gar nichts.
    expect(entries[2]!.icon).toBe('tools');
  });

  it('meldet die leere Hand als `null`', () => {
    const pick = choice(null);
    const entries = toolEntries(pick, (id) => pick.choose(id));
    expect(entries[0]!.selected).toBe(true);

    entries[0]!.run?.(null);
    entries[2]!.run?.(null);
    expect(pick.picked).toEqual([null, 'gun-blue']);
  });

  it('zeigt am Knopf, was gewählt ist, und ruft beim Tippen zurück', () => {
    const { el } = button();
    let presses = 0;
    const tool = new ToolButton(el, () => presses++);

    // Ab Werk die offene Hand — auch das ist eine Wahl und kein Fehlen.
    expect(el.getAttribute('aria-label')).toBe(`Werkzeug: ${HAND_LABEL}`);
    expect(el.querySelector('canvas')).not.toBeNull();

    tool.set('pistol', 'Pistole');
    expect(el.getAttribute('aria-label')).toBe('Werkzeug: Pistole');

    el.click();
    expect(presses).toBe(1);

    tool.show(false);
    expect(el.hidden).toBe(true);
    tool.show(true);
    expect(el.hidden).toBe(false);

    tool.setOpen(true);
    expect(el.getAttribute('aria-expanded')).toBe('true');

    // Nach dem Abräumen tut ein Klick nichts mehr — der Knopf gehört der
    // Seite und überlebt jeden Weltwechsel.
    tool.dispose();
    el.click();
    expect(presses).toBe(1);
    expect(el.querySelector('canvas')).toBeNull();
  });
});
