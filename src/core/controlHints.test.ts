import { controlHints, hintText, type HintContext } from './controlHints';
import { bindKey, bindPad, defaultInputConfig } from './inputMap';

const base: HintContext = {
  device: 'pad',
  view: 'firstPerson',
  menu: null,
  tools: false,
  useCandidate: false,
  carrying: false,
  armed: false,
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
});
