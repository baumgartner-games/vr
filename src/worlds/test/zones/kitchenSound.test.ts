import {
  CHOP_BEAT,
  DEED_SOUNDS,
  EVERYWHERE,
  EVERY_ROOM,
  KITCHEN_CUES,
  KITCHEN_CUE_IDS,
  KITCHEN_EAR,
  KITCHEN_HALF,
  KITCHEN_PAN,
  NEARBY,
  SOUND_TRIALS,
  TRIAL_CUES,
  deedSound,
  kitchenBeat,
  kitchenHeard,
  kitchenNearest,
  kitchenSoundFiles,
  nextTrial,
  reachOf,
  trialAt,
  type DeedKind,
  type KitchenReach,
  type KitchenEar,
} from './kitchenSound';
import { TILE } from '../../nav/navTile';
import { FIELD, KITCHEN } from '../layout';

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
   * **Ein Ton mit Reichweite ist innerhalb davon überall gleich laut.**
   *
   * Aus dem Spieltest: „Die Entfernung, aus der man das Radio hören kann, ist
   * zu gering. Ich würde für einige Audioquellen einstellen wollen, wo diese
   * überall zu hören sind (z. B. in der gesamten Küche) und [sie] nehmen dann
   * ab, wenn man außerhalb dieses Bereiches ist."
   *
   * Genau das prüft diese Zeile: voll bis `full`, danach dieselbe Kurve wie
   * vorher, und bei `gone` Schluss.
   */
  it('bleibt innerhalb seiner Reichweite voll und fällt erst danach', () => {
    const room: KitchenReach = { full: 12, gone: 20 };
    for (const d of [0, 1, 6, 11.9]) {
      expect(kitchenHeard(NORTH, { x: d, z: 0 }, room).gain).toBeCloseTo(1, 5);
    }
    let last = 1;
    for (let d = 12.5; d < room.gone; d += 0.5) {
      const next = kitchenHeard(NORTH, { x: d, z: 0 }, room).gain;
      expect(next).toBeLessThan(last);
      last = next;
    }
    expect(kitchenHeard(NORTH, { x: room.gone, z: 0 }, room).gain).toBe(0);
  });

  /**
   * **Und ohne Reichweite ist alles wie vorher.** `NEARBY` ist `full = 0`, und
   * damit ist die Rechnung Zeile für Zeile die alte — das ist der Grund, warum
   * die Tests darüber unverändert stehen konnten.
   */
  it('rechnet ohne Reichweite genau wie die alte Kurve', () => {
    for (const d of [0.5, 2, 4, 7.5]) {
      const alt = (1 / (1 + (d / KITCHEN_HALF) ** 2)) * (1 - d / KITCHEN_EAR);
      expect(kitchenHeard(NORTH, { x: d, z: 0 }).gain).toBeCloseTo(alt, 9);
      expect(kitchenHeard(NORTH, { x: d, z: 0 }, NEARBY).gain).toBeCloseTo(alt, 9);
    }
  });

  /**
   * **Das Radio ist in der ganzen Küche zu hören**, und das war der Anlass.
   * Seine Reichweite ist die **Diagonale der Zone** (`EVERY_ROOM`,
   * `layout.KITCHEN`) — die größte Entfernung, die zwei Punkte darin haben
   * können. Wächst die Küche, wächst sie mit.
   */
  it('gibt Radio, Feuer und Warnung den ganzen Raum', () => {
    for (const cue of ['radio', 'fire', 'warn'] as const) {
      expect({ cue, reach: reachOf(cue) }).toEqual({ cue, reach: EVERY_ROOM });
    }
    // Und der Handgriff bleibt ein Handgriff.
    for (const cue of ['pick', 'place', 'chop', 'crate'] as const) {
      expect({ cue, reach: reachOf(cue) }).toEqual({ cue, reach: NEARBY });
    }
    // Die Zone misst 37 × 11 Kacheln; quer hindurch sind es gut 38 m, und so
    // weit trägt das Radio.
    expect(EVERY_ROOM.full).toBeGreaterThan(Math.max(KITCHEN.w, KITCHEN.d) * TILE);
    expect(EVERY_ROOM.gone - EVERY_ROOM.full).toBe(KITCHEN_EAR);
    // Von der Westwand bis in den Schauraum, und dort ist es noch voll da.
    expect(kitchenHeard(NORTH, { x: KITCHEN.w * TILE, z: 0 }, EVERY_ROOM).gain).toBeCloseTo(1, 5);
  });

  /**
   * **Und die ganze Welt gäbe es auch** — heute benutzt es niemand, und
   * deshalb steht hier, dass es funktioniert: Wer das Radio überall hören
   * will, trägt `EVERYWHERE` ein, und es deckt das Gelände ab.
   */
  it('hält die Reichweite für die ganze Welt bereit', () => {
    expect(EVERYWHERE.full).toBeGreaterThan(EVERY_ROOM.full);
    expect(EVERYWHERE.full).toBeGreaterThanOrEqual(Math.max(FIELD.w, FIELD.d) * TILE);
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
    // Und der Griff liegt unter allem: Er fällt in dieser Küche am häufigsten.
    for (const id of KITCHEN_CUE_IDS) {
      expect(KITCHEN_CUES.pick.gain).toBeLessThanOrEqual(KITCHEN_CUES[id].gain);
    }
  });

  it('lässt die Vorratskiste nur eine Aufnahme haben', () => {
    // Zwei waren es einmal, und die zweite war ein Oberflächenton aus einem
    // Bedienfeld — im Wechsel klang die Kiste nach zwei verschiedenen Dingen.
    expect(KITCHEN_CUES.crate.files).toEqual(['crate-0.ogg']);
  });

  it('hat für das Radio so viele Aufnahmen, wie es Sender gibt', () => {
    expect(KITCHEN_CUES.radio.loop).toBe(true);
    expect(KITCHEN_CUES.radio.files.length).toBeGreaterThan(1);
  });
});

/**
 * **Die Töne, über die noch nicht entschieden ist** — und die Knöpfe, die sie
 * durchschalten (`kitchen.addTrialButtons`).
 *
 * Geprüft wird das, was sonst erst im Headset auffiele: dass jede Variante
 * Aufnahmen hat, dass der Knopf im Kreis läuft und nicht aus der Liste, und
 * dass die Küche mit der ersten anfängt. Ein Ton, den keine Datei trägt, wäre
 * ein Knopf, der still schaltet.
 */
describe('die Töne zur Auswahl', () => {
  it('gibt jeder Variante einen Namen und mindestens eine Aufnahme', () => {
    for (const cue of TRIAL_CUES) {
      const trials = SOUND_TRIALS[cue];
      expect(trials.length).toBeGreaterThan(1);
      for (const trial of trials) {
        expect(trial.label.length).toBeGreaterThan(0);
        expect(trial.files.length).toBeGreaterThan(0);
        for (const file of trial.files) expect(file).toMatch(/\.ogg$/);
      }
    }
  });

  it('fängt mit der ersten an — sie steht auch in der Tabelle der Töne', () => {
    for (const cue of TRIAL_CUES) {
      expect(KITCHEN_CUES[cue].files).toEqual(SOUND_TRIALS[cue][0]!.files);
      expect(trialAt(cue, 0)).toBe(SOUND_TRIALS[cue][0]);
    }
  });

  it('läuft im Kreis, so oft jemand drückt', () => {
    for (const cue of TRIAL_CUES) {
      const count = SOUND_TRIALS[cue].length;
      let index = 0;
      const seen = new Set<number>();
      for (let i = 0; i < count; i++) {
        seen.add(index);
        index = nextTrial(cue, index);
      }
      expect(seen.size).toBe(count);
      expect(index).toBe(0);
    }
  });

  it('nimmt auch eine Zahl, die es in der Liste nicht gibt', () => {
    expect(trialAt('chop', 99)).toBe(SOUND_TRIALS.chop[99 % SOUND_TRIALS.chop.length]);
    expect(trialAt('serve', -1)).toBe(SOUND_TRIALS.serve[SOUND_TRIALS.serve.length - 1]);
    expect(trialAt('chop', Number.NaN)).toBe(SOUND_TRIALS.chop[0]);
    expect(nextTrial('serve', Number.NaN)).toBe(1);
  });

  it('holt auch die Aufnahmen, die gerade nicht laufen', () => {
    const files = kitchenSoundFiles();
    for (const cue of TRIAL_CUES)
      for (const trial of SOUND_TRIALS[cue])
        for (const file of trial.files) expect(files).toContain(file);
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
      'stow',
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
