/**
 * **Nur die Wände des eigenen Raums, ohne die oberen und die an den Seiten**
 * (`roomWalls.ts`). Das Haus ist das aus dem Hausbau in klein: zwei Zimmer
 * nebeneinander, eine Trennwand dazwischen, Wände von 2,8 m.
 */
import { turnedBox, wallsCovering, type GhostCandidate } from './wallGhost';
import { lidLike, roomWallsToClear, wallLike } from './roomWalls';

function wall(
  x: number,
  z: number,
  w: number,
  d: number,
  name: string,
): GhostCandidate & { name: string } {
  return { box: { x, y: 1.4, z, w, h: 2.8, d }, name };
}

const T = 0.26;
/** West 0 … Ost 10, Nord 0 … Süd 6; die Trennwand bei x = 5. */
const HOUSE = [
  wall(2.5, 0, 5, T, 'north-west'),
  wall(7.5, 0, 5, T, 'north-east'),
  wall(2.5, 6, 5, T, 'south-west'),
  wall(7.5, 6, 5, T, 'south-east'),
  wall(0, 3, T, 6, 'west'),
  wall(10, 3, T, 6, 'east'),
  wall(5, 3, T, 6, 'partition'),
];

const CAMERA = { x: 2.5, y: 30, z: 28 };
const INSIDE_WEST = { x: 2.5, y: 0.9, z: 3 };

const names = (list: readonly (GhostCandidate & { name?: string })[] | null): string[] | null =>
  list === null ? null : list.map((one) => (one as { name: string }).name).sort();

describe('Die Wände des eigenen Raums', () => {
  it('nimmt nur die Front des eigenen Zimmers — nicht oben, nicht die Seiten, nicht das Nachbarzimmer', () => {
    expect(names(roomWallsToClear(CAMERA, INSIDE_WEST, HOUSE))).toEqual(['south-west']);
  });

  it('lässt sich von einer Decke über dem Kopf nicht aufhalten (Haunting)', () => {
    // Die Decke als Quader im Plan, wie `GridPlan.room(…, { ceiling })` sie legt.
    const ceiling = { box: { x: 5, y: 2.95, z: 3, w: 10, h: 0.3, d: 6 }, name: 'ceiling' };
    expect(lidLike(ceiling.box, INSIDE_WEST.y)).toBe(true);
    expect(names(roomWallsToClear(CAMERA, INSIDE_WEST, [...HOUSE, ceiling]))).toEqual([
      'south-west',
    ]);
  });

  it('nimmt einen Sturz über der Tür nicht für einen Deckel', () => {
    const lintel = { x: 5, y: 2.45, z: 3, w: T, h: 0.7, d: 1 };
    expect(lidLike(lintel, INSIDE_WEST.y)).toBe(false);
  });

  it('gilt im anderen Zimmer genauso', () => {
    const east = { x: 7.5, y: 0.9, z: 3 };
    expect(names(roomWallsToClear({ ...CAMERA, x: 7.5 }, east, HOUSE))).toEqual(['south-east']);
  });

  it('nimmt eine Zwischenwand mit, die unter der oberen liegt', () => {
    // Eine halbe Querwand im Westzimmer: Nördlich von ihr ist Raum, also ist
    // sie nicht die, die die Linie von oben zuerst trifft.
    const shelf = wall(1.5, 2, 3, T, 'inner');
    expect(names(roomWallsToClear(CAMERA, INSIDE_WEST, [...HOUSE, shelf]))).toEqual([
      'inner',
      'south-west',
    ]);
  });

  it('lässt Möbel stehen, auch wenn sie im Raum vorn stehen', () => {
    const fridge = { box: { x: 2.5, y: 1, z: 5, w: 0.8, h: 2, d: 0.8 }, name: 'fridge' };
    expect(wallLike(fridge.box)).toBe(false);
    expect(names(roomWallsToClear(CAMERA, INSIDE_WEST, [...HOUSE, fridge]))).toEqual([
      'south-west',
    ]);
  });

  it('kennt draußen keinen Raum', () => {
    expect(roomWallsToClear(CAMERA, { x: 2.5, y: 0.9, z: 9 }, HOUSE)).toBeNull();
    // Und ein Zimmer mit einem Loch in der Wand ist auch draußen.
    const open = HOUSE.filter((one) => one.name !== 'south-west');
    expect(roomWallsToClear(CAMERA, INSIDE_WEST, open)).toBeNull();
  });

  it('dreht mit der Kamera: von Osten ist die Ostwand vorn, und oben liegt der Westen', () => {
    const fromEast = { x: 30, y: 30, z: 3 };
    // Im Westzimmer ist die Trennwand die Wand zur Kamera hin.
    expect(names(roomWallsToClear(fromEast, INSIDE_WEST, HOUSE))).toEqual(['partition']);
  });

  it('nimmt schräg von Südosten die Front im Süden und die Wand im Osten', () => {
    // Um 45° gedreht: Oben im Bild liegt die Ecke im Nordwesten. Die Linie
    // trifft Nord- und Westwand zuerst, weg gehen Süd- und Trennwand.
    const fromSouthEast = { x: 25, y: 30, z: 25 };
    expect(names(roomWallsToClear(fromSouthEast, INSIDE_WEST, HOUSE))).toEqual([
      'partition',
      'south-west',
    ]);
  });

  it('lässt andere Etagen aus dem Spiel', () => {
    const upstairs = HOUSE.map((one) => ({ ...one, box: { ...one.box, y: one.box.y + 3 } }));
    // Die obere Etage sperrt die Flut nicht: Unten gibt es keine Wände, also draußen.
    expect(roomWallsToClear(CAMERA, INSIDE_WEST, upstairs)).toBeNull();
  });

  describe('mit Wänden unter 45°', () => {
    /** Ein Regalstück unter 45° durch die Kachel (`tx`, `tz`), wie `shelfWalls.wallSlant`. */
    const slant = (
      tx: number,
      tz: number,
      yaw: number,
      name: string,
    ): GhostCandidate & { name: string } => ({
      box: turnedBox(tx + 0.5, 1.4, tz + 0.5, Math.SQRT2, 2.8, 0.2, yaw),
      name,
    });
    const SLASH = Math.PI / 4;
    const BACKSLASH = -Math.PI / 4;
    /**
     * West 0 … Ost 10, Nord 0 … Süd 6, die Ecken im Nordwesten, Südwesten
     * und Südosten abgeschrägt — das Zimmer aus dem Hausbau, gemeldet im
     * Oktober 2026.
     */
    const CHAMFERED = [
      wall(5.5, 0, 9, T, 'north'),
      wall(5, 6, 8, T, 'south'),
      wall(0, 3, T, 4, 'west'),
      wall(10, 2.5, T, 5, 'east'),
      slant(0, 0, SLASH, 'north-west'),
      slant(0, 5, BACKSLASH, 'south-west'),
      slant(9, 5, SLASH, 'south-east'),
    ];
    const MIDDLE = { x: 5, y: 0.9, z: 3 };

    it('sind Wände und schließen den Raum', () => {
      expect(wallLike(CHAMFERED[4]!.box)).toBe(true);
      expect(roomWallsToClear({ x: 5, y: 30, z: 28 }, MIDDLE, CHAMFERED)).not.toBeNull();
    });

    it('gehen von Süden unten mit der Front weg, oben bleiben sie', () => {
      expect(names(roomWallsToClear({ x: 5, y: 30, z: 28 }, MIDDLE, CHAMFERED))).toEqual([
        'south',
        'south-east',
        'south-west',
      ]);
    });

    it('stehen um 45° gedreht gerade vor der Kamera — und die anderen sind Seitenwände', () => {
      // Von Südosten: Die Schräge im Südosten zeigt genau zur Kamera, die im
      // Südwesten steht längs zum Blick, die im Nordwesten liegt oben.
      expect(names(roomWallsToClear({ x: 25, y: 30, z: 23 }, MIDDLE, CHAMFERED))).toEqual([
        'east',
        'south',
        'south-east',
      ]);
    });

    it('verdecken draußen nur, wer wirklich hinter ihnen steht', () => {
      const camera = { x: 9.5, y: 30, z: 30 };
      // Gleich nördlich der Schräge im Südosten — und einen Meter weiter
      // westlich, wo der Blick an ihr vorbeigeht.
      const behind = { x: 9.3, y: 0.9, z: 4.9 };
      const beside = { x: 8.3, y: 0.9, z: 4.9 };
      const se = [CHAMFERED[6]!];
      expect(names(wallsCovering(camera, beside, se))).toEqual([]);
      expect(names(wallsCovering(camera, behind, se))).toEqual(['south-east']);
    });
  });
});
