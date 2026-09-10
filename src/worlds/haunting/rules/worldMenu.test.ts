import {
  mayCompute,
  opensFlat,
  ROUND_ORDER,
  startBlocker,
  startedRound,
  startEntries,
  type WorldMenuState,
} from './worldMenu';

/** Der Normalfall, um den es geht: einer mit der Brille auf, allein im Raum. */
function inHeadset(over: Partial<WorldMenuState> = {}): WorldMenuState {
  return {
    role: 'vr',
    immersive: true,
    hostId: 'me',
    me: 'me',
    phase: 'briefing',
    flatWanted: false,
    occupied: false,
    ...over,
  };
}

describe('Das Menü in der Brille', () => {
  it('hat genau einen Eintrag, der die Mission startet — ohne Untermenü', () => {
    const entries = startEntries(inHeadset());
    const starters = entries.filter((entry) => entry.starts === 'mission');
    expect(starters).toHaveLength(1);
    expect(starters[0]!.id).toBe('haunt:start');
    expect(starters[0]!.blocked).toBeNull();
    // Jeder Eintrag ist eine Zeile für sich: Wer die Mission will, drückt einmal.
    expect(entries.every((entry) => entry.starts !== null)).toBe(true);
  });

  it('stellt die Mission an den Anfang, damit sie auf die erste Seite passt', () => {
    expect(ROUND_ORDER).toEqual(['mission', 'test', 'bot']);
    expect(startEntries(inHeadset()).map((entry) => entry.id)).toEqual([
      'haunt:start',
      'haunt:test',
      'haunt:bot-round',
    ]);
  });

  it('startet im Schiff, auch wenn die Checkbox „2D-Welt von oben" angehakt ist', () => {
    // Der eigentliche Fehlerbericht: Die Checkbox gilt für den ganzen Browser,
    // die Karte von oben aber öffnet in einer XR-Sitzung nicht — der Druck lief
    // ins Leere. In der Brille zählt sie deshalb nicht mehr.
    expect(opensFlat({ flatWanted: true, immersive: true })).toBe(false);
    expect(opensFlat({ flatWanted: true, immersive: false })).toBe(true);
    const entries = startEntries(inHeadset({ flatWanted: true }));
    expect(entries[0]!.starts).toBe('mission');
    expect(entries[0]!.sub).not.toContain('2D-Karte');
  });

  it('sagt am Fenster dazu, dass die Runde als 2D-Karte läuft', () => {
    const entries = startEntries(inHeadset({ immersive: false, flatWanted: true }));
    expect(entries[0]!.sub).toContain('Als 2D-Karte von oben');
    expect(entries[0]!.starts).toBe('mission');
  });
});

describe('Wenn gerade keine Runde zu starten ist', () => {
  it('sagt es als Text, statt den Eintrag wirkungslos dastehen zu lassen', () => {
    for (const state of [
      inHeadset({ role: 'handheld', immersive: false }),
      inHeadset({ hostId: 'jemand-anders' }),
      inHeadset({ occupied: true }),
    ]) {
      for (const entry of startEntries(state)) {
        if (entry.starts !== null) continue;
        expect(entry.blocked).toEqual(expect.any(String));
        expect(entry.blocked!.length).toBeGreaterThan(20);
        // Der Grund steht dort, wo sonst die Erklärung des Eintrags steht.
        expect(entry.sub).toBe(entry.blocked);
      }
    }
  });

  it('nennt die falsche Rolle, den fremden Gastgeber und den belegten Raum je einzeln', () => {
    const wrongRole = startBlocker(inHeadset({ role: 'desktop', immersive: false }), 'mission');
    expect(wrongRole).toContain('Techniker');
    const busyHost = startBlocker(inHeadset({ hostId: 'jemand-anders' }), 'mission');
    expect(busyHost).toContain('rechnet');
    expect(startBlocker(inHeadset({ occupied: true }), 'bot')).toContain(
      'spielt bereits in diesem Raum',
    );
    // Ein belegter Raum hält nur die Vorführung auf; Mission und Test sind die
    // gemeinsame Runde und dürfen weiterlaufen.
    expect(startBlocker(inHeadset({ occupied: true }), 'mission')).toBeNull();
  });

  it('hält einen noch offenen Gastgeber nicht für einen fremden', () => {
    // Vor dem ersten Bild steht `hostId` auf leer. Wer dann drückt, wird selbst
    // Gastgeber — ein „ein anderer rechnet" wäre dort schlicht falsch.
    expect(mayCompute({ hostId: '', me: 'me' })).toBe(true);
    expect(mayCompute({ hostId: 'me', me: 'me' })).toBe(true);
    expect(mayCompute({ hostId: 'jemand-anders', me: 'me' })).toBe(false);
    expect(startEntries(inHeadset({ hostId: '' }))[0]!.starts).toBe('mission');
  });
});

describe('Nach dem Start', () => {
  it('läuft die Runde, und bei der Mission ist das Monster an', () => {
    expect(startedRound('mission')).toEqual({
      phase: 'running',
      monsterOn: true,
      test: false,
      bright: false,
    });
  });

  it('bleibt der Test der sichere Stand: kein Monster, Licht an', () => {
    expect(startedRound('test')).toEqual({
      phase: 'running',
      monsterOn: false,
      test: true,
      bright: true,
    });
    // Die Bot-Runde ist die Vorführung desselben sicheren Standes.
    expect(startedRound('bot')).toEqual(startedRound('test'));
  });
});

describe('Die Beschriftungen', () => {
  it('stehen fest und passen zum Stand', () => {
    const idle = startEntries(inHeadset()).map((entry) => entry.label);
    expect(idle).toEqual(['Mission starten', 'TEST / ohne Monster', 'Bot-Runde anschauen']);
    const running = startEntries(inHeadset({ phase: 'running' }));
    expect(running.map((entry) => entry.label)).toEqual([
      'Mission neu starten',
      'TEST / ohne Monster',
      'Bot-Runde anschauen',
    ]);
    for (const entry of running) expect(entry.sub).toContain('Die laufende Runde endet damit');
  });

  it('sind für jede Art dieselbe Kennung, egal was der Eintrag gerade darf', () => {
    const open = startEntries(inHeadset()).map((entry) => entry.id);
    const shut = startEntries(inHeadset({ role: 'desktop', immersive: false })).map(
      (entry) => entry.id,
    );
    expect(shut).toEqual(open);
  });
});
