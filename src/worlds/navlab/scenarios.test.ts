import { brainOf } from '../npc/npcBrains';
import { TILE } from '../nav/navTile';
import {
  BAY_D,
  BAY_W,
  CRATE,
  PORTAL,
  SCENARIOS,
  SCENARIO_TIME,
  bayBounds,
  bayPoint,
  baySpot,
  bayWalls,
  labBounds,
  newScenarioState,
  scenarioOf,
  startScenario,
  stopScenario,
  tickScenario,
} from './scenarios';

describe('Der Grundriss', () => {
  it('hat zu jedem Szenario aus dem Auftrag eine Bucht', () => {
    expect(SCENARIOS.map((bay) => bay.id)).toEqual([
      'corridor',
      'pit',
      'crate',
      'door',
      'portal',
      'levels',
    ]);
  });

  it('gibt jeder Bucht einen eigenen Platz', () => {
    // Zwei Buchten, die sich überlappen, sieht man in der Brille erst daran,
    // dass ein Zombie durch eine Wand kommt.
    for (let i = 0; i < SCENARIOS.length; i++) {
      for (let j = i + 1; j < SCENARIOS.length; j++) {
        const a = bayBounds(SCENARIOS[i]!);
        const b = bayBounds(SCENARIOS[j]!);
        const apart = a.maxX <= b.minX || b.maxX <= a.minX || a.maxZ <= b.minZ || b.maxZ <= a.minZ;
        expect(apart).toBe(true);
      }
    }
  });

  it('lässt den Mittelgang frei', () => {
    // Keine Bucht darf über die Mitte hinausragen: dort läuft der Spieler.
    for (const bay of SCENARIOS) {
      const box = bayBounds(bay);
      if (bay.z < 0) expect(box.maxZ).toBeLessThan(0);
      else expect(box.minZ).toBeGreaterThan(0);
    }
  });

  it('legt „vorne" in jeder Bucht an den Eingang', () => {
    for (const bay of SCENARIOS) {
      const front = bayPoint(bay, 0, BAY_D / 2);
      const back = bayPoint(bay, 0, -BAY_D / 2);
      // Vorne ist die Seite, die zur Mitte zeigt — in beiden Reihen.
      expect(Math.abs(front.z)).toBeLessThan(Math.abs(back.z));
    }
  });

  it('bleibt mit jedem Buchtpunkt innerhalb der Bucht', () => {
    for (const bay of SCENARIOS) {
      for (const [lx, lz] of [
        [-BAY_W / 2, -BAY_D / 2],
        [BAY_W / 2, BAY_D / 2],
        [0, 0],
        [7, -3],
      ] as const) {
        const point = bayPoint(bay, lx, lz);
        const box = bayBounds(bay);
        expect(point.x).toBeGreaterThanOrEqual(box.minX);
        expect(point.x).toBeLessThanOrEqual(box.maxX);
        expect(point.z).toBeGreaterThanOrEqual(box.minZ);
        expect(point.z).toBeLessThanOrEqual(box.maxZ);
      }
    }
  });

  it('umfasst alle Buchten in den Gesamtgrenzen', () => {
    const all = labBounds();
    for (const bay of SCENARIOS) {
      const box = bayBounds(bay);
      expect(box.minX).toBeGreaterThanOrEqual(all.minX);
      expect(box.maxX).toBeLessThanOrEqual(all.maxX);
      expect(box.minZ).toBeGreaterThanOrEqual(all.minZ);
      expect(box.maxZ).toBeLessThanOrEqual(all.maxZ);
    }
  });

  it('legt zwischen Spieler und Auftritt eine Strecke', () => {
    // Die Behauptung jeder Bucht ist ein Weg, und ein Weg braucht zwei Enden.
    // Stünden beide beieinander, liefe niemand an dem vorbei, worum es geht —
    // an den zwei Ecken, der Grube, dem Durchgang, der Tür, der Wand.
    for (const bay of SCENARIOS) {
      expect(bay.cast.length).toBeGreaterThan(0);
      const stand = baySpot(bay, bay.stand);
      for (const one of bay.cast) {
        const at = baySpot(bay, one);
        expect(Math.hypot(at.x - stand.x, at.z - stand.z)).toBeGreaterThan(8);
      }
    }
  });

  it('lässt jeden Auftritt innerhalb seiner Bucht stehen', () => {
    for (const bay of SCENARIOS) {
      const box = bayBounds(bay);
      for (const spot of [bay.stand, ...bay.cast]) {
        const point = baySpot(bay, spot);
        expect(point.x).toBeGreaterThan(box.minX);
        expect(point.x).toBeLessThan(box.maxX);
        expect(point.z).toBeGreaterThan(box.minZ);
        expect(point.z).toBeLessThan(box.maxZ);
      }
    }
  });

  it('stellt den Spieler nah genug, dass ein Zombie ihn bemerkt', () => {
    // **Der Prüfstein dieser Datei.** Lange stand der Spieler im Mittelgang
    // auf (0,0), und von dort sind es zu den äußeren Buchten sechsunddreißig
    // Meter — mehr als die Sichtweite eines Zombies. Fünf der sechs Knöpfe
    // starteten damit ein Szenario, in dem niemand einen Schritt tat, und das
    // sah nicht nach einer zu großen Zahl aus, sondern nach kaputter
    // Wegsuche. Die Zahl kommt aus dem Hirn selbst und nicht aus dieser
    // Datei: Wer sie dort ändert, soll es hier merken.
    const sense = brainOf('chase').tuning.sense;
    for (const bay of SCENARIOS) {
      const stand = baySpot(bay, bay.stand);
      for (const one of bay.cast) {
        const at = baySpot(bay, one);
        const far = Math.hypot(at.x - stand.x, at.z - stand.z);
        expect(far).toBeLessThan(sense);
      }
    }
  });

  it('stellt jede Wand auf eine Kachelgrenze', () => {
    // **Der zweite Prüfstein.** Das Abtasten fragt zwischen zwei Kachelmitten
    // genau einen Punkt — die Grenze dazwischen (`nav/navBake.ts`,
    // `joinTiles`). Eine Wand einen halben Meter daneben steht in der Welt,
    // aber nicht auf der Karte: Der NPC plant mitten hindurch und bleibt
    // daran hängen. Bei 22 × 16 Metern im Raster von 2,5 traf das die
    // Rückwand jeder Bucht, beide Stirnwände und die Hälfte der Seiten.
    for (const bay of SCENARIOS) {
      for (const wall of bayWalls(bay)) {
        const at = bayPoint(bay, wall.lx, wall.lz);
        // Die dünne Achse ist die, auf der die Wand als Wand wirkt.
        const thin = wall.w < wall.d ? at.x : at.z;
        expect(thin % TILE).toBeCloseTo(0);
        expect(Math.min(wall.w, wall.d)).toBeLessThan(TILE);
      }
    }
  });

  it('lässt jede Wand auf einer Kachelgrenze enden', () => {
    // Sonst liegt eine Lücke halb hinter einer Wand: Die Grenze, die sie
    // freigeben soll, ist dann noch verdeckt, und aus zwei Kacheln Durchgang
    // wird eine — oder keine.
    for (const bay of SCENARIOS) {
      for (const wall of bayWalls(bay)) {
        const at = bayPoint(bay, wall.lx, wall.lz);
        const [along, length] = wall.w < wall.d ? [at.z, wall.d] : [at.x, wall.w];
        expect((along - length / 2) % TILE).toBeCloseTo(0);
        expect((along + length / 2) % TILE).toBeCloseTo(0);
      }
    }
  });

  it('setzt jeden, der laufen soll, auf eine Kachelmitte', () => {
    // Ein NPC oder eine Kiste auf einer Kachelgrenze gehört je nach Rundung
    // mal der einen und mal der anderen Kachel — und wenn die eine hinter
    // einer Wand liegt, steht er mal davor und mal dahinter.
    const centre = (value: number): number => Math.abs(((value % TILE) + TILE) % TILE) - TILE / 2;
    for (const bay of SCENARIOS) {
      for (const spot of [...bay.cast, ...PORTAL, CRATE]) {
        const at = baySpot(bay, spot);
        expect(centre(at.x)).toBeCloseTo(0);
        expect(centre(at.z)).toBeCloseTo(0);
      }
    }
  });

  it('fällt auf die erste Bucht zurück, wenn die Id Unsinn ist', () => {
    expect(scenarioOf('gibt-es-nicht').id).toBe('corridor');
    expect(scenarioOf(undefined).id).toBe('corridor');
    expect(scenarioOf('portal').id).toBe('portal');
  });
});

describe('Die Uhr eines Szenarios', () => {
  it('läuft nicht, bevor jemand drückt', () => {
    const state = newScenarioState();
    expect(tickScenario(state, 10)).toBe(false);
    expect(state.elapsed).toBe(0);
  });

  it('läuft und meldet das Ende genau einmal', () => {
    const state = newScenarioState();
    startScenario(state);
    let ended = 0;
    for (let i = 0; i < 200; i++) {
      if (tickScenario(state, 1)) ended++;
    }
    expect(ended).toBe(1);
    expect(state.running).toBe(false);
  });

  it('nimmt die Zeit, die ihr gegeben wird — auch Zeitlupe', () => {
    const frames = (dt: number): number => {
      const state = newScenarioState();
      startScenario(state);
      let count = 1;
      while (!tickScenario(state, dt) && count < 100000) count++;
      return count;
    };
    // Ein Zehntel Zeit je Bild heißt: zehnmal so viele Bilder, und nicht
    // etwa dieselbe Anzahl. Die Uhr holt sich ihre Sekunden nicht selbst.
    expect(frames(1)).toBe(SCENARIO_TIME);
    expect(frames(0.1)).toBeGreaterThan(SCENARIO_TIME * 9);
    expect(frames(0.1)).toBeLessThan(SCENARIO_TIME * 11);
  });

  it('fängt beim Neustart von vorn an', () => {
    const state = newScenarioState();
    startScenario(state);
    tickScenario(state, 30);
    state.acted = true;
    startScenario(state);
    expect(state).toEqual({ running: true, elapsed: 0, acted: false });
  });

  it('lässt sich anhalten und vergisst dabei alles', () => {
    const state = newScenarioState();
    startScenario(state);
    tickScenario(state, 5);
    stopScenario(state);
    expect(state).toEqual({ running: false, elapsed: 0, acted: false });
  });
});
