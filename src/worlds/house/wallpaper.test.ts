import {
  WALLPAPERS,
  WALLPAPER_SIZE,
  wallpaperById,
  wallpaperColor,
  wallpaperPixels,
} from './wallpaper';

describe('die Tapeten', () => {
  it('hat sechs, jede mit eigener Id und einem Farbfeld', () => {
    expect(WALLPAPERS.map((one) => one.label)).toEqual([
      'Backstein',
      'Putz weiß',
      'Tapete beige',
      'Tapete grün gestreift',
      'Holzvertäfelung',
      'Fliesen blau',
    ]);
    expect(new Set(WALLPAPERS.map((one) => one.id)).size).toBe(WALLPAPERS.length);
    for (const one of WALLPAPERS) expect(one.swatch).toMatch(/^#[0-9a-f]{6}$/);
    expect(wallpaperById('brick')?.label).toBe('Backstein');
    expect(wallpaperById('nope')).toBeNull();
  });

  it('rechnet jedes Muster ohne Leinwand, deckend und ohne Pink', () => {
    for (const one of WALLPAPERS) {
      const data = wallpaperPixels(one.id);
      expect(data).toHaveLength(WALLPAPER_SIZE * WALLPAPER_SIZE * 4);
      for (let i = 3; i < data.length; i += 4) expect(data[i]).toBe(255);
      expect(wallpaperColor(one.id, 0.3, 0.3)).not.toEqual([255, 0, 255]);
    }
  });

  it('hat beim Backstein Fugen und Steine — nicht eine Farbe', () => {
    const mortar = wallpaperColor('brick', 0.3, 0.01);
    const stone = wallpaperColor('brick', 0.3, 0.15);
    expect(mortar[0]).toBeGreaterThan(stone[0]);
    expect(mortar[2]).toBeGreaterThan(stone[2] + 40);
  });

  it('wiederholt sich nahtlos: dieselbe Stelle, dieselbe Farbe', () => {
    for (const one of WALLPAPERS)
      expect(wallpaperColor(one.id, 0.25, 0.75)).toEqual(wallpaperColor(one.id, 0.25, 0.75));
  });
});
