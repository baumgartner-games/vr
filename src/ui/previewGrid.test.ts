import {
  PREVIEW_OVERSCAN,
  PREVIEW_RETRY,
  PreviewLedger,
  previewSheet,
  previewSlot,
  type ListView,
  type Rect,
  type Sheet,
} from './previewGrid';

/**
 * **Die Buchführung hinter den drehenden Modellen im Raster der Seite.**
 *
 * Was hier geprüft wird, ist genau das, was man in einem Browser erst
 * bemerkt, wenn es zu spät ist: eine Kachel, die weggescrollt ist und trotzdem
 * lädt; ein `null` der Modellfabrik, das als „gibt es nicht" abgelegt wird und
 * das Fach für immer leer lässt; ein Ordner, den man verlässt und der seine
 * Modelle behält, bis der Speicher voll ist. Drei Fehler, drei Tests.
 *
 * Dazu die Rechnung, an der das Nachlaufen hing: Die Leinwand ist ein
 * **Blatt** im scrollenden Kasten, und ein Modell steht auf diesem Blatt an
 * einer Stelle, die sich beim Scrollen **nicht** ändert. Genau das prüft der
 * erste Block — dieselbe Kachel, zweimal gescrollt, dieselbe Stelle.
 */

function rect(left: number, top: number, width: number, height: number): Rect {
  return { left, top, width, height };
}

/** Die Liste: 360 breit, 500 hoch, am Punkt (10, 100) des Fensters. */
const list = rect(10, 100, 360, 500);

/** Der Kasten in Ruhe, mit einem Inhalt von 3000 Bildpunkten. */
function view(scrollTop = 0, content = 3000): ListView {
  return { rect: list, scrollTop, content };
}

/** Das Blatt, das zu diesem Stand gehört. */
function sheetAt(scrollTop: number, content = 3000): Sheet {
  return previewSheet(view(scrollTop, content), null);
}

describe('previewSheet', () => {
  it('spannt den sichtbaren Ausschnitt plus Rand — oben wie unten', () => {
    // 500 hoch, 40 % Rand: 200 oben, 200 unten, macht 900.
    expect(sheetAt(1000)).toEqual({ top: 800, height: 900 });
  });

  it('bleibt am Anfang und am Ende im Inhalt', () => {
    expect(sheetAt(0)).toEqual({ top: 0, height: 900 });
    expect(sheetAt(2500)).toEqual({ top: 2100, height: 900 });
  });

  it('nimmt den ganzen Inhalt, wenn er kürzer ist als Ausschnitt und Rand', () => {
    // Zwölf Kacheln statt sechzig: Dann hängt das Blatt nie um.
    expect(previewSheet(view(0, 700), null)).toEqual({ top: 0, height: 700 });
    expect(previewSheet(view(200, 700), null)).toEqual({ top: 0, height: 700 });
  });

  it('bleibt hängen, solange der Ausschnitt nicht an den Rand kommt', () => {
    const hanging = sheetAt(1000);
    // Ein halber Rand Spiel: Wer bei jedem Bild umhängt, schreibt bei jedem
    // Bild eine neue Verschiebung in den Stil.
    expect(previewSheet(view(1050), hanging)).toBe(hanging);
    expect(previewSheet(view(950), hanging)).toBe(hanging);
    const moved = previewSheet(view(1400), hanging);
    expect(moved).not.toBe(hanging);
    expect(moved.top).toBe(1200);
  });

  it('hängt um, wenn sich die Höhe des Kastens ändert', () => {
    const hanging = sheetAt(1000);
    const taller: ListView = { rect: rect(10, 100, 360, 600), scrollTop: 1000, content: 3000 };
    expect(previewSheet(taller, hanging).height).toBe(600 * (1 + 2 * PREVIEW_OVERSCAN));
  });
});

describe('previewSlot', () => {
  it('gibt die Mitte der Kachel, gemessen von der linken oberen Ecke des Blattes', () => {
    expect(previewSlot(view(), sheetAt(0), rect(20, 120, 160, 160))).toEqual({
      x: 90,
      y: 100,
      size: 160,
    });
  });

  it('lässt dieselbe Kachel beim Scrollen an ihrer Stelle stehen', () => {
    // **Der Fehler, um den es geht.** Die Kachel wandert im Fenster nach
    // oben, weil gescrollt wird; auf dem Blatt darf sie sich nicht bewegen,
    // denn das Blatt wandert mit.
    const sheet = sheetAt(0);
    const still = previewSlot(view(0), sheet, rect(20, 400, 160, 160));
    const scrolled = previewSlot(view(120), sheet, rect(20, 280, 160, 160));
    expect(scrolled).toEqual(still);
  });

  it('rechnet mit, wenn das Blatt umgehängt wurde', () => {
    const sheet = sheetAt(1000);
    // Kachel ganz oben im Ausschnitt, Blatt 200 darüber verankert.
    expect(previewSlot(view(1000), sheet, rect(20, 100, 160, 160))?.y).toBe(280);
  });

  it('nimmt die kürzere Kante als Maß — das Modell soll quadratisch stehen', () => {
    expect(previewSlot(view(), sheetAt(0), rect(10, 100, 200, 120))?.size).toBe(120);
  });

  it('gibt einer halb weggescrollten Kachel ihren Platz — abgeschnitten wird am Kasten', () => {
    // Zu drei Vierteln über dem Rand der Liste: Sie bekommt ihren Platz auf
    // dem Blatt, und der scrollende Kasten schneidet ab, was darüber steht.
    expect(previewSlot(view(), sheetAt(0), rect(20, 0, 160, 160))).toEqual({
      x: 90,
      y: -20,
      size: 160,
    });
  });

  it('gibt `null`, sobald die Kachel ganz aus dem Bild ist', () => {
    const sheet = sheetAt(0);
    expect(previewSlot(view(), sheet, rect(20, -200, 160, 160))).toBeNull();
    expect(previewSlot(view(), sheet, rect(20, 600, 160, 160))).toBeNull();
    expect(previewSlot(view(), sheet, rect(400, 120, 160, 160))).toBeNull();
  });

  it('gibt `null`, solange noch nichts gemessen ist', () => {
    const sheet = sheetAt(0);
    expect(previewSlot(view(), sheet, rect(20, 120, 0, 0))).toBeNull();
    expect(
      previewSlot(
        { rect: rect(0, 0, 0, 0), scrollTop: 0, content: 0 },
        sheet,
        rect(20, 120, 160, 160),
      ),
    ).toBeNull();
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
