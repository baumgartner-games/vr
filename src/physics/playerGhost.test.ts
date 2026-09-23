/**
 * **Der Körper im Konstrukt** — mit echtem Rapier, wie beim Boden nebenan
 * (`playerFooting.test.ts`).
 *
 * Der weiße Raum (`worlds/shared/construct.ts`) blendet die Welt **aus**,
 * statt den Spieler wegzuschicken. Ihre Kollisionskörper bleiben dabei stehen,
 * und genau das war der Befund aus der Brille: unsichtbare Wände in einem
 * leeren Raum, gegen die man läuft, und eine Figur, die danach woanders steht.
 *
 * Nachgemessen wird deshalb dreierlei, und alle drei sind die Sorte Fehler, die
 * man erst merkt, wenn man drinsteht: dass die Wand ohne `ghost` hält, dass sie
 * mit `ghost` nicht mehr hält — und dass man dabei weder fällt noch von der
 * Kapsel zurückgezogen wird, die in der echten Welt stehen bleibt.
 */
import * as THREE from 'three';
import { ALL_GROUPS, GROUP_WORLD, PhysicsWorld } from './PhysicsWorld';
import { PhysicsLocomotion } from './PhysicsLocomotion';
import type { PlayerRig } from '../core/PlayerRig';

const _move = new THREE.Vector3();

/** Dasselbe Nötigste eines Rigs wie in `playerFooting.test.ts`. */
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

function block(physics: PhysicsWorld, box: THREE.Vector3, at: THREE.Vector3): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(box.x, box.y, box.z));
  mesh.position.copy(at);
  mesh.updateMatrixWorld(true);
  physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
}

/**
 * Ein Boden auf `y = 0` und eine Küchenzeile zwei Meter vor dem Spieler — das
 * kleinste Stück Welt, an dem sich „unsichtbare Wand" zeigen lässt.
 */
async function stage(): Promise<{
  physics: PhysicsWorld;
  rig: TestRig;
  loco: PhysicsLocomotion;
  walk: (dt: number, speedX: number) => void;
}> {
  const physics = await PhysicsWorld.create(-9.81);
  block(physics, new THREE.Vector3(500, 0.6, 500), new THREE.Vector3(0, -0.3, 0));
  block(physics, new THREE.Vector3(0.6, 1.4, 6), new THREE.Vector3(2, 0.7, 0));
  const rig = new TestRig();
  const loco = new PhysicsLocomotion(physics, rig.asRig);
  const walk = (dt: number, speedX: number): void => {
    loco.apply(rig.asRig, _move.set(speedX, 0, 0), false, dt);
    physics.step(dt);
  };
  return { physics, rig, loco, walk };
}

/** Zwei Sekunden bei 60 Hz nach Osten — weit mehr, als bis zur Zeile nötig wäre. */
function walkEast(walk: (dt: number, speedX: number) => void): void {
  for (let i = 0; i < 120; i++) walk(1 / 60, 3);
}

describe('Der Körper im Konstrukt (`PhysicsLocomotion.ghost`)', () => {
  it('bleibt ohne ihn an der Küchenzeile hängen', async () => {
    const { rig, walk } = await stage();
    walkEast(walk);
    // Die Zeile steht bei x = 2 und ist 0,6 m dick; die Kapsel hat einen
    // Halbmesser. Wer hängen bleibt, kommt nicht über anderthalb Meter hinaus.
    expect(rig.position.x).toBeLessThan(1.6);
  }, 30000);

  it('geht mit ihm hindurch — und fällt dabei nicht', async () => {
    const { rig, loco, walk } = await stage();
    loco.ghost = true;
    walkEast(walk);
    // Zwei Sekunden bei 3 m/s sind sechs Meter, und die Zeile hält davon
    // nichts mehr auf.
    expect(rig.position.x).toBeCloseTo(6, 1);
    // **Und keine Schwerkraft.** Der weiße Boden ist Kulisse und hat keinen
    // Körper: Wer hier fiele, fiele durch das Nichts bis ans Ende der Welt.
    expect(rig.position.y).toBe(0);
  }, 30000);

  it('lässt die Kapsel stehen, wo sie war', async () => {
    // Das ist die andere Hälfte der Zusage: Der Körper bleibt in der alten
    // Welt, auch während die Ansicht durch den weißen Raum spaziert. Läge die
    // Kapsel mit unter dem Kopf, zöge sie ihn beim nächsten Bild ohne `ghost`
    // dorthin nach — und genau das soll das Zurücksetzen entscheiden, nicht
    // die Physik.
    const { physics, loco, walk } = await stage();
    walk(1 / 60, 0);
    const stood = physics.playerCapsule!.x;
    loco.ghost = true;
    walkEast(walk);
    expect(physics.playerCapsule!.x).toBeCloseTo(stood, 2);
  }, 30000);

  it('hört auf, sobald jemand das Rig versetzt', async () => {
    // `resync` ist immer die Ansage „das Rig steht jetzt woanders" — und genau
    // damit holt das Konstrukt die Figur zurück. Bliebe `ghost` danach stehen,
    // liefe man in der echten Küche weiter durch Wände, ohne dass es jemandem
    // auffiele, bis der erste Sprung ins Leere geht.
    const { rig, loco, walk } = await stage();
    loco.ghost = true;
    walkEast(walk);
    loco.resync(rig.asRig);
    expect(loco.ghost).toBe(false);

    rig.position.set(0, 0, 0);
    loco.resync(rig.asRig);
    walkEast(walk);
    expect(rig.position.x).toBeLessThan(1.6);
  }, 30000);
});

describe('Der Kran landet (`PhysicsLocomotion.land`)', () => {
  it('bleibt, wo er ist, wenn dort Platz ist', async () => {
    const { rig, loco, walk } = await stage();
    walk(1 / 60, 0);
    loco.ghost = true;
    expect(loco.land(rig.asRig)).toBe(true);
    expect(rig.position.x).toBe(0);
    expect(rig.position.z).toBe(0);
    expect(loco.ghost).toBe(false);
  }, 30000);

  it('landet neben der Küchenzeile und nicht in ihr', async () => {
    const { rig, loco, walk } = await stage();
    // Ein Bild Physik, damit die Welt ihre Körper kennt — im Spiel läuft das
    // ohnehin jedes Bild.
    walk(1 / 60, 0);
    // Mitten über die Zeile geflogen (x = 2, 0,6 m dick) …
    rig.position.set(2, 0, 0);
    loco.ghost = true;
    expect(loco.land(rig.asRig)).toBe(true);
    // … und daneben abgesetzt: weit genug von ihrer Mitte, dass die Kapsel
    // (Halbmesser 0,24) die Zeile nicht berührt.
    expect(Math.abs(rig.position.x - 2)).toBeGreaterThanOrEqual(0.3 + 0.24);
    // Und danach steht man wirklich: Laufen nach Osten hält wieder an der
    // Zeile, falls man westlich landete — der Körper ist zurück.
    const landedWest = rig.position.x < 2;
    walkEast(walk);
    if (landedWest) expect(rig.position.x).toBeLessThan(1.6);
  }, 30000);

  it('sucht Boden unter sich — über dem Rand der Welt gibt es keinen Platz', async () => {
    const { rig, loco, walk } = await stage();
    walk(1 / 60, 0);
    // Der Boden ist 500 m breit; zehn Meter darüber hinaus findet der Ring
    // (drei Meter weit) nichts, und der Aufrufer bringt einen zurück.
    rig.position.set(260, 0, 0);
    loco.ghost = true;
    expect(loco.land(rig.asRig)).toBe(false);
    expect(rig.position.x).toBe(260);
  }, 30000);
});
