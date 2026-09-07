import { NavBelief } from './navBelief';
import { breakable } from './navDoor';
import { doorBroken, type DoorPower, type NavGraph, type WallFacts } from './navGraph';
import { findPath, pullString, type PathPoint } from './navPath';
import { HUMAN_PROFILE, powerOf, type CostProfile, type LinkKind } from './navProfile';
import {
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  NO_TILE,
  TILE,
  dirX,
  dirZ,
  keyX,
  keyZ,
  neighbour,
  tileCentreX,
  tileCentreZ,
  type Dir,
  type TileKey,
} from './navTile';

/**
 * **Der Läufer** — was zwischen einer Wegsuche und einem NPC fehlt.
 *
 * Die Wegsuche beantwortet eine Frage einmal; ein NPC stellt sie sechzigmal je
 * Sekunde neu, während sein Ziel wegläuft. Dazwischen liegt die Buchhaltung,
 * die hier steht: Wann wird neu geplant? Welcher Wegpunkt ist gerade dran?
 * Und was passiert, wenn er nicht vorankommt?
 *
 * **Geplant wird selten, gelaufen wird jedes Bild.** Ein Weg gilt eine halbe
 * Sekunde, dann wird er verworfen — und dazwischen wird nur nachgesehen, ob
 * der nächste Wegpunkt schon erreicht ist. Wer jedes Bild neu sucht, hat bei
 * fünfzig NPCs fünfzig A*-Läufe je Bild; wer nie neu sucht, läuft dorthin, wo
 * der Spieler vor drei Sekunden war.
 *
 * **Festfahren ist ein Ereignis und kein Fehler.** Wenn er sich eine Weile
 * kaum bewegt hat, obwohl er einen Weg hat, dann steht etwas vor ihm, das
 * seine Karte nicht kennt — eine Tür, die zugefallen ist, eine Kiste, die
 * jemand abgestellt hat. Dann **sieht er nach** (`observe`), trägt das
 * Ergebnis in seine Meinung ein und plant von dort aus neu. Genau das ist das
 * Verhalten aus `navBelief.ts`, von der anderen Seite: Er darf sich irren,
 * und er merkt es dort, wo man es auch merken würde.
 */

export interface AgentTuning {
  profile: CostProfile;
  /** Sekunden, die ein Weg gilt, bevor von selbst neu geplant wird. */
  replan: number;
  /** Wie nah ein Wegpunkt zählt, in Metern. */
  reach: number;
  /** Wie lange er kaum vorankommen muss, um als festgefahren zu gelten. */
  stuckAfter: number;
  /** Wie weit er in dieser Zeit gekommen sein muss, in Metern. */
  stuckWithin: number;
  /** Obergrenze je Suche. */
  maxNodes: number;
  /**
   * Sein **Umfang** als Halbmesser, in Metern.
   *
   * Der Grund, warum ein Läufer überhaupt eine Dicke hat: Der Weg wird um
   * diese Zahl an jeder Ecke eingezogen (`navPath.pullString`). Ohne sie plant
   * er sich seinen eigenen Körper in die Hausecke und bleibt dort stehen — in
   * der Brille sieht das aus, als hätte er es sich anders überlegt.
   */
  girth: number;
  /**
   * Wie hoch er **treten** kann, ohne zu springen, in Metern.
   *
   * Alles darüber wird abgesprungen (`AgentStep.leap`). Der Grund steht im
   * Körper und nicht in der Karte: Ein NPC ist ein dynamischer Zylinder, und
   * ein Zylinder steigt keine Stufe — er kann nur fallen oder fliegen. Vor
   * dieser Zahl gab es Treppen, die das Gitter kannte und die trotzdem
   * niemand hinaufkam; die halbe Welt war für NPCs eine Sackgasse mit
   * Aussicht.
   */
  stepUp: number;
}

export const AGENT_DEFAULTS: AgentTuning = {
  profile: HUMAN_PROFILE,
  replan: 0.55,
  reach: 1.1,
  stuckAfter: 1.1,
  stuckWithin: 0.3,
  maxNodes: 3000,
  girth: 0.3,
  stepUp: 0.35,
};

/** Ein Punkt in der Welt, wie ihn die Welt herüberreicht. */
export interface Spot3 {
  x: number;
  y: number;
  z: number;
}

export interface AgentStep {
  /** Wohin als nächstes — `null` heißt: kein Weg, stehen bleiben. */
  waypoint: { x: number; z: number } | null;
  /**
   * Eine Kachel, auf die die Welt ihn **setzen** muss: er ist durch ein Portal
   * gegangen.
   *
   * `NO_TILE`, solange nichts zu tun ist. Ein Portal ist die eine Verbindung,
   * die man nicht laufen kann — Treppen und Absätze haben eine Geometrie, durch
   * die ein Körper wirklich kommt, ein Portal nicht. Wer das hier ignoriert,
   * hat einen NPC, der vor der Wand steht, hinter der sein Weg weitergeht.
   */
  jump: TileKey;
  /**
   * Eine Kachel, zu der er **springen** muss — der Absprung über eine Lücke.
   *
   * Der Unterschied zu `jump` ist der zwischen Versetzen und Fliegen: Ein
   * Portal setzt einen ans andere Ende, ein Sprung ist eine Wurfparabel, die
   * man sieht. Beides gibt es getrennt, weil beides anders aussieht — und weil
   * ein Sprung schiefgehen darf, ein Portal nicht.
   *
   * Wer ihn ignoriert, hat einen NPC, der an der Kante des Podests vorwärts
   * läuft und in den Gang darunter fällt. Genau das tat er, bevor es dieses
   * Feld gab.
   */
  leap: TileKey;
  /** Ob der Weg wirklich ans Ziel führt. `false` = Teilweg bis vor das Hindernis. */
  complete: boolean;
  /** Ob in diesem Bild neu geplant wurde. */
  planned: boolean;
  /** Ob er in diesem Bild als festgefahren erkannt wurde. */
  stuck: boolean;
  /**
   * Die Tür, **vor der er steht** und durch die sein Weg führt — sonst `''`.
   *
   * Sie ist der eine Schritt des Wegs, den man nicht geht, sondern *tut*: Wer
   * hier steht, drückt eine Klinke oder holt aus. Gemeldet wird sie erst in
   * Reichweite und nicht schon von der Kachel davor — sonst öffnete sich eine
   * Tür zwei Meter, bevor jemand sie anfasst.
   */
  door: string;
  /** Was er mit ihr vorhat. */
  doorAction: DoorAction;
}

/**
 * **Was an einer Tür zu tun ist**, aus der Sicht dessen, der davorsteht.
 *
 * Drei Ausgänge, und die Welt macht daraus drei verschiedene Sachen: nichts
 * (offen, oder es geht ohnehin nicht), die Klinke (`open`) und die Faust
 * (`break`). Der Läufer entscheidet das und nicht die Welt, denn er ist der
 * einzige, der seinen Weg kennt: Eine Tür neben ihm, durch die er gar nicht
 * will, geht ihn nichts an.
 */
export type DoorAction = 'none' | 'open' | 'break';

const NOWHERE: AgentStep = {
  waypoint: null,
  jump: NO_TILE,
  leap: NO_TILE,
  complete: false,
  planned: false,
  stuck: false,
  door: '',
  doorAction: 'none',
};

export class NavAgent {
  /** Was **dieser** NPC über die Karte zu wissen glaubt (`navBelief.ts`). */
  readonly belief = new NavBelief();
  readonly tuning: AgentTuning;

  private route: PathPoint[] = [];
  /** Derselbe Weg als Kacheln — für die Debug-Ansicht, einmal gerechnet. */
  private tiles: TileKey[] = [];
  private cursor = 0;
  private timer = 0;
  private goalTile: TileKey = NO_TILE;
  private atTile: TileKey = NO_TILE;
  private reachesGoal = false;
  private moved = 0;
  private since = 0;
  private lastX = 0;
  private lastZ = 0;
  private started = false;
  private seenBelief = -1;
  private jump: TileKey = NO_TILE;
  private leap: TileKey = NO_TILE;

  constructor(tuning: Partial<AgentTuning> = {}) {
    this.tuning = { ...AGENT_DEFAULTS, ...tuning };
  }

  /** Der Weg, den er gerade läuft, als Kacheln — grob, aber handlich. */
  get path(): readonly TileKey[] {
    return this.tiles;
  }

  /**
   * **Derselbe Weg als Linie** — die Punkte, die er wirklich abläuft.
   *
   * Der Unterschied zu `path` ist genau der, um den es beim Zeichnen geht: Die
   * Kacheln sagen, *über welche* er geht, ihre Mitten aber nicht, *wo*. Ein Weg
   * aus Kachelmitten schneidet auf dem Bild jede Hausecke, um die die Schnur in
   * Wirklichkeit einen Bogen macht (`navPath.pullString`) — und dann sucht man
   * den Fehler in der Wegsuche, die gerade recht hatte.
   */
  get points(): readonly PathPoint[] {
    return this.route;
  }

  /** Der Wegpunkt, der gerade dran ist. */
  get index(): number {
    return this.cursor;
  }

  /** Die Kachel, auf der er zuletzt stand. */
  get tile(): TileKey {
    return this.atTile;
  }

  /** Vergisst den Weg, behält aber, was er gesehen hat. */
  clear(): void {
    this.route = [];
    this.tiles = [];
    this.cursor = 0;
    this.timer = 0;
    this.goalTile = NO_TILE;
    this.reachesGoal = false;
  }

  /**
   * Ein Bild.
   *
   * `at` ist, wo seine Füße stehen; `goal`, wo er hinwill. Heraus kommt der
   * nächste Wegpunkt in Weltkoordinaten — mehr braucht das Hirn nicht
   * (`npcBrain.ts`, `sense.waypoint`).
   */
  step(graph: NavGraph, at: Spot3, goal: Spot3 | null, dt: number, now: number): AgentStep {
    if (!goal) {
      this.clear();
      return NOWHERE;
    }

    const from = graph.nearest(at.x, at.z, at.y);
    const to = graph.nearest(goal.x, goal.z, goal.y);
    this.atTile = from;
    if (from === NO_TILE || to === NO_TILE) {
      this.clear();
      return NOWHERE;
    }

    const stuck = this.trackProgress(at, dt);
    if (stuck) this.observe(graph, from, now);

    this.timer -= dt;
    const planned =
      this.route.length === 0 ||
      to !== this.goalTile ||
      this.timer <= 0 ||
      stuck ||
      this.belief.version !== this.seenBelief;
    if (planned) this.plan(graph, from, to);

    this.jump = NO_TILE;
    this.leap = NO_TILE;
    const waypoint = this.pick(graph, at, goal);
    const door = this.doorAhead(graph, from, at, now);
    return {
      waypoint,
      jump: this.jump,
      leap: this.leap,
      complete: this.reachesGoal,
      planned,
      stuck,
      door: door?.id ?? '',
      doorAction: door?.action ?? 'none',
    };
  }

  /**
   * **Die Tür, an der er gerade steht** — und was sie von ihm verlangt.
   *
   * Gesucht wird in der Laufrichtung und nicht am nächsten Wegpunkt, aus
   * demselben Grund wie beim Nachsehen (`observe`): Nach der Glättung liegt
   * der zehn Kacheln weit weg, die Tür aber an der eigenen Kachel.
   *
   * Und gesucht wird nur **in Reichweite**: Gemessen wird der Abstand zur
   * Wandlinie, nicht zur Kachelmitte. Eine Kachel ist 2,5 m breit, und eine
   * Tür, die aufgeht, während man noch am anderen Ende der Kachel steht, sieht
   * aus wie ein Gespenst.
   *
   * **Und hier erfährt er sie auch.** Wer so dicht davorsteht, sieht, ob sie
   * offen ist und ob sie verriegelt ist — das kommt in seine Meinung
   * (`navBelief.ts`), und beim nächsten Bild plant er damit. Genau das ist die
   * andere Hälfte der Freiraum-Annahme: Er läuft hin, *weil* er sie für offen
   * hielt, und geht außen herum, weil er jetzt weiß, dass sie es nicht ist.
   * Ohne diese Zeile stünde ein Zombie vor einer Metalltür und drückte
   * dagegen, bis das Festfahren ihn nachsehen lässt (`observe`).
   */
  private doorAhead(
    graph: NavGraph,
    from: TileKey,
    at: Spot3,
    now: number,
  ): { id: string; action: DoorAction } | null {
    const next = this.route[this.cursor]?.tile;
    if (next === undefined || from === NO_TILE || next === from) return null;
    let todo: { id: string; action: DoorAction } | null = null;
    for (const dir of headings(from, next)) {
      const facts = graph.wall(from, dir);
      if (!facts || facts.kind !== 'door' || !facts.id) continue;
      if (neighbour(from, dir) === NO_TILE) continue;
      if (doorBroken(facts)) continue;
      if (this.gapTo(from, dir, at) > this.tuning.reach) continue;
      this.belief.seeDoor(facts.id, facts, now);
      const action = doorTodo(facts, powerFor(this.tuning));
      if (action !== 'none' && !todo) todo = { id: facts.id, action };
    }
    return todo;
  }

  /** Wie weit er von der Wandlinie zwischen seiner Kachel und der nächsten weg ist. */
  private gapTo(from: TileKey, dir: Dir, at: Spot3): number {
    const lineX = tileCentreX(from) + (dirX(dir) * TILE) / 2;
    const lineZ = tileCentreZ(from) + (dirZ(dir) * TILE) / 2;
    return dirX(dir) !== 0 ? Math.abs(at.x - lineX) : Math.abs(at.z - lineZ);
  }

  /**
   * **Nachsehen, was einen aufhält.**
   *
   * Er schaut auf die Wand zwischen sich und seinem nächsten Wegpunkt und
   * trägt ein, was dort wirklich ist — und ob auf der Kachel dahinter etwas
   * steht. Das ist der Moment, in dem aus „ich dachte, die Tür sei offen" ein
   * „sie ist zu" wird, und er ist absichtlich hier und nicht in der Wegsuche:
   * Erfahren kann man nur, wovor man steht.
   */
  observe(graph: NavGraph, from: TileKey, now: number): boolean {
    const next = this.route[this.cursor]?.tile;
    if (next === undefined || from === NO_TILE) return false;

    // **Geschaut wird in die Laufrichtung, nicht auf den Wegpunkt.** Nach der
    // Glättung liegt der nächste Wegpunkt oft zehn Kacheln weit weg; die Tür,
    // vor der er steht, ist die an seiner eigenen Kachel. Wer hier den
    // Wegpunkt nähme, fände nie etwas und liefe für immer gegen dieselbe Tür.
    let learned = false;
    for (const dir of headings(from, next)) {
      const side = neighbour(from, dir);
      if (side === NO_TILE) continue;
      const wall = graph.wall(from, dir);
      if (wall && wall.kind === 'door' && wall.id && !doorBroken(wall)) {
        // Nur eine **Änderung** ist eine Neuigkeit: Wer dreimal dieselbe
        // geschlossene Tür ansieht, hat einmal etwas gelernt.
        if (this.belief.seeDoor(wall.id, wall, now)) learned = true;
      }
      if (graph.has(side) && graph.isBlocked(side)) {
        this.belief.seeTile(side, true, now);
        learned = true;
      }
    }
    return learned;
  }

  private plan(graph: NavGraph, from: TileKey, to: TileKey): void {
    const options = {
      profile: this.tuning.profile,
      belief: this.belief,
      maxNodes: this.tuning.maxNodes,
      radius: this.tuning.girth,
    };
    const found = findPath(graph, from, to, options);
    this.route = pullString(graph, found.tiles, options);
    this.tiles = [];
    for (const point of this.route) {
      if (this.tiles[this.tiles.length - 1] !== point.tile) this.tiles.push(point.tile);
    }
    // Die Kachel, auf der er schon steht, ist kein Wegpunkt.
    this.cursor = this.route[0]?.tile === from ? 1 : 0;
    this.reachesGoal = found.complete;
    this.goalTile = to;
    this.timer = this.tuning.replan;
    this.seenBelief = this.belief.version;
  }

  /**
   * Rückt den Wegpunkt vor, bis einer übrig ist, zu dem er noch hinmuss.
   *
   * **Nah genug heißt nicht vorbei.** Ein Wegpunkt mitten im Raum ist
   * abgehakt, sobald er in Reichweite ist — auf einen Meter genau dorthin zu
   * laufen sähe steif aus. Ein **enger** Punkt dagegen liegt einen Halbmesser
   * neben einer Hausecke (`navPath.ts`), und wer ihn abhakt, während er noch
   * davor steht, schneidet genau die Ecke, um die es geht: Er nimmt den
   * übernächsten Punkt ins Visier, läuft schräg in die Wand und schiebt sich
   * dort fest. Deshalb zählt an einem engen Punkt nicht der Abstand, sondern
   * ob er wirklich an ihm vorbei ist — gemessen daran, ob er schon auf der
   * Seite steht, auf der es weitergeht.
   */
  private pick(graph: NavGraph, at: Spot3, goal: Spot3): { x: number; z: number } | null {
    while (this.cursor < this.route.length) {
      const point = this.route[this.cursor]!;
      const far = Math.hypot(point.x - at.x, point.z - at.z) > this.tuning.reach;
      if (far) break;
      if (point.tight && !this.passed(point, this.route[this.cursor + 1], at)) break;
      this.cursor++;
    }

    const point = this.route[this.cursor];
    if (point) {
      this.hop(graph, at, point);
      return { x: point.x, z: point.z };
    }
    // Der Weg ist abgelaufen. Führte er ans Ziel, geht es das letzte Stück
    // geradeaus dorthin — die letzte Kachelmitte ist selten das, was gemeint
    // war. Führte er nicht hin, ist hier Schluss, und zwar sichtbar: er steht
    // vor dem Hindernis und nicht mitten im Raum.
    if (this.reachesGoal) return { x: goal.x, z: goal.z };
    const last = this.route[this.route.length - 1];
    if (last === undefined) return null;
    return { x: last.x, z: last.z };
  }

  /**
   * **Der Schritt, den man nicht läuft.**
   *
   * Führt der Weg von hier zum nächsten Wegpunkt durch ein Portal, wird
   * versetzt; führt er über eine Lücke oder eine zu hohe Stufe, wird
   * gesprungen. Gefragt wird, sobald er am **Anfang** dieses Schritts steht,
   * und der Anfang ist der Wegpunkt davor — ganz am Anfang seine eigene
   * Kachel, denn die ist kein Wegpunkt (`plan`). Genau dieser Fall ist der
   * Grund für die Zeile mit `atTile`: Wer vor der Stufe steht, die er
   * hochspringen muss, bekäme sie sonst nie zu sehen und liefe für immer
   * dagegen.
   */
  private hop(graph: NavGraph, at: Spot3, point: PathPoint): void {
    const start = this.cursor > 0 ? this.route[this.cursor - 1] : undefined;
    if (!start || start.tile === point.tile) return;
    const there =
      start.tile === this.atTile || Math.hypot(start.x - at.x, start.z - at.z) <= this.tuning.reach;
    if (!there) return;
    if (linkBetween(graph, start.tile, point.tile, 'portal')) this.jump = point.tile;
    else if (this.leaps(graph, start.tile, point.tile)) this.leap = point.tile;
  }

  /**
   * Ob er an diesem Punkt schon vorbei ist — und nicht bloß in seiner Nähe.
   *
   * Gemessen wird gegen die Richtung, in die es von ihm aus weitergeht: Steht
   * er auf deren Seite, liegt der Punkt hinter ihm. Ohne einen nächsten Punkt
   * gibt es keine Richtung und nichts mehr abzukürzen — dann ist er vorbei.
   */
  private passed(point: PathPoint, next: PathPoint | undefined, at: Spot3): boolean {
    if (!next) return true;
    const ahead = (at.x - point.x) * (next.x - point.x) + (at.z - point.z) * (next.z - point.z);
    return ahead > 0;
  }

  /**
   * **Ob dieser Schritt ein Sprung ist.**
   *
   * Zwei Fälle, und sie sehen gleich aus: die Lücke, über die es keinen Boden
   * gibt (`jump`), und die Stufe, die zu hoch zum Hinauftreten ist. Eine Treppe
   * mit flachen Stufen bleibt ein Gang — wer für zwanzig Zentimeter hüpft,
   * sieht aus wie ein Frosch.
   */
  private leaps(graph: NavGraph, here: TileKey, next: TileKey): boolean {
    if (linkBetween(graph, here, next, 'jump')) return true;
    if (!linkBetween(graph, here, next, 'stairs')) return false;
    return graph.worldOf(next).y - graph.worldOf(here).y > this.tuning.stepUp;
  }

  /**
   * Wie weit er in der letzten Weile gekommen ist.
   *
   * Gemessen wird über ein Fenster und nicht je Bild: Ein NPC, der sich an
   * einer Ecke entlangschiebt, steht in einzelnen Bildern immer wieder still,
   * ohne festzuhängen.
   */
  private trackProgress(at: Spot3, dt: number): boolean {
    if (!this.started) {
      this.started = true;
      this.lastX = at.x;
      this.lastZ = at.z;
      return false;
    }
    this.moved += Math.hypot(at.x - this.lastX, at.z - this.lastZ);
    this.lastX = at.x;
    this.lastZ = at.z;
    this.since += dt;
    if (this.since < this.tuning.stuckAfter) return false;

    const stuck = this.moved < this.tuning.stuckWithin && this.route.length > 0;
    this.moved = 0;
    this.since = 0;
    return stuck;
  }
}

/**
 * **In welche Richtungen es von hier aus zum nächsten Wegpunkt geht** — eine
 * oder zwei, die wichtigere zuerst.
 *
 * Der Wegpunkt liegt nach der Glättung selten geradeaus; wer nur eine Richtung
 * nähme, sähe die Tür neben sich nicht. Und wer die Reihenfolge vertauscht,
 * findet die Wand quer zur Laufrichtung zuerst — also die, an der er gar nicht
 * entlangwill.
 */
function headings(from: TileKey, to: TileKey): Dir[] {
  const dx = keyX(to) - keyX(from);
  const dz = keyZ(to) - keyZ(from);
  const sides: Dir[] = [];
  if (dx !== 0) sides.push(dx > 0 ? DIR_E : DIR_W);
  if (dz !== 0) sides.push(dz > 0 ? DIR_S : DIR_N);
  if (Math.abs(dz) > Math.abs(dx)) sides.reverse();
  return sides;
}

/** Was diese Tür von dem verlangt, der durch sie hindurchwill. */
function doorTodo(facts: WallFacts, power: DoorPower): DoorAction {
  if (facts.open || doorBroken(facts)) return 'none';
  if (power.opens && !facts.barred) return 'open';
  if (power.breaks && breakable(facts.material)) return 'break';
  return 'none';
}

/** Was dieser Läufer an einer Tür kann (`navProfile.powerOf`). */
function powerFor(tuning: AgentTuning): DoorPower {
  return powerOf(tuning.profile);
}

/** Ob zwischen diesen beiden Kacheln eine offene Verbindung dieser Art liegt. */
function linkBetween(graph: NavGraph, from: TileKey, to: TileKey, kind: LinkKind): boolean {
  for (const exit of graph.linksFrom(from)) {
    if (exit.to === to && exit.link.kind === kind && exit.link.open) return true;
  }
  return false;
}
