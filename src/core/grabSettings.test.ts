import {
  DEFAULT_GRAB,
  GRAB_FIELDS,
  PULL_STEPS,
  clampGrab,
  formatGrabField,
  grabSettings,
  motionLabel,
  nextGrabMotion,
  nextGrabStep,
  pullStepName,
  saveGrabSettings,
  type GrabMotion,
  type GrabSettings,
} from './grabSettings';

const radius = GRAB_FIELDS.find((field) => field.key === 'radius')!;
const height = GRAB_FIELDS.find((field) => field.key === 'height')!;
const pull = GRAB_FIELDS.find((field) => field.key === 'pull')!;
const scale = GRAB_FIELDS.find((field) => field.key === 'scale')!;

describe('the numbers behind grabbing', () => {
  it('hands back the defaults when nothing is stored', () => {
    expect(clampGrab(undefined)).toEqual(DEFAULT_GRAB);
    expect(clampGrab({})).toEqual(DEFAULT_GRAB);
  });

  it('keeps a radius inside its range and drops the rest', () => {
    expect(clampGrab({ radius: 500 }).radius).toBe(radius.max);
    expect(clampGrab({ radius: -20 }).radius).toBe(radius.min);
    expect(clampGrab({ radius: 85 }).radius).toBe(85);
  });

  it('allows a radius of zero — that is how the near grab is switched off', () => {
    expect(clampGrab({ radius: 0 }).radius).toBe(0);
  });

  it('falls back to the default for a number that is not one', () => {
    expect(clampGrab({ height: Number.NaN }).height).toBe(DEFAULT_GRAB.height);
    expect(clampGrab({ radius: undefined }).radius).toBe(DEFAULT_GRAB.radius);
  });

  it('refuses a motion mode it has never heard of', () => {
    const stored = { motion: 'wobble' } as unknown as Partial<GrabSettings>;
    expect(clampGrab(stored).motion).toBe(DEFAULT_GRAB.motion);
  });

  it('refuses a switch that is not a switch', () => {
    const stored = { near: 'ja' } as unknown as Partial<GrabSettings>;
    expect(clampGrab(stored).near).toBe(DEFAULT_GRAB.near);
  });

  it('leaves untouched settings alone', () => {
    const changed = clampGrab({ ...DEFAULT_GRAB, remote: false });
    expect(changed.remote).toBe(false);
    expect(changed.near).toBe(DEFAULT_GRAB.near);
  });
});

describe('das Zugtempo', () => {
  it('steht als Vorgabe auf 1,25 m/s — die mittlere Raste', () => {
    expect(DEFAULT_GRAB.pull).toBe(125);
    expect(formatGrabField(pull, DEFAULT_GRAB)).toBe('1,25 m/s · mittel');
  });

  it('hat fünf Rasten, je 25 cm/s auseinander, mit Namen', () => {
    expect(PULL_STEPS.map((step) => step.value)).toEqual([75, 100, 125, 150, 175]);
    expect(PULL_STEPS.map((step) => step.name)).toEqual([
      'sehr langsam',
      'langsam',
      'mittel',
      'schnell',
      'sehr schnell',
    ]);
    expect(pull.steps).toEqual([75, 100, 125, 150, 175]);
  });

  it('liest jede Raste als Tempo mit Namen', () => {
    expect(formatGrabField(pull, clampGrab({ pull: 75 }))).toBe('0,75 m/s · sehr langsam');
    expect(formatGrabField(pull, clampGrab({ pull: 100 }))).toBe('1,0 m/s · langsam');
    expect(formatGrabField(pull, clampGrab({ pull: 150 }))).toBe('1,5 m/s · schnell');
    expect(formatGrabField(pull, clampGrab({ pull: 175 }))).toBe('1,75 m/s · sehr schnell');
  });

  it('lässt eine getippte Zahl zwischen den Rasten ohne Namen stehen', () => {
    expect(formatGrabField(pull, clampGrab({ pull: 130 }))).toBe('1,3 m/s');
    expect(pullStepName(130)).toBeNull();
  });

  it('nimmt die Null als „ohne Zucken" an', () => {
    expect(clampGrab({ pull: 0 }).pull).toBe(0);
    expect(formatGrabField(pull, clampGrab({ pull: 0 }))).toBe('ohne Zucken');
  });

  it('bleibt in seinem Bereich und fällt sonst auf die Vorgabe zurück', () => {
    expect(clampGrab({ pull: 9000 }).pull).toBe(pull.max);
    expect(clampGrab({ pull: -100 }).pull).toBe(pull.min);
    expect(clampGrab({ pull: Number.NaN }).pull).toBe(DEFAULT_GRAB.pull);
  });

  it('schaltet die Zeile durch die fünf Tempi, oben wieder von vorn', () => {
    expect(nextGrabStep(pull, 75)).toBe(100);
    expect(nextGrabStep(pull, 125)).toBe(150);
    expect(nextGrabStep(pull, 175)).toBe(75);
    // Die Null ist keine Raste mehr, bleibt aber ein gültiger Wert: von ihr
    // aus geht es beim langsamsten Tempo weiter.
    expect(nextGrabStep(pull, 0)).toBe(75);
  });
});

describe('der Nahradius', () => {
  it('steht als Vorgabe auf 1,40 m — Armlänge und ein Schritt dazu', () => {
    expect(DEFAULT_GRAB.radius).toBe(140);
    expect(formatGrabField(radius, DEFAULT_GRAB)).toBe('140 cm');
  });

  it('hat die Vorgabe als Raste, damit die Zeile sie auch trifft', () => {
    expect(radius.steps).toContain(DEFAULT_GRAB.radius);
  });
});

describe('die Nahverstärkung', () => {
  it('steht als Vorgabe auf dem Anderthalbfachen', () => {
    expect(DEFAULT_GRAB.scale).toBe(150);
    expect(formatGrabField(scale, DEFAULT_GRAB)).toBe('1,5-fach');
  });

  it('liest die Hundert als „eins zu eins" — das ist keine Zahl, sondern ein Zustand', () => {
    expect(formatGrabField(scale, clampGrab({ scale: 100 }))).toBe('eins zu eins');
    expect(formatGrabField(scale, clampGrab({ scale: 200 }))).toBe('2,0-fach');
    expect(formatGrabField(scale, clampGrab({ scale: 125 }))).toBe('1,25-fach');
  });

  it('bleibt in ihrem Bereich und fällt sonst auf die Vorgabe zurück', () => {
    expect(clampGrab({ scale: 9000 }).scale).toBe(scale.max);
    expect(clampGrab({ scale: 1 }).scale).toBe(scale.min);
    expect(clampGrab({ scale: Number.NaN }).scale).toBe(DEFAULT_GRAB.scale);
  });

  it('schaltet die Zeile durch ihre Rasten', () => {
    expect(nextGrabStep(scale, 100)).toBe(125);
    expect(nextGrabStep(scale, 150)).toBe(200);
    expect(nextGrabStep(scale, 200)).toBe(100);
  });
});

describe('das alte Zugtempo im Speicher', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('zieht die alten 8 m/s auf die neue Vorgabe — sonst käme sie nie an', () => {
    store.set('bgvr.grab', JSON.stringify({ ...DEFAULT_GRAB, pull: 800 }));
    expect(grabSettings().pull).toBe(DEFAULT_GRAB.pull);
  });

  it('lässt jede andere gespeicherte Zahl stehen', () => {
    store.set('bgvr.grab', JSON.stringify({ ...DEFAULT_GRAB, pull: 810 }));
    expect(grabSettings().pull).toBe(810);
    store.set('bgvr.grab', JSON.stringify({ ...DEFAULT_GRAB, pull: 0 }));
    expect(grabSettings().pull).toBe(0);
  });
});

describe('der alte Nahradius im Speicher', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  /** Ein Stand, wie ihn das Menü vor der Umstellung geschrieben hat. */
  function stored(settings: Partial<GrabSettings>): void {
    const old = { ...DEFAULT_GRAB, radius: 100, ...settings };
    Reflect.deleteProperty(old, 'version');
    store.set('bgvr.grab', JSON.stringify(old));
  }

  it('zieht den alten Meter einmalig auf die neuen 1,40 m', () => {
    stored({});
    expect(grabSettings().radius).toBe(DEFAULT_GRAB.radius);
  });

  it('lässt jede andere gespeicherte Weite stehen', () => {
    stored({ radius: 60 });
    expect(grabSettings().radius).toBe(60);
    stored({ radius: 0 });
    expect(grabSettings().radius).toBe(0);
  });

  it('fasst einen Meter nicht mehr an, sobald er einmal so gespeichert wurde', () => {
    // Der Unterschied zum Zugtempo: 100 ist eine **Raste** der Zeile. Wer sie
    // absichtlich anklickt, muss sie behalten dürfen — die Fassung im
    // Speicher, nicht der Wert, entscheidet über das Nachziehen.
    saveGrabSettings({ radius: 100 });
    expect(grabSettings().radius).toBe(100);
  });

  it('stempelt jeden geschriebenen Stand mit der heutigen Fassung', () => {
    stored({});
    expect(saveGrabSettings({}).version).toBe(DEFAULT_GRAB.version);
    expect(grabSettings().version).toBe(DEFAULT_GRAB.version);
  });
});

describe('stepping through the notches', () => {
  it('goes to the next notch above the current value', () => {
    expect(nextGrabStep(radius, 60)).toBe(100);
    expect(nextGrabStep(height, 210)).toBe(240);
  });

  it('starts over at the top', () => {
    expect(nextGrabStep(radius, radius.steps[radius.steps.length - 1]!)).toBe(radius.steps[0]);
  });

  it('picks the first notch above a value typed in between', () => {
    expect(nextGrabStep(radius, 85)).toBe(100);
    expect(nextGrabStep(radius, 0)).toBe(60);
  });
});

describe('what the menu reads out', () => {
  it('writes a radius in whole centimetres', () => {
    expect(formatGrabField(radius, clampGrab({ radius: 140 }))).toBe('140 cm');
  });

  it('names both motion modes', () => {
    expect(motionLabel('rigid')).toContain('Starr');
    expect(motionLabel('hand')).toContain('eigene Hand');
  });

  it('schaltet die Zeile im Kreis weiter', () => {
    expect(nextGrabMotion('hand')).toBe('rigid');
    expect(nextGrabMotion('rigid')).toBe('hand');
  });

  it('nimmt die Geisterhand als Vorgabe und wirft alte Namen weg', () => {
    expect(DEFAULT_GRAB.motion).toBe('hand');
    // `spin` gab es einmal — ein gespeicherter Rest davon fällt auf die Vorgabe
    // zurück, statt als unbekannte Betriebsart stehen zu bleiben.
    expect(clampGrab({ motion: 'spin' as unknown as GrabMotion }).motion).toBe('hand');
  });
});
