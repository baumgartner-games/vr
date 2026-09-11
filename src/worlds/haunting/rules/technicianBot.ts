import { DEFAULT_TUNING, type TechnicianTuning } from '../botTuning';
import { PLAYER_SPRINT_SPEED, PLAYER_WALK_SPEED, puzzleFor } from '../mission';
import type { StationGraph } from '../roomGraph';
import type { FloorPoint } from '../stationLayout';
import { FlatWalker } from '../map/flatWalk';
import { CONTACT, FlatRound, type FlatInput } from '../map/flatRound';
import { TILE } from '../../nav/navTile';
import { lockedDoorsBetween } from '../navmesh';
import type { RouteAvoid } from '../stationNavigation';
import { SUIT_LIVES } from './roundRules';

/**
 * **Ein Techniker aus Zahlen für die 2D-Runde** — der Prüfstand der
 * Rundenregeln.
 *
 * Er tut, was der Modelltechniker der 3D-Welt tut (`missionBot.ts`) und was
 * die Trainingsrunde vereinfacht nachspielt (`roundSim.ts`): Ersatzteil
 * holen, Konsole reparieren, dreimal, dann heim — und sobald das Monster
 * nahe kommt, die Arbeit abbrechen und in Deckung gehen, am liebsten in eine
 * Kabine. Genau dieses Verhalten hat die Runde in die Schleife getrieben:
 * Kabine, Angriff, nächste Kabine, Angriff, ohne Ende. Hier läuft es gegen
 * die **echte** 2D-Runde (`map/flatRound.ts`) mit den echten Rundenregeln
 * (`roundRules.ts`), damit ein Test zeigen kann, dass die Schleife weg ist.
 *
 * Er spielt mit demselben Stock und denselben drei Knöpfen wie ein Mensch —
 * `FlatRound.step` und `FlatRound.act` —, und er liest von der Runde nur, was
 * auch auf der Karte steht. Die einzige Ausnahme ist die Gefahr: Ob das
 * Monster nahe ist, weiß er wie der Techniker der Trainingsrunde aus dem
 * Abstand und der Raumkarte, nicht aus dem Sichtbarkeitsfeld. Ein Bot, der
 * das Monster erst sieht, wenn es im Licht steht, würde dieselbe Schleife
 * nie erreichen, die ein Mensch mit Ohren erreicht.
 *
 * **Wer das Monster gesehen hat, geht ihm aus dem Weg.** Nicht als Verbot,
 * sondern als **Preis**: Solange er weiß, wo es steht, kostet jeder Schritt
 * in seiner Nähe einen Aufschlag auf die Wegsuche (`stationNavigation.ts`,
 * `RouteAvoid`) — der Umweg wird billiger als der Vorbeigang, aber der
 * Vorbeigang bleibt möglich. Das ist wichtig: Unendliche Kosten wären eine
 * Wand, und eine Wand, die sich bewegt, sperrt ihn irgendwann in einer Ecke
 * ein, in der er dann stehen bleibt und stirbt.
 *
 * **Nur war der Preis zu billig.** Vier Kosten je Rasterschritt sind ein Meter
 * Umweg, und wer flieht, zahlt einen Meter jederzeit — also lief er dem
 * Monster regelmäßig durch die Arme. Um seine Schlagreichweite plus eine
 * Kachel liegt deshalb ein **harter Kern** (`DREAD_CORE`), in dem ein Schritt
 * `CORE_WEIGHT` kostet: zweihundertfünfzig Meter Umweg, mehr als die Station
 * breit ist. Daneben herumgehen ist damit immer billiger, hindurch geht er nur
 * noch, wenn es gar keinen Weg daneben gibt — und der Schnurzug zieht den
 * Bogen hinterher auch nicht wieder gerade (`stationNavigation.coreCrossed`).
 * Dazu prüft der Navigator bei jeder Verfolgung nach, ob die **laufende**
 * Route inzwischen durch den Kern führt (`navmesh/flatNavigator.crossesCore`):
 * Das Monster wandert, und ein Weg, der beim Planen gut war, ist es zwei
 * Sekunden später nicht mehr.
 *
 * **Und der Preis steigt, je weniger Leben er hat.** Mit drei Leben geht er
 * knapp am Monster vorbei, wenn der Umweg lang ist; mit einem läuft er
 * lieber die halbe Station herum. Das ist dieselbe Rechnung, die ein Mensch
 * macht: Was ein Streifschuss war, ist beim letzten Leben der Tod.
 *
 * **Eine gesperrte Tür auf dem Fluchtweg ist auch nur ein Preis.** Auf der
 * Flucht fällt hinter ihm eine Tür zu (`stepSeal`) und das Monster schlägt
 * welche zu (`haunt.ts`); wer davor stehen bleibt und wartet, stirbt dort.
 * Also **zieht er den Riegel auf** — nur kostet der Weg dahinter mehr als
 * einer durch eine offene Tür (`doorToll`), und zwar umso mehr, je näher das
 * Monster schon ist: Am Riegel steht er still, und wer hinter ihm herkommt,
 * holt in dieser Zeit auf. Deckung ohne Tür dazwischen gewinnt damit von
 * selbst — aber wenn ringsum alles zu ist, geht er trotzdem.
 */

type Job =
  | { kind: 'cargo'; id: string; at: FloorPoint; space: string }
  | { kind: 'console'; id: string; at: FloorPoint; space: string }
  | { kind: 'home'; id: string; at: FloorPoint; space: string };

interface Cover {
  at: FloorPoint;
  space: string;
  locker: boolean;
}

const IDLE: FlatInput = { x: 0, z: 0, sprint: false };
/** Wie lange die Handgriffe an Fracht und Konsole dauern, in Sekunden (wie `roundSim.ts`). */
const CARGO_SECONDS = 2.6;
const CONSOLE_SECONDS = 6.4;
/**
 * **Wie weit die Scheu vor dem Monster reicht**, in Metern — gut ein Zimmer.
 * Weiter wäre keine Scheu mehr, sondern eine zweite Karte.
 */
const DREAD_RANGE = 7;
/**
 * Der Aufschlag je Rasterschritt (0,25 m) unmittelbar am Monster, bei vollem
 * Anzug. Ein Schritt kostet sonst 1: `4` heißt, dass ein Meter direkt am
 * Monster so teuer ist wie vier Meter Umweg.
 */
const DREAD_WEIGHT = 4;
/** Und um so viel mehr beim letzten Leben — das Risiko des Todes ist dann höher. */
const DREAD_HURT = 2.5;
/**
 * Wie lange er das Monster im Kopf behält, nachdem er es zuletzt bemerkt hat,
 * in Sekunden. Danach hat er keinen Grund mehr, einen Umweg zu gehen.
 */
const DREAD_MEMORY = 6;
/**
 * **Der harte Kern um das Monster**, in Metern: seine Schlagreichweite
 * (`map/flatRound.CONTACT` = 1,7 m) plus eine Kachel (`TILE` = 2,5 m).
 *
 * Das ist die Antwort auf den Fehler, den man in jeder zweiten Runde sah: Der
 * Techniker lief dem Monster durch die Arme, und zwar nicht aus Dummheit,
 * sondern weil der weiche Trichter ihn nur vier Kosten je Rasterschritt
 * kostete — einen Meter Umweg. Wer fliehen will, zahlt einen Meter jederzeit.
 * Im Kern kostet ein Schritt jetzt `CORE_WEIGHT` (tausend, also 250 m Umweg);
 * daneben herumzugehen ist damit immer billiger, und nur wenn es *gar* keinen
 * Weg daneben gibt, geht er trotzdem hindurch. Eine Wand wäre er nicht: Die
 * sperrte ihn in der Ecke ein, in der er dann stehen bliebe.
 */
const DREAD_CORE = CONTACT + TILE;
/**
 * **Was eine gesperrte Tür auf dem Fluchtweg kostet**, in Metern Umweg, wenn
 * das Monster noch weit ist: Hingehen, ziehen, weiterlaufen — ungefähr ein
 * Zimmer weit. Keine Wand: Die wäre wieder die Ecke, in der er stehen bleibt.
 */
const DOOR_TOLL = 6;
/**
 * Und um diesen Faktor teurer, wenn es ihm direkt im Nacken sitzt. Am Riegel
 * steht er still; was er dort verliert, gewinnt der Verfolger.
 */
const DOOR_HURRY = 1.5;

/**
 * **Der Aufschlag für eine gesperrte Tür auf dem Fluchtweg**, in Metern
 * Umweg: `DOOR_TOLL`, solange das Monster weiter weg ist als seine Vorsicht
 * reicht, und bis zu `1 + DOOR_HURRY` mal so viel, je näher es steht.
 */
export function doorToll(gap: number, caution: number): number {
  const hurry = Math.max(0, Math.min(1, 1 - gap / Math.max(1, caution)));
  return DOOR_TOLL * (1 + DOOR_HURRY * hurry);
}

export class TechnicianBot {
  private readonly walker: FlatWalker;
  private readonly jobs: Job[];
  private job = 0;
  private work = 0;
  private survival: 'mission' | 'flee' | 'hide' = 'mission';
  private calm = 0;
  private stamina: number;
  private escape: Cover | null = null;
  /** Wo er das Monster zuletzt bemerkt hat, und bis wann er es im Kopf behält. */
  private dread: { at: FloorPoint; until: number } | null = null;
  private readonly roll: () => number;
  /** Wie oft er sich in eine Kabine gerettet hat. */
  hides = 0;
  /** Wie oft er auf der Flucht einen Riegel aufgezogen hat. */
  unlocks = 0;
  /** Wie oft ihn das Monster wahrgenommen hat — hier: wie oft Gefahr aufkam. */
  alarms = 0;

  constructor(
    private readonly round: FlatRound,
    private readonly tuning: TechnicianTuning = DEFAULT_TUNING.technician,
    roll: () => number = Math.random,
  ) {
    this.walker = new FlatWalker(round);
    this.roll = roll;
    this.stamina = tuning.stamina;
    this.jobs = round
      .jobs()
      .map((job): Job => ({ kind: job.kind, id: job.id, at: job.at, space: job.roomId }));
    const home = round.graph.centre('command');
    this.jobs.push({ kind: 'home', id: 'van', at: home, space: 'command' });
  }

  get stage(): string {
    return this.survival === 'mission' ? (this.jobs[this.job]?.kind ?? 'done') : this.survival;
  }

  /**
   * Der Stock zum Ziel — und kurz davor **weniger** ausgelenkt: Die Runde
   * geht so schnell, wie der Stock steht, und wer bei großen Zeitschritten
   * mit vollem Stock ankommt, schießt über das Ziel hinaus und pendelt.
   */
  private toward(goal: FloorPoint, dt: number, sprint = false): FlatInput | null {
    const input = this.walker.input(goal, dt, sprint, this.avoid());
    if (!input) return null;
    const round = this.round;
    if (round.graph.spaceAt(goal) !== round.player.space) return input;
    const distance = Math.hypot(goal.x - round.player.x, goal.z - round.player.z);
    const reach = (sprint ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED) * Math.max(dt, 1 / 30);
    const scale = Math.min(1, Math.max(0.15, distance / reach));
    return { x: input.x * scale, z: input.z * scale, sprint: input.sprint };
  }

  /**
   * **Was er meiden will** — die Stelle, an der er das Monster zuletzt wusste,
   * mit dem Gewicht seiner Angst. `null`, solange er nichts weiß: Dann ist
   * der kürzeste Weg der richtige.
   */
  private avoid(): RouteAvoid | null {
    const dread = this.dread;
    if (!dread || this.round.state().time > dread.until) return null;
    const hp = Math.max(0, Math.min(SUIT_LIVES, this.round.state().crew.hp));
    // Voll: `DREAD_WEIGHT`. Beim letzten Leben: um `DREAD_HURT` mehr.
    const hurt = 1 - hp / SUIT_LIVES;
    return {
      at: dread.at,
      radius: DREAD_RANGE,
      weight: DREAD_WEIGHT * (1 + hurt * DREAD_HURT),
      core: DREAD_CORE,
    };
  }

  /** Was er gerade meidet — für Anzeigen und Tests. */
  get dreaded(): RouteAvoid | null {
    return this.avoid();
  }

  /** Ein Zeitschritt: Stock lesen, Knöpfe drücken, Runde rechnen. */
  step(dt: number): void {
    const round = this.round;
    if (round.phase !== 'running') return;
    const state = round.state();
    const crew = state.crew;
    const graph = round.graph;
    const hidden = !!crew.hidden;
    const gap = state.monsterOn
      ? Math.hypot(round.player.x - round.monster.x, round.player.z - round.monster.z)
      : Infinity;
    const danger =
      state.monsterOn &&
      !hidden &&
      (gap < this.tuning.caution || round.monster.space === round.player.space) &&
      graph.distance(round.monster.space, round.player.space) < this.tuning.caution * 1.5;
    this.calm = danger ? 0 : this.calm + dt;
    // Solange es nah ist, weiß er, wo es steht; danach verblasst es.
    if (danger)
      this.dread = {
        at: { x: round.monster.x, z: round.monster.z },
        until: state.time + DREAD_MEMORY,
      };
    else if (this.dread && state.time > this.dread.until) this.dread = null;

    // Versteckt: still bleiben, bis lange genug Ruhe war.
    if (hidden) {
      if (this.calm > this.tuning.nerve) {
        round.act('interact');
        this.survival = 'mission';
        this.escape = null;
        this.stamina = this.tuning.stamina;
      }
      round.step(dt, IDLE);
      return;
    }
    if (this.survival === 'hide') this.survival = 'flee';

    if (danger && this.survival === 'mission') {
      this.survival = 'flee';
      this.escape = null;
      this.alarms++;
      if (round.puzzle) round.closePuzzle();
      this.work = 0;
    }
    if (this.survival === 'flee' && this.calm > this.tuning.nerve) {
      this.survival = 'mission';
      this.escape = null;
      this.stamina = this.tuning.stamina;
    }

    if (this.survival === 'flee') {
      this.stamina = Math.max(0, this.stamina - dt);
      this.escape ??= this.chooseCover(graph, gap);
      const input = this.toward(this.escape.at, dt, this.stamina > 0);
      this.unlockAhead();
      if (input) {
        round.step(dt, input);
        return;
      }
      if (this.escape.locker && round.target?.kind === 'locker') {
        round.act('interact');
        if (round.state().crew.hidden) {
          this.hides++;
          this.survival = 'hide';
          this.calm = 0;
        }
      }
      // Wer nur weggelaufen ist, sucht am Ziel gleich den nächsten Sprung.
      this.escape = null;
      round.step(dt, IDLE);
      return;
    }

    // --- Der Auftrag ---------------------------------------------------------
    const target = this.jobs[this.job];
    if (!target) {
      round.step(dt, IDLE);
      return;
    }
    const input = this.toward(target.at, dt);
    if (input) {
      round.step(dt, input);
      this.stamina = Math.min(this.tuning.stamina, this.stamina + dt * 0.4);
      return;
    }
    if (target.kind === 'home') {
      round.step(dt, IDLE);
      return;
    }
    if (round.target?.id !== target.id) {
      // Angekommen, aber der Knopf zeigt auf etwas anderes: näher heran.
      const dx = target.at.x - round.player.x,
        dz = target.at.z - round.player.z;
      const d = Math.hypot(dx, dz) || 1;
      round.step(dt, { x: dx / d, z: dz / d, sprint: false });
      return;
    }
    round.step(dt, IDLE);
    this.work += dt;
    const needed = (target.kind === 'cargo' ? CARGO_SECONDS : CONSOLE_SECONDS) * this.tuning.work;
    if (this.work < needed) return;
    this.work = 0;
    if (target.kind === 'cargo') {
      round.act('interact');
      round.act('interact');
      this.job++;
      return;
    }
    round.act('interact');
    if (!round.puzzle) return;
    this.solvePuzzle();
    if (!round.puzzle) this.job++;
  }

  /**
   * **Der Riegel im Fluchtweg.** Endet die Route vor einer gesperrten Tür,
   * weil es keinen Umweg gibt (`FlatWalker.blocked`), zieht er sie auf,
   * sobald sie in Reichweite ist — mit demselben Knopf, den ein Mensch dort
   * drückt. Bezahlt hat er das schon bei der Wahl der Deckung (`doorToll`).
   *
   * @returns ob er gerade an einem Riegel gezogen hat.
   */
  private unlockAhead(): boolean {
    const round = this.round;
    const bolt = this.walker.blocked;
    if (!bolt || !round.state().shut.includes(bolt.id)) return false;
    const target = round.target;
    if (target?.kind !== 'door' || target.id !== bolt.id) return false;
    round.act('interact');
    this.unlocks++;
    return true;
  }

  private solvePuzzle(): void {
    const round = this.round;
    const repair = round.puzzle;
    if (!repair) return;
    const puzzle = puzzleFor(round.state().crew, repair.id);
    if (repair.puzzle === 'wires')
      for (let plug = 0; plug < 4; plug++)
        round.solve({ kind: 'wire', plug, socket: repair.order.indexOf(plug) });
    else if (repair.puzzle === 'sequence') {
      puzzle.links = [];
      for (const digit of repair.code) round.solve({ kind: 'digit', digit: Number(digit) });
    } else {
      for (let column = 0; column < 3; column++)
        while (puzzle.digits[column] !== Number(repair.code[column]))
          round.solve({ kind: 'turn', column });
      round.solve({ kind: 'send' });
    }
  }

  /**
   * **Wohin er flieht** — das Zwischenziel, mit dem er dem Monster entkommt:
   * weit weg, oder in eine Kabine. Die Kabine ist die sichere Bank, solange
   * niemand zusieht; das freie Feld der Ausweg, wenn jemand zusieht. Eine
   * zerstörte Kabine steht auf der Karte als solche und kommt nicht mehr in
   * Frage.
   *
   * Gesucht wird **zwei Zimmer weit**, nicht nur eines: Ein Sprung ins
   * Nachbarzimmer ist kein Entkommen, wenn das Monster dieselbe Tür nimmt.
   * Und je weniger Leben er hat, desto mehr zählt der Abstand und desto
   * weniger der Weg dorthin — beim letzten Leben rennt er lieber weit.
   *
   * **Gesperrte Türen zählen als Umweg mit** (`doorToll`): Der Raum dahinter
   * ist nicht verboten, er ist teurer — und je näher das Monster steht, desto
   * teurer, weil er am Riegel stillsteht, während es aufholt.
   */
  private chooseCover(graph: StationGraph, gap: number): Cover {
    const round = this.round;
    const here = round.player.space;
    const watched = round.monster.space === here && gap < 8;
    const wantsLocker = !watched && this.roll() < this.tuning.hide;
    const hurt = 1 - Math.max(0, Math.min(SUIT_LIVES, round.state().crew.hp)) / SUIT_LIVES;
    // Angeschlagen wiegt der Abstand schwerer als der Weg dorthin.
    const toll = 0.6 * (1 - hurt * 0.5);
    const spaces = new Set<string>([here]);
    for (const near of graph.neighbours(here)) {
      spaces.add(near);
      for (const far of graph.neighbours(near)) spaces.add(far);
    }
    let best: Cover | null = null;
    let score = -Infinity;
    const shut = round.state().shut;
    const perBolt = doorToll(gap, this.tuning.caution);
    for (const space of spaces) {
      if (space === round.monster.space) continue;
      const away = graph.distance(space, round.monster.space);
      const bolts = lockedDoorsBetween(round.house, graph, here, space, shut).length;
      const cost = graph.distance(here, space) + bolts * perBolt;
      const locker = wantsLocker && round.rules.cabinUsable(space) ? graph.locker(space) : null;
      const options: Cover[] = [{ at: graph.centre(space), space, locker: false }];
      if (locker) options.push({ at: locker, space, locker: true });
      for (const candidate of options) {
        const value = away - cost * toll + (candidate.locker ? 9 : 0);
        if (value > score) {
          score = value;
          best = candidate;
        }
      }
    }
    return best ?? { at: graph.centre(here), space: here, locker: false };
  }
}
