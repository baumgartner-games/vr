import { addPortal, connect, fillRect, setDoor, setWindow, wallRect } from './navBuild';
import { NavGraph } from './navGraph';
import { NAV_FORMAT, NAV_VERSION, NavFormatError, readNav, writeNav } from './navSerial';
import { DIR_E, DIR_N, TILE, tileKey } from './navTile';

/** Eine kleine Karte mit allem, was das Format kennt. */
function sample(): NavGraph {
  const graph = new NavGraph([0, 3.1]);
  fillRect(graph, { x: -2, z: -2, w: 6, d: 5 });
  fillRect(graph, { x: 0, z: 0, w: 3, d: 3, level: 1 });
  fillRect(graph, { x: 1, z: 1, w: 2, d: 1 }, { cost: 1.6, hazard: 5, rise: 0.4 });
  wallRect(graph, { x: -2, z: -2, w: 6, d: 5 });
  setDoor(graph, tileKey(0, -2, 0), DIR_N, 'tuer-1', false);
  setWindow(graph, tileKey(3, 0, 0), DIR_E);
  connect(graph, 'treppe', tileKey(2, 2, 0), tileKey(2, 2, 1), 'stairs');
  addPortal(graph, 'portal-3', tileKey(-1, -1, 0), tileKey(1, 1, 1));
  return graph;
}

/** Wie eine Karte über die Platte ginge: durch JSON und zurück. */
function roundTrip(graph: NavGraph): NavGraph {
  return readNav(JSON.parse(JSON.stringify(writeNav(graph, 'Probe'))));
}

describe('Das Format', () => {
  it('trägt Kennung, Version und Kachelgröße im Kopf', () => {
    const file = writeNav(new NavGraph(), 'Leer');
    expect(file.format).toBe(NAV_FORMAT);
    expect(file.version).toBe(NAV_VERSION);
    expect(file.tile).toBe(TILE);
    expect(file.name).toBe('Leer');
  });

  it('bringt jede Kachel mit ihren Werten wieder zurück', () => {
    const before = sample();
    const after = roundTrip(before);
    expect(after.size).toBe(before.size);
    for (const key of before.tileKeys()) {
      expect(after.tile(key)).toEqual(before.tile(key));
    }
    expect(after.levels).toEqual(before.levels);
  });

  it('bringt jede Wand und jede Tür wieder zurück', () => {
    const after = roundTrip(sample());
    expect([...after.wallEntries()]).toHaveLength([...sample().wallEntries()].length);
    expect(after.door('tuer-1')).toMatchObject({ kind: 'door', open: false });
    expect(after.wall(tileKey(3, 0, 0), DIR_E)?.kind).toBe('window');
  });

  it('bringt jede Verbindung mit Richtung und Kosten wieder zurück', () => {
    const before = sample();
    const after = roundTrip(before);
    for (const link of before.links()) {
      expect(after.link(link.id)).toEqual(link);
    }
    // Und die Richtungen hängen wieder richtig: die Treppe geht in beide,
    // die beiden Hälften des Portals je in eine.
    expect(after.linksFrom(tileKey(2, 2, 1))).toHaveLength(1);
    expect(after.linksFrom(tileKey(-1, -1, 0)).map((exit) => exit.link.id)).toEqual([
      'portal-3:in',
    ]);
  });

  it('fasst gleiche Kacheln nebeneinander zu einem Lauf zusammen', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 20, d: 3 });
    const file = writeNav(graph);
    // Drei Zeilen, drei Läufe — und nicht sechzig Einträge.
    expect(file.runs).toHaveLength(3);
    expect(file.runs[0]).toMatchObject({ x: 0, n: 20 });
  });

  it('bricht den Lauf, wo sich die Werte ändern', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 1 });
    graph.setTile(tileKey(2, 0, 0), { hazard: 1 });
    expect(writeNav(graph).runs).toHaveLength(3);
  });

  it('schreibt dieselbe Karte immer gleich, damit ein Diff etwas bedeutet', () => {
    const first = JSON.stringify(writeNav(sample()));
    const second = JSON.stringify(writeNav(roundTrip(sample())));
    expect(second).toBe(first);
  });

  it('speichert nicht, was gerade nur herumsteht', () => {
    const graph = sample();
    graph.setBlocked(tileKey(0, 0, 0), true);
    expect(roundTrip(graph).isBlocked(tileKey(0, 0, 0))).toBe(false);
  });

  it('fängt bei null an zu zählen — eine frisch geladene Karte hat nichts erlebt', () => {
    expect(roundTrip(sample()).version).toBe(0);
  });
});

describe('Was das Format ablehnt', () => {
  it('eine Datei, die keine ist', () => {
    expect(() => readNav(null)).toThrow(NavFormatError);
    expect(() => readNav('{}')).toThrow(NavFormatError);
    expect(() => readNav(42)).toThrow(NavFormatError);
  });

  it('ein fremdes Format', () => {
    expect(() => readNav({ format: 'tiled', version: 1 })).toThrow(/Fremdes Format/);
  });

  it('eine Datei ohne Versionsnummer — genau der Fall, für den es sie gibt', () => {
    expect(() => readNav({ format: NAV_FORMAT })).toThrow(/Versionsnummer/);
    expect(() => readNav({ format: NAV_FORMAT, version: 1.5 })).toThrow(/Versionsnummer/);
  });

  it('eine Karte aus der Zukunft', () => {
    const file = writeNav(sample());
    expect(() => readNav({ ...file, version: NAV_VERSION + 1 })).toThrow(/kennt bis/);
  });

  it('eine Karte mit einer anderen Kachelgröße', () => {
    const file = writeNav(sample());
    expect(() => readNav({ ...file, tile: TILE * 2 })).toThrow(/Kacheln gebaut/);
  });

  it('einen Kachellauf ohne Länge', () => {
    const file = writeNav(sample());
    file.runs[0]!.n = 0;
    expect(() => readNav(file)).toThrow(/Länge/);
  });

  it('nimmt eine Karte ohne Wände und Verbindungen klaglos an', () => {
    const graph = readNav({ format: NAV_FORMAT, version: 1, tile: TILE, levels: [0], runs: [] });
    expect(graph.size).toBe(0);
  });
});
