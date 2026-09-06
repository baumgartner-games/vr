import { NavAgent } from '../nav/navAgent';
import type { NavGraph } from '../nav/navGraph';
import { NO_TILE } from '../nav/navTile';

/**
 * **Die Attrappe geht selbst** — der Gehe-zu-Modus der laufenden Vorschau
 * (`shared/livePreview.ts`).
 *
 * Bis hierher war die Attrappe des Spielers ein Ding, das man **versetzt**:
 * Tipp auf den Boden, und sie steht dort. Das ist die richtige Bedienung, wenn
 * man das Gitter prüfen will — man setzt ein Ziel hin und sieht, welchen Weg
 * die NPCs dorthin nehmen. Es ist aber die falsche, wenn man wissen will, wie
 * es **einem selbst** in dieser Welt ergeht: Ein Spieler springt nicht, er
 * geht, und was zwischen ihm und der anderen Ecke liegt, merkt er dabei.
 *
 * Deshalb geht sie hier zu Fuß, und zwar mit **derselben Wegsuche wie ein
 * NPC** (`nav/navAgent.ts`): dasselbe Gitter, dieselben Türen, dieselben
 * Portale. Das ist keine Bequemlichkeit, sondern der Sinn der Sache — wer im
 * Gehe-zu-Modus vor einer verriegelten Tür stehen bleibt, hat gerade gesehen,
 * dass sie verriegelt ist.
 *
 * **Sie irrt sich nicht.** Ein NPC läuft nach seiner Meinung über die Karte
 * (`nav/navBelief.ts`) und darf daher gegen eine Tür rennen, von der er
 * glaubte, sie stünde offen. Die Attrappe ist der Zuschauer und keine Figur im
 * Stück: Sie nimmt den Graphen, wie er ist. Ein Zuschauer, der beim Tippen
 * gegen eine Wand läuft, hätte einen Fehler gefunden, den es nicht gibt.
 *
 * **Ohne Physik.** Sie ist ein Ring auf dem Boden und kein Körper — sie schiebt
 * nichts weg und wird von nichts geschoben. Ihre Höhe holt sie sich von der
 * Kachel, auf der sie steht; damit kommt sie eine Etage hoch, wo ein NPC
 * fallen müsste.
 */

/** Wie schnell sie geht, in m/s — ein zügiger Gang, kein Sprint. */
export const WALK_SPEED = 3;

/**
 * Wie nah am Ziel sie stehen bleibt, in Metern.
 *
 * Etwas mehr als ein Schritt: Wer auf den Zentimeter genau ankommen will,
 * zittert die letzten Bilder um den Punkt herum, weil er in jedem Bild darüber
 * hinausgeht.
 */
export const WALK_REACH = 0.25;

/** Ein Punkt, wie ihn diese Rechnung braucht — die Höhe zählt mit. */
export interface WalkPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Ein Schritt von `from` nach `to`, höchstens `speed * dt` weit — und nie
 * darüber hinaus.
 *
 * Gemessen wird **in der Ebene**: Die Höhe ist keine Strecke, die man geht,
 * sondern etwas, das der Boden vorgibt; wer sie mitrechnet, geht auf einer
 * Treppe langsamer als auf der Geraden.
 */
export function stride(
  from: WalkPoint,
  to: { x: number; z: number },
  speed: number,
  dt: number,
): { x: number; z: number; left: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const far = Math.hypot(dx, dz);
  const step = Math.max(0, speed) * Math.max(0, dt);
  if (far <= step || far < 1e-6) return { x: to.x, z: to.z, left: 0 };
  return { x: from.x + (dx / far) * step, z: from.z + (dz / far) * step, left: far - step };
}

/** Was ein Bild des Gehens ergeben hat. */
export interface WalkStep {
  /** Wo sie jetzt steht. */
  at: WalkPoint;
  /** Ob sie noch unterwegs ist. */
  going: boolean;
  /** Ob sie in diesem Bild angekommen ist. */
  arrived: boolean;
  /** Ob sie steht, weil es dorthin keinen Weg gibt. */
  stuck: boolean;
}

export class PreviewWalk {
  /**
   * Derselbe Läufer wie in einem NPC — mit leerer Meinung, die nie etwas
   * lernt, weil sie nie etwas glaubt.
   */
  private readonly agent = new NavAgent();
  private goal: WalkPoint | null = null;
  /** Die eigene Uhr: Der Läufer datiert damit, was er gesehen hat. */
  private clock = 0;

  /** Wohin sie gerade unterwegs ist — `null`, wenn sie steht. */
  get target(): WalkPoint | null {
    return this.goal;
  }

  get going(): boolean {
    return this.goal !== null;
  }

  /** Los dorthin. */
  to(at: WalkPoint): void {
    this.goal = { x: at.x, y: at.y, z: at.z };
    this.agent.clear();
  }

  /** Stehen bleiben, wo sie ist. */
  stop(): void {
    this.goal = null;
    this.agent.clear();
  }

  /**
   * Ein Bild.
   *
   * @param graph das Gitter dieser Welt — ohne eines geht sie **geradeaus**:
   *              Eine Welt ohne Wegsuche hat auch keine Wände, die sie kennt,
   *              und stehen zu bleiben wäre dort die falsche Antwort.
   */
  step(graph: NavGraph | null, at: WalkPoint, dt: number): WalkStep {
    this.clock += dt;
    const goal = this.goal;
    const here: WalkPoint = { x: at.x, y: at.y, z: at.z };
    if (!goal) return { at: here, going: false, arrived: false, stuck: false };

    // Angekommen? Dann ist Schluss — und zwar vor dem Rechnen, damit ein Tipp
    // auf die eigenen Füße nicht ein Bild lang „unterwegs" heißt.
    if (Math.hypot(goal.x - at.x, goal.z - at.z) <= WALK_REACH) {
      this.stop();
      return {
        at: { x: goal.x, y: here.y, z: goal.z },
        going: false,
        arrived: true,
        stuck: false,
      };
    }

    // Ohne Gitter geradeaus: In einer Welt ohne Wegsuche gibt es keine Wände,
    // die jemand kennen könnte, und Stehenbleiben wäre dort die falsche
    // Antwort.
    if (!graph) {
      const straight = stride(here, goal, WALK_SPEED, dt);
      return {
        at: { x: straight.x, y: here.y, z: straight.z },
        going: true,
        arrived: false,
        stuck: false,
      };
    }

    const move = this.agent.step(graph, here, goal, dt, this.clock);
    // **Ein Portal geht man nicht**: Der Läufer meldet den Schritt als Sprung,
    // und danach steht sie auf der anderen Seite. Genau das tut ein NPC auch
    // (`navAgent.ts`, `AgentStep.jump`) — und in der Portal-Bucht des Labors
    // ist es das, was man sehen will.
    if (move.jump !== NO_TILE) {
      const spot = graph.worldOf(move.jump);
      return {
        at: { x: spot.x, y: spot.y, z: spot.z },
        going: true,
        arrived: false,
        stuck: false,
      };
    }
    if (!move.waypoint) return { at: here, going: true, arrived: false, stuck: true };

    const next = stride(here, move.waypoint, WALK_SPEED, dt);
    // Die Höhe gibt die Kachel vor, auf der sie danach steht: So kommt sie das
    // Dach der Etagen-Bucht hinauf und wieder herunter, ohne zu fallen.
    const tile = graph.nearest(next.x, next.z, here.y);
    const y = tile === NO_TILE ? here.y : graph.worldOf(tile).y;
    // **Bis vor das Hindernis und dort Schluss.** Führt der Weg nicht ans Ziel
    // (`complete`), ist er der Teilweg bis zu der Kachel, die dem Ziel am
    // nächsten kommt — den geht sie, denn genau das heißt „versucht
    // hinzugehen". Angekommen bleibt sie stehen, und *dann* ist sie
    // festgefahren: Wer schon am Anfang aufgäbe, hätte den halben Weg
    // unterschlagen, den es sehr wohl gibt.
    const crept = Math.hypot(next.x - here.x, next.z - here.z);
    const stuck = !move.complete && crept < WALK_SPEED * dt * 0.02;
    return { at: { x: next.x, y, z: next.z }, going: true, arrived: false, stuck };
  }
}
