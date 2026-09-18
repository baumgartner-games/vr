import {
  CHOP_BEAT,
  DEED_SOUNDS,
  KITCHEN_CUES,
  KITCHEN_CUE_IDS,
  KITCHEN_EAR,
  KITCHEN_HALF,
  KITCHEN_PAN,
  STEP_JUMP,
  STEP_STRIDE,
  deedSound,
  kitchenBeat,
  kitchenHeard,
  kitchenNearest,
  kitchenSoundFiles,
  kitchenStep,
  type DeedKind,
  type KitchenEar,
} from './kitchenSound';

/** Jemand im Ursprung, der nach Norden schaut (in three.js: nach −z). */
const NORTH: KitchenEar = { x: 0, z: 0, ax: 0, az: -1 };

/**
 * **Die Rechnung hinter den Küchengeräuschen.**
 *
 * Es gibt sie aus demselben Grund, aus dem es die Uhren daneben gibt: Eine
 * falsche Zahl hört man im Headset entweder gar nicht (weil sie still ist) oder
 * erst dann, wenn die halbe Küche gleich laut ist. Ein Test rechnet sie nach,
 * bevor jemand eine Brille aufsetzt.
 */
describe('wie laut ein Küchengeräusch ankommt', () => {
  it('ist am Ort des Geschehens am lautesten und fällt danach', () => {
    const here = kitchenHeard(NORTH, { x: 0, z: 0 });
    expect(here.gain).toBeCloseTo(1, 5);
    let last = here.gain;
    for (let d = 0.5; d < KITCHEN_EAR; d += 0.5) {
      const next = kitchenHeard(NORTH, { x: 0, z: -d }).gain;
      expect(next).toBeLessThan(last);
      last = next;
    }
  });

  it('ist auf der halben Strecke ungefähr halb so laut', () => {
    // Die Kurve allein gäbe genau 0,5; der Auslauf bis `KITCHEN_EAR` nimmt
    // noch einen Viertel davon. Beides zusammen ist die Zahl, die zählt.
    const heard = kitchenHeard(NORTH, { x: KITCHEN_HALF, z: 0 });
    expect(heard.gain).toBeCloseTo(0.5 * (1 - KITCHEN_HALF / KITCHEN_EAR), 5);
  });

  it('verstummt jenseits der Hörweite, und zwar ohne Sprung davor', () => {
    expect(kitchenHeard(NORTH, { x: KITCHEN_EAR, z: 0 }).gain).toBe(0);
    expect(kitchenHeard(NORTH, { x: KITCHEN_EAR + 5, z: 0 }).gain).toBe(0);
    // Kurz davor ist es schon fast nichts — sonst wäre die Grenze zu hören.
    expect(kitchenHeard(NORTH, { x: KITCHEN_EAR - 0.05, z: 0 }).gain).toBeLessThan(0.01);
  });

  /**
   * **Die Balance ist die Zahl, die man im Headset nicht nachvollzieht,
   * sondern nur bemerkt**: Ein Vorzeichen zu viel, und das Feuer rechts brennt
   * links. Deshalb steht hier nicht „irgendwie seitlich", sondern rechts ist
   * rechts.
   */
  it('legt nach rechts, was rechts steht, und nach links, was links steht', () => {
    expect(kitchenHeard(NORTH, { x: 2, z: 0 }).pan).toBeCloseTo(KITCHEN_PAN, 5);
    expect(kitchenHeard(NORTH, { x: -2, z: 0 }).pan).toBeCloseTo(-KITCHEN_PAN, 5);
    // Geradeaus und im Rücken liegt nichts auf einer Seite.
    expect(kitchenHeard(NORTH, { x: 0, z: -2 }).pan).toBeCloseTo(0, 5);
    expect(kitchenHeard(NORTH, { x: 0, z: 2 }).pan).toBeCloseTo(0, 5);
  });

  it('dreht die Balance mit, wenn sich der Zuhörer dreht', () => {
    const south: KitchenEar = { x: 0, z: 0, ax: 0, az: 1 };
    expect(kitchenHeard(south, { x: 2, z: 0 }).pan).toBeCloseTo(-KITCHEN_PAN, 5);
  });

  it('gibt keiner Seite den Vorzug, wer mitten in der Quelle steht', () => {
    expect(kitchenHeard(NORTH, { x: 0, z: 0 }).pan).toBe(0);
  });

  /**
   * **Vier brennende Herde sind ein Feuer** — das nächste. Ohne diese Regel
   * addierte eine Halle voller Kochstellen ihre Schleifen übereinander, und die
   * Mischung kippte, sobald jemand ein Möbel dazustellt.
   */
  it('nimmt von mehreren gleichen Quellen die nächste', () => {
    const best = kitchenNearest(NORTH, [
      { x: 5, z: 0 },
      { x: 1, z: 0 },
      { x: 3, z: 0 },
    ]);
    expect(best).not.toBeNull();
    expect(best!.gain).toBeCloseTo(kitchenHeard(NORTH, { x: 1, z: 0 }).gain, 5);
    expect(best!.pan).toBeGreaterThan(0);
  });

  it('meldet gar nichts, wenn keine Quelle in Hörweite ist', () => {
    expect(kitchenNearest(NORTH, [])).toBeNull();
    expect(kitchenNearest(NORTH, [{ x: KITCHEN_EAR + 1, z: 0 }])).toBeNull();
  });
});

/**
 * **Der Takt des Messers.** Ein Schnitt dauert drei Sekunden und soll dabei
 * nach Arbeit klingen; der Fehler, gegen den die Funktion steht, ist ein
 * Ruckler, der ein Dutzend Schläge in dasselbe Bild legt.
 */
describe('der Takt', () => {
  it('schlägt sofort, wenn die Uhr bei null steht', () => {
    const first = kitchenBeat(0, 0.016, CHOP_BEAT);
    expect(first.hit).toBe(true);
    expect(first.clock).toBe(CHOP_BEAT);
  });

  it('schlägt erst wieder, wenn die Spanne um ist', () => {
    let clock = CHOP_BEAT;
    let hits = 0;
    for (let t = 0; t < CHOP_BEAT * 3; t += 0.02) {
      const beat = kitchenBeat(clock, 0.02, CHOP_BEAT);
      clock = beat.clock;
      if (beat.hit) hits++;
    }
    expect(hits).toBe(3);
  });

  it('holt nach einem langen Bild nicht ein Dutzend Schläge nach', () => {
    const beat = kitchenBeat(CHOP_BEAT, 5, CHOP_BEAT);
    expect(beat.hit).toBe(true);
    expect(beat.clock).toBe(CHOP_BEAT);
  });
});

/**
 * **Die Schrittuhr geht nach der Strecke und nicht nach der Zeit** — sonst
 * marschiert man im Stehen.
 */
describe('die Schritte', () => {
  it('fällt genau alle `STEP_STRIDE` Meter', () => {
    let walked = 0;
    let steps = 0;
    // Zehn Meter in Zentimeterschritten: dieselbe Strecke, viele Bilder.
    for (let i = 0; i < 1000; i++) {
      const step = kitchenStep(walked, 0.01);
      walked = step.walked;
      if (step.hit) steps++;
    }
    expect(steps).toBe(Math.floor(10 / STEP_STRIDE));
  });

  it('zählt dieselbe Strecke in wenigen Bildern genauso', () => {
    let walked = 0;
    let steps = 0;
    for (let i = 0; i < 20; i++) {
      const step = kitchenStep(walked, 0.5);
      walked = step.walked;
      if (step.hit) steps++;
    }
    expect(steps).toBe(Math.floor(10 / STEP_STRIDE));
  });

  it('macht im Stehen keinen Schritt', () => {
    expect(kitchenStep(STEP_STRIDE - 0.001, 0).hit).toBe(false);
  });

  /** Ein Portal, ein Teleport, ein `B` auf die Matte: kein Laufen. */
  it('hält eine Versetzung nicht für einen Schritt', () => {
    const jump = kitchenStep(0.7, STEP_JUMP + 1);
    expect(jump.hit).toBe(false);
    expect(jump.walked).toBe(0);
  });
});

/**
 * **Die Tabelle der Töne** — sie ist vollständig über den Union, und jede
 * Zeile nennt mindestens eine Datei. Ein Ton ohne Datei wäre eine Zeile, die
 * stumm bleibt, ohne dass irgendwo etwas rot wird.
 */
describe('die Tabelle der Töne', () => {
  it('nennt zu jedem Ton eine Datei und einen Pegel', () => {
    for (const id of KITCHEN_CUE_IDS) {
      const cue = KITCHEN_CUES[id];
      expect(cue.files.length).toBeGreaterThan(0);
      for (const file of cue.files) expect(file).toMatch(/\.ogg$/);
      expect(cue.gain).toBeGreaterThan(0);
      expect(cue.gain).toBeLessThanOrEqual(1);
    }
  });

  it('zählt jede Datei nur einmal auf, auch die von zwei Tönen geteilte', () => {
    const files = kitchenSoundFiles();
    expect(new Set(files).size).toBe(files.length);
    // Hahn und Spüle sind derselbe Hahn.
    expect(KITCHEN_CUES.water.files).toEqual(KITCHEN_CUES.rinse.files);
    expect(files).toContain(KITCHEN_CUES.water.files[0]);
  });

  it('lässt die Musik leiser sein als das, was sie übertönen würde', () => {
    expect(KITCHEN_CUES.radio.gain).toBeLessThan(KITCHEN_CUES.warn.gain);
    expect(KITCHEN_CUES.radio.gain).toBeLessThan(KITCHEN_CUES.fire.gain);
    // Und die Schritte liegen unter allem.
    for (const id of KITCHEN_CUE_IDS) {
      if (id === 'step') continue;
      expect(KITCHEN_CUES.step.gain).toBeLessThanOrEqual(KITCHEN_CUES[id].gain);
    }
  });

  it('hat für das Radio so viele Aufnahmen, wie es Sender gibt', () => {
    expect(KITCHEN_CUES.radio.loop).toBe(true);
    expect(KITCHEN_CUES.radio.files.length).toBeGreaterThan(1);
  });
});

/**
 * **Welche Tat wie klingt.** Die Tabelle ist die einzige Stelle, an der es
 * steht — die Zone fragt sie einmal und hat dafür keinen elften `case`
 * (`kitchen.act`). Zwei Zeilen darin sind Entscheidungen und keine
 * Zuordnungen, und die stehen hier: die stummen und die Kiste.
 */
describe('der Ton einer Tat', () => {
  it('kennt jede Tat, die die Regel ausgeben kann', () => {
    const deeds: DeedKind[] = [
      'take',
      'place',
      'work',
      'combine',
      'fill',
      'trash',
      'scrape',
      'serve',
      'douse',
      'refuse',
      'nothing',
    ];
    for (const deed of deeds) expect(DEED_SOUNDS).toHaveProperty(deed);
    expect(Object.keys(DEED_SOUNDS).sort()).toEqual([...deeds].sort());
  });

  it('lässt die abgelehnte Tat und die leere Hand stumm', () => {
    expect(deedSound('refuse', 'top')).toBeNull();
    expect(deedSound('nothing', 'top')).toBeNull();
  });

  /**
   * **Das Löschen klingt, aber nicht von hier**: Es geschieht auf zwei Wegen
   * — `A` am Herd und der Strahl quer durch die Küche —, und beide laufen
   * durch dieselbe Stelle der Zone. Stünde der Ton auch in dieser Tabelle,
   * käme er auf dem einen Weg doppelt.
   */
  it('lässt das Löschen hier stumm, weil es die Zone selbst sagt', () => {
    expect(deedSound('douse', 'stove')).toBeNull();
    expect(KITCHEN_CUES.douse.files.length).toBeGreaterThan(0);
  });

  it('macht aus dem Griff in die Kiste eine Klappe und aus jedem anderen einen Griff', () => {
    expect(deedSound('take', 'box')).toBe('crate');
    expect(deedSound('take', 'top')).toBe('pick');
    expect(deedSound('take', 'stove')).toBe('pick');
    // Und die Ausnahme gilt nur für das Nehmen: Wer auf einer Kiste **ablegt**
    // (sie ist zugleich Arbeitsplatte), stellt etwas ab.
    expect(deedSound('place', 'box')).toBe('place');
  });
});
