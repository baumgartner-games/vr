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
import {
  HOLD_HAND_POSE,
  defaultHoldPose,
  handPoseToArray,
  mirrorHandPose,
} from '../../../core/handPose';
import { saveHoldHandPose, saveIdleHandPose } from '../../../core/handPoseStore';
import { savePose, storedPoseHand, storedPose } from './poseStore';
import { readPose } from './toolPose';
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

    expect(config!.hands?.hold?.right?.flashlight?.slice(0, 6)).toEqual([
      4, -2.8, 1.7, -44, 26, -105,
    ]);
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

describe('der abgetippte Code der Taschenlampe', () => {
  // Genau die Zeile, die von der Tafel im Eingaberaum kam. Sie steht hier,
  // weil die Zahlen daraus in `handPose.ts` und `FlashlightTool.ts` gelandet
  // sind: wer sie dort ändert, soll sehen, woher sie kamen.
  const CODE = 'BPNDLdWgZ9NvBevCHScPckXK';

  it('trägt die Lage im Griff, den Griff und die rechte Hand', () => {
    const config = parseGearCode(CODE);
    expect(config).not.toBeNull();
    expect(config!.tools?.flashlight).toEqual([0.8, -1.4, 3.8, 30, 5, 9]);
    expect(config!.toolHands?.flashlight).toBe('right');
    expect(config!.hands?.hold?.right?.flashlight?.slice(0, 6)).toEqual([
      3.6, -1.8, 2.5, -59, 23, -99,
    ]);
  });

  it('merkt sich beim Laden, an welcher Hand gemessen wurde', () => {
    applyGearConfig(parseGearCode(CODE)!);
    expect(storedPoseHand('flashlight')).toBe('right');
    expect(readPose(storedPose('flashlight')!)).toMatchObject({
      x: 0.8,
      y: -1.4,
      z: 3.8,
      pitch: 30,
      yaw: 5,
      roll: 9,
    });
  });

  it('gibt dieselbe Zeile wieder her', () => {
    applyGearConfig(parseGearCode(CODE)!);
    expect(toolGearCode('flashlight', 'right')).toBe(CODE);
  });
});

describe('die Hand am Werkzeug', () => {
  it('bleibt gespeichert, auch wenn nur die Pose neu geschrieben wird', () => {
    savePose(
      'flashlight',
      { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
      'left',
    );
    expect(storedPoseHand('flashlight')).toBe('left');
    savePose('flashlight', {
      position: { x: 0.01, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    expect(storedPoseHand('flashlight')).toBe('left');
  });

  it('ist leer, solange niemand sie aufgeschrieben hat', () => {
    savePose('pistol', { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } });
    expect(storedPoseHand('pistol')).toBeNull();
  });
});

describe('die eine Faust am Griff', () => {
  it('gilt rechts wie gerechnet und links gespiegelt', () => {
    expect(defaultHoldPose('right', 'flashlight')).toMatchObject({
      x: -1.1,
      y: 2.6,
      z: 2.8,
      pitch: -43,
      yaw: -58,
      roll: -90,
    });
    expect(defaultHoldPose('left', 'flashlight')).toEqual(
      mirrorHandPose(defaultHoldPose('right', 'flashlight')),
    );
    expect(defaultHoldPose('left', 'flashlight')).toMatchObject({ x: 1.1, yaw: 58, roll: 90 });
  });

  it('gilt für jedes Werkzeug am Griff — die Lampe hält ihn wie die Pistole', () => {
    expect(defaultHoldPose('right', 'pistol')).toEqual(defaultHoldPose('right', 'flashlight'));
  });

  it('lässt alles ohne Griff bei der gebauten Faust', () => {
    expect(defaultHoldPose('right', 'hammer')).toEqual(HOLD_HAND_POSE);
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
