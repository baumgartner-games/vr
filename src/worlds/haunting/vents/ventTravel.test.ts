import { generateHouse } from '../house';
import { VentNet } from './ventGraph';
import {
  VENT_ENTER_SECONDS,
  VENT_EXIT_SECONDS,
  VENT_MIN_RIDE,
  VENT_SPEED,
  VentTravel,
  type VentRider,
} from './ventTravel';

const DT = 0.1;

function rideOf(seed = 1): { net: VentNet; ride: VentTravel; rider: VentRider } {
  const net = new VentNet(generateHouse(seed, 14));
  const ride = new VentTravel(net);
  const flap = net.flap('vent-cafeteria')!;
  const rider: VentRider = { x: flap.approach.x, z: flap.approach.z, yaw: 0, space: 'r0' };
  return { net, ride, rider };
}

function run(ride: VentTravel, rider: VentRider, seconds: number, auto: boolean): string[] {
  const events: string[] = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    const event = ride.step(DT, rider, auto);
    if (event) events.push(event);
  }
  return events;
}

describe('Die Fahrt durch den Schacht', () => {
  it('geht in drei Schritten: einsteigen, fahren, aussteigen — und dauert', () => {
    const { net, ride, rider } = rideOf();
    expect(ride.busy).toBe(false);
    expect(ride.enter(rider)).toBe(true);
    expect(ride.phase).toBe('entering');
    expect(ride.concealed).toBe(false);
    expect(ride.openFlap?.id).toBe('vent-cafeteria');
    expect(ride.to?.id).toBe('vent-admin');
    // Beim Einsteigen steht man noch sichtbar vor der Klappe.
    expect(run(ride, rider, VENT_ENTER_SECONDS - DT, true)).toEqual([]);
    expect(ride.concealed).toBe(false);
    expect(run(ride, rider, DT * 1.5, true)).toEqual(['entered']);
    expect(ride.phase).toBe('riding');
    expect(ride.concealed).toBe(true);
    expect(ride.openFlap).toBeNull();
    const length = net.length('vent-cafeteria', 'vent-admin');
    const seconds = Math.max(VENT_MIN_RIDE, length / VENT_SPEED);
    expect(seconds).toBeGreaterThan(VENT_MIN_RIDE);
    expect(run(ride, rider, seconds - DT, true)).toEqual([]);
    expect(ride.concealed).toBe(true);
    // Angekommen: Die KI steigt sofort aus, die Klappe drüben steht offen.
    expect(run(ride, rider, DT * 1.5, true)).toEqual(['arrived']);
    expect(ride.phase).toBe('exiting');
    expect(ride.openFlap?.id).toBe('vent-admin');
    expect(run(ride, rider, VENT_EXIT_SECONDS + DT, true)).toEqual(['exited']);
    expect(ride.busy).toBe(false);
    const admin = net.flap('vent-admin')!;
    expect(rider.x).toBeCloseTo(admin.approach.x);
    expect(rider.z).toBeCloseTo(admin.approach.z);
    expect(rider.space).toBe('r11');
  });

  it('wartet auf einen Spieler, bis er aussteigt', () => {
    const { ride, rider } = rideOf();
    ride.enter(rider);
    run(ride, rider, 30, false);
    expect(ride.phase).toBe('arrived');
    expect(ride.concealed).toBe(true);
    expect(rider.space).toBe('r11');
    expect(ride.exit()).toBe(true);
    expect(run(ride, rider, VENT_EXIT_SECONDS + DT, false)).toEqual(['exited']);
    expect(ride.exit()).toBe(false);
  });

  it('steigt nur vor einer Klappe mit Ziel ein und wählt unter mehreren', () => {
    const { net, ride, rider } = rideOf();
    rider.x += 5;
    expect(ride.enter(rider)).toBe(false);
    const reactor = net.flap('vent-reactor')!;
    Object.assign(rider, { x: reactor.approach.x, z: reactor.approach.z, space: 'r2' });
    expect(ride.targetsFrom(rider)?.targets.map((f) => f.id)).toEqual([
      'vent-upper-engine',
      'vent-lower-engine',
    ]);
    expect(ride.enter(rider, 1)).toBe(true);
    expect(ride.to?.id).toBe('vent-lower-engine');
    expect(ride.enter(rider)).toBe(false);
    expect(ride.cancel()).toBe(true);
    expect(ride.busy).toBe(false);
    expect(ride.enter(rider, 99)).toBe(true);
    expect(ride.to?.id).toBe('vent-lower-engine');
    run(ride, rider, 2, true);
    expect(ride.cancel()).toBe(false);
    ride.reset();
    expect(ride.busy).toBe(false);
  });
});
