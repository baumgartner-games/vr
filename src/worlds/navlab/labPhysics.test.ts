import * as THREE from 'three';
import { ALL_GROUPS, GROUP_WORLD, PhysicsWorld } from '../../physics/PhysicsWorld';
import { Npc } from '../npc/Npc';
import { npcSkin } from '../npc/npcKinds';
import { bakeLab } from './labSim';
import {
  PIT_DEPTH,
  PODIUM,
  RAMP,
  ROOF,
  baySpot,
  labHarm,
  labSolids,
  scenarioOf,
  type ScenarioId,
} from './scenarios';

/**
 * **Das Labor mit echter Physik** — dieselben Kästen, dieselben NPCs, dasselbe
 * Rapier wie in der Brille, nur ohne Bild.
 *
 * Der Rest dieser Ecke rechnet mit Zahlen (`labSim.ts`), und das ist gut so:
 * Ein Test, der eine Physik-Engine startet, ist langsam und misst mehr, als er
 * behauptet. Für **eine** Sorte Fehler reicht er trotzdem nicht, und genau die
 * hat diese Datei gefunden: Was der Körper in Rapier tut, tut kein
 * nachgebauter Körper.
 *
 * Der Fall, wegen dem es sie gibt, stand in der Brille: Die Puppe nahm die
 * Rampe, stand oben auf dem nahen Podest, ihr Weg zeigte quer über den Gang —
 * und sie rührte sich nicht mehr. Der Nachbau lief dieselbe Bucht grün: Karte,
 * Weg, Sprung und Absprunghöhe waren alle im Recht. Falsch war ein
 * Zwanzigstelmillimeter: Ein Zylinder sinkt beim Aufliegen ein wenig ein, und
 * damit stand die Seitenfläche des Podests vor seiner scharfen Bodenkante. Zwei
 * gleich hohe Kästen, die aneinanderstoßen, waren für ihn eine Wand
 * (`PhysicsWorld.colliderFor`, `CYLINDER_BEVEL`).
 *
 * Deshalb läuft hier, was ohne Rapier nicht zu haben ist: **stehen, stoßen,
 * fallen und springen**. Zwei Buchten reichen dafür — die eine, in der ein NPC
 * ankommen muss, und die andere, in der er es nicht darf.
 *
 * Und weil die Welt hier ohnehin läuft, steht am Ende noch das **Aufräumen**:
 * Ein Körper, den es nicht mehr gibt, beantwortet keine Frage, sondern reißt
 * die wasm mit — das kann nur eine echte Engine zeigen.
 */

/** Wie fein gerechnet wird — derselbe feste Schritt wie in `PhysicsWorld`. */
const DT = 1 / 60;

interface LabRun {
  cast: Npc[];
  /** Die Füße eines Läufers, in Buchtmaßen (`bayPoint`). */
  local: (npc: Npc) => { lx: number; lz: number; y: number };
}

/**
 * Eine Bucht laufen lassen — mit Rapier, den Quadern des Labors und der Karte,
 * die auch die Brille bekommt.
 *
 * Gebaut wird **aus denselben Daten** wie die Welt (`labSolids`, `bakeLab`) und
 * gelaufen wie in `NavLabWorld`: Jedes Bild denken die NPCs, dann rechnet die
 * Physik, dann tut der Boden weh (`labHarm`). Wer hier etwas anders machte,
 * prüfte ein anderes Labor.
 */
async function runLab(id: ScenarioId, seconds: number): Promise<LabRun> {
  const physics = await PhysicsWorld.create(-9.81);
  const root = new THREE.Group();
  for (const solid of labSolids()) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(solid.w, solid.h, solid.d));
    mesh.position.set(solid.x, solid.y, solid.z);
    root.add(mesh);
    mesh.updateWorldMatrix(true, false);
    physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
  }

  const graph = bakeLab();
  const bay = scenarioOf(id);
  const stand = baySpot(bay, bay.stand);
  const player = { x: stand.x, y: bay.stand.y ?? 0, z: stand.z };

  const cast = bay.cast.map((one) => {
    const at = baySpot(bay, one);
    const npc = new Npc({
      physics,
      kind: one.kind,
      brain: 'chase',
      at: new THREE.Vector3(at.x, one.y ?? 0, at.z),
      yaw: bay.z < 0 ? 0 : Math.PI,
      speed: npcSkin(one.kind).speed,
    });
    root.add(npc.holder);
    return npc;
  });

  const feet = new THREE.Vector3();
  for (let frame = 0; frame < Math.round(seconds / DT); frame++) {
    const now = frame * DT;
    for (const npc of cast) {
      if (!npc.alive) continue;
      npc.update(DT, { x: player.x, z: player.z }, Math.random, { graph, at: player, now });
    }
    physics.step(DT);
    // Und was der Boden mit ihnen macht — dieselbe Zeile wie in
    // `NavLabWorld.simulate`, nur ohne Regisseur.
    for (const npc of cast) {
      if (npc.alive) npc.damage(labHarm(npc.feet(feet), DT));
    }
  }

  const flip = bay.z < 0 ? 1 : -1;
  return {
    cast,
    local: (npc: Npc) => {
      const at = npc.feet(new THREE.Vector3());
      return { lx: at.x - bay.x, lz: (at.z - bay.z) * flip, y: at.y };
    },
  };
}

describe('Die Fuge zwischen zwei gleich hohen Kästen', () => {
  it('hält keinen Zylinder auf, der darüberlaufen will', async () => {
    // **Der Fehler in seiner kleinsten Form.** Zwei Klötze, oben bündig, ein
    // NPC-großer Zylinder darauf — und der Wunsch, geradeaus über die Naht zu
    // laufen. Ohne gebrochene Kante (`CYLINDER_BEVEL`) steht er nach einem
    // halben Meter und bleibt stehen: Er sinkt beim Aufliegen ein
    // Zwanzigstelmillimeter ein, und die Seitenfläche des zweiten Klotzes ist
    // dann eine Wand vor seiner Bodenkante.
    const physics = await PhysicsWorld.create(-9.81);
    const skin = npcSkin('dummy');
    for (const z of [2.5, 7.5]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 5));
      slab.position.set(0, 1.2, z);
      slab.updateWorldMatrix(true, false);
      physics.addStatic(slab, { membership: GROUP_WORLD, filter: ALL_GROUPS });
    }

    const holder = new THREE.Group();
    holder.position.set(0, 2.4 + skin.height / 2, 4);
    holder.updateWorldMatrix(true, false);
    const body = physics.addDynamic(holder, {
      shape: { kind: 'cylinder' },
      halfExtents: new THREE.Vector3(skin.radius, skin.height / 2, skin.radius),
      mass: skin.mass,
      friction: 0.25,
      restitution: 0,
    });
    body.body.lockRotations(true, true);

    // Zwei Sekunden geradeaus, mit dem Tempo eines Zombies — mehr als genug
    // für die zwei Meter bis zur Naht und ein Stück darüber hinaus.
    for (let frame = 0; frame < 120; frame++) {
      const fall = body.body.linvel().y;
      body.body.setLinvel({ x: 0, y: fall, z: 1.5 }, true);
      physics.step(DT);
    }
    expect(body.body.translation().z).toBeGreaterThan(6);
    expect(body.body.translation().y).toBeCloseTo(2.4 + skin.height / 2, 1);
  }, 60000);
});

describe('Podest und Sprung, mit echter Physik', () => {
  it('bringt die Puppe am Ende wirklich auf das freistehende Podest', async () => {
    const run = await runLab('podium', 40);
    const [dummy, zombie] = run.cast;
    const at = run.local(dummy!);

    // **Die eine Zahl, um die es geht**: Sie steht auf dem Podest, das man nur
    // mit einem Sprung erreicht — nicht auf dem nahen, auf das die Rampe
    // führt, und nicht unten im Gang dazwischen.
    expect(at.y).toBeCloseTo(PODIUM.high, 1);
    expect(at.lx).toBeGreaterThan(PODIUM.far.minLx);
    expect(at.lx).toBeLessThan(PODIUM.far.maxLx);
    expect(at.lz).toBeGreaterThan(PODIUM.far.minLz);
    expect(at.lz).toBeLessThan(PODIUM.far.maxLz);

    // Und der Zombie steht unten davor: Springen ist nichts für ihn
    // (`ZOMBIE_PROFILE`, `link.jump = Infinity`).
    expect(run.local(zombie!).y).toBeCloseTo(0, 1);
  }, 60000);
});

describe('Die beiden Steigungen, mit echter Physik', () => {
  it('bringt beide die flache hinauf und keinen die steile', async () => {
    // **Der Grund, warum diese Bucht Stufen von 60 cm hat und keine von zwölf**
    // (`scenarios.RAMP`): Ein NPC ist ein dynamischer Zylinder ohne
    // Schrittautomatik. Er *geht* keine Rampe hinauf, er springt sie stufenweise
    // (`navAgent.leaps`, `Npc.launch`) — und das kann nur eine echte Engine
    // zeigen. Der Nachbau in `labSim.ts` setzt ihn auf jeden Boden, der nicht
    // höher liegt als sein Tritt; ob der Körper dort wirklich hinaufkommt, weiß
    // er nicht.
    const flat = await runLab('ramp', 45);
    for (const npc of flat.cast) {
      expect(flat.local(npc).y).toBeCloseTo(RAMP.high, 1);
    }

    // Und dieselbe Höhe über eine Kachel: Da bleiben beide unten stehen. Nicht
    // weil die Stufen zu hoch wären — die sind hier zwölf Zentimeter —, sondern
    // weil der Winkel es ist (`navProfile.maxSlope`).
    const steep = await runLab('steep', 45);
    for (const npc of steep.cast) {
      expect(steep.local(npc).y).toBeCloseTo(0, 1);
    }
  }, 120000);
});

describe('Vom Dach herunter, mit echter Physik', () => {
  it('lässt den Zombie springen und den Hamster oben', async () => {
    // **Zwei Sorten, eine Kante, zwei Antworten** — und beide Hälften stehen
    // erst hier auf dem Prüfstand: dass der Sprung wirklich Leben kostet
    // (`Npc.land`), und dass der, für den er tödlich wäre, ihn gar nicht erst
    // plant (`navProfile.canTraverse`).
    const run = await runLab('levels', 40);
    const [zombie, hamster] = run.cast;
    expect(run.local(zombie!).y).toBeCloseTo(0, 1);
    expect(zombie!.alive).toBe(true);
    expect(zombie!.health).toBeLessThan(zombie!.maxHealth);

    expect(run.local(hamster!).y).toBeCloseTo(ROOF, 1);
    expect(hamster!.alive).toBe(true);
    expect(hamster!.health).toBe(hamster!.maxHealth);
  }, 120000);
});

describe('Stachelgrube, mit echter Physik', () => {
  it('lässt den Zombie hineinfallen und darin sterben', async () => {
    const run = await runLab('pit', 30);
    const [zombie, dummy] = run.cast;
    const at = run.local(zombie!);

    // Er ist wirklich unten — die Grube ist ein Loch im Boden und kein
    // Anstrich (`labFloor`).
    expect(at.y).toBeLessThan(-PIT_DEPTH + 0.3);
    // Und er liegt: Die Stacheln haben ihn (`labHarm`).
    expect(zombie!.alive).toBe(false);
    expect(zombie!.health).toBe(0);

    // Die Puppe geht außen herum und steht am Ende oben und heil beim Spieler.
    expect(dummy!.alive).toBe(true);
    expect(run.local(dummy!).y).toBeCloseTo(0, 1);
  }, 60000);
});

describe('Aufräumen, ohne die Physik mitzureißen', () => {
  it('nimmt einen gefallenen NPC samt Körper heraus — auch zweimal', async () => {
    const physics = await PhysicsWorld.create(-9.81);
    const npc = new Npc({
      physics,
      kind: 'zombie',
      brain: 'idle',
      at: new THREE.Vector3(0, 0, 0),
    });
    expect(physics.dynamicBodies).toContain(npc.entry);

    // Er stirbt, ohne dass jemand ihn aus der Physik nimmt — genau der Fall,
    // in dem sein Zylinder früher für immer im Raum stehen blieb.
    expect(npc.damage(9999)).toBe(true);
    npc.dispose();
    expect(physics.dynamicBodies).not.toContain(npc.entry);

    // **Und ein zweites Mal ist kein Absturz.** Zwei Aufräumer, die beide
    // gründlich sind, gibt es hier öfter als einen; ein doppeltes
    // `removeRigidBody` wäre „recursive use of an object".
    npc.dispose();
    npc.unbody(physics);
    physics.remove(npc.entry);

    // Die Welt rechnet danach weiter, und das ist die eigentliche Behauptung.
    for (let frame = 0; frame < 10; frame++) physics.step(DT);
    expect(physics.dynamicBodies).toHaveLength(0);
  }, 60000);
});
