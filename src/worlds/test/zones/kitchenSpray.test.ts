import * as THREE from 'three';
import {
  DOUSE_COOL,
  DRY,
  EXTINGUISHER_HULL,
  MUZZLE_AHEAD,
  MUZZLE_LIFT,
  NOZZLE_TIP,
  SPRAY_HALF_ANGLE,
  SPRAY_RANGE,
  SPRAY_SECONDS,
  SprayJet,
  advanceDouse,
  douseProgress,
  inSpray,
  sprayClaimsUse,
  sprayHold,
  sprayMuzzle,
  sprayOn,
  type DouseState,
} from './kitchenSpray';

/**
 * **Was der Feuerlöscher verspricht** (`kitchenSpray.ts`).
 *
 * Vier Versprechen, und alle vier sind im Headset teuer nachzustellen: dass der
 * Kegel vorn trifft und hinten nicht, dass derselbe Knopf in drei Ansichten
 * dasselbe **meint** und trotzdem verschieden **liegt**, dass ein Herd bei
 * einem Bild von 100 s genauso lange löscht wie bei tausend Bildern von 0,1 s
 * — und seit der Rückmeldung aus der Quest, dass der Nebel **oben am Rohr**
 * austritt und nicht unten am Fuß (`sprayMuzzle`). Das letzte ist das
 * teuerste: Welt laden, hinlaufen, greifen, sprühen, hinsehen.
 *
 * Kein WebGL und kein `document`: Auch der Nebel malt nichts auf eine Leinwand,
 * also läuft er hier wie jede andere Rechnung (`core/chefFit.canLoadModels`).
 */

/** Die Düse im Ursprung, der Strahl nach Norden — wie ein Möbel bei `turn: 0`. */
const FROM = { x: 0, z: 0 };
const NORTH = { x: 0, z: -1 };

describe('inSpray — der Kegel', () => {
  it('trifft, was vorn liegt, und nicht, was hinten liegt', () => {
    expect(inSpray(FROM, NORTH, { x: 0, z: -1 })).toBe(true);
    expect(inSpray(FROM, NORTH, { x: 0, z: 1 })).toBe(false);
  });

  it('hört auf der Reichweite auf — und zählt sie selbst noch mit', () => {
    expect(inSpray(FROM, NORTH, { x: 0, z: -SPRAY_RANGE })).toBe(true);
    expect(inSpray(FROM, NORTH, { x: 0, z: -SPRAY_RANGE - 0.01 })).toBe(false);
  });

  it('lässt liegen, was seitlich aus dem Kegel fällt', () => {
    // Auf einem Meter Abstand ist der Kegel knapp eine Kachel breit: Die
    // Nachbarkachel (1 m daneben) liegt sicher außerhalb, die eigene darin.
    expect(inSpray(FROM, NORTH, { x: 0.3, z: -1 })).toBe(true);
    expect(inSpray(FROM, NORTH, { x: 1, z: -1 })).toBe(false);
  });

  it('nimmt den Rand des Kegels noch mit', () => {
    const away = 2;
    // Genau auf dem halben Öffnungswinkel, aus Sinus und Kosinus gebaut —
    // der Fall, an dem eine Rechnung ohne Handbreit Luft am letzten Bit
    // scheitert.
    const edge = {
      x: Math.sin(SPRAY_HALF_ANGLE) * away,
      z: -Math.cos(SPRAY_HALF_ANGLE) * away,
    };
    expect(inSpray(FROM, NORTH, edge)).toBe(true);

    const wide = {
      x: Math.sin(SPRAY_HALF_ANGLE * 1.05) * away,
      z: -Math.cos(SPRAY_HALF_ANGLE * 1.05) * away,
    };
    expect(inSpray(FROM, NORTH, wide)).toBe(false);
  });

  it('trifft nichts, wenn die Richtung keine Länge hat', () => {
    // Der Blick senkrecht nach unten: keine waagerechte Richtung, also auch
    // kein Kegel — und schon gar keiner, der rundum alles löscht.
    expect(inSpray(FROM, { x: 0, z: 0 }, { x: 0, z: -1 })).toBe(false);
    expect(inSpray(FROM, { x: 0, z: 0 }, { x: 0, z: 0 })).toBe(false);
  });

  it('kümmert sich nicht um die Länge der Richtung', () => {
    const far = { x: 0, z: -1 };
    const long = { x: 0, z: -37 };
    expect(inSpray(FROM, long, far)).toBe(inSpray(FROM, NORTH, far));
  });

  it('dreht sich mit dem Löscher mit', () => {
    const east = { x: 1, z: 0 };
    expect(inSpray(FROM, east, { x: 2, z: 0 })).toBe(true);
    expect(inSpray(FROM, east, { x: 0, z: -2 })).toBe(false);
  });

  it('nimmt eigene Maße an, wenn jemand welche mitbringt', () => {
    const far = { x: 0, z: -4 };
    expect(inSpray(FROM, NORTH, far)).toBe(false);
    expect(inSpray(FROM, NORTH, far, 5)).toBe(true);
    // Ein Kegel von fast einer halben Umdrehung trifft auch zur Seite.
    expect(inSpray(FROM, NORTH, { x: 2, z: 0 }, 5, Math.PI / 2)).toBe(true);
  });
});

describe('sprayOn — ein Knopf, drei Ansichten', () => {
  /** Was in den meisten Fällen gilt: Löscher in der Hand, nichts gedrückt. */
  const idle = { pressed: false, held: false, carried: true, topDown: false };

  it('bleibt ohne Löscher in der Hand immer aus', () => {
    expect(sprayOn(false, { ...idle, carried: false, held: true })).toBe(false);
    // Und das gilt auch für den, der schon lief: Wer den Löscher im Laufen
    // zurück in die Halterung stellt, steht danach nicht mit einem pustenden
    // Nichts da.
    expect(sprayOn(true, { ...idle, carried: false, held: true })).toBe(false);
    expect(sprayOn(true, { ...idle, carried: false, topDown: true })).toBe(false);
  });

  it('schaltet von oben mit der Flanke um und bleibt dann an', () => {
    const top = { ...idle, topDown: true };
    expect(sprayOn(false, { ...top, pressed: true })).toBe(true);
    // Ohne weiteren Druck läuft er weiter — beliebig viele Bilder lang.
    let on = true;
    for (let i = 0; i < 100; i++) on = sprayOn(on, top);
    expect(on).toBe(true);
    // Und der nächste Druck macht ihn aus.
    expect(sprayOn(on, { ...top, pressed: true })).toBe(false);
  });

  it('kümmert sich von oben nicht darum, ob ein Auslöser liegt', () => {
    const top = { ...idle, topDown: true, held: true };
    expect(sprayOn(false, top)).toBe(false);
    expect(sprayOn(true, top)).toBe(true);
  });

  it('gilt am Schirm und in der Brille, solange der Auslöser liegt', () => {
    expect(sprayOn(false, { ...idle, held: true })).toBe(true);
    expect(sprayOn(true, { ...idle, held: true })).toBe(true);
    expect(sprayOn(true, idle)).toBe(false);
  });

  it('lässt sich aus den Augen nicht von der Flanke umschalten', () => {
    // `A` legt dort ab und nimmt auf; dass es nebenbei den Löscher anmachte,
    // wäre genau der Knopf, den man zweimal lernen muss.
    expect(sprayOn(false, { ...idle, pressed: true })).toBe(false);
    expect(sprayOn(true, { ...idle, pressed: true })).toBe(false);
  });

  it('sagt selbst, wie das Halten je Ansicht gemeint ist', () => {
    expect(sprayHold(true)).toBe('toggle');
    expect(sprayHold(false)).toBe('hold');
  });

  /**
   * **Und wem der Knopf dabei gehört** (`core/PlayerRig.useBusy`).
   *
   * Der gemeldete Fehler: Von oben schaltete `A` den Löscher an **und** ließ
   * die Figur hüpfen. Solange der Löscher in der Hand liegt, gehört der Knopf
   * ihm — außer in der Brille, wo ihn der Trigger zieht.
   */
  it('vergibt den Benutzen-Knopf, solange der Löscher in der Hand liegt', () => {
    expect(sprayClaimsUse(true, false)).toBe(true);
    // Zurück in der Halterung: Der Knopf gehört wieder dem Sprung.
    expect(sprayClaimsUse(false, false)).toBe(false);
    // In der Brille zieht ihn der Trigger, also bleibt `A` frei.
    expect(sprayClaimsUse(true, true)).toBe(false);
    expect(sprayClaimsUse(false, true)).toBe(false);
  });
});

describe('advanceDouse — der Fortschritt am Feuer', () => {
  /** Ein ganzer Löschvorgang in `steps` gleich langen Bildern. */
  function douse(steps: number): { state: DouseState; outs: number } {
    let state = DRY;
    let outs = 0;
    for (let i = 0; i < steps; i++) {
      const tick = advanceDouse(state, SPRAY_SECONDS / steps, true);
      state = tick.state;
      if (tick.out) outs++;
    }
    return { state, outs };
  }

  it('löscht in einem großen Bild genauso wie in tausend kleinen', () => {
    expect(douse(1).outs).toBe(1);
    expect(douse(1000).outs).toBe(1);
    expect(advanceDouse(DRY, 100, true).out).toBe(true);
  });

  it('gibt genau ein `out` und steht danach wieder auf `DRY`', () => {
    const tick = advanceDouse(DRY, 100, true);
    expect(tick.out).toBe(true);
    expect(tick.state).toBe(DRY);
    // Wer weiterpustet, löscht nicht ein zweites Mal dasselbe Feuer.
    expect(advanceDouse(tick.state, 0.016, true).out).toBe(false);
  });

  it('braucht seine volle Zeit und geht keine Sekunde früher aus', () => {
    let state = DRY;
    for (let i = 0; i < 10; i++) {
      const tick = advanceDouse(state, SPRAY_SECONDS / 11, true);
      expect(tick.out).toBe(false);
      state = tick.state;
    }
    expect(state.time).toBeLessThan(SPRAY_SECONDS);
    expect(douseProgress(state)).toBeGreaterThan(0.85);
  });

  it('fällt zurück, wenn nicht gepustet wird — aber nicht auf einen Schlag', () => {
    const half: DouseState = { time: SPRAY_SECONDS / 2 };
    const cooled = advanceDouse(half, 0.5, false).state;
    expect(cooled.time).toBeCloseTo(SPRAY_SECONDS / 2 - 0.5 * DOUSE_COOL, 6);
    expect(cooled.time).toBeGreaterThan(0);
  });

  it('fällt nie unter null und behält dort seinen Zustand', () => {
    const cold = advanceDouse({ time: 0.1 }, 100, false);
    expect(cold.state.time).toBe(0);
    expect(cold.out).toBe(false);
    // Nichts geändert heißt: nichts gebaut — der Fall für jeden nicht
    // getroffenen Herd in jedem Bild.
    expect(advanceDouse(DRY, 0.016, false).state).toBe(DRY);
  });

  it('kommt beim Schwenken zwischen zwei Herden trotzdem an', () => {
    // Eine Sekunde pusten, eine Sekunde daneben — netto eine halbe Sekunde je
    // Runde (`DOUSE_COOL`). Das muss irgendwann reichen, sonst wäre ein
    // zweiter brennender Herd das Ende der Runde.
    let state = DRY;
    let outs = 0;
    for (let i = 0; i < 20 && outs === 0; i++) {
      state = advanceDouse(state, 1, true).state;
      const tick = advanceDouse(state, 1, true);
      state = tick.state;
      if (tick.out) {
        outs++;
        break;
      }
      state = advanceDouse(state, 1, false).state;
    }
    expect(outs).toBe(1);
  });

  it('lässt sich von einem `dt` ohne Zahl nicht vergiften', () => {
    const tick = advanceDouse({ time: 0.5 }, Number.NaN, true);
    expect(tick.state.time).toBe(0.5);
    expect(tick.out).toBe(false);
    expect(advanceDouse({ time: 0.5 }, -3, true).state.time).toBe(0.5);
  });

  it('klemmt den Balken auf 0…1', () => {
    expect(douseProgress(DRY)).toBe(0);
    expect(douseProgress({ time: SPRAY_SECONDS / 2 })).toBeCloseTo(0.5, 6);
    expect(douseProgress({ time: SPRAY_SECONDS * 9 })).toBe(1);
    expect(douseProgress({ time: -4 })).toBe(0);
    expect(douseProgress({ time: Number.NaN })).toBe(0);
  });
});

describe('SprayJet — der Nebel', () => {
  /** Eine Bühne: ein Elternteil, das **nicht** im Ursprung steht und gedreht ist. */
  function stage(): THREE.Object3D {
    const parent = new THREE.Group();
    parent.position.set(10, 0, -4);
    parent.rotation.y = Math.PI / 2;
    parent.updateMatrixWorld(true);
    return parent;
  }

  /**
   * **Der Löscher, wie die Küche ihn hereinreicht** — der Ursprung seines
   * Netzes, und der liegt an seinem **Fuß** (`kitchen.spray`:
   * `held.object.getWorldPosition`, Ursprung aus
   * `core/kitchenModel.takeUtensil`). Genau von hier aus rechnet `inSpray` in
   * der Küche, und genau hier kam der Nebel bis zu diesem Auftrag heraus.
   */
  const HELD = new THREE.Vector3(11, 1.1, -4);
  /** Und die Düse darüber — dorthin gehört der Nebel (`sprayMuzzle`). */
  const MUZZLE = sprayMuzzle(HELD, { x: 0, z: -1 }, new THREE.Vector3());
  const AHEAD = new THREE.Vector3(0, 0, -1);
  /** So viele Bällchen muss ein laufender Strahl mindestens zeigen. */
  const PUFFS_SEEN = 20;

  /** Die Bällchen, die gerade wirklich zu sehen sind. */
  function shown(jet: THREE.Object3D): THREE.Object3D[] {
    return jet.children.filter((child) => child.visible);
  }

  it('hängt nichts in die Szene, solange niemand pustet', () => {
    const parent = stage();
    const jet = new SprayJet(parent);
    for (let i = 0; i < 60; i++) jet.update(0.016, false, HELD, AHEAD);
    expect(parent.children).toHaveLength(0);
    jet.dispose();
  });

  it('fährt aus, wenn angemacht wird, und klingt aus, wenn nicht mehr', () => {
    const parent = stage();
    const jet = new SprayJet(parent);

    jet.update(0.016, true, HELD, AHEAD);
    expect(parent.children).toHaveLength(1);
    const group = parent.children[0]!;
    // Nach einem Bild ist der Strahl noch kurz — er wächst nach vorn heraus.
    const first = shown(group).length;
    for (let i = 0; i < 60; i++) jet.update(0.016, true, HELD, AHEAD);
    expect(shown(group).length).toBeGreaterThan(first);

    // Ausgemacht: Der Rest fliegt noch zu Ende und hängt sich dann selbst ab.
    for (let i = 0; i < 120; i++) jet.update(0.016, false, HELD, AHEAD);
    expect(parent.children).toHaveLength(0);
    jet.dispose();
  });

  it('baut nichts nach, wie lange auch gepustet wird', () => {
    const parent = stage();
    const jet = new SprayJet(parent);
    jet.update(0.016, true, HELD, AHEAD);
    const count = parent.children[0]!.children.length;
    for (let i = 0; i < 600; i++) jet.update(0.016, true, HELD, AHEAD);
    expect(parent.children[0]!.children).toHaveLength(count);
    // Und beim Wiederanmachen entsteht auch keine zweite Gruppe.
    for (let i = 0; i < 120; i++) jet.update(0.016, false, HELD, AHEAD);
    jet.update(0.016, true, HELD, AHEAD);
    expect(parent.children).toHaveLength(1);
    jet.dispose();
  });

  it('steht an der Düse und zeigt dorthin, wohin gehalten wird', () => {
    const parent = stage();
    const jet = new SprayJet(parent);
    for (let i = 0; i < 40; i++) jet.update(0.016, true, HELD, AHEAD);
    const group = parent.children[0]!;

    const at = group.getWorldPosition(new THREE.Vector3());
    expect(at.x).toBeCloseTo(MUZZLE.x, 5);
    expect(at.y).toBeCloseTo(MUZZLE.y, 5);
    expect(at.z).toBeCloseTo(MUZZLE.z, 5);

    // Jedes sichtbare Bällchen liegt vor der Düse, in Richtung des Strahls —
    // auch am gedrehten Elternteil, an dem ein falsch verwandelter
    // Richtungsvektor sofort auffiele.
    const world = new THREE.Vector3();
    for (const puff of shown(group)) {
      puff.getWorldPosition(world).sub(HELD);
      expect(world.z).toBeLessThanOrEqual(1e-6);
    }
    jet.dispose();
  });

  it('pustet oben aus dem Rohr und nicht unten aus dem Fuß', () => {
    // Die Rückmeldung aus der Quest, Wort für Wort: „nur sollte der Rauch oben
    // aus dem Rohr kommen, nicht unten". Herein kommt der Ursprung des Netzes,
    // und der liegt unten in seiner Mitte — der Nebel gehört trotzdem an die
    // Düse, und die sitzt auf 0,87 der Höhe (`NOZZLE_TIP`).
    const parent = stage();
    const jet = new SprayJet(parent);
    for (let i = 0; i < 40; i++) jet.update(0.016, true, HELD, AHEAD);
    const group = parent.children[0]!;

    const at = group.getWorldPosition(new THREE.Vector3());
    expect(at.y - HELD.y).toBeCloseTo(MUZZLE_LIFT, 6);
    // **Über der Mitte des Löschers** und nicht an seinem Fuß: Das ist die
    // Aussage, um die es geht, und sie hängt an der Messung und nicht an
    // dieser Zeile.
    expect(at.y - HELD.y).toBeGreaterThan(EXTINGUISHER_HULL.height / 2);
    // Und vor seiner Achse, dort, wo das Rohr endet — `AHEAD` zeigt nach -z.
    expect(HELD.z - at.z).toBeCloseTo(MUZZLE_AHEAD, 6);

    // Und das gilt auch für den Nebel selbst und nicht nur für die Gruppe, an
    // der er hängt: Das Bällchen, das der Düse am nächsten ist — das jüngste,
    // das eben erst ausgestoßen wurde —, steht oben am Rohr. Weiter draußen
    // fächert der Kegel auf und der Nebel hängt durch (`PUFF_FAN`,
    // `PUFF_DROOP`), aber **bis auf den Fuß** des Löschers fällt keines zurück.
    const world = new THREE.Vector3();
    let nearest = Number.POSITIVE_INFINITY;
    let atNozzle = 0;
    for (const puff of shown(group)) {
      puff.getWorldPosition(world);
      expect(world.y).toBeGreaterThan(HELD.y);
      const away = world.distanceTo(MUZZLE);
      if (away >= nearest) continue;
      nearest = away;
      atNozzle = world.y;
    }
    expect(atNozzle).toBeGreaterThan(HELD.y + EXTINGUISHER_HULL.height / 2);
    jet.dispose();
  });

  it('setzt die Düse dorthin, wo das Modell sie hat', () => {
    // Gemessen an `public/models/mixedbag.glb` (`NOZZLE_TIP`): oben am
    // Trichter, auf der Höhe des Tragebügels (0,86,
    // `kitchenGrab.NOZZLE_BAR`) und vorn an der Hülle, deren +x der Trichter
    // überhaupt erst macht. Unter dem Deckel des Löschers bleibt er in jedem
    // Fall — was darüber austräte, käme aus dem roten Knopf.
    expect(NOZZLE_TIP.lift).toBeLessThan(1);
    expect(MUZZLE_LIFT).toBeCloseTo(NOZZLE_TIP.lift * EXTINGUISHER_HULL.height, 6);
    expect(MUZZLE_AHEAD).toBeCloseTo((NOZZLE_TIP.across * EXTINGUISHER_HULL.width) / 2, 6);

    // Sie dreht sich mit dem Löscher mit — die Länge der Richtung ist egal.
    const east = sprayMuzzle(HELD, { x: 37, z: 0 }, new THREE.Vector3());
    expect(east.x - HELD.x).toBeCloseTo(MUZZLE_AHEAD, 6);
    expect(east.z).toBeCloseTo(HELD.z, 6);
    expect(east.y - HELD.y).toBeCloseTo(MUZZLE_LIFT, 6);

    // Ohne waagerechte Richtung wird nur gehoben: Wer senkrecht nach unten
    // sieht, bekommt keinen Strahl, der ins Nichts springt (und keine Null in
    // der Division).
    const down = sprayMuzzle(HELD, { x: 0, z: 0 }, new THREE.Vector3());
    expect(down.x).toBeCloseTo(HELD.x, 6);
    expect(down.z).toBeCloseTo(HELD.z, 6);
    expect(down.y - HELD.y).toBeCloseTo(MUZZLE_LIFT, 6);
  });

  it('bleibt im gerechneten Kegel — was man sieht, geht auch aus', () => {
    const parent = stage();
    const jet = new SprayJet(parent);
    for (let i = 0; i < 90; i++) jet.update(0.016, true, HELD, AHEAD);
    const group = parent.children[0]!;

    const world = new THREE.Vector3();
    let seen = 0;
    for (const puff of shown(group)) {
      puff.getWorldPosition(world);
      expect(inSpray(HELD, AHEAD, world)).toBe(true);
      // Und auch die **Hülle** bleibt in Reichweite: Der Halbmesser steckt in
      // `scale`, denn die geteilte Form hat den Halbmesser 1.
      expect(world.distanceTo(HELD) + puff.scale.x).toBeLessThanOrEqual(SPRAY_RANGE);
      seen++;
    }
    // Ein Strahl ohne Bällchen hätte den Test sonst mühelos bestanden.
    expect(seen).toBeGreaterThan(PUFFS_SEEN);
    jet.dispose();
  });

  it('teilt Form und Farbe über alle Bällchen und gibt beide einmal frei', () => {
    const parent = stage();
    const jet = new SprayJet(parent);
    jet.update(0.016, true, HELD, AHEAD);
    const group = parent.children[0]!;
    const shapes = new Set(group.children.map((child) => (child as THREE.Mesh).geometry));
    const skins = new Set(group.children.map((child) => (child as THREE.Mesh).material));
    expect(shapes.size).toBe(1);
    expect(skins.size).toBe(1);

    const shapeGone = jest.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const skinGone = jest.spyOn(THREE.Material.prototype, 'dispose');
    jet.dispose();
    expect(shapeGone).toHaveBeenCalledTimes(1);
    expect(skinGone).toHaveBeenCalledTimes(1);
    expect(parent.children).toHaveLength(0);
  });

  it('übersteht ein zweites `dispose` und ein `update` danach', () => {
    const parent = stage();
    const jet = new SprayJet(parent);
    jet.update(0.016, true, HELD, AHEAD);
    jet.dispose();
    expect(() => jet.dispose()).not.toThrow();
    expect(() => jet.update(0.016, false, HELD, AHEAD)).not.toThrow();
  });

  it('lässt sich von einem `dt` ohne Zahl nicht zerlegen', () => {
    const parent = stage();
    const jet = new SprayJet(parent);
    jet.update(Number.NaN, true, HELD, AHEAD);
    const world = new THREE.Vector3();
    for (const puff of shown(parent.children[0]!)) {
      puff.getWorldPosition(world);
      expect(Number.isFinite(world.x + world.y + world.z)).toBe(true);
    }
    jet.dispose();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
