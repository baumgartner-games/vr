import {
  BUTTON_A,
  BUTTON_B,
  BUTTON_LB,
  BUTTON_LS,
  BUTTON_RB,
  BUTTON_RT,
  DEAD_ZONE,
  firstGamepad,
  readGamepad,
  type GamepadLike,
} from './gamepad';

/** Ein Pad bauen: Achsen und die Knöpfe, die gedrückt sein sollen. */
function pad(axes: number[], buttons: Record<number, number | boolean> = {}): GamepadLike {
  const list: { pressed: boolean; value: number }[] = [];
  for (let i = 0; i <= 16; i++) {
    const raw = buttons[i];
    const value = typeof raw === 'number' ? raw : raw ? 1 : 0;
    list.push({ pressed: typeof raw === 'boolean' ? raw : value >= 0.35, value });
  }
  return { axes, buttons: list, connected: true };
}

/**
 * **Das Gamepad ist die einzige Eingabe, die hier niemand von Hand prüfen
 * kann** — im Container steckt kein Controller, und im Browser einer Prüfung
 * erst recht nicht. Was zwischen `navigator.getGamepads()` und der Figur
 * passiert, ist deshalb Rechnung und steht hier: die Totzone, die Normierung
 * darüber, ein Pad mit zu wenig Achsen, und gar kein Pad.
 */
describe('Das Gamepad lesen', () => {
  it('lässt einen ruhenden Stick ruhen — die Totzone ist rund', () => {
    // Drift, wie sie jedes zweite Pad meldet: auf keiner Achse viel, zusammen
    // aber knapp unter der Totzone. Eine quadratische Totzone ließe das x
    // hier durch, und die Figur liefe von allein nach Osten.
    const frame = readGamepad(pad([0.15, 0.12, -0.1, 0.05]));
    expect(frame.connected).toBe(true);
    expect(frame.move.x).toBe(0);
    expect(frame.move.y).toBe(0);
    expect(frame.aim.x).toBe(0);
    expect(frame.aim.y).toBe(0);
  });

  it('fängt hinter der Totzone bei null an und endet bei eins', () => {
    // Knapp über der Kante: fast kein Tempo, nicht gleich ein Fünftel.
    const slow = readGamepad(pad([DEAD_ZONE + 0.01, 0]));
    expect(slow.move.x).toBeGreaterThan(0);
    expect(slow.move.x).toBeLessThan(0.02);

    // Ganz nach Süden: volle Länge, und das Vorzeichen bleibt, wie das API es
    // meint — +y ist unten auf dem Schirm.
    const full = readGamepad(pad([0, 1]));
    expect(full.move.x).toBe(0);
    expect(full.move.y).toBeCloseTo(1, 6);

    // Diagonal ganz ausgelenkt meldet mancher Treiber Länge 1,41; daraus darf
    // kein Spieler werden, der schräg schneller läuft als geradeaus.
    const diagonal = readGamepad(pad([1, 1]));
    expect(Math.hypot(diagonal.move.x, diagonal.move.y)).toBeCloseTo(1, 6);
  });

  it('nimmt einem Pad mit zu wenig Achsen nicht übel, dass es sie nicht hat', () => {
    const frame = readGamepad(pad([0, -1]));
    expect(frame.move.y).toBeCloseTo(-1, 6);
    // Der rechte Stick fehlt ganz — kein `NaN`, kein Zielen ins Nichts.
    expect(frame.aim.x).toBe(0);
    expect(frame.aim.y).toBe(0);
  });

  it('kennt A, B, Trigger, Bumper und den gedrückten linken Stick', () => {
    const frame = readGamepad(
      pad([0, 0, 0, 0], {
        [BUTTON_A]: true,
        [BUTTON_LS]: true,
        [BUTTON_LB]: true,
        [BUTTON_RB]: true,
      }),
    );
    expect(frame.use).toBe(true);
    expect(frame.sprint).toBe(true);
    expect(frame.zoomIn).toBe(true);
    expect(frame.zoomOut).toBe(true);
    expect(frame.fire).toBe(false);
    expect(frame.trigger).toBe(0);
  });

  it('macht aus B und dem analogen Trigger **eine** Zahl', () => {
    const half = readGamepad(pad([0, 0, 0, 0], { [BUTTON_RT]: 0.5 }));
    expect(half.fire).toBe(true);
    expect(half.trigger).toBeCloseTo(0.5, 6);

    // Ein angetippter Trigger schießt noch nicht — der Finger liegt nur auf.
    const touched = readGamepad(pad([0, 0, 0, 0], { [BUTTON_RT]: 0.1 }));
    expect(touched.fire).toBe(false);
    expect(touched.trigger).toBeCloseTo(0.1, 6);

    // `B` ist digital und heißt deshalb: ganz durchgedrückt.
    const b = readGamepad(pad([0, 0, 0, 0], { [BUTTON_B]: true }));
    expect(b.fire).toBe(true);
    expect(b.trigger).toBe(1);
  });

  it('kommt ohne Pad aus', () => {
    for (const frame of [readGamepad(null), readGamepad(undefined)]) {
      expect(frame.connected).toBe(false);
      expect(frame.move).toEqual({ x: 0, y: 0 });
      expect(frame.fire).toBe(false);
      expect(frame.trigger).toBe(0);
    }
    // Und ein abgezogenes Pad ist keines mehr, auch wenn es noch im Platz hängt.
    expect(readGamepad({ axes: [1, 1], buttons: [], connected: false }).connected).toBe(false);
  });

  it('nimmt aus den vier Plätzen den, in dem wirklich etwas steckt', () => {
    const second = pad([0, 0]);
    expect(firstGamepad([null, second, null, null])).toBe(second);
    expect(firstGamepad([{ axes: [], buttons: [], connected: false }, second])).toBe(second);
    expect(firstGamepad([null, null])).toBeNull();
    expect(firstGamepad(null)).toBeNull();
  });
});
