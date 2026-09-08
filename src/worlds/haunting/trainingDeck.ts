import * as THREE from 'three';
import { MirrorSurface } from '../shared/Mirror';
import { TILE } from '../nav/navTile';
import { MARKS, type HouseSpec, type MarkId } from './house';
import { buildFixture } from './fixtureModels';
import { FIXTURE_CATALOG } from './fixtureDimensions';
import { MONSTERS, lockerCode, repairsFor, type Repair } from './mission';
import { SHIP, buildCreature, label } from './shipArt';
import { TRAINING_ROOMS, trainingBounds, type TrainingRoomId } from './trainingLayout';

interface TrainingDeckHost {
  root: THREE.Group;
  spec: HouseSpec;
  cabinet(id: string, at: THREE.Vector3, loot: string): void;
  locker(id: string, at: THREE.Vector3, code: string): void;
  console(repair: Repair, at: THREE.Vector3): void;
  button(mesh: THREE.Mesh, run: () => void): void;
  visit(id: TrainingRoomId): void;
  home(): void;
  effect(kind: string, at: THREE.Vector3): void;
}

/** Independent teaching cases, with dimensions and explicit solutions beside each object. */
export function buildTrainingDeck(host: TrainingDeckHost): MirrorSurface {
  const { root } = host;
  const sign = (text: string, x: number, y: number, z: number, w = 2.2, h = 0.6): THREE.Mesh => {
    const mesh = label(text, w, h, SHIP.amber);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  for (const room of TRAINING_ROOMS) {
    const { minX, maxX, minZ, maxZ } = trainingBounds(room.id);
    const cx = (minX + maxX) / 2;
    sign(
      `TESTDECK / ${room.name.toUpperCase()}\nKEIN MONSTER · ALLE ÜBUNGEN WIEDERHOLBAR`,
      cx,
      2.25,
      minZ + 0.3,
      5.5,
      0.55,
    );
    // Menus are on the south wall, away from the arrival pocket and exhibits.
    const back = sign('ZUR EINSATZZENTRALE', cx, 1.5, maxZ - 0.25, 2.6, 0.38);
    back.rotation.y = Math.PI;
    host.button(back, () => host.home());
    TRAINING_ROOMS.filter((r) => r.id !== room.id).forEach((target, i) => {
      const button = sign(
        target.name.toUpperCase(),
        minX + 2 + i * 3,
        0.95,
        maxZ - 0.25,
        2.65,
        0.38,
      );
      button.rotation.y = Math.PI;
      host.button(button, () => host.visit(target.id));
    });
    // Small emissive ceiling strips: no extra light sources or bloom passes.
    const geometry = new THREE.BoxGeometry(1.5, 0.035, 0.14);
    const material = new THREE.MeshBasicMaterial({ color: 0x93aeac });
    for (let x = minX + TILE; x < maxX - 1; x += TILE * 2) {
      const strip = new THREE.Mesh(geometry, material);
      strip.position.set(x, 2.73, minZ + TILE);
      root.add(strip);
    }
  }
  const safe = trainingBounds('safe');
  const code = lockerCode(host.spec.seed, 'r0');
  sign(
    `01 / SCHUTZSCHRANK\nCODE: ${code.split('').join(' · ')}\nZiffern mit E / Trigger drücken.\nOffenes Display erneut drücken: verstecken.\nE oder Missionsmenü: verlassen.`,
    safe.minX + 4,
    1.5,
    safe.minZ + 3,
    3.5,
    1.35,
  );
  host.locker('training-safe', new THREE.Vector3(safe.minX + 8, 0, safe.minZ + 2.9), code);

  const tools = trainingBounds('tools');
  sign(
    '02 / AUSRÜSTUNG\nSchrank öffnen → Gegenstand anvisieren → E.\n1: linker Sensor, inklusive freie Hand.\n2: Lampe / Medkit / freie rechte Hand.\nRöntgen erkennt beschriftete Fracht durch Türen.',
    tools.minX + 4,
    1.55,
    tools.minZ + 2.3,
    4.1,
    1.45,
  );
  host.cabinet('training-kit', new THREE.Vector3(tools.maxX - 3, 0, tools.minZ + 2.3), 'test-kit');
  host.cabinet('training-crate', new THREE.Vector3(tools.maxX - 3, 0, tools.minZ + 5), 'medkit');
  sign(
    'RÖNTGEN-PRÜFUNG\nIn diesem geschlossenen Container liegt ein Medkit.\nLinken Sensor auf Röntgen stellen.',
    tools.minX + 4,
    1.45,
    tools.minZ + 5,
    3.8,
    0.85,
  );

  const repairs = trainingBounds('repairs');
  repairsFor(host.spec).forEach((repair, i) => {
    const cx = repairs.minX + 2.1 + i * 4;
    const instructions =
      repair.puzzle === 'wires'
        ? `KABEL VERBINDEN\nLinks Symbol wählen, rechts dasselbe.\n▲ ● ■ ◆\nAlle vier Leitungen verbinden.`
        : repair.puzzle === 'sequence'
          ? `DRUCKAUSGLEICH\nFreigabefolge: ${repair.code.split('').join(' → ')}\nTasten nacheinander drücken.`
          : `FUNK KALIBRIEREN\nFrequenzen: ${repair.code.split('').join(' · ')}\nZiffern drehen, unten bestätigen.`;
    sign(
      `${instructions}\nAbdeckung zuerst öffnen.\nFertig? Display drücken: zurücksetzen.`,
      cx - 0.65,
      1.48,
      repairs.minZ + 2.6,
      1.85,
      1.45,
    );
    host.console(repair, new THREE.Vector3(cx + 0.95, 0, repairs.minZ + 2.55));
  });

  const models = trainingBounds('models');
  (Object.keys(FIXTURE_CATALOG) as MarkId[]).forEach((id, i) => {
    const size = FIXTURE_CATALOG[id];
    const x = models.minX + 2 + (i % 5) * 3.8;
    const z = models.minZ + 2 + Math.floor(i / 5) * 3.1;
    const fixture = buildFixture(id);
    fixture.position.set(x, 0, z);
    root.add(fixture);
    sign(
      `${MARKS[id]}\n${size.width.toFixed(2)} × ${size.depth.toFixed(2)} m · Höhe ${size.height.toFixed(2)} m`,
      x,
      2.2,
      z + 0.6,
      2.7,
      0.4,
    );
  });
  MONSTERS.forEach((monster, i) => {
    const x = models.minX + 2 + i * 3.8,
      z = models.maxZ - 1.2;
    const dummy = buildCreature(monster.id);
    dummy.position.set(x, 0, z);
    root.add(dummy);
    sign(`${monster.name}\nUNBEWEGTE ATTRAPPE · HARMLOS`, x, 2.2, z + 0.65, 2.7, 0.45);
  });
  sign(
    `SCHIEBESCHOTT
Display neben der Tür: E / Trigger.
Erneut drücken: schließen.
Prüfe den freien Durchgang.`,
    models.maxX - 6,
    1.6,
    models.minZ + 10,
    2.5,
    1,
  );
  const mirror = new MirrorSurface(1.3, 1.95);
  mirror.position.set(models.maxX - 1, 1.3, models.minZ + 10.7);
  mirror.rotation.y = -Math.PI / 2;
  root.add(mirror);
  const effectPoint = new THREE.Vector3(models.maxX - 5, 0.9, models.minZ + 11.5);
  const effectButton = sign(
    'EFFEKTE PRÜFEN\nE / TRIGGER: FUNKEN · RAUCH · FEUER',
    effectPoint.x,
    1.65,
    effectPoint.z,
    2.6,
    0.6,
  );
  let effect = 0;
  host.button(effectButton, () =>
    host.effect(['sparks', 'smoke', 'fire'][effect++ % 3]!, effectPoint),
  );
  const vent = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({
    color: SHIP.trim,
    metalness: 0.6,
    roughness: 0.65,
  });
  const surround = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 0.1), metal);
  vent.add(surround);
  const slotMaterial = new THREE.MeshBasicMaterial({ color: 0x050808 });
  const slotGeometry = new THREE.BoxGeometry(0.68, 0.045, 0.012);
  for (let i = 0; i < 6; i++) {
    const slot = new THREE.Mesh(slotGeometry, slotMaterial);
    slot.position.set(0, -0.23 + i * 0.09, 0.056);
    vent.add(slot);
  }
  vent.position.set(models.maxX - 0.3, 1.3, models.minZ + 8.5);
  vent.rotation.y = -Math.PI / 2;
  root.add(vent);
  return mirror;
}
