import { breakTime, type DoorMaterial } from '../nav/navDoor';
import { doorBroken } from '../nav/navGraph';
import { findPath } from '../nav/navPath';
import { HAZARD_SPIKES, profileOf } from '../nav/navProfile';
import { NO_TILE, TILE, tileDistance } from '../nav/navTile';
import { npcSkin } from '../npc/npcKinds';
import { bakeLab, closestTo, crossedAt, passedNear, runBay, walked } from './labSim';
import {
  CRATE,
  DOOR_ID,
  PIT,
  PIT_DAMAGE,
  PIT_DEPTH,
  PODIUM,
  RAMP,
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
  it('legt über das Loch einen Weg mit Stacheln — das ist die Falle', () => {
    // **Die eine Stelle, an der die Karte etwas anderes sagt als die Welt**,
    // und zwar mit Absicht: Das Abtasten findet über der Grube keinen Boden
    // (sie ist ein Loch), die Bucht legt dort trotzdem Kacheln hin
    // (`applyLabMap`). Ohne sie plante *niemand* mehr durch die Grube, und aus
    // der Falle würde eine Wand, um die beide Sorten herumgehen.
    const graph = runBay('pit', { seconds: 0 }).graph;
    const middle = spot('pit', { lx: 0, lz: 0 });
    const key = graph.at(middle.x, middle.z, 0);
    expect(key).not.toBe(NO_TILE);
    expect(graph.tile(key)!.hazard & HAZARD_SPIKES).toBe(HAZARD_SPIKES);
    // Und sie liegt auf der Höhe des Bodens ringsum: Auf der Karte ist das ein
    // Weg wie jeder andere — bloß einer mit Stacheln darauf.
    expect(graph.worldOf(key).y).toBeCloseTo(0);
  });

  it('lässt den Zombie in die Falle fallen und darin sterben', () => {
    const run = runBay('pit', { seconds: 40 });
    const zombie = run.runners[0]!;
    const middle = spot('pit', { lx: 0, lz: 0 });
    // Er plant geradeaus — die Stacheln kosten ihn nichts (`ZOMBIE_PROFILE`) —
    // und läuft dabei über eine Kante, die auf seiner Karte gar nicht steht.
    expect(passedNear(zombie.track, middle, 3)).toBe(true);
    // Unten angekommen, und zwar wirklich unten: die Grube ist ein Loch und
    // kein Anstrich.
    expect(zombie.at.y).toBeCloseTo(-PIT_DEPTH);
    // Und er kommt dort nicht mehr heraus, sondern bleibt liegen.
    expect(zombie.dead).toBe(true);
    expect(zombie.health).toBe(0);
    expect(zombie.arrived).toBe(false);
    // Zwei Sekunden Stacheln, mehr braucht es nicht (`PIT_DAMAGE`).
    expect(npcSkin('zombie').health / PIT_DAMAGE).toBeLessThan(3);
  });

  it('führt die Puppe dicht an der Grube vorbei und nicht an der Wand entlang', () => {
    const run = runBay('pit', { seconds: 40 });
    const dummy = run.runners[1]!;
    const bay = scenarioOf('pit');
    const middle = spot('pit', { lx: 0, lz: 0 });
    // Sie liest die Stacheln (`HUMAN_PROFILE`) und geht außen herum — heil,
    // trocken und angekommen.
    expect(closestTo(dummy.track, middle)).toBeGreaterThan(3);
    expect(dummy.dead).toBe(false);
    expect(dummy.at.y).toBeCloseTo(0);
    expect(dummy.arrived).toBe(true);

    // **Und zwar dicht daran vorbei.** Das ist die Zahl, wegen der es diesen
    // Test gibt: Sie lief einmal einen Bogen bis an die Ostwand der Bucht,
    // weil das Anmalen der Grube eine Kachelspalte zu weit reichte
    // (`navBuild.paintRect`). Auf der Karte war die Grube damit sieben Kacheln
    // breit statt sechs — und der einzige freie Streifen östlich davon der an
    // der Wand. Erlaubt ist deshalb genau **eine** Kachel Luft neben der
    // Grube; alles darüber ist wieder der alte Bogen.
    let east = -Infinity;
    for (const step of dummy.track) east = Math.max(east, step.x - bay.x);
    expect(east).toBeGreaterThan(PIT.maxLx);
    expect(east).toBeLessThan(PIT.maxLx + TILE);
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
    const track = run.runners[0]!.track;
    // **Davorstehen ja, hindurch nein.** Er *soll* hingehen — das ist die
    // Freiraum-Annahme (`nav/navBelief.ts`, `hopeful`), und ohne sie wüsste er
    // von einem Riegel, den niemand ihm gezeigt hat. Was das Blatt verhindert,
    // ist der Schritt auf die andere Seite: Keine einzige Überquerung der
    // Wandlinie liegt in der Türöffnung.
    expect(closestTo(track, line)).toBeLessThan(1.5);
    let cross = crossedAt(track, line.z);
    while (cross) {
      expect(Math.abs(cross.x - line.x)).toBeGreaterThan(1.25);
      cross = crossedAt(track, line.z, cross.frame);
    }
  });
});

describe('Tür aus Metall oder aus Holz', () => {
  const bay = scenarioOf('door');
  /** Die Wandlinie quer durch die Bucht — auf ihrer Höhe hat er sie überquert. */
  const line = baySpot(bay, { lx: 0, lz: 0 }).z;
  /** Die beiden Lücken in dieser Wand, in Weltmaßen (`INSIDE.door`). */
  const doorway = [baySpot(bay, { lx: -7.5, lz: 0 }).x, baySpot(bay, { lx: -5, lz: 0 }).x];
  const around = [baySpot(bay, { lx: 10, lz: 0 }).x, baySpot(bay, { lx: 12.5, lz: 0 }).x];

  /**
   * Ein Durchlauf mit **geschlossener** Tür — nicht verriegelt, nur zu.
   *
   * Das ist der Fall, um den es hier geht: Bis es Material gab, war eine bloß
   * geschlossene Tür für jeden Zombie eine Wand; jetzt entscheidet, woraus sie
   * ist. Das Blatt steht dabei in seiner Lücke — in der Welt und auf der Karte,
   * denn eine Tür, die nur auf der Karte zu ist, hält niemanden auf.
   */
  const shut = (material: DoorMaterial) =>
    runBay('door', {
      seconds: 60,
      props: [doorLeaf(bay, false)],
      setup: (graph) => {
        graph.setDoor(DOOR_ID, { open: false, material });
      },
    });

  it('schickt ihn an der Metalltür zwingend außen herum', () => {
    // **Der Kontrollpunkt.** Diese Bucht hat genau zwei Lücken in ihrer Wand:
    // die mit der Tür und die ganz außen rechts. Ist die Tür aus Metall, bleibt
    // nur eine — und „angekommen" allein bewiese gar nichts, denn durch die Tür
    // käme er genauso an. Gefragt wird deshalb, **wo** er die Wandlinie
    // überschritten hat.
    const run = shut('metal');
    const zombie = run.runners[0]!;
    expect(passedNear(zombie.track, spot('door', { lx: 11.25, lz: 0 }), 2)).toBe(true);

    const cross = crossedAt(zombie.track, line);
    expect(cross).not.toBeNull();
    expect(cross!.x).toBeGreaterThan(Math.min(...around));
    expect(cross!.x).toBeLessThan(Math.max(...around));
    // Und keine einzige Überquerung durch die Türöffnung — auch keine spätere.
    let next = crossedAt(zombie.track, line);
    while (next) {
      const throughDoor = next.x > Math.min(...doorway) && next.x < Math.max(...doorway);
      expect(throughDoor).toBe(false);
      next = crossedAt(zombie.track, line, next.frame);
    }
    // Die Tür hält: Sie steht am Ende noch, und er hat sie nicht angerührt.
    expect(zombie.broke).toEqual([]);
    expect(run.graph.door(DOOR_ID)!.health).toBe(Infinity);
    expect(zombie.arrived).toBe(true);
  });

  it('geht erst zur Metalltür und erst dann außen herum', () => {
    // **Der Umweg fängt an der Tür an und nicht am Start.** Vorher wusste er
    // von einer Tür, die er nie gesehen hatte, dass sie zu ist, und bog schon
    // dreißig Meter davor ab — Hellsicht, die man ihm ansah, ohne sagen zu
    // können, woran. Jetzt hält er sie für offen (`nav/navBelief.ts`,
    // `hopeful`), läuft hin, steht davor, sieht sie an und plant dort um.
    const run = shut('metal');
    const zombie = run.runners[0]!;
    const door = baySpot(bay, { lx: -6.25, lz: 0 });
    // Bis an das Blatt heran: Halbmesser plus halbe Blattdicke, mehr nicht.
    expect(closestTo(zombie.track, door)).toBeLessThan(1.5);
    // Und er weiß jetzt, woran es lag — vorher wusste er es, ohne hinzusehen.
    expect(zombie.agent.belief.doorOpinion(DOOR_ID)).toMatchObject({ known: true, open: false });

    // Der Umweg kommt trotzdem zustande, und zwar erst danach.
    const cross = crossedAt(zombie.track, line)!;
    expect(cross.x).toBeGreaterThan(Math.min(...around));
    expect(zombie.arrived).toBe(true);
  });

  it('geht auch zur hölzernen hin und schlägt sie dort ein', () => {
    // Dieselbe Annahme, das andere Ende: Er läuft hin, sieht eine Tür aus
    // Brettern — und für die ist der kurze Weg auch nach dem Hinsehen noch der
    // kurze. Drei Sekunden Prügel, und er geht geradeaus hindurch.
    const run = shut('wood');
    const zombie = run.runners[0]!;
    const door = baySpot(bay, { lx: -6.25, lz: 0 });
    expect(closestTo(zombie.track, door)).toBeLessThan(1.5);
    expect(zombie.agent.belief.doorOpinion(DOOR_ID)).toMatchObject({ known: true, open: false });
    expect(zombie.broke).toEqual([DOOR_ID]);
  });

  it('lässt ihn die hölzerne einschlagen und geradeaus hindurchgehen', () => {
    // Dieselbe Bucht, dieselbe geschlossene Tür, ein anderes Material: Jetzt
    // ist der Umweg der teurere Weg, und er nimmt den kurzen — mit drei
    // Sekunden Aufenthalt davor, in denen sich gar nichts bewegt.
    const run = shut('wood');
    const zombie = run.runners[0]!;
    expect(zombie.broke).toEqual([DOOR_ID]);
    expect(run.graph.door(DOOR_ID)!.health).toBe(0);
    // Er hat wirklich davorgestanden und ist nicht hindurchspaziert.
    expect(zombie.atDoor).toBeGreaterThan(breakTime('wood') * 0.9);

    const cross = crossedAt(zombie.track, line);
    expect(cross).not.toBeNull();
    expect(cross!.x).toBeGreaterThan(Math.min(...doorway));
    expect(cross!.x).toBeLessThan(Math.max(...doorway));
    expect(zombie.arrived).toBe(true);
  });

  it('macht aus der eingeschlagenen Tür einen Weg, der niemanden mehr aufhält', () => {
    // Wer hinterherkommt, findet ein Loch: kein Aufschlag, keine Meinung, kein
    // zweites Einschlagen. Das ist der Unterschied zwischen einer Tür, die
    // wieder zufällt, und einer, die hin ist.
    const run = shut('wood');
    const graph = run.graph;
    expect(doorBroken(graph.door(DOOR_ID))).toBe(true);
    // Und sie geht auch nicht wieder zu — ein Szenario, das das versuchte,
    // hätte ein Loch, das niemand sieht.
    expect(graph.setDoor(DOOR_ID, { open: false })).toBe(false);
    expect(doorBroken(graph.door(DOOR_ID))).toBe(true);
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
    // **Und der Sprung hat ihn etwas gekostet** — 2,4 m sind über dem, was
    // umsonst ist (`nav/navFall.ts`). Ohne diese Zeile wäre der Fallschaden
    // eine Behauptung, die nur die Wegsuche kennt.
    expect(zombie.health).toBeLessThan(npcSkin('zombie').health);
    expect(zombie.dead).toBe(false);
  });

  it('lässt den Hamster oben stehen, weil er den Sprung nicht überlebt', () => {
    // **Dieselbe Kante, dieselbe Karte, ein anderes Leben.** Der Hamster hat
    // zwanzig (`npcKinds.ts`), und `navFall.safeFall` macht daraus zwei Meter —
    // das Dach ist 2,4 hoch. Er sieht den Spieler, er will zu ihm, und er
    // bleibt trotzdem oben: Der einzige Weg hinunter zöge ihm mehr ab, als er
    // hat.
    const run = runBay('levels', { seconds: 45 });
    const hamster = run.runners[1]!;
    expect(hamster.kind).toBe('hamster');
    expect(hamster.at.y).toBeCloseTo(2.4);
    expect(hamster.dead).toBe(false);
    expect(hamster.health).toBe(npcSkin('hamster').health);
    expect(hamster.arrived).toBe(false);
  });

  it('lässt ihn springen, sobald er mehr aushält', () => {
    // **Die Gegenprobe**, und sie ist der eigentliche Beweis: Nicht die Sorte
    // hält ihn oben, sondern die Rechnung. Mit dem Leben eines Zombies nimmt
    // derselbe Hamster dieselbe Kante.
    const run = runBay('levels', { seconds: 45, profiles: { hamster: 'zombie' } });
    const hamster = run.runners[1]!;
    expect(hamster.at.y).toBeCloseTo(0);
    // Und er liegt unten: Der Fallschaden ist derselbe, den die Wegsuche vorher
    // ausgerechnet hat — nur hat ihn diesmal niemand gelesen.
    expect(hamster.dead).toBe(true);
  });
});

describe('Die drei Schalter', () => {
  /**
   * **Was ein Schalter wert ist, sieht man erst, wenn er aus ist.**
   *
   * Die Ebenen zeigen etwas, die Schalter wirken (`nav/navSwitches.ts`) — und
   * eine Ansicht, die man an- und ausknipsen kann, beweist gar nichts. Diese
   * drei Zeilen beweisen es: Dieselbe Bucht, derselbe Zombie, ein Schalter
   * aus, ein anderes Verhalten.
   */
  it('lässt ohne Verbindungen niemanden mehr springen', () => {
    const run = runBay('podium', {
      seconds: 60,
      setup: (graph) => {
        graph.setFeature('links', false);
      },
    });
    const [dummy] = run.runners;
    // Mit Verbindungen nimmt die Puppe Rampe und Sprung und steht oben
    // (`Podest und Sprung`). Ohne sie gibt es den Sprung nicht — sie kommt
    // zwar hinauf, aber nicht hinüber.
    expect(dummy!.arrived).toBe(false);
  });

  it('lässt ohne Hindernisse den Weg mitten durch die Kiste laufen', () => {
    const bay = scenarioOf('crate');
    const at = baySpot(bay, CRATE);
    const run = runBay('crate', {
      seconds: 45,
      props: [{ kind: 'block', x: at.x, y: 0.7, z: at.z, w: 1.4, h: 1.4, d: 1.4 }],
      setup: (graph) => {
        graph.setBlocked(graph.at(at.x, at.z, 0), true);
        graph.setFeature('obstacles', false);
      },
    });
    const zombie = run.runners[0]!;
    // Er plant durch die zugestellte Lücke — und rennt dort gegen die Kiste,
    // die in der Welt sehr wohl steht. Genau das ist die Antwort auf die Frage,
    // wozu ein Nav-Mesh-Obstacle da ist.
    expect(closestTo(zombie.track, at)).toBeLessThan(1.5);
    expect(passedNear(zombie.track, spot('crate', { lx: 6.25, lz: 0 }), 2)).toBe(false);
    expect(zombie.arrived).toBe(false);
  });

  it('lässt eine ausgeschaltete Sperre auch nicht mehr als Sperre gelten', () => {
    // Der Eintrag bleibt, er zählt bloß nicht — daran hängt, dass die
    // Debug-Ansicht weiter zeichnet, was da ist (`NavGraph.features`).
    const graph = runBay('crate', { seconds: 0 }).graph;
    const at = baySpot(scenarioOf('crate'), CRATE);
    const key = graph.at(at.x, at.z, 0);
    graph.setBlocked(key, true);
    expect(graph.isBlocked(key)).toBe(true);
    graph.setFeature('obstacles', false);
    expect(graph.isBlocked(key)).toBe(false);
    expect([...graph.blockedKeys()]).toContain(key);
  });
});

describe('Podest und Sprung', () => {
  it('lässt die Puppe hinüberspringen und den Zombie darunter stehen', () => {
    const run = runBay('podium', { seconds: 60 });
    const [dummy, zombie] = run.runners;
    // **Am Ende steht sie auf dem freistehenden Podest** — nicht irgendwo auf
    // 2,4 m Höhe, sondern auf dem einen Klotz, den man nur mit einem Sprung
    // erreicht (`PODIUM.far`). Genau das ist die Behauptung dieser Bucht, und
    // „oben" allein bewiese sie nicht: Auf das nahe Podest kommt man auch die
    // Rampe hinauf, und dort blieb sie in der Brille stehen.
    const bay = scenarioOf('podium');
    expect(dummy!.at.y).toBeCloseTo(PODIUM.high);
    expect(dummy!.at.x - bay.x).toBeGreaterThan(PODIUM.far.minLx);
    expect(dummy!.at.x - bay.x).toBeLessThan(PODIUM.far.maxLx);
    expect(dummy!.arrived).toBe(true);
    // Der Zombie kann nicht springen — er steht unten, so nah wie möglich.
    expect(zombie!.at.y).toBeCloseTo(0);
    expect(zombie!.arrived).toBe(false);
    expect(zombie!.nearest).toBeLessThan(4.5);
  });
});

describe('Die beiden Steigungen', () => {
  it('lässt beide die flache hinaufspringen', () => {
    // Vier Stufen von 60 cm: zu hoch zum Treten (`stepUp`), gerade recht zum
    // Hochziehen (`jumpUp`) — und oben steht der Spieler.
    const run = runBay('ramp', { seconds: 45 });
    for (const runner of run.runners) {
      expect(runner.at.y).toBeCloseTo(RAMP.high);
      expect(runner.arrived).toBe(true);
      // Hinaufgesprungen heißt nicht hinuntergefallen: Wer die Stufen nimmt,
      // kommt heil oben an.
      expect(runner.health).toBe(npcSkin(runner.kind).health);
    }
  });

  it('lässt beide vor der steilen stehen', () => {
    // **Dieselbe Höhe, und diesmal kommt keiner hinauf.** Die Stufen sind hier
    // zwölf Zentimeter hoch — die tritt jeder. Was ihn aufhält, ist der Winkel
    // und sonst nichts (`nav/navProfile.ts`, `maxSlope`).
    const run = runBay('steep', { seconds: 45 });
    for (const runner of run.runners) {
      expect(runner.at.y).toBeCloseTo(0);
      expect(runner.arrived).toBe(false);
      // Er steht aber auch nicht irgendwo herum, sondern so nah am Spieler, wie
      // die Karte ihn lässt: unten an der Wand des Podests.
      expect(runner.nearest).toBeLessThan(6);
    }
  });

  it('lässt den hinauf, dem die Steigung reicht', () => {
    // **Die Gegenprobe zur steilen Bucht.** Ein Kleintier geht steiler als ein
    // Mensch (`CRITTER_PROFILE.maxSlope`) — und derselbe Weg, vor dem der
    // Zombie steht, führt es hinauf. Damit hängt das Verhalten wirklich an der
    // einen Zahl und nicht an der Bucht.
    const bay = scenarioOf('steep');
    const graph = bakeLab();
    const foot = baySpot(bay, { lx: -1.25, lz: 3.75 });
    const deck = baySpot(bay, { lx: -1.25, lz: -3.75 });
    const from = graph.at(foot.x, foot.z, 0);
    const to = graph.at(deck.x, deck.z, RAMP.high);
    expect(from).not.toBe(NO_TILE);
    expect(to).not.toBe(NO_TILE);
    expect(findPath(graph, from, to, { profile: profileOf('zombie') }).complete).toBe(false);
    expect(findPath(graph, from, to, { profile: profileOf('critter') }).complete).toBe(true);
  });
});
