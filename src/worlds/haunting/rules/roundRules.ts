import { takeCrewHit, type CrewState } from '../mission';
import type { HauntState } from '../net';
import type { MapRound } from '../map/mapSnapshot';

/**
 * **Die Rundenregeln** — was eine Runde beendet, und warum sie nicht ewig
 * laufen darf.
 *
 * Vorher konnte eine Runde in eine Schleife laufen: Der Techniker versteckte
 * sich in einer Kabine, das Monster riss sie auf, er floh in die nächste, das
 * Monster riss auch die auf — und die Kabine stand danach wieder da wie neu.
 * Ein Techniker, der nichts verliert, hat keinen Grund aufzuhören, und ein
 * Monster, das ihn nie stellt, hat keinen Grund gewonnen zu haben.
 *
 * Hier stehen deshalb drei Regeln, und jede nimmt der Schleife einen Ausweg:
 *
 * 1. **Kabinen gehen kaputt.** Wer in einer Kabine angegriffen wird, verliert
 *    ein Leben *und* die Kabine — für den Rest der Runde. Der Grundriss hat
 *    vierzehn davon; wer sie verbraucht, hat kein Versteck mehr und muss ohne
 *    auskommen. Kein sofortiges Verlieren, sondern eine Lektion.
 * 2. **Der Anzug hat drei Leben.** Das war schon so (`CrewState.hp`), und es
 *    bleibt so: Anzug-Leben *sind* `crew.hp`, nicht ein zweiter Zähler.
 * 3. **Der Sauerstoff reicht zehn Minuten.** Das Rundenlimit und der
 *    Sauerstoff sind **dieselbe Uhr**: `HauntState.time` läuft hoch, was
 *    übrig ist, ist `ROUND_SECONDS - time`. Ziel des Technikers ist, die
 *    Versorgung wiederherzustellen — drei Reparaturen und zurück in die
 *    Zentrale — bevor die Uhr steht.
 *
 * **Die Uhr läuft gleichmäßig durch, und keine Reparatur hält sie an oder
 * füllt sie auf.** Das ist entschieden, nicht vergessen: Eine Reparatur, die
 * Sauerstoff nachfüllt, machte nach der zweiten Reparatur wieder eine Runde
 * ohne Ende möglich — genau die Schleife, gegen die diese Datei da ist. Der
 * Auftrag mit der Id `oxygen` heißt deshalb „Nahrungsversorgung sichern"
 * (`mission.ts`) und nicht mehr „Lebenserhaltung stabilisieren": Der alte
 * Name klang, als rettete er den Sauerstoff, und den rettet nur der Rückweg
 * in die Zentrale. Wer die Uhr an eine Reparatur koppeln will, tut das in
 * `oxygenLeft` — und baut damit die Schleife wieder ein.
 *
 * Kein three.js, kein Netz: Die Klasse hält nur die Liste der zerstörten
 * Kabinen und rechnet den Rest aus `HauntState`. Die 2D-Runde
 * (`map/flatRound.ts`) und die 3D-Welt halten je eine Instanz je Runde.
 */

/** Wie lange der Sauerstoff reicht, in Sekunden — das Rundenlimit. */
export const ROUND_SECONDS = 600;
/** Wie viele Leben der Anzug hat (`mission.freshCrew`). */
export const SUIT_LIVES = 3;
/** Wie lange der Techniker nach einem Kabinenangriff unverwundbar ist, in Sekunden. */
const STRIKE_GRACE = 3;

export class RoundRules {
  private readonly destroyed = new Set<string>();

  /** Wie viel Sauerstoff noch bleibt, in Sekunden — nie unter null. */
  oxygenLeft(state: Pick<HauntState, 'time'>): number {
    return Math.max(0, ROUND_SECONDS - state.time);
  }

  /** Ob diese Kabine noch benutzbar ist. Kennung ist die Raum-Id (`stationLayout`). */
  cabinUsable(roomId: string): boolean {
    return !this.destroyed.has(roomId);
  }

  /** Die zerstörten Kabinen, in Reihenfolge der Zerstörung. */
  destroyedCabins(): string[] {
    return [...this.destroyed];
  }

  /** Eine Kabine dauerhaft unbrauchbar machen — ohne Treffer, für die 3D-Welt. */
  destroyCabin(roomId: string): void {
    if (roomId) this.destroyed.add(roomId);
  }

  /**
   * **Der Kabinenangriff**: Die Kabine, in der der Techniker steckt, ist hin,
   * er steht wieder im Raum, und der Anzug verliert ein Leben — auch dann,
   * wenn er gerade noch aus einem anderen Treffer unverwundbar war. Eine
   * Kabine, die nichts kostet, wäre wieder der Ausweg, den die Schleife
   * braucht. Im sicheren Test (`options.test`) bleibt der Anzug ganz, die
   * Kabine ist trotzdem kaputt.
   *
   * @returns ob der Anzug ein Leben verloren hat.
   */
  cabinStrike(crew: CrewState): boolean {
    const room = crew.hidden;
    if (!room) return false;
    this.destroyed.add(room);
    crew.hidden = '';
    crew.invulnerable = 0;
    const hit = takeCrewHit(crew, true);
    crew.invulnerable = STRIKE_GRACE;
    return hit;
  }

  /**
   * Nach jedem Zeitschritt: Ist der Sauerstoff aufgebraucht, ist die Runde
   * verloren. Gibt die Meldung dafür zurück — genau einmal, im Bild des
   * Ablaufs — oder `null`.
   */
  step(state: HauntState): { kind: 'bad'; text: string } | null {
    if (state.phase !== 'running' || this.oxygenLeft(state) > 0) return null;
    state.phase = 'lost';
    return { kind: 'bad', text: 'MISSION GESCHEITERT · Sauerstoff aufgebraucht.' };
  }

  /** Woran die Runde geendet hat — abgeleitet, nicht gemerkt. */
  ending(state: HauntState): MapRound['ending'] {
    if (state.phase === 'won') return 'escaped';
    if (state.phase !== 'lost') return '';
    return state.crew.hp <= 0 ? 'suit' : 'oxygen';
  }

  /** Der Stand für den Contract (`MapSnapshot.round`). */
  status(state: HauntState): MapRound {
    return {
      phase: state.phase,
      oxygen: this.oxygenLeft(state),
      limit: ROUND_SECONDS,
      suit: Math.max(0, Math.min(SUIT_LIVES, state.crew.hp)),
      suitMax: SUIT_LIVES,
      cabinsDestroyed: this.destroyedCabins(),
      ending: this.ending(state),
    };
  }

  /** Eine neue Runde: alle Kabinen wieder heil. */
  reset(): void {
    this.destroyed.clear();
  }
}

/** `m:ss` für Anzeigen — der Sauerstoff als Uhr, die rückwärts läuft. */
export function clockText(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
