import { INTERACTION_DEFAULTS } from '../../core/interaction';
import { STATION_ROW, placeCheck } from './plateUpShop';
import { ICE_STAND, ICE_TUBS, STATIONS, blockedTiles } from './plateUpPlan';
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
  restTower,
  spring,
  stepWobble,
  turnToward,
  wobbleLag,
  type Vec3,
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
  test('zwei Platten neben dem Kühlschrank, gesperrt und keine Küchenstation', () => {
    const blocked = blockedTiles();
    expect(blocked.has(`${ICE_STAND.x},${ICE_STAND.z}`)).toBe(true);
    expect(blocked.has(`${ICE_TUBS.x},${ICE_TUBS.z}`)).toBe(true);
    const stations = new Set(STATIONS.map((s) => `${s.x},${s.z}`));
    expect(stations.has(`${ICE_STAND.x},${ICE_STAND.z}`)).toBe(false);
    expect(stations.has(`${ICE_TUBS.x},${ICE_TUBS.z}`)).toBe(false);
  });

  test('eine gekaufte Station kommt nicht auf die Eiswannen', () => {
    expect(ICE_TUBS.z).toBe(STATION_ROW.z);
    expect(placeCheck('grill', ICE_TUBS.x, ICE_TUBS.z, []).ok).toBe(false);
  });
});

// --- Der wackelige Turm ---------------------------------------------------------

const UP: Vec3 = { x: 0, y: 1, z: 0 };
const SPACING = 0.058;

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
    state = stepWobble(state, base, axis, count, SPACING, dt);
  }
  return state;
}

const still = (): { base: Vec3; axis: Vec3 } => ({ base: { x: 0, y: 1, z: 0 }, axis: UP });

describe('Restaurant: der Turm auf dem Hörnchen', () => {
  test('in Ruhe steht er gerade, Kugel auf Kugel', () => {
    const state = run(5, 1, 60, still);
    const rest = restTower({ x: 0, y: 1, z: 0 }, UP, 5, SPACING);
    state.balls.forEach((b, i) => {
      expect(b.p.x).toBeCloseTo(rest[i]!.x, 6);
      expect(b.p.y).toBeCloseTo(rest[i]!.y, 6);
    });
  });

  test('die oberen Kugeln bleiben beim Losgehen weiter zurück als die unteren', () => {
    const settled = run(6, 1, 60, still);
    // Ein Ruck nach +x mit 1,5 m/s — und nach einer Zehntelsekunde nachgesehen.
    const walk = (t: number): { base: Vec3; axis: Vec3 } => ({
      base: { x: 1.5 * t, y: 1, z: 0 },
      axis: UP,
    });
    const moving = run(6, 0.1, 60, walk, settled);
    const base = walk(0.1).base;
    const rest = restTower(base, UP, 6, SPACING);
    const behind = moving.balls.map((b, i) => rest[i]!.x - b.p.x);
    for (let i = 1; i < behind.length; i++) expect(behind[i]!).toBeGreaterThan(behind[i - 1]!);
    expect(behind[5]!).toBeGreaterThan(0.005);
    // Bleibt man stehen, steht er wieder gerade.
    const after = run(6, 3, 60, () => ({ base, axis: UP }), moving);
    for (const lag of wobbleLag(after, base, UP, SPACING)) expect(lag).toBeLessThan(1e-4);
  });

  test('schräg gehalten neigt er sich langsam in dieselbe Richtung — und fällt nicht', () => {
    const settled = run(6, 1, 60, still);
    const tilt = { x: Math.sin(1), y: Math.cos(1), z: 0 }; // gut 57° nach +x
    const hold = (): { base: Vec3; axis: Vec3 } => ({ base: { x: 0, y: 1, z: 0 }, axis: tilt });
    const soon = run(6, 1 / 30, 60, hold, settled);
    const later = run(6, 2, 60, hold, settled);
    const top = (s: WobbleState): Vec3 => s.balls[s.balls.length - 1]!.p;
    // Gleich danach steht die Spitze noch fast über dem Hörnchen …
    expect(top(soon).x).toBeLessThan(top(later).x * 0.6);
    // … später lehnt sie in Richtung der Neigung, sogar etwas darüber hinaus.
    expect(top(later).x).toBeGreaterThan(5 * SPACING * Math.sin(1));
    // Und jede Kugel sitzt weiter auf der unter ihr.
    for (let i = 1; i < later.balls.length; i++) {
      const a = later.balls[i - 1]!.p;
      const b = later.balls[i]!.p;
      const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      expect(d).toBeLessThan(SPACING * (1 + WOBBLE.lean) + 1e-9);
    }
  });

  test('fällt nie herunter, auch nicht beim wilden Schütteln', () => {
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
      state = stepWobble(state, base, axis, 12, SPACING, dt);
      state.balls.forEach((b, j) => {
        expect(Number.isFinite(b.p.x + b.p.y + b.p.z + b.v.x + b.v.y + b.v.z)).toBe(true);
        const below = j === 0 ? base : state.balls[j - 1]!.p;
        const d = Math.hypot(b.p.x - below.x, b.p.y - below.y, b.p.z - below.z);
        const most = j === 0 ? WOBBLE.lean * SPACING : SPACING * (1 + WOBBLE.lean);
        expect(d).toBeLessThanOrEqual(most + 1e-9);
      });
    }
  });

  test('30 oder 144 Bilder je Sekunde ergeben denselben Turm', () => {
    const wave = (t: number): { base: Vec3; axis: Vec3 } => ({
      base: { x: 0.3 * Math.sin(3 * t), y: 1 + 0.05 * Math.sin(5 * t), z: 0.2 * Math.cos(2 * t) },
      axis: { x: 0.4 * Math.sin(2 * t), y: 1, z: 0 },
    });
    const slow = run(8, 2, 30, wave);
    const fast = run(8, 2, 144, wave);
    slow.balls.forEach((b, i) => {
      const f = fast.balls[i]!.p;
      expect(Math.hypot(b.p.x - f.x, b.p.y - f.y, b.p.z - f.z)).toBeLessThan(0.003);
    });
  });

  test('ohne Obergrenze: auch fünfzig Kugeln stehen ruhig', () => {
    const state = run(50, 3, 60, still);
    expect(state.balls.length).toBe(50);
    for (const lag of wobbleLag(state, { x: 0, y: 1, z: 0 }, UP, SPACING)) {
      expect(lag).toBeLessThan(1e-4);
    }
  });

  test('neue Kugeln erscheinen oben auf dem Turm, überzählige fallen weg', () => {
    const three = run(3, 0.5, 60, still);
    const four = stepWobble(three, { x: 0, y: 1, z: 0 }, UP, 4, SPACING, 0);
    expect(four.balls.length).toBe(4);
    expect(four.balls[3]!.p.y).toBeCloseTo(1 + 3 * SPACING, 6);
    expect(stepWobble(four, { x: 0, y: 1, z: 0 }, UP, 2, SPACING, 1 / 60).balls.length).toBe(2);
  });

  test('die Feder ist geschlossen gelöst: ein langer Schritt ist gleich vielen kurzen', () => {
    const [x1, v1] = spring(0.1, 0, 20, 0.5, 0.1);
    let x = 0.1;
    let v = 0;
    for (let i = 0; i < 10; i++) [x, v] = spring(x, v, 20, 0.5, 0.01);
    expect(x).toBeCloseTo(x1, 10);
    expect(v).toBeCloseTo(v1, 8);
    // Und sie klingt ab, auch mit riesigem Schritt.
    expect(Math.abs(spring(0.1, 5, 20, 0.5, 100)[0])).toBeLessThan(1e-9);
    expect(Math.abs(spring(0.1, 5, 20, 1, 100)[0])).toBeLessThan(1e-9);
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
