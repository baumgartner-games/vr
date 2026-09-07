/**
 * **Der Spieler und der Boden** — mit echtem Rapier, weil der Fehler in Rapier
 * saß.
 *
 * Was hier steht, hat lange in der Brille gestanden und war von innen nicht zu
 * erklären: Man sank beim Stehen langsam in den Fußboden ein, stand nach dem
 * nächsten Portal wieder oben drüber, und der Sprung kam mal, mal nicht. Drei
 * Beschwerden, ein Ursprung — der Character-Controller sucht den Boden nur auf
 * der Strecke, die er gehen soll, und was näher liegt als seine eigene Haut,
 * sieht er gar nicht (`CHARACTER_SKIN`, `SEAT_CLEARANCE`).
 *
 * Kein Nachbau kann das zeigen: Es ist das Verhalten der Engine an ihren
 * Toleranzen, und die Toleranzen sind der Fehler. Also läuft hier dieselbe
 * Kapsel auf denselben Quadern wie in der Brille — nur ohne Bild, dafür bei
 * fünf Bildraten, denn die Bildrate entschied mit, ob man durchfiel.
 *
 * Gemessen wird immer am **Fußboden des Rigs** (`getFloorY`): Das ist die
 * Höhe, auf der der Spieler sich sieht. Die gebaute Fläche liegt auf `y = 0`.
 */
import * as THREE from 'three';
import { ALL_GROUPS, GROUP_WORLD, PhysicsWorld } from './PhysicsWorld';
import { PhysicsLocomotion } from './PhysicsLocomotion';
import type { PlayerRig } from '../core/PlayerRig';

/** Die Bildraten, die eine Brille wirklich liefert — und 45 für ein zähes Bild. */
const RATES = [45, 60, 72, 90, 120];

/** Halbe Kantenlänge der Bodenplatte, wie unter jeder Welt (`WORLD_RADIUS`). */
const PLATE = 500;

const _move = new THREE.Vector3();

/**
 * Das Nötigste eines `PlayerRig`: Fußboden, Kopfhöhe, Kopfpunkt. Mehr fragt die
 * Fortbewegung nicht, und ein echtes Rig bräuchte einen WebGL-Renderer.
 */
class TestRig {
  readonly position = new THREE.Vector3();
  headHeight = 1.7;

  getHeadPosition(target: THREE.Vector3): THREE.Vector3 {
    return target.set(this.position.x, this.position.y + this.headHeight, this.position.z);
  }

  getHeadHeight(): number {
    return this.headHeight;
  }

  getFloorY(): number {
    return this.position.y;
  }

  updateMatrixWorld(): void {}

  get asRig(): PlayerRig {
    return this as unknown as PlayerRig;
  }
}

/** Eine Platte, deren Oberseite auf `top` liegt. */
function plate(physics: PhysicsWorld, cx: number, top: number, halfX: number, halfZ: number): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(halfX * 2, 0.6, halfZ * 2));
  mesh.position.set(cx, top - 0.3, 0);
  mesh.updateMatrixWorld(true);
  physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
}

interface Stage {
  physics: PhysicsWorld;
  rig: TestRig;
  loco: PhysicsLocomotion;
  /** Ein Bild: erst gehen, dann rechnen — dieselbe Reihenfolge wie im Spiel. */
  frame: (dt: number, speedX?: number, jump?: boolean) => void;
}

/**
 * Baut eine Welt und stellt den Spieler **genau auf** die Fläche — so, wie
 * jede Welt ihn absetzt (`rig.placeAt(spawnPoint())`). Das war der Startpunkt,
 * an dem alles schiefging.
 */
async function stage(build?: (physics: PhysicsWorld) => void): Promise<Stage> {
  const physics = await PhysicsWorld.create(-9.81);
  if (build) build(physics);
  else plate(physics, 0, 0, PLATE, PLATE);
  const rig = new TestRig();
  const loco = new PhysicsLocomotion(physics, rig.asRig);
  const frame = (dt: number, speedX = 0, jump = false): void => {
    loco.apply(rig.asRig, _move.set(speedX, 0, 0), jump, dt);
    physics.step(dt);
  };
  return { physics, rig, loco, frame };
}

describe('Der Boden unter dem Spieler', () => {
  it('trägt ihn im Stehen — eine Minute lang, bei jeder Bildrate', async () => {
    for (const hz of RATES) {
      const { rig, frame } = await stage();
      let lowest = 0;
      for (let i = 0; i < hz * 60; i++) {
        frame(1 / hz);
        if (i > hz) lowest = Math.min(lowest, rig.position.y);
      }
      // Vorher: bei 90 Hz gut ein Meter tief, bei 60 Hz ganz aus der Welt.
      expect({ hz, tief: Math.abs(rig.position.y) < 0.005 }).toEqual({ hz, tief: true });
      expect(lowest).toBeGreaterThan(-0.03);
    }
  }, 300000);

  it('trägt ihn im Gehen', async () => {
    for (const hz of RATES) {
      const { rig, frame } = await stage();
      let lowest = 0;
      for (let i = 0; i < hz * 10; i++) {
        frame(1 / hz, 2.6);
        if (i > hz) lowest = Math.min(lowest, rig.position.y);
      }
      expect(rig.position.x).toBeGreaterThan(20);
      expect(lowest).toBeGreaterThan(-0.03);
      expect(rig.position.y).toBeLessThan(0.03);
    }
  }, 300000);

  it('trägt ihn auch bei schwankender Bildzeit', async () => {
    const { rig, frame } = await stage();
    let lowest = 0;
    for (let i = 0; i < 1200; i++) {
      // Zwischen 120 Hz und 20 Hz, wie ein Browser unter Last.
      frame(1 / 120 + (i % 11) * 0.004, i % 3 === 0 ? 2.6 : 0);
      if (i > 60) lowest = Math.min(lowest, rig.position.y);
    }
    expect(lowest).toBeGreaterThan(-0.05);
    expect(rig.position.y).toBeLessThan(0.05);
  }, 60000);

  it('hält beim Umsetzen die Höhe — hundert Portale hintereinander', async () => {
    // Jedes `resync` setzt die Kapsel neu ab. Federte das Absetzen ins Rig
    // durch, wanderte der Spieler mit jedem Portal ein Stück nach unten.
    const { rig, loco, frame } = await stage();
    for (let round = 0; round < 100; round++) {
      rig.position.set(round * 0.1, 0, 0);
      loco.resync(rig.asRig);
      for (let i = 0; i < 30; i++) frame(1 / 90);
      expect(Math.abs(rig.position.y)).toBeLessThan(0.02);
    }
  }, 120000);

  it('lässt ihn eine Stufe hinaufsteigen und wieder hinunter', async () => {
    const { rig, frame } = await stage((physics) => {
      plate(physics, 0, 0, 60, 12);
      plate(physics, 6, 0.25, 4, 12); // 25 cm hohes Podest von x = 2 bis x = 10
    });
    for (let i = 0; i < 400; i++) frame(1 / 90, 2.0);
    expect(rig.position.x).toBeGreaterThan(4);
    expect(rig.position.y).toBeGreaterThan(0.24);
    for (let i = 0; i < 400; i++) frame(1 / 90, 2.0);
    expect(rig.position.x).toBeGreaterThan(11);
    expect(Math.abs(rig.position.y)).toBeLessThan(0.03);
  }, 60000);

  it('lässt die Füße stehen, während der Kopf sich duckt', async () => {
    // Die Kapsel wird beim Ducken kürzer und wandert dabei um die halbe
    // verlorene Höhe nach unten, damit die Sohle bleibt, wo sie ist
    // (`updateShape`). Rechnet das daneben, sinkt oder steigt der Spieler bei
    // jeder Kniebeuge ein Stück — und nach ein paar davon steht er im Boden.
    const { rig, frame } = await stage();
    for (let i = 0; i < 90; i++) frame(1 / 90);
    let lowest = 0;
    let highest = 0;
    for (let round = 0; round < 6; round++) {
      for (const target of [1.15, 1.7]) {
        while (Math.abs(rig.headHeight - target) > 0.001) {
          rig.headHeight += THREE.MathUtils.clamp(target - rig.headHeight, -0.02, 0.02);
          frame(1 / 90);
          lowest = Math.min(lowest, rig.position.y);
          highest = Math.max(highest, rig.position.y);
        }
      }
    }
    expect(lowest).toBeGreaterThan(-0.01);
    expect(highest).toBeLessThan(0.01);
    expect(Math.abs(rig.position.y)).toBeLessThan(0.005);
  }, 60000);

  it('lässt ihn nicht in die Fuge zwischen zwei Platten fallen', async () => {
    const { rig, frame } = await stage((physics) => {
      plate(physics, -20, 0, 20, 12);
      plate(physics, 20, 0, 20, 12);
    });
    rig.position.set(-10, 0, 0);
    let lowest = 0;
    for (let i = 0; i < 900; i++) {
      frame(1 / 90, 2.6);
      if (i > 30) lowest = Math.min(lowest, rig.position.y);
    }
    expect(rig.position.x).toBeGreaterThan(5);
    expect(lowest).toBeGreaterThan(-0.03);
  }, 60000);
});

describe('Der Sprung', () => {
  it('kommt so hoch, wie die Sprungkraft sagt — bei jeder Bildrate', async () => {
    for (const hz of RATES) {
      const { rig, loco, frame } = await stage();
      for (let i = 0; i < hz; i++) frame(1 / hz);
      const floor = rig.position.y;
      let peak = floor;
      frame(1 / hz, 0, true);
      for (let i = 0; i < hz * 2; i++) {
        frame(1 / hz);
        peak = Math.max(peak, rig.position.y);
      }
      // v²/2g = 0,99 m. Vorher blieben davon mal 5 cm übrig, mal alles:
      // Der Controller meldete den frisch verlassenen Boden noch als betreten,
      // und ein `min(v, 0)` löschte den Sprung im nächsten Bild.
      expect(peak - floor).toBeGreaterThan(0.85);
      expect(peak - floor).toBeLessThan(1.1);
      // Und wieder unten, auf derselben Höhe.
      expect(Math.abs(rig.position.y - floor)).toBeLessThan(0.02);
      expect(loco.grounded).toBe(true);
    }
  }, 300000);

  it('kommt auch im Laufen', async () => {
    for (const hz of RATES) {
      const { rig, frame } = await stage();
      for (let i = 0; i < hz; i++) frame(1 / hz, 2.6);
      const floor = rig.position.y;
      let peak = floor;
      frame(1 / hz, 2.6, true);
      for (let i = 0; i < hz * 2; i++) {
        frame(1 / hz, 2.6);
        peak = Math.max(peak, rig.position.y);
      }
      expect(peak - floor).toBeGreaterThan(0.85);
    }
  }, 300000);

  it('wartet auf den Boden, wenn er zu früh kommt', async () => {
    // Gedrückt wird in der Luft, kurz vor der Landung (`JUMP_BUFFER`).
    const { rig, frame } = await stage();
    for (let i = 0; i < 90; i++) frame(1 / 90);
    const floor = rig.position.y;
    frame(1 / 90, 0, true);
    for (let i = 0; i < 22; i++) frame(1 / 90); // fast wieder unten
    expect(rig.position.y - floor).toBeGreaterThan(0.4);

    // Zweiter Druck, während er noch fällt.
    frame(1 / 90, 0, true);
    let peak = rig.position.y;
    for (let i = 0; i < 200; i++) {
      frame(1 / 90);
      peak = Math.max(peak, rig.position.y);
    }
    expect(peak - floor).toBeGreaterThan(0.85);
  }, 60000);

  it('gilt noch kurz nach der Kante, aber nicht ewig', async () => {
    const ledge = () => stage((physics) => plate(physics, 0, 0, 3, 12));

    // Über die Kante gelaufen und zwei Bilder später gedrückt: geht.
    const near = await ledge();
    near.rig.position.set(0, 0, 0);
    for (let i = 0; i < 90; i++) near.frame(1 / 90, 2.6);
    while (near.loco.grounded) near.frame(1 / 90, 2.6);
    const fromEdge = near.rig.position.y;
    near.frame(1 / 90, 2.6, true);
    let peak = near.rig.position.y;
    for (let i = 0; i < 30; i++) {
      near.frame(1 / 90, 2.6);
      peak = Math.max(peak, near.rig.position.y);
    }
    expect(peak).toBeGreaterThan(fromEdge + 0.3);

    // Eine halbe Sekunde später: nicht mehr. Wer fällt, fällt.
    const late = await ledge();
    late.rig.position.set(0, 0, 0);
    for (let i = 0; i < 90; i++) late.frame(1 / 90, 2.6);
    while (late.loco.grounded) late.frame(1 / 90, 2.6);
    for (let i = 0; i < 45; i++) late.frame(1 / 90, 2.6);
    const falling = late.rig.position.y;
    late.frame(1 / 90, 2.6, true);
    for (let i = 0; i < 10; i++) late.frame(1 / 90, 2.6);
    expect(late.rig.position.y).toBeLessThan(falling);
  }, 60000);
});
