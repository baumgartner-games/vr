import { ByteWriter, packCode, unpackCode } from '../../../core/configCode';
import { DEFAULT_WEAPON } from './weaponSettings';
import { DEFAULT_DRONE } from './droneSettings';
import { DEFAULT_SUPERMAN } from './supermanSettings';
import { GEAR_VERSION, readGear, SECTION, writeGear, type GearData } from './gearCodec';
import { HOLD_HAND_POSE, IDLE_HAND_POSE, handPoseToArray } from '../../../core/handPose';

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
    zoom: 12,
    sights: ['reddot', 'trace', 'scope'],
  },
  drone: { profile: 'racing', replace: true, speed: 14, turn: 160 },
  superman: {
    ...DEFAULT_SUPERMAN,
    forward: 22,
    back: 3.5,
    up: 14,
    down: 4.5,
    side: 8,
    turn: 140,
    deadzone: 4.5,
    drive: 'beide',
    lift: 'kopf',
    yaw: 'hand',
    strafe: true,
  },
};

const roundTrip = (data: GearData): GearData => {
  const unpacked = unpackCode(packCode(writeGear(data)))!;
  return readGear(unpacked.payload, unpacked.version)!;
};

/** Ein alter Code, so wie ihn Fassung 1 oder 2 im Payload geschrieben hat. */
const readLegacy = (bytes: Uint8Array): GearData | null => readGear(bytes, 2);

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
      superman: DEFAULT_SUPERMAN,
    };
    const code = packCode(writeGear(empty));
    expect(code.length).toBeLessThan(56);
    expect(roundTrip(empty)).toEqual({
      tools: {},
      hands: { idle: {}, hold: {} },
      attachments: {},
      weapon: DEFAULT_WEAPON,
      drone: DEFAULT_DRONE,
      superman: DEFAULT_SUPERMAN,
    });
  });

  it('carries a tool it has never heard of by name', () => {
    const data: GearData = { tools: { 'ray-gun': [1, 2, 3, 4, 5, 6] } };
    expect(roundTrip(data).tools?.['ray-gun']).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('keeps a hand pose to the two decimals the menu shows', () => {
    const data: GearData = {
      hands: { idle: { left: [1.25, -0.4, 0, 12.75, 0, 0, 0.55, 0, 0, 0, 0, 2.5] } },
    };
    expect(roundTrip(data).hands?.idle?.left).toEqual([
      1.25, -0.4, 0, 12.75, 0, 0, 0.55, 0, 0, 0, 0, 2.5,
    ]);
  });

  it('rounds a value to the precision it is shown with', () => {
    const data: GearData = { tools: { pistol: [1.234, 0, 0, 12.7, 0, 0] } };
    // A tenth of a centimetre and a whole degree — what the display shows.
    expect(roundTrip(data).tools?.['pistol']).toEqual([1.2, 0, 0, 13, 0, 0]);
  });

  it('carries the scope and its magnification', () => {
    const back = roundTrip(CONFIG);
    expect(back.weapon?.zoom).toBe(12);
    expect(back.weapon?.sights).toContain('scope');
  });

  /**
   * Der ganze Sinn der Abschnittsmaske: der Code eines einzelnen Werkzeugs
   * trägt genau dieses Werkzeug und sonst nichts. Stünden die Pistolenwerte
   * zwangsweise darin, würde ein Pinselcode sie beim Laden überschreiben.
   */
  describe('einzelne Abschnitte', () => {
    it('leaves out what was not put in', () => {
      const only: GearData = { tools: { brush: [0, -1, 2, 0, 0, 0] } };
      const back = roundTrip(only);
      expect(back).toEqual(only);
      expect(back.weapon).toBeUndefined();
      expect(back.drone).toBeUndefined();
      expect(back.hands).toBeUndefined();
    });

    it('stays short enough to read off a small display', () => {
      const only: GearData = { tools: { brush: [0, -1.2, 2.4, -12, 3, 0] } };
      expect(packCode(writeGear(only)).length).toBeLessThan(26);
    });

    it('carries one hand rather than two when only one was measured', () => {
      const values = handPoseToArray({ ...IDLE_HAND_POSE, x: 1.2, pitch: -12 });
      const one: GearData = { hands: { idle: { right: values } } };
      const both: GearData = { hands: { idle: { left: values, right: values } } };
      expect(packCode(writeGear(one)).length).toBeLessThan(
        packCode(writeGear(both)).length,
      );
    });

    it('carries the pistol together with its own settings', () => {
      const only: GearData = {
        tools: { pistol: CONFIG.tools!['pistol']! },
        attachments: { 'pistol:reddot': CONFIG.attachments!['pistol:reddot']! },
        weapon: CONFIG.weapon,
      };
      expect(roundTrip(only)).toEqual(only);
    });

    it('carries nothing at all without falling over', () => {
      expect(roundTrip({})).toEqual({});
    });
  });

  /**
   * Version 1 kannte keine Maske: alles stand immer drin, in fester
   * Reihenfolge, und Neues wurde hinten angehängt. Codes davon liegen in
   * Chatverläufen und auf Zetteln, also müssen sie weiter gelesen werden — und
   * ein Code von *vor* einem angehängten Feld hört einfach auf, der Leser gibt
   * Nullen, und daraus muss der Auslieferungswert werden.
   */
  describe('Version 1', () => {
    /** Ein alter Code, so wie ihn die erste Fassung geschrieben hat. */
    const writeV1 = (zoom: number, speed: number, turn: number): Uint8Array => {
      const out = new ByteWriter();
      out.byte(1);
      out.uint(1);
      out.uint(6).byte(0).byte(0).byte(0).byte(0).byte(0).byte(0); // pistol, Pose 0
      out.byte(0); // keine Grundhaltungen
      out.uint(0); // keine Griffe
      out.uint(0); // keine Anbauteile
      out.fixed(DEFAULT_WEAPON.mass, 1000);
      out.fixed(DEFAULT_WEAPON.speed, 10);
      out.fixed(DEFAULT_WEAPON.rate, 10);
      out.uint(DEFAULT_WEAPON.magazine);
      out.fixed(DEFAULT_WEAPON.reload, 100);
      out.uint(DEFAULT_WEAPON.burst);
      out.byte(0);
      out.uint(0);
      out.byte(0); // Drohne: Kopter, nicht ersetzen
      out.fixed(zoom, 10);
      out.fixed(speed, 10);
      out.fixed(turn, 1);
      return out.bytes();
    };

    it('reads an old code and its trailing fields', () => {
      const back = readLegacy(writeV1(12, 5.5, 60));
      expect(back?.tools?.['pistol']).toEqual([0, 0, 0, 0, 0, 0]);
      expect(back?.weapon?.zoom).toBe(12);
      expect(back?.drone?.speed).toBe(5.5);
      expect(back?.drone?.turn).toBe(60);
    });

    it('gibt einem älteren Code die Auslieferungswerte für das, was ihm fehlt', () => {
      const bytes = writeV1(1, 5.5, 60);
      // Ohne Tempo und Drehrate: der Rest des Codes bleibt heil.
      const beforeDrone = readLegacy(bytes.subarray(0, bytes.length - 2));
      expect(beforeDrone?.drone).toEqual({
        profile: 'kopter',
        replace: false,
        speed: DEFAULT_DRONE.speed,
        turn: DEFAULT_DRONE.turn,
      });
      expect(beforeDrone?.weapon?.zoom).toBe(1);

      // Und noch ein Feld früher, von vor dem Fernrohr.
      const beforeScope = readLegacy(bytes.subarray(0, bytes.length - 3));
      expect(beforeScope?.weapon?.zoom).toBe(DEFAULT_WEAPON.zoom);
      expect(beforeScope?.drone?.speed).toBe(DEFAULT_DRONE.speed);
    });

    it('kennt den Handschuh noch nicht und lässt ihn weg', () => {
      expect(readLegacy(writeV1(1, 5.5, 60))?.superman).toBeUndefined();
    });
  });

  it('refuses a payload from a format it does not know', () => {
    // Die Nummer steht jetzt im Prefix des Codes, nicht im Payload — eine
    // fremde Fassung ist also gar nicht erst zu lesen.
    expect(readGear(writeGear(CONFIG), 9)).toBeNull();
    const legacy = new ByteWriter().byte(7).uint(0).bytes();
    expect(readGear(legacy, 2)).toBeNull();
  });

  /**
   * Fassung 3, und der eigentliche Grund für sie: was auf dem gebauten Wert
   * steht, kostet ein Bit statt eines Bytes. Der Justierer misst sechs von
   * zwölf Zahlen einer Handhaltung; die anderen sechs sollen den Code nicht
   * mehr aufblähen.
   */
  describe('nur die verstellten Werte', () => {
    it('costs nothing for a pose that is still the built-in one', () => {
      const idle = handPoseToArray(IDLE_HAND_POSE);
      const untouched: GearData = { hands: { idle: { right: idle } } };
      const moved: GearData = {
        hands: { idle: { right: [...idle.slice(0, 6).map(() => 0), ...idle.slice(6)] } },
      };
      expect(roundTrip(untouched).hands?.idle?.right).toEqual(idle);
      // Und was wirklich anders ist, kommt heil zurück.
      expect(roundTrip(moved).hands?.idle?.right).toEqual(moved.hands!.idle!.right);
    });

    it('makes the code for one measured hand short enough to type', () => {
      const measured = handPoseToArray({
        ...IDLE_HAND_POSE,
        x: 1.2,
        y: -0.5,
        z: 2.4,
        pitch: -12,
        yaw: 8,
        roll: 30,
      });
      const one: GearData = { hands: { idle: { right: measured } } };
      const code = packCode(writeGear(one), GEAR_VERSION);
      expect(code.length).toBeLessThan(28);
      expect(roundTrip(one).hands?.idle?.right).toEqual(measured);
    });

    it('measures a hold pose against the built-in grip, not against zero', () => {
      const hold = handPoseToArray(HOLD_HAND_POSE);
      const only: GearData = { hands: { hold: { left: { pistol: hold } } } };
      // Nichts verstellt: die Maske ist leer, und trotzdem steht die Haltung da.
      expect(roundTrip(only).hands?.hold?.left?.['pistol']).toEqual(hold);
    });
  });

  it('names its sections so a reader can say what a code carries', () => {
    expect(SECTION.tools).toBe(1);
    expect(SECTION.superman).toBe(32);
  });
});
