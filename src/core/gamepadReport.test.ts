import {
  PAD_BUTTONS,
  connectedPads,
  describePad,
  padAxisLabel,
  padButtonCode,
  padButtonLabel,
  padButtonSlot,
  padEdges,
  padKind,
  padSnapshot,
  pressedIndices,
  pressedMask,
  type PadLike,
} from './gamepadReport';

/** Ein Pad bauen: Kennung, Achsen und die Knöpfe, die anliegen sollen. */
function pad(
  id: string,
  axes: number[] = [0, 0, 0, 0],
  buttons: Record<number, number | boolean> = {},
  count = 18,
): PadLike {
  const list: { pressed: boolean; value: number; touched: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const raw = buttons[i];
    const value = typeof raw === 'number' ? raw : raw ? 1 : 0;
    list.push({
      pressed: typeof raw === 'boolean' ? raw : value >= 0.35,
      value,
      touched: false,
    });
  }
  return { id, mapping: 'standard', index: 0, axes, buttons: list, connected: true };
}

/**
 * **Die Seite `/inputs` ist eine Diagnoseseite, und eine Diagnoseseite, die
 * lügt, ist schlimmer als keine.**
 *
 * Wer sie öffnet, hat schon ein Problem: Ein Knopf kommt nicht an, und die
 * Frage ist, ob er im Browser fehlt oder im Spiel. Steht dann auf der Seite
 * eine falsche Nummer, wird ab da am falschen Ende gesucht. Nachgerechnet wird
 * deshalb genau das, was niemand im Container von Hand prüfen kann: welche
 * Nummer welche Taste ist, wie sie auf welchem Gerät heißt, und dass aus einem
 * Dauerdruck **eine** Zeile im Protokoll wird und nicht dreißig pro Sekunde.
 */
describe('Das Pad beschreiben', () => {
  it('kennt die Marke an der Herstellernummer, nicht am Produktnamen', () => {
    // Die Kennung, die Chrome für ein DualShock 4 ausgibt: Der Name sagt
    // nichts, die Nummer alles.
    expect(padKind('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)')).toBe(
      'playstation',
    );
    expect(padKind('DualSense Wireless Controller')).toBe('playstation');
    expect(padKind('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b12)')).toBe(
      'xbox',
    );
    expect(padKind('Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)')).toBe(
      'nintendo',
    );
    // Und was niemand kennt, bekommt die neutrale Spalte — kein Fehlerfall.
    expect(padKind('Generic USB Joystick')).toBe('generic');
    expect(padKind(undefined)).toBe('generic');
  });

  it('beschriftet dieselbe Nummer je Gerät anders und behält die Lage', () => {
    // Nummer 0 ist **unten**, und unten heißt auf drei Pads drei Dinge. Wer
    // nach dem Namen ginge, hätte auf der Switch `B` unter der Nummer von `A`.
    expect(padButtonSlot(0)).toBe('face-down');
    expect(padButtonLabel(0, 'playstation')).toBe('✕ (Kreuz)');
    expect(padButtonLabel(0, 'xbox')).toBe('A');
    expect(padButtonLabel(0, 'nintendo')).toBe('B');

    expect(padButtonSlot(1)).toBe('face-right');
    expect(padButtonLabel(1, 'playstation')).toBe('○ (Kreis)');
    expect(padButtonLabel(1, 'nintendo')).toBe('A');

    // Die Schultern in derselben Reihenfolge wie im Standard-Mapping.
    expect(padButtonSlot(6)).toBe('trigger-left');
    expect(padButtonLabel(7, 'playstation')).toBe('R2');
    expect(padButtonLabel(7, 'xbox')).toBe('RT');
  });

  it('gibt jeder Stelle des Standard-Mappings genau eine Nummer', () => {
    // Eine Stelle zweimal in der Tabelle heißt: zwei Knöpfe leuchten im Bild
    // an derselben Stelle, und einer von beiden wird nie gefunden.
    const slots = PAD_BUTTONS.map((spec) => spec.slot);
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots).toHaveLength(18);
  });

  it('nennt auch die Knöpfe, die keine Tabelle kennt', () => {
    // Ein Adapter, der 20 Knöpfe meldet: Nummer 18 hat keinen Namen, aber eine
    // Nummer — und die ist der Name. Ein geratenes „L4" wäre schlimmer.
    expect(padButtonLabel(18, 'playstation')).toBe('Knopf 18');
    expect(padButtonSlot(18)).toBeNull();
    expect(padButtonCode(18)).toBe('buttons[18]');
    expect(padAxisLabel(0)).toBe('Stick links ⇄');
    expect(padAxisLabel(9)).toBe('Achse 9');
  });

  it('schreibt das Mapping in die Zeile — daran hängt jede Nummer darunter', () => {
    const line = describePad(pad('DualSense Wireless Controller'));
    expect(line).toContain('PlayStation');
    expect(line).toContain('Standard-Mapping');
    expect(line).toContain('18 Knöpfe');

    // Ohne Standard-Mapping ist die Tabelle eine Vermutung, und das muss
    // dastehen, statt gedeutet zu werden.
    const odd = describePad({ ...pad('Joystick'), mapping: '' });
    expect(odd).toContain('Mapping „—"');
    expect(describePad(null)).toBe('kein Pad');
  });
});

describe('Ein Bild vom Pad', () => {
  it('meldet jede gedrückte Taste mit Nummer, Code und Aufschrift', () => {
    const snapshot = padSnapshot(pad('DualSense', [0, 0, 0, 0], { 1: true, 13: true }));
    expect(pressedIndices(snapshot)).toEqual([1, 13]);
    expect(snapshot.pressed[0]).toMatchObject({
      index: 1,
      code: 'buttons[1]',
      label: '○ (Kreis)',
      slot: 'face-right',
      pressed: true,
    });
    expect(snapshot.pressed[1]?.slot).toBe('dpad-down');
  });

  it('zeigt einen halb gezogenen Trigger als halb gezogen', () => {
    // Der eine Fall, für den es die Seite gibt: Ein Trigger, der nach Gefühl
    // bis zum Anschlag geht und bei 60 % aufhört, ist an keiner Lampe zu
    // erkennen — nur an der Zahl.
    const snapshot = padSnapshot(pad('Xbox', [0, 0, 0, 0], { 7: 0.6 }));
    const trigger = snapshot.buttons[7]!;
    expect(trigger.pressed).toBe(true);
    expect(trigger.value).toBeCloseTo(0.6, 6);
    expect(trigger.analog).toBe(true);

    // Und unter der Schwelle: angefasst, aber (wie im Spiel) nicht gedrückt.
    const soft = padSnapshot(pad('Xbox', [0, 0, 0, 0], { 7: 0.2 }));
    expect(soft.buttons[7]!.pressed).toBe(false);
    expect(soft.buttons[7]!.value).toBeCloseTo(0.2, 6);
    expect(soft.pressed).toHaveLength(0);
  });

  it('schönt einen driftenden Stick nicht — er ist die Antwort, nicht der Fehler', () => {
    // `core/gamepad.ts` rechnet diese 0,04 mit seiner Totzone weg, und das ist
    // dort richtig. Hier ist sie der Grund, warum die Figur von allein läuft,
    // und muss dastehen.
    const snapshot = padSnapshot(pad('Pad', [0.04, -0.02, 0, 0]));
    expect(snapshot.axes[0]!.value).toBeCloseTo(0.04, 6);
    expect(snapshot.axes[1]!.value).toBeCloseTo(-0.02, 6);
    expect(snapshot.axes).toHaveLength(4);
  });

  it('bleibt bei keinem Pad leer, statt jemanden abfangen zu lassen', () => {
    for (const nothing of [null, undefined, { ...pad('x'), connected: false }]) {
      const snapshot = padSnapshot(nothing);
      expect(snapshot.buttons).toHaveLength(0);
      expect(snapshot.axes).toHaveLength(0);
      expect(snapshot.pressed).toHaveLength(0);
    }
  });

  it('nimmt ein Pad mit Löchern in den Werten, ohne NaN weiterzugeben', () => {
    const broken: PadLike = {
      id: 'kaputt',
      axes: [Number.NaN, 2, 0, 0],
      buttons: [{ value: Number.NaN }, { pressed: true }, {}],
      connected: true,
    };
    const snapshot = padSnapshot(broken);
    expect(snapshot.axes[0]!.value).toBe(0);
    // Eine Achse jenseits von ±1 meldet mancher Treiber wirklich; sie wird
    // gezeigt, wie sie kommt — geschnitten wird nur, was ins Bild muss.
    expect(snapshot.axes[1]!.value).toBe(2);
    expect(snapshot.buttons[0]!.value).toBe(0);
    // `pressed` ohne Wert ist ein Knopf ohne Analogtechnik: ganz gedrückt.
    expect(snapshot.buttons[1]!.value).toBe(1);
    expect(snapshot.buttons[2]!.pressed).toBe(false);
  });
});

describe('Flanken statt Zustände', () => {
  it('macht aus gedrückt-gehalten eine Zeile und nicht eine pro Bild', () => {
    const down = padSnapshot(pad('Pad', [0, 0, 0, 0], { 3: true }));
    const first = padEdges([], down);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ index: 3, down: true, value: 1 });

    // Zweites Bild, derselbe Finger auf derselben Taste: nichts Neues.
    const mask = pressedMask(down);
    expect(padEdges(mask, down)).toHaveLength(0);

    // Und das Loslassen ist wieder eine Flanke, mit Wert null.
    const up = padSnapshot(pad('Pad'));
    const released = padEdges(mask, up);
    expect(released).toHaveLength(1);
    expect(released[0]).toMatchObject({ index: 3, down: false, value: 0 });
  });

  it('verträgt ein Pad, das plötzlich mehr Knöpfe meldet als vorher', () => {
    // Ein Adapter, der nachlädt, oder ein Pad, das nach dem Aufwecken mehr
    // kann: Der Vergleich läuft über Nummern, nicht über Listenlängen.
    const small = pressedMask(padSnapshot(pad('Pad', [0, 0], {}, 4)));
    const big = padSnapshot(pad('Pad', [0, 0, 0, 0], { 17: true }, 18));
    expect(padEdges(small, big).map((edge) => edge.index)).toEqual([17]);
  });
});

describe('Mehrere Pads', () => {
  it('zeigt alle mit ihrem Platz — das Spiel hört nämlich nur das erste', () => {
    // `navigator.getGamepads()` lässt Löcher, wenn eines abgezogen wird. Genau
    // dann will man sehen, welches noch da ist und auf welchem Platz.
    const second = pad('Xbox');
    const found = connectedPads([null, second, null, { ...pad('alt'), connected: false }]);
    expect(found).toHaveLength(1);
    expect(found[0]!.slot).toBe(1);
    expect(found[0]!.pad).toBe(second);
    expect(connectedPads(null)).toHaveLength(0);
  });
});
