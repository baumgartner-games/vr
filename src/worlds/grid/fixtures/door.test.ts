import { passable, type DoorState } from '../../interact/doorMotion';
import { DIR_W } from '../../nav/navTile';
import { DOOR, doorMode, doorParams } from './door';
import type { FixtureInput, FixturePlacement, Props } from './index';

function leaf(props: Props = {}): FixturePlacement {
  return { id: 'tuer-1', kind: 'door', x: 4, z: 2, dir: DIR_W, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};
const PUSH: FixtureInput = { ...NOTHING, triggered: true };

/** So viele Bilder zu 1/60 s, wie `seconds` lang sind. */
function run(state: DoorState, place: FixturePlacement, seconds: number, input = NOTHING): void {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) DOOR.step(state, place, input, dt);
}

describe('Die Tür als Einbau', () => {
  it('kennt drei Betriebsarten und fällt sonst auf die Schiebetür zurück', () => {
    expect(doorMode(leaf({ mode: 'swing' }))).toBe('swing');
    expect(doorMode(leaf({ mode: 'plate' }))).toBe('plate');
    expect(doorMode(leaf({ mode: 'Karussell' }))).toBe('slide');
    expect(doorMode(leaf())).toBe('slide');
  });

  /**
   * Der Nachlauf hängt an der Betriebsart und nicht an einer Zahl in jeder
   * Welt: Eine Flügeltür rastet (`hold: 0`), eine Schiebetür fällt nach sechs
   * Sekunden zu. Wer es anders will, schreibt es hin.
   */
  it('nimmt den Nachlauf aus der Betriebsart, lässt ihn aber überschreiben', () => {
    expect(doorParams(leaf({ mode: 'swing' })).hold).toBe(0);
    expect(doorParams(leaf({ mode: 'slide' })).hold).toBe(6);
    expect(doorParams(leaf({ mode: 'plate' })).hold).toBeCloseTo(1.6);
    expect(doorParams(leaf({ mode: 'swing', hold: 2 })).hold).toBe(2);
    expect(doorParams(leaf({ time: 0.4 })).time).toBeCloseTo(0.4);
  });

  it('fährt in der eingestellten Zeit auf — und keine Sekunde früher', () => {
    const at = leaf({ mode: 'slide', time: 1 });
    const state = DOOR.init(at);
    expect(state.open).toBe(0);
    expect(DOOR.solid(state)).toBe(true);
    expect(DOOR.open!(state)).toBe(false);

    // Der Knopf: ein Bild mit `triggered`, danach läuft sie von selbst.
    DOOR.step(state, at, PUSH, 1 / 60);
    run(state, at, 0.4);
    expect(state.open).toBeGreaterThan(0.3);
    expect(state.open).toBeLessThan(0.75);
    // Auf halbem Weg hält sie noch auf — das ist der Unterschied zwischen
    // „offen" und „geht gerade auf".
    expect(DOOR.solid(state)).toBe(true);

    run(state, at, 0.8);
    expect(state.open).toBe(1);
    expect(DOOR.solid(state)).toBe(false);
    expect(DOOR.open!(state)).toBe(true);
  });

  it('meldet genau zweimal je Türgang ein Geräusch: beim Losfahren und beim Zufallen', () => {
    const at = leaf({ mode: 'slide', time: 0.5, hold: 1 });
    const state = DOOR.init(at);
    // Losfahren: ein Klacken und eine kleine Staubwolke.
    expect(DOOR.step(state, at, PUSH, 1 / 60)).toEqual([
      { type: 'sound', name: 'switch-on' },
      { type: 'effect', effect: 'dust', size: 0.5 },
    ]);
    // Dazwischen ist sie still.
    expect(DOOR.step(state, at, NOTHING, 1 / 60)).toEqual([]);

    let slammed = false;
    const dt = 1 / 60;
    for (let t = 0; t < 4; t += dt) {
      for (const event of DOOR.step(state, at, NOTHING, dt)) {
        if (event.type === 'sound' && event.name === 'slam') slammed = true;
      }
    }
    expect(slammed).toBe(true);
    expect(state.open).toBe(0);
  });

  /**
   * **Die Flügeltür rastet.** Der Hebel schaltet um, und beim zweiten Mal geht
   * sie zu — anders als die Schiebetür, die auf jeden Druck „auf" heißt.
   */
  it('rastet als Flügeltür und fällt nie von selbst zu', () => {
    const at = leaf({ mode: 'swing', time: 0.4 });
    const state = DOOR.init(at);
    DOOR.step(state, at, PUSH, 1 / 60);
    run(state, at, 1);
    expect(state.open).toBe(1);
    run(state, at, 30);
    expect(state.open).toBe(1);

    DOOR.step(state, at, PUSH, 1 / 60);
    run(state, at, 1);
    expect(state.open).toBe(0);
  });

  /**
   * **Die Plattentür fällt nach `hold` zu — aber erst, wenn die Platte frei
   * ist.** Solange etwas darauf steht, löst die Platte in jedem Bild neu aus
   * und setzt die Uhr zurück; sonst schlösse sich die Tür unter dem, der in ihr
   * steht.
   */
  it('hält als Plattentür, solange die Platte drückt, und fällt danach zu', () => {
    const at = leaf({ mode: 'plate', time: 0.3, hold: 1 });
    const state = DOOR.init(at);

    // Fünf Sekunden auf der Platte: länger als jeder Nachlauf.
    run(state, at, 5, PUSH);
    expect(state.open).toBe(1);

    // Runter von der Platte: eine Sekunde Nachlauf, dann fährt sie zu.
    run(state, at, 0.9);
    expect(passable(state)).toBe(true);
    run(state, at, 1);
    expect(state.open).toBe(0);
    expect(DOOR.solid(state)).toBe(true);
  });

  it('geht auch auf, wenn man selbst davorsteht und benutzt', () => {
    const at = leaf({ mode: 'slide', time: 0.3 });
    const state = DOOR.init(at);
    DOOR.step(state, at, { ...NOTHING, used: true }, 1 / 60);
    run(state, at, 0.5);
    expect(state.open).toBe(1);
  });

  it('ist eine Türkante im Graphen und steht an einer Kachelkante', () => {
    expect(DOOR.door).toBe(true);
    expect(DOOR.edge).toBe(true);
  });
});
