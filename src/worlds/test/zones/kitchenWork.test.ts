import {
  IDLE_WORK,
  WORK_SECONDS,
  advanceWork,
  onWork,
  workProgress,
  workStage,
  type WorkKind,
  type WorkState,
} from './kitchenWork';

/** Viele kleine Bilder statt eines großen — so, wie es im Headset läuft. */
function frames(state: WorkState, seconds: number, near: boolean, dt = 1 / 60) {
  let now = state;
  let done: string | null = null;
  for (let t = 0; t < seconds; t += dt) {
    const tick = advanceWork(now, dt, near);
    now = tick.state;
    done = tick.done ?? done;
  }
  return { state: now, done };
}

/**
 * **Die Arbeit an einer Station** — schneiden und spülen aus derselben
 * Rechnung (`kitchenWork.ts`).
 *
 * Beide Arten stehen in jeder Beschreibung nebeneinander, und das ist der
 * Zweck der Datei: Was für das Brett gilt, muss für die Spüle gelten, sonst
 * sind es doch zwei Rechnungen mit einem gemeinsamen Namen.
 */
describe('was eine Station aus einem Ding macht', () => {
  it('schneidet Salat einmal, die Tomate zweimal und wäscht den Teller', () => {
    expect(workStage('chop', 'lettuce')).toBe('lettuce-cut');
    expect(workStage('chop', 'tomato')).toBe('tomato-cut');
    expect(workStage('chop', 'tomato-cut')).toBe('tomato-soup');
    expect(workStage('chop', 'tomato-soup')).toBeNull();
    expect(workStage('wash', 'plate-dirty')).toBe('plate');
  });

  /**
   * **Jede Art kennt nur ihr eigenes Ding.** Ein Teller, den man schneiden
   * könnte, wäre so falsch wie ein Salatkopf in der Spüle — und beides wäre
   * ohne diese Trennung ein Tippfehler weit entfernt.
   */
  it('lässt keine Art die Arbeit der anderen tun', () => {
    expect(workStage('chop', 'plate-dirty')).toBeNull();
    expect(workStage('wash', 'lettuce')).toBeNull();
    expect(workStage('wash', 'plate')).toBeNull();
    expect(workStage('wash', 'pan')).toBeNull();
    expect(workStage('chop', 'bun')).toBeNull();
  });
});

/**
 * **Das Armieren** — nur ein Ablegen fängt die Arbeit an.
 */
describe('das Auflegen', () => {
  it('fängt beim Ablegen von selbst an', () => {
    expect(onWork('chop', 'lettuce').working).toBe(true);
    expect(onWork('chop', 'tomato').working).toBe(true);
    // Auch die zweite Stufe: Scheiben werden zu Suppe.
    expect(onWork('chop', 'tomato-cut').working).toBe(true);
    expect(onWork('wash', 'plate-dirty').working).toBe(true);
  });

  it('lässt liegen, woraus nichts wird', () => {
    // Was nicht geschnitten wird, liegt auf dem Brett einfach da — ein Brett
    // ist auch eine Ablage, nur läuft die Uhr dann nicht.
    expect(onWork('chop', 'bun')).toEqual({
      kind: 'chop',
      item: 'bun',
      time: 0,
      working: false,
    });
    expect(onWork('wash', 'plate').working).toBe(false);
    expect(onWork('chop', null)).toEqual({ kind: 'chop', item: null, time: 0, working: false });
    expect(onWork(null, 'lettuce').working).toBe(false);
    expect(onWork(null, null)).toEqual(IDLE_WORK);
  });

  it('fängt jedes Mal bei null an', () => {
    const begun = advanceWork(onWork('chop', 'lettuce'), 2, true).state;
    expect(begun.time).toBeCloseTo(2);
    expect(onWork('chop', begun.item).time).toBe(0);
  });
});

/**
 * **Die Uhr selbst** — sie läuft nur, solange jemand danebensteht, und sie
 * gibt je Auflegen genau eine Stufe her.
 */
describe('die Uhr an der Station', () => {
  it('macht in WORK_SECONDS eine Stufe und dann keine zweite', () => {
    const cut = advanceWork(onWork('chop', 'lettuce'), WORK_SECONDS.chop, true);
    expect(cut.done).toBe('lettuce-cut');
    expect(cut.state.item).toBe('lettuce-cut');
    expect(cut.state.working).toBe(false);

    const washed = advanceWork(onWork('wash', 'plate-dirty'), WORK_SECONDS.wash, true);
    expect(washed.done).toBe('plate');
    expect(washed.state.item).toBe('plate');
    expect(washed.state.working).toBe(false);
  });

  /**
   * **Der Rest verfällt.** Ein langes Bild macht aus einer Tomate nicht in
   * einem Zug Suppe — die zweite Stufe braucht einen neuen Handgriff, und
   * genau der zeigt, dass sie gewollt war.
   */
  it('macht aus einem langen Bild keine zwei Stufen', () => {
    const tomato = advanceWork(onWork('chop', 'tomato'), 100, true);
    expect(tomato.done).toBe('tomato-cut');
    expect(tomato.state.item).toBe('tomato-cut');
    expect(tomato.state.time).toBe(0);
    // Und weiterlaufen tut von allein gar nichts mehr.
    expect(advanceWork(tomato.state, 100, true)).toEqual({ state: tomato.state, done: null });
    // Erst das erneute Auflegen macht Suppe daraus.
    const soup = advanceWork(onWork('chop', tomato.state.item), WORK_SECONDS.chop, true);
    expect(soup.done).toBe('tomato-soup');
  });

  it('kommt mit vielen kleinen Bildern genauso weit wie mit einem großen', () => {
    const small = frames(onWork('chop', 'lettuce'), WORK_SECONDS.chop + 0.5, true);
    const big = advanceWork(onWork('chop', 'lettuce'), WORK_SECONDS.chop + 0.5, true);
    expect(small.done).toBe('lettuce-cut');
    expect(small.state.item).toBe(big.state.item);
    expect(small.state.working).toBe(big.state.working);
    // Ein halb geschnittener Salat sieht nach sechzig Bildern genauso aus wie
    // nach einem — sonst hinge die Arbeit an der Bildrate.
    const halfSmall = frames(onWork('chop', 'lettuce'), WORK_SECONDS.chop / 2, true);
    const halfBig = advanceWork(onWork('chop', 'lettuce'), WORK_SECONDS.chop / 2, true);
    expect(halfSmall.state.time).toBeCloseTo(halfBig.state.time, 1);
  });

  it('zeigt, wie weit die Arbeit ist', () => {
    const part = advanceWork(onWork('chop', 'lettuce'), WORK_SECONDS.chop / 2, true).state;
    expect(workProgress(part)).toBeCloseTo(0.5);
    const soapy = advanceWork(onWork('wash', 'plate-dirty'), WORK_SECONDS.wash / 2, true).state;
    expect(workProgress(soapy)).toBeCloseTo(0.5);
    expect(workProgress(IDLE_WORK)).toBe(0);
    expect(workProgress(onWork('chop', 'bun'))).toBe(0);
    // Fertig ist nicht halb fertig: Der Balken ist danach wieder weg.
    expect(workProgress(advanceWork(part, 100, true).state)).toBe(0);
  });

  it('arbeitet an einer leeren Station nicht', () => {
    expect(advanceWork(IDLE_WORK, 100, true)).toEqual({ state: IDLE_WORK, done: null });
    const idle = onWork('chop', 'bun');
    expect(advanceWork(idle, 100, true)).toEqual({ state: idle, done: null });
  });

  it('zählt ein rückwärts laufendes Bild nicht mit', () => {
    const back = advanceWork(onWork('chop', 'lettuce'), -5, true);
    expect(back.state.time).toBe(0);
    expect(back.done).toBeNull();
  });
});

/**
 * **Wer weggeht, fängt von vorn an** — die bewusste Änderung gegenüber früher.
 *
 * Bis dahin blieb der Fortschritt stehen und lief beim Zurückkommen weiter.
 * Bequem, aber es machte aus dem Brett eine Ablage, an der man im Vorbeigehen
 * antippt. Jetzt kostet das Weggehen die Arbeit — und das Weitermachen zwei
 * Handgriffe: erneut aufnehmen, erneut ablegen.
 */
describe('das Weggehen', () => {
  it('bricht ab und läuft beim Zurückkommen nicht weiter', () => {
    const begun = frames(onWork('chop', 'lettuce'), WORK_SECONDS.chop - 1, true);
    expect(begun.done).toBeNull();
    expect(begun.state.time).toBeGreaterThan(0);

    const away = advanceWork(begun.state, 1 / 60, false);
    expect(away.state.working).toBe(false);
    expect(away.state.time).toBe(0);
    expect(away.done).toBeNull();
    // Die Zutat liegt weiter da — nur die Arbeit daran ist weg.
    expect(away.state.item).toBe('lettuce');

    // Zurückkommen allein tut gar nichts mehr, auch nicht nach einer Ewigkeit.
    const back = frames(away.state, 100, true);
    expect(back.done).toBeNull();
    expect(back.state.time).toBe(0);
  });

  it('fängt erst durch erneutes Ablegen wieder an', () => {
    const away = advanceWork(onWork('chop', 'lettuce'), 0, false).state;
    const again = onWork('chop', away.item);
    expect(again.working).toBe(true);
    expect(advanceWork(again, WORK_SECONDS.chop, true).done).toBe('lettuce-cut');
  });

  it('bricht auch das Spülen ab', () => {
    const begun = advanceWork(onWork('wash', 'plate-dirty'), WORK_SECONDS.wash - 0.5, true).state;
    expect(workProgress(begun)).toBeGreaterThan(0.8);
    const away = advanceWork(begun, 1, false).state;
    expect(workProgress(away)).toBe(0);
    expect(frames(away, 100, true).done).toBeNull();
    expect(away.item).toBe('plate-dirty');
  });

  /**
   * **Ist schon abgebrochen, kommt derselbe Zustand zurück** — und zwar
   * derselbe, nicht ein gleich aussehender. Die Zone vergleicht auf Identität,
   * um nicht in jedem Bild einer unbenutzten Station ein Netz anzufassen.
   */
  it('legt für eine ruhende Station nichts Neues an', () => {
    const idle = onWork('chop', 'bun');
    expect(advanceWork(idle, 1, false).state).toBe(idle);
    expect(advanceWork(IDLE_WORK, 1, false).state).toBe(IDLE_WORK);
    const done = advanceWork(onWork('chop', 'lettuce'), WORK_SECONDS.chop, true).state;
    expect(advanceWork(done, 1, false).state).toBe(done);
  });
});

/**
 * **Beide Arten, dieselbe Rechnung** — hier einmal Seite an Seite.
 */
describe('schneiden und spülen laufen gleich', () => {
  const runs: [WorkKind, 'lettuce' | 'plate-dirty', string][] = [
    ['chop', 'lettuce', 'lettuce-cut'],
    ['wash', 'plate-dirty', 'plate'],
  ];

  it.each(runs)('%s: armieren, arbeiten, fertig', (kind, item, result) => {
    const start = onWork(kind, item);
    expect(start.working).toBe(true);
    expect(workProgress(start)).toBe(0);
    const half = advanceWork(start, WORK_SECONDS[kind] / 2, true);
    expect(half.done).toBeNull();
    expect(workProgress(half.state)).toBeCloseTo(0.5);
    const end = advanceWork(half.state, WORK_SECONDS[kind] / 2, true);
    expect(end.done).toBe(result);
    expect(end.state).toEqual({ kind, item: result, time: 0, working: false });
  });

  it.each(runs)('%s: bricht beim Weggehen ab', (kind, item) => {
    const half = advanceWork(onWork(kind, item), WORK_SECONDS[kind] / 2, true).state;
    const away = advanceWork(half, 10, false).state;
    expect(away).toEqual({ kind, item, time: 0, working: false });
    expect(frames(away, 100, true).done).toBeNull();
  });
});
