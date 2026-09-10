import { spacesOf, type HouseDoor, type HouseSpec } from '../house';
import { MONSTERS } from '../mission';
import type { RoutineOutput } from '../monsterRoutine';
import type { HauntState } from '../net';
import { stationGraph } from '../roomGraph';
import { ENTITY_PROFILES } from '../threat';
import { doorCentre } from '../map/geometry';
import type { VentRider, VentTravel } from '../vents/ventTravel';
import type { MonsterInput } from './monsterDriver';

/**
 * **Das Steuer des Monsters, ohne Welt** — die Übersetzung von Stock und
 * Knöpfen in das, was die Runde versteht.
 *
 * Zwei Welten rechnen das Monster: die 2D-Runde (`map/flatRound.ts`) und die
 * 3D-Welt (`HauntingWorld`), und in beiden kann ein Spieler am Steuer sitzen —
 * lokal am Telefon in der 2D-Welt (`flatMonsterControl.ts`) oder übers Netz
 * an der Station `monster` (`netMonsterControl.ts`). Was die Knöpfe
 * **bedeuten**, darf davon nicht abhängen: Ein Ziel einen Meter voraus, das
 * Tempo aus dem Sprintring, Angreifen nur in Reichweite, Interagieren als
 * Klappe oder Tür. Deshalb stehen die Regeln hier, einmal, und beide Steuer
 * reichen nur ihre Sicht auf die Runde herein (`MonsterArena`): Bauplan,
 * Stand, den Reiter (Position, Blick, Raum) und die Fahrt.
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
}

/** Wie weit die Kabine vom Monster entfernt sein darf, damit „Angreifen" sie aufreißt. */
export const CABIN_REACH = 2.0;
/** Ab hier gilt der Stock als ausgelenkt. */
export const DEADZONE = 0.05;
/** Wie weit vor dem Monster das Ziel liegt, in Metern. */
export const AHEAD = 1;
/** Wie nah eine Tür sein muss, um sie aufzubrechen, in Metern. */
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
 * Stock und Angriffsknopf als Entscheidung in der Form der Routine. `strike`
 * gilt nur, wenn die Kabine des Technikers in Reichweite steht — oder er in
 * keiner steckt; dann prüft die Runde selbst den Abstand.
 */
export function steer(stick: MonsterInput, attack: boolean, arena: MonsterArena): RoutineOutput {
  const rider = arena.rider();
  if (!rider) return STILL;
  const hidden = arena.state().crew.hidden;
  const strike = attack && cabinInReach(arena, hidden);
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
    strike,
    // Vor der Kabine, in der der Techniker steckt, gilt der Knopf ihr.
    cabin: strike && hidden ? hidden : '',
    label: 'Spieler',
  };
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

/**
 * **Der Knopf „Interagieren"**: aussteigen, wenn die Fahrt angekommen ist;
 * abbrechen, solange man noch nicht losgefahren ist; einsteigen, wenn eine
 * Klappe vor einem ist — und sonst eine verriegelte Holztür aufbrechen.
 * Stahl hält. Die Antwort ist eine Zeile für den Spieler.
 */
export function interact(arena: MonsterArena, ventChoice: number): string {
  const ride = arena.ride();
  const rider = arena.rider();
  if (!rider) return '';
  if (ride.phase === 'arrived') {
    ride.exit();
    return 'Aussteigen …';
  }
  if (ride.phase === 'entering') {
    ride.cancel();
    return 'Doch nicht.';
  }
  if (ride.busy) return '';
  if (ride.enter(rider, ventChoice))
    return `Einsteigen · nach ${roomName(arena.house(), ride.to?.roomId ?? '')}.`;
  const door = lockedDoorNearby(arena);
  if (door) {
    if (door.material !== 'wood') return 'Stahl. Das hält.';
    // In der Liste statt einer neuen Liste: Die 3D-Welt und die 2D-Runde
    // halten sich beide an genau dieses Array.
    const shut = arena.state().shut;
    const at = shut.indexOf(door.id);
    if (at >= 0) shut.splice(at, 1);
    return 'Holz splittert.';
  }
  return 'Hier ist nichts.';
}

/** Was „Interagieren" jetzt täte — für die Beschriftung des Knopfs. */
export function prompt(arena: MonsterArena): string {
  const ride = arena.ride();
  const rider = arena.rider();
  if (!rider) return '';
  if (ride.phase === 'arrived') return 'Aussteigen';
  if (ride.phase === 'entering') return 'Abbrechen';
  if (ride.busy) return '';
  const found = ride.targetsFrom(rider);
  if (found && found.targets.length) return 'Einsteigen';
  const door = lockedDoorNearby(arena);
  if (door) return door.material === 'wood' ? 'Tür aufbrechen' : 'Stahltür';
  return '';
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
