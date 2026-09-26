import {
  FIXTURE_MODELS,
  LOCKER_MODEL,
  CARGO_MODEL,
  CONSOLE_MODEL,
} from '../worlds/haunting/world3d/stationProps';
import {
  ANCHOR,
  cellSpan,
  emptyState,
  exportState,
  footprintBox,
  parseState,
  resetTune,
  setTune,
  STATION_ELEMENTS,
  tuneOf,
  tunedBox,
  MERGE_MS,
} from './editorModel';

describe('KayKit-Editor', () => {
  it('kennt dieselben Modelle wie die Station', () => {
    const byId = new Map(STATION_ELEMENTS.map((e) => [e.id, e.path]));
    for (const [id, path] of Object.entries(FIXTURE_MODELS)) expect(byId.get(id)).toBe(path);
    expect(byId.get('locker')).toBe(LOCKER_MODEL);
    expect(byId.get('cargo')).toBe(CARGO_MODEL);
    expect(byId.get('console')).toBe(CONSOLE_MODEL);
  });

  it('ein halber Meter mittig auf der Kachel nimmt 2 × 2, eine Viertelkachel daneben nur eine Zelle', () => {
    const small = { width: 0.5, depth: 0.5 };
    expect(cellSpan(footprintBox(small, ANCHOR))).toEqual({ x: 2, z: 2, count: 4 });
    const moved = tunedBox(small, { scale: 1, offsetX: 0.25, offsetZ: 0.25, yaw: 0 });
    expect(cellSpan(moved)).toEqual({ x: 1, z: 1, count: 1 });
  });

  it('bis 15 cm Überstand sperrt keine Nachbarzelle', () => {
    const box = tunedBox(
      { width: 0.6, depth: 0.5 },
      { scale: 1, offsetX: 0.3, offsetZ: 0.25, yaw: 0 },
    );
    // 0,6 m von x = 0,5 bis 1,1: eine ganze Zelle und 0,1 m in die nächste.
    expect(cellSpan(box)).toEqual({ x: 1, z: 1, count: 1 });
  });

  it('dreht Breite und Tiefe bei einer Vierteldrehung', () => {
    const box = footprintBox({ width: 2, depth: 1 }, { x: 0, z: 0 }, 90);
    expect(box.maxX - box.minX).toBe(1);
    expect(box.maxZ - box.minZ).toBe(2);
  });

  it('fasst einen Zug am Regler zu einem Eintrag zusammen', () => {
    const state = emptyState();
    setTune(state, 'wanne', 'offsetX', 0.1, 1000);
    setTune(state, 'wanne', 'offsetX', 0.2, 1000 + MERGE_MS / 2);
    expect(state.log).toHaveLength(1);
    expect(state.log[0]).toMatchObject({ from: 0, to: 0.2 });
    setTune(state, 'wanne', 'offsetX', 0.3, 1000 + MERGE_MS * 3);
    expect(state.log).toHaveLength(2);
  });

  it('rundet, begrenzt und vergisst, was wieder beim Spiel ist', () => {
    const state = emptyState();
    setTune(state, 'ofen', 'scale', 99);
    expect(tuneOf(state, 'ofen').scale).toBe(3);
    setTune(state, 'ofen', 'yaw', 450);
    expect(tuneOf(state, 'ofen').yaw).toBe(90);
    setTune(state, 'ofen', 'scale', 1, Date.now() + 10_000);
    setTune(state, 'ofen', 'yaw', 0, Date.now() + 20_000);
    expect(state.tunes['ofen']).toBeUndefined();
    expect(resetTune(state, 'ofen')).toBe(false);
  });

  it('gibt nur Verändertes aus, mit Zellen und Protokoll, und liest es wieder ein', () => {
    const state = emptyState();
    state.measured['sessel'] = { width: 0.5, depth: 0.5, height: 1 };
    setTune(state, 'sessel', 'offsetX', 0.25);
    setTune(state, 'sessel', 'offsetZ', 0.25);
    const out = JSON.parse(exportState(state)) as {
      elements: Array<{ id: string; cells: unknown; gameCells: unknown }>;
      log: unknown[];
    };
    expect(out.elements.map((e) => e.id)).toEqual(['sessel']);
    expect(out.elements[0]!.cells).toEqual({ x: 1, z: 1, count: 1 });
    expect(out.elements[0]!.gameCells).toEqual({ x: 2, z: 2, count: 4 });
    expect(out.log).toHaveLength(2);

    const again = parseState(JSON.stringify(state));
    expect(tuneOf(again, 'sessel')).toEqual(tuneOf(state, 'sessel'));
    expect(parseState('kaputt').tunes).toEqual({});
  });
});
