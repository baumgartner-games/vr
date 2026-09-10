import { MONSTER_TOP_SPEED } from './mission';
import type { MonsterTuning } from './botTuning';
import type { FloorPoint } from './stationLayout';

/**
 * **Was das Monster tut, wenn es niemanden sieht** — und das ist fast immer.
 *
 * Vorher gab es dafür eine Zeile: „lauf zum nächsten Zimmer der Liste". Das
 * Ergebnis war ein Vieh, das im Kreis marschierte, den Spieler nur zufällig
 * traf und ihn danach sofort wieder verlor, weil es weiter marschierte. Die
 * Runde bestand daraus, ihm auszuweichen, ohne es je gesehen zu haben.
 *
 * Hier steht deshalb ein **Verhaltensapparat mit vier Grundhaltungen**, und
 * jede ist etwas, das man als Zuschauer benennen kann:
 *
 * - **Patrouille** — es geht zügig von Zimmer zu Zimmer und schaut hinein.
 * - **Seitenwechsel** — nach ein paar erfolglosen Zielen bricht es ab und
 *   geht auf die andere Seite der Karte. Wer sich vor ihm versteckt hält,
 *   soll nicht darauf bauen können, dass es die Ecke nie verlässt.
 * - **Auflauern** — es bleibt stehen und wartet. Nichts an einem Verfolger
 *   ist so unangenehm wie einer, der gerade *nicht* zu hören ist.
 * - **Absuchen** — es hat jemanden verloren und **rät**, in welchen
 *   Nachbarraum er verschwunden ist (`guess`). Dort geht es leise umher,
 *   macht Klack-Geräusche, schnüffelt vielleicht am Schutzschrank (`locker`)
 *   — und **reißt ihn dann auf, ob jemand drin ist oder nicht** — oder lässt
 *   den Raum stehen und geht gleich weiter, weil der andere ja
 *   weitergelaufen sein könnte (`wander`).
 *
 * Und darüber liegt die **Verfolgung**: gesehen heißt hinterher, mit dem
 * Tempo aus `hunt`. Hat es den Spieler in eine Kabine flüchten *sehen*, geht
 * es hin, **schreit** davor (die Ankündigung, die dem Spieler die Sekunde
 * gibt, in der ihm klar wird, was gleich passiert), reißt sie auf und bleibt
 * danach kurz stehen (`savour`) — der Vorsprung, ohne den ein Treffer im
 * Schrank gleich der nächste wäre.
 *
 * **Zwei Gründe, eine Kabine aufzureißen — und nur diese zwei.** Entweder
 * hat es den Rückzug gesehen (`caught`, die ganze Kette mit Schrei und
 * Vorsprung), oder es **vermutet** jemanden darin: Beim Absuchen eines
 * verdächtigen Raums schnüffelt es am Schrank und reißt ihn danach auf. Ob
 * wirklich jemand drin steckt, weiß die Routine nicht und soll es nicht
 * wissen — vorher wurde aus dem Schnüffeln nur dann ein Angriff, wenn der
 * Spieler wirklich drin war, und das war ein kleiner Betrug: Ein Monster,
 * das am leeren Schrank weitergeht und am vollen zuschlägt, hat
 * hineingesehen. Jetzt geht die Kabine in beiden Fällen kaputt (ein Ausweg
 * weniger, `rules/roundRules.ts`); war sie leer, hat das Monster nur die
 * halbe Sekunde des Aufreißens verloren — ohne Schrei, ohne Vorsprung, damit
 * sein Zeitverbrauch gegenüber vorher fast gleich bleibt. Der Aufrufer
 * erfährt in `cabin`, welche Kabine hin ist, und trifft die Crew nur, wenn
 * sie genau dort steckt.
 *
 * **Hier steht keine Physik und kein three.js.** Herein gehen Räume,
 * Nachbarn und eine Wahrnehmung, heraus geht ein Ziel, ein Tempo und
 * höchstens ein Geräusch. Genau deshalb kann dieselbe Datei das Monster im
 * Headset steuern und in der Trainingssimulation (`roundSim.ts`) hunderte
 * Runden in einer Sekunde ausspielen.
 */
export type MonsterMode =
  'patrol' | 'reposition' | 'stakeout' | 'search' | 'hunt' | 'announce' | 'breach' | 'savour';

export type MonsterPace = 'hunt' | 'walk' | 'stalk' | 'still';
export type MonsterCue = '' | 'klack' | 'scream' | 'breach' | 'sniff';

/** Wie sich die Haltung im Funk und auf der Schalttafel liest. */
export const MODE_LABELS: Readonly<Record<MonsterMode, string>> = {
  patrol: 'Patrouille',
  reposition: 'Seitenwechsel',
  stakeout: 'Auflauern',
  search: 'Raum absuchen',
  hunt: 'Verfolgung',
  announce: 'Vor der Kabine',
  breach: 'Kabine aufreißen',
  savour: 'Vorsprung gewähren',
};

export interface RoutineWorld {
  /** Alle Räume und Gänge, in stabiler Reihenfolge. */
  readonly spaces: readonly string[];
  /** Die Räume hinter den Türen dieses Raums. */
  neighbours(id: string): readonly string[];
  /** Die Mitte eines Raums in Metern. */
  centre(id: string): FloorPoint;
  /** Wo der Schutzschrank steht — `null`, wenn der Raum keinen hat. */
  locker(id: string): FloorPoint | null;
}

export interface RoutineInput {
  dt: number;
  /** Wo das Monster steht. */
  at: FloorPoint;
  /** In welchem Raum es steht. */
  here: string;
  /** Die wahrgenommene Stelle — `null`, solange es nichts hat. */
  signal: FloorPoint | null;
  /** Ob es den Spieler in diesem Moment wirklich sieht. */
  seen: boolean;
  /** Der Raum, in dem der Spieler wirklich ist — nur für den Riecher. */
  quarry: string | null;
  /**
   * Der Schrank, in dem der Spieler steckt, **wenn das Monster das Flüchten
   * gesehen hat** — sonst leer. Ein unbeobachtetes Verstecken bleibt geheim.
   */
  caught: string;
  /** Gleichverteilt in [0,1). Der Aufrufer besitzt den Zufall. */
  rng: () => number;
}

export interface RoutineOutput {
  mode: MonsterMode;
  /** Wohin es will — `null` heißt stehen bleiben. */
  goal: FloorPoint | null;
  pace: MonsterPace;
  /** Genau ein Geräusch je Bild, und nur im Bild seines Anlasses. */
  cue: MonsterCue;
  /** Ob es in diesem Bild die Kabine aufreißt. */
  strike: boolean;
  /**
   * Die Kabine, die es dabei aufreißt — die Raum-Id —, sonst `''`. Der
   * Aufrufer macht sie kaputt und trifft die Crew nur, wenn sie genau darin
   * steckt (`crew.hidden === cabin`).
   */
  cabin: string;
  label: string;
}

/** Metertempo aus dem Grundtempo der Sorte und den Gewichten. */
export function paceSpeed(base: number, tuning: MonsterTuning, pace: MonsterPace): number {
  const walk = base * tuning.speed;
  if (pace === 'still') return 0;
  if (pace === 'stalk') return walk * tuning.stalk;
  if (pace === 'walk') return walk;
  return Math.min(MONSTER_TOP_SPEED, walk * tuning.hunt);
}

const ARRIVED = 1.6;
const KLACK_INTERVAL = 1.4;
/** Wie lange das Aufreißen dauert, in Sekunden — in beiden Ketten dieselbe. */
const BREACH_SECONDS = 0.5;

export class MonsterRoutine {
  private mode: MonsterMode = 'patrol';
  private goal: FloorPoint | null = null;
  private goalRoom = '';
  /** Wie lange die laufende Haltung noch dauert, in Sekunden. */
  private timer = 0;
  private klack = 0;
  private misses = 0;
  private patrol = 0;
  /** Der Raum, in dem zuletzt etwas wahrgenommen wurde. */
  private trail: { point: FloorPoint; room: string } | null = null;
  private lockerRoom = '';
  private screamed = false;
  /**
   * Ob das laufende Aufreißen ein **Verdachts-Angriff** ist: aus dem
   * Absuchen heraus, ohne Schrei davor und ohne Vorsprung danach. `resume`
   * ist die Suchzeit, die beim Schnüffeln noch übrig war — danach geht die
   * Suche genau dort weiter, damit der Angriff die Runde nicht verkürzt.
   */
  private suspicion = false;
  private resume = 0;
  private torn = false;

  constructor(private tuning: MonsterTuning) {}

  /** Neue Gewichte mitten in der Runde — die Schalttafel darf das. */
  retune(tuning: MonsterTuning): void {
    this.tuning = tuning;
  }

  get state(): MonsterMode {
    return this.mode;
  }

  /** Für die Anzeige: der Raum, den es gerade im Verdacht hat. */
  get suspect(): string {
    return this.goalRoom;
  }

  step(world: RoutineWorld, input: RoutineInput): RoutineOutput {
    const dt = Math.max(0, Math.min(0.25, input.dt));
    this.timer -= dt;
    this.klack -= dt;
    let cue: MonsterCue = '';
    let strike = false;
    let cabin = '';

    // 1. Ein gesehener Rückzug in eine Kabine schlägt alles andere. Der
    // Ablauf danach — Schrei, Aufreißen, Vorsprung — läuft **von selbst zu
    // Ende**, auch wenn der Aufrufer die Meldung längst zurückgenommen hat:
    // Wer den Schrank aufgerissen hat, hat niemanden mehr darin, und ein
    // Angriff, der genau dort abbricht, hat den Vorsprung nie gegeben.
    const busy = this.mode === 'announce' || this.mode === 'breach' || this.mode === 'savour';
    if (input.caught && !busy) {
      this.enter(
        'announce',
        world.locker(input.caught) ?? world.centre(input.caught),
        input.caught,
        0,
      );
      this.screamed = false;
      this.suspicion = false;
    }
    if (this.mode === 'announce' || this.mode === 'breach') {
      const at = this.goal ?? world.centre(this.goalRoom);
      const near = distance(input.at, at) < ARRIVED + 0.6;
      if (this.mode === 'announce') {
        if (near && !this.screamed) {
          // Der Schrei ist die Ankündigung und nicht der Angriff: eine
          // Sekunde, in der man begreift, dass man gefunden wurde.
          this.screamed = true;
          this.timer = 1.6;
          cue = 'scream';
        }
        if (this.screamed && this.timer <= 0) {
          this.enter('breach', at, this.goalRoom, BREACH_SECONDS);
          cue = 'breach';
          strike = true;
          cabin = this.goalRoom;
        }
        return this.out(cue, strike, cabin, near && this.screamed ? 'still' : 'hunt');
      }
      if (this.timer <= 0) {
        if (!this.suspicion) {
          this.trail = { point: at, room: this.goalRoom };
          this.enter('savour', null, '', this.tuning.savour);
        } else if (!this.torn) {
          // Der Verdachts-Angriff: geschnüffelt, gewartet, aufgerissen. Ob
          // jemand drin war, erfährt die Routine nie — der Aufrufer sieht es
          // an `cabin` und `crew.hidden`.
          this.torn = true;
          cue = 'breach';
          strike = true;
          cabin = this.goalRoom;
        } else {
          // Kein Vorsprung: Die Suche geht weiter, wo sie stand — nur der
          // Schrank ist erledigt.
          const room = this.goalRoom;
          this.suspicion = false;
          this.lockerRoom = '';
          this.enter('search', world.centre(room), room, this.resume);
          return this.out('', false, '', 'stalk');
        }
      }
      return this.out(cue, strike, cabin, 'still');
    }
    if (this.mode === 'savour') {
      if (this.timer > 0) return this.out('', false, '', 'still');
      this.enter('hunt', this.trail?.point ?? null, this.trail?.room ?? '', 0);
    }

    // 2. Wahrnehmung: gesehen wird gejagt, gehört wird angegangen.
    if (input.signal) {
      this.trail = { point: { ...input.signal }, room: input.quarry ?? this.trail?.room ?? '' };
      this.misses = 0;
      this.enter('hunt', { ...input.signal }, this.trail.room, 0);
      return this.out('', false, '', input.seen ? 'hunt' : 'walk');
    }

    // 3. Spur verloren: raten, in welchen Nachbarraum er verschwunden ist.
    if (this.mode === 'hunt') {
      this.beginSearch(world, input);
      return this.out('', false, '', 'stalk');
    }

    // 4. Einen verdächtigen Raum absuchen — leise, mit Klacken.
    if (this.mode === 'search' || this.mode === 'stakeout') {
      const goal = this.goal;
      const there = !goal || distance(input.at, goal) < ARRIVED;
      if (!there) return this.out('', false, '', this.mode === 'stakeout' ? 'walk' : 'stalk');
      if (this.mode === 'stakeout') {
        if (this.timer > 0) return this.out('', false, '', 'still');
        this.beginPatrol(world, input);
        return this.out('', false, '', 'walk');
      }
      if (this.timer > 0) {
        if (this.klack <= 0) {
          this.klack = KLACK_INTERVAL;
          cue = 'klack';
        }
        // Der Schrank ist der zweite Blick und nicht der erste: erst durch
        // den Raum, dann die Tür auf. Angekommen wird geschnüffelt — und
        // eine halbe Sekunde später aufgerissen, egal ob jemand drin ist.
        if (this.lockerRoom === this.goalRoom && this.timer < this.tuning.search * 0.45) {
          const locker = world.locker(this.goalRoom);
          if (locker) {
            this.goal = locker;
            if (distance(input.at, locker) < ARRIVED && cue === 'klack') {
              cue = 'sniff';
              this.resume = this.timer;
              this.suspicion = true;
              this.torn = false;
              this.enter('breach', locker, this.goalRoom, BREACH_SECONDS);
              return this.out(cue, false, '', 'still');
            }
          }
        }
        return this.out(cue, false, '', 'stalk');
      }
      // Fertig. Weitergehen oder aufgeben.
      if (input.rng() < this.tuning.wander) this.stepOn(world, input);
      else this.beginPatrol(world, input);
      return this.out(cue, false, '', 'walk');
    }

    // 5. Patrouille und Seitenwechsel.
    const goal = this.goal;
    if (goal && distance(input.at, goal) >= ARRIVED) return this.out('', false, '', 'walk');
    this.misses++;
    if (this.misses >= this.tuning.reposition) this.beginReposition(world, input);
    else this.beginPatrol(world, input);
    return this.out('', false, '', 'walk');
  }

  /** Der Raum, in den der Verfolgte wohl verschwunden ist. */
  private beginSearch(world: RoutineWorld, input: RoutineInput): void {
    const from = this.trail?.room || input.here;
    const options = world.neighbours(from).filter((id) => id !== input.here);
    const pool = options.length ? options : world.neighbours(input.here);
    const hit = input.quarry && pool.includes(input.quarry) && input.rng() < this.tuning.guess;
    const room = hit ? input.quarry! : pool.length ? pick(pool, input.rng()) : from;
    if (input.rng() < this.tuning.stakeout) {
      // Auflauern heißt: dorthin gehen und dann nichts mehr tun.
      this.enter('stakeout', world.centre(room), room, this.tuning.search);
      return;
    }
    this.lockerRoom = input.rng() < this.tuning.locker ? room : '';
    this.enter('search', world.centre(room), room, this.tuning.search);
    this.klack = 0;
  }

  /** Vielleicht ist er weitergelaufen: der nächste Nachbarraum. */
  private stepOn(world: RoutineWorld, input: RoutineInput): void {
    const options = world.neighbours(this.goalRoom || input.here).filter((id) => id !== input.here);
    const room = options.length ? pick(options, input.rng()) : input.here;
    this.lockerRoom = input.rng() < this.tuning.locker ? room : '';
    this.enter('search', world.centre(room), room, this.tuning.search);
    this.klack = 0;
  }

  private beginPatrol(world: RoutineWorld, input: RoutineInput): void {
    const rooms = world.spaces.filter((id) => id !== input.here);
    if (!rooms.length) {
      this.enter('patrol', null, '', 0);
      return;
    }
    this.patrol = (this.patrol + 1 + Math.floor(input.rng() * 3)) % rooms.length;
    const room = rooms[this.patrol]!;
    this.enter('patrol', world.centre(room), room, 0);
  }

  /** Die andere Seite der Karte: das entfernteste Zimmer, das es gibt. */
  private beginReposition(world: RoutineWorld, input: RoutineInput): void {
    let best = '';
    let far = -1;
    for (const id of world.spaces) {
      const centre = world.centre(id);
      const distance = Math.hypot(centre.x - input.at.x, centre.z - input.at.z);
      if (distance > far) {
        far = distance;
        best = id;
      }
    }
    this.misses = 0;
    this.enter('reposition', best ? world.centre(best) : null, best, 0);
  }

  private enter(mode: MonsterMode, goal: FloorPoint | null, room: string, timer: number): void {
    this.mode = mode;
    this.goal = goal;
    this.goalRoom = room;
    this.timer = timer;
  }

  private out(cue: MonsterCue, strike: boolean, cabin: string, pace: MonsterPace): RoutineOutput {
    return {
      mode: this.mode,
      goal: this.goal,
      pace: this.goal || pace === 'still' ? pace : 'walk',
      cue,
      strike,
      cabin,
      label: MODE_LABELS[this.mode],
    };
  }
}

function distance(a: FloorPoint, b: FloorPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function pick<T>(items: readonly T[], roll: number): T {
  return items[Math.min(items.length - 1, Math.floor(roll * items.length))]!;
}
