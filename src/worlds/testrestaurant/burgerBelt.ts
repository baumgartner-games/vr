import { bits } from '../elements/elementCatalog';

/**
 * **Das Förderband, das einen Burger ganz von allein baut** — gewünscht:
 * _„exemplarisch den Aufbau der Förderbänder, die einen Burger komplett von
 * alleine machen"_.
 *
 * Am Westende legt die Brötchenkiste eine untere Hälfte aufs Band. Das Band
 * trägt sie nach Osten an den Stationen vorbei, und jede legt ihre Schicht
 * obenauf, sobald der Burger an ihr vorbeikommt: das Patty vom Herd, Salat,
 * Tomate, Käse, zuletzt der Deckel. Am Ostende steht er fertig auf dem Teller
 * und wird nach einer Weile abgeholt.
 *
 * **Reine Rechnung ohne Uhr im Inneren**: Aus der vergangenen Zeit folgt, wo
 * jeder Burger steht und welche Schichten er hat (`beltBurgers`). Die Welt
 * fragt jedes Bild und zeichnet, was herauskommt; ein Test rechnet dieselbe
 * Kette nach (`burgerBelt.test.ts`).
 */

/** Eine Station am Band: wo sie steht (Meter ab dem Anfang) und was sie auflegt. */
export interface BeltStation {
  readonly id: string;
  readonly label: string;
  /**
   * Das Spielelement an der Nordseite des Bands (`elements/elementCatalog`) —
   * es steht dort und sperrt, mehr nicht: Was es auflegt, rechnet das Band.
   */
  readonly element: string;
  /** Sein Modell im Regal, dasselbe wie im Element. */
  readonly model: string;
  /** Was dazu auf dem Möbel steht — die Pfanne auf dem Herd. */
  readonly extra?: string;
  /** Wo am Band, in Metern ab dem Westende: die Mitte ihrer Kachel. */
  readonly at: number;
  /** Die Schicht, die sie auf den Burger legt. */
  readonly layer: string;
}

export const BELT_STATIONS: readonly BeltStation[] = [
  {
    id: 'bun',
    label: 'Brötchen',
    element: 'crate-buns',
    model: bits('crate_buns'),
    at: 0.5,
    layer: bits('food_ingredient_bun_bottom'),
  },
  {
    id: 'grill',
    label: 'Grill',
    element: 'stove',
    model: bits('stove_single'),
    extra: bits('pan_A'),
    at: 2.5,
    layer: bits('food_ingredient_burger_cooked'),
  },
  {
    id: 'lettuce',
    label: 'Salat',
    element: 'crate-lettuce',
    model: bits('crate_lettuce'),
    at: 4.5,
    layer: bits('food_ingredient_lettuce_slice'),
  },
  {
    id: 'tomato',
    label: 'Tomate',
    element: 'crate-tomatoes',
    model: bits('crate_tomatoes'),
    at: 6.5,
    layer: bits('food_ingredient_tomato_slice'),
  },
  {
    id: 'cheese',
    label: 'Käse',
    element: 'crate-cheese',
    model: bits('crate_cheese'),
    at: 8.5,
    layer: bits('food_ingredient_cheese_slice'),
  },
  {
    id: 'top',
    label: 'Deckel',
    element: 'crate-buns',
    model: bits('crate_buns'),
    at: 10.5,
    layer: bits('food_ingredient_bun_top'),
  },
];

/** Der fertige Burger, wie er am Ende auf dem Teller steht. */
export const BELT_DONE = bits('food_burger');
export const BELT_PLATE = bits('plate');

/** Wie schnell das Band läuft, in Metern je Sekunde. */
export const BELT_SPEED = 0.6;
/** Alle wie viele Sekunden die Brötchenkiste ein neues Brötchen auflegt. */
export const BELT_EVERY = 4;
/** Wie lange ein fertiger Burger am Ende steht, bevor er abgeholt wird. */
export const BELT_REST = 3;

/** Ein Burger auf dem Band, wie er gerade aussieht. */
export interface BeltBurger {
  /** Der wievielte seit dem Start — bleibt ihm, solange er lebt. */
  readonly serial: number;
  /** Wo er steht, in Metern ab dem Westende. */
  readonly at: number;
  /** Die Schichten von unten nach oben, solange er nicht fertig ist. */
  readonly layers: readonly string[];
  /** Fertig: am Ende angekommen, jetzt ein Burger auf dem Teller. */
  readonly done: boolean;
}

/**
 * **Was gerade auf dem Band liegt**, `time` Sekunden nach dem Start.
 *
 * Der `n`-te Burger wird zur Zeit `n · BELT_EVERY` am ersten Platz gelegt und
 * fährt von dort mit `BELT_SPEED`. Eine Schicht kommt dazu, sobald er die
 * Mitte ihrer Station erreicht hat. Am Ende (`length`) bleibt er stehen, wird
 * zum fertigen Burger und nach `BELT_REST` Sekunden abgeholt.
 */
export function beltBurgers(time: number, length: number): BeltBurger[] {
  const start = BELT_STATIONS[0]!.at;
  const travel = (length - start) / BELT_SPEED;
  const life = travel + BELT_REST;
  const out: BeltBurger[] = [];
  if (time < 0) return out;
  const newest = Math.floor(time / BELT_EVERY);
  const oldest = Math.max(0, Math.ceil((time - life) / BELT_EVERY));
  for (let serial = oldest; serial <= newest; serial++) {
    const age = time - serial * BELT_EVERY;
    if (age < 0 || age > life) continue;
    const at = Math.min(length, start + age * BELT_SPEED);
    const done = age >= travel;
    const layers = done
      ? []
      : BELT_STATIONS.filter((station) => at >= station.at).map((station) => station.layer);
    out.push({ serial, at, layers, done });
  }
  return out;
}

/** Wie viele Burger das Band bis `time` fertig gemacht hat. */
export function beltFinished(time: number, length: number): number {
  const start = BELT_STATIONS[0]!.at;
  const travel = (length - start) / BELT_SPEED;
  if (time < travel) return 0;
  return Math.floor((time - travel) / BELT_EVERY) + 1;
}
