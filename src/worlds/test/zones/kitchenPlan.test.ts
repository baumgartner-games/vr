import { CHEF_HEIGHT } from '../../../core/chefFit';
import { kitchenPiece } from '../../../core/kitchenFit';
import { PLATE_HEIGHT, stackHeight } from './kitchenProps';
import type { KitchenItem, StationKind } from './kitchenCarry';
import { KITCHEN_SPOTS, RACK_AIR, passTop, rackLift, stationKind } from './kitchenPlan';

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
    // Und was keine Arbeitsfläche ist, hört gar nicht erst auf `A`.
    ['sink', undefined, null],
    ['plate-rack', undefined, null],
  ];

  it.each(table)('macht aus %s (gibt %s) eine Station der Art %s', (name, gives, kind) => {
    expect(stationKind(name, gives)).toBe(kind);
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
    const kinds = WORKING.map((spot) => stationKind(spot.name, spot.gives));
    expect(kinds.filter((kind) => kind === 'stove')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'serve')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'rack')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'board')).toHaveLength(2);
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
    expect(rackLift()).toBeCloseTo(passTop() + RACK_AIR, 6);
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
   * **Ein Burger passt nicht darunter, und das ist Absicht.** Wer die Luft so
   * weit aufzöge, schöbe die Oberkante des Regals über den Kopf des Kochs —
   * dann leuchten die Wärmeschirme auf den Boden. Das fertige Gericht steht
   * **vor** dem Regal.
   */
  it('bleibt unter dem Kopf des Kochs', () => {
    const height = kitchenPiece('plate-rack')?.height ?? 0;
    expect(rackLift() + height).toBeLessThan(CHEF_HEIGHT);
    const burger = stackHeight(['bun', 'patty-cooked']);
    expect(rackLift() - passTop()).toBeLessThan(burger);
  });
});
