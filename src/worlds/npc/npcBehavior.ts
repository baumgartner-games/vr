import type { Place, PlaceBoard, PlaceKind } from './npcPlaces';

/**
 * **Verhalten: eine kleine Zustandsmaschine über dem Hirn.**
 *
 * Das Hirn (`npcBrain.ts`) beantwortet eine Frage je Bild: _wie komme ich
 * dorthin_ — Drehen, Gehen, Zuschlagen. Was ein Spiel braucht, ist die Frage
 * darüber: _wohin will ich überhaupt, und was tue ich, wenn ich da bin?_ Ein
 * Gast sucht sich einen Stuhl, sitzt eine Weile, steht auf und geht; ein
 * Kunde stellt sich an, verliert die Geduld und geht ohne Einkauf. Das sind
 * immer dieselben fünf Zustände:
 *
 * - **Idle** — kurz überlegen, was als Nächstes kommt.
 * - **Gehe zu** — ein Ziel, meistens ein Platz (`npcPlaces.ts`); wer zu lange
 *   nicht ankommt, gibt ihn auf und überlegt neu, statt für immer gegen eine
 *   Kiste zu laufen.
 * - **Warten** — in einer Schlange, mit einer **Geduld**, die abläuft.
 * - **Interagieren** — sitzen, benutzen, bestellen: eine Haltung
 *   (`pose`) für eine Weile, am Platz, in seine Richtung gedreht.
 * - **Verlassen** — zum Ausgang, und dann ist er weg (`gone`).
 *
 * **Reine Rechnung ohne three.js** (`npcBehavior.test.ts`): Hinein gehen die
 * Tafel der Plätze, wo er steht und die Zeit; heraus kommt ein **Auftrag**
 * (`BehaviorOrder`) — ein Ziel für den Läufer, eine Haltung für den Körper,
 * ein Blick. Wer ihn ausführt, ist eine dünne Schicht an der Welt
 * (`NpcRoutine.ts`). Dieselbe Trennung wie zwischen Hirn und `Npc`: Was ein
 * Besucher tut, kann man ansehen, ohne die Brille aufzusetzen.
 *
 * Die Maschine ist bewusst **ein Ablauf und kein Baum**: Idle entscheidet,
 * alles andere läuft ab und kehrt nach Idle zurück. Ein Spielmodus, der mehr
 * will — ein Kunde, der bestellt, isst und zahlt —, schreibt eine eigene
 * `decide`-Funktion (`VisitorConfig.decide`) und behält den Rest.
 */

export type BehaviorMode = 'idle' | 'goto' | 'wait' | 'interact' | 'leave' | 'gone';

/** Was der Körper am Platz tut. */
export type BehaviorPose = 'sit' | 'interact';

/** Was als Nächstes kommt — die Antwort von `decide`. */
export type BehaviorPlan =
  /** Zu einem Platz gehen und dort `seconds` lang `pose` tun. */
  | { kind: 'visit'; place: string; pose: BehaviorPose; seconds: number }
  /** Sich anstellen und warten, bis man vorne ist und ein Platz frei wird. */
  | { kind: 'queue'; line: string; patience: number }
  /** Eine Weile herumstehen. */
  | { kind: 'idle'; seconds: number }
  /** Gehen. */
  | { kind: 'leave' };

export interface VisitorConfig {
  /** Welche Sorte Platz er aufsucht. */
  seatKind: PlaceKind;
  /** Wie er dort ist. */
  pose: BehaviorPose;
  /** Wie lange er dort bleibt, in Sekunden (ausgewürfelt dazwischen). */
  stayMin: number;
  stayMax: number;
  /** Wie viele Plätze er nacheinander aufsucht, bevor er geht. */
  visits: number;
  /** In welche Schlange er sich stellt, wenn nichts frei ist — oder keine. */
  line: string | null;
  /** Wie lange er in der Schlange aushält, in Sekunden. */
  patience: number;
  /** Ab welcher Entfernung ein Ziel erreicht ist, in Metern. */
  reach: number;
  /** Wie lange er auf dem Weg zu einem Platz sein darf, bevor er aufgibt. */
  giveUp: number;
  /** Wie lange er zwischen zwei Entscheidungen überlegt. */
  think: number;
  /**
   * Eine eigene Entscheidung — sonst die des Besuchers (`visitorDecide`).
   * Ein Spielmodus, der Kunden, Wachen oder Zuschauer braucht, schreibt nur
   * diese eine Funktion.
   */
  decide?: (state: VisitorState, board: PlaceBoard, random: () => number) => BehaviorPlan;
}

export const VISITOR_DEFAULTS: Readonly<VisitorConfig> = {
  seatKind: 'seat',
  pose: 'sit',
  stayMin: 6,
  stayMax: 14,
  visits: 2,
  line: null,
  patience: 20,
  // Enger als das Hirn allein (`ERRAND_REACH`, 1,25 m), aber nicht enger als
  // der Wendekreis: Wer mit 1,5 m/s auf einen Punkt zuläuft und sich nur so
  // schnell drehen kann, wie sein Hirn es erlaubt, umkreist ihn bei 30 cm für
  // immer. Die letzten Zentimeter bis auf den Stuhl rückt der Körper selbst
  // (`BehaviorOrder.settle`, `Npc.hold`).
  reach: 0.8,
  giveUp: 25,
  think: 0.8,
};

export interface VisitorState {
  /** Wer er ist — dieselbe Kennung, unter der er Plätze reserviert. */
  readonly id: string;
  mode: BehaviorMode;
  /** Die Uhr des aktuellen Zustands, in Sekunden, rückwärts. */
  timer: number;
  /** Wie viel Geduld noch übrig ist, in Sekunden. */
  patience: number;
  /** Wohin er gerade geht — ein Platz, der Ausgang oder nichts. */
  target: { x: number; z: number; yaw: number | null } | null;
  /** Was er am Ziel tut. */
  pose: BehaviorPose | null;
  /** Wie lange er dort bleibt. */
  stay: number;
  /** Wie viele Plätze er schon hatte. */
  visited: number;
  /** Wohin er am Ende geht. */
  readonly exit: { x: number; z: number };
  /** Was zuletzt passiert ist — für eine Zeile über dem Kopf und den Test. */
  last: BehaviorEvent | null;
}

export type BehaviorEvent =
  'reserved' | 'arrived' | 'done' | 'queued' | 'impatient' | 'gave-up' | 'left';

/** Was der Körper in diesem Bild tun soll. */
export interface BehaviorOrder {
  /** Wohin er laufen soll, oder `null` = stehen bleiben. */
  goal: { x: number; z: number } | null;
  /** Eine Haltung am Platz, oder `null` = gehen/stehen wie immer. */
  pose: BehaviorPose | null;
  /** Wohin er schauen soll, wenn er steht — oder `null`. */
  yaw: number | null;
  /** Wo er genau stehen soll (der Platz selbst), solange er dort ist. */
  settle: { x: number; z: number } | null;
}

export interface BehaviorSense {
  /** Wo seine Füße stehen. */
  at: { x: number; z: number };
  dt: number;
  random: () => number;
}

export function newVisitor(id: string, exit: { x: number; z: number }): VisitorState {
  return {
    id,
    mode: 'idle',
    timer: 0,
    patience: 0,
    target: null,
    pose: null,
    stay: 0,
    visited: 0,
    exit: { ...exit },
    last: null,
  };
}

/**
 * **Was ein Besucher als Nächstes will** — die voreingestellte Entscheidung.
 *
 * Genug gesessen → gehen. Sonst ein freier Platz, ausgewürfelt (sonst wollen
 * alle zur nächsten Bank); ist keiner frei, anstellen, wenn es eine Schlange
 * gibt, und sonst kurz warten und neu fragen.
 */
export function visitorDecide(
  state: VisitorState,
  board: PlaceBoard,
  random: () => number,
  config: VisitorConfig,
): BehaviorPlan {
  if (state.visited >= config.visits) return { kind: 'leave' };
  const place = board.randomFree(config.seatKind, random);
  if (place) {
    const seconds = config.stayMin + random() * (config.stayMax - config.stayMin);
    return { kind: 'visit', place: place.id, pose: config.pose, seconds };
  }
  if (config.line) return { kind: 'queue', line: config.line, patience: config.patience };
  return { kind: 'idle', seconds: 1 + random() * 2 };
}

/**
 * **Ein Bild Verhalten.** Schaltet den Zustand weiter und sagt, was der Körper
 * tun soll. Reserviert und gibt frei über die Tafel — ein Besucher, der
 * geht, hat danach keinen Platz mehr, ein Platz, auf den er zuläuft, ist für
 * alle anderen schon besetzt.
 */
export function stepVisitor(
  state: VisitorState,
  board: PlaceBoard,
  sense: BehaviorSense,
  config: VisitorConfig = VISITOR_DEFAULTS,
): BehaviorOrder {
  state.last = null;
  state.timer -= sense.dt;

  switch (state.mode) {
    case 'idle': {
      if (state.timer > 0) return still();
      startPlan(state, board, sense, config);
      return again(state, board, sense, config);
    }

    case 'goto': {
      const place = board.placeOf(state.id);
      if (!place || !state.target) {
        // Jemand hat ihm den Platz weggenommen (entfernt, zurückgesetzt).
        toIdle(state, config);
        return still();
      }
      if (distance(sense.at, state.target) <= config.reach) {
        state.mode = 'interact';
        state.timer = state.stay;
        state.last = 'arrived';
        return atPlace(state, place);
      }
      if (state.timer <= 0) {
        board.release(state.id);
        state.last = 'gave-up';
        toIdle(state, config);
        return still();
      }
      return {
        goal: { x: state.target.x, z: state.target.z },
        pose: null,
        yaw: null,
        settle: null,
      };
    }

    case 'interact': {
      const place = board.placeOf(state.id);
      if (!place) {
        toIdle(state, config);
        return still();
      }
      if (state.timer > 0) return atPlace(state, place);
      board.release(state.id);
      state.visited++;
      state.last = 'done';
      toIdle(state, config);
      return still();
    }

    case 'wait': {
      const place = board.placeOf(state.id);
      if (!place || place.kind !== 'queue' || place.line === undefined) {
        toIdle(state, config);
        return still();
      }
      state.patience -= sense.dt;
      if (state.patience <= 0) {
        board.release(state.id);
        board.advance(place.line);
        state.last = 'impatient';
        state.mode = 'leave';
        return toward(state.exit);
      }
      // Vorne und ein Platz frei: hin. Die Schlange rückt dahinter nach.
      if (board.front(place.line) === state.id) {
        const seat = board.randomFree(config.seatKind, sense.random);
        if (seat) {
          const line = place.line;
          const stay = config.stayMin + sense.random() * (config.stayMax - config.stayMin);
          goVisit(state, board, seat, config.pose, stay, config);
          board.advance(line);
          return again(state, board, sense, config);
        }
      }
      return {
        goal: distance(sense.at, place) > config.reach ? { x: place.x, z: place.z } : null,
        pose: null,
        yaw: place.yaw,
        settle: null,
      };
    }

    case 'leave': {
      if (distance(sense.at, state.exit) <= Math.max(config.reach, 0.8)) {
        state.mode = 'gone';
        state.last = 'left';
        return still();
      }
      return toward(state.exit);
    }

    case 'gone':
      return still();
  }
}

/**
 * Gleich noch einmal, im selben Bild und ohne Zeit — nach einer Entscheidung
 * soll er nicht ein Bild lang dastehen. Das Ereignis der Entscheidung
 * (`reserved`, `queued`) geht dabei nicht verloren.
 */
function again(
  state: VisitorState,
  board: PlaceBoard,
  sense: BehaviorSense,
  config: VisitorConfig,
): BehaviorOrder {
  const event = state.last;
  const order = stepVisitor(state, board, { ...sense, dt: 0 }, config);
  state.last ??= event;
  return order;
}

/** Die Entscheidung fällen und den Zustand danach aufsetzen. */
function startPlan(
  state: VisitorState,
  board: PlaceBoard,
  sense: BehaviorSense,
  config: VisitorConfig,
): void {
  const plan = config.decide
    ? config.decide(state, board, sense.random)
    : visitorDecide(state, board, sense.random, config);
  switch (plan.kind) {
    case 'visit': {
      const place = board.get(plan.place);
      if (!place || !board.reserve(place.id, state.id)) {
        toIdle(state, config);
        return;
      }
      goVisit(state, board, place, plan.pose, plan.seconds, config);
      return;
    }
    case 'queue': {
      const slot = board.joinQueue(plan.line, state.id);
      if (!slot) {
        state.mode = 'idle';
        state.timer = 1.5;
        return;
      }
      state.mode = 'wait';
      state.patience = plan.patience;
      state.last = 'queued';
      return;
    }
    case 'idle':
      state.mode = 'idle';
      state.timer = plan.seconds;
      return;
    case 'leave':
      board.release(state.id);
      state.mode = 'leave';
      return;
  }
}

function goVisit(
  state: VisitorState,
  board: PlaceBoard,
  place: Place,
  pose: BehaviorPose,
  seconds: number,
  config: VisitorConfig,
): void {
  board.reserve(place.id, state.id);
  state.mode = 'goto';
  state.timer = config.giveUp;
  state.target = { x: place.x, z: place.z, yaw: place.yaw };
  state.pose = pose;
  state.stay = seconds;
  state.last = 'reserved';
}

function toIdle(state: VisitorState, config: VisitorConfig): void {
  state.mode = 'idle';
  state.timer = config.think;
  state.target = null;
  state.pose = null;
}

function atPlace(state: VisitorState, place: Place): BehaviorOrder {
  return {
    goal: null,
    pose: state.pose,
    yaw: place.yaw,
    settle: { x: place.x, z: place.z },
  };
}

function still(): BehaviorOrder {
  return { goal: null, pose: null, yaw: null, settle: null };
}

function toward(point: { x: number; z: number }): BehaviorOrder {
  return { goal: { x: point.x, z: point.z }, pose: null, yaw: null, settle: null };
}

function distance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
