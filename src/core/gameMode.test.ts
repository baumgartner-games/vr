import {
  GAME_MODE_LABELS,
  GAME_MODES,
  gameMode,
  movesFurniture,
  movesStructure,
  nextGameMode,
  onGameMode,
  refillsCatalogue,
  setGameMode,
} from './gameMode';

describe('gameMode', () => {
  afterEach(() => setGameMode('play'));

  it('starts every session in Spielen', () => {
    expect(gameMode()).toBe('play');
  });

  it('cycles Spielen → Einrichten → Baukasten → Spielen, one click each', () => {
    expect(GAME_MODES.map((mode) => GAME_MODE_LABELS[mode])).toEqual([
      'Spielen',
      'Einrichten',
      'Baukasten',
    ]);
    expect(nextGameMode('play')).toBe('arrange');
    expect(nextGameMode('arrange')).toBe('creative');
    expect(nextGameMode('creative')).toBe('play');
  });

  it('moves furniture in both building modes, and refills only in Baukasten', () => {
    expect(GAME_MODES.map(movesFurniture)).toEqual([false, true, true]);
    expect(GAME_MODES.map(refillsCatalogue)).toEqual([false, false, true]);
  });

  it('moves walls only in Baukasten — Einrichten richtet ein und baut nicht um', () => {
    expect(GAME_MODES.map(movesStructure)).toEqual([false, false, true]);
  });

  it('tells its listeners once per real change — not on the same mode again', () => {
    const heard: string[] = [];
    const stop = onGameMode((mode) => heard.push(`${mode}/${gameMode()}`));
    setGameMode('arrange');
    setGameMode('arrange');
    setGameMode('creative');
    stop();
    setGameMode('play');
    expect(heard).toEqual(['arrange/arrange', 'creative/creative']);
  });
});
