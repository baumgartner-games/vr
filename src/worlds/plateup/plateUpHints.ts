import type { KitchenDeed } from '../test/zones/kitchenCarry';
import { ITEM_LABELS, type Dish } from '../test/zones/kitchenRecipes';
import type { StationSpot } from './plateUpPlan';

/**
 * **Was `A` hier genau tut** — das Verb für die Tastenhilfe
 * (`core/controlHints.ts`, Zone `burger`). Ohne three.js.
 *
 * Die Zeile unten sagte im Laden überall nur „Nehmen" oder „Ablegen". Das
 * stimmt, hilft aber nicht: Wer mit dem Burger am Tisch steht, will lesen,
 * dass `A` jetzt **serviert**, und wer an der Spüle steht, dass sie **spült**.
 * Kurz, ein bis drei Wörter — der ganze Satz („Gebratenes Patty auf den
 * Teller") steht weiter über der Station (`usePrompt`).
 *
 * `null` heißt: nichts Besonderes, die Zeile sagt ihr allgemeines Wort.
 */
export function stationAction(
  spot: Pick<StationSpot, 'kind' | 'gives'>,
  deed: KitchenDeed,
  held: Dish | null,
): string | null {
  if (deed.do === 'nothing' || deed.do === 'refuse') return null;
  switch (spot.kind) {
    case 'sink':
      return deed.do === 'take' ? 'Teller nehmen' : 'Spülen';
    case 'drain':
      if (deed.do === 'take') return 'Teller nehmen';
      if (deed.do === 'combine') return 'Auf einen Teller';
      return 'Teller abstellen';
    case 'bin':
      return 'Wegwerfen';
    case 'griddle':
      if (deed.do === 'take') return 'Patty nehmen';
      if (deed.do === 'combine') return held ? 'Patty auf den Teller' : 'Zusammenlegen';
      return 'Patty auflegen';
    case 'board':
      if (deed.do === 'work' || deed.do === 'place') return 'Schneiden';
      if (deed.do === 'take') return 'Nehmen';
      return 'Auf den Teller';
    case 'crate':
    case 'box':
      if (deed.do === 'take' && spot.gives) return `${ITEM_LABELS[spot.gives]} nehmen`;
      if (deed.do === 'combine') return 'Drauflegen';
      if (deed.do === 'place') return 'Zurücklegen';
      return null;
    default:
      if (deed.do === 'take') return 'Nehmen';
      if (deed.do === 'combine') return 'Zusammenlegen';
      return 'Ablegen';
  }
}

/**
 * **Das Verb am Tisch**: Abräumen, wenn Geschirr dasteht und die Hände frei
 * sind; Servieren nur, wenn der Teller in der Hand wirklich passt
 * (`plateUpGame.serveTable` sagt ja) — sonst „Passt nicht", damit man nicht
 * erst drücken muss, um es zu merken. Mit leeren Händen: nachfragen.
 */
export function tableAction(deed: KitchenDeed, serves: boolean, holding: boolean): string | null {
  if (deed.do === 'take') return 'Abräumen';
  if (deed.do === 'nothing') return null;
  if (!holding) return 'Bestellung hören';
  if (deed.do === 'refuse') return null;
  return serves ? 'Servieren' : 'Passt nicht';
}

/**
 * **Wie weit eine Leiste vom unteren Rand weg muss**, um über allem zu
 * stehen, was unten am Schirm liegt: der Tastenhilfe (`.hints`) und am Glas
 * den Stöcken und Knöpfen (`#touch`). `tops` sind deren Oberkanten in
 * Pixeln. Was in der oberen Hälfte steht, zählt nicht — am Glas rückt die
 * Tastenhilfe nach oben (`controlHints.css`), und von dort aus gemessen
 * rutschte die Leiste unter die Kopfzeile. Mindestens `min` Pixel.
 */
export function clearanceAbove(tops: readonly number[], height: number, min: number): number {
  let clear = min;
  for (const top of tops) {
    if (top <= height / 2 || top >= height) continue;
    clear = Math.max(clear, Math.round(height - top + 8));
  }
  return clear;
}
