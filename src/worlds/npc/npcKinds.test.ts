import {
  NPC_KINDS,
  NPC_SKINS,
  SHELF_HEIGHT,
  SHELF_LARGE_HEIGHT,
  npcSkin,
  shelfHeight,
  shelfKind,
  shelfPath,
  shelfSkin,
} from './npcKinds';

/**
 * **Die Häute** — die drei eingebauten und die fünfundachtzig aus dem Regal.
 *
 * Geprüft wird hier die **Auflösung**: Aus einer Zeichenkette, die aus einem
 * Menü, aus dem Browser-Speicher oder aus einem gespeicherten Charakter kommt,
 * wird eine Haut — und zwar in jedem Fall eine, denn alles, was damit rechnet
 * (Collider, Trefferzonen, Lebensbalken), hat keine zweite Antwort. Reine
 * Rechnung, kein three.js.
 */
describe('Die Haut zu einer Sorte', () => {
  it('findet jede der Vorgaben', () => {
    for (const skin of NPC_SKINS) expect(npcSkin(skin.id)).toBe(skin);
    expect(NPC_KINDS).toEqual(['zombie', 'dummy', 'hamster']);
  });

  it('fällt bei Unsinn auf die erste zurück und nicht auf `undefined`', () => {
    expect(npcSkin('drache')).toBe(NPC_SKINS[0]);
    expect(npcSkin(undefined)).toBe(NPC_SKINS[0]);
    expect(npcSkin('')).toBe(NPC_SKINS[0]);
  });

  it('gibt für dieselbe Adresse dieselbe Haut heraus', () => {
    const kind = shelfKind('adventurers/characters/Knight.glb');
    expect(npcSkin(kind)).toBe(npcSkin(kind));
  });

  it('löst eine Adresse aus dem Regal in eine abgeleitete Haut auf', () => {
    const skin = npcSkin(shelfKind('adventurers/characters/Knight.glb'));
    expect(skin.label).toBe('Knight');
    expect(skin.sub).toBe('Figur aus dem Regal');
    expect(skin.figure).toBe('adventurers/characters/Knight.glb');
    expect(skin.height).toBe(SHELF_HEIGHT);
  });
});

describe('Die Adresse hinter einer Sorte', () => {
  it('nimmt eine Datei des Regals', () => {
    expect(shelfPath('kaykit:adventurers/characters/Knight.glb')).toBe(
      'adventurers/characters/Knight.glb',
    );
  });

  it('nimmt keine der Vorgaben und keinen Unsinn', () => {
    expect(shelfPath('zombie')).toBeNull();
    expect(shelfPath(undefined)).toBeNull();
    expect(shelfPath('kaykit:')).toBeNull();
  });

  /**
   * Ein **Fach** des Regalmenüs (`kaykit:<ordner>#60`) ist eine Seite und
   * keine Datei — und ein **Ordner** ist es auch nicht. Beides käme sonst aus
   * einem Speicher als Sorte heraus, und daraus würde ein NPC ohne alles.
   */
  it('nimmt weder ein Fach noch einen Ordner', () => {
    expect(shelfPath('kaykit:adventurers#60')).toBeNull();
    expect(shelfPath('kaykit:adventurers/characters')).toBeNull();
  });

  it('ist die Umkehrung von `shelfKind`', () => {
    const path = 'skeletons/characters/Skeleton_Warrior.glb';
    expect(shelfPath(shelfKind(path))).toBe(path);
  });
});

describe('Wie hoch eine Figur aus dem Regal steht', () => {
  it('gibt einer gewöhnlichen Figur Menschengröße', () => {
    expect(shelfHeight('adventurers/characters/Knight.glb')).toBe(SHELF_HEIGHT);
    expect(SHELF_HEIGHT).toBeGreaterThan(npcSkin('dummy').height - 0.1);
    expect(SHELF_HEIGHT).toBeLessThan(npcSkin('zombie').height + 0.1);
  });

  /**
   * Die beiden Muster, mit denen die Sammlung ihre großen Figuren benennt —
   * `Mannequin_Large` und die Golems, die ihr `_Large` gar nicht erst tragen.
   */
  it('lässt die Figuren des großen Skeletts groß', () => {
    for (const path of [
      'character-animations/mannequin-character/characters/Mannequin_Large.glb',
      'adventurers/characters/Barbarian_Large.glb',
      'skeletons/characters/Skeleton_Golem.glb',
      'mystery-monthly-5/frost/characters/FrostGolem.glb',
    ]) {
      expect([path, shelfHeight(path)]).toEqual([path, SHELF_LARGE_HEIGHT]);
    }
  });
});

describe('Die abgeleitete Haut', () => {
  it('beschriftet sich aus dem Dateinamen und nicht aus dem Pfad', () => {
    expect(shelfSkin('mystery-monthly-4/12-june-2024-robot/characters/Robot_Two.glb').label).toBe(
      'Robot Two',
    );
  });

  it('trägt alles, was ein Körper und ein Collider brauchen', () => {
    const skin = shelfSkin('prototype-bits/character/Dummy.glb');
    expect(skin.radius).toBeGreaterThan(0);
    expect(skin.mass).toBeGreaterThan(0);
    expect(skin.health).toBeGreaterThan(0);
    expect(skin.speed).toBeGreaterThan(0);
    expect(skin.brain).toBe('chase');
    expect(skin.profile).toBe('human');
    expect(skin.arms).toBe('down');
  });
});

/**
 * **Zwei der drei Vorgaben tragen jetzt eine Figur** — und der Hamster mit
 * Absicht keine (im Regal steht kein Nager).
 */
describe('Die Figuren der Vorgaben', () => {
  it('macht aus dem Zombie das Mannequin und aus der Puppe den Dummy', () => {
    expect(npcSkin('zombie').figure).toBe(
      'character-animations/mannequin-character/characters/Mannequin_Medium.glb',
    );
    expect(npcSkin('dummy').figure).toBe('prototype-bits/character/Dummy.glb');
    expect(npcSkin('hamster').figure).toBeUndefined();
  });

  it('lässt die erklärten Höhen stehen — an ihnen hängen die Trefferzonen', () => {
    expect(npcSkin('zombie').height).toBe(1.78);
    expect(npcSkin('dummy').height).toBe(1.7);
  });

  it('gibt nur dem Zombie eigene Spuren', () => {
    expect(npcSkin('zombie').gaits?.idle?.[0]).toBe('Melee_Unarmed_Idle');
    expect(npcSkin('dummy').gaits).toBeUndefined();
  });
});
