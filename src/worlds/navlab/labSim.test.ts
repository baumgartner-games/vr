import { closestTo, passedNear, runBay, wander } from './labSim';
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

describe('Langer Gang', () => {
  it('kommt um beide Ecken beim Spieler an', () => {
    const run = runBay('corridor', { seconds: 40 });
    const zombie = run.runners[0]!;
    // Zwei Lücken auf verschiedenen Seiten: die östliche in der hinteren Wand,
    // die westliche in der vorderen. Wer an beiden vorbeikam, hat das Z
    // gelaufen und ist nicht durch eine Wand gegangen.
    expect(passedNear(zombie.track, spot('corridor', { lx: 8.75, lz: -2.5 }), 2)).toBe(true);
    expect(passedNear(zombie.track, spot('corridor', { lx: -8.75, lz: 2.5 }), 2)).toBe(true);
    expect(zombie.arrived).toBe(true);
  });

  it('schneidet die Ecken, statt sie rechtwinklig zu nehmen', () => {
    // Die Zahl hinter „läuft Manhattan-mäßig": Der Weg durch das Z ist lang,
    // aber er darf nicht doppelt so lang sein wie die Luftlinie.
    const run = runBay('corridor', { seconds: 40 });
    expect(wander(run.runners[0]!.track)).toBeLessThan(2.2);
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
