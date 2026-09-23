import * as THREE from 'three';
import {
  CRANE_BOB,
  CRANE_CLAWS,
  CRANE_HEIGHT,
  buildCrane,
  cranePose,
  disposeCrane,
  isCrane,
  screenTopDown,
} from './crane';
import { GAME_MODES } from './gameMode';

describe('crane', () => {
  it('ist der Kran in Einrichten und Baukasten, nicht beim Spielen', () => {
    expect(GAME_MODES.map(isCrane)).toEqual([false, true, true]);
  });

  it('zeigt am Schirm von oben, solange man der Kran ist — die eigene Wahl sonst', () => {
    expect(screenTopDown('3d', 'play')).toBe(false);
    expect(screenTopDown('2d', 'play')).toBe(true);
    expect(screenTopDown('3d', 'arrange')).toBe(true);
    expect(screenTopDown('3d', 'creative')).toBe(true);
    expect(screenTopDown('2d', 'creative')).toBe(true);
  });

  it('schwebt über dem Kopf in fester Höhe, egal wie hoch der Kopf ist', () => {
    for (const time of [0, 0.4, 1.7, 12]) {
      const pose = cranePose(1.5, -2, time);
      expect(pose.x).toBe(1.5);
      expect(pose.z).toBe(-2);
      expect(Math.abs(pose.y - CRANE_HEIGHT)).toBeLessThanOrEqual(CRANE_BOB + 1e-9);
      expect(pose.yaw).toBeGreaterThanOrEqual(0);
      expect(pose.yaw).toBeLessThan(Math.PI * 2);
    }
  });

  it('hat kein Vorn: drei Klauen im Drittelkreis', () => {
    const crane = buildCrane();
    const arms = crane.children.filter((child) => child.type === 'Group');
    expect(arms).toHaveLength(CRANE_CLAWS);
    const turns = arms.map((arm) => arm.rotation.y).sort((a, b) => a - b);
    for (let i = 1; i < turns.length; i++) {
      expect(turns[i]! - turns[i - 1]!).toBeCloseTo((Math.PI * 2) / CRANE_CLAWS);
    }
  });

  it('hängt mit allem unter dem Gehäuse und gibt beim Wegräumen alles frei', () => {
    const crane = buildCrane();
    const parent = new THREE.Group();
    parent.add(crane);
    const box = new THREE.Box3().setFromObject(crane);
    expect(box.max.y).toBeLessThan(0.3);
    expect(box.min.y).toBeLessThan(-0.6);
    let disposed = 0;
    crane.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.addEventListener('dispose', () => disposed++);
    });
    disposeCrane(crane);
    expect(disposed).toBeGreaterThan(0);
    expect(crane.parent).toBeNull();
  });
});
