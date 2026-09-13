import { PLAYER_CAPSULE_RADIUS } from '../../physics/playerClearance';
import { PLAN_DOOR_W } from '../editor/levelPlan';
import { doorAxis, doorCentre, DOOR_WIDTH, walkable } from './map/geometry';
import { STATION_DOOR_W } from './house';
import { FlatRound, PLAYER_RADIUS } from './map/flatRound';
import { AutomaticDoors } from './automaticDoors';
import { CROUCH_FACTOR, PLAYER_SPRINT_SPEED, PLAYER_WALK_SPEED } from './mission';
import { NOISE, stepLoudness } from './audio/cues';
import { BOT_FOV } from './perception';
import { PlayerRig } from '../../core/PlayerRig';
import * as THREE from 'three';

/**
 * **Eine Wahrheit für 2D und 3D** — die Zahlen und Stücke, die beide Welten
 * teilen müssen, damit eine Runde auf dem Telefon dasselbe sagt wie eine in
 * der Brille. Jede Zeile hier war einmal an zwei Stellen verschieden.
 */

const DT = 1 / 30;

describe('Eine Wahrheit für 2D und 3D', () => {
  it('lässt den Spieler auf der Karte so dick sein wie seine Kapsel in der Brille', () => {
    expect(PLAYER_RADIUS).toBe(PLAYER_CAPSULE_RADIUS);
  });

  it('baut die Tür im Schiff so breit wie auf der Karte — eine Kachel abzüglich Wand', () => {
    expect(STATION_DOOR_W).toBe(DOOR_WIDTH);
    expect(STATION_DOOR_W).toBeGreaterThan(PLAN_DOOR_W);
    const round = new FlatRound(2, { test: true });
    const door = round.house.doors.find((one) => one.b !== null)!;
    const at = doorCentre(door);
    const alongX = doorAxis(door.dir) === 'x';
    const beside = (metres: number) =>
      alongX ? { x: at.x + metres, z: at.z } : { x: at.x, z: at.z + metres };
    // Mitten in der Öffnung geht es; am Pfosten nicht mehr.
    expect(walkable(round.house, [], beside(0), PLAYER_RADIUS)).toBe(true);
    expect(
      walkable(round.house, [], beside(DOOR_WIDTH / 2 - PLAYER_RADIUS - 0.02), PLAYER_RADIUS),
    ).toBe(true);
    expect(
      walkable(round.house, [], beside(DOOR_WIDTH / 2 - PLAYER_RADIUS + 0.02), PLAYER_RADIUS),
    ).toBe(false);
  });

  it('fährt die Türen der 2D-Runde mit der Türautomatik des Schiffs', () => {
    // Derselbe Kasten (1,8 m quer, 3,2 m vor der Tür) und derselbe Nachlauf
    // (1,2 s): Wer die Zahlen in `automaticDoors.ts` ändert, ändert beide.
    const round = new FlatRound(2, { test: true });
    const door = round.house.doors.find((one) => one.b !== null)!;
    const at = doorCentre(door);
    const alongX = doorAxis(door.dir) === 'x';
    const approach = (normal: number, cross = 0) =>
      alongX ? { x: at.x + cross, z: at.z + normal } : { x: at.x + normal, z: at.z + cross };
    const reference = new AutomaticDoors();
    const edge = { x: at.x, z: at.z, alongX };
    const stand = (spot: { x: number; z: number }, seconds: number): boolean => {
      round.player.x = spot.x;
      round.player.z = spot.z;
      let open = false;
      for (let t = 0; t < seconds; t += DT) {
        round.step(DT, { x: 0, z: 0, sprint: false });
        open = reference.step(door.id, edge, false, [spot], DT);
      }
      return open;
    };
    // Weit weg: zu. Im Kasten: auf. Quer daneben: zu. Danach der Nachlauf.
    expect(stand(approach(6), 0.5)).toBe(false);
    expect(round.doorOpen(door.id)).toBe(false);
    expect(stand(approach(3.0), 0.5)).toBe(true);
    expect(round.doorOpen(door.id)).toBe(true);
    expect(stand(approach(3.0, 2.6), 2)).toBe(false);
    expect(round.doorOpen(door.id)).toBe(false);
    expect(stand(approach(-2.5), 0.2)).toBe(true);
    expect(round.doorOpen(door.id)).toBe(true);
    // Weggegangen: erst nach dem Nachlauf zu, und in beiden Rechnungen im selben Bild.
    round.player.x = approach(6).x;
    round.player.z = approach(6).z;
    for (let t = 0; t < 2; t += DT) {
      round.step(DT, { x: 0, z: 0, sprint: false });
      const expected = reference.step(door.id, edge, false, [approach(6)], DT);
      expect(round.doorOpen(door.id)).toBe(expected);
    }
    expect(round.doorOpen(door.id)).toBe(false);
  });

  it('lässt Geduckte in 2D halb so schnell gehen — und deshalb leise', () => {
    const round = new FlatRound(2, { test: true });
    const from = { x: round.player.x, z: round.player.z };
    const walk = (crouch: boolean, sprint = false) => {
      round.player.x = from.x;
      round.player.z = from.z;
      const before = { x: round.player.x, z: round.player.z };
      round.step(DT, { x: 0, z: -1, sprint, crouch });
      return Math.hypot(round.player.x - before.x, round.player.z - before.z) / DT;
    };
    const upright = walk(false);
    const crouched = walk(true);
    expect(upright).toBeCloseTo(PLAYER_WALK_SPEED, 5);
    expect(crouched).toBeCloseTo(PLAYER_WALK_SPEED * CROUCH_FACTOR, 5);
    // Sprint hebt das Ducken auf, wie am Stock der Brille.
    expect(walk(true, true)).toBeCloseTo(PLAYER_SPRINT_SPEED, 5);
    // Die Lautstärke kommt aus dem Tempo allein: geduckt leise, gehend normal, rennend laut.
    expect(stepLoudness(crouched)).toBe(NOISE.sneak);
    expect(stepLoudness(upright)).toBe(NOISE.walk);
    expect(stepLoudness(PLAYER_SPRINT_SPEED)).toBe(NOISE.sprint);
    expect(stepLoudness(PLAYER_SPRINT_SPEED * 0.72)).toBe(NOISE.walk);
    expect(stepLoudness(0)).toBe(0);
  });

  it('nimmt den Blick der Brille, wenn einer mitkommt, und den Schritt des Körpers', () => {
    const round = new FlatRound(2, { test: true });
    round.step(DT, { x: 0, z: -1, sprint: false, yaw: 1.25 });
    expect(round.player.yaw).toBeCloseTo(1.25);
    // Ohne Blickangabe schaut er dorthin, wohin er geht.
    round.step(DT, { x: 0, z: -1, sprint: false });
    expect(round.player.yaw).toBeCloseTo(0);
    // Ein Schritt des Körpers versetzt ihn, ohne dass der Stock steht — und
    // nicht durch eine Wand: weit hinaus bleibt er, wo er ist.
    const before = { x: round.player.x, z: round.player.z };
    round.step(DT, { x: 0, z: 0, sprint: false, shift: { x: 0.3, z: 0 } });
    expect(round.player.x).toBeCloseTo(before.x + 0.3);
    round.step(DT, { x: 0, z: 0, sprint: false, shift: { x: 500, z: 0 } });
    expect(round.player.x).toBeCloseTo(before.x + 0.3);
  });

  it('gibt dem 2D-Techniker das Sichtfeld der Quest 3', () => {
    expect((BOT_FOV * 180) / Math.PI).toBeCloseTo(110);
  });

  it('gibt dem Gestell die Tempo-Regel der Runde für Tastatur, Stock und Brille', () => {
    const renderer = { xr: { isPresenting: false } } as unknown as THREE.WebGLRenderer;
    const rig = new PlayerRig(renderer, new THREE.PerspectiveCamera());
    // Ohne Regel gilt, was der Aufrufer mitbringt (`FlatControls.speed`).
    expect(rig.walkSpeed(true, 5.76)).toBe(5.76);
    let dash = 1;
    rig.pace = (sprint) => (sprint ? PLAYER_SPRINT_SPEED * dash : PLAYER_WALK_SPEED);
    expect(rig.walkSpeed(false, 3.2)).toBe(PLAYER_WALK_SPEED);
    expect(rig.walkSpeed(true, 5.76)).toBe(PLAYER_SPRINT_SPEED);
    dash = 0.72;
    expect(rig.walkSpeed(true, 5.76)).toBeCloseTo(PLAYER_SPRINT_SPEED * 0.72);
    // Wer am Schirm rennt, rennt für die Puste — auch ohne Stickklick der Brille.
    const input = { get: () => null } as unknown as Parameters<PlayerRig['update']>[1];
    rig.setIntent(new THREE.Vector3(1, 0, 0), false, true);
    rig.update(DT, input, false);
    expect(rig.sprinting).toBe(true);
    expect(rig.wishing).toBe(true);
    rig.update(DT, input, false);
    expect(rig.sprinting).toBe(false);
    expect(rig.wishing).toBe(false);
  });
});
