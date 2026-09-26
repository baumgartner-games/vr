import { DEFAULT_WORLD, WORLDS, WORLD_FOLDERS, findWorld } from './index';

describe('Die Welten', () => {
  it('führt den alten Namen der Testwelt in die Sandbox', () => {
    expect(findWorld('test')?.id).toBe('sandbox');
    expect(findWorld('sandbox')?.title).toBe('Sandbox');
    expect(DEFAULT_WORLD).toBe('sandbox');
  });

  it('kennt jeden Ordner, den eine Welt nennt', () => {
    for (const world of WORLDS) {
      if (world.folder) expect(WORLD_FOLDERS.some((one) => one.id === world.folder)).toBe(true);
    }
  });

  it('hat im Ordner „Test" genau die Test Navigation', () => {
    expect(WORLDS.filter((world) => world.folder === 'test').map((world) => world.id)).toEqual([
      'test-navigation',
    ]);
  });
});
