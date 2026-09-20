import * as THREE from 'three';
import { SINK_BOWL } from '../../../core/kitchenFit';
import {
  LEAK_LIFT,
  LeakJet,
  REPAIR_SECONDS,
  TIGHT,
  advanceFix,
  fixProgress,
  springLeak,
  startFix,
} from './kitchenLeak';

/**
 * **Was das Wasserleck verspricht** (`kitchenLeak.ts`).
 *
 * Vier Zusagen, und jede einzelne ist im Headset teuer nachzustellen: Welt
 * laden, in die Küche laufen, den roten Knopf drücken, die Zange holen,
 * danebenstehen, warten. Hier dauert dasselbe eine Millisekunde:
 *
 * - Ein zweiter Druck auf den Knopf wirft eine **laufende Reparatur nicht
 *   zurück**.
 * - Die Reparatur dauert **gleich lang**, ob sie in einem Bild von vier
 *   Sekunden oder in vierhundert von einer Hundertstel gerechnet wird.
 * - **Wer weggeht, bricht ab** — und Zurückkommen allein genügt nicht.
 * - Und die Fontäne **hängt nur dann in der Szene**, wenn es spritzt.
 *
 * Kein WebGL und kein `document`: Auch die Fontäne malt nichts auf eine
 * Leinwand, also läuft sie hier wie jede andere Rechnung (dieselbe Zusage wie
 * beim Nebel des Löschers, `kitchenSpray.test.ts`).
 */

describe('springLeak — der rote Knopf', () => {
  it('macht aus einem dichten Becken ein spritzendes', () => {
    const leak = springLeak(TIGHT);
    expect(leak.leaking).toBe(true);
    expect(leak.fixing).toBe(false);
    expect(leak.time).toBe(0);
  });

  /**
   * **Und ein zweiter Druck ändert nichts** — vor allem nicht mitten in der
   * Reparatur.
   *
   * Der Zustand kommt **derselbe** zurück und nicht ein gleich aussehender:
   * Daran erkennt die Zone, dass sie nichts zu melden hat
   * (`kitchen.burstLeak`).
   */
  it('lässt eine laufende Reparatur in Ruhe', () => {
    const running = advanceFix(startFix(springLeak(TIGHT)), 2, true).state;
    expect(running.time).toBeCloseTo(2, 6);
    expect(springLeak(running)).toBe(running);
  });
});

describe('startFix — die Zange ansetzen', () => {
  it('wirft die Uhr an, wenn es spritzt', () => {
    const fixing = startFix(springLeak(TIGHT));
    expect(fixing.fixing).toBe(true);
    expect(fixing.time).toBe(0);
  });

  it('tut nichts an einem dichten Becken', () => {
    expect(startFix(TIGHT)).toBe(TIGHT);
  });
});

describe('advanceFix — die Reparatur', () => {
  it('macht das Becken nach der vollen Zeit dicht — genau einmal', () => {
    let state = startFix(springLeak(TIGHT));
    const half = advanceFix(state, REPAIR_SECONDS / 2, true);
    expect(half.fixed).toBe(false);
    state = half.state;
    const done = advanceFix(state, REPAIR_SECONDS / 2, true);
    expect(done.fixed).toBe(true);
    expect(done.state).toEqual(TIGHT);
    // Und danach gibt es nichts mehr zu melden.
    expect(advanceFix(done.state, 1, true).fixed).toBe(false);
  });

  /**
   * **Dieselbe Dauer in einem Bild wie in vierhundert.** Das ist die Zusage,
   * für die es diese Rechnung überhaupt gibt: Im Headset läuft die Küche mit
   * 72 oder 90 Bildern, am Schirm mit 60, und beim ersten Laden mit einem
   * einzigen langen.
   */
  it('rechnet in vielen kleinen Bildern wie in einem großen', () => {
    let state = startFix(springLeak(TIGHT));
    let frames = 0;
    let fixed = false;
    // Ein Bild mehr als die Rechnung verlangt, und zwar mit Absicht: Vierhundert
    // Summanden von je einer Hundertstel treffen die vier Sekunden auf das
    // letzte Bit nicht genau, und ein Test, der auf diesem Bit besteht, prüft
    // die Gleitkommazahlen und nicht die Küche.
    while (!fixed && frames < 405) {
      const tick = advanceFix(state, REPAIR_SECONDS / 400, true);
      state = tick.state;
      fixed = tick.fixed;
      frames++;
    }
    expect(fixed).toBe(true);
    expect(frames).toBeGreaterThanOrEqual(400);
    expect(advanceFix(startFix(springLeak(TIGHT)), REPAIR_SECONDS, true).fixed).toBe(true);
  });

  /**
   * **Wer weggeht, hat abgebrochen** — dieselbe Regel wie am Schneidebrett
   * (`kitchenWork.advanceWork`), und der zweite Teil ist der wichtigere:
   * Zurückkommen allein fängt nicht wieder an. Es braucht einen neuen Druck
   * mit der Zange in der Hand.
   */
  it('bricht ab, wenn niemand mehr danebensteht', () => {
    const begun = advanceFix(startFix(springLeak(TIGHT)), 3, true).state;
    const left = advanceFix(begun, 0.1, false);
    expect(left.state.leaking).toBe(true);
    expect(left.state.fixing).toBe(false);
    expect(left.state.time).toBe(0);

    // Zurück am Becken, aber ohne neuen Druck: Die Uhr bleibt stehen.
    const back = advanceFix(left.state, REPAIR_SECONDS * 2, true);
    expect(back.fixed).toBe(false);
    expect(back.state.leaking).toBe(true);
  });

  it('lässt ein dichtes Becken unangetastet — und zwar dasselbe Stück', () => {
    expect(advanceFix(TIGHT, 1, true).state).toBe(TIGHT);
  });

  /**
   * **Ein `NaN` bleibt draußen.** Es käme aus einem ersten Bild ohne Vorbild,
   * und ein Fortschritt, der einmal keine Zahl ist, ist es für immer — das
   * Becken spritzte dann bis zum Verlassen der Zone weiter.
   */
  it('überlebt ein Bild ohne Zeit', () => {
    const state = advanceFix(startFix(springLeak(TIGHT)), Number.NaN, true).state;
    expect(state.time).toBe(0);
    expect(fixProgress(state)).toBe(0);
  });
});

describe('fixProgress — der Balken über dem Becken', () => {
  it('steht auf null, solange niemand schraubt', () => {
    expect(fixProgress(TIGHT)).toBe(0);
    expect(fixProgress(springLeak(TIGHT))).toBe(0);
  });

  it('läuft von null bis eins und nicht darüber hinaus', () => {
    const begun = startFix(springLeak(TIGHT));
    expect(fixProgress(advanceFix(begun, REPAIR_SECONDS / 2, true).state)).toBeCloseTo(0.5, 6);
    expect(fixProgress({ leaking: true, fixing: true, time: REPAIR_SECONDS * 2 })).toBe(1);
  });
});

describe('LEAK_LIFT — wo die Fontäne austritt', () => {
  /**
   * **Auf dem Rand und nicht auf dem Wasserspiegel.** Die Zone reicht die
   * Ablage der Station herein, und die liegt beim Becken im Wasser
   * (`core/kitchenFit.SINK_BOWL.water`); gemeint ist die Armatur darüber.
   */
  it('hebt vom Wasserspiegel auf die Randhöhe', () => {
    expect(SINK_BOWL.water + LEAK_LIFT).toBeCloseTo(SINK_BOWL.rim, 6);
    expect(LEAK_LIFT).toBeGreaterThan(0);
  });
});

describe('LeakJet — die Fontäne', () => {
  /** Eine Bühne: ein Elternteil, das **nicht** im Ursprung steht und gedreht ist. */
  function stage(): THREE.Object3D {
    const parent = new THREE.Group();
    parent.position.set(10, 0, -4);
    parent.rotation.y = Math.PI / 2;
    parent.updateMatrixWorld(true);
    return parent;
  }

  /** Das Becken, wie die Küche es hereinreicht: seine Ablage in der Welt. */
  const DECK = new THREE.Vector3(11, 0.445, -4);

  function shown(jet: THREE.Object3D): THREE.Object3D[] {
    return jet.children.filter((child) => child.visible);
  }

  it('hängt nichts in die Szene, solange nichts spritzt', () => {
    const parent = stage();
    const jet = new LeakJet(parent);
    for (let i = 0; i < 60; i++) jet.update(0.016, null);
    expect(parent.children).toHaveLength(0);
    jet.dispose();
  });

  it('steigt auf, wenn es losgeht, und fällt aus, wenn es dicht ist', () => {
    const parent = stage();
    const jet = new LeakJet(parent);

    jet.update(0.016, DECK);
    expect(parent.children).toHaveLength(1);
    const group = parent.children[0]!;
    const first = shown(group).length;

    // Eine halbe Sekunde später steht die Fontäne.
    for (let i = 0; i < 30; i++) jet.update(0.016, DECK);
    expect(shown(group).length).toBeGreaterThan(first);

    // Und ausgeschaltet ist sie nach spätestens einer Lebenszeit durch.
    for (let i = 0; i < 90; i++) jet.update(0.016, null);
    expect(parent.children).toHaveLength(0);
    jet.dispose();
  });

  /**
   * **Sie tritt über dem Rand aus**, auch wenn die Zone gedreht und versetzt
   * steht: Gehoben wird in der **Welt**, umgerechnet wird danach.
   */
  it('setzt die Austrittsstelle auf den Beckenrand', () => {
    const parent = stage();
    const jet = new LeakJet(parent);
    jet.update(0.016, DECK);
    const group = parent.children[0]!;
    group.updateMatrixWorld(true);
    const at = group.getWorldPosition(new THREE.Vector3());
    expect(at.x).toBeCloseTo(DECK.x, 5);
    expect(at.z).toBeCloseTo(DECK.z, 5);
    expect(at.y).toBeCloseTo(DECK.y + LEAK_LIFT, 5);
    jet.dispose();
  });

  /**
   * **Jeder Tropfen fliegt eine Wurfparabel** — hoch und wieder herunter. Ohne
   * die Schwerkraft wäre es ein Strahl, der in den Himmel steht.
   */
  it('lässt die Tropfen steigen und wieder fallen', () => {
    const parent = stage();
    const jet = new LeakJet(parent);
    // Erst die Fontäne aufbauen, damit alle Tropfen fliegen.
    for (let i = 0; i < 60; i++) jet.update(0.016, DECK);
    const group = parent.children[0]!;
    const heights = shown(group).map((drop) => drop.position.y);
    expect(Math.max(...heights)).toBeGreaterThan(0.2);
    // Und keiner steht über der Schulter der Figur: Es ist ein Leck und kein
    // Rohrbruch.
    expect(Math.max(...heights)).toBeLessThan(0.8);
    // Was aufsteigt, kommt zurück — mindestens einer ist unterwegs nach unten.
    expect(Math.min(...heights)).toBeLessThan(Math.max(...heights));
    jet.dispose();
  });

  it('lässt sich zweimal wegräumen', () => {
    const parent = stage();
    const jet = new LeakJet(parent);
    jet.update(0.016, DECK);
    jet.dispose();
    expect(() => jet.dispose()).not.toThrow();
    expect(parent.children).toHaveLength(0);
  });
});
