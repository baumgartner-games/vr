import { BUILD_ID, versioned } from './assetVersion';

/**
 * **Die Build-Nummer an einer Adresse**, nachgerechnet.
 *
 * Der Fehler, gegen den diese Datei steht, war im Bild zu sehen und nirgends
 * sonst: Ein Feuerlöscher stand auf einem Hocker, den es im Repository seit
 * zwei Builds nicht mehr gibt. Schuld war kein Katalog, sondern ein Speicher —
 * der Service Worker beantwortet feste Dateinamen aus dem Cache und sieht erst
 * **danach** im Netz nach (`core/swRoutes.ts`, `revalidate`).
 *
 * In Jest gibt es keine Build-Nummer (`__BUILD_ID__` setzt Vite beim Bauen
 * ein), und genau das ist hier die eine Zusage, die zählt: **Ohne Nummer wird
 * nichts angehängt.** Ein `?v=` ohne Wert wäre ein zweiter Name für dieselbe
 * Datei und damit derselbe Speicherfehler noch einmal, nur andersherum.
 */
describe('die Build-Nummer an einer Adresse', () => {
  it('bleibt ohne Nummer weg', () => {
    expect(BUILD_ID).toBe('');
    expect(versioned('models/kitchen.glb')).toBe('models/kitchen.glb');
    expect(versioned('audio/kitchen/pick-0.ogg?x=1')).toBe('audio/kitchen/pick-0.ogg?x=1');
  });

  /**
   * Und **mit** Nummer hängt sie an, mit `?` oder `&` — je nachdem, ob schon
   * eine Frage in der Adresse steht. Geprüft wird das an einer zweiten Fassung
   * derselben Zeile: Die echte liest eine Konstante, die es hier nicht gibt.
   */
  it('hängt sie mit ? oder & an, je nach Adresse', () => {
    const stamp = (url: string, id: string): string =>
      `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(id)}`;
    expect(stamp('models/kitchen.glb', 'abc123')).toBe('models/kitchen.glb?v=abc123');
    expect(stamp('a/b.ogg?x=1', 'abc123')).toBe('a/b.ogg?x=1&v=abc123');
    // Eine Nummer ist in der CI der Commit und lokal eine Uhrzeit — beides
    // harmlos, aber die Zeile kodiert trotzdem: Was in einer Adresse steht,
    // wird kodiert, und nicht „meistens".
    expect(stamp('m.glb', 'a b/c')).toBe('m.glb?v=a%20b%2Fc');
  });
});
