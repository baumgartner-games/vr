import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAIT_STILL } from '../../core/kaykitFigureFit';
import { MONSTERS } from './mission';
import {
  ACTOR_GLOW_MATERIAL,
  ACTOR_PACE,
  actorFigure,
  actorMoving,
  actorPace,
  type ActorKind,
} from './actorFit';

/**
 * **Welche Figur zu welchem Akteur gehört** (`actorFit.ts`).
 *
 * Zwei Sorten Fehler stecken in dieser Tabelle, und beide sieht man nicht im
 * Code: ein **Pfad**, den es nicht gibt — dann steht im Schiff stillschweigend
 * weiter der gebaute Klotz, und niemand sucht das in einer Pfadliste —, und
 * ein **Materialname**, der sich verschreibt: Dann leuchtet an einem Roboter
 * in einem dunklen Gang gar nichts mehr.
 *
 * Geprüft wird deshalb gegen die wirklichen Dateien. Der JSON-Teil einer
 * `.glb` steht unverpackt darin, auch wenn alles andere
 * `EXT_meshopt_compression` ist — dieselben zwanzig Byte wie in
 * `core/kaykitFigureFit.test.ts`. **Fehlen die gekauften Pakete ganz, ist das
 * kein Fehler**, sondern ein gewöhnlicher Checkout.
 */
const KINDS: readonly ActorKind[] = ['crew', 'stalker', 'crawler', 'sentinel'];

describe('Die Figur zu einer Sorte', () => {
  it('kennt jede Sorte, die es im Schiff gibt', () => {
    for (const monster of MONSTERS) expect(() => actorFigure(monster.id)).not.toThrow();
    expect(actorFigure('crew')).not.toBeNull();
  });

  it('lässt den Krabbler gebaut — das Regal hat kein sechsbeiniges Gegenstück', () => {
    expect(actorFigure('crawler')).toBeNull();
  });

  it('gibt den beiden aufrechten Monstern je einen eigenen Roboter', () => {
    const stalker = actorFigure('stalker');
    const sentinel = actorFigure('sentinel');
    expect(stalker?.path).toContain('Robot_Two');
    expect(sentinel?.path).toContain('Robot_One');
    // Zwei Monster, die dieselbe Datei laden, wären eines.
    expect(stalker?.path).not.toBe(sentinel?.path);
  });

  it('stellt jede Figur so hoch, wie der gebaute Körper steht, den sie ersetzt', () => {
    // `shipArt.buildCrewmate`: Helmkugel bei 1,475 m, Radius 0,325 → 1,80 m.
    expect(actorFigure('crew')!.height).toBeCloseTo(1.75, 2);
    // `shipArt.buildCreature`: Kopfkugel bei 1,72 m, Radius 0,205 → 1,93 m.
    for (const kind of ['stalker', 'sentinel'] as const)
      expect(actorFigure(kind)!.height).toBeCloseTo(1.9, 2);
  });
});

describe('Das Tempo eines Akteurs', () => {
  it('macht aus einem bloßen „geht" einen Gehschritt', () => {
    expect(actorPace(true)).toBe(ACTOR_PACE);
    expect(actorMoving(actorPace(true))).toBe(true);
    expect(actorPace(false)).toBe(0);
    expect(actorMoving(actorPace(false))).toBe(false);
  });

  it('nimmt den Betrag einer Zahl: rückwärts gehen ist gehen', () => {
    expect(actorPace(-2.4)).toBeCloseTo(2.4, 9);
    expect(actorMoving(actorPace(-2.4))).toBe(true);
  });

  it('lässt Unsinn stehen statt zappeln', () => {
    expect(actorPace(Number.NaN)).toBe(0);
    expect(actorPace(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('teilt die Schwelle der Figur — sonst liefe der gebaute Körper länger', () => {
    expect(actorMoving(GAIT_STILL / 2)).toBe(false);
    expect(actorMoving(GAIT_STILL)).toBe(true);
  });

  it('lässt ein Monstertempo aus der Mission laufen und nicht schlurfen', () => {
    for (const monster of MONSTERS) expect(actorMoving(actorPace(monster.speed))).toBe(true);
  });
});

describe('Die Dateien hinter der Tabelle', () => {
  it('liegen wirklich im Regal und tragen ein Skelett', () => {
    for (const kind of KINDS) {
      const wanted = actorFigure(kind);
      if (!wanted) continue;
      const glb = readGlb(wanted.path);
      if (!glb) return; // Kein Regal auf dieser Platte: nichts zu prüfen.
      expect([wanted.path, glb.nodes?.some((node) => node.name === 'head')]).toEqual([
        wanted.path,
        true,
      ]);
      expect([wanted.path, glb.skins?.length ?? 0]).not.toEqual([wanted.path, 0]);
    }
  });

  it('geben den Robotern ihre Leuchtfläche — und dem Mannequin keine', () => {
    const robot = readGlb(actorFigure('stalker')!.path);
    if (!robot) return;
    const names = (robot.materials ?? []).map((material) => material.name);
    expect(names).toContain(ACTOR_GLOW_MATERIAL);
    // Und der Zeichner hat sie schon als leuchtend gebaut — nur weiß.
    const glow = robot.materials!.find((material) => material.name === ACTOR_GLOW_MATERIAL)!;
    expect(glow.emissiveFactor).toEqual([1, 1, 1]);

    const sentinel = readGlb(actorFigure('sentinel')!.path);
    expect((sentinel?.materials ?? []).map((material) => material.name)).toContain(
      ACTOR_GLOW_MATERIAL,
    );

    // Das Mannequin hat keine: Der Techniker bekommt deshalb ein Visier am
    // Kopfknochen (`actorArt.glow`).
    const crew = readGlb(actorFigure('crew')!.path);
    expect((crew?.materials ?? []).map((material) => material.name)).not.toContain(
      ACTOR_GLOW_MATERIAL,
    );
  });
});

/** Der JSON-Teil einer `.glb` — oder `null`, wenn die Datei nicht da ist. */
function readGlb(path: string): {
  nodes?: { name?: string }[];
  skins?: unknown[];
  materials?: { name?: string; emissiveFactor?: number[] }[];
} | null {
  try {
    const file = join(process.cwd(), 'public', 'models', 'kaykit', path);
    const buffer = readFileSync(file);
    const length = buffer.readUInt32LE(12);
    return JSON.parse(buffer.subarray(20, 20 + length).toString('utf8')) as {
      nodes?: { name?: string }[];
      skins?: unknown[];
      materials?: { name?: string; emissiveFactor?: number[] }[];
    };
  } catch {
    return null;
  }
}
