import { INTENTS } from './lobby';
import {
  asIntent,
  mayCompute,
  opensFlat,
  shipStart,
  startBlocker,
  startedRound,
  startEntries,
  SHIP_NEEDS_TECHNICIAN,
  SHIP_OCCUPIED,
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
    intent: 'play',
    occupied: false,
    ...over,
  };
}

describe('Das Menü in der Brille', () => {
  it('hat genau einen Eintrag, der die Mission startet — ohne Untermenü', () => {
    const entries = startEntries(inHeadset());
    const starters = entries.filter((entry) => entry.starts === 'play');
    expect(starters).toHaveLength(1);
    expect(starters[0]!.id).toBe('haunt:play');
    expect(starters[0]!.blocked).toBeNull();
    // Jeder Eintrag ist eine Zeile für sich: Wer die Mission will, drückt einmal.
    expect(entries.every((entry) => entry.starts !== null)).toBe(true);
  });

  /**
   * **Der Kern des Umbaus**: dieselben drei Absichten, dieselbe Reihenfolge,
   * dieselben Worte wie im Van und im Optionsmenü der 2D-Welt.
   */
  it('zeigt dieselben drei Absichten wie die Lobby, in derselben Reihenfolge', () => {
    expect(INTENTS).toEqual(['play', 'watch', 'train']);
    expect(startEntries(inHeadset()).map((entry) => entry.id)).toEqual([
      'haunt:play',
      'haunt:watch',
      'haunt:train',
    ]);
    expect(startEntries(inHeadset()).map((entry) => entry.label)).toEqual([
      'Spielen',
      'Zuschauen',
      'Trainieren',
    ]);
  });

  it('markiert die Absicht, die gerade auf der Tafel steht — und nur die', () => {
    const active = startEntries(inHeadset({ intent: 'train' })).filter((entry) => entry.active);
    expect(active.map((entry) => entry.id)).toEqual(['haunt:train']);
  });

  it('startet im Schiff, auch wenn die Ansicht auf „2D von oben" steht', () => {
    // Der eigentliche Fehlerbericht: Die Ansicht gilt für den ganzen Browser,
    // die Karte von oben aber öffnet in einer XR-Sitzung nicht — der Druck lief
    // ins Leere. In der Brille zählt sie deshalb nicht mehr.
    expect(opensFlat({ flatWanted: true, immersive: true })).toBe(false);
    expect(opensFlat({ flatWanted: true, immersive: false })).toBe(true);
    const entries = startEntries(inHeadset({ flatWanted: true }));
    expect(entries[0]!.starts).toBe('play');
    expect(entries[0]!.sub).not.toContain('2D-Karte');
  });

  it('sagt am Fenster dazu, dass die Runde als 2D-Karte läuft', () => {
    const entries = startEntries(inHeadset({ immersive: false, flatWanted: true }));
    expect(entries[0]!.sub).toContain('Als 2D-Karte von oben');
    expect(entries[0]!.starts).toBe('play');
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
    const wrongRole = startBlocker(inHeadset({ role: 'desktop', immersive: false }), 'play');
    expect(wrongRole).toContain('Techniker');
    const busyHost = startBlocker(inHeadset({ hostId: 'jemand-anders' }), 'play');
    expect(busyHost).toContain('rechnet');
    expect(startBlocker(inHeadset({ occupied: true }), 'watch')).toContain(
      'Zuschauen aus dem Schiff',
    );
    // Ein belegter Raum hält nur das Zusehen im Schiff auf; Spielen und
    // Trainieren sind die gemeinsame Runde und dürfen weiterlaufen.
    expect(startBlocker(inHeadset({ occupied: true }), 'play')).toBeNull();
  });

  it('hält einen noch offenen Gastgeber nicht für einen fremden', () => {
    // Vor dem ersten Bild steht `hostId` auf leer. Wer dann drückt, wird selbst
    // Gastgeber — ein „ein anderer rechnet" wäre dort schlicht falsch.
    expect(mayCompute({ hostId: '', me: 'me' })).toBe(true);
    expect(mayCompute({ hostId: 'me', me: 'me' })).toBe(true);
    expect(mayCompute({ hostId: 'jemand-anders', me: 'me' })).toBe(false);
    expect(startEntries(inHeadset({ hostId: '' }))[0]!.starts).toBe('play');
  });
});

describe('Die alten drei Namen', () => {
  it('meinen dieselben drei Absichten — beides geht herein', () => {
    expect(asIntent('mission')).toBe('play');
    expect(asIntent('test')).toBe('train');
    expect(asIntent('bot')).toBe('watch');
    for (const intent of INTENTS) expect(asIntent(intent)).toBe(intent);
    expect(startBlocker(inHeadset({ occupied: true }), 'bot')).toBe(
      startBlocker(inHeadset({ occupied: true }), 'watch'),
    );
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
    expect(idle).toEqual(['Spielen', 'Zuschauen', 'Trainieren']);
    const running = startEntries(inHeadset({ phase: 'running' }));
    // Der Name bleibt derselbe, auch wenn eine Runde läuft — dass sie damit
    // endet, steht in der Zeile darunter.
    expect(running.map((entry) => entry.label)).toEqual(idle);
    for (const entry of running) expect(entry.sub).toContain('Die laufende Runde endet damit');
  });

  it('sind für jede Absicht dieselbe Kennung, egal was der Eintrag gerade darf', () => {
    const open = startEntries(inHeadset()).map((entry) => entry.id);
    const shut = startEntries(inHeadset({ role: 'desktop', immersive: false })).map(
      (entry) => entry.id,
    );
    expect(shut).toEqual(open);
  });
});

/**
 * **Der zweite Befund**: „Der Knopf ‚Mission starten' scheint die Mission
 * nicht zu starten." Wer im Aufbau verteilt, steht dabei nicht am Stock —
 * und genau daran brach der Start ab, ohne dass es jemand sah.
 */
describe('Wer im Schiff startet', () => {
  it('startet sofort, wenn er den Anzug schon trägt', () => {
    expect(shipStart({ atStick: true, mine: true, occupied: false })).toBe('start');
    // Auch die Brille eines Zuschauers, der am Stock steht, startet — wer dort
    // steht, ist der Techniker, egal was die Lobby gemerkt hat.
    expect(shipStart({ atStick: true, mine: false, occupied: true })).toBe('start');
  });

  it('steigt erst in den Anzug, wenn der Aufbau ihn dafür vorsieht', () => {
    expect(shipStart({ atStick: false, mine: true, occupied: false })).toBe('stick');
  });

  it('lässt den Anzug dem, der ihn schon trägt', () => {
    expect(shipStart({ atStick: false, mine: true, occupied: true })).toBe('others');
    expect(shipStart({ atStick: false, mine: false, occupied: true })).toBe('others');
  });

  it('sagt einem Platz in der Zentrale, dass der Runde der Techniker fehlt', () => {
    expect(shipStart({ atStick: false, mine: false, occupied: false })).toBe('nobody');
  });

  it('hat für beide Absagen einen ganzen Satz, der weiterhilft', () => {
    for (const text of [SHIP_NEEDS_TECHNICIAN, SHIP_OCCUPIED]) {
      expect(text.length).toBeGreaterThan(40);
      expect(text).toContain('Techniker');
    }
    // Er sagt nicht nur „geht nicht", sondern auch, was stattdessen geht.
    expect(SHIP_NEEDS_TECHNICIAN).toContain('Bot');
    expect(SHIP_OCCUPIED).toContain('Karte von oben');
  });
});
