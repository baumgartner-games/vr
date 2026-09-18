import { CHEF_HEIGHT } from '../../../core/chefFit';
import {
  KITCHEN_NAMES,
  kitchenDeck,
  kitchenPiece,
  kitchenWorkHeight,
} from '../../../core/kitchenFit';
import { TOP_DOWN_TILT } from '../../../core/topDownPose';
import { KITCHEN } from '../layout';
import { PLATE_HEIGHT, stackHeight } from './kitchenProps';
import type { KitchenItem, StationKind } from './kitchenCarry';
import { beltGrabs, beltKind, beltReach, beltReleases, beltStep, beltWants } from './kitchenBelt';
import { chopStage } from './kitchenRecipes';
import {
  BUILD_BUTTON_TILE,
  HANDS_BUTTON_TILE,
  KITCHEN_EYE_MARGIN,
  KITCHEN_SHOWN,
  KITCHEN_SPOTS,
  TRIAL_BUTTONS,
  PIPELINE,
  RADIO_TILE,
  RACK_AIR,
  RACK_RAISE,
  SHOW_X,
  footprint,
  inKitchen,
  passTop,
  rackLift,
  stationKind,
  type Spot,
} from './kitchenPlan';

/**
 * **Der Aufbau der Küche, nachgerechnet** — ohne three.js, ohne Modell, ohne
 * Zone (`kitchenPlan.ts`).
 *
 * Zwei Sorten Fehler stehen hier im Weg, und beide sieht man im Headset erst,
 * wenn man davorsteht:
 *
 * - **Ein Möbel in der falschen Rolle.** Ob ein `serve-counter` Brötchen
 *   ausgibt oder bloß eine Ablage ist, entscheidet eine Zeile im Aufbau. Wer
 *   sie vergisst, bekommt eine Küche ohne Zutaten — und sucht den Fehler in
 *   der Regel nebenan, wo er nicht ist.
 * - **Eine Höhe, die knapp nicht stimmt.** Das Ausgaberegal steht auf
 *   derselben Kachel wie die Theke; ein paar Zentimeter zu tief, und es klebt
 *   wieder darauf.
 *
 * Wo der Grundriss selbst geprüft wird — Kacheln, Kosten, Überschneidungen —,
 * steht eine Zone weiter oben (`worlds/test/testPlan.test.ts`).
 */

/** Nur die Möbel der Küche; der Schauraum spielt nicht mit. */
const WORKING = KITCHEN_SPOTS.filter((spot) => !spot.show);

/**
 * **Und davon nur die alte Küche** — alles westlich der Werkhalle
 * (`kitchenPlan.PIPELINE`).
 *
 * Seit die Halle dazugekommen ist, stehen in dieser Zone zwei Aufbauten
 * nebeneinander, und die meisten Aussagen hier gelten für genau einen davon:
 * „vier Förderbänder in der Spalte x = 9" ist eine Aussage über die Küche und
 * nicht über die Straße, die nebenan noch drei weitere Bänder aufstellt. Wer
 * beide in einen Topf wirft, bekommt Tests, die bei jedem neuen Möbel in der
 * Halle umgeschrieben werden müssen.
 */
const KITCHEN_SIDE = WORKING.filter((spot) => spot.x < PIPELINE.x);

/** Und die Straße in der Werkhalle für sich. */
const HALL = WORKING.filter((spot) => spot.x >= PIPELINE.x);

/** Und andersherum: die Schaustücke allein. */
const SHOWN = KITCHEN_SPOTS.filter((spot) => spot.show);

/**
 * Was an diesem Platz steht — mit **allen drei** Angaben, die `stationKind`
 * kennt. Ein Test, der `role` vergisst, prüft eine Küche, die es nicht gibt:
 * Die vier Tische vor der Theke wären darin Arbeitsflächen.
 */
function kindOf(spot: Spot): StationKind | null {
  return stationKind(spot.name, spot.gives, spot.role);
}

describe('die Rollen der Möbel', () => {
  /**
   * **Die Tabelle Möbel → Stationsart**, einmal ausgeschrieben.
   *
   * Sie ist die Probe darauf, dass die drei Wege durch `stationKind`
   * zusammenpassen: das ausgebende Möbel, die Tabelle der Sonderrollen und
   * der Rest, der über `KitchenPiece.worktop` zur Ablage wird.
   */
  const table: readonly [string, KitchenItem | undefined, StationKind | null][] = [
    ['bin', undefined, 'bin'],
    ['board', undefined, 'board'],
    ['pass', undefined, 'serve'],
    ['extinguisher', undefined, 'rack'],
    ['stove-pan', undefined, 'stove'],
    // Die beiden anderen Herde sind Ablagen: Es gibt genau eine Pfanne.
    ['stove', undefined, 'top'],
    ['stove-pot', undefined, 'top'],
    ['counter', undefined, 'top'],
    ['table', undefined, 'top'],
    ['serve-counter', undefined, 'top'],
    // Dasselbe Möbel mit einer Zutat darin ist eine Ausgabe.
    ['serve-counter', 'bun', 'box'],
    ['plate-counter', 'plate', 'box'],
    // Die Spüle sind zwei Stationen geworden: Im Becken wird gespült, auf dem
    // Abtropfbrett stapeln sich die sauberen Teller. Möbel, die so heißen,
    // brauchen dafür keine Zeile im Aufbau.
    ['sink-basin', undefined, 'sink'],
    ['sink-drain', undefined, 'drain'],
    // Das Förderband gibt es nur in dieser einen Rolle — ein Band, das nicht
    // schiebt, wäre ein schmales Brett.
    ['belt', undefined, 'belt'],
    // Und das Zugband ist für `A` dasselbe: eine Ablage, die weiterschiebt.
    // Dass es sich von selbst etwas holt, entscheidet die Bandrechnung und
    // nicht der Griff (`kitchenBelt.BeltTile.pull`).
    ['belt-pull', undefined, 'belt'],
    // Und was keine Arbeitsfläche ist, hört gar nicht erst auf `A`.
    ['plate-rack', undefined, null],
  ];

  it.each(table)('macht aus %s (gibt %s) eine Station der Art %s', (name, gives, kind) => {
    expect(stationKind(name, gives)).toBe(kind);
  });

  /**
   * **Die Rolle am Platz schlägt alles.**
   *
   * Sie ist das, was jemand an genau dieser Stelle hingeschrieben hat — und
   * ein Feld, das der Katalog oder `gives` überstimmen könnte, wäre ein Feld,
   * das manchmal wirkt. Der Fall ist nicht erfunden: Derselbe Arbeitstisch
   * steht in dieser Küche als Gästetisch, als Geschirrrückgabe und (auf der
   * Insel) als gewöhnliche Ablage.
   */
  it('gibt der Rolle am Platz den Vorrang vor Katalog und Ausgabe', () => {
    expect(stationKind('table')).toBe('top');
    expect(stationKind('table', undefined, 'table')).toBe('table');
    expect(stationKind('table', undefined, 'return')).toBe('return');
    // Auch vor `gives`, und auch bei einem Möbel mit eigener Tabellenzeile.
    expect(stationKind('serve-counter', 'bun')).toBe('box');
    expect(stationKind('serve-counter', 'bun', 'table')).toBe('table');
    expect(stationKind('bin', undefined, 'return')).toBe('return');
    // Ohne Rolle bleibt alles, wie es war — das Feld ist freiwillig.
    expect(stationKind('bin')).toBe('bin');
  });

  /** Ein Möbel, das es nicht gibt, ist keine Station — und kein Absturz. */
  it('kennt kein Möbel, das nicht im Katalog steht', () => {
    expect(stationKind('kühlschrank')).toBeNull();
  });

  /**
   * **Vier Zutaten, viermal dasselbe Möbel.** Die Kisten sind abgeschafft; was
   * ausgibt, ist eine Ausgabe aus dem Katalog mit einem Bild vorn daran.
   *
   * Gezählt wird die **Küche** und nicht die Werkhalle: Dort steht die
   * Bandstraße mit ihren eigenen Vorräten, und die sind kein zweiter Satz
   * Ausgaben für den Koch, sondern der Anfang von drei Bahnen (`HALL`). Eine
   * Küche mit zwei Brötchenausgaben nebeneinander wäre ein Fehler, eine Halle
   * mit einer eigenen ist der Punkt.
   */
  it('gibt jede Zutat genau einmal aus', () => {
    const gives = KITCHEN_SIDE.filter((spot) => spot.gives);
    expect(gives.map((spot) => spot.gives).sort()).toEqual([
      'bun',
      'lettuce',
      'patty',
      'plate',
      'plate',
      'tomato',
    ]);
    for (const spot of gives) {
      expect({ name: spot.name, kind: stationKind(spot.name, spot.gives) }).toEqual({
        name: spot.name,
        kind: 'box',
      });
      // Jede Ausgabe heißt nach dem, was sie hergibt — im Katalog heißen alle
      // vier gleich (`Spot.label`).
      if (spot.name === 'serve-counter') expect(spot.label).toBeDefined();
    }
  });

  /** Ein Schaustück gibt nichts her: Dort wird gesehen und nicht gekocht. */
  it('lässt den Schauraum aus dem Spiel heraus', () => {
    for (const spot of KITCHEN_SPOTS.filter((spot) => spot.show)) {
      expect({ name: spot.name, gives: spot.gives }).toEqual({ name: spot.name, gives: undefined });
    }
  });

  /**
   * **Genau ein Herd brät**, und genau eine Theke gibt aus. Zwei Herde mit
   * Pfanne wären zwei Pfannen — und die zweite käme aus einem Modell, das es
   * nur einmal gibt.
   */
  it('stellt einen Herd mit Pfanne und eine Ausgabetheke auf', () => {
    const kinds = WORKING.map(kindOf);
    expect(kinds.filter((kind) => kind === 'stove')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'serve')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'rack')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'board')).toHaveLength(2);
    // Und je ein Spülbecken, ein Abtropfbrett und eine Geschirrrückgabe: Der
    // Abwasch hat einen Anfang und ein Ende, und beides doppelt wäre ein
    // zweiter Weg, den niemand erklärt hat.
    expect(kinds.filter((kind) => kind === 'sink')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'drain')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'return')).toHaveLength(1);
  });

  /**
   * **Und die beiden Hälften stehen nebeneinander und in der richtigen
   * Reihenfolge.**
   *
   * Im Modell liegt die Mulde links und die Abtropfwanne rechts
   * (`core/kitchenFit.ts`, der Block über `SINK_SUNK`), und geschnitten wird in
   * der Mitte. Wer sie vertauscht oder auseinanderstellt, dreht die offenen
   * Schnittflächen nach außen — aus einer Spüle würden zwei aufgesägte.
   */
  it('stellt Becken und Abtropfbrett nebeneinander, Becken links', () => {
    for (const shown of [false, true]) {
      const basin = KITCHEN_SPOTS.find((s) => s.name === 'sink-basin' && !!s.show === shown)!;
      const drain = KITCHEN_SPOTS.find((s) => s.name === 'sink-drain' && !!s.show === shown)!;
      expect({ shown, z: drain.z }).toEqual({ shown, z: basin.z });
      expect({ shown, x: drain.x }).toEqual({ shown, x: basin.x + 1 });
      // Ungedreht: Bei `turn: 0` zeigt die linke Hälfte des Netzes nach Westen.
      expect({ shown, turn: basin.turn ?? 0 }).toEqual({ shown, turn: 0 });
      expect({ shown, turn: drain.turn ?? 0 }).toEqual({ shown, turn: 0 });
    }
  });
});

/**
 * **Die Zeile ist eine Arbeitsplatte und keine Treppe.**
 *
 * Diese Sache ist dreimal aufgeschlagen und zweimal im Katalog **verteidigt**
 * statt abgeräumt worden: Das Schneidebrett trägt sein Brett obenauf und
 * arbeitete damit 3,3 cm über der Küchenzeile neben ihm. In einer Reihe aus
 * Zeile, Brett, Zeile ist das eine Stufe, und aus 55° von oben
 * (`core/topDownPose.TOP_DOWN_TILT`) läuft sie quer durchs Bild. Inzwischen
 * steckt das **Möbel** um genau diese 3,3 cm im Boden
 * (`core/kitchenFit.KitchenPiece.bury`), das Brett liegt weiter obenauf, und
 * die Fläche fluchtet.
 *
 * Der Test steht hier und nicht nur im Katalog, weil die Zusage am **Aufbau**
 * hängt: Nicht irgendwelche Möbel sollen gleich hoch sein, sondern die, die in
 * dieser Küche nebeneinanderstehen. Ein vierter Anlauf fängt sich hier.
 */
describe('die Arbeitsflächen der Zeile', () => {
  /**
   * Die beiden Reihen, die durchlaufen sollen — Kacheln der Zone, wie alles
   * hier: an der Nordwand die ganze Zeile (x = 0…10), in der Mitte die Insel
   * (x = 3…7).
   *
   * Die Bänder bei x = 9 stehen in derselben Reihe und sind trotzdem nicht
   * dabei: Sie sind eine **Bahn** und keine Arbeitsplatte, und sie richten sich
   * nach der Ausgabetheke vorn (`passTop`, `kitchenBelt.BELT_HEIGHT`). Die
   * Ausgaben an der Westwand (x = 1) liegen aus demselben Grund draußen.
   */
  const LINES = [
    { z: 0, from: 0, to: 10 },
    { z: 4, from: 3, to: 7 },
  ] as const;

  /**
   * **Die Kochstellen zählen nicht mit**, und das ist kein Schlupfloch: Die
   * Platte des Herds liegt bei 0,50 m wie die Zeile, die 10 cm darüber sind
   * der **Rost** — und darauf steht ein Topf (`core/kitchenFit.ts`, `stove`).
   * Wer sie einebnete, versenkte jeden Topf im Herd.
   *
   * **Und das Brett zählt seit dem Umbau auch nicht mehr mit.** Es ist heute
   * wirklich ein Brett auf einem Tisch (`board.over`), und ein Brett liegt
   * **auf** der Platte und nicht darin — 7,5 cm höher als die Zeile daneben.
   * Vorher war das Brett selbst das Möbel und wurde um seine Dicke im Estrich
   * versenkt; ein Tisch, der im Boden steckt, ist keiner.
   */
  const HOBS = new Set(['stove', 'stove-pot', 'stove-pan', 'board']);

  const line = kitchenWorkHeight(kitchenPiece('counter')!);

  it('legt jede Ablage der Zeile auf die Höhe der Küchenzeile', () => {
    // Das Maß ist die Küchenzeile selbst und keine Zahl daneben: Wer sie
    // ändert, soll hier sehen, was mitzuziehen ist.
    expect(line).toBeCloseTo(0.5, 6);
    const checked: string[] = [];
    for (const { z, from, to } of LINES) {
      for (const spot of WORKING) {
        if (spot.z !== z || spot.x < from || spot.x > to) continue;
        const piece = kitchenPiece(spot.name)!;
        // Spüle und Mülleimer sind keine Ablage — auf ihnen liegt nie etwas,
        // und ihre Höhe hat mit der Platte nichts zu tun.
        if (!piece.worktop || HOBS.has(piece.name)) continue;
        checked.push(piece.name);
        expect({ name: piece.name, top: kitchenWorkHeight(piece).toFixed(3) }).toEqual({
          name: piece.name,
          top: line.toFixed(3),
        });
      }
    }
    // Und es ist wirklich die Reihe aus dem Bild geprüft worden — Zeile,
    // Brett, Zeile an der Wand und noch einmal auf der Insel. Eine Schleife
    // über null Möbel ist grün und sagt nichts.
    expect(checked).toEqual([
      'counter',
      'extinguisher',
      'counter',
      'counter',
      'plate-counter',
      'counter',
      'counter',
      'table',
    ]);
  });

  /**
   * **Und der Salatkopf liegt auf dem Brett und nicht auf dem Tisch darunter.**
   *
   * Das ist die andere Hälfte der Zusage: Die Fläche der Zeile ist bündig, das
   * Brett steht sichtbar darüber — und es steht darüber, weil es ein Brett ist
   * und nicht, weil jemand eine Zahl falsch eingetragen hat.
   */
  it('legt die Ablage auf das Brett und nicht auf den Tisch darunter', () => {
    const board = kitchenPiece('board')!;
    // Der Tisch darunter steht auf Zeilenhöhe, das Brett liegt darauf.
    expect(board.over![0]!.at).toBeCloseTo(line, 6);
    expect(kitchenDeck(board)).toBeCloseTo(line + 0.075, 3);
    // Über der Schnittfläche steckt das **Messer** im Brett, und deshalb ist
    // die Oberkante des Möbels seitdem höher als seine Ablage.
    expect(board.height).toBeGreaterThan(kitchenDeck(board));
    // Und nichts steckt mehr im Estrich — `bury` hat keinen Fall mehr.
    const sunk = KITCHEN_SPOTS.filter((spot) => kitchenPiece(spot.name)?.bury);
    expect(sunk.map((spot) => spot.name)).toEqual([]);
  });
});

/**
 * **Der Gastraum in der letzten Reihe** — dreimal derselbe Arbeitstisch als
 * Gästetisch, einmal als Geschirrrückgabe.
 *
 * Geprüft wird hier vor allem eines: dass die Tür frei bleibt. Der Gang vom
 * Podest mündet an der Südkante der Zone (`layout.PATHS`), und ein Tisch
 * darin ist ein Hindernis, das jeder beim Hereinkommen umläuft — sichtbar
 * erst, wenn man selbst hereinkommt.
 */
describe('die Tische vor der Theke', () => {
  // **Nur die Küche**, nicht die Werkhalle: Seit die Burgerstraße bis in die
  // letzte Reihe reicht, stehen in z = 10 auch ihr letzter Kombinierer und ihre
  // Ausgabe — die haben mit dem Gastraum nichts zu tun (`KITCHEN_SIDE`).
  const row = KITCHEN_SIDE.filter((spot) => spot.z === 10);

  it('stellt drei Gästetische und eine Rückgabe in eine Reihe', () => {
    expect(row.map((spot) => spot.name)).toEqual(['table', 'table', 'table', 'table']);
    expect(row.map((spot) => spot.role)).toEqual(['table', 'table', 'table', 'return']);
    expect(row.map((spot) => spot.x)).toEqual([4, 6, 8, 10]);
    // Jeder heißt nach seiner Rolle und nicht „Arbeitstisch" wie im Katalog.
    for (const spot of row) expect(spot.label?.length).toBeGreaterThan(2);
    // Die Rückgabe steht am Ostende — von dort ist es zur Spüle an der
    // Nordwand am kürzesten.
    expect(row.at(-1)?.role).toBe('return');
  });

  it('lässt eine Lücke zwischen zwei Tischen', () => {
    for (let i = 1; i < row.length; i++) {
      expect(row[i]!.x - row[i - 1]!.x).toBeGreaterThanOrEqual(2);
    }
  });

  /**
   * **Die Einmündung des Gangs bleibt frei.** Gerechnet und nicht abgelesen:
   * Das Wegrechteck aus `layout.PATHS` liegt in Weltkacheln, die Plätze hier
   * relativ zur Zone — die drei Kacheln, an denen beides sich trifft, sind
   * x = 0…2 in der letzten Reihe.
   */
  it('stellt keinen Tisch in die Tür', () => {
    const door = { x: 12, z: -21, w: 3 };
    const from = door.x - KITCHEN.x;
    const to = from + door.w - 1;
    expect([from, to]).toEqual([0, 2]);
    for (const spot of row) {
      expect({ x: spot.x, blocks: spot.x >= from && spot.x <= to }).toEqual({
        x: spot.x,
        blocks: false,
      });
    }
  });
});

/**
 * **Die beiden Bahnen** — vier gewöhnliche Bänder in der einen Spalte, vier
 * Zugbänder in der anderen, und an beiden Enden eine Ablage.
 *
 * Geprüft wird hier nicht, **dass** ein Zugband zieht (das steht in
 * `kitchenBelt.test.ts`), sondern dass es an einer Stelle steht, an der es
 * etwas zu ziehen gibt: Ein Zugband vor einer leeren Kachel ist ein teures
 * Förderband.
 */
describe('die beiden Bandbahnen', () => {
  const belts = KITCHEN_SIDE.filter((spot) => spot.name === 'belt');
  const pulls = KITCHEN_SIDE.filter((spot) => spot.name === 'belt-pull');

  it('stellt vier Förderbänder und vier Zugbänder auf', () => {
    expect(belts).toHaveLength(4);
    expect(pulls).toHaveLength(4);
    for (const spot of [...belts, ...pulls]) {
      // `turn: 2` ist „nach Süden gedreht" (`Spot.turn`) — und in diese
      // Richtung schiebt es.
      expect(spot.turn).toBe(2);
      expect(kindOf(spot)).toBe('belt');
    }
  });

  it('läuft blau in der Spalte x = 9 nach Süden und liefert auf eine Ablage ab', () => {
    expect(belts.map((spot) => spot.z)).toEqual([4, 5, 6, 7]);
    for (const spot of belts) expect(spot.x).toBe(9);
    // Ohne Ablage am Ende fiele herunter, was ankommt.
    const end = KITCHEN_SIDE.find((spot) => spot.x === 9 && spot.z === 8);
    expect(end?.name).toBe('counter');
    expect(kindOf(end!)).toBe('top');
  });

  it('läuft orange in der Spalte x = 7 vom Arbeitstisch zur Ausgabe', () => {
    expect(pulls.map((spot) => spot.z)).toEqual([5, 6, 7, 8]);
    for (const spot of pulls) expect(spot.x).toBe(7);
    // Oben die Insel: Von ihrem Arbeitstisch zieht das erste Zugband, und
    // deshalb muss dort eine Ablage stehen und kein Mülleimer, kein Herd.
    const island = KITCHEN_SIDE.find((spot) => spot.x === 7 && spot.z === 4);
    expect(island?.name).toBe('table');
    expect(kindOf(island!)).toBe('top');
    // Unten die Arbeitsfläche neben der Ausgabetheke — eine, die es schon gab.
    const end = KITCHEN_SIDE.find((spot) => spot.x === 7 && spot.z === 9);
    expect(end?.name).toBe('serve-counter');
    expect(kindOf(end!)).toBe('top');
  });

  /** Freie Kacheln in zwei Spalten — nachgesehen und nicht gehofft. */
  it('steht auf Kacheln, die sonst niemand belegt', () => {
    // Die Spalte x = 9 trägt sonst nur die Küchenzeile an der Nordwand.
    const east = KITCHEN_SIDE.filter((spot) => spot.x === 9).map((spot) => spot.z);
    expect([...east].sort((a, b) => a - b)).toEqual([0, 4, 5, 6, 7, 8]);
    // Und die Spalte x = 7 den Arbeitstisch der Insel, die Ausgabe vorn und
    // sonst nichts. (Der Gästetisch bei z = 10 steht auf x = 8.)
    const west = KITCHEN_SIDE.filter((spot) => spot.x === 7).map((spot) => spot.z);
    expect([...west].sort((a, b) => a - b)).toEqual([0, 4, 5, 6, 7, 8, 9]);
  });

  /**
   * **Zwischen den Bahnen bleibt ein Gang.** Zwei Spalten Möbel quer durch die
   * Küche sind zwei Wände; ohne die Kachelreihe dazwischen liefe man von der
   * Nordzeile bis zum Gastraum ums ganze Haus.
   */
  it('lässt die Spalte x = 8 zwischen den Bahnen frei', () => {
    const between = KITCHEN_SIDE.filter((spot) => {
      const size = footprint(kitchenPiece(spot.name)!, spot.turn ?? 0);
      return spot.x <= 8 && spot.x + size.w > 8 && spot.z >= 1 && spot.z <= 9;
    });
    expect(between).toEqual([]);
  });
});

/**
 * **Der Feuerlöscher und der Umbauknopf** — zwei Dinge, die einmal auf
 * derselben Kachel standen und sich dabei gegenseitig unbedienbar machten.
 *
 * `A` nimmt immer nur **eines** (`core/usable.pickUsable` wählt das Nächste),
 * und das war der Knopf: Der Löscher ließ sich nicht mehr abnehmen, obwohl er
 * sichtbar dastand. Seitdem steht der Hocker oben neben dem Herd — dort, wo es
 * brennt — und der Knopf allein auf der Kachel am Eingang.
 */
describe('der Feuerlöscher und der Umbauknopf', () => {
  const stool = WORKING.find((spot) => spot.name === 'extinguisher');

  it('stellt den Löscher in die Nordzeile neben den Herd mit der Pfanne', () => {
    expect(stool).toBeDefined();
    expect(stool!.z).toBe(0);
    const pan = WORKING.find((spot) => spot.name === 'stove-pan');
    expect(pan?.z).toBe(0);
    // Nebendran heißt: eine Kachel weiter, und der Löscher ist einen breit.
    expect(Math.abs(stool!.x - pan!.x)).toBe(1);
    // Er bleibt eine Halterung, an der `A` den Löscher nimmt.
    expect(kindOf(stool!)).toBe('rack');
  });

  /** Ob auf dieser Kachel ein Möbel der arbeitenden Küche steht. */
  const busy = (tile: { x: number; z: number }): boolean =>
    WORKING.some((spot) => {
      const size = footprint(kitchenPiece(spot.name)!, spot.turn ?? 0);
      return (
        tile.x >= spot.x && tile.x < spot.x + size.w && tile.z >= spot.z && tile.z < spot.z + size.d
      );
    });

  it('lässt die Kachel des Umbauknopfes frei', () => {
    expect(busy(BUILD_BUTTON_TILE)).toBe(false);
  });

  /**
   * **Und die des zweiten Knopfes ebenso** (`HANDS_BUTTON_TILE`, „VR zwei
   * Gegenstände an/aus"). Derselbe Fehler wäre hier derselbe: `A` erwischte
   * immer nur eines von beiden, und je nachdem, welches, ließe sich entweder
   * der Knopf nicht mehr drücken oder das Möbel nicht mehr bedienen.
   */
  it('lässt die Kachel des zweiten Knopfes frei', () => {
    expect(busy(HANDS_BUTTON_TILE)).toBe(false);
  });

  /**
   * **Und die beiden stehen nicht aufeinander.** Zwei Knöpfe auf einer Kachel
   * wären genau der Fall, den die beiden Prüfungen darüber für Möbel
   * ausschließen — nur dass ihn keine Möbelliste auffangen würde, denn ein
   * Knopf steht in keiner.
   */
  it('stellt die beiden Knöpfe nebeneinander und nicht übereinander', () => {
    const dx = Math.abs(BUILD_BUTTON_TILE.x - HANDS_BUTTON_TILE.x);
    const dz = Math.abs(BUILD_BUTTON_TILE.z - HANDS_BUTTON_TILE.z);
    expect(dx + dz).toBe(1);
  });

  /**
   * **Und die vier Knöpfe der Tonprobe stehen auf freien Kacheln**
   * (`TRIAL_BUTTONS`, `kitchen.addTrialButtons`).
   *
   * Sie stehen im Schauraum, also wird hier gegen **alle** Möbel geprüft und
   * nicht nur gegen die der arbeitenden Küche: Eine Säule im ausgestellten
   * Möbel wäre dieselbe Falle wie eine in der Küche — `A` nähme das Nähere,
   * und je nachdem ließe sich entweder der Knopf nicht drücken oder das Möbel
   * nicht ansehen.
   */
  it('lässt die Kacheln der Tonprobe frei', () => {
    const taken = (tile: { x: number; z: number }): boolean =>
      KITCHEN_SPOTS.some((spot) => {
        const size = footprint(kitchenPiece(spot.name)!, spot.turn ?? 0);
        return (
          tile.x >= spot.x &&
          tile.x < spot.x + size.w &&
          tile.z >= spot.z &&
          tile.z < spot.z + size.d
        );
      });
    const tiles = TRIAL_BUTTONS.flatMap((pair) => [pair.turn, pair.play]);
    expect(tiles.length).toBe(4);
    for (const tile of tiles) expect(taken(tile)).toBe(false);
    // Und keine zwei davon aufeinander — auch das erwischte `A` nur einmal.
    expect(new Set(tiles.map((tile) => `${tile.x}/${tile.z}`)).size).toBe(tiles.length);
  });

  /**
   * **Jedes Paar steht vor seinem Möbel**, und zwar links und rechts davon:
   * Ohne diese Zeile stünden die Knöpfe irgendwo im Schauraum, und niemand
   * wüsste, zu welchem Möbel sie gehören.
   */
  it('stellt jedes Knopfpaar um das Möbel herum, dessen Ton es prüft', () => {
    for (const pair of TRIAL_BUTTONS) {
      const spot = KITCHEN_SPOTS.find((entry) => entry.name === pair.piece && entry.show);
      expect(spot).toBeDefined();
      const size = footprint(kitchenPiece(spot!.name)!, spot!.turn ?? 0);
      // Eine Reihe davor, und die eine links, die andere rechts vom Möbel.
      expect(pair.turn.z).toBe(spot!.z + size.d);
      expect(pair.play.z).toBe(spot!.z + size.d);
      expect(pair.turn.x).toBeLessThan(spot!.x);
      expect(pair.play.x).toBeGreaterThanOrEqual(spot!.x + size.w);
    }
  });

  /**
   * **Und das Radio steht auf keinem von beidem** (`RADIO_TILE`,
   * `kitchenRadio.ts`). Es ist das dritte Gerät in derselben Spalte an der
   * Westwand, und für ein Gerät gilt, was für einen Knopf gilt: Wer es auf
   * eine belegte Kachel stellt, nimmt `A` die Entscheidung ab — und zwar
   * dauerhaft zugunsten des Näheren.
   */
  it('lässt die Kachel des Radios frei und stellt es neben die anderen Geräte', () => {
    expect(busy(RADIO_TILE)).toBe(false);
    expect(RADIO_TILE.x).toBe(BUILD_BUTTON_TILE.x);
    for (const other of [BUILD_BUTTON_TILE, HANDS_BUTTON_TILE]) {
      expect(Math.abs(RADIO_TILE.x - other.x) + Math.abs(RADIO_TILE.z - other.z)).toBeGreaterThan(
        0,
      );
    }
  });
});

/**
 * **Der Schauraum zeigt jedes Möbel des Katalogs genau einmal**, und das gilt
 * auch für ein Möbel, das gar nicht aus der Datei kommt
 * (`core/kitchenFit.KitchenPiece.built`).
 *
 * Dieselbe Regel steht eine Zone weiter oben noch einmal
 * (`worlds/test/testPlan.test.ts`) — hier, weil sie zum Aufbau gehört: Wer ein
 * Möbel in den Katalog schreibt und den Schauraum vergisst, soll es an der
 * Datei merken, in der er gerade arbeitet.
 */
describe('der Schauraum', () => {
  it('zeigt jedes Katalogmöbel genau einmal', () => {
    expect([...KITCHEN_SHOWN].sort()).toEqual([...KITCHEN_NAMES].sort());
    expect(new Set(KITCHEN_SHOWN).size).toBe(KITCHEN_SHOWN.length);
  });

  it('stellt die beiden Bänder auf freie Kacheln', () => {
    const pull = KITCHEN_SPOTS.find((spot) => spot.name === 'belt-pull' && spot.show);
    expect({ x: pull?.x, z: pull?.z }).toEqual({ x: SHOW_X + 8, z: 7 });
    // In der Reihe z = 7 stehen die Herde auf +0, +2, +4 und +6 — +8 hält den
    // Takt und bleibt innerhalb der Zone.
    expect(pull!.x).toBeLessThan(KITCHEN.w);
    const stove = SHOWN.find((spot) => spot.name === 'stove-pan')!;
    expect(pull!.x).toBeGreaterThanOrEqual(stove.x + 2);

    const belt = KITCHEN_SPOTS.find((spot) => spot.name === 'belt' && spot.show);
    expect({ x: belt?.x, z: belt?.z }).toEqual({ x: SHOW_X + 9, z: 4 });
    // Innerhalb der Zone.
    expect(belt!.x).toBeLessThan(KITCHEN.w);
    // Und rechts von der Ausgabetheke, die in derselben Reihe x = 20…21 hält.
    const pass = KITCHEN_SPOTS.find((spot) => spot.name === 'pass' && spot.show)!;
    const wide = kitchenPiece('pass')!.tiles[0];
    expect(belt!.x).toBeGreaterThanOrEqual(pass.x + wide);
  });
});

describe('das Ausgaberegal über der Theke', () => {
  const rack = KITCHEN_SPOTS.find((spot) => spot.name === 'plate-rack' && !spot.show);

  it('steht auf derselben Kachel wie die Ausgabetheke', () => {
    const pass = KITCHEN_SPOTS.find((spot) => spot.name === 'pass' && !spot.show);
    expect(rack).toBeDefined();
    expect({ x: rack?.x, z: rack?.z, turn: rack?.turn }).toEqual({
      x: pass?.x,
      z: pass?.z,
      turn: pass?.turn,
    });
  });

  it('hängt genau `rackLift` über dem Boden', () => {
    expect(rack?.lift).toBeCloseTo(rackLift(), 6);
    expect(rackLift()).toBeCloseTo(passTop() + RACK_AIR + RACK_RAISE, 6);
    // Der Zuschlag ist ein Meter, und er steht als Zahl in genau einer Zeile.
    expect(RACK_RAISE).toBe(1);
  });

  /**
   * **Die Rechnung aus `RACK_AIR`**, und sie ist der Grund für dieses
   * Testfile: Ein Teller muss unter das Regal passen, sonst ist es kein Regal,
   * sondern ein Deckel.
   */
  it('lässt einen Teller darunter durch', () => {
    const air = rackLift() - passTop();
    expect(air).toBeGreaterThan(PLATE_HEIGHT);
    // Und noch etwas Luft darüber, damit man die Fuge sieht.
    expect(air - PLATE_HEIGHT).toBeGreaterThanOrEqual(0.05);
  });

  /**
   * **Und es hängt über dem Kopf des Kochs, nicht vor seiner Brust.**
   *
   * Das ist die Kehrtwende: Bis eben stand hier, dass die **Oberkante** unter
   * 1,60 m bleiben muss — das Ergebnis war ein Regal von 0,65 bis 1,21 m, das
   * der Figur mitten vor der Brust hing und von vorn die halbe Theke verdeckte.
   * Jetzt ist der **Fuß** die Grenze, und er liegt über dem Scheitel: Man läuft
   * darunter durch, und ein Burger passt selbstverständlich auch darunter.
   */
  it('hängt mit seinem Fuß über dem Kopf des Kochs', () => {
    // 0,53 + 0,12 + 1,00 = 1,65 m Fuß, + 0,56 m Regal = 2,21 m Oberkante.
    expect(rackLift()).toBeCloseTo(1.65, 6);
    const height = kitchenPiece('plate-rack')!.height;
    expect(rackLift() + height).toBeCloseTo(2.21, 6);
    expect(rackLift()).toBeGreaterThan(CHEF_HEIGHT);
    // Und darunter geht jetzt alles durch, was in dieser Küche entsteht.
    const deluxe = stackHeight(['bun', 'patty-cooked', 'lettuce-cut', 'tomato-cut']);
    expect(rackLift() - passTop()).toBeGreaterThan(deluxe);
  });

  /**
   * **Von oben rückt es aus der Theke heraus**, und genau das war der Zweck
   * des Zuschlags: Ein Stück, das einen Meter höher hängt, wandert in der
   * Hauptansicht (55° über der Waagerechten,
   * `core/topDownPose.TOP_DOWN_TILT`) um `Höhe / tan 55°` auf die Kamera zu,
   * also nach Süden. Das sind 0,70 m — gut zwei Drittel einer Kachel, und
   * damit liegt das Regal im Bild **vor** der Theke statt darauf.
   */
  it('verdeckt in der Sicht von oben nicht mehr die Theke', () => {
    const slide = RACK_RAISE / Math.tan((TOP_DOWN_TILT * Math.PI) / 180);
    expect(slide).toBeCloseTo(0.7, 2);
    // Mehr als eine halbe Kachel (`worlds/nav/navTile.TILE` = 1 m): Der
    // Teller, der in der Mitte der Thekenkachel steht, kommt wieder frei.
    expect(slide).toBeGreaterThan(0.5);
  });
});

/**
 * **Woran „Küche" hängt** (`kitchenPlan.inKitchen`).
 *
 * Die eigene Augenhöhe des VR-Spielers gilt in genau einem Rechteck
 * (`kitchen.ts`, `fitEyes`), und das ist `layout.KITCHEN` — keine zweite Liste
 * von Zahlen, keine Abstandsprüfung zu irgendeinem Möbel. Was hier
 * danebenginge, wäre ein Spieler, der auf der Wiese plötzlich einen
 * Viertelmeter kleiner wird.
 */
describe('Wo die Küche anfängt', () => {
  const west = KITCHEN.x;
  const east = KITCHEN.x + KITCHEN.w;
  const north = KITCHEN.z;
  const south = KITCHEN.z + KITCHEN.d;

  it('nimmt, was drinsteht', () => {
    expect(inKitchen((west + east) / 2, (north + south) / 2)).toBe(true);
    for (const [x, z] of [
      [west, north],
      [east, north],
      [west, south],
      [east, south],
    ] as const) {
      expect(inKitchen(x, z)).toBe(true);
    }
  });

  it('lässt draußen, was draußen steht', () => {
    // Der Startplatz, das Podest südlich davon, der Schießstand.
    expect(inKitchen(0, 0)).toBe(false);
    expect(inKitchen((west + east) / 2, south + 5)).toBe(false);
    expect(inKitchen(west - 10, (north + south) / 2)).toBe(false);
  });

  /**
   * **Ein Meter Vorlauf**, damit das Absacken vor der Türöffnung passiert und
   * nicht in ihr (`KITCHEN_EYE_MARGIN`). Weiter nicht: Nach Süden liegt das
   * Podest mit zwei Kacheln Abstand.
   */
  it('fängt einen Meter vor der Öffnung an und nicht früher', () => {
    expect(KITCHEN_EYE_MARGIN).toBe(1);
    expect(inKitchen((west + east) / 2, south + KITCHEN_EYE_MARGIN)).toBe(true);
    expect(inKitchen((west + east) / 2, south + KITCHEN_EYE_MARGIN + 0.01)).toBe(false);
    // Ohne Zuschlag ist die Kante die Kante.
    expect(inKitchen((west + east) / 2, south + 0.5, 0)).toBe(false);
  });
});

/**
 * **Die Werkhalle und ihre Bandstraße** (`kitchenPlan.PIPELINE`).
 *
 * Eine Straße aus zwanzig Möbeln ist eine Kette, und eine Kette ist genau so
 * gut wie ihr schwächstes Glied: **Ein** Zugband, hinter dem nichts steht,
 * **ein** Band, das ins Leere schiebt, **ein** Filterband ohne Filter — und
 * die halbe Halle steht. Im Headset merkt man das nach zwei Minuten Zusehen
 * und sucht den Fehler dann in der Bandrechnung, wo er nicht ist.
 *
 * Also wird die Kette hier abgegangen: Jedes greifende Band bekommt seine
 * Quelle vorgerechnet, jedes schiebende sein Ziel, jeder Kombinierer seine
 * Zulieferkachel. Was die Rechnung nebenan mit alldem macht, prüft
 * `kitchenBelt.test.ts` — hier steht nur, dass die Möbel dafür richtig stehen.
 */
describe('die Werkhalle', () => {
  /** Was auf dieser Kachel der Halle steht — die Grundfläche mitgerechnet. */
  function at(x: number, z: number): Spot | undefined {
    return WORKING.find((spot) => {
      const size = footprint(kitchenPiece(spot.name)!, spot.turn ?? 0);
      return x >= spot.x && x < spot.x + size.w && z >= spot.z && z < spot.z + size.d;
    });
  }

  it('liegt östlich der Küche und westlich des Schauraums', () => {
    // Die eine Kachel Luft zum Schauraum ist dieselbe, die ihn vorher von der
    // Küche trennte — der Schauraum zeigt Möbel einzeln und nicht in einer
    // Reihe mit einer Bandstraße.
    expect(PIPELINE.x).toBe(12);
    expect(PIPELINE.x + PIPELINE.w).toBeLessThan(SHOW_X);
    expect(PIPELINE.z).toBe(0);
    expect(PIPELINE.d).toBe(KITCHEN.d);
    // Und sie liegt vollständig in der Zone.
    expect(PIPELINE.x + PIPELINE.w).toBeLessThanOrEqual(KITCHEN.w);
  });

  it('hält jedes ihrer Möbel in ihren eigenen Spalten', () => {
    for (const spot of HALL) {
      const size = footprint(kitchenPiece(spot.name)!, spot.turn ?? 0);
      expect({
        name: spot.name,
        inside: spot.x >= PIPELINE.x && spot.x + size.w <= PIPELINE.x + PIPELINE.w,
      }).toEqual({ name: spot.name, inside: true });
    }
  });

  it('lässt mehr als die Hälfte der Halle zum Selberbauen frei', () => {
    // Der Sinn der Halle ist der **Platz**, nicht die Schaustraße darin: Wer
    // eine eigene bauen will, braucht Spalten am Stück. Stünde sie voll, wäre
    // sie nur ein zweiter Schauraum.
    const used = new Set<string>();
    for (const spot of HALL) {
      const size = footprint(kitchenPiece(spot.name)!, spot.turn ?? 0);
      for (let dz = 0; dz < size.d; dz++) {
        for (let dx = 0; dx < size.w; dx++) used.add(`${spot.x + dx}/${spot.z + dz}`);
      }
    }
    expect(used.size).toBeLessThan((PIPELINE.w * PIPELINE.d) / 2);
    // Und zwar als ganze Spalten und nicht als Streusel: Von den acht Spalten
    // bleiben mindestens zwei vollständig leer, und sie liegen **am Stück** am
    // östlichen Rand — dort, wo eine zweite Straße anfangen kann, ohne sich
    // durch die erste zu fädeln.
    const empty = [...Array(PIPELINE.w).keys()]
      .map((dx) => PIPELINE.x + dx)
      .filter((x) => ![...used].some((key) => key.startsWith(`${x}/`)));
    expect(empty.length).toBeGreaterThanOrEqual(2);
    const east = PIPELINE.x + PIPELINE.w - 1;
    expect(empty).toContain(east);
    expect(empty).toContain(east - 1);
  });

  it('gibt jedem greifenden Band eine Kachel, von der es nehmen darf', () => {
    for (const spot of HALL) {
      const kind = beltKind(spot.name);
      if (!kind || !beltGrabs(kind)) continue;
      const reach = beltReach(spot.turn ?? 0);
      const back = at(spot.x + reach.dx, spot.z + reach.dz);
      const where = `${spot.name}@${spot.x},${spot.z}`;
      expect({ where, source: back?.name ?? null }).not.toEqual({ where, source: null });
      const releases = back ? beltReleases(kindOf(back)!) : false;
      expect({ where, releases }).toEqual({ where, releases: true });
    }
  });

  it('gibt jedem Band eine Kachel, auf die es abliefern darf', () => {
    for (const spot of HALL) {
      if (!beltKind(spot.name)) continue;
      const step = beltStep(spot.turn ?? 0);
      const next = at(spot.x + step.dx, spot.z + step.dz);
      const where = `${spot.name}@${spot.x},${spot.z}`;
      // Ein Band, das ins Leere schiebt, verliert, was daraufliegt — in dieser
      // Straße steht am Ende jeder Bahn eine Ablage.
      expect({ where, target: next?.name ?? null }).not.toEqual({ where, target: null });
    }
  });

  it('lehrt jedes Filterband schon im Grundriss', () => {
    const smart = HALL.filter((spot) => spot.name === 'belt-smart');
    expect(smart.length).toBeGreaterThanOrEqual(3);
    // **Und eines davon steht hinter der Kochstelle**, nicht hinter einem
    // Mixer: Der Filter `patty-cooked` ist der, ohne den die Straße rohe
    // Pattys auf das Brötchen legte.
    expect(smart.map((spot) => spot.filter)).toContain('patty-cooked');
    for (const spot of smart) {
      const where = `belt-smart@${spot.x},${spot.z}`;
      expect({ where, filter: spot.filter ?? null }).not.toEqual({ where, filter: null });
    }
    // **Und der Filter passt zu dem, was davor steht.** Ein Filterband hinter
    // einem Mixer, das die falsche Stufe sucht, zieht nie etwas — und das
    // sieht man der Küche nicht an, man sieht nur, dass sie steht.
    let checked = 0;
    for (const spot of smart) {
      const reach = beltReach(spot.turn ?? 0);
      const back = at(spot.x + reach.dx, spot.z + reach.dz);
      const feeds = HALL.filter((one) => {
        const step = beltStep(one.turn ?? 0);
        return (
          beltKind(one.name) !== null && one.x + step.dx === back?.x && one.z + step.dz === back?.z
        );
      });
      // Was in den Mixer davor hineingeschoben wird, kommt eine Stufe weiter
      // wieder heraus — und genau das muss der Filter sein.
      if (back?.name !== 'mixer' || !feeds.length) continue;
      const source = at(
        feeds[0]!.x + beltReach(feeds[0]!.turn ?? 0).dx,
        feeds[0]!.z + beltReach(feeds[0]!.turn ?? 0).dz,
      );
      // **Was in den Mixer hineinkommt**, und zwar von der Seite des Bandes
      // gelesen: Ein Filterband schiebt genau das hinein, was es gelernt hat;
      // ein gewöhnliches Zugband das, was seine Quelle hergibt. Damit hängt
      // auch der zweite Mixer der Tomatenbahn mit an der Kette — ohne diese
      // Zeile bräche der Test dort ab, wo er am meisten zu sagen hätte.
      const raw = feeds[0]!.filter ?? source?.gives ?? source?.filter;
      if (!raw) continue;
      // **Dieselbe Tabelle, die auch das Brett liest** (`chopStage`) — eine
      // zweite hier wäre die, die beim nächsten Rezept auseinanderläuft.
      const cut = chopStage(raw);
      expect({ at: `${spot.x},${spot.z}`, filter: spot.filter }).toEqual({
        at: `${spot.x},${spot.z}`,
        filter: cut,
      });
      expect(beltWants(spot.filter ?? null, cut)).toBe(true);
      checked++;
    }
    // Und die Probe darauf, dass oben wirklich etwas geprüft wurde: Drei der
    // Filterbänder stehen hinter einem Mixer, der aus einer Kiste gespeist
    // wird. Ein Test, der sich durch `continue` selbst überspringt, prüft
    // nichts und sagt es nicht.
    expect(checked).toBeGreaterThanOrEqual(2);
  });

  it('stellt jedem Kombinierer eine Zulieferkachel an die Pfeilseite', () => {
    const joins = HALL.filter((spot) => spot.name === 'combiner');
    expect(joins.length).toBeGreaterThanOrEqual(2);
    for (const spot of joins) {
      const reach = beltReach(spot.turn ?? 0);
      const back = at(spot.x + reach.dx, spot.z + reach.dz);
      const where = `combiner@${spot.x},${spot.z}`;
      expect({ where, source: back?.name ?? null }).not.toEqual({ where, source: null });
      expect({ where, releases: back ? beltReleases(kindOf(back)!) : false }).toEqual({
        where,
        releases: true,
      });
      // **Und kein Band schiebt auf diese Kachel.** Täte es das, läge dort
      // irgendwann die Zutat als Unterlage auf dem Kombinierer und die
      // Grundlage käme nicht mehr darauf — der Grund, warum die Pattyablage
      // eine Arbeitsplatte ist und kein Band.
      const pushers = HALL.filter((one) => {
        const step = beltStep(one.turn ?? 0);
        return (
          beltKind(one.name) !== null && one.x + step.dx === spot.x && one.z + step.dz === spot.z
        );
      });
      for (const one of pushers) {
        // Wer von vorn schiebt, legt die **Grundlage** hin und steht damit auf
        // einer anderen Seite als der Pfeil.
        expect({ where, same: one.x === back?.x && one.z === back?.z }).toEqual({
          where,
          same: false,
        });
      }
    }
  });

  it('bringt ihre eigenen Vorräte mit', () => {
    // Die Straße fängt bei einer Kiste an und nicht beim Koch: Genau dafür
    // zieht ein Zugband aus einer Vorratskiste (`kitchenBelt.beltRefills`).
    const gives = HALL.filter((spot) => spot.gives);
    expect(gives.map((spot) => spot.gives).sort()).toEqual(['bun', 'lettuce', 'patty', 'tomato']);
    for (const spot of gives) {
      expect(kindOf(spot)).toBe('box');
      expect(spot.label).toBeDefined();
    }
  });
});
