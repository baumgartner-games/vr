/**
 * **Was es in der Küche zu essen gibt** — Zutaten, ihre Stufen, das Zusammen-
 * legen und die Rezepte daraus. Ohne three.js, ohne Datei, ohne Zone.
 *
 * Getrennt von `kitchenCarry.ts` aus demselben Grund, aus dem der Möbelkatalog
 * neben dem Lader steht (`core/kitchenFit.ts`): Dort steht, **was `A` tut**,
 * hier steht, **woraus ein Burger besteht**. Beides ändert sich unabhängig
 * voneinander — ein fünftes Rezept ist eine Zeile in `RECIPES` und keine Zeile
 * in der Regel daneben. Die **Uhr am Herd** (Braten, Verbrennen) steht in
 * `kitchenClock.ts`, die **Arbeit an einer Station** (Schneiden, Spülen) in
 * `kitchenWork.ts` — beides, weil es das einzige ist, was auch ohne
 * Knopfdruck weiterläuft.
 *
 * **Der Träger ist das Neue.** Früher war ein getragenes Ding ein einzelner
 * Name, und ein Burger entstand nur auf einer eigenen Anrichte — ein Möbel,
 * das es bei _Overcooked_ gar nicht gibt. Jetzt ist jedes Ding ein `Dish`:
 * etwas, auf dem etwas liegen **kann**. Teller, Brötchen und Pfanne nehmen
 * auf, alles andere nicht. Damit fällt die Anrichte weg und das Kombinieren
 * geht überall — in der Hand, auf der Zeile, auf dem Brett, im Herd.
 *
 * **Drei Sorten Zutat**, und der Unterschied ist die halbe Küche:
 *
 * - **Roh** (`patty`, `lettuce`, `tomato`): kommt aus der Kiste und gehört auf
 *   keinen Träger außer die Pfanne (das Patty). Wer es trotzdem auflegen will,
 *   liest, warum nicht — und was stattdessen zu tun ist.
 * - **Fertig** (`patty-cooked`, `lettuce-cut`, `tomato-cut`, `tomato-soup`):
 *   aus der Pfanne oder vom Brett, und erst das darf auf den Burger.
 * - **Verdorben** (`patty-burnt`): geht **nur noch in den Müll**. Früher durfte
 *   es auf Teller und Brötchen, damit man den Mist wieder abräumen kann — das
 *   Ergebnis war ein Burger, den man baut, an die Theke trägt und dort erst als
 *   verdorben vorgelesen bekommt. Verbranntes fällt jetzt schon beim Auflegen
 *   durch, und zwar mit dem Satz, der den Weg zum Mülleimer nennt. Aus der
 *   Pfanne kommt es ohnehin nicht heraus, ohne dass man sie auskippt.
 *
 * Das Brötchen hat keine Verarbeitung: Es kommt aus der Kiste und ist selbst
 * der Träger. Ein Brötchen, das erst aufgeschnitten werden müsste, wäre ein
 * vierter Handgriff für nichts.
 *
 * **Und dann ist da noch das Geschirr.** Ein Teller ist entweder sauber
 * (`plate`) oder dreckig (`plate-dirty`), und der dreckige ist weder Träger
 * noch Essen: Auf ihn legt man nichts, und in den Müll gehört er erst recht
 * nicht — er gehört in die Spüle (`kitchenWork.ts`). `isDishware` fasst beide
 * zusammen, weil die Spüle und die Rückgabe nach _Geschirr_ fragen und nicht
 * nach _sauber oder dreckig_.
 */

/** Was sich in der Küche tragen lässt. */
export type KitchenItem =
  /** Gerät — es wird nie zu Essen. */
  | 'pot'
  | 'pan'
  | 'extinguisher'
  /** Träger: Sie nehmen auf, was fertig ist. */
  | 'plate'
  | 'bun'
  /** Geschirr, das erst durch die Spüle muss — trägt nichts. */
  | 'plate-dirty'
  /** Das Patty und seine drei Stufen. */
  | 'patty'
  | 'patty-cooked'
  | 'patty-burnt'
  /** Was geschnitten wird, und was daraus wird. */
  | 'lettuce'
  | 'lettuce-cut'
  | 'tomato'
  | 'tomato-cut'
  | 'tomato-soup';

/**
 * **Wie die Dinge heißen** — und jeder Name steht im **Singular**, auch die
 * Tomatenscheibe.
 *
 * Diese Namen landen mitten in Sätzen („… liegt schon drauf"), und ein Plural
 * darunter bräuchte jedes Mal ein zweites Verb. Eine Namenstabelle, die in
 * jedem Satz passt, ist mehr wert als eine, die einmal schöner klingt.
 */
export const ITEM_LABELS: Record<KitchenItem, string> = {
  pot: 'Topf',
  pan: 'Pfanne',
  extinguisher: 'Feuerlöscher',
  plate: 'Teller',
  bun: 'Brötchen',
  'plate-dirty': 'Dreckiger Teller',
  patty: 'Rohes Patty',
  'patty-cooked': 'Gebratenes Patty',
  'patty-burnt': 'Verbranntes Patty',
  lettuce: 'Salatkopf',
  'lettuce-cut': 'Geschnittener Salat',
  tomato: 'Tomate',
  'tomato-cut': 'Tomatenscheibe',
  'tomato-soup': 'Tomatensuppe',
};

/**
 * **Ein Ding in der Hand, auf einer Ablage, in der Pfanne** — und was
 * darauf liegt.
 *
 * `on` ist **flach** und eine **Menge**: Ein Teller mit einem belegten
 * Brötchen trägt `['bun', 'patty-cooked', 'tomato-cut']` und nicht ein
 * Brötchen, das seinerseits etwas trägt. Ein Baum wäre ehrlicher und wäre beim
 * ersten Rezept schon eine Rekursion — jede Frage („ist da ein gebratenes
 * Patty drin?") müsste absteigen, und die Darstellung müsste es auch. Flach
 * ist die Antwort ein `includes`.
 *
 * Alles ist unveränderlich: Eine Tat gibt den **neuen** Zustand zurück, statt
 * am alten zu drehen. Die Zone hält denselben `Dish` an zwei Stellen
 * (getragen und auf der Station gemerkt), und ein `push` an der einen wäre ein
 * Fehler an der anderen.
 */
export interface Dish {
  readonly item: KitchenItem;
  /** Was darauf/darin liegt — leer bei allem, was kein Träger ist. */
  readonly on: readonly KitchenItem[];
}

/** Ein Ding, kurz geschrieben — `dish('plate', ['bun'])`. */
export function dish(item: KitchenItem, on: readonly KitchenItem[] = []): Dish {
  return { item, on };
}

/**
 * **Was ein Träger aufnimmt** — und die Tabelle ist zugleich die Antwort auf
 * „warum geht Salat nicht auf ein Patty?": Ein Patty steht hier nicht links.
 *
 * Der **Teller** nimmt alles Fertige und dazu das Brötchen (samt dessen
 * Inhalt); das **Brötchen** alles Fertige außer einem zweiten Brötchen; die
 * **Pfanne** genau ein Patty, in jeder Stufe. Rohes (`patty`, `lettuce`,
 * `tomato`) steht nirgends außer in der Pfanne — es muss erst durch Herd oder
 * Brett.
 *
 * **Verbranntes steht nur noch links bei der Pfanne.** Es auf Teller und
 * Brötchen zu erlauben, war einmal die bequeme Art, den Mist abzuräumen; in
 * Wahrheit baut man damit einen Burger, der an der Theke abgewiesen wird —
 * eine Sackgasse, die erst drei Schritte später auffällt. Die Pfanne behält
 * es, weil es dort ohne Zutun entsteht, und man kippt sie in den Mülleimer
 * aus.
 *
 * Der **dreckige Teller** steht hier gar nicht: Auf ihm liegt nichts, bis er
 * gespült ist.
 */
const TAKES: Partial<Record<KitchenItem, readonly KitchenItem[]>> = {
  plate: ['bun', 'patty-cooked', 'lettuce-cut', 'tomato-cut', 'tomato-soup'],
  bun: ['patty-cooked', 'lettuce-cut', 'tomato-cut', 'tomato-soup'],
  pan: ['patty', 'patty-cooked', 'patty-burnt'],
};

/** Ob auf diesem Ding überhaupt etwas liegen kann. */
export function isCarrier(item: KitchenItem): boolean {
  return TAKES[item] !== undefined;
}

/**
 * **Ob dieses Ding Geschirr ist** — sauber oder dreckig, beides zählt.
 *
 * Spüle und Rückgabe (`kitchenCarry.StationKind`) fragen genau das: Was dort
 * hineingehört, unterscheidet sich vom Essen und vom Gerät, nicht vom
 * Zustand. `isCarrier` taugt dafür nicht — der dreckige Teller trägt nichts,
 * ist aber trotzdem Geschirr.
 */
export function isDishware(item: KitchenItem): boolean {
  return item === 'plate' || item === 'plate-dirty';
}

/** Ob dieser Träger diese Zutat aufnimmt — ohne Ansehen dessen, was schon daraufliegt. */
export function carries(carrier: KitchenItem, item: KitchenItem): boolean {
  return TAKES[carrier]?.includes(item) ?? false;
}

/**
 * **Was aus einer Zutat auf dem Brett wird** — oder `null`, weil sie dort
 * nichts zu suchen hat.
 *
 * Zwei Stufen bei der Tomate, und das ist kein Spaß, sondern die Probe darauf,
 * dass eine **zweite** Schnittstufe überhaupt geht: Wer aus Scheiben Suppe
 * macht, hat den Fortschritt zweimal von vorn laufen lassen.
 */
const CHOPS: Partial<Record<KitchenItem, KitchenItem>> = {
  lettuce: 'lettuce-cut',
  tomato: 'tomato-cut',
  'tomato-cut': 'tomato-soup',
};

export function chopStage(item: KitchenItem): KitchenItem | null {
  return CHOPS[item] ?? null;
}

/**
 * **Was aus einem Patty in der Pfanne wird** — roh wird gebraten, gebraten
 * wird verbrannt, und danach ist Schluss.
 *
 * Nach `patty-burnt` kommt kein Ding mehr, sondern **Feuer**, und Feuer ist
 * kein `KitchenItem`, sondern ein Zustand des Herdes (`kitchenClock.ts`).
 * Deshalb endet die Tabelle hier und nicht bei einem `'fire'`, das niemand in
 * die Hand nehmen könnte.
 */
const FRIES: Partial<Record<KitchenItem, KitchenItem>> = {
  patty: 'patty-cooked',
  'patty-cooked': 'patty-burnt',
};

export function fryStage(item: KitchenItem): KitchenItem | null {
  return FRIES[item] ?? null;
}

/**
 * **Was einer rohen Zutat fehlt**, als Partizip für den Satz „… muss erst
 * gebraten werden".
 *
 * Eine eigene kleine Tabelle statt einer Ableitung aus `CHOPS`/`FRIES`: Aus
 * `tomato-cut` wird zwar noch Suppe, roh ist sie aber nicht mehr — sie darf
 * auf den Burger. „Roh" heißt hier **muss noch**, nicht **kann noch**.
 */
const RAW: Partial<Record<KitchenItem, string>> = {
  patty: 'gebraten',
  lettuce: 'geschnitten',
  tomato: 'geschnitten',
};

/** Ob dieses Ding erst noch durch Herd oder Brett muss. */
export function isRaw(item: KitchenItem): boolean {
  return RAW[item] !== undefined;
}

/**
 * Was der Mülleimer nimmt — Essen, und sonst nichts. Geschirr steht auch dann
 * nicht darin, wenn es dreckig ist: Ein dreckiger Teller ist kein Abfall,
 * sondern Arbeit, und die wartet in der Spüle.
 */
const FOOD: readonly KitchenItem[] = [
  'bun',
  'patty',
  'patty-cooked',
  'patty-burnt',
  'lettuce',
  'lettuce-cut',
  'tomato',
  'tomato-cut',
  'tomato-soup',
];

/** Ob dieses Ding in den Müll darf. */
export function isFood(item: KitchenItem): boolean {
  return FOOD.includes(item);
}

/**
 * **Die Schichtung** — in dieser Reihenfolge liegt ein Burger übereinander.
 *
 * Gelegt wird in beliebiger Reihenfolge (`Dish.on` ist eine Menge), gezeigt
 * wird in dieser: Unten das Brötchen, darauf das Patty, dann Salat, dann
 * Tomate. Die Liste steht hier und nicht in der Darstellung, weil sie zur
 * Frage „was ist ein Burger" gehört und nicht zur Frage „welches Netz liegt
 * auf welcher Höhe" — `kitchenProps` liest sie, statt sie zu wiederholen.
 */
export const STACK_ORDER: readonly KitchenItem[] = [
  'bun',
  'patty',
  'patty-cooked',
  'patty-burnt',
  'lettuce-cut',
  'tomato-cut',
  'tomato-soup',
];

/** Dieselben Zutaten, von unten nach oben sortiert. */
export function layered(on: readonly KitchenItem[]): readonly KitchenItem[] {
  return [...on].sort((a, b) => STACK_ORDER.indexOf(a) - STACK_ORDER.indexOf(b));
}

/**
 * **Woraus dieses Gericht besteht** — das Essen, ohne den Teller darunter.
 *
 * Der Teller ist Geschirr und keine Zutat: Ein Hamburger auf einem Teller ist
 * derselbe Hamburger wie einer in der Hand, und genau deshalb kann man ihn mit
 * und ohne Teller ausgeben. Alles andere zählt sich selbst mit — ein Brötchen
 * ist die unterste Schicht seines eigenen Burgers.
 */
export function contentsOf(d: Dish): readonly KitchenItem[] {
  return d.item === 'plate' ? d.on : [d.item, ...d.on];
}

/** Ob und warum zwei Dinge zusammengehen. */
export type Combined =
  | {
      readonly ok: true;
      /** Was danach in der Hand ist — `null`, wenn sie leer wird. */
      readonly held: Dish | null;
      /** Was danach an der Station liegt — `null`, wenn sie frei wird. */
      readonly target: Dish | null;
      /** Was gewandert ist — für Hinweis und Meldung. */
      readonly moved: readonly KitchenItem[];
    }
  | { readonly ok: false; readonly why: string };

/** Ein Versuch in eine Richtung: Wer gibt, wer nimmt. */
type Pour =
  | { ok: true; give: Dish | null; take: Dish; moved: readonly KitchenItem[] }
  /** `sure` heißt: Dieser Satz erklärt wirklich den Fall — der andere ist nur ein „geht nicht". */
  | { ok: false; why: string; sure: boolean };

/**
 * **Was ein Ding abgibt**, wenn es mit einem Träger zusammenkommt.
 *
 * Zwei Sonderfälle, und beide stehen so in der Spezifikation: Die **Pfanne**
 * gibt ihr Patty her und bleibt selbst stehen, wo sie war — man nimmt aus der
 * Pfanne nichts heraus, man kippt sie aus. Das **Brötchen** wandert dagegen
 * mitsamt seinem Belag auf den Teller: Ein Teller mit Burger ist ein Teller,
 * auf dem ein Brötchen liegt, und kein Teller mit einem Brötchen darauf, das
 * seinerseits etwas trägt.
 */
function offer(d: Dish): { what: readonly KitchenItem[]; rest: Dish | null } {
  if (d.item === 'pan') return { what: d.on, rest: dish('pan') };
  return { what: [d.item, ...d.on], rest: null };
}

/**
 * **Warum diese Zutat nicht auf diesen Träger darf** — und was stattdessen zu
 * tun ist.
 *
 * Die Reihenfolge der Fälle ist die Reihenfolge, in der sie jemandem helfen:
 * Erst das Rohe (dagegen kann man sofort etwas tun), dann das Verbrannte (dagegen
 * auch, nur andersherum), dann die Pfanne (sie ist für genau eine Sache da),
 * dann die beiden Fälle, bei denen man die Träger verwechselt hat.
 */
function whyNot(carrier: KitchenItem, item: KitchenItem): string {
  const fix = RAW[item];
  if (fix) return `${ITEM_LABELS[item]} muss erst ${fix} werden`;
  // **Das Verbrannte bekommt seinen eigenen Satz**, und der nennt den einzigen
  // Weg, der ihm noch bleibt. Ohne ihn stünde hier „Verbranntes Patty gehört
  // nicht auf Teller" — richtig, aber ratlos.
  if (item === 'patty-burnt') return 'Verbranntes Patty gehört in den Müll';
  if (carrier === 'pan') return 'In die Pfanne gehört nur ein Patty';
  if (item === 'bun') return 'Zwei Brötchen werden kein Burger — dafür braucht es einen Teller';
  if (item === 'plate') return 'Ein Teller gehört unter das Essen und nicht darauf';
  return `${ITEM_LABELS[item]} gehört nicht auf ${ITEM_LABELS[carrier]}`;
}

/** Ein Versuch: `giver` kippt in `taker`. */
function pour(giver: Dish, taker: Dish): Pour {
  if (!isCarrier(taker.item)) {
    return {
      ok: false,
      why: `Auf ${ITEM_LABELS[taker.item]} lässt sich nichts legen`,
      sure: false,
    };
  }
  const { what, rest } = offer(giver);
  // Nur die Pfanne kann leer abgeben — jeder andere Träger wandert selbst mit.
  if (!what.length) return { ok: false, why: 'In der Pfanne liegt nichts', sure: true };
  if (taker.item === 'pan') {
    if (taker.on.length) {
      return {
        ok: false,
        why: `In der Pfanne liegt schon ${ITEM_LABELS[taker.on[0]]}`,
        sure: true,
      };
    }
    if (what.length > 1) return { ok: false, why: 'In die Pfanne passt nur ein Patty', sure: true };
  }
  for (const item of what) {
    if (!carries(taker.item, item)) return { ok: false, why: whyNot(taker.item, item), sure: true };
    if (taker.on.includes(item)) {
      return { ok: false, why: `${ITEM_LABELS[item]} liegt schon drauf`, sure: true };
    }
  }
  return { ok: true, give: rest, take: dish(taker.item, [...taker.on, ...what]), moved: what };
}

/** Wenn keiner von beiden ein Träger ist: der hilfreichste Satz dazu. */
function nothingHolds(a: Dish, b: Dish): string {
  const raw = isRaw(a.item) ? a.item : isRaw(b.item) ? b.item : null;
  if (raw) return `${ITEM_LABELS[raw]} muss erst ${RAW[raw]} werden`;
  return `${ITEM_LABELS[a.item]} und ${ITEM_LABELS[b.item]} halten nicht zusammen — es braucht ein Brötchen oder einen Teller darunter`;
}

/**
 * **Zwei Dinge zusammenlegen** — was in der Hand liegt und was an der Station.
 *
 * **Die Reihenfolge ist egal**, und das ist der ganze Witz an dieser Funktion:
 * Es wird beides versucht. Zutat in der Hand auf den Teller an der Zeile, oder
 * Teller in der Hand an die Zutat auf der Zeile — es kommt derselbe Teller
 * dabei heraus, einmal liegen bleibend und einmal in der Hand. Wer bei
 * _Overcooked_ mit dem Teller zur Zutat läuft statt umgekehrt, soll nicht
 * dastehen und nichts verstehen.
 *
 * Geht **keine** Richtung, entscheidet `sure`, welcher der beiden Sätze
 * herauskommt: Der Satz eines Trägers, der die Zutat abgelehnt hat, hilft
 * weiter („muss erst gebraten werden"); der Satz „auf ein Patty lässt sich
 * nichts legen" ist nur die halbe Wahrheit, solange die andere Richtung noch
 * ungeprüft ist.
 */
export function combine(held: Dish, target: Dish): Combined {
  const into = pour(held, target);
  if (into.ok) return { ok: true, held: into.give, target: into.take, moved: into.moved };
  const out = pour(target, held);
  if (out.ok) return { ok: true, held: out.take, target: out.give, moved: out.moved };
  if (into.sure) return { ok: false, why: into.why };
  if (out.sure) return { ok: false, why: out.why };
  return { ok: false, why: nothingHolds(held, target) };
}

/** Ein Rezept: wie es heißt und was daraufgehört. */
export interface Recipe {
  readonly id: string;
  readonly label: string;
  /** Die Zutaten — als **Menge** gelesen, nicht als Reihenfolge. */
  readonly needs: readonly KitchenItem[];
}

/**
 * **Die fünf Burger**, vom nackten bis zum vollen.
 *
 * Alle sind Obermengen des ersten, und das ist Absicht: Man legt auf, was man
 * hat, und bekommt das Rezept, zu dem es passt — statt vorher eines zu wählen
 * und dann die Liste abzuarbeiten. Bei _Overcooked_ sagt der Zettel, was
 * gebraucht wird; hier gibt es noch keine Runde, die Zettel austeilt
 * (`AGENTS.md`), also sagt der Stapel, was daraus geworden ist.
 *
 * **Brötchen und gebratenes Patty sind in jedem drin.** Ein „Burger" aus Salat
 * und Tomate ist ein Salat, und ein Brötchen allein ist ein Brötchen — beides
 * sind keine Rezepte, sondern ein unfertiger Stapel. Der _Suppenburger_ steht
 * mit in der Liste, weil die zweite Schnittstufe sonst nirgends ankäme.
 */
export const RECIPES: readonly Recipe[] = [
  { id: 'hamburger', label: 'Hamburger', needs: ['bun', 'patty-cooked'] },
  { id: 'salat', label: 'Salatburger', needs: ['bun', 'patty-cooked', 'lettuce-cut'] },
  { id: 'tomate', label: 'Tomatenburger', needs: ['bun', 'patty-cooked', 'tomato-cut'] },
  { id: 'suppe', label: 'Suppenburger', needs: ['bun', 'patty-cooked', 'tomato-soup'] },
  {
    id: 'deluxe',
    label: 'Burger Deluxe',
    needs: ['bun', 'patty-cooked', 'lettuce-cut', 'tomato-cut'],
  },
];

/**
 * **Alles, was gebraten ist und trotzdem in keiner Liste steht** — Suppe mit
 * Salat, Tomate mit Suppe, und was sonst noch jemandem einfällt.
 *
 * Ohne diesen Auffangposten wäre jede Zutatenmischung außerhalb der fünf
 * Rezepte an der Ausgabe ein `refuse` — und der Spieler bekäme für zwei
 * ehrliche Arbeitsschritte ein „das ist kein Burger" zu lesen, obwohl ein
 * Brötchen mit gebratenem Patty in seiner Hand liegt. `needs` ist hier das
 * **Mindeste** und nicht die genaue Menge; `recipeOf` gibt ihn nie zurück, er
 * kommt nur aus `served`.
 */
export const FREESTYLE: Recipe = {
  id: 'eigen',
  label: 'Burger nach Art des Hauses',
  needs: ['bun', 'patty-cooked'],
};

/**
 * **Welches Rezept diese Zutaten sind** — oder `null`, solange es keines ist.
 *
 * Verglichen wird als Menge: Wer erst die Tomate und dann das Patty auflegt,
 * hat denselben Burger. Die Reihenfolge entscheidet nur, wie er **aussieht**
 * (`layered`).
 */
export function recipeOf(parts: readonly KitchenItem[]): Recipe | null {
  return (
    RECIPES.find(
      (recipe) =>
        recipe.needs.length === parts.length && recipe.needs.every((need) => parts.includes(need)),
    ) ?? null
  );
}

/**
 * **Reicht das für die Ausgabe?** — das Rezept, unter dem es über die Theke
 * geht, oder `null`.
 *
 * Die Bedingung ist absichtlich weich: ein **Brötchen** und mindestens ein
 * **gebratenes** Patty, mit oder ohne Teller darunter, Extras erlaubt. Hart
 * ist nur das Verbrannte — wer ein schwarzes Patty einbaut, serviert es nicht,
 * sondern räumt es ab. Eine Küche, die nur die fünf Listen annimmt, bestraft
 * das Ausprobieren, und Ausprobieren ist hier der ganze Sinn.
 */
export function served(d: Dish): Recipe | null {
  const parts = contentsOf(d);
  if (parts.includes('patty-burnt')) return null;
  if (!parts.includes('bun') || !parts.includes('patty-cooked')) return null;
  return recipeOf(parts) ?? FREESTYLE;
}

/**
 * **Warum das noch nicht über die Theke geht** — ein Satz, der sagt, was
 * fehlt.
 *
 * Es gibt genau drei Gründe, und jeder hat seinen eigenen nächsten Schritt:
 * kein Brötchen, kein gebratenes Patty, oder etwas Verbranntes dazwischen.
 */
export function whyNotServed(d: Dish): string {
  const parts = contentsOf(d);
  if (parts.includes('patty-burnt')) return 'Verbranntes wird nicht serviert — ab in den Müll';
  if (!parts.includes('bun')) return 'Dafür fehlt noch das Brötchen';
  if (!parts.includes('patty-cooked')) return 'Dafür fehlt noch ein gebratenes Patty';
  return 'Das ist noch kein Burger';
}

/**
 * **Wie ein Gericht heißt, wenn etwas darauf liegt.**
 *
 * Ein fertiges Gericht heißt nach seinem Rezept („Teller mit Hamburger"), ein
 * unfertiges zählt auf, was daraufliegt („Pfanne (Rohes Patty)"). Die Klammer
 * statt eines „mit" ist kein Geschmack, sondern Deutsch: „mit Rohes Patty"
 * wäre falsch, und die richtige Beugung bräuchte eine zweite Namenstabelle nur
 * für den Dativ — zu viel Aufwand für einen Hinweis über einer Figur.
 */
export function dishLabel(d: Dish): string {
  if (!d.on.length) return ITEM_LABELS[d.item];
  const recipe = served(d);
  if (recipe) return `${ITEM_LABELS[d.item]} mit ${recipe.label}`;
  return `${ITEM_LABELS[d.item]} (${layered(d.on)
    .map((item) => ITEM_LABELS[item])
    .join(', ')})`;
}
