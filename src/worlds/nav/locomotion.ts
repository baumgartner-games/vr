import { aheadFactor, turnToward, wrapAngle, yawTo } from '../npc/npcBrain';

/**
 * **Wie sich etwas bewegt** — getrennt von der Frage, *wohin*.
 *
 * Die Wegsuche liefert Kacheln, und was daraus wird, ist eine ganz andere
 * Frage: Ein Zombie dreht sich auf der Stelle und geht los, ein Auto braucht
 * einen Wendekreis und muss vor der Kurve langsamer werden, eine Drohne
 * scheert sich um den Boden überhaupt nicht. Alle drei bekommen denselben
 * Wegpunkt und machen etwas anderes daraus.
 *
 * Dass das zwei Dateien sind und nicht eine, ist der Zweck der Übung. Wer
 * beides zusammenlegt, hat am Ende eine Wegsuche, die weiß, dass Autos nicht
 * rückwärts durch Türen fahren — und dann eine zweite Wegsuche, sobald das
 * erste Boot ins Spiel kommt.
 *
 * **Zustand steckt in `LocoState` und nicht in der Fortbewegung selbst.** Eine
 * `Walker`-Instanz je NPC wäre fünfzig gleiche Objekte; so gibt es eine je
 * *Sorte*, und was sich unterscheidet — das aktuelle Tempo — trägt jeder
 * selbst. Dieselbe Aufteilung wie beim Hirn (`npcBrain.ts`: Zustand hinein,
 * Ergebnis heraus).
 */

const DEG = Math.PI / 180;

/** Ein Punkt, auf den zugesteuert wird. `y` interessiert nur den Flug. */
export interface LocoPoint {
  x: number;
  z: number;
  y?: number;
}

/** Alles, was eine Fortbewegung über dieses Bild wissen muss. */
export interface LocoInput {
  at: LocoPoint;
  /** Wohin er gerade schaut. */
  yaw: number;
  /** Der nächste Wegpunkt — `null` heißt anhalten. */
  target: LocoPoint | null;
  /** Ob das der letzte Punkt des Weges ist: davor wird gebremst, sonst nicht. */
  last: boolean;
  /**
   * Wohin er ausweichen soll, als Richtung der Länge 0..1.
   *
   * Kommt von der lokalen Vermeidung und **nicht** aus dem Gitter: die Kiste,
   * die gerade jemand fallen lässt, der NPC nebenan, der Spieler im Weg. Der
   * Wegpunkt bleibt, wo er ist — es ändert sich nur, wie man dorthin kommt.
   */
  avoid?: LocoPoint | null;
  dt: number;
}

/** Und was dabei herauskommt. */
export interface LocoStep {
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  /** Ob der Wegpunkt erreicht ist und der nächste kommen darf. */
  arrived: boolean;
  gait: 'stand' | 'turn' | 'move' | 'reverse';
}

/** Was sich eine Fortbewegung zwischen zwei Bildern merkt. */
export interface LocoState {
  /** Das aktuelle Tempo in m/s. Negativ heißt rückwärts. */
  speed: number;
}

export function newLocoState(): LocoState {
  return { speed: 0 };
}

/** Die gemeinsame Schnittstelle. */
export interface Locomotion {
  readonly id: string;
  /** Wie nah ein Wegpunkt sein muss, um als erreicht zu gelten, in Metern. */
  readonly reach: number;
  step(input: LocoInput, state: LocoState): LocoStep;
}

const STILL: LocoStep = { vx: 0, vy: 0, vz: 0, yaw: 0, arrived: false, gait: 'stand' };

function halt(input: LocoInput, state: LocoState, brake: number): LocoStep {
  state.speed = approach(state.speed, 0, brake * input.dt);
  return { ...STILL, yaw: input.yaw, gait: state.speed === 0 ? 'stand' : 'move' };
}

/** Einen Wert um höchstens `step` an ein Ziel heranführen. */
function approach(value: number, goal: number, step: number): number {
  if (value < goal) return Math.min(goal, value + step);
  if (value > goal) return Math.max(goal, value - step);
  return goal;
}

/**
 * Die Richtung, in die gesteuert wird: zum Wegpunkt, plus das Ausweichen.
 *
 * Das Ausweichen wird **addiert und nicht ersetzt**. Ein NPC, der nur noch
 * ausweicht, läuft von seinem Weg weg und kommt nie an; einer, der nur seinem
 * Weg folgt, läuft in den nächsten hinein. Die Summe der beiden ist der
 * Bogen, den ein Mensch auch laufen würde.
 */
function steerYaw(input: LocoInput, target: LocoPoint): number {
  const dx = target.x - input.at.x;
  const dz = target.z - input.at.z;
  const length = Math.hypot(dx, dz) || 1;
  let sx = dx / length;
  let sz = dz / length;
  if (input.avoid) {
    sx += input.avoid.x;
    sz += input.avoid.z;
  }
  if (sx === 0 && sz === 0) return input.yaw;
  return yawTo({ x: 0, z: 0 }, { x: sx, z: sz });
}

function flatDistance(a: LocoPoint, b: LocoPoint): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

/**
 * **Der Fußgänger.** Dreht sich zu seinem Ziel und geht dann los — wer noch
 * quer steht, geht langsamer an (`aheadFactor`). Genau das unterscheidet einen
 * Zombie, der torkelt, von einem Schrank, der auf Schienen fährt.
 */
export class Walker implements Locomotion {
  readonly id = 'walk';
  readonly reach: number;

  constructor(
    private readonly tuning: {
      /** Höchsttempo in m/s. */
      speed: number;
      /** Drehrate in Grad je Sekunde. */
      turn: number;
      /** Wie schnell er auf Tempo kommt, in m/s². */
      accel: number;
      /** Wie nah ein Wegpunkt zählt, in Metern. */
      reach: number;
    },
  ) {
    this.reach = tuning.reach;
  }

  step(input: LocoInput, state: LocoState): LocoStep {
    const { target } = input;
    if (!target) return halt(input, state, this.tuning.accel * 2);

    const wanted = steerYaw(input, target);
    const yaw = turnToward(input.yaw, wanted, this.tuning.turn * DEG * input.dt);
    const gap = flatDistance(input.at, target);
    const arrived = gap <= this.reach;

    // Am letzten Punkt wird angehalten, an jedem anderen durchgelaufen: Wer
    // an jeder Ecke bremst, läuft nicht, sondern hakt sich durch die Karte.
    const wish = arrived && input.last ? 0 : this.tuning.speed * aheadFactor(wanted - yaw);
    state.speed = approach(state.speed, wish, this.tuning.accel * input.dt);

    return {
      vx: -Math.sin(yaw) * state.speed,
      vy: 0,
      vz: -Math.cos(yaw) * state.speed,
      yaw,
      arrived,
      gait: state.speed > 0.05 ? 'move' : 'turn',
    };
  }
}

/**
 * **Das Fahrzeug.** Es dreht sich nicht auf der Stelle: Wie schnell es die
 * Richtung ändern kann, hängt davon ab, wie schnell es fährt (ω = v/R).
 *
 * Daraus folgt das ganze Verhalten, und es folgt von selbst: Vor einer engen
 * Kurve muss es langsamer werden, aber nicht bis zum Stillstand — bei Tempo
 * null dreht es gar nicht mehr. Steht das Ziel hinter ihm, fährt es rückwärts,
 * wenn es das darf, und rangiert sonst im Bogen.
 */
export class Driver implements Locomotion {
  readonly id = 'drive';
  readonly reach: number;

  constructor(
    private readonly tuning: {
      speed: number;
      /** Wendekreisradius in Metern — die Zahl, die ein Fahrzeug ausmacht. */
      radius: number;
      accel: number;
      brake: number;
      /** Ob es rückwärts fahren darf, und wie schnell. 0 = gar nicht. */
      reverse: number;
      reach: number;
    },
  ) {
    this.reach = tuning.reach;
  }

  step(input: LocoInput, state: LocoState): LocoStep {
    const { target } = input;
    if (!target) return halt(input, state, this.tuning.brake);

    const wanted = steerYaw(input, target);
    const error = wrapAngle(wanted - input.yaw);
    const gap = flatDistance(input.at, target);
    const arrived = gap <= this.reach;

    // Hinter mir, und ich kann rückwärts: dann rückwärts. Der Wendekreis gilt
    // dabei genauso, nur andersherum.
    const behind = Math.abs(error) > 120 * DEG && this.tuning.reverse > 0;
    const wish = behind ? -this.tuning.reverse : this.tuning.speed * cornerFactor(error);
    const goal = arrived && input.last ? 0 : wish;
    const rate = goal > state.speed ? this.tuning.accel : this.tuning.brake;
    state.speed = approach(state.speed, goal, rate * input.dt);

    // ω = v/R, und das Vorzeichen der Lenkung dreht sich mit der Fahrtrichtung:
    // Wer rückwärts einschlägt, schwenkt vorn in die andere Richtung.
    const omega = (Math.abs(state.speed) / this.tuning.radius) * input.dt;
    const aim = behind ? wrapAngle(wanted + Math.PI) : wanted;
    const yaw = omega > 0 ? turnToward(input.yaw, aim, omega) : input.yaw;

    return {
      vx: -Math.sin(yaw) * state.speed,
      vy: 0,
      vz: -Math.cos(yaw) * state.speed,
      yaw,
      arrived,
      gait: state.speed < -0.05 ? 'reverse' : Math.abs(state.speed) > 0.05 ? 'move' : 'turn',
    };
  }
}

/**
 * Wie viel Tempo in einer Kurve übrig bleibt: voll geradeaus, ein Viertel bei
 * 90 Grad — und **nie null**, denn ein Fahrzeug, das steht, lenkt nicht mehr.
 */
export function cornerFactor(error: number): number {
  const bend = Math.min(1, Math.abs(wrapAngle(error)) / (90 * DEG));
  return Math.max(0.25, 1 - bend * 0.75);
}

/**
 * **Der Flug.** Er nimmt das Gitter nicht — er nimmt die Luftlinie.
 *
 * Deshalb bekommt er auch keinen Wegpunkt aus einem Weg, sondern das **Ziel
 * selbst**; um alles, was dazwischen steht, kümmert sich das Ausweichen. Eine
 * Drohne, die einer Kachelkette folgt, fliegt Slalom durch eine leere Halle.
 */
export class Flyer implements Locomotion {
  readonly id = 'fly';
  readonly reach: number;

  constructor(
    private readonly tuning: {
      speed: number;
      turn: number;
      /** Wie schnell sie steigt und sinkt, in m/s. */
      climb: number;
      accel: number;
      reach: number;
    },
  ) {
    this.reach = tuning.reach;
  }

  step(input: LocoInput, state: LocoState): LocoStep {
    const { target } = input;
    if (!target) return halt(input, state, this.tuning.accel);

    const wanted = steerYaw(input, target);
    const yaw = turnToward(input.yaw, wanted, this.tuning.turn * DEG * input.dt);
    const flat = flatDistance(input.at, target);
    const rise = (target.y ?? 0) - (input.at.y ?? 0);
    const arrived = Math.hypot(flat, rise) <= this.reach;

    // Anders als am Boden wird beim Fliegen **nicht** gewartet, bis die Nase
    // stimmt: Eine Drohne schiebt sich auch seitwärts. Der Gierwinkel ist hier
    // Blickrichtung und nicht Fahrtrichtung.
    const wish = arrived && input.last ? 0 : this.tuning.speed;
    state.speed = approach(state.speed, wish, this.tuning.accel * input.dt);

    const length = flat || 1;
    return {
      vx: ((target.x - input.at.x) / length) * state.speed,
      vy: Math.max(-this.tuning.climb, Math.min(this.tuning.climb, rise * 2)),
      vz: ((target.z - input.at.z) / length) * state.speed,
      yaw,
      arrived,
      gait: state.speed > 0.05 ? 'move' : 'stand',
    };
  }
}

/** Was ausgeliefert wird — Menü, Editor und Werkzeugseite lesen diese Liste. */
export const WALKER = new Walker({ speed: 1.5, turn: 130, accel: 4, reach: 0.9 });
export const RUNNER = new Walker({ speed: 4.2, turn: 200, accel: 8, reach: 1.1 });
export const DRIVER = new Driver({
  speed: 9,
  radius: 4.5,
  accel: 4,
  brake: 7,
  reverse: 2.5,
  reach: 2.2,
});
export const FLYER = new Flyer({ speed: 7, turn: 180, climb: 3, accel: 5, reach: 1.4 });

export const LOCOMOTIONS: readonly Locomotion[] = [WALKER, RUNNER, DRIVER, FLYER];
