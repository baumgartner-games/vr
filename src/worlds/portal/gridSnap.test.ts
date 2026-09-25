/**
 * **Was hingestellt wird, steht auf einer Kachel und schaut geradeaus.**
 *
 * Gemessen wird hier nur die Rechnung (`gridSnap.ts`) und nicht die Welt: Ob
 * das Fass danach wirklich dort liegt, entscheidet die Physik, und die hat
 * ihren eigenen Test. Was diese Datei festhält, ist das Versprechen davor —
 * Kachelmitte, Vierteldrehung, und ein Wurf bleibt ein Wurf.
 */
import * as THREE from 'three';
import { TILE } from '../nav/navTile';
import {
  PLACE_SPEED,
  eighthYaw,
  gridPose,
  isDiagonal,
  placesOnGrid,
  quarterYaw,
  snapAxis,
  tileCentre,
  tileSpan,
  tilesCovered,
  turnedHalf,
  wallAxis,
  wallEdges,
  yawOf,
} from './gridSnap';

/** Eine Drehung um die Hochachse, so wie sie an einem Gegenstand steht. */
function turned(yaw: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
}

describe('tileCentre', () => {
  it('legt jeden Punkt einer Kachel auf dieselbe Mitte', () => {
    expect(tileCentre(0)).toBeCloseTo(TILE / 2, 9);
    expect(tileCentre(0.01)).toBeCloseTo(TILE / 2, 9);
    expect(tileCentre(0.99 * TILE)).toBeCloseTo(TILE / 2, 9);
    expect(tileCentre(3.2 * TILE)).toBeCloseTo(3.5 * TILE, 9);
  });

  /**
   * Die Fuge und nicht die Mitte ist die Grenze — sonst spränge ein Ding, das
   * genau in der Kachelmitte steht, beim nächsten Ablegen eine Kachel weiter.
   */
  it('rastet unter null genauso ein wie darüber', () => {
    expect(tileCentre(-0.01)).toBeCloseTo(-TILE / 2, 9);
    expect(tileCentre(-2.5 * TILE)).toBeCloseTo(-2.5 * TILE, 9);
    expect(tileCentre(tileCentre(4.7 * TILE))).toBeCloseTo(tileCentre(4.7 * TILE), 9);
  });
});

describe('yawOf', () => {
  it('liest die Drehung um die Hochachse zurück', () => {
    for (const yaw of [0, 0.4, Math.PI / 2, -1.2, Math.PI - 0.01]) {
      expect(yawOf(turned(yaw))).toBeCloseTo(yaw, 9);
    }
  });

  /** Ein Fass, das auf dem Kopf durch die Luft geflogen ist, hat trotzdem eine. */
  it('gibt für eine Drehung ohne Richtung in der Ebene null', () => {
    const upright = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2,
    );
    expect(yawOf(upright)).toBe(0);
  });
});

describe('quarterYaw', () => {
  it('rundet auf die nächste Vierteldrehung', () => {
    expect(quarterYaw(0.2)).toBeCloseTo(0, 9);
    expect(quarterYaw(1.4)).toBeCloseTo(Math.PI / 2, 9);
    expect(quarterYaw(-1.4)).toBeCloseTo(-Math.PI / 2, 9);
    expect(quarterYaw(Math.PI - 0.1)).toBeCloseTo(Math.PI, 9);
  });

  it('bleibt in (−180°, 180°] und fällt bei Unsinn auf null', () => {
    for (let yaw = -10; yaw <= 10; yaw += 0.37) {
      const snapped = quarterYaw(yaw);
      expect(snapped).toBeGreaterThan(-Math.PI - 1e-9);
      expect(snapped).toBeLessThanOrEqual(Math.PI + 1e-9);
      // Und es ist wirklich ein Viertel und kein krummer Winkel.
      expect(Math.abs((snapped / (Math.PI / 2)) % 1)).toBeLessThan(1e-9);
    }
    expect(quarterYaw(Number.NaN)).toBe(0);
  });
});

describe('gridPose', () => {
  it('stellt ein schräg gehaltenes Ding gerade auf seine Kachel', () => {
    const tilted = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.45)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.3));
    const pose = gridPose(3.2 * TILE, -0.4 * TILE, tilted);
    expect(pose.x).toBeCloseTo(3.5 * TILE, 9);
    expect(pose.z).toBeCloseTo(-0.5 * TILE, 9);
    expect(pose.yaw).toBeCloseTo(Math.PI / 2, 9);
  });

  /**
   * **Zweimal hinstellen ändert nichts mehr.** Ohne diese Zusage wanderte eine
   * Reihe Fässer bei jedem Aufheben und Ablegen um eine Kachel weiter.
   */
  it('ist stabil: was eingerastet ist, bleibt liegen', () => {
    const first = gridPose(7.3 * TILE, 2.8 * TILE, turned(0.9));
    const again = gridPose(first.x, first.z, turned(first.yaw));
    expect(again).toEqual(first);
  });
});

/**
 * **Die Wand aus dem Regal** — `restaurant-bits/wall.glb`, mit dem Maßstab
 * ihres Pakets 2,00 m breit, 2,00 m hoch und 0,25 m dick. Gemeldet: „die Wand
 * steht mittig, statt am Rand der Kacheln" und „steht über 3 Kacheln, obwohl
 * es auf 2 Kacheln stehen könnte".
 */
describe('Wände und breite Möbel', () => {
  const WALL = { x: 1, z: 0.125 };

  it('stellt eine Wand auf die Fuge zwischen zwei Kachelreihen', () => {
    const pose = gridPose(3.3 * TILE, -2.2 * TILE, turned(0.1), WALL);
    expect(pose.wall).toBe('z');
    // Quer: auf der nächsten Fuge, nicht auf der Kachelmitte.
    expect(pose.z).toBeCloseTo(-2 * TILE, 9);
    // Längs: zwei Kacheln, also ebenfalls auf eine Fuge — genau zwei Kacheln
    // und nicht eine ganze und zwei halbe.
    expect(pose.x).toBeCloseTo(3 * TILE, 9);
  });

  it('dreht die Frage mit der Wand', () => {
    const pose = gridPose(3.3 * TILE, -2.2 * TILE, turned(Math.PI / 2 - 0.1), WALL);
    expect(pose.wall).toBe('x');
    expect(pose.x).toBeCloseTo(3 * TILE, 9);
    expect(pose.z).toBeCloseTo(-2 * TILE, 9);
    const { halfX, halfZ } = turnedHalf(WALL, pose.yaw);
    expect(halfX).toBeCloseTo(0.125, 9);
    expect(halfZ).toBeCloseTo(1, 9);
  });

  it('bleibt beim zweiten Hinstellen, wo sie steht', () => {
    const first = gridPose(5.49 * TILE, 1.51 * TILE, turned(0.2), WALL);
    const again = gridPose(first.x, first.z, turned(first.yaw), WALL);
    expect(again).toEqual(first);
  });

  it('legt ein zwei Kacheln breites Möbel auf genau zwei Kacheln', () => {
    const pose = gridPose(4.2 * TILE, 0.7 * TILE, turned(0), { x: 1, z: 0.5 });
    expect(pose.wall).toBeNull();
    expect(pose.x).toBeCloseTo(4 * TILE, 9);
    expect(pose.z).toBeCloseTo(0.5 * TILE, 9);
    expect(tilesCovered(pose.x - 1, pose.x + 1, pose.z - 0.5, pose.z + 0.5)).toHaveLength(2);
  });

  it('lässt ein Fass und einen Apfel auf der Kachelmitte', () => {
    expect(gridPose(2.3, 2.3, turned(0), { x: 0.3, z: 0.3 })).toMatchObject({ x: 2.5, z: 2.5 });
    expect(gridPose(2.3, 2.3, turned(0), { x: 0.5125, z: 0.5125 })).toMatchObject({
      x: 2.5,
      z: 2.5,
      wall: null,
    });
  });

  it('erkennt eine Wand an der Grundfläche und nicht am Namen', () => {
    expect(wallAxis(2, 0.25)).toBe('z');
    expect(wallAxis(0.4, 1)).toBe('x');
    // Zu dick, zu kurz, zu gedrungen: keine Wand.
    expect(wallAxis(2, 0.8)).toBeNull();
    expect(wallAxis(0.5, 0.1)).toBeNull();
    expect(wallAxis(0.8, 0.45)).toBeNull();
    expect(wallAxis(Number.NaN, 0.1)).toBeNull();
  });

  it('zählt Kacheln gerundet und nie weniger als eine', () => {
    expect(tileSpan(2)).toBe(2);
    expect(tileSpan(1.025)).toBe(1);
    expect(tileSpan(0.1)).toBe(1);
    expect(tileSpan(2.8)).toBe(3);
    expect(tileSpan(Number.NaN)).toBe(1);
    expect(snapAxis(2.3, 3, false)).toBeCloseTo(2.5, 9);
    expect(snapAxis(2.3, 2, false)).toBeCloseTo(2, 9);
    expect(snapAxis(2.7, 0.2, true)).toBeCloseTo(3, 9);
  });

  it('zeigt die Kante der Wand, ein Stück je Kachel', () => {
    const pose = gridPose(3.3, -2.2, turned(0), WALL);
    const edges = wallEdges(pose, 1, 0.125);
    expect(edges).toEqual([
      { x: 2.5, z: -2, alongX: true },
      { x: 3.5, z: -2, alongX: true },
    ]);
    const across = gridPose(3.3, -2.2, turned(Math.PI / 2), WALL);
    expect(wallEdges(across, 0.125, 1)).toEqual([
      { x: 3, z: -2.5, alongX: false },
      { x: 3, z: -1.5, alongX: false },
    ]);
    expect(wallEdges(gridPose(1, 1, turned(0), { x: 0.3, z: 0.3 }), 0.3, 0.3)).toEqual([]);
  });
});

describe('placesOnGrid', () => {
  it('rastet ein, was langsam losgelassen wird', () => {
    expect(placesOnGrid(0, false)).toBe(true);
    expect(placesOnGrid(PLACE_SPEED, false)).toBe(true);
  });

  it('lässt einen Wurf fliegen', () => {
    expect(placesOnGrid(PLACE_SPEED + 0.01, false)).toBe(false);
    expect(placesOnGrid(9, false)).toBe(false);
  });

  /** Am Schirm legt ein Knopfdruck ab — auch im Laufen. */
  it('rastet ein, wenn ausdrücklich abgelegt wird', () => {
    expect(placesOnGrid(9, true)).toBe(true);
  });
});

/**
 * **Welche Kacheln unter dem Getragenen leuchten** — die Liste, die dem
 * Spieler vor dem Loslassen sagt, wohin es fällt (`tilesCovered`).
 *
 * Geprüft wird hier das, was man sonst erst im Headset sieht: dass ein
 * kachelbreites Möbel **eine** Kachel beleuchtet und nicht neun.
 */
describe('die Kacheln unter dem Getragenen', () => {
  it('nimmt für ein kleines Ding genau seine Kachel', () => {
    expect(tilesCovered(3.3, 3.7, -1.7, -1.3)).toEqual([{ x: 3.5, z: -1.5 }]);
  });

  it('zählt die Fuge nicht mit', () => {
    expect(tilesCovered(0, 1, 0, 1)).toEqual([{ x: 0.5, z: 0.5 }]);
  });

  /**
   * Der gemessene Fall, für den es die Hälfte-Regel gibt: Der Apfel aus
   * `block-bits` ist 1,025 m breit und ragt damit 1,2 cm über beide Fugen.
   * Wer jede berührte Kachel zählte, leuchtete dafür drei je Achse an.
   */
  it('lässt einen Überstand von einem Zentimeter nicht zählen', () => {
    expect(tilesCovered(-0.0125, 1.0125, -0.0125, 1.0125)).toEqual([{ x: 0.5, z: 0.5 }]);
  });

  it('beleuchtet unter einem breiten Möbel beide Kacheln', () => {
    expect(tilesCovered(0.1, 1.9, 0.2, 0.8)).toEqual([
      { x: 0.5, z: 0.5 },
      { x: 1.5, z: 0.5 },
    ]);
  });

  /**
   * Zwei Meter, mit dem Ursprung auf einer Kachelmitte: eine ganze Kachel und
   * zwei halbe. Alle drei leuchten — das Möbel ragt wirklich dorthin, und ob
   * daneben noch Platz ist, ist die Frage, für die das Gitter da ist.
   */
  it('zeigt auch die halb bedeckten Nachbarkacheln', () => {
    expect(tilesCovered(-0.5, 1.5, 0.2, 0.8)).toEqual([
      { x: -0.5, z: 0.5 },
      { x: 0.5, z: 0.5 },
      { x: 1.5, z: 0.5 },
    ]);
  });

  it('liest von Norden nach Süden und von Westen nach Osten', () => {
    expect(tilesCovered(0.2, 1.8, 0.2, 1.8)).toEqual([
      { x: 0.5, z: 0.5 },
      { x: 1.5, z: 0.5 },
      { x: 0.5, z: 1.5 },
      { x: 1.5, z: 1.5 },
    ]);
  });

  it('kommt mit negativen Kacheln zurecht', () => {
    expect(tilesCovered(-1.8, -1.2, -0.8, -0.2)).toEqual([{ x: -1.5, z: -0.5 }]);
  });

  /** Ein Ding ohne Ausdehnung landet trotzdem irgendwo. */
  it('gibt bei einem Punkt die Kachel darunter', () => {
    expect(tilesCovered(2.5, 2.5, 2.5, 2.5)).toEqual([{ x: 2.5, z: 2.5 }]);
    // Und genau auf der Fuge gewinnt die Kachel unter der Mitte.
    expect(tilesCovered(2, 2, 2, 2)).toEqual([{ x: 2.5, z: 2.5 }]);
  });

  /** Die Notbremse: Was zu groß ist, bekommt gar kein Gitter. */
  it('gibt für eine riesige Fläche nichts aus', () => {
    expect(tilesCovered(0, 100, 0, 100)).toEqual([]);
  });

  it('hält Unsinn aus', () => {
    expect(tilesCovered(Number.NaN, 1, 0, 1)).toEqual([]);
  });
});

describe('Wände unter 45°', () => {
  const turn = (yaw: number) => ({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
  const wall2 = { x: 1, z: 0.125 };
  const wall4 = { x: 2, z: 0.125 };

  it('rastet eine Wand auf Achtel, alles andere auf Viertel', () => {
    expect(eighthYaw(0.7)).toBeCloseTo(Math.PI / 4, 9);
    expect(isDiagonal(eighthYaw(0.7))).toBe(true);
    expect(gridPose(0.3, 0.3, turn(0.7), wall2).diagonal).not.toBeNull();
    // Ein Fass bleibt gerade.
    expect(gridPose(0.3, 0.3, turn(0.7), { x: 0.4, z: 0.4 }).diagonal).toBeNull();
  });

  it('stellt eine 2×1-Wand schräg durch genau eine Kachel', () => {
    const pose = gridPose(3.3, 5.8, turn(Math.PI / 4), wall2);
    expect(pose.diagonal!.tiles).toBe(1);
    expect(pose.diagonal!.length).toBeCloseTo(Math.SQRT2, 9);
    expect(pose.diagonal!.cells).toEqual([{ x: 3, z: 5 }]);
    expect([pose.x, pose.z]).toEqual([3.5, 5.5]);
    // +45° dreht die lange Achse (+x) nach (cos, −sin): nach Nordosten — „╱".
    expect(pose.diagonal!.slope).toBe('slash');
    expect(gridPose(3.3, 5.8, turn(-Math.PI / 4), wall2).diagonal!.slope).toBe('backslash');
  });

  it('stellt eine 4×1-Wand schräg durch zwei Kacheln, die Mitte auf einer Ecke', () => {
    const pose = gridPose(3.3, 5.8, turn(Math.PI / 4), wall4);
    expect(pose.diagonal!.tiles).toBe(2);
    expect([pose.x, pose.z]).toEqual([3, 6]);
    expect(pose.diagonal!.cells).toEqual([
      { x: 2, z: 6 },
      { x: 3, z: 5 },
    ]);
  });

  it('zählt Kacheln an der geraden Länge, auch wenn die Wand schon gekürzt ist', () => {
    const shortened = { x: Math.SQRT2, z: 0.125 };
    expect(gridPose(0, 0, turn(Math.PI / 4), shortened, 4).diagonal!.tiles).toBe(2);
  });
});
