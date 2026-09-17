import {
  BUILD_AHEAD,
  EMPTY_LOAD,
  buildFree,
  goesHomeOnEdit,
  holdForRim,
  overlaps,
  ridesAlong,
  tileAhead,
  tilesOf,
  turnAhead,
  whyNotBuilt,
  whyNotLifted,
  type BuildSpot,
} from './kitchenBuild';
import { BELT_EMPTY, advanceBelts, beltStep } from './kitchenBelt';
import { FRY_SECONDS, advanceStove, onStove } from './kitchenClock';
import type { Turn } from './kitchenPlan';

/**
 * **Der Umbau, nachgerechnet** (`kitchenBuild.ts`).
 *
 * Zwei Fehler sind es, die man im Headset erst merkt, wenn die Küche schon
 * halb verstellt ist: ein Möbel, das in der Wand steckt, und zwei Möbel auf
 * derselben Kachel. Beide sind hier eine Zeile.
 */

/** Die Küche, wie sie im Grundriss steht — 24 × 11 Kacheln (`layout.KITCHEN`). */
const BOUNDS = { w: 24, d: 11 };

/** Ein Stück Grundfläche, kurz geschrieben. */
function spot(x: number, z: number, w = 1, d = 1): BuildSpot {
  return { x, z, w, d };
}

describe('welche Kachel gemeint ist', () => {
  /**
   * Der Ursprung liegt hier auf null, damit in den Fällen die **Kachel**
   * steht und nicht eine Verschiebung, die man im Kopf abziehen muss.
   */
  const origin = { x: 0, z: 0 };

  test('die Kachel vor der Figur, nicht die, auf der sie steht', () => {
    // Mitte der Kachel 2/3, Blick nach Süden (+z): gemeint ist 2/4.
    expect(tileAhead({ x: 2.5, z: 3.5 }, { x: 0, z: 1 }, origin)).toEqual({ x: 2, z: 4 });
    // Und nach Norden entsprechend 2/2.
    expect(tileAhead({ x: 2.5, z: 3.5 }, { x: 0, z: -1 }, origin)).toEqual({ x: 2, z: 2 });
  });

  test('die halbe Kachel reicht über die eigene Kante und nicht weiter', () => {
    // Genau eine Kachelkante voraus: `BUILD_AHEAD` ist größer als 0,5 …
    expect(BUILD_AHEAD).toBeGreaterThan(0.5);
    // … und kleiner als 1,5, sonst spränge das Ziel über die Nachbarkachel.
    expect(BUILD_AHEAD).toBeLessThan(1.5);
  });

  test('die Länge der Richtung zählt nicht — nur wohin sie zeigt', () => {
    const near = tileAhead({ x: 2.5, z: 3.5 }, { x: 0, z: 1 }, origin);
    const far = tileAhead({ x: 2.5, z: 3.5 }, { x: 0, z: 40 }, origin);
    expect(far).toEqual(near);
  });

  test('ohne Richtung gilt die eigene Kachel', () => {
    expect(tileAhead({ x: 5.2, z: 6.8 }, { x: 0, z: 0 }, origin)).toEqual({ x: 5, z: 6 });
  });

  test('der Ursprung der Zone wird herausgerechnet', () => {
    // Dieselbe Stelle, aber die Zone fängt bei x = 12 / z = −31 an
    // (`layout.KITCHEN`) — herauskommen muss die Kachel **relativ** dazu.
    expect(tileAhead({ x: 14.5, z: -27.5 }, { x: 0, z: 1 }, { x: 12, z: -31 })).toEqual({
      x: 2,
      z: 4,
    });
  });
});

describe('wie herum das Getragene zeigt', () => {
  test('die vier Richtungen, und Norden ist die Null', () => {
    expect(turnAhead({ x: 0, z: -1 })).toBe(0);
    expect(turnAhead({ x: -1, z: 0 })).toBe(1);
    expect(turnAhead({ x: 0, z: 1 })).toBe(2);
    expect(turnAhead({ x: 1, z: 0 })).toBe(3);
  });

  test('die Drehung ist die Laufrichtung des Bandes', () => {
    // Der ganze Zweck der Rechnung: Wer nach Süden schaut und absetzt, hat ein
    // Band gebaut, das nach Süden schiebt (`kitchenBelt.beltStep`).
    expect(beltStep(turnAhead({ x: 0, z: 1 }))).toEqual({ dx: 0, dz: 1 });
    expect(beltStep(turnAhead({ x: -1, z: 0 }))).toEqual({ dx: -1, dz: 0 });
    expect(beltStep(turnAhead({ x: 0.2, z: -0.9 }))).toEqual({ dx: 0, dz: -1 });
  });

  test('schräg zählt die längere Hälfte', () => {
    expect(turnAhead({ x: -0.9, z: 0.4 })).toBe(1);
    expect(turnAhead({ x: -0.4, z: 0.9 })).toBe(2);
  });

  test('genau auf der Diagonale gewinnt Nord-Süd — und zwar immer dieselbe', () => {
    expect(turnAhead({ x: 1, z: 1 })).toBe(2);
    expect(turnAhead({ x: -1, z: 1 })).toBe(2);
    expect(turnAhead({ x: 1, z: -1 })).toBe(0);
    expect(turnAhead({ x: -1, z: -1 })).toBe(0);
  });

  test('die Länge zählt nicht, nur wohin es zeigt', () => {
    expect(turnAhead({ x: 0, z: 40 })).toBe(turnAhead({ x: 0, z: 1 }));
  });

  test('ohne Richtung bleibt es, wie es liegt', () => {
    expect(turnAhead({ x: 0, z: 0 }, 3)).toBe(3);
    // Und ohne etwas zu behalten, ist es Norden.
    expect(turnAhead({ x: 0, z: 0 })).toBe(0);
  });
});

describe('was eine Grundfläche belegt', () => {
  test('eine Kachel ist eine Kachel', () => {
    expect(tilesOf(spot(3, 4))).toEqual([{ x: 3, z: 4 }]);
  });

  test('die Spüle belegt zwei nebeneinander', () => {
    expect(tilesOf(spot(5, 0, 2, 1))).toEqual([
      { x: 5, z: 0 },
      { x: 6, z: 0 },
    ]);
  });

  test('überlappen heißt: eine gemeinsame Kachel', () => {
    expect(overlaps(spot(5, 0, 2, 1), spot(6, 0))).toBe(true);
    expect(overlaps(spot(5, 0, 2, 1), spot(7, 0))).toBe(false);
    // Aneinander ist nicht ineinander — eine Zeile aus Schränken ist erlaubt.
    expect(overlaps(spot(3, 4), spot(4, 4))).toBe(false);
  });
});

describe('ob hier Platz ist', () => {
  const taken = [spot(3, 4), spot(5, 0, 2, 1)];

  test('freie Kachel', () => {
    expect(buildFree(spot(8, 6), taken, BOUNDS)).toBe(true);
    expect(whyNotBuilt(spot(8, 6), taken, BOUNDS)).toBeNull();
  });

  test('besetzte Kachel sagt, was los ist', () => {
    expect(buildFree(spot(3, 4), taken, BOUNDS)).toBe(false);
    expect(whyNotBuilt(spot(3, 4), taken, BOUNDS)).toBe('Hier steht schon etwas');
  });

  test('ein breites Möbel stößt auch seitlich an', () => {
    // Zwei Kacheln ab 4/0 greifen in die Spüle ab 5/0 hinein.
    expect(buildFree(spot(4, 0, 2, 1), taken, BOUNDS)).toBe(false);
  });

  test('außerhalb der Küche geht nicht — auch nicht knapp', () => {
    expect(buildFree(spot(-1, 3), taken, BOUNDS)).toBe(false);
    expect(buildFree(spot(23, 3, 2, 1), taken, BOUNDS)).toBe(false);
    expect(buildFree(spot(0, 11), taken, BOUNDS)).toBe(false);
    expect(whyNotBuilt(spot(0, 11), taken, BOUNDS)).toBe('Das steht dann außerhalb der Küche');
    // Die letzte Kachel gehört noch dazu.
    expect(buildFree(spot(23, 10), taken, BOUNDS)).toBe(true);
  });
});

/**
 * **Das Umstellen mit Inhalt, nachgerechnet.**
 *
 * Der Auftrag in einem Satz: „Küchen Elemente sollen übrigens auch umgestellt
 * werden können bei dem Küche umbauen Modus, wenn zb eine Pfanne auf dem Herd
 * steht. Dann wird dieses Element so mit Pfanne darauf bewegt." Hier stehen
 * die Fälle, die man sonst erst im Betrieb merkt — mehrere Dinge, ein
 * arbeitendes Möbel, ein Band ohne Nachbarn, eine belegte Kachel.
 */
describe('was beim Aufheben mitfährt', () => {
  it('lässt ein Möbel mit etwas darauf jetzt aufheben — das war der Auftrag', () => {
    expect(whyNotLifted('Herd', { things: 1, stack: 0, burning: false })).toBeNull();
    expect(whyNotLifted('Ausgabe', { things: 0, stack: 4, burning: false })).toBeNull();
    expect(whyNotLifted('Küchenzeile', EMPTY_LOAD)).toBeNull();
  });

  /**
   * **Ein Möbel mit mehreren Dingen darauf** — die Teller auf der Ausgabe, der
   * Stapel auf dem Abtropfbrett. Es zählt beides, und zwar getrennt: Auf der
   * Fläche liegt ein Gericht (`Station.on`), daneben steht ein Stapel
   * (`Station.stack`), und wer nur das eine mitnähme, ließe das andere in der
   * Luft stehen.
   */
  it('nimmt sowohl das Liegende als auch den Stapel mit', () => {
    expect(ridesAlong(EMPTY_LOAD)).toBe(false);
    expect(ridesAlong({ things: 1, stack: 0, burning: false })).toBe(true);
    expect(ridesAlong({ things: 0, stack: 4, burning: false })).toBe(true);
    expect(ridesAlong({ things: 1, stack: 4, burning: false })).toBe(true);
  });

  /**
   * **Das Feuer ist der eine Grund, der bleibt.** Gelöscht wird mit dem
   * Feuerlöscher in der Hand (`kitchenSpray.sprayOn`), und wer den Herd trägt,
   * hat keine Hand mehr frei — ein brennender Herd vor dem Bauch ließe sich
   * mit nichts mehr ausmachen.
   */
  it('lässt einen brennenden Herd stehen und sagt, warum', () => {
    const why = whyNotLifted('Herd', { things: 1, stack: 0, burning: true });
    expect(why).toBe('Herd brennt — erst löschen');
    // Auch leer nicht: Es brennt der Herd und nicht die Pfanne.
    expect(whyNotLifted('Herd', { things: 0, stack: 0, burning: true })).not.toBeNull();
  });

  /**
   * **Ein arbeitendes Möbel hält an, es bricht nicht ab.** Getragen wird die
   * Uhr gar nicht erst gefüttert (`kitchen.cook` überspringt, was in den
   * Händen liegt), und beim Absetzen läuft sie dort weiter, wo sie stand — es
   * gibt absichtlich kein `settle` beim Absetzen (`kitchen.dropPiece`).
   *
   * Die Gegenprobe steht daneben: Ein Neuanfang fiele auf null zurück, und
   * genau das wäre die Strafe fürs Umstellen, die hier niemand will.
   */
  it('hält die Uhr des Herds an, statt sie zurückzusetzen', () => {
    const hot = advanceStove(onStove('patty'), 1.5).state;
    expect(hot.time).toBeCloseTo(1.5, 6);
    // Drei Bilder lang getragen: kein Aufruf, also kein Fortschritt — und kein
    // Verlust. Auch kein Feuer, das in den Händen ausbräche.
    expect(hot.fire).toBe(false);
    // Abgesetzt, und es geht weiter, wo es stand.
    expect(advanceStove(hot, 0.5).state.time).toBeCloseTo(2, 6);
    expect(FRY_SECONDS).toBeGreaterThan(2);
    // Und so sähe der Abbruch aus, den es hier nicht gibt.
    expect(onStove('patty').time).toBe(0);
  });

  /**
   * **Ein Band, dessen Nachbar wegzieht**, schiebt ins Leere — und das heißt
   * hier: Es schiebt gar nicht. Die Zone meldet ein getragenes Möbel erst gar
   * nicht an (`kitchen.runBelts` überspringt `home.held`), also steht das Ziel
   * nicht auf dem Brett, und `advanceBelts` streicht es (`to = null`). Das
   * Ding bleibt liegen, wo es liegt.
   */
  it('lässt ein Band stehen, dessen Ziel gerade getragen wird', () => {
    const before = advanceBelts(
      [
        { id: 'belt', loaded: true, state: BELT_EMPTY, to: 'ablage', pull: null },
        { id: 'ablage', loaded: false, state: BELT_EMPTY, to: null, pull: null },
      ],
      0.2,
    );
    expect(before.states.get('belt')?.moving).toBe(true);

    // Dieselbe Küche, nur ist die Ablage jetzt in den Händen — sie fehlt in
    // der Liste, und das Band fährt nicht los.
    const after = advanceBelts(
      [{ id: 'belt', loaded: true, state: BELT_EMPTY, to: 'ablage', pull: null }],
      0.2,
    );
    expect(after.moves).toEqual([]);
    // Weder eine Fahrt noch eine gezeichnete Bewegung: Das Ding liegt still.
    expect(after.states.get('belt')?.moving ?? false).toBe(false);
    expect(after.carry.size).toBe(0);
  });

  /**
   * **Eine belegte Kachel bleibt belegt**, ob das getragene Möbel nun voll ist
   * oder leer: Was mitfährt, ändert die Grundfläche nicht. Und die eigene
   * Kachel ist frei, solange man trägt — das Möbel steht nicht in `taken`.
   */
  it('prüft den Platz unverändert, auch wenn etwas mitfährt', () => {
    const bounds = { w: 24, d: 11 };
    const here: BuildSpot = { x: 3, z: 3, w: 1, d: 1 };
    const nachbar: BuildSpot = { x: 4, z: 3, w: 1, d: 1 };
    // Der Nachbar steht, die eigene Kachel ist beim Tragen leer.
    expect(buildFree(here, [nachbar], bounds)).toBe(true);
    expect(buildFree(nachbar, [nachbar], bounds)).toBe(false);
    expect(whyNotBuilt(nachbar, [nachbar], bounds)).toBe('Hier steht schon etwas');
    expect(whyNotBuilt({ x: -1, z: 3, w: 1, d: 1 }, [], bounds)).toBe(
      'Das steht dann außerhalb der Küche',
    );
  });
});

/**
 * **An welcher Kante man zufasst, so liegt es in den Händen** (`holdForRim`).
 *
 * Die Regel ist eine einzige, und der Test rechnet sie nach, statt die vier
 * Zahlen abzuschreiben: Die gegriffene Kante muss nach dem Absetzen zur Figur
 * zeigen.
 */
describe('wie ein Möbel in den Händen liegt', () => {
  /** Wohin die Kante `id` zeigt, wenn das Möbel um `turn` Viertel gedreht dasteht. */
  function edgeAfter(id: string, turn: Turn): { x: number; z: number } {
    const base: Record<string, { x: number; z: number }> = {
      '+x': { x: 1, z: 0 },
      '-x': { x: -1, z: 0 },
      '+z': { x: 0, z: 1 },
      '-z': { x: 0, z: -1 },
    };
    const angle = (turn * Math.PI) / 2;
    const edge = base[id];
    return {
      x: edge.x * Math.cos(angle) + edge.z * Math.sin(angle),
      z: -edge.x * Math.sin(angle) + edge.z * Math.cos(angle),
    };
  }

  it('lässt die gegriffene Kante der Figur zugewandt', () => {
    // Die Figur schaut nach Norden (-z), das Möbel steht also in `turn = hold`
    // (`kitchen.facePiece`): Die gegriffene Kante muss nach Süden zeigen.
    for (const id of ['+x', '-x', '+z', '-z']) {
      const towards = edgeAfter(id, holdForRim(id));
      expect(towards.x).toBeCloseTo(0, 6);
      expect(towards.z).toBeCloseTo(1, 6);
    }
  });

  it('bleibt ohne Griff bei „Vorderseite nach vorn" — wie von oben immer', () => {
    expect(holdForRim(null)).toBe(0);
    expect(holdForRim(undefined)).toBe(0);
    // Und der Griff hinten am Möbel ist genau dieser Fall.
    expect(holdForRim('+z')).toBe(0);
    // Ein Name, den es nicht gibt, ändert nichts — keine Ausnahme, keine
    // Verdrehung.
    expect(holdForRim('boden')).toBe(0);
  });

  it('nennt die vier Viertel, wie sie in den Händen heißen', () => {
    // `HOLD_LABELS` in `kitchen.ts`: 0 nach vorn, 1 nach links, 2 zu dir,
    // 3 nach rechts.
    expect(holdForRim('-x')).toBe(1);
    expect(holdForRim('-z')).toBe(2);
    expect(holdForRim('+x')).toBe(3);
  });
});

describe('was beim Anschalten des Umbaus aus der Hand wird', () => {
  /**
   * Der Fehler, der hier festgenagelt wird, sah man nicht beim Anschalten,
   * sondern zehn Minuten später am leeren Herd: Der Umbau warf das Getragene
   * weg, und Pfanne, Topf und Feuerlöscher gibt es genau einmal.
   */
  test('was einen Platz hat, geht dorthin zurück', () => {
    expect(goesHomeOnEdit({ key: 'stove' }, false)).toBe(true);
  });

  test('was keinen hat, wird weggeworfen — das Brötchen kommt aus der Ausgabe', () => {
    expect(goesHomeOnEdit(null, false)).toBe(false);
    expect(goesHomeOnEdit(undefined, false)).toBe(false);
  });

  test('ein belegter Platz nimmt nichts mehr an — sonst würden aus einem zwei', () => {
    // Ein Zugband hat inzwischen etwas auf den Herd geschoben.
    expect(goesHomeOnEdit({ key: 'stove' }, true)).toBe(false);
  });
});
