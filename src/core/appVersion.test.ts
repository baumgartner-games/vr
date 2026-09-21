import { APP_VERSION, versionLine } from './appVersion';

describe('versionLine', () => {
  it('nennt Version und Build', () => {
    expect(versionLine('0.1.1', '96ba100782ea')).toBe('v0.1.1 · Build 96ba100782ea');
  });

  it('lässt weg, was es nicht gibt', () => {
    expect(versionLine('0.1.1', '')).toBe('v0.1.1');
    expect(versionLine('', '96ba100782ea')).toBe('Build 96ba100782ea');
    expect(versionLine('', '')).toBe('');
  });

  /** In Jest gibt es das `define` von Vite nicht — und das ist kein Fehler. */
  it('ist ohne Build leer statt undefiniert', () => {
    expect(APP_VERSION).toBe('');
  });
});
