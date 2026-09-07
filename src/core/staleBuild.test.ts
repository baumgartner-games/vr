import { isStaleModuleError, shouldReload } from './staleBuild';

describe('isStaleModuleError', () => {
  // Die drei Sätze, die die drei Browser-Familien wirklich schreiben. Sie
  // stehen hier wörtlich, damit ein Tippfehler in der Liste auffällt und nicht
  // erst dann, wenn nach einem Deploy niemand mehr die Welt wechseln kann.
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/MoonWorld-a1b2c3.js',
    'error loading dynamically imported module: https://x/assets/MoonWorld-a1b2c3.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/MoonWorld-a1b2c3.css',
  ])('erkennt "%s"', (message) => {
    expect(isStaleModuleError(new TypeError(message))).toBe(true);
  });

  it('lässt echte Fehler aus der Welt in Ruhe', () => {
    expect(isStaleModuleError(new TypeError('rig.getHeadPosition is not a function'))).toBe(false);
    expect(isStaleModuleError(new Error('WebGL context lost'))).toBe(false);
  });

  it('kommt auch mit dem zurecht, was gar kein Fehler ist', () => {
    expect(isStaleModuleError(null)).toBe(false);
    expect(isStaleModuleError(undefined)).toBe(false);
    expect(isStaleModuleError('Failed to fetch dynamically imported module: x')).toBe(true);
  });
});

describe('shouldReload', () => {
  it('lädt beim ersten Mal neu', () => {
    expect(shouldReload('moon', null)).toBe(true);
  });

  it('aber kein zweites Mal für dieselbe Welt — sonst dreht sich die Seite', () => {
    expect(shouldReload('moon', 'moon')).toBe(false);
  });

  it('eine andere Welt ist ein neuer Versuch wert', () => {
    expect(shouldReload('alps', 'moon')).toBe(true);
  });
});
