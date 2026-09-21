import { BLOCK_HEIGHT, kitchenBlock, kitchenBlocks } from './kitchenBlocks';
import { KITCHEN_FLOOR, KITCHEN_SPOTS, footprint } from './kitchenPlan';
import { kitchenPiece } from '../../../core/kitchenFit';
import { KITCHEN } from '../layout';
import { TILE } from '../../nav/navTile';

/**
 * **Die Küche ist fest, bevor sie zu sehen ist.**
 *
 * Diese Datei prüft genau die Zusage, an der es lag: Der Spieler lief durch
 * Möbel, deren Datei noch unterwegs war, weil sein Hindernis erst mit dem
 * Modell entstand. Der Grundriss gab den NPCs dieselbe Zusage längst
 * (`kitchenPlan.stampKitchen`) — hier steht sie für die Füße.
 *
 * Deshalb kommt in dieser Datei **kein** Lader vor, weder ein geladener noch
 * ein fehlgeschlagener: Was hier gerechnet wird, kennt keine Datei, und ein
 * Test, der erst nach einem `await` grün würde, wäre der Test für ein anderes
 * Problem.
 */
describe('die Sperren der Küche, gerechnet aus dem Katalog', () => {
  it('stellt jeder Stelle im Aufbau einen Kasten hin — ohne eine einzige Datei', () => {
    const blocks = kitchenBlocks();
    const open = KITCHEN_SPOTS.filter((spot) => {
      const piece = kitchenPiece(spot.name);
      return piece && !piece.hanging && !spot.lift;
    });
    expect(blocks).toHaveLength(open.length);
    for (const spot of open) {
      expect(blocks.some((one) => one.spot === spot)).toBe(true);
    }
    // Und es sind wirklich Möbel und nicht ein paar Ausreißer: Die Küche
    // stellt drei Reihen, eine Werkhalle und einen Schauraum auf.
    expect(blocks.length).toBeGreaterThan(50);
  });

  it('nimmt die Maße aus dem Katalog und nicht aus einem Netz', () => {
    for (const { spot, block } of kitchenBlocks()) {
      const piece = kitchenPiece(spot.name)!;
      const size = footprint(piece, spot.turn ?? 0);
      expect(block.w).toBeCloseTo(size.w * TILE, 6);
      expect(block.d).toBeCloseTo(size.d * TILE, 6);
      // Die Mitte der Grundfläche, in Weltmetern — dieselbe Rechnung, mit der
      // das Möbel selbst aufgestellt wird (`kitchen.standAt`).
      expect(block.x).toBeCloseTo((KITCHEN.x + spot.x + size.w / 2) * TILE, 6);
      expect(block.z).toBeCloseTo((KITCHEN.z + spot.z + size.d / 2) * TILE, 6);
      // Der Fuß steht auf dem Küchenboden, nicht auf halber Höhe darin.
      expect(block.y - block.h / 2).toBeCloseTo(KITCHEN_FLOOR, 6);
    }
  });

  it('sperrt in der Küche bis Sprunghöhe und im Schauraum nur so hoch wie das Möbel', () => {
    for (const { spot, block } of kitchenBlocks()) {
      const piece = kitchenPiece(spot.name)!;
      const stands = piece.height - (piece.bury ?? 0);
      if (spot.show) expect(block.h).toBeCloseTo(Math.max(stands, 0.02), 6);
      else expect(block.h).toBeCloseTo(Math.max(stands, BLOCK_HEIGHT), 6);
    }
    // Die Küchenzeile ist einen halben Meter hoch und wird trotzdem
    // abgesperrt: Wer darauf stünde, liefe die ganze Wand entlang.
    const counter = kitchenPiece('counter')!;
    expect(counter.height).toBeLessThan(BLOCK_HEIGHT);
    expect(kitchenBlock(counter, { x: 0, z: 0 })?.h).toBeCloseTo(BLOCK_HEIGHT, 6);
  });

  it('lässt durch, was durchlässig sein soll', () => {
    const rack = kitchenPiece('plate-rack')!;
    // Das Ausgaberegal steht über der Theke; die hat ihren Kasten schon, und
    // ein zweiter darüber wäre eine Wand in der Durchreiche.
    expect(kitchenBlock(rack, { x: 5, z: 9, turn: 2, lift: 1.2 })).toBeNull();
    // Und ein hängendes Stück bekommt nie einen — in dieser Fassung des
    // Katalogs hängt keines, die Regel gilt trotzdem.
    expect(kitchenBlock({ ...rack, hanging: true }, { x: 5, z: 9 })).toBeNull();
  });

  it('macht auch die Möbel fest, die aus einer Datei kommen', () => {
    // Der eigentliche Fehler: Die gebauten Stücke (Bänder, Mixer) standen
    // sofort, die geladenen erst Sekunden später — und dazwischen lief man
    // durch Zeile, Herd und Spüle.
    const fromFile = kitchenBlocks().filter(({ spot }) => !kitchenPiece(spot.name)?.built);
    expect(fromFile.length).toBeGreaterThan(30);
    for (const name of ['counter', 'stove', 'sink-basin', 'pass', 'table']) {
      expect(fromFile.some((one) => one.spot.name === name)).toBe(true);
    }
    // Und die gebauten sind weiter dabei, mit demselben Kasten wie bisher.
    const built = kitchenBlocks().filter(({ spot }) => kitchenPiece(spot.name)?.built);
    expect(built.length).toBeGreaterThan(0);
  });

  it('macht aus einer Zeile eine Wand und keine Reihe Poller', () => {
    const blocks = kitchenBlocks();
    const row = ['counter', 'stove', 'stove-pot', 'stove-pan'].map(
      (name) => blocks.find((one) => one.spot.name === name && one.spot.z === 0)!.block,
    );
    for (let i = 1; i < row.length; i++) {
      const left = row[i - 1]!;
      const right = row[i]!;
      // Kante an Kante: Zwischen zwei Möbeln der Nordzeile bleibt kein Spalt,
      // durch den eine Spielerkapsel passt.
      expect(right.x - right.w / 2).toBeCloseTo(left.x + left.w / 2, 6);
    }
  });
});
