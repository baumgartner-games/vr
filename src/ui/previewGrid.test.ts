import { PREVIEW_RETRY, PreviewLedger, previewSlot, type Rect } from './previewGrid';

/**
 * **Die Buchführung hinter den drehenden Modellen im Raster der Seite.**
 *
 * Was hier geprüft wird, ist genau das, was man in einem Browser erst
 * bemerkt, wenn es zu spät ist: eine Kachel, die weggescrollt ist und trotzdem
 * lädt; ein `null` der Modellfabrik, das als „gibt es nicht" abgelegt wird und
 * das Fach für immer leer lässt; ein Ordner, den man verlässt und der seine
 * Modelle behält, bis der Speicher voll ist. Drei Fehler, drei Tests.
 */

function rect(left: number, top: number, width: number, height: number): Rect {
  return { left, top, width, height };
}

/** Die Liste: 360 breit, 500 hoch, am Punkt (10, 100) des Fensters. */
const list = rect(10, 100, 360, 500);

describe('previewSlot', () => {
  it('gibt die Mitte der Kachel, gemessen von der linken oberen Ecke der Liste', () => {
    expect(previewSlot(list, rect(20, 120, 160, 160))).toEqual({ x: 90, y: 100, size: 160 });
  });

  it('nimmt die kürzere Kante als Maß — das Modell soll quadratisch stehen', () => {
    expect(previewSlot(list, rect(10, 100, 200, 120))?.size).toBe(120);
  });

  it('gibt einer halb weggescrollten Kachel ihren Platz — abgeschnitten wird am Rand', () => {
    // Zu drei Vierteln über dem Rand der Liste: Die Mitte liegt damit vor dem
    // Nullpunkt, und genau so gehört sie auf die Leinwand — den Rest
    // schneidet die Leinwand ab.
    expect(previewSlot(list, rect(20, 0, 160, 160))).toEqual({ x: 90, y: -20, size: 160 });
  });

  it('gibt `null`, sobald die Kachel ganz aus dem Bild ist', () => {
    expect(previewSlot(list, rect(20, -200, 160, 160))).toBeNull();
    expect(previewSlot(list, rect(20, 600, 160, 160))).toBeNull();
    expect(previewSlot(list, rect(400, 120, 160, 160))).toBeNull();
  });

  it('gibt `null`, solange noch nichts gemessen ist', () => {
    expect(previewSlot(list, rect(20, 120, 0, 0))).toBeNull();
    expect(previewSlot(rect(0, 0, 0, 0), rect(20, 120, 160, 160))).toBeNull();
  });
});

describe('PreviewLedger', () => {
  it('fragt nach einem `null` erst wieder, wenn die Wartezeit um ist', () => {
    const book = new PreviewLedger();
    expect(book.due('a', 0)).toBe(true);
    book.missed('a', 0);
    expect(book.due('a', 0.2)).toBe(false);
    expect(book.due('a', PREVIEW_RETRY)).toBe(true);
  });

  it('merkt sich ein `null` nicht als Absage — sonst bliebe das Fach für immer leer', () => {
    const book = new PreviewLedger();
    book.missed('a', 0);
    book.missed('a', PREVIEW_RETRY);
    // Auch nach dem zweiten vergeblichen Versuch wird wieder gefragt.
    expect(book.due('a', 2 * PREVIEW_RETRY)).toBe(true);
    book.got('a');
    expect(book.has('a')).toBe(true);
    // Wer eines hat, wird nicht mehr gefragt.
    expect(book.due('a', 99)).toBe(false);
  });

  it('gibt her, was aus dem Bild gescrollt ist', () => {
    const book = new PreviewLedger();
    book.turnTo('ordner');
    for (const id of ['a', 'b', 'c']) book.got(id);
    expect(book.keepOnly(['a', 'c'])).toEqual(['b']);
    expect(book.size).toBe(2);
    expect(book.has('b')).toBe(false);
    // Und es wird wieder gefragt, wenn dieselbe Kachel zurückscrollt.
    expect(book.due('b', 0)).toBe(true);
  });

  it('vergisst auch die vergeblichen Fragen zu dem, was nicht mehr dasteht', () => {
    const book = new PreviewLedger();
    book.missed('weg', 0);
    book.keepOnly([]);
    // Ohne diese Zeile wüchse die Merkliste mit jedem Blättern.
    expect(book.due('weg', 0.1)).toBe(true);
  });

  it('gibt beim Seitenwechsel alles her — und bei derselben Seite nichts', () => {
    const book = new PreviewLedger();
    book.turnTo('kaykit:forest');
    book.got('a');
    book.got('b');
    expect(book.turnTo('kaykit:forest')).toEqual([]);
    expect(book.turnTo('kaykit:dungeon').sort()).toEqual(['a', 'b']);
    expect(book.size).toBe(0);
    expect(book.has('a')).toBe(false);
  });
});
