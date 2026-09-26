import { contentsOf, dishLabel, type Dish } from '../test/zones/kitchenRecipes';
import { dirtyAt, menuItem, plateRecipe, type Shift } from './plateUpGame';
import type { StationState } from './plateUpStations';

/**
 * **Die Einsteigerhilfe** — ein Satz, was als Nächstes zu tun ist, und worauf
 * er zeigt. Ohne three.js, ohne DOM.
 *
 * Sie ist **kein Ablauf mit Schritten**, sondern eine Frage an den Stand: Was
 * liegt in der Hand, was auf dem Grill, wer wartet? Daraus folgt genau ein
 * Hinweis. Wer etwas anders macht als gedacht (erst den Teller, dann das
 * Patty), bekommt trotzdem den passenden nächsten Satz — ein Tutorial, das
 * auf Schritt 3 wartet, während man schon bei Schritt 5 ist, lehrt nur, es
 * wegzuklicken.
 *
 * Die Welt zeigt den Satz unten am Schirm (in der Brille auf einer Tafel) und
 * einen Pfeil über dem Ziel. Sie fragt `tutorialFinished`, wann Schluss ist,
 * und merkt es sich im Browser — die Hilfe kommt **einmal**.
 */

/** Worauf ein Hinweis zeigt. */
export type HintTarget =
  { readonly station: string } | { readonly table: number } | { readonly bell: true } | null;

export interface TutorialHint {
  /** Ein Schlüssel je Art Hinweis — die Welt vergleicht ihn, statt den Satz. */
  readonly key: string;
  readonly text: string;
  readonly target: HintTarget;
}

/** Wie viele Gäste bedient sein müssen, bis die Hilfe sich verabschiedet. */
export const TUTORIAL_SERVES = 3;

/**
 * **Ob die Hilfe fertig ist** — nach drei bedienten Gästen oder spätestens,
 * wenn der erste Tag vorbei ist. Wer so weit kam, kennt die Kette.
 */
export function tutorialFinished(shift: Shift): boolean {
  if (shift.day > 1) return true;
  if (shift.day === 1 && (shift.phase === 'closed' || shift.phase === 'over')) return true;
  return shift.served >= TUTORIAL_SERVES;
}

function on(stations: readonly StationState[], id: string): Dish | null {
  return stations.find((s) => s.spot.id === id)?.on ?? null;
}

/**
 * **Der nächste Hinweis** — oder `null`, wenn gerade nichts zu sagen ist
 * (Laden zu, Bilanz am Schild).
 *
 * Reihenfolge der Fragen: erst die Hand (was man hält, will irgendwohin),
 * dann der Grill (Verbranntes muss weg), dann die Gäste.
 */
export function tutorialHint(
  shift: Shift,
  stations: readonly StationState[],
  held: Dish | null,
  tables: number,
): TutorialHint | null {
  if (shift.phase === 'ready') {
    return {
      key: 'bell',
      text: 'Läute die Glocke links an der Durchreiche — dann öffnet der Laden',
      target: { bell: true },
    };
  }
  if (shift.phase !== 'open' && shift.phase !== 'closing') return null;

  const waiting = shift.guests
    .filter((g) => g.phase === 'waiting')
    .sort((a, b) => a.patience - b.patience);
  const griddles = stations.filter((s) => s.spot.kind === 'griddle');
  const cooked = griddles.find((s) => s.on?.item === 'patty-cooked' && !s.on.on.length);
  const frying = griddles.find((s) => s.on?.item === 'patty');
  const burnt = griddles.find((s) => s.on?.item === 'patty-burnt');
  const freeGrill = griddles.find((s) => !s.on);

  if (held) {
    if (held.item === 'patty-burnt') {
      return {
        key: 'bin',
        text: 'Verbrannt — ab in den Mülleimer ganz rechts',
        target: { station: 'bin' },
      };
    }
    if (held.item === 'plate-dirty') {
      return {
        key: 'sink',
        text: 'Schmutziger Teller: in die Spüle legen und davor stehen bleiben, bis er sauber ist',
        target: { station: 'sink' },
      };
    }
    if (held.item === 'patty') {
      return {
        key: 'grill',
        text: 'Leg das Patty auf eine freie Grillplatte — es brät von allein',
        target: freeGrill ? { station: freeGrill.spot.id } : null,
      };
    }
    if (held.item === 'lettuce' || held.item === 'tomato') {
      return {
        key: 'board',
        text: `${dishLabel(held)} aufs Schneidebrett legen und davor stehen bleiben`,
        target: { station: 'board' },
      };
    }
    if (held.item === 'bun') {
      return {
        key: 'bun-plate',
        text: 'Ein Brötchen gehört auf einen Teller — halt es an den Tellerstapel',
        target: { station: 'plates' },
      };
    }
    if (held.item === 'plate') {
      const recipe = plateRecipe(held);
      if (recipe) {
        const guest = waiting.find((g) => g.order === recipe.id);
        if (guest) {
          return {
            key: `serve-${guest.table}`,
            text: `Fertig! Bring den ${menuItem(recipe.id).label} an Tisch ${guest.table + 1}`,
            target: { table: guest.table },
          };
        }
        return {
          key: 'park',
          text: 'Das hat gerade niemand bestellt — stell den Teller auf der Durchreiche ab',
          target: null,
        };
      }
      const parts = contentsOf(held);
      if (!parts.includes('bun')) {
        return {
          key: 'bun',
          text: 'Jetzt ein Brötchen: halt den Teller an die Brötchenkiste',
          target: { station: 'buns' },
        };
      }
      if (!parts.includes('patty-cooked')) {
        if (cooked) {
          return {
            key: 'fetch',
            text: 'Das Patty ist fertig — halt den Teller an die Grillplatte',
            target: { station: cooked.spot.id },
          };
        }
        if (frying) {
          return {
            key: 'wait-fry',
            text: 'Das Patty brät noch — gleich ist es fertig',
            target: { station: frying.spot.id },
          };
        }
        return {
          key: 'park-patty',
          text: 'Erst ein Patty braten: Teller auf der Arbeitsplatte abstellen, Patty holen',
          target: { station: 'top-2' },
        };
      }
      // Hamburger fertig, aber bestellt ist mehr (Salat, Tomate).
      const want = waiting[0] ? menuItem(waiting[0].order).label : 'Burger';
      const cut = on(stations, 'board');
      if (cut && (cut.item === 'lettuce-cut' || cut.item === 'tomato-cut')) {
        return {
          key: 'fetch-cut',
          text: `Für den ${want}: halt den Teller ans Schneidebrett`,
          target: { station: 'board' },
        };
      }
      return {
        key: 'need-cut',
        text: `Für den ${want} fehlt noch Belag — erst schneiden, dann auf den Teller`,
        target: { station: 'board' },
      };
    }
    return null;
  }

  // --- Die Hand ist leer ---------------------------------------------------
  if (burnt) {
    return {
      key: 'burnt',
      text: 'Das Patty ist verbrannt! Nimm es von der Grillplatte und wirf es weg',
      target: { station: burnt.spot.id },
    };
  }
  if (waiting.length) {
    if (!cooked && !frying) {
      return {
        key: 'patty',
        text: `Tisch ${waiting[0]!.table + 1} wartet: nimm ein Patty aus der Fleischkiste`,
        target: { station: 'patties' },
      };
    }
    const stack = stations.find((s) => s.spot.kind === 'drain');
    if (stack && stack.stock > 0) {
      return {
        key: 'plate',
        text: 'Während es brät: nimm einen Teller vom Stapel',
        target: { station: stack.spot.id },
      };
    }
  }
  for (let t = 0; t < tables; t++) {
    if (dirtyAt(shift, t) > 0) {
      return {
        key: `dirty-${t}`,
        text: `Auf Tisch ${t + 1} steht schmutziges Geschirr — abräumen, sonst setzt sich dort niemand`,
        target: { table: t },
      };
    }
  }
  if (shift.guests.some((g) => g.phase === 'walkIn')) {
    return {
      key: 'arriving',
      text: 'Ein Gast kommt herein — was er möchte, steht gleich über seinem Kopf',
      target: null,
    };
  }
  if (cooked) {
    return {
      key: 'watch',
      text: 'Achtung: Liegt das Patty zu lange auf dem Grill, verbrennt es',
      target: { station: cooked.spot.id },
    };
  }
  return null;
}
