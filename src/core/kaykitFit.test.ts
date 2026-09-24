import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KAYKIT_FIGURE_SCALE, KAYKIT_PACK_SCALE, KAYKIT_SCALE, kaykitScale } from './kaykitFit';
import { MIXEDBAG_SCALE } from './mixedbagFit';
import type { KaykitIndex } from './kaykitIndex';

/**
 * **Ein Faktor für dieselbe Werkstatt.**
 *
 * Die Modelle im Regal und die Stücke der Wundertüte kommen von demselben
 * Zeichner und sind in denselben „Blender-Metern" gebaut. Stünden die beiden
 * Zahlen auseinander, sähe man es nicht am Code, sondern erst in der Welt: ein
 * Fass aus dem Regal, doppelt so hoch wie das Fass daneben. Deshalb steht hier
 * die einzige Zusage, die zählt — sie sind gleich.
 */
describe('der Maßstab des Regals', () => {
  it('ist derselbe wie bei der Wundertüte', () => {
    expect(KAYKIT_SCALE).toBe(MIXEDBAG_SCALE);
  });

  it('halbiert', () => {
    expect(KAYKIT_SCALE).toBe(0.5);
  });
});

/**
 * **Die Tabelle je Paket** — sieben Zeilen, und jede muss ein Paket meinen,
 * das es wirklich gibt.
 *
 * Ein Schlüssel, der sich verschreibt, fällt sonst **nirgends** auf: Der
 * Nachschlag geht ins Leere, das Modell bekommt still die Vorgabe, und der
 * Ritter ist wieder einen Meter zu klein. Deshalb wird der Index gelesen, wenn
 * er da ist — und wenn nicht, ist das kein Fehler, sondern ein Checkout ohne
 * die gekauften Pakete (dieselbe Regel wie im Lader).
 */
describe('der Maßstab je Paket', () => {
  it('nimmt für alles Unbekannte die Vorgabe', () => {
    expect(kaykitScale('dungeon/barrel_large.glb')).toBe(KAYKIT_SCALE);
    expect(kaykitScale('forest-nature/color1/Tree_1_A_Color1.glb')).toBe(KAYKIT_SCALE);
    // Auch das, was gar kein Paket nennt — eine Adresse ohne Schrägstrich.
    expect(kaykitScale('irgendwas.glb')).toBe(KAYKIT_SCALE);
  });

  it('gibt den Figurenpaketen ihre eigene Zahl', () => {
    expect(kaykitScale('adventurers/characters/Knight.glb')).toBe(KAYKIT_FIGURE_SCALE);
    expect(kaykitScale('skeletons/characters/Skeleton_Warrior.glb')).toBe(KAYKIT_FIGURE_SCALE);
    expect(kaykitScale('prototype-bits/character/Dummy.glb')).toBe(KAYKIT_FIGURE_SCALE);
  });

  it('macht aus dem Ritter eine Figur neben der Spielfigur', () => {
    // Gemessen an der Quelle: 1,94 × 2,54 × 1,31.
    const height = 2.543 * kaykitScale('adventurers/characters/Knight.glb');
    expect(height).toBeGreaterThan(1.5);
    expect(height).toBeLessThan(2);
  });

  it('kennt nur Zahlen, die eine Größe sein können', () => {
    for (const [pack, scale] of Object.entries(KAYKIT_PACK_SCALE)) {
      expect(pack).toMatch(/^[a-z0-9-]+$/);
      expect(Number.isFinite(scale)).toBe(true);
      // Nicht Null und nicht das Zehnfache: Beides wäre ein Vertipper und
      // keine Entscheidung.
      expect(scale).toBeGreaterThan(0.05);
      expect(scale).toBeLessThan(5);
    }
  });

  it('nennt nur Pakete, die im Index wirklich stehen', () => {
    const index = readIndex();
    if (!index) {
      // Ohne die gekauften Pakete gibt es nichts zu prüfen — und das ist ein
      // normaler Zustand und kein Fehler.
      expect(Object.keys(KAYKIT_PACK_SCALE).length).toBeGreaterThan(0);
      return;
    }
    const packs = new Set((index.root.dirs ?? []).map((dir) => dir.name));
    for (const pack of Object.keys(KAYKIT_PACK_SCALE)) {
      expect(packs.has(pack)).toBe(true);
    }
  });
});

/** Der Index von der Platte — oder `null`, wenn die Pakete nicht da sind. */
function readIndex(): KaykitIndex | null {
  try {
    // Von der Wurzel des Projekts aus, denn Jest läuft dort — und `import.meta`
    // gibt es im CommonJS-Lauf der Tests nicht (`jest.config.cjs`).
    const file = join(process.cwd(), 'public', 'models', 'kaykit', 'index.json');
    return JSON.parse(readFileSync(file, 'utf8')) as KaykitIndex;
  } catch {
    return null;
  }
}

/**
 * **Die gelbe Wand ist so groß wie die grüne.** Gewünscht war, dass
 * `prototype-bits/Wall.glb` (gelber Rand unten) dieselbe Größe hat wie
 * `restaurant-bits/wall.glb` (grüner Rand) — beide 4 Quelleinheiten hoch.
 */
describe('Der Maßstab einzelner Dateien', () => {
  it('bringt die Wände, Böden und Türen der Prototypen auf den Maßstab der Restaurantwand', () => {
    expect(kaykitScale('prototype-bits/Wall.glb')).toBe(kaykitScale('restaurant-bits/wall.glb'));
    expect(kaykitScale('prototype-bits/Wall_Half.glb')).toBe(KAYKIT_SCALE);
    expect(kaykitScale('prototype-bits/Primitive_Wall.glb')).toBe(KAYKIT_SCALE);
    expect(kaykitScale('prototype-bits/Floor.glb')).toBe(KAYKIT_SCALE);
    expect(kaykitScale('prototype-bits/Door_A.glb')).toBe(KAYKIT_SCALE);
    expect(kaykitScale('prototype-bits/Empty.glb')).toBe(KAYKIT_SCALE);
  });

  it('und lässt Figur, Fass und Kiste des Pakets bei ihrem Maßstab', () => {
    expect(kaykitScale('prototype-bits/Barrel_A.glb')).toBe(KAYKIT_FIGURE_SCALE);
    expect(kaykitScale('prototype-bits/character/Dummy.glb')).toBe(KAYKIT_FIGURE_SCALE);
  });
});
