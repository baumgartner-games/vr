import {
  IDLE_WORK,
  WORK_SECONDS,
  WORK_TO_HAND,
  advanceWork,
  onWork,
  workProgress,
  workStage,
  workWaits,
  type WorkKind,
  type WorkState,
} from './kitchenWork';

/**
 * Viele kleine Bilder statt eines großen — so, wie es im Headset läuft.
 *
 * `handFree` ist die leere Hand der Figur; ohne Angabe ist sie voll, und damit
 * bleibt am Becken alles liegen, wie es das vor dem Abwasch-Umbau immer tat.
 */
function frames(state: WorkState, seconds: number, near: boolean, handFree = false, dt = 1 / 60) {
  let now = state;
  let done: string | null = null;
  let toHand = false;
  for (let t = 0; t < seconds; t += dt) {
    const tick = advanceWork(now, dt, near, handFree);
    now = tick.state;
    done = tick.done ?? done;
    toHand = tick.toHand || toHand;
  }
  return { state: now, done, toHand };
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
    expect(advanceWork(tomato.state, 100, true)).toEqual({
      state: tomato.state,
      done: null,
      toHand: false,
    });
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
    expect(advanceWork(IDLE_WORK, 100, true)).toEqual({
      state: IDLE_WORK,
      done: null,
      toHand: false,
    });
    const idle = onWork('chop', 'bun');
    expect(advanceWork(idle, 100, true)).toEqual({ state: idle, done: null, toHand: false });
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
 *
 * Gerechnet wird mit **voller Hand**, und das ist Absicht: So läuft für beide
 * Arten Zeile für Zeile dasselbe ab. Der einzige Unterschied — der saubere
 * Teller geht in die Hand — hängt genau an der leeren Hand und steht deshalb
 * im Block darunter, statt diesen hier zu zerfasern.
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

/**
 * **Der Abwasch endet in der Hand** — der eine Unterschied zum Brett
 * (`WORK_TO_HAND`).
 *
 * Er kommt aus dem Spieltest am Handy: „Dreckigen Teller interagieren, dann
 * wird abgewaschen. Ist es fertig, hat man einen sauberen Teller in der Hand."
 * Vorher wurde der Teller sauber und blieb im Becken stehen — man stand
 * daneben, hatte gewartet, und musste ihn zum Schluss noch einmal aufnehmen.
 * Drei Sekunden Arbeit, zwei Handgriffe Buchhaltung; das Becken war so lange
 * besetzt, und der nächste dreckige Teller passte nicht hinein.
 */
describe('was aus der Spüle herauskommt', () => {
  it('legt den sauberen Teller in die Hand und räumt das Becken', () => {
    const wash = frames(onWork('wash', 'plate-dirty'), WORK_SECONDS.wash, true, true);
    expect(wash.done).toBe('plate');
    expect(wash.toHand).toBe(true);
    // Und das Becken ist leer: Der Teller ist **weg** von der Station und
    // liegt nicht zweimal in der Küche.
    expect(wash.state.item).toBeNull();
    expect(workProgress(wash.state)).toBe(0);
  });

  /**
   * **Volle Hand**: Der Teller ist trotzdem sauber, er wartet nur im Wasser.
   * Ihn aus einer Hand zu drängen, die die Pfanne hält, wäre der schlimmere
   * Fehler; ein Griff ans Becken holt ihn nach (`kitchenCarry.atSink`).
   */
  it('lässt ihn im Becken stehen, wenn die Hand voll ist', () => {
    const wash = advanceWork(onWork('wash', 'plate-dirty'), WORK_SECONDS.wash, true, false);
    expect(wash.done).toBe('plate');
    expect(wash.toHand).toBe(false);
    expect(wash.state.item).toBe('plate');
    // Und das ist der Fall, über den die Zone etwas sagen muss.
    expect(workWaits(wash)).toBe(true);
    // Stehenbleiben heißt nicht weiterarbeiten: Ein sauberer Teller wird im
    // Becken nicht noch sauberer, auch nicht mit leerer Hand.
    expect(frames(wash.state, 100, true, true)).toMatchObject({ done: null, toHand: false });
  });

  /**
   * **Am Brett ändert sich nichts**, auch nicht mit leerer Hand: Der
   * geschnittene Salat will als Nächstes auf einen Teller, und wer ihn
   * aufnimmt, hat damit schon entschieden, wohin.
   */
  it('lässt das Geschnittene auf dem Brett liegen', () => {
    const cut = advanceWork(onWork('chop', 'lettuce'), WORK_SECONDS.chop, true, true);
    expect(cut.done).toBe('lettuce-cut');
    expect(cut.toHand).toBe(false);
    expect(cut.state.item).toBe('lettuce-cut');
    // Liegenbleiben ist hier kein Ausweichen, sondern der Normalfall — also
    // gibt es auch nichts anzusagen.
    expect(workWaits(cut)).toBe(false);
    // Auch die Tomate über beide Stufen bleibt, wo sie ist.
    const soup = advanceWork(onWork('chop', 'tomato-cut'), WORK_SECONDS.chop, true, true);
    expect(soup.state.item).toBe('tomato-soup');
    expect(soup.toHand).toBe(false);
  });

  /**
   * **Wer weggeht, bekommt nichts in die Hand** — dieselbe Regel wie am Brett,
   * und die leere Hand ändert daran nichts. Sonst wäre die Spüle die eine
   * Station, an der sich Warten lohnt, indem man wegläuft.
   */
  it('gibt beim Abbruch nichts heraus', () => {
    const begun = advanceWork(onWork('wash', 'plate-dirty'), WORK_SECONDS.wash - 0.5, true, true);
    expect(begun.toHand).toBe(false);
    const away = advanceWork(begun.state, 10, false, true);
    expect(away.done).toBeNull();
    expect(away.toHand).toBe(false);
    // Der dreckige Teller steht weiter im Becken, und Zurückkommen allein tut
    // gar nichts: Erst ein erneutes Auflegen armiert die Uhr wieder.
    expect(away.state.item).toBe('plate-dirty');
    expect(frames(away.state, 100, true, true)).toMatchObject({ done: null, toHand: false });
    expect(frames(onWork('wash', away.state.item), WORK_SECONDS.wash, true, true).toHand).toBe(
      true,
    );
  });

  /**
   * **Der ganze Weg am Stück**, so wie er im Spiel läuft: Der Gast gibt den
   * dreckigen Teller zurück, man stellt ihn ins Becken, steht dabei, und hat
   * danach den sauberen in der Hand — bereit für das Abtropfbrett oder gleich
   * für die nächste Bestellung.
   */
  it('führt den dreckigen Teller in einem Zug zum sauberen in der Hand', () => {
    let now = onWork('wash', 'plate-dirty');
    expect(now.working).toBe(true);
    expect(workProgress(now)).toBe(0);

    const half = frames(now, WORK_SECONDS.wash / 2, true, true);
    expect(half.done).toBeNull();
    // Der Balken über der Spüle steht auf halb — er stimmt weiter.
    expect(workProgress(half.state)).toBeGreaterThan(0.4);
    expect(workProgress(half.state)).toBeLessThan(0.6);

    now = half.state;
    const end = frames(now, WORK_SECONDS.wash, true, true);
    expect(end.done).toBe('plate');
    expect(end.toHand).toBe(true);
    expect(end.state.item).toBeNull();
    // Und danach zeigt die Spüle nichts mehr an.
    expect(workProgress(end.state)).toBe(0);
  });

  /**
   * **Die Tabelle ist die eine Stelle.** Steht sie einmal auf `false`, ist der
   * ganze Umbau zurückgenommen — ohne dass irgendwo sonst etwas zu ändern
   * wäre. Genau das soll sie leisten.
   */
  it('entscheidet allein über den Weg des Fertigen', () => {
    expect(WORK_TO_HAND).toEqual({ chop: false, wash: true });
    for (const kind of Object.keys(WORK_TO_HAND) as WorkKind[]) {
      const item = kind === 'chop' ? 'lettuce' : 'plate-dirty';
      const tick = advanceWork(onWork(kind, item), WORK_SECONDS[kind], true, true);
      expect({ kind, toHand: tick.toHand }).toEqual({ kind, toHand: WORK_TO_HAND[kind] });
      expect(tick.state.item === null).toBe(WORK_TO_HAND[kind]);
    }
  });
});
