import { ASSET_HASHES, assetHashOf, versioned, versionedWith } from './assetVersion';

/**
 * **Die Prüfsumme an einer Adresse**, nachgerechnet.
 *
 * Der Fehler, gegen den diese Datei steht, war im Bild zu sehen und nirgends
 * sonst: Ein Feuerlöscher stand auf einem Hocker, den es im Repository seit
 * zwei Builds nicht mehr gibt. Schuld war kein Katalog, sondern ein Speicher —
 * der Service Worker beantwortet feste Dateinamen aus dem Cache und sieht erst
 * **danach** im Netz nach (`core/swRoutes.ts`, `revalidate`).
 *
 * Der **zweite** Fehler stand ein halbes Jahr später daneben und war teurer:
 * In der Adresse hing die **Build-Nummer**, also hing dort bei jedem Deploy
 * etwas Neues — 3,7 MB Töne und Modelle gingen nach jeder Korrektur eines
 * Kommentars noch einmal über die Leitung. Seither hängt dort die Prüfsumme
 * des **Inhalts**, und die beiden Zusagen dieser Datei sind: **Gleicher
 * Inhalt, gleiche Adresse** — und **kein Verzeichnis, keine Adresse mit `?v=`**.
 *
 * In Jest gibt es kein Verzeichnis (`__ASSET_HASHES__` setzt Vite beim Bauen
 * ein), und deshalb bekommt jede Prüfung, die eines braucht, ihres von Hand.
 */

/** Ein Verzeichnis, wie der Build es schreibt: Pfad unter `public/` → Prüfsumme. */
const HASHES = {
  'models/kitchen.glb': 'x7Kp2Qa1',
  'models/diner.glb': 'Ab9_2cQ4',
  'audio/kitchen/pick-0.ogg': 'Zz-11abc',
};

describe('ohne Verzeichnis wird nichts gestempelt', () => {
  it('lässt in Jest jede Adresse in Ruhe', () => {
    expect(ASSET_HASHES).toEqual({});
    expect(versioned('models/kitchen.glb')).toBe('models/kitchen.glb');
    expect(versioned('audio/kitchen/pick-0.ogg?x=1')).toBe('audio/kitchen/pick-0.ogg?x=1');
  });

  /**
   * Und das ist die sichere Seite, nicht die bequeme: Eine Datei **ohne** `?v=`
   * wird nachgeholt (`revalidate`), eine mit **falschem** `?v=` läge unter
   * einem Namen im Speicher, den niemand mehr anfragt.
   */
  it('stempelt auch nicht, was der Build gar nicht kennt', () => {
    expect(versionedWith('https://x.test/vr/controllers/left.glb', HASHES)).toBe(
      'https://x.test/vr/controllers/left.glb',
    );
    expect(versionedWith('https://x.test/vr/models/kaykit/index.json', HASHES)).toBe(
      'https://x.test/vr/models/kaykit/index.json',
    );
  });
});

describe('die Prüfsumme hinter einer Adresse', () => {
  /**
   * Gesucht wird über das **Ende** der Adresse: Der Schlüssel ist ein Pfad
   * unter `public/`, und unter welcher Basis die Seite läuft, weiß erst der
   * Browser — `/vr/` auf GitHub Pages, `/` daheim.
   */
  it('findet die Datei unter jeder Basis', () => {
    expect(assetHashOf('https://x.test/vr/models/kitchen.glb', HASHES)).toBe('x7Kp2Qa1');
    expect(assetHashOf('http://localhost:5173/models/kitchen.glb', HASHES)).toBe('x7Kp2Qa1');
    expect(assetHashOf('/models/kitchen.glb', HASHES)).toBe('x7Kp2Qa1');
    expect(assetHashOf('models/kitchen.glb', HASHES)).toBe('x7Kp2Qa1');
  });

  it('lässt sich von einer Query nicht beirren', () => {
    expect(assetHashOf('https://x.test/vr/models/diner.glb?v=alt', HASHES)).toBe('Ab9_2cQ4');
    expect(assetHashOf('https://x.test/vr/models/diner.glb#teil', HASHES)).toBe('Ab9_2cQ4');
  });

  it('kennt nicht, was nicht darin steht', () => {
    expect(assetHashOf('https://x.test/vr/manifest.webmanifest', HASHES)).toBeUndefined();
    // Und auch nicht eine Datei, deren Name nur *endet* wie ein Schlüssel:
    // Der Trennstrich gehört zum Vergleich.
    expect(assetHashOf('https://x.test/vr/models/zweitekitchen.glb', HASHES)).toBeUndefined();
  });
});

describe('die Adresse mit Prüfsumme', () => {
  it('hängt sie mit ? oder & an, je nach Adresse', () => {
    expect(versionedWith('https://x.test/vr/models/kitchen.glb', HASHES)).toBe(
      'https://x.test/vr/models/kitchen.glb?v=x7Kp2Qa1',
    );
    expect(versionedWith('https://x.test/vr/audio/kitchen/pick-0.ogg?x=1', HASHES)).toBe(
      'https://x.test/vr/audio/kitchen/pick-0.ogg?x=1&v=Zz-11abc',
    );
  });

  /**
   * **Und dieselbe Datei bekommt zweimal dieselbe Adresse.** Das ist die ganze
   * Ersparnis dieses Umbaus, in einer Zeile: Ein zweiter Build mit demselben
   * Inhalt fragt nicht nach einem neuen Namen, also holt kein Telefon etwas
   * noch einmal.
   */
  it('bleibt gleich, solange die Datei gleich bleibt', () => {
    const vorher = versionedWith('/models/kitchen.glb', HASHES);
    const nachher = versionedWith('/models/kitchen.glb', { ...HASHES });
    expect(nachher).toBe(vorher);
    // Ändert sich die Datei, ändert sich die Adresse — und nur dann.
    const geändert = versionedWith('/models/kitchen.glb', {
      ...HASHES,
      'models/kitchen.glb': 'neu12345',
    });
    expect(geändert).not.toBe(vorher);
  });
});
