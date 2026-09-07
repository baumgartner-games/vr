import { PLAN_WALL_T } from '../editor/levelPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, type Dir } from '../nav/navTile';
import { BLOCKS, BLOCK_KINDS, blockRise, blockSolids, turned, type BlockKind } from './blocks';
import { solidBounds, type PlanSolid } from './solids';

/** Ein Baustein auf der Kachel um den Ursprung, nach Norden schauend. */
function at(kind: BlockKind, dir: Dir = DIR_N, height?: number): PlanSolid[] {
  return blockSolids(kind, {
    x: 0,
    base: 0,
    z: 0,
    dir,
    ...(height === undefined ? {} : { height }),
  });
}

describe('Jeder Baustein bleibt auf seiner Kachel', () => {
  /**
   * **Der Test, wegen dem es diese Datei gibt.**
   *
   * Ein Baustein, der über seine Kachel hinausragt, steckt in der Nachbarkachel
   * — und das sieht man in der Brille erst, wenn man daneben steht und nicht
   * durch die Tür kommt. Hier fällt es in einer Millisekunde auf, für jeden
   * Baustein und in jeder der vier Richtungen.
   *
   * Ein halber Zentimeter Luft: Was genau auf der Kachelgrenze sitzt (Geländer,
   * Brüstung) darf sie berühren, aber nicht überschreiten.
   */
  for (const kind of BLOCK_KINDS) {
    for (const dir of [DIR_N, DIR_E, DIR_S, DIR_W] as const) {
      it(`${kind} nach ${dir} bleibt im Quadrat und über dem Boden`, () => {
        const box = solidBounds(at(kind, dir))!;
        expect(box).not.toBeNull();
        const half = TILE / 2 + 0.005;
        expect(box.minX).toBeGreaterThanOrEqual(-half);
        expect(box.maxX).toBeLessThanOrEqual(half);
        expect(box.minZ).toBeGreaterThanOrEqual(-half);
        expect(box.maxZ).toBeLessThanOrEqual(half);
        // Nichts steckt im Boden: was hier durchsackt, sieht man von unten
        // durch die Bodenplatte hindurch.
        expect(box.minY).toBeGreaterThanOrEqual(-0.001);
      });
    }
  }

  it('baut jeden Baustein aus mindestens einem Quader', () => {
    for (const kind of BLOCK_KINDS) expect(at(kind).length).toBeGreaterThan(0);
  });

  /**
   * Die Zahl in `BLOCKS` ist die Höhe, auf der man den Baustein **benutzt**:
   * Arbeitsplatte, Sitzfläche, Handlauf, oberste Trittfläche. Bei allen außer
   * der Bank ist das gleichzeitig die Oberkante — die Bank hat eine Lehne, und
   * die steht über der Sitzfläche, sonst wäre sie ein Hocker.
   */
  it('gibt jedem Baustein die Höhe, die in der Tabelle steht', () => {
    for (const kind of BLOCK_KINDS) {
      if (kind === 'bench') continue;
      const box = solidBounds(at(kind))!;
      expect(box.maxY).toBeCloseTo(BLOCKS[kind].height, 1);
    }
  });

  it('misst die Bank an ihrer Sitzfläche und nicht an ihrer Lehne', () => {
    const parts = at('bench');
    const seat = parts.reduce((a, b) => (a.d > b.d ? a : b));
    expect(seat.y + seat.h / 2).toBeCloseTo(BLOCKS.bench.height);
    expect(solidBounds(parts)!.maxY).toBeGreaterThan(BLOCKS.bench.height);
  });
});

describe('Gedreht wird um die Kachelmitte', () => {
  /**
   * Die vier rechten Winkel, an einem Quader, den man nicht verwechseln kann:
   * schmal, vorne links, und ganz woanders als seine Drehungen.
   */
  const one: PlanSolid[] = [{ kind: 'wood', x: 0.5, y: 1, z: -1, w: 0.2, h: 0.4, d: 0.8 }];

  it('lässt Norden, wie es ist', () => {
    expect(turned(one, DIR_N)[0]).toEqual(one[0]);
  });

  it('legt „vorne" nach Osten auf +X', () => {
    const east = turned(one, DIR_E)[0]!;
    // Aus (x, z) = (0.5, −1) wird (1, 0.5): −Z zeigt jetzt nach +X.
    expect(east.x).toBeCloseTo(1);
    expect(east.z).toBeCloseTo(0.5);
    // Und die Kantenlängen tauschen mit — ohne das steht der Kasten quer.
    expect(east.w).toBeCloseTo(0.8);
    expect(east.d).toBeCloseTo(0.2);
    expect(east.h).toBeCloseTo(0.4);
  });

  it('dreht Süden auf den Kopf', () => {
    const south = turned(one, DIR_S)[0]!;
    expect(south.x).toBeCloseTo(-0.5);
    expect(south.z).toBeCloseTo(1);
    expect(south.w).toBeCloseTo(0.2);
  });

  it('legt Westen auf −X', () => {
    const west = turned(one, DIR_W)[0]!;
    expect(west.x).toBeCloseTo(-1);
    expect(west.z).toBeCloseTo(-0.5);
    expect(west.w).toBeCloseTo(0.8);
  });

  it('ist nach vier Drehungen wieder am Anfang', () => {
    const round = turned(turned(one, DIR_S), DIR_S)[0]!;
    expect(round.x).toBeCloseTo(0.5);
    expect(round.z).toBeCloseTo(-1);
  });
});

describe('Die Küchenzeile', () => {
  it('steht an der Kante, in die sie zeigt', () => {
    const box = solidBounds(at('counter', DIR_N))!;
    // Sie klebt an der Nordkante und ragt nicht in die halbe Kachel hinein.
    expect(box.minZ).toBeCloseTo(-TILE / 2 + PLAN_WALL_T / 2, 2);
    expect(box.maxZ).toBeLessThan(0);
  });

  it('steht an der Ostkante genauso, nur quer', () => {
    const box = solidBounds(at('counter', DIR_E))!;
    expect(box.maxX).toBeCloseTo(TILE / 2 - PLAN_WALL_T / 2, 2);
    expect(box.minX).toBeGreaterThan(0);
    // Und über die ganze Kachellänge, wie an der Nordkante auch.
    expect(box.maxZ - box.minZ).toBeCloseTo(TILE - PLAN_WALL_T);
  });

  it('hat eine Arbeitsplatte auf Arbeitshöhe und eine Nische darunter', () => {
    const parts = at('counter');
    const top = parts.reduce((a, b) => (a.y > b.y ? a : b));
    expect(top.y + top.h / 2).toBeCloseTo(0.9);
    // Der Sockel steht zurück: er ist flacher als der Schrank darüber.
    const plinth = parts.find((one) => one.y < 0.12)!;
    const cabinet = parts.find((one) => one.kind === 'wood')!;
    expect(plinth.d).toBeLessThan(cabinet.d);
  });

  it('wird so hoch, wie man sie bestellt', () => {
    const box = solidBounds(at('counter', DIR_N, 1.1))!;
    expect(box.maxY).toBeCloseTo(1.1);
  });
});

describe('Treppe und Rampe', () => {
  /**
   * **Die Zahl, wegen der es diesen Test gibt: 0,32 m.** So hoch steigt der
   * Character-Controller (`PhysicsLocomotion`), und eine Stufe darüber ist eine
   * Wand mit einer Kante obendrauf. Man merkt es nicht beim Bauen, sondern beim
   * Hochlaufen — und dann steht man davor und weiß nicht, warum.
   */
  it('macht keine Stufe höher als der Spieler steigt', () => {
    for (const height of [1.2, 2.8, 3.1, 4]) {
      const steps = at('stairs', DIR_N, height)
        .map((one) => one.y + one.h / 2)
        .sort((a, b) => a - b);
      let last = 0;
      for (const top of steps) {
        expect(top - last).toBeLessThanOrEqual(0.32);
        last = top;
      }
      // Und oben kommt sie wirklich an.
      expect(last).toBeCloseTo(height);
    }
  });

  it('steigt nach vorn — die unterste Stufe liegt hinten', () => {
    const steps = at('stairs', DIR_N, 2.8);
    const lowest = steps.reduce((a, b) => (a.h < b.h ? a : b));
    const highest = steps.reduce((a, b) => (a.h > b.h ? a : b));
    // Vorne ist Norden, also −Z: die hohe Stufe liegt nördlicher.
    expect(highest.z).toBeLessThan(lowest.z);
  });

  it('steigt nach Osten, wenn sie nach Osten zeigt', () => {
    const steps = at('stairs', DIR_E, 2.8);
    const lowest = steps.reduce((a, b) => (a.h < b.h ? a : b));
    const highest = steps.reduce((a, b) => (a.h > b.h ? a : b));
    expect(highest.x).toBeGreaterThan(lowest.x);
  });

  it('lässt jede Stufe bis auf den Boden durchgehen', () => {
    // Ein Keil aus Quadern und keine schwebenden Bretter: darunter bleibt
    // sonst jemand stecken, der von der Seite hineinläuft.
    for (const one of at('stairs')) expect(one.y - one.h / 2).toBeCloseTo(0);
  });

  it('macht die Rampe flacher als die Treppe', () => {
    const rise = (kind: BlockKind): number => {
      const parts = at(kind, DIR_N, 1.2);
      return 1.2 / parts.length;
    };
    expect(rise('ramp')).toBeLessThan(rise('stairs'));
  });
});

describe('Das Podest', () => {
  it('füllt die ganze Kachel', () => {
    const box = solidBounds(at('platform'))!;
    expect(box.maxX - box.minX).toBeCloseTo(TILE);
    expect(box.maxZ - box.minZ).toBeCloseTo(TILE);
  });

  it('hebt den Boden um seine eigene Höhe an — und nur es tut das', () => {
    expect(blockRise('platform', 2)).toBeCloseTo(2);
    expect(blockRise('platform')).toBeCloseTo(BLOCKS.platform.height);
    expect(blockRise('table')).toBe(0);
    expect(blockRise('counter', 1.1)).toBe(0);
  });
});

describe('Geländer und Brüstung', () => {
  it('sitzen auf der Kante und nicht daneben', () => {
    // Süden: die Kante liegt bei +TILE/2. Die Brüstung ist die Kante (sie ist
    // so dick wie eine Wand); das Geländer steht mit seinen dünnen Pfosten
    // knapp innerhalb davon, aber auf derselben Linie.
    expect(solidBounds(at('parapet', DIR_S))!.maxZ).toBeCloseTo(TILE / 2, 2);
    const rail = solidBounds(at('railing', DIR_S))!;
    expect(rail.maxZ).toBeGreaterThan(TILE / 2 - 0.2);
    expect(rail.maxZ).toBeLessThanOrEqual(TILE / 2);
  });

  it('gibt dem Geländer einen Knieholm zwischen Boden und Handlauf', () => {
    const parts = at('railing', DIR_N, 1);
    const middle = parts.filter((one) => one.y > 0.3 && one.y < 0.8 && one.w > 1);
    expect(middle.length).toBeGreaterThan(0);
  });
});

describe('Regal, Tisch, Bank und Kisten', () => {
  it('gibt dem Regal vier Böden', () => {
    const boards = at('shelf').filter((one) => one.h < 0.05);
    expect(boards).toHaveLength(4);
  });

  it('stellt den Tisch auf vier Beine', () => {
    const legs = at('table').filter((one) => one.kind === 'steel');
    expect(legs).toHaveLength(4);
  });

  it('gibt der Bank eine Lehne an der Kante', () => {
    const parts = at('bench', DIR_N);
    const seat = parts.reduce((a, b) => (a.d > b.d ? a : b));
    const back = parts.reduce((a, b) => (a.y > b.y ? a : b));
    // Die Lehne steht höher als die Sitzfläche und weiter an der Kante.
    expect(back.y).toBeGreaterThan(seat.y);
    expect(back.z).toBeLessThan(seat.z);
  });

  it('stapelt Kisten übereinander statt nebeneinander', () => {
    const crates = at('crate');
    const upper = crates.filter((one) => one.y - one.h / 2 > 0.1);
    expect(upper.length).toBeGreaterThan(0);
  });
});
