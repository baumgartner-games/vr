import {
  flightCommand,
  FULL_HEAD_PITCH,
  FULL_HEAD_YAW,
  FULL_LEAN,
  type FlightInput,
} from './supermanFlight';
import {
  clampSuperman,
  clampSupermanField,
  DEFAULT_SUPERMAN,
  nextSupermanSource,
  nextSupermanStep,
  SUPERMAN_FIELDS,
  type SupermanSettings,
} from './supermanSettings';

const still: FlightInput = { ahead: 0, lift: 0, side: 0, headPitch: 0, headYaw: 0 };
const settings = (over: Partial<SupermanSettings> = {}): SupermanSettings =>
  clampSuperman({ ...DEFAULT_SUPERMAN, ...over });

/** Volle Lehne einer Achse: Totzone plus die Strecke bis Vollausschlag. */
const full = (s: SupermanSettings): number => s.deadzone / 100 + FULL_LEAN;

describe('flightCommand', () => {
  it('stands still in the middle', () => {
    expect(flightCommand(still, settings())).toEqual({ ahead: 0, lift: 0, side: 0, turn: 0 });
  });

  it('ignores a lean inside the deadzone', () => {
    const s = settings();
    const command = flightCommand({ ...still, ahead: s.deadzone / 100 - 0.005 }, s);
    expect(command.ahead).toBe(0);
  });

  it('reaches the set speed at full lean, not somewhere past an outstretched arm', () => {
    const s = settings({ forward: 12 });
    expect(flightCommand({ ...still, ahead: full(s) }, s).ahead).toBeCloseTo(12);
    // Und weiter lehnen gibt nicht mehr.
    expect(flightCommand({ ...still, ahead: full(s) + 0.5 }, s).ahead).toBeCloseTo(12);
  });

  it('has its own number for every direction', () => {
    const s = settings({ forward: 12, back: 3, up: 8, down: 2 });
    expect(flightCommand({ ...still, ahead: full(s) }, s).ahead).toBeCloseTo(12);
    expect(flightCommand({ ...still, ahead: -full(s) }, s).ahead).toBeCloseTo(-3);
    expect(flightCommand({ ...still, lift: full(s) }, s).lift).toBeCloseTo(8);
    expect(flightCommand({ ...still, lift: -full(s) }, s).lift).toBeCloseTo(-2);
  });

  it('lets the head fly an axis instead of the hand', () => {
    const s = settings({ lift: 'kopf', up: 10 });
    // Die Hand hebt jetzt nichts mehr …
    expect(flightCommand({ ...still, lift: full(s) }, s).lift).toBe(0);
    // … der Blick nach oben dagegen schon.
    expect(flightCommand({ ...still, headPitch: FULL_HEAD_PITCH }, s).lift).toBeCloseTo(10);
  });

  it('dives forward when the head drives and the eyes go down', () => {
    const s = settings({ drive: 'kopf', forward: 20 });
    expect(flightCommand({ ...still, headPitch: -FULL_HEAD_PITCH }, s).ahead).toBeCloseTo(20);
    expect(flightCommand({ ...still, headPitch: FULL_HEAD_PITCH }, s).ahead).toBeCloseTo(-s.back);
  });

  it('switches an axis off entirely', () => {
    const s = settings({ drive: 'aus' });
    expect(flightCommand({ ...still, ahead: full(s) }, s).ahead).toBe(0);
  });

  it('adds hand and head on "beide" without going past full', () => {
    const s = settings({ lift: 'beide', up: 10 });
    const command = flightCommand({ ...still, lift: full(s), headPitch: FULL_HEAD_PITCH }, s);
    expect(command.lift).toBeCloseTo(10);
  });

  it('turns left when the hand leans left', () => {
    const s = settings({ yaw: 'hand', turn: 90 });
    expect(flightCommand({ ...still, side: -full(s) }, s).turn).toBeCloseTo(90);
    expect(flightCommand({ ...still, side: full(s) }, s).turn).toBeCloseTo(-90);
  });

  it('lets the head pull the curve only while there is speed', () => {
    const s = settings({ yaw: 'kopf', turn: 90, forward: 10 });
    const hovering = flightCommand({ ...still, headYaw: FULL_HEAD_YAW }, s);
    expect(hovering.turn).toBe(0);
    const flying = flightCommand({ ...still, ahead: full(s), headYaw: FULL_HEAD_YAW }, s);
    expect(flying.turn).toBeCloseTo(90);
  });

  it('slides sideways instead of turning once the hand is set to push', () => {
    const s = settings({ strafe: true, side: 7, yaw: 'hand' });
    const command = flightCommand({ ...still, side: full(s) }, s);
    expect(command.side).toBeCloseTo(7);
    expect(command.turn).toBe(0);
  });

  it('keeps the head steering while the hand pushes sideways', () => {
    const s = settings({ strafe: true, yaw: 'beide', turn: 60 });
    const command = flightCommand(
      { ...still, ahead: full(s), side: full(s), headYaw: FULL_HEAD_YAW },
      s,
    );
    expect(command.turn).toBeCloseTo(60);
  });
});

describe('clampSuperman', () => {
  it('fills in every field a code did not carry', () => {
    expect(clampSuperman({})).toEqual(DEFAULT_SUPERMAN);
    expect(clampSuperman(undefined)).toEqual(DEFAULT_SUPERMAN);
  });

  it('reads a zero as "was not in there", not as "stand still"', () => {
    for (const field of SUPERMAN_FIELDS) {
      expect(clampSupermanField(field, 0)).toBe(DEFAULT_SUPERMAN[field.key]);
      expect(clampSupermanField(field, Number.NaN)).toBe(DEFAULT_SUPERMAN[field.key]);
    }
  });

  it('keeps every number inside its range', () => {
    for (const field of SUPERMAN_FIELDS) {
      expect(clampSupermanField(field, 1e6)).toBe(field.max);
      expect(clampSupermanField(field, field.min / 2)).toBe(field.min);
    }
  });

  it('refuses a source that is not one of the four', () => {
    const broken = clampSuperman({ yaw: 'kopfstand' as never });
    expect(broken.yaw).toBe(DEFAULT_SUPERMAN.yaw);
  });

  it('steps to the next notch and wraps at the top', () => {
    const field = SUPERMAN_FIELDS[0]!;
    expect(nextSupermanStep(field, field.steps[0]!)).toBe(field.steps[1]);
    expect(nextSupermanStep(field, field.steps.at(-1)!)).toBe(field.steps[0]);
  });

  it('walks the four sources in a circle', () => {
    expect(nextSupermanSource('hand')).toBe('kopf');
    expect(nextSupermanSource('kopf')).toBe('beide');
    expect(nextSupermanSource('beide')).toBe('aus');
    expect(nextSupermanSource('aus')).toBe('hand');
  });
});
