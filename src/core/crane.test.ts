import * as THREE from 'three';
import {
  CRANE_MODELS,
  dressCrane,
  type CraneLoader,
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
  CRANE_MAX_SPEED,
  CRANE_PAN,
  cranePan,
  craneEighth,
  craneQuarter,
  craneTurn,
  craneVelocity,
  disposeCrane,
  isCrane,
  screenTopDown,
} from './crane';
import { GAME_MODES } from './gameMode';
import { screenCarryPoint } from './screenCarry';
import { pickUsable } from './usable';

describe('crane', () => {
  it('fährt die Kamera schneller, je weiter sie weg ist', () => {
    const near = cranePan(0, -1, 5, false, 1);
    const far = cranePan(0, -1, 30, false, 1);
    expect(near.z).toBeCloseTo(-5 * CRANE_PAN, 9);
    expect(far.z).toBeCloseTo(-30 * CRANE_PAN, 9);
    expect(cranePan(0, -1, 5, true, 1).z).toBeCloseTo(2 * near.z, 9);
    // Schräg ist nicht schneller als gerade.
    const diagonal = cranePan(1, 1, 5, false, 1);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(5 * CRANE_PAN, 9);
    expect(cranePan(0, 0, 5, false, 1)).toEqual({ x: 0, z: 0 });
  });

  it('dreht mit R um ein Achtel im Uhrzeigersinn, mit Shift zurück', () => {
    const eighth = Math.PI / 4;
    expect(craneTurn(0, true)).toBeCloseTo(-eighth, 9);
    expect(craneTurn(0, false)).toBeCloseTo(eighth, 9);
    // Acht Drehungen sind eine ganze — und aus einem schiefen Winkel wird
    // zuerst ein gerader.
    let yaw = 0.1;
    for (let i = 0; i < 8; i++) yaw = craneTurn(yaw, true);
    expect(yaw).toBeCloseTo(0, 9);
    expect(craneEighth(0.7)).toBeCloseTo(eighth, 9);
    expect(craneQuarter(1.4)).toBeCloseTo(Math.PI / 2, 9);
    expect(craneQuarter(Number.NaN)).toBe(0);
  });

  it('zieht den Kran zum Zeiger, ohne darüber hinauszuschießen', () => {
    const dt = 1 / 60;
    let x = 0;
    for (let i = 0; i < 60; i++) x += craneVelocity(x, 0, 2, 0, dt).x * dt;
    expect(x).toBeGreaterThan(1.99);
    expect(x).toBeLessThanOrEqual(2);
    const far = craneVelocity(0, 0, 1000, 0, dt);
    expect(far.x).toBeCloseTo(CRANE_MAX_SPEED, 9);
    expect(craneVelocity(0, 0, 1, 1, 0)).toEqual({ x: 0, z: 0 });
  });

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

describe('dressCrane', () => {
  /** Ein Ersatz für eine Regalkopie: ein Kasten unter einem geteilten Halter. */
  function fake(w: number, h: number, bottom: number): THREE.Object3D {
    const holder = new THREE.Group();
    holder.userData.sharedAssets = true;
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshBasicMaterial());
    box.position.y = bottom + h / 2;
    holder.add(box);
    return holder;
  }
  const sizes: Record<string, [number, number, number]> = {
    [CRANE_MODELS.top]: [1.5, 0.65, 0],
    [CRANE_MODELS.chain]: [0.15, 0.94, -0.94],
    [CRANE_MODELS.hook]: [0.12, 0.27, -0.22],
  };
  const load: CraneLoader = (path) => {
    const size = sizes[path];
    return Promise.resolve(size ? fake(...size) : null);
  };

  it('tauscht den gebauten Kran gegen Dropship, Kette und Haken', async () => {
    const crane = buildCrane();
    new THREE.Group().add(crane);
    expect(await dressCrane(crane, load)).toBe(true);
    expect(crane.children.map((child) => child.name)).toEqual(['crane-dressed']);
    const [top, hook, chain] = crane.children[0]!.children;
    const topBox = new THREE.Box3().setFromObject(top!);
    const chainBox = new THREE.Box3().setFromObject(chain!);
    const hookBox = new THREE.Box3().setFromObject(hook!);
    // Der Haken endet dort, wo das Getragene hängt …
    expect(hookBox.min.y).toBeCloseTo(-CRANE_CLAW_DROP, 6);
    // … und die Kette reicht ohne Lücke vom Dropship bis in den Haken.
    expect(chainBox.max.y).toBeGreaterThanOrEqual(topBox.min.y);
    expect(chainBox.min.y).toBeLessThanOrEqual(hookBox.max.y);
  });

  it('lässt den gebauten Kran stehen, solange ein Teil fehlt', async () => {
    const crane = buildCrane();
    new THREE.Group().add(crane);
    const before = crane.children.length;
    const partial: CraneLoader = (path) =>
      path === CRANE_MODELS.hook ? Promise.resolve(null) : load(path);
    expect(await dressCrane(crane, partial)).toBe(false);
    expect(crane.children).toHaveLength(before);
  });

  it('gibt beim Abräumen die geteilte Geometrie der Regalkopien nicht frei', async () => {
    const crane = buildCrane();
    new THREE.Group().add(crane);
    await dressCrane(crane, load);
    let disposed = 0;
    crane.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.addEventListener('dispose', () => disposed++);
    });
    disposeCrane(crane);
    expect(disposed).toBe(0);
  });
});
