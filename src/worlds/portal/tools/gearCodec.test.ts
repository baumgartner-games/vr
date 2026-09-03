import { packCode, unpackCode } from '../../../core/configCode';
import { DEFAULT_WEAPON } from './weaponSettings';
import { DEFAULT_DRONE } from './droneSettings';
import { readGear, writeGear, type GearData } from './gearCodec';

/** A configuration of the size the game actually produces. */
const CONFIG: GearData = {
  tools: {
    pistol: [0, -1.2, 3, -12, 0, 0],
    xray: [0, 2, -2, 0, 0, 0],
    'gun-blue': [0.5, -1.2, 3, -8, 2, 0],
  },
  hands: {
    idle: {
      left: [0, 0, 0, 0, 0, 0, 0.1, 0.08, 0.08, 0.1, 0.12, 0],
      right: [0, 0, 0, 0, 0, 0, 0.1, 0.08, 0.08, 0.1, 0.12, 0],
    },
    hold: {
      left: { pistol: [0, -1, 1, 5, 0, 0, 0.6, 0.2, 0.9, 0.95, 0.95, 4] },
    },
  },
  attachments: {
    'pistol:reddot': [0, 3.4, -4, 0, 0, 0],
    'pistol:irons': [0, 3.2, -8, 0, 0, 0],
  },
  weapon: {
    ...DEFAULT_WEAPON,
    mass: 0.14,
    speed: 45,
    rate: 9,
    mode: 'burst',
    ammo: 'tracer',
    sights: ['reddot', 'trace'],
  },
  drone: { profile: 'racing', replace: true },
};

const roundTrip = (data: GearData): GearData => readGear(unpackCode(packCode(writeGear(data)))!)!;

describe('gear codec', () => {
  it('gives every value back, field for field', () => {
    expect(roundTrip(CONFIG)).toEqual(CONFIG);
  });

  it('makes a line far shorter than the same thing as JSON', () => {
    const code = packCode(writeGear(CONFIG));
    expect(code.length).toBeLessThan(JSON.stringify(CONFIG).length * 0.35);
  });

  it('is deterministic — the same settings always read the same', () => {
    expect(packCode(writeGear(CONFIG))).toBe(packCode(writeGear(CONFIG)));
  });

  it('carries an empty configuration in a handful of characters', () => {
    const empty: GearData = {
      tools: {},
      hands: {},
      attachments: {},
      weapon: DEFAULT_WEAPON,
      drone: DEFAULT_DRONE,
    };
    const code = packCode(writeGear(empty));
    expect(code.length).toBeLessThan(40);
    expect(roundTrip(empty)).toEqual({
      tools: {},
      hands: { idle: {}, hold: {} },
      attachments: {},
      weapon: DEFAULT_WEAPON,
      drone: DEFAULT_DRONE,
    });
  });

  it('carries a tool it has never heard of by name', () => {
    const data: GearData = {
      tools: { 'ray-gun': [1, 2, 3, 4, 5, 6] },
      hands: {},
      attachments: {},
      weapon: DEFAULT_WEAPON,
      drone: DEFAULT_DRONE,
    };
    expect(roundTrip(data).tools['ray-gun']).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('keeps a hand pose to the two decimals the menu shows', () => {
    const data: GearData = {
      tools: {},
      hands: { idle: { left: [1.25, -0.4, 0, 12.75, 0, 0, 0.55, 0, 0, 0, 0, 2.5] } },
      attachments: {},
      weapon: DEFAULT_WEAPON,
      drone: DEFAULT_DRONE,
    };
    expect(roundTrip(data).hands.idle?.left).toEqual([
      1.25, -0.4, 0, 12.75, 0, 0, 0.55, 0, 0, 0, 0, 2.5,
    ]);
  });

  it('rounds a value to the precision it is shown with', () => {
    const data: GearData = {
      tools: { pistol: [1.234, 0, 0, 12.7, 0, 0] },
      hands: {},
      attachments: {},
      weapon: DEFAULT_WEAPON,
      drone: DEFAULT_DRONE,
    };
    // A tenth of a centimetre and a whole degree — what the display shows.
    expect(roundTrip(data).tools['pistol']).toEqual([1.2, 0, 0, 13, 0, 0]);
  });

  it('refuses a payload from a format it does not know', () => {
    const bytes = writeGear(CONFIG);
    bytes[0] = 99;
    expect(readGear(bytes)).toBeNull();
  });
});
