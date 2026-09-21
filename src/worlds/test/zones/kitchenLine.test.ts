import {
  BELT_EMPTY,
  advanceBelts,
  beltDelivers,
  beltGrabs,
  beltKind,
  beltReach,
  beltRefills,
  beltReleases,
  beltStep,
  beltWants,
  type BeltState,
  type BeltTile,
} from './kitchenBelt';
import {
  IDLE_COMBINE,
  advanceCombine,
  combinerHolds,
  combinerTakes,
  type CombineState,
} from './kitchenCombiner';
import {
  IDLE_WORK,
  advanceWork,
  onWork,
  type StationKind,
  type WorkKind,
  type WorkState,
} from './kitchenCarry';
import { contentsOf, dish, recipeOf, type Dish, type KitchenItem } from './kitchenRecipes';
import {
  KITCHEN_SPOTS,
  PIPELINE,
  footprint,
  stationKind,
  type Spot,
  type Turn,
} from './kitchenPlan';
import { kitchenPiece } from '../../../core/kitchenFit';

/**
 * **Die Werkhalle, einmal ganz durchgerechnet** — und am Ende liegt ein
 * Burger Deluxe auf der Ausgabe.
 *
 * Alle anderen Küchentests prüfen **ein** Stück: ob ein Band nach zwei
 * Sekunden ankommt, ob ein Filterband das Richtige zieht, ob ein Mixer eine
 * Stufe je Auflegen geht. Jeder davon war grün, während die Straße im Spiel
 * trotzdem nur nackte Brötchen ausspuckte — weil der Fehler nicht in einem
 * Stück steckte, sondern **zwischen** zweien: in der Reihenfolge, in der die
 * Regeln aufeinandertreffen.
 *
 * Genau das steht hier: die **ganze Kette**, von der Vorratskiste bis zum
 * fertigen Gericht, aus den echten Möbeln des echten Grundrisses
 * (`kitchenPlan.KITCHEN_SPOTS`), mit den echten Regeln der echten Module. Wer
 * eine Kachel im Grundriss verschiebt, einen Filter falsch stellt oder ein
 * Band herumdreht, bekommt hier einen roten Test und nicht im Headset eine
 * Straße, die nach zwei Minuten Zusehen nichts geliefert hat.
 *
 * **Was hier nachgebaut ist und was nicht.** Nachgebaut ist die
 * **Buchhaltung** der Zone: welche Kachel neben welcher liegt, wer in diesem
 * Bild wen vorgemerkt hat, wer was abbekommt (`kitchen.runBelts`,
 * `kitchen.cook`, `kitchen.combinerFrame`). Das ist derselbe Kunstgriff, mit
 * dem schon `kitchenBelt.test.ts` seine Bänder führt (`class Run`), nur eine
 * Nummer größer. **Nicht** nachgebaut ist eine einzige Regel: Ob ein Band
 * abliefern darf, ob ein Filterband zugreift, was aus einer Tomate wird, wie
 * lange etwas dauert — das kommt alles aus den Modulen, die auch im Spiel
 * laufen. Ein Nachbau, der die Regeln mitbrächte, prüfte sich selbst.
 *
 * **Und deshalb steht hier auch ein Koch, der nichts tut.** Die Halle läuft
 * ohne Hände; `advanceWork` bekommt `near: false` und `handFree: false`
 * hineingereicht, so wie die Zone es meldet, wenn die Figur drei Räume weiter
 * steht. Ein Schneidebrett bräche darunter ab (`kitchenWork.WORK_ALONE`) —
 * dass Mixer und Kochstelle es nicht tun, ist die halbe Existenzberechtigung
 * der beiden Möbel, und hier wird sie als Ganzes geprüft.
 */

/** Wie fein gerechnet wird — dasselbe Bild, das auch der Browser liefert. */
const FRAME = 1 / 60;

/**
 * **Wie lange die Halle laufen darf**, in Sekunden.
 *
 * Nachgerechnet und nicht geraten: Der längste Weg ist der des Pattys —
 * Kiste, Band, Ablage, Band, fünf Sekunden Braten, Filterband, Übergabe
 * (17 s), dann drei Kombinierer mit je zwei Sekunden und je einem Zugband
 * dazwischen (10 s) und zuletzt das Band zur Ausgabe (2 s). Macht 29 s, dazu
 * je Übergabe ein bis zwei Bilder Vormerkung. **Sechzig** ist gut das Doppelte
 * — genug, dass ein Test nicht an einer neuen Sekunde irgendwo scheitert, und
 * wenig genug, dass er in Millisekunden durchläuft.
 */
const RUN_SECONDS = 60;

/** Eine Kachel der Halle, so wie die Zone sie führt (`kitchen.Station`). */
interface Cell {
  readonly key: string;
  readonly name: string;
  readonly kind: StationKind;
  readonly turn: Turn;
  readonly x: number;
  readonly z: number;
  readonly label: string;
  readonly gives?: KitchenItem;
  readonly filter: KitchenItem | null;
  /** Was darauf liegt — bei der Zone ein Netz, hier nur sein `Dish`. */
  on: Dish | null;
  belt: BeltState;
  work: WorkState;
  join: CombineState;
}

/** Welche Arbeit an dieser Sorte Station läuft — dieselbe Zuordnung wie `kitchen.settle`. */
function workOf(kind: StationKind): WorkKind | null {
  if (kind === 'board') return 'chop';
  if (kind === 'sink') return 'wash';
  if (kind === 'mixer') return 'blend';
  if (kind === 'griddle') return 'fry';
  return null;
}

/**
 * **Die Halle als Rechnung** — Kacheln, Uhren und ein Bild nach dem anderen.
 *
 * Sie führt dieselben vier Schritte wie die Zone, in derselben Reihenfolge,
 * und die Reihenfolge ist keine Geschmacksfrage (siehe `kitchen.runBelts`):
 * erst die Vormerkungen der Kombinierer, dann die Bandrechnung, dann die
 * Übergaben, dann die Uhren.
 */
class Hall {
  readonly cells: Cell[] = [];
  private readonly byKey = new Map<string, Cell>();

  constructor(spots: readonly Spot[]) {
    for (const spot of spots) {
      const kind = stationKind(spot.name, spot.gives, spot.role);
      if (!kind) continue;
      const piece = kitchenPiece(spot.name)!;
      const cell: Cell = {
        key: `${spot.name}@${spot.x},${spot.z}`,
        name: spot.name,
        kind,
        turn: spot.turn ?? 0,
        x: spot.x,
        z: spot.z,
        label: spot.label ?? piece.label,
        gives: spot.gives,
        filter: spot.filter ?? null,
        on: null,
        belt: BELT_EMPTY,
        work: IDLE_WORK,
        join: IDLE_COMBINE,
      };
      this.cells.push(cell);
      this.byKey.set(cell.key, cell);
    }
  }

  /** Die Station auf dieser Kachel — `kitchen.stationAt`. */
  at(x: number, z: number): Cell | null {
    return this.cells.find((cell) => cell.x === x && cell.z === z) ?? null;
  }

  /** Die Station mit diesem Namen und Schild — für die Behauptungen unten. */
  named(label: string): Cell {
    const cell = this.cells.find((one) => one.label === label);
    if (!cell) throw new Error(`keine Kachel mit dem Schild „${label}"`);
    return cell;
  }

  /** Was diese Kachel einem Nachbarn anzubieten hat — `kitchen.offerAt`. */
  offer(cell: Cell): Dish | null {
    if (cell.on) return cell.on;
    if (beltRefills(cell.kind) && cell.gives) return dish(cell.gives);
    return null;
  }

  /** Wohin dieses Band abliefert — `kitchen.beltTarget`. */
  target(cell: Cell): Cell | null {
    const step = beltStep(cell.turn);
    const next = this.at(cell.x + step.dx, cell.z + step.dz);
    return next && beltDelivers(next.kind) ? next : null;
  }

  /** Woher es sich etwas holt — `kitchen.beltSource`, Regel für Regel. */
  source(cell: Cell, kind: 'push' | 'pull' | 'smart'): Cell | null {
    if (!beltGrabs(kind)) return null;
    const step = beltReach(cell.turn);
    const back = this.at(cell.x + step.dx, cell.z + step.dz);
    if (!back || !beltReleases(back.kind, back.work.working || back.join.working)) return null;
    if (back.kind === 'combiner' && combinerHolds(back.join)) return null;
    if (kind === 'smart' && !beltWants(cell.filter, this.offer(back)?.item ?? null)) return null;
    return back;
  }

  /** Die Uhren dieser Kachel auf ihren Inhalt setzen — `kitchen.settle`. */
  settle(cell: Cell): void {
    cell.belt = BELT_EMPTY;
    const work = workOf(cell.kind);
    if (work) cell.work = onWork(work, cell.on?.item ?? null);
    if (cell.kind === 'combiner') cell.join = IDLE_COMBINE;
  }

  /** Etwas darauf legen — `kitchen.layOn`. */
  lay(cell: Cell, what: Dish): void {
    cell.on = what;
    this.settle(cell);
  }

  /** Ein frisches Ding auf den Deckel einer Vorratskiste — `kitchen.sprout`. */
  sprout(cell: Cell): boolean {
    if (cell.on || !cell.gives) return false;
    cell.on = dish(cell.gives);
    return true;
  }

  /** Ein Bild auf allen Bändern — `kitchen.runBelts`. */
  private belts(dt: number): void {
    const busy = new Set<string>();
    for (const cell of this.cells) {
      if (cell.join.working && cell.join.from) busy.add(cell.join.from);
    }

    const tiles: BeltTile[] = [];
    for (const cell of this.cells) {
      const kind = cell.kind === 'belt' ? beltKind(cell.name) : null;
      const to = kind ? this.target(cell) : null;
      const from = kind ? this.source(cell, kind) : null;
      tiles.push({
        id: cell.key,
        loaded: cell.on !== null || (beltRefills(cell.kind) && cell.gives !== undefined),
        state: cell.belt,
        to: busy.has(cell.key) ? null : (to?.key ?? null),
        pull: from && !busy.has(from.key) ? from.key : null,
      });
    }

    const frame = advanceBelts(tiles, dt);
    for (const move of frame.moves) {
      const from = this.byKey.get(move.from);
      const to = this.byKey.get(move.to);
      const load = from?.on;
      if (!from || !to || !load) continue;
      // **Die Probe darauf, dass die Reihenfolge aufgeht**: Wer hier auf eine
      // belegte Kachel legte, verlöre, was darauf liegt. Dieselbe Behauptung
      // wie in `kitchenBelt.test.ts` — sie darf in keinem Bild fallen.
      expect({ move: `${move.from}>${move.to}`, busy: to.on !== null }).toEqual({
        move: `${move.from}>${move.to}`,
        busy: false,
      });
      from.on = null;
      this.settle(from);
      this.lay(to, load);
    }
    for (const cell of this.cells) {
      const next = frame.states.get(cell.key);
      if (!next) continue;
      cell.belt = next;
      if (next.moving && beltRefills(cell.kind)) this.sprout(cell);
    }
  }

  /** Ein Bild am Kombinierer — `kitchen.combinerFrame`. */
  private join(cell: Cell, dt: number): void {
    const step = beltReach(cell.turn);
    const back = this.at(cell.x + step.dx, cell.z + step.dz);
    const ready =
      back && !back.belt.moving && beltReleases(back.kind, back.work.working)
        ? combinerTakes(cell.on, this.offer(back))
        : null;
    const was = cell.join;
    const tick = advanceCombine(cell.join, dt, back && ready?.ok ? back.key : null, ready);
    cell.join = tick.state;
    if (tick.state.working && back && was.from !== tick.state.from) this.sprout(back);

    const done = tick.done;
    if (!done?.ok || !back) return;
    if (back.on) {
      if (done.held) this.lay(back, done.held);
      else {
        back.on = null;
        this.settle(back);
      }
    }
    // **Ohne `settle`** — sonst fiele der Merker zurück, an dem hängt, ob das
    // Gericht abgeholt werden darf (`kitchenCombiner.combinerHolds`).
    if (cell.on) cell.on = done.target ?? cell.on;
  }

  /** Ein Bild an allen Uhren — `kitchen.cook`. */
  private clocks(dt: number): void {
    for (const cell of this.cells) {
      if (cell.kind === 'combiner') {
        this.join(cell, dt);
        continue;
      }
      if (!workOf(cell.kind)) continue;
      // **Niemand steht in der Halle**, und genau das soll sie aushalten:
      // `near: false`, `handFree: false` — so meldet die Zone es, wenn die
      // Figur woanders ist.
      const tick = advanceWork(cell.work, dt, false, false);
      if (tick.state === cell.work) continue;
      cell.work = tick.state;
      if (tick.done && cell.on) cell.on = dish(tick.done);
    }
  }

  /** Ein Bild — `kitchen.update`, ohne alles, was ein Netz anfasst. */
  frame(dt: number): void {
    this.belts(dt);
    this.clocks(dt);
  }

  /** So viele Sekunden in Bildern von `dt`. */
  run(seconds: number, dt = FRAME): void {
    for (let left = seconds; left > 1e-9; left -= dt) this.frame(Math.min(dt, left));
  }
}

/** Nur die Möbel der Werkhalle — der Rest der Küche steht nicht mit im Bild. */
const HALL = KITCHEN_SPOTS.filter((spot) => spot.x >= PIPELINE.x);

describe('die Werkhalle baut einen ganzen Burger', () => {
  it('steht ausschließlich auf einzelnen Kacheln', () => {
    // Die eine Annahme, auf der die Rechnung hier ruht: `at(x, z)` vergleicht
    // die Kachel eines Möbels und nicht seine Grundfläche. Käme ein Stück über
    // zwei Kacheln in die Halle, prüfte dieser Test ab da eine Halle, die es
    // nicht gibt — also fällt er dann lieber auf.
    for (const spot of HALL) {
      const size = footprint(kitchenPiece(spot.name)!, spot.turn ?? 0);
      expect({ name: spot.name, size }).toEqual({ name: spot.name, size: { w: 1, d: 1 } });
    }
  });

  it('legt nach einer Minute einen Burger Deluxe auf die Ausgabe', () => {
    const hall = new Hall(HALL);
    hall.run(RUN_SECONDS);

    const out = hall.named('Burgerausgabe');
    expect({ leer: out.on === null }).toEqual({ leer: false });
    const burger = out.on!;

    // **Das ist die Behauptung, um die es geht.** Nicht „irgendetwas ist
    // angekommen", sondern: genau die vier Zutaten, die das Rezept verlangt —
    // und zwar als Rezept erkannt und nicht von Hand aufgezählt
    // (`kitchenRecipes.recipeOf`).
    const parts = [...contentsOf(burger)].sort();
    expect(parts).toEqual(['bun', 'lettuce-cut', 'patty-cooked', 'tomato-cut']);
    expect(recipeOf(contentsOf(burger))?.label).toBe('Burger Deluxe');
  });

  it('brät das Patty, ohne dass es verbrennen kann', () => {
    const hall = new Hall(HALL);
    hall.run(RUN_SECONDS);

    // **Nirgends in der Halle liegt Verbranntes.** Am Herd wäre es nach
    // weiteren vier Sekunden ohne Aufsicht genau das (`kitchenClock.ts`); die
    // sichere Kochstelle geht die Stufe gar nicht erst mit
    // (`kitchenWork.workStage` für `'fry'`).
    for (const cell of hall.cells) {
      const carried = cell.on ? contentsOf(cell.on) : [];
      expect({ at: cell.key, burnt: carried.includes('patty-burnt') }).toEqual({
        at: cell.key,
        burnt: false,
      });
    }

    // Und die Kochstelle selbst steht danach nicht still, weil sie etwas
    // Unbrauchbares festhält: Was auf ihr liegt, ist roh (frisch angeliefert)
    // oder gebraten (wartet auf das Filterband) — nie etwas anderes.
    const griddle = hall.cells.find((cell) => cell.kind === 'griddle')!;
    if (griddle.on) expect(['patty', 'patty-cooked']).toContain(griddle.on.item);
  });

  it('hackt Salat und Tomate ohne jemanden davor', () => {
    const hall = new Hall(HALL);
    hall.run(RUN_SECONDS);

    // Die Gegenprobe zum Schneidebrett: In dieser Halle steht niemand, und
    // trotzdem ist geschnitten worden — sonst läge auf der Übergabe nichts.
    for (const label of ['Salatübergabe', 'Tomatenübergabe']) {
      const cell = hall.named(label);
      // Sie ist entweder gerade leer (die Zutat ist schon aufgelegt) oder sie
      // trägt das **geschnittene** Gemüse — nie einen ganzen Kopf.
      if (cell.on) expect(['lettuce-cut', 'tomato-cut']).toContain(cell.on.item);
    }

    const cut = hall.cells.filter(
      (cell) => cell.on && ['lettuce-cut', 'tomato-cut'].includes(cell.on.item),
    );
    expect(cut.length).toBeGreaterThan(0);
  });

  it('lässt kein Filterband etwas Ungeschnittenes abholen', () => {
    const hall = new Hall(HALL);
    hall.run(RUN_SECONDS);

    // Der Fehler, den diese Halle einmal hatte: Ein roher Salatkopf fuhr auf
    // dem Filterband hinter dem Mixer weiter (`kitchenBelt.advanceBelts`, die
    // geerbte Vormerkung). Auf einem Filterband liegt nur, was sein Filter
    // sagt — sonst ist der Filter eine Behauptung ohne Wirkung.
    for (const cell of hall.cells) {
      if (cell.name !== 'belt-smart' || !cell.on) continue;
      expect({ at: cell.key, item: cell.on.item }).toEqual({ at: cell.key, item: cell.filter });
    }
  });

  it('liefert weiter, wenn man den fertigen Burger abholt', () => {
    // Eine Straße, die genau einmal liefert, ist ein Aufbau; eine, die immer
    // weiter liefert, ist eine Küche. Abgeholt wird hier so, wie `A` es täte:
    // Die Kachel wird leer, und ihre Uhren fangen von vorn an.
    const hall = new Hall(HALL);
    hall.run(RUN_SECONDS);
    const out = hall.named('Burgerausgabe');

    const served: string[] = [];
    for (let round = 0; round < 3; round++) {
      expect({ round, leer: out.on === null }).toEqual({ round, leer: false });
      served.push(recipeOf(contentsOf(out.on!))?.label ?? 'kein Rezept');
      out.on = null;
      hall.settle(out);
      hall.run(RUN_SECONDS);
    }
    expect(served).toEqual(['Burger Deluxe', 'Burger Deluxe', 'Burger Deluxe']);
  });

  it('verliert unterwegs nichts und legt nichts doppelt', () => {
    // Die stille Zusage jeder Bandrechnung, hier über die ganze Halle: Was
    // hineingeht, kommt an oder liegt irgendwo — es löst sich nicht auf und es
    // liegt nirgends zu zweit. Gezählt wird über die **Kachel**, denn zwei
    // Dinge auf einer Kachel gäbe es in dieser Rechnung gar nicht: `Cell.on`
    // hält genau eines. Geprüft wird deshalb, dass jede Übergabe auf eine
    // freie Kachel ging — das tut die Schleife in `Hall.belts` in jedem Bild.
    const hall = new Hall(HALL);
    hall.run(RUN_SECONDS);

    // Und die Probe darauf, dass wirklich etwas geflossen ist: Nach einer
    // Minute liegt auf mehr als der Hälfte der Kacheln etwas.
    const busy = hall.cells.filter((cell) => cell.on !== null);
    expect(busy.length).toBeGreaterThan(hall.cells.length / 2);
  });
});
