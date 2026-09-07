import { GridPlan } from './gridPlan';
import { DIR_E, DIR_N, DIR_S, TILE, tileKey } from '../nav/navTile';
import { BLOCKS } from './blocks';
import {
  WORLD_FORMAT,
  WORLD_VERSION,
  WorldFormatError,
  compare,
  readWorld,
  worldFileName,
  writeWorld,
} from './worldFile';

/**
 * Eine kleine, aber vollständige Welt: Zimmer mit Wänden und Tür, ein Dach als
 * **Masse**, Möbel darin und eine Kachel mit eigenen Kosten.
 *
 * Genau diese vier Sachen sind es, an denen eine gespeicherte Welt vorher
 * gescheitert wäre — das Dach fehlte ganz, und die Kosten kamen beim zweiten
 * Laden doppelt.
 */
function house(): GridPlan {
  const plan = new GridPlan([0, 3]);
  plan.room({ x: 0, z: 0, w: 4, d: 4 }, { walls: true });
  plan.door(1, 3, DIR_S);
  plan.mass('wood', { x: 0, z: 0, w: 4, d: 4 }, 2.8, 3.1);
  plan.put('counter', 0, 0, DIR_N);
  plan.put('table', 2, 2, DIR_E);
  return plan;
}

/** Eine Datei einmal durch JSON schicken — so kommt sie auch aus dem Speicher. */
function roundTrip(plan: GridPlan): GridPlan {
  const text = JSON.stringify(writeWorld(plan, { world: 'test', name: 'Testhaus' }));
  const read = readWorld(JSON.parse(text));
  return new GridPlan(read.graph.levels).restore(read.graph, read.blocks, read.masses);
}

describe('Eine Welt als Datei', () => {
  it('trägt Format und Versionsnummer', () => {
    const file = writeWorld(house(), { world: 'test', saved: '2026-09-07T10:00:00.000Z' });
    expect(file.format).toBe(WORLD_FORMAT);
    expect(file.version).toBe('0.1.0');
    expect(file.world).toBe('test');
    expect(file.saved).toBe('2026-09-07T10:00:00.000Z');
  });

  it('nimmt die Kachelgröße über den Grundriss mit', () => {
    expect(writeWorld(house()).nav.tile).toBe(TILE);
  });

  it('bringt Kacheln, Wände und Türen unverändert zurück', () => {
    const before = house();
    const after = roundTrip(before);
    expect(after.graph.size).toBe(before.graph.size);
    expect(after.graph.wall(tileKey(0, 0, 0), DIR_N)?.kind).toBe('solid');
    expect(after.graph.wall(tileKey(1, 3, 0), DIR_S)?.kind).toBe('door');
    expect([...after.graph.doorIds()]).toEqual([...before.graph.doorIds()]);
  });

  it('behält die Etagen', () => {
    expect(roundTrip(house()).graph.levels).toEqual([0, 3]);
  });

  /**
   * **Der Grund, warum es dieses Format gibt.** Ein Dach steht in keinem
   * Navigationsgraphen; eine Welt, die es beim Speichern verliert, ist eine
   * Welt, in die es hineinregnet.
   */
  it('bringt die Massen zurück — sonst fehlte jedes Dach', () => {
    const after = roundTrip(house());
    expect(after.masses()).toHaveLength(1);
    expect(after.masses()[0]).toMatchObject({
      kind: 'wood',
      from: 2.8,
      to: 3.1,
      rect: { x: 0, z: 0, w: 4, d: 4 },
    });
    // Und damit steht das Dach auch wirklich wieder als Quader da.
    expect(after.solids().some((one) => one.kind === 'wood' && one.h > 0.2)).toBe(true);
  });

  it('bringt die Bausteine samt Blickrichtung zurück', () => {
    const after = roundTrip(house());
    expect(after.blocksOn(tileKey(0, 0, 0))).toEqual([
      { kind: 'counter', tile: tileKey(0, 0, 0), dir: DIR_N },
    ]);
    expect(after.blocksOn(tileKey(2, 2, 0))[0]!.dir).toBe(DIR_E);
  });

  /**
   * `2.8 + 0.3` ist in Fließkomma `3.0999999999999996`. Es rechnet sich damit
   * richtig weiter — aber eine Datei, die man aufmacht und liest, soll nicht
   * aussehen, als hätte jemand gewürfelt.
   */
  it('schreibt runde Zahlen statt Fließkommarauschen', () => {
    const plan = new GridPlan();
    plan.room({ x: 0, z: 0, w: 2, d: 2 });
    plan.mass('wood', { x: 0, z: 0, w: 2, d: 2 }, 2.8, 2.8 + 0.3);
    expect(writeWorld(plan).masses[0]!.to).toBe(3.1);
  });

  it('stellt Format, Herkunft und Datum an den Anfang der Datei', () => {
    const keys = Object.keys(writeWorld(house(), { world: 'test', name: 'Testhaus' }));
    expect(keys.slice(0, 5)).toEqual(['format', 'version', 'world', 'name', 'saved']);
  });

  it('schreibt Kacheln als Zahlen und nicht als gepackten Schlüssel', () => {
    const file = writeWorld(house());
    expect(file.blocks[0]).toMatchObject({ kind: 'counter', x: 0, z: 0, dir: DIR_N });
    expect(file.blocks[0]).not.toHaveProperty('tile');
  });
});

/**
 * **Der Fehler, der erst beim zweiten Laden aufflöge.** In den Kacheldaten
 * eines laufenden Plans stecken die Aufschläge der Bausteine schon drin; wer
 * sie speichert, als Grundwert nimmt und die Bausteine danach anwendet, zählt
 * jeden zweimal. Nach dem dritten Laden ist die Küche unbegehbar.
 */
describe('Die Kosten laufen nicht davon', () => {
  it('hält den Aufschlag einer Küchenzeile über drei Runden konstant', () => {
    const tile = tileKey(0, 0, 0);
    let plan = house();
    const once = plan.graph.tile(tile)!.cost;
    expect(once).toBeCloseTo(BLOCKS.counter.cost);

    for (let round = 0; round < 3; round++) {
      plan = roundTrip(plan);
      expect(plan.graph.tile(tile)!.cost).toBeCloseTo(once);
    }
  });

  it('behält eigene Kosten einer Welt, die keine Bausteine trägt', () => {
    const plan = new GridPlan();
    plan.room({ x: 0, z: 0, w: 2, d: 2 }, { facts: { cost: 3 } });
    const after = roundTrip(plan);
    expect(after.graph.tile(tileKey(1, 1, 0))!.cost).toBeCloseTo(3);
  });

  it('rechnet eigene Kosten und einen Baustein zusammen — aber nur einmal', () => {
    const plan = new GridPlan();
    plan.room({ x: 0, z: 0, w: 2, d: 2 }, { facts: { cost: 2 } });
    plan.put('table', 0, 0, DIR_N);
    const tile = tileKey(0, 0, 0);
    const once = plan.graph.tile(tile)!.cost;
    expect(once).toBeCloseTo(2 * BLOCKS.table.cost);
    expect(roundTrip(roundTrip(plan)).graph.tile(tile)!.cost).toBeCloseTo(once);
  });

  it('behält die Gefahr einer Kachel — die kommt nicht von Möbeln', () => {
    const plan = new GridPlan();
    plan.room({ x: 0, z: 0, w: 2, d: 2 }, { facts: { hazard: 5 } });
    expect(roundTrip(plan).graph.tile(tileKey(0, 0, 0))!.hazard).toBe(5);
  });

  it('behält eine angehobene Kachel', () => {
    const plan = new GridPlan();
    plan.room({ x: 0, z: 0, w: 2, d: 2 }, { facts: { rise: 0.4 } });
    expect(roundTrip(plan).graph.tile(tileKey(0, 0, 0))!.rise).toBeCloseTo(0.4);
  });
});

describe('Was eine Datei sein muss', () => {
  it('lehnt ab, was keine ist', () => {
    expect(() => readWorld(null)).toThrow(WorldFormatError);
    expect(() => readWorld('welt')).toThrow(WorldFormatError);
    expect(() => readWorld({})).toThrow(/Fremdes Format/);
  });

  it('lehnt ein fremdes Format ab und sagt, welches erwartet war', () => {
    expect(() => readWorld({ format: 'vrnav', version: '0.1.0' })).toThrow(/baumgartner-welt/);
  });

  it('besteht auf einer Versionsnummer', () => {
    expect(() => readWorld({ format: WORLD_FORMAT })).toThrow(/Versionsnummer/);
    expect(() => readWorld({ format: WORLD_FORMAT, version: 3 })).toThrow(/Versionsnummer/);
  });

  /**
   * Zu neu und zu alt sind zwei verschiedene Fehler, und die Meldung ist das
   * Einzige, woran jemand sieht, ob er ein Programm oder eine Datei
   * aktualisieren muss.
   */
  it('unterscheidet eine Welt aus der Zukunft von einer aus der Vergangenheit', () => {
    expect(() => readWorld({ format: WORLD_FORMAT, version: '0.9.0' })).toThrow(
      /aktualisiere das Programm/,
    );
    expect(() => readWorld({ format: WORLD_FORMAT, version: '0.0.3' })).toThrow(/nicht mehr lesen/);
  });

  it('liest eine Patch-Fassung derselben Zeile', () => {
    const file = writeWorld(house());
    const patched = { ...file, version: '0.1.7' };
    expect(() => readWorld(patched)).not.toThrow();
  });

  it('sagt, wenn der Grundriss fehlt', () => {
    expect(() => readWorld({ format: WORLD_FORMAT, version: WORLD_VERSION })).toThrow(/Grundriss/);
  });

  it('reicht die Meldung des Grundrisses durch', () => {
    const file = writeWorld(house());
    const wrong = { ...file, nav: { ...file.nav, tile: file.nav.tile * 2 } };
    expect(() => readWorld(wrong)).toThrow(/Grundriss:.*Kachel/);
  });
});

describe('Was eine Datei überstehen muss', () => {
  it('lässt einen Baustein weg, unter dem kein Boden liegt', () => {
    const file = writeWorld(house());
    file.blocks.push({ kind: 'table', x: 40, z: 40, dir: DIR_N });
    expect(readWorld(file).blocks).toHaveLength(2);
  });

  it('lässt eine unbekannte Baustein-Sorte weg, statt die Welt zu verlieren', () => {
    const file = writeWorld(house());
    (file.blocks as unknown[]).push({ kind: 'schrank', x: 1, z: 1, dir: DIR_N });
    expect(readWorld(file).blocks).toHaveLength(2);
  });

  it('lässt eine Kachel außerhalb des Gitters weg, statt zu werfen', () => {
    const file = writeWorld(house());
    file.blocks.push({ kind: 'table', x: 99999, z: 0, dir: DIR_N });
    expect(() => readWorld(file)).not.toThrow();
  });

  /**
   * Bei den Massen wird **nicht** stillschweigend weggelassen: Ein fehlendes
   * Dach ist eine Welt, in die es hineinregnet.
   */
  it('bricht bei einer kaputten Masse ab', () => {
    const file = writeWorld(house());
    (file.masses as unknown[]).push({ kind: 'wood', x: 0, z: 0, w: 1 });
    expect(() => readWorld(file)).toThrow(/Masse 1/);
  });

  it('bricht bei einer Masse mit unbekannter Sorte ab', () => {
    const file = writeWorld(house());
    (file.masses as unknown[]).push({ kind: 'gold', x: 0, z: 0, w: 1, d: 1, from: 0, to: 1 });
    expect(() => readWorld(file)).toThrow(/unbekannte Sorte/);
  });

  it('kommt ohne „blocks" und ohne „masses" aus', () => {
    const file = writeWorld(house()) as unknown as Record<string, unknown>;
    delete file.blocks;
    delete file.masses;
    const read = readWorld(file);
    expect(read.blocks).toEqual([]);
    expect(read.masses).toEqual([]);
  });
});

describe('Versionen vergleichen', () => {
  it('ordnet nach Haupt-, Neben- und Patchnummer', () => {
    expect(compare('0.1.0', '0.1.0')).toBe(0);
    expect(compare('0.1.0', '0.2.0')).toBe(-1);
    expect(compare('1.0.0', '0.9.9')).toBe(1);
    expect(compare('0.1.2', '0.1.10')).toBe(-1);
  });
});

describe('Der Dateiname', () => {
  it('nimmt Namen und Datum', () => {
    expect(worldFileName({ name: 'Dunkelhaus', saved: '2026-09-07T10:00:00.000Z' })).toBe(
      'dunkelhaus-2026-09-07.welt.json',
    );
  });

  it('macht aus Umlauten und Leerzeichen etwas, das jedes Dateisystem mag', () => {
    expect(worldFileName({ name: 'Große Höhle #2', saved: '2026-01-02T00:00:00.000Z' })).toBe(
      'grosse-hoehle-2-2026-01-02.welt.json',
    );
  });

  it('fällt auf die Welt-Id und dann auf „welt" zurück', () => {
    expect(worldFileName({ world: 'dark', saved: '2026-01-02T00:00:00.000Z' })).toBe(
      'dark-2026-01-02.welt.json',
    );
    expect(worldFileName({ saved: '2026-01-02T00:00:00.000Z' })).toBe('welt-2026-01-02.welt.json');
  });
});
