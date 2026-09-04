/**
 * Der Kurzcode im Betrieb: hinein in den Speicher, heraus als Zeile, wieder
 * hinein.
 *
 * Der reine Codec ist nebenan geprüft (`shortCode.test.ts`); hier geht es um
 * die Übersetzung dazwischen, und die hat zwei Fallen. Erstens die **Finger**:
 * eine Messung fasst sie nicht an, also stehen sie nicht im Code — und wer sie
 * beim Lesen auf Null setzt, streckt jemandem die Hand aus, der nur den Griff
 * verschoben hat. Zweitens die **Länge**: dass ein Code kürzer ist als die
 * Zahlen darin, ist der ganze Grund, warum es ihn gibt.
 */
import { HOLD_HAND_POSE, defaultHoldPose, handPoseToArray, mirrorHandPose } from '../../../core/handPose';
import { saveHoldHandPose, saveIdleHandPose } from '../../../core/handPoseStore';
import { savePose } from './poseStore';
import { applyGearConfig, gearCode, parseGearCode, toolGearCode } from './gearConfig';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: fakeStorage(),
    configurable: true,
  });
  jest.resetModules();
});

const grip = { ...HOLD_HAND_POSE, x: 4, y: -2.8, z: 1.7, pitch: -44, yaw: 26, roll: -105 };

describe('der Code für ein Werkzeug an einer Hand', () => {
  it('ist kürzer als die blanken Zahlen — und trägt zwei Posen', () => {
    savePose('flashlight', {
      position: { x: 0.012, y: -0.034, z: 0.056 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    saveHoldHandPose('right', 'flashlight', grip);

    const code = toolGearCode('flashlight', 'right');
    expect(code.startsWith('BP')).toBe(true);
    // Zwei Posen — und trotzdem kürzer als *eine* im Klartext plus Rahmen.
    expect(code).toHaveLength(24);
    expect(code.length).toBeLessThan('4,-2.8,1.7,-44,26,-105'.length + 4);
  });

  it('kommt beim Laden genau so wieder an', () => {
    saveHoldHandPose('right', 'flashlight', grip);
    const code = toolGearCode('flashlight', 'right');

    // Ein frischer Speicher, in den der Code hineingelesen wird.
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage(), configurable: true });
    const config = parseGearCode(code);
    expect(config).not.toBeNull();
    applyGearConfig(config!);

    expect(config!.hands?.hold?.right?.flashlight?.slice(0, 6)).toEqual([4, -2.8, 1.7, -44, 26, -105]);
  });

  it('lässt die Finger stehen, wenn sie nicht verstellt sind', () => {
    saveHoldHandPose('right', 'pistol', { ...HOLD_HAND_POSE, x: 1, y: 2, z: 3 });
    const config = parseGearCode(toolGearCode('pistol', 'right'))!;
    const values = config.hands!.hold!.right!.pistol!;
    expect(values).toEqual(handPoseToArray({ ...HOLD_HAND_POSE, x: 1, y: 2, z: 3 }));
  });

  it('nimmt verstellte Finger mit', () => {
    const curled = { ...HOLD_HAND_POSE, curls: [0.1, 0.2, 0.3, 0.4, 0.5], spread: 12 };
    saveHoldHandPose('left', 'brush', curled);
    const config = parseGearCode(toolGearCode('brush', 'left'))!;
    expect(config.hands!.hold!.left!.brush).toEqual(handPoseToArray(curled));
  });

  it('kann auch die leere Hand', () => {
    const idle = { ...HOLD_HAND_POSE, x: -0.3, y: 2.7, z: 3.8, pitch: 75, yaw: -45, roll: 5 };
    saveIdleHandPose('left', idle);
    const config = parseGearCode(toolGearCode(null, 'left'))!;
    expect(config.hands!.idle!.left!.slice(0, 6)).toEqual([-0.3, 2.7, 3.8, 75, -45, 5]);
  });

  it('rührt nichts an, was nicht drinsteht', () => {
    saveHoldHandPose('right', 'pistol', { ...HOLD_HAND_POSE, x: 9 });
    saveHoldHandPose('right', 'brush', { ...HOLD_HAND_POSE, x: -9 });
    const config = parseGearCode(toolGearCode('pistol', 'right'))!;
    expect(config.hands?.hold?.right?.brush).toBeUndefined();
    expect(config.tools).toBeUndefined();
  });
});

describe('die eingemessene Taschenlampe', () => {
  it('liegt rechts, wie gemessen, und links gespiegelt', () => {
    expect(defaultHoldPose('right', 'flashlight')).toMatchObject({
      x: 4,
      y: -2.8,
      z: 1.7,
      pitch: -44,
      yaw: 26,
      roll: -105,
    });
    expect(defaultHoldPose('left', 'flashlight')).toEqual(
      mirrorHandPose(defaultHoldPose('right', 'flashlight')),
    );
    expect(defaultHoldPose('left', 'flashlight')).toMatchObject({ x: -4, yaw: -26, roll: 105 });
  });

  it('lässt alles andere bei der gebauten Faust', () => {
    expect(defaultHoldPose('right', 'pistol')).toEqual(HOLD_HAND_POSE);
  });
});

describe('der große Code', () => {
  it('bleibt für die ganze Ausrüstung zuständig', () => {
    saveHoldHandPose('right', 'flashlight', grip);
    const code = gearCode();
    expect(code.startsWith('BG3')).toBe(true);
    expect(parseGearCode(code)).not.toBeNull();
  });
});
