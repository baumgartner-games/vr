import { MONSTER_HUNT_SPEED, MONSTER_TOP_SPEED } from './mission';
import {
  likelyExit,
  plan as choosePlan,
  predictPlayer,
  type Estimator,
  type Plan,
  type Prediction,
} from './monster/monsterIntercept';
import type { MonsterMemory } from './monster/monsterMemory';
import type { Scent } from './rules/blood';
import type { MonsterInsight } from './map/mapSnapshot';
import type { StationGraph } from './roomGraph';
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
 * Dazu kommen seit dem Umbau zwei Haltungen, die aus dem Gedächtnis
 * (`monster/monsterMemory.ts`) und der Abfangrechnung
 * (`monster/monsterIntercept.ts`) entstehen:
 *
 * - **Abfangen** — es läuft nicht hinter dem Spieler her, sondern auf die
 *   Tür zu, die vor ihm liegt. Wer hinterherläuft, holt genau nichts auf;
 *   wer abkürzt, steht plötzlich im Weg.
 * - **An der Tür lauern** — es glaubt zu wissen, in welchem Raum der andere
 *   steckt, der Raum hat höchstens zwei Ausgänge, und es stellt sich an den
 *   wahrscheinlicheren. Mit einer Frist, denn ein Monster, das ewig an einer
 *   Tür steht, ist keine Bedrohung mehr, sondern eine Wand.
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
  | 'patrol'
  | 'reposition'
  | 'stakeout'
  | 'search'
  | 'hunt'
  | 'intercept'
  | 'ambush'
  | 'announce'
  | 'breach'
  | 'savour';

export type MonsterPace = 'hunt' | 'walk' | 'stalk' | 'still';
export type MonsterCue = '' | 'klack' | 'scream' | 'breach' | 'sniff';

/** Wie sich die Haltung im Funk und auf der Schalttafel liest. */
export const MODE_LABELS: Readonly<Record<MonsterMode, string>> = {
  patrol: 'Patrouille',
  reposition: 'Seitenwechsel',
  stakeout: 'Auflauern',
  search: 'Raum absuchen',
  hunt: 'Verfolgung',
  intercept: 'Abfangen',
  ambush: 'An der Tür lauern',
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
  /** In welchem Raum ein Punkt liegt — für laute Geräusche; fehlt es, gilt der eigene Raum. */
  spaceAt?(point: FloorPoint): string;
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
  /**
   * Die Alarmleiter aus `threat.ts`: 0 ruhig, 1 aufmerksam (es wird
   * langsamer), 2 lauernd (es dreht sich zur Richtung und wartet), 3 sicher
   * (dann kommt die Stelle als `signal`).
   */
  alert?: number;
  /** Woher das letzte Geräusch kam. */
  facing?: FloorPoint | null;
  /** Ein lautes Geräusch, das es in diesem Bild gehört hat — Ort bekannt, Täter nicht. */
  loud?: FloorPoint | null;
  /**
   * **Das Gedächtnis** (Vertrag 4.3) — Glaubensbild, Notizzettel, Spur.
   *
   * Wer es mitgibt, bekommt ein anderes Monster: Es sucht dann den Raum, den
   * es für den wahrscheinlichsten hält, statt einen Nachbarraum zu würfeln,
   * patrouilliert dorthin, wo es am längsten nicht war, und rechnet, ob sich
   * ein Abfangen lohnt. Ohne Gedächtnis bleibt es beim alten Würfelverhalten
   * — das ist kein Notbehelf, sondern der Grund, warum ein Test mit fünf
   * Zimmern in einer Reihe weiter nachrechenbar bleibt.
   *
   * **Gefüttert wird es hier drin und nicht draußen.** Der Plan sah das
   * andersherum vor (jede Welt schreibt selbst hinein); dabei hätten 3D, 2D
   * und Simulation drei Fassungen desselben Gedächtnisses bekommen, und die
   * erste, die eine Sichtung vergisst, hat ein anderes Monster als die
   * beiden anderen. Die Routine sieht ohnehin alles, was hineingehört —
   * Sichtung, Geräusch, eigener Raum —, also schreibt sie es selbst.
   * Die Welt besitzt das Gedächtnis, meldet ihm Ereignisse, die die Routine
   * nicht sehen kann (`disturbed`, eine fertige Reparatur), und liest es aus.
   */
  memory?: MonsterMemory;
  /**
   * **Die Blutspur unter den eigenen Füßen** (`rules/blood.ts`) — was das
   * Aufspüren gefunden hat, oder `null`.
   *
   * Gesucht hat sie der Aufrufer, denn nur er weiß, welche Tropfen im Raum
   * des Monsters liegen (`sniff`); **eingetragen** wird sie hier, wie alles,
   * was ins Gedächtnis geht. Sie zählt nur, solange nichts Besseres da ist:
   * Wer den Verfolgten gerade sieht oder hört, braucht keine Fährte, und ein
   * Tropfen von vor dreißig Sekunden würde ihn nur von der frischen Stelle
   * wegziehen.
   */
  scent?: Scent | null;
  /** Die Reisezeitauskunft für die Abfangrechnung (Vertrag 4.4). */
  estimator?: Estimator;
  /**
   * Das Grundtempo der Sorte in m/s (`MONSTERS[].speed`). Die Abfangrechnung
   * braucht Meter je Sekunde und keine Faktoren — ohne diese Zahl kann sie
   * nicht sagen, wer zuerst an der Tür ist, und die Routine bleibt beim alten
   * Verhalten.
   */
  base?: number;
  /** Rundenzeit in Sekunden — das Gedächtnis rechnet in Zeitstempeln. */
  time?: number;
  /** Ob der Verfolgte in diesem Bild rennt; steht so in der Spur. */
  sprinting?: boolean;
  /**
   * Was das Monster über die Puste des Verfolgten annimmt (`mission.ts`).
   * Ein Spieler, der seine fünf Sekunden schon verbraucht hat, ist eine
   * andere Rechnung als einer, der frisch losrennt.
   */
  stamina?: { left: number; trot: number };
}

export interface RoutineOutput {
  mode: MonsterMode;
  /** Wohin es will — `null` heißt stehen bleiben. */
  goal: FloorPoint | null;
  /** Wohin es schaut, wenn es steht und horcht; sonst `null`. */
  face: FloorPoint | null;
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
  /**
   * Der Aufschlag auf das Verfolgungstempo: Blutrausch plus der Schub nach
   * einer erledigten Reparatur. Gehört in `paceSpeed` und nirgendwo sonst hin.
   */
  boost: number;
  /**
   * **Was es gerade denkt** (Vertrag 4.7) — nur, wenn ein Gedächtnis dabei
   * ist. Gezeichnet wird das in einem eigenen Paket; hier steht das Feld.
   */
  insight?: MonsterInsight;
}

/**
 * Metertempo aus dem Grundtempo der Sorte und den Gewichten.
 *
 * `boost` ist der Aufschlag auf das Verfolgungstempo (`RoutineOutput.boost`):
 * Blutrausch und der Schub nach einer erledigten Reparatur. Er wirkt nur auf
 * die Jagd — ein Monster, das im Blutrausch *patrouilliert*, wäre eine
 * Karikatur.
 *
 * **Zwei Deckel und nicht einer.** Was die Gewichte allein hergeben, endet bei
 * `MONSTER_HUNT_SPEED`; erst der Aufschlag trägt darüber hinaus, und zwar bis
 * `MONSTER_TOP_SPEED`. Mit nur einem Deckel wäre der Aufschlag genau dann
 * wirkungslos, wenn ihn ein Training am nötigsten macht: Sobald
 * `Grundtempo × speed × hunt` den Deckel erreicht, stünde schon das
 * gewöhnliche Jagen am Anschlag.
 */
export function paceSpeed(
  base: number,
  tuning: MonsterTuning,
  pace: MonsterPace,
  boost = 0,
): number {
  const walk = base * tuning.speed;
  if (pace === 'still') return 0;
  if (pace === 'stalk') return walk * tuning.stalk;
  if (pace === 'walk') return walk;
  const chase = Math.min(MONSTER_HUNT_SPEED, walk * tuning.hunt);
  return Math.min(MONSTER_TOP_SPEED, chase + walk * Math.max(0, boost));
}

const ARRIVED = 1.6;
const KLACK_INTERVAL = 1.4;
/** Wie lange das Aufreißen dauert, in Sekunden — in beiden Ketten dieselbe. */
const BREACH_SECONDS = 0.5;
/** Wie lange es nach dem zweiten Geräusch horchend stehen bleibt, in Sekunden. */
export const LURK = 4;

/**
 * **Der Blutrausch.**
 *
 * Je länger eine Jagd läuft, ohne dass das Monster die Spur verliert, desto
 * näher kommt es seinem Höchsttempo: `RAGE_STEP` mehr Verfolgungsfaktor je
 * `RAGE_EVERY` Sekunden, gedeckelt bei `RAGE_MAX` — und darüber liegt ohnehin
 * `MONSTER_TOP_SPEED`, das kein Monster je überschreitet. Ein Sichtverlust
 * setzt alles zurück.
 *
 * Der Sinn ist nicht das Tempo, sondern das **Ende**: Eine Jagd, die sich
 * ewig hinzieht, langweilt beide Seiten. Wer es nach einer halben Minute
 * geradeaus immer noch nicht geschafft hat, eine Tür, eine Ecke oder einen
 * Schacht zwischen sich und den Verfolger zu bringen, soll es spüren.
 */
export const RAGE_STEP = 0.05;
export const RAGE_EVERY = 10;
export const RAGE_MAX = 0.2;

/**
 * Der Aufschlag auf das Verfolgungstempo während des Schubs nach einer
 * erledigten Reparatur (`MonsterTuning.rush` sagt, wie lange er hält).
 */
export const RUSH_BOOST = 0.25;

/**
 * Wie oft die Abfangrechnung neu gestellt wird, in Sekunden.
 *
 * Nicht in jedem Bild: Die Rechnung ist billig, aber nicht sechzigmal je
 * Sekunde billig, und ein Abfangpunkt, der sich bei jedem Bild ein Stück
 * verschiebt, ergäbe ein Monster, das vor der Tür herumeiert statt hinzugehen.
 */
export const REPLAN = 1.5;

/**
 * Unter dieser Gewissheit lohnt kein Absuchen mehr.
 *
 * Ein Glaubensbild ohne Spitze zeigt auf den ersten Raum der Liste, und ein
 * Monster, das den immer wieder absucht, ist genau das dumme Vieh, das der
 * ganze Umbau abstellen soll. Dann wird patrouilliert — und zwar dorthin, wo
 * es am längsten nicht war.
 */
export const FAINT = 0.15;

export class MonsterRoutine {
  private mode: MonsterMode = 'patrol';
  private goal: FloorPoint | null = null;
  private face: FloorPoint | null = null;
  private alert = 0;
  private lastAlert = 0;
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
  /** Wie lange die laufende Jagd schon ohne Sichtverlust dauert, in Sekunden. */
  private hunted = 0;
  /** Was vom Schub nach einer erledigten Reparatur noch übrig ist, in Sekunden. */
  private rush = 0;
  /** Wann zuletzt gerechnet wurde — `REPLAN` Sekunden später wieder. */
  private planned = -Infinity;
  /** Der letzte vermutete Weg des Verfolgten, für die Anzeige. */
  private predicted: Prediction | null = null;
  /** Die Tür, an der abgefangen werden soll, für die Anzeige. */
  private interception: MonsterInsight['intercept'] = null;
  /** Das letzte Glaubensbild, für die Anzeige — alle `REPLAN` Sekunden abgeholt. */
  private belief: Array<{ roomId: string; p: number }> = [];
  /** Wann das Glaubensbild zuletzt für die Anzeige abgeholt wurde. */
  private pictured = -Infinity;
  /** Ob dieser Schritt ein Gedächtnis gesehen hat; entscheidet über `insight`. */
  private thinking = false;

  constructor(private tuning: MonsterTuning) {}

  /**
   * **Da drüben ist gerade eine Reparatur fertig geworden — los.**
   *
   * Der Aufrufer meldet das (`HauntState.done` wächst); das Gedächtnis
   * bekommt die Stelle über `MonsterMemory.disturbed`, und hier kommt das
   * Tempo dazu: `RUSH_BOOST` mehr Verfolgungsfaktor für `seconds` Sekunden.
   * Kein Hellsehen — eine fertige Reparatur ist an dieser Station ein lautes,
   * sichtbares Ereignis (`botTuning.MonsterTuning.rush`).
   */
  hurry(seconds: number): void {
    this.rush = Math.max(this.rush, Math.max(0, seconds));
  }

  /** Der Aufschlag auf das Verfolgungstempo: Blutrausch plus Schub. */
  get boost(): number {
    const rage = Math.min(RAGE_MAX, Math.floor(this.hunted / RAGE_EVERY) * RAGE_STEP);
    return rage + (this.rush > 0 ? RUSH_BOOST : 0);
  }

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
    this.rush = Math.max(0, this.rush - dt);
    this.thinking = !!input.memory;
    this.remember(world, input, dt);
    // Der Blutrausch zählt nur, solange die Spur hält: Jede Sekunde Jagd ohne
    // Sichtverlust macht das Vieh ein Stück schneller, ein Sichtverlust setzt
    // es zurück (`RAGE_STEP`).
    if ((this.mode === 'hunt' || this.mode === 'intercept') && input.signal) this.hunted += dt;
    else if (!input.signal) this.hunted = 0;
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

    // 2. Die Alarmleiter (`threat.ts`). Ein lautes Geräusch: Es weiß, dass
    // dort etwas ist — hingehen und absuchen, oder stehen bleiben und
    // auflauern. Das zweite leise Geräusch: sich hindrehen und horchen.
    // Das erste: nur langsamer werden (siehe `out`).
    this.alert = input.alert ?? 0;
    if (this.mode !== 'hunt') {
      if (input.loud) {
        const room = world.spaceAt?.(input.loud) || input.here;
        this.lastAlert = this.alert;
        if (input.rng() < this.tuning.stakeout) {
          this.enter('stakeout', null, input.here, LURK);
          this.face = { ...input.loud };
          return this.out('', false, '', 'still');
        }
        this.lockerRoom = input.rng() < this.tuning.locker ? room : '';
        this.enter('search', { ...input.loud }, room, this.tuning.search);
        this.klack = 0;
        return this.out('', false, '', 'walk');
      }
      if (this.alert >= 2 && this.lastAlert < 2 && input.facing) {
        this.enter('stakeout', null, input.here, LURK);
        this.face = { ...input.facing };
      }
    }
    this.lastAlert = this.alert;

    // 3. Wahrnehmung: gesehen wird gejagt, gehört wird angegangen — und wenn
    // die Rechnung sagt, dass eine Tür vor ihm schneller zu erreichen ist als
    // sein Rücken, dann eben abgefangen (`monster/monsterIntercept.plan`).
    if (input.signal) {
      this.trail = { point: { ...input.signal }, room: input.quarry ?? this.trail?.room ?? '' };
      this.misses = 0;
      const pace: MonsterPace = input.seen || this.alert >= 3 ? 'hunt' : 'walk';
      const thought = this.rethink(world, input, this.mode !== 'hunt' && this.mode !== 'intercept');
      if (!thought || (this.mode !== 'hunt' && this.mode !== 'intercept'))
        this.enter('hunt', { ...input.signal }, this.trail.room, 0);
      // Gesehen oder sicher gehört: rennen. Nur erinnert: gehen.
      return this.out('', false, '', pace);
    }

    // 3. Spur verloren: neu rechnen — verfolgen, abfangen, lauern oder
    // absuchen. Ohne Gedächtnis bleibt es beim geratenen Nachbarraum.
    if (this.mode === 'hunt') {
      this.beginSearch(world, input);
      return this.out('', false, '', this.paceOfMode());
    }

    // 3b. Auf dem Weg zum Abfangpunkt. Es läuft **an** dem Spieler vorbei und
    // nicht hinter ihm her; deshalb darf hier kein Sichtverlust dazwischen
    // funken. Erst am Punkt — oder wenn die Rechnung veraltet ist — wird neu
    // gedacht.
    if (this.mode === 'intercept') {
      const goal = this.goal;
      const there = !goal || distance(input.at, goal) < ARRIVED;
      // Angekommen wird **gewartet**, nicht sofort neu gerechnet: Wer in der
      // Tür steht und dieselbe Tür wieder ausgerechnet bekommt, plant sechzig
      // Mal je Sekunde denselben Punkt. Die Frist ist `REPLAN` lang, danach
      // fällt die Entscheidung neu.
      if (this.timer > 0) return this.out('', false, '', there ? 'still' : 'hunt');
      this.beginSearch(world, input);
      return this.out('', false, '', this.paceOfMode());
    }

    // 4. Einen verdächtigen Raum absuchen — leise, mit Klacken. Auflauern und
    // das Lauern an der Tür laufen durch dieselbe Weiche: hingehen, dann
    // stehen bleiben, bis die Frist um ist.
    if (this.mode === 'search' || this.mode === 'stakeout' || this.mode === 'ambush') {
      const goal = this.goal;
      const there = !goal || distance(input.at, goal) < ARRIVED;
      if (!there) return this.out('', false, '', this.mode === 'search' ? 'stalk' : 'walk');
      if (this.mode === 'stakeout' || this.mode === 'ambush') {
        if (this.timer > 0) {
          // Angekommen heißt stehen: Das Ziel loszulassen macht aus dem Lauern
          // ein Warten mitten im Raum — und genau davon kam das Monster her.
          this.goal = null;
          return this.out('', false, '', 'still');
        }
        if (this.mode === 'ambush' && this.goalRoom) {
          // **Die Frist ist um, und niemand ist herausgekommen.** Dann geht es
          // hinein, statt weiter zu warten. Den Raum hier als abgesucht zu
          // notieren wäre eine Lüge: Vor der Tür gestanden ist nicht
          // nachgesehen — und wer die einzige Tür bewacht hat, hat eher einen
          // Grund, drinnen nachzuschauen, als einen, es aufzugeben.
          const room = this.goalRoom;
          this.lockerRoom = input.rng() < this.tuning.locker ? room : '';
          this.enter('search', world.centre(room), room, this.tuning.search);
          this.klack = 0;
          return this.out('', false, '', 'stalk');
        }
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
      // Fertig, und niemand war da. Das schreibt sich ins Gedächtnis: Der
      // Raum fällt auf den Rest, den ein abgesuchter Raum behält
      // (`monsterMemory.FLOOR`) — nicht auf null, denn hinter dem Rücken des
      // Monsters geht man wieder hinein.
      input.memory?.visited(this.goalRoom || input.here, input.time ?? 0);
      // Weitergehen oder aufgeben.
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

  /**
   * **Was tun, wenn niemand mehr zu sehen ist.**
   *
   * Mit Gedächtnis ist das eine Rechnung und kein Wurf: `plan()` vergleicht,
   * wer zuerst an welcher Tür ist, und liefert verfolgen, abfangen, lauern
   * oder absuchen (`monster/monsterIntercept.ts`). Ohne Gedächtnis bleibt der
   * alte Weg stehen — ein geratener Nachbarraum —, und der ist hier kein
   * Notbehelf, sondern die Fassung, die ein Test mit fünf Zimmern in einer
   * Reihe noch nachrechnen kann.
   */
  private beginSearch(world: RoutineWorld, input: RoutineInput): void {
    if (this.rethink(world, input, true)) return;
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

  /**
   * **Die Patrouille geht dorthin, wo es am längsten nicht war.**
   *
   * Vorher lief sie eine Liste mit einem gewürfelten Sprung ab, und das ergab
   * ein Vieh, das dreimal am selben Gang vorbeikam und die hintere Hälfte der
   * Station nie sah. Das Gedächtnis führt die Liste ohnehin
   * (`leastRecentlyVisited`); der Würfel sucht nur noch **unter den drei
   * ältesten** aus, damit die Runde nicht jedes Mal denselben Rundgang zeigt.
   */
  private beginPatrol(world: RoutineWorld, input: RoutineInput): void {
    const stale = input.memory
      ?.leastRecentlyVisited(4)
      .filter((id) => id !== input.here && id !== this.goalRoom);
    if (stale?.length) {
      const room = pick(stale.slice(0, 3), input.rng());
      this.enter('patrol', world.centre(room), room, 0);
      return;
    }
    const rooms = world.spaces.filter((id) => id !== input.here);
    if (!rooms.length) {
      this.enter('patrol', null, '', 0);
      return;
    }
    this.patrol = (this.patrol + 1 + Math.floor(input.rng() * 3)) % rooms.length;
    const room = rooms[this.patrol]!;
    this.enter('patrol', world.centre(room), room, 0);
  }

  /**
   * Die andere Seite der Karte: das entfernteste Zimmer, das es gibt — und
   * mit Gedächtnis das entfernteste **unter denen, in denen es lange nicht
   * war**. Ein Seitenwechsel quer über die Karte in ein Zimmer, das es eben
   * erst abgesucht hat, ist kein Seitenwechsel, sondern ein Umweg.
   */
  private beginReposition(world: RoutineWorld, input: RoutineInput): void {
    const stale = input.memory?.leastRecentlyVisited(6) ?? world.spaces;
    let best = '';
    let far = -1;
    for (const id of stale) {
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

  /**
   * **Was in das Gedächtnis hineingeht** — und zwar nur das, was das Monster
   * wirklich wahrgenommen hat.
   *
   * Eine Sichtung ist eine Sichtung (`seen`), ein Knall ein Knall (`heard`),
   * und der eigene Raum wird mit jeder Sekunde unwahrscheinlicher, weil es ja
   * selbst darin steht (`step`). Die leise Alarmleiter kommt nur an ihrer
   * **Flanke** hinein: Ein „da war was" in jedem Bild hämmerte das
   * Glaubensbild in Sekunden auf eine falsche Gewissheit fest.
   */
  private remember(world: RoutineWorld, input: RoutineInput, dt: number): void {
    const memory = input.memory;
    if (!memory) return;
    const now = input.time ?? 0;
    memory.step(dt, input.here, now);
    // Das Bild für die Zuschauer alle `REPLAN` Sekunden — nicht je Bild: Ein
    // sortiertes Glaubensbild je Einzelbild kostet in der
    // Trainingssimulation mehr als das ganze Denken davor.
    if (now - this.pictured >= REPLAN) {
      this.pictured = now;
      this.belief = memory.snapshot();
    }
    // **Gesehen — oder so sicher gehört, dass es dasselbe ist.** Alarmstufe 3
    // heißt in `threat.ts`: Es weiß, wo der andere ist, und läuft hin. Genau
    // das ist eine Sichtung im Sinne der Spur: eine Stelle mit einer Uhrzeit.
    // Ohne diesen Zusatz stand die Spur bei einer Jagd, die nur aus Geräuschen
    // kam, still — und ohne Spur gibt es keine Richtung, ohne Richtung keine
    // Prognose und ohne Prognose kein Abfangen. Das Vieh lief dann wieder
    // brav hinterher, obwohl die ganze Rechnung daneben lag und wartete.
    if (input.signal && (input.seen || (input.alert ?? 0) >= 3)) {
      const room = input.quarry ?? world.spaceAt?.(input.signal) ?? '';
      memory.seen(room, input.signal, now, input.sprinting);
    } else if (input.loud) memory.heard(input.loud, 1, now);
    else if ((input.alert ?? 0) >= 2 && this.lastAlert < 2 && input.facing)
      memory.heard(input.facing, 0.45, now);
    // **Und ganz zuletzt das Blut** (`rules/blood.ts`): erst wenn es nichts
    // sieht und nichts hört, hilft ihm die Fährte weiter. Andersherum
    // sortiert, hätte ein alter Tropfen die frische Stelle überschrieben, an
    // der der Verfolgte in dieser Sekunde wirklich steht.
    else if (input.scent && !input.signal) {
      const scent = input.scent;
      memory.tracked(input.here, scent.at, scent.dir, scent.trust, now);
    }
  }

  /**
   * **Die eine Rechnung, aus der die neuen Haltungen fallen.**
   *
   * Sie braucht drei Dinge, die ein Testaufbau aus fünf Zimmern nicht hat: ein
   * Gedächtnis, eine Reisezeitauskunft und eine Karte, die Türen bei Namen und
   * Stelle kennt (`roomGraph.StationGraph`). Fehlt eines, gibt sie `false`
   * zurück, und der Aufrufer nimmt den alten Weg.
   *
   * Gerechnet wird höchstens alle `REPLAN` Sekunden. Dazwischen zieht eine
   * laufende Verfolgung ihr Ziel trotzdem nach — die Stelle ist frisch, nur
   * die Entscheidung ist es nicht.
   */
  private rethink(world: RoutineWorld, input: RoutineInput, force: boolean): boolean {
    const memory = input.memory;
    const estimator = input.estimator;
    const graph = mapOf(world);
    const base = input.base ?? 0;
    if (!memory || !estimator || !graph || !(base > 0)) return false;
    const now = input.time ?? 0;
    if (!force && now - this.planned < REPLAN) {
      if (this.mode === 'hunt' && input.signal) this.goal = { ...input.signal };
      return true;
    }
    this.planned = now;
    const prediction = predictPlayer(memory.track, memory, graph, now, input.stamina);
    const chosen = choosePlan({
      monsterAt: input.at,
      huntSpeed: paceSpeed(base, this.tuning, 'hunt', this.boost),
      playerAt: input.signal,
      prediction,
      memory,
      estimator,
      graph,
      now,
      rng: input.rng,
      tuning: { predict: this.tuning.predict, ambush: this.tuning.ambush },
    });
    this.predicted = prediction;
    this.belief = memory.snapshot();
    this.interception =
      chosen.kind === 'intercept'
        ? {
            door: chosen.door,
            at: chosen.at,
            etaMonster: chosen.etaMonster,
            etaPlayer: chosen.etaPlayer,
          }
        : null;
    this.take(world, input, chosen, graph);
    return true;
  }

  /** Aus dem Plan wird eine Haltung — die einzige Stelle, die beides verbindet. */
  private take(world: RoutineWorld, input: RoutineInput, chosen: Plan, graph: StationGraph): void {
    const memory = input.memory!;
    const now = input.time ?? 0;
    if (chosen.kind === 'chase') {
      this.enter('hunt', { ...chosen.at }, graph.spaceAt(chosen.at) || this.trail?.room || '', 0);
      return;
    }
    if (chosen.kind === 'intercept') {
      // `REPLAN` als Frist und nicht als Ewigkeit: Ein Abfangpunkt, der aus
      // einer zehn Sekunden alten Prognose stammt, ist eine Tür, durch die er
      // längst hindurch ist.
      this.enter('intercept', { ...chosen.at }, graph.spaceAt(chosen.at) || '', REPLAN);
      return;
    }
    if (chosen.kind === 'ambush') {
      this.enter('ambush', { ...chosen.at }, chosen.room, Math.max(0, chosen.until - now));
      // Der Blick geht in den Raum hinein, in dem es ihn vermutet — nicht in
      // den Gang, aus dem es selbst gekommen ist.
      this.face = graph.centre(chosen.room);
      return;
    }
    // Absuchen — aber nur, wenn das Glaubensbild überhaupt eine Spitze hat.
    if (memory.certainty() < FAINT) {
      this.beginPatrol(world, input);
      return;
    }
    if (input.rng() < this.tuning.stakeout) {
      // Auflauern heißt jetzt: an einer Tür des Raums stehen, nicht in seiner
      // Mitte. Wer mitten im Zimmer wartet, wird gesehen, bevor er jemanden
      // sieht — das war der eigentliche Fehler am alten `stakeout`.
      const door = doorPost(graph, memory, chosen.room);
      this.enter('stakeout', door ?? world.centre(chosen.room), chosen.room, this.tuning.search);
      this.face = world.centre(chosen.room);
      return;
    }
    this.lockerRoom = input.rng() < this.tuning.locker ? chosen.room : '';
    this.enter('search', world.centre(chosen.room), chosen.room, this.tuning.search);
    this.klack = 0;
  }

  /** Das Tempo, das zu einer eben erst gesetzten Haltung gehört. */
  private paceOfMode(): MonsterPace {
    if (this.mode === 'hunt' || this.mode === 'intercept') return 'hunt';
    if (this.mode === 'search') return 'stalk';
    if (this.mode === 'stakeout' || this.mode === 'ambush') return this.goal ? 'walk' : 'still';
    return 'walk';
  }

  /**
   * **Nach einem Treffer innehalten** (`mission.HIT_LULL`): dieselbe Pause
   * wie nach einer aufgerissenen Kabine (`savour`), nur ausgelöst von außen —
   * die Routine sieht den Schlag im Freien nicht selbst, den führt die Welt
   * aus. Ohne diese Pause klebte das Vieh dem Techniker an den Fersen, bis
   * seine Schonfrist abgelaufen war, und der nächste Treffer kam mit Anlauf.
   * Die Spur bleibt: Danach geht die Jagd dort weiter, wo er stand.
   */
  rest(seconds: number, at: FloorPoint | null = null, room = ''): void {
    if (at) this.trail = { point: at, room };
    this.enter('savour', null, '', Math.max(this.timer, seconds));
  }

  private enter(mode: MonsterMode, goal: FloorPoint | null, room: string, timer: number): void {
    this.mode = mode;
    this.goal = goal;
    this.goalRoom = room;
    this.timer = timer;
    this.face = null;
  }

  private out(cue: MonsterCue, strike: boolean, cabin: string, pace: MonsterPace): RoutineOutput {
    let chosen: MonsterPace = this.goal || pace === 'still' ? pace : 'walk';
    // Aufmerksam heißt langsamer: Wer etwas gehört hat, geht nicht mehr zügig.
    if (this.alert >= 1 && chosen === 'walk') chosen = 'stalk';
    const label = MODE_LABELS[this.mode];
    return {
      mode: this.mode,
      goal: this.goal,
      face: chosen === 'still' ? this.face : null,
      pace: chosen,
      cue,
      strike,
      cabin,
      label,
      boost: this.boost,
      // Glaubensbild, Prognose und Abfangpunkt stammen aus der letzten
      // Rechnung und sind damit höchstens `REPLAN` Sekunden alt; Haltung und
      // Ziel sind es nicht. Das ist Absicht: Ein Zuschauerbild, das je Bild
      // ein Glaubensbild sortiert, kostet in der Trainingssimulation mehr als
      // das ganze Denken davor.
      ...(this.thinking
        ? {
            insight: {
              mode: this.mode,
              label,
              goal: this.goal,
              belief: this.belief,
              prediction: this.predicted
                ? { path: this.predicted.path, eta: this.predicted.eta }
                : null,
              intercept: this.interception,
            } satisfies MonsterInsight,
          }
        : {}),
    };
  }
}

/**
 * Ob die Welt, die hereingereicht wurde, die **ganze** Karte ist.
 *
 * `RoutineWorld` ist die kleine Zusage (Räume, Nachbarn, Mitten, Schränke);
 * `StationGraph` ist dieselbe Karte mit Türen, Entfernungen und Hörweiten.
 * Im Spiel, in der 2D-Runde und in der Simulation ist es immer die große — nur
 * ein Test aus fünf Zimmern reicht die kleine herein, und der bekommt dann das
 * alte Würfelverhalten. Deshalb wird hier gefragt und nicht verlangt.
 */
function mapOf(world: RoutineWorld): StationGraph | null {
  const candidate = world as Partial<StationGraph>;
  return typeof candidate.doorsOf === 'function' &&
    typeof candidate.doorPoint === 'function' &&
    typeof candidate.distance === 'function' &&
    typeof candidate.spaceAt === 'function'
    ? (world as StationGraph)
    : null;
}

/**
 * Die Stelle, an der sich das Auflauern lohnt: die Tür mit dem größten Zufluss
 * aus dem Glaubensbild. `null`, wenn der Raum keine Tür hat — dann bleibt nur
 * die Raummitte.
 */
function doorPost(graph: StationGraph, memory: MonsterMemory, room: string): FloorPoint | null {
  const door = likelyExit(graph, memory, room);
  return door ? graph.doorPoint(door) : null;
}

function distance(a: FloorPoint, b: FloorPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function pick<T>(items: readonly T[], roll: number): T {
  return items[Math.min(items.length - 1, Math.floor(roll * items.length))]!;
}
