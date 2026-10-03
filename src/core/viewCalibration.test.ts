import * as THREE from 'three';
import { CALIBRATION_HAT, IMMERSIVE_HAT, MODEL_HATS, isImmersiveHat } from './figureParts';
import { WARDROBE_HATS } from './headgear';
import {
  ORDER,
  STEPS,
  STEP_COLORS,
  calibrationLines,
  disposeCalibration,
  onSphere,
  viewCalibration,
} from './viewCalibration';
import { PANEL_ORDER } from '../ui/XRMenu';
import { FOG_ORDER } from './selfHelmet';

describe('der Kalibrier-Helm', () => {
  it('steht im Kleiderschrank und ist ein immersiver Helm', () => {
    expect(WARDROBE_HATS).toContain(CALIBRATION_HAT);
    expect(isImmersiveHat(CALIBRATION_HAT)).toBe(true);
    expect(isImmersiveHat(IMMERSIVE_HAT)).toBe(true);
    expect(isImmersiveHat('flightHelmet')).toBe(false);
    // Für die anderen derselbe Helm wie der immersive.
    expect(MODEL_HATS[CALIBRATION_HAT].file).toBe(MODEL_HATS[IMMERSIVE_HAT].file);
  });

  it('hat je Stufe eine eigene Farbe, links wie rechts, oben wie unten', () => {
    expect(new Set(STEP_COLORS).size).toBe(STEPS.length);
    const lines = calibrationLines();
    for (const step of [10, 30, 60]) {
      const left = lines.find((line) => line.kind === 'vertical' && line.angle === -step)!;
      const right = lines.find((line) => line.kind === 'vertical' && line.angle === step)!;
      const up = lines.find((line) => line.kind === 'horizontal' && line.angle === step)!;
      expect(left.color).toBe(right.color);
      expect(up.color).toBe(right.color);
      expect(left.label).toBe(`←${step}°`);
      expect(right.label).toBe(`${step}°→`);
      expect(up.label).toBe(`↑${step}°`);
    }
  });

  it('legt die Linien in den richtigen Winkel vor das Auge', () => {
    const ahead = onSphere(0, 0);
    expect(ahead.z).toBeCloseTo(-1);
    const right = onSphere(30, 0);
    expect(Math.atan2(right.x, -right.z) * (180 / Math.PI)).toBeCloseTo(30);
    const up = onSphere(0, 20);
    expect(Math.asin(up.y) * (180 / Math.PI)).toBeCloseTo(20);
  });

  it('zeichnet über Glas und Beschlag, unter dem Menü, ohne Tiefe', () => {
    expect(ORDER).toBeGreaterThan(FOG_ORDER);
    expect(ORDER).toBeLessThan(PANEL_ORDER);
    const group = viewCalibration();
    let meshes = 0;
    group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      meshes++;
      expect(mesh.renderOrder).toBe(ORDER);
      expect((mesh.material as THREE.Material).depthTest).toBe(false);
    });
    expect(meshes).toBe(calibrationLines().length);
    disposeCalibration(group);
  });
});
