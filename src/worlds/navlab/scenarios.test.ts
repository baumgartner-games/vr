import { BAKE_DEFAULTS } from '../nav/navBake';
import { HUMAN_PROFILE, ZOMBIE_PROFILE, canTraverse, slopeDegrees } from '../nav/navProfile';
import { brainOf } from '../npc/npcBrains';
import { npcSkin } from '../npc/npcKinds';
import { TILE } from '../nav/navTile';
import {
  BAY_D,
  BAY_W,
  CRATE,
  NARROW,
  PODIUM,
  PORTAL,
  RAMP,
  SCENARIOS,
  SCENARIO_TIME,
  rampHeight,
  rampPlan,
  type ScenarioId,
  bayBounds,
  bayPoint,
  baySpot,
  bayWalls,
  labBounds,
  labSolids,
  newScenarioState,
  rampDeck,
  scenarioOf,
  startScenario,
  stopScenario,
  tickScenario,
} from './scenarios';

/**
 * **Die größte Steigung einer Bucht, in Grad** — so, wie das Abtasten sie
 * misst: der Höhenunterschied zwischen zwei Kachelmitten (`nav/navBake.ts`).
 *
 * Gerechnet aus denselben Daten, aus denen die Bucht gebaut wird — eine Zahl,
 * die hier stünde, wäre beim nächsten Umbau still falsch.
 */
function rampSlope(id: ScenarioId): number {
  let worst = 0;
  for (let lz = 7.5 - TILE / 2; lz > -7.5; lz -= TILE) {
    const rise = rampHeight(id, lz - TILE) - rampHeight(id, lz);
    worst = Math.max(worst, slopeDegrees(rise));
  }
  return worst;
}

describe('Der Grundriss', () => {
  it('hat zu jedem Szenario aus dem Auftrag eine Bucht', () => {
    expect(SCENARIOS.map((bay) => bay.id)).toEqual([
      'corridor',
      'pit',
      'crate',
      'narrow',
      'door',
      'portal',
      'levels',
      'podium',
      'ramp',
      'steep',
      'gentle',
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

  it('lässt die Kiste in den Durchgang fallen und nicht daneben', () => {
    // Der Knopf heißt „Kiste in den Durchgang". Sie muss also in der Lücke
    // stehen — in der Kachel, die an der Türlinie liegt, und quer dazu
    // zwischen den beiden Wandstücken.
    const bay = scenarioOf('crate');
    const walls = bayWalls(bay).filter((wall) => wall.d < wall.w && wall.lz === 0);
    expect(walls.length).toBeGreaterThan(1);
    // Die Kiste liegt in keiner Wand, sondern in der Lücke dazwischen.
    for (const wall of walls) {
      const inside = Math.abs(CRATE.lx - wall.lx) < wall.w / 2;
      expect(inside).toBe(false);
    }
    // Und direkt an der Wand: eine halbe Kachel von der Türlinie weg.
    expect(Math.abs(CRATE.lz)).toBeCloseTo(TILE / 2);
  });

  it('macht den engen Gang schmaler als jeden, der hindurch will', () => {
    // Beide Hälften der Behauptung: Der Zombie passt nicht (Welt), und das
    // Abtasten sieht dort keine Lücke (Karte). Fällt eine davon weg, plant er
    // hindurch und rennt für immer dagegen.
    expect(NARROW.gap).toBeLessThan(npcSkin('zombie').radius * 2);
    expect(NARROW.gap).toBeLessThan(BAKE_DEFAULTS.width);
    // Und die Pfosten sitzen wirklich in der einen Kachel Lücke.
    expect(NARROW.gap).toBeLessThan(NARROW.opening);
  });

  it('legt die Podeste so hoch, dass nur der Sprung hinaufführt', () => {
    // **Die Zahlen kommen aus den Fähigkeiten und nicht mehr aus dem
    // Abtasten**: Hier stand einmal „höher als eine Treppe, niedriger als ein
    // Absprung" (`BAKE_DEFAULTS.climb`, `drop`) — zwei Grenzen, die für alle
    // galten. Heute misst die Karte nur noch, und die Behauptung dieser Bucht
    // hängt daran, was ein NPC *kann* (`nav/navProfile.ts`).
    for (const profile of [HUMAN_PROFILE, ZOMBIE_PROFILE]) {
      // Von unten kommt keiner hinauf: zu hoch zum Hochziehen.
      expect(PODIUM.high).toBeGreaterThan(profile.jumpUp);
      // Und wieder herunter kommt jeder — sonst wäre das Podest eine Falle.
      expect(canTraverse(profile, 'drop', { rise: -PODIUM.high, step: PODIUM.high, gap: 0 })).toBe(
        true,
      );
    }
    // Zwischen den beiden Decken liegt ein Gang und keine Fuge — daraus macht
    // das Abtasten die Sprungverbindung (`navBake.joinGap`).
    expect(PODIUM.far.minLx - PODIUM.near.maxLx).toBeCloseTo(TILE);
    // Die Rampe steigt in Stufen, die ein Zombie sich hochzieht — mehr, als er
    // tritt, und weniger, als er springt. Genau daran sieht man ihm an, wo die
    // eine Fähigkeit aufhört und die andere anfängt.
    let below = 0;
    for (const step of PODIUM.ramp) {
      expect(step.y - below).toBeGreaterThan(ZOMBIE_PROFILE.stepUp);
      expect(step.y - below).toBeLessThanOrEqual(ZOMBIE_PROFILE.jumpUp);
      below = step.y;
    }
    expect(below).toBeCloseTo(PODIUM.high);
  });

  it('baut die beiden Steigungen so, dass nur der Winkel sie unterscheidet', () => {
    // **Die Behauptung der zwei neuen Buchten, als Rechnung.** Beide gehen
    // gleich hoch; was sie trennt, ist die Steigung je Kachel — und dass die
    // einzelne Stufe in *keiner* von beiden der Grund ist, warum jemand stehen
    // bleibt.
    const flat = rampSlope('ramp');
    const steep = rampSlope('steep');
    expect(flat).toBeLessThan(steep);
    for (const profile of [HUMAN_PROFILE, ZOMBIE_PROFILE]) {
      expect(flat).toBeLessThan(profile.maxSlope);
      expect(steep).toBeGreaterThan(profile.maxSlope);
      // Die feinen Stufen der steilen Steigung tritt jeder — an ihnen liegt es
      // also nicht.
      expect(RAMP.steep.step).toBeLessThanOrEqual(profile.stepUp);
      // Und die groben der flachen zieht sich jeder hoch.
      expect(RAMP.flat.step).toBeLessThanOrEqual(profile.jumpUp);
      expect(RAMP.flat.step).toBeGreaterThan(profile.stepUp);
    }
  });

  it('macht die sanfte flacher als die flache und beide begehbar', () => {
    // **Die dritte Steigung ist die einzige, die keine Kante mehr ist.** Ihre
    // größte einzelne Stufe liegt unter dem, was jeder hier tritt — damit ist
    // sie auf der Karte eine Steigung und keine Stufe, und dann entscheidet
    // allein der Winkel (`navProfile.canTraverse`).
    const gentle = rampSlope('gentle');
    expect(gentle).toBeLessThan(rampSlope('ramp'));
    for (const profile of [HUMAN_PROFILE, ZOMBIE_PROFILE]) {
      expect(gentle).toBeLessThan(profile.maxSlope);
      expect(RAMP.gentle.step).toBeLessThan(profile.stepUp);
    }
  });

  it('legt den Belag der sanften Rampe genau auf die Nasen ihrer Stufen', () => {
    // **Die Rechnung, ohne die die Bucht nichts zeigt.** Der Belag ist der
    // Boden, auf dem gelaufen wird, die Stufen sind die Karte darunter. Steht
    // eine Stufe auch nur einen Zentimeter durch ihn hindurch, ist genau das
    // wieder die Kante, an der ein Zylinder stehen bleibt — und die Bucht
    // behauptet dann das Gegenteil dessen, was sie zeigt.
    const bay = scenarioOf('gentle');
    const deck = rampDeck(bay)!;
    expect(deck).not.toBeNull();

    const plan = RAMP.gentle;
    const count = Math.round(RAMP.high / plan.step);
    const tread = plan.run / count;
    /** Die Oberkante des Belags an einer Stelle der Bucht, in Buchtmaßen. */
    const deckTop = (lz: number): number =>
      Math.min(RAMP.high, ((plan.foot + tread - lz) * RAMP.high) / plan.run);

    for (let i = 0; i < count; i++) {
      const top = plan.step * (i + 1);
      // Auf der Nase treffen sich beide genau …
      expect(deckTop(plan.foot - i * tread)).toBeCloseTo(top, 9);
      // … und über der ganzen Trittfläche liegt der Belag darüber, nie darunter.
      for (let t = 0; t <= 1; t += 0.1) {
        expect(deckTop(plan.foot - (i + t) * tread)).toBeGreaterThanOrEqual(top - 1e-9);
      }
    }
    // Vorn läuft er auf null aus: Eine Rampe, die mit einer Kante anfängt, ist
    // wieder eine Stufe.
    expect(deckTop(plan.foot + tread)).toBeCloseTo(0, 9);
    // Und hinten trifft er die Oberkante der letzten Stufe.
    expect(deckTop(plan.foot + tread - plan.run)).toBeCloseTo(RAMP.high, 9);
  });

  it('lässt beide Steigungen auf Kachelmitten enden', () => {
    // Was zwischen zwei Kachelmitten liegt, misst das Abtasten nicht — eine
    // Stufe, die eine Kachelmitte halb trifft, steht mit halber Höhe in der
    // Karte.
    for (const id of ['ramp', 'steep'] as const) {
      const plan = rampPlan(id);
      expect(plan.foot % TILE).toBeCloseTo(0);
      expect((plan.foot - plan.run) % TILE).toBeCloseTo(0);
      expect(Math.round(RAMP.high / plan.step) * plan.step).toBeCloseTo(RAMP.high);
    }
  });

  it('baut jeden Quader des Labors aus denselben Daten', () => {
    // `labSolids` ist die Liste, die die Welt baut *und* ein Test abtastet.
    // Wären es zwei Listen, prüfte der Test eine zweite Welt.
    const solids = labSolids();
    // Vier Streifen und nicht eine Platte: dazwischen liegt das Loch der Grube
    // (`labFloor`), und darunter deren Grund.
    expect(solids.filter((one) => one.kind === 'floor')).toHaveLength(4);
    expect(solids.filter((one) => one.kind === 'pit')).toHaveLength(1);
    expect(solids.filter((one) => one.kind === 'rim')).toHaveLength(4);
    const walls = SCENARIOS.reduce((sum, bay) => sum + bayWalls(bay).length, 0);
    expect(solids.filter((one) => one.kind === 'wall').length).toBeGreaterThanOrEqual(walls);
    // Jeder Quader steht innerhalb dessen, was der Boden trägt.
    const box = labBounds();
    for (const solid of solids) {
      if (solid.kind === 'floor' || solid.kind === 'rim') continue;
      expect(solid.x).toBeGreaterThanOrEqual(box.minX - 1);
      expect(solid.x).toBeLessThanOrEqual(box.maxX + 1);
      expect(solid.h).toBeGreaterThan(0);
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
