import { PLAN_WALL_T } from '../editor/levelPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, type Dir } from '../nav/navTile';
import {
  BLOCKS,
  BLOCK_KINDS,
  STAIR_LIFT,
  STEP_RISE,
  STEP_RUN,
  blockModel,
  blockModelSpot,
  blockRise,
  blockSolids,
  turned,
  type BlockKind,
  type BlockSite,
  type ModelBounds,
} from './blocks';
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
    // Sie klebt an der Nordkante und lässt vor sich ein Viertel der Kachel
    // frei — 0,6 m tief auf einer Kachel von einem Meter heißt, dass sie über
    // die Mitte hinausreicht, und das ist eine Küchenzeile auch.
    expect(box.minZ).toBeCloseTo(-TILE / 2 + PLAN_WALL_T / 2, 2);
    expect(box.maxZ).toBeLessThan(TILE / 2 - TILE / 4);
  });

  it('steht an der Ostkante genauso, nur quer', () => {
    const box = solidBounds(at('counter', DIR_E))!;
    expect(box.maxX).toBeCloseTo(TILE / 2 - PLAN_WALL_T / 2, 2);
    expect(box.minX).toBeGreaterThan(-TILE / 2 + TILE / 4);
    // Und über die ganze Kachellänge, wie an der Nordkante auch.
    expect(box.maxZ - box.minZ).toBeCloseTo(TILE);
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
   * **Die zwei Zahlen, wegen denen es diesen Test gibt: 0,2 m und 0,25 m.**
   *
   * So hoch darf eine Stufe höchstens und so tief muss sie mindestens sein
   * (`STEP_RISE`, `STEP_RUN`). Der Character-Controller steigt zwar 0,32 m
   * (`PhysicsLocomotion`), aber eine Stufe, auf die kein Fuß passt, nützt ihm
   * nichts — die Treppe der Straßenküche hatte 0,19 m tiefe Stufen, und man
   * blieb an jeder zweiten hängen. Eine Kachel nimmt deshalb höchstens
   * `STAIR_LIFT` Anstieg; für eine ganze Etage legt `GridPlan.stairs()`
   * mehrere hintereinander.
   */
  it('macht keine Stufe höher und keine flacher als erlaubt', () => {
    for (const lift of [0.2, 0.35, 0.5, STAIR_LIFT]) {
      const parts = at('stairs', DIR_N, lift);
      const steps = parts.map((one) => one.y + one.h / 2).sort((a, b) => a - b);
      let last = 0;
      for (const top of steps) {
        expect(top - last).toBeLessThanOrEqual(STEP_RISE + 1e-9);
        last = top;
      }
      // Und oben kommt sie wirklich an.
      expect(last).toBeCloseTo(lift);
      // Jede Stufe ist tief genug, dass ein Fuß daraufpasst.
      for (const one of parts) expect(one.d).toBeGreaterThanOrEqual(STEP_RUN - 1e-9);
    }
  });

  it('steigt nach vorn — die unterste Stufe liegt hinten', () => {
    const steps = at('stairs', DIR_N, STAIR_LIFT);
    const lowest = steps.reduce((a, b) => (a.h < b.h ? a : b));
    const highest = steps.reduce((a, b) => (a.h > b.h ? a : b));
    // Vorne ist Norden, also −Z: die hohe Stufe liegt nördlicher.
    expect(highest.z).toBeLessThan(lowest.z);
  });

  it('fängt dort an, wo ihr Fuß steht', () => {
    // **Die Zahl, die eine Treppe über mehrere Kacheln erst möglich macht.**
    // Die zweite Kachel eines Laufs steigt nicht von null auf 0,7, sondern von
    // 0,7 auf 1,4 — ohne `lift` stünden vier Treppenkacheln nebeneinander
    // statt hintereinander.
    const raised = blockSolids('stairs', {
      x: 0,
      base: 0,
      z: 0,
      dir: DIR_N,
      height: STAIR_LIFT,
      lift: STAIR_LIFT,
    });
    const box = solidBounds(raised)!;
    expect(box.minY).toBeCloseTo(STAIR_LIFT);
    expect(box.maxY).toBeCloseTo(2 * STAIR_LIFT);
  });

  it('steigt nach Osten, wenn sie nach Osten zeigt', () => {
    const steps = at('stairs', DIR_E, STAIR_LIFT);
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
    // Beide auf ihrer Vorgabehöhe: Eine Rampenkachel nimmt halb so viel
    // Anstieg wie eine Treppenkachel — dafür legt man eben mehr davon
    // hintereinander.
    const rise = (kind: BlockKind): number => {
      const parts = at(kind);
      return BLOCKS[kind].height / parts.length;
    };
    expect(rise('ramp')).toBeLessThan(rise('stairs'));
    expect(BLOCKS.ramp.height).toBeLessThan(BLOCKS.stairs.height);
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
    const middle = parts.filter((one) => one.y > 0.3 && one.y < 0.8 && one.w > TILE / 2);
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

/**
 * **Das Modell, das an die Stelle eines Bausteins tritt** — die Rechnung dazu,
 * ohne three.js und ohne Datei.
 *
 * Gemessen wird im Spiel am **geladenen** Baum und nie an einer abgeschriebenen
 * Zahl (`blocks.blockModelSpot`, der Grund steht dort). Ein Test braucht
 * deshalb keinen Lader, sondern nur einen Umriss — und genau das ist der
 * Schnitt, den diese Datei überall macht: Was Rechnung ist, wird nachgerechnet.
 */

/**
 * Der Umriss von `dungeon/bookcase_single.glb`, nachgemessen an der Datei und
 * mit dem Maßstab seines Pakets multipliziert (`core/kaykitFit.KAYKIT_SCALE`,
 * 0,5): 2,000 × 3,000 × 0,500 Quelleinheiten werden **1,00 × 1,50 × 0,25 m**,
 * mit dem Ursprung in der Mitte der Unterkante und der Rückwand bei z = −0,125.
 */
const BOOKCASE: ModelBounds = {
  minX: -0.5,
  maxX: 0.5,
  minY: 0,
  maxY: 1.5,
  minZ: -0.125,
  maxZ: 0.125,
};

/**
 * Der Kasten, den das Modell am Ende wirklich einnimmt: Umriss, Maßstab,
 * Drehung und Platz zusammengerechnet.
 *
 * Über die vier Ecken und nicht über Breite und Tiefe, denn genau dort steckt
 * der Fehler, den dieser Test finden soll — bei Ost und West tauschen die
 * beiden, und wer das von Hand schreibt, schreibt es einmal falsch.
 */
function placed(
  kind: BlockKind,
  dir: Dir,
  box: ModelBounds = BOOKCASE,
  extra: Partial<BlockSite> = {},
) {
  const spot = blockModelSpot(kind, { x: 0, base: 0, z: 0, dir, ...extra }, box);
  const cos = Math.cos(spot.yaw);
  const sin = Math.sin(spot.yaw);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const cx of [box.minX, box.maxX]) {
    for (const cz of [box.minZ, box.maxZ]) {
      const x = spot.x + cx * spot.scale * cos + cz * spot.scale * sin;
      const z = spot.z - cx * spot.scale * sin + cz * spot.scale * cos;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return {
    spot,
    minX,
    maxX,
    minZ,
    maxZ,
    minY: spot.y + box.minY * spot.scale,
    maxY: spot.y + box.maxY * spot.scale,
  };
}

describe('Woher ein Quader kommt', () => {
  it('schreibt jedem Quader sein Möbel an', () => {
    for (const kind of BLOCK_KINDS) {
      for (const one of at(kind)) expect(one.block).toBe(kind);
    }
  });

  /**
   * **Fünf Adressen, und der Rest bleibt gerechnet.** Die Liste steht hier
   * ausgeschrieben und wird nicht aus `BLOCK_MODELS` abgeleitet: Ein Test, der
   * die Tabelle mit sich selbst vergleicht, prüft nichts. Dieser sagt, welche
   * Datei gemeint ist, und fällt um, wenn jemand sie stillschweigend
   * austauscht.
   */
  const MODELLED: Readonly<Partial<Record<BlockKind, string>>> = {
    shelf: 'dungeon/bookcase_single.glb',
    table: 'furniture-bits/table_small.glb',
    bench: 'furniture-bits/chair_A.glb',
    pillar: 'platformer/neutral/pillar_1x1x4.glb',
    parapet: 'dungeon/barrier_half.glb',
  };

  it('gibt fünf Bausteinen ein Modell aus dem Regal und den anderen keines', () => {
    for (const kind of BLOCK_KINDS) expect(blockModel(kind)).toBe(MODELLED[kind] ?? null);
  });

  /**
   * **Theke und Treppe bleiben gebaut, und das ist eine Entscheidung und kein
   * Vergessen** — die Begründung samt Maßen steht bei `BLOCK_MODELS`. Wer
   * ihnen doch eines gibt, kommt an dieser Zeile vorbei und liest dort nach,
   * warum es bisher keines gab.
   */
  it('lässt die Theke und die Treppe gerechnet', () => {
    expect(blockModel('counter')).toBeNull();
    expect(blockModel('stairs')).toBeNull();
  });
});

describe('Das Bücherregal aus dem Regal', () => {
  it('passt ohne Umrechnung — der Baustein steht auf der Höhe des Modells', () => {
    const one = placed('shelf', DIR_N);
    // Genau `1`: Die Höhe des Bausteins ist die des Modells, und seine Breite
    // ist die Kachel. Wäre eine der beiden Zahlen verstellt, stünde hier
    // etwas anderes — und das ist der Zweck dieser Zeile.
    expect(one.spot.scale).toBeCloseTo(1, 6);
    expect(one.minY).toBeCloseTo(0, 6);
    expect(one.maxY).toBeCloseTo(BLOCKS.shelf.height, 6);
  });

  /**
   * **Die Zeile, wegen der es diese Rechnung gibt.** Ein Modell, das eine
   * Handbreit vor seinem eigenen Körper steht, sieht man erst in der Brille —
   * hier fällt es in einer Millisekunde auf, und zwar in allen vier
   * Richtungen.
   */
  for (const dir of [DIR_N, DIR_E, DIR_S, DIR_W] as const) {
    it(`stellt es an dieselbe Kante wie seine Quader (Richtung ${dir})`, () => {
      const model = placed('shelf', dir);
      const built = solidBounds(at('shelf', dir))!;
      // Die Rückwand liegt auf der Rückseite der gebauten Wangen …
      if (dir === DIR_N) expect(model.minZ).toBeCloseTo(built.minZ, 6);
      if (dir === DIR_S) expect(model.maxZ).toBeCloseTo(built.maxZ, 6);
      if (dir === DIR_E) expect(model.maxX).toBeCloseTo(built.maxX, 6);
      if (dir === DIR_W) expect(model.minX).toBeCloseTo(built.minX, 6);
      // … und quer dazu füllt es die Kachel genauso weit wie sie.
      const acrossModel =
        dir === DIR_N || dir === DIR_S ? model.maxX - model.minX : model.maxZ - model.minZ;
      const acrossBuilt =
        dir === DIR_N || dir === DIR_S ? built.maxX - built.minX : built.maxZ - built.minZ;
      expect(acrossModel).toBeCloseTo(acrossBuilt, 6);
    });

    it(`lässt es auf seiner Kachel (Richtung ${dir})`, () => {
      const one = placed('shelf', dir);
      expect(one.minX).toBeGreaterThanOrEqual(-TILE / 2 - 1e-6);
      expect(one.maxX).toBeLessThanOrEqual(TILE / 2 + 1e-6);
      expect(one.minZ).toBeGreaterThanOrEqual(-TILE / 2 - 1e-6);
      expect(one.maxZ).toBeLessThanOrEqual(TILE / 2 + 1e-6);
    });
  }

  it('wächst nicht über die Kachel hinaus, wenn jemand den Baustein höher stellt', () => {
    // Drei Meter hoch gewünscht, doppelt so hoch wie das Modell — gleichmäßig
    // gestreckt wären das zwei Meter Breite auf einer Kachel von einem. Also
    // bleibt es bei der Kachel und wird eben nicht so hoch.
    const one = placed('shelf', DIR_N, BOOKCASE, { height: 3 });
    expect(one.spot.scale).toBeCloseTo(1, 6);
    expect(one.maxX - one.minX).toBeCloseTo(TILE, 6);
    expect(one.maxY).toBeCloseTo(1.5, 6);
  });

  it('macht es kleiner, wenn der Baustein niedriger steht', () => {
    const one = placed('shelf', DIR_N, BOOKCASE, { height: 0.75 });
    expect(one.spot.scale).toBeCloseTo(0.5, 6);
    expect(one.maxY).toBeCloseTo(0.75, 6);
    expect(one.maxX - one.minX).toBeCloseTo(TILE / 2, 6);
  });

  it('setzt es auf den Boden seiner Etage — und auf seinen Fuß', () => {
    const one = placed('shelf', DIR_N, BOOKCASE, { base: 2.8, lift: 0.7 });
    expect(one.minY).toBeCloseTo(3.5, 6);
  });

  /**
   * **Ein fremder Ursprung ist hier die Regel und nicht die Ausnahme.** Unter
   * 4 470 gekauften Dateien steht der Nullpunkt mal in der Mitte der
   * Unterkante, mal irgendwo daneben; gerechnet wird deshalb mit dem
   * gemessenen Umriss und nicht mit der Annahme, dass er mittig sitzt.
   */
  it('stellt auch ein Modell mit verschobenem Ursprung richtig hin', () => {
    const shifted: ModelBounds = {
      minX: 2,
      maxX: 3,
      minY: 5,
      maxY: 6.5,
      minZ: -1.125,
      maxZ: -0.875,
    };
    const one = placed('shelf', DIR_N, shifted);
    expect(one.spot.scale).toBeCloseTo(1, 6);
    // Mitte auf der Kachelachse, Unterkante auf dem Boden, Rückwand an der
    // Kante — dieselben drei Zusagen wie beim Bücherregal.
    expect((one.minX + one.maxX) / 2).toBeCloseTo(0, 6);
    expect(one.minY).toBeCloseTo(0, 6);
    expect(one.minZ).toBeCloseTo(solidBounds(at('shelf', DIR_N))!.minZ, 6);
  });
});

/**
 * **Die vier Modelle, die zum Bücherregal dazugekommen sind** — jedes mit dem
 * Umriss, den seine Datei hergibt, multipliziert mit dem Maßstab seines Pakets
 * (`core/kaykitFit`, überall 0,5).
 *
 * Abgeschriebene Zahlen, ja — aber an der richtigen Stelle: Im Spiel misst der
 * Aufrufer den **geladenen** Baum, und diese Konstanten sind der Beleg dafür,
 * woran die Rechnung hier nachgerechnet wurde. Wer ein Paket aktualisiert und
 * andere Maße vorfindet, schreibt sie hier hin und sieht in derselben Minute,
 * ob die Bausteine noch aufgehen.
 */

/** `furniture-bits/table_small.glb`: 1,000 × 1,000 × 1,000 — im Aufriss quadratisch. */
const TABLE: ModelBounds = { minX: -0.25, maxX: 0.25, minY: 0, maxY: 0.5, minZ: -0.25, maxZ: 0.25 };

/**
 * `furniture-bits/chair_A.glb`: 0,750 × 1,258 × 0,845, mit der Lehne bei −z —
 * also herum wie ein Baustein, der an seiner Kante steht und in den Raum
 * schaut.
 */
const CHAIR: ModelBounds = {
  minX: -0.1875,
  maxX: 0.1875,
  minY: 0,
  maxY: 0.629,
  minZ: -0.235,
  maxZ: 0.1875,
};

/** `platformer/neutral/pillar_1x1x4.glb`: 0,800 × 4,000 × 0,800 — ein Fünftel so breit wie hoch. */
const PILLAR: ModelBounds = { minX: -0.2, maxX: 0.2, minY: 0, maxY: 2, minZ: -0.2, maxZ: 0.2 };

/**
 * `dungeon/barrier_half.glb`: 2,000 × 1,100 × 0,500 — und der Ursprung sitzt
 * **nicht** in der Mitte: Die x-Achse läuft von 0 bis 2. Genau dafür rechnet
 * `blockModelSpot` mit der gemessenen Mitte und nicht mit der Annahme.
 */
const BARRIER: ModelBounds = { minX: 0, maxX: 1, minY: 0, maxY: 0.55, minZ: -0.125, maxZ: 0.125 };

/** Welcher Umriss zu welchem Baustein gehört — für die Läufe über alle vier. */
const BOXES: Readonly<Partial<Record<BlockKind, ModelBounds>>> = {
  shelf: BOOKCASE,
  table: TABLE,
  bench: CHAIR,
  pillar: PILLAR,
  parapet: BARRIER,
};

describe('Tisch, Bank, Säule und Brüstung aus dem Regal', () => {
  it('bringt den Tisch auf Tischhöhe und lässt ihn quadratisch', () => {
    const one = placed('table', DIR_N, TABLE);
    // 0,75 m hoch aus 0,50 m Modell: anderthalbmal so groß, und weil der
    // Aufriss quadratisch ist, ist er damit auch 0,75 m breit.
    expect(one.spot.scale).toBeCloseTo(1.5, 6);
    expect(one.maxY).toBeCloseTo(BLOCKS.table.height, 6);
    expect(one.maxX - one.minX).toBeCloseTo(0.75, 6);
    expect(one.maxZ - one.minZ).toBeCloseTo(0.75, 6);
  });

  /**
   * **Die Zeile, wegen der die Höhe am Gebauten gemessen wird und nicht in der
   * Tabelle nachgeschlagen.** `BLOCKS.bench.height` ist die **Sitzfläche**
   * (0,46 m); die Lehne steht darüber. Ein Stuhl, der auf 0,46 m eingepasst
   * würde, wäre samt Lehne so hoch wie seine eigene Sitzfläche.
   */
  it('passt den Stuhl auf die Oberkante der Bank ein und nicht auf ihre Sitzfläche', () => {
    const one = placed('bench', DIR_N, CHAIR);
    const built = solidBounds(at('bench', DIR_N))!;
    expect(one.maxY).toBeCloseTo(built.maxY, 6);
    expect(one.maxY).toBeGreaterThan(BLOCKS.bench.height * 1.5);
  });

  it('macht die Säule so hoch, wie sie bestellt ist — und dabei schlank', () => {
    const one = placed('pillar', DIR_N, PILLAR);
    // Wandhoch (2,80 m) aus 2,00 m Modell: Faktor 1,4, und ein Fünftel davon
    // ist die Breite.
    expect(one.spot.scale).toBeCloseTo(1.4, 6);
    expect(one.maxY).toBeCloseTo(BLOCKS.pillar.height, 6);
    expect(one.maxX - one.minX).toBeCloseTo(0.56, 6);
    // Auch eine kürzere Säule bleibt maßstäblich: 2,60 m in der Boxengasse.
    const short = placed('pillar', DIR_N, PILLAR, { height: 2.6 });
    expect(short.spot.scale).toBeCloseTo(1.3, 6);
    expect(short.maxX - short.minX).toBeCloseTo(0.52, 6);
  });

  it('nimmt die Brüstung ohne Umrechnung — der Baustein steht auf der Höhe des Modells', () => {
    const one = placed('parapet', DIR_N, BARRIER);
    expect(one.spot.scale).toBeCloseTo(1, 6);
    expect(one.maxY).toBeCloseTo(BLOCKS.parapet.height, 6);
    // Genau eine Kachel breit, und damit ergeben zwei nebeneinander ein
    // durchgehendes Geländer.
    expect(one.maxX - one.minX).toBeCloseTo(TILE, 6);
  });

  /**
   * **Die Brüstung steht auf der Kachelkante, das Regal eine Handbreit davor**
   * — und beide Modelle stehen dort, wo ihre eigenen Quader stehen. Eine feste
   * Zahl für beide gäbe es nicht: Hinter dem Regal kann eine Wand stecken,
   * hinter der Brüstung ist die Luft, über der sie steht.
   */
  for (const kind of ['shelf', 'bench', 'parapet'] as const) {
    for (const dir of [DIR_N, DIR_E, DIR_S, DIR_W] as const) {
      it(`stellt ${kind} an dieselbe Kante wie seine Quader (Richtung ${dir})`, () => {
        const model = placed(kind, dir, BOXES[kind]);
        const built = solidBounds(at(kind, dir))!;
        if (dir === DIR_N) expect(model.minZ).toBeCloseTo(built.minZ, 6);
        if (dir === DIR_S) expect(model.maxZ).toBeCloseTo(built.maxZ, 6);
        if (dir === DIR_E) expect(model.maxX).toBeCloseTo(built.maxX, 6);
        if (dir === DIR_W) expect(model.minX).toBeCloseTo(built.minX, 6);
      });
    }
  }

  /**
   * **Und Tisch und Säule stehen mittig** — in beiden Achsen und in jeder
   * Richtung. Sie waren es, an denen die feste Kante falsch war: Ein Tisch mit
   * dem Rücken an der Wand steht nicht über seinen vier Beinen.
   */
  for (const kind of ['table', 'pillar'] as const) {
    for (const dir of [DIR_N, DIR_E, DIR_S, DIR_W] as const) {
      it(`stellt ${kind} mitten auf seine Kachel (Richtung ${dir})`, () => {
        const one = placed(kind, dir, BOXES[kind]);
        expect((one.minX + one.maxX) / 2).toBeCloseTo(0, 6);
        expect((one.minZ + one.maxZ) / 2).toBeCloseTo(0, 6);
      });
    }
  }

  /** Dieselbe Zusage wie für die Quader: Keines ragt in die Nachbarkachel. */
  for (const kind of BLOCK_KINDS) {
    const box = BOXES[kind];
    if (!box) continue;
    for (const dir of [DIR_N, DIR_E, DIR_S, DIR_W] as const) {
      it(`lässt ${kind} auf seiner Kachel (Richtung ${dir})`, () => {
        const one = placed(kind, dir, box);
        expect(one.minX).toBeGreaterThanOrEqual(-TILE / 2 - 1e-6);
        expect(one.maxX).toBeLessThanOrEqual(TILE / 2 + 1e-6);
        expect(one.minZ).toBeGreaterThanOrEqual(-TILE / 2 - 1e-6);
        expect(one.maxZ).toBeLessThanOrEqual(TILE / 2 + 1e-6);
        expect(one.minY).toBeCloseTo(0, 6);
      });
    }
  }
});

/**
 * **Die Zahlen, die mit einem Modell gewandert sind.**
 *
 * Beim Regal war es die Höhe (1,90 → 1,50 m), bei der Brüstung dieselbe Sache
 * (0,90 → 0,55 m): Das Modell ist genau eine Kachel breit, breiter darf es
 * nicht werden, und ein sichtbares Geländer vor einem unsichtbaren Hindernis
 * ist der Fehler, den diese Datei verhindern soll. Steht hier eine andere
 * Zahl, gehört das Modell dazu nachgemessen.
 */
describe('Was ein Modell an der Tabelle verändert hat', () => {
  it('hält Regal und Brüstung auf der Höhe ihrer Modelle', () => {
    expect(BLOCKS.shelf.height).toBeCloseTo(1.5, 6);
    expect(BLOCKS.parapet.height).toBeCloseTo(0.55, 6);
  });

  /**
   * **Und die Brüstung hält immer noch auf**: Der Character-Controller steigt
   * 0,32 m (`physics/PhysicsLocomotion`), eine Mauer von 0,55 m ist mehr. Wäre
   * sie es nicht, wäre aus einem Geländer eine Schwelle geworden.
   */
  it('lässt die Brüstung höher als ein Schritt', () => {
    expect(BLOCKS.parapet.height).toBeGreaterThan(0.32);
    expect(solidBounds(at('parapet', DIR_N))!.maxY).toBeCloseTo(BLOCKS.parapet.height, 6);
  });
});
