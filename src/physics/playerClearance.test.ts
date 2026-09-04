import { CLEARANCE_MARGIN, capsuleOverlap, clearOfPlayer } from './playerClearance';

/** Eine stehende Spielerkapsel: Mitte auf 0,9 m, 0,6 m halbe Achse, 24 cm dick. */
const PLAYER = { x: 0, y: 0.9, z: 0, halfHeight: 0.6, radius: 0.24 };

describe('Steckt es im Spieler?', () => {
  it('erkennt eine Kugel mitten in der Brust', () => {
    // Genau das ist der Fall aus dem Beutel: die Hand ist vor dem Körper, das
    // Ding erscheint dort, und beim Loslassen liegt es in der Kapsel.
    expect(capsuleOverlap(PLAYER, { x: 0, y: 1.2, z: 0 }, 0.09)).toBeCloseTo(0.33, 6);
    expect(clearOfPlayer(PLAYER, { x: 0, y: 1.2, z: 0 }, 0.09)).toBe(false);
  });

  it('lässt etwas eine Armlänge vor dem Körper in Ruhe', () => {
    expect(clearOfPlayer(PLAYER, { x: 0, y: 1.2, z: -0.6 }, 0.09)).toBe(true);
  });

  it('rechnet die Kugelkappen mit', () => {
    // Über dem Kopf und unter den Füßen ist die Kapsel rund, nicht abgeschnitten:
    // 0,9 + 0,6 = 1,5 m ist das Ende der Achse, darüber kommen 24 cm Kappe.
    expect(capsuleOverlap(PLAYER, { x: 0, y: 1.5 + 0.24, z: 0 }, 0)).toBeCloseTo(0, 6);
    expect(clearOfPlayer(PLAYER, { x: 0, y: 1.5 + 0.3, z: 0 }, 0)).toBe(true);
    expect(clearOfPlayer(PLAYER, { x: 0, y: 1.5 + 0.2, z: 0 }, 0)).toBe(false);
    // Und quer dazu ist sie überall gleich dick.
    expect(capsuleOverlap(PLAYER, { x: 0.24, y: 0.9, z: 0 }, 0)).toBeCloseTo(0, 6);
    expect(capsuleOverlap(PLAYER, { x: 0.24, y: 1.4, z: 0 }, 0)).toBeCloseTo(0, 6);
  });

  it('nimmt den Radius des Dings mit', () => {
    const point = { x: 0.4, y: 1.2, z: 0 };
    // Eine kleine Kugel ist dort schon draußen, eine große noch nicht.
    expect(clearOfPlayer(PLAYER, point, 0.05)).toBe(true);
    expect(clearOfPlayer(PLAYER, point, 0.2)).toBe(false);
  });

  it('verlangt einen Zentimeter Luft, damit der Zustand nicht flackert', () => {
    // Genau an der Berührung ist es noch nicht frei — sonst würde es fest,
    // vom Kontakt zurückgestoßen, wieder weich, und das dreißigmal je Sekunde.
    const touching = { x: 0.24 + 0.09, y: 1.2, z: 0 };
    expect(capsuleOverlap(PLAYER, touching, 0.09)).toBeCloseTo(0, 6);
    expect(clearOfPlayer(PLAYER, touching, 0.09)).toBe(false);
    const clear = { x: 0.24 + 0.09 + CLEARANCE_MARGIN + 0.001, y: 1.2, z: 0 };
    expect(clearOfPlayer(PLAYER, clear, 0.09)).toBe(true);
  });

  it('überlebt eine Kapsel ohne Länge', () => {
    // Ein sehr kleiner Spieler ist eine Kugel, keine Fehlerquelle.
    const ball = { x: 0, y: 1, z: 0, halfHeight: 0, radius: 0.24 };
    expect(capsuleOverlap(ball, { x: 0, y: 1, z: 0 }, 0)).toBeCloseTo(0.24, 6);
    expect(clearOfPlayer(ball, { x: 0, y: 1.4, z: 0 }, 0)).toBe(true);
  });
});
