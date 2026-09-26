import * as THREE from 'three';
import {
  FRUSTUM_LENGTH,
  HAND_CLEARANCE,
  PlayerGuides,
  QUEST3_FOV,
  bodyBoxes,
  frustumCorners,
} from './playerGuides';
import { saveGraphics } from './graphicsSettings';

describe('Quest-3-Blickfeld', () => {
  it('spannt die Pyramide mit 110° × 96° nach vorn (−Z) auf', () => {
    const [tl, tr, br, bl] = frustumCorners();
    expect(tl!.z).toBeCloseTo(-FRUSTUM_LENGTH, 6);
    const horizontal = 2 * Math.atan2(tr!.x, FRUSTUM_LENGTH);
    const vertical = 2 * Math.atan2(tl!.y, FRUSTUM_LENGTH);
    expect(THREE.MathUtils.radToDeg(horizontal)).toBeCloseTo(QUEST3_FOV.horizontal, 6);
    expect(THREE.MathUtils.radToDeg(vertical)).toBeCloseTo(QUEST3_FOV.vertical, 6);
    expect(br!.x).toBeCloseTo(tr!.x, 6);
    expect(bl!.y).toBeCloseTo(br!.y, 6);
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
    saveGraphics({ showVrFrustum: false, showBodyModel: false });
    guides.update(head, 0);
    expect(guides.children.every((child) => !child.visible)).toBe(true);
    saveGraphics({ showVrFrustum: true, showBodyModel: true });
    guides.update(head, 0);
    expect(guides.children.every((child) => child.visible)).toBe(true);
    saveGraphics({ showVrFrustum: false, showBodyModel: false });
    guides.dispose();
  });
});
