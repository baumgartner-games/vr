import { findPath } from '../nav/navPath';
import { profileOf } from '../nav/navProfile';
import { tileDistance } from '../nav/navTile';
import { closestTo, crossedAt, passedNear, runBay, walked, wander } from './labSim';
import {
  CRATE,
  DOOR_ID,
  PODIUM,
  baySpot,
  doorLeaf,
  openLabPortal,
  scenarioOf,
  type BaySpot,
} from './scenarios';

/**
 * **Die sechs Behauptungen des Labors, nachgerechnet.**
 *
 * Jede Bucht sagt einen Satz über die Wegsuche, und bis hierher konnte man ihn
 * nur *ansehen*. Das reicht nicht: „Der Zombie läuft durch die verriegelte
 * Tür" ist ein Eindruck, und ein Eindruck lässt sich nicht wiederholen, bis
 * jemand ihn behoben hat. Hier steht derselbe Satz als Zahl — und zwar
 * durchweg als **Kontrollpunkt** und nicht als Ankunft: Ob einer ankommt, sagt
 * nichts darüber, ob er den richtigen Weg genommen hat. Wer durch die Tür
 * spaziert, kommt genauso an wie der, der außen herumgeht; erst die Frage „war
 * er dabei an der Stelle, an der er vorbeigekommen sein muss?" trennt die
 * beiden.
 */

/** Wo ein Punkt einer Bucht in der Welt liegt — bequem für Kontrollpunkte. */
function spot(id: Parameters<typeof scenarioOf>[0], at: BaySpot): { x: number; z: number } {
  return baySpot(scenarioOf(id), at);
}

describe('Die Überquerung', () => {
  /** Eine Spur aus reinen Punkten — die Höhe spielt hier keine Rolle. */
  const track = (...points: readonly [number, number][]) =>
    points.map(([x, z]) => ({ x, y: 0, z }));

  it('gibt die Stelle her, an der die Spur die Linie schneidet', () => {
    // Von Norden nach Süden über z = 0, dabei zwei Meter nach Osten: Die
    // Überquerung liegt genau in der Mitte dazwischen.
    const cross = crossedAt(track([0, -1], [2, 1]), 0);
    expect(cross?.x).toBeCloseTo(1, 9);
    expect(cross?.frame).toBe(1);
  });

  it('meldet nichts, wo niemand hinüber ist', () => {
    expect(crossedAt(track([0, -3], [5, -1]), 0)).toBeNull();
    expect(crossedAt(track([0, -1]), 0)).toBeNull();
  });

  it('sucht die zweite Überquerung erst nach der ersten', () => {
    // Hin, zurück, hin: drei Überquerungen an drei Stellen.
    const spur = track([0, -1], [0, 1], [4, -1], [8, 1]);
    const first = crossedAt(spur, 0);
    expect(first?.x).toBeCloseTo(0, 9);
    const second = crossedAt(spur, 0, first!.frame);
    expect(second?.x).toBeCloseTo(2, 9);
    expect(crossedAt(spur, 0, second!.frame)?.x).toBeCloseTo(6, 9);
  });
});

describe('Langer Gang', () => {
  it('kommt um beide Ecken beim Spieler an', () => {
    const bay = scenarioOf('corridor');
    const run = runBay('corridor', { seconds: 40 });
    const zombie = run.runners[0]!;
    // Zwei Wände mit Lücken auf verschiedenen Seiten: die östliche in der
    // hinteren Wand (lz = −2,5, Lücke lx 5…12,5), die westliche in der
    // vorderen (lz = 2,5, Lücke lx −12,5…−5). Gefragt wird nicht, wie nah er
    // an der Mitte einer Lücke vorbeikam — die Lücken sind 7,5 m breit, und
    // ein Weg, der die Ecke schneidet, geht dicht an ihrer inneren Kante
    // hindurch. Gefragt wird, **wo** er die Wandlinie überschritten hat:
    // in der Lücke oder durch die Wand.
    const east = crossedAt(zombie.track, baySpot(bay, { lx: 0, lz: -2.5 }).z);
    expect(east).not.toBeNull();
    expect(east!.x).toBeGreaterThan(baySpot(bay, { lx: 5, lz: 0 }).x);
    expect(east!.x).toBeLessThan(baySpot(bay, { lx: 12.5, lz: 0 }).x);
    // Und danach — erst danach — die zweite, auf der anderen Seite. Das ist
    // das Z, um das es in dieser Bucht geht.
    const west = crossedAt(zombie.track, baySpot(bay, { lx: 0, lz: 2.5 }).z, east!.frame);
    expect(west).not.toBeNull();
    expect(west!.x).toBeGreaterThan(baySpot(bay, { lx: -12.5, lz: 0 }).x);
    expect(west!.x).toBeLessThan(baySpot(bay, { lx: -5, lz: 0 }).x);
    expect(zombie.arrived).toBe(true);
  });

  it('schneidet die Ecken, statt sie rechtwinklig zu nehmen', () => {
    // **„Manhattan-mäßig" ist keine Zahl, sondern ein Vergleich.**
    //
    // Hier stand einmal `wander(...) < 2.2`, und die Schranke war doppelt
    // falsch: Sie war nur grün, solange der Zombie nach fünfzehn Metern an der
    // Wandecke hängen blieb und die Kennzahl gar nichts mehr maß — und für
    // einen Lauf, der das Z zu Ende geht, ist sie unerreichbar, weil die
    // Luftlinie in dieser Bucht durch zwei Wände führt (schon der bestmögliche
    // Weg liegt bei 2,17).
    //
    // Verglichen wird deshalb mit dem, was „Manhattan" wirklich heißt: dem Weg
    // über die **Kachelmitten**, den die Suche selbst findet. Wer ihn Punkt für
    // Punkt abläuft, kommt auf 47,5 m; wer die Ecken schneidet, auf gut 34.
    // Die Schranke rechnet damit bei jedem Umbau der Bucht mit, statt still
    // falsch zu werden.
    const run = runBay('corridor', { seconds: 40 });
    const zombie = run.runners[0]!;
    const bay = scenarioOf('corridor');
    const start = baySpot(bay, bay.cast[0]!);
    const goal = baySpot(bay, bay.stand);
    const found = findPath(
      run.graph,
      run.graph.nearest(start.x, start.z, 0),
      run.graph.nearest(goal.x, goal.z, 0),
      { profile: profileOf('zombie') },
    );
    let overCentres = 0;
    for (let i = 1; i < found.tiles.length; i++) {
      overCentres += tileDistance(found.tiles[i - 1]!, found.tiles[i]!);
    }
    expect(found.complete).toBe(true);
    expect(walked(zombie.track)).toBeLessThan(overCentres * 0.85);
  });
});

describe('Stachelgrube', () => {
  it('lässt den Zombie hindurch und die Puppe außen herum', () => {
    const run = runBay('pit', { seconds: 40 });
    const [zombie, dummy] = run.runners;
    const middle = spot('pit', { lx: 0, lz: 0 });
    expect(passedNear(zombie!.track, middle, 1.5)).toBe(true);
    expect(closestTo(dummy!.track, middle)).toBeGreaterThan(3);
    expect(zombie!.arrived).toBe(true);
    expect(dummy!.arrived).toBe(true);
    // Und der Umweg kostet auch etwas: Hier **taugt** die Krümmung als Zahl,
    // denn die Luftlinie ist offen — der Zombie läuft sie fast, die Puppe geht
    // deutlich außen herum.
    expect(wander(zombie!.track)).toBeLessThan(1.15);
    expect(wander(dummy!.track)).toBeGreaterThan(wander(zombie!.track) * 1.4);
  });
});

describe('Kiste im Weg', () => {
  it('nimmt den anderen Durchgang, sobald die Kiste steht', () => {
    const bay = scenarioOf('crate');
    const at = baySpot(bay, CRATE);
    const run = runBay('crate', {
      seconds: 45,
      // Die Kiste steht in der Welt (1,4 m Kante) und sperrt ihre Kachel.
      props: [{ kind: 'block', x: at.x, y: 0.7, z: at.z, w: 1.4, h: 1.4, d: 1.4 }],
      setup: (graph) => {
        graph.setBlocked(graph.at(at.x, at.z, 0), true);
      },
    });
    const zombie = run.runners[0]!;
    // Die rechte Lücke, die einzige, die bleibt.
    expect(passedNear(zombie.track, spot('crate', { lx: 6.25, lz: 0 }), 2)).toBe(true);
    // Und nicht durch die zugestellte linke.
    expect(closestTo(zombie.track, at)).toBeGreaterThan(1);
    expect(zombie.arrived).toBe(true);
  });
});

describe('Zu enger Gang', () => {
  it('lässt ihn bis an den Schlitz und keinen Schritt weiter', () => {
    const run = runBay('narrow', { seconds: 40 });
    const zombie = run.runners[0]!;
    const slit = spot('narrow', { lx: -6.25, lz: 0 });
    // So nah wie möglich: bis auf zwei Meter an den Schlitz heran.
    expect(closestTo(zombie.track, slit)).toBeLessThan(2.5);
    // Aber nie hindurch: Er bleibt auf seiner Seite der Wand.
    const bay = scenarioOf('narrow');
    // In Buchtmaßen: Er steht hinten (lz < 0), der Spieler vorne.
    const flip = bay.z < 0 ? 1 : -1;
    for (const step of zombie.track) {
      expect((step.z - bay.z) * flip).toBeLessThan(0);
    }
    expect(zombie.arrived).toBe(false);
  });
});

describe('Tür fällt zu', () => {
  it('läuft dagegen, merkt es und geht dann außen herum', () => {
    const bay = scenarioOf('door');
    const run = runBay('door', {
      seconds: 60,
      // Das Blatt steht in seiner Lücke — in der Welt und auf der Karte.
      props: [doorLeaf(bay, false)],
      brief: (runner, graph) => {
        const door = graph.door(DOOR_ID)!;
        runner.agent.belief.seeDoor(DOOR_ID, door, 0);
      },
      setup: (graph) => {
        graph.setDoor(DOOR_ID, { open: false, barred: true });
      },
    });
    const zombie = run.runners[0]!;
    // **Der Kontrollpunkt**: die Lücke ganz außen rechts, der einzige andere
    // Weg. Ohne ihn sagt „angekommen" nichts — durch die Tür kommt man auch an.
    expect(passedNear(zombie.track, spot('door', { lx: 11.25, lz: 0 }), 2)).toBe(true);
    expect(zombie.arrived).toBe(true);
  });

  it('kommt bei verriegelter Tür nirgends durch die Türlinie', () => {
    const bay = scenarioOf('door');
    const line = baySpot(bay, { lx: -6.25, lz: 0 });
    const run = runBay('door', {
      seconds: 60,
      props: [doorLeaf(bay, false)],
      setup: (graph) => {
        graph.setDoor(DOOR_ID, { open: false, barred: true });
      },
    });
    // Kein einziges Bild in der Türöffnung: Das Blatt steht dort.
    for (const step of run.runners[0]!.track) {
      const inDoorway = Math.abs(step.x - line.x) < 1.25 && Math.abs(step.z - line.z) < 0.6;
      expect(inDoorway).toBe(false);
    }
  });
});

describe('Portal, von dem einer weiß', () => {
  it('bringt den, der davon weiß, schneller ans Ziel', () => {
    const run = runBay('portal', {
      seconds: 45,
      setup: (graph) => {
        expect(openLabPortal(graph)).toBe(true);
      },
      brief: (runner, graph) => {
        // Der zweite hat nicht hingesehen — für ihn gibt es das Portal nicht.
        if (runner.at.z === baySpot(scenarioOf('portal'), scenarioOf('portal').cast[1]!).z) {
          for (const id of ['navlab-portal:in', 'navlab-portal:out']) {
            runner.agent.belief.hideLink(id, 0);
            void graph;
          }
        }
      },
    });
    const [knowing, blind] = run.runners;
    expect(knowing!.arrived).toBe(true);
    // Der Blinde läuft außen herum — er braucht dafür länger. Gemessen wird die
    // **Zeit** und nicht die Strecke: Wer ein Portal nimmt, legt in einem Bild
    // fünfzehn Meter zurück, und das sieht in jeder Längenrechnung nach einem
    // Umweg aus.
    expect(blind!.arrivedAfter).toBeGreaterThan(knowing!.arrivedAfter + 3);
  });
});

describe('Vom Dach herunter', () => {
  it('sucht sich die Kante, springt und kommt an', () => {
    const run = runBay('levels', { seconds: 45 });
    const zombie = run.runners[0]!;
    expect(zombie.track[0]!.y).toBeCloseTo(2.4);
    // Irgendwann steht er unten.
    expect(zombie.at.y).toBeCloseTo(0);
    expect(zombie.arrived).toBe(true);
  });
});

describe('Podest und Sprung', () => {
  it('lässt die Puppe hinüberspringen und den Zombie darunter stehen', () => {
    const run = runBay('podium', { seconds: 60 });
    const [dummy, zombie] = run.runners;
    // Die Puppe nimmt die Rampe und springt: Sie steht am Ende oben.
    expect(dummy!.at.y).toBeCloseTo(PODIUM.high);
    expect(dummy!.arrived).toBe(true);
    // Der Zombie kann nicht springen — er steht unten, so nah wie möglich.
    expect(zombie!.at.y).toBeCloseTo(0);
    expect(zombie!.arrived).toBe(false);
    expect(zombie!.nearest).toBeLessThan(4.5);
  });
});
