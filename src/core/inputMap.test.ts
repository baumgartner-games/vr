import { readGamepad, type GamepadLike } from './gamepad';
import {
  DEFAULT_KEYS,
  DEFAULT_PAD,
  KEY_ACTIONS,
  PAD_ACTIONS,
  assignSlot,
  bindKey,
  bindPad,
  defaultInputConfig,
  defaultPadPlan,
  deviceKey,
  indexOf,
  isDefaultConfig,
  keysFor,
  layoutSlots,
  padPlan,
  padSlotsFor,
  parseInputConfig,
  resetAction,
  resetBindings,
  resetDevice,
  serializeInputConfig,
  slotOf,
  type InputConfig,
} from './inputMap';

/** Ein Pad bauen: die Knöpfe, die anliegen sollen. */
function pad(buttons: Record<number, number | boolean> = {}, count = 18): GamepadLike {
  const list: { pressed: boolean; value: number }[] = [];
  for (let i = 0; i < count; i++) {
    const raw = buttons[i];
    const value = typeof raw === 'number' ? raw : raw ? 1 : 0;
    list.push({ pressed: typeof raw === 'boolean' ? raw : value >= 0.35, value });
  }
  return { axes: [0, 0, 0, 0], buttons: list, connected: true };
}

/** Der Fall, um den es geht: ein Backbone, das 0 und 1 vertauscht meldet. */
const BACKBONE = deviceKey('Backbone One (STANDARD GAMEPAD Vendor: 358a Product: 0104)');

/**
 * **Zwei Karten, und die eine richtet, was die andere nicht kann.**
 *
 * Der Anlass steht in `inputMap.ts`: Ein Backbone am iPhone meldet den unteren
 * Gesichtsknopf als `buttons[1]`. Wer dort unten drückt, benutzt nichts — und
 * zwar so lange, bis jemand dem Gerät sagt, wo seine Knöpfe wirklich sitzen.
 * Genau das wird hier nachgerechnet, denn im Container steckt kein Backbone:
 * dass ein Tausch **ein** Handgriff ist, dass danach **das Spiel** den
 * richtigen Knopf hört, und dass nichts davon ein zweites Gerät erreicht.
 */
describe('Die Karte des Geräts', () => {
  it('legt ab Werk die Nummern des Standard-Mappings ab', () => {
    const slots = layoutSlots({}, 18);
    expect(slots[0]).toBe('face-down');
    expect(slots[1]).toBe('face-right');
    expect(slots[7]).toBe('trigger-right');
    expect(slots).toHaveLength(18);
  });

  it('tauscht zwei verwechselte Knöpfe mit einem Handgriff', () => {
    // „Unten sitzt in Wirklichkeit Nummer 1" sagt unvermeidlich auch etwas
    // über Nummer 0: Sie kann nicht auch unten sitzen.
    const config = assignSlot(defaultInputConfig(), BACKBONE, 1, 'face-down');
    const layout = config.layouts[BACKBONE]!;
    expect(slotOf(layout, 1, 18)).toBe('face-down');
    expect(slotOf(layout, 0, 18)).toBe('face-right');
    // Und der Rest der Karte bleibt, wo er war.
    expect(slotOf(layout, 2, 18)).toBe('face-left');
    expect(slotOf(layout, 7, 18)).toBe('trigger-right');
  });

  it('lässt keine Stelle zweimal vorkommen, auch über mehrere Handgriffe', () => {
    let config = assignSlot(defaultInputConfig(), BACKBONE, 1, 'face-down');
    config = assignSlot(config, BACKBONE, 4, 'trigger-right');
    config = assignSlot(config, BACKBONE, 3, 'face-right');
    const layout = config.layouts[BACKBONE]!;
    const slots = layoutSlots(layout, 18).filter(Boolean);
    expect(new Set(slots).size).toBe(slots.length);
    expect(slotOf(layout, 3, 18)).toBe('face-right');
    // Nummer 0 hatte `face-right` und gibt sie ab — sie bekommt, was 3 abgibt.
    expect(slotOf(layout, 0, 18)).toBe('face-up');
  });

  it('gilt für dieses Gerät und für kein anderes', () => {
    const config = assignSlot(defaultInputConfig(), BACKBONE, 1, 'face-down');
    // Ein DualSense am selben Rechner ist von der Karte unberührt: Sein
    // Treiber lügt ja nicht.
    expect(slotOf(config.layouts[deviceKey('DualSense')] ?? {}, 0, 18)).toBe('face-down');
    expect(indexOf(config.layouts[BACKBONE]!, 'face-down', 18)).toBe(1);
    expect(indexOf({}, 'face-down', 18)).toBe(0);
  });

  it('nimmt einen Knopf jenseits der Tabelle auf', () => {
    // Ein Adapter mit zwanzig Knöpfen: Nummer 19 hat keine Standardstelle,
    // darf aber eine bekommen.
    const config = assignSlot(defaultInputConfig(), BACKBONE, 19, 'face-down', 20);
    expect(slotOf(config.layouts[BACKBONE]!, 19, 20)).toBe('face-down');
    expect(slotOf(config.layouts[BACKBONE]!, 0, 20)).toBeNull();
  });

  it('wirft die Karte auf Wunsch wieder weg', () => {
    const config = assignSlot(defaultInputConfig(), BACKBONE, 1, 'face-down');
    expect(isDefaultConfig(config)).toBe(false);
    const back = resetDevice(config, BACKBONE);
    expect(back.layouts[BACKBONE]).toBeUndefined();
    expect(isDefaultConfig(back)).toBe(true);
    // Ein Gerät, das gar keine Karte hat, zurückzusetzen ist kein Fehler.
    expect(resetDevice(back, 'gibt es nicht')).toEqual(back);
  });

  it('erkennt dasselbe Gerät wieder, auch wenn der Treiber anders schreibt', () => {
    expect(deviceKey('  Backbone   One  ')).toBe(deviceKey('backbone one'));
    expect(deviceKey(null)).toBe('');
    expect(deviceKey('x'.repeat(400))).toHaveLength(120);
  });
});

describe('Vom Knopf zur Absicht', () => {
  it('spielt ab Werk das einheitliche Schema', () => {
    const plan = defaultPadPlan();
    expect(plan).toEqual({
      use: [0],
      cancel: [1],
      menu: [9],
      fire: [7],
      sight: [6],
      sprint: [10],
      tools: [3],
      view: [8],
      zoomIn: [4],
      zoomOut: [5],
    });
  });

  it('gibt jeder Stelle ab Werk höchstens eine Sache', () => {
    // `bindPad` hält diese Regel für jede Änderung ein — die Voreinstellung
    // muss sie deshalb selbst schon erfüllen, sonst nähme die erste
    // Änderung stillschweigend mehr weg, als dasteht.
    const slots = PAD_ACTIONS.flatMap((action) => [...DEFAULT_PAD[action]]);
    expect(new Set(slots).size).toBe(slots.length);
    const keys = KEY_ACTIONS.flatMap((action) => [...DEFAULT_KEYS[action]]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('macht aus der Gerätekarte die Nummern, die das Spiel abfragt', () => {
    // Der ganze Sinn der Übung: Nach dem Tausch benutzt Nummer 1 — ohne dass
    // jemand die Belegung angefasst hätte.
    const config = assignSlot(defaultInputConfig(), BACKBONE, 1, 'face-down');
    const plan = padPlan(config, config.layouts[BACKBONE]!, 18);
    expect(plan.use).toEqual([1]);
    expect(plan.cancel).toEqual([0]);

    // Und das Spiel hört wirklich darauf: unten drücken heißt benutzen.
    expect(readGamepad(pad({ 1: true }), plan).use).toBe(true);
    expect(readGamepad(pad({ 0: true }), plan).use).toBe(false);
    expect(readGamepad(pad({ 0: true }), plan).cancel).toBe(true);
    // Ohne Karte bleibt es beim Alten — kein anderes Gerät merkt etwas.
    expect(readGamepad(pad({ 1: true })).use).toBe(false);
    expect(readGamepad(pad({ 0: true })).use).toBe(true);
  });

  it('lässt eine Stelle weg, die dieses Pad gar nicht hat', () => {
    // Ein Ministick mit acht Knöpfen hat kein Touchpad und keine Stickdrücke;
    // eine Nummer dafür wäre ein Knopf, der zufällig irgendwo anliegt.
    const plan = padPlan(defaultInputConfig(), {}, 8);
    expect(plan.sprint).toEqual([]);
    expect(plan.fire).toEqual([7]);
    expect(plan.menu).toEqual([]);
    expect(readGamepad(pad({ 1: true }, 8), plan).sprint).toBe(false);
  });

  it('behält den Zug des Triggers, egal auf welchem Knopf er liegt', () => {
    const config = bindPad(defaultInputConfig(), 'fire', 'shoulder-left');
    const plan = padPlan(config, {}, 18);
    expect(plan.fire).toEqual([4]);
    const frame = readGamepad(pad({ 4: 0.6 }), plan);
    expect(frame.fire).toBe(true);
    expect(frame.trigger).toBeCloseTo(0.6, 6);
    // Und der alte Trigger tut nichts mehr — sonst schösse man zweimal.
    expect(readGamepad(pad({ 7: 1 }), plan).fire).toBe(false);
  });
});

describe('Die Belegung', () => {
  it('nimmt eine Stelle dem weg, der sie vorher hatte', () => {
    // Ein Knopf, der zugleich schießt und zoomt, ist kein eingestellter Knopf.
    const config = bindPad(defaultInputConfig(), 'zoomIn', 'face-right');
    expect(padSlotsFor(config, 'zoomIn')).toEqual(['face-right']);
    expect(padSlotsFor(config, 'cancel')).toEqual([]);
    expect(padSlotsFor(config, 'use')).toEqual(DEFAULT_PAD.use);
  });

  it('darf eine Aktion leer laufen lassen — das ist eine Entscheidung', () => {
    // Den Trigger weggenommen heißt: Am Pad wird nicht mehr geschossen. Das
    // muss gehen und darf nicht heimlich zurückspringen.
    const config = bindPad(defaultInputConfig(), 'zoomIn', 'trigger-right');
    expect(padSlotsFor(config, 'fire')).toEqual([]);
    expect(padPlan(config, {}, 18).fire).toEqual([]);
  });

  it('macht dasselbe mit Tasten', () => {
    const config = bindKey(defaultInputConfig(), 'jump', 'KeyE');
    expect(keysFor(config, 'jump')).toEqual(['KeyE']);
    // `KeyE` gehörte dem Benutzen; Enter bleibt ihm.
    expect(keysFor(config, 'use')).toEqual(['Enter', 'NumpadEnter']);
    expect(keysFor(config, 'forward')).toEqual(DEFAULT_KEYS.forward);
    expect(bindKey(config, 'jump', '')).toEqual(config);
  });

  it('kennt den Weg zurück — einzeln und im Ganzen', () => {
    let config = bindPad(defaultInputConfig(), 'zoomIn', 'face-right');
    config = bindKey(config, 'jump', 'KeyE');
    config = assignSlot(config, BACKBONE, 1, 'face-down');

    const single = resetAction(config, 'jump');
    expect(keysFor(single, 'jump')).toEqual(DEFAULT_KEYS.jump);
    expect(padSlotsFor(single, 'zoomIn')).toEqual(['face-right']);

    // Belegungen zurück, Gerätekarten bleiben: Ein Treiberfehler ist kein
    // Geschmack, und wer seine Belegung aufräumt, will ihn nicht zurück.
    const bindings = resetBindings(config);
    expect(padSlotsFor(bindings, 'zoomIn')).toEqual(DEFAULT_PAD.zoomIn);
    expect(keysFor(bindings, 'jump')).toEqual(DEFAULT_KEYS.jump);
    expect(bindings.layouts[BACKBONE]).toBeDefined();
  });
});

describe('Was im Speicher liegt', () => {
  it('kommt unverändert wieder heraus', () => {
    let config = bindPad(defaultInputConfig(), 'zoomIn', 'face-right');
    config = bindKey(config, 'jump', 'KeyQ');
    config = assignSlot(config, BACKBONE, 1, 'face-down');
    expect(parseInputConfig(serializeInputConfig(config))).toEqual(config);
  });

  it('speichert nur den Widerspruch, nicht den Standard', () => {
    // Sonst friert eine Belegung ein: Wer heute `Tab` ausdrücklich auf die
    // Werkzeugliste legt, hätte sie morgen weiter dort, auch wenn die
    // Voreinstellung längst eine bessere Taste kennt.
    const config = bindKey(defaultInputConfig(), 'tools', 'Tab');
    expect(config.keys.tools).toBeUndefined();
    expect(serializeInputConfig(config)).toBe('{"v":1}');
    expect(isDefaultConfig(config)).toBe(true);
  });

  it('misstraut dem, was im Speicher steht', () => {
    // Von Hand verstellt, aus einer alten Fassung, oder schlicht kaputt: Eine
    // Belegung, die zur Hälfte aus Müll besteht, ist schlimmer als die
    // Standardbelegung — sie lässt sich nicht erklären.
    expect(parseInputConfig(null)).toEqual(defaultInputConfig());
    expect(parseInputConfig('kein json')).toEqual(defaultInputConfig());
    expect(parseInputConfig('{"v":99,"keys":{"jump":["KeyQ"]}}')).toEqual(defaultInputConfig());

    const dirty = parseInputConfig(
      JSON.stringify({
        v: 1,
        layouts: { Backbone: { '1': 'face-down', '2': 'gibt-es-nicht', x: 'face-up' } },
        pad: { fire: ['face-left', 'erfunden'], quatsch: ['face-up'] },
        keys: { jump: ['KeyQ', '<script>', 42] },
      }),
    );
    expect(dirty.layouts['backbone']).toEqual({ 1: 'face-down' });
    expect(dirty.pad.fire).toEqual(['face-left']);
    expect(dirty.keys.jump).toEqual(['KeyQ']);
    expect((dirty.pad as Record<string, unknown>)['quatsch']).toBeUndefined();
  });

  it('nimmt eine Karte an, die jemand widersprüchlich hinterlassen hat', () => {
    // Zwei Nummern auf derselben Stelle: Welche das Spiel hört, darf nicht die
    // Reihenfolge einer Schleife entscheiden. Die erste behält sie, die zweite
    // steht ohne da — und das sieht man auf der Eingabeseite.
    const config: InputConfig = {
      layouts: { x: { 5: 'face-down' } },
      pad: {},
      keys: {},
    };
    const slots = layoutSlots(config.layouts['x']!, 18);
    expect(slots[5]).toBe('face-down');
    expect(slots[0]).toBeNull();
    expect(slots.filter((slot) => slot === 'face-down')).toHaveLength(1);
  });
});
