import { bakeNav, type NavBox } from '../nav/navBake';
import { NavAgent } from '../nav/navAgent';
import { fallDamage, fallHeight } from '../nav/navFall';
import { doorBroken, type NavGraph } from '../nav/navGraph';
import { profileOf } from '../nav/navProfile';
import { NO_TILE, type TileKey } from '../nav/navTile';
import { ERRAND_REACH, newBrainState, stepBrain, type BrainState } from '../npc/npcBrain';
import { brainOf, type BrainId } from '../npc/npcBrains';
import { npcSkin, type NpcKind } from '../npc/npcKinds';
import {
  ROOF,
  SCENARIOS,
  applyLabMap,
  baySpot,
  labBounds,
  labHarm,
  labSolids,
  scenarioOf,
  type BaySpot,
  type LabSolid,
  type ScenarioId,
} from './scenarios';

/**
 * **Das Labor ohne Brille** — dieselben Wände, dieselbe Karte, dieselben
 * Hirne, nur dass niemand zusieht.
 *
 * Der Grund für diese Datei steht in den Fehlern, die sie gefunden hat: Ein
 * Zombie, der durch eine Tür läuft, ein Zombie, der eine Kurve zu eng nimmt und
 * an der Ecke hängen bleibt, ein Zombie, der in eine Lücke plant, durch die er
 * nicht passt. Keiner davon ist ein fehlgeschlagener Test gewesen — alle drei
 * waren ein *Eindruck* aus der Brille, und Eindrücke kann man nicht wiederholen,
 * bis man verstanden hat, woran es lag.
 *
 * Was hier läuft, ist deshalb **nicht** die Wegsuche allein. Die ist längst
 * geprüft (`nav/navPath.test.ts`) und war jedes Mal im Recht: Der Weg, den sie
 * fand, war kurz und ging durch keine Wand. Falsch war, was **danach** kam —
 * der Körper, der ihn laufen sollte. Ein NPC ist ein Zylinder mit 29 cm
 * Halbmesser, und ein Weg, der die Hausecke um zwanzig Zentimeter verfehlt,
 * ist für ihn eine Wand. Deshalb steht hier ein Körper und keine Kette von
 * Kachelmitten:
 *
 * - **Er hat einen Umfang.** Gelaufen wird gegen dieselben Quader, die auch in
 *   der Welt stehen (`labSolids`), mit demselben Halbmesser wie in der Physik
 *   (`npcKinds.ts`) — und er rutscht daran entlang, statt hindurchzugehen.
 * - **Er dreht sich.** Das Tempo hängt daran, wie weit er schon in die richtige
 *   Richtung schaut (`npcBrain.ts`, `aheadFactor`) — genau daran scheitert eine
 *   zu eng genommene Kurve, und ohne Drehrate merkt man davon nichts.
 * - **Er springt und fällt.** Absätze, Stufen und die Lücke zwischen den beiden
 *   Podesten gehen genauso wie in der Welt (`navAgent.ts`, `AgentStep.leap`).
 *
 * Was er **nicht** hat, ist Rapier: keine Trägheit, kein Anschieben, keine
 * Reibung. Das ist Absicht — ein Test, der eine Physik-Engine startet, ist kein
 * Test mehr, sondern ein Ladebildschirm. Was er misst, ist die Frage, die im
 * Labor gestellt wird: *Kommt er da an, und wo lang?*
 */

/** Die Schwerkraft, mit der hier gesprungen wird — dieselbe wie im Labor. */
export const SIM_GRAVITY = 9.81;

/** Wie fein gerechnet wird. Dreißig Bilder je Sekunde reichen für einen Gang. */
export const SIM_DT = 1 / 30;

/** Wie hoch ein Sprung über sein höheres Ende hinausgeht (`Npc.launch`). */
const LEAP_RISE = 0.7;

/**
 * Wie hoch einer tritt, ohne zu springen — **seine** Zahl, nicht eine für alle
 * (`nav/navProfile.CostProfile.stepUp`).
 *
 * Sie steckt am Körper und nicht in einer Konstante, seit die Sorten sich darin
 * unterscheiden: Ein Test, der jeden mit derselben Schrittweite laufen lässt,
 * lässt den Hamster Stufen nehmen, vor denen er in der Brille steht.
 */
function stepUpOf(runner: SimRunner): number {
  return runner.agent.tuning.profile.stepUp;
}

/** Ein Ort im Labor, in Weltmetern. */
export interface SimPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Alle Quader des Labors als Kästen fürs Abtasten — plus, was ein Szenario
 * hinstellt (das zugefallene Türblatt, die Kiste im Durchgang).
 */
export function labBoxes(extra: readonly LabSolid[] = [], graph?: NavGraph): NavBox[] {
  // **Was von einer eingeschlagenen Tür übrig ist, steht nicht mehr im Weg.**
  // Auf der Karte ist sie ein Loch (`navGraph.doorBroken`), in der Welt liegt
  // ihr Blatt in Stücken — und ein Test, der es stehen ließe, hätte einen
  // Zombie, der durch seine eigene Tür nicht kommt.
  const solids = [...labSolids(), ...extra].filter(
    (solid) => !solid.door || !doorBroken(graph?.door(solid.door)),
  );
  return solids.map((solid) => ({
    minX: solid.x - solid.w / 2,
    maxX: solid.x + solid.w / 2,
    minY: solid.y - solid.h / 2,
    maxY: solid.y + solid.h / 2,
    minZ: solid.z - solid.d / 2,
    maxZ: solid.z + solid.d / 2,
  }));
}

/**
 * Das Labor abtasten — mit **denselben** Grenzen und Etagen wie
 * `NavLabWorld`.
 *
 * Stimmt eine der beiden Zahlen nicht überein, tastet der Test eine andere
 * Welt ab als die, die läuft, und das Grün darunter ist wertlos.
 */
export function bakeLab(extra: readonly LabSolid[] = []): NavGraph {
  const box = labBounds();
  const graph = bakeNav(labBoxes(extra), {
    bounds: { minX: box.minX - 2, minZ: box.minZ - 2, maxX: box.maxX + 2, maxZ: box.maxZ + 2 },
    levels: [0, ROOF],
  }).graph;
  // Und alles, was in keinem Quader steht: Grube, Tür, Sprung.
  applyLabMap(graph);
  return graph;
}

/** Einer, der im Labor läuft. */
export interface SimRunner {
  kind: NpcKind;
  /** Seine Füße, jetzt. */
  at: SimPoint;
  /**
   * Was er noch aushält, und ob er schon liegt.
   *
   * Es gibt hier nur eine Sorte Schaden, und sie kommt vom Boden: die Stacheln
   * am Grund der Grube (`scenarios.labHarm`). Wer dort landet, kommt nicht mehr
   * heraus, und deshalb ist „er stirbt darin" keine Frage der Zeit, sondern
   * eine der Rechnung — genau die, die in der Brille auch läuft.
   */
  health: number;
  dead: boolean;
  /** Wo er überall war — ein Punkt je Bild. */
  readonly track: SimPoint[];
  /** Wie nah er dem Spieler je gekommen ist, in Metern (räumlich). */
  nearest: number;
  /**
   * Ob er **da** ist, wo er hinwollte.
   *
   * Zwei Buchtsorten, zwei Bedeutungen, und das ist Absicht: Wer den Spieler
   * verfolgt, ist da, wenn er ihn schlagen könnte (`BrainTuning.reach`); wer
   * einen Auftrag hat, ist da, wenn er an seinem Ziel steht
   * (`npcBrain.ERRAND_REACH`). Beides ist dasselbe Wort für dasselbe: *Er hat
   * geschafft, was er wollte.*
   */
  arrived: boolean;
  /**
   * Nach wie vielen Sekunden das war — `Infinity`, solange er es nicht ist.
   *
   * Die ehrliche Zahl für „wer war schneller da". Die gelaufene Strecke taugt
   * dafür nicht: Wer ein Portal nimmt, legt in einem Bild fünfzehn Meter
   * zurück, und in jeder Längenrechnung sieht das nach einem Umweg aus.
   */
  arrivedAfter: number;
  /** Sein Läufer, für alles, was ihm vorher etwas beibringen will. */
  readonly agent: NavAgent;
  /**
   * Wie lange er insgesamt an Türen gestanden hat — geöffnet und eingeprügelt.
   *
   * Die ehrliche Zahl für „hat er wirklich davorgestanden": Wer eine Tür
   * einschlägt, ist drei Sekunden lang nicht unterwegs, und in jeder
   * Streckenrechnung sieht das aus wie gar nichts.
   */
  atDoor: number;
  /** Welche Türen er auf dem Weg eingeschlagen hat, in der Reihenfolge. */
  readonly broke: string[];
  /** Womit er entscheidet — dasselbe Hirn, das die Bucht in der Brille setzt. */
  readonly brain: BrainId;
  /**
   * Wohin er will, wenn ihn die Bucht geschickt hat — sonst `null`, und dann
   * ist der Spieler das Ziel (`BayCast.goal`).
   */
  readonly goal: SimPoint | null;
}

export interface BayRunOptions {
  /** Wie lange gelaufen wird, in Sekunden Weltzeit. */
  seconds?: number;
  dt?: number;
  /** Quader, die zusätzlich in der Welt stehen — Türblatt, Kiste. */
  props?: readonly LabSolid[];
  /** Was an der Karte geändert wird, bevor es losgeht. */
  setup?: (graph: NavGraph) => void;
  /** Was ein Läufer schon weiß, bevor er losläuft (`navBelief.ts`). */
  brief?: (runner: SimRunner, graph: NavGraph) => void;
  /**
   * **Ein anderes Profil für eine Sorte** — für die Gegenprobe.
   *
   * Dieselbe Bucht, dieselbe Haut, ein anderer Kopf: Der Hamster, der oben auf
   * dem Dach bleibt, springt mit dem Profil eines Zombies dieselbe Kante
   * hinunter — und stirbt dann auch wirklich daran (`nav/navFall.ts`). Erst
   * das macht aus „er bleibt oben" eine Aussage über die Rechnung und nicht
   * über die Sorte.
   */
  profiles?: Readonly<Partial<Record<NpcKind, string>>>;
  /** Wo der Spieler steht — sonst dort, wo die Bucht ihn hinstellt. */
  player?: BaySpot;
}

export interface BayRun {
  graph: NavGraph;
  player: SimPoint;
  runners: SimRunner[];
  /** Wie lange wirklich gelaufen wurde. */
  seconds: number;
}

/**
 * **Eine Bucht laufen lassen.**
 *
 * Der Spieler steht, wo die Bucht ihn hinstellt, der Auftritt läuft los, und
 * am Ende steht da, wer wie weit gekommen ist. Mehr braucht ein Test nicht:
 * Ein Zombie, der ankommt, kam durch; einer, der bei 2,60 m stehen bleibt,
 * steht vor etwas.
 */
export function runBay(id: ScenarioId, options: BayRunOptions = {}): BayRun {
  const bay = scenarioOf(id);
  const dt = options.dt ?? SIM_DT;
  const seconds = options.seconds ?? 40;
  const props = options.props ?? [];
  // **Abgetastet wird ohne die Requisiten**, gelaufen wird mit ihnen — genauso
  // wie in der Welt: Das Labor tastet einmal beim Laden ab, und was ein
  // Szenario danach hinstellt, ändert die Karte einzeln (`setBlocked`,
  // `setDoor`). Wer die Kiste mitabtastet, bekommt eine Kachel *auf* ihr und
  // keine gesperrte darunter.
  const graph = bakeLab();
  const boxes = labBoxes(props, graph);
  const stand = baySpot(bay, options.player ?? bay.stand);
  const player: SimPoint = {
    x: stand.x,
    y: (options.player ?? bay.stand).y ?? 0,
    z: stand.z,
  };

  const runners: SimRunner[] = bay.cast.map((one) => {
    const at = baySpot(bay, one);
    const skin = npcSkin(one.kind);
    const goal = one.goal ? baySpot(bay, one.goal) : null;
    return {
      kind: one.kind,
      brain: one.brain ?? 'chase',
      goal: goal ? { x: goal.x, y: one.goal?.y ?? 0, z: goal.z } : null,
      at: { x: at.x, y: one.y ?? 0, z: at.z },
      track: [{ x: at.x, y: one.y ?? 0, z: at.z }],
      health: skin.health,
      dead: false,
      nearest: Infinity,
      arrived: false,
      arrivedAfter: Infinity,
      atDoor: 0,
      broke: [],
      // **Mit Umfang geplant**, nicht nur gelaufen: Derselbe Halbmesser, mit
      // dem er unten gegen die Wände stößt, hält seinen Weg von den Ecken weg
      // (`nav/navPath.ts`). Wer hier den Vorgabewert stehen ließe, prüfte
      // einen anderen Zombie als den, der gleich losläuft.
      agent: new NavAgent({
        profile: profileOf(options.profiles?.[one.kind] ?? skin.profile),
        girth: skin.radius,
      }),
    };
  });
  // Erst lernen, dann zuschlagen: Der Zombie hat die Tür **offen** gesehen, und
  // erst danach fällt sie zu. Andersherum wüsste er es von Anfang an, und die
  // ganze Bucht behauptete nichts mehr (`navBelief.ts`).
  for (const runner of runners) options.brief?.(runner, graph);
  options.setup?.(graph);

  const bodies = runners.map((runner) => newBody(runner, bay.z < 0 ? 0 : Math.PI));

  let now = 0;
  let solids = boxes;
  const frames = Math.round(seconds / dt);
  for (let frame = 0; frame < frames; frame++) {
    now += dt;
    for (let i = 0; i < runners.length; i++) {
      const broke = advance(runners[i]!, bodies[i]!, graph, solids, player, dt, now);
      // Eine Tür fällt selten; wenn sie fällt, wird die Welt einmal neu
      // aufgestellt statt in jedem Bild.
      if (broke) solids = labBoxes(props, graph);
    }
  }
  return { graph, player, runners, seconds: now };
}

// --- der Körper -------------------------------------------------------------

/** Was ein Läufer zwischen zwei Bildern mit sich herumträgt. */
interface Body {
  yaw: number;
  brain: BrainState;
  radius: number;
  height: number;
  reach: number;
  speed: number;
  turn: number;
  /** Wie hoch er tritt, ohne zu springen — aus seinem Profil. */
  stepUp: number;
  /** Ein laufender Sprung — `null`, solange er steht oder geht. */
  flight: Flight | null;
}

interface Flight {
  from: SimPoint;
  to: SimPoint;
  /** Gesamte Flugzeit und wie viel davon schon vorbei ist. */
  time: number;
  spent: number;
  /** Anfangsgeschwindigkeit nach oben — daraus wird der Bogen. */
  up: number;
}

function newBody(runner: SimRunner, yaw: number): Body {
  const skin = npcSkin(runner.kind);
  const tuning = brainOf(runner.brain).tuning;
  return {
    yaw,
    brain: newBrainState(yaw),
    radius: skin.radius,
    height: skin.height,
    reach: tuning.reach,
    // Das Tempo kommt von der Haut, alles andere vom Hirn — genauso wie in
    // `Npc` (`tuning.speed = options.speed ?? base.speed`).
    speed: skin.speed,
    turn: tuning.turn,
    stepUp: stepUpOf(runner),
    flight: null,
  };
}

/** Ein Bild eines Läufers. `true`, wenn dabei eine Tür gefallen ist. */
function advance(
  runner: SimRunner,
  body: Body,
  graph: NavGraph,
  boxes: readonly NavBox[],
  player: SimPoint,
  dt: number,
  now: number,
): boolean {
  let broke = false;
  // **Wer liegt, läuft nicht mehr.** Das ist der ganze Unterschied zwischen
  // einer Grube, die wehtut, und einer, die eine Falle ist.
  if (runner.dead) {
    runner.track.push({ ...runner.at });
    return false;
  }
  if (body.flight) {
    fly(runner, body, dt);
  } else {
    // **Wonach er läuft**: sein Auftrag, wenn er einen hat, sonst der Spieler
    // — dieselbe Reihenfolge wie in `Npc.navigate`.
    const step = runner.agent.step(graph, runner.at, runner.goal ?? player, dt, now);
    if (step.jump !== NO_TILE) {
      place(runner, graph, step.jump);
    } else if (step.leap !== NO_TILE) {
      body.flight = launch(runner, graph, step.leap);
    } else {
      // **Der Schritt, den man nicht geht.** Steht eine Tür im Weg, wird sie
      // erst aufgemacht oder eingeschlagen — und solange das dauert, kommt er
      // keinen Meter weiter. Genau das ist der Unterschied zwischen einer Tür
      // und einer Lücke, und genau den hat man vorher nicht gesehen.
      broke = atDoor(runner, graph, step.door, step.doorAction, dt);
      if (step.doorAction === 'none') {
        walk(runner, body, boxes, player, step.waypoint, dt);
        settle(runner, body, boxes);
      }
    }
  }

  // Und was der Boden mit ihm macht — dieselbe Rechnung wie in der Brille
  // (`scenarios.labHarm`, `NavLabWorld.simulate`).
  runner.health -= labHarm(runner.at, dt);
  if (runner.health <= 0) {
    runner.health = 0;
    runner.dead = true;
  }

  runner.track.push({ ...runner.at });
  // **Der Abstand zum Spieler** bleibt der Abstand zum Spieler, auch bei einem
  // Auftrag: Er ist die Auskunft darüber, wie weit die Karte einen überhaupt
  // heranlässt, und die will man auch von einem wissen, der gar nicht zu ihm
  // will.
  const gap = Math.hypot(player.x - runner.at.x, player.y - runner.at.y, player.z - runner.at.z);
  runner.nearest = Math.min(runner.nearest, gap);

  const aim = runner.goal ?? player;
  const close = runner.goal ? ERRAND_REACH : body.reach;
  const flat = Math.hypot(aim.x - runner.at.x, aim.z - runner.at.z);
  if (flat <= close && Math.abs(aim.y - runner.at.y) < 1 && !runner.arrived) {
    runner.arrived = true;
    runner.arrivedAfter = now;
  }
  return broke;
}

/**
 * **Was einer an einer Tür tut** — dieselben zwei Handgriffe wie in der Welt
 * (`NavLabWorld`): aufmachen geht sofort, einschlagen dauert.
 *
 * Die Zeit ist der ganze Punkt der Sache: Eine Tür, die in null Sekunden
 * auffliegt, ist keine — und eine Holztür, die drei Sekunden lang aushält,
 * kann von einem Umweg geschlagen werden, der nur zwei kostet.
 */
function atDoor(
  runner: SimRunner,
  graph: NavGraph,
  id: string,
  action: 'none' | 'open' | 'break',
  dt: number,
): boolean {
  if (action === 'none' || !id) return false;
  runner.atDoor += dt;
  if (action === 'open') {
    graph.setDoor(id, { open: true });
    return false;
  }
  if (!graph.poundDoor(id, dt)) return false;
  runner.broke.push(id);
  return true;
}

/** Ein Schritt zu Fuß — mit Drehung, Umfang und Wänden, an denen er entlangrutscht. */
function walk(
  runner: SimRunner,
  body: Body,
  boxes: readonly NavBox[],
  player: SimPoint,
  waypoint: { x: number; z: number } | null,
  dt: number,
): void {
  const step = stepBrain(
    runner.brain,
    body.brain,
    {
      at: { x: runner.at.x, z: runner.at.z },
      yaw: body.yaw,
      player: { x: player.x, z: player.z },
      waypoint,
      goal: runner.goal ? { x: runner.goal.x, z: runner.goal.z } : null,
      dt,
      random: () => 0.5,
    },
    { ...brainOf(runner.brain).tuning, speed: body.speed, turn: body.turn },
  );
  body.yaw = step.yaw;
  slide(runner, body, boxes, step.vx * dt, step.vz * dt);
}

/**
 * **Gegen die Wand und daran entlang** — getrennt nach Achsen, damit aus einem
 * Anstoßen ein Vorbeischieben wird und kein Stehenbleiben.
 *
 * Genau das tut auch die Physik in der Welt, nur mit mehr Aufwand: Ein Zylinder,
 * der schräg gegen eine Wand läuft, verliert den Anteil zur Wand hin und behält
 * den daran entlang. Wer hier beide Achsen zusammen prüfte, hätte einen NPC, der
 * an jeder Wand klebt — und dann prüfte dieser Test eine Panne, die es in der
 * Welt gar nicht gibt.
 */
function slide(
  runner: SimRunner,
  body: Body,
  boxes: readonly NavBox[],
  dx: number,
  dz: number,
): void {
  const low = runner.at.y + 0.15;
  const high = runner.at.y + body.height * 0.9;
  const free = (x: number, z: number): boolean => !hitsAny(boxes, x, z, low, high, body.radius);

  const wantX = runner.at.x + dx;
  if (free(wantX, runner.at.z)) runner.at.x = wantX;
  const wantZ = runner.at.z + dz;
  if (free(runner.at.x, wantZ)) runner.at.z = wantZ;
}

function hitsAny(
  boxes: readonly NavBox[],
  x: number,
  z: number,
  low: number,
  high: number,
  radius: number,
): boolean {
  for (const box of boxes) {
    if (box.maxY <= low || box.minY >= high) continue;
    const nx = Math.max(box.minX, Math.min(x, box.maxX));
    const nz = Math.max(box.minZ, Math.min(z, box.maxZ));
    if (Math.hypot(x - nx, z - nz) < radius) return true;
  }
  return false;
}

/**
 * Auf welcher Höhe er nach diesem Schritt steht.
 *
 * **Gefragt werden die Quader und nicht die Karte** — und das ist keine
 * Feinheit, sondern der Unterschied zwischen einer Grube und einem Anstrich:
 * Über der Stachelgrube sagt die Karte „hier ist Boden" (`applyLabMap`), und
 * genau darum läuft der Zombie hinein. Was ihn auffängt, ist die Welt, und in
 * der ist dort ein Loch. Wer hier die Karte fragte, ließe ihn über die Falle
 * spazieren, in die er in der Brille fällt.
 */
function settle(runner: SimRunner, body: Body, boxes: readonly NavBox[]): void {
  const floor = groundUnder(boxes, runner.at, body.radius, body.stepUp);
  if (floor === null) return;
  // Hinauf nur, was man tritt; hinunter alles — er fällt.
  if (floor > runner.at.y + body.stepUp) return;
  if (floor === runner.at.y) return;
  // **Und ein Sturz kostet.** Dieselbe Rechnung wie in der Brille
  // (`nav/navFall.ts`, `Npc.land`) — hier ohne den Umweg über eine
  // Geschwindigkeit, denn dieser Körper fällt in einem Bild: Was er dabei an
  // Höhe verliert, *ist* die Fallhöhe.
  runner.health -= fallDamage(runner.at.y - floor);
  runner.at.y = floor;
  // **Und dann steht er womöglich in einem Klotz.** Wer über die Dachkante
  // tritt, ist mit seiner Mitte draußen und mit seinem Umfang noch darin; eine
  // Etage tiefer steckt er dann in der Wand des Klotzes, von dem er gerade
  // gefallen ist. In der Welt schiebt die Physik ihn dort in einem Bild
  // heraus; hier tut es diese Zeile, und ohne sie klebt er für immer an einer
  // Hausecke, die es gar nicht ist.
  push(runner, body, boxes);
}

/**
 * **Der oberste Deckel unter seinen Füßen** — oder `null`, wo gar keiner ist.
 *
 * Dieselbe Frage, die auch das Abtasten stellt (`navBake.floorsAt`), nur für
 * einen, der schon steht: Gesucht wird über der Stelle, an der er gerade ist,
 * und gezählt wird, worauf man treten kann — alles über Kniehöhe ist eine
 * Wand und kein Boden.
 */
function groundUnder(
  boxes: readonly NavBox[],
  at: SimPoint,
  radius: number,
  stepUp: number,
): number | null {
  let best: number | null = null;
  for (const box of boxes) {
    if (box.maxY > at.y + stepUp) continue;
    // Ein Fuß auf der Kante steht noch darauf: gemessen wird mit seinem Umfang.
    if (at.x < box.minX - radius || at.x > box.maxX + radius) continue;
    if (at.z < box.minZ - radius || at.z > box.maxZ + radius) continue;
    if (best === null || box.maxY > best) best = box.maxY;
  }
  return best;
}

/** Heraus aus allem, worin er steckt — über die kürzeste Seite. */
function push(runner: SimRunner, body: Body, boxes: readonly NavBox[]): void {
  const low = runner.at.y + 0.15;
  const high = runner.at.y + body.height * 0.9;
  for (let round = 0; round < 4; round++) {
    let moved = false;
    for (const box of boxes) {
      if (box.maxY <= low || box.minY >= high) continue;
      const nx = Math.max(box.minX, Math.min(runner.at.x, box.maxX));
      const nz = Math.max(box.minZ, Math.min(runner.at.z, box.maxZ));
      const dx = runner.at.x - nx;
      const dz = runner.at.z - nz;
      const gap = Math.hypot(dx, dz);
      if (gap >= body.radius) continue;
      if (gap > 1e-6) {
        runner.at.x = nx + (dx / gap) * body.radius;
        runner.at.z = nz + (dz / gap) * body.radius;
      } else {
        // Genau auf der Kante oder mitten drin: über die nächstgelegene Seite.
        const west = runner.at.x - box.minX;
        const east = box.maxX - runner.at.x;
        const north = runner.at.z - box.minZ;
        const south = box.maxZ - runner.at.z;
        const least = Math.min(west, east, north, south);
        if (least === west) runner.at.x = box.minX - body.radius;
        else if (least === east) runner.at.x = box.maxX + body.radius;
        else if (least === north) runner.at.z = box.minZ - body.radius;
        else runner.at.z = box.maxZ + body.radius;
      }
      moved = true;
    }
    if (!moved) return;
  }
}

/** Durch ein Portal: er ist dort, er geht nicht dorthin. */
function place(runner: SimRunner, graph: NavGraph, tile: TileKey): void {
  const at = graph.worldOf(tile);
  runner.at.x = at.x;
  runner.at.y = at.y;
  runner.at.z = at.z;
}

/** Derselbe schräge Wurf wie in der Welt (`Npc.launch`). */
function launch(runner: SimRunner, graph: NavGraph, tile: TileKey): Flight | null {
  const to = graph.worldOf(tile);
  const dy = to.y - runner.at.y;
  const far = Math.hypot(to.x - runner.at.x, to.z - runner.at.z);
  if (far < 0.05) return null;
  const rise = Math.max(dy, 0) + LEAP_RISE;
  const up = Math.sqrt(2 * SIM_GRAVITY * rise);
  const time = (up + Math.sqrt(Math.max(0, up * up - 2 * SIM_GRAVITY * dy))) / SIM_GRAVITY;
  if (!Number.isFinite(time) || time <= 0) return null;
  return { from: { ...runner.at }, to: { x: to.x, y: to.y, z: to.z }, time, spent: 0, up };
}

/** Ein Bild im Flug — waagerecht gleichmäßig, senkrecht ein Bogen. */
function fly(runner: SimRunner, body: Body, dt: number): void {
  const flight = body.flight!;
  flight.spent = Math.min(flight.time, flight.spent + dt);
  const share = flight.spent / flight.time;
  runner.at.x = flight.from.x + (flight.to.x - flight.from.x) * share;
  runner.at.z = flight.from.z + (flight.to.z - flight.from.z) * share;
  runner.at.y =
    flight.from.y + flight.up * flight.spent - 0.5 * SIM_GRAVITY * flight.spent * flight.spent;
  if (flight.spent < flight.time) return;
  runner.at.y = flight.to.y;
  // Auch ein geplanter Sprung kommt irgendwo an: Was er dabei an Tempo nach
  // unten hat, zählt wie ein Sturz aus der Höhe, aus der es käme
  // (`nav/navFall.fallHeight`). Ein Bogen von 70 cm über die Kante bleibt
  // damit gratis — genau darauf ist `FALL_FREE` eingestellt.
  runner.health -= fallDamage(fallHeight(flight.up - SIM_GRAVITY * flight.time, SIM_GRAVITY));
  body.flight = null;
}

// --- was ein Test daran fragt ----------------------------------------------

/**
 * **Ob eine Strecke an einem Punkt vorbeikam.**
 *
 * Der Prüfstein, mit dem man einen Umweg von einem Durchmarsch unterscheidet:
 * Vor einer verriegelten Tür soll er nicht bloß irgendwo ankommen, sondern
 * *außen herum* — und das heißt, dass seine Spur die Kachel neben der Tür
 * berührt haben muss. Ohne so einen Kontrollpunkt sieht ein Weg durch die Wand
 * genauso erfolgreich aus wie der richtige.
 */
export function passedNear(
  track: readonly SimPoint[],
  at: { x: number; z: number },
  radius: number,
): boolean {
  return track.some((spot) => Math.hypot(spot.x - at.x, spot.z - at.z) <= radius);
}

/** Eine Überquerung: wo sie stattfand, und in welchem Bild. */
export interface SimCrossing {
  /** Das x der Stelle, an der die Spur die Linie geschnitten hat. */
  x: number;
  /** Das Bild, in dem sie drüben ankam — als Startpunkt für die nächste Suche. */
  frame: number;
}

/**
 * **Wo eine Spur eine Wandlinie überquert hat** — oder `null`, wenn nie.
 *
 * Der ehrlichere Prüfstein als „war er mal in der Nähe": Eine Wand mit einer
 * Lücke ist eine Linie quer durch die Bucht, und die Frage ist nicht, wie nah
 * an der Mitte der Lücke er vorbeikam, sondern **an welcher Stelle er die
 * Linie überschritten hat**. Liegt diese Stelle in der Lücke, ist er
 * hindurchgegangen; liegt sie daneben, ist er durch die Wand gelaufen.
 *
 * Der Unterschied ist keine Feinheit: Die Lücken im langen Gang sind 7,5 m
 * breit, und ein Weg, der die Ecke sauber schneidet, geht dicht an der inneren
 * Kante hindurch — von der Mitte der Lücke ist er dann fast vier Meter weit
 * weg. Wer die Nähe zur Mitte prüft, bestraft genau den Weg, den er sehen
 * will.
 *
 * `after` ist das Bild, ab dem gesucht wird: Zwei Wände nacheinander heißt
 * zweimal fragen, die zweite Frage ab der Antwort der ersten.
 */
export function crossedAt(track: readonly SimPoint[], z: number, after = 0): SimCrossing | null {
  for (let frame = Math.max(1, after + 1); frame < track.length; frame++) {
    const a = track[frame - 1]!;
    const b = track[frame]!;
    // Überquert heißt: die beiden Bilder liegen auf verschiedenen Seiten der
    // Linie. Ein Punkt genau darauf zählt mit — er ist die Überquerung.
    if ((a.z - z) * (b.z - z) > 0) continue;
    if (a.z === b.z) continue;
    const share = (z - a.z) / (b.z - a.z);
    return { x: a.x + (b.x - a.x) * share, frame };
  }
  return null;
}

/** Wie nah eine Strecke einem Punkt gekommen ist, in Metern. */
export function closestTo(track: readonly SimPoint[], at: { x: number; z: number }): number {
  let best = Infinity;
  for (const spot of track) best = Math.min(best, Math.hypot(spot.x - at.x, spot.z - at.z));
  return best;
}

/** Wie weit einer wirklich gelaufen ist, in Metern — in der Ebene gemessen. */
export function walked(track: readonly SimPoint[]): number {
  let sum = 0;
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1]!;
    const b = track[i]!;
    sum += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return sum;
}

/**
 * **Wie krumm eine Strecke ist** — der gelaufene Weg geteilt durch die
 * Luftlinie von Anfang zu Ende.
 *
 * Eine Gerade ist 1; wer jede Ecke rechtwinklig nimmt statt sie zu schneiden,
 * landet darüber. Sie ist absichtlich ein **Verhältnis** und keine Länge: Ein
 * langer Weg darf lang sein, er soll nur nicht doppelt so lang sein, wie er
 * sein müsste.
 *
 * **Als Schranke taugt sie nur dort, wo die Luftlinie etwas bedeutet.** In
 * einem Z, dessen Luftlinie durch zwei Wände geht, ist selbst der bestmögliche
 * Weg mehr als doppelt so lang wie sie — eine Zahl wie „unter 2,2" ist dort
 * nicht streng, sondern unerfüllbar, und sie war nur so lange grün, wie der
 * Zombie nach fünfzehn Metern stehen blieb und gar nichts mehr maß. Wo es um
 * „läuft er Manhattan-mäßig" geht, vergleicht man deshalb besser mit dem Weg
 * über die **Kachelmitten** (`walked` gegen die Länge des rohen A*-Wegs) —
 * das ist genau das, was „Manhattan" heißt, und es rechnet sich mit der Bucht
 * mit, statt eine Zahl zu sein, die beim nächsten Umbau still falsch wird.
 */
export function wander(track: readonly SimPoint[]): number {
  if (track.length < 2) return 1;
  const first = track[0]!;
  const last = track[track.length - 1]!;
  const straight = Math.hypot(last.x - first.x, last.z - first.z);
  return straight < 0.01 ? Infinity : walked(track) / straight;
}

/** Die Bucht zu einer Id — bequem für Tests, die ihre Maße brauchen. */
export function bay(id: ScenarioId): (typeof SCENARIOS)[number] {
  return scenarioOf(id);
}
