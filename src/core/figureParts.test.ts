import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import {
  FACE_KINDS,
  FACE_LABELS,
  FACE_PARTS,
  IMMERSIVE_HAT,
  MODEL_HAT_KINDS,
  MODEL_HATS,
  asFace,
  facePart,
  isModelHat,
  partRegion,
  type FigurePart,
} from './figureParts';
import { extract } from './figurePartModels';
import { HEADGEAR_LABELS, WARDROBE_HATS, asHeadgear } from './headgear';

/**
 * **Hüte und Köpfe aus den Figuren** (`core/figureParts.ts`) — nachgeprüft an
 * den Dateien selbst.
 *
 * Ein Knotenname, den es nicht gibt, fällt sonst erst in der Brille auf: als
 * Hut, der nie kommt. Gelesen wird nur der JSON-Teil der `.glb` — dort stehen
 * die Namen, und dafür braucht es keinen Lader.
 */
function nodeNames(file: string): Set<string> {
  const bytes = readFileSync(`public/models/kaykit/${file}`);
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8')) as {
    nodes: { name?: string }[];
  };
  return new Set(json.nodes.map((node) => node.name ?? ''));
}

const ALL: [string, FigurePart][] = [...Object.entries(MODEL_HATS), ...Object.entries(FACE_PARTS)];

describe('die Stücke aus den Figuren', () => {
  it.each(ALL)('findet %s in seiner Datei', (_kind, part) => {
    const names = nodeNames(part.file);
    for (const node of part.nodes)
      expect([part.file, node, names.has(node)]).toEqual([part.file, node, true]);
  });

  it('hat die Hüte aus dem Wunsch — und den Helm im Flugmodus zweimal', () => {
    for (const kind of [
      'knightHelmet',
      'bearHat',
      'mageHat',
      'skeletonHelmet',
      'dummyHelmet',
      'skeletonHood',
      'necromancerCrown',
      'driverShades',
      'monsterCostume',
      'actionHeadband',
      'flightHelmet',
      'flightHelmetImmersive',
      'paladinHelmet',
      'clownHat',
      'mechHead',
      'witchHat',
      'helperAHat',
      'helperBHat',
    ]) {
      expect(MODEL_HAT_KINDS).toContain(kind);
      expect(WARDROBE_HATS).toContain(kind);
    }
    expect(MODEL_HATS.flightHelmet).toMatchObject({
      file: MODEL_HATS[IMMERSIVE_HAT].file,
      nodes: MODEL_HATS[IMMERSIVE_HAT].nodes,
    });
    expect(HEADGEAR_LABELS[IMMERSIVE_HAT]).toMatch(/Immersiv/);
  });

  it('hat die Köpfe aus dem Wunsch', () => {
    for (const kind of [
      'ranger',
      'ninja',
      'spaceRanger',
      'werewolf',
      'survivalist',
      'paladin',
      'clown',
      'vampire',
      'rogue',
    ]) {
      expect(FACE_KINDS).toContain(kind);
    }
  });

  it('nimmt Hüte aus dem Regal als gültige Kopfbedeckung an', () => {
    for (const kind of MODEL_HAT_KINDS) {
      expect(isModelHat(kind)).toBe(true);
      expect(asHeadgear(kind)).toBe(kind);
    }
    expect(isModelHat('chef')).toBe(false);
    expect(isModelHat('toString')).toBe(false);
  });

  it('macht aus einem unbekannten Kopf den eigenen', () => {
    expect(asFace('ninja')).toBe('ninja');
    for (const bad of [undefined, null, 42, 'schnabel', 'toString'])
      expect(asFace(bad)).toBe('own');
    expect(facePart('own')).toBeNull();
    expect(facePart('ninja')).toBe(FACE_PARTS.ninja);
    for (const kind of FACE_KINDS) expect(FACE_LABELS[kind]).toBeTruthy();
  });
});

describe('was an der Figur weicht', () => {
  it('liest Kopf und Hut am Namen des Teils', () => {
    expect(partRegion('Knight_Head')).toBe('head');
    expect(partRegion('Necromancer_Head_1')).toBe('head');
    expect(partRegion('Skeleton_Mage_Skull')).toBe('head');
    expect(partRegion('Skeleton_Warrior_Jaw')).toBe('head');
    expect(partRegion('Mannequin_Medium_Head')).toBe('head');
    expect(partRegion('Knight_Helmet')).toBe('hat');
    expect(partRegion('Knight_HelmetVisor')).toBe('hat');
    expect(partRegion('Barbarian_BearHat')).toBe('hat');
    expect(partRegion('Necromancer_Crown')).toBe('hat');
    expect(partRegion('Driver_Sunglasses')).toBe('hat');
    expect(partRegion('Marksman_Head_GhillieSuit')).toBe('hat');
    // Was nicht am Kopf ist, bleibt immer stehen.
    expect(partRegion('Knight_Body')).toBeNull();
    expect(partRegion('Knight_Cape')).toBeNull();
    expect(partRegion('Marksman_Body_GhillieSuit')).toBeNull();
    expect(partRegion('Mage_ArmLeft')).toBeNull();
  });
});

describe('ein Stück herauslösen', () => {
  /**
   * Eine kleine Figur mit Hüfte und Kopf, und daran ein **gehäuteter** Hut
   * — gebunden in einer Pose, die nicht die heutige ist. Herauskommen muss
   * das Netz im Raum des Kopfknochens, so wie die Grafikkarte es zeichnete.
   */
  it('setzt ein gehäutetes Teil dorthin, wo es am Kopfknochen gezeichnet wird', () => {
    const root = new THREE.Group();
    const hips = new THREE.Bone();
    hips.name = 'hips';
    hips.position.set(0, 1, 0);
    const head = new THREE.Bone();
    head.name = 'head';
    head.position.set(0, 0.5, 0.1);
    hips.add(head);
    root.add(hips);

    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const count = geometry.attributes.position!.count;
    geometry.setAttribute(
      'skinIndex',
      new THREE.Uint16BufferAttribute(
        new Array<number>(count * 4).fill(0).map((_, i) => (i % 4 === 0 ? 1 : 0)),
        4,
      ),
    );
    geometry.setAttribute(
      'skinWeight',
      new THREE.Float32BufferAttribute(
        new Array<number>(count * 4).fill(0).map((_, i) => (i % 4 === 0 ? 1 : 0)),
        4,
      ),
    );
    const hat = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    hat.name = 'Test_Hat';
    // Der Hut steht im Bindezeitpunkt 1,7 m hoch — 0,2 über dem Kopfknochen.
    hat.position.set(0, 1.7, 0.1);
    root.add(hat);
    root.updateMatrixWorld(true);
    hat.bind(new THREE.Skeleton([hips, head]));

    // Danach bewegt sich der Kopf: Das darf am Ergebnis nichts ändern.
    head.rotation.x = 0.7;
    root.updateMatrixWorld(true);

    const piece = extract(root, { file: 'x.glb', nodes: ['Test_Hat'] })!;
    expect(piece).not.toBeNull();
    expect(piece.userData.sharedAssets).toBe(true);
    const mesh = piece.children[0] as THREE.Mesh;
    expect(mesh.geometry).toBe(geometry);
    expect(mesh.position.x).toBeCloseTo(0);
    expect(mesh.position.y).toBeCloseTo(0.2);
    expect(mesh.position.z).toBeCloseTo(0);
  });

  it('nimmt ein starres Teil mit seiner Lage zum Kopfknochen', () => {
    const root = new THREE.Group();
    const head = new THREE.Bone();
    head.name = 'head';
    head.position.set(0, 1.2, 0);
    head.rotation.y = 0.4;
    root.add(head);
    const brim = new THREE.Group();
    brim.name = 'Test_Hat';
    brim.position.set(0, 0.3, -0.1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    mesh.position.set(0.05, 0, 0);
    brim.add(mesh);
    head.add(brim);

    const piece = extract(root, { file: 'x.glb', nodes: ['Test_Hat'] })!;
    const out = piece.children[0] as THREE.Mesh;
    expect(out.position.x).toBeCloseTo(0.05);
    expect(out.position.y).toBeCloseTo(0.3);
    expect(out.position.z).toBeCloseTo(-0.1);
  });

  it('gibt nichts heraus, wenn es den Knoten nicht gibt', () => {
    const root = new THREE.Group();
    const head = new THREE.Bone();
    head.name = 'head';
    root.add(head);
    expect(extract(root, { file: 'x.glb', nodes: ['Fehlt'] })).toBeNull();
    expect(extract(new THREE.Group(), { file: 'x.glb', nodes: ['Fehlt'] })).toBeNull();
  });
});
