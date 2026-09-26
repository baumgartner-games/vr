import { contentsOf, recipeOf, served, type Dish, type Recipe } from '../test/zones/kitchenRecipes';

/**
 * **Der Tag im Burgerladen** — wer kommt, wer wartet, wer isst, wer zahlt,
 * und wann Schluss ist. Ohne three.js, ohne Figur, ohne Bild.
 *
 * Angelehnt an _PlateUp!_: Ein Tag hat eine feste Öffnungszeit. Solange der
 * Laden offen ist, kommen Gäste in Abständen herein, setzen sich an einen
 * freien Tisch und bestellen einen Burger. Jeder Gast hat eine **Geduld** —
 * läuft sie ab, bevor sein Essen kommt, geht er unzufrieden. Wer sein Essen
 * bekommt, isst, zahlt und geht. Nach Ladenschluss wird fertig bedient; wenn
 * der letzte Gast draußen ist, ist der Tag vorbei. Wer an einem Tag zu viele
 * Gäste verliert, dessen Laden macht zu — das ist das Ende der Runde.
 *
 * **Die Uhr steht hier und nicht in der Welt**, aus demselben Grund wie in der
 * Küche (`kitchenClock.ts`): Ein Bild dauert 16 ms, ein Tag anderthalb
 * Minuten, und wer das nur im Bild rechnet, hat Gäste, die je nach Bildrate
 * verschieden lange warten. Ein Test rechnet hier einen ganzen Tag in
 * Sekundenschritten nach.
 *
 * **Und die Figuren stehen nicht hier.** Ein Gast ist in dieser Datei eine
 * Nummer mit einem Tisch und einer Phase; ob er gerade läuft, sitzt oder
 * isst, zeigt die Welt (`PlateUpWorld`). Zwei Phasen hängen deshalb an ihr:
 * `walkIn` endet, wenn die Figur auf dem Stuhl ankommt (`seatGuest`), und
 * `walkOut`, wenn sie draußen ist (`guestGone`). Ohne Figur — in den Tests,
 * oder wenn ein Modell nicht lädt — ruft die Welt beides sofort.
 */

/** Ein Rezept mit Preis — was auf der Karte steht. */
export interface MenuItem {
  readonly recipe: string;
  readonly label: string;
  /** Was es kostet, in Münzen — ohne Trinkgeld. */
  readonly price: number;
}

/**
 * **Die Karte**, in der Reihenfolge, in der sie wächst.
 *
 * Tag 1 gibt es nur den Hamburger (Brötchen und gebratenes Patty). Ab Tag 2
 * den Salatburger dazu, ab Tag 3 den Tomatenburger, ab Tag 4 den Deluxe. Jede
 * Stufe bringt **eine** neue Station ins Spiel (das Brett, dann eine zweite
 * Kiste daran), und das ist die ganze Steigerung, die ein Anfänger verkraftet.
 *
 * Die Ids sind die der Küche (`kitchenRecipes.RECIPES`): Was dort als
 * Salatburger über die Theke geht, ist hier ein Salatburger.
 */
export const MENU: readonly MenuItem[] = [
  { recipe: 'hamburger', label: 'Hamburger', price: 10 },
  { recipe: 'salat', label: 'Salatburger', price: 14 },
  { recipe: 'tomate', label: 'Tomatenburger', price: 14 },
  { recipe: 'deluxe', label: 'Burger Deluxe', price: 20 },
];

/** Ein Eintrag der Karte nach Id — oder der Hamburger, wenn es ihn nicht gibt. */
export function menuItem(recipe: string): MenuItem {
  return MENU.find((item) => item.recipe === recipe) ?? MENU[0]!;
}

/** Was an einem Tag gilt — alles, was mit den Tagen schwerer wird. */
export interface DayRules {
  /** Wie lange der Laden offen hat, in Sekunden. */
  readonly open: number;
  /** Wie viele Sekunden zwischen zwei Gästen liegen (im Mittel). */
  readonly gap: number;
  /** Wie lange ein Gast auf sein Essen wartet, in Sekunden. */
  readonly patience: number;
  /** Wie viele Rezepte auf der Karte stehen (von vorn in `MENU`). */
  readonly menu: number;
  /** Wie viele Gäste man an diesem Tag verlieren darf, ohne dass der Laden zumacht. */
  readonly lives: number;
  /**
   * Wie wahrscheinlich Gäste **zu zweit** kommen (0…1) — eine Gruppe setzt
   * sich an denselben Tisch, und jeder bestellt für sich.
   */
  readonly pairs: number;
  /**
   * Wie lange ein **gebratenes** Patty auf der Grillplatte liegen darf, bevor
   * es verbrennt, in Sekunden.
   */
  readonly burn: number;
}

/**
 * **Wie schwer ein Tag ist.**
 *
 * Drei Stellschrauben, und alle drehen in dieselbe Richtung: Die Gäste kommen
 * dichter (von 18 s bis herunter auf 7 s Abstand), sie warten kürzer (von 70 s
 * bis herunter auf 35 s), und die Karte wird länger. Die Öffnungszeit wächst
 * leicht mit, damit ein späterer Tag auch mehr Gäste hat und nicht nur
 * hektischere.
 *
 * Tag 1 ist mit Absicht fast geschenkt: vier bis fünf Gäste, ein Rezept, über
 * eine Minute Geduld. Wer das Spiel zum ersten Mal sieht, lernt dort die
 * Kette, und nicht, dass er zu langsam ist.
 */
export function dayRules(day: number): DayRules {
  const d = Math.max(1, Math.floor(day));
  return {
    open: Math.min(150, 75 + (d - 1) * 15),
    gap: Math.max(7, 18 - (d - 1) * 2.5),
    patience: Math.max(35, 70 - (d - 1) * 8),
    menu: Math.min(MENU.length, d),
    lives: 3,
    // **Tag 1 kommt jeder allein**, und die Grillplatte verzeiht lange: Wer
    // die Kette zum ersten Mal sieht, lernt dort die Reihenfolge und nicht
    // das Rennen. Ab Tag 2 kommen Paare (30 %, dann jeden Tag 10 % mehr bis
    // 60 %), und das Patty wird jeden Tag zwei Sekunden früher schwarz — bis
    // auf 6 s, was reicht, wenn man in der Bratzeit den Teller holt.
    pairs: d === 1 ? 0 : Math.min(0.6, 0.3 + (d - 2) * 0.1),
    burn: Math.max(6, 14 - (d - 1) * 2),
  };
}

/**
 * **Wie viel Geduld die Einrichtung schenkt** — ein Faktor ≥ 1.
 *
 * Wie bei _PlateUp!_ macht Deko den Laden gemütlicher: Jedes gekaufte Stück
 * gibt den Gästen 6 % mehr Geduld, höchstens 30 % (fünf Stück). Mehr wäre ein
 * Kauf, der das Spiel abschaltet.
 */
export function decorPatience(decor: number): number {
  return 1 + Math.min(5, Math.max(0, Math.floor(decor))) * 0.06;
}

/** Wie lange ein Gast isst, bevor er zahlt und geht, in Sekunden. */
export const EAT_SECONDS = 6;

/** Wie viel Trinkgeld höchstens dazukommt — bei voller Geduld. */
export const MAX_TIP = 5;

/** Wo ein Gast gerade ist. */
export type GuestPhase =
  /** Auf dem Weg zu seinem Tisch — die Geduld läuft noch nicht. */
  | 'walkIn'
  /** Er sitzt und wartet auf sein Essen; die Geduld läuft. */
  | 'waiting'
  /** Er isst. */
  | 'eating'
  /** Er geht — zufrieden (`happy`) oder nicht. */
  | 'walkOut';

export interface Guest {
  readonly id: number;
  /** Der Tisch (Index in `plateUpPlan.TABLES`). */
  readonly table: number;
  /** Welcher Stuhl: 0 der Nordstuhl, 1 der an der Seite (nur in einer Gruppe). */
  readonly seat: number;
  /** Die Gruppe — wer zusammen kommt, hat dieselbe Nummer (die Id des Ersten). */
  readonly group: number;
  /** Was er bestellt hat — eine Id aus `MENU`. */
  readonly order: string;
  readonly phase: GuestPhase;
  /** Wie viel Geduld noch übrig ist, in Sekunden. */
  readonly patience: number;
  /** Wie viel er am Anfang hatte — für den Balken. */
  readonly patienceMax: number;
  /** Wie lange er noch isst, in Sekunden. */
  readonly eat: number;
  /** Beim Gehen: zufrieden oder nicht. `null`, solange er nicht geht. */
  readonly happy: boolean | null;
}

/** Wo der Tag gerade steht. */
export type DayPhase =
  /** Vor dem ersten Tag: der Startbildschirm. */
  | 'ready'
  /** Der Laden hat offen, Gäste kommen. */
  | 'open'
  /** Ladenschluss — es kommt niemand mehr, die letzten werden bedient. */
  | 'closing'
  /** Der Tag ist vorbei; die Bilanz steht da, bis jemand den nächsten öffnet. */
  | 'closed'
  /** Zu viele Gäste verloren: Die Runde ist vorbei. */
  | 'over';

export interface Shift {
  readonly day: number;
  readonly phase: DayPhase;
  /** Sekunden seit Öffnung. */
  readonly time: number;
  /** Sekunden bis zum nächsten Gast. */
  readonly nextGuest: number;
  readonly guests: readonly Guest[];
  readonly nextId: number;
  /** An diesem Tag bedient, verloren, verdient. */
  readonly served: number;
  readonly lost: number;
  readonly coins: number;
  /** Über alle Tage verdient, abzüglich dessen, was eingerichtet wurde — die Kasse. */
  readonly total: number;
  /**
   * **Schmutziges Geschirr** je Tisch (Index wie `table`): Wer gegessen hat,
   * lässt seinen Teller stehen. An einen Tisch mit Geschirr setzt sich
   * niemand, bis es abgeräumt ist — und der Teller fehlt am Stapel, bis er
   * gespült ist.
   */
  readonly dirty: readonly number[];
  /** Wie viele Deko-Stücke im Laden stehen (`decorPatience`). */
  readonly decor: number;
  /** Zustand des Würfels — damit ein Test denselben Tag zweimal sieht. */
  readonly seed: number;
}

/** Der Laden vor dem ersten Tag. */
export function newShift(seed = 1): Shift {
  return {
    day: 0,
    phase: 'ready',
    time: 0,
    nextGuest: 0,
    guests: [],
    nextId: 1,
    served: 0,
    lost: 0,
    coins: 0,
    total: 0,
    dirty: [],
    decor: 0,
    seed: seed >>> 0 || 1,
  };
}

/**
 * **Den nächsten Tag aufmachen** — aus der Bilanz oder vom Startbildschirm.
 *
 * Nach dem Ende einer Runde (`over`) fängt es wieder bei Tag 1 an, mit leerer
 * Kasse. Während offen ist, tut der Knopf nichts: Ein Tag, den man mitten im
 * Betrieb neu anfangen könnte, wäre ein Knopf gegen das Verlieren.
 */
export function openDay(shift: Shift): Shift {
  if (shift.phase === 'open' || shift.phase === 'closing') return shift;
  const fresh = shift.phase === 'over' || shift.phase === 'ready';
  return {
    ...shift,
    day: fresh ? 1 : shift.day + 1,
    phase: 'open',
    time: 0,
    // Der erste Gast kommt gleich — nach drei Sekunden, damit man sich
    // umdrehen kann, und nicht erst nach einem vollen Abstand.
    nextGuest: 3,
    guests: [],
    served: 0,
    lost: 0,
    coins: 0,
    total: fresh ? 0 : shift.total,
    // **Über Nacht wird gespült**: Der neue Tag fängt mit sauberen Tischen an
    // — und nach dem Ende der Runde ohne Deko (die Welt räumt sie weg).
    dirty: [],
    decor: fresh ? 0 : shift.decor,
  };
}

/** Was in einem Schritt passiert ist — die Welt zeigt es (Figur, Ton, Zeile). */
export type ShiftEvent =
  | { readonly kind: 'arrive'; readonly guest: Guest }
  | { readonly kind: 'angry'; readonly guest: Guest }
  | { readonly kind: 'paid'; readonly guest: Guest; readonly coins: number }
  | { readonly kind: 'closing' }
  | { readonly kind: 'dayOver' }
  | { readonly kind: 'gameOver' };

export interface ShiftTick {
  readonly shift: Shift;
  readonly events: readonly ShiftEvent[];
}

/** Ein Würfel aus dem Zustand: Zahl 0…1 und der neue Zustand (mulberry32). */
export function roll(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) >>> 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: next };
}

/** Welche Tische gerade frei sind — an keinem sitzt und zu keinem läuft jemand. */
export function freeTables(shift: Shift, tables: number): number[] {
  const taken = new Set(shift.guests.filter((g) => g.phase !== 'walkOut').map((g) => g.table));
  const out: number[] = [];
  // Auch **kein schmutziges Geschirr**: An einen Tisch mit leeren Tellern
  // setzt sich niemand.
  for (let i = 0; i < tables; i++) if (!taken.has(i) && dirtyAt(shift, i) === 0) out.push(i);
  return out;
}

/** Wie viele schmutzige Teller auf diesem Tisch stehen. */
export function dirtyAt(shift: Shift, table: number): number {
  return shift.dirty[table] ?? 0;
}

function withDirty(dirty: readonly number[], table: number, delta: number): number[] {
  const out = [...dirty];
  while (out.length <= table) out.push(0);
  out[table] = Math.max(0, (out[table] ?? 0) + delta);
  return out;
}

/**
 * **Einen schmutzigen Teller vom Tisch nehmen** — `null`, wenn keiner da ist.
 * Abräumen geht immer, auch während am Tisch noch jemand isst.
 */
export function clearDish(shift: Shift, table: number): Shift | null {
  if (dirtyAt(shift, table) <= 0) return null;
  return { ...shift, dirty: withDirty(shift.dirty, table, -1) };
}

/**
 * **Ein Schritt des Tages** — `dt` Sekunden weiter.
 *
 * Reihenfolge: erst die Uhr (Ladenschluss?), dann die Gäste (Geduld, Essen),
 * dann der nächste Gast. Ein Gast, dessen Geduld in diesem Schritt abläuft,
 * steht auf und geht **zuerst** — sein Tisch ist dann im selben Schritt schon
 * wieder frei für den nächsten.
 *
 * `tables` ist die Zahl der Tische: Ist keiner frei, wartet der nächste Gast
 * draußen, bis einer frei wird — er kommt nicht in einen vollen Laden und
 * stellt sich dort in den Weg. Sein Abstand läuft dabei nicht weiter ab als
 * bis null.
 */
export function stepShift(shift: Shift, dt: number, tables: number): ShiftTick {
  if (shift.phase !== 'open' && shift.phase !== 'closing') return { shift, events: [] };
  const step = Math.max(0, dt);
  const events: ShiftEvent[] = [];
  const rules = dayRules(shift.day);
  const served = shift.served;
  let { phase, lost, coins, total, seed, nextId } = shift;
  const time = shift.time + step;

  if (phase === 'open' && time >= rules.open) {
    phase = 'closing';
    events.push({ kind: 'closing' });
  }

  let dirty = shift.dirty;
  const guests: Guest[] = [];
  /** Gruppen, deren Geduld in diesem Schritt gerissen ist — sie gehen zusammen. */
  const stormed = new Set<number>();
  for (const guest of shift.guests) {
    if (guest.phase === 'waiting' && guest.patience - step <= 0) stormed.add(guest.group);
  }
  lost += stormed.size;
  for (const guest of shift.guests) {
    // **Eine Gruppe geht zusammen**: Reißt einem die Geduld, stehen alle auf,
    // die noch auf ihr Essen warten oder erst hereinkommen. Wer schon isst,
    // isst auf. Verloren ist damit **ein** Tisch und nicht zwei Leben.
    if (stormed.has(guest.group) && (guest.phase === 'waiting' || guest.phase === 'walkIn')) {
      const angry: Guest = { ...guest, patience: 0, phase: 'walkOut', happy: false };
      events.push({ kind: 'angry', guest: angry });
      guests.push(angry);
      continue;
    }
    if (guest.phase === 'waiting') {
      guests.push({ ...guest, patience: guest.patience - step });
      continue;
    }
    if (guest.phase === 'eating') {
      const eat = guest.eat - step;
      if (eat <= 0) {
        const pay = bill(guest);
        const done: Guest = { ...guest, eat: 0, phase: 'walkOut', happy: true };
        coins += pay;
        total += pay;
        // Der Teller bleibt stehen — schmutzig, bis jemand abräumt.
        dirty = withDirty(dirty, guest.table, 1);
        events.push({ kind: 'paid', guest: done, coins: pay });
        guests.push(done);
        continue;
      }
      guests.push({ ...guest, eat });
      continue;
    }
    guests.push(guest);
  }

  if (lost >= rules.lives) {
    events.push({ kind: 'gameOver' });
    return {
      shift: { ...shift, phase: 'over', time, guests, lost, served, coins, total, seed, dirty },
      events,
    };
  }

  let nextGuest = shift.nextGuest;
  if (phase === 'open') {
    nextGuest = Math.max(0, nextGuest - step);
    const free = freeTables({ ...shift, guests, dirty }, tables);
    if (nextGuest <= 0 && free.length > 0) {
      const a = roll(seed);
      const b = roll(a.seed);
      const c = roll(b.seed);
      const p = roll(c.seed);
      const o = roll(p.seed);
      seed = o.seed;
      const table = free[Math.floor(a.value * free.length)]!;
      const menu = MENU.slice(0, rules.menu);
      // **Das Neue zuerst**: Am Tag, an dem ein Rezept dazukommt, bestellt
      // es jeder zweite Gast — sonst lernt man es erst am Tag danach.
      const fresh = rules.menu > 1 && b.value < 0.5;
      const pick = fresh ? menu[menu.length - 1]! : menu[Math.floor(b.value * menu.length)]!;
      const size = p.value < rules.pairs ? 2 : 1;
      // Zu zweit wartet man etwas länger — es gibt ja jemanden zum Reden.
      const patience = rules.patience * decorPatience(shift.decor) * (size > 1 ? 1.15 : 1);
      const group = nextId;
      for (let seat = 0; seat < size; seat++) {
        // Der Zweite sucht sich selbst etwas aus — „das Neue zuerst" gilt nur
        // für den, der die Tür aufmacht.
        const order = seat === 0 ? pick : menu[Math.floor(o.value * menu.length)]!;
        const guest: Guest = {
          id: nextId++,
          table,
          seat,
          group,
          order: order.recipe,
          phase: 'walkIn',
          patience,
          patienceMax: patience,
          eat: EAT_SECONDS,
          happy: null,
        };
        guests.push(guest);
        events.push({ kind: 'arrive', guest });
      }
      // Der Abstand schwankt um ein Viertel, damit die Gäste nicht im Takt
      // eines Metronoms hereinkommen.
      nextGuest = rules.gap * (0.75 + c.value * 0.5);
    }
  }

  let dayPhase: DayPhase = phase;
  if (phase === 'closing' && guests.length === 0) {
    dayPhase = 'closed';
    events.push({ kind: 'dayOver' });
  }

  return {
    shift: {
      ...shift,
      phase: dayPhase,
      time,
      nextGuest,
      guests,
      nextId,
      served,
      lost,
      coins,
      total,
      seed,
      dirty,
    },
    events,
  };
}

/**
 * **Was ein Gast zahlt**: den Preis seines Rezepts und Trinkgeld nach der
 * Geduld, die beim Servieren noch übrig war — wer schnell ist, verdient mehr.
 */
export function bill(guest: Guest): number {
  const price = menuItem(guest.order).price;
  const share = guest.patienceMax > 0 ? guest.patience / guest.patienceMax : 0;
  return price + Math.round(MAX_TIP * Math.min(1, Math.max(0, share)));
}

/** Die Figur sitzt: Ab jetzt wartet der Gast, und seine Geduld läuft. */
export function seatGuest(shift: Shift, id: number): Shift {
  return {
    ...shift,
    guests: shift.guests.map((g) =>
      g.id === id && g.phase === 'walkIn' ? { ...g, phase: 'waiting' } : g,
    ),
  };
}

/** Die Figur ist draußen: Der Gast verschwindet aus dem Laden. */
export function guestGone(shift: Shift, id: number): Shift {
  const guests = shift.guests.filter((g) => !(g.id === id && g.phase === 'walkOut'));
  if (guests.length === shift.guests.length) return shift;
  const closed = shift.phase === 'closing' && guests.length === 0;
  return { ...shift, guests, phase: closed ? 'closed' : shift.phase };
}

/** Wer an diesem Tisch sitzt (oder zu ihm läuft) — oder `null`. */
export function guestAt(shift: Shift, table: number): Guest | null {
  return shift.guests.find((g) => g.table === table && g.phase !== 'walkOut') ?? null;
}

/** Alle an diesem Tisch, die noch da sind (nicht gehen) — Nordstuhl zuerst. */
export function guestsAt(shift: Shift, table: number): Guest[] {
  return shift.guests
    .filter((g) => g.table === table && g.phase !== 'walkOut')
    .sort((a, b) => a.seat - b.seat);
}

/** Was an diesem Tisch noch fehlt — die Bestellungen der Wartenden, als Namen. */
export function tableWants(shift: Shift, table: number): string[] {
  return guestsAt(shift, table)
    .filter((g) => g.phase === 'waiting')
    .map((g) => menuItem(g.order).label);
}

/** Was beim Servieren an einem Tisch herauskommt. */
export type ServeResult =
  /** Richtig: Der Gast isst. */
  | { readonly ok: true; readonly shift: Shift; readonly guest: Guest }
  /** Nichts passiert — und warum, als Satz. */
  | { readonly ok: false; readonly why: string };

/**
 * **Welches Rezept ein Teller ist** — die Id aus `MENU`, oder `null`.
 *
 * Streng, anders als an der Theke der Testküche (`kitchenRecipes.served`, die
 * alles mit Brötchen und Patty annimmt): Ein Gast hat **bestellt**, und ein
 * Burger nach Art des Hauses ist nicht das, was er bestellt hat. Und auf einem
 * **Teller** muss er liegen — ein Brötchen in der bloßen Hand bringt man
 * niemandem an den Tisch.
 */
export function plateRecipe(d: Dish | null): Recipe | null {
  if (!d || d.item !== 'plate') return null;
  if (!served(d)) return null;
  return recipeOf(contentsOf(d));
}

/**
 * **Einen Teller an einen Tisch bringen.**
 *
 * Es geht nur, wenn dort jemand **wartet** — wer noch läuft, hat noch nicht
 * bestellt, wer isst, hat schon. Und nur das Bestellte: Der falsche Burger
 * bleibt in der Hand, mit einem Satz, was gewollt war.
 */
export function serveTable(shift: Shift, table: number, d: Dish | null): ServeResult {
  const here = guestsAt(shift, table);
  if (!here.length) return { ok: false, why: 'An diesem Tisch sitzt niemand' };
  const waiting = here.filter((g) => g.phase === 'waiting');
  if (!waiting.length) {
    return here.some((g) => g.phase === 'walkIn')
      ? { ok: false, why: 'Der Gast setzt sich gerade erst' }
      : { ok: false, why: 'Hier wird schon gegessen' };
  }
  const said = [...new Set(waiting.map((g) => menuItem(g.order).label))].join(' und ');
  const recipe = plateRecipe(d);
  if (!d) return { ok: false, why: `Bestellt: ${said}` };
  if (d.item !== 'plate') return { ok: false, why: 'Serviert wird auf einem Teller' };
  if (!recipe) return { ok: false, why: `Das ist noch kein ${said}` };
  // In einer Gruppe bekommt es der, der es bestellt hat — und bei zweimal
  // demselben der Ungeduldigere.
  const guest = waiting
    .filter((g) => g.order === recipe.id)
    .sort((a, b) => a.patience - b.patience)[0];
  if (!guest) {
    return { ok: false, why: `Falscher Burger — bestellt war ${said}` };
  }
  const eating: Guest = { ...guest, phase: 'eating', eat: EAT_SECONDS };
  return {
    ok: true,
    guest: eating,
    shift: {
      ...shift,
      served: shift.served + 1,
      guests: shift.guests.map((g) => (g.id === guest.id ? eating : g)),
    },
  };
}

/** Der Anteil 0…1 für den Geduldsbalken — voll heißt: viel Zeit. */
export function patienceShare(guest: Guest): number {
  if (guest.patienceMax <= 0) return 0;
  return Math.min(1, Math.max(0, guest.patience / guest.patienceMax));
}

/** Wie lange der Laden noch offen hat, in ganzen Sekunden (nie unter null). */
export function timeLeft(shift: Shift): number {
  if (shift.phase !== 'open') return 0;
  return Math.max(0, Math.ceil(dayRules(shift.day).open - shift.time));
}

/** Minuten und Sekunden, wie auf einer Uhr: `1:05`. */
export function clockText(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * **Die Zeile auf der Anzeigetafel** — Tag, Uhr, bedient, verloren, Kasse.
 */
export function boardLine(shift: Shift): string {
  const rules = dayRules(Math.max(1, shift.day));
  const clock =
    shift.phase === 'open'
      ? clockText(timeLeft(shift))
      : shift.phase === 'closing'
        ? 'Schluss'
        : '–';
  return `Tag ${Math.max(1, shift.day)} · ${clock} · bedient ${shift.served} · verloren ${shift.lost}/${rules.lives} · ${shift.coins} Münzen`;
}

/** Der Text auf dem Start- und Endschild — je nach Phase. */
export function signText(shift: Shift): { title: string; body: string } {
  switch (shift.phase) {
    case 'ready':
      return {
        title: 'Restaurant',
        body: [
          'Gäste kommen, setzen sich und bestellen.',
          'Brötchen + Patty vom Grill (+ Salat oder Tomate vom Brett)',
          'auf einen Teller legen und an den Tisch bringen.',
          'Schmutziges Geschirr abräumen und spülen.',
          'Drei hungrige Tische, und der Laden macht zu.',
          'Start: die Glocke links an der Durchreiche.',
        ].join('\n'),
      };
    case 'closed':
      return {
        title: `Tag ${shift.day} geschafft!`,
        body: [
          `Bedient: ${shift.served}   Verloren: ${shift.lost}`,
          `Verdient: ${shift.coins} Münzen   Kasse: ${shift.total}`,
          '',
          `Morgen: ${nextDayNote(shift.day + 1)}`,
          'Einrichten: Baupläne rechts im Gang aufheben und',
          'hinstellen. Glocke: nächsten Tag öffnen.',
        ].join('\n'),
      };
    case 'over':
      return {
        title: 'Der Laden macht zu',
        body: [
          `Zu viele Gäste sind hungrig gegangen — an Tag ${shift.day}.`,
          `Kasse insgesamt: ${shift.total} Münzen`,
          '',
          'Glocke: neu anfangen.',
        ].join('\n'),
      };
    default:
      return { title: `Tag ${shift.day}`, body: '' };
  }
}

/**
 * **Alle nach Hause** — wenn der Laden zumacht (`over`), stehen die, die noch
 * sitzen, auf und gehen; wer schon isst, geht zufrieden, alle anderen nicht.
 * Die Welt schickt die Figuren hinaus und meldet sie mit `guestGone` ab, wie
 * an jedem anderen Abend auch.
 */
export function sendHome(shift: Shift): Shift {
  return {
    ...shift,
    guests: shift.guests.map((g) =>
      g.phase === 'walkOut' ? g : { ...g, phase: 'walkOut', happy: g.phase === 'eating' },
    ),
  };
}

/** Was am nächsten Tag neu ist — ein halber Satz fürs Schild. */
export function nextDayNote(day: number): string {
  const today = dayRules(day - 1);
  const next = dayRules(day);
  if (next.menu > today.menu) return `neu auf der Karte: ${MENU[next.menu - 1]!.label}`;
  return 'mehr Gäste, weniger Geduld';
}
