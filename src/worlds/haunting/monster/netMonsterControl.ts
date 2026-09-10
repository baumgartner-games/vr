import type { RoutineOutput } from '../monsterRoutine';
import type { MonsterNetInput } from '../net';
import type { MonsterDriver, MonsterInput } from './monsterDriver';
import { interact, steer, type MonsterArena } from './monsterHelm';

/**
 * **Das Steuer übers Netz, beim Gastgeber** — führt aus, was die Station
 * `monster` sagt, in beiden Welten.
 *
 * Die 3D-Welt (`HauntingWorld.stepRoutine`) und die 2D-Runde
 * (`map/flatRound.ts`) fragen je Bild `active()` und nehmen dann `decide()`
 * statt der Routine — dieselbe Form wie das lokale Steuer
 * (`flatMonsterControl.ts`), dieselbe Übersetzung (`monsterHelm.ts`). Neu
 * ist nur, **woher** die Eingabe kommt: aus der letzten `monster`-Nachricht
 * (`accept`), zehnmal je Sekunde vom Telefon.
 *
 * **Knöpfe sind Zähler.** Das Telefon zählt jeden Druck hoch und schickt den
 * Stand; hier steht der zuletzt gesehene, und jede Differenz wird genau
 * einmal ausgeführt — drei Nachrichten mit `attack: 1` sind ein Schlag,
 * `attack: 3` nach `1` sind zwei. Springt ein Zähler zurück (ein anderes
 * Telefon hat sich hingesetzt, oder dasselbe hat die Seite neu geladen),
 * wird nur der Stand übernommen und nichts nachgeholt.
 *
 * **Interagieren wirkt sofort beim Empfang**, nicht erst in `decide`: Während
 * der Schachtfahrt fragt keine Welt nach einer Entscheidung (im Schacht wird
 * nicht gelaufen), und genau dann muss „Aussteigen" ankommen. **Angreifen**
 * wirkt in `decide`, weil ein Schlag eine Entscheidung dieses Bildes ist —
 * die Runde prüft daran den Abstand und reißt die Kabine auf.
 *
 * `active()` heißt: Die Station ist besetzt, die Runde läuft, und die letzte
 * Nachricht ist keine drei Sekunden alt. Ohne die Frist stünde das Monster
 * für immer still, wenn das Telefon in die Tasche wandert — so übernimmt
 * dann die KI, wie beim Techniker-Herzschlag (`HauntingWorld.technicians`).
 */
export interface NetMonsterArena extends MonsterArena {
  /** Ob jemand an der Station `monster` sitzt (`stations.ownerOf`). */
  occupied(): boolean;
}

/** Nach so vielen Sekunden ohne Nachricht rechnet wieder die KI. */
export const NET_MONSTER_STALE = 3;

export class NetMonsterControl implements MonsterDriver {
  private stick: MonsterInput = { x: 0, z: 0, sprint: false };
  private ventChoice = 0;
  /** Die Zählerstände, wie sie zuletzt ankamen — `null`, bevor die erste Nachricht da war. */
  private seen: { attack: number; interact: number } | null = null;
  private attacks = 0;
  private heardAt = -Infinity;
  /** Die letzten Antworten auf „Interagieren" — für Ansagen und Tests. */
  readonly notes: string[] = [];

  constructor(
    private readonly arena: NetMonsterArena,
    private readonly now: () => number = () => Date.now() / 1000,
  ) {}

  /** Die nächste Nachricht vom Telefon. Nur vom Besitzer der Station rufen. */
  accept(input: MonsterNetInput): void {
    this.stick = { x: input.x, z: input.z, sprint: input.sprint };
    this.ventChoice = input.vent;
    this.heardAt = this.now();
    const seen = this.seen;
    this.seen = { attack: input.attack, interact: input.interact };
    if (!seen) return;
    const attacks = input.attack >= seen.attack ? input.attack - seen.attack : 0;
    const interacts = input.interact >= seen.interact ? input.interact - seen.interact : 0;
    if (!this.active()) return;
    // Mehr als ein paar Schläge auf einmal sind kein Spielzug, sondern ein
    // hängender Knopf: Der Rest verfällt.
    this.attacks = Math.min(3, this.attacks + attacks);
    for (let i = 0; i < interacts; i++) {
      const answer = interact(this.arena, this.ventChoice);
      if (answer.startsWith('Einsteigen')) this.ventChoice = 0;
      if (answer) this.notes.push(answer);
    }
  }

  /** Alles vergessen — neue Runde, neuer Gastgeber. */
  reset(): void {
    this.stick = { x: 0, z: 0, sprint: false };
    this.seen = null;
    this.attacks = 0;
    this.heardAt = -Infinity;
    this.notes.length = 0;
  }

  // --- MonsterDriver ---------------------------------------------------------

  active(): boolean {
    const state = this.arena.state();
    return (
      this.arena.occupied() &&
      state.phase === 'running' &&
      state.monsterOn &&
      this.now() - this.heardAt < NET_MONSTER_STALE
    );
  }

  decide(_dt: number): RoutineOutput {
    let attack = false;
    if (this.attacks > 0) {
      this.attacks--;
      attack = !this.arena.ride().busy;
    }
    return steer(this.stick, attack, this.arena);
  }
}
