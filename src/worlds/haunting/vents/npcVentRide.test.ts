import { generateHouse } from '../house';
import type { RoutineOutput } from '../monsterRoutine';
import { stationGraph } from '../roomGraph';
import { VENT_REACH, type VentFlap } from './ventGraph';
import {
  NPC_VENT_REACH,
  NpcVentRide,
  VENTING_CEILING,
  VENTING_FLOOR,
  type VentBody,
} from './npcVentRide';
import { VENT_ENTER_SECONDS, VENT_EXIT_SECONDS, type VentRider } from './ventTravel';

const DT = 0.05;

/** Ein Körper aus Protokoll: Was die Welt täte, steht hinterher in `log`. */
function fakeBody(): VentBody & {
  log: string[];
  placed: Array<{ x: number; z: number; yaw: number }>;
  holds: number;
} {
  const body = {
    log: [] as string[],
    placed: [] as Array<{ x: number; z: number; yaw: number }>,
    holds: 0,
    hold() {
      body.holds++;
    },
    place(at: { x: number; z: number }, yaw: number) {
      body.placed.push({ x: at.x, z: at.z, yaw });
      body.log.push('place');
    },
    effect(flap: VentFlap) {
      body.log.push(`effect:${flap.id}`);
    },
  };
  return body;
}

function patrolTo(goal: { x: number; z: number }): RoutineOutput {
  return {
    mode: 'patrol',
    face: null,
    goal,
    pace: 'walk',
    cue: '',
    strike: false,
    cabin: '',
    label: 'Patrouille',
  };
}

function seat(kind: 'stalker' | 'crawler' = 'crawler') {
  const spec = generateHouse(3, 14);
  const body = fakeBody();
  const ride = NpcVentRide.forSpec(spec, body, kind, 3.2);
  const graph = stationGraph(spec);
  const flap = ride.net.flap('vent-cafeteria')!;
  const rider: VentRider = { x: flap.approach.x, z: flap.approach.z, yaw: 0, space: flap.roomId };
  return { spec, body, ride, graph, flap, rider };
}

/** Bilder laufen lassen, bis die Fahrt zu Ende ist oder die Zeit um. */
function drive(
  ride: NpcVentRide,
  rider: VentRider,
  seconds: number,
  autoExit = true,
): { events: string[]; ventingSeen: number[]; time: number } {
  const events: string[] = [];
  const ventingSeen: number[] = [];
  let time = 0;
  while (ride.ride.busy && time < seconds) {
    const event = ride.step(DT, rider, autoExit);
    if (event) events.push(event);
    ventingSeen.push(ride.venting());
    time += DT;
  }
  return { events, ventingSeen, time };
}

describe('Die Fahrt des NPC-Monsters durch das Netz', () => {
  it('nimmt das Ziel der Routine, biegt es auf die Klappe um und steigt davor ein', () => {
    const { ride, graph, flap, rider } = seat();
    const admin = ride.net.flap('vent-admin')!;
    const goal = graph.centre(admin.roomId);
    // Weit weg von der Klappe: Der Lotse zeigt erst einmal zur Klappe.
    rider.x = flap.approach.x + 6;
    const steered = ride.steer(patrolTo(goal), rider, 100, graph);
    expect(steered.goal).toEqual(flap.approach);
    expect(ride.ride.busy).toBe(false);
    // Der Rapier-Körper hält eine Körperlänge vor seinem Ziel — das reicht.
    rider.x = flap.approach.x + NPC_VENT_REACH - 0.05;
    expect(NPC_VENT_REACH).toBeGreaterThan(1.15);
    expect(NPC_VENT_REACH).toBeLessThan(VENT_REACH);
    const entering = ride.steer(patrolTo(goal), rider, 100 + DT, graph);
    expect(ride.ride.busy).toBe(true);
    expect(ride.ride.phase).toBe('entering');
    expect(entering.goal).toBeNull();
    expect(entering.pace).toBe('still');
    expect(ride.pilot.rides).toBe(1);
    // Während der Fahrt lässt der Lotse die Entscheidung in Ruhe.
    expect(ride.steer(patrolTo(goal), rider, 101, graph)).toEqual(patrolTo(goal));
  });

  it('hält venting positiv, solange es verborgen ist — und den Körper still', () => {
    const { ride, body, flap, rider } = seat();
    const admin = ride.net.flap('vent-admin')!;
    expect(ride.venting()).toBe(0);
    expect(ride.ride.enter(rider)).toBe(true);
    // Einsteigen: sichtbar, Klappe offen, noch kein Signal.
    expect(ride.venting()).toBe(0);
    expect(ride.ride.openFlap?.id).toBe(flap.id);
    const { events, ventingSeen, time } = drive(ride, rider, 30);
    expect(events).toEqual(['entered', 'arrived', 'exited']);
    // Rauch und Schlag an beiden Klappen, der Körper drüben abgesetzt.
    expect(body.log).toEqual([`effect:${flap.id}`, 'place', `effect:${admin.id}`, 'place']);
    for (const at of body.placed) {
      expect(at.x).toBeCloseTo(admin.approach.x);
      expect(at.z).toBeCloseTo(admin.approach.z);
      expect(at.yaw).toBeCloseTo(admin.yaw + Math.PI);
    }
    // Im Schacht jedes Bild festgehalten, und in dieser Zeit `venting` nie null.
    const concealedFrames = ventingSeen.filter((v) => v > 0);
    expect(concealedFrames.length).toBe(body.holds);
    expect(concealedFrames.length).toBeGreaterThan(40);
    for (const v of concealedFrames) {
      expect(v).toBeGreaterThanOrEqual(VENTING_FLOOR);
      expect(v).toBeLessThanOrEqual(VENTING_CEILING);
    }
    // Davor (Einsteigen) und danach (Aussteigen, draußen) ist es null.
    const first = ventingSeen.findIndex((v) => v > 0);
    const last = ventingSeen.length - 1 - [...ventingSeen].reverse().findIndex((v) => v > 0);
    expect(first).toBeGreaterThan(VENT_ENTER_SECONDS / DT - 2);
    expect(ventingSeen.slice(0, first).every((v) => v === 0)).toBe(true);
    expect(ventingSeen.slice(last + 1).every((v) => v === 0)).toBe(true);
    expect(ventingSeen.slice(last + 1).length).toBeGreaterThan(VENT_EXIT_SECONDS / DT - 2);
    expect(ride.venting()).toBe(0);
    expect(ride.ride.busy).toBe(false);
    expect(rider.space).toBe(admin.roomId);
    expect(time).toBeGreaterThan(VENT_ENTER_SECONDS + VENT_EXIT_SECONDS + 2.5);
  });

  it('wartet mit einem Spieler am Steuer auf den Ausstieg', () => {
    const { ride, body, rider } = seat('stalker');
    expect(ride.ride.enter(rider)).toBe(true);
    const { events } = drive(ride, rider, 30, false);
    expect(events).toEqual(['entered', 'arrived']);
    expect(ride.ride.phase).toBe('arrived');
    // Angekommen und noch drin: verborgen, Körper schon drüben, Signal an.
    expect(ride.venting()).toBeGreaterThan(0);
    expect(body.placed).toHaveLength(1);
    expect(ride.ride.exit()).toBe(true);
    expect(ride.venting()).toBe(0);
    expect(drive(ride, rider, 5, false).events).toEqual(['exited']);
    expect(body.placed).toHaveLength(2);
  });

  it('räumt für eine neue Runde auf', () => {
    const { ride, rider } = seat();
    expect(ride.ride.enter(rider)).toBe(true);
    drive(ride, rider, 2);
    expect(ride.ride.concealed).toBe(true);
    ride.reset();
    expect(ride.ride.busy).toBe(false);
    expect(ride.venting()).toBe(0);
    expect(ride.pilot.rides).toBe(0);
  });
});
