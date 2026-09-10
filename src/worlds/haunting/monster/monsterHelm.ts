import { spacesOf, type HouseDoor, type HouseSpec } from '../house';
import { MONSTERS } from '../mission';
import type { RoutineOutput } from '../monsterRoutine';
import type { HauntState } from '../net';
import { stationGraph } from '../roomGraph';
import { pryLock, pryTries, type DoorLocks } from '../rules/doorLocks';
import { ENTITY_PROFILES } from '../threat';
import { doorCentre } from '../map/geometry';
import type { VentRider, VentTravel } from '../vents/ventTravel';
import type { MonsterInput, MonsterTarget, MonsterTargetKind } from './monsterDriver';

/**
 * **Das Steuer des Monsters, ohne Welt** — die Übersetzung von Stock und
 * Knopf in das, was die Runde versteht.
 *
 * Zwei Welten rechnen das Monster: die 2D-Runde (`map/flatRound.ts`) und die
 * 3D-Welt (`HauntingWorld`), und in beiden kann ein Spieler am Steuer sitzen —
 * lokal am Telefon in der 2D-Welt (`flatMonsterControl.ts`) oder übers Netz
 * an der Station `monster` (`netMonsterControl.ts`). Was die Knöpfe
 * **bedeuten**, darf davon nicht abhängen. Deshalb stehen die Regeln hier,
 * einmal, und beide Steuer reichen nur ihre Sicht auf die Runde herein
 * (`MonsterArena`): Bauplan, Stand, den Reiter (Position, Blick, Raum), die
 * Fahrt — und die Buchführung der Sperren.
 *
 * **Zuschlagen ist kein Knopf mehr.** Ein Monster, das um sich schlägt,
 * trifft, was in Reichweite steht: Die Runde prüft den Abstand und trifft von
 * selbst (`map/flatRound.ts`). Ein eigener Knopf dafür war eine Prüfung, die
 * niemand bestehen wollte — er verlangte, im Moment der Berührung zu tippen,
 * und in diesem Moment schaut niemand auf seine Knöpfe.
 *
 * **Ein Knopf bleibt: „Interagieren"**, und er gilt immer genau dem
 * **nächsten** Ding, mit dem sich etwas anfangen lässt (`nearestTarget`) —
 * eine Klappe, eine Kabine, eine gesperrte Tür. Nur eines auf einmal, damit
 * die Ansicht es hervorheben kann und der Spieler weiß, was der Knopf tut,
 * bevor er ihn drückt.
 *
 * - **Klappe**: einsteigen; angekommen aussteigen; vor der Abfahrt abbrechen.
 * - **Kabine**: aufreißen. Wer darin steckt, wird getroffen; eine leere Kabine
 *   ist ein Ausweg weniger (`rules/roundRules.ts`).
 * - **Gesperrte Tür**: daran ziehen (`rules/doorLocks.ts`). Der erste Zug geht
 *   nie auf, jeder weitere steht besser — und im Mittel ist das schneller, als
 *   zu warten, bis die Sperre von selbst fällt. Holz splittert wie eh und je
 *   auf einen Schlag.
 *
 * Kein Bild, kein Netz, kein three.js — alles hier läuft in Jest.
 */
export interface MonsterArena {
  house(): HouseSpec;
  /** Der Stand der Runde — `crew.hidden`, `shut`, `phase`. */
  state(): HauntState;
  /** Wo das Monster steht; `null`, wenn es gerade keines gibt. In 2D der Actor selbst. */
  rider(): VentRider | null;
  ride(): VentTravel;
  /** Die Buchführung der Sperren (`rules/doorLocks.ts`); ohne sie splittert nur Holz. */
  locks?(): DoorLocks;
  /** Die Rundenzeit in Sekunden — der Takt, in dem an einer Sperre gezogen wird. */
  time?(): number;
  /** Gleichverteilt in [0, 1); ohne bleibt es bei `Math.random`. */
  roll?(): number;
}

/** Wie weit die Kabine vom Monster entfernt sein darf, damit sie in Reichweite ist. */
export const CABIN_REACH = 2.0;
/** Ab hier gilt der Stock als ausgelenkt. */
export const DEADZONE = 0.05;
/** Wie weit vor dem Monster das Ziel liegt, in Metern. */
export const AHEAD = 1;
/** Wie nah eine Tür sein muss, um an ihr zu ziehen, in Metern. */
export const DOOR_REACH = 1.6;

/** Eine Entscheidung, bei der nichts passiert — für ein Monster, das es nicht gibt. */
export const STILL: RoutineOutput = {
  mode: 'patrol',
  goal: null,
  pace: 'still',
  cue: '',
  face: null,
  strike: false,
  cabin: '',
  label: 'Spieler',
};

/**
 * Stock als Entscheidung in der Form der Routine. `cabin` kommt nicht vom
 * Stock, sondern vom Knopf: Die Kabine wird aufgerissen, weil jemand
 * „Interagieren" gedrückt hat und eine in Reichweite stand.
 */
export function steer(stick: MonsterInput, cabin: string, arena: MonsterArena): RoutineOutput {
  const rider = arena.rider();
  if (!rider) return STILL;
  const length = Math.hypot(stick.x, stick.z);
  const moving = length > DEADZONE;
  const goal = moving
    ? { x: rider.x + (stick.x / length) * AHEAD, z: rider.z + (stick.z / length) * AHEAD }
    : null;
  return {
    mode: stick.sprint && moving ? 'hunt' : 'patrol',
    goal,
    pace: !moving ? 'still' : stick.sprint ? 'hunt' : 'walk',
    cue: '',
    face: null,
    strike: !!cabin,
    cabin,
    label: 'Spieler',
  };
}

export type { MonsterTarget, MonsterTargetKind };

/**
 * Das nächste Ding in Reichweite, mit dem sich etwas anfangen lässt. Während
 * einer Fahrt ist das die Fahrt selbst — aussteigen oder abbrechen —, sonst
 * gewinnt der kleinste Abstand: Klappe, Kabine oder gesperrte Tür.
 *
 * **Nur eines**, mit Absicht. Zwei hervorgehobene Dinge sind eine Frage, und
 * die Antwort darauf steht in keinem Knopf.
 */
export function nearestTarget(arena: MonsterArena): MonsterTarget | null {
  const ride = arena.ride();
  const rider = arena.rider();
  if (!rider) return null;
  const here = { x: rider.x, z: rider.z };
  if (ride.phase === 'arrived') return { kind: 'ride', id: '', at: here, label: 'Aussteigen' };
  if (ride.phase === 'entering') return { kind: 'ride', id: '', at: here, label: 'Abbrechen' };
  if (ride.busy) return null;

  const found = ride.targetsFrom(rider);
  const candidates: Array<MonsterTarget & { gap: number }> = [];
  if (found && found.targets.length)
    candidates.push({
      kind: 'vent',
      id: found.flap.id,
      at: found.flap.approach,
      label: 'Einsteigen',
      gap: Math.hypot(found.flap.approach.x - rider.x, found.flap.approach.z - rider.z),
    });
  const cabin = nearestCabin(arena);
  if (cabin) candidates.push(cabin);
  const door = lockedDoorNearby(arena);
  if (door) {
    const at = doorCentre(door);
    candidates.push({
      kind: 'door',
      id: door.id,
      at,
      label: door.material === 'wood' ? 'Tür aufbrechen' : 'Tür aufziehen',
      gap: Math.hypot(at.x - rider.x, at.z - rider.z),
    });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.gap - b.gap);
  const best = candidates[0]!;
  return { kind: best.kind, id: best.id, at: best.at, label: best.label };
}

/** Die nächste Kabine in Reichweite, die es noch gibt. */
function nearestCabin(arena: MonsterArena): (MonsterTarget & { gap: number }) | null {
  const rider = arena.rider();
  if (!rider) return null;
  const graph = stationGraph(arena.house());
  const state = arena.state();
  let best: (MonsterTarget & { gap: number }) | null = null;
  for (const room of spacesOf(arena.house())) {
    if (state.destroyed.includes(room.id)) continue;
    const at = graph.locker(room.id);
    if (!at) continue;
    const gap = Math.hypot(at.x - rider.x, at.z - rider.z);
    if (gap >= CABIN_REACH || (best && gap >= best.gap)) continue;
    best = { kind: 'cabin', id: room.id, at, label: 'Kabine aufreißen', gap };
  }
  return best;
}

/** Ob die Kabine, in der der Techniker steckt, vor dem Monster steht. */
export function cabinInReach(arena: MonsterArena, hidden: string): boolean {
  if (!hidden) return true;
  const rider = arena.rider();
  if (!rider) return false;
  const locker = stationGraph(arena.house()).locker(hidden);
  if (!locker) return false;
  return Math.hypot(locker.x - rider.x, locker.z - rider.z) < CABIN_REACH;
}

/** Was aus einem Druck auf „Interagieren" wird. */
export interface InteractResult {
  /** Die Zeile für den Spieler; leer, wenn nichts passiert ist. */
  text: string;
  /** Der Raum, dessen Kabine dieses Bild aufgerissen wird — sonst `''`. */
  cabin: string;
  /** Ob das Ziel eine Fahrt war und die Wahl des Schachtziels zurückgesetzt gehört. */
  boarded: boolean;
}

/**
 * **Der Knopf „Interagieren"** — er gilt dem nächsten Ziel und sonst nichts.
 * Was er tut, steht im Kopf dieser Datei; was dabei herauskommt, ist eine
 * Zeile für den Spieler und, bei einer Kabine, der Raum für die Runde.
 */
export function interact(arena: MonsterArena, ventChoice: number): InteractResult {
  const none = { text: '', cabin: '', boarded: false };
  const ride = arena.ride();
  const rider = arena.rider();
  if (!rider) return none;
  const target = nearestTarget(arena);
  if (!target) return { ...none, text: 'Hier ist nichts.' };
  if (target.kind === 'ride') {
    if (ride.phase === 'arrived') {
      ride.exit();
      return { ...none, text: 'Aussteigen …' };
    }
    ride.cancel();
    return { ...none, text: 'Doch nicht.' };
  }
  if (target.kind === 'vent') {
    if (!ride.enter(rider, ventChoice)) return { ...none, text: 'Hier ist nichts.' };
    return {
      text: `Einsteigen · nach ${roomName(arena.house(), ride.to?.roomId ?? '')}.`,
      cabin: '',
      boarded: true,
    };
  }
  if (target.kind === 'cabin')
    return { text: 'Die Kabine wird aufgerissen.', cabin: target.id, boarded: false };
  return { ...none, text: pryDoor(arena, target.id) };
}

/**
 * **An einer gesperrten Tür ziehen.** Holz splittert auf einen Schlag; Stahl
 * hält nur der Riegel, und an dem wird gezogen: nie beim ersten Mal, danach
 * mit wachsender Aussicht (`rules/doorLocks.ts`). Ohne Buchführung — eine
 * Arena, die keine führt — bleibt es beim alten Verhalten: Holz splittert,
 * Stahl hält.
 */
function pryDoor(arena: MonsterArena, id: string): string {
  const state = arena.state();
  const door = arena.house().doors.find((one) => one.id === id);
  if (!door) return 'Hier ist nichts.';
  const locks = arena.locks?.();
  if (door.material === 'wood') {
    // In der Liste statt einer neuen Liste: Die 3D-Welt und die 2D-Runde
    // halten sich beide an genau dieses Array.
    const at = state.shut.indexOf(door.id);
    if (at >= 0) state.shut.splice(at, 1);
    if (locks) {
      locks.chosen = locks.chosen === door.id ? '' : locks.chosen;
      locks.slams = locks.slams.filter((slam) => slam.id !== door.id);
      locks.pries = locks.pries.filter((pry) => pry.id !== door.id);
    }
    return 'Holz splittert.';
  }
  if (!locks) return 'Stahl. Das hält.';
  // Der Würfel bleibt an seiner Arena — losgelöst weitergereicht verlöre er sie.
  const roll = arena.roll ? () => arena.roll!() : undefined;
  const out = pryLock(locks, state.shut, door.id, arena.time?.() ?? 0, roll);
  if (!out.tries) return '';
  state.shut.length = 0;
  state.shut.push(...out.shut);
  if (out.opened) return 'Der Riegel gibt nach.';
  return out.tries < 2 ? 'Der Riegel hält — noch.' : 'Es knirscht. Weiter.';
}

/** Was „Interagieren" jetzt täte — für die Beschriftung des Knopfs. */
export function prompt(arena: MonsterArena): string {
  const target = nearestTarget(arena);
  if (!target) return '';
  if (target.kind !== 'door') return target.label;
  const locks = arena.locks?.();
  const tries = locks ? pryTries(locks, target.id) : 0;
  return tries ? `${target.label} (${tries})` : target.label;
}

/** Wohin der Schacht vor dem Monster führt, als Knöpfe; leer ohne Klappe oder bei nur einem Ziel. */
export function ventTargets(arena: MonsterArena): ReadonlyArray<{ index: number; label: string }> {
  const ride = arena.ride();
  const rider = arena.rider();
  if (!rider || ride.busy) return [];
  const found = ride.targetsFrom(rider);
  if (!found || found.targets.length < 2) return [];
  return found.targets.map((flap, index) => ({
    index,
    label: roomName(arena.house(), flap.roomId),
  }));
}

/** Die nächste verriegelte Tür in Reichweite, oder `null`. */
export function lockedDoorNearby(arena: MonsterArena): HouseDoor | null {
  const rider = arena.rider();
  if (!rider) return null;
  const shut = arena.state().shut;
  let best: HouseDoor | null = null;
  let near = DOOR_REACH;
  for (const door of arena.house().doors) {
    if (!shut.includes(door.id)) continue;
    const at = doorCentre(door);
    const d = Math.hypot(at.x - rider.x, at.z - rider.z);
    if (d < near) {
      near = d;
      best = door;
    }
  }
  return best;
}

/** Wie die Erscheinung heißt, die gerade gespielt wird. */
export function monsterLabel(state: HauntState): string {
  const kind = state.crew.options.monster;
  return MONSTERS.find((m) => m.id === kind)?.name ?? ENTITY_PROFILES[kind].label;
}

export function roomName(house: HouseSpec, id: string): string {
  return spacesOf(house).find((room) => room.id === id)?.name ?? id;
}
