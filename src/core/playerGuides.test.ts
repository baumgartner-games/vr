import * as THREE from 'three';
import {
  FRUSTUM_LENGTH,
  HAND_CLEARANCE,
  PlayerGuides,
  bodyBoxes,
  viewCone,
  viewDirection,
  viewRim,
} from './playerGuides';
import { saveGraphics } from './graphicsSettings';
import { GAZE_PITCH, QUEST_VIEW } from './questView';

describe('Quest-3-Blickfeld', () => {
  const deg = THREE.MathUtils.radToDeg;

  it('legt eine Richtung so, wie `viewFrustum` sie auf der Bildebene sieht', () => {
    const dir = viewDirection(30, -20);
    expect(Math.hypot(dir.x, dir.y, dir.z)).toBeCloseTo(1, 9);
    expect(dir.x / -dir.z).toBeCloseTo(Math.tan(THREE.MathUtils.degToRad(30)), 9);
    expect(dir.y / -dir.z).toBeCloseTo(
      Math.tan(THREE.MathUtils.degToRad(-20)) / Math.cos(THREE.MathUtils.degToRad(30)),
      9,
    );
  });

  it('legt den Rand rund in Armlänge um das Auge, nach vorn (−Z)', () => {
    const rim = viewRim();
    expect(rim.length).toBeGreaterThan(40);
    for (const p of rim) {
      expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(FRUSTUM_LENGTH, 6);
      expect(p.z).toBeLessThan(0);
    }
  });

  it('folgt dem eingestellten Rand: so breit und so hoch wie `QUEST_VIEW`', () => {
    const rim = viewRim();
    const widest = Math.max(...QUEST_VIEW.map(([az]) => az));
    const highest = Math.max(...QUEST_VIEW.map(([, el]) => el));
    const lowest = Math.min(...QUEST_VIEW.map(([, el]) => el));
    expect(Math.max(...rim.map((p) => deg(Math.atan2(p.x, -p.z))))).toBeCloseTo(widest, 4);
    expect(Math.max(...rim.map((p) => deg(Math.asin(p.y / FRUSTUM_LENGTH))))).toBeCloseTo(
      highest,
      4,
    );
    expect(Math.min(...rim.map((p) => deg(Math.asin(p.y / FRUSTUM_LENGTH))))).toBeCloseTo(
      lowest,
      4,
    );
  });

  it('nähert das Sichtfeld als runden Kegel um die gefühlte Null', () => {
    const cone = viewCone();
    expect(cone.pitch).toBeCloseTo(GAZE_PITCH, 6);
    expect(cone.halfWidth).toBeCloseTo(38.5, 6);
    expect(cone.halfHeight).toBeCloseTo(35, 6);
    expect(cone.angle).toBeGreaterThan(cone.halfHeight);
    expect(cone.angle).toBeLessThan(cone.halfWidth);
  });
});

describe('Mensch als Boxen', () => {
  const byName = (eye: number) => new Map(bodyBoxes(eye, 0.825).map((b) => [b.name, b]));

  it('lässt die Hände fast auf den Boden hängen', () => {
    const hand = byName(1.6).get('hand-right')!;
    expect(hand.y - hand.h / 2).toBeCloseTo(HAND_CLEARANCE, 6);
  });

  it('setzt die Augen in den Kopf und den Scheitel darüber', () => {
    const head = byName(1.6).get('head')!;
    expect(head.y - head.h / 2).toBeLessThan(1.6);
    expect(head.y + head.h / 2).toBeGreaterThan(1.6);
  });

  it('legt das Gürtelband auf den Anteil der Augenhöhe', () => {
    expect(byName(1.6).get('belt')!.y).toBeCloseTo(1.32, 6);
  });

  it('steht mit den Füßen auf dem Boden', () => {
    const leg = byName(1.6).get('leg-left')!;
    expect(leg.y - leg.h / 2).toBeCloseTo(0, 6);
  });
});

describe('PlayerGuides', () => {
  const deg = THREE.MathUtils.radToDeg;
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  });
  afterAll(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('zeigt nur, was im Grafik-Menü angehakt ist', () => {
    const guides = new PlayerGuides();
    const head = new THREE.Matrix4().makeTranslation(1, 1.6, 2);
    saveGraphics({ showVrFrustum: false, highlightView: false, showBodyModel: false });
    guides.update(head, 0);
    expect(guides.children.every((child) => !child.visible)).toBe(true);
    saveGraphics({ showVrFrustum: true, highlightView: true, showBodyModel: true });
    guides.update(head, 0);
    expect(guides.children.every((child) => child.visible)).toBe(true);
    saveGraphics({ showVrFrustum: false, highlightView: false, showBodyModel: false });
    guides.dispose();
  });

  it('hebt das Sichtfeld mit einem Spot hervor, den nur der Blick von außen sieht', () => {
    const guides = new PlayerGuides();
    let spot: THREE.SpotLight | null = null;
    guides.traverse((object) => {
      if (object instanceof THREE.SpotLight) spot = object;
    });
    expect(spot).not.toBeNull();
    const light = spot! as THREE.SpotLight;
    expect(deg(light.angle)).toBeCloseTo(viewCone().angle, 6);
    expect(light.layers.isEnabled(0)).toBe(false);
    // Die Achse zeigt auf die gefühlte Null.
    const aim = light.target.position;
    expect(deg(Math.atan2(aim.y, -aim.z))).toBeCloseTo(GAZE_PITCH, 6);
    guides.dispose();
  });
});
