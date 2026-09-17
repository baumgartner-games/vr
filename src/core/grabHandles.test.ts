import {
  DEFAULT_GRAB,
  GRAB_REACHES,
  HITBOX_HOLD,
  MOORE_TILE,
  grabReaches,
  grabSpec,
  grabsByHitbox,
  handle,
  handleInHand,
  holdBar,
  handleInWorld,
  holdFor,
  holdForHandle,
  inMoore,
  mooreSteps,
  nearestHandle,
  rimHandles,
  ringHandles,
  type GrabPose,
  type Quat,
  type Vec3,
} from './grabHandles';
import { STANDARD_GRIP_IN_HAND } from '../worlds/portal/tools/gripFit';
import { rotateVec } from '../worlds/portal/tools/aim';
import { quatFromEulerXYZ } from '../worlds/portal/tools/toolPose';
import { TILE } from '../worlds/nav/navTile';

const UP: Vec3 = { x: 0, y: 1, z: 0 };
const RIGHT: Vec3 = { x: 1, y: 0, z: 0 };

function pose(position: Vec3, rotation: Quat = { x: 0, y: 0, z: 0, w: 1 }): GrabPose {
  return { position: { ...position }, rotation: { ...rotation } };
}

function empty(): GrabPose {
  return pose({ x: 0, y: 0, z: 0 });
}

/**
 * **Wie ein Ding gegriffen werden will** (`core/grabHandles.ts`).
 *
 * Alles hier ist reine Rechnung — die drei Fälle des Auftrags (keine Griffe,
 * einer, mehrere), die Wahl des nächsten für eine Handpose, die Umkehrung, die
 * das Ding in die Faust legt, und die Moore-Nachbarschaft samt ihren Grenzen.
 */
describe('Was ein Ding über das Greifen sagt', () => {
  it('gibt ohne Angabe genau das her, was vorher galt: keine Griffe, alle Reichweiten', () => {
    expect(grabSpec(undefined)).toEqual(DEFAULT_GRAB);
    expect(grabSpec(null)).toEqual({ handles: [], reach: 'all' });
    expect(grabsByHitbox(undefined)).toBe(true);
  });

  it('nimmt die nackte Reichweite als Kurzform', () => {
    expect(grabSpec('moore')).toEqual({ handles: [], reach: 'moore' });
    expect(grabSpec('all').reach).toBe('all');
    // Was es nicht gibt, ist die Vorgabe und nicht ein Absturz.
    expect(grabSpec('weit' as never).reach).toBe('all');
    expect(GRAB_REACHES).toEqual(['all', 'moore']);
  });

  it('unterscheidet Hitbox, einen Griff und mehrere', () => {
    const one = handle('stiel', { x: 0, y: 0.1, z: 0.3 }, { x: 0, y: 0, z: 1 }, RIGHT);
    expect(grabsByHitbox({ handles: [] })).toBe(true);
    expect(grabsByHitbox({ handles: [one] })).toBe(false);
    expect(grabSpec({ handles: ringHandles(0.35, 8) }).handles).toHaveLength(8);
  });
});

describe('Wo ein Griff in der Welt liegt', () => {
  it('nimmt den Versatz mit der Drehung des Dings mit', () => {
    const one = handle('rand', { x: 0.3, y: 0, z: 0 }, UP, RIGHT);
    // Eine Vierteldrehung um die Hochachse: aus +x wird -z.
    const turned = pose({ x: 1, y: 0, z: 2 }, quatFromEulerXYZ({ x: 0, y: Math.PI / 2, z: 0 }));
    const out = empty();
    handleInWorld(one, turned, out);
    expect(out.position.x).toBeCloseTo(1, 5);
    expect(out.position.z).toBeCloseTo(1.7, 5);
  });

  it('wählt für eine Handpose den nächsten Griff', () => {
    const handles = ringHandles(0.375, 8);
    const plate = pose({ x: 0, y: 1, z: 0 });
    // Der Ring fängt bei +z an (`sin 0 = 0`, `cos 0 = 1`).
    const front = nearestHandle(handles, plate, { x: 0, y: 1, z: 0.6 });
    expect(front?.handle.id).toBe('rand-0');
    const back = nearestHandle(handles, plate, { x: 0, y: 1, z: -0.6 });
    expect(back?.handle.id).toBe('rand-4');
    // Und der Abstand ist der echte, nicht der quadrierte.
    expect(front?.distance).toBeCloseTo(0.225, 5);
  });

  it('hat ohne Griffe nichts zu wählen', () => {
    expect(nearestHandle([], empty(), { x: 0, y: 0, z: 0 })).toBeNull();
  });

  it('wählt am gedrehten Teller den Griff, der wirklich vorn liegt', () => {
    const handles = ringHandles(0.375, 4);
    // Halbe Drehung: der Griff, der gebaut bei +z sitzt, liegt jetzt bei -z.
    const plate = pose({ x: 0, y: 0, z: 0 }, quatFromEulerXYZ({ x: 0, y: Math.PI, z: 0 }));
    expect(nearestHandle(handles, plate, { x: 0, y: 0, z: 1 })?.handle.id).toBe('rand-2');
  });
});

describe('Wie das Ding dann in der Hand liegt', () => {
  /**
   * Die Probe aufs Exempel: `holdForHandle` ist die **Umkehrung** von
   * `gripInHand`, also muss der Griff danach genau dort sitzen, wo jedes
   * Werkzeug dieses Projekts seinen hat (`gripFit.STANDARD_GRIP_IN_HAND`).
   * Fiele das auseinander, hielte eine Pfanne anders als eine Pistole — und
   * genau das soll es nicht.
   */
  it('legt jeden Griff auf den Griffpunkt der Faust', () => {
    for (const one of [
      handle('stiel', { x: 0, y: 0.12, z: 0.31 }, { x: 0, y: 0, z: 1 }, { x: -1, y: 0, z: 0 }),
      handle('kopf', { x: 0, y: 0.5, z: 0 }, UP, RIGHT),
      ...ringHandles(0.375, 4, 0.02),
    ]) {
      const back = handleInHand(holdForHandle(one), one);
      expect(back.position.x).toBeCloseTo(STANDARD_GRIP_IN_HAND.position.x, 6);
      expect(back.position.y).toBeCloseTo(STANDARD_GRIP_IN_HAND.position.y, 6);
      expect(back.position.z).toBeCloseTo(STANDARD_GRIP_IN_HAND.position.z, 6);
      // Eine Drehung und ihr Gegenteil beschreiben dieselbe Lage.
      const dot =
        back.rotation.x * STANDARD_GRIP_IN_HAND.rotation.x +
        back.rotation.y * STANDARD_GRIP_IN_HAND.rotation.y +
        back.rotation.z * STANDARD_GRIP_IN_HAND.rotation.z +
        back.rotation.w * STANDARD_GRIP_IN_HAND.rotation.w;
      expect(Math.abs(dot)).toBeCloseTo(1, 6);
    }
  });

  it('legt ein Ding ohne Griff unverdreht in die Faust', () => {
    expect(holdFor(null)).toEqual(HITBOX_HOLD);
    expect(HITBOX_HOLD.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(HITBOX_HOLD.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });
});

/**
 * **Der Haltezylinder** — die Form, in der Pfanne, Topf und Feuerlöscher ihre
 * Griffe angeben (`worlds/test/zones/kitchenGrab.ts`).
 *
 * Drei Zusicherungen, und alle drei sind in der Brille eine Viertelstunde:
 * Die Hand liegt in der **Mitte** der Stange, die Stange zeigt in ihre eigene
 * Richtung, und `up`/`ahead` landen dort, wo der Griffrahmen sie haben will —
 * +Y und -Z.
 */
describe('Ein Griff als Haltezylinder', () => {
  const bar = {
    from: { x: 0, y: 1, z: 2 },
    to: { x: 0, y: 1, z: 0 },
    radius: 0.05,
  };

  it('legt die Hand in die Mitte der Stange', () => {
    const spot = holdBar('stiel', bar, UP, { x: 0, y: 0, z: -1 });
    expect(spot.pose.position).toEqual({ x: 0, y: 1, z: 1 });
    expect(spot.hold?.length).toBeCloseTo(2, 10);
    expect(spot.hold?.radius).toBe(0.05);
  });

  it('merkt sich die Richtung der Stange als Einheitsvektor', () => {
    const spot = holdBar('stiel', bar, UP, { x: 0, y: 0, z: -1 });
    expect(spot.hold?.along.x).toBeCloseTo(0, 10);
    expect(spot.hold?.along.y).toBeCloseTo(0, 10);
    expect(spot.hold?.along.z).toBeCloseTo(-1, 10);
  });

  /**
   * **Und das ist der Kern**: Die Stange liegt hier entlang z, die Faustachse
   * zeigt nach oben. Beides fällt ausdrücklich nicht zusammen — sonst hinge
   * eine Pfanne hochkant in der Hand.
   */
  it('setzt `up` auf die Faustachse und `ahead` auf das Vorne', () => {
    const ahead: Vec3 = { x: 0, y: 0, z: -1 };
    const spot = holdBar('stiel', bar, UP, ahead);
    const axis = rotateVec(UP, spot.pose.rotation, { x: 0, y: 0, z: 0 });
    expect(axis.x).toBeCloseTo(0, 10);
    expect(axis.y).toBeCloseTo(1, 10);
    expect(axis.z).toBeCloseTo(0, 10);
    const front = rotateVec({ x: 0, y: 0, z: -1 }, spot.pose.rotation, { x: 0, y: 0, z: 0 });
    expect(front.x).toBeCloseTo(ahead.x, 10);
    expect(front.y).toBeCloseTo(ahead.y, 10);
    expect(front.z).toBeCloseTo(ahead.z, 10);
  });

  it('dreht mit `ahead` um die Faustachse und nicht um die Stange', () => {
    const spot = holdBar('stiel', bar, UP, { x: 1, y: 0, z: 0 });
    const front = rotateVec({ x: 0, y: 0, z: -1 }, spot.pose.rotation, { x: 0, y: 0, z: 0 });
    expect(front.x).toBeCloseTo(1, 10);
    expect(front.z).toBeCloseTo(0, 10);
    // Die Stange bleibt, wo sie war — sie hängt am Modell und nicht am Vorne.
    expect(spot.hold?.along.z).toBeCloseTo(-1, 10);
  });

  it('lässt einen Griff ohne Stange ohne Zylinder', () => {
    expect(handle('rand', { x: 0, y: 0, z: 0 }, UP, RIGHT).hold).toBeUndefined();
  });
});

describe('Vier Griffe an den Rändern', () => {
  /**
   * Das Modell für das Möbel, das ein anderer Agent umstellbar machen soll:
   * **generisch platziert**, nicht je Möbel gesetzt.
   */
  it('setzt je einen in die Mitte jeder Seite', () => {
    const four = rimHandles({ x: 0.5, z: 0.4 }, 0.9);
    expect(four.map((one) => one.id)).toEqual(['+x', '-x', '+z', '-z']);
    expect(four[0]!.pose.position).toEqual({ x: 0.5, y: 0.9, z: 0 });
    expect(four[3]!.pose.position).toEqual({ x: 0, y: 0.9, z: -0.4 });
  });
});

describe('Die Moore-Nachbarschaft', () => {
  it('rechnet auf derselben Kachel wie die Welt', () => {
    expect(MOORE_TILE).toBe(TILE);
  });

  it('nimmt das eigene Feld und die acht daneben — auch über Eck', () => {
    const me: Vec3 = { x: 3.5, y: 0, z: 3.5 };
    expect(mooreSteps(me, { x: 3.1, y: 0, z: 3.9 })).toBe(0);
    expect(mooreSteps(me, { x: 4.5, y: 0, z: 3.5 })).toBe(1);
    // Über Eck ist Nachbarschaft: 1,41 m Luftlinie, und trotzdem ein Schritt.
    expect(mooreSteps(me, { x: 4.5, y: 0, z: 4.5 })).toBe(1);
    expect(inMoore(me, { x: 4.5, y: 0, z: 4.5 })).toBe(true);
  });

  it('hört beim übernächsten Feld auf', () => {
    const me: Vec3 = { x: 3.5, y: 0, z: 3.5 };
    expect(mooreSteps(me, { x: 5.5, y: 0, z: 3.5 })).toBe(2);
    expect(inMoore(me, { x: 5.5, y: 0, z: 3.5 })).toBe(false);
    expect(inMoore(me, { x: 3.5, y: 0, z: 1.2 })).toBe(false);
  });

  it('fragt nicht nach der Höhe', () => {
    // Die Pfanne auf der Arbeitsplatte ist so nah wie die auf dem Boden davor.
    const me: Vec3 = { x: 0.5, y: 0, z: 0.5 };
    expect(inMoore(me, { x: 0.5, y: 3, z: 0.5 })).toBe(true);
  });

  /**
   * **Die Zusicherung des Auftrags**: Für die Küchendinge gilt der Meter, für
   * Werkzeuge und Gegenstände gilt weiter alles. Eine Reichweite, die nichts
   * angibt, ist `'all'` — und `'all'` sagt aus jeder Entfernung ja, also
   * bleiben Nahgreifen und Ferngreifen unberührt.
   */
  it('lässt `all` alles zu und `moore` nur den Meter', () => {
    const me: Vec3 = { x: 0.5, y: 0, z: 0.5 };
    const far: Vec3 = { x: 8.5, y: 0, z: 0.5 };
    expect(grabReaches('all', me, far)).toBe(true);
    expect(grabReaches(DEFAULT_GRAB.reach, me, far)).toBe(true);
    expect(grabReaches('moore', me, far)).toBe(false);
    expect(grabReaches('moore', me, { x: 1.5, y: 0, z: 1.5 })).toBe(true);
  });
});
