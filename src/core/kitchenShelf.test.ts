import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { KITCHEN_SHELF, kitchenPieceForModel } from './kitchenShelf';
import { KITCHEN_PIECES } from './kitchenFit';

/**
 * **Die Brücke zwischen den beiden Katalogen** — und die zwei Enden, an denen
 * sie reißen kann.
 *
 * Eine Tabelle aus Zeichenketten fällt nirgends auf, wenn sie sich verschreibt:
 * Der Nachschlag geht ins Leere, und aus der Brötchenkiste wird still wieder
 * ein Fass. Also wird hier beides nachgesehen — links die Datei, rechts das
 * Möbel.
 */
describe('das Regal als Küchenkatalog', () => {
  it('nennt rechts nur Möbel, die es wirklich gibt', () => {
    const names = new Set(KITCHEN_PIECES.map((piece) => piece.name));
    for (const name of Object.values(KITCHEN_SHELF)) {
      expect(names.has(name)).toBe(true);
    }
  });

  it('nennt jedes Möbel höchstens einmal', () => {
    const names = Object.values(KITCHEN_SHELF);
    expect(new Set(names).size).toBe(names.length);
  });

  /**
   * Ohne die gekauften Pakete gibt es nichts nachzusehen — das ist ein
   * normaler Checkout und kein Fehler (dieselbe Regel wie im Lader).
   */
  it('nennt links nur Dateien, die wirklich im Regal liegen', () => {
    const shelf = join(process.cwd(), 'public/models/kaykit');
    if (!existsSync(join(shelf, 'restaurant-bits'))) return;
    for (const path of Object.keys(KITCHEN_SHELF)) {
      expect(existsSync(join(shelf, path))).toBe(true);
    }
  });

  it('kennt die Möbel, um die es ging', () => {
    expect(kitchenPieceForModel('restaurant-bits/crate_buns.glb')).toBe('crate-buns');
    expect(kitchenPieceForModel('restaurant-bits/stove_single.glb')).toBe('stove');
    expect(kitchenPieceForModel('restaurant-bits/kitchencounter_sink.glb')).toBe('sink-basin');
  });

  it('lässt alles andere ein Fass bleiben', () => {
    expect(kitchenPieceForModel('restaurant-bits/oven.glb')).toBeNull();
    expect(kitchenPieceForModel('dungeon/barrel_large.glb')).toBeNull();
    expect(kitchenPieceForModel('')).toBeNull();
  });
});
