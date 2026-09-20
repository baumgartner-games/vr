import { mayWarm, mayWarmStep, nextWarmStep, WARM_ORDER, type WarmSignals } from './warmStart';

/** Eine Lage, in der gewärmt werden darf — Schreibtisch, Tab vorn, nichts los. */
const ruhig: WarmSignals = { hidden: false, busy: false };

describe('mayWarm', () => {
  it('wärmt, wenn nichts dagegen spricht', () => {
    expect(mayWarm(ruhig)).toBe(true);
  });

  // Die wichtigste der Bedingungen: Sie schlägt mitten im Wärmen um, sobald
  // jemand „Beitreten" drückt.
  it('tritt zurück, sobald der Spieler selbst etwas angefordert hat', () => {
    expect(mayWarm({ ...ruhig, busy: true })).toBe(false);
  });

  it('wärmt nichts für einen Tab, den niemand ansieht', () => {
    expect(mayWarm({ ...ruhig, hidden: true })).toBe(false);
  });

  it('nimmt „Daten sparen" als Antwort', () => {
    expect(mayWarm({ ...ruhig, saveData: true })).toBe(false);
  });

  it('lässt zu schmale Leitungen in Ruhe', () => {
    expect(mayWarm({ ...ruhig, effectiveType: '2g' })).toBe(false);
    expect(mayWarm({ ...ruhig, effectiveType: 'slow-2g' })).toBe(false);
    expect(mayWarm({ ...ruhig, effectiveType: '3g' })).toBe(true);
    expect(mayWarm({ ...ruhig, effectiveType: '4g' })).toBe(true);
  });

  // Stand hier einen Nachmittag lang andersherum: Ohne Netz kostet das
  // Wärmen nichts, und genau dann ist es am meisten wert — sonst startet die
  // installierte App im Funkloch und bleibt auf der Startseite stehen,
  // obwohl jedes Modell im Speicher liegt.
  it('wärmt gerade dann, wenn kein Netz da ist', () => {
    expect(mayWarm(ruhig)).toBe(true);
  });

  // Safari kennt `navigator.connection` bis heute nicht. Keine Auskunft heißt
  // „weiß nicht" und nicht „schlecht" — sonst bekämen ausgerechnet iPhone und
  // iPad nie einen warmen Speicher.
  it('deutet fehlende Auskunft nicht als schlechte Leitung', () => {
    expect(mayWarm({ hidden: false, busy: false, saveData: undefined, effectiveType: undefined }));
    expect(mayWarm({ ...ruhig, saveData: undefined, effectiveType: undefined })).toBe(true);
  });
});

describe('mayWarmStep', () => {
  it('holt die Welt auch auf einer mittelmäßigen Leitung', () => {
    expect(mayWarmStep('welt', { ...ruhig, effectiveType: '3g' })).toBe(true);
  });

  // Der Index ist ein Vorrat für ein Menü, das die meisten nie aufklappen.
  it('holt den Regal-Index nur, wo es niemand merkt', () => {
    expect(mayWarmStep('regal', { ...ruhig, effectiveType: '4g' })).toBe(true);
    expect(mayWarmStep('regal', ruhig)).toBe(true);
    expect(mayWarmStep('regal', { ...ruhig, effectiveType: '3g' })).toBe(false);
  });
});

describe('nextWarmStep', () => {
  it('fängt mit der Welt an', () => {
    expect(nextWarmStep([], ruhig)).toBe('welt');
  });

  it('nimmt danach das Regal', () => {
    expect(nextWarmStep(['welt'], ruhig)).toBe('regal');
  });

  it('ist fertig, wenn alles gelaufen ist', () => {
    expect(nextWarmStep([...WARM_ORDER], ruhig)).toBeNull();
  });

  // Wer die Reihenfolge umginge, wärmte den Index eines Regals, während die
  // Welt fehlt.
  it('überspringt nicht: keine Welt, also auch kein Regal', () => {
    expect(nextWarmStep([], { ...ruhig, effectiveType: '3g' })).toBe('welt');
    expect(nextWarmStep(['welt'], { ...ruhig, effectiveType: '3g' })).toBeNull();
  });

  it('hält an, sobald der Spieler selbst lädt', () => {
    expect(nextWarmStep([], { ...ruhig, busy: true })).toBeNull();
    expect(nextWarmStep(['welt'], { ...ruhig, busy: true })).toBeNull();
  });
});
