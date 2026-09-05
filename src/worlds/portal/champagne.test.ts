import * as THREE from 'three';
import {
  BOTTLE_HEIGHT,
  CHAMPAGNE_GRIP,
  CORK_NAME,
  NECK_RADIUS,
  ShakeMeter,
  buildChampagne,
} from './champagne';

describe('die Sektflasche', () => {
  it('ist so hoch wie gebaut, mit der Mitte im Ursprung', () => {
    const { mesh } = buildChampagne();
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    expect(box.max.y).toBeCloseTo(BOTTLE_HEIGHT / 2, 6);
    expect(box.min.y).toBeCloseTo(-BOTTLE_HEIGHT / 2, 6);
  });

  it('trägt ihren Griff am Hals — dort, wo das Glas dünn ist', () => {
    const { mesh } = buildChampagne();
    const positions = mesh.geometry.getAttribute('position');
    // Der Halbmesser des Glases auf der Höhe des Griffs: der größte Abstand
    // eines Punkts dort von der Achse.
    let radius = 0;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      // Das gedrehte Profil hat nur an seinen Stützstellen Punkte; die
      // nächsten liegen gut drei Zentimeter über und unter der Griffmitte.
      if (Math.abs(y - CHAMPAGNE_GRIP.centre.y) > 0.04) continue;
      radius = Math.max(radius, Math.hypot(positions.getX(i), positions.getZ(i)));
    }
    expect(radius).toBeGreaterThan(0);
    expect(radius).toBeLessThanOrEqual(NECK_RADIUS + 0.004);
    expect(CHAMPAGNE_GRIP.axis.length()).toBeCloseTo(1, 6);
  });

  it('hat einen Korken mit Namen, oben an der Mündung', () => {
    const { mesh, cork } = buildChampagne();
    expect(mesh.getObjectByName(CORK_NAME)).toBe(cork);
    expect(cork.position.y).toBeGreaterThan(BOTTLE_HEIGHT / 2 - 0.02);
  });
});

describe('der Schüttelmesser', () => {
  const dt = 1 / 72;

  it('lässt eine getragene und eine geworfene Flasche in Ruhe', () => {
    const meter = new ShakeMeter();
    const steady = new THREE.Vector3(0.4, 0, 0.2);
    for (let i = 0; i < 72 * 5; i++) expect(meter.feed(steady, dt)).toBe(false);
    // Anfahren aus dem Stand zu einem schnellen Wurf: eine Richtung, kein Ruck.
    const thrower = new ShakeMeter();
    for (let i = 0; i < 20; i++) {
      expect(thrower.feed(new THREE.Vector3(0, 0, -i * 0.4), dt)).toBe(false);
    }
    expect(thrower.charge).toBe(0);
  });

  it('knallt nach ein paar Rucken hin und her — und genau einmal', () => {
    const meter = new ShakeMeter();
    let popped = 0;
    let frames = 0;
    // Acht Wechsel je Sekunde, gut zwei Meter je Sekunde: geschüttelt.
    for (let i = 0; i < 72 * 3; i++) {
      const phase = Math.floor(i / 9) % 2 === 0 ? 1 : -1;
      if (meter.feed(new THREE.Vector3(0, phase * 2.2, 0), dt)) {
        popped++;
        frames = i;
      }
    }
    expect(popped).toBe(1);
    expect(frames).toBeLessThan(72 * 1.5);
  });

  it('vergisst, was lange her ist: ein Ruck alle paar Sekunden knallt nie', () => {
    const meter = new ShakeMeter();
    for (let i = 0; i < 72 * 30; i++) {
      const phase = Math.floor(i / 180) % 2 === 0 ? 1 : -1;
      expect(meter.feed(new THREE.Vector3(0, phase * 2.2, 0), dt)).toBe(false);
    }
  });
});
