import { generateHouse, type HouseSpec } from './house';
import {
  ENTITY_PROFILES,
  freshThreat,
  hearNoises,
  stepAwareness,
  takeAlert,
  type HeardNoise,
} from './threat';
import { MONSTERS, repairsFor, type MonsterKind } from './mission';
import { MonsterRoutine, paceSpeed, type MonsterMode } from './monsterRoutine';
import { Rng } from './rng';
import { stationGraph, COMMAND, type StationGraph } from './roomGraph';
import { stationLayout, type FloorPoint } from './stationLayout';
import { taskCargo } from './rules/cargo';
import { DEFAULT_TUNING, type BotTuning } from './botTuning';
import { HEARING, Hearing, reachOf, type HearingWorld } from './audio/hearing';
import { NOISE } from './audio/cues';
import { roomsOf, wallsOf } from './map/extract';
import { DOOR_WIDTH, doorAxis, doorCentre } from './map/geometry';
import { VentNet } from './vents/ventGraph';
import { CREW_SIZE, SEAL_HOLD, askSeal, commandLag, dueSeal, freshSeal } from './rules/doorSeal';

/**
 * **Eine ganze Runde in einer Millisekunde** — ohne Bild, ohne Physik, ohne
 * Rapier.
 *
 * Sie ist der Prüfstand, auf dem das Training (`botTraining.ts`) seine
 * Gewichte sucht: Ob der Techniker in 60–70 % der Fälle gewinnt, lässt sich
 * nicht ausrechnen und nicht erraten — man muss es **ausspielen**, und zwar
 * hundertmal, sonst misst man den Zufall und nicht die Einstellung.
 *
 * **Was sie vereinfacht und was nicht.** Vereinfacht ist die Bewegung: Wer
 * unterwegs ist, läuft die Kantenzüge der Raumkarte ab (`roomGraph.ts`) statt
 * durch ein Vierteldezimeter-Raster. Nicht vereinfacht ist alles, woran die
 * Balance hängt — dieselben Tempi, dasselbe Kreaturprofil, dieselbe Routine
 * des Monsters (`monsterRoutine.ts`), dieselben drei Reparaturen an
 * denselben Stellen, dieselben Schutzschränke aus `stationLayout.ts`. Was
 * hier gewinnt, gewinnt auch im Headset — nicht auf die Sekunde, aber auf die
 * Runde.
 *
 * **Sie würfelt nur an einer Stelle.** Same hinein, Ergebnis heraus: Zwei
 * Läufe mit denselben Zahlen sind dieselbe Runde, sonst wäre ein Training
 * eine Messung von Rauschen.
 */

export type RoundReason = 'repaired' | 'killed' | 'timeout';

export interface RoundResult {
  won: boolean;
  reason: RoundReason;
  /** Wie lange die Runde gedauert hat, in Sekunden. */
  time: number;
  /** Wie viele Treffer der Techniker eingesteckt hat. */
  hits: number;
  repairs: number;
  /** Wie oft das Monster ihn wahrgenommen hat. */
  contacts: number;
  /** Wie oft er sich in einen Schutzschrank gerettet hat. */
  hides: number;
  /** Wie lange das Monster in welcher Haltung war, in Sekunden. */
  modes: Record<MonsterMode, number>;
}

export interface RoundOptions {
  tuning?: BotTuning;
  kind?: MonsterKind;
  /** Zufall der Runde — getrennt vom Samen der Station. */
  roll?: number;
  /** Nach so vielen Sekunden ohne Ergebnis gilt die Runde als verloren. */
  limit?: number;
  /**
   * **Wie viele mitspielen** — Techniker, Monster und die Plätze der Zentrale
   * (`rules/roundSetup.crewSize`). Zwei heißt: Der Techniker macht die Tür
   * hinter sich selbst zu. Drei und mehr heißt: Er muss es sagen, und das
   * kostet eine bis zwei Sekunden (`rules/doorSeal.ts`). Voreingestellt ist
   * die Runde mit Zentrale, denn das ist die verteilte Voreinstellung.
   */
  players?: number;
}

const DT = 0.25;
const CONTACT = 1.7;
const ARRIVED = 1.2;
/** Eine automatische Tür steht offen, sobald jemand so nah ist (wie in der 2D-Runde). */
const DOOR_TRIGGER = 2.2;
const specs = new Map<number, HouseSpec>();
const worlds = new Map<number, HearingWorld>();
const hearing = new Hearing();

/**
 * Die Station als Hörwelt (`audio/hearing.ts`): Räume, Wände, Türen und
 * Klappen einmal je Samen; der Zustand der Türen wird je Schritt gesetzt.
 */
export function hearingWorld(seed: number): HearingWorld {
  let world = worlds.get(seed);
  if (!world) {
    const spec = simulationSpec(seed);
    const vents = new VentNet(spec);
    world = {
      seed: spec.seed,
      rooms: roomsOf(spec, []),
      walls: wallsOf(spec),
      doors: spec.doors.map((door) => ({
        id: door.id,
        a: door.a,
        b: door.b ?? COMMAND,
        at: doorCentre(door),
        axis: doorAxis(door.dir),
        width: DOOR_WIDTH,
        open: false,
        locked: false,
        material: door.material,
      })),
      items: vents.items(),
      ventLinks: vents.mapLinks(),
    };
    worlds.set(seed, world);
  }
  return world;
}

/** Stationen sind teuer und deterministisch — also einmal bauen und behalten. */
export function simulationSpec(seed: number): HouseSpec {
  let spec = specs.get(seed);
  if (!spec) {
    spec = generateHouse(seed, 14);
    // Die Einrichtung einmal berechnen, damit sie nicht in der ersten
    // simulierten Sekunde jeder Runde noch einmal gepackt wird.
    stationLayout(spec);
    stationGraph(spec);
    specs.set(seed, spec);
  }
  return spec;
}

interface Actor {
  x: number;
  z: number;
  space: string;
}

type Job =
  | { kind: 'cargo'; at: FloorPoint; space: string; seconds: number }
  | { kind: 'console'; at: FloorPoint; space: string; seconds: number }
  | { kind: 'home'; at: FloorPoint; space: string; seconds: number };

export function simulateRound(seed: number, options: RoundOptions = {}): RoundResult {
  const spec = simulationSpec(seed);
  const graph = stationGraph(spec);
  const tuning = options.tuning ?? DEFAULT_TUNING;
  const kind = options.kind ?? 'stalker';
  const profile = ENTITY_PROFILES[kind];
  const base = MONSTERS.find((m) => m.id === kind)!.speed;
  const limit = options.limit ?? 420;
  const rng = new Rng((seed ^ ((options.roll ?? 0) * 0x9e3779b1)) >>> 0);
  const roll = (): number => rng.next();
  const layout = stationLayout(spec);
  const players = options.players ?? CREW_SIZE;

  const jobs = plan(spec, graph, layout, tuning.technician.work);
  const home = graph.centre(COMMAND);
  const technician: Actor = { ...home, space: COMMAND };
  // Das Monster fängt so weit weg an wie möglich — sonst entscheidet der
  // Startplatz die Runde und nicht das Verhalten.
  const start = farthest(graph, home);
  const monster: Actor = { ...graph.centre(start), space: start };
  const routine = new MonsterRoutine(tuning.monster);

  const modes = Object.fromEntries(
    (
      [
        'patrol',
        'reposition',
        'stakeout',
        'search',
        'hunt',
        'announce',
        'breach',
        'savour',
      ] as MonsterMode[]
    ).map((mode) => [mode, 0]),
  ) as Record<MonsterMode, number>;

  let job = 0;
  let work = 0;
  let hp = 3;
  let hits = 0;
  let contacts = 0;
  let hides = 0;
  let hidden = '';
  let caught = '';
  let invulnerable = 0;
  let stamina = tuning.technician.stamina;
  let calm = 0;
  let fleeing = false;
  let escape: { at: FloorPoint; space: string; locker: boolean } | null = null;
  let working = false;
  const memory = freshThreat();
  const world = hearingWorld(seed);
  // **Die Tür hinter dem Techniker** (`rules/doorSeal.ts`): Wer flieht,
  // schlägt sie zu — selbst, oder über einen Zuruf an die Zentrale, der eine
  // bis zwei Sekunden braucht. Für das Monster ist sie so lange keine Kante
  // mehr, wie es im Mittel dauert, sie aufzuziehen.
  const seal = freshSeal();
  let sealed: { pair: string; until: number } | null = null;
  /** Wann die Flucht anläuft — sofort allein, um `commandLag` später im Team. */
  let alarm = Infinity;
  let wasSpace = technician.space;
  let time = 0;

  for (; time < limit; time += DT) {
    invulnerable = Math.max(0, invulnerable - DT);
    const gap = Math.hypot(technician.x - monster.x, technician.z - monster.z);
    if (technician.space !== wasSpace) {
      if (fleeing) askSeal(seal, pairKey(wasSpace, technician.space), time, players, roll);
      wasSpace = technician.space;
    }
    const due = dueSeal(seal, time);
    // **Eine Tür hilft nur, solange das Monster noch dahinter ist.** Wer sie
    // erst zumachen lässt, wenn es längst mit im Raum steht, hat einen Riegel
    // gesetzt und nichts gewonnen — und genau daran scheitert der Zuruf an die
    // Zentrale: In eineinhalb Sekunden ist ein jagendes Monster durch.
    if (due && monster.space !== technician.space) {
      sealed = { pair: due, until: time + SEAL_HOLD };
      // **Eine Tür reißt die Spur ab.** Das ist der eigentliche Gewinn und
      // nicht die Wartezeit: Wer verfolgt wird und eine Tür zwischen sich und
      // den Verfolger bringt, ist für ihn weg — kein Blick, ein gedämpftes
      // Geräusch, und die Jagd wird wieder zur Suche. Im Headset fällt das von
      // selbst so aus (Sichtlinie und Hörmodell rechnen mit dem Blatt); die
      // Simulation kennt nur Räume, also steht es hier ausdrücklich.
      memory.memory = 0;
      memory.target = null;
      memory.alert = Math.min(memory.alert, 1);
    }
    if (sealed && sealed.until <= time) sealed = null;
    const barred = sealed;

    // --- Wahrnehmung des Monsters: dasselbe Hörmodell und dieselbe
    // Alarmleiter wie im Headset und in der 2D-Runde (`threat.ts`). Kein Weg
    // ist kürzer als die Luftlinie: Ist die schon zu weit, spart sich der
    // Schritt Türen und Hörmodell — das ist der Unterschied zwischen sechzig
    // Runden in einer Sekunde und in zwanzig.
    const loudness = hidden ? 0 : fleeing ? NOISE.sprint : working ? NOISE.interact : NOISE.walk;
    let heard: HeardNoise[] = [];
    if (loudness > 0 && gap < reachOf(loudness, HEARING * tuning.monster.hearing)) {
      const trigger = DOOR_TRIGGER * DOOR_TRIGGER;
      for (const door of world.doors) {
        const tx = door.at.x - technician.x,
          tz = door.at.z - technician.z,
          mx = door.at.x - monster.x,
          mz = door.at.z - monster.z;
        door.open = tx * tx + tz * tz < trigger || mx * mx + mz * mz < trigger;
      }
      heard = hearNoises(
        hearing,
        world,
        monster,
        [{ at: technician, loudness }],
        tuning.monster.hearing,
      );
    }
    const seen =
      !hidden &&
      monster.space === technician.space &&
      gap < profile.vision * tuning.monster.vision * 0.5;
    const before = memory.mode;
    stepAwareness(
      memory,
      DT,
      {
        player: technician,
        monster,
        noises: heard,
        flashlight: true,
        lineOfSight: monster.space === technician.space,
        insideStation: true,
        seen,
      },
      { vision: profile.vision, memory: profile.memory * tuning.monster.memory },
      !hidden,
    );
    if (memory.mode === 'hunt' && before !== 'hunt') contacts++;

    const decision = routine.step(graph, {
      dt: DT,
      at: monster,
      here: monster.space,
      signal: memory.memory > 0 ? memory.target : null,
      seen,
      quarry: technician.space,
      caught,
      rng: roll,
      ...takeAlert(memory),
    });
    modes[decision.mode] += DT;
    // Getroffen wird nur, wer in **dieser** Kabine steckt: Das Monster reißt
    // auch leere Kabinen auf (Verdachts-Angriff), und die Simulation führt
    // keine Liste der Wracks — der Techniker darf hier wieder hinein, was
    // ihn etwas besser stellt als im Spiel. Bewusst so gelassen: Balance.
    if (decision.strike && hidden && decision.cabin === hidden) {
      // Die Kabine geht kaputt: ein Treffer, und danach steht er wieder im
      // Raum — mit dem Vorsprung, den ihm `savour` gewährt.
      hp--;
      hits++;
      hidden = '';
      caught = '';
      invulnerable = 3;
      fleeing = true;
      escape = null;
      stamina = tuning.technician.stamina;
    }
    move(
      monster,
      decision.goal,
      graph,
      paceSpeed(base, tuning.monster, decision.pace),
      barred ? (from, to) => barred.pair === pairKey(from, to) : null,
    );

    // --- Der Techniker ------------------------------------------------------
    const danger =
      !hidden &&
      (gap < tuning.technician.caution || monster.space === technician.space) &&
      graph.distance(monster.space, technician.space) < tuning.technician.caution * 1.5;
    calm = danger ? 0 : calm + DT;
    // **Die Reibung des Teams.** Allein merkt der Techniker die Gefahr und
    // rennt. Mit einer Zentrale im Rücken hängt er über seiner Arbeit und
    // bekommt es **gesagt** — und bis das gesagt, gehört und begriffen ist,
    // vergehen ein bis zwei Sekunden (`rules/doorSeal.commandLag`). Genau die
    // Sekunden sind der Preis dafür, zu dritt zu spielen; zurück bekommt die
    // Zentrale sie mit Wissen, das der Einzelne nicht hat.
    if (!danger) alarm = Infinity;
    else if (!fleeing) {
      if (alarm === Infinity) alarm = time + commandLag(players, roll);
      if (time >= alarm) {
        fleeing = true;
        escape = null;
        alarm = Infinity;
      }
    }
    if (fleeing && calm > tuning.technician.nerve) {
      fleeing = false;
      escape = null;
      stamina = tuning.technician.stamina;
    }
    if (hidden) {
      if (calm > tuning.technician.nerve) {
        hidden = '';
        caught = '';
        fleeing = false;
      }
      continue;
    }
    if (gap < CONTACT && invulnerable <= 0 && !decision.strike) {
      hp--;
      hits++;
      invulnerable = 3;
      if (hp <= 0)
        return done(false, 'killed', time, hits, job, contacts, hides, modes, jobs.length);
    }
    if (hp <= 0) return done(false, 'killed', time, hits, job, contacts, hides, modes, jobs.length);

    if (fleeing) {
      stamina = Math.max(0, stamina - DT);
      if (!escape)
        escape = chooseCover(graph, technician, monster, seen, tuning.technician.hide, roll);
      // Wem die Puste ausgeht, der bleibt nicht stehen — er trabt. Ein
      // Techniker, der nach fünf Sekunden auf Arbeitstempo zurückfällt, wird
      // von einem Monster eingeholt, das schneller **geht** als er, und dann
      // entscheidet nicht mehr das Verhalten, sondern eine Stoppuhr.
      const speed =
        stamina > 0
          ? tuning.technician.sprint
          : Math.max(tuning.technician.walk, tuning.technician.sprint * 0.72);
      move(technician, escape.at, graph, speed);
      const reached =
        technician.space === escape.space &&
        Math.hypot(technician.x - escape.at.x, technician.z - escape.at.z) < ARRIVED;
      // Wer nur weggelaufen ist, bleibt am Ziel nicht stehen: Solange die
      // Gefahr da ist, wird der nächste Sprung gesucht.
      if (reached && !escape.locker) escape = null;
      else if (reached) {
        hidden = escape.space;
        hides++;
        calm = 0;
        // Ein beobachteter Rückzug verrät das Versteck: Das Monster hat
        // gesehen, welche Tür zugegangen ist, und kommt es holen.
        if (seen || monster.space === technician.space) caught = hidden;
        escape = null;
      }
      continue;
    }

    const target = jobs[job];
    if (!target)
      return done(true, 'repaired', time, hits, job, contacts, hides, modes, jobs.length);
    const there =
      technician.space === target.space &&
      Math.hypot(technician.x - target.at.x, technician.z - target.at.z) < ARRIVED;
    working = there;
    if (!there) {
      move(technician, target.at, graph, tuning.technician.walk);
      // Nach der Flucht kommt die Puste zurück, aber langsam.
      stamina = Math.min(tuning.technician.stamina, stamina + DT * 0.4);
      continue;
    }
    work += DT;
    if (work < target.seconds) continue;
    work = 0;
    job++;
    if (job >= jobs.length)
      return done(true, 'repaired', time, hits, job, contacts, hides, modes, jobs.length);
  }
  return done(false, 'timeout', limit, hits, job, contacts, hides, modes, jobs.length);
}

function done(
  won: boolean,
  reason: RoundReason,
  time: number,
  hits: number,
  job: number,
  contacts: number,
  hides: number,
  modes: Record<MonsterMode, number>,
  total: number,
): RoundResult {
  return {
    won,
    reason,
    time,
    hits,
    // Der Heimweg ist der letzte Auftrag und keine Reparatur.
    repairs: Math.min(3, Math.floor((job * 3) / Math.max(1, total - 1))),
    contacts,
    hides,
    modes,
  };
}

/** Ersatzteil holen, reparieren, dreimal — und dann nach Hause. */
function plan(
  spec: HouseSpec,
  graph: StationGraph,
  layout: readonly ReturnType<typeof stationLayout>[number][],
  work: number,
): Job[] {
  const jobs: Job[] = [];
  for (const repair of repairsFor(spec)) {
    const cargo = layout.find((item) => item.id === taskCargo(spec, repair.itemId).id);
    const console = layout.find((item) => item.id === `console-${repair.id}`);
    if (cargo)
      jobs.push({
        kind: 'cargo',
        at: cargo.approach,
        space: cargo.roomId,
        seconds: 2.6 * work,
      });
    if (console)
      jobs.push({
        kind: 'console',
        at: console.approach,
        space: console.roomId,
        seconds: 6.4 * work,
      });
  }
  jobs.push({ kind: 'home', at: graph.centre(COMMAND), space: COMMAND, seconds: 0.5 });
  return jobs;
}

function farthest(graph: StationGraph, from: FloorPoint): string {
  let best = graph.spaces[0]!;
  let far = -1;
  for (const id of graph.rooms) {
    const centre = graph.centre(id);
    const distance = Math.hypot(centre.x - from.x, centre.z - from.z);
    if (distance > far) {
      far = distance;
      best = id;
    }
  }
  return best;
}

/**
 * **Wohin man flieht.** Ein Schutzschrank ist die sichere Bank, solange
 * niemand zusieht; das offene Feld ist der Ausweg, wenn er zusieht. Wie sehr
 * der Techniker das eine dem anderen vorzieht, steht in `hide`.
 */
function chooseCover(
  graph: StationGraph,
  technician: Actor,
  monster: Actor,
  watched: boolean,
  hide: number,
  roll: () => number,
): { at: FloorPoint; space: string; locker: boolean } {
  const options = [technician.space, ...graph.neighbours(technician.space)];
  // Ein Schrank, in den jemand hineinsteigen sieht, ist ein Sarg.
  const wantsLocker = !watched && roll() < hide;
  let best: { at: FloorPoint; space: string; locker: boolean } | null = null;
  let score = -Infinity;
  for (const space of options) {
    if (space === monster.space) continue;
    const away = graph.distance(space, monster.space);
    const cost = graph.distance(technician.space, space);
    const locker = graph.locker(space);
    for (const candidate of [
      { at: graph.centre(space), space, locker: false },
      ...(locker && wantsLocker ? [{ at: locker, space, locker: true }] : []),
    ]) {
      const value = away - cost * 0.6 + (candidate.locker ? 9 : 0);
      if (value > score) {
        score = value;
        best = candidate;
      }
    }
  }
  return best ?? { at: graph.centre(technician.space), space: technician.space, locker: false };
}

/** Ein Türpaar als Schlüssel — die Tür zwischen zwei Räumen, richtungslos. */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Einen Schritt auf ein Ziel zu — über die Nachbarräume, nie durch Wände.
 * `barred` sperrt einen Übergang: Davor bleibt der Läufer stehen und zieht
 * am Riegel, statt einen Umweg zu suchen (`rules/doorSeal.ts`).
 */
function move(
  actor: Actor,
  goal: FloorPoint | null,
  graph: StationGraph,
  speed: number,
  barred: ((from: string, to: string) => boolean) | null = null,
): void {
  if (!goal || speed <= 0) return;
  const goalSpace = graph.spaceAt(goal) || actor.space;
  if (goalSpace !== actor.space && barred?.(actor.space, graph.next(actor.space, goalSpace)))
    return;
  const step = goalSpace === actor.space ? goal : graph.centre(graph.next(actor.space, goalSpace));
  const dx = step.x - actor.x,
    dz = step.z - actor.z;
  const distance = Math.hypot(dx, dz);
  const travel = speed * DT;
  if (distance <= travel) {
    actor.x = step.x;
    actor.z = step.z;
  } else {
    actor.x += (dx / distance) * travel;
    actor.z += (dz / distance) * travel;
  }
  const space = graph.spaceAt(actor);
  if (space) actor.space = space;
}
