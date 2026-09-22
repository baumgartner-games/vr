import {
  CHARACTER_KEY,
  characterById,
  deleteCharacter,
  listCharacters,
  nextCharacterName,
  saveCharacter,
  type KeyStore,
} from './characterStore';
import { Recorder, type Recording } from './npcRecording';
import type { NpcKind } from './npcKinds';

function memoryStore(): KeyStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function recording(kind: NpcKind = 'dummy'): Recording {
  const recorder = new Recorder(kind);
  const head = { position: { x: 0, y: 1.6, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } };
  recorder.sample(0, { feet: { x: 0, y: 0, z: 0 }, yaw: 0, head, left: null, right: null }, []);
  recorder.sample(1, { feet: { x: 1, y: 0, z: 0 }, yaw: 0, head, left: null, right: null }, []);
  return recorder.finish();
}

describe('Der Charakter-Speicher', () => {
  it('ist leer, wenn nichts drin steht — und wenn Unsinn drin steht', () => {
    const store = memoryStore();
    expect(listCharacters(store)).toEqual([]);
    store.setItem(CHARACTER_KEY, '{not json');
    expect(listCharacters(store)).toEqual([]);
    store.setItem(CHARACTER_KEY, JSON.stringify([{ id: 'x' }, 7, null]));
    expect(listCharacters(store)).toEqual([]);
  });

  it('legt einen Charakter ab und findet ihn wieder', () => {
    const store = memoryStore();
    const saved = saveCharacter(
      { kind: 'dummy', recording: recording(), now: new Date(2026, 8, 21, 14, 32) },
      store,
    )!;
    expect(saved.name).toBe('Übungspuppe 14:32');
    expect(saved.kind).toBe('dummy');
    expect(listCharacters(store)).toHaveLength(1);
    expect(characterById(saved.id, store)?.recording.duration).toBe(1);
    expect(characterById('nope', store)).toBeNull();
  });

  /**
   * **Ein Charakter darf eine Figur aus dem Regal sein** (`kaykit:<pfad>`).
   * Beide Wege durch den Speicher müssen die Id unverändert durchlassen: die
   * Aufnahme selbst (`npcRecording.readRecording` — sie trägt die Sorte mit,
   * damit man ihr später ansieht, wer da gespielt hat) und der Eintrag darum
   * herum. Wer sie unterwegs „repariert", bekommt beim Laden einen Zombie
   * statt seines Ritters.
   */
  it('lässt eine Figur aus dem Regal durch — Eintrag und Aufnahme', () => {
    const store = memoryStore();
    const kind = 'kaykit:adventurers/characters/Knight.glb' as const;
    const saved = saveCharacter({ name: 'Ritter', kind, recording: recording(kind) }, store)!;
    expect(saved.kind).toBe(kind);
    const read = characterById(saved.id, store);
    expect(read?.kind).toBe(kind);
    expect(read?.recording.kind).toBe(kind);
  });

  it('stellt den neuesten nach vorn', () => {
    const store = memoryStore();
    const first = saveCharacter({ name: 'Erster', kind: 'dummy', recording: recording() }, store)!;
    const second = saveCharacter(
      { name: 'Zweiter', kind: 'zombie', recording: recording() },
      store,
    )!;
    expect(listCharacters(store).map((c) => c.id)).toEqual([second.id, first.id]);
  });

  it('löscht genau einen', () => {
    const store = memoryStore();
    const a = saveCharacter({ name: 'A', kind: 'dummy', recording: recording() }, store)!;
    const b = saveCharacter({ name: 'B', kind: 'dummy', recording: recording() }, store)!;
    expect(deleteCharacter(a.id, store)).toBe(true);
    expect(deleteCharacter(a.id, store)).toBe(false);
    expect(listCharacters(store).map((c) => c.id)).toEqual([b.id]);
  });

  it('nummeriert gleiche Namen durch', () => {
    const now = new Date(2026, 8, 21, 9, 5);
    const store = memoryStore();
    const first = saveCharacter({ kind: 'hamster', recording: recording(), now }, store)!;
    expect(first.name).toBe('Hamster 09:05');
    expect(nextCharacterName('hamster', listCharacters(store), now)).toBe('Hamster 09:05 (2)');
  });

  it('gibt ohne Speicher nichts vor', () => {
    expect(saveCharacter({ kind: 'dummy', recording: recording() }, null)).toBeNull();
    expect(listCharacters(null)).toEqual([]);
    expect(deleteCharacter('x', null)).toBe(false);
  });

  it('schreibt nicht, was nicht mehr passt', () => {
    const store = memoryStore();
    const huge = recording();
    // Eine Aufnahme, die allein den Deckel sprengt: Bilder bis über die Grenze.
    const frames = huge.frames;
    while (JSON.stringify(frames).length < 3_600_000) {
      frames.push({ ...frames[frames.length - 1]!, t: frames.length });
    }
    expect(saveCharacter({ kind: 'dummy', recording: huge }, store)).toBeNull();
    expect(listCharacters(store)).toEqual([]);
  });
});
