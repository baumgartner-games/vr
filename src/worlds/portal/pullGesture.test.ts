/**
 * Das Zucken, nachgerechnet: was zählt als Zug zum Körper, und was nicht.
 *
 * Die Zahlen sind die eines echten Arms — eine Hand einen halben Meter vor dem
 * Kopf, ein Ruck von gut zehn Zentimetern in gut einer Zehntelsekunde — damit
 * die Schwelle an einer Bewegung geprüft wird und nicht an einem Ideal.
 */

import { PULL_GAP, PullMeter, pullTension, pullTriggered } from './pullGesture';

const HEAD = { x: 0, y: 1.6, z: 0 };
const FRAME = 1 / 90;

/** Die Hand von `from` nach `to` ziehen, Bild für Bild — das schnellste Tempo. */
function drag(
  meter: PullMeter,
  from: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  seconds: number,
  head = HEAD,
): number {
  const steps = Math.max(1, Math.round(seconds / FRAME));
  let fastest = 0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const at = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      z: from.z + (to.z - from.z) * t,
    };
    fastest = Math.max(fastest, meter.feed(at, head, FRAME));
  }
  return fastest;
}

describe('das Zucken zum Körper', () => {
  it('misst nichts im ersten Bild — da gibt es noch kein Vorher', () => {
    const meter = new PullMeter();
    expect(meter.feed({ x: 0, y: 1.4, z: -0.5 }, HEAD, FRAME)).toBe(0);
  });

  it('zählt einen kräftigen Ruck zum Kopf über 8 m/s', () => {
    const meter = new PullMeter();
    meter.feed({ x: 0, y: 1.4, z: -0.6 }, HEAD, FRAME);
    // Ein halber Meter in einer Zwanzigstelsekunde: genau das macht eine Hand,
    // die etwas zu sich reißt. Der Abstand zum Kopf schrumpft dabei um gut 40
    // cm, und das sind über 8 m/s.
    const fastest = drag(meter, { x: 0, y: 1.4, z: -0.6 }, { x: 0, y: 1.4, z: -0.1 }, 0.05);
    expect(fastest).toBeGreaterThan(8);
  });

  it('lässt eine ruhige Handbewegung darunter', () => {
    const meter = new PullMeter();
    meter.feed({ x: 0, y: 1.4, z: -0.6 }, HEAD, FRAME);
    // Denselben halben Meter, aber in einer Sekunde: das ist ein Arm, der
    // etwas heranholt, und kein Zucken.
    const fastest = drag(meter, { x: 0, y: 1.4, z: -0.6 }, { x: 0, y: 1.4, z: -0.1 }, 1);
    expect(fastest).toBeLessThan(1);
  });

  it('zählt eine Hand, die sich quer bewegt, nicht', () => {
    const meter = new PullMeter();
    meter.feed({ x: -0.3, y: 1.4, z: -0.5 }, HEAD, FRAME);
    // Quer vor dem Körper her, auf einem Kreisbogen um den Kopf: schnell, aber
    // der Abstand bleibt — also kein Zug.
    const radius = Math.hypot(0.3, 0.2, 0.5);
    let fastest = 0;
    for (let i = 1; i <= 20; i++) {
      const angle = -0.6 + (i / 20) * 1.2;
      const at = {
        x: Math.sin(angle) * radius,
        y: HEAD.y,
        z: -Math.cos(angle) * radius,
      };
      fastest = Math.max(fastest, meter.feed(at, HEAD, FRAME));
    }
    expect(Math.abs(fastest)).toBeLessThan(0.5);
  });

  it('zählt das Gehen nicht: Hand und Körper wandern zusammen', () => {
    const meter = new PullMeter();
    let head = { ...HEAD };
    let hand = { x: 0, y: 1.4, z: -0.5 };
    meter.feed(hand, head, FRAME);
    let fastest = 0;
    for (let i = 0; i < 40; i++) {
      // Zwei Meter je Sekunde vorwärts, die Hand mit derselben Fahrt.
      head = { ...head, z: head.z - 2 * FRAME };
      hand = { ...hand, z: hand.z - 2 * FRAME };
      fastest = Math.max(fastest, meter.feed(hand, head, FRAME));
    }
    expect(Math.abs(fastest)).toBeLessThan(0.01);
  });

  it('zählt eine Hand, die weggeht, negativ', () => {
    const meter = new PullMeter();
    meter.feed({ x: 0, y: 1.4, z: -0.2 }, HEAD, FRAME);
    const away = drag(meter, { x: 0, y: 1.4, z: -0.2 }, { x: 0, y: 1.4, z: -0.7 }, 0.05);
    expect(away).toBeLessThanOrEqual(0);
    expect(meter.current).toBeLessThan(-1);
  });

  it('fängt nach einer Pause von vorn an', () => {
    const meter = new PullMeter();
    meter.feed({ x: 0, y: 1.4, z: -0.6 }, HEAD, FRAME);
    // Ein Ruckler: dazwischen liegt eine halbe Sekunde, und was in ihr
    // geschehen ist, weiß niemand. Also kein Zug daraus.
    expect(meter.feed({ x: 0, y: 1.4, z: -0.1 }, HEAD, PULL_GAP + 0.1)).toBe(0);
  });

  it('vergisst alles beim Zurücksetzen', () => {
    const meter = new PullMeter();
    meter.feed({ x: 0, y: 1.4, z: -0.6 }, HEAD, FRAME);
    meter.feed({ x: 0, y: 1.4, z: -0.5 }, HEAD, FRAME);
    expect(meter.current).toBeGreaterThan(0);
    meter.reset();
    expect(meter.current).toBe(0);
    expect(meter.feed({ x: 0, y: 1.4, z: -0.4 }, HEAD, FRAME)).toBe(0);
  });
});

describe('die Spannung des Strahls', () => {
  it('läuft von 0 bis 1 zur Schwelle hin', () => {
    expect(pullTension(0, 8)).toBe(0);
    expect(pullTension(4, 8)).toBeCloseTo(0.5, 6);
    expect(pullTension(12, 8)).toBe(1);
    expect(pullTension(-3, 8)).toBe(0);
  });

  it('steht ohne Schwelle sofort straff', () => {
    expect(pullTension(0, 0)).toBe(1);
    expect(pullTriggered(0, 0)).toBe(true);
  });

  it('löst erst über der Schwelle aus', () => {
    expect(pullTriggered(7.9, 8)).toBe(false);
    expect(pullTriggered(8, 8)).toBe(true);
  });
});
