import * as THREE from 'three';
import {
  BELT_EMPTY,
  BELT_HEIGHT,
  BELT_HOLD,
  BELT_SECONDS,
  BeltKit,
  advanceBelts,
  beltBound,
  beltProgress,
  beltStep,
  type BeltFrame,
  type BeltState,
} from './kitchenBelt';
import type { Turn } from './kitchenPlan';

/**
 * **Was das Förderband verspricht** (`kitchenBelt.ts`).
 *
 * Drei Versprechen, und das dritte ist das, an dem ein Band scheitert, ohne
 * dass es jemandem auffällt: dass der Pfeil dorthin zeigt, wohin geschoben
 * wird, in **allen vier** Drehungen; dass ein Ding bei einem Bild von 100 s
 * genauso lange über die Kachel braucht wie bei tausend Bildern von 0,1 s —
 * und dass **nichts verlorengeht und nichts aufeinanderliegt**, egal wie voll
 * das Band ist und wer wann etwas dazwischenlegt.
 *
 * Und dazu die Zusage, ohne die dieses Modul in keinem Testlauf vorkäme: Der
 * Bausatz lässt sich **ohne `document` und ohne WebGL** bauen und wieder
 * wegräumen (`core/chefFit.canLoadModels`) — in Jest gibt es keine Leinwand,
 * und ein Band, das ohne sie umfiele, wäre hier gar nicht zu prüfen.
 */

describe('beltStep — wohin ein gedrehtes Band schiebt', () => {
  it('schiebt bei `turn: 0` nach Norden und dreht sich mit dem Möbel', () => {
    expect(beltStep(0)).toEqual({ dx: 0, dz: -1 });
    expect(beltStep(1)).toEqual({ dx: -1, dz: 0 });
    expect(beltStep(2)).toEqual({ dx: 0, dz: 1 });
    expect(beltStep(3)).toEqual({ dx: 1, dz: 0 });
  });

  it('zeigt genau dorthin, wohin das gedrehte Netz nach −z zeigt', () => {
    // Die Probe auf `kitchen.place`: Dort bekommt ein Möbel
    // `rotation.y = turn · 90°`, und der Pfeil auf dem Band zeigt in seinem
    // eigenen Raum nach −z. Beides muss dasselbe ergeben, sonst zeigt der
    // Pfeil in die eine und das Band schiebt in die andere Richtung.
    const turns: Turn[] = [0, 1, 2, 3];
    for (const turn of turns) {
      const ahead = new THREE.Vector3(0, 0, -1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (turn * Math.PI) / 2,
      );
      const step = beltStep(turn);
      expect(ahead.x).toBeCloseTo(step.dx, 10);
      expect(ahead.z).toBeCloseTo(step.dz, 10);
    }
  });

  it('gibt für jede Drehung eine eigene Richtung', () => {
    const seen = new Set(
      ([0, 1, 2, 3] as Turn[]).map((turn) => `${beltStep(turn).dx}/${beltStep(turn).dz}`),
    );
    expect(seen.size).toBe(4);
  });

  it('lässt sich nicht von außen umschreiben', () => {
    // Der Versatz ist eingefroren: Wer ihn weiterreicht und dabei versehentlich
    // darauf rechnet, dreht sonst alle Bänder der Küche.
    const step = beltStep(0);
    expect(() => {
      (step as { dx: number }).dx = 99;
    }).toThrow();
    expect(beltStep(0)).toEqual({ dx: 0, dz: -1 });
  });
});

// --- die Küche, auf ein paar Kacheln eingedampft -------------------------------

/** Eine Kachel, wie die Zone sie führt: veränderlich und mit Namen. */
interface Cell {
  id: string;
  loaded: boolean;
  state: BeltState;
  to: string | null;
}

/** Ein Band, das auf `to` schiebt — und `to: null` ist das Band ins Nichts. */
function belt(id: string, to: string | null, loaded = true): Cell {
  return { id, loaded, state: BELT_EMPTY, to };
}

/** Eine Ablage: Sie wird frei und besetzt, aber von selbst wandert dort nichts. */
function shelf(id: string, loaded = false): Cell {
  return { id, loaded, state: BELT_EMPTY, to: null };
}

/**
 * **Die Zone, so weit ein Test sie braucht** — sie wendet ein Bild in genau der
 * Reihenfolge an, in der `kitchen.ts` es tun muss: **erst die Übergaben, dann
 * die Zustände**. Andersherum setzte das Umlegen (`kitchen.settle` schreibt
 * `BELT_EMPTY`) die Fahrt wieder zurück, die in demselben Bild angefangen hat.
 */
class Run {
  readonly cells = new Map<string, Cell>();
  /** Die verstrichene Zeit, damit ein Test „nach zwei Sekunden" prüfen kann. */
  clock = 0;

  constructor(...cells: Cell[]) {
    for (const cell of cells) this.cells.set(cell.id, cell);
  }

  at(id: string): Cell {
    const cell = this.cells.get(id);
    if (!cell) throw new Error(`keine Kachel ${id}`);
    return cell;
  }

  /** Ein Bild — und was es geändert hat. */
  frame(dt: number): BeltFrame {
    const frame = advanceBelts([...this.cells.values()], dt);
    for (const move of frame.moves) {
      // Die Probe darauf, dass die Reihenfolge aufgeht: Wer hier auf eine
      // belegte Kachel legte, verlöre, was darauf liegt.
      expect(this.at(move.to).loaded).toBe(false);
      this.at(move.from).loaded = false;
      this.at(move.to).loaded = true;
    }
    for (const [id, state] of frame.states) this.at(id).state = state;
    this.clock += dt;
    return frame;
  }

  /** So viele Sekunden in Bildern von `dt` — und alles, was dabei geschah. */
  run(seconds: number, dt = 1 / 60): BeltFrame[] {
    const frames: BeltFrame[] = [];
    for (let left = seconds; left > 1e-9; left -= dt) frames.push(this.frame(Math.min(dt, left)));
    return frames;
  }

  /** Welche Kacheln gerade etwas tragen, in einem Wort. */
  get holds(): string {
    return [...this.cells.values()]
      .filter((cell) => cell.loaded)
      .map((cell) => cell.id)
      .join(' ');
  }
}

/** Alle Übergaben aus einer Reihe Bilder, in der Reihenfolge, in der sie kamen. */
function handOvers(frames: readonly BeltFrame[]): string[] {
  return frames.flatMap((frame) => frame.moves.map((move) => `${move.from}>${move.to}`));
}

describe('advanceBelts — losfahren, ankommen, anstehen', () => {
  it('schiebt auf eine freie Ablage und legt das Ding genau einmal um', () => {
    const run = new Run(belt('band', 'ablage'), shelf('ablage'));
    const frames = run.run(BELT_SECONDS * 2);
    expect(handOvers(frames)).toEqual(['band>ablage']);
    expect(run.holds).toBe('ablage');
  });

  it('kommt nach zwei Sekunden an — in großen Bildern wie in tausend kleinen', () => {
    for (const dt of [BELT_SECONDS / 3, BELT_SECONDS / 1000]) {
      const run = new Run(belt('band', 'ablage'), shelf('ablage'));
      let left = 0;
      let arrived = 0;
      for (let i = 0; i * dt < BELT_SECONDS * 2; i++) {
        const frame = run.frame(dt);
        if (frame.carry.size && !left) left = run.clock;
        if (frame.moves.length) arrived = run.clock;
      }
      // Losgefahren wird, sobald die Kachel gefragt wird; von da an sind es
      // zwei Sekunden, auf ein Bild genau.
      expect(arrived - left).toBeGreaterThanOrEqual(BELT_SECONDS - 1e-9);
      expect(arrived - left).toBeLessThanOrEqual(BELT_SECONDS + dt + 1e-9);
    }
  });

  it('fährt gar nicht erst los, wenn vorn überhaupt nichts ist', () => {
    // Das ist der Fehler, den es vorher gab: Ein Band, das ins Nichts schob,
    // reichte weiter — und was daraufliegt, war weg.
    const run = new Run(belt('band', null));
    const frames = run.run(BELT_SECONDS * 5);
    expect(handOvers(frames)).toEqual([]);
    expect(run.holds).toBe('band');
    expect(frames.every((frame) => frame.carry.size === 0)).toBe(true);
    expect(run.at('band').state).toBe(BELT_EMPTY);
  });

  it('fährt auch dann nicht los, wenn das Ziel gar nicht mitgeliefert wurde', () => {
    const run = new Run(belt('band', 'nirgendwo'));
    expect(handOvers(run.run(BELT_SECONDS * 3))).toEqual([]);
    expect(run.holds).toBe('band');
  });

  it('wartet, solange auf der Ablage etwas liegt — und fährt los, sobald sie frei ist', () => {
    const run = new Run(belt('band', 'ablage'), shelf('ablage', true));
    expect(handOvers(run.run(BELT_SECONDS * 3))).toEqual([]);
    expect(run.at('band').state).toBe(BELT_EMPTY);

    run.at('ablage').loaded = false;
    expect(handOvers(run.run(BELT_SECONDS * 2))).toEqual(['band>ablage']);
  });

  it('setzt eine ganze Kette in einem einzigen Bild in Bewegung', () => {
    // Drei volle Bänder, vorn eine freie Ablage. Das ist die Kettenausnahme:
    // `a` darf losfahren, weil `b` losfährt, und `b`, weil `c` losfährt.
    const run = new Run(belt('a', 'b'), belt('b', 'c'), belt('c', 'ablage'), shelf('ablage'));
    const first = run.frame(1 / 60);
    expect([...first.carry.keys()].sort()).toEqual(['a', 'b', 'c']);
    expect(first.moves).toEqual([]);
    for (const carry of first.carry.values()) expect(carry.t).toBeLessThan(0.02);
  });

  it('kommt von vorn nach hinten an, alle in demselben Bild', () => {
    const run = new Run(belt('a', 'b'), belt('b', 'c'), belt('c', 'ablage'), shelf('ablage'));
    const frames = run.run(BELT_SECONDS * 2);
    // Eine einzige Welle, und in ihr steht der Vordermann vorn: Wer die Liste
    // andersherum abarbeitete, legte `a` auf das noch volle `b`.
    expect(handOvers(frames)).toEqual(['c>ablage', 'b>c', 'a>b']);
    const wave = frames.filter((frame) => frame.moves.length);
    expect(wave).toHaveLength(1);
    expect(run.holds).toBe('b c ablage');
  });

  it('rührt sich nicht, solange vorn etwas fest liegt', () => {
    const run = new Run(belt('a', 'b'), belt('b', 'c'), belt('c', 'ablage'), shelf('ablage', true));
    const frames = run.run(BELT_SECONDS * 3);
    expect(handOvers(frames)).toEqual([]);
    expect(frames.every((frame) => frame.carry.size === 0)).toBe(true);
    expect(run.holds).toBe('a b c ablage');
  });

  it('fährt im selben Bild weiter, in dem es angekommen ist', () => {
    // Sonst hinge ein langes Band bei jeder Übergabe ein Bild durch — bei acht
    // Kacheln eine sichtbare Welle.
    const run = new Run(belt('a', 'b'), belt('b', 'ablage', false), shelf('ablage'));
    const frames = run.run(BELT_SECONDS * 3);
    const wave = frames.find((frame) => frame.moves.length);
    expect(wave?.moves).toEqual([{ from: 'a', to: 'b' }]);
    expect(wave?.carry.get('b')).toEqual({ from: 'b', to: 'ablage', t: 0 });
    expect(handOvers(frames)).toEqual(['a>b', 'b>ablage']);
  });

  it('bleibt kurz vor dem Ziel stehen, statt zurückzuspringen', () => {
    // Beim Losfahren war die Ablage frei; auf halber Strecke legt jemand
    // etwas darauf. Jetzt kann das Band nicht ankommen — und darf trotzdem
    // nicht rückwärts fahren.
    const run = new Run(belt('band', 'ablage'), shelf('ablage'));
    run.run(BELT_SECONDS / 2);
    run.at('ablage').loaded = true;

    let last = 0;
    for (const frame of run.run(BELT_SECONDS * 3)) {
      const t = frame.carry.get('band')?.t ?? 0;
      expect(t).toBeGreaterThanOrEqual(last);
      last = t;
      expect(frame.moves).toEqual([]);
    }
    expect(last).toBeCloseTo(BELT_HOLD, 10);
    expect(run.holds).toBe('band ablage');

    // Und wenn die Ablage wieder frei wird, fährt es von dort weiter — die
    // restlichen `1 − BELT_HOLD` Kacheln, nicht die ganze Strecke neu.
    run.at('ablage').loaded = false;
    const rest = run.run(BELT_SECONDS * (1 - BELT_HOLD) + 0.05);
    expect(handOvers(rest)).toEqual(['band>ablage']);
  });

  it('staut eine volle Kette vor dem Hindernis, ohne dass etwas übereinanderliegt', () => {
    const run = new Run(belt('a', 'b'), belt('b', 'c'), belt('c', 'ablage'), shelf('ablage'));
    run.run(BELT_SECONDS / 2);
    run.at('ablage').loaded = true;
    const frames = run.run(BELT_SECONDS * 3);

    for (const frame of frames) {
      const a = frame.carry.get('a')?.t ?? 0;
      const b = frame.carry.get('b')?.t ?? 0;
      const c = frame.carry.get('c')?.t ?? 0;
      // Wer hinten fährt, ist nie weiter als der vor ihm — der Abstand
      // zwischen zwei Dingen bleibt also mindestens eine ganze Kachel.
      expect(a).toBeLessThanOrEqual(b + 1e-12);
      expect(b).toBeLessThanOrEqual(c + 1e-12);
      expect(c).toBeLessThanOrEqual(BELT_HOLD + 1e-12);
    }
    expect(handOvers(frames)).toEqual([]);
    expect(run.holds).toBe('a b c ablage');

    // Freigeben, und die ganze Schlange läuft nacheinander ab.
    run.at('ablage').loaded = false;
    expect(handOvers(run.run(BELT_SECONDS * 4))).toEqual(['c>ablage', 'b>c', 'a>b']);
  });

  it('lässt nur eines von zwei Bändern auf dieselbe Kachel losfahren', () => {
    // Ein Grundriss, den irgendwann jemand so baut: zwei Zuläufe, eine Ablage.
    // Führen beide los, kommt einer an und der andere steht in der Luft fest.
    const run = new Run(belt('links', 'ablage'), belt('rechts', 'ablage'), shelf('ablage'));
    const first = run.frame(1 / 60);
    expect([...first.carry.keys()]).toEqual(['links']);
    expect(beltBound(first, 'ablage')).toBe(true);

    const frames = run.run(BELT_SECONDS * 2);
    expect(handOvers(frames)).toEqual(['links>ablage']);
    expect(run.holds).toBe('rechts ablage');
    // Und `rechts` hat sich dabei keinen Zentimeter gerührt.
    expect(run.at('rechts').state).toBe(BELT_EMPTY);
  });

  it('bleibt stehen, statt zurückzufahren, wenn das Ziel erst kurz vor Schluss belegt wird', () => {
    // Der einzige Fall, in dem `BELT_HOLD` überfahren wird — und auch dann gilt
    // die Zusage, die zählt: die Uhr läuft nie rückwärts.
    const run = new Run(belt('band', 'ablage'), shelf('ablage'));
    run.run(BELT_SECONDS * 0.95);
    const far = run.at('band').state.time;
    expect(far / BELT_SECONDS).toBeGreaterThan(BELT_HOLD);

    run.at('ablage').loaded = true;
    for (const frame of run.run(BELT_SECONDS)) {
      expect(frame.carry.get('band')?.t).toBeCloseTo(far / BELT_SECONDS, 10);
      expect(frame.moves).toEqual([]);
    }
  });

  it('lässt einen vollen Ring stehen, statt ihn sich selbst begründen zu lassen', () => {
    // Jedes Band dürfte losfahren, weil das nächste losführe — im Kreis.
    // Käme diese Begründung durch, drehte sich ein Ring, der nirgends ankommt.
    const run = new Run(belt('a', 'b'), belt('b', 'c'), belt('c', 'a'));
    const frames = run.run(BELT_SECONDS * 4);
    expect(handOvers(frames)).toEqual([]);
    expect(frames.every((frame) => frame.carry.size === 0)).toBe(true);
  });

  it('dreht einen Ring mit einer Lücke', () => {
    const run = new Run(belt('a', 'b'), belt('b', 'c'), belt('c', 'a', false));
    expect(handOvers(run.run(BELT_SECONDS * 2))).toEqual(['b>c', 'a>b']);
    expect(run.holds).toBe('b c');
  });

  it('vergisst die Fahrt, wenn jemand das Ding unterwegs herunternimmt', () => {
    const run = new Run(belt('band', 'ablage'), shelf('ablage'));
    run.run(BELT_SECONDS / 2);
    expect(run.at('band').state.moving).toBe(true);

    run.at('band').loaded = false;
    run.frame(1 / 60);
    expect(run.at('band').state).toBe(BELT_EMPTY);
    // Und wer es wieder auflegt, legt es vorn auf.
    run.at('band').loaded = true;
    expect(handOvers(run.run(BELT_SECONDS - 0.05))).toEqual([]);
  });

  it('hält die Fahrt an, wenn das Ziel im Baumodus weggetragen wird', () => {
    const run = new Run(belt('band', 'ablage'), shelf('ablage'));
    run.run(BELT_SECONDS / 2);
    expect(run.at('band').state.moving).toBe(true);

    run.cells.delete('ablage');
    run.frame(1 / 60);
    expect(run.at('band').state).toBe(BELT_EMPTY);
    expect(run.holds).toBe('band');
  });

  it('gibt nur heraus, was sich geändert hat', () => {
    const run = new Run(shelf('eins', true), shelf('zwei'));
    const frame = run.frame(1 / 60);
    expect(frame.states.size).toBe(0);
    expect(frame.carry.size).toBe(0);
    expect(frame.moves).toEqual([]);
    // Zwei stehende Ablagen sind der Fall für die meisten Kacheln in jedem
    // Bild — dafür entsteht kein einziges neues Objekt.
    expect(run.frame(1 / 60)).toBe(frame);
    expect(advanceBelts([], 1 / 60)).toBe(frame);
  });

  it('lässt sich von einem `dt` ohne Zahl nicht vergiften', () => {
    const run = new Run(belt('band', 'ablage'), shelf('ablage'));
    run.run(BELT_SECONDS / 2);
    const before = run.at('band').state.time;
    run.frame(Number.NaN);
    run.frame(-3);
    expect(run.at('band').state.time).toBeCloseTo(before, 10);

    // Und auch nicht von einem Zustand ohne Zahl — der käme aus einer Uhr,
    // die einmal danebengegriffen hat.
    run.at('band').state = { time: Number.NaN, moving: true };
    run.frame(1 / 60);
    expect(run.at('band').state.time).toBeCloseTo(1 / 60, 10);
  });

  it('sagt, welche Kachel schon vergeben ist', () => {
    const run = new Run(belt('band', 'ablage'), shelf('ablage'));
    const frame = run.frame(1 / 60);
    expect(beltBound(frame, 'ablage')).toBe(true);
    expect(beltBound(frame, 'band')).toBe(false);
  });
});

describe('beltProgress — der Anteil über die Kachel', () => {
  it('klemmt ihn auf 0…1 und meldet für Stehendes null', () => {
    expect(beltProgress(BELT_EMPTY)).toBe(0);
    expect(beltProgress({ time: BELT_SECONDS / 2, moving: true })).toBeCloseTo(0.5, 6);
    expect(beltProgress({ time: BELT_SECONDS * 9, moving: true })).toBe(1);
    expect(beltProgress({ time: -4, moving: true })).toBe(0);
    expect(beltProgress({ time: Number.NaN, moving: true })).toBe(0);
    // Was nicht fährt, ist nirgendwo unterwegs — auch wenn eine Zahl daneben
    // stehen geblieben ist.
    expect(beltProgress({ time: BELT_SECONDS / 2, moving: false })).toBe(0);
  });
});

describe('BeltKit — der Bausatz ohne Leinwand', () => {
  it('lässt sich ohne `document` und ohne WebGL bauen', () => {
    expect(typeof document).toBe('undefined');
    const kit = new BeltKit();
    expect(() => kit.piece()).not.toThrow();
    kit.dispose();
  });

  it('baut ein Band, das auf dem Boden steht und genau so hoch ist wie im Katalog', () => {
    const kit = new BeltKit();
    const belt = kit.piece();
    belt.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(belt);

    // Ursprung **auf dem Boden in seiner Mitte**, wie jedes Küchenmöbel.
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeCloseTo(BELT_HEIGHT, 6);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 6);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 6);
    // Eine Kachel breit und nicht breiter (`core/kitchenFit`, `tiles: [1, 1]`).
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(1 + 1e-6);
    expect(box.max.z - box.min.z).toBeLessThanOrEqual(1 + 1e-6);
    kit.dispose();
  });

  it('teilt Formen und Farben über alle Bänder und gibt jede einmal frei', () => {
    const kit = new BeltKit();
    const shapes = new Set<THREE.BufferGeometry>();
    const skins = new Set<THREE.Material>();
    for (let i = 0; i < 8; i++) {
      kit.piece().traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        shapes.add(mesh.geometry);
        skins.add(mesh.material as THREE.Material);
      });
    }
    // Korpus, Platte, Trog, Pfeilebene — vier Formen und vier Farben, für acht
    // Bänder wie für eines.
    expect(shapes.size).toBe(4);
    expect(skins.size).toBe(4);

    const shapeGone = jest.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const skinGone = jest.spyOn(THREE.Material.prototype, 'dispose');
    kit.dispose();
    expect(shapeGone).toHaveBeenCalledTimes(4);
    expect(skinGone).toHaveBeenCalledTimes(4);
  });

  it('läuft auch ohne Textur und übersteht ein zweites `dispose`', () => {
    const kit = new BeltKit();
    kit.piece();
    // Ohne Leinwand gibt es nichts zu verschieben — aber auch nichts, was
    // dabei umfällt.
    expect(() => {
      for (let i = 0; i < 100; i++) kit.update(0.016);
    }).not.toThrow();
    kit.dispose();
    expect(() => kit.dispose()).not.toThrow();
    expect(() => kit.update(0.016)).not.toThrow();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
