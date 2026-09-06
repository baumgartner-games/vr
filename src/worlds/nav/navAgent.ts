import { NavBelief } from './navBelief';
import type { NavGraph } from './navGraph';
import { findPath, smoothPath } from './navPath';
import { HUMAN_PROFILE, type CostProfile } from './navProfile';
import {
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  NO_TILE,
  keyX,
  keyZ,
  neighbour,
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
}

export const AGENT_DEFAULTS: AgentTuning = {
  profile: HUMAN_PROFILE,
  replan: 0.55,
  reach: 1.1,
  stuckAfter: 1.1,
  stuckWithin: 0.3,
  maxNodes: 3000,
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
  /** Ob der Weg wirklich ans Ziel führt. `false` = Teilweg bis vor das Hindernis. */
  complete: boolean;
  /** Ob in diesem Bild neu geplant wurde. */
  planned: boolean;
  /** Ob er in diesem Bild als festgefahren erkannt wurde. */
  stuck: boolean;
}

const NOWHERE: AgentStep = {
  waypoint: null,
  jump: NO_TILE,
  complete: false,
  planned: false,
  stuck: false,
};

export class NavAgent {
  /** Was **dieser** NPC über die Karte zu wissen glaubt (`navBelief.ts`). */
  readonly belief = new NavBelief();
  readonly tuning: AgentTuning;

  private route: TileKey[] = [];
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

  constructor(tuning: Partial<AgentTuning> = {}) {
    this.tuning = { ...AGENT_DEFAULTS, ...tuning };
  }

  /** Der Weg, den er gerade läuft — für die Debug-Ansicht. */
  get path(): readonly TileKey[] {
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
    const waypoint = this.pick(graph, at, goal);
    return { waypoint, jump: this.jump, complete: this.reachesGoal, planned, stuck };
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
    const next = this.route[this.cursor];
    if (next === undefined || from === NO_TILE) return false;

    // **Geschaut wird in die Laufrichtung, nicht auf den Wegpunkt.** Nach der
    // Glättung liegt der nächste Wegpunkt oft zehn Kacheln weit weg; die Tür,
    // vor der er steht, ist die an seiner eigenen Kachel. Wer hier den
    // Wegpunkt nähme, fände nie etwas und liefe für immer gegen dieselbe Tür.
    const dx = keyX(next) - keyX(from);
    const dz = keyZ(next) - keyZ(from);
    const sides: Dir[] = [];
    if (dx !== 0) sides.push(dx > 0 ? DIR_E : DIR_W);
    if (dz !== 0) sides.push(dz > 0 ? DIR_S : DIR_N);
    if (Math.abs(dz) > Math.abs(dx)) sides.reverse();

    let learned = false;
    for (const dir of sides) {
      const side = neighbour(from, dir);
      if (side === NO_TILE) continue;
      const wall = graph.wall(from, dir);
      if (wall && wall.kind === 'door' && wall.id) {
        this.belief.seeDoor(wall.id, wall, now);
        learned = true;
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
    };
    const found = findPath(graph, from, to, options);
    this.route = smoothPath(graph, found.tiles, options);
    // Die Kachel, auf der er schon steht, ist kein Wegpunkt.
    this.cursor = this.route[0] === from ? 1 : 0;
    this.reachesGoal = found.complete;
    this.goalTile = to;
    this.timer = this.tuning.replan;
    this.seenBelief = this.belief.version;
  }

  /** Rückt den Wegpunkt vor, bis einer weit genug weg ist. */
  private pick(graph: NavGraph, at: Spot3, goal: Spot3): { x: number; z: number } | null {
    while (this.cursor < this.route.length) {
      const here = this.route[this.cursor]!;
      const point = graph.worldOf(here);
      if (Math.hypot(point.x - at.x, point.z - at.z) > this.tuning.reach) {
        return { x: point.x, z: point.z };
      }
      // Angekommen. Führt der nächste Schritt durch ein Portal, geht er nicht
      // dorthin — er ist dort.
      const next = this.route[this.cursor + 1];
      if (next !== undefined && portalBetween(graph, here, next)) this.jump = next;
      this.cursor++;
    }
    // Der Weg ist abgelaufen. Führte er ans Ziel, geht es das letzte Stück
    // geradeaus dorthin — die letzte Kachelmitte ist selten das, was gemeint
    // war. Führte er nicht hin, ist hier Schluss, und zwar sichtbar: er steht
    // vor dem Hindernis und nicht mitten im Raum.
    if (this.reachesGoal) return { x: goal.x, z: goal.z };
    const last = this.route[this.route.length - 1];
    if (last === undefined) return null;
    const point = graph.worldOf(last);
    return { x: point.x, z: point.z };
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

/** Ob zwischen diesen beiden Kacheln ein offenes Portal liegt. */
function portalBetween(graph: NavGraph, from: TileKey, to: TileKey): boolean {
  for (const exit of graph.linksFrom(from)) {
    if (exit.to === to && exit.link.kind === 'portal' && exit.link.open) return true;
  }
  return false;
}
