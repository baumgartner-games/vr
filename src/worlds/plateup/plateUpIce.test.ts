import { INTERACTION_DEFAULTS } from '../../core/interaction';
import { STATION_ROW, placeCheck } from './plateUpShop';
import { findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { dirX, dirZ, tileKey } from '../nav/navTile';
import {
  DOOR_INSIDE,
  ICE_FACE,
  ICE_STAND,
  ICE_TUBS,
  KITCHEN_AREA,
  SPAWN_TILE,
  STATIONS,
  blockedTiles,
  routePlan,
} from './plateUpPlan';
import {
  EMPTY_ICE,
  FLAVOR_COLORS,
  coneLabel,
  coneUnder,
  counterDeed,
  dropBall,
  dropIntoHand,
  iceInteraction,
  icePrompt,
  iceVerb,
  pickTub,
  standDeed,
  tubDeed,
  tubUnder,
  useCounter,
  useStand,
  useTub,
  type IceCone,
  type IceHands,
  type IceStation,
} from './plateUpIce';
import {
  NO_WOBBLE,
  WOBBLE,
  followBall,
  followRate,
  followTime,
  leanLimit,
  linkLean,
  restTower,
  softLean,
  stepWobble,
  turnToward,
  wobbleLag,
  type Vec3,
  type WobbleLink,
  type WobbleState,
} from './plateUpWobble';

/** Eine freie Arbeitsplatte, eine mit etwas darauf, Kiste, Mülleimer. */
const TOP: IceStation = { kind: 'top', taken: false, cone: null };
const TAKEN: IceStation = { kind: 'top', taken: true, cone: null };
const CRATE: IceStation = { kind: 'crate', taken: false, cone: null };
const BIN: IceStation = { kind: 'bin', taken: false, cone: null };

/** In der Brille: links das Hörnchen, rechts der Portionierer. */
function vrHands(): IceHands {
  const cone = useStand(EMPTY_ICE, 'cones', 'left');
  expect(cone.deed.do).toBe('take-cone');
  const scoop = useStand(cone.hands, 'scoop', 'right');
  expect(scoop.deed.do).toBe('take-scoop');
  return scoop.hands;
}

describe('Restaurant: Eis — der Hörnchenstapel', () => {
  test('gibt Hörnchen ohne Ende her', () => {
    let hands = EMPTY_ICE;
    for (let i = 0; i < 100; i++) {
      const take = useStand(hands, 'stand', null);
      expect(take.deed.do).toBe('take-cone');
      expect(take.hands.cone?.balls).toEqual([]);
      // Ein leeres Hörnchen geht zurück auf den Stapel, und der nächste Druck
      // gibt wieder eines.
      const back = useStand(take.hands, 'stand', null);
      expect(back.deed.do).toBe('return-cone');
      hands = back.hands;
      expect(hands.cone).toBeNull();
    }
    // Und wer eins abstellt, bekommt am Stapel das nächste.
    const first = useStand(EMPTY_ICE, 'stand', null).hands;
    const put = useCounter(first, null, TOP)!;
    expect(put.deed.do).toBe('put');
    expect(useStand(put.hands, 'stand', null).deed.do).toBe('take-cone');
  });

  test('ein Eis mit Kugeln geht nicht zurück auf den Stapel', () => {
    const cone = useStand(EMPTY_ICE, 'stand', null).hands;
    const full = useTub(cone, 'vanilla', null).hands;
    expect(standDeed(full, 'stand', null).do).toBe('refuse');
  });

  test('wer schon etwas trägt, bekommt kein Hörnchen', () => {
    const busy = { busy: true, hand: null };
    expect(standDeed(EMPTY_ICE, 'stand', null, busy).do).toBe('refuse');
    expect(standDeed(EMPTY_ICE, 'cones', 'left', busy).do).toBe('refuse');
  });
});

describe('Restaurant: Eis in der Brille — zwei Hände, zwei Dinge', () => {
  test('Hörnchen in die eine, Portionierer in die andere Hand', () => {
    const hands = vrHands();
    expect(hands.coneHand).toBe('left');
    expect(hands.scoop).toEqual({ hand: 'right', ball: null });
  });

  test('eine Hand hält nicht beides', () => {
    const cone = useStand(EMPTY_ICE, 'cones', 'left').hands;
    expect(standDeed(cone, 'scoop', 'left').do).toBe('refuse');
    const scoop = useStand(EMPTY_ICE, 'scoop', 'right').hands;
    expect(standDeed(scoop, 'cones', 'right').do).toBe('refuse');
    // Der Portionierer ist nur einmal da.
    expect(standDeed(scoop, 'scoop', 'left').do).toBe('refuse');
    // Und ein Teller in der rechten Hand lässt die linke frei.
    expect(standDeed(EMPTY_ICE, 'scoop', 'left', { busy: true, hand: 'right' }).do).toBe(
      'take-scoop',
    );
    expect(standDeed(EMPTY_ICE, 'scoop', 'right', { busy: true, hand: 'right' }).do).toBe('refuse');
  });

  test('eintauchen gibt dem Portionierer eine Kugel der Wanne', () => {
    const hands = vrHands();
    const dip = useTub(hands, 'strawberry', 'right');
    expect(dip.deed).toEqual({ do: 'fill', flavor: 'strawberry' });
    expect(dip.hands.scoop?.ball).toBe('strawberry');
    // Voll ist voll — ein zweites Eintauchen tut nichts.
    expect(tubDeed(dip.hands, 'vanilla', 'right').do).toBe('refuse');
    // Mit der Hörnchenhand wird nicht eingetaucht.
    expect(tubDeed(hands, 'vanilla', 'left').do).toBe('refuse');
    expect(useTub(hands, 'vanilla', 'left').hands).toBe(hands);
  });

  test('die Kugel geht vom Portionierer aufs Hörnchen', () => {
    const full = useTub(vrHands(), 'vanilla', 'right').hands;
    const drop = dropIntoHand(full);
    expect(drop.deed).toEqual({ do: 'drop', flavor: 'vanilla' });
    expect(drop.hands.cone?.balls).toEqual(['vanilla']);
    expect(drop.hands.scoop?.ball).toBeNull();
    // Ein leerer Portionierer setzt nichts ab.
    expect(dropIntoHand(drop.hands).deed.do).toBe('nothing');
  });

  test('beliebig viele Kugeln, in der Reihenfolge, in der sie kamen', () => {
    let hands = vrHands();
    const want: string[] = [];
    for (let i = 0; i < 40; i++) {
      const flavor = i % 3 === 0 ? 'strawberry' : 'vanilla';
      hands = useTub(hands, flavor, 'right').hands;
      hands = dropIntoHand(hands).hands;
      want.push(flavor);
    }
    expect(hands.cone?.balls).toEqual(want);
    expect(hands.cone?.balls.length).toBe(40);
  });

  test('auch aufs abgestellte Hörnchen', () => {
    const cone: IceCone = { balls: ['vanilla'] };
    const done = dropBall(cone, { hand: 'right', ball: 'strawberry' });
    expect(done?.cone.balls).toEqual(['vanilla', 'strawberry']);
    expect(done?.scoop.ball).toBeNull();
    expect(dropBall(cone, { hand: 'right', ball: null })).toBeNull();
    expect(dropBall(cone, null)).toBeNull();
  });

  test('den Portionierer legt die Hand zurück, die ihn hat — eine Kugel darin geht mit', () => {
    const full = useTub(vrHands(), 'vanilla', 'right').hands;
    expect(standDeed(full, 'scoop', 'left').do).toBe('refuse');
    const back = useStand(full, 'scoop', 'right');
    expect(back.deed.do).toBe('return-scoop');
    expect(back.hands.scoop).toBeNull();
    expect(back.hands.cone).toEqual(full.cone);
  });
});

describe('Restaurant: Eis am Schirm — eine Hand, ein Druck', () => {
  test('am Stand Hörnchen samt Portionierer, an der Wanne gleich die Kugel', () => {
    const take = useStand(EMPTY_ICE, 'stand', null);
    expect(take.hands.cone).toEqual({ balls: [] });
    // Keine Hand: vor dem Bauch, und der Portionierer gehört dazu.
    expect(take.hands.coneHand).toBeNull();
    expect(take.hands.scoop).toBeNull();
    let hands = take.hands;
    for (const flavor of ['vanilla', 'strawberry', 'vanilla', 'vanilla'] as const) {
      const use = useTub(hands, flavor, null);
      expect(use.deed).toEqual({ do: 'scoop', flavor });
      hands = use.hands;
    }
    expect(hands.cone?.balls).toEqual(['vanilla', 'strawberry', 'vanilla', 'vanilla']);
    expect(coneLabel(hands.cone!)).toBe('Eis (Vanille, Erdbeere, Vanille, Vanille)');
  });

  test('ohne Hörnchen sagt die Wanne, wo es eins gibt', () => {
    const deed = tubDeed(EMPTY_ICE, 'vanilla', null);
    expect(deed.do).toBe('refuse');
    expect(icePrompt(deed)).toContain('Hörnchen');
  });

  test('ein Teil des Stands meint ohne Hand den ganzen Stand', () => {
    expect(useStand(EMPTY_ICE, 'scoop', null).deed.do).toBe('take-cone');
    expect(useStand(EMPTY_ICE, 'cones', null).hands.coneHand).toBeNull();
  });
});

describe('Restaurant: Eis abstellen, nehmen, wegwerfen', () => {
  const cone = useTub(useStand(EMPTY_ICE, 'stand', null).hands, 'vanilla', null).hands;

  test('auf eine freie Arbeitsplatte und wieder in die Hand', () => {
    const put = useCounter(cone, null, TOP)!;
    expect(put.deed.do).toBe('put');
    expect(put.hands.cone).toBeNull();
    expect(put.cone).toEqual({ balls: ['vanilla'] });
    const pick = useCounter(put.hands, 'right', { ...TOP, cone: put.cone })!;
    expect(pick.deed.do).toBe('pick');
    expect(pick.hands.cone).toEqual({ balls: ['vanilla'] });
    expect(pick.hands.coneHand).toBe('right');
    expect(pick.cone).toBeNull();
  });

  test('nicht auf Belegtes, nicht auf Kisten — aber in den Müll', () => {
    expect(counterDeed(cone, null, TAKEN)?.do).toBe('refuse');
    expect(counterDeed(cone, null, { ...TOP, cone: { balls: [] } })?.do).toBe('refuse');
    expect(counterDeed(cone, null, CRATE)?.do).toBe('refuse');
    const trash = useCounter(cone, null, BIN)!;
    expect(trash.deed.do).toBe('trash');
    expect(trash.hands.cone).toBeNull();
  });

  test('ohne Eis in der Hand und ohne Eis auf der Platte entscheidet die Küche', () => {
    expect(counterDeed(EMPTY_ICE, null, TOP)).toBeNull();
    expect(counterDeed(EMPTY_ICE, null, CRATE)).toBeNull();
    expect(useCounter(EMPTY_ICE, null, TOP)).toBeNull();
  });

  test('mit einem Teller in der Hand bleibt das Eis stehen', () => {
    const standing = { ...TOP, cone: { balls: ['vanilla'] as const } };
    expect(counterDeed(EMPTY_ICE, null, standing, { busy: true, hand: null })?.do).toBe('refuse');
  });

  test('die Hand mit dem Portionierer bedient keine Station', () => {
    const hands = vrHands();
    expect(counterDeed(hands, 'right', CRATE)?.do).toBe('refuse');
    expect(counterDeed(hands, 'right', TOP)?.do).toBe('refuse');
    // Die Hörnchenhand stellt ab; die andere darf das nicht für sie.
    expect(counterDeed(hands, 'left', TOP)?.do).toBe('put');
    const onlyCone = useStand(EMPTY_ICE, 'cones', 'left').hands;
    expect(counterDeed(onlyCone, 'right', TOP)?.do).toBe('refuse');
  });
});

describe('Restaurant: welche Wanne gemeint ist', () => {
  // Zwei Wannen eine Handbreit nebeneinander, wie in der Eisecke.
  const tubs = [
    { x: 0.52, z: 2.34 },
    { x: 0.52, z: 2.66 },
  ];

  test('immer genau eine — die, auf die man am geradesten schaut', () => {
    const origin = { x: 1.5, z: 2.5 };
    expect(pickTub(origin, { x: -1, z: -0.2 }, tubs)).toBe(0);
    expect(pickTub(origin, { x: -1, z: 0.2 }, tubs)).toBe(1);
  });

  test('schräg davor gewinnt die angeschaute, nicht die nähere', () => {
    // Die Figur steht vor der südlichen Wanne und schaut zur nördlichen.
    const origin = { x: 1.2, z: 2.8 };
    const look = { x: tubs[0]!.x - origin.x, z: tubs[0]!.z - origin.z };
    expect(pickTub(origin, look, tubs)).toBe(0);
    expect(Math.hypot(tubs[1]!.x - origin.x, tubs[1]!.z - origin.z)).toBeLessThan(
      Math.hypot(tubs[0]!.x - origin.x, tubs[0]!.z - origin.z),
    );
  });

  test('ohne Blickrichtung die nächste, außer Reichweite keine', () => {
    expect(pickTub({ x: 1.2, z: 2.9 }, { x: 0, z: 0 }, tubs)).toBe(1);
    expect(pickTub({ x: 7, z: 2 }, { x: -1, z: 0 }, tubs)).toBe(-1);
  });

  test('in der Brille: die Schale steckt in höchstens einer Wanne', () => {
    const boxes = tubs.map((t) => ({
      centre: { x: t.x, y: 0.54, z: t.z },
      half: { x: 0.15, y: 0.04, z: 0.2 },
    }));
    // Die Kästen überlappen sich in der Mitte — trotzdem nur eine.
    expect(tubUnder({ x: 0.5, y: 0.55, z: 2.49 }, boxes)).toBe(0);
    expect(tubUnder({ x: 0.5, y: 0.55, z: 2.52 }, boxes)).toBe(1);
    // Knapp über der Wanne zählt noch, darüber nicht mehr, daneben nicht.
    expect(tubUnder({ x: 0.5, y: 0.6, z: 2.34 }, boxes)).toBe(0);
    expect(tubUnder({ x: 0.5, y: 0.7, z: 2.34 }, boxes)).toBe(-1);
    expect(tubUnder({ x: 0.9, y: 0.55, z: 2.34 }, boxes)).toBe(-1);
  });

  test('über welchem Hörnchen der Portionierer ist', () => {
    const tops = [
      { x: 0, y: 1, z: 0 },
      { x: 0.5, y: 1, z: 0 },
    ];
    expect(coneUnder({ x: 0.02, y: 1.05, z: 0 }, tops)).toBe(0);
    expect(coneUnder({ x: 0.48, y: 1.04, z: 0 }, tops)).toBe(1);
    expect(coneUnder({ x: 0.25, y: 1.04, z: 0 }, tops)).toBe(-1);
  });
});

describe('Restaurant: wie das Eis bedient wird', () => {
  test('nehmen ist ein Griff, abgeben will in der Brille die gehaltene Greif-Taste', () => {
    expect(iceInteraction({ do: 'take-cone' }).kind).toBe('grab');
    expect(iceInteraction({ do: 'pick' }).kind).toBe('grab');
    const put = iceInteraction({ do: 'put' });
    expect(put.views?.vr?.inputs).toEqual(['grip', 'aimTrigger']);
    expect(put.views?.vr?.press).toBe('hold');
  });

  test('eintauchen ist ein Druck — in der Brille genügt die Berührung', () => {
    const fill = iceInteraction({ do: 'fill', flavor: 'vanilla' });
    expect(fill.kind).toBe('press');
    expect(fill.views).toBeUndefined();
    expect(INTERACTION_DEFAULTS.press.vr.inputs).toContain('handTouch');
  });

  test('Verben und Sätze', () => {
    expect(iceVerb({ do: 'take-cone' })).toBe('Hörnchen nehmen');
    expect(iceVerb({ do: 'scoop', flavor: 'strawberry' })).toBe('Kugel Erdbeere');
    expect(iceVerb({ do: 'refuse', why: 'x' })).toBeNull();
    expect(icePrompt({ do: 'fill', flavor: 'vanilla' })).toBe('Portionierer in Vanille tauchen');
  });

  test('zwei Sorten, zwei deutlich verschiedene Farben', () => {
    const [a, b] = [FLAVOR_COLORS.vanilla, FLAVOR_COLORS.strawberry];
    const channels = (c: number): number[] => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
    const diff = channels(a).reduce((sum, v, i) => sum + Math.abs(v - channels(b)[i]!), 0);
    expect(diff).toBeGreaterThan(120);
  });
});

describe('Restaurant: die Eisecke im Grundriss', () => {
  test('zwei Platten in der Küche, gesperrt und keine Küchenstation', () => {
    const blocked = blockedTiles();
    expect(blocked.has(`${ICE_STAND.x},${ICE_STAND.z}`)).toBe(true);
    expect(blocked.has(`${ICE_TUBS.x},${ICE_TUBS.z}`)).toBe(true);
    const stations = new Set(STATIONS.map((s) => `${s.x},${s.z}`));
    expect(stations.has(`${ICE_STAND.x},${ICE_STAND.z}`)).toBe(false);
    expect(stations.has(`${ICE_TUBS.x},${ICE_TUBS.z}`)).toBe(false);
  });

  test('eine gekaufte Station kommt nicht auf die Eisecke', () => {
    for (const spot of [ICE_STAND, ICE_TUBS]) {
      expect(spot.z).toBe(STATION_ROW.z);
      expect(placeCheck('grill', spot.x, spot.z, []).ok).toBe(false);
    }
  });

  // **„Ich sehe den Eisbereich überhaupt nicht"** — so kam die Eisecke an, als
  // sie an der Westwand stand (0 | 1, 0 | 2): am Rand des Bildes von oben, und
  // auf dem Telefon, dessen Bild gut vier Kacheln breit ist, außerhalb.
  test('neben dem Startplatz — schon im ersten Bild, auch auf dem Telefon', () => {
    for (const spot of [ICE_STAND, ICE_TUBS]) {
      expect(spot.z).toBe(SPAWN_TILE.z);
      expect(Math.abs(spot.x - SPAWN_TILE.x)).toBeLessThanOrEqual(2);
      expect(spot.x).toBeGreaterThanOrEqual(KITCHEN_AREA.x + 1);
      expect(spot.x).toBeLessThan(KITCHEN_AREA.x + KITCHEN_AREA.w - 1);
    }
    // Nebeneinander in einer Reihe, die Vorderseiten zum selben Gang.
    expect(Math.abs(ICE_STAND.x - ICE_TUBS.x) + Math.abs(ICE_STAND.z - ICE_TUBS.z)).toBe(1);
  });

  test('vor jeder Platte ist frei, und dorthin kommt man vom Start und in den Gastraum', () => {
    const plan = routePlan();
    const blocked = blockedTiles();
    const start = tileKey(SPAWN_TILE.x, SPAWN_TILE.z);
    for (const spot of [ICE_STAND, ICE_TUBS]) {
      const x = spot.x + dirX(ICE_FACE);
      const z = spot.z + dirZ(ICE_FACE);
      expect(blocked.has(`${x},${z}`)).toBe(false);
      const there = findPath(plan.graph, start, tileKey(x, z), { profile: HUMAN_PROFILE });
      expect(there.complete).toBe(true);
      // Und die Eisecke stellt den Weg aus der Küche in den Gastraum nicht zu.
      const out = findPath(
        plan.graph,
        tileKey(x, z),
        tileKey(Math.floor(DOOR_INSIDE.x), Math.floor(DOOR_INSIDE.z)),
        { profile: HUMAN_PROFILE },
      );
      expect(out.complete).toBe(true);
    }
  });
});

// --- Der Turm auf dem Hörnchen ---------------------------------------------------

const UP: Vec3 = { x: 0, y: 1, z: 0 };
const SPACING = 0.058;
/** Wie groß eine Kugel ist (ihr Durchmesser) — daran misst sich der Überhang. */
const SIZE = 0.08;

/** Einen Turm eine Zeit lang laufen lassen, mit einer Bahn für das Hörnchen. */
function run(
  count: number,
  seconds: number,
  fps: number,
  path: (t: number) => { base: Vec3; axis: Vec3 },
  from: WobbleState = NO_WOBBLE,
): WobbleState {
  let state = from;
  const dt = 1 / fps;
  const steps = Math.round(seconds * fps);
  for (let i = 1; i <= steps; i++) {
    const { base, axis } = path(i * dt);
    state = stepWobble(state, base, axis, count, SPACING, dt, SIZE);
  }
  return state;
}

const still = (): { base: Vec3; axis: Vec3 } => ({ base: { x: 0, y: 1, z: 0 }, axis: UP });

const walk =
  (speed: number, from = 0, until = Infinity) =>
  (t: number): { base: Vec3; axis: Vec3 } => ({
    base: { x: speed * (Math.min(until, Math.max(from, t)) - from), y: 1, z: 0 },
    axis: UP,
  });

/** Wie weit jede Kugel waagerecht über der darunter hängt (beim Gehen nach +x). */
function links(state: WobbleState): number[] {
  return state.balls.slice(1).map((b, i) => state.balls[i]!.x - b.x);
}

/** Wie weit jede Kugel von ihrem Platz auf der gezeigten Kugel darunter weg ist. */
function overhangs(state: WobbleState): number[] {
  const dir = state.dir!;
  return state.balls.slice(1).map((b, i) => {
    const below = state.balls[i]!;
    return Math.hypot(
      b.x - below.x - dir.x * SPACING,
      b.y - below.y - dir.y * SPACING,
      b.z - below.z - dir.z * SPACING,
    );
  });
}

/** Wie weit jede Kugel waagerecht hinter ihrem Platz im starren Turm hängt. */
function behind(state: WobbleState, base: Vec3): number[] {
  const rest = restTower(base, UP, state.balls.length, SPACING);
  return state.balls.map((b, i) => rest[i]!.x - b.x);
}

describe('Restaurant: der Turm auf dem Hörnchen', () => {
  test('in Ruhe steht er gerade, Kugel auf Kugel', () => {
    const state = run(5, 1, 60, still);
    const rest = restTower({ x: 0, y: 1, z: 0 }, UP, 5, SPACING);
    state.balls.forEach((b, i) => {
      expect(b.x).toBeCloseTo(rest[i]!.x, 6);
      expect(b.y).toBeCloseTo(rest[i]!.y, 6);
    });
  });

  test('die unterste Kugel sitzt genau im Hörnchen, auch in voller Fahrt', () => {
    let state = run(6, 0.5, 60, still);
    const path = (t: number): { base: Vec3; axis: Vec3 } => ({
      base: { x: Math.sin(7 * t), y: 1 + 0.3 * Math.cos(5 * t), z: 0.5 * t },
      axis: { x: 0.3 * Math.sin(3 * t), y: 1, z: 0 },
    });
    for (let i = 1; i <= 120; i++) {
      const { base, axis } = path(i / 60);
      state = stepWobble(state, base, axis, 6, SPACING, 1 / 60);
      expect(state.balls[0]).toEqual(base);
    }
  });

  test('beim gleichmäßigen Gehen biegt er sich — die Verspätung wächst schneller als die Höhe', () => {
    // 0,3 m/s, lange genug, dass sich die Form eingestellt hat.
    const moving = run(6, 3, 60, walk(0.3), run(6, 1, 60, still));
    const lag = behind(moving, walk(0.3)(3).base);
    expect(lag[0]).toBe(0);
    // Jede Kugel weiter zurück als die darunter …
    for (let i = 1; i < lag.length; i++) expect(lag[i]!).toBeGreaterThan(lag[i - 1]!);
    // … und nicht auf einer Geraden, sondern gebogen: Jeder Schritt nach oben
    // bringt mehr Verspätung als der davor.
    for (let i = 2; i < lag.length; i++) {
      expect(lag[i]! - lag[i - 1]!).toBeGreaterThan(1.2 * (lag[i - 1]! - lag[i - 2]!));
    }
    // Wie gerechnet: Glied i hängt um v · followTime über, weich begrenzt.
    let sum = 0;
    for (let i = 1; i < lag.length; i++) {
      const limit = leanLimit(i, 6);
      sum += softLean({ x: 0.3 * followTime(limit), y: 0, z: 0 }, limit * SIZE).x;
      expect(lag[i]!).toBeCloseTo(sum, 5);
    }
    expect(lag[5]!).toBeGreaterThan(0.015);
  });

  test('die Grenze wächst nach oben wie 1/x: die oberste 0,9 Kugelgrößen, darunter weniger', () => {
    // Fünf Kugeln, oberste Stelle 4: 0,9/4, 0,9/3, 0,9/2, 0,9/1.
    expect([0, 1, 2, 3, 4].map((k) => leanLimit(k, 5))).toEqual([0, 0.225, 0.3, 0.45, 0.9]);
    // Die unterste sitzt fest, die oberste darf immer 0,9 — egal wie hoch.
    for (const count of [1, 2, 3, 10, 60]) {
      expect(leanLimit(0, count)).toBe(0);
      if (count > 1) expect(leanLimit(count - 1, count)).toBeCloseTo(WOBBLE.lean, 12);
      for (let k = 2; k < count; k++) {
        expect(leanLimit(k, count)).toBeGreaterThan(leanLimit(k - 1, count));
      }
    }
    expect(WOBBLE.lean).toBe(0.9);
  });

  test('im vollen Gehtempo: oben fast 0,9 Kugelgrößen, darunter immer weniger — nie über der Grenze', () => {
    for (const count of [5, 20]) {
      // 2,6 m/s, so schnell wie die Figur geht.
      const moving = run(count, 3, 60, walk(2.6), run(count, 1, 60, still));
      const over = links(moving);
      // Jedes Glied hängt weiter über als das darunter, und keines erreicht
      // seine Grenze …
      over.forEach((o, i) => {
        expect(o).toBeLessThan(leanLimit(i + 1, count) * SIZE);
        if (i > 0) expect(o).toBeGreaterThan(over[i - 1]!);
      });
      // … die oberste kommt ihr aber nahe — auch schon bei fünf Kugeln.
      expect(over[over.length - 1]!).toBeGreaterThan(0.7 * WOBBLE.lean * SIZE);
      // Und die darunter stehen im selben Verhältnis zu ihrer Grenze.
      over.forEach((o, i) => {
        expect(o).toBeGreaterThan(0.7 * leanLimit(i + 1, count) * SIZE);
      });
      // Nicht linear, sondern wie das obere Ende einer S-Kurve: Nach oben
      // wird jeder Schritt größer als der davor.
      const top = over.slice(-4);
      for (let i = 2; i < top.length; i++) {
        expect(top[i]! - top[i - 1]!).toBeGreaterThan(top[i - 1]! - top[i - 2]!);
      }
    }
  });

  test('auch langsam, mit der Hand in der Brille, biegt er sich sichtbar', () => {
    for (const count of [3, 5]) {
      // 0,5 m/s — ein ruhiger Schwenk mit der Hand.
      const moving = run(count, 2, 72, walk(0.5), run(count, 1, 72, still));
      const over = links(moving);
      // Die oberste hängt gut 1,5 cm über der darunter …
      expect(over[over.length - 1]!).toBeGreaterThan(0.015);
      // … und die Spitze über 2 cm hinter dem starren Turm.
      const lag = behind(moving, walk(0.5)(2).base);
      expect(lag[lag.length - 1]!).toBeGreaterThan(0.02);
      for (let i = 1; i < over.length; i++) expect(over[i]!).toBeGreaterThan(over[i - 1]!);
    }
  });

  test('der weiche Überhang wächst streng und bleibt unter der Grenze', () => {
    let last = 0;
    for (const r of [1e-4, 0.001, 0.01, 0.05, 0.1, 0.2]) {
      const soft = softLean({ x: r, y: 0, z: 0 }, 0.072).x;
      expect(soft).toBeGreaterThan(last);
      expect(soft).toBeLessThan(0.072);
      expect(soft).toBeLessThanOrEqual(r);
      last = soft;
    }
    expect(softLean({ x: 1000, y: 0, z: 0 }, 0.072).x).toBeLessThanOrEqual(0.072);
    expect(softLean({ x: 0, y: 0, z: 0 }, 0.072)).toEqual({ x: 0, y: 0, z: 0 });
    expect(softLean({ x: 0.01, y: 0, z: 0 }, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('nach dem Anhalten: jede Kugel schwingt genau einmal hinüber und kommt zurück', () => {
    for (const count of [3, 5, 10, 20]) {
      for (const speed of [2.6, 1.5, -0.5]) {
        let state = run(count, 2, 120, walk(speed), run(count, 1, 120, still));
        const base = walk(speed)(2).base;
        // Wie weit jede Kugel vor dem Anhalten zurückhing — entgegen dem Gehen.
        const before = behind(state, base).map((d) => d * Math.sign(speed));
        const side = before.map(() => 1);
        const crossed = before.map(() => 0);
        const over = before.map(() => 0);
        const again = before.map(() => 0);
        for (let k = 1; k <= 240; k++) {
          state = stepWobble(state, base, UP, count, SPACING, 1 / 120, SIZE);
          behind(state, base).forEach((raw, i) => {
            const d = raw * Math.sign(speed);
            // Nie herunter, auch nicht beim Zurückschwingen.
            if (d * side[i]! < -1e-9) {
              side[i] = -side[i]!;
              crossed[i]!++;
            }
            if (crossed[i] === 1) over[i] = Math.max(over[i]!, -d);
            if (crossed[i]! >= 2) again[i] = Math.max(again[i]!, d);
          });
          overhangs(state).forEach((o, i) => {
            expect(o).toBeLessThan(leanLimit(i + 1, count) * SIZE);
          });
        }
        before.forEach((b, i) => {
          if (i === 0) return;
          // Genau einmal über den Platz hinaus — kein zweites Mal …
          expect(crossed[i]).toBe(1);
          // … sichtbar, aber mäßig: zwischen 10 und 40 % des Überhangs davor …
          expect(over[i]! / b).toBeGreaterThan(0.1);
          expect(over[i]! / b).toBeLessThan(0.4);
          // … und keine zweite Welle.
          expect(again[i]!).toBeLessThan(Math.min(0.001, 0.05 * b));
        });
        // Nach zwei Sekunden steht er.
        for (const lag of wobbleLag(state, base, UP, SPACING)) expect(lag).toBeLessThan(1e-4);
      }
    }
  });

  test('ein Glied nach dem Anhalten: genau die Form (1 + T − b·T²)·e^(−T)', () => {
    const limit = WOBBLE.lean;
    const a = followRate(limit);
    const b = WOBBLE.rebound;
    // Lange genug mit 1 m/s nach +x, bis es eingeschwungen ist …
    let link: WobbleLink = {
      settle: { x: 0, y: 0, z: 0 },
      speed: { x: 0, y: 0, z: 0 },
      accel: { x: 0, y: 0, z: 0 },
    };
    for (let k = 1; k <= 400; k++) {
      link = followBall(
        limit,
        { x: k / 100, y: 0, z: 0 },
        { x: (k - 1) / 100, y: 0, z: 0 },
        link,
        0.01,
      );
    }
    const U = linkLean(link, limit).x;
    expect(U).toBeCloseTo(-followTime(limit), 9);
    // … dann still: die gezeigte Form, geschlossen.
    const here: Vec3 = { x: 4, y: 0, z: 0 };
    let deepest = 0;
    for (let k = 1; k <= 200; k++) {
      link = followBall(limit, here, here, link, 0.005);
      const T = a * k * 0.005;
      const x = linkLean(link, limit).x;
      expect(x).toBeCloseTo(U * (1 + T - b * T * T) * Math.exp(-T), 9);
      deepest = Math.max(deepest, x / -U);
    }
    // Am weitesten drüben: (1 + 4b)·e^(−2 − 1/b) des Überhangs davor.
    expect(deepest).toBeCloseTo((1 + 4 * b) * Math.exp(-2 - 1 / b), 3);
    expect(deepest).toBeGreaterThan(0.1);
    expect(deepest).toBeLessThan(0.25);
  });

  test('flink: nach dem Anhalten aus vollem Gehtempo stehen fünf und zehn Kugeln in einer halben Sekunde', () => {
    for (const count of [5, 10]) {
      let state = run(count, 3, 60, walk(2.6), run(count, 1, 60, still));
      const base = walk(2.6)(3).base;
      expect(Math.max(...wobbleLag(state, base, UP, SPACING))).toBeGreaterThan(0.1);
      state = run(count, 0.5, 120, () => ({ base, axis: UP }), state);
      for (const lag of wobbleLag(state, base, UP, SPACING)) expect(lag).toBeLessThan(0.001);
    }
  });

  test('Anhalten aus dem Gehen: die unteren schwingen zuerst, die oberen danach', () => {
    let state = run(6, 3, 60, walk(2.6), run(6, 1, 60, still));
    const base = walk(2.6)(3).base;
    // Wann ist jedes Glied am weitesten auf der anderen Seite?
    const most = Array<number>(5).fill(0);
    const when = Array<number>(5).fill(0);
    for (let k = 1; k <= 480; k++) {
      state = stepWobble(state, base, UP, 6, SPACING, 1 / 480, SIZE);
      links(state).forEach((l, i) => {
        if (-l > most[i]!) {
          most[i] = -l;
          when[i] = k / 480;
        }
      });
    }
    // Je höher das Glied, desto später — und alle innerhalb einer Viertelsekunde.
    for (let i = 1; i < 5; i++) expect(when[i]!).toBeGreaterThan(when[i - 1]!);
    expect(when[0]!).toBeGreaterThan(0.05);
    expect(when[4]!).toBeLessThan(0.25);
  });

  test('zitternde Hand: kein Aufschaukeln, und danach steht er gleich', () => {
    let seed = 3;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647 - 0.5;
    };
    let state = run(8, 1, 72, still);
    let base: Vec3 = { x: 0, y: 1, z: 0 };
    let biggest = 0;
    for (let i = 0; i < 720; i++) {
      // Fünf Sekunden Zittern um ein paar Millimeter je Bild, in jede Richtung.
      base = { x: random() * 0.01, y: 1 + random() * 0.01, z: random() * 0.01 };
      state = stepWobble(state, base, UP, 8, SPACING, 1 / 72, SIZE);
      biggest = Math.max(biggest, ...wobbleLag(state, base, UP, SPACING));
    }
    // Die Spitze wackelt mit, aber nicht mehr als ein paar Zentimeter …
    expect(biggest).toBeLessThan(0.05);
    // … und hört die Hand auf, steht er nach einer halben Sekunde.
    state = run(8, 0.5, 72, () => ({ base, axis: UP }), state);
    for (const lag of wobbleLag(state, base, UP, SPACING)) expect(lag).toBeLessThan(0.001);
  });

  test('schräg gehalten neigt er sich in dieselbe Richtung — und fällt nicht', () => {
    let state = run(6, 1, 60, still);
    const tilt = { x: Math.sin(1), y: Math.cos(1), z: 0 }; // gut 57° nach +x
    const top = (s: WobbleState): Vec3 => s.balls[s.balls.length - 1]!;
    let soon = 0;
    let lastX = top(state).x;
    for (let k = 1; k <= 120; k++) {
      state = stepWobble(state, { x: 0, y: 1, z: 0 }, tilt, 6, SPACING, 1 / 60, SIZE);
      // Die Spitze wandert nur in eine Richtung — kein Zurückpendeln.
      expect(top(state).x).toBeGreaterThanOrEqual(lastX - 1e-12);
      lastX = top(state).x;
      if (k === 2) soon = lastX;
    }
    // Gleich danach steht die Spitze noch fast über dem Hörnchen …
    expect(soon).toBeLessThan(lastX * 0.6);
    // … später lehnt sie in Richtung der Neigung, sogar etwas darüber hinaus.
    expect(lastX).toBeGreaterThan(5 * SPACING * Math.sin(1));
    // Und jede Kugel sitzt weiter auf der unter ihr.
    overhangs(state).forEach((o, i) => expect(o).toBeLessThan(leanLimit(i + 1, 6) * SIZE));
  });

  test('fällt nie herunter, auch nicht beim wilden Schütteln — jede Kugel unter ihrer Grenze', () => {
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647 - 0.5;
    };
    let state: WobbleState = NO_WOBBLE;
    let base: Vec3 = { x: 0, y: 1, z: 0 };
    for (let i = 0; i < 600; i++) {
      // Ruckler bis zu 30 cm je Bild, Achse in jede Richtung, auch kopfüber.
      base = { x: base.x + random() * 0.6, y: base.y + random() * 0.6, z: base.z + random() * 0.6 };
      const axis = { x: random(), y: random(), z: random() };
      const dt = i % 50 === 0 ? 0.5 : 1 / 72;
      state = stepWobble(state, base, axis, 12, SPACING, dt, SIZE);
      expect(state.balls.length).toBe(12);
      expect(state.balls[0]).toEqual(base);
      state.balls.forEach((b) => expect(Number.isFinite(b.x + b.y + b.z)).toBe(true));
      overhangs(state).forEach((o, j) => {
        expect(o).toBeLessThan(leanLimit(j + 1, 12) * SIZE);
      });
    }
  });

  test('eine neue Kugel oben lässt den Turm darunter nicht springen', () => {
    // Im vollen Gehtempo, alle Kugeln weit übergehängt — dann kommt eine dazu.
    let state = run(6, 2, 60, walk(2.6), run(6, 1, 60, still));
    const shape = (s: WobbleState): Vec3[] =>
      s.balls.map((b) => ({
        x: b.x - s.balls[0]!.x,
        y: b.y - s.balls[0]!.y,
        z: b.z - s.balls[0]!.z,
      }));
    let t = 2;
    let last = shape(state);
    let steady = 0;
    let biggest = 0;
    for (let k = 1; k <= 60; k++) {
      t += 1 / 60;
      const count = k <= 10 ? 6 : 7;
      state = stepWobble(state, walk(2.6)(t).base, UP, count, SPACING, 1 / 60, SIZE);
      const now = shape(state);
      // Wie weit sich jede alte Kugel (gegen das Hörnchen) in diesem Bild bewegt.
      const moved = Math.max(
        ...last.map((p, i) => Math.hypot(now[i]!.x - p.x, now[i]!.y - p.y, now[i]!.z - p.z)),
      );
      if (k <= 10) steady = Math.max(steady, moved);
      else biggest = Math.max(biggest, moved);
      last = now.slice(0, 6);
      // Und auch während des Übergangs keine über der größeren der beiden Grenzen.
      overhangs(state).forEach((o, i) => {
        expect(o).toBeLessThan(Math.max(leanLimit(i + 1, 6), leanLimit(i + 1, 7)) * SIZE);
      });
    }
    // Vorher steht die Form still; nach der neuen Kugel zieht sie nach, aber
    // in kleinen Schritten — keine Kugel springt mehr als 1 cm in einem Bild.
    expect(steady).toBeLessThan(1e-6);
    expect(biggest).toBeGreaterThan(0);
    expect(biggest).toBeLessThan(0.01);
  });

  test('30 oder 144 Bilder je Sekunde ergeben denselben Turm', () => {
    const wave = (t: number): { base: Vec3; axis: Vec3 } => ({
      base: { x: 0.3 * Math.sin(3 * t), y: 1 + 0.05 * Math.sin(5 * t), z: 0.2 * Math.cos(2 * t) },
      axis: { x: 0.4 * Math.sin(2 * t), y: 1, z: 0 },
    });
    const slow = run(8, 2, 30, wave);
    const fast = run(8, 2, 144, wave);
    slow.balls.forEach((b, i) => {
      const f = fast.balls[i]!;
      expect(Math.hypot(b.x - f.x, b.y - f.y, b.z - f.z)).toBeLessThan(0.001);
    });
  });

  test('ohne Obergrenze: auch fünfzig Kugeln stehen ruhig und folgen', () => {
    const state = run(50, 3, 60, still);
    expect(state.balls.length).toBe(50);
    for (const lag of wobbleLag(state, { x: 0, y: 1, z: 0 }, UP, SPACING)) {
      expect(lag).toBeLessThan(1e-4);
    }
    // Im Gehen bleibt jede unter ihrer Grenze …
    const moved = run(50, 1, 60, walk(2.6), state);
    overhangs(moved).forEach((o, i) => expect(o).toBeLessThan(leanLimit(i + 1, 50) * SIZE));
    // … und nach dem Anhalten steht er bald wieder gerade.
    const base = walk(2.6)(1).base;
    const after = run(50, 5, 60, () => ({ base, axis: UP }), moved);
    for (const lag of wobbleLag(after, base, UP, SPACING)) expect(lag).toBeLessThan(1e-4);
  });

  test('neue Kugeln erscheinen oben auf dem Turm, überzählige fallen weg', () => {
    const three = run(3, 0.5, 60, still);
    const four = stepWobble(three, { x: 0, y: 1, z: 0 }, UP, 4, SPACING, 0);
    expect(four.balls.length).toBe(4);
    expect(four.balls[3]!.y).toBeCloseTo(1 + 3 * SPACING, 6);
    expect(stepWobble(four, { x: 0, y: 1, z: 0 }, UP, 2, SPACING, 1 / 60).balls.length).toBe(2);
  });

  test('die Verzögerung ist geschlossen gelöst: ein langer Schritt ist gleich vielen kurzen', () => {
    const a: Vec3 = { x: 0, y: 1, z: 0 };
    const b: Vec3 = { x: 0.2, y: 1.1, z: -0.1 };
    const at = (t: number): Vec3 => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    });
    const start: WobbleLink = {
      settle: { x: -0.05, y: 0, z: 0.02 },
      speed: { x: 0.3, y: -0.1, z: 0 },
      accel: { x: -2, y: 1, z: 3 },
    };
    const once = followBall(0.45, b, a, start, 0.1);
    let p = start;
    for (let k = 1; k <= 10; k++) p = followBall(0.45, at(k / 10), at((k - 1) / 10), p, 0.01);
    for (const key of ['settle', 'speed', 'accel'] as const) {
      expect(p[key].x).toBeCloseTo(once[key].x, 9);
      expect(p[key].y).toBeCloseTo(once[key].y, 9);
      expect(p[key].z).toBeCloseTo(once[key].z, 9);
    }
    // Die unterste folgt ohne Verzug, und nach oben hängt jede weiter und ist träger.
    expect(linkLean(followBall(0, b, a, start, 0.01), 0)).toEqual({ x: 0, y: 0, z: 0 });
    for (let k = 2; k < 60; k++) {
      expect(followTime(leanLimit(k, 60))).toBeGreaterThan(followTime(leanLimit(k - 1, 60)));
      expect(followRate(leanLimit(k, 60))).toBeLessThan(followRate(leanLimit(k - 1, 60)));
    }
    // Auch mit riesigem Schritt: am Ziel, nicht darüber hinaus.
    const far = linkLean(followBall(0.9, b, b, start, 100), 0.9);
    expect(Math.hypot(far.x, far.y, far.z)).toBeLessThan(1e-9);
  });

  test('die Neigung dreht um einen Anteil des Winkels — zweimal halb ist einmal ganz', () => {
    const tilt = { x: 1, y: 0.2, z: 0.3 };
    const share = 1 - Math.exp(-0.1 / WOBBLE.tilt);
    const half = 1 - Math.exp(-0.05 / WOBBLE.tilt);
    const once = turnToward(UP, tilt, share);
    const twice = turnToward(turnToward(UP, tilt, half), tilt, half);
    expect(once.x).toBeCloseTo(twice.x, 10);
    expect(once.y).toBeCloseTo(twice.y, 10);
    expect(once.z).toBeCloseTo(twice.z, 10);
    // Auch genau kopfüber findet sie einen Weg und bleibt eine Richtung.
    const flip = turnToward(UP, { x: 0, y: -1, z: 0 }, 0.5);
    expect(Math.hypot(flip.x, flip.y, flip.z)).toBeCloseTo(1, 10);
    expect(flip.y).toBeCloseTo(0, 6);
  });
});
