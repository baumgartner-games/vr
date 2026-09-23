import { multiplyQuat, forwardOf, rotateVec, type Quat, type Vec3 } from './tools/aim';
import { GRIP_TO_RAY } from './tools/gripFit';
import {
  EYE_AIM_MIN,
  EYE_GRIP,
  EYE_REAR_CLEAR,
  EYE_RELIEF,
  EYE_SCALE,
  eyeGripRotation,
  eyeSightRelief,
  eyeSightScale,
  eyeSightPose,
  type EyeHold,
  type EyeSight,
} from './eyeHand';

function quat(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

function vec(): Vec3 {
  return { x: 0, y: 0, z: 0 };
}

/** Eine Pistole, wie sie ungefähr im Griff liegt: etwas davor, entlang des Strahls. */
const PISTOL: EyeHold = {
  position: { x: 0, y: 0.02, z: -0.05 },
  rotation: { ...GRIP_TO_RAY },
};

/** Wie weit die Laufachse am Punkt `distance` vor der Kamera vorbeigeht, in Metern. */
function miss(hold: EyeHold, distance: number, scale = 1): number {
  const q = eyeGripRotation(EYE_GRIP, hold, distance, quat(), scale);
  const at = rotateVec(hold.position, q, vec());
  at.x = at.x * scale + EYE_GRIP.x;
  at.y = at.y * scale + EYE_GRIP.y;
  at.z = at.z * scale + EYE_GRIP.z;
  const along = forwardOf(multiplyQuat(q, hold.rotation, quat()), vec());
  // Der Punkt auf der Laufachse, der dem Ziel am nächsten liegt.
  const tx = -at.x;
  const ty = -at.y;
  const tz = -distance - at.z;
  const s = tx * along.x + ty * along.y + tz * along.z;
  return Math.hypot(tx - s * along.x, ty - s * along.y, tz - s * along.z);
}

describe('die Hand vor dem Auge', () => {
  it('zeigt ohne Werkzeug mit dem Zeigestrahl geradeaus', () => {
    const q = eyeGripRotation(EYE_GRIP, null, 10, quat());
    const ray = forwardOf(multiplyQuat(q, GRIP_TO_RAY, quat()), vec());
    expect(ray.x).toBeCloseTo(0, 6);
    expect(ray.y).toBeCloseTo(0, 6);
    expect(ray.z).toBeCloseTo(-1, 6);
  });

  it.each([2, 5, 10, 30, 60])('trifft mit dem Lauf das Fadenkreuz auf %d m', (distance) => {
    expect(miss(PISTOL, distance)).toBeLessThan(0.001);
  });

  it('zielt auch mit einer schief eingemessenen Haltung auf die Mitte', () => {
    const turn = { x: 0.05, y: -0.08, z: 0.02, w: 0.995 };
    const length = Math.hypot(turn.x, turn.y, turn.z, turn.w);
    const tilted: EyeHold = {
      position: { x: 0.01, y: 0.03, z: -0.04 },
      rotation: multiplyQuat(
        GRIP_TO_RAY,
        { x: turn.x / length, y: turn.y / length, z: turn.z / length, w: turn.w / length },
        quat(),
      ),
    };
    expect(miss(tilted, 10)).toBeLessThan(0.001);
  });

  it('trifft auch halb so groß gezeichnet das Fadenkreuz', () => {
    expect(miss(PISTOL, 4, EYE_SCALE)).toBeLessThan(0.001);
  });

  it('dreht sich vor einer Wand nicht quer, sondern zielt höchstens auf die Mindestweite', () => {
    const close = eyeGripRotation(EYE_GRIP, PISTOL, 0.2, quat());
    const floor = eyeGripRotation(EYE_GRIP, PISTOL, EYE_AIM_MIN, quat());
    expect(close).toEqual(floor);
  });

  it('schaut von rechts unten nach innen und oben', () => {
    const q = eyeGripRotation(EYE_GRIP, PISTOL, 5, quat());
    const along = forwardOf(multiplyQuat(q, PISTOL.rotation, quat()), vec());
    expect(along.x).toBeLessThan(0);
    expect(along.y).toBeGreaterThan(0);
    expect(along.z).toBeLessThan(-0.9);
  });
});

describe('das Zielen über die Zielhilfe', () => {
  const SIGHT: EyeSight = {
    point: { x: 0, y: 0.06, z: 0.02 },
    rotation: { x: 0.02, y: 0, z: 0, w: 0.9998 },
    relief: 0.3,
    scale: 1,
  };

  /** Wo ein Punkt der Zielhilfe mit dieser Lage im Raum der Kamera landet. */
  function place(pose: { position: Vec3; rotation: Quat }, scale: number, local: Vec3): Vec3 {
    const inTool = rotateVec(local, SIGHT.rotation, vec());
    inTool.x += SIGHT.point.x;
    inTool.y += SIGHT.point.y;
    inTool.z += SIGHT.point.z;
    const inGrip = rotateVec(inTool, PISTOL.rotation, vec());
    inGrip.x += PISTOL.position.x;
    inGrip.y += PISTOL.position.y;
    inGrip.z += PISTOL.position.z;
    const out = rotateVec(inGrip, pose.rotation, vec());
    return {
      x: out.x * scale + pose.position.x,
      y: out.y * scale + pose.position.y,
      z: out.z * scale + pose.position.z,
    };
  }

  it.each([1, EYE_SCALE])('legt die Visierlinie auf die Blickachse (Maßstab %p)', (scale) => {
    const pose = eyeSightPose(PISTOL, SIGHT, scale, { position: vec(), rotation: quat() });
    const rear = place(pose, scale, vec());
    expect(rear.x).toBeCloseTo(0, 6);
    expect(rear.y).toBeCloseTo(0, 6);
    expect(rear.z).toBeCloseTo(-0.3, 6);
    // Ein Punkt weiter vorn auf der Linie liegt ebenfalls auf der Achse — und
    // ihr Oben zeigt nach oben.
    const front = place(pose, scale, { x: 0, y: 0, z: -0.2 });
    expect(front.x).toBeCloseTo(0, 6);
    expect(front.y).toBeCloseTo(0, 6);
    expect(front.z).toBeLessThan(rear.z);
    const up = place(pose, scale, { x: 0, y: 0.1, z: 0 });
    expect(up.x).toBeCloseTo(0, 6);
    expect(up.y).toBeGreaterThan(0);
  });

  it('hält das hintere Ende der Waffe vom Auge weg — außer beim Fernrohr', () => {
    expect(eyeSightRelief('irons', 0)).toBe(EYE_RELIEF.irons);
    expect(eyeSightRelief('irons', 0.6)).toBeCloseTo(0.6 * EYE_SCALE + EYE_REAR_CLEAR, 9);
    expect(eyeSightRelief('scope', 0.6)).toBe(EYE_RELIEF.scope);
    expect(eyeSightScale('scope')).toBe(1);
    expect(eyeSightScale('irons')).toBe(EYE_SCALE);
  });
});
