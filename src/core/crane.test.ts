import * as THREE from 'three';
import {
  CRANE_CLAW_DROP,
  CRANE_MARK_RADIUS,
  CRANE_TOUCH,
  buildCraneMark,
  craneCarryY,
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
import { screenCarryPoint } from './screenCarry';
import { pickUsable } from './usable';

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

describe('crane carry and mark', () => {
  it('hängt das Getragene mit der Oberkante an die Klauen — und nie in den Boden', () => {
    expect(craneCarryY(0.2) + 0.2).toBeCloseTo(CRANE_HEIGHT - CRANE_CLAW_DROP);
    expect(craneCarryY(3) - 3).toBeGreaterThan(0);
  });

  it('trägt genau unter dem Kran — ohne Vorn kein „vor der Figur"', () => {
    const at = screenCarryPoint('crane', { radius: 0.4, half: 0.3 }, 1.6);
    expect(at.x).toBe(0);
    expect(at.z).toBe(0);
    expect(at.y).toBeCloseTo(craneCarryY(0.3));
  });

  it('meint nur, worüber er schwebt', () => {
    const at = new THREE.Vector3(0, 0, 0);
    const still = new THREE.Vector3(0, 0, 0);
    const near = {
      usable: { use: () => true },
      position: new THREE.Vector3(0.3, 0, 0),
      radius: 0.4,
    };
    const beside = {
      usable: { use: () => true },
      position: new THREE.Vector3(1, 0, 0),
      radius: 0.4,
    };
    expect(pickUsable([beside], at, still, 0, CRANE_TOUCH)).toBeNull();
    expect(pickUsable([beside, near], at, still, 0, CRANE_TOUCH)?.candidate).toBe(near);
  });

  it('legt den Kreis flach auf den Boden, ohne Strahl und über allem', () => {
    const mark = buildCraneMark();
    const flats = mark.children as THREE.Mesh[];
    expect(flats.length).toBeGreaterThan(0);
    const hits: THREE.Intersection[] = [];
    for (const flat of flats) {
      expect(flat.rotation.x).toBeCloseTo(-Math.PI / 2);
      expect((flat.material as THREE.Material).depthTest).toBe(false);
      flat.raycast(new THREE.Raycaster(), hits);
    }
    expect(hits).toHaveLength(0);
    const box = new THREE.Box3().setFromObject(mark);
    expect(box.max.x).toBeCloseTo(CRANE_MARK_RADIUS);
    disposeCrane(mark);
  });
});
