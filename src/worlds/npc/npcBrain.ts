import { brainOf, type BrainId, type BrainTuning } from './npcBrains';

/**
 * **Die Mathematik hinter dem Hirn** — aus Standort, Blickrichtung und dem, wo
 * der Spieler steht, wird eine Geschwindigkeit, ein Gierwinkel und die Frage,
 * ob es in dieser Frame einen Schlag gibt.
 *
 * Hier steht kein three.js und keine Physik, und das ist der Zweck: was ein
 * Zombie tut, ist eine Rechnung, und eine Rechnung, die man nur in der Brille
 * ansehen kann, ist eine, die niemand ansieht. Die Welt gibt zwei Punkte
 * hinein und bekommt eine Bewegung heraus (`npcBrain.test.ts`).
 *
 * **Der Gierwinkel ist der von three.js**: eine Drehung um die Y-Achse, und
 * vorne ist -Z. Ein Ding mit `yaw = 0` schaut also nach -Z, und die Richtung
 * dorthin ist `(-sin yaw, -cos yaw)`. Dieselbe Umrechnung wie bei der Drohne
 * (`droneFlight.ts`); wer sie hier anders herum schriebe, hätte einen Zombie,
 * der rückwärts vor einem davonläuft.
 *
 * **Gelaufen wird, wohin geschaut wird.** Ein NPC schiebt sich nicht seitwärts
 * auf den Spieler zu, sondern dreht sich zu ihm und geht dann los; wie weit er
 * schon herumgedreht ist, entscheidet dabei über sein Tempo (`aheadFactor`).
 * Das ist der Unterschied zwischen einem Zombie, der torkelt, und einem
 * Schrank, der auf Schienen fährt — und es ist der Grund, warum die Drehrate
 * eine Zahl im Hirn ist und keine Kosmetik.
 */

/** Ein Punkt in der Ebene — die Höhe interessiert kein Hirn. */
export interface Point {
  x: number;
  z: number;
}

/** Was sich ein Hirn zwischen zwei Bildern merkt. */
export interface BrainState {
  /** Sekunden, bis der nächste Schlag landen darf. */
  cooldown: number;
  /** Wie lange der Kurs des Schlenderers noch gilt, in Sekunden. */
  hold: number;
  /** Der Kurs, den der Schlenderer gerade läuft, als Gierwinkel. */
  course: number;
  /**
   * Ob der Spieler gerade gesehen wird.
   *
   * Nicht für die Bewegung — die rechnet sich jedes Bild neu —, sondern für
   * alles, was **einmal** passieren soll, wenn ein Zombie einen bemerkt: das
   * Knurren, das Aufleuchten der Augen. Ein Zustand, der nur dazu da ist, eine
   * Flanke zu erkennen.
   */
  awake: boolean;
}

/** Ein frisches Hirn, das in diese Richtung schaut. */
export function newBrainState(yaw = 0): BrainState {
  return { cooldown: 0, hold: 0, course: yaw, awake: false };
}

/** Alles, was ein Hirn über diese Frame wissen muss. */
export interface BrainSense {
  /** Wo der NPC steht, in der Ebene. */
  at: Point;
  /** Wohin er schaut. */
  yaw: number;
  /** Wo der Spieler steht — `null`, wenn gerade keiner da ist. */
  player: Point | null;
  dt: number;
  /** Eine Zahl aus [0,1). Als Funktion, damit ein Test sie stellen kann. */
  random: () => number;
}

/** Und was dabei herauskommt. */
export interface BrainStep {
  /** Wunschgeschwindigkeit in der Ebene, in m/s. */
  vx: number;
  vz: number;
  /** Der Gierwinkel, in den er sich in dieser Frame gedreht hat. */
  yaw: number;
  /** Ob in dieser Frame ein Schlag landet. */
  attack: boolean;
  /** Was der Körper dazu zeigt. */
  gait: 'stand' | 'walk' | 'strike';
  /** Ob der Spieler gerade gesehen wird — die Flanke steht in `state.awake`. */
  sees: boolean;
}

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** Ein Winkel, auf [-π, π) zurückgeholt. */
export function wrapAngle(angle: number): number {
  const turned = (((angle + Math.PI) % TAU) + TAU) % TAU;
  return turned - Math.PI;
}

/** Der Gierwinkel, in dem `from` genau auf `to` schaut. */
export function yawTo(from: Point, to: Point): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

/**
 * Einen Schritt in Richtung des gewünschten Winkels, höchstens `maxStep` weit
 * und immer über den **kürzeren** Bogen. Wer das nicht tut, dreht sich für die
 * letzten fünf Grad einmal ganz herum.
 */
export function turnToward(from: number, to: number, maxStep: number): number {
  const delta = wrapAngle(to - from);
  if (Math.abs(delta) <= maxStep) return wrapAngle(to);
  return wrapAngle(from + Math.sign(delta) * maxStep);
}

/**
 * Wie viel vom Tempo übrig bleibt, wenn man noch nicht ganz in die Richtung
 * schaut, in die man will: der Kosinus des Fehlers, und nach hinten nichts.
 * Ein NPC, der sich noch dreht, läuft langsamer an — und einer, der in die
 * falsche Richtung schaut, läuft gar nicht erst los.
 */
export function aheadFactor(error: number): number {
  return Math.max(0, Math.cos(wrapAngle(error)));
}

/** Der Abstand zweier Punkte in der Ebene. */
export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

/**
 * Ein Bild eines Hirns.
 *
 * Der Zustand wird dabei **verändert** — Abklingzeit, Kurs und die gemerkte
 * Sicht —, das Ergebnis ist neu. So kann die Welt das Ergebnis wegwerfen (ein
 * NPC, der gerade stirbt) und trotzdem läuft die Uhr weiter.
 */
export function stepBrain(
  id: BrainId,
  state: BrainState,
  sense: BrainSense,
  tuning: BrainTuning = brainOf(id).tuning,
): BrainStep {
  state.cooldown = Math.max(0, state.cooldown - sense.dt);
  const maxTurn = tuning.turn * DEG * sense.dt;
  const range = sense.player ? distanceBetween(sense.at, sense.player) : Infinity;
  const sees = sense.player !== null && tuning.sense > 0 && range <= tuning.sense;

  if (id === 'wander') return wander(state, sense, tuning, maxTurn, sees);
  if (!sees || !sense.player) {
    // Kein Spieler in Sicht: stehen bleiben und schauen, wohin man schaut.
    state.awake = false;
    return { vx: 0, vz: 0, yaw: sense.yaw, attack: false, gait: 'stand', sees: false };
  }

  const wanted = yawTo(sense.at, sense.player);
  const yaw = turnToward(sense.yaw, wanted, maxTurn);
  state.awake = true;

  // In Reichweite wird nicht mehr gelaufen, sondern geschlagen — und zwischen
  // zwei Schlägen gewartet. Ohne die Wartezeit träfe ein Zombie sechzigmal je
  // Sekunde, und das ist kein Schlag mehr, sondern ein Föhn.
  const striking = tuning.reach > 0 && range <= tuning.reach;
  if (striking) {
    const attack = state.cooldown <= 0;
    if (attack) state.cooldown = tuning.cooldown;
    return { vx: 0, vz: 0, yaw, attack, gait: 'strike', sees: true };
  }

  const drive = tuning.speed * aheadFactor(wanted - yaw);
  if (drive <= 0) return { vx: 0, vz: 0, yaw, attack: false, gait: 'stand', sees: true };
  return {
    vx: -Math.sin(yaw) * drive,
    vz: -Math.cos(yaw) * drive,
    yaw,
    attack: false,
    gait: 'walk',
    sees: true,
  };
}

/** Wie lange ein Kurs mindestens und höchstens gilt, in Sekunden. */
export const COURSE_MIN = 2.5;
export const COURSE_MAX = 7;

/**
 * Der Schlenderer: er läuft seinen Kurs, bis die Uhr abgelaufen ist, dann
 * würfelt er einen neuen. Er sieht niemanden — und das ist Absicht: ein
 * Spaziergänger, der einem ausweicht, ist schon eine halbe Verfolgung.
 */
function wander(
  state: BrainState,
  sense: BrainSense,
  tuning: BrainTuning,
  maxTurn: number,
  sees: boolean,
): BrainStep {
  state.hold -= sense.dt;
  if (state.hold <= 0) {
    state.course = wrapAngle(sense.random() * TAU);
    state.hold = COURSE_MIN + sense.random() * (COURSE_MAX - COURSE_MIN);
  }
  const yaw = turnToward(sense.yaw, state.course, maxTurn);
  const drive = tuning.speed * aheadFactor(state.course - yaw);
  state.awake = sees;
  if (drive <= 0) return { vx: 0, vz: 0, yaw, attack: false, gait: 'stand', sees };
  return {
    vx: -Math.sin(yaw) * drive,
    vz: -Math.cos(yaw) * drive,
    yaw,
    attack: false,
    gait: 'walk',
    sees,
  };
}
