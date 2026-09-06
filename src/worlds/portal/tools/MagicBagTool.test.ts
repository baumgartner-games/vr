import { BAG_LAYOUT, mouthRadiusAt } from './MagicBagTool';
import { cellCentre, pageCount } from './bagGrid';
import { BAG_ITEMS } from '../props';

/**
 * Die Öffnung ist ein Trichter, und die Felder liegen nicht am Saum, sondern
 * zwei Zentimeter tiefer. Was dort hineingelegt wird, muss auf **dieser** Höhe
 * hineinpassen — nicht auf der weitesten.
 */
const INNER = mouthRadiusAt(BAG_LAYOUT.tileY);
/**
 * Der Sack ist ein Dreißigeck und kein Kreis: zwischen zwei Kanten steht das
 * Leder ein Stück weiter innen. Ein Millimeter Luft deckt das ab und macht aus
 * einem knappen „passt gerade noch" ein „passt".
 */
const FITS = INNER - 0.001;

/** Wie weit die Ecke eines Feldes von der Mitte des Beutels weg ist. */
function corner(x: number, z: number, width: number, depth: number): number {
  return Math.hypot(Math.abs(x) + width / 2, Math.abs(z) + depth / 2);
}

describe('die Öffnung des magischen Beutels', () => {
  it('ist auf Höhe der Felder enger als am Saum', () => {
    expect(INNER).toBeLessThan(mouthRadiusAt(0.035));
    expect(INNER).toBeGreaterThan(0.1);
  });

  it('nimmt jedes Fach einer Seite auf', () => {
    for (let place = 0; place < BAG_LAYOUT.perPage; place += 1) {
      const at = cellCentre(place, BAG_LAYOUT.cols, BAG_LAYOUT.rows, BAG_LAYOUT.cell);
      expect(corner(at.x, at.z, BAG_LAYOUT.tile, BAG_LAYOUT.tile)).toBeLessThan(FITS);
    }
  });

  it('nimmt die beiden Blätterpfeile neben dem Raster auf', () => {
    const { arrowX, arrowTile } = BAG_LAYOUT;
    expect(corner(arrowX, 0, arrowTile.width, arrowTile.depth)).toBeLessThan(FITS);
  });

  it('nimmt die Seitenpunkte vor dem Raster auf', () => {
    const { dotsZ, dotRadius } = BAG_LAYOUT;
    const pages = pageCount(BAG_ITEMS.length, BAG_LAYOUT.perPage);
    const widest = ((pages - 1) / 2) * 0.014 + dotRadius;
    expect(Math.hypot(widest, dotsZ + dotRadius)).toBeLessThan(FITS);
  });

  it('lässt zwischen Pfeil und äußerstem Fach Platz', () => {
    const outer = ((BAG_LAYOUT.cols - 1) / 2) * BAG_LAYOUT.cell + BAG_LAYOUT.tile / 2;
    expect(BAG_LAYOUT.arrowX - BAG_LAYOUT.arrowTile.width / 2).toBeGreaterThan(outer);
  });
});

describe('der Vorrat des magischen Beutels', () => {
  it('liegt vollständig auf den Seiten, die er hat', () => {
    const pages = pageCount(BAG_ITEMS.length, BAG_LAYOUT.perPage);
    expect(pages * BAG_LAYOUT.perPage).toBeGreaterThanOrEqual(BAG_ITEMS.length);
    expect((pages - 1) * BAG_LAYOUT.perPage).toBeLessThan(BAG_ITEMS.length);
  });
});
