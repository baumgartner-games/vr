import { forwardOfYaw, newWalkFrame, turnWalkFrame, walkYaw, yawOfForward } from './walkFrame';

/**
 * Die Laufrichtung ist eine der Sachen, die man in der Brille zwar sofort
 * *merkt*, aber nur schwer nachmisst: Man geht schief und weiß nicht, ob es an
 * der Rechnung liegt oder am eigenen Kopf. Hier steht sie in Winkeln da.
 */
describe('walkYaw', () => {
  it('folgt dem Kopf, solange nichts gemerkt wird', () => {
    const frame = newWalkFrame();
    expect(walkYaw(frame, 'head', 0.3, true)).toBeCloseTo(0.3);
    expect(walkYaw(frame, 'head', 1.1, true)).toBeCloseTo(1.1);
    expect(frame.yaw).toBeNull();
  });

  it('merkt sich die Richtung beim Loslaufen und hält sie fest', () => {
    const frame = newWalkFrame();
    expect(walkYaw(frame, 'start', 0.3, true)).toBeCloseTo(0.3);
    // Der Kopf dreht sich weit weg — der Weg bleibt.
    expect(walkYaw(frame, 'start', 2.5, true)).toBeCloseTo(0.3);
    expect(walkYaw(frame, 'start', -2.5, true)).toBeCloseTo(0.3);
  });

  it('vergisst sie beim Loslassen und merkt sich die nächste neu', () => {
    const frame = newWalkFrame();
    walkYaw(frame, 'start', 0.3, true);
    expect(walkYaw(frame, 'start', 2.5, false)).toBeCloseTo(2.5);
    expect(frame.yaw).toBeNull();
    expect(walkYaw(frame, 'start', 2.5, true)).toBeCloseTo(2.5);
  });

  it('vergisst sie auch, wenn zurück auf Blickrichtung gestellt wird', () => {
    const frame = newWalkFrame();
    walkYaw(frame, 'start', 0.3, true);
    expect(walkYaw(frame, 'head', 2.5, true)).toBeCloseTo(2.5);
    expect(frame.yaw).toBeNull();
  });

  it('null ist eine gemerkte Richtung wie jede andere', () => {
    const frame = newWalkFrame();
    // Nach Norden loszulaufen darf nicht heißen, dass nichts gemerkt wurde.
    expect(walkYaw(frame, 'start', 0, true)).toBe(0);
    expect(walkYaw(frame, 'start', 1.4, true)).toBe(0);
  });
});

describe('turnWalkFrame', () => {
  it('dreht die gemerkte Richtung mit dem Snap-Turn mit', () => {
    const frame = newWalkFrame();
    walkYaw(frame, 'start', 0, true);
    turnWalkFrame(frame, Math.PI / 6);
    expect(walkYaw(frame, 'start', 0, true)).toBeCloseTo(Math.PI / 6);
  });

  it('dreht nichts, wenn nichts gemerkt ist', () => {
    const frame = newWalkFrame();
    turnWalkFrame(frame, Math.PI / 6);
    expect(frame.yaw).toBeNull();
  });
});

describe('yawOfForward', () => {
  it('ist die Umkehrung von forwardOfYaw', () => {
    for (const yaw of [0, 0.7, -1.2, Math.PI / 2, -Math.PI / 2]) {
      const ahead = forwardOfYaw(yaw);
      expect(yawOfForward(ahead.x, ahead.z)).toBeCloseTo(yaw);
    }
  });

  it('legt „vorn“ auf −Z, wie Three.js es tut', () => {
    expect(yawOfForward(0, -1)).toBeCloseTo(0);
    const ahead = forwardOfYaw(0);
    expect(ahead.x).toBeCloseTo(0);
    expect(ahead.z).toBeCloseTo(-1);
  });

  it('dreht eine Vierteldrehung nach links auf −X', () => {
    // Positiver Yaw dreht in Three.js gegen den Uhrzeigersinn von oben.
    const ahead = forwardOfYaw(Math.PI / 2);
    expect(ahead.x).toBeCloseTo(-1);
    expect(ahead.z).toBeCloseTo(0);
  });
});
