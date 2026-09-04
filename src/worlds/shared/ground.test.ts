/**
 * Der Boden, auf dem jede Welt steht — in genau der einen Zahl, die ihn
 * kaputtgemacht hat.
 *
 * Er war eine `PlaneGeometry`, also ein Ding ohne Dicke, und der Collider
 * dazu kam aus der Bounding-Box: aus null wurde ein Zentimeter, das Minimum.
 * Ein Zentimeter ist dünner als die Haut des Character-Controllers, also
 * steckte die Kapsel dauernd halb im Boden — und wer eine Durchdringung
 * auflösen muss, bewegt sich in dieser Frame nicht. In der Brille sah das aus
 * wie ein Spieler, der beim Gehen stockt, und niemand sucht das im Boden.
 *
 * Genau deshalb steht es hier: die Zahl ist unsichtbar, ihr Fehler war es
 * nicht, und ein Test ist der einzige Ort, an dem so etwas auffällt, bevor es
 * jemand in der Brille merkt.
 */
import { CHARACTER_SKIN } from '../../physics/PhysicsLocomotion';
import { GROUND_THICKNESS, GROUND_TOP, WORLD_RADIUS } from './environment';

describe('die Bodenplatte', () => {
  it('ist deutlich dicker als die Haut der Spielerkapsel', () => {
    // Nicht knapp darüber: die Auflösung arbeitet mit Toleranzen, und eine
    // Platte, die gerade so reicht, reicht beim nächsten Zahlendreher nicht.
    expect(GROUND_THICKNESS).toBeGreaterThan(CHARACTER_SKIN * 10);
  });

  it('liegt unter der Null, aber nur eine Handbreit', () => {
    // Darüber flimmert sie gegen die gebauten Böden der Welten, weiter darunter
    // wird aus dem Übergang eine Stufe.
    expect(GROUND_TOP).toBeLessThan(0);
    expect(GROUND_TOP).toBeGreaterThan(-0.2);
  });

  it('reicht weiter, als die Kamera sieht', () => {
    expect(WORLD_RADIUS).toBeGreaterThan(100);
  });
});
