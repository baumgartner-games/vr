import { spacesOf, type HouseRoom } from '../house';
import { FlatRound, MONSTER_ID } from '../map/flatRound';
import { litRegions } from '../map/visibility';
import { CLOSE_SIGHT, monsterSight } from './monsterSight';

/**
 * **Die Augen des Monsters** (`monster/monsterSight.ts`) — die eine Rechnung,
 * mit der es in der 2D-Runde **und** im Headset sieht. Geprüft wird auf einer
 * echten Station, mit den Flächen aus `map/visibility.litRegions`, damit die
 * Fälle die sind, die im Spiel vorkommen: dunkel, beleuchtet, Rücken zu, Wand
 * dazwischen, Berührungsnähe.
 */

/**
 * Ein Raum, der in einer Richtung acht Meter misst — von der Mitte aus Platz
 * für drei Meter Abstand und noch einen Meter bis zur Wand — und **nicht die
 * Cafeteria**: Durch deren Fensterfront fällt
 * das Licht der Zentrale, und dort steht im Dunkeln niemand.
 */
function wideRoom(round: FlatRound): { room: HouseRoom; axis: 'x' | 'z' } {
  for (const room of spacesOf(round.house)) {
    if (room.id === round.house.entryRoom) continue;
    if (room.rect.w >= 8) return { room, axis: 'x' };
    if (room.rect.d >= 8) return { room, axis: 'z' };
  }
  throw new Error('kein breiter Raum');
}

function scene(seed = 1) {
  const round = new FlatRound(seed, { test: true });
  // Ohne Taschenlampe: Im Test hat der Techniker sie an, und ihr Kegel wäre Licht.
  round.torch = false;
  const { room, axis } = wideRoom(round);
  const centre = round.graph.centre(room.id);
  const monster = { x: centre.x, z: centre.z, yaw: 0 };
  const away = (metres: number) =>
    axis === 'x' ? { x: centre.x + metres, z: centre.z } : { x: centre.x, z: centre.z + metres };
  // Blick auf den Spieler: yaw 0 schaut nach -z, `atan2(-dx, -dz)` wie überall.
  const look = (to: { x: number; z: number }) =>
    Math.atan2(-(to.x - monster.x), -(to.z - monster.z));
  const snapshot = () => {
    round.step(0, { x: 0, z: 0, sprint: false });
    return round.snapshot();
  };
  return { round, room, monster, away, look, snapshot };
}

describe('Was das Monster sieht', () => {
  it('sieht auf Berührungsnähe auch im Dunkeln', () => {
    const { monster, away, look, snapshot } = scene();
    const player = away(CLOSE_SIGHT - 0.3);
    const snap = snapshot();
    const light = { lit: litRegions(snap), self: null };
    expect(light.lit.every((region) => region.lightId === 'command')).toBe(true);
    monster.yaw = look(player);
    const sight = monsterSight({
      snapshot: snap,
      light,
      monster,
      player,
      hidden: false,
      range: 14,
    });
    expect(sight.seen).toBe(true);
    expect(sight.lineOfSight).toBe(true);
    expect(sight.gap).toBeCloseTo(CLOSE_SIGHT - 0.3);
  });

  it('sieht drei Meter weit nur, wer im Licht steht — und dann auch nur im Kegel', () => {
    const { round, room, monster, away, look, snapshot } = scene();
    const player = away(3);
    const dark = snapshot();
    monster.yaw = look(player);
    const blind = monsterSight({
      snapshot: dark,
      light: { lit: litRegions(dark), self: null },
      monster,
      player,
      hidden: false,
      range: 14,
    });
    expect(blind.seen).toBe(false);
    expect(blind.lineOfSight).toBe(true);

    // Die Lampe des Raums an (`rules/lamps.ts` schaltet sie sonst; hier reicht der Stand).
    round.haunt.lit = [room.id];
    const bright = snapshot();
    const light = { lit: litRegions(bright), self: null };
    expect(
      monsterSight({ snapshot: bright, light, monster, player, hidden: false, range: 14 }).seen,
    ).toBe(true);
    // Rücken zu: nicht gesehen, obwohl hell und frei.
    monster.yaw = look(player) + Math.PI;
    const behind = monsterSight({
      snapshot: bright,
      light,
      monster,
      player,
      hidden: false,
      range: 14,
    });
    expect(behind.seen).toBe(false);
    expect(behind.lineOfSight).toBe(true);
    // Zu weit für die Sichtweite: nicht gesehen.
    monster.yaw = look(player);
    expect(
      monsterSight({ snapshot: bright, light, monster, player, hidden: false, range: 2.9 }).seen,
    ).toBe(false);
    // Im Schrank: nicht gesehen, die Linie bleibt.
    const hidden = monsterSight({
      snapshot: bright,
      light,
      monster,
      player,
      hidden: true,
      range: 14,
    });
    expect(hidden.seen).toBe(false);
    expect(hidden.lineOfSight).toBe(true);
  });

  it('sieht nicht durch eine Wand, auch wenn drüben Licht brennt', () => {
    const { round, monster, snapshot } = scene();
    // Der Spieler steht im Nachbarraum, jenseits einer Wand — nicht in einer Tür.
    const rooms = spacesOf(round.house);
    const here = round.graph.spaceAt(monster);
    const other = rooms.find((room) => room.id !== here)!;
    round.haunt.lit = [other.id];
    const player = round.graph.centre(other.id);
    const snap = snapshot();
    const light = { lit: litRegions(snap), self: null };
    monster.yaw = Math.atan2(-(player.x - monster.x), -(player.z - monster.z));
    const sight = monsterSight({
      snapshot: snap,
      light,
      monster,
      player,
      hidden: false,
      range: 40,
    });
    expect(sight.lineOfSight).toBe(false);
    expect(sight.seen).toBe(false);
  });

  it('ist die Rechnung, mit der die 2D-Runde ihr Monster sehen lässt', () => {
    // Die Runde meldet „Es hat dich gesehen." genau dann, wenn das Modul es
    // sagt: Der Spieler steht dem Monster drei Meter entfernt im Licht
    // gegenüber. Ein erster Schritt rechnet das Lichtfeld, das die Runde beim
    // nächsten Schritt liest (`lightOnly`); dann werden beide hingestellt.
    const round = new FlatRound(3);
    round.torch = false;
    const { room, axis } = wideRoom(round);
    round.haunt.lit = [room.id];
    round.step(1 / 30, { x: 0, z: 0, sprint: false });
    round.drain();
    const centre = round.graph.centre(room.id);
    const place = () => {
      round.monster.x = centre.x;
      round.monster.z = centre.z;
      round.monster.space = room.id;
      round.player.x = axis === 'x' ? centre.x + 3 : centre.x;
      round.player.z = axis === 'z' ? centre.z + 3 : centre.z;
      round.player.space = room.id;
      round.monster.yaw = Math.atan2(-(round.player.x - centre.x), -(round.player.z - centre.z));
    };
    place();
    const snap = round.snapshot();
    const monster = snap.entities.find((entity) => entity.id === MONSTER_ID)!;
    const sight = monsterSight({
      snapshot: snap,
      light: { lit: round.field.lit, self: null },
      monster: { x: round.monster.x, z: round.monster.z, yaw: round.monster.yaw },
      player: round.player,
      hidden: false,
      range: monster.sense!.range,
    });
    expect(sight.seen).toBe(true);
    round.step(1 / 30, { x: 0, z: 0, sprint: false });
    expect(round.drain().some((event) => event.text === 'Es hat dich gesehen.')).toBe(true);
    expect(round.threat.mode).toBe('hunt');
    // Ein Bild später steht er noch, wo er hingestellt wurde — drei Meter weg.
    expect(Math.hypot(round.player.x - centre.x, round.player.z - centre.z)).toBeLessThan(3.5);
  });
});
