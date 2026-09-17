import { batchKey, joinsBatch } from './gridBatch';
import { blocksView, GHOST_KNEE } from './wallGhost';

/**
 * **Die Probe aufs Bündeln.**
 *
 * Es geht hier um eine einzige Zusage, und sie ist die ganze Begründung dafür,
 * dass ein Bündel das Wand-Ghosting nicht kaputt macht: **Was ghosten kann,
 * darf nie in ein Bündel.** Wer die Regel eines Tages lockert, soll hier
 * darüber stolpern und nicht erst in der Brille, wenn die halbe Wand
 * durchsichtig wird statt der einen davor.
 */

const box = (y: number, h: number) => ({ x: 0, y, z: 0, w: 1, h, d: 1 });

describe('joinsBatch', () => {
  it('nimmt Böden — sie verdecken nie jemanden', () => {
    expect(joinsBatch({ box: box(0.15, 0.3), floor: true })).toBe(true);
  });

  it('nimmt alles unter Kniehöhe: Schwelle, Rampe, Druckplattenrand', () => {
    expect(joinsBatch({ box: box(0.1, 0.2) })).toBe(true);
    expect(joinsBatch({ box: box(GHOST_KNEE - 0.1, 0.1) })).toBe(true);
  });

  it('lässt Wände einzeln — sie sollen von oben durchsichtig werden können', () => {
    expect(joinsBatch({ box: box(1.4, 2.8) })).toBe(false);
  });

  it('lässt ein Vordach einzeln: die Oberkante zählt, nicht die Dicke', () => {
    // Zehn Zentimeter dick, aber auf zwei Metern Höhe — das ist eine Decke.
    expect(joinsBatch({ box: box(2, 0.1) })).toBe(false);
  });

  it('ist genau die Umkehrung von blocksView, solange nichts dazwischenkommt', () => {
    for (const y of [0, 0.15, 0.4, 0.49, 0.5, 0.51, 1, 2.5]) {
      for (const h of [0.1, 0.3, 0.9, 2.8]) {
        const one = { box: box(y, h) };
        expect(joinsBatch(one)).toBe(!blocksView(one));
      }
    }
  });

  it('lässt eine Portalfläche einzeln, auch wenn sie flach am Boden liegt', () => {
    // Ein Portal haftet an *einer* Fläche mit ihrer eigenen Kollisionsgruppe;
    // gebündelt risse ein Bodenportal jede andere Bodenkachel mit auf.
    expect(joinsBatch({ box: box(0.15, 0.3), floor: true, portal: true })).toBe(false);
  });

  it('lässt ein Türblatt einzeln — es geht auf und zu', () => {
    expect(joinsBatch({ box: box(0.1, 0.2), door: true })).toBe(false);
  });

  it('nimmt die Kniehöhe entgegen, wenn eine Welt eine andere hat', () => {
    expect(joinsBatch({ box: box(0.6, 0.2) }, 1)).toBe(true);
    expect(joinsBatch({ box: box(0.6, 0.2) })).toBe(false);
  });
});

describe('batchKey', () => {
  it('trennt nach Material', () => {
    expect(batchKey('a', 0)).not.toBe(batchKey('b', 0));
  });

  it('trennt nach Etage — sonst ließe sich von oben nicht mehr aufschneiden', () => {
    expect(batchKey('a', 0)).not.toBe(batchKey('a', 1));
  });

  it('wirft eine Welt ohne Etagenmarken in einen Topf', () => {
    expect(batchKey('a', null)).toBe(batchKey('a', null));
    expect(batchKey('a', null)).not.toBe(batchKey('a', 0));
  });
});
