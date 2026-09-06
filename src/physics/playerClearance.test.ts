import {
  CLEARANCE_MARGIN,
  type PlayerBody,
  bodyOverlap,
  capsuleOverlap,
  clearOfPlayer,
  handOverlap,
} from './playerClearance';

/** Eine stehende Spielerkapsel: Mitte auf 0,9 m, 0,6 m halbe Achse, 24 cm dick. */
const PLAYER = { x: 0, y: 0.9, z: 0, halfHeight: 0.6, radius: 0.24 };

/** Nur der Rumpf, keine Hände — der Stand vor der Sonde an der Fingerspitze. */
const TORSO: PlayerBody = { capsule: PLAYER, hands: [] };

describe('Steckt es im Spieler?', () => {
  it('erkennt eine Kugel mitten in der Brust', () => {
    // Genau das ist der Fall aus dem Beutel: die Hand ist vor dem Körper, das
    // Ding erscheint dort, und beim Loslassen liegt es in der Kapsel.
    expect(capsuleOverlap(PLAYER, { x: 0, y: 1.2, z: 0 }, 0.09)).toBeCloseTo(0.33, 6);
    expect(clearOfPlayer(TORSO, { x: 0, y: 1.2, z: 0 }, 0.09)).toBe(false);
  });

  it('lässt etwas eine Armlänge vor dem Körper in Ruhe', () => {
    expect(clearOfPlayer(TORSO, { x: 0, y: 1.2, z: -0.6 }, 0.09)).toBe(true);
  });

  it('rechnet die Kugelkappen mit', () => {
    // Über dem Kopf und unter den Füßen ist die Kapsel rund, nicht abgeschnitten:
    // 0,9 + 0,6 = 1,5 m ist das Ende der Achse, darüber kommen 24 cm Kappe.
    expect(capsuleOverlap(PLAYER, { x: 0, y: 1.5 + 0.24, z: 0 }, 0)).toBeCloseTo(0, 6);
    expect(clearOfPlayer(TORSO, { x: 0, y: 1.5 + 0.3, z: 0 }, 0)).toBe(true);
    expect(clearOfPlayer(TORSO, { x: 0, y: 1.5 + 0.2, z: 0 }, 0)).toBe(false);
    // Und quer dazu ist sie überall gleich dick.
    expect(capsuleOverlap(PLAYER, { x: 0.24, y: 0.9, z: 0 }, 0)).toBeCloseTo(0, 6);
    expect(capsuleOverlap(PLAYER, { x: 0.24, y: 1.4, z: 0 }, 0)).toBeCloseTo(0, 6);
  });

  it('nimmt den Radius des Dings mit', () => {
    const point = { x: 0.4, y: 1.2, z: 0 };
    // Eine kleine Kugel ist dort schon draußen, eine große noch nicht.
    expect(clearOfPlayer(TORSO, point, 0.05)).toBe(true);
    expect(clearOfPlayer(TORSO, point, 0.2)).toBe(false);
  });

  it('verlangt einen Zentimeter Luft, damit der Zustand nicht flackert', () => {
    // Genau an der Berührung ist es noch nicht frei — sonst würde es fest,
    // vom Kontakt zurückgestoßen, wieder weich, und das dreißigmal je Sekunde.
    const touching = { x: 0.24 + 0.09, y: 1.2, z: 0 };
    expect(capsuleOverlap(PLAYER, touching, 0.09)).toBeCloseTo(0, 6);
    expect(clearOfPlayer(TORSO, touching, 0.09)).toBe(false);
    const clear = { x: 0.24 + 0.09 + CLEARANCE_MARGIN + 0.001, y: 1.2, z: 0 };
    expect(clearOfPlayer(TORSO, clear, 0.09)).toBe(true);
  });

  it('überlebt eine Kapsel ohne Länge', () => {
    // Ein sehr kleiner Spieler ist eine Kugel, keine Fehlerquelle.
    const ball = { x: 0, y: 1, z: 0, halfHeight: 0, radius: 0.24 };
    expect(capsuleOverlap(ball, { x: 0, y: 1, z: 0 }, 0)).toBeCloseTo(0.24, 6);
    expect(clearOfPlayer({ capsule: ball, hands: [] }, { x: 0, y: 1.4, z: 0 }, 0)).toBe(true);
  });
});

describe('Steckt es in der Hand?', () => {
  /** Der ausgestreckte Arm: weit außerhalb der Kapsel, mitten in der Faust. */
  const hand = { x: 0.55, y: 1.2, z: -0.4, radius: 0.028 };
  const player: PlayerBody = { capsule: PLAYER, hands: [hand] };
  const dropped = { x: 0.55, y: 1.2, z: -0.4 };

  it('erkennt den fallengelassenen Gegenstand in der Faust', () => {
    // Der Fall, um den es geht: der Rumpf ist längst geräumt, die Hand nicht —
    // und die Sonde darin ist es, die den Gegenstand wegschießt.
    expect(clearOfPlayer(TORSO, dropped, 0.09)).toBe(true);
    expect(handOverlap(hand, dropped, 0.09)).toBeCloseTo(0.118, 6);
    expect(clearOfPlayer(player, dropped, 0.09)).toBe(false);
  });

  it('lässt los, sobald das Ding aus der Hand heraus ist', () => {
    // Eine Handbreit tiefer gefallen, und die Faust hat es nicht mehr.
    expect(clearOfPlayer(player, { x: 0.55, y: 1.0, z: -0.4 }, 0.09)).toBe(true);
  });

  it('nimmt die tiefere der beiden Hände', () => {
    const far = { x: -0.55, y: 1.2, z: -0.4, radius: 0.028 };
    const both: PlayerBody = { capsule: null, hands: [far, hand] };
    expect(bodyOverlap(both, dropped, 0.09)).toBeCloseTo(handOverlap(hand, dropped, 0.09), 6);
    expect(clearOfPlayer(both, dropped, 0.09)).toBe(false);
  });

  it('macht aus einem Spieler ohne Kapsel und ohne Hände keinen Käfig', () => {
    // Der Zuschauer und die Vorschau: es gibt niemanden, in dem etwas stecken
    // könnte, also steckt auch nichts fest.
    const nobody: PlayerBody = { capsule: null, hands: [] };
    expect(bodyOverlap(nobody, dropped, 0.09)).toBe(-Infinity);
    expect(clearOfPlayer(nobody, dropped, 0.09)).toBe(true);
  });
});
