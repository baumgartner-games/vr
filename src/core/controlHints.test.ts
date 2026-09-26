import { controlHints, hintDevice, hintText, type HintContext } from './controlHints';
import { bindKey, bindPad, defaultInputConfig } from './inputMap';

const base: HintContext = {
  device: 'pad',
  view: 'firstPerson',
  menu: null,
  tools: false,
  useCandidate: false,
  carrying: false,
  armed: false,
  canJump: true,
  padKind: 'xbox',
  config: defaultInputConfig(),
};

describe('controlHints — die Tastenhilfe', () => {
  it('sagt am Pad das Schema: A, Ansicht, Menü', () => {
    expect(hintText(controlHints(base))).toBe('A Springen · ⊟ Ansicht · ☰ Menü');
  });

  it('nennt A Benutzen, sobald etwas in Reichweite steht, und B, wenn etwas getragen wird', () => {
    const line = hintText(controlHints({ ...base, useCandidate: true, carrying: true }));
    expect(line).toContain('A Benutzen');
    expect(line).toContain('B Ablegen');
  });

  it('zeigt im Menü Bestätigen und Zurück — dieselben Knöpfe wie im Spiel', () => {
    expect(hintText(controlHints({ ...base, menu: 'menu' }))).toBe(
      '✥ Wählen · A OK · B Zurück · LB/RB Seite · ☰ Schließen',
    );
  });

  it('schreibt die Aufschrift der Marke', () => {
    const line = hintText(controlHints({ ...base, padKind: 'playstation', menu: 'menu' }));
    expect(line).toContain('✕ OK');
    expect(line).toContain('○ Zurück');
  });

  it('folgt der Belegung und nicht der Voreinstellung', () => {
    const config = bindPad(defaultInputConfig(), 'use', 'face-left');
    expect(hintText(controlHints({ ...base, config }))).toContain('X Springen');
    const keys = bindKey(defaultInputConfig(), 'menu', 'KeyQ');
    expect(hintText(controlHints({ ...base, device: 'keyboard', config: keys }))).toContain(
      'Q Menü',
    );
  });

  it('kennt von oben den Auslöser und den Zoom, aus den Augen das Zielen', () => {
    const top = hintText(controlHints({ ...base, view: 'topDown' }));
    expect(top).toContain('RT Auslösen');
    expect(top).toContain('LB/RB Zoom');
    const eye = hintText(controlHints({ ...base, armed: true }));
    expect(eye).toContain('LT Zielen');
  });

  it('spricht an der Tastatur von Tasten', () => {
    const line = hintText(controlHints({ ...base, device: 'keyboard', tools: true }));
    expect(line).toBe('Leertaste Springen · Tab Werkzeug · V Ansicht · M Menü');
    expect(hintText(controlHints({ ...base, device: 'keyboard', view: 'crane' }))).toContain(
      'WASD Kamera',
    );
  });

  it('bleibt am Glas im Menü still', () => {
    expect(controlHints({ ...base, device: 'touch', menu: 'menu' })).toEqual([]);
    expect(hintText(controlHints({ ...base, device: 'touch' }))).toBe('A Springen');
  });

  it('verspricht auf dem Zellgitter kein Springen — an keinem Gerät', () => {
    const grid = { ...base, canJump: false };
    expect(hintText(controlHints(grid))).toBe('⊟ Ansicht · ☰ Menü');
    expect(hintText(controlHints({ ...grid, useCandidate: true }))).toContain('A Benutzen');
    expect(hintText(controlHints({ ...grid, device: 'keyboard', tools: true }))).toBe(
      'Tab Werkzeug · V Ansicht · M Menü',
    );
    expect(controlHints({ ...grid, device: 'touch' })).toEqual([]);
    expect(hintText(controlHints({ ...grid, device: 'touch', useCandidate: true }))).toBe(
      'A Benutzen',
    );
  });
});

/**
 * **Die Sonderzonen** (`HintZone`): Kart, Restaurant, Baukasten und die
 * Station sagen, was dort anders ist — einheitlich: vorn das Schildchen, dann
 * die Knöpfe, zuletzt das Menü.
 */
describe('controlHints — die Sonderzonen', () => {
  const keyboard = { ...base, device: 'keyboard' as const };

  it('sagt im Kart, wie man fährt und aussteigt — am Pad und an der Tastatur', () => {
    expect(hintText(controlHints({ ...base, zone: { kind: 'kart' } }))).toBe(
      '[Kart] · RT Gas · LT Bremse · LS Lenken · A halten Aussteigen · ☰ Menü',
    );
    expect(hintText(controlHints({ ...keyboard, zone: { kind: 'kart' } }))).toBe(
      '[Kart] · W Gas · S Bremse · A/D Lenken · E halten Aussteigen · M Menü',
    );
  });

  it('sagt im Restaurant Nehmen, Ablegen und die Glocke', () => {
    const burger = (holding: boolean, closed: boolean, useCandidate: boolean): string =>
      hintText(controlHints({ ...base, useCandidate, zone: { kind: 'burger', holding, closed } }));
    expect(burger(false, false, true)).toBe('[Restaurant] · A Nehmen · ☰ Menü');
    expect(burger(true, false, true)).toBe('[Restaurant] · A Ablegen · ☰ Menü');
    expect(burger(false, true, false)).toBe('[Restaurant] · A Glocke läuten · ☰ Menü');
    // Nichts in Reichweite: Die Zeile sagt, wo `A` etwas tut.
    expect(burger(true, false, false)).toBe('[Restaurant] · A an Platte/Tisch: Ablegen · ☰ Menü');
    // Von oben kommt das Drehen des Bildes dazu.
    const top = hintText(
      controlHints({
        ...keyboard,
        view: 'topDown',
        useCandidate: true,
        zone: { kind: 'burger', holding: false, closed: false },
      }),
    );
    expect(top).toBe('[Restaurant] · E Nehmen · Q Bild drehen · M Menü');
  });

  it('nennt im Baukasten das Werkzeug und wie man es wechselt', () => {
    const pad = hintText(
      controlHints({ ...base, view: 'crane', zone: { kind: 'build', tool: 'move' } }),
    );
    expect(pad).toBe(
      '[Baukasten: Verschieben] · A Nehmen/Stellen · ▲/▼ Werkzeug · RS Drehen · ◀/▶ Bild drehen · LB/RB Zoom · ☰ Menü',
    );
    const keys = hintText(
      controlHints({ ...keyboard, view: 'crane', zone: { kind: 'build', tool: 'erase' } }),
    );
    expect(keys).toBe(
      '[Baukasten: Löschen] · Klick Löschen · R Drehen · Q Bild drehen · Strg+Z Rückgängig · M Menü',
    );
  });

  it('richtet sich auf der Station nach der Rolle', () => {
    const role = (
      r: 'technician' | 'monster' | 'map' | 'watch',
      device: 'pad' | 'keyboard' | 'touch' = 'keyboard',
    ): string => hintText(controlHints({ ...base, device, zone: { kind: 'haunting', role: r } }));
    expect(role('technician')).toBe(
      '[Station: Techniker] · 1 Sensor · 2 Lampe/Medkit · Strg Ducken · M Menü',
    );
    expect(role('monster', 'pad')).toBe('[Station: Monster] · LS Jagen · A Klappe/Tür · ☰ Menü');
    expect(role('map', 'touch')).toBe('[Station: Karte] · Finger Karte bedienen');
    expect(role('watch')).toBe('[Station: Zuschauer] · Klick Platz wählen · M Menü');
  });

  it('weicht dem Menü: Im offenen Menü gilt die Zeile des Menüs', () => {
    expect(hintText(controlHints({ ...base, menu: 'menu', zone: { kind: 'kart' } }))).toBe(
      '✥ Wählen · A OK · B Zurück · LB/RB Seite · ☰ Schließen',
    );
  });

  it('folgt auch in einer Zone der Belegung', () => {
    const config = bindPad(defaultInputConfig(), 'fire', 'shoulder-right');
    const line = hintText(controlHints({ ...base, config, zone: { kind: 'kart' } }));
    expect(line).toContain('RB Gas');
  });

  it('nennt von oben das Drehen des Bildes', () => {
    expect(hintText(controlHints({ ...base, view: 'topDown' }))).toContain('◀/▶ Bild drehen');
    expect(hintText(controlHints({ ...keyboard, view: 'topDown' }))).toContain('Q Bild drehen');
    expect(hintText(controlHints(base))).not.toContain('Bild drehen');
  });
});

describe('hintDevice — welches Gerät die Zeile anspricht', () => {
  it('spricht das Glas an, solange die Stöcke dastehen', () => {
    expect(hintDevice('keyboard', true)).toBe('touch');
    expect(hintDevice('touch', true)).toBe('touch');
    // Ein Pad bleibt ein Pad — und ohne Stöcke gilt das zuletzt benutzte Gerät.
    expect(hintDevice('pad', true)).toBe('pad');
    expect(hintDevice('keyboard', false)).toBe('keyboard');
    expect(hintDevice('touch', false)).toBe('touch');
  });
});
