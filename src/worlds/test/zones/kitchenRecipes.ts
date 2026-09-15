/**
 * **Was es in der Küche zu essen gibt** — Zutaten, ihre Verarbeitung und die
 * Rezepte daraus. Ohne three.js, ohne Datei, ohne Zone.
 *
 * Getrennt von `kitchenCarry.ts` aus demselben Grund, aus dem der Möbelkatalog
 * neben dem Lader steht (`core/kitchenFit.ts`): Dort steht, **was `A` tut**,
 * hier steht, **woraus ein Burger besteht**. Beides ändert sich unabhängig
 * voneinander — ein fünftes Rezept ist eine Zeile in `RECIPES` und keine Zeile
 * in der Regel daneben.
 *
 * **Drei Sorten Zutat**, und der Unterschied ist die halbe Küche:
 *
 * - **Roh** (`patty`, `lettuce`, `tomato`): kommt aus der Kiste und gehört auf
 *   keinen Burger. Wer es trotzdem auflegen will, liest, warum nicht.
 * - **Verarbeitet** (`patty-cooked`, `lettuce-cut`, `tomato-cut`): aus der
 *   Pfanne oder vom Schneidebrett, und erst das darf auf den Burger.
 * - **Fertig** (`burger`, `plate-burger`): das Ergebnis, einmal für die Hand
 *   und einmal auf dem Teller.
 *
 * Das Brötchen hat keine Verarbeitung: Es kommt aus der Kiste und geht so, wie
 * es ist, auf die Anrichte. Ein Brötchen, das erst aufgeschnitten werden muss,
 * wäre ein vierter Handgriff für nichts.
 */

/** Was sich in der Küche tragen lässt. */
export type KitchenItem =
  /** Das Gerät vom Herd — es wird nie zu Essen. */
  | 'pot'
  | 'pan'
  /** Roh, so wie es aus der Kiste kommt. */
  | 'bun'
  | 'patty'
  | 'lettuce'
  | 'tomato'
  /** Verarbeitet — gebraten oder geschnitten. */
  | 'patty-cooked'
  | 'lettuce-cut'
  | 'tomato-cut'
  /** Angerichtet. */
  | 'burger'
  | 'plate'
  | 'plate-burger';

export const ITEM_LABELS: Record<KitchenItem, string> = {
  pot: 'Topf',
  pan: 'Pfanne',
  bun: 'Brötchen',
  patty: 'Rohes Patty',
  lettuce: 'Salatkopf',
  tomato: 'Tomate',
  'patty-cooked': 'Gebratenes Patty',
  'lettuce-cut': 'Geschnittener Salat',
  'tomato-cut': 'Tomatenscheiben',
  burger: 'Burger',
  plate: 'Teller',
  'plate-burger': 'Teller mit Burger',
};

/**
 * **Was auf einen Burger darf** — und zwar genau das und nichts Rohes.
 *
 * Die Reihenfolge ist zugleich die **Schichtung**: Unten das Brötchen, darauf
 * das Patty, dann Salat, dann Tomate, und die Haube des Brötchens kommt
 * obendrauf (`kitchenProps.FoodKit.burger`). Wer eine Zutat dazwischenschiebt,
 * ändert hier die Reihenfolge und nicht fünf Zahlen in der Darstellung.
 */
export type BurgerPart = 'bun' | 'patty-cooked' | 'lettuce-cut' | 'tomato-cut';

export const BURGER_PARTS: readonly BurgerPart[] = [
  'bun',
  'patty-cooked',
  'lettuce-cut',
  'tomato-cut',
];

export function isBurgerPart(item: KitchenItem): item is BurgerPart {
  return (BURGER_PARTS as readonly KitchenItem[]).includes(item);
}

/**
 * **Was aus einer rohen Zutat wird** — und `null` für alles, was schon fertig
 * ist oder nie geschnitten wird.
 *
 * Eine Tabelle und keine drei `if`: Die Frage „muss das noch geschnitten
 * werden?" wird an drei Stellen gestellt — vom Schneidebrett, von der
 * Anrichte und vom Hinweis über der Figur —, und drei Stellen mit derselben
 * Liste sind zwei zu viel.
 */
const CHOPPED: Partial<Record<KitchenItem, KitchenItem>> = {
  lettuce: 'lettuce-cut',
  tomato: 'tomato-cut',
};

/** Was dieses Ding auf dem Brett wird, oder `null` — es gehört nicht darauf. */
export function chopped(item: KitchenItem): KitchenItem | null {
  return CHOPPED[item] ?? null;
}

/** Was dieses Ding in der Pfanne wird, oder `null` — es gehört nicht hinein. */
export function fried(item: KitchenItem): KitchenItem | null {
  return item === 'patty' ? 'patty-cooked' : null;
}

/**
 * **Wie oft geschnitten wird**, bis aus einem Kopf Salat Salatblätter werden.
 *
 * Drei und nicht einer: Ein Druck, und das Schneidebrett wäre ein Knopf, der
 * die Zutat austauscht. Drei sind die drei Bewegungen, die man bei
 * _Overcooked_ auch macht — und sie sind der Grund, warum jemand am Brett
 * **steht** und nicht bloß daran vorbeigeht.
 */
export const CHOPS = 3;

/**
 * **Wie lange ein Patty braucht**, in Sekunden.
 *
 * Vier: lang genug, dass man in der Zeit etwas anderes schneiden geht, kurz
 * genug, dass niemand vor dem Herd wartet. Verbrennen kann nichts — ein
 * verbranntes Patty wäre eine zweite Uhr und ein zweiter Zustand, und beides
 * ohne Runde, die daraus etwas machte.
 */
export const FRY_SECONDS = 4;

/** Was der Mülleimer nimmt — Essen, und sonst nichts. */
const FOOD: readonly KitchenItem[] = [
  'bun',
  'patty',
  'lettuce',
  'tomato',
  'patty-cooked',
  'lettuce-cut',
  'tomato-cut',
  'burger',
];

/** Ob dieses Ding in den Müll darf. */
export function isFood(item: KitchenItem): boolean {
  return FOOD.includes(item);
}

/** Ein Rezept: wie es heißt und was daraufgehört. */
export interface Recipe {
  readonly id: string;
  readonly label: string;
  /** Die Zutaten — als **Menge** gelesen, nicht als Reihenfolge. */
  readonly needs: readonly BurgerPart[];
}

/**
 * **Die vier Burger**, vom nackten bis zum vollen.
 *
 * Alle vier sind Teilmengen des größten, und das ist Absicht: Man legt auf,
 * was man hat, und bekommt das Rezept, zu dem es passt — statt vorher eines zu
 * wählen und dann die Liste abzuarbeiten. Bei _Overcooked_ sagt der Zettel,
 * was gebraucht wird; hier gibt es noch keine Runde, die Zettel austeilt
 * (`AGENTS.md`), also sagt der Stapel, was daraus geworden ist.
 *
 * **Brötchen und Patty sind in jedem drin.** Ein „Burger" aus Salat und
 * Tomate ist ein Salat, und ein Brötchen allein ist ein Brötchen — beides sind
 * keine Rezepte, sondern ein unfertiger Stapel.
 */
export const RECIPES: readonly Recipe[] = [
  { id: 'hamburger', label: 'Hamburger', needs: ['bun', 'patty-cooked'] },
  { id: 'salat', label: 'Salatburger', needs: ['bun', 'patty-cooked', 'lettuce-cut'] },
  { id: 'tomate', label: 'Tomatenburger', needs: ['bun', 'patty-cooked', 'tomato-cut'] },
  {
    id: 'deluxe',
    label: 'Burger Deluxe',
    needs: ['bun', 'patty-cooked', 'lettuce-cut', 'tomato-cut'],
  },
];

/**
 * **Welches Rezept dieser Stapel ist** — oder `null`, solange es keines ist.
 *
 * Verglichen wird als Menge: Wer erst die Tomate und dann das Patty auflegt,
 * hat denselben Burger. Die Reihenfolge entscheidet nur, wie er **aussieht**,
 * und auch das nicht wirklich — geschichtet wird nach `BURGER_PARTS`.
 */
export function recipeOf(stack: readonly KitchenItem[]): Recipe | null {
  return (
    RECIPES.find(
      (recipe) =>
        recipe.needs.length === stack.length && recipe.needs.every((need) => stack.includes(need)),
    ) ?? null
  );
}

/** Ob und warum eine Zutat auf diesen Stapel darf. */
export type Stacking = { ok: true } | { ok: false; why: string };

/**
 * **Darf das obendrauf?**
 *
 * Drei Gründe, warum nicht, und jeder trägt seinen Satz mit: Es ist gar keine
 * Zutat (der Topf), es ist noch roh (das Patty aus der Kiste), oder es liegt
 * schon eines da. Ein Hinweis, der nur _geht nicht_ sagt, ist ein Hinweis, vor
 * dem man steht und rät.
 */
export function stackable(stack: readonly KitchenItem[], item: KitchenItem): Stacking {
  if (!isBurgerPart(item)) {
    const raw = chopped(item) ? 'geschnitten' : fried(item) ? 'gebraten' : null;
    if (raw) return { ok: false, why: `${ITEM_LABELS[item]} muss erst ${raw} werden` };
    return { ok: false, why: `${ITEM_LABELS[item]} gehört nicht auf einen Burger` };
  }
  if (stack.includes(item)) return { ok: false, why: `${ITEM_LABELS[item]} liegt schon drauf` };
  return { ok: true };
}

/**
 * **Was dem Stapel noch fehlt**, als ein Satz — oder `''`, wenn er fertig ist.
 *
 * Es gibt nur zwei Lücken, die einen Stapel unfertig machen: das Brötchen und
 * das Patty (jede andere Kombination davon ist ein Rezept). Genau die stehen
 * deshalb hier und keine gerechnete Aufzählung.
 */
export function missing(stack: readonly KitchenItem[]): string {
  if (recipeOf(stack)) return '';
  if (!stack.includes('bun')) return 'Es fehlt noch das Brötchen';
  if (!stack.includes('patty-cooked')) return 'Es fehlt noch das gebratene Patty';
  return 'Der Burger ist noch nicht fertig';
}
