/**
 * **Die Ausdauer** — der Balken in der Brille und die Uhr, die läuft, während
 * man sich einen schlechten Griff schönhält.
 *
 * Der Halt (`gripQuality.ts`) sagt, wie stabil man *jetzt* hängt; die Ausdauer
 * sagt, wie lange man sich das noch leisten kann. Zwischen beiden stehen zwei
 * Schwellen, und die sind die eigentliche Spielregel:
 *
 * - **Über `RECOVER_AT`** füllt sich die Ausdauer wieder auf — aber
 *   **anlaufend**, nicht sofort (`REGEN_RAMP`). Wer sich für einen Wimpernschlag
 *   an einen guten Henkel hängt und gleich weiterzieht, hat sich nicht
 *   ausgeruht; wer stehen bleibt und durchatmet, schon. Eine Erholung, die
 *   augenblicklich einsetzt, macht aus jedem guten Griff einen Schalter.
 * - **Unter `SLIP_AT`** ist es kein Halt mehr, sondern ein Streifen: die Hand
 *   geht ab, und wer keine zweite mehr an der Wand hat, fällt.
 * - Dazwischen läuft die Ausdauer aus — umso schneller, je schlechter der
 *   Halt und je glatter das Material (`drain` aus `holds.ts`). Bei **`drain`
 *   gleich null** — der Leiter — läuft gar nichts aus, egal wie lange man
 *   hängt.
 *
 * Auf dem Boden füllt sie sich deutlich schneller als an der Wand: eine
 * Pause soll eine Pause sein und keine zweite Kletterei.
 *
 * Reine Zahlen, kein three.js.
 */

/** Ab hier erholt man sich. */
export const RECOVER_AT = 0.7;
/** Und ab hier rutscht die Hand weg. */
export const SLIP_AT = 0.18;

/** Sekunden von voll auf leer, am schlechtesten rauen Halt. */
export const DRAIN_SECONDS = 9;
/** Sekunden von leer auf voll, an einem tadellosen Griff. */
export const REGEN_SECONDS = 6;
/** Dasselbe mit beiden Füßen auf der Matte. */
export const GROUND_SECONDS = 3;
/** Wie lange die Erholung braucht, bis sie ihre volle Rate erreicht. */
export const REGEN_RAMP = 1.2;
/** Womit sie anfängt — knapp über der Schwelle ist es ein Rinnsal, nicht nichts. */
export const REGEN_FLOOR = 0.35;

/**
 * Wie erschöpft man sein darf und trotzdem noch zupacken. Ohne diese Grenze
 * greift man mit leerem Balken sofort wieder zu, fällt sofort wieder ab, und
 * das Ganze sieht aus wie ein Fehler statt wie eine Pause.
 */
export const GRAB_AT = 0.12;

export interface Stamina {
  /** 0 bis 1. */
  value: number;
  /** Wie lange die Erholung schon läuft, in Sekunden — der Anlauf. */
  ramp: number;
}

export interface StaminaStep extends Stamina {
  /** Steigt sie gerade? Die Anzeige färbt sich danach. */
  rising: boolean;
  /** Sie ist leer und es hängt noch jemand daran: die Hände geben jetzt auf. */
  spent: boolean;
}

export function freshStamina(): Stamina {
  return { value: 1, ramp: 0 };
}

/**
 * Ein Bild weiter.
 *
 * @param state   Stand des letzten Bildes
 * @param support Halt aus `gripReport`, 0 bis 1
 * @param drain   Verbrauchsfaktor des Materials; 0 heißt: kostet nichts
 * @param hanging Hängt überhaupt eine Hand an der Wand?
 */
export function stepStamina(
  state: Stamina,
  support: number,
  drain: number,
  hanging: boolean,
  dt: number,
): StaminaStep {
  const value = clamp01(state.value);
  if (!(dt > 0)) {
    return { value, ramp: state.ramp, rising: false, spent: false };
  }

  // Beide Füße auf der Matte: die Pause. Kein Anlauf, keine Schwelle.
  if (!hanging) {
    return {
      value: clamp01(value + dt / GROUND_SECONDS),
      ramp: 0,
      rising: value < 1,
      spent: false,
    };
  }

  const held = clamp01(support);
  if (held >= RECOVER_AT || drain <= 0) {
    const ramp = state.ramp + dt;
    // Über der Schwelle steigt die Rate mit dem Halt; ein Griff, der gerade
    // eben reicht, erholt eben auch nur gerade eben.
    const share = held >= RECOVER_AT ? (held - RECOVER_AT) / (1 - RECOVER_AT) : 0;
    const rate = (1 / REGEN_SECONDS) * (REGEN_FLOOR + (1 - REGEN_FLOOR) * share);
    const ramped = Math.min(1, ramp / REGEN_RAMP);
    const next = clamp01(value + rate * ramped * dt);
    return { value: next, ramp, rising: next > value, spent: false };
  }

  // Darunter zieht es ab: je weiter unter der Schwelle und je glatter, desto
  // schneller.
  const deficit = (RECOVER_AT - held) / RECOVER_AT;
  const next = clamp01(value - (deficit * drain * dt) / DRAIN_SECONDS);
  return { value: next, ramp: 0, rising: false, spent: next <= 0 };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
