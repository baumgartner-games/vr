import type { MapRound } from '../map/mapSnapshot';
import {
  cabinsText,
  endingText,
  HUD_COLOR,
  HUD_COLOR_LOW,
  LOW_OXYGEN_SECONDS,
  lowOxygen,
  hudTasks,
  hudTasksVisible,
  roundHud,
  suitPips,
  taskPips,
} from './roundHud';

const REPAIRS = [
  { itemId: 'part-engine', title: 'Antrieb wiederherstellen', roomId: 'r1' },
  { itemId: 'part-oxygen', title: 'Nahrungsversorgung sichern', roomId: 'r2' },
  { itemId: 'part-uplink', title: 'Notsignal senden', roomId: 'r3' },
];

const NAMES: Record<string, string> = { r1: 'Werkstatt', r2: 'Kantine', r3: 'Funkraum' };

function tasksInput(): Parameters<typeof hudTasks>[0] {
  return {
    repairs: REPAIRS,
    roomName: (id) => NAMES[id] ?? id,
    done: [],
    taken: [],
    inventory: [],
  };
}

function tasks(over: Partial<Parameters<typeof hudTasks>[0]> = {}) {
  return hudTasks({ ...tasksInput(), ...over });
}

function round(over: Partial<MapRound> = {}): MapRound {
  return {
    phase: 'running',
    oxygen: 600,
    limit: 600,
    suit: 3,
    suitMax: 3,
    cabinsDestroyed: [],
    ending: '',
    ...over,
  };
}

describe('Die Anzeige der laufenden Runde', () => {
  it('zeigt den Sauerstoff als Uhr und den Anzug als Punkte', () => {
    const hud = roundHud(round({ oxygen: 581, suit: 2 }));
    expect(hud.oxygen).toBe('O₂ 9:41');
    expect(hud.suit).toBe('●●○');
    expect(hud.cabins).toBe(0);
    expect(hud.low).toBe(false);
    expect(hud.color).toBe(HUD_COLOR);
    expect(hud.label).toBe('Sauerstoff 9 Minuten 41 Sekunden; Anzug 2 von 3');
  });

  it('warnt unter einer Minute — und genau ab dort', () => {
    expect(lowOxygen(LOW_OXYGEN_SECONDS)).toBe(false);
    expect(lowOxygen(LOW_OXYGEN_SECONDS - 0.01)).toBe(true);
    const hud = roundHud(round({ oxygen: 42.4 }));
    expect(hud.low).toBe(true);
    expect(hud.color).toBe(HUD_COLOR_LOW);
    expect(hud.oxygen).toBe('O₂ 0:43');
    expect(hud.label).toContain('knapp');
  });

  it('nennt zerstörte Kabinen nur, wenn es welche gibt', () => {
    expect(roundHud(round()).label).not.toContain('Kabine');
    const one = roundHud(round({ cabinsDestroyed: ['r3'] }));
    expect(one.cabins).toBe(1);
    expect(one.label).toContain('1 Kabine zerstört');
    expect(cabinsText(3)).toBe('3 Kabinen zerstört');
  });

  it('hält den Anzug in seinen Grenzen', () => {
    expect(suitPips({ suit: 5, suitMax: 3 })).toBe('●●●');
    expect(suitPips({ suit: -1, suitMax: 3 })).toBe('○○○');
    expect(suitPips({ suit: 0, suitMax: 3 })).toBe('○○○');
  });

  it('sagt an der Endkarte, woran es lag', () => {
    expect(endingText('oxygen')).toContain('Sauerstoff');
    expect(endingText('suit')).toContain('Anzug');
    expect(endingText('escaped')).toContain('Einsatzzentrale');
    expect(endingText('')).toBe('');
  });

  it('zählt jeden Auftrag in zwei Schritten: das Teil, dann die Konsole', () => {
    expect(tasks().map((task) => task.step)).toEqual([0, 0, 0]);
    expect(tasks()[0]!.text).toBe('Werkstatt: Antrieb wiederherstellen (0/2)');
    const carried = tasks({ inventory: ['part-engine'] });
    expect(carried[0]!.step).toBe(1);
    expect(carried[0]!.text).toContain('(1/2)');
    // Aus der Fracht genommen zählt genauso wie in der Hand: Wer das Teil
    // abgelegt hat, hat den ersten Schritt trotzdem hinter sich.
    expect(tasks({ taken: ['part-oxygen'] })[1]!.step).toBe(1);
    const finished = tasks({ done: ['part-uplink'], inventory: ['part-uplink'] });
    expect(finished[2]!.step).toBe(2);
    expect(finished[2]!.text).toContain('(2/2)');
  });

  it('liest beide Schreibweisen von `done` — Reparatur und Ersatzteil', () => {
    // Das Schiff schreibt `engine` in `done`, die 2D-Runde `part-engine`.
    // Ohne die erste blieb im Schiff jeder fertige Auftrag auf „1/2" stehen.
    const repairs = REPAIRS.map((repair) => ({ ...repair, id: repair.itemId.slice(5) }));
    expect(hudTasks({ ...tasksInput(), repairs, done: ['engine'] })[0]!.step).toBe(2);
    expect(hudTasks({ ...tasksInput(), repairs, done: ['part-engine'] })[0]!.step).toBe(2);
  });

  it('zeigt die Auftragszeile nur, wenn am Archiv ein Bot sitzt', () => {
    // Sitzt dort ein Mensch, ist das Wissen dessen Platz — der Techniker
    // fragt ihn, statt es stumm im Blickfeld mitzulesen.
    expect(hudTasksVisible({ archive: true })).toBe(true);
    expect(hudTasksVisible({ archive: false })).toBe(false);
  });

  it('macht aus den Aufträgen drei Kreise: voll, halb, leer', () => {
    expect(taskPips(tasks())).toBe('○○○');
    expect(taskPips(tasks({ done: ['part-engine'], inventory: ['part-oxygen'] }))).toBe('●◐○');
  });

  it('nennt den Raum auch einzeln, für Anzeigen ohne Platz', () => {
    expect(tasks()[1]!.room).toBe('Kantine');
    expect(tasks()[1]!.title).toBe('Nahrungsversorgung sichern');
  });
});
