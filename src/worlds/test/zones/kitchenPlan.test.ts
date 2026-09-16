import { CHEF_HEIGHT } from '../../../core/chefFit';
import { KITCHEN_NAMES, kitchenPiece } from '../../../core/kitchenFit';
import { TOP_DOWN_TILT } from '../../../core/topDownPose';
import { KITCHEN } from '../layout';
import { PLATE_HEIGHT, stackHeight } from './kitchenProps';
import type { KitchenItem, StationKind } from './kitchenCarry';
import {
  KITCHEN_SHOWN,
  KITCHEN_SPOTS,
  RACK_AIR,
  RACK_RAISE,
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
    // Die Spüle ist eine Station geworden: Dort wird gespült, und ein Möbel,
    // das so heißt, braucht dafür keine Zeile im Aufbau.
    ['sink', undefined, 'sink'],
    // Das Förderband gibt es nur in dieser einen Rolle — ein Band, das nicht
    // schiebt, wäre ein schmales Brett.
    ['belt', undefined, 'belt'],
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
   */
  it('gibt jede Zutat genau einmal aus', () => {
    const gives = WORKING.filter((spot) => spot.gives);
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
    // Und je eine Spüle und eine Geschirrrückgabe: Der Abwasch hat einen
    // Anfang und ein Ende, und beides doppelt wäre ein zweiter Weg, den
    // niemand erklärt hat.
    expect(kinds.filter((kind) => kind === 'sink')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'return')).toHaveLength(1);
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
  const row = WORKING.filter((spot) => spot.z === 10);

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
 * **Das Förderband** — drei Stück in einer Spalte, nach Süden gedreht, und am
 * Ende eine Ablage.
 */
describe('das Förderband', () => {
  const belts = WORKING.filter((spot) => spot.name === 'belt');

  it('läuft in einer Spalte nach Süden und liefert auf eine Ablage ab', () => {
    expect(belts.map((spot) => spot.z)).toEqual([5, 6, 7]);
    for (const spot of belts) {
      expect(spot.x).toBe(9);
      // `turn: 2` ist „nach Süden gedreht" (`Spot.turn`) — und in diese
      // Richtung schiebt es.
      expect(spot.turn).toBe(2);
      expect(kindOf(spot)).toBe('belt');
    }
    // Ohne Ablage am Ende fiele herunter, was ankommt.
    const end = WORKING.find((spot) => spot.x === 9 && spot.z === 8);
    expect(end?.name).toBe('counter');
    expect(kindOf(end!)).toBe('top');
  });

  /** Vier freie Kacheln in einer Spalte — nachgesehen und nicht gehofft. */
  it('steht auf Kacheln, die sonst niemand belegt', () => {
    const others = WORKING.filter((spot) => spot.x === 9 && spot.z >= 5 && spot.z <= 8);
    expect(others).toHaveLength(4);
    // Die Spalte x = 9 trägt sonst nur die Küchenzeile an der Nordwand.
    const column = WORKING.filter((spot) => spot.x === 9).map((spot) => spot.z);
    expect([...column].sort((a, b) => a - b)).toEqual([0, 5, 6, 7, 8]);
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

  it('stellt das Förderband auf eine freie Kachel', () => {
    const belt = KITCHEN_SPOTS.find((spot) => spot.name === 'belt' && spot.show);
    expect({ x: belt?.x, z: belt?.z }).toEqual({ x: 22, z: 4 });
    // Innerhalb der Zone (24 Kacheln breit, also x = 0…23).
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
