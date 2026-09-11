import { PLAYER_SPRINT_SPEED, PLAYER_WALK_SPEED } from '../mission';
import type { StationGraph } from '../roomGraph';
import type { FloorPoint } from '../stationLayout';

/**
 * **Wo der Spieler gleich sein wird — und wer zuerst an der Tür ist.**
 *
 * Bisher lief die Verfolgung auf `signal`: das Monster rannte dorthin, wo der
 * Spieler *war*. Das ist der Grund, warum eine Flucht hier immer geklappt hat,
 * solange man nur geradeaus lief — der Verfolger nahm denselben Weg, nur ein
 * paar Meter später, und holte damit genau nichts auf. Ein Verfolger, der
 * abkürzt, ist etwas ganz anderes: Er steht plötzlich in der Tür, auf die man
 * zuläuft.
 *
 * Hier steht deshalb die **Rechnung** dazu und keine Haltung: aus den letzten
 * Sichtungen Richtung und Tempo, daraus die zwei Türen, die vor dem Spieler
 * liegen, dazu je eine Ankunftszeit — und dieselbe Zeit für das Monster
 * (`Estimator`). Der Vergleich dieser Zahlen ergibt die Entscheidung
 * `chase | intercept | ambush | search`.
 *
 * **Kein three.js, kein DOM, kein Zustand.** Alles hier ist eine Funktion von
 * ihren Eingaben; wer die Prognose zweimal mit denselben Zahlen fragt, bekommt
 * zweimal dasselbe. Das ist die Voraussetzung dafür, dass die
 * Trainingssimulation (`roundSim.ts`) dieselbe Rechnung hunderte Male je
 * Sekunde ausspielen kann wie das Monster im Headset.
 *
 * **Angeschlossen ist es in `monsterRoutine.ts`** (Paket M2): Dort heißen die
 * Haltungen `intercept` und `ambush`, dort wird `plan()` alle `REPLAN`
 * Sekunden gestellt, und dort kommt das Ergebnis als Ziel und Tempo heraus.
 *
 * **Das Gedächtnis liegt bewusst nur als Form vor.** `MonsterMemory`
 * (`monster/monsterMemory.ts`, Vertrag 4.3) entsteht parallel; damit dieses
 * Modul für sich prüfbar bleibt, steht hier statt eines Imports das, was
 * gebraucht wird: `TrackLike` und `MemoryLike`. Die echte `MonsterMemory`
 * erfüllt beide Formen — `memory.track` ist ein `TrackLike`, die Klasse selbst
 * ein `MemoryLike` —, und M2 steckt beides zusammen.
 */

/** Der Vorsprung, den das Monster an der Tür haben muss, in Sekunden. */
export const SLACK = 0.8;

/**
 * Wie lange an einer Tür gelauert werden darf, in Sekunden.
 *
 * Eine Obergrenze und keine Zierde: Ein Monster, das unbegrenzt an der Tür
 * steht, hinter der es den Spieler vermutet, ist kein Gegner mehr, sondern
 * eine geschlossene Tür. Nach dieser Frist muss es sich bewegen.
 */
export const AMBUSH_MAX = 12;

/** Wie sicher sich das Monster über den Raum sein muss, bevor es lauert. */
export const AMBUSH_SURE = 0.6;

/**
 * Wie viele Türen der Raum höchstens haben darf, in dem gelauert wird.
 *
 * An einem Raum mit vier Ausgängen ist Lauern nur eine andere Art zu warten:
 * Die Aussicht, an der richtigen Tür zu stehen, ist dann schlechter als die
 * Aussicht, ihn beim Absuchen zu finden.
 */
export const AMBUSH_EXITS = 2;

/**
 * Um wie viel eine Lauerzeit gewürfelt kürzer ausfällt (Anteil).
 *
 * Damit niemand mitzählen kann, wie lange es dauert, bis der Weg wieder frei
 * ist — dieselbe Überlegung wie bei den Türsperren (`rules/doorLocks.ts`).
 */
export const AMBUSH_JITTER = 0.25;

/**
 * Ab welchem Abstand eine Tür als Abfangziel zählt, in Metern.
 *
 * Wer schon in der Tür steht, wird dort nicht mehr abgefangen: Die Tür ist
 * dann kein Ziel, sondern der Startpunkt des Spielers, und ein Monster, das
 * dorthin läuft, läuft ihm hinterher und nennt es Abfangen.
 */
export const AT_DOOR = 1.2;

/** Unter diesem gemessenen Tempo gilt der Spieler als stehend, in m/s. */
const STILL = 0.2;

/**
 * Wie weit eine Sichtung höchstens verlängert wird, in Sekunden.
 *
 * Danach ist die Geradeausvermutung geraten und nicht mehr gerechnet — weiter
 * trägt das Glaubensbild und nicht die Prognose.
 */
const PREDICT_AGE = 2;

/** Wie viele Türen weit die Prognose reicht. */
const PREDICT_DOORS = 2;

/** Womit ein Misstrauen gegen die eigene Prognose gedeckelt wird. */
const TRUST_MIN = 0.2;

/**
 * **Wie lange jemand von hier nach dort braucht.**
 *
 * Zwei Auskünfte, dieselbe Frage: Die Simulation rechnet auf der Raumkarte
 * (`graphEstimator`), die Welten später auf der echten Route
 * (`routeEstimator`, M2, mit kurzem Zwischenspeicher). Wer die Entscheidung
 * trifft, soll nicht wissen müssen, welche von beiden gerade antwortet.
 */
export interface Estimator {
  /** Sekunden, die jemand mit `speed` von `from` bis `to` braucht; `Infinity` wenn unerreichbar. */
  time(from: FloorPoint, to: FloorPoint, speed: number): number;
}

/** Eine Sichtung, wie sie im Gedächtnis steht (Vertrag 4.3). */
export interface SightingLike {
  at: FloorPoint;
  time: number;
  sprinting?: boolean;
}

/** Die Spur der letzten Sichtungen — die Form von `MonsterMemory.track` (Vertrag 4.3). */
export interface TrackLike {
  /** Die jüngste Sichtung steht hinten. */
  readonly sightings: readonly SightingLike[];
  /** Geglättete Richtung und Tempo; `null`, solange es weniger als zwei Sichtungen sind. */
  velocity(): { dir: FloorPoint; speed: number } | null;
}

/** Das Glaubensbild — die Form von `MonsterMemory` (Vertrag 4.3), soweit hier gebraucht. */
export interface MemoryLike {
  /** Wie wahrscheinlich der Spieler in diesem Raum ist (0…1). */
  belief(room: string): number;
  /** Der Raum mit dem höchsten Glauben. */
  mostLikely(): string;
  /** Wie ausgeprägt die Spitze im Glaubensbild ist (0…1). */
  certainty(): number;
  /** Wie sich der Glaube aus diesem Raum auf seine Türen verteilt. */
  exits(room: string): ReadonlyArray<{ door: string; share: number }>;
}

/**
 * **Der vermutete Weg des Spielers.**
 *
 * `path[0]` ist, wo er jetzt sein dürfte; danach folgen die Türmitten.
 * `doors[i]` gehört zu `path[i + 1]`, und `eta[i]` sagt, wie viele Sekunden er
 * bis dorthin braucht — die drei Listen sind also nach Türen indiziert und
 * `path` hat genau einen Eintrag mehr.
 */
export interface Prediction {
  path: FloorPoint[];
  doors: string[];
  eta: number[];
  /** Das angenommene Tempo in m/s: gemessen, sonst Sprint- oder Gehtempo. */
  speed: number;
}

export type Plan =
  | { kind: 'chase'; at: FloorPoint }
  | { kind: 'intercept'; at: FloorPoint; door: string; etaMonster: number; etaPlayer: number }
  | { kind: 'ambush'; at: FloorPoint; door: string; room: string; until: number }
  | { kind: 'search'; room: string };

/**
 * **Reisezeit über die Raumkarte** — Raummitte zu Raummitte, plus die Stummel
 * an beiden Enden.
 *
 * Grob, aber überall gleich grob: Die Karte kennt nur Knoten und Kanten
 * (`roomGraph.ts`), und die Entscheidung „wer ist zuerst an der Tür" braucht
 * keine Zentimeter, sondern zwei Zahlen, die nach derselben Regel entstanden
 * sind.
 *
 * Der eine Sonderfall, der wirklich wehtut: **Eine Tür liegt auf der Kante
 * zwischen zwei Räumen.** Welchem der beiden `spaceAt` sie zuschlägt, ist eine
 * Frage der Rundung — und ausgerechnet Türen sind hier das häufigste Ziel.
 * Zwischen Nachbarräumen zählt deshalb auch die Luftlinie: Sonst kostete der
 * Schritt durch die eigene Tür plötzlich den Umweg über zwei Raummitten, und
 * das Monster ließe eine Tür aus, in der es schon fast steht.
 */
export function graphEstimator(graph: StationGraph): Estimator {
  return {
    time(from, to, speed) {
      if (!(speed > 0)) return Infinity;
      const here = graph.spaceAt(from);
      const there = graph.spaceAt(to);
      if (!here || !there) return Infinity;
      const direct = gap(from, to);
      if (here === there) return direct / speed;
      const between = graph.distance(here, there);
      if (!Number.isFinite(between)) return Infinity;
      const around = gap(from, graph.centre(here)) + between + gap(graph.centre(there), to);
      const neighbour = graph.neighbours(here).includes(there);
      return (neighbour ? Math.min(direct, around) : around) / speed;
    },
  };
}

/**
 * **Wo der Spieler in ein paar Sekunden sein wird, wenn er weiterläuft.**
 *
 * Die Annahme ist bewusst einfach — er läuft weiter, wie er läuft —, und sie
 * ist genau so lange gut, wie eine Flucht dauert. Aus dem Kurs wird die Tür
 * des Raums, die am ehesten vor ihm liegt; dahinter fragt das Glaubensbild,
 * wohin es von dort aus weitergeht (`memory.exits`). Mehr als zwei Türen weit
 * zu raten lohnt nicht: Jede Tür ist eine Verzweigung, und nach der zweiten
 * ist die Prognose keine mehr.
 *
 * Das Tempo ist gemessen, wenn es gemessen wurde, sonst Sprint- oder Gehtempo
 * aus `mission.ts`. Ist die **Puste** bekannt (`stamina`), rechnet die
 * Ankunftszeit sie ein: Die ersten `left` Sekunden im Sprint, danach im Trab.
 * Genau daran hängt, ob ein Abfangen überhaupt aufgeht — ein Spieler, der die
 * Puste schon verbraucht hat, ist eine andere Rechnung als einer, der frisch
 * losrennt.
 *
 * `null`, solange es keine zwei Sichtungen gibt: Ohne Richtung gibt es keine
 * Prognose, und eine erfundene wäre schlimmer als keine.
 */
export function predictPlayer(
  track: TrackLike,
  memory: MemoryLike,
  graph: StationGraph,
  now: number,
  stamina?: { left: number; trot: number },
): Prediction | null {
  const last = track.sightings.at(-1);
  if (!last) return null;
  const move = track.velocity();
  if (!move) return null;
  let heading = unit(move.dir);
  if (!heading) return null;
  const speed =
    move.speed > STILL ? move.speed : last.sprinting ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED;
  const age = Math.min(Math.max(0, now - last.time), PREDICT_AGE);
  const at = advance(graph, last.at, heading, speed * age);
  let here = graph.spaceAt(at) || graph.spaceAt(last.at);
  if (!here) return null;

  const path: FloorPoint[] = [at];
  const doors: string[] = [];
  const eta: number[] = [];
  const taken = new Set<string>();
  let from = at;
  let walked = 0;
  for (let step = 0; step < PREDICT_DOORS; step++) {
    const door =
      step === 0
        ? aimedDoor(graph, here, from, heading, taken)
        : (likelyDoor(graph, memory, here, graph.doorsOf(here), taken) ??
          aimedDoor(graph, here, from, heading, taken));
    if (!door) break;
    const point = graph.doorPoint(door);
    if (!point) break;
    walked += gap(from, point);
    taken.add(door);
    path.push(point);
    doors.push(door);
    eta.push(travelTime(walked, speed, stamina));
    heading = unit({ x: point.x - from.x, z: point.z - from.z }) ?? heading;
    const next = behindDoor(graph, here, door);
    if (!next) break;
    here = next;
    from = point;
  }
  return { path, doors, eta, speed };
}

/**
 * **Verfolgen, abfangen, lauern oder suchen** — die eine Entscheidung, auf die
 * dieses Modul hinausläuft.
 *
 * Der Reihe nach:
 *
 * - **Abfangen** kommt in Frage, wenn das Monster an einer der vorhergesagten
 *   Türen mit `SLACK` Sekunden Luft früher ist als der Spieler. Von den
 *   Kandidaten gewinnt der, an dem es selbst am schnellsten ist — nicht der
 *   mit dem größten Vorsprung: Ein Abfangpunkt, der in zwölf Sekunden erreicht
 *   ist, ist bis dahin dreimal veraltet.
 * - **Verfolgen** schlägt das Abfangen, wenn schlichtes Aufholen schneller
 *   geht (`gap / (vMonster − vPlayer)`), und ist der Ausweg, wenn keine Tür
 *   passt und das Monster überhaupt schneller ist. Ist es das nicht, wäre
 *   Hinterherlaufen genau der Fehler, den dieses Modul abstellt.
 * - **Lauern** braucht drei Dinge auf einmal: kein Sichtkontakt, ein
 *   Glaubensbild mit einer deutlichen Spitze (`AMBUSH_SURE`) und einen Raum
 *   mit höchstens `AMBUSH_EXITS` Türen. `until` sagt, wann Schluss ist.
 * - **Suchen** ist der Rest — und zwar im wahrscheinlichsten Raum. Der
 *   gewürfelte Nachbarraum von früher (`guess`) hat hier nichts mehr zu
 *   suchen.
 *
 * `tuning.predict` ist das Zutrauen zur eigenen Prognose: Wer wenig hat,
 * verlangt an der Tür mehr Vorsprung. `tuning.ambush` ist die Neigung zum
 * Lauern und streckt die Frist bis höchstens `AMBUSH_MAX`; bei 0 wird gar
 * nicht gelauert. Der Würfel kürzt die Frist nur noch etwas ab
 * (`AMBUSH_JITTER`) — die Entscheidung selbst ist keine Glückssache mehr.
 *
 * **Abweichung vom Vertrag 4.4:** Der Aufruf bekommt zusätzlich den `graph`.
 * Ein Lauerpunkt ist eine Türmitte, und die Türmitten kennt nur die Karte
 * (`roomGraph.doorPoint`); das Gedächtnis nennt Türen beim Namen, nicht bei
 * ihrer Stelle. Ohne die Karte könnte `ambush` nur den Raum liefern, und damit
 * stünde das Monster wieder in der Raummitte wie beim alten `stakeout`.
 */
export function plan(input: {
  monsterAt: FloorPoint;
  huntSpeed: number;
  playerAt: FloorPoint | null;
  prediction: Prediction | null;
  memory: MemoryLike;
  estimator: Estimator;
  graph: StationGraph;
  now: number;
  rng: () => number;
  tuning: { predict: number; ambush: number };
}): Plan {
  const prediction = input.prediction;
  const slack = SLACK / Math.max(input.tuning.predict, TRUST_MIN);
  let best: { at: FloorPoint; door: string; etaMonster: number; etaPlayer: number } | null = null;
  if (prediction)
    for (let i = 0; i < prediction.doors.length; i++) {
      const at = prediction.path[i + 1];
      const door = prediction.doors[i];
      const etaPlayer = prediction.eta[i];
      if (!at || !door || etaPlayer === undefined || !(etaPlayer > 0)) continue;
      if (gap(at, prediction.path[0]!) <= AT_DOOR) continue;
      const etaMonster = input.estimator.time(input.monsterAt, at, input.huntSpeed);
      if (!Number.isFinite(etaMonster) || etaMonster + slack > etaPlayer) continue;
      if (!best || etaMonster < best.etaMonster) best = { at, door, etaMonster, etaPlayer };
    }

  const quarry = input.playerAt ?? prediction?.path[0] ?? null;
  const chased = prediction?.speed ?? 0;
  const catchUp =
    quarry && input.huntSpeed > chased
      ? gap(input.monsterAt, quarry) / (input.huntSpeed - chased)
      : Infinity;
  if (quarry && catchUp < (best ? best.etaMonster : Infinity)) return { kind: 'chase', at: quarry };
  if (best)
    return {
      kind: 'intercept',
      at: best.at,
      door: best.door,
      etaMonster: best.etaMonster,
      etaPlayer: best.etaPlayer,
    };

  const room = input.memory.mostLikely();
  if (input.playerAt === null && room && input.memory.certainty() >= AMBUSH_SURE) {
    const exits = input.graph.doorsOf(room);
    const hold =
      AMBUSH_MAX *
      Math.max(0, Math.min(1, input.tuning.ambush)) *
      (1 - AMBUSH_JITTER * input.rng());
    if (exits.length > 0 && exits.length <= AMBUSH_EXITS && hold > 0) {
      const door = likelyDoor(input.graph, input.memory, room, exits) ?? exits[0]!;
      const at = input.graph.doorPoint(door);
      if (at) return { kind: 'ambush', at, door, room, until: input.now + hold };
    }
  }
  return { kind: 'search', room };
}

/** Wie lange `distance` Meter dauern — mit Puste, wenn sie bekannt ist. */
function travelTime(
  distance: number,
  speed: number,
  stamina?: { left: number; trot: number },
): number {
  if (!(speed > 0)) return Infinity;
  if (!stamina || !(stamina.trot > 0) || !Number.isFinite(stamina.left)) return distance / speed;
  const left = Math.max(0, stamina.left);
  const dash = speed * left;
  if (distance <= dash) return distance / speed;
  return left + (distance - dash) / stamina.trot;
}

/**
 * Die Tür dieses Raums, die dem Kurs am nächsten liegt.
 *
 * Das Winkelgewicht ist das Skalarprodukt aus Kurs und Türrichtung: 1 heißt
 * „genau darauf zu", −1 „genau im Rücken". Bei zwei gleich gut liegenden Türen
 * gewinnt die nähere — sonst hinge die Wahl an der Reihenfolge im Bauplan.
 */
function aimedDoor(
  graph: StationGraph,
  room: string,
  from: FloorPoint,
  heading: FloorPoint,
  taken: ReadonlySet<string>,
): string {
  let best = '';
  let bestScore = -Infinity;
  let bestGap = Infinity;
  for (const door of graph.doorsOf(room)) {
    if (taken.has(door)) continue;
    const point = graph.doorPoint(door);
    if (!point) continue;
    const towards = unit({ x: point.x - from.x, z: point.z - from.z });
    if (!towards) continue;
    const score = towards.x * heading.x + towards.z * heading.z;
    const away = gap(from, point);
    if (score > bestScore + 1e-6 || (Math.abs(score - bestScore) <= 1e-6 && away < bestGap)) {
      best = door;
      bestScore = score;
      bestGap = away;
    }
  }
  return best;
}

/**
 * **Die Tür mit dem größten Zufluss aus dem Glaubensbild** — `null`, wenn keine
 * der genannten Türen darin vorkommt.
 *
 * `exits` ist die Antwort auf „wohin fließt der Glaube aus diesem Raum ab";
 * gefiltert wird gegen die Türen, die die Karte diesem Raum wirklich gibt,
 * damit eine veraltete Erinnerung keine Tür erfindet.
 *
 * **Zwei Namen für dieselbe Tür, und daran ist das hier schon einmal
 * gescheitert.** Das Gedächtnis nennt eine Tür nach den beiden Räumen, die sie
 * verbindet (`monsterMemory.doorKey`, „flur|kombüse"); die Karte nennt sie so,
 * wie der Bauplan sie nennt (`d7`). Verglichen wurden bis eben die
 * Zeichenketten — und damit fand dieser Vergleich **nie** eine Tür: Das Lauern
 * stand immer an der ersten Tür des Raums, und die Prognose lief hinter der
 * ersten Tür weiter, statt hinter der wahrscheinlichsten. Also wird jetzt
 * übersetzt: aus dem Raumpaar der Nachbarraum, und aus dem Nachbarraum die
 * Tür, die beide Räume gemeinsam haben. Wer schon Kartennamen liefert (die
 * Tests tun es), kommt unverändert durch.
 */
function likelyDoor(
  graph: StationGraph,
  memory: MemoryLike,
  room: string,
  among: Iterable<string>,
  taken?: ReadonlySet<string>,
): string | null {
  const here = new Set(among);
  let best: string | null = null;
  let bestShare = -Infinity;
  for (const exit of memory.exits(room)) {
    const door = named(graph, room, exit.door, here);
    if (!door || taken?.has(door) || exit.share <= bestShare) continue;
    best = door;
    bestShare = exit.share;
  }
  return best;
}

/**
 * **Die Tür, an der sich das Lauern lohnt**, mit dem Namen der Karte — für
 * alle, die dieselbe Frage stellen wie `plan()` selbst (`monsterRoutine.ts`
 * beim Auflauern). `null`, wenn der Raum keine Tür hat.
 */
export function likelyExit(graph: StationGraph, memory: MemoryLike, room: string): string | null {
  const doors = graph.doorsOf(room);
  if (!doors.length) return null;
  return likelyDoor(graph, memory, room, doors) ?? doors[0]!;
}

/** Aus dem Namen des Gedächtnisses den Namen der Karte machen. */
function named(
  graph: StationGraph,
  room: string,
  door: string,
  among: ReadonlySet<string>,
): string | null {
  if (among.has(door)) return door;
  const parts = door.split('|');
  if (parts.length !== 2) return null;
  const other = parts[0] === room ? parts[1]! : parts[1] === room ? parts[0]! : '';
  if (!other) return null;
  for (const candidate of among) if (graph.doorsOf(other).includes(candidate)) return candidate;
  return null;
}

/**
 * Der Raum hinter dieser Tür.
 *
 * Die Karte sagt, welche Türen ein Raum hat und wer an ihn grenzt — welche Tür
 * zu welchem Nachbarn gehört, steht nirgends. Bei drei, vier Nachbarn ist das
 * billiger nachgeschlagen als eine zweite Tabelle gepflegt.
 */
function behindDoor(graph: StationGraph, room: string, door: string): string {
  for (const other of graph.neighbours(room)) if (graph.doorsOf(other).includes(door)) return other;
  return '';
}

/**
 * Den Punkt um `distance` Meter weiterschieben — aber nur, solange er in der
 * Station bleibt. Eine Verlängerung, die durch die Außenwand zeigt, ist keine
 * Prognose; dann gilt wieder die Sichtung selbst.
 */
function advance(
  graph: StationGraph,
  from: FloorPoint,
  heading: FloorPoint,
  distance: number,
): FloorPoint {
  if (!(distance > 0)) return from;
  const point = { x: from.x + heading.x * distance, z: from.z + heading.z * distance };
  return graph.spaceAt(point) ? point : from;
}

function gap(a: FloorPoint, b: FloorPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function unit(v: FloorPoint): FloorPoint | null {
  const length = Math.hypot(v.x, v.z);
  return length > 1e-6 ? { x: v.x / length, z: v.z / length } : null;
}
