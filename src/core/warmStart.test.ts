import {
  LOADING_NOTE,
  mayWarm,
  mayWarmStep,
  nextWarmStep,
  startButton,
  WARM_ORDER,
  type WarmSignals,
} from './warmStart';

/** Eine Lage, in der gewärmt werden darf — Schreibtisch, Tab vorn, nichts los. */
const ruhig: WarmSignals = { hidden: false, busy: false };

describe('mayWarm', () => {
  it('wärmt, wenn nichts dagegen spricht', () => {
    expect(mayWarm(ruhig)).toBe(true);
  });

  // Die Bedingung, die einen Abend gekostet hat: Auf `#haunting` steht eine
  // Lobby, und die Welt liest die Rolle beim Aufbau aus dem Speicher. Eine
  // vorgewärmte Runde steht mit der falschen Rolle da — und hat sich obendrein
  // schon einen Raum genommen, bevor die Lobby ihren kennt. Der Rauchtest sah
  // das als eine Einsatzzentrale, die nie kam.
  it('wärmt nichts hinter einer Lobby', () => {
    expect(mayWarm({ ...ruhig, lobby: true })).toBe(false);
    expect(nextWarmStep([], { ...ruhig, lobby: true })).toBeNull();
    expect(nextWarmStep(['welt'], { ...ruhig, lobby: true })).toBeNull();
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

describe('startButton', () => {
  it('ist stumpf, solange die Welt unterwegs ist', () => {
    expect(startButton(ruhig, 'lädt')).toEqual({
      disabled: true,
      note: LOADING_NOTE,
      busy: true,
    });
  });

  // Gewärmt wird gleich — der Knopf steht schon stumpf da, bevor der Leerlauf
  // kommt, statt eine Sekunde lang eine Bedienbarkeit zu behaupten.
  it('ist auch stumpf, wenn gleich gewärmt wird', () => {
    expect(startButton(ruhig, 'ruht').disabled).toBe(true);
    expect(startButton(ruhig, 'ruht').note).toBe(LOADING_NOTE);
  });

  it('gibt ihn frei, sobald die Welt samt Startladung steht', () => {
    expect(startButton(ruhig, 'steht')).toEqual({ disabled: false, note: '', busy: false });
  });

  // Die wichtigste Bedingung dieser Rechnung: Wo nicht gewärmt wird, wartet
  // der Knopf auf nichts — sonst wäre „Daten sparen" ein toter Knopf.
  it('bleibt bedienbar, wo gar nicht vorgewärmt wird', () => {
    for (const signals of [
      { ...ruhig, saveData: true },
      { ...ruhig, effectiveType: '2g' },
      { ...ruhig, effectiveType: 'slow-2g' },
      { ...ruhig, hidden: true },
    ] satisfies WarmSignals[]) {
      const state = startButton(signals, 'ruht');
      expect(state.disabled).toBe(false);
      expect(state.note).not.toBe('');
      // Und der Balken läuft dabei **nicht**: Es lädt ja niemand.
      expect(state.busy).toBe(false);
    }
  });

  // Ein Deckel, der nur die Wartezeit begrenzte, aber den Knopf stumpf ließe,
  // wäre kein Deckel.
  it('gibt ihn nach dem Deckel frei und sagt, dass noch geladen wird', () => {
    const state = startButton(ruhig, 'dauert');
    expect(state.disabled).toBe(false);
    expect(state.note).toMatch(/lädt noch/);
    expect(state.busy).toBe(true);
  });

  // Ohne Netz und ohne früheren Besuch: Die Ladung scheitert. Kein Deadlock —
  // der Knopf darf es noch einmal versuchen.
  it('lässt eine Welt, die nicht kam, noch einmal anfordern', () => {
    const state = startButton(ruhig, 'fehlt');
    expect(state.disabled).toBe(false);
    expect(state.note).not.toBe('');
    expect(state.busy).toBe(false);
  });

  // Hinter einer Lobby wird nichts vorgewärmt, und der Knopf dort ist ein
  // anderer (`#haunt-enter`). Also ist hier auch nichts zu sagen.
  it('sagt hinter einer Lobby gar nichts', () => {
    for (const phase of ['ruht', 'lädt', 'steht', 'fehlt'] as const) {
      expect(startButton({ ...ruhig, lobby: true }, phase)).toEqual({
        disabled: false,
        note: '',
        busy: false,
      });
    }
  });
});
